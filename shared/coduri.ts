/**
 * Dicționarul codurilor controlerului (ADR 0085): forma fișierelor pe care build-ul le scrie în `dist/coduri/` (generatorul:
 * `scripts/coduri.ts`, din tabelele `src/machine/coduri/`) și pe care panoul mașinii le cere la primul cod. Ca manualul, intră
 * în precache (`shared/precache.ts`): explicația unui `ALARM:N` trebuie să vină și fără rețea, în atelier.
 *
 * Un cod (`error:N`, `ALARM:N`) are sens doar în tabelul familiei controlerului: `ALARM:10` e al doilea limitator al unei axe
 * duble la GRBL 1.1, oprirea de urgență la grblHAL și axul la FluidNC. Fiecare familie are tabelul ei, iar un text e comun mai
 * multor familii doar unde înțelesul e același. Un cod care nu e în tabel nu primește o explicație plauzibilă: panoul arată
 * linia controlerului și spune că n-o cunoaște.
 */

export type LimbaCoduri = 'ro' | 'en';
export const LIMBI_CODURI: readonly LimbaCoduri[] = ['ro', 'en'];

/** Rădăcina fișierelor generate, în `dist/` și pe hosting. */
export const DIR_CODURI = 'coduri';
/** Fișierul dicționarului într-o limbă (calea din `dist/`, fără `/` în față). */
export const fisierCoduri = (limba: LimbaCoduri): string => `${DIR_CODURI}/${limba}.json`;

/** Familiile, cu id-urile contractelor postului (`src/post/contracte/`, ADR 0083). */
export type FamilieCoduri = 'grbl-11' | 'grblhal' | 'fluidnc';
export const FAMILII_CODURI: readonly FamilieCoduri[] = ['grbl-11', 'grblhal', 'fluidnc'];

export type FelCod = 'eroare' | 'alarma';

/**
 * Butoanele panoului care ajută, în ordinea încercării: `repornire` (Oprește, Ctrl-X), `deblocare` ($X), `eliberare` (`~`,
 * după ușă), `jog` (focusul pe Z+) și `palpare` (focusul pe Palpează Z). Restul remediilor sunt cuvinte: ce face omul.
 */
export type ActiuneCod = 'repornire' | 'deblocare' | 'eliberare' | 'jog' | 'palpare';
export const ACTIUNI_COD: readonly ActiuneCod[] = ['repornire', 'deblocare', 'eliberare', 'jog', 'palpare'];

export interface TextCod {
  /** Scurt, pentru lista erorilor și jurnal. */
  readonly titlu: string;
  /** Ce s-a întâmplat. */
  readonly ce: string;
  /** Ce face omul, cu numele butoanelor panoului. */
  readonly faci: string;
}

export interface IntrareCod {
  /** Cheia textului în `texte` (comună familiilor cu același înțeles). */
  readonly text: string;
  /**
   * `oprit`: controlerul refuză și liniile următoare până când omul face ceva (toate alarmele; erorile care spun că e blocat);
   * `linie`: doar linia asta a fost refuzată, controlerul primește următoarea.
   */
  readonly gravitate: 'oprit' | 'linie';
  /** Poziția mașinii nu mai e sigură: deblocarea cere o confirmare care spune ce se poate strica. */
  readonly pozitiePierduta?: true;
  readonly actiuni?: readonly ActiuneCod[];
}

export interface TabelFamilie {
  /** Numele arătat lângă explicație („după tabelul GRBL 1.1”). */
  readonly nume: string;
  readonly erori: Readonly<Record<string, IntrareCod>>;
  readonly alarme: Readonly<Record<string, IntrareCod>>;
}

export interface DictionarCoduri {
  readonly schema: 1;
  readonly limba: LimbaCoduri;
  readonly texte: Readonly<Record<string, TextCod>>;
  readonly familii: Readonly<Record<FamilieCoduri, TabelFamilie>>;
  /** Starea Alarm fără cod: pornirea cu homing activat sau repornirea după o alarmă (`'$H'|'$X' to unlock`). */
  readonly blocare: IntrareCod;
}

const sir = (x: unknown): x is string => typeof x === 'string' && x !== '';
const obiect = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

function esteText(x: unknown): x is TextCod {
  return obiect(x) && sir(x.titlu) && sir(x.ce) && sir(x.faci);
}

function esteIntrare(x: unknown, texte: Record<string, unknown>): x is IntrareCod {
  if (!obiect(x) || !sir(x.text) || !Object.hasOwn(texte, x.text) || (x.gravitate !== 'oprit' && x.gravitate !== 'linie')) return false;
  if (x.pozitiePierduta !== undefined && x.pozitiePierduta !== true) return false;
  return x.actiuni === undefined || (Array.isArray(x.actiuni) && x.actiuni.every((a) => (ACTIUNI_COD as readonly unknown[]).includes(a)));
}

function esteTabel(x: unknown, texte: Record<string, unknown>): x is TabelFamilie {
  if (!obiect(x) || !sir(x.nume) || !obiect(x.erori) || !obiect(x.alarme)) return false;
  return [x.erori, x.alarme].every((t) => Object.entries(t).every(([n, i]) => /^[1-9]\d*$/.test(n) && esteIntrare(i, texte)));
}

/** Verificarea formei, la citirea din rețea (un fișier vechi, trunchiat sau al altei versiuni nu trece). */
export function esteDictionarCoduri(x: unknown): x is DictionarCoduri {
  if (!obiect(x) || x.schema !== 1 || !(x.limba === 'ro' || x.limba === 'en') || !obiect(x.texte) || !obiect(x.familii)) return false;
  const texte = x.texte;
  if (!Object.values(texte).every(esteText)) return false;
  const familii = x.familii;
  return FAMILII_CODURI.every((f) => esteTabel(familii[f], texte)) && esteIntrare(x.blocare, texte);
}

export type Explicatie = {
  /** Tabelul folosit. */
  readonly familie: FamilieCoduri;
  /** Controlerul nu s-a prezentat (niciun banner, niciun `$I`): tabelul e al GRBL 1.1, presupus. */
  readonly presupus: boolean;
  /** null: codul nu e în tabelul familiei. */
  readonly intrare: IntrareCod | null;
  readonly text: TextCod | null;
};

/** Explicația unui cod, din tabelul familiei controlerului (GRBL 1.1 când nu se știe). */
export function explicaCod(d: DictionarCoduri, familie: FamilieCoduri | null, fel: FelCod, cod: number): Explicatie {
  const f = familie ?? 'grbl-11';
  const tabel = d.familii[f];
  const t = fel === 'eroare' ? tabel.erori : tabel.alarme;
  const intrare = Object.hasOwn(t, String(cod)) ? (t[String(cod)] ?? null) : null;
  return { familie: f, presupus: familie === null, intrare, text: intrare ? (d.texte[intrare.text] ?? null) : null };
}
