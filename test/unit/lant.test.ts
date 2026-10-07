/**
 * Lanțul întreg, pe placa 1: conturul → profilul (offset + treceri) → IR → postul GRBL. Valorile sunt pe hârtie.
 * Oracolul independent (felia 1.6) citește apoi programul fără nimic din `src/`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { profil } from '../../src/cam/profil.ts';
import { traseuProfil } from '../../src/cam/traseu.ts';
import { conturCerc, conturDreptunghi } from '../../src/geom/contur.ts';
import { AXE_XYZ, type Program } from '../../src/ir/ir.ts';
import { GRBL_11 } from '../../src/post/contracte/grbl11.ts';
import { posteaza } from '../../src/post/post.ts';

function gcode(c: ReturnType<typeof conturCerc>, latura: 'exterior' | 'interior', adancime: number, pas: number): string {
  const p = profil(c, { latura, diametruScula: 6, adancime, pas });
  assert.ok(p.ok, p.ok ? '' : p.motiv);
  if (!p.ok) return '';
  const t = traseuProfil(p.treceri, { zSigur: 5, avans: 1000, avansPlonjare: 300 });
  assert.ok(t.ok, t.ok ? '' : t.motiv);
  if (!t.ok) return '';
  const program: Program = {
    axe: AXE_XYZ, scula: { numar: 1, nume: 'freza plata', diametru: 6 }, turatie: 18000, zSigur: 5, miscari: t.miscari,
  };
  const r = posteaza(program, { foaie: { latime: 140, inaltime: 100, grosime: 18 }, origine: 'stanga-jos', z0: 'sus' }, GRBL_11, { asteptareAx: 3 });
  assert.ok(r.ok, r.ok ? '' : r.motiv);
  return r.ok ? r.text : '';
}

test('gaura Ø30 cu freza Ø6, 8 mm în două treceri: arce G3 cu raza 12, la Z-4 și Z-8', () => {
  const t = gcode(conturCerc(70, 50, 15), 'interior', 8, 4);
  const linii = t.split('\n');
  assert.ok(linii.includes('G1 Z-4.000 F300.0') && linii.includes('G1 Z-8.000 F300.0'), t);
  // Un G0 spre poziția curentă nu se scrie: după ridicare, nu urmează încă o ridicare la același Z.
  for (let i = 1; i < linii.length; i++) assert.notEqual(`${linii[i - 1]}|${linii[i]}`, 'G0 Z5.000|G0 Z5.000', `linia ${i}`);
  const arce = linii.filter((l) => /^G3 /.test(l));
  assert.equal(arce.length, 4, `două arce pe fiecare trecere:\n${arce.join('\n')}`);
  for (const a of arce) {
    const i = Number(/I(-?[\d.]+)/.exec(a)?.[1]);
    const j = Number(/J(-?[\d.]+)/.exec(a)?.[1]);
    assert.ok(Math.abs(Math.hypot(i, j) - 12) <= 0.0015, `${a}: raza ${Math.hypot(i, j)}`);
  }
});

test('insula 100 × 60 pe exterior, o trecere de 3: patru laturi G1 și patru colțuri G3 de R3', () => {
  const t = gcode(conturDreptunghi(20, 20, 100, 60), 'exterior', 3, 3);
  const linii = t.split('\n');
  assert.ok(linii.includes('G1 Z-3.000 F300.0'), t);
  const colturi = linii.filter((l) => /^G3 /.test(l));
  assert.equal(colturi.length, 4, colturi.join('\n'));
  for (const a of colturi) {
    const i = Number(/I(-?[\d.]+)/.exec(a)?.[1]);
    const j = Number(/J(-?[\d.]+)/.exec(a)?.[1]);
    assert.ok(Math.abs(Math.hypot(i, j) - 3) <= 0.0015, a);
  }
  // Marginile traseului, pe hârtie: insula 20..120 × 20..80, decalată cu raza 3.
  const xs = linii.filter((l) => /^G[0123] .*X/.test(l)).map((l) => Number(/X(-?[\d.]+)/.exec(l)?.[1]));
  const ys = linii.filter((l) => /^G[0123] .*Y/.test(l)).map((l) => Number(/Y(-?[\d.]+)/.exec(l)?.[1]));
  assert.equal(Math.min(...xs), 17);
  assert.equal(Math.max(...xs), 123);
  assert.equal(Math.min(...ys), 17);
  assert.equal(Math.max(...ys), 83);
});
