/**
 * Id-urile fonturilor din blocul de text (ADR 0106 §2), fără cititor (le folosește și panoul, înaintea modulului textului):
 * id-ul spune cum se găsește fontul din nou, și pe alt calculator. `roboto` (inclus), `f:<amprenta>[.<fața>][@<instanța>]`
 * (încărcat: amprenta fișierului, deci același fișier încărcat oriunde e același font; instanța numită a unui font variabil,
 * după indicele ei din `fvar`, ADR 0113), `g:<familia>:<varianta>` (Google Fonts: se descarcă din nou), `s:<numele
 * PostScript>` (al sistemului: se caută după nume; o instanță numită are numele ei).
 */
import { esteFontInclus, type IdFont } from './fonturi.ts';

export type SursaFont =
  | { readonly fel: 'inclus'; readonly id: IdFont }
  | { readonly fel: 'incarcat'; readonly amprenta: string; readonly fata: number; readonly instanta?: number }
  | { readonly fel: 'google'; readonly familie: string; readonly varianta: string }
  | { readonly fel: 'sistem'; readonly postscript: string };

/**
 * Marginile (ADR 0106 §2): un fișier, fețele și octeții „Fonturilor mele”; instanțele numite ale unei fețe variabile (ADR
 * 0113) nu se numără printre fețe, dar se iau cel mult `instante`.
 */
export const PLAFON_FONTURI = { octetiFisier: 40 * 1024 * 1024, fete: 100, octetiTotal: 300 * 1024 * 1024, instante: 64 } as const;

/** Un font încărcat: amprenta, fața (până la trei cifre: o colecție are cel mult 1 024) și instanța numită, dacă e una. */
const INCARCAT = /^f:([0-9a-f]{16})(?:\.(\d{1,3}))?(?:@(\d{1,4}))?$/;
const VARIANTA = /^([1-9]00|1000)(i?)$/;

/** Sursa unui id din bloc; null: un id pe care versiunea asta nu-l știe. */
export function sursaFont(id: string): SursaFont | null {
  if (esteFontInclus(id)) return { fel: 'inclus', id };
  if (id.startsWith('f:')) {
    // Cititorul spune care față sau instanță lipsește din fișier.
    const m = INCARCAT.exec(id);
    if (!m) return null;
    return { fel: 'incarcat', amprenta: m[1]!, fata: Number(m[2] ?? '0'), ...(m[3] !== undefined ? { instanta: Number(m[3]) } : {}) };
  }
  if (id.startsWith('g:')) {
    const i = id.lastIndexOf(':');
    const familie = id.slice(2, i), varianta = id.slice(i + 1);
    return i > 2 && familie.trim() === familie && familie.length > 0 && VARIANTA.test(varianta) ? { fel: 'google', familie, varianta } : null;
  }
  if (id.startsWith('s:') && id.length > 2 && id.length <= 2 + 127) return { fel: 'sistem', postscript: id.slice(2) };
  return null;
}

export function idFont(s: SursaFont): string {
  switch (s.fel) {
    case 'inclus': return s.id;
    case 'incarcat': return `f:${s.amprenta}${s.fata > 0 ? `.${s.fata}` : ''}${s.instanta !== undefined ? `@${s.instanta}` : ''}`;
    case 'google': return `g:${s.familie}:${s.varianta}`;
    case 'sistem': return `s:${s.postscript}`;
  }
}

/** Numele unei variante Google: „Bold Italic”, „Regular”, „300” pentru grosimile fără nume obișnuit. */
export function numeVarianta(varianta: string): string {
  const m = VARIANTA.exec(varianta);
  if (!m) return varianta;
  const nume: Record<string, string> = {
    100: 'Thin', 200: 'ExtraLight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black',
  };
  const baza = nume[m[1]!] ?? m[1]!;
  return m[2] ? (baza === 'Regular' ? 'Italic' : `${baza} Italic`) : baza;
}

