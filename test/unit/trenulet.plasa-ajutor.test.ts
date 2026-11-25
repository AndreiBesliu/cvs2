/**
 * Ajutorul probelor pe plase (`ajutor-plasa-lego.ts`): numărul de înfășurare socotit pe grilă (`infasurareRepede`, pe care
 * stă `plin`) e același cu cel socotit pe toate triunghiurile (`infasurare`), pe plasele adevărate ale motorului și pe
 * puncte din toată cutia lor, de pe fețe și din afara lor. Fără asta, o probă „în lemn / în gol” ar putea minți pe tăcute.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { L, infasurare, infasurareRepede, plin, type P3 } from './ajutor-plasa-lego.ts';

/** Un șir de numere în [0, 1), același la fiecare rulare. */
function sir(samanta: number): () => number {
  let s = samanta >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

test('înfășurarea pe grilă e cea de pe toate triunghiurile: pe cărămizi, roți, elice și piese cu găuri', () => {
  const piese: Record<string, unknown>[] = [
    { tip: 'caramida', celule: [[0, 0], [1, 0], [2, 0], [3, 0], [0, 1], [1, 1], [2, 1], [3, 1]] }, { tip: 'grinda' }, { tip: 'rotita', dinti: 12 }, { tip: 'elice' },
    { tip: 'conectorUnghi' }, { tip: 'cupa' }, { tip: 'senila' }, { tip: 'stiftTechnic' }, { tip: 'arc', lung: 6, inalt: 2 },
  ];
  let puncte = 0, inLemn = 0;
  for (const def of piese) {
    const p = L.construieste(def), r = sir(p.tri.length), [a, b, c] = p.dim as [number, number, number];
    for (let k = 0; k < 1500; k++) {
      // în cutie (cu puțin în afara ei), iar din când în când chiar pe un vârf sau pe mijlocul unei fețe
      let q: P3 = [a * (1.1 * r() - 0.05), b * (1.1 * r() - 0.05), c * (1.1 * r() - 0.05)];
      if (k % 10 === 0) { const t = p.tri[Math.floor(r() * p.tri.length)]!; q = k % 20 === 0 ? [...t[0]] as P3 : [(t[0][0] + t[1][0] + t[2][0]) / 3, (t[0][1] + t[1][1] + t[2][1]) / 3, (t[0][2] + t[1][2] + t[2][2]) / 3]; }
      const lent = infasurare(p.tri, q), repede = infasurareRepede(p.tri, q);
      assert.equal(repede, lent, `${String(def.tip)}: la (${q.map((x) => x.toFixed(3)).join(', ')})`);
      assert.equal(plin(p, q), lent >= 1);
      puncte++; if (lent >= 1) inLemn++;
    }
  }
  // proba a văzut și lemn, și gol (altfel n-ar spune nimic)
  assert.ok(inLemn > puncte / 20 && inLemn < puncte * 0.9, `${inLemn} din ${puncte} în lemn`);
});

test('în afara umbrei plasei nu e lemn; grila se ține pe plasă (a doua întrebare nu o mai face)', () => {
  const p = L.construieste({ tip: 'bucsa' });
  assert.equal(infasurareRepede(p.tri, [500, 500, 500]), 0);
  assert.equal(infasurareRepede(p.tri, [-500, 3, 3]), 0);
  assert.equal(plin(p, [3.6 + 3, 3.6, 4]), true, 'peretele bucșei');
  assert.equal(plin(p, [3.6, 3.6, 4]), false, 'gaura bucșei');
  const t0 = performance.now();
  for (let k = 0; k < 20000; k++) plin(p, [3.6 + 3 * Math.cos(k), 3.6 + 3 * Math.sin(k), (k % 70) / 10]);
  assert.ok(performance.now() - t0 < 2000, 'douăzeci de mii de întrebări, sub două secunde');
});
