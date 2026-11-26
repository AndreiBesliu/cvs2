import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cuValorileDinCont, imbinaPreferinte } from '../../src/model/preferinteSincron.ts';

/**
 * Îmbinarea setărilor din cont (ADR 0330, întrebarea 14a, felia 10.4↑g), pură, pe hârtie: câmp cu câmp, față de ultima
 * versiune comună (baza): ce s-a schimbat doar aici rămâne, ce s-a schimbat doar în cont vine, ce e la fel în ambele e
 * bun; un câmp schimbat altfel în ambele e o ciocnire (rămâne, deocamdată, ca aici). Obiectele se îmbină pe câmpuri, iar
 * orice altceva (și listele) e o valoare întreagă. Un câmp lipsă e „nedat”.
 */

const B = { v: 1, cifre: { unitate: 'mm', zecimale: 2, separator: 'limba' }, linii: { distanta: 10, capete: ['sageata', 'sageata'] } };

test('neschimbat nicăieri: baza; schimbat doar aici: rămâne; doar în cont: vine; la fel în ambele: bun, fără ciocnire', () => {
  assert.deepEqual(imbinaPreferinte(B, B, B), { rezultat: B, ciocniri: [] });
  const aici = { ...B, cifre: { ...B.cifre, zecimale: 3 } };
  const cont = { ...B, linii: { ...B.linii, distanta: 12 } };
  assert.deepEqual(imbinaPreferinte(B, aici, cont), {
    rezultat: { v: 1, cifre: { unitate: 'mm', zecimale: 3, separator: 'limba' }, linii: { distanta: 12, capete: ['sageata', 'sageata'] } },
    ciocniri: [],
  });
  const ambele = { ...B, cifre: { ...B.cifre, unitate: 'inch' } };
  assert.deepEqual(imbinaPreferinte(B, ambele, ambele), { rezultat: ambele, ciocniri: [] });
});

test('ciocnirea: același câmp schimbat altfel aici și în cont rămâne ca aici, cu calea lui; celelalte câmpuri se îmbină', () => {
  const aici = { ...B, cifre: { ...B.cifre, unitate: 'cm', zecimale: 1 } };
  const cont = { ...B, cifre: { ...B.cifre, unitate: 'inch' }, linii: { ...B.linii, distanta: 8 } };
  const m = imbinaPreferinte(B, aici, cont);
  assert.deepEqual(m.ciocniri, [['cifre', 'unitate']]);
  assert.deepEqual(m.rezultat, { v: 1, cifre: { unitate: 'cm', zecimale: 1, separator: 'limba' }, linii: { distanta: 8, capete: ['sageata', 'sageata'] } });
  // „Ia-le pe cele din cont”: câmpurile ciocnite primesc valoarea din cont; restul rămâne îmbinat.
  assert.deepEqual(cuValorileDinCont(m.rezultat, cont, m.ciocniri), {
    v: 1, cifre: { unitate: 'inch', zecimale: 1, separator: 'limba' }, linii: { distanta: 8, capete: ['sageata', 'sageata'] },
  });
});

test('un câmp scos în cont, schimbat aici: ciocnire; „Ia-le pe cele din cont” îl scoate și aici', () => {
  const m = imbinaPreferinte({ a: 1, b: { c: 1 } }, { a: 2, b: { c: 2 } }, { b: {} });
  assert.deepEqual(m.ciocniri, [['a'], ['b', 'c']]);
  assert.deepEqual(m.rezultat, { a: 2, b: { c: 2 } });
  assert.deepEqual(cuValorileDinCont(m.rezultat, { b: {} }, m.ciocniri), { b: {} });
});

test('o listă e o valoare întreagă: schimbată altfel în ambele, ciocnire pe toată lista, nu pe elemente', () => {
  const aici = { ...B, linii: { ...B.linii, capete: ['punct', 'sageata'] } };
  const cont = { ...B, linii: { ...B.linii, capete: ['sageata', 'oblic'] } };
  const m = imbinaPreferinte(B, aici, cont);
  assert.deepEqual(m.ciocniri, [['linii', 'capete']]);
  assert.deepEqual((m.rezultat['linii'] as Record<string, unknown>)['capete'], ['punct', 'sageata']);
});

test('fără bază (prima trecere a acestui browser): baza e cea dată de apelant; câmpurile lipsă sunt „nedate”', () => {
  // Un câmp nou doar în cont (o versiune mai nouă a aplicației) vine; unul nou doar aici rămâne; scos doar în cont, pleacă.
  const aici = { ...B, local: true };
  const cont = { v: 1, cifre: B.cifre, nou: { x: 1 } };
  const m = imbinaPreferinte(B, aici, cont);
  assert.deepEqual(m.ciocniri, []);
  assert.deepEqual(m.rezultat, { v: 1, cifre: B.cifre, local: true, nou: { x: 1 } });
  // Același câmp nou, cu valori diferite: ciocnire; cu o parte obiect și cealaltă valoare: ciocnire pe tot câmpul.
  assert.deepEqual(imbinaPreferinte({}, { a: 1 }, { a: 2 }).ciocniri, [['a']]);
  assert.deepEqual(imbinaPreferinte({}, { a: { x: 1 } }, { a: 3 }).ciocniri, [['a']]);
  assert.deepEqual(imbinaPreferinte({}, { a: { x: 1 } }, { a: { y: 2 } }), { rezultat: { a: { x: 1, y: 2 } }, ciocniri: [] });
});

test('cheile primejdioase sunt date, nu prototipuri: „__proto__” se îmbină ca orice câmp, fără să atingă Object.prototype', () => {
  const aici = JSON.parse('{"__proto__":{"rau":1},"a":1}') as Record<string, unknown>;
  const cont = JSON.parse('{"__proto__":{"rau":1},"b":2}') as Record<string, unknown>;
  const m = imbinaPreferinte({}, aici, cont);
  assert.equal(({} as Record<string, unknown>)['rau'], undefined);
  assert.deepEqual(Object.keys(m.rezultat).sort(), ['__proto__', 'a', 'b']);
  assert.equal(Object.getPrototypeOf(m.rezultat), Object.prototype);
  assert.deepEqual(JSON.parse(JSON.stringify(m.rezultat)), JSON.parse('{"__proto__":{"rau":1},"a":1,"b":2}'));
});
