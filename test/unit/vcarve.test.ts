/**
 * V-carve-ul (ADR 0090): adâncimea pe hârtie (dreptunghiul, cercul, triunghiul, inelul), suprafața pe oracolul independent
 * al simulării față de suprafața ideală −min(D, d·cot(θ/2)) (d = distanța la contur, pe hârtie): niciodată mai adânc, sub ea
 * cel mult cât toleranțele axei; fundul plat (pereții exacți, fundul lăsat, cu avertisment); fiecare trecere scoate cel mult
 * pasul (prefixele programului pe oracol); refuzurile (traseul, lucrarea); legalizarea Delaunay; ușa v14 (din 8.2↑, documentele
 * urcă la v16) și ce scrie Exportă. Fundul plat cu freza dreaptă (ADR 0091): `vcarve.fund.test.ts`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Delaunator from 'delaunator';
import { incircle, orient2d } from 'robust-predicates';
import { operatieDinDialog } from '../../src/app/valoriOperatii.ts';
import { axaMediala, legalizeaza } from '../../src/cam/axaMediala.ts';
import { programDinDocument } from '../../src/cam/job.ts';
import { regiunePastrata } from '../../src/cam/regiune.ts';
import { traseuVcarve, type ParametriVcarve } from '../../src/cam/vcarve.ts';
import { conturCerc, conturDreptunghi, LINIE, type Contur, type Punct } from '../../src/geom/conturBaza.ts';
import type { Miscare } from '../../src/ir/ir.ts';
import { incarca } from '../../src/model/incarcare.ts';
import { taieturiFoaie } from '../../src/model/lume.ts';
import { calculeazaExport } from '../../src/ui/actiuniExportCalcul.ts';
import { judeca, type GrilaOracol, type SculaOracol } from '../oracles/simulare.ts';

const REGIM = { avans: 1000, avansPlonjare: 300, zSigur: 5 };
const P = (c: readonly Contur[], x: Partial<ParametriVcarve> = {}): ParametriVcarve => ({
  contururi: c, unghi: 90, diametruScula: 20, adancime: 20, pas: 20, ...REGIM, ...x,
});
const poligon = (pts: readonly Punct[]): Contur => ({ inchis: true, varfuri: pts.map((p) => ({ p, s: LINIE })) });
const zMin = (m: readonly Miscare[]): number => Math.min(...m.flatMap((q) => (q.tip === 'taiere' && q.la.Z !== undefined ? [q.la.Z] : [])));
const bun = (p: ParametriVcarve) => {
  const r = traseuVcarve(p);
  if (!r.ok) assert.fail(r.motiv);
  return r;
};

// ── Pe hârtie ────────────────────────────────────────────────────────────────────────────────────────────────────────

test('adâncimea pe hârtie: z = −r·cot(θ/2) în centrul cercului înscris (dreptunghi, cerc, triunghi echilateral, inel)', () => {
  const tri = poligon([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 5 * Math.sqrt(3) }]);
  const cazuri: [string, Contur[], number, number][] = [
    ['dreptunghi 12 × 6, 90°', [conturDreptunghi(0, 0, 12, 6, 0)], 90, -3],
    ['cercul R2,5, 60°', [conturCerc(0, 0, 2.5)], 60, -2.5 / Math.tan(Math.PI / 6)],
    ['triunghiul de latură 10, 90° (r = 10 / 2√3)', [tri], 90, -10 / (2 * Math.sqrt(3))],
    ['inelul R10 / R6, 90° (r = 2)', [conturCerc(0, 0, 10), conturCerc(0, 0, 6)], 90, -2],
  ];
  for (const [nume, c, unghi, asteptat] of cazuri) {
    const r = bun(P(c, { unghi }));
    assert.ok(Math.abs(zMin(r.miscari) - asteptat) < 1e-4, `${nume}: ${zMin(r.miscari)} în loc de ${asteptat}`);
    assert.equal(r.statistici.fundPlat, false, nume);
    assert.equal(r.statistici.treceri, 1, nume);
  }
});

test('trecerile pe hârtie: dreptunghiul 12 × 6 la 90°, 3 mm în pași de cel mult 1,2 = 3 × 1; niciun Z sub ultimul nivel', () => {
  const r = bun(P([conturDreptunghi(0, 0, 12, 6, 0)], { pas: 1.2 }));
  assert.equal(r.statistici.treceri, 3);
  assert.equal(r.statistici.sfarsitTreceri.length, 3);
  let inceput = 0;
  r.statistici.sfarsitTreceri.forEach((sfarsit, k) => {
    const z = zMin(r.miscari.slice(inceput, sfarsit));
    assert.ok(Math.abs(z + (k + 1)) < 1e-9, `trecerea ${k + 1}: ${z}`);
    inceput = sfarsit;
  });
  // Trecerea k taie doar sub nivelul trecerii de dinainte (nu reia aerul).
  inceput = 0;
  r.statistici.sfarsitTreceri.forEach((sfarsit, k) => {
    for (const m of r.miscari.slice(inceput, sfarsit)) {
      if (m.tip === 'taiere' && m.la.X !== undefined) assert.ok(m.la.Z! <= -k + 1e-9 && m.la.Z! >= -(k + 1) - 1e-9, `trecerea ${k + 1}: Z ${m.la.Z}`);
    }
    inceput = sfarsit;
  });
  // Nicio rapidă în material; pe Z, freza coboară cel mult cu avansul de plonjare (300).
  let poz = { X: 0, Y: 0, Z: 5 };
  for (const m of r.miscari) {
    if (m.tip !== 'rapida' && m.tip !== 'taiere') continue;
    const urm = { X: m.la.X ?? poz.X, Y: m.la.Y ?? poz.Y, Z: m.la.Z ?? poz.Z };
    if (m.tip === 'rapida') assert.ok(urm.Z >= 0, `rapidă la Z ${urm.Z}`);
    const dz = urm.Z - poz.Z, L = Math.hypot(urm.X - poz.X, urm.Y - poz.Y, dz);
    if (m.tip === 'taiere' && dz < 0 && L > 0) assert.ok((m.avans * -dz) / L <= 300 + 1e-6, `pe Z: ${(m.avans * -dz) / L}`);
    poz = urm;
  }
  // Program închis: pleacă și se termină la Z-ul de siguranță.
  assert.deepEqual(r.miscari[0], { tip: 'rapida', la: { Z: 5 } });
  assert.deepEqual(r.miscari.at(-1), { tip: 'rapida', la: { Z: 5 } });
});

test('eșantioanele pe hârtie: dreptunghiul 12 × 6 la h = 0,02 are 2·(600 + 300) = 1 800 (câte unul la cel mult h, fără capătul fiecărei laturi)', () => {
  assert.equal(bun(P([conturDreptunghi(0, 0, 12, 6, 0)])).statistici.esantioane, 1800);
});

test('colțurile convexe: freza ajunge în vârful fiecăruia (la z = 0), pe dreptunghi și pe cele 5 vârfuri ale stelei', () => {
  const stea = poligon(Array.from({ length: 10 }, (_, k) => {
    const r = k % 2 === 0 ? 8 : 3.2, u = Math.PI / 2 + (k * Math.PI) / 5;
    return { x: r * Math.cos(u), y: r * Math.sin(u) };
  }));
  const varfuriStea = stea.varfuri.filter((_, k) => k % 2 === 0).map((v) => v.p);
  for (const [nume, c, colturi] of [
    ['dreptunghiul', conturDreptunghi(0, 0, 12, 6, 0), [{ x: 0, y: 0 }, { x: 12, y: 0 }, { x: 12, y: 6 }, { x: 0, y: 6 }]],
    ['steaua', stea, varfuriStea],
  ] as const) {
    const r = bun(P([c]));
    const pe: Punct[] = [];
    let x = 0, y = 0;
    for (const m of r.miscari) {
      if (m.tip !== 'rapida' && m.tip !== 'taiere') continue;
      x = m.la.X ?? x; y = m.la.Y ?? y;
      pe.push({ x, y });
    }
    for (const k of colturi) assert.ok(pe.some((q) => Math.hypot(q.x - k.x, q.y - k.y) <= 1e-6), `${nume}: colțul (${k.x}, ${k.y})`);
  }
});

// Două dreptunghiuri la 0,004 mm, cu eșantioanele decalate cu h/2: în golul îngust, triunghiurile de afară au centrul în
// regiune, deci muchiile duale ale laturilor de contur ar lega noduri de lângă contur. Ele nu intră în axă: măsurat 1 811
// muchii pe 1 810 noduri; cu ele, 2 407 (iar programul crește de trei ori, calculul de 50 de ori). Pragul stă între.
test('axa nu primește muchiile duale ale laturilor de contur: două dreptunghiuri la 0,004 mm, cel mult noduri + 50 de muchii', () => {
  const g = axaMediala([conturDreptunghi(0, 0, 6, 6, 0), conturDreptunghi(6.004, 0.01, 6, 6, 0)], 0.02);
  const muchii = g.vecini.reduce((n, v) => n + v.length, 0) / 2;
  assert.ok(muchii <= g.noduri.length + 50, `${muchii} muchii pe ${g.noduri.length} noduri`);
});

test('două grupe, una mai îngustă decât freza la D: pereții doar pe cea lată (cea îngustă n-are inel), fără refuz', () => {
  const r = bun(P([conturDreptunghi(0, 0, 12, 6, 0), conturDreptunghi(20, 0, 40, 20, 0)], { adancime: 5, pas: 5 }));
  assert.equal(r.statistici.fundPlat, true);
  assert.ok(Math.abs(zMin(r.miscari) + 5) < 1e-9);
});

test('refuzurile traseului: calea deschisă, unghiul în afara (0°, 180°), adâncimea sau pasul ne-pozitive, conul prea scurt', () => {
  const dr = [conturDreptunghi(0, 0, 12, 6, 0)];
  const motiv = (p: ParametriVcarve): string => { const r = traseuVcarve(p); return r.ok ? '' : r.motiv; };
  assert.match(motiv(P([{ ...dr[0]!, inchis: false }])), /contururi închise/);
  assert.match(motiv(P([])), /contururi închise/);
  for (const unghi of [0, 180, -10, Number.NaN]) assert.match(motiv(P(dr, { unghi })), /unghiul frezei/, String(unghi));
  assert.match(motiv(P(dr, { adancime: 0 })), /adâncimea maximă/);
  assert.match(motiv(P(dr, { pas: 0 })), /pasul/);
  // Conul unei freze V90 de Ø4 are 2 mm; dreptunghiul 12 × 6 cere 3. Cu D = 2 (fund plat), încape.
  assert.match(motiv(P(dr, { diametruScula: 4 })), /conul frezei în V \(Ø4, 90°\) are 2\.000 mm/);
  assert.ok(traseuVcarve(P(dr, { diametruScula: 4, adancime: 2 })).ok);
});

// ── Legalizarea Delaunay ─────────────────────────────────────────────────────────────────────────────────────────────

/** Muchiile interioare care nu sunt local Delaunay, cu predicatele robuste (independent de `legalizeaza`). */
function ilegale(T: Uint32Array, HE: Int32Array, xy: Float64Array): number {
  let n = 0;
  for (let e = 0; e < HE.length; e++) {
    const f = HE[e]!;
    if (f < e) continue;
    const t = e - (e % 3), u = f - (f % 3);
    const [a, b, c] = [T[t]!, T[t + 1]!, T[t + 2]!];
    const d = T[u + ((f + 2) % 3)]!;
    const o = orient2d(xy[2 * a]!, xy[2 * a + 1]!, xy[2 * b]!, xy[2 * b + 1]!, xy[2 * c]!, xy[2 * c + 1]!);
    const i = incircle(xy[2 * a]!, xy[2 * a + 1]!, xy[2 * b]!, xy[2 * b + 1]!, xy[2 * c]!, xy[2 * c + 1]!, xy[2 * d]!, xy[2 * d + 1]!);
    if (i * (o < 0 ? 1 : -1) > 0) n++;
  }
  return n;
}

test('legalizarea: patrulaterul cu diagonala lungă se întoarce o dată (pe cea scurtă); a doua oară, nimic; triangulările eșantioanelor rămân Delaunay', () => {
  const xy = new Float64Array([-1, 0, 0, -0.3, 1, 0, 0, 0.3]);
  const T = new Uint32Array([0, 1, 2, 0, 2, 3]);
  const HE = new Int32Array([-1, -1, 3, 2, -1, -1]);
  assert.equal(ilegale(T, HE, xy), 1);
  assert.equal(legalizeaza(T, HE, xy), 1);
  assert.equal(ilegale(T, HE, xy), 0);
  for (const t of [0, 3]) assert.ok([1, 3].every((v) => [T[t], T[t + 1], T[t + 2]].includes(v)), `triunghiul ${T.slice(t, t + 3).join(',')}`);
  assert.equal(legalizeaza(T, HE, xy), 0);
  // Evantaiul din primul vârf al unei elipse (puncte în poziție convexă): întoarcerile se propagă din muchie în muchie.
  const n = 14, ex = new Float64Array(2 * n);
  for (let k = 0; k < n; k++) { ex[2 * k] = 3 * Math.cos((2 * Math.PI * k) / n); ex[2 * k + 1] = Math.sin((2 * Math.PI * k) / n); }
  const Te = new Uint32Array(3 * (n - 2)), HEe = new Int32Array(3 * (n - 2)).fill(-1);
  for (let k = 0; k < n - 2; k++) {
    Te.set([0, k + 1, k + 2], 3 * k);
    if (k + 1 < n - 2) { HEe[3 * k + 2] = 3 * (k + 1); HEe[3 * (k + 1)] = 3 * k + 2; }
  }
  assert.ok(ilegale(Te, HEe, ex) > 0);
  assert.ok(legalizeaza(Te, HEe, ex) > n - 3, 'mai multe întoarceri decât muchiile evantaiului: cascada');
  assert.equal(ilegale(Te, HEe, ex), 0);
  // Eșantioanele unui cerc și ale unui dreptunghi rotunjit: puncte conciclice, unde testul ne-robust al lui Delaunator greșește.
  for (const c of [conturCerc(0, 0, 3), conturDreptunghi(0, 0, 20, 10, 3)]) {
    const pts: number[] = [];
    for (const v of c.varfuri) pts.push(v.p.x, v.p.y);
    for (let k = 0; k < 400; k++) {
      const u = (2 * Math.PI * k) / 400;
      pts.push(3 * Math.cos(u), 3 * Math.sin(u));
    }
    const d = new Delaunator(Float64Array.from(pts));
    const T2 = Uint32Array.from(d.triangles), HE2 = Int32Array.from(d.halfedges);
    legalizeaza(T2, HE2, d.coords as Float64Array);
    assert.equal(ilegale(T2, HE2, d.coords as Float64Array), 0);
  }
});

// ── Documentul, lucrarea și programul ────────────────────────────────────────────────────────────────────────────────

type Op = Record<string, unknown>;
const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const V = (unghi: number, diametru = 20) => ({ numar: 1, nume: `freza V${unghi}`, diametru, forma: { tip: 'v', unghi } });
const vcarve = (noduri: string[], extra: Op = {}): Op => ({
  id: 'v', tip: 'vcarve', noduri, scula: V(90), latura: 'interior', sens: 'urcare', adancime: 10, pas: 10,
  urechi: null, rampa: null, intrari: null, colturi: null, ...extra,
});
/** O piesă cu formele date și operațiile ei, la (x, y) pe o foaie de 200 × 150 × 18. */
function doc(forme: ReadonlyArray<{ id: string; forma: Op; e?: number; f?: number }>, operatii: Op[], x = 0, y = 0, schema = 16): unknown {
  const noduri = forme.map((c) => ({ tip: 'element', id: c.id, matrice: { ...I, e: c.e ?? 0, f: c.f ?? 0 }, forma: c.forma }));
  return {
    schema, rev: 0, piese: [{ id: 'p', radacina: { tip: 'grup', id: 'r', matrice: { ...I }, copii: noduri }, operatii }],
    foi: [{ id: 'f1', stoc: { latime: 200, inaltime: 150, grosime: 18 }, instante: [{ id: 'i', piesa: 'p', x, y, rotire: 0 }] }],
  };
}
const deschis = (d: unknown) => {
  const r = incarca(d);
  if (!r.ok) assert.fail(r.motiv);
  return r.doc;
};
const motivJob = (d: unknown): string => { const r = programDinDocument(deschis(d)); return r.ok ? '' : r.motiv; };
const DR = { tip: 'dreptunghi', latime: 12, inaltime: 6, razaColt: 0 };

test('lucrarea: contururile operației = o singură regiune par-impar (inelul din două cercuri), o etichetă; nu sunt inele ale regiunii păstrate', () => {
  const d = deschis(doc([{ id: 'a', forma: { tip: 'cerc', raza: 10 }, e: 20, f: 20 }, { id: 'b', forma: { tip: 'cerc', raza: 6 }, e: 20, f: 20 }], [vcarve(['a', 'b'])], 10, 10));
  const r = programDinDocument(d);
  if (!r.ok) assert.fail(r.motiv);
  const etichete = r.program.miscari.filter((m) => m.tip === 'eticheta');
  assert.equal(etichete.filter((m) => m.tip === 'eticheta' && /V-carve, până la 10 mm/.test(m.text)).length, 1);
  assert.ok(etichete.some((m) => m.tip === 'eticheta' && / \(\+1\): V-carve/.test(m.text)));
  // Inelul R10 / R6 la 90°: 2 mm, nu 6 (cercul mic e gaura regiunii, nu o a doua regiune).
  const z = r.program.miscari.flatMap((m) => (m.tip === 'taiere' && m.la.Z !== undefined ? [m.la.Z] : []));
  assert.ok(Math.abs(Math.min(...z) + 2) < 1e-4, String(Math.min(...z)));
  // Forma frezei trece în IR (simularea și postul o citesc de acolo).
  assert.deepEqual(r.program.scula.forma, { tip: 'v', unghi: 90 });
  const reg = regiunePastrata(taieturiFoaie(d));
  assert.ok(reg.ok && reg.regiune.inele.length === 0, 'V-carve-ul nu e inel');
});

test('lucrarea refuză, cu motiv: freza plată, calea deschisă, ce e al profilului (urechi, latura exterior, despărțirea), conul prea scurt', () => {
  const dr = [{ id: 'a', forma: DR, e: 20, f: 20 }];
  assert.match(motivJob(doc(dr, [vcarve(['a'], { scula: { numar: 2, nume: 'freza plata', diametru: 6 } })])), /V-carve-ul cere o freză în V \(T2 e plată\)/);
  const linie = { tip: 'cale', inchis: false, varfuri: [{ p: { x: 0, y: 0 }, s: { tip: 'L' } }, { p: { x: 10, y: 0 }, s: { tip: 'L' } }] };
  assert.match(motivJob(doc([...dr, { id: 'b', forma: linie }], [vcarve(['a', 'b'])])), /contururi închise, iar calea e deschisă/);
  for (const extra of [{ urechi: { numar: 2, latime: 8, grosime: 2 } }, { latura: 'exterior' }, { despartire: true }]) {
    assert.match(motivJob(doc(dr, [vcarve(['a'], extra)])), /un V-carve sapă înăuntrul contururilor/, JSON.stringify(extra));
  }
  assert.match(motivJob(doc(dr, [vcarve(['a'], { scula: V(90, 4) })])), /conul frezei în V \(Ø4, 90°\)/);
});

/** Programul simplu al unor mișcări (pentru prefixele trecerilor), citit de oracol: G0 / G1 / G2 / G3, absolut, în mm. */
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

type Caz = {
  readonly nume: string; readonly forme: ReadonlyArray<{ id: string; forma: Op; e?: number; f?: number }>; readonly unghi: number;
  readonly adancime: number; readonly pas?: number; readonly grila: GrilaOracol;
  /** Distanța la contur pe hârtie, în coordonatele foii (null = în afara regiunii). */
  readonly d: (x: number, y: number) => number | null;
};
const STEA: Punct[] = Array.from({ length: 10 }, (_, k) => {
  const r = k % 2 === 0 ? 8 : 3.2, u = Math.PI / 2 + (k * Math.PI) / 5;
  return { x: r * Math.cos(u), y: r * Math.sin(u) };
});
// Elipsa 10 × 4 ca poligon cu 720 de laturi: axa e un segment drept pe care raza nu variază liniar (r = 4·√(1 − x²/84) pe
// mijloc), deci simplificarea trebuie să țină cont de r; vârfurile aproape plate dau ramuri mici, de tăiat doar sub 0,004.
const ELIPSA: Punct[] = Array.from({ length: 720 }, (_, k) => ({ x: 10 * Math.cos((2 * Math.PI * k) / 720), y: 4 * Math.sin((2 * Math.PI * k) / 720) }));
const CAZURI: Caz[] = [
  { nume: 'dreptunghiul 12 × 6, 90°', forme: [{ id: 'a', forma: DR, e: 20, f: 20 }], unghi: 90, adancime: 10,
    grila: { x0: 18, y0: 18, latime: 16, inaltime: 10, celula: 0.05 },
    d: (x, y) => (x > 20 && x < 32 && y > 20 && y < 26 ? Math.min(x - 20, 32 - x, y - 20, 26 - y) : null) },
  { nume: 'cercul R5, 60°', forme: [{ id: 'a', forma: { tip: 'cerc', raza: 5 }, e: 30, f: 30 }], unghi: 60, adancime: 10,
    grila: { x0: 24, y0: 24, latime: 12, inaltime: 12, celula: 0.05 },
    d: (x, y) => { const q = 5 - Math.hypot(x - 30, y - 30); return q > 0 ? q : null; } },
  { nume: 'inelul R10 / R6, 90°', forme: [{ id: 'a', forma: { tip: 'cerc', raza: 10 }, e: 30, f: 30 }, { id: 'b', forma: { tip: 'cerc', raza: 6 }, e: 30, f: 30 }],
    unghi: 90, adancime: 10, grila: { x0: 19, y0: 19, latime: 22, inaltime: 22, celula: 0.05 },
    d: (x, y) => { const q = Math.hypot(x - 30, y - 30); return q > 6 && q < 10 ? Math.min(10 - q, q - 6) : null; } },
  { nume: 'steaua R8 / R3,2 (colțuri concave), 90°', forme: [{ id: 'a', forma: { tip: 'cale', inchis: true, varfuri: STEA.map((p) => ({ p, s: { tip: 'L' } })) }, e: 30, f: 30 }],
    unghi: 90, adancime: 10, grila: { x0: 21.5, y0: 21.5, latime: 17, inaltime: 17, celula: 0.05 },
    d: (x, y) => { const q = laPoligon({ x: x - 30, y: y - 30 }, STEA); return q.in ? q.d : null; } },
  { nume: 'elipsa 10 × 4 (720 de laturi), 60°', forme: [{ id: 'a', forma: { tip: 'cale', inchis: true, varfuri: ELIPSA.map((p) => ({ p, s: { tip: 'L' } })) }, e: 30, f: 30 }],
    unghi: 60, adancime: 10, grila: { x0: 19.5, y0: 25.5, latime: 21, inaltime: 9, celula: 0.05 },
    d: (x, y) => { const q = laPoligon({ x: x - 30, y: y - 30 }, ELIPSA); return q.in ? q.d : null; } },
  { nume: 'dreptunghiul rotunjit 20 × 10, R3, 120°', forme: [{ id: 'a', forma: { tip: 'dreptunghi', latime: 20, inaltime: 10, razaColt: 3 }, e: 20, f: 20 }],
    unghi: 120, adancime: 10, grila: { x0: 19, y0: 19, latime: 22, inaltime: 12, celula: 0.05 },
    d: (x, y) => {
      const qx = Math.abs(x - 30), qy = Math.abs(y - 25), a = 10, b = 5, r = 3;
      const q = qx > a - r && qy > b - r ? r - Math.hypot(qx - (a - r), qy - (b - r)) : Math.min(a - qx, b - qy);
      return q > 0 ? q : null;
    } },
];

/** Programul exportat al cazului (postul real), pe oracol, față de suprafața ideală −min(D, d·cot(θ/2)). */
async function suprafata(c: Caz, extra: Op = {}): Promise<{ sub: number; peste: number; afara: number; pereti: number; z: (x: number, y: number) => number; avertismente: readonly string[] }> {
  const d = deschis(doc(c.forme, [vcarve(c.forme.map((f) => f.id), { scula: V(c.unghi), adancime: c.adancime, pas: c.pas ?? c.adancime, ...extra })]));
  const r = await calculeazaExport(d, { origine: 'stanga-jos', z0: 'sus' });
  if (!r.ok) assert.fail(r.motiv);
  const scula: SculaOracol = { tip: 'v', diametru: 20, unghi: c.unghi };
  const o = judeca(r.program.text, c.grila, scula);
  const cot = 1 / Math.tan((c.unghi * Math.PI) / 360);
  let sub = 0, peste = 0, afara = 0, pereti = 0;
  const wD = c.adancime / cot;
  for (let j = 0; j < o.ny; j++) {
    for (let i = 0; i < o.nx; i++) {
      const x = c.grila.x0 + (i + 0.5) * c.grila.celula, y = c.grila.y0 + (j + 0.5) * c.grila.celula;
      const z = o.z[j * o.nx + i] ?? Number.NaN, q = c.d(x, y);
      if (q === null) { afara = Math.max(afara, -z); continue; }
      const ideal = -Math.min(c.adancime, q * cot);
      sub = Math.max(sub, z - ideal);
      peste = Math.max(peste, ideal - z);
      if (q < wD - c.grila.celula) pereti = Math.max(pereti, Math.abs(z - ideal));
    }
  }
  const zLa = (x: number, y: number): number => {
    const i = Math.floor((x - c.grila.x0) / c.grila.celula), j = Math.floor((y - c.grila.y0) / c.grila.celula);
    return o.z[j * o.nx + i] ?? Number.NaN;
  };
  return { sub, peste, afara, pereti, z: zLa, avertismente: r.avertismente };
}

// „Mai adânc” ≤ 0,002: raza e exactă, deci conul nu trece de suprafața ideală; rămâne rotunjirea G-code-ului la 0,001 mm pe
// X, Y și Z (cel mult √2·0,0005·cot(θ/2) + 0,0005 ≈ 0,0017 la 60°). Măsurat (27.10): ≤ 0,0011; sub ea ≤ 0,0054 (inelul).
test('oracolul simulării: suprafața ideală −d·cot(θ/2), fără fund plat: niciodată mai adânc (≤ 0,002), sub ea cel mult 0,015; nimic tăiat în afară', async (t) => {
  for (const c of CAZURI) {
    const r = await suprafata(c);
    t.diagnostic(`${c.nume}: sub ideală ${r.sub.toFixed(5)}, peste ${r.peste.toFixed(5)}, în afară ${r.afara.toFixed(5)}`);
    assert.ok(r.peste <= 0.002, `${c.nume}: ${r.peste.toFixed(5)} mm sub suprafața ideală`);
    assert.ok(r.sub <= 0.015, `${c.nume}: ${r.sub.toFixed(5)} mm de material lăsat`);
    assert.ok(r.afara <= 1e-6, `${c.nume}: ${r.afara} mm tăiat în afara regiunii`);
  }
});

test('fundul plat: dreptunghiul 12 × 6 la 90°, D = 1,5: pereții exacți până la wD = 1,5, axa la −1,5, fundul dintre ele lăsat, cu avertisment', async () => {
  const c = { ...CAZURI[0]!, adancime: 1.5 };
  const r = await suprafata(c);
  assert.ok(r.peste <= 0.002, `${r.peste}`);
  assert.ok(r.afara <= 1e-6, `${r.afara}`);
  assert.ok(r.avertismente.some((a) => /mai lată decât freza la 1\.5 mm \(3\.000 mm\).*fundul plat/.test(a)), r.avertismente.join(' | '));
  assert.ok(r.pereti <= 0.01, `pereții: ${r.pereti}`);
  // Inelul R10 / R6 la 90°, D = 1: pereții exacți pe ambele cercuri (inelele regiunii decalate, cu gaura ei).
  const inel = await suprafata({ ...CAZURI[2]!, adancime: 1 });
  assert.ok(inel.peste <= 0.002 && inel.afara <= 1e-6 && inel.pereti <= 0.01, JSON.stringify({ ...inel, z: undefined }));
  // În centrele celulelor (x = 26,025): peretele, la d = 1,025 de latura de jos, −1,025; lângă axă (y = 23,025), −1,5 + 0,025;
  // între axă și inelul de la y = 21,5, la y = 22,275: conul axei, −1,5 + 0,725 (creasta, −0,75, e la y = 22,25).
  for (const [y, asteptat] of [[21.025, -1.025], [23.025, -1.475], [22.275, -0.775]] as const) {
    assert.ok(Math.abs(r.z(26.025, y) - asteptat) < 0.005, `y = ${y}: ${r.z(26.025, y)} în loc de ${asteptat}`);
  }
});

test('fiecare trecere scoate cel mult pasul: prefixele programului pe oracol (axa, apoi și inelele fundului plat)', () => {
  const g: GrilaOracol = { x0: -2, y0: -2, latime: 16, inaltime: 10, celula: 0.05 };
  for (const [nume, adancime, pas] of [['fără fund plat, 3 × 1', 3, 1], ['cu fund plat, D = 2, 4 × 0,5', 2, 0.5]] as const) {
    const r = bun(P([conturDreptunghi(0, 0, 12, 6, 0)], { adancime, pas }));
    const s = r.statistici.sfarsitTreceri;
    assert.equal(s.length, Math.round(adancime / pas), nume);
    let inainte: Float64Array = new Float64Array(Math.ceil(16 / 0.05) * Math.ceil(10 / 0.05));
    for (const sfarsit of s) {
      const o = judeca(gcode(r.miscari, sfarsit), g, { tip: 'v', diametru: 20, unghi: 90 });
      let max = 0;
      for (let k = 0; k < o.z.length; k++) max = Math.max(max, inainte[k]! - o.z[k]!);
      assert.ok(max <= pas + o.marja + 1e-9, `${nume}: o trecere a scos ${max.toFixed(5)} mm (pasul ${pas})`);
      inainte = o.z;
    }
  }
});

// ── Ușa v14 și ce scrie Exportă ──────────────────────────────────────────────────────────────────────────────────────

test('ușa v14: forma frezei e `{ tip: "v", unghi ∈ [1, 179] }` (câmpurile necunoscute rămân); „vcarve” sau „forma” într-un v13 nu fac un v13 valid; un v13 curat urcă (prin v14 și v15) la v16', () => {
  const dr = [{ id: 'a', forma: DR, e: 20, f: 20 }];
  for (const unghi of [1, 60, 90.5, 179]) deschis(doc(dr, [vcarve(['a'], { scula: { ...V(90), forma: { tip: 'v', unghi } } })]));
  const cuCamp = deschis(doc(dr, [vcarve(['a'], { scula: { ...V(90), forma: { tip: 'v', unghi: 60, cod: 'X' } } })]));
  assert.equal((cuCamp.piese[0]!.operatii[0]!.scula.forma as Record<string, unknown>)['cod'], 'X');
  for (const rau of [0, 0.5, 180, -60, '60', null, Number.NaN, Infinity]) {
    assert.ok(!incarca(doc(dr, [vcarve(['a'], { scula: { ...V(90), forma: { tip: 'v', unghi: rau } } })])).ok, String(rau));
  }
  for (const forma of [{ tip: 'bila', unghi: 90 }, { unghi: 90 }, 'v', null]) {
    assert.ok(!incarca(doc(dr, [vcarve(['a'], { scula: { ...V(90), forma } })])).ok, JSON.stringify(forma));
  }
  const a = incarca(doc(dr, [vcarve(['a'])], 0, 0, 13));
  assert.ok(!a.ok && /are tipul „vcarve”, pe care v13 nu-l cunoaște: nu e un document v13 valid/.test(a.motiv), a.ok ? '' : a.motiv);
  const b = incarca(doc(dr, [{ ...vcarve(['a']), tip: 'profil' }], 0, 0, 13));
  assert.ok(!b.ok && /are câmpul „forma” pe sculă, pe care v14 îl folosește: nu e un document v13 valid/.test(b.motiv), b.ok ? '' : b.motiv);
  const curat = doc(dr, [{ ...vcarve(['a']), tip: 'profil', scula: { numar: 1, nume: 'freza plata', diametru: 6 } }], 0, 0, 13);
  const c = incarca(curat);
  assert.ok(c.ok);
  if (c.ok) assert.deepEqual(c.doc, { ...(curat as Record<string, unknown>), schema: 16 }, 'doar numărul');
});

test('ce scrie Exportă (ADR 0090): V-carve-ul cu latura interior și nimic din profil; forma frezei, cu numele după ea doar când se schimbă', () => {
  const profil = deschis(doc([{ id: 'a', forma: DR }], [{ ...vcarve(['a']), tip: 'profil', latura: 'exterior', scula: { numar: 1, nume: 'freza mea', diametru: 6 }, urechi: { numar: 2, latime: 8, grosime: 2 } }])).piese[0]!.operatii[0]!;
  const v = { latura: 'exterior', sens: 'urcare', adancime: 5, pas: 2, urechi: { numar: 2, latime: 8, grosime: 2 }, rampa: null, intrari: null, colturi: null, tip: 'vcarve' } as const;
  const sculaV = { numar: 3, diametru: 12, forma: { tip: 'v', unghi: 60 } } as const;
  const o = operatieDinDialog(profil, v, sculaV);
  assert.equal(o.tip, 'vcarve');
  assert.equal(o.latura, 'interior');
  assert.equal(o.urechi, null);
  assert.deepEqual(o.scula, { numar: 3, nume: 'freza V60', diametru: 12, forma: { tip: 'v', unghi: 60 } });
  // Același unghi: numele dat de om rămâne (și câmpurile necunoscute ale formei).
  const cuNume = { ...o, scula: { ...o.scula, nume: 'V-ul meu', forma: { tip: 'v' as const, unghi: 60, cod: 'X' } } };
  assert.deepEqual(operatieDinDialog(cuNume, v, sculaV).scula, { numar: 3, nume: 'V-ul meu', diametru: 12, forma: { tip: 'v', unghi: 60, cod: 'X' } });
  assert.deepEqual(operatieDinDialog(cuNume, undefined, sculaV), cuNume, 'Exportă fără schimbare nu scrie o comandă');
  assert.equal(operatieDinDialog(cuNume, v, { ...sculaV, forma: { tip: 'v', unghi: 90 } }).scula.nume, 'freza V90');
  // Înapoi la freza plată: forma pleacă, numele devine „freza plata”; pe o freză care era deja plată, numele rămâne.
  const plata = operatieDinDialog(cuNume, { ...v, tip: 'profil' }, { numar: 3, diametru: 12 });
  assert.ok(!Object.hasOwn(plata.scula, 'forma'));
  assert.equal(plata.scula.nume, 'freza plata');
  assert.equal(operatieDinDialog(profil, { ...v, tip: 'profil' }, { numar: 1, diametru: 6 }).scula.nume, 'freza mea');
});
