// (c) continuare: cat de des intoarce cavalier bucle DESCHISE (sau pierde forma) pe intrari dense inchise, simple.
// Baleiaj al distantei d; oracolul structural: intrare inchisa, fara autointersectii => fiecare iesire trebuie sa fie
// inchisa; aria iesirii comparata cu aria calculata independent (oracol-v1 pe adevarul de nivel nu e necesar aici:
// orice bucla deschisa e o eroare de structura, iar o iesire goala cand raza inscrisa > d e o pierdere).
import fs from 'node:fs';
import * as cc from 'cavalier-contours-js';
import { contourToLA } from '../geom.mjs';

const wavyR = (t) => 50 + 8 * Math.sin(5 * t) + 3 * Math.sin(13 * t);
const curves = {
  ondulata: (N) => Array.from({ length: N }, (_, i) => { const t = 2 * Math.PI * i / N, r = wavyR(t); return [r * Math.cos(t), r * Math.sin(t), 0]; }),
  elipsa: (N) => Array.from({ length: N }, (_, i) => { const t = 2 * Math.PI * i / N; return [100 * Math.cos(t), 50 * Math.sin(t), 0]; }),
  // stea rotunjita (DXF tipic de la decupaj): r(t) = 60 + 15 cos(7t)
  floare: (N) => Array.from({ length: N }, (_, i) => { const t = 2 * Math.PI * i / N, r = 60 + 15 * Math.cos(7 * t); return [r * Math.cos(t), r * Math.sin(t), 0]; }),
};
const res = [];
const ds = []; for (let d = 0.25; d <= 30; d += 0.25) ds.push(+d.toFixed(2));
function sweep(name, mk, N, opts, label) {
  const pl = cc.plineClosed(mk(N));
  let deschise = 0, goale = 0, total = 0, exceptii = 0; const ex = [];
  const t0 = performance.now();
  for (const d of ds) for (const sg of [1, -1]) {
    total++;
    let r; try { r = opts ? pl.parallelOffsetOpt(sg * d, { ...cc.defaultPlineOffsetOptions(), ...opts }) : pl.parallelOffset(sg * d); } catch (e) { exceptii++; if (ex.length < 6) ex.push(`d=${sg * d}: exceptie ${e.message}`); continue; }
    const open = r.filter((q) => !q.isClosed).length;
    if (open) { deschise++; if (ex.length < 6) ex.push(`d=${sg * d}: ${r.length} rezultate, ${open} deschise`); }
    if (!r.length && sg < 0) { goale++; if (ex.length < 6) ex.push(`d=${sg * d}: gol (offset exterior!)`); }
  }
  const rec = { curba: name, N, optiuni: label || "implicite", total, deschise, exceptii, goaleExterior: goale, ms: performance.now() - t0, exemple: ex };
  res.push(rec);
  console.log(`${name.padEnd(9)} N=${String(N).padStart(5)} ${String(label || 'implicite').padEnd(28)} offseturi ${total}: DESCHISE ${deschise} | exceptii ${exceptii} | gol la exterior ${goale} | ${rec.ms.toFixed(0)} ms | ${ex.slice(0, 3).join('; ')}`);
}
const RAPID = process.argv.includes("--rapid");
if (RAPID) sweep("ondulata", curves.ondulata, 5000); else for (const [name, mk] of Object.entries(curves)) for (const N of [200, 1000, 5000]) sweep(name, mk, N);
// optiuni: tratarea autointersectiilor si epsilon-uri diferite, pe cazul cel mai rau
if (!RAPID) for (const [o, lab] of [[{ handleSelfIntersects: true }, 'handleSelfIntersects'], [{ sliceJoinEps: 1e-6, offsetDistEps: 1e-6, posEqualEps: 1e-7 }, 'eps x0,01'], [{ sliceJoinEps: 1e-3, offsetDistEps: 1e-3, posEqualEps: 1e-4 }, 'eps x10']]) sweep('ondulata', curves.ondulata, 5000, o, lab);
// aceeasi curba trecuta intai prin biarce (pipeline-ul s1: puncte -> cubice Catmull-Rom -> biarce 0,002): mai putine segmente netede
{
  const N = 5000, P = curves.ondulata(400);
  // Catmull-Rom inchis prin 400 de puncte -> cubice -> biarce proprii (geom.mjs, codul s1)
  const segs = [];
  for (let i = 0; i < P.length; i++) { const p0 = P[(i - 1 + P.length) % P.length], p1 = P[i], p2 = P[(i + 1) % P.length], p3 = P[(i + 2) % P.length]; segs.push({ k: 'C', x0: p1[0], y0: p1[1], x1: p1[0] + (p2[0] - p0[0]) / 6, y1: p1[1] + (p2[1] - p0[1]) / 6, x2: p2[0] - (p3[0] - p1[0]) / 6, y2: p2[1] - (p3[1] - p1[1]) / 6, x3: p2[0], y3: p2[1] }); }
  const la = contourToLA({ closed: true, segs }, 0.002);
  const v = la.segs.map((s) => s.k === 'A' ? [s.cx + s.r * Math.cos(s.a0), s.cy + s.r * Math.sin(s.a0), Math.tan(s.da / 4)] : [s.x0, s.y0, 0]);
  sweep('ondulata biarce', () => v, la.segs.length);
}
fs.writeFileSync(RAPID ? "rez-c2-dens-rapid.json" : "rez-c2-dens.json", JSON.stringify(res, null, 1));
