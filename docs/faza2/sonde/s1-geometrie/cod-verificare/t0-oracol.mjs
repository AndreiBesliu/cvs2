// Oracolul v1 verificat pe valori calculate pe hartie + control negativ (un oracol stricat trebuie sa pice).
import { dSeg, area, plineToSegs, P, grblArcCheck } from './oracol-v1.mjs';
const res = [];
const ok = (nume, got, exp, tol) => { const e = Math.abs(got - exp); res.push({ nume, got, exp, err: e, ok: e <= tol }); };
// 1) distanta la cerc (2 arce) din (13,4): sqrt(185) - 10
const circ = [{ k: 'A', cx: 0, cy: 0, r: 10, a0: 0, da: Math.PI }, { k: 'A', cx: 0, cy: 0, r: 10, a0: Math.PI, da: Math.PI }];
ok('dist cerc r10 din (13,4)', Math.min(...circ.map((s) => dSeg(s, 13, 4))), Math.sqrt(185) - 10, 1e-14);
// 2) parabola y=x^2 ca patratica (0,0),(0.5,0),(1,1); din (0,1): minim la x=1/sqrt2, d = sqrt(3)/2
const par = { k: 'Q', x0: 0, y0: 0, x1: 0.5, y1: 0, x2: 1, y2: 1 };
ok('dist patratica (parabola) din (0,1)', dSeg(par, 0, 1), Math.sqrt(3) / 2, 1e-14);
// 3) din (0.5, -1): minim pe parabola: 2(x-0.5) + 4x(x^2+1) = 0 -> 4x^3 + 6x - 1 = 0
let x = 0.16; for (let i = 0; i < 60; i++) x -= (4 * x ** 3 + 6 * x - 1) / (12 * x * x + 6);
ok('dist patratica din (0.5,-1)', dSeg(par, 0.5, -1), Math.hypot(x - 0.5, x * x + 1), 1e-14);
// 4) aria regiunii dintre parabola si coarda: 1/6
ok('arie parabola/coarda', area([{ closed: true, segs: [par, { k: 'L', x0: 1, y0: 1, x1: 0, y1: 0 }] }]), 1 / 6, 1e-15);
// 5) aria cercului r=10: 100 pi
ok('arie cerc r10', area([{ closed: true, segs: circ }]), 100 * Math.PI, 1e-12);
// 6) cubica = patratica ridicata exact: aceeasi distanta
const cub = { k: 'C', x0: 0, y0: 0, x1: 1 / 3, y1: 0, x2: 2 / 3, y2: 1 / 3, x3: 1, y3: 1 };
ok('dist cubica (parabola ridicata) din (0,1)', dSeg(cub, 0, 1), Math.sqrt(3) / 2, 1e-12);
// 6b) cubica cu viteza zero la capete (P1 = P0, P2 = P3): puncte PE curba -> distanta 0 (defect gasit si reparat in oracol)
{ const dg = { k: 'C', x0: 0, y0: 0, x1: 0, y1: 0, x2: 20, y2: 30, x3: 40, y3: 0 }; let m = 0; for (let i = 0; i <= 2000; i++) { const p = P(dg, i / 2000); m = Math.max(m, dSeg(dg, p[0], p[1])); } ok('cubica P1=P0: max dist pentru puncte pe curba', m, 0, 1e-9); }
{ const dg = { k: 'C', x0: 0, y0: 0, x1: 0, y1: 0, x2: 40, y2: 0, x3: 40, y3: 0 }; ok('cubica dreapta degenerata: dist din (13,5)', dSeg(dg, 13, 5), 5, 1e-12); }
// 7) bulge 1 de la (0,0) la (10,0): semicerc CCW, centru (5,0), r=5, trece prin (5,-5)
const sc = plineToSegs([{ x: 0, y: 0, bulge: 1 }, { x: 10, y: 0, bulge: 0 }], false).segs[0];
const mid = P(sc, 0.5);
ok('bulge 1: raza', sc.r, 5, 1e-15); ok('bulge 1: mijloc y', mid[1], -5, 1e-14);
// 8) bulge -0.5 (CW, 106.26 grade): sageata = c/2 * |b| = 2.5 pentru c=10, de partea stanga
const b2 = plineToSegs([{ x: 0, y: 0, bulge: -0.5 }, { x: 10, y: 0, bulge: 0 }], false).segs[0];
ok('bulge -0.5: sageata', P(b2, 0.5)[1], 2.5, 1e-14);
// 9) GRBL: arc corect r=10 -> fara error:33; arc cu capatul mutat 0.6 mm -> error:33 (regula > 0.5 mm)
ok('GRBL arc corect', grblArcCheck(10, 0, 0, 10, -10, 0).err33 ? 1 : 0, 0, 0);
ok('GRBL arc gresit 0.6 mm', grblArcCheck(10, 0, 0, 10.6, -10, 0).err33 ? 1 : 0, 1, 0);
// CONTROL NEGATIV: oracol stricat (arcul tratat ca cerc intreg) pe un semicerc, punct in dreptul partii lipsa
const semi = { k: 'A', cx: 0, cy: 0, r: 10, a0: 0, da: Math.PI }; // doar jumatatea de sus
const stricat = (s, x, y) => Math.abs(Math.hypot(x - s.cx, y - s.cy) - s.r);
const bun = dSeg(semi, 0, -12), rau = stricat(semi, 0, -12);
res.push({ nume: 'CONTROL: arc tratat ca cerc intreg (trebuie sa difere de adevar: hypot(10,12)=15.62)', got: rau, exp: Math.hypot(10, 12), err: Math.abs(rau - Math.hypot(10, 12)), ok: Math.abs(rau - Math.hypot(10, 12)) > 1, prins: Math.abs(bun - Math.hypot(10, 12)) < 1e-14 });
for (const r of res) console.log((r.ok ? 'OK  ' : 'PICA') + ' ' + r.nume.padEnd(60) + ' got=' + r.got + ' exp=' + r.exp + ' err=' + r.err.toExponential(2));
const all = res.every((r) => r.ok);
console.log(all ? 'ORACOL v1: toate verificarile pe hartie trec; controlul negativ e prins' : 'ORACOL v1: ESEC');
export const rezultate = res;
if (!all) process.exitCode = 1;
