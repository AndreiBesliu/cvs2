import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { oraFerestrei } from '../../shared/erori.ts';
import { trateazaRaportClient } from '../src/erori/client.ts';
import { logServerError } from '../src/erori/jurnal.ts';
import { amprenta, COLECTIE, COLECTIE_LIMITE, scrieEroare, type Aparitie } from '../src/erori/scrie.ts';

/**
 * Jurnalul de erori pe emulatoarele Firestore și Functions (ADR 0039), pornite de `npm run test:emulator` pe proiectul
 * `demo-cncvs2`. Emulatorul nu verifică semnăturile tokenurilor: aici se probează logica, nu securitatea lor.
 */

const PROIECT = 'demo-cncvs2';
const gazda = process.env['FIRESTORE_EMULATOR_HOST'];
if (!gazda) throw new Error('FIRESTORE_EMULATOR_HOST lipsește: testele rulează prin npm run test:emulator');
process.env['GCLOUD_PROJECT'] ??= PROIECT;

if (getApps().length === 0) initializeApp({ projectId: PROIECT });
const db = getFirestore();

beforeEach(async () => {
  const r = await fetch(`http://${gazda}/emulator/v1/projects/${PROIECT}/databases/(default)/documents`, { method: 'DELETE' });
  assert.equal(r.status, 200, 'baza emulatorului nu s-a golit');
});

const ORA = 3_600_000;
const T0 = new Date(Date.UTC(2026, 9, 16, 10, 15));
const raport = {
  tip: 'randare', mesaj: 'piesa 12 lipsă', stiva: 'at a (index-AAAA1111.js:1:2)', adresa: 'https://h.test/a',
  build: 'abc', browser: 'Edge', limba: 'ro',
};
const aparitie = (uid: string | null, mesaj = 'piesa 12 lipsă'): Aparitie => ({
  sursa: 'client', tip: 'randare', mesaj, stiva: '', build: 'abc', instanta: 'local', adresa: '', browser: '', limba: 'ro', uid,
});
const nrAparitii = async (id: string): Promise<number> => (await db.collection(COLECTIE).doc(id).collection('aparitii').count().get()).data().count;
const peIp = (ip: string) => ({ uid: null, xff: ip, ip: undefined });

test('prima apariție creează grupul și apariția; a doua îl numără și redeschide grupul rezolvat', async () => {
  const r1 = await scrieEroare(db, aparitie('u1'), [], T0);
  const id = amprenta('client', 'randare', 'piesa 12 lipsă');
  assert.deepEqual(r1, { ok: true, amprenta: id, nou: true });
  const g1 = (await db.collection(COLECTIE).doc(id).get()).data();
  assert.equal(g1?.['numar'], 1);
  assert.equal(g1?.['rezolvat'], false);
  assert.deepEqual(g1?.['oameni'], ['u1']);
  assert.equal(g1?.['schema'], 1);
  assert.ok((g1?.['primaData'] as Timestamp).isEqual(Timestamp.fromDate(T0)));
  assert.equal(await nrAparitii(id), 1);

  await db.collection(COLECTIE).doc(id).update({ rezolvat: true });
  const t1 = new Date(T0.getTime() + 5 * 60_000);
  // Alt număr în mesaj: același defect, același grup.
  const r2 = await scrieEroare(db, aparitie('u2', 'piesa 7 lipsă'), [], t1);
  assert.deepEqual(r2, { ok: true, amprenta: id, nou: false });
  const g2 = (await db.collection(COLECTIE).doc(id).get()).data();
  assert.equal(g2?.['numar'], 2);
  assert.equal(g2?.['rezolvat'], false, 'un grup rezolvat se redeschide la o apariție nouă');
  assert.deepEqual(g2?.['oameni'], ['u1', 'u2']);
  assert.ok((g2?.['primaData'] as Timestamp).isEqual(Timestamp.fromDate(T0)));
  assert.ok((g2?.['ultimaData'] as Timestamp).isEqual(Timestamp.fromDate(t1)));
  assert.equal((g2?.['ultima'] as { mesaj: string }).mesaj, 'piesa 7 lipsă');
  assert.equal(g2?.['mesaj'], 'piesa 12 lipsă', 'mesajul grupului e primul');
  assert.ok((g2?.['expiraLa'] as Timestamp).isEqual(Timestamp.fromMillis(t1.getTime() + 90 * 86_400_000)));
  assert.equal(await nrAparitii(id), 2);
});

test('oamenii: același om o dată, cel mult 50 distincți; fără cont nu se numără', async () => {
  for (let i = 0; i < 52; i++) await scrieEroare(db, aparitie(`u${i}`), [], T0);
  await scrieEroare(db, aparitie('u0'), [], T0);
  await scrieEroare(db, aparitie(null), [], T0);
  const g = (await db.collection(COLECTIE).doc(amprenta('client', 'randare', 'piesa 12 lipsă')).get()).data();
  assert.equal(g?.['numar'], 54);
  const oameni = g?.['oameni'] as string[];
  assert.equal(oameni.length, 50);
  assert.equal(new Set(oameni).size, 50);
  assert.deepEqual(oameni.slice(0, 2), ['u0', 'u1']);
});

test('plafonul pe IP: a 41-a apariție dintr-o oră se refuză fără nicio scriere; alt IP și ora următoare trec', async () => {
  for (let i = 0; i < 40; i++) assert.deepEqual(await trateazaRaportClient(db, raport, peIp('7.7.7.7'), T0), { ok: true }, `apelul ${i + 1}`);
  assert.deepEqual(await trateazaRaportClient(db, raport, peIp('7.7.7.7'), T0), { ok: false, motiv: 'plafon' });
  const id = amprenta('client', 'randare', raport.mesaj);
  assert.equal((await db.collection(COLECTIE).doc(id).get()).data()?.['numar'], 40);
  assert.equal(await nrAparitii(id), 40);
  // IP-ul ultim din X-Forwarded-For contează, nu cel scris de client în stânga.
  assert.deepEqual(await trateazaRaportClient(db, raport, peIp('7.7.7.7, 8.8.8.8'), T0), { ok: true });
  assert.deepEqual(await trateazaRaportClient(db, raport, peIp('8.8.8.8, 7.7.7.7'), T0), { ok: false, motiv: 'plafon' });
  assert.deepEqual(await trateazaRaportClient(db, raport, peIp('7.7.7.7'), new Date(T0.getTime() + ORA)), { ok: true });
  // Contoarele: unul pe IP și unul pe tot clientul, pe oră; IP-ul nu apare în clar.
  const chei = (await db.collection(COLECTIE_LIMITE).listDocuments()).map((d) => d.id).sort();
  const ora = oraFerestrei(T0.getTime());
  assert.ok(chei.includes(`client_${ora}`), chei.join());
  assert.ok(chei.includes(`client_${ora + 1}`), chei.join());
  assert.equal(chei.filter((c) => c.startsWith('ip_')).length, 3, chei.join());
  assert.ok(chei.every((c) => !c.includes('7.7.7.7') && !c.includes('8.8.8.8')));
  assert.equal((await db.collection(COLECTIE_LIMITE).doc(`client_${ora}`).get()).data()?.['numar'], 41);
});

test('plafonul global (același mecanism, cu un maxim mic): peste el nu se scrie nimic', async () => {
  const plafon = [{ cheie: 'client', maxim: 3 }];
  for (let i = 0; i < 3; i++) assert.equal((await scrieEroare(db, aparitie('u'), plafon, T0)).ok, true);
  assert.deepEqual(await scrieEroare(db, aparitie('u', 'alt defect'), plafon, T0), { ok: false, motiv: 'plafon' });
  assert.equal((await db.collection(COLECTIE).doc(amprenta('client', 'randare', 'alt defect')).get()).exists, false);
});

test('raportul nevalid nu scrie nimic; instanța o pune serverul, nu clientul', async () => {
  assert.deepEqual(await trateazaRaportClient(db, { ...raport, tip: 'inventat' }, peIp('1.1.1.1'), T0), { ok: false, motiv: 'nevalid' });
  assert.deepEqual(await trateazaRaportClient(db, null, peIp('1.1.1.1'), T0), { ok: false, motiv: 'nevalid' });
  assert.equal((await db.collection(COLECTIE).count().get()).data().count, 0);
  assert.equal((await db.collection(COLECTIE_LIMITE).count().get()).data().count, 0, 'refuzul nu consumă din plafon');
  assert.deepEqual(await trateazaRaportClient(db, { ...raport, instanta: 'live', adresa: 'https://h.test/a?t=1' }, peIp('1.1.1.1'), T0), { ok: true });
  const ultima = (await db.collection(COLECTIE).doc(amprenta('client', 'randare', raport.mesaj)).get()).data()?.['ultima'] as Record<string, unknown>;
  assert.equal(ultima['instanta'], 'local');
  assert.equal(ultima['adresa'], 'https://h.test/a');
  assert.equal(ultima['uid'], null);
});

test('logServerError: sursa server, tipul = locul, contextul JSON și uid-ul; nu aruncă pe valori ciudate', async () => {
  assert.equal(await logServerError('job:curatenie', null, { uid: null, piesa: 'p1' }, db, T0), true);
  const g = (await db.collection(COLECTIE).doc(amprenta('server', 'job:curatenie', 'null aruncat')).get()).data();
  assert.equal(g?.['sursa'], 'server');
  assert.equal(g?.['tip'], 'job:curatenie');
  assert.equal(g?.['mesaj'], 'null aruncat');
  const ultima = g?.['ultima'] as Record<string, unknown>;
  assert.equal(ultima['context'], '{"piesa":"p1"}');
  assert.equal(ultima['uid'], null);
  assert.equal(ultima['instanta'], 'local');

  const circular: Record<string, unknown> = {};
  circular['eu'] = circular;
  assert.equal(await logServerError('callable:x', new RangeError('prea mare'), { uid: 'u9', circular }, db, T0), true);
  const u = (await db.collection(COLECTIE).doc(amprenta('server', 'callable:x', 'RangeError: prea mare')).get()).data()?.['ultima'] as Record<string, unknown>;
  assert.equal(u['context'], '(contextul nu se poate scrie ca JSON)');
  assert.equal(u['uid'], 'u9');
  assert.match(String(u['stiva']), /RangeError: prea mare/);
});

test('logServerError nu aruncă nici când Firestore cade: întoarce false', async () => {
  const cazut = { collection: () => { throw new Error('Firestore indisponibil'); } } as unknown as Firestore;
  const erori: unknown[] = [];
  const vechi = console.error;
  console.error = (...a: unknown[]) => { erori.push(a); };
  try {
    assert.equal(await logServerError('job:x', new Error('defectul'), { uid: null }, cazut, T0), false);
  } finally {
    console.error = vechi;
  }
  assert.equal(erori.length, 1, 'eșecul ajunge în Cloud Logging');
});

test('callable-ul pe emulatorul de funcții: 401 fără App Check, { ok: true } cu el', async () => {
  const url = `http://127.0.0.1:5005/${PROIECT}/europe-central2/logClientError`;
  const corp = JSON.stringify({ data: raport });
  const fara = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: corp });
  assert.equal(fara.status, 401);
  assert.equal((await db.collection(COLECTIE).count().get()).data().count, 0);
  // Emulatorul primește orice antet App Check ca valid (docs/faza2/admin/RAPORT.md §4.2): pe test, 3.2 măsoară tokenul real.
  const cu = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Firebase-AppCheck': 'proba' }, body: corp });
  assert.equal(cu.status, 200);
  assert.deepEqual(await cu.json(), { result: { ok: true } });
  const g = (await db.collection(COLECTIE).doc(amprenta('client', 'randare', raport.mesaj)).get()).data();
  assert.equal(g?.['numar'], 1);
  assert.equal((g?.['ultima'] as Record<string, unknown>)['instanta'], 'local');
});
