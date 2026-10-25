import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formaNoduri, inversa, laturaLovita, nodLovit, conturNoduri, drumSvg } from '../../src/app/noduriCalcul.ts';
import { cerculArcului } from '../../src/geom/conturBaza.ts';
import { aplica, compune, rotatie } from '../../src/geom/matrice.ts';
import { cutieElement } from '../../src/model/forme.ts';
import { adaugaNod, caleDinForma, mutaNod, stergeNod, type FormaCale } from '../../src/model/noduri.ts';
import { docDin, ID } from './ajutor-document.ts';

/**
 * Editarea nodurilor (ADR 0062): calea exactă a formelor parametrice, mutarea unui nod cu punctele de control vecine,
 * nodul nou pe linie, arc și cubică fără aproximare, scoaterea doar dintre linii; ce formă se poate edita; nodul și latura
 * de sub cursor.
 */

const P = (x: number, y: number) => ({ x, y });
const L = { tip: 'L' as const };
const patrat: FormaCale = { tip: 'cale', inchis: true, varfuri: [{ p: P(0, 0), s: L }, { p: P(10, 0), s: L }, { p: P(10, 10), s: L }, { p: P(0, 10), s: L }] };

test('dreptunghiul și cercul devin căile conturului lor, cu aceeași cutie (colțurile rotunjite rămân arce)', () => {
  const d = caleDinForma({ tip: 'dreptunghi', latime: 100, inaltime: 60, razaColt: 10 });
  assert.equal(d.inchis, true);
  assert.ok(d.varfuri.some((v) => v.s.tip === 'A'), 'colțurile ca arce');
  const c = caleDinForma({ tip: 'cerc', raza: 15 });
  for (const [forma, cale] of [[{ tip: 'dreptunghi' as const, latime: 100, inaltime: 60, razaColt: 10 }, d], [{ tip: 'cerc' as const, raza: 15 }, c]] as const) {
    const a = cutieElement({ forma, matrice: ID }), b = cutieElement({ forma: cale, matrice: ID });
    for (const k of ['minX', 'minY', 'maxX', 'maxY'] as const) assert.ok(Math.abs(a[k] - b[k]) < 1e-9, `${forma.tip} ${k}`);
  }
  assert.equal(caleDinForma(patrat), patrat, 'o cale rămâne aceeași');
});

test('mutarea: nodul ajunge exact în punct; punctele de control vecine ale cubicelor se mută la fel; arcul își păstrează bulge-ul', () => {
  const m = mutaNod(patrat, 2, P(12, 13));
  assert.deepEqual(m.varfuri[2]!.p, P(12, 13));
  assert.deepEqual(m.varfuri.map((v) => v.p), [P(0, 0), P(10, 0), P(12, 13), P(0, 10)]);
  const curba: FormaCale = { tip: 'cale', inchis: false, varfuri: [
    { p: P(0, 0), s: { tip: 'C', c1: P(0, 5), c2: P(5, 10) } }, { p: P(10, 10), s: { tip: 'C', c1: P(15, 10), c2: P(20, 5) } }, { p: P(20, 0), s: L },
  ] };
  const n = mutaNod(curba, 1, P(11, 12));
  assert.deepEqual(n.varfuri[0]!.s, { tip: 'C', c1: P(0, 5), c2: P(6, 12) }, 'c2 al segmentului dinainte');
  assert.deepEqual(n.varfuri[1]!.s, { tip: 'C', c1: P(16, 12), c2: P(20, 5) }, 'c1 al segmentului lui');
  const arc: FormaCale = { tip: 'cale', inchis: false, varfuri: [{ p: P(0, 0), s: { tip: 'A', bulge: 0.5 } }, { p: P(10, 0), s: L }] };
  assert.deepEqual(mutaNod(arc, 1, P(20, 0)).varfuri[0]!.s, { tip: 'A', bulge: 0.5 });
  assert.equal(mutaNod(patrat, 9, P(1, 1)), patrat, 'un nod care nu există: nimic');
});

test('nodul nou: linia la t, arcul în două arce ale aceluiași cerc, cubica prin de Casteljau', () => {
  const l = adaugaNod(patrat, 0, 0.25);
  assert.deepEqual(l.varfuri.map((v) => v.p), [P(0, 0), P(2.5, 0), P(10, 0), P(10, 10), P(0, 10)]);
  // Semicercul din (10, 0) în (-10, 0) prin (0, 10) (bulge 1), împărțit la jumătate: nodul în (0, 10), două sferturi.
  const semi: FormaCale = { tip: 'cale', inchis: false, varfuri: [{ p: P(10, 0), s: { tip: 'A', bulge: 1 } }, { p: P(-10, 0), s: L }] };
  const s = adaugaNod(semi, 0, 0.5);
  assert.ok(Math.abs(s.varfuri[1]!.p.x) < 1e-12 && Math.abs(s.varfuri[1]!.p.y - 10) < 1e-12);
  for (const k of [0, 1]) {
    const v = s.varfuri[k]!;
    assert.equal(v.s.tip, 'A');
    if (v.s.tip !== 'A') continue;
    assert.ok(Math.abs(v.s.bulge - Math.tan(Math.PI / 8)) < 1e-12, 'un sfert: tan(90°/4)');
    const r = cerculArcului(v.p, s.varfuri[k + 1]!.p, v.s.bulge);
    assert.ok(Math.abs(r.raza - 10) < 1e-9 && Math.hypot(r.centru.x, r.centru.y) < 1e-9, 'același cerc');
  }
  const curba: FormaCale = { tip: 'cale', inchis: false, varfuri: [{ p: P(0, 0), s: { tip: 'C', c1: P(0, 10), c2: P(10, 10) } }, { p: P(10, 0), s: L }] };
  const c = adaugaNod(curba, 0, 0.5);
  assert.deepEqual(c.varfuri[1]!.p, P(5, 7.5), 'vârful curbei');
  assert.deepEqual(c.varfuri[0]!.s, { tip: 'C', c1: P(0, 5), c2: P(2.5, 7.5) });
  assert.deepEqual(c.varfuri[1]!.s, { tip: 'C', c1: P(7.5, 7.5), c2: P(10, 5) });
  assert.equal(adaugaNod(patrat, 0, 0), patrat, 't în afara (0, 1): nimic');
});

test('scoaterea: dintre linii da; lângă un arc sau o curbă, nu; capetele unei căi deschise da; minimul de noduri', () => {
  const s = stergeNod(patrat, 2);
  assert.notEqual(typeof s, 'string');
  assert.deepEqual((s as FormaCale).varfuri.map((v) => v.p), [P(0, 0), P(10, 0), P(0, 10)]);
  assert.equal(stergeNod(s as FormaCale, 0), 'prea-putine', 'o cale închisă păstrează 3 noduri');
  const cuArc: FormaCale = { tip: 'cale', inchis: true, varfuri: [{ p: P(0, 0), s: L }, { p: P(10, 0), s: { tip: 'A', bulge: 0.3 } }, { p: P(10, 10), s: L }, { p: P(0, 10), s: L }] };
  assert.equal(stergeNod(cuArc, 1), 'curbe');
  assert.equal(stergeNod(cuArc, 2), 'curbe');
  const linie: FormaCale = { tip: 'cale', inchis: false, varfuri: [{ p: P(0, 0), s: L }, { p: P(5, 5), s: { tip: 'A', bulge: 0.2 } }, { p: P(10, 0), s: L }] };
  assert.deepEqual((stergeNod(linie, 0) as FormaCale).varfuri.map((v) => v.p), [P(5, 5), P(10, 0)]);
  const fara = stergeNod(linie, 2) as FormaCale;
  assert.deepEqual(fara.varfuri.map((v) => [v.p, v.s.tip]), [[P(0, 0), 'L'], [P(5, 5), 'L']], 'ultimul segment al căii deschise devine linie');
});

test('ce formă se poate edita: una singură, cu piesa doar a ei și un singur element; matricea și inversa ei', () => {
  const d = docDin({ latime: 300, inaltime: 200, grosime: 18 },
    { id: 'r', forma: { tip: 'dreptunghi', latime: 100, inaltime: 60, razaColt: 0 }, matrice: { ...ID, e: 20, f: 20 } },
    { id: 'c', forma: { tip: 'cerc', raza: 15 }, matrice: { ...ID, e: 200, f: 50 } });
  assert.equal(formaNoduri(d, []), 'nimic');
  assert.equal(formaNoduri(d, ['r', 'c']), 'mai-multe');
  const f = formaNoduri(d, ['r']);
  assert.ok(typeof f !== 'string');
  assert.equal(f.elemente.length, 1);
  assert.deepEqual(aplica(f.elemente[0]!.matrice, P(0, 0)), P(20, 20));
  const m = compune({ ...rotatie(30), e: 5, f: -7 }, { a: 2, b: 0, c: 0, d: -2, e: 1, f: 3 });
  const inv = inversa(m)!;
  for (const q of [P(0, 0), P(3, -4), P(100, 50)]) {
    const r = aplica(inv, aplica(m, q));
    assert.ok(Math.abs(r.x - q.x) < 1e-9 && Math.abs(r.y - q.y) < 1e-9);
  }
  assert.equal(inversa({ a: 1, b: 2, c: 2, d: 4, e: 0, f: 0 }), null, 'degenerată');
  // O piesă cu două instanțe: împărțită.
  const imp = { ...d, foi: [{ ...d.foi[0]!, instante: [...d.foi[0]!.instante, { id: 'r2', piesa: 'r', x: 0, y: 0, rotire: 0 }] }] };
  assert.equal(formaNoduri(imp, ['r']), 'piesa-impartita');
  const comp = { ...d, piese: d.piese.map((p) => (p.id === 'c' ? { ...p, radacina: { tip: 'grup' as const, id: 'c', matrice: ID, copii: [p.radacina] } } : p)) };
  // O piesă cu mai multe contururi (ADR 0068): fiecare contur, cu id-ul elementului lui.
  const fc = formaNoduri(comp, ['c']);
  assert.ok(typeof fc !== 'string');
  assert.deepEqual(fc.elemente.map((e) => e.nod), ['c']);
});

test('nodul și latura de sub cursor; drumul SVG al conturului', () => {
  assert.equal(nodLovit([P(10, 10), P(50, 50)], 13, 12, 6), 0);
  assert.equal(nodLovit([P(10, 10), P(50, 50)], 30, 30, 6), null);
  const c = conturNoduri(patrat, { ...ID, e: 100, f: 100 });
  assert.deepEqual(laturaLovita(c, P(104, 100.5), 1), { i: 0, t: 0.4 });
  assert.equal(laturaLovita(c, P(105, 105), 1), null, 'în mijloc, departe de laturi');
  const semi = conturNoduri({ tip: 'cale', inchis: false, varfuri: [{ p: P(10, 0), s: { tip: 'A', bulge: 1 } }, { p: P(-10, 0), s: L }] }, ID);
  const r = laturaLovita(semi, P(0, 10.2), 0.5);
  assert.ok(r && Math.abs(r.t - 0.5) < 1e-9, 'pe arc, la jumătatea baleiajului');
  assert.equal(drumSvg(c, { scara: 1, tx: 0, ty: 0 }), 'M 100 -100 L 110 -100 L 110 -110 L 100 -110 L 100 -100 Z');
});
