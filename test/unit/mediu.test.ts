// Proba de mediu (felia 1.1): `node --test` rulează TypeScript direct, fără pas de compilare.
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('node rulează TypeScript-ul testelor fără transpilare', () => {
  const versiune: number = Number(process.versions.node.split('.')[0]);
  assert.ok(versiune >= 24, `Node ${process.versions.node}: cel puțin 24, pentru tipurile scoase nativ`);
});
