/**
 * Arcele ca cubice, pentru formatele fără arc (PDF, EPS; ADR 0089): aproximarea declarată din `PLAN.md` T2. Un arc de
 * unghi φ e împărțit în n bucăți egale, fiecare scrisă cu cubica standard (capetele pe cerc, tangentele lor, brațul
 * k = 4/3 · tan(φ / 4n) · r), cu n cel mai mic pentru care abaterea radială (măsurată pe cubică, nu estimată) rămâne sub
 * `TOLERANTA_CUBICE`. Puține curbe, nu sute: cercul R50 iese din 7, cu sub 0,001 mm.
 */
import type { Punct } from '../geom/conturBaza.ts';

/** Abaterea permisă a cubicelor față de arc, în mm (toleranța proiectului, `PLAN.md` T2). */
export const TOLERANTA_CUBICE = 0.001;

export type Cubica = { readonly c1: Punct; readonly c2: Punct; readonly p: Punct };

/** Abaterea radială maximă a cubicei standard pe un arc de unghi φ, pe cercul de rază r (32 de puncte, plus capetele). */
export function abatereCubica(r: number, fi: number): number {
  const k = (4 / 3) * Math.tan(fi / 4);
  // Arcul din (1, 0) în (cos φ, sin φ), pe cercul unitate.
  const p0 = { x: 1, y: 0 }, p1 = { x: 1, y: k }, p3 = { x: Math.cos(fi), y: Math.sin(fi) };
  const p2 = { x: p3.x + k * Math.sin(fi), y: p3.y - k * Math.cos(fi) };
  let max = 0;
  for (let i = 1; i < 32; i++) {
    const t = i / 32, u = 1 - t;
    const x = u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x;
    const y = u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y;
    max = Math.max(max, Math.abs(Math.hypot(x, y) - 1));
  }
  return max * r;
}

/** În câte bucăți se scrie un arc de unghi |φ| pe raza r: cel mult 90° fiecare și sub toleranță (cu 10 % rezervă). */
export function bucatiArc(r: number, fi: number): number {
  let n = Math.max(1, Math.ceil(Math.abs(fi) / (Math.PI / 2) - 1e-12));
  while (abatereCubica(r, Math.abs(fi) / n) > 0.9 * TOLERANTA_CUBICE) n++;
  return n;
}

/** Arcul de centru c, rază r, de la unghiul u0, cu baleiajul φ (cu semn: pozitiv trigonometric), ca n cubice. */
export function arcCubice(c: Punct, r: number, u0: number, fi: number): Cubica[] {
  const n = bucatiArc(r, fi);
  const d = fi / n, k = (4 / 3) * Math.tan(d / 4) * r;
  const rez: Cubica[] = [];
  for (let i = 0; i < n; i++) {
    const a = u0 + i * d, b = a + d;
    const pa = { x: c.x + r * Math.cos(a), y: c.y + r * Math.sin(a) };
    const pb = { x: c.x + r * Math.cos(b), y: c.y + r * Math.sin(b) };
    rez.push({
      c1: { x: pa.x - k * Math.sin(a), y: pa.y + k * Math.cos(a) },
      c2: { x: pb.x + k * Math.sin(b), y: pb.y - k * Math.cos(b) },
      p: pb,
    });
  }
  return rez;
}

/** Arcul dintre a și b cu bulge-ul dat (cum îl ține polilinia), ca cubice; ultimul punct e exact b. */
export function arcBulgeCubice(a: Punct, b: Punct, bulge: number): Cubica[] {
  const fi = 4 * Math.atan(bulge);
  const coarda = Math.hypot(b.x - a.x, b.y - a.y);
  const r = coarda / (2 * Math.abs(Math.sin(fi / 2)));
  // Centrul: pe mediatoarea coardei, la (1 − b²) / (4b) · coarda de mijloc, spre stânga mersului pentru b > 0.
  const s = (1 - bulge * bulge) / (4 * bulge);
  const c = { x: (a.x + b.x) / 2 - s * (b.y - a.y), y: (a.y + b.y) / 2 + s * (b.x - a.x) };
  const rez = arcCubice(c, r, Math.atan2(a.y - c.y, a.x - c.x), fi);
  const ultima = rez[rez.length - 1]!;
  rez[rez.length - 1] = { ...ultima, p: { x: b.x, y: b.y } };
  return rez;
}
