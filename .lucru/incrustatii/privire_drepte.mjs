// Privirea pe secțiunea dopului cu pereți drepți (ADR 0179, felia 12.1↑e-3): dreptunghiul de 30 × 20 cu rolul „incrustație
// cu pereți drepți” (implicitele panoului), „Dopul 1”, „Împreună (secțiunea)”; capturile în dosarul dat. Fără export.
// Argumente: dosarul, limba (implicit ro-RO), adresa (implicit previzualizarea locală pe 4184). În Edge, ca e2e-ul.
import { chromium } from '@playwright/test';

const [, , dosar, limba = 'ro-RO'] = process.argv;
const erori = [];
const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, locale: limba, deviceScaleFactor: 2 });
page.on('console', (m) => { if (m.type() === 'error') erori.push(m.text()); });
page.on('pageerror', (e) => erori.push(String(e)));
await page.goto(process.argv[4] ?? 'http://localhost:4184/');
console.log('versiunea', await page.locator('meta[name="cncvs2-versiune"]').getAttribute('content'));
await page.locator('[data-actiune="import.svg"]').focus();
await page.keyboard.press('Control+k');
await page.locator('[id="paleta-document.adauga-dreptunghi"]').click();
await page.waitForTimeout(500);
const forma = page.getByTestId('prop-forma');
for (const [camp, v] of [['forma-latime', '30'], ['forma-inaltime', '20']]) {
  const c = forma.locator(`[data-camp="${camp}"]`);
  await c.fill(v);
  await c.press('Enter');
}
await page.getByTestId('prop-taierea').locator('[data-camp="rol"]').selectOption('incrustatie-drept');
await page.locator('[data-editare="vedere-3d"]').click();
await page.waitForFunction(() => document.querySelector('[data-testid="panza-3d"]')?.getAttribute('data-stare') === 'gata', null, { timeout: 60_000 });
await page.locator('[data-3d-alege="dop-1"]').click();
await page.waitForFunction(() => document.querySelector('[data-testid="panza-3d"]')?.getAttribute('data-alegere') === 'dop-1');
const impreuna = page.locator('[data-3d="impreuna"]');
console.log('comutatorul', await impreuna.isEnabled(), await impreuna.getAttribute('title'));
await impreuna.click();
await page.getByTestId('sectiune-tabel').waitFor({ timeout: 60_000 });
await page.screenshot({ path: `${dosar}/drepte-ecran.png` });
await page.getByTestId('sectiune-3d').screenshot({ path: `${dosar}/drepte-panou.png` });
await page.getByTestId('sectiune-svg').screenshot({ path: `${dosar}/drepte-svg.png` });
const randuri = await page.getByTestId('sectiune-tabel').locator('tbody tr').allInnerTexts();
const titluri = await page.getByTestId('sectiune-tabel').locator('tbody td[title]').evaluateAll((e) => e.map((x) => x.getAttribute('title')));
console.log(JSON.stringify({ titlu: await page.getByTestId('sectiune-3d').locator('h3').innerText(), randuri, titluri,
  nota: await page.getByTestId('sectiune-3d').locator('.sectiune-nota').innerText() }, null, 1));
const linii = await page.getByTestId('sectiune-svg').locator('[data-strat]').evaluateAll((e) => e.map((x) => `${x.getAttribute('data-strat')}${x.getAttribute('y1') !== null ? ` y1=${x.getAttribute('y1')}` : ''}`));
console.log('straturile desenului', linii.join(', '));
console.log('erori in consola', erori.length, erori.slice(0, 3));
console.log('jurnal', await page.locator('body').innerText().then((t) => (t.match(/\d+ (errors? in the local log|erori în jurnalul local)/) ?? ['?'])[0]));
await browser.close();
