/**
 * Contul lui cvs2, cum îl vede o extensie cu permisiunea `cont` (ADR 0164 §B): din contul ținut de aplicație
 * (`src/app/dreptCont.ts`), doar conectat sau nu, numele și planul de acum, judecat la zi (ca exportul și senderul); cât
 * adresa nu e confirmată, fără nume (ar fi chiar adresa) și fără plan. Nimic din adresă, uid sau restul dreptului. În
 * contextul trimis cadrului, contul stă doar cu permisiunea lui.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ContCvs2 } from '../../extensii/api.ts';
import type { ContTinut } from '../../src/app/dreptCont.ts';
import { contextPentruExtensie, contPentruExtensie } from '../../src/extensii/cont.ts';
import { dreptDin, type Drept } from '../../shared/conturi.ts';

const ACUM = Date.UTC(2026, 10, 4, 12);
const ZI = 86_400_000;
const cont = (drept: Drept | null, nume = 'Andrei'): ContTinut => ({ uid: 'u-123', email: 'andrei@exemplu.ro', nume, drept });
const plan = (c: ContCvs2): string | null | undefined => (c.conectat ? c.plan : undefined);

test('fără cont ținut: neconectat, atât', () => {
  assert.deepEqual(contPentruExtensie(null, ACUM), { conectat: false });
});

test('cu adresa confirmată: numele și planul; nimic din adresă, uid sau drept', () => {
  const c = contPentruExtensie(cont(dreptDin('personal', null, 30, ACUM)), ACUM);
  assert.deepEqual(c, { conectat: true, nume: 'Andrei', plan: 'personal' });
  assert.doesNotMatch(JSON.stringify(c), /andrei@|u-123|capabilitati|zileOffline/);
});

test('planul de la zi: proba trecută, zilele fără reconfirmare depășite sau ceasul dat înapoi se văd „expirat”', () => {
  const proba = cont(dreptDin('proba', ACUM + 2 * ZI, 30, ACUM));
  assert.deepEqual([contPentruExtensie(proba, ACUM + ZI), contPentruExtensie(proba, ACUM + 3 * ZI)],
    [{ conectat: true, nume: 'Andrei', plan: 'proba' }, { conectat: true, nume: 'Andrei', plan: 'expirat' }]);
  const gratuit = cont(dreptDin('gratuit', null, 7, ACUM));
  assert.deepEqual([plan(contPentruExtensie(gratuit, ACUM + 6 * ZI)), plan(contPentruExtensie(gratuit, ACUM + 8 * ZI)),
    plan(contPentruExtensie(gratuit, ACUM - 2 * ZI))], ['gratuit', 'expirat', 'expirat']);
  assert.equal(plan(contPentruExtensie(cont(dreptDin('dezactivat', null, 7, ACUM)), ACUM)), 'dezactivat');
});

test('adresa încă neconfirmată: conectat, fără nume și fără plan', () => {
  assert.deepEqual(contPentruExtensie({ uid: 'u-9', email: 'ana@exemplu.ro', nume: 'ana@exemplu.ro', drept: null }, ACUM),
    { conectat: true, nume: '', plan: null });
});

test('numele, cel mult 80 de caractere', () => {
  const c = contPentruExtensie(cont(dreptDin('gratuit', null, 7, ACUM), 'A'.repeat(200)), ACUM);
  assert.equal(c.conectat && c.nume.length, 80);
});

test('contextul cadrului: limba, tema și, doar cu permisiunea `cont`, contul', () => {
  const tema = { '--t': '#1d232b', 'color-scheme': 'light' };
  const c = cont(dreptDin('personal', null, 30, ACUM));
  assert.deepEqual(contextPentruExtensie('ro', tema, ['stocare', 'descarcari'], c, ACUM), { limba: 'ro', tema });
  assert.deepEqual(contextPentruExtensie('en', tema, ['cont'], c, ACUM),
    { limba: 'en', tema, cont: { conectat: true, nume: 'Andrei', plan: 'personal' } });
  assert.deepEqual(contextPentruExtensie('ro', tema, ['cont'], null, ACUM), { limba: 'ro', tema, cont: { conectat: false } });
});
