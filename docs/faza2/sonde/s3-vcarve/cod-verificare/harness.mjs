// v2-vcarve: banc de verificare peste codul sondei s3 (copiat neschimbat in src/ si oracle/).
// generate(): regiune -> axa (Voronoi pe esantioane, h fix) -> V-carve -> G-code, cu varianta ceruta.
// evaluate(): oracolul sondei (oracle/oracle.mjs, zero importuri din src/) + simularea textului G-code (oracle/sim.mjs).
import { normalize, makeRegion } from './src/geom.mjs';
import { maVoronoi } from './src/ma-voronoi.mjs';
import { vcarve } from './src/vcarve.mjs';
import { toGcode } from './src/post.mjs';
import { maVoronoi as maVoronoiVar } from './var/ma-voronoi-var.mjs';
import { vcarve as vcarveVar } from './var/vcarve-var.mjs';
import { makeOracle as makeOracleProbe, idealGrid } from './oracle/oracle.mjs';
import { makeOracle as makeOracleFix } from './oracle/oracle-fix.mjs';
// ORACOL=probe (oracolul sondei, neschimbat) | fix (cu reparatia capetelor de granita); implicit: fix
export const makeOracle = (process.env.ORACOL || 'fix') === 'probe' ? makeOracleProbe : makeOracleFix;
import { parseGcode, sweep, sweepPoints } from './oracle/sim.mjs';

export const cotOf = (theta) => 1 / Math.tan(theta * Math.PI / 360);
// bugetul declarat de sonda (RAPORT s3, „De unde vin abaterile”): sub <= (0,004+0,004)*cot, peste <= (0,0005+0,0005)*cot
export const budget = (theta, flat) => ({ under: 0.008 * cotOf(theta) + (flat ? 0.05 : 0), over: 0.001 * cotOf(theta) });

// variant: 'probe' (codul sondei, neschimbat) | 'instr' (copie instrumentata, aceeasi logica) | 'circ' (raza = raza
// cercului circumscris, NU recalculata) | 'nolegal' (fara legalizarea robusta) | 'circ+nolegal'
export function generate(S, { h = 0.05, variant = 'probe', S0 = 0, checkDelaunay = false } = {}) {
  const t0 = performance.now();
  const polys = normalize(S.loops, S.fill, 0.0005); const region = makeRegion(polys);
  const t1 = performance.now();
  let graph;
  if (variant === 'probe') graph = maVoronoi(region, { h });
  else graph = maVoronoiVar(region, { h, legalize: variant.includes('stack') ? 'stack' : !variant.includes('nolegal'), radius: variant.includes('circ'), checkDelaunay });
  const t2 = performance.now();
  const useVar = variant !== 'probe' || S0 !== 0;
  const ir = (useVar ? vcarveVar : vcarve)(region, graph, { theta: S.theta, D: S.D, dpp: S.dpp, flat: S.flat, S0, keepIsolated: !!graph.keepIsolated });
  const t3 = performance.now();
  const cot = cotOf(S.theta);
  const gc = toGcode(ir, { zFloor: (x, y) => -Math.min(S.D, S0 + region.dist(x, y) * cot) });
  const t4 = performance.now();
  return { polys, region, graph, ir, gc, ms: { norm: t1 - t0, ma: t2 - t1, gen: t3 - t2, post: t4 - t3, total: t4 - t0 } };
}

export function makeGrid(bbox, g, m = 0.3) {
  const [X0, Y0, X1, Y1] = bbox;
  return { x0: X0 - m + 1e-6 * Math.SQRT2, y0: Y0 - m + 1e-6 * Math.PI, g, nx: Math.ceil((X1 - X0 + 2 * m) / g), ny: Math.ceil((Y1 - Y0 + 2 * m) / g) };
}

// comparatie proprie (aceeasi definitie ca a sondei, dar raporteaza separat: sub ideal in interior, peste ideal in
// interior, si adancimea maxima taiata IN AFARA regiunii = sapatura in material care trebuia sa ramana la 0)
export function compare2(H, Z, IN, grid) {
  const { nx, x0, y0, g } = grid; let maxUnder = 0, maxOverIn = 0, maxCutOut = 0, ss = 0, n = 0, nOutCut = 0, wU = -1, wO = -1, wX = -1;
  for (let id = 0; id < H.length; id++) {
    const h = Math.min(0, H[id]);
    if (IN[id]) { const d = h - Z[id]; ss += d * d; n++; if (d > maxUnder) { maxUnder = d; wU = id; } if (-d > maxOverIn) { maxOverIn = -d; wO = id; } }
    else if (-h > 1e-9) { nOutCut++; if (-h > maxCutOut) { maxCutOut = -h; wX = id; } }
  }
  const at = (id) => (id < 0 ? null : [+(x0 + ((id % nx) + 0.5) * g).toFixed(4), +(y0 + (Math.floor(id / nx) + 0.5) * g).toFixed(4)]);
  return { maxUnder, maxOverIn, maxCutOut, maxOver: Math.max(maxOverIn, maxCutOut), rms: Math.sqrt(ss / Math.max(1, n)), nIn: n, nOutCut, atUnder: at(wU), atOver: at(wO), atOut: at(wX) };
}

export function evaluate(S, gcText, { g = S.g, m = S.margin ?? 0.3, bbox = null, oracle = null, ideal = null } = {}) {
  const or = oracle ?? makeOracle(S.loops, S.fill);
  const grid = makeGrid(bbox ?? or.bbox, g, m);
  const t0 = performance.now();
  const { Z, IN } = ideal ?? idealGrid(or, grid, S.theta, S.D);
  const tI = performance.now() - t0;
  const { moves, rapidsInMaterial } = parseGcode(gcText);
  const tools = { 1: { type: 'V', theta: S.theta }, 2: { type: 'F', R: S.flat ? S.flat.R : 1 } };
  const H = new Float32Array(grid.nx * grid.ny).fill(Infinity); sweep(moves, tools, grid, H);
  const c = compare2(H, Z, IN, grid);
  const paper = (S.paper || []).length ? sweepPoints(moves, tools, S.paper.map((q) => q.p)).map((z, i) => ({ ce: S.paper[i].ce, hartie: +S.paper[i].z.toFixed(4), sim: +z.toFixed(4), dif: +(z - S.paper[i].z).toFixed(4) })) : [];
  return { ...c, rapidsInMaterial, paper, cells: grid.nx * grid.ny, g, msIdeal: tI, grid, oracle: or, ideal: { Z, IN }, H, moves };
}

export const fmt = (v, d = 4) => (v === undefined || v === null ? '-' : (+v).toFixed(d));
