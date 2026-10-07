// ORACOLUL 2 (v2-vcarve): scris independent de sonda, cu alta metoda. ZERO importuri din src/, oracle/, var/, harness.
// IDEAL: curbele exacte esantionate dens (pas <= s in lungime) -> polilinie; distanta = min la segmentele poliliniei care
//   sunt GRANITA (interior de o parte, exterior de cealalta, test la +-1e-5 mm pe normala); interior = numar de
//   infasurare (nonzero) sau paritate (evenodd) pe polilinia densa. Eroare: sageata s^2*k/8 (sub 1e-5 mm aici).
// SCULA: textul G-code (G0/G1/G2/G3 cu I/J, T) e esantionat la pas <= st pe fiecare miscare de taiere; in fiecare punct
//   de proba, inaltimea = min(z_varf + cot(theta/2) * distanta) (freza V) sau min z cu distanta <= R (freza dreapta).
//   Eroare: esantionarea traseului poate rata minimul cu cel mult cot*st/2 (inaltime mai MARE, adica „sub” umflat).
const ev = (c, t) => { const u = 1 - t;
  if (c.k === 'L') return [c.p0[0] + (c.p1[0] - c.p0[0]) * t, c.p0[1] + (c.p1[1] - c.p0[1]) * t];
  if (c.k === 'A') { const a = c.a0 + (c.a1 - c.a0) * t; return [c.c[0] + c.r * Math.cos(a), c.c[1] + c.r * Math.sin(a)]; }
  if (c.k === 'Q') return [u * u * c.p0[0] + 2 * u * t * c.p1[0] + t * t * c.p2[0], u * u * c.p0[1] + 2 * u * t * c.p1[1] + t * t * c.p2[1]];
  return [u * u * u * c.p0[0] + 3 * u * u * t * c.p1[0] + 3 * u * t * t * c.p2[0] + t * t * t * c.p3[0], u * u * u * c.p0[1] + 3 * u * u * t * c.p1[1] + 3 * u * t * t * c.p2[1] + t * t * t * c.p3[1]]; };

export function makeIdeal(loops, fill, s = 0.0005) {
  const segs = []; // [x0,y0,x1,y1]
  for (const loop of loops) for (const c of loop) {
    let len = 0, p = ev(c, 0); for (let i = 1; i <= 64; i++) { const q = ev(c, i / 64); len += Math.hypot(q[0] - p[0], q[1] - p[1]); p = q; }
    const n = Math.max(1, Math.ceil(len / s)); p = ev(c, 0); for (let i = 1; i <= n; i++) { const q = ev(c, i / n); segs.push([p[0], p[1], q[0], q[1]]); p = q; }
  }
  let y0 = Infinity, y1 = -Infinity, x0 = Infinity, x1 = -Infinity; for (const g of segs) { y0 = Math.min(y0, g[1], g[3]); y1 = Math.max(y1, g[1], g[3]); x0 = Math.min(x0, g[0], g[2]); x1 = Math.max(x1, g[0], g[2]); }
  const BH = Math.max((y1 - y0) / 2000, 1e-3), nb = Math.ceil((y1 - y0) / BH) + 1; const bands = Array.from({ length: nb }, () => []);
  segs.forEach((g, i) => { const a = Math.floor((Math.min(g[1], g[3]) - y0) / BH), b = Math.floor((Math.max(g[1], g[3]) - y0) / BH); for (let k = Math.max(0, a); k <= Math.min(nb - 1, b); k++) bands[k].push(i); });
  const inside = (x, y) => { const k = Math.floor((y - y0) / BH); if (k < 0 || k >= nb) return false; let w = 0, n = 0;
    for (const i of bands[k]) { const g = segs[i]; const up = g[1] <= y && g[3] > y, dn = g[3] <= y && g[1] > y; if (!up && !dn) continue; const xi = g[0] + (y - g[1]) * (g[2] - g[0]) / (g[3] - g[1]); if (xi > x) { w += up ? 1 : -1; n++; } }
    return fill === 'evenodd' ? (n & 1) === 1 : w !== 0; };
  const bnd = segs.filter((g) => { const mx = (g[0] + g[2]) / 2, my = (g[1] + g[3]) / 2, L = Math.hypot(g[2] - g[0], g[3] - g[1]) || 1; const nx = -(g[3] - g[1]) / L * 1e-5, ny = (g[2] - g[0]) / L * 1e-5; return inside(mx + nx, my + ny) !== inside(mx - nx, my - ny); });
  const CS = 0.25; const cells = new Map(); const key = (i, j) => i * 1e6 + j;
  bnd.forEach((g, idx) => { const i0 = Math.floor(Math.min(g[0], g[2]) / CS), i1 = Math.floor(Math.max(g[0], g[2]) / CS), j0 = Math.floor(Math.min(g[1], g[3]) / CS), j1 = Math.floor(Math.max(g[1], g[3]) / CS); for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const k = key(i, j); let a = cells.get(k); if (!a) cells.set(k, (a = [])); a.push(idx); } });
  const sd = (g, x, y) => { const dx = g[2] - g[0], dy = g[3] - g[1], L2 = dx * dx + dy * dy; let t = L2 ? ((x - g[0]) * dx + (y - g[1]) * dy) / L2 : 0; t = t < 0 ? 0 : t > 1 ? 1 : t; return Math.hypot(g[0] + t * dx - x, g[1] + t * dy - y); };
  const dist = (x, y) => { const ci = Math.floor(x / CS), cj = Math.floor(y / CS); let best = Infinity;
    for (let r = 0; r < 100000; r++) { if (r > 0 && (r - 1) * CS > best) break; let any = false;
      for (let i = ci - r; i <= ci + r; i++) for (let j = cj - r; j <= cj + r; j++) { if (Math.max(Math.abs(i - ci), Math.abs(j - cj)) !== r) continue; const a = cells.get(key(i, j)); if (!a) continue; any = true; for (const idx of a) { const d = sd(bnd[idx], x, y); if (d < best) best = d; } }
      if (r > (x1 - x0 + y1 - y0) / CS + 2) break; }
    return best; };
  return { inside, dist, nSegs: segs.length, nBnd: bnd.length, bbox: [x0, y0, x1, y1] };
}
export const idealZ = (I, theta, D, x, y) => (I.inside(x, y) ? -Math.min(D, I.dist(x, y) / Math.tan(theta * Math.PI / 360)) : 0);

// G-code -> esantioane ale varfului sculei pe miscarile de taiere: [tool, x, y, z]
export function toolSamples(text, st = 0.0002) {
  const out = []; let x = 0, y = 0, z = 50, mode = 0, tool = 0;
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\(.*?\)/g, '').replace(/;.*/, '').trim().toUpperCase(); if (!line) continue;
    const w = {}; const re = /([A-Z])\s*([-+]?\d*\.?\d+)/g; let m; while ((m = re.exec(line))) { if (m[1] === 'G') { const gg = parseFloat(m[2]); if (gg === 0 || gg === 1 || gg === 2 || gg === 3) mode = gg; } else w[m[1]] = parseFloat(m[2]); }
    if (w.T !== undefined) tool = w.T;
    if (w.X === undefined && w.Y === undefined && w.Z === undefined) continue;
    const nx = w.X ?? x, ny = w.Y ?? y, nz = w.Z ?? z;
    if (mode === 1) { const L = Math.hypot(nx - x, ny - y, nz - z); const n = Math.max(1, Math.ceil(L / st)); for (let i = 0; i <= n; i++) out.push(tool, x + (nx - x) * i / n, y + (ny - y) * i / n, z + (nz - z) * i / n); }
    else if (mode === 2 || mode === 3) { const cx = x + (w.I || 0), cy = y + (w.J || 0), r = Math.hypot(x - cx, y - cy); const a0 = Math.atan2(y - cy, x - cx); let a1 = Math.atan2(ny - cy, nx - cx);
      if (mode === 3) { while (a1 <= a0) a1 += 2 * Math.PI; } else { while (a1 >= a0) a1 -= 2 * Math.PI; }
      const n = Math.max(1, Math.ceil(Math.abs(a1 - a0) * r / st)); for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; out.push(tool, cx + r * Math.cos(a), cy + r * Math.sin(a), z + (nz - z) * i / n); } }
    x = nx; y = ny; z = nz;
  }
  return new Float64Array(out);
}
export function cutAt(samples, tools, pts) {
  const CS = 0.25, cells = new Map(); const key = (i, j) => i * 1e6 + j; let zmin = 0;
  for (let k = 0; k < samples.length; k += 4) { if (samples[k + 3] >= 0) continue; zmin = Math.min(zmin, samples[k + 3]); const kk = key(Math.floor(samples[k + 1] / CS), Math.floor(samples[k + 2] / CS)); let a = cells.get(kk); if (!a) cells.set(kk, (a = [])); a.push(k); }
  let reach = 0; for (const T of Object.values(tools)) reach = Math.max(reach, T.type === 'V' ? -zmin * Math.tan(T.theta * Math.PI / 360) : T.R);
  const R = Math.ceil(reach / CS) + 1;
  return pts.map(([px, py]) => { let h = 0; const ci = Math.floor(px / CS), cj = Math.floor(py / CS);
    for (let i = ci - R; i <= ci + R; i++) for (let j = cj - R; j <= cj + R; j++) { const a = cells.get(key(i, j)); if (!a) continue;
      for (const k of a) { const T = tools[samples[k]]; const d = Math.hypot(px - samples[k + 1], py - samples[k + 2]); const z = samples[k + 3];
        const hh = T.type === 'V' ? z + d / Math.tan(T.theta * Math.PI / 360) : (d <= T.R ? z : Infinity); if (hh < h) h = hh; } }
    return h; });
}
