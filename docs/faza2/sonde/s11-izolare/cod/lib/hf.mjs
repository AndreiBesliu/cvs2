// Sonda s5-relief (aruncabila). Harta de inaltime (heightfield) pe grila: esantionare, drop-cutter, operatii.
import { rise } from './geom.mjs';

// grila: nodul (i,j) la (x0 + i*h, y0 + j*h); celula nodului = patratul de latura h centrat pe nod
export function makeGrid(nx, ny, h, x0 = 0, y0 = 0) { return { nx, ny, h, x0, y0 }; }

// esantionare in nod (ce face o rasterizare obisnuita / GPU) vs maxim pe celula (conservativ)
export function sampleNodes(g, surf) {
  const H = new Float32Array(g.nx * g.ny);
  for (let j = 0; j < g.ny; j++) for (let i = 0; i < g.nx; i++) H[j * g.nx + i] = surf.z(g.x0 + i * g.h, g.y0 + j * g.h);
  return H;
}
export function sampleCellMax(g, surf) {
  const H = new Float32Array(g.nx * g.ny), hh = g.h / 2;
  for (let j = 0; j < g.ny; j++) for (let i = 0; i < g.nx; i++) {
    const x = g.x0 + i * g.h, y = g.y0 + j * g.h;
    // rotunjire in sus la float32: maximul stocat nu are voie sa scada sub cel real
    H[j * g.nx + i] = roundUpF32(surf.cellMax(x - hh, x + hh, y - hh, y + hh));
  }
  return H;
}
const f32 = new Float32Array(1);
export function roundUpF32(v) { f32[0] = v; let r = f32[0]; if (r < v) { r = r + Math.max(Math.abs(r) * 1.2e-7, 1e-30); } return r; }

// lista de deplasamente (di,dj,rise) pentru discul frezei, sortata dupa rise (pentru oprirea timpurie)
// mode 'node': distanta nod-nod; 'cell': distanta minima nod->celula; 'capsule': distanta minima
// segment [i-1,i+1] -> celula (garantie pe tot segmentul de raster pe X, lema "maxim pe vecini")
export function offsets(tool, h, mode = 'node') {
  const R = tool.R, n = Math.ceil(R / h) + 2, out = [];
  for (let dj = -n; dj <= n; dj++) for (let di = -n; di <= n; di++) {
    let gx, gy;
    if (mode === 'node') { gx = Math.abs(di); gy = Math.abs(dj); }
    else if (mode === 'cell') { gx = Math.max(0, Math.abs(di) - 0.5); gy = Math.max(0, Math.abs(dj) - 0.5); }
    else { gx = Math.max(0, Math.abs(di) - 1.5); gy = Math.max(0, Math.abs(dj) - 0.5); }
    const d = h * Math.hypot(gx, gy);
    if (d > R + 1e-12) continue;
    out.push([di, dj, rise(tool, Math.min(d, R))]);
  }
  out.sort((a, b) => a[2] - b[2]);
  const di = new Int32Array(out.length), dj = new Int32Array(out.length), rs = new Float64Array(out.length);
  out.forEach((o, k) => { di[k] = o[0]; dj[k] = o[1]; rs[k] = o[2]; });
  return { di, dj, rs, n: out.length, reach: n };
}

// CL pe un rand de raster (j), la toate nodurile i: max(H(q) - rise)
export function dropRow(g, H, off, j, out, floorZ = 0) {
  const { nx, ny } = g;
  for (let i = 0; i < nx; i++) {
    let best = floorZ;
    for (let k = 0; k < off.n; k++) {
      const ii = i + off.di[k], jj = j + off.dj[k];
      if (ii < 0 || jj < 0 || ii >= nx || jj >= ny) continue;
      const v = H[jj * nx + ii] - off.rs[k];
      if (v > best) best = v;
    }
    out[i] = best;
  }
  return out;
}

// varianta cu oprire timpurie: Mloc = maximul lui H pe fereastra; offseturile sunt sortate dupa rise,
// deci cand Mloc - rise_k <= best, niciun termen ramas nu mai poate castiga
export function windowMax(g, H, r) { // maxim glisant separabil (2r+1)^2, O(n*r) simplu (suficient pentru sonda)
  const { nx, ny } = g, T = new Float32Array(nx * ny), M = new Float32Array(nx * ny);
  for (let j = 0; j < ny; j++) {
    const o = j * nx;
    for (let i = 0; i < nx; i++) { let m = -Infinity; const a = Math.max(0, i - r), b = Math.min(nx - 1, i + r); for (let k = a; k <= b; k++) if (H[o + k] > m) m = H[o + k]; T[o + i] = m; }
  }
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
    let m = -Infinity; const a = Math.max(0, j - r), b = Math.min(ny - 1, j + r);
    for (let k = a; k <= b; k++) { const v = T[k * nx + i]; if (v > m) m = v; }
    M[j * nx + i] = m;
  }
  return M;
}
export function dropRowEarly(g, H, Mwin, off, j, out, floorZ = 0) {
  const { nx, ny } = g;
  for (let i = 0; i < nx; i++) {
    let best = floorZ; const mloc = Mwin[j * nx + i];
    for (let k = 0; k < off.n; k++) {
      if (mloc - off.rs[k] <= best) break;
      const ii = i + off.di[k], jj = j + off.dj[k];
      if (ii < 0 || jj < 0 || ii >= nx || jj >= ny) continue;
      const v = H[jj * nx + ii] - off.rs[k];
      if (v > best) best = v;
    }
    out[i] = best;
  }
  return out;
}

// varianta "veche": CL in noduri + maxim pe +-1 nod in X si Y (lema coardei, aplicata pe grila esantionata)
export function chordFilterRow(g, H, off, j, floorZ = 0) {
  const rows = [j - 1, j, j + 1].map((jj) => (jj >= 0 && jj < g.ny ? dropRow(g, H, off, jj, new Float64Array(g.nx), floorZ) : null));
  const out = new Float64Array(g.nx);
  for (let i = 0; i < g.nx; i++) {
    let m = -Infinity;
    for (const r of rows) if (r) for (let d = -1; d <= 1; d++) { const ii = i + d; if (ii >= 0 && ii < g.nx && r[ii] > m) m = r[ii]; }
    out[i] = m;
  }
  return out;
}

// verificare pe segmente: traseul liniar intre noduri, esantionat de `sub` ori pe segment, contra CL-ului exact
export function checkRowAgainstExact(g, row, j, surf, tool, sub = 16, i0 = 0, i1 = g.nx - 1) {
  const y = g.y0 + j * g.h; let gouge = 0, exMax = -Infinity, exSum = 0, n = 0, gougeAt = null;
  for (let i = i0; i < i1; i++) {
    for (let s = 0; s <= sub; s++) {
      if (s === sub && i < i1 - 1) continue;
      const t = s / sub, x = g.x0 + (i + t) * g.h;
      const zp = (1 - t) * row[i] + t * row[i + 1];
      const ze = surf.cl(tool, x, y);
      const e = zp - ze;
      if (-e > gouge) { gouge = -e; gougeAt = x; }
      if (e > exMax) exMax = e; exSum += e; n++;
    }
  }
  return { gouge, gougeAt, exMax, exMean: exSum / n };
}

// ---------- operatii de relief pe straturi (CPU) ----------
export function combine(op, A, B, out) {
  const n = A.length;
  if (op === 'add') for (let k = 0; k < n; k++) out[k] = A[k] + B[k];
  else if (op === 'max') for (let k = 0; k < n; k++) { const a = A[k], b = B[k]; out[k] = a > b ? a : b; }
  else if (op === 'min') for (let k = 0; k < n; k++) { const a = A[k], b = B[k]; out[k] = a < b ? a : b; }
  return out;
}
export function gaussKernel(sigma) {
  const r = Math.ceil(3 * sigma), k = new Float32Array(2 * r + 1); let s = 0;
  for (let i = -r; i <= r; i++) { k[i + r] = Math.exp(-(i * i) / (2 * sigma * sigma)); s += k[i + r]; }
  for (let i = 0; i < k.length; i++) k[i] /= s;
  return { k, r };
}
// blur separabil; randuri [j0,j1) (pentru impartirea pe fire); margini prin replicare
export function blurH(src, dst, nx, ny, K, j0 = 0, j1 = ny) {
  const { k, r } = K;
  for (let j = j0; j < j1; j++) {
    const o = j * nx;
    for (let i = 0; i < nx; i++) {
      let s = 0;
      if (i >= r && i < nx - r) for (let t = -r; t <= r; t++) s += k[t + r] * src[o + i + t];
      else for (let t = -r; t <= r; t++) { let ii = i + t; ii = ii < 0 ? 0 : ii >= nx ? nx - 1 : ii; s += k[t + r] * src[o + ii]; }
      dst[o + i] = s;
    }
  }
}
export function blurV(src, dst, nx, ny, K, j0 = 0, j1 = ny) {
  const { k, r } = K;
  for (let j = j0; j < j1; j++) {
    const o = j * nx;
    for (let i = 0; i < nx; i++) dst[o + i] = 0;
    for (let t = -r; t <= r; t++) {
      let jj = j + t; jj = jj < 0 ? 0 : jj >= ny ? ny - 1 : jj;
      const w = k[t + r], oo = jj * nx;
      for (let i = 0; i < nx; i++) dst[o + i] += w * src[oo + i];
    }
  }
}
// pensula de sculptura: adauga un clopot cos^2 de raza rb (pixeli), intensitate a; intoarce dreptunghiul murdar
export function dab(H, nx, ny, cx, cy, rb, a) {
  const i0 = Math.max(0, Math.floor(cx - rb)), i1 = Math.min(nx - 1, Math.ceil(cx + rb));
  const j0 = Math.max(0, Math.floor(cy - rb)), j1 = Math.min(ny - 1, Math.ceil(cy + rb));
  const inv = 1 / rb;
  for (let j = j0; j <= j1; j++) {
    const dy = (j - cy) * inv, o = j * nx;
    for (let i = i0; i <= i1; i++) {
      const dx = (i - cx) * inv, d2 = dx * dx + dy * dy;
      if (d2 < 1) { const c = Math.cos(Math.sqrt(d2) * Math.PI / 2); H[o + i] += a * c * c; }
    }
  }
  return { i0, j0, w: i1 - i0 + 1, hgt: j1 - j0 + 1 };
}
// netezire locala (pensula): blur 3x3 repetat pe discul pensulei, amestecat cu cos^2
export function smoothDab(H, nx, ny, cx, cy, rb, iters, tmp) {
  const i0 = Math.max(1, Math.floor(cx - rb)), i1 = Math.min(nx - 2, Math.ceil(cx + rb));
  const j0 = Math.max(1, Math.floor(cy - rb)), j1 = Math.min(ny - 2, Math.ceil(cy + rb));
  const w = i1 - i0 + 1, hh = j1 - j0 + 1;
  for (let it = 0; it < iters; it++) {
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const o = j * nx + i;
      tmp[(j - j0) * w + (i - i0)] = (4 * H[o] + 2 * (H[o - 1] + H[o + 1] + H[o - nx] + H[o + nx]) + H[o - nx - 1] + H[o - nx + 1] + H[o + nx - 1] + H[o + nx + 1]) / 16;
    }
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const dx = (i - cx) / rb, dy = (j - cy) / rb, d2 = dx * dx + dy * dy;
      if (d2 < 1) { const c = Math.cos(Math.sqrt(d2) * Math.PI / 2), m = c * c; const o = j * nx + i; H[o] = H[o] * (1 - m) + tmp[(j - j0) * w + (i - i0)] * m; }
    }
  }
  return { i0, j0, w, hgt: hh };
}
