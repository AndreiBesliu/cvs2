import type { Matrice } from './matrice.ts';

/**
 * Inversa unei matrice afine, sau `null` dacă e degenerată. Stă separat de `matrice.ts` (care e în pachetul de pornire): o
 * folosesc doar bucățile la cerere (unealta Noduri, înclinarea, ADR 0062 / 0065).
 */
export function inversa(m: Matrice): Matrice | null {
  const det = m.a * m.d - m.b * m.c;
  if (!(Math.abs(det) > 1e-300)) return null;
  return { a: m.d / det, b: -m.b / det, c: -m.c / det, d: m.a / det, e: (m.c * m.f - m.d * m.e) / det, f: (m.b * m.e - m.a * m.f) / det };
}
