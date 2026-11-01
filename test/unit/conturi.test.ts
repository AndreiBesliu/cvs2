/**
 * Conturile clienților (ADR 0116), pe hârtie: setările (implicitele, marginile), capabilitățile fiecărui plan, planul efectiv
 * de pe server, forma dreptului ținut de aplicație și judecata lui offline (zilele, sfârșitul probei, ceasul dat înapoi),
 * zilele rămase și numele curățat.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CAPABILITATI } from '../../shared/capabilitati.ts';
import {
  capabilitatiPlan, curataNume, dreptBun, dreptDin, dreptLaZi, NUME_MAX, permite, ZI_MS, zileRamase, type Drept,
} from '../../shared/conturi.ts';
import { planEfectiv, SETARI_IMPLICITE, setariDin } from '../../shared/conturiPlan.ts';

const T0 = Date.UTC(2026, 10, 1, 10, 0);
const FARA_OPRITE = CAPABILITATI.filter((c) => c !== 'export-gcode' && c !== 'masina');

test('setările: implicitele owner-ului (7 zile offline, un an de păstrare); valorile întregi din margini, restul la implicit', () => {
  assert.deepEqual(SETARI_IMPLICITE, { zileOffline: 7, zilePastrareTichete: 365 });
  assert.deepEqual(setariDin(undefined), SETARI_IMPLICITE);
  assert.deepEqual(setariDin({ zileOffline: 3, zilePastrareTichete: 730 }), { zileOffline: 3, zilePastrareTichete: 730 });
  assert.deepEqual(setariDin({ zileOffline: 1, zilePastrareTichete: 3650 }), { zileOffline: 1, zilePastrareTichete: 3650 });
  assert.deepEqual(setariDin({ zileOffline: 0, zilePastrareTichete: 29 }), SETARI_IMPLICITE);
  assert.deepEqual(setariDin({ zileOffline: 61, zilePastrareTichete: 3651 }), SETARI_IMPLICITE);
  assert.deepEqual(setariDin({ zileOffline: 2.5, zilePastrareTichete: '400' }), SETARI_IMPLICITE);
});

test('capabilitățile: proba, planul gratuit și personalul au tot; expiratul și dezactivatul, fără exportul G-code și sender', () => {
  for (const p of ['proba', 'gratuit', 'personal'] as const) assert.deepEqual(capabilitatiPlan(p), [...CAPABILITATI]);
  for (const p of ['expirat', 'dezactivat'] as const) assert.deepEqual(capabilitatiPlan(p), FARA_OPRITE);
  assert.ok(FARA_OPRITE.includes('desen') && FARA_OPRITE.includes('export-vectori'));
});

test('planul efectiv: personalul câștigă; gratuitul și dezactivatul rămân; proba până la sfârșitul ei, apoi expirată', () => {
  assert.equal(planEfectiv('dezactivat', null, true, T0), 'personal');
  assert.equal(planEfectiv('gratuit', null, false, T0), 'gratuit');
  assert.equal(planEfectiv('dezactivat', T0 + ZI_MS, false, T0), 'dezactivat');
  assert.equal(planEfectiv('proba', T0 + 1, false, T0), 'proba');
  assert.equal(planEfectiv('proba', T0, false, T0), 'expirat');
  assert.equal(planEfectiv('proba', null, false, T0), 'expirat');
  assert.equal(planEfectiv('altceva', T0 + ZI_MS, false, T0), 'expirat');
  assert.equal(planEfectiv(undefined, null, false, T0), 'expirat');
  // Sfârșitul probei e doar al probei.
  assert.equal(dreptDin('proba', T0 + ZI_MS, 7, T0).pana, T0 + ZI_MS);
  assert.equal(dreptDin('gratuit', T0 + ZI_MS, 7, T0).pana, null);
});

test('dreptul ținut: forma verificată (planul, capabilitățile din catalog, numerele, zilele offline din margini)', () => {
  const bun: Drept = dreptDin('proba', T0 + 14 * ZI_MS, 7, T0);
  assert.equal(dreptBun(bun), true);
  assert.equal(dreptBun(JSON.parse(JSON.stringify(bun))), true);
  assert.equal(dreptBun(null), false);
  assert.equal(dreptBun({ ...bun, plan: 'aur' }), false);
  assert.equal(dreptBun({ ...bun, capabilitati: ['desen', 'zbor'] }), false);
  assert.equal(dreptBun({ ...bun, pana: 'mâine' }), false);
  assert.equal(dreptBun({ ...bun, calculatLa: Number.NaN }), false);
  assert.equal(dreptBun({ ...bun, zileOffline: 0 }), false);
  assert.equal(dreptBun({ ...bun, zileOffline: 61 }), false);
  assert.equal(dreptBun({ ...bun, zileOffline: 1.5 }), false);
});

test('dreptul judecat acum: ține zilele offline; după ele, după sfârșitul probei sau cu ceasul înapoi peste o zi, e expirat', () => {
  const gratuit = dreptDin('gratuit', null, 7, T0);
  assert.equal(dreptLaZi(gratuit, T0 + 7 * ZI_MS - 1), gratuit);
  assert.equal(dreptLaZi(gratuit, T0 + 7 * ZI_MS).plan, 'expirat');
  assert.deepEqual(dreptLaZi(gratuit, T0 + 7 * ZI_MS).capabilitati, FARA_OPRITE);
  // Ceasul cu câteva ore în urma serverului merge; cu peste o zi, nu.
  assert.equal(dreptLaZi(gratuit, T0 - 3 * 3_600_000), gratuit);
  assert.equal(dreptLaZi(gratuit, T0 - ZI_MS - 1).plan, 'expirat');
  // Proba se încheie la `pana`, chiar înaintea zilelor offline.
  const proba = dreptDin('proba', T0 + 2 * ZI_MS, 7, T0);
  assert.equal(dreptLaZi(proba, T0 + 2 * ZI_MS - 1).plan, 'proba');
  assert.equal(dreptLaZi(proba, T0 + 2 * ZI_MS).plan, 'expirat');
  // Expiratul și dezactivatul rămân cum sunt.
  const dez = dreptDin('dezactivat', null, 7, T0);
  assert.equal(dreptLaZi(dez, T0 + 100 * ZI_MS), dez);
});

test('permite: fără drept, tot; cu un drept, ce dă planul, judecat acum', () => {
  assert.equal(permite(null, 'export-gcode', T0), true);
  const proba = dreptDin('proba', T0 + 14 * ZI_MS, 7, T0);
  assert.equal(permite(proba, 'export-gcode', T0 + ZI_MS), true);
  assert.equal(permite(proba, 'masina', T0 + 8 * ZI_MS), false);
  assert.equal(permite(proba, 'desen', T0 + 8 * ZI_MS), true);
  assert.equal(permite(dreptDin('expirat', null, 7, T0), 'export-gcode', T0), false);
  assert.equal(permite(dreptDin('expirat', null, 7, T0), 'export-vectori', T0), true);
});

test('zilele rămase, rotunjite în sus; numele curățat (spațiile strânse, fără caractere de control, cel mult 60)', () => {
  assert.equal(zileRamase(T0 + 14 * ZI_MS, T0), 14);
  assert.equal(zileRamase(T0 + 13 * ZI_MS + 1, T0), 14);
  assert.equal(zileRamase(T0 + 1, T0), 1);
  assert.equal(zileRamase(T0 - ZI_MS, T0), 0);
  assert.equal(curataNume('  Ana   Popescu '), 'Ana Popescu');
  assert.equal(curataNume('Ștefan'), 'Ștefan');
  assert.equal(curataNume('a\u0000b'), null);
  assert.equal(curataNume('rând\nnou'), null);
  assert.equal(curataNume('   '), null);
  assert.equal(curataNume('x'.repeat(NUME_MAX)), 'x'.repeat(NUME_MAX));
  assert.equal(curataNume('x'.repeat(NUME_MAX + 1)), null);
  assert.equal(curataNume(42), null);
});
