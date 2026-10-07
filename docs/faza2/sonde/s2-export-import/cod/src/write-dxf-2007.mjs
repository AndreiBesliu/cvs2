// write-dxf-2007.mjs - DXF R2007 (AC1021, UTF-8) prin @tarikjabiri/dxf (MIT).
// Entitati reale: CIRCLE, ARC, LINE, ELLIPSE, LWPOLYLINE cu bulge (contur linii+arce), SPLINE (Bezier EXACT:
// grad 3, noduri cu multiplicitate 3 la imbinari = lantul de Bezier-uri, fara nicio aproximare).
import * as tj from '@tarikjabiri/dxf';
import { TAU, segStart, segEnd, line as mkLine, cubic as mkCubic } from './geom.mjs';

export function writeDxf2007(doc, opts = {}) {
  const w = new tj.DxfWriter();
  w.setUnits(tj.Units.Millimeters);              // $INSUNITS = 4
  w.header.setVariable('$MEASUREMENT', { 70: 1 }); // metric (Inkscape "Read from file" citeste asta)
  for (const [name, color] of doc.layers) w.addLayer(name, color, 'Continuous');
  const stats = { LINE: 0, ARC: 0, CIRCLE: 0, ELLIPSE: 0, LWPOLYLINE: 0, SPLINE: 0, splineSegs: 0 };
  const v3 = (p) => tj.point3d(p[0], p[1], 0);
  for (const sh of doc.shapes) {
    const o = { layerName: sh.layer };
    for (const sp of sh.subpaths) {
      const segs = sp.segs;
      if (segs.length === 1 && segs[0].k === 'arc' && Math.abs(Math.abs(segs[0].da) - TAU) < 1e-12) {
        w.addCircle(v3(segs[0].c), segs[0].r, o); stats.CIRCLE++; continue;
      }
      // impartim conturul in "fugi": linii/arce -> LWPOLYLINE; cubice (+linii) -> SPLINE; elipse -> ELLIPSE
      const hasArc = segs.some((s) => s.k === 'arc'), hasCubic = segs.some((s) => s.k === 'cubic');
      if (!segs.some((s) => s.k === 'earc') && !(hasArc && hasCubic)) {
        if (!hasCubic) { emitPolyOrSingle(w, segs, sp.closed, o, stats, opts); continue; }
        emitSpline(w, segs, o, stats); continue;
      }
      let run = [], kind = null;
      const flush = () => { if (!run.length) return; if (kind === 'lw') emitPolyOrSingle(w, run, false, o, stats, opts); else emitSpline(w, run, o, stats); run = []; };
      for (const s of segs) {
        if (s.k === 'earc') { flush(); emitEllipse(w, s, o, stats); kind = null; continue; }
        const k = s.k === 'cubic' ? 'sp' : (s.k === 'arc' ? 'lw' : (kind || 'lw'));
        if (kind && k !== kind) flush();
        kind = k; run.push(s);
      }
      flush();
    }
  }
  return { text: w.stringify(), stats };
}

function emitPolyOrSingle(w, segs, closed, o, stats, opts) {
  if (!closed && segs.length === 1) {
    const s = segs[0];
    if (s.k === 'line') { w.addLine(tj.point3d(s.a[0], s.a[1], 0), tj.point3d(s.b[0], s.b[1], 0), o); stats.LINE++; return; }
    if (s.k === 'arc') {
      const [a0, a1] = s.da > 0 ? [s.a0, s.a0 + s.da] : [s.a0 + s.da, s.a0];
      const d = (a) => ((((a * 180) / Math.PI) % 360) + 360) % 360;
      w.addArc(tj.point3d(s.c[0], s.c[1], 0), s.r, d(a0), d(a1), o); stats.ARC++; return;
    }
  }
  const verts = segs.map((s) => ({ point: tj.point2d(...segStart(s)), bulge: s.k === 'arc' ? Math.tan(s.da / 4) : 0 }));
  if (!closed) verts.push({ point: tj.point2d(...segEnd(segs[segs.length - 1])), bulge: 0 });
  w.addLWPolyline(verts, { ...o, flags: closed ? tj.LWPolylineFlags.Closed : tj.LWPolylineFlags.None });
  stats.LWPOLYLINE++;
}

function emitSpline(w, segs, o, stats) {
  // fiecare linie devine cubica degenerata (puncte de control pe linie) - EXACT
  const cubics = segs.map((s) => (s.k === 'cubic' ? s : mkCubic(s.a, lerp(s.a, s.b, 1 / 3), lerp(s.a, s.b, 2 / 3), s.b)));
  const cps = [cubics[0].p[0]];
  for (const c of cubics) cps.push(c.p[1], c.p[2], c.p[3]);
  const n = cubics.length, knots = [0, 0, 0, 0];
  for (let i = 1; i < n; i++) knots.push(i, i, i);
  knots.push(n, n, n, n);
  w.addSpline({ controlPoints: cps.map((p) => tj.point3d(p[0], p[1], 0)), degreeCurve: 3, knots, flags: tj.SplineFlags.Planar }, o);
  stats.SPLINE++; stats.splineSegs += n;
}
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

function emitEllipse(w, s, o, stats) {
  let { rx, ry, rot, t0, dt } = s;
  if (ry > rx) { [rx, ry] = [ry, rx]; rot += Math.PI / 2; t0 -= Math.PI / 2; }
  let start = dt > 0 ? t0 : t0 + dt, end = start + Math.abs(dt);
  if (Math.abs(Math.abs(dt) - TAU) < 1e-12) { start = 0; end = TAU; }
  else { start = ((start % TAU) + TAU) % TAU; end = (start + Math.abs(dt)) % TAU; }
  const major = tj.point3d(rx * Math.cos(rot), rx * Math.sin(rot), 0);
  w.addEllipse(tj.point3d(s.c[0], s.c[1], 0), major, ry / rx, start, end, o); stats.ELLIPSE++;
}
export { mkLine };
