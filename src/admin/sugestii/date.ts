/**
 * Fila Sugestii (ADR 0107), partea pură: documentele citite prin reguli devin rânduri (ce lipsește e necunoscut, nu
 * inventat), ordinea, filtrele pe stare cu numărul din fiecare și ce poate face omul pe un rând.
 */
import { esteStare, esteTip, esteZona, STARI_SUGESTIE, type StareSugestie, type TipSugestie, type ZonaSugestie } from '../../../shared/sugestii.ts';
import { dataDin } from '../erori/date.ts';

export interface Sugestie {
  readonly id: string;
  readonly titlu: string;
  readonly descriere: string;
  readonly tip: TipSugestie | null;
  readonly zona: ZonaSugestie | null;
  readonly autor: string | null;
  readonly autorEmail: string | null;
  readonly creataLa: Date | null;
  readonly modificataLa: Date | null;
  /** null = o stare pe care pagina n-o cunoaște (nu se arată ca „fără decizie”). */
  readonly stare: StareSugestie | null;
  readonly nota: string;
  readonly decisaLa: Date | null;
  /** Versiunea documentului, trimisă înapoi la editare și la decizie; null = necunoscută (nicio cerere nu pleacă). */
  readonly versiune: number | null;
}

type Date_ = Readonly<Record<string, unknown>>;

const text = (x: unknown): string => (typeof x === 'string' ? x : '');
const textSauNull = (x: unknown): string | null => (typeof x === 'string' && x !== '' ? x : null);

export function sugestieDin(id: string, d: Date_): Sugestie {
  const v = d['versiune'];
  return {
    id, titlu: text(d['titlu']), descriere: text(d['descriere']), tip: esteTip(d['tip']) ? d['tip'] : null,
    zona: esteZona(d['zona']) ? d['zona'] : null, autor: textSauNull(d['autor']), autorEmail: textSauNull(d['autorEmail']),
    creataLa: dataDin(d['creataLa']), modificataLa: dataDin(d['modificataLa']), stare: esteStare(d['stare']) ? d['stare'] : null,
    nota: text(d['nota']), decisaLa: dataDin(d['decisaLa']),
    versiune: typeof v === 'number' && Number.isSafeInteger(v) && v >= 1 ? v : null,
  };
}

/** Cele mai noi întâi; o dată necunoscută la coadă (lista autorului vine din Firestore fără ordine, ADR 0107 §5). */
export function ordoneaza(lista: readonly Sugestie[]): Sugestie[] {
  const cand = (s: Sugestie): number => s.creataLa?.getTime() ?? -Infinity;
  return [...lista].sort((a, b) => cand(b) - cand(a) || a.id.localeCompare(b.id));
}

export type Filtru = 'toate' | StareSugestie;

/** Pură: rândurile filtrului; cu `doarAle` (uid-ul omului), doar sugestiile lui. */
export function filtreaza(lista: readonly Sugestie[], filtru: Filtru, doarAle: string | null): Sugestie[] {
  return lista.filter((s) => (filtru === 'toate' || s.stare === filtru) && (doarAle === null || s.autor === doarAle));
}

/** Pură: câte sugestii are fiecare stare (pentru butoanele filtrului); o stare necunoscută nu intră în niciuna. */
export function numarePeStare(lista: readonly Sugestie[]): Readonly<Record<StareSugestie, number>> {
  const n = Object.fromEntries(STARI_SUGESTIE.map((s) => [s, 0])) as Record<StareSugestie, number>;
  for (const s of lista) if (s.stare !== null) n[s.stare] += 1;
  return n;
}

/** Autorul își editează sugestia cât n-are decizie (serverul refuză la fel, ADR 0107 §3). */
export function poateEdita(s: Sugestie, eu: string): boolean {
  return s.autor === eu && s.stare === 'noua' && s.versiune !== null;
}

/** Decizia se arată cât owner-ul a spus ceva: o stare de decizie sau o notă. */
export function areDecizie(s: Sugestie): boolean {
  return (s.stare !== null && s.stare !== 'noua') || s.nota !== '';
}
