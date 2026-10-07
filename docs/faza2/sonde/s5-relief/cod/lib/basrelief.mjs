// Sonda s5-relief (aruncabila). Bas-relief din harta de inaltime a unui model 3D:
// gradienti -> taiere discontinuitati (prag) -> compresie logaritmica -> reconstructie Poisson (multigrid, Neumann).
// Operatorul: laplacianul de graf (vecinii care exista), deci problema discreta are solutie exacta pana la o constanta.

export function gradients(H, nx, ny) {
  const gx = new Float32Array(nx * ny), gy = new Float32Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const k = j * nx + i;
    gx[k] = i < nx - 1 ? H[k + 1] - H[k] : 0;
    gy[k] = j < ny - 1 ? H[k + nx] - H[k] : 0;
  }
  return { gx, gy };
}
// compresie: panta s = g/h; s' = sign(s) ln(1 + a|s|)/a; |s| > prag -> 0 (silueta, salt de adancime)
export function compress(g, h, a, prag) {
  const o = new Float32Array(g.length);
  for (let k = 0; k < g.length; k++) {
    const s = g[k] / h, as = Math.abs(s);
    o[k] = as > prag ? 0 : a > 0 ? (Math.sign(s) * Math.log1p(a * as) / a) * h : g[k];
  }
  return o;
}
export function divergence(gx, gy, nx, ny) {
  const f = new Float32Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const k = j * nx + i;
    f[k] = gx[k] - (i > 0 ? gx[k - 1] : 0) + gy[k] - (j > 0 ? gy[k - nx] : 0);
  }
  return f;
}
// L u = suma(u_vecin - u) pe vecinii existenti
export function applyL(u, nx, ny, out) {
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const k = j * nx + i, c = u[k]; let s = 0;
    if (i > 0) s += u[k - 1] - c; if (i < nx - 1) s += u[k + 1] - c; if (j > 0) s += u[k - nx] - c; if (j < ny - 1) s += u[k + nx] - c;
    out[k] = s;
  }
  return out;
}
function gsRB(u, f, nx, ny, sweeps) {
  for (let s = 0; s < sweeps; s++) for (let color = 0; color < 2; color++) {
    for (let j = 0; j < ny; j++) {
      const o = j * nx; let i = (j + color) & 1;
      for (; i < nx; i += 2) {
        const k = o + i; let sum = 0, deg = 0;
        if (i > 0) { sum += u[k - 1]; deg++; } if (i < nx - 1) { sum += u[k + 1]; deg++; }
        if (j > 0) { sum += u[k - nx]; deg++; } if (j < ny - 1) { sum += u[k + nx]; deg++; }
        if (deg) u[k] = (sum - f[k]) / deg;
      }
    }
  }
}
function residual(u, f, nx, ny, r) { applyL(u, nx, ny, r); for (let k = 0; k < r.length; k++) r[k] = f[k] - r[k]; return r; }
function restrict(r, nx, ny, cx, cy) { // suma pe 2x2 (scalarea laplacianului de graf la pas dublu)
  const c = new Float32Array(cx * cy);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) c[(j >> 1) * cx + (i >> 1)] += r[j * nx + i];
  return c;
}
function prolongAdd(e, cx, cy, u, nx, ny) { // biliniar centrat pe celule (9/16, 3/16, 3/16, 1/16), margini prin replicare
  for (let j = 0; j < ny; j++) {
    const J = j >> 1, J2 = Math.min(cy - 1, Math.max(0, J + ((j & 1) ? 1 : -1)));
    for (let i = 0; i < nx; i++) {
      const I = i >> 1, I2 = Math.min(cx - 1, Math.max(0, I + ((i & 1) ? 1 : -1)));
      u[j * nx + i] += (9 * e[J * cx + I] + 3 * e[J * cx + I2] + 3 * e[J2 * cx + I] + e[J2 * cx + I2]) / 16;
    }
  }
}
function vcycle(u, f, nx, ny) {
  if (nx * ny <= 64) { gsRB(u, f, nx, ny, 200); return; }
  gsRB(u, f, nx, ny, 2);
  const r = residual(u, f, nx, ny, new Float32Array(nx * ny));
  const cx = (nx + 1) >> 1, cy = (ny + 1) >> 1, fc = restrict(r, nx, ny, cx, cy), ec = new Float32Array(cx * cy);
  vcycle(ec, fc, cx, cy);
  prolongAdd(ec, cx, cy, u, nx, ny);
  gsRB(u, f, nx, ny, 2);
}
export function solvePoisson(f, nx, ny, cycles, onCycle) {
  // compatibilitate Neumann: suma lui f = 0
  let m = 0; for (let k = 0; k < f.length; k++) m += f[k]; m /= f.length; for (let k = 0; k < f.length; k++) f[k] -= m;
  const u = new Float32Array(nx * ny), r = new Float32Array(nx * ny);
  let f2 = 0; for (let k = 0; k < f.length; k++) f2 += f[k] * f[k]; f2 = Math.sqrt(f2) || 1;
  const hist = [];
  for (let c = 0; c < cycles; c++) {
    vcycle(u, f, nx, ny);
    let mu = 0; for (let k = 0; k < u.length; k++) mu += u[k]; mu /= u.length; for (let k = 0; k < u.length; k++) u[k] -= mu;
    residual(u, f, nx, ny, r); let r2 = 0; for (let k = 0; k < r.length; k++) r2 += r[k] * r[k];
    hist.push(Math.sqrt(r2) / f2); if (onCycle) onCycle(c, hist[c]);
  }
  return { u, hist };
}
