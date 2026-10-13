/**
 * MARTORUL invariantei 14 (i) pe aplicație (ADR 0037, „Ce am măsurat”, punctul 2, și contractul §1): pătratul 10…60 mm
 * al cărui vârf (60, 60) poartă un arc cu `bulge` 1e-13 până în (60, 60 + 1e-11), pe linie, freza Ø6, adâncimea 1, pasul
 * 1, GRBL 1.1, originea stânga-jos (documentul în `test/oracles/pe-linie.cazuri.ts`). Programul aplicației trebuie să
 * treacă toată poarta, deci și 14 (i): pe linie, freza stă pe linie.
 *
 * ROȘU ÎNAINTEA REPARAȚIEI, intenționat: la `ed5cd65`, aplicația scrie cercul Ø50 ca două semicercuri (`PROGRAM_ED5CD65`),
 * iar 14 (i) le prinde pe amândouă. După reparație (arcul de 1e-11 mm scris ca linie), testul trebuie să fie verde.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { programulAplicatiei } from './ajutor-lipire.ts';
import { poarta } from '../oracles/poarta.ts';
import { ctx14, docMartor, PROGRAM_ED5CD65 } from '../oracles/pe-linie.cazuri.ts';

test('martorul: programul aplicației pentru pătratul cu arcul de 1e-11 mm, pe linie, trece toată poarta (14 (i): fără cercul Ø50)', async () => {
  const doc = docMartor(1);
  const r = await programulAplicatiei(doc, { origine: 'stanga-jos', z0: 'sus' });
  if (!r.ok) return assert.fail(`exportul a refuzat: ${r.motiv}`);
  const sha = createHash('sha256').update(r.text).digest('hex');
  console.log(`programul aplicației: sha256 ${sha}${r.text === PROGRAM_ED5CD65 ? ' (exact cel de la ed5cd65, cu cercul)' : ''}`);
  const v = poarta(r.text, ctx14(doc));
  assert.deepEqual(v.map((i) => `[${i.invarianta}] ${i.linia}: ${i.mesaj}`), []);
  assert.doesNotMatch(r.text, /^G[23] /m, 'pe un pătrat fără arce reale, nu rămâne niciun G2 / G3');
});
