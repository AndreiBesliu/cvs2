/**
 * Grila reliefului (ADR 0310 §1, ADR 0311 §1): nx × ny celule pătrate, cu j în sus și originea în colțul stânga-jos;
 * dalele de 256 × 256 (`PLAN.md` §3.4). Plafoanele: 8192 pe latură (răspunsul 4a la ADR 0310), celula între 0,001 și 100 mm,
 * latura cel mult cât a documentului.
 */

export const LATURA_DALA = 256;
export const CELULE_DALA = LATURA_DALA * LATURA_DALA;
/** Cel mult atâtea celule pe o latură a unui relief (răspunsul 4a: 8192 × 8192, ~256 MB pe strat în memorie). */
export const LATURA_MAXIMA = 8192;
export const CELULA_MINIMA = 0.001;
export const CELULA_MAXIMA = 100;
/** Latura reliefului în mm, cel mult cât plafonul laturii documentului (`PLAFON.latura`). */
export const LATURA_MM_MAXIMA = 10_000;

export type Grila = { readonly nx: number; readonly ny: number; readonly celula: number };

/** Câte dale pe orizontală și pe verticală. */
export function dale(nx: number, ny: number): { readonly tx: number; readonly ty: number } {
  return { tx: Math.ceil(nx / LATURA_DALA), ty: Math.ceil(ny / LATURA_DALA) };
}

/** De ce nu e bună o grilă (codul motivului), sau null. */
export function motivGrila(g: Grila): 'latura' | 'celula' | 'mm' | null {
  const intreg = (x: number): boolean => Number.isInteger(x) && x >= 1 && x <= LATURA_MAXIMA;
  if (!intreg(g.nx) || !intreg(g.ny)) return 'latura';
  if (!Number.isFinite(g.celula) || g.celula < CELULA_MINIMA || g.celula > CELULA_MAXIMA) return 'celula';
  if (g.nx * g.celula > LATURA_MM_MAXIMA || g.ny * g.celula > LATURA_MM_MAXIMA) return 'mm';
  return null;
}
