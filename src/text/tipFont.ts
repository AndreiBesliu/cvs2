/**
 * Tipurile cititorului de fonturi (`font.ts`), într-un modul al lor: cititorul fonturilor SVG (`fontSvg.ts`, ADR 0140 §7)
 * întoarce același `Font` fără să depindă de cititorul sfnt, care îl cheamă (fără ciclu).
 */
import type { ConturFont, NumeFont } from './sfnt.ts';
import type { AxaFont } from './variatii.ts';

export type CodRefuzFont =
  | 'nu-e-font' | 'woff' | 'woff2' | 'tabel-lipsa' | 'stricat' | 'majuscula' | 'fara-unicode' | 'fata-lipsa' | 'variatii';

/**
 * O instanță numită a unui font variabil: numele stilului, cel PostScript (dacă îl are), dacă e chiar cea implicită și
 * coordonatele ei (în unitățile axelor, pe fiecare axă).
 */
export type InstantaFont = {
  readonly stil: string; readonly postscript: string | null; readonly implicita: boolean; readonly coordonate: Readonly<Record<string, number>>;
};

/** Instanța cerută la citire (ADR 0113): indicele unei instanțe numite din `fvar`, sau coordonatele axelor (lipsă: implicit). */
export type CerereInstanta = number | Readonly<Record<string, number>>;

export type Font = {
  readonly familie: string;
  readonly nume: NumeFont;
  readonly unitsPerEm: number;
  /** Înălțimea majusculei, în unitățile fontului: vârful lui H (fără H, `sCapHeight`). */
  readonly majuscula: number;
  /** Din `hhea`: urcarea, coborârea (negativă) și spațiul dintre rânduri. */
  readonly urcare: number;
  readonly coborare: number;
  readonly spatiuRanduri: number;
  readonly numarGlife: number;
  /** Contururi cubice (CFF: punctele de control câte două), nu pătratice (TrueType). */
  readonly cubice: boolean;
  /** Un font cu o singură linie (ADR 0140, `linie.ts`): contururile lui sunt trăsături de gravat, nu figuri de umplut. */
  readonly linie: boolean;
  /** Axele, dacă fontul e variabil (`fvar`). */
  readonly axe: readonly AxaFont[] | null;
  /** Instanțele numite, dacă fontul e variabil; contururile sunt ale instanței cerute la citire (implicit: cea implicită). */
  readonly instante: readonly InstantaFont[] | null;
  /** Glifa unui caracter (codul Unicode), sau 0 (`.notdef`) dacă fontul n-o are. */
  glifa(cod: number): number;
  /** Avansul glifei (lățimea ei de așezare), în unitățile fontului. */
  avans(glifa: number): number;
  /** Crenarea perechii (stânga, dreapta): cât se adaugă la avansul glifei din stânga (de obicei negativ). */
  crenare(stanga: number, dreapta: number): number;
  /** Contururile glifei, cu componentele glifelor compuse puse la locul lor; null: o glifă stricată (sărită, numărată). */
  contururi(glifa: number): readonly ConturFont[] | null;
};

export type RezultatFont = { readonly ok: true; readonly font: Font } | { readonly ok: false; readonly cod: CodRefuzFont; readonly detaliu?: string };
