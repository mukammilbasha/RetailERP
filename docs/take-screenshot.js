/**
 * Screenshot capture script for stock-freeze page
 * Usage: node docs/take-screenshot.js
 */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATHS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  (process.env.LOCALAPPDATA || '') + '/Google/Chrome/Application/chrome.exe',
];

function findChrome() {
  for (const p of CHROME_PATHS) {
    try { if (fs.existsSync(p)) return p; } catch (_) {}
  }
  throw new Error('Chrome not found');
}

(async () => {
  const chromePath = process.env.CHROME_PATH || findChrome();
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // Login
    console.log('Logging in...');
    await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle0' });
    await page.type('input[type="email"], input[placeholder*="company"]', 'admin@elcurio.com');
    await page.type('input[type="password"]', 'Admin@123');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 });

    // Navigate to each page and take screenshots
    const pages = [
      { url: '/dashboard/inventory/dispatch', file: 'screen-dispatch.png' },
      { url: '/dashboard/inventory/returns', file: 'screen-returns.png' },
      { url: '/dashboard/inventory/adjustment', file: 'screen-adjustment.png' },
      { url: '/dashboard/inventory/stock-freeze', file: 'screen-stock-freeze.png' },
    ];

    for (const p of pages) {
      console.log(`Capturing ${p.url}...`);
      await page.goto(`http://localhost:3001${p.url}`, { waitUntil: 'networkidle0', timeout: 30000 });
      await new Promise(r => setTimeout(r, 2000));
      const outPath = path.join(__dirname, 'screenshots', p.file);
      await page.screenshot({ path: outPath, fullPage: true });
      console.log(`  Saved: ${outPath}`);
    }

    console.log('\nAll screenshots captured!');
  } finally {
    await browser.close();
  }
})().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
