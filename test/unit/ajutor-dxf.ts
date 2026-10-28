/**
 * Ajutoarele probelor ușii DXF (ADR 0101): fișiere DXF scrise de mână, grup cu grup, și geometria cu care probele judecă
 * căile citite (distanța unui punct la cale, aria, cutia exactă, cercul unui arc). Geometria e scrisă aici, din formule, nu
 * luată din codul aplicației.
 */
import type { Punct, Segment, Varf } from '../../src/geom/contur.ts';

/* ── Fișierele ─────────────────────────────────────────────────────────────────────────────────────────────────────── */

/** Perechile (cod, valoare) ale unei entități sau ale unui antet, ca text DXF. */
export const grupuri = (...g: ReadonlyArray<readonly [number, string | number]>): string => g.map(([c, v]) => `${c}\n${v}\n`).join('');

export type FisierDxf = {
  /** Variabilele antetului, ca perechi: `['$INSUNITS', 70, 4]`. */
  readonly antet?: ReadonlyArray<readonly [string, number, string | number]>;
  /** Straturile: numele, steagurile (1 = înghețat) și culoarea (negativă = oprit). */
  readonly straturi?: ReadonlyArray<{ readonly nume: string; readonly steaguri?: number; readonly culoare?: number }>;
  /** Blocurile: numele, punctul de bază, steagurile și entitățile (text DXF). */
  readonly blocuri?: ReadonlyArray<{ readonly nume: string; readonly baza?: readonly [number, number]; readonly steaguri?: number; readonly entitati: string }>;
  readonly entitati: string;
};

/** Un DXF complet (antet, tabele, blocuri, entități, EOF), cu sfârșitul de linie ales. */
export function dxf(f: FisierDxf, sfarsit: '\n' | '\r\n' = '\n'): string {
  const antet = (f.antet ?? []).map(([nume, cod, val]) => grupuri([9, nume], [cod, val])).join('');
  const straturi = (f.straturi ?? []).map((s) => grupuri([0, 'LAYER'], [2, s.nume], [70, s.steaguri ?? 0], [62, s.culoare ?? 7], [6, 'CONTINUOUS'])).join('');
  const blocuri = (f.blocuri ?? []).map((b) => grupuri([0, 'BLOCK'], [8, '0'], [2, b.nume], [70, b.steaguri ?? 0], [10, b.baza?.[0] ?? 0], [20, b.baza?.[1] ?? 0], [30, 0], [3, b.nume])
    + b.entitati + grupuri([0, 'ENDBLK'], [8, '0'])).join('');
  const text = grupuri([0, 'SECTION'], [2, 'HEADER']) + antet + grupuri([0, 'ENDSEC'])
    + grupuri([0, 'SECTION'], [2, 'TABLES'], [0, 'TABLE'], [2, 'LAYER'], [70, (f.straturi ?? []).length]) + straturi + grupuri([0, 'ENDTAB'], [0, 'ENDSEC'])
    + grupuri([0, 'SECTION'], [2, 'BLOCKS']) + blocuri + grupuri([0, 'ENDSEC'])
    + grupuri([0, 'SECTION'], [2, 'ENTITIES']) + f.entitati + grupuri([0, 'ENDSEC'], [0, 'EOF']);
  return sfarsit === '\n' ? text : text.replace(/\n/g, '\r\n');
}

export const octeti = (text: string): Uint8Array => new TextEncoder().encode(text);

/** Doar entitățile, fără antet (milimetrii declarați: `$INSUNITS` = 4). */
export const inMm = (entitati: string, alte: Omit<FisierDxf, 'entitati'> = {}): Uint8Array =>
  octeti(dxf({ ...alte, antet: [['$INSUNITS', 70, 4], ...(alte.antet ?? [])], entitati }));

type Optiuni = { readonly strat?: string; readonly extruziune?: readonly [number, number, number]; readonly alte?: ReadonlyArray<readonly [number, string | number]> };
const comune = (o: Optiuni): Array<readonly [number, string | number]> => [
  [8, o.strat ?? '0'],
  ...(o.extruziune ? [[210, o.extruziune[0]], [220, o.extruziune[1]], [230, o.extruziune[2]]] as const : []),
  ...(o.alte ?? []),
];

export const linie = (x1: number, y1: number, x2: number, y2: number, o: Optiuni & { readonly z?: readonly [number, number] } = {}): string =>
  grupuri([0, 'LINE'], ...comune(o), [10, x1], [20, y1], [30, o.z?.[0] ?? 0], [11, x2], [21, y2], [31, o.z?.[1] ?? 0]);

export const cerc = (x: number, y: number, r: number, o: Optiuni = {}): string =>
  grupuri([0, 'CIRCLE'], ...comune(o), [10, x], [20, y], [30, 0], [40, r]);

/** Arcul: unghiurile în grade, trigonometric de la start la sfârșit (în OCS). */
export const arcDxf = (x: number, y: number, r: number, start: number, sfarsit: number, o: Optiuni = {}): string =>
  grupuri([0, 'ARC'], ...comune(o), [10, x], [20, y], [30, 0], [40, r], [50, start], [51, sfarsit]);

/** Elipsa: centrul, capătul axei mari (relativ), raportul, parametrii (radiani). */
export const elipsa = (x: number, y: number, mx: number, my: number, raport: number, t0 = 0, t1 = 2 * Math.PI, o: Optiuni = {}): string =>
  grupuri([0, 'ELLIPSE'], ...comune(o), [10, x], [20, y], [30, 0], [11, mx], [21, my], [31, 0], [40, raport], [41, t0], [42, t1]);

/** LWPOLYLINE: vârfurile [x, y, bulge?]. */
export const lwpolilinie = (v: ReadonlyArray<readonly [number, number, number?]>, inchisa: boolean, o: Optiuni = {}): string =>
  grupuri([0, 'LWPOLYLINE'], ...comune(o), [90, v.length], [70, inchisa ? 1 : 0], ...v.flatMap(([x, y, b]) =>
    [[10, x], [20, y], ...(b ? [[42, b] as const] : [])] as Array<readonly [number, string | number]>));

/** POLYLINE cu VERTEX și SEQEND (R12): vârfurile [x, y, bulge?, z?, steaguri?]. */
export const polilinie = (v: ReadonlyArray<readonly [number, number, number?, number?, number?]>, steaguri: number, o: Optiuni = {}): string =>
  grupuri([0, 'POLYLINE'], ...comune(o), [66, 1], [10, 0], [20, 0], [30, 0], [70, steaguri])
  + v.map(([x, y, b, z, s]) => grupuri([0, 'VERTEX'], [8, o.strat ?? '0'], [10, x], [20, y], [30, z ?? 0], ...(b ? [[42, b] as const] : []), ...(s ? [[70, s] as const] : []))).join('')
  + grupuri([0, 'SEQEND'], [8, o.strat ?? '0']);

/** SPLINE: gradul, nodurile, punctele de control (cu ponderile, dacă e rațională) și steagurile. */
export const spline = (grad: number, noduri: readonly number[], puncte: ReadonlyArray<readonly [number, number, number?]>, o: Optiuni & {
  readonly ponderi?: readonly number[]; readonly steaguri?: number; readonly potrivire?: ReadonlyArray<readonly [number, number]>;
} = {}): string =>
  grupuri([0, 'SPLINE'], ...comune(o), [70, o.steaguri ?? (o.ponderi ? 4 : 0)], [71, grad], [72, noduri.length], [73, puncte.length], [74, o.potrivire?.length ?? 0],
    ...noduri.map((k) => [40, k] as const), ...(o.ponderi ?? []).map((w) => [41, w] as const),
    ...puncte.flatMap(([x, y, z]) => [[10, x], [20, y], [30, z ?? 0]] as Array<readonly [number, string | number]>),
    ...(o.potrivire ?? []).flatMap(([x, y]) => [[11, x], [21, y], [31, 0]] as Array<readonly [number, string | number]>));

/** INSERT: blocul, punctul, scara, rotirea (grade); matricea (coloane, rânduri, distanțele) opțional. */
export const insert = (bloc: string, x: number, y: number, o: Optiuni & {
  readonly scara?: readonly [number, number]; readonly rotire?: number;
  readonly matrice?: { readonly coloane: number; readonly randuri: number; readonly dx: number; readonly dy: number };
} = {}): string =>
  grupuri([0, 'INSERT'], ...comune(o), [2, bloc], [10, x], [20, y], [30, 0], [41, o.scara?.[0] ?? 1], [42, o.scara?.[1] ?? 1], [43, 1], [50, o.rotire ?? 0],
    ...(o.matrice ? [[70, o.matrice.coloane], [71, o.matrice.randuri], [44, o.matrice.dx], [45, o.matrice.dy]] as Array<readonly [number, string | number]> : []));

/* ── Geometria ─────────────────────────────────────────────────────────────────────────────────────────────────────── */

export type Cale = { readonly varfuri: readonly Varf[]; readonly inchis: boolean };
export type Seg = { readonly a: Punct; readonly b: Punct; readonly s: Segment };

/** Segmentele căii: n pe una închisă, n − 1 pe una deschisă. */
export function segmente(c: Cale): Seg[] {
  const n = c.varfuri.length;
  const m = c.inchis ? n : n - 1;
  const rez: Seg[] = [];
  for (let i = 0; i < m; i++) {
    const va = c.varfuri[i] as Varf;
    const vb = c.varfuri[(i + 1) % n] as Varf;
    rez.push({ a: va.p, b: vb.p, s: va.s });
  }
  return rez;
}

/** Cercul unui arc din capete și bulge: baleiajul 4·atan(β), raza din coardă, centrul pe mediatoare (spre stânga, la β > 0). */
export function cercArc(a: Punct, b: Punct, bulge: number): { c: Punct; r: number; a0: number; da: number } {
  const da = 4 * Math.atan(bulge);
  const dx = b.x - a.x, dy = b.y - a.y;
  const coarda = Math.hypot(dx, dy);
  const r = coarda / (2 * Math.abs(Math.sin(da / 2)));
  const h = Math.sign(da) * r * Math.cos(da / 2);
  const c = { x: (a.x + b.x) / 2 - (dy / coarda) * h, y: (a.y + b.y) / 2 + (dx / coarda) * h };
  return { c, r, a0: Math.atan2(a.y - c.y, a.x - c.x), da };
}

const bezier = (s: Seg & { s: { tip: 'C' } }, t: number): Punct => {
  const u = 1 - t;
  const { a, b } = s, { c1, c2 } = s.s;
  return {
    x: u * u * u * a.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * b.x,
    y: u * u * u * a.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * b.y,
  };
};
const derivata = (s: Seg & { s: { tip: 'C' } }, t: number): Punct => {
  const u = 1 - t;
  const { a, b } = s, { c1, c2 } = s.s;
  return {
    x: 3 * u * u * (c1.x - a.x) + 6 * u * t * (c2.x - c1.x) + 3 * t * t * (b.x - c2.x),
    y: 3 * u * u * (c1.y - a.y) + 6 * u * t * (c2.y - c1.y) + 3 * t * t * (b.y - c2.y),
  };
};
const derivata2 = (s: Seg & { s: { tip: 'C' } }, t: number): Punct => {
  const u = 1 - t;
  const { a, b } = s, { c1, c2 } = s.s;
  return { x: 6 * u * (c2.x - 2 * c1.x + a.x) + 6 * t * (b.x - 2 * c2.x + c1.x), y: 6 * u * (c2.y - 2 * c1.y + a.y) + 6 * t * (b.y - 2 * c2.y + c1.y) };
};

/** Punctul segmentului la t ∈ [0, 1]: linia și cubica după parametru, arcul după unghi. */
export function punctPe(s: Seg, t: number): Punct {
  if (s.s.tip === 'L') return { x: s.a.x + (s.b.x - s.a.x) * t, y: s.a.y + (s.b.y - s.a.y) * t };
  if (s.s.tip === 'A') {
    const k = cercArc(s.a, s.b, s.s.bulge);
    const u = k.a0 + k.da * t;
    return { x: k.c.x + k.r * Math.cos(u), y: k.c.y + k.r * Math.sin(u) };
  }
  return bezier(s as Seg & { s: { tip: 'C' } }, t);
}

const dist = (p: Punct, q: Punct): number => Math.hypot(p.x - q.x, p.y - q.y);

/** Distanța de la q la segment: exactă pe linie și pe arc; pe cubică, cel mai bun dintre 64 de eșantioane, rafinat Newton. */
export function distantaLaSegment(q: Punct, s: Seg): number {
  if (s.s.tip === 'L') {
    const dx = s.b.x - s.a.x, dy = s.b.y - s.a.y;
    const l2 = dx * dx + dy * dy;
    const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((q.x - s.a.x) * dx + (q.y - s.a.y) * dy) / l2));
    return dist(q, { x: s.a.x + dx * t, y: s.a.y + dy * t });
  }
  if (s.s.tip === 'A') {
    const k = cercArc(s.a, s.b, s.s.bulge);
    // Unghiul lui q, dus în sensul arcului de la a0: înăuntrul baleiajului, distanța la cerc; altfel, la capete.
    const u = Math.atan2(q.y - k.c.y, q.x - k.c.x);
    let rel = (u - k.a0) * Math.sign(k.da);
    rel = ((rel % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    if (rel <= Math.abs(k.da)) return Math.abs(dist(q, k.c) - k.r);
    return Math.min(dist(q, s.a), dist(q, s.b));
  }
  const c = s as Seg & { s: { tip: 'C' } };
  let best = 0, bd = Infinity;
  for (let i = 0; i <= 64; i++) {
    const t = i / 64;
    const d = dist(q, bezier(c, t));
    if (d < bd) { bd = d; best = t; }
  }
  let t = best;
  for (let k = 0; k < 30; k++) {
    const p = bezier(c, t), d1 = derivata(c, t), d2 = derivata2(c, t);
    const f = (p.x - q.x) * d1.x + (p.y - q.y) * d1.y;
    const df = d1.x * d1.x + d1.y * d1.y + (p.x - q.x) * d2.x + (p.y - q.y) * d2.y;
    if (df === 0) break;
    t = Math.max(0, Math.min(1, t - f / df));
  }
  return Math.min(bd, dist(q, bezier(c, t)));
}

export const distantaLaCale = (q: Punct, c: Cale): number => Math.min(...segmente(c).map((s) => distantaLaSegment(q, s)));

/** Aria cu semn (pozitivă trigonometric), cu Green: coarda plus segmentul de cerc; cubica pe 5 puncte Gauss (exact). */
export function arie(c: Cale): number {
  const G = [[0, 0.5688888888888889], [-0.5384693101056831, 0.47862867049936647], [0.5384693101056831, 0.47862867049936647],
    [-0.906179845938664, 0.23692688505618908], [0.906179845938664, 0.23692688505618908]] as const;
  let a = 0;
  for (const s of segmente(c)) {
    a += (s.a.x * s.b.y - s.b.x * s.a.y) / 2;
    if (s.s.tip === 'A') {
      const k = cercArc(s.a, s.b, s.s.bulge);
      a += (k.r * k.r / 2) * (k.da - Math.sin(k.da));
    } else if (s.s.tip === 'C') {
      // ∫ (x·y' − y·x') / 2 dt pe cubică, minus coarda (adunată deja): polinom de grad 5, deci exact pe 5 puncte.
      const cub = s as Seg & { s: { tip: 'C' } };
      let i = 0;
      for (const [x, w] of G) {
        const t = (x + 1) / 2;
        const p = bezier(cub, t), d = derivata(cub, t);
        i += (w / 2) * (p.x * d.y - p.y * d.x) / 2;
      }
      a += i - (s.a.x * s.b.y - s.b.x * s.a.y) / 2;
    }
  }
  return a;
}

/** Cutia exactă: capetele, extremele arcelor pe axe, rădăcinile derivatei cubicelor. */
export function cutie(c: Cale): { minX: number; minY: number; maxX: number; maxY: number } {
  const pct: Punct[] = [];
  for (const s of segmente(c)) {
    pct.push(s.a, s.b);
    if (s.s.tip === 'A') {
      const k = cercArc(s.a, s.b, s.s.bulge);
      for (const u of [0, Math.PI / 2, Math.PI, 1.5 * Math.PI]) {
        let rel = (u - k.a0) * Math.sign(k.da);
        rel = ((rel % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        if (rel <= Math.abs(k.da)) pct.push({ x: k.c.x + k.r * Math.cos(u), y: k.c.y + k.r * Math.sin(u) });
      }
    } else if (s.s.tip === 'C') {
      const cub = s as Seg & { s: { tip: 'C' } };
      for (const ax of ['x', 'y'] as const) {
        // B'(t) = 3[(1−t)²(c1−a) + 2(1−t)t(c2−c1) + t²(b−c2)] = A t² + B t + C.
        const p0 = s.a[ax], p1 = s.s.c1[ax], p2 = s.s.c2[ax], p3 = s.b[ax];
        const A = -p0 + 3 * p1 - 3 * p2 + p3, B = 2 * (p0 - 2 * p1 + p2), C = p1 - p0;
        const rad = Math.abs(A) < 1e-15 ? (Math.abs(B) < 1e-15 ? [] : [-C / B]) : (() => {
          const d = B * B - 4 * A * C;
          return d < 0 ? [] : [(-B + Math.sqrt(d)) / (2 * A), (-B - Math.sqrt(d)) / (2 * A)];
        })();
        for (const t of rad) if (t > 0 && t < 1) pct.push(bezier(cub, t));
      }
    }
  }
  return {
    minX: Math.min(...pct.map((p) => p.x)), minY: Math.min(...pct.map((p) => p.y)),
    maxX: Math.max(...pct.map((p) => p.x)), maxY: Math.max(...pct.map((p) => p.y)),
  };
}

/** Eșantioanele căii: `n` pe fiecare segment, cu capetele. */
export function esantioane(c: Cale, n = 16): Punct[] {
  return segmente(c).flatMap((s) => Array.from({ length: n + 1 }, (_, i) => punctPe(s, i / n)));
}

/** Pe elipsa (c, a, b, rotirea în grade): |ρ − 1|, cu ρ² = (u/a)² + (v/b)² în axele ei. */
export function abatereElipsa(p: Punct, e: { readonly c: readonly [number, number]; readonly a: number; readonly b: number; readonly rot_grade: number }): number {
  const t = (e.rot_grade * Math.PI) / 180;
  const dx = p.x - e.c[0], dy = p.y - e.c[1];
  const u = dx * Math.cos(t) + dy * Math.sin(t), v = -dx * Math.sin(t) + dy * Math.cos(t);
  return Math.abs(Math.sqrt((u / e.a) ** 2 + (v / e.b) ** 2) - 1);
}

export const aproape = (p: Punct, q: readonly [number, number] | Punct, tol = 1e-9): boolean => {
  const [x, y] = Array.isArray(q) ? q : [(q as Punct).x, (q as Punct).y];
  return Math.hypot(p.x - (x as number), p.y - (y as number)) <= tol;
};
