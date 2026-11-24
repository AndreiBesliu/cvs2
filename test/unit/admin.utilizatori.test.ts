import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CAPABILITATI } from '../../shared/capabilitati.ts';
import { intamplareDin } from '../../src/admin/carcasa/date.ts';
import { dataScurta, ziScurta } from '../../src/admin/erori/date.ts';
import { contDin, planAfisat } from '../../src/admin/utilizatori/date.ts';
import { cautaConturi, dreptScurt, FILTRE_PLAN, istoricPlan, numarPePlan, pePlan } from '../../src/admin/utilizatori/vedere.ts';

/** Fila Utilizatori (ADR 0116 §19), partea pură: documentele `conturi/{uid}` ca rânduri, planul de arătat, planul văzut. */

const ts = (iso: string) => ({ toDate: () => new Date(iso) });
const PANA = '2026-11-15T10:00:00.000Z';
const ACUM = Date.parse('2026-11-01T10:00:00.000Z');
const drept = (plan: string, zileOffline = 7) => ({ plan, capabilitati: [...CAPABILITATI], pana: null, calculatLa: ACUM, zileOffline });

test('contul: câmpurile documentului, planul ținut, planul văzut (în milisecunde, pentru server)', () => {
  const c = contDin('ana', {
    email: 'ana@exemplu.ro', nume: 'Ana', creatLa: ts('2026-10-31T09:00:00Z'), ultimaLogare: ts('2026-11-01T08:00:00Z'), plan: 'proba',
    probaPana: ts(PANA), drept: drept('proba'),
  });
  assert.deepEqual(
    [c.uid, c.email, c.nume, c.creatLa?.toISOString(), c.ultimaLogare?.toISOString(), c.plan, c.probaPana?.toISOString(), c.personal],
    ['ana', 'ana@exemplu.ro', 'Ana', '2026-10-31T09:00:00.000Z', '2026-11-01T08:00:00.000Z', 'proba', PANA, false],
  );
  assert.deepEqual(c.vazut, { plan: 'proba', probaPana: Date.parse(PANA) });
  // Disocierea (A.11e): doar data; fără ea, nedespărțit.
  assert.equal(c.disociatLa, null);
  assert.equal(contDin('ana', { disociatLa: ts('2026-11-24T08:00:00Z') }).disociatLa?.toISOString(), '2026-11-24T08:00:00.000Z');
  assert.equal(contDin('ana', { disociatLa: '2026-11-24' }).disociatLa, null);
});

test('ce lipsește e necunoscut: fără câmpuri, un plan ținut ciudat (văzut ca text, arătat ca expirat), un drept stricat (nu e personal)', () => {
  const gol = contDin('x', {});
  assert.deepEqual([gol.email, gol.nume, gol.creatLa, gol.ultimaLogare, gol.plan, gol.probaPana, gol.personal], [null, null, null, null, null, null, false]);
  assert.deepEqual(gol.vazut, { plan: null, probaPana: null });
  const ciudat = contDin('y', { plan: 'xyz', probaPana: 'mâine', email: '' });
  assert.deepEqual([ciudat.plan, ciudat.probaPana, ciudat.email], [null, null, null]);
  assert.deepEqual(ciudat.vazut, { plan: 'xyz', probaPana: null }, 'serverul compară cu valoarea din document, așa cum e');
  assert.equal(planAfisat(ciudat, ACUM), 'expirat');
  assert.equal(contDin('z', { plan: 'gratuit', drept: drept('personal', 0) }).personal, false, 'dreptul cu zilele offline în afara marginilor nu contează');
  assert.equal(contDin('z', { plan: 'gratuit', drept: 'personal' }).personal, false);
});

test('planul arătat: personalul (din ultimul drept) peste orice plan ținut; proba până la sfârșit, apoi expirată; gratuit și dezactivat', () => {
  const pers = contDin('p', { plan: 'dezactivat', drept: drept('personal') });
  assert.equal(pers.personal, true);
  assert.equal(planAfisat(pers, ACUM), 'personal');
  const proba = contDin('a', { plan: 'proba', probaPana: ts(PANA) });
  assert.equal(planAfisat(proba, ACUM), 'proba');
  assert.equal(planAfisat(proba, Date.parse(PANA) - 1), 'proba');
  assert.equal(planAfisat(proba, Date.parse(PANA)), 'expirat', 'la sfârșitul probei, expirată (ca pe server)');
  assert.equal(planAfisat(contDin('b', { plan: 'proba' }), ACUM), 'expirat', 'o probă fără sfârșit e expirată');
  assert.equal(planAfisat(contDin('c', { plan: 'gratuit', probaPana: ts('2020-01-01T00:00:00Z') }), ACUM), 'gratuit');
  assert.equal(planAfisat(contDin('d', { plan: 'dezactivat', probaPana: ts(PANA) }), ACUM), 'dezactivat');
});

/* ── Fila Utilizatori reproiectată (ADR 0260 §5, felia A.5): filtrele pe plan, căutarea, dreptul pe scurt, istoricul ── */

const ZI = 86_400_000;
const cont = (uid: string, d: Record<string, unknown> = {}) => contDin(uid, { email: `${uid}@exemplu.ro`, nume: uid.toUpperCase(), plan: 'gratuit', ...d });
const CONTURI = [
  cont('ana', { plan: 'proba', probaPana: ts(PANA) }),
  cont('bob', { plan: 'proba', probaPana: ts('2026-10-30T10:00:00Z') }),
  cont('cristi'),
  cont('dan', { plan: 'dezactivat' }),
  cont('eva', { plan: 'dezactivat', drept: drept('personal') }),
  cont('fane', { plan: 'proba', probaPana: ts('2026-11-02T09:00:00Z'), nume: 'Ștefan Țâru' }),
];

test('filtrele pe plan: numărul fiecăruia după planul arătat acum (proba trecută e expirată, personalul peste planul ținut), cu „toate”', () => {
  assert.deepEqual(FILTRE_PLAN, ['toate', 'proba', 'gratuit', 'expirat', 'dezactivat', 'personal']);
  assert.deepEqual(numarPePlan(CONTURI, ACUM), { toate: 6, proba: 2, gratuit: 1, expirat: 1, dezactivat: 1, personal: 1 });
  // A doua zi după sfârșitul probei lui Fane, el trece la expirate.
  assert.deepEqual(numarPePlan(CONTURI, Date.parse('2026-11-02T09:00:00Z')), { toate: 6, proba: 1, gratuit: 1, expirat: 2, dezactivat: 1, personal: 1 });
  assert.deepEqual(numarPePlan([], ACUM), { toate: 0, proba: 0, gratuit: 0, expirat: 0, dezactivat: 0, personal: 0 });
  assert.deepEqual(pePlan(CONTURI, 'toate', ACUM).map((c) => c.uid), ['ana', 'bob', 'cristi', 'dan', 'eva', 'fane'], 'ordinea citirii rămâne');
  assert.deepEqual(pePlan(CONTURI, 'proba', ACUM).map((c) => c.uid), ['ana', 'fane']);
  assert.deepEqual(pePlan(CONTURI, 'expirat', ACUM).map((c) => c.uid), ['bob']);
  assert.deepEqual(pePlan(CONTURI, 'dezactivat', ACUM).map((c) => c.uid), ['dan'], 'personalul dezactivat nu e la dezactivate');
  assert.deepEqual(pePlan(CONTURI, 'personal', ACUM).map((c) => c.uid), ['eva']);
});

test('căutarea în conturile încărcate: adresa, numele sau uid-ul, fără diacritice și majuscule; goală, toate', () => {
  const uid = (q: string): string[] => cautaConturi(CONTURI, q).map((c) => c.uid);
  assert.deepEqual(uid(''), ['ana', 'bob', 'cristi', 'dan', 'eva', 'fane']);
  assert.deepEqual(uid('   '), ['ana', 'bob', 'cristi', 'dan', 'eva', 'fane']);
  assert.deepEqual(uid('AN'), ['ana', 'dan', 'fane'], 'ana@…, dan@…, „Ștefan”');
  assert.deepEqual(uid('stefan tar'), ['fane'], 'numele, fără diacritice');
  assert.deepEqual(uid('ȘTEFAN'), ['fane']);
  assert.deepEqual(uid('cristi@exemplu'), ['cristi']);
  assert.deepEqual(uid('zzz'), []);
  // Un cont fără adresă și fără nume se găsește după uid.
  assert.deepEqual(cautaConturi([contDin('Uid123', {})], 'uid12').map((c) => c.uid), ['Uid123']);
});

test('dreptul pe scurt: gratuit fără termen, proba cu zilele rămase (rotunjite în sus), expirat de la sfârșitul probei; altfel nimic', () => {
  const [ana, bob, cristi, dan, eva, fane] = CONTURI;
  assert.ok(ana && bob && cristi && dan && eva && fane);
  assert.deepEqual(dreptScurt(ana, ACUM), { fel: 'zile', n: 14 });
  assert.deepEqual(dreptScurt(fane, ACUM), { fel: 'zile', n: 1 }, '23 de ore rămase: încă o zi');
  assert.deepEqual(dreptScurt(ana, Date.parse(PANA) - 1), { fel: 'zile', n: 1 });
  assert.deepEqual(dreptScurt(ana, Date.parse(PANA)), { fel: 'din', data: new Date(PANA) }, 'la sfârșitul probei, expirată');
  assert.deepEqual(dreptScurt(bob, ACUM), { fel: 'din', data: new Date('2026-10-30T10:00:00Z') });
  assert.deepEqual(dreptScurt(cristi, ACUM), { fel: 'nelimitat' });
  assert.equal(dreptScurt(dan, ACUM), null);
  assert.equal(dreptScurt(eva, ACUM), null, 'personalul are tot: fără termen de arătat');
  // Un sfârșit de probă ținut pe un cont dezactivat sau al personalului nu e un termen de arătat.
  assert.equal(dreptScurt(cont('d2', { plan: 'dezactivat', probaPana: ts('2026-10-30T10:00:00Z') }), ACUM), null);
  assert.equal(dreptScurt(cont('e2', { plan: 'proba', probaPana: ts('2026-10-30T10:00:00Z'), drept: drept('personal') }), ACUM), null);
  assert.equal(dreptScurt(contDin('x', { plan: 'xyz' }), ACUM), null, 'un plan necunoscut e expirat, fără dată');
});

test('istoricul planului: doar schimbările de plan din audit, cea mai nouă întâi; planul de după, cu sfârșitul probei; cine', () => {
  const rand = (id: string, cand: string | null, actiune: string, cine: string, rol: string | null, dupa: unknown) =>
    intamplareDin(id, { cand: cand === null ? null : ts(cand), actiune, tinta: 'conturi/ana', cine, rol, dupa }, 'eu');
  const pana = Date.parse(PANA);
  const pasi = istoricPlan([
    rand('b', '2026-11-03T10:00:00Z', 'conturi.gratuit', 'eu', 'owner', { plan: 'gratuit', probaPana: pana, inainte: null }),
    rand('n', '2026-11-02T10:00:00Z', 'conturi.nume', 'ana', null, { nume: 'Ana' }),
    rand('a', '2026-11-01T10:00:00Z', 'conturi.creeaza', 'ana', null, { email: 'ana@exemplu.ro', plan: 'proba', probaPana: pana }),
    rand('d', '2026-11-05T10:00:00Z', 'conturi.reactiveaza', 'alt', 'RSuport0000000000000', { plan: 'proba', probaPana: pana + 30 * ZI, inainte: null }),
    rand('c', '2026-11-04T10:00:00Z', 'conturi.dezactiveaza', 'alt', 'RSuport0000000000000', { plan: 'dezactivat', probaPana: pana, inainte: { plan: 'gratuit', probaPana: pana } }),
    rand('x', '2026-11-06T10:00:00Z', 'tichete.raporteaza', 'ana', null, { fel: 'problema' }),
    rand('f', null, 'conturi.proba', 'eu', 'owner', { plan: 'proba', probaPana: 'mâine' }),
    rand('e', '2026-11-06T09:00:00Z', 'conturi.proba', 'eu', 'owner', { plan: 'ceva' }),
    // Contul unui om din personal, deschis de el: tot o deschidere, deși nu e a unui client.
    rand('g', '2026-10-31T10:00:00Z', 'conturi.creeaza', 'eu', 'owner', { email: 'eu@exemplu.ro', plan: 'proba', probaPana: pana }),
  ]);
  assert.deepEqual(pasi.map((p) => p.id), ['e', 'd', 'c', 'b', 'a', 'g', 'f'], 'numele și tichetele nu sunt ale planului; data necunoscută, la urmă');
  assert.deepEqual(pasi.map((p) => p.plan), [null, 'proba', 'dezactivat', 'gratuit', 'proba', 'proba', 'proba'], 'un plan necunoscut rămâne necunoscut');
  assert.deepEqual(pasi.map((p) => p.probaPana?.getTime() ?? null), [null, pana + 30 * ZI, null, null, pana, pana, null], 'sfârșitul se spune doar la o probă');
  assert.deepEqual(pasi.map((p) => p.cine), ['eu', 'personal', 'personal', 'eu', 'client', 'eu', 'eu']);
  assert.deepEqual(pasi.map((p) => p.creare), [false, false, false, false, true, true, false], 'deschiderea se cunoaște după acțiune, nu după cine a făcut-o');
  assert.deepEqual(istoricPlan([]), []);
});

test('ziua pe scurt: doar data, fără oră (coloanele înguste); necunoscută, o liniuță', () => {
  const d = new Date(2026, 10, 21, 13, 40);
  assert.equal(ziScurta(d, 'ro'), '21.11.2026');
  assert.equal(ziScurta(d, 'en'), '11/21/26');
  assert.equal(ziScurta(null, 'ro'), '—');
  assert.ok(dataScurta(d, 'ro').startsWith('21.11.2026, 13:40'), 'data scurtă rămâne cu ora');
});
