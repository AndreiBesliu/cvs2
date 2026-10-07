// text.mjs - text in curbe cu definitia "inaltimea textului = inaltimea majusculei" (cap height).
// Corpul em se DERIVA: em = h * unitsPerEm / capHeight. capHeight vine din OS/2.sCapHeight si TREBUIE
// sa fie de acord cu conturul lui 'H' (a doua sursa); altfel refuzam (fontul minte).
import * as ot from 'opentype.js';
import fs from 'node:fs';
import { line, quadToCubic, cubic } from './geom.mjs';

const opentype = ot.default ?? ot;
export function loadFont(path) {
  const buf = fs.readFileSync(path);
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
}
export function capHeightUnits(font) {
  const os2 = font.tables.os2?.sCapHeight;
  const hTop = font.charToGlyph('H').getBoundingBox().y2;
  if (os2 && Math.abs(os2 - hTop) > 2) throw new Error(`capHeight in dezacord: OS/2=${os2}, H=${hTop}`);
  return os2 || hTop;
}
// Intoarce forme (cate una pe glifa) in mm, Y in sus, cu linia de baza la (x0, y0).
export function textToShapes(font, text, x0, y0, capHeightMm, layer) {
  const cap = capHeightUnits(font);
  const em = (capHeightMm * font.unitsPerEm) / cap;
  const shapes = [];
  const glyphs = font.stringToGlyphs(text);
  let x = x0;
  for (let gi = 0; gi < glyphs.length; gi++) {
    const g = glyphs[gi];
    const path = g.getPath(x, 0, em); // Y in jos, linia de baza y = 0
    const subpaths = []; let cur = null, start = null, pen = null;
    const P = (px, py) => [px, y0 - py];
    // opentype.js 2.0 nu emite 'Z' pentru glife: conturul se inchide geometric (capatul = startul)
    const close = () => { if (cur && cur.segs.length && pen && Math.abs(pen[0] - start[0]) < 1e-9 && Math.abs(pen[1] - start[1]) < 1e-9) cur.closed = true; };
    for (const c of path.commands) {
      if (c.type === 'M') { close(); if (cur && cur.segs.length) subpaths.push(cur); cur = { segs: [], closed: false }; start = P(c.x, c.y); pen = start; }
      else if (c.type === 'L') { const q = P(c.x, c.y); if (q[0] !== pen[0] || q[1] !== pen[1]) cur.segs.push(line(pen, q)); pen = q; }
      else if (c.type === 'Q') { const q = P(c.x, c.y); cur.segs.push(quadToCubic(pen, P(c.x1, c.y1), q)); pen = q; }
      else if (c.type === 'C') { const q = P(c.x, c.y); cur.segs.push(cubic(pen, P(c.x1, c.y1), P(c.x2, c.y2), q)); pen = q; }
      else if (c.type === 'Z') { if (pen[0] !== start[0] || pen[1] !== start[1]) cur.segs.push(line(pen, start)); cur.closed = true; pen = start; }
    }
    close();
    if (cur && cur.segs.length) subpaths.push(cur);
    if (subpaths.length) shapes.push({ name: `glifa '${text[gi]}'`, layer, char: text[gi], subpaths });
    let adv = g.advanceWidth * (em / font.unitsPerEm);
    if (gi + 1 < glyphs.length) adv += font.getKerningValue(g, glyphs[gi + 1]) * (em / font.unitsPerEm);
    x += adv;
  }
  return { shapes, em, cap, upem: font.unitsPerEm };
}
