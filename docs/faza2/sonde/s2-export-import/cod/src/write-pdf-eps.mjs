// write-pdf-eps.mjs - PDF (pdf-lib, MIT) cu straturi OCG si EPS (scriitor propriu).
// PDF/EPS NU au arc: arcele si elipsele devin cubice Bezier sub toleranta DECLARATA (implicit 0,001 mm);
// Bezier-urile si liniile trec exact. Coordonatele se scriu in puncte (1 pt = 25,4/72 mm).
import { PDFDocument, PDFName, PDFString, PDFOperator, PDFNumber } from 'pdf-lib';
import { jsPDF } from 'jspdf';
import { TAU, conicToCubics, segStart } from './geom.mjs';

const K = 72 / 25.4;

// coborare comuna: subcale -> lista de operatii {m|l|c|h} in mm
export function toPathOps(sp, tol) {
  const ops = [['m', segStart(sp.segs[0])]];
  let nArcCubics = 0;
  for (const s of sp.segs) {
    if (s.k === 'line') ops.push(['l', s.b]);
    else if (s.k === 'cubic') ops.push(['c', s.p[1], s.p[2], s.p[3]]);
    else { const r = conicToCubics(s, tol); nArcCubics += r.n; for (const c of r.segs) ops.push(['c', c.p[1], c.p[2], c.p[3]]); }
  }
  if (sp.closed) ops.push(['h']);
  return { ops, nArcCubics };
}

export async function writePdf(doc, tol = 0.001) {
  const [W, H] = doc.page;
  const pdf = await PDFDocument.create();
  pdf.setTitle('cncvs2 sonda s2 - desen de referinta');
  pdf.setProducer('cncvs2 sonda s2 (pdf-lib)');
  const page = pdf.addPage([W * K, H * K]);
  const ctx = pdf.context;
  const ocgs = doc.layers.map(([name]) => ctx.register(ctx.obj({ Type: 'OCG', Name: PDFString.of(name) })));
  pdf.catalog.set(PDFName.of('OCProperties'), ctx.obj({ OCGs: ocgs, D: { Order: ocgs, ON: ocgs, Name: PDFString.of('Straturi') } }));
  const props = ctx.obj({});
  ocgs.forEach((r, i) => props.set(PDFName.of(`L${i}`), r));
  const res = page.node.Resources();
  res.set(PDFName.of('Properties'), props);
  const op = (name, ...args) => PDFOperator.of(name, args.map((a) => (typeof a === 'number' ? PDFNumber.of(Math.round(a * 1e6) / 1e6) : a)));
  const stats = { cubicsFromConics: 0, paths: 0 };
  const list = [op('q'), op('w', 0.2 * K), op('G', 0)];
  doc.layers.forEach(([name], i) => {
    list.push(PDFOperator.of('BDC', [PDFName.of('OC'), PDFName.of(`L${i}`)]));
    for (const sh of doc.shapes.filter((s) => s.layer === name)) {
      for (const sp of sh.subpaths) {
        const { ops, nArcCubics } = toPathOps(sp, tol); stats.cubicsFromConics += nArcCubics;
        for (const o of ops) {
          if (o[0] === 'm') list.push(op('m', o[1][0] * K, o[1][1] * K));
          else if (o[0] === 'l') list.push(op('l', o[1][0] * K, o[1][1] * K));
          else if (o[0] === 'c') list.push(op('c', o[1][0] * K, o[1][1] * K, o[2][0] * K, o[2][1] * K, o[3][0] * K, o[3][1] * K));
          else list.push(op('h'));
        }
      }
      list.push(op('S')); stats.paths++;
    }
    list.push(PDFOperator.of('EMC', []));
  });
  list.push(op('Q'));
  page.pushOperators(...list);
  const bytes = await pdf.save({ useObjectStreams: false });
  return { bytes, stats };
}

export function writeEps(doc, tol = 0.001) {
  const [W, H] = doc.page;
  const f = (v) => { const r = Math.round(v * K * 1e6) / 1e6; return (Object.is(r, -0) ? 0 : r).toString(); };
  const o = [];
  o.push('%!PS-Adobe-3.0 EPSF-3.0');
  o.push('%%Creator: cncvs2 sonda s2');
  o.push('%%Title: desen de referinta');
  o.push(`%%BoundingBox: 0 0 ${Math.ceil(W * K)} ${Math.ceil(H * K)}`);
  o.push(`%%HiResBoundingBox: 0 0 ${(W * K).toFixed(6)} ${(H * K).toFixed(6)}`);
  o.push('%%LanguageLevel: 2');
  o.push('%%Pages: 1');
  o.push('%%EndComments');
  o.push('%%BeginProlog');
  o.push('%%EndProlog');
  o.push('%%Page: 1 1');
  o.push(`gsave ${f(0.2)} setlinewidth 0 setgray 1 setlinejoin`);
  let stats = { cubicsFromConics: 0 };
  for (const [name] of doc.layers) {
    o.push(`% strat: ${name}`);
    for (const sh of doc.shapes.filter((s) => s.layer === name)) {
      o.push('newpath');
      for (const sp of sh.subpaths) {
        const { ops, nArcCubics } = toPathOps(sp, tol); stats.cubicsFromConics += nArcCubics;
        for (const x of ops) {
          if (x[0] === 'm') o.push(`${f(x[1][0])} ${f(x[1][1])} moveto`);
          else if (x[0] === 'l') o.push(`${f(x[1][0])} ${f(x[1][1])} lineto`);
          else if (x[0] === 'c') o.push(`${f(x[1][0])} ${f(x[1][1])} ${f(x[2][0])} ${f(x[2][1])} ${f(x[3][0])} ${f(x[3][1])} curveto`);
          else o.push('closepath');
        }
      }
      o.push('stroke');
    }
  }
  o.push('grestore');
  o.push('showpage');
  o.push('%%Trailer');
  o.push('%%EOF');
  return { text: o.join('\n') + '\n', stats };
}

// Candidat de comparatie: jsPDF (folosit de editia intai). Aceleasi operatii, prin API-ul lui de cale.
export function writePdfJs(doc, tol = 0.001) {
  const [W, H] = doc.page;
  const pdf = new jsPDF({ unit: 'mm', format: [W, H], orientation: W > H ? 'landscape' : 'portrait', compress: false });
  pdf.setLineWidth(0.2);
  for (const sh of doc.shapes) for (const sp of sh.subpaths) {
    const { ops } = toPathOps(sp, tol);
    // jsPDF are originea sus-stanga, Y in jos: intoarcem Y
    for (const o of ops) {
      if (o[0] === 'm') pdf.moveTo(o[1][0], H - o[1][1]);
      else if (o[0] === 'l') pdf.lineTo(o[1][0], H - o[1][1]);
      else if (o[0] === 'c') pdf.curveTo(o[1][0], H - o[1][1], o[2][0], H - o[2][1], o[3][0], H - o[3][1]);
      else pdf.close();
    }
    pdf.stroke();
  }
  return new Uint8Array(pdf.output('arraybuffer'));
}
export { TAU };
