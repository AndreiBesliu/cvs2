/**
 * CONSTATĂRILE oracolului SVG (felia 2.7c, ADR 0035): reproduceri minime unde aplicația diferă de oracol, iar oracolul
 * urmează textul ADR-ului (`CONSTATARI` din `test/oracles/svg.cazuri.ts`, cu hârtia și motivul lângă fiecare). Testul
 * (0) cere ca oracolul să dea hârtia (trece); testul (a) cere ca aplicația să dea oracolul și PICĂ până la reparare
 * (sau până când ADR-ul spune altfel, iar cazul se mută în corpus cu valoarea nouă).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { citesteSvg } from '../../src/io/svg.ts';
import { citesteSvgO, judecaRezultat, parserTest } from '../oracles/svg.ts';
import { CONSTATARI, judecaHartia, judecaHartiaFinala, octetiCaz } from '../oracles/svg.cazuri.ts';
import { SEMINTE_CONSTATARI, svgAleator } from '../oracles/svg.aleator.ts';

test('constatările deschise ale oracolului (12.10: toate rezolvate; 2.7d: K7 rezolvată de amendamentul ADR 0036 §6)', () => {
  assert.deepEqual(CONSTATARI.map((c) => c.nume), []);
});

for (const c of CONSTATARI) {
  const o = citesteSvgO(octetiCaz(c), { pxPeTol: c.px ?? 96 });
  test(`(0) hârtia: ${c.nume}`, () => {
    assert.deepEqual(judecaHartia(o, c.hartie), []);
  });
  test(`(a) CONSTATARE, aplicația: ${c.nume}`, () => {
    const a = citesteSvg(octetiCaz(c), { pxPeTol: c.px ?? 96, parser: parserTest() });
    assert.deepEqual([...judecaRezultat(a, o), ...judecaHartiaFinala(a, o, c.hartie)], []);
  });
}

for (const s of SEMINTE_CONSTATARI) {
  test(`(a) CONSTATARE, aplicația: SVG-ul aleator cu sămânța ${s}`, () => {
    const { text, px } = svgAleator(s);
    const b = new TextEncoder().encode(text);
    assert.deepEqual(judecaRezultat(citesteSvg(b, { pxPeTol: px, parser: parserTest() }), citesteSvgO(b, { pxPeTol: px })), []);
  });
}
