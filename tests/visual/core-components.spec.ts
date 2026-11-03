/**
 * 视觉回归测试 - 核心 UI 组件基线测试（最小化：快速验证）
 */

import { test, expect } from '@playwright/test';

const COMPONENTS = [
  { name: 'Button-Primary', path: '/iframe.html?args=&id=ui-button--primary&viewMode=story' },
  { name: 'Button-Secondary', path: '/iframe.html?args=&id=ui-button--secondary&viewMode=story' },
  { name: 'Card-Default', path: '/iframe.html?args=&id=ui-card--default&viewMode=story' },
];

const THEMES = ['light', 'dark'];

for (const theme of THEMES) {
  test.describe(`Core Components [${theme}]`, () => {
    test.use({ colorScheme: theme as 'light' | 'dark', viewport: { width: 1280, height: 800 } });
    
    for (const component of COMPONENTS) {
      test(`visual: ${component.name}`, async ({ page }) => {
        await page.goto(`http://localhost:6006${component.path}`);
        await page.waitForLoadState('networkidle');
        
        // 等待 Storybook iframe 创建完成
        // 静态构建中，iframe.js 会动态创建带有 data-is-storybook 属性的 iframe
        const iframe = page.locator('iframe[data-is-storybook]').first();
        await iframe.waitFor({ state: 'attached', timeout: 60000 });
        
        // 等待 iframe 内容加载完成
        const frame = page.frameLocator('iframe[data-is-storybook]').first();
        await frame.locator('body').waitFor({ state: 'attached', timeout: 30000 });
        
        // 额外等待确保内容完全渲染
        await page.waitForTimeout(2000);
        
        await expect(page).toHaveScreenshot(`${component.name}-${theme}.png`, {
          fullPage: false,
        });
      });
    }
  });
}