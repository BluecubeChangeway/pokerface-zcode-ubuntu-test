/**
 * Playwright 视觉回归测试配置
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/visual',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/visual-results.json' }],
    ['list'],
  ],
  
  // 全局超时
  timeout: 60000,
  expect: {
    // 视觉比较阈值
    toHaveScreenshot: {
      maxDiffPixels: 100,      // 最大允许像素差
      maxDiffPixelRatio: 0.001, // 最大允许像素差比例 (0.1%)
      threshold: 0.1,          // 像素级阈值
    },
    toMatchSnapshot: {
      maxDiffPixels: 100,
      maxDiffPixelRatio: 0.001,
      threshold: 0.1,
    },
  },
  
  // 项目配置：仅核心浏览器 + 核心主题
  projects: [
    // Chromium - Light 模式
    {
      name: 'chromium-light',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
        colorScheme: 'light',
      },
    },
    // Chromium - Dark 模式
    {
      name: 'chromium-dark',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
        colorScheme: 'dark',
      },
    },
  ],
  
  // 快照目录
  snapshotDir: './tests/visual/snapshots',
  
  // 全局 setup/teardown
  globalSetup: './tests/visual/global-setup',
  globalTeardown: './tests/visual/global-teardown',
});