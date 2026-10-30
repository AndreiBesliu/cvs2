import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ClientApi } from '../../scripts/firebase-api.ts';
import { citesteSugestii, PAGINA, PAGINI_MAX, sugestieDinRest, textSugestii } from '../../scripts/sugestii-lista.ts';

/** Lista sugestiilor pentru asistent (ADR 0107 §7): documentele REST ca rânduri, toate paginile, textul de citit. */

const doc = (id: string, f: Record<string, unknown>) => ({
  name: `projects/p/databases/(default)/documents/sugestii/${id}`,
  fields: Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v instanceof Date ? { timestampValue: v.toISOString() } : typeof v === 'number' ? { integerValue: String(v) } : v === null ? { nullValue: null } : { stringValue: v }])),
});

/** Un client fals: întoarce paginile pe rând și ține cererile. */
function client(pagini: readonly unknown[]): ClientApi & { readonly cereri: string[] } {
  const cereri: string[] = [];
  return {
    cereri,
    get: (url, o) => {
      cereri.push(`${url}?${o?.queryParams?.toString() ?? ''}`);
      return Promise.resolve({ status: 200, body: pagini[cereri.length - 1] ?? {} });
    },
    patch: () => Promise.reject(new Error('lista doar citește')),
  };
}

test('un document REST devine rândul filei: datele, versiunea, starea; fără nume, nimic', () => {
  const s = sugestieDinRest(doc('SAna0000000000000000', {
    titlu: 'Grila', descriere: 'a\nb', tip: 'idee', zona: 'desen', autor: 'ana', autorEmail: 'ana@exemplu.ro',
    creataLa: new Date('2026-10-29T10:00:00Z'), stare: 'acceptata', nota: 'Da.', versiune: 2, decisaLa: null,
  }));
  assert.deepEqual([s?.id, s?.titlu, s?.tip, s?.stare, s?.versiune, s?.creataLa?.toISOString(), s?.decisaLa], [
    'SAna0000000000000000', 'Grila', 'idee', 'acceptata', 2, '2026-10-29T10:00:00.000Z', null,
  ]);
  assert.equal(sugestieDinRest({ fields: {} }), null);
  assert.equal(sugestieDinRest(null), null);
  assert.equal(sugestieDinRest({ name: 'x/y/S1', fields: 'stricat' })?.titlu, '');
});

test('citirea ia toate paginile (pageToken), apoi ordonează; peste plafonul paginilor aruncă, nu taie lista', async () => {
  const c = client([
    { documents: [doc('A', { titlu: 'veche', creataLa: new Date('2026-10-01T00:00:00Z') })], nextPageToken: 't1' },
    { documents: [doc('B', { titlu: 'nouă', creataLa: new Date('2026-10-29T00:00:00Z') })] },
  ]);
  assert.deepEqual((await citesteSugestii(c, 'p')).map((s) => s.titlu), ['nouă', 'veche']);
  assert.deepEqual(c.cereri, [
    `/projects/p/databases/(default)/documents/sugestii?pageSize=${PAGINA}`,
    `/projects/p/databases/(default)/documents/sugestii?pageSize=${PAGINA}&pageToken=t1`,
  ]);
  assert.deepEqual(await citesteSugestii(client([{}]), 'p'), [], 'o colecție goală n-are `documents`');
  const fara = client(Array.from({ length: PAGINI_MAX }, (_, i) => ({ documents: [], nextPageToken: `t${i}` })));
  await assert.rejects(citesteSugestii(fara, 'p'), /mai mult de/);
});

test('textul: implicit doar acceptatele și cele în lucru, cu textul și nota; cu toate, și restul', () => {
  const lista = [
    sugestieDinRest(doc('S1', { titlu: 'Grila', descriere: 'rândul 1\nrândul 2', tip: 'idee', zona: 'desen', autorEmail: 'ana@exemplu.ro', creataLa: new Date('2026-10-29T10:00:00Z'), stare: 'acceptata', nota: 'Da,\ndupă etapa 6.' })),
    sugestieDinRest(doc('S2', { titlu: 'R12', tip: 'problema', autor: 'ion', stare: 'in-lucru' })),
    sugestieDinRest(doc('S3', { titlu: 'Respinsă', tip: 'idee', stare: 'respinsa' })),
    sugestieDinRest(doc('S4', { titlu: 'Nouă', tip: 'idee', stare: 'noua' })),
  ].filter((s) => s !== null);
  assert.equal(textSugestii(lista, false), [
    '- [acceptata] Grila (idee, desen; ana@exemplu.ro, 2026-10-29; S1)',
    '    rândul 1',
    '    rândul 2',
    '    Nota owner-ului: Da, / după etapa 6.',
    '- [in-lucru] R12 (problema, nespecificată; ion, ?; S2)',
  ].join('\n'));
  assert.equal(textSugestii(lista, true).split('\n').filter((r) => r.startsWith('- ')).length, 4);
  assert.equal(textSugestii(lista.slice(2), false), 'Nicio sugestie acceptată sau în lucru.');
  assert.equal(textSugestii([], true), 'Nicio sugestie.');
});
