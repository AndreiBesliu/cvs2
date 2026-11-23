/**
 * Semnul unei extensii (ADR 0231 §B.2), partea pură: de unde îl ia gazda. Al unei extensii instalate vine din pachetul ei
 * (deci se vede și fără internet, și la una instalată din fișier); al unui rând din bibliotecă, din fișierul de lângă catalog.
 * Fără semn (o extensie mai veche, un pachet fără el), gazda arată piesa de puzzle.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { RandBiblioteca } from '../../shared/biblioteca.ts';
import type { ExtensieInstalata } from '../../src/extensii/depozit.ts';
import type { Manifest } from '../../src/extensii/pachet.ts';
import { adresaSemnCatalog, octetiSemn } from '../../src/extensii/semn.ts';

const SVG = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64"/></svg>');
const instalata = (manifest: Partial<Manifest>, fisiere: Record<string, Uint8Array>): ExtensieInstalata => ({
  id: 'proba',
  manifest: { format: 'cvs2-extensie', api: 1, id: 'proba', nume: 'Proba', versiune: '1.0.0', intrare: 'index.js', stiluri: [], permisiuni: [], fisiere: {}, ...manifest },
  fisiere, octeti: 0, sursa: { fel: 'fisier', nume: 'proba.zip' }, instalat: '2026-11-23T00:00:00.000Z',
});

test('semnul unei extensii instalate: fișierul numit de manifest, din pachetul ei', () => {
  assert.deepEqual(octetiSemn(instalata({ pictograma: 'semn.svg' }, { 'semn.svg': SVG })), SVG);
});

test('fără semn: un manifest fără câmp, un fișier lipsă din rândul instalat, un fișier care nu e SVG', () => {
  assert.equal(octetiSemn(instalata({}, { 'semn.svg': SVG })), null, 'manifestul nu-l numește');
  assert.equal(octetiSemn(instalata({ pictograma: 'semn.svg' }, {})), null, 'fișierul lipsește');
  assert.equal(octetiSemn(instalata({ pictograma: 'semn.svg' }, { 'semn.svg': new TextEncoder().encode('<html></html>') })), null, 'nu e SVG');
  // O cheie a prototipului nu e un fișier al pachetului.
  assert.equal(octetiSemn(instalata({ pictograma: 'constructor' }, {})), null);
});

test('semnul unui rând din bibliotecă: fișierul de lângă catalog; fără el, nimic', () => {
  const rand = { id: 'proba', pictograma: { fisier: 'proba-pictograma-0123abcd.svg', octeti: 100 } } as RandBiblioteca;
  assert.equal(adresaSemnCatalog(rand, 'https://exemplu.test/extensii/catalog.json'), 'https://exemplu.test/extensii/proba-pictograma-0123abcd.svg');
  assert.equal(adresaSemnCatalog({ id: 'proba' } as RandBiblioteca, 'https://exemplu.test/extensii/catalog.json'), null);
});
