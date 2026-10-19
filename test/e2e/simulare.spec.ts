import { test, expect, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { cazul } from '../oracles/simulare.cazuri.ts';
import { calculeazaBanda, mutariPentruBanda, previzualizarePentru, uneste, type CerereBanda, type RaspunsBanda } from '../../src/sim/banda.ts';
import { pregatesteProgram } from '../../src/sim/program.ts';
import { parametriGrila, PIESE_1, PIESE_2, programCaz } from '../unit/ajutor-simulare.ts';

/**
 * Amprenta Node = browser (ADR 0010, ADR 0047 §6): poarta din `PLAN.md` §5.3, etapa 4, punctul 2. Același program dă
 * aceleași celule în Node (testele) și în Edge (ecranul), pe 1 fir și pe mai multe:
 * - pe corpusul oracolului, prin WORKERUL CONSTRUIT (`dist/assets/lucratorSimulare-*.js`, cel din aplicație): fiecare
 *   bandă, pe 1 și pe 4 fire, are aceleași rânduri, aceleași amprente pe rând, același volum, același Z minim și aceeași
 *   previzualizare, bit cu bit, ca în Node;
 * - pe calea omului: dialogul exportului arată simularea, iar amprenta ei e aceeași pe 1 fir, pe 4 fire și în Node, pe
 *   documentul salvat de aplicație.
 */
test.use({ locale: 'ro-RO' });

const LUCRATOR = readdirSync('dist/assets').find((f) => /^lucratorSimulare-[\w-]+\.js$/.test(f));

type BandaSimpla = { readonly randuri: number[]; readonly amprente: number[]; readonly volume: number[]; readonly zMin: number; readonly previzualizare: number[]; readonly atinse: number; readonly uniforme: number };

const simplu = (r: RaspunsBanda): BandaSimpla => ({
  randuri: Array.from(r.randuri), amprente: Array.from(r.amprente), volume: Array.from(r.volume), zMin: r.zMin,
  previzualizare: Array.from(r.previzualizare), atinse: r.atinse, uniforme: r.uniforme,
});

/** Benzile cererilor, fiecare pe workerul ei, în pagină (toate deodată: N fire). */
async function inBrowser(page: Page, cereri: readonly CerereBanda[]): Promise<BandaSimpla[]> {
  const date = cereri.map((c) => ({ ...c, mutari: Array.from(c.mutari) }));
  return page.evaluate(async ({ url, date }) => {
    const unu = (c: (typeof date)[number], k: number) => new Promise<BandaSimpla>((ok, eroare) => {
      const w = new Worker(url, { type: 'module', name: `proba-${k}` });
      w.onerror = (e) => { eroare(new Error(e.message)); };
      w.onmessage = (e: MessageEvent<{ ok: boolean; motiv?: string; raspuns?: RaspunsBanda }>) => {
        w.terminate();
        const r = e.data.raspuns;
        if (!e.data.ok || !r) { eroare(new Error(e.data.motiv ?? 'fără răspuns')); return; }
        ok({
          randuri: Array.from(r.randuri), amprente: Array.from(r.amprente), volume: Array.from(r.volume), zMin: r.zMin,
          previzualizare: Array.from(r.previzualizare), atinse: r.atinse, uniforme: r.uniforme,
        });
      };
      const mutari = Float64Array.from(c.mutari);
      w.postMessage({ id: k + 1, cerere: { ...c, mutari } }, [mutari.buffer]);
    });
    return Promise.all(date.map(unu));
  }, { url: `/assets/${LUCRATOR ?? ''}`, date });
}

test('amprenta Node = Edge pe corpusul oracolului, prin workerul construit, pe 1 și pe 4 fire', async ({ page }) => {
  test.setTimeout(120_000);
  expect(LUCRATOR, 'workerul simulării lipsește din dist/assets (npm run build)').toBeTruthy();
  await page.goto('/');
  let piese = 0;
  for (const id of [...PIESE_1, ...PIESE_2]) {
    const c = cazul(id);
    const p = pregatesteProgram(programCaz(c), 0);
    if (!p.ok) throw new Error(`${id}: ${p.motiv}`);
    const camp = parametriGrila(c.grila), previzualizare = previzualizarePentru(camp);
    let amprentaUnu = '';
    for (const n of [1, 4]) {
      const cereri: CerereBanda[] = Array.from({ length: n }, (_, w) => ({
        camp, banda: { n, w }, scula: p.scula, fund: -18, previzualizare, mutari: mutariPentruBanda(p.mutari, p.scula, camp, { n, w }),
      }));
      const node = cereri.map((x) => simplu(calculeazaBanda({ ...x, mutari: x.mutari.slice() })));
      const edge = await inBrowser(page, cereri);
      edge.forEach((b, w) => {
        const a = node[w]!;
        expect(b.randuri, `${id}, ${n} fire, banda ${w}: rândurile`).toEqual(a.randuri);
        expect(b.amprente, `${id}, ${n} fire, banda ${w}: amprentele pe rând`).toEqual(a.amprente);
        expect(b.volume, `${id}, ${n} fire, banda ${w}: volumele`).toEqual(a.volume);
        expect(b.zMin, `${id}, ${n} fire, banda ${w}: Z minim`).toBe(a.zMin);
        expect(b.previzualizare, `${id}, ${n} fire, banda ${w}: previzualizarea`).toEqual(a.previzualizare);
        expect([b.atinse, b.uniforme], `${id}, ${n} fire, banda ${w}: dalele`).toEqual([a.atinse, a.uniforme]);
      });
      // Benzile din Edge, unite în Node: aceeași amprentă pe 1 și pe 4 fire.
      const unite = uneste(camp, previzualizare, -18, edge.map((b, w) => ({
        banda: { n, w }, randuri: Int32Array.from(b.randuri), amprente: Uint32Array.from(b.amprente), volume: Float64Array.from(b.volume),
        zMin: b.zMin, previzualizare: Float32Array.from(b.previzualizare), atinse: b.atinse, uniforme: b.uniforme, ms: 0,
      })));
      if (n === 1) amprentaUnu = unite.amprenta;
      else expect(unite.amprenta, `${id}: 4 fire față de 1 fir`).toBe(amprentaUnu);
    }
    piese++;
  }
  expect(piese).toBe(20);
});

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
  return text ?? 'null';
}

for (const nuclee of [1, 5]) {
  test(`dialogul exportului arată simularea; pe ${nuclee === 1 ? '1 fir' : '4 fire'}, amprenta e cea din Node`, async ({ page }) => {
    await page.addInitScript((n) => { Object.defineProperty(Navigator.prototype, 'hardwareConcurrency', { get: () => n }); }, nuclee);
    await page.goto('/');
    await page.locator('[data-actiune="document.adauga-dreptunghi"]').click();
    await page.locator('[data-actiune="document.adauga-cerc"]').click();
    await page.locator('[data-actiune="export.gcode"]').click();
    const descarcare = page.waitForEvent('download');
    await page.locator('[data-buton="exporta"]').click();
    await descarcare;
    const s = page.getByTestId('export-simulare');
    await expect(s).toBeVisible();
    await expect(s).toHaveAttribute('data-fire', String(nuclee === 1 ? 1 : 4));
    await expect(s.getByRole('heading', { name: 'Simularea' })).toBeVisible();
    await expect(s.getByRole('img', { name: /Harta adâncimilor/ })).toBeVisible();
    await expect(s.locator('[data-simulare="volum"]')).toHaveText(/^Material scos: \d+,\d cm³$/);
    await expect(s.locator('[data-simulare="adancime"]')).toHaveText('Cea mai adâncă tăietură: 8,00 mm');
    await expect(s.locator('[data-simulare="grila"]')).toContainText(`Grila de 0,25 mm`);
    // Harta are pixeli tăiați (mai închiși decât fața) și pixeli netăiați.
    const pixeli = await s.locator('canvas').evaluate((c: HTMLCanvasElement) => {
      const d = c.getContext('2d')?.getImageData(0, 0, c.width, c.height).data ?? new Uint8ClampedArray();
      let fata = 0, taiat = 0, sx = 0, sy = 0;
      for (let k = 0; k < d.length; k += 4) {
        if (d[k] === 235) { fata++; continue; }
        taiat++;
        sx += (k / 4) % c.width;
        sy += Math.floor(k / 4 / c.width);
      }
      return { fata, taiat, x: sx / taiat / c.width, y: sy / taiat / c.height };
    });
    expect(pixeli.fata).toBeGreaterThan(100);
    expect(pixeli.taiat).toBeGreaterThan(100);
    // Orientarea, ca pe pânză: formele noi stau lângă colțul stânga-jos al foii, deci tăietura e în stânga-jos a hărții
    // (rândul 0 al previzualizării e marginea de jos a foii, rândul 0 al imaginii e sus).
    expect(pixeli.x, 'harta e oglindită stânga-dreapta').toBeLessThan(0.5);
    expect(pixeli.y, 'harta e întoarsă sus-jos').toBeGreaterThan(0.5);
    // Node, pe documentul salvat de aplicație (cu operațiile scrise la Exportă), prin aceeași funcție a exportului, într-un
    // proces Node (`simulare-node.ts`).
    const doc = await documentSalvat(page, 1);
    const r = JSON.parse(execFileSync(process.execPath, ['test/e2e/simulare-node.ts'], { input: doc, encoding: 'utf8' })) as
      { readonly ok: true; readonly amprenta: string; readonly volum: number } | { readonly ok: false; readonly motiv: string };
    expect(r.ok, JSON.stringify(r)).toBe(true);
    if (!r.ok) return;
    await expect(s).toHaveAttribute('data-amprenta', r.amprenta);
    await expect(s).toHaveAttribute('data-volum', String(r.volum));
    await expect(s.locator('[data-simulare="amprenta"]')).toHaveText(`Amprenta ${r.amprenta}: aceeași în orice browser, pe oricâte fire.`);
    await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
  });
}
