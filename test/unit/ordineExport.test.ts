/**
 * Ordinea tăierii din fereastra exportului (ADR 0133 §3), pe hârtie: ordinea de la deschidere (automată sau din ranguri),
 * mutarea unui rând, rândurile V-carve legate și riscurile ordinii de mână.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { legaturi, muta, ordineAutomata, ordineDinRanguri, riscuri, type RandOrdine } from '../../src/ui/ordineExport.ts';

const r = (piesa: string, latura: RandOrdine['latura'], extra: Partial<RandOrdine> = {}): RandOrdine => ({ piesa, latura, despartire: false, vcarve: null, ...extra });

test('ordinea automată: cea a lucrării, apoi rândurile fără tăieturi, în ordinea listei', () => {
  assert.deepEqual(ordineAutomata(['b/1', 'a/1'], ['a/1', 'b/1', 'c/1']), ['b/1', 'a/1', 'c/1']);
  // O cheie a lucrării care nu mai e rând (o operație ștearsă) nu apare.
  assert.deepEqual(ordineAutomata(['x/1', 'a/1'], ['a/1']), ['a/1']);
});

test('ordinea din ranguri: după rang, cu ordinea automată între rangurile egale și după cele fără rang; fără ranguri, null', () => {
  const auto = ['a/1', 'b/1', 'c/1', 'd/1'];
  assert.equal(ordineDinRanguri(auto, new Map()), null);
  assert.deepEqual(ordineDinRanguri(auto, new Map([['d/1', 0], ['c/1', 1], ['b/1', 2], ['a/1', 3]])), ['d/1', 'c/1', 'b/1', 'a/1']);
  assert.deepEqual(ordineDinRanguri(auto, new Map([['c/1', 0], ['a/1', 0]])), ['a/1', 'c/1', 'b/1', 'd/1']);
});

test('mutarea: rândul trece pe locul cerut, ceilalți își păstrează ordinea; un loc în afara listei nu schimbă nimic', () => {
  const o = ['a', 'b', 'c', 'd'];
  assert.deepEqual(muta(o, 0, 2), ['b', 'c', 'a', 'd']);
  assert.deepEqual(muta(o, 3, 0), ['d', 'a', 'b', 'c']);
  assert.deepEqual(muta(o, 1, 2), ['a', 'c', 'b', 'd']);
  assert.deepEqual(muta(o, 0, 4), o);
  assert.deepEqual(muta(o, -1, 0), o);
});

test('rândurile legate: V-carve-urile aceleiași piese, cu aceleași valori, arată locul primului; altă piesă sau alte valori, nu', () => {
  const randuri = new Map<string, RandOrdine>([
    ['p/1', r('p', 'interior', { vcarve: 'V90 3' })],
    ['q/1', r('q', 'exterior')],
    ['p/2', r('p', 'interior', { vcarve: 'V90 3' })],
    ['p/3', r('p', 'interior', { vcarve: 'V60 2' })],
    ['s/1', r('s', 'interior', { vcarve: 'V90 3' })],
  ]);
  assert.deepEqual([...legaturi(['p/1', 'q/1', 'p/2', 'p/3', 's/1'], randuri)], [['p/2', 1]]);
  // Al doilea mutat întâi: el devine primul, iar celălalt arată locul lui.
  assert.deepEqual([...legaturi(['p/2', 'q/1', 'p/1', 'p/3', 's/1'], randuri)], [['p/1', 1]]);
});

test('riscurile: exteriorul unei piese înaintea altei operații a ei; despărțirea înaintea altei operații; câte unul, cu locurile', () => {
  const randuri = new Map<string, RandOrdine>([
    ['A/ext', r('A', 'exterior')],
    ['A/gaura', r('A', 'interior')],
    ['A/linie', r('A', 'pe-linie')],
    ['B/ext', r('B', 'exterior')],
    ['F/desp', r('F', 'pe-linie', { despartire: true })],
  ]);
  // Ordinea automată: nimic.
  assert.deepEqual(riscuri(['A/gaura', 'A/linie', 'A/ext', 'B/ext', 'F/desp'], randuri), []);
  // Exteriorul lui A întâi: un singur risc pentru A (rândul 1 înaintea rândului 2), chiar dacă îl urmează două operații.
  assert.deepEqual(riscuri(['A/ext', 'A/gaura', 'A/linie', 'B/ext', 'F/desp'], randuri), [{ fel: 'exterior', a: 1, b: 2 }]);
  // Exteriorul altei piese înainte nu e un risc pentru A.
  assert.deepEqual(riscuri(['B/ext', 'A/gaura', 'A/linie', 'A/ext', 'F/desp'], randuri), []);
  // Despărțirea întâi: un risc, cu primul rând de după ea.
  assert.deepEqual(riscuri(['F/desp', 'A/gaura', 'A/linie', 'A/ext', 'B/ext'], randuri), [{ fel: 'despartire', a: 1, b: 2 }]);
});

test('riscul pe alte piese: exteriorul tăiat înaintea unui rând din interiorul lui; câte unul pe exterior, cu rândul care îl cuprinde', () => {
  // Rama R cuprinde dreptunghiul D și cercul C; D cuprinde C. D are două exterioare (o piesă grupată), doar al doilea cuprinde C.
  const randuri = new Map<string, RandOrdine>([
    ['R/ext', r('R', 'exterior', { inauntru: ['D/ext1', 'C/gaura'] })],
    ['D/ext1', r('D', 'exterior')],
    ['D/ext2', r('D', 'exterior', { inauntru: ['C/gaura'] })],
    ['C/gaura', r('C', 'interior')],
  ]);
  // Gaura întâi: nimic. Un exterior din interiorul altuia nu e un risc (ordinea automată nu le ordonează nici ea).
  assert.deepEqual(riscuri(['C/gaura', 'D/ext1', 'D/ext2', 'R/ext'], randuri), []);
  assert.deepEqual(riscuri(['R/ext', 'D/ext1', 'D/ext2', 'C/gaura'], randuri), [{ fel: 'exterior', a: 1, b: 4 }, { fel: 'exterior', a: 3, b: 4 }]);
  // Rândul spus e exteriorul care cuprinde gaura (3), nu primul exterior al piesei (2).
  assert.deepEqual(riscuri(['D/ext1', 'D/ext2', 'C/gaura', 'R/ext'], randuri), [{ fel: 'exterior', a: 2, b: 3 }]);
});
