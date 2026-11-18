/**
 * Fila Diagnoză a adminului reproiectat (ADR 0260 §7, felia A.2), partea pură: sumarul (câte Bine, Atenție, Eșec; informațiile
 * nu se numără) și ordinea listei, cu problemele întâi (Eșec, apoi Atenție), fiecare grup în ordinea verificărilor.
 */
import type { Verificare } from './verificari.ts';

export interface SumarDiagnoza {
  readonly bine: number;
  readonly atentie: number;
  readonly esec: number;
}

export function sumarDiagnoza(v: readonly Verificare[]): SumarDiagnoza {
  const cate = (s: Verificare['stare']): number => v.filter((x) => x.stare === s).length;
  return { bine: cate('bine'), atentie: cate('atentie'), esec: cate('esec') };
}

const rang = (s: Verificare['stare']): number => (s === 'esec' ? 0 : s === 'atentie' ? 1 : 2);

/** Problemele întâi; sortarea e stabilă, deci fiecare grup își ține ordinea. */
export const problemeIntai = (v: readonly Verificare[]): Verificare[] => v.toSorted((a, b) => rang(a.stare) - rang(b.stare));
