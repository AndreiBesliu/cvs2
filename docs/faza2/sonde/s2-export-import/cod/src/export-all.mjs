// export-all.mjs - scrie desenul de referinta si corpusul in toate formatele, in out/.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { referenceDrawing, stressCorpus } from './reference.mjs';
import { writeSvg } from './write-svg.mjs';
import { writeDxfR12 } from './write-dxf-r12.mjs';
import { writeDxf2007 } from './write-dxf-2007.mjs';
import { writePdf, writeEps, writePdfJs } from './write-pdf-eps.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
export const OUT = path.join(here, '..', 'out');
export const TOL = 0.001; // toleranta declarata pentru aproximari (mm)

export async function exportAll(outDir = OUT) {
  fs.mkdirSync(outDir, { recursive: true });
  const manifest = { tol: TOL, files: {} };
  const docs = { referinta: referenceDrawing(), corpus: stressCorpus() };
  // OTRAVURI (doar pentru a verifica oracolul): POISON=raza|em|strat0|toleranta|sweep
  const P = process.env.POISON;
  if (P === 'raza') docs.referinta.shapes[0].subpaths[0].segs[0].r *= 1.0001;          // cerc R50 -> R50,005
  if (P === 'em') for (const sh of docs.referinta.shapes) if (sh.char) for (const sp of sh.subpaths) for (const sg of sp.segs) {
    const k = 20 / docs.referinta.text.em, f = (q) => [20 + (q[0] - 20) * k, 15 + (q[1] - 15) * k];  // "20 mm" = em (defectul vechi)
    if (sg.k === 'line') { sg.a = f(sg.a); sg.b = f(sg.b); } else sg.p = sg.p.map(f);
  }
  if (P === 'strat0') { for (const d of Object.values(docs)) { for (const sh of d.shapes) sh.layer = '0'; d.layers = [['0', 7]]; } }
  manifest.text = docs.referinta.text;
  for (const [name, doc] of Object.entries(docs)) {
    const t0 = performance.now();
    const svg = writeSvg(doc); fs.writeFileSync(path.join(outDir, `${name}.svg`), svg);
    const r12 = writeDxfR12(doc, process.env.POISON === 'toleranta' ? 0.01 : TOL); fs.writeFileSync(path.join(outDir, `${name}-R12.dxf`), r12.text);
    const r2007 = writeDxf2007(doc); fs.writeFileSync(path.join(outDir, `${name}-R2007.dxf`), r2007.text);
    const pdf = await writePdf(doc, TOL); fs.writeFileSync(path.join(outDir, `${name}.pdf`), pdf.bytes);
    const eps = writeEps(doc, TOL); fs.writeFileSync(path.join(outDir, `${name}.eps`), eps.text);
    const pdfjs = writePdfJs(doc, TOL); fs.writeFileSync(path.join(outDir, `${name}-jspdf.pdf`), pdfjs);
    manifest.files[name] = {
      ms: Math.round(performance.now() - t0), r12: r12.stats, r2007: r2007.stats, pdf: pdf.stats, eps: eps.stats,
      sizes: Object.fromEntries(['.svg', '-R12.dxf', '-R2007.dxf', '.pdf', '.eps', '-jspdf.pdf'].map((e) => [e, fs.statSync(path.join(outDir, name + e)).size])),
    };
  }
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  return manifest;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const m = await exportAll();
  console.log(JSON.stringify(m, null, 1));
}
