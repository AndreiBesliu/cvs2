import { test } from 'node:test';
import assert from 'node:assert/strict';
import ignore from 'ignore';
import { FUNCTII_IGNORATE } from '../../scripts/firebase-json.ts';

/**
 * Ce pleacă în cloud din `functions/` (ADR 0039 §1): firebase-tools aplică `ignore` din `firebase.json` cu pachetul
 * `ignore` (semantica `.gitignore`). La prima publicare (16.10), modelul `src` a prins și `lib/functions/src`, iar
 * construcția din cloud n-a găsit `main`. Aici, același pachet pe căile pe care le are dosarul.
 */
const pleaca = (cale: string): boolean => !ignore().add([...FUNCTII_IGNORATE]).ignores(cale);

test('pleacă codul compilat (cu dosarele lui src și test) și package.json-urile', () => {
  for (const cale of [
    'package.json', 'package-lock.json', 'lib/functions/src/index.js', 'lib/functions/src/erori/scrie.js',
    'lib/shared/erori.js', 'lib/functions/test/x.js',
  ]) assert.ok(pleaca(cale), cale);
});

test('rămân acasă: sursele, testele, tsconfig-urile, node_modules și fișierele locale', () => {
  for (const cale of [
    'src/index.ts', 'src/erori/scrie.ts', 'test/erori.emulator.test.ts', 'tsconfig.json', 'tsconfig.verificare.json',
    'node_modules/firebase-admin/package.json', '.env.local',
  ]) assert.ok(!pleaca(cale), cale);
});
