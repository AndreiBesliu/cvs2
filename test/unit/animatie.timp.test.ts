/**
 * Timpul fiecărei mișcări, pentru animația traseului (ADR 0099): postul spune linia la care începe fiecare mișcare a
 * programului (și finalul), iar estimarea planificatorului (ADR 0046) dă timpul fiecărui interval. Suma lor e exact timpul
 * jobului de lângă traseu: animația și cipul spun același timp.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Miscare, Program, Scula } from '../../src/ir/ir.ts';
import type { Montaj } from '../../src/ir/montaj.ts';
import { GRBL_11 } from '../../src/post/contracte/grbl11.ts';
import { posteaza } from '../../src/post/post.ts';
import { secundePeMiscare, timpProgram } from '../../src/ui/actiuniExportCalcul.ts';

const T1: Scula = { numar: 1, nume: 'Freza 6', diametru: 6 };
const T2: Scula = { numar: 2, nume: 'Freza 3', diametru: 3 };
const FOAIE: Montaj['foaie'] = { latime: 300, inaltime: 200, grosime: 18 };
const MISCARI: Miscare[] = [
  { tip: 'eticheta', text: 'profil exterior', element: 'e1', operatie: 'p1/o1' },
  { tip: 'rapida', la: { X: 10, Y: 0 } },
  { tip: 'rapida', la: { Z: 1 } },
  { tip: 'taiere', la: { Z: -2 }, avans: 300 },
  { tip: 'taiere', la: { X: 20 }, avans: 1000 },
  { tip: 'arc', la: { X: 20, Y: 20, Z: -3 }, centru: { x: 20, y: 10 }, sens: 'trigonometric', avans: 1000 },
  { tip: 'pauza', secunde: 1 },
  // Deja aici: postul nu scrie nimic pentru ea.
  { tip: 'rapida', la: { X: 20, Y: 20 } },
  { tip: 'schimba-scula', scula: T2, turatie: 18000 },
  { tip: 'rapida', la: { X: 0, Y: 0 } },
];
const PROGRAM: Program = { axe: ['X', 'Y', 'Z'], scula: T1, turatie: 18000, zSigur: 5, miscari: MISCARI };
/** O mașină mai rapidă decât implicitul lui GRBL (500 mm/min, 10 mm/s²): 5000 mm/min și 500 mm/s² pe X și Y. */
const RAPIDA = ['$110=5000', '$111=5000', '$112=1000', '$120=500', '$121=500', '$122=200', ''].join('\n');

test('postul: linia la care începe fiecare mișcare, crescător, plus începutul finalului', () => {
  const r = posteaza(PROGRAM, { foaie: FOAIE, origine: 'stanga-jos', z0: 'sus' }, GRBL_11, { asteptareAx: 2 });
  assert.ok(r.ok);
  const linii = r.text.split('\n');
  const l = r.liniiMiscari;
  assert.equal(l.length, MISCARI.length + 1);
  for (let k = 1; k < l.length; k++) assert.ok((l[k] as number) >= (l[k - 1] as number), `crescător la ${k}`);
  const prima = (k: number): string => linii[l[k] as number] ?? '';
  assert.match(prima(0), /^\(/, 'eticheta: comentariul ei');
  assert.match(prima(1), /^G0 X10\.000 Y0\.000$/);
  assert.match(prima(2), /^G0 Z1\.000$/);
  assert.match(prima(3), /^G1 Z-2\.000 F300\.0$/);
  assert.match(prima(4), /^G1 X20\.000 F1000\.0$/);
  assert.match(prima(5), /^G3 /);
  assert.match(prima(6), /^G4 P1/);
  assert.equal(l[7], l[8], 'deplasarea pe loc nu scrie nimic');
  assert.match(prima(8), /^G0 Z5\.000$/, 'schimbarea sculei urcă întâi');
  assert.match(prima(9), /^G0 X0\.000 Y0\.000$/);
  assert.equal(l[MISCARI.length], r.sectiuni.at(-1)?.linie, 'finalul începe unde începe ultima secțiune');
});

test('timpul pe mișcare: suma (pregătirea, mișcările, finalul) e exact timpul jobului de lângă traseu', () => {
  const t = secundePeMiscare(PROGRAM, FOAIE, undefined);
  assert.ok(t);
  assert.equal(t.miscari.length, MISCARI.length);
  for (const [k, v] of t.miscari.entries()) assert.ok(Number.isFinite(v) && v >= 0, `mișcarea ${k}: ${v}`);
  assert.equal(t.miscari[0], 0, 'eticheta nu ia timp');
  assert.equal(t.miscari[7], 0, 'deplasarea pe loc nu ia timp');
  assert.ok((t.miscari[6] as number) >= 1, 'pauza ține cel puțin cât cere');
  assert.ok((t.miscari[8] as number) >= 2, 'schimbarea sculei: urcarea și pauza axului (asteptareAx)');
  // Programul se termină la Z sigur: finalul (M5, M30) nu mai urcă, deci nu ia timp.
  assert.ok(t.pregatire > 0);
  assert.equal(t.final, 0);
  const job = timpProgram(PROGRAM, FOAIE, undefined);
  assert.ok(job.ok);
  const suma = t.pregatire + t.miscari.reduce((s, v) => s + v, 0) + t.final;
  assert.ok(Math.abs(suma - job.total.secunde) < 1e-9, `${suma} ≠ ${job.total.secunde}`);
});

test('un program care se termină în material: finalul (urcarea la Z sigur) are timpul lui, iar suma rămâne timpul jobului', () => {
  const inMaterial: Program = { ...PROGRAM, miscari: MISCARI.slice(0, 7) };
  const t = secundePeMiscare(inMaterial, FOAIE, undefined);
  const job = timpProgram(inMaterial, FOAIE, undefined);
  assert.ok(t && job.ok);
  assert.ok(t.final > 0, String(t.final));
  const suma = t.pregatire + t.miscari.reduce((s, v) => s + v, 0) + t.final;
  assert.ok(Math.abs(suma - job.total.secunde) < 1e-9, `${suma} ≠ ${job.total.secunde}`);
});

test('timpul pe mișcare urmează mașina: setările $$ lipite schimbă timpul; unele greșite, sau un program refuzat, nimic', () => {
  const rapida = secundePeMiscare(PROGRAM, FOAIE, RAPIDA);
  const implicita = secundePeMiscare(PROGRAM, FOAIE, undefined);
  assert.ok(rapida && implicita);
  assert.ok((rapida.miscari[1] as number) < (implicita.miscari[1] as number), 'deplasarea e mai rapidă pe mașina rapidă');
  assert.equal(secundePeMiscare(PROGRAM, FOAIE, '$110=abc\n'), null);
  assert.equal(secundePeMiscare({ ...PROGRAM, turatie: 0 }, FOAIE, undefined), null);
});

test('timpul de lângă traseu poartă programul și mașina, pentru animație; rezumatul exportului, nu', () => {
  const job = timpProgram(PROGRAM, FOAIE, RAPIDA);
  assert.ok(job.ok);
  assert.equal(job.traseu?.program, PROGRAM);
  assert.equal(job.traseu?.setari, RAPIDA);
  assert.deepEqual(job.traseu?.foaie, FOAIE);
});
