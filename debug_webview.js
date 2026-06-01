const puppeteer = require('puppeteer');

(async () => {
    console.log('--- FINAL COMPREHENSIVE UI TEST ---');
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    page.on('console', msg => console.log(`[BROWSER ${msg.type().toUpperCase()}] ${msg.text()}`));
    page.on('pageerror', err => console.log('[BROWSER ERROR] ' + err.toString()));

    try {
        console.log('Navigating to http://localhost:8080...');
        await page.goto('http://localhost:8080', { waitUntil: 'networkidle2' });

        // Wait for boot
        await new Promise(r => setTimeout(r, 1500));

        const checkPage = async (expectedId) => {
            const state = await page.evaluate(() => {
                const active = document.querySelector('.page.active');
                return {
                    id: active?.id,
                    opacity: active ? getComputedStyle(active).opacity : '0',
                    display: active ? getComputedStyle(active).display : 'none'
                };
            });
            console.log(`Current Page: ${state.id} (Opacity: ${state.opacity}, Display: ${state.display})`);
            return state.id === expectedId;
        };

        // 1. Check Welcome
        if (!await checkPage('welcome-page')) throw new Error('Failed to load welcome-page');

        // 2. Click Get Started -> Login
        console.log("Testing: Welcome -> Login");
        await page.click('#get-started-btn');
        await new Promise(r => setTimeout(r, 800));
        if (!await checkPage('login-page')) throw new Error('Failed to transition to login-page');

        // 3. Click Create Account -> Register
        console.log("Testing: Login -> Register");
        await page.click('#goto-register');
        await new Promise(r => setTimeout(r, 800));
        if (!await checkPage('register-page')) throw new Error('Failed to transition to register-page');

        // 4. Click Goto Login (if exists) or check Register content
        console.log("Testing: Register Page Elements");
        const hasRegisterForm = await page.evaluate(() => !!document.getElementById('register-form'));
        console.log("Register Form exists:", hasRegisterForm);
        if (!hasRegisterForm) throw new Error('Register form not found');

        console.log('--- ALL UI FLOWS VERIFIED ---');
        await page.screenshot({ path: 'c:/Users/koush/antigravity/www/final_verification.png' });

    } catch (err) {
        console.error('TEST FAILED:', err.message);
        await page.screenshot({ path: 'c:/Users/koush/antigravity/www/test_failure.png' });
    } finally {
        await browser.close();
    }
})();
