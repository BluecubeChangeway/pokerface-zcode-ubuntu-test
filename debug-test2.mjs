import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Test against GitHub Pages directly
  await page.goto('https://bluecubechangeway.github.io/pokerface-zcode-ubuntu-test/iframe.html?args=&id=ui-button--primary&viewMode=story');
  await page.waitForLoadState('networkidle');
  
  // Check what's on the page after 10 seconds
  await page.waitForTimeout(10000);
  
  const content = await page.content();
  console.log('=== PAGE CONTENT (first 5000 chars) ===');
  console.log(content.substring(0, 5000));
  
  // Check for storybook-root
  const root = await page.$('#storybook-root');
  if (root) {
    const innerHTML = await root.evaluate(el => el.innerHTML);
    console.log('\n=== #storybook-root content ===');
    console.log(innerHTML.substring(0, 2000));
  } else {
    console.log('\n=== #storybook-root NOT FOUND ===');
  }
  
  // Check for iframe
  const iframes = await page.$$('iframe');
  console.log('\n=== IFRAMES FOUND:', iframes.length, '===');
  for (let i = 0; i < iframes.length; i++) {
    const attrs = await iframes[i].evaluate(el => ({
      src: el.src,
      'data-is-storybook': el.getAttribute('data-is-storybook'),
      'data-is-loaded': el.getAttribute('data-is-loaded'),
      class: el.className
    }));
    console.log(`Iframe ${i}:`, attrs);
    
    // Try to get iframe content
    try {
      const frame = await iframes[i].contentFrame();
      if (frame) {
        const body = await frame.$('body');
        if (body) {
          const bodyHTML = await body.evaluate(el => el.innerHTML);
          console.log(`  Frame ${i} body:`, bodyHTML.substring(0, 500));
        }
      }
    } catch (e) {
      console.log(`  Frame ${i} error:`, e.message);
    }
  }
  
  await browser.close();
})();
