// write-dxf-r12.mjs - scriitor DXF R12 (AC1009) PROPRIU, strict pe specificatia R12:
// doar LINE, ARC, CIRCLE si POLYLINE/VERTEX/SEQEND cu bulge. R12 NU are LWPOLYLINE, ELLIPSE, SPLINE si nici
// $INSUNITS/$MEASUREMENT (acestea apar din R2000). Elipsele si Bezier-urile devin ARCE (biarce) sub o
// toleranta DECLARATA; un contur ramane O SINGURA entitate POLYLINE inchisa.
import { TAU, curveToArcs, segStart, shapesBBox } from './geom.mjs';

const num = (v) => { if (!Number.isFinite(v)) throw new Error('numar nefinit in DXF'); const r = Math.round(v * 1e9) / 1e9; return (Object.is(r, -0) ? 0 : r).toString(); };
const deg = (a) => { let d = (a * 180) / Math.PI; d = ((d % 360) + 360) % 360; return d; };

export function writeDxfR12(doc, tol = 0.001) {
  const o = [];
  const p = (c, v) => { o.push(String(c), typeof v === 'number' ? num(v) : v); };
  const bb = shapesBBox(doc.shapes);
  p(0, 'SECTION'); p(2, 'HEADER');
  p(9, '$ACADVER'); p(1, 'AC1009');
  p(9, '$INSBASE'); p(10, 0); p(20, 0); p(30, 0);
  p(9, '$EXTMIN'); p(10, bb[0]); p(20, bb[1]); p(30, 0);
  p(9, '$EXTMAX'); p(10, bb[2]); p(20, bb[3]); p(30, 0);
  p(9, '$LIMMIN'); p(10, 0); p(20, 0);
  p(9, '$LIMMAX'); p(10, doc.page[0]); p(20, doc.page[1]);
  p(0, 'ENDSEC');
  p(0, 'SECTION'); p(2, 'TABLES');
  p(0, 'TABLE'); p(2, 'LTYPE'); p(70, 1);
  p(0, 'LTYPE'); p(2, 'CONTINUOUS'); p(70, 0); p(3, 'Solid line'); p(72, 65); p(73, 0); p(40, 0);
  p(0, 'ENDTAB');
  p(0, 'TABLE'); p(2, 'LAYER'); p(70, doc.layers.length + 1);
  p(0, 'LAYER'); p(2, '0'); p(70, 0); p(62, 7); p(6, 'CONTINUOUS');
  for (const [name, color] of doc.layers) { p(0, 'LAYER'); p(2, name); p(70, 0); p(62, color); p(6, 'CONTINUOUS'); }
  p(0, 'ENDTAB');
  p(0, 'TABLE'); p(2, 'STYLE'); p(70, 1);
  p(0, 'STYLE'); p(2, 'STANDARD'); p(70, 0); p(40, 0); p(41, 1); p(50, 0); p(71, 0); p(42, 2.5); p(3, 'txt'); p(4, '');
  p(0, 'ENDTAB');
  p(0, 'ENDSEC');
  p(0, 'SECTION'); p(2, 'BLOCKS'); p(0, 'ENDSEC');
  p(0, 'SECTION'); p(2, 'ENTITIES');
  const stats = { LINE: 0, ARC: 0, CIRCLE: 0, POLYLINE: 0, VERTEX: 0, approxArcs: 0 };
  for (const sh of doc.shapes) {
    for (const sp of sh.subpaths) {
      const L = sh.layer;
      // cerc complet -> CIRCLE
      if (sp.segs.length === 1 && sp.segs[0].k === 'arc' && Math.abs(Math.abs(sp.segs[0].da) - TAU) < 1e-12) {
        const a = sp.segs[0]; p(0, 'CIRCLE'); p(8, L); p(10, a.c[0]); p(20, a.c[1]); p(30, 0); p(40, a.r); stats.CIRCLE++; continue;
      }
      // coboram curbele la linii + arce (exact pentru line/arc, aproximare declarata pentru earc/cubic)
      const flat = [];
      for (const s of sp.segs) { const r = curveToArcs(s, tol); if (s.k === 'earc' || s.k === 'cubic') stats.approxArcs += r.length; flat.push(...r); }
      if (!sp.closed && flat.length === 1) { // entitate simpla
        const s = flat[0];
        if (s.k === 'line') { p(0, 'LINE'); p(8, L); p(10, s.a[0]); p(20, s.a[1]); p(30, 0); p(11, s.b[0]); p(21, s.b[1]); p(31, 0); stats.LINE++; continue; }
        if (s.k === 'arc') {
          const [a0, a1] = s.da > 0 ? [s.a0, s.a0 + s.da] : [s.a0 + s.da, s.a0]; // ARC e mereu CCW
          p(0, 'ARC'); p(8, L); p(10, s.c[0]); p(20, s.c[1]); p(30, 0); p(40, s.r); p(50, deg(a0)); p(51, deg(a1)); stats.ARC++; continue;
        }
      }
      // POLYLINE 2D cu bulge = tan(baleiaj/4)
      p(0, 'POLYLINE'); p(8, L); p(66, 1); p(10, 0); p(20, 0); p(30, 0); p(70, sp.closed ? 1 : 0); stats.POLYLINE++;
      const verts = [];
      for (const s of flat) {
        const a = segStart(s);
        let bulge = 0;
        if (s.k === 'arc') {
          if (Math.abs(s.da) > Math.PI * 1.999) throw new Error('arc complet intr-o polilinie');
          bulge = Math.tan(s.da / 4);
        }
        verts.push([a, bulge]);
      }
      if (!sp.closed) { const last = flat[flat.length - 1]; verts.push([last.k === 'line' ? last.b : endOf(last), 0]); }
      for (const [v, b] of verts) { p(0, 'VERTEX'); p(8, L); p(10, v[0]); p(20, v[1]); p(30, 0); if (b !== 0) p(42, b); p(70, 0); stats.VERTEX++; }
      p(0, 'SEQEND'); p(8, L);
    }
  }
  p(0, 'ENDSEC');
  p(0, 'EOF');
  return { text: o.join('\r\n') + '\r\n', stats };
}
function endOf(s) { const a = s.a0 + s.da; return [s.c[0] + s.r * Math.cos(a), s.c[1] + s.r * Math.sin(a)]; }
