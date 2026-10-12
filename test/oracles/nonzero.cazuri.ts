/**
 * CORPUSUL oracolului normalizării `nonzero` (felia 2.7d, ADR 0036), scris de mână, cu valorile pe hârtie lângă fiecare
 * caz: ce trebuie să iasă (neschimbat / schimbat / refuz), câte contururi și aria regiunii adevărate, unde se pot socoti fără
 * program (formule închise: cercuri, lentile, poligoane). ZERO importuri din `src/`.
 *
 * Familiile: de bază (suprapuneri, imbricări în același sens, bucle, muchii comune, atingeri), regula `evenodd`, glife
 * reale (Open Sans, cu componente suprapuse: Ş ş ţ Ç Å ę Ų …) și text suprapus, adversare (aproape coincidente, aproape
 * concurente, fante și lentile sub τ: un refuz cu motiv e permis), grupurile (o formă mică lângă una mare). Cazurile cu
 * `pozitii` se judecă la 0, la 2 440 și la 10⁶ mm.
 */
import { arieSemn, ev, grupuri, primitive, toatePrimitivele, type CaleN, type CodMotiv, type P, type SegN, type VarfN } from './nonzero.ts';
import { GLIFE, UPM, type GlifaDate } from './nonzero.glife.ts';

export const L = (x: number, y: number): VarfN => ({ p: { x, y }, s: { tip: 'L' } });
export const A = (x: number, y: number, b: number): VarfN => ({ p: { x, y }, s: { tip: 'A', bulge: b } });
export const C = (x: number, y: number, a: number, b: number, c: number, d: number): VarfN => ({ p: { x, y }, s: { tip: 'C', c1: { x: a, y: b }, c2: { x: c, y: d } } });

/** Cercul din două semicercuri (bulge ±1), din (cx + r, cy). */
export const cerc = (cx: number, cy: number, r: number, ccw = true): VarfN[] => [A(cx + r, cy, ccw ? 1 : -1), A(cx - r, cy, ccw ? 1 : -1)];
export const drept = (x: number, y: number, w: number, h: number, ccw = true): VarfN[] => {
  const v = [L(x, y), L(x + w, y), L(x + w, y + h), L(x, y + h)];
  return ccw ? v : inv(v);
};
/** Conturul întors: aceleași puncte, segmentele în sens opus (arcul −bulge, cubica cu c1 și c2 schimbate). */
export function inv(c: readonly VarfN[]): VarfN[] {
  const n = c.length, r: VarfN[] = [];
  for (let j = 0; j < n; j++) {
    const src = c[(n - j - 1 + n) % n] as VarfN, p = (c[(n - j) % n] as VarfN).p;
    const s: SegN = src.s.tip === 'A' ? { tip: 'A', bulge: -src.s.bulge } : src.s.tip === 'C' ? { tip: 'C', c1: { ...src.s.c2 }, c2: { ...src.s.c1 } } : { tip: 'L' };
    r.push({ p: { ...p }, s });
  }
  return r;
}
const mapP = (c: readonly VarfN[], f: (p: P) => P): VarfN[] => c.map((v) => ({ p: f(v.p), s: v.s.tip === 'C' ? { tip: 'C', c1: f(v.s.c1), c2: f(v.s.c2) } : { ...v.s } }));
export const muta = (cai: readonly CaleN[], dx: number, dy: number): VarfN[][] => cai.map((c) => mapP(c, (p) => ({ x: p.x + dx, y: p.y + dy })));
export const roteste = (c: readonly VarfN[], ox: number, oy: number, a: number): VarfN[] => {
  const co = Math.cos(a), si = Math.sin(a);
  return mapP(c, (p) => ({ x: ox + (p.x - ox) * co - (p.y - oy) * si, y: oy + (p.x - ox) * si + (p.y - oy) * co }));
};
/** Cercul din 4 cubice (kappa): un purtător distinct de arc, la 2,7e-4·r de cerc. */
export function cercCubic(cx: number, cy: number, r: number, ccw = true): VarfN[] {
  const k = 0.5522847498307936 * r;
  const v = [C(cx + r, cy, cx + r, cy + k, cx + k, cy + r), C(cx, cy + r, cx - k, cy + r, cx - r, cy + k), C(cx - r, cy, cx - r, cy - k, cx - k, cy - r), C(cx, cy - r, cx + k, cy - r, cx + r, cy - k)];
  return ccw ? v : inv(v);
}
/** Inima din patru cubice. */
export function inima(cx: number, cy: number, s: number, rot = 0): VarfN[] {
  const Pt = (x: number, y: number): [number, number] => { const c = Math.cos(rot), si = Math.sin(rot); return [cx + s * (x * c - y * si), cy + s * (x * si + y * c)]; };
  const pts = [[0, -1], [-1, 0.1], [0, 0.45], [1, 0.1]] as const;
  const ctr = [[[-0.1, -0.75], [-1, -0.4]], [[-1, 0.6], [-0.3, 0.85]], [[0.3, 0.85], [1, 0.6]], [[1, -0.4], [0.1, -0.75]]] as const;
  const out: VarfN[] = [];
  for (let i = 0; i < 4; i++) {
    const p = Pt(...(pts[i] as readonly [number, number])), a = Pt(...((ctr[i] as readonly [readonly [number, number], readonly [number, number]])[0])), b = Pt(...((ctr[i] as readonly [readonly [number, number], readonly [number, number]])[1]));
    out.push(C(p[0], p[1], a[0], a[1], b[0], b[1]));
  }
  return out;
}
export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
function catmull(pts: ReadonlyArray<readonly [number, number]>): VarfN[] {
  const n = pts.length, v: VarfN[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n] as readonly [number, number], p1 = pts[i] as readonly [number, number], p2 = pts[(i + 1) % n] as readonly [number, number], p3 = pts[(i + 2) % n] as readonly [number, number];
    v.push(C(p1[0], p1[1], p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6));
  }
  return v;
}
/** Un contur neted aleator: n puncte pe un cerc perturbat, Catmull-Rom → Bézier. */
export function blob(r: () => number, cx: number, cy: number, R: number, n = 7): VarfN[] {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * 2 * Math.PI + r() * 0.3, rr = R * (0.55 + 0.6 * r()); pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]); }
  return catmull(pts);
}
/** Dreptunghiul rotunjit (L + A), colțurile de rază R. */
const rotunjit = (x: number, y: number, w: number, h: number, R: number): VarfN[] => {
  const b = Math.tan(Math.PI / 8);
  return [L(x + R, y), A(x + w - R, y, b), L(x + w, y + R), A(x + w, y + h - R, b), L(x + w - R, y + h), A(x + R, y + h, b), L(x, y + h - R), A(x, y + R, b)];
};

// ---------------------------------------------------------------------------------------------------------------------
// Glifele (Open Sans): din comenzile M / L / Q / Z, la înălțimea h (mm pe em), cu originea (ox, oy).

export function glifa(nume: string, h: number, ox = 0, oy = 0, font = 'OpenSans-Regular'): VarfN[][] {
  const g = GLIFE.find((x) => x.nume === nume && x.font === font);
  if (g === undefined) throw new Error(`glifa ${font}/${nume} lipsește`);
  return contururiGlifa(g, h, ox, oy);
}
export function contururiGlifa(g: GlifaDate, h: number, ox: number, oy: number): VarfN[][] {
  const k = h / UPM;
  const T = (x: number, y: number): P => ({ x: ox + x * k, y: oy + y * k });
  const out: VarfN[][] = [];
  let cur: VarfN[] | null = null;
  let pend: P | null = null, start: P | null = null;
  const fin = (): void => {
    if (cur !== null && pend !== null && start !== null) {
      if (!(pend.x === start.x && pend.y === start.y)) cur.push({ p: pend, s: { tip: 'L' } });
      if (cur.length >= 2) out.push(cur);
    }
    cur = null;
    pend = null;
  };
  const tok = g.d.match(/[MLQZ]|-?\d+(?:\.\d+)?/g) ?? [];
  for (let i = 0; i < tok.length;) {
    const c = tok[i++] as string;
    const n = (): number => Number(tok[i++]);
    if (c === 'M') { if (cur !== null) fin(); cur = []; pend = T(n(), n()); start = pend; }
    else if (c === 'L') { const e = T(n(), n()); (cur as VarfN[] | null)?.push({ p: pend as P, s: { tip: 'L' } }); pend = e; }
    else if (c === 'Q') {
      const q = T(n(), n()), e = T(n(), n()), p0 = pend as P;
      (cur as VarfN[] | null)?.push({ p: p0, s: { tip: 'C', c1: { x: p0.x + (2 / 3) * (q.x - p0.x), y: p0.y + (2 / 3) * (q.y - p0.y) }, c2: { x: e.x + (2 / 3) * (q.x - e.x), y: e.y + (2 / 3) * (q.y - e.y) } } });
      pend = e;
    } else if (c === 'Z') fin();
  }
  if (cur !== null) fin();
  return out;
}
/** Un șir de glife (nume Open Sans), cu spațierea scăzută (litere care se suprapun). */
export function text(nume: readonly string[], h: number, ox = 0, oy = 0, strangere = 0, font = 'OpenSans-Regular'): VarfN[][] {
  const out: VarfN[][] = [];
  let x = ox;
  for (const n of nume) {
    const g = GLIFE.find((q) => q.nume === n && q.font === font);
    if (g === undefined) throw new Error(`glifa ${font}/${n} lipsește`);
    out.push(...contururiGlifa(g, h, x, oy));
    x += (g.avans / UPM) * h - strangere * h;
  }
  return out;
}
export const GLIFE_SUPRAPUSE = GLIFE.filter((g) => g.font === 'OpenSans-Regular' && /cedilla|ogonek|Aring|uni04|uni05/.test(g.nume)).map((g) => g.nume);

// ---------------------------------------------------------------------------------------------------------------------
// Hârtia.

export type Asteptat = 'neschimbat' | 'schimbat' | 'refuz' | 'oricare' | 'liber';
export type HartieN = {
  /**
   * neschimbat (același obiect), schimbat, refuz, oricare (schimbat corect sau refuz cu motiv: cazurile prost condiționate),
   * liber (și neschimbat: o formă deja evenodd, dar mai subțire decât τ, ADR 0036 §6, amendamentul K7).
   */
  readonly rezultat: Asteptat;
  /** Câte contururi are ieșirea (pe hârtie). */
  readonly contururi?: number;
  /** Aria regiunii adevărate (suma ariilor cu semn ale ieșirii, umplerea în stânga). */
  readonly arie?: number;
  readonly cod?: CodMotiv;
};
export type CazN = {
  readonly nume: string;
  readonly cai: readonly CaleN[];
  readonly regula?: 'nonzero' | 'evenodd';
  readonly hartie: HartieN;
  /** Se judecă și la 2 440 și la 10⁶ mm (mutat), cu aceeași hârtie. */
  readonly pozitii?: boolean;
  readonly densitate?: number;
  readonly familie: 'baza' | 'evenodd' | 'glife' | 'adversar' | 'grup' | 'neschimbat';
};

// Ariile pe hârtie.
/** Reuniunea a două discuri de rază r la distanța d < 2r: 2πr² − lentila, lentila = 2r²·acos(d/2r) − (d/2)·√(4r² − d²). */
export const arieDouaCercuri = (r: number, d: number): number => 2 * Math.PI * r * r - (2 * r * r * Math.acos(d / (2 * r)) - (d / 2) * Math.sqrt(4 * r * r - d * d));
/** Pentagrama de rază R sub nonzero: steaua cu vârfurile interioare la R·cos 72° / cos 36°: 5·R·rᵢ·sin 36°. */
export const ariePentagrama = (R: number): number => 5 * R * ((R * Math.cos((2 * Math.PI) / 5)) / Math.cos(Math.PI / 5)) * Math.sin(Math.PI / 5);

const pentagrama = (R: number): VarfN[] => Array.from({ length: 5 }, (_, i) => { const a = Math.PI / 2 + (i * 4 * Math.PI) / 5; return L(R * Math.cos(a), R * Math.sin(a)); });

function corpusBaza(): CazN[] {
  const K: CazN[] = [];
  const add = (nume: string, cai: CaleN[], hartie: HartieN, extra: Partial<CazN> = {}): void => { K.push({ nume, cai, hartie, familie: 'baza', pozitii: true, ...extra }); };
  // Suprapuneri.
  add('cercuri suprapuse (același sens): reuniunea', [cerc(0, 0, 30), cerc(40, 0, 30)], { rezultat: 'schimbat', contururi: 1, arie: arieDouaCercuri(30, 40) });
  add('cercuri suprapuse, unul orar: lentila are înfășurarea 0, deja evenodd', [cerc(0, 0, 30), cerc(40, 0, 30, false)], { rezultat: 'neschimbat' }, { familie: 'neschimbat' });
  add('cercuri suprapuse, ambele orare: reuniunea, întoarsă trigonometric', [cerc(0, 0, 30, false), cerc(40, 0, 30, false)], { rezultat: 'schimbat', contururi: 1, arie: arieDouaCercuri(30, 40) });
  add('cercuri identice: un singur cerc', [cerc(0, 0, 30), cerc(0, 0, 30)], { rezultat: 'schimbat', contururi: 1, arie: Math.PI * 900 });
  add('cerc și același cerc pornit din alt punct (arce suprapuse parțial)', [cerc(0, 0, 30), roteste(cerc(0, 0, 30), 0, 0, 1)], { rezultat: 'schimbat', contururi: 1, arie: Math.PI * 900 });
  add('trei cercuri suprapuse în lanț', [cerc(0, 0, 10), cerc(15, 0, 10), cerc(30, 0, 10)], { rezultat: 'schimbat', contururi: 1, arie: 3 * Math.PI * 100 - 2 * (2 * Math.PI * 100 - arieDouaCercuri(10, 15)) });
  add('pătrate suprapuse în colț', [drept(0, 0, 10, 10), drept(5, 5, 10, 10)], { rezultat: 'schimbat', contururi: 1, arie: 175 });
  add('pătrat și pătrat rotit cu 45° (opt intersecții)', [drept(-10, -10, 20, 20), roteste(drept(-10, -10, 20, 20), 0, 0, Math.PI / 4)], { rezultat: 'schimbat', contururi: 1, arie: 800 - 800 * Math.tan(Math.PI / 8) });
  // Imbricări în același sens.
  add('cercuri concentrice în același sens: discul mare', [cerc(0, 0, 30), cerc(0, 0, 12)], { rezultat: 'schimbat', contururi: 1, arie: Math.PI * 900 });
  add('cercuri concentrice în sensuri opuse: inelul, deja evenodd', [cerc(0, 0, 30), cerc(0, 0, 12, false)], { rezultat: 'neschimbat' }, { familie: 'neschimbat' });
  add('pătrate imbricate în același sens: pătratul mare', [drept(0, 0, 100, 100), drept(25, 25, 50, 50)], { rezultat: 'schimbat', contururi: 1, arie: 10_000 });
  add('trei pătrate imbricate, sensuri + − +: inelul și insula, deja evenodd', [drept(0, 0, 90, 90), drept(10, 10, 70, 70, false), drept(20, 20, 50, 50)], { rezultat: 'neschimbat' }, { familie: 'neschimbat' });
  add('trei pătrate imbricate, toate în același sens: cel mare', [drept(0, 0, 90, 90), drept(10, 10, 70, 70), drept(20, 20, 50, 50)], { rezultat: 'schimbat', contururi: 1, arie: 8100 });
  add('pătrat cu gaură și insulă orară în gaură (înfășurările 1, 0, −1): deja evenodd', [drept(0, 0, 90, 90), drept(10, 10, 70, 70, false), drept(20, 20, 50, 50, false)], { rezultat: 'neschimbat' }, { familie: 'neschimbat' });
  // Bucle și autointersecții.
  add('pentagrama: centrul are înfășurarea 2', [pentagrama(50)], { rezultat: 'schimbat', contururi: 1, arie: ariePentagrama(50) });
  add('pentagrama orară: aceeași stea', [inv(pentagrama(50))], { rezultat: 'schimbat', contururi: 1, arie: ariePentagrama(50) });
  add('opt din două cubice (lobii ±1): deja evenodd', [[C(0, 0, 0, 60, 100, -60), C(100, 0, 100, 60, 0, -60)]], { rezultat: 'neschimbat' }, { familie: 'neschimbat' });
  add('fundă din linii (lobii ±1): deja evenodd', [[L(0, 0), L(20, 10), L(20, 0), L(0, 10)]], { rezultat: 'neschimbat' }, { familie: 'neschimbat' });
  {
    // Limaçon r = 20(1 + 2 cos t): bucla interioară are înfășurarea 2.
    const pts: Array<[number, number]> = [];
    for (let i = 0; i < 24; i++) { const t = (i / 24) * 2 * Math.PI, r = 20 * (1 + 2 * Math.cos(t)); pts.push([r * Math.cos(t), r * Math.sin(t)]); }
    add('limaçon: bucla interioară cu înfășurarea 2', [catmull(pts)], { rezultat: 'schimbat', contururi: 1 });
  }
  add('pătrat parcurs de două ori (înfășurarea 2)', [[L(0, 0), L(10, 0), L(10, 10), L(0, 10), L(0, 0), L(10, 0), L(10, 10), L(0, 10)]], { rezultat: 'schimbat', contururi: 1, arie: 100 });
  add('bucla unei cubice închisă cu o linie (lobii ±1, ca un opt): deja evenodd', [[C(0, 0, 150, 100, -50, 100), L(100, 0)]], { rezultat: 'neschimbat' }, { familie: 'neschimbat' });
  // Muchii comune, ace, dubluri.
  add('dreptunghiuri cu o latură comună: unul singur', [drept(0, 0, 50, 30), drept(50, 0, 50, 30)], { rezultat: 'schimbat', contururi: 1, arie: 3000 });
  add('dreptunghiuri cu o bucată de latură comună (T)', [drept(0, 0, 50, 30), drept(50, 10, 20, 10)], { rezultat: 'schimbat', contururi: 1, arie: 1700 });
  add('pătrat lipit de o gaură (muchia comună, sensuri opuse)', [drept(0, 0, 30, 30), drept(10, 10, 10, 10, false), drept(10, 10, 10, 10)], { rezultat: 'schimbat', contururi: 1, arie: 900 });
  add('țepușă dus-întors pe o linie și un vârf dublat', [[L(0, 0), L(40, 0), L(40, 20), L(60, 20), L(40, 20), L(40, 20), L(40, 40), L(0, 40)], drept(20, 10, 40, 20)], { rezultat: 'schimbat', contururi: 1, arie: 1600 + 400 });
  add('aceeași cubică dus și întors (arie 0 acolo)', [[L(0, 0), L(40, 0), C(40, 20, 60, 30, 70, 10), C(80, 20, 70, 10, 60, 30), L(40, 20), L(40, 40), L(0, 40)]], { rezultat: 'schimbat', contururi: 1, arie: 1600 });
  add('dreptunghiuri rotunjite suprapuse (L + A), unul dublat exact', [rotunjit(0, 0, 60, 40, 8), rotunjit(30, 0, 60, 40, 8), rotunjit(15, 20, 60, 40, 8), rotunjit(0, 0, 60, 40, 8)], { rezultat: 'schimbat', contururi: 1 });
  add('inimi identice: una singură', [inima(0, 0, 40), inima(0, 0, 40)], { rezultat: 'schimbat', contururi: 1 });
  add('inimi suprapuse (cubice)', [inima(0, 0, 40), inima(22, 9, 40, 0.35)], { rezultat: 'schimbat', contururi: 1 });
  add('cerc și aproximarea lui din cubice (purtători diferiți, la 2,7e-4·r)', [cerc(0, 0, 30), cercCubic(0, 0, 30)], { rezultat: 'schimbat' });
  add('contur și inversul lui: înfășurarea 0 peste tot, ieșirea vidă', [drept(0, 0, 10, 10), inv(drept(0, 0, 10, 10))], { rezultat: 'schimbat', contururi: 0, arie: 0 });
  // Atingeri.
  add('cercuri tangente pe dinăuntru, același sens: cel mare', [cerc(0, 0, 40), cerc(20, 0, 20)], { rezultat: 'schimbat', contururi: 1, arie: 1600 * Math.PI });
  add('cercuri tangente pe dinafară: deja evenodd', [cerc(0, 0, 20), cerc(40, 0, 20)], { rezultat: 'neschimbat' }, { familie: 'neschimbat' });
  add('pătrate care se ating într-un colț: deja evenodd', [drept(0, 0, 10, 10), drept(10, 10, 10, 10)], { rezultat: 'neschimbat' }, { familie: 'neschimbat' });
  add('trei cercuri concurente într-un punct', [cerc(10, 0, 10), cerc(-5, 8.660254037844386, 10), cerc(-5, -8.660254037844386, 10)], { rezultat: 'schimbat', contururi: 1 });
  // Mai multe: lanțuri, bloburi, grile, poligoane aleatoare.
  add('lanț de 50 de cercuri', Array.from({ length: 50 }, (_, i) => cerc(i * 7, Math.sin(i) * 3, 5)), { rezultat: 'schimbat', contururi: 1 }, { densitate: 0.4 });
  {
    const r = rng(7), b: VarfN[][] = [];
    for (let i = 0; i < 8; i++) b.push(blob(r, 40 * r(), 40 * r(), 18));
    add('bloburi aleatoare (8)', b, { rezultat: 'schimbat' });
    const r2 = rng(99), b2: VarfN[][] = [];
    for (let i = 0; i < 6; i++) b2.push(i % 2 === 1 ? inv(blob(r2, 30 * r2(), 30 * r2(), 15)) : blob(r2, 30 * r2(), 30 * r2(), 15));
    add('bloburi cu sensuri amestecate (6)', b2, { rezultat: 'schimbat' });
  }
  {
    const r = rng(5), d: VarfN[][] = [];
    for (let i = 0; i < 30; i++) { const x = Math.floor(r() * 10), y = Math.floor(r() * 10), w = 1 + Math.floor(r() * 4), h = 1 + Math.floor(r() * 4); d.push(drept(x * 10, y * 10, w * 10, h * 10, r() < 0.8)); }
    add('grilă de 30 de dreptunghiuri (laturi coliniare, T, 20 % orare)', d, { rezultat: 'schimbat' });
  }
  {
    const r = rng(11), v: VarfN[] = [];
    for (let i = 0; i < 40; i++) v.push(L(100 * r(), 100 * r()));
    add('poligon aleator cu 40 de vârfuri (autointersectat)', [v], { rezultat: 'schimbat' });
  }
  {
    const r = rng(2027), c: VarfN[][] = [];
    for (let j = 0; j < 4; j++) {
      const m = 3 + Math.floor(r() * 7), v: VarfN[] = [];
      for (let k = 0; k < m; k++) { const x = 100 * r(), y = 100 * r(); v.push(r() < 0.4 ? A(x, y, (r() < 0.5 ? -1 : 1) * (0.1 + 0.9 * r())) : L(x, y)); }
      c.push(v);
    }
    add('poligoane cu arce, aleatoare (4)', c, { rezultat: 'schimbat' });
  }
  add('intrarea goală: neschimbată', [], { rezultat: 'neschimbat' }, { familie: 'neschimbat', pozitii: false });
  // ADR 0036 §6 (amendamentul K7): „deja evenodd” la precizia τ; un triunghi simplu cu înălțimea de 5e-10 mm (τ ≈ 2e-9)
  // poate ieși neschimbat, schimbat sau gol (martorul: vârful (10, 0) la 5e-10 de latura opusă).
  add('triunghi simplu mai subțire decât τ (K7): neschimbat, schimbat sau gol', [[L(0, 0), L(10, 0), L(20, -1e-9)]], { rezultat: 'liber' });
  add('un singur pătrat: neschimbat', [drept(0, 0, 10, 10)], { rezultat: 'neschimbat' }, { familie: 'neschimbat' });
  add('inima: neschimbată', [inima(0, 0, 40)], { rezultat: 'neschimbat' }, { familie: 'neschimbat' });
  add('un pătrat orar singur: neschimbat (regiunea nonzero e cea evenodd)', [drept(0, 0, 10, 10, false)], { rezultat: 'neschimbat' }, { familie: 'neschimbat' });
  return K;
}

function corpusEvenodd(): CazN[] {
  const K: CazN[] = [];
  const add = (nume: string, cai: CaleN[], hartie: HartieN): void => { K.push({ nume, cai, hartie, regula: 'evenodd', familie: 'evenodd', pozitii: true }); };
  // §6: sub evenodd, fiecare muchie e frontieră; doar muchiile coincidente schimbă ceva (Limitele: pentagrama rămâne).
  add('evenodd: pentagrama rămâne (§6)', [pentagrama(50)], { rezultat: 'neschimbat' });
  add('evenodd: pătrate suprapuse rămân', [drept(0, 0, 10, 10), drept(5, 5, 10, 10)], { rezultat: 'neschimbat' });
  add('evenodd: pătrate imbricate în același sens rămân (inelul)', [drept(0, 0, 100, 100), drept(25, 25, 50, 50)], { rezultat: 'neschimbat' });
  add('evenodd: două pătrate identice se anulează', [drept(0, 0, 10, 10), drept(0, 0, 10, 10)], { rezultat: 'schimbat', contururi: 0, arie: 0 });
  add('evenodd: latura comună dispare', [drept(0, 0, 50, 30), drept(50, 0, 50, 30)], { rezultat: 'schimbat', contururi: 1, arie: 3000 });
  add('evenodd: cercuri identice și un al treilea suprapus', [cerc(0, 0, 30), cerc(0, 0, 30), cerc(40, 0, 30)], { rezultat: 'schimbat', contururi: 1, arie: Math.PI * 900 });
  return K;
}

function corpusGlife(): CazN[] {
  const K: CazN[] = [];
  for (const n of GLIFE_SUPRAPUSE) K.push({ nume: `glifa Open Sans ${n}: componente suprapuse`, cai: glifa(n, 50), hartie: { rezultat: 'schimbat' }, familie: 'glife', pozitii: true });
  for (const n of ['Scedilla', 'scedilla', 'tcedilla']) K.push({ nume: `glifa Open Sans Semibold ${n}`, cai: glifa(n, 80, 0, 0, 'OpenSans-Semibold'), hartie: { rezultat: 'schimbat' }, familie: 'glife', pozitii: true });
  for (const n of ['B', 'O', 'g', 'a', 'e', 'ampersand', 'at', 'eight', 'percent', 'dollar', 'Q', 'W', 'zero']) K.push({ nume: `glifa Open Sans ${n}: simplă, neschimbată`, cai: glifa(n, 50), hartie: { rezultat: 'neschimbat' }, familie: 'neschimbat', pozitii: true });
  K.push({ nume: 'glife: g și g întors (înfășurarea 0): ieșirea vidă', cai: [...glifa('g', 60), ...glifa('g', 60).map(inv)], hartie: { rezultat: 'schimbat', contururi: 0, arie: 0 }, familie: 'glife', pozitii: true });
  K.push({ nume: 'glife: B îngroșat fals (două B decalate cu 0,8 mm)', cai: [...glifa('B', 50), ...glifa('B', 50, 0.8)], hartie: { rezultat: 'schimbat' }, familie: 'glife', pozitii: true });
  K.push({ nume: 'glife: g cu umbra la 1e-4 mm', cai: [...glifa('g', 60), ...glifa('g', 60, 1e-4)], hartie: { rezultat: 'schimbat' }, familie: 'glife', pozitii: true });
  K.push({ nume: 'text suprapus: „ŞaB&ţ@8” strâns cu 0,25 em', cai: text(['Scedilla', 'a', 'B', 'ampersand', 'tcedilla', 'at', 'eight'], 40, 0, 0, 0.25), hartie: { rezultat: 'schimbat' }, familie: 'glife', pozitii: true });
  K.push({ nume: 'text suprapus: „O X W Q g” strâns cu 0,3 em', cai: text(['O', 'x', 'W', 'Q', 'g', 'k', 'R'], 30, 0, 0, 0.3), hartie: { rezultat: 'schimbat' }, familie: 'glife', pozitii: true });
  return K;
}

/** Supa: rânduri de text suprapuse (sute de contururi din glife reale). */
export function supa(): VarfN[][] {
  const linii = [['Scedilla', 'a', 'B', 'g', 'e', 'Q', 'R', 'k', 'x', 'W', 'O', 'S', 'zero', 'eight', 'percent', 'dollar'], ['tcedilla', 'Ccedilla', 'ccedilla', 'Aring', 'eogonek', 'Uogonek', 'scedilla', 'at', 'ampersand', 'g', 'B', 'O', 'a', 'e', 'S', 'Q']];
  const cai: VarfN[][] = [];
  for (let i = 0; i < 4; i++) cai.push(...text(linii[i % 2] as string[], 14, 0, -i * 9, 0.12));
  for (let i = 0; i < 4; i++) cai.push(...text(linii[(i + 1) % 2] as string[], 14, 3, -i * 9 - 4.5, 0.12));
  return cai;
}

function corpusAdversar(): CazN[] {
  const K: CazN[] = [];
  const add = (nume: string, cai: CaleN[], hartie: HartieN = { rezultat: 'oricare' }): void => { K.push({ nume, cai, hartie, familie: 'adversar', pozitii: true }); };
  const f0 = [C(0, 48, 30, 62, 70, 38), L(100, 52), C(100, 54, 70, 40, 30, 64), L(0, 50)];
  add('trei fâșii cubice aproape concurente (una mutată cu 1e-7)', [f0, roteste(f0, 50, 50, Math.PI / 3), (muta([roteste(f0, 50, 50, (2 * Math.PI) / 3)], 0, 1e-7)[0] as VarfN[])]);
  add('trei fâșii cubice concurente', [f0, roteste(f0, 50, 50, Math.PI / 3), roteste(f0, 50, 50, (2 * Math.PI) / 3)]);
  add('cercuri cubice aproape tangente, gol de 1e-7', [cercCubic(0, 0, 30), cercCubic(60 + 1e-7, 0, 30)]);
  add('cercuri cubice cu o lentilă de 1e-7', [cercCubic(0, 0, 30), cercCubic(60 - 1e-7, 0, 30)]);
  add('cercuri cubice tangente pe dinăuntru, la 1e-9', [cercCubic(0, 0, 30), cercCubic(10 + 1e-9, 0, 20)]);
  {
    const curba = [C(-10, -10, -10 / 3, 10, 10 / 3, -10), L(10, 10), L(-10, 10)];
    add('cubica atinsă de o linie în inflexiune (rădăcină triplă)', [curba, drept(-20, -20, 40, 20)]);
    add('cubica și o linie la 1e-9 de inflexiune', [curba, drept(-20, -20, 40, 20 + 1e-9)]);
  }
  {
    const D = [A(0, 0, 1), C(20, 0, 20, 15, 0, 15)];
    add('arc + cubică tangente, suprapuse cu decalaj', [D, muta([D], 10, 0)[0] as VarfN[]]);
    add('D și cercul arcului lui (arc coincident cu un semicerc)', [D, cerc(10, 0, 10)]);
    add('D și o linie prin joncțiunile arc–cubică', [D, drept(-5, -20, 30, 20)]);
  }
  add('fantă de 1e-7 între dreptunghiuri, legate de un al treilea', [drept(0, 0, 50, 30), drept(50 + 1e-7, 0, 50, 30), drept(40, 25, 20, 10)]);
  add('fantă de 1e-9 între dreptunghiuri, legate de un al treilea', [drept(0, 0, 50, 30), drept(50 + 1e-9, 0, 50, 30), drept(40, 25, 20, 10)]);
  add('cercuri cu o lentilă de 1e-9', [cerc(0, 0, 10), cerc(20 - 1e-9, 0, 10)]);
  for (const h of [1e-8, 1e-10, 1e-12]) add(`cercuri cubice cu lentila ${h}`, [cercCubic(0, 0, 30), cercCubic(60 - h, 0, 30)]);
  add('cubică dreaptă peste o latură (purtători C și L confundați)', [[C(0, 0, 30, 0, 70, 0), L(100, 0), L(100, 40), L(0, 40)], drept(0, -40, 100, 40)]);
  add('cubică dreaptă dublând o linie', [[C(0, 0, 30, 0, 70, 0), L(100, 0), L(100, 40), L(0, 40)], drept(0, 0, 100, 40)]);
  add('cubică cu vârf (cuspă) pe o linie', [[C(0, 0, 100, 60, -40, 60), L(60, 0)], drept(-20, 45, 100, 30)]);
  // Reproducerea minimă a semnalului din SVG-ul aleator 164 (felia 2.7d): o cuspidă (mâner nul) cu două cubice aproape
  // tangente care se mai taie o dată la 0,56 mm de ea, plus o formă alăturată care forțează normalizarea grupului. Pe
  // instantaneul portului, ieșirea se tăia singură acolo (înfășurarea −1 la 2,8e-7 mm de frontieră).
  add('cuspidă cu o încrucișare aproape tangentă la 0,56 mm (SVG aleator 164)', [
    [C(-75.46762304583913, 166.91929573404016, -75.46762304583913, 166.91929573404016, -70.08092666679133, 166.51893296958502), L(-59.30753390869571, 165.71820744067475)],
    [C(-136.27322330733918, 239.56325732871346, -136.27322330733918, 239.56325732871346, -68.55451122710849, 227.81046619559967),
      C(-78.87423795628499, 236.81071995229732, -60.594141834566436, 233.6104894947485, -51.04748454334729, 222.65842253452007),
      C(-50.23426608262753, 203.95451907161203, -50.23426608262753, 203.95451907161203, -51.27980990056823, 237.1589021592402),
      C(-70.25983017906208, 206.75354265498453, -83.58846075992642, 232.38513779298555, -75.56871943594471, 230.72039342234845),
      C(-92.50095197312655, 225.92321111344233, -109.4331845103084, 221.12602880453625, -48.04070940743163, 186.532297396096),
      L(-62.955393448890014, 155.90027900822818), L(-78.00112593564532, 190.36489417392153), L(-57.39453041574482, 197.15629602966226)],
  ]);
  {
    const eps = 1e-6, d = eps / 10;
    const Pp = [C(0, 0, 30, 40, 70, 40), L(100, 0), L(100, -20), L(0, -20)];
    const Q = [C(100, d, 70, 40 - eps, 30, 40 + eps), L(0, -d), L(0, 60), L(100, 60)];
    add('cubice aproape paralele, trei traversări', [Pp, Q]);
  }
  return K;
}

function corpusGrup(): CazN[] {
  const K: CazN[] = [];
  const add = (nume: string, cai: CaleN[], hartie: HartieN): void => { K.push({ nume, cai, hartie, familie: 'grup' }); };
  // §3: o formă mică lângă una mare își păstrează τ-ul ei. Lentila de 1e-8 mm dintre două cercuri de 0,003 mm e peste τ-ul
  // grupului mic (~3e-11), dar sub τ-ul foii (~2,7e-7): trebuie reprodusă.
  add('foaie 2 400 × 1 200 și, alături, două cercuri de 0,003 mm cu o lentilă de 1e-8', [drept(0, 0, 2400, 1200), cerc(3000, 600, 0.003), cerc(3000.006 - 1e-8, 600, 0.003)], { rezultat: 'schimbat', contururi: 2, arie: 2400 * 1200 + arieDouaCercuri(0.003, 0.006 - 1e-8) });
  add('foaie și două pătrate de 1e-5 mm suprapuse cu 1e-8, alături', [drept(0, 0, 2400, 1200), drept(2500, 600, 1e-5, 1e-5), drept(2500 + 1e-5 - 1e-8, 600, 1e-5, 1e-5)], { rezultat: 'schimbat', contururi: 2, arie: 2400 * 1200 + 2e-10 - 1e-8 * 1e-5 });
  add('două perechi de pătrate suprapuse, departe una de alta: două grupuri', [drept(0, 0, 10, 10), drept(5, 5, 10, 10), drept(100, 0, 10, 10), drept(105, 5, 10, 10)], { rezultat: 'schimbat', contururi: 2, arie: 350 });
  add('trei cutii în lanț (1 atinge 2, 2 atinge 3, laturi comune în același sens): un singur grup', [drept(0, 0, 10, 10), drept(10, 0, 10, 10, false), drept(20, 0, 10, 10)], { rezultat: 'schimbat', contururi: 1, arie: 300 });
  add('foaie și un cerc de 0,003 mm pe latura de sus (ADR 0036: A îl pierdea)', [drept(0, 0, 2400, 1200), cerc(1200, 1200, 0.003), drept(1000, 1100, 400, 50)], { rezultat: 'schimbat', contururi: 1, arie: 2400 * 1200 + (Math.PI * 0.003 * 0.003) / 2 });
  add('un grup schimbat și unul neschimbat (o fundă) alături', [drept(0, 0, 10, 10), drept(5, 5, 10, 10), [L(100, 0), L(120, 10), L(120, 0), L(100, 10)]], { rezultat: 'schimbat', contururi: 3, arie: 175 + 100 });
  add('cercuri despărțite de un gol de 1e-8 (cutii disjuncte): neschimbat', [cerc(0, 0, 0.003), cerc(0.006 + 1e-8, 0, 0.003)], { rezultat: 'neschimbat' });
  return K;
}

export function corpusNonzero(): CazN[] {
  return [...corpusBaza(), ...corpusEvenodd(), ...corpusGlife(), ...corpusAdversar(), ...corpusGrup()];
}

/** Pozițiile la care se judecă un caz cu `pozitii`: originea, foaia (2 440) și 10⁶ mm. */
export const POZITII: ReadonlyArray<readonly [number, number]> = [[0, 0], [2440, 1220], [1e6, 1e6]];

// ---------------------------------------------------------------------------------------------------------------------
// Intrările invalide (§8: refuz `intrare`, fără excepție).

export function intrariInvalide(): Array<{ nume: string; cai: unknown }> {
  return [
    { nume: 'nu e listă', cai: 'x' },
    { nume: 'o cale care nu e listă', cai: [42] },
    { nume: 'o cale goală', cai: [[]] },
    { nume: 'NaN într-un vârf', cai: [[L(0, 0), L(Number.NaN, 0), L(5, 5)]] },
    { nume: 'Infinity într-un vârf', cai: [[L(0, 0), L(Infinity, 0), L(5, 5)]] },
    // Fosta constatare K1 (12.10: reparată în aplicație, `intrare: subcalea <i> are sub 2 vârfuri`).
    { nume: 'o cale cu un singur vârf (fosta K1)', cai: [[L(0, 0)]] },
    { nume: 'o cale bună și una cu un singur vârf (fosta K1b)', cai: [drept(0, 0, 10, 10), [L(1, 1)]] },
    { nume: 'NaN într-un punct de control', cai: [[C(0, 0, Number.NaN, 1, 2, 3), L(10, 0)]] },
    { nume: 'bulge 0', cai: [[A(0, 0, 0), L(10, 0), L(5, 5)]] },
    { nume: 'bulge NaN', cai: [[A(0, 0, Number.NaN), L(10, 0), L(5, 5)]] },
    { nume: 'arc cu capetele egale', cai: [[A(0, 0, 0.5), L(0, 0), L(5, 5)]] },
    { nume: 'tip necunoscut', cai: [[{ p: { x: 0, y: 0 }, s: { tip: 'Q' } }, L(10, 0), L(5, 5)]] },
    { nume: 's lipsă', cai: [[{ p: { x: 0, y: 0 } }, L(10, 0), L(5, 5)]] },
    { nume: 'p lipsă', cai: [[{ s: { tip: 'L' } }, L(10, 0), L(5, 5)]] },
    { nume: 'vârful null', cai: [[null, L(10, 0), L(5, 5)]] },
  ];
}

// ---------------------------------------------------------------------------------------------------------------------
// Judecata hârtiei: câte contururi și aria (suma ariilor cu semn ale ieșirii; umplerea în stânga le face pozitive).

/** Lungimea frontierei (poligonul de 16 bucăți pe fiecare primitivă: o margine de jos, suficientă pentru toleranță). */
export function perimetru(cai: readonly CaleN[]): number {
  let L = 0;
  for (const s of toatePrimitivele(cai)) { let p = ev(s, 0); for (let i = 1; i <= 16; i++) { const q = ev(s, i / 16); L += Math.hypot(q.x - p.x, q.y - p.y); p = q; } }
  return L;
}

export function judecaHartiaN(caz: { cai: readonly CaleN[]; hartie: HartieN }, rez: unknown): string[] {
  const pr: string[] = [];
  const R = rez as { ok?: boolean; cai?: CaleN[] };
  if (R?.ok !== true || !Array.isArray(R.cai)) return pr;
  const h = caz.hartie;
  if (h.contururi !== undefined && R.cai.length !== h.contururi) pr.push(`hârtia: ${R.cai.length} contururi ≠ ${h.contururi}`);
  if (h.arie !== undefined) {
    const a = R.cai.reduce((s, c) => s + arieSemn(primitive(c, 0)), 0);
    const tau = grupuri(caz.cai).reduce((m, g) => Math.max(m, g.tau), 0);
    const tol = 10 * tau * perimetru(caz.cai) + 1e-12 * Math.abs(h.arie);
    if (!(Math.abs(a - h.arie) <= tol)) pr.push(`hârtia: aria ${a} ≠ ${h.arie} (±${tol.toExponential(2)})`);
  }
  return pr;
}

// ---------------------------------------------------------------------------------------------------------------------
// Formele aleatoare (cu sămânță): contururi din L / A / C pe o grilă rară (coliniarități, vârfuri comune, tangențe și
// suprapuneri apar des), uneori cu un contur dublat sau întors. Fără hârtie: le judecă oracolul; un refuz cu motiv e permis.

export function formaAleatoare(samanta: number): VarfN[][] {
  const r = rng(samanta * 7919 + 13);
  const int = (a: number, b: number): number => a + Math.floor(r() * (b - a + 1));
  const g = (): number => 5 * int(0, 10);
  const bulge = [0.3, 0.5, 1, Math.tan(Math.PI / 8), 0.75];
  const cai: VarfN[][] = [];
  const n = int(1, 4);
  for (let k = 0; k < n; k++) {
    const m = int(3, 7);
    const v: VarfN[] = [];
    for (let i = 0; i < m; i++) {
      const x = g(), y = g(), f = r();
      if (f < 0.55) v.push(L(x, y));
      else if (f < 0.8) v.push(A(x, y, (r() < 0.5 ? -1 : 1) * (bulge[int(0, bulge.length - 1)] as number)));
      else v.push(C(x, y, g(), g(), g(), g()));
    }
    // Capete egale consecutive: arcul ar fi invalid (ADR 0034 §2); devine linie (segment nul, permis).
    for (let i = 0; i < v.length; i++) {
      const a = v[i] as VarfN, b = v[(i + 1) % v.length] as VarfN;
      if (a.s.tip === 'A' && a.p.x === b.p.x && a.p.y === b.p.y) v[i] = L(a.p.x, a.p.y);
    }
    cai.push(v);
    if (r() < 0.15) cai.push(r() < 0.5 ? v.map((x) => ({ ...x })) : inv(v));
  }
  return cai;
}

// ---------------------------------------------------------------------------------------------------------------------
// CONSTATĂRILE: unde aplicația diferă de oracol, iar oracolul urmează textul ADR-urilor (testul lor e separat și pică până
// la reparare sau până când ADR-ul spune altfel).

export type ConstatareN = { readonly nume: string; readonly cai: unknown; readonly cod: CodMotiv; readonly motiv: string };
export function constatariNonzero(): ConstatareN[] {
  // 12.10: K1 / K1b reparate în aplicație (mutate în `intrariInvalide`). Lista rămâne pentru constatările noi.
  return [];
}
