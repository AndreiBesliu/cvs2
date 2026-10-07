// Porneste serverul pe 5175 si Edge HEADED (GPU real) prin Playwright; ruleaza web/index.html, apoi web/mem.html.
// Inchide tot la final. Argumente: --quick, --fara-mem, --chromium (in loc de Edge)
import { chromium } from 'playwright-core';
import { startServer } from './serve.mjs';
import os from 'node:os';

const quick = process.argv.includes('--quick');
const srv = await startServer(5175);
const args = ['--js-flags=--expose-gc', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--disable-features=CalculateNativeWinOcclusion'];
const launch = process.argv.includes('--chromium')
  ? { headless: false, executablePath: 'C:/Users/besli/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe', args }
  : { channel: 'msedge', headless: false, args };
const browser = await chromium.launch(launch);
console.log('browser', browser.version());
try {
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 960 } });
  const page = await ctx.newPage();
  page.on('console', (m) => console.log('[pagina]', m.text()));
  page.on('crash', () => console.log('PAGINA PRINCIPALA A CAZUT'));
  await page.goto(`http://127.0.0.1:5175/web/index.html${quick ? '?quick=1' : ''}`);
  await page.waitForFunction(() => window.__done === true, null, { timeout: 900000 });
  await page.close();
  if (!process.argv.includes('--fara-mem')) {
    const freeGB = os.freemem() / 1e9;
    // plafon: lasam cel putin 5 GB liberi masinii (alti agenti ruleaza in paralel); maxim 6,1 GB = 96 de straturi
    const cap = Math.max(8, Math.min(quick ? 32 : 96, Math.floor((freeGB - 5) / 0.064)));
    console.log(`memorie libera ${freeGB.toFixed(1)} GB -> plafon ${cap} straturi`);
    const p2 = await ctx.newPage();
    let crashed = false;
    p2.on('crash', () => { crashed = true; console.log('PAGINA DE MEMORIE A CAZUT'); });
    p2.on('console', (m) => console.log('[mem]', m.text()));
    await p2.goto(`http://127.0.0.1:5175/web/mem.html?cap=${cap}`);
    await p2.waitForFunction(() => window.__done === true, null, { timeout: 600000 }).catch((e) => console.log('mem:', crashed ? 'cazut' : e.message));
  }
} finally {
  await browser.close();
  srv.close();
}
