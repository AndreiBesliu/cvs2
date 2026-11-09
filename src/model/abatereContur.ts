/**
 * Abaterea dintre două contururi (ADR 0180 §11): distanța Hausdorff, în ambele sensuri, pe toată forma (nodurile și laturile),
 * nu doar pe noduri. Comună conversiei (felia 10.3↑d) și netezirii (felia 10.3↑e).
 */
import { numarSegmente, segment, type Contur } from '../geom/contur.ts';
import { distantaLaContur } from '../geom/distanta.ts';
import { punctPe } from './reparare.ts';

/** Cea mai mare distanță de la A la B: eșantioane pe fiecare segment, fiecare maxim local rafinat cu secțiunea de aur. */
export function dinspre(A: Contur, B: Contur, k: number): number {
  let best = 0;
  for (let i = 0; i < numarSegmente(A); i++) {
    const g = segment(A, i);
    const f = (t: number): number => distantaLaContur(punctPe(g, t), B);
    const d = Array.from({ length: k + 1 }, (_, j) => f(j / k));
    for (let j = 0; j <= k; j++) {
      const dj = d[j] as number;
      if (dj < (d[j - 1] ?? -1) || dj < (d[j + 1] ?? -1)) continue;
      let lo = Math.max(0, (j - 1) / k), hi = Math.min(1, (j + 1) / k), m = dj;
      for (let it = 0; it < 24; it++) {
        const t1 = lo + (hi - lo) * 0.382, t2 = lo + (hi - lo) * 0.618;
        const f1 = f(t1), f2 = f(t2);
        m = Math.max(m, f1, f2);
        if (f1 < f2) lo = t1; else hi = t2;
      }
      best = Math.max(best, m);
    }
  }
  return best;
}

/** Abaterea Hausdorff, în ambele sensuri; `peste`: dacă primul sens trece deja de el, al doilea nu se mai măsoară. */
export function abatere(A: Contur, B: Contur, peste = Infinity): number {
  const a = dinspre(A, B, 24);
  return a > peste ? a : Math.max(a, dinspre(B, A, Math.max(24, Math.ceil((4 * numarSegmente(A)) / Math.max(1, numarSegmente(B))))));
}
