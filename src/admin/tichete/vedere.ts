/**
 * Fila Tichete (ADR 0260 §3, felia A.3), partea pură a așezării: titlul tichetului din text, numărul fiecărui filtru, starea
 * pe care o pune butonul „Răspunde și …” și erorile din sesiune, cu grupul lor din `errorLogs`, când rolul îl poate citi.
 */
import type { StareTichet } from '../../../shared/tichete.ts';
import type { RandGrup } from '../erori/date.ts';
import { numarePeStare, type Filtru, type Tichet } from './date.ts';

/** Cât de lung e titlul unui tichet (în listă și în capul detaliului), în caractere. */
export const TITLU_MAX = 90;

/**
 * Titlul tichetului, din textul lui (tichetul n-are titlu): primul rând cu text, cu spațiile strânse; peste `max` caractere,
 * tăiat la ultimul cuvânt întreg (dacă nu e prea devreme) și încheiat cu „…”. Un text gol dă ''.
 */
export function titluTichet(text: string, max = TITLU_MAX): string {
  const rand = text.split(/\r?\n/).map((r) => r.replace(/\s+/g, ' ').trim()).find((r) => r !== '') ?? '';
  const litere = Array.from(rand);
  if (litere.length <= max) return rand;
  const taiat = litere.slice(0, max).join('');
  const spatiu = taiat.lastIndexOf(' ');
  return `${(spatiu > taiat.length / 2 ? taiat.slice(0, spatiu) : taiat).trimEnd()}…`;
}

/** Numărul de pe fiecare buton al filtrului: „Toate” le numără pe toate (și o stare necunoscută), restul pe stări. */
export function numereFiltru(lista: readonly Tichet[]): Readonly<Record<Filtru, number>> {
  return { toate: lista.length, ...numarePeStare(lista) };
}

/**
 * Starea pusă de „Răspunde și …” (schița Tichete), după răspuns: un tichet nou sau deschis se rezolvă, unul rezolvat se
 * redeschide (răspunsul singur lasă un tichet rezolvat cum e, ADR 0116, 15.B↑b). O stare necunoscută n-are butonul.
 */
export function stareDupaRaspuns(stare: StareTichet | null): StareTichet | null {
  if (stare === null) return null;
  return stare === 'rezolvat' ? 'deschis' : 'rezolvat';
}

/**
 * Textul unui răspuns rapid pus în câmp (ADR 0261 §5): în locul selecției (sau la cursor), fără să șteargă restul, cu un rând
 * gol înainte și după, când lângă el e text. Întoarce și locul cursorului, la capătul bucății puse.
 */
export function insereazaLaCursor(text: string, start: number, end: number, bucata: string): { readonly text: string; readonly cursor: number } {
  const s = Math.max(0, Math.min(start, text.length));
  const e = Math.max(s, Math.min(end, text.length));
  const inainte = text.slice(0, s);
  const dupa = text.slice(e);
  const sus = inainte === '' || inainte.endsWith('\n\n') ? '' : inainte.endsWith('\n') ? '\n' : '\n\n';
  const jos = dupa === '' || dupa.startsWith('\n\n') ? '' : dupa.startsWith('\n') ? '\n' : '\n\n';
  const cap = inainte + sus + bucata;
  return { text: cap + jos + dupa, cursor: cap.length };
}

/** Un răspuns rapid încape încă în câmp, pus la capăt: altfel butonul lui se oprește (ADR 0261 §5). */
export const incapeRapid = (text: string, bucata: string, max: number): boolean => insereazaLaCursor(text, text.length, text.length, bucata).text.length <= max;

/** O eroare din sesiunea raportării: amprenta și, dacă s-a citit, grupul ei (null = nu mai e în jurnal). */
export interface EroareSesiune {
  readonly amprenta: string;
  readonly grup: RandGrup | null;
}

/**
 * Erorile din sesiune, în ordinea amprentelor din tichet, cu grupurile citite: o amprentă al cărei grup nu s-a citit
 * (încă) nu apare aici, ca să nu se spună „nu mai e în jurnal” înainte de răspuns.
 */
export function eroriSesiune(amprente: readonly string[], citite: ReadonlyMap<string, RandGrup | null>): EroareSesiune[] {
  return amprente.filter((a) => citite.has(a)).map((a) => ({ amprenta: a, grup: citite.get(a) ?? null }));
}
