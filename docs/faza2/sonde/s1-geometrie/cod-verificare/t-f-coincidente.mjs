// (f) PathKit cu muchii coincidente si gauri: glifa ∪ aceeasi glifa; glifa − aceeasi glifa mutata cu 1e-6 mm;
// XOR intre contururi imbricate (arie exacta pe hartie: formula lentilei, includere-excludere).
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { glyph, orientByDepth } from './comun.mjs';
import { distIndex, dist, area, samplesOf, dSeg, P } from './oracol-v1.mjs';
import { arcToConics, conicToArc } from '../geom.mjs';
const require = createRequire(import.meta.url);
const PK = await require('pathkit-wasm/bin/pathkit.js')({ wasmBinary: fs.readFileSync(new URL('../node_modules/pathkit-wasm/bin/pathkit.wasm', import.meta.url)) });

function toPK(region, dx = 0, dy = 0) {
  const p = PK.NewPath(); p.setFillType(PK.FillType.EVENODD);
  for (const c of region) { const s0 = P(c.segs[0], 0); p.moveTo(s0[0] + dx, s0[1] + dy); for (const s of c.segs) { if (s.k === 'L') p.lineTo(s.x1 + dx, s.y1 + dy); else if (s.k === 'Q') p.quadTo(s.x1 + dx, s.y1 + dy, s.x2 + dx, s.y2 + dy); else if (s.k === 'A') for (const k of arcToConics(s)) p.conicTo(k.x1 + dx, k.y1 + dy, k.x2 + dx, k.y2 + dy, k.w); } p.close(); }
  return p;
}
function fromPK(p) {
  const out = []; let cur = null, x = 0, y = 0, sx = 0, sy = 0;
  for (const c of p.toCmds()) {
    const v = c[0];
    if (v === PK.MOVE_VERB) { if (cur && cur.segs.length) out.push(cur); cur = { closed: false, segs: [] }; x = sx = c[1]; y = sy = c[2]; }
    else if (v === PK.LINE_VERB) { cur.segs.push({ k: 'L', x0: x, y0: y, x1: c[1], y1: c[2] }); x = c[1]; y = c[2]; }
    else if (v === PK.QUAD_VERB) { cur.segs.push({ k: 'Q', x0: x, y0: y, x1: c[1], y1: c[2], x2: c[3], y2: c[4] }); x = c[3]; y = c[4]; }
    else if (v === PK.CUBIC_VERB) { cur.segs.push({ k: 'C', x0: x, y0: y, x1: c[1], y1: c[2], x2: c[3], y2: c[4], x3: c[5], y3: c[6] }); x = c[5]; y = c[6]; }
    else if (v === PK.CONIC_VERB) { const s = { k: 'K', x0: x, y0: y, x1: c[1], y1: c[2], x2: c[3], y2: c[4], w: c[5] }; cur.segs.push(conicToArc(s, 1e-5) || s); x = c[3]; y = c[4]; }
    else if (v === PK.CLOSE_VERB) { if (Math.hypot(x - sx, y - sy) > 0) cur.segs.push({ k: 'L', x0: x, y0: y, x1: sx, y1: sy }); cur.closed = true; out.push(cur); cur = null; x = sx; y = sy; }
  }
  if (cur && cur.segs.length) out.push(cur);
  return out;
}
const op = (a, b, o) => { const r = PK.MakeFromOp(a, b, o); const out = r ? fromPK(r) : null; r && r.delete(); return out; };
const absArea = (reg) => reg.reduce((s, c) => s + Math.abs(area([c])), 0);
const res = [];
const GL = [['Arial', 'C:/Windows/Fonts/arial.ttf', 'B'], ['Arial', 'C:/Windows/Fonts/arial.ttf', '&'], ['Arial', 'C:/Windows/Fonts/arial.ttf', '®'], ['Arial', 'C:/Windows/Fonts/arial.ttf', '8'], ['Times New Roman', 'C:/Windows/Fonts/times.ttf', '&'], ['Segoe Script', 'C:/Windows/Fonts/segoesc.ttf', 'B'], ['Gabriola', 'C:/Windows/Fonts/Gabriola.ttf', 'g']];
const RAPID = process.argv.includes('--rapid');
for (const [fn, file, ch] of (RAPID ? GL.slice(0, 3) : GL)) for (const [H, ox, oy] of [[100, 0, 0], [100, 2440, 1220]]) {
  const G = orientByDepth(glyph(file, ch, H, ox, oy));
  const ix = distIndex(G); const A0 = area(G); const perim = samplesOf(G, 0.01).length * 0.01;
  // 1) G ∪ G
  const a = toPK(G), b = toPK(G);
  const U = op(a, b, PK.PathOp.UNION);
  let e = 0; for (const p of samplesOf(U, 0.02)) e = Math.max(e, dist(ix, p[0], p[1]));
  const segsU = U.flatMap((c) => c.segs); let h = 0; for (const q of samplesOf(G, 0.05)) { let m = Infinity; for (const s of segsU) { const v = s.k === 'K' ? Infinity : dSeg(s, q[0], q[1]); if (v < m) m = v; } h = Math.max(h, m); }
  const rU = { caz: `${fn} ${ch} ∪ ea insasi`, H, la: `(${ox},${oy})`, contururiIn: G.length, contururiOut: U.length, arieRel: (area(orientByDepth(U)) - A0) / A0, iesireAdevar: e, adevarIesire: h };
  // 2) G − (G mutata cu 1e-6 mm pe x si pe y)
  const out2 = [];
  for (const [dx, dy] of [[1e-6, 0], [0, 1e-6], [1e-6, 1e-6]]) {
    const c2 = toPK(G, dx, dy); const D = op(a, c2, PK.PathOp.DIFFERENCE); c2.delete();
    let e2 = 0; for (const p of samplesOf(D, 0.02)) e2 = Math.max(e2, dist(ix, p[0], p[1]));
    out2.push({ dx, dy, contururi: D.length, arie: absArea(D), arieMaxPermisa: perim * Math.hypot(dx, dy) + perim * 1e-5, departareMaxDeFrontiera: D.length ? e2 : 0 });
  }
  a.delete(); b.delete();
  rU.diferenta1e6 = out2;
  rU.ok = rU.contururiOut === rU.contururiIn && Math.abs(rU.arieRel) < 1e-6 && e < 1e-4 * Math.max(1, (ox + H) / 100) && out2.every((o) => o.arie <= o.arieMaxPermisa && o.departareMaxDeFrontiera < 1e-4 * Math.max(1, (ox + H) / 100));
  res.push(rU);
  console.log(`${rU.ok ? 'OK  ' : 'PICA'} ${rU.caz.padEnd(26)} H=${H} la ${rU.la.padEnd(12)} contururi ${rU.contururiIn}->${rU.contururiOut} | arie rel ${rU.arieRel.toExponential(2)} | iesire->adevar ${e.toExponential(2)} | adevar->iesire ${h.toExponential(2)} | G−G(1e-6): ${out2.map((o) => `${o.contururi} ctr, arie ${o.arie.toExponential(1)} (perm. ${o.arieMaxPermisa.toExponential(1)}), dep. ${o.departareMaxDeFrontiera.toExponential(1)}`).join(' ; ')}`);
}
// 3) XOR intre contururi imbricate: A = discuri r 30/20/10 imbricate (par-impar), B = la fel, centrat in (3,1)
const lens = (r1, r2, d) => { if (d >= r1 + r2) return 0; if (d <= Math.abs(r1 - r2)) return Math.PI * Math.min(r1, r2) ** 2; const a1 = Math.acos((d * d + r1 * r1 - r2 * r2) / (2 * d * r1)), a2 = Math.acos((d * d + r2 * r2 - r1 * r1) / (2 * d * r2)); return r1 * r1 * a1 + r2 * r2 * a2 - 0.5 * Math.sqrt((-d + r1 + r2) * (d + r1 - r2) * (d - r1 + r2) * (d + r1 + r2)); };
for (const [cx, cy, scale] of [[3, 1, 1], [3, 1, 40], [0.001, 0, 1]]) {
  const R = [30, 20, 10].map((r) => r * scale), sg = [1, -1, 1];
  const circ = (x, y, r) => ({ closed: true, segs: [{ k: 'A', cx: x, cy: y, r, a0: 0, da: Math.PI }, { k: 'A', cx: x, cy: y, r, a0: Math.PI, da: Math.PI }] });
  const A = R.map((r) => circ(0, 0, r)), B = R.map((r) => circ(cx * scale, cy * scale, r));
  const d = Math.hypot(cx, cy) * scale;
  const areaA = R.reduce((s, r, i) => s + sg[i] * Math.PI * r * r, 0);
  let inter = 0; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) inter += sg[i] * sg[j] * lens(R[i], R[j], d);
  const exact = 2 * areaA - 2 * inter;
  const a = toPK(A), b = toPK(B); const X = op(a, b, PK.PathOp.XOR); a.delete(); b.delete();
  // aria iesirii cu semn par-impar: suma ariilor absolute cu semnul dat de adancimea de includere (orientByDepth)
  const Xo = orientByDepth(X.map((c) => ({ closed: true, segs: c.segs })));
  const aX = area(Xo);
  const arcs = X.reduce((s, c) => s + c.segs.filter((q) => q.k === 'A').length, 0), conics = X.reduce((s, c) => s + c.segs.filter((q) => q.k === 'K').length, 0);
  // abaterea frontierei fata de cele 6 cercuri-sursa
  let dev = 0; for (const p of samplesOf(X.map((c) => ({ closed: true, segs: c.segs.filter((q) => q.k !== 'K') })), 0.05 * scale)) { let m = Infinity; for (const r of R) { m = Math.min(m, Math.abs(Math.hypot(p[0], p[1]) - r), Math.abs(Math.hypot(p[0] - cx * scale, p[1] - cy * scale) - r)); } dev = Math.max(dev, m); }
  const rec = { caz: `XOR imbricat, centru B (${cx * scale},${cy * scale}), raze x${scale}`, arieExacta: exact, arieIesire: aX, eroareRel: (aX - exact) / exact, contururi: X.length, arce: arcs, conice: conics, abatereFrontiera: dev };
  rec.ok = Math.abs(rec.eroareRel) < 1e-6 && conics === 0;
  res.push(rec);
  console.log(`${rec.ok ? 'OK  ' : 'PICA'} ${rec.caz.padEnd(46)} arie ${aX.toFixed(6)} vs hartie ${exact.toFixed(6)} (rel ${rec.eroareRel.toExponential(2)}) | ${X.length} contururi, ${arcs} arce, ${conics} conice | abatere ${dev.toExponential(2)}`);
}
// CONTROL NEGATIV: o "reuniune" stricata (intoarce doar primul contur) trebuie sa pice pe numarul de contururi
{ const G = orientByDepth(glyph('C:/Windows/Fonts/arial.ttf', 'B', 100)); const a = toPK(G), b = toPK(G); const U = op(a, b, PK.PathOp.UNION).slice(0, 1); a.delete(); b.delete(); console.log(`CONTROL (reuniune care pierde gaurile): contururi ${G.length}->${U.length}: ${U.length !== G.length ? 'PRINS' : 'NEPRINS'}`); res.push({ control: 'pierde gauri', prins: U.length !== G.length }); }
fs.writeFileSync(RAPID ? 'rez-f-coincidente-rapid.json' : 'rez-f-coincidente.json', JSON.stringify(res, null, 1));
