/**
 * Simularea salvată ca strat (ADR 0322 §5.4, felia 18.1↑g-3): suprafața tăiată, simulată pe foaie (Z față de fața plăcii, cel
 * mai jos punct pe bloc), citită pe centrele celulelor unui relief și dusă în Z-ul lui. Pur: fereastra simulării vine de la
 * vederea 3D (`simuleazaRelief`), matricea reliefului de la lume, iar dz e cel al lucrării (`parametriRelief`, `src/cam/job.ts`):
 * acolo, Z-ul pe foaie e z + dz, deci aici z = z_simulat − dz.
 */
import type { Matrice } from '../geom/matrice.ts';

/** Matricea reliefului pe foaie (cea din `src/geom`), pentru cine nu importă geometria (workerul reliefului). */
export type MatriceRelief = Matrice;

/** Fereastra simulată: colțul stânga-jos, celula nucleului, blocul (pixelul = `bloc` × `bloc` celule), pixelii, rândul 0 jos. */
export type SimulareGrila = {
  readonly x0: number; readonly y0: number; readonly celula: number; readonly bloc: number;
  readonly latime: number; readonly inaltime: number; readonly z: ArrayLike<number>;
};

/**
 * Deplasarea dintre Z-ul reliefului și Z-ul de pe foaie, ca la lucrare: −planZero (adâncimea planului zero sub față), ori, fără
 * el, −vârful compusului (vârful la fața plăcii); un compus gol, 0.
 */
export function dzRelief(planZero: number | undefined, compus: ArrayLike<number>): number {
  if (planZero !== undefined) return -planZero;
  let max = -Infinity;
  for (let k = 0; k < compus.length; k++) { const v = compus[k] ?? NaN; if (v > max) max = v; }
  return Number.isFinite(max) ? -max : 0;
}

/**
 * Valorile stratului pe grila reliefului (`nx` × `ny` celule de `celula`, în sistemul lui, rândul 0 jos): în centrul fiecărei
 * celule, dus pe foaie prin `m`, pixelul simulării care îl conține, minus dz; în afara ferestrei, gol (NaN).
 */
export function valoriDinSimulare(
  g: { readonly nx: number; readonly ny: number; readonly celula: number }, m: Matrice, dz: number, s: SimulareGrila,
): Float32Array {
  const out = new Float32Array(g.nx * g.ny), pas = s.celula * s.bloc;
  for (let j = 0; j < g.ny; j++) {
    const y = (j + 0.5) * g.celula;
    for (let i = 0; i < g.nx; i++) {
      const x = (i + 0.5) * g.celula;
      const px = Math.floor((m.a * x + m.c * y + m.e - s.x0) / pas), py = Math.floor((m.b * x + m.d * y + m.f - s.y0) / pas);
      out[j * g.nx + i] = px >= 0 && px < s.latime && py >= 0 && py < s.inaltime ? (s.z[py * s.latime + px] ?? NaN) - dz : NaN;
    }
  }
  return out;
}
