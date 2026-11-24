import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { estimeaza, P_OAMENI, schitaDin, schitaNoua } from '../../shared/utilizareZi.ts';
import { agregaUtilizarea, PAGINA_LOTURI } from '../src/utilizare/agregare.ts';

/**
 * Jobul de noapte al utilizării (ADR 0262 §5, felia A.9a) pe emulatorul Firestore: ieri și alaltăieri, în fusul României, după
 * ora primirii lotului (miezul nopții local, nu UTC); segmentele; paginile (mai multe loturi decât o pagină); sumele scrise
 * din nou la o rulare repetată; ștergerea singură după zilele din setări; nimic din conturi în sume; zilele mai vechi, neatinse.
 */

const PROIECT = 'demo-cncvs2';
const gazda = process.env['FIRESTORE_EMULATOR_HOST'];
if (!gazda) throw new Error('FIRESTORE_EMULATOR_HOST lipsește: testele rulează prin npm run test:emulator');
process.env['GCLOUD_PROJECT'] ??= PROIECT;
if (getApps().length === 0) initializeApp({ projectId: PROIECT });
const db = getFirestore();
const ZI = 86_400_000;

beforeEach(async () => {
  assert.equal((await fetch(`http://${gazda}/emulator/v1/projects/${PROIECT}/databases/(default)/documents`, { method: 'DELETE' })).status, 200);
});

const ACTIUNE = { fel: 'actiune', t: 1_000, id: 'document.roteste', de: 'bara', rez: 'ok' };
const DIALOG = { fel: 'dialog', t: 50_000, id: 'export', rez: 'renuntat' };
let nr = 0;
async function lot(uid: string, primit: string, extra: Record<string, unknown> = {}): Promise<void> {
  nr++;
  await db.doc(`utilizare/s${String(nr).padStart(15, '0')}-1`).set({
    schema: 1, uid, sesiune: `s${String(nr).padStart(15, '0')}`, nr: 1, instanta: 'local', plan: 'proba', personal: false,
    primit: Timestamp.fromDate(new Date(primit)), inceput: Timestamp.fromMillis(Date.parse(primit) - 60_000), context: {},
    evenimente: [ACTIUNE, DIALOG], aruncate: 0, expiraLa: Timestamp.fromMillis(Date.parse(primit) + 90 * ZI), ...extra,
  });
}
const zi = async (z: string): Promise<Record<string, unknown> | undefined> => (await db.doc(`utilizareZi/${z}`).get()).data();
const segment = (d: Record<string, unknown> | undefined, s: 'clienti' | 'personal'): Record<string, unknown> =>
  ((d?.['segmente'] as Record<string, unknown> | undefined)?.[s] ?? {}) as Record<string, unknown>;

test('ieri și alaltăieri, după ora României a primirii: segmentele, sumele, ștergerea după zilele din setări; ziua dinainte, neatinsă', async () => {
  await db.doc('setari/utilizare').set({ schema: 1, colectare: true, zileSume: 100, versiune: 1 });
  // Alaltăieri (22.11): ziua întreagă, până la 23:59:59 ora României (21:59:59 UTC).
  await lot('ana', '2026-11-22T10:00:00Z');
  await lot('ion', '2026-11-22T21:59:59Z');
  // Ieri (23.11) începe la 22:00 UTC din 22.11; un lot din personal.
  await lot('ana', '2026-11-22T22:00:00Z');
  await lot('owner', '2026-11-23T12:00:00Z', { personal: true, evenimente: [ACTIUNE] });
  // 21.11 și azi (24.11): nu se recalculează.
  await lot('ana', '2026-11-21T12:00:00Z');
  await lot('ana', '2026-11-23T22:30:00Z');
  const acum = new Date('2026-11-23T23:00:00Z');
  const r = await agregaUtilizarea(db, acum);
  assert.deepEqual(r, { zile: { '2026-11-22': { loturi: 2, sarite: 0 }, '2026-11-23': { loturi: 2, sarite: 0 } }, zileSume: 100 });
  const z22 = await zi('2026-11-22');
  const c22 = segment(z22, 'clienti');
  assert.deepEqual([z22?.['zi'], c22['loturi'], c22['evenimente'], c22['sesiuni']], ['2026-11-22', 2, 4, 2]);
  assert.deepEqual((c22['actiuni'] as Record<string, Record<string, unknown>>)['document.roteste']?.['n'], 2);
  assert.deepEqual(c22['dialoguri'], { export: { deschis: 0, gata: 0, renuntat: 2 } });
  assert.equal(Math.round(estimeaza(schitaDin(c22['oameni'], P_OAMENI) ?? schitaNoua(P_OAMENI))), 2);
  assert.equal(segment(z22, 'personal')['loturi'], 0);
  // Se șterge singur la 100 de zile de la capătul zilei (23.11, 00:00 în România: 22.11, 22:00 UTC).
  assert.equal((z22?.['expiraLa'] as Timestamp).toMillis(), Date.parse('2026-11-22T22:00:00Z') + 100 * ZI);
  assert.equal((z22?.['calculatLa'] as Timestamp).toMillis(), acum.getTime());
  const z23 = await zi('2026-11-23');
  assert.deepEqual([segment(z23, 'clienti')['loturi'], segment(z23, 'personal')['loturi'], segment(z23, 'personal')['evenimente']], [1, 1, 1]);
  assert.equal(await zi('2026-11-21'), undefined);
  assert.equal(await zi('2026-11-24'), undefined);
  // Nimic din conturi.
  const text = JSON.stringify([z22, z23]);
  for (const u of ['ana', 'ion', 'owner']) assert.ok(!text.includes(`"${u}"`), u);
  // O rulare repetată (aceeași noapte): aceleași sume.
  await agregaUtilizarea(db, new Date(acum.getTime() + 60_000));
  const { calculatLa: _a, ...inainte } = z22 ?? {};
  const { calculatLa: _b, ...dupa } = (await zi('2026-11-22')) ?? {};
  assert.deepEqual(dupa, inainte);
});

test('mai multe loturi decât o pagină: toate numărate; un lot fără forma lui se sare, numărat; fără setări, păstrarea implicită', async () => {
  const n = PAGINA_LOTURI + 3;
  const scrieri = db.batch();
  for (let i = 0; i < n; i++) {
    const id = `p${String(i).padStart(15, '0')}`;
    scrieri.set(db.doc(`utilizare/${id}-1`), {
      schema: 1, uid: `om${i % 7}`, sesiune: id, nr: 1, personal: false, primit: Timestamp.fromDate(new Date(Date.parse('2026-11-23T08:00:00Z') + i)),
      evenimente: [ACTIUNE], aruncate: 0,
    });
  }
  await scrieri.commit();
  await db.doc('utilizare/stricat-1').set({ schema: 1, uid: 42, primit: Timestamp.fromDate(new Date('2026-11-23T09:00:00Z')), evenimente: 'nu' });
  const r = await agregaUtilizarea(db, new Date('2026-11-24T01:00:00Z'));
  assert.deepEqual((r['zile'] as Record<string, unknown>)['2026-11-23'], { loturi: n, sarite: 1 });
  assert.equal(r['zileSume'], 730);
  const c = segment(await zi('2026-11-23'), 'clienti');
  assert.deepEqual([c['loturi'], c['sesiuni'], (c['actiuni'] as Record<string, Record<string, unknown>>)['document.roteste']?.['n']], [n, n, n]);
  assert.equal(Math.round(estimeaza(schitaDin(c['oameni'], P_OAMENI) ?? schitaNoua(P_OAMENI))), 7);
});
