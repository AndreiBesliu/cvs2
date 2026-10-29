/**
 * Adresa paginii `/admin` (ADR 0048): fila și documentul deschis stau în `#` (`#roadmap`,
 * `#documentatie/docs/adr/0047-nucleul-de-simulare.md#decizia`), ca un link spre un ADR să se poată trimite și ca un
 * link intern dintr-un document (deschis cu clic de mijloc) să ducă la același loc. Pure: citirea și scrierea.
 */
export const FILE = ['erori', 'diagnoza', 'roadmap', 'documentatie', 'sugestii', 'personal', 'cont'] as const;
export type Fila = (typeof FILE)[number];

export interface Adresa {
  readonly fila: Fila;
  readonly document: string | null;
  readonly ancora: string | null;
}

/** O cale de document din repo, relativă, fără `..`, terminată în `.md`. */
const CALE_DOC = /^(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_][A-Za-z0-9_.-]*\.md$/;

function decodeaza(s: string): string | null {
  try {
    return decodeURIComponent(s);
  } catch {
    return null;
  }
}

/** Pură: adresa din `location.hash`, sau null dacă nu numește o filă. */
export function citesteAdresa(hash: string): Adresa | null {
  const h = hash.replace(/^#/, '');
  const bara = h.indexOf('/');
  const fila = bara < 0 ? h : h.slice(0, bara);
  if (!(FILE as readonly string[]).includes(fila)) return null;
  const rest = bara < 0 ? '' : h.slice(bara + 1);
  const diez = rest.indexOf('#');
  const cale = decodeaza(diez < 0 ? rest : rest.slice(0, diez));
  const ancora = diez < 0 ? null : decodeaza(rest.slice(diez + 1));
  const document = cale !== null && CALE_DOC.test(cale) && !cale.split('/').includes('..') ? cale : null;
  return { fila: fila as Fila, document, ancora: document !== null && ancora ? ancora : null };
}

/** Pură: `#fila[/cale[#ancora]]`, cu segmentele codate. */
export function scrieAdresa(a: Adresa): string {
  if (a.document === null) return `#${a.fila}`;
  const cale = a.document.split('/').map(encodeURIComponent).join('/');
  return `#${a.fila}/${cale}${a.ancora ? `#${encodeURIComponent(a.ancora)}` : ''}`;
}
