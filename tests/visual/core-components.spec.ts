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
        
        // 等待 Storybook 故事内容渲染完成
        // 静态构建中，iframe.js 会在 #storybook-root 内渲染故事内容
        // 也可能创建 iframe[data-is-storybook]
        await page.waitForFunction(() => {
          const root = document.getElementById('storybook-root');
          // 检查 #storybook-root 是否有内容，或者是否创建了 iframe
          if (root && root.innerHTML.trim().length > 0) {
            return true;
          }
          const iframe = document.querySelector('iframe[data-is-storybook]');
          if (iframe) {
            return true;
          }
          return false;
        }, { timeout: 60000 });
        
        // 额外等待确保内容完全渲染
        await page.waitForTimeout(2000);
        
        await expect(page).toHaveScreenshot(`${component.name}-${theme}.png`, {
          fullPage: false,
        });
      });
    }
  });
}