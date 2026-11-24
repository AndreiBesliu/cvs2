/**
 * Compunerea straturilor (ADR 0310 §1, ADR 0311 §7): de la R = 0 (planul zero), straturile vizibile de jos în sus, fiecare
 * pe celulele lui negoale, cu modul lui; fiecare pas rotunjit la Float32 (scrierea în `Float32Array` o face).
 */

export const MODURI = ['aduna', 'scade', 'inalt', 'jos', 'inlocuieste', 'inmulteste'] as const;
export type Mod = (typeof MODURI)[number];
export type StratValori = { readonly mod: Mod; readonly vizibil: boolean; readonly valori: ArrayLike<number> };

/** Compusul a n celule (o dală sau o grilă întreagă), în `out` (sau unul nou). */
export function compune(n: number, straturi: readonly StratValori[], out = new Float32Array(n)): Float32Array {
  out.fill(0, 0, n);
  for (const s of straturi) {
    if (!s.vizibil) continue;
    const v = s.valori;
    switch (s.mod) {
      case 'aduna': for (let k = 0; k < n; k++) { const x = v[k] ?? NaN; if (x === x) out[k] = (out[k] ?? 0) + x; } break;
      case 'scade': for (let k = 0; k < n; k++) { const x = v[k] ?? NaN; if (x === x) out[k] = (out[k] ?? 0) - x; } break;
      case 'inalt': for (let k = 0; k < n; k++) { const x = v[k] ?? NaN; if (x === x && x > (out[k] ?? 0)) out[k] = x; } break;
      case 'jos': for (let k = 0; k < n; k++) { const x = v[k] ?? NaN; if (x === x && x < (out[k] ?? 0)) out[k] = x; } break;
      case 'inlocuieste': for (let k = 0; k < n; k++) { const x = v[k] ?? NaN; if (x === x) out[k] = x; } break;
      case 'inmulteste': for (let k = 0; k < n; k++) { const x = v[k] ?? NaN; if (x === x) out[k] = (out[k] ?? 0) * x; } break;
    }
  }
  return out;
}
