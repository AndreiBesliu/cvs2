// (d) Acelasi nucleu pentru desen si CAM: glifa -> biarce (o singura aproximare) -> offset EXACT cu raza sculei
// -> G-code cu G2/G3. Verificare cu un cititor de G-code independent (alt cod, nu importa geom/adaptoare pentru verificare).
import fs from 'node:fs';
import { contourToLA, flattenContour } from './geom.mjs';
import * as AD from './adaptoare.mjs';
import { densePolys, makeDistIndex, distTo } from './oracol.mjs';
import { normalize } from './robustete.mjs';

const otm = await import('opentype.js'); const ot = otm.default || otm;
const buf = fs.readFileSync(process.env.FONT_TTF || 'C:/Windows/Fonts/arial.ttf');
const font = ot.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));

function glyph(ch, size) {
  const out = []; let cur = null, px = 0, py = 0, sx = 0, sy = 0;
  for (const c of font.getPath(ch, 0, 0, size).commands) {
    if (c.type === 'M') { if (cur) out.push(cur); cur = { closed: true, segs: [] }; px = sx = c.x; py = sy = -c.y; }
    else if (c.type === 'L') { cur.segs.push({ k: 'L', x0: px, y0: py, x1: c.x, y1: -c.y }); px = c.x; py = -c.y; }
    else if (c.type === 'Q') { cur.segs.push({ k: 'Q', x0: px, y0: py, x1: c.x1, y1: -c.y1, x2: c.x, y2: -c.y }); px = c.x; py = -c.y; }
    else if (c.type === 'Z') { if (Math.hypot(px - sx, py - sy) > 1e-12) cur.segs.push({ k: 'L', x0: px, y0: py, x1: sx, y1: sy }); px = sx; py = sy; }
  }
  if (cur) out.push(cur);
  return out;
}

// emitent minimal: L -> G1, A -> G2 (CW) / G3 (CCW) cu I J relative
function emit(region) {
  const f = (v) => (Math.abs(v) < 5e-5 ? 0 : v).toFixed(4);
  const L = ['G21', 'G90', 'G17'];
  for (const c of region) {
    const s0 = c.segs[0]; const st = s0.k === 'L' ? [s0.x0, s0.y0] : [s0.cx + s0.r * Math.cos(s0.a0), s0.cy + s0.r * Math.sin(s0.a0)];
    L.push(`G0 X${f(st[0])} Y${f(st[1])}`, 'G1 Z-1 F300');
    let cx = st[0], cy = st[1];
    for (const s of c.segs) {
      if (s.k === 'L') { L.push(`G1 X${f(s.x1)} Y${f(s.y1)} F1500`); cx = s.x1; cy = s.y1; }
      else { const ex = s.cx + s.r * Math.cos(s.a0 + s.da), ey = s.cy + s.r * Math.sin(s.a0 + s.da); L.push(`${s.da < 0 ? 'G2' : 'G3'} X${f(ex)} Y${f(ey)} I${f(s.cx - cx)} J${f(s.cy - cy)}`); cx = ex; cy = ey; }
    }
    L.push('G0 Z5');
  }
  return L.join('\n');
}
function emitFlat(region, tol) {
  const L = ['G21', 'G90'];
  // aplatizare cu sageata <= tol (cum ar face un nucleu care poarta poligoane)
  for (const c of region) { const P = flattenContour(c, tol); L.push(`G0 X${P[0][0].toFixed(4)} Y${P[0][1].toFixed(4)}`); for (const p of P.slice(1)) L.push(`G1 X${p[0].toFixed(4)} Y${p[1].toFixed(4)}`); }
  return L.join('\n');
}

// cititor INDEPENDENT: parseaza textul, expandeaza arcele, verifica raza la capete ca GRBL (error:33)
function readGcode(text) {
  let x = 0, y = 0; const pts = []; let worstR = 0, nG1 = 0, nArc = 0;
  for (const line of text.split('\n')) {
    const w = {}; for (const m of line.matchAll(/([GXYZIJF])(-?\d+(?:\.\d+)?)/g)) w[m[1]] = parseFloat(m[2]);
    const g = w.G;
    const nx = w.X ?? x, ny = w.Y ?? y;
    if (g === 1) { nG1++; for (let i = 1; i <= 20; i++) pts.push([x + (nx - x) * i / 20, y + (ny - y) * i / 20]); }
    if (g === 2 || g === 3) {
      nArc++;
      const ccx = x + w.I, ccy = y + w.J, r0 = Math.hypot(x - ccx, y - ccy), r1 = Math.hypot(nx - ccx, ny - ccy);
      worstR = Math.max(worstR, Math.abs(r0 - r1));
      let a0 = Math.atan2(y - ccy, x - ccx), a1 = Math.atan2(ny - ccy, nx - ccx), da = a1 - a0;
      if (g === 3) { while (da <= 0) da += 2 * Math.PI; } else { while (da >= 0) da -= 2 * Math.PI; }
      const n = Math.max(8, Math.ceil(Math.abs(da) * r0 / 0.05));
      for (let i = 1; i <= n; i++) { const a = a0 + da * i / n; pts.push([ccx + r0 * Math.cos(a), ccy + r0 * Math.sin(a)]); }
    }
    if (g === 0 || g === 1 || g === 2 || g === 3) { x = nx; y = ny; }
  }
  return { pts, worstR, nG1, nArc };
}

export function demo({ ch = 'B', size = 100, tool = 3.175, tolFit = 0.002 } = {}) {
  const G = glyph(ch, size);
  const la = G.map((c) => contourToLA(c, tolFit));
  const inArce = la.reduce((s, c) => s + c.segs.length, 0), inQ = G.reduce((s, c) => s + c.segs.filter((q) => q.k === 'Q').length, 0);
  // orientare dupa adancimea de includere (exterior CCW, gauri CW), aceeasi regula ca in corpus
  const region = normalize(la);
  const off = AD.cavalier.offset(region, tool, { tolFit });
  const g = emit(off);
  const r = readGcode(g);
  // distanta fiecarui punct al traseului la frontiera glifei ORIGINALE (cu patratice): trebuie sa fie raza sculei
  const idx = makeDistIndex(densePolys(G, 0.002), 0.5);
  let dev = 0; for (const p of r.pts) dev = Math.max(dev, Math.abs(distTo(idx, p[0], p[1]) - tool));
  const flat = emitFlat(off, 0.01).split('\n').filter((l) => l.startsWith('G1')).length;
  const flatEq = emitFlat(off, tolFit).split('\n').filter((l) => l.startsWith('G1')).length;
  return { glifa: ch, inaltime_mm: size, raza_scula: tool, patraticeIntrare: inQ, arceDupaBiarc: inArce, liniiG1: r.nG1, liniiG2G3: r.nArc, eroareRazaMaxG2G3_mm: r.worstR, abatereTraseuFataDeRaza_mm: dev, liniiG1DacaSeAplatiza001: flat, liniiG1AplatizatLaAceeasiToleranta: flatEq, octetiGcode: g.length };
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || process.argv[1].endsWith('gcode-demo.mjs')) {
  for (const ch of ['B', '8', '&', '®']) console.log(JSON.stringify(demo({ ch })));
}
