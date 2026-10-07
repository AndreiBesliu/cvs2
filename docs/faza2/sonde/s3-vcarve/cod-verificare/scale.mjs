// (d) Scara: firma 1200 x 400 mm, 60 de caractere (Roboto v2, majuscula 50 mm) + rama, h = 0,05 -> > 200 000 esantioane.
// Masoara timpul pe etape, memoria (RSS maxim) si legalizarea (treceri, intoarceri, muchii ne-Delaunay inainte/dupa).
// node scale.mjs [--variant=instr|nolegal] [--flat=0|1] [--g=0.25] [--eval=1] [--win=1]
import { normalize, makeRegion } from './src/geom.mjs';
import { maVoronoi } from './var/ma-voronoi-var.mjs';
import { vcarve } from './src/vcarve.mjs';
import { toGcode } from './src/post.mjs';
import { textLoops, rect } from './cazuri.mjs';
import { evaluate, cotOf } from './harness.mjs';
import { createHash } from 'node:crypto';

const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const variant = arg('variant', 'instr'), flatOn = arg('flat', '0') === '1', H = +arg('h', 0.05);
const mem = () => { const m = process.memoryUsage(); return { rssMB: Math.round(m.rss / 2 ** 20), heapMB: Math.round(m.heapUsed / 2 ** 20) }; };
export function bigSign() {
  const r1 = 'Casa memoriala Mesterul Manole', r2 = 'Muzeul lemnului, Curtea Arges.';
  const loops = [...textLoops('robotoV2', r1, 50, 40, 230), ...textLoops('robotoV2', r2, 50, 40, 90), rect(10, 10, 1180, 380), rect(25, 25, 1150, 350, false)];
  return { name: 'firma_1200x400', loops, fill: 'nonzero', theta: 60, D: flatOn ? 3 : 50, dpp: 1, flat: flatOn ? { R: 1.5875, step: 0.4 } : null, g: +arg('g', 0.25), chars: (r1 + r2).replace(/ /g, '').length };
}
const S = bigSign();
const out = { variant, flat: flatOn, h: H, chars: S.chars, mem0: mem() };
let t = performance.now();
const polys = normalize(S.loops, S.fill, 0.0005); const region = makeRegion(polys);
out.msNorm = Math.round(performance.now() - t); out.segs = region.segs.length; out.memNorm = mem();
t = performance.now();
const graph = maVoronoi(region, { h: H, legalize: variant === 'stack' ? 'stack' : variant !== 'nolegal', checkDelaunay: arg('check', '1') === '1' });
out.msMA = Math.round(performance.now() - t); out.memMA = mem();
out.ma = { samples: graph.stats.samples, triangles: graph.stats.triangles, flips: graph.stats.flips, sweeps: graph.stats.sweeps, perSweepFirst3Last3: [...graph.stats.perSweep.slice(0, 3), ...graph.stats.perSweep.slice(-3)], badBefore: graph.stats.badBefore, badAfter: graph.stats.badAfter, tm: Object.fromEntries(Object.entries(graph.stats.tm).map(([k, v]) => [k, Math.round(v)])), nodes: graph.nodes.length };
t = performance.now();
const ir = vcarve(region, graph, { theta: S.theta, D: S.D, dpp: S.dpp, flat: S.flat });
out.msGen = Math.round(performance.now() - t); out.memGen = mem();
t = performance.now();
const cot = cotOf(S.theta);
const gc = toGcode(ir, { zFloor: (x, y) => -Math.min(S.D, region.dist(x, y) * cot) });
out.msPost = Math.round(performance.now() - t); out.lines = gc.stats.totalLines; out.arcs = gc.stats.arcs; out.cutLenMm = gc.stats.cutLenMm; out.memPost = mem();
out.msTotal = out.msNorm + out.msMA + out.msGen + out.msPost; out.sha1 = createHash('sha1').update(gc.text).digest('hex').slice(0, 12);
out.maxRSS_MB = Math.round(process.resourceUsage().maxRSS / 1024);
console.log(JSON.stringify(out));
if (arg('eval', '0') === '1') {
  t = performance.now();
  const E = evaluate(S, gc.text, { g: S.g, m: 0.5 });
  console.log(JSON.stringify({ evalGrid: S.g, cells: E.cells, under: +E.maxUnder.toFixed(4), atUnder: E.atUnder, overIn: +E.maxOverIn.toFixed(4), atOver: E.atOver, cutOut: +E.maxCutOut.toFixed(4), atOut: E.atOut, rms: +E.rms.toFixed(5), rapidsInMaterial: E.rapidsInMaterial, msEval: Math.round(performance.now() - t) }));
  if (arg('win', '0') === '1') for (const c of [E.atUnder, E.atOver].filter(Boolean)) {
    const W = evaluate(S, gc.text, { bbox: [c[0] - 4, c[1] - 4, c[0] + 4, c[1] + 4], g: 0.01, m: 0, oracle: E.oracle });
    console.log(JSON.stringify({ window: c, g: 0.01, under: +W.maxUnder.toFixed(4), atUnder: W.atUnder, overIn: +W.maxOverIn.toFixed(4), cutOut: +W.maxCutOut.toFixed(4) }));
  }
}
