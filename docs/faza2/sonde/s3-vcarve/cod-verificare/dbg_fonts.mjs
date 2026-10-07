// (f) are fontul contururi suprapuse? arie(nonzero) vs arie(evenodd) dupa normalizare; numar de bucle si curbe
import { normalize, area } from './src/geom.mjs';
import { textLoops } from './cazuri.mjs';
for (const [f, s, cap] of [['segoeScript', 'Lemn & Atelier', 12], ['vivaldi', 'Andrei Gq', 15], ['kunstler', 'Manole', 15], ['gabriola', 'Lemn', 15], ['brush', 'Lemn', 15], ['robotoV2', 'R&8', 20]]) {
  try { const L = textLoops(f, s, cap, 0, 0); const A = (fill) => normalize(L, fill, 0.0005).reduce((a, P) => a + area(P), 0);
    const an = A('nonzero'), ae = A('evenodd'); console.log(f.padEnd(12), JSON.stringify(s).padEnd(18), 'bucle', String(L.length).padStart(3), 'curbe', String(L.flat().length).padStart(5), 'tipuri', [...new Set(L.flat().map((c) => c.k))].join(''), 'arie nonzero', an.toFixed(3), 'evenodd', ae.toFixed(3), an - ae > 1e-6 ? 'SUPRAPUSE' : ''); }
  catch (e) { console.log(f, 'EROARE', e.message); }
}
