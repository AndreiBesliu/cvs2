import { normalize, makeRegion, area } from './src/geom.mjs';
import { splitCircle } from './cazuri.mjs';
import { makeOracle } from './oracle/oracle.mjs';
for (const mode of ['exact', 'polyline']) {
  const loops = splitCircle(5, 5, 4, mode);
  const polys = normalize(loops, 'nonzero', 0.0005);
  const info = polys.map((P) => ({ n: P.length, area: +area(P).toExponential(3) }));
  const holes = info.filter((i) => i.area < 0);
  console.log(mode, 'polys', polys.length, 'outer', info.filter((i) => i.area > 0).map((i) => i.n + ' pts ' + i.area), 'holes', holes.length, holes.length ? 'arie min/max ' + Math.min(...holes.map((h) => -h.area)).toExponential(2) + ' / ' + Math.max(...holes.map((h) => -h.area)).toExponential(2) : '');
  const or = makeOracle(loops, 'nonzero');
  console.log('   oracol: bucati de granita', or.pieces, 'din', or.curves, 'curbe');
  // distanta oracolului vs a generatorului in cateva puncte de pe cusatura
  const reg = makeRegion(polys);
  for (const p of [[5, 5], [4.1975, 6.8225], [5.6675, 3.6275], [5.84375, 2.953125]]) console.log('   p', p, 'oracol in', or.inside(...p), 'dist', or.dist(...p).toFixed(5), '| generator in', reg.inside(...p), 'dist', reg.dist(...p).toFixed(5));
}
