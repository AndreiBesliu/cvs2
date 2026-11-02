/**
 * Raportările clienților, adică tichetele (ADR 0116 §C, felia 15.B↑a), comune clientului și serverului: ce are un tichet,
 * stările lui și validările cererilor. Le scrie doar serverul (callable-ul `tichete`, cu auditul în aceeași tranzacție);
 * regulile dau doar citirea: autorul își citește tichetele lui, cei cu `tichete.citeste` (și owner-ul) le citesc pe toate.
 * Sugestiile personalului (ADR 0107) rămân separate: ele sunt pentru planul owner-ului, tichetele pentru sprijin (§15).
 */
import { curataText, ziUtc } from './sugestii.ts';

export { ziUtc };

export const COLECTIE_TICHETE = 'tichete';
/** Contorul zilnic al fiecărui autor (un document pe cont, rescris în ziua următoare), scris doar de server. */
export const COLECTIE_LIMITE_TICHETE = 'limiteTichete';

export const FELURI_TICHET = ['problema', 'idee', 'intrebare'] as const;
export type FelTichet = (typeof FELURI_TICHET)[number];

/** `nou` până la primul răspuns, `deschis` după el, `rezolvat` când personalul îl închide; se poate redeschide. */
export const STARI_TICHET = ['nou', 'deschis', 'rezolvat'] as const;
export type StareTichet = (typeof STARI_TICHET)[number];

export const TEXT_MAX = 4000;
export const RASPUNS_MAX = 2000;
/** Câte raportări trimite un cont într-o zi (UTC, ADR 0116 §13): un cont furat nu umple baza. */
export const TICHETE_PE_ZI = 10;
/** Câte răspunsuri ține un tichet: documentul rămâne mic. */
export const RASPUNSURI_MAX = 50;
/** Câte amprente de erori din sesiune pleacă, cel mult. */
export const AMPRENTE_MAX = 20;
/** Câte tichete citește fila Tichete dintr-o dată. */
export const PLAFON_LISTA_TICHETE = 300;
/** Câte raportări ale lui primește omul în aplicație. */
export const PLAFON_RAPORTARILE_MELE = 50;
/** După cât timp fără răspuns se arată roșie vârsta unui tichet (ADR 0116 §13). */
export const FARA_RASPUNS_MS = 48 * 3_600_000;

export const RE_ID_TICHET = /^[A-Za-z0-9]{20}$/;
/** O amprentă de eroare, ca id-urile din `errorLogs` (SHA-256, primele 32 de caractere hex, ADR 0039 §3). */
export const RE_AMPRENTA = /^[0-9a-f]{32}$/;

const inLista = <T extends string>(lista: readonly T[], x: unknown): x is T => typeof x === 'string' && (lista as readonly string[]).includes(x);
export const esteFelTichet = (x: unknown): x is FelTichet => inLista(FELURI_TICHET, x);
export const esteStareTichet = (x: unknown): x is StareTichet => inLista(STARI_TICHET, x);
export const esteIdTichet = (x: unknown): x is string => typeof x === 'string' && RE_ID_TICHET.test(x);

/** Cât din browser (user-agentul) primește un tichet: editorul taie restul (`aplicatiaTichet`). */
export const BROWSER_MAX = 300;

/** Datele aplicației, puse de editor lângă raportare (ADR 0116 §11): versiunea, instanța, limba, browserul, planul ținut. */
export interface AplicatiaTichet {
  readonly versiune: string;
  readonly instanta: string;
  readonly limba: 'ro' | 'en';
  readonly browser: string;
  readonly plan: string | null;
}

const textScurt = (x: unknown, max: number): string | null => {
  if (typeof x !== 'string') return null;
  const s = x.replace(/\s+/g, ' ').trim();
  return s === '' || [...s].length > max || /[\u0000-\u001f\u007f]/.test(s) ? null : s;
};

/** Pură: datele aplicației din cerere, curățate (un câmp lipsă sau greșit = null pentru toate). */
export function curataAplicatia(x: unknown): AplicatiaTichet | null {
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return null;
  const o = x as Record<string, unknown>;
  const versiune = textScurt(o['versiune'], 40);
  const instanta = textScurt(o['instanta'], 20);
  const browser = textScurt(o['browser'], BROWSER_MAX);
  const plan = o['plan'] === null ? null : textScurt(o['plan'], 20);
  const limba = o['limba'];
  if (versiune === null || instanta === null || browser === null || (o['plan'] !== null && plan === null) || (limba !== 'ro' && limba !== 'en')) return null;
  return { versiune, instanta, limba, browser, plan };
}

/** Pură: amprentele erorilor din sesiune, fără repetiții, în ordinea lor; mai multe decât plafonul sau una greșită = null. */
export function curataAmprentele(x: unknown): readonly string[] | null {
  if (!Array.isArray(x) || x.length > AMPRENTE_MAX || !x.every((a) => typeof a === 'string' && RE_AMPRENTA.test(a))) return null;
  return [...new Set(x as string[])];
}

/** Pură: textul raportării (sau al unui răspuns): pe mai multe rânduri, 1…`max` caractere; null altfel. */
export function curataTextTichet(x: unknown, max: number = TEXT_MAX): string | null {
  const s = curataText(x, max);
  return s === null || s === '' ? null : s;
}

/** Pură: vârsta unui tichet se arată roșie: nerezolvat, fără niciun răspuns, mai vechi de 48 h. */
export function faraRaspunsPrea(t: { readonly creatLa: number; readonly raspunsuri: number; readonly stare: StareTichet }, acum: number): boolean {
  return t.stare !== 'rezolvat' && t.raspunsuri === 0 && acum - t.creatLa >= FARA_RASPUNS_MS;
}

/** Un răspuns al echipei, cum îl primește autorul în aplicație (fără cine l-a scris). */
export interface RaspunsEchipei {
  readonly text: string;
  readonly la: number;
}

/** O raportare a omului, cum o arată „Raportările mele” (ADR 0116 §14). */
export interface RaportareaMea {
  readonly id: string;
  readonly fel: FelTichet;
  readonly text: string;
  readonly stare: StareTichet;
  readonly creatLa: number;
  readonly raspunsuri: readonly RaspunsEchipei[];
  readonly necitite: number;
}

/** Cererile callable-ului `tichete`; poza (opțională, base64, ca la sugestii: ADR 0111) doar la raportare. */
export type CerereTichet =
  | {
    readonly actiune: 'raporteaza'; readonly fel: FelTichet; readonly text: string; readonly aplicatia: AplicatiaTichet;
    readonly amprente: readonly string[]; readonly poza?: string;
  }
  | { readonly actiune: 'mele' }
  | { readonly actiune: 'citit'; readonly id: string }
  | { readonly actiune: 'raspunde'; readonly id: string; readonly versiune: number; readonly text: string }
  | { readonly actiune: 'stare'; readonly id: string; readonly versiune: number; readonly stare: StareTichet };

export interface RaspunsTichet {
  readonly ok: true;
  readonly id: string;
  readonly schimbat: boolean;
  readonly versiune: number;
}

export interface RaspunsRaportarileMele {
  readonly ok: true;
  readonly raportari: readonly RaportareaMea[];
  readonly necitite: number;
}
