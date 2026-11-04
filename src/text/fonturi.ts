/**
 * Fonturile incluse în aplicație (ADR 0105 §6): id-ul (scris în blocul de text al piesei), numele arătat și fișierul, din
 * `public/fonturi/` (în precache: textul merge și fără rețea). Roboto și Droid Serif sunt Apache 2.0, Relief SingleLine
 * (ADR 0140: un font cu o singură linie, de gravură, descărcat cu acordul owner-ului) e OFL 1.1; licențele, lângă ele.
 * Subseturi făcute cu fontTools: literele latine, ș și ț cu virgulă, punctuația, fără instrucțiunile de hinting. Fără
 * dependențe: panoul textului le arată înaintea modulului care le citește.
 */
export const FONTURI_INCLUSE = [
  { id: 'roboto', nume: 'Roboto', fisier: 'fonturi/roboto.ttf' },
  { id: 'droid-serif', nume: 'Droid Serif', fisier: 'fonturi/droid-serif.ttf' },
  { id: 'relief-singleline', nume: 'Relief SingleLine', fisier: 'fonturi/relief-singleline.ttf' },
] as const;

export type IdFont = (typeof FONTURI_INCLUSE)[number]['id'];

export const FONT_IMPLICIT: IdFont = 'roboto';

export const esteFontInclus = (id: string): id is IdFont => FONTURI_INCLUSE.some((f) => f.id === id);
