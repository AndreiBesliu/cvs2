/**
 * Publicarea (felia 3.4b, ADR 0044): amprenta `meta/deployment` (forma, validarea) și verificarea ei din Diagnoză.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { amprentaDin, PROIECTE, shaScurt, type Amprenta, type Publicare } from '../../shared/publicare.ts';
import { verificari, type DateDiagnoza } from '../../src/admin/diagnoza/verificari.ts';

const SHA = 'abc123def4560000000000000000000000000001';
const ALT = 'fedcba9876540000000000000000000000000002';
const p = (gitSha = SHA, peste: Partial<Publicare> = {}): Publicare => ({
  gitSha, gitRef: 'main', arboreCurat: true, deployedAt: '2026-10-18T09:00:00.000Z', deployedBy: 'github:AndreiBesliu #12', ...peste,
});
const amprenta = (tinte: Amprenta['tinte'], projectId: string = PROIECTE.test): Amprenta => ({ schema: 1, app: 'cncvs2', projectId, tinte });
const toate = (gitSha = SHA): Amprenta['tinte'] => ({ hosting: p(gitSha, { builtAt: '2026-10-18T08:58:00.000Z' }), functii: p(gitSha), reguli: p(gitSha), indecsi: p(gitSha) });

test('proiectele instanțelor: sursa unică', () => {
  assert.deepEqual(PROIECTE, { test: 'cncvectorstudio-test', live: 'cncvectorstudio' });
  assert.equal(shaScurt(SHA), 'abc123def456');
});

test('amprenta validă trece neschimbată; o țintă lipsă e voie (niciodată publicată prin script)', () => {
  const a = amprenta(toate());
  assert.deepEqual(amprentaDin(structuredClone(a)), a);
  const doarHosting = amprenta({ hosting: p() });
  assert.deepEqual(amprentaDin(doarHosting), doarHosting);
});

test('amprenta de altă formă e „nevalid”: schema, aplicația, proiectul, ținta necunoscută, sha scurt, data, câmpurile', () => {
  const bun = amprenta(toate()) as unknown as Record<string, unknown>;
  const cu = (f: (o: Record<string, any>) => void): unknown => { const o = structuredClone(bun) as Record<string, any>; f(o); return o; };
  for (const [ce, x] of [
    ['null', null], ['tablou', []], ['schema 2', cu((o) => { o['schema'] = 2; })], ['altă aplicație', cu((o) => { o['app'] = 'cncvs'; })],
    ['fără proiect', cu((o) => { delete o['projectId']; })], ['ținte tablou', cu((o) => { o['tinte'] = []; })],
    ['țintă necunoscută', cu((o) => { o['tinte']['storage'] = p(); })],
    ['sha scurt', cu((o) => { o['tinte']['functii'].gitSha = 'abc123'; })],
    ['sha cu majuscule', cu((o) => { o['tinte']['functii'].gitSha = SHA.toUpperCase(); })],
    ['data nevalidă', cu((o) => { o['tinte']['reguli'].deployedAt = '18.10.2026'; })],
    ['arboreCurat text', cu((o) => { o['tinte']['indecsi'].arboreCurat = 'da'; })],
    ['cine gol', cu((o) => { o['tinte']['hosting'].deployedBy = ''; })],
    ['builtAt pe server', cu((o) => { o['tinte']['functii'].builtAt = '2026-10-18T08:58:00.000Z'; })],
  ] as const) assert.equal(amprentaDin(x), 'nevalid', ce);
});

/* ── Diagnoza: verificarea „amprenta” ──────────────────────────────────────────────────────────────────────────── */

const bun: DateDiagnoza = {
  instanta: 'test', proiect: PROIECTE.test, build: 'abc123def456', appCheck: 'recaptcha', rol: 'owner',
  nerezolvate: { ok: true, valoare: 0 }, functii: { ok: true, valoare: 401 },
  marcaje: { ok: true, valoare: {} }, acum: Date.UTC(2026, 9, 18, 10, 0),
  amprenta: { ok: true, valoare: amprenta(toate()) as unknown as Record<string, unknown> },
};
const amp = (d: Partial<DateDiagnoza>) => verificari({ ...bun, ...d }).find((v) => v.id === 'amprenta');
const cu = (a: Amprenta | Record<string, unknown> | null): Partial<DateDiagnoza> => ({ amprenta: { ok: true, valoare: a as Record<string, unknown> | null } });

test('amprenta: pagina și serverul din același commit, cu build-ul paginii: bine, cu commit-ul, ora și cine', () => {
  const v = amp({});
  assert.equal(v?.stare, 'bine');
  assert.deepEqual(v?.masura, { cheie: 'admin.diag.amprenta.bine', param: { sha: 'abc123def456', cand: '2026-10-18 09:00 UTC', cine: 'github:AndreiBesliu #12' } });
});

test('amprenta: necitită = eșec cu motivul; lipsă = atenție cu indiciul; altă formă = atenție', () => {
  assert.deepEqual(amp({ amprenta: { ok: false, motiv: 'permission-denied' } })?.masura, { cheie: 'admin.diag.amprenta.necitit', param: { motiv: 'permission-denied' } });
  assert.equal(amp({ amprenta: { ok: false, motiv: 'x' } })?.stare, 'esec');
  const lipsa = amp(cu(null));
  assert.equal(lipsa?.stare, 'atentie');
  assert.equal(lipsa?.indiciu, 'admin.diag.amprenta.lipsa-indiciu');
  assert.equal(amp(cu({ schema: 9 }))?.masura.cheie, 'admin.diag.amprenta.nevalid');
});

test('amprenta altui proiect = eșec (aliasul care minte)', () => {
  const v = amp(cu(amprenta(toate(), PROIECTE.live)));
  assert.equal(v?.stare, 'esec');
  assert.deepEqual(v?.masura, { cheie: 'admin.diag.amprenta.alt-proiect', param: { proiect: 'cncvectorstudio' } });
});

test('pagina rulează alt build decât cel publicat: atenție (cache vechi sau publicare pe lângă script)', () => {
  const v = amp({ build: 'fedcba987654' });
  assert.equal(v?.stare, 'atentie');
  assert.deepEqual(v?.masura, { cheie: 'admin.diag.amprenta.alt-build', param: { build: 'fedcba987654', sha: 'abc123def456' } });
  assert.equal(v?.indiciu, 'admin.diag.amprenta.alt-build-indiciu');
});

test('serverul din alt commit (sau nepublicat prin script) decât pagina: informație, cu ce e pe server', () => {
  const v = amp(cu(amprenta({ ...toate(), functii: p(ALT) })));
  assert.equal(v?.stare, 'info');
  assert.deepEqual(v?.masura.cheie, 'admin.diag.amprenta.server-altul');
  assert.equal(v?.masura.param?.['server'], 'fedcba987654');
  const faraServer = amp(cu(amprenta({ hosting: p() })));
  assert.equal(faraServer?.stare, 'info');
  assert.equal(faraServer?.masura.param?.['server'], '—');
});

test('fără hosting în amprentă: atenție (pagina n-are de unde fi judecată)', () => {
  const v = amp(cu(amprenta({ functii: p(), reguli: p(), indecsi: p() })));
  assert.equal(v?.stare, 'atentie');
  assert.equal(v?.masura.cheie, 'admin.diag.amprenta.fara-hosting');
});

test('modificări necomise: pe test informație; pe live eșec (live se publică doar din workflow, dintr-un checkout curat)', () => {
  const necomis = amprenta({ ...toate(), reguli: p(SHA, { arboreCurat: false, deployedBy: 'local' }) });
  assert.equal(amp(cu(necomis))?.stare, 'info');
  assert.equal(amp(cu(necomis))?.masura.cheie, 'admin.diag.amprenta.necomis');
  const live = amp({ instanta: 'live', proiect: PROIECTE.live, ...cu({ ...necomis, projectId: PROIECTE.live }) });
  assert.equal(live?.stare, 'esec');
  assert.equal(live?.masura.cheie, 'admin.diag.amprenta.necomis-live');
});

test('ordinea verificărilor: amprenta stă după build', () => {
  assert.deepEqual(verificari(bun).map((v) => v.id).slice(0, 3), ['instanta', 'build', 'amprenta']);
});
