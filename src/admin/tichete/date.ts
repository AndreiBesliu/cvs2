/**
 * Fila Tichete (ADR 0116 §13), partea pură: documentele citite prin reguli devin rânduri (ce lipsește e necunoscut, nu
 * inventat), ordinea, filtrele pe stare cu numărul din fiecare și vârsta roșie a unui tichet fără răspuns.
 */
import {
  esteFelTichet, esteStareTichet, faraRaspunsPrea, RE_AMPRENTA, STARI_TICHET, type FelTichet, type StareTichet,
} from '../../../shared/tichete.ts';
import { dataDin } from '../erori/date.ts';
import { metaPozaDin, type MetaPoza } from '../sugestii/date.ts';

/** Datele aplicației puse de editor; un câmp lipsă rămâne gol, nu inventat. */
export interface AplicatiaAdmin {
  readonly versiune: string;
  readonly instanta: string;
  readonly limba: string;
  readonly browser: string;
  readonly plan: string | null;
}

/** Un răspuns al personalului, cu cine l-a scris (clientul nu-l vede). */
export interface RaspunsAdmin {
  readonly deEmail: string | null;
  readonly text: string;
  readonly la: Date | null;
}

export interface Tichet {
  readonly id: string;
  readonly fel: FelTichet | null;
  readonly text: string;
  readonly autorEmail: string | null;
  readonly creatLa: Date | null;
  /** null = o stare pe care pagina n-o cunoaște. */
  readonly stare: StareTichet | null;
  readonly aplicatia: AplicatiaAdmin | null;
  readonly amprente: readonly string[];
  readonly poza: MetaPoza | null;
  readonly raspunsuri: readonly RaspunsAdmin[];
  /** Versiunea documentului, trimisă înapoi la răspuns și la stare; null = necunoscută (nicio cerere nu pleacă). */
  readonly versiune: number | null;
}

type Date_ = Readonly<Record<string, unknown>>;

const text = (x: unknown): string => (typeof x === 'string' ? x : '');
const textSauNull = (x: unknown): string | null => (typeof x === 'string' && x !== '' ? x : null);
const obiect = (x: unknown): Date_ | null => (typeof x === 'object' && x !== null && !Array.isArray(x) ? x as Date_ : null);

function aplicatiaDin(x: unknown): AplicatiaAdmin | null {
  const o = obiect(x);
  if (!o) return null;
  return { versiune: text(o['versiune']), instanta: text(o['instanta']), limba: text(o['limba']), browser: text(o['browser']), plan: textSauNull(o['plan']) };
}

export function tichetDin(id: string, d: Date_): Tichet {
  const v = d['versiune'];
  const raspunsuri: unknown = d['raspunsuri'];
  const amprente: unknown = d['amprente'];
  return {
    id, fel: esteFelTichet(d['fel']) ? d['fel'] : null, text: text(d['text']), autorEmail: textSauNull(d['autorEmail']),
    creatLa: dataDin(d['creatLa']), stare: esteStareTichet(d['stare']) ? d['stare'] : null, aplicatia: aplicatiaDin(d['aplicatia']),
    amprente: Array.isArray(amprente) ? amprente.filter((a): a is string => typeof a === 'string' && RE_AMPRENTA.test(a)) : [],
    poza: metaPozaDin(d['poza']),
    raspunsuri: (Array.isArray(raspunsuri) ? raspunsuri : []).map((r: unknown) => {
      const o = obiect(r) ?? {};
      return { deEmail: textSauNull(o['deEmail']), text: text(o['text']), la: dataDin(o['la']) };
    }),
    versiune: typeof v === 'number' && Number.isSafeInteger(v) && v >= 1 ? v : null,
  };
}

/** Cele mai noi întâi; o dată necunoscută la coadă. */
export function ordoneaza(lista: readonly Tichet[]): Tichet[] {
  const cand = (x: Tichet): number => x.creatLa?.getTime() ?? -Infinity;
  return [...lista].sort((a, b) => cand(b) - cand(a) || a.id.localeCompare(b.id));
}

export type Filtru = 'toate' | StareTichet;

export function filtreaza(lista: readonly Tichet[], filtru: Filtru): Tichet[] {
  return lista.filter((x) => filtru === 'toate' || x.stare === filtru);
}

/** Câte tichete are fiecare stare (butoanele filtrului); o stare necunoscută nu intră în niciuna. */
export function numarePeStare(lista: readonly Tichet[]): Readonly<Record<StareTichet, number>> {
  const n = Object.fromEntries(STARI_TICHET.map((s) => [s, 0])) as Record<StareTichet, number>;
  for (const x of lista) if (x.stare !== null) n[x.stare] += 1;
  return n;
}

/** Vârsta roșie (ADR 0116 §13): nerezolvat, fără niciun răspuns, mai vechi de 48 h; o dată sau o stare necunoscută nu e roșie. */
export function eRosu(x: Tichet, acum: number): boolean {
  return x.creatLa !== null && x.stare !== null && faraRaspunsPrea({ creatLa: x.creatLa.getTime(), raspunsuri: x.raspunsuri.length, stare: x.stare }, acum);
}
