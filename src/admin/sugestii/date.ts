/**
 * Fila Sugestii (ADR 0107; tabla: ADR 0260 §4), partea pură: documentele citite prin reguli devin rânduri (ce lipsește e
 * necunoscut, nu inventat), ordinea, coloanele tablei, mutarea unui card și ce poate face omul pe un rând.
 */
import { type TipPoza } from '../../../shared/poza.ts';
import {
  curataText, esteStare, esteTip, esteZona, NOTA_MAX, STARI_SUGESTIE, type RaspunsSugestie, type StareSugestie, type TipSugestie,
  type ZonaSugestie,
} from '../../../shared/sugestii.ts';
import { dataDin } from '../erori/date.ts';

/** Ce ține sugestia despre poza ei (ADR 0111); octeții stau în documentul pozei. */
export interface MetaPoza {
  readonly tip: TipPoza;
  readonly marime: number;
}

const TIPURI_POZA: readonly string[] = ['image/jpeg', 'image/png', 'image/webp'];

export function metaPozaDin(x: unknown): MetaPoza | null {
  if (typeof x !== 'object' || x === null) return null;
  const { tip, marime } = x as { tip?: unknown; marime?: unknown };
  return typeof tip === 'string' && TIPURI_POZA.includes(tip) && typeof marime === 'number' && marime > 0 ? { tip: tip as TipPoza, marime } : null;
}

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
  /** Poza planșei (ADR 0111), dacă are una. */
  readonly poza: MetaPoza | null;
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
    versiune: typeof v === 'number' && Number.isSafeInteger(v) && v >= 1 ? v : null, poza: metaPozaDin(d['poza']),
  };
}

/** Cele mai noi întâi; o dată necunoscută la coadă (lista autorului vine din Firestore fără ordine, ADR 0107 §5). */
export function ordoneaza(lista: readonly Sugestie[]): Sugestie[] {
  const cand = (s: Sugestie): number => s.creataLa?.getTime() ?? -Infinity;
  return [...lista].sort((a, b) => cand(b) - cand(a) || a.id.localeCompare(b.id));
}

/** Pură: sugestiile omului (uid-ul lui) sau toate (null). */
export const aleLui = (lista: readonly Sugestie[], doarAle: string | null): readonly Sugestie[] =>
  doarAle === null ? lista : lista.filter((s) => s.autor === doarAle);

/** Coloanele tablei (ADR 0260 §4), în ordinea schiței; Respinsele stau sub ele, strânse. */
export const COLOANE: readonly StareSugestie[] = ['noua', 'acceptata', 'in-lucru', 'amanata', 'facuta'];

/** Unde se mută un card, în ordinea meniului „Mută în…”: coloanele, apoi Respinsă; fără starea lui de acum. */
export const tintePentru = (s: Sugestie): StareSugestie[] => [...COLOANE, 'respinsa' as const].filter((x) => x !== s.stare);

/** Nota se cere la Respinsă și la Amânată (ADR 0260 §4): autorul află de ce. */
export const notaCeruta = (stare: StareSugestie): boolean => stare === 'respinsa' || stare === 'amanata';

/** Pură: o decizie care cere notă nu pleacă fără ea; spațiile singure nu sunt o notă (serverul le taie). */
export const lipsesteNota = (stare: StareSugestie, nota: string): boolean => notaCeruta(stare) && nota.trim() === '';

/** Cardurile fiecărei stări (și Respinsele, sub coloane), plus cele cu o stare necunoscută, în afara lor. */
export interface Tabla {
  readonly coloane: Readonly<Record<StareSugestie, readonly Sugestie[]>>;
  readonly necunoscute: readonly Sugestie[];
}

/**
 * Pură: cardurile pe stări. În „Fără decizie”, cele mai noi întâi; în celelalte, ultima decizie întâi (un card mutat urcă în
 * capul coloanei), apoi cele mai noi.
 */
export function tabla(lista: readonly Sugestie[]): Tabla {
  const coloane = Object.fromEntries(STARI_SUGESTIE.map((s) => [s, [] as Sugestie[]])) as Record<StareSugestie, Sugestie[]>;
  const necunoscute: Sugestie[] = [];
  for (const s of ordoneaza(lista)) (s.stare === null ? necunoscute : coloane[s.stare]).push(s);
  const decisa = (s: Sugestie): number => s.decisaLa?.getTime() ?? -Infinity;
  for (const st of STARI_SUGESTIE) if (st !== 'noua') coloane[st].sort((a, b) => decisa(b) - decisa(a) || 0);
  return { coloane, necunoscute };
}

/** O mutare plecată spre server: cardul stă deja în coloana nouă, cu ora plecării ca oră a deciziei. */
export interface Mutare {
  readonly id: string;
  readonly spre: StareSugestie;
  readonly la: Date;
}

/** Pură: lista arătată pe tablă cât o mutare e în drum. */
export const cuMutarea = (lista: readonly Sugestie[], m: Mutare | null): readonly Sugestie[] =>
  m === null ? lista : lista.map((s) => (s.id === m.id ? { ...s, stare: m.spre, decisaLa: m.la } : s));

/** Decizia trimisă: sugestia, versiunea văzută, starea și nota. */
export interface DecizieTrimisa {
  readonly id: string;
  readonly versiune: number;
  readonly stare: StareSugestie;
  readonly nota: string;
}

/**
 * Pură: lista după o decizie primită de server, fără s-o recitească (o mutare nu costă cele până la 300 de citiri ale listei).
 * Serverul a scris pe versiunea trimisă (tranzacția o verifică), deci documentul e acum cel citit, cu starea, nota curățată ca
 * pe server, ora deciziei și versiunea întoarsă. Un rând cu altă versiune (reîncărcat între timp) rămâne cum l-a adus citirea.
 */
export function dupaDecizie(lista: readonly Sugestie[], d: DecizieTrimisa, r: RaspunsSugestie, acum: Date): readonly Sugestie[] {
  if (!r.schimbat) return lista;
  const nota = curataText(d.nota, NOTA_MAX) ?? d.nota;
  return lista.map((s) => (s.id === d.id && s.versiune === d.versiune ? { ...s, stare: d.stare, nota, decisaLa: acum, versiune: r.versiune } : s));
}

/** Autorul își editează sugestia cât n-are decizie (serverul refuză la fel, ADR 0107 §3). */
export function poateEdita(s: Sugestie, eu: string): boolean {
  return s.autor === eu && s.stare === 'noua' && s.versiune !== null;
}

/** Decizia se arată cât owner-ul a spus ceva: o stare de decizie sau o notă. */
export function areDecizie(s: Sugestie): boolean {
  return (s.stare !== null && s.stare !== 'noua') || s.nota !== '';
}
