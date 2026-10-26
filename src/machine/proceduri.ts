/**
 * Procedurile mașinii (ADR 0082, T20): jog, zero, alegerea WCS-ului și palparea Z cu placa de contact, ca funcții și mașini de
 * stare pure. O procedură cere comenzi una câte una, pe canalul comenzilor manuale al fluxului (ADR 0080, regula 7), și
 * înaintează pe răspunsul fiecăreia; nimic aici nu scrie la port și nu ține timpul.
 *
 * Lecțiile ediției întâi: zero-ul în Alarm dădea `error:9` tăcut (acum se refuză înainte, cu motiv: `motivMiscare`); zero-ul
 * se scria în alt WCS decât cel al programului (acum se scrie explicit, `G10 L20 P…`, în WCS-ul ales); jog-ul pe diagonală e un
 * singur `$J=` pe ambele axe, o dreaptă, nu o scară.
 */
import type { Faza } from './flux.ts';
import { LUNGIME_MAXIMA_LINIE } from './program.ts';

export const WCS = ['G54', 'G55', 'G56', 'G57', 'G58', 'G59'] as const;
export type Wcs = (typeof WCS)[number];
export type AxaJog = 'X' | 'Y' | 'Z';

const f3 = (v: number): string => (Math.abs(v) < 0.0005 ? 0 : v).toFixed(3);

/** `P1`…`P6` al unui WCS, pentru `G10`. */
export const indiceWcs = (w: Wcs): number => WCS.indexOf(w) + 1;
export const esteWcs = (x: string): x is Wcs => (WCS as readonly string[]).includes(x);

/** Starea modală care contează aici, dintr-un răspuns `$G` (`[GC:G0 G54 G17 G21 G90 …]`), sau null. */
export type Modal = { readonly miscare: string; readonly wcs: Wcs; readonly unitati: 'G20' | 'G21'; readonly distanta: 'G90' | 'G91' };
export function modalDinGc(date: readonly string[]): Modal | null {
  for (const d of date) {
    const m = /^\[GC:(.*)\]$/.exec(d);
    if (!m) continue;
    const c = (m[1] ?? '').split(' ');
    const wcs = c.find(esteWcs);
    const unitati = c.find((x): x is Modal['unitati'] => x === 'G20' || x === 'G21');
    const distanta = c.find((x): x is Modal['distanta'] => x === 'G90' || x === 'G91');
    const miscare = c[0];
    if (wcs && unitati && distanta && miscare && /^G/.test(miscare)) return { miscare, wcs, unitati, distanta };
  }
  return null;
}

/**
 * Jog-ul (`$J=G91 G21 X… Y… F…`): o singură linie pentru toate axele cerute (diagonala e o dreaptă), incremental, în mm, fără
 * să schimbe starea modală a controlerului. Null: nimic de mișcat, un număr nefinit, un avans nepozitiv, o linie prea lungă.
 */
export function comandaJog(deplasare: Partial<Record<AxaJog, number>>, avans: number): string | null {
  const axe = (['X', 'Y', 'Z'] as const).filter((a) => deplasare[a] !== undefined && deplasare[a] !== 0);
  if (axe.length === 0 || !(avans > 0) || !Number.isFinite(avans) || axe.some((a) => !Number.isFinite(deplasare[a]))) return null;
  const text = `$J=G91 G21 ${axe.map((a) => `${a}${f3(deplasare[a] ?? 0)}`).join(' ')} F${Math.round(avans)}`;
  return text.length <= LUNGIME_MAXIMA_LINIE ? text : null;
}

/** Zero-ul pe axele cerute, scris explicit în WCS-ul dat: poziția de acum devine 0 acolo. */
export function comandaZero(wcs: Wcs, axe: readonly AxaJog[]): string {
  return `G10 L20 P${indiceWcs(wcs)} ${axe.map((a) => `${a}0`).join(' ')}`;
}

export type FelMiscare = 'jog' | 'zero-xy' | 'zero-z' | 'palpare' | 'wcs';
export type MotivMiscare = 'neconectat' | 'procedura' | 'lucrare' | 'fara-raport' | 'alarma' | 'ocupata';
const IN_LUCRARE: ReadonlySet<Faza> = new Set(['trimite', 'golire', 'terminare', 'suspendat']);

/**
 * De ce nu se poate face acum o mișcare sau o scriere a sistemului de coordonate, sau null. În lucru, nimic; oprit la o
 * barieră (schimbarea sculei), jog-ul, palparea și zero-ul Z da, dar nu zero-ul XY și nici alt WCS (restul programului s-ar
 * muta). În alarmă, întâi `$X`. G-code-ul (zero, palpare, WCS) cere Idle: în Jog, GRBL 1.1 îl refuză (`error:9`).
 */
export function motivMiscare(
  o: { readonly conectat: boolean; readonly procedura: boolean; readonly faza: Faza; readonly stare: string | null }, fel: FelMiscare,
): MotivMiscare | null {
  if (!o.conectat) return 'neconectat';
  if (o.procedura) return 'procedura';
  if (IN_LUCRARE.has(o.faza) || (o.faza === 'bariera' && (fel === 'zero-xy' || fel === 'wcs'))) return 'lucrare';
  if (o.stare === null) return 'fara-raport';
  if (o.stare === 'Alarm') return 'alarma';
  if (o.stare === 'Idle' || (o.stare === 'Jog' && fel === 'jog')) return null;
  return 'ocupata';
}

// ——— Palparea Z ———

export type ParametriPalpare = {
  readonly wcs: Wcs;
  /** Grosimea plăcii de contact (mm): Z0 = punctul atins minus ea. */
  readonly grosime: number;
  /** Cât coboară cel mult în căutare (mm). */
  readonly distanta: number;
  /** Avansul căutării și al atingerii fine (mm/min). */
  readonly avans: number;
  readonly avansFin: number;
  /** Cât se ridică între cele două atingeri și la sfârșit (mm), și cu ce avans. */
  readonly retragere: number;
  readonly ridicare: number;
  readonly avansRetragere: number;
};
export const PALPARE_IMPLICITA = { grosime: 20, distanta: 30, avans: 100, avansFin: 25, retragere: 2, ridicare: 5, avansRetragere: 500 } as const;

export type PasPalpare = 'modal' | 'offset' | 'cauta' | 'retrage' | 'fin' | 'seteaza' | 'ridica' | 'gata' | 'esuat';
export type MotivPalpare = 'parametri' | 'deja-atinge' | 'fara-contact' | 'eroare' | 'intrerupt' | 'citire';
export type StarePalpare = {
  readonly pas: PasPalpare;
  readonly p: ParametriPalpare;
  /** Starea modală de dinainte (din `$G`): palparea o schimbă (`G91 G21 G38.2`), sesiunea o pune la loc după. */
  readonly modal: Modal | null;
  /** `G92` + `TLO` pe Z (din `$#`): intră în decalajul scris, ca Z0 să fie exact pe material. */
  readonly decalajZ: number | null;
  /** Z-ul mașinii la atingere (cea fină, la sfârșit) și decalajul Z scris în WCS. */
  readonly zAtingere: number | null;
  readonly zScris: number | null;
  readonly motiv: MotivPalpare | null;
  /** Codul erorii sau al alarmei, când motivul îl are. */
  readonly cod: number | null;
};
export type RaspunsProcedura =
  | { readonly tip: 'raspuns'; readonly date: readonly string[]; readonly rezultat: 'ok' | 'pierdut' | number }
  | { readonly tip: 'alarma'; readonly cod: number };
type Pas = { readonly stare: StarePalpare; readonly comanda: string | null };

/** Z-ul atins dintr-un `[PRB:x,y,z:1]` (Z e a treia valoare), sau null fără contact. */
export function zDinPrb(date: readonly string[]): number | null {
  for (const d of date) {
    const m = /^\[PRB:([^:\]]+):1\]$/.exec(d);
    const z = m ? Number((m[1] ?? '').split(',')[2]) : Number.NaN;
    if (Number.isFinite(z)) return z;
  }
  return null;
}

/** `G92` Z + `TLO`, din răspunsul la `$#`, sau null. */
export function decalajZDinParametri(date: readonly string[]): number | null {
  let g92: number | null = null, tlo: number | null = null;
  for (const d of date) {
    const g = /^\[G92:([^\]]+)\]$/.exec(d);
    if (g) g92 = Number((g[1] ?? '').split(',')[2]);
    const t = /^\[TLO:([^\]]+)\]$/.exec(d);
    if (t) tlo = Number(t[1]);
  }
  return g92 !== null && tlo !== null && Number.isFinite(g92) && Number.isFinite(tlo) ? g92 + tlo : null;
}

/**
 * Linia care pune starea modală la loc după palpare: mișcarea (G0, G1 sau G80; altfel G0: un G2 / G38.2 fără axe ar fi o
 * eroare), unitățile și modul distanțelor. Null: palparea n-a schimbat încă nimic (căutarea pleacă odată cu decalajul citit).
 */
export function restaurarePalpare(s: StarePalpare): string | null {
  if (!s.modal || s.decalajZ === null) return null;
  const m = ['G0', 'G1', 'G80'].includes(s.modal.miscare) ? s.modal.miscare : 'G0';
  return `${m} ${s.modal.unitati} ${s.modal.distanta}`;
}

const bun = (v: number, max: number): boolean => Number.isFinite(v) && v > 0 && v <= max;

/** Prima comandă a palpării (citirea stării modale), sau eșecul pe parametri. */
export function pornestePalpare(p: ParametriPalpare): Pas {
  const s: StarePalpare = { pas: 'modal', p, modal: null, decalajZ: null, zAtingere: null, zScris: null, motiv: null, cod: null };
  if (!bun(p.grosime, 100) || !bun(p.distanta, 300) || !bun(p.avans, 2000) || !bun(p.avansFin, 2000) || !bun(p.retragere, 50)
    || !bun(p.ridicare, 200) || !bun(p.avansRetragere, 10000)) {
    return { stare: { ...s, pas: 'esuat', motiv: 'parametri' }, comanda: null };
  }
  return { stare: s, comanda: '$G' };
}

/**
 * Pasul următor al palpării, pe răspunsul comenzii de acum (sau pe o alarmă): `$G`, `$#`, căutarea (`G91 G21 G38.2`), retragerea
 * (jog), atingerea fină, decalajul (`G10 L2`, din punctul atins: depășirea frânării nu intră), ridicarea (jog), gata.
 */
export function pasPalpare(s: StarePalpare, e: RaspunsProcedura): Pas {
  if (s.pas === 'gata' || s.pas === 'esuat') return { stare: s, comanda: null };
  const esuat = (motiv: MotivPalpare, cod: number | null = null): Pas => ({ stare: { ...s, pas: 'esuat', motiv, cod }, comanda: null });
  if (e.tip === 'alarma') return esuat(e.cod === 4 ? 'deja-atinge' : e.cod === 5 ? 'fara-contact' : 'intrerupt', e.cod);
  if (e.rezultat === 'pierdut') return esuat('intrerupt');
  if (typeof e.rezultat === 'number') return esuat('eroare', e.rezultat);
  const p = s.p;
  const jog = (dz: number): string => `$J=G91 G21 Z${f3(dz)} F${Math.round(p.avansRetragere)}`;
  switch (s.pas) {
    case 'modal': {
      const modal = modalDinGc(e.date);
      if (!modal) return esuat('citire');
      return { stare: { ...s, pas: 'offset', modal }, comanda: '$#' };
    }
    case 'offset': {
      const decalajZ = decalajZDinParametri(e.date);
      if (decalajZ === null) return esuat('citire');
      return { stare: { ...s, pas: 'cauta', decalajZ }, comanda: `G91 G21 G38.2 Z-${f3(p.distanta)} F${Math.round(p.avans)}` };
    }
    case 'cauta': {
      const z = zDinPrb(e.date);
      if (z === null) return esuat('fara-contact');
      return { stare: { ...s, pas: 'retrage', zAtingere: z }, comanda: jog(p.retragere) };
    }
    case 'retrage':
      return { stare: { ...s, pas: 'fin' }, comanda: `G91 G21 G38.2 Z-${f3(p.retragere + 1)} F${Math.round(p.avansFin)}` };
    case 'fin': {
      const z = zDinPrb(e.date);
      if (z === null) return esuat('fara-contact');
      const zScris = z - p.grosime - (s.decalajZ ?? 0);
      return { stare: { ...s, pas: 'seteaza', zAtingere: z, zScris }, comanda: `G10 L2 P${indiceWcs(p.wcs)} Z${f3(zScris)}` };
    }
    case 'seteaza':
      return { stare: { ...s, pas: 'ridica' }, comanda: jog(p.ridicare) };
    case 'ridica':
      return { stare: { ...s, pas: 'gata' }, comanda: null };
  }
}
