/**
 * Relieful arătat pe planșă (ADR 0310 §7): compusul, redus pentru desen la cel mult `LATURA_UMBRIRE` pe latura mare (media pe
 * blocuri, golurile sărite), umbrit cu lumina din stânga-sus. Doar pentru ochi: nu intră în ce se salvează sau se taie.
 * Imaginea are rândul de sus = rândul de sus al reliefului (j = ny − 1), ca o imagine pusă pe foaie (ADR 0272).
 */

/** Latura cea mai mare a imaginii umbrite (px): destul pentru ecran, cu memoria mică (16 MB la 2048²). */
export const LATURA_UMBRIRE = 2048;

/** Imaginea umbrită, RGBA, rând cu rând de sus în jos; golul e transparent. */
export type Umbrit = { readonly latime: number; readonly inaltime: number; readonly rgba: Uint8ClampedArray<ArrayBuffer> };

/** Lumina, vectorul spre ea: din stânga-sus (azimutul 315°), la 45° deasupra planului. */
const LX = -0.5, LY = 0.5, LZ = Math.SQRT1_2;
/** Lumina ambientală: o față întoarsă de la lumină nu e neagră. */
const AMBIENT = 0.25;

/** Factorul întreg de reducere: cel mai mic k cu ⌈max(nx, ny) / k⌉ ≤ `LATURA_UMBRIRE`. */
export function factorReducere(nx: number, ny: number): number {
  return Math.max(1, Math.ceil(Math.max(nx, ny) / LATURA_UMBRIRE));
}

/** Grila redusă cu k: media celulelor negoale din fiecare bloc k × k (marginea, bloc parțial); un bloc gol rămâne gol. */
export function reduce(valori: ArrayLike<number>, nx: number, ny: number, k: number): { readonly valori: Float32Array; readonly nx: number; readonly ny: number } {
  if (k <= 1) return { valori: Float32Array.from(valori), nx, ny };
  const mx = Math.ceil(nx / k), my = Math.ceil(ny / k), out = new Float32Array(mx * my);
  for (let bj = 0; bj < my; bj++) {
    for (let bi = 0; bi < mx; bi++) {
      let s = 0, n = 0;
      for (let j = bj * k; j < Math.min(ny, bj * k + k); j++) {
        for (let i = bi * k; i < Math.min(nx, bi * k + k); i++) {
          const v = valori[j * nx + i] ?? NaN;
          if (!Number.isNaN(v)) { s += v; n++; }
        }
      }
      out[bj * mx + bi] = n === 0 ? NaN : s / n;
    }
  }
  return { valori: out, nx: mx, ny: my };
}

/** Cea mai mică și cea mai mare valoare negoală, sau null dacă toate celulele sunt goale. */
export function intervalZ(valori: ArrayLike<number>): { readonly min: number; readonly max: number } | null {
  let min = Infinity, max = -Infinity;
  for (let k = 0; k < valori.length; k++) {
    const v = valori[k] ?? NaN;
    if (Number.isNaN(v)) continue;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return min === Infinity ? null : { min, max };
}

/** Panta pe o axă din vecinii a și b ai lui z (NaN: lipsă): diferența centrală, pe o parte lângă un gol, 0 fără vecini. */
function panta(a: number, z: number, b: number, celula: number): number {
  const fa = Number.isNaN(a), fb = Number.isNaN(b);
  if (!fa && !fb) return (b - a) / (2 * celula);
  if (!fb) return (b - z) / celula;
  if (!fa) return (z - a) / celula;
  return 0;
}

/** Umbrirea grilei nx × ny (j în sus), cu celula în mm (panta e la scara reală). */
export function umbreste(valori: ArrayLike<number>, nx: number, ny: number, celula: number): Umbrit {
  const rgba = new Uint8ClampedArray(nx * ny * 4);
  const v = (i: number, j: number): number => (i < 0 || j < 0 || i >= nx || j >= ny ? NaN : valori[j * nx + i] ?? NaN);
  for (let j = 0; j < ny; j++) {
    const rand = ny - 1 - j;
    for (let i = 0; i < nx; i++) {
      const z = v(i, j);
      if (Number.isNaN(z)) continue;
      const dx = panta(v(i - 1, j), z, v(i + 1, j), celula), dy = panta(v(i, j - 1), z, v(i, j + 1), celula);
      // Normala ∝ (−dz/dx, −dz/dy, 1).
      const lum = (-dx * LX - dy * LY + LZ) / Math.sqrt(dx * dx + dy * dy + 1);
      const g = Math.round(255 * (AMBIENT + (1 - AMBIENT) * Math.max(0, lum)));
      const p = 4 * (rand * nx + i);
      rgba[p] = g;
      rgba[p + 1] = g;
      rgba[p + 2] = g;
      rgba[p + 3] = 255;
    }
  }
  return { latime: nx, inaltime: ny, rgba };
}
