/**
 * Strategia paralelă a buzunarului (ADR 0094, felia 5.6↑, documentul v18). Probele:
 * - criteriul din cercetare: cu strategia paralelă, conturul buzunarului iese pe vector (± 0,02), datorită trecerii de profil;
 *   pe oracolul simulării, buzunarul 80 × 40 × 10 cu Ø12 (pasul 4,8): fundul la −10 ± 0,02 în afara colțurilor R6, peretele la
 *   x = 20 ± 0,02, nimic în afară; liniile la 4,8 mm una de alta (pe hârtie: y = 26 + 4,8·k), la 0° și la 30°;
 * - trecerea de profil: după linii, pe fiecare trecere, bucla zonei centrului ([26, 94] × [26, 54]);
 * - o insulă: fundul plat în jur, insula întreagă, legăturile doar prin buzunar;
 * - cu frezele de rest (ADR 0093): aceeași acoperire, deci Ø3 doar în colțuri;
 * - trecerile (−5, apoi −10), refuzurile, ușa v18, ce scrie Exportă.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { operatieDinDialog } from '../../src/app/valoriOperatii.ts';
import { programDinDocument } from '../../src/cam/job.ts';
import { traseuParalel } from '../../src/cam/paralel.ts';
import { conturDreptunghi } from '../../src/geom/conturBaza.ts';
import type { Miscare } from '../../src/ir/ir.ts';
import { incarca } from '../../src/model/incarcare.ts';
import { calculeazaExport } from '../../src/ui/actiuniExportCalcul.ts';
import { judeca, type GrilaOracol, type SculaOracol } from '../oracles/simulare.ts';

type Op = Record<string, unknown>;
const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const F = (numar: number, diametru: number) => ({ numar, nume: `freza ${diametru}`, diametru });
const buz = (noduri: string[], extra: Op = {}): Op => ({
  id: 'o', tip: 'buzunar', noduri, scula: F(1, 12), latura: 'interior', sens: 'urcare', adancime: 10, pas: 5,
  urechi: null, rampa: null, intrari: null, colturi: null, pasLateral: 4.8, strategie: { fel: 'paralel', unghi: 0 }, ...extra,
});
type Forma = { id: string; forma: Op; e?: number; f?: number };
function doc(forme: readonly Forma[], operatii: Op[], schema = 18): unknown {
  const noduri = forme.map((c) => ({ tip: 'element', id: c.id, matrice: { ...I, e: c.e ?? 0, f: c.f ?? 0 }, forma: c.forma }));
  return {
    schema, rev: 0, piese: [{ id: 'p', radacina: { tip: 'grup', id: 'r', matrice: { ...I }, copii: noduri }, operatii }],
    foi: [{ id: 'f1', stoc: { latime: 200, inaltime: 150, grosime: 18 }, instante: [{ id: 'i', piesa: 'p', x: 0, y: 0, rotire: 0 }] }],
  };
}
const deschis = (d: unknown) => {
  const r = incarca(d);
  if (!r.ok) assert.fail(r.motiv);
  return r.doc;
};
const job = (d: unknown) => {
  const r = programDinDocument(deschis(d));
  if (!r.ok) assert.fail(r.motiv);
  return r;
};
const motivJob = (d: unknown): string => { const r = programDinDocument(deschis(d)); return r.ok ? '' : r.motiv; };
const DR = (id: string, latime: number, inaltime: number, e = 20, f = 20): Forma => ({ id, forma: { tip: 'dreptunghi', latime, inaltime, razaColt: 0 }, e, f });
const DR80 = DR('a', 80, 40);
const plata = (diametru: number): SculaOracol => ({ tip: 'plata', diametru });
const centru = (g: GrilaOracol, i: number, j: number): [number, number] => [g.x0 + (i + 0.5) * g.celula, g.y0 + (j + 0.5) * g.celula];
const inColt = (x: number, y: number, r: number): boolean => {
  const cx = Math.min(x - 20, 100 - x), cy = Math.min(y - 20, 60 - y);
  return cx < r && cy < r && Math.hypot(r - cx, r - cy) > r;
};

async function judecat(d: unknown, grila: GrilaOracol, scule: readonly SculaOracol[]): Promise<{ z: Float64Array; nx: number; ny: number; bucati: Float64Array[] }> {
  const r = await calculeazaExport(deschis(d), { origine: 'stanga-jos', z0: 'sus' });
  if (!r.ok) assert.fail(r.motiv);
  const piese = r.program.text.split(/^T\d+ M6$/m);
  assert.equal(piese.length, scule.length);
  const judecate = piese.map((b, k) => judeca(b, grila, scule[k]!));
  const bucati = judecate.map((o) => Float64Array.from(o.z));
  return { z: bucati.reduce((acc, b) => acc.map((v, i) => Math.min(v, b[i]!))), nx: judecate[0]!.nx, ny: judecate[0]!.ny, bucati };
}

/** Segmentele de tăiere în plan ale programului (capetele lor), cu Z-ul lor. */
function segmente(miscari: readonly Miscare[]): Array<{ a: [number, number]; b: [number, number]; z: number }> {
  const rez: Array<{ a: [number, number]; b: [number, number]; z: number }> = [];
  let x = 0, y = 0, z = 5;
  for (const m of miscari) {
    if (!('la' in m)) continue;
    const nx = m.la.X ?? x, ny = m.la.Y ?? y, nz = m.la.Z ?? z;
    if (m.tip === 'taiere' && (nx !== x || ny !== y)) rez.push({ a: [x, y], b: [nx, ny], z: nz });
    x = nx; y = ny; z = nz;
  }
  return rez;
}

// ── Criteriul ────────────────────────────────────────────────────────────────────────────────────────────────────────

for (const unghi of [0, 30]) {
  test(`criteriul, la ${unghi}°: buzunarul 80 × 40 × 10 cu Ø12 (pasul 4,8): fundul la −10 ± 0,02 în afara colțurilor R6, nimic în afară`, async () => {
    const g: GrilaOracol = { x0: 19, y0: 19, latime: 82, inaltime: 42, celula: 0.1 };
    const o = await judecat(doc([DR80], [buz(['a'], { strategie: { fel: 'paralel', unghi } })]), g, [plata(12)]);
    let neplane = 0, adanc = 0, afara = 0;
    for (let j = 0; j < o.ny; j++) for (let i = 0; i < o.nx; i++) {
      const [x, y] = centru(g, i, j), z = o.z[j * o.nx + i]!;
      if (!(x > 20 && x < 100 && y > 20 && y < 60)) { afara = Math.max(afara, -z); continue; }
      adanc = Math.max(adanc, -10 - z);
      if (!inColt(x, y, 6) && Math.abs(z + 10) > 0.02) neplane++;
    }
    assert.deepEqual({ neplane, adanc, afara }, { neplane: 0, adanc: 0, afara: 0 });
  });
}

test('criteriul: peretele iese pe vector (x = 20 ± 0,02), datorită trecerii de profil; liniile la 4,8 mm (y = 26 + 4,8·k), apoi bucla zonei centrului', async () => {
  const g: GrilaOracol = { x0: 19.5, y0: 39.9, latime: 1, inaltime: 0.2, celula: 0.002 };
  const o = await judecat(doc([DR80], [buz(['a'])]), g, [plata(12)]);
  const j = 50;
  let x5 = Number.NaN;
  for (let i = 1; i < o.nx; i++) {
    const a = o.z[j * o.nx + i - 1]!, b = o.z[j * o.nx + i]!;
    if (a > -5 && b <= -5) x5 = g.x0 + (i - 0.5 + (a + 5) / (a - b)) * g.celula;
  }
  assert.ok(Math.abs(x5 - 20) <= 0.02, `peretele la x = ${x5}`);
  const r = job(doc([DR80], [buz(['a'])]));
  const s = segmente(r.program.miscari).filter((q) => q.z === -5);
  const orizontale = [...new Set(s.filter((q) => q.a[1] === q.b[1] && q.a[0] !== q.b[0]).map((q) => Math.round(q.a[1] * 1000) / 1000))].sort((m, n) => m - n);
  // Liniile sunt orizontale la y = 26 + 4,8·k (strict înăuntrul zonei [26, 54]); bucla de profil adaugă y = 26 și y = 54.
  assert.deepEqual(orizontale, [26, 30.8, 35.6, 40.4, 45.2, 50, 54]);
  // Ultimele patru segmente ale trecerii: bucla [26, 94] × [26, 54], în sensul trigonometric (la urcare).
  const bucla = s.slice(-4).map((q) => q.b);
  assert.deepEqual(bucla, [[94, 26], [94, 54], [26, 54], [26, 26]]);
});

test('la opoziție, bucla de profil merge invers (orar); pe dreptunghi, liniile sunt o singură înlănțuire pe trecere (o ridicare pentru linii, una pentru buclă)', () => {
  const r = job(doc([DR80], [buz(['a'], { sens: 'opozitie' })]));
  const s = segmente(r.program.miscari).filter((q) => q.z === -5);
  assert.deepEqual(s.slice(-4).map((q) => q.b), [[26, 54], [94, 54], [94, 26], [26, 26]]);
  // Ridicările în plan pe prima trecere: rapidele cu X sau Y până la prima tăiere la −10.
  const ms = r.program.miscari;
  const k = ms.findIndex((m) => m.tip === 'taiere' && 'la' in m && m.la.Z === -10);
  const rapide = ms.slice(0, k).filter((m) => m.tip === 'rapida' && (m.la.X !== undefined || m.la.Y !== undefined)).length;
  assert.equal(rapide, 3, 'liniile, bucla, apoi startul trecerii a doua');
});

test('nucleul își judecă singur unghiul și pasul (și chemat fără lucrare)', () => {
  const p = { raza: 6, pasLateral: 4.8, unghi: 0, sens: 'urcare' as const, adancimi: [1], zSigur: 5, avans: 1000, avansPlonjare: 300 };
  const c = conturDreptunghi(20, 20, 80, 40, 0);
  for (const unghi of [-1, 180, Number.NaN]) {
    const r = traseuParalel(c, { ...p, unghi });
    assert.ok(!r.ok && r.motiv === `unghiul liniilor, ${unghi}°, trebuie să fie în [0°, 180°)`, `${unghi}: ${r.ok ? 'acceptat' : r.motiv}`);
  }
  assert.ok(traseuParalel(c, { ...p, unghi: 179.9 }).ok);
});

test('la 30°, liniile sunt la 30° față de X, la 4,8 mm una de alta (pe normală)', () => {
  const r = job(doc([DR80], [buz(['a'], { strategie: { fel: 'paralel', unghi: 30 } })]));
  const s = segmente(r.program.miscari).filter((q) => q.z === -5 && Math.hypot(q.b[0] - q.a[0], q.b[1] - q.a[1]) > 5);
  const u = Math.PI / 6, nx = -Math.sin(u), ny = Math.cos(u);
  const directii = s.filter((q) => Math.abs(Math.abs(((q.b[0] - q.a[0]) * nx + (q.b[1] - q.a[1]) * ny) / Math.hypot(q.b[0] - q.a[0], q.b[1] - q.a[1]))) < 1e-9);
  assert.ok(directii.length >= 8, `${directii.length} linii la 30°`);
  const d = [...new Set(directii.map((q) => Math.round((q.a[0] * nx + q.a[1] * ny) * 1e6) / 1e6))].sort((m, n) => m - n);
  for (let k = 1; k < d.length; k++) assert.ok(Math.abs(d[k]! - d[k - 1]! - 4.8) < 1e-6, `distanța ${d[k]! - d[k - 1]!}`);
});

test('trecerile: toate liniile și bucla la −5, apoi la −10', () => {
  const z = segmente(job(doc([DR80], [buz(['a'])])).program.miscari).map((q) => q.z);
  const k = z.indexOf(-10);
  assert.ok(k > 0 && z.slice(0, k).every((v) => v === -5) && z.slice(k).every((v) => v === -10));
});

// ── Insula, frezele de rest ──────────────────────────────────────────────────────────────────────────────────────────

test('insula 30 × 10 în buzunarul 80 × 40: fundul plat în jur, insula întreagă (legăturile ocolesc insula)', async () => {
  const g: GrilaOracol = { x0: 19, y0: 19, latime: 82, inaltime: 42, celula: 0.1 };
  const o = await judecat(doc([DR80, DR('b', 30, 10, 45, 35)], [buz(['a', 'b'], { pasLateral: 4.8 })]), g, [plata(12)]);
  let neplane = 0, insula = 0;
  for (let j = 0; j < o.ny; j++) for (let i = 0; i < o.nx; i++) {
    const [x, y] = centru(g, i, j), z = o.z[j * o.nx + i]!;
    if (x > 45 && x < 75 && y > 35 && y < 45) { insula = Math.min(insula, z); continue; }
    if (!(x > 20 && x < 100 && y > 20 && y < 60)) continue;
    // Departe de colțurile buzunarului și de cele ale insulei (concave pentru freză: acolo rămâne raza ei).
    const langaInsula = x > 39 && x < 81 && y > 29 && y < 51 && !(x > 45 && x < 75) && !(y > 35 && y < 45);
    if (!inColt(x, y, 6) && !langaInsula && Math.abs(z + 10) > 0.02) neplane++;
  }
  assert.deepEqual({ neplane, insula }, { neplane: 0, insula: 0 });
});

test('cu frezele de rest (Ø12 paralel, apoi Ø3): aceeași acoperire ca la inele, deci Ø3 doar în colțuri; colțurile R1,5', async () => {
  const g: GrilaOracol = { x0: 19, y0: 19, latime: 82, inaltime: 42, celula: 0.1 };
  const o = await judecat(doc([DR80], [buz(['a'], { rest: [{ scula: F(2, 3), pasLateral: 1.2 }] })]), g, [plata(12), plata(3)]);
  let neplane = 0, inA12 = 0;
  for (let j = 0; j < o.ny; j++) for (let i = 0; i < o.nx; i++) {
    const [x, y] = centru(g, i, j), k = j * o.nx + i;
    if (!(x > 20 && x < 100 && y > 20 && y < 60)) continue;
    if (!inColt(x, y, 1.5) && Math.abs(o.z[k]! + 10) > 0.02) neplane++;
    if (o.bucati[1]![k]! < o.bucati[0]![k]! - 1e-6 && !inColt(x, y, 6)) inA12++;
  }
  assert.deepEqual({ neplane, inA12 }, { neplane: 0, inA12: 0 });
});

// ── Refuzurile, ușa, Exportă ─────────────────────────────────────────────────────────────────────────────────────────

test('refuzurile, cu motiv: strategia pe alt fel, cu coborârea în rampă, pasul peste rază', () => {
  assert.equal(motivJob(doc([DR80], [buz(['a'], { tip: 'profil', latura: 'exterior', pasLateral: undefined })])), 'i/a: strategia paralelă e doar a unui buzunar');
  assert.equal(motivJob(doc([DR80], [buz(['a'], { coborare: { fel: 'rampa', unghi: 3 } })])), 'i/a: strategia paralelă coboară prin plonjare; rampa, zigzagul și elicea sunt ale inelelor');
  assert.equal(motivJob(doc([DR80], [buz(['a'], { coborare: { fel: 'plonjare' } })])), '');
  assert.equal(motivJob(doc([DR80], [buz(['a'], { pasLateral: 6.5 })])), 'i/a: pasul lateral de 6.5 mm trebuie să fie în (0, 6] (raza frezei): altfel rămâne material între linii');
});

test('ușa v18: `strategie` = { fel: paralel, unghi în [0, 180) } (câmpurile necunoscute rămân); un v17 cu ea nu e valid; un v17 curat urcă la v18', () => {
  const d = deschis(doc([DR80], [buz(['a'], { strategie: { fel: 'paralel', unghi: 179.5, nota: 'n' } })]));
  assert.equal((d.piese[0]!.operatii[0]!.strategie as Record<string, unknown>)['nota'], 'n');
  for (const rau of [null, 'paralel', {}, { fel: 'raster', unghi: 0 }, { fel: 'paralel' }, { fel: 'paralel', unghi: -1 }, { fel: 'paralel', unghi: 180 }, { fel: 'paralel', unghi: '0' }]) {
    assert.ok(!incarca(doc([DR80], [buz(['a'], { strategie: rau })])).ok, JSON.stringify(rau));
  }
  const a = incarca(doc([DR80], [buz(['a'])], 17));
  assert.ok(!a.ok && /are câmpul „strategie”, pe care v18 îl folosește: nu e un document v17 valid/.test(a.motiv), a.ok ? '' : a.motiv);
  const curat = JSON.parse(JSON.stringify(doc([DR80], [buz(['a'], { strategie: undefined })], 17)));
  const c = incarca(curat);
  assert.ok(c.ok);
  if (c.ok) assert.deepEqual(c.doc, { ...curat, schema: 18 }, 'doar numărul');
});

test('ce scrie Exportă (ADR 0094): strategia doar pe un buzunar paralel (îmbinată), pe inele câmpul pleacă', () => {
  const o = deschis(doc([DR80], [buz(['a'], { strategie: { fel: 'paralel', unghi: 30, nota: 'n' } })])).piese[0]!.operatii[0]!;
  const v = { latura: 'interior', sens: 'urcare', adancime: 10, pas: 5, urechi: null, rampa: null, intrari: null, colturi: null, tip: 'buzunar', pasLateral: 4.8 } as const;
  const s = { numar: 1, diametru: 12 } as const;
  assert.deepEqual(operatieDinDialog(o, { ...v, strategie: { fel: 'paralel', unghi: 30 } }, s), o, 'fără schimbare, aceeași operație');
  assert.deepEqual(operatieDinDialog(o, { ...v, strategie: { fel: 'paralel', unghi: 45 } }, s).strategie, { fel: 'paralel', unghi: 45, nota: 'n' });
  assert.equal(Object.hasOwn(operatieDinDialog(o, v, s), 'strategie'), false);
  assert.equal(Object.hasOwn(operatieDinDialog(o, { ...v, tip: 'profil', latura: 'exterior' }, s), 'strategie'), false);
});
