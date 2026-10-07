// (h) Incrustatia V: femela = V-carve-ul formei S (fund plat Df), mascul = V-carve-ul complementului C = dreptunghi - S oglindit,
// cu ADANCIME DE START Ds (copia [v2] a generatorului; sonda nu o avea). Dopul se intoarce si se coboara cu t = Ds - joc.
// Proba fizica, FARA oracol: ambele suprafete vin din simularea textului G-code (oracle/sim.mjs); jocul vertical pe linia de
// lipire trebuie sa fie constant = Ds - t (valoare pe hartie). Plus abaterea fiecarei piese fata de idealul ei (oracle-fix).
// node inlay.mjs [--Ds=1.5] [--Df=3] [--Fm=2.5] [--theta=60] [--g=0.02] [--txt=B] [--variant=probe|circ]
import { generate, evaluate, cotOf } from './harness.mjs';
import { makeOracle } from './oracle/oracle-fix.mjs';
import { parseGcode, sweep } from './oracle/sim.mjs';
import { textLoops, rect } from './cazuri.mjs';
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const Ds = +arg('Ds', 1.5), Df = +arg('Df', 3), Fm = +arg('Fm', 2.5), theta = +arg('theta', 60), g = +arg('g', 0.02), txt = arg('txt', 'B'), variant = arg('variant', 'probe');
const FLAT = { R: 1.5875, step: 0.4 }; const cot = cotOf(theta), tan = 1 / cot; const MX = 40; // oglinda: x -> MX - x
const Sl = textLoops('robotoV2', txt, 20, 3, 3);
const mirror = (loops) => loops.map((l) => l.map((c) => { const o = { k: c.k }; for (const key of ['p0', 'p1', 'p2', 'p3']) if (c[key]) o[key] = [MX - c[key][0], c[key][1]]; return o; }));
let mx = Infinity, Mx = -Infinity, my = Infinity, My = -Infinity; for (const l of Sl) for (const c of l) for (const p of [c.p0, c.p1, c.p2, c.p3].filter(Boolean)) { mx = Math.min(mx, p[0]); Mx = Math.max(Mx, p[0]); my = Math.min(my, p[1]); My = Math.max(My, p[1]); }
const female = { name: 'femela', loops: Sl, fill: 'nonzero', theta, D: Df, dpp: 1, flat: FLAT, g };
const SM = mirror(Sl); const bx0 = MX - Mx - 5, bx1 = MX - mx + 5;
const male = { name: 'mascul', loops: [rect(bx0, my - 5, bx1 - bx0, My - my + 10), ...SM], fill: 'evenodd', theta, D: Ds + Fm, dpp: 1, flat: FLAT, g };
const HH = +arg('h', 0.05); const Gf = generate(female, { h: HH, variant }); const Gm = generate(male, { h: HH, variant, S0: Ds });
// grila femelei peste S; grila masculului = oglinda ei (celula i <-> nx-1-i)
const m0 = 0.6; const grid = { x0: mx - m0 + 1e-6 * Math.SQRT2, y0: my - m0 + 1e-6 * Math.PI, g, nx: Math.ceil((Mx - mx + 2 * m0) / g), ny: Math.ceil((My - my + 2 * m0) / g) };
const gridM = { ...grid, x0: MX - (grid.x0 + grid.nx * grid.g) };
const sim = (G, gr, S) => { const { moves } = parseGcode(G.gc.text); const H = new Float32Array(gr.nx * gr.ny).fill(Infinity); sweep(moves, { 1: { type: 'V', theta }, 2: { type: 'F', R: FLAT.R } }, gr, H); for (let i = 0; i < H.length; i++) H[i] = Math.min(0, H[i]); return H; };
const Hf = sim(Gf, grid, female), Hm = sim(Gm, gridM, male);
// idealurile (oracle-fix): femela -min(Df, d_S cot) in S; mascul clamp(-(Ds + sd_C cot), -(Ds+Fm), 0), sd_C = +d in C, -d in S oglindit
const oF = makeOracle(Sl, 'nonzero'), oM = makeOracle(male.loops, 'evenodd');
const nx = grid.nx, ny = grid.ny; let devF = [0, 0], devM = [0, 0]; const devMg = { sub: 0, at: null }, devFg = { sub: 0, at: null };
const gapStats = { n: 0, min: Infinity, max: -Infinity, sum: 0, atMin: null, atMax: null }, pocket = { n: 0, min: Infinity };
for (let pass = 0; pass < 2; pass++) {
  const t = pass === 0 ? Ds : Ds - 0.1; // t = Ds (joc 0) si t = Ds - 0,1 (joc 0,1 pe hartie)
  const gs = { n: 0, min: Infinity, max: -Infinity, sum: 0, atMin: null, atMax: null }, pk = { n: 0, min: Infinity, atMin: null };
  for (let j = 0; j < ny; j++) { const y = grid.y0 + (j + 0.5) * g; for (let i = 0; i < nx; i++) { const x = grid.x0 + (i + 0.5) * g; const id = j * nx + i, idm = j * nx + (nx - 1 - i);
    const inS = oF.inside(x, y); const dS = inS ? oF.dist(x, y) : -oF.dist(x, y);
    if (pass === 0) { // abaterile fiecarei piese fata de idealul ei
      const zf = inS ? -Math.min(Df, dS * cot) : 0; const ef = Hf[id] - zf; devF = [Math.max(devF[0], ef), Math.max(devF[1], -ef)];
      const xm = MX - x; const inC = oM.inside(xm, y); const sdC = inC ? oM.dist(xm, y) : -oM.dist(xm, y); const zm = Math.max(-(Ds + Fm), Math.min(0, -(Ds + sdC * cot))); const em = Hm[idm] - zm; devM = [Math.max(devM[0], em), Math.max(devM[1], -em)];
      if (inS && dS > 0.05 && dS * cot < Ds - 0.05) { if (em > devMg.sub) { devMg.sub = em; devMg.at = [+xm.toFixed(3), +y.toFixed(3)]; } if (ef > devFg.sub) { devFg.sub = ef; devFg.at = [+x.toFixed(3), +y.toFixed(3)]; } } }
    const Lm = -t - Hm[idm]; const gap = Lm - Hf[id];
    if (inS && dS > 0.05 && dS * cot < t - 0.05) { gs.n++; gs.sum += gap; if (gap < gs.min) { gs.min = gap; gs.atMin = [+x.toFixed(3), +y.toFixed(3)]; } if (gap > gs.max) { gs.max = gap; gs.atMax = [+x.toFixed(3), +y.toFixed(3)]; } }
    if (gap < pk.min) { pk.min = gap; pk.atMin = [+x.toFixed(3), +y.toFixed(3), inS, +dS.toFixed(3)]; } pk.n++;
  } }
  console.log(JSON.stringify({ variant, txt, theta, Ds, Df, Fm, t: +t.toFixed(3), jocPeHartie: +(Ds - t).toFixed(3), g, liniaDeLipire: { celule: gs.n, min: +gs.min.toFixed(4), max: +gs.max.toFixed(4), medie: +(gs.sum / gs.n).toFixed(4), atMin: gs.atMin, atMax: gs.atMax }, jocMinimPeTotPlanul: { min: +pk.min.toFixed(4), at: pk.atMin } }));
}
console.log(JSON.stringify({ abatereFemela: { sub: +devF[0].toFixed(4), peste: +devF[1].toFixed(4) }, abatereMascul: { sub: +devM[0].toFixed(4), peste: +devM[1].toFixed(4) }, peLiniaDeLipire: { femelaSub: +devFg.sub.toFixed(4), la: devFg.at, mascSub: +devMg.sub.toFixed(4), laMascul: devMg.at }, liniiF: Gf.gc.stats.totalLines, liniiM: Gm.gc.stats.totalLines, msF: Math.round(Gf.ms.total), msM: Math.round(Gm.ms.total) }));
