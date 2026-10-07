// Candidatul (d): flo-mat (MIT, TypeScript pur) - axa mediala direct pe curbe Bezier (linii, patratice, cubice),
// cu regula nonzero (contururi suprapuse acceptate). Arcele intra ca cubice pe bucati de <= 30 de grade.
import * as FM from '../node_modules/flo-mat/browser/index.js';

function arcToCubics(c) {
  const sw = c.a1 - c.a0; const n = Math.max(1, Math.ceil(Math.abs(sw) / (Math.PI / 6))); const out = [];
  for (let i = 0; i < n; i++) { const a = c.a0 + sw * i / n, b = c.a0 + sw * (i + 1) / n; const k = 4 / 3 * Math.tan((b - a) / 4);
    const p0 = [c.c[0] + c.r * Math.cos(a), c.c[1] + c.r * Math.sin(a)], p3 = [c.c[0] + c.r * Math.cos(b), c.c[1] + c.r * Math.sin(b)];
    out.push([p0, [p0[0] - k * c.r * Math.sin(a), p0[1] + k * c.r * Math.cos(a)], [p3[0] + k * c.r * Math.sin(b), p3[1] - k * c.r * Math.cos(b)], p3]); }
  return out;
}
export function toBezierLoops(loops) {
  return loops.map((l) => l.flatMap((c) => c.k === 'L' ? [[c.p0, c.p1]] : c.k === 'Q' ? [[c.p0, c.p1, c.p2]] : c.k === 'C' ? [[c.p0, c.p1, c.p2, c.p3]] : arcToCubics(c)));
}
function evalBez(B, t) {
  const n = B.length - 1; let pts = B.map((p) => p.slice());
  for (let r = 1; r <= n; r++) for (let i = 0; i <= n - r; i++) pts[i] = [pts[i][0] * (1 - t) + pts[i + 1][0] * t, pts[i][1] * (1 - t) + pts[i + 1][1] * t];
  return pts[0];
}
// flo-mat foloseste regula nonzero: la intrari par-impar, buclele se orienteaza dupa adancimea de imbricare
function orientEvenOdd(bl) {
  const poly = bl.map((l) => l.flatMap((B) => [0.25, 0.5, 0.75, 1].map((t) => evalBez(B, t))));
  const area = (P) => { let a = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; };
  const inPoly = (pt, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > pt[1]) !== (b[1] > pt[1]) && pt[0] < (b[0] - a[0]) * (pt[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
  return bl.map((l, i) => { const depth = poly.reduce((d, P, k) => d + (k !== i && inPoly(poly[i][0], P) ? 1 : 0), 0); const want = depth % 2 === 0 ? 1 : -1;
    return Math.sign(area(poly[i])) === want ? l : l.slice().reverse().map((B) => B.slice().reverse()); });
}
export function maFlomat(loops, { sampleStep = 0.05, opts = {}, fill = 'nonzero' } = {}) {
  let bl = toBezierLoops(loops); if (fill === 'evenodd') bl = orientEvenOdd(bl);
  const mats = FM.findMats(bl, { applySat: false, simplify: false, ...opts });
  const key = new Map(); const nodes = []; const adj = [];
  const id = (p) => { const k = Math.round(p[0] * 1e6) + ',' + Math.round(p[1] * 1e6); let i = key.get(k); if (i === undefined) { i = nodes.length; nodes.push(p); adj.push(new Set()); key.set(k, i); } return i; };
  let curves = 0;
  for (const mat of mats) {
    if (!mat.cpNode) continue;
    FM.traverseEdges(mat.cpNode, (cp) => {
      if (FM.isTerminating(cp)) return; const B = FM.getMatCurveToNext(cp); if (!B) return; curves++;
      let len = 0; for (let i = 1; i < B.length; i++) len += Math.hypot(B[i][0] - B[i - 1][0], B[i][1] - B[i - 1][1]);
      const n = B.length === 2 ? 1 : Math.max(2, Math.ceil(len / sampleStep));
      let prev = id(B[0]);
      for (let i = 1; i <= n; i++) { const p = i === n ? B[B.length - 1] : evalBez(B, i / n); const cur = id(p); if (cur !== prev) { adj[prev].add(cur); adj[cur].add(prev); } prev = cur; }
    });
  }
  return { nodes, adj: adj.map((s) => [...s]), stats: { mats: mats.length, matCurves: curves } };
}
