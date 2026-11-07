import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { ariePx } from '../../src/jobs/calculTrasare.ts';
import { traseaza } from '../../src/trasare/trasare.ts';
import { citestePng } from '../unit/ajutor-png.ts';

/**
 * Trasarea din imagine în aplicația construită (ADR 0220, felia 25.1↑): ușa imaginilor, fereastra trasării, piesa pe foaie;
 * Escape cu tasta reală (lecția D8); pe o poză mare, fila primește cadre cât trasează workerul, iar o schimbare oprește
 * calculul vechi. Numerele logoului vin din nucleul rulat aici, în Node, pe același PNG: drumul din browser (decodarea cu
 * `createImageBitmap`, workerul, ușa) trebuie să dea aceleași contururi.
 */

test.use({ locale: 'ro-RO' });

const IMPLICITE = { sursa: 'auto', prag: null, inverseaza: false, netezime: 'echilibrat' } as const;

/** Nucleul, în Node, pe un PNG din corpus, cu curățarea implicită a ferestrei (0,3 mm la 96 px pe țol). */
function inNode(nume: string): { contururi: number; exterioare: number; latime: number; inaltime: number } {
  const img = citestePng(readFileSync(`test/fixtures/trasare/${nume}.png`));
  const p = ariePx(0.3, 25.4 / 96);
  const r = traseaza(img, { ...IMPLICITE, petePx: p, gauriPx: p });
  if (!r.ok) throw new Error(`${nume}: ${r.cod}`);
  return { contururi: r.raport.contururi, exterioare: r.raport.exterioare, latime: img.latime, inaltime: img.inaltime };
}

/** Ultima versiune salvată în IndexedDB, așteptată până la revizia dată (ca în `import.spec.ts`). */
async function documentSalvat(page: Page, rev: number): Promise<string> {
  let text: string | null = null;
  await expect.poll(async () => {
    text = await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((ok, eroare) => {
        const r = indexedDB.open('cncvs2-proiecte', 1);
        r.onsuccess = () => { ok(r.result); };
        r.onerror = () => { eroare(r.error); };
      });
      const v = await new Promise<unknown>((ok, eroare) => {
        const r = db.transaction('versiuni').objectStore('versiuni').openCursor(null, 'prev');
        r.onsuccess = () => { ok(r.result?.value ?? null); };
        r.onerror = () => { eroare(r.error); };
      });
      db.close();
      return typeof v === 'string' ? v : null;
    });
    return text === null ? -1 : (JSON.parse(text) as { rev: number }).rev;
  }).toBeGreaterThanOrEqual(rev);
  return text ?? '';
}

/**
 * Ceasurile paginii (ca în `cam-bazin.spec.ts`): fiecare cadru, apoi fiecare worker al trasării, cu ora pornirii, a
 * răspunsului și a opririi, și ora apăsării pe Escape.
 */
async function ceasuri(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as {
      cadre: number[]; workere: Array<{ nume: string; pornit: number; raspuns: number; oprit: number }>; escape: number;
    };
    w.cadre = [];
    w.workere = [];
    w.escape = Number.NaN;
    const f = (t: number): void => {
      w.cadre.push(t);
      if (w.cadre.length < 100_000) requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
    const W = window.Worker;
    window.Worker = class extends W {
      readonly ceas: { nume: string; pornit: number; raspuns: number; oprit: number };
      constructor(u: string | URL, o?: WorkerOptions) {
        super(u, o);
        this.ceas = { nume: o?.name ?? '', pornit: performance.now(), raspuns: Number.NaN, oprit: Number.NaN };
        w.workere.push(this.ceas);
        this.addEventListener('message', () => { if (Number.isNaN(this.ceas.raspuns)) this.ceas.raspuns = performance.now(); });
      }
      override terminate(): void {
        if (Number.isNaN(this.ceas.oprit)) this.ceas.oprit = performance.now();
        super.terminate();
      }
    };
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') w.escape = performance.now(); }, true);
  });
}

type Ceas = { nume: string; pornit: number; raspuns: number; oprit: number };
type Ceasuri = { readonly cadre: number[]; readonly workere: Ceas[]; readonly escape: number };
const citesteCeasurile = (page: Page): Promise<Ceasuri> => page.evaluate(() => {
  const w = window as unknown as Ceasuri;
  return { cadre: w.cadre, workere: w.workere, escape: w.escape };
});
const trasari = async (page: Page): Promise<Ceas[]> => (await citesteCeasurile(page)).workere.filter((x) => x.nume === 'trasare');

/**
 * O poză generată în pagină (pete netede tăiate de prag, cu zgomot de ±5 niveluri: mii de contururi cu margini zgomotoase),
 * aleasă în fereastra de fișiere a importului. Octeții nu trec prin Playwright: injectarea unui fișier de câțiva MB ține
 * firul principal ~0,3 s, care nu e al aplicației.
 */
async function alegePoza(page: Page, latime: number, inaltime: number): Promise<void> {
  await page.evaluate(async ([W, H]) => {
    const c = new OffscreenCanvas(W, H);
    const g = c.getContext('2d');
    if (!g) throw new Error('fără context 2d');
    const img = g.createImageData(W, H);
    let s = 12345;
    const r = (): number => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const v = 128 + 60 * Math.sin(x / 17 + 2 * Math.sin(y / 23)) * Math.cos(y / 19 + 2 * Math.sin(x / 29)) + 10 * (r() - 0.5);
        const i = 4 * (y * W + x);
        img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    const b = await c.convertToBlob({ type: 'image/png' });
    const dt = new DataTransfer();
    dt.items.add(new File([b], 'poza.png', { type: 'image/png' }));
    const intrare = document.querySelector<HTMLInputElement>('[data-camp="fisier-svg"]');
    if (!intrare) throw new Error('fără fereastra de fișiere a importului');
    intrare.files = dt.files;
    intrare.dispatchEvent(new Event('change', { bubbles: true }));
  }, [latime, inaltime] as const);
}

test('logoul owner-ului (PNG transparent): Transparența aleasă singură, scara presupusă, contururile ca în Node; Importă pune piesa pe foaie', async ({ page }) => {
  const n = inNode('logo-cvs');
  await page.goto('/');
  await page.locator('[data-camp="fisier-svg"]').setInputFiles('test/fixtures/trasare/logo-cvs.png');
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await expect(page.getByTestId('trasare-panou')).toBeVisible();
  await expect(page.getByTestId('trasare-sursa-aleasa')).toHaveText('Transparența: imaginea are fundal transparent.');
  // Fără DPI în fișier: 96 px pe țol, pe hârtie: pixelul 25,4 / 96 = 0,265 mm, înălțimea 325 px = 86,0 mm.
  await expect(page.getByTestId('trasare-scara')).toHaveText('Înălțimea 86,0 mm · pixelul 0,265 mm · 96 px pe țol, presupus (fișierul nu-l spune, ca la un SVG)');
  await expect(page.getByTestId('import-cai')).toHaveText(
    `${n.contururi} de contururi închise: ${n.exterioare} tăiate pe exterior, ${n.contururi - n.exterioare} pe interior (după sensul fiecărui contur)`);
  await expect(page.getByTestId('trasare-abatere')).toContainText('Abaterea maximă:');
  await expect(page.getByTestId('trasare-imagine')).toHaveText(`Imaginea: ${n.latime} × ${n.inaltime} px`);
  await page.locator('[data-buton="importa"]').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const rand = page.getByTestId('lista-vectori').locator('li');
  await expect(rand).toHaveCount(1);
  await expect(rand).toContainText('logo-cvs');
  // Piesa are câte un element pentru fiecare contur trasat.
  const doc = await documentSalvat(page, 1);
  expect(doc.split('"tip":"element"').length - 1).toBe(n.contururi);
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});

test('un cerc alb pe transparent (lecția D7): cu Luminozitatea, „nimic de trasat”; înapoi la Transparența, cercul', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-camp="fisier-svg"]').setInputFiles('test/fixtures/trasare/cerc-alb-transparent.png');
  await expect(page.getByTestId('import-cai')).toHaveText('1 contur închis: 1 tăiate pe exterior, 0 pe interior (după sensul fiecărui contur)');
  await page.locator('[data-camp="trasare-sursa"]').selectOption('lum');
  await expect(page.getByRole('dialog')).toContainText('Nimic de trasat la pragul ăsta: desenul și fundalul arată la fel. Cu un fundal transparent, sursa bună e Transparența.');
  // Un refuz n-are „Importă” (ca la celelalte uși); fereastra trasării rămâne, ca omul să schimbe sursa.
  await expect(page.locator('[data-buton="importa"]')).toHaveCount(0);
  await expect(page.getByTestId('trasare-panou')).toBeVisible();
  await page.locator('[data-camp="trasare-sursa"]').selectOption('alfa');
  await expect(page.getByTestId('import-cai')).toHaveText('1 contur închis: 1 tăiate pe exterior, 0 pe interior (după sensul fiecărui contur)');
  await expect(page.locator('[data-buton="importa"]')).toBeEnabled();
});

test('Escape cu tasta reală (lecția D8), în timpul trasării: fereastra se închide, iar workerul se oprește fără răspuns', async ({ page }) => {
  test.setTimeout(60_000);
  await ceasuri(page);
  await page.goto('/');
  await alegePoza(page, 2400, 1600);
  await expect(page.getByTestId('trasare-panou')).toBeVisible();
  await expect.poll(async () => (await trasari(page)).length).toBe(1);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const c = await citesteCeasurile(page);
  const [w] = c.workere.filter((x) => x.nume === 'trasare');
  expect(w, JSON.stringify(c.workere)).toBeTruthy();
  if (!w) return;
  expect(Number.isNaN(w.raspuns), 'workerul oprit n-a mai apucat să răspundă').toBe(true);
  expect(w.oprit - c.escape, 'oprit chiar la Escape').toBeLessThan(500);
  await expect(page.getByTestId('lista-vectori').locator('li')).toHaveCount(0);
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});

test('o poză mare: cât trasează workerul, fila primește cadre; Inversează oprește calculul vechi fără răspuns, iar cel nou răspunde', async ({ page }) => {
  test.setTimeout(120_000);
  await ceasuri(page);
  await page.goto('/');
  await alegePoza(page, 3000, 2000);
  await expect.poll(async () => (await trasari(page)).length).toBe(1);
  await page.locator('[data-camp="trasare-inverseaza"]').check();
  await expect(page.getByTestId('trasare-abatere')).toBeVisible({ timeout: 60_000 });
  const c = await citesteCeasurile(page);
  const t = c.workere.filter((x) => x.nume === 'trasare');
  expect(t.length, JSON.stringify(c.workere)).toBe(2);
  const [vechi, nou] = t as [Ceas, Ceas];
  expect(Number.isNaN(vechi.raspuns), 'calculul vechi s-a oprit fără răspuns').toBe(true);
  expect(vechi.oprit - nou.pornit, 'oprit chiar la schimbare').toBeLessThan(100);
  // Fereastra calculului nou: de la pornirea workerului până la răspunsul lui (ca în `cam-bazin.spec.ts`). Pragul e o parte
  // din fereastră, nu milisecunde fixe, ca pe o mașină mai lentă (CI) să judece la fel.
  const fereastra = nou.raspuns - nou.pornit;
  const cadre = c.cadre.filter((x) => x >= nou.pornit && x <= nou.raspuns);
  const repere = [nou.pornit, ...cadre, nou.raspuns];
  const gol = Math.max(...repere.slice(1).map((x, k) => x - (repere[k] as number)));
  console.log(`poza de 3000 × 2000: workerul a trasat ${fereastra.toFixed(0)} ms; ${cadre.length} cadre, cel mai lung gol ${gol.toFixed(0)} ms`);
  expect(fereastra, 'fereastra calculului e destul de lungă ca proba să spună ceva').toBeGreaterThan(300);
  expect(cadre.length).toBeGreaterThanOrEqual(5);
  expect(gol).toBeLessThan(0.6 * fereastra);
  expect(nou.oprit - nou.raspuns, 'workerul se oprește la răspuns').toBeLessThan(50);
  await expect(page.locator('[data-camp="trasare-inverseaza"]')).toBeChecked();
});
