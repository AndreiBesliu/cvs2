/**
 * CSP-ul extensiilor (ADR 0127 §D): amprenta încărcătorului cadrului, recalculată aici; directivele noi ale aplicației
 * (`blob:` și amprenta în `script-src`, `https:` în `connect-src`) și numai ele; CSP-ul propriu al cadrului, fără rețea.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { hashuriInline } from '../../scripts/cspHtml.ts';
import { AMPRENTA_INCARCATOR, CSP_CADRU, INCARCATOR, paginaCadru } from '../../shared/cadruExtensie.ts';
import { CSP } from '../../shared/csp.ts';

const directiva = (csp: string, nume: string): string[] =>
  (csp.split(';').map((d) => d.trim().split(/\s+/)).find((d) => d[0] === nume) ?? []).slice(1);

test('amprenta încărcătorului e sha256 al textului lui, iar pagina cadrului îl are o singură dată, după meta-ul CSP', () => {
  assert.equal(AMPRENTA_INCARCATOR, `'sha256-${createHash('sha256').update(INCARCATOR, 'utf8').digest('base64')}'`);
  const p = paginaCadru();
  assert.deepEqual(hashuriInline(p), [AMPRENTA_INCARCATOR]);
  assert.ok(p.indexOf('http-equiv="Content-Security-Policy"') < p.indexOf('<script>'));
  assert.equal(p.split('<script').length, 2);
});

test('aplicația: blob: și amprenta în script-src, https: în connect-src; în rest, nimic nou și nimic „unsafe”', () => {
  assert.deepEqual(directiva(CSP, 'script-src').slice(0, 3), ["'self'", 'blob:', AMPRENTA_INCARCATOR]);
  assert.ok(directiva(CSP, 'connect-src').includes('https:'));
  assert.doesNotMatch(CSP, /unsafe-inline|unsafe-eval|\*/);
  assert.deepEqual(directiva(CSP, 'style-src'), ["'self'"]);
  assert.ok(!directiva(CSP, 'frame-src').includes('blob:'));
  assert.ok(!directiva(CSP, 'connect-src').includes('wss:'));
  // Antetul de pe Hosting e același CSP (firebase.json e generat din shared/csp.ts).
  assert.ok(readFileSync('firebase.json', 'utf8').includes(AMPRENTA_INCARCATOR));
});

test('cadrul: fără rețea, scripturi doar blob: și încărcătorul, nimic implicit', () => {
  assert.deepEqual(directiva(CSP_CADRU, 'default-src'), ["'none'"]);
  assert.deepEqual(directiva(CSP_CADRU, 'connect-src'), ["'none'"]);
  assert.deepEqual(directiva(CSP_CADRU, 'script-src'), ['blob:', AMPRENTA_INCARCATOR]);
  assert.deepEqual(directiva(CSP_CADRU, 'base-uri'), ["'none'"]);
  assert.doesNotMatch(CSP_CADRU, /unsafe|https:|\*/);
});
