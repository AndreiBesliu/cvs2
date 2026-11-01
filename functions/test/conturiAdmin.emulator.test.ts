import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { CAPABILITATI } from '../../shared/capabilitati.ts';
import { ZI_MS, ZILE_PROBA, type RaspunsDeschide } from '../../shared/conturi.ts';
import type { RaspunsPlan, RaspunsSetari, SchimbarePlan } from '../../shared/conturiPlan.ts';
import { COLECTIE_AUDIT } from '../src/audit.ts';
import { trateazaContul, type TokenCont } from '../src/conturi/actiuni.ts';
import { administreazaConturile } from '../src/conturi/admin.ts';

/**
 * Fila Utilizatori și fila Setări (ADR 0116 §19, §20; felia 14.C↑b) pe emulatorul Firestore: planul unui cont îl schimbă
 * doar cine are `conturi.administreaza` (și owner-ul), pe planul văzut; dreptul se calculează din nou și ajunge în aplicație
 * la deschidere; dezactivarea ține planul de dinainte, reactivarea îl pune la loc; personalul rămâne personal; setările le
 * schimbă doar owner-ul, în marginile lor. Fiecare schimbare are auditul ei; refuzurile și „nimic de schimbat” nu scriu nimic.
 */

const PROIECT = 'demo-cncvs2';
const gazda = process.env['FIRESTORE_EMULATOR_HOST'];
if (!gazda) throw new Error('FIRESTORE_EMULATOR_HOST lipsește: testele rulează prin npm run test:emulator');
process.env['GCLOUD_PROJECT'] ??= PROIECT;
if (getApps().length === 0) initializeApp({ projectId: PROIECT });
const db = getFirestore();

const T0 = new Date(Date.UTC(2026, 10, 1, 10, 0));
const P0 = T0.getTime() + ZILE_PROBA * ZI_MS;
const ROL_CIT = 'RContCit000000000000';
const ROL_ADM = 'RContAdm000000000000';
const ROL_ERORI = 'RErori00000000000000';
const FARA_OPRITE = CAPABILITATI.filter((c) => c !== 'export-gcode' && c !== 'masina');

beforeEach(async () => {
  assert.equal((await fetch(`http://${gazda}/emulator/v1/projects/${PROIECT}/databases/(default)/documents`, { method: 'DELETE' })).status, 200);
  await db.doc('staff/own').set({ rol: 'owner' });
  await db.doc(`roluri/${ROL_CIT}`).set({ nume: 'Conturi: citește', permisiuni: ['conturi.citeste'] });
  await db.doc(`roluri/${ROL_ADM}`).set({ nume: 'Conturi: administrează', permisiuni: ['conturi.administreaza'] });
  await db.doc(`roluri/${ROL_ERORI}`).set({ nume: 'Erori', permisiuni: ['erori.citeste'] });
  await db.doc('staff/cit').set({ rol: ROL_CIT });
  await db.doc('staff/adm').set({ rol: ROL_ADM });
  await db.doc('staff/sup').set({ rol: ROL_ERORI });
});

const cod = async (p: Promise<unknown>): Promise<string> => {
  try {
    await p;
    return 'fără eroare';
  } catch (e) {
    return e instanceof HttpsError ? e.code : `altceva: ${String(e)}`;
  }
};
const token = (email: string): TokenCont => ({ email, email_verified: true });
const deschide = async (uid: string, acum = T0) => {
  const r = await trateazaContul(db, uid, token(`${uid}@exemplu.ro`), { actiune: 'deschide' }, acum) as RaspunsDeschide;
  assert.equal(r.verificat, true);
  return (r as Extract<RaspunsDeschide, { verificat: true }>).drept;
};
const cont = async (uid: string) => (await db.doc(`conturi/${uid}`).get()).data() ?? {};
const audit = async () => (await db.collection(COLECTIE_AUDIT).orderBy('cand').get()).docs.map((d) => d.data());
/** Planul văzut, cum îl trimite pagina: din documentul de acum. */
const vazut = async (uid: string) => {
  const c = await cont(uid);
  return { plan: typeof c['plan'] === 'string' ? c['plan'] : null, probaPana: c['probaPana'] instanceof Timestamp ? c['probaPana'].toMillis() : null };
};
const plan = async (cine: string | null, uid: string, schimbare: SchimbarePlan, acum = T0, vazutAltul?: unknown) =>
  administreazaConturile(db, cine, { actiune: 'plan', uid, schimbare, vazut: vazutAltul ?? await vazut(uid) }, acum) as Promise<RaspunsPlan>;
const setari = (cine: string | null, s: unknown, acum = T0) => administreazaConturile(db, cine, { actiune: 'setari', setari: s }, acum) as Promise<RaspunsSetari>;
const ms = (x: unknown): number | null => (x instanceof Timestamp ? x.toMillis() : null);

test('fără drept nimic: neconectat, doar citirea conturilor, un rol fără conturi, un om din afară; nimic scris', async () => {
  await deschide('ana');
  const inainte = await cont('ana');
  const auditInainte = (await audit()).length;
  assert.equal(await cod(plan(null, 'ana', { fel: 'gratuit' })), 'unauthenticated');
  for (const cine of ['cit', 'sup', 'ana', 'nimeni']) assert.equal(await cod(plan(cine, 'ana', { fel: 'gratuit' })), 'permission-denied', cine);
  assert.deepEqual(await cont('ana'), inainte);
  assert.equal((await audit()).length, auditInainte);
});

test('planul gratuit (conturi.administreaza): planul ținut, dreptul cu toate capabilitățile, fără termen, auditul; deschiderea îl vede', async () => {
  await deschide('ana');
  const r = await plan('adm', 'ana', { fel: 'gratuit' });
  assert.equal(r.schimbat, true);
  assert.deepEqual(r.drept, { plan: 'gratuit', capabilitati: [...CAPABILITATI], pana: null, calculatLa: T0.getTime(), zileOffline: 7 });
  const c = await cont('ana');
  assert.deepEqual([c['plan'], ms(c['probaPana']), c['planInainte'], c['planSchimbatDe']], ['gratuit', P0, null, 'adm']);
  assert.deepEqual(c['drept'], r.drept);
  const a = (await audit()).filter((x) => x['actiune'] === 'conturi.gratuit');
  assert.equal(a.length, 1);
  assert.deepEqual([a[0]?.['cine'], a[0]?.['rol'], a[0]?.['tinta']], ['adm', ROL_ADM, 'conturi/ana']);
  assert.deepEqual(a[0]?.['inainte'], { plan: 'proba', probaPana: P0, inainte: null });
  assert.deepEqual(a[0]?.['dupa'], { plan: 'gratuit', probaPana: P0, inainte: null });
  // Proba ar fi trecut; gratuitul n-are termen: deschiderea de peste 30 de zile tot gratuit vede.
  assert.equal((await deschide('ana', new Date(T0.getTime() + 30 * ZI_MS))).plan, 'gratuit');
});

test('proba de N zile, de azi (și după una expirată); zilele în afara marginilor se refuză fără scriere', async () => {
  await deschide('ana');
  const t1 = new Date(T0.getTime() + 20 * ZI_MS);
  assert.equal((await deschide('ana', t1)).plan, 'expirat');
  const r = await plan('own', 'ana', { fel: 'proba', zile: 30 }, t1);
  assert.equal(r.schimbat, true);
  assert.deepEqual([r.drept.plan, r.drept.pana], ['proba', t1.getTime() + 30 * ZI_MS]);
  assert.equal(ms((await cont('ana'))['probaPana']), t1.getTime() + 30 * ZI_MS);
  assert.equal((await deschide('ana', new Date(t1.getTime() + 29 * ZI_MS))).plan, 'proba');
  const inainte = await cont('ana');
  for (const zile of [0, 366, 2.5, -3]) {
    const v = await vazut('ana');
    assert.equal(await cod(administreazaConturile(db, 'own', { actiune: 'plan', uid: 'ana', schimbare: { fel: 'proba', zile }, vazut: v }, t1)), 'invalid-argument', String(zile));
  }
  assert.deepEqual(await cont('ana'), inainte);
});

test('dezactivarea oprește exportul și senderul și ține planul de dinainte; reactivarea îl pune la loc; a doua dezactivare nu scrie nimic', async () => {
  // Fiecare pas la secunda lui: auditul se citește în ordinea lui `cand`, iar două rânduri cu aceeași oră n-au o ordine sigură.
  const la = (s: number): Date => new Date(T0.getTime() + s * 1000);
  await deschide('ana');
  await plan('adm', 'ana', { fel: 'gratuit' }, la(1));
  const dez = await plan('adm', 'ana', { fel: 'dezactiveaza' }, la(2));
  assert.deepEqual([dez.schimbat, dez.drept.plan, dez.drept.capabilitati], [true, 'dezactivat', FARA_OPRITE]);
  const c = await cont('ana');
  assert.equal(c['plan'], 'dezactivat');
  assert.deepEqual([c['planInainte']?.plan, ms(c['planInainte']?.probaPana)], ['gratuit', P0]);
  assert.equal((await deschide('ana')).plan, 'dezactivat');
  const nrAudit = (await audit()).length;
  const iar = await plan('adm', 'ana', { fel: 'dezactiveaza' }, la(3));
  assert.equal(iar.schimbat, false);
  assert.equal((await audit()).length, nrAudit, 'nimic de schimbat, nimic în audit');
  const re = await plan('own', 'ana', { fel: 'reactiveaza' }, la(4));
  assert.deepEqual([re.schimbat, re.drept.plan, re.drept.capabilitati], [true, 'gratuit', [...CAPABILITATI]]);
  assert.deepEqual([(await cont('ana'))['plan'], (await cont('ana'))['planInainte']], ['gratuit', null]);
  const actiuni = (await audit()).map((x) => x['actiune']).filter((x) => typeof x === 'string' && x.startsWith('conturi.') && x !== 'conturi.creeaza');
  assert.deepEqual(actiuni, ['conturi.gratuit', 'conturi.dezactiveaza', 'conturi.reactiveaza']);
  // Reactivarea unui cont activ nu scrie nimic.
  assert.equal((await plan('own', 'ana', { fel: 'reactiveaza' })).schimbat, false);
});

test('planul văzut vechi se refuză (alt plan, alt sfârșit al probei), fără scriere; același plan nu scrie nimic', async () => {
  await deschide('ana');
  const inainte = await cont('ana');
  assert.equal(await cod(plan('adm', 'ana', { fel: 'gratuit' }, T0, { plan: 'gratuit', probaPana: P0 })), 'failed-precondition');
  assert.equal(await cod(plan('adm', 'ana', { fel: 'gratuit' }, T0, { plan: 'proba', probaPana: P0 + 1 })), 'failed-precondition');
  assert.equal(await cod(plan('adm', 'ana', { fel: 'gratuit' }, T0, { plan: 'proba', probaPana: null })), 'failed-precondition');
  assert.deepEqual(await cont('ana'), inainte);
  await plan('adm', 'ana', { fel: 'gratuit' });
  const nrAudit = (await audit()).length;
  assert.equal((await plan('adm', 'ana', { fel: 'gratuit' })).schimbat, false);
  assert.equal((await audit()).length, nrAudit);
});

test('cererile stricate: contul lipsă (not-found), uid-ul, schimbarea, planul văzut, acțiunea (invalid-argument); nimic scris', async () => {
  const nrAudit = (await audit()).length;
  assert.equal(await cod(plan('own', 'nimeni', { fel: 'gratuit' }, T0, { plan: null, probaPana: null })), 'not-found');
  const v = { plan: null, probaPana: null };
  for (const uid of ['', 'a/b', 'x'.repeat(129), 7]) {
    assert.equal(await cod(administreazaConturile(db, 'own', { actiune: 'plan', uid, schimbare: { fel: 'gratuit' }, vazut: v }, T0)), 'invalid-argument', String(uid));
  }
  assert.equal(await cod(administreazaConturile(db, 'own', { actiune: 'plan', uid: 'ana', schimbare: { fel: 'expirat' }, vazut: v }, T0)), 'invalid-argument');
  assert.equal(await cod(administreazaConturile(db, 'own', { actiune: 'plan', uid: 'ana', schimbare: { fel: 'gratuit' } }, T0)), 'invalid-argument');
  assert.equal(await cod(administreazaConturile(db, 'own', { actiune: 'sterge', uid: 'ana' }, T0)), 'invalid-argument');
  assert.equal((await audit()).length, nrAudit);
});

test('personalul rămâne personal, oricare ar fi planul ținut (și dezactivat)', async () => {
  await deschide('sup');
  const r = await plan('own', 'sup', { fel: 'dezactiveaza' });
  assert.deepEqual([r.schimbat, r.drept.plan, r.drept.capabilitati], [true, 'personal', [...CAPABILITATI]]);
  assert.equal((await cont('sup'))['plan'], 'dezactivat');
  assert.equal((await deschide('sup')).plan, 'personal');
});

test('setările: doar owner-ul, întregi în margini, cu auditul; aceleași valori nu scriu nimic; deschiderea ia zilele offline noi', async () => {
  await deschide('ana');
  for (const cine of ['adm', 'cit', 'sup', 'ana']) assert.equal(await cod(setari(cine, { zileOffline: 3, zilePastrareTichete: 90 })), 'permission-denied', cine);
  assert.equal(await cod(setari(null, { zileOffline: 3, zilePastrareTichete: 90 })), 'unauthenticated');
  assert.equal((await db.doc('setari/conturi').get()).exists, false);
  const r = await setari('own', { zileOffline: 3, zilePastrareTichete: 90 });
  assert.deepEqual(r, { ok: true, schimbat: true, setari: { zileOffline: 3, zilePastrareTichete: 90 } });
  const s = (await db.doc('setari/conturi').get()).data() ?? {};
  assert.deepEqual([s['schema'], s['zileOffline'], s['zilePastrareTichete'], s['modificatDe'], ms(s['modificatLa'])], [1, 3, 90, 'own', T0.getTime()]);
  const a = (await audit()).filter((x) => x['actiune'] === 'setari.conturi');
  assert.deepEqual([a.length, a[0]?.['tinta'], a[0]?.['inainte'], a[0]?.['dupa']], [1, 'setari/conturi', null, { zileOffline: 3, zilePastrareTichete: 90 }]);
  assert.equal((await setari('own', { zileOffline: 3, zilePastrareTichete: 90 })).schimbat, false);
  assert.equal((await audit()).filter((x) => x['actiune'] === 'setari.conturi').length, 1, 'aceleași valori: niciun rând nou');
  assert.equal((await deschide('ana')).zileOffline, 3);
  for (const x of [
    { zileOffline: 0, zilePastrareTichete: 90 }, { zileOffline: 61, zilePastrareTichete: 90 }, { zileOffline: 3, zilePastrareTichete: 29 },
    { zileOffline: 3, zilePastrareTichete: 3651 }, { zileOffline: 3.5, zilePastrareTichete: 90 }, { zileOffline: 3 }, null,
  ]) assert.equal(await cod(setari('own', x)), 'invalid-argument', JSON.stringify(x));
  // O secundă mai târziu: auditul se citește în ordinea lui `cand`, iar două rânduri cu aceeași oră n-au o ordine sigură.
  await setari('own', { zileOffline: 7, zilePastrareTichete: 365 }, new Date(T0.getTime() + 1000));
  const ultimul = (await audit()).filter((x) => x['actiune'] === 'setari.conturi').at(-1);
  assert.deepEqual([ultimul?.['inainte'], ultimul?.['dupa']], [{ zileOffline: 3, zilePastrareTichete: 90 }, { zileOffline: 7, zilePastrareTichete: 365 }]);
});
