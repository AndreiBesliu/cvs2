// (b) Schimbari de topologie: haltera cu gat subtire (offset interior o rupe in 2), doua cercuri apropiate
// (offset exterior le uneste), C cu fanta de 0,05 mm (offset exterior inchide fanta -> apare o gaura), pieptene cu 20 de dinti.
// Intrarea e din linii+arce (fara biarce): orice abatere peste ~1e-9 e a lui cavalier. Numarul de bucle asteptat e pe hartie.
import fs from 'node:fs';
import { cc, toPlines, fromPline, fmt } from './comun.mjs';
import { makeTruth, checkOffset } from './adevar.mjs';

const L = (x0, y0, x1, y1) => ({ k: 'L', x0, y0, x1, y1 });
const A = (cx, cy, r, a0, da) => ({ k: 'A', cx, cy, r, a0, da });
const circle = (cx, cy, r) => ({ closed: true, segs: [A(cx, cy, r, 0, Math.PI), A(cx, cy, r, Math.PI, Math.PI)] });

// haltera: cercuri R=20 la (+-30,0), gat |y| < w = 3
function dumbbell(w = 3, R = 20, c = 30) {
  const xj = c - Math.sqrt(R * R - w * w); const al = Math.atan2(w, -(c - xj)); // unghiul jonctiunii pe cercul din dreapta
  // al = unghiul jonctiunii de sus fata de centrul din dreapta (~171,4 grade); ambele arce baleiaza 2*al CCW
  return { closed: true, segs: [L(-xj, -w, xj, -w), A(c, 0, R, -al, 2 * al), L(xj, w, -xj, w), A(-c, 0, R, Math.PI - al, 2 * al)] };
}
// C: inel R 20 / r 10 cu fanta |y| < s/2 pe +x
function cShape(s = 0.05, Ro = 20, Ri = 10) {
  const h = s / 2, ao = Math.asin(h / Ro), ai = Math.asin(h / Ri);
  const xo = Math.sqrt(Ro * Ro - h * h), xi = Math.sqrt(Ri * Ri - h * h);
  return { closed: true, segs: [A(0, 0, Ro, ao, 2 * Math.PI - 2 * ao), L(xo, -h, xi, -h), A(0, 0, Ri, -ai, -(2 * Math.PI - 2 * ai)), L(xi, h, xo, h)] };
}
// pieptene: baza 100 x 10, 20 de dinti lati de 2 (pas 5, gol 3), inalti de 20
function comb(n = 20, tw = 2, pitch = 5, base = 10, th = 20) {
  const segs = []; const W = n * pitch; let x = 0;
  segs.push(L(0, 0, W, 0)); segs.push(L(W, 0, W, base));
  // de la dreapta la stanga, pe muchia de sus
  let cx = W;
  for (let i = n - 1; i >= 0; i--) {
    const x0 = i * pitch + (pitch - tw) / 2, x1 = x0 + tw;
    segs.push(L(cx, base, x1, base)); segs.push(L(x1, base, x1, base + th)); segs.push(L(x1, base + th, x0, base + th)); segs.push(L(x0, base + th, x0, base));
    cx = x0;
  }
  segs.push(L(cx, base, 0, base)); segs.push(L(0, base, 0, 0));
  return { closed: true, segs: segs.filter((s) => Math.hypot(s.x1 - s.x0, s.y1 - s.y0) > 0) };
}

function runCase(name, region, level, expLoops, windows, hS, useShape) {
  const T = makeTruth(region);
  let loops, err = null, ms;
  const t0 = performance.now();
  try {
    if (useShape) { const sh = cc.Shape.fromPlines(toPlines(region)).parallelOffset(level); loops = [...sh.ccwPlines.map((p) => fromPline(p.polyline)), ...sh.cwPlines.map((p) => fromPline(p.polyline))]; }
    else loops = toPlines(region)[0].parallelOffset(level).map(fromPline);
  } catch (e) { err = String(e.message || e); }
  ms = performance.now() - t0;
  if (err) return { caz: name, nivel: level, eroare: err, ms };
  const r = checkOffset(T, loops, level, windows, hS);
  r.caz = name; r.nivel = level; r.bucleAsteptate = expLoops; r.ms = ms; r.api = useShape ? 'Shape' : 'Polyline';
  r.ccw = loops.filter((c) => { let s = 0; for (const g of c.segs) { if (g.k === 'L') s += g.x0 * g.y1 - g.x1 * g.y0; else { const a1 = g.a0 + g.da; s += g.r * g.r * g.da + g.cx * g.r * (Math.sin(a1) - Math.sin(g.a0)) - g.cy * g.r * (Math.cos(a1) - Math.cos(g.a0)); } } return s > 0; }).length;
  r.ok = r.bucle === expLoops && r.iesireAdevar < 1e-6 && r.adevarIesire < 1e-6 + (windows.minG || 0) && r.orientareInversata === 0;
  return r;
}

const out = [];
const RAPID = process.argv.includes("--rapid"); // --rapid: mai putine praguri, ferestre fine de 5 ori mai rare
const near = RAPID ? [1e-6] : [1e-2, 1e-4, 1e-6];
const G5 = (g) => RAPID ? g * 5 : g;
// 1) haltera, offset interior D (nivel +D); prag w = 3
{
  const R = dumbbell();
  for (const dd of [-0.1, ...near.map((e) => -e), ...near, 0.1]) {
    const D = 3 + dd; const exp = D < 3 ? 1 : 2;
    const win = [{ x0: -52, y0: -22, x1: 52, y1: 22, g: 0.25 }, { x0: -11, y0: -0.2, x1: 11, y1: 0.2, g: G5(0.002) }];
    for (const useShape of [false, true]) out.push(runCase(`haltera D=3${dd >= 0 ? '+' : ''}${dd}`, [R], D, exp, win, 0.02, useShape));
  }
}
// 2) doua cercuri r=10, gol 0.1 (prag d = 0.05), offset exterior (nivel -d) cu Shape (doua contururi)
{
  const R = [circle(0, 0, 10), circle(20.1, 0, 10)];
  for (const dd of [-0.01, ...near.map((e) => -e), ...near, 0.01]) {
    const d = 0.05 + dd; const exp = d < 0.05 ? 2 : 1;
    const win = [{ x0: -11, y0: -11, x1: 31.2, y1: 11, g: 0.1 }, { x0: 9.5, y0: -0.6, x1: 10.6, y1: 0.6, g: G5(0.001) }];
    out.push(runCase(`doua cercuri d=0.05${dd >= 0 ? '+' : ''}${dd}`, R, -d, exp, win, 0.01, true));
  }
}
// 3) C cu fanta de 0.05 (prag d = 0.025): offset exterior; peste prag apare o gaura (2 bucle)
{
  const R = cShape();
  for (const dd of [-0.005, ...near.map((e) => -e), ...near, 0.005, 1]) {
    const d = 0.025 + dd; const exp = d < 0.025 ? 1 : 2;
    const win = [{ x0: -22, y0: -22, x1: 22, y1: 22, g: 0.1 }, { x0: 8.5, y0: -0.08, x1: 21.5, y1: 0.08, g: G5(0.001) }];
    for (const useShape of [false, true]) out.push(runCase(`C fanta d=0.025${dd >= 0 ? '+' : ''}${dd}`, [R], -d, exp, win, 0.01, useShape));
  }
}
// 4) pieptene: interior (prag 1 = jumatate din latimea dintelui), exterior (prag 1.5 = jumatate din gol)
{
  const R = comb();
  for (const dd of [-0.1, -1e-4, 1e-4, 0.1]) {
    const D = 1 + dd;
    const win = [{ x0: -1, y0: -1, x1: 101, y1: 31, g: G5(0.05) }];
    out.push(runCase(`pieptene interior D=1${dd >= 0 ? '+' : ''}${dd}`, [R], D, 1, win, 0.02, false));
  }
  for (const dd of [-0.1, -1e-4, 1e-4, 0.1]) {
    const d = 1.5 + dd;
    const win = [{ x0: -3, y0: -3, x1: 103, y1: 33, g: G5(0.05) }];
    out.push(runCase(`pieptene exterior d=1.5${dd >= 0 ? '+' : ''}${dd}`, [R], -d, 1, win, 0.02, false));
  }
}
for (const r of out) console.log(`${(r.ok ? 'OK  ' : (r.eroare ? 'EROARE' : 'DIFERIT')).padEnd(7)} ${r.caz.padEnd(30)} ${(r.api || '').padEnd(8)} bucle ${r.bucle ?? '-'} (asteptat ${r.bucleAsteptate ?? '-'}, ccw ${r.ccw ?? '-'}) | iesire->adevar ${fmt(r.iesireAdevar)} | adevar->iesire ${fmt(r.adevarIesire)} (${r.puncteAdevar ?? '-'} pct) | orient. inversata ${r.orientareInversata ?? '-'} | gol ${fmt(r.gol)} | ${fmt(r.ms, 1)} ms ${r.eroare || ''}`);
fs.writeFileSync(RAPID ? "rez-b-topologie-rapid.json" : "rez-b-topologie.json", JSON.stringify(out, null, 1));
console.log(`\n${out.filter((r) => r.ok).length}/${out.length} OK`);
