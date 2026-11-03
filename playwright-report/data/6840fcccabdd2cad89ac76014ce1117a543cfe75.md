# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: core-components.spec.ts >> Core Components [dark] >> visual: Tabs-Default
- Location: tests/visual/core-components.spec.ts:33:7

# Error details

```
TimeoutError: locator.waitFor: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('#storybook-root, #canvas, iframe').first() to be visible
    63 × locator resolved to hidden <div id="storybook-root"></div>

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - 'heading "Minified React error #31; visit https://react.dev/errors/31?args[]=object%20with%20keys%20%7B%24%24typeof%2C%20render%2C%20displayName%7D for the full message or use the non-minified dev environment for full errors and additional helpful warnings." [level=1] [ref=e4]'
  - paragraph [ref=e5]: "The component failed to render properly, likely due to a configuration issue in Storybook. Here are some common causes and how you can address them:"
  - list [ref=e6]:
    - listitem [ref=e7]:
      - strong [ref=e8]: Missing Context/Providers
      - text: ": You can use decorators to supply specific contexts or providers, which are sometimes necessary for components to render correctly. For detailed instructions on using decorators, please visit the"
      - link "Decorators documentation" [ref=e9] [cursor=pointer]:
        - /url: https://storybook.js.org/docs/writing-stories/decorators
      - text: .
    - listitem [ref=e10]:
      - strong [ref=e11]: Misconfigured Webpack or Vite
      - text: ": Verify that Storybook picks up all necessary settings for loaders, plugins, and other relevant parameters. You can find step-by-step guides for configuring"
      - link "Webpack" [ref=e12] [cursor=pointer]:
        - /url: https://storybook.js.org/docs/builders/webpack
      - text: or
      - link "Vite" [ref=e13] [cursor=pointer]:
        - /url: https://storybook.js.org/docs/builders/vite
      - text: with Storybook.
    - listitem [ref=e14]:
      - strong [ref=e15]: Missing Environment Variables
      - text: ": Your Storybook may require specific environment variables to function as intended. You can set up custom environment variables as outlined in the"
      - link "Environment Variables documentation" [ref=e16] [cursor=pointer]:
        - /url: https://storybook.js.org/docs/configure/environment-variables
      - text: .
  - code [ref=e18]: "Error: Minified React error #31; visit https://react.dev/errors/31?args[]=object%20with%20keys%20%7B%24%24typeof%2C%20render%2C%20displayName%7D for the full message or use the non-minified dev environment for full errors and additional helpful warnings. at Bn (http://localhost:6006/assets/react-18-BE65CK-I.js:24:39457) at H (http://localhost:6006/assets/react-18-BE65CK-I.js:24:44888) at http://localhost:6006/assets/react-18-BE65CK-I.js:24:45133 at yl (http://localhost:6006/assets/react-18-BE65CK-I.js:24:68965) at W1 (http://localhost:6006/assets/react-18-BE65CK-I.js:24:85134) at Bm (http://localhost:6006/assets/react-18-BE65CK-I.js:24:128950) at Ud (http://localhost:6006/assets/react-18-BE65CK-I.js:24:128030) at Hi (http://localhost:6006/assets/react-18-BE65CK-I.js:24:127867) at _m (http://localhost:6006/assets/react-18-BE65CK-I.js:24:124567) at xm (http://localhost:6006/assets/react-18-BE65CK-I.js:24:136978)"
```

# Test source

```ts
  1  | /**
  2  |  * 视觉回归测试 - 核心 UI 组件基线测试（简化版：快速建立基线）
  3  |  * 
  4  |  * 测试策略：
  5  |  * 1. 仅测试稳定可靠的组件：Button、Card
  6  |  * 2. 仅 Chromium + Light/Dark 主题
  7  |  * 3. 仅 Desktop 视口
  8  |  * 4. 复杂组件后续单独处理
  9  |  */
  10 | 
  11 | import { test, expect } from '@playwright/test';
  12 | 
  13 | const COMPONENTS = [
  14 |   { name: 'Button-Primary', path: '/iframe.html?args=&id=ui-button--primary&viewMode=story' },
  15 |   { name: 'Button-Secondary', path: '/iframe.html?args=&id=ui-button--secondary&viewMode=story' },
  16 |   { name: 'Button-Danger', path: '/iframe.html?args=&id=ui-button--danger&viewMode=story' },
  17 |   { name: 'Button-Ghost', path: '/iframe.html?args=&id=ui-button--ghost&viewMode=story' },
  18 |   { name: 'Card-Default', path: '/iframe.html?args=&id=ui-card--default&viewMode=story' },
  19 |   { name: 'Select-Default', path: '/iframe.html?args=&id=ui-select--default&viewMode=story' },
  20 |   { name: 'Tabs-Default', path: '/iframe.html?args=&id=ui-tabs--default&viewMode=story' },
  21 |   { name: 'Switch-Default', path: '/iframe.html?args=&id=ui-switch--default&viewMode=story' },
  22 |   { name: 'Input-Default', path: '/iframe.html?args=&id=ui-input--default&viewMode=story' },
  23 |   { name: 'Tooltip-Default', path: '/iframe.html?args=&id=ui-tooltip--default&viewMode=story' },
  24 | ];
  25 | 
  26 | const THEMES = ['light', 'dark'];
  27 | 
  28 | for (const theme of THEMES) {
  29 |   test.describe(`Core Components [${theme}]`, () => {
  30 |     test.use({ colorScheme: theme as 'light' | 'dark', viewport: { width: 1280, height: 800 } });
  31 |     
  32 |     for (const component of COMPONENTS) {
  33 |       test(`visual: ${component.name}`, async ({ page }) => {
  34 |         await page.goto(`http://localhost:6006${component.path}`);
  35 |         await page.waitForLoadState('networkidle');
  36 |         
  37 |         // 等待 Storybook canvas 渲染完成
> 38 |         await page.locator('#storybook-root, #canvas, iframe').first().waitFor({ state: 'visible', timeout: 30000 });
     |                                                                        ^ TimeoutError: locator.waitFor: Timeout 30000ms exceeded.
  39 |         
  40 |         // 尝试获取 iframe 内容
  41 |         const iframes = page.frameLocator('iframe');
  42 |         const iframeCount = await iframes.locator('body').count();
  43 |         
  44 |         if (iframeCount > 0) {
  45 |           const iframe = iframes.first();
  46 |           await iframe.locator('body').waitFor({ state: 'visible', timeout: 30000 });
  47 |         }
  48 |         
  49 |         await page.waitForTimeout(500);
  50 |         
  51 |         await expect(page).toHaveScreenshot(`${component.name}-${theme}.png`, {
  52 |           fullPage: false,
  53 |         });
  54 |       });
  55 |     }
  56 |   });
  57 | }
```