// scene.mjs — sonda s6-panza (ARUNCABIL). Corpus determinist care rupe coincidențele.
// Placa: 2440 x 1220 mm. Zona rezervată pentru formele-sondă analitice: y în [1240, 1340] mm.
import { TAU, shapeBBox, rotateSeg } from './geom.mjs';

export const SHEET_W = 2440, SHEET_H = 1220;

export function mulberry32(a) {
  return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const L = (x0, y0, x1, y1) => ({ t: 'L', x0, y0, x1, y1 });
const A = (cx, cy, r, a0, da) => ({ t: 'A', cx, cy, r, a0, da });
const C = (x0, y0, x1, y1, x2, y2, x3, y3) => ({ t: 'C', x0, y0, x1, y1, x2, y2, x3, y3 });

export function circle(cx, cy, r, ccw = false) { return { subs: [{ segs: [A(cx, cy, r, 0, ccw ? -TAU : TAU)], closed: true }] }; }
export function roundRect(cx, cy, w, h, r, rot) {
  const x0 = cx - w / 2, y0 = cy - h / 2, x1 = cx + w / 2, y1 = cy + h / 2; const H = Math.PI / 2;
  let segs = [
    L(x0 + r, y0, x1 - r, y0), A(x1 - r, y0 + r, r, -H, H),
    L(x1, y0 + r, x1, y1 - r), A(x1 - r, y1 - r, r, 0, H),
    L(x1 - r, y1, x0 + r, y1), A(x0 + r, y1 - r, r, H, H),
    L(x0, y1 - r, x0, y0 + r), A(x0 + r, y0 + r, r, Math.PI, H),
  ];
  if (rot) segs = segs.map((s) => rotateSeg(s, rot, cx, cy, 0, 0));
  return { subs: [{ segs, closed: true }] };
}
function zigzag(rnd, x, y, n, closed) {
  const segs = []; let a = rnd() * TAU, px = x, py = y; const pts = [[px, py]];
  for (let i = 0; i < n; i++) {
    const len = 3 + rnd() * 40; px += len * Math.cos(a); py += len * Math.sin(a); pts.push([px, py]);
    const turn = (30 + rnd() * 60) * Math.PI / 180; a += (rnd() < 0.5 ? 1 : -1) * (Math.PI - turn); // unghi interior 30..90 grade
  }
  for (let i = 0; i + 1 < pts.length; i++) segs.push(L(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]));
  if (closed) segs.push(L(px, py, x, y));
  return { subs: [{ segs, closed }] };
}
function blob(rnd, cx, cy, R) { // contur închis din cubice (Catmull-Rom -> Bézier)
  const n = 4 + Math.floor(rnd() * 5), P = [];
  for (let i = 0; i < n; i++) { const a = i / n * TAU, r = R * (0.5 + rnd() * 0.5); P.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
  const segs = [];
  for (let i = 0; i < n; i++) {
    const p0 = P[(i - 1 + n) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n];
    segs.push(C(p1[0], p1[1], p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]));
  }
  return { subs: [{ segs, closed: true }] };
}
function donut(cx, cy, R, r, sameOrientation) {
  return { subs: [{ segs: [A(cx, cy, R, 0, TAU)], closed: true }, { segs: [A(cx, cy, r, 0, sameOrientation ? TAU : -TAU)], closed: true }] };
}

// Glife reale: comenzile opentype (M/L/Q/C/Z, y în jos) -> forme cu subcăi; Q ridicat la cubică (exact)
export function glyphShapes(font, text, x, y, size) {
  const out = [];
  for (const gp of font.getPaths(text, x, y, size)) {
    // Conturul unei glife e închis prin definiție; opentype 2.0 nu emite 'Z' pentru TrueType -> închidem explicit.
    const subs = []; let cur = null, sx = 0, sy = 0, lx = 0, ly = 0;
    const shut = () => { if (cur && cur.segs.length) { if (Math.hypot(sx - lx, sy - ly) > 1e-9) cur.segs.push(L(lx, ly, sx, sy)); cur.closed = true; subs.push(cur); } cur = null; };
    for (const c of gp.commands) {
      if (c.type === 'M') { shut(); cur = { segs: [], closed: false }; sx = lx = c.x; sy = ly = c.y; }
      else if (c.type === 'L') { if (Math.hypot(c.x - lx, c.y - ly) > 1e-9) cur.segs.push(L(lx, ly, c.x, c.y)); lx = c.x; ly = c.y; }
      else if (c.type === 'Q') { cur.segs.push(C(lx, ly, lx + 2 / 3 * (c.x1 - lx), ly + 2 / 3 * (c.y1 - ly), c.x + 2 / 3 * (c.x1 - c.x), c.y + 2 / 3 * (c.y1 - c.y), c.x, c.y)); lx = c.x; ly = c.y; }
      else if (c.type === 'C') { cur.segs.push(C(lx, ly, c.x1, c.y1, c.x2, c.y2, c.x, c.y)); lx = c.x; ly = c.y; }
      else if (c.type === 'Z') { shut(); lx = sx; ly = sy; }
    }
    shut();
    if (subs.length) out.push({ subs });
  }
  return out;
}

const WORDS = ['CNC', 'Vector', 'Studio', 'frezare', 'lemn', 'Ag', 'B8', 'OQ', 'stejar', 'nuc', 'inel', 'Hg', '0123', '@&%'];

// Formele-sondă cu răspuns analitic (oracle.mjs le cunoaște pe hârtie).
export function probeShapes() {
  const H = 1290, D = Math.PI / 180;
  return [
    { kind: 'p-circle', an: { t: 'circle', cx: 100, cy: H, r: 40 }, ...circle(100, H, 40) },
    { kind: 'p-tiny', an: { t: 'circle', cx: 200, cy: H, r: 0.01 }, ...circle(200, H, 0.01) },
    { kind: 'p-arc', an: { t: 'arc', cx: 300, cy: H, r: 30, a0: 10 * D, da: 120 * D }, subs: [{ segs: [A(300, H, 30, 10 * D, 120 * D)], closed: false }] },
    { kind: 'p-seg', an: { t: 'seg', x0: 400, y0: 1260, x1: 480, y1: 1320 }, subs: [{ segs: [L(400, 1260, 480, 1320)], closed: false }] },
    { kind: 'p-parab', an: { t: 'quad', x0: 550, y0: 1320, x1: 600, y1: 1250, x2: 650, y2: 1320 },
      subs: [{ segs: [C(550, 1320, 550 + 2 / 3 * 50, 1320 - 2 / 3 * 70, 650 - 2 / 3 * 50, 1320 - 2 / 3 * 70, 650, 1320)], closed: false }] },
    { kind: 'p-tan1', an: { t: 'circle', cx: 750, cy: H, r: 20 }, ...circle(750, H, 20) },
    { kind: 'p-tan2', an: { t: 'circle', cx: 790.001, cy: H, r: 20 }, ...circle(790.001, H, 20) }, // joc de 0,001 mm față de p-tan1
    { kind: 'p-sqA', an: { t: 'rrect', cx: 860, cy: H, w: 20, h: 20, r: 0, rot: 0 }, subs: [{ segs: [L(850, 1280, 870, 1280), L(870, 1280, 870, 1300), L(870, 1300, 850, 1300), L(850, 1300, 850, 1280)], closed: true }] },
    { kind: 'p-sqB', an: { t: 'rrect', cx: 880, cy: H, w: 20, h: 20, r: 0, rot: 0 }, subs: [{ segs: [L(870, 1280, 890, 1280), L(890, 1280, 890, 1300), L(890, 1300, 870, 1300), L(870, 1300, 870, 1280)], closed: true }] }, // muchie comună x=870
    { kind: 'p-rrect', an: { t: 'rrect', cx: 1000, cy: H, w: 60, h: 30, r: 8, rot: 37 * D }, ...roundRect(1000, H, 60, 30, 8, 37 * D) },
  ];
}

export function makeScene(n, seed, font) {
  const rnd = mulberry32(seed), shapes = [];
  const R = (a, b) => a + rnd() * (b - a);
  const fits = (bb) => bb[0] >= 0 && bb[1] >= 0 && bb[2] <= SHEET_W && bb[3] <= SHEET_H;
  const push = (sh, kind) => { sh.kind = kind; sh.bb = shapeBBox(sh); if (fits(sh.bb)) { sh.id = shapes.length; shapes.push(sh); return true; } return false; };
  shapes.push(Object.assign(roundRect(SHEET_W / 2, SHEET_H / 2, SHEET_W, SHEET_H, 0.001, 0), { kind: 'sheet', id: 0 })); shapes[0].bb = shapeBBox(shapes[0]);
  let guard = 0;
  while (shapes.length < n && guard++ < n * 50) {
    const k = rnd(), x = R(0, SHEET_W), y = R(0, SHEET_H);
    if (k < 0.25) { const q = rnd(); const r = q < 0.05 ? R(0.01, 0.05) : q < 0.75 ? R(1, 30) : q < 0.95 ? R(30, 200) : R(200, 600); push(circle(x, y, r, rnd() < 0.5), r < 0.1 ? 'tiny' : 'circle'); }
    else if (k < 0.40) { const r = R(1, 80); push({ subs: [{ segs: [A(x, y, r, R(0, TAU), (rnd() < 0.5 ? 1 : -1) * R(30, 300) * Math.PI / 180)], closed: false }] }, 'arc'); }
    else if (k < 0.55) { const w = R(5, 200), h = R(5, 200); push(roundRect(x, y, w, h, R(0.5, Math.min(20, w / 2, h / 2)), R(30, 90) * Math.PI / 180), 'rrect'); }
    else if (k < 0.70) push(zigzag(rnd, x, y, 4 + Math.floor(rnd() * 9), rnd() < 0.5), 'zigzag');
    else if (k < 0.80) push(blob(rnd, x, y, R(3, 60)), 'blob');
    else if (k < 0.85) { const Rr = R(5, 60); push(donut(x, y, Rr, Rr * R(0.3, 0.8), rnd() < 0.5), 'donut'); }
    else if (k < 0.97 && font) {
      const size = R(5, 40), word = WORDS[Math.floor(rnd() * WORDS.length)];
      const gs = glyphShapes(font, word, x, y, size); const ok = gs.every((g) => fits(shapeBBox(g)));
      if (ok) for (const g of gs) { if (shapes.length < n) push(g, 'glyph'); }
    } else {
      const q = rnd();
      if (q < 0.4) { const r = R(2, 30), g = 0.001; push(circle(x, y, r), 'tangent'); push(circle(x + 2 * r + g, y, r), 'tangent'); }
      else if (q < 0.8) { const s = R(2, 40); push(roundRect(x, y, s, s, 0.0001, 0), 'coincident'); push(roundRect(x + s, y, s, s, 0.0001, 0), 'coincident'); }
      else push({ subs: [{ segs: [L(x, y, x + 0.01, y + 0.005)], closed: false }] }, 'tiny');
    }
  }
  const probes = probeShapes();
  for (const p of probes) { p.bb = shapeBBox(p); p.id = shapes.length; shapes.push(p); }
  return shapes;
}

export function sceneStats(shapes) {
  const kinds = {}; let segs = 0, L_ = 0, A_ = 0, C_ = 0;
  for (const s of shapes) { kinds[s.kind] = (kinds[s.kind] || 0) + 1; for (const sub of s.subs) for (const g of sub.segs) { segs++; if (g.t === 'L') L_++; else if (g.t === 'A') A_++; else C_++; } }
  return { shapes: shapes.length, segs, lines: L_, arcs: A_, cubics: C_, kinds };
}
