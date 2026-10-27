/**
 * Fundul plat al V-carve-ului cu freza dreaptă (ADR 0091): suprafața pe oracolul independent al simulării, câte o judecată
 * pe sculă (programul tăiat la `T… M6`, suprafețele unite prin minim), față de idealul −min(D, d·cot(θ/2)) cu d pe hârtie:
 * niciodată mai adânc, fundul exact la −D, creasta din colțurile pe care freza dreaptă nu le atinge cel mult c; fiecare
 * trecere a fiecărei freze scoate cel mult pasul; lucrarea (schimbările de sculă, prima sculă, refuzurile); ușa v15.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { operatieDinDialog } from '../../src/app/valoriOperatii.ts';
import { programDinDocument } from '../../src/cam/job.ts';
import { traseuVcarve, type ParametriVcarve } from '../../src/cam/vcarve.ts';
import { conturDreptunghi, type Contur, type Punct } from '../../src/geom/conturBaza.ts';
import type { Miscare } from '../../src/ir/ir.ts';
import type { Operatie } from '../../src/model/document.ts';
import { incarca } from '../../src/model/incarcare.ts';
import { calculeazaExport } from '../../src/ui/actiuniExportCalcul.ts';
import { judeca, type GrilaOracol, type SculaOracol } from '../oracles/simulare.ts';

type Op = Record<string, unknown>;
/** Creasta lăsată în colțurile pe care freza dreaptă nu le atinge, c din ADR 0091 §2 (pe hârtie, nu din cod). */
const C = 0.05;
const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const V = (unghi: number, diametru = 20) => ({ numar: 1, nume: `freza V${unghi}`, diametru, forma: { tip: 'v', unghi } });
const DREAPTA = { numar: 2, nume: 'freza dreapta', diametru: 3 };
const FUND = { scula: DREAPTA, pasLateral: 1.2 };
const vcarve = (noduri: string[], extra: Op = {}): Op => ({
  id: 'v', tip: 'vcarve', noduri, scula: V(90), latura: 'interior', sens: 'urcare', adancime: 3, pas: 1.5,
  urechi: null, rampa: null, intrari: null, colturi: null, fundPlat: FUND, ...extra,
});
/** O piesă cu formele date și operațiile ei, pe o foaie de 200 × 150 × 18. */
function doc(forme: ReadonlyArray<{ id: string; forma: Op; e?: number; f?: number }>, operatii: Op[], schema = 16): unknown {
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
const motivJob = (d: unknown): string => { const r = programDinDocument(deschis(d)); return r.ok ? '' : r.motiv; };
const DR40 = [{ id: 'a', forma: { tip: 'dreptunghi', latime: 40, inaltime: 20, razaColt: 0 }, e: 20, f: 20 }];

/** Distanța unui punct la un poligon închis și dacă e înăuntru (par-impar), pe hârtie. */
function laPoligon(p: Punct, pts: readonly Punct[]): { d: number; in: boolean } {
  let d = Infinity, inauntru = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[j]!, b = pts[i]!;
    const vx = b.x - a.x, vy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / (vx * vx + vy * vy)));
    d = Math.min(d, Math.hypot(p.x - a.x - t * vx, p.y - a.y - t * vy));
    if ((a.y > p.y) !== (b.y > p.y) && p.x < a.x + ((p.y - a.y) * vx) / vy) inauntru = !inauntru;
  }
  return { d, in: inauntru };
}

/**
 * Programul exportat (postul real), judecat pe sculă: tăiat la fiecare `T… M6`, bucata k cu `scule[k]`; suprafața e minimul
 * lor (fiecare bucată pornește de la fața de sus, deci minimul e ce rămâne după toate).
 */
function judecaPeScule(text: string, grila: GrilaOracol, scule: readonly SculaOracol[]): { z: Float64Array; nx: number; ny: number } {
  const bucati = text.split(/^T\d+ M6$/m);
  assert.equal(bucati.length, scule.length, `${bucati.length} bucăți de program, ${scule.length} scule`);
  let z: Float64Array | null = null, nx = 0, ny = 0;
  bucati.forEach((b, k) => {
    const o = judeca(b, grila, scule[k]!);
    nx = o.nx; ny = o.ny;
    z = z === null ? Float64Array.from(o.z) : z.map((v, i) => Math.min(v, o.z[i]!));
  });
  return { z: z!, nx, ny };
}

type Abateri = { sub: number; subDeparte: number; peste: number; afara: number; z: (x: number, y: number) => number };

/** Suprafața față de idealul −min(D, d·cot(θ/2)); `colt(x, y)` = zona în care creasta colțurilor e admisă. */
async function suprafata(
  forme: ReadonlyArray<{ id: string; forma: Op; e?: number; f?: number }>, op: Op, grila: GrilaOracol, unghi: number,
  d: (x: number, y: number) => number | null, colt: (x: number, y: number) => boolean,
): Promise<Abateri & { text: string; avertismente: readonly string[] }> {
  const operatie = vcarve(forme.map((f) => f.id), op);
  const D = operatie['adancime'] as number;
  const r = await calculeazaExport(deschis(doc(forme, [operatie])), { origine: 'stanga-jos', z0: 'sus' });
  if (!r.ok) assert.fail(r.motiv);
  const fp = operatie['fundPlat'] as typeof FUND | undefined;
  const vD = (operatie['scula'] as { diametru: number }).diametru;
  const scule: SculaOracol[] = r.program.text.includes(' M6') && fp ? [{ tip: 'plata', diametru: fp.scula.diametru }, { tip: 'v', diametru: vD, unghi }] : [{ tip: 'v', diametru: vD, unghi }];
  const o = judecaPeScule(r.program.text, grila, scule);
  const cot = 1 / Math.tan((unghi * Math.PI) / 360);
  let sub = 0, subDeparte = 0, peste = 0, afara = 0;
  for (let j = 0; j < o.ny; j++) {
    for (let i = 0; i < o.nx; i++) {
      const x = grila.x0 + (i + 0.5) * grila.celula, y = grila.y0 + (j + 0.5) * grila.celula;
      const z = o.z[j * o.nx + i]!, q = d(x, y);
      if (q === null) { afara = Math.max(afara, -z); continue; }
      const ideal = -Math.min(D, q * cot);
      sub = Math.max(sub, z - ideal);
      if (!colt(x, y)) subDeparte = Math.max(subDeparte, z - ideal);
      peste = Math.max(peste, ideal - z);
    }
  }
  const zLa = (x: number, y: number): number => {
    const i = Math.floor((x - grila.x0) / grila.celula), j = Math.floor((y - grila.y0) / grila.celula);
    return o.z[j * o.nx + i] ?? Number.NaN;
  };
  return { sub, subDeparte, peste, afara, z: zLa, text: r.program.text, avertismente: r.avertismente };
}

const dDr = (x0: number, y0: number, w: number, h: number) => (x: number, y: number): number | null =>
  (x > x0 && x < x0 + w && y > y0 && y < y0 + h ? Math.min(x - x0, x0 + w - x, y - y0, y0 + h - y) : null);
/** În pătratul de latură 2·r din jurul unui colț al dreptunghiului. */
const langaColt = (x0: number, y0: number, w: number, h: number, r: number) => (x: number, y: number): boolean =>
  [[x0, y0], [x0 + w, y0], [x0, y0 + h], [x0 + w, y0 + h]].some(([cx, cy]) => Math.abs(x - cx!) < r && Math.abs(y - cy!) < r);

// ── Pe hârtie, pe oracol ─────────────────────────────────────────────────────────────────────────────────────────────

// Dreptunghiul 40 × 20 la (20, 20), V90, D = 3, freza dreaptă Ø3: fundul plat F = [23, 57] × [23, 37] la −3; freza dreaptă
// nu atinge colțurile lui F (până la w(D) + m + R = 4,502 de colțul dreptunghiului), unde inelele V lasă o creastă de cel mult c.
test('dreptunghiul 40 × 20, V90, D = 3, cu freza dreaptă Ø3: fundul la −3, pereții −d, nimic mai adânc; creasta doar în colțuri, cel mult c', async (t) => {
  const g: GrilaOracol = { x0: 18, y0: 18, latime: 44, inaltime: 24, celula: 0.05 };
  const r = await suprafata(DR40, {}, g, 90, dDr(20, 20, 40, 20), langaColt(20, 20, 40, 20, 4.6));
  t.diagnostic(`sub ${r.sub.toFixed(5)}, departe de colțuri ${r.subDeparte.toFixed(5)}, peste ${r.peste.toFixed(5)}, afară ${r.afara.toFixed(5)}`);
  assert.equal(r.text.match(/^T\d+ M6$/gm)?.join(), 'T1 M6', 'o singură schimbare: de la freza dreaptă la V');
  assert.match(r.text, /T2 freza dreapta D3/);
  assert.deepEqual(r.avertismente, []);
  assert.ok(r.peste <= 0.002, `mai adânc: ${r.peste}`);
  assert.ok(r.afara <= 1e-6, `în afară: ${r.afara}`);
  assert.ok(r.subDeparte <= 0.015, `material lăsat departe de colțuri: ${r.subDeparte}`);
  assert.ok(r.sub <= C + 0.015, `creasta din colțuri: ${r.sub}`);
  // Fundul exact, pe toată zona plată (departe de colțuri), și pereții −d.
  for (const [x, y, z] of [[40.025, 30.025, -3], [23.525, 30.025, -3], [56.475, 36.475, -3], [21.025, 30.025, -1.025], [40.025, 22.025, -2.025]] as const) {
    assert.ok(Math.abs(r.z(x, y) - z) <= 0.002, `(${x}, ${y}): ${r.z(x, y)} în loc de ${z}`);
  }
});

test('V60, D = 3: lățimea fundului e 20 − 2·3·tan 30° = 16,536 (coloana x = 40,025, celulele la −3)', async () => {
  const g: GrilaOracol = { x0: 38, y0: 18, latime: 4, inaltime: 24, celula: 0.05 };
  const r = await suprafata(DR40, { scula: V(60) }, g, 60, dDr(20, 20, 40, 20), () => false);
  assert.ok(r.peste <= 0.002 && r.subDeparte <= 0.015, JSON.stringify({ ...r, z: undefined, text: undefined }));
  let n = 0;
  for (let y = 20.025; y < 40; y += 0.05) if (Math.abs(r.z(40.025, y) + 3) <= 0.004) n++;
  assert.ok(Math.abs(n * 0.05 - (20 - 6 * Math.tan(Math.PI / 6))) <= 0.1, `fundul: ${n * 0.05} mm`);
});

// Două pătrate 20 × 20 legate printr-un canal 30 × 7,5: la V90, D = 3, fundul canalului e lat de 1,5 mm, mai îngust decât
// freza dreaptă Ø3; acolo îl fac inelele V. Colțurile concave ale gurilor canalului sunt arce în F.
const HALTERA: Punct[] = [
  { x: 20, y: 20 }, { x: 40, y: 20 }, { x: 40, y: 26.25 }, { x: 70, y: 26.25 }, { x: 70, y: 20 }, { x: 90, y: 20 },
  { x: 90, y: 40 }, { x: 70, y: 40 }, { x: 70, y: 33.75 }, { x: 40, y: 33.75 }, { x: 40, y: 40 }, { x: 20, y: 40 },
];
test('haltera (canalul mai îngust decât freza dreaptă): fundul canalului din inele V, cu creasta cel mult c; pătratele din freza dreaptă', async (t) => {
  const g: GrilaOracol = { x0: 18, y0: 18, latime: 74, inaltime: 24, celula: 0.1 };
  const forma = { tip: 'cale', inchis: true, varfuri: HALTERA.map((p) => ({ p, s: { tip: 'L' } })) };
  const d = (x: number, y: number): number | null => { const q = laPoligon({ x, y }, HALTERA); return q.in ? q.d : null; };
  const colt = (x: number, y: number): boolean => (x > 36 && x < 74) || langaColt(20, 20, 70, 20, 4.6)(x, y) || langaColt(20, 20, 20, 20, 4.6)(x, y) || langaColt(70, 20, 20, 20, 4.6)(x, y);
  const r = await suprafata([{ id: 'a', forma }], {}, g, 90, d, colt);
  t.diagnostic(`sub ${r.sub.toFixed(5)}, departe ${r.subDeparte.toFixed(5)}, peste ${r.peste.toFixed(5)}, afară ${r.afara.toFixed(5)}`);
  assert.ok(r.peste <= 0.002, `mai adânc: ${r.peste}`);
  assert.ok(r.afara <= 1e-6, `în afară: ${r.afara}`);
  assert.ok(r.subDeparte <= 0.015, `departe de canal și de colțuri: ${r.subDeparte}`);
  assert.ok(r.sub <= C + 0.015, `în canal și în colțuri: ${r.sub}`);
  // Mijlocul canalului, la −3 (cel mult creasta).
  for (const x of [45.05, 55.05, 65.05]) assert.ok(r.z(x, 30.05) <= -3 + C + 1e-9, `canalul la x = ${x}: ${r.z(x, 30.05)}`);
});

test('inelul R16 / R6 la V90, D = 2: freza dreaptă ajunge peste tot (fără colțuri), deci niciun inel V în fund', async () => {
  const r = traseuVcarve(P([cerc(30, 30, 16), cerc(30, 30, 6)], { unghi: 90, adancime: 2, pas: 1 }));
  if (!r.ok) assert.fail(r.motiv);
  assert.equal(r.statistici.ineleColturi, 0);
  assert.ok(r.fund.length > 0);
  const g: GrilaOracol = { x0: 13, y0: 13, latime: 34, inaltime: 34, celula: 0.05 };
  const forme = [{ id: 'a', forma: { tip: 'cerc', raza: 16 }, e: 30, f: 30 }, { id: 'b', forma: { tip: 'cerc', raza: 6 }, e: 30, f: 30 }];
  const d = (x: number, y: number): number | null => { const q = Math.hypot(x - 30, y - 30); return q > 6 && q < 16 ? Math.min(16 - q, q - 6) : null; };
  const s = await suprafata(forme, { adancime: 2, pas: 1 }, g, 90, d, () => false);
  assert.ok(s.peste <= 0.002 && s.subDeparte <= 0.015 && s.afara <= 1e-6, JSON.stringify({ ...s, z: undefined, text: undefined }));
});

test('dreptunghiul 12 × 7, V90, D = 3, freza dreaptă Ø3: fundul (6 × 1) e mai îngust decât ea, deci îl fac inelele V, cu avertisment; freza dreaptă doar pe primul nivel', async (t) => {
  const g: GrilaOracol = { x0: 18, y0: 18, latime: 16, inaltime: 11, celula: 0.05 };
  const forme = [{ id: 'a', forma: { tip: 'dreptunghi', latime: 12, inaltime: 7, razaColt: 0 }, e: 20, f: 20 }];
  const r = await suprafata(forme, {}, g, 90, dDr(20, 20, 12, 7), () => true);
  t.diagnostic(`sub ${r.sub.toFixed(5)}, peste ${r.peste.toFixed(5)}, afară ${r.afara.toFixed(5)}`);
  assert.ok(r.avertismente.some((a) => /freza dreaptă \(Ø3\) nu încape nicăieri în fundul plat: îl fac inelele frezei în V/.test(a)), r.avertismente.join(' | '));
  // Pe primul nivel (−1,5), zona {d ≥ 1,502} e lată de ~4 mm: acolo freza dreaptă încape; la −3, nu.
  const dreapta = r.text.split(/^T\d+ M6$/m)[0]!;
  assert.ok(r.text.includes('T1 M6'));
  assert.equal(Math.min(...[...dreapta.matchAll(/Z(-?\d+\.\d+)/g)].map((m) => Number(m[1]))), -1.5);
  assert.ok(r.peste <= 0.002 && r.afara <= 1e-6, `${r.peste} / ${r.afara}`);
  assert.ok(r.sub <= C + 0.015, `fundul din inele V: ${r.sub}`);
  // Mijlocul fundului (y = 23,5), la −3 cu cel mult creasta.
  for (const x of [24.025, 26.025, 28.025]) assert.ok(r.z(x, 23.525) <= -3 + C + 1e-9, `x = ${x}: ${r.z(x, 23.525)}`);
});

// ── Trecerile, pe oracol ─────────────────────────────────────────────────────────────────────────────────────────────

const REGIM = { avans: 1000, avansPlonjare: 300, zSigur: 5 };
const P = (c: readonly Contur[], x: Partial<ParametriVcarve> = {}): ParametriVcarve => ({
  contururi: c, unghi: 90, diametruScula: 20, adancime: 3, pas: 1, ...REGIM, fundPlat: { diametru: 3, pasLateral: 1.2, sens: 'urcare' }, ...x,
});
function cerc(cx: number, cy: number, r: number): Contur {
  return { inchis: true, varfuri: [{ p: { x: cx + r, y: cy }, s: { tip: 'A', bulge: 1 } }, { p: { x: cx - r, y: cy }, s: { tip: 'A', bulge: 1 } }] };
}
/** Programul simplu al unor mișcări (pentru prefixe), citit de oracol: G0 / G1 / G2 / G3, absolut, în mm. */
function gcode(m: readonly Miscare[], pana = m.length): string {
  const l = ['G21 G90', 'G0 X0 Y0 Z5'];
  let x = 0, y = 0;
  const f = (v: number) => v.toFixed(5);
  for (const q of m.slice(0, pana)) {
    if (q.tip !== 'rapida' && q.tip !== 'taiere' && q.tip !== 'arc') continue;
    const ax = (['X', 'Y', 'Z'] as const).filter((k) => q.la[k] !== undefined).map((k) => `${k}${f(q.la[k]!)}`).join(' ');
    if (q.tip === 'arc') l.push(`${q.sens === 'orar' ? 'G2' : 'G3'} ${ax} I${f(q.centru.x - x)} J${f(q.centru.y - y)} F${q.avans}`);
    else l.push(`${q.tip === 'rapida' ? 'G0' : 'G1'} ${ax}${q.tip === 'taiere' ? ` F${q.avans}` : ''}`);
    if (q.la.X !== undefined) x = q.la.X;
    if (q.la.Y !== undefined) y = q.la.Y;
  }
  return l.join('\n');
}

test('fiecare trecere scoate cel mult pasul: întâi nivelurile frezei drepte, apoi trecerile V peste fundul ei (prefixele, pe oracol)', () => {
  const g: GrilaOracol = { x0: -2, y0: -2, latime: 44, inaltime: 24, celula: 0.1 };
  const r = traseuVcarve(P([conturDreptunghi(0, 0, 40, 20, 0)], { pas: 1 }));
  if (!r.ok) assert.fail(r.motiv);
  assert.equal(r.statistici.sfarsitFund.length, 3);
  assert.equal(r.statistici.sfarsitTreceri.length, 3);
  assert.equal(r.statistici.sfarsitFund.at(-1), r.fund.length, 'ultimul nivel se termină la capătul frezei drepte');
  assert.ok(r.statistici.sfarsitFund.every((s, k, a) => k === 0 || s > a[k - 1]!), 'fiecare nivel taie ceva');
  const plata: SculaOracol = { tip: 'plata', diametru: 3 }, v: SculaOracol = { tip: 'v', diametru: 20, unghi: 90 };
  let inainte: Float64Array = new Float64Array(440 * 240);
  for (const sfarsit of r.statistici.sfarsitFund) {
    const o = judeca(gcode(r.fund, sfarsit), g, plata);
    let max = 0;
    for (let k = 0; k < o.z.length; k++) max = Math.max(max, inainte[k]! - o.z[k]!);
    assert.ok(max <= 1 + o.marja + 1e-9, `un nivel al frezei drepte a scos ${max.toFixed(5)} mm`);
    inainte = Float64Array.from(o.z);
  }
  const fundul = inainte;
  for (const sfarsit of r.statistici.sfarsitTreceri) {
    const o = judeca(gcode(r.miscari, sfarsit), g, v);
    let max = 0;
    const dupa = fundul.map((z, k) => Math.min(z, o.z[k]!));
    for (let k = 0; k < dupa.length; k++) max = Math.max(max, inainte[k]! - dupa[k]!);
    assert.ok(max <= 1 + o.marja + 1e-9, `o trecere V a scos ${max.toFixed(5)} mm`);
    inainte = dupa;
  }
});

// ── Lucrarea ─────────────────────────────────────────────────────────────────────────────────────────────────────────

test('lucrarea: freza dreaptă întâi (prima sculă a programului, fără forma V), apoi o schimbare la V; etichetele amândurora', () => {
  const r = programDinDocument(deschis(doc(DR40, [vcarve(['a'])])));
  if (!r.ok) assert.fail(r.motiv);
  assert.deepEqual(r.program.scula, { numar: 2, nume: 'freza dreapta', diametru: 3 });
  const schimbari = r.program.miscari.filter((m) => m.tip === 'schimba-scula');
  assert.deepEqual(schimbari.map((m) => m.tip === 'schimba-scula' && m.scula), [{ numar: 1, nume: 'freza V90', diametru: 20, forma: { tip: 'v', unghi: 90 } }]);
  const etichete = r.program.miscari.flatMap((m) => (m.tip === 'eticheta' ? [m.text] : []));
  assert.deepEqual(etichete, ['i/a: V-carve, fundul plat cu T2 Ø3', 'i/a: V-carve, până la 3 mm']);
  // Freza dreaptă nu coboară sub −3 și, la −L, nu iese din zona {d ≥ L·tan 45° + 0,002}: centrul ei la cel puțin L + 0,002 + 1,5
  // de pereți.
  const k = r.program.miscari.findIndex((m) => m.tip === 'schimba-scula');
  let x = 0, y = 0;
  let z = 5;
  for (const m of r.program.miscari.slice(0, k)) {
    if (m.tip !== 'taiere' && m.tip !== 'arc' && m.tip !== 'rapida') continue;
    x = m.la.X ?? x; y = m.la.Y ?? y; z = m.la.Z ?? z;
    assert.ok(z >= -3 - 1e-9, String(z));
    if (z < 0) assert.ok(Math.min(x - 20, 60 - x, y - 20, 40 - y) >= -z + 0.002 + 1.5 - 1e-6, `centrul la (${x}, ${y}, ${z})`);
  }
  // După schimbare, freza V nu taie unde centrul frezei drepte a ajuns (la peste 3 + 0,002 + 1,5 de pereți, ADR 0091 §2).
  for (const m of r.program.miscari.slice(k)) {
    if (m.tip !== 'taiere' && m.tip !== 'arc' && m.tip !== 'rapida') continue;
    x = m.la.X ?? x; y = m.la.Y ?? y; z = m.la.Z ?? z;
    if (z < 0) assert.ok(Math.min(x - 20, 60 - x, y - 20, 40 - y) <= 4.502 + 1e-6, `V la (${x}, ${y}, ${z})`);
  }
  // Sensul operației ajunge la buzunarul frezei drepte.
  const opus = programDinDocument(deschis(doc(DR40, [vcarve(['a'], { sens: 'opozitie' })])));
  if (!opus.ok) assert.fail(opus.motiv);
  assert.notDeepEqual(opus.program.miscari.slice(0, k), r.program.miscari.slice(0, k));
});

test('fără fund plat (forma mai îngustă decât V-ul la D), freza dreaptă nu se montează, cu avertisment', () => {
  const r = programDinDocument(deschis(doc([{ id: 'a', forma: { tip: 'dreptunghi', latime: 12, inaltime: 6, razaColt: 0 }, e: 20, f: 20 }], [vcarve(['a'], { adancime: 10, pas: 10 })])));
  if (!r.ok) assert.fail(r.motiv);
  assert.deepEqual(r.program.scula, V(90));
  assert.ok(!r.program.miscari.some((m) => m.tip === 'schimba-scula'));
  assert.ok(r.avertismente.some((a) => /n-are fund plat, deci freza dreaptă nu se montează/.test(a)), r.avertismente.join(' | '));
});

test('lucrarea refuză, cu motiv: fundul pe alt fel, freza fundului în V, pasul lateral peste raza ei, același T cu V-ul, T-ul fundului cu alt diametru', () => {
  assert.match(motivJob(doc(DR40, [{ ...vcarve(['a']), tip: 'profil', scula: { numar: 1, nume: 'f', diametru: 6 }, latura: 'exterior' }])), /fundul plat cu freza dreaptă e doar al unui V-carve/);
  assert.match(motivJob(doc(DR40, [vcarve(['a'], { fundPlat: { scula: { ...DREAPTA, forma: { tip: 'v', unghi: 90 } }, pasLateral: 1 } })])), /freza fundului plat \(T2\) trebuie să fie dreaptă, nu în V/);
  assert.match(motivJob(doc(DR40, [vcarve(['a'], { fundPlat: { scula: DREAPTA, pasLateral: 1.6 } })])), /pasul lateral al frezei drepte, de 1\.6 mm, trebuie să fie în \(0, 1\.5\]/);
  assert.match(motivJob(doc(DR40, [vcarve(['a'], { fundPlat: { scula: { ...DREAPTA, numar: 1 }, pasLateral: 1 } })])), /T1 are două diametre \(20 și 3 mm\)/);
  assert.match(motivJob(doc(DR40, [vcarve(['a'], { scula: V(90, 3), fundPlat: { scula: { ...DREAPTA, numar: 1 }, pasLateral: 1 } })])), /T1 are două freze de Ø3 \(în V de 90° și plată\)/);
  const profil = { id: 'q', tip: 'profil', noduri: ['b'], scula: { numar: 2, nume: 'freza plata', diametru: 6 }, latura: 'exterior', sens: 'urcare', adancime: 3, pas: 3, urechi: null, rampa: null, intrari: null, colturi: null };
  assert.match(motivJob(doc([...DR40, { id: 'b', forma: { tip: 'cerc', raza: 5 }, e: 120, f: 80 }], [vcarve(['a']), profil])), /T2 are două diametre/);
});

// ── Ușa v15 ──────────────────────────────────────────────────────────────────────────────────────────────────────────

test('ușa v15: `fundPlat` = { scula ca a operației, pasLateral în (0, 50] } (câmpurile necunoscute rămân); în v14 nu e valid; un v14 curat urcă (prin v15) la v16', () => {
  const cuCamp = deschis(doc(DR40, [vcarve(['a'], { fundPlat: { scula: { ...DREAPTA, cod: 'X' }, pasLateral: 1.2, nota: 'n' } })]));
  const fp = cuCamp.piese[0]!.operatii[0]!.fundPlat as Record<string, unknown>;
  assert.equal(fp['nota'], 'n');
  assert.equal((fp['scula'] as Record<string, unknown>)['cod'], 'X');
  for (const rau of [null, 'T2', {}, { scula: DREAPTA }, { pasLateral: 1 }, { scula: { ...DREAPTA, numar: 0 }, pasLateral: 1 }, { scula: { ...DREAPTA, diametru: 0 }, pasLateral: 1 },
    { scula: { ...DREAPTA, diametru: 101 }, pasLateral: 1 }, { scula: DREAPTA, pasLateral: 0 }, { scula: DREAPTA, pasLateral: 51 }, { scula: DREAPTA, pasLateral: '1' },
    { scula: { ...DREAPTA, forma: { tip: 'v', unghi: 0 } }, pasLateral: 1 }]) {
    assert.ok(!incarca(doc(DR40, [vcarve(['a'], { fundPlat: rau })])).ok, JSON.stringify(rau));
  }
  const a = incarca(doc(DR40, [vcarve(['a'])], 14));
  assert.ok(!a.ok && /are câmpul „fundPlat”, pe care v15 îl folosește: nu e un document v14 valid/.test(a.motiv), a.ok ? '' : a.motiv);
  const { fundPlat: _f, ...faraFund } = vcarve(['a']);
  void _f;
  const curat = doc(DR40, [faraFund], 14);
  const c = incarca(curat);
  assert.ok(c.ok);
  if (c.ok) assert.deepEqual(c.doc, { ...(curat as Record<string, unknown>), schema: 16 }, 'doar numărul');
});

// ── Ce scrie Exportă ─────────────────────────────────────────────────────────────────────────────────────────────────

test('ce scrie Exportă (ADR 0091): fundul plat doar pe un V-carve cu bifa, îmbinat cu cel din document (forma pleacă); scos cu bifa scoasă sau pe alt fel', () => {
  const op = deschis(doc(DR40, [vcarve(['a'])])).piese[0]!.operatii[0]!;
  const v = { latura: 'interior', sens: 'urcare', adancime: 3, pas: 1.5, urechi: null, rampa: null, intrari: null, colturi: null, tip: 'vcarve' } as const;
  const sV = { numar: 1, diametru: 20, forma: { tip: 'v', unghi: 90 } } as const;
  // Fără nicio schimbare, aceeași operație (Exportă nu scrie o comandă).
  assert.deepEqual(operatieDinDialog(op, { ...v, fundPlat: { numar: 2, diametru: 3, pasLateral: 1.2 } }, sV), op);
  assert.deepEqual(operatieDinDialog(op, undefined, sV), op);
  // Schimbat: numărul, diametrul și pasul; câmpurile necunoscute și numele rămân, forma (o freză în V) pleacă.
  const cuCampuri = { ...op, fundPlat: { scula: { numar: 2, nume: 'a mea', diametru: 3, cod: 'X', forma: { tip: 'v', unghi: 90 } }, pasLateral: 1.2, nota: 'n' } } as Operatie;
  assert.deepEqual(operatieDinDialog(cuCampuri, { ...v, fundPlat: { numar: 3, diametru: 4, pasLateral: 1.5 } }, sV).fundPlat,
    { scula: { numar: 3, nume: 'a mea', diametru: 4, cod: 'X' }, pasLateral: 1.5, nota: 'n' });
  // Bifa scoasă, sau alt fel de operație: câmpul pleacă.
  assert.ok(!Object.hasOwn(operatieDinDialog(op, { ...v, fundPlat: null }, sV), 'fundPlat'));
  assert.ok(!Object.hasOwn(operatieDinDialog(op, { ...v, tip: 'buzunar', pasLateral: 2, fundPlat: { numar: 2, diametru: 3, pasLateral: 1.2 } }, { numar: 1, diametru: 6 }), 'fundPlat'));
  // Un fund nou: „freza dreapta”.
  const { fundPlat: _f, ...fara } = op;
  void _f;
  assert.deepEqual(operatieDinDialog(fara as Operatie, { ...v, fundPlat: { numar: 2, diametru: 3.175, pasLateral: 1.3 } }, sV).fundPlat,
    { scula: { numar: 2, nume: 'freza dreapta', diametru: 3.175 }, pasLateral: 1.3 });
});
