import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CAPABILITATI } from '../../shared/capabilitati.ts';
import { contDin, planAfisat } from '../../src/admin/utilizatori/date.ts';

/** Fila Utilizatori (ADR 0116 §19), partea pură: documentele `conturi/{uid}` ca rânduri, planul de arătat, planul văzut. */

const ts = (iso: string) => ({ toDate: () => new Date(iso) });
const PANA = '2026-11-15T10:00:00.000Z';
const ACUM = Date.parse('2026-11-01T10:00:00.000Z');
const drept = (plan: string, zileOffline = 7) => ({ plan, capabilitati: [...CAPABILITATI], pana: null, calculatLa: ACUM, zileOffline });

test('contul: câmpurile documentului, planul ținut, planul văzut (în milisecunde, pentru server)', () => {
  const c = contDin('ana', {
    email: 'ana@exemplu.ro', nume: 'Ana', creatLa: ts('2026-10-31T09:00:00Z'), ultimaLogare: ts('2026-11-01T08:00:00Z'), plan: 'proba',
    probaPana: ts(PANA), drept: drept('proba'),
  });
  assert.deepEqual(
    [c.uid, c.email, c.nume, c.creatLa?.toISOString(), c.ultimaLogare?.toISOString(), c.plan, c.probaPana?.toISOString(), c.personal],
    ['ana', 'ana@exemplu.ro', 'Ana', '2026-10-31T09:00:00.000Z', '2026-11-01T08:00:00.000Z', 'proba', PANA, false],
  );
  assert.deepEqual(c.vazut, { plan: 'proba', probaPana: Date.parse(PANA) });
});

test('ce lipsește e necunoscut: fără câmpuri, un plan ținut ciudat (văzut ca text, arătat ca expirat), un drept stricat (nu e personal)', () => {
  const gol = contDin('x', {});
  assert.deepEqual([gol.email, gol.nume, gol.creatLa, gol.ultimaLogare, gol.plan, gol.probaPana, gol.personal], [null, null, null, null, null, null, false]);
  assert.deepEqual(gol.vazut, { plan: null, probaPana: null });
  const ciudat = contDin('y', { plan: 'xyz', probaPana: 'mâine', email: '' });
  assert.deepEqual([ciudat.plan, ciudat.probaPana, ciudat.email], [null, null, null]);
  assert.deepEqual(ciudat.vazut, { plan: 'xyz', probaPana: null }, 'serverul compară cu valoarea din document, așa cum e');
  assert.equal(planAfisat(ciudat, ACUM), 'expirat');
  assert.equal(contDin('z', { plan: 'gratuit', drept: drept('personal', 0) }).personal, false, 'dreptul cu zilele offline în afara marginilor nu contează');
  assert.equal(contDin('z', { plan: 'gratuit', drept: 'personal' }).personal, false);
});

test('planul arătat: personalul (din ultimul drept) peste orice plan ținut; proba până la sfârșit, apoi expirată; gratuit și dezactivat', () => {
  const pers = contDin('p', { plan: 'dezactivat', drept: drept('personal') });
  assert.equal(pers.personal, true);
  assert.equal(planAfisat(pers, ACUM), 'personal');
  const proba = contDin('a', { plan: 'proba', probaPana: ts(PANA) });
  assert.equal(planAfisat(proba, ACUM), 'proba');
  assert.equal(planAfisat(proba, Date.parse(PANA) - 1), 'proba');
  assert.equal(planAfisat(proba, Date.parse(PANA)), 'expirat', 'la sfârșitul probei, expirată (ca pe server)');
  assert.equal(planAfisat(contDin('b', { plan: 'proba' }), ACUM), 'expirat', 'o probă fără sfârșit e expirată');
  assert.equal(planAfisat(contDin('c', { plan: 'gratuit', probaPana: ts('2020-01-01T00:00:00Z') }), ACUM), 'gratuit');
  assert.equal(planAfisat(contDin('d', { plan: 'dezactivat', probaPana: ts(PANA) }), ACUM), 'dezactivat');
});
