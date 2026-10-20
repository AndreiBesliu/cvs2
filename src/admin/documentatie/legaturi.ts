/**
 * Linkurile filelor de documentație (ADR 0048): spre un document din fila Documentație, cu adresa lui din `#` (clicul de
 * mijloc deschide același loc într-o filă nouă) și cu acțiunea clicului simplu.
 */
import type { Legatura, Legaturi } from '../../docs/Markdown.tsx';
import { scrieAdresa } from '../adresa.ts';

export type Deschide = (cale: string, ancora?: string | null) => void;

export function legaturaDocument(cale: string, ancora: string | null, deschide: Deschide): Legatura {
  return { href: scrieAdresa({ fila: 'documentatie', document: cale, ancora }), actiune: () => { deschide(cale, ancora); } };
}

/** Căile pe care le generează build-ul (`scripts/documentatie.ts`): un cod inline care numește una devine link. */
const CALE_GENERATA = /^(?:PLAN|CLAUDE|DEVLOG)\.md$|^docs\/(?:adr|etape)\/[A-Za-z0-9._-]+\.md$/;

/** Pentru textele roadmap-ului (titluri, note): `docs/etape/placa-02.md` scris ca cod duce la document. */
export function legaturiSpreDocumente(deschide: Deschide): Legaturi {
  return { cod: (text) => (CALE_GENERATA.test(text) ? legaturaDocument(text, null, deschide) : null) };
}
