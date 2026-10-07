// glife-reguli.mjs — sonda s6-panza (ARUNCABIL). Pe aceleași puncte: nonzero și evenodd dau același „plin" pe glife?
// Și cât diferă pe formele unde regula contează (gogoașa cu aceeași orientare, pentagrama, două cercuri într-o cale).
import fs from 'node:fs';
import opentype from 'opentype.js';
import { inside, shapeBBox } from './geom.mjs';
import { glyphShapes, circle, mulberry32 } from './scene.mjs';

const font = opentype.parse(fs.readFileSync('C:/Windows/Fonts/arial.ttf').buffer);
const forme = [];
for (const txt of ['B8O@', 'Ag&%', 'stejar nuc', '0123456789']) for (const g of glyphShapes(font, txt, 0, 0, 100)) forme.push({ kind: 'glifa', ...g });
forme.push({ kind: 'gogoasa-aceeasi-orientare', subs: [circle(0, 0, 50).subs[0], circle(0, 0, 25).subs[0]] });
forme.push({ kind: 'gogoasa-orientari-opuse', subs: [circle(0, 0, 50).subs[0], circle(0, 0, 25, true).subs[0]] });
{ const segs = [], P = []; for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * 4 * Math.PI / 5; P.push([50 * Math.cos(a), 50 * Math.sin(a)]); }
  for (let i = 0; i < 5; i++) segs.push({ t: 'L', x0: P[i][0], y0: P[i][1], x1: P[(i + 1) % 5][0], y1: P[(i + 1) % 5][1] }); forme.push({ kind: 'pentagrama', subs: [{ segs, closed: true }] }); }
forme.push({ kind: 'doua-cercuri-suprapuse', subs: [circle(0, 0, 40).subs[0], circle(40, 0, 40).subs[0]] });
const rnd = mulberry32(77); const out = {};
for (const f of forme) {
  const bb = shapeBBox(f); const o = out[f.kind] = out[f.kind] || { puncte: 0, pline_nonzero: 0, pline_evenodd: 0, difera: 0 };
  for (let i = 0; i < 4000; i++) {
    const x = bb[0] + rnd() * (bb[2] - bb[0]), y = bb[1] + rnd() * (bb[3] - bb[1]);
    const a = inside(f, x, y, 'nonzero'), b = inside(f, x, y, 'evenodd'); o.puncte++; if (a) o.pline_nonzero++; if (b) o.pline_evenodd++; if (a !== b) o.difera++;
  }
}
console.log(JSON.stringify(out, null, 1)); fs.writeFileSync('glife-reguli.json', JSON.stringify(out, null, 1));
