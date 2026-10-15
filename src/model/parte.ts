import type { Matrice } from '../geom/matrice.ts';

/**
 * Partea sculei pe foaie, a unei tăieturi pe o parte (ADR 0037 §3): una pentru CAM (profilul) și pentru pânză (liniuța de
 * lângă săgeată), ca ce se vede să fie ce se taie. Stă în model, nu în CAM: pânza o folosește la pornire, fără offset.
 */

/** Matricea oglindește: determinantul ei e negativ. */
export const oglindeste = (m: Matrice): boolean => m.a * m.d - m.b * m.c < 0;

/** Partea sculei pe foaie: latura, inversată sub o oglindire (`parteaLume = latura XOR (det < 0)`). */
export function parteaLume(latura: 'stanga' | 'dreapta', oglindit: boolean): 'stanga' | 'dreapta' {
  return (latura === 'stanga') !== oglindit ? 'stanga' : 'dreapta';
}
