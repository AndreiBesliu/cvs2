/**
 * Ce desenează fereastra exportului din valorile omului (ADR 0290, felia 28.8↑b): trecerile pe adâncime și locurile urechilor.
 * Pur și fără importuri din lucrare (regula `interfata-prin-actiuni`), deci socotit aici cu aceleași formule; o probă îl compară
 * cu lucrarea (`adancimiTreceri`, `geometrieUrechi`, `urechiPeLaturi`), ca desenul să spună ce face programul.
 */

/** Trecerile pe adâncime, egale (ca `adancimiTreceri`): n = ⌈A / p⌉, fiecare de A / n; fără valori bune sau peste 1 000, nimic. */
export function treceriEgale(adancime: number | null, pas: number | null): { readonly n: number; readonly d: number } | null {
  if (adancime === null || pas === null || !(adancime > 0) || !(pas > 0) || !Number.isFinite(adancime) || !Number.isFinite(pas)) return null;
  const n = Math.max(1, Math.ceil(adancime / pas - 1e-9));
  return n > 1000 ? null : { n, d: adancime / n };
}

/** Locurile urechilor pe care le desenează fereastra; „alese” și „unde ține” nu se pot ști fără desen, deci au locuri schițate. */
export type LocuriUrechiDesen = 'egale' | 'lungi' | 'scurte' | 'mijloc';

/**
 * Centrele urechilor pe o buclă din laturi drepte (lungimile, de la vârful 0, în ordinea drumului), ca lucrarea: la distanțe
 * egale (k + ½) · P / n (`geometrieUrechi`); după regulă, numărul împărțit pe laturile cele mai lungi sau cele mai scurte (cu 1 %
 * toleranță), ⌊n / k⌋ pe fiecare și restul răspândit pe ⌊j · k / e⌋, la (j + ½) · L / m pe latură; la mijloc, câte una pe latură
 * (`urechiPeLaturi`). Fără proba încăperii: desenul arată unde ar sta, iar exportul spune dacă nu încap.
 */
export function centreUrechiDesen(mod: LocuriUrechiDesen, n: number, laturi: readonly number[]): number[] {
  const P = laturi.reduce((s, l) => s + l, 0);
  if (!(n >= 1) || !(P > 0)) return [];
  if (mod === 'egale') return Array.from({ length: n }, (_, k) => ((k + 0.5) * P) / n);
  const s0 = laturi.map((_, i) => laturi.slice(0, i).reduce((s, l) => s + l, 0));
  const max = Math.max(...laturi), min = Math.min(...laturi);
  const alese = laturi.map((l, i) => [l, s0[i] ?? 0] as const)
    .filter(([l]) => mod === 'mijloc' || (mod === 'lungi' ? l >= max * 0.99 : l <= min * 1.01));
  const k = alese.length, baza = Math.floor(n / k), rest = n - baza * k;
  const cate = alese.map(() => (mod === 'mijloc' ? 1 : baza));
  if (mod !== 'mijloc') for (let j = 0; j < rest; j++) { const i = Math.floor((j * k) / rest); cate[i] = (cate[i] ?? 0) + 1; }
  return alese.flatMap(([l, s], i) => Array.from({ length: cate[i] ?? 0 }, (_, j) => s + ((j + 0.5) * l) / (cate[i] ?? 1)));
}
