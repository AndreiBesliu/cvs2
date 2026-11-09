/**
 * Pauzele unui desen, ținute în browser pentru aceleași piese (felia 3.6p, ADR 0193 §A.4, răspunsul 4a): ca setările felierii,
 * o comoditate a fiecăruia, nu a proiectului. Cheia e lista instanțelor alese (ordonată), deci aceleași piese își regăsesc
 * pauzele la redeschiderea dialogului, chiar după o mutare sau o schimbare a formei lor. Se țin ultimele `MAX_DESENE` desene.
 */
import { NOTA_PAUZA_MAX, notaPauza, type Pauza } from '../cam/feliere/index.ts';

const CHEIE = 'cvs2.imprimanta.felie.pauze';
/** Câte desene își țin pauzele (cele mai vechi ies). */
export const MAX_DESENE = 20;
/** Câte pauze are cel mult un desen. */
export const MAX_PAUZE_DESEN = 50;

type Depozit = Pick<Storage, 'getItem' | 'setItem'>;
type Intrare = { readonly pauze: readonly Pauza[]; readonly la: number };

/** Cheia unui desen: instanțele alese, ordonate (alt fel de alegere a acelorași piese dă aceeași cheie). */
export const cheiePauze = (ids: readonly string[]): string => [...ids].sort().join(',');

const depozit = (): Depozit | null => {
  try { return globalThis.localStorage ?? null; } catch { return null; }
};

/** O pauză citită, dacă e bună: o înălțime pozitivă, finită, și o notă (curățată, cel mult `NOTA_PAUZA_MAX`). */
function pauzaValida(x: unknown): Pauza | null {
  if (typeof x !== 'object' || x === null) return null;
  const { h, nota } = x as Record<string, unknown>;
  if (typeof h !== 'number' || !Number.isFinite(h) || h <= 0 || h > 10_000) return null;
  return { h, nota: typeof nota === 'string' ? notaPauza(nota).slice(0, NOTA_PAUZA_MAX) : '' };
}

function citesteTot(d: Depozit): Map<string, Intrare> {
  const rez = new Map<string, Intrare>();
  try {
    const x = JSON.parse(d.getItem(CHEIE) ?? 'null') as unknown;
    if (typeof x !== 'object' || x === null || (x as { v?: unknown }).v !== 1) return rez;
    const desene = (x as { desene?: unknown }).desene;
    if (typeof desene !== 'object' || desene === null || Array.isArray(desene)) return rez;
    for (const [k, v] of Object.entries(desene)) {
      if (typeof v !== 'object' || v === null) continue;
      const lista = (v as { pauze?: unknown }).pauze;
      const la = (v as { la?: unknown }).la;
      if (!Array.isArray(lista)) continue;
      const pauze = lista.map(pauzaValida).filter((p): p is Pauza => p !== null).slice(0, MAX_PAUZE_DESEN);
      rez.set(k, { pauze, la: typeof la === 'number' && Number.isFinite(la) ? la : 0 });
    }
  } catch {
    // O valoare stricată: nicio pauză ținută (nu se aruncă din dialog).
  }
  return rez;
}

/** Pauzele ținute pentru un desen (ordonate după înălțime); niciuna, fără depozit sau pentru un desen necunoscut. */
export function citestePauze(cheie: string, d: Depozit | null = depozit()): Pauza[] {
  if (d === null || cheie === '') return [];
  return [...(citesteTot(d).get(cheie)?.pauze ?? [])].sort((a, b) => a.h - b.h);
}

/** Ține pauzele unui desen (o listă goală îl scoate); cele mai vechi desene ies peste `MAX_DESENE`. */
export function scriePauze(cheie: string, pauze: readonly Pauza[], d: Depozit | null = depozit(), acum = Date.now()): void {
  if (d === null || cheie === '') return;
  const tot = citesteTot(d);
  tot.delete(cheie);
  const bune = pauze.map(pauzaValida).filter((p): p is Pauza => p !== null).slice(0, MAX_PAUZE_DESEN);
  if (bune.length > 0) tot.set(cheie, { pauze: bune, la: acum });
  const pastrate = [...tot.entries()].sort((a, b) => b[1].la - a[1].la).slice(0, MAX_DESENE);
  try {
    d.setItem(CHEIE, JSON.stringify({ v: 1, desene: Object.fromEntries(pastrate) }));
  } catch {
    // Fără loc sau fără stocare: pauzele rămân doar în dialog.
  }
}
