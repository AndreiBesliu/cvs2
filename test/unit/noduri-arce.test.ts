import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cerculArcului } from '../../src/geom/conturBaza.ts';
import { TOLERANTA_PROIECT } from '../../src/geom/toleranta.ts';
import { incarca } from '../../src/model/incarcare.ts';
import { istoricNou } from '../../src/model/jurnal.ts';
import { arcInCubice, arceInCubice, caleDinForma, manereAfisate, manereNod, mutaManer, neted, schimbaTipNod, tipNod, type FormaCale } from '../../src/model/noduri.ts';
import { operatieImplicita, type VarfDoc } from '../../src/model/document.ts';
import { creeazaRegistru, ruleaza, stare } from '../../src/ui/actiuni.ts';
import { ACTIUNI_DOCUMENT, type ContextDocument } from '../../src/ui/actiuniDocument.ts';
import '../../src/ui/actiuniDocumentCalcul.ts';
import { docDin, ID } from './ajutor-document.ts';

/**
 * Orice nod își schimbă tipul (ADR 0068): arcul vecin devine curbe ale aceluiași cerc, sub toleranța proiectului (0,001 mm),
 * cu tangentele lui la capete; nodurile de pe arce sunt curbe (pe cerc, pe ambele părți); mânerul arătat al unui nod de pe arc
 * e mânerul de după conversie; nodul își schimbă indexul cât intră vârfuri înaintea lui; un contur dintr-o piesă cu mai multe
 * se editează prin `document.forma` cu elementul lui.
 */

const P = (x: number, y: number) => ({ x, y });
const L = { tip: 'L' as const };

/** Abaterea maximă de la cerc a cubicelor (64 de puncte pe fiecare) și numărul lor. */
function abatere(a: { x: number; y: number }, b: { x: number; y: number }, bulge: number): { max: number; n: number; v: VarfDoc[] } {
  const v = arcInCubice(a, b, bulge);
  const { centru, raza } = cerculArcului(a, b, bulge);
  let max = 0;
  v.forEach((x, k) => {
    const p0 = x.p, p3 = k === v.length - 1 ? b : v[k + 1]!.p;
    if (x.s.tip !== 'C') throw new Error('nu e cubică');
    const { c1, c2 } = x.s;
    for (let j = 0; j <= 64; j++) {
      const t = j / 64, m = 1 - t;
      const q = P(m * m * m * p0.x + 3 * m * m * t * c1.x + 3 * m * t * t * c2.x + t * t * t * p3.x, m * m * m * p0.y + 3 * m * m * t * c1.y + 3 * m * t * t * c2.y + t * t * t * p3.y);
      max = Math.max(max, Math.abs(Math.hypot(q.x - centru.x, q.y - centru.y) - raza));
    }
  });
  return { max, n: v.length, v };
}

test('arcul devine cubice ale aceluiași cerc, sub 0,001 mm; câte trebuie (semicercul R15: 3); tangentele de la capete rămân', () => {
  for (const [a, b, bulge, eticheta] of [
    [P(15, 0), P(-15, 0), 1, 'semicercul R15'], [P(100, 0), P(0, 100), Math.tan(Math.PI / 8), 'sfertul R100'],
    [P(0, 0), P(50, 0), -0.2, 'un arc orar'], [P(500, 0), P(0, 500), Math.tan(Math.PI / 8), 'sfertul R500'],
  ] as const) {
    const r = abatere(a, b, bulge);
    assert.ok(r.max <= TOLERANTA_PROIECT, `${eticheta}: ${r.max}`);
    assert.deepEqual(r.v[0]!.p, a, `${eticheta}: începe în a`);
  }
  assert.equal(abatere(P(15, 0), P(-15, 0), 1).n, 3);
  // Tangenta la început: perpendiculară pe rază, în sensul arcului (semicercul trigonometric din (15, 0) urcă).
  const v = arcInCubice(P(15, 0), P(-15, 0), 1)[0]!;
  assert.ok(v.s.tip === 'C' && Math.abs(v.s.c1.x - 15) < 1e-12 && v.s.c1.y > 0, JSON.stringify(v.s));
});

test('pe cerc, nodurile sunt curbe pe ambele părți; „ambele” le dă mânere netede fără să schimbe cercul; „colț” îl face colț', () => {
  const cerc = caleDinForma({ tip: 'cerc', raza: 15 });
  assert.equal(tipNod(cerc, 0), 'ambele');
  const r = schimbaTipNod(cerc, 0, 'ambele');
  assert.ok(typeof r !== 'string');
  assert.equal(r.nod, 0, 'nodul 0 rămâne primul');
  assert.ok(r.cale.varfuri.every((x) => x.s.tip === 'C'), 'doar cubice');
  assert.ok(neted(r.cale, r.nod), 'neted: tangentele cercului');
  for (const x of r.cale.varfuri) aproape(Math.hypot(x.p.x, x.p.y), 15, 'vârfurile pe cerc');
  const c = schimbaTipNod(cerc, 0, 'colt');
  assert.ok(typeof c !== 'string');
  assert.equal(tipNod(c.cale, c.nod), 'colt');
});

test('colțul rotunjit: nodul dintre linie și arc face curbă pe o parte; mânerul arătat e cel de după conversie', () => {
  const d = caleDinForma({ tip: 'dreptunghi', latime: 100, inaltime: 60, razaColt: 10 });
  const k = d.varfuri.findIndex((x, j) => x.s.tip === 'A' && d.varfuri[(j - 1 + d.varfuri.length) % d.varfuri.length]!.s.tip === 'L');
  assert.ok(k >= 0);
  assert.equal(tipNod(d, k), 'inainte', 'linia vine, arcul pleacă');
  const m = manereAfisate(d, k);
  assert.equal(m.inapoi, null);
  const conv = arceInCubice(d, k, ['inapoi', 'inainte']);
  assert.deepEqual(m.inainte, manereNod(conv.cale, conv.nod).inainte, 'același mâner');
  assert.equal(conv.nod, k, 'arcul de după nod nu-l mută');
  // Tras, mânerul schimbă doar curba de după nod.
  const tras = mutaManer(conv.cale, conv.nod, 'inainte', P(m.inainte!.x + 5, m.inainte!.y), false);
  assert.notDeepEqual(tras.varfuri[conv.nod]!.s, conv.cale.varfuri[conv.nod]!.s);
});

test('arcul dinaintea nodului îl mută cu câte vârfuri intră; pe o cale închisă, nodul 0 rămâne 0', () => {
  const c: FormaCale = { tip: 'cale', inchis: true, varfuri: [{ p: P(0, 0), s: L }, { p: P(30, 0), s: { tip: 'A', bulge: 1 } }, { p: P(30, 30), s: L }, { p: P(0, 30), s: { tip: 'A', bulge: 1 } }] };
  const r = arceInCubice(c, 2, ['inapoi', 'inainte']);
  const n = arcInCubice(P(30, 0), P(30, 30), 1).length;
  assert.equal(r.nod, 2 + n - 1);
  assert.deepEqual(r.cale.varfuri[r.nod]!.p, P(30, 30));
  const z = arceInCubice(c, 0, ['inapoi']);
  assert.equal(z.nod, 0);
  assert.equal(z.cale.varfuri.length, 4 + arcInCubice(P(0, 30), P(0, 0), 1).length - 1);
});

test('un contur dintr-o piesă cu mai multe: `document.forma` cu elementul lui îl înlocuiește doar pe el; fără element, refuz', () => {
  const R = creeazaRegistru(ACTIUNI_DOCUMENT, () => true);
  const exterior = caleDinForma({ tip: 'dreptunghi', latime: 100, inaltime: 60, razaColt: 0 });
  const gaura = caleDinForma({ tip: 'cerc', raza: 10 });
  const doc0 = docDin({ latime: 300, inaltime: 200, grosime: 18 }, { id: 'p', forma: exterior, matrice: { ...ID, e: 20, f: 20 } });
  const op = operatieImplicita('exterior', exterior);
  const doc = { ...doc0, piese: doc0.piese.map((x) => ({ ...x, operatii: [{ ...op, noduri: ['c1'] }, { ...op, id: 'interior', latura: 'interior' as const, noduri: ['c2'] }], radacina: { tip: 'grup' as const, id: 'g', matrice: ID, copii: [
    { tip: 'element' as const, id: 'c1', forma: exterior, matrice: ID }, { tip: 'element' as const, id: 'c2', forma: { ...gaura, varfuri: gaura.varfuri.map((v) => ({ ...v, p: P(v.p.x + 50, v.p.y + 30) })) }, matrice: ID },
  ] } })) };
  assert.ok(incarca(JSON.parse(JSON.stringify(doc))).ok);
  let h = istoricNou(doc);
  const noua: FormaCale = { tip: 'cale', inchis: true, varfuri: [{ p: P(45, 25), s: L }, { p: P(55, 25), s: L }, { p: P(55, 35), s: L }, { p: P(45, 35), s: L }] };
  const c: ContextDocument = { istoric: () => h, scrie: (n) => { h = n; }, selectie: () => ['p'], selecteaza: () => undefined, formaEditata: () => noua, nodEditat: () => 'c2' };
  assert.deepEqual(ruleaza(R, 'document.forma', c), { ok: true });
  const r = h.doc.piese[0]!.radacina;
  assert.ok(r.tip === 'grup');
  assert.deepEqual(r.copii.map((x) => (x.tip === 'element' ? [x.id, x.forma] : null)), [['c1', exterior], ['c2', noua]]);
  const { nodEditat: _fara, ...faraElement } = c;
  assert.equal(stare(R, 'document.forma', faraElement).ok, false, 'un grup cere elementul');
  assert.equal(stare(R, 'document.forma', { ...c, nodEditat: () => 'nu-exista' }).ok, false);
});

function aproape(a: number, b: number, mesaj: string): void {
  assert.ok(Math.abs(a - b) < 1e-9, `${mesaj}: ${a} ≠ ${b}`);
}
