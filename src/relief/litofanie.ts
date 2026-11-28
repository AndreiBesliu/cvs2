/**
 * Litofania (ADR 0321, felia 18.1↑f): o placă translucidă a cărei grosime urmează imaginea. Relieful e harta grosimilor rămase:
 * cu lumina liniară, t = t_max − L · (t_max − t_min), cu L griul pixelului (0 negru, 1 alb), deci albul e subțire și negrul gros.
 * Pixelii transparenți sunt la grosimea maximă (opaci, ca o ramă); din spate, harta e oglindită pe X (imaginea se citește drept
 * dinspre fața netăiată); rama e o bandă de celule la grosimea maximă, în jurul imaginii. Totul pe grila cu j în sus, ca
 * `imagine.ts`; doar + − × ÷.
 */

/** Ce alege omul: grosimile (mm), rama (în celule) și fața tăiată. */
export type OptiuniLitofanie = { readonly tmin: number; readonly tmax: number; readonly rama: number; readonly spate: boolean };

/** Grosimile din gri (0 … 1; golul NaN), cu lumina liniară; golul la grosimea maximă. */
export function grosimi(g: ArrayLike<number>, tmin: number, tmax: number): Float32Array {
  const out = new Float32Array(g.length);
  for (let k = 0; k < g.length; k++) {
    const v = g[k] ?? NaN;
    out[k] = v !== v ? tmax : tmax - v * (tmax - tmin);
  }
  return out;
}

/** Grila oglindită pe X (fiecare rând de la capăt). */
export function oglindesteX(v: ArrayLike<number>, nx: number, ny: number): Float32Array {
  const out = new Float32Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) out[j * nx + i] = v[j * nx + nx - 1 - i] ?? NaN;
  return out;
}

/** Grila cu o bandă de `k` celule în jur, la valoarea `t`. */
export function cuRama(v: ArrayLike<number>, nx: number, ny: number, k: number, t: number): { readonly valori: Float32Array; readonly nx: number; readonly ny: number } {
  const NX = nx + 2 * k, NY = ny + 2 * k, out = new Float32Array(NX * NY).fill(t);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) out[(j + k) * NX + i + k] = v[j * nx + i] ?? NaN;
  return { valori: out, nx: NX, ny: NY };
}

/** Litofania întreagă: grosimile, oglinda (din spate), apoi rama, în jurul imaginii așa cum se taie. */
export function litofanieDinGri(g: ArrayLike<number>, nx: number, ny: number, o: OptiuniLitofanie): { readonly valori: Float32Array; readonly nx: number; readonly ny: number } {
  const t = grosimi(g, o.tmin, o.tmax);
  return cuRama(o.spate ? oglindesteX(t, nx, ny) : t, nx, ny, Math.max(0, Math.round(o.rama)), o.tmax);
}

/** Cât de deschisă se vede fiecare celulă cu lumina din spate (lumina liniară): (t_max − t) / (t_max − t_min), în [0, 1]. */
export function luminaDinGrosimi(z: ArrayLike<number>, tmin: number, tmax: number): Float32Array {
  const out = new Float32Array(z.length), d = tmax - tmin;
  for (let k = 0; k < z.length; k++) {
    const v = z[k] ?? NaN;
    out[k] = v !== v || !(d > 0) ? 0 : Math.min(1, Math.max(0, (tmax - v) / d));
  }
  return out;
}
