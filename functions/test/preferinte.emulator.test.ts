import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { ZI_MS } from '../../shared/conturi.ts';
import { OCTETI_PREFERINTE, type RaspunsCitestePreferinte, type RaspunsScriePreferinte } from '../../shared/preferinte.ts';
import { trateazaPreferintele } from '../src/preferinte/actiuni.ts';

/**
 * Setările aplicației în cont (ADR 0330, întrebarea 14a, felia 10.4↑g) pe emulatorul Firestore: callable-ul `preferinte`
 * cere omul și contul deschis; citirea merge fără capabilitatea `cloud` (proba trecută, contul dezactivat), scrierea nu;
 * scrierea cere versiunea văzută (altfel ciocnire, cu ce e în cont); textul rămâne neatins; plafonul; cererile greșite nu
 * scriu nimic; alt cont nu vede setările.
 */

const PROIECT = 'demo-cncvs2';
const gazda = process.env['FIRESTORE_EMULATOR_HOST'];
if (!gazda) throw new Error('FIRESTORE_EMULATOR_HOST lipsește: testele rulează prin npm run test:emulator');
process.env['GCLOUD_PROJECT'] ??= PROIECT;
if (getApps().length === 0) initializeApp({ projectId: PROIECT });
const db = getFirestore();

const T0 = new Date(Date.UTC(2026, 10, 26, 21, 0));

beforeEach(async () => {
  assert.equal((await fetch(`http://${gazda}/emulator/v1/projects/${PROIECT}/databases/(default)/documents`, { method: 'DELETE' })).status, 200);
  await db.doc('staff/own').set({ rol: 'owner' });
  await db.doc('conturi/ana').set({ plan: 'proba', probaPana: Timestamp.fromMillis(T0.getTime() + 10 * ZI_MS) });
  await db.doc('conturi/bob').set({ plan: 'gratuit', probaPana: Timestamp.fromMillis(T0.getTime() - 30 * ZI_MS) });
  await db.doc('conturi/exp').set({ plan: 'proba', probaPana: Timestamp.fromMillis(T0.getTime() - ZI_MS) });
  await db.doc('conturi/dez').set({ plan: 'dezactivat', probaPana: Timestamp.fromMillis(T0.getTime() + 10 * ZI_MS) });
  await db.doc('conturi/own').set({ plan: 'proba', probaPana: Timestamp.fromMillis(T0.getTime() - ZI_MS) });
});

const cod = async (p: Promise<unknown>): Promise<string> => {
  try {
    await p;
    return 'fără eroare';
  } catch (e) {
    return e instanceof HttpsError ? e.code : `altceva: ${String(e)}`;
  }
};

const COTE = JSON.stringify({ v: 1, cifre: { unitate: 'mm', zecimale: 2, separator: 'virgula' }, nou: { camp: 'pe care serverul nu-l știe' } });
const citeste = (uid: string) => trateazaPreferintele(db, uid, { actiune: 'citeste', cheie: 'cote' }, T0) as Promise<RaspunsCitestePreferinte>;
const scrie = (uid: string, vazuta: number, json = COTE) => trateazaPreferintele(db, uid, { actiune: 'scrie', cheie: 'cote', vazuta, json }, T0) as Promise<RaspunsScriePreferinte>;
const exista = async (uid: string): Promise<boolean> => (await db.doc(`conturi/${uid}/preferinte/cote`).get()).exists;

test('fără om, fără cont deschis, cerere greșită: refuzat, fără nicio scriere', async () => {
  assert.equal(await cod(trateazaPreferintele(db, null, { actiune: 'citeste', cheie: 'cote' }, T0)), 'unauthenticated');
  assert.equal(await cod(trateazaPreferintele(db, 'necunoscut', { actiune: 'citeste', cheie: 'cote' }, T0)), 'failed-precondition');
  assert.equal(await cod(trateazaPreferintele(db, 'necunoscut', { actiune: 'scrie', cheie: 'cote', vazuta: 0, json: COTE }, T0)), 'failed-precondition');
  const rele: unknown[] = [
    null, 'citeste', [], { actiune: 'citeste' }, { actiune: 'citeste', cheie: 'freze' }, { actiune: 'citeste', cheie: '__proto__' },
    { actiune: 'zboara', cheie: 'cote' },
    { actiune: 'scrie', cheie: 'cote', json: COTE },
    { actiune: 'scrie', cheie: 'cote', vazuta: -1, json: COTE },
    { actiune: 'scrie', cheie: 'cote', vazuta: 1.5, json: COTE },
    { actiune: 'scrie', cheie: 'cote', vazuta: 0 },
    { actiune: 'scrie', cheie: 'cote', vazuta: 0, json: '[1]' },
    { actiune: 'scrie', cheie: 'cote', vazuta: 0, json: 'null' },
    { actiune: 'scrie', cheie: 'cote', vazuta: 0, json: '{' },
    { actiune: 'scrie', cheie: 'cote', vazuta: 0, json: { v: 1 } },
    { actiune: 'scrie', cheie: 'cote', vazuta: 0, json: JSON.stringify({ x: 'ă'.repeat(OCTETI_PREFERINTE / 2) }) },
  ];
  for (const r of rele) assert.equal(await cod(trateazaPreferintele(db, 'ana', r, T0)), 'invalid-argument', JSON.stringify(r)?.slice(0, 80));
  assert.equal(await exista('ana'), false);
});

test('prima citire: versiunea 0, nimic; scrisă (cu versiunea văzută 0), citirea dă textul neatins, la versiunea 1', async () => {
  assert.deepEqual(await citeste('ana'), { ok: true, versiune: 0, json: null, poateScrie: true });
  assert.deepEqual(await scrie('ana', 0), { ok: true, stare: 'scrisa', versiune: 1 });
  assert.deepEqual(await citeste('ana'), { ok: true, versiune: 1, json: COTE, poateScrie: true });
  const alt = JSON.stringify({ v: 1, cifre: { unitate: 'inch' } });
  assert.deepEqual(await scrie('ana', 1, alt), { ok: true, stare: 'scrisa', versiune: 2 });
  assert.deepEqual(await citeste('ana'), { ok: true, versiune: 2, json: alt, poateScrie: true });
  // Alt cont nu le vede.
  assert.deepEqual(await citeste('bob'), { ok: true, versiune: 0, json: null, poateScrie: true });
});

test('ciocnirea: cu altă versiune decât cea din cont, nimic nu se scrie, iar răspunsul dă ce e în cont', async () => {
  await scrie('ana', 0);
  assert.deepEqual(await scrie('ana', 0, '{"v":1}'), { ok: true, stare: 'conflict', versiune: 1, json: COTE });
  assert.deepEqual(await scrie('ana', 7, '{"v":1}'), { ok: true, stare: 'conflict', versiune: 1, json: COTE });
  assert.deepEqual(await citeste('ana'), { ok: true, versiune: 1, json: COTE, poateScrie: true });
  // Pe un cont fără setări, o versiune văzută peste 0 e tot o ciocnire.
  assert.deepEqual(await scrie('bob', 3), { ok: true, stare: 'conflict', versiune: 0, json: null });
  assert.equal(await exista('bob'), false);
});

test('fără capabilitatea `cloud` (proba trecută, contul dezactivat): citirea merge, scrierea e refuzată; personalul scrie', async () => {
  await db.doc('conturi/exp/preferinte/cote').set({ versiune: 4, json: COTE });
  assert.deepEqual(await citeste('exp'), { ok: true, versiune: 4, json: COTE, poateScrie: false });
  assert.equal(await cod(scrie('exp', 4, '{"v":1}')), 'permission-denied');
  assert.deepEqual(await citeste('exp'), { ok: true, versiune: 4, json: COTE, poateScrie: false });
  assert.equal((await citeste('dez')).poateScrie, false);
  assert.equal(await cod(scrie('dez', 0)), 'permission-denied');
  assert.equal(await exista('dez'), false);
  // Owner-ul, cu proba trecută: personalul are planul lui, cu `cloud`.
  assert.deepEqual(await scrie('own', 0), { ok: true, stare: 'scrisa', versiune: 1 });
});

test('documentul din cont: versiunea, textul și momentul scrierii; un câmp stricat în cont se citește ca versiunea 0, fără text', async () => {
  await scrie('ana', 0);
  const d = (await db.doc('conturi/ana/preferinte/cote').get()).data();
  assert.equal(d?.['versiune'], 1);
  assert.equal(d?.['json'], COTE);
  assert.ok(d?.['schimbatLa'] instanceof Timestamp);
  assert.equal((d?.['schimbatLa'] as Timestamp).toMillis(), T0.getTime());
  await db.doc('conturi/bob/preferinte/cote').set({ versiune: 'trei', json: 7 });
  assert.deepEqual(await citeste('bob'), { ok: true, versiune: 0, json: null, poateScrie: true });
  // O versiune bună cu un text stricat: tot versiunea 0, fără text; scrierea cu versiunea văzută 0 îl înlocuiește.
  await db.doc('conturi/bob/preferinte/cote').set({ versiune: 3, json: 7 });
  assert.deepEqual(await citeste('bob'), { ok: true, versiune: 0, json: null, poateScrie: true });
  assert.deepEqual(await scrie('bob', 0), { ok: true, stare: 'scrisa', versiune: 1 });
});
