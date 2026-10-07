import * as cc from 'cavalier-contours-js';
import { plineToSegs, samplesOf, dSeg, area } from './oracol-v1.mjs';
import { insideExact } from './adevar.mjs';
const N = 5000;
const wav = Array.from({ length: N }, (_, i) => { const t = 2 * Math.PI * i / N, r = 50 + 8 * Math.sin(5 * t) + 3 * Math.sin(13 * t); return [r * Math.cos(t), r * Math.sin(t), 0]; });
const pl = cc.plineClosed(wav);
console.log('ondulata: arie', pl.area().toFixed(3), 'autointersectie', pl.scanForSelfIntersect());
for (const d of [3.175, 5, 5.5, 6, 6.5, 7, 8]) {
  const r = pl.parallelOffset(d);
  console.log(`  d=${d}: bucle ${r.length}, varfuri ${r.map((q) => q.vertexCount)}, arii ${r.map((q) => q.area().toFixed(2))}, inchise ${r.map((q) => q.isClosed)}`);
}
// raza minima de curbura a curbei ondulate (pe hartie: r(t) analitic, kappa = (r^2 + 2r'^2 - r r'')/(r^2+r'^2)^1.5)
let kmax = 0, kmin = 0; for (let i = 0; i < 100000; i++) { const t = 2 * Math.PI * i / 100000; const r = 50 + 8 * Math.sin(5 * t) + 3 * Math.sin(13 * t), r1 = 40 * Math.cos(5 * t) + 39 * Math.cos(13 * t), r2 = -200 * Math.sin(5 * t) - 507 * Math.sin(13 * t); const k = (r * r + 2 * r1 * r1 - r * r2) / Math.pow(r * r + r1 * r1, 1.5); kmax = Math.max(kmax, k); kmin = Math.min(kmin, k); }
console.log('curbura max (convex)', kmax.toFixed(4), '-> raza', (1 / kmax).toFixed(3), '| curbura min (concav)', kmin.toFixed(4), '-> raza', (1 / -kmin).toFixed(3));
// patrat cu colturi r=0.001: offset interior d
const r0 = 0.001, b = Math.tan(Math.PI / 8);
const sq = cc.plineClosed([[r0, 0, 0], [50 - r0, 0, b], [50, r0, 0], [50, 50 - r0, b], [50 - r0, 50, 0], [r0, 50, b], [0, 50 - r0, 0], [0, r0, b]]);
for (const d of [0.0005, 0.0009, 0.00099, 0.001, 0.00101, 0.0011, 0.0015, 0.002, 0.005, 0.01, 0.05, 0.1, 1, 3.175]) { const r = sq.parallelOffset(d); console.log(`  patrat r=0.001, d=${d}: bucle ${r.length} arii ${r.map((q) => q.area().toFixed(6))} (hartie ${((50 - 2 * d) ** 2).toFixed(6)})`); }
for (const rc of [0.01, 0.1, 1]) { const bb = b; const s2 = cc.plineClosed([[rc, 0, 0], [50 - rc, 0, bb], [50, rc, 0], [50, 50 - rc, bb], [50 - rc, 50, 0], [rc, 50, bb], [0, 50 - rc, 0], [0, rc, bb]]); for (const f of [0.5, 2, 3]) { const d = rc * f; const r = s2.parallelOffset(d); console.log(`  patrat r=${rc}, d=${d}: bucle ${r.length} arii ${r.map((q) => q.area().toFixed(6))} (hartie ${(f <= 1 ? (50 - 2 * d) ** 2 - (4 - Math.PI) * (rc - d) ** 2 : (50 - 2 * d) ** 2).toFixed(6)})`); } }
