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
  /**
   * Numele fișierelor scurte, ASCII, cu majuscule (`CNCVS2.NC`, `CV2T3.NC`): controlerele care citesc de pe un stick FAT
   * (RichAuto, s8 Anexa B). Altfel, numele lungi ale aplicației.
   */
  readonly numeScurt: boolean;
  /** Senderul aplicației vorbește controlerului (familia GRBL): exportul ajunge în panoul mașinii (ADR 0125). */
  readonly senderAplicatie: boolean;
  /** Axele pe care le acceptă controlerul, cu cuvântul lor din G-code (T22). */
  readonly axe: readonly Axa[];
  /** Câte zecimale, cu punctul zecimal scris mereu: 3 în mm, 5 în inch (T9, s8 §4.2). */
  readonly zecimaleMm: number;
  readonly zecimaleInch: number;
  /** Cuvântul unităților, pus în antet în locul lui `{unitati}`; `inch: null` = controlerul citește doar mm (RichAuto). */
  readonly unitati: { readonly mm: string; readonly inch: string | null };
  /** Null: controlerul n-are comentarii documentate (RichAuto); programul nu scrie niciunul. */
  readonly comentariu: { readonly deschidere: string; readonly inchidere: string } | null;
  /** Plafonul liniei, în octeți, pentru TOATE contractele: 70 (`PLAN.md` T9). */
  readonly liniaMaxima: number;
  /** Null: pauza nu se scrie; controlerul așteaptă axul singur, după setarea lui (RichAuto: întârzierea în ms). */
  readonly pauza: { readonly cuvant: string; readonly unitate: 's' | 'ms' } | null;
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
  /** Liniile dinaintea oricărui comentariu (Syntec: `%` și numărul de program `O0001`). */
  readonly inceput: readonly string[];
  /** Liniile modale de la început: tot ce folosește programul se setează explicit (T9); `{unitati}` = G21 / G20. */
  readonly antet: readonly string[];
  /** Null: programul nu scrie WCS-ul; lucrează în cel activ pe controler (RichAuto: „G5x doar dacă e ales”, s8 A.5). */
  readonly wcs: string | null;
  readonly final: readonly string[];
  /**
   * Schimbarea sculei: strategiile acceptate și cea implicită, plus liniile ei, cu `{n}` = numărul sculei:
   * - `schimbare`: oprirea cu M6 (`T{n} M6`; Mach3 / Mach4: `T{n}`, apoi `M6` singur, s8 §5.4);
   * - `pornire`: după antet, la începutul programului, pentru prima sculă (Syntec: `T{n} M6`, ca scula montată să fie ea);
   * - `compensare`: după WCS, la început și după fiecare schimbare, înaintea primei mișcări în Z (Syntec: `G43 H{n}`; după
   *   antet, al cărui G49 ar anula-o).
   */
  readonly scula: {
    readonly implicita: StrategieScula; readonly acceptate: readonly StrategieScula[];
    readonly schimbare: readonly string[]; readonly pornire: readonly string[]; readonly compensare: readonly string[];
  };
  /**
   * O deplasare rapidă cu XY și Z se scrie în două linii: la urcare întâi Z, la coborâre întâi XY. Pe controlerele unde G0
   * poate merge fiecare axă cu viteza ei, în „L” (Syntec, parametrul #411, s8 A.6), sau unde n-o știm.
   */
  readonly rapidaSeparata: boolean;
  /**
   * Setările controlerului de care depinde înțelesul fișierului (s8 §5.10), cu numele lor de pe controler: în antet, ca
   * comentarii, și în fereastra exportului, ca operatorul să le verifice înainte de pornire.
   */
  readonly setari: readonly string[];
  /** Codurile pe care controlerul le acceptă; oracolul din etapa 1.6 refuză orice altceva. */
  readonly coduriG: readonly string[];
  readonly coduriM: readonly string[];
  readonly surse: Readonly<Record<string, StareCamp>>;
};
