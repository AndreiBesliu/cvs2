import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cotaCuDistanta, cotaCuText, cotaDezlegata, stareCota, type PunctCota } from '../../src/model/cote.ts';
import type { Cota } from '../../src/model/document.ts';
import { citesteAscunse, textAscunse } from '../../src/ui/coteVedere.ts';

/**
 * Panoul cotei și lista (ADR 0330 §5, felia 10.4↑a-4), partea pură: „Dezleagă” (fiecare capăt legat își scrie punctul citit
 * acum și pierde legătura, într-o singură scriere), textul cu `<>`, distanța liniei, starea pe care o spune panoul și foile
 * cu cotele ascunse din ochiul listei, ținute în browser.
 */
const leg = { instanta: 'i1', nod: 'e', loc: { fel: 'varf' as const, k: 0 }, n: 4 };
const cota: Cota = {
  id: 'c1', fel: 'aliniata',
  puncte: [{ x: 10, y: 20, legatura: leg, viitor: 7 }, { x: 110, y: 20 }],
  linie: { d: -10, s1: -1 }, text: '2× <>',
};
const P = (x: number, y: number, stare: PunctCota['stare'], motiv?: 'forma' | 'noduri'): PunctCota => ({ p: { x, y }, stare, ...(motiv ? { motiv } : {}) });

test('„Dezleagă”: capătul legat ia punctul citit acum și pierde legătura; restul cotei rămâne, la fel câmpurile necunoscute', () => {
  const r = cotaDezlegata(cota, [P(30, 40, 'legata'), P(110, 20, 'libera')]);
  assert.deepEqual(r.puncte, [{ x: 30, y: 40, viitor: 7 }, { x: 110, y: 20 }]);
  assert.deepEqual(r.linie, { d: -10, s1: -1 });
  assert.equal(r.text, '2× <>');
  assert.equal(r.id, 'c1');
  assert.ok(cota.puncte?.[0]?.legatura, 'originalul neatins');
  // Un capăt deja dezlegat rămâne în ultimul loc văzut (punctul citit e chiar al lui), fără legătură.
  const d = cotaDezlegata(cota, [P(10, 20, 'dezlegata', 'forma'), P(110, 20, 'libera')]);
  assert.deepEqual(d.puncte?.[0], { x: 10, y: 20, viitor: 7 });
});

test('textul: gol, doar spații sau doar „<>” scoate câmpul (rămâne cifra); altfel se ține exact', () => {
  for (const t of ['', '   ', '<>', ' <> ']) assert.equal(Object.hasOwn(cotaCuText(cota, t), 'text'), false, JSON.stringify(t));
  assert.equal(cotaCuText(cota, '4× Ø<>').text, '4× Ø<>');
  assert.equal(cotaCuText(cota, 'lățimea').text, 'lățimea', 'fără <>: textul în locul cifrei');
  const { text: _, ...fara } = cota;
  assert.equal(cotaCuText(fara as Cota, '<> pe ambele părți').text, '<> pe ambele părți');
});

test('distanța liniei de cotă se scrie în `linie.d`, cu restul liniei neatins', () => {
  assert.deepEqual(cotaCuDistanta(cota, 25).linie, { d: 25, s1: -1 });
  assert.deepEqual(cotaCuDistanta({ id: 'x', fel: 'orizontala' }, -3).linie, { d: -3 });
});

test('starea din panou: dezlegată (cu motivul primului capăt dezlegat), legată dacă vreun capăt e legat, altfel liberă', () => {
  assert.deepEqual(stareCota([P(0, 0, 'legata'), P(1, 0, 'dezlegata', 'noduri')]), { stare: 'dezlegata', motiv: 'noduri' });
  assert.deepEqual(stareCota([P(0, 0, 'dezlegata', 'forma'), P(1, 0, 'dezlegata', 'noduri')]), { stare: 'dezlegata', motiv: 'forma' });
  assert.deepEqual(stareCota([P(0, 0, 'libera'), P(1, 0, 'legata')]), { stare: 'legata', motiv: null });
  assert.deepEqual(stareCota([P(0, 0, 'libera'), P(1, 0, 'libera')]), { stare: 'libera', motiv: null });
});

test('foile cu cotele ascunse (ochiul listei), ținute ca listă de id-uri; orice altceva, nicio foaie ascunsă', () => {
  assert.deepEqual([...citesteAscunse(textAscunse(new Set(['f1', 'f2'])))].sort(), ['f1', 'f2']);
  for (const t of [null, 'stricat', '{}', '[1,2]', '"f1"']) assert.equal(citesteAscunse(t).size, 0, String(t));
  assert.deepEqual([...citesteAscunse('["f1", 3, "f2", "f1"]')].sort(), ['f1', 'f2'], 'doar textele, o dată');
});
