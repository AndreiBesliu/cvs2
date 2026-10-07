import type { IesireFoaie } from '../cam/iesire.ts';
import type { ParametriElement } from '../cam/job.ts';
import type { Depasire } from '../geom/cutie.ts';
import type { ColtOrigine } from '../ir/montaj.ts';
import type { Document } from '../model/document.ts';
import type { ProgramExportat } from '../post/export.ts';

export type { Depasire } from '../geom/cutie.ts';
export type { IesireFoaie } from '../cam/iesire.ts';

/**
 * Exportul G-code v0, ca acțiune a registrului (capabilitatea „export-gcode”): documentul → profilele → IR → postul GRBL
 * → octeții cu SHA-256. Interfața primește doar rezultatul, ca date, și îl descarcă.
 */
export type ParametriExport = {
  readonly origine: ColtOrigine;
  readonly z0: 'sus' | 'jos';
  readonly diametruScula: number;
  readonly elemente: ReadonlyMap<string, ParametriElement>;
  /**
   * Ieșirea din foaie pe care omul a văzut-o și a confirmat-o. Exportul trece doar dacă e exact cea calculată acum: altă
   * freză, alt profil sau o formă mutată cer o confirmare nouă.
   */
  readonly confirmareIesire?: Depasire;
};

export type RezultatExport =
  | { readonly ok: true; readonly program: ProgramExportat }
  | { readonly ok: false; readonly motiv: string }
  /** Freza iese din foaie și omul n-a confirmat încă exact ieșirea asta: nu se scrie nimic. */
  | { readonly ok: false; readonly motiv: string; readonly cereConfirmare: IesireFoaie };

export type ContextExport = {
  readonly document: () => Document;
  readonly parametri: () => ParametriExport;
  readonly rezultat: (r: RezultatExport) => void;
};
