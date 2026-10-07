import { textLoops } from './cazuri.mjs';
import { makeOracle } from './oracle/oracle.mjs';
import { normalize, makeRegion } from './src/geom.mjs';
const loops = textLoops('kunstler', 'Manole', 15, 0, 0);
const or = makeOracle(loops, 'nonzero'); const reg = makeRegion(normalize(loops, 'nonzero', 0.0005));
const ev = (c, t) => { const u = 1 - t; if (c.k === 'L') return [c.p0[0] + t * (c.p1[0] - c.p0[0]), c.p0[1] + t * (c.p1[1] - c.p0[1])]; return [u * u * c.p0[0] + 2 * u * t * c.p1[0] + t * t * c.p2[0], u * u * c.p0[1] + 2 * u * t * c.p1[1] + t * t * c.p2[1]]; };
const p = [24.9838, 2.2417];
const near = [];
loops.forEach((l, li) => l.forEach((c, ci) => { for (let i = 0; i <= 20000; i++) { const t = i / 20000; const q = ev(c, t); const d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d < 0.06) { const ta = Math.max(0, t - 1e-4), tb = Math.min(1, t + 1e-4); const a = ev(c, ta), b = ev(c, tb); const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1; const e = 2e-5; const s1 = or.inside(q[0] - dy / L * e, q[1] + dx / L * e), s2 = or.inside(q[0] + dy / L * e, q[1] - dx / L * e); near.push({ li, ci, k: c.k, t, d, B: s1 !== s2 }); } } }));
const best = (f) => near.filter(f).reduce((m, n) => (n.d < m.d ? n : m), { d: Infinity });
const bAll = best(() => true), bB = best((n) => n.B);
console.log('dist forta bruta la ORICE curba:', bAll.d.toFixed(5), JSON.stringify({ li: bAll.li, ci: bAll.ci, k: bAll.k, t: bAll.t, B: bAll.B }));
console.log('dist forta bruta la GRANITA (o parte in, una afara):', bB.d.toFixed(5), JSON.stringify({ li: bB.li, ci: bB.ci, k: bB.k, t: bB.t }));
console.log('oracol', or.dist(...p).toFixed(5), '| generator (poligoane normalizate)', reg.dist(...p).toFixed(5));
// unde e cel mai apropiat punct de granita in geometria generatorului?
let bs = null, bd = Infinity; for (const s of reg.segs) { const dx = s[2] - s[0], dy = s[3] - s[1]; const L2 = dx * dx + dy * dy; let t = L2 ? ((p[0] - s[0]) * dx + (p[1] - s[1]) * dy) / L2 : 0; t = Math.max(0, Math.min(1, t)); const d = Math.hypot(s[0] + t * dx - p[0], s[1] + t * dy - p[1]); if (d < bd) { bd = d; bs = s; } }
console.log('segmentul generatorului cel mai apropiat', bs.map((v) => v.toFixed(5)), bd.toFixed(5));
const q = ev(loops[bB.li][bB.ci], bB.t); console.log('punctul de granita al oracolului', q.map((v) => v.toFixed(5)), 'gen.inside de o parte si de alta:', reg.inside(q[0] + 1e-3, q[1]), reg.inside(q[0] - 1e-3, q[1]), reg.inside(q[0], q[1] + 1e-3), reg.inside(q[0], q[1] - 1e-3));
console.log('curba de granita:', JSON.stringify(loops[bB.li][bB.ci]), 'vecinele:', JSON.stringify(loops[bB.li][bB.ci - 1]), JSON.stringify(loops[bB.li][bB.ci + 1]));
