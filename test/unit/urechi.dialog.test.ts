/**
 * Urechile scrise de Exportă (ADR 0211, felia 11.3↑d): valorile ferestrei peste cele din document (îmbinate, ADR 0016). Cu
 * „alese pe desen”, locurile rămân ale documentului (le scrie modul pânzei); la distanțe egale, modul „alese” și locurile
 * pleacă; un alt mod, scris de mână, rămâne; numărul arătat al urechilor alese nu intră în document; un Exportă fără nicio
 * schimbare nu schimbă nimic (comparația canonică a acțiunii).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { operatieDinDialog } from '../../src/app/valoriOperatii.ts';
import type { Operatie, UrechiOperatie } from '../../src/model/document.ts';
import { jsonCanonic } from '../../src/model/incarcare.ts';

const SCULA = { numar: 1, diametru: 3.175 };
const operatie = (urechi: UrechiOperatie | null): Operatie => ({
  id: 'x1', tip: 'profil', noduri: ['e'], scula: { numar: 1, nume: 'freza 1/8', diametru: 3.175 }, latura: 'exterior', sens: 'urcare',
  adancime: 18, pas: 6, urechi, rampa: null, intrari: null, colturi: null,
});
const valori = (urechi: { numar: number; latime: number; grosime: number; mod?: 'alese'; alese?: number } | null) => ({
  latura: 'exterior' as const, sens: 'urcare' as const, adancime: 18, pas: 6, urechi, rampa: null, intrari: null, colturi: null,
});
const LOCURI = { e: [{ x: 0, y: 15 }, { x: 80, y: 15 }] };

test('„alese pe desen”, neschimbat: aceeași operație, deci nicio comandă; locurile rămân, numărul arătat nu se scrie', () => {
  const o = operatie({ numar: 2, latime: 6, grosime: 2, mod: 'alese', locuri: LOCURI });
  const r = operatieDinDialog(o, valori({ numar: 2, latime: 6, grosime: 2, mod: 'alese', alese: 2 }), SCULA);
  assert.equal(jsonCanonic(r), jsonCanonic(o));
  assert.equal(Object.hasOwn(r.urechi ?? {}, 'alese'), false);
});

test('„alese pe desen” cu altă lungime: lungimea nouă, locurile rămân', () => {
  const o = operatie({ numar: 2, latime: 6, grosime: 2, mod: 'alese', locuri: LOCURI });
  const r = operatieDinDialog(o, valori({ numar: 2, latime: 8, grosime: 2, mod: 'alese', alese: 2 }), SCULA);
  assert.deepEqual(r.urechi, { numar: 2, latime: 8, grosime: 2, mod: 'alese', locuri: LOCURI });
});

test('înapoi „la distanțe egale”: modul „alese” și locurile pleacă', () => {
  const o = operatie({ numar: 2, latime: 6, grosime: 2, mod: 'alese', locuri: LOCURI });
  const r = operatieDinDialog(o, valori({ numar: 4, latime: 6, grosime: 2 }), SCULA);
  assert.deepEqual(r.urechi, { numar: 4, latime: 6, grosime: 2 });
});

test('alese pe un rând fără urechi în document: modul se scrie, fără locuri (le pune modul pânzei)', () => {
  const r = operatieDinDialog(operatie(null), valori({ numar: 4, latime: 6, grosime: 2, mod: 'alese', alese: 0 }), SCULA);
  assert.deepEqual(r.urechi, { numar: 4, latime: 6, grosime: 2, mod: 'alese' });
});

test('un mod scris de mână („lemn”) rămâne; bifa scoasă scoate urechile', () => {
  const o = operatie({ numar: 2, latime: 6, grosime: 2, mod: 'lemn' });
  assert.deepEqual(operatieDinDialog(o, valori({ numar: 2, latime: 6, grosime: 2 }), SCULA).urechi, { numar: 2, latime: 6, grosime: 2, mod: 'lemn' });
  assert.equal(operatieDinDialog(o, valori(null), SCULA).urechi, null);
  assert.equal(operatieDinDialog(o, undefined, SCULA).urechi, o.urechi);
});
