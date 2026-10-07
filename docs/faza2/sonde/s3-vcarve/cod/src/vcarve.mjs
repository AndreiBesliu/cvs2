// Generatorul V-carve: din graful axei mediale (noduri + vecini) -> trasee 3D (IR) pe treceri.
// Z = -min(D, r / tan(theta/2)), r = distanta EXACTA la contur, recalculata de generator in fiecare punct.
// Fund plat: freza dreapta buzunareste F_k = {d >= w_k} pe fiecare nivel; freza V taie peretii (axa + conturul
// de la w_D) si curata colturile lui F unde freza dreapta nu ajunge, cu inele la pasul dat de toleranta de creasta.
import { offset, difference, clipOpen } from './geom.mjs';

export function buildChains(graph, keepSet = new Set()) {
  const { nodes, adj } = graph; const deg = adj.map((a) => a.length); const used = new Set(); const chains = [];
  const ek = (a, b) => (a < b ? a + '_' + b : b + '_' + a);
  for (let s = 0; s < nodes.length; s++) {
    if (deg[s] === 2) continue;
    if (deg[s] === 0) { if (keepSet.has(s)) chains.push([s]); continue; }
    for (const n0 of adj[s]) {
      if (used.has(ek(s, n0))) continue; const ch = [s]; let prev = s, cur = n0; used.add(ek(s, n0));
      while (true) { ch.push(cur); if (deg[cur] !== 2) break; const nx = adj[cur][0] === prev ? adj[cur][1] : adj[cur][0]; if (used.has(ek(cur, nx))) break; used.add(ek(cur, nx)); prev = cur; cur = nx; }
      chains.push(ch);
    }
  }
  for (let s = 0; s < nodes.length; s++) { // cicluri fara ramificatii (ex.: inelul)
    if (deg[s] !== 2 || used.has(ek(s, adj[s][0]))) continue; const ch = [s]; let prev = s, cur = adj[s][0]; used.add(ek(s, cur));
    while (cur !== s) { ch.push(cur); const nx = adj[cur][0] === prev ? adj[cur][1] : adj[cur][0]; used.add(ek(cur, nx)); prev = cur; cur = nx; }
    ch.push(s); chains.push(ch);
  }
  return chains;
}

// Douglas-Peucker pe (x, y, r): eroarea = abaterea XY de la coarda + abaterea lui r de la interpolare
function dp(P, tol) {
  if (P.length <= 2) return P; const keep = new Uint8Array(P.length); keep[0] = keep[P.length - 1] = 1; const st = [[0, P.length - 1]];
  while (st.length) { const [a, b] = st.pop(); const A = P[a], B = P[b]; const dx = B[0] - A[0], dy = B[1] - A[1], L2 = dx * dx + dy * dy; let w = -1, wd = tol;
    for (let i = a + 1; i < b; i++) { const p = P[i]; let t = L2 > 0 ? ((p[0] - A[0]) * dx + (p[1] - A[1]) * dy) / L2 : 0; t = Math.max(0, Math.min(1, t));
      const e = Math.hypot(A[0] + t * dx - p[0], A[1] + t * dy - p[1]) + Math.abs(A[2] + t * (B[2] - A[2]) - p[2]); if (e > wd) { wd = e; w = i; } }
    if (w >= 0) { keep[w] = 1; st.push([a, w], [w, b]); } }
  return P.filter((_, i) => keep[i]);
}
// garda de sapare: pe fiecare coarda, r interpolat <= distanta exacta (altfel se adauga un punct cu r exact)
function gougeGuard(P, dist, tol, depth = 0) {
  const out = [P[0]];
  for (let i = 1; i < P.length; i++) {
    const A = out[out.length - 1], B = P[i]; let worst = null, wv = tol;
    for (let k = 1; k < 8; k++) { const t = k / 8; const x = A[0] + t * (B[0] - A[0]), y = A[1] + t * (B[1] - A[1]); const r = A[2] + t * (B[2] - A[2]); const d = dist(x, y); if (r - d > wv) { wv = r - d; worst = [x, y, d]; } }
    if (worst && depth < 14) { const sub = gougeGuard([A, worst, B], dist, tol, depth + 1); out.push(...sub.slice(1)); } else out.push(B);
  }
  return out;
}
// bucatile unei polilinii 3D unde z < nivel (cu capete interpolate)
function below(P, level) {
  const out = []; let cur = null;
  for (let i = 0; i < P.length; i++) {
    const p = P[i], inn = p[2] < level - 1e-9;
    if (i > 0) { const q = P[i - 1], qin = q[2] < level - 1e-9;
      if (inn !== qin) { const t = (level - q[2]) / (p[2] - q[2]); const m = [q[0] + t * (p[0] - q[0]), q[1] + t * (p[1] - q[1]), level]; if (qin) { cur.push(m); out.push(cur); cur = null; } else cur = [m]; } }
    if (inn) { if (!cur) cur = []; cur.push(p); }
  }
  if (cur && cur.length) out.push(cur);
  return out.filter((c) => c.length >= 2 || (c.length === 1 && P.length === 1));
}
const closeRing = (R) => [...R, R[0]];
// insereaza punctele unde z (a treia coordonata) trece prin `level`, ca taierea la nivel sa fie exacta pe bucati liniare
function insertCrossings(P, level) {
  const out = [P[0]];
  for (let i = 1; i < P.length; i++) { const q = P[i - 1], p = P[i]; const a = q[2] - level, b = p[2] - level;
    if ((a < -1e-12 && b > 1e-12) || (a > 1e-12 && b < -1e-12)) { const t = a / (a - b); out.push([q[0] + t * (p[0] - q[0]), q[1] + t * (p[1] - q[1]), level]); }
    out.push(p); }
  return out;
}
// curata frunzele redundante: o ramura terminala ale carei discuri maximale stau (pana la eps) in discul nodului
// de ramificatie nu schimba suprafata cu mai mult de eps*cot -> se scoate; se repeta pana nu mai scade nimic.
export function pruneRedundant(graph, R, eps) {
  const adj = graph.adj.map((a) => new Set(a)); let removed = 0, changed = true;
  // fiecare nod tine punctele ramurilor deja absorbite in el; testul se face pe TOATE, ca eroarea sa nu se adune
  // din taiere in taiere (fara asta: 0,032 mm pe inima, peste bugetul de 0,007)
  const N = graph.nodes; const absorbed = N.map(() => null);
  const pts = (i) => [[N[i][0], N[i][1], R[i]], ...(absorbed[i] || [])];
  const fits = (p, J) => p[2] <= R[J] - Math.hypot(p[0] - N[J][0], p[1] - N[J][1]) + eps;
  const inDisc = (i, J) => pts(i).every((p) => fits(p, J));
  const absorb = (J, list) => { let a = absorbed[J] || []; for (const i of list) a.push(...pts(i));
    if (a.length > 48) { a.sort((p, q) => (q[2] + Math.hypot(q[0] - N[J][0], q[1] - N[J][1])) - (p[2] + Math.hypot(p[0] - N[J][0], p[1] - N[J][1]))); a = a.slice(0, 48); }
    absorbed[J] = a; };
  while (changed) { changed = false;
    for (let s = 0; s < adj.length; s++) {
      if (adj[s].size !== 1) continue;
      const path = [s]; let prev = s, cur = [...adj[s]][0];
      while (adj[cur].size === 2) { path.push(cur); const nx = [...adj[cur]].find((x) => x !== prev); prev = cur; cur = nx; if (cur === s) break; }
      if (cur === s) continue;
      if (adj[cur].size === 1) { // lant izolat: se reduce la nodul cu raza maxima, daca restul e in discul lui
        path.push(cur); let J = path[0]; for (const i of path) if (R[i] > R[J]) J = i;
        if (path.every((i) => i === J || inDisc(i, J)) && path.length > 1) { for (let k = 1; k < path.length; k++) { adj[path[k - 1]].delete(path[k]); adj[path[k]].delete(path[k - 1]); } removed += path.length - 1; changed = true; graph.isolatedKeep = graph.isolatedKeep || new Set(); graph.isolatedKeep.add(J); absorb(J, path.filter((i) => i !== J)); }
        continue; }
      const J = cur; if (path.every((i) => inDisc(i, J))) { absorb(J, path); const all = [...path, J]; for (let k = 1; k < all.length; k++) { adj[all[k - 1]].delete(all[k]); adj[all[k]].delete(all[k - 1]); } removed += path.length; changed = true; }
    }
  }
  const keep = graph.isolatedKeep || new Set();
  return { nodes: graph.nodes, adj: adj.map((s, i) => (s.size === 0 && !keep.has(i) && !graph.keepIsolated ? [] : [...s])), keepIsolatedSet: keep, removed };
}

export function vcarve(region, graph, P) {
  const { theta, D, dpp, flat } = P; const tan = Math.tan(theta * Math.PI / 360), cot = 1 / tan;
  const tolDP = P.tolDP ?? 0.004, gougeTol = P.gougeTol ?? 0.0005;
  const t0 = performance.now();
  const R = graph.nodes.map((p) => region.dist(p[0], p[1]));
  const keepSet = new Set(); if (graph.keepIsolated) graph.adj.forEach((a, i) => { if (!a.length) keepSet.add(i); });
  const pr = graph.skipPrune ? { adj: graph.adj, keepIsolatedSet: new Set(), removed: 0 } : pruneRedundant(graph, R, P.pruneEps ?? 0.004); for (const i of pr.keepIsolatedSet) keepSet.add(i);
  const chains = buildChains({ nodes: graph.nodes, adj: pr.adj }, keepSet);
  let maxR = 0; const V = [];
  for (const ch of chains) {
    let pts = ch.map((i) => { const p = graph.nodes[i]; maxR = Math.max(maxR, R[i]); return [p[0], p[1], R[i]]; });
    if (pts.length > 1) { pts = dp(pts, tolDP); pts = gougeGuard(pts, region.dist, gougeTol); }
    V.push(pts);
  }
  const wD = D * tan; const hasFlat = maxR > wD + 1e-9;
  // axa: trunchiata unde freza dreapta acopera (r > wD + R), Z final
  let axis = [];
  for (const pts of V) {
    let segs = [pts];
    // `below` pastreaza bucatile cu a treia coordonata (aici r) sub prag: r < wD + R
    if (hasFlat && flat) segs = below(pts, wD + flat.R);
    for (const s of segs) axis.push(insertCrossings(s, wD).map((p) => [p[0], p[1], -Math.min(D, p[2] * cot)]));
  }
  const tAxis = performance.now();
  const vPaths = [...axis]; const ePaths = []; let ringsV = 0, ringsE = 0;
  if (hasFlat) {
    const sv = 2 * (P.cusp ?? 0.05) * tan; // pasul inelelor V pentru o creasta <= cusp
    const F = offset(region.polys, -(wD + 0.0005));
    let Q = F;
    if (flat) { const reach = offset(offset(F, -flat.R), flat.R); Q = difference(F, reach); }
    for (const R of F) { vPaths.push(closeRing(R).map((p) => [p[0], p[1], -D])); ringsV++; }
    const Qx = offset(Q, sv);
    for (let j = 1; j < 100000; j++) {
      const rings = offset(region.polys, -(wD + j * sv)); if (!rings.length) break;
      if (flat && j * sv > flat.R + sv) break;
      for (const piece of clipOpen(rings.map(closeRing), Qx)) { vPaths.push(piece.map((p) => [p[0], p[1], -D])); ringsV++; }
    }
    if (flat) { // buzunarul cu freza dreapta, pe niveluri, din F_k
      const K = Math.ceil(D / dpp - 1e-9); const se = flat.step * 2 * flat.R;
      for (let k = 1; k <= K; k++) { const Lk = Math.min(k * dpp, D); const wk = Lk * tan; const lvl = [];
        for (let j = 0; j < 100000; j++) { const rings = offset(region.polys, -(wk + flat.R + j * se + 0.004)); if (!rings.length) break; for (const R of rings) { lvl.push(closeRing(R).map((p) => [p[0], p[1], -Lk])); ringsE++; } }
        ePaths.push({ level: k, paths: lvl.reverse() }); }
    }
  }
  // trecerile freze V: la trecerea k se taie doar ce e sub nivelul trecerii k-1, la max(z, -k*dpp)
  const maxDepth = Math.min(D, maxR * cot); const K = Math.max(1, Math.ceil(maxDepth / dpp - 1e-9));
  const vPasses = [];
  for (let k = 1; k <= K; k++) { const lvl = []; for (const P3 of vPaths) for (const s of below(P3, -(k - 1) * dpp)) lvl.push(insertCrossings(s, -k * dpp).map((p) => [p[0], p[1], Math.max(p[2], -k * dpp)])); vPasses.push({ level: k, paths: lvl }); }
  const t1 = performance.now();
  return { ops: [...(ePaths.length ? [{ tool: 2, passes: ePaths }] : []), { tool: 1, passes: vPasses }],
    stats: { chains: chains.length, pruned: pr.removed, maxR, hasFlat, ringsV, ringsE, msAxis: tAxis - t0, msTotal: t1 - t0 } };
}

// ordonare lacom: urmatorul traseu = cel mai apropiat capat (cu inversare)
export function order(paths) {
  const left = paths.slice(); const out = []; let cur = [0, 0];
  while (left.length) { let bi = 0, bd = Infinity, rev = false;
    for (let i = 0; i < left.length; i++) { const p = left[i]; const a = p[0], b = p[p.length - 1]; const da = (a[0] - cur[0]) ** 2 + (a[1] - cur[1]) ** 2, db = (b[0] - cur[0]) ** 2 + (b[1] - cur[1]) ** 2; if (da < bd) { bd = da; bi = i; rev = false; } if (db < bd) { bd = db; bi = i; rev = true; } }
    let p = left.splice(bi, 1)[0]; if (rev) p = p.slice().reverse(); out.push(p); cur = p[p.length - 1]; }
  return out;
}
