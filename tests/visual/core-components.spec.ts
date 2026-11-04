/**
 * 视觉回归测试 - 核心 UI 组件基线测试（最小化：快速验证）
 * 
 * Playwright projects 已配置主题：
 * - chromium-light: colorScheme='light'  
 * - chromium-dark: colorScheme='dark'
 * 测试不再手动循环主题，由 project 配置决定
 */

import { test, expect } from '@playwright/test';

const COMPONENTS = [
  { name: 'Button-Primary', path: '/iframe.html?args=&id=ui-button--primary&viewMode=story' },
  { name: 'Button-Secondary', path: '/iframe.html?args=&id=ui-button--secondary&viewMode=story' },
  { name: 'Card-Default', path: '/iframe.html?args=&id=ui-card--default&viewMode=story' },
];

for (const component of COMPONENTS) {
  test(`visual: ${component.name}`, async ({ page }) => {
    await page.goto(`http://localhost:6006${component.path}`);
    await page.waitForLoadState('networkidle');
    
    // 等待 Storybook 静态构建渲染完成
    // 静态构建直接将故事内容渲染到 #storybook-root，无 iframe
    await page.waitForFunction(() => {
      const root = document.getElementById('storybook-root');
      return root && root.innerHTML.trim().length > 0;
    }, { timeout: 60000 });
    
    // 额外等待确保内容完全渲染（CSS、字体等）
    await page.waitForTimeout(3000);
    
    // 快照名称包含主题（由 project 配置决定）
    await expect(page).toHaveScreenshot(`${component.name}.png`, {
      fullPage: false,
    });
  });
}