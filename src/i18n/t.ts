import type { enCarcasa } from './carcasa.en.ts';
import type { enExport } from './export.en.ts';
import type { enImport } from './import.en.ts';
import type { enTraseu } from './traseu.en.ts';
import { en } from './mesaje.en.ts';
import { ro } from './mesaje.ro.ts';
import { LIMBI, type Limba, type Mesaj } from './tipuri.ts';

/**
 * Toate mesajele, ca tip: cele de la pornire (`mesaje.*.ts`) și cele care vin cu un modul încărcat la cerere
 * (`import.*.ts` și `export.*.ts` cu dialogurile lor, `carcasa.*.ts` cu paleta și panoul de proprietăți, înregistrate de
 * `import.ts`, `export.ts` și `carcasa.ts`; `traseu.*.ts` cu traseul de pe pânză, prin `traseu.ts`). Doar tipul lor intră
 * aici, nu textul.
 */
type Toate = typeof en & typeof enImport & typeof enExport & typeof enCarcasa & typeof enTraseu;
export type Cheie = keyof Toate;

/** Cheile al căror mesaj e plural: nu se pot cere fără `n`. */
type CheiePlural = { [K in Cheie]: Toate[K] extends string ? never : K }[Cheie];
/** Cheile fără plural: etichete, motive, titluri. */
export type CheieSimpla = Exclude<Cheie, CheiePlural>;
type Parametri = Readonly<Record<string, string | number>>;

const DICTIONARE: Readonly<Record<Limba, Record<string, Mesaj>>> = { ro: { ...ro }, en: { ...en } };

/** Mesajele unui modul încărcat la cerere intră în dicționare odată cu el (o cheie nouă nu le poate acoperi pe cele vechi). */
export function adaugaMesaje(m: Readonly<Record<Limba, Readonly<Record<string, Mesaj>>>>): void {
  for (const l of LIMBI) {
    for (const [k, v] of Object.entries(m[l])) {
      if (k in DICTIONARE[l] && DICTIONARE[l][k] !== v) throw new Error(`mesajul ${k} există deja`);
      DICTIONARE[l][k] = v;
    }
  }
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

export function schimbaLimba(noua: Limba): void {
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
