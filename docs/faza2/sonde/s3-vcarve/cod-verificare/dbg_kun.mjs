import { normalize, makeRegion, area } from './src/geom.mjs';
import { textLoops } from './cazuri.mjs';
import { makeOracle } from './oracle/oracle.mjs';
import { generate, evaluate } from './harness.mjs';
const loops = textLoops('kunstler', 'Manole', 15, 0, 0);
const polys = normalize(loops, 'nonzero', 0.0005); const reg = makeRegion(polys);
const or = makeOracle(loops, 'nonzero');
console.log('poligoane', polys.length, 'gauri', polys.filter((P) => area(P) < 0).length, 'arii mici', polys.filter((P) => Math.abs(area(P)) < 1e-3).map((P) => area(P).toExponential(2)));
const pts = [[24.9538, 2.2617], [21.0738, 15.0617]];
for (const p of pts) {
  console.log('p', p, 'oracol: in', or.inside(...p), 'dist', or.dist(...p).toFixed(5), '| gen: in', reg.inside(...p), 'dist', reg.dist(...p).toFixed(5));
  // vecinatate: max |dist_or - dist_gen| pe o grila 0,2 x 0,2
  let worst = 0, wp = null; for (let i = -20; i <= 20; i++) for (let j = -20; j <= 20; j++) { const q = [p[0] + i * 0.005, p[1] + j * 0.005]; if (or.inside(...q) !== reg.inside(...q)) continue; const d = or.dist(...q) - reg.dist(...q); if (Math.abs(d) > Math.abs(worst)) { worst = d; wp = q; } }
  console.log('   max (dist_oracol - dist_gen) in jur:', worst.toFixed(5), 'la', wp && wp.map((v) => v.toFixed(4)));
}
// unghiuri ascutite / auto-intersectii in contururi: numar de bucle care se auto-intersecteaza (aprox: Clipper simplu pe fiecare bucla)
