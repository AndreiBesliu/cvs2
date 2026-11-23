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

/* ── Matricea rol × permisiune (ADR 0260 §6, felia A.5) ──────────────────────────────────────────────────────────── */

export interface GrupPermisiuni {
  /** Zona permisiunilor: ce stă înaintea punctului (`erori`, `conturi`…). */
  readonly zona: string;
  readonly permisiuni: readonly Permisiune[];
}

/** Rândurile matricei: catalogul, grupat pe zone, în ordinea lui (o zonă stă la locul primei ei permisiuni). */
export function grupePermisiuni(catalog: readonly Permisiune[] = PERMISIUNI): GrupPermisiuni[] {
  const grupe = new Map<string, Permisiune[]>();
  for (const p of catalog) {
    const zona = p.slice(0, p.indexOf('.'));
    grupe.set(zona, [...(grupe.get(zona) ?? []), p]);
  }
  return [...grupe].map(([zona, permisiuni]) => ({ zona, permisiuni }));
}

/** Eticheta unei permisiuni („Erori: citește”), despărțită pentru matrice: zona și fapta; fără „:”, fapta e goală. */
export function etichetaPermisiune(text: string): { readonly zona: string; readonly fapta: string } {
  const k = text.indexOf(': ');
  return k < 0 ? { zona: text, fapta: '' } : { zona: text.slice(0, k), fapta: text.slice(k + 2) };
}

/**
 * Ce filă cere ce (oricare din permisiunile listate): Erori, Diagnoza, documentația (Roadmap și Documentație), Sugestii
 * (scrierea sau citirea tuturor, ADR 0107), Utilizatori (citirea sau administrarea conturilor, ADR 0116), Personal și
 * Setări (doar owner-ul), Cont (oricine).
 */
const CERE: Readonly<Record<Exclude<Fila, 'azi'>, readonly Permisiune[] | 'owner' | null>> = {
  erori: ['erori.citeste'],
  diagnoza: ['diagnoza.citeste'],
  roadmap: ['documentatie.citeste'],
  documentatie: ['documentatie.citeste'],
  sugestii: ['sugestii.scrie', 'sugestii.citeste'],
  tichete: ['tichete.citeste', 'tichete.raspunde'],
  utilizatori: ['conturi.citeste', 'conturi.administreaza'],
  personal: 'owner',
  setari: 'owner',
  cont: null,
};

/**
 * Pură: filele pe care le vede omul, în ordinea paginii. Fila Azi (ADR 0260) nu e aici: ea doar adună cifrele acestor
 * file, deci apare în bară după părțile ei (`fileBarei` din `carcasa/date.ts`).
 */
export function fileVizibile(owner: boolean, permisiuni: ReadonlySet<Permisiune>): Fila[] {
  return FILE.filter((f): f is Exclude<Fila, 'azi'> => f !== 'azi').filter((f) => {
    const c = CERE[f];
    return c === null || (c === 'owner' ? owner : owner || c.some((p) => permisiuni.has(p)));
  });
}
