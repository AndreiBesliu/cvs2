// Oracol de STRUCTURA pe inelele de buzunar: zig-zag (segment scurt intors la AMBELE capete = drumul merge inapoi
// peste el insusi) si varfuri suprapuse (intoarcere de 180 grade cu segmentul urmator peste cel anterior).
// Colturile ascutite legitime (varful unei felii pe axa mediala) nu se numara: acolo drumul NU se suprapune.
import fs from 'node:fs';
import { glyph, shapeFromRegion, shapeOut } from './comun.mjs';
import { P, dSeg } from './oracol-v1.mjs';
const FONTS = [['Arial', 'C:/Windows/Fonts/arial.ttf'], ['Times New Roman', 'C:/Windows/Fonts/times.ttf'], ['Segoe Script', 'C:/Windows/Fonts/segoesc.ttf'], ['Gabriola', 'C:/Windows/Fonts/Gabriola.ttf']];
const dir = (s, t) => { const a = P(s, Math.max(0, t - 1e-7)), b = P(s, Math.min(1, t + 1e-7)); const l = Math.hypot(b[0] - a[0], b[1] - a[1]); return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; };
const len = (s) => s.k === 'A' ? Math.abs(s.da) * s.r : Math.hypot(s.x1 - s.x0, s.y1 - s.y0);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const tot = { bucle: 0, seg: 0, zigzag: 0, varfSuprapus: 0, colturiAscutiteLegitime: 0, micro1um: 0, exemple: [] };
for (const [r, step, sizes] of [[3.175, 2.54, [30, 200]], [1.5875, 1.27, [30]]]) for (const [fn, file] of FONTS) for (const ch of ['B', 'g', '&', 'S']) for (const H of sizes) {
  const sh0 = shapeFromRegion(glyph(file, ch, H), 0.002);
  for (let k = 0; k < 200; k++) {
    const o = shapeOut(sh0.parallelOffset(r + step * k)); const loops = [...o.ccw, ...o.cw]; if (!loops.length) break;
    for (const c of loops) {
      tot.bucle++; const n = c.segs.length;
      for (let i = 0; i < n; i++) {
        const a = c.segs[(i - 1 + n) % n], s = c.segs[i], b = c.segs[(i + 1) % n]; tot.seg++;
        if (len(s) < 1e-3) tot.micro1um++;
        const din = dot(dir(a, 1), dir(s, 0)), dout = dot(dir(s, 1), dir(b, 0));
        if (len(s) < 0.01 && din < -0.9 && dout < -0.9) { tot.zigzag++; if (tot.exemple.length < 8) tot.exemple.push(`zigzag: ${fn} ${ch} H=${H} r=${r} k=${k}, segment ${i} de ${len(s).toExponential(2)} mm`); continue; }
        if (dout < -0.999) {
          // suprapunere: un punct de la inceputul lui b sta pe s (sau invers)?
          const lb = len(b), ls = len(s), t = Math.min(0.5, 1e-3 / Math.max(lb, 1e-12));
          const q = P(b, t), q2 = P(s, 1 - Math.min(0.5, 1e-3 / Math.max(ls, 1e-12)));
          if (dSeg(s, q[0], q[1]) < 1e-7 || dSeg(b, q2[0], q2[1]) < 1e-7) { tot.varfSuprapus++; if (tot.exemple.length < 8) tot.exemple.push(`varf suprapus: ${fn} ${ch} H=${H} r=${r} k=${k}, jonctiunea ${i}`); }
          else tot.colturiAscutiteLegitime++;
        }
      }
    }
  }
}
console.log(JSON.stringify(tot, null, 1));
fs.writeFileSync('rez-a-zigzag.json', JSON.stringify(tot, null, 1));
