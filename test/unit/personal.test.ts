import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  curataNumeRol, curataPermisiuni, esteIdRol, esteRolValid, normalizeazaEmail, OWNER, PERMISIUNI, permisiuniDin,
} from '../../shared/personal.ts';

/** Personalul (ADR 0049): catalogul de permisiuni, rolul fix, validările cererilor; și legătura cu regulile. */

const ID = 'AbCdEfGhIjKlMnOpQrSt';

test('permisiunile: owner are tot catalogul; un rol custom doar ce e în catalog din lista lui; restul nimic', () => {
  assert.deepEqual([...permisiuniDin(OWNER, undefined)], [...PERMISIUNI]);
  assert.deepEqual([...permisiuniDin(ID, ['erori.citeste', 'necunoscuta', 'erori.citeste', 7])], ['erori.citeste']);
  assert.equal(permisiuniDin(ID, 'erori.citeste').size, 0, 'o listă, nu un text');
  // Treptele vechi (ADR 0040) și un rol cu altă formă nu dau nimic, chiar cu o listă de permisiuni lângă ele.
  for (const rol of ['support', 'admin', 'Owner', '', undefined, null, 3, 'roluri/x', `${ID}x`]) {
    assert.equal(permisiuniDin(rol, [...PERMISIUNI]).size, 0, String(rol));
  }
});

test('forma rolului: owner sau un id de 20 de caractere alfanumerice (forma id-urilor date de server)', () => {
  assert.equal(esteRolValid(OWNER), true);
  assert.equal(esteRolValid(ID), true);
  assert.equal(esteIdRol(OWNER), false, 'owner nu e un rol custom');
  for (const x of ['admin', 'support', `${ID}x`, ID.slice(1), `${ID.slice(1)}/`, `${ID.slice(1)}-`, '', null, 5]) assert.equal(esteRolValid(x), false, String(x));
});

test('lista de permisiuni a unei cereri: în ordinea catalogului, fără dubluri; altceva = refuz', () => {
  assert.deepEqual(curataPermisiuni(['documentatie.citeste', 'erori.citeste', 'erori.citeste']), ['erori.citeste', 'documentatie.citeste']);
  assert.deepEqual(curataPermisiuni([]), []);
  assert.equal(curataPermisiuni(['erori.citeste', 'personal.administreaza']), null, 'administrarea personalului nu e în catalog');
  assert.equal(curataPermisiuni('erori.citeste'), null);
  assert.equal(curataPermisiuni([1]), null);
  assert.equal(curataPermisiuni(Array.from({ length: 51 }, () => 'erori.citeste')), null);
});

test('numele rolului: spațiile adunate, 1–40 de caractere, fără caractere de control', () => {
  assert.equal(curataNumeRol('  Suport   tehnic '), 'Suport tehnic');
  assert.equal(curataNumeRol('Ș'.repeat(40)), 'Ș'.repeat(40));
  assert.equal(curataNumeRol('Ș'.repeat(41)), null);
  for (const x of ['', '   ', 'a\u0001b', 3, null]) assert.equal(curataNumeRol(x), null, JSON.stringify(x));
});

test('e-mailul: litere mici, o singură @, domeniul cu punct, fără spații', () => {
  assert.equal(normalizeazaEmail('  Ion.Pop@Exemplu.RO '), 'ion.pop@exemplu.ro');
  for (const x of ['ion', 'ion@', '@x.ro', 'ion@x', 'i on@x.ro', 'a@b@c.ro', `${'a'.repeat(65)}@x.ro`, `a@${'b'.repeat(250)}.ro`, 7]) {
    assert.equal(normalizeazaEmail(x), null, String(x));
  }
});

test('regulile: catalogul din cod e cel din reguli (fiecare permisiune e verificată undeva), iar forma id-ului e aceeași', () => {
  const reguli = readFileSync('firestore.rules', 'utf8');
  // Fiecare permisiune pe care o verifică regulile e în catalog, iar cele din catalog pe care nu le verifică regulile sunt
  // ale serverului (erori.rezolva) sau ale paginii (documentatie.citeste); niciuna nu e uitată.
  const inReguli = [...reguli.matchAll(/are\('([a-z.]+)'\)/g)].map((m) => m[1]);
  for (const p of inReguli) assert.ok((PERMISIUNI as readonly string[]).includes(p ?? ''), `${p ?? ''} din reguli nu e în catalog`);
  assert.deepEqual([...new Set(inReguli)].sort(), ['audit.citeste', 'diagnoza.citeste', 'erori.citeste']);
  assert.ok(reguli.includes("'^[A-Za-z0-9]{20}$'"), 'forma id-ului de rol din reguli');
  assert.ok(!/nivelRol|'support'|'admin'/.test(reguli), 'treptele vechi au ieșit din reguli');
});
