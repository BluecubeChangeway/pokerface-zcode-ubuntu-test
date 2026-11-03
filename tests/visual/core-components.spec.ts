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
        
        // 等待 Storybook 完成初始化 - 使用 Playwright 更健壮的定位器 API
        // Storybook 8 在 #storybook-root 内动态创建 iframe
        await page.locator('iframe').first().waitFor({ state: 'attached', timeout: 60000 });
        
        // 等待 iframe 内容加载完成
        await page.waitForFunction(() => {
          const iframe = document.querySelector('iframe');
          return iframe && iframe.contentDocument && iframe.contentDocument.body && iframe.contentDocument.body.innerHTML.trim().length > 0;
        }, { timeout: 30000 });
        
        // 额外等待确保内容完全渲染
        await page.waitForTimeout(1000);
        
        await expect(page).toHaveScreenshot(`${component.name}-${theme}.png`, {
          fullPage: false,
        });
      });
    }
  });
}