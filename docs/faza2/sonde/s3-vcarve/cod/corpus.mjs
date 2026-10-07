// CORPUSUL (date de intrare, citite si de generator, si de oracol). Unitati: mm, y in sus.
// Curbe: {k:'L',p0,p1} | {k:'A',c,r,a0,a1} (a1>a0 = trigonometric) | {k:'Q',p0,p1,p2} | {k:'C',p0,p1,p2,p3}
import opentype from 'opentype.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const HERE = dirname(fileURLToPath(import.meta.url));

const poly = (pts) => pts.map((p, i) => ({ k: 'L', p0: p, p1: pts[(i + 1) % pts.length] }));
const rect = (x, y, w, h, ccw = true) => { const p = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]; return poly(ccw ? p : p.reverse()); };
const circle = (cx, cy, r, ccw = true) => { const s = ccw ? 1 : -1; return [0, 1, 2, 3].map((i) => ({ k: 'A', c: [cx, cy], r, a0: s * i * Math.PI / 2, a1: s * (i + 1) * Math.PI / 2 })); };
function roundedRect(x, y, w, h, rc) {
  const P = Math.PI;
  return [
    { k: 'L', p0: [x + rc, y], p1: [x + w - rc, y] }, { k: 'A', c: [x + w - rc, y + rc], r: rc, a0: -P / 2, a1: 0 },
    { k: 'L', p0: [x + w, y + rc], p1: [x + w, y + h - rc] }, { k: 'A', c: [x + w - rc, y + h - rc], r: rc, a0: 0, a1: P / 2 },
    { k: 'L', p0: [x + w - rc, y + h], p1: [x + rc, y + h] }, { k: 'A', c: [x + rc, y + h - rc], r: rc, a0: P / 2, a1: P },
    { k: 'L', p0: [x, y + h - rc], p1: [x, y + rc] }, { k: 'A', c: [x + rc, y + rc], r: rc, a0: P, a1: 3 * P / 2 },
  ];
}
// stea cu n varfuri si unghiul la varf `tipDeg`; raza interioara gasita prin bisectie
function starPts(cx, cy, n, R, tipDeg) {
  const ang = (ri) => { const v = [0, R], a = Math.PI / 2 + Math.PI / n; const i1 = [ri * Math.cos(a) - 0, ri * Math.sin(a)], i2 = [-i1[0], i1[1]];
    const u = [i1[0] - v[0], i1[1] - v[1]], w = [i2[0] - v[0], i2[1] - v[1]]; return Math.acos((u[0] * w[0] + u[1] * w[1]) / Math.hypot(...u) / Math.hypot(...w)) * 180 / Math.PI; };
  let lo = 0.01 * R, hi = 0.99 * R; for (let i = 0; i < 100; i++) { const m = (lo + hi) / 2; if (ang(m) < tipDeg) lo = m; else hi = m; }
  const ri = (lo + hi) / 2; const pts = [];
  for (let i = 0; i < n; i++) { const a = Math.PI / 2 + i * 2 * Math.PI / n; pts.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]); const b = a + Math.PI / n; pts.push([cx + ri * Math.cos(b), cy + ri * Math.sin(b)]); }
  return { pts, ri };
}

const fonts = {};
function font(name) {
  if (!fonts[name]) {
    const f = { robotoV2: join(HERE, 'fonts/Roboto-Regular-v2.ttf'), robotoV3: join(HERE, 'node_modules/@expo-google-fonts/roboto/400Regular/Roboto_400Regular.ttf'), garamond: join(HERE, 'node_modules/@expo-google-fonts/eb-garamond/400Regular/EBGaramond_400Regular.ttf') }[name];
    const b = readFileSync(f); fonts[name] = opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
  }
  return fonts[name];
}
// text -> bucle (y in sus). `cap` = inaltimea majusculelor in mm. Coltul stanga-jos al casetei la (x,y).
export function textLoops(fontName, str, cap, x, y) {
  const F = font(fontName); const em = cap / (F.tables.os2.sCapHeight / F.unitsPerEm);
  // asezare manuala, glif cu glif (opentype.js 2.0 arunca la shaping-ul GSUB din EB Garamond)
  const cmds = []; let pen = 0, prev = null;
  for (const ch of str) { const gl = F.charToGlyph(ch); if (prev) pen += F.getKerningValue(prev, gl) * em / F.unitsPerEm;
    cmds.push(...gl.getPath(pen, 0, em).commands); pen += gl.advanceWidth * em / F.unitsPerEm; prev = gl; }
  const loops = []; let cur = null, start = null, last = null;
  const P = (px, py) => [px, -py];
  for (const c of cmds) {
    if (c.type === 'M') { if (cur && cur.length) loops.push(cur); cur = []; start = last = P(c.x, c.y); }
    else if (c.type === 'L') { const p = P(c.x, c.y); if (Math.hypot(p[0] - last[0], p[1] - last[1]) > 1e-12) cur.push({ k: 'L', p0: last, p1: p }); last = p; }
    else if (c.type === 'Q') { const p = P(c.x, c.y); cur.push({ k: 'Q', p0: last, p1: P(c.x1, c.y1), p2: p }); last = p; }
    else if (c.type === 'C') { const p = P(c.x, c.y); cur.push({ k: 'C', p0: last, p1: P(c.x1, c.y1), p2: P(c.x2, c.y2), p3: p }); last = p; }
    else if (c.type === 'Z') { if (Math.hypot(start[0] - last[0], start[1] - last[1]) > 1e-12) cur.push({ k: 'L', p0: last, p1: start }); loops.push(cur); cur = null; last = start; }
  }
  if (cur && cur.length) loops.push(cur);
  // translatie
  let mx = Infinity, my = Infinity; for (const l of loops) for (const c of l) for (const p of [c.p0, c.p1, c.p2, c.p3].filter(Boolean)) { mx = Math.min(mx, p[0]); my = Math.min(my, p[1]); }
  const T = (p) => [p[0] - mx + x, p[1] - my + y];
  return loops.map((l) => l.map((c) => { const o = { k: c.k }; for (const key of ['p0', 'p1', 'p2', 'p3']) if (c[key]) o[key] = T(c[key]); return o; }));
}

const T30 = Math.tan(Math.PI / 6), T45 = 1;
const V60 = 60, V90 = 90;
const FLAT = { R: 1.5875, step: 0.4 }; // freza dreapta 1/8", pas lateral 40 % din diametru

export function corpus() {
  const C = [];
  // 1. dreptunghi 12x6, freza 90: creasta la (H/2)/tan45 = 3,000
  C.push({ name: 'dreptunghi_12x6', loops: [rect(0, 0, 12, 6)], fill: 'evenodd', theta: V90, D: 50, dpp: 1, flat: null, g: 0.005,
    paper: [{ p: [6, 3], z: -3, ce: 'creasta (H/2)/tan45' }, { p: [4.5, 3], z: -3, ce: 'creasta' }, { p: [0, 0], z: 0, ce: 'colt convex' }, { p: [1, 1], z: -1, ce: 'bisectoare d=1' }] });
  // 2. cerc r=2,5, freza 60: centrul la r/tan30 = 4,330
  C.push({ name: 'cerc_r2.5', loops: [circle(5, 5, 2.5)], fill: 'evenodd', theta: V60, D: 50, dpp: 1, flat: null, g: 0.005,
    paper: [{ p: [5, 5], z: -2.5 / T30, ce: 'centru r/tan30' }, { p: [6, 5], z: -1.5 / T30, ce: 'la 1 mm de centru' }] });
  // 3. triunghi echilateral latura 10, freza 90: centrul la raza inscrisa 10/(2*sqrt3) = 2,887
  { const s = 10, h = s * Math.sqrt(3) / 2; C.push({ name: 'triunghi_echilateral_10', loops: [poly([[0, 0], [s, 0], [s / 2, h]])], fill: 'evenodd', theta: V90, D: 50, dpp: 1, flat: null, g: 0.005,
    paper: [{ p: [s / 2, h / 3], z: -s / (2 * Math.sqrt(3)), ce: 'incentru: raza inscrisa' }, { p: [s / 2, h], z: 0, ce: 'varf' }, { p: [0, 0], z: 0, ce: 'colt' }] }); }
  // 4. stea cu 5 varfuri de 30 grade, R=10, freza 60
  { const { pts, ri } = starPts(10, 10, 5, 10, 30); // distanta de la centru la latura: latura V0-I0
    // distanta de la centru la SEGMENTUL V0-I0 (proiectia limitata la segment); la stea, piciorul perpendicularei
    // cade dincolo de I0 (varf reflex), deci distanta e chiar ri
    const v = pts[0], i0 = pts[1]; const dx = i0[0] - v[0], dy = i0[1] - v[1];
    const tt = Math.max(0, Math.min(1, ((10 - v[0]) * dx + (10 - v[1]) * dy) / (dx * dx + dy * dy)));
    const dc = Math.hypot(v[0] + tt * dx - 10, v[1] + tt * dy - 10);
    C.push({ name: 'stea_5x30grd', loops: [poly(pts)], fill: 'evenodd', theta: V60, D: 50, dpp: 1, flat: null, g: 0.005, meta: { ri, dc },
      paper: [{ p: [10, 10], z: -dc / T30, ce: 'centru: distanta la latura / tan30' }, { p: v, z: 0, ce: 'varf de 30 grd' }] }); }
  // 5. inel R 10 / 6, freza 90: axa e cercul r=8, adancime constanta 2,000 (arc G2/G3 la Z fix)
  C.push({ name: 'inel_10_6', loops: [circle(12, 12, 10), circle(12, 12, 6, false)], fill: 'evenodd', theta: V90, D: 50, dpp: 1, flat: null, g: 0.01,
    paper: [{ p: [20, 12], z: -2, ce: 'axa: (R-r)/2 / tan45' }, { p: [12, 12], z: 0, ce: 'gaura: netaiat' }] });
  // 6. dreptunghi rotunjit 30x16 r4, freza 60, limita D=3 => fund plat cu freza dreapta
  C.push({ name: 'drept_rotunjit_fund_plat', loops: [roundedRect(0, 0, 30, 16, 4)], fill: 'evenodd', theta: V60, D: 3, dpp: 1, flat: FLAT, g: 0.01,
    paper: [{ p: [15, 8], z: -3, ce: 'fund plat la D' }, { p: [15, 1], z: -1 / T30, ce: 'perete: d=1 / tan30' }] });
  // 7. inima din cubice, cu gaura circulara (arce), freza 60
  { const heart = [
      { k: 'C', p0: [10, 3], p1: [4, 8], p2: [0, 12], p3: [3, 17] }, { k: 'C', p0: [3, 17], p1: [6, 21], p2: [9.5, 19], p3: [10, 15.5] },
      { k: 'C', p0: [10, 15.5], p1: [10.5, 19], p2: [14, 21], p3: [17, 17] }, { k: 'C', p0: [17, 17], p1: [20, 12], p2: [16, 8], p3: [10, 3] } ];
    C.push({ name: 'inima_cubice_cu_gaura', loops: [heart, circle(10, 12, 1.5, false)], fill: 'evenodd', theta: V60, D: 50, dpp: 1, flat: null, g: 0.01, paper: [{ p: [10, 3], z: 0, ce: 'varful de jos' }] }); }
  // 8. litere Roboto v2 cu gauri, 20 mm
  C.push({ name: 'litere_roboto_B8gR&_20mm', loops: textLoops('robotoV2', 'B8gR&', 20, 0, 0), fill: 'nonzero', theta: V60, D: 50, dpp: 1, flat: null, g: 0.01, paper: [] });
  // 9. litere Roboto v3 (contururi SUPRAPUSE in glife), nonzero
  C.push({ name: 'litere_roboto_v3_suprapuse_ABRg', loops: textLoops('robotoV3', 'ABRg', 20, 0, 0), fill: 'nonzero', theta: V60, D: 50, dpp: 1, flat: null, g: 0.01, paper: [] });
  // 10. EB Garamond (serife), 20 mm
  C.push({ name: 'garamond_Qg&_20mm', loops: textLoops('garamond', 'Qg&', 20, 0, 0), fill: 'nonzero', theta: V60, D: 50, dpp: 1, flat: null, g: 0.01, paper: [] });
  // 11. detalii de 0,01 mm: dinte de 0,01 pe latura unui patrat; doua patrate la 0,01 mm (perete subtire de material pastrat)
  C.push({ name: 'dinte_0.01mm', loops: [poly([[0, 0], [5, 0], [5, -0.01], [5.01, -0.01], [5.01, 0], [10, 0], [10, 10], [0, 10]])], fill: 'evenodd', theta: V90, D: 50, dpp: 1, flat: null, g: 0.005,
    paper: [{ p: [5, 5], z: -5, ce: 'centrul patratului 10' }, { p: [5.005, -0.005], z: -0.005, ce: 'mijlocul dintelui: 0,005' }] });
  C.push({ name: 'perete_0.01mm_intre_patrate', loops: [rect(0, 0, 5, 5), rect(5.01, 0, 5, 5)], fill: 'evenodd', theta: V60, D: 50, dpp: 1, flat: null, g: 0.0025,
    paper: [{ p: [5.005, 2.5], z: 0, ce: 'peretele de 0,01 ramane' }, { p: [2.5, 2.5], z: -2.5 / T30, ce: 'centru' }] });
  // 12. firma 300x100 cu ~20 de caractere, D=3 cu freza dreapta
  C.push({ name: 'firma_300x100', loops: [...textLoops('robotoV2', 'MESTERUL', 30, 10, 58), ...textLoops('robotoV2', 'MANOLE 1920', 30, 10, 12)], fill: 'nonzero', theta: V60, D: 3, dpp: 1, flat: FLAT, g: 0.04, paper: [] });
  // 13. placuta de 3 randuri, Roboto v2, 6 mm (reperul vechi: 161 842 de linii)
  { const rows = ['Casa memoriala Mesterul Manole', 'Muzeul lemnului, Curtea de Arges', 'Deschis zilnic intre orele 9 si 17'];
    const L = []; rows.forEach((r, i) => L.push(...textLoops('robotoV2', r, 6, 20, 20 - i * 6 * 1.7)));
    C.push({ name: 'placuta_6mm_3randuri', loops: L, fill: 'nonzero', theta: V60, D: 3, dpp: 1, flat: null, g: 0.01, paper: [] }); }
  // 13b. incrustatie, MASCULUL: aceeasi masinarie pe regiunea complementara (dreptunghi limita minus forma oglindita),
  // cu limita de adancime = inaltimea dopului si freza dreapta pe fundul din jur
  { const B = textLoops('robotoV2', 'B', 20, 3, 3).map((l) => l.map((c) => { const o = { k: c.k }; for (const key of ['p0', 'p1', 'p2', 'p3']) if (c[key]) o[key] = [40 - c[key][0], c[key][1]]; return o; }));
    let mx = Infinity, Mx = -Infinity; for (const l of B) for (const c of l) for (const p of [c.p0, c.p1, c.p2, c.p3].filter(Boolean)) { mx = Math.min(mx, p[0]); Mx = Math.max(Mx, p[0]); }
    C.push({ name: 'incrustatie_mascul_B', loops: [rect(mx - 4, 0, Mx - mx + 8, 29), ...B], fill: 'evenodd', theta: V60, D: 2.5, dpp: 1, flat: FLAT, g: 0.02, paper: [] }); }
  // 14. canal 2440 x 8 departe de origine (numere mari), D=3, freza dreapta
  C.push({ name: 'canal_2440x8', loops: [rect(0, 1200, 2440, 8)], fill: 'evenodd', theta: V60, D: 3, dpp: 1, flat: FLAT, g: 0.05,
    paper: [{ p: [1220, 1204], z: -3, ce: 'fund plat' }, { p: [1220, 1201], z: -1 / T30, ce: 'perete d=1' }, { p: [0, 1200], z: 0, ce: 'colt' }] });
  return C;
}
