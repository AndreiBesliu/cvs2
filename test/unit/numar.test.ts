/** Numerele scrise în dialogul de export: virgula și punctul zecimal, nimic altceva (felia 2.2, recenzia). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { citesteNumar, textNumar } from '../../src/ui/numar.ts';

test('virgula și punctul zecimal se citesc la fel; spațiile de margine nu contează', () => {
  for (const [s, v] of [['2,5', 2.5], ['2.5', 2.5], [' 8 ', 8], ['5.', 5], [',5', 0.5], ['.25', 0.25], ['3,175', 3.175], ['0', 0], ['1000', 1000]] as const) {
    assert.equal(citesteNumar(s), v, s);
  }
});

test('tot restul e refuzat (null), nu citit greșit: gol, semn, exponent, separator de mii, două zecimale, text', () => {
  for (const s of ['', ' ', '-1', '+1', '1e3', '1E3', '1.000,5', '1,000.5', '2,5,1', '2..5', 'abc', '5 mm', 'Infinity', 'NaN', '0x10', '½', '٣']) {
    assert.equal(citesteNumar(s), null, JSON.stringify(s));
  }
});

test('textul unei valori din document se citește înapoi la exact aceeași valoare, fără exponent', () => {
  // Valori obișnuite, foarte mici, cu toate cifrele dublei (0,1 + 0,2), și 20 000 de dubluri oarecare din (0, 1000],
  // dintr-un generator cu sămânță (aceleași la fiecare rulare). Fără asta, un Exportă neatins rescria valoarea rotunjită.
  const fixe = [8, 4, 3, 2.5, 3.175, 0.1, 1e-7, 1.2345e-7, 0.0004, 1000, 6.35, 12.7, 0.1 + 0.2, 0.000012345678901234568, 5e-324, 1e-21];
  let x = 0x9e3779b9;
  const urmator = (): number => {
    x = (x + 0x6d2b79f5) | 0;
    let t = Math.imul(x ^ (x >>> 15), 1 | x);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const oarecare = Array.from({ length: 20_000 }, (_, k) => (k % 2 === 0 ? urmator() * 1000 : urmator() ** 8 * 1000)).filter((v) => v > 0);
  for (const v of [...fixe, ...oarecare]) {
    const s = textNumar(v);
    assert.ok(!/e/i.test(s), `${v}: ${s}`);
    assert.equal(citesteNumar(s), v, `${v}: ${s}`);
  }
});

test('în română, valoarea se arată cu virgulă și se citește înapoi la fel; întregii rămân fără separator', () => {
  for (const x of [2.5, 3.175, 0.1 + 0.2, 1e-7, 8, 1000, 0.000012345678901234568]) {
    const s = textNumar(x, true);
    assert.ok(!s.includes('.'), s);
    assert.equal(citesteNumar(s), x, s);
  }
  assert.equal(textNumar(2.5, true), '2,5');
  assert.equal(textNumar(8, true), '8');
  assert.equal(textNumar(2.5), '2.5', 'fără virgulă, punctul');
});
