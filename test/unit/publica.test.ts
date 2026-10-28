/**
 * Scriptul de publicare și amprenta pe Firestore (felia 3.4b, ADR 0044): argumentele, cine are voie să publice (live doar
 * din workflow, în mediul lui), `dist/` al commit-ului, codarea REST a amprentei, masca de scriere (doar țintele
 * publicate), citirea și condiția live = același sha ca pe test. Clientul API e fals: nicio cerere în afară.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { amprentaDin, TINTE_SERVER, TOATE_TINTELE, type Amprenta, type Publicare } from '../../shared/publicare.ts';
import { cerereScriere, citesteAmprenta, dinFirestore, inFirestore, scrieAmprenta, shaPublicatPeTest } from '../../scripts/amprenta.ts';
import type { ClientApi, Raspuns } from '../../scripts/firebase-api.ts';
import { cinePublica, citesteArgumente, distEsteAlCommitului, poatePublica } from '../../scripts/publica.ts';

const SHA = 'abc123def4560000000000000000000000000001';
const p = (peste: Partial<Publicare> = {}): Publicare => ({
  gitSha: SHA, gitRef: 'main', arboreCurat: true, deployedAt: '2026-10-18T09:00:00.000Z', deployedBy: 'github:AndreiBesliu #7', ...peste,
});
const CI_LIVE = { GITHUB_ACTIONS: 'true', CNCVS2_MEDIU: 'live', CNCVS2_SHA: SHA };

test('argumentele: instanța obligatorie; implicit toate țintele; --doar hosting / server; altceva e eroare', () => {
  assert.deepEqual(citesteArgumente(['--instanta', 'test']), { instanta: 'test', tinte: TOATE_TINTELE });
  assert.deepEqual(citesteArgumente(['--instanta', 'live', '--doar', 'hosting']), { instanta: 'live', tinte: ['hosting'] });
  assert.deepEqual(citesteArgumente(['--doar', 'server', '--instanta', 'test']), { instanta: 'test', tinte: TINTE_SERVER });
  for (const a of [[], ['--instanta', 'productie'], ['--instanta', 'test', '--doar', 'reguli'], ['--instanta', 'test', '--force']]) {
    assert.ok('eroare' in citesteArgumente(a), a.join(' '));
  }
});

test('live doar din workflow, în mediul live, cu sha-ul cerut; testul și de pe mașina owner-ului', () => {
  assert.deepEqual(poatePublica('test', {}), { ok: true });
  assert.equal(poatePublica('live', {}).ok, false, 'de pe mașina owner-ului');
  assert.equal(poatePublica('live', { CNCVS2_MEDIU: 'live', CNCVS2_SHA: SHA }).ok, false, 'fără GITHUB_ACTIONS');
  assert.deepEqual(poatePublica('live', CI_LIVE), { ok: true });
  assert.equal(poatePublica('live', { ...CI_LIVE, CNCVS2_MEDIU: 'test' }).ok, false, 'mediul test nu publică pe live');
  assert.equal(poatePublica('live', { ...CI_LIVE, CNCVS2_MEDIU: undefined }).ok, false, 'fără mediu (fără aprobare)');
  assert.equal(poatePublica('live', { ...CI_LIVE, CNCVS2_SHA: 'abc123' }).ok, false, 'sha scurt');
  assert.equal(poatePublica('test', { GITHUB_ACTIONS: 'true', CNCVS2_MEDIU: 'live' }).ok, false, 'mediul live nu publică pe test');
  assert.deepEqual(poatePublica('test', { GITHUB_ACTIONS: 'true', CNCVS2_MEDIU: 'test' }), { ok: true });
});

test('cine publică: workflow-ul cu actorul și rularea; altfel „local”', () => {
  assert.equal(cinePublica({ GITHUB_ACTIONS: 'true', GITHUB_ACTOR: 'AndreiBesliu', GITHUB_RUN_ID: '42' }), 'github:AndreiBesliu #42');
  assert.equal(cinePublica({}), 'local');
});

test('dist/ al commit-ului: versiunea (12 caractere) din antetul lui index.html (ADR 0098); alt commit, un prefix sau doar textul nu', () => {
  const html = (v: string): string => `<!doctype html><head>\n    <meta name="cncvs2-versiune" content="${v}" />\n</head>`;
  assert.equal(distEsteAlCommitului(html('abc123def456'), SHA), true);
  assert.equal(distEsteAlCommitului(html('fedcba987654'), SHA), false);
  assert.equal(distEsteAlCommitului(html('abc123def4567'), SHA), false, 'mai lung');
  assert.equal(distEsteAlCommitului(html('abc123def45'), SHA), false, 'mai scurt');
  assert.equal(distEsteAlCommitului('<script>const v="abc123def456"</script>', SHA), false, 'doar în text, nu în antet');
});

/* ── Amprenta pe Firestore ─────────────────────────────────────────────────────────────────────────────────────── */

test('codarea REST: text, boolean, întreg, obiect (fără câmpurile nedefinite), dus-întors; altceva aruncă', () => {
  const x = { schema: 1, app: 'cncvs2', tinte: { hosting: { gitSha: SHA, arboreCurat: true, builtAt: undefined } } };
  const v = inFirestore(x);
  assert.deepEqual(v, { mapValue: { fields: {
    schema: { integerValue: '1' }, app: { stringValue: 'cncvs2' },
    tinte: { mapValue: { fields: { hosting: { mapValue: { fields: { gitSha: { stringValue: SHA }, arboreCurat: { booleanValue: true } } } } } } },
  } } });
  assert.deepEqual(dinFirestore(v), { schema: 1, app: 'cncvs2', tinte: { hosting: { gitSha: SHA, arboreCurat: true } } });
  for (const r of [1.5, null, [1], () => 1]) assert.throws(() => inFirestore(r), String(r));
});

test('masca de scriere: antetul și doar țintele publicate; builtAt doar la hosting', () => {
  const { corp, masca } = cerereScriere('cncvectorstudio-test', ['functii', 'reguli'], p({ builtAt: '2026-10-18T08:58:00.000Z' }));
  assert.deepEqual(masca.getAll('updateMask.fieldPaths'), ['schema', 'app', 'projectId', 'tinte.functii', 'tinte.reguli']);
  const doc = dinFirestore({ mapValue: corp }) as Record<string, any>;
  assert.deepEqual(Object.keys(doc['tinte']).sort(), ['functii', 'reguli']);
  assert.equal(doc['tinte']['functii'].builtAt, undefined);
  const h = dinFirestore({ mapValue: cerereScriere('p', ['hosting'], p({ builtAt: '2026-10-18T08:58:00.000Z' })).corp }) as Record<string, any>;
  assert.equal(h['tinte']['hosting'].builtAt, '2026-10-18T08:58:00.000Z');
  // Documentul scris trece de validarea cititorului (aceeași formă pe ambele părți).
  const a = amprentaDin(doc);
  assert.notEqual(a, 'nevalid');
  assert.throws(() => cerereScriere('p', [], p()));
});

function clientFals(raspunsuri: Record<string, Raspuns>): ClientApi & { readonly cereri: Array<{ m: string; url: string; corp?: unknown; q?: string | undefined }> } {
  const cereri: Array<{ m: string; url: string; corp?: unknown; q?: string | undefined }> = [];
  return {
    cereri,
    get: async (url) => { cereri.push({ m: 'GET', url }); return raspunsuri['GET'] ?? { status: 500, body: null }; },
    patch: async (url, corp, o) => { cereri.push({ m: 'PATCH', url, corp, q: o?.queryParams?.toString() }); return raspunsuri['PATCH'] ?? { status: 500, body: null }; },
  };
}

test('scrierea: PATCH pe meta/deployment al proiectului, cu masca; un alt status decât 200 aruncă', async () => {
  const c = clientFals({ PATCH: { status: 200, body: {} } });
  await scrieAmprenta(c, 'cncvectorstudio-test', ['hosting'], p());
  assert.equal(c.cereri[0]?.m, 'PATCH');
  assert.equal(c.cereri[0]?.url, '/projects/cncvectorstudio-test/databases/(default)/documents/meta/deployment');
  assert.ok(c.cereri[0]?.q?.includes('updateMask.fieldPaths=tinte.hosting'));
  await assert.rejects(scrieAmprenta(clientFals({ PATCH: { status: 403, body: { error: 'PERMISSION_DENIED' } } }), 'p', ['hosting'], p()), /HTTP 403/);
});

test('citirea: 404 = lipsă; 200 = amprenta validată; altă formă = nevalid; alt status aruncă', async () => {
  assert.equal(await citesteAmprenta(clientFals({ GET: { status: 404, body: null } }), 'p'), null);
  const corp = { fields: (inFirestore({ schema: 1, app: 'cncvs2', projectId: 'p', tinte: { hosting: p() } }) as { mapValue: { fields: unknown } }).mapValue.fields };
  const a = await citesteAmprenta(clientFals({ GET: { status: 200, body: corp } }), 'p');
  assert.deepEqual(a, { schema: 1, app: 'cncvs2', projectId: 'p', tinte: { hosting: p() } });
  assert.equal(await citesteAmprenta(clientFals({ GET: { status: 200, body: { fields: { schema: { integerValue: '9' } } } } }), 'p'), 'nevalid');
  await assert.rejects(citesteAmprenta(clientFals({ GET: { status: 403, body: null } }), 'p'), /HTTP 403/);
});

test('live doar cu sha-ul publicat întreg pe test, din arborele curat', () => {
  const toate = (peste: Partial<Amprenta['tinte']> = {}): Amprenta => ({
    schema: 1, app: 'cncvs2', projectId: 'cncvectorstudio-test', tinte: { hosting: p(), functii: p(), reguli: p(), indecsi: p(), ...peste },
  });
  assert.deepEqual(shaPublicatPeTest(toate(), SHA), { ok: true });
  assert.equal(shaPublicatPeTest(null, SHA).ok, false);
  assert.equal(shaPublicatPeTest('nevalid', SHA).ok, false);
  assert.equal(shaPublicatPeTest(toate(), 'f'.repeat(40)).ok, false, 'alt commit');
  assert.equal(shaPublicatPeTest(toate({ reguli: p({ gitSha: 'f'.repeat(40) }) }), SHA).ok, false, 'o țintă din alt commit');
  assert.equal(shaPublicatPeTest(toate({ indecsi: p({ arboreCurat: false }) }), SHA).ok, false, 'necomis');
  const { indecsi: _, ...fara } = toate().tinte;
  assert.equal(shaPublicatPeTest({ ...toate(), tinte: fara }, SHA).ok, false, 'o țintă nepublicată prin script');
});
