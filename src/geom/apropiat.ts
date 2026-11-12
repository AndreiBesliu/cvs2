/**
 * Cel mai apropiat punct al unui contur de un punct dat (ADR 0062, unealta Noduri; ADR 0181, foarfeca și retezatul cuțitului):
 * segmentul și parametrul lui, cu distanța. Liniile și arcele exact; cubica, eșantionată și rafinată.
 */
import { cerculArcului, numarSegmente, segment, type Contur, type Punct } from './conturBaza.ts';
import { peArc } from './distanta.ts';

/** Cel mai apropiat punct al segmentului `i` de `p`: parametrul lui (0…1) și distanța. Liniile și arcele exact; cubica, eșantionată și rafinată. */
export function apropiat(c: Contur, i: number, p: Punct): { readonly t: number; readonly d: number } {
  const { a, b, s } = segment(c, i);
  if (s.tip === 'A' && Math.abs(s.bulge) > 1e-12) {
    const { centru, raza, start, baleiaj } = cerculArcului(a, b, s.bulge);
    const u = Math.atan2(p.y - centru.y, p.x - centru.x);
    if (peArc(u, start, baleiaj)) {
      const rel = baleiaj >= 0 ? (((u - start) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) : (((start - u) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      return { t: rel / Math.abs(baleiaj), d: Math.abs(Math.hypot(p.x - centru.x, p.y - centru.y) - raza) };
    }
    const da = Math.hypot(p.x - a.x, p.y - a.y), db = Math.hypot(p.x - b.x, p.y - b.y);
    return da <= db ? { t: 0, d: da } : { t: 1, d: db };
  }
  if (s.tip === 'C') {
    const pe = (t: number): Punct => {
      const m = 1 - t;
      return { x: m * m * m * a.x + 3 * m * m * t * s.c1.x + 3 * m * t * t * s.c2.x + t * t * t * b.x, y: m * m * m * a.y + 3 * m * m * t * s.c1.y + 3 * m * t * t * s.c2.y + t * t * t * b.y };
    };
    const dist = (t: number): number => { const q = pe(t); return Math.hypot(q.x - p.x, q.y - p.y); };
    let t0 = 0, d0 = dist(0);
    for (let k = 1; k <= 64; k++) { const d = dist(k / 64); if (d < d0) { d0 = d; t0 = k / 64; } }
    let lo = Math.max(0, t0 - 1 / 64), hi = Math.min(1, t0 + 1 / 64);
    for (let k = 0; k < 40; k++) {
      const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3;
      if (dist(m1) < dist(m2)) hi = m2; else lo = m1;
    }
    const t = (lo + hi) / 2;
    return { t, d: dist(t) };
  }
  const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
  const t = l2 > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2)) : 0;
  return { t, d: Math.hypot(a.x + dx * t - p.x, a.y + dy * t - p.y) };
}

/** Latura conturului (în lume) cea mai apropiată de `p`, la cel mult `toleranta` mm, cu parametrul punctului de pe ea; sau `null`. */
export function laturaLovita(c: Contur, p: Punct, toleranta: number): { readonly i: number; readonly t: number } | null {
  let cel: { i: number; t: number } | null = null, d0 = toleranta;
  for (let i = 0; i < numarSegmente(c); i++) {
    const r = apropiat(c, i, p);
    if (r.d <= d0) { d0 = r.d; cel = { i, t: r.t }; }
  }
  return cel;
}
