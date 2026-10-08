/** Starea butonului de export (ADR 0025): fără forme, fără operații, sau activ. Motivul se vede în titlul butonului. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { documentNou, type Document } from '../../src/model/document.ts';
import { creeazaRegistru, stare } from '../../src/ui/actiuni.ts';
import { ACTIUNI_EXPORT, type ContextExport } from '../../src/ui/actiuniExport.ts';
import { docDin, ID } from './ajutor-document.ts';

const ctx = (d: Document): ContextExport => ({
  document: () => d,
  parametri: () => ({ origine: 'stanga-jos', z0: 'sus' }),
  rezultat: () => undefined,
});

test('exportul: inactiv fără forme, inactiv cu forme fără operații (alt motiv), activ cu o tăietură', () => {
  const r = creeazaRegistru(ACTIUNI_EXPORT, () => true);
  assert.deepEqual(stare(r, 'export.gcode', ctx(documentNou({ latime: 300, inaltime: 200, grosime: 18 }))), { ok: false, motiv: 'motiv.nimic-de-exportat' });
  const d = docDin({ latime: 300, inaltime: 200, grosime: 18 }, { id: 'e1', forma: { tip: 'cerc', raza: 15 }, matrice: { ...ID, e: 70, f: 50 } });
  assert.deepEqual(stare(r, 'export.gcode', ctx(d)), { ok: true });
  const faraOp: Document = { ...d, piese: d.piese.map((p) => ({ ...p, operatii: [] })) };
  assert.deepEqual(stare(r, 'export.gcode', ctx(faraOp)), { ok: false, motiv: 'motiv.nicio-operatie' });
});
