/**
 * Fereastra ținută în browser (ADR 0132 §2): la pornire, aplicația se deschide în fereastra în care a rămas omul; o valoare
 * necunoscută (altă versiune, o fereastră scoasă), lipsa ei sau o stocare care aruncă dau prima fereastră a listei.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHEIE_FEREASTRA, fereastraTinuta, tineFereastra, type StocareFereastra } from '../../src/app/fereastra.ts';

const FERESTRE = ['proiectare', 'masina'] as const;

function stocare(initial: Record<string, string> = {}): StocareFereastra & { readonly date: Map<string, string> } {
  const date = new Map(Object.entries(initial));
  return { date, getItem: (k) => date.get(k) ?? null, setItem: (k, v) => { date.set(k, v); } };
}
const cadeLa = (ce: 'citire' | 'scriere'): StocareFereastra => ({
  getItem: () => { if (ce === 'citire') throw new Error('SecurityError'); return null; },
  setItem: () => { if (ce === 'scriere') throw new Error('QuotaExceededError'); },
});

test('fereastra ținută se redeschide; lipsa ei, o valoare necunoscută sau fără stocare: prima fereastră', () => {
  assert.equal(fereastraTinuta(FERESTRE, stocare({ [CHEIE_FEREASTRA]: 'masina' })), 'masina');
  assert.equal(fereastraTinuta(FERESTRE, stocare({ [CHEIE_FEREASTRA]: 'proiectare' })), 'proiectare');
  assert.equal(fereastraTinuta(FERESTRE, stocare()), 'proiectare');
  assert.equal(fereastraTinuta(FERESTRE, stocare({ [CHEIE_FEREASTRA]: 'planificator' })), 'proiectare');
  assert.equal(fereastraTinuta(FERESTRE, stocare({ [CHEIE_FEREASTRA]: '' })), 'proiectare');
  assert.equal(fereastraTinuta(FERESTRE, null), 'proiectare');
  assert.equal(fereastraTinuta(FERESTRE, cadeLa('citire')), 'proiectare');
  // Ordinea listei decide: un aranjament cu Mașina întâi pornește în ea.
  assert.equal(fereastraTinuta(['masina', 'proiectare'], stocare()), 'masina');
});

test('fereastra se scrie sub cheia ei; o stocare plină sau refuzată nu oprește schimbarea ferestrei', () => {
  const s = stocare();
  tineFereastra('masina', s);
  assert.equal(s.date.get(CHEIE_FEREASTRA), 'masina');
  tineFereastra('proiectare', s);
  assert.equal(s.date.get(CHEIE_FEREASTRA), 'proiectare');
  assert.doesNotThrow(() => { tineFereastra('masina', cadeLa('scriere')); });
  assert.doesNotThrow(() => { tineFereastra('masina', null); });
  assert.equal(CHEIE_FEREASTRA, 'cncvs2.fereastra');
});
