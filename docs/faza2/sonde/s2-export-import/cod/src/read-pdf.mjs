// read-pdf.mjs - cititor PDF vectorial (si .ai compatibil PDF) prin pdfjs-dist (Apache-2.0): TOATE paginile,
// CTM urmarit (save/restore/transform), operatorul de pictare pastrat (traseele de decupaj nu devin forme).
// Atentie (masurat): pdf.js v6 da coordonatele caii ca Float32Array.
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { line, cubic, quadToCubic, mul, apply } from './geom.mjs';

const K = 25.4 / 72;
const DRAW = { moveTo: 0, lineTo: 1, curveTo: 2, quadraticCurveTo: 3, closePath: 4 };

export async function readPdf(bytes) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes), isEvalSupported: false, verbosity: 0 }).promise;
  const OPS = pdfjs.OPS; const warn = {}; const W = (k) => { warn[k] = (warn[k] || 0) + 1; };
  const pages = [];
  let float32 = false;
  for (let pn = 1; pn <= doc.numPages; pn++) {
    const page = await doc.getPage(pn);
    const ol = await page.getOperatorList();
    const [x0, y0] = page.view;
    let ctm = [1, 0, 0, 1, 0, 0]; const stack = [];
    const shapes = []; let clipNext = false;
    for (let i = 0; i < ol.fnArray.length; i++) {
      const fn = ol.fnArray[i], args = ol.argsArray[i];
      if (fn === OPS.save) stack.push(ctm);
      else if (fn === OPS.restore) ctm = stack.pop() || [1, 0, 0, 1, 0, 0];
      else if (fn === OPS.transform) ctm = mul(ctm, args);
      else if (fn === OPS.clip || fn === OPS.eoClip) clipNext = true;
      else if (fn === OPS.constructPath) {
        const [paintOp, [data]] = args;
        if (!data) { clipNext = false; continue; }
        if (data instanceof Float32Array) float32 = true;
        if (paintOp === OPS.endPath) { if (clipNext) W('cale de decupaj (W n) - nu e forma'); else W('cale nepictata - sarita'); clipNext = false; continue; }
        clipNext = false;
        const M = mul([K, 0, 0, K, -x0 * K, -y0 * K], ctm); // pt (spatiu utilizator) -> mm pe pagina
        const P = (x, y) => apply(M, [x, y]);
        const subs = []; let cur = null, pen = null, start = null;
        for (let j = 0; j < data.length;) {
          const op = data[j++];
          if (op === DRAW.moveTo) { if (cur && cur.segs.length) subs.push(cur); cur = { segs: [], closed: false }; pen = P(data[j], data[j + 1]); start = pen; j += 2; }
          else if (op === DRAW.lineTo) { const q = P(data[j], data[j + 1]); j += 2; cur.segs.push(line(pen, q)); pen = q; }
          else if (op === DRAW.curveTo) { const a = P(data[j], data[j + 1]), b = P(data[j + 2], data[j + 3]), q = P(data[j + 4], data[j + 5]); j += 6; cur.segs.push(cubic(pen, a, b, q)); pen = q; }
          else if (op === DRAW.quadraticCurveTo) { const a = P(data[j], data[j + 1]), q = P(data[j + 2], data[j + 3]); j += 4; cur.segs.push(quadToCubic(pen, a, q)); pen = q; }
          else if (op === DRAW.closePath) { if (cur) { if (Math.hypot(pen[0] - start[0], pen[1] - start[1]) > 1e-9) cur.segs.push(line(pen, start)); cur.closed = true; pen = start; } }
          else { W('operator de cale necunoscut ' + op); break; }
        }
        if (cur && cur.segs.length) subs.push(cur);
        for (const sp of subs) shapes.push({ name: 'pdf', layer: `pagina ${pn}`, subpaths: [sp] });
      }
    }
    pages.push({ page: pn, size: [(page.view[2] - x0) * K, (page.view[3] - y0) * K], shapes });
  }
  return { pages, numPages: doc.numPages, float32, warnings: warn };
}
