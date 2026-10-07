// sweep.mjs - cat costa R12 (biarce) fata de SPLINE exact, la mai multe tolerante; si cate cubice cere un cerc in PDF.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { referenceDrawing } from './reference.mjs';
import { writeDxfR12 } from './write-dxf-r12.mjs';
import { writeDxf2007 } from './write-dxf-2007.mjs';
import { conicToCubics, arc, TAU } from './geom.mjs';
export function sweep() {
  const doc = referenceDrawing();
  const rows = [];
  const exact = writeDxf2007(doc);
  rows.push({ format: 'R2007 SPLINE (exact)', tol: 0, entitati: Object.entries(exact.stats).filter(([k]) => k !== 'splineSegs').reduce((a, [, v]) => a + v, 0), segmenteCurbe: exact.stats.splineSegs, kB: +(exact.text.length / 1024).toFixed(1) });
  for (const tol of [0.001, 0.005, 0.01, 0.05]) {
    const r = writeDxfR12(doc, tol);
    rows.push({ format: 'R12 linii+arce', tol, entitati: r.stats.CIRCLE + r.stats.POLYLINE + r.stats.LINE + r.stats.ARC, arceDinCurbe: r.stats.approxArcs, varfuri: r.stats.VERTEX, kB: +(r.text.length / 1024).toFixed(1) });
  }
  const pdfRows = [];
  for (const R of [10, 50, 600, 1220]) for (const tol of [0.001, 0.01]) pdfRows.push({ R, tol, cubicePeCerc: conicToCubics(arc([0, 0], R, 0, TAU), tol).n });
  return { rows, pdfRows };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) { const s = sweep(); console.table(s.rows); console.table(s.pdfRows); }