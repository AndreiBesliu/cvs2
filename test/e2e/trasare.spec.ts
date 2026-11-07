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
  await page.locator('[data-camp="fisier-svg"]').waitFor({ state: 'attached' });
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
  // Histograma sub glisor, cu linia la pragul acoperirii (50 %: treapta 128, între centrele pixelilor la 127,5).
  await expect(page.getByTestId('trasare-histograma')).toBeVisible();
  await expect(page.getByTestId('trasare-histograma').locator('line')).toHaveAttribute('x1', '127.5');
  await expect(page.getByTestId('trasare-prag-valoare')).toHaveText('128');
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

test('o coadă de două imagini: a doua pornește cu alegerile ei, nu cu lățimea scrisă la prima', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-camp="fisier-svg"]').setInputFiles(['test/fixtures/trasare/logo-cvs.png', 'test/fixtures/trasare/cerc-opac-alb.png']);
  await expect(page.getByTestId('import-coada')).toHaveText('(1 din 2)');
  await expect(page.getByTestId('trasare-abatere')).toBeVisible();
  await page.locator('[data-camp="trasare-latime"]').fill('100');
  await expect(page.getByTestId('trasare-scara')).toContainText('din lățime');
  await page.locator('[data-buton="sari"]').click();
  await expect(page.getByTestId('import-coada')).toHaveText('(2 din 2)');
  await expect(page.getByTestId('trasare-abatere')).toBeVisible();
  await expect(page.locator('[data-camp="trasare-latime"]')).toHaveValue('');
  await expect(page.getByTestId('trasare-scara')).toContainText('presupus');
});

test('un cerc alb pe transparent (lecția D7): cu Luminozitatea, „nimic de trasat”; înapoi la Transparența, cercul', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-camp="fisier-svg"]').setInputFiles('test/fixtures/trasare/cerc-alb-transparent.png');
  await expect(page.getByTestId('import-cai')).toHaveText('1 contur închis: 1 tăiate pe exterior, 0 pe interior (după sensul fiecărui contur)');
  await page.locator('[data-camp="trasare-sursa"]').selectOption('lum');
  await expect(page.getByRole('dialog')).toContainText('Nimic de trasat la pragul ăsta: desenul și fundalul arată la fel. Cu un fundal transparent, sursa bună e Transparența.');
  // Un refuz n-are „Importă” (ca la celelalte uși) și nici abatere (n-are vectori); fereastra trasării rămâne, ca omul să
  // schimbe sursa.
  await expect(page.locator('[data-buton="importa"]')).toHaveCount(0);
  await expect(page.getByTestId('trasare-abatere')).toHaveCount(0);
  await expect(page.getByTestId('trasare-panou')).toBeVisible();
  await page.locator('[data-camp="trasare-sursa"]').selectOption('alfa');
  await expect(page.getByTestId('import-cai')).toHaveText('1 contur închis: 1 tăiate pe exterior, 0 pe interior (după sensul fiecărui contur)');
  await expect(page.locator('[data-buton="importa"]')).toBeEnabled();
});

test('o imagine de 17 Mpx se reduce sub plafonul de 16 Mpx: raportul spune de la cât, scara rămâne a fișierului, discul are mărimea de pe hârtie', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/');
  await page.locator('[data-camp="fisier-svg"]').waitFor({ state: 'attached' });
  // 5000 × 3400 px, un disc negru cu raza de 1000 px pe alb; desenat cu canvasul (fără buclă pe pixeli), fără DPI în fișier.
  await page.evaluate(async () => {
    const c = new OffscreenCanvas(5000, 3400);
    const g = c.getContext('2d');
    if (!g) throw new Error('fără context 2d');
    g.fillStyle = '#fff';
    g.fillRect(0, 0, 5000, 3400);
    g.fillStyle = '#000';
    g.beginPath();
    g.arc(2500, 1700, 1000, 0, 2 * Math.PI);
    g.fill();
    const b = await c.convertToBlob({ type: 'image/png' });
    const dt = new DataTransfer();
    dt.items.add(new File([b], 'disc.png', { type: 'image/png' }));
    const intrare = document.querySelector<HTMLInputElement>('[data-camp="fisier-svg"]');
    if (!intrare) throw new Error('fără fereastra de fișiere a importului');
    intrare.files = dt.files;
    intrare.dispatchEvent(new Event('change', { bubbles: true }));
  });
  // Pe hârtie: s = √(16 / 17), deci 4850 × 3298 px (rotunjite în jos); lățimea fișierului la 96 px pe țol, 1322,9 mm, pe
  // 4850 px: pixelul 0,273 mm; înălțimea 3400 px = 899,6 mm. DPI-ul rămâne al fișierului întreg: 96, nu 96 · s.
  const s = Math.sqrt(16_000_000 / 17_000_000), w = Math.floor(5000 * s), h = Math.floor(3400 * s);
  await expect(page.getByTestId('trasare-imagine')).toHaveText(`Imaginea: ${w} × ${h} px (redusă de la 5000 × 3400 px; trasarea are plafonul 16 Mpx)`, { timeout: 60_000 });
  const mm = (5000 / 96) * 25.4 / w;
  const nr = (x: number, z: number): string => new Intl.NumberFormat('ro-RO', { minimumFractionDigits: z, maximumFractionDigits: z }).format(x);
  await expect(page.getByTestId('trasare-scara')).toHaveText(`Înălțimea ${nr(h * mm, 1)} mm · pixelul ${nr(mm, 3)} mm · 96 px pe țol, presupus (fișierul nu-l spune, ca la un SVG)`);
  // Discul: diametrul de 2000 px ai fișierului, la 96 px pe țol, 529,17 mm; reducerea îl mută cu cel mult un pixel redus.
  const marime = await page.getByTestId('import-marime').textContent();
  const m = /Desenul: ([\d.]+) × ([\d.]+) mm/.exec(marime ?? '');
  expect(m, marime ?? '').toBeTruthy();
  for (const v of [Number(m?.[1]), Number(m?.[2])]) expect(Math.abs(v - (2000 / 96) * 25.4), `${v} față de 529,17`).toBeLessThan(mm);
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
