import * as cc from 'cavalier-contours-js';
const N = 5000;
const ell = Array.from({ length: N }, (_, i) => { const t = 2 * Math.PI * i / N; return [100 * Math.cos(t), 50 * Math.sin(t), 0]; });
const q = cc.plineClosed(ell).parallelOffset(-3.175)[0];
for (const i of [0, 1, 2, 3, 4, 9997, 9998, 9999, 4998, 4999, 5000, 5001]) { const a = q.at(i), b = q.at((i + 1) % q.vertexCount); console.log(i, a.x.toFixed(6), a.y.toFixed(6), 'bulge', a.bulge, 'coarda', Math.hypot(b.x - a.x, b.y - a.y).toExponential(4)); }
let n1 = 0; for (let i = 0; i < q.vertexCount; i++) if (Math.abs(Math.abs(q.at(i).bulge) - 1) < 1e-9) n1++;
console.log('varfuri cu |bulge| = 1:', n1, 'din', q.vertexCount);
// pe hartie: arcul de imbinare la un varf convex are baleiajul = unghiul de intoarcere al tangentei = 2pi/N la cerc; la elipsa, cel mult ~ 2pi/N * a/b
console.log('bulge asteptat ~ tan(theta/4), theta <=', (2 * Math.PI / N * 100 / 50).toExponential(3), '->', Math.tan(2 * Math.PI / N * 2 / 4).toExponential(3));
