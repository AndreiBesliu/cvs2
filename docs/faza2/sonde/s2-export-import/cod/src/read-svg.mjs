// read-svg.mjs - cititor SVG: XML prin DOMParser (@xmldom/xmldom in Node, nativ in browser), date de cale si
// transformari prin svgpath (MIT; transforma si arcele EXACT, recalculand elipsa). Iesire: mm, Y in sus.
import { DOMParser } from '@xmldom/xmldom';
import svgpath from 'svgpath';
import { TAU, line, arc, earc, cubic, quadToCubic } from './geom.mjs';
import { mergeArcs } from './read-dxf.mjs';

const UNIT = { mm: 1, cm: 10, in: 25.4, pt: 25.4 / 72, pc: 25.4 / 6, px: 25.4 / 96, '': 25.4 / 96 };
function len(v) { const m = /^\s*([-+]?[\d.]+(?:e[-+]?\d+)?)\s*([a-z%]*)\s*$/i.exec(v || ''); if (!m) return null; if (m[2] === '%') return null; return parseFloat(m[1]) * (UNIT[m[2]] ?? NaN); }
const num = (el, a, d = 0) => { const v = el.getAttribute(a); return v === '' || v == null ? d : parseFloat(v); };

export function readSvg(text) {
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  const root = doc.documentElement;
  const warn = {}; const W = (k) => { warn[k] = (warn[k] || 0) + 1; };
  const vb = (root.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
  let wmm = len(root.getAttribute('width')), hmm = len(root.getAttribute('height'));
  let sx, sy, vx = 0, vy = 0;
  if (vb.length === 4 && vb.every(Number.isFinite)) {
    [vx, vy] = vb;
    if (wmm == null) wmm = vb[2] * UNIT.px; if (hmm == null) hmm = vb[3] * UNIT.px;
    sx = wmm / vb[2]; sy = hmm / vb[3];
    const par = root.getAttribute('preserveAspectRatio') || '';
    if (Math.abs(sx - sy) > 1e-12 * sx && !/none/.test(par)) { W('viewBox neuniform cu preserveAspectRatio implicit: folosesc scara minima, aliniere xMidYMid'); const s = Math.min(sx, sy); vx -= (wmm / s - vb[2]) / 2; vy -= (hmm / s - vb[3]) / 2; sx = sy = s; }
  } else { sx = sy = UNIT.px; if (wmm == null || hmm == null) W('fara width/height/viewBox'); }
  // radacina: unitati utilizator -> mm, cu Y intors (Y in sus)
  const rootT = `matrix(${sx} 0 0 ${-sy} ${-sx * vx} ${hmm + sy * vy})`;
  const shapes = [], layers = new Set();
  const walk = (el, tStack, layer) => {
    for (let n = el.firstChild; n; n = n.nextSibling) {
      if (n.nodeType !== 1) continue;
      const tag = n.localName;
      const t = n.getAttribute('transform');
      const stack = t ? [t, ...tStack] : tStack;
      let lay = layer;
      if (tag === 'g') {
        const gm = n.getAttributeNS('http://www.inkscape.org/namespaces/inkscape', 'groupmode');
        if (gm === 'layer') { lay = n.getAttributeNS('http://www.inkscape.org/namespaces/inkscape', 'label') || n.getAttribute('id'); layers.add(lay); }
        walk(n, stack, lay); continue;
      }
      if (['defs', 'clipPath', 'mask', 'marker', 'symbol', 'pattern', 'style', 'title', 'desc', 'metadata'].includes(tag)) continue;
      if (tag === 'use') { W('<use> nesuportat in sonda'); continue; }
      if (tag === 'text') { W('<text> sarit (cere fontul)'); continue; }
      const d = toPathData(n, tag);
      if (d == null) { W(`<${tag}> sarit`); continue; }
      let P = svgpath(d);
      for (const tr of stack) P = P.transform(tr); // cel mai interior intai
      P = P.transform(rootT).abs().unshort();
      shapes.push(...fromSvgpath(P, lay || 'SVG', tag));
    }
  };
  walk(root, [], null);
  return { shapes, layers: [...layers], units: { wmm, hmm, sx, sy }, warnings: warn };
}

function toPathData(n, tag) {
  const f = (a, d) => num(n, a, d);
  switch (tag) {
    case 'path': return n.getAttribute('d');
    case 'line': return `M${f('x1')} ${f('y1')}L${f('x2')} ${f('y2')}`;
    case 'polyline': case 'polygon': { const p = (n.getAttribute('points') || '').trim().split(/[\s,]+/).map(Number); if (p.length < 4) return null; let d = `M${p[0]} ${p[1]}`; for (let i = 2; i + 1 < p.length; i += 2) d += `L${p[i]} ${p[i + 1]}`; return tag === 'polygon' ? d + 'Z' : d; }
    case 'circle': case 'ellipse': {
      const cx = f('cx'), cy = f('cy'), rx = tag === 'circle' ? f('r') : f('rx'), ry = tag === 'circle' ? f('r') : f('ry');
      // patru sferturi: comanda A la 180 de grade e prost conditionata (vezi scriitorul)
      return `M${cx + rx} ${cy}A${rx} ${ry} 0 0 1 ${cx} ${cy + ry}A${rx} ${ry} 0 0 1 ${cx - rx} ${cy}A${rx} ${ry} 0 0 1 ${cx} ${cy - ry}A${rx} ${ry} 0 0 1 ${cx + rx} ${cy}Z`;
    }
    case 'rect': {
      const x = f('x'), y = f('y'), w = f('width'), h = f('height');
      let rx = n.hasAttribute('rx') ? f('rx') : null, ry = n.hasAttribute('ry') ? f('ry') : null;
      if (rx == null) rx = ry ?? 0; if (ry == null) ry = rx; rx = Math.min(rx, w / 2); ry = Math.min(ry, h / 2);
      if (!rx || !ry) return `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
      return `M${x + rx} ${y}H${x + w - rx}A${rx} ${ry} 0 0 1 ${x + w} ${y + ry}V${y + h - ry}A${rx} ${ry} 0 0 1 ${x + w - rx} ${y + h}H${x + rx}A${rx} ${ry} 0 0 1 ${x} ${y + h - ry}V${y + ry}A${rx} ${ry} 0 0 1 ${x + rx} ${y}Z`;
    }
  }
  return null;
}

function fromSvgpath(P, layer, tag) {
  const subpaths = []; let cur = null, pen = [0, 0], start = [0, 0];
  P.iterate((s, idx, x, y) => {
    const c = s[0];
    if (c === 'M') { if (cur && cur.segs.length) subpaths.push(cur); cur = { segs: [], closed: false }; pen = [s[1], s[2]]; start = pen; return; }
    if (!cur) cur = { segs: [], closed: false };
    if (c === 'L') { const q = [s[1], s[2]]; cur.segs.push(line(pen, q)); pen = q; }
    else if (c === 'H') { const q = [s[1], pen[1]]; cur.segs.push(line(pen, q)); pen = q; }
    else if (c === 'V') { const q = [pen[0], s[1]]; cur.segs.push(line(pen, q)); pen = q; }
    else if (c === 'C') { const q = [s[5], s[6]]; cur.segs.push(cubic(pen, [s[1], s[2]], [s[3], s[4]], q)); pen = q; }
    else if (c === 'Q') { const q = [s[3], s[4]]; cur.segs.push(quadToCubic(pen, [s[1], s[2]], q)); pen = q; }
    // ATENTIE (masurat): dupa o transformare care oglindeste, svgpath scrie sweep-flag ca SIR ('0'/'1'), iar '0' e
    // "adevarat" in JS. Fara Number() fiecare arc ia centrul gresit (cercul devine 4 sferturi concave).
    else if (c === 'A') { const q = [s[6], s[7]]; const a = arcFromEndpoints(pen, +s[1], +s[2], +s[3], Number(s[4]), Number(s[5]), q); if (a) cur.segs.push(a); pen = q; }
    else if (c === 'Z' || c === 'z') { if (Math.hypot(pen[0] - start[0], pen[1] - start[1]) > 1e-12) cur.segs.push(line(pen, start)); cur.closed = true; pen = start; }
  });
  if (cur && cur.segs.length) subpaths.push(cur);
  return subpaths.map((sp) => ({ name: tag, layer, subpaths: [{ ...sp, segs: mergeArcs(sp.segs) }] }));
}

// SVG F.6.5: capete -> centru. Coordonatele sunt deja in mm cu Y in sus (svgpath a aplicat matricea cu Y intors),
// deci sweep-flag=1 inseamna acum sens CCW (unghi crescator) in sistemul cu Y in sus? Nu: svgpath pastreaza
// semantica SVG (unghi crescator in sistemul curent). Folosim formula standard in sistemul curent.
function arcFromEndpoints(p0, rx, ry, phiDeg, fa, fs, p1) {
  if (p0[0] === p1[0] && p0[1] === p1[1]) return null;
  rx = Math.abs(rx); ry = Math.abs(ry);
  if (!rx || !ry) return line(p0, p1);
  const phi = (phiDeg * Math.PI) / 180, c = Math.cos(phi), s = Math.sin(phi);
  const dx = (p0[0] - p1[0]) / 2, dy = (p0[1] - p1[1]) / 2;
  const x1 = c * dx + s * dy, y1 = -s * dx + c * dy;
  const lam = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry);
  if (lam > 1) { const k = Math.sqrt(lam); rx *= k; ry *= k; }
  const num = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1, den = rx * rx * y1 * y1 + ry * ry * x1 * x1;
  let co = Math.sqrt(Math.max(0, num / den)); if (fa === fs) co = -co;
  const cxp = (co * rx * y1) / ry, cyp = (-co * ry * x1) / rx;
  const cx = c * cxp - s * cyp + (p0[0] + p1[0]) / 2, cy = s * cxp + c * cyp + (p0[1] + p1[1]) / 2;
  const ang = (ux, uy, vx, vy) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  const t0 = ang(1, 0, (x1 - cxp) / rx, (y1 - cyp) / ry);
  let dt = ang((x1 - cxp) / rx, (y1 - cyp) / ry, (-x1 - cxp) / rx, (-y1 - cyp) / ry);
  if (!fs && dt > 0) dt -= TAU; else if (fs && dt < 0) dt += TAU;
  if (Math.abs(rx - ry) <= 1e-12 * rx) return arc([cx, cy], rx, phi + t0, dt);
  if (ry > rx) return earc([cx, cy], ry, rx, phi + Math.PI / 2, t0 - Math.PI / 2, dt); // forma canonica: rx >= ry
  return earc([cx, cy], rx, ry, phi, t0, dt);
}
