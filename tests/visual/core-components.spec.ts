/**
 * 视觉回归测试 - 核心 UI 组件基线测试（简化版：快速建立基线）
 * 
 * 测试策略：
 * 1. 仅测试稳定可靠的组件：Button、Card
 * 2. 仅 Chromium + Light/Dark 主题
 * 3. 仅 Desktop 视口
 * 4. 复杂组件后续单独处理
 */

import { test, expect } from '@playwright/test';

const COMPONENTS = [
  { name: 'Button-Primary', path: '/iframe.html?args=&id=ui-button--primary&viewMode=story' },
  { name: 'Button-Secondary', path: '/iframe.html?args=&id=ui-button--secondary&viewMode=story' },
  { name: 'Button-Danger', path: '/iframe.html?args=&id=ui-button--danger&viewMode=story' },
  { name: 'Button-Ghost', path: '/iframe.html?args=&id=ui-button--ghost&viewMode=story' },
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
        
        // 等待 Storybook canvas 渲染完成
        await page.locator('#storybook-root, #canvas, iframe').first().waitFor({ state: 'visible', timeout: 30000 });
        
        // 尝试获取 iframe 内容
        const iframes = page.frameLocator('iframe');
        const iframeCount = await iframes.locator('body').count();
        
        if (iframeCount > 0) {
          const iframe = iframes.first();
          await iframe.locator('body').waitFor({ state: 'visible', timeout: 30000 });
        }
        
        await page.waitForTimeout(500);
        
        await expect(page).toHaveScreenshot(`${component.name}-${theme}.png`, {
          fullPage: false,
        });
      });
    }
  });
}