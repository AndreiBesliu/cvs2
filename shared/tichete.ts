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

/**
 * Proiectul atașat unei raportări (ADR 0116 §12, felia 15.B↑b), doar cu bifa omului: documentul deschis în editor, ca JSON
 * canonic (aceiași octeți pe care îi salvează browserul), cel mult 10 MB. Pleacă comprimat (gzip), în base64, în cererea
 * raportării; serverul îl ține în Storage (`caleProiectTichet`) și îl dă înapoi, prin același callable, doar cui poate citi
 * tichetul (autorul, `tichete.citeste`, `tichete.raspunde`, owner-ul). Din client nu se citește și nu se scrie nimic în
 * Storage: regulile refuză tot.
 */
export const PROIECT_MAX_OCTETI = 10 * 1024 * 1024;
/** Proiectul comprimat nu trece nici el de plafon (un JSON se comprimă mult): cererea rămâne sub 14 MB, departe de 32. */
export const PROIECT_GZ_MAX_OCTETI = PROIECT_MAX_OCTETI;
/** Cât are proiectul comprimat la plafon, în base64 (4 caractere pe 3 octeți). */
export const PROIECT_MAX_BASE64 = Math.ceil(PROIECT_GZ_MAX_OCTETI / 3) * 4;
/** Amprenta JSON-ului (SHA-256, hex): fila Tichete o verifică după descărcare. */
export const RE_SHA256 = /^[0-9a-f]{64}$/;

/** Unde stă în Storage proiectul atașat unui tichet. Jobul de păstrare citește tot ce e sub `PREFIX_FISIERE_TICHETE`. */
export const PREFIX_FISIERE_TICHETE = `${COLECTIE_TICHETE}/`;
export const caleProiectTichet = (id: string): string => `${PREFIX_FISIERE_TICHETE}${id}/proiect.json.gz`;
/** Pură: id-ul tichetului dintr-o cale de proiect; altceva = null (un nume necunoscut nu se atinge). */
export function idDinCaleProiect(cale: string): string | null {
  const m = /^tichete\/([A-Za-z0-9]{20})\/proiect\.json\.gz$/.exec(cale);
  return m?.[1] ?? null;
}

/**
 * Pură: o mărime de fișier pentru om (proiectul, în editor și în fila Tichete): până la 999 kB în kB întregi, rotunjiți în sus
 * (cel puțin 1), apoi MB cu o zecimală, în formatul limbii (fără „1.024 kB”, care în română se citește o mie).
 */
export function marimeCitita(octeti: number, limba: 'ro' | 'en'): string {
  if (octeti <= 999 * 1024) return `${Math.max(1, Math.ceil(octeti / 1024))} kB`;
  return `${new Intl.NumberFormat(limba, { maximumFractionDigits: 1 }).format(Math.round((octeti / (1024 * 1024)) * 10) / 10)} MB`;
}

/** Ce ține tichetul despre proiectul atașat; fișierul e în Storage. */
export interface MetaProiectTichet {
  /** Octeții JSON-ului (cât arată omului și plafonul). */
  readonly marime: number;
  /** Octeții fișierului comprimat din Storage. */
  readonly comprimat: number;
  readonly sha256: string;
  /** Versiunea schemei documentului (`schema`), ca fila să știe ce ușă îl deschide. */
  readonly schema: number;
}

const intreg = (x: unknown, min: number, max: number): x is number => typeof x === 'number' && Number.isSafeInteger(x) && x >= min && x <= max;

/** Pură: meta proiectului, citită dintr-un tichet; o formă greșită = null (nu se inventează). */
export function metaProiectDin(x: unknown): MetaProiectTichet | null {
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return null;
  const o = x as Record<string, unknown>;
  const { marime, comprimat, sha256, schema } = o;
  if (!intreg(marime, 1, PROIECT_MAX_OCTETI) || !intreg(comprimat, 1, PROIECT_GZ_MAX_OCTETI) || !intreg(schema, 1, 1000)) return null;
  if (typeof sha256 !== 'string' || !RE_SHA256.test(sha256)) return null;
  return { marime, comprimat, sha256, schema };
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
  /** Mărimea proiectului atașat (octeții JSON-ului), sau null fără proiect. */
  readonly proiect: number | null;
}

/**
 * Cererile callable-ului `tichete`. La raportare, poza (opțională, base64, ca la sugestii: ADR 0111) și proiectul (opțional,
 * gzip în base64, doar cu bifa). `proiect` dă înapoi proiectul atașat, cui poate citi tichetul.
 */
export type CerereTichet =
  | {
    readonly actiune: 'raporteaza'; readonly fel: FelTichet; readonly text: string; readonly aplicatia: AplicatiaTichet;
    readonly amprente: readonly string[]; readonly poza?: string; readonly proiect?: string;
  }
  | { readonly actiune: 'mele' }
  | { readonly actiune: 'citit'; readonly id: string }
  | { readonly actiune: 'raspunde'; readonly id: string; readonly versiune: number; readonly text: string }
  | { readonly actiune: 'stare'; readonly id: string; readonly versiune: number; readonly stare: StareTichet }
  | { readonly actiune: 'proiect'; readonly id: string };

/** Proiectul atașat unui tichet, cum îl dă callable-ul: fișierul comprimat (base64), cu meta lui din tichet. */
export interface RaspunsProiectTichet {
  readonly ok: true;
  readonly id: string;
  readonly proiect: string;
  readonly meta: MetaProiectTichet;
}

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
