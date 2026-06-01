const puppeteer = require('puppeteer');

(async () => {
    try {
        const browser = await puppeteer.launch({ headless: 'new' });
        const page = await browser.newPage();
        page.on('console', msg => {
            console.log('BROWSER CONSOLE:', msg.type(), msg.text());
        });
        page.on('pageerror', err => {
            console.log('BROWSER PAGEERROR:', err.message);
        });

        await page.goto('file://c:/Users/koush/antigravity/index.html');
        await new Promise(r => setTimeout(r, 3000));

        await browser.close();
    } catch (e) {
        console.error('Puppeteer error:', e);
    }
})();
