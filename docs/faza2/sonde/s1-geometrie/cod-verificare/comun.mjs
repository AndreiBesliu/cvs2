// Utilitare comune pentru verificarea v1: glife din fonturile Windows, orientare, conversie spre/dinspre cavalier.
// Codul TESTAT e cel din sonda s1 (geom.mjs: fitter-ul de biarce) + cavalier-contours-js; oracolul e oracol-v1.mjs.
import fs from 'node:fs';
import * as cc from 'cavalier-contours-js';
import { contourToLA } from '../geom.mjs';
import { area, flat, insideEO, plineToSegs, P } from './oracol-v1.mjs';

const otm = await import('opentype.js');
const ot = otm.default || otm;
const fontCache = new Map();
export function loadFont(file) {
  if (!fontCache.has(file)) { const b = fs.readFileSync(file); fontCache.set(file, ot.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength))); }
  return fontCache.get(file);
}
// glifa scalata la INALTIMEA H (caseta glifei), coltul stanga-jos in (ox, oy); segmente L/Q (TrueType), y in sus
export function glyph(file, ch, H, ox = 0, oy = 0) {
  const font = loadFont(file);
  const p = font.getPath(ch, 0, 0, 1000);
  const raw = []; let cur = null, px = 0, py = 0, sx = 0, sy = 0;
  for (const c of p.commands) {
    if (c.type === 'M') { if (cur && cur.segs.length) raw.push(cur); cur = { closed: true, segs: [] }; px = sx = c.x; py = sy = -c.y; }
    else if (c.type === 'L') { cur.segs.push({ k: 'L', x0: px, y0: py, x1: c.x, y1: -c.y }); px = c.x; py = -c.y; }
    else if (c.type === 'Q') { cur.segs.push({ k: 'Q', x0: px, y0: py, x1: c.x1, y1: -c.y1, x2: c.x, y2: -c.y }); px = c.x; py = -c.y; }
    else if (c.type === 'C') { cur.segs.push({ k: 'C', x0: px, y0: py, x1: c.x1, y1: -c.y1, x2: c.x2, y2: -c.y2, x3: c.x, y3: -c.y }); px = c.x; py = -c.y; }
    else if (c.type === 'Z') { if (Math.hypot(px - sx, py - sy) > 0) cur.segs.push({ k: 'L', x0: px, y0: py, x1: sx, y1: sy }); px = sx; py = sy; }
  }
  if (cur && cur.segs.length) raw.push(cur);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const Pl of flat(raw, 1)) for (const q of Pl) { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); }
  const k = H / (y1 - y0);
  const T = (x, y) => [ox + (x - x0) * k, oy + (y - y0) * k];
  return raw.map((c) => ({ closed: true, segs: c.segs.map((s) => {
    const o = { k: s.k };
    const pts = s.k === 'L' ? [[s.x0, s.y0], [s.x1, s.y1]] : s.k === 'Q' ? [[s.x0, s.y0], [s.x1, s.y1], [s.x2, s.y2]] : [[s.x0, s.y0], [s.x1, s.y1], [s.x2, s.y2], [s.x3, s.y3]];
    pts.forEach((q, i) => { const t = T(q[0], q[1]); o['x' + i] = t[0]; o['y' + i] = t[1]; });
    return o;
  }) }));
}
export function reverseSegs(c) {
  return { closed: c.closed, segs: c.segs.slice().reverse().map((s) => {
    if (s.k === 'L') return { k: 'L', x0: s.x1, y0: s.y1, x1: s.x0, y1: s.y0 };
    if (s.k === 'A') return { k: 'A', cx: s.cx, cy: s.cy, r: s.r, a0: s.a0 + s.da, da: -s.da };
    if (s.k === 'Q') return { k: 'Q', x0: s.x2, y0: s.y2, x1: s.x1, y1: s.y1, x2: s.x0, y2: s.y0 };
    return { k: 'C', x0: s.x3, y0: s.y3, x1: s.x2, y1: s.y2, x2: s.x1, y2: s.y1, x3: s.x0, y3: s.y0 };
  }) };
}
// orientare dupa adancimea de includere: adancime para = CCW (plin), impara = CW (gaura)
export function orientByDepth(region) {
  const polys = flat(region, 0.05);
  return region.map((c, i) => {
    const p = polys[i][0]; let depth = 0;
    polys.forEach((Q, j) => { if (j !== i && insideEO([Q], p[0], p[1])) depth++; });
    const ccw = depth % 2 === 0;
    return (area([c]) > 0) === ccw ? c : reverseSegs(c);
  });
}
// regiune L/A -> polilinii cavalier (bulge = tan(da/4))
export function toPlines(regionLA) {
  return regionLA.map((c) => {
    const v = c.segs.map((s) => s.k === 'A' ? [s.cx + s.r * Math.cos(s.a0), s.cy + s.r * Math.sin(s.a0), Math.tan(s.da / 4)] : [s.x0, s.y0, 0]);
    if (!c.closed) { const e = P(c.segs[c.segs.length - 1], 1); v.push([e[0], e[1], 0]); }
    return c.closed ? cc.plineClosed(v) : cc.plineOpen(v);
  });
}
export function fromPline(pl) {
  const verts = []; for (let i = 0; i < pl.vertexCount; i++) { const v = pl.at(i); verts.push({ x: v.x, y: v.y, bulge: v.bulge }); }
  return plineToSegs(verts, pl.isClosed);
}
// pipeline-ul recomandat de s1: curbe -> biarce proprii (tol) -> orientare -> Shape cavalier
export function shapeFromRegion(region, tolFit) {
  const la = orientByDepth(region).map((c) => contourToLA(c, tolFit));
  return cc.Shape.fromPlines(toPlines(la));
}
export function shapeOut(sh) {
  return { ccw: sh.ccwPlines.map((p) => fromPline(p.polyline)), cw: sh.cwPlines.map((p) => fromPline(p.polyline)) };
}
export { cc };
export function median(a) { const b = a.slice().sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; }
export const fmt = (v, d = 3) => (v === null || v === undefined) ? '-' : (typeof v !== 'number' ? String(v) : (v === 0 ? '0' : (!Number.isFinite(v) ? String(v) : (Math.abs(v) < 1e-3 || Math.abs(v) >= 1e5 ? v.toExponential(2) : v.toFixed(d)))));
