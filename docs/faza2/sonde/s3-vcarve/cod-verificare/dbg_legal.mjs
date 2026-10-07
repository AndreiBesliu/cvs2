// Legalizarea robusta a sondei: converge? triunghiuri inversate (orientare gresita) dupa delaunator si dupa legalizare?
import Delaunator from 'delaunator';
import { orient2d, incircle } from 'robust-predicates';
import { normalize, makeRegion } from './src/geom.mjs';
import { corpus } from './corpus.mjs';
import { textLoops, rect } from './cazuri.mjs';
import { countNonDelaunay, LEG } from './var/ma-voronoi-var.mjs';
function samples(polys, h) { const xs = []; for (const P of polys) { const n = P.length; for (let i = 0; i < n; i++) { const a = P[i], b = P[(i + 1) % n]; const m = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / h)); for (let j = 0; j < m; j++) xs.push(a[0] + (b[0] - a[0]) * j / m, a[1] + (b[1] - a[1]) * j / m); } } return new Float64Array(xs); }
const inverted = (T, co) => { let s = { pos: 0, neg: 0, zero: 0 }; for (let t = 0; t < T.length; t += 3) { const a = T[t], b = T[t + 1], c = T[t + 2]; const o = orient2d(co[2 * a], co[2 * a + 1], co[2 * b], co[2 * b + 1], co[2 * c], co[2 * c + 1]); if (o > 0) s.pos++; else if (o < 0) s.neg++; else s.zero++; } return s; };
// legalizare COPIATA din sonda (aceeasi logica), cu numararea trecerilor
function legalizeAll(T, HE, co, cap = 200) { const P = (i) => [co[2 * i], co[2 * i + 1]]; const link = (a, b) => { HE[a] = b; if (b !== -1) HE[b] = a; }; let flips = 0, sw = 0; const hist = [];
  for (let sweep = 0; sweep < cap; sweep++) { sw++; let changed = 0;
    for (let a = 0; a < HE.length; a++) { const b = HE[a]; if (b < a) continue; const a0 = a - a % 3, b0 = b - b % 3; const al = a0 + (a + 1) % 3, ar = a0 + (a + 2) % 3, bl = b0 + (b + 2) % 3;
      const p0 = T[ar], pr = T[a], pl = T[al], p1 = T[bl]; const [x0, y0] = P(p0), [xr, yr] = P(pr), [xl, yl] = P(pl), [x1, y1] = P(p1);
      const o = orient2d(x0, y0, xr, yr, xl, yl); if (o === 0) continue; const inc = incircle(x0, y0, xr, yr, xl, yl, x1, y1) * (o < 0 ? 1 : -1);
      if (inc > 0) { T[a] = p1; T[b] = p0; const hbl = HE[bl], har = HE[ar]; link(a, hbl); link(b, har); link(ar, bl); changed++; } }
    flips += changed; hist.push(changed); if (!changed) break; }
  return { flips, sweeps: sw, last: hist.slice(-3) }; }
const cases = [];
for (const S of corpus()) if (['firma_300x100', 'placuta_6mm_3randuri', 'litere_roboto_B8gR&_20mm'].includes(S.name)) cases.push([S.name, S.loops, S.fill]);
cases.push(['firma_1200x400', [...textLoops('robotoV2', 'Casa memoriala Mesterul Manole', 50, 40, 230), ...textLoops('robotoV2', 'Muzeul lemnului, Curtea Arges.', 50, 40, 90), rect(10, 10, 1180, 380), rect(25, 25, 1150, 350, false)], 'nonzero']);
cases.push(['doar_rama_1200x400', [rect(10, 10, 1180, 380), rect(25, 25, 1150, 350, false)], 'nonzero']);
cases.push(['doar_textul_1200x400', [...textLoops('robotoV2', 'Casa memoriala Mesterul Manole', 50, 40, 230), ...textLoops('robotoV2', 'Muzeul lemnului, Curtea Arges.', 50, 40, 90)], 'nonzero']);
for (const [name, loops, fill] of cases) {
  const polys = normalize(loops, fill, 0.0005); const co = samples(polys, 0.05);
  const d = new Delaunator(co); const T = d.triangles, HE = d.halfedges;
  const inv0 = inverted(T, co), bad0 = countNonDelaunay(T, HE, co);
  const t = performance.now(); const L = legalizeAll(T, HE, co, 200); const ms = performance.now() - t;
  const inv1 = inverted(T, co), bad1 = countNonDelaunay(T, HE, co);
  console.log(name.padEnd(26), 'esant', co.length / 2, '| delaunator: orientari', JSON.stringify(inv0), 'ne-Delaunay', bad0, '| legalizare:', L.sweeps, 'treceri,', L.flips, 'intoarceri, ultimele', JSON.stringify(L.last), Math.round(ms), 'ms | dupa: orientari', JSON.stringify(inv1), 'ne-Delaunay', bad1);
}
