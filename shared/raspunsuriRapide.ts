/**
 * Răspunsurile rapide ale tichetelor (ADR 0261, felia A.3 a adminului): texte scrise de owner în fila Setări, puse în câmpul
 * de răspuns al unui tichet la un clic, în limba raportării. Stau în `setari/raspunsuriRapide`. Le scrie doar owner-ul, prin
 * acțiunea `raspunsuriRapide` a callable-ului `tichete`, pe versiunea văzută, cu auditul în tranzacție; le citesc owner-ul
 * și cei cu `tichete.raspunde` (regula). Comune adminului și serverului: editorul nu le aduce (contractul tichetelor, da).
 */
import { curataTextTichet, RASPUNS_MAX } from './tichete.ts';

export const CALE_RASPUNSURI_RAPIDE = { colectie: 'setari', id: 'raspunsuriRapide' } as const;
/** Câte răspunsuri rapide, cel mult (ADR 0261 §1). */
export const RAPIDE_MAX = 12;
/** Eticheta de pe buton, cel mult atâtea litere. */
export const ETICHETA_RAPID_MAX = 40;
/** Textul unui răspuns rapid, cel mult cât un răspuns. */
export const TEXT_RAPID_MAX = RASPUNS_MAX;

export interface RaspunsRapid {
  readonly eticheta: string;
  /** Textul în română (cerut). */
  readonly ro: string;
  /** Textul în engleză; '' = lipsă (se pune cel în română). */
  readonly en: string;
}

/** Ce s-a citit din document: lista și versiunea (0 = niciun document încă). */
export interface RapideCitite {
  readonly lista: readonly RaspunsRapid[];
  readonly versiune: number;
}

export interface CerereRaspunsuriRapide {
  readonly actiune: 'raspunsuriRapide';
  readonly lista: readonly RaspunsRapid[];
  /** Versiunea văzută a listei: 0 dacă nu era niciun document. */
  readonly versiune: number;
}

export interface RaspunsRaspunsuriRapide {
  readonly ok: true;
  readonly schimbat: boolean;
  readonly versiune: number;
}

/** Versiunea văzută: un întreg de la 0 (niciun document încă). */
export const esteVersiuneVazuta = (x: unknown): x is number => typeof x === 'number' && Number.isSafeInteger(x) && x >= 0;

/** Pură: eticheta: un rând, spațiile strânse, 1…40 de litere, fără caractere de control; null altfel. */
export function curataEticheta(x: unknown): string | null {
  if (typeof x !== 'string') return null;
  const s = x.replace(/\s+/g, ' ').trim();
  return s === '' || [...s].length > ETICHETA_RAPID_MAX || /[\u0000-\u001f\u007f]/.test(s) ? null : s;
}

/** Două etichete sunt „aceeași” fără diacritice și fără majuscule: pe buton s-ar confunda. */
const cheieEticheta = (s: string): string => s.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('ro');

export type ProblemaRapid = 'eticheta-lipsa' | 'eticheta-invalida' | 'eticheta-dubla' | 'ro-lipsa' | 'ro-invalid' | 'en-invalid';

const sir = (x: unknown): string => (typeof x === 'string' ? x : '');

/**
 * Pură: problemele fiecărui rând (aceleași reguli în editor și pe server, ADR 0261 §1): eticheta lipsă, prea lungă (sau pe
 * mai multe rânduri, cu caractere de control) ori la fel cu a unui rând de mai sus; textul în română lipsă sau greșit; cel în
 * engleză, dacă e scris, greșit.
 */
export function problemeRapide(lista: readonly { readonly eticheta?: unknown; readonly ro?: unknown; readonly en?: unknown }[]): ProblemaRapid[][] {
  const vazute = new Set<string>();
  return lista.map((r) => {
    const p: ProblemaRapid[] = [];
    const e = curataEticheta(r.eticheta);
    if (sir(r.eticheta).trim() === '') p.push('eticheta-lipsa');
    else if (e === null) p.push('eticheta-invalida');
    else if (vazute.has(cheieEticheta(e))) p.push('eticheta-dubla');
    else vazute.add(cheieEticheta(e));
    if (sir(r.ro).trim() === '') p.push('ro-lipsa');
    else if (curataTextTichet(r.ro, TEXT_RAPID_MAX) === null) p.push('ro-invalid');
    if (sir(r.en).trim() !== '' && curataTextTichet(r.en, TEXT_RAPID_MAX) === null) p.push('en-invalid');
    return p;
  });
}

const obiect = (x: unknown): Record<string, unknown> | null => (typeof x === 'object' && x !== null && !Array.isArray(x) ? x as Record<string, unknown> : null);

/** Pură: un rând, curățat (eticheta strânsă, textele cu rândurile lor, engleza goală = ''); null dacă nu e bun. */
function rapidCuratat(r: Record<string, unknown>): RaspunsRapid | null {
  const eticheta = curataEticheta(r['eticheta']);
  const ro = curataTextTichet(r['ro'], TEXT_RAPID_MAX);
  const en = sir(r['en']).trim() === '' ? '' : curataTextTichet(r['en'], TEXT_RAPID_MAX);
  return eticheta === null || ro === null || en === null ? null : { eticheta, ro, en };
}

/**
 * Pură: lista cerută (server și butonul „Salvează”): cel mult 12 rânduri, fiecare bun și cu eticheta lui; curățată. Null dacă
 * nu e o listă, are prea multe rânduri sau unul are o problemă.
 */
export function listaRapideCeruta(x: unknown): RaspunsRapid[] | null {
  if (!Array.isArray(x) || x.length > RAPIDE_MAX) return null;
  const randuri = x.map(obiect);
  if (randuri.some((r) => r === null)) return null;
  const obiecte = randuri as Record<string, unknown>[];
  if (problemeRapide(obiecte).some((p) => p.length > 0)) return null;
  const curate = obiecte.map(rapidCuratat);
  return curate.every((r): r is RaspunsRapid => r !== null) ? curate : null;
}

/**
 * Pură: documentul citit (sau lipsă): lista, fără rândurile stricate (o stricăciune nu ascunde restul), și versiunea (0 = fără
 * document sau fără versiune bună: următoarea salvare o pune la loc).
 */
export function rapideDin(x: unknown): RapideCitite {
  const d = obiect(x) ?? {};
  const lista = Array.isArray(d['lista']) ? d['lista'] : [];
  const versiune = d['versiune'];
  return {
    lista: lista.map(obiect).flatMap((r) => (r === null ? [] : [rapidCuratat(r)].filter((y): y is RaspunsRapid => y !== null))),
    versiune: typeof versiune === 'number' && Number.isSafeInteger(versiune) && versiune >= 1 ? versiune : 0,
  };
}

/** Pură: aceeași listă, în aceeași ordine (o salvare care nu schimbă nimic nu scrie, ADR 0261 §3). */
export function aceleasiRapide(a: readonly RaspunsRapid[], b: readonly RaspunsRapid[]): boolean {
  return a.length === b.length && a.every((x, k) => x.eticheta === b[k]?.eticheta && x.ro === b[k]?.ro && x.en === b[k]?.en);
}

/** Pură: textul pus în câmp pentru o raportare: în engleză dacă raportarea e în engleză și owner-ul l-a scris; altfel în română. */
export function textRapid(r: RaspunsRapid, limba: string | null): string {
  return limba === 'en' && r.en !== '' ? r.en : r.ro;
}
