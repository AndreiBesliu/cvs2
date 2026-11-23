/**
 * Dicționarul codurilor imprimantelor (felia 3.6v, ADR 0195): forma fișierelor `coduri/<familie>.<limba>.json`, scrise de
 * build (generatorul: `scripts/coduriImprimanta.ts`, din tabelele `src/machine/imprimanta/coduri/`) lângă dicționarul
 * controlerelor (ADR 0085) și puse în precache, ca acela. Fereastra Imprimanta cere fișierul familiei driverului la prima
 * eroare; până atunci nu costă nimic.
 *
 * O eroare are sens doar în tabelul familiei imprimantei. Se caută ca în Creality Print: întâi după cheie (`err.key` la K1,
 * numărul de pe ecranul imprimantei), apoi după cod (`errcode`). Un număr care nu e în tabel nu primește o explicație
 * plauzibilă: fereastra spune că nu-l cunoaște și dă lista codurilor din wiki-ul producătorului. Linkurile duc doar spre
 * wiki-ul Creality (verificat și la citire: un fișier stricat nu poate pune alt link în fereastră).
 */
import { DIR_CODURI, type LimbaCoduri } from './coduri.ts';

/** Familiile, cu id-urile driverelor (`src/machine/imprimanta/drivere.ts`). */
export type FamilieImprimanta = 'creality-k1';
export const FAMILII_IMPRIMANTA: readonly FamilieImprimanta[] = ['creality-k1'];

/** Fișierul dicționarului unei familii, într-o limbă (calea din `dist/`, fără `/` în față). */
export const fisierCoduriImprimanta = (familie: FamilieImprimanta, limba: LimbaCoduri): string => `${DIR_CODURI}/${familie}.${limba}.json`;

/** Linkurile dicționarului duc doar aici, într-o filă nouă. */
export const WIKI_CREALITY = 'https://wiki.creality.com/';

export interface TextCodImprimanta {
  /** Ce s-a întâmplat, scurt (cardul, banda, notificarea). */
  readonly titlu: string;
  /** Ce face omul. */
  readonly faci: string;
}

export interface IntrareCodImprimanta extends TextCodImprimanta {
  /** Codul arătat de producător („CX2585”), altfel numărul. */
  readonly cod: string;
  /** Imprimanta s-a oprit sau nu poate imprima până nu se repară ceva; altfel, un avertisment, o pauză sau o stare. */
  readonly grava: boolean;
  /** Pagina codului în wiki-ul producătorului, unde există. */
  readonly wiki?: string;
}

export interface DictionarImprimanta {
  readonly schema: 1;
  readonly familie: FamilieImprimanta;
  readonly limba: LimbaCoduri;
  /** Numele familiei („Creality K1”). */
  readonly nume: string;
  /** Lista codurilor familiei în wiki, pentru un număr care nu e aici. */
  readonly lista: string;
  /** După cheie (numărul, ca text). */
  readonly erori: Readonly<Record<string, IntrareCodImprimanta>>;
}

const sir = (x: unknown): x is string => typeof x === 'string' && x !== '';
const obiect = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
/** Un link spre wiki-ul Creality, fără spații și ghilimele, de lungime rezonabilă. */
const linkWiki = (x: unknown): x is string => typeof x === 'string' && x.startsWith(WIKI_CREALITY) && x.length <= 300 && !/[\s"'<>\\]/.test(x);

function esteIntrare(x: unknown): x is IntrareCodImprimanta {
  return obiect(x) && sir(x.cod) && /^[A-Z]{0,2}\d{1,5}$/.test(x.cod) && typeof x.grava === 'boolean' && sir(x.titlu) && sir(x.faci)
    && (x.wiki === undefined || linkWiki(x.wiki));
}

/** Verificarea formei, la citirea din rețea (un fișier vechi, trunchiat, al altei familii sau limbi nu trece). */
export function esteDictionarImprimanta(x: unknown, familie: FamilieImprimanta, limba: LimbaCoduri): x is DictionarImprimanta {
  if (!obiect(x) || x.schema !== 1 || x.familie !== familie || x.limba !== limba || !sir(x.nume) || !linkWiki(x.lista) || !obiect(x.erori)) return false;
  return Object.entries(x.erori).every(([k, i]) => /^[1-9]\d{0,5}$/.test(k) && esteIntrare(i));
}

export type ExplicatieImprimanta = {
  /** Numărul căutat: cheia, altfel codul (`errcode`); cel găsit, dacă unul din ele e în dicționar. */
  readonly numar: number;
  /** null: numărul nu e în dicționar. */
  readonly intrare: IntrareCodImprimanta | null;
};

/** Explicația unei erori: întâi după cheie, apoi după cod; null fără eroare (amândouă lipsă sau 0). */
export function explicaEroare(d: DictionarImprimanta, eroare: number | null, cheie: number | null): ExplicatieImprimanta | null {
  const numere = [cheie, eroare].filter((n): n is number => n !== null && n !== 0);
  for (const n of numere) {
    const i = Object.hasOwn(d.erori, String(n)) ? d.erori[String(n)] : undefined;
    if (i !== undefined) return { numar: n, intrare: i };
  }
  const primul = numere[0];
  return primul === undefined ? null : { numar: primul, intrare: null };
}
