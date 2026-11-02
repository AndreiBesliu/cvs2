/**
 * Meniul contului (ADR 0120), pe hârtie: rândurile după cine e logat (raportările doar cu contul deschis, ADR 0116 §C) și
 * unde stă sugestia; capul (nimeni logat, adresa
 * neconfirmată, proba cu zilele ei, proba trecută la data ei sau după zilele offline, celelalte planuri), în ambele limbi;
 * numele și inițialele de pe butonul Cont.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import './limbi.ts';
import { CAPABILITATI } from '../../shared/capabilitati.ts';
import { capabilitatiPlan, ZI_MS, type Drept, type Plan } from '../../shared/conturi.ts';
import { capMeniuCont, initiale, numeButon, randuriMeniuCont } from '../../src/app/meniuCont.ts';
import type { ContTinut } from '../../src/app/dreptCont.ts';
import { enEditare } from '../../src/i18n/editare.en.ts';
import { roEditare } from '../../src/i18n/editare.ro.ts';
import { adaugaMesaje } from '../../src/i18n/t.ts';

adaugaMesaje({ ro: roEditare, en: enEditare });

const ACUM = Date.UTC(2026, 10, 2, 9, 0);

function drept(plan: Plan, pana: number | null, calculatLa = ACUM, zileOffline = 7): Drept {
  return { plan, capabilitati: plan === 'proba' ? [...CAPABILITATI] : capabilitatiPlan(plan), pana, calculatLa, zileOffline };
}
const cu = (d: Drept | null, nume = 'Andrei Besliu'): ContTinut => ({ uid: 'u1', email: 'andrei@exemplu.ro', nume, drept: d });

test('rândurile: logarea sau panoul contului, raportările cu contul deschis, manualul, sugestia doar unde e voie, ieșirea doar cu un cont ținut', () => {
  const ana = cu(drept('proba', ACUM + 5 * ZI_MS));
  assert.deepEqual(randuriMeniuCont(null, false), ['intra', 'manual']);
  assert.deepEqual(randuriMeniuCont(null, true), ['intra', 'manual', 'sugestie']);
  assert.deepEqual(randuriMeniuCont(ana, false), ['cont', 'raportari', 'manual', 'raporteaza', null, 'iesi']);
  assert.deepEqual(randuriMeniuCont(ana, true), ['cont', 'raportari', 'manual', 'raporteaza', 'sugestie', null, 'iesi']);
  // Și cu proba încheiată sau contul dezactivat, raportarea rămâne: serverul o cere doar contul deschis.
  for (const d of [drept('proba', ACUM - 1), drept('dezactivat', null)]) {
    assert.deepEqual(randuriMeniuCont(cu(d), false), ['cont', 'raportari', 'manual', 'raporteaza', null, 'iesi']);
  }
  // Cu adresa neconfirmată (încă fără drept) contul e ținut, deci se poate ieși din el, dar nu se raportează.
  assert.deepEqual(randuriMeniuCont(cu(null, 'andrei@exemplu.ro'), false), ['cont', 'manual', null, 'iesi']);
});

test('capul fără cont: nimeni logat, cu proba unui cont nou', () => {
  assert.deepEqual(capMeniuCont(null, ACUM, 'ro'), { titlu: 'Nu ești logat', rand: 'Un cont nou: 14 zile de probă, fără card' });
  assert.deepEqual(capMeniuCont(null, ACUM, 'en'), { titlu: 'Not signed in', rand: 'A new account: a 14-day trial, no card' });
});

test('capul cu proba: zilele rămase, cu pluralul fiecărei limbi', () => {
  for (const [zile, ro, en] of [
    [1, 'Proba: încă 1 zi', 'Trial: 1 more day'],
    [10, 'Proba: încă 10 zile', 'Trial: 10 more days'],
    [14, 'Proba: încă 14 zile', 'Trial: 14 more days'],
    [20, 'Proba: încă 20 de zile', 'Trial: 20 more days'],
  ] as const) {
    // Cu o oră lipsă din ultima zi: zilele se rotunjesc în sus, ca în panoul contului.
    const c = cu(drept('proba', ACUM + zile * ZI_MS - 3_600_000));
    assert.deepEqual(capMeniuCont(c, ACUM, 'ro'), { titlu: 'Andrei Besliu', rand: ro });
    assert.equal(capMeniuCont(c, ACUM, 'en').rand, en);
  }
});

test('capul judecă dreptul azi: proba trecută la data ei sau după zilele offline e încheiată', () => {
  const incheiata = { titlu: 'Andrei Besliu', rand: 'Proba s-a încheiat' };
  assert.deepEqual(capMeniuCont(cu(drept('proba', ACUM - 1)), ACUM, 'ro'), incheiata);
  // Confirmat acum 8 zile, cu 7 zile offline: aplicația nu-l mai ține, deși proba ar mai avea zile.
  assert.deepEqual(capMeniuCont(cu(drept('proba', ACUM + 5 * ZI_MS, ACUM - 8 * ZI_MS)), ACUM, 'ro'), incheiata);
  // O probă fără dată de sfârșit nu promite zile: se spune încheiată, ca în panou.
  assert.deepEqual(capMeniuCont(cu(drept('proba', null)), ACUM, 'ro'), incheiata);
  assert.equal(capMeniuCont(cu(drept('proba', ACUM - 1)), ACUM, 'en').rand, 'The trial has ended');
});

test('capul cu celelalte planuri și cu adresa neconfirmată', () => {
  for (const [plan, ro, en] of [
    ['gratuit', 'Plan gratuit', 'Free plan'],
    ['personal', 'Personalul aplicației', 'App staff'],
    ['dezactivat', 'Contul e dezactivat', 'The account is deactivated'],
    ['expirat', 'Proba s-a încheiat', 'The trial has ended'],
  ] as const) {
    assert.equal(capMeniuCont(cu(drept(plan, null)), ACUM, 'ro').rand, ro, plan);
    assert.equal(capMeniuCont(cu(drept(plan, null)), ACUM, 'en').rand, en, plan);
  }
  // Contul neconfirmat poartă adresa ca nume (`contDinRaspuns`) și încă n-are drept.
  assert.deepEqual(capMeniuCont(cu(null, 'andrei@exemplu.ro'), ACUM, 'ro'), { titlu: 'andrei@exemplu.ro', rand: 'Adresa nu e confirmată încă' });
  assert.equal(capMeniuCont(cu(null, 'andrei@exemplu.ro'), ACUM, 'en').rand, 'Email address not confirmed yet');
});

test('butonul Cont: primul nume (dintr-o adresă, partea dinaintea lui @) și inițialele, cu majusculă', () => {
  assert.equal(numeButon('Andrei Besliu'), 'Andrei');
  assert.equal(numeButon('  Ana  '), 'Ana');
  assert.equal(numeButon('andrei@exemplu.ro'), 'andrei');
  assert.equal(initiale('Andrei Besliu'), 'AB');
  assert.equal(initiale('ana'), 'A');
  assert.equal(initiale('ștefan cel mare'), 'ȘC');
  assert.equal(initiale('andrei@exemplu.ro'), 'A');
  assert.equal(initiale('  '), '?');
  // O literă din afara planului de bază (doi „code units”) rămâne întreagă.
  assert.equal(initiale('𝓐na Bo'), '𝓐B');
});
