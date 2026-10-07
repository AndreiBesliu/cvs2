// Candidatul (b): camp de distanta pe grila (EDT exact Felzenszwalb-Huttenlocher, cu transformata de trasaturi)
// + extragerea crestei: o celula e pe axa daca un vecin are trasatura (cel mai apropiat punct exterior) departe de a ei.
// Pozitia e cuantizata la grila; raza o recalculeaza generatorul exact.
export function maGrid(region, { g }) {
  const [X0, Y0, X1, Y1] = region.bbox; const x0 = X0 - g, y0 = Y0 - g; const nx = Math.ceil((X1 - X0) / g) + 3, ny = Math.ceil((Y1 - Y0) / g) + 3; const N = nx * ny;
  const inside = new Uint8Array(N);
  // rasterizare pe randuri (par-impar pe poligoanele normalizate)
  for (let j = 0; j < ny; j++) { const y = y0 + (j + 0.5) * g; const xs = [];
    for (const s of region.segs) if ((s[1] <= y) !== (s[3] <= y)) xs.push(s[0] + (y - s[1]) * (s[2] - s[0]) / (s[3] - s[1]));
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) { const i0 = Math.max(0, Math.ceil((xs[k] - x0) / g - 0.5)), i1 = Math.min(nx - 1, Math.floor((xs[k + 1] - x0) / g - 0.5)); for (let i = i0; i <= i1; i++) inside[j * nx + i] = 1; } }
  // EDT in doua treceri 1D, cu indexul trasaturii
  const INF = 1e20; const f = new Float64Array(N), fi = new Int32Array(N);
  for (let i = 0; i < N; i++) { f[i] = inside[i] ? INF : 0; fi[i] = i; }
  const pass = (n, stride, count, step) => {
    const v = new Int32Array(n), z = new Float64Array(n + 1), ff = new Float64Array(n), fidx = new Int32Array(n);
    for (let c = 0; c < count; c++) { const base = c * step;
      for (let q = 0; q < n; q++) { ff[q] = f[base + q * stride]; fidx[q] = fi[base + q * stride]; }
      let k = 0; v[0] = 0; z[0] = -INF; z[1] = INF;
      for (let q = 1; q < n; q++) { if (ff[q] >= INF) continue; if (ff[v[0]] >= INF) { v[0] = q; continue; }
        let s; while (true) { s = ((ff[q] + q * q) - (ff[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); if (s <= z[k] && k > 0) k--; else break; }
        if (s <= z[k]) { v[k] = q; z[k + 1] = INF; } else { k++; v[k] = q; z[k] = s; z[k + 1] = INF; } }
      if (ff[v[0]] >= INF) continue;
      k = 0; for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; const p = v[k]; f[base + q * stride] = (q - p) * (q - p) + ff[p]; fi[base + q * stride] = fidx[p]; } }
  };
  pass(ny, nx, nx, 1); // coloane
  pass(nx, 1, ny, nx); // randuri
  const nodes = [], idOf = new Int32Array(N).fill(-1);
  const thr2 = 4; // trasaturi la peste 2 celule distanta
  for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) { const c = j * nx + i; if (!inside[c]) continue; const a = fi[c]; const ax = a % nx, ay = (a / nx) | 0;
    let ridge = false; for (const n of [c + 1, c - 1, c + nx, c - nx]) { if (!inside[n]) continue; const b = fi[n]; const bx = b % nx, by = (b / nx) | 0; if ((ax - bx) ** 2 + (ay - by) ** 2 > thr2) { ridge = true; break; } }
    if (ridge) { idOf[c] = nodes.length; nodes.push([x0 + (i + 0.5) * g, y0 + (j + 0.5) * g]); } }
  // fara inlantuire: crestele de grila au 1-2 celule latime si cicluri; pentru masurarea preciziei axei,
  // fiecare celula de creasta devine o plonjare (numarul de miscari NU e reprezentativ pentru (b))
  const adj = nodes.map(() => []);
  return { nodes, adj, keepIsolated: true, skipPrune: true, stats: { cells: N, ridgeCells: nodes.length, g } };
}
