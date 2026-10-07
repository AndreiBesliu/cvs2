// Adevarul independent pentru regiuni din linii si arce: distanta cu semn EXACTA (oracol-v1) si nivelul {sd = L}.
// sd > 0 inauntru, sd < 0 afara. Offset spre interior D: nivel L = +D; spre exterior d: nivel L = -d.
import { distIndex, dist, dSeg, samplesOf, maxGap, P } from './oracol-v1.mjs';

// in/afara EXACT pentru L/A prin NUMARUL DE INFASURARE (fara raza: o raza care trece exact printr-un capat de arc
// numara gresit, vezi raportul §4). Linie: unghiul subintins. Arc: unghiul coardei + 2pi*sign(da) daca punctul e in
// segmentul circular (disc ∩ partea coardei unde e mijlocul arcului). Regula: par-impar pe infasurare (|w| impar).
export function windingExact(region, x, y) {
  let W = 0;
  const ang = (ax, ay, bx, by) => Math.atan2((ax - x) * (by - y) - (ay - y) * (bx - x), (ax - x) * (bx - x) + (ay - y) * (by - y));
  for (const cn of region) for (const s of cn.segs) {
    if (s.k === 'L') { W += ang(s.x0, s.y0, s.x1, s.y1); continue; }
    if (s.k !== 'A') throw new Error('windingExact: doar L/A');
    // bucati de <= 22,5 grade: punctul poate cadea pe coarda unei bucati doar foarte aproape de arc
    // (centrul cercului, de exemplu, nu cade niciodata pe o coarda scurta)
    const n = Math.max(1, Math.ceil(Math.abs(s.da) / (Math.PI / 8)));
    const inDisk = Math.hypot(x - s.cx, y - s.cy) < s.r;
    for (let i = 0; i < n; i++) {
      const t0 = s.a0 + s.da * i / n, t1 = s.a0 + s.da * (i + 1) / n;
      const ax = s.cx + s.r * Math.cos(t0), ay = s.cy + s.r * Math.sin(t0), bx = s.cx + s.r * Math.cos(t1), by = s.cy + s.r * Math.sin(t1);
      W += ang(ax, ay, bx, by);
      if (inDisk) {
        const am = (t0 + t1) / 2, mx = s.cx + s.r * Math.cos(am), my = s.cy + s.r * Math.sin(am);
        const side = (px, py) => Math.sign((bx - ax) * (py - ay) - (by - ay) * (px - ax));
        if (side(x, y) === side(mx, my)) W += 2 * Math.PI * Math.sign(s.da);
      }
    }
  }
  return Math.round(W / (2 * Math.PI));
}
export function insideExact(region, x, y) { return (Math.abs(windingExact(region, x, y)) & 1) === 1; }
export function makeTruth(region) {
  const ix = distIndex(region);
  const sd = (x, y) => { const d = dist(ix, x, y); return insideExact(region, x, y) ? d : -d; };
  return { region, ix, sd };
}
// grile (ferestre) {x0,y0,x1,y1,g}: puncte pe {sd = L} prin treceri pe muchii + regula falsi (Illinois)
export function levelPoints(T, L, windows) {
  const pts = [];
  for (const w of windows) {
    const nx = Math.ceil((w.x1 - w.x0) / w.g) + 1, ny = Math.ceil((w.y1 - w.y0) / w.g) + 1;
    const X = (i) => w.x0 + i * w.g, Y = (j) => w.y0 + j * w.g;
    const v = new Float64Array(nx * ny);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) v[j * nx + i] = T.sd(X(i), Y(j)) - L;
    const solve = (ax, ay, bx, by, fa, fb) => {
      let lo = 0, hi = 1, flo = fa, fhi = fb, side = 0;
      for (let it = 0; it < 80; it++) {
        const t = (lo * fhi - hi * flo) / (fhi - flo);
        const f = T.sd(ax + (bx - ax) * t, ay + (by - ay) * t) - L;
        if (Math.abs(f) < 1e-13 || hi - lo < 1e-15) { lo = hi = t; break; }
        if ((f < 0) === (flo < 0)) { lo = t; flo = f; if (side === -1) fhi /= 2; side = -1; } else { hi = t; fhi = f; if (side === 1) flo /= 2; side = 1; }
      }
      const t = (lo + hi) / 2; return [ax + (bx - ax) * t, ay + (by - ay) * t];
    };
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const a = v[j * nx + i];
      if (i + 1 < nx) { const b = v[j * nx + i + 1]; if ((a < 0) !== (b < 0)) pts.push(solve(X(i), Y(j), X(i + 1), Y(j), a, b)); }
      if (j + 1 < ny) { const b = v[(j + 1) * nx + i]; if ((a < 0) !== (b < 0)) pts.push(solve(X(i), Y(j), X(i), Y(j + 1), a, b)); }
    }
  }
  // un punct de trecere e pe nivel doar daca |sd - L| e mic (altfel muchia traversa un salt al lui sd: nu exista la distanta continua)
  return pts.filter((p) => Math.abs(T.sd(p[0], p[1]) - L) < 1e-9);
}
// verificarea iesirii (bucle inchise, plinul la stanga) fata de nivelul adevarat L
export function checkOffset(T, loops, L, windows, hS) {
  const r = { bucle: loops.length, seg: loops.reduce((a, c) => a + c.segs.length, 0), arce: loops.reduce((a, c) => a + c.segs.filter((s) => s.k === 'A').length, 0) };
  let e = 0;
  for (const p of samplesOf(loops, hS)) e = Math.max(e, Math.abs(T.sd(p[0], p[1]) - L));
  r.iesireAdevar = loops.length ? e : 0;
  const tp = levelPoints(T, L, windows); r.puncteAdevar = tp.length;
  const segs = loops.flatMap((c) => c.segs);
  let h = 0; for (const q of tp) { let b = Infinity; for (const s of segs) { const v = dSeg(s, q[0], q[1]); if (v < b) b = v; } h = Math.max(h, b); }
  r.adevarIesire = tp.length ? h : 0;
  r.gol = maxGap(loops);
  // orientare: plinul (sd > L) la stanga
  let inv = 0, tot = 0; const del = Math.max(1e-4, hS / 5);
  for (const c of loops) for (const s of c.segs) {
    const p = P(s, 0.5), q = P(s, 0.5 + 1e-6); const tx = q[0] - p[0], ty = q[1] - p[1], l = Math.hypot(tx, ty); if (!(l > 0)) continue;
    const nx = -ty / l, ny = tx / l; const a = T.sd(p[0] + nx * del, p[1] + ny * del) - L, b = T.sd(p[0] - nx * del, p[1] - ny * del) - L;
    tot++; if (a < 0 && b > 0) inv++;
  }
  r.orientareInversata = inv; r.orientareTotal = tot;
  return r;
}
