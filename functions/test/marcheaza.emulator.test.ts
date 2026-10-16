import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { COLECTIE_AUDIT, marcheazaEroarea } from '../src/erori/marcheaza.ts';
import { amprenta, COLECTIE, scrieEroare } from '../src/erori/scrie.ts';

/** „Rezolvat” / „Redeschide” (ADR 0040 §4) pe emulatorul Firestore, plus callable-ul prin emulatorul de funcții. */

const PROIECT = 'demo-cncvs2';
const gazda = process.env['FIRESTORE_EMULATOR_HOST'];
if (!gazda) throw new Error('FIRESTORE_EMULATOR_HOST lipsește: testele rulează prin npm run test:emulator');
process.env['GCLOUD_PROJECT'] ??= PROIECT;
if (getApps().length === 0) initializeApp({ projectId: PROIECT });
const db = getFirestore();

const T0 = new Date(Date.UTC(2026, 9, 16, 12, 0));
const ID = amprenta('client', 'randare', 'piesa 12 lipsă');

beforeEach(async () => {
  const r = await fetch(`http://${gazda}/emulator/v1/projects/${PROIECT}/databases/(default)/documents`, { method: 'DELETE' });
  assert.equal(r.status, 200);
  await db.doc('staff/sup').set({ rol: 'support' });
  await db.doc('staff/fals').set({ rol: 'stapan' });
  await scrieEroare(db, {
    sursa: 'client', tip: 'randare', mesaj: 'piesa 12 lipsă', stiva: '', build: 'b', instanta: 'local', adresa: '',
    browser: '', limba: 'ro', uid: 'u1',
  }, [], T0);
});

const cod = async (p: Promise<unknown>): Promise<string> => {
  try {
    await p;
    return 'fără eroare';
  } catch (e) {
    return e instanceof HttpsError ? e.code : `altceva: ${String(e)}`;
  }
};
const audit = async () => (await db.collection(COLECTIE_AUDIT).get()).docs.map((d) => d.data());

test('personalul marchează rezolvat, cu auditul în aceeași tranzacție; aceeași valoare nu scrie nimic', async () => {
  const t1 = new Date(T0.getTime() + 60_000);
  assert.deepEqual(await marcheazaEroarea(db, 'sup', { amprenta: ID, rezolvat: true }, t1), { ok: true, schimbat: true });
  const g = (await db.doc(`${COLECTIE}/${ID}`).get()).data();
  assert.equal(g?.['rezolvat'], true);
  assert.equal(g?.['marcatDe'], 'sup');
  assert.ok((g?.['marcatLa'] as Timestamp).isEqual(Timestamp.fromDate(t1)));
  const a = await audit();
  assert.equal(a.length, 1);
  assert.deepEqual({ ...a[0], cand: undefined }, {
    schema: 1, cand: undefined, cine: 'sup', rol: 'support', actiune: 'erori.marcheaza', tinta: `errorLogs/${ID}`,
    inainte: { rezolvat: false }, dupa: { rezolvat: true },
  });
  assert.deepEqual(await marcheazaEroarea(db, 'sup', { amprenta: ID, rezolvat: true }, t1), { ok: true, schimbat: false });
  assert.equal((await audit()).length, 1, 'aceeași valoare nu e o comandă');
  assert.deepEqual(await marcheazaEroarea(db, 'sup', { amprenta: ID, rezolvat: false }, t1), { ok: true, schimbat: true });
  assert.equal((await db.doc(`${COLECTIE}/${ID}`).get()).get('rezolvat'), false);
  assert.equal((await audit()).length, 2);
});

test('refuzurile: fără cont, fără rol, cu rol necunoscut, cerere greșită, grup inexistent; niciunul nu scrie', async () => {
  assert.equal(await cod(marcheazaEroarea(db, null, { amprenta: ID, rezolvat: true })), 'unauthenticated');
  assert.equal(await cod(marcheazaEroarea(db, 'om', { amprenta: ID, rezolvat: true })), 'permission-denied');
  assert.equal(await cod(marcheazaEroarea(db, 'fals', { amprenta: ID, rezolvat: true })), 'permission-denied');
  assert.equal(await cod(marcheazaEroarea(db, 'sup', { amprenta: 'x', rezolvat: true })), 'invalid-argument');
  assert.equal(await cod(marcheazaEroarea(db, 'sup', { amprenta: ID, rezolvat: 'da' })), 'invalid-argument');
  assert.equal(await cod(marcheazaEroarea(db, 'sup', null)), 'invalid-argument');
  assert.equal(await cod(marcheazaEroarea(db, 'sup', { amprenta: '0'.repeat(32), rezolvat: true })), 'not-found');
  assert.equal((await db.doc(`${COLECTIE}/${ID}`).get()).get('rezolvat'), false);
  assert.equal((await audit()).length, 0);
});

test('o apariție nouă redeschide un grup marcat rezolvat (marcajul rămâne, cu cine l-a pus)', async () => {
  await marcheazaEroarea(db, 'sup', { amprenta: ID, rezolvat: true }, T0);
  await scrieEroare(db, {
    sursa: 'client', tip: 'randare', mesaj: 'piesa 13 lipsă', stiva: '', build: 'b', instanta: 'local', adresa: '',
    browser: '', limba: 'ro', uid: 'u2',
  }, [], new Date(T0.getTime() + 3_600_000));
  const g = (await db.doc(`${COLECTIE}/${ID}`).get()).data();
  assert.equal(g?.['rezolvat'], false);
  assert.equal(g?.['marcatDe'], 'sup');
});

/** Un token de cont nesemnat: emulatorul de funcții nu verifică semnătura (docs/faza2/admin/RAPORT.md §4.2). */
const tokenNesemnat = (uid: string): string => {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const acum = Math.floor(Date.now() / 1000);
  return `${b64({ alg: 'none', typ: 'JWT' })}.${b64({
    iss: `https://securetoken.google.com/${PROIECT}`, aud: PROIECT, sub: uid, user_id: uid, iat: acum, exp: acum + 3600,
    auth_time: acum, firebase: { sign_in_provider: 'google.com' },
  })}.`;
};

test('callable-ul pe emulatorul de funcții: 401 fără App Check, 403 fără rol, 200 cu personalul', async () => {
  const url = `http://127.0.0.1:5005/${PROIECT}/europe-central2/marcheazaEroarea`;
  const corp = JSON.stringify({ data: { amprenta: ID, rezolvat: true } });
  const cere = (antete: Record<string, string>) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...antete }, body: corp });
  assert.equal((await cere({ Authorization: `Bearer ${tokenNesemnat('sup')}` })).status, 401);
  assert.equal((await cere({ 'X-Firebase-AppCheck': 'proba', Authorization: `Bearer ${tokenNesemnat('om')}` })).status, 403);
  const r = await cere({ 'X-Firebase-AppCheck': 'proba', Authorization: `Bearer ${tokenNesemnat('sup')}` });
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { result: { ok: true, schimbat: true } });
  assert.equal((await audit()).length, 1);
});
