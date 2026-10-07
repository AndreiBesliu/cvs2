// (c) continuare: epsilon-ul de "paralel" din lineLineIntr compara v x u (mm^2, vectori nenormalizati) cu posEqualEps = 1e-5 (mm).
// Predictie (pe hartie): doua segmente consecutive de lungimi L1, L2 cu intoarcerea theta sunt luate drept paralele cand
// L1*L2*sin(theta) < 1e-5; imbinarea devine semicerc (bulge 1) de coarda ~ d*theta, deci abaterea ~ d*theta/2.
// Verificare: offset exterior al unui patrat cu latura de jos zimtata (zgomot de scanare/vectorizare), oracol exact.
import fs from 'node:fs';
import * as cc from 'cavalier-contours-js';
import { plineToSegs, samplesOf, dSeg } from './oracol-v1.mjs';
import { insideExact } from './adevar.mjs';

function squareWithNoisyEdge(step, amp, W = 30) {
  const v = [];
  const n = Math.round(W / step);
  for (let i = 0; i <= n; i++) v.push([i * step, i === 0 || i === n ? 0 : (i % 2 ? amp : -amp), 0]);
  v.push([W, W, 0], [0, W, 0]);
  return v;
}
function check(verts, d) {
  const inSegs = plineToSegs(verts.map(([x, y, b]) => ({ x, y, bulge: b })), true).segs;
  const t0 = performance.now(); let res, err = null;
  try { res = cc.plineClosed(verts).parallelOffset(-d); } catch (e) { err = e.message; }
  const ms = performance.now() - t0;
  if (err) return { err, ms };
  const loops = res.map((q) => { const v = []; for (let i = 0; i < q.vertexCount; i++) { const a = q.at(i); v.push({ x: a.x, y: a.y, bulge: a.bulge }); } return plineToSegs(v, q.isClosed); });
  let semicercuri = 0; for (const q of res) for (let i = 0; i < q.vertexCount; i++) if (Math.abs(Math.abs(q.at(i).bulge) - 1) < 1e-12) semicercuri++;
  // grila de celule pentru distanta la intrare
  const cell = 0.5, grid = new Map(), key = (i, j) => i * 100003 + j;
  inSegs.forEach((s, k) => { const x0 = Math.min(s.x0, s.x1), x1 = Math.max(s.x0, s.x1), y0 = Math.min(s.y0, s.y1), y1 = Math.max(s.y0, s.y1); for (let i = Math.floor(x0 / cell); i <= Math.floor(x1 / cell); i++) for (let j = Math.floor(y0 / cell); j <= Math.floor(y1 / cell); j++) { const K = key(i, j); if (!grid.has(K)) grid.set(K, []); grid.get(K).push(k); } });
  const dist = (x, y) => { const ci = Math.floor(x / cell), cj = Math.floor(y / cell); let b = Infinity; for (let r = 0; r < 200; r++) { for (let i = ci - r; i <= ci + r; i++) for (let j = cj - r; j <= cj + r; j++) { if (Math.max(Math.abs(i - ci), Math.abs(j - cj)) !== r) continue; const L = grid.get(key(i, j)); if (L) for (const k of L) b = Math.min(b, dSeg(inSegs[k], x, y)); } if (b <= r * cell) break; } return b; };
  let e = 0; for (const p of samplesOf(loops, 0.005)) e = Math.max(e, Math.abs(dist(p[0], p[1]) - d));
  return { bucle: res.length, inchise: res.every((q) => q.isClosed), semicercuri, abatereMax: e, ms };
}
const out = [];
const RAPID = process.argv.includes("--rapid"); // --rapid: fara cazurile zimtate lente (0,005 / 0,003 / 0,002 dureaza 44 s, 233 s, apoi cad)
for (const [step, amp] of (RAPID ? [[0.1, 0.01], [0.01, 0.002]] : [[0.1, 0.01], [0.01, 0.002], [0.005, 0.001], [0.003, 0.001], [0.002, 0.0005]])) {
  const L = Math.hypot(step, 2 * amp), th = 2 * Math.atan2(2 * amp, step); // lungimea segmentului si intoarcerea la fiecare varf
  const cross = L * L * Math.sin(th);
  const pred = cross < 1e-5 ? 3.175 * th / 2 : 0;
  const r = check(squareWithNoisyEdge(step, amp), 3.175);
  const rec = { pas: step, amplitudine: amp, L, thetaGrade: th * 180 / Math.PI, LxLxsin: cross, paralelFals: cross < 1e-5, abatereaPrezisa: pred, ...r };
  out.push(rec);
  console.log(`pas ${step} amp ${amp}: L=${L.toFixed(4)} theta=${rec.thetaGrade.toFixed(1)} grd, L^2 sin=${cross.toExponential(2)} ${cross < 1e-5 ? '< 1e-5 (PARALEL FALS)' : '>= 1e-5'} | semicercuri ${r.semicercuri} | abatere max ${r.abatereMax?.toExponential(3)} mm (prezis ~${pred.toExponential(2)}) | bucle ${r.bucle} inchise ${r.inchise} | ${r.ms?.toFixed(1)} ms ${r.err || ''}`);
}
// control: aceeasi latura fara zgomot (linie dreapta) -> abatere ~0
const c0 = check([[0, 0, 0], [30, 0, 0], [30, 30, 0], [0, 30, 0]], 3.175);
console.log('control fara zgomot:', JSON.stringify(c0)); out.push({ control: 'fara zgomot', ...c0 });
// poligon regulat (cerc teselat) R=1, N=600: L=0.0105, theta=0.0105 -> L^2 sin = 1.2e-6 (paralel fals), prezis d*theta/2
for (const [R, N] of [[1, 600], [10, 600], [10, 5000], [100, 5000]]) {
  const v = Array.from({ length: N }, (_, i) => [R * Math.cos(2 * Math.PI * i / N), R * Math.sin(2 * Math.PI * i / N), 0]);
  const L = 2 * R * Math.sin(Math.PI / N), th = 2 * Math.PI / N, cross = L * L * Math.sin(th);
  const r = check(v, 3.175);
  console.log(`cerc teselat R=${R} N=${N}: L=${L.toExponential(3)} L^2 sin=${cross.toExponential(2)} | semicercuri ${r.semicercuri} | abatere ${r.abatereMax?.toExponential(3)} (prezis ${(cross < 1e-5 ? 3.175 * th / 2 : 0).toExponential(2)})`);
  out.push({ cerc: R, N, L, LxLxsin: cross, ...r });
}
fs.writeFileSync(RAPID ? "rez-c3-eps-scara-rapid.json" : "rez-c3-eps-scara.json", JSON.stringify(out, null, 1));
