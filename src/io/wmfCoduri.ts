/**
 * Cifrele și codurile ușii WMF (ADR 0117), fără nicio dependență: interfața le citește fără să încarce ușa, care vine la
 * cerere, la primul import.
 *
 * Refuzurile:
 * - `nu-e-wmf`: fișierul nu începe nici cu antetul placeable (D7 CD C6 9A), nici cu antetul standard al unui WMF;
 * - `emf`: e un EMF, metafișierul pe 32 de biți, ieșit din prag (ArtCAM citește ca vectori doar WMF-ul): se salvează ca WMF,
 *   SVG sau PDF;
 * - `wmf`: fișierul e greșit (o înregistrare ruptă, un cadru placeable gol); detaliul e octetul de unde.
 */
export type CodRefuzWmf = 'nu-e-wmf' | 'emf' | 'wmf';

/**
 * Unitățile de ales pentru un WMF fără antet placeable, care nu-și spune mărimea (ADR 0117 §5): 1/96 țol (px, implicit, ca
 * LibreOffice), 1/1440 țol (twip), 0,01 mm, 0,1 mm, mm.
 */
export const UNITATI_WMF = ['px', 'twip', 'mm100', 'mm10', 'mm'] as const;
export type UnitateWmf = (typeof UNITATI_WMF)[number];
export const MM_PE_UNITATE_WMF: Readonly<Record<UnitateWmf, number>> = { px: 25.4 / 96, twip: 25.4 / 1440, mm100: 0.01, mm10: 0.1, mm: 1 };

/** Unitățile citite (ADR 0117 §5): mm pe unitatea dispozitivului și de unde vin. */
export type UnitatiWmf = {
  readonly mmPeUnitate: number;
  /** `antet`: din antetul placeable; `mapare`: tot desenul e într-un mod metric; `aleasa`: din dialog (implicit px). */
  readonly sursa: 'antet' | 'mapare' | 'aleasa';
  /** Unitățile pe țol ale antetului placeable; altfel null. */
  readonly inch: number | null;
  /** mm pe unitatea logică a modului metric (sursa `mapare`); altfel null. */
  readonly mmPeUnitateMapare: number | null;
  /** Unitatea aleasă (sursa `aleasa`); altfel null. */
  readonly unitate: UnitateWmf | null;
};

/**
 * Raportul (ADR 0117 §9), în ordinea în care îl arată dialogul. `deschise` numără căile deschise IMPORTATE (tăiate pe linie),
 * ca la SVG; `nepictate`: formele cu penița și pensula nule (și liniile cu penița nulă), nevăzute; `sarit-imagine`: imaginile
 * și operațiile raster (și `PatBlt`); `sarit-altele`: regiunile pictate, umplerile după culoare, pixelii; `decupaje`:
 * decupajele, neaplicate; `necunoscute`: înregistrările pe care cititorul nu le știe.
 */
export const CODURI_AVERTISMENT_WMF = [
  'unitati-nedeclarate', 'deschise', 'degenerate', 'prea-mari', 'sub-rezolutie', 'sarit-text', 'sarit-imagine', 'sarit-altele',
  'decupaje', 'nepictate', 'necunoscute', 'inchise-la-usa', 'nonzero-normalizate', 'nonzero-refuzate', 'arce-eliptice', 'arce-plate',
] as const;
export type CodAvertismentWmf = (typeof CODURI_AVERTISMENT_WMF)[number];
export type AvertismenteWmf = Readonly<Record<CodAvertismentWmf, number>>;
