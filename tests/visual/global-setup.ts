/**
 * Playwright 视觉回归全局 Setup
 * 启动 Storybook 服务、准备基线截图目录
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
  
  // 启动 Storybook 静态构建服务
  console.log('[Visual Tests] Building Storybook...');
  const buildResult = await runCommand('npm', ['run', 'build-storybook'], { cwd: resolve(__dirname, '../..') });
  if (buildResult.code !== 0) {
    throw new Error(`Storybook build failed: ${buildResult.stderr}`);
  }
  
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
  
  // 如果服务器未运行，启动 Storybook 预览服务器
  if (!serverReady) {
    console.log('[Visual Tests] Starting Storybook preview server...');
    storybookProcess = spawn('npx', ['http-server', 'storybook-static', '-p', '6006', '-c-1'], {
      cwd: resolve(__dirname, '../..'),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    
    storybookProcess.stdout?.on('data', (data) => {
      console.log(`[Storybook] ${data.toString().trim()}`);
    });
    
    storybookProcess.stderr?.on('data', (data) => {
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

function runCommand(command: string, args: string[], options: { cwd: string }): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const proc = spawn(command, args, { cwd: options.cwd, shell: true });
    let stdout = '';
    let stderr = '';
    
    proc.stdout?.on('data', (data) => { stdout += data.toString(); });
    proc.stderr?.on('data', (data) => { stderr += data.toString(); });
    
    proc.on('close', (code) => {
      resolve({ code: code ?? 1, stdout, stderr });
    });
    
    proc.on('error', (err) => {
      resolve({ code: 1, stdout, stderr: err.message });
    });
  });
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