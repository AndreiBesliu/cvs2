// oracle.mjs — sonda s6-panza (ARUNCABIL). Oracol ANALITIC, fără niciun import din geom.mjs.
// Distanța de la punct la: cerc, arc, segment, parabolă (Bézier pătratică, prin Cardano), dreptunghi rotunjit rotit (SDF).

function hyp(x, y) { return Math.sqrt(x * x + y * y); }

// rădăcinile reale ale a t^3 + b t^2 + c t + d = 0 (Cardano / metoda trigonometrică)
export function cubicRoots(a, b, c, d) {
  if (Math.abs(a) < 1e-300) { // degenerat: pătratică
    if (Math.abs(b) < 1e-300) return Math.abs(c) < 1e-300 ? [] : [-d / c];
    const D = c * c - 4 * b * d; if (D < 0) return []; const s = Math.sqrt(D); return [(-c + s) / (2 * b), (-c - s) / (2 * b)];
  }
  const A = b / a, B = c / a, Cc = d / a;
  const p = B - A * A / 3, q = 2 * A * A * A / 27 - A * B / 3 + Cc;
  const disc = q * q / 4 + p * p * p / 27, off = -A / 3;
  if (disc > 0) { const s = Math.sqrt(disc); return [Math.cbrt(-q / 2 + s) + Math.cbrt(-q / 2 - s) + off]; }
  if (p === 0) return [off];
  const r = Math.sqrt(-p / 3), phi = Math.acos(Math.max(-1, Math.min(1, -q / (2 * r * r * r))));
  return [0, 1, 2].map((k) => 2 * r * Math.cos((phi - 2 * Math.PI * k) / 3) + off);
}

export function distAnalytic(an, px, py) {
  switch (an.t) {
    case 'circle': return Math.abs(hyp(px - an.cx, py - an.cy) - an.r);
    case 'arc': {
      const ux = px - an.cx, uy = py - an.cy, d = hyp(ux, uy);
      const am = an.a0 + an.da / 2, mx = Math.cos(am), my = Math.sin(am);
      const inSweep = d > 0 && (ux * mx + uy * my) / d >= Math.cos(Math.abs(an.da) / 2); // unghiul față de bisectoare
      if (inSweep) return Math.abs(d - an.r);
      const e1x = an.cx + an.r * Math.cos(an.a0), e1y = an.cy + an.r * Math.sin(an.a0);
      const e2x = an.cx + an.r * Math.cos(an.a0 + an.da), e2y = an.cy + an.r * Math.sin(an.a0 + an.da);
      return Math.min(hyp(px - e1x, py - e1y), hyp(px - e2x, py - e2y));
    }
    case 'seg': {
      const bx = an.x1 - an.x0, by = an.y1 - an.y0;
      if ((px - an.x0) * bx + (py - an.y0) * by < 0) return hyp(px - an.x0, py - an.y0);
      if ((px - an.x1) * -bx + (py - an.y1) * -by < 0) return hyp(px - an.x1, py - an.y1);
      return Math.abs(bx * (py - an.y0) - by * (px - an.x0)) / hyp(bx, by);
    }
    case 'quad': { // Q(t) = A t^2 + B t + P0 ; (Q-P)·Q' = 0 -> 2|A|^2 t^3 + 3 A·B t^2 + (|B|^2 + 2 A·W) t + B·W = 0, W = P0-P
      const Ax = an.x0 - 2 * an.x1 + an.x2, Ay = an.y0 - 2 * an.y1 + an.y2, Bx = 2 * (an.x1 - an.x0), By = 2 * (an.y1 - an.y0);
      const Wx = an.x0 - px, Wy = an.y0 - py;
      const roots = cubicRoots(2 * (Ax * Ax + Ay * Ay), 3 * (Ax * Bx + Ay * By), Bx * Bx + By * By + 2 * (Ax * Wx + Ay * Wy), Bx * Wx + By * Wy);
      let best = Math.min(hyp(Wx, Wy), hyp(an.x2 - px, an.y2 - py));
      for (const t of roots) if (t >= 0 && t <= 1) best = Math.min(best, hyp(Ax * t * t + Bx * t + Wx, Ay * t * t + By * t + Wy));
      return best;
    }
    case 'rrect': return Math.abs(sdfRRect(an, px, py));
    default: throw new Error('tip necunoscut ' + an.t);
  }
}
// distanța cu semn a dreptunghiului rotunjit plin (negativ = înăuntru)
export function sdfRRect(an, px, py) {
  const c = Math.cos(-an.rot), s = Math.sin(-an.rot), dx = px - an.cx, dy = py - an.cy;
  const lx = Math.abs(dx * c - dy * s), ly = Math.abs(dx * s + dy * c);
  const qx = lx - (an.w / 2 - an.r), qy = ly - (an.h / 2 - an.r);
  return hyp(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - an.r;
}
export function insideAnalytic(an, px, py) {
  if (an.t === 'circle') return hyp(px - an.cx, py - an.cy) < an.r;
  if (an.t === 'rrect') return sdfRRect(an, px, py) < 0;
  return false; // arc, segment, parabolă: deschise, nimic înăuntru
}
