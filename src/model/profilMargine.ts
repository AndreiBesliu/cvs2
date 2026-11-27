/**
 * Marginea profilată pe hârtie (ADR 0304 §4, felia 16.A↑f-4), din punctele siluetei (r, h), r strict crescător, h
 * nedescrescător, de la (0, 0): fundul plat r(0), înălțimea profilului și cât se retrage muchia de sus în piesă. Pure; le citesc
 * regula formei, lucrarea și fereastra exportului (prin rândul „pe hârtie”).
 */

type Puncte = readonly (readonly [number, number])[];

/** Raza fundului plat al siluetei, r(0): cel mai mare r cu h = 0 (0 când silueta urcă de la axă). Centrul frezei stă la ea de desen. */
export function fundProfil(p: Puncte): number {
  let r0 = 0;
  for (const [r, h] of p) {
    if (h > 0) break;
    r0 = r;
  }
  return r0;
}

/** Înălțimea profilului, h la capăt: cât de adânc poate tăia marginea fără ca cilindrul frezei să atingă piesa. */
export function inaltimeProfil(p: Puncte): number {
  return p[p.length - 1]?.[1] ?? 0;
}

/**
 * Cât se retrage muchia de sus în piesă la adâncimea d, r(d) − r(0), cu r(d) cel mai mic r cu h(r) ≥ d (un palier la înălțimea d
 * rămâne neatins, deci muchia e la începutul lui); peste înălțimea profilului, raza frezei.
 */
export function retragereMuchie(p: Puncte, d: number): number {
  const r0 = fundProfil(p);
  for (let k = 0; k + 1 < p.length; k++) {
    const [ra, ha] = p[k]!, [rb, hb] = p[k + 1]!;
    if (hb >= d) return (ha >= d ? ra : ra + ((rb - ra) * (d - ha)) / (hb - ha)) - r0;
  }
  return (p[p.length - 1]?.[0] ?? 0) - r0;
}
