/**
 * Frezele de rest (ADR 0093, felia 5.5↑, documentul v17). Probele:
 * - criteriul din cercetare: buzunarul 80 × 40 × 10 cu Ø12, apoi Ø3, pasul 40 %: pe oracolul simulării (programul tăiat la
 *   `T… M6`, fiecare bucată cu freza ei), fundul la −10 (± 0,02) pe toată aria în afara colțurilor, colțurile cu raza 1,5;
 *   Ø3 scoate material doar în afara deschiderii cu Ø12 (colțurile, pe hârtie), iar traseul ei stă la peste R_a − R − h de
 *   zona centrului lui Ø12; inelele Ø12 la 4,8 mm;
 * - o fâșie mai îngustă decât Ø12 (canalul de 8 mm), insulele cu fâșii de 6 mm, trei freze (Ø12, Ø6, Ø3);
 * - o freză de rest care n-are ce scoate nu se montează (avertisment); refuzurile;
 * - fundul plat al V-carve-ului cu două freze drepte și freza de gravare (gravarea inteligentă, ADR 0092): nimic mai adânc,
 *   frezele drepte nu ating pereții, Ø2 doar unde Ø6 n-a ajuns, colțurile ≤ 0,15 mm, materialul din colț față de anvelopă;
 * - ușa v17 și migrarea v16 → v17.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { operatieDinDialog } from '../../src/app/valoriOperatii.ts';
import { ineleBuzunar } from '../../src/cam/buzunar.ts';
import { programDinDocument } from '../../src/cam/job.ts';
import { bucatiRest } from '../../src/cam/rest.ts';
import { traseuVcarve } from '../../src/cam/vcarve.ts';
import { conturDreptunghi } from '../../src/geom/conturBaza.ts';
import type { Miscare } from '../../src/ir/ir.ts';
import { incarca } from '../../src/model/incarcare.ts';
import { calculeazaExport } from '../../src/ui/actiuniExportCalcul.ts';
import { judeca, type GrilaOracol, type SculaOracol } from '../oracles/simulare.ts';

type Op = Record<string, unknown>;
const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const F = (numar: number, diametru: number) => ({ numar, nume: `freza ${diametru}`, diametru });
const R = (numar: number, diametru: number, pasLateral = Math.round(diametru * 4) / 10) => ({ scula: F(numar, diametru), pasLateral });
const buz = (noduri: string[], extra: Op = {}): Op => ({
  id: 'o', tip: 'buzunar', noduri, scula: F(1, 12), latura: 'interior', sens: 'urcare', adancime: 10, pas: 5,
  urechi: null, rampa: null, intrari: null, colturi: null, pasLateral: 4.8, rest: [R(2, 3)], ...extra,
});
type Forma = { id: string; forma: Op; e?: number; f?: number };
function doc(forme: readonly Forma[], operatii: Op[], schema = 17): unknown {
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

/** Programul exportat (postul real), judecat pe sculă: bucata k cu `scule[k]`; `z` = minimul lor. */
async function judecat(d: unknown, grila: GrilaOracol, scule: readonly SculaOracol[]): Promise<{ z: Float64Array; nx: number; ny: number; bucati: Float64Array[]; text: string }> {
  const r = await calculeazaExport(deschis(d), { origine: 'stanga-jos', z0: 'sus' });
  if (!r.ok) assert.fail(r.motiv);
  const piese = r.program.text.split(/^T\d+ M6$/m);
  assert.equal(piese.length, scule.length, `${piese.length} bucăți de program, ${scule.length} scule`);
  const judecate = piese.map((b, k) => judeca(b, grila, scule[k]!));
  const bucati = judecate.map((o) => Float64Array.from(o.z));
  const z = bucati.reduce((acc, b) => acc.map((v, i) => Math.min(v, b[i]!)));
  return { z, nx: judecate[0]!.nx, ny: judecate[0]!.ny, bucati, text: r.program.text };
}
const centru = (g: GrilaOracol, i: number, j: number): [number, number] => [g.x0 + (i + 0.5) * g.celula, g.y0 + (j + 0.5) * g.celula];
/** În colțul (pe hârtie) pe care o freză de raza r nu-l atinge: în pătratul r × r al colțului, în afara cercului tangent. */
const inColt = (x: number, y: number, x0: number, y0: number, w: number, h: number, r: number): boolean => {
  const cx = Math.min(x - x0, x0 + w - x), cy = Math.min(y - y0, y0 + h - y);
  return cx < r && cy < r && Math.hypot(r - cx, r - cy) > r;
};
/** Câte puncte de tăiere stau în fâșia de lângă peretele de jos, cu x în (x0, x1) și y sub `y1` (pe hârtie). */
function laPerete(taieri: readonly Miscare[], x0: number, x1: number, y1: number): number {
  let x = 0, y = 0, n = 0;
  for (const m of taieri) {
    if (!('la' in m) || (m.la.X === undefined && m.la.Y === undefined)) continue;
    x = m.la.X ?? x; y = m.la.Y ?? y;
    if (x > x0 && x < x1 && y < y1) n++;
  }
  return n;
}

/** Mișcările de tăiere ale frezei cu numărul dat (după schimbarea la ea), din programul lucrării. */
function taieriCu(miscari: readonly Miscare[], numar: number, prima: number): Miscare[] {
  let cur = prima;
  const rez: Miscare[] = [];
  for (const m of miscari) {
    if (m.tip === 'schimba-scula') { cur = m.scula.numar; continue; }
    if (cur === numar && m.tip === 'taiere') rez.push(m);
  }
  return rez;
}

// ── Criteriul din cercetare ──────────────────────────────────────────────────────────────────────────────────────────

test('criteriul: buzunarul 80 × 40 × 10 cu Ø12 și Ø3 (pasul 40 %): fundul la −10 ± 0,02 în afara colțurilor R1,5; Ø3 doar în colțuri', async (t) => {
  const g: GrilaOracol = { x0: 19, y0: 19, latime: 82, inaltime: 42, celula: 0.1 };
  const o = await judecat(doc([DR80], [buz(['a'])]), g, [plata(12), plata(3)]);
  assert.equal(o.text.match(/^T\d+ M6$/gm)?.join(), 'T2 M6', 'o singură schimbare, la Ø3');
  let neplane = 0, adanc = 0, afara = 0, restInA1 = 0, rest = 0;
  for (let j = 0; j < o.ny; j++) {
    for (let i = 0; i < o.nx; i++) {
      const [x, y] = centru(g, i, j), k = j * o.nx + i, z = o.z[k]!;
      if (!(x > 20 && x < 100 && y > 20 && y < 60)) { afara = Math.max(afara, -z); continue; }
      adanc = Math.max(adanc, -10 - z);
      if (!inColt(x, y, 20, 20, 80, 40, 1.5) && Math.abs(z + 10) > 0.02) neplane++;
      if (o.bucati[1]![k]! < o.bucati[0]![k]! - 1e-6) { rest++; if (!inColt(x, y, 20, 20, 80, 40, 6)) restInA1++; }
    }
  }
  t.diagnostic(`celule scoase de Ø3: ${rest}, dintre ele în deschiderea cu Ø12: ${restInA1}`);
  assert.deepEqual({ neplane, adanc, afara, restInA1 }, { neplane: 0, adanc: 0, afara: 0, restInA1: 0 });
  assert.ok(rest > 0, 'Ø3 n-a scos nimic');
});

test('criteriul: colțurile au raza 1,5 (a lui Ø3); fără freza de rest, 6 (a lui Ø12)', async (t) => {
  const g: GrilaOracol = { x0: 19.95, y0: 19.95, latime: 2.5, inaltime: 2.5, celula: 0.01 };
  /** Raza din celula netăiată cea mai adâncă în colț, pe bisectoare: s = ρ(1 − 1/√2). */
  const raza = (z: Float64Array, nx: number, ny: number): number => {
    let s = 0;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const [x, y] = centru(g, i, j);
      if (x > 20 && y > 20 && z[j * nx + i]! > -9.99) s = Math.max(s, Math.min(x - 20, y - 20));
    }
    return s / (1 - Math.SQRT1_2);
  };
  const cu = await judecat(doc([DR80], [buz(['a'])]), g, [plata(12), plata(3)]);
  const gr = { ...g, latime: 7, inaltime: 7 };
  const fara = await judecat(doc([DR80], [buz(['a'], { rest: undefined })]), gr, [plata(12)]);
  let s = 0;
  for (let j = 0; j < fara.ny; j++) for (let i = 0; i < fara.nx; i++) {
    const [x, y] = centru(gr, i, j);
    if (x > 20 && y > 20 && fara.z[j * fara.nx + i]! > -9.99) s = Math.max(s, Math.min(x - 20, y - 20));
  }
  const rc = raza(cu.z, cu.nx, cu.ny), rf = s / (1 - Math.SQRT1_2);
  t.diagnostic(`raza colțului: cu Ø3 ${rc.toFixed(4)}, doar Ø12 ${rf.toFixed(4)}`);
  assert.ok(Math.abs(rc - 1.5) <= 0.04, `cu Ø3: ${rc}`);
  assert.ok(Math.abs(rf - 6) <= 0.04, `doar Ø12: ${rf}`);
});

test('criteriul: traseul lui Ø3 stă în colțuri (la peste R_a − R de zona centrului lui Ø12, pe hârtie, deci nu trece pe lângă pereți); inelele Ø12 la 4,8 mm; trecerile −5, apoi −10', () => {
  const r = job(doc([DR80], [buz(['a'])]));
  const t3 = taieriCu(r.program.miscari, 2, 1);
  assert.ok(t3.length > 0);
  // Zona centrului lui Ø12: [26, 94] × [26, 54]; pragul R_a − R = 6 − 1,5 (capetele bucăților, căutate prin înjumătățire).
  const prag = 6 - 1.5 - 1e-6;
  let x = 0, y = 0, aproape = Infinity;
  for (const m of t3) {
    if (!('la' in m)) continue;
    x = m.la.X ?? x; y = m.la.Y ?? y;
    if (m.la.X === undefined && m.la.Y === undefined) continue;
    const dx = Math.max(26 - x, 0, x - 94), dy = Math.max(26 - y, 0, y - 54);
    aproape = Math.min(aproape, Math.hypot(dx, dy));
  }
  assert.ok(aproape >= prag - 1e-6, `Ø3 trece la ${aproape} de zona lui Ø12 (prag ${prag})`);
  // Și nu merge pe lângă pereți: pe peretele de jos, între colțurile zonei lui Ø12 (x în (26, 94)), inelul de lângă perete al
  // lui Ø3 e exact la R_a − R de ea, deci nu se taie.
  assert.equal(laPerete(t3, 26 + 0.05, 94 - 0.05, 26), 0);
  // Trecerile lui Ø3: întâi toate la −5, apoi la −10.
  const z = t3.flatMap((m) => ('la' in m && m.la.Z !== undefined ? [m.la.Z] : []));
  const k = z.indexOf(-10);
  assert.ok(k > 0 && z.slice(0, k).every((v) => v === -5) && z.slice(k).every((v) => v === -10), z.join(' '));
  const inele = ineleBuzunar(conturDreptunghi(20, 20, 80, 40, 0), 6, 4.8);
  if (!inele.ok) assert.fail(inele.motiv);
  const d: number[] = [];
  for (let n = inele.radacini; n.length > 0; n = n.flatMap((q) => q.copii)) d.push(...n.map((q) => q.d));
  assert.deepEqual(d.map((v) => Math.round(v * 1000) / 1000), [6, 10.8, 15.6]);
});

// ── Fâșii înguste, insule, trei freze ────────────────────────────────────────────────────────────────────────────────

test('o fâșie mai îngustă decât Ø12 (canalul 30 × 8): Ø3 o golește, fundul la −10 ± 0,02', async () => {
  const pts = [[20, 20], [80, 20], [80, 36], [110, 36], [110, 44], [80, 44], [80, 60], [20, 60]];
  const forma = { tip: 'cale', inchis: true, varfuri: pts.map(([x, y]) => ({ p: { x, y }, s: { tip: 'L' } })) };
  const g: GrilaOracol = { x0: 79, y0: 35, latime: 32, inaltime: 10, celula: 0.1 };
  const o = await judecat(doc([{ id: 'a', forma }], [buz(['a'])]), g, [plata(12), plata(3)]);
  let neplane = 0, adanc = 0;
  for (let j = 0; j < o.ny; j++) for (let i = 0; i < o.nx; i++) {
    const [x, y] = centru(g, i, j), z = o.z[j * o.nx + i]!;
    if (!(x > 80 && x < 110 && y > 36 && y < 44)) continue;
    adanc = Math.max(adanc, -10 - z);
    if (!inColt(x, y, 80, 36, 30, 8, 1.5) && Math.abs(z + 10) > 0.02) neplane++;
  }
  assert.deepEqual({ neplane, adanc }, { neplane: 0, adanc: 0 });
});

test('insula 40 × 28 în buzunarul 80 × 40: fâșiile de 6 mm de sus și de jos le golește Ø3; insula rămâne întreagă', async () => {
  const forme = [DR80, DR('b', 40, 28, 40, 26)];
  const g: GrilaOracol = { x0: 19, y0: 19, latime: 82, inaltime: 42, celula: 0.1 };
  const o = await judecat(doc(forme, [buz(['a', 'b'])]), g, [plata(12), plata(3)]);
  let neplane = 0, insula = 0;
  for (let j = 0; j < o.ny; j++) for (let i = 0; i < o.nx; i++) {
    const [x, y] = centru(g, i, j), z = o.z[j * o.nx + i]!;
    if (x > 40 && x < 80 && y > 26 && y < 54) { insula = Math.min(insula, z); continue; }
    if (!(x > 20 && x < 100 && y > 20 && y < 60)) continue;
    // Fâșiile de sus și de jos (y în (20, 26) și (54, 60)), departe de colțurile buzunarului și ale fâșiilor.
    if (x > 42 && x < 78 && ((y > 21.5 && y < 24.5) || (y > 55.5 && y < 58.5)) && Math.abs(z + 10) > 0.02) neplane++;
  }
  assert.deepEqual({ neplane, insula }, { neplane: 0, insula: 0 });
});

test('trei freze (Ø12, Ø6, Ø3): fiecare scoate doar unde cea dinainte n-a ajuns; colțurile R1,5, fundul plat', async () => {
  const g: GrilaOracol = { x0: 19, y0: 19, latime: 82, inaltime: 42, celula: 0.1 };
  const o = await judecat(doc([DR80], [buz(['a'], { rest: [R(2, 6), R(3, 3)] })]), g, [plata(12), plata(6), plata(3)]);
  assert.equal(o.text.match(/^T\d+ M6$/gm)?.join(), 'T2 M6,T3 M6');
  let neplane = 0, r6 = 0, r3 = 0;
  for (let j = 0; j < o.ny; j++) for (let i = 0; i < o.nx; i++) {
    const [x, y] = centru(g, i, j), k = j * o.nx + i;
    if (!(x > 20 && x < 100 && y > 20 && y < 60)) continue;
    if (!inColt(x, y, 20, 20, 80, 40, 1.5) && Math.abs(o.z[k]! + 10) > 0.02) neplane++;
    const dupa12 = o.bucati[0]![k]!, dupa6 = Math.min(dupa12, o.bucati[1]![k]!);
    if (o.bucati[1]![k]! < dupa12 - 1e-6 && !inColt(x, y, 20, 20, 80, 40, 6)) r6++;
    if (o.bucati[2]![k]! < dupa6 - 1e-6 && !inColt(x, y, 20, 20, 80, 40, 3)) r3++;
  }
  assert.deepEqual({ neplane, r6, r3 }, { neplane: 0, r6: 0, r3: 0 });
  // Fiecare față de cea dinainte: Ø3 nu merge pe peretele de jos între colțurile zonei lui Ø6 (x în (23, 97)).
  const r = job(doc([DR80], [buz(['a'], { rest: [R(2, 6), R(3, 3)] })]));
  assert.equal(laPerete(taieriCu(r.program.miscari, 3, 1), 23 + 0.05, 97 - 0.05, 23), 0);
});

test('sensul buzunarului ține și pentru frezele de rest: la urcare, colțul stânga-jos e ocolit trigonometric (perete în dreapta); la opoziție, invers', () => {
  /** Întoarcerea totală (produsele vectoriale) a traseului lui Ø3 în colțul stânga-jos (x, y sub 26). */
  const intoarcere = (sens: string): number => {
    const t3 = taieriCu(job(doc([DR80], [buz(['a'], { sens })])).program.miscari, 2, 1);
    const pts: [number, number][] = [];
    let x = 0, y = 0;
    for (const m of t3) {
      if (!('la' in m) || (m.la.X === undefined && m.la.Y === undefined)) continue;
      x = m.la.X ?? x; y = m.la.Y ?? y;
      if (x < 26 && y < 26) pts.push([x, y]);
    }
    let s = 0;
    for (let i = 2; i < pts.length; i++) {
      const [ax, ay] = pts[i - 2]!, [bx, by] = pts[i - 1]!, [cx, cy] = pts[i]!;
      s += (bx - ax) * (cy - by) - (by - ay) * (cx - bx);
    }
    return s;
  };
  assert.ok(intoarcere('urcare') > 0, 'la urcare, la stânga');
  assert.ok(intoarcere('opozitie') < 0, 'la opoziție, la dreapta');
});

test('o freză de rest care n-are ce scoate (cercul Ø40 cu Ø12, apoi Ø3) nu se montează: avertisment, fără schimbare', () => {
  const r = job(doc([{ id: 'a', forma: { tip: 'cerc', raza: 20 }, e: 60, f: 60 }], [buz(['a'])]));
  assert.ok(!r.program.miscari.some((m) => m.tip === 'schimba-scula'));
  assert.deepEqual(r.avertismente, ['i/a: freza de rest T2 (Ø3) n-are ce scoate: frezele dinainte au ajuns peste tot unde ajunge și ea']);
});

test('nucleul își judecă singur frezele (și chemat fără lucrare): una cel puțin cât cea dinainte e refuzată, cu motiv', () => {
  const c = conturDreptunghi(20, 20, 80, 40, 0);
  for (const [Ra, R0] of [[3, 3], [3, 6], [3, 0]] as const) {
    const r = bucatiRest(c, [], Ra, R0, 1, 'urcare');
    assert.ok(!r.ok && r.motiv === `freza de rest (raza ${R0}) trebuie să fie mai mică decât cea dinainte (raza ${Ra})`, `${Ra}/${R0}: ${r.ok ? 'acceptat' : r.motiv}`);
  }
  assert.ok(bucatiRest(c, [], 6, 1.5, 1.2, 'urcare').ok);
  const v = traseuVcarve({
    contururi: [c], unghi: 90, diametruScula: 6, adancime: 1, pas: 1, avans: 1000, avansPlonjare: 300, zSigur: 5,
    fundPlat: { diametru: 2, pasLateral: 0.8, sens: 'urcare', rest: [{ diametru: 3, pasLateral: 1 }] },
  });
  assert.ok(!v.ok && v.motiv === 'freza de rest a fundului (Ø3) trebuie să fie mai mică decât cea dinainte (Ø2)', v.ok ? 'acceptat' : v.motiv);
});

test('o freză de rest a fundului care n-are ce scoate (V-carve pe cercul R10: Ø6 golește tot fundul) nu se montează: avertisment', () => {
  const d = doc([{ id: 'a', forma: { tip: 'cerc', raza: 10 }, e: 60, f: 60 }], [{
    id: 'v', tip: 'vcarve', noduri: ['a'], scula: { numar: 1, nume: 'V90', diametru: 12, forma: { tip: 'v', unghi: 90 } },
    latura: 'interior', sens: 'urcare', adancime: 2, pas: 1, urechi: null, rampa: null, intrari: null, colturi: null,
    fundPlat: { scula: F(2, 6), pasLateral: 2.4, rest: [R(3, 5, 2)] },
  }]);
  const r = job(d);
  assert.deepEqual(r.program.miscari.flatMap((m) => (m.tip === 'schimba-scula' ? [m.scula.numar] : [])), [1], 'Ø6, apoi V-ul; Ø5 nu');
  assert.deepEqual(r.avertismente, ['i/a: freza de rest a fundului T3 (Ø5) n-are ce scoate: frezele dinainte au ajuns peste tot unde ajunge și ea']);
});

// ── Refuzurile ───────────────────────────────────────────────────────────────────────────────────────────────────────

test('refuzurile, cu motiv: freza de rest cât cea dinainte sau mai mare, în V, pasul peste raza ei, pe alt fel decât buzunarul, același T', () => {
  assert.equal(motivJob(doc([DR80], [buz(['a'], { rest: [R(2, 12)] })])), 'i/a: freza de rest T2 (Ø12) trebuie să fie mai mică decât cea dinainte (Ø12)');
  assert.equal(motivJob(doc([DR80], [buz(['a'], { rest: [R(2, 6), R(3, 8)] })])), 'i/a: freza de rest T3 (Ø8) trebuie să fie mai mică decât cea dinainte (Ø6)');
  assert.equal(motivJob(doc([DR80], [buz(['a'], { rest: [{ scula: { ...F(2, 3), forma: { tip: 'v', unghi: 90 } }, pasLateral: 1 }] })])), 'i/a: freza de rest T2 trebuie să fie plată, nu în V');
  assert.equal(motivJob(doc([DR80], [buz(['a'], { rest: [R(2, 3, 1.6)] })])), 'i/a: pasul lateral al frezei de rest T2, de 1.6 mm, trebuie să fie cel mult raza ei (1.5 mm): altfel rămâne material între inele');
  assert.equal(motivJob(doc([DR80], [buz(['a'], { tip: 'profil', latura: 'exterior', pasLateral: undefined })])), 'i/a: frezele de rest sunt doar ale unui buzunar (pe un V-carve, ale fundului plat)');
  assert.equal(motivJob(doc([DR80], [buz(['a'], { rest: [R(1, 3)] })])), 'i/a: T1 are două diametre (12 și 3 mm): fiecare freză cere numărul ei');
});

// ── Fundul plat al V-carve-ului cu două freze drepte (gravarea inteligentă) ──────────────────────────────────────────

const TAN15 = Math.tan(Math.PI / 12);
const gravare = (unghi: number, diametru: number, varf: number): SculaOracol => {
  const Rv = diametru / 2, a = varf / 2, cot = 1 / Math.tan((unghi * Math.PI) / 360);
  return { tip: 'profil', diametru, puncte: [[0, 0], [a, 0], [Rv, (Rv - a) * cot]] };
};
const smart = (fund: Op) => doc([DR('a', 20, 20)], [{
  id: 'v', tip: 'vcarve', noduri: ['a'], scula: { numar: 1, nume: 'gravare', diametru: 3.175, forma: { tip: 'v', unghi: 30, varf: 0.25 } },
  latura: 'interior', sens: 'urcare', adancime: 2, pas: 1, urechi: null, rampa: null, intrari: null, colturi: null, fundPlat: fund,
}]);
const FUND2 = { scula: F(2, 6), pasLateral: 2.4, rest: [R(3, 2, 0.8)] };

test('fundul plat cu Ø6, apoi Ø2, apoi freza de gravare: nimic mai adânc, frezele drepte nu ating pereții, Ø2 doar unde Ø6 n-a ajuns', async (t) => {
  const g: GrilaOracol = { x0: 19.5, y0: 19.5, latime: 11, inaltime: 6, celula: 0.02 };
  const o = await judecat(smart(FUND2), g, [plata(6), plata(2), gravare(30, 3.175, 0.25)]);
  assert.equal(o.text.match(/^T\d+ M6$/gm)?.join(), 'T3 M6,T1 M6', 'Ø6, apoi Ø2, apoi freza de gravare');
  let peste = 0, laPerete = Infinity, ø2InA6 = 0;
  for (let j = 0; j < o.ny; j++) for (let i = 0; i < o.nx; i++) {
    const [x, y] = centru(g, i, j), k = j * o.nx + i;
    if (!(x > 20 && x < 40 && y > 20 && y < 40)) continue;
    const q = Math.min(x - 20, 40 - x, y - 20, 40 - y), ideal = -Math.min(2, q / TAN15);
    peste = Math.max(peste, ideal - o.z[k]!);
    for (const b of [o.bucati[0]!, o.bucati[1]!]) if (q < 2 * TAN15 && b[k]! < 0) laPerete = Math.min(laPerete, b[k]! - ideal);
    // Ø2 doar în afara deschiderii fundului cu Ø6 (pe hârtie: pătratul fundului la nivelul −1 sau −2, cu colțurile R3).
    if (o.bucati[1]![k]! < o.bucati[0]![k]! - 1e-6) {
      const L = -o.bucati[1]![k]! <= 1 + 1e-6 ? 1 : 2, w = L * TAN15 + 0.002;
      // Pe granița de pe hârtie (sub 0,001 mm de cercul colțului), Ø6 și Ø2 se ating la egalitate: nu se numără.
      const cx = Math.min(x - 20 - w, 40 - w - x), cy = Math.min(y - 20 - w, 40 - w - y);
      const pePrag = cx < 3 && cy < 3 && Math.abs(3 - Math.hypot(3 - cx, 3 - cy)) < 1e-3;
      if (!inColt(x, y, 20 + w, 20 + w, 20 - 2 * w, 20 - 2 * w, 3) && !pePrag) ø2InA6++;
    }
  }
  t.diagnostic(`peste ${peste.toFixed(5)}, frezele drepte deasupra pereților cu ${laPerete.toFixed(5)}, Ø2 în deschiderea lui Ø6: ${ø2InA6}`);
  assert.ok(peste <= 0.002, `mai adânc: ${peste}`);
  assert.ok(laPerete >= 0.005, `o freză dreaptă atinge pereții: ${laPerete}`);
  assert.equal(ø2InA6, 0);
});

test('fundul plat cu Ø6 și Ø2: freza V face exact ce face cu Ø2 singură (axa și inelele colțurilor, față de cea mai mică)', () => {
  const vDupa = (fund: Op): Miscare[] => {
    const ms = job(smart(fund)).program.miscari;
    const k = ms.findIndex((m) => m.tip === 'eticheta' && /V-carve, până la/.test(m.text));
    return ms.slice(k + 1);
  };
  assert.deepEqual(vDupa(FUND2), vDupa({ scula: F(3, 2), pasLateral: 0.8 }));
  // Martorul: doar cu Ø6, freza V face mai mult (colțurile lui Ø6 sunt mai mari).
  assert.ok(vDupa({ scula: F(2, 6), pasLateral: 2.4 }).length > vDupa(FUND2).length);
});

test('fundul plat cu Ø6 și Ø2: în colț, materialul lăsat față de anvelopa frezei de gravare (pe hârtie) e cel mult creasta c; colțul la suprafață ≤ 0,15', async (t) => {
  const g: GrilaOracol = { x0: 20, y0: 20, latime: 3.6, inaltime: 3.6, celula: 0.06 };
  const o = await judecat(smart(FUND2), g, [plata(6), plata(2), gravare(30, 3.175, 0.25)]);
  const a = 0.125, cot = 1 / TAN15, raza = a + 2 * TAN15, h = 0.0025;
  let lasat = 0, s = 0;
  for (let j = 0; j < o.ny; j++) for (let i = 0; i < o.nx; i++) {
    const [px, py] = centru(g, i, j), z = o.z[j * o.nx + i]!;
    let adanc = 0;
    for (let cy = Math.max(20, py - raza); cy <= py + raza; cy += h) {
      for (let cx = Math.max(20, px - raza); cx <= px + raza; cx += h) {
        const r = Math.min(cx - 20, cy - 20);
        if (r <= a) continue;
        const d = Math.hypot(px - cx, py - cy);
        if (d >= raza) continue;
        adanc = Math.max(adanc, Math.min(2, (r - a) * cot) - Math.max(0, d - a) * cot);
      }
    }
    lasat = Math.max(lasat, z + adanc);
    if (z > -0.005) s = Math.max(s, Math.min(px - 20, py - 20));
  }
  t.diagnostic(`materialul lăsat în colț, față de anvelopă: ${lasat.toFixed(5)}; celula netăiată cea mai adâncă în colț: ${s.toFixed(3)}`);
  assert.ok(lasat <= 0.05 + 0.01, `în colț: ${lasat}`);
  assert.ok(s / (1 - Math.SQRT1_2) <= 0.15 + 0.06 / 0.29, `colțul: ${s}`);
});

// ── Ușa v17 ──────────────────────────────────────────────────────────────────────────────────────────────────────────

test('ușa v17: `rest` = 1–8 freze, fiecare cu scula și pasul în (0, 50] (câmpurile necunoscute rămân); un v16 cu el nu e valid; un v16 curat urcă la v17', () => {
  const d = deschis(doc([DR80], [buz(['a'], { rest: [{ ...R(2, 3), nota: 'n' }] })]));
  assert.equal((d.piese[0]!.operatii[0]!.rest?.[0] as Record<string, unknown>)['nota'], 'n');
  for (const rau of [[], 'T2', [{}], [{ scula: F(2, 3) }], [{ pasLateral: 1 }], [{ scula: F(2, 3), pasLateral: 0 }], [{ scula: F(2, 3), pasLateral: 51 }],
    [{ scula: F(0, 3), pasLateral: 1 }], Array.from({ length: 9 }, (_, k) => R(k + 2, 3))]) {
    assert.ok(!incarca(doc([DR80], [buz(['a'], { rest: rau })])).ok, JSON.stringify(rau).slice(0, 60));
  }
  const fp = deschis(smart(FUND2)).piese[0]!.operatii[0]!.fundPlat;
  assert.equal(fp?.rest?.[0]?.scula.diametru, 2);
  const a = incarca(doc([DR80], [buz(['a'])], 16));
  assert.ok(!a.ok && /are câmpul „rest”, pe care v17 îl folosește: nu e un document v16 valid/.test(a.motiv), a.ok ? '' : a.motiv);
  const b = incarca({ ...(smart(FUND2) as Record<string, unknown>), schema: 16 });
  assert.ok(!b.ok && /„rest”/.test(b.motiv), b.ok ? '' : b.motiv);
  const curat = doc([DR80], [buz(['a'], { rest: undefined })], 16);
  const c = incarca(JSON.parse(JSON.stringify(curat)));
  assert.ok(c.ok);
  if (c.ok) assert.deepEqual(c.doc, { ...(JSON.parse(JSON.stringify(curat)) as Record<string, unknown>), schema: 17 }, 'doar numărul');
});

// ── Ce scrie Exportă ─────────────────────────────────────────────────────────────────────────────────────────────────

test('ce scrie Exportă (ADR 0093): frezele de rest ale buzunarului și ale fundului, îmbinate pe poziție; lista goală scoate câmpul', () => {
  const o = deschis(doc([DR80], [buz(['a'], { rest: [{ ...R(2, 3), nota: 'n' }] })])).piese[0]!.operatii[0]!;
  const v = { latura: 'interior', sens: 'urcare', adancime: 10, pas: 5, urechi: null, rampa: null, intrari: null, colturi: null, tip: 'buzunar', pasLateral: 4.8 } as const;
  const s = { numar: 1, diametru: 12 } as const;
  // Fără schimbare, aceeași operație (nicio comandă); câmpul necunoscut rămâne.
  assert.deepEqual(operatieDinDialog(o, { ...v, rest: [{ numar: 2, diametru: 3, pasLateral: 1.2 }] }, s), o);
  // Schimbată și una nouă: prima îmbinată (nota rămâne), a doua cu numele „freza plata”.
  const doua = operatieDinDialog(o, { ...v, rest: [{ numar: 2, diametru: 6, pasLateral: 2.4 }, { numar: 3, diametru: 3, pasLateral: 1.2 }] }, s);
  assert.deepEqual(doua.rest, [{ scula: { numar: 2, nume: 'freza 3', diametru: 6 }, pasLateral: 2.4, nota: 'n' }, { scula: { numar: 3, nume: 'freza plata', diametru: 3 }, pasLateral: 1.2 }]);
  // Lista goală: câmpul pleacă; pe alt fel, la fel.
  assert.equal(Object.hasOwn(operatieDinDialog(o, { ...v, rest: [] }, s), 'rest'), false);
  assert.equal(Object.hasOwn(operatieDinDialog(o, { ...v, tip: 'profil', latura: 'exterior', rest: [] }, s), 'rest'), false);
  // Fundul plat: frezele lui de rest, cu numele „freza dreapta”; fără ele, câmpul pleacă.
  const vc = deschis(smart(FUND2)).piese[0]!.operatii[0]!;
  const vv = { latura: 'interior', sens: 'urcare', adancime: 2, pas: 1, urechi: null, rampa: null, intrari: null, colturi: null, tip: 'vcarve' } as const;
  const sv = { numar: 1, diametru: 3.175, forma: { tip: 'v', unghi: 30, varf: 0.25 } } as const;
  assert.deepEqual(operatieDinDialog(vc, { ...vv, fundPlat: { numar: 2, diametru: 6, pasLateral: 2.4, rest: [{ numar: 3, diametru: 2, pasLateral: 0.8 }] } }, sv), vc);
  const fara = operatieDinDialog(vc, { ...vv, fundPlat: { numar: 2, diametru: 6, pasLateral: 2.4 } }, sv);
  assert.equal(Object.hasOwn(fara.fundPlat ?? {}, 'rest'), false);
  const nou = operatieDinDialog(fara, { ...vv, fundPlat: { numar: 2, diametru: 6, pasLateral: 2.4, rest: [{ numar: 4, diametru: 1, pasLateral: 0.4 }] } }, sv);
  assert.deepEqual(nou.fundPlat?.rest, [{ scula: { numar: 4, nume: 'freza dreapta', diametru: 1 }, pasLateral: 0.4 }]);
});
