import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { CAPABILITATI } from '../../shared/capabilitati.ts';
import { NUME_MAX, ZI_MS, ZILE_PROBA, type RaspunsDeschide, type RaspunsNume } from '../../shared/conturi.ts';
import { COLECTIE_AUDIT } from '../src/audit.ts';
import { trateazaContul, type TokenCont } from '../src/conturi/actiuni.ts';

/**
 * Contul clientului (ADR 0116) pe emulatorul Firestore: la prima deschidere cu adresa verificată, contul cu proba de 14 zile
 * și auditul; adresa neconfirmată nu scrie nimic; a doua deschidere nu dă o probă nouă; proba trecută e expirată (fără
 * exportul G-code și sender); zilele offline din setări, în marginile lor; personalul are tot; planurile gratuit și
 * dezactivat; numele afișat, cu auditul; adresa schimbată în Auth; refuzurile nu scriu nimic.
 */

const PROIECT = 'demo-cncvs2';
const gazda = process.env['FIRESTORE_EMULATOR_HOST'];
if (!gazda) throw new Error('FIRESTORE_EMULATOR_HOST lipsește: testele rulează prin npm run test:emulator');
process.env['GCLOUD_PROJECT'] ??= PROIECT;
if (getApps().length === 0) initializeApp({ projectId: PROIECT });
const db = getFirestore();

const T0 = new Date(Date.UTC(2026, 10, 1, 10, 0));
const ROL_ERORI = 'RErori00000000000000';
const ROL_GOL = 'RGol0000000000000000';
const FARA_OPRITE = CAPABILITATI.filter((c) => c !== 'export-gcode' && c !== 'masina');

beforeEach(async () => {
  assert.equal((await fetch(`http://${gazda}/emulator/v1/projects/${PROIECT}/databases/(default)/documents`, { method: 'DELETE' })).status, 200);
  await db.doc('staff/own').set({ rol: 'owner' });
  await db.doc(`roluri/${ROL_ERORI}`).set({ nume: 'Erori', permisiuni: ['erori.citeste'] });
  await db.doc(`roluri/${ROL_GOL}`).set({ nume: 'Gol', permisiuni: [] });
  await db.doc('staff/sup').set({ rol: ROL_ERORI, email: 'sup@exemplu.ro' });
  await db.doc('staff/gol').set({ rol: ROL_GOL, email: 'gol@exemplu.ro' });
});

const cod = async (p: Promise<unknown>): Promise<string> => {
  try {
    await p;
    return 'fără eroare';
  } catch (e) {
    return e instanceof HttpsError ? e.code : `altceva: ${String(e)}`;
  }
};
const TOKEN: TokenCont = { email: 'Ana@Exemplu.ro', email_verified: true, name: '  Ana   Popescu ' };
const deschide = (uid: string, token: TokenCont | null = TOKEN, acum = T0) => trateazaContul(db, uid, token, { actiune: 'deschide' }, acum) as Promise<RaspunsDeschide>;
const cont = async (uid: string) => (await db.doc(`conturi/${uid}`).get()).data();
const audit = async () => (await db.collection(COLECTIE_AUDIT).orderBy('cand').get()).docs.map((d) => d.data());
const verificat = (r: RaspunsDeschide): Extract<RaspunsDeschide, { verificat: true }> => {
  assert.equal(r.verificat, true);
  return r as Extract<RaspunsDeschide, { verificat: true }>;
};

test('prima deschidere cu adresa verificată: contul cu proba de 14 zile, numele din token, dreptul complet și auditul', async () => {
  const r = verificat(await deschide('ana'));
  const pana = T0.getTime() + ZILE_PROBA * ZI_MS;
  assert.deepEqual(r, {
    ok: true, verificat: true, email: 'ana@exemplu.ro', nume: 'Ana Popescu',
    drept: { plan: 'proba', capabilitati: [...CAPABILITATI], pana, calculatLa: T0.getTime(), zileOffline: 7 },
  });
  const c = await cont('ana');
  assert.equal(c?.['plan'], 'proba');
  assert.equal((c?.['probaPana'] as Timestamp).toMillis(), pana);
  assert.equal((c?.['creatLa'] as Timestamp).toMillis(), T0.getTime());
  assert.deepEqual(c?.['drept'], r.drept);
  const a = await audit();
  assert.equal(a.length, 1);
  assert.equal(a[0]?.['actiune'], 'conturi.creeaza');
  assert.equal(a[0]?.['tinta'], 'conturi/ana');
});

test('adresa neconfirmată: fără cont (proba nu pornește), fără audit; fără e-mail sau fără om, refuzat', async () => {
  assert.deepEqual(await deschide('nou', { email: 'nou@exemplu.ro', email_verified: false }), { ok: true, verificat: false, email: 'nou@exemplu.ro' });
  assert.equal(await cont('nou'), undefined);
  assert.equal(await cod(deschide('fara', { email_verified: true })), 'failed-precondition');
  assert.equal(await cod(trateazaContul(db, null, TOKEN, { actiune: 'deschide' }, T0)), 'unauthenticated');
  assert.equal(await cod(trateazaContul(db, 'ana', TOKEN, { actiune: 'zboara' }, T0)), 'invalid-argument');
  assert.equal(await cod(trateazaContul(db, 'ana', TOKEN, null, T0)), 'invalid-argument');
  assert.deepEqual(await audit(), []);
});

test('a doua deschidere: ultima logare la zi, aceeași probă, fără audit nou; după 14 zile, expirat (fără exportul G-code și sender)', async () => {
  await deschide('ana');
  const z3 = new Date(T0.getTime() + 3 * ZI_MS);
  const r = verificat(await deschide('ana', TOKEN, z3));
  assert.equal(r.drept.pana, T0.getTime() + ZILE_PROBA * ZI_MS);
  assert.equal(r.drept.calculatLa, z3.getTime());
  assert.equal(((await cont('ana'))?.['ultimaLogare'] as Timestamp).toMillis(), z3.getTime());
  assert.equal((await audit()).length, 1);
  const z14 = new Date(T0.getTime() + ZILE_PROBA * ZI_MS);
  const e = verificat(await deschide('ana', TOKEN, z14));
  assert.deepEqual([e.drept.plan, e.drept.capabilitati, e.drept.pana], ['expirat', FARA_OPRITE, null]);
  assert.equal((await cont('ana'))?.['plan'], 'proba');
});

test('zilele offline din setări, în marginile lor; altfel implicitul de 7', async () => {
  await db.doc('setari/conturi').set({ zileOffline: 3 });
  assert.equal(verificat(await deschide('ana')).drept.zileOffline, 3);
  await db.doc('setari/conturi').set({ zileOffline: 0 });
  assert.equal(verificat(await deschide('ana')).drept.zileOffline, 7);
  await db.doc('setari/conturi').set({ zileOffline: 61 });
  assert.equal(verificat(await deschide('ana')).drept.zileOffline, 7);
  await db.doc('setari/conturi').set({ zileOffline: 60 });
  assert.equal(verificat(await deschide('ana')).drept.zileOffline, 60);
});

test('personalul: owner-ul și un rol cu permisiuni au tot, fără termen; un rol gol e un client obișnuit', async () => {
  const own = verificat(await deschide('own', { email: 'own@exemplu.ro', email_verified: true }));
  assert.deepEqual([own.drept.plan, own.drept.capabilitati, own.drept.pana], ['personal', [...CAPABILITATI], null]);
  const sup = verificat(await deschide('sup', { email: 'sup@exemplu.ro', email_verified: true }, new Date(T0.getTime() + 30 * ZI_MS)));
  assert.equal(sup.drept.plan, 'personal');
  assert.equal(verificat(await deschide('gol', { email: 'gol@exemplu.ro', email_verified: true })).drept.plan, 'proba');
});

test('planul gratuit (dat de owner) are tot, fără termen; dezactivatul oprește exportul G-code și senderul', async () => {
  await deschide('ana');
  await db.doc('conturi/ana').update({ plan: 'gratuit' });
  const g = verificat(await deschide('ana', TOKEN, new Date(T0.getTime() + 100 * ZI_MS)));
  assert.deepEqual([g.drept.plan, g.drept.capabilitati, g.drept.pana], ['gratuit', [...CAPABILITATI], null]);
  await db.doc('conturi/ana').update({ plan: 'dezactivat' });
  const d = verificat(await deschide('ana'));
  assert.deepEqual([d.drept.plan, d.drept.capabilitati], ['dezactivat', FARA_OPRITE]);
});

test('adresa schimbată în Auth: documentul o urmează la următoarea deschidere', async () => {
  await deschide('ana');
  await deschide('ana', { ...TOKEN, email: 'ana.noua@exemplu.ro' });
  assert.equal((await cont('ana'))?.['email'], 'ana.noua@exemplu.ro');
});

test('numele afișat: curățat, cu auditul; același nume nu e o schimbare; înaintea contului sau greșit, refuzat fără scriere', async () => {
  // O secundă după deschidere: rândurile de audit au ordinea acțiunilor (`orderBy('cand')`).
  const fa = (uid: string, nume: unknown) => trateazaContul(db, uid, TOKEN, { actiune: 'nume', nume }, new Date(T0.getTime() + 1000)) as Promise<RaspunsNume>;
  assert.equal(await cod(fa('ana', 'Ana')), 'failed-precondition');
  await deschide('ana');
  assert.deepEqual(await fa('ana', '  Ana   Maria '), { ok: true, schimbat: true, nume: 'Ana Maria' });
  assert.equal((await cont('ana'))?.['nume'], 'Ana Maria');
  assert.deepEqual(await fa('ana', 'Ana Maria'), { ok: true, schimbat: false, nume: 'Ana Maria' });
  assert.equal(await cod(fa('ana', '')), 'invalid-argument');
  assert.equal(await cod(fa('ana', 'x'.repeat(NUME_MAX + 1))), 'invalid-argument');
  assert.equal(await cod(fa('ana', 'a\nb')), 'invalid-argument');
  assert.equal(await cod(fa('ana', 7)), 'invalid-argument');
  const a = await audit();
  assert.deepEqual(a.map((x) => x['actiune']), ['conturi.creeaza', 'conturi.nume']);
  assert.deepEqual(a[1]?.['inainte'], { nume: 'Ana Popescu' });
  assert.deepEqual(a[1]?.['dupa'], { nume: 'Ana Maria' });
});
