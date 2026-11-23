// Privirea pe secțiunea „Împreună” (ADR 0179), pe aplicația construită: o variantă a incrustației, pe un dreptunghi de
// 30 × 20 (sau pe cercul R15), „Dopul 1”, „Împreună (secțiunea)”. Scrie în dosarul dat capturile (ecranul, panoul, desenul,
// peretele din stânga mărit) și desenul ca text, și tipărește tabelul, straturile desenului și erorile din consolă. Capturile
// se privesc apoi una câte una: e pasul „privirea pe piesa reală” al unei felii, nu o probă.
//
//   npm run build && npx vite preview --port 4173 --strictPort &
//   node scripts/privire-sectiune.mjs <dosar> <varianta> [limba] [adresa]
//
// Variantele: v (incrustația în V), fund (pereți drepți, implicitele panoului), lateral (jocul lateral 0,5), fata, decupat,
// gaura-decupat, gaura-ridicat, cerc. Limba: ro-RO (implicit) sau en-US. Mărimea ferestrei: LAT și INALT (implicit
// 1400 × 900). Variantele alese în fereastra exportului apasă „Exportă” (fișierul se descarcă în dosarul temporar al
// browserului). În Edge, ca e2e-ul.
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const [, , dosar, varianta = 'fund', limba = 'ro-RO', adresa = 'http://localhost:4173/'] = process.argv;
if (!dosar) throw new Error('lipsește dosarul capturilor');
mkdirSync(dosar, { recursive: true });
const nume = (ce) => `${dosar}/${varianta}-${limba}-${ce}`;
const erori = [];
const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({
  viewport: { width: Number(process.env.LAT ?? 1400), height: Number(process.env.INALT ?? 900) }, locale: limba, deviceScaleFactor: 2,
});
page.on('console', (m) => { if (m.type() === 'error') erori.push(m.text()); });
page.on('pageerror', (e) => erori.push(String(e)));
await page.goto(adresa);
console.log('varianta', varianta, limba, 'versiunea', await page.locator('meta[name="cncvs2-versiune"]').getAttribute('content'));

// Forma, din paletă; dreptunghiul, micșorat la 30 × 20.
await page.locator('[data-actiune="import.svg"]').focus();
await page.keyboard.press('Control+k');
const forma = varianta === 'cerc' || varianta === 'v' ? 'cerc' : 'dreptunghi';
await page.locator(`[id="paleta-document.adauga-${forma}"]`).click();
await page.waitForTimeout(500);
const scrie = async (grup, campuri) => {
  for (const [camp, v] of campuri) {
    const c = page.getByTestId(grup).locator(`[data-camp="${camp}"]`);
    await c.fill(v);
    await c.press('Enter');
  }
};
if (forma === 'dreptunghi') await scrie('prop-forma', [['forma-latime', '30'], ['forma-inaltime', '20']]);

// Incrustația: din panou (implicitele) sau din fereastra exportului (locașul, felul dopului, sprijinul).
const rol = page.getByTestId('prop-taierea').locator('[data-camp="rol"]');
if (varianta === 'v') {
  await rol.selectOption('incrustatie');
  await scrie('prop-taierea', [['adancime', '3'], ['inc-fierastrau', '2']]);
} else if (varianta === 'fund' || varianta === 'cerc' || varianta === 'lateral') {
  await rol.selectOption('incrustatie-drept');
  if (varianta === 'lateral') await scrie('prop-taierea', [['inc-lateral', '0.5']]);
} else {
  await page.locator('[data-actiune="export.gcode"]').click();
  await page.locator('tr[data-operatie]').first().locator('[data-camp="latura"]').selectOption('incrustatie-drept');
  const inc = page.locator('tr[data-detalii]').first().locator('[data-incrustatie][data-fel="drept"]');
  if (varianta.includes('gaura')) await inc.locator('[data-camp="inc-locas"]').selectOption('gaura');
  if (varianta.includes('decupat')) {
    // Marginea dopului decupat trebuie să fie cel puțin cât freza lui: freza dopului, a lui (Ø3).
    await inc.locator('[data-camp="inc-dop"]').selectOption('decupat');
    await inc.locator('[data-camp="inc-freza-dop"]').check();
  }
  if (varianta === 'fata') await inc.locator('[data-camp="inc-sprijin"]').selectOption('fata');
  await page.locator('[data-buton="exporta"]').click();
  await page.getByTestId('export-dopuri').waitFor({ timeout: 60_000 });
  console.log('dopuri:', (await page.getByTestId('export-dopuri').innerText()).replace(/\s+/g, ' ').slice(0, 300));
  await page.getByRole('button', { name: /^(Închide|Close)$/ }).click();
}

// Vederea 3D, dopul, secțiunea.
await page.locator('[data-editare="vedere-3d"]').click();
const panza = (atribut, valoare) => page.waitForFunction(
  ([a, v]) => document.querySelector('[data-testid="panza-3d"]')?.getAttribute(a) === v, [atribut, valoare], { timeout: 60_000 },
);
await panza('data-stare', 'gata');
await page.locator('[data-3d-alege="dop-1"]').click();
await panza('data-alegere', 'dop-1');
await page.waitForTimeout(800);
await page.screenshot({ path: nume('dop.png') });
const impreuna = page.locator('[data-3d="impreuna"]');
console.log('comutatorul', await impreuna.isEnabled(), await impreuna.getAttribute('title'));
await impreuna.click();
const sectiune = page.getByTestId('sectiune-3d'), tabel = page.getByTestId('sectiune-tabel'), svg = page.getByTestId('sectiune-svg');
await tabel.waitFor({ timeout: 60_000 });
await page.waitForTimeout(300);
await page.screenshot({ path: nume('ecran.png') });
await sectiune.screenshot({ path: nume('panou.png') });
await svg.screenshot({ path: nume('svg.png') });
writeFileSync(nume('desen.txt'), await svg.evaluate((e) => e.outerHTML));

// Mărit: 8 mm în jurul peretelui din stânga (PERETE, în mm; implicit la 5 mm de marginea desenului), prin viewBox.
const cutie = (await svg.getAttribute('viewBox')).split(' ').map(Number);
const perete = Number(process.env.PERETE ?? cutie[0] + 5);
await svg.evaluate((e, v) => { e.setAttribute('viewBox', v); }, `${perete - 4} ${cutie[1]} 8 ${cutie[3]}`);
await svg.screenshot({ path: nume('perete.png') });
await svg.evaluate((e, v) => { e.setAttribute('viewBox', v); }, cutie.join(' '));

console.log(JSON.stringify({
  titlu: await sectiune.locator('h3').innerText(),
  randuri: await tabel.locator('tr').allInnerTexts(),
  titluri: await tabel.locator('[title]').evaluateAll((e) => e.map((x) => x.getAttribute('title'))),
  nota: await sectiune.locator('.sectiune-nota').allInnerTexts(),
  rosii: await sectiune.locator('tr.diferit').count(),
  cutie: cutie.join(' '),
}, null, 1));
const straturi = await svg.locator('[data-strat]').evaluateAll((e) => e.map((x) => {
  const linie = ['x1', 'y1', 'x2', 'y2'].map((n) => x.getAttribute(n)).filter((v) => v !== null);
  const cale = x.getAttribute('d') ?? x.getAttribute('points');
  return `${x.getAttribute('data-strat')}${linie.length ? ` [${linie.join(', ')}]` : ''}${cale ? ` (${cale.length}): ${cale.slice(0, 120)}` : ''}`;
}));
console.log(`straturile desenului:\n ${straturi.join('\n ')}`);
console.log('erori în consolă:', erori.length, erori.slice(0, 3));
console.log('jurnalul:', await page.locator('body').innerText().then((t) => (t.match(/\d+ (errors? in the local log|erori în jurnalul local)/) ?? ['fără'])[0]));
await browser.close();
