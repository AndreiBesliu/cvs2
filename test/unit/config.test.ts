import { test } from 'node:test';
import assert from 'node:assert/strict';
import { citesteConfig, incarcaConfig } from '../../src/app/config.ts';

test('configurația validă trece', () => {
  for (const instanta of ['local', 'test', 'live'] as const) {
    assert.deepEqual(citesteConfig(JSON.stringify({ instanta })), { ok: true, config: { instanta } });
  }
});

test('o instanță necunoscută e refuzată, cu motivul scris', () => {
  const r = citesteConfig('{"instanta":"productie"}');
  assert.equal(r.ok, false);
  assert.match(r.ok ? '' : r.motiv, /instanta/);
});

test('JSON-ul stricat e refuzat, nu aruncă', () => {
  assert.deepEqual(citesteConfig('{instanta'), { ok: false, motiv: 'config.json nu e JSON valid' });
});

test('un răspuns HTTP de eroare și o rețea căzută devin motive, nu excepții', async () => {
  const r404 = await incarcaConfig(async () => new Response('nu', { status: 404 }));
  assert.deepEqual(r404, { ok: false, motiv: 'config.json: HTTP 404' });
  const cazut = await incarcaConfig(async () => { throw new TypeError('Failed to fetch'); });
  assert.deepEqual(cazut, { ok: false, motiv: 'config.json: Failed to fetch' });
});
