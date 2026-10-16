import { PLAFON_OAMENI } from '../../../shared/erori.ts';

/**
 * Rândurile filei Erori (ADR 0040 §4), din documentele `errorLogs` (ADR 0039 §2). Pure: primesc datele unui document și
 * întorc ce se arată; un câmp lipsă sau de alt tip devine „necunoscut” (`null`), nu 0.
 */

/** O măsură: valoarea, sau motivul pentru care nu se știe. O cifră care lipsește nu se arată niciodată ca 0. */
export type Masura<T> = { readonly ok: true; readonly valoare: T } | { readonly ok: false; readonly motiv: string };

export interface Aparitie {
  readonly cand: Date | null;
  readonly tip: string;
  readonly mesaj: string;
  readonly stiva: string;
  readonly build: string;
  readonly instanta: string;
  readonly adresa: string;
  readonly browser: string;
  readonly uid: string | null;
  readonly context: string;
}

export interface RandGrup {
  readonly id: string;
  readonly sursa: 'client' | 'server' | 'necunoscuta';
  readonly tip: string;
  readonly mesaj: string;
  readonly numar: number | null;
  readonly oameni: number | null;
  readonly primaData: Date | null;
  readonly ultimaData: Date | null;
  readonly rezolvat: boolean;
  readonly ultima: Aparitie;
}

const text = (x: unknown): string => (typeof x === 'string' ? x : '');
const numar = (x: unknown): number | null => (typeof x === 'number' && Number.isFinite(x) ? x : null);

/** Un `Timestamp` al Firestore (sau orice are `toDate()`); altceva nu e o dată. */
export function dataDin(x: unknown): Date | null {
  if (typeof x !== 'object' || x === null || typeof (x as { toDate?: unknown }).toDate !== 'function') return null;
  const d = (x as { toDate(): unknown }).toDate();
  return d instanceof Date && Number.isFinite(d.getTime()) ? d : null;
}

export function aparitieDin(d: Readonly<Record<string, unknown>>): Aparitie {
  return {
    cand: dataDin(d['cand']), tip: text(d['tip']), mesaj: text(d['mesaj']), stiva: text(d['stiva']), build: text(d['build']),
    instanta: text(d['instanta']), adresa: text(d['adresa']), browser: text(d['browser']),
    uid: typeof d['uid'] === 'string' ? d['uid'] : null, context: text(d['context']),
  };
}

export function randDin(id: string, d: Readonly<Record<string, unknown>>): RandGrup {
  const sursa = d['sursa'] === 'client' || d['sursa'] === 'server' ? d['sursa'] : 'necunoscuta';
  const oameni = d['oameni'];
  const ultima = d['ultima'];
  return {
    id, sursa, tip: text(d['tip']), mesaj: text(d['mesaj']), numar: numar(d['numar']),
    oameni: Array.isArray(oameni) ? oameni.length : null,
    primaData: dataDin(d['primaData']), ultimaData: dataDin(d['ultimaData']), rezolvat: d['rezolvat'] === true,
    ultima: aparitieDin(typeof ultima === 'object' && ultima !== null ? ultima as Record<string, unknown> : {}),
  };
}

/** Oamenii unui grup se țin până la plafon: la plafon, „50 sau mai mulți”. */
export function laPlafonOameni(n: number | null): boolean {
  return n !== null && n >= PLAFON_OAMENI;
}

/** Data scurtă, în limba paginii; o dată necunoscută e „—”. */
export function dataScurta(d: Date | null, limba: string): string {
  return d ? new Intl.DateTimeFormat(limba, { dateStyle: 'short', timeStyle: 'short' }).format(d) : '—';
}

/** Motivul unei erori Firebase (`code`, apoi mesajul), scurt. */
export function motivDin(e: unknown): string {
  if (typeof e === 'object' && e !== null) {
    const o = e as { code?: unknown; message?: unknown };
    const cod = typeof o.code === 'string' ? o.code : '';
    const mesaj = typeof o.message === 'string' ? o.message : '';
    if (cod && mesaj) return `${cod}: ${mesaj}`;
    if (cod || mesaj) return cod || mesaj;
  }
  return String(e);
}
