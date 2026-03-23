/**
 * RetailERP User Manual PDF Generator
 *
 * Requirements: puppeteer-core + Google Chrome installed
 *   npm install puppeteer-core
 *
 * Usage:
 *   node docs/generate-pdf.js
 */

const puppeteer = require('puppeteer-core');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Chrome executable paths per platform
const CHROME_PATHS = {
  win32: [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    (process.env.LOCALAPPDATA || '') + '/Google/Chrome/Application/chrome.exe',
  ],
  darwin: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'],
  linux: ['/usr/bin/google-chrome', '/usr/bin/chromium-browser', '/usr/bin/chromium'],
};

function findChrome() {
  const paths = CHROME_PATHS[process.platform] || CHROME_PATHS.linux;
  for (const p of paths) {
    try { if (fs.existsSync(p)) return p; } catch (_) {}
  }
  throw new Error('Chrome not found. Install Google Chrome or set CHROME_PATH env var.');
}

async function startServer(docsDir, port) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const filePath = path.join(docsDir, req.url === '/' ? '/user-manual.html' : req.url);
      fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); res.end('Not found'); return; }
        const ext = path.extname(filePath);
        const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript' };
        res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
        res.end(data);
      });
    });
    server.listen(port, () => resolve(server));
  });
}

(async () => {
  const docsDir = __dirname;
  const port = 19999;
  const outputPath = path.join(docsDir, 'RetailERP-User-Manual.pdf');
  const chromePath = process.env.CHROME_PATH || findChrome();

  console.log('Starting local server...');
  const server = await startServer(docsDir, port);

  console.log('Launching Chrome:', chromePath);
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    console.log('Loading user manual...');
    await page.goto(`http://localhost:${port}/user-manual.html`, {
      waitUntil: 'networkidle0',
      timeout: 60000,
    });

    console.log('Generating PDF...');
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '15mm', bottom: '22mm', left: '15mm' },
      displayHeaderFooter: true,
      headerTemplate: '<div style="font-size:8px;color:#9ca3af;width:100%;text-align:right;padding-right:15mm;padding-top:5mm;font-family:Arial,sans-serif">RetailERP User Manual &mdash; v2.2</div>',
      footerTemplate: '<div style="font-size:8px;color:#9ca3af;width:100%;text-align:center;padding-bottom:5mm;font-family:Arial,sans-serif">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
    });

    fs.writeFileSync(outputPath, pdfBuffer);
    const sizeMB = (pdfBuffer.length / 1024 / 1024).toFixed(1);
    console.log('\nPDF generated successfully!');
    console.log('File: ' + outputPath);
    console.log('Size: ' + sizeMB + ' MB');
  } finally {
    await browser.close();
    server.close();
  }
})().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
