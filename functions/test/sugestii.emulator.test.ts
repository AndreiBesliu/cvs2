import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, type Timestamp } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { DESCRIERE_MAX, NOTA_MAX, SUGESTII_PE_ZI, TITLU_MAX } from '../../shared/sugestii.ts';
import { COLECTIE_AUDIT } from '../src/audit.ts';
import { trateazaSugestia, type TokenSugestie } from '../src/sugestii/actiuni.ts';

/**
 * Sugestiile personalului (ADR 0107) pe emulatorul Firestore: scrierea (permisiunea, câmpurile curățate, plafoanele de
 * lungime, contorul zilnic), editarea (doar autorul, doar fără decizie, pe versiunea văzută), decizia (doar owner-ul,
 * starea și nota, pe versiunea văzută); auditul în aceeași tranzacție; refuzurile nu scriu nimic. Plus callable-ul prin
 * emulatorul de funcții (App Check, drepturile, adresa din token).
 */

const PROIECT = 'demo-cncvs2';
const gazda = process.env['FIRESTORE_EMULATOR_HOST'];
if (!gazda) throw new Error('FIRESTORE_EMULATOR_HOST lipsește: testele rulează prin npm run test:emulator');
process.env['GCLOUD_PROJECT'] ??= PROIECT;
if (getApps().length === 0) initializeApp({ projectId: PROIECT });
const db = getFirestore();

const T0 = new Date(Date.UTC(2026, 9, 29, 10, 0));
const SCRIE = 'RScrie00000000000000';
const CITESTE = 'RCiteste000000000000';

beforeEach(async () => {
  assert.equal((await fetch(`http://${gazda}/emulator/v1/projects/${PROIECT}/databases/(default)/documents`, { method: 'DELETE' })).status, 200);
  // Owner-ul pus din consolă, fără e-mail în personal (ca primul owner de pe test).
  await db.doc('staff/own').set({ rol: 'owner' });
  await db.doc(`roluri/${SCRIE}`).set({ nume: 'Scrie', permisiuni: ['sugestii.scrie'] });
  await db.doc(`roluri/${CITESTE}`).set({ nume: 'Citește', permisiuni: ['sugestii.citeste', 'erori.citeste'] });
  await db.doc('staff/ana').set({ rol: SCRIE, email: 'ana@exemplu.ro', sursa: 'invitatie' });
  await db.doc('staff/ion').set({ rol: SCRIE, email: 'ion@exemplu.ro', sursa: 'cont-creat' });
  await db.doc('staff/cit').set({ rol: CITESTE, email: 'cit@exemplu.ro', sursa: 'invitatie' });
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
const sugestia = async (id: string) => (await db.doc(`sugestii/${id}`).get()).data() ?? {};
const ms = (x: unknown): number => (x as Timestamp).toMillis();
/** Un ceas care avansează cu o secundă la fiecare acțiune: rândurile de audit au ordinea acțiunilor (`orderBy('cand')`). */
let ceas = T0.getTime();
const fa = (uid: string | null, data: unknown, token: TokenSugestie | null = null, acum = new Date(ceas += 1000)) => trateazaSugestia(db, uid, token, data, acum);
const CONTINUT = { titlu: 'Grila magnetică', descriere: 'Rândul 1\nRândul 2', tip: 'idee', zona: 'desen' };
const scrie = (uid: string, extra: Record<string, unknown> = {}) => fa(uid, { actiune: 'scrie', ...CONTINUT, ...extra });

test('scrierea: cine are sugestii.scrie scrie o sugestie, cu câmpurile curățate, starea „noua”, versiunea 1 și auditul', async () => {
  const r = await fa('ana', { actiune: 'scrie', titlu: '  Grila   magnetică ', descriere: ' Rândul 1\r\nRândul 2\t! ', tip: 'idee', zona: 'desen' });
  assert.equal(r.schimbat, true);
  assert.equal(r.versiune, 1);
  assert.match(r.id, /^[A-Za-z0-9]{20}$/);
  const d = await sugestia(r.id);
  assert.deepEqual(
    [d['titlu'], d['descriere'], d['tip'], d['zona'], d['autor'], d['autorEmail'], d['stare'], d['nota'], d['versiune'], d['decisaDe'], d['decisaLa']],
    ['Grila magnetică', 'Rândul 1\nRândul 2\t!', 'idee', 'desen', 'ana', 'ana@exemplu.ro', 'noua', '', 1, null, null],
  );
  assert.equal(ms(d['creataLa']), ceas);
  assert.equal(ms(d['modificataLa']), ceas);
  const a = await audit();
  assert.deepEqual(a.map((x) => [x['actiune'], x['cine'], x['rol'], x['tinta'], x['inainte']]), [['sugestii.scrie', 'ana', SCRIE, `sugestii/${r.id}`, null]]);
  assert.deepEqual(a[0]?.['dupa'], { titlu: 'Grila magnetică', descriere: 'Rândul 1\nRândul 2\t!', tip: 'idee', zona: 'desen' });
  // Owner-ul are tot catalogul, deci scrie și el; fără e-mail în personal, adresa vine din token (cu litere mici).
  const o = await fa('own', { actiune: 'scrie', titlu: 'Exportul DXF R12', descriere: '', tip: 'problema', zona: null }, { email: 'Owner@Exemplu.RO' });
  assert.deepEqual([(await sugestia(o.id))['autorEmail'], (await sugestia(o.id))['zona']], ['owner@exemplu.ro', null]);
  // Descrierea și zona lipsă din cerere: goală, nespecificată.
  const f = await fa('ion', { actiune: 'scrie', titlu: 'Tasta pentru grilă', tip: 'imbunatatire' });
  assert.deepEqual([(await sugestia(f.id))['descriere'], (await sugestia(f.id))['zona']], ['', null]);
  assert.equal((await audit()).length, 3);
});

test('scrierea: fără drept, fără cont, câmpuri greșite sau peste plafoane = refuz, fără nicio scriere; exact la plafoane trece', async () => {
  const bun = { actiune: 'scrie', titlu: 'T', descriere: '', tip: 'idee', zona: null };
  assert.equal(await cod(fa(null, bun)), 'unauthenticated');
  for (const uid of ['cit', 'strain']) assert.equal(await cod(fa(uid, bun)), 'permission-denied', uid);
  const rele: Record<string, unknown>[] = [
    { titlu: '' }, { titlu: '   ' }, { titlu: 'Ș'.repeat(TITLU_MAX + 1) }, { titlu: 'a\u0001b' }, { titlu: 7 }, { titlu: undefined },
    { descriere: 'x'.repeat(DESCRIERE_MAX + 1) }, { descriere: 'a\u0000b' }, { descriere: 'a\u007fb' }, { descriere: 5 },
    { tip: 'altceva' }, { tip: undefined }, { zona: 'bucatarie' }, { zona: 3 },
  ];
  for (const r of rele) assert.equal(await cod(fa('ana', { ...bun, ...r })), 'invalid-argument', JSON.stringify(r));
  assert.equal(await cod(fa('ana', { actiune: 'sterge', id: 'x' })), 'invalid-argument');
  assert.equal(await cod(fa('ana', 'scrie')), 'invalid-argument');
  assert.equal(await cod(fa('ana', [{ actiune: 'scrie' }])), 'invalid-argument');
  assert.equal((await db.collection('sugestii').get()).size, 0);
  assert.equal((await audit()).length, 0);
  assert.equal((await db.doc('limiteSugestii/ana').get()).exists, false, 'un refuz nu numără');
  await fa('ana', { ...bun, titlu: 'Ș'.repeat(TITLU_MAX), descriere: 'ț'.repeat(DESCRIERE_MAX) });
  assert.equal((await db.collection('sugestii').get()).size, 1);
});

test(`plafonul zilnic: ${SUGESTII_PE_ZI} pe om pe zi (UTC); al doilea om nu e oprit; a doua zi se reia`, async () => {
  for (let i = 0; i < SUGESTII_PE_ZI; i++) await scrie('ana', { titlu: `S${i}` });
  assert.equal(await cod(scrie('ana')), 'resource-exhausted');
  assert.equal((await db.collection('sugestii').where('autor', '==', 'ana').get()).size, SUGESTII_PE_ZI);
  await scrie('ion');
  await fa('ana', { actiune: 'scrie', ...CONTINUT, titlu: 'Mâine' }, null, new Date(Date.UTC(2026, 9, 30, 0, 0, 1)));
  assert.equal((await db.collection('sugestii').where('autor', '==', 'ana').get()).size, SUGESTII_PE_ZI + 1);
  assert.deepEqual((await db.doc('limiteSugestii/ana').get()).data(), { zi: '2026-10-30', numar: 1 });
  assert.deepEqual((await db.doc('limiteSugestii/ion').get()).data(), { zi: '2026-10-29', numar: 1 });
});

test('editarea: doar autorul, doar fără decizie, pe versiunea văzută; același conținut nu scrie; auditul are înainte și după', async () => {
  const r = await scrie('ana');
  const ed = (uid: string, extra: Record<string, unknown> = {}) => fa(uid, { actiune: 'editeaza', id: r.id, versiune: 1, ...CONTINUT, ...extra });
  assert.deepEqual(await ed('ana'), { ok: true, id: r.id, schimbat: false, versiune: 1 }, 'același conținut');
  assert.equal(await cod(ed('ion')), 'permission-denied', 'alt autor');
  assert.equal(await cod(ed('own')), 'permission-denied', 'nici owner-ul nu editează sugestia altcuiva');
  assert.equal(await cod(ed('cit')), 'permission-denied', 'fără sugestii.scrie');
  assert.equal(await cod(ed('ana', { versiune: 2 })), 'failed-precondition', 'altă versiune decât cea din document');
  assert.equal(await cod(ed('ana', { id: 'NuExista000000000000' })), 'not-found');
  for (const x of [{ id: '../staff/ana' }, { id: 7 }, { versiune: 0 }, { versiune: '1' }, { versiune: 1.5 }, { titlu: '' }, { tip: 'nu' }]) {
    assert.equal(await cod(ed('ana', x)), 'invalid-argument', JSON.stringify(x));
  }
  assert.equal((await audit()).length, 1, 'doar scrierea');
  assert.deepEqual(await ed('ana', { titlu: 'Grila cu magneți', zona: null }), { ok: true, id: r.id, schimbat: true, versiune: 2 });
  const d = await sugestia(r.id);
  assert.deepEqual([d['titlu'], d['zona'], d['versiune'], d['stare']], ['Grila cu magneți', null, 2, 'noua']);
  assert.ok(ms(d['modificataLa']) > ms(d['creataLa']));
  assert.equal(await cod(ed('ana', { titlu: 'Încă una' })), 'failed-precondition', 'versiunea 1 e veche acum');
  const a = (await audit()).filter((x) => x['actiune'] === 'sugestii.editeaza');
  assert.deepEqual(a.map((x) => [x['cine'], x['inainte'], x['dupa']]), [[
    'ana', CONTINUT, { ...CONTINUT, titlu: 'Grila cu magneți', zona: null },
  ]]);
  // După decizie, autorul nu mai editează (nici pe versiunea nouă).
  await fa('own', { actiune: 'decide', id: r.id, versiune: 2, stare: 'acceptata', nota: '' });
  assert.equal(await cod(ed('ana', { versiune: 3, titlu: 'Prea târziu' })), 'failed-precondition');
  assert.equal((await sugestia(r.id))['titlu'], 'Grila cu magneți');
});

test('decizia: doar owner-ul, o stare din listă și o notă, pe versiunea văzută; aceeași decizie nu scrie; auditul', async () => {
  const r = await scrie('ana');
  const de = (uid: string | null, extra: Record<string, unknown> = {}) => fa(uid, { actiune: 'decide', id: r.id, versiune: 1, stare: 'acceptata', nota: 'Bună idee.', ...extra });
  assert.equal(await cod(de(null)), 'unauthenticated');
  for (const uid of ['ana', 'ion', 'cit', 'strain']) assert.equal(await cod(de(uid)), 'permission-denied', uid);
  for (const x of [{ stare: 'gata' }, { stare: undefined }, { nota: 'x'.repeat(NOTA_MAX + 1) }, { nota: 'a\u0007b' }, { nota: 3 }, { versiune: 1.5 }, { id: 'scurt' }]) {
    assert.equal(await cod(de('own', x)), 'invalid-argument', JSON.stringify(x));
  }
  assert.equal(await cod(de('own', { id: 'NuExista000000000000' })), 'not-found');
  assert.equal((await audit()).length, 1, 'doar scrierea');
  assert.deepEqual(await de('own', { nota: '  Bună idee;\r\ndupă etapa 6.  ' }), { ok: true, id: r.id, schimbat: true, versiune: 2 });
  const d = await sugestia(r.id);
  assert.deepEqual([d['stare'], d['nota'], d['decisaDe'], ms(d['decisaLa']), d['versiune']], ['acceptata', 'Bună idee;\ndupă etapa 6.', 'own', ceas, 2]);
  assert.equal(await cod(de('own', { stare: 'respinsa' })), 'failed-precondition', 'versiunea 1 e veche');
  assert.deepEqual(await de('own', { versiune: 2, nota: 'Bună idee;\ndupă etapa 6.' }), { ok: true, id: r.id, schimbat: false, versiune: 2 });
  assert.equal(await cod(de('own', { versiune: 2, nota: 'x'.repeat(NOTA_MAX + 1) })), 'invalid-argument');
  await de('own', { versiune: 2, nota: 'ț'.repeat(NOTA_MAX) });
  // Toate stările, apoi înapoi la „noua”: autorul o poate edita din nou.
  let v = 3;
  for (const stare of ['in-lucru', 'facuta', 'amanata', 'respinsa', 'noua']) v = (await de('own', { versiune: v, stare, nota: '' })).versiune;
  assert.equal(v, 8);
  assert.equal((await fa('ana', { actiune: 'editeaza', id: r.id, versiune: 8, ...CONTINUT, titlu: 'Din nou' })).versiune, 9);
  const a = (await audit()).filter((x) => x['actiune'] === 'sugestii.decide');
  assert.equal(a.length, 7);
  assert.deepEqual([a[0]?.['cine'], a[0]?.['rol'], a[0]?.['tinta'], a[0]?.['inainte'], a[0]?.['dupa']], [
    'own', 'owner', `sugestii/${r.id}`, { stare: 'noua', nota: '' }, { stare: 'acceptata', nota: 'Bună idee;\ndupă etapa 6.' },
  ]);
  assert.deepEqual(a[6]?.['dupa'], { stare: 'noua', nota: '' });
});

/** Un token de cont nesemnat (ca în `personal.emulator.test.ts`): emulatorul de funcții nu verifică semnătura. */
const tokenNesemnat = (uid: string, alte: Record<string, unknown> = {}): string => {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const acum = Math.floor(Date.now() / 1000);
  return `${b64({ alg: 'none', typ: 'JWT' })}.${b64({
    iss: `https://securetoken.google.com/${PROIECT}`, aud: PROIECT, sub: uid, user_id: uid, iat: acum, exp: acum + 3600,
    auth_time: acum, firebase: { sign_in_provider: 'google.com' }, ...alte,
  })}.`;
};
const cheama = (data: unknown, antete: Record<string, string>) => fetch(`http://127.0.0.1:5005/${PROIECT}/europe-central2/sugestii`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...antete }, body: JSON.stringify({ data }),
});

test('callable-ul pe emulatorul de funcții: 401 fără App Check, 403 fără drept, 200 cu drept; adresa din token', async () => {
  const cerere = { actiune: 'scrie', titlu: 'Prin funcție', descriere: '', tip: 'idee', zona: null };
  assert.equal((await cheama(cerere, { Authorization: `Bearer ${tokenNesemnat('ana')}` })).status, 401);
  assert.equal((await cheama(cerere, { 'X-Firebase-AppCheck': 'proba', Authorization: `Bearer ${tokenNesemnat('cit')}` })).status, 403);
  const r = await cheama(cerere, { 'X-Firebase-AppCheck': 'proba', Authorization: `Bearer ${tokenNesemnat('own', { email: 'own@exemplu.ro' })}` });
  assert.equal(r.status, 200);
  const { result } = (await r.json()) as { result: { id: string; versiune: number } };
  assert.equal(result.versiune, 1);
  assert.deepEqual([(await sugestia(result.id))['autor'], (await sugestia(result.id))['autorEmail']], ['own', 'own@exemplu.ro']);
});
