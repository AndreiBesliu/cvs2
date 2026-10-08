import type { IesireFoaie } from '../cam/iesire.ts';
import type { ColtOrigine } from '../ir/montaj.ts';
import { PLAFON, type Document } from '../model/document.ts';
import type { ProgramExportat } from '../post/export.ts';

export type { Depasire } from '../geom/cutie.ts';
export type { IesireFoaie } from '../cam/iesire.ts';

/**
 * Marginile valorilor unei operații (schema v3, ADR 0025), pentru dialogul de export: ce scrie el în document trebuie să
 * treacă de ușă la redeschidere. Interfața le citește de aici, nu din model (regula `interfata-prin-actiuni`).
 */
export const MARGINI_OPERATIE = { diametru: PLAFON.diametruScula, adancime: PLAFON.adancimeOperatie } as const;

/**
 * Exportul G-code, ca acțiune a registrului (capabilitatea „export-gcode”): documentul → tăieturile (operațiile pieselor,
 * ADR 0025) → profilele → IR → postul GRBL → octeții cu SHA-256. Parametrii tăierii și scula sunt în document; aici
 * rămân doar montajul (colțul de origine, Z0) și confirmarea. Interfața primește doar rezultatul, ca date.
 */
export type ParametriExport = {
  readonly origine: ColtOrigine;
  readonly z0: 'sus' | 'jos';
  /**
   * Ieșirea din foaie pe care omul a văzut-o și a confirmat-o, așa cum a primit-o de la export. Trece doar dacă e exact cea
   * calculată acum, pe același traseu (amprenta): altă freză, alt profil sau o formă mutată cer o confirmare nouă, chiar
   * cu aceleași numere.
   */
  readonly confirmareIesire?: IesireFoaie;
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
