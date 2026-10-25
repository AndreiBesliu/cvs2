import type { enAdmin } from './admin.en.ts';
import type { enCarcasa } from './carcasa.en.ts';
import type { enExport } from './export.en.ts';
import type { enImport } from './import.en.ts';
import type { enSimulare } from './simulare.en.ts';
import type { enTutorial } from './tutorial.en.ts';
import type { enTraseu } from './traseu.en.ts';
import type { enEditare } from './editare.en.ts';
import type { en } from './mesaje.en.ts';
import { LIMBI, type Limba, type Mesaj } from './tipuri.ts';

/**
 * Toate mesajele, ca tip: cele de bază (`mesaje.*.ts`, dicționarul limbii active, adus înaintea primei randări) și cele
 * care vin cu un modul încărcat la cerere (`import.*.ts` și `export.*.ts` cu dialogurile lor, `carcasa.*.ts` cu paleta și
 * panoul de proprietăți, înregistrate de `import.ts`, `export.ts` și `carcasa.ts`; `traseu.*.ts` cu traseul de pe pânză,
 * prin `traseu.ts`; `simulare.*.ts` cu simularea din dialogul exportului, prin `simulare.ts`; `admin.*.ts` cu pagina
 * `/admin`, prin `admin.ts`). Doar tipul lor intră aici, nu textul.
 */
type Toate = typeof en & typeof enImport & typeof enExport & typeof enCarcasa & typeof enTraseu & typeof enSimulare & typeof enAdmin
  & typeof enEditare & typeof enTutorial;
export type Cheie = keyof Toate;

/** Cheile al căror mesaj e plural: nu se pot cere fără `n`. */
type CheiePlural = { [K in Cheie]: Toate[K] extends string ? never : K }[Cheie];
/** Cheile fără plural: etichete, motive, titluri. */
export type CheieSimpla = Exclude<Cheie, CheiePlural>;
type Parametri = Readonly<Record<string, string | number>>;

const DICTIONARE: Readonly<Record<Limba, Record<string, Mesaj>>> = { ro: {}, en: {} };

/** Mesajele intră în dicționarul unei limbi; o cheie nouă nu le poate acoperi pe cele vechi. */
function adaugaInLimba(l: Limba, m: Readonly<Record<string, Mesaj>>): void {
  for (const [k, v] of Object.entries(m)) {
    if (k in DICTIONARE[l] && DICTIONARE[l][k] !== v) throw new Error(`mesajul ${k} există deja`);
    DICTIONARE[l][k] = v;
  }
}

/** Mesajele unui modul încărcat la cerere intră în dicționare odată cu el (o cheie nouă nu le poate acoperi pe cele vechi). */
export function adaugaMesaje(m: Readonly<Record<Limba, Readonly<Record<string, Mesaj>>>>): void {
  for (const l of LIMBI) adaugaInLimba(l, m[l]);
}

/**
 * Dicționarele de bază (`mesaje.*.ts`) vin la cerere (loc în pachetul de pornire, 17.10): pornirea aduce doar limba
 * activă, înaintea primei randări (`main.tsx`), iar aplicația pe cealaltă, în fundal. `t()` aruncă pe un mesaj neîncărcat,
 * deci o limbă se alege doar după ce i-a venit dicționarul (`schimbaLimba`).
 */
const DE_BAZA: Readonly<Record<Limba, () => Promise<Readonly<Record<string, Mesaj>>>>> = {
  ro: () => import('./mesaje.ro.ts').then((m) => m.ro),
  en: () => import('./mesaje.en.ts').then((m) => m.en),
};
const cereri = new Map<Limba, Promise<void>>();
const incarcate = new Set<Limba>();

/**
 * Dicționarul de bază al limbii `l`, adus o singură dată (aceeași promisiune la fiecare cerere). Un eșec (rețeaua, o
 * publicare nouă) nu rămâne ținut minte: cererea următoare îl cere din nou (Edge ține însă eșecul unui `import()` până la
 * reîncărcare). `aduce` e doar pentru probe.
 */
export function incarcaLimba(l: Limba, aduce: () => Promise<Readonly<Record<string, Mesaj>>> = DE_BAZA[l]): Promise<void> {
  const veche = cereri.get(l);
  if (veche) return veche;
  const noua = aduce().then((d) => {
    adaugaInLimba(l, d);
    incarcate.add(l);
  });
  cereri.set(l, noua);
  noua.catch(() => { if (cereri.get(l) === noua) cereri.delete(l); });
  return noua;
}

/** Dicționarul de bază al limbii a venit: limba se poate alege. */
export function limbaIncarcata(l: Limba): boolean {
  return incarcate.has(l);
}

/** Pură: textul lui `cheie` în `limba`, cu forma de plural aleasă după `n` și cu fiecare `{loc}` completat. */
export function traduce(limba: Limba, cheie: Cheie, param: Parametri = {}): string {
  const mesaj = DICTIONARE[limba][cheie];
  if (mesaj === undefined) throw new Error(`t('${cheie}'): mesajul nu e încărcat (modulul lui vine la cerere)`);
  let text: string;
  if (typeof mesaj === 'string') {
    text = mesaj;
  } else {
    const n = param['n'];
    if (typeof n !== 'number') throw new Error(`t('${cheie}'): mesajul e plural și cere parametrul n`);
    const forma = new Intl.PluralRules(limba).select(n);
    text = forma === 'one' ? mesaj.one : forma === 'few' && mesaj.few !== undefined ? mesaj.few : mesaj.other;
  }
  return text.replace(/\{(\w+)\}/g, (slot: string, nume: string) => {
    const v = param[nume];
    return v === undefined ? slot : String(v);
  });
}

/* ── Limba curentă: o singură valoare, citită de `t()` și de hook-ul React din `src/ui/`. ───────────────────── */

let limbaCurenta: Limba = 'ro';
const ascultatori = new Set<() => void>();

export function limba(): Limba {
  return limbaCurenta;
}

/** Limba nouă, cu dicționarul ei deja venit (`incarcaLimba`): altfel primul `t()` ar arunca, adică ecranul de eroare. */
export function schimbaLimba(noua: Limba): void {
  if (!incarcate.has(noua)) throw new Error(`schimbaLimba('${noua}'): dicționarul limbii nu e încărcat (incarcaLimba întâi)`);
  if (noua === limbaCurenta) return;
  limbaCurenta = noua;
  for (const a of ascultatori) a();
}

export function ascultaLimba(a: () => void): () => void {
  ascultatori.add(a);
  return () => { ascultatori.delete(a); };
}

/** Limba de pornire: câștigă alegerea salvată, apoi limba browserului, apoi româna. */
export function limbaDePornire(salvata: string | null, browser: readonly string[]): Limba {
  if (salvata !== null && (LIMBI as readonly string[]).includes(salvata)) return salvata as Limba;
  for (const b of browser) {
    const prefix = b.toLowerCase().slice(0, 2);
    if (prefix === 'ro') return 'ro';
    if (prefix === 'en') return 'en';
  }
  return 'ro';
}

export function t(cheie: CheieSimpla, param?: Parametri): string;
export function t(cheie: CheiePlural, param: Parametri & { readonly n: number }): string;
export function t(cheie: Cheie, param?: Parametri): string {
  return traduce(limbaCurenta, cheie, param);
}
