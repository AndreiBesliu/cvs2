import type { Axa } from '../ir/ir.ts';

/**
 * Contractul de dialect (T9, ADR 0009): tot ce diferă între controlere, scris ca DATE, cu sursa și starea fiecărui
 * câmp. Postul e unul singur și citește contractul; nu are ramuri pe nume de controler.
 */
export type StareCamp =
  | { readonly stare: 'documentat'; readonly sursa: string; readonly citit: string }
  | { readonly stare: 'probat'; readonly sursa: string; readonly citit: string; readonly proba: string };

/**
 * Cum se schimbă scula (s8 §5.4, ADR 0083):
 * - `bariera-sender`: `T… M6` pe linia lui, oprit de senderul aplicației (nu pleacă niciodată la controler, ADR 0080 regula 6);
 * - `m6-controler`: același text, dar M6 îl face controlerul (grblHAL cu `$341` 0–3, FluidNC cu ATC sau `m6_macro`);
 * - `m0-comentariu`: un comentariu cu scula, apoi `M0` (oprirea programului; la GRBL 1.1 fără sender, jog-ul nu merge în Hold);
 * - `fisiere-separate`: câte un program pe sculă (`posteazaPeScule`).
 */
export type StrategieScula = 'bariera-sender' | 'fisiere-separate' | 'm6-controler' | 'm0-comentariu';
export type Unitati = 'mm' | 'inch';

export type Contract = {
  readonly nume: string;
  readonly extensie: string;
  /** Axele pe care le acceptă controlerul, cu cuvântul lor din G-code (T22). */
  readonly axe: readonly Axa[];
  /** Câte zecimale, cu punctul zecimal scris mereu: 3 în mm, 5 în inch (T9, s8 §4.2). */
  readonly zecimaleMm: number;
  readonly zecimaleInch: number;
  /** Cuvântul unităților, pus în antet în locul lui `{unitati}`. */
  readonly unitati: { readonly mm: string; readonly inch: string };
  readonly comentariu: { readonly deschidere: string; readonly inchidere: string };
  /** Plafonul liniei, în octeți, pentru TOATE contractele: 70 (`PLAN.md` T9). */
  readonly liniaMaxima: number;
  readonly pauza: { readonly cuvant: string; readonly unitate: 's' | 'ms' };
  readonly arc: {
    /** Coarda minimă, în rezoluții (10⁻ᶻᵉᶜⁱᵐᵃˡᵉ în unitatea programului); sub ea arcul iese G1. */
    readonly coardaMinimaRezolutii: number;
    /** Baleiajul minim, în radiani; sub el arcul iese G1 (cercul fals al GRBL). */
    readonly unghiMinim: number;
    /** Peste raza asta (mm), arcul iese G1. */
    readonly razaMaxima: number;
    /** Cel mult atât baleiaj pe un bloc; mai mult se împarte. */
    readonly baleiajMaxim: number;
  };
  /** Elicea (G2 / G3 cu Z): unde controlerul n-o declară, arcul cu Z iese în segmente G1 (s8 §5.3). */
  readonly elice: boolean;
  /** Liniile modale de la început: tot ce folosește programul se setează explicit (T9); `{unitati}` = G21 / G20. */
  readonly antet: readonly string[];
  readonly wcs: string;
  readonly final: readonly string[];
  /** Strategiile de schimbare a sculei pe care le acceptă controlerul, și cea implicită. */
  readonly scula: { readonly implicita: StrategieScula; readonly acceptate: readonly StrategieScula[] };
  /** Codurile pe care controlerul le acceptă; oracolul din etapa 1.6 refuză orice altceva. */
  readonly coduriG: readonly string[];
  readonly coduriM: readonly string[];
  readonly surse: Readonly<Record<string, StareCamp>>;
};
