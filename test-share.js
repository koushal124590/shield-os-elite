const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  
  await page.goto('https://noor-cf2f7.web.app/share.html?doc=DOC_TEST');
  await new Promise(r => setTimeout(r, 8000));
  
  await browser.close();
})();
