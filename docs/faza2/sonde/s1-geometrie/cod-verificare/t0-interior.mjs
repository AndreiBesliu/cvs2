// Testul in/afara al adevarului (windingExact) pe cazuri construite, inclusiv cel care a pacalit raza orizontala.
import { insideExact, windingExact } from './adevar.mjs';
const A = (cx, cy, r, a0, da) => ({ k: 'A', cx, cy, r, a0, da });
const circle = (cx, cy, r) => ({ closed: true, segs: [A(cx, cy, r, 0, Math.PI), A(cx, cy, r, Math.PI, Math.PI)] });
const R = [circle(0, 0, 10), circle(20.1, 0, 10)];
const cases = [
  ['punct de pe y=0 la stanga cercului 2 (raza trecea prin capetele arcelor)', 10.06, -2.4492935982947503e-18, false],
  ['centrul cercului 1 (pe coarda semicercurilor)', 0, 0, true], ['centrul cercului 2', 20.1, 0, true],
  ['intre cercuri', 10.05, 0, false], ['in cercul 1 langa margine', 9.999, 0, true], ['afara, sus', 0, 10.001, false], ['inauntru, sus', 0, 9.999, true],
];
let ok = true;
for (const [n, x, y, exp] of cases) { const g = insideExact(R, x, y); ok &&= g === exp; console.log((g === exp ? 'OK  ' : 'PICA') + ' ' + n + ' -> ' + g + ' (w=' + windingExact(R, x, y) + ')'); }
// aleator: comparatie cu predicatul exact al discurilor (|p-c| < r), 200 000 de puncte
let bad = 0; let s = 7; const rnd = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
for (let i = 0; i < 200000; i++) { const x = -12 + 44 * rnd(), y = -12 + 24 * rnd(); const e = Math.hypot(x, y) < 10 || Math.hypot(x - 20.1, y) < 10; if (insideExact(R, x, y) !== e) bad++; }
console.log('aleator 200 000 puncte: nepotriviri', bad); ok &&= bad === 0;
console.log(ok ? 'IN/AFARA: OK' : 'IN/AFARA: ESEC'); if (!ok) process.exitCode = 1;
