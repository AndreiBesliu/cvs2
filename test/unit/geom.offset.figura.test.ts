/**
 * Offsetul unei figuri (ADR 0123, `offsetFigura`, aldinul textului): contururi par-impar, oricâte exterioare, golurile și
 * insulele lor, spre exterior și spre interior. Valorile pe hârtie: pătratul cu un gol crescut și strâns, golul care se închide,
 * două pătrate care se unesc, insula care acoperă golul în care stă; sensul în care vin contururile nu contează; refuzurile.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LINIE, arieCuSemn, inverseaza, type Contur } from '../../src/geom/contur.ts';
import { inRegiune } from '../../src/geom/distanta.ts';
import { offsetFigura, type Regiune } from '../../src/geom/offset.ts';

const poligon = (...p: Array<[number, number]>): Contur => ({ inchis: true, varfuri: p.map(([x, y]) => ({ p: { x, y }, s: LINIE })) });
const drept = (x: number, y: number, w: number, h: number): Contur => poligon([x, y], [x + w, y], [x + w, y + h], [x, y + h]);
/** Aria unui pătrat cu latura l crescut cu d (colțurile rotunjite cu raza d). */
const crescut = (l: number, d: number): number => (l + 2 * d) ** 2 - (4 - Math.PI) * d * d;
const contururi = (r: readonly Regiune[]): Contur[] => r.flatMap((g) => [g.exterior, ...g.gauri]);
/** Aria figurii: exterioarele trigonometrice adună, golurile orare scad. */
const arie = (r: readonly Regiune[]): number => contururi(r).reduce((s, c) => s + arieCuSemn(c), 0);

test('pe hârtie: pătratul 10 cu golul 4 la mijloc, crescut cu 1: exteriorul 12 cu colțurile rotunjite, golul 2 cu colțuri ascuțite', () => {
  const r = offsetFigura([drept(0, 0, 10, 10), drept(3, 3, 4, 4)], 1);
  assert.ok(r.ok, r.ok ? '' : r.motiv);
  if (!r.ok) return;
  assert.equal(r.regiuni.length, 1);
  const g = r.regiuni[0]!;
  assert.ok(Math.abs(arieCuSemn(g.exterior) - crescut(10, 1)) < 1e-9, String(arieCuSemn(g.exterior)));
  assert.equal(g.exterior.varfuri.filter((v) => v.s.tip === 'A').length, 4);
  assert.equal(g.gauri.length, 1);
  assert.ok(Math.abs(arieCuSemn(g.gauri[0]!) + 4) < 1e-9);
  const colturi = g.gauri[0]!.varfuri.map((v) => [v.p.x, v.p.y].join(',')).sort();
  assert.deepEqual(colturi, ['4,4', '4,6', '6,4', '6,6']);
  assert.ok(Math.abs(arie(r.regiuni) - (crescut(10, 1) - 4)) < 1e-9);
});

test('pe hârtie: aceeași figură strânsă cu 1: exteriorul 8, golul 6 cu colțurile rotunjite; contururile date în orice sens', () => {
  for (const intrare of [[drept(0, 0, 10, 10), drept(3, 3, 4, 4)], [inverseaza(drept(0, 0, 10, 10)), inverseaza(drept(3, 3, 4, 4))]]) {
    const r = offsetFigura(intrare, -1);
    assert.ok(r.ok, r.ok ? '' : r.motiv);
    if (!r.ok) return;
    assert.equal(r.regiuni.length, 1);
    assert.ok(Math.abs(arieCuSemn(r.regiuni[0]!.exterior) - 64) < 1e-9);
    assert.ok(Math.abs(arieCuSemn(r.regiuni[0]!.gauri[0]!) + crescut(4, 1)) < 1e-9);
    // Crescută cu 1 din sensurile întoarse, iese la fel ca din sensurile obișnuite.
    const c = offsetFigura(intrare, 1);
    assert.ok(c.ok && Math.abs(arie(c.regiuni) - (crescut(10, 1) - 4)) < 1e-9);
  }
});

test('pe hârtie: un gol mai îngust de 2d se închide; două pătrate la 1 mm se unesc la 0,75', () => {
  const inchis = offsetFigura([drept(0, 0, 10, 10), drept(4.5, 4.5, 1, 1)], 1);
  assert.ok(inchis.ok && inchis.regiuni.length === 1 && inchis.regiuni[0]!.gauri.length === 0, inchis.ok ? '' : inchis.motiv);
  if (inchis.ok) assert.ok(Math.abs(arie(inchis.regiuni) - crescut(10, 1)) < 1e-9);
  const unite = offsetFigura([drept(0, 0, 4, 4), drept(5, 0, 4, 4)], 0.75);
  assert.ok(unite.ok, unite.ok ? '' : unite.motiv);
  if (!unite.ok) return;
  assert.equal(unite.regiuni.length, 1);
  assert.equal(unite.regiuni[0]!.gauri.length, 0);
  const c = contururi(unite.regiuni);
  // Golul dintre ele e plin; deasupra lui, între arcele colțurilor (centrele (4, 4) și (5, 4), raza 0,75, tăiate la
  // y = 4 + √(0,75² − 0,5²) = 4,5590), rămâne o scobitură: (4,5; 4,7) e afară, (4,5; 4,5) înăuntru.
  assert.ok(inRegiune({ x: 4.5, y: 2 }, c) && inRegiune({ x: 4.5, y: 4.5 }, c) && !inRegiune({ x: 4.5, y: 4.7 }, c));
  // Aria: cele două pătrate crescute, minus partea comună: dreptunghiul 0,5 × 4 dintre ele și, sus și jos, câte o jumătate
  // din lentila a două cercuri de rază 0,75 cu centrele la 1 mm, r² acos(0,5 / r) − 0,5 √(r² − 0,5²) fiecare.
  const comun = 0.5 * 4 + 2 * (0.75 * 0.75 * Math.acos(0.5 / 0.75) - 0.5 * Math.sqrt(0.75 * 0.75 - 0.25));
  assert.ok(Math.abs(arie(unite.regiuni) - (2 * crescut(4, 0.75) - comun)) < 1e-6, `${arie(unite.regiuni)} față de ${2 * crescut(4, 0.75) - comun}`);
});

test('pe hârtie: insula din golul unui pătrat crește peste gol (care se strânge): figura rămâne fără gol', () => {
  // Exteriorul 20, golul 10 (5–15), insula 2 (9–11). Cu 2,5: golul ar avea 5 (7,5–12,5), insula 7 (6,5–13,5) îl acoperă.
  const r = offsetFigura([drept(0, 0, 20, 20), drept(5, 5, 10, 10), drept(9, 9, 2, 2)], 2.5);
  assert.ok(r.ok, r.ok ? '' : r.motiv);
  if (!r.ok) return;
  assert.equal(r.regiuni.length, 1);
  assert.equal(r.regiuni[0]!.gauri.length, 0);
  assert.ok(Math.abs(arie(r.regiuni) - crescut(20, 2.5)) < 1e-9);
  // Cu 1, golul (5–15 strâns la 6–14) și insula (8–12, rotunjită) rămân: exteriorul cu golul lui și insula.
  const m = offsetFigura([drept(0, 0, 20, 20), drept(5, 5, 10, 10), drept(9, 9, 2, 2)], 1);
  assert.ok(m.ok && m.regiuni.length === 2, m.ok ? '' : m.motiv);
  if (m.ok) assert.ok(Math.abs(arie(m.regiuni) - (crescut(20, 1) - 64 + crescut(2, 1))) < 1e-9, String(arie(m.regiuni)));
});

test('refuzurile: un contur deschis, nimic, distanța sub rezoluție sau nefinită; niciodată o excepție', () => {
  const deschis = { ...drept(0, 0, 10, 10), inchis: false };
  for (const [c, d] of [[[deschis], 1], [[], 1], [[drept(0, 0, 10, 10)], 0.001], [[drept(0, 0, 10, 10)], Number.NaN], [[drept(0, 0, 10, 10)], 0]] as const) {
    const r = offsetFigura(c, d);
    assert.equal(r.ok, false, `${JSON.stringify(d)}`);
  }
  // Strâns prea mult: dispare, cu motivul frezei care nu încape.
  const mic = offsetFigura([drept(0, 0, 10, 10)], -6);
  assert.ok(!mic.ok && mic.motiv.startsWith('scula nu încape'));
});
