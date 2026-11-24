/**
 * Lipirea pe puncte (ADR 0330 §5), pură: cursorul (în mm ai foii) se lipește de cel mai apropiat punct numit, la cel mult
 * `toleranta` mm (pânza o dă din pixeli): vârfurile, mijloacele, centrele, cadranele, cutia formelor, punctele foii. Dacă
 * niciunul nu e aproape: punctul cel mai apropiat de pe contur (cu Ctrl, după setare), apoi nodul grilei pornite. La aceeași
 * distanță, ordinea felurilor (`ORDINEA`) alege: centrul, cadranul, vârful, mijlocul, cutia, foaia.
 *
 * Doar formele de lângă cursor contează: fiecare sursă are cutia ei, iar punctele (și conturul) se cer doar când cursorul e
 * în cutia lărgită cu toleranța. Sursa le face o singură dată, deci un import cu zeci de mii de vârfuri rămâne repede.
 * Ce poartă un punct (legătura cotei, de pildă) e al apelantului (`date`); modulul nu știe de document.
 */
import { apropiat } from './apropiat.ts';
import { cerculArcului, numarSegmente, segment, type Contur, type Punct } from './conturBaza.ts';
import type { Cutie } from './cutie.ts';

export type FelPunct = 'varf' | 'mijloc' | 'centru' | 'cadran' | 'cutie' | 'foaie' | 'grila' | 'contur';

export interface PunctTinta<T> {
  readonly p: Punct;
  readonly fel: FelPunct;
  /** Ce poartă punctul, al apelantului (legătura de formă), sau null (foaia, grila, un punct oarecare de pe contur). */
  readonly date: T | null;
}

export interface SursaPuncte<T> {
  readonly cutie: Cutie;
  /** Punctele numite ale sursei, cerute doar cu cursorul lângă cutie. */
  readonly puncte: () => readonly PunctTinta<T>[];
  /** Conturul, pentru punctul cel mai apropiat de pe el (Ctrl). */
  readonly contur?: () => Contur;
}

export interface OptiuniPuncte {
  /** Distanța maximă, în mm, la care un punct trage. */
  readonly toleranta: number;
  /** Felurile bifate (Setări › Cotele › Lipirea); `contur` nu e aici, ci în `peContur`. */
  readonly felurile: ReadonlySet<FelPunct>;
  /** Pasul grilei pornite, în mm, sau null. */
  readonly grila: number | null;
  /** Punctul cel mai apropiat de pe contur (cu Ctrl, mereu sau niciodată, după setare: apelantul hotărăște). */
  readonly peContur: boolean;
}

/** Ordinea la aceeași distanță (până la 1e-9 mm): cel mai precis întâi. */
export const ORDINEA: readonly FelPunct[] = ['centru', 'cadran', 'varf', 'mijloc', 'cutie', 'foaie', 'contur', 'grila'];
const rang = (f: FelPunct): number => ORDINEA.indexOf(f);

const inCutie = (c: Cutie, p: Punct, r: number): boolean => p.x >= c.minX - r && p.x <= c.maxX + r && p.y >= c.minY - r && p.y <= c.maxY + r;

/** Punctul segmentului `i` la parametrul `t`, pe linie, arc sau cubică. */
function punctPeSegment(c: Contur, i: number, t: number): Punct {
  const { a, b, s } = segment(c, i);
  if (s.tip === 'C') {
    const m = 1 - t;
    return {
      x: m * m * m * a.x + 3 * m * m * t * s.c1.x + 3 * m * t * t * s.c2.x + t * t * t * b.x,
      y: m * m * m * a.y + 3 * m * m * t * s.c1.y + 3 * m * t * t * s.c2.y + t * t * t * b.y,
    };
  }
  if (s.tip === 'A' && Math.abs(s.bulge) > 1e-12) {
    // Pe arc, parametrul lui `apropiat` e partea baleiajului.
    const { centru, raza, start, baleiaj } = cerculArcului(a, b, s.bulge);
    const u = start + baleiaj * t;
    return { x: centru.x + raza * Math.cos(u), y: centru.y + raza * Math.sin(u) };
  }
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/**
 * Pură: punctul lipit al cursorului `p`, sau null. `fixe` sunt punctele fără cutie (ale foii), mereu încercate. Un punct
 * numit la cel mult `toleranta` bate conturul și grila, oricât de aproape ar fi ele.
 */
export function lipestePunct<T>(surse: readonly SursaPuncte<T>[], fixe: readonly PunctTinta<T>[], p: Punct, o: OptiuniPuncte): PunctTinta<T> | null {
  const tol = o.toleranta;
  let cel: { readonly t: PunctTinta<T>; readonly d: number } | null = null;
  const incearca = (t: PunctTinta<T>): void => {
    if (!o.felurile.has(t.fel)) return;
    const d = Math.hypot(t.p.x - p.x, t.p.y - p.y);
    if (d > tol) return;
    if (!cel || d < cel.d - 1e-9 || (Math.abs(d - cel.d) <= 1e-9 && rang(t.fel) < rang(cel.t.fel))) cel = { t, d };
  };
  const aproape: SursaPuncte<T>[] = [];
  for (const s of surse) {
    if (!inCutie(s.cutie, p, tol)) continue;
    aproape.push(s);
    for (const t of s.puncte()) incearca(t);
  }
  for (const t of fixe) incearca(t);
  if (cel) return (cel as { readonly t: PunctTinta<T> }).t;
  if (o.peContur) {
    let pe: { readonly q: Punct; readonly d: number } | null = null;
    for (const s of aproape) {
      if (!s.contur) continue;
      const c = s.contur();
      for (let i = 0; i < numarSegmente(c); i++) {
        const r = apropiat(c, i, p);
        if (r.d <= tol && (!pe || r.d < pe.d)) pe = { q: punctPeSegment(c, i, r.t), d: r.d };
      }
    }
    if (pe) return { p: (pe as { readonly q: Punct }).q, fel: 'contur', date: null };
  }
  if (o.grila !== null && o.grila > 0 && o.felurile.has('grila')) {
    const g = { x: Math.round(p.x / o.grila) * o.grila, y: Math.round(p.y / o.grila) * o.grila };
    if (Math.hypot(g.x - p.x, g.y - p.y) <= tol) return { p: g, fel: 'grila', date: null };
  }
  return null;
}
