/**
 * Atelierul (ADR 0250 §1, felia 28.1↑c), pe hârtie: același registru, aceleași cipuri, panouri și ferestre ca Insulele,
 * doar așezate altfel (uneltele de desen în coloana lor, din stânga). Aranjamentele build-ului și încărcarea lor: Insulele
 * sunt deja în pornire, Atelierul vine la cerere, iar un aranjament pe care build-ul nu-l are e refuzat.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACTIUNI_DOCUMENT } from '../../src/ui/actiuniDocument.ts';
import { ACTIUNI_EXPORT } from '../../src/ui/actiuniExport.ts';
import { ACTIUNI_IMPORT } from '../../src/ui/actiuniImport.ts';
import { ACTIUNI_VEDERE } from '../../src/ui/actiuniVedere.ts';
import { ACTIUNI_EXTENSII } from '../../src/ui/actiuniExtensii.ts';
import {
  ARANJAMENT_MODERN, cheieIntrare, COMUTA_PANOU, DESCHIDE_FEREASTRA, DOCURI, verificaAranjament, ZONE, ZONE_CU_DATA_ACTIUNE,
  type Aranjament,
} from '../../src/ui/aranjament.ts';
import { ARANJAMENT_ATELIER } from '../../src/ui/aranjamentAtelier.ts';
import { ARANJAMENTE_DISPONIBILE, incarcaAranjament } from '../../src/ui/incarcaAranjament.ts';

const REGISTRU = new Set([...ACTIUNI_DOCUMENT, ...ACTIUNI_EXPORT, ...ACTIUNI_IMPORT, ...ACTIUNI_VEDERE, ...ACTIUNI_EXTENSII].map((a) => a.id));

/** Ce pune un aranjament în zone (acțiunile, controalele, cipurile), fără loc și fără aspect. */
const intrari = (a: Aranjament): string[] => ZONE.flatMap((z) => a.zone[z].flatMap((g) => g.intrari.map(cheieIntrare))).sort();
const panouri = (a: Aranjament): string[] => DOCURI.flatMap((d) => a.docuri[d]).sort();

test('Atelierul trece de verificare: fiecare acțiune e în registru, nimic de două ori, ferestrele cu filele lor', () => {
  assert.equal(ARANJAMENT_ATELIER.id, 'atelier');
  assert.deepEqual(verificaAranjament(ARANJAMENT_ATELIER, REGISTRU), []);
});

test('Atelierul nu pierde nimic față de Insule: aceleași acțiuni, controale, cipuri, panouri și ferestre, doar așezate altfel', () => {
  assert.deepEqual(intrari(ARANJAMENT_ATELIER), intrari(ARANJAMENT_MODERN));
  assert.deepEqual(panouri(ARANJAMENT_ATELIER), panouri(ARANJAMENT_MODERN));
  assert.deepEqual(ARANJAMENT_ATELIER.ferestre, ARANJAMENT_MODERN.ferestre);
  // Căutarea comenzilor rămâne în meniul global: orice acțiune a registrului e la îndemână și din paletă.
  assert.ok(ARANJAMENT_ATELIER.zone.meniu.some((g) => g.intrari.some((x) => 'actiune' in x && x.actiune === 'vedere.paleta')));
});

test('uneltele de desen stau în coloana lor (zona „unelte”), nu în bara de sus; panourile, în dreapta', () => {
  const control = (z: (typeof ZONE)[number]): boolean => ARANJAMENT_ATELIER.zone[z].some((g) => g.intrari.some((x) => 'control' in x && x.control === 'unelte'));
  assert.ok(control('unelte'));
  assert.ok(!control('sus'));
  assert.deepEqual(ARANJAMENT_ATELIER.docuri, { stanga: [], dreapta: ['proprietati', 'lista'] });
  // Bara de sus: Anulează și Reface cu numele la vedere; importul doar cu pictograma (numele lui lung ar împinge G-code sub
  // panouri la 1280 px); G-code, plin.
  const aspecte = ARANJAMENT_ATELIER.zone.sus.flatMap((g) => g.intrari.flatMap((x) => ('actiune' in x ? [[x.actiune, x.aspect ?? 'iconita']] : [])));
  assert.deepEqual(aspecte, [['istoric.anuleaza', 'eticheta'], ['istoric.reface', 'eticheta'], ['import.svg', 'iconita'], ['export.gcode', 'principal']]);
});

test('localizatorii e2e `[data-actiune=…]` rămân unici și în Atelier', () => {
  const ids = [
    ...ZONE_CU_DATA_ACTIUNE.flatMap((z) => ARANJAMENT_ATELIER.zone[z].flatMap((g) => g.intrari.flatMap((x) => ('actiune' in x ? [x.actiune] : [])))),
    ...DOCURI.flatMap((d) => ARANJAMENT_ATELIER.docuri[d].map((p) => COMUTA_PANOU[p])),
    ...ARANJAMENT_ATELIER.ferestre.map((f) => DESCHIDE_FEREASTRA[f]),
  ];
  assert.equal(new Set(ids).size, ids.length, ids.join(', '));
});

test('aranjamentele build-ului: Insule și Atelier; Insulele vin pe loc, un aranjament lipsă e refuzat', async () => {
  assert.deepEqual(ARANJAMENTE_DISPONIBILE, ['modern', 'atelier']);
  assert.equal(await incarcaAranjament('modern'), ARANJAMENT_MODERN);
  await assert.rejects(incarcaAranjament('clasic'), /clasic/);
  await assert.rejects(incarcaAranjament('pasi'), /pasi/);
});
