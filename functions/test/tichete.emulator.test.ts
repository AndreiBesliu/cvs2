import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, type Timestamp } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { POZA_MAX_OCTETI } from '../../shared/poza.ts';
import { AMPRENTE_MAX, RASPUNS_MAX, RASPUNSURI_MAX, TEXT_MAX, TICHETE_PE_ZI, type RaspunsRaportarileMele, type RaspunsTichet } from '../../shared/tichete.ts';
import { COLECTIE_AUDIT } from '../src/audit.ts';
import { trateazaContul } from '../src/conturi/actiuni.ts';
import { raportariNecitite, trateazaTichetul, type TokenTichet } from '../src/tichete/actiuni.ts';

/**
 * Raportările clienților (tichetele, ADR 0116 §C) pe emulatorul Firestore. Raportarea: doar cu contul deschis sau din
 * personal, câmpurile curățate, poza ca la sugestii, plafonul zilnic, auditul fără textul omului, refuzurile fără nicio
 * scriere. Raportările omului: doar ale lui, cele mai noi întâi, fără cine a răspuns. Răspunsul și starea: doar cu
 * `tichete.raspunde`, pe versiunea văzută, cu auditul; primul răspuns deschide tichetul și numără la autor. Citirea: doar
 * autorul, fără să mute versiunea. Semnul din meniul contului vine odată cu deschiderea contului.
 */

const PROIECT = 'demo-cncvs2';
const gazda = process.env['FIRESTORE_EMULATOR_HOST'];
if (!gazda) throw new Error('FIRESTORE_EMULATOR_HOST lipsește: testele rulează prin npm run test:emulator');
process.env['GCLOUD_PROJECT'] ??= PROIECT;
if (getApps().length === 0) initializeApp({ projectId: PROIECT });
const db = getFirestore();

const T0 = new Date(Date.UTC(2026, 10, 2, 10, 0));
const RASP = 'RTicRasp000000000000';
const CIT = 'RTicCit0000000000000';

beforeEach(async () => {
  assert.equal((await fetch(`http://${gazda}/emulator/v1/projects/${PROIECT}/databases/(default)/documents`, { method: 'DELETE' })).status, 200);
  await db.doc('staff/own').set({ rol: 'owner' });
  await db.doc(`roluri/${RASP}`).set({ nume: 'Răspunde', permisiuni: ['tichete.raspunde'] });
  await db.doc(`roluri/${CIT}`).set({ nume: 'Citește', permisiuni: ['tichete.citeste'] });
  await db.doc('staff/sup').set({ rol: RASP, email: 'sup@exemplu.ro', sursa: 'invitatie' });
  await db.doc('staff/cit').set({ rol: CIT, email: 'cit@exemplu.ro', sursa: 'invitatie' });
  // Doi clienți cu contul deschis; un om logat fără cont deschis (adresa neconfirmată) nu e în nicio colecție.
  await db.doc('conturi/ana').set({ email: 'ana@exemplu.ro', nume: 'Ana', plan: 'proba' });
  await db.doc('conturi/ion').set({ email: 'ion@exemplu.ro', nume: 'Ion', plan: 'gratuit' });
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
const tichetul = async (id: string) => (await db.doc(`tichete/${id}`).get()).data() ?? {};
const ms = (x: unknown): number => (x as Timestamp).toMillis();
let ceas = T0.getTime();
const fa = (uid: string | null, data: unknown, token: TokenTichet | null = null, acum = new Date(ceas += 1000)) => trateazaTichetul(db, uid, token, data, acum);
const APLICATIA = { versiune: 'ed4c30c777de', instanta: 'test', limba: 'ro', browser: 'Mozilla/5.0 Edg/147', plan: 'proba' };
const AMPRENTA = 'a'.repeat(32);
const raporteaza = async (uid: string, extra: Record<string, unknown> = {}): Promise<RaspunsTichet> =>
  (await fa(uid, { actiune: 'raporteaza', fel: 'problema', text: 'Exportul se oprește la 50 %.', aplicatia: APLICATIA, amprente: [AMPRENTA], ...extra })) as RaspunsTichet;
const mele = async (uid: string): Promise<RaspunsRaportarileMele> => (await fa(uid, { actiune: 'mele' })) as RaspunsRaportarileMele;
/** Un JPEG minim: semnătura ajunge (serverul citește tipul din primii octeți). */
const jpeg = (n: number): string => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(n - 3, 1)]).toString('base64');

test('raportarea: clientul cu contul deschis raportează, cu câmpurile curățate, starea „nou”, versiunea 1 și auditul fără text', async () => {
  const r = await raporteaza('ana', { text: '  Exportul se oprește\r\nla 50 %.  ', amprente: [AMPRENTA, AMPRENTA, 'b'.repeat(32)] });
  assert.equal(r.versiune, 1);
  assert.match(r.id, /^[A-Za-z0-9]{20}$/);
  const d = await tichetul(r.id);
  assert.deepEqual(
    [d['autor'], d['autorEmail'], d['fel'], d['text'], d['stare'], d['versiune'], d['necititeAutor'], d['ultimulRaspunsLa'], d['poza']],
    ['ana', 'ana@exemplu.ro', 'problema', 'Exportul se oprește\nla 50 %.', 'nou', 1, 0, null, null],
  );
  assert.deepEqual(d['aplicatia'], APLICATIA);
  assert.deepEqual(d['amprente'], [AMPRENTA, 'b'.repeat(32)], 'fără repetiții, în ordinea lor');
  assert.deepEqual(d['raspunsuri'], []);
  assert.equal(ms(d['creatLa']), ceas);
  const a = await audit();
  assert.deepEqual(a.map((x) => [x['actiune'], x['cine'], x['rol'], x['tinta'], x['inainte']]), [['tichete.raporteaza', 'ana', null, `tichete/${r.id}`, null]]);
  assert.deepEqual(a[0]?.['dupa'], { fel: 'problema', caractere: 28, amprente: 2, poza: null });
  // Personalul raportează și fără cont deschis în editor; owner-ul, fără e-mail în personal și fără token, fără adresă; cu
  // token, cu adresa din el.
  const o = await raporteaza('own', { fel: 'intrebare', amprente: [] });
  assert.equal((await tichetul(o.id))['autorEmail'], null);
  const t = (await fa('own', { actiune: 'raporteaza', fel: 'idee', text: 'x', aplicatia: { ...APLICATIA, plan: null } }, { email: 'Owner@Exemplu.RO' })) as RaspunsTichet;
  assert.deepEqual([(await tichetul(t.id))['autorEmail'], (await tichetul(t.id))['amprente'], (await tichetul(t.id))['aplicatia']], ['owner@exemplu.ro', [], { ...APLICATIA, plan: null }]);
});

test('raportarea: fără cont deschis, fără logare, câmpuri greșite sau peste plafoane = refuz, fără nicio scriere; exact la plafoane trece', async () => {
  assert.equal(await cod(raporteaza('neconfirmat')), 'permission-denied', 'logat, dar fără cont deschis și fără personal');
  assert.equal(await cod(fa(null, { actiune: 'raporteaza' })), 'unauthenticated');
  const rele: Record<string, unknown>[] = [
    { fel: 'altceva' }, { fel: undefined }, { text: '' }, { text: '   ' }, { text: 'x'.repeat(TEXT_MAX + 1) }, { text: 'a\u0000b' }, { text: 3 },
    { aplicatia: undefined }, { aplicatia: { ...APLICATIA, limba: 'fr' } }, { aplicatia: { ...APLICATIA, versiune: '' } },
    { aplicatia: { ...APLICATIA, browser: 'x'.repeat(301) } }, { aplicatia: { ...APLICATIA, plan: 7 } }, { aplicatia: [] },
    { amprente: ['nu-e-hex'] }, { amprente: Array.from({ length: AMPRENTE_MAX + 1 }, (_, i) => i.toString(16).padStart(32, '0')) },
    { amprente: 'a' }, { poza: 'nu e base64!' }, { poza: Buffer.from('GIF89a......').toString('base64') }, { poza: jpeg(POZA_MAX_OCTETI + 1) },
  ];
  for (const r of rele) assert.equal(await cod(raporteaza('ana', r)), 'invalid-argument', JSON.stringify(r).slice(0, 80));
  assert.equal(await cod(fa('ana', { actiune: 'sterge' })), 'invalid-argument');
  assert.equal(await cod(fa('ana', 'raporteaza')), 'invalid-argument');
  assert.equal((await db.collection('tichete').get()).size, 0);
  assert.equal((await audit()).length, 0);
  assert.equal((await db.doc('limiteTichete/ana').get()).exists, false, 'un refuz nu numără');
  const bun = await raporteaza('ana', { text: 'ț'.repeat(TEXT_MAX), amprente: Array.from({ length: AMPRENTE_MAX }, (_, i) => i.toString(16).padStart(32, '0')) });
  assert.equal((await tichetul(bun.id))['amprente'].length, AMPRENTE_MAX);
});

test('poza planșei: în documentul ei, lângă tichet; tichetul ține doar tipul și mărimea; exact la plafon trece', async () => {
  const r = await raporteaza('ana', { poza: jpeg(POZA_MAX_OCTETI) });
  assert.deepEqual((await tichetul(r.id))['poza'], { tip: 'image/jpeg', marime: POZA_MAX_OCTETI });
  const p = (await db.doc(`tichete/${r.id}/poze/plansa`).get()).data() ?? {};
  assert.deepEqual([p['tip'], p['marime'], (p['octeti'] as Buffer).length], ['image/jpeg', POZA_MAX_OCTETI, POZA_MAX_OCTETI]);
  assert.deepEqual((await audit())[0]?.['dupa'], { fel: 'problema', caractere: 28, amprente: 1, poza: { tip: 'image/jpeg', marime: POZA_MAX_OCTETI } });
});

test(`plafonul zilnic: ${TICHETE_PE_ZI} pe cont pe zi (UTC); alt cont nu e oprit; a doua zi se reia`, async () => {
  for (let i = 0; i < TICHETE_PE_ZI; i++) await raporteaza('ana', { text: `R${i}` });
  assert.equal(await cod(raporteaza('ana')), 'resource-exhausted');
  await raporteaza('ion');
  await fa('ana', { actiune: 'raporteaza', fel: 'idee', text: 'Mâine', aplicatia: APLICATIA }, null, new Date(Date.UTC(2026, 10, 3, 0, 0, 1)));
  assert.equal((await db.collection('tichete').where('autor', '==', 'ana').get()).size, TICHETE_PE_ZI + 1);
  assert.deepEqual((await db.doc('limiteTichete/ana').get()).data(), { zi: '2026-11-03', numar: 1 });
});

test('răspunsul: doar cu tichete.raspunde, pe versiunea văzută; primul deschide tichetul și numără la autor; auditul fără text', async () => {
  const r = await raporteaza('ana');
  const rasp = (uid: string, extra: Record<string, unknown> = {}) => fa(uid, { actiune: 'raspunde', id: r.id, versiune: 1, text: 'Am refăcut exportul.', ...extra });
  for (const uid of ['cit', 'ana', 'ion']) assert.equal(await cod(rasp(uid)), 'permission-denied', uid);
  for (const x of [{ text: '' }, { text: 'x'.repeat(RASPUNS_MAX + 1) }, { versiune: 0 }, { id: 'scurt' }]) assert.equal(await cod(rasp('sup', x)), 'invalid-argument', JSON.stringify(x));
  assert.equal(await cod(rasp('sup', { versiune: 2 })), 'failed-precondition');
  assert.equal(await cod(rasp('sup', { id: 'NuExista000000000000' })), 'not-found');
  assert.deepEqual(await rasp('sup'), { ok: true, id: r.id, schimbat: true, versiune: 2 });
  let d = await tichetul(r.id);
  assert.deepEqual([d['stare'], d['necititeAutor'], d['versiune'], ms(d['ultimulRaspunsLa'])], ['deschis', 1, 2, ceas]);
  assert.deepEqual((d['raspunsuri'] as Record<string, unknown>[]).map((x) => [x['de'], x['deEmail'], x['text'], ms(x['la'])]), [['sup', 'sup@exemplu.ro', 'Am refăcut exportul.', ceas]]);
  // Owner-ul are tot catalogul: răspunde și el; al doilea răspuns lasă starea și numără din nou.
  await fa('own', { actiune: 'raspunde', id: r.id, versiune: 2, text: 'Încearcă versiunea nouă.' }, { email: 'owner@exemplu.ro' });
  d = await tichetul(r.id);
  assert.deepEqual([d['stare'], d['necititeAutor'], (d['raspunsuri'] as unknown[]).length], ['deschis', 2, 2]);
  const a = (await audit()).filter((x) => x['actiune'] === 'tichete.raspunde');
  assert.deepEqual(a.map((x) => [x['cine'], x['inainte'], x['dupa']]), [
    ['sup', { stare: 'nou', raspunsuri: 0 }, { stare: 'deschis', raspunsuri: 1 }],
    ['own', { stare: 'deschis', raspunsuri: 1 }, { stare: 'deschis', raspunsuri: 2 }],
  ]);
});

test(`răspunsurile au un plafon (${RASPUNSURI_MAX}); un tichet rezolvat primește răspuns fără să se redeschidă`, async () => {
  const r = await raporteaza('ana');
  await db.doc(`tichete/${r.id}`).update({ raspunsuri: Array.from({ length: RASPUNSURI_MAX }, () => ({ de: 'sup', text: 'x' })), stare: 'rezolvat' });
  assert.equal(await cod(fa('sup', { actiune: 'raspunde', id: r.id, versiune: 1, text: 'încă unul' })), 'failed-precondition');
  await db.doc(`tichete/${r.id}`).update({ raspunsuri: [] });
  await fa('sup', { actiune: 'raspunde', id: r.id, versiune: 1, text: 'După rezolvare.' });
  assert.equal((await tichetul(r.id))['stare'], 'rezolvat');
});

test('starea: doar cu tichete.raspunde, pe versiunea văzută; aceeași stare nu scrie; auditul are înainte și după', async () => {
  const r = await raporteaza('ana');
  const st = (uid: string, stare: string, versiune = 1) => fa(uid, { actiune: 'stare', id: r.id, versiune, stare });
  for (const uid of ['cit', 'ana']) assert.equal(await cod(st(uid, 'rezolvat')), 'permission-denied', uid);
  assert.equal(await cod(st('sup', 'inchis')), 'invalid-argument');
  assert.equal(await cod(st('sup', 'rezolvat', 2)), 'failed-precondition');
  assert.deepEqual(await st('sup', 'nou'), { ok: true, id: r.id, schimbat: false, versiune: 1 });
  assert.deepEqual(await st('sup', 'rezolvat'), { ok: true, id: r.id, schimbat: true, versiune: 2 });
  assert.deepEqual(await st('own', 'deschis', 2), { ok: true, id: r.id, schimbat: true, versiune: 3 });
  assert.deepEqual((await audit()).filter((x) => x['actiune'] === 'tichete.stare').map((x) => [x['cine'], x['inainte'], x['dupa']]), [
    ['sup', { stare: 'nou' }, { stare: 'rezolvat' }], ['own', { stare: 'rezolvat' }, { stare: 'deschis' }],
  ]);
});

test('raportările mele: doar ale omului, cele mai noi întâi, cu răspunsurile fără cine le-a scris; citirea, doar a autorului', async () => {
  const vechi = await raporteaza('ana', { text: 'Prima' });
  const nou = await raporteaza('ana', { fel: 'idee', text: 'A doua' });
  await raporteaza('ion', { text: 'A lui Ion' });
  await fa('sup', { actiune: 'raspunde', id: vechi.id, versiune: 1, text: 'Rezolvat în versiunea nouă.' });
  const m = await mele('ana');
  assert.deepEqual(m.raportari.map((x) => [x.text, x.fel, x.stare, x.necitite]), [['A doua', 'idee', 'nou', 0], ['Prima', 'problema', 'deschis', 1]]);
  assert.deepEqual(m.raportari[1]?.raspunsuri.map((x) => Object.keys(x).sort()), [['la', 'text']], 'fără cine a răspuns');
  assert.equal(m.raportari[1]?.raspunsuri[0]?.text, 'Rezolvat în versiunea nouă.');
  assert.equal(m.necitite, 1);
  assert.equal(await raportariNecitite(db, 'ana'), 1);
  assert.deepEqual((await mele('neconfirmat')).raportari, []);
  // Citirea: altcineva (chiar personalul) nu; autorul da, fără să mute versiunea; a doua oară nu mai scrie.
  for (const uid of ['ion', 'sup']) assert.equal(await cod(fa(uid, { actiune: 'citit', id: vechi.id })), 'permission-denied', uid);
  assert.equal(await cod(fa('ana', { actiune: 'citit', id: 'x' })), 'invalid-argument');
  assert.deepEqual(await fa('ana', { actiune: 'citit', id: vechi.id }), { ok: true, id: vechi.id, schimbat: true, versiune: 2 });
  assert.deepEqual(await fa('ana', { actiune: 'citit', id: vechi.id }), { ok: true, id: vechi.id, schimbat: false, versiune: 2 });
  assert.equal((await tichetul(vechi.id))['necititeAutor'], 0);
  assert.equal(await raportariNecitite(db, 'ana'), 0);
  // Un răspuns pornit pe versiunea de dinaintea citirii trece: citirea nu l-a încurcat.
  await fa('sup', { actiune: 'raspunde', id: vechi.id, versiune: 2, text: 'Încă ceva.' });
  assert.equal((await tichetul(nou.id))['necititeAutor'], 0);
});

test('semnul din meniul contului: deschiderea contului spune câte raportări au un răspuns necitit', async () => {
  const r = await raporteaza('ana');
  const deschide = async () => (await trateazaContul(db, 'ana', { email: 'ana@exemplu.ro', email_verified: true }, { actiune: 'deschide' }, new Date(ceas += 1000))) as { raportariNecitite?: number };
  assert.equal((await deschide()).raportariNecitite, 0);
  await fa('sup', { actiune: 'raspunde', id: r.id, versiune: 1, text: 'Gata.' });
  assert.equal((await deschide()).raportariNecitite, 1);
  await fa('ana', { actiune: 'citit', id: r.id });
  assert.equal((await deschide()).raportariNecitite, 0);
});
