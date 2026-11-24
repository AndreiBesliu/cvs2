import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { oraFerestrei } from '../../shared/erori.ts';
import {
  LOTURI_PE_ORA, PAGINA_CRONOLOGIE, SETARI_UTILIZARE_IMPLICITE, setariPublice, type RaspunsCronologie, type RaspunsLot, type RaspunsSetariUtilizare,
  type SetariUtilizare,
} from '../../shared/utilizare.ts';
import { COLECTIE_AUDIT } from '../src/audit.ts';
import { trateazaUtilizarea } from '../src/utilizare/actiuni.ts';

/**
 * Utilizarea aplicației (ADR 0262, felia A.8a) pe emulatorul Firestore. Lotul: doar cu contul deschis sau din personal, refăcut
 * după lista albă (evenimentele cu altceva aruncate, numărate), cu ora începutului sesiunii, planul, ștergerea singură după
 * zilele din setări; o reîncercare nu scrie a doua oară și nu numără; plafonul pe oră; colectarea oprită nu scrie nimic.
 * Setările: doar owner-ul, întregi și în margini, pe versiunea văzută, cu auditul; neschimbate nu scriu.
 */

const PROIECT = 'demo-cncvs2';
const gazda = process.env['FIRESTORE_EMULATOR_HOST'];
if (!gazda) throw new Error('FIRESTORE_EMULATOR_HOST lipsește: testele rulează prin npm run test:emulator');
process.env['GCLOUD_PROJECT'] ??= PROIECT;
if (getApps().length === 0) initializeApp({ projectId: PROIECT });
const db = getFirestore();

const T0 = Date.UTC(2026, 10, 23, 18, 0);
const ZI = 86_400_000;
const TOT = 'RTot0000000000000000';

beforeEach(async () => {
  assert.equal((await fetch(`http://${gazda}/emulator/v1/projects/${PROIECT}/databases/(default)/documents`, { method: 'DELETE' })).status, 200);
  await db.doc('staff/own').set({ rol: 'owner' });
  await db.doc(`roluri/${TOT}`).set({ nume: 'Tot', permisiuni: ['erori.citeste', 'audit.citeste', 'conturi.administreaza', 'tichete.raspunde'] });
  await db.doc('staff/tot').set({ rol: TOT });
  await db.doc('conturi/ana').set({ email: 'ana@exemplu.ro', plan: 'proba' });
  await db.doc('conturi/ion').set({ email: 'ion@exemplu.ro', plan: 'gratuit' });
});

const cod = async (p: Promise<unknown>): Promise<string> => {
  try {
    await p;
    return 'fără eroare';
  } catch (e) {
    return e instanceof HttpsError ? e.code : `altceva: ${String(e)}`;
  }
};
const fa = (uid: string | null, data: unknown, acum = T0) => trateazaUtilizarea(db, uid, data, new Date(acum));
const CONTEXT = { versiune: 'ed4c30c777de', limba: 'ro', aranjament: 'insule', tema: 'deschisa', ecran: 'laptop', browser: 'edge', atingere: false, online: true };
const ACTIUNE = { fel: 'actiune', t: 1_000, id: 'document.roteste', de: 'bara', rez: 'ok' };
const DIALOG = { fel: 'dialog', t: 50_000, id: 'export', rez: 'renuntat' };
const lot = (extra: Record<string, unknown> = {}) => ({ sesiune: 'k3j9x0a1b2c3d4e5', nr: 1, acum: 60_000, context: CONTEXT, evenimente: [ACTIUNE, DIALOG], ...extra });
const trimite = (uid: string | null, l: unknown = lot(), acum = T0) => fa(uid, { actiune: 'lot', lot: l }, acum) as Promise<RaspunsLot>;
const loturi = async (): Promise<Array<Record<string, unknown> & { id: string }>> => (await db.collection('utilizare').get()).docs.map((d) => ({ ...d.data(), id: d.id }));
const ms = (x: unknown): number => (x as Timestamp).toMillis();
const audit = async () => (await db.collection(COLECTIE_AUDIT).orderBy('cand').get()).docs.map((d) => d.data());
const setari = (uid: string | null, s: unknown, versiune: unknown = 0, acum = T0) => fa(uid, { actiune: 'setari', setari: s, versiune }, acum) as Promise<RaspunsSetariUtilizare>;
const PUBLICE = setariPublice(SETARI_UTILIZARE_IMPLICITE);

test('lotul unui client: refăcut după lista albă, cu ora sesiunii, planul și ștergerea singură după 90 de zile', async () => {
  const strain = { ...ACTIUNE, t: 2_000, text: 'Bună ziua, Ana' };
  assert.deepEqual(await trimite('ana', lot({ evenimente: [ACTIUNE, strain, { fel: 'tastare', t: 3, tasta: 'a' }, DIALOG] })), { ok: true, scris: true, setari: PUBLICE });
  const [l, ...altele] = await loturi();
  assert.equal(altele.length, 0);
  assert.ok(l);
  assert.equal(l.id, 'k3j9x0a1b2c3d4e5-1');
  assert.deepEqual(
    [l['schema'], l['uid'], l['sesiune'], l['nr'], l['instanta'], l['plan'], l['personal'], l['aruncate'], l['context'], l['evenimente']],
    [1, 'ana', 'k3j9x0a1b2c3d4e5', 1, 'local', 'proba', false, 2, CONTEXT, [ACTIUNE, DIALOG]],
  );
  assert.equal(ms(l['primit']), T0);
  assert.equal(ms(l['inceput']), T0 - 60_000);
  assert.equal(ms(l['expiraLa']), T0 + 90 * ZI);
  assert.equal(JSON.stringify(l).includes('Bună ziua'), false, 'nimic din evenimentul aruncat nu e păstrat');
  assert.equal((await audit()).length, 0, 'un lot nu e o acțiune a personalului: fără audit');
});

test('clicurile fine, derularea și zoom-ul (felia A.8c) se scriu ca celelalte, după lista albă', async () => {
  const CLIC = { fel: 'clic', t: 2_000, id: 'testid.export-gcode', de: 'bara', n: 2 };
  const ZOOM = { fel: 'zoom', t: 3_000, de: 'panza', n: 4 };
  const DERULARE = { fel: 'derulare', t: 4_000, de: 'panou', n: 1 };
  assert.equal((await trimite('ana', lot({ evenimente: [CLIC, ZOOM, DERULARE, { ...ZOOM, n: 0 }] }))).scris, true);
  const [l] = await loturi();
  assert.deepEqual([l?.['evenimente'], l?.['aruncate']], [[CLIC, ZOOM, DERULARE], 1]);
});

test('calculele, mașina și imprimanta (felia A.8d) se scriu după lista albă: treptele, fără valori, nume sau adrese', async () => {
  const CALCUL = { fel: 'calcul', t: 2_000, id: 'export', ms: 3_000, rez: 'ok', forme: 100 };
  const IMPORT = { fel: 'calcul', t: 2_100, id: 'import', ms: 300, rez: 'ok', octeti: 10_000, format: 'svg' };
  const MASINA = { fel: 'masina', t: 3_000, id: 'alarma', cod: 9 };
  const IMPRIMANTA = { fel: 'imprimanta', t: 4_000, id: 'legata' };
  const rele = [{ ...CALCUL, ms: 2_345 }, { ...IMPORT, nume: 'bucatarie.svg' }, { ...MASINA, adresa: '192.168.1.10' }, { ...IMPRIMANTA, cod: 1 }];
  assert.equal((await trimite('ana', lot({ evenimente: [CALCUL, IMPORT, MASINA, IMPRIMANTA, ...rele] }))).scris, true);
  const [l] = await loturi();
  assert.deepEqual([l?.['evenimente'], l?.['aruncate']], [[CALCUL, IMPORT, MASINA, IMPRIMANTA], rele.length]);
});

test('personalul fără cont de client: lotul e scris, cu `personal` și fără plan', async () => {
  assert.equal((await trimite('tot')).scris, true);
  const [l] = await loturi();
  assert.deepEqual([l?.['uid'], l?.['plan'], l?.['personal']], ['tot', null, true]);
});

test('fără logare sau fără cont deschis: refuzat, nimic scris; un lot greșit, refuzat la fel', async () => {
  assert.equal(await cod(trimite(null)), 'unauthenticated');
  assert.equal(await cod(trimite('strain')), 'permission-denied');
  for (const l of [null, 'lot', lot({ sesiune: 'scurt' }), lot({ context: { ...CONTEXT, email: 'ana@exemplu.ro' } }), lot({ evenimente: Array.from({ length: 201 }, () => ACTIUNE) })]) {
    assert.equal(await cod(trimite('ana', l)), 'invalid-argument', JSON.stringify(l).slice(0, 60));
  }
  assert.equal(await cod(fa('ana', { actiune: 'altceva' })), 'invalid-argument');
  assert.equal((await loturi()).length, 0);
  assert.equal((await db.collection('limiteUtilizare').get()).size, 0);
});

test('o reîncercare a aceluiași lot nu scrie a doua oară și nu se numără la plafon', async () => {
  assert.equal((await trimite('ana')).scris, true);
  assert.deepEqual(await trimite('ana', lot(), T0 + 5_000), { ok: true, scris: false, setari: PUBLICE });
  assert.equal((await trimite('ana', lot({ nr: 2, acum: 70_000 }), T0 + 10_000)).scris, true);
  assert.deepEqual((await loturi()).map((l) => l.id), ['k3j9x0a1b2c3d4e5-1', 'k3j9x0a1b2c3d4e5-2']);
  const limita = await db.doc(`limiteUtilizare/ana_${oraFerestrei(T0)}`).get();
  assert.equal(limita.get('numar'), 2);
  assert.equal(ms(limita.get('expiraLa')), (oraFerestrei(T0) + 1) * 3_600_000 + ZI);
});

test('plafonul: cel mult LOTURI_PE_ORA loturi pe cont într-o oră; ora următoare, iar; alt cont, neatins', async () => {
  const ora = oraFerestrei(T0);
  await db.doc(`limiteUtilizare/ana_${ora}`).set({ numar: LOTURI_PE_ORA - 1, ora });
  assert.equal((await trimite('ana', lot({ nr: 1 }))).scris, true);
  assert.equal(await cod(trimite('ana', lot({ nr: 2 }))), 'resource-exhausted');
  assert.equal((await trimite('ion', lot({ sesiune: 'ion0000000000000', nr: 1 }))).scris, true);
  assert.equal((await trimite('ana', lot({ nr: 3 }), (ora + 1) * 3_600_000)).scris, true);
  assert.deepEqual((await loturi()).map((l) => l.id).sort(), ['ion0000000000000-1', 'k3j9x0a1b2c3d4e5-1', 'k3j9x0a1b2c3d4e5-3']);
});

test('colectarea oprită din Setări: lotul nu e scris, nici numărat; editorul află; păstrarea nouă se aplică de la schimbare', async () => {
  const oprita: SetariUtilizare = { ...SETARI_UTILIZARE_IMPLICITE, colectare: false, lotMinute: 15 };
  assert.deepEqual(await setari('own', oprita), { ok: true, schimbat: true, versiune: 1 });
  assert.deepEqual(await trimite('ana'), { ok: true, scris: false, setari: setariPublice(oprita) });
  assert.equal((await loturi()).length, 0);
  assert.equal((await db.collection('limiteUtilizare').get()).size, 0);
  const pornita: SetariUtilizare = { ...oprita, colectare: true, zileEvenimente: 30 };
  assert.deepEqual(await setari('own', pornita, 1), { ok: true, schimbat: true, versiune: 2 });
  assert.equal((await trimite('ana')).scris, true);
  assert.equal(ms((await loturi())[0]?.['expiraLa']), T0 + 30 * ZI);
});

test('un lot gol (editorul întreabă setările, cu colectarea oprită) nu se scrie și nu se numără; unul doar cu evenimente aruncate, da', async () => {
  assert.deepEqual(await trimite('ana', lot({ evenimente: [] })), { ok: true, scris: false, setari: PUBLICE });
  assert.equal((await loturi()).length, 0);
  assert.equal((await db.collection('limiteUtilizare').get()).size, 0);
  // Evenimentele aruncate (un client stricat) se văd: lotul se scrie, gol, cu numărul lor.
  assert.equal((await trimite('ana', lot({ nr: 2, evenimente: [{ ...ACTIUNE, text: 'x' }] }))).scris, true);
  const [l] = await loturi();
  assert.deepEqual([l?.['evenimente'], l?.['aruncate']], [[], 1]);
});

test('setările: doar owner-ul, pe versiunea văzută; neschimbate nu scriu; auditul cu cele dinainte și cele de după', async () => {
  const a: SetariUtilizare = { ...SETARI_UTILIZARE_IMPLICITE, clicuri: false, pasiEroare: 10 };
  const b: SetariUtilizare = { ...a, zileSume: 365 };
  for (const uid of ['tot', 'ana']) assert.equal(await cod(setari(uid, a)), 'permission-denied', uid);
  assert.equal(await cod(setari(null, a)), 'unauthenticated');
  // Implicitele peste niciun document: nimic de scris (sunt deja cele în vigoare).
  assert.deepEqual(await setari('own', SETARI_UTILIZARE_IMPLICITE), { ok: true, schimbat: false, versiune: 0 });
  assert.deepEqual(await setari('own', a), { ok: true, schimbat: true, versiune: 1 });
  const d = (await db.doc('setari/utilizare').get()).data();
  assert.deepEqual({ ...d, modificatLa: ms(d?.['modificatLa']) }, { schema: 1, ...a, versiune: 1, modificatLa: T0, modificatDe: 'own' });
  assert.equal(await cod(setari('own', b, 0)), 'failed-precondition');
  assert.deepEqual(await setari('own', { ...a }, 1), { ok: true, schimbat: false, versiune: 1 });
  // O oră mai târziu: auditul se citește în ordinea lui `cand`.
  assert.deepEqual(await setari('own', b, 1, T0 + 3_600_000), { ok: true, schimbat: true, versiune: 2 });
  assert.deepEqual((await audit()).map((x) => [x['cine'], x['rol'], x['actiune'], x['tinta'], x['inainte'], x['dupa']]), [
    ['own', 'owner', 'setari.utilizare', 'setari/utilizare', null, a],
    ['own', 'owner', 'setari.utilizare', 'setari/utilizare', a, b],
  ]);
});

test('setările: în afara marginilor, incomplete sau cu altceva, refuzate fără nicio scriere', async () => {
  const rele: unknown[] = [
    null, 'toate', { ...SETARI_UTILIZARE_IMPLICITE, lotMinute: 0 }, { ...SETARI_UTILIZARE_IMPLICITE, zileEvenimente: 366 },
    { ...SETARI_UTILIZARE_IMPLICITE, zileSume: 89 }, { ...SETARI_UTILIZARE_IMPLICITE, pasiEroare: 101 },
    { ...SETARI_UTILIZARE_IMPLICITE, colectare: 'da' }, { ...SETARI_UTILIZARE_IMPLICITE, altceva: 1 }, { colectare: true },
  ];
  for (const s of rele) assert.equal(await cod(setari('own', s)), 'invalid-argument', JSON.stringify(s));
  for (const v of [-1, 1.5, '0', null]) assert.equal(await cod(setari('own', SETARI_UTILIZARE_IMPLICITE, v)), 'invalid-argument', String(v));
  assert.equal((await db.doc('setari/utilizare').get()).exists, false);
  assert.equal((await audit()).length, 0);
});

test('cronologia unui om (A.11c): doar cu „Utilizare: sesiuni”; cele mai noi întâi, pe pagini; doar contul cerut; fiecare citire în audit', async () => {
  const SES = 'RSesiuni00000000000a';
  await db.doc(`roluri/${SES}`).set({ nume: 'Sesiuni', permisiuni: ['utilizare.sesiuni'] });
  await db.doc('staff/ses').set({ rol: SES });
  // Ana: 23 de loturi în două sesiuni, la câte un minut; Ion: unul.
  for (let i = 0; i < 23; i++) {
    const sesiune = i < 10 ? 'anaaaaaaaaaaaaa1' : 'anaaaaaaaaaaaaa2';
    assert.equal((await trimite('ana', lot({ sesiune, nr: i < 10 ? i + 1 : i - 9 }), T0 + i * 60_000)).scris, true);
  }
  assert.equal((await trimite('ion', lot({ sesiune: 'ionnnnnnnnnnnnn1' }), T0)).scris, true);
  let clipa = T0 + ZI;
  const cron = (cine: string, cerere: Record<string, unknown>) => fa(cine, { actiune: 'cronologie', ...cerere }, clipa += 1_000) as Promise<RaspunsCronologie>;

  // Fără permisiune (nici „Tot”, care are alte patru), refuzat; owner-ul o are.
  assert.equal(await cod(cron('tot', { uid: 'ana' })), 'permission-denied');
  assert.equal(await cod(cron('ana', { uid: 'ana' })), 'permission-denied');
  assert.equal(await cod(cron('ses', { uid: '../ana' })), 'invalid-argument');
  assert.equal(await cod(cron('ses', { uid: 'ana', pana: -5 })), 'invalid-argument');
  const p1 = await cron('ses', { uid: 'ana' });
  assert.equal(p1.loturi.length, PAGINA_CRONOLOGIE);
  assert.equal(p1.maiVechi, true);
  assert.deepEqual([p1.loturi[0]?.sesiune, p1.loturi[0]?.nr], ['anaaaaaaaaaaaaa2', 13]);
  assert.ok(p1.loturi.every((l, i, a) => i === 0 || (a[i - 1]?.primit ?? 0) > l.primit), 'cele mai noi întâi');
  assert.deepEqual(p1.loturi[0]?.evenimente, [ACTIUNE, DIALOG]);
  assert.deepEqual(p1.loturi[0]?.context, CONTEXT);
  assert.equal(p1.loturi[0]?.inceput, (p1.loturi[0]?.primit ?? 0) - 60_000);
  const p2 = await cron('ses', { uid: 'ana', pana: p1.loturi.at(-1)?.primit });
  assert.deepEqual(p2.loturi.map((l) => l.nr), [3, 2, 1]);
  assert.equal(p2.maiVechi, false);
  // Un lot scris altfel (o schemă veche, un eveniment stricat): evenimentul din afara listei de azi nu pleacă, numărat la aruncate.
  await db.doc('utilizare/ionnnnnnnnnnnnn1-2').set({
    schema: 1, uid: 'ion', sesiune: 'ionnnnnnnnnnnnn1', nr: 2, primit: Timestamp.fromMillis(T0 + 60_000), inceput: Timestamp.fromMillis(T0),
    context: CONTEXT, evenimente: [ACTIUNE, { fel: 'actiune', t: 2, id: 'document.roteste', de: 'bara', rez: 'ok', geometrie: [1, 2] }], aruncate: 0,
  });
  const ion = await cron('own', { uid: 'ion' });
  assert.deepEqual(ion.loturi.map((l) => [l.nr, l.evenimente.length, l.aruncate]), [[2, 1, 1], [1, 2, 0]]);
  assert.ok(!JSON.stringify(ion).includes('geometrie'));
  assert.deepEqual((await cron('own', { uid: 'nimeni' })).loturi, []);
  // Doar o sesiune (cea a unei raportări, A.11d): loturile ei, ale contului cerut; o sesiune cu altă formă, refuzată.
  const doar = await cron('ses', { uid: 'ana', sesiune: 'anaaaaaaaaaaaaa1' });
  assert.deepEqual(doar.loturi.map((l) => l.nr), [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
  assert.deepEqual((await cron('ses', { uid: 'ion', sesiune: 'anaaaaaaaaaaaaa1' })).loturi, []);
  assert.equal(await cod(cron('ses', { uid: 'ana', sesiune: 'x' })), 'invalid-argument');
  // Auditul: cine, al cui, câte loturi (refuzurile nu scriu).
  const a = (await audit()).filter((x) => x['actiune'] === 'utilizare.cronologie');
  assert.deepEqual(a.map((x) => [x['cine'], x['tinta'], (x['dupa'] as Record<string, unknown>)['loturi']]), [
    ['ses', 'utilizare/ana', 20], ['ses', 'utilizare/ana', 3], ['own', 'utilizare/ion', 2], ['own', 'utilizare/nimeni', 0],
    ['ses', 'utilizare/ana', 10], ['ses', 'utilizare/ion', 0],
  ]);
});
