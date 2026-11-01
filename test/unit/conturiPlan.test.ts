/**
 * Fila Utilizatori și fila Setări (ADR 0116 §19, §20; felia 14.C↑b), pe hârtie: setările cerute (strict, fără implicit),
 * planurile ținute, schimbarea cerută (gratuit, proba de 1–365 de zile, dezactivarea, reactivarea), planul după fiecare
 * schimbare (cu planul de dinainte de dezactivare), egalitatea planurilor și planul văzut.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ZI_MS } from '../../shared/conturi.ts';
import {
  acelasiPlan, estePlanTinut, planDupa, planEfectiv, planVazutDin, schimbareDin, setariCerute, vazutDin, zileProbaBune, type PlanDocument,
} from '../../shared/conturiPlan.ts';

const T0 = Date.UTC(2026, 10, 1, 10, 0);

test('setările cerute: amândouă, întregi, în margini (1–60 de zile offline, 30–3 650 de păstrare); altfel cererea se refuză, fără implicit', () => {
  assert.deepEqual(setariCerute({ zileOffline: 7, zilePastrareTichete: 365 }), { zileOffline: 7, zilePastrareTichete: 365 });
  assert.deepEqual(setariCerute({ zileOffline: 1, zilePastrareTichete: 30 }), { zileOffline: 1, zilePastrareTichete: 30 });
  assert.deepEqual(setariCerute({ zileOffline: 60, zilePastrareTichete: 3650, alta: 1 }), { zileOffline: 60, zilePastrareTichete: 3650 });
  for (const x of [
    { zileOffline: 0, zilePastrareTichete: 365 }, { zileOffline: 61, zilePastrareTichete: 365 }, { zileOffline: 7, zilePastrareTichete: 29 },
    { zileOffline: 7, zilePastrareTichete: 3651 }, { zileOffline: 7.5, zilePastrareTichete: 365 }, { zileOffline: '7', zilePastrareTichete: 365 },
    { zileOffline: 7 }, { zilePastrareTichete: 365 }, {}, null, 7, 'x',
  ]) assert.equal(setariCerute(x), null, JSON.stringify(x));
});

test('planurile ținute: proba, gratuit, dezactivat; expiratul și personalul se deduc, nu se țin', () => {
  for (const p of ['proba', 'gratuit', 'dezactivat']) assert.equal(estePlanTinut(p), true, p);
  for (const p of ['expirat', 'personal', 'Proba', '', null, 3]) assert.equal(estePlanTinut(p), false, String(p));
});

test('schimbarea cerută: gratuit, dezactiveaza, reactiveaza; proba cu 1–365 de zile întregi; altceva se refuză', () => {
  assert.deepEqual(schimbareDin({ fel: 'gratuit' }), { fel: 'gratuit' });
  assert.deepEqual(schimbareDin({ fel: 'gratuit', zile: 5 }), { fel: 'gratuit' }, 'zilele nu se țin decât la probă');
  assert.deepEqual(schimbareDin({ fel: 'dezactiveaza' }), { fel: 'dezactiveaza' });
  assert.deepEqual(schimbareDin({ fel: 'reactiveaza' }), { fel: 'reactiveaza' });
  assert.deepEqual(schimbareDin({ fel: 'proba', zile: 1 }), { fel: 'proba', zile: 1 });
  assert.deepEqual(schimbareDin({ fel: 'proba', zile: 365 }), { fel: 'proba', zile: 365 });
  for (const x of [
    { fel: 'proba' }, { fel: 'proba', zile: 0 }, { fel: 'proba', zile: 366 }, { fel: 'proba', zile: 2.5 }, { fel: 'proba', zile: '14' },
    { fel: 'proba', zile: Number.NaN }, { fel: 'dezactivat' }, { fel: 'expirat' }, { fel: 'personal' }, {}, null, 'gratuit', [],
  ]) assert.equal(schimbareDin(x), null, JSON.stringify(x));
  for (const z of [1, 14, 365]) assert.equal(zileProbaBune(z), true, String(z));
  for (const z of [0, 366, -1, 1.5, '1', null]) assert.equal(zileProbaBune(z), false, String(z));
});

test('planul după schimbare: gratuitul și proba scot din dezactivare; dezactivarea ține planul de dinainte, reactivarea îl pune la loc', () => {
  const proba: PlanDocument = { plan: 'proba', probaPana: T0 + 3 * ZI_MS, inainte: null };
  assert.deepEqual(planDupa(proba, { fel: 'gratuit' }, T0), { plan: 'gratuit', probaPana: T0 + 3 * ZI_MS, inainte: null });
  // 30 de zile de azi, pe hârtie: 30 × 86 400 000 = 2 592 000 000 ms.
  assert.deepEqual(planDupa(proba, { fel: 'proba', zile: 30 }, T0), { plan: 'proba', probaPana: T0 + 2_592_000_000, inainte: null });
  const dez = planDupa(proba, { fel: 'dezactiveaza' }, T0);
  assert.deepEqual(dez, { plan: 'dezactivat', probaPana: T0 + 3 * ZI_MS, inainte: { plan: 'proba', probaPana: T0 + 3 * ZI_MS } });
  assert.equal(planDupa(proba, { fel: 'reactiveaza' }, T0), proba, 'reactivarea unui cont activ nu schimbă nimic');
  assert.equal(planDupa(dez, { fel: 'dezactiveaza' }, T0), dez, 'dezactivarea unui cont dezactivat nu schimbă nimic');
  assert.deepEqual(planDupa(dez, { fel: 'reactiveaza' }, T0 + 10 * ZI_MS), proba, 'reactivarea pune la loc proba, cu sfârșitul ei');

  const gratuit: PlanDocument = { plan: 'gratuit', probaPana: T0 - 5 * ZI_MS, inainte: null };
  const dezGratuit = planDupa(gratuit, { fel: 'dezactiveaza' }, T0);
  assert.deepEqual(dezGratuit, { plan: 'dezactivat', probaPana: T0 - 5 * ZI_MS, inainte: { plan: 'gratuit', probaPana: T0 - 5 * ZI_MS } });
  assert.deepEqual(planDupa(dezGratuit, { fel: 'reactiveaza' }, T0), gratuit);
  assert.deepEqual(planDupa(dezGratuit, { fel: 'proba', zile: 14 }, T0), { plan: 'proba', probaPana: T0 + 14 * ZI_MS, inainte: null });
  assert.deepEqual(planDupa(dezGratuit, { fel: 'gratuit' }, T0), gratuit);

  // Dezactivat din consolă, fără planul de dinainte: reactivarea dă o probă cu sfârșitul ei, deci expirată dacă a trecut.
  const dinConsola: PlanDocument = { plan: 'dezactivat', probaPana: T0 - 1, inainte: null };
  const reactivat = planDupa(dinConsola, { fel: 'reactiveaza' }, T0);
  assert.deepEqual(reactivat, { plan: 'proba', probaPana: T0 - 1, inainte: null });
  assert.equal(planEfectiv(reactivat.plan, reactivat.probaPana, false, T0), 'expirat');
  // Un plan ținut necunoscut se poartă ca o probă trecută; dezactivarea lui ține „proba”.
  assert.deepEqual(planDupa({ plan: 'xyz', probaPana: null, inainte: null }, { fel: 'dezactiveaza' }, T0), {
    plan: 'dezactivat', probaPana: null, inainte: { plan: 'proba', probaPana: null },
  });
});

test('același plan: planul, sfârșitul probei și planul de dinainte, toate', () => {
  const a: PlanDocument = { plan: 'dezactivat', probaPana: T0, inainte: { plan: 'gratuit', probaPana: T0 } };
  assert.equal(acelasiPlan(a, { ...a, inainte: { plan: 'gratuit', probaPana: T0 } }), true);
  assert.equal(acelasiPlan(a, { ...a, inainte: null }), false);
  assert.equal(acelasiPlan({ ...a, inainte: null }, a), false);
  assert.equal(acelasiPlan(a, { ...a, inainte: { plan: 'proba', probaPana: T0 } }), false);
  assert.equal(acelasiPlan(a, { ...a, inainte: { plan: 'gratuit', probaPana: T0 + 1 } }), false);
  assert.equal(acelasiPlan(a, { ...a, probaPana: T0 + 1 }), false);
  assert.equal(acelasiPlan(a, { ...a, plan: 'proba' }), false);
  assert.equal(acelasiPlan({ plan: 'gratuit', probaPana: null, inainte: null }, { plan: 'gratuit', probaPana: null, inainte: null }), true);
});

test('planul văzut: planul ținut (text, cel mult 40) sau null și sfârșitul probei (număr finit) sau null, amândouă; din document, planul ciudat devine null', () => {
  assert.deepEqual(planVazutDin({ plan: 'proba', probaPana: T0 }), { plan: 'proba', probaPana: T0 });
  assert.deepEqual(planVazutDin({ plan: null, probaPana: null }), { plan: null, probaPana: null });
  assert.deepEqual(planVazutDin({ plan: 'xyz', probaPana: null, alta: 1 }), { plan: 'xyz', probaPana: null });
  for (const x of [
    { plan: 'proba' }, { probaPana: T0 }, { plan: 5, probaPana: T0 }, { plan: 'x'.repeat(41), probaPana: T0 },
    { plan: 'proba', probaPana: Infinity }, { plan: 'proba', probaPana: '1' }, null, 'proba',
  ]) assert.equal(planVazutDin(x), null, JSON.stringify(x));
  assert.deepEqual(vazutDin({ plan: 7, probaPana: 1, inainte: null }), { plan: null, probaPana: 1 });
  assert.deepEqual(vazutDin({ plan: 'gratuit', probaPana: null, inainte: { plan: 'proba', probaPana: 2 } }), { plan: 'gratuit', probaPana: null });
});
