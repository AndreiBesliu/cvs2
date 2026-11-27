/**
 * Desenele fișei reliefului din fereastra exportului spun ce face programul (felia 18.1↑d-6, ADR 0317; „Desenele spun adevărul”,
 * ADR 0290): trecerile pe Z ale podelei sunt cele ale lucrării (fundurile la k · pas de față, ultima pe model, cel mult la
 * podea), iar liniile, prin centrele celulelor, stau la pasul folosit de lucrare (`celuleAliniate`, ADR 0314). Judecate pe
 * mișcările programului (`finisareRelief`, `degrosareRelief`), pe un relief plan mai adânc decât podeaua.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { degrosareRelief, finisareRelief, type ReliefCam } from '../../src/cam/reliefFinisare.ts';
import type { Miscare } from '../../src/ir/ir.ts';
import { liniiReliefDesen, treceriPodeaRelief } from '../../src/ui/exportDeseneCalcul.ts';

const T = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
/** Un relief plan, la `z` (mm, sub fața plăcii negativ), de `n × n` celule de `c` mm. */
const plan = (n: number, c: number, z: number): ReliefCam => ({ nx: n, ny: n, celula: c, z: new Float64Array(n * n).fill(z), m: T });
const baza = { unghi: 0, nealiniat: false, margine: 'perete' as const, zSigur: 5, avans: 1000, avansPlonjare: 300 };

/** Cotele Z ale tăierilor orizontale sub fața plăcii, distincte, de sus în jos. */
function niveluri(m: readonly Miscare[]): number[] {
  let z = 5;
  const v = new Set<number>();
  for (const x of m) {
    if (!('la' in x)) continue;
    if (x.tip !== 'taiere') { if (x.la.Z !== undefined) z = x.la.Z; continue; }
    const zn = x.la.Z ?? z;
    // Doar sub față: pe marginea „perete”, legăturile de pe ramă merg la fața plăcii.
    if ((x.la.X !== undefined || x.la.Y !== undefined) && Math.abs(zn - z) < 1e-9 && zn < -1e-9) v.add(+zn.toFixed(5));
    z = zn;
  }
  return [...v].sort((a, b) => b - a);
}

test('podeaua desenată: fundurile trecerilor sunt ale lucrării (k · pas, ultima pe model, cel mult la podea)', () => {
  for (const [adancime, pas, model] of [[5, 2, -6], [6, 2, -9], [6, 2, -4.5], [3, 3, -8], [0.5, 2, -1], [18, 3, -12.4]] as const) {
    const d = treceriPodeaRelief(adancime, pas);
    const o = finisareRelief({ ...baza, reliefuri: [plan(20, 0.5, model)], freza: { fel: 'plata', raza: 1 }, pasLateral: 1, pas, adancime });
    assert.ok(o.ok);
    const asteptat = [...d.funduri.filter((f) => f < -model - 1e-9).map((f) => -f), Math.max(model, -adancime)];
    // Cotele modelului sunt în Float32 (ADR 0311), deci la 1e-5 mm.
    assert.deepEqual(niveluri(o.miscari), asteptat.map((x) => +x.toFixed(5)), `podea ${adancime}, pas ${pas}, model ${model}`);
    assert.equal(o.treceri, Math.max(1, Math.ceil(Math.min(-model, adancime) / pas - 1e-9)), `treceri ${adancime}/${pas}/${model}`);
    // Cât desenul arată (podeaua plină), câte treceri ar face lucrarea pe un model cel puțin la podea.
    assert.equal(d.n, Math.max(1, Math.ceil(adancime / pas - 1e-9)));
  }
  // La degroșare, adaosul ridică și podeaua (5 − 0,5): fundurile rămân la k · pas, ultima la −4,5.
  const d = treceriPodeaRelief(5, 2, 0.5);
  assert.deepEqual(d, { funduri: [2, 4], n: 3, podea: 4.5 });
  const { nealiniat: _n, ...faraLinii } = baza;
  void _n;
  const o = degrosareRelief({ ...faraLinii, reliefuri: [plan(20, 0.5, -6)], raza: 1, pasLateral: 1, pas: 2, adancime: 5, adaos: 0.5 });
  assert.ok(o.ok);
  assert.deepEqual(niveluri(o.miscari), [...d.funduri.map((f) => -f), -4.5]);
  // Valori care nu se citesc: nimic de desenat.
  for (const [a, p, x] of [[0, 2, 0], [5, 0, 0], [Number.NaN, 2, 0], [2, 1, 2]] as const) {
    assert.deepEqual(treceriPodeaRelief(a, p, x), { funduri: [], n: 0, podea: 0 }, `${a}/${p}/${x}`);
  }
});

test('liniile desenate: prin centrele celulelor, la pasul folosit de lucrare; nealiniate, cel mult pasul cerut', () => {
  for (const [pas, c] of [[1.3, 0.5], [0.6, 0.25], [0.3, 0.1], [0.2, 0.5], [2, 1]] as const) {
    const d = liniiReliefDesen(pas, c, true, 0)!;
    const o = finisareRelief({ ...baza, reliefuri: [plan(16, c, -2)], freza: { fel: 'bila', raza: 3 }, pasLateral: pas, pas: 10, adancime: 10 });
    assert.ok(o.ok);
    assert.ok(d.aliniate);
    assert.ok(Math.abs(d.pas - o.pasLateral) < 1e-12, `pas ${pas} pe ${c}: ${d.pas} față de ${o.pasLateral}`);
    assert.equal(d.celule, Math.round(o.pasLateral / c));
  }
  // La 90°, la fel; la alt unghi sau nealiniate, pasul cerut (lucrarea îl împarte egal pe lățime, deci cel mult el).
  assert.deepEqual(liniiReliefDesen(1.3, 0.5, true, 90), { aliniate: true, pas: 1, celule: 2 });
  assert.deepEqual(liniiReliefDesen(1.3, 0.5, true, 30), { aliniate: false, pas: 1.3, celule: null });
  assert.deepEqual(liniiReliefDesen(1.3, 0.5, false, 0), { aliniate: false, pas: 1.3, celule: null });
  const n = finisareRelief({ ...baza, nealiniat: true, reliefuri: [plan(16, 0.5, -2)], freza: { fel: 'bila', raza: 3 }, pasLateral: 1.3, pas: 10, adancime: 10 });
  assert.ok(n.ok && n.pasLateral <= 1.3 + 1e-12);
  // Fără celulă (relieful necitit), liniile nu se pot alinia în desen.
  assert.deepEqual(liniiReliefDesen(1.3, undefined, true, 0), { aliniate: false, pas: 1.3, celule: null });
  assert.equal(liniiReliefDesen(0, 0.5, true, 0), null);
});
