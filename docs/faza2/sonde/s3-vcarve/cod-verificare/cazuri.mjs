// v2-vcarve: cazurile ADVERSARIALE noi (nu sunt in corpusul sondei s3). Unitati mm, y in sus.
// Curbe: {k:'L',p0,p1} | {k:'A',c,r,a0,a1} (a1>a0 = trigonometric, a1<a0 = orar) | {k:'Q',...} | {k:'C',...}
import opentype from 'opentype.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const HERE = dirname(fileURLToPath(import.meta.url));

export const poly = (pts) => pts.map((p, i) => ({ k: 'L', p0: p, p1: pts[(i + 1) % pts.length] }));
export const rect = (x, y, w, h, ccw = true) => { const p = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]; return poly(ccw ? p : p.reverse()); };
export const circle = (cx, cy, r, ccw = true) => { const s = ccw ? 1 : -1; return [0, 1, 2, 3].map((i) => ({ k: 'A', c: [cx, cy], r, a0: s * i * Math.PI / 2, a1: s * (i + 1) * Math.PI / 2 })); };
const D2R = Math.PI / 180;
const at = (c, r, a) => [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)];

const FONTS = {
  robotoV2: join(HERE, 'fonts/Roboto-Regular-v2.ttf'),
  segoeScript: 'C:/Windows/Fonts/segoesc.ttf',
  vivaldi: 'C:/Windows/Fonts/VIVALDII.TTF',
  kunstler: 'C:/Windows/Fonts/KUNSTLER.TTF',
  gabriola: 'C:/Windows/Fonts/Gabriola.ttf',
  brush: 'C:/Windows/Fonts/BRUSHSCI.TTF',
};
const fcache = {};
export function font(name) { if (!fcache[name]) { const b = readFileSync(FONTS[name]); fcache[name] = opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); } return fcache[name]; }
// text -> bucle (aceeasi asezare ca sonda: glif cu glif + kerning; cap = inaltimea majusculelor in mm)
export function textLoops(fontName, str, cap, x, y) {
  const F = font(fontName); const capU = (F.tables.os2 && F.tables.os2.sCapHeight) || F.charToGlyph('H').getBoundingBox().y2; const em = cap / (capU / F.unitsPerEm);
  const cmds = []; let pen = 0, prev = null;
  for (const ch of str) { const gl = F.charToGlyph(ch); if (prev) pen += F.getKerningValue(prev, gl) * em / F.unitsPerEm; cmds.push(...gl.getPath(pen, 0, em).commands); pen += gl.advanceWidth * em / F.unitsPerEm; prev = gl; }
  const loops = []; let cur = null, start = null, last = null; const P = (px, py) => [px, -py];
  for (const c of cmds) {
    if (c.type === 'M') { if (cur && cur.length) loops.push(cur); cur = []; start = last = P(c.x, c.y); }
    else if (c.type === 'L') { const p = P(c.x, c.y); if (Math.hypot(p[0] - last[0], p[1] - last[1]) > 1e-12) cur.push({ k: 'L', p0: last, p1: p }); last = p; }
    else if (c.type === 'Q') { const p = P(c.x, c.y); cur.push({ k: 'Q', p0: last, p1: P(c.x1, c.y1), p2: p }); last = p; }
    else if (c.type === 'C') { const p = P(c.x, c.y); cur.push({ k: 'C', p0: last, p1: P(c.x1, c.y1), p2: P(c.x2, c.y2), p3: p }); last = p; }
    else if (c.type === 'Z') { if (cur && cur.length) { if (Math.hypot(start[0] - last[0], start[1] - last[1]) > 1e-12) cur.push({ k: 'L', p0: last, p1: start }); loops.push(cur); } cur = null; last = start; }
  }
  if (cur && cur.length) loops.push(cur);
  let mx = Infinity, my = Infinity; for (const l of loops) for (const c of l) for (const p of [c.p0, c.p1, c.p2, c.p3].filter(Boolean)) { mx = Math.min(mx, p[0]); my = Math.min(my, p[1]); }
  const T = (p) => [p[0] - mx + x, p[1] - my + y];
  return loops.filter((l) => l.length).map((l) => l.map((c) => { const o = { k: c.k }; for (const key of ['p0', 'p1', 'p2', 'p3']) if (c[key]) o[key] = T(c[key]); return o; }));
}

// (a) „C” = inel cu o fanta radiala de latime w (conturul aproape se atinge pe el insusi; O SINGURA bucla)
export function cSlotRound(cx, cy, Ro, Ri, w) {
  const ao = Math.asin(w / 2 / Ro), ai = Math.asin(w / 2 / Ri), c = [cx, cy];
  return [[
    { k: 'A', c, r: Ro, a0: ao, a1: 2 * Math.PI - ao },
    { k: 'L', p0: at(c, Ro, 2 * Math.PI - ao), p1: at(c, Ri, 2 * Math.PI - ai) },
    { k: 'A', c, r: Ri, a0: 2 * Math.PI - ai, a1: ai },
    { k: 'L', p0: at(c, Ri, ai), p1: at(c, Ro, ao) },
  ]];
}
// „C” patrat (doar linii): rama 20x20 cu gaura 12x12, fanta pe dreapta la y = 10
export function cSlotSquare(w) {
  const a = 10 + w / 2, b = 10 - w / 2;
  return [poly([[20, a], [20, 20], [0, 20], [0, 0], [20, 0], [20, b], [16, b], [16, 4], [4, 4], [4, 16], [16, 16], [16, a]])];
}
// (b) cerc taiat in doua de o curba S (cubica), fiecare jumatate e o bucla inchisa; muchia S e COMUNA
export function splitCircle(cx, cy, r, mode = 'exact') {
  const c = [cx, cy]; const A = [cx, cy - r], B = [cx, cy + r];
  const S = { k: 'C', p0: A, p1: [cx + 0.75 * r, cy - 0.375 * r], p2: [cx - 0.75 * r, cy + 0.375 * r], p3: B };
  const Srev = { k: 'C', p0: B, p1: S.p2, p2: S.p1, p3: A };
  const right = [{ k: 'A', c, r, a0: -Math.PI / 2, a1: Math.PI / 2 }, Srev];
  let leftEdge = [S];
  if (mode === 'polyline') { // copia „exportata de alt program”: polilinie cu sageata ~1 um in loc de cubica
    const ev = (t) => { const u = 1 - t; return [u * u * u * S.p0[0] + 3 * u * u * t * S.p1[0] + 3 * u * t * t * S.p2[0] + t * t * t * S.p3[0], u * u * u * S.p0[1] + 3 * u * u * t * S.p1[1] + 3 * u * t * t * S.p2[1] + t * t * t * S.p3[1]]; };
    const n = 120; const pts = []; for (let i = 0; i <= n; i++) pts.push(ev(i / n)); leftEdge = []; for (let i = 0; i < n; i++) leftEdge.push({ k: 'L', p0: pts[i], p1: pts[i + 1] });
  }
  const left = [{ k: 'A', c, r, a0: Math.PI / 2, a1: 3 * Math.PI / 2 }, ...leftEdge];
  return [right, left];
}
// (e) sector de inel, cu fete radiale
export function annulusSector(cx, cy, Ri, Ro, d0, d1) {
  const c = [cx, cy], a0 = d0 * D2R, a1 = d1 * D2R;
  return [[{ k: 'A', c, r: Ro, a0, a1 }, { k: 'L', p0: at(c, Ro, a1), p1: at(c, Ri, a1) }, { k: 'A', c, r: Ri, a0: a1, a1: a0 }, { k: 'L', p0: at(c, Ri, a0), p1: at(c, Ro, a0) }]];
}
// fanta dreapta cu capete rotunde (stadion): centrele capetelor la (x0,y0) si (x0+L,y0), raza w/2
export function stadium(x0, y0, L, w) {
  const r = w / 2, c0 = [x0, y0], c1 = [x0 + L, y0];
  return [[{ k: 'L', p0: [x0, y0 - r], p1: [x0 + L, y0 - r] }, { k: 'A', c: c1, r, a0: -Math.PI / 2, a1: Math.PI / 2 }, { k: 'L', p0: [x0 + L, y0 + r], p1: [x0, y0 + r] }, { k: 'A', c: c0, r, a0: Math.PI / 2, a1: 3 * Math.PI / 2 }]];
}
// fanta curba: linia mediana = arc de raza Rm intre d0 si d1, latime w, capete semicirculare
export function curvedSlot(cx, cy, Rm, w, d0, d1) {
  const c = [cx, cy], r = w / 2, a0 = d0 * D2R, a1 = d1 * D2R; const e0 = at(c, Rm, a0), e1 = at(c, Rm, a1);
  return [[{ k: 'A', c, r: Rm + r, a0, a1 }, { k: 'A', c: e1, r, a0: a1, a1: a1 + Math.PI }, { k: 'A', c, r: Rm - r, a0: a1, a1: a0 }, { k: 'A', c: e0, r, a0: a0 + Math.PI, a1: a0 + 2 * Math.PI }]];
}
