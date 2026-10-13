/**
 * Ușa SVG la plafoane (ADR 0035 §1, §7, §8), aplicația față de oracol, cu valorile pe hârtie:
 * - octeții: 16 MiB + 1 → `octeti`; exact 16 MiB trece de plafon; `.svgz` adevărat (gzip) → `svgz`;
 * - plafonul de lucru: peste 1 000 000 de vârfuri produse (și ale căilor sărite) → `plafon`; căile primite cu peste
 *   200 000 de vârfuri → `plafon`; 180 000 trec;
 * - `prea-mari` (precizarea 12.10): o subcale închisă și una deschisă de 60 000 de vârfuri (numărate o dată, nu și
 *   `deschise`), un arc „cât un continent” (cubicele numărate înainte: nu se fac, nici nu se numără);
 * - piesa cu 10 001 căi: operațiile `exterior` (10 000 de noduri) și `exterior-2` (1), trece de ușa documentului;
 * - revizia 12.10: plafonul căii judecat după linia de închidere (50 000 trec, 50 001 nu); bugetul includerilor
 *   (2·10⁷) al laturilor: 4 000 de „săgeți” îl depășesc (null), 1 000 nu; laturile a 4 000 de dreptunghiuri imbricate
 *   (forme separate) cu bugetul: null;
 * - sub-felia 2.3c-1 (ADR 0037 §11): plafonul căii judecat și pe linia de închidere adăugată de ușă (umplerea, golul sub
 *   rezoluție);
 * - felia 2.7d (ADR 0036): euristica perechilor nonzero (care consuma bugetul includerilor la citire) a dispărut; o formă
 *   nonzero cu 1 000 / 4 000 de săgeți suprapuse (sute de mii de încrucișări) trece prin normalizare: ori o face (judecată
 *   de oracolul normalizării), ori o refuză cu bugetul ei (§8) și forma se citește evenodd, numărată; ușa nu se blochează.
 *   Sondele nonzero ale oracolului au aici densitatea 0,01 (formele au zeci de mii de laturi).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { citesteSvg, PLAFON_IMPORT } from '../../src/io/svg.ts';
import { laturiDinImbricare } from '../../src/io/imbricare.ts';
import { piesaDinImport } from '../../src/io/piesa.ts';
import { incarca } from '../../src/model/incarcare.ts';
import { CONST_O, citesteSvgO, coltExact, judecaPiesa, judecaRezultat, laturiBugetO, laturiO, parserTest, type RezultatO, type VarfO } from '../oracles/svg.ts';
import { judecaHartia, judecaHartiaFinala, mm, type Hartie } from '../oracles/svg.cazuri.ts';

const enc = (t: string): Uint8Array => new TextEncoder().encode(t);
const DENS = 0.01;
const ambele = (b: Uint8Array): { a: unknown; o: RezultatO } => ({ a: citesteSvg(b, { parser: parserTest() }), o: citesteSvgO(b, { densitateNonzero: DENS }) });
function judeca(b: Uint8Array, h: Hartie): { a: unknown; o: RezultatO } {
  const r = ambele(b);
  assert.deepEqual(judecaHartia(r.o, h), [], 'oracolul față de hârtie');
  assert.deepEqual(judecaRezultat(r.a, r.o, { N: 4, densitateNonzero: DENS }), [], 'aplicația față de oracol');
  assert.deepEqual(judecaHartiaFinala(r.a, r.o, h), [], 'aplicația față de hârtie, după normalizare');
  return r;
}
/** Un poligon regulat cu n vârfuri, în sensul SVG crescător. */
const poligon = (cx: number, cy: number, r: number, n: number): string =>
  `<polygon points="${Array.from({ length: n }, (_, i) => `${(cx + r * Math.cos((2 * Math.PI * i) / n)).toFixed(5)},${(cy + r * Math.sin((2 * Math.PI * i) / n)).toFixed(5)}`).join(' ')}"/>`;
const zigzag = (n: number, y: number): string => `<polyline points="${Array.from({ length: n }, (_, i) => `${i % 2} ${y}`).join(' ')}"/>`;

test('octeții: 16 MiB + 1 refuzat înainte de citire; exact 16 MiB trece de plafon', () => {
  const baza = enc(mm(100, 100, '<rect width="5" height="5"/>'));
  const peste = new Uint8Array(CONST_O.octeti + 1).fill(0x20);
  peste.set(baza, 0);
  judeca(peste, { cod: 'octeti' });
  const exact = peste.subarray(0, CONST_O.octeti);
  judeca(exact, { cai: 1 });
});

test('.svgz adevărat (gzip): refuzat', () => {
  judeca(new Uint8Array(gzipSync(enc(mm(100, 100, '<rect width="5" height="5"/>')))), { cod: 'svgz' });
});

test('plafonul căilor primite: 5 × 45 000 = 225 000 > 200 000 → plafon; 4 × 45 000 = 180 000 trec', () => {
  const p = [poligon(25, 25, 20, 45_000), poligon(75, 25, 20, 45_000), poligon(25, 75, 20, 45_000), poligon(75, 75, 20, 45_000)];
  judeca(enc(mm(100, 100, [...p, poligon(50, 50, 4, 45_000)].join(''))), { cod: 'plafon' });
  const { a, o } = judeca(enc(mm(100, 100, p.join(''))), { cai: 4, tipuri: ['L'.repeat(45_000), 'L'.repeat(45_000), 'L'.repeat(45_000), 'L'.repeat(45_000)], laturi: ['exterior', 'exterior', 'exterior', 'exterior'] });
  assert.ok(o.ok);
  assert.deepEqual(laturiDinImbricare((a as { cai: Array<{ varfuri: VarfO[] }> }).cai), laturiO(o.cai));
});

test('plafonul de lucru: 21 de polilinii deschise × 49 000 de puncte (1 028 979 de vârfuri produse) → plafon', () => {
  judeca(enc(mm(100, 100, Array.from({ length: 21 }, (_, i) => zigzag(49_000, i)).join(''))), { cod: 'plafon' });
  // 20 dintre ele: 979 980 de vârfuri produse, sub plafon; toate deschise: refuzul e „gol”, cu raportul. Sub-felia 2.3c-1
  // (ADR 0037 §11): poliliniile sunt umplute, dar închiderea lor ar sta pe o dreaptă (degenerată), deci rămân deschise.
  judeca(enc(mm(100, 100, Array.from({ length: 20 }, (_, i) => zigzag(49_000, i)).join(''))), { cod: 'gol', avertismente: { deschise: 20 } });
});

test('prea-mari: subcalea închisă și cea deschisă de 60 000 de vârfuri, arcul „cât un continent”', () => {
  const rect = '<rect x="90" y="90" width="5" height="5"/>';
  judeca(enc(mm(100, 100, poligon(40, 40, 30, 60_000) + rect)), { cai: 1, forme: [1], avertismente: { 'prea-mari': 1 } });
  judeca(enc(mm(100, 100, zigzag(60_000, 5) + rect)), { cai: 1, forme: [1], avertismente: { 'prea-mari': 1 } });
  // rx = 1e25: σ = 1e25 mm, φ = 4,2e-5, n = ⌈π / φ⌉ ≈ 74 900 > 50 000: subcalea se sare pe loc, arcul nu se numără.
  judeca(enc(mm(100, 100, '<path d="M 0 0 A 1e25 1 0 0 1 0 2 Z"/>' + rect)), { cai: 1, forme: [1], avertismente: { 'prea-mari': 1 } });
  // Un arc mare care încape (σ = 1e7: n = ⌈π / 0,0215⌉ = 147) se face și se numără; coordonatele lui trec de 10⁷ mm: departe.
  judeca(enc(mm(100, 100, '<path d="M 0 0 A 1e7 1 0 0 1 0 2 Z"/>' + rect)), { cod: 'departe' });
});

test('piesa cu 10 001 căi: exterior (10 000 de noduri) și exterior-2 (1); trece de ușa documentului', () => {
  const r: string[] = [];
  for (let i = 0; i < 10_001; i++) r.push(`<rect x="${(i % 101) * 2}" y="${Math.floor(i / 101) * 2}" width="1" height="1"/>`);
  const { a, o } = judeca(enc(mm(210, 210, r.join(''))), { cai: 10_001 });
  assert.ok(o.ok);
  const cai = (a as { cai: Array<{ varfuri: VarfO[]; nume?: string }>; pagina: { latime: number; inaltime: number } }).cai;
  const laturi = laturiDinImbricare(cai);
  assert.deepEqual(laturi, laturiO(o.cai));
  const arg = { nume: 'grila', cai, laturi, pagina: (a as { pagina: { latime: number; inaltime: number } }).pagina };
  const rez = piesaDinImport(arg, 'p1');
  assert.deepEqual(judecaPiesa(rez, arg, 'p1', coltExact(o.cai), 2 * CONST_O.tolImport + o.tolLC), []);
  const ops = (rez.piesa as unknown as { operatii: Array<{ id: string; noduri: string[] }> }).operatii;
  assert.deepEqual(ops.map((x) => [x.id, x.noduri.length]), [['exterior', 10_000], ['exterior-2', 1]]);
  const u = incarca({ schema: 9, rev: 0, piese: [rez.piesa], foi: [{ id: 'f1', stoc: { latime: 1000, inaltime: 1000, grosime: 18 }, instante: [{ id: 'i1', piesa: 'p1', x: rez.x, y: rez.y, rotire: 0 }] }] });
  assert.equal(u.ok, true, u.ok ? '' : u.motiv);
});

test('plafonul căii după linia de închidere: polygon cu 50 000 de puncte trece, cu 50 001 e prea-mare', () => {
  const rect = '<rect x="95" y="95" width="2" height="2"/>';
  judeca(enc(mm(100, 100, poligon(40, 40, 30, 50_000) + rect)), { cai: 2, tipuri: ['L'.repeat(50_000), 'LLLL'] });
  judeca(enc(mm(100, 100, poligon(40, 40, 30, 50_001) + rect)), { cai: 1, forme: [1], avertismente: { 'prea-mari': 1 } });
});

test('sub-felia 2.3c-1: plafonul căii pe închiderea ușii: polyline umplută de 50 000 de puncte se închide; fără umplere, de 50 001, e prea-mare', () => {
  const rect = '<rect x="95" y="95" width="2" height="2"/>';
  const linie = (n: number, umplere = ''): string => poligon(40, 40, 30, n).replace('<polygon', `<polyline${umplere}`);
  // Golul ultimului punct față de primul e coarda 2 · 30 · sin(π / n) ≈ 0,0038 mm: umplută, închiderea de umplere; fără
  // umplere, sub REZOLUTIE, închiderea la ușă. Linia de închidere e vârful 50 000: 49 999 de linii citite + 1 încap.
  judeca(enc(mm(100, 100, linie(50_000) + rect)), { cai: 2, tipuri: ['L'.repeat(50_000), 'LLLL'], avertismente: { 'inchise-de-umplere': 1 } });
  judeca(enc(mm(100, 100, linie(50_000, ' fill="none"') + rect)), { cai: 2, tipuri: ['L'.repeat(50_000), 'LLLL'], avertismente: { 'inchise-la-usa': 1 } });
  // 50 001 de puncte: 50 000 de linii citite încap, dar linia de închidere nu.
  judeca(enc(mm(100, 100, linie(50_001, ' fill="none"') + rect)), { cai: 1, forme: [1], avertismente: { 'prea-mari': 1 } });
});

/**
 * n „săgeți” subțiri (x_k = 0,2·k): (x_k, 0) → (1 000, 500) → (x_k, 1 000) → (x_k + 0,1, 500). Primul vârf al săgeții k stă în
 * cutia fiecărei săgeți j < k, dar în afara ei (acolo săgeata e un punct): nicio includere nu reușește, deci nicio căutare
 * nu se oprește devreme, oricare ar fi ordinea; cu un index de cutii, tot ~n²/2 candidați măsurați, câte 4 vârfuri.
 */
const sageti = (n: number): string => Array.from({ length: n }, (_, k) => {
  const x = 0.2 * k;
  return `M ${x} 0 L 1000 500 L ${x} 1000 L ${x + 0.1} 500 Z`;
}).join(' ');

test('bugetul includerilor (§8): laturile a 4 000 de săgeți dau null (peste buget), ale a 1 000 trec; citirea evenodd trece', () => {
  // 4 000: ~8·10⁶ candidați în cutie × (1 + 4) = 4·10⁷ > 2·10⁷. Evenodd: fără normalizare, citirea e cea din 2.7c.
  const { a: a4, o: o4 } = judeca(enc(mm(1000, 1000, `<path fill-rule="evenodd" d="${sageti(4000)}"/>`)), { cai: 4000 });
  assert.ok(o4.ok);
  assert.equal(laturiDinImbricare((a4 as { cai: Array<{ varfuri: VarfO[] }> }).cai, (PLAFON_IMPORT as unknown as { includeri: number }).includeri), null);
  assert.equal(laturiBugetO(o4.cai, CONST_O.includeri), null);
  // 1 000: ~5·10⁵ × 5 = 2,5·10⁶ ≪ 2·10⁷; nicio includere: toate exterioare.
  const { a, o } = judeca(enc(mm(1000, 1000, `<path fill-rule="evenodd" d="${sageti(1000)}"/>`)), { cai: 1000 });
  assert.ok(o.ok);
  const l = laturiDinImbricare((a as { cai: Array<{ varfuri: VarfO[] }> }).cai, (PLAFON_IMPORT as unknown as { includeri: number }).includeri);
  assert.deepEqual(l, laturiO(o.cai));
  assert.ok(l?.every((x) => x === 'exterior'));
});

test('felia 2.7d: 1 000 și 4 000 de săgeți nonzero (o singură formă, sute de mii de încrucișări): normalizate sau refuzate, numărate, fără blocaj', () => {
  for (const n of [1000, 4000]) {
    const b = enc(mm(1000, 1000, `<path d="${sageti(n)}"/>`));
    const t0 = performance.now();
    const a = citesteSvg(b, { parser: parserTest() }) as { ok: boolean; avertismente: Record<string, number> };
    const t = performance.now() - t0;
    const o = citesteSvgO(b, { densitateNonzero: DENS });
    assert.ok(o.ok && o.formeNonzero.length === 1 && (o.formeNonzero[0] as { deSchimbat: boolean }).deSchimbat, 'oracolul: forma trebuie schimbată');
    assert.deepEqual(judecaRezultat(a, o, { N: 4, densitateNonzero: DENS }), [], `${n}`);
    assert.equal((a.avertismente['nonzero-normalizate'] ?? 0) + (a.avertismente['nonzero-refuzate'] ?? 0), 1);
    // ADR 0036 §10: pe firul principal, cu bugetul de la §8; peste el, refuz (aici: secunde, nu minute).
    assert.ok(t < 10_000, `${n}: ${t.toFixed(0)} ms`);
  }
});

test('bugetul laturilor: 4 000 de dreptunghiuri imbricate (forme separate): citirea trece, laturile cu buget dau null', () => {
  const r = Array.from({ length: 4000 }, (_, i) => { const h = 0.4 * (4000 - i); return `<rect x="${500 - h}" y="${500 - h}" width="${2 * h}" height="${2 * h}"/>`; });
  const b = enc(mm(1000, 1000, r.join('')));
  const a = citesteSvg(b, { parser: parserTest() }) as unknown as { ok: boolean; cai: Array<{ varfuri: VarfO[] }> };
  const o = citesteSvgO(b);
  assert.deepEqual(judecaRezultat(a, o, { N: 4 }), []);
  assert.ok(o.ok);
  assert.equal(laturiDinImbricare(a.cai, (PLAFON_IMPORT as unknown as { includeri: number }).includeri), null);
  assert.equal(laturiBugetO(o.cai, CONST_O.includeri), null);
});

/** M 0 0, k linii (frânte) până în (40, 0), apoi jumătatea de elipsă rx 20, ry 10 înapoi în (0, 0): σ = 20, n = 9 cubice. */
function caleCuArcLaPlafon(k: number): string {
  const pts: string[] = [];
  for (let i = 1; i < k; i++) pts.push(`${(40 * i) / k} ${i % 2 === 0 ? 0 : -0.001}`);
  pts.push('40 0');
  return `<path d="M 0 0 L ${pts.join(' ')} A 20 10 0 0 1 0 0 Z"/>`;
}

test('locul liniei de închidere (§7, revizia 12.10): 49 990 de linii + 9 cubice trec; 49 991 + 9: prea-mare, arcul nenumărat', () => {
  const rect = '<rect x="80" y="80" width="5" height="5"/>';
  // 49 990 + 9 = 49 999 ≤ 50 000 − 1: încap (arcul se închide singur, fără linie).
  judeca(enc(mm(100, 100, caleCuArcLaPlafon(49_990) + rect)), { cai: 2, tipuri: [`${'L'.repeat(49_990)}${'C'.repeat(9)}`, 'LLLL'], avertismente: { 'arce-eliptice': 1, 'cubice-din-arce': 9 } });
  // 49 991 + 9 = 50 000: ar încăpea fără locul păstrat; cu el, subcalea se sare pe loc, iar arcul nu se numără.
  judeca(enc(mm(100, 100, caleCuArcLaPlafon(49_991) + rect)), { cai: 1, forme: [1], avertismente: { 'prea-mari': 1 } });
});
