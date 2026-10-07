/**
 * Martorul pozitiv al portării cavalier (`docs/PORTARE.md` §1): copia din `src/geom/cavalier/` (cu `!` puse doar pentru
 * tipuri și importurile `.ts`) și pachetul npm original `cavalier-contours-js@0.1.1` (cel măsurat de sonda s1) trebuie să
 * dea EXACT aceleași ieșiri, bit cu bit, pe același corpus. O diferență înseamnă o schimbare de comportament la portare.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as original from 'cavalier-contours-js';
import * as copia from '../../src/geom/cavalier/index.ts';

type V = Array<[number, number, number]>;

const t8 = Math.tan(Math.PI / 8);
const CORPUS_INCHIS: ReadonlyArray<readonly [string, V]> = [
  ['cerc R15', [[65, 40, 1], [35, 40, 1]]],
  ['cerc R3,175', [[3.175, 0, 1], [-3.175, 0, 1]]],
  ['dreptunghi 100 × 60', [[20, 20, 0], [120, 20, 0], [120, 80, 0], [20, 80, 0]]],
  ['dreptunghi R10', [[10, 0, 0], [110, 0, t8], [120, 10, 0], [120, 70, t8], [110, 80, 0], [10, 80, t8], [0, 70, 0], [0, 10, t8]]],
  ['L', [[0, 0, 0], [60, 0, 0], [60, 20, 0], [20, 20, 0], [20, 50, 0], [0, 50, 0]]],
  ['U', [[0, 0, 0], [60, 0, 0], [60, 50, 0], [45, 50, 0], [45, 15, 0], [15, 15, 0], [15, 50, 0], [0, 50, 0]]],
  ['latura concavă în arc', [[0, 0, 0], [80, 0, 0], [80, 40, -0.4], [0, 40, 0]]],
  ['stea', Array.from({ length: 10 }, (_, k): [number, number, number] => {
    const r = k % 2 === 0 ? 50 : 20;
    const u = (Math.PI * k) / 5;
    return [r * Math.cos(u), r * Math.sin(u), 0];
  })],
];
const CORPUS_DESCHIS: ReadonlyArray<readonly [string, V]> = [
  ['linie cu arc', [[0, 0, 0], [40, 0, 0.5], [60, 20, 0], [60, 60, 0]]],
  ['zigzag', [[0, 0, 0], [10, 10, 0], [20, 0, 0], [30, 10, 0]]],
];
const DISTANTE = [-10, -3.175, -3, -1.5875, -0.5, 0.5, 1.5875, 3, 3.175, 10];

type Pline = { vertexCount: number; isClosed: boolean; at(i: number): { x: number; y: number; bulge: number } };

function amprenta(rezultat: readonly Pline[]): string {
  return JSON.stringify(rezultat.map((pl) => ({
    inchis: pl.isClosed,
    v: Array.from({ length: pl.vertexCount }, (_, i) => {
      const v = pl.at(i);
      return [v.x, v.y, v.bulge];
    }),
  })));
}

test('copia din src/geom/cavalier dă exact ieșirile pachetului original, pe tot corpusul', () => {
  let cazuri = 0;
  for (const [nume, v] of CORPUS_INCHIS) {
    for (const d of DISTANTE) {
      const a = amprenta(original.plineClosed(v).parallelOffset(d) as unknown as Pline[]);
      const b = amprenta(copia.plineClosed(v).parallelOffset(d) as unknown as Pline[]);
      assert.equal(b, a, `${nume}, d = ${d}`);
      cazuri++;
    }
  }
  for (const [nume, v] of CORPUS_DESCHIS) {
    for (const d of DISTANTE) {
      const a = amprenta(original.plineOpen(v).parallelOffset(d) as unknown as Pline[]);
      const b = amprenta(copia.plineOpen(v).parallelOffset(d) as unknown as Pline[]);
      assert.equal(b, a, `${nume}, d = ${d}`);
      cazuri++;
    }
  }
  assert.equal(cazuri, (CORPUS_INCHIS.length + CORPUS_DESCHIS.length) * DISTANTE.length);
});

test('controlul martorului: corpusul chiar produce contururi (nu se compară liste goale)', () => {
  let nevide = 0;
  for (const [, v] of CORPUS_INCHIS) for (const d of DISTANTE) if (copia.plineClosed(v).parallelOffset(d).length > 0) nevide++;
  assert.ok(nevide >= CORPUS_INCHIS.length * DISTANTE.length * 0.7, `doar ${nevide} cazuri cu contururi`);
});
