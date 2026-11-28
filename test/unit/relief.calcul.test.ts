/**
 * Calculul workerului reliefului (ADR 0310 §3, felia 18.1↑a), prin bazin (în Node, în proces, prin aceeași graniță
 * `structuredClone`): relieful din pixeli (grila, celula din lățime, stratul ca al nucleului, Z-ul, desenul din dalele
 * cuantizate), refuzurile (prea mare, celula, golul) și desenul unui relief din dalele lui (compusul straturilor vizibile,
 * dalele lipsă numite).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reliefInBazin } from '../../src/jobs/bazinRelief.ts';
import { celulaDinScara, type DesenRelief, type PixeliRelief, type RaspunsRelief, type ReliefDinImagine } from '../../src/jobs/calculRelief.ts';
import { reliefDinPixeli, type OptiuniImagine } from '../../src/relief/imagine.ts';
import { stratDinGrila } from '../../src/relief/strat.ts';

const O: OptiuniImagine = { sursa: 'l', sigma: 0, inaltime: 10, baza: 0, albSus: true };
const pixeli = (latime: number, inaltime: number, f: (x: number, y: number) => [number, number, number, number]): PixeliRelief => {
  const rgba = new Uint8ClampedArray(latime * inaltime * 4);
  for (let y = 0; y < inaltime; y++) for (let x = 0; x < latime; x++) rgba.set(f(x, y), 4 * (y * latime + x));
  return { latime, inaltime, rgba };
};
function ok(r: RaspunsRelief, tip: 'din-imagine'): ReliefDinImagine;
function ok(r: RaspunsRelief, tip: 'desen'): DesenRelief;
function ok(r: RaspunsRelief, tip: 'din-imagine' | 'desen'): ReliefDinImagine | DesenRelief {
  if (!r.ok) assert.fail(JSON.stringify(r));
  assert.equal(r.tip, tip);
  return r;
}

test('relieful din pixeli: grila, celula din lățime, stratul ca al nucleului, Z-ul și desenul', async () => {
  const px = pixeli(3, 2, (x, y) => [x * 100, x * 100, x * 100, 255 - y]);
  const r = ok(await reliefInBazin({ tip: 'din-imagine', imagine: px, optiuni: O, scara: { latimeMm: 6 } }), 'din-imagine');
  assert.equal(r.nx, 3);
  assert.equal(r.ny, 2);
  assert.equal(r.celula, 2);
  const st = await stratDinGrila(reliefDinPixeli(px.rgba, 3, 2, O), 3, 2);
  assert.equal(r.harta, st.text);
  assert.equal(r.amprenta, st.amprenta);
  assert.deepEqual(Object.keys(r.octeti).sort(), [...st.octeti.keys()].sort());
  for (const [h, o] of st.octeti) assert.deepEqual([...(r.octeti[h] ?? [])], [...o]);
  assert.equal(r.z?.min, 0);
  assert.ok(Math.abs((r.z?.max ?? 0) - 200 / 255 * 10) < 1e-3);
  assert.equal(r.umbrit.latime, 3);
  assert.equal(r.umbrit.inaltime, 2);
  assert.equal(r.umbrit.rgba.length, 3 * 2 * 4);
});

test('relieful din pixeli: pixelii transparenți sunt planul zero în desen (compusul pornește de la 0)', async () => {
  const px = pixeli(2, 1, (x) => (x === 0 ? [255, 255, 255, 0] : [255, 255, 255, 255]));
  const r = ok(await reliefInBazin({ tip: 'din-imagine', imagine: px, optiuni: { ...O, baza: 1 }, scara: { latimeMm: 2 } }), 'din-imagine');
  assert.deepEqual(r.z, { min: 0, max: 11 });
  assert.equal(r.umbrit.rgba[3], 255, 'golul stratului e desenat (planul zero), nu transparent');
});

test('relieful din pixeli: refuzurile (prea mare, celula, totul transparent)', async () => {
  const lat = pixeli(8193, 1, () => [0, 0, 0, 255]);
  // Pe câmpuri, nu pe tot rezultatul: un relief primit greșit ar face un diff cu toate dalele lui.
  const mare = await reliefInBazin({ tip: 'din-imagine', imagine: lat, optiuni: O, scara: { latimeMm: 100 } });
  assert.equal(mare.ok, false);
  assert.deepEqual(mare.ok ? null : [mare.cod, mare.detaliu], ['prea-mare', '8193 × 1']);
  const px = pixeli(4, 4, () => [0, 0, 0, 255]);
  assert.equal((await reliefInBazin({ tip: 'din-imagine', imagine: px, optiuni: O, scara: { latimeMm: 0.002 } }) as { cod?: string }).cod, 'celula');
  assert.equal((await reliefInBazin({ tip: 'din-imagine', imagine: px, optiuni: O, scara: { latimeMm: 401 } }) as { cod?: string }).cod, 'celula');
  const gol = pixeli(2, 2, () => [0, 0, 0, 0]);
  assert.deepEqual(await reliefInBazin({ tip: 'din-imagine', imagine: gol, optiuni: O, scara: { latimeMm: 2 } }), { ok: false, cod: 'gol' });
});

test('scara din DPI: celula = 25,4 / dpi, cât lățimea nu e scrisă', async () => {
  const px = pixeli(254, 1, () => [0, 0, 0, 255]);
  const r = ok(await reliefInBazin({ tip: 'din-imagine', imagine: px, optiuni: O, scara: { dpi: 254 } }), 'din-imagine');
  assert.equal(r.celula, 25.4 / 254);
});

test('celula din scară: marginile grilei (0,001 … 100 mm, latura cel mult 10 m)', () => {
  assert.equal(celulaDinScara({ latimeMm: 10 }, 100, 50), 0.1);
  assert.equal(celulaDinScara({ latimeMm: 0.05 }, 100, 1), 'celula');
  assert.equal(celulaDinScara({ latimeMm: 10_001 }, 1, 1), 'celula');
  assert.equal(celulaDinScara({ latimeMm: 1000 }, 10, 101), 'celula');
  assert.equal(celulaDinScara({ latimeMm: Number.NaN }, 10, 10), 'celula');
  assert.equal(celulaDinScara({ dpi: 96 }, 1000, 1000), 25.4 / 96);
  assert.equal(celulaDinScara({ dpi: 0 }, 10, 10), 'celula');
});

test('relieful din pixeli: o imagine peste 2048 se desenează redusă (media pe blocuri), stratul rămâne întreg', async () => {
  const px = pixeli(2049, 1, (x) => [x % 256, x % 256, x % 256, 255]);
  const r = ok(await reliefInBazin({ tip: 'din-imagine', imagine: px, optiuni: O, scara: { latimeMm: 204.9 } }), 'din-imagine');
  assert.equal(r.nx, 2049);
  assert.equal(r.umbrit.latime, 1025);
  assert.equal(r.umbrit.inaltime, 1);
});

test('desenul unui relief din dalele lui: compusul straturilor vizibile; dalele lipsă și harta altei grile, refuzate', async () => {
  const a = await stratDinGrila(Float32Array.from([1, 2, 3, 4]), 2, 2);
  const b = await stratDinGrila(Float32Array.from([10, Number.NaN, 10, 10]), 2, 2);
  const oct = (s: typeof a): Record<string, Uint8Array<ArrayBuffer>> => Object.fromEntries(s.octeti);
  const straturi = [
    { mod: 'aduna' as const, vizibil: true, harta: a.text, octeti: oct(a) },
    { mod: 'inalt' as const, vizibil: true, harta: b.text, octeti: oct(b) },
  ];
  // Valorile citite din dale, cu eroarea cuantizării: (4 − 1) / 131 068 pe dala lui a (ADR 0311 §5).
  const aproape = (x: number | undefined, v: number): void => { assert.ok(x !== undefined && Math.abs(x - v) <= 3 / 131_068, `${x} ≠ ${v}`); };
  const d = ok(await reliefInBazin({ tip: 'desen', nx: 2, ny: 2, celula: 1, straturi }), 'desen');
  aproape(d.z?.min, 2);
  assert.equal(d.z?.max, 10);
  assert.equal(d.k, 1);
  // Al doilea, ascuns: doar primul.
  const ascuns = ok(await reliefInBazin({ tip: 'desen', nx: 2, ny: 2, celula: 1, straturi: [straturi[0]!, { ...straturi[1]!, vizibil: false }] }), 'desen');
  aproape(ascuns.z?.min, 1);
  aproape(ascuns.z?.max, 4);
  // Niciun strat vizibil: planul zero.
  const niciunul = ok(await reliefInBazin({ tip: 'desen', nx: 2, ny: 2, celula: 1, straturi: [] }), 'desen');
  assert.deepEqual(niciunul.z, { min: 0, max: 0 });
  const lipsa = await reliefInBazin({ tip: 'desen', nx: 2, ny: 2, celula: 1, straturi: [{ ...straturi[0]!, octeti: {} }] });
  assert.equal(lipsa.ok, false);
  assert.equal((lipsa as { cod: string }).cod, 'dale-lipsa');
  const alta = await reliefInBazin({ tip: 'desen', nx: 3, ny: 2, celula: 1, straturi });
  assert.deepEqual(alta, { ok: false, cod: 'harta' });
});

test('bazinul: o cerere anulată înainte de pornire e respinsă', async () => {
  const ac = new AbortController();
  ac.abort();
  await assert.rejects(reliefInBazin({ tip: 'desen', nx: 1, ny: 1, celula: 1, straturi: [] }, { semnal: ac.signal }), { name: 'ReliefAnulat' });
});

// Stratul nou pe un relief (ADR 0320, felia 18.1↑j): cu `pe`, imaginea (la scara ei) se așază centrat pe grila reliefului
// ales; stratul are grila lui, golurile în afara imaginii, iar ce iese din relief se taie.
test('stratul pe grila unui relief: grila țintei, imaginea centrată (așezarea nucleului), golul în afară', async () => {
  const px = pixeli(2, 2, () => [255, 255, 255, 255]);
  const pe = { nx: 4, ny: 4, celula: 1 };
  const r = ok(await reliefInBazin({ tip: 'din-imagine', imagine: px, optiuni: O, scara: { latimeMm: 2 }, pe }), 'din-imagine');
  assert.deepEqual([r.nx, r.ny, r.celula], [4, 4, 1]);
  const { asezaPeGrila } = await import('../../src/relief/asezare.ts');
  const st = await stratDinGrila(asezaPeGrila(reliefDinPixeli(px.rgba, 2, 2, O), 2, 2, 1, pe), 4, 4);
  assert.equal(r.harta, st.text);
  assert.equal(r.amprenta, st.amprenta);
  assert.deepEqual(r.z, { min: 0, max: 10 });
  assert.equal(r.umbrit.latime, 4);
});

test('stratul pe grila unui relief: o imagine care nu atinge nicio celulă e golul', async () => {
  const px = pixeli(1, 1, () => [255, 255, 255, 255]);
  // Un pixel de 0,1 mm, centrat pe 2 × 2 celule de 1 mm: stă în [0,95, 1,05], între centrele 0,5 și 1,5, deci nu ia nimic.
  const r = await reliefInBazin({ tip: 'din-imagine', imagine: px, optiuni: O, scara: { latimeMm: 0.1 }, pe: { nx: 2, ny: 2, celula: 1 } });
  assert.deepEqual(r, { ok: false, cod: 'gol' });
});

// Litofania (ADR 0321, felia 18.1↑f): harta grosimilor, cu rama în mm (rotunjită la celule) și fața; previzualizarea arată
// lumina din spate, nu relieful umbrit.
test('litofania din pixeli: grosimile, rama în jur, din spate oglindită, lumina din spate în previzualizare', async () => {
  const px = pixeli(2, 1, (x) => (x === 0 ? [255, 255, 255, 255] : [0, 0, 0, 255]));
  const litofanie = { tmin: 0.8, tmax: 3, ramaMm: 1, spate: true };
  const r = ok(await reliefInBazin({ tip: 'din-imagine', imagine: px, optiuni: O, scara: { latimeMm: 2 }, litofanie }), 'din-imagine');
  // Un pixel de 1 mm, rama de 1 mm = o celulă în jur: 4 × 3.
  assert.deepEqual([r.nx, r.ny, r.celula], [4, 3, 1]);
  const { litofanieDinGri } = await import('../../src/relief/litofanie.ts');
  const { gri } = await import('../../src/relief/imagine.ts');
  const lit = litofanieDinGri(gri(px.rgba, 2, 1, 'l'), 2, 1, { tmin: 0.8, tmax: 3, rama: 1, spate: true });
  const st = await stratDinGrila(lit.valori, 4, 3);
  assert.equal(r.amprenta, st.amprenta);
  assert.ok(Math.abs((r.z?.min ?? 0) - 0.8) < 1e-3 && Math.abs((r.z?.max ?? 0) - 3) < 1e-3, JSON.stringify(r.z));
  // Lumina din spate: rama și negrul întunecate, albul (oglindit: a treia celulă a rândului din mijloc) luminos.
  const g = (i: number, j: number): number => r.umbrit.rgba[4 * (j * 4 + i)] ?? -1;
  assert.deepEqual([g(0, 1), g(1, 1), g(2, 1), g(3, 1)], [0, 0, 255, 0]);
});

test('litofania: grosimile pe dos sau negative sunt refuzate', async () => {
  const px = pixeli(1, 1, () => [255, 255, 255, 255]);
  for (const [tmin, tmax] of [[3, 0.8], [-1, 2], [1, 1]] as const) {
    const r = await reliefInBazin({ tip: 'din-imagine', imagine: px, optiuni: O, scara: { latimeMm: 1 }, litofanie: { tmin, tmax, ramaMm: 0, spate: false } });
    assert.deepEqual(r, { ok: false, cod: 'grosimi' }, `${tmin} … ${tmax}`);
  }
});

test('litofania: rama în mm, rotunjită la celule de alt pixel decât 1 mm (1 mm la un pixel de 0,5 mm = 2 celule)', async () => {
  const px = pixeli(2, 1, () => [255, 255, 255, 255]);
  const r = ok(await reliefInBazin({ tip: 'din-imagine', imagine: px, optiuni: O, scara: { latimeMm: 1 }, litofanie: { tmin: 0.8, tmax: 3, ramaMm: 1, spate: false } }), 'din-imagine');
  assert.deepEqual([r.nx, r.ny, r.celula], [6, 5, 0.5]);
});
