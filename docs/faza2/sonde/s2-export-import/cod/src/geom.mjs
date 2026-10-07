// geom.mjs - model minimal de curbe EXACTE pentru sonda s2 (aruncabil).
// Coordonate: milimetri, Y in sus (ca in CAD). Segmente:
//   line  {a,b}
//   arc   {c, r, a0, da}           unghi de start a0, baleiaj semnat da (CCW > 0), |da| <= 2pi
//   earc  {c, rx, ry, rot, t0, dt} P(t) = c + R(rot)(rx cos t, ry sin t), t in [t0, t0+dt]
//   cubic {p:[p0,p1,p2,p3]}
// O forma: { name, layer, subpaths: [{ segs, closed }] }.
export const TAU = 2 * Math.PI;

export const line = (a, b) => ({ k: 'line', a, b });
export const arc = (c, r, a0, da) => ({ k: 'arc', c, r, a0, da });
export const earc = (c, rx, ry, rot, t0, dt) => ({ k: 'earc', c, rx, ry, rot, t0, dt });
export const cubic = (p0, p1, p2, p3) => ({ k: 'cubic', p: [p0, p1, p2, p3] });
// Ridicarea de grad Q -> C este exacta.
export const quadToCubic = (p0, q, p2) => cubic(
  p0,
  [p0[0] + (2 / 3) * (q[0] - p0[0]), p0[1] + (2 / 3) * (q[1] - p0[1])],
  [p2[0] + (2 / 3) * (q[0] - p2[0]), p2[1] + (2 / 3) * (q[1] - p2[1])],
  p2,
);

// ---------------- matrici afine [a,b,c,d,e,f]: x' = a x + c y + e ; y' = b x + d y + f
export const I = [1, 0, 0, 1, 0, 0];
export const apply = (M, p) => [M[0] * p[0] + M[2] * p[1] + M[4], M[1] * p[0] + M[3] * p[1] + M[5]];
export function mul(M, N) { // M dupa N
  return [
    M[0] * N[0] + M[2] * N[1], M[1] * N[0] + M[3] * N[1],
    M[0] * N[2] + M[2] * N[3], M[1] * N[2] + M[3] * N[3],
    M[0] * N[4] + M[2] * N[5] + M[4], M[1] * N[4] + M[3] * N[5] + M[5],
  ];
}
export const translate = (x, y) => [1, 0, 0, 1, x, y];
export const scale = (sx, sy = sx) => [sx, 0, 0, sy, 0, 0];
export function rotateDeg(deg, cx = 0, cy = 0) {
  const t = (deg * Math.PI) / 180, c = Math.cos(t), s = Math.sin(t);
  return mul(translate(cx, cy), mul([c, s, -s, c, 0, 0], translate(-cx, -cy)));
}

// ---------------- evaluare
function ePoint(s, t) {
  const c = Math.cos(s.rot), sn = Math.sin(s.rot);
  const x = s.rx * Math.cos(t), y = s.ry * Math.sin(t);
  return [s.c[0] + c * x - sn * y, s.c[1] + sn * x + c * y];
}
export function pointAt(s, u) {
  switch (s.k) {
    case 'line': return [s.a[0] + (s.b[0] - s.a[0]) * u, s.a[1] + (s.b[1] - s.a[1]) * u];
    case 'arc': { const a = s.a0 + s.da * u; return [s.c[0] + s.r * Math.cos(a), s.c[1] + s.r * Math.sin(a)]; }
    case 'earc': return ePoint(s, s.t0 + s.dt * u);
    case 'cubic': {
      const [p0, p1, p2, p3] = s.p, v = 1 - u;
      const b0 = v * v * v, b1 = 3 * v * v * u, b2 = 3 * v * u * u, b3 = u * u * u;
      return [b0 * p0[0] + b1 * p1[0] + b2 * p2[0] + b3 * p3[0], b0 * p0[1] + b1 * p1[1] + b2 * p2[1] + b3 * p3[1]];
    }
  }
  throw new Error('segment necunoscut ' + s.k);
}
export function derivAt(s, u) {
  switch (s.k) {
    case 'line': return [s.b[0] - s.a[0], s.b[1] - s.a[1]];
    case 'arc': { const a = s.a0 + s.da * u; return [-s.r * Math.sin(a) * s.da, s.r * Math.cos(a) * s.da]; }
    case 'earc': {
      const t = s.t0 + s.dt * u, c = Math.cos(s.rot), sn = Math.sin(s.rot);
      const x = -s.rx * Math.sin(t) * s.dt, y = s.ry * Math.cos(t) * s.dt;
      return [c * x - sn * y, sn * x + c * y];
    }
    case 'cubic': {
      const [p0, p1, p2, p3] = s.p, v = 1 - u;
      const k0 = 3 * v * v, k1 = 6 * v * u, k2 = 3 * u * u;
      return [k0 * (p1[0] - p0[0]) + k1 * (p2[0] - p1[0]) + k2 * (p3[0] - p2[0]),
        k0 * (p1[1] - p0[1]) + k1 * (p2[1] - p1[1]) + k2 * (p3[1] - p2[1])];
    }
  }
}
export const segStart = (s) => pointAt(s, 0);
export const segEnd = (s) => pointAt(s, 1);

// ---------------- transformare EXACTA (arcul ramane arc sub similitudine, devine elipsa altfel)
function svd2(a, b, c, d) { // B = [[a,b],[c,d]] = R(phi) diag(s1,s2) R(theta), s1 >= |s2|
  const E = (a + d) / 2, F = (a - d) / 2, G = (c + b) / 2, H = (c - b) / 2;
  const Q = Math.hypot(E, H), R = Math.hypot(F, G);
  const a1 = Math.atan2(G, F), a2 = Math.atan2(H, E);
  return { s1: Q + R, s2: Q - R, theta: (a2 - a1) / 2, phi: (a2 + a1) / 2 };
}
function transformConic(C, A, t0, dt, M) {
  // P(t) = C + A (cos t, sin t); A = [[a11,a12],[a21,a22]]
  const m11 = M[0], m12 = M[2], m21 = M[1], m22 = M[3];
  const b11 = m11 * A[0][0] + m12 * A[1][0], b12 = m11 * A[0][1] + m12 * A[1][1];
  const b21 = m21 * A[0][0] + m22 * A[1][0], b22 = m21 * A[0][1] + m22 * A[1][1];
  const { s1, s2, theta, phi } = svd2(b11, b12, b21, b22);
  const c2 = apply(M, C);
  let rx = s1, ry = s2, nt0 = t0 + theta, ndt = dt;
  if (s2 < 0) { ry = -s2; nt0 = -(t0 + theta); ndt = -dt; }
  if (Math.abs(rx - ry) <= 1e-12 * rx) return arc(c2, rx, phi + nt0, ndt);
  return earc(c2, rx, ry, phi, nt0, ndt);
}
export function transformSeg(s, M) {
  switch (s.k) {
    case 'line': return line(apply(M, s.a), apply(M, s.b));
    case 'cubic': return cubic(...s.p.map((p) => apply(M, p)));
    case 'arc': return transformConic(s.c, [[s.r, 0], [0, s.r]], s.a0, s.da, M);
    case 'earc': {
      const c = Math.cos(s.rot), sn = Math.sin(s.rot);
      return transformConic(s.c, [[s.rx * c, -s.ry * sn], [s.rx * sn, s.ry * c]], s.t0, s.dt, M);
    }
  }
}
export function transformShape(sh, M) {
  return { ...sh, subpaths: sh.subpaths.map((sp) => ({ ...sp, segs: sp.segs.map((s) => transformSeg(s, M)) })) };
}

// ---------------- caseta exacta
function inSweep(t, t0, dt) {
  const lo = Math.min(t0, t0 + dt), hi = Math.max(t0, t0 + dt);
  const x = t + TAU * Math.ceil((lo - t) / TAU - 1e-15);
  return x <= hi + 1e-12;
}
export function segBBox(s) {
  const pts = [pointAt(s, 0), pointAt(s, 1)];
  if (s.k === 'arc') {
    for (let q = 0; q < 4; q++) { const t = (q * Math.PI) / 2; if (inSweep(t, s.a0, s.da)) pts.push([s.c[0] + s.r * Math.cos(t), s.c[1] + s.r * Math.sin(t)]); }
  } else if (s.k === 'earc') {
    const c = Math.cos(s.rot), sn = Math.sin(s.rot);
    const tx = Math.atan2(-s.ry * sn, s.rx * c), ty = Math.atan2(s.ry * c, s.rx * sn);
    for (const base of [tx, ty]) for (const t of [base, base + Math.PI]) if (inSweep(t, s.t0, s.dt)) pts.push(ePoint(s, t));
  } else if (s.k === 'cubic') {
    for (let ax = 0; ax < 2; ax++) {
      const [p0, p1, p2, p3] = s.p.map((p) => p[ax]);
      const a = -p0 + 3 * p1 - 3 * p2 + p3, b = 2 * (p0 - 2 * p1 + p2), c = p1 - p0; // d/du /3
      const roots = [];
      if (Math.abs(a) < 1e-14) { if (Math.abs(b) > 1e-14) roots.push(-c / b); }
      else { const D = b * b - 4 * a * c; if (D >= 0) { const q = Math.sqrt(D); roots.push((-b + q) / (2 * a), (-b - q) / (2 * a)); } }
      for (const r of roots) if (r > 0 && r < 1) pts.push(pointAt(s, r));
    }
  }
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}
export function shapesBBox(shapes) {
  let b = [Infinity, Infinity, -Infinity, -Infinity];
  for (const sh of shapes) for (const sp of sh.subpaths) for (const s of sp.segs) {
    const q = segBBox(s); b = [Math.min(b[0], q[0]), Math.min(b[1], q[1]), Math.max(b[2], q[2]), Math.max(b[3], q[3])];
  }
  return b;
}

// ---------------- arie (Green, exacta pe tipuri) si lungime
const GL3 = [[-Math.sqrt(3 / 5), 5 / 9], [0, 8 / 9], [Math.sqrt(3 / 5), 5 / 9]];
export function segArea(s) {
  switch (s.k) {
    case 'line': return 0.5 * (s.a[0] * s.b[1] - s.b[0] * s.a[1]);
    case 'arc': {
      const a1 = s.a0 + s.da, [cx, cy] = s.c, r = s.r;
      return 0.5 * (r * r * s.da + r * (cx * (Math.sin(a1) - Math.sin(s.a0)) - cy * (Math.cos(a1) - Math.cos(s.a0))));
    }
    case 'earc': {
      const c = Math.cos(s.rot), sn = Math.sin(s.rot);
      const ax = s.rx * c, bx = -s.ry * sn, ay = s.rx * sn, by = s.ry * c;
      const t0 = s.t0, t1 = s.t0 + s.dt, [cx, cy] = s.c;
      const dS = Math.sin(t1) - Math.sin(t0), dC = Math.cos(t1) - Math.cos(t0);
      return 0.5 * (s.rx * s.ry * s.dt + cx * (by * dS + ay * dC) - cy * (bx * dS + ax * dC));
    }
    case 'cubic': { // x y' - y x' e polinom de grad 5: GL cu 3 puncte e exact
      let acc = 0;
      for (const [x, w] of GL3) { const u = (x + 1) / 2, p = pointAt(s, u), d = derivAt(s, u); acc += w * 0.5 * (p[0] * d[1] - p[1] * d[0]); }
      return acc / 2;
    }
  }
}
export function shapeArea(sh) { // suma ariilor semnate ale subcailor inchise (gaurile au sens opus)
  let a = 0; for (const sp of sh.subpaths) for (const s of sp.segs) a += segArea(s); return a;
}
const GL5 = [[-0.906179845938664, 0.236926885056189], [-0.538469310105683, 0.478628670499366], [0, 0.568888888888889],
  [0.538469310105683, 0.478628670499366], [0.906179845938664, 0.236926885056189]];
export function segLength(s) {
  if (s.k === 'line') return Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]);
  if (s.k === 'arc') return Math.abs(s.r * s.da);
  const N = 256; let L = 0;
  for (let i = 0; i < N; i++) for (const [x, w] of GL5) {
    const u = (i + (x + 1) / 2) / N, d = derivAt(s, u); L += (w / 2 / N) * Math.hypot(d[0], d[1]);
  }
  return L;
}
export const shapeLength = (sh) => sh.subpaths.reduce((acc, sp) => acc + sp.segs.reduce((a, s) => a + segLength(s), 0), 0);

// ---------------- aproximari DECLARATE
// (1) arc/elipsa -> cubice Bezier (pentru PDF/EPS, care n-au arc). Eroarea masurata pe cercul unitate,
// scalata cu raza maxima (aplicatia afina mareste eroarea cu cel mult s1 = raza mare).
function unitArcErr(theta) {
  const k = (4 / 3) * Math.tan(theta / 4);
  const P = [[1, 0], [1, k], [Math.cos(theta) + k * Math.sin(theta), Math.sin(theta) - k * Math.cos(theta)], [Math.cos(theta), Math.sin(theta)]];
  let e = 0; const c = { k: 'cubic', p: P };
  for (let i = 1; i < 64; i++) { const q = pointAt(c, i / 64); e = Math.max(e, Math.abs(Math.hypot(q[0], q[1]) - 1)); }
  return e;
}
export function conicToCubics(s, tol) {
  const R = s.k === 'arc' ? s.r : Math.max(s.rx, s.ry);
  const span = Math.abs(s.k === 'arc' ? s.da : s.dt);
  let n = Math.max(1, Math.ceil(span / (Math.PI / 2) - 1e-12));
  while (unitArcErr(span / n) * R > tol) n++;
  const t0 = s.k === 'arc' ? s.a0 : s.t0, dt = (s.k === 'arc' ? s.da : s.dt) / n;
  const out = [];
  for (let i = 0; i < n; i++) {
    const ta = t0 + i * dt, tb = ta + dt, k = (4 / 3) * Math.tan(dt / 4);
    // pe cercul unitate, apoi aplicatia afina a conicei
    const U = [[Math.cos(ta), Math.sin(ta)], [Math.cos(ta) - k * Math.sin(ta), Math.sin(ta) + k * Math.cos(ta)],
      [Math.cos(tb) + k * Math.sin(tb), Math.sin(tb) - k * Math.cos(tb)], [Math.cos(tb), Math.sin(tb)]];
    let map;
    if (s.k === 'arc') map = (u) => [s.c[0] + s.r * u[0], s.c[1] + s.r * u[1]];
    else { const c = Math.cos(s.rot), sn = Math.sin(s.rot); map = (u) => [s.c[0] + c * s.rx * u[0] - sn * s.ry * u[1], s.c[1] + sn * s.rx * u[0] + c * s.ry * u[1]]; }
    out.push(cubic(...U.map(map)));
  }
  return { segs: out, n };
}

// (2) curba -> arce (biarce), pentru DXF R12 / G2-G3. Eroarea e masurata pe 24 de puncte pe bucata.
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
const unit = (v) => { const l = Math.hypot(v[0], v[1]); return [v[0] / l, v[1] / l]; };
function arcPT(P, T, J) { // arc din P, tangent T in P, pana in J
  const n = [-T[1], T[0]], PJ = sub(J, P), den = 2 * dot(n, PJ);
  if (Math.abs(den) < 1e-12 * Math.max(1, dot(PJ, PJ))) return line(P, J);
  const sgn = PJ[0] * PJ[0] + PJ[1] * PJ[1];
  const s = sgn / den, C = [P[0] + s * n[0], P[1] + s * n[1]], r = Math.abs(s);
  const a0 = Math.atan2(P[1] - C[1], P[0] - C[0]), a1 = Math.atan2(J[1] - C[1], J[0] - C[0]);
  let da = a1 - a0;
  if (s > 0) { while (da <= 0) da += TAU; while (da > TAU) da -= TAU; } else { while (da >= 0) da -= TAU; while (da < -TAU) da += TAU; }
  return arc(C, r, a0, da);
}
function reverseSeg(s) {
  if (s.k === 'line') return line(s.b, s.a);
  if (s.k === 'arc') return arc(s.c, s.r, s.a0 + s.da, -s.da);
  if (s.k === 'earc') return earc(s.c, s.rx, s.ry, s.rot, s.t0 + s.dt, -s.dt);
  return cubic(s.p[3], s.p[2], s.p[1], s.p[0]);
}
export { reverseSeg };
function biarc(P0, T0, P1, T1) {
  const v = sub(P1, P0), t = [T0[0] + T1[0], T0[1] + T1[1]];
  const vv = dot(v, v), vt = dot(v, t), den = 2 * (1 - dot(T0, T1));
  let d;
  if (Math.abs(den) < 1e-12) { const vt1 = dot(v, T1); if (Math.abs(vt1) < 1e-12) return null; d = vv / (4 * vt1); }
  else d = (-vt + Math.sqrt(vt * vt + den * vv)) / den;
  const J = [(P0[0] + P1[0] + d * (T0[0] - T1[0])) / 2, (P0[1] + P1[1] + d * (T0[1] - T1[1])) / 2];
  return [arcPT(P0, T0, J), reverseSeg(arcPT(P1, [-T1[0], -T1[1]], J))];
}
function distToSeg(p, s) {
  if (s.k === 'line') {
    const d = sub(s.b, s.a), L2 = dot(d, d); let u = L2 > 0 ? dot(sub(p, s.a), d) / L2 : 0; u = Math.max(0, Math.min(1, u));
    const q = pointAt(s, u); return Math.hypot(p[0] - q[0], p[1] - q[1]);
  }
  const ang = Math.atan2(p[1] - s.c[1], p[0] - s.c[0]);
  if (inSweep(ang, s.a0, s.da)) return Math.abs(Math.hypot(p[0] - s.c[0], p[1] - s.c[1]) - s.r);
  const a = segStart(s), b = segEnd(s); return Math.min(Math.hypot(p[0] - a[0], p[1] - a[1]), Math.hypot(p[0] - b[0], p[1] - b[1]));
}
function subCurve(s, u0, u1) { // reparametrizare simpla: pastram curba, retinem intervalul
  return { base: s, u0, u1 };
}
function cubicInflections(s) {
  const [p0, p1, p2, p3] = s.p; const A = sub(p1, p0), B = sub(p2, p1), C = sub(p3, p2);
  const a = [A[0] - 2 * B[0] + C[0], A[1] - 2 * B[1] + C[1]], b = sub(B, A), c = A;
  const qa = -cross(a, b), qb = cross(c, a), qc = cross(c, b), out = [];
  if (Math.abs(qa) < 1e-14) { if (Math.abs(qb) > 1e-14) out.push(-qc / qb); }
  else { const D = qb * qb - 4 * qa * qc; if (D >= 0) { const q = Math.sqrt(D); out.push((-qb + q) / (2 * qa), (-qb - q) / (2 * qa)); } }
  return out.filter((t) => t > 1e-9 && t < 1 - 1e-9).sort((x, y) => x - y);
}
export function curveToArcs(s, tol) {
  if (s.k === 'line' || s.k === 'arc') return [s];
  let cuts = [0, 1];
  if (s.k === 'cubic') cuts = [0, ...cubicInflections(s), 1];
  else { const n = Math.max(1, Math.ceil(Math.abs(s.dt) / (Math.PI / 2) - 1e-12)); cuts = Array.from({ length: n + 1 }, (_, i) => i / n); }
  const out = [];
  for (let i = 0; i + 1 < cuts.length; i++) fitRec(s, cuts[i], cuts[i + 1], tol, 0, out);
  return out;
}
function fitRec(s, u0, u1, tol, depth, out) {
  const P0 = pointAt(s, u0), P1 = pointAt(s, u1);
  const T0 = unit(derivAt(s, u0)), T1 = unit(derivAt(s, u1));
  const ba = biarc(P0, T0, P1, T1);
  if (ba) {
    let err = 0;
    for (let i = 1; i < 24; i++) { const p = pointAt(s, u0 + ((u1 - u0) * i) / 24); err = Math.max(err, Math.min(distToSeg(p, ba[0]), distToSeg(p, ba[1]))); }
    if (err <= tol || depth > 40) { out.push(...ba); return; }
  }
  const um = (u0 + u1) / 2; fitRec(s, u0, um, tol, depth + 1, out); fitRec(s, um, u1, tol, depth + 1, out);
}
export { subCurve };

// ---------------- forme de referinta
export function circleShape(name, layer, c, r) { return { name, layer, subpaths: [{ segs: [arc(c, r, 0, TAU)], closed: true }] }; }
export function ellipseShape(name, layer, c, rx, ry, rotDeg) {
  return { name, layer, subpaths: [{ segs: [earc(c, rx, ry, (rotDeg * Math.PI) / 180, 0, TAU)], closed: true }] };
}
export function roundedRectShape(name, layer, cx, cy, w, h, R) {
  const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2, Q = Math.PI / 2;
  const segs = [
    line([x0 + R, y0], [x1 - R, y0]), arc([x1 - R, y0 + R], R, -Q, Q),
    line([x1, y0 + R], [x1, y1 - R]), arc([x1 - R, y1 - R], R, 0, Q),
    line([x1 - R, y1], [x0 + R, y1]), arc([x0 + R, y1 - R], R, Q, Q),
    line([x0, y1 - R], [x0, y0 + R]), arc([x0 + R, y0 + R], R, Math.PI, Q),
  ];
  return { name, layer, subpaths: [{ segs, closed: true }] };
}
