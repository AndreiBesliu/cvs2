/**
 * Extensia ținută minte la reîncărcare (ADR 0232 §A.3): id-ul celei deschise, în browser, și ce se redeschide la pornire.
 * Doar o comoditate: o stocare care aruncă sau o valoare ciudată nu redeschid nimic.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHEIE_EXTENSIE_DESCHISA, deRedeschis, extensiaTinuta, tineExtensia, uitaExtensia } from '../../src/extensii/tinuta.ts';

function stocare(): { date: Map<string, string>; getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void } {
  const date = new Map<string, string>();
  return { date, getItem: (k) => date.get(k) ?? null, setItem: (k, v) => { date.set(k, v); }, removeItem: (k) => { date.delete(k); } };
}
const ARUNCA = {
  getItem(): string | null { throw new Error('stocarea e blocată'); },
  setItem(): void { throw new Error('stocarea e blocată'); },
  removeItem(): void { throw new Error('stocarea e blocată'); },
};
const INSTALATE = [{ id: 'salut', nume: 'Salut' }, { id: 'trenulet', nume: 'Easy 3Draw' }];
const ACASA = { hash: '', search: '' };

test('ținută, citită, uitată: sub cheia ei, doar un id de extensie', () => {
  const s = stocare();
  assert.equal(CHEIE_EXTENSIE_DESCHISA, 'cncvs2.extensie-deschisa');
  assert.equal(extensiaTinuta(s), null);
  tineExtensia('trenulet', s);
  assert.equal(s.date.get('cncvs2.extensie-deschisa'), 'trenulet');
  assert.equal(extensiaTinuta(s), 'trenulet');
  uitaExtensia(s);
  assert.equal(s.date.has('cncvs2.extensie-deschisa'), false);
  assert.equal(extensiaTinuta(s), null);
});

test('o valoare care nu e un id de extensie se citește ca lipsă', () => {
  for (const v of ['', 'Trenulet', 'a b', '../x', '<script>', 'a'.repeat(41), '{"id":"salut"}']) {
    const s = stocare();
    s.date.set(CHEIE_EXTENSIE_DESCHISA, v);
    assert.equal(extensiaTinuta(s), null, JSON.stringify(v));
  }
  const s = stocare();
  s.date.set(CHEIE_EXTENSIE_DESCHISA, 'a'.repeat(40));
  assert.equal(extensiaTinuta(s), 'a'.repeat(40));
});

test('o stocare care aruncă (fereastra privată, datele blocate) nu oprește nimic', () => {
  assert.equal(extensiaTinuta(ARUNCA), null);
  assert.doesNotThrow(() => { tineExtensia('salut', ARUNCA); });
  assert.doesNotThrow(() => { uitaExtensia(ARUNCA); });
  assert.equal(extensiaTinuta(null), null);
  assert.doesNotThrow(() => { tineExtensia('salut', null); uitaExtensia(null); });
});

test('la pornire se redeschide extensia ținută, dacă mai e instalată', () => {
  assert.equal(deRedeschis('trenulet', INSTALATE, ACASA), INSTALATE[1]);
  assert.equal(deRedeschis('salut', INSTALATE, ACASA), INSTALATE[0]);
  assert.equal(deRedeschis('scoasa', INSTALATE, ACASA), null);
  assert.equal(deRedeschis(null, INSTALATE, ACASA), null);
  assert.equal(deRedeschis('salut', [], ACASA), null);
});

test('o adresă care cere altceva are întâietate: instalarea, biblioteca, primirea unei lucrări, testul pas cu pas', () => {
  for (const hash of ['#instaleaza=https%3A%2F%2Fexemplu.ro%2Fa.zip', '#biblioteca', '#biblioteca=trenulet', '#primeste-lucrare']) {
    assert.equal(deRedeschis('salut', INSTALATE, { hash, search: '' }), null, hash);
  }
  for (const search of ['?test', '?test=1', '?a=1&test']) {
    assert.equal(deRedeschis('salut', INSTALATE, { hash: '', search }), null, search);
  }
  // O ancoră sau un parametru fără legătură nu o oprește.
  assert.equal(deRedeschis('salut', INSTALATE, { hash: '#altceva', search: '?limba=ro' }), INSTALATE[0]);
  assert.equal(deRedeschis('salut', INSTALATE, { hash: '', search: '?testul=1' }), INSTALATE[0]);
});
