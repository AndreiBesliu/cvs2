/**
 * Offsetul interior al unei regiuni cu găuri (ADR 0073, `offsetRegiune`): valorile pe hârtie, gruparea găurilor în
 * exteriorul care le cuprinde (și când o bucată stă în gaura alteia) și garda ieșirii față de toate contururile.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LINIE, arieCuSemn, inverseaza, type Contur } from '../../src/geom/contur.ts';
import { offsetRegiune, verificaIesire } from '../../src/geom/offset.ts';

const poligon = (...p: Array<[number, number]>): Contur => ({ inchis: true, varfuri: p.map(([x, y]) => ({ p: { x, y }, s: LINIE })) });
const drept = (x: number, y: number, w: number, h: number): Contur => poligon([x, y], [x + w, y], [x + w, y + h], [x, y + h]);
/** Aria unui pătrat cu latura l decalat cu d spre exterior (colțurile rotunjite cu raza d). */
const crescut = (l: number, d: number): number => (l + 2 * d) ** 2 - (4 - Math.PI) * d * d;

test('regiunea pe hârtie: dreptunghiul 100 × 60 cu insula 20 × 20 la mijloc: la 3 mm o bucată cu o gaură, la 12 mm două bucăți', () => {
  const ext = drept(0, 0, 100, 60), ins = drept(40, 20, 20, 20);
  const a = offsetRegiune(ext, [ins], -3);
  assert.ok(a.ok, a.ok ? '' : a.motiv);
  if (!a.ok) return;
  assert.equal(a.regiuni.length, 1);
  assert.ok(Math.abs(arieCuSemn(a.regiuni[0]!.exterior) - 94 * 54) < 1e-6);
  assert.equal(a.regiuni[0]!.gauri.length, 1);
  assert.ok(Math.abs(arieCuSemn(a.regiuni[0]!.gauri[0]!) + crescut(20, 3)) < 1e-6);
  // La 12 mm, golurile de 20 mm de sus și de jos s-au închis (la 10 mm, exact pragul, decide a doua încercare): stânga și
  // dreapta, câte 16 × 36 plus colțurile de lângă insulă, ∫₀⁸ (12 − √(144 − t²)) dt fiecare.
  const b = offsetRegiune(ext, [ins], -12);
  assert.ok(b.ok && b.regiuni.length === 2, b.ok ? '' : b.motiv);
  const colt = 96 - (4 * Math.sqrt(80) + 72 * Math.asin(2 / 3));
  if (b.ok) for (const r of b.regiuni) assert.ok(Math.abs(arieCuSemn(r.exterior) - (16 * 36 + 2 * colt)) < 1e-6 && r.gauri.length === 0, String(arieCuSemn(r.exterior)));
  // Exact la prag (golul de 20 mm = 2d), prima încercare cade; a doua, cu 1e-4 mm mai adânc, dă cele două bucăți.
  const prag = offsetRegiune(ext, [ins], -10);
  assert.ok(prag.ok && prag.regiuni.length === 2, prag.ok ? '' : prag.motiv);
  const laPrag = 800 + 2 * (100 - 25 * Math.PI);
  if (prag.ok) for (const r of prag.regiuni) assert.ok(arieCuSemn(r.exterior) < laPrag && arieCuSemn(r.exterior) > laPrag - 0.02, String(arieCuSemn(r.exterior)));
  // Insula dată în orice sens dă același rezultat; fără insule, offsetul conturului.
  const c = offsetRegiune(ext, [inverseaza(ins)], -3);
  assert.ok(c.ok && Math.abs(arieCuSemn(c.regiuni[0]!.gauri[0]!) + crescut(20, 3)) < 1e-6);
  const fara = offsetRegiune(ext, [], -3);
  assert.ok(fara.ok && fara.regiuni.length === 1 && fara.regiuni[0]!.gauri.length === 0);
  // Prea adânc: freza nu încape.
  const d = offsetRegiune(ext, [ins], -25);
  assert.ok(!d.ok && d.motiv.startsWith('scula nu încape'));
});

test('regiunea: bucata din golul unei insule în „C” are gaura ei (cea mai mică regiune care o cuprinde), nu a bucății mari', () => {
  // Insula în „C”: inelul pătrat 20…80 / 30…70, deschis spre dreapta pe 10 mm (y 45…55); în golul lui, o insulă 10 × 10.
  const C = poligon([20, 20], [80, 20], [80, 45], [70, 45], [70, 30], [30, 30], [30, 70], [70, 70], [70, 55], [80, 55], [80, 80], [20, 80]);
  const r = offsetRegiune(drept(0, 0, 100, 100), [C, drept(45, 45, 10, 10)], -6);
  assert.ok(r.ok, r.ok ? '' : r.motiv);
  if (!r.ok) return;
  // La 6 mm, deschiderea de 10 mm s-a închis: bucata mare (88 × 88, cu gaura din jurul lui C) și golul lui C, separat, cu
  // gaura din jurul insulei mici (22 × 22 cu colțurile rotunjite), deși și bucata mare o cuprinde.
  assert.equal(r.regiuni.length, 2);
  const [mare, mica] = [...r.regiuni].sort((x, y) => arieCuSemn(y.exterior) - arieCuSemn(x.exterior));
  assert.ok(Math.abs(arieCuSemn(mare!.exterior) - 88 * 88) < 1e-6);
  assert.equal(mare!.gauri.length, 1);
  assert.ok(arieCuSemn(mare!.gauri[0]!) < -(60 * 60));
  assert.equal(mica!.gauri.length, 1);
  assert.ok(Math.abs(arieCuSemn(mica!.gauri[0]!) + crescut(10, 6)) < 1e-6, String(arieCuSemn(mica!.gauri[0]!)));
});

test('garda ieșirii unei regiuni: un traseu care trece prin insulă e refuzat, deși stă la |d| de exterior', () => {
  const ext = drept(0, 0, 100, 60), gaura = inverseaza(drept(40, 1, 20, 58));
  // Offsetul exteriorului fără insulă: latura de jos trece prin insulă, la 2 mm de marginea ei.
  assert.equal(verificaIesire([ext, gaura], -3, [drept(3, 3, 94, 54)]), 'offsetul a dat un punct la 2.0000 mm de contur, nu la 3 mm');
  assert.equal(verificaIesire(ext, -3, [drept(3, 3, 94, 54)]), null);
  // Și argumentele greșite sunt refuzate cu motiv.
  assert.match((() => { const x = offsetRegiune(ext, [{ inchis: false, varfuri: [] }], -3); return x.ok ? '' : x.motiv; })(), /contururi închise/);
  assert.match((() => { const x = offsetRegiune(ext, [], 3); return x.ok ? '' : x.motiv; })(), /doar spre interior/);
});
