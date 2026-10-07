// run-browser.mjs — servește sonda pe portul 5174 și rulează pagina în Edge (cu fereastră) sau Chromium.
// node web/run-browser.mjs [msedge|chromium] [--quick]
import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = fileURLToPath(new URL('..', import.meta.url));
await mkdir(new URL('../out/', import.meta.url), { recursive: true });
const which = process.argv[2] || 'msedge', quick = process.argv.includes('--quick');
const types = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript' };
const srv = http.createServer(async (req, res) => {
  const p = normalize(join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
  if (!p.startsWith(normalize(root))) { res.writeHead(403); return res.end(); }
  try {
    const b = await readFile(p);
    res.writeHead(200, { 'content-type': types[extname(p)] || 'application/octet-stream', 'cross-origin-opener-policy': 'same-origin', 'cross-origin-embedder-policy': 'require-corp' });
    res.end(b);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((ok) => srv.listen(5174, '127.0.0.1', ok));
const opts = which === 'msedge'
  ? { channel: 'msedge', headless: false }
  : { executablePath: 'C:/Users/besli/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe', headless: false };
const browser = await chromium.launch({ ...opts, args: ['--enable-unsafe-webgpu', '--force_high_performance_gpu'] });
const out = { browser: which };
try {
  const page = await browser.newPage();
  page.setDefaultTimeout(0);
  page.on('console', (m) => { if (m.type() === 'error') console.log('console:', m.text()); });
  page.on('pageerror', (e) => console.log('pageerror:', e.message));
  await page.goto('http://127.0.0.1:5174/web/page.html');
  await page.waitForFunction(() => window.__ready === true);
  out.env = await page.evaluate(() => window.envInfo()); console.log(JSON.stringify(out.env));
  out.cpu2d_025 = await page.evaluate(() => window.cpu('2d', 0.25, 3)); console.log(JSON.stringify(out.cpu2d_025));
  if (!quick) { out.cpu2d_01 = await page.evaluate(() => window.cpu('2d', 0.1, 3)); console.log(JSON.stringify(out.cpu2d_01)); }
  out.cpu3d_subset = await page.evaluate(() => window.cpu('3d', 0.1, 3, 400)); console.log(JSON.stringify(out.cpu3d_subset));
  if (out.env.webgpu) {
    out.gpu3d_subset = await page.evaluate(() => window.gpu(400, 0.1, 5)); console.log('gpu-subset', JSON.stringify(out.gpu3d_subset));
    if (!quick) { out.gpu3d_full = await page.evaluate(() => window.gpu(2001, 0.1, 3)); console.log('gpu-full', JSON.stringify(out.gpu3d_full)); }
  }
} catch (e) { out.error = String(e); console.log('EROARE', e); }
finally { await browser.close(); srv.close(); }
await writeFile(new URL(`../out/browser-${which}${quick ? '-quick' : ''}.json`, import.meta.url), JSON.stringify(out, null, 1));
