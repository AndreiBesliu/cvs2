// Porneste serverul pe 5187 si Edge CU FEREASTRA (headed), ruleaza bench.html in modurile cerute; inchide tot la final.
// node run-bench.mjs [--quick] [--moduri=coep-rc,none,dip-rc]
import { chromium } from 'playwright-core';
import { startServer, PORT } from './serve.mjs';

const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const quick = process.argv.includes('--quick');
const moduri = arg('moduri', 'coep-rc,none,dip-rc').split(',');
const q = arg('q', quick ? 'rb=5&rd=5&rs=5' : 'rb=9&rd=7&rs=7');
const srv = await startServer(PORT);
const args = ['--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--disable-features=CalculateNativeWinOcclusion'];
const browser = await chromium.launch({ channel: 'msedge', headless: false, args });
console.log('browser', browser.version());
try {
  for (const mod of moduri) {
    const ctx = await browser.newContext({ viewport: { width: 900, height: 700 } });
    const page = await ctx.newPage();
    page.on('console', (m) => console.log(`[${mod}]`, m.text()));
    page.on('pageerror', (e) => console.log(`[${mod}] pageerror`, e.message));
    page.on('crash', () => console.log(`[${mod}] PAGINA A CAZUT`));
    // fara SAB (none) nu exista varianta (a); acolo masuram doar (b)/(c), ca sa vedem ca merg si fara izolare
    const parts = arg('parts', null) || (mod === 'coep-rc' ? 'coi,blur,dc,s4' : mod === 'none' ? 'coi,blur,dc' : 'coi,blur');
    await page.goto(`http://127.0.0.1:${PORT}/m/${mod}/web/bench.html?${q}&parts=${parts}`);
    await page.waitForFunction(() => window.__done === true, null, { timeout: 900000 });
    await ctx.close();
  }
} finally {
  await browser.close();
  srv.close();
}
