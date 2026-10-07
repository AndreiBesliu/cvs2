// SONDA ARUNCABILA s1-geometrie: modelul neutru de curba + algoritmii proprii candidati.
// Conventie: matematica, y in sus, aria CCW pozitiva. Unitate: mm.
// Segmente:
//   L {k:'L', x0,y0,x1,y1}
//   A {k:'A', cx,cy,r,a0,da}            arc circular: unghi de start + baleiaj semnat (CCW > 0)
//   C {k:'C', x0,y0,x1,y1,x2,y2,x3,y3}  cubica Bezier
//   Q {k:'Q', x0,y0,x1,y1,x2,y2}        patratica
//   K {k:'K', x0,y0,x1,y1,x2,y2,w}      conica (patratica rationala)
// Contur: {segs:[...], closed:bool}. Regiune: [contur, ...].

export const TAU = Math.PI * 2;

export function arcEnds(s) {
  const a1 = s.a0 + s.da;
  return [s.cx + s.r * Math.cos(s.a0), s.cy + s.r * Math.sin(s.a0), s.cx + s.r * Math.cos(a1), s.cy + s.r * Math.sin(a1)];
}

export function segStart(s) {
  if (s.k === 'A') { const e = arcEnds(s); return [e[0], e[1]]; }
  return [s.x0, s.y0];
}
export function segEnd(s) {
  switch (s.k) {
    case 'L': return [s.x1, s.y1];
    case 'A': { const e = arcEnds(s); return [e[2], e[3]]; }
    case 'C': return [s.x3, s.y3];
    case 'Q': case 'K': return [s.x2, s.y2];
  }
  throw new Error('tip necunoscut ' + s.k);
}

// ---------- constructori ----------
export function circle(cx, cy, r, ccw = true) {
  const sg = ccw ? 1 : -1;
  return { closed: true, segs: [
    { k: 'A', cx, cy, r, a0: 0, da: sg * Math.PI },
    { k: 'A', cx, cy, r, a0: sg * Math.PI, da: sg * Math.PI },
  ] };
}

// dreptunghi rotunjit centrat, rotit cu rot (rad); r = 0 => colturi ascutite
export function rrect(cx, cy, W, H, r, rot = 0) {
  const hw = W / 2, hh = H / 2;
  const segs = [];
  if (r > 0) {
    segs.push({ k: 'L', x0: -hw + r, y0: -hh, x1: hw - r, y1: -hh });
    segs.push({ k: 'A', cx: hw - r, cy: -hh + r, r, a0: -Math.PI / 2, da: Math.PI / 2 });
    segs.push({ k: 'L', x0: hw, y0: -hh + r, x1: hw, y1: hh - r });
    segs.push({ k: 'A', cx: hw - r, cy: hh - r, r, a0: 0, da: Math.PI / 2 });
    segs.push({ k: 'L', x0: hw - r, y0: hh, x1: -hw + r, y1: hh });
    segs.push({ k: 'A', cx: -hw + r, cy: hh - r, r, a0: Math.PI / 2, da: Math.PI / 2 });
    segs.push({ k: 'L', x0: -hw, y0: hh - r, x1: -hw, y1: -hh + r });
    segs.push({ k: 'A', cx: -hw + r, cy: -hh + r, r, a0: Math.PI, da: Math.PI / 2 });
  } else {
    const p = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]];
    for (let i = 0; i < 4; i++) { const a = p[i], b = p[(i + 1) % 4]; segs.push({ k: 'L', x0: a[0], y0: a[1], x1: b[0], y1: b[1] }); }
  }
  const c = { closed: true, segs };
  return transformContour(c, matRotTrans(rot, cx, cy));
}

// ---------- transformari ----------
// matrice [a,b,c,d,e,f]: x' = a x + c y + e ; y' = b x + d y + f
export function matRotTrans(t, tx, ty) { const c = Math.cos(t), s = Math.sin(t); return [c, s, -s, c, tx, ty]; }
export function matScale(sx, sy) { return [sx, 0, 0, sy, 0, 0]; }
const ap = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

// clasifica matricea: similitudine (pastreaza cercurile) sau nu
export function similarity(m) {
  const det = m[0] * m[3] - m[1] * m[2];
  const sx = Math.hypot(m[0], m[1]), sy = Math.hypot(m[2], m[3]);
  const dot = m[0] * m[2] + m[1] * m[3];
  const ok = Math.abs(sx - sy) <= 1e-12 * Math.max(sx, sy) && Math.abs(dot) <= 1e-12 * sx * sy;
  return { ok, scale: sx, mirror: det < 0, rot: Math.atan2(m[1], m[0]) };
}

// transformare EXACTA pentru L/C/Q/K mereu, pentru A doar sub similitudine.
// Sub transformare neconforma arcul devine conica (exact) - optiunea 'arcAs': 'K' (exact) | 'C' (aprox, tol) | 'A' (biarc, tol)
export function transformContour(c, m, opt = {}) {
  const sim = similarity(m);
  const out = [];
  for (const s of c.segs) {
    switch (s.k) {
      case 'L': { const a = ap(m, s.x0, s.y0), b = ap(m, s.x1, s.y1); out.push({ k: 'L', x0: a[0], y0: a[1], x1: b[0], y1: b[1] }); break; }
      case 'C': { const a = ap(m, s.x0, s.y0), b = ap(m, s.x1, s.y1), d = ap(m, s.x2, s.y2), e = ap(m, s.x3, s.y3); out.push({ k: 'C', x0: a[0], y0: a[1], x1: b[0], y1: b[1], x2: d[0], y2: d[1], x3: e[0], y3: e[1] }); break; }
      case 'Q': { const a = ap(m, s.x0, s.y0), b = ap(m, s.x1, s.y1), d = ap(m, s.x2, s.y2); out.push({ k: 'Q', x0: a[0], y0: a[1], x1: b[0], y1: b[1], x2: d[0], y2: d[1] }); break; }
      case 'K': { const a = ap(m, s.x0, s.y0), b = ap(m, s.x1, s.y1), d = ap(m, s.x2, s.y2); out.push({ k: 'K', x0: a[0], y0: a[1], x1: b[0], y1: b[1], x2: d[0], y2: d[1], w: s.w }); break; }
      case 'A': {
        if (sim.ok) {
          const cc = ap(m, s.cx, s.cy);
          const sg = sim.mirror ? -1 : 1;
          out.push({ k: 'A', cx: cc[0], cy: cc[1], r: s.r * sim.scale, a0: sg * s.a0 + sim.rot, da: sg * s.da });
        } else {
          const mode = opt.arcAs || 'K';
          if (mode === 'K') for (const k of arcToConics(s)) out.push(transformContour({ segs: [k] }, m).segs[0]);
          else if (mode === 'C') for (const k of arcToCubics(s, opt.n || 4)) out.push(transformContour({ segs: [k] }, m).segs[0]);
          else if (mode === 'A') {
            // arc eliptic aproximat cu biarce, sub toleranta
            const ev = (t) => { const a = s.a0 + s.da * t; return ap(m, s.cx + s.r * Math.cos(a), s.cy + s.r * Math.sin(a)); };
            const dv = (t) => { const a = s.a0 + s.da * t; const dx = -s.r * Math.sin(a) * s.da, dy = s.r * Math.cos(a) * s.da; return [m[0] * dx + m[2] * dy, m[1] * dx + m[3] * dy]; };
            for (const q of biarcFitCurve(ev, dv, opt.tol || 0.01)) out.push(q);
          }
        }
        break;
      }
    }
  }
  return { closed: c.closed, segs: out };
}

// ---------- conversii proprii ----------
// arc -> conice exacte (<= 90 grade fiecare), w = cos(theta/2)
export function arcToConics(s) {
  const n = Math.max(1, Math.ceil(Math.abs(s.da) / (Math.PI / 2) - 1e-9));
  const out = [];
  for (let i = 0; i < n; i++) {
    const t0 = s.a0 + s.da * i / n, th = s.da / n, t1 = t0 + th;
    const h = Math.cos(th / 2);
    const tm = t0 + th / 2;
    const rr = s.r / h;
    out.push({ k: 'K', x0: s.cx + s.r * Math.cos(t0), y0: s.cy + s.r * Math.sin(t0), x1: s.cx + rr * Math.cos(tm), y1: s.cy + rr * Math.sin(tm), x2: s.cx + s.r * Math.cos(t1), y2: s.cy + s.r * Math.sin(t1), w: h });
  }
  return out;
}

// arc -> n cubice pe bucata maxima (kappa = 4/3 tan(theta/4)); aproximare
export function arcToCubics(s, nPerCircle = 4) {
  const n = Math.max(1, Math.ceil(Math.abs(s.da) / (TAU / nPerCircle) - 1e-9));
  const out = [];
  for (let i = 0; i < n; i++) {
    const t0 = s.a0 + s.da * i / n, th = s.da / n, t1 = t0 + th;
    const k = 4 / 3 * Math.tan(th / 4) * s.r;
    const c0 = Math.cos(t0), s0 = Math.sin(t0), c1 = Math.cos(t1), s1 = Math.sin(t1);
    out.push({ k: 'C', x0: s.cx + s.r * c0, y0: s.cy + s.r * s0, x1: s.cx + s.r * c0 - k * s0, y1: s.cy + s.r * s0 + k * c0, x2: s.cx + s.r * c1 + k * s1, y2: s.cy + s.r * s1 - k * c1, x3: s.cx + s.r * c1, y3: s.cy + s.r * s1 });
  }
  return out;
}

export function quadToCubic(s) {
  return { k: 'C', x0: s.x0, y0: s.y0, x1: s.x0 + 2 / 3 * (s.x1 - s.x0), y1: s.y0 + 2 / 3 * (s.y1 - s.y0), x2: s.x2 + 2 / 3 * (s.x1 - s.x2), y2: s.y2 + 2 / 3 * (s.y1 - s.y2), x3: s.x2, y3: s.y2 };
}

// conica -> arc, daca e arc circular (isoscel + w = cos(jumatate de unghi)); altfel null
export function conicToArc(s, relTol = 1e-6) {
  const ax = s.x1 - s.x0, ay = s.y1 - s.y0, bx = s.x2 - s.x1, by = s.y2 - s.y1;
  const la = Math.hypot(ax, ay), lb = Math.hypot(bx, by);
  if (la === 0 || lb === 0) return null;
  if (Math.abs(la - lb) > relTol * Math.max(la, lb) * 10) return null;
  const cosT = (ax * bx + ay * by) / (la * lb); // unghiul de intoarcere theta intre tangente
  const half = Math.acos(Math.max(-1, Math.min(1, cosT))) / 2;
  if (Math.abs(Math.cos(half) - s.w) > relTol * 100) return null;
  const cr = ax * by - ay * bx;
  if (Math.abs(cr) < 1e-15 * la * lb) return null;
  const sg = cr > 0 ? 1 : -1; // CCW
  // centrul: pe normala la P0, la distanta r = la / tan(half)
  const r = la / Math.tan(half);
  const nx = -ay / la * sg, ny = ax / la * sg;
  const cx = s.x0 + nx * r, cy = s.y0 + ny * r;
  const a0 = Math.atan2(s.y0 - cy, s.x0 - cx);
  return { k: 'A', cx, cy, r, a0, da: sg * 2 * half };
}

// ---------- evaluare (pentru algoritmii proprii; ORACOLUL are codul lui separat) ----------
export function cubicEval(s, t) {
  const u = 1 - t;
  return [u * u * u * s.x0 + 3 * u * u * t * s.x1 + 3 * u * t * t * s.x2 + t * t * t * s.x3, u * u * u * s.y0 + 3 * u * u * t * s.y1 + 3 * u * t * t * s.y2 + t * t * t * s.y3];
}
export function cubicDeriv(s, t) {
  const u = 1 - t;
  return [3 * (u * u * (s.x1 - s.x0) + 2 * u * t * (s.x2 - s.x1) + t * t * (s.x3 - s.x2)), 3 * (u * u * (s.y1 - s.y0) + 2 * u * t * (s.y2 - s.y1) + t * t * (s.y3 - s.y2))];
}

// ---------- biarc fit propriu: curba parametrica -> arce (+ linii) sub toleranta ----------
// Constructie cu tangente egale (Bolton), junctiune J; eroare masurata pe esantioane; subdivizare la t=0.5.
function arcFromPointTangent(ax, ay, tx, ty, bx, by) {
  // arc de la A (tangenta T) la B
  const nx = -ty, ny = tx; // normala la stanga
  const vx = ax - bx, vy = ay - by;
  const den = 2 * (nx * vx + ny * vy);
  const chord = Math.hypot(vx, vy);
  if (Math.abs(den) < 1e-12 * chord || chord === 0) return { k: 'L', x0: ax, y0: ay, x1: bx, y1: by };
  const sgn = -(vx * vx + vy * vy) / den; // C = A + sgn * N
  const cx = ax + sgn * nx, cy = ay + sgn * ny;
  const r = Math.abs(sgn);
  if (r > 1e7 * chord) return { k: 'L', x0: ax, y0: ay, x1: bx, y1: by };
  const a0 = Math.atan2(ay - cy, ax - cx);
  let a1 = Math.atan2(by - cy, bx - cx);
  const ccw = sgn > 0; // centrul la stanga => CCW
  let da = a1 - a0;
  if (ccw) { while (da <= 0) da += TAU; } else { while (da >= 0) da -= TAU; }
  return { k: 'A', cx, cy, r, a0, da };
}

function biarc(p0, t0, p1, t1) {
  const vx = p1[0] - p0[0], vy = p1[1] - p0[1];
  const tx = t0[0] + t1[0], ty = t0[1] + t1[1];
  const vt = vx * tx + vy * ty, vv = vx * vx + vy * vy, tt = tx * tx + ty * ty;
  const a = tt - 4; // <= 0
  let d;
  if (Math.abs(a) < 1e-12) {
    const den = 4 * (vx * t1[0] + vy * t1[1]);
    if (Math.abs(den) < 1e-15) return null;
    d = vv / den;
  } else {
    const disc = vt * vt - a * vv;
    if (disc < 0) return null;
    d = (vt - Math.sqrt(disc)) / a; // radacina pozitiva: a<0 si sqrt(disc) >= |vt|
  }
  if (!(d > 0) || !isFinite(d)) return null;
  const jx = (p0[0] + p1[0] + d * (t0[0] - t1[0])) / 2, jy = (p0[1] + p1[1] + d * (t0[1] - t1[1])) / 2;
  const s1 = arcFromPointTangent(p0[0], p0[1], t0[0], t0[1], jx, jy);
  // al doilea arc: de la J la P1, se construieste invers din P1 cu tangenta -T1, apoi se intoarce
  const s2r = arcFromPointTangent(p1[0], p1[1], -t1[0], -t1[1], jx, jy);
  const s2 = reverseSeg(s2r);
  return [s1, s2];
}

export function reverseSeg(s) {
  switch (s.k) {
    case 'L': return { k: 'L', x0: s.x1, y0: s.y1, x1: s.x0, y1: s.y0 };
    case 'A': return { k: 'A', cx: s.cx, cy: s.cy, r: s.r, a0: s.a0 + s.da, da: -s.da };
    case 'C': return { k: 'C', x0: s.x3, y0: s.y3, x1: s.x2, y1: s.y2, x2: s.x1, y2: s.y1, x3: s.x0, y3: s.y0 };
    case 'Q': return { k: 'Q', x0: s.x2, y0: s.y2, x1: s.x1, y1: s.y1, x2: s.x0, y2: s.y0 };
    case 'K': return { k: 'K', x0: s.x2, y0: s.y2, x1: s.x1, y1: s.y1, x2: s.x0, y2: s.y0, w: s.w };
  }
}

// distanta exacta punct -> segment L/A (folosita de fitter; oracolul are versiunea lui)
function distLA(s, x, y) {
  if (s.k === 'L') {
    const dx = s.x1 - s.x0, dy = s.y1 - s.y0, l2 = dx * dx + dy * dy;
    let t = l2 > 0 ? ((x - s.x0) * dx + (y - s.y0) * dy) / l2 : 0; t = Math.max(0, Math.min(1, t));
    return Math.hypot(s.x0 + t * dx - x, s.y0 + t * dy - y);
  }
  const ang = Math.atan2(y - s.cy, x - s.cx);
  let rel = ang - s.a0;
  if (s.da >= 0) { rel = ((rel % TAU) + TAU) % TAU; if (rel <= s.da) return Math.abs(Math.hypot(x - s.cx, y - s.cy) - s.r); }
  else { rel = ((-rel % TAU) + TAU) % TAU; if (rel <= -s.da) return Math.abs(Math.hypot(x - s.cx, y - s.cy) - s.r); }
  const e = arcEnds(s);
  return Math.min(Math.hypot(x - e[0], y - e[1]), Math.hypot(x - e[2], y - e[3]));
}

// ev(t) -> [x,y], dv(t) -> derivata; t in [0,1]
export function biarcFitCurve(ev, dv, tol, t0 = 0, t1 = 1, depth = 0, out = []) {
  const p0 = ev(t0), p1 = ev(t1);
  const unit = (v) => { const l = Math.hypot(v[0], v[1]); return l > 0 ? [v[0] / l, v[1] / l] : null; };
  let ta = unit(dv(t0 + (t1 - t0) * 1e-9)), tb = unit(dv(t1 - (t1 - t0) * 1e-9));
  const chord = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
  let cand = null;
  if (ta && tb && chord > 0) cand = biarc(p0, ta, p1, tb);
  if (!cand && chord > 0) cand = [{ k: 'L', x0: p0[0], y0: p0[1], x1: p1[0], y1: p1[1] }];
  let err = Infinity;
  if (cand) {
    err = 0;
    const m = 24;
    for (let i = 1; i < m; i++) {
      const p = ev(t0 + (t1 - t0) * i / m);
      const e = Math.min(...cand.map((s) => distLA(s, p[0], p[1])));
      if (e > err) err = e;
    }
  }
  if ((err <= tol && cand) || depth >= 18) {
    if (cand) for (const s of cand) out.push(s);
    return out;
  }
  const tm = (t0 + t1) / 2;
  biarcFitCurve(ev, dv, tol, t0, tm, depth + 1, out);
  biarcFitCurve(ev, dv, tol, tm, t1, depth + 1, out);
  return out;
}

// cubica -> biarce, cu taiere la inflexiuni
export function cubicToBiarcs(s, tol) {
  const ts = [0];
  // inflexiuni: cross(B', B'') = 0 -> ecuatie de gradul 2 in t
  const ax = -s.x0 + 3 * s.x1 - 3 * s.x2 + s.x3, ay = -s.y0 + 3 * s.y1 - 3 * s.y2 + s.y3;
  const bx = s.x0 - 2 * s.x1 + s.x2, by = s.y0 - 2 * s.y1 + s.y2;
  const cx = s.x1 - s.x0, cy = s.y1 - s.y0;
  const A = ax * by - ay * bx, B = ax * cy - ay * cx, C = bx * cy - by * cx;
  const roots = [];
  if (Math.abs(A) > 1e-14) { const D = B * B - 4 * A * C; if (D >= 0) { const q = Math.sqrt(D); roots.push((-B + q) / (2 * A), (-B - q) / (2 * A)); } }
  else if (Math.abs(B) > 1e-14) roots.push(-C / B);
  for (const r of roots.sort((a, b) => a - b)) if (r > 1e-6 && r < 1 - 1e-6) ts.push(r);
  ts.push(1);
  const out = [];
  for (let i = 0; i + 1 < ts.length; i++) biarcFitCurve((t) => cubicEval(s, t), (t) => cubicDeriv(s, t), tol, ts[i], ts[i + 1], 0, out);
  return out;
}

// contur oarecare -> contur doar L/A (cubice/patratice/conice -> biarce sub tol)
export function contourToLA(c, tol) {
  const segs = [];
  for (const s of c.segs) {
    if (s.k === 'L' || s.k === 'A') segs.push(s);
    else if (s.k === 'C') segs.push(...cubicToBiarcs(s, tol));
    else if (s.k === 'Q') segs.push(...cubicToBiarcs(quadToCubic(s), tol));
    else if (s.k === 'K') { const a = conicToArc(s); if (a) segs.push(a); else segs.push(...conicToBiarcs(s, tol)); }
  }
  return { closed: c.closed, segs };
}
function conicToBiarcs(s, tol) {
  const ev = (t) => { const u = 1 - t, w = s.w; const d = u * u + 2 * w * u * t + t * t; return [(u * u * s.x0 + 2 * w * u * t * s.x1 + t * t * s.x2) / d, (u * u * s.y0 + 2 * w * u * t * s.y1 + t * t * s.y2) / d]; };
  const dv = (t) => { const h = 1e-7; const a = ev(Math.max(0, t - h)), b = ev(Math.min(1, t + h)); return [b[0] - a[0], b[1] - a[1]]; };
  return biarcFitCurve(ev, dv, tol);
}

// ---------- Tiller-Hanson propriu: offset de cubica -> cubice sub toleranta ----------
export function cubicOffsetTH(s, d, tol, depth = 0, out = []) {
  // deplasare a poligonului de control (fiecare latura pe normala ei), apoi intersectie
  const P = [[s.x0, s.y0], [s.x1, s.y1], [s.x2, s.y2], [s.x3, s.y3]];
  const off = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy); if (l === 0) return null; const nx = dy / l, ny = -dx / l; return [[a[0] + nx * d, a[1] + ny * d], [b[0] + nx * d, b[1] + ny * d]]; };
  const L = [off(P[0], P[1]), off(P[1], P[2]), off(P[2], P[3])];
  let Q = null;
  if (L[0] && L[1] && L[2]) {
    const inter = (l1, l2) => { const [a, b] = l1, [c, e] = l2; const d1x = b[0] - a[0], d1y = b[1] - a[1], d2x = e[0] - c[0], d2y = e[1] - c[1]; const den = d1x * d2y - d1y * d2x; if (Math.abs(den) < 1e-12) return [(b[0] + c[0]) / 2, (b[1] + c[1]) / 2]; const t = ((c[0] - a[0]) * d2y - (c[1] - a[1]) * d2x) / den; return [a[0] + t * d1x, a[1] + t * d1y]; };
    Q = { k: 'C', x0: L[0][0][0], y0: L[0][0][1], x1: inter(L[0], L[1])[0], y1: inter(L[0], L[1])[1], x2: inter(L[1], L[2])[0], y2: inter(L[1], L[2])[1], x3: L[2][1][0], y3: L[2][1][1] };
  }
  let err = Infinity;
  if (Q) {
    err = 0;
    for (let i = 1; i < 16; i++) {
      const t = i / 16; const p = cubicEval(s, t), dd = cubicDeriv(s, t); const l = Math.hypot(dd[0], dd[1]);
      const ex = [p[0] + dd[1] / l * d, p[1] - dd[0] / l * d];
      // distanta de la punctul exact al offsetului la Q (esantionare densa locala)
      // distanta la polilinia prin 129 de esantioane ale lui Q (eroare <= sageata, neglijabila)
      let best = Infinity, prev = cubicEval(Q, 0);
      for (let j = 1; j <= 128; j++) { const q = cubicEval(Q, j / 128); const dx = q[0] - prev[0], dy = q[1] - prev[1], l2 = dx * dx + dy * dy; let u = l2 > 0 ? ((ex[0] - prev[0]) * dx + (ex[1] - prev[1]) * dy) / l2 : 0; u = Math.max(0, Math.min(1, u)); best = Math.min(best, Math.hypot(prev[0] + u * dx - ex[0], prev[1] + u * dy - ex[1])); prev = q; }
      err = Math.max(err, best);
    }
  }
  if ((Q && err <= tol) || depth > 14) { if (Q) out.push(Q); return out; }
  const [a, b] = splitCubic(s, 0.5);
  cubicOffsetTH(a, d, tol, depth + 1, out); cubicOffsetTH(b, d, tol, depth + 1, out);
  return out;
}
export function splitCubic(s, t) {
  const lerp = (a, b) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const p0 = [s.x0, s.y0], p1 = [s.x1, s.y1], p2 = [s.x2, s.y2], p3 = [s.x3, s.y3];
  const a = lerp(p0, p1), b = lerp(p1, p2), c = lerp(p2, p3), d = lerp(a, b), e = lerp(b, c), f = lerp(d, e);
  return [{ k: 'C', x0: p0[0], y0: p0[1], x1: a[0], y1: a[1], x2: d[0], y2: d[1], x3: f[0], y3: f[1] }, { k: 'C', x0: f[0], y0: f[1], x1: e[0], y1: e[1], x2: c[0], y2: c[1], x3: p3[0], y3: p3[1] }];
}

// ---------- refit de arce pe polilinie (pentru iesirea Clipper) ----------
export function refitPolyline(pts, closed, tol) {
  const n = pts.length; const out = [];
  if (n < 2) return out;
  const P = closed ? [...pts, pts[0]] : pts;
  let i = 0;
  const fitsCircle = (a, b) => {
    const m = Math.floor((a + b) / 2);
    const A = P[a], B = P[m], C = P[b];
    const d = 2 * (A[0] * (B[1] - C[1]) + B[0] * (C[1] - A[1]) + C[0] * (A[1] - B[1]));
    if (Math.abs(d) < 1e-12) return null;
    const ux = ((A[0] ** 2 + A[1] ** 2) * (B[1] - C[1]) + (B[0] ** 2 + B[1] ** 2) * (C[1] - A[1]) + (C[0] ** 2 + C[1] ** 2) * (A[1] - B[1])) / d;
    const uy = ((A[0] ** 2 + A[1] ** 2) * (C[0] - B[0]) + (B[0] ** 2 + B[1] ** 2) * (A[0] - C[0]) + (C[0] ** 2 + C[1] ** 2) * (B[0] - A[0])) / d;
    const r = Math.hypot(A[0] - ux, A[1] - uy);
    for (let k = a; k <= b; k++) if (Math.abs(Math.hypot(P[k][0] - ux, P[k][1] - uy) - r) > tol) return null;
    for (let k = a; k < b; k++) { const mx = (P[k][0] + P[k + 1][0]) / 2, my = (P[k][1] + P[k + 1][1]) / 2; if (Math.abs(Math.hypot(mx - ux, my - uy) - r) > tol) return null; }
    // sweep monoton
    const cr = (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]);
    const a0 = Math.atan2(A[1] - uy, A[0] - ux); let tot = 0;
    for (let k = a; k < b; k++) { let dd = Math.atan2(P[k + 1][1] - uy, P[k + 1][0] - ux) - Math.atan2(P[k][1] - uy, P[k][0] - ux); while (dd > Math.PI) dd -= TAU; while (dd < -Math.PI) dd += TAU; if ((cr > 0 && dd < -1e-12) || (cr < 0 && dd > 1e-12)) return null; tot += dd; }
    return { k: 'A', cx: ux, cy: uy, r, a0, da: tot };
  };
  while (i < P.length - 1) {
    let best = null, bj = i + 1;
    if (i + 2 < P.length) {
      // cautare: extinde cat timp se potriveste
      let j = i + 2; let last = fitsCircle(i, j);
      if (last) { best = last; bj = j; while (j + 1 < P.length) { const f = fitsCircle(i, j + 1); if (!f) break; j++; best = f; bj = j; } }
    }
    if (best && bj - i >= 3) { out.push(best); i = bj; }
    else { out.push({ k: 'L', x0: P[i][0], y0: P[i][1], x1: P[i + 1][0], y1: P[i + 1][1] }); i = i + 1; }
  }
  return out;
}

// aplatizare simpla (pentru Clipper): sageata <= tol
export function flattenContour(c, tol) {
  const pts = [];
  for (const s of c.segs) {
    let n = 1, ev;
    if (s.k === 'L') { ev = (t) => [s.x0 + (s.x1 - s.x0) * t, s.y0 + (s.y1 - s.y0) * t]; n = 1; }
    else if (s.k === 'A') { const step = 2 * Math.acos(Math.max(-1, 1 - tol / s.r)); n = Math.max(1, Math.ceil(Math.abs(s.da) / (step || 1e-3))); ev = (t) => [s.cx + s.r * Math.cos(s.a0 + s.da * t), s.cy + s.r * Math.sin(s.a0 + s.da * t)]; }
    else if (s.k === 'C' || s.k === 'Q') { const c3 = s.k === 'Q' ? quadToCubic(s) : s; const dd = Math.max(Math.hypot(c3.x0 - 2 * c3.x1 + c3.x2, c3.y0 - 2 * c3.y1 + c3.y2), Math.hypot(c3.x1 - 2 * c3.x2 + c3.x3, c3.y1 - 2 * c3.y2 + c3.y3)); n = Math.max(1, Math.ceil(Math.sqrt(6 * dd / (8 * tol)))); ev = (t) => cubicEval(c3, t); }
    else if (s.k === 'K') { const a = conicToArc(s); if (a) { const sub = flattenContour({ segs: [a] }, tol); pts.push(...sub.slice(0, -1)); continue; } n = 64; ev = (t) => { const u = 1 - t, w = s.w; const d = u * u + 2 * w * u * t + t * t; return [(u * u * s.x0 + 2 * w * u * t * s.x1 + t * t * s.x2) / d, (u * u * s.y0 + 2 * w * u * t * s.y1 + t * t * s.y2) / d]; }; }
    for (let i = 0; i < n; i++) pts.push(ev(i / n));
  }
  if (!c.closed && c.segs.length) pts.push(segEnd(c.segs[c.segs.length - 1]));
  else if (c.segs.length) pts.push(segEnd(c.segs[c.segs.length - 1]));
  return pts;
}

export function countKinds(region) {
  const n = { L: 0, A: 0, C: 0, Q: 0, K: 0, contururi: region.length };
  for (const c of region) for (const s of c.segs) n[s.k]++;
  return n;
}

// ---------- PRNG cu samanta ----------
export function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
