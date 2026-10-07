// SIMULATOR (sonda s3-vcarve). ZERO importuri din src/. Citeste TEXTUL G-code (G0/G1/G2/G3, T, M6)
// si calculeaza exact infasuratoarea sculei maturate pe fiecare segment, in centrul fiecarei celule.
// Con (freza V, unghi theta, varf ascutit) si cilindru (freza dreapta, raza R).
// Arcele G2/G3 sunt impartite in coarde cu sageata <= 2e-5 mm, cu Z liniar pe unghi.

export function parseGcode(text) {
  const moves = []; let x = 0, y = 0, z = 50, mode = 0, tool = 0; let rapidsInMaterial = 0;
  for (let raw of text.split('\n')) {
    const line = raw.replace(/\(.*?\)/g, '').replace(/;.*/, '').trim().toUpperCase(); if (!line) continue;
    const w = {}; for (const m of line.matchAll(/([A-Z])\s*(-?\d*\.?\d+(?:E-?\d+)?)/g)) { const k = m[1]; if (k === 'G') { const g = +m[2]; if ([0, 1, 2, 3].includes(g)) mode = g; } else w[k] = +m[2]; }
    if ('T' in w) tool = w.T;
    if (!('X' in w || 'Y' in w || 'Z' in w)) continue;
    const nx = 'X' in w ? w.X : x, ny = 'Y' in w ? w.Y : y, nz = 'Z' in w ? w.Z : z;
    if (mode === 0) { if (Math.min(z, nz) < 0 && (Math.abs(nx - x) > 1e-9 || Math.abs(ny - y) > 1e-9)) rapidsInMaterial++; }
    else if (mode === 1) moves.push({ tool, x0: x, y0: y, z0: z, x1: nx, y1: ny, z1: nz });
    else {
      const cx = x + (w.I || 0), cy = y + (w.J || 0); const r = Math.hypot(x - cx, y - cy);
      let a0 = Math.atan2(y - cy, x - cx), a1 = Math.atan2(ny - cy, nx - cx);
      if (mode === 2) { while (a1 >= a0 - 1e-12) a1 -= 2 * Math.PI; if (Math.abs(nx - x) < 1e-9 && Math.abs(ny - y) < 1e-9) a1 = a0 - 2 * Math.PI; }
      else { while (a1 <= a0 + 1e-12) a1 += 2 * Math.PI; if (Math.abs(nx - x) < 1e-9 && Math.abs(ny - y) < 1e-9) a1 = a0 + 2 * Math.PI; }
      const sweep = Math.abs(a1 - a0); const dA = 2 * Math.acos(Math.max(0, 1 - 2e-5 / Math.max(r, 1e-9)));
      const n = Math.max(1, Math.ceil(sweep / Math.max(dA, 1e-6)));
      let px = x, py = y, pz = z;
      for (let i = 1; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; const qx = i === n ? nx : cx + r * Math.cos(a), qy = i === n ? ny : cy + r * Math.sin(a), qz = z + (nz - z) * i / n;
        moves.push({ tool, x0: px, y0: py, z0: pz, x1: qx, y1: qy, z1: qz }); px = qx; py = qy; pz = qz; }
    }
    x = nx; y = ny; z = nz;
  }
  return { moves, rapidsInMaterial };
}

// tools: { [T]: {type:'V', theta} | {type:'F', R} }
export function sweep(moves, tools, grid, H) {
  const { x0, y0, g, nx, ny } = grid;
  for (const m of moves) {
    if (m.z0 >= 0 && m.z1 >= 0) continue;
    const T = tools[m.tool]; if (!T) throw new Error('scula necunoscuta T' + m.tool);
    const zmin = Math.min(m.z0, m.z1);
    const reach = T.type === 'V' ? -zmin * Math.tan(T.theta * Math.PI / 360) : T.R;
    const bx0 = Math.min(m.x0, m.x1) - reach, bx1 = Math.max(m.x0, m.x1) + reach, by0 = Math.min(m.y0, m.y1) - reach, by1 = Math.max(m.y0, m.y1) + reach;
    const i0 = Math.max(0, Math.floor((bx0 - x0) / g - 0.5)), i1 = Math.min(nx - 1, Math.ceil((bx1 - x0) / g - 0.5));
    const j0 = Math.max(0, Math.floor((by0 - y0) / g - 0.5)), j1 = Math.min(ny - 1, Math.ceil((by1 - y0) / g - 0.5));
    if (i0 > i1 || j0 > j1) continue;
    const ux = m.x1 - m.x0, uy = m.y1 - m.y0, L = Math.hypot(ux, uy); const dz = m.z1 - m.z0;
    const ex = L > 0 ? ux / L : 1, ey = L > 0 ? uy / L : 0;
    if (T.type === 'V') {
      const k = 1 / Math.tan(T.theta * Math.PI / 360); const mm = L > 0 ? dz / L : 0; const q = mm / k;
      const qq = Math.abs(q) < 1 ? q / Math.sqrt(1 - q * q) : 0;
      for (let j = j0; j <= j1; j++) { const py = y0 + (j + 0.5) * g; for (let i = i0; i <= i1; i++) {
        const px = x0 + (i + 0.5) * g; const rx = px - m.x0, ry = py - m.y0;
        let h;
        if (L < 1e-12) h = zmin + k * Math.hypot(rx, ry);
        else {
          const a = rx * ex + ry * ey, b = Math.abs(rx * ey - ry * ex);
          let s; if (q >= 1) s = 0; else if (q <= -1) s = L; else s = a - qq * b; s = Math.max(0, Math.min(L, s));
          h = m.z0 + s * mm + k * Math.sqrt((a - s) * (a - s) + b * b);
        }
        const id = j * nx + i; if (h < H[id]) H[id] = h;
      } }
    } else {
      const R = T.R;
      for (let j = j0; j <= j1; j++) { const py = y0 + (j + 0.5) * g; for (let i = i0; i <= i1; i++) {
        const px = x0 + (i + 0.5) * g; const rx = px - m.x0, ry = py - m.y0;
        let h = Infinity;
        if (L < 1e-12) { if (rx * rx + ry * ry <= R * R) h = zmin; }
        else { const a = rx * ex + ry * ey, b = Math.abs(rx * ey - ry * ex); if (b <= R) { const w = Math.sqrt(R * R - b * b); const lo = Math.max(0, a - w), hi = Math.min(L, a + w);
          if (lo <= hi) h = Math.min(m.z0 + dz * lo / L, m.z0 + dz * hi / L); } }
        const id = j * nx + i; if (h < H[id]) H[id] = h;
      } }
    }
  }
}

// compara H (simulat) cu Z (ideal): abatere = H - Z (pozitiv = material ramas, negativ = sapat prea adanc)
export function compare(H, Z, IN, grid, tolSub = 0.02) {
  let maxUnder = 0, maxOver = 0, ss = 0, n = 0, nOut = 0, outCut = 0, nBadUnder = 0; let worstUnder = null, worstOver = null; const { nx, x0, y0, g } = grid;
  const devs = [];
  for (let id = 0; id < H.length; id++) {
    const h = Math.min(0, H[id]);
    const d = h - Z[id];
    if (IN[id]) { ss += d * d; n++; if (d > maxUnder) { maxUnder = d; worstUnder = id; } if (d > tolSub) nBadUnder++; if (n % 7 === 0) devs.push(Math.abs(d)); }
    else { nOut++; if (h < -1e-9) { outCut++; } }
    if (-d > maxOver) { maxOver = -d; worstOver = id; }
  }
  devs.sort((a, b) => a - b);
  const at = (id) => id === null ? null : [+(x0 + ((id % nx) + 0.5) * g).toFixed(4), +(y0 + (Math.floor(id / nx) + 0.5) * g).toFixed(4)];
  return { maxUnder, maxOver, rms: Math.sqrt(ss / Math.max(1, n)), p999: devs[Math.floor(devs.length * 0.999)] || 0, n, outCut, fracBadUnder: nBadUnder / Math.max(1, n), worstUnderAt: at(worstUnder), worstOverAt: at(worstOver) };
}

// evaluare in puncte izolate (sonde pe hartie)
export function sweepPoints(moves, tools, pts) {
  const out = pts.map(() => Infinity);
  for (const m of moves) {
    if (m.z0 >= 0 && m.z1 >= 0) continue; const T = tools[m.tool];
    const ux = m.x1 - m.x0, uy = m.y1 - m.y0, L = Math.hypot(ux, uy), dz = m.z1 - m.z0; const ex = L > 0 ? ux / L : 1, ey = L > 0 ? uy / L : 0;
    pts.forEach(([px, py], idx) => {
      const rx = px - m.x0, ry = py - m.y0; let h = Infinity;
      if (T.type === 'V') { const k = 1 / Math.tan(T.theta * Math.PI / 360);
        if (L < 1e-12) h = Math.min(m.z0, m.z1) + k * Math.hypot(rx, ry);
        else { const mm = dz / L, q = mm / k, a = rx * ex + ry * ey, b = Math.abs(rx * ey - ry * ex); let s; if (q >= 1) s = 0; else if (q <= -1) s = L; else s = a - (q / Math.sqrt(1 - q * q)) * b; s = Math.max(0, Math.min(L, s)); h = m.z0 + s * mm + k * Math.hypot(a - s, b); } }
      else { const R = T.R; if (L < 1e-12) { if (rx * rx + ry * ry <= R * R) h = Math.min(m.z0, m.z1); } else { const a = rx * ex + ry * ey, b = Math.abs(rx * ey - ry * ex); if (b <= R) { const w = Math.sqrt(R * R - b * b); const lo = Math.max(0, a - w), hi = Math.min(L, a + w); if (lo <= hi) h = Math.min(m.z0 + dz * lo / L, m.z0 + dz * hi / L); } } }
      if (h < out[idx]) out[idx] = h;
    });
  }
  return out.map((h) => Math.min(0, h));
}
