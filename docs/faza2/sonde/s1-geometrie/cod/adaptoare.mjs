// Adaptoare: format neutru <-> fiecare biblioteca, plus offset / boolean.
// Conventia probei: d > 0 = offset IN AFARA; op in {union, inter, diff, xor}.
import { createRequire } from 'node:module';
import { segStart, arcToConics, arcToCubics, contourToLA, conicToArc, flattenContour, refitPolyline, reverseSeg, TAU } from './geom.mjs';
const require = createRequire(import.meta.url);

export class Nesuportat extends Error {}

export function reverseContour(c) { return { closed: c.closed, segs: c.segs.slice().reverse().map(reverseSeg) }; }
function signedArea(c) { // arie rapida pentru orientare (fara oracol: doar ca sa orientam iesirea)
  let A = 0; for (const s of c.segs) { const p = segStart(s); const q = s.k === 'L' ? [s.x1, s.y1] : s.k === 'A' ? [s.cx + s.r * Math.cos(s.a0 + s.da), s.cy + s.r * Math.sin(s.a0 + s.da)] : s.k === 'C' ? [s.x3, s.y3] : [s.x2, s.y2]; A += p[0] * q[1] - q[0] * p[1]; if (s.k === 'A') A += s.r * s.r * (s.da - Math.sin(s.da)); } return A / 2;
}
export function orient(c, ccw) { const a = signedArea(c); return (a > 0) === ccw ? c : reverseContour(c); }

// ================= cavalier-contours-js (linie + arc, bulge) =================
const cc = await import('cavalier-contours-js');
function toPline(c, tolFit) {
  const la = contourToLA(c, tolFit);
  const v = la.segs.map((s) => { const p = segStart(s); return [p[0], p[1], s.k === 'A' ? Math.tan(s.da / 4) : 0]; });
  if (!c.closed && la.segs.length) { const e = la.segs[la.segs.length - 1]; const p = e.k === 'L' ? [e.x1, e.y1] : [e.cx + e.r * Math.cos(e.a0 + e.da), e.cy + e.r * Math.sin(e.a0 + e.da)]; v.push([p[0], p[1], 0]); }
  return c.closed ? cc.plineClosed(v) : cc.plineOpen(v);
}
function fromPline(pl) {
  const n = pl.vertexCount;
  const closed = pl.isClosed;
  const segs = [];
  const cnt = closed ? n : n - 1;
  for (let i = 0; i < cnt; i++) {
    const a = pl.at(i), b = pl.at((i + 1) % n);
    if (Math.abs(a.bulge) < 1e-14) { segs.push({ k: 'L', x0: a.x, y0: a.y, x1: b.x, y1: b.y }); continue; }
    const bu = a.bulge, dx = b.x - a.x, dy = b.y - a.y;
    const kk = (1 - bu * bu) / (4 * bu);
    const cx = (a.x + b.x) / 2 - dy * kk, cy = (a.y + b.y) / 2 + dx * kk;
    segs.push({ k: 'A', cx, cy, r: Math.hypot(a.x - cx, a.y - cy), a0: Math.atan2(a.y - cy, a.x - cx), da: 4 * Math.atan(bu) });
  }
  return { closed, segs };
}
const OPS_CAV = { union: 'or', inter: 'and', diff: 'not', xor: 'xor' };
export const cavalier = {
  nume: 'cavalier-contours-js 0.1.1', licenta: 'MIT OR Apache-2.0',
  offset(region, d, opt = {}) {
    const tolFit = opt.tolFit ?? 0.001;
    if (region.length === 1 && !opt.forceShape) {
      const pl = toPline(orient(region[0], true), tolFit);
      if (!region[0].closed) return pl.parallelOffset(-d).map(fromPline);
      return pl.parallelOffset(-d).map(fromPline);
    }
    // forma cu gauri: contur exterior CCW, gauri CW (asa cere Shape)
    // regiunea vine orientata dupa adancime (exterior CCW, gauri CW), cum cere Shape
    const plines = region.map((c) => toPline(c, tolFit));
    const sh = cc.Shape.fromPlines(plines).parallelOffset(-d);
    return [...sh.ccwPlines.map((p) => fromPline(p.polyline)), ...sh.cwPlines.map((p) => fromPline(p.polyline))];
  },
  offsetOpen(contour, d, opt = {}) { const pl = toPline(contour, opt.tolFit ?? 0.001); return pl.parallelOffset(-d).map(fromPline); },
  bool(A, B, op, opt = {}) {
    if (A.length !== 1 || B.length !== 1) throw new Nesuportat('cavalier: boolean doar intre 2 polilinii simple (fara gauri)');
    const a = toPline(orient(A[0], true), opt.tolFit ?? 0.001), b = toPline(orient(B[0], true), opt.tolFit ?? 0.001);
    const r = a.boolean(b, OPS_CAV[op]);
    return [...r.posPlines.map((p) => orient(fromPline(p.pline), true)), ...r.negPlines.map((p) => orient(fromPline(p.pline), false))];
  },
};

// ================= flatten-js (linie + arc) =================
const F = await import('@flatten-js/core');
const _fo = await import('@flatten-js/polygon-offset'); const flattenOffset = typeof _fo.default === 'function' ? _fo.default : _fo.default.default;
function toFPoly(region, tolFit) {
  const poly = new F.Polygon();
  region.forEach((c0, i) => {
    const c = contourToLA(region.length === 1 ? orient(c0, true) : c0, tolFit);
    const shapes = c.segs.map((s) => s.k === 'L' ? F.segment(F.point(s.x0, s.y0), F.point(s.x1, s.y1)) : new F.Arc(F.point(s.cx, s.cy), s.r, s.a0, s.a0 + s.da, s.da > 0));
    poly.addFace(shapes);
  });
  return poly;
}
function fromFPoly(poly) {
  const out = [];
  for (const face of poly.faces) {
    const segs = [];
    for (const e of face.edges) {
      const sh = e.shape;
      if (sh instanceof F.Segment) segs.push({ k: 'L', x0: sh.ps.x, y0: sh.ps.y, x1: sh.pe.x, y1: sh.pe.y });
      else {
        let da = sh.counterClockwise ? sh.endAngle - sh.startAngle : -(sh.startAngle - sh.endAngle);
        if (sh.counterClockwise) { while (da <= 1e-15) da += TAU; while (da > TAU + 1e-12) da -= TAU; } else { while (da >= -1e-15) da -= TAU; while (da < -TAU - 1e-12) da += TAU; }
        segs.push({ k: 'A', cx: sh.pc.x, cy: sh.pc.y, r: sh.r, a0: sh.startAngle, da });
      }
    }
    out.push({ closed: true, segs });
  }
  return out;
}
export const flatten = {
  nume: '@flatten-js/core 1.6.14 + polygon-offset 1.1.4', licenta: 'MIT',
  offset(region, d, opt = {}) { return fromFPoly(flattenOffset(toFPoly(region, opt.tolFit ?? 0.001), d)); },
  bool(A, B, op, opt = {}) {
    const a = toFPoly(A, opt.tolFit ?? 0.001), b = toFPoly(B, opt.tolFit ?? 0.001);
    const BO = F.BooleanOperations;
    let r;
    if (op === 'union') r = BO.unify(a, b);
    else if (op === 'inter') r = BO.intersect(a, b);
    else if (op === 'diff') r = BO.subtract(a, b);
    else { const x = BO.subtract(a, b), y = BO.subtract(toFPoly(B, opt.tolFit ?? 0.001), toFPoly(A, opt.tolFit ?? 0.001)); r = BO.unify(x, y); }
    return fromFPoly(r);
  },
};

// ================= maker.js (linie + arc) =================
const maker = require('makerjs');
function toMaker(region, tolFit) {
  const model = { paths: {} };
  let id = 0;
  region.forEach((c0) => {
    const c = contourToLA(c0, tolFit);
    for (const s of c.segs) {
      if (s.k === 'L') model.paths['p' + id++] = new maker.paths.Line([s.x0, s.y0], [s.x1, s.y1]);
      else {
        const a0 = s.a0 * 180 / Math.PI, a1 = (s.a0 + s.da) * 180 / Math.PI;
        model.paths['p' + id++] = s.da > 0 ? new maker.paths.Arc([s.cx, s.cy], s.r, a0, a1) : new maker.paths.Arc([s.cx, s.cy], s.r, a1, a0);
      }
    }
  });
  return model;
}
function fromMaker(model) {
  const chains = maker.model.findChains(model) || [];
  const out = [];
  for (const ch of chains) {
    if (!ch.endless) continue; // doar contururi inchise
    const segs = [];
    for (const link of ch.links) {
      const p = link.walkedPath.pathContext, o = link.walkedPath.offset || [0, 0];
      if (p.type === 'line') {
        const a = [p.origin[0] + o[0], p.origin[1] + o[1]], b = [p.end[0] + o[0], p.end[1] + o[1]];
        segs.push(link.reversed ? { k: 'L', x0: b[0], y0: b[1], x1: a[0], y1: a[1] } : { k: 'L', x0: a[0], y0: a[1], x1: b[0], y1: b[1] });
      } else if (p.type === 'arc' || p.type === 'circle') {
        const cx = p.origin[0] + o[0], cy = p.origin[1] + o[1];
        let s0 = p.type === 'circle' ? 0 : p.startAngle, s1 = p.type === 'circle' ? 360 : p.endAngle;
        let sw = s1 - s0; while (sw <= 0) sw += 360; while (sw > 360) sw -= 360;
        const a0 = s0 * Math.PI / 180, da = sw * Math.PI / 180;
        segs.push(link.reversed ? { k: 'A', cx, cy, r: p.radius, a0: a0 + da, da: -da } : { k: 'A', cx, cy, r: p.radius, a0, da });
      } else throw new Error('maker: tip ' + p.type);
    }
    out.push({ closed: true, segs });
  }
  // orientare: conturul cu aria cea mai mare CCW, restul dupa paritatea includerii nu e necesara pentru oracolul par-impar
  return out;
}
export const makerjs = {
  nume: 'makerjs 0.19.2', licenta: 'Apache-2.0',
  offset(region, d, opt = {}) { const m = toMaker(region, opt.tolFit ?? 0.001); return fromMaker(maker.model.outline(m, Math.abs(d), 0, d < 0)); },
  bool(A, B, op, opt = {}) {
    const a = toMaker(A, opt.tolFit ?? 0.001), b = toMaker(B, opt.tolFit ?? 0.001);
    if (op === 'xor') throw new Nesuportat('maker: xor nu exista direct');
    const f = { union: [false, true, false, true], inter: [true, false, true, false], diff: [false, true, true, false] }[op];
    maker.model.combine(a, b, ...f);
    return fromMaker({ models: { a, b } });
  },
};

// ================= paper.js (cubice) + paperjs-offset =================
const paper = require('paper');
paper.setup(new paper.Size(10, 10));
const { PaperOffset } = require('paperjs-offset');
function toPaper(region, nArc = 4) {
  const paths = region.map((c, i) => {
    const p = new paper.Path({ insert: false });
    const s0 = segStart(c.segs[0]); p.moveTo(new paper.Point(s0[0], s0[1]));
    for (const s of c.segs) {
      if (s.k === 'L') p.lineTo(new paper.Point(s.x1, s.y1));
      else if (s.k === 'A') for (const q of arcToCubics(s, nArc)) p.cubicCurveTo(new paper.Point(q.x1, q.y1), new paper.Point(q.x2, q.y2), new paper.Point(q.x3, q.y3));
      else if (s.k === 'C') p.cubicCurveTo(new paper.Point(s.x1, s.y1), new paper.Point(s.x2, s.y2), new paper.Point(s.x3, s.y3));
      else if (s.k === 'Q') p.quadraticCurveTo(new paper.Point(s.x1, s.y1), new paper.Point(s.x2, s.y2));
      else throw new Error('paper: conica');
    }
    if (c.closed) p.closePath();
    return p;
  });
  if (paths.length === 1) return paths[0];
  const cp = new paper.CompoundPath({ insert: false }); cp.addChildren(paths); return cp;
}
function fromPaper(item) {
  const kids = item instanceof paper.CompoundPath ? item.children : [item];
  return kids.map((p) => ({
    closed: p.closed,
    segs: p.curves.map((cv) => {
      const a = cv.point1, b = cv.point2, h1 = cv.handle1, h2 = cv.handle2;
      if (h1.isZero() && h2.isZero()) return { k: 'L', x0: a.x, y0: a.y, x1: b.x, y1: b.y };
      return { k: 'C', x0: a.x, y0: a.y, x1: a.x + h1.x, y1: a.y + h1.y, x2: b.x + h2.x, y2: b.y + h2.y, x3: b.x, y3: b.y };
    }),
  })).filter((c) => c.segs.length);
}
export const paperjs = {
  nume: 'paper 0.12.18 + paperjs-offset 2.2.1', licenta: 'MIT',
  offset(region, d, opt = {}) { const p = toPaper(region, opt.nArc); return fromPaper(PaperOffset.offset(p, d, { join: opt.join || 'round', insert: false })); },
  bool(A, B, op, opt = {}) {
    const a = toPaper(A, opt.nArc), b = toPaper(B, opt.nArc);
    const r = op === 'union' ? a.unite(b, { insert: false }) : op === 'inter' ? a.intersect(b, { insert: false }) : op === 'diff' ? a.subtract(b, { insert: false }) : a.exclude(b, { insert: false });
    return fromPaper(r);
  },
  raw: { paper, PaperOffset, toPaper, fromPaper },
};

// ================= Skia PathOps (canvaskit-wasm, build "full") =================
const CKinit = require('./node_modules/canvaskit-wasm/bin/full/canvaskit.js');
const CK = await CKinit({ locateFile: (f) => new URL('./node_modules/canvaskit-wasm/bin/full/' + f, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1') });
function toSkia(region) {
  const b = new CK.PathBuilder();
  for (const c of region) {
    const s0 = segStart(c.segs[0]); b.moveTo(s0[0], s0[1]);
    for (const s of c.segs) {
      if (s.k === 'L') b.lineTo(s.x1, s.y1);
      else if (s.k === 'A') for (const k of arcToConics(s)) b.conicTo(k.x1, k.y1, k.x2, k.y2, k.w);
      else if (s.k === 'K') b.conicTo(s.x1, s.y1, s.x2, s.y2, s.w);
      else if (s.k === 'C') b.cubicTo(s.x1, s.y1, s.x2, s.y2, s.x3, s.y3);
      else if (s.k === 'Q') b.quadTo(s.x1, s.y1, s.x2, s.y2);
    }
    if (c.closed) b.close();
  }
  const p = b.detach(); b.delete(); return p;
}
export function fromSkiaCmds(cmds, relTol = 1e-5) {
  const out = []; let cur = null, x = 0, y = 0, sx = 0, sy = 0; let i = 0;
  const push = (s) => { cur.segs.push(s); };
  while (i < cmds.length) {
    const v = cmds[i++];
    if (v === CK.MOVE_VERB) { if (cur && cur.segs.length) out.push(cur); cur = { closed: false, segs: [] }; x = sx = cmds[i++]; y = sy = cmds[i++]; }
    else if (v === CK.LINE_VERB) { const nx = cmds[i++], ny = cmds[i++]; push({ k: 'L', x0: x, y0: y, x1: nx, y1: ny }); x = nx; y = ny; }
    else if (v === CK.QUAD_VERB) { const s = { k: 'Q', x0: x, y0: y, x1: cmds[i++], y1: cmds[i++], x2: cmds[i++], y2: cmds[i++] }; push(s); x = s.x2; y = s.y2; }
    else if (v === CK.CONIC_VERB) { const s = { k: 'K', x0: x, y0: y, x1: cmds[i++], y1: cmds[i++], x2: cmds[i++], y2: cmds[i++], w: cmds[i++] }; const a = conicToArc(s, relTol); push(a || s); x = s.x2; y = s.y2; }
    else if (v === CK.CUBIC_VERB) { const s = { k: 'C', x0: x, y0: y, x1: cmds[i++], y1: cmds[i++], x2: cmds[i++], y2: cmds[i++], x3: cmds[i++], y3: cmds[i++] }; push(s); x = s.x3; y = s.y3; }
    else if (v === CK.CLOSE_VERB) { if (Math.hypot(x - sx, y - sy) > 0) push({ k: 'L', x0: x, y0: y, x1: sx, y1: sy }); cur.closed = true; out.push(cur); cur = null; x = sx; y = sy; }
    else throw new Error('skia verb ' + v);
  }
  if (cur && cur.segs.length) out.push(cur);
  return out;
}
const OPS_SK = () => ({ union: CK.PathOp.Union, inter: CK.PathOp.Intersect, diff: CK.PathOp.Difference, xor: CK.PathOp.XOR });
export const skia = {
  nume: 'Skia PathOps (canvaskit-wasm 0.42.0, build full)', licenta: 'BSD-3-Clause',
  offset(region, d, opt = {}) {
    const p = toSkia(region);
    const st = p.makeStroked({ width: 2 * Math.abs(d), join: opt.join === 'miter' ? CK.StrokeJoin.Miter : CK.StrokeJoin.Round, cap: CK.StrokeCap.Round, miter_limit: 4, precision: opt.precision ?? 1 });
    const r = CK.Path.MakeFromOp(p, st, d > 0 ? CK.PathOp.Union : CK.PathOp.Difference);
    const out = r ? fromSkiaCmds(r.toCmds()) : null;
    p.delete(); st && st.delete(); r && r.delete();
    if (!out) throw new Error('skia: op a intors null');
    return out;
  },
  bool(A, B, op) {
    const a = toSkia(A), b = toSkia(B);
    const r = CK.Path.MakeFromOp(a, b, OPS_SK()[op]);
    const out = r ? fromSkiaCmds(r.toCmds()) : null;
    a.delete(); b.delete(); r && r.delete();
    if (!out) throw new Error('skia: op a intors null');
    return out;
  },
  CK,
};

// ================= Clipper2 (clipper2-ts) + refit propriu =================
const C2 = await import('clipper2-ts');
function toClip(region, tol) { return region.map((c) => { const p = flattenContour(c, tol); p.pop(); return p.map(([x, y]) => ({ x, y })); }); }
function fromClip(paths, refitTol) {
  return paths.map((P) => {
    const pts = P.map((q) => [q.x, q.y]);
    if (refitTol) return { closed: true, segs: refitPolyline(pts, true, refitTol) };
    const segs = []; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; segs.push({ k: 'L', x0: a[0], y0: a[1], x1: b[0], y1: b[1] }); }
    return { closed: true, segs };
  });
}
const CT = { union: 2, inter: 1, diff: 3, xor: 4 };
export function makeClipper(flatTol, refitTol, prec = 6) {
  return {
    nume: `clipper2-ts 2.0.1 (aplatizare ${flatTol} mm${refitTol ? ', refit arce ' + refitTol : ''})`, licenta: 'BSL-1.0',
    offset(region, d, opt = {}) { return fromClip(C2.inflatePathsD(toClip(region, flatTol), d, opt.join === 'miter' ? C2.JoinType.Miter : C2.JoinType.Round, C2.EndType.Polygon, 4, prec, flatTol), refitTol); },
    bool(A, B, op) { return fromClip(C2.booleanOpD(CT[op], toClip(A, flatTol), toClip(B, flatTol), C2.FillRule.NonZero, prec), refitTol); },
  };
}
