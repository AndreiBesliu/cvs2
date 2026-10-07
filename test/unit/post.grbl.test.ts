import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import type { Miscare, Program } from '../../src/ir/ir.ts';
import { COLTURI, type ColtOrigine, type Montaj } from '../../src/ir/montaj.ts';
import { GRBL_11 } from '../../src/post/contracte/grbl11.ts';
import { exporta } from '../../src/post/export.ts';
import { numar } from '../../src/post/numere.ts';
import { posteaza } from '../../src/post/post.ts';

const FOAIA = { latime: 140, inaltime: 100, grosime: 18 };
const montaj = (origine: ColtOrigine, z0: 'sus' | 'jos' = 'sus'): Montaj => ({ foaie: FOAIA, origine, z0 });
const program = (miscari: readonly Miscare[]): Program => ({
  axe: ['X', 'Y', 'Z'],
  scula: { numar: 1, nume: 'freza plata', diametru: 6 },
  turatie: 18000,
  zSigur: 5,
  miscari,
});
const OPT = { asteptareAx: 3 };

function text(p: Program, m: Montaj = montaj('stanga-jos')): string {
  const r = posteaza(p, m, GRBL_11, OPT);
  assert.ok(r.ok, r.ok ? '' : r.motiv);
  return r.ok ? r.text : '';
}

test('numerele: 3 zecimale, punctul scris mereu, fără „-0.000”, fără NaN în program', () => {
  assert.equal(numar(10, 3), '10.000');
  assert.equal(numar(3.14159, 3), '3.142');
  assert.equal(numar(-2.5, 3), '-2.500');
  assert.equal(numar(-0.0004, 3), '0.000');
  assert.throws(() => numar(Number.NaN, 3));
  assert.throws(() => numar(Number.POSITIVE_INFINITY, 3));
});

test('cele 4 colțuri de origine, pe hârtie: punctul (20, 20) al foii 140 × 100', () => {
  const asteptat: Record<ColtOrigine, string> = {
    'stanga-jos': 'G1 X20.000 Y20.000',
    'dreapta-jos': 'G1 X-120.000 Y20.000',
    'dreapta-sus': 'G1 X-120.000 Y-80.000',
    'stanga-sus': 'G1 X20.000 Y-80.000',
  };
  for (const colt of COLTURI) {
    const t = text(program([{ tip: 'taiere', la: { X: 20, Y: 20 }, avans: 1000 }]), montaj(colt));
    assert.ok(t.includes(`${asteptat[colt]} F1000.0`), `${colt}:\n${t}`);
    assert.ok(t.includes(`(origine ${colt}, Z0 sus`), colt);
  }
});

test('Z0 sus sau jos: adâncimea 3 iese Z-3.000 sau Z15.000, Z-ul sigur Z5.000 sau Z23.000', () => {
  const p = program([{ tip: 'taiere', la: { Z: -3 }, avans: 300 }]);
  const sus = text(p, montaj('stanga-jos', 'sus'));
  const jos = text(p, montaj('stanga-jos', 'jos'));
  assert.ok(sus.includes('G1 Z-3.000 F300.0') && sus.includes('G0 Z5.000'), sus);
  assert.ok(jos.includes('G1 Z15.000 F300.0') && jos.includes('G0 Z23.000'), jos);
});

test('antetul setează explicit tot ce e modal, apoi pornește axul și așteaptă; finalul oprește și încheie', () => {
  const t = text(program([]));
  const linii = t.split('\n');
  for (const l of ['G90 G17 G21 G94', 'G40 G49 G80', 'G54', 'M3 S18000', 'G4 P3.000']) assert.ok(linii.includes(l), l);
  assert.ok(linii.indexOf('G0 Z5.000') < linii.indexOf('M3 S18000'), 'Z sus înainte de pornirea axului');
  assert.ok(t.endsWith('M5\nM30\n'), t.slice(-30));
  assert.ok(!/M0?6\b/.test(t), 'GRBL 1.1 nu primește M6');
  // După o tăiere, scula urcă la Z-ul sigur înainte ca axul să se oprească.
  const cuTaiere = text(program([{ tip: 'taiere', la: { Z: -3 }, avans: 300 }]));
  assert.ok(cuTaiere.endsWith('G1 Z-3.000 F300.0\nG0 Z5.000\nM5\nM30\n'), cuTaiere.slice(-60));
});

test('I / J din startul ROTUNJIT (strategia B): controlerul vede exact centrul scris', () => {
  const t = text(program([
    { tip: 'rapida', la: { X: 10.0006, Y: 5.0004 } },
    { tip: 'arc', la: { X: -10.0006, Y: -5.0004 }, centru: { x: 0, y: 0 }, sens: 'trigonometric', avans: 800 },
  ]));
  // startul scris e (10.001, 5.000), deci I = 0 − 10.001, J = 0 − 5.000
  assert.ok(t.includes('G0 X10.001 Y5.000'), t);
  assert.ok(t.includes('G3 X-10.001 Y-5.000 I-10.001 J-5.000 F800.0'), t);
});

test('un arc de peste 180° se împarte în bucăți de cel mult 180°', () => {
  const t = text(program([
    { tip: 'rapida', la: { X: 10, Y: 0 } },
    { tip: 'arc', la: { X: 0, Y: -10 }, centru: { x: 0, y: 0 }, sens: 'trigonometric', avans: 800 },
  ]));
  const arce = t.split('\n').filter((l) => l.startsWith('G3'));
  assert.equal(arce.length, 2, t);
  assert.ok(arce.at(-1)?.startsWith('G3 X0.000 Y-10.000'), arce.join('\n'));
});

test('garda de coardă: un arc cu coarda sub 10 rezoluții iese G1, nu arc (cercul fals al GRBL)', () => {
  const mic = text(program([
    { tip: 'rapida', la: { X: 0, Y: 0 } },
    { tip: 'arc', la: { X: 0.005, Y: 0 }, centru: { x: 0.0025, y: -50 }, sens: 'orar', avans: 800 },
  ]));
  assert.ok(mic.includes('G1 X0.005 Y0.000 F800.0') && !/^G[23] /m.test(mic), mic);
});

test('garda de rază: un arc de 1 m cu raza de 15 m iese în segmente G1 sub 0,001 mm, declarate, nu într-o coardă', () => {
  const R = 15000;
  const centru = { x: 500, y: -Math.sqrt(R * R - 500 * 500) };
  const r = posteaza(program([
    { tip: 'rapida', la: { X: 0, Y: 0 } },
    { tip: 'arc', la: { X: 1000, Y: 0 }, centru, sens: 'orar', avans: 800 },
  ]), montaj('stanga-jos'), GRBL_11, OPT);
  assert.ok(r.ok, r.ok ? '' : r.motiv);
  if (!r.ok) return;
  assert.equal(r.aproximari, 1);
  const puncte = [{ x: 0, y: 0 }, ...r.text.split('\n').filter((l) => l.startsWith('G1 X')).map((l) => {
    const m = /X(-?[\d.]+) Y(-?[\d.]+)/.exec(l);
    return { x: Number(m?.[1]), y: Number(m?.[2]) };
  })];
  assert.ok(puncte.length > 50, `${puncte.length} de puncte`);
  assert.deepEqual(puncte.at(-1), { x: 1000, y: 0 });
  // Pe hârtie: fiecare coardă stă la cel mult 0,001 mm de cerc (săgeata), plus rotunjirea scrierii la 3 zecimale.
  for (let i = 1; i < puncte.length; i++) {
    const a = puncte[i - 1];
    const b = puncte[i];
    if (!a || !b) continue;
    const mijloc = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const sageata = R - Math.hypot(mijloc.x - centru.x, mijloc.y - centru.y);
    assert.ok(sageata <= 0.001 + 0.0008, `segmentul ${i}: săgeata ${sageata}`);
  }
});

test('nicio linie peste plafon: comentariul se taie, iar o linie de G-code prea lungă e refuzată', () => {
  const t = text(program([{ tip: 'eticheta', text: `intrare ${'x'.repeat(200)}` }]));
  for (const l of t.split('\n')) assert.ok(l.length <= 70, `${l.length}: ${l}`);
  // Același mecanism, pe un contract cu plafonul de 30 de octeți: arcul de 43 de octeți e refuzat, nu tăiat.
  const r = posteaza(program([
    { tip: 'rapida', la: { X: 10, Y: 0 } },
    { tip: 'arc', la: { X: -10, Y: 0 }, centru: { x: 0, y: 0 }, sens: 'trigonometric', avans: 800 },
  ]), montaj('stanga-jos'), { ...GRBL_11, liniaMaxima: 30 }, OPT);
  assert.equal(r.ok, false);
  assert.match(r.ok ? '' : r.motiv, /peste 30 de octeți/);
});

test('o cotă uriașă e refuzată: niciodată „X1e+60” în program', () => {
  const r = posteaza(program([{ tip: 'taiere', la: { X: 1e60, Y: 0 }, avans: 1000 }]), montaj('stanga-jos'), GRBL_11, OPT);
  assert.equal(r.ok, false);
  assert.match(r.ok ? '' : r.motiv, /nu e o cotă de mașină/);
});

test('diacriticele din comentarii devin ASCII, iar parantezele din text nu închid comentariul', () => {
  const t = text(program([{ tip: 'eticheta', text: 'ușă (față) țâță' }]));
  assert.ok(t.includes('(usa fata tata)'), t);
});

test('o coordonată nefinită sau axa A nu ajung niciodată în program', () => {
  assert.equal(posteaza(program([{ tip: 'taiere', la: { X: Number.NaN }, avans: 1000 }]), montaj('stanga-jos'), GRBL_11, OPT).ok, false);
  assert.equal(posteaza(program([{ tip: 'taiere', la: { A: 90 }, avans: 1000 }]), montaj('stanga-jos'), GRBL_11, OPT).ok, false);
  assert.equal(posteaza({ ...program([]), axe: ['X', 'Y', 'Z', 'A'] }, montaj('stanga-jos'), GRBL_11, OPT).ok, false);
});

test('exportul: aceiași octeți la fiecare rulare, iar SHA-256 e cel calculat independent de node:crypto', async () => {
  const p = program([
    { tip: 'rapida', la: { X: 65, Y: 40 } },
    { tip: 'taiere', la: { Z: -3 }, avans: 300 },
    { tip: 'arc', la: { X: 35, Y: 40 }, centru: { x: 50, y: 40 }, sens: 'trigonometric', avans: 1000 },
    { tip: 'arc', la: { X: 65, Y: 40 }, centru: { x: 50, y: 40 }, sens: 'trigonometric', avans: 1000 },
  ]);
  const a = await exporta(p, montaj('stanga-jos'), GRBL_11, OPT);
  const b = await exporta(p, montaj('stanga-jos'), GRBL_11, OPT);
  assert.ok(a.ok && b.ok);
  if (!a.ok || !b.ok) return;
  assert.equal(a.exportat.text, b.exportat.text);
  assert.equal(a.exportat.sha256, createHash('sha256').update(a.exportat.octeti).digest('hex'));
  assert.equal(a.exportat.extensie, 'nc');
});
