/**
 * Vestea despre o versiune nouă (ADR 0232 §C.16): ce extensii instalate au în bibliotecă o versiune mai nouă, ținut în
 * browser din ce s-a aflat la ultima deschidere a meniului sau a bibliotecii. Din el, gazda pune un punct pe butonul
 * Extensii, **fără nicio cerere de rețea la pornire** (ADR 0230): catalogul se cere tot doar când omul deschide meniul.
 * Vestea ține până la actualizare sau la scoatere: se numără doar ce e încă mai nou decât ce e instalat. Doar o comoditate:
 * o stocare care aruncă sau o valoare ciudată nu spun nimic.
 */
import { comparaVersiuni, RE_VERSIUNE_BIBLIOTECA, type RandBiblioteca } from '../../shared/biblioteca.ts';
import { stareRand } from './biblioteca.ts';
import type { Manifest } from './pachet.ts';

export const CHEIE_EXTENSII_NOI = 'cncvs2.extensii-noi';

/** Id-ul extensiei → versiunea mai nouă văzută în bibliotecă. */
export type Noi = Readonly<Record<string, string>>;
type Instalata = { readonly id: string; readonly manifest: Manifest };
export type StocareNoi = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** Stocarea browserului, dacă se poate atinge (accesul la `localStorage` poate arunca). */
function stocareBrowser(): StocareNoi | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

const ID = /^[a-z0-9-]{1,40}$/;

/** Pură: din rândurile catalogului, extensiile instalate pe care fila de acum le poate actualiza. */
export function noiDupaCatalog(randuri: readonly RandBiblioteca[], instalate: readonly Instalata[]): Noi {
  const noi: Record<string, string> = {};
  for (const x of instalate) {
    const r = randuri.find((y) => y.id === x.id);
    if (r && stareRand(r, x.manifest).fel === 'actualizeaza') noi[x.id] = r.versiune;
  }
  return noi;
}

/** Pură: ce mai e de spus din veste, după ce e instalat acum (o extensie actualizată sau scoasă pleacă din ea). */
export function pastreazaNoi(noi: Noi, instalate: readonly Instalata[]): Noi {
  return Object.fromEntries(Object.entries(noi).filter(([id, versiune]) => {
    const x = instalate.find((y) => y.id === id);
    return x !== undefined && comparaVersiuni(x.manifest.versiune, versiune) === -1;
  }));
}

/** Pură: câte extensii instalate au o versiune mai nouă, după veste. */
export const cateNoi = (noi: Noi, instalate: readonly Instalata[]): number => Object.keys(pastreazaNoi(noi, instalate)).length;

export function citesteNoi(stocare: StocareNoi | null = stocareBrowser()): Noi {
  try {
    const x: unknown = JSON.parse(stocare?.getItem(CHEIE_EXTENSII_NOI) ?? 'null');
    if (typeof x !== 'object' || x === null || (x as { v?: unknown }).v !== 1) return {};
    const n = (x as { noi?: unknown }).noi;
    if (typeof n !== 'object' || n === null || Array.isArray(n)) return {};
    return Object.fromEntries(Object.entries(n).filter(([id, v]) => ID.test(id) && typeof v === 'string' && RE_VERSIUNE_BIBLIOTECA.test(v)).slice(0, 50)) as Noi;
  } catch {
    return {};
  }
}

/** Scrie vestea; fără nimic de spus, cheia pleacă. */
export function scrieNoi(noi: Noi, stocare: StocareNoi | null = stocareBrowser()): void {
  try {
    if (Object.keys(noi).length === 0) stocare?.removeItem(CHEIE_EXTENSII_NOI);
    else stocare?.setItem(CHEIE_EXTENSII_NOI, JSON.stringify({ v: 1, noi }));
  } catch {
    // Fără stocare, punctul doar nu ține după reîncărcare.
  }
}
