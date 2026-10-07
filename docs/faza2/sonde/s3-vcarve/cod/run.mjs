// Ruleaza corpusul x candidatii: axa mediala -> V-carve -> G-code -> simulare independenta -> comparatie cu oracolul.
// node run.mjs [--shapes=nume,nume] [--cands=voronoi,flomat,voron8,grid] [--reps=5] [--gscale=1] [--out=rezultate.json] [--gcode=dir]
import { writeFileSync, mkdirSync } from 'node:fs';
import { corpus } from './corpus.mjs';
import { makeOracle, idealGrid } from './oracle/oracle.mjs';
import { parseGcode, sweep, compare, sweepPoints } from './oracle/sim.mjs';
import { normalize, makeRegion } from './src/geom.mjs';
import { maVoronoi } from './src/ma-voronoi.mjs';
import { maFlomat } from './src/ma-flomat.mjs';
import { maVoron8, initVoron8 } from './src/ma-voron8.mjs';
import { maGrid } from './src/ma-grid.mjs';
import { vcarve } from './src/vcarve.mjs';
import { toGcode } from './src/post.mjs';

const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const shapesSel = arg('shapes', ''); const cands = arg('cands', 'voronoi,flomat,voron8').split(',');
const reps = +arg('reps', 3); const gscale = +arg('gscale', 1); const out = arg('out', ''); const gdir = arg('gcode', ''); const hV = +arg('h', 0);
const median = (a) => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

await initVoron8();
const results = [];
for (const S of corpus()) {
  if (shapesSel && !shapesSel.split(',').some((n) => S.name.startsWith(n))) continue;
  const tO = performance.now();
  const or = makeOracle(S.loops, S.fill);
  const [X0, Y0, X1, Y1] = or.bbox; const g = S.g * gscale; const m = 0.3;
  const grid = { x0: X0 - m + 1e-6 * Math.SQRT2, y0: Y0 - m + 1e-6 * Math.PI, g, nx: Math.ceil((X1 - X0 + 2 * m) / g), ny: Math.ceil((Y1 - Y0 + 2 * m) / g) };
  const { Z, IN } = idealGrid(or, grid, S.theta, S.D);
  const msOracle = performance.now() - tO;
  console.log(`\n== ${S.name}  (grila ${grid.nx}x${grid.ny} = ${(grid.nx * grid.ny / 1e6).toFixed(1)} M celule la ${g} mm; oracol ${(msOracle / 1000).toFixed(1)} s)`);
  const tools = { 1: { type: 'V', theta: S.theta }, 2: { type: 'F', R: S.flat ? S.flat.R : 1 } };
  for (const cand of cands) {
    const times = { norm: [], ma: [], gen: [], post: [] }; let last = null; let err = null;
    for (let r = 0; r < reps; r++) {
      try {
        let t = performance.now();
        const polys = normalize(S.loops, S.fill, 0.0005); const region = makeRegion(polys); times.norm.push(performance.now() - t);
        t = performance.now(); let graph;
        const h = hV || Math.max(0.005, Math.min(0.05, S.g * 2));
        if (cand === 'voronoi') graph = maVoronoi(region, { h });
        else if (cand === 'flomat') graph = maFlomat(S.loops, { fill: S.fill });
        else if (cand === 'voron8') graph = maVoron8(region, {});
        else if (cand === 'grid') graph = maGrid(region, { g: +arg('gridg', S.g * 2) });
        times.ma.push(performance.now() - t);
        t = performance.now();
        const ir = vcarve(region, graph, { theta: S.theta, D: S.D, dpp: S.dpp, flat: S.flat, keepIsolated: !!graph.keepIsolated });
        times.gen.push(performance.now() - t);
        t = performance.now(); const cotT = 1 / Math.tan(S.theta * Math.PI / 360); const gc = toGcode(ir, { zFloor: (x, y) => -Math.min(S.D, region.dist(x, y) * cotT) }); times.post.push(performance.now() - t);
        last = { graph, ir, gc };
      } catch (e) { err = e; break; }
    }
    if (err) { console.log(`  ${cand}: EROARE ${err.message}`); results.push({ shape: S.name, cand, error: String(err.message) }); continue; }
    const { graph, ir, gc } = last;
    if (gdir) { mkdirSync(gdir, { recursive: true }); writeFileSync(`${gdir}/${S.name}.${cand}.nc`, gc.text); }
    // simulare independenta pe textul G-code
    const tS = performance.now();
    const { moves, rapidsInMaterial } = parseGcode(gc.text);
    const H = new Float32Array(grid.nx * grid.ny).fill(Infinity); sweep(moves, tools, grid, H);
    const cmp = compare(H, Z, IN, grid, 0.02);
    const paper = S.paper.length ? sweepPoints(moves, tools, S.paper.map((q) => q.p)).map((z, i) => ({ ce: S.paper[i].ce, hartie: +S.paper[i].z.toFixed(4), sim: +z.toFixed(4), dif: +(z - S.paper[i].z).toFixed(4) })) : [];
    const msSim = performance.now() - tS;
    const row = { shape: S.name, cand, g, cells: grid.nx * grid.ny,
      ms: { norm: +median(times.norm).toFixed(1), ma: +median(times.ma).toFixed(1), gen: +median(times.gen).toFixed(1), post: +median(times.post).toFixed(1), reps: times.ma.length },
      maStats: graph.stats, genStats: ir.stats, gcode: gc.stats,
      dev: { maxUnder: +cmp.maxUnder.toFixed(4), maxOver: +cmp.maxOver.toFixed(4), rms: +cmp.rms.toFixed(5), p999: +cmp.p999.toFixed(4), fracUnderOver20um: +cmp.fracBadUnder.toFixed(5), outsideCut: cmp.outCut, worstUnderAt: cmp.worstUnderAt, worstOverAt: cmp.worstOverAt },
      rapidsInMaterial, paper, msSim: Math.round(msSim) };
    results.push(row);
    console.log(`  ${cand.padEnd(8)} MA ${row.ms.ma} ms | gen ${row.ms.gen} ms | post ${row.ms.post} ms | linii ${gc.stats.totalLines} (G2/G3 ${gc.stats.arcs}, G1 ${gc.stats.lines}) | ` +
      `sub +${row.dev.maxUnder} / peste -${row.dev.maxOver} / RMS ${row.dev.rms} / p99.9 ${row.dev.p999} mm | in afara ${cmp.outCut} | G0 in material ${rapidsInMaterial}`);
    if (paper.length) console.log('           hartie: ' + paper.map((p) => `${p.ce}: ${p.hartie} vs ${p.sim}`).join(' | '));
    if (cmp.maxUnder > 0.05 || cmp.maxOver > 0.01) console.log(`           cel mai rau: sub la ${JSON.stringify(cmp.worstUnderAt)}, peste la ${JSON.stringify(cmp.worstOverAt)}`);
  }
}
if (out) writeFileSync(out, JSON.stringify(results, null, 1));
