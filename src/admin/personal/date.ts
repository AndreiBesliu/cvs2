/**
 * Fila Personal și filele pe permisiuni (ADR 0049), partea pură: documentele citite prin reguli devin rânduri (ce lipsește
 * e necunoscut, nu inventat), iar filele vizibile ies din rolul omului.
 */
import { esteIdRol, estePermisiune, OWNER, PERMISIUNI, type Permisiune } from '../../../shared/personal.ts';
import { FILE, type Fila } from '../adresa.ts';

export type Sursa = 'consola' | 'invitatie' | 'cont-creat';

export interface Om {
  readonly uid: string;
  readonly email: string | null;
  readonly rol: string | null;
  readonly sursa: Sursa;
  readonly adaugatLa: Date | null;
}

export interface RolCustom {
  readonly id: string;
  readonly nume: string;
  readonly permisiuni: readonly Permisiune[];
}

export interface Invitatie {
  readonly id: string;
  readonly email: string;
  readonly rol: string | null;
  readonly expiraLa: Date | null;
}

type Date_ = Record<string, unknown>;

/** Un `Timestamp` (sau orice are `toDate()`); altceva = necunoscut. */
export function dataDin(x: unknown): Date | null {
  if (typeof x === 'object' && x !== null && typeof (x as { toDate?: unknown }).toDate === 'function') {
    const d = (x as { toDate: () => unknown }).toDate();
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
  }
  return null;
}

const text = (x: unknown): string | null => (typeof x === 'string' && x !== '' ? x : null);

export function omDin(uid: string, d: Date_): Om {
  const s = d['sursa'];
  // Un document fără sursă e unul pus de mână în consolă (primul owner, ADR 0040).
  const sursa: Sursa = s === 'invitatie' || s === 'cont-creat' ? s : 'consola';
  return { uid, email: text(d['email']), rol: text(d['rol']), sursa, adaugatLa: dataDin(d['adaugatLa']) };
}

export function rolDin(id: string, d: Date_): RolCustom {
  const lista: readonly unknown[] = Array.isArray(d['permisiuni']) ? d['permisiuni'] : [];
  // În ordinea catalogului; ce nu e în catalog nu se arată (regulile nu-l dau nici ele).
  return { id, nume: text(d['nume']) ?? id, permisiuni: PERMISIUNI.filter((x) => lista.some((y) => estePermisiune(y) && y === x)) };
}

export function invitatieDin(id: string, d: Date_): Invitatie {
  return { id, email: text(d['email']) ?? '?', rol: text(d['rol']), expiraLa: dataDin(d['expiraLa']) };
}

/** Numele de arătat al unui rol: `owner`, numele rolului custom, sau null (rol necunoscut: un rol șters, o treaptă veche). */
export function numeRol(rol: string | null, roluri: readonly RolCustom[]): string | null {
  if (rol === OWNER) return OWNER;
  if (!esteIdRol(rol)) return null;
  return roluri.find((r) => r.id === rol)?.nume ?? null;
}

/**
 * Ce filă cere ce (oricare din permisiunile listate): Erori, Diagnoza, documentația (Roadmap și Documentație), Sugestii
 * (scrierea sau citirea tuturor, ADR 0107), Personal (doar owner-ul), Cont (oricine).
 */
const CERE: Readonly<Record<Fila, readonly Permisiune[] | 'owner' | null>> = {
  erori: ['erori.citeste'],
  diagnoza: ['diagnoza.citeste'],
  roadmap: ['documentatie.citeste'],
  documentatie: ['documentatie.citeste'],
  sugestii: ['sugestii.scrie', 'sugestii.citeste'],
  personal: 'owner',
  cont: null,
};

/** Pură: filele pe care le vede omul, în ordinea paginii. */
export function fileVizibile(owner: boolean, permisiuni: ReadonlySet<Permisiune>): Fila[] {
  return FILE.filter((f) => {
    const c = CERE[f];
    return c === null || (c === 'owner' ? owner : owner || c.some((p) => permisiuni.has(p)));
  });
}
