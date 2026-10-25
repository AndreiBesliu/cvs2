/**
 * Ușa documentului curent (ADR 0070): fără migrări, dă exact ce dă ușa întreagă pe un document al versiunii curente (și pe
 * refuzurile care nu cer migrări); pe un document mai vechi întoarce null, ca pornirea să aducă migrările.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VERSIUNE_SCHEMA } from '../../src/model/document.ts';
import { incarca } from '../../src/model/incarcare.ts';
import { incarcaCurent } from '../../src/model/usaCurenta.ts';

const FOAIE = { id: 'f1', stoc: { latime: 300, inaltime: 200, grosime: 18 }, instante: [{ id: 'i', piesa: 'p', x: 10, y: 10, rotire: 0 }] };
const PIESA = {
  id: 'p', radacina: { tip: 'element', id: 'e', matrice: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }, forma: { tip: 'cerc', raza: 10 } },
  operatii: [{
    id: 'o', tip: 'profil', noduri: ['e'], scula: { numar: 1, nume: 'f', diametru: 6 }, latura: 'interior', sens: 'urcare', adancime: 8, pas: 4,
    urechi: null, rampa: null, intrari: null, colturi: null,
  }],
};

test('un document al versiunii curente trece prin ușa curentă exact ca prin ușa întreagă', () => {
  const d = { schema: VERSIUNE_SCHEMA, rev: 3, piese: [PIESA], foi: [FOAIE], extra: { a: 1 } };
  const r = incarcaCurent(structuredClone(d));
  assert.ok(r && r.ok);
  assert.deepEqual(r, incarca(structuredClone(d)));
});

test('un document mai vechi cere migrările (null); ușa întreagă îl migrează', () => {
  for (const schema of [1, 9, VERSIUNE_SCHEMA - 1]) assert.equal(incarcaCurent({ schema, rev: 0, piese: [], foi: [FOAIE] }), null, String(schema));
  const v10 = { schema: VERSIUNE_SCHEMA - 1, rev: 0, piese: [PIESA], foi: [FOAIE] };
  const r = incarca(structuredClone(v10));
  assert.ok(r.ok && r.doc.schema === VERSIUNE_SCHEMA);
});

test('refuzurile care nu cer migrări vin din ușa curentă, cu același motiv ca ușa întreagă', () => {
  const lista: unknown[] = [null, [], 'text', { rev: 0 }, { schema: 0 }, { schema: '10' }, { schema: VERSIUNE_SCHEMA + 1, rev: 0 }];
  for (const brut of lista) {
    const r = incarcaCurent(brut);
    assert.ok(r && !r.ok, JSON.stringify(brut));
    assert.deepEqual(r, incarca(brut), JSON.stringify(brut));
  }
});
