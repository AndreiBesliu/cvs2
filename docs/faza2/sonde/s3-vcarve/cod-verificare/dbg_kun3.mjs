import { textLoops } from './cazuri.mjs';
import { makeOracle } from './oracle/oracle.mjs';
const loops = textLoops('kunstler', 'Manole', 15, 0, 0);
const or = makeOracle(loops, 'nonzero'); const curves = loops.flat();
const ev = (c, t) => { const u = 1 - t; if (c.k === 'L') return [c.p0[0] + t * (c.p1[0] - c.p0[0]), c.p0[1] + t * (c.p1[1] - c.p0[1])]; return [u * u * c.p0[0] + 2 * u * t * c.p1[0] + t * t * c.p2[0], u * u * c.p0[1] + 2 * u * t * c.p1[1] + t * t * c.p2[1]]; };
const p = [24.9838, 2.2417];
for (const [ci, ta, tb] of or.pieceList) { const c = curves[ci]; let best = Infinity, bt = 0; for (let i = 0; i <= 4000; i++) { const t = ta + (tb - ta) * i / 4000; const q = ev(c, t); const d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d < best) { best = d; bt = t; } }
  if (best < 0.01) { const q = ev(c, bt); const a = ev(c, Math.max(0, bt - 1e-4)), b = ev(c, Math.min(1, bt + 1e-4)); const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy); const sides = [1e-6, 1e-5, 1e-4, 1e-3].map((e) => or.inside(q[0] - dy / L * e, q[1] + dx / L * e) + '/' + or.inside(q[0] + dy / L * e, q[1] - dx / L * e));
    console.log('bucata pe curba', ci, c.k, 't', ta.toFixed(5), '-', tb.toFixed(5), 'cel mai apropiat t', bt.toFixed(5), 'd', best.toFixed(5), 'in/afara la 1e-6,1e-5,1e-4,1e-3:', sides.join(' '), JSON.stringify(c)); } }
