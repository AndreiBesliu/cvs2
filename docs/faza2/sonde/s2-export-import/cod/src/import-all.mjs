// import-all.mjs - citeste intrarile independente (inputs/) si propriile exporturi (out/, drum dus-intors) cu
// cititorii nostri si scrie modelul rezultat ca JSON; oracolul Python il compara cu valorile pe hartie.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readDxf } from './read-dxf.mjs';
import { readSvg } from './read-svg.mjs';
import { readPdf } from './read-pdf.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const IN = path.join(here, '..', 'inputs'), OUT = path.join(here, '..', 'out');

export async function importAll() {
  const res = {};
  const jobs = [
    ['in-R2018-mm.dxf', IN], ['in-R2000-inch.dxf', IN], ['in-R12.dxf', IN],
    ['in-unitati.svg', IN], ['in-transformari.svg', IN], ['in-toli.svg', IN], ['in-px.svg', IN], ['in-3pagini.pdf', IN],
    ['referinta-R12.dxf', OUT], ['referinta-R2007.dxf', OUT], ['referinta.svg', OUT], ['referinta.pdf', OUT],
  ];
  for (const [f, dir] of jobs) {
    const t0 = performance.now();
    const buf = fs.readFileSync(path.join(dir, f));
    let r;
    if (f.endsWith('.dxf')) r = readDxf(buf.toString('utf8'));
    else if (f.endsWith('.svg')) r = readSvg(buf.toString('utf8'));
    else r = await readPdf(buf);
    r.ms = Math.round((performance.now() - t0) * 10) / 10;
    res[f] = r;
  }
  fs.writeFileSync(path.join(OUT, 'import-model.json'), JSON.stringify(res));
  return res;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const r = await importAll();
  for (const [f, x] of Object.entries(r)) {
    const n = x.pages ? x.pages.reduce((a, p) => a + p.shapes.length, 0) : x.shapes.length;
    console.log(f, 'forme:', n, 'avertismente:', JSON.stringify(x.warnings), x.units ? 'unitati: ' + JSON.stringify(x.units) : '', x.float32 !== undefined ? 'float32: ' + x.float32 : '', `${x.ms} ms`);
  }
}
