/**
 * Lanțul întreg, pe placa 1: conturul → profilul (offset + treceri) → IR → postul GRBL → poarta invariantelor.
 * Valorile sunt pe hârtie. Poarta (`test/oracles/poarta.ts`) citește programul fără nimic din `src/`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { profil } from '../../src/cam/profil.ts';
import { traseuProfil } from '../../src/cam/traseu.ts';
import { conturCerc, conturDreptunghi, type Contur } from '../../src/geom/contur.ts';
import { AXE_XYZ, type Program } from '../../src/ir/ir.ts';
import { COLTURI, type Montaj } from '../../src/ir/montaj.ts';
import { GRBL_11 } from '../../src/post/contracte/grbl11.ts';
import { posteaza } from '../../src/post/post.ts';
import { poarta, type ContextPoarta } from '../oracles/poarta.ts';

const FOAIA = { latime: 140, inaltime: 100, grosime: 18 };

function gcode(c: Contur, latura: 'exterior' | 'interior', adancime: number, pas: number, montaj: Montaj, sens: 'urcare' | 'opozitie' = 'urcare'): string {
  const p = profil(c, { latura, sens, diametruScula: 6, adancime, pas });
  assert.ok(p.ok, p.ok ? '' : p.motiv);
  if (!p.ok) return '';
  const t = traseuProfil(p.treceri, { zSigur: 5, avans: 1000, avansPlonjare: 300 });
  assert.ok(t.ok, t.ok ? '' : t.motiv);
  if (!t.ok) return '';
  const program: Program = {
    axe: AXE_XYZ, scula: { numar: 1, nume: 'freza plata', diametru: 6 }, turatie: 18000, zSigur: 5, miscari: t.miscari,
  };
  const r = posteaza(program, montaj, GRBL_11, { asteptareAx: 3 });
  assert.ok(r.ok, r.ok ? '' : r.motiv);
  return r.ok ? r.text : '';
}

const STANGA_JOS: Montaj = { foaie: FOAIA, origine: 'stanga-jos', z0: 'sus' };
const contextPentru = (m: Montaj, pas: number, cadru: ContextPoarta['cadru']): ContextPoarta => ({
  foaie: m.foaie, origine: m.origine, z0: m.z0, diametruScula: 6, pas, supracursa: 0, asteptareAx: 3,
  ...(cadru ? { cadru } : {}),
});

test('gaura Ø30 cu freza Ø6, 8 mm în două treceri, în urcare: arce G2 (orar, ADR 0027) cu raza 12, la Z-4 și Z-8, și poarta trece', () => {
  const t = gcode(conturCerc(70, 50, 15), 'interior', 8, 4, STANGA_JOS);
  const linii = t.split('\n');
  assert.ok(linii.includes('G1 Z-4.000 F300.0') && linii.includes('G1 Z-8.000 F300.0'), t);
  // Un G0 spre poziția curentă nu se scrie: după ridicare, nu urmează încă o ridicare la același Z.
  for (let i = 1; i < linii.length; i++) assert.notEqual(`${linii[i - 1]}|${linii[i]}`, 'G0 Z5.000|G0 Z5.000', `linia ${i}`);
  const arce = linii.filter((l) => /^G2 /.test(l));
  assert.equal(linii.filter((l) => /^G3 /.test(l)).length, 0, 'niciun arc trigonometric în gaura tăiată în urcare');
  assert.equal(arce.length, 4, `două arce pe fiecare trecere:\n${arce.join('\n')}`);
  for (const a of arce) {
    const i = Number(/I(-?[\d.]+)/.exec(a)?.[1]);
    const j = Number(/J(-?[\d.]+)/.exec(a)?.[1]);
    assert.ok(Math.abs(Math.hypot(i, j) - 12) <= 0.0015, `${a}: raza ${Math.hypot(i, j)}`);
  }
  assert.deepEqual(poarta(t, contextPentru(STANGA_JOS, 4, { minX: 58, maxX: 82, minY: 38, maxY: 62 })), []);
});

test('insula 100 × 60 pe exterior, o trecere de 3: patru colțuri G3 de R3, cutia 17…123 × 17…83, poarta trece', () => {
  const t = gcode(conturDreptunghi(20, 20, 100, 60), 'exterior', 3, 3, STANGA_JOS);
  const colturi = t.split('\n').filter((l) => /^G3 /.test(l));
  assert.equal(colturi.length, 4, colturi.join('\n'));
  for (const a of colturi) {
    const i = Number(/I(-?[\d.]+)/.exec(a)?.[1]);
    const j = Number(/J(-?[\d.]+)/.exec(a)?.[1]);
    assert.ok(Math.abs(Math.hypot(i, j) - 3) <= 0.0015, a);
  }
  assert.deepEqual(poarta(t, contextPentru(STANGA_JOS, 3, { minX: 17, maxX: 123, minY: 17, maxY: 83 })), []);
});

test('invarianta 8 pe cele 4 colțuri, cu Z0 sus și jos: aceeași cutie pe hârtie, în document, pentru toate opt', () => {
  const cadru = { minX: 17, maxX: 123, minY: 17, maxY: 83 };
  for (const origine of COLTURI) {
    for (const z0 of ['sus', 'jos'] as const) {
      const m: Montaj = { foaie: FOAIA, origine, z0 };
      const t = gcode(conturDreptunghi(20, 20, 100, 60), 'exterior', 3, 3, m);
      assert.deepEqual(poarta(t, contextPentru(m, 3, cadru)), [], `${origine}, Z0 ${z0}`);
    }
  }
});

test('controlul invariantei 8: programul de stânga-jos, judecat ca dreapta-sus, e prins', () => {
  const t = gcode(conturDreptunghi(20, 20, 100, 60), 'exterior', 3, 3, STANGA_JOS);
  const gresit: Montaj = { ...STANGA_JOS, origine: 'dreapta-sus' };
  const inv = poarta(t, contextPentru(gresit, 3, { minX: 17, maxX: 123, minY: 17, maxY: 83 })).map((i) => i.invarianta);
  assert.ok(inv.includes(8), JSON.stringify(inv));
});

test('sensul de tăiere (ADR 0027): urcare și opoziție dau aceleași puncte, cu arcele întoarse, din aceeași pornire', () => {
  for (const [c, latura] of [[conturCerc(70, 50, 15), 'interior'], [conturDreptunghi(20, 20, 100, 60), 'exterior']] as const) {
    const u = gcode(c, latura, 3, 3, STANGA_JOS, 'urcare').split('\n');
    const o = gcode(c, latura, 3, 3, STANGA_JOS, 'opozitie').split('\n');
    // Exteriorul în urcare și gaura în opoziție merg trigonometric (G3); celelalte două, orar (G2).
    const trig = latura === 'exterior' ? u : o;
    const orar = latura === 'exterior' ? o : u;
    assert.ok(trig.some((l) => /^G3 /.test(l)) && !trig.some((l) => /^G2 /.test(l)), `${latura}: trigonometric`);
    assert.ok(orar.some((l) => /^G2 /.test(l)) && !orar.some((l) => /^G3 /.test(l)), `${latura}: orar`);
    // Aceeași primă poziție (pornirea rămâne vârful 0) și același număr de linii.
    assert.equal(u.find((l) => l.startsWith('G0 X')), o.find((l) => l.startsWith('G0 X')));
    assert.equal(u.length, o.length);
  }
});

