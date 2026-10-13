/**
 * Pe linie, freza stă pe linie (13.10, designul 2.3c, „Ce am măsurat” 2): un arc aproape nul pe un contur tăiat pe linie
 * ieșea din post un cerc întreg. `baleiajArc` ia un baleiaj sub 1e-12 rad drept cercul întreg (așa se scrie cercul dintr-o
 * mișcare), iar pe `pe-linie` traseul scria segmentele conturului ca atare. Lanțul întreg, până la textul G-code.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { profil } from '../../src/cam/profil.ts';
import { traseuProfil } from '../../src/cam/traseu.ts';
import { LINIE, type Contur } from '../../src/geom/contur.ts';
import { AXE_XYZ, type Program } from '../../src/ir/ir.ts';
import type { Montaj } from '../../src/ir/montaj.ts';
import { GRBL_11 } from '../../src/post/contracte/grbl11.ts';
import { posteaza } from '../../src/post/post.ts';

function gcodePeLinie(c: Contur): string {
  const p = profil(c, { latura: 'pe-linie', sens: 'urcare', diametruScula: 6, adancime: 1, pas: 1 });
  assert.ok(p.ok, p.ok ? '' : p.motiv);
  if (!p.ok) return '';
  const t = traseuProfil(p.treceri, { zSigur: 5, avans: 1000, avansPlonjare: 300 });
  assert.ok(t.ok, t.ok ? '' : t.motiv);
  if (!t.ok) return '';
  const program: Program = {
    axe: AXE_XYZ, scula: { numar: 1, nume: 'freza plata', diametru: 6 }, turatie: 18000, zSigur: 5, miscari: t.miscari,
  };
  const montaj: Montaj = { foaie: { latime: 140, inaltime: 100, grosime: 18 }, origine: 'stanga-jos', z0: 'sus' };
  const r = posteaza(program, montaj, GRBL_11, { asteptareAx: 3 });
  assert.ok(r.ok, r.ok ? '' : r.motiv);
  return r.ok ? r.text : '';
}

test('pe linie: un arc aproape nul (coarda 1e-11 mm, bulge 1e-13) iese linie, nu cercul întreg de Ø50', () => {
  // Un pătrat de 50 mm cu un arc minuscul în colțul (60, 60): raza lui e 25 mm, baleiajul 4e-13 rad.
  const c: Contur = {
    inchis: true,
    varfuri: [
      { p: { x: 10, y: 10 }, s: LINIE },
      { p: { x: 60, y: 10 }, s: LINIE },
      { p: { x: 60, y: 60 }, s: { tip: 'A', bulge: 1e-13 } },
      { p: { x: 60, y: 60 + 1e-11 }, s: LINIE },
      { p: { x: 10, y: 60 }, s: LINIE },
    ],
  };
  const g = gcodePeLinie(c);
  assert.doesNotMatch(g, /^G[23]\b/m, 'un arc de 1e-11 mm nu e un cerc');
  // Freza rămâne pe pătrat: nicio coordonată X dincolo de [10, 60] (cercul Ø50 ajungea la X 110).
  for (const m of g.matchAll(/X(-?[\d.]+)/g)) assert.ok(Number(m[1]) >= 10 - 1e-9 && Number(m[1]) <= 60 + 1e-9, m[0]);
});

test('pe linie: un arc plat (|bulge| < 1e-6) se scrie linie; un arc obișnuit rămâne arc, pe cercul lui', () => {
  const c: Contur = {
    inchis: true,
    varfuri: [
      { p: { x: 10, y: 10 }, s: { tip: 'A', bulge: 5e-7 } },
      { p: { x: 60, y: 10 }, s: { tip: 'A', bulge: 0.5 } },
      { p: { x: 60, y: 60 }, s: LINIE },
      { p: { x: 10, y: 60 }, s: LINIE },
    ],
  };
  const g = gcodePeLinie(c);
  // Un singur arc în program (cel cu bulge 0,5), iar latura de jos e un G1.
  assert.equal([...g.matchAll(/^G[23]\b/gm)].length, 1, g);
});
