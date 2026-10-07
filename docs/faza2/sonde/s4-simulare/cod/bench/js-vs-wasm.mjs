// js-vs-wasm.mjs — același nucleu de bilă (grilă densă), în JS și în WASM (AssemblyScript), pe același rastru.
// Construiește WASM-ul înainte: npx asc as/kernel.ts -O3 --runtime stub --noAssert -o out/kernel.wasm
import { readFileSync } from 'node:fs';
import { job3d } from './jobs.mjs';

const R = 1.5, cell = 0.1;
function cutBallJS(G, X0, Y0, NX, NY, ax, ay, az, bx, by, bz) {
  if (az >= 0 && bz >= 0) return;
  const R2 = R * R, dx = bx - ax, dy = by - ay, dz = bz - az;
  const L2 = dx * dx + dy * dy, L = Math.sqrt(L2), plunge = L2 < 1e-18;
  const m = plunge ? 0 : dz / L, m2 = m * m;
  const invL2 = plunge ? 0 : 1 / L2, invL = plunge ? 0 : 1 / L, mBall = -m / Math.sqrt(1 + m2);
  const zlo = az < bz ? az : bz;
  let j0 = Math.floor(((ay < by ? ay : by) - R - Y0) / cell - 0.5), j1 = Math.ceil(((ay > by ? ay : by) + R - Y0) / cell - 0.5);
  if (j0 < 0) j0 = 0; if (j1 > NY - 1) j1 = NY - 1;
  const xmin = (ax < bx ? ax : bx) - R, xmax = (ax > bx ? ax : bx) + R;
  for (let j = j0; j <= j1; j++) {
    const py = Y0 + (j + 0.5) * cell;
    let xlo = xmax, xhi = xmin;
    const ea = py - ay, eb = py - by;
    if (ea * ea <= R2) { const w = Math.sqrt(R2 - ea * ea); if (ax - w < xlo) xlo = ax - w; if (ax + w > xhi) xhi = ax + w; }
    if (eb * eb <= R2) { const w = Math.sqrt(R2 - eb * eb); if (bx - w < xlo) xlo = bx - w; if (bx + w > xhi) xhi = bx + w; }
    if (!plunge) {
      let lo = xmin, hi = xmax;
      if (dx !== 0) { const p = (-ea * dy) / dx, q = (L2 - ea * dy) / dx; lo = Math.max(lo, Math.min(p, q) + ax); hi = Math.min(hi, Math.max(p, q) + ax); }
      else if (ea * dy < 0 || ea * dy > L2) { lo = 1; hi = 0; }
      if (dy !== 0) { const p = (-R * L + ea * dx) / dy, q = (R * L + ea * dx) / dy; lo = Math.max(lo, Math.min(p, q) + ax); hi = Math.min(hi, Math.max(p, q) + ax); }
      else if (Math.abs(ea) > R) { lo = 1; hi = 0; }
      if (lo <= hi) { if (lo < xlo) xlo = lo; if (hi > xhi) xhi = hi; }
    }
    if (xlo > xhi) continue;
    let i0 = Math.floor((xlo - X0) / cell - 0.5) - 1, i1 = Math.ceil((xhi - X0) / cell - 0.5) + 1;
    if (i0 < 0) i0 = 0; if (i1 > NX - 1) i1 = NX - 1;
    const row = j * NX;
    for (let i = i0; i <= i1; i++) {
      const px = X0 + (i + 0.5) * cell, ex = px - ax, ey = py - ay, cur = G[row + i];
      let zs;
      if (plunge) { const q = ex * ex + ey * ey; if (q > R2) continue; const qq = R2 - q; zs = zlo + R - Math.sqrt(qq > 0 ? qq : 0); }
      else {
        const cr = ex * dy - ey * dx, perp2 = cr * cr * invL2;
        if (perp2 > R2) continue;
        if (cur <= zlo) continue;
        const tp = (ex * dx + ey * dy) * invL2, srho = Math.sqrt(R2 - perp2), half = srho * invL;
        let ta = tp - half, tb = tp + half;
        if (ta < 0) ta = 0; if (tb > 1) tb = 1;
        if (ta > tb) continue;
        const rho2 = R2 - perp2, sa = (ta - tp) * L, sb = (tb - tp) * L;
        let s = mBall * srho;
        if (s < sa) s = sa; else if (s > sb) s = sb;
        const q = rho2 - s * s;
        zs = az + dz * tp + m * s + R - Math.sqrt(q > 0 ? q : 0);
      }
      if (zs < cur) G[row + i] = zs;
    }
  }
}

const job = job3d(+(process.argv[2] || 200), 2500), pts = job.ops[0].poly, n = pts.length / 3;
const X0 = job.field.x0, Y0 = job.field.y0, NX = Math.ceil(job.field.w / cell - 1e-9), NY = Math.ceil(job.field.h / cell - 1e-9);
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[(s.length - 1) >> 1]; };
const tj = [], tw = [];
let GJ, GW;
const wasm = await WebAssembly.instantiate(readFileSync(new URL('../out/kernel.wasm', import.meta.url)), { env: { abort: () => { throw new Error('abort'); } } });
const ex = wasm.instance.exports;
const gridBytes = NX * NY * 4, gp = ex.alloc(gridBytes), pp = ex.alloc(pts.byteLength);
for (let r = 0; r < 5; r++) {
  GJ = new Float32Array(NX * NY);
  let t0 = performance.now();
  for (let i = 1; i < n; i++) { const a = 3 * (i - 1), b = 3 * i; cutBallJS(GJ, X0, Y0, NX, NY, pts[a], pts[a + 1], pts[a + 2], pts[b], pts[b + 1], pts[b + 2]); }
  tj.push(performance.now() - t0);
  new Float32Array(ex.memory.buffer, gp, NX * NY).fill(0);
  new Float64Array(ex.memory.buffer, pp, pts.length).set(pts);
  ex.setup(X0, Y0, cell, NX, NY, R, gp);
  t0 = performance.now(); ex.cutPoly(pp, n); tw.push(performance.now() - t0);
  GW = new Float32Array(ex.memory.buffer, gp, NX * NY);
}
const a = new Uint32Array(GJ.buffer), b = new Uint32Array(GW.buffer.slice(GW.byteOffset, GW.byteOffset + GW.byteLength));
let diff = 0; for (let k = 0; k < a.length; k++) if (a[k] !== b[k]) diff++;
console.log(JSON.stringify({ mutari: n - 1, js_ms_median: Math.round(med(tj)), wasm_ms_median: Math.round(med(tw)), js_toate: tj.map(Math.round), wasm_toate: tw.map(Math.round), raport_js_pe_wasm: +(med(tj) / med(tw)).toFixed(2), celule_diferite_bit: diff }));
