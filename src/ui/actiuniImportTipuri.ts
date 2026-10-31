import type { ImportPregatit } from '../io/piesa.ts';
import type { AvertismenteDxf, CodRefuzDxf, UnitateDxf } from '../io/dxfCoduri.ts';
import type { AvertismenteEps, CodRefuzEps } from '../io/epsCoduri.ts';
import type { FormatImport } from '../io/formatImport.ts';
import type { AvertismentePdf, CodRefuzPdf } from '../io/pdfCoduri.ts';
import type { Avertismente, CodRefuz } from '../io/svgCoduri.ts';

export type { ImportPregatit } from '../io/piesa.ts';
export {
  CODURI_AVERTISMENT, CODURI_ENTITATI, PLAFON_IMPORT, type Avertismente, type CodAvertisment, type CodEntitati, type CodRefuz,
} from '../io/svgCoduri.ts';
// Doar tipurile: listele DXF, PDF și EPS și `formatImport` le iau direct modulele la cerere (dialogul, ușile), ca să nu ajungă
// în pachetul de pornire prin modulul ăsta (ADR 0100).
export type { AvertismenteDxf, CodAvertismentDxf, CodRefuzDxf, UnitateDxf } from '../io/dxfCoduri.ts';
export type { AvertismentePdf, CodAvertismentPdf, CodRefuzPdf } from '../io/pdfCoduri.ts';
export type { AvertismenteEps, CodAvertismentEps, CodRefuzEps } from '../io/epsCoduri.ts';
export type { FormatImport } from '../io/formatImport.ts';

/** Fișierul ales: numele și octeții (citiți doar sub plafon, ADR 0035 §1). */
export type FisierImport = { readonly nume: string; readonly octeti: Uint8Array };

/** Refuzurile celor patru uși. */
export type CodRefuzImport = CodRefuz | CodRefuzDxf | CodRefuzPdf | CodRefuzEps;

/** Unitățile unui DXF (ADR 0101 §2): declarate de fișier, sau alese de om (implicit mm). */
export type UnitatiImport = { readonly mmPeUnitate: number; readonly declarate: boolean; readonly unitate: UnitateDxf | null };

type Comune = {
  readonly ok: true;
  readonly pregatit: ImportPregatit;
  readonly latime: number;
  readonly inaltime: number;
  readonly exterioare: number;
  readonly interioare: number;
  /** Căile deschise (ADR 0037 §11): fără latură din imbricare, tăiate pe linie, în operația `deschise` a piesei. */
  readonly deschise: number;
};

/**
 * Previzualizarea unui import (ADR 0035 §9, ADR 0101 §8, ADR 0104 §7, ADR 0115 §7): ce ar adăuga „Importă”, cu mărimea desenului în mm,
 * căile pe laturi și raportul ușii lui. Interfața o primește ca date; piesa o face acțiunea `document.importa`, din
 * `pregatit`. Un PDF cu mai multe pagini își spune numărul paginilor și în refuz (pagina citită poate fi goală: omul alege
 * alta).
 */
export type PrevizualizareImport =
  | (Comune & {
    readonly format: 'svg';
    /** Maparea depinde de px: dialogul oferă alegerea lui `pxPeTol`. */
    readonly px: boolean;
    readonly illustrator: boolean;
    readonly avertismente: Avertismente;
  })
  | (Comune & { readonly format: 'dxf'; readonly unitati: UnitatiImport; readonly avertismente: AvertismenteDxf })
  | (Comune & {
    readonly format: 'pdf';
    /** Câte pagini are fișierul și care s-a citit (de la 1). */
    readonly pagini: number;
    readonly pagina: number;
    /** Straturile (OCG) căilor importate, în ordinea în care apar: devin numele elementelor. */
    readonly straturi: readonly string[];
    readonly avertismente: AvertismentePdf;
  })
  | (Comune & {
    readonly format: 'eps';
    /** Straturile AI ale căilor importate, în ordinea în care apar: devin numele elementelor. */
    readonly straturi: readonly string[];
    /** Citit ca fișier Illustrator ≤ 8 (operatorii AI după nume). */
    readonly illustrator: boolean;
    readonly avertismente: AvertismenteEps;
  })
  | {
    readonly ok: false; readonly cod: CodRefuzImport; readonly detaliu?: string;
    readonly format?: FormatImport; readonly avertismente?: Avertismente | AvertismenteDxf | AvertismentePdf | AvertismenteEps;
    /** Un PDF citit până la lista paginilor: câte are (dialogul oferă alegerea alteia). */
    readonly pagini?: number;
  };

/** Alegerile din dialog pentru fișierul citit: px-ul (SVG), unitatea (un DXF fără unități), pagina (un PDF, de la 1). */
export type AlegeriImport = { readonly pxPeTol: 96 | 72; readonly unitate: UnitateDxf; readonly pagina: number };

export type ContextImport = {
  readonly fisier: () => FisierImport | null;
  readonly pxPeTol: () => 96 | 72;
  /** Unitatea aleasă pentru un DXF care nu și-o declară (ADR 0101 §2); lipsă: mm. */
  readonly unitate?: () => UnitateDxf;
  /** Pagina de citit dintr-un PDF (de la 1, ADR 0104 §7); lipsă: prima. */
  readonly pagina?: () => number;
  /** Limba aplicației, pentru `systemLanguage` din `switch`. */
  readonly limba: () => string;
  readonly doarCitire: () => boolean;
  readonly rezultat: (r: PrevizualizareImport) => void;
  /** O excepție a ușii (un defect, nu un fișier greșit): în jurnalul de erori. */
  readonly jurnal?: (e: unknown) => void;
};
