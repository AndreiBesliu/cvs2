import { test, expect, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { CAZURI, type Caz } from './documente.ts';

/**
 * Bancul vizual v1 (felia 2.9, `PLAN.md` §4.5): aplicația din `dist/` deschide fiecare document de referință, arată
 * traseul și exportă G-code-ul, ca omul. Pagina (`dist/banc/index.html`) pune poza lângă cifra ei, cu valoarea pe hârtie,
 * și lângă martorul negativ, care trebuie să arate greșit și în poză, și în cifră. Bancul pică dacă o cifră nu e cea de pe
 * hârtie, dacă poza nu are traseul unde trebuie, sau dacă un martor arată bine (un banc orb raporta verde pe sabotaje în
 * ediția întâi). Se publică pe instanța de test odată cu aplicația.
 */
// Densitatea 3: liniile de 1 px fizic și detaliul mărit rămân clare în poze.
test.use({ locale: 'ro-RO', viewport: { width: 1280, height: 800 }, deviceScaleFactor: 3 });
test.describe.configure({ mode: 'serial' });

const DIR = 'dist/banc';
type Rand = {
  readonly caz: Caz;
  readonly cifra: string;
  readonly puncte: readonly boolean[];
  readonly martorCifra: string;
  readonly martorPuncte: readonly boolean[];
};
const randuri: Rand[] = [];

async function salveaza(page: Page, doc: object): Promise<void> {
  await page.evaluate(async (d) => {
    const db = await new Promise<IDBDatabase>((ok, eroare) => {
      const r = indexedDB.open('cncvs2-proiecte', 1);
      r.onsuccess = () => { ok(r.result); };
      r.onerror = () => { eroare(r.error); };
    });
    await new Promise<void>((ok, eroare) => {
      const tx = db.transaction('versiuni', 'readwrite');
      tx.objectStore('versiuni').put(JSON.stringify(d), ['proiect', (d as { rev: number }).rev]);
      tx.oncomplete = () => { ok(); };
      tx.onerror = () => { eroare(tx.error); };
    });
    db.close();
  }, doc);
}

/** Traseul cade pe punctul (x, y) al foii, la ±1 px fizic, în canvasul WebGL2. */
async function peTraseu(page: Page, x: number, y: number): Promise<boolean> {
  return page.evaluate(([x, y]) => {
    const p = document.querySelector<HTMLCanvasElement>('[data-testid="panza"]');
    const s = document.querySelector<HTMLCanvasElement>('[data-testid="strat-traseu"]');
    if (!p || !s) return false;
    const scara = Number(p.dataset.scara), tx = Number(p.dataset.tx), ty = Number(p.dataset.ty), dpr = Number(p.dataset.dpr);
    const c = document.createElement('canvas');
    c.width = s.width;
    c.height = s.height;
    const g = c.getContext('2d');
    if (!g) return false;
    g.drawImage(s, 0, 0);
    const d = g.getImageData(Math.floor((x * scara + tx) * dpr) - 1, Math.floor((ty - y * scara) * dpr) - 1, 3, 3).data;
    for (let i = 3; i < d.length; i += 4) if ((d[i] ?? 0) > 0) return true;
    return false;
  }, [x, y] as const);
}

/** Documentul în aplicație, traseul arătat, poza pânzei, punctele, apoi exportul real și cifra lui. */
/** Dreptunghiul de pe pagină (px CSS) al unei ferestre a foii (mm), din vederea pânzei. */
async function decupaj(page: Page, x0: number, y0: number, x1: number, y1: number): Promise<{ x: number; y: number; width: number; height: number }> {
  const panza = page.getByTestId('panza');
  const r = await panza.boundingBox();
  const v = await panza.evaluate((el) => ({ s: Number(el.dataset.scara), tx: Number(el.dataset.tx), ty: Number(el.dataset.ty) }));
  if (!r) throw new Error('pânza nu are cutie');
  return { x: r.x + v.tx + x0 * v.s, y: r.y + v.ty - y1 * v.s, width: (x1 - x0) * v.s, height: (y1 - y0) * v.s };
}

async function ruleaza(page: Page, doc: object, caz: Caz, poza: string): Promise<{ cifra: string; puncte: boolean[] }> {
  await page.goto('/');
  await expect(page.locator('[data-actiune="document.adauga-dreptunghi"]')).toBeVisible();
  await salveaza(page, doc);
  await page.reload();
  await expect(page.getByTestId('panza')).toHaveAttribute('data-scara', /\d/);
  await page.keyboard.press('t');
  await expect(page.getByTestId('strat-traseu')).toHaveAttribute('data-varfuri', /^[1-9]/);
  await page.mouse.move(1, 790);
  // Barele și panourile (insulele carcasei) se ascund pentru poze, prin CSSOM (CSP-ul nu primește stiluri inline), și
  // revin înainte de export.
  const insule = async (vizibile: boolean): Promise<void> => {
    await page.evaluate((v) => { for (const e of document.querySelectorAll<HTMLElement>('.insula')) e.style.visibility = v ? '' : 'hidden'; }, vizibile);
  };
  await insule(false);
  // Foaia întreagă; apoi fereastra greșelii, mărită cu rotița, la densitatea 3.
  const stoc = (doc as { foi: Array<{ stoc: { latime: number; inaltime: number } }> }).foi[0]?.stoc;
  const foaie = await decupaj(page, -4, -4, (stoc?.latime ?? 0) + 4, (stoc?.inaltime ?? 0) + 4);
  await page.screenshot({ path: `${DIR}/${poza}`, clip: foaie });
  const puncte: boolean[] = [];
  for (const [x, y] of caz.puncte) puncte.push(await peTraseu(page, x, y));
  // Detaliul: rotița, ca omul, cu cursorul în mijlocul ferestrei, până fereastra umple ~800 × 560 px CSS
  // (pânza: scara × e^(−deltaY · 0,0015), în jurul cursorului).
  const [x0, y0, x1, y1] = caz.detaliu;
  const f = await decupaj(page, x0, y0, x1, y1);
  const s0 = Number(await page.getByTestId('panza').getAttribute('data-scara'));
  const tinta = Math.min(800 / (x1 - x0), 560 / (y1 - y0));
  await page.mouse.move(f.x + f.width / 2, f.y + f.height / 2);
  // Pași mici, ca o rotiță adevărată (un singur eveniment mare nu ajunge întreg), până la țintă.
  for (let i = 0; i < 60 && Number(await page.getByTestId('panza').getAttribute('data-scara')) < tinta * 0.97; i++) {
    const s = Number(await page.getByTestId('panza').getAttribute('data-scara'));
    await page.mouse.wheel(0, Math.max(-200, -Math.log(tinta / s) / 0.0015));
    await expect.poll(async () => Number(await page.getByTestId('panza').getAttribute('data-scara'))).toBeGreaterThan(s);
  }
  expect(Number(await page.getByTestId('panza').getAttribute('data-scara'))).toBeGreaterThanOrEqual(Math.min(tinta * 0.97, s0));
  // Imaginea vectorilor e cea cerută ultima, iar stratul a apucat să se redeseneze.
  await expect.poll(async () => {
    const p = page.getByTestId('panza');
    return (await p.getAttribute('data-afisata')) === (await p.getAttribute('data-cerere'));
  }).toBe(true);
  await page.mouse.move(1, 790);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${DIR}/${poza.replace('.png', '-detaliu.png')}`, clip: await decupaj(page, x0, y0, x1, y1) });
  await insule(true);
  await page.locator('[data-actiune="export.gcode"]').click();
  const d = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  const gcode = readFileSync(await (await d).path() ?? '', 'ascii');
  return { cifra: caz.cifra(gcode), puncte };
}

test.beforeAll(() => { mkdirSync(DIR, { recursive: true }); });

for (const caz of CAZURI) {
  test(`${caz.id}: poza și cifra ei; martorul (${caz.greseala}) arată greșit`, async ({ page }) => {
    const bun = await ruleaza(page, caz.doc, caz, `${caz.id}.png`);
    const martor = await ruleaza(page, caz.martor, caz, `${caz.id}-martor.png`);
    randuri.push({ caz, cifra: bun.cifra, puncte: bun.puncte, martorCifra: martor.cifra, martorPuncte: martor.puncte });
    expect(bun.cifra).toBe(caz.hartie);
    expect(bun.puncte.every(Boolean), 'traseul nu cade în poză pe punctele de pe hârtie').toBe(true);
    expect(martor.cifra, 'martorul dă cifra de pe hârtie: bancul e orb').not.toBe(caz.hartie);
    expect(martor.puncte[0], 'martorul are traseul pe primul punct: poza nu deosebește greșeala').toBe(false);
  });
}

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

test.afterAll(() => {
  let sha = '?';
  try { sha = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim(); } catch { /* fără git */ }
  const rand = (r: Rand): string => {
    const ok = r.cifra === r.caz.hartie && r.puncte.every(Boolean);
    const prins = r.martorCifra !== r.caz.hartie && r.martorPuncte[0] === false;
    return `
<section class="caz ${ok && prins ? 'bun' : 'rau'}">
  <h2>${esc(r.caz.titlu)}</h2>
  <div class="perechi">
    <figure><img src="${r.caz.id}.png" alt="${esc(r.caz.titlu)}"><img src="${r.caz.id}-detaliu.png" alt="detaliul"><figcaption>
      <p class="cifra">${esc(r.cifra)}</p><p>pe hârtie: ${esc(r.caz.hartie)}</p>
      <p class="verdict">${ok ? '✓ cifra și poza sunt cele de pe hârtie' : '✗ diferă de hârtie'}</p></figcaption></figure>
    <figure class="martor"><img src="${r.caz.id}-martor.png" alt="martorul: ${esc(r.caz.greseala)}"><img src="${r.caz.id}-martor-detaliu.png" alt="detaliul martorului"><figcaption>
      <p><strong>martorul:</strong> ${esc(r.caz.greseala)}</p><p class="cifra">${esc(r.martorCifra)}</p>
      <p class="verdict">${prins ? '✓ arată greșit, cum trebuie' : '✗ arată bine: bancul nu vede greșeala'}</p></figcaption></figure>
  </div>
</section>`;
  };
  const html = `<!doctype html>
<html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Bancul vizual, etapa 2</title><link rel="stylesheet" href="banc.css"></head>
<body><main>
<h1>Bancul vizual, etapa 2</h1>
<p class="nota">Fiecare poză e pânza aplicației cu traseul arătat (T), pe un document de referință; cifra vine din G-code-ul
exportat chiar atunci. Lângă ea, martorul: același document cu o singură greșeală, care trebuie să arate greșit.
Commit <code>${esc(sha)}</code>, ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC.</p>
${randuri.map(rand).join('\n')}
</main></body></html>
`;
  writeFileSync(`${DIR}/index.html`, html);
  writeFileSync(`${DIR}/banc.css`, CSS);
});

const CSS = `:root { color-scheme: light dark; --f: #fbfaf7; --t: #1d232b; --s: #6b7280; --b: #0a7d53; --r: #b42318; }
@media (prefers-color-scheme: dark) { :root { --f: #14181d; --t: #e8e4dc; --s: #9aa1aa; --b: #3ccf91; --r: #f97066; } }
body { margin: 0; background: var(--f); color: var(--t); font: 15px/1.45 system-ui, sans-serif; }
main { max-width: 1200px; margin: 0 auto; padding: 16px; }
h1 { font-size: 1.5rem; margin: 0 0 8px; }
h2 { font-size: 1.05rem; margin: 0 0 8px; }
.nota { color: var(--s); max-width: 70ch; }
.caz { border-left: 4px solid var(--b); padding: 8px 0 8px 12px; margin: 24px 0; }
.caz.rau { border-color: var(--r); }
.perechi { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
figure { margin: 0; }
img { display: block; width: 100%; height: auto; margin-bottom: 8px; border: 1px solid color-mix(in srgb, var(--s) 40%, transparent); border-radius: 6px; }
figcaption p { margin: 4px 0; }
.cifra { font-variant-numeric: tabular-nums; font-weight: 600; }
.verdict { color: var(--b); }
.caz.rau .verdict { color: var(--r); }
.martor img { opacity: 0.92; }
`;
