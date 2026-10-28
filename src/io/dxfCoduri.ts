/**
 * Cifrele și codurile ușii DXF (ADR 0101), fără nicio dependență: interfața le citește fără să încarce ușa, care vine la
 * cerere, la primul import.
 */

/** Unitățile pe care le poate alege omul când fișierul nu și le declară ($INSUNITS lipsă, 0 sau necunoscut). */
export const UNITATI_DXF = ['mm', 'cm', 'm', 'inch', 'ft'] as const;
export type UnitateDxf = (typeof UNITATI_DXF)[number];
export const MM_PE_UNITATE: Readonly<Record<UnitateDxf, number>> = { mm: 1, cm: 10, m: 1000, inch: 25.4, ft: 304.8 };

/**
 * Refuzurile ușii DXF, în plus față de ale ușii SVG (`octeti`, `gol`, `departe`, `plafon`, `tip`): `binar`, un DXF binar
 * (se salvează ca ASCII); `dxf`, perechile cod / valoare rupte, cu linia în detaliu.
 */
export type CodRefuzDxf = 'binar' | 'dxf';

/** Raportul (ADR 0101 §9), în ordinea în care îl arată dialogul. */
export const CODURI_AVERTISMENT_DXF = [
  'unitati-nedeclarate', 'unitati-necunoscute', 'deschise', 'unite', 'goluri', 'degenerate', 'sub-rezolutie', 'prea-mari',
  'ascunse', 'hartie', 'sarit-text', 'sarit-hasura', 'sarit-cota', 'sarit-punct', 'sarit-3d', 'sarit-imagine', 'sarit-altele',
  'inclinate', 'proiectate', 'blocuri-lipsa', 'blocuri-adanci', 'xref', 'singulare', 'arce-eliptice', 'arce-plate',
  'cubice-din-arce', 'spline-aproximate', 'spline-fara-control', 'spline-invalide', 'eroare-date',
] as const;
export type CodAvertismentDxf = (typeof CODURI_AVERTISMENT_DXF)[number];
export type AvertismenteDxf = Readonly<Record<CodAvertismentDxf, number>>;
