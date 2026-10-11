/**
 * Biarcele (ADR 0033) la celelalte toleranțe ale corpusului (0,0001, 0,01 și 0,1 mm; cea a proiectului e judecată în
 * `biarce.oracol.test.ts`), cu același oracol independent: pe fiecare familie × toleranță, fiecare cubică dă `ok`, iar
 * lanțul trece TOATE verificările (`judecaLantul`). La sfârșit, rezumatul (doar informativ): bucățile și abaterea maximă
 * / tol, pe toleranțe.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cubicaInArce } from '../../src/geom/biarce.ts';
import { judecaLantul, motivRefuz, type Masura } from '../oracles/biarce.ts';
import { CAZURI, TOLERANTE, type CazBiarc } from '../oracles/biarce.cazuri.ts';

const masuri = new Map<number, Masura[]>();

function judeca(caz: CazBiarc, tol: number): string[] {
  let r: unknown;
  try {
    r = cubicaInArce(Object.freeze({ ...caz.cub.a }), Object.freeze({ ...caz.cub.c1 }), Object.freeze({ ...caz.cub.c2 }), Object.freeze({ ...caz.cub.b }), tol);
  } catch (e) {
    return [`${caz.nume}: a aruncat ${String(e)}`];
  }
  const motiv = motivRefuz(r);
  if (motiv !== undefined) return [`${caz.nume}: refuzat („${motiv}”), dar trebuie să reușească`];
  const j = judecaLantul(caz.cub, tol, r);
  if (j.masura !== undefined) masuri.set(tol, [...(masuri.get(tol) ?? []), j.masura]);
  return j.probleme.map((p) => `${caz.nume}: ${p.cod}: ${p.text}`);
}

const familii = [...new Set(CAZURI.map((c) => c.familie))];
for (const tol of TOLERANTE.filter((x) => x !== 0.001)) {
  for (const f of familii) {
    test(`(a) tol = ${tol}: familia ${f}`, () => {
      assert.deepEqual(CAZURI.filter((c) => c.familie === f).flatMap((c) => judeca(c, tol)), []);
    });
  }
}

test('(f) rezumatul: bucățile și abaterea maximă / tol, pe toleranțe', (t) => {
  for (const [tol, l] of [...masuri].sort(([a], [b]) => b - a)) {
    const b = l.reduce((s, m) => s + m.bucati, 0);
    const dev = Math.max(...l.map((m) => Math.max(m.curbaLant, m.lantCurba)));
    t.diagnostic(`tol = ${tol}: ${l.length} cubice, ${b} bucăți (max ${Math.max(...l.map((m) => m.bucati))} pe o cubică), abaterea max ${(dev / tol).toFixed(5)} × tol`);
  }
  assert.ok(masuri.size > 0, 'rezumatul rulează după (a)');
});
