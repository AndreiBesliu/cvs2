import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { amprenta, deSters, esteImaginePastrata, PASTRATA_CEL_PUTIN_MS, surseDinTexte, surseFolosite } from '../../src/app/imaginiFoaie.ts';
import type { Document, Foaie, ImagineFoaie } from '../../src/model/document.ts';

/**
 * Imaginile foilor (ADR 0272, felia 25.8↑a), partea pură a bazei lor: amprenta SHA-256 (cheia, comparată cu `node:crypto`),
 * imaginile folosite de document și de versiunile păstrate (citite din textul lor, fără ușă) și ce se șterge la curățare
 * (nefolosite și puse de cel puțin o zi). Baza însăși (IndexedDB) se încearcă în e2e.
 */

const imagine = (sursa: string, id = sursa.slice(0, 6)): ImagineFoaie => ({
  id, sursa, x: 100, y: 80, latime: 200, inaltime: 150, rotire: 0, opacitate: 0.4, vizibila: true, fixata: true,
});
const foaie = (id: string, imagini?: ImagineFoaie[]): Foaie => ({ id, stoc: { latime: 600, inaltime: 400, grosime: 18 }, instante: [], ...(imagini ? { imagini } : {}) });
const doc = (foi: Foaie[]): Document => ({ schema: 25, rev: 1, piese: [], foi });

test('amprenta: SHA-256 în hexazecimal, ca node:crypto; aceeași pentru aceiași octeți', async () => {
  const o = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4, 5]);
  const a = await amprenta(o);
  assert.match(a, /^[0-9a-f]{64}$/);
  assert.equal(a, createHash('sha256').update(o).digest('hex'));
  assert.equal(await amprenta(new Uint8Array(o)), a);
  assert.notEqual(await amprenta(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4, 6])), a);
});

test('imaginile folosite: toate foile tuturor versiunilor; o foaie fără imagini nu adaugă nimic', () => {
  const a = 'a'.repeat(64), b = 'b'.repeat(64), c = 'c'.repeat(64);
  const v1 = doc([foaie('f1', [imagine(a)]), foaie('f2')]);
  const v2 = doc([foaie('f1', [imagine(a), imagine(b, 'b2')]), foaie('f2', [imagine(c)])]);
  assert.deepEqual([...surseFolosite([v1])].sort(), [a]);
  assert.deepEqual([...surseFolosite([v1, v2])].sort(), [a, b, c]);
  assert.equal(surseFolosite([]).size, 0);
});

test('imaginile din textele versiunilor: citite fără ușă; textul stricat, străin ori fără imagini nu adaugă nimic', () => {
  const a = 'a'.repeat(64), b = 'b'.repeat(64);
  const t1 = JSON.stringify(doc([foaie('f1', [imagine(a)]), foaie('f2', [imagine(b, 'b1')])]));
  assert.deepEqual([...surseDinTexte([t1])].sort(), [a, b]);
  // Forma liberă (alte câmpuri, o foaie fără imagini, valori care nu sunt obiecte) nu oprește citirea celorlalte.
  const t2 = JSON.stringify({ foi: [null, 5, { imagini: 'nu' }, { imagini: [null, { sursa: 7 }, { sursa: 'c'.repeat(64) }] }] });
  assert.deepEqual([...surseDinTexte([t2])], ['c'.repeat(64)]);
  for (const rau of ['{"imagini": [', '"imagini"', JSON.stringify({ foi: 'nu', imagini: [] }), 42, null, { foi: [] }]) {
    assert.equal(surseDinTexte([rau]).size, 0, String(rau));
  }
  assert.equal(surseDinTexte([JSON.stringify(doc([foaie('f1')]))]).size, 0, 'fără imagini');
});

test('curățarea: se șterg doar imaginile nefolosite puse înainte de prag (o zi): cele de azi rămân', () => {
  const acum = 10 * PASTRATA_CEL_PUTIN_MS, pana = acum - PASTRATA_CEL_PUTIN_MS;
  const r = (sursa: string, la: number) => ({ sursa, la });
  assert.deepEqual(deSters([r('x', 0), r('y', 0), r('z', pana - 1)], new Set(['y']), pana), ['x', 'z']);
  // Nefolosită, dar pusă chiar la prag ori după el (altă filă poate n-a salvat-o încă): rămâne.
  assert.deepEqual(deSters([r('x', pana), r('w', acum)], new Set(), pana), []);
  assert.deepEqual(deSters([r('x', 0)], new Set(['x', 'w']), pana), []);
  assert.deepEqual(deSters([], new Set(), pana), []);
});

test('o înregistrare citită din bază: doar cu octeții ca Blob și câmpurile numerice', () => {
  const ok = { sursa: 'a'.repeat(64), tip: 'image/png', octeti: new Blob([new Uint8Array([1])]), latimePx: 10, inaltimePx: 5, la: 1 };
  assert.equal(esteImaginePastrata(ok), true);
  assert.equal(esteImaginePastrata({ ...ok, octeti: new Uint8Array([1]) }), false);
  assert.equal(esteImaginePastrata({ ...ok, latimePx: '10' }), false);
  assert.equal(esteImaginePastrata(null), false);
});
