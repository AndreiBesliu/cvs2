/**
 * Ordinea de mână a operațiilor (ADR 0133), partea care nu e a lucrării: cum își păstrează o piesă locul când comenzile îi
 * înlocuiesc operațiile. Ordinea programului însăși e `ordineTaieturi` (`lume.ts`).
 */
import type { Operatie } from './document.ts';

/**
 * Operațiile noi ale unei piese, cu locul ei în ordinea de mână (ADR 0133 §4): fiecare primește rangul operației vechi cu
 * același id, iar una nouă, cel mai mic rang al piesei. O piesă fără rang le lasă fără (ordinea automată).
 */
export function cuRangulPiesei(vechi: readonly Operatie[], noi: readonly Operatie[]): Operatie[] {
  const ranguri = vechi.flatMap((o) => (o.rang !== undefined ? [o.rang] : []));
  if (ranguri.length === 0) return [...noi];
  const minim = ranguri.reduce((a, b) => Math.min(a, b));
  const dupaId = new Map(vechi.map((o) => [o.id, o.rang]));
  return noi.map((o) => ({ ...o, rang: dupaId.get(o.id) ?? minim }));
}
