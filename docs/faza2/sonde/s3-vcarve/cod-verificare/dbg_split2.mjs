// Consistenta interna: oracolul construit pe POLIGOANELE NORMALIZATE ale generatorului (aceleasi micro-gauri).
import { normalize } from './src/geom.mjs';
import { splitCircle } from './cazuri.mjs';
import { generate, evaluate } from './harness.mjs';
const loops = splitCircle(5, 5, 4, 'polyline');
const polys = normalize(loops, 'nonzero', 0.0005);
const asLoops = polys.map((P) => P.map((p, i) => ({ k: 'L', p0: p, p1: P[(i + 1) % P.length] })));
const S = { name: 'split_poly_selfconsistent', loops: asLoops, fill: 'evenodd', theta: 60, D: 50, dpp: 1, flat: null, g: 0.005 };
for (const v of ['probe', 'circ']) {
  const G = generate({ ...S, loops }, { h: 0.05, variant: v }); // generatorul primeste intrarea ORIGINALA
  const E = evaluate(S, G.gc.text, {});                        // oracolul vede geometria normalizata a generatorului
  console.log(v, 'sub', E.maxUnder.toFixed(4), 'la', JSON.stringify(E.atUnder), '| peste', E.maxOverIn.toFixed(4), 'la', JSON.stringify(E.atOver), '| afara', E.maxCutOut.toFixed(4), 'la', JSON.stringify(E.atOut));
}
