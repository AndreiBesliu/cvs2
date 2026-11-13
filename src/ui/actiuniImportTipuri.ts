import type { ImportPregatit } from '../io/piesa.ts';
import type { AvertismenteDxf, CodRefuzDxf, UnitateDxf } from '../io/dxfCoduri.ts';
import type { AvertismenteEps, CodRefuzEps } from '../io/epsCoduri.ts';
import type { FormatImport } from '../io/formatImport.ts';
import type { AvertismentePdf, CodRefuzPdf } from '../io/pdfCoduri.ts';
import type { Avertismente, CodRefuz } from '../io/svgCoduri.ts';
import type { AvertismenteWmf, CodRefuzWmf, UnitateWmf, UnitatiWmf } from '../io/wmfCoduri.ts';
import type { AlegeriTrasare } from '../io/imagine.ts';
import type { CaiTrasate } from '../trasare/trasare.ts';
import type { CuloarePaleta } from '../trasare/culori.ts';
import type { Lumina } from '../trasare/lumina.ts';
import type { FoaieTrasata, Posterizare, ZonaTrasare } from '../jobs/calculTrasare.ts';

export type { ImportPregatit } from '../io/piesa.ts';
export {
  CODURI_AVERTISMENT, CODURI_ENTITATI, PLAFON_IMPORT, type Avertismente, type CodAvertisment, type CodEntitati, type CodRefuz,
} from '../io/svgCoduri.ts';
// Doar tipurile: listele DXF, PDF, EPS și WMF și `formatImport` le iau direct modulele la cerere (dialogul, ușile), ca să nu
// ajungă în pachetul de pornire prin modulul ăsta (ADR 0100).
export type { AvertismenteDxf, CodAvertismentDxf, CodRefuzDxf, UnitateDxf } from '../io/dxfCoduri.ts';
export type { AvertismentePdf, CodAvertismentPdf, CodRefuzPdf } from '../io/pdfCoduri.ts';
export type { AvertismenteEps, CodAvertismentEps, CodRefuzEps } from '../io/epsCoduri.ts';
export type { AvertismenteWmf, CodAvertismentWmf, CodRefuzWmf, UnitateWmf, UnitatiWmf } from '../io/wmfCoduri.ts';
export type { FormatImport } from '../io/formatImport.ts';

/** Fișierul ales: numele și octeții (citiți doar sub plafon, ADR 0035 §1). */
export type FisierImport = { readonly nume: string; readonly octeti: Uint8Array };

/**
 * Refuzurile ușii imaginilor (ADR 0220): TIFF-ul (deocamdată), o imagine pe care browserul n-o decodează, prea multe contururi
 * (plafonul, cu numărul lor), trasarea peste termen și una anulată de o previzualizare nouă.
 */
export type CodRefuzImagine = 'tiff' | 'imagine-citire' | 'prea-multe' | 'imagine-timp' | 'anulat';

/** Refuzurile celor șase uși. */
export type CodRefuzImport = CodRefuz | CodRefuzDxf | CodRefuzPdf | CodRefuzEps | CodRefuzWmf | CodRefuzImagine;

export type { AlegeriTrasare } from '../io/imagine.ts';

/** Raportul unei imagini trasate (ADR 0220 §10), cu scara folosită: ce arată fereastra sub previzualizare. */
export type RaportImagine = {
  /** Pixelii trasați (după reducere; ai zonei, dacă e una) și, dacă decodarea a redus imaginea, mărimea ei din fișier. */
  readonly latimePx: number; readonly inaltimePx: number;
  /**
   * Imaginea decodată întreagă, în px, și zona trasată din ea (ADR 0224: un decupaj, deci pagina e ea), sau null.
   * Previzualizarea arată toată imaginea și pune vectorii zonei la locul lor.
   */
  readonly intreg: { readonly latimePx: number; readonly inaltimePx: number };
  readonly zona: ZonaTrasare | null;
  readonly redusDin: { readonly latime: number; readonly inaltime: number } | null;
  /** Mărimea imaginii pe foaie și a pixelului, în mm. */
  readonly latimeMm: number; readonly inaltimeMm: number; readonly mmPePx: number;
  /**
   * De unde vine scara: lățimea scrisă, formatul foii îndreptate (ADR 0225), DPI-ul fișierului sau 96 px / țol (presupus);
   * `dpi` e cel folosit.
   */
  readonly scara: 'latime' | 'foaie' | 'fisier' | 'presupus'; readonly dpi: number;
  /**
   * Foaia din poză (ADR 0225): îndreptată (pagina e ea; colțurile, proporțiile, formatul, previzualizarea), sau doar găsită
   * (sugestia); null: niciuna.
   */
  readonly foaie: FoaieTrasata | null;
  /** Sursa cernelii (alb-negru) sau culorile (ADR 0221); pe culori, `prag` e 0, histograma goală, iar `automat` e al numărului. */
  readonly sursa: 'alfa' | 'lum' | 'culori'; readonly transparenta: boolean;
  readonly prag: number; readonly automat: boolean; readonly margini: 'netezite' | 'dure';
  readonly pete: number; readonly gauri: number; readonly contururi: number; readonly varfuri: number;
  /**
   * Lumina folosită (ADR 0224; pe transparență și pe culori, „uniforma”), cât variază hârtia la „Uniformă” (pentru sugestie,
   * altfel null) și bucățile lipite de margine șterse.
   */
  readonly lumina: Lumina; readonly inegala: number | null; readonly margine: number;
  /** Abaterea măsurată față de conturul sub-pixel, în px. */
  readonly abaterePx: number;
  /** Histograma cernelii (256 de trepte), sub glisorul pragului. */
  readonly histograma: readonly number[];
  /** Pe culori: paleta, imaginea pictată în culorile ei și contururile fiecărei piese (ADR 0221 §3, §7). */
  readonly culori?: RaportCuloriImagine;
  /**
   * Liniile mediane (ADR 0222 §5): grosimea obișnuită a trăsăturilor (px), buclele, joncțiunile și punctele fără linie; părțile
   * late, dacă s-au căutat (ADR 0223): câte, ce parte din cerneală (0–1) și pragul folosit (px).
   */
  readonly mediane?: {
    readonly grosimePx: number; readonly bucle: number; readonly jonctiuni: number; readonly puncte: number;
    readonly parti?: { readonly numar: number; readonly arie: number; readonly pragPx: number };
  };
};

/** Ce arată fereastra unei trasări pe culori: pastilele, imaginea pictată și regiunea fiecărei culori (la trecerea mausului). */
export type RaportCuloriImagine = {
  readonly paleta: readonly CuloarePaleta[];
  /** Imaginea pictată (lipsă la un refuz: prea multe contururi). */
  readonly posterizare: Posterizare | null;
  /** Câte o piesă pe culoare bifată (indicele din paletă), cu contururile ei în pixelii imaginii. */
  readonly piese: ReadonlyArray<{ readonly culoare: number; readonly hex: string; readonly contur: CaiTrasate }>;
};

/** Ce n-a intrat dintr-o imagine trasată: contururile sub rezoluție și cele peste plafonul unei căi. */
export type AvertismenteImagine = { readonly 'sub-rezolutie': number; readonly 'prea-mari': number };

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
 * Previzualizarea unui import (ADR 0035 §9, ADR 0101 §8, ADR 0104 §7, ADR 0115 §7, ADR 0117 §9): ce ar adăuga „Importă”, cu
 * mărimea desenului în mm, căile pe laturi și raportul ușii lui. Interfața o primește ca date; piesa o face acțiunea `document.importa`, din
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
  | (Comune & {
    readonly format: 'wmf';
    /** Unitățile: din antetul placeable, din modul metric al desenului, sau alese în dialog (ADR 0117 §5). */
    readonly unitati: UnitatiWmf;
    readonly avertismente: AvertismenteWmf;
  })
  | (Comune & {
    readonly format: 'imagine'; readonly trasare: RaportImagine; readonly avertismente: AvertismenteImagine;
    /** Căile trasate, în pixelii imaginii (Y în jos): previzualizarea le desenează direct, fără să le refacă din mm. */
    readonly contur: CaiTrasate;
    /** Contururile părților late ale liniilor mediane (ADR 0223), pentru semnalare, în pixelii imaginii. */
    readonly late?: CaiTrasate;
  })
  | {
    readonly ok: false; readonly cod: CodRefuzImport; readonly detaliu?: string;
    readonly format?: FormatImport;
    readonly avertismente?: Avertismente | AvertismenteDxf | AvertismentePdf | AvertismenteEps | AvertismenteWmf | AvertismenteImagine;
    /** Un PDF citit până la lista paginilor: câte are (dialogul oferă alegerea alteia). */
    readonly pagini?: number;
    /** O imagine refuzată după trasare (prea multe contururi): raportul, ca fereastra să spună ce să schimbi. */
    readonly trasare?: RaportImagine;
  };

/**
 * Alegerile din dialog pentru fișierul citit: px-ul (SVG), unitatea (un DXF fără unități; un WMF fără antet), pagina (un
 * PDF, de la 1).
 */
export type AlegeriImport = {
  readonly pxPeTol: 96 | 72; readonly unitate: UnitateDxf; readonly unitateWmf: UnitateWmf; readonly pagina: number;
  /** Alegerile trasării unei imagini (ADR 0220 §10); lipsă: cele implicite. */
  readonly trasare?: AlegeriTrasare;
};

export type ContextImport = {
  readonly fisier: () => FisierImport | null;
  readonly pxPeTol: () => 96 | 72;
  /** Unitatea aleasă pentru un DXF care nu și-o declară (ADR 0101 §2); lipsă: mm. */
  readonly unitate?: () => UnitateDxf;
  /** Unitatea aleasă pentru un WMF fără antet placeable (ADR 0117 §5); lipsă: 1/96 țol. */
  readonly unitateWmf?: () => UnitateWmf;
  /** Pagina de citit dintr-un PDF (de la 1, ADR 0104 §7); lipsă: prima. */
  readonly pagina?: () => number;
  /** Alegerile trasării unei imagini (ADR 0220 §10); lipsă: cele implicite. */
  readonly trasare?: () => AlegeriTrasare | undefined;
  /**
   * Oprirea citirii (ADR 0220): o citire nouă, Renunță, Escape sau fișierul următor o opresc pe cea în curs; trasarea unei
   * imagini își oprește workerul din mijlocul calculului.
   */
  readonly semnal?: AbortSignal;
  /** Limba aplicației, pentru `systemLanguage` din `switch`. */
  readonly limba: () => string;
  readonly doarCitire: () => boolean;
  readonly rezultat: (r: PrevizualizareImport) => void;
  /** O excepție a ușii (un defect, nu un fișier greșit): în jurnalul de erori. */
  readonly jurnal?: (e: unknown) => void;
};
