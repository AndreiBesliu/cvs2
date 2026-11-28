/**
 * Imaginea pusă ca strat nou pe un relief (ADR 0320, felia 18.1↑j): valorile ei (un pixel de `pixel` mm, rânduri de jos în
 * sus, ca grila), centrate pe grila reliefului. Fiecare celulă ia pixelul în care îi cade centrul, fără amestec (la aceeași
 * scară, stratul e imaginea, pixel cu pixel); o celulă din afara imaginii e goală (NaN), deci compunerea o sare (ADR 0311 §7),
 * iar ce iese din relief se taie. Intervalul unui pixel e închis la stânga și jos, deschis la dreapta și sus. Doar + − × ÷ și
 * `Math.floor`: aceeași grilă în Node și în browser.
 */
import type { Grila } from './grila.ts';

/** Stratul pe grila `g`, din imaginea de `w` × `h` pixeli de `pixel` mm (centrată). */
export function asezaPeGrila(src: ArrayLike<number>, w: number, h: number, pixel: number, g: Grila): Float32Array {
  const out = new Float32Array(g.nx * g.ny).fill(NaN);
  if (!(w > 0 && h > 0 && pixel > 0)) return out;
  const x0 = (g.nx * g.celula - w * pixel) / 2, y0 = (g.ny * g.celula - h * pixel) / 2;
  for (let j = 0; j < g.ny; j++) {
    const v = Math.floor(((j + 0.5) * g.celula - y0) / pixel);
    if (v < 0 || v >= h) continue;
    for (let i = 0; i < g.nx; i++) {
      const u = Math.floor(((i + 0.5) * g.celula - x0) / pixel);
      if (u < 0 || u >= w) continue;
      out[j * g.nx + i] = src[v * w + u] ?? NaN;
    }
  }
  return out;
}
