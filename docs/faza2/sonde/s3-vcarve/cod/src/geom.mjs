// Geometria GENERATORULUI (separata de oracol). Aplatizare cu toleranta, regiune normalizata cu Clipper
// (uniune nonzero/evenodd -> poligoane fara suprapuneri), index de distanta pe segmente, test de interior.
import ClipperLib from 'clipper-lib';

export const SCALE = 1e5; // 10 nm

function bez(c, t) {
  const u = 1 - t;
  if (c.k === 'Q') return [u * u * c.p0[0] + 2 * u * t * c.p1[0] + t * t * c.p2[0], u * u * c.p0[1] + 2 * u * t * c.p1[1] + t * t * c.p2[1]];
  const b0 = u * u * u, b1 = 3 * u * u * t, b2 = 3 * u * t * t, b3 = t * t * t;
  return [b0 * c.p0[0] + b1 * c.p1[0] + b2 * c.p2[0] + b3 * c.p3[0], b0 * c.p0[1] + b1 * c.p1[1] + b2 * c.p2[1] + b3 * c.p3[1]];
}
// puncte dupa startul curbei (startul nu e inclus); abaterea coardei <= tol
export function flattenCurve(c, tol) {
  if (c.k === 'L') return [c.p1];
  if (c.k === 'A') {
    const sw = c.a1 - c.a0; const da = 2 * Math.acos(Math.max(-1, 1 - tol / c.r)); const n = Math.max(1, Math.ceil(Math.abs(sw) / Math.max(da, 1e-9)));
    const out = []; for (let i = 1; i <= n; i++) { const a = c.a0 + sw * i / n; out.push([c.c[0] + c.r * Math.cos(a), c.c[1] + c.r * Math.sin(a)]); } return out;
  }
  const P = c.k === 'Q' ? [c.p0, c.p1, c.p2] : [c.p0, c.p1, c.p2, c.p3]; const d = P.length - 1;
  let M = 0; for (let i = 0; i + 2 < P.length; i++) M = Math.max(M, Math.hypot(P[i][0] - 2 * P[i + 1][0] + P[i + 2][0], P[i][1] - 2 * P[i + 1][1] + P[i + 2][1]));
  const n = Math.max(1, Math.ceil(Math.sqrt(d * (d - 1) * M / (8 * tol))));
  const out = []; for (let i = 1; i <= n; i++) out.push(bez(c, i / n)); return out;
}
export function flattenLoop(loop, tol) {
  const pts = [loop[0].p0 ?? [loop[0].c[0] + loop[0].r * Math.cos(loop[0].a0), loop[0].c[1] + loop[0].r * Math.sin(loop[0].a0)]];
  for (const c of loop) pts.push(...flattenCurve(c, tol));
  pts.pop(); // ultimul = primul
  return pts;
}
export const area = (P) => { let a = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; };

const toC = (P) => P.map((p) => ({ X: Math.round(p[0] * SCALE), Y: Math.round(p[1] * SCALE) }));
const fromC = (P) => P.map((p) => [p.X / SCALE, p.Y / SCALE]);

// uniunea buclelor, cu regula de umplere ceruta -> poligoane simple (exterioare in sens trigonometric, gauri invers)
export function normalize(loops, fill, tol) {
  const c = new ClipperLib.Clipper(); const paths = loops.map((l) => toC(flattenLoop(l, tol)));
  c.AddPaths(paths, ClipperLib.PolyType.ptSubject, true);
  const sol = new ClipperLib.Paths(); const ft = fill === 'evenodd' ? ClipperLib.PolyFillType.pftEvenOdd : ClipperLib.PolyFillType.pftNonZero;
  c.Execute(ClipperLib.ClipType.ctUnion, sol, ft, ft);
  return sol.map(fromC).filter((P) => P.length >= 3);
}
// offset al poligoanelor (delta<0 = spre interior), imbinari rotunde
export function offset(polys, delta, arcTol = 0.001) {
  const co = new ClipperLib.ClipperOffset(2, arcTol * SCALE);
  co.AddPaths(polys.map(toC), ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedPolygon);
  const sol = new ClipperLib.Paths(); co.Execute(sol, delta * SCALE); return sol.map(fromC).filter((P) => P.length >= 3);
}
export function difference(a, b) {
  const c = new ClipperLib.Clipper(); c.AddPaths(a.map(toC), ClipperLib.PolyType.ptSubject, true); c.AddPaths(b.map(toC), ClipperLib.PolyType.ptClip, true);
  const sol = new ClipperLib.Paths(); c.Execute(ClipperLib.ClipType.ctDifference, sol, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero); return sol.map(fromC).filter((P) => P.length >= 3);
}
// taie polilinii deschise cu o regiune: pastreaza bucatile din interior
export function clipOpen(lines, region) {
  if (!region.length || !lines.length) return [];
  const c = new ClipperLib.Clipper(); c.AddPaths(lines.map(toC), ClipperLib.PolyType.ptSubject, false); c.AddPaths(region.map(toC), ClipperLib.PolyType.ptClip, true);
  const tree = new ClipperLib.PolyTree(); c.Execute(ClipperLib.ClipType.ctIntersection, tree, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
  return ClipperLib.Clipper.OpenPathsFromPolyTree(tree).map(fromC).filter((P) => P.length >= 2);
}

// regiunea: test de interior (par-impar pe poligoanele normalizate) + distanta la contur (segmente)
export function makeRegion(polys) {
  const segs = []; for (const P of polys) for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; segs.push([a[0], a[1], b[0], b[1]]); }
  let X0 = Infinity, Y0 = Infinity, X1 = -Infinity, Y1 = -Infinity; for (const s of segs) { X0 = Math.min(X0, s[0], s[2]); Y0 = Math.min(Y0, s[1], s[3]); X1 = Math.max(X1, s[0], s[2]); Y1 = Math.max(Y1, s[1], s[3]); }
  const CS = Math.max(Math.sqrt(((X1 - X0) * (Y1 - Y0) || 1) / segs.length) * 2, 1e-3);
  const nx = Math.ceil((X1 - X0) / CS) + 1, ny = Math.ceil((Y1 - Y0) / CS) + 1; const grid = new Map();
  segs.forEach((s, k) => { for (let ix = Math.floor((Math.min(s[0], s[2]) - X0) / CS); ix <= Math.floor((Math.max(s[0], s[2]) - X0) / CS); ix++) for (let iy = Math.floor((Math.min(s[1], s[3]) - Y0) / CS); iy <= Math.floor((Math.max(s[1], s[3]) - Y0) / CS); iy++) { const key = iy * nx + ix; let a = grid.get(key); if (!a) grid.set(key, (a = [])); a.push(k); } });
  const rows = Array.from({ length: ny }, () => []); segs.forEach((s, k) => { for (let iy = Math.floor((Math.min(s[1], s[3]) - Y0) / CS); iy <= Math.floor((Math.max(s[1], s[3]) - Y0) / CS); iy++) rows[iy].push(k); });
  function segDist2(s, x, y) { const dx = s[2] - s[0], dy = s[3] - s[1]; const L2 = dx * dx + dy * dy; let t = L2 > 0 ? ((x - s[0]) * dx + (y - s[1]) * dy) / L2 : 0; t = t < 0 ? 0 : t > 1 ? 1 : t; const ex = s[0] + t * dx - x, ey = s[1] + t * dy - y; return ex * ex + ey * ey; }
  function dist(x, y) {
    const cx = Math.floor((x - X0) / CS), cy = Math.floor((y - Y0) / CS); let best = Infinity;
    for (let ring = 0; ring < nx + ny + 2; ring++) {
      if (ring > 0 && (ring - 1) * CS > Math.sqrt(best)) break;
      for (let ix = cx - ring; ix <= cx + ring; ix++) { const step = (ix === cx - ring || ix === cx + ring) ? 1 : 2 * ring;
        for (let iy = cy - ring; iy <= cy + ring; iy += Math.max(1, step)) { if (ix < 0 || iy < 0 || ix >= nx || iy >= ny) continue; const a = grid.get(iy * nx + ix); if (!a) continue; for (const k of a) { const d = segDist2(segs[k], x, y); if (d < best) best = d; } } }
    }
    return Math.sqrt(best);
  }
  function inside(x, y) {
    const iy = Math.floor((y - Y0) / CS); if (iy < 0 || iy >= ny || x < X0 || x > X1) return false; let n = 0;
    for (const k of rows[iy]) { const s = segs[k]; if ((s[1] <= y) !== (s[3] <= y)) { const xi = s[0] + (y - s[1]) * (s[2] - s[0]) / (s[3] - s[1]); if (xi > x) n++; } }
    return (n & 1) === 1;
  }
  return { polys, segs, dist, inside, bbox: [X0, Y0, X1, Y1] };
}

// colturile convexe reale (unghi de intoarcere > minTurnDeg) ale poligoanelor normalizate
export function convexCorners(polys, minTurnDeg = 20) {
  const out = []; const lim = Math.sin(minTurnDeg * Math.PI / 180);
  for (const P of polys) { const sgn = Math.sign(area(P)); const n = P.length;
    for (let i = 0; i < n; i++) { const a = P[(i - 1 + n) % n], b = P[i], c = P[(i + 1) % n];
      const u = [b[0] - a[0], b[1] - a[1]], v = [c[0] - b[0], c[1] - b[1]]; const lu = Math.hypot(...u), lv = Math.hypot(...v); if (lu === 0 || lv === 0) continue;
      const cr = (u[0] * v[1] - u[1] * v[0]) / lu / lv, dt = (u[0] * v[0] + u[1] * v[1]) / lu / lv;
      if (cr * sgn > 0 && (cr * sgn > lim || dt < 0)) out.push({ p: b, bis: [(-u[0] / lu + v[0] / lv), (-u[1] / lu + v[1] / lv)] }); } }
  return out;
}
