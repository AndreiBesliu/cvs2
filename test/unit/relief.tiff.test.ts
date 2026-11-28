/**
 * TIFF-ul ca relief (ADR 0322 §5.1, felia 18.1↑g-2): browserul nu decodează TIFF, deci workerul reliefului îl citește cu
 * cititorul trasării (ADR 0229), dar cu eșantioanele întregi: pe 16 biți, griul e v / 65 535, nu redus la 8 biți (v / 257,
 * rotunjit) ca la trasare. Fișierele sunt scrise de scriitorul probelor (`ajutor-tiff.ts`): II și MM, necomprimat și Deflate
 * (al lui Node) cu predictorul, gri, alb-e-zero, RGB, alfa asociat și neasociat, orientarea, paginile cu miniatură, 1 și 8
 * biți; înălțimile așteptate sunt socotite aici, pe hârtie, din eșantioanele scrise. Refuzurile: ce nu citește cititorul (cu
 * numele), un fișier stricat, o imagine peste 8192 de pixeli pe o latură (spusă din antet, fără decodare).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';
import { reliefInBazin } from '../../src/jobs/bazinRelief.ts';
import type { RaspunsRelief, ReliefDinImagine } from '../../src/jobs/calculRelief.ts';
import type { OptiuniImagine } from '../../src/relief/imagine.ts';
import { hartaDinText } from '../../src/relief/harta.ts';
import { daleDinHarta, grilaDinDale } from '../../src/relief/strat.ts';
import { decodeazaTiffExact, marimeTiff } from '../../src/trasare/tiff.ts';
import { scrieTiff, type Eticheta } from './ajutor-tiff.ts';

const O: OptiuniImagine = { sursa: 'l', sigma: 0, inaltime: 10, baza: 0, albSus: true };
/** Cuantizarea dalelor (ADR 0311): pe 10 mm, pasul e ~1,5e-4; o imagine redusă la 8 biți ar greși cu ~2e-2 la mijloc. */
const TOL = 1e-3;

function ok(r: RaspunsRelief): ReliefDinImagine {
  if (!r.ok || r.tip !== 'din-imagine') assert.fail(JSON.stringify(r));
  return r;
}
/** Înălțimile reliefului citite din dalele lui, pe rândurile reliefului (rândul 0 e jos). */
function inaltimi(r: ReliefDinImagine): Float32Array {
  const d = daleDinHarta(hartaDinText(r.harta)!, (a) => r.octeti[a]);
  if (!d.ok) assert.fail('dale lipsă');
  return grilaDinDale(r.nx, r.ny, d.dale);
}
const relief = async (tiff: Uint8Array, o: OptiuniImagine = O): Promise<RaspunsRelief> =>
  reliefInBazin({ tip: 'din-imagine', imagine: new Blob([tiff.slice()]), optiuni: o, scara: { latimeMm: 10 } });

/** Eșantioanele pe 16 biți, în ordinea fișierului (II: octetul mic întâi). */
const pe16 = (v: readonly number[], le: boolean): Uint8Array => {
  const b = new Uint8Array(2 * v.length);
  v.forEach((x, k) => { b[2 * k + (le ? 0 : 1)] = x & 255; b[2 * k + (le ? 1 : 0)] = x >>> 8; });
  return b;
};
/** Un TIFF gri cu o singură bandă necomprimată. */
const gri = (w: number, h: number, biti: number, banda: Uint8Array, alte: readonly Eticheta[] = [], le = true): Uint8Array =>
  scrieTiff([{ etichete: [[256, 4, [w]], [257, 4, [h]], [258, 3, [biti]], [259, 3, [1]], [262, 3, [1]], [278, 4, [h]], ...alte], bucati: [banda] }], le);

/** Rândul reliefului j (0 jos), ca listă. */
const rand = (z: Float32Array, nx: number, j: number): number[] => Array.from(z.subarray(j * nx, (j + 1) * nx));
const aproape = (a: readonly number[], b: readonly number[], ce: string): void => {
  assert.equal(a.length, b.length, ce);
  a.forEach((x, k) => { assert.ok(Math.abs(x - (b[k] ?? NaN)) < TOL, `${ce}: [${k}] ${x} față de ${b[k]}`); });
};

test('gri pe 16 biți (II, necomprimat): înălțimile din griul de 16 biți (v / 65 535), nu din cel de 8', async () => {
  const v = [0, 32768, 65535, 1000];
  const r = ok(await relief(gri(4, 1, 16, pe16(v, true))));
  assert.deepEqual([r.nx, r.ny, r.celula], [4, 1, 2.5]);
  assert.equal(r.fisier?.adancime, 16);
  // Fără Z în fișier: fereastra nu oferă „Z-ul din fișier”, înălțimea și baza sunt ale ei.
  assert.equal(r.fisier?.celula, undefined);
  aproape(rand(inaltimi(r), 4, 0), v.map((x) => (x / 65535) * 10), 'rândul');
  // Martorul: pe 8 biți, mijlocul ar fi 128 / 255 · 10 = 5,0196, departe de 32768 / 65535 · 10 = 5,00008.
  assert.ok(Math.abs((inaltimi(r)[1] ?? 0) - (128 / 255) * 10) > 10 * TOL);
});

test('MM, Deflate cu predictorul pe 16 biți, două rânduri: rândul de sus al imaginii e rândul de sus al reliefului', async () => {
  // Sus: 100, 40000; jos: 65535, 7. Predictorul: fiecare eșantion minus cel din stânga, modulo 65 536.
  const sus = [100, 40000], jos = [65535, 7];
  const dif = [100, 40000 - 100, 65535, (7 - 65535 + 65536) % 65536];
  const banda = deflateSync(pe16(dif, false));
  const tiff = scrieTiff([{
    etichete: [[256, 4, [2]], [257, 4, [2]], [258, 3, [16]], [259, 3, [8]], [262, 3, [1]], [278, 4, [2]], [317, 3, [2]]],
    bucati: [banda],
  }], false);
  const r = ok(await relief(tiff));
  assert.deepEqual([r.nx, r.ny], [2, 2]);
  const z = inaltimi(r);
  aproape(rand(z, 2, 1), sus.map((x) => (x / 65535) * 10), 'sus');
  aproape(rand(z, 2, 0), jos.map((x) => (x / 65535) * 10), 'jos');
});

test('alb-e-zero și RGB pe 16 biți: sursa luminanță și un canal, cu sensul ferestrei', async () => {
  const az = ok(await relief(gri(3, 1, 16, pe16([0, 20000, 65535], true), [[262, 3, [0]]])));
  aproape(rand(inaltimi(az), 3, 0), [65535, 45535, 0].map((x) => (x / 65535) * 10), 'alb-e-zero');
  // RGB: (R, G, B) pe pixel; roșul, apoi luminanța 0,2126 R + 0,7152 G + 0,0722 B.
  const px = [[30000, 0, 0], [0, 50000, 1000], [65535, 65535, 65535]];
  const rgb = scrieTiff([{
    etichete: [[256, 4, [3]], [257, 4, [1]], [258, 3, [16, 16, 16]], [259, 3, [1]], [262, 3, [2]], [277, 3, [3]], [278, 4, [1]]],
    bucati: [pe16(px.flat(), true)],
  }]);
  aproape(rand(inaltimi(ok(await relief(rgb, { ...O, sursa: 'r' }))), 3, 0), px.map(([a]) => ((a ?? 0) / 65535) * 10), 'roșul');
  const lum = px.map(([a = 0, b = 0, c = 0]) => ((0.2126 * a + 0.7152 * b + 0.0722 * c) / 65535) * 10);
  aproape(rand(inaltimi(ok(await relief(rgb))), 3, 0), lum, 'luminanța');
  // Negrul sus (albSus oprit): 10 − înălțimea.
  aproape(rand(inaltimi(ok(await relief(rgb, { ...O, sursa: 'r', albSus: false }))), 3, 0), px.map(([a = 0]) => 10 - (a / 65535) * 10), 'negrul sus');
});

test('alfa pe 16 biți: neasociat, un pixel transparent e gol; asociat, culoarea împărțită la alfa, pe 16 biți', async () => {
  const ga = (fel: number, v: readonly number[]): Uint8Array => scrieTiff([{
    etichete: [[256, 4, [v.length / 2]], [257, 4, [1]], [258, 3, [16, 16]], [259, 3, [1]], [262, 3, [1]], [277, 3, [2]], [278, 4, [1]], [338, 3, [fel]]],
    bucati: [pe16(v, true)],
  }]);
  // Neasociat: (50000, opac), (12345, alfa 0: gol), (20000, alfa sub jumătate: gol), (30000, alfa peste jumătate).
  const n = inaltimi(ok(await relief(ga(2, [50000, 65535, 12345, 0, 20000, 30000, 30000, 40000]))));
  assert.ok(Math.abs((n[0] ?? 0) - (50000 / 65535) * 10) < TOL);
  assert.ok(Number.isNaN(n[1]) && Number.isNaN(n[2]), `golurile: ${n[1]}, ${n[2]}`);
  assert.ok(Math.abs((n[3] ?? 0) - (30000 / 65535) * 10) < TOL);
  // Asociat: 20000 la alfa 40000 e griul 20000 / 40000 = 0,5 (pe 8 biți: 78 · 255 / 156, rotunjit, 128 / 255).
  const a = inaltimi(ok(await relief(ga(1, [20000, 40000, 65535, 65535]))));
  assert.ok(Math.abs((a[0] ?? 0) - 5) < TOL, String(a[0]));
  assert.ok(Math.abs((a[1] ?? 0) - 10) < TOL, String(a[1]));
});

test('pe 8 și pe 1 bit: un TIFF obișnuit e și el relief (ieri, browserul nu-l putea decoda); orientarea se aplică', async () => {
  const r8 = ok(await relief(gri(3, 1, 8, Uint8Array.of(0, 128, 255))));
  assert.equal(r8.fisier, undefined);
  aproape(rand(inaltimi(r8), 3, 0), [0, (128 / 255) * 10, 10], '8 biți');
  // 1 bit, alb-e-zero (ca un fax): 1 e negru. Octetul 0b0100_0000: al doilea pixel negru, ceilalți albi.
  const r1 = ok(await relief(gri(4, 1, 1, Uint8Array.of(0b0100_0000), [[262, 3, [0]]])));
  aproape(rand(inaltimi(r1), 4, 0), [10, 0, 10, 10], '1 bit');
  // Orientarea 6 pe 3 × 2 (10 20 30 / 40 50 60): imaginea devine 2 × 3, rândurile de sus 40 10 / 50 20 / 60 30.
  const o6 = ok(await relief(gri(3, 2, 8, Uint8Array.of(10, 20, 30, 40, 50, 60), [[274, 3, [6]]])));
  assert.deepEqual([o6.nx, o6.ny], [2, 3]);
  const z = inaltimi(o6), f = (x: number): number => (x / 255) * 10;
  aproape(rand(z, 2, 2), [40, 10].map(f), 'sus');
  aproape(rand(z, 2, 1), [50, 20].map(f), 'mijloc');
  aproape(rand(z, 2, 0), [60, 30].map(f), 'jos');
});

test('paginile: se citește prima pagină adevărată (miniatura, cu NewSubfileType 1, nu e pagină)', async () => {
  const pagina = (v: number, mini: boolean): Parameters<typeof scrieTiff>[0][number] => ({
    etichete: [[254, 4, [mini ? 1 : 0]], [256, 4, [2]], [257, 4, [1]], [258, 3, [16]], [259, 3, [1]], [262, 3, [1]], [278, 4, [1]]],
    bucati: [pe16([v, v], true)],
  });
  const r = ok(await relief(scrieTiff([pagina(65535, true), pagina(16384, false), pagina(49152, false)])));
  aproape(rand(inaltimi(r), 2, 0), [16384, 16384].map((x) => (x / 65535) * 10), 'prima pagină');
});

test('refuzurile: ce nu citește cititorul, cu numele; un TIFF stricat; peste 8192 pe o latură, din antet', async () => {
  const cuJpeg = scrieTiff([{ etichete: [[256, 4, [2]], [257, 4, [1]], [258, 3, [8]], [259, 3, [7]], [262, 3, [1]], [278, 4, [1]]], bucati: [Uint8Array.of(1, 2)] }]);
  const j = await relief(cuJpeg);
  assert.ok(!j.ok && j.cod === 'tiff' && /JPEG/.test(j.detaliu ?? ''), JSON.stringify(j));
  const plutitor = scrieTiff([{ etichete: [[256, 4, [1]], [257, 4, [1]], [258, 3, [32]], [259, 3, [1]], [262, 3, [1]], [278, 4, [1]], [339, 3, [3]]], bucati: [new Uint8Array(4)] }]);
  const p = await relief(plutitor);
  assert.ok(!p.ok && p.cod === 'tiff', JSON.stringify(p));
  // Stricat: banda spune 4 octeți la un offset de la capătul fișierului.
  const bun = gri(2, 1, 16, pe16([1, 2], true));
  const s = await relief(bun.subarray(0, bun.length - 30));
  assert.ok(!s.ok && s.cod === 'tiff-stricat', JSON.stringify(s));
  // Prea mare: 9000 × 2, cu banda de 2 octeți (nu se decodează nimic: antetul ajunge).
  const mare = scrieTiff([{ etichete: [[256, 4, [9000]], [257, 4, [2]], [258, 3, [8]], [259, 3, [1]], [262, 3, [1]], [278, 4, [2]]], bucati: [Uint8Array.of(0, 0)] }]);
  const m = await relief(mare);
  assert.ok(!m.ok && m.cod === 'prea-mare' && m.detaliu === '9000 × 2', JSON.stringify(m));
  // 9000 × 9000 (81 Mpx, peste ce ar decoda cititorul): tot „prea mare”, spus din antet, nu refuzul cititorului.
  const urias = scrieTiff([{ etichete: [[256, 4, [9000]], [257, 4, [9000]], [258, 3, [8]], [259, 3, [1]], [262, 3, [1]], [278, 4, [9000]]], bucati: [Uint8Array.of(0, 0)] }]);
  const u = await relief(urias);
  assert.ok(!u.ok && u.cod === 'prea-mare' && u.detaliu === '9000 × 9000', JSON.stringify(u));
  // Orientarea 6 schimbă laturile din antet: 2 × 9000 rotit e tot peste plafon, spus după orientare.
  const rotit = scrieTiff([{ etichete: [[256, 4, [2]], [257, 4, [9000]], [258, 3, [8]], [259, 3, [1]], [262, 3, [1]], [274, 3, [6]], [278, 4, [9000]]], bucati: [Uint8Array.of(0, 0)] }]);
  const mr = await relief(rotit);
  assert.ok(!mr.ok && mr.cod === 'prea-mare' && mr.detaliu === '9000 × 2', JSON.stringify(mr));
});

test('cititorul exact: eșantioanele la 0 … 255 fără rotunjire (16 biți, paleta pe 16 biți, CMYK), mărimea din antet', async () => {
  const r = await decodeazaTiffExact(gri(3, 1, 16, pe16([1, 257, 65534], true)));
  if (!r.ok) assert.fail(r.detaliu);
  assert.deepEqual([r.latime, r.inaltime, r.biti], [3, 1, 16]);
  assert.deepEqual(Array.from(r.rgba), [1, 257, 65534].flatMap((v) => { const g = (v * 255) / 65535; return [g, g, g, 255]; }));
  // Paleta pe 2 biți: ColorMap pe 16 biți, roșii, verzii, albaștrii; indicele 2 → (40000, 12, 65535) · 255 / 65535.
  const harta = [0, 0, 40000, 0, 0, 0, 12, 0, 0, 0, 65535, 0];
  const pal = scrieTiff([{ etichete: [[256, 4, [2]], [257, 4, [1]], [258, 3, [2]], [259, 3, [1]], [262, 3, [3]], [278, 4, [1]], [320, 3, harta]], bucati: [Uint8Array.of(0b1000_0000)] }]);
  const rp = await decodeazaTiffExact(pal);
  if (!rp.ok) assert.fail(rp.detaliu);
  assert.deepEqual(Array.from(rp.rgba.subarray(0, 4)), [(40000 * 255) / 65535, (12 * 255) / 65535, 255, 255]);
  // CMYK pe 8 biți: R = (255 − C) (255 − K) / 255, fără rotunjire.
  const cmyk = scrieTiff([{ etichete: [[256, 4, [1]], [257, 4, [1]], [258, 3, [8, 8, 8, 8]], [259, 3, [1]], [262, 3, [5]], [277, 3, [4]], [278, 4, [1]]], bucati: [Uint8Array.of(128, 0, 0, 128)] }]);
  const rc = await decodeazaTiffExact(cmyk);
  if (!rc.ok) assert.fail(rc.detaliu);
  assert.deepEqual(Array.from(rc.rgba), [(127 * 127) / 255, 127, 127, 255]);
  // Mărimea din antet, după orientare, fără decodare; null pe ce nu e TIFF.
  assert.deepEqual(marimeTiff(gri(3, 2, 8, new Uint8Array(6), [[274, 3, [5]]])), { latime: 2, inaltime: 3 });
  assert.equal(marimeTiff(Uint8Array.of(1, 2, 3, 4, 5, 6, 7, 8, 9)), null);
});
