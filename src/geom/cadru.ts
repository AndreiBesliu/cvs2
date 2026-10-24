/**
 * Cadrul de selecție (ADR 0059), partea geometrică: un contur ATINGE un dreptunghi plin (are cel puțin un punct în el sau
 * pe marginea lui) — regula selecției trase de la dreapta la stânga. Exact pe linii și pe arce (cercul arcului tăiat cu
 * laturile, pe baleiajul lui); pe cubice, prin subdivizare, cu poligonul de control ca margine (curba stă în învelitoarea
 * lui convexă), până la o bucată sub `EPS_CUBICA` mm.
 *
 * Doar conturul contează, ca la vectori: un dreptunghi tras în întregime în interiorul unui cerc, fără să-i atingă
 * marginea, nu atinge cercul.
 */
import { cerculArcului, segment, numarSegmente, type Contur, type Punct } from './conturBaza.ts';
import type { Cutie } from './cutie.ts';
import { peArc } from './distanta.ts';

/** Sub mărimea asta (mm), o bucată de cubică se judecă după cutia ei: atinge dacă o cutie atât de mică atinge cadrul. */
export const EPS_CUBICA = 1e-6;

const inCutie = (p: Punct, r: Cutie): boolean => p.x >= r.minX && p.x <= r.maxX && p.y >= r.minY && p.y <= r.maxY;

/** Segmentul drept [a, b] atinge dreptunghiul (Liang–Barsky: tăierea lui pe cele patru semiplane lasă ceva). */
export function dreaptaAtinge(a: Punct, b: Punct, r: Cutie): boolean {
  let t0 = 0, t1 = 1;
  const dx = b.x - a.x, dy = b.y - a.y;
  const taie = (p: number, q: number): boolean => {
    if (p === 0) return q >= 0;
    const t = q / p;
    if (p < 0) {
      if (t > t1) return false;
      if (t > t0) t0 = t;
    } else {
      if (t < t0) return false;
      if (t < t1) t1 = t;
    }
    return true;
  };
  return taie(-dx, a.x - r.minX) && taie(dx, r.maxX - a.x) && taie(-dy, a.y - r.minY) && taie(dy, r.maxY - a.y) && t0 <= t1;
}

/** Arcul de la a la b, cu `bulge`, atinge dreptunghiul: un capăt înăuntru, sau cercul lui taie o latură pe baleiajul arcului. */
export function arcAtinge(a: Punct, b: Punct, bulge: number, r: Cutie): boolean {
  if (inCutie(a, r) || inCutie(b, r)) return true;
  if (Math.abs(bulge) < 1e-12) return dreaptaAtinge(a, b, r);
  const { centru: c, raza, start, baleiaj } = cerculArcului(a, b, bulge);
  // Cercul întreg departe de dreptunghi: nimic.
  if (c.x + raza < r.minX || c.x - raza > r.maxX || c.y + raza < r.minY || c.y - raza > r.maxY) return false;
  const peArcul = (x: number, y: number): boolean => peArc(Math.atan2(y - c.y, x - c.x), start, baleiaj);
  // Laturile verticale (x fix, y între minY și maxY), apoi cele orizontale.
  for (const x of [r.minX, r.maxX]) {
    const h = raza * raza - (x - c.x) * (x - c.x);
    if (h < 0) continue;
    const s = Math.sqrt(h);
    for (const y of [c.y - s, c.y + s]) if (y >= r.minY && y <= r.maxY && peArcul(x, y)) return true;
  }
  for (const y of [r.minY, r.maxY]) {
    const h = raza * raza - (y - c.y) * (y - c.y);
    if (h < 0) continue;
    const s = Math.sqrt(h);
    for (const x of [c.x - s, c.x + s]) if (x >= r.minX && x <= r.maxX && peArcul(x, y)) return true;
  }
  return false;
}

/** Cubica a, c1, c2, b atinge dreptunghiul (subdivizare de Casteljau, cu poligonul de control ca margine). */
export function cubicaAtinge(a: Punct, c1: Punct, c2: Punct, b: Punct, r: Cutie, adancime = 0): boolean {
  if (inCutie(a, r) || inCutie(b, r)) return true;
  const minX = Math.min(a.x, c1.x, c2.x, b.x), maxX = Math.max(a.x, c1.x, c2.x, b.x);
  const minY = Math.min(a.y, c1.y, c2.y, b.y), maxY = Math.max(a.y, c1.y, c2.y, b.y);
  if (maxX < r.minX || minX > r.maxX || maxY < r.minY || minY > r.maxY) return false;
  if ((maxX - minX <= EPS_CUBICA && maxY - minY <= EPS_CUBICA) || adancime >= 48) return true;
  const m = (p: Punct, q: Punct): Punct => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });
  const p01 = m(a, c1), p12 = m(c1, c2), p23 = m(c2, b), p012 = m(p01, p12), p123 = m(p12, p23), mij = m(p012, p123);
  return cubicaAtinge(a, p01, p012, mij, r, adancime + 1) || cubicaAtinge(mij, p123, p23, b, r, adancime + 1);
}

/** Conturul (deschis sau închis) atinge dreptunghiul plin: cel puțin un punct al lui e în el sau pe marginea lui. */
export function conturAtinge(c: Contur, r: Cutie): boolean {
  const n = numarSegmente(c);
  if (n === 0) return c.varfuri.some((v) => inCutie(v.p, r));
  for (let i = 0; i < n; i++) {
    const { a, b, s } = segment(c, i);
    if (s.tip === 'L' ? dreaptaAtinge(a, b, r) : s.tip === 'A' ? arcAtinge(a, b, s.bulge, r) : cubicaAtinge(a, s.c1, s.c2, b, r)) return true;
  }
  return false;
}

/** Cutia `interior` stă toată în `r` (marginea inclusă): regula selecției trase de la stânga la dreapta. */
export function cuprinsaIn(interior: Cutie, r: Cutie): boolean {
  return interior.minX >= r.minX && interior.maxX <= r.maxX && interior.minY >= r.minY && interior.maxY <= r.maxY;
}
