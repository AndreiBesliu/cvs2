import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CSP } from '../../shared/csp.ts';
import { textFirebaseJson } from '../../scripts/firebase-json.ts';

test('firebase.json din repo e exact cel generat din sursele lui (CSP-ul din shared/csp.ts)', () => {
  assert.equal(readFileSync('firebase.json', 'utf8'), textFirebaseJson());
});

test('antetul CSP de pe Hosting e CSP-ul din build, plus frame-ancestors, fără unsafe-eval', () => {
  const cfg = JSON.parse(readFileSync('firebase.json', 'utf8')) as {
    hosting: { headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }> };
  };
  const toate = cfg.hosting.headers.find((h) => h.source === '**');
  const csp = toate?.headers.find((h) => h.key === 'Content-Security-Policy')?.value ?? '';
  assert.ok(csp.startsWith(CSP), csp);
  assert.ok(csp.includes("frame-ancestors 'none'"));
  assert.ok(!csp.includes('unsafe-eval'));
  // Antetele se potrivesc pe calea cererii: „/” și „/index.html” sunt două căi, deci amândouă sunt fără cache.
  for (const cale of ['/', '/index.html', '/config.json', '/sw.js']) {
    const r = cfg.hosting.headers.find((h) => h.source === cale);
    assert.equal(r?.headers.find((h) => h.key === 'Cache-Control')?.value, 'no-cache', cale);
  }
});
