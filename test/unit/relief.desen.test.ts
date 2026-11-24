/**
 * Reliefurile pe planșă (ADR 0310 §7, felia 18.1↑a), partea pură: locul imaginii umbrite din matricea elementului (centrul,
 * mărimea, rotirea, oglindirea), reliefurile foii cu instanța lor, cheia desenului (aceleași straturi, aceeași imagine),
 * imaginile pentru pânză și plafonul desenelor ținute. Pe hârtie: un relief de 40 × 20 mm.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { asezareRelief, cheieDesen, imaginiReliefuri, reliefuriFoaie } from '../../src/app/reliefDesen.ts';
import { cuPlafon } from '../../src/app/reliefDesenCalcul.ts';
import { VERSIUNE_SCHEMA, type Document, type FormaRelief, type Matrice } from '../../src/model/document.ts';

const H = 'a'.repeat(64);
const F: FormaRelief = { tip: 'relief', nx: 400, ny: 200, celula: 0.1, straturi: [{ id: 's1', mod: 'aduna', vizibil: true, dale: H }] };
const I: Matrice = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const aproape = (x: number, v: number): void => { assert.ok(Math.abs(x - v) < 1e-9, `${x} ≠ ${v}`); };

test('așezarea: fără transformare, centrul dreptunghiului; mutat; rotit cu 90°; scalat uniform', () => {
  assert.deepEqual(asezareRelief(F, I), { x: 20, y: 10, latime: 40, inaltime: 20, rotire: 0, oglindita: false });
  assert.deepEqual(asezareRelief(F, { ...I, e: 100, f: 50 }), { x: 120, y: 60, latime: 40, inaltime: 20, rotire: 0, oglindita: false });
  // Rotit cu 90° în jurul originii: colțul (40, 20) ajunge în (−20, 40); centrul (20, 10) în (−10, 20).
  const r = asezareRelief(F, { a: 0, b: 1, c: -1, d: 0, e: 0, f: 0 });
  aproape(r.x, -10); aproape(r.y, 20); aproape(r.rotire, 90);
  assert.equal(r.latime, 40);
  assert.equal(r.oglindita, false);
  const s = asezareRelief(F, { a: 2, b: 0, c: 0, d: 2, e: 0, f: 0 });
  assert.deepEqual([s.x, s.y, s.latime, s.inaltime], [40, 20, 80, 40]);
});

test('așezarea: oglindit pe X (determinantul negativ), fără rotire; oglindit pe Y = oglindit pe X rotit cu 180°', () => {
  // x → −x: centrul (−20, 10); imaginea oglindită pe orizontala ei, nerotită.
  const x = asezareRelief(F, { a: -1, b: 0, c: 0, d: 1, e: 0, f: 0 });
  aproape(x.x, -20); aproape(x.y, 10); aproape(x.rotire, 0);
  assert.equal(x.oglindita, true);
  const y = asezareRelief(F, { a: 1, b: 0, c: 0, d: -1, e: 0, f: 0 });
  aproape(y.x, 20); aproape(y.y, -10); aproape(Math.abs(y.rotire), 180);
  assert.equal(y.oglindita, true);
});

test('reliefurile foii: fiecare instanță, cu matricea ei; cheia desenului ține doar grila și straturile', () => {
  const doc: Document = {
    schema: VERSIUNE_SCHEMA, rev: 1,
    piese: [{
      id: 'p1', nume: 'p', operatii: [],
      radacina: { tip: 'grup', id: 'g', matrice: I, copii: [
        { tip: 'element', id: 'r1', matrice: I, forma: F },
        { tip: 'element', id: 'c1', matrice: I, forma: { tip: 'dreptunghi', latime: 5, inaltime: 5, razaColt: 0 } },
      ] },
    }],
    foi: [{ id: 'f1', stoc: { latime: 600, inaltime: 400, grosime: 18 }, instante: [
      { id: 'i1', piesa: 'p1', x: 100, y: 100, rotire: 0 },
      { id: 'i2', piesa: 'p1', x: 300, y: 100, rotire: 0 },
    ] }],
  };
  const r = reliefuriFoaie(doc, 0);
  assert.deepEqual(r.map((x) => [x.id, x.x, x.y]), [['i1/r1', 120, 110], ['i2/r1', 320, 110]]);
  assert.equal(r[0]?.cheie, r[1]?.cheie);
  assert.equal(cheieDesen(F), cheieDesen({ ...F, straturi: [{ ...F.straturi[0]!, nume: 'alt nume', id: 's9' }] }), 'numele și id-ul stratului nu schimbă desenul');
  assert.notEqual(cheieDesen(F), cheieDesen({ ...F, straturi: [{ ...F.straturi[0]!, vizibil: false }] }));
  assert.notEqual(cheieDesen(F), cheieDesen({ ...F, celula: 0.2 }));
  assert.deepEqual(reliefuriFoaie({ ...doc, piese: [{ ...doc.piese[0]!, radacina: { tip: 'grup', id: 'g', matrice: I, copii: [] } }] }, 0), []);
});

test('imaginile pentru pânză: pixelii desenului, ori doar locul (fără octeți); se mută cu selecția; oglindirea dusă mai departe', () => {
  const [a] = reliefuriFoaie({
    schema: VERSIUNE_SCHEMA, rev: 1,
    piese: [{ id: 'p1', operatii: [], radacina: { tip: 'element', id: 'r1', matrice: { a: -1, b: 0, c: 0, d: 1, e: 0, f: 0 }, forma: F } }],
    foi: [{ id: 'f1', stoc: { latime: 600, inaltime: 400, grosime: 18 }, instante: [{ id: 'i1', piesa: 'p1', x: 0, y: 0, rotire: 0 }] }],
  }, 0);
  assert.ok(a);
  const [fara] = imaginiReliefuri([a], new Map());
  assert.equal(fara?.octeti, null);
  assert.equal(fara?.pixeli, undefined);
  assert.equal(fara?.oglindita, true);
  assert.equal(fara?.cuSelectia, true);
  assert.equal(fara?.opacitate, 1);
  const u = { latime: 2, inaltime: 1, rgba: new Uint8ClampedArray(8) };
  const [cu] = imaginiReliefuri([a], new Map([[a.cheie, { umbrit: u, z: { min: 0, max: 1 } }]]));
  assert.equal(cu?.pixeli?.rgba, u.rgba);
  assert.equal(cu?.sursa, `relief:${a.cheie}`);
  assert.equal(imaginiReliefuri([], new Map()).length, 0);
});

test('plafonul desenelor ținute: cele mai vechi pleacă, afară de cele folosite pe foaie', () => {
  const h = new Map([['a', 1], ['b', 2], ['c', 3]]);
  assert.deepEqual([...cuPlafon(h, [['d', 4]], new Set(['d']), 3).keys()], ['b', 'c', 'd']);
  assert.deepEqual([...cuPlafon(h, [['d', 4]], new Set(['a', 'd']), 3).keys()], ['a', 'c', 'd']);
  // Toate folosite: peste plafon, dar nimic nu pleacă (altfel s-ar recalcula una pe alta).
  assert.deepEqual([...cuPlafon(h, [['d', 4]], new Set(['a', 'b', 'c', 'd']), 3).keys()], ['a', 'b', 'c', 'd']);
  // Una recalculată trece la capăt.
  assert.deepEqual([...cuPlafon(h, [['a', 9]], new Set(), 3).entries()], [['b', 2], ['c', 3], ['a', 9]]);
});
