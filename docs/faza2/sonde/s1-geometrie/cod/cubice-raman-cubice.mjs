// Verifica: dupa boolean, cubicele glifei raman cubice si stau EXACT pe curbele de intrare.
// Oracol: distanta fiecarui punct al iesirii la frontierele intrarilor (polilinii foarte dese), in ambele sensuri.
import { glyph } from './robustete.mjs';
import { circle, quadToCubic, countKinds } from './geom.mjs';
import { densePolys, makeDistIndex, distTo } from './oracol.mjs';
import * as AD from './adaptoare.mjs';
const rows = [];
for (const S of [100, 2440]) {
  const A = glyph('B', S, 0, 0, 0.2).map((c) => ({ closed: true, segs: c.segs.map((s) => (s.k === 'Q' ? quadToCubic(s) : s)) }));
  const B = [circle(S * 0.35, S * 0.4, S * 0.22)];
  const h = S / 200000;
  const idx = makeDistIndex(densePolys([...A, ...B], h), S / 200);
  for (const L of [AD.skia, AD.paperjs, AD.flatten]) for (const op of ['union', 'diff']) {
    try {
      const out = L.bool(A, B, op, { tolFit: S * 1e-6 });
      let dev = 0; for (const P of densePolys(out, S / 20000)) for (const p of P) dev = Math.max(dev, distTo(idx, p[0], p[1]));
      const k = countKinds(out);
      rows.push(`${L.nume.slice(0, 30).padEnd(30)} S=${String(S).padEnd(4)} ${op.padEnd(5)} -> ${k.L}L ${k.A}A ${k.C}C ${k.Q}Q ${k.K}K /${k.contururi}c | abatere fata de intrari: ${dev.toExponential(2)} mm (${(dev / S).toExponential(1)} relativ)`);
    } catch (e) { rows.push(`${L.nume} S=${S} ${op} EROARE ${e.message}`); }
  }
}
console.log(rows.join('\n'));
