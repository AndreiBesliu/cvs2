// Candidatul (a): Voronoi pe puncte dese de pe contur (delaunator, ISC), filtrat la axa mediala interioara.
// Pastreaza muchia Voronoi duala unei muchii Delaunay daca: ambele centre circumscrise sunt in interior si
// cele doua esantioane NU sunt vecine pe contur. Colturile convexe reale se leaga de cel mai apropiat nod.
import Delaunator from 'delaunator';
import { orient2d, incircle } from 'robust-predicates';
import { convexCorners } from './geom.mjs';

// Delaunator are stiva de legalizare fixa (512) si o lasa TACUT neterminata pe randuri lungi de puncte coliniare
// (liniile de baza ale textului) -> triunghiuri ne-Delaunay -> varfuri Voronoi gresite. Aici: treceri complete
// de legalizare cu predicate robuste, pana nu mai e nimic de intors.
function legalizeAll(T, HE, co) {
  const P = (i) => [co[2 * i], co[2 * i + 1]];
  const link = (a, b) => { HE[a] = b; if (b !== -1) HE[b] = a; };
  let flips = 0;
  for (let sweep = 0; sweep < 200; sweep++) {
    let changed = 0;
    for (let a = 0; a < HE.length; a++) {
      const b = HE[a]; if (b < a) continue;
      const a0 = a - a % 3, b0 = b - b % 3; const al = a0 + (a + 1) % 3, ar = a0 + (a + 2) % 3, bl = b0 + (b + 2) % 3;
      const p0 = T[ar], pr = T[a], pl = T[al], p1 = T[bl];
      const [x0, y0] = P(p0), [xr, yr] = P(pr), [xl, yl] = P(pl), [x1, y1] = P(p1);
      const o = orient2d(x0, y0, xr, yr, xl, yl); if (o === 0) continue;
      const inc = incircle(x0, y0, xr, yr, xl, yl, x1, y1) * (o < 0 ? 1 : -1);
      if (inc > 0) { T[a] = p1; T[b] = p0; const hbl = HE[bl], har = HE[ar]; link(a, hbl); link(b, har); link(ar, bl); changed++; }
    }
    flips += changed; if (!changed) break;
  }
  return flips;
}

export function maVoronoi(region, { h }) {
  const polys = region.polys;
  const xs = [], ys = [], loopId = [], idx = [], loopLen = [];
  polys.forEach((P, li) => {
    let k = 0; const n = P.length;
    for (let i = 0; i < n; i++) {
      const a = P[i], b = P[(i + 1) % n]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); const m = Math.max(1, Math.ceil(L / h));
      for (let j = 0; j < m; j++) { xs.push(a[0] + (b[0] - a[0]) * j / m); ys.push(a[1] + (b[1] - a[1]) * j / m); loopId.push(li); idx.push(k++); }
    }
    loopLen.push(k);
  });
  const N = xs.length; const coords = new Float64Array(2 * N); for (let i = 0; i < N; i++) { coords[2 * i] = xs[i]; coords[2 * i + 1] = ys[i]; }
  const d = new Delaunator(coords); const T = d.triangles, HE = d.halfedges; const nt = T.length / 3;
  const flips = legalizeAll(T, HE, coords);
  const cx = new Float64Array(nt), cy = new Float64Array(nt), ok = new Uint8Array(nt);
  for (let t = 0; t < nt; t++) {
    const a = T[3 * t], b = T[3 * t + 1], c = T[3 * t + 2];
    const ax = xs[a], ay = ys[a], bx = xs[b] - ax, by = ys[b] - ay, qx = xs[c] - ax, qy = ys[c] - ay;
    const D = 2 * (bx * qy - by * qx); if (Math.abs(D) < 1e-18) continue;
    const b2 = bx * bx + by * by, q2 = qx * qx + qy * qy;
    cx[t] = ax + (qy * b2 - by * q2) / D; cy[t] = ay + (bx * q2 - qx * b2) / D;
    ok[t] = region.inside(cx[t], cy[t]) ? 1 : 0;
  }
  // noduri: centre circumscrise, contopite cand coincid (patru puncte concirculare)
  const key = new Map(); const node = new Int32Array(nt).fill(-1); const nodes = [];
  const q = 1e-7;
  for (let t = 0; t < nt; t++) { if (!ok[t]) continue; const k = Math.round(cx[t] / q) + ',' + Math.round(cy[t] / q); let id = key.get(k); if (id === undefined) { id = nodes.length; nodes.push([cx[t], cy[t]]); key.set(k, id); } node[t] = id; }
  const adj = nodes.map(() => new Set());
  const neighbors = (i, j) => { if (loopId[i] !== loopId[j]) return false; const n = loopLen[loopId[i]]; const dd = Math.abs(idx[i] - idx[j]); return dd === 1 || dd === n - 1; };
  for (let e = 0; e < HE.length; e++) {
    const o = HE[e]; if (o < e) continue; // fara margini de anvelopa (o=-1) si fara dubluri
    const t1 = Math.floor(e / 3), t2 = Math.floor(o / 3); if (!ok[t1] || !ok[t2]) continue;
    const p = T[e], r = T[e % 3 === 2 ? e - 2 : e + 1]; if (neighbors(p, r)) continue;
    const n1 = node[t1], n2 = node[t2]; if (n1 === n2) continue; adj[n1].add(n2); adj[n2].add(n1);
  }
  // colturile convexe: nod nou la colt, legat de cel mai apropiat nod din bisectoare (frunza, de preferat)
  const corners = convexCorners(polys);
  const cellSize = 4 * h; const bucket = new Map(); nodes.forEach((p, i) => { const k = Math.floor(p[0] / cellSize) + ',' + Math.floor(p[1] / cellSize); let a = bucket.get(k); if (!a) bucket.set(k, (a = [])); a.push(i); });
  for (const { p, bis } of corners) {
    const L = Math.hypot(...bis) || 1; const bx = bis[0] / L, by = bis[1] / L;
    let best = -1, bd = Infinity; const gx = Math.floor(p[0] / cellSize), gy = Math.floor(p[1] / cellSize);
    for (let ix = gx - 1; ix <= gx + 1; ix++) for (let iy = gy - 1; iy <= gy + 1; iy++) for (const i of bucket.get(ix + ',' + iy) || []) {
      const vx = nodes[i][0] - p[0], vy = nodes[i][1] - p[1]; const along = vx * bx + vy * by, off = Math.abs(vx * by - vy * bx);
      if (along <= 0) continue; const s = off * 4 + along + (adj[i].size === 1 ? 0 : h); if (s < bd) { bd = s; best = i; } }
    if (best >= 0) { const id = nodes.length; nodes.push([p[0], p[1]]); adj.push(new Set([best])); adj[best].add(id); }
  }
  return { nodes, adj: adj.map((s) => [...s]), stats: { samples: N, triangles: nt, flips } };
}
