/**
 * Contul ținut de aplicație (ADR 0116 §8), fără browser: textul stocării (stricat, altă formă, dreptul verificat), contul din
 * răspunsul serverului (cu drept, sau fără, la adresa neconfirmată), scrierea cu anunțul ascultătorilor și judecata
 * capabilităților din contul ținut (fără cont, tot; cu un drept expirat, fără exportul G-code și sender).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dreptDin, ZI_MS } from '../../shared/conturi.ts';
import { aboneazaCont, contDinRaspuns, contDinText, contTinut, contulPermite, puneCont, type ContTinut } from '../../src/app/dreptCont.ts';

const T0 = Date.UTC(2026, 10, 1, 10, 0);
const CONT: ContTinut = { uid: 'u1', email: 'ana@exemplu.ro', nume: 'Ana', drept: dreptDin('proba', T0 + 14 * ZI_MS, 7, T0) };

test('textul stocării: contul bun se citește; lipsa, JSON-ul stricat și o formă străină dau null', () => {
  assert.deepEqual(contDinText(JSON.stringify(CONT)), CONT);
  assert.deepEqual(contDinText(JSON.stringify({ ...CONT, drept: null })), { ...CONT, drept: null });
  assert.equal(contDinText(null), null);
  assert.equal(contDinText('{nu e json'), null);
  assert.equal(contDinText(JSON.stringify({ ...CONT, uid: '' })), null);
  assert.equal(contDinText(JSON.stringify({ ...CONT, drept: { ...CONT.drept, plan: 'aur' } })), null);
  assert.equal(contDinText(JSON.stringify({ email: 'x@y.ro' })), null);
});

test('contul din răspunsul serverului: cu dreptul lui; la adresa neconfirmată, fără drept (ca fără cont)', () => {
  const drept = dreptDin('gratuit', null, 7, T0);
  assert.deepEqual(contDinRaspuns('u2', { ok: true, verificat: true, email: 'ion@exemplu.ro', nume: 'Ion', drept }), { uid: 'u2', email: 'ion@exemplu.ro', nume: 'Ion', drept });
  assert.deepEqual(contDinRaspuns('u3', { ok: true, verificat: false, email: 'nou@exemplu.ro' }), { uid: 'u3', email: 'nou@exemplu.ro', nume: 'nou@exemplu.ro', drept: null });
});

test('scrierea anunță ascultătorii; capabilitățile urmează contul ținut (fără cont sau neconfirmat, tot)', () => {
  let anuntari = 0;
  const opreste = aboneazaCont(() => { anuntari++; });
  puneCont(null);
  assert.equal(contTinut(), null);
  assert.equal(contulPermite('export-gcode', T0), true);
  puneCont(CONT);
  assert.equal(contTinut(), CONT);
  assert.equal(contulPermite('export-gcode', T0 + ZI_MS), true);
  // După zilele offline fără reconfirmare, dreptul ținut se poartă ca expirat.
  assert.equal(contulPermite('export-gcode', T0 + 7 * ZI_MS), false);
  assert.equal(contulPermite('masina', T0 + 7 * ZI_MS), false);
  assert.equal(contulPermite('desen', T0 + 7 * ZI_MS), true);
  puneCont({ ...CONT, drept: null });
  assert.equal(contulPermite('export-gcode', T0 + 30 * ZI_MS), true);
  puneCont({ ...CONT, drept: dreptDin('dezactivat', null, 7, T0) });
  assert.equal(contulPermite('export-gcode', T0), false);
  assert.equal(anuntari, 4);
  opreste();
  puneCont(null);
  assert.equal(anuntari, 4);
});
