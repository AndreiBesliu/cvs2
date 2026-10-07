// masoara.mjs - reproduce cifrele-cheie ale sondei s2 intr-o singura comanda (< 3 minute):
//   1) genereaza intrarile independente (ezdxf, reportlab, SVG de mana)      [Python]
//   2) exporta desenul de referinta + corpusul in DXF R12, DXF R2007, SVG, PDF, EPS   [JS]
//   3) oracolul de export: ezdxf / svgelements / PyMuPDF / Ghostscript-WASM + fontTools   [Python]
//   4) importa intrarile si propriile exporturi (dus-intors)                      [JS]
//   5) oracolul de import: valori pe hartie + ezdxf + PyMuPDF                    [Python]
//   6) costul R12 pe tolerante, pierderea float32 din pdf.js
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { exportAll } from './export-all.mjs';
import { importAll } from './import-all.mjs';
import { sweep } from './sweep.mjs';
import { float32Loss } from './float32.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const py = fs.existsSync(path.join(root, '.venv', 'Scripts', 'python.exe')) ? path.join(root, '.venv', 'Scripts', 'python.exe') : path.join(root, '.venv', 'bin', 'python');
const runPy = (script) => {
  const t0 = performance.now();
  const r = spawnSync(py, [path.join(root, 'oracle', script)], { cwd: path.join(root, 'oracle'), encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
  if (r.status !== 0) { process.exitCode = 1; if (!/verificari trecute/.test(r.stdout)) { console.error(r.stdout, r.stderr); process.exit(1); } }
  return { out: r.stdout, ms: Math.round(performance.now() - t0) };
};
const T = {};
let t = performance.now();
const g = runPy('gen_inputs.py'); T.intrari = g.ms;
t = performance.now(); await exportAll(); T.export = Math.round(performance.now() - t);
const ex = runPy('check_export.py'); T.oracolExport = ex.ms;
t = performance.now(); await importAll(); T.import = Math.round(performance.now() - t);
const im = runPy('check_import.py'); T.oracolImport = im.ms;
const fails = (s) => s.split('\n').filter((l) => l.startsWith('PICA'));
const sw = sweep();
const f32 = await float32Loss();
console.log('\n=== s2-export-import: rezultat ===');
console.log(ex.out.split('\n').find((l) => l.startsWith('EXPORT:')));
for (const l of fails(ex.out)) console.log('  ' + l);
console.log(im.out.split('\n').find((l) => l.startsWith('IMPORT:')));
for (const l of fails(im.out)) console.log('  ' + l);
const pick = (s, re) => (s.split('\n').find((l) => re.test(l)) || '').split(' | ').slice(1).join(' | ');
console.log('R12 elipsa (arce) abatere:', pick(ex.out, /ref R12: elipsa aproximata/));
console.log('R12 curba S (arce) abatere:', pick(ex.out, /ref R12: curba S aproximata/));
console.log('R12 glife vs fontTools:', pick(ex.out, /ref R12: glifele/));
console.log('PDF cerc R50:', pick(ex.out, /ref PDF \(pdf-lib\): cercul/));
console.log('EPS prin Ghostscript, cerc:', pick(ex.out, /ref EPS .*cercul/));
console.log('Glifa N (R2007):', pick(ex.out, /ref R2007: glifa N/));
console.log('Cost R12 vs SPLINE exact:'); console.table(sw.rows);
console.log('Cubice pe cerc in PDF/EPS:'); console.table(sw.pdfRows);
console.log('pdf.js Float32 pe placa 2440 mm: abatere max', f32.abatereMaxMm.toExponential(2), 'mm pe', f32.puncte, 'puncte');
console.log('Durate (ms; masina impartita, orientativ):', JSON.stringify(T));
