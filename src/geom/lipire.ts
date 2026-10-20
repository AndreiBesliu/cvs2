/**
 * Lipirea (ADR 0050 §2), pură: pe fiecare axă separat, punctele a ceea ce se mută (marginile și mijlocul cutiei, sau un
 * singur punct) se lipesc de cea mai apropiată țintă, dacă e la cel mult `toleranta` (mm; pânza o dă din pixeli). Țintele
 * sunt linii: o poziție pe axă, cu întinderea lor pe cealaltă axă (pentru linia de aliniere arătată). Grila e o țintă
 * implicită, la multiplii pasului; la egalitate câștigă ținta scrisă (ghidaj, foaie, formă), nu grila.
 */
import type { Cutie } from './cutie.ts';

export type FelTinta = 'ghidaj' | 'foaie' | 'forma' | 'grila';

/** O țintă pe o axă: linia `x = poz` (axa `x`) sau `y = poz` (axa `y`), întinsă între `de` și `la` pe cealaltă axă. */
export interface TintaLipire {
  readonly axa: 'x' | 'y';
  readonly poz: number;
  readonly de: number;
  readonly la: number;
  readonly fel: FelTinta;
}

/** Linia de aliniere arătată cât se trage: ținta folosită, întinsă până la ce se mută. */
export interface LinieLipire {
  readonly axa: 'x' | 'y';
  readonly poz: number;
  readonly de: number;
  readonly la: number;
  readonly fel: FelTinta;
}

/** Țintele, sortate pe fiecare axă după poziție (căutarea e binară: zeci de mii de ținte, la fiecare mișcare a mausului). */
export interface Tinte {
  readonly x: readonly TintaLipire[];
  readonly y: readonly TintaLipire[];
}

export function tinteDin(lista: Iterable<TintaLipire>): Tinte {
  const x: TintaLipire[] = [];
  const y: TintaLipire[] = [];
  for (const t of lista) {
    if (!Number.isFinite(t.poz)) continue;
    (t.axa === 'x' ? x : y).push(t);
  }
  const dupaPoz = (a: TintaLipire, b: TintaLipire): number => a.poz - b.poz;
  return { x: x.sort(dupaPoz), y: y.sort(dupaPoz) };
}

/** Indicele primei ținte cu `poz >= v` (căutare binară). */
function primaDeLa(t: readonly TintaLipire[], v: number): number {
  let lo = 0, hi = t.length;
  while (lo < hi) {
    const m = (lo + hi) >> 1;
    if ((t[m]?.poz ?? Infinity) < v) lo = m + 1;
    else hi = m;
  }
  return lo;
}

interface Potrivire {
  readonly dif: number;
  readonly tinta: TintaLipire;
}

/** Cea mai apropiată țintă a unui punct, pe o axă: vecinii din stânga și din dreapta ai poziției lui. */
function ceaMaiApropiata(t: readonly TintaLipire[], v: number): Potrivire | null {
  const i = primaDeLa(t, v);
  let best: Potrivire | null = null;
  for (const k of [i - 1, i]) {
    const c = t[k];
    if (!c) continue;
    const dif = c.poz - v;
    if (!best || Math.abs(dif) < Math.abs(best.dif)) best = { dif, tinta: c };
  }
  return best;
}

export interface OptiuniLipire {
  /** Distanța maximă, în mm, la care o țintă trage. */
  readonly toleranta: number;
  /** Pasul grilei, în mm, sau null (grila oprită). */
  readonly grila: number | null;
}

/**
 * Lipirea pe o axă: `puncte` sunt pozițiile punctelor nemutate, `d` deplasarea cerută, `de`/`la` întinderea lor pe cealaltă
 * axă. Întoarce deplasarea nouă, `ținta − punctul nemutat` (nu `d + corecția`: punctul ajunge exact pe țintă, fără
 * rotunjirea adunării), sau `d` dacă nicio țintă nu e destul de aproape, și liniile tuturor țintelor atinse după lipire
 * (marginea pe un ghidaj și mijlocul pe mijlocul foii, deodată: amândouă se arată).
 */
function lipesteAxa(
  axa: 'x' | 'y', t: readonly TintaLipire[], puncte: readonly number[], d: number, de: number, la: number, o: OptiuniLipire,
): { readonly d: number; readonly linii: readonly LinieLipire[] } {
  let best: (Potrivire & { readonly baza: number }) | null = null;
  const maiBuna = (p: Potrivire): boolean => {
    if (Math.abs(p.dif) > o.toleranta) return false;
    if (!best) return true;
    const a = Math.abs(p.dif), b = Math.abs(best.dif);
    // La egalitate (până la 1e-9 mm), o țintă scrisă bate grila.
    if (Math.abs(a - b) <= 1e-9) return best.tinta.fel === 'grila' && p.tinta.fel !== 'grila';
    return a < b;
  };
  for (const baza of puncte) {
    const v = baza + d;
    const p = ceaMaiApropiata(t, v);
    if (p && maiBuna(p)) best = { ...p, baza };
    if (o.grila !== null && o.grila > 0) {
      const g = Math.round(v / o.grila) * o.grila;
      const pg: Potrivire = { dif: g - v, tinta: { axa, poz: g, de: -Infinity, la: Infinity, fel: 'grila' } };
      if (maiBuna(pg)) best = { ...pg, baza };
    }
  }
  if (!best) return { d, linii: [] };
  const nou = best.tinta.poz - best.baza;
  const linii: LinieLipire[] = [];
  const linie = (x: TintaLipire): LinieLipire => ({ axa, poz: x.poz, de: Math.min(de, x.de), la: Math.max(la, x.la), fel: x.fel });
  // Toate țintele scrise pe care cade un punct după lipire (vecinii de o parte și de alta, pentru egalități), plus grila
  // doar dacă ea a lipit (altfel orice punct ar fi „pe grilă” la multiplii pasului).
  const tol = 1e-9 * Math.max(1, Math.abs(nou));
  for (const baza of puncte) {
    const v = baza + nou;
    for (let k = primaDeLa(t, v - tol); k < t.length; k++) {
      const x = t[k];
      if (!x || x.poz > v + tol) break;
      if (!linii.some((l) => l.poz === x.poz && l.fel === x.fel)) linii.push(linie(x));
    }
  }
  if (best.tinta.fel === 'grila') linii.push(linie(best.tinta));
  return { d: nou, linii };
}

/** Punctele unei cutii pe o axă: marginile și mijlocul (o cutie de un punct dă un singur punct). */
function puncteCutie(min: number, max: number): number[] {
  return max - min <= 1e-12 ? [min] : [min, (min + max) / 2, max];
}

/**
 * Pură: deplasarea `dx, dy` a cutiei `c` (în mm), lipită de ținte pe fiecare axă separat, cu liniile de aliniere folosite.
 * O cutie de un singur punct (min = max) lipește doar punctul (uneltele de desen, ghidajul tras).
 */
export function lipeste(
  tinte: Tinte, c: Cutie, dx: number, dy: number, o: OptiuniLipire,
): { readonly dx: number; readonly dy: number; readonly linii: readonly LinieLipire[] } {
  const x = lipesteAxa('x', tinte.x, puncteCutie(c.minX, c.maxX), dx, c.minY + dy, c.maxY + dy, o);
  const y = lipesteAxa('y', tinte.y, puncteCutie(c.minY, c.maxY), dy, c.minX + dx, c.maxX + dx, o);
  // Liniile unei axe se întind până la cutia deja lipită pe cealaltă axă.
  const linii: LinieLipire[] = [
    ...x.linii.map((l) => ({ ...l, de: Math.min(l.de, c.minY + y.d), la: Math.max(l.la, c.maxY + y.d) })),
    ...y.linii.map((l) => ({ ...l, de: Math.min(l.de, c.minX + x.d), la: Math.max(l.la, c.maxX + x.d) })),
  ];
  return { dx: x.d, dy: y.d, linii };
}

/** Țintele unei cutii (un element al altei instanțe, foaia): marginile și mijlocul, pe fiecare axă. */
export function tinteCutie(c: Cutie, fel: FelTinta): TintaLipire[] {
  const r: TintaLipire[] = [];
  for (const poz of puncteCutie(c.minX, c.maxX)) r.push({ axa: 'x', poz, de: c.minY, la: c.maxY, fel });
  for (const poz of puncteCutie(c.minY, c.maxY)) r.push({ axa: 'y', poz, de: c.minX, la: c.maxX, fel });
  return r;
}

/** Ținta unui punct (capătul unei căi deschise): câte o linie pe fiecare axă, întinsă doar cât punctul. */
export function tintePunct(x: number, y: number, fel: FelTinta): TintaLipire[] {
  return [{ axa: 'x', poz: x, de: y, la: y, fel }, { axa: 'y', poz: y, de: x, la: x, fel }];
}
