import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CHEIE_DEPOZIT, PLAFON_INTRARI, PLAFON_MESAJ, creeazaJurnal, type Context, type Depozit,
} from '../../src/app/jurnalErori.ts';

function depozitFals(): Depozit & { date: Map<string, string> } {
  const date = new Map<string, string>();
  return {
    date,
    getItem: (k) => date.get(k) ?? null,
    setItem: (k, v) => { date.set(k, v); },
    removeItem: (k) => { date.delete(k); },
  };
}

const ACUM = new Date('2026-10-07T12:00:00.000Z');
const CONTEXT: Context = { aplicatia: 'CNC Vector Studio', versiunea: 'abc', instanta: 'local', limba: 'ro', browserul: 'test' };

test('o eroare ajunge în depozit, cu tipul, mesajul și adresa', () => {
  const d = depozitFals();
  const j = creeazaJurnal(d, () => ACUM, () => 'http://localhost/');
  j.adauga('randare', new TypeError('x e nedefinit'));
  const intrari = j.citeste();
  assert.equal(intrari.length, 1);
  assert.equal(intrari[0]?.tip, 'randare');
  assert.equal(intrari[0]?.mesaj, 'TypeError: x e nedefinit');
  assert.equal(intrari[0]?.cand, ACUM.toISOString());
  assert.ok(d.date.get(CHEIE_DEPOZIT)?.includes('x e nedefinit'));
});

test(`se păstrează doar ultimele ${PLAFON_INTRARI} de intrări, cele mai vechi pleacă primele`, () => {
  const j = creeazaJurnal(depozitFals(), () => ACUM, () => '/');
  for (let i = 1; i <= PLAFON_INTRARI + 10; i++) j.adauga('fereastra', `eroarea ${i}`);
  const intrari = j.citeste();
  assert.equal(intrari.length, PLAFON_INTRARI);
  assert.equal(intrari[0]?.mesaj, 'eroarea 11');
  assert.equal(intrari.at(-1)?.mesaj, `eroarea ${PLAFON_INTRARI + 10}`);
});

test('un mesaj uriaș se taie, cu lungimea tăiată spusă', () => {
  const j = creeazaJurnal(depozitFals(), () => ACUM, () => '/');
  j.adauga('promisiune', 'a'.repeat(PLAFON_MESAJ + 500));
  const mesaj = j.citeste()[0]?.mesaj ?? '';
  assert.ok(mesaj.endsWith('… (+500)'), mesaj.slice(-20));
});

test('un depozit care aruncă la scriere nu pierde eroarea: rămâne în memorie', () => {
  const d: Depozit = { getItem: () => null, setItem: () => { throw new Error('plin'); }, removeItem: () => {} };
  const j = creeazaJurnal(d, () => ACUM, () => '/');
  j.adauga('fereastra', 'prima');
  assert.equal(j.citeste().length, 1);
});

test('un depozit stricat (JSON nevalid) nu blochează jurnalul', () => {
  const d = depozitFals();
  d.date.set(CHEIE_DEPOZIT, '{nu e json');
  const j = creeazaJurnal(d, () => ACUM, () => '/');
  j.adauga('fereastra', 'după stricare');
  assert.equal(j.citeste().at(-1)?.mesaj, 'după stricare');
});

test('fără depozit, jurnalul lucrează în memorie', () => {
  const j = creeazaJurnal(null, () => ACUM, () => '/');
  j.adauga('config', 'config.json: HTTP 404');
  assert.equal(j.citeste().length, 1);
});

test('raportul are antetul și fiecare intrare, iar golirea îl lasă fără intrări', () => {
  const j = creeazaJurnal(depozitFals(), () => ACUM, () => 'http://localhost/?x=1');
  j.adauga('randare', new Error('bum'), '\n    at Componenta');
  const raport = j.raport(CONTEXT);
  for (const bucata of ['versiunea: abc', 'instanța: local', 'intrări: 1', '[randare] Error: bum', 'adresa: http://localhost/?x=1', 'at Componenta']) {
    assert.ok(raport.includes(bucata), `lipsește „${bucata}” din raport`);
  }
  j.goleste();
  assert.equal(j.citeste().length, 0);
  assert.ok(j.raport(CONTEXT).includes('intrări: 0'));
});

test('ascultătorii află de fiecare intrare nouă', () => {
  const j = creeazaJurnal(depozitFals(), () => ACUM, () => '/');
  let apeluri = 0;
  const opreste = j.asculta(() => { apeluri++; });
  j.adauga('fereastra', 'a');
  opreste();
  j.adauga('fereastra', 'b');
  assert.equal(apeluri, 1);
});
