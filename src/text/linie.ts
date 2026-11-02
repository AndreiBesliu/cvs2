/**
 * Fonturile cu o singură linie (ADR 0140): fonturile de gravură n-au contururi de umplut, ci trăsături, pe care freza le
 * urmează pe linie. TrueType și CFF închid însă orice contur, așa că un asemenea font își scrie trăsăturile după o convenție:
 * - **dus-întors:** trăsătura, apoi aceeași înapoi (fonturile „stick” vândute pentru gravură): punctele conturului, ciclic,
 *   sunt un palindrom în jurul unui punct de pe curbă;
 * - **păstrată deschisă:** trăsătura, cu ultimul punct pe curbă; segmentul de închidere al formatului nu e desenat (fonturile
 *   pentru CAD, ca Relief SingleLine CAD);
 * - o buclă (un O) are ultimul punct chiar în primul, sau în afara curbei (atunci segmentul de închidere e o curbă a desenului).
 *
 * Recunoașterea: un font obișnuit n-are contururi fără arie (toate punctele pe o dreaptă); unul cu o singură linie le are la
 * literele drepte (I, i, l, H, 1, L, T, cratima).
 */
import type { ConturFont, PunctFont } from './sfnt.ts';

/** Literele după care se recunoaște un font cu o singură linie. */
export const SONDE_LINIE = 'IilH1LT-';

/** Toate punctele conturului pe o dreaptă (cu punctele de control): un contur fără arie. */
export function faraArie(c: ConturFont): boolean {
  const o = c[0];
  if (!o) return true;
  const d = c.find((q) => q.x !== o.x || q.y !== o.y);
  if (!d) return true;
  const dx = d.x - o.x, dy = d.y - o.y;
  return c.every((q) => (q.x - o.x) * dy - (q.y - o.y) * dx === 0);
}

/**
 * Un font cu o singură linie: cel puțin două dintre literele-sondă, și cel puțin jumătate din cele pe care fontul le are, au
 * un contur fără arie.
 */
export function cuOLinie(f: { glifa(cod: number): number; contururi(glifa: number): readonly ConturFont[] | null }): boolean {
  let are = 0, cu = 0;
  for (const ch of SONDE_LINIE) {
    const g = f.glifa(ch.codePointAt(0)!);
    if (g === 0) continue;
    are++;
    if ((f.contururi(g) ?? []).some((c) => c.length >= 2 && faraArie(c))) cu++;
  }
  return cu >= 2 && 2 * cu >= are;
}

const acelasi = (a: PunctFont, b: PunctFont): boolean => a.x === b.x && a.y === b.y && a.peCurba === b.peCurba;

/** Trăsătura unui contur al unui font cu o singură linie: punctele ei, în ordine, și dacă e o buclă. */
export function traseu(c: ConturFont): { readonly puncte: ConturFont; readonly inchis: boolean } {
  const n = c.length;
  // Dus-întors: o întoarcere t (pe curbă) cu c[t + i] = c[t − i], ciclic; trăsătura e jumătatea de la t la cealaltă.
  if (n >= 2 && n % 2 === 0) {
    for (let t = 0; t < n; t++) {
      if (!c[t]!.peCurba) continue;
      let palindrom = true;
      for (let i = 1; i <= n / 2 && palindrom; i++) palindrom = acelasi(c[(t + i) % n]!, c[(t - i + n) % n]!);
      if (palindrom) return { puncte: Array.from({ length: n / 2 + 1 }, (_, i) => c[(t + i) % n]!), inchis: false };
    }
  }
  const prim = c[0], ultim = c[n - 1];
  if (prim?.peCurba && ultim?.peCurba) {
    // O buclă își păstrează punctul final, chiar dacă e primul: o cubică (CFF, SVG) care se termină în start are nevoie de
    // el; segmentul de lungime zero de după el se sare la așezare.
    if (n > 2 && prim.x === ultim.x && prim.y === ultim.y) return { puncte: c, inchis: true };
    return { puncte: c, inchis: false };
  }
  return { puncte: c, inchis: true };
}
