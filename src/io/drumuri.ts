/**
 * Drumurile PDF / EPS (ADR 0089): fiecare entitate a foii ca o cale din comenzile pe care le au ambele formate (mută, linie,
 * cubică, închide), în mm, cu axa Y în sus (ca foaia). Liniile și cubicele sunt exacte; arcele și cercurile, din cubice sub
 * toleranța declarată (`cubice.ts`).
 */
import { arcBulgeCubice, arcCubice } from './cubice.ts';
import type { Entitate } from './vectori.ts';

export type Comanda =
  | { readonly op: 'm' | 'l'; readonly x: number; readonly y: number }
  | { readonly op: 'c'; readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number; readonly x: number; readonly y: number }
  | { readonly op: 'h' };

export function drumEntitate(e: Entitate): Comanda[] {
  if (e.fel === 'cerc') {
    const { x, y } = e.centru;
    return [
      { op: 'm', x: x + e.raza, y },
      ...arcCubice(e.centru, e.raza, 0, 2 * Math.PI).map((c) => ({ op: 'c' as const, x1: c.c1.x, y1: c.c1.y, x2: c.c2.x, y2: c.c2.y, x: c.p.x, y: c.p.y })),
      { op: 'h' },
    ];
  }
  if (e.fel === 'spline') {
    const p = e.puncte;
    const d: Comanda[] = [{ op: 'm', x: p[0]!.x, y: p[0]!.y }];
    for (let k = 1; k + 2 < p.length; k += 3) d.push({ op: 'c', x1: p[k]!.x, y1: p[k]!.y, x2: p[k + 1]!.x, y2: p[k + 1]!.y, x: p[k + 2]!.x, y: p[k + 2]!.y });
    return d;
  }
  const v = e.varfuri;
  const d: Comanda[] = [{ op: 'm', x: v[0]!.x, y: v[0]!.y }];
  const n = e.inchis ? v.length : v.length - 1;
  for (let i = 0; i < n; i++) {
    const a = v[i]!, b = v[(i + 1) % v.length]!;
    if (a.bulge === 0) d.push({ op: 'l', x: b.x, y: b.y });
    else for (const c of arcBulgeCubice(a, b, a.bulge)) d.push({ op: 'c', x1: c.c1.x, y1: c.c1.y, x2: c.c2.x, y2: c.c2.y, x: c.p.x, y: c.p.y });
  }
  if (e.inchis) d.push({ op: 'h' });
  return d;
}

/** Culoarea unui strat (#rrggbb, ca în SVG) în componente 0–1, cu 4 zecimale. */
export function rgb(hex: string): string {
  const c = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255);
  return c.map((x) => String(Math.round(x * 10_000) / 10_000)).join(' ');
}
