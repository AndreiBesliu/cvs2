/**
 * Protocolul pânzei: tot ce trece între firul principal și workerul de desen, ca date simple. Pânza nu știe de document
 * și nu face geometrie (`PLAN.md` §3.3): primește formele gata descrise, în milimetri, și le desenează exact.
 */

/** O comandă de cale, în coordonatele documentului (mm, Y în sus). Arcul are centrul, raza și unghiurile lui. */
export type ComandaCale =
  | { readonly t: 'M'; readonly x: number; readonly y: number }
  | { readonly t: 'L'; readonly x: number; readonly y: number }
  | {
    readonly t: 'A'; readonly cx: number; readonly cy: number; readonly r: number;
    readonly a0: number; readonly a1: number; readonly trigonometric: boolean;
  }
  | { readonly t: 'C'; readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number; readonly x: number; readonly y: number }
  | { readonly t: 'Z' };

/**
 * O formă de desenat. `sageata` (ADR 0037 §12): pe o cale deschisă, vârful 0 și direcția de mers a desenului acolo (un
 * vector unitar, în mm ai documentului); pânza desenează săgeata doar când forma e în selecție. `parte`: partea frezei pe
 * foaie, față de direcția săgeții (1 = în stânga, −1 = în dreapta), pentru liniuța de lângă ea.
 */
export type FormaDesen = {
  readonly id: string;
  readonly cale: readonly ComandaCale[];
  readonly sageata?: { readonly x: number; readonly y: number; readonly ux: number; readonly uy: number; readonly parte?: 1 | -1 };
};

/** Vederea: câți pixeli CSS are un milimetru și unde cade originea documentului pe ecran (pixeli CSS). */
export type Vedere = { readonly scara: number; readonly tx: number; readonly ty: number };

export type CerereDesen = {
  readonly tip: 'deseneaza';
  readonly cerere: number;
  /** Mărimea pânzei, în pixeli CSS, și densitatea ecranului. */
  readonly latime: number;
  readonly inaltime: number;
  readonly dpr: number;
  readonly vedere: Vedere;
  readonly foaie: { readonly latime: number; readonly inaltime: number };
  readonly forme: readonly FormaDesen[];
  readonly selectie: readonly string[];
  /** Mutarea în curs a selecției, în mm, desenată înainte să intre în document. */
  readonly deplasare: { readonly dx: number; readonly dy: number };
  readonly culori: { readonly fundal: string; readonly foaie: string; readonly linie: string; readonly selectie: string };
};

/** `sageti`: câte săgeți de sens (căile deschise din selecție) are imaginea. */
export type RaspunsDesen = { readonly tip: 'imagine'; readonly cerere: number; readonly imagine: ImageBitmap; readonly sageti: number };

/** Zoomul: cel mult 1 000 px/mm (T13), cel puțin cât să încapă o foaie de 10 m pe ecran. */
export const SCARA_MINIMA = 0.01;
export const SCARA_MAXIMA = 1000;
