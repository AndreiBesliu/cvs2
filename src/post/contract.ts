import type { Axa } from '../ir/ir.ts';

/**
 * Contractul de dialect (T9, ADR 0009): tot ce diferă între controlere, scris ca DATE, cu sursa și starea fiecărui
 * câmp. Postul e unul singur și citește contractul; nu are ramuri pe nume de controler.
 */
export type StareCamp =
  | { readonly stare: 'documentat'; readonly sursa: string; readonly citit: string }
  | { readonly stare: 'probat'; readonly sursa: string; readonly citit: string; readonly proba: string };

export type StrategieScula = 'bariera-sender' | 'fisiere-separate' | 'm6-controler' | 'm0-comentariu';

export type Contract = {
  readonly nume: string;
  readonly extensie: string;
  /** Axele pe care le acceptă controlerul, cu cuvântul lor din G-code (T22). */
  readonly axe: readonly Axa[];
  /** Câte zecimale, cu punctul zecimal scris mereu. */
  readonly zecimaleMm: number;
  readonly comentariu: { readonly deschidere: string; readonly inchidere: string };
  /** Plafonul liniei, în octeți, pentru TOATE contractele: 70 (`PLAN.md` T9). */
  readonly liniaMaxima: number;
  readonly pauza: { readonly cuvant: string; readonly unitate: 's' | 'ms' };
  readonly arc: {
    /** Coarda minimă, în rezoluții (10⁻ᶻᵉᶜⁱᵐᵃˡᵉ mm); sub ea arcul iese G1. */
    readonly coardaMinimaRezolutii: number;
    /** Baleiajul minim, în radiani; sub el arcul iese G1 (cercul fals al GRBL). */
    readonly unghiMinim: number;
    /** Peste raza asta, arcul iese G1. */
    readonly razaMaxima: number;
    /** Cel mult atât baleiaj pe un bloc; mai mult se împarte. */
    readonly baleiajMaxim: number;
  };
  /** Liniile modale de la început: tot ce folosește programul se setează explicit (T9). */
  readonly antet: readonly string[];
  readonly wcs: string;
  readonly final: readonly string[];
  readonly scula: StrategieScula;
  /** Codurile pe care controlerul le acceptă; oracolul din etapa 1.6 refuză orice altceva. */
  readonly coduriG: readonly string[];
  readonly coduriM: readonly string[];
  readonly surse: Readonly<Record<string, StareCamp>>;
};
