/**
 * Importul DXF prin dialog (ADR 0101 §8): formatul după nume și tip, previzualizarea (mărimea, laturile din imbricare,
 * unitățile), piesa (numele fără extensie, numele straturilor pe elemente, desenul unde e în fișier) și acțiunea, care în
 * Node merge întreagă (ușa DXF nu cere DOMParser).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { creeazaRegistru, ruleaza } from '../../src/ui/actiuni.ts';
import { formatImport } from '../../src/io/formatImport.ts';
import { ACTIUNI_IMPORT, type PrevizualizareImport } from '../../src/ui/actiuniImport.ts';
import { previzualizare } from '../../src/ui/actiuniImportCalcul.ts';
import { cerc, dxf, inMm, linie, octeti } from './ajutor-dxf.ts';

// Un dreptunghi 60 × 40 din patru linii, în (100, 50), cu o gaură R5 și o linie deschisă de gravat, pe straturi.
const DESEN = linie(100, 50, 160, 50, { strat: 'TAIERE' }) + linie(160, 50, 160, 90, { strat: 'TAIERE' }) + linie(160, 90, 100, 90, { strat: 'TAIERE' })
  + linie(100, 90, 100, 50, { strat: 'TAIERE' }) + cerc(130, 70, 5, { strat: 'GAURI' }) + linie(110, 60, 120, 60, { strat: 'GRAVARE' });

test('formatul importului: după extensie, apoi după tipul MIME; altul, nimic', () => {
  assert.equal(formatImport('logo.SVG', ''), 'svg');
  assert.equal(formatImport('piesa.dxf', ''), 'dxf');
  assert.equal(formatImport('Piesa.DXF', 'application/octet-stream'), 'dxf');
  assert.equal(formatImport('fara-extensie', 'image/svg+xml'), 'svg');
  for (const t of ['image/vnd.dxf', 'application/dxf', 'image/x-dxf', 'application/x-dxf']) assert.equal(formatImport('x', t), 'dxf');
  assert.equal(formatImport('nota.txt', 'text/plain'), null);
});

test('previzualizarea DXF: mărimea desenului, exteriorul și gaura din imbricare, calea deschisă, unitățile; piesa unde e în fișier', async () => {
  const p = await previzualizare({ nume: 'Raft lateral.dxf', octeti: inMm(DESEN) }, { pxPeTol: 96, limba: 'ro' });
  assert.ok(p.ok && p.format === 'dxf');
  assert.deepEqual([p.latime, p.inaltime, p.exterioare, p.interioare, p.deschise], [60, 40, 1, 1, 1]);
  assert.deepEqual(p.unitati, { mmPeUnitate: 1, declarate: true, unitate: 'mm' });
  assert.equal(p.avertismente.unite, 4);
  assert.equal(p.pregatit.nume, 'Raft lateral');
  const { piesa, x, y } = p.pregatit.piesa('p1', {});
  // Originea DXF-ului e originea foii: instanța stă în colțul cutiei desenului, unde e în fișier.
  assert.deepEqual([x, y], [100, 50]);
  const rad = piesa.radacina;
  assert.ok(rad.tip === 'grup');
  assert.deepEqual(rad.copii.map((e) => (e.tip === 'element' ? e.nume : e.tip)), ['TAIERE', 'GAURI', 'GRAVARE']);
  assert.deepEqual(piesa.operatii.map((o) => [o.id, o.latura, o.noduri.length]), [['exterior', 'exterior', 1], ['interior', 'interior', 1], ['deschise', 'pe-linie', 1]]);
});

test('previzualizarea DXF fără unități: mm, apoi unitatea aleasă (țol: desenul de 25,4 ori mai mare)', async () => {
  const f = { nume: 'vechi.dxf', octeti: octeti(dxf({ entitati: DESEN })) };
  const mm = await previzualizare(f, { pxPeTol: 96, limba: 'ro' });
  assert.ok(mm.ok && mm.format === 'dxf');
  assert.deepEqual(mm.unitati, { mmPeUnitate: 1, declarate: false, unitate: 'mm' });
  assert.equal(mm.avertismente['unitati-nedeclarate'], 1);
  const inch = await previzualizare(f, { pxPeTol: 96, limba: 'ro', unitate: 'inch' });
  assert.ok(inch.ok && inch.format === 'dxf');
  assert.deepEqual([inch.latime, inch.inaltime], [60 * 25.4, 40 * 25.4]);
  assert.deepEqual(inch.pregatit.piesa('p1', {}).x, 100 * 25.4);
});

test('refuzurile DXF poartă formatul (dialogul alege raportul după el)', async () => {
  const bin = await previzualizare({ nume: 'b.dxf', octeti: new Uint8Array([...octeti('AutoCAD Binary DXF\r\n'), 0x1a, 0]) }, { pxPeTol: 96, limba: 'ro' });
  assert.deepEqual(bin, { ok: false, cod: 'binar', format: 'dxf' });
  const gol = await previzualizare({ nume: 'g.dxf', octeti: inMm('') }, { pxPeTol: 96, limba: 'ro' });
  assert.ok(!gol.ok && gol.cod === 'gol' && gol.format === 'dxf');
  assert.deepEqual(await previzualizare({ nume: 'x.txt', octeti: new Uint8Array() }, { pxPeTol: 96, limba: 'ro' }), { ok: false, cod: 'tip' });
});

test('acțiunea importului citește un DXF cu unitatea din context (ușa încărcată la cerere)', async () => {
  const r = creeazaRegistru(ACTIUNI_IMPORT, () => true);
  const p = await new Promise<PrevizualizareImport>((rez) => {
    ruleaza(r, 'import.svg', {
      fisier: () => ({ nume: 'vechi.dxf', octeti: octeti(dxf({ entitati: DESEN })) }),
      pxPeTol: () => 96,
      unitate: () => 'cm',
      limba: () => 'ro',
      doarCitire: () => false,
      rezultat: rez,
    });
  });
  assert.ok(p.ok && p.format === 'dxf');
  assert.deepEqual([p.latime, p.inaltime, p.unitati.unitate], [600, 400, 'cm']);
});
