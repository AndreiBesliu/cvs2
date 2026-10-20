import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { COLECTIE_AUDIT } from '../src/audit.ts';
import { acceptaInvitatia, administreazaPersonalul, idInvitatie, type AuthPersonal } from '../src/personal/actiuni.ts';

/**
 * Administrarea personalului (ADR 0049) pe emulatoarele Firestore și Auth: rolurile custom, invitațiile, conturile create
 * de owner, rolul, scoaterea; auditul în aceeași tranzacție, refuzurile care nu scriu nimic, ultimul owner. Plus cele două
 * callable-uri prin emulatorul de funcții (App Check, owner-ul, e-mailul verificat din token).
 */

const PROIECT = 'demo-cncvs2';
const gazda = process.env['FIRESTORE_EMULATOR_HOST'];
const gazdaAuth = process.env['FIREBASE_AUTH_EMULATOR_HOST'];
if (!gazda || !gazdaAuth) throw new Error('FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST lipsesc: testele rulează prin npm run test:emulator');
process.env['GCLOUD_PROJECT'] ??= PROIECT;
if (getApps().length === 0) initializeApp({ projectId: PROIECT });
const db = getFirestore();
const auth = getAuth();

const T0 = new Date(Date.UTC(2026, 9, 20, 10, 0));
const SUPORT = 'RSuport0000000000000';

beforeEach(async () => {
  assert.equal((await fetch(`http://${gazda}/emulator/v1/projects/${PROIECT}/databases/(default)/documents`, { method: 'DELETE' })).status, 200);
  assert.equal((await fetch(`http://${gazdaAuth}/emulator/v1/projects/${PROIECT}/accounts`, { method: 'DELETE' })).status, 200);
  await db.doc('staff/own').set({ rol: 'owner' });
  await db.doc(`roluri/${SUPORT}`).set({ nume: 'Suport', permisiuni: ['erori.citeste', 'erori.rezolva'] });
  await db.doc('staff/sup').set({ rol: SUPORT, email: 'sup@exemplu.ro', sursa: 'invitatie' });
  ceas = T0.getTime();
});

const cod = async (p: Promise<unknown>): Promise<string> => {
  try {
    await p;
    return 'fără eroare';
  } catch (e) {
    return e instanceof HttpsError ? e.code : `altceva: ${String(e)}`;
  }
};
const audit = async () => (await db.collection(COLECTIE_AUDIT).orderBy('cand').get()).docs.map((d) => d.data());
/** Un ceas care avansează cu o secundă la fiecare acțiune: rândurile de audit au ordinea acțiunilor (`orderBy('cand')`). */
let ceas = T0.getTime();
const fa = (uid: string | null, data: unknown, acum = new Date(ceas += 1000)) => administreazaPersonalul(db, auth, uid, data, acum);

test('rolurile: owner-ul face și schimbă un rol, cu auditul; același conținut nu scrie; numele unic; doar din catalog', async () => {
  const r = await fa('own', { actiune: 'salveaza-rol', nume: ' Citire  erori ', permisiuni: ['diagnoza.citeste', 'erori.citeste', 'erori.citeste'] });
  assert.equal(r.schimbat, true);
  assert.match(r.id ?? '', /^[A-Za-z0-9]{20}$/);
  const doc = (await db.doc(`roluri/${r.id ?? ''}`).get()).data();
  assert.equal(doc?.['nume'], 'Citire erori');
  assert.deepEqual(doc?.['permisiuni'], ['erori.citeste', 'diagnoza.citeste'], 'ordinea catalogului, fără dubluri');
  assert.equal(doc?.['creatDe'], 'own');
  assert.equal((await fa('own', { actiune: 'salveaza-rol', id: r.id, nume: 'Citire erori', permisiuni: ['erori.citeste', 'diagnoza.citeste'] })).schimbat, false);
  assert.equal((await fa('own', { actiune: 'salveaza-rol', id: r.id, nume: 'Citire erori', permisiuni: ['erori.citeste'] })).schimbat, true);
  assert.deepEqual((await db.doc(`roluri/${r.id ?? ''}`).get()).get('permisiuni'), ['erori.citeste']);
  const a = await audit();
  assert.deepEqual(a.map((x) => [x['actiune'], x['cine'], x['tinta']]), [
    ['personal.salveaza-rol', 'own', `roluri/${r.id ?? ''}`], ['personal.salveaza-rol', 'own', `roluri/${r.id ?? ''}`],
  ]);
  assert.deepEqual(a[1]?.['inainte'], { nume: 'Citire erori', permisiuni: ['erori.citeste', 'diagnoza.citeste'] });
  assert.equal(await cod(fa('own', { actiune: 'salveaza-rol', nume: 'SUPORT', permisiuni: [] })), 'already-exists', 'numele, fără majuscule');
  assert.equal(await cod(fa('own', { actiune: 'salveaza-rol', nume: 'X', permisiuni: ['personal.administreaza'] })), 'invalid-argument');
  assert.equal(await cod(fa('own', { actiune: 'salveaza-rol', nume: '', permisiuni: [] })), 'invalid-argument');
  assert.equal(await cod(fa('own', { actiune: 'salveaza-rol', id: 'RNuExista00000000000', nume: 'Y', permisiuni: [] })), 'not-found');
  assert.equal(await cod(fa('own', { actiune: 'salveaza-rol', id: '../staff/own', nume: 'Y', permisiuni: [] })), 'invalid-argument');
  assert.equal((await audit()).length, 2, 'refuzurile nu scriu');
});

test('doar owner-ul administrează: personalul fără owner, un om fără rol, fără cont; niciun refuz nu scrie, nici în Auth', async () => {
  const cereri = [
    { actiune: 'salveaza-rol', nume: 'X', permisiuni: [] }, { actiune: 'sterge-rol', id: SUPORT },
    { actiune: 'invita', email: 'a@b.ro', rol: 'owner' }, { actiune: 'creeaza-cont', email: 'nou@b.ro', rol: 'owner' },
    { actiune: 'schimba-rolul', uid: 'sup', rol: 'owner' }, { actiune: 'scoate', uid: 'own' }, { actiune: 'link-parola', uid: 'sup' },
  ];
  for (const c of cereri) {
    assert.equal(await cod(fa(null, c)), 'unauthenticated', c.actiune);
    for (const uid of ['sup', 'strain']) assert.equal(await cod(fa(uid, c)), 'permission-denied', `${uid} ${c.actiune}`);
  }
  assert.equal(await cod(fa('own', { actiune: 'altceva' })), 'invalid-argument');
  assert.equal((await audit()).length, 0);
  assert.equal((await db.collection('invitatiiPersonal').get()).size, 0);
  assert.equal((await auth.listUsers()).users.length, 0, 'niciun cont creat de un om care nu e owner');
  assert.equal((await db.doc('staff/sup').get()).get('rol'), SUPORT);
});

test('un rol folosit (de personal sau de o invitație) nu se șterge; nefolosit, da, cu auditul', async () => {
  assert.equal(await cod(fa('own', { actiune: 'sterge-rol', id: SUPORT })), 'failed-precondition');
  await db.doc('staff/sup').delete();
  await fa('own', { actiune: 'invita', email: 'x@exemplu.ro', rol: SUPORT });
  assert.equal(await cod(fa('own', { actiune: 'sterge-rol', id: SUPORT })), 'failed-precondition', 'invitația îl folosește');
  await fa('own', { actiune: 'anuleaza-invitatia', id: idInvitatie('x@exemplu.ro') });
  assert.deepEqual(await fa('own', { actiune: 'sterge-rol', id: SUPORT }), { ok: true, schimbat: true });
  assert.equal((await db.doc(`roluri/${SUPORT}`).get()).exists, false);
  assert.deepEqual((await audit()).map((x) => x['actiune']), ['personal.invita', 'personal.anuleaza-invitatia', 'personal.sterge-rol']);
});

test('invitația: o singură pe adresă (a doua o înlocuiește), 7 zile; nu pentru cineva din personal; rolul trebuie să existe', async () => {
  const r = await fa('own', { actiune: 'invita', email: ' Ana@Exemplu.RO ', rol: SUPORT });
  assert.equal(r.id, idInvitatie('ana@exemplu.ro'));
  assert.equal(r.expiraLa, T0.getTime() + 1000 + 7 * 86_400_000);
  const i = (await db.doc(`invitatiiPersonal/${r.id ?? ''}`).get()).data();
  assert.deepEqual([i?.['email'], i?.['rol'], i?.['creatDe']], ['ana@exemplu.ro', SUPORT, 'own']);
  await fa('own', { actiune: 'invita', email: 'ana@exemplu.ro', rol: 'owner' });
  assert.equal((await db.collection('invitatiiPersonal').get()).size, 1);
  assert.equal((await db.doc(`invitatiiPersonal/${r.id ?? ''}`).get()).get('rol'), 'owner');
  assert.equal(await cod(fa('own', { actiune: 'invita', email: 'sup@exemplu.ro', rol: SUPORT })), 'already-exists');
  assert.equal(await cod(fa('own', { actiune: 'invita', email: 'b@exemplu.ro', rol: 'RNuExista00000000000' })), 'failed-precondition');
  assert.equal(await cod(fa('own', { actiune: 'invita', email: 'b@exemplu.ro', rol: 'admin' })), 'invalid-argument');
  assert.equal(await cod(fa('own', { actiune: 'invita', email: 'nu-e-adresa', rol: SUPORT })), 'invalid-argument');
  assert.equal(await cod(fa('own', { actiune: 'anuleaza-invitatia', id: '0'.repeat(64) })), 'not-found');
});

test('acceptarea: doar cu adresa verificată, neexpirată, o singură dată; creează personalul și șterge invitația, cu auditul', async () => {
  await fa('own', { actiune: 'invita', email: 'ana@exemplu.ro', rol: SUPORT });
  const t1 = new Date(T0.getTime() + 3_600_000);
  assert.equal(await cod(acceptaInvitatia(db, null, { email: 'ana@exemplu.ro', email_verified: true }, t1)), 'unauthenticated');
  assert.equal(await cod(acceptaInvitatia(db, 'ana', { email: 'ana@exemplu.ro', email_verified: false }, t1)), 'failed-precondition', 'neverificată');
  assert.equal(await cod(acceptaInvitatia(db, 'ana', { email: 'ana@exemplu.ro' }, t1)), 'failed-precondition');
  assert.deepEqual(await acceptaInvitatia(db, 'ana', { email: 'alta@exemplu.ro', email_verified: true }, t1), { ok: false, motiv: 'fara-invitatie' }, 'nicio invitație nu e o eroare');
  assert.equal(await cod(acceptaInvitatia(db, 'sup', { email: 'ana@exemplu.ro', email_verified: true }, t1)), 'already-exists', 'cine e în personal nu-și schimbă rolul așa');
  const tarziu = new Date(T0.getTime() + 8 * 86_400_000);
  assert.equal(await cod(acceptaInvitatia(db, 'ana', { email: 'ana@exemplu.ro', email_verified: true }, tarziu)), 'failed-precondition', 'expirată');
  assert.equal((await db.doc('staff/ana').get()).exists, false);
  assert.deepEqual(await acceptaInvitatia(db, 'ana', { email: 'Ana@Exemplu.ro', email_verified: true }, t1), { ok: true, rol: SUPORT });
  const s = (await db.doc('staff/ana').get()).data();
  assert.deepEqual([s?.['rol'], s?.['email'], s?.['sursa'], s?.['adaugatDe']], [SUPORT, 'ana@exemplu.ro', 'invitatie', 'own']);
  assert.ok((s?.['adaugatLa'] as Timestamp).isEqual(Timestamp.fromDate(t1)));
  assert.equal((await db.collection('invitatiiPersonal').get()).size, 0);
  assert.deepEqual(await acceptaInvitatia(db, 'altcineva', { email: 'ana@exemplu.ro', email_verified: true }, t1), { ok: false, motiv: 'fara-invitatie' }, 'o singură dată');
  assert.equal((await db.doc('staff/altcineva').get()).exists, false);
  assert.deepEqual((await audit()).map((x) => [x['actiune'], x['cine']]), [['personal.invita', 'own'], ['personal.accepta-invitatia', 'ana']]);
});

test('contul creat de owner: contul în Auth (neverificat, fără parolă), personalul și linkul de parolă; un cont existent = invitație', async () => {
  const r = await fa('own', { actiune: 'creeaza-cont', email: 'Ion@Exemplu.ro', rol: SUPORT });
  assert.ok(r.uid);
  const u = await auth.getUser(r.uid ?? '');
  assert.deepEqual([u.email, u.emailVerified, u.providerData.length], ['ion@exemplu.ro', false, 0]);
  const s = (await db.doc(`staff/${r.uid ?? ''}`).get()).data();
  assert.deepEqual([s?.['rol'], s?.['email'], s?.['sursa'], s?.['adaugatDe']], [SUPORT, 'ion@exemplu.ro', 'cont-creat', 'own']);
  assert.match(r.link ?? '', /mode=resetPassword/);
  assert.match(r.link ?? '', /oobCode=/);
  // Linkul nou: doar pentru conturile create așa.
  assert.match((await fa('own', { actiune: 'link-parola', uid: r.uid })).link ?? '', /oobCode=/);
  assert.equal(await cod(fa('own', { actiune: 'link-parola', uid: 'sup' })), 'failed-precondition');
  assert.equal(await cod(fa('own', { actiune: 'link-parola', uid: 'nimeni' })), 'not-found');
  // Adresa are deja un cont (poate unul neverificat, al altcuiva): refuz, fără niciun cont nou.
  await auth.createUser({ email: 'dana@exemplu.ro', password: 'parola-straina' });
  assert.equal(await cod(fa('own', { actiune: 'creeaza-cont', email: 'dana@exemplu.ro', rol: SUPORT })), 'already-exists');
  assert.equal(await cod(fa('own', { actiune: 'creeaza-cont', email: 'x@exemplu.ro', rol: 'RNuExista00000000000' })), 'failed-precondition');
  assert.deepEqual((await auth.listUsers()).users.map((x) => x.email).sort(), ['dana@exemplu.ro', 'ion@exemplu.ro']);
  assert.deepEqual((await audit()).map((x) => x['actiune']), ['personal.creeaza-cont', 'personal.link-parola']);
});

test('contul creat: dacă scrierea în personal cade, contul din Auth se șterge (o încercare nouă nu dă „există deja”)', async () => {
  const sters: string[] = [];
  const authCuCadere: AuthPersonal = {
    getUserByEmail: (e) => auth.getUserByEmail(e),
    createUser: async (p) => {
      const u = await auth.createUser(p);
      // Altcineva scoate owner-ul între cele două tranzacții: a doua trebuie să refuze.
      await db.doc('staff/own').set({ rol: SUPORT });
      return u;
    },
    deleteUser: async (uid) => { sters.push(uid); await auth.deleteUser(uid); },
    generatePasswordResetLink: (e) => auth.generatePasswordResetLink(e),
  };
  assert.equal(await cod(administreazaPersonalul(db, authCuCadere, 'own', { actiune: 'creeaza-cont', email: 'ion@exemplu.ro', rol: SUPORT }, T0)), 'permission-denied');
  assert.equal(sters.length, 1);
  assert.equal((await auth.listUsers()).users.length, 0);
  assert.equal((await db.collection('staff').where('email', '==', 'ion@exemplu.ro').get()).size, 0);
});

test('rolul și scoaterea: owner-ul schimbă și scoate; personalul nu rămâne fără owner; cu doi owneri, unul poate pleca', async () => {
  assert.deepEqual(await fa('own', { actiune: 'schimba-rolul', uid: 'sup', rol: SUPORT }), { ok: true, schimbat: false });
  assert.equal(await cod(fa('own', { actiune: 'schimba-rolul', uid: 'own', rol: SUPORT })), 'failed-precondition');
  assert.equal(await cod(fa('own', { actiune: 'scoate', uid: 'own' })), 'failed-precondition');
  assert.equal(await cod(fa('own', { actiune: 'schimba-rolul', uid: 'sup', rol: 'stapan' })), 'invalid-argument');
  assert.equal(await cod(fa('own', { actiune: 'schimba-rolul', uid: 'nimeni', rol: SUPORT })), 'not-found');
  assert.equal(await cod(fa('own', { actiune: 'schimba-rolul', uid: 'a/b', rol: SUPORT })), 'invalid-argument');
  await fa('own', { actiune: 'schimba-rolul', uid: 'sup', rol: 'owner' });
  assert.equal((await db.doc('staff/sup').get()).get('rol'), 'owner');
  // Doi owneri: primul se poate retrage, iar al doilea rămâne.
  await fa('own', { actiune: 'scoate', uid: 'own' });
  assert.equal((await db.doc('staff/own').get()).exists, false);
  assert.equal(await cod(fa('sup', { actiune: 'scoate', uid: 'sup' })), 'failed-precondition');
  assert.deepEqual((await audit()).map((x) => [x['actiune'], x['inainte'], x['dupa']]), [
    ['personal.schimba-rolul', { rol: SUPORT }, { rol: 'owner' }],
    ['personal.scoate', { rol: 'owner', email: null }, null],
  ]);
});

/** Un token de cont nesemnat: emulatorul de funcții nu verifică semnătura (docs/faza2/admin/RAPORT.md §4.2). */
const tokenNesemnat = (uid: string, alte: Record<string, unknown> = {}): string => {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const acum = Math.floor(Date.now() / 1000);
  return `${b64({ alg: 'none', typ: 'JWT' })}.${b64({
    iss: `https://securetoken.google.com/${PROIECT}`, aud: PROIECT, sub: uid, user_id: uid, iat: acum, exp: acum + 3600,
    auth_time: acum, firebase: { sign_in_provider: 'google.com' }, ...alte,
  })}.`;
};
const cheama = (nume: string, data: unknown, antete: Record<string, string>) => fetch(`http://127.0.0.1:5005/${PROIECT}/europe-central2/${nume}`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...antete }, body: JSON.stringify({ data }),
});

test('callable-urile pe emulatorul de funcții: 401 fără App Check, 403 fără owner, 200 cu owner; invitația cu e-mailul din token', async () => {
  const cerere = { actiune: 'invita', email: 'ana@exemplu.ro', rol: SUPORT };
  assert.equal((await cheama('administreazaPersonalul', cerere, { Authorization: `Bearer ${tokenNesemnat('own')}` })).status, 401);
  assert.equal((await cheama('administreazaPersonalul', cerere, { 'X-Firebase-AppCheck': 'proba', Authorization: `Bearer ${tokenNesemnat('sup')}` })).status, 403);
  const r = await cheama('administreazaPersonalul', cerere, { 'X-Firebase-AppCheck': 'proba', Authorization: `Bearer ${tokenNesemnat('own')}` });
  assert.equal(r.status, 200);
  assert.equal(((await r.json()) as { result: { id: string } }).result.id, idInvitatie('ana@exemplu.ro'));
  const nev = await cheama('acceptaInvitatia', null, { 'X-Firebase-AppCheck': 'proba', Authorization: `Bearer ${tokenNesemnat('ana', { email: 'ana@exemplu.ro', email_verified: false })}` });
  assert.equal(nev.status, 400, 'failed-precondition: adresa neverificată');
  const ok = await cheama('acceptaInvitatia', null, { 'X-Firebase-AppCheck': 'proba', Authorization: `Bearer ${tokenNesemnat('ana', { email: 'ana@exemplu.ro', email_verified: true })}` });
  assert.equal(ok.status, 200);
  assert.deepEqual(await ok.json(), { result: { ok: true, rol: SUPORT } });
  assert.equal((await db.doc('staff/ana').get()).get('rol'), SUPORT);
});
