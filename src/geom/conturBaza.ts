/**
 * Conturul (T1, ADR 0001): trei primitive, linie, arc de cerc și cubică. Fiecare vârf poartă segmentul care pleacă din
 * el spre vârful următor. Arcul e dat de `bulge` = tan(baleiaj / 4): pozitiv în sens trigonometric, negativ în sens orar.
 *
 * Un contur închis cu n vârfuri are n segmente. Unul deschis are n − 1, iar segmentul ultimului vârf e `L`, neluat în
 * seamă (aceeași convenție ca polilinia cavalier și LWPOLYLINE din DXF).
 *
 * Nucleul (tipurile, primitivele, segmentele, cercul unui arc, dreptunghiul și cercul) stă aici: îl importă pachetul de
 * pornire (formele, cutiile, matricile, desenul). Orientarea (aria cu semn, inversarea) stă în `contur.ts`, care
 * reexportă nucleul: o folosesc doar CAM-ul, offsetul și normalizarea nonzero, aduse la cerere (loc în pachetul de
 * pornire, 17.10).
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
  // Centrul stă pe mediatoarea coardei, la (c/2)·(1 − β²)/(2β) spre normala din stânga. La |β| uriaș (un cerc aproape
  // întreg pe o coardă minusculă), β² depășește double-ul: atunci forma fără pătrat, (1/β − β)/4 și (c/4)(|β| + 1/|β|)
  // (recenzia A: centrul ieșea NaN, iar postul omitea tăcut cercul). Altfel, forma de până acum, cu aceiași biți.
  const finit = Number.isFinite(bulge * bulge);
  const k = finit ? (1 - bulge * bulge) / (4 * bulge) : (1 / bulge - bulge) / 4;
  const centru = { x: (a.x + b.x) / 2 - dy * k, y: (a.y + b.y) / 2 + dx * k };
  const raza = finit ? (coarda * (1 + bulge * bulge)) / (4 * Math.abs(bulge)) : (coarda / 4) * (Math.abs(bulge) + 1 / Math.abs(bulge));
  return { centru, raza, start: Math.atan2(a.y - centru.y, a.x - centru.x), baleiaj: 4 * Math.atan(bulge) };
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
