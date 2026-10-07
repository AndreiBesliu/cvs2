// float32.mjs - cat pierde pdf.js (Float32Array) pe o placa de 2440 mm: citim corpus.pdf (scris de noi, exact
// la 1e-6 pt) si comparam cu valorile din modelul care l-a scris.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPdf } from './read-pdf.mjs';
import { stressCorpus } from './reference.mjs';
import { toPathOps } from './write-pdf-eps.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
export async function float32Loss() {
  const r = await readPdf(fs.readFileSync(path.join(here, '..', 'out', 'corpus.pdf')));
  const doc = stressCorpus();
  const truth = [];
  for (const sh of doc.shapes) for (const sp of sh.subpaths) for (const o of toPathOps(sp, 0.001).ops) for (const p of o.slice(1)) truth.push(p);
  const got = [];
  for (const pg of r.pages) for (const sh of pg.shapes) for (const sp of sh.subpaths) for (const s of sp.segs) got.push(...(s.k === 'cubic' ? s.p : [s.a, s.b]));
  // fiecare punct citit -> cel mai apropiat punct adevarat (aceeasi ordine nu e garantata)
  let max = 0, at = null;
  for (const g of got) { let best = Infinity; for (const t of truth) { const d = Math.hypot(g[0] - t[0], g[1] - t[1]); if (d < best) best = d; } if (best > max) { max = best; at = g; } }
  return { puncte: got.length, abatereMaxMm: max, la: at, float32: r.float32 };
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) console.log(await float32Loss());
