/**
 * IR-ul traseului (T8, ADR 0008): un singur program de mișcări, în coordonatele DOCUMENTULUI.
 * - X și Y: milimetri, cu originea în colțul stânga-jos al foii și Y în sus.
 * - Z: milimetri față de fața de sus a materialului (0), negativ în material.
 * Postul aplică montajul (colțul de origine, Z0 sus sau jos) și dialectul controlerului. CAM-ul nu știe de niciunul.
 *
 * Axele sunt o listă din prima zi (T22, ADR 0022): v1 taie pe XYZ, dar tipurile au loc și pentru A.
 */
export type Axa = 'X' | 'Y' | 'Z' | 'A';

export const AXE_XYZ: readonly Axa[] = ['X', 'Y', 'Z'];

/** Ținta unei mișcări: doar axele care se mișcă. */
export type Pozitie = { readonly [K in Axa]?: number };

export type SensArc = 'trigonometric' | 'orar';

export type Miscare =
  /** G0: deplasare rapidă, prin aer. */
  | { readonly tip: 'rapida'; readonly la: Pozitie }
  /** G1: tăiere în linie, cu avansul în mm/min. */
  | { readonly tip: 'taiere'; readonly la: Pozitie; readonly avans: number }
  /** G2 / G3: arc în planul XY, cu centrul în XY; cu Z în țintă devine elice. */
  | {
    readonly tip: 'arc'; readonly la: Pozitie; readonly centru: { readonly x: number; readonly y: number };
    readonly sens: SensArc; readonly avans: number;
  }
  | { readonly tip: 'ax-pornit'; readonly turatie: number }
  | { readonly tip: 'ax-oprit' }
  | { readonly tip: 'pauza'; readonly secunde: number }
  /** O etichetă de lucrare (intrare, punte, finisaj…), scrisă ca comentariu. */
  | { readonly tip: 'eticheta'; readonly text: string };

export type Scula = { readonly numar: number; readonly nume: string; readonly diametru: number };

export type Program = {
  readonly axe: readonly Axa[];
  readonly scula: Scula;
  readonly turatie: number;
  /** Z-ul de siguranță, față de fața de sus a materialului (pozitiv, deasupra). */
  readonly zSigur: number;
  readonly miscari: readonly Miscare[];
};
