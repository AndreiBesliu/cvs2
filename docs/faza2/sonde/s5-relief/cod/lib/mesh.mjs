// Sonda s5-relief (aruncabila). Plase de triunghiuri: generare, STL binar, drop-cutter EXACT pe triunghiuri,
// rasterizare in nod si rasterizare conservativa (maximul pe celula, prin taierea triunghiului cu coloana celulei).
import { readFileSync, writeFileSync } from 'node:fs';
// mutanti pentru a arata ca oracolele pot pica: S5_MUTANT=faramuchii | farafata
const MUT = (typeof process !== 'undefined' && process.env.S5_MUTANT) || '';

// ---------- generare ----------
// suprafata parametrica f(u,v) pe nu x nv patrate (2 triunghiuri fiecare); wrapU/wrapV inchid suprafata
export function paramMesh(f, nu, nv, wrapU, wrapV, list) {
  const P = (i, j) => f((wrapU ? i % nu : i) / nu, (wrapV ? j % nv : j) / nv);
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = P(i, j), b = P(i + 1, j), c = P(i + 1, j + 1), d = P(i, j + 1);
    list.push(a, b, c, a, c, d);
  }
  return list;
}
export function toTriArray(pts) { // pts: lista de [x,y,z], cate 3 pe triunghi
  const T = new Float64Array(pts.length * 3);
  for (let k = 0; k < pts.length; k++) { T[3 * k] = pts[k][0]; T[3 * k + 1] = pts[k][1]; T[3 * k + 2] = pts[k][2]; }
  return T;
}
// semisfera UV (varfuri pe sfera) + inel de baza la z=0 pana la Rb
export function uvHemisphere(cx, cy, Rs, nTheta, nPhi, Rb) {
  const pts = [];
  paramMesh((u, v) => { const ph = 2 * Math.PI * u, th = (Math.PI / 2) * v; return [cx + Rs * Math.sin(th) * Math.cos(ph), cy + Rs * Math.sin(th) * Math.sin(ph), Rs * Math.cos(th)]; }, nPhi, nTheta, true, false, pts);
  paramMesh((u, v) => { const ph = 2 * Math.PI * u, r = Rs + (Rb - Rs) * v; return [cx + r * Math.cos(ph), cy + r * Math.sin(ph), 0]; }, nPhi, 1, true, false, pts);
  return toTriArray(pts);
}
// scena de ~1,4 M triunghiuri: sfera, tor in picioare (cu subtaieri), nod toric, placa ondulata
export function sceneMesh(scale = 1) {
  const pts = [], n = (k) => Math.max(8, Math.round(k * scale));
  paramMesh((u, v) => [u * 200, v * 200, 2 + 1.5 * Math.sin(u * 200 / 7) * Math.cos(v * 200 / 9)], n(500), n(500), false, false, pts);
  paramMesh((u, v) => { const ph = 2 * Math.PI * u, th = Math.PI * v; return [100 + 40 * Math.sin(th) * Math.cos(ph), 100 + 40 * Math.sin(th) * Math.sin(ph), 40 * Math.cos(th)]; }, n(600), n(300), true, false, pts);
  paramMesh((u, v) => { const a = 2 * Math.PI * u, b = 2 * Math.PI * v; const r = 55 + 12 * Math.cos(b); return [100 + 12 * Math.sin(b), 100 + r * Math.cos(a), 30 + r * Math.sin(a)]; }, n(800), n(200), true, true, pts);
  const knot = (t) => { const p = 2, q = 3, r = 2 + Math.cos(q * t); return [100 + 18 * r * Math.cos(p * t), 100 + 18 * r * Math.sin(p * t), 60 + 18 * Math.sin(q * t)]; };
  paramMesh((u, v) => { // tub de raza 6 in jurul nodului toric, cadru aproximativ prin diferente finite
    const t = 2 * Math.PI * u, e = 1e-4, c = knot(t), c2 = knot(t + e);
    let T = [c2[0] - c[0], c2[1] - c[1], c2[2] - c[2]]; const lt = Math.hypot(...T); T = T.map((x) => x / lt);
    let N = [-T[1], T[0], 0]; const ln = Math.hypot(...N) || 1; N = N.map((x) => x / ln);
    const B = [T[1] * N[2] - T[2] * N[1], T[2] * N[0] - T[0] * N[2], T[0] * N[1] - T[1] * N[0]];
    const a = 2 * Math.PI * v; return [0, 1, 2].map((k) => c[k] + 6 * (Math.cos(a) * N[k] + Math.sin(a) * B[k]));
  }, n(1000), n(100), true, true, pts);
  return toTriArray(pts);
}

// ---------- STL binar ----------
export function writeSTL(path, T) {
  const n = T.length / 9, buf = Buffer.alloc(84 + 50 * n);
  buf.write('s5-relief scena generata (fara licenta, cod propriu)', 0); buf.writeUInt32LE(n, 80);
  let o = 84;
  for (let k = 0; k < n; k++) { o += 12; for (let q = 0; q < 9; q++) { buf.writeFloatLE(T[9 * k + q], o); o += 4; } o += 2; }
  writeFileSync(path, buf);
}
export function readSTL(path) {
  const b = readFileSync(path), n = b.readUInt32LE(80);
  if (b.length !== 84 + 50 * n) throw new Error('STL binar invalid');
  const T = new Float32Array(9 * n); let o = 84;
  for (let k = 0; k < n; k++) { o += 12; for (let q = 0; q < 9; q++) { T[9 * k + q] = b.readFloatLE(o); o += 4; } o += 2; }
  return T;
}

// ---------- index spatial + drop-cutter exact ----------
export class MeshIndex {
  constructor(T, cell) {
    const n = T.length / 9; this.T = T; this.n = n; this.cell = cell;
    const bb = new Float64Array(5 * n); let X0 = Infinity, Y0 = Infinity, X1 = -Infinity, Y1 = -Infinity;
    for (let k = 0; k < n; k++) {
      const o = 9 * k; const xs = [T[o], T[o + 3], T[o + 6]], ys = [T[o + 1], T[o + 4], T[o + 7]], zs = [T[o + 2], T[o + 5], T[o + 8]];
      bb[5 * k] = Math.min(...xs); bb[5 * k + 1] = Math.max(...xs); bb[5 * k + 2] = Math.min(...ys); bb[5 * k + 3] = Math.max(...ys); bb[5 * k + 4] = Math.max(...zs);
      X0 = Math.min(X0, bb[5 * k]); X1 = Math.max(X1, bb[5 * k + 1]); Y0 = Math.min(Y0, bb[5 * k + 2]); Y1 = Math.max(Y1, bb[5 * k + 3]);
    }
    this.bb = bb; this.X0 = X0; this.Y0 = Y0; this.gx = Math.max(1, Math.ceil((X1 - X0) / cell) + 1); this.gy = Math.max(1, Math.ceil((Y1 - Y0) / cell) + 1);
    const cnt = new Uint32Array(this.gx * this.gy + 1);
    const span = (k, f) => { const i0 = Math.floor((bb[5 * k] - X0) / cell), i1 = Math.floor((bb[5 * k + 1] - X0) / cell), j0 = Math.floor((bb[5 * k + 2] - Y0) / cell), j1 = Math.floor((bb[5 * k + 3] - Y0) / cell); for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) f(j * this.gx + i); };
    for (let k = 0; k < n; k++) span(k, (c) => cnt[c + 1]++);
    for (let c = 0; c < this.gx * this.gy; c++) cnt[c + 1] += cnt[c];
    const fill = cnt.slice(), ids = new Uint32Array(cnt[this.gx * this.gy]);
    for (let k = 0; k < n; k++) span(k, (c) => { ids[fill[c]++] = k; });
    this.start = cnt; this.ids = ids; this.stamp = new Uint32Array(n); this.qid = 0; this.visited = 0; this.evaluated = 0;
  }
  // cota varfului frezei in (px,py): maximul exact peste triunghiuri (varfuri, muchii, fata, muchia discului), plus podeaua
  drop(tool, px, py, floorZ = -Infinity) {
    const R = tool.R, R2 = R * R, kind = tool.kind === 'ball' ? 0 : tool.kind === 'flat' ? 1 : 2, kc = kind === 2 ? 1 / Math.tan(tool.alpha) : 0;
    const riseR = kind === 0 ? R : kind === 1 ? 0 : R * kc;
    const rise = (r) => (kind === 0 ? R - Math.sqrt(Math.max(0, R2 - r * r)) : kind === 1 ? 0 : r * kc);
    const vert = (vx, vy, vz, best) => { const r2 = (vx - px) * (vx - px) + (vy - py) * (vy - py); if (r2 <= R2) { const v = vz - rise(Math.sqrt(r2)); if (v > best) return v; } return best; };
    const fe = (z0, m, s, d, rho) => (kind === 0 ? z0 + m * s - R + Math.sqrt(Math.max(0, rho * rho - s * s)) : z0 + m * s - rise(Math.min(R, Math.sqrt(d * d + s * s))));
    const edge = (Px, Py, Pz, Qx, Qy, Qz, best) => {
      const ex = Qx - Px, ey = Qy - Py, L2 = ex * ex + ey * ey; if (L2 < 1e-24) return best;
      const L = Math.sqrt(L2), ux = ex / L, uy = ey / L, wx = px - Px, wy = py - Py;
      const s0 = wx * ux + wy * uy, d = Math.abs(wx * uy - wy * ux); if (d > R) return best;
      const rho = Math.sqrt(Math.max(0, R2 - d * d)), lo = Math.max(-rho, -s0), hi = Math.min(rho, L - s0); if (lo > hi) return best;
      const m = (Qz - Pz) / L, z0 = Pz + m * s0;
      let v = fe(z0, m, lo, d, rho); const v2 = fe(z0, m, hi, d, rho); if (v2 > v) v = v2;
      let ss = NaN;
      if (kind === 0) ss = (m * rho) / Math.sqrt(1 + m * m);
      else if (kind === 2 && Math.abs(m) < kc) ss = (d * m) / Math.sqrt(kc * kc - m * m);
      if (ss >= lo && ss <= hi) { const v3 = fe(z0, m, ss, d, rho); if (v3 > v) v = v3; }
      return v > best ? v : best;
    };
    let best = floorZ; const T = this.T, bb = this.bb;
    const qid = ++this.qid; if (qid === 0xffffffff) { this.stamp.fill(0); this.qid = 1; }
    const c = this.cell, i0 = Math.max(0, Math.floor((px - R - this.X0) / c)), i1 = Math.min(this.gx - 1, Math.floor((px + R - this.X0) / c));
    const j0 = Math.max(0, Math.floor((py - R - this.Y0) / c)), j1 = Math.min(this.gy - 1, Math.floor((py + R - this.Y0) / c));
    // celula centrala intai: da repede un "best" bun pentru taiere
    const ci = Math.floor((px - this.X0) / c), cj = Math.floor((py - this.Y0) / c);
    const order = [];
    if (ci >= i0 && ci <= i1 && cj >= j0 && cj <= j1) order.push(cj * this.gx + ci);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) order.push(j * this.gx + i);
    for (const cellId of order) {
      for (let q = this.start[cellId]; q < this.start[cellId + 1]; q++) {
        const k = this.ids[q]; if (this.stamp[k] === qid) continue; this.stamp[k] = qid; this.visited++;
        const b = 5 * k; const dx = Math.max(0, bb[b] - px, px - bb[b + 1]), dy = Math.max(0, bb[b + 2] - py, py - bb[b + 3]);
        const d2 = dx * dx + dy * dy; if (d2 > R2) continue;
        if (bb[b + 4] - rise(Math.sqrt(d2)) <= best) continue;
        this.evaluated++;
        const o = 9 * k;
        const ax = T[o], ay = T[o + 1], az = T[o + 2], bx = T[o + 3], by = T[o + 4], bz = T[o + 5], cx = T[o + 6], cy = T[o + 7], cz = T[o + 8];
        // varfuri
        best = vert(ax, ay, az, best); best = vert(bx, by, bz, best); best = vert(cx, cy, cz, best);
        // muchii
        if (MUT !== 'faramuchii') { best = edge(ax, ay, az, bx, by, bz, best); best = edge(bx, by, bz, cx, cy, cz, best); best = edge(cx, cy, cz, ax, ay, az, best); }
        // fata
        let nx = (by - ay) * (cz - az) - (bz - az) * (cy - ay), ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az), nz = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
        if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; }
        const nl = Math.hypot(nx, ny, nz); if (nl === 0 || nz <= 1e-12 * nl || MUT === 'farafata') continue;
        nx /= nl; ny /= nl; nz /= nl;
        const zp = (x, y) => az - (nx * (x - ax) + ny * (y - ay)) / nz;
        const s = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
        const inside = (x, y) => { const e0 = (bx - ax) * (y - ay) - (by - ay) * (x - ax), e1 = (cx - bx) * (y - by) - (cy - by) * (x - bx), e2 = (ax - cx) * (y - cy) - (ay - cy) * (x - cx); return s > 0 ? e0 >= 0 && e1 >= 0 && e2 >= 0 : e0 <= 0 && e1 <= 0 && e2 <= 0; };
        if (inside(px, py)) { const v = zp(px, py); if (v > best) best = v; } // varful/centrul pe fata
        if (kind === 0) { const qx = px - R * nx, qy = py - R * ny; if (inside(qx, qy)) { const v = zp(qx, qy) - (R - R * nz); if (v > best) best = v; } }
        const gl = Math.hypot(nx, ny);
        if (gl > 1e-15) { const qx = px - (R * nx) / gl, qy = py - (R * ny) / gl; if (inside(qx, qy)) { const v = zp(qx, qy) - riseR; if (v > best) best = v; } }
      }
    }
    return best;
  }
}

// cel mai apropiat punct de pe triunghi (Ericson), pentru raza minima a plasei inscrise in sfera
export function distPointTri(p, a, b, c) {
  const sub = (u, v) => [u[0] - v[0], u[1] - v[1], u[2] - v[2]], dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  const ab = sub(b, a), ac = sub(c, a), ap = sub(p, a); const d1 = dot(ab, ap), d2 = dot(ac, ap);
  const D = (q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
  if (d1 <= 0 && d2 <= 0) return D(a);
  const bp = sub(p, b), d3 = dot(ab, bp), d4 = dot(ac, bp); if (d3 >= 0 && d4 <= d3) return D(b);
  const vc = d1 * d4 - d3 * d2; if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); return D([a[0] + v * ab[0], a[1] + v * ab[1], a[2] + v * ab[2]]); }
  const cp = sub(p, c), d5 = dot(ab, cp), d6 = dot(ac, cp); if (d6 >= 0 && d5 <= d6) return D(c);
  const vb = d5 * d2 - d1 * d6; if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); return D([a[0] + w * ac[0], a[1] + w * ac[1], a[2] + w * ac[2]]); }
  const va = d3 * d6 - d5 * d4; if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const w = (d4 - d3) / (d4 - d3 + (d5 - d6)); return D([b[0] + w * (c[0] - b[0]), b[1] + w * (c[1] - b[1]), b[2] + w * (c[2] - b[2])]); }
  const den = 1 / (va + vb + vc), v = vb * den, w = vc * den;
  return D([a[0] + ab[0] * v + ac[0] * w, a[1] + ab[1] * v + ac[1] * w, a[2] + ab[2] * v + ac[2] * w]);
}

// ---------- rasterizare ----------
// in nod: ce face rasterizarea obisnuita (si GPU): inaltimea triunghiului in centrul celulei
export function rasterNodes(T, g, floorZ = 0) {
  const { nx, ny, h, x0, y0 } = g, H = new Float32Array(nx * ny).fill(floorZ), n = T.length / 9;
  for (let k = 0; k < n; k++) {
    const o = 9 * k; const ax = T[o], ay = T[o + 1], az = T[o + 2], bx = T[o + 3], by = T[o + 4], bz = T[o + 5], cx = T[o + 6], cy = T[o + 7], cz = T[o + 8];
    const s = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax); if (s === 0) continue;
    const i0 = Math.max(0, Math.ceil((Math.min(ax, bx, cx) - x0) / h)), i1 = Math.min(nx - 1, Math.floor((Math.max(ax, bx, cx) - x0) / h));
    const j0 = Math.max(0, Math.ceil((Math.min(ay, by, cy) - y0) / h)), j1 = Math.min(ny - 1, Math.floor((Math.max(ay, by, cy) - y0) / h));
    for (let j = j0; j <= j1; j++) {
      const y = y0 + j * h;
      for (let i = i0; i <= i1; i++) {
        const x = x0 + i * h;
        const w0 = ((bx - x) * (cy - y) - (by - y) * (cx - x)) / s, w1 = ((cx - x) * (ay - y) - (cy - y) * (ax - x)) / s, w2 = 1 - w0 - w1;
        if (w0 < 0 || w1 < 0 || w2 < 0) continue;
        const z = w0 * az + w1 * bz + w2 * cz; const q = j * nx + i; if (z > H[q]) H[q] = z;
      }
    }
  }
  return H;
}
// conservativ: maximul exact al triunghiului pe coloana celulei (taiere Sutherland-Hodgman in 3D, pe planele x/y ale celulei)
const PX = new Float64Array(16), PY = new Float64Array(16), PZ = new Float64Array(16), QX = new Float64Array(16), QY = new Float64Array(16), QZ = new Float64Array(16);
function clipAxis(n, axis, c, sgn, sx, sy, sz, dx, dy, dz) {
  let m = 0;
  for (let k = 0; k < n; k++) {
    const k2 = (k + 1) % n;
    const ca = sgn * ((axis === 0 ? sx[k] : sy[k]) - c), cb = sgn * ((axis === 0 ? sx[k2] : sy[k2]) - c);
    if (ca >= 0) { dx[m] = sx[k]; dy[m] = sy[k]; dz[m] = sz[k]; m++; }
    if ((ca >= 0) !== (cb >= 0)) { const t = ca / (ca - cb); dx[m] = sx[k] + t * (sx[k2] - sx[k]); dy[m] = sy[k] + t * (sy[k2] - sy[k]); dz[m] = sz[k] + t * (sz[k2] - sz[k]); m++; }
  }
  return m;
}
export function rasterCellMax(T, g, floorZ = 0) {
  const { nx, ny, h, x0, y0 } = g, H = new Float32Array(nx * ny).fill(floorZ), n = T.length / 9, hh = h / 2;
  const f32 = new Float32Array(1);
  for (let k = 0; k < n; k++) {
    const o = 9 * k; const ax = T[o], ay = T[o + 1], az = T[o + 2], bx = T[o + 3], by = T[o + 4], bz = T[o + 5], cx = T[o + 6], cy = T[o + 7], cz = T[o + 8];
    const mnx = Math.min(ax, bx, cx), mxx = Math.max(ax, bx, cx), mny = Math.min(ay, by, cy), mxy = Math.max(ay, by, cy);
    const i0 = Math.max(0, Math.ceil((mnx - x0) / h - 0.5)), i1 = Math.min(nx - 1, Math.floor((mxx - x0) / h + 0.5));
    const j0 = Math.max(0, Math.ceil((mny - y0) / h - 0.5)), j1 = Math.min(ny - 1, Math.floor((mxy - y0) / h + 0.5));
    const zmax = Math.max(az, bz, cz);
    for (let j = j0; j <= j1; j++) {
      const cy0 = y0 + j * h - hh, cy1 = cy0 + h;
      for (let i = i0; i <= i1; i++) {
        const q = j * nx + i; if (H[q] >= zmax) continue; // nu poate creste
        const cx0 = x0 + i * h - hh, cx1 = cx0 + h;
        let m;
        if (mnx >= cx0 && mxx <= cx1 && mny >= cy0 && mxy <= cy1) m = zmax; // triunghiul intreg in celula
        else {
          PX[0] = ax; PY[0] = ay; PZ[0] = az; PX[1] = bx; PY[1] = by; PZ[1] = bz; PX[2] = cx; PY[2] = cy; PZ[2] = cz;
          let c = clipAxis(3, 0, cx0, 1, PX, PY, PZ, QX, QY, QZ); if (!c) continue;
          c = clipAxis(c, 0, cx1, -1, QX, QY, QZ, PX, PY, PZ); if (!c) continue;
          c = clipAxis(c, 1, cy0, 1, PX, PY, PZ, QX, QY, QZ); if (!c) continue;
          c = clipAxis(c, 1, cy1, -1, QX, QY, QZ, PX, PY, PZ); if (!c) continue;
          m = -Infinity; for (let t = 0; t < c; t++) if (PZ[t] > m) m = PZ[t];
        }
        f32[0] = m; let r = f32[0]; if (r < m) r += Math.max(Math.abs(r) * 1.2e-7, 1e-30); // rotunjire in sus
        if (r > H[q]) H[q] = r;
      }
    }
  }
  return H;
}
