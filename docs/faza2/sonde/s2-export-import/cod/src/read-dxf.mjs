// read-dxf.mjs - cititor DXF: parsarea cu pachetul `dxf` (MIT; pastreaza ponderile NURBS), semantica PROPRIE:
// unitati ($INSUNITS), OCS (extrudare 0,0,-1 = oglindire), blocuri imbricate cu scalare/rotire/punct de baza,
// bulge -> arc, NURBS -> Bezier exact (inserare de noduri), cerc rational -> ARC exact.
import * as dxfPkg from 'dxf';
import { TAU, line, arc, earc, cubic, quadToCubic, transformSeg, mul, translate, scale, rotateDeg, I, apply } from './geom.mjs';

const Helper = dxfPkg.Helper ?? dxfPkg.default?.Helper;
const UNIT_MM = { 0: 1, 1: 25.4, 2: 304.8, 3: 1609344, 4: 1, 5: 10, 6: 1000, 7: 1e6, 8: 25.4e-6, 9: 0.0254, 10: 914.4, 14: 100, 15: 10000 };

export function readDxf(text, tol = 0.001) {
  const p = new Helper(text).parsed;
  const warn = {}; const W = (k) => { warn[k] = (warn[k] || 0) + 1; };
  const u = p.header.insUnits;
  const k = UNIT_MM[u ?? 0] ?? (W(`$INSUNITS necunoscut ${u}`), 1);
  if (u === undefined || u === 0) W('fara $INSUNITS: presupus mm');
  const blocks = Object.fromEntries((p.blocks || []).map((b) => [b.name, b]));
  const shapes = [];
  const root = scale(k, k);
  const walk = (ents, M, inheritLayer, depth) => {
    if (depth > 16) { W('blocuri imbricate prea adanc'); return; }
    for (const e of ents) {
      const layer = e.layer === '0' && inheritLayer ? inheritLayer : e.layer;
      const segsList = entityToSubpaths(e, W, tol);
      if (segsList === 'INSERT') {
        const b = blocks[e.block]; if (!b) { W('bloc lipsa ' + e.block); continue; }
        if ((e.columnCount ?? 1) > 1 || (e.rowCount ?? 1) > 1) W('INSERT cu matrice (rows/cols) - nesuportat');
        const sx = e.scaleX ?? 1, sy = e.scaleY ?? 1;
        let Mi = mul(translate(e.x, e.y), mul(rotateDeg(e.rotation ?? 0), mul(scale(sx, sy), translate(-(b.x ?? 0), -(b.y ?? 0)))));
        if ((e.extrusionZ ?? 1) < 0) Mi = mul(scale(-1, 1), Mi);
        walk(b.entities || [], mul(M, Mi), layer, depth + 1);
        continue;
      }
      if (!segsList) continue;
      for (const sp of segsList) shapes.push({ name: e.type, layer, subpaths: [{ segs: mergeArcs(sp.segs.map((s) => transformSeg(s, M))), closed: sp.closed }] });
    }
  };
  walk(p.entities, root, null, 0);
  const layers = Object.keys(p.tables?.layers || {});
  return { shapes, layers, units: { insunits: u, toMm: k }, warnings: warn };
}

function ocs(e) { return (e.extrusionZ ?? 1) < 0 ? scale(-1, 1) : I; } // doar 2D: N = (0,0,+-1)

function entityToSubpaths(e, W, tol) {
  if (e.extrusionZ !== undefined && Math.abs(Math.abs(e.extrusionZ) - 1) > 1e-9) { W(`${e.type} in plan 3D - sarit`); return null; }
  const O = ocs(e);
  switch (e.type) {
    case 'LINE': return [{ segs: [line([e.start.x, e.start.y], [e.end.x, e.end.y])], closed: false }];
    case 'CIRCLE': return [{ segs: [transformSeg(arc([e.x, e.y], e.r, 0, TAU), O)], closed: true }];
    case 'ARC': {
      let da = (e.endAngle - e.startAngle) % TAU; if (da <= 0) da += TAU;
      return [{ segs: [transformSeg(arc([e.x, e.y], e.r, e.startAngle, da), O)], closed: false }];
    }
    case 'ELLIPSE': {
      const rx = Math.hypot(e.majorX, e.majorY), ry = rx * e.axisRatio, rot = Math.atan2(e.majorY, e.majorX);
      let dt = (e.endAngle - e.startAngle) % TAU; if (dt <= 1e-15) dt += TAU;
      // ELLIPSE e in WCS; extrudarea -Z inverseaza doar sensul parametrului
      const neg = (e.extrusionZ ?? 1) < 0;
      const s = earc([e.x, e.y], rx, ry, rot, neg ? -e.startAngle : e.startAngle, neg ? -dt : dt);
      return [{ segs: [s], closed: Math.abs(dt - TAU) < 1e-12 }];
    }
    case 'LWPOLYLINE':
    case 'POLYLINE': {
      if (e.polygonMesh || e.polyfaceMesh) { W('POLYLINE plasa/polyface - sarit'); return null; }
      const v = e.vertices || [];
      if (v.length < 2) return null;
      const closed = !!(e.closed || e.shape);
      const segs = [];
      const n = closed ? v.length : v.length - 1;
      for (let i = 0; i < n; i++) {
        const a = v[i], b = v[(i + 1) % v.length];
        const s = bulgeSeg([a.x, a.y], [b.x, b.y], a.bulge || 0);
        if (s) segs.push(transformSeg(s, O));
      }
      return [{ segs, closed }];
    }
    case 'SPLINE': {
      if (!e.controlPoints || e.controlPoints.length === 0) { W('SPLINE doar cu puncte de trecere - sarit'); return null; }
      const r = nurbsToSegs(e, tol, W);
      return r ? [{ segs: r, closed: !!e.closed }] : null;
    }
    case 'INSERT': return 'INSERT';
    default: W(`${e.type} sarit`); return null;
  }
}

export function bulgeSeg(a, b, bulge) {
  if (a[0] === b[0] && a[1] === b[1]) return null;
  if (Math.abs(bulge) < 1e-15) return line(a, b);
  const th = 4 * Math.atan(bulge), ch = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const r = ch / (2 * Math.abs(Math.sin(th / 2)));
  const ux = (b[0] - a[0]) / ch, uy = (b[1] - a[1]) / ch, nx = -uy, ny = ux;
  const d = r * Math.cos(th / 2), s = bulge > 0 ? 1 : -1;
  const c = [(a[0] + b[0]) / 2 + s * nx * d, (a[1] + b[1]) / 2 + s * ny * d];
  return arc(c, r, Math.atan2(a[1] - c[1], a[0] - c[0]), th);
}

// NURBS (prins/clamped) -> segmente Bezier prin descompunere (The NURBS Book, A5.6), in coordonate omogene.
function nurbsToSegs(e, tol, W) {
  const p = e.degree, U = e.knots.slice(), P = e.controlPoints, w = e.weights && e.weights.length === P.length ? e.weights : P.map(() => 1);
  const rational = w.some((x) => Math.abs(x - w[0]) > 1e-12);
  const m = U.length - 1;
  for (let i = 1; i <= p; i++) if (U[i] !== U[0] || U[m - i] !== U[m]) { W('SPLINE neprinsa (periodica) - nesuportata in sonda'); return null; }
  const Pw = P.map((q, i) => [q.x * w[i], q.y * w[i], w[i]]);
  const Q = [[]]; let a = p, b = p + 1, nb = 0;
  for (let i = 0; i <= p; i++) Q[0][i] = Pw[i].slice();
  while (b < m) {
    const i0 = b; while (b < m && U[b + 1] === U[b]) b++;
    const mult = b - i0 + 1;
    Q[nb + 1] = [];
    if (mult < p) {
      const numer = U[b] - U[a], alphas = [];
      for (let j = p; j > mult; j--) alphas[j - mult - 1] = numer / (U[a + j] - U[a]);
      const r = p - mult;
      for (let j = 1; j <= r; j++) {
        const save = r - j, s = mult + j;
        for (let kk = p; kk >= s; kk--) { const al = alphas[kk - s]; Q[nb][kk] = Q[nb][kk].map((v, t) => al * v + (1 - al) * Q[nb][kk - 1][t]); }
        if (b < m) Q[nb + 1][save] = Q[nb][p].slice();
      }
    }
    nb++;
    if (b < m) { for (let i = p - mult; i <= p; i++) Q[nb][i] = Pw[b - p + i].slice(); a = b; b++; }
  }
  const segs = [];
  for (let s = 0; s < nb; s++) {
    const H = Q[s]; const E = H.map((h) => [h[0] / h[2], h[1] / h[2]]), ww = H.map((h) => h[2]);
    const isRat = rational && ww.some((x) => Math.abs(x - ww[0]) > 1e-12);
    if (!isRat) {
      if (p === 1) segs.push(line(E[0], E[1]));
      else if (p === 2) segs.push(quadToCubic(E[0], E[1], E[2]));
      else if (p === 3) segs.push(cubic(E[0], E[1], E[2], E[3]));
      else { W(`SPLINE grad ${p} - aproximata`); segs.push(...approxRational(H, tol)); }
      continue;
    }
    if (p === 2) { const c = conicToArc(E, ww); if (c) { segs.push(c); continue; } }
    W(`SPLINE rationala grad ${p} (nu e arc de cerc) - aproximata cu cubice`);
    segs.push(...approxRational(H, tol));
  }
  return segs;
}

// Bezier rational patratic -> arc de cerc EXACT daca e arc de cerc (isoscel + pondere = cos(theta/2))
function conicToArc(E, w) {
  const wn = w[1] / Math.sqrt(w[0] * w[2]);
  const [P0, P1, P2] = E;
  const l0 = Math.hypot(P1[0] - P0[0], P1[1] - P0[1]), l1 = Math.hypot(P2[0] - P1[0], P2[1] - P1[1]);
  if (Math.abs(l0 - l1) > 1e-9 * Math.max(l0, l1)) return null;
  const v0 = [(P0[0] - P1[0]) / l0, (P0[1] - P1[1]) / l0], v1 = [(P2[0] - P1[0]) / l1, (P2[1] - P1[1]) / l1];
  const phi = Math.acos(Math.max(-1, Math.min(1, v0[0] * v1[0] + v0[1] * v1[1])));
  if (Math.abs(wn - Math.sin(phi / 2)) > 1e-9) return null;
  const theta = Math.PI - phi, r = l0 / Math.tan(theta / 2);
  const cr = (P1[0] - P0[0]) * (P2[1] - P1[1]) - (P1[1] - P0[1]) * (P2[0] - P1[0]);
  const t = [(P1[0] - P0[0]) / l0, (P1[1] - P0[1]) / l0], n = cr > 0 ? [-t[1], t[0]] : [t[1], -t[0]];
  const C = [P0[0] + n[0] * r, P0[1] + n[1] * r];
  return arc(C, r, Math.atan2(P0[1] - C[1], P0[0] - C[0]), cr > 0 ? theta : -theta);
}

// aproximare declarata: cubice Hermite pe bucati, subdivizare pana la eroarea tol (masurata pe 32 de puncte)
function approxRational(H, tol) {
  const n = H.length - 1;
  const C = (u) => { // de Casteljau omogen
    let pts = H.map((h) => h.slice());
    for (let r = 1; r <= n; r++) for (let i = 0; i <= n - r; i++) pts[i] = pts[i].map((v, t) => (1 - u) * v + u * pts[i + 1][t]);
    return [pts[0][0] / pts[0][2], pts[0][1] / pts[0][2]];
  };
  const D = (u) => { const h = 1e-6, a = C(Math.max(0, u - h)), b = C(Math.min(1, u + h)); const dd = Math.min(1, u + h) - Math.max(0, u - h); return [(b[0] - a[0]) / dd, (b[1] - a[1]) / dd]; };
  const out = [];
  const rec = (u0, u1, depth) => {
    const p0 = C(u0), p3 = C(u1), d0 = D(u0), d3 = D(u1), du = (u1 - u0) / 3;
    const seg = cubic(p0, [p0[0] + d0[0] * du, p0[1] + d0[1] * du], [p3[0] - d3[0] * du, p3[1] - d3[1] * du], p3);
    let err = 0;
    for (let i = 1; i < 32; i++) {
      const u = i / 32, q = C(u0 + (u1 - u0) * u), v = 1 - u;
      const s = [v * v * v * seg.p[0][0] + 3 * v * v * u * seg.p[1][0] + 3 * v * u * u * seg.p[2][0] + u * u * u * seg.p[3][0],
        v * v * v * seg.p[0][1] + 3 * v * v * u * seg.p[1][1] + 3 * v * u * u * seg.p[2][1] + u * u * u * seg.p[3][1]];
      err = Math.max(err, Math.hypot(q[0] - s[0], q[1] - s[1]));
    }
    if (err <= tol / 2 || depth > 20) out.push(seg); else { const um = (u0 + u1) / 2; rec(u0, um, depth + 1); rec(um, u1, depth + 1); }
  };
  rec(0, 1, 0);
  return out;
}

// arce consecutive pe acelasi cerc, in acelasi sens -> unul singur (cercul NURBS din 4 sferturi -> 1 cerc)
export function mergeArcs(segs) {
  const out = [];
  for (const s of segs) {
    const q = out[out.length - 1];
    if (q && q.k === 'arc' && s.k === 'arc' && Math.abs(q.r - s.r) <= 1e-9 * q.r && Math.hypot(q.c[0] - s.c[0], q.c[1] - s.c[1]) <= 1e-9 * q.r
      && Math.sign(q.da) === Math.sign(s.da) && Math.abs(q.da + s.da) <= TAU + 1e-12) {
      out[out.length - 1] = arc(q.c, q.r, q.a0, q.da + s.da);
    } else if (q && q.k === 'earc' && s.k === 'earc' && Math.hypot(q.c[0] - s.c[0], q.c[1] - s.c[1]) <= 1e-9 * q.rx
      && Math.abs(q.rx - s.rx) <= 1e-9 * q.rx && Math.abs(q.ry - s.ry) <= 1e-9 * q.rx
      && Math.abs(Math.sin(q.rot - s.rot)) <= 1e-9 && Math.cos(q.rot - s.rot) > 0
      && Math.sign(q.dt) === Math.sign(s.dt) && Math.abs(q.dt + s.dt) <= TAU + 1e-12) {
      out[out.length - 1] = earc(q.c, q.rx, q.ry, q.rot, q.t0, q.dt + s.dt); // aceeasi elipsa, parametru continuu
    } else out.push(s);
  }
  return out;
}
export { apply };
