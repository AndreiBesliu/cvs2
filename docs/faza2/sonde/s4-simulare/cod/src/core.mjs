// core.mjs — NUCLEUL de simulare (SONDĂ ARUNCABILĂ, nu cod de produs). Zero importuri.
//
// Model: câmp de înălțimi rar, pe dale TILE×TILE de Float32. O celulă ține Z-ul MINIM atins de
// suprafața sculei deasupra centrului ei ("cea mai adâncă tăietură câștigă"), deci rezultatul NU
// depinde de ordinea mutărilor și nici de împărțirea pe workere.
// Scula = siluetă h(r): înălțimea suprafeței de tăiere deasupra vârfului, la raza r (h(0)=0,
// h nedescrescătoare, r <= R). Fără subtăieri (limita oricărui câmp de înălțimi).
//
// Calcul per celulă, EXACT (fără eșantionare de-a lungul mutării) pentru:
//   - linie 3D cu sculă plată / bilă / V (formă închisă: minimul unei funcții convexe pe intervalul fezabil);
//   - linie cu Z constant și arc cu Z constant, pentru ORICE h(r) (distanța exactă la segment / arc);
// Aproximat (declarat):
//   - arc elicoidal (Z variabil) -> coarde cu săgeata <= cell/20;
//   - sculă de profil h(r) pe linie cu Z variabil -> ștampile la pas <= cell/4.
// Determinism: doar + - * / sqrt min max în bucla pe celulă (IEEE exacte în V8 și WASM).
// Trigonometrie (cos/sin/atan2) doar la împărțirea elicei, o dată pe mutare.

export const SH = 6, TILE = 1 << SH, M = TILE - 1, TILE_CELLS = TILE * TILE;

// ---------------------------------------------------------------- sculele
// spec: {kind:'flat', d} | {kind:'ball', d} | {kind:'v', d, angle} | {kind:'profile', d, pts:[[r,h],...]}
export function makeTool(spec) {
  const R = spec.d / 2;
  const t = { kind: 0, R, R2: R * R, k: 0, pr: null, ph: null, spec };
  switch (spec.kind) {
    case 'flat': t.kind = 0; break;
    case 'ball': t.kind = 1; break;
    case 'v': {
      t.kind = 2;
      if (!(spec.angle > 0 && spec.angle < 180)) throw new Error('unghi V invalid: ' + spec.angle);
      t.k = 1 / Math.tan((spec.angle * Math.PI) / 360); // h(r) = k*r
      break;
    }
    case 'profile': {
      t.kind = 3;
      const pts = spec.pts;
      if (pts[0][0] !== 0 || pts[0][1] !== 0) throw new Error('profilul începe în (0,0)');
      for (let i = 1; i < pts.length; i++) {
        if (!(pts[i][0] > pts[i - 1][0]) || pts[i][1] < pts[i - 1][1]) throw new Error('profil invalid');
      }
      if (Math.abs(pts[pts.length - 1][0] - R) > 1e-12) throw new Error('profilul se termină la R');
      t.pr = Float64Array.from(pts, (p) => p[0]);
      t.ph = Float64Array.from(pts, (p) => p[1]);
      break;
    }
    default: throw new Error('sculă necunoscută: ' + spec.kind);
  }
  return t;
}

// h(d) pentru d în [0, R]
function H(t, d) {
  switch (t.kind) {
    case 0: return 0;
    case 1: { const q = t.R2 - d * d; return t.R - Math.sqrt(q > 0 ? q : 0); }
    case 2: return t.k * d;
    default: {
      const pr = t.pr, ph = t.ph, n = pr.length;
      let i = 1;
      while (i < n - 1 && pr[i] < d) i++;
      const r0 = pr[i - 1], r1 = pr[i];
      return ph[i - 1] + ((ph[i] - ph[i - 1]) * (d - r0)) / (r1 - r0);
    }
  }
}

// raza până la care scula mai coboară sub suprafața plăcii, când vârful e cu `dep` sub ea
export function reach(t, dep) {
  if (dep <= 0) return 0;
  switch (t.kind) {
    case 0: return t.R;
    case 1: { if (dep >= t.R) return t.R; const q = t.R2 - (t.R - dep) * (t.R - dep); return Math.min(t.R, Math.sqrt(q > 0 ? q : 0)); }
    case 2: return Math.min(t.R, dep / t.k);
    default: {
      const pr = t.pr, ph = t.ph, n = pr.length;
      for (let i = 1; i < n; i++) if (ph[i] >= dep) return ph[i] === ph[i - 1] ? pr[i] : pr[i - 1] + ((dep - ph[i - 1]) * (pr[i] - pr[i - 1])) / (ph[i] - ph[i - 1]);
      return t.R;
    }
  }
}

// ---------------------------------------------------------------- câmpul
export function makeField({ x0, y0, w, h, cell, top = 0 }) {
  const nx = Math.ceil(w / cell - 1e-9), ny = Math.ceil(h / cell - 1e-9);
  const ntx = (nx + M) >> SH, nty = (ny + M) >> SH;
  return {
    x0, y0, cell, top: Math.fround(top), nx, ny, ntx, nty,
    tiles: new Array(ntx * nty).fill(null),
    jMin: 0, jMax: ny - 1, // banda de rânduri (inclusiv) pe care o scrie acest fir
    own: null, // Uint8Array pe rânduri de dale: 1 = rândul e al acestui fir (null = toate)
    allocated: 0,
  };
}

function allocTile(F, idx) {
  const a = new Float32Array(TILE_CELLS);
  a.fill(F.top);
  F.tiles[idx] = a;
  F.allocated++;
  return a;
}

export function sample(F, i, j) {
  const t = F.tiles[(j >> SH) * F.ntx + (i >> SH)];
  return t === null ? F.top : t[((j & M) << SH) | (i & M)];
}

// ---------------------------------------------------------------- linie 3D (plată, bilă, V; profil cu Z constant)
export function cutLine(F, T, ax, ay, az, bx, by, bz) {
  if (az >= F.top && bz >= F.top) return; // integral deasupra materialului (în aer)
  if (T.kind === 3 && az !== bz) return stampLine(F, T, ax, ay, az, bx, by, bz);
  const cell = F.cell, R = T.R, R2 = T.R2, top = F.top, tiles = F.tiles, ntx = F.ntx;
  const dx = bx - ax, dy = by - ay, dz = bz - az;
  const L2 = dx * dx + dy * dy, L = Math.sqrt(L2), plunge = L2 < 1e-18;
  const m = plunge ? 0 : dz / L, kind = T.kind, k = T.k, k2 = k * k, m2 = m * m;
  const invL2 = plunge ? 0 : 1 / L2, invL = plunge ? 0 : 1 / L, mBall = -m / Math.sqrt(1 + m2);
  const zlo = az < bz ? az : bz;
  // spațiul căutat e limitat la raza efectivă Re (mai departe scula nu coboară sub placă); calculul per celulă rămâne exact
  const Re = reach(T, top - zlo) * (1 + 1e-12) + 1e-9, Re2 = Re * Re;
  let j0 = Math.floor(((ay < by ? ay : by) - Re - F.y0) / cell - 0.5), j1 = Math.ceil(((ay > by ? ay : by) + Re - F.y0) / cell - 0.5);
  if (j0 < F.jMin) j0 = F.jMin; if (j1 > F.jMax) j1 = F.jMax;
  const xmin = (ax < bx ? ax : bx) - Re, xmax = (ax > bx ? ax : bx) + Re;
  const own = F.own;
  for (let j = j0; j <= j1; j++) {
    if (own !== null && own[j >> SH] === 0) continue;
    const py = F.y0 + (j + 0.5) * cell;
    // interval x al capsulei pe acest rând (superset: +1 celulă); calculul exact e per celulă
    let xlo = xmax, xhi = xmin;
    const ea = py - ay, eb = py - by;
    if (ea * ea <= Re2) { const w = Math.sqrt(Re2 - ea * ea); if (ax - w < xlo) xlo = ax - w; if (ax + w > xhi) xhi = ax + w; }
    if (eb * eb <= Re2) { const w = Math.sqrt(Re2 - eb * eb); if (bx - w < xlo) xlo = bx - w; if (bx + w > xhi) xhi = bx + w; }
    if (!plunge) {
      // banda dreptunghiulară: 0 <= (P-A)·D <= L2 și |(P-A)×D| <= R*L, liniar în x
      let lo = xmin, hi = xmax;
      if (dx !== 0) { const p = (-ea * dy) / dx, q = (L2 - ea * dy) / dx; lo = Math.max(lo, Math.min(p, q) + ax); hi = Math.min(hi, Math.max(p, q) + ax); }
      else if (ea * dy < 0 || ea * dy > L2) { lo = 1; hi = 0; }
      if (dy !== 0) { const p = (-Re * L + ea * dx) / dy, q = (Re * L + ea * dx) / dy; lo = Math.max(lo, Math.min(p, q) + ax); hi = Math.min(hi, Math.max(p, q) + ax); }
      else if (Math.abs(ea) > Re) { lo = 1; hi = 0; }
      else { lo = Math.max(lo, xmin); hi = Math.min(hi, xmax); }
      if (lo <= hi) { if (lo < xlo) xlo = lo; if (hi > xhi) xhi = hi; }
    }
    if (xlo > xhi) continue;
    let i0 = Math.floor((xlo - F.x0) / cell - 0.5) - 1, i1 = Math.ceil((xhi - F.x0) / cell - 0.5) + 1;
    if (i0 < 0) i0 = 0; if (i1 > F.nx - 1) i1 = F.nx - 1;
    const roff = (j & M) << SH, trow = (j >> SH) * ntx;
    let tile = null, tcur = -1;
    for (let i = i0; i <= i1; i++) {
      const px = F.x0 + (i + 0.5) * cell;
      const ex = px - ax, ey = py - ay;
      let zs;
      if (plunge) {
        const q = ex * ex + ey * ey;
        if (q > R2) continue;
        zs = zlo + H(T, Math.sqrt(q));
      } else {
        const cr = ex * dy - ey * dx, perp2 = cr * cr * invL2;
        if (perp2 > R2) continue;
        const tx0 = i >> SH;
        if (tx0 !== tcur) { tcur = tx0; tile = tiles[trow + tx0]; }
        if (tile !== null && tile[roff | (i & M)] <= zlo) continue; // deja mai adânc decât orice punct al sculei aici
        const tp = (ex * dx + ey * dy) * invL2;
        const srho = Math.sqrt(R2 - perp2), half = srho * invL;
        let ta = tp - half, tb = tp + half;
        if (ta < 0) ta = 0; if (tb > 1) tb = 1;
        if (ta > tb) continue;
        if (kind === 0) {
          zs = az + dz * (dz > 0 ? ta : tb);
        } else if (kind === 1) {
          const rho2 = R2 - perp2, sa = (ta - tp) * L, sb = (tb - tp) * L;
          let s = mBall * srho;
          if (s < sa) s = sa; else if (s > sb) s = sb;
          const q = rho2 - s * s;
          zs = az + dz * tp + m * s + R - Math.sqrt(q > 0 ? q : 0);
        } else if (kind === 2) {
          const sa = (ta - tp) * L, sb = (tb - tp) * L;
          let s;
          if (m >= k) s = sa; else if (m <= -k) s = sb;
          else s = perp2 > 0 ? (-m * Math.sqrt(perp2)) / Math.sqrt(k2 - m2) : 0;
          if (s < sa) s = sa; else if (s > sb) s = sb;
          zs = az + dz * tp + m * s + k * Math.sqrt(s * s + perp2);
        } else {
          // profil, Z constant: distanța exactă la segment
          const tc = tp < 0 ? 0 : tp > 1 ? 1 : tp, a = (tc - tp) * L;
          zs = az + H(T, Math.sqrt(perp2 + a * a));
        }
      }
      const tx = i >> SH;
      if (tx !== tcur) { tcur = tx; tile = tiles[trow + tx]; }
      const kk = roff | (i & M);
      if (zs < (tile === null ? top : tile[kk])) { if (tile === null) tile = allocTile(F, trow + tx); tile[kk] = zs; }
    }
  }
}

// ștampilă de disc (folosită de profil cu Z variabil)
function stampDisk(F, T, sx, sy, sz) {
  const cell = F.cell, top = F.top, tiles = F.tiles, ntx = F.ntx;
  if (sz >= top) return;
  const R = reach(T, top - sz) * (1 + 1e-12) + 1e-9, R2 = Math.min(T.R2, R * R);
  let j0 = Math.floor((sy - R - F.y0) / cell - 0.5), j1 = Math.ceil((sy + R - F.y0) / cell - 0.5);
  if (j0 < F.jMin) j0 = F.jMin; if (j1 > F.jMax) j1 = F.jMax;
  for (let j = j0; j <= j1; j++) {
    if (F.own !== null && F.own[j >> SH] === 0) continue;
    const py = F.y0 + (j + 0.5) * cell, ey = py - sy;
    if (ey * ey > R2) continue;
    const w = Math.sqrt(R2 - ey * ey);
    let i0 = Math.floor((sx - w - F.x0) / cell - 0.5), i1 = Math.ceil((sx + w - F.x0) / cell - 0.5);
    if (i0 < 0) i0 = 0; if (i1 > F.nx - 1) i1 = F.nx - 1;
    const roff = (j & M) << SH, trow = (j >> SH) * ntx;
    for (let i = i0; i <= i1; i++) {
      const ex = F.x0 + (i + 0.5) * cell - sx, q = ex * ex + ey * ey;
      if (q > R2) continue;
      const zs = sz + H(T, Math.sqrt(q));
      const idx = trow + (i >> SH); let tile = tiles[idx];
      const kk = roff | (i & M);
      if (zs < (tile === null ? top : tile[kk])) { if (tile === null) tile = allocTile(F, idx); tile[kk] = zs; }
    }
  }
}

function stampLine(F, T, ax, ay, az, bx, by, bz) {
  const len = Math.hypot(bx - ax, by - ay, bz - az);
  const n = Math.max(1, Math.ceil(len / (F.cell / 4)));
  for (let s = 0; s <= n; s++) {
    const t = s / n;
    stampDisk(F, T, ax + (bx - ax) * t, ay + (by - ay) * t, az + (bz - az) * t);
  }
}

// ---------------------------------------------------------------- arc (G2/G3) în planul XY
// ccw=true pentru G3. Z constant => exact per celulă pentru orice h(r). Z variabil => coarde.
export function cutArc(F, T, ax, ay, az, bx, by, bz, cx, cy, ccw) {
  if (az >= F.top && bz >= F.top) return;
  if (az !== bz) return helix(F, T, ax, ay, az, bx, by, bz, cx, cy, ccw);
  if (!ccw) { let t = ax; ax = bx; bx = t; t = ay; ay = by; by = t; } // arc CW A->B == arc CCW B->A
  const z = az, cell = F.cell, R = T.R, R2 = T.R2, top = F.top, tiles = F.tiles, ntx = F.ntx;
  const ux = ax - cx, uy = ay - cy, vx = bx - cx, vy = by - cy;
  const r = Math.sqrt(ux * ux + uy * uy);
  const full = Math.abs(ax - bx) < 1e-12 && Math.abs(ay - by) < 1e-12;
  const crossUV = ux * vy - uy * vx;
  const big = !full && (crossUV < 0); // baleiaj > 180°
  const inside = (wx, wy) => {
    if (full) return true;
    const c0 = ux * wy - uy * wx, c1 = wx * vy - wy * vx;
    if (!big) return c0 >= 0 && c1 >= 0;
    return !(vx * wy - vy * wx > 0 && wx * uy - wy * ux > 0);
  };
  // cutia arcului (capete + extremele de pe axe din interiorul baleiajului) dilatată cu R
  let bx0 = Math.min(ax, bx), bx1 = Math.max(ax, bx), by0 = Math.min(ay, by), by1 = Math.max(ay, by);
  if (inside(1, 0)) bx1 = cx + r; if (inside(-1, 0)) bx0 = cx - r;
  if (inside(0, 1)) by1 = cy + r; if (inside(0, -1)) by0 = cy - r;
  const Re = reach(T, top - z) * (1 + 1e-12) + 1e-9;
  bx0 -= Re; bx1 += Re; by0 -= Re; by1 += Re;
  const ro = r + Re, ri = r - Re;
  let j0 = Math.floor((by0 - F.y0) / cell - 0.5), j1 = Math.ceil((by1 - F.y0) / cell - 0.5);
  if (j0 < F.jMin) j0 = F.jMin; if (j1 > F.jMax) j1 = F.jMax;
  for (let j = j0; j <= j1; j++) {
    if (F.own !== null && F.own[j >> SH] === 0) continue;
    const py = F.y0 + (j + 0.5) * cell, ey = py - cy;
    if (ey * ey > ro * ro) continue;
    const xo = Math.sqrt(ro * ro - ey * ey);
    const xi = ri > 0 && ey * ey < ri * ri ? Math.sqrt(ri * ri - ey * ey) : -1;
    const roff = (j & M) << SH, trow = (j >> SH) * ntx;
    for (let part = 0; part < (xi >= 0 ? 2 : 1); part++) {
      let xlo, xhi;
      if (xi < 0) { xlo = cx - xo; xhi = cx + xo; }
      else if (part === 0) { xlo = cx - xo; xhi = cx - xi; } else { xlo = cx + xi; xhi = cx + xo; }
      if (xlo < bx0) xlo = bx0; if (xhi > bx1) xhi = bx1;
      if (xlo > xhi) continue;
      let i0 = Math.floor((xlo - F.x0) / cell - 0.5) - 1, i1 = Math.ceil((xhi - F.x0) / cell - 0.5) + 1;
      if (i0 < 0) i0 = 0; if (i1 > F.nx - 1) i1 = F.nx - 1;
      let tile = null, tcur = -1;
      for (let i = i0; i <= i1; i++) {
        const px = F.x0 + (i + 0.5) * cell, wx = px - cx;
        let d;
        if (inside(wx, ey)) d = Math.abs(Math.sqrt(wx * wx + ey * ey) - r);
        else {
          const qa = (px - ax) * (px - ax) + (py - ay) * (py - ay), qb = (px - bx) * (px - bx) + (py - by) * (py - by);
          d = Math.sqrt(qa < qb ? qa : qb);
        }
        if (d > R) continue;
        const zs = z + H(T, d);
        const tx = i >> SH;
        if (tx !== tcur) { tcur = tx; tile = tiles[trow + tx]; }
        const kk = roff | (i & M);
        if (zs < (tile === null ? top : tile[kk])) { if (tile === null) tile = allocTile(F, trow + tx); tile[kk] = zs; }
      }
    }
  }
}

// Elice cu freză plată, EXACT per celulă: pe cerc, unghiurile la care scula acoperă celula formează
// un interval [phi-alfa, phi+alfa]; Z e liniar în unghi, deci minimul e la un capăt al intersecției.
function helixFlat(F, T, ax, ay, az, bx, by, bz, cx, cy, ccw) {
  const cell = F.cell, R = T.R, R2 = T.R2, top = F.top, tiles = F.tiles, ntx = F.ntx, TWO_PI = 2 * Math.PI;
  const r = Math.hypot(ax - cx, ay - cy), th0 = Math.atan2(ay - cy, ax - cx), th1 = Math.atan2(by - cy, bx - cx);
  let S = ccw ? th1 - th0 : th0 - th1;
  while (S <= 1e-12) S += TWO_PI;
  const dir = ccw ? 1 : -1, dz = bz - az;
  const ro = r + R, ri = r - R;
  let j0 = Math.floor((cy - ro - F.y0) / cell - 0.5), j1 = Math.ceil((cy + ro - F.y0) / cell - 0.5);
  if (j0 < F.jMin) j0 = F.jMin; if (j1 > F.jMax) j1 = F.jMax;
  for (let j = j0; j <= j1; j++) {
    if (F.own !== null && F.own[j >> SH] === 0) continue;
    const py = F.y0 + (j + 0.5) * cell, wy = py - cy;
    if (wy * wy > ro * ro) continue;
    const xo = Math.sqrt(ro * ro - wy * wy);
    let i0 = Math.floor((cx - xo - F.x0) / cell - 0.5) - 1, i1 = Math.ceil((cx + xo - F.x0) / cell - 0.5) + 1;
    if (i0 < 0) i0 = 0; if (i1 > F.nx - 1) i1 = F.nx - 1;
    const roff = (j & M) << SH, trow = (j >> SH) * ntx;
    for (let i = i0; i <= i1; i++) {
      const wx = F.x0 + (i + 0.5) * cell - cx, rho2 = wx * wx + wy * wy, rho = Math.sqrt(rho2);
      if (rho > ro || (ri > 0 && rho < ri)) continue;
      let u;
      const C = rho > 1e-12 ? (rho2 + r * r - R2) / (2 * rho * r) : (r <= R ? -2 : 2);
      if (C > 1) continue;
      if (C <= -1) u = dz < 0 ? S : 0;
      else {
        const al = Math.acos(C);
        let v = dir * (Math.atan2(wy, wx) - th0);
        v = v - TWO_PI * Math.floor(v / TWO_PI);
        u = -1;
        for (let kk = -1; kk <= 1; kk++) {
          const lo = Math.max(0, v - al + TWO_PI * kk), hi = Math.min(S, v + al + TWO_PI * kk);
          if (lo > hi) continue;
          const cand = dz < 0 ? hi : lo;
          if (u < 0 || (dz < 0 ? cand > u : cand < u)) u = cand;
        }
        if (u < 0) continue;
      }
      const zs = az + (dz * u) / S;
      const idx = trow + (i >> SH); let tile = tiles[idx];
      const kq = roff | (i & M);
      if (zs < (tile === null ? top : tile[kq])) { if (tile === null) tile = allocTile(F, idx); tile[kq] = zs; }
    }
  }
}

function helix(F, T, ax, ay, az, bx, by, bz, cx, cy, ccw) {
  if (T.kind === 0 && !globalThis.__HELIX_CHORDS) return helixFlat(F, T, ax, ay, az, bx, by, bz, cx, cy, ccw);
  const r = Math.hypot(ax - cx, ay - cy);
  const a0 = Math.atan2(ay - cy, ax - cx);
  let a1 = Math.atan2(by - cy, bx - cx);
  let sw = a1 - a0;
  if (ccw) { if (sw <= 0) sw += 2 * Math.PI; } else { if (sw >= 0) sw -= 2 * Math.PI; }
  const tol = F.cell / 20; // săgeata maximă a coardei
  const dA = r > tol ? 2 * Math.acos(1 - tol / r) : Math.PI / 2;
  const n = Math.max(1, Math.ceil(Math.abs(sw) / dA));
  let px = ax, py = ay, pz = az;
  for (let s = 1; s <= n; s++) {
    const a = a0 + (sw * s) / n;
    const qx = s === n ? bx : cx + r * Math.cos(a), qy = s === n ? by : cy + r * Math.sin(a), qz = az + ((bz - az) * s) / n;
    cutLine(F, T, px, py, pz, qx, qy, qz);
    px = qx; py = qy; pz = qz;
  }
}

// ---------------------------------------------------------------- IR și rulare
// Operație: { tool: spec, moves: Float64Array, stride 9: [kind, ax, ay, az, bx, by, bz, cx, cy] }
//   kind 0 = linie (G0/G1), 2 = arc CW (G2), 3 = arc CCW (G3)
// sau { tool, poly: Float64Array [x,y,z, x,y,z, ...] } = polilinie (rastru 3D).
export const STRIDE = 9;
export function runOp(F, op) {
  const T = makeTool(op.tool);
  if (op.poly) {
    const p = op.poly, n = p.length / 3;
    for (let i = 1; i < n; i++) {
      const a = 3 * (i - 1), b = 3 * i;
      cutLine(F, T, p[a], p[a + 1], p[a + 2], p[b], p[b + 1], p[b + 2]);
    }
    return n - 1;
  }
  const mv = op.moves, n = mv.length / STRIDE;
  for (let i = 0; i < n; i++) {
    const o = i * STRIDE, kind = mv[o];
    if (kind === 0) cutLine(F, T, mv[o + 1], mv[o + 2], mv[o + 3], mv[o + 4], mv[o + 5], mv[o + 6]);
    else cutArc(F, T, mv[o + 1], mv[o + 2], mv[o + 3], mv[o + 4], mv[o + 5], mv[o + 6], mv[o + 7], mv[o + 8], kind === 3);
  }
  return n;
}

export function runJob(F, job) {
  let n = 0;
  for (const op of job.ops) n += runOp(F, op);
  return n;
}

// ---------------------------------------------------------------- statistici
export function stats(F) {
  let alloc = 0, uniform = 0;
  for (const t of F.tiles) {
    if (t === null) continue;
    alloc++;
    const v = t[0];
    let u = true;
    for (let k = 1; k < TILE_CELLS; k++) if (t[k] !== v) { u = false; break; }
    if (u) uniform++;
  }
  const totalTiles = F.ntx * F.nty;
  return {
    cells: F.nx * F.ny, tilesTotal: totalTiles, tilesAlloc: alloc, tilesUniform: uniform,
    denseBytes: F.nx * F.ny * 4, sparseBytes: alloc * TILE_CELLS * 4,
    sparseBytesIfUniformCollapsed: (alloc - uniform) * TILE_CELLS * 4 + uniform * 8,
  };
}
