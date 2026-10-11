/**
 * Precizările recenziei feliei 2.7b (ADR 0034 §6): căile netede pe care offsetul le refuza fals (contactul fals la o
 * joncțiune tangentă între două arce mici; buclele minuscule de 5e-4 … 0,03 mm pe care cavalier le lăsa la o joncțiune
 * aproape tangentă linie–arc, acum tăiate din ieșire, cu arcele tăiate exact în punctul de intersecție). Pe corpusul
 * `CAZURI_CALE_2` (pete Catmull-Rom de 32 și 128 de cubice, elipsele mici din cubice κ, dreptunghiul cu colțuri κ,
 * florile), aceeași judecată ca în `cale.cam.oracol.test.ts` (`judecaCazul`): exportul reușește, iar pe IR |d − R| ≤
 * tol + 1e-6 mm față de calea EXACTĂ (deci tăierea unei bucle nu mută niciun punct al traseului), pe G-code ≤ tol +
 * 0,002 + 1e-6 mm, latura, razele, nicio aproximare a postului. La sfârșit, abaterea maximă pe familii (informativ).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BUGET_GCODE, BUGET_IR } from '../oracles/cale.ts';
import { CAZURI_CALE_2 } from '../oracles/cale.cazuri.ts';
import { judecaCazul, type Maxime } from './ajutor-cale-oracol.ts';

const TOL = 0.001;
const maxime: Maxime = new Map();

for (const caz of CAZURI_CALE_2) {
  test(`(a) ${caz.familie}: ${caz.nume}`, async () => { assert.deepEqual(await judecaCazul(caz, maxime), []); });
}

test('(f) rezumatul: abaterea maximă / tol, pe familiile noi (IR și G-code)', (t) => {
  for (const [familie, m] of [...maxime].sort(([a], [b]) => a.localeCompare(b))) {
    t.diagnostic(`${familie}: ${m.cazuri} cazuri, ${m.mutari} mișcări; IR max ${(m.ir / TOL).toFixed(4)} × tol, G-code max ${(m.g / TOL).toFixed(4)} × tol`);
  }
  t.diagnostic(`bugetul: IR ${(BUGET_IR / TOL).toFixed(4)} × tol, G-code ${(BUGET_GCODE / TOL).toFixed(4)} × tol`);
  assert.ok(maxime.size > 0, 'rezumatul rulează după (a)');
});
