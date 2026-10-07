/**
 * Conturul (T1, ADR 0001): trei primitive, linie, arc de cerc și cubică. Fiecare vârf poartă segmentul care pleacă din
 * el spre vârful următor. Arcul e dat de `bulge` = tan(baleiaj / 4): pozitiv în sens trigonometric, negativ în sens orar.
 *
 * Un contur închis cu n vârfuri are n segmente. Unul deschis are n − 1, iar segmentul ultimului vârf e `L`, neluat în
 * seamă (aceeași convenție ca polilinia cavalier și LWPOLYLINE din DXF).
 */

export type Punct = { readonly x: number; readonly y: number };

export type Segment =
  | { readonly tip: 'L' }
  | { readonly tip: 'A'; readonly bulge: number }
  | { readonly tip: 'C'; readonly c1: Punct; readonly c2: Punct };

export type Varf = { readonly p: Punct; readonly s: Segment };

export type Contur = { readonly inchis: boolean; readonly varfuri: readonly Varf[] };

export const LINIE: Segment = { tip: 'L' };

export function arc(bulge: number): Segment {
  return { tip: 'A', bulge };
}

/** Câte segmente are conturul. */
export function numarSegmente(c: Contur): number {
  return c.inchis ? c.varfuri.length : Math.max(0, c.varfuri.length - 1);
}

/** Segmentul i: capetele lui și forma. */
export function segment(c: Contur, i: number): { readonly a: Punct; readonly b: Punct; readonly s: Segment } {
  const n = c.varfuri.length;
  const va = c.varfuri[i];
  const vb = c.varfuri[(i + 1) % n];
  if (!va || !vb || i < 0 || i >= numarSegmente(c)) throw new RangeError(`segmentul ${i} nu există (${numarSegmente(c)} segmente)`);
  return { a: va.p, b: vb.p, s: va.s };
}

/** Cercul unui arc dat prin capete și bulge: centrul, raza, unghiul de start și baleiajul cu semn. */
export function cerculArcului(a: Punct, b: Punct, bulge: number): { centru: Punct; raza: number; start: number; baleiaj: number } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const coarda = Math.hypot(dx, dy);
  // Centrul stă pe mediatoarea coardei, la (c/2)·(1 − β²)/(2β) spre normala din stânga.
  const k = (1 - bulge * bulge) / (4 * bulge);
  const centru = { x: (a.x + b.x) / 2 - dy * k, y: (a.y + b.y) / 2 + dx * k };
  const raza = (coarda * (1 + bulge * bulge)) / (4 * Math.abs(bulge));
  return { centru, raza, start: Math.atan2(a.y - centru.y, a.x - centru.x), baleiaj: 4 * Math.atan(bulge) };
}

/** Nodurile Gauss–Legendre pe [0, 1], cu 3 puncte: exacte pentru polinoame de grad ≤ 5. */
const GL3: ReadonlyArray<readonly [number, number]> = [
  [0.5 - Math.sqrt(0.15), 5 / 18],
  [0.5, 8 / 18],
  [0.5 + Math.sqrt(0.15), 5 / 18],
];

/**
 * Aria cu semn (pozitivă în sens trigonometric), exactă pe fiecare primitivă:
 * - linia: termenul shoelace;
 * - arcul: termenul coardei plus segmentul de cerc, (r² / 2)·(θ − sin θ), cu θ cu semn;
 * - cubica: ∫(x·y′ − y·x′)/2, un polinom de grad 5, integrat exact cu 3 noduri Gauss.
 */
export function arieCuSemn(c: Contur): number {
  if (!c.inchis) throw new Error('aria cere un contur închis');
  let arie = 0;
  for (let i = 0; i < numarSegmente(c); i++) {
    const { a, b, s } = segment(c, i);
    if (s.tip === 'L') {
      arie += (a.x * b.y - b.x * a.y) / 2;
    } else if (s.tip === 'A') {
      const { raza, baleiaj } = cerculArcului(a, b, s.bulge);
      arie += (a.x * b.y - b.x * a.y) / 2 + ((raza * raza) / 2) * (baleiaj - Math.sin(baleiaj));
    } else {
      const { c1, c2 } = s;
      for (const [t, w] of GL3) {
        const u = 1 - t;
        const x = u * u * u * a.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * b.x;
        const y = u * u * u * a.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * b.y;
        const dx = 3 * (u * u * (c1.x - a.x) + 2 * u * t * (c2.x - c1.x) + t * t * (b.x - c2.x));
        const dy = 3 * (u * u * (c1.y - a.y) + 2 * u * t * (c2.y - c1.y) + t * t * (b.y - c2.y));
        arie += (w * (x * dy - y * dx)) / 2;
      }
    }
  }
  return arie;
}

/** Același contur, parcurs invers: vârfurile în ordine inversă, arcele cu bulge-ul negat, cubicele cu punctele schimbate. */
export function inverseaza(c: Contur): Contur {
  const n = c.varfuri.length;
  const m = numarSegmente(c);
  const varfuri: Varf[] = [];
  for (let k = 0; k < n; k++) {
    // Noul vârf k e vechiul vârf n−1−k (închis: rotit ca pornirea să rămână vârful 0).
    const vechi = c.inchis ? (n - k) % n : n - 1 - k;
    const p = c.varfuri[vechi]?.p;
    if (!p) throw new Error('contur fără vârfuri');
    // Segmentul care pleacă din noul vârf k e vechiul segment care intra în el, parcurs invers.
    const iSeg = (vechi - 1 + n) % n;
    let s: Segment = LINIE;
    if (c.inchis || k < m) {
      const veche = c.varfuri[iSeg]?.s ?? LINIE;
      s = veche.tip === 'A' ? arc(-veche.bulge) : veche.tip === 'C' ? { tip: 'C', c1: veche.c2, c2: veche.c1 } : LINIE;
    }
    varfuri.push({ p, s });
  }
  return { inchis: c.inchis, varfuri };
}

/** Conturul închis, adus în sens trigonometric (aria pozitivă). */
export function inSensTrigonometric(c: Contur): Contur {
  return arieCuSemn(c) < 0 ? inverseaza(c) : c;
}

/** Dreptunghiul cu colțul stânga-jos în (x, y), parcurs trigonometric; cu `raza` > 0, colțurile sunt arce de 90°. */
export function conturDreptunghi(x: number, y: number, latime: number, inaltime: number, raza = 0): Contur {
  if (!(latime > 0 && inaltime > 0)) throw new RangeError('dreptunghiul cere lățime și înălțime pozitive');
  if (!(raza >= 0) || 2 * raza > Math.min(latime, inaltime)) throw new RangeError('raza colțului nu încape în dreptunghi');
  if (raza === 0) {
    return {
      inchis: true,
      varfuri: [
        { p: { x, y }, s: LINIE },
        { p: { x: x + latime, y }, s: LINIE },
        { p: { x: x + latime, y: y + inaltime }, s: LINIE },
        { p: { x, y: y + inaltime }, s: LINIE },
      ],
    };
  }
  const sfert = arc(Math.tan(Math.PI / 8)); // 90° trigonometric
  const x1 = x + latime;
  const y1 = y + inaltime;
  return {
    inchis: true,
    varfuri: [
      { p: { x: x + raza, y }, s: LINIE },
      { p: { x: x1 - raza, y }, s: sfert },
      { p: { x: x1, y: y + raza }, s: LINIE },
      { p: { x: x1, y: y1 - raza }, s: sfert },
      { p: { x: x1 - raza, y: y1 }, s: LINIE },
      { p: { x: x + raza, y: y1 }, s: sfert },
      { p: { x, y: y1 - raza }, s: LINIE },
      { p: { x, y: y + raza }, s: sfert },
    ],
  };
}

/** Cercul: două arce de 180° (bulge 1), trigonometric, pornind din punctul cel mai din dreapta. */
export function conturCerc(cx: number, cy: number, raza: number): Contur {
  if (!(raza > 0)) throw new RangeError('cercul cere o rază pozitivă');
  return {
    inchis: true,
    varfuri: [
      { p: { x: cx + raza, y: cy }, s: arc(1) },
      { p: { x: cx - raza, y: cy }, s: arc(1) },
    ],
  };
}
