/**
 * Carantina emulatoarelor (ADR 0040 §9; recenzia 3.2, 17.10): nu ajunge ca pagina să fie pe gazda locală, fiecare emulator
 * numit în `config.json` (contul, Firestore, funcțiile) trebuie să fie și el local; altfel conexiunea se refuză, înainte de
 * orice aplicație Firebase creată (rapoartele și tokenul de probă nu pleacă spre o gazdă oarecare).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conecteazaBaza, emulatoareLocale } from '../../src/cloud/conexiuneBaza.ts';

const LOCALE = { auth: 'http://127.0.0.1:9095', firestore: '127.0.0.1:8085', functions: '127.0.0.1:5005' };
const FIREBASE = { apiKey: 'k', authDomain: 'p.firebaseapp.com', projectId: 'p', appId: '1:1:web:1' };

test('emulatoarele locale: pagina și fiecare emulator pe localhost / 127.0.0.1', () => {
  assert.equal(emulatoareLocale(LOCALE, 'localhost'), true);
  assert.equal(emulatoareLocale({ auth: 'http://localhost:9099', firestore: 'localhost:8080', functions: 'localhost:5001' }, '127.0.0.1'), true);
});

test('un singur emulator în afară (sau o adresă nevalidă) refuză tot', () => {
  assert.equal(emulatoareLocale({ ...LOCALE, functions: 'colector.exemplu.ro:80' }, 'localhost'), false);
  assert.equal(emulatoareLocale({ ...LOCALE, firestore: 'colector.exemplu.ro:8085' }, 'localhost'), false);
  assert.equal(emulatoareLocale({ ...LOCALE, auth: 'http://colector.exemplu.ro:9095' }, 'localhost'), false);
  assert.equal(emulatoareLocale({ ...LOCALE, auth: 'nu e adresă' }, 'localhost'), false);
  assert.equal(emulatoareLocale({ ...LOCALE, functions: ':5005' }, 'localhost'), false);
  assert.equal(emulatoareLocale({ ...LOCALE, functions: 'localhost.colector.ro:80' }, 'localhost'), false);
  assert.equal(emulatoareLocale(LOCALE, 'cncvectorstudio-test.firebaseapp.com'), false, 'pagina în afară');
});

test('adresa contului citită ca de SDK, nu ca de URL (reverificarea 3.2): backslash-ul, utilizatorul, calea, alt protocol', () => {
  // `new URL` vede gazda `localhost`, dar @firebase/auth leagă contul de ce urmează după `@` (`colector.exemplu.ro`).
  assert.equal(emulatoareLocale({ ...LOCALE, auth: 'http://localhost\\@colector.exemplu.ro:9099' }, 'localhost'), false);
  assert.equal(emulatoareLocale({ ...LOCALE, auth: 'http://u@colector.exemplu.ro:9099' }, 'localhost'), false);
  assert.equal(emulatoareLocale({ ...LOCALE, auth: 'http://localhost@colector.exemplu.ro:9099' }, 'localhost'), false);
  assert.equal(emulatoareLocale({ ...LOCALE, auth: 'http://127.0.0.1:9095/cale' }, 'localhost'), false);
  assert.equal(emulatoareLocale({ ...LOCALE, auth: 'https://127.0.0.1:9095' }, 'localhost'), false);
  assert.equal(emulatoareLocale({ ...LOCALE, firestore: '127.0.0.1:8085@colector.exemplu.ro' }, 'localhost'), false);
  assert.equal(emulatoareLocale({ ...LOCALE, auth: 'http://127.0.0.1:9095/' }, 'localhost'), true, 'bara de la final e aceeași adresă');
});

test('conexiunea refuză emulatoarele cu o gazdă din afară, chiar pe localhost, fără să creeze aplicația', () => {
  const r = conecteazaBaza({ firebase: FIREBASE, emulatoare: { ...LOCALE, functions: 'colector.exemplu.ro:80' } }, 'localhost');
  assert.deepEqual(r, { ok: false, motiv: 'emulatoare-in-afara' });
});
