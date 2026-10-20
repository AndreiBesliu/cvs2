/**
 * Uneltele de desen (ADR 0051), partea pură: din cele două capete ale gestului (în mm ai foii, deja lipite) iese forma
 * exactă și locul instanței ei. Dreptunghiul și elipsa merg din colț în colț, cercul și poligonul din centru, linia din
 * capăt în capăt; Shift face pătrat / cerc sau pași de 15°. Elipsa se face cu aceeași funcție și toleranță ca importul SVG.
 */
import { arcEliptic } from '../geom/elipsa.ts';
import { TOLERANTA_IMPORT } from '../geom/toleranta.ts';
import type { FormaDoc, VarfDoc } from '../model/document.ts';

export const UNELTE = ['selectie', 'dreptunghi', 'cerc', 'elipsa', 'linie', 'poligon'] as const;
export type Unealta = (typeof UNELTE)[number];
export type UnealtaDesen = Exclude<Unealta, 'selectie'>;

/** Tasta fiecărei unelte (fără modificatori). */
export const TASTE_UNELTE: Readonly<Record<string, Unealta>> = { v: 'selectie', r: 'dreptunghi', o: 'cerc', e: 'elipsa', l: 'linie', p: 'poligon' };

export const LATURI_MIN = 3;
export const LATURI_MAX = 64;

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
      const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
      // Razele egale (Shift): un cerc exact, nu cubice.
      if (Math.abs(rx - ry) <= 1e-12 * Math.max(rx, ry)) return { forma: { tip: 'cerc', raza: rx }, x: cx, y: cy };
      const start = { x: rx, y: 0 };
      const lant = arcEliptic({ a: rx, b: 0, c: 0, d: ry, e: 0, f: 0 }, 0, 2 * Math.PI, start, start, TOLERANTA_IMPORT);
      const varfuri: VarfDoc[] = [];
      let p0: P = start;
      for (const c of lant) {
        varfuri.push({ p: { x: p0.x, y: p0.y }, s: { tip: 'C', c1: { x: c.c1.x, y: c.c1.y }, c2: { x: c.c2.x, y: c.c2.y } } });
        p0 = c.b;
      }
      return { forma: { tip: 'cale', inchis: true, varfuri }, x: cx, y: cy };
    }
    case 'linie': {
      if (Math.hypot(dx, dy) < minim) return null;
      return { forma: { tip: 'cale', inchis: false, varfuri: [L({ x: 0, y: 0 }), L({ x: dx, y: dy })] }, x: a.x, y: a.y };
    }
    case 'poligon': {
      const r = Math.hypot(dx, dy);
      const n = Math.round(Math.min(LATURI_MAX, Math.max(LATURI_MIN, laturi)));
      if (r < minim) return null;
      const u0 = Math.atan2(dy, dx);
      const varfuri = Array.from({ length: n }, (_, k) => L({ x: r * Math.cos(u0 + (2 * Math.PI * k) / n), y: r * Math.sin(u0 + (2 * Math.PI * k) / n) }));
      return { forma: { tip: 'cale', inchis: true, varfuri }, x: a.x, y: a.y };
    }
  }
}
