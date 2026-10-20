import { test, expect, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { cazul } from '../oracles/simulare.cazuri.ts';
import { calculeazaBanda, mutariPentruBanda, previzualizarePentru, uneste, type CerereBanda, type RaspunsBanda } from '../../src/sim/banda.ts';
import { pregatesteProgram } from '../../src/sim/program.ts';
import { parametriGrila, PIESE_1, PIESE_2, programCaz } from '../unit/ajutor-simulare.ts';
import { adauga } from './ajutor-panza.ts';

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

type SimulareNode =
  | {
    readonly ok: true; readonly amprenta: string; readonly volum: number; readonly adancimeMax: number; readonly grosime: number;
    readonly previzualizare: { readonly latime: number; readonly inaltime: number; readonly z: readonly number[] };
  }
  | { readonly ok: false; readonly motiv: string };

const zecimale = (n: number): Intl.NumberFormat => new Intl.NumberFormat('ro-RO', { minimumFractionDigits: n, maximumFractionDigits: n });

/**
 * Regula hărții, scrisă aici ca specificație (ADR 0047 §5): 235 la față, 60 la cea mai adâncă tăietură (cel mult grosimea),
 * liniar între ele; 0 la fața de jos a foii sau sub ea.
 */
function griAsteptat(z: number, adancimeMax: number, grosime: number): number {
  if (!(z < 0)) return 235;
  if (-z >= grosime) return 0;
  return Math.round(235 - 175 * Math.min(1, -z / Math.max(1e-6, Math.min(adancimeMax, grosime))));
}

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
    await adauga(page, 'dreptunghi');
    await adauga(page, 'cerc');
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
    const r = JSON.parse(execFileSync(process.execPath, ['test/e2e/simulare-node.ts'], { input: doc, encoding: 'utf8' })) as SimulareNode;
    expect(r.ok, JSON.stringify(r)).toBe(true);
    if (!r.ok) return;
    await expect(s).toHaveAttribute('data-amprenta', r.amprenta);
    await expect(s).toHaveAttribute('data-volum', String(r.volum));
    // Ce vede omul (recenzia 19.10: o hartă întoarsă, alte tonuri sau un volum de 10 ori mai mare treceau): cifrele scrise
    // din valorile din Node, iar fiecare pixel al hărții după regula ei, din previzualizarea din Node.
    await expect(s.locator('[data-simulare="volum"]')).toHaveText(`Material scos: ${zecimale(1).format(r.volum / 1000)} cm³`);
    await expect(s.locator('[data-simulare="adancime"]')).toHaveText(`Cea mai adâncă tăietură: ${zecimale(2).format(r.adancimeMax)} mm`);
    const rosu = await s.locator('canvas').evaluate((c: HTMLCanvasElement) => {
      const d = c.getContext('2d')?.getImageData(0, 0, c.width, c.height).data ?? new Uint8ClampedArray();
      return { latime: c.width, inaltime: c.height, v: Array.from(d.filter((_, k) => k % 4 === 0)) };
    });
    const { latime: W, inaltime: H, z } = r.previzualizare;
    expect([rosu.latime, rosu.inaltime]).toEqual([W, H]);
    let diferite = 0;
    for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
      if (rosu.v[py * W + px] !== griAsteptat(z[(H - 1 - py) * W + px]!, r.adancimeMax, r.grosime)) diferite++;
    }
    expect(diferite, 'pixeli ai hărții care nu sunt cei din Node').toBe(0);
    await expect(s.locator('[data-simulare="amprenta"]')).toHaveText(`Amprenta ${r.amprenta}: aceeași în orice browser, pe oricâte fire.`);
    await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
  });
}

test('o tăietură prin foaie: harta are pixeli negri, iar simularea spune că trece prin foaie', async ({ page }) => {
  await page.goto('/');
  await adauga(page, 'cerc');
  await page.locator('[data-actiune="export.gcode"]').click();
  // Gaura până la fața de jos a foii implicite (18 mm).
  await page.locator('[data-operatie] input').nth(0).fill('18');
  const descarcare = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  await descarcare;
  const s = page.getByTestId('export-simulare');
  await expect(s.locator('[data-simulare="prin-foaie"]')).toHaveText('Scula ajunge la fața de jos a foii (18,0 mm): tăietura trece prin foaie.');
  await expect(s.locator('[data-simulare="adancime"]')).toHaveText('Cea mai adâncă tăietură: 18,00 mm');
  const negri = await s.locator('canvas').evaluate((c: HTMLCanvasElement) => {
    const d = c.getContext('2d')?.getImageData(0, 0, c.width, c.height).data ?? new Uint8ClampedArray();
    let n = 0;
    for (let k = 0; k < d.length; k += 4) if (d[k] === 0 && d[k + 1] === 0 && d[k + 2] === 0) n++;
    return n;
  });
  expect(negri).toBeGreaterThan(20);
});

test('descărcarea nu așteaptă simularea: fișierul vine, dialogul spune că simulează, apoi arată harta', async ({ page }) => {
  let elibereaza = (): void => {};
  const tinut = new Promise<void>((ok) => { elibereaza = ok; });
  // Workerul simulării vine abia când îl lăsăm: simularea durează cât vrem noi.
  await page.route(/lucratorSimulare-[^/]*\.js$/, async (r) => { await tinut; await r.continue(); });
  await page.goto('/');
  await adauga(page, 'cerc');
  await page.locator('[data-actiune="export.gcode"]').click();
  const descarcare = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  await descarcare;
  const s = page.getByTestId('export-simulare');
  await expect(s).toHaveAttribute('data-stare', 'calcul');
  await expect(s).toHaveAttribute('aria-busy', 'true');
  await expect(s).toHaveText('Se simulează programul… (G-code-ul e deja descărcat)');
  elibereaza();
  await expect(s.locator('[data-simulare="adancime"]')).toHaveText('Cea mai adâncă tăietură: 8,00 mm');
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});

test('un worker care nu vine: exportul rămâne, dialogul spune de ce lipsește simularea, eroarea intră în jurnal', async ({ page }) => {
  await page.route(/lucratorSimulare-[^/]*\.js$/, (r) => r.abort());
  await page.goto('/');
  await adauga(page, 'cerc');
  await page.locator('[data-actiune="export.gcode"]').click();
  const descarcare = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  await descarcare;
  await expect(page.getByTestId('export-simulare')).toHaveText(/^Simularea nu s-a putut face: /);
  await expect(page.getByTestId('jurnal')).toHaveText('1 eroare în jurnalul local');
});

test('dialogul închis în timpul simulării: fișierul e descărcat, workerele simulării se opresc (nicio eroare)', async ({ page }) => {
  let elibereaza = (): void => {};
  const tinut = new Promise<void>((ok) => { elibereaza = ok; });
  await page.route(/lucratorSimulare-[^/]*\.js$/, async (r) => { await tinut; await r.continue(); });
  // Numărătoarea workerelor, doar în probă: fiecare `new Worker` și fiecare `terminate()` din pagină.
  await page.addInitScript(() => {
    const g = window as unknown as { __workere: { pornite: number; oprite: number } };
    g.__workere = { pornite: 0, oprite: 0 };
    const W = window.Worker;
    window.Worker = class extends W {
      readonly simulare: boolean;
      constructor(u: string | URL, o?: WorkerOptions) {
        super(u, o);
        this.simulare = String(u).includes('lucratorSimulare-');
        if (this.simulare) g.__workere.pornite++;
      }
      override terminate(): void {
        if (this.simulare) g.__workere.oprite++;
        super.terminate();
      }
    };
  });
  const workere = (): Promise<{ pornite: number; oprite: number }> =>
    page.evaluate(() => (window as unknown as { __workere: { pornite: number; oprite: number } }).__workere);
  await page.goto('/');
  await adauga(page, 'cerc');
  await page.locator('[data-actiune="export.gcode"]').click();
  const descarcare = page.waitForEvent('download');
  await page.locator('[data-buton="exporta"]').click();
  await descarcare;
  const inainte = await workere();
  expect(inainte.pornite).toBeGreaterThan(0);
  expect(inainte.oprite).toBe(0);
  await page.getByRole('button', { name: 'Închide' }).click();
  // Workerele se opresc la închidere, nu când ar termina (scriptul lor e încă ținut): simularea e anulată.
  await expect.poll(async () => (await workere()).oprite, { timeout: 5_000 }).toBe(inainte.pornite);
  elibereaza();
  await page.locator('[data-actiune="export.gcode"]').click();
  await expect(page.getByTestId('export-simulare')).toHaveCount(0);
  await expect(page.getByTestId('jurnal')).toHaveText('0 erori în jurnalul local');
});
