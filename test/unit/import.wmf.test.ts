/**
 * Importul WMF prin dialog (ADR 0117 §1, §5, §9): formatul după nume și tip (cu EMF-ul, în familia metafișierelor), ușa după
 * antet pentru un fișier fără extensie cunoscută, previzualizarea (mărimea desenului, laturile din imbricare, cadrul
 * antetului ca pagină), unitatea aleasă a unui fișier fără antet, refuzurile cu formatul și acțiunea. Valorile sunt cele
 * din corpusul redat de GDI (`test/fixtures/wmf/asteptat.json`), recitite pe hârtie.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { formatDupaAntet, formatImport } from '../../src/io/formatImport.ts';
import { numeDinFisier } from '../../src/io/piesa.ts';
import { creeazaRegistru, ruleaza } from '../../src/ui/actiuni.ts';
import { ACTIUNI_IMPORT, type PrevizualizareImport } from '../../src/ui/actiuniImport.ts';
import { previzualizare } from '../../src/ui/actiuniImportCalcul.ts';
import { B } from './ajutor-pdf.ts';

const fixtura = (nume: string): Uint8Array => new Uint8Array(readFileSync(new URL(`../fixtures/wmf/${nume}`, import.meta.url)));
const O = { pxPeTol: 96, limba: 'ro' } as const;
const aproape = (a: number, b: number): boolean => Math.abs(a - b) <= 1e-6;

test('formatul: .wmf, .apm și .emf (pe care îl refuză ușa), apoi tipurile MIME ale metafișierelor; numele piesei fără extensie', () => {
  for (const n of ['sigla.wmf', 'SIGLA.WMF', 'x.apm', 'x.emf', 'x.EMF']) assert.equal(formatImport(n, ''), 'wmf', n);
  for (const t of ['image/wmf', 'image/x-wmf', 'application/x-msmetafile', 'windows/metafile', 'image/emf', 'image/x-emf']) {
    assert.equal(formatImport('x', t), 'wmf', t);
  }
  assert.equal(formatImport('x.wmz', ''), null);
  assert.equal(numeDinFisier('Rama ovala.wmf'), 'Rama ovala');
  assert.equal(numeDinFisier('x.EMF'), 'x');
});

test('ușa după antet: cheia placeable, antetul standard al unui WMF și antetul EMF → wmf; PostScript și PDF ca înainte', () => {
  assert.equal(formatDupaAntet(fixtura('forme.wmf')), 'wmf');
  assert.equal(formatDupaAntet(fixtura('fara-antet.wmf')), 'wmf');
  assert.equal(formatDupaAntet(fixtura('desen.emf')), 'wmf');
  assert.equal(formatDupaAntet(Uint8Array.from([2, 0, 9, 0, 0, 3])), 'wmf');
  assert.equal(formatDupaAntet(Uint8Array.from([3, 0, 9, 0, 0, 3])), null);
  assert.equal(formatDupaAntet(B('%!PS-Adobe-3.0 EPSF-3.0\n')), 'eps');
  assert.equal(formatDupaAntet(B('%PDF-1.7\n')), 'pdf');
});

test('previzualizarea WMF cu antet: mărimea, laturile din imbricare; piesa stă pe foaie unde e desenul în cadru', async () => {
  const p = await previzualizare({ nume: 'forme.wmf', octeti: fixtura('forme.wmf') }, O);
  assert.ok(p.ok && p.format === 'wmf');
  // Cutia desenului: de la (12,7, 6,35) la (196,85, 139,7) mm, în cadrul de 203,2 × 152,4.
  assert.ok(aproape(p.latime, 184.15) && aproape(p.inaltime, 133.35), `${p.latime} × ${p.inaltime}`);
  // 11 contururi închise: golul PolyPolygon-ului par-impar e interior, celelalte 10 exterioare; 3 căi deschise.
  assert.deepEqual([p.exterioare, p.interioare, p.deschise], [10, 1, 3]);
  assert.deepEqual([p.unitati.sursa, p.unitati.inch], ['antet', 1440]);
  assert.equal(p.avertismente['sarit-text'], 1);
  assert.equal(p.pregatit.nume, 'forme');
  // Cadrul e pagina: colțul stânga-jos al desenului, (12,7, 6,35) mm, e unde stă instanța.
  const { x, y } = p.pregatit.piesa('p1', {});
  assert.ok(aproape(x, 12.7) && aproape(y, 6.35), `${x}, ${y}`);
});

test('fără antet: unitatea aleasă (implicit 1/96 țol) schimbă mărimea; desenul vine în colțul foii; HIMETRIC e declarat', async () => {
  const f = { nume: 'fara-antet.wmf', octeti: fixtura('fara-antet.wmf') };
  const px = await previzualizare(f, O);
  assert.ok(px.ok && px.format === 'wmf');
  // Desenul are 720 × 520 de unități: la 1/96 țol, 190,5 × 137,58… mm; în mm, 720 × 520.
  assert.ok(aproape(px.latime, (720 * 25.4) / 96) && aproape(px.inaltime, (520 * 25.4) / 96), `${px.latime} × ${px.inaltime}`);
  assert.deepEqual([px.unitati.sursa, px.unitati.unitate, px.avertismente['unitati-nedeclarate']], ['aleasa', 'px', 1]);
  assert.deepEqual(px.pregatit.piesa('p1', {}).x, 0);
  const mm = await previzualizare(f, { ...O, unitateWmf: 'mm' });
  assert.ok(mm.ok && mm.format === 'wmf');
  assert.deepEqual([mm.latime, mm.inaltime, mm.unitati.unitate], [720, 520, 'mm']);
  const himetric = await previzualizare({ nume: 'himetric.wmf', octeti: fixtura('himetric.wmf') }, { ...O, unitateWmf: 'mm' });
  assert.ok(himetric.ok && himetric.format === 'wmf');
  assert.deepEqual([himetric.unitati.sursa, himetric.unitati.mmPeUnitateMapare, himetric.avertismente['unitati-nedeclarate']], ['mapare', 0.01, 0]);
  assert.ok(aproape(himetric.latime, 70) && aproape(himetric.inaltime, 50), `${himetric.latime} × ${himetric.inaltime}`);
});

test('refuzurile WMF poartă formatul și motivul: EMF-ul, fișierul rupt (cu octetul), golul (cu textul numărat), un fișier străin', async () => {
  assert.deepEqual(await previzualizare({ nume: 'desen.emf', octeti: fixtura('desen.emf') }, O), { ok: false, cod: 'emf', format: 'wmf' });
  const rupt = await previzualizare({ nume: 'rupt.wmf', octeti: fixtura('rupt.wmf') }, O);
  assert.ok(!rupt.ok);
  assert.deepEqual([rupt.cod, rupt.detaliu, rupt.format], ['wmf', '40', 'wmf']);
  const text = await previzualizare({ nume: 'text.wmf', octeti: fixtura('text.wmf') }, O);
  assert.ok(!text.ok && text.cod === 'gol' && text.format === 'wmf');
  assert.equal(text.avertismente && 'sarit-text' in text.avertismente ? text.avertismente['sarit-text'] : -1, 1);
  assert.deepEqual(await previzualizare({ nume: 'nota.wmf', octeti: B('doar text, nu un metafișier') }, O), { ok: false, cod: 'nu-e-wmf', format: 'wmf' });
  // Fără extensie cunoscută, după antet.
  const fara = await previzualizare({ nume: 'desen', octeti: fixtura('arce.wmf') }, O);
  assert.ok(fara.ok && fara.format === 'wmf');
});

test('acțiunea importului citește un WMF fără antet cu unitatea WMF din context (ușa încărcată la cerere)', async () => {
  const r = creeazaRegistru(ACTIUNI_IMPORT, () => true);
  const p = await new Promise<PrevizualizareImport>((rez) => {
    ruleaza(r, 'import.svg', {
      fisier: () => ({ nume: 'fara-antet.wmf', octeti: fixtura('fara-antet.wmf') }),
      pxPeTol: () => 96,
      unitate: () => 'inch',
      unitateWmf: () => 'mm10',
      limba: () => 'ro',
      doarCitire: () => false,
      rezultat: rez,
    });
  });
  assert.ok(p.ok && p.format === 'wmf');
  assert.ok(aproape(p.latime, 72) && aproape(p.inaltime, 52), `${p.latime} × ${p.inaltime}`);
  assert.deepEqual([p.exterioare, p.interioare, p.deschise, p.unitati.unitate], [2, 0, 1, 'mm10']);
});
