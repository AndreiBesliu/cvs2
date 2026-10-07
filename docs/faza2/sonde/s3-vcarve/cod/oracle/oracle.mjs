// ORACLE (sonda s3-vcarve). ZERO importuri din src/: alt cod, alta metoda.
// Suprafata ideala V-carve: z(x,y) = -min(D, dist(x,y,contur) / tan(theta/2)) in interior, 0 in afara.
// Distanta se calculeaza EXACT pe curbele de intrare (linie, arc, Bezier patratic si cubic),
// restransa la bucatile de curba care sunt chiar granita regiunii (conteaza la fonturile cu contururi suprapuse).
// Interiorul: regula nonzero sau evenodd, prin numararea intersectiilor cu o orizontala, pe curbele exacte.

const EPS_T = 1e-12;

// ---------- evaluare curbe (parametru t in [0,1]) ----------
function ev(c, t) {
  switch (c.k) {
    case 'L': return [c.p0[0] + t * (c.p1[0] - c.p0[0]), c.p0[1] + t * (c.p1[1] - c.p0[1])];
    case 'A': { const a = c.a0 + t * (c.a1 - c.a0); return [c.c[0] + c.r * Math.cos(a), c.c[1] + c.r * Math.sin(a)]; }
    case 'Q': { const u = 1 - t; return [u * u * c.p0[0] + 2 * u * t * c.p1[0] + t * t * c.p2[0], u * u * c.p0[1] + 2 * u * t * c.p1[1] + t * t * c.p2[1]]; }
    case 'C': { const u = 1 - t; const b0 = u * u * u, b1 = 3 * u * u * t, b2 = 3 * u * t * t, b3 = t * t * t;
      return [b0 * c.p0[0] + b1 * c.p1[0] + b2 * c.p2[0] + b3 * c.p3[0], b0 * c.p0[1] + b1 * c.p1[1] + b2 * c.p2[1] + b3 * c.p3[1]]; }
  }
  throw new Error('curba necunoscuta ' + c.k);
}
function der(c, t) {
  switch (c.k) {
    case 'L': return [c.p1[0] - c.p0[0], c.p1[1] - c.p0[1]];
    case 'A': { const a = c.a0 + t * (c.a1 - c.a0), w = c.a1 - c.a0; return [-c.r * Math.sin(a) * w, c.r * Math.cos(a) * w]; }
    case 'Q': { const u = 1 - t; return [2 * u * (c.p1[0] - c.p0[0]) + 2 * t * (c.p2[0] - c.p1[0]), 2 * u * (c.p1[1] - c.p0[1]) + 2 * t * (c.p2[1] - c.p1[1])]; }
    case 'C': { const u = 1 - t;
      return [3 * u * u * (c.p1[0] - c.p0[0]) + 6 * u * t * (c.p2[0] - c.p1[0]) + 3 * t * t * (c.p3[0] - c.p2[0]),
              3 * u * u * (c.p1[1] - c.p0[1]) + 6 * u * t * (c.p2[1] - c.p1[1]) + 3 * t * t * (c.p3[1] - c.p2[1])]; }
  }
}

// ---------- radacini reale ale polinoamelor de grad <= 3 (formule inchise) ----------
function rootsPoly(a3, a2, a1, a0) { // a3 t^3 + a2 t^2 + a1 t + a0
  const sc = Math.max(Math.abs(a3), Math.abs(a2), Math.abs(a1), Math.abs(a0)) || 1;
  if (Math.abs(a3) < 1e-14 * sc) {
    if (Math.abs(a2) < 1e-14 * sc) { if (Math.abs(a1) < 1e-14 * sc) return []; return [-a0 / a1]; }
    const D = a1 * a1 - 4 * a2 * a0; if (D < 0) return [];
    const s = Math.sqrt(D); const q = -0.5 * (a1 + (a1 >= 0 ? s : -s));
    const r = []; if (q !== 0) r.push(a0 / q); if (a2 !== 0) r.push(q / a2); return r;
  }
  const b = a2 / a3, c = a1 / a3, d = a0 / a3;
  const p = c - b * b / 3, q = 2 * b * b * b / 27 - b * c / 3 + d;
  const off = -b / 3; const disc = q * q / 4 + p * p * p / 27;
  let roots;
  if (disc > 1e-30) { const s = Math.sqrt(disc); roots = [Math.cbrt(-q / 2 + s) + Math.cbrt(-q / 2 - s)]; }
  else if (Math.abs(disc) <= 1e-30) { const u = Math.cbrt(-q / 2); roots = [2 * u, -u]; }
  else { const r = Math.sqrt(-p * p * p / 27); const phi = Math.acos(Math.max(-1, Math.min(1, -q / (2 * r)))); const m = 2 * Math.cbrt(r);
    roots = [m * Math.cos(phi / 3), m * Math.cos((phi + 2 * Math.PI) / 3), m * Math.cos((phi + 4 * Math.PI) / 3)]; }
  // o iteratie Newton pe polinomul original, pentru precizie
  return roots.map((x) => { x += off; for (let i = 0; i < 3; i++) { const f = ((a3 * x + a2) * x + a1) * x + a0, df = (3 * a3 * x + 2 * a2) * x + a1; if (df !== 0) x -= f / df; } return x; });
}

// ---------- distanta exacta punct-curba pe intervalul [ta,tb] ----------
function distCurve(c, ta, tb, x, y) {
  const cand = [ta, tb];
  if (c.k === 'L') {
    const dx = c.p1[0] - c.p0[0], dy = c.p1[1] - c.p0[1], L2 = dx * dx + dy * dy;
    if (L2 > 0) cand.push(((x - c.p0[0]) * dx + (y - c.p0[1]) * dy) / L2);
  } else if (c.k === 'A') {
    let a = Math.atan2(y - c.c[1], x - c.c[0]);
    const w = c.a1 - c.a0;
    for (const k of [-2, -1, 0, 1, 2]) cand.push((a + 2 * Math.PI * k - c.a0) / w);
  } else if (c.k === 'Q') {
    // (B(t)-p).B'(t) = 0 ; B = A t^2 + Bv t + C
    const Ax = c.p0[0] - 2 * c.p1[0] + c.p2[0], Ay = c.p0[1] - 2 * c.p1[1] + c.p2[1];
    const Bx = 2 * (c.p1[0] - c.p0[0]), By = 2 * (c.p1[1] - c.p0[1]);
    const Cx = c.p0[0] - x, Cy = c.p0[1] - y;
    // (A t^2 + B t + C).(2A t + B)
    const k3 = 2 * (Ax * Ax + Ay * Ay), k2 = 3 * (Ax * Bx + Ay * By), k1 = (Bx * Bx + By * By) + 2 * (Ax * Cx + Ay * Cy), k0 = Bx * Cx + By * Cy;
    for (const r of rootsPoly(k3, k2, k1, k0)) cand.push(r);
  } else if (c.k === 'C') {
    // forta bruta: 64 de esantioane + Newton pe minimele locale
    const N = 64; let prev = Infinity, prev2 = Infinity; const ds = [];
    for (let i = 0; i <= N; i++) { const t = ta + (tb - ta) * i / N; const p = ev(c, t); ds.push((p[0] - x) ** 2 + (p[1] - y) ** 2); }
    for (let i = 0; i <= N; i++) {
      const l = i > 0 ? ds[i - 1] : Infinity, r = i < N ? ds[i + 1] : Infinity;
      if (ds[i] <= l && ds[i] <= r) {
        let t = ta + (tb - ta) * i / N;
        for (let it = 0; it < 30; it++) {
          const p = ev(c, t), d1 = der(c, t);
          const h = 1e-6; const d1b = der(c, Math.min(1, t + h)), d1a = der(c, Math.max(0, t - h));
          const d2 = [(d1b[0] - d1a[0]) / (Math.min(1, t + h) - Math.max(0, t - h)), (d1b[1] - d1a[1]) / (Math.min(1, t + h) - Math.max(0, t - h))];
          const f = (p[0] - x) * d1[0] + (p[1] - y) * d1[1];
          const df = d1[0] * d1[0] + d1[1] * d1[1] + (p[0] - x) * d2[0] + (p[1] - y) * d2[1];
          if (df <= 0) break;
          const tn = Math.max(ta, Math.min(tb, t - f / df));
          if (Math.abs(tn - t) < 1e-14) { t = tn; break; }
          t = tn;
        }
        cand.push(t);
      }
    }
  }
  let best = Infinity;
  for (let t of cand) {
    if (!(t >= ta - EPS_T && t <= tb + EPS_T)) continue;
    t = Math.max(ta, Math.min(tb, t));
    const p = ev(c, t); const d = (p[0] - x) ** 2 + (p[1] - y) ** 2;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}

// ---------- intersectii cu orizontala y = Y: [x, sens] ----------
function crossings(c, Y, out) {
  if (c.k === 'L') {
    const y0 = c.p0[1], y1 = c.p1[1];
    if ((y0 <= Y && Y < y1) || (y1 <= Y && Y < y0)) out.push([c.p0[0] + (Y - y0) * (c.p1[0] - c.p0[0]) / (y1 - y0), y1 > y0 ? 1 : -1]);
    return;
  }
  let ts = [];
  if (c.k === 'A') {
    const s = (Y - c.c[1]) / c.r; if (s < -1 || s > 1) return;
    const a1 = Math.asin(s), a2 = Math.PI - a1; const w = c.a1 - c.a0;
    for (const a of [a1, a2]) for (const k of [-2, -1, 0, 1, 2]) ts.push((a + 2 * Math.PI * k - c.a0) / w);
  } else if (c.k === 'Q') {
    const A = c.p0[1] - 2 * c.p1[1] + c.p2[1], B = 2 * (c.p1[1] - c.p0[1]), C = c.p0[1] - Y;
    ts = rootsPoly(0, A, B, C);
  } else if (c.k === 'C') {
    const a = -c.p0[1] + 3 * c.p1[1] - 3 * c.p2[1] + c.p3[1], b = 3 * c.p0[1] - 6 * c.p1[1] + 3 * c.p2[1], cc = -3 * c.p0[1] + 3 * c.p1[1], d = c.p0[1] - Y;
    ts = rootsPoly(a, b, cc, d);
  }
  const seen = [];
  for (const t of ts) {
    if (!(t >= 0 && t < 1)) continue;
    if (seen.some((u) => Math.abs(u - t) < 1e-12)) continue; seen.push(t);
    const dy = der(c, t)[1]; if (dy === 0) continue;
    out.push([ev(c, t)[0], dy > 0 ? 1 : -1]);
  }
}

function bboxCurve(c) {
  const N = c.k === 'L' ? 1 : 32; let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i <= N; i++) { const p = ev(c, i / N); x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
  if (c.k !== 'L') { const pad = c.k === 'A' ? c.r * 0.01 + 1e-9 : 1e-3 * Math.hypot(x1 - x0, y1 - y0) + 1e-9; x0 -= pad; y0 -= pad; x1 += pad; y1 += pad; }
  // pentru Bezier: infasuratoarea poligonului de control e sigura
  if (c.k === 'Q' || c.k === 'C') { for (const p of [c.p0, c.p1, c.p2, c.p3].filter(Boolean)) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); } }
  return [x0, y0, x1, y1];
}

export function makeOracle(loops, fill) {
  const curves = loops.flat();
  const boxes = curves.map(bboxCurve);
  let X0 = Infinity, Y0 = Infinity, X1 = -Infinity, Y1 = -Infinity;
  for (const b of boxes) { X0 = Math.min(X0, b[0]); Y0 = Math.min(Y0, b[1]); X1 = Math.max(X1, b[2]); Y1 = Math.max(Y1, b[3]); }
  // index pe benzi Y pentru interior
  const BH = Math.max((Y1 - Y0) / 400, 0.05); const nb = Math.ceil((Y1 - Y0) / BH) + 1; const bands = Array.from({ length: nb }, () => []);
  curves.forEach((c, i) => { const b = boxes[i]; for (let k = Math.max(0, Math.floor((b[1] - Y0) / BH)); k <= Math.min(nb - 1, Math.floor((b[3] - Y0) / BH)); k++) bands[k].push(i); });
  const rowCrossings = (Y) => {
    const out = []; const k = Math.floor((Y - Y0) / BH); if (k < 0 || k >= nb) return out;
    for (const i of bands[k]) { const b = boxes[i]; if (Y < b[1] || Y > b[3]) continue; crossings(curves[i], Y, out); }
    out.sort((a, b) => a[0] - b[0]); return out;
  };
  const insideFrom = (w, n) => (fill === 'evenodd' ? (n & 1) === 1 : w !== 0);
  const inside = (x, y) => {
    const cr = rowCrossings(y); let w = 0, n = 0;
    for (const [cx, s] of cr) if (cx > x) { w += s; n++; }
    return insideFrom(w, n);
  };
  // bucatile de granita: pe fiecare curba, unde o parte e in interior si cealalta nu
  const pieces = [];
  curves.forEach((c, i) => {
    let len = 0; { let p = ev(c, 0); for (let k = 1; k <= 16; k++) { const q = ev(c, k / 16); len += Math.hypot(q[0] - p[0], q[1] - p[1]); p = q; } }
    const N = Math.max(8, Math.ceil(len / 0.01));
    const eps = 2e-6;
    const isB = (t) => { const p = ev(c, t), d = der(c, t); const L = Math.hypot(d[0], d[1]) || 1; const nx = -d[1] / L, ny = d[0] / L;
      return inside(p[0] + eps * nx, p[1] + eps * ny) !== inside(p[0] - eps * nx, p[1] - eps * ny); };
    let st = null; let prevT = 0, prevB = isB(0.5 / N);
    if (prevB) st = 0;
    for (let k = 1; k < N; k++) {
      const t = (k + 0.5) / N; const b = isB(t);
      if (b !== prevB) { // rafinare prin bisectie a trecerii
        let lo = (k - 0.5) / N, hi = t; for (let it = 0; it < 40; it++) { const m = (lo + hi) / 2; if (isB(m) === prevB) lo = m; else hi = m; }
        const tt = (lo + hi) / 2;
        if (b) st = tt; else { pieces.push([i, st, tt]); st = null; }
        prevB = b;
      }
      prevT = t;
    }
    if (st !== null) pieces.push([i, st, 1]);
  });
  // index de distanta: grila de celule cu bucatile
  const CS = Math.max(Math.sqrt((X1 - X0) * (Y1 - Y0) / Math.max(1, pieces.length)) * 1.5, 0.05);
  const nx = Math.ceil((X1 - X0) / CS) + 1, ny = Math.ceil((Y1 - Y0) / CS) + 1;
  const cells = new Map();
  pieces.forEach((pc, pi) => { const b = boxes[pc[0]];
    for (let ix = Math.max(0, Math.floor((b[0] - X0) / CS)); ix <= Math.min(nx - 1, Math.floor((b[2] - X0) / CS)); ix++)
      for (let iy = Math.max(0, Math.floor((b[1] - Y0) / CS)); iy <= Math.min(ny - 1, Math.floor((b[3] - Y0) / CS)); iy++) {
        const key = iy * nx + ix; let a = cells.get(key); if (!a) cells.set(key, (a = [])); a.push(pi); } });
  const dist = (x, y) => {
    const cx = Math.floor((x - X0) / CS), cy = Math.floor((y - Y0) / CS);
    let best = Infinity; const seen = new Set();
    for (let ring = 0; ring < Math.max(nx, ny) + 2; ring++) {
      // distanta minima posibila din inelul `ring`
      if (ring > 0) { const lb = (ring - 1) * CS; if (lb > best) break; }
      for (let ix = cx - ring; ix <= cx + ring; ix++) for (let iy = cy - ring; iy <= cy + ring; iy++) {
        if (Math.max(Math.abs(ix - cx), Math.abs(iy - cy)) !== ring) continue;
        if (ix < 0 || iy < 0 || ix >= nx || iy >= ny) continue;
        const a = cells.get(iy * nx + ix); if (!a) continue;
        for (const pi of a) { if (seen.has(pi)) continue; seen.add(pi); const [ci, ta, tb] = pieces[pi]; const d = distCurve(curves[ci], ta, tb, x, y); if (d < best) best = d; }
      }
    }
    return best;
  };
  return { inside, dist, rowCrossings, insideFrom, bbox: [X0, Y0, X1, Y1], pieces: pieces.length, curves: curves.length, pieceList: pieces };
}

// suprafata ideala pe o grila; intoarce Float32Array
export function idealGrid(or, grid, theta, D) {
  const { x0, y0, g, nx, ny } = grid; const cot = 1 / Math.tan(theta * Math.PI / 360);
  const Z = new Float32Array(nx * ny); const IN = new Uint8Array(nx * ny);
  for (let j = 0; j < ny; j++) {
    const y = y0 + (j + 0.5) * g; const cr = or.rowCrossings(y);
    // parcurgere de la dreapta la stanga a intersectiilor pentru interior pe rand
    let k = cr.length - 1, w = 0, n = 0;
    for (let i = nx - 1; i >= 0; i--) {
      const x = x0 + (i + 0.5) * g;
      while (k >= 0 && cr[k][0] > x) { w += cr[k][1]; n++; k--; }
      if (or.insideFrom(w, n)) { IN[j * nx + i] = 1; Z[j * nx + i] = -Math.min(D, or.dist(x, y) * cot); }
    }
  }
  return { Z, IN };
}
