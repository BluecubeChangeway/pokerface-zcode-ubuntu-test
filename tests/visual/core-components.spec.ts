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
        
        // 等待 Storybook iframe 加载完成
        await page.locator('iframe').first().waitFor({ state: 'attached', timeout: 30000 });
        
        // 获取 iframe 并等待其内容加载
        const iframe = page.frameLocator('iframe').first();
        await iframe.locator('body').waitFor({ state: 'visible', timeout: 30000 });
        
        await page.waitForTimeout(500);
        
        await expect(page).toHaveScreenshot(`${component.name}-${theme}.png`, {
          fullPage: false,
        });
      });
    }
  });
}