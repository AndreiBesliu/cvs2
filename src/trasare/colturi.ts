/**
 * Geometria colțurilor foii pozate (ADR 0225): omografia din patru perechi de puncte (transformarea liniară directă, 8 × 8),
 * colțurile bune (un patrulater convex) și cele implicite. Fără importuri: o folosesc și nucleul foii (`foaia.ts`, în
 * workerul trasării), și fereastra (mânerele colțurilor), fără să aducă nucleul trasării în bucata ferestrei.
 */

export type Punct = readonly [number, number];
/** Colțurile foii în poză: stânga-sus, dreapta-sus, dreapta-jos, stânga-jos. */
export type Colturi = readonly [Punct, Punct, Punct, Punct];
/** O omografie 3 × 3, pe rânduri, cu h33 = 1. */
export type Omografie = Float64Array;

/** Colțurile implicite, când foaia nu se găsește: atât înăuntrul pozei, din fiecare latură. */
const INAUNTRU = 0.04;

// ── Omografia ────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Omografia care duce `de[i]` în `la[i]` (patru perechi), sau null dacă nu există (trei puncte coliniare). */
export function omografie(de: readonly Punct[], la: readonly Punct[]): Omografie | null {
  const M: number[][] = [];
  let mare = 0;
  for (let i = 0; i < 4; i++) {
    const [x, y] = de[i] ?? [0, 0], [u, v] = la[i] ?? [0, 0];
    M.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u], [0, 0, 0, x, y, 1, -v * x, -v * y, v]);
    mare = Math.max(mare, Math.abs(x), Math.abs(y), Math.abs(u), Math.abs(v), 1);
  }
  for (let k = 0; k < 8; k++) {
    let p = k;
    for (let i = k + 1; i < 8; i++) if (Math.abs(M[i]?.[k] ?? 0) > Math.abs(M[p]?.[k] ?? 0)) p = i;
    const rk = M[p] ?? [], rp = M[k] ?? [];
    M[k] = rk; M[p] = rp;
    const pivot = rk[k] ?? 0;
    if (Math.abs(pivot) < 1e-12 * mare * mare) return null;
    for (let i = 0; i < 8; i++) {
      const r = M[i];
      if (i === k || !r) continue;
      const f = (r[k] ?? 0) / pivot;
      if (f !== 0) for (let j = k; j <= 8; j++) r[j] = (r[j] ?? 0) - f * (rk[j] ?? 0);
    }
  }
  const h = M.map((r, i) => (r[8] ?? 0) / (r[i] ?? 1));
  return h.every(Number.isFinite) ? Float64Array.from([...h, 1]) : null;
}

/** Punctul (x, y) dus prin omografie. */
export function aplicaOmografia(H: Omografie, x: number, y: number): Punct {
  const w = (H[6] ?? 0) * x + (H[7] ?? 0) * y + (H[8] ?? 1);
  return [((H[0] ?? 0) * x + (H[1] ?? 0) * y + (H[2] ?? 0)) / w, ((H[3] ?? 0) * x + (H[4] ?? 0) * y + (H[5] ?? 0)) / w];
}

/** Produsul vectorial (a − o) × (b − o): pozitiv când o, a, b merg în sensul acelor pe ecran (y în jos). */
export const cr = (o: Punct, a: Punct, b: Punct): number => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
/** Aria unui poligon (formula șiretului). */
export const aria = (p: readonly Punct[]): number => {
  let s = 0;
  for (let i = 0; i < p.length; i++) { const a = p[i] ?? [0, 0], b = p[(i + 1) % p.length] ?? [0, 0]; s += a[0] * b[1] - b[0] * a[1]; }
  return Math.abs(s) / 2;
};

/** Patru colțuri care fac un patrulater convex, în sensul acelor pe ecran (cum le dă găsirea), cu aria cel puțin 1 px². */
export function colturiBune(c: Colturi): boolean {
  for (let i = 0; i < 4; i++) {
    const a = c[i], b = c[(i + 1) % 4], e = c[(i + 2) % 4];
    if (!a || !b || !e || ![...a, ...b].every(Number.isFinite) || cr(a, b, e) <= 0) return false;
  }
  return aria(c) >= 1;
}

/** Colțurile puse când foaia nu se găsește: puțin înăuntrul colțurilor pozei (4 % din fiecare latură). */
export function colturiImplicite(W: number, H: number): Colturi {
  const x0 = INAUNTRU * W, y0 = INAUNTRU * H, x1 = W - x0, y1 = H - y0;
  return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
}
