/**
 * Toroidala la finisarea reliefului, în model (felia 18.1↑e-1, ADR 0319): felul ei (`formaFinisare`), creasta pe un plan pe hârtie
 * (`creastaPePlan`: ρ − √(ρ² − ((s − 2a) / 2)²) peste 2a, zero sub, față de oracolul 3D), freza scrisă de panou (`frezaFinisare`:
 * raza colțului păstrată pe aceeași formă, altfel cea implicită, sub jumătatea diametrului) și rolul de finisare, care o păstrează.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { creastaPePlan, formaFinisare } from '../../src/model/finisare.ts';
import { frezaFinisare, frezaPentruRol } from '../../src/model/rol.ts';
import { VERSIUNE_SCHEMA, type Document, type Scula } from '../../src/model/document.ts';
import { creastaPlanFreza } from '../oracles/relief3d.ts';

const doc: Document = { schema: VERSIUNE_SCHEMA, rev: 0, piese: [], foi: [{ id: 'f', stoc: { latime: 100, inaltime: 100, grosime: 18 }, instante: [] }] };
const tor = (diametru: number, raza: number): Scula => ({ numar: 3, nume: 'freza toroidala', diametru, forma: { tip: 'toroidala', raza } });

test('felul și creasta pe hârtie: toroidala, ca oracolul 3D', () => {
  assert.equal(formaFinisare(tor(6, 1)), 'toroidala');
  for (const [D, r, s] of [[6, 1, 5], [6, 2, 3], [6, 1, 3.5], [4, 0.5, 3.5], [6, 2.9, 0.6]] as const) {
    const h = creastaPePlan(tor(D, r), s);
    assert.ok(h !== null && Math.abs(h - creastaPlanFreza({ fel: 'toroidala', R: D / 2, rho: r }, s)) < 1e-12, `Ø${D} r${r} s${s}: ${h}`);
  }
  // Sub 2a, discurile plate se ating: fără creastă; peste diametru, nimic.
  assert.equal(creastaPePlan(tor(6, 1), 4), 0);
  assert.equal(creastaPePlan(tor(6, 1), 6.5), null);
});

test('freza scrisă de panou: toroidala cu raza colțului păstrată, ori cea implicită (cel mult 1 mm și sub Ø / 4)', () => {
  const t = frezaFinisare(doc, tor(6, 1.5), 'toroidala', 8);
  assert.deepEqual(t.forma, { tip: 'toroidala', raza: 1.5 });
  assert.equal(t.diametru, 8);
  assert.equal(t.nume, 'freza toroidala r1.5');
  // Aceeași freză: neatinsă.
  const s = tor(6, 1.5);
  assert.equal(frezaFinisare(doc, s, 'toroidala', 6), s);
  // Din bilă, toroidala cu raza implicită: 1 mm; la Ø2, Ø / 4 = 0,5.
  assert.deepEqual(frezaFinisare(doc, { numar: 1, nume: 'freza bila', diametru: 6, forma: { tip: 'bila' } }, 'toroidala', 6).forma, { tip: 'toroidala', raza: 1 });
  assert.deepEqual(frezaFinisare(doc, { numar: 1, nume: 'freza bila', diametru: 2, forma: { tip: 'bila' } }, 'toroidala', 2).forma, { tip: 'toroidala', raza: 0.5 });
  // Un diametru nou sub dublul razei vechi: raza implicită (Ø3 cu r1,5 nu mai e toroidală).
  assert.deepEqual(frezaFinisare(doc, tor(6, 1.5), 'toroidala', 3).forma, { tip: 'toroidala', raza: 0.75 });
  // Raza scrisă, pe aceeași formă.
  assert.deepEqual(frezaFinisare(doc, tor(6, 1.5), 'toroidala', 6, 2).forma, { tip: 'toroidala', raza: 2 });
  // Înapoi la bilă: fără rază.
  assert.deepEqual(frezaFinisare(doc, tor(6, 1.5), 'bila', 6).forma, { tip: 'bila' });
  // Rolul de finisare păstrează toroidala (ca bila).
  const r = tor(6, 1);
  assert.equal(frezaPentruRol(doc, r, 'finisare'), r);
});
