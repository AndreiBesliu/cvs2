/**
 * Arcul de elipsă în cubice, sub o abatere dată (ADR 0035 §6, T2). Elipsa e imaginea afină a cercului unitate; fiecare
 * bucată de cel mult φ primește cubica standard a cercului (mânerul 4/3 · tan(φ / 4)), trecută prin aceeași hartă.
 */
import type { Punct } from './contur.ts';

/**
 * Abaterea radială a cubicei standard față de cercul unitate, pe un arc de φ ≤ π/2, e cel mult `EROARE_CUBICA_ARC` · φ⁶.
 * Măsurat (2 001 puncte pe bucată, 12.10): 1,8142e-5 · φ⁶ la 90°, 1,8085e-5 · φ⁶ spre 0, crescător cu φ.
 */
export const EROARE_CUBICA_ARC = 1.82e-5;

/** Harta afină a elipsei: punctul (cos t, sin t) al cercului unitate ajunge în (a·cos t + c·sin t + e, b·cos t + d·sin t + f). */
export type HartaElipsa = {
  readonly a: number; readonly b: number; readonly c: number;
  readonly d: number; readonly e: number; readonly f: number;
};

/** Cea mai mare valoare singulară a părții liniare: cât lungește harta o distanță, cel mult. */
export function valoareSingularaMaxima(h: HartaElipsa): number {
  const p = h.a * h.a + h.b * h.b + h.c * h.c + h.d * h.d;
  const q = h.a * h.d - h.b * h.c;
  return Math.sqrt((p + Math.sqrt(Math.max(0, p * p - 4 * q * q))) / 2);
}

/** Unghiul maxim al unei bucăți, ca abaterea imaginii să rămână sub `abatere` (cel mult π/2). */
export function unghiMaximBucata(sigma: number, abatere: number): number {
  return Math.min(Math.PI / 2, (abatere / (EROARE_CUBICA_ARC * sigma)) ** (1 / 6));
}

export type CubicaElipsa = { readonly c1: Punct; readonly c2: Punct; readonly b: Punct };

/** Câte cubice cere arcul de `dt` radiani al hărții `h`, sub `abatere` (Infinity pentru o hartă nefinită). */
export function bucatiArcEliptic(h: HartaElipsa, dt: number, abatere: number): number {
  const n = Math.ceil(Math.abs(dt) / unghiMaximBucata(valoareSingularaMaxima(h), abatere));
  return Number.isFinite(n) ? Math.max(1, n) : Infinity;
}

/**
 * Arcul parametric [t0, t0 + dt] al elipsei, ca lanț de cubice cu abaterea (în ambele sensuri) cel mult `abatere`. Capetele
 * se dau separat (`start`, `stop`), ca lanțul să înceapă și să se termine exact unde e geometria vecină; mijloacele bucăților
 * sunt punctele elipsei. Fiecare element e cubica de la capătul celui dinainte (sau `start`) la `b`.
 */
export function arcEliptic(h: HartaElipsa, t0: number, dt: number, start: Punct, stop: Punct, abatere: number): CubicaElipsa[] {
  const n = bucatiArcEliptic(h, dt, abatere);
  // Apelantul numără întâi cubicele (și le plafonează); o hartă nefinită nu ajunge aici.
  if (!Number.isFinite(n)) throw new RangeError('arcul eliptic ar cere o infinitate de cubice');
  const phi = dt / n;
  const k = (4 / 3) * Math.tan(phi / 4);
  const punct = (t: number): Punct => ({ x: h.a * Math.cos(t) + h.c * Math.sin(t) + h.e, y: h.b * Math.cos(t) + h.d * Math.sin(t) + h.f });
  // Derivata după t: (−a·sin t + c·cos t, −b·sin t + d·cos t).
  const tangenta = (t: number): Punct => ({ x: -h.a * Math.sin(t) + h.c * Math.cos(t), y: -h.b * Math.sin(t) + h.d * Math.cos(t) });
  const rez: CubicaElipsa[] = [];
  let p0 = start;
  for (let i = 0; i < n; i++) {
    const ta = t0 + i * phi;
    const tb = i === n - 1 ? t0 + dt : ta + phi;
    const p3 = i === n - 1 ? stop : punct(tb);
    const da = tangenta(ta);
    const db = tangenta(tb);
    rez.push({ c1: { x: p0.x + k * da.x, y: p0.y + k * da.y }, c2: { x: p3.x - k * db.x, y: p3.y - k * db.y }, b: p3 });
    p0 = p3;
  }
  return rez;
}
