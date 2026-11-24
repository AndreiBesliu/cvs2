/**
 * Imaginea → relief (ADR 0311 §2–§4): pixelii RGBA pe 8 biți, rând cu rând de sus în jos (ca `ImageData`), dau grila de
 * înălțimi, cu j în sus. Doar + − × ÷ și rotunjiri (ADR 0047 §6): netezirea folosește un nucleu binomial, nu `exp`.
 */

export type Sursa = 'l' | 'r' | 'g' | 'b';
export type OptiuniImagine = {
  readonly sursa: Sursa;
  /** Netezirea, în celule (0 = fără); ordinul nucleului e 2 · round(2σ²), cel mult `ORDIN_MAXIM`. */
  readonly sigma: number;
  /** Înălțimea H și baza b, în mm. */
  readonly inaltime: number;
  readonly baza: number;
  readonly albSus: boolean;
};

/** Ordinul cel mai mare al nucleului binomial: ponderile C(n, k) / 2ⁿ rămân exacte în Float64 (σ ≤ 3,5 celule). */
export const ORDIN_MAXIM = 50;
export const SIGMA_MAXIM = Math.sqrt(ORDIN_MAXIM / 4);

/** Ordinul nucleului pentru σ (ADR 0311 §3). */
export function ordin(sigma: number): number {
  if (!(sigma > 0)) return 0;
  return Math.min(ORDIN_MAXIM, 2 * Math.round(2 * sigma * sigma));
}

/** Ponderile nucleului de ordinul n: C(n, k) / 2ⁿ, k = 0 … n (exacte). */
export function ponderi(n: number): Float64Array {
  const c = new Float64Array(n + 1);
  c[0] = 1;
  for (let r = 1; r <= n; r++) for (let k = r; k >= 1; k--) c[k] = (c[k] ?? 0) + (c[k - 1] ?? 0);
  let doiLaN = 1;
  for (let r = 0; r < n; r++) doiLaN *= 2;
  for (let k = 0; k <= n; k++) c[k] = (c[k] ?? 0) / doiLaN;
  return c;
}

/** Valorile gri (ADR 0311 §2), în grila cu j în sus; golul (alfa < 128) e NaN. */
export function gri(rgba: ArrayLike<number>, nx: number, ny: number, sursa: Sursa): Float64Array {
  const out = new Float64Array(nx * ny);
  for (let y = 0; y < ny; y++) {
    const rand = (ny - 1 - y) * nx;
    for (let x = 0; x < nx; x++) {
      const p = 4 * (y * nx + x);
      if ((rgba[p + 3] ?? 0) < 128) { out[rand + x] = NaN; continue; }
      const r = rgba[p] ?? 0, g = rgba[p + 1] ?? 0, b = rgba[p + 2] ?? 0;
      out[rand + x] = sursa === 'l' ? (2126 * r + 7152 * g + 722 * b) / 2_550_000 : (sursa === 'r' ? r : sursa === 'g' ? g : b) / 255;
    }
  }
  return out;
}

/** O trecere a netezirii, pe i (pas 1) sau pe j (pas nx): golurile sărite și rămase goale (ADR 0311 §3). */
function trecere(src: Float64Array, nx: number, ny: number, w: Float64Array, peI: boolean): Float64Array {
  const n = w.length - 1, h = n / 2, out = new Float64Array(nx * ny);
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const c = j * nx + i, v = src[c] ?? NaN;
      if (v !== v) { out[c] = NaN; continue; }
      const pozitie = peI ? i : j, lungime = peI ? nx : ny, pas = peI ? 1 : nx;
      const k0 = Math.max(0, h - pozitie), k1 = Math.min(n, lungime - 1 - pozitie + h);
      let s = 0, sw = 0;
      for (let k = k0; k <= k1; k++) {
        const u = src[c + (k - h) * pas] ?? NaN;
        if (u !== u) continue;
        const wk = w[k] ?? 0;
        s += wk * u;
        sw += wk;
      }
      out[c] = s / sw;
    }
  }
  return out;
}

/** Netezirea (ADR 0311 §3): întâi pe i, apoi pe j, în Float64. Fără netezire, chiar intrarea. */
export function netezeste(g: Float64Array, nx: number, ny: number, sigma: number): Float64Array {
  const n = ordin(sigma);
  if (n === 0) return g;
  const w = ponderi(n);
  return trecere(trecere(g, nx, ny, w, true), nx, ny, w, false);
}

/** Înălțimile (ADR 0311 §4), în Float32; golul rămâne NaN. */
export function inaltimi(g: Float64Array, o: Pick<OptiuniImagine, 'inaltime' | 'baza' | 'albSus'>): Float32Array {
  const out = new Float32Array(g.length);
  for (let k = 0; k < g.length; k++) {
    const v = g[k] ?? NaN;
    out[k] = v !== v ? NaN : o.albSus ? o.baza + v * o.inaltime : o.baza + (1 - v) * o.inaltime;
  }
  return out;
}

/** Relieful unei imagini (ADR 0311 §2–§4): grila de înălțimi, nx · ny, cu j în sus. */
export function reliefDinPixeli(rgba: ArrayLike<number>, nx: number, ny: number, o: OptiuniImagine): Float32Array {
  return inaltimi(netezeste(gri(rgba, nx, ny, o.sursa), nx, ny, o.sigma), o);
}
