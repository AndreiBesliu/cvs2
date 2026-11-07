/**
 * Fila Tichete (ADR 0116 §13), partea pură: documentele citite prin reguli devin rânduri (ce lipsește e necunoscut, nu
 * inventat), ordinea, filtrele pe stare cu numărul din fiecare și vârsta roșie a unui tichet fără răspuns.
 */
import {
  esteFelTichet, esteStareTichet, faraRaspunsPrea, metaProiectDin, RE_AMPRENTA, STARI_TICHET, type FelTichet, type MetaProiectTichet,
  type StareTichet,
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
  /** Proiectul atașat (felia 15.B↑b), descărcat la cerere prin callable; null = fără proiect (sau o meta stricată). */
  readonly proiect: MetaProiectTichet | null;
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
    poza: metaPozaDin(d['poza']), proiect: metaProiectDin(d['proiect']),
    raspunsuri: (Array.isArray(raspunsuri) ? raspunsuri : []).map((r: unknown) => {
      const o = obiect(r) ?? {};
      return { deEmail: textSauNull(o['deEmail']), text: text(o['text']), la: dataDin(o['la']) };
    }),
    versiune: typeof v === 'number' && Number.isSafeInteger(v) && v >= 1 ? v : null,
  };
}

/* ── Proiectul atașat (felia 15.B↑b): descărcat prin callable, despachetat și verificat aici ─────────────────────────── */

/** Numele fișierului descărcat: JSON-ul canonic al proiectului, pe care îl deschide ușa unui proiect salvat. */
export const numeFisierProiect = (id: string): string => `cncvs2-tichet-${id}.json`;

/** Proiectul din răspunsul callable-ului (gzip în base64), despachetat de browser. */
export async function despacheteazaProiect(base64: string): Promise<Uint8Array<ArrayBuffer>> {
  const gz = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const flux = new Blob([gz]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(flux).arrayBuffer());
}

/** SHA-256 în hex mic, ca serverul (`createHash('sha256').digest('hex')`). */
export async function sha256Hex(o: Uint8Array<ArrayBuffer>): Promise<string> {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', o))].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Proiectul descărcat e cel trimis: aceeași mărime și aceeași amprentă ca în tichet. */
export async function proiectVerificat(json: Uint8Array<ArrayBuffer>, meta: MetaProiectTichet): Promise<boolean> {
  return json.length === meta.marime && (await sha256Hex(json)) === meta.sha256;
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
