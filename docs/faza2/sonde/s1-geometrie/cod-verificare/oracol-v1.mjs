// ORACOL v1 (verificare adversariala s1). Cod scris de la zero: NU importa nimic din sonda s1
// (geom.mjs, oracol.mjs, adaptoare.mjs) si nici din bibliotecile testate.
// Segmente in format neutru: L {x0,y0,x1,y1} | A {cx,cy,r,a0,da} | Q {x0..x2} | C {x0..x3}.
// Distanta EXACTA punct -> segment: linie (proiectie), arc (unghi in baleiaj), patratica (radacinile
// unei cubice, lustruite Newton), cubica (esantionare + Newton). Exactitate ~1e-12 relativ.

export const TAU = 2 * Math.PI;

// ---------- evaluare ----------
export function P(s, t) {
  switch (s.k) {
    case 'L': return [s.x0 + (s.x1 - s.x0) * t, s.y0 + (s.y1 - s.y0) * t];
    case 'A': { const a = s.a0 + s.da * t; return [s.cx + s.r * Math.cos(a), s.cy + s.r * Math.sin(a)]; }
    case 'Q': { const u = 1 - t; return [u * u * s.x0 + 2 * u * t * s.x1 + t * t * s.x2, u * u * s.y0 + 2 * u * t * s.y1 + t * t * s.y2]; }
    case 'C': { const u = 1 - t; const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t; return [a * s.x0 + b * s.x1 + c * s.x2 + d * s.x3, a * s.y0 + b * s.y1 + c * s.y2 + d * s.y3]; }
  }
  throw new Error('oracol-v1: tip ' + s.k);
}
export function segLen(s) {
  if (s.k === 'L') return Math.hypot(s.x1 - s.x0, s.y1 - s.y0);
  if (s.k === 'A') return Math.abs(s.da) * s.r;
  let L = 0, p = P(s, 0); for (let i = 1; i <= 128; i++) { const q = P(s, i / 128); L += Math.hypot(q[0] - p[0], q[1] - p[1]); p = q; } return L;
}

// ---------- distanta exacta ----------
function dLine(s, x, y) {
  const dx = s.x1 - s.x0, dy = s.y1 - s.y0, l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(x - s.x0, y - s.y0);
  let t = ((x - s.x0) * dx + (y - s.y0) * dy) / l2; if (t < 0) t = 0; else if (t > 1) t = 1;
  return Math.hypot(s.x0 + t * dx - x, s.y0 + t * dy - y);
}
function dArc(s, x, y) {
  const vx = x - s.cx, vy = y - s.cy, rho = Math.hypot(vx, vy);
  // unghiul punctului masurat de la a0 in sensul baleiajului
  if (rho > 0) {
    let rel = Math.atan2(vy, vx) - s.a0;
    if (s.da < 0) rel = -rel;
    rel = rel - TAU * Math.floor(rel / TAU); // [0, 2pi)
    if (rel <= Math.abs(s.da)) return Math.abs(rho - s.r);
  } else return s.r;
  const e0 = P(s, 0), e1 = P(s, 1);
  return Math.min(Math.hypot(x - e0[0], y - e0[1]), Math.hypot(x - e1[0], y - e1[1]));
}
// radacinile reale ale a t^3 + b t^2 + c t + d in [0,1] (robust: Cardano + rezerva pe esantioane)
function cubicRoots01(a, b, c, d) {
  const out = [];
  const f = (t) => ((a * t + b) * t + c) * t + d;
  const fp = (t) => (3 * a * t + 2 * b) * t + c;
  // esantionare + bisectie: nu depinde de conditionarea formulelor inchise
  const N = 24; let t0 = 0, f0 = f(0);
  if (f0 === 0) out.push(0);
  for (let i = 1; i <= N; i++) {
    const t1 = i / N, f1 = f(t1);
    if (f1 === 0) out.push(t1);
    else if ((f0 < 0) !== (f1 < 0) && f0 !== 0) {
      let lo = t0, hi = t1, flo = f0;
      for (let it = 0; it < 80; it++) { const m = (lo + hi) / 2, fm = f(m); if (fm === 0) { lo = hi = m; break; } if ((fm < 0) === (flo < 0)) { lo = m; flo = fm; } else hi = m; if (hi - lo < 1e-16) break; }
      out.push((lo + hi) / 2);
    }
    t0 = t1; f0 = f1;
  }
  // minime locale ale |f| (radacini duble ratate de schimbarea de semn): Newton pe f'
  for (let i = 0; i <= N; i++) { let t = i / N; for (let it = 0; it < 30; it++) { const g = fp(t), h = 6 * a * t + 2 * b; if (h === 0) break; const tn = t - g / h; if (!(tn >= 0 && tn <= 1)) break; if (Math.abs(tn - t) < 1e-15) { t = tn; break; } t = tn; } if (t >= 0 && t <= 1) out.push(t); }
  return out;
}
function dQuad(s, x, y) {
  // B(t) = P0 + 2tA + t^2 B ; (B(t)-p).B'(t) = 0
  const Ax = s.x1 - s.x0, Ay = s.y1 - s.y0, Bx = s.x2 - 2 * s.x1 + s.x0, By = s.y2 - 2 * s.y1 + s.y0;
  const Mx = s.x0 - x, My = s.y0 - y;
  const a = Bx * Bx + By * By, b = 3 * (Ax * Bx + Ay * By), c = 2 * (Ax * Ax + Ay * Ay) + (Mx * Bx + My * By), d = Mx * Ax + My * Ay;
  let best = Math.min(Math.hypot(Mx, My), Math.hypot(s.x2 - x, s.y2 - y));
  for (const t of cubicRoots01(a, b, c, d)) { const q = P(s, t); const v = Math.hypot(q[0] - x, q[1] - y); if (v < best) best = v; }
  return best;
}
// Cubica: esantionare densa (512) + cautare ternara in jurul fiecarui minim local (fara Newton: Newton se oprea
// devreme langa capetele cu viteza zero, P1 = P0, si raporta 0,014 mm pentru puncte AFLATE pe curba; vezi raportul §4).
function dCubic(s, x, y) {
  const N = 512, f = (t) => { const q = P(s, t); return (q[0] - x) ** 2 + (q[1] - y) ** 2; };
  const v = new Float64Array(N + 1); for (let i = 0; i <= N; i++) v[i] = f(i / N);
  let best = Infinity;
  for (let i = 0; i <= N; i++) {
    if (!((i === 0 || v[i] <= v[i - 1]) && (i === N || v[i] <= v[i + 1]))) continue;
    let lo = Math.max(0, (i - 1) / N), hi = Math.min(1, (i + 1) / N);
    for (let it = 0; it < 100 && hi - lo > 1e-16; it++) { const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3; if (f(m1) <= f(m2)) hi = m2; else lo = m1; }
    best = Math.min(best, f((lo + hi) / 2), v[i]);
  }
  return Math.sqrt(best);
}
export function dSeg(s, x, y) {
  switch (s.k) { case 'L': return dLine(s, x, y); case 'A': return dArc(s, x, y); case 'Q': return dQuad(s, x, y); case 'C': return dCubic(s, x, y); }
  throw new Error('oracol-v1: tip ' + s.k);
}
function bboxSeg(s) {
  let pts;
  if (s.k === 'L') pts = [[s.x0, s.y0], [s.x1, s.y1]];
  else if (s.k === 'Q') pts = [[s.x0, s.y0], [s.x1, s.y1], [s.x2, s.y2]];
  else if (s.k === 'C') pts = [[s.x0, s.y0], [s.x1, s.y1], [s.x2, s.y2], [s.x3, s.y3]];
  else return [s.cx - s.r, s.cy - s.r, s.cx + s.r, s.cy + s.r];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const p of pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
  return [x0, y0, x1, y1];
}
// index de distanta: lista de segmente cu casete; interogare cu prag inferior
export function distIndex(region) {
  const segs = []; for (const c of region) for (const s of c.segs) segs.push(s);
  const bb = segs.map(bboxSeg);
  return { segs, bb };
}
export function dist(ix, x, y) {
  const n = ix.segs.length; const lb = new Float64Array(n); const ord = new Array(n);
  for (let i = 0; i < n; i++) { const b = ix.bb[i]; const dx = Math.max(b[0] - x, 0, x - b[2]), dy = Math.max(b[1] - y, 0, y - b[3]); lb[i] = Math.hypot(dx, dy); ord[i] = i; }
  ord.sort((a, b) => lb[a] - lb[b]);
  let best = Infinity;
  for (const i of ord) { if (lb[i] >= best) break; const d = dSeg(ix.segs[i], x, y); if (d < best) best = d; }
  return best;
}

// ---------- aplatizare fina (doar pentru testul in/afara si esantionare) ----------
export function flat(region, h) {
  return region.map((c) => { const pts = []; for (const s of c.segs) { const n = Math.max(s.k === 'L' ? 1 : 8, Math.ceil(segLen(s) / h)); for (let i = 0; i < n; i++) pts.push(P(s, i / n)); } if (c.segs.length) { const s = c.segs[c.segs.length - 1]; pts.push(P(s, 1)); } return pts; });
}
// par-impar pe polilinii (punctele testate sunt departe de frontiera)
export function insideEO(polys, x, y) {
  let c = 0;
  for (const Pl of polys) for (let i = 0; i + 1 < Pl.length; i++) { const a = Pl[i], b = Pl[i + 1]; if ((a[1] <= y) !== (b[1] <= y)) { const xi = a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]); if (xi > x) c++; } }
  return (c & 1) === 1;
}
// treceri ale unei linii orizontale y prin polilinii (pentru masca pe grila)
export function rowCrossings(polys, y) {
  const xs = [];
  for (const Pl of polys) for (let i = 0; i + 1 < Pl.length; i++) { const a = Pl[i], b = Pl[i + 1]; if ((a[1] <= y) !== (b[1] <= y)) xs.push(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1])); }
  return xs.sort((p, q) => p - q);
}

// ---------- arie exacta (Green): L, A, Q exact; C prin Gauss-Legendre (exact pentru polinoame de grad 5) ----------
export function area(region) {
  let S = 0;
  for (const c of region) for (const s of c.segs) {
    if (s.k === 'L') S += (s.x0 * s.y1 - s.x1 * s.y0) / 2;
    else if (s.k === 'A') { const a0 = s.a0, a1 = s.a0 + s.da; S += (s.r * s.r * s.da + s.cx * s.r * (Math.sin(a1) - Math.sin(a0)) - s.cy * s.r * (Math.cos(a1) - Math.cos(a0))) / 2; }
    else if (s.k === 'Q') { // integrala exacta 1/2 ∮ x dy - y dx pentru patratica
      const { x0, y0, x1, y1, x2, y2 } = s; S += ((2 * x0 * y1 - 2 * x1 * y0) + (x0 * y2 - x2 * y0) + (2 * x1 * y2 - 2 * x2 * y1)) / 6;
    } else { // cubica: 1/2 ∫ (x y' - y x') dt, integrand polinom de grad 5 -> Gauss 3 puncte e exact
      const g = [[0.5 - Math.sqrt(15) / 10, 5 / 18], [0.5, 8 / 18], [0.5 + Math.sqrt(15) / 10, 5 / 18]];
      for (const [t, w] of g) { const p = P(s, t); const u = 1 - t; const dx = 3 * (u * u * (s.x1 - s.x0) + 2 * u * t * (s.x2 - s.x1) + t * t * (s.x3 - s.x2)), dy = 3 * (u * u * (s.y1 - s.y0) + 2 * u * t * (s.y2 - s.y1) + t * t * (s.y3 - s.y2)); S += w * (p[0] * dy - p[1] * dx) / 2; }
    }
  }
  return S;
}

// ---------- esantionarea iesirii (puncte pe segmente, pas h) ----------
export function samplesOf(region, h) {
  const out = [];
  for (const c of region) for (const s of c.segs) { const n = Math.max(s.k === 'L' ? 2 : 8, Math.ceil(segLen(s) / h)); for (let i = 0; i <= n; i++) out.push(P(s, i / n)); }
  return out;
}
// golul maxim intre segmente consecutive (contur valid?)
export function maxGap(region) {
  let g = 0;
  for (const c of region) { const n = c.segs.length; for (let i = 0; i < n; i++) { if (!c.closed && i === n - 1) break; const a = P(c.segs[i], 1), b = P(c.segs[(i + 1) % n], 0); g = Math.max(g, Math.hypot(a[0] - b[0], a[1] - b[1])); } }
  return g;
}

// ---------- conversie bulge (polilinie cavalier) -> segmente, scrisa independent ----------
export function plineToSegs(verts, closed) {
  const segs = []; const n = verts.length; const cnt = closed ? n : n - 1;
  for (let i = 0; i < cnt; i++) {
    const a = verts[i], b = verts[(i + 1) % n];
    if (a.bulge === 0) { segs.push({ k: 'L', x0: a.x, y0: a.y, x1: b.x, y1: b.y }); continue; }
    const th = 4 * Math.atan(a.bulge); // baleiaj cu semn
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = b.x - a.x, dy = b.y - a.y, c = Math.hypot(dx, dy);
    if (c === 0) { segs.push({ k: 'L', x0: a.x, y0: a.y, x1: b.x, y1: b.y }); continue; }
    const r = c / (2 * Math.abs(Math.sin(th / 2)));
    // centrul: pe mediatoare, la distanta r cos(th/2) de coarda, spre stanga pentru CCW
    const h = r * Math.cos(th / 2) * Math.sign(th);
    const cx = mx - dy / c * h, cy = my + dx / c * h;
    segs.push({ k: 'A', cx, cy, r, a0: Math.atan2(a.y - cy, a.x - cx), da: th });
  }
  return { closed, segs };
}

// ---------- GRBL 1.1: verificarea arcului (gcode.c) si interpolarea (motion_control.c), in float32 ----------
// [citit] https://github.com/gnea/grbl/blob/master/grbl/gcode.c (delta_r > 0.005 si (> 0.5 sau > 0.001 r) => error:33)
const f32 = Math.fround;
export function grblArcCheck(x0, y0, x1, y1, I, J) {
  const cx = f32(f32(x0) + f32(I)), cy = f32(f32(y0) + f32(J));
  const tr = f32(Math.hypot(f32(f32(x1) - cx), f32(f32(y1) - cy)));
  const r = f32(Math.hypot(f32(I), f32(J)));
  const dr = f32(Math.abs(f32(tr - r)));
  const err33 = dr > 0.005 && (dr > 0.5 || dr > 0.001 * r);
  return { dr, r, err33 };
}
