/**
 * Playwright 视觉回归全局 Setup
 * 验证已下载的 Storybook 静态文件、启动 HTTP 服务
 */

import { spawn, ChildProcess } from 'child_process';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

let storybookProcess: ChildProcess | null = null;

export default async function globalSetup() {
  console.log('[Visual Tests] Starting global setup...');
  
  // 创建快照目录
  const snapshotsDir = resolve(__dirname, 'snapshots');
  if (!existsSync(snapshotsDir)) {
    mkdirSync(snapshotsDir, { recursive: true });
  }
  
  // 创建测试结果目录
  const resultsDir = resolve(__dirname, '../test-results');
  if (!existsSync(resultsDir)) {
    mkdirSync(resultsDir, { recursive: true });
  }
  
  // 验证已下载的 Storybook 静态文件
  const storybookStaticDir = resolve(__dirname, '../../storybook-static');
  if (!existsSync(storybookStaticDir)) {
    throw new Error(`Storybook static directory not found: ${storybookStaticDir}. Did the CI download step fail?`);
  }
  
  if (!existsSync(resolve(storybookStaticDir, 'index.html'))) {
    throw new Error(`Storybook index.html not found in ${storybookStaticDir}`);
  }
  
  console.log('[Visual Tests] Storybook static files verified.');
  
  // 检查服务器是否已经在运行
  let serverReady = false;
  try {
    const response = await fetch('http://localhost:6006');
    if (response.ok) {
      console.log('[Visual Tests] Storybook server already running.');
      serverReady = true;
    }
  } catch {
    // 服务器未运行
  }
  
  // 如果服务器未运行，启动 HTTP 服务器
  if (!serverReady) {
    console.log('[Visual Tests] Starting Storybook HTTP server...');
    const httpServer = spawn('npx', ['http-server', 'storybook-static', '-p', '6006', '-c-1'], {
      cwd: resolve(__dirname, '../..'),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    
    storybookProcess = httpServer;
    
    httpServer.stdout?.on('data', (data) => {
      console.log(`[Storybook] ${data.toString().trim()}`);
    });
    
    httpServer.stderr?.on('data', (data) => {
      console.error(`[Storybook Error] ${data.toString().trim()}`);
    });
    
    // 等待服务器启动
    await waitForServer('http://localhost:6006', 30000);
  }
  
  console.log('[Visual Tests] Global setup completed.');
  
  // 返回清理函数
  return async () => {
    console.log('[Visual Tests] Cleaning up...');
    if (storybookProcess) {
      storybookProcess.kill();
      storybookProcess = null;
    }
  };
}

async function waitForServer(url: string, timeout: number): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        console.log('[Visual Tests] Storybook server is ready.');
        return;
      }
    } catch {
      // 服务器未就绪，继续等待
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error(`Storybook server did not start within ${timeout}ms`);
}