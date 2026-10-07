/**
 * Exportul din aplicație și ieșirea din foaie: fără confirmare nu se scrie nimic; confirmarea acoperă exact ieșirea
 * văzută de om; cu ea, antetul poartă declarația. Fără ieșire, exportul rămâne cel de până acum.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { documentNou, type Document, type ElementDoc } from '../../src/model/document.ts';
import { calculeazaExport } from '../../src/ui/actiuniExportCalcul.ts';
import type { ParametriExport } from '../../src/ui/actiuniExportTipuri.ts';

const ID = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const insula = (x: number): ElementDoc => ({ id: 'e1', forma: { tip: 'dreptunghi', latime: 100, inaltime: 60, razaColt: 0 }, matrice: { ...ID, e: x, f: 20 } });
const gaura: ElementDoc = { id: 'e2', forma: { tip: 'cerc', raza: 15 }, matrice: { ...ID, e: 70, f: 50 } };
const doc = (...elemente: ElementDoc[]): Document => ({ ...documentNou({ latime: 300, inaltime: 200, grosime: 18 }), elemente });
const P: ParametriExport = { origine: 'stanga-jos', z0: 'sus', diametruScula: 6, elemente: new Map() };
const faraComentarii = (t: string): string[] => t.split('\n').filter((l) => l !== '' && !l.startsWith('('));

test('fără ieșire: exportul e cel de dinainte (liniile plăcii 1 A), fără nicio declarație', async () => {
  const r = await calculeazaExport(doc(insula(20), gaura), P);
  assert.ok(r.ok, r.ok ? '' : r.motiv);
  if (!r.ok) return;
  const aur = readFileSync(new URL('../placi/placa-01/placa-01-A.nc', import.meta.url), 'ascii');
  assert.deepEqual(faraComentarii(r.program.text), faraComentarii(aur));
  assert.ok(!r.program.text.includes('CONFIRMAT'));
});

test('cu ieșire și fără confirmare: nu se scrie nimic, iar rezultatul spune cât și unde iese', async () => {
  const r = await calculeazaExport(doc(insula(1)), P);
  assert.equal(r.ok, false);
  assert.ok(!r.ok && 'cereConfirmare' in r);
  if (r.ok || !('cereConfirmare' in r)) return;
  assert.deepEqual(r.cereConfirmare.depasire, { stanga: 5, dreapta: 0, jos: 0, sus: 0 });
  assert.deepEqual(r.cereConfirmare.etichete, ['e1: dreptunghi, exterior, 3 mm']);
});

test('confirmarea acoperă doar ieșirea văzută: alta (freza Ø8, deci 7 mm în loc de 5) cere din nou confirmare', async () => {
  const vazuta = { stanga: 5, dreapta: 0, jos: 0, sus: 0 };
  const r = await calculeazaExport(doc(insula(1)), { ...P, diametruScula: 8, confirmareIesire: vazuta });
  assert.ok(!r.ok && 'cereConfirmare' in r);
  if (r.ok || !('cereConfirmare' in r)) return;
  // Freza Ø8 (R4): centrul la 1 − 4 = −3, discul la −7.
  assert.deepEqual(r.cereConfirmare.depasire, { stanga: 7, dreapta: 0, jos: 0, sus: 0 });
});

test('cu confirmarea exactă: programul iese, cu declarația în antet, pe orice colț de origine', async () => {
  for (const origine of ['stanga-jos', 'dreapta-sus'] as const) {
    const r = await calculeazaExport(doc(insula(1)), { ...P, origine, confirmareIesire: { stanga: 5, dreapta: 0, jos: 0, sus: 0 } });
    assert.ok(r.ok, r.ok ? '' : r.motiv);
    if (!r.ok) return;
    const linii = r.program.text.split('\n');
    const i = linii.indexOf('(CONFIRMAT: freza iese din foaie)');
    assert.ok(i > 0, origine);
    assert.equal(linii[i + 1], '(iesire mm: st 5.000 dr 0.000 jos 0.000 sus 0.000)');
    // Declarația vine înaintea oricărei mișcări.
    assert.ok(linii.findIndex((l) => /^G[0-3] /.test(l)) > i + 1);
  }
});

test('o ieșire peste plafonul unei foi întregi (10 000 mm) e o greșeală de poziție: refuzată, nu confirmabilă', async () => {
  const r = await calculeazaExport(doc(insula(-20_000)), { ...P, confirmareIesire: { stanga: 20_003, dreapta: 0, jos: 0, sus: 0 } });
  assert.equal(r.ok, false);
  assert.ok(!r.ok && !('cereConfirmare' in r));
});

test('acordul cu oracolul independent: pe o grilă de poziții, freze, profile și montaje, declarația trece poarta, iar fără ea poarta prinde ieșirea', async () => {
  const { poarta } = await import('../oracles/poarta.ts');
  let cuIesire = 0;
  let faraIesire = 0;
  // Forme lângă fiecare latură a foii de 300 × 200, înăuntru, lipite, peste margine; dreptunghiuri și cercuri.
  const pozitii: Array<readonly [number, number]> = [[20, 20], [3, 20], [-0.5, 100], [-40, 70], [195, 130], [205, 141], [150, -2], [100, 1.25]];
  for (const [x, y] of pozitii) {
    for (const forma of ['dreptunghi', 'cerc'] as const) {
      const e: ElementDoc = forma === 'dreptunghi'
        ? { id: 'e1', forma: { tip: 'dreptunghi', latime: 100, inaltime: 60, razaColt: 4 }, matrice: { ...ID, e: x, f: y } }
        : { id: 'e1', forma: { tip: 'cerc', raza: 15 }, matrice: { ...ID, e: x + 15, f: y + 15 } };
      for (const latura of ['exterior', 'interior', 'pe-linie'] as const) {
        for (const diametruScula of [3.175, 6]) {
          for (const [origine, z0] of [['stanga-jos', 'sus'], ['dreapta-sus', 'jos']] as const) {
            const p: ParametriExport = { ...P, origine, z0, diametruScula, elemente: new Map([['e1', { latura, adancime: 3, pas: 3 }]]) };
            let r = await calculeazaExport(doc(e), p);
            if (!r.ok && 'cereConfirmare' in r) r = await calculeazaExport(doc(e), { ...p, confirmareIesire: r.cereConfirmare.depasire });
            assert.ok(r.ok, r.ok ? '' : `${forma} ${x},${y} ${latura} Ø${diametruScula}: ${r.motiv}`);
            if (!r.ok) continue;
            const ctx = {
              foaie: { latime: 300, inaltime: 200, grosime: 18 }, origine, z0, diametruScula, pas: 3, supracursa: 0, asteptareAx: 3,
            };
            const caz = `${forma} ${x},${y} ${latura} Ø${diametruScula} ${origine}`;
            assert.deepEqual(poarta(r.program.text, ctx), [], caz);
            if (r.program.text.includes('(CONFIRMAT: freza iese din foaie)')) {
              cuIesire++;
              const fara = r.program.text.split('\n').filter((l) => !l.startsWith('(CONFIRMAT') && !l.startsWith('(iesire mm')).join('\n');
              assert.ok(poarta(fara, ctx).some((i) => i.invarianta === 5), `fără declarație, poarta trebuie să prindă: ${caz}`);
            } else {
              faraIesire++;
            }
          }
        }
      }
    }
  }
  // Grila are ambele feluri de cazuri, altfel n-ar proba nimic.
  assert.ok(cuIesire > 20 && faraIesire > 20, `cu ieșire ${cuIesire}, fără ${faraIesire}`);
});
