const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('LOG:', msg.text()));
  page.on('pageerror', err => console.log('ERR:', err.message));
  
  await page.setViewport({ width: 480, height: 812 });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  
  // Login via demo
  await page.evaluate(() => window.showPage('login'));
  await new Promise(r => setTimeout(r, 500));
  await page.click('#demo-login-btn');
  await new Promise(r => setTimeout(r, 4000));
  
  // SS1: after login
  await page.screenshot({ path: 'ss1.png' });
  
  // Check what's in chat-main
  const chatMainBefore = await page.evaluate(() => {
    const m = document.querySelector('.chat-main');
    return m ? m.innerHTML.substring(0, 200) : 'NO CHAT MAIN';
  });
  console.log('Before click:', chatMainBefore);
  
  // Check contact items
  const contacts = await page.evaluate(() => {
    const items = document.querySelectorAll('.contact-item');
    return Array.from(items).map(i => i.textContent.substring(0, 50));
  });
  console.log('Contacts:', JSON.stringify(contacts));
  
  // Click second contact (first is HQ/Quantum Core which might be special)
  const contactCount = contacts.length;
  if (contactCount > 1) {
    await page.evaluate(() => {
      document.querySelectorAll('.contact-item')[1].click();
    });
  } else if (contactCount > 0) {
    await page.evaluate(() => {
      document.querySelectorAll('.contact-item')[0].click();
    });
  }
  
  await new Promise(r => setTimeout(r, 2000));
  
  // SS2: after clicking contact
  await page.screenshot({ path: 'ss2.png' });
  
  // Check chat-main after click
  const chatMainAfter = await page.evaluate(() => {
    const m = document.querySelector('.chat-main');
    return m ? m.innerHTML.substring(0, 300) : 'NO CHAT MAIN';
  });
  console.log('After click:', chatMainAfter);
  
  // Check if message-input exists
  const hasInput = await page.evaluate(() => !!document.getElementById('message-input'));
  console.log('Has message-input:', hasInput);
  
  if (hasInput) {
    await page.type('#message-input', 'Test message!');
    await page.click('#send-btn');
    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: 'ss3_after_send.png' });
    
    const msgCount = await page.evaluate(() => document.querySelectorAll('.message').length);
    console.log('Messages found:', msgCount);
  }
  
  await browser.close();
  console.log('Done');
})();
