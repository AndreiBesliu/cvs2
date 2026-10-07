// flat-node.mjs — sonda s6-panza (ARUNCABIL). Cât costă re-aplatizarea pe CPU, la toleranța ecranului (0,25 px),
// pentru varianta „GPU + polilinii refăcute la fiecare treaptă de zoom". Scena: 50 k forme.
import fs from 'node:fs';
import opentype from 'opentype.js';
import { flattenSeg } from './geom.mjs';
import { makeScene } from './scene.mjs';

const font = opentype.parse(fs.readFileSync('C:/Windows/Fonts/arial.ttf').buffer);
const shapes = makeScene(50000, 7, font);
const out = [];
for (const s of [0.5, 4, 32, 250, 1000]) { // px/mm
  const tol = 0.25 / s; const times = []; let pts = 0;
  for (let rep = 0; rep < 5; rep++) {
    const t0 = performance.now(); let n = 0; const buf = [];
    for (const sh of shapes) for (const sub of sh.subs) { for (const g of sub.segs) { buf.length = 0; flattenSeg(g, tol, buf); n += buf.length / 2; } }
    times.push(performance.now() - t0); pts = n;
  }
  times.sort((a, b) => a - b);
  out.push({ px_pe_mm: s, tol_mm: +tol.toPrecision(3), segmente_toata_scena: pts, ms_median_5: +times[2].toFixed(1), MB_float32_xy: +(pts * 8 / 1048576).toFixed(1) });
}
console.log(JSON.stringify(out, null, 1));
fs.writeFileSync('flat-50k.json', JSON.stringify(out, null, 1));
