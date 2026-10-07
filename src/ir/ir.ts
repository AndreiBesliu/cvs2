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

/**
 * Baleiajul cu semn al unui arc, de la `start` la `capat` în jurul centrului: în (0, 2π] trigonometric, în [−2π, 0) orar.
 * Startul egal cu capătul înseamnă cercul întreg. O singură definiție, folosită de post (pe coordonatele mașinii) și de
 * CAM (pe ale documentului).
 */
export function baleiajArc(
  start: { readonly x: number; readonly y: number }, capat: { readonly x: number; readonly y: number },
  centru: { readonly x: number; readonly y: number }, trigonometric: boolean,
): number {
  let b = Math.atan2(capat.y - centru.y, capat.x - centru.x) - Math.atan2(start.y - centru.y, start.x - centru.x);
  if (trigonometric) { while (b <= 1e-12) b += 2 * Math.PI; } else { while (b >= -1e-12) b -= 2 * Math.PI; }
  return b;
}

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
