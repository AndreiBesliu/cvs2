import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cutiiAlese, idGhidaj, tinteFoaie } from '../../src/app/editareCalcul.ts';
import { pasRigla } from '../../src/canvas/gradatii.ts';
import { lipeste } from '../../src/geom/lipire.ts';
import type { Document } from '../../src/model/document.ts';
import { docDin, ID } from './ajutor-document.ts';

/** Editarea pe pânză (ADR 0050): țintele foii, cutiile instanțelor alese, id-ul ghidajului nou, gradațiile riglelor. */

const STOC = { latime: 300, inaltime: 200, grosime: 18 };

/** Un dreptunghi de 40 × 20 la (50, 60), un cerc de rază 10 la (200, 100) și o cale deschisă (10, 10) → (30, 10). */
function document(): Document {
  const d = docDin(STOC,
    { id: 'r', forma: { tip: 'dreptunghi', latime: 40, inaltime: 20, razaColt: 0 }, matrice: { ...ID, e: 50, f: 60 } },
    { id: 'c', forma: { tip: 'cerc', raza: 10 }, matrice: { ...ID, e: 200, f: 100 } },
    { id: 'l', forma: { tip: 'cale', inchis: false, varfuri: [{ p: { x: 0, y: 0 }, s: { tip: 'L' } }, { p: { x: 20, y: 0 }, s: { tip: 'L' } }] }, matrice: { ...ID, e: 10, f: 10 } });
  const f = d.foi[0];
  if (f) f.ghidaje = [{ id: 'g1', axa: 'x', poz: 123 }];
  return d;
}

test('țintele foii: foaia, ghidajele, cutiile celorlalte forme și capetele căilor deschise; fără cele alese', () => {
  const d = document();
  const t = tinteFoaie(d, new Set(['r']), true);
  const x = t.x.map((v) => `${v.fel}:${v.poz}`);
  for (const a of ['foaie:0', 'foaie:150', 'foaie:300', 'ghidaj:123', 'forma:190', 'forma:200', 'forma:210', 'forma:10', 'forma:30']) assert.ok(x.includes(a), a);
  assert.ok(!x.some((v) => v === 'forma:50' || v === 'forma:90'), 'dreptunghiul ales nu e țintă');
  assert.ok(!tinteFoaie(d, new Set(), false).x.some((v) => v.fel === 'ghidaj'), 'fără ghidaje la cerere');
  // Capătul căii (30, 10) e țintă pe ambele axe.
  assert.ok(t.y.some((v) => v.poz === 10 && v.fel === 'forma' && v.de === 30 && v.la === 30));
  // Sortate după poziție (căutarea binară o cere).
  assert.deepEqual(t.x.map((v) => v.poz), [...t.x.map((v) => v.poz)].sort((a, b) => a - b));
});

test('lipirea pe documentul real: dreptunghiul ales se lipește de ghidaj și de mijlocul cercului', () => {
  const d = document();
  const [r] = cutiiAlese(d, new Set(['r']));
  assert.deepEqual(r, { id: 'r', cutie: { minX: 50, minY: 60, maxX: 90, maxY: 80 } });
  const t = tinteFoaie(d, new Set(['r']), true);
  // Marginea dreaptă la 122,6 (dx = 32,6): ghidajul de la 123 trage, la 1 mm toleranță.
  assert.equal(lipeste(t, r?.cutie ?? { minX: 0, minY: 0, maxX: 0, maxY: 0 }, 32.6, 0, { toleranta: 1, grila: null }).dx, 33);
  // Mijlocul pe y (70 + dy) la 99,5: mijlocul cercului (100).
  assert.equal(lipeste(t, r?.cutie ?? { minX: 0, minY: 0, maxX: 0, maxY: 0 }, 0, 29.5, { toleranta: 1, grila: null }).dy, 30);
});

test('id-ul unui ghidaj nou e liber', () => {
  assert.equal(idGhidaj([]), 'g1');
  assert.equal(idGhidaj([{ id: 'g1', axa: 'x', poz: 0 }, { id: 'g2', axa: 'y', poz: 0 }]), 'g3');
  assert.equal(idGhidaj([{ id: 'g2', axa: 'x', poz: 0 }]), 'g3');
});

test('gradațiile: 1, 2 sau 5 × 10ⁿ mm, cel puțin 64 px între etichete; diviziunile mici după mantisă', () => {
  assert.deepEqual(pasRigla(1), { mare: 100, mic: 10 }, '1 px/mm: 64 mm → 100');
  assert.deepEqual(pasRigla(4), { mare: 20, mic: 5 }, '4 px/mm: 16 mm → 20');
  assert.deepEqual(pasRigla(10), { mare: 10, mic: 1 });
  assert.deepEqual(pasRigla(20), { mare: 5, mic: 1 });
  assert.deepEqual(pasRigla(1000).mare, 0.1);
  for (const s of [0.01, 0.37, 1, 3.3, 77, 1000]) assert.ok(pasRigla(s).mare * s >= 64 - 1e-9, String(s));
});
