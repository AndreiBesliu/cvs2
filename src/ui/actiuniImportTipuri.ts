import type { ImportPregatit } from '../io/piesa.ts';
import type { Avertismente, CodRefuz } from '../io/svgCoduri.ts';

export type { ImportPregatit } from '../io/piesa.ts';
export {
  CODURI_AVERTISMENT, CODURI_ENTITATI, PLAFON_IMPORT, type Avertismente, type CodAvertisment, type CodEntitati, type CodRefuz,
} from '../io/svgCoduri.ts';

/** Fișierul ales: numele și octeții (citiți doar sub plafon, ADR 0035 §1). */
export type FisierImport = { readonly nume: string; readonly octeti: Uint8Array };

/**
 * Previzualizarea unui import SVG (ADR 0035 §9): ce ar adăuga „Importă”, cu mărimea desenului în mm, căile pe laturi și
 * raportul. Interfața o primește ca date; piesa o face acțiunea `document.importa`, din `pregatit`.
 */
export type PrevizualizareImport =
  | {
    readonly ok: true;
    readonly pregatit: ImportPregatit;
    readonly latime: number;
    readonly inaltime: number;
    readonly exterioare: number;
    readonly interioare: number;
    /** Maparea depinde de px: dialogul oferă alegerea lui `pxPeTol`. */
    readonly px: boolean;
    readonly illustrator: boolean;
    readonly avertismente: Avertismente;
  }
  | { readonly ok: false; readonly cod: CodRefuz; readonly detaliu?: string; readonly avertismente?: Avertismente };

export type ContextImport = {
  readonly fisier: () => FisierImport | null;
  readonly pxPeTol: () => 96 | 72;
  /** Limba aplicației, pentru `systemLanguage` din `switch`. */
  readonly limba: () => string;
  readonly doarCitire: () => boolean;
  readonly rezultat: (r: PrevizualizareImport) => void;
  /** O excepție a ușii (un defect, nu un fișier greșit): în jurnalul de erori. */
  readonly jurnal?: (e: unknown) => void;
};
