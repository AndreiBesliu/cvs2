import type { Eveniment } from './utilizare.ts';

/**
 * Pașii dinaintea unei erori (ADR 0262 §4, felia A.11a): ultimele evenimente ale utilizării, din inelul ținut în memorie de
 * înregistrator, intră în raportul erorii (și, cu bifa, într-o raportare), doar cu felul, id-ul, rezultatul și cât de departe
 * de eroare au fost. Fără nimic din desen: aceleași id-uri ca în loturi, deja trecute prin lista albă. Aici, doar ce face
 * bucata raportorului (pașii, din tipuri); verificarea, cu contractul utilizării, stă în `pasiEroareVerificare.ts` (serverul,
 * adminul), ca bucata raportorului să nu-l aducă.
 */

/** Câți pași, cel mult (marginea de sus a setării `pasiEroare`); dintr-o listă mai lungă rămân ultimii. */
export const PLAFON_PASI = 100;
/** Un pas mai vechi de o zi față de eroare se scrie la o zi. */
export const MS_MAX_PAS = 86_400_000;

export const FELURI_PAS = ['actiune', 'fereastra', 'unealta', 'dialog', 'clic', 'derulare', 'zoom', 'calcul', 'masina', 'imprimanta'] as const;
export type FelPas = (typeof FELURI_PAS)[number];
// Felurile pașilor sunt exact felurile evenimentelor: un fel nou de eveniment cere rândul lui aici (compilatorul o spune).
const FIECARE_FEL: Record<Eveniment['fel'], true> & Record<FelPas, true> = {
  actiune: true, fereastra: true, unealta: true, dialog: true, clic: true, derulare: true, zoom: true, calcul: true, masina: true, imprimanta: true,
};
void FIECARE_FEL;

export interface PasEroare {
  readonly fel: FelPas;
  /** Id-ul evenimentului; la derulare și zoom, zona (sursa). */
  readonly id: string;
  /** Rezultatul acțiunii, al dialogului sau al calculului; la mașină și imprimantă, codul (`cod:22`). */
  readonly rez?: string;
  /** Cât înainte de eroare (ms). */
  readonly ms: number;
}

/** Pașii luați în clipa erorii: clipa (același ceas cu evenimentele) și o copie a inelului. */
export interface PasiCapturati { readonly t: number; readonly pasi: readonly Eveniment[] }

/** Pură: pasul unui eveniment, față de clipa erorii (același ceas, `performance.now()` rotunjit). */
export function pasDin(e: Eveniment, tEroare: number): PasEroare {
  const ms = Math.min(MS_MAX_PAS, Math.max(0, Math.round(tEroare - e.t)));
  switch (e.fel) {
    case 'actiune':
    case 'dialog':
    case 'calcul':
      return { fel: e.fel, id: e.id, rez: e.rez, ms };
    case 'derulare':
    case 'zoom':
      return { fel: e.fel, id: e.de, ms };
    case 'masina':
    case 'imprimanta':
      return e.cod === undefined ? { fel: e.fel, id: e.id, ms } : { fel: e.fel, id: e.id, rez: `cod:${e.cod}`, ms };
    default:
      return { fel: e.fel, id: e.id, ms };
  }
}
