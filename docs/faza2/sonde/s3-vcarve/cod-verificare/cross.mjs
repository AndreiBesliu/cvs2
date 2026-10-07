// Verificare INCRUCISATA: oracolul sondei (grila) vs oracolul 2 (scris independent, alta metoda), in aceleasi puncte.
// Puncte: cele mai rele (sub / peste / afara) gasite pe grila + puncte pe hartie + 300 de puncte aleatoare din cutia formei.
// Control negativ: acelasi G-code deplasat cu +0,02 mm pe X trebuie sa dea sapaturi vazute de AMBELE oracole.
// node cross.mjs [--names=prefix,...]
import { cases } from './verif.mjs';
import { corpus } from './corpus.mjs';
import { generate, evaluate } from './harness.mjs';
import { makeIdeal, idealZ, toolSamples, cutAt } from './oracle2.mjs';
import { parseGcode, sweepPoints } from './oracle/sim.mjs';
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const names = arg('names', 'C_rotund_fanta0.01,linie_w0.02_L3.0137,fanta_curba,kunstler,cerc_taiat_S_polyline,litere_roboto_v3').split(',');
const all = [...cases(), ...corpus()];
let rnd = 12345; const rand = () => ((rnd = (rnd * 1103515245 + 12345) % 2147483648) / 2147483648);
const shiftX = (text, dx) => text.replace(/X(-?\d+\.?\d*)/g, (m, v) => 'X' + (parseFloat(v) + dx).toFixed(4));
for (const name of names) {
  const S = all.find((c) => c.name.startsWith(name)); if (!S) { console.log('lipsa', name); continue; }
  const G = generate(S, { h: 0.05, variant: 'probe' });
  const E = evaluate(S, G.gc.text, {});
  const [X0, Y0, X1, Y1] = E.oracle.bbox;
  const pts = [E.atUnder, E.atOver, E.atOut, ...(S.paper || []).map((q) => q.p)].filter(Boolean);
  for (let i = 0; i < 300; i++) pts.push([X0 + rand() * (X1 - X0), Y0 + rand() * (Y1 - Y0)]);
  const tools = { 1: { type: 'V', theta: S.theta }, 2: { type: 'F', R: S.flat ? S.flat.R : 1 } };
  const I2 = makeIdeal(S.loops, S.fill);
  const t0 = performance.now();
  const runBoth = (text) => {
    const z1 = sweepPoints(parseGcode(text).moves, tools, pts); // simulatorul sondei (analitic)
    const z2 = cutAt(toolSamples(text), tools, pts).map((h) => Math.min(0, h)); // oracolul 2 (esantionare densa)
    return pts.map((p, i) => { const id1 = E.oracle.inside(...p) ? -Math.min(S.D, E.oracle.dist(...p) / Math.tan(S.theta * Math.PI / 360)) : 0; const id2 = idealZ(I2, S.theta, S.D, ...p); return { p, d1: z1[i] - id1, d2: z2[i] - id2, id1, id2 }; });
  };
  const R = runBoth(G.gc.text);
  const maxAbsDiffIdeal = Math.max(...R.map((r) => Math.abs(r.id1 - r.id2)));
  const maxAbsDiffDev = Math.max(...R.map((r) => Math.abs(r.d1 - r.d2)));
  const worst = R.reduce((m, r) => (Math.abs(r.d1 - r.d2) > Math.abs(m.d1 - m.d2) ? r : m), R[0]);
  const N = R.slice(0, 3).map((r) => `[${r.p.map((v) => v.toFixed(3))}] sonda ${r.d1.toFixed(4)} / oracol2 ${r.d2.toFixed(4)}`);
  const RS = runBoth(shiftX(G.gc.text, 0.02));
  const ov1 = Math.max(...RS.map((r) => -r.d1)), ov2 = Math.max(...RS.map((r) => -r.d2));
  console.log(`${S.name.padEnd(32)} puncte ${pts.length} | max|ideal1-ideal2| ${maxAbsDiffIdeal.toFixed(5)} | max|abatere1-abatere2| ${maxAbsDiffDev.toFixed(5)} la [${worst.p.map((v) => v.toFixed(3))}] (${worst.d1.toFixed(4)} vs ${worst.d2.toFixed(4)}) | control +0,02X: peste ${ov1.toFixed(4)} / ${ov2.toFixed(4)} | ${Math.round(performance.now() - t0)} ms`);
  console.log('      cele mai rele de pe grila (sub, peste, afara):', N.join(' | '));
}
