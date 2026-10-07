// C3: lantul cubica -> biarce proprii (geom.mjs din s1) -> offset cavalier -> G2/G3.
// (i) fitter-ul: abaterea REALA (ambele sensuri, oracol exact) fata de toleranta declarata, pe glife si pe cubice grele
// (varf ascutit/cusp, bucla, puncte de control confundate, aproape dreapta, inflexiune dubla).
// (ii) G-code: arcele iesite (inclusiv cele aproape drepte) trecute prin regula GRBL de verificare a arcului, in float32.
import fs from 'node:fs';
import { cubicToBiarcs, contourToLA } from '../geom.mjs';
import { dSeg, P, samplesOf, grblArcCheck } from './oracol-v1.mjs';
import { glyph, toPlines, fromPline, shapeFromRegion, shapeOut, cc } from './comun.mjs';

const res = { fitter: [], cubiceGrele: [], gcode: [] };
const RAPID = process.argv.includes("--rapid"); // --rapid: fitter-ul doar pe Arial B g &
// ---------- (i) fitter pe glife ----------
const FONTS = [['Arial', 'C:/Windows/Fonts/arial.ttf'], ['Times New Roman', 'C:/Windows/Fonts/times.ttf'], ['Segoe Script', 'C:/Windows/Fonts/segoesc.ttf'], ['Gabriola', 'C:/Windows/Fonts/Gabriola.ttf']];
for (const tol of [0.002, 0.01]) {
  let worst = 0, n = 0, segs = 0, worstAt = '';
  for (const [fn, file] of (RAPID ? FONTS.slice(0, 1) : FONTS)) for (const ch of (RAPID ? ["B", "g", "&"] : ["B", "g", "&", "S", "e", "R", "@"])) {
    const G = glyph(file, ch, 100);
    for (const c of G) for (const s of c.segs) {
      if (s.k !== 'Q') continue; n++;
      const la = contourToLA({ closed: false, segs: [s] }, tol); segs += la.segs.length;
      // iesire -> curba si curba -> iesire, cu distanta exacta la patratica
      let e = 0; for (const p of samplesOf([la], tol / 4)) e = Math.max(e, dSeg(s, p[0], p[1]));
      for (let i = 0; i <= 400; i++) { const q = P(s, i / 400); let m = Infinity; for (const a of la.segs) m = Math.min(m, dSeg(a, q[0], q[1])); e = Math.max(e, m); }
      if (e > worst) { worst = e; worstAt = `${fn} ${ch}`; }
    }
  }
  res.fitter.push({ tol, patratice: n, arce: segs, abatereMax: worst, raport: worst / tol, unde: worstAt });
  console.log(`fitter tol ${tol}: ${n} patratice -> ${segs} arce | abatere max ${worst.toExponential(4)} = ${(worst / tol).toFixed(4)} x tol (${worstAt})`);
}
// ---------- (i') cubice grele ----------
const C = (x0, y0, x1, y1, x2, y2, x3, y3) => ({ k: 'C', x0, y0, x1, y1, x2, y2, x3, y3 });
const hard = [
  ['cusp (varf ascutit)', C(0, 0, 30, 30, -10, 30, 20, 0)],
  ['bucla (autointersectie)', C(0, 0, 40, 30, -20, 30, 20, 0)],
  ['P1 = P0 (tangenta nedefinita la capat)', C(0, 0, 0, 0, 20, 30, 40, 0)],
  ['P1 = P0 si P2 = P3', C(0, 0, 0, 0, 40, 0, 40, 0)],
  ['aproape dreapta (control la 1e-6)', C(0, 0, 10, 1e-6, 20, -1e-6, 30, 0)],
  ['coliniara cu intoarcere (merge inapoi)', C(0, 0, 30, 0, -10, 0, 20, 0)],
  ['inflexiune dubla (S strans)', C(0, 0, 50, 40, -40, 40, 10, 0)],
  ['minuscula (0,01 mm)', C(0, 0, 0.004, 0.003, 0.008, -0.003, 0.01, 0)],
  ['uriasa (2 440 mm)', C(0, 0, 800, 1200, 1600, -1200, 2440, 0)],
];
for (const [name, s] of hard) {
  let la, err = null; const t0 = performance.now();
  try { la = { closed: false, segs: cubicToBiarcs(s, 0.002) }; } catch (e) { err = e.message; }
  const ms = performance.now() - t0;
  if (err) { res.cubiceGrele.push({ caz: name, eroare: err }); console.log(name, 'EROARE', err); continue; }
  const nan = la.segs.some((q) => Object.values(q).some((v) => typeof v === 'number' && !Number.isFinite(v)));
  let e = 0, gol = 0;
  if (!nan) {
    const lenLa = la.segs.reduce((a, q) => a + (q.k === "A" ? Math.abs(q.da) * q.r : Math.hypot(q.x1 - q.x0, q.y1 - q.y0)), 0);
    for (const p of samplesOf([la], Math.max(0.0005, lenLa / 20000))) e = Math.max(e, dSeg(s, p[0], p[1]));
    for (let i = 0; i <= 2000; i++) { const q = P(s, i / 2000); let m = Infinity; for (const a of la.segs) m = Math.min(m, dSeg(a, q[0], q[1])); e = Math.max(e, m); }
    for (let i = 0; i + 1 < la.segs.length; i++) { const a = P(la.segs[i], 1), b = P(la.segs[i + 1], 0); gol = Math.max(gol, Math.hypot(a[0] - b[0], a[1] - b[1])); }
    const a = P(la.segs[0], 0), b = P(la.segs[la.segs.length - 1], 1); gol = Math.max(gol, Math.hypot(a[0] - s.x0, a[1] - s.y0), Math.hypot(b[0] - s.x3, b[1] - s.y3));
  }
  const maxR = Math.max(0, ...la.segs.filter((q) => q.k === 'A').map((q) => q.r));
  const rec = { caz: name, segmente: la.segs.length, arce: la.segs.filter((q) => q.k === 'A').length, abatereMax: nan ? null : e, raport: nan ? null : e / 0.002, gol, nan, razaMax: maxR, ms };
  res.cubiceGrele.push(rec);
  console.log(`${(rec.raport !== null && rec.raport <= 1.01 && !nan && gol < 1e-9 ? 'OK  ' : 'PICA')} ${name.padEnd(40)} ${rec.segmente} seg (${rec.arce} arce) | abatere ${nan ? 'NaN' : e.toExponential(3)} = ${nan ? '-' : rec.raport.toFixed(3)} x tol | gol ${gol.toExponential(1)} | raza max ${maxR.toExponential(2)} | ${ms.toFixed(1)} ms`);
}
// ---------- (ii) G-code: emitentul s1 (copiat 1:1 din gcode-demo.mjs) + verificarea GRBL in float32 ----------
function emitLike(region) {
  const f = (v) => (Math.abs(v) < 5e-5 ? 0 : v).toFixed(4);
  const L = [];
  for (const c of region) { const s0 = c.segs[0]; const st = s0.k === 'L' ? [s0.x0, s0.y0] : [s0.cx + s0.r * Math.cos(s0.a0), s0.cy + s0.r * Math.sin(s0.a0)]; L.push(`G0 X${f(st[0])} Y${f(st[1])}`); let cx = st[0], cy = st[1];
    for (const s of c.segs) { if (s.k === 'L') { L.push(`G1 X${f(s.x1)} Y${f(s.y1)}`); cx = s.x1; cy = s.y1; } else { const ex = s.cx + s.r * Math.cos(s.a0 + s.da), ey = s.cy + s.r * Math.sin(s.a0 + s.da); L.push(`${s.da < 0 ? 'G2' : 'G3'} X${f(ex)} Y${f(ey)} I${f(s.cx - cx)} J${f(s.cy - cy)}`); cx = ex; cy = ey; } } }
  return L;
}
function grblCheck(lines) {
  let x = 0, y = 0, arcs = 0, err33 = 0, maxIJ = 0, maxDr = 0; const ex = [];
  for (const line of lines) { const w = {}; for (const m of line.matchAll(/([GXYIJ])(-?\d+(?:\.\d+)?)/g)) w[m[1]] = parseFloat(m[2]); const nx = w.X ?? x, ny = w.Y ?? y;
    if (w.G === 2 || w.G === 3) { arcs++; const r = grblArcCheck(x, y, nx, ny, w.I, w.J); maxIJ = Math.max(maxIJ, Math.abs(w.I), Math.abs(w.J)); maxDr = Math.max(maxDr, r.dr); if (r.err33) { err33++; if (ex.length < 3) ex.push(line.slice(0, 90)); } }
    x = nx; y = ny; }
  return { arce: arcs, error33: err33, maxIJ, maxDeltaR: maxDr, exemple: ex };
}
// 1) inelele de buzunar ale lui Arial B la 200 mm
{ const sh0 = shapeFromRegion(glyph('C:/Windows/Fonts/arial.ttf', 'B', 200), 0.002); const all = []; for (let k = 0; k < 50; k++) { const o = shapeOut(sh0.parallelOffset(3.175 + 2.54 * k)); const L = [...o.ccw, ...o.cw]; if (!L.length) break; all.push(...L); }
  const g = grblCheck(emitLike(all)); res.gcode.push({ caz: 'buzunar Arial B 200 mm', ...g }); console.log(`G-code buzunar Arial B 200: ${g.arce} arce, error:33 ${g.error33}, |I|,|J| max ${g.maxIJ.toFixed(1)}, delta r max ${g.maxDeltaR.toExponential(2)}`); }
// 2) dreptunghi cu laturi-arc aproape drepte (bulge 1e-9..1e-6), decalat cu 3,175: cum ar ajunge un DXF cu bulge-uri reziduale
for (const b of [1e-9, 1e-8, 1e-7, 1e-6, 1e-5]) {
  const pl = cc.plineClosed([[0, 0, b], [100, 0, b], [100, 60, b], [0, 60, b]]);
  const loops = pl.parallelOffset(-3.175).map(fromPline);
  const g = grblCheck(emitLike(loops));
  const rmax = Math.max(...loops.flatMap((c) => c.segs.filter((q) => q.k === 'A').map((q) => q.r)));
  res.gcode.push({ caz: `laturi-arc bulge ${b}`, razaMaxArc: rmax, ...g });
  console.log(`G-code laturi-arc bulge ${b}: raza max ${rmax.toExponential(2)} mm | ${g.arce} arce, error:33 ${g.error33} | |I|,|J| max ${g.maxIJ.toExponential(2)} | delta r (float32) max ${g.maxDeltaR.toExponential(2)} ${g.exemple[0] ? '| ex: ' + g.exemple[0] : ''}`);
}
// 3) cubica aproape dreapta din fitter (arce cu raza pana la 1e7 x coarda)
{ const la = { closed: false, segs: cubicToBiarcs(C(0, 0, 100, 0.01, 200, -0.01, 300, 0), 0.002) }; const g = grblCheck(emitLike([la])); const rmax = Math.max(0, ...la.segs.filter((q) => q.k === 'A').map((q) => q.r)); res.gcode.push({ caz: 'cubica aproape dreapta (300 mm, sageata 0,01)', razaMaxArc: rmax, ...g }); console.log(`G-code cubica aproape dreapta: raza max ${rmax.toExponential(2)} | ${g.arce} arce, error:33 ${g.error33}, |I|,|J| max ${g.maxIJ.toExponential(2)}`); }
// CONTROL NEGATIV pentru verificarea GRBL: un arc cu capatul mutat 0,6 mm trebuie respins
{ const r = grblArcCheck(10, 0, 0, 10.6, -10, 0); console.log(`CONTROL GRBL: arc stricat 0,6 mm -> error:33 ${r.err33 ? 'PRINS' : 'NEPRINS'}`); res.controlGrbl = r.err33; }
fs.writeFileSync(RAPID ? "rez-c3-lant-rapid.json" : "rez-c3-lant.json", JSON.stringify(res, null, 1));
