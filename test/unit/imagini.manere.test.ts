import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  asezareDupaGest, coltImagine, inImagine, LATURA_MINIMA_IMAGINE, manerImagineLovit, peFoaie, punctRotireImagine, rotireNormala, ROTIRE_IMAGINE_PX,
  type Asezare, type Punct,
} from '../../src/app/manereImagine.ts';
import { imaginiPentruPanza } from '../../src/app/octetiImagini.ts';
import type { ImagineFoaie } from '../../src/model/document.ts';

/**
 * Mânerele unei imagini desfăcute (ADR 0272 §4), ca socoteală: colțurile rotite și mânerul de rotire, lovitura (rotirea,
 * colțurile, interiorul, în afară), mutarea, rotirea (Shift: 15°) și scalarea proporțională dintr-un colț, cu colțul opus pe
 * loc; apoi lista pentru pânză (doar cele vizibile, cu octeții lor). Valorile așteptate, socotite pe hârtie.
 */

const aproape = (a: Punct, b: Punct, eps = 1e-9): boolean => Math.abs(a.x - b.x) < eps && Math.abs(a.y - b.y) < eps;
const A: Asezare = { x: 100, y: 50, latime: 40, inaltime: 20, rotire: 0 };
/** Vederea: 2 px pe mm, originea foii la (10, 300) pe ecran (Y în jos). */
const V = { tx: 10, ty: 300, scara: 2 };
const ecran = (p: Punct): Punct => ({ x: V.tx + p.x * V.scara, y: V.ty - p.y * V.scara });

test('colțurile și mânerul de rotire: nerotită, apoi rotită cu 90° (sus-ul imaginii spre stânga)', () => {
  assert.deepEqual([coltImagine(A, 'sv'), coltImagine(A, 'se'), coltImagine(A, 'ne'), coltImagine(A, 'nv')],
    [{ x: 80, y: 40 }, { x: 120, y: 40 }, { x: 120, y: 60 }, { x: 80, y: 60 }]);
  assert.deepEqual(punctRotireImagine(A, 2), { x: 100, y: 60 + ROTIRE_IMAGINE_PX / 2 });
  const r = { ...A, rotire: 90 };
  assert.ok(aproape(coltImagine(r, 'sv'), { x: 110, y: 30 }));
  assert.ok(aproape(coltImagine(r, 'ne'), { x: 90, y: 70 }));
  assert.ok(aproape(punctRotireImagine(r, 2), { x: 100 - 10 - ROTIRE_IMAGINE_PX / 2, y: 50 }));
  // Dus și întors între foaie și imagine.
  const q = { x: 93.5, y: 61.25 };
  const { u, w } = inImagine({ ...A, rotire: 37 }, q);
  assert.ok(aproape(peFoaie({ ...A, rotire: 37 }, u, w), q));
});

test('lovitura: rotirea, un colț, interiorul (mutarea), în afară nimic; și pe o imagine rotită', () => {
  const p = (q: Punct, dx = 0, dy = 0): [number, number] => { const e = ecran(q); return [e.x + dx, e.y + dy]; };
  assert.equal(manerImagineLovit(A, V, ...p(punctRotireImagine(A, V.scara), 3, -2)), 'rotire');
  assert.equal(manerImagineLovit(A, V, ...p(coltImagine(A, 'se'), -4, 4)), 'se');
  assert.equal(manerImagineLovit(A, V, ...p({ x: 100, y: 50 })), 'mutare');
  assert.equal(manerImagineLovit(A, V, ...p({ x: 125, y: 50 })), null);
  // Rotită cu 30°: un punct dinăuntru, aproape de latura din dreapta (în coordonatele ei), și unul dinafară, în colțul cutiei.
  const r = { ...A, rotire: 30 };
  assert.equal(manerImagineLovit(r, V, ...p(peFoaie(r, 17, 0))), 'mutare');
  assert.equal(manerImagineLovit(r, V, ...p(peFoaie(r, 0, 12))), null, 'deasupra laturii de sus, sub mânerul de rotire');
  assert.equal(manerImagineLovit(r, V, ...p(coltImagine(r, 'nv'))), 'nv');
});

test('mutarea și rotirea: deplasarea cursorului; unghiul văzut din centru, cu Shift la 15°, adus în [0, 360)', () => {
  assert.deepEqual(asezareDupaGest(A, 'mutare', { x: 90, y: 45 }, { x: 102.5, y: 40 }), { ...A, x: 112.5, y: 45 });
  const sus = asezareDupaGest(A, 'rotire', { x: 130, y: 50 }, { x: 100, y: 90 });
  assert.ok(Math.abs(sus.rotire - 90) < 1e-9, String(sus.rotire));
  assert.deepEqual([sus.x, sus.y, sus.latime, sus.inaltime], [A.x, A.y, A.latime, A.inaltime]);
  const putin = asezareDupaGest(A, 'rotire', { x: 130, y: 50 }, { x: 130, y: 58 });
  assert.ok(putin.rotire > 14 && putin.rotire < 15.5, String(putin.rotire));
  assert.equal(asezareDupaGest(A, 'rotire', { x: 130, y: 50 }, { x: 130, y: 58 }, true).rotire, 15);
  // Spre dreapta-jos: −30° devine 330°.
  const jos = asezareDupaGest(A, 'rotire', { x: 130, y: 50 }, { x: 100 + 30 * Math.cos(-Math.PI / 6), y: 50 + 30 * Math.sin(-Math.PI / 6) });
  assert.ok(Math.abs(jos.rotire - 330) < 1e-9, String(jos.rotire));
  assert.equal(rotireNormala(360), 0);
  assert.equal(rotireNormala(-0), 0);
  assert.equal(rotireNormala(-720.5), 359.5);
});

test('scalarea dintr-un colț: proporțională, colțul opus pe loc; și rotită; trasă dincolo de colțul opus, latura minimă', () => {
  // Colțul ne tras până la (140, 70): diagonala din sv (80, 40) se dublează.
  const d = asezareDupaGest(A, 'ne', { x: 120, y: 60 }, { x: 160, y: 80 });
  assert.ok(Math.abs(d.latime - 80) < 1e-9 && Math.abs(d.inaltime - 40) < 1e-9, `${d.latime} × ${d.inaltime}`);
  assert.ok(aproape(coltImagine(d, 'sv'), coltImagine(A, 'sv')), 'colțul opus');
  assert.ok(aproape(coltImagine(d, 'ne'), { x: 160, y: 80 }));
  // Un cursor în afara diagonalei: factorul e proiecția lui pe ea, proporțiile rămân.
  const p = asezareDupaGest(A, 'ne', { x: 120, y: 60 }, { x: 130, y: 90 });
  assert.ok(Math.abs(p.latime / p.inaltime - 2) < 1e-12);
  // Rotită cu 50°, colțul sv tras pe diagonala lui spre exterior cu jumătate din ea: ×1,5, colțul ne pe loc.
  const r = { ...A, rotire: 50 };
  const sv = coltImagine(r, 'sv'), ne = coltImagine(r, 'ne');
  const tras = { x: sv.x + (sv.x - ne.x) * 0.5, y: sv.y + (sv.y - ne.y) * 0.5 };
  const s = asezareDupaGest(r, 'sv', sv, tras);
  assert.ok(Math.abs(s.latime - 60) < 1e-9 && Math.abs(s.inaltime - 30) < 1e-9, `${s.latime} × ${s.inaltime}`);
  assert.ok(aproape(coltImagine(s, 'ne'), ne));
  assert.equal(s.rotire, 50);
  // Dincolo de colțul opus: imaginea nu se întoarce, se oprește la latura minimă (aici înălțimea, cea mai mică).
  const m = asezareDupaGest(A, 'ne', { x: 120, y: 60 }, { x: 0, y: 0 });
  assert.ok(Math.abs(m.inaltime - LATURA_MINIMA_IMAGINE) < 1e-9 && Math.abs(m.latime - 2 * LATURA_MINIMA_IMAGINE) < 1e-9);
  assert.ok(aproape(coltImagine(m, 'sv'), coltImagine(A, 'sv')));
});

test('lista pentru pânză: doar imaginile vizibile, cu octeții lor (lipsă: null); niciuna, aceeași listă', () => {
  const im = (id: string, vizibila: boolean, sursa: string): ImagineFoaie => ({
    id, sursa, x: 1, y: 2, latime: 3, inaltime: 4, rotire: 5, opacitate: 0.4, vizibila, fixata: true, nume: 'n', viitor: 1,
  });
  const b = new Blob([new Uint8Array([1])]);
  const octeti = new Map<string, Blob | null>([['s1', b], ['s2', null]]);
  const l = imaginiPentruPanza([im('a', true, 's1'), im('b', false, 's1'), im('c', true, 's2'), im('d', true, 's3')], octeti);
  assert.deepEqual(l.map((x) => [x.id, x.octeti]), [['a', b], ['c', null], ['d', null]]);
  assert.deepEqual(Object.keys(l[0] ?? {}).sort(), ['id', 'inaltime', 'latime', 'octeti', 'opacitate', 'rotire', 'sursa', 'x', 'y']);
  assert.equal(imaginiPentruPanza(undefined, octeti), imaginiPentruPanza([im('b', false, 's1')], octeti));
});
