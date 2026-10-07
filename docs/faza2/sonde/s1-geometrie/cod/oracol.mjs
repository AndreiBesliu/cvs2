// ORACOL INDEPENDENT. Nu importa nimic din geom.mjs si nici din biblioteci.
// Citeste doar DATELE in formatul neutru (L/A/C/Q/K) si le evalueaza cu formulele lui.

const TAU = 2 * Math.PI;

// --- evaluare proprie a oracolului ---
function pt(s, t) {
  if (s.k === 'L') return [s.x0 + (s.x1 - s.x0) * t, s.y0 + (s.y1 - s.y0) * t];
  if (s.k === 'A') { const a = s.a0 + s.da * t; return [s.cx + s.r * Math.cos(a), s.cy + s.r * Math.sin(a)]; }
  if (s.k === 'C') { const u = 1 - t, b0 = u * u * u, b1 = 3 * u * u * t, b2 = 3 * u * t * t, b3 = t * t * t; return [b0 * s.x0 + b1 * s.x1 + b2 * s.x2 + b3 * s.x3, b0 * s.y0 + b1 * s.y1 + b2 * s.y2 + b3 * s.y3]; }
  if (s.k === 'Q') { const u = 1 - t; return [u * u * s.x0 + 2 * u * t * s.x1 + t * t * s.x2, u * u * s.y0 + 2 * u * t * s.y1 + t * t * s.y2]; }
  if (s.k === 'K') { const u = 1 - t, w = s.w, d = u * u + 2 * w * u * t + t * t; return [(u * u * s.x0 + 2 * w * u * t * s.x1 + t * t * s.x2) / d, (u * u * s.y0 + 2 * w * u * t * s.y1 + t * t * s.y2) / d]; }
  throw new Error('oracol: tip ' + s.k);
}
function der(s, t) {
  if (s.k === 'L') return [s.x1 - s.x0, s.y1 - s.y0];
  if (s.k === 'A') { const a = s.a0 + s.da * t; return [-s.r * Math.sin(a) * s.da, s.r * Math.cos(a) * s.da]; }
  if (s.k === 'C') { const u = 1 - t; return [3 * (u * u * (s.x1 - s.x0) + 2 * u * t * (s.x2 - s.x1) + t * t * (s.x3 - s.x2)), 3 * (u * u * (s.y1 - s.y0) + 2 * u * t * (s.y2 - s.y1) + t * t * (s.y3 - s.y2))]; }
  if (s.k === 'Q') { const u = 1 - t; return [2 * (u * (s.x1 - s.x0) + t * (s.x2 - s.x1)), 2 * (u * (s.y1 - s.y0) + t * (s.y2 - s.y1))]; }
  // conica: derivata numerica centrata (doar pentru lungime / arie prin cuadratura)
  const h = 1e-6; const a = pt(s, Math.max(0, t - h)), b = pt(s, Math.min(1, t + h)); const dt = Math.min(1, t + h) - Math.max(0, t - h);
  return [(b[0] - a[0]) / dt, (b[1] - a[1]) / dt];
}

// Gauss-Legendre 8 puncte pe [0,1]
const GLX = [0.0198550717512319, 0.1016667612931866, 0.2372337950418355, 0.4082826787521751, 0.5917173212478249, 0.7627662049581645, 0.8983332387068134, 0.9801449282487681];
const GLW = [0.0506142681451881, 0.1111905172266872, 0.1568533229389436, 0.1813418916891810, 0.1813418916891810, 0.1568533229389436, 0.1111905172266872, 0.0506142681451881];

function quad(f, pieces) {
  let s = 0;
  for (let p = 0; p < pieces; p++) for (let i = 0; i < 8; i++) { const t = (p + GLX[i]) / pieces; s += GLW[i] / pieces * f(t); }
  return s;
}

// aria cu semn a unei regiuni = suma integralelor ∮ x dy pe segmentele orientate (Green)
export function areaRegion(region) {
  let A = 0;
  for (const c of region) for (const s of c.segs) {
    if (s.k === 'L') A += (s.x0 + s.x1) / 2 * (s.y1 - s.y0);
    else if (s.k === 'A') {
      // ∫ (cx + r cos θ) r cos θ dθ = cx r [sin θ] + r^2 [θ/2 + sin 2θ /4]
      const a0 = s.a0, a1 = s.a0 + s.da;
      A += s.cx * s.r * (Math.sin(a1) - Math.sin(a0)) + s.r * s.r * ((a1 - a0) / 2 + (Math.sin(2 * a1) - Math.sin(2 * a0)) / 4);
    } else {
      const pieces = s.k === 'K' ? 16 : 2;
      A += quad((t) => pt(s, t)[0] * der(s, t)[1], pieces);
    }
  }
  return A;
}
export function lengthRegion(region) {
  let L = 0;
  for (const c of region) for (const s of c.segs) {
    if (s.k === 'L') L += Math.hypot(s.x1 - s.x0, s.y1 - s.y0);
    else if (s.k === 'A') L += Math.abs(s.da) * s.r;
    else L += quad((t) => { const d = der(s, t); return Math.hypot(d[0], d[1]); }, 32);
  }
  return L;
}

// esantionare densa a unui segment (pasul h in mm)
export function sampleSeg(s, h) {
  let len;
  if (s.k === 'L') len = Math.hypot(s.x1 - s.x0, s.y1 - s.y0);
  else if (s.k === 'A') len = Math.abs(s.da) * s.r;
  else { len = 0; let p = pt(s, 0); for (let i = 1; i <= 64; i++) { const q = pt(s, i / 64); len += Math.hypot(q[0] - p[0], q[1] - p[1]); p = q; } }
  const n = Math.max(s.k === 'L' ? 1 : 16, Math.min(200000, Math.ceil(len / h)));
  const out = [];
  for (let i = 0; i <= n; i++) out.push(pt(s, i / n));
  return out;
}

// polilinie densa pentru tot conturul (lista de puncte, inchisa daca e cazul)
export function densePolys(region, h) {
  return region.map((c) => { const pts = []; for (const s of c.segs) { const sp = sampleSeg(s, h); for (let i = pts.length ? 1 : 0; i < sp.length; i++) pts.push(sp[i]); } return pts; });
}

// numarul de infasurare (nonzero) si paritatea, pe polilinii dense
export function winding(polys, x, y) {
  let w = 0, cross = 0;
  for (const P of polys) {
    for (let i = 0; i + 1 < P.length; i++) {
      const a = P[i], b = P[i + 1];
      if ((a[1] <= y) !== (b[1] <= y)) {
        const xi = a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]);
        if (xi > x) { cross++; w += b[1] > a[1] ? 1 : -1; }
      }
    }
  }
  return { nonzero: w !== 0, evenodd: (cross & 1) === 1, w };
}

// grila uniforma de segmente pentru distanta rapida punct -> frontiera
export function makeDistIndex(polys, cell) {
  const segs = [];
  for (const P of polys) for (let i = 0; i + 1 < P.length; i++) segs.push([P[i][0], P[i][1], P[i + 1][0], P[i + 1][1]]);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const s of segs) { x0 = Math.min(x0, s[0], s[2]); y0 = Math.min(y0, s[1], s[3]); x1 = Math.max(x1, s[0], s[2]); y1 = Math.max(y1, s[1], s[3]); }
  const nx = Math.max(1, Math.min(256, Math.ceil((x1 - x0) / cell))), ny = Math.max(1, Math.min(256, Math.ceil((y1 - y0) / cell)));
  const cx = (x1 - x0) / nx || 1, cy = (y1 - y0) / ny || 1;
  const grid = new Map();
  segs.forEach((s, k) => {
    const i0 = Math.floor((Math.min(s[0], s[2]) - x0) / cx), i1 = Math.floor((Math.max(s[0], s[2]) - x0) / cx);
    const j0 = Math.floor((Math.min(s[1], s[3]) - y0) / cy), j1 = Math.floor((Math.max(s[1], s[3]) - y0) / cy);
    const cl = (v, n) => Math.max(0, Math.min(n - 1, v));
    for (let i = cl(i0, nx); i <= cl(i1, nx); i++) for (let j = cl(j0, ny); j <= cl(j1, ny); j++) { const key = i * 1024 + j; if (!grid.has(key)) grid.set(key, []); grid.get(key).push(k); }
  });
  return { segs, grid, x0, y0, nx, ny, cx, cy };
}
function dSeg(s, x, y) {
  const dx = s[2] - s[0], dy = s[3] - s[1], l2 = dx * dx + dy * dy;
  let t = l2 > 0 ? ((x - s[0]) * dx + (y - s[1]) * dy) / l2 : 0; t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(s[0] + t * dx - x, s[1] + t * dy - y);
}
export function distTo(idx, x, y) {
  if (!idx.segs.length) return Infinity;
  const ci = Math.floor((x - idx.x0) / idx.cx), cj = Math.floor((y - idx.y0) / idx.cy);
  let best = Infinity;
  for (let ring = 0; ring < Math.max(idx.nx, idx.ny) + 2; ring++) {
    let any = false;
    for (let i = ci - ring; i <= ci + ring; i++) for (let j = cj - ring; j <= cj + ring; j++) {
      if (Math.max(Math.abs(i - ci), Math.abs(j - cj)) !== ring) continue;
      if (i < 0 || j < 0 || i >= idx.nx || j >= idx.ny) continue;
      any = true;
      const L = idx.grid.get(i * 1024 + j); if (!L) continue;
      for (const k of L) { const d = dSeg(idx.segs[k], x, y); if (d < best) best = d; }
    }
    // dupa ce am gasit ceva, mai e nevoie de un inel (celula vecina poate fi mai aproape)
    const ringDist = Math.max(0, (ring) * Math.min(idx.cx, idx.cy) - Math.max(Math.abs(x - (idx.x0 + (ci + 0.5) * idx.cx)), Math.abs(y - (idx.y0 + (cj + 0.5) * idx.cy))));
    if (best < Infinity && best <= ringDist) break;
    if (!any && (ci - ring < 0 && cj - ring < 0 && ci + ring >= idx.nx && cj + ring >= idx.ny)) break;
  }
  if (best === Infinity) for (const s of idx.segs) best = Math.min(best, dSeg(s, x, y));
  return best;
}

// --- adevaruri analitice (pe hartie) ---
export const truth = {
  circleArea: (R) => Math.PI * R * R,
  circlePerim: (R) => TAU * R,
  // dreptunghi rotunjit W x H, raza r, offset d (d>0 in afara)
  rrectOffArea: (W, H, r, d) => {
    if (d >= 0) { const A0 = W * H - (4 - Math.PI) * r * r, P0 = 2 * (W + H) - 8 * r + TAU * r; return A0 + P0 * d + Math.PI * d * d; }
    const e = -d; const rr = Math.max(0, r - e); return (W - 2 * e) * (H - 2 * e) - (4 - Math.PI) * rr * rr;
  },
  rrectOffPerim: (W, H, r, d) => {
    if (d >= 0) return 2 * (W + H) - 8 * r + TAU * r + TAU * d;
    const e = -d; const rr = Math.max(0, r - e); return 2 * (W - 2 * e + H - 2 * e) - 8 * rr + TAU * rr;
  },
  // doua cercuri de raza r la distanta c: aria lentilei
  lens: (r, c) => c >= 2 * r ? 0 : 2 * r * r * Math.acos(c / (2 * r)) - (c / 2) * Math.sqrt(4 * r * r - c * c),
};

// distanta cu semn la dreptunghiul rotunjit (exacta), in cadrul local
export function sdRoundBox(x, y, cx, cy, W, H, r, rot) {
  const c = Math.cos(-rot), s = Math.sin(-rot);
  const lx = (x - cx) * c - (y - cy) * s, ly = (x - cx) * s + (y - cy) * c;
  const qx = Math.abs(lx) - (W / 2 - r), qy = Math.abs(ly) - (H / 2 - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

// distanta la elipsa (semiaxe a,b, centrata, axe aliniate): Newton pe unghi, initializat dens
export function distEllipse(x, y, a, b) {
  // punctele masurate sunt aproape de elipsa: unghiul parametric atan2(y/b, x/a) e un start bun; 3 porniri + Newton
  const t0 = Math.atan2(y / b, x / a);
  let best = Infinity;
  for (const st of [t0, t0 + 0.05, t0 - 0.05]) {
    let t = st;
    for (let it = 0; it < 40; it++) {
      const ex = a * Math.cos(t) - x, ey = b * Math.sin(t) - y;
      const dx = -a * Math.sin(t), dy = b * Math.cos(t);
      const f = ex * dx + ey * dy, fp = dx * dx + dy * dy - ex * a * Math.cos(t) - ey * b * Math.sin(t);
      if (fp <= 0) break; const step = f / fp; t -= step; if (Math.abs(step) < 1e-15) break;
    }
    best = Math.min(best, Math.hypot(a * Math.cos(t) - x, b * Math.sin(t) - y));
  }
  return best;
}

// distanta la o cubica (densa + Newton)
export function distCubic(c, x, y) {
  let best = Infinity, bt = 0;
  const N = 400;
  for (let i = 0; i <= N; i++) { const p = pt(c, i / N); const d = Math.hypot(p[0] - x, p[1] - y); if (d < best) { best = d; bt = i / N; } }
  let t = bt;
  for (let it = 0; it < 30; it++) {
    const p = pt(c, t), d1 = der(c, t);
    const h = 1e-5; const dp = der(c, Math.min(1, t + h)), dm = der(c, Math.max(0, t - h));
    const d2 = [(dp[0] - dm[0]) / (Math.min(1, t + h) - Math.max(0, t - h)), (dp[1] - dm[1]) / (Math.min(1, t + h) - Math.max(0, t - h))];
    const ex = p[0] - x, ey = p[1] - y;
    const f = ex * d1[0] + ey * d1[1], fp = d1[0] * d1[0] + d1[1] * d1[1] + ex * d2[0] + ey * d2[1];
    if (fp === 0) break; let tn = t - f / fp; tn = Math.max(0, Math.min(1, tn)); if (Math.abs(tn - t) < 1e-14) { t = tn; break; } t = tn;
  }
  const p = pt(c, t);
  return Math.min(best, Math.hypot(p[0] - x, p[1] - y));
}
export function cubicPointNormal(c, t) { const p = pt(c, t), d = der(c, t), l = Math.hypot(d[0], d[1]); return [p, [d[1] / l, -d[0] / l]]; }

// abaterea maxima a iesirii fata de o functie de distanta adevarata (directia iesire -> adevar)
export function maxDevOut(region, distFn, h) {
  let m = 0;
  for (const P of densePolys(region, h)) for (const p of P) { const d = Math.abs(distFn(p[0], p[1])); if (d > m) m = d; }
  return m;
}
// directia adevar -> iesire (prinde bucatile lipsa)
export function maxDevTruthToOut(truthPts, region, h) {
  const idx = makeDistIndex(densePolys(region, h), Math.max(h * 20, 0.05));
  let m = 0; for (const p of truthPts) { const d = distTo(idx, p[0], p[1]); if (d > m) m = d; }
  return m;
}

// G1: discontinuitati de pozitie intre segmente consecutive (contur valid?)
export function maxGap(region) {
  let g = 0;
  for (const c of region) {
    const n = c.segs.length;
    for (let i = 0; i < n; i++) {
      if (!c.closed && i === n - 1) break;
      const a = pt(c.segs[i], 1), b = pt(c.segs[(i + 1) % n], 0);
      g = Math.max(g, Math.hypot(a[0] - b[0], a[1] - b[1]));
    }
  }
  return g;
}
