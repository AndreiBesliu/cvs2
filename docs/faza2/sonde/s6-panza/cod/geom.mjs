// geom.mjs — sonda s6-panza (ARUNCABIL). Geometrie exactă: linie, arc, cubică.
// Coordonate în mm, y în jos (ca pe ecran). Unghiurile se măsoară de la +x spre +y.
// Segment: {t:'L',x0,y0,x1,y1} | {t:'A',cx,cy,r,a0,da} | {t:'C',x0,y0,x1,y1,x2,y2,x3,y3}
// Formă: {id, kind, subs:[{segs, closed}], bb:[minx,miny,maxx,maxy]}

export const TAU = Math.PI * 2;

export function arcPt(s, a) { return [s.cx + s.r * Math.cos(a), s.cy + s.r * Math.sin(a)]; }
export function segStart(s) { return s.t === 'A' ? arcPt(s, s.a0) : [s.x0, s.y0]; }
export function segEnd(s) {
  if (s.t === 'L') return [s.x1, s.y1];
  if (s.t === 'A') return arcPt(s, s.a0 + s.da);
  return [s.x3, s.y3];
}

// Unghiul a e în baleiajul (a0, da)?
export function angleInSweep(a, a0, da) {
  if (Math.abs(da) >= TAU - 1e-15) return true;
  let d = a - a0;
  if (da >= 0) { d = ((d % TAU) + TAU) % TAU; return d <= da; }
  d = ((-d % TAU) + TAU) % TAU; return d <= -da;
}

function quadRoots(A, B, C, out) { // rădăcini reale ale A t^2 + B t + C în (0,1)
  if (Math.abs(A) < 1e-14) { if (Math.abs(B) > 1e-14) { const t = -C / B; if (t > 0 && t < 1) out.push(t); } return out; }
  const D = B * B - 4 * A * C; if (D < 0) return out;
  const q = -0.5 * (B + Math.sign(B || 1) * Math.sqrt(D));
  const t1 = q / A, t2 = q !== 0 ? C / q : NaN;
  if (t1 > 0 && t1 < 1) out.push(t1);
  if (t2 > 0 && t2 < 1 && Math.abs(t2 - t1) > 1e-15) out.push(t2);
  return out;
}

export function cubicAt(s, t) {
  const mt = 1 - t, a = mt * mt * mt, b = 3 * mt * mt * t, c = 3 * mt * t * t, d = t * t * t;
  return [a * s.x0 + b * s.x1 + c * s.x2 + d * s.x3, a * s.y0 + b * s.y1 + c * s.y2 + d * s.y3];
}
function cubicAxisExtremaT(p0, p1, p2, p3, out) {
  const d0 = p1 - p0, d1 = p2 - p1, d2 = p3 - p2;
  return quadRoots(d0 - 2 * d1 + d2, 2 * (d1 - d0), d0, out);
}

export function segBBox(s, bb) {
  const add = (x, y) => { if (x < bb[0]) bb[0] = x; if (y < bb[1]) bb[1] = y; if (x > bb[2]) bb[2] = x; if (y > bb[3]) bb[3] = y; };
  if (s.t === 'L') { add(s.x0, s.y0); add(s.x1, s.y1); return bb; }
  if (s.t === 'A') {
    const p0 = arcPt(s, s.a0), p1 = arcPt(s, s.a0 + s.da); add(p0[0], p0[1]); add(p1[0], p1[1]);
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; if (angleInSweep(a, s.a0, s.da)) { const p = arcPt(s, a); add(p[0], p[1]); } }
    return bb;
  }
  add(s.x0, s.y0); add(s.x3, s.y3);
  const ts = []; cubicAxisExtremaT(s.x0, s.x1, s.x2, s.x3, ts); cubicAxisExtremaT(s.y0, s.y1, s.y2, s.y3, ts);
  for (const t of ts) { const p = cubicAt(s, t); add(p[0], p[1]); }
  return bb;
}
export function shapeBBox(sh) {
  const bb = [Infinity, Infinity, -Infinity, -Infinity];
  for (const sub of sh.subs) for (const s of sub.segs) segBBox(s, bb);
  return bb;
}

// ---------- distanța exactă (implementarea CANDIDAT; oracolul e în oracle.mjs, fără cod comun) ----------
function distLine(s, px, py) {
  const dx = s.x1 - s.x0, dy = s.y1 - s.y0, L2 = dx * dx + dy * dy;
  let t = L2 > 0 ? ((px - s.x0) * dx + (py - s.y0) * dy) / L2 : 0; t = t < 0 ? 0 : t > 1 ? 1 : t;
  const ex = s.x0 + t * dx - px, ey = s.y0 + t * dy - py; return Math.sqrt(ex * ex + ey * ey);
}
function distArc(s, px, py) {
  const dx = px - s.cx, dy = py - s.cy, d = Math.hypot(dx, dy);
  if (d === 0) return s.r;
  if (angleInSweep(Math.atan2(dy, dx), s.a0, s.da)) return Math.abs(d - s.r);
  const a = arcPt(s, s.a0), b = arcPt(s, s.a0 + s.da);
  return Math.min(Math.hypot(px - a[0], py - a[1]), Math.hypot(px - b[0], py - b[1]));
}
function distCubic(s, px, py) {
  const N = 32; let best = Infinity; const ds = new Float64Array(N + 1);
  for (let i = 0; i <= N; i++) { const p = cubicAt(s, i / N); ds[i] = (p[0] - px) ** 2 + (p[1] - py) ** 2; }
  best = Math.min(ds[0], ds[N]);
  const G = (Math.sqrt(5) - 1) / 2;
  for (let i = 0; i <= N; i++) {
    const left = i > 0 ? ds[i - 1] : Infinity, right = i < N ? ds[i + 1] : Infinity;
    if (ds[i] <= left && ds[i] <= right) { // minim local între eșantioane: secțiunea de aur în [i-1, i+1]
      let a = Math.max(0, (i - 1) / N), b = Math.min(1, (i + 1) / N);
      let c = b - G * (b - a), d = a + G * (b - a);
      const f = (t) => { const p = cubicAt(s, t); return (p[0] - px) ** 2 + (p[1] - py) ** 2; };
      let fc = f(c), fd = f(d);
      for (let k = 0; k < 48; k++) {
        if (fc < fd) { b = d; d = c; fd = fc; c = b - G * (b - a); fc = f(c); }
        else { a = c; c = d; fc = fd; d = a + G * (b - a); fd = f(d); }
      }
      best = Math.min(best, fc, fd);
    }
  }
  return Math.sqrt(best);
}
export function segDist(s, px, py) { return s.t === 'L' ? distLine(s, px, py) : s.t === 'A' ? distArc(s, px, py) : distCubic(s, px, py); }

// caseta punctelor de control (ieftină) — pentru tăiere timpurie
function ctrlBoxDist(s, px, py) {
  let x0, y0, x1, y1;
  if (s.t === 'L') { x0 = Math.min(s.x0, s.x1); x1 = Math.max(s.x0, s.x1); y0 = Math.min(s.y0, s.y1); y1 = Math.max(s.y0, s.y1); }
  else if (s.t === 'A') { x0 = s.cx - s.r; x1 = s.cx + s.r; y0 = s.cy - s.r; y1 = s.cy + s.r; }
  else { x0 = Math.min(s.x0, s.x1, s.x2, s.x3); x1 = Math.max(s.x0, s.x1, s.x2, s.x3); y0 = Math.min(s.y0, s.y1, s.y2, s.y3); y1 = Math.max(s.y0, s.y1, s.y2, s.y3); }
  const dx = px < x0 ? x0 - px : px > x1 ? px - x1 : 0, dy = py < y0 ? y0 - py : py > y1 ? py - y1 : 0;
  return Math.hypot(dx, dy);
}
export function shapeDist(sh, px, py, limit = Infinity) {
  let best = limit;
  for (const sub of sh.subs) for (const s of sub.segs) {
    if (ctrlBoxDist(s, px, py) >= best) continue;
    const d = segDist(s, px, py); if (d < best) best = d;
  }
  return best < limit ? best : Infinity; // nimic sub prag -> Infinity (pragul nu e o distanță)
}

// ---------- regula de umplere: număr de înfășurare prin încrucișări exacte (raza spre +x) ----------
function bisect(f, a, b, target, n = 64) { // f monotonă pe [a,b]
  let fa = f(a) - target;
  for (let i = 0; i < n; i++) { const m = 0.5 * (a + b), fm = f(m) - target; if ((fm <= 0) === (fa <= 0)) { a = m; fa = fm; } else b = m; }
  return 0.5 * (a + b);
}
function windLine(x0, y0, x1, y1, px, py) {
  if (y0 <= py && y1 > py) { const x = x0 + (py - y0) / (y1 - y0) * (x1 - x0); return x > px ? 1 : 0; }
  if (y1 <= py && y0 > py) { const x = x0 + (py - y0) / (y1 - y0) * (x1 - x0); return x > px ? -1 : 0; }
  return 0;
}
function windMonotone(fx, fy, ta, tb, px, py) { // bucată y-monotonă parametrizată de t
  const ys = fy(ta), ye = fy(tb);
  let dir = 0;
  if (ys <= py && ye > py) dir = 1; else if (ye <= py && ys > py) dir = -1; else return 0;
  const t = bisect(ys < ye ? fy : (u) => -fy(u), ta, tb, ys < ye ? py : -py);
  return fx(t) > px ? dir : 0;
}
function windSeg(s, px, py) {
  if (s.t === 'L') return windLine(s.x0, s.y0, s.x1, s.y1, px, py);
  if (s.t === 'A') {
    if (py < s.cy - s.r || py > s.cy + s.r) { // raza nu atinge cercul: contribuie doar coarda capetelor? nu — arcul e y-monoton pe bucăți, iar capetele sunt de aceeași parte
      return 0;
    }
    // împarte la unghiurile cu y extrem (pi/2 + k*pi)
    const cuts = [0]; const sgn = Math.sign(s.da) || 1;
    for (let k = -8; k <= 8; k++) {
      const a = Math.PI / 2 + k * Math.PI; const u = (a - s.a0) / s.da; if (u > 0 && u < 1) cuts.push(u);
    }
    cuts.push(1); cuts.sort((p, q) => p - q);
    const fx = (u) => s.cx + s.r * Math.cos(s.a0 + u * s.da), fy = (u) => s.cy + s.r * Math.sin(s.a0 + u * s.da);
    let w = 0; for (let i = 0; i + 1 < cuts.length; i++) w += windMonotone(fx, fy, cuts[i], cuts[i + 1], px, py);
    void sgn; return w;
  }
  const ts = [0]; cubicAxisExtremaT(s.y0, s.y1, s.y2, s.y3, ts); ts.push(1); ts.sort((p, q) => p - q);
  const fx = (t) => cubicAt(s, t)[0], fy = (t) => cubicAt(s, t)[1];
  let w = 0; for (let i = 0; i + 1 < ts.length; i++) w += windMonotone(fx, fy, ts[i], ts[i + 1], px, py);
  return w;
}
export function winding(sh, px, py) {
  let w = 0;
  for (const sub of sh.subs) {
    if (!sub.closed) continue;
    for (const s of sub.segs) w += windSeg(s, px, py);
    const a = segEnd(sub.segs[sub.segs.length - 1]), b = segStart(sub.segs[0]); // închiderea implicită
    if (Math.hypot(a[0] - b[0], a[1] - b[1]) > 1e-12) w += windLine(a[0], a[1], b[0], b[1], px, py);
  }
  return w;
}
export function inside(sh, px, py, rule) { const w = winding(sh, px, py); return rule === 'evenodd' ? (w & 1) !== 0 : w !== 0; }

// ---------- transformări care păstrează arcele (rotire + translație) ----------
export function rotateSeg(s, ang, ox, oy, tx, ty) {
  const c = Math.cos(ang), n = Math.sin(ang);
  const R = (x, y) => [ox + (x - ox) * c - (y - oy) * n + tx, oy + (x - ox) * n + (y - oy) * c + ty];
  if (s.t === 'L') { const a = R(s.x0, s.y0), b = R(s.x1, s.y1); return { t: 'L', x0: a[0], y0: a[1], x1: b[0], y1: b[1] }; }
  if (s.t === 'A') { const C = R(s.cx, s.cy); return { t: 'A', cx: C[0], cy: C[1], r: s.r, a0: s.a0 + ang, da: s.da }; }
  const p0 = R(s.x0, s.y0), p1 = R(s.x1, s.y1), p2 = R(s.x2, s.y2), p3 = R(s.x3, s.y3);
  return { t: 'C', x0: p0[0], y0: p0[1], x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1], x3: p3[0], y3: p3[1] };
}

// ---------- ieșiri spre randatoare ----------
export function toPath2D(sh, P) { // P = Path2D sau orice obiect cu moveTo/lineTo/arc/bezierCurveTo/closePath
  for (const sub of sh.subs) {
    const st = segStart(sub.segs[0]); P.moveTo(st[0], st[1]);
    for (const s of sub.segs) {
      if (s.t === 'L') P.lineTo(s.x1, s.y1);
      else if (s.t === 'A') P.arc(s.cx, s.cy, s.r, s.a0, s.a0 + s.da, s.da < 0);
      else P.bezierCurveTo(s.x1, s.y1, s.x2, s.y2, s.x3, s.y3);
    }
    if (sub.closed) P.closePath();
  }
  return P;
}
export function toCK(sh, B, k = 1) { // B = CanvasKit PathBuilder; unghiurile în grade
  const D = 180 / Math.PI;
  for (const sub of sh.subs) {
    const st = segStart(sub.segs[0]); B.moveTo(st[0] * k, st[1] * k);
    for (const s of sub.segs) {
      if (s.t === 'L') B.lineTo(s.x1 * k, s.y1 * k);
      else if (s.t === 'A') {
        const rect = [(s.cx - s.r) * k, (s.cy - s.r) * k, (s.cx + s.r) * k, (s.cy + s.r) * k];
        if (Math.abs(s.da) >= TAU - 1e-12) { // cerc întreg: două jumătăți (Skia nu acceptă baleiaj de 360 într-un arcTo)
          B.arcToOval(rect, s.a0 * D, s.da * D / 2, false); B.arcToOval(rect, (s.a0 + s.da / 2) * D, s.da * D / 2, false);
        } else B.arcToOval(rect, s.a0 * D, s.da * D, false);
      } else B.cubicTo(s.x1 * k, s.y1 * k, s.x2 * k, s.y2 * k, s.x3 * k, s.y3 * k);
    }
    if (sub.closed) B.close();
  }
  return B;
}
// Aplatizare (pentru stratul WebGL / statistici): toleranță tol în mm
export function flattenSeg(s, tol, out) {
  if (s.t === 'L') { out.push(s.x1, s.y1); return; }
  if (s.t === 'A') {
    const r = s.r, step = r > tol ? 2 * Math.acos(Math.max(-1, 1 - tol / r)) : Math.PI / 2;
    const n = Math.max(1, Math.ceil(Math.abs(s.da) / step));
    for (let i = 1; i <= n; i++) { const p = arcPt(s, s.a0 + s.da * i / n); out.push(p[0], p[1]); }
    return;
  }
  const dd = Math.max(Math.hypot(s.x0 - 2 * s.x1 + s.x2, s.y0 - 2 * s.y1 + s.y2), Math.hypot(s.x1 - 2 * s.x2 + s.x3, s.y1 - 2 * s.y2 + s.y3));
  const n = Math.max(1, Math.ceil(Math.sqrt((3 * dd) / (4 * tol)))); // margine Wang
  for (let i = 1; i <= n; i++) { const p = cubicAt(s, i / n); out.push(p[0], p[1]); }
}
