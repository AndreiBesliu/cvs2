// kernel.ts (AssemblyScript) — ACELAȘI nucleu de bilă pe segment 3D ca bench/dense-js.mjs, pe grilă densă f32.
// Scop: doar comparația de viteză JS vs WASM pe cod identic (nu e nucleul de produs).
let X0: f64 = 0, Y0: f64 = 0, CELL: f64 = 0.1, R: f64 = 1.5, R2: f64 = 2.25;
let NX: i32 = 0, NY: i32 = 0;
let GRID: usize = 0;

export function alloc(bytes: i32): usize { return heap.alloc(<usize>bytes); }
export function setup(x0: f64, y0: f64, cell: f64, nx: i32, ny: i32, r: f64, grid: usize): void {
  X0 = x0; Y0 = y0; CELL = cell; NX = nx; NY = ny; R = r; R2 = r * r; GRID = grid;
}

export function cutPoly(pts: usize, n: i32): void {
  for (let i = 1; i < n; i++) {
    const a = pts + <usize>((i - 1) * 24), b = pts + <usize>(i * 24);
    cutBall(load<f64>(a), load<f64>(a, 8), load<f64>(a, 16), load<f64>(b), load<f64>(b, 8), load<f64>(b, 16));
  }
}

function cutBall(ax: f64, ay: f64, az: f64, bx: f64, by: f64, bz: f64): void {
  if (az >= 0 && bz >= 0) return;
  const dx = bx - ax, dy = by - ay, dz = bz - az;
  const L2 = dx * dx + dy * dy, L = Math.sqrt(L2);
  const plunge = L2 < 1e-18;
  const m = plunge ? 0.0 : dz / L, m2 = m * m;
  const invL2 = plunge ? 0.0 : 1.0 / L2, invL = plunge ? 0.0 : 1.0 / L, mBall = -m / Math.sqrt(1 + m2);
  const zlo = az < bz ? az : bz;
  let j0 = <i32>Math.floor(((ay < by ? ay : by) - R - Y0) / CELL - 0.5), j1 = <i32>Math.ceil(((ay > by ? ay : by) + R - Y0) / CELL - 0.5);
  if (j0 < 0) j0 = 0; if (j1 > NY - 1) j1 = NY - 1;
  const xmin = (ax < bx ? ax : bx) - R, xmax = (ax > bx ? ax : bx) + R;
  for (let j = j0; j <= j1; j++) {
    const py = Y0 + (<f64>j + 0.5) * CELL;
    let xlo = xmax, xhi = xmin;
    const ea = py - ay, eb = py - by;
    if (ea * ea <= R2) { const w = Math.sqrt(R2 - ea * ea); if (ax - w < xlo) xlo = ax - w; if (ax + w > xhi) xhi = ax + w; }
    if (eb * eb <= R2) { const w = Math.sqrt(R2 - eb * eb); if (bx - w < xlo) xlo = bx - w; if (bx + w > xhi) xhi = bx + w; }
    if (!plunge) {
      let lo = xmin, hi = xmax;
      if (dx != 0) { const p = (-ea * dy) / dx, q = (L2 - ea * dy) / dx; lo = Math.max(lo, Math.min(p, q) + ax); hi = Math.min(hi, Math.max(p, q) + ax); }
      else if (ea * dy < 0 || ea * dy > L2) { lo = 1; hi = 0; }
      if (dy != 0) { const p = (-R * L + ea * dx) / dy, q = (R * L + ea * dx) / dy; lo = Math.max(lo, Math.min(p, q) + ax); hi = Math.min(hi, Math.max(p, q) + ax); }
      else if (Math.abs(ea) > R) { lo = 1; hi = 0; }
      if (lo <= hi) { if (lo < xlo) xlo = lo; if (hi > xhi) xhi = hi; }
    }
    if (xlo > xhi) continue;
    let i0 = <i32>Math.floor((xlo - X0) / CELL - 0.5) - 1, i1 = <i32>Math.ceil((xhi - X0) / CELL - 0.5) + 1;
    if (i0 < 0) i0 = 0; if (i1 > NX - 1) i1 = NX - 1;
    const row = GRID + (<usize>j * <usize>NX << 2);
    for (let i = i0; i <= i1; i++) {
      const px = X0 + (<f64>i + 0.5) * CELL;
      const ex = px - ax, ey = py - ay;
      const p = row + (<usize>i << 2);
      const cur = <f64>load<f32>(p);
      let zs: f64;
      if (plunge) {
        const q = ex * ex + ey * ey;
        if (q > R2) continue;
        const qq = R2 - q;
        zs = zlo + R - Math.sqrt(qq > 0 ? qq : 0);
      } else {
        const cr = ex * dy - ey * dx, perp2 = cr * cr * invL2;
        if (perp2 > R2) continue;
        if (cur <= zlo) continue;
        const tp = (ex * dx + ey * dy) * invL2;
        const srho = Math.sqrt(R2 - perp2), half = srho * invL;
        let ta = tp - half, tb = tp + half;
        if (ta < 0) ta = 0; if (tb > 1) tb = 1;
        if (ta > tb) continue;
        const rho2 = R2 - perp2, sa = (ta - tp) * L, sb = (tb - tp) * L;
        let s = mBall * srho;
        if (s < sa) s = sa; else if (s > sb) s = sb;
        const q = rho2 - s * s;
        zs = az + dz * tp + m * s + R - Math.sqrt(q > 0 ? q : 0);
      }
      if (zs < cur) store<f32>(p, <f32>zs);
    }
  }
}
