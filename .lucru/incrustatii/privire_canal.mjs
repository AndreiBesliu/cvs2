// Privirea pe secțiunea reală (ADR 0179): cercul R15 cu incrustația în V, „Dopul 1”, „Împreună (secțiunea)”; capturile în
// dosarul dat. Rulează pe previzualizarea build-ului (portul 4184), în Edge, ca e2e-ul.
import { chromium } from '@playwright/test';

const [, , dosar, limba = 'ro-RO'] = process.argv;
const erori = [];
const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, locale: limba });
page.on('console', (m) => { if (m.type() === 'error') erori.push(m.text()); });
page.on('pageerror', (e) => erori.push(String(e)));
await page.goto(process.argv[4] ?? 'http://localhost:4184/');
console.log('versiunea', await page.locator('meta[name="cncvs2-versiune"]').getAttribute('content'));
await page.locator('[data-actiune="import.svg"]').focus();
await page.keyboard.press('Control+k');
await page.locator('[id="paleta-document.adauga-cerc"]').click();
await page.waitForTimeout(500);
const t = page.getByTestId('prop-taierea');
await t.locator('[data-camp="rol"]').selectOption('incrustatie');
for (const [camp, v] of [['adancime', '3'], ['inc-fierastrau', '2']]) {
  const c = t.locator(`[data-camp="${camp}"]`);
  await c.fill(v);
  await c.press('Enter');
}
await page.locator('[data-editare="vedere-3d"]').click();
await page.getByTestId('panza-3d').locator('xpath=.').waitFor();
await page.waitForFunction(() => document.querySelector('[data-testid="panza-3d"]')?.getAttribute('data-stare') === 'gata', null, { timeout: 60_000 });
await page.locator('[data-3d-alege="dop-1"]').click();
await page.waitForFunction(() => document.querySelector('[data-testid="panza-3d"]')?.getAttribute('data-alegere') === 'dop-1');
await page.locator('[data-3d="impreuna"]').click();
await page.getByTestId('sectiune-tabel').waitFor({ timeout: 60_000 });
await page.screenshot({ path: `${dosar}/sectiune-ecran.png` });
await page.getByTestId('sectiune-3d').screenshot({ path: `${dosar}/sectiune-panou.png` });
await page.getByTestId('sectiune-svg').screenshot({ path: `${dosar}/sectiune-svg.png`, scale: 'device' });
const randuri = await page.getByTestId('sectiune-tabel').locator('tbody tr').allInnerTexts();
console.log(JSON.stringify({ titlu: await page.getByTestId('sectiune-3d').locator('h3').innerText(), randuri }, null, 1));
console.log('erori in consola', erori.length, erori.slice(0, 3));
console.log('jurnal', await page.locator('body').innerText().then((t) => (t.match(/\d+ (errors? in the local log|erori în jurnalul local)/) ?? ['?'])[0]));
await browser.close();
