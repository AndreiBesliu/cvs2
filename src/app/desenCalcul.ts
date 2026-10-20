/**
 * Uneltele de desen (ADR 0051), partea pură: din cele două capete ale gestului (în mm ai foii, deja lipite) iese forma
 * exactă și locul instanței ei. Dreptunghiul și elipsa merg din colț în colț, cercul și poligonul din centru, linia din
 * capăt în capăt; Shift face pătrat / cerc sau pași de 15°. Elipsa se face cu aceeași funcție și toleranță ca importul SVG.
 */
import type { FormaDoc, VarfDoc } from '../model/document.ts';
import { elipsa, LATURI_MAX, LATURI_MIN, poligonRegulat } from '../model/formeParametrice.ts';

export { LATURI_MAX, LATURI_MIN };

/** Uneltele barei: Selecția, Transformarea (mânerele de scalare și rotire, ADR 0053) și cele de desen. */
export const UNELTE = ['selectie', 'transformare', 'dreptunghi', 'cerc', 'elipsa', 'linie', 'poligon'] as const;
export type Unealta = (typeof UNELTE)[number];
export type UnealtaDesen = Exclude<Unealta, 'selectie' | 'transformare'>;

/** Pură: unealta desenează (pânza îi dă gestul), sau alege (Selecția, Transformarea). */
export const deseneaza = (u: Unealta): u is UnealtaDesen => u !== 'selectie' && u !== 'transformare';

/** Tasta fiecărei unelte (fără modificatori). */
export const TASTE_UNELTE: Readonly<Record<string, Unealta>> = { v: 'selectie', s: 'transformare', r: 'dreptunghi', o: 'cerc', e: 'elipsa', l: 'linie', p: 'poligon' };

export interface FormaDesenata {
  readonly forma: FormaDoc;
  /** Locul instanței (originea locală a formei), în mm ai foii. */
  readonly x: number;
  readonly y: number;
}

type P = { readonly x: number; readonly y: number };

const PAS_UNGHI = Math.PI / 12;

/** Pură: unghiul rotunjit la pași de 15°, cu aceeași lungime. */
function pe15(a: P, b: P): P {
  const r = Math.hypot(b.x - a.x, b.y - a.y);
  const u = Math.round(Math.atan2(b.y - a.y, b.x - a.x) / PAS_UNGHI) * PAS_UNGHI;
  return { x: a.x + r * Math.cos(u), y: a.y + r * Math.sin(u) };
}

/** Pură: colțul opus, cu laturile egale (Shift), în direcția tragerii. */
function patrat(a: P, b: P): P {
  const l = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y));
  return { x: a.x + Math.sign(b.x - a.x || 1) * l, y: a.y + Math.sign(b.y - a.y || 1) * l };
}

/** Pură: al doilea capăt al gestului, după Shift (pătrat / cerc / 15°). */
export function capatConstrans(u: UnealtaDesen, a: P, b: P, shift: boolean): P {
  if (!shift) return b;
  if (u === 'dreptunghi' || u === 'elipsa') return patrat(a, b);
  if (u === 'linie' || u === 'poligon') return pe15(a, b);
  return b;
}

const L = (p: P): VarfDoc => ({ p: { x: p.x, y: p.y }, s: { tip: 'L' } });

/**
 * Pură: forma desenată între `a` și `b` (mm ai foii, după lipire și Shift), sau null dacă e degenerată (o latură, raza
 * sau lungimea sub `minim` mm: tragerea prea scurtă nu face nimic).
 */
export function formaDesenata(u: UnealtaDesen, a: P, b: P, laturi: number, minim: number): FormaDesenata | null {
  const dx = b.x - a.x, dy = b.y - a.y;
  switch (u) {
    case 'dreptunghi': {
      const w = Math.abs(dx), h = Math.abs(dy);
      if (w < minim || h < minim) return null;
      return { forma: { tip: 'dreptunghi', latime: w, inaltime: h, razaColt: 0 }, x: Math.min(a.x, b.x), y: Math.min(a.y, b.y) };
    }
    case 'cerc': {
      const r = Math.hypot(dx, dy);
      return r < minim ? null : { forma: { tip: 'cerc', raza: r }, x: a.x, y: a.y };
    }
    case 'elipsa': {
      const rx = Math.abs(dx) / 2, ry = Math.abs(dy) / 2;
      if (rx < minim / 2 || ry < minim / 2) return null;
      // Centrată în originea piesei; razele egale (Shift) dau un cerc exact, nu cubice (generatorul comun, ADR 0053).
      return { forma: elipsa({ x: 0, y: 0 }, rx, ry), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }
    case 'linie': {
      if (Math.hypot(dx, dy) < minim) return null;
      return { forma: { tip: 'cale', inchis: false, varfuri: [L({ x: 0, y: 0 }), L({ x: dx, y: dy })] }, x: a.x, y: a.y };
    }
    case 'poligon': {
      const r = Math.hypot(dx, dy);
      if (r < minim) return null;
      return { forma: poligonRegulat({ x: 0, y: 0 }, r, laturi, Math.atan2(dy, dx)), x: a.x, y: a.y };
    }
  }
}
