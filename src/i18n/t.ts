import { en } from './mesaje.en.ts';
import { ro } from './mesaje.ro.ts';
import { LIMBI, type Limba, type Mesaj } from './tipuri.ts';

export type Cheie = keyof typeof en;

/** Cheile al căror mesaj e plural: nu se pot cere fără `n`. */
type CheiePlural = { [K in Cheie]: (typeof en)[K] extends string ? never : K }[Cheie];
/** Cheile fără plural: etichete, motive, titluri. */
export type CheieSimpla = Exclude<Cheie, CheiePlural>;
type Parametri = Readonly<Record<string, string | number>>;

const DICTIONARE: Readonly<Record<Limba, Readonly<Record<Cheie, Mesaj>>>> = { ro, en };

/** Pură: textul lui `cheie` în `limba`, cu forma de plural aleasă după `n` și cu fiecare `{loc}` completat. */
export function traduce(limba: Limba, cheie: Cheie, param: Parametri = {}): string {
  const mesaj = DICTIONARE[limba][cheie];
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
