// Candidatul (c): voron8 = Voronoi EXACT pe segmente (CGAL Segment_Delaunay_graph_2, compilat WASM).
// ATENTIE LICENTA: pachetul e MIT, dar binarul WASM contine CGAL SDG2 (GPL-3.0+ sau licenta comerciala
// GeometryFactory) -> doar unealta de proba, NU in aplicatia livrata.
// Curbele intra aplatizate (poligoanele normalizate). „Perii" axei de la varfurile false ale aplatizarii
// (intoarcere < 20 de grade) se taie; un nod ramas izolat (ex.: centrul cercului) devine o plonjare.
import { init, medialAxis, tessellate } from 'voron8';

let ready = null;
export async function initVoron8() { if (!ready) ready = init(); await ready; }

export function maVoron8(region, { minTurnDeg = 20, parabolaSamples = 24 } = {}) {
  const polys = region.polys;
  const rings = polys.map((P) => P.map((p) => [p[0], p[1]]));
  const res = medialAxis(rings);
  const lim = Math.sin(minTurnDeg * Math.PI / 180);
  const fake = (v) => { if (!v || !v.isInput || !v.source) return false; const P = polys[v.source.input]; const n = P.length; const i = v.source.vertex;
    const a = P[(i - 1 + n) % n], b = P[i], c = P[(i + 1) % n]; const u = [b[0] - a[0], b[1] - a[1]], w = [c[0] - b[0], c[1] - b[1]];
    const cr = Math.abs(u[0] * w[1] - u[1] * w[0]) / (Math.hypot(...u) * Math.hypot(...w) || 1), dt = u[0] * w[0] + u[1] * w[1]; return dt > 0 && cr < lim; };
  const key = new Map(); const nodes = []; const adj = [];
  const id = (p) => { const k = Math.round(p.x * 1e7) + ',' + Math.round(p.y * 1e7); let i = key.get(k); if (i === undefined) { i = nodes.length; nodes.push([p.x, p.y]); adj.push(new Set()); key.set(k, i); } return i; };
  let kept = 0, pruned = 0;
  const touched = new Set();
  for (const e of res.edges) {
    if (e.location !== 'interior' || e.from < 0 || e.to < 0) continue;
    const vf = res.vertices[e.from], vt = res.vertices[e.to];
    // varfurile interioare atinse de muchii (si cele taiate) raman candidate pentru plonjare
    if (!vf.isInput) touched.add(id(vf)); if (!vt.isInput) touched.add(id(vt));
    if (fake(vf) || fake(vt)) { pruned++; continue; }
    kept++;
    const pts = tessellate(e.geometry, { parabolaSamples });
    let prev = id(pts[0]); for (let i = 1; i < pts.length; i++) { const cur = id(pts[i]); if (cur !== prev) { adj[prev].add(cur); adj[cur].add(prev); } prev = cur; }
  }
  // nodurile izolate care NU sunt varfuri de intrare raman ca plonjari; restul se ignora
  const A = adj.map((s) => [...s]);
  for (let i = 0; i < nodes.length; i++) if (A[i].length === 0 && !touched.has(i)) A[i] = null;
  const N2 = [], A2 = [], map = new Map();
  nodes.forEach((p, i) => { if (A[i] !== null) { map.set(i, N2.length); N2.push(p); } });
  nodes.forEach((p, i) => { if (A[i] !== null) A2.push(A[i].map((j) => map.get(j))); });
  return { nodes: N2, adj: A2, keepIsolated: true, stats: { edges: res.edges.length, kept, pruned, segments: polys.reduce((s, P) => s + P.length, 0) } };
}
