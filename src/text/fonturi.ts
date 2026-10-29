/**
 * Fonturile incluse în aplicație (ADR 0105 §6): id-ul (scris în blocul de text al piesei), numele arătat și fișierul, din
 * `public/fonturi/` (în precache: textul merge și fără rețea). Ambele sunt Apache 2.0 (licența, lângă ele), subseturi făcute
 * cu fontTools din fonturile de pe mașina asta: literele latine, ș și ț cu virgulă, punctuația, fără instrucțiunile de
 * hinting. Fără dependențe: panoul textului le arată înaintea modulului care le citește.
 */
export const FONTURI_INCLUSE = [
  { id: 'roboto', nume: 'Roboto', fisier: 'fonturi/roboto.ttf' },
  { id: 'droid-serif', nume: 'Droid Serif', fisier: 'fonturi/droid-serif.ttf' },
] as const;

export type IdFont = (typeof FONTURI_INCLUSE)[number]['id'];

export const FONT_IMPLICIT: IdFont = 'roboto';

export const esteFontInclus = (id: string): id is IdFont => FONTURI_INCLUSE.some((f) => f.id === id);
