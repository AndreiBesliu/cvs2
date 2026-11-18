/**
 * Felia 11.3↑b (ADR 0210, varianta a): distanța propusă cu urechi, pe hârtie. Tăietura profilului exterior ocupă, în afara
 * piesei, cât freza; între tăieturile a două vecine rămân deci g − 2 × freza mm de lemn, iar urechile dinspre vecini țin doar
 * de el. Propunerea lasă cel puțin 3 mm: 2 × freza + 3, rotunjită în sus la milimetru. Ø3,175: 2 × 3,175 + 3 = 9,35 → 10
 * (3,65 mm de lemn, ca pe placa 11); Ø3: 9 (3 mm); Ø3,5: 10 exact (3 mm, fără să urce la 11 din rotunjire); Ø6: 15; Ø6,35
 * (1/4″): 15,7 → 16; Ø8: 19. Fără urechi, minimul rămâne freza. Sub propunere, avertismentul; sub freză, refuzul. Cu
 * distanța propusă, cele 25 de plăcuțe 80 × 30 ale plăcii 11 ajung exact unde le pune fișa ei (foi de 300 × 220, colțurile
 * la x = 10 / 100 / 190 și y = 180 / 140 / 100 / 60 / 20; 15 + 10).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ASEZARE_IMPLICITA, distantaMinima, distantaPropusa, peFoi, planAsezare, urechiLibere, type OptiuniAsezare, type PlanAsezare } from '../../src/model/asezare.ts';
import { cuUrechi, distantaCuUrechi, frezaExterioara, LEMN_URECHI } from '../../src/model/distantaPiese.ts';
import { documentNou, operatieImplicita, type Document, type Foaie, type Instanta, type Operatie, type Piesa } from '../../src/model/document.ts';

const ID = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const URECHI = { numar: 2, latime: 6, grosime: 2 };

/** Un profil al dreptunghiului `l × h`, cu freza, latura și urechile cerute. */
function profil(l: number, h: number, freza: number, latura: Operatie['latura'] = 'exterior', urechi: Operatie['urechi'] = URECHI): Operatie {
  const o = operatieImplicita('r', { tip: 'dreptunghi', latime: l, inaltime: h, razaColt: 0 });
  return { ...o, latura, urechi, scula: { ...o.scula, diametru: freza } };
}

/** O plăcuță `l × h`, cu colțul stânga-jos în originea piesei, cu operațiile date. */
const placuta = (id: string, operatii: Operatie[], l = 80, h = 30): Piesa => ({
  id, radacina: { tip: 'element', id: 'r', forma: { tip: 'dreptunghi', latime: l, inaltime: h, razaColt: 0 }, matrice: ID }, operatii,
});

const inst = (id: string, piesa: string): Instanta => ({ id, piesa, x: 0, y: 0, rotire: 0 });
const foaie = (id: string, instante: Instanta[], latime = 300, inaltime = 200, grosime = 12): Foaie => ({ id, stoc: { latime, inaltime, grosime }, instante });
const proiect = (foi: Foaie[], piese: Piesa[]): Document => ({ ...documentNou({ latime: 300, inaltime: 200, grosime: 12 }), piese, foi });
const opt = (d: number, o: Partial<OptiuniAsezare> = {}): OptiuniAsezare => ({ ...ASEZARE_IMPLICITA, distantaX: d, distantaY: d, ...o });
const bun = (p: PlanAsezare): Extract<PlanAsezare, { ok: true }> => {
  if (!p.ok) throw new Error(`refuz: ${p.motiv}`);
  return p;
};

test('regula, pe hârtie: 2 × freza + 3 mm, rotunjită în sus la milimetru; fără urechi, freza', () => {
  assert.equal(LEMN_URECHI, 3);
  const cazuri: ReadonlyArray<readonly [number, number]> = [[3.175, 10], [3, 9], [3.5, 10], [6, 15], [6.35, 16], [8, 19], [2.5, 8]];
  for (const [freza, d] of cazuri) {
    assert.equal(distantaCuUrechi(freza, true), d, `Ø${freza}`);
    // Lemnul dintre tăieturi: cel puțin 3 mm, sub 4 (rotunjirea adaugă mai puțin de un milimetru).
    assert.ok(d - 2 * freza >= 3 - 1e-9 && d - 2 * freza < 4, `lemnul la Ø${freza}: ${d - 2 * freza}`);
    assert.equal(distantaCuUrechi(freza, false), freza, `Ø${freza}, fără urechi`);
  }
});

test('urechile contează doar pe un profil exterior; freza exterioară e cea mai mare dintre profilele exterioare', () => {
  assert.equal(cuUrechi(placuta('p', [profil(80, 30, 3.175)])), true);
  assert.equal(cuUrechi(placuta('p', [profil(80, 30, 3.175, 'exterior', null)])), false);
  assert.equal(cuUrechi(placuta('p', [profil(80, 30, 3.175, 'interior')])), false, 'urechile unui miez țin miezul, nu piesa');
  assert.equal(cuUrechi(placuta('p', [])), false);
  assert.equal(frezaExterioara(placuta('p', [profil(80, 30, 6, 'exterior', null), profil(80, 30, 3.175), profil(80, 30, 10, 'interior')])), 6);
});

test('distanța propusă: a pieselor alese; cu urechi pe oricare, 2 × cea mai mare freză + 3; altfel minimul', () => {
  const doc = proiect([foaie('f1', [inst('a', 'u'), inst('b', 'u'), inst('c', 'f'), inst('d', 'm')])], [
    placuta('u', [profil(80, 30, 3.175)]), placuta('f', [profil(80, 30, 3.175, 'exterior', null)]), placuta('m', [profil(80, 30, 6, 'exterior', null)]),
  ]);
  assert.equal(distantaPropusa(doc, ['a', 'b'], 'f1'), 10);
  assert.equal(distantaPropusa(doc, ['c'], 'f1'), 3.175, 'fără urechi: minimul, freza');
  assert.equal(distantaMinima(doc, ['a', 'c', 'd'], 'f1'), 6);
  assert.equal(distantaPropusa(doc, ['a', 'c', 'd'], 'f1'), 15, 'urechile uneia și freza de 6 a alteia: 2 × 6 + 3');
  assert.equal(distantaPropusa(doc, ['c', 'd'], 'f1'), 6, 'piesa cu urechi, nealeasă, nu schimbă nimic');
  assert.equal(distantaPropusa(doc, ['a'], 'alta'), 0, 'o foaie care nu există');
});

test('avertismentul: între freză și propunere, pe X sau pe Y; la propunere, nimic; sub freză, refuzul planului', () => {
  const doc = proiect([foaie('f1', [inst('a', 'u'), inst('b', 'u'), inst('c', 'f')])], [
    placuta('u', [profil(80, 30, 3.175)]), placuta('f', [profil(80, 30, 3.175, 'exterior', null)]),
  ]);
  const ab = ['a', 'b'];
  assert.equal(urechiLibere(doc, ab, 'f1', opt(10)), null);
  assert.equal(urechiLibere(doc, ab, 'f1', opt(12)), null);
  assert.equal(urechiLibere(doc, ab, 'f1', opt(9.99)), 10);
  assert.equal(urechiLibere(doc, ab, 'f1', opt(5)), 10);
  assert.equal(urechiLibere(doc, ab, 'f1', opt(3.175)), 10, 'chiar la freză: primit, cu avertismentul');
  assert.equal(urechiLibere(doc, ab, 'f1', opt(10, { distantaY: 5 })), 10, 'pe Y');
  assert.equal(urechiLibere(doc, ab, 'f1', opt(5, { distantaY: 10 })), 10, 'pe X');
  assert.equal(urechiLibere(doc, ab, 'f1', opt(3)), null, 'sub freză nu se avertizează: planul refuză');
  assert.deepEqual(planAsezare(doc, ab, 'f1', opt(3)), { ok: false, motiv: 'distanta' });
  assert.ok(planAsezare(doc, ab, 'f1', opt(5)).ok, 'sub propunere, planul se face (doar avertismentul)');
  assert.equal(urechiLibere(doc, ['c'], 'f1', opt(5)), null, 'fără urechi, fără avertisment');
  assert.equal(urechiLibere(doc, ab, 'f1', opt(Number.NaN)), null, 'o valoare greșită: refuzul planului, nu avertismentul');
});

test('ancora pe hârtie: cu distanța propusă (10 la Ø3,175), cele 25 de plăcuțe ale plăcii 11 ajung unde le pune fișa ei', () => {
  const ids = Array.from({ length: 25 }, (_, k) => `i${k + 1}`);
  const doc = proiect([foaie('f1', ids.map((id) => inst(id, 'u')), 300, 220)], [placuta('u', [profil(80, 30, 3.175)])]);
  const d = distantaPropusa(doc, ids, 'f1');
  assert.equal(d, 10);
  const p = bun(planAsezare(doc, ids, 'f1', opt(d)));
  const xy = (f: string | number): number[][] => p.locuri.filter((l) => l.foaie === f).map((l) => [l.x, l.y]);
  const randuri = [180, 140, 100, 60, 20], coloane = [10, 100, 190];
  assert.deepEqual(xy('f1'), randuri.flatMap((y) => coloane.map((x) => [x, y])));
  assert.deepEqual(xy(0), [...randuri.slice(0, 3).flatMap((y) => coloane.map((x) => [x, y])), [10, 60]]);
  assert.deepEqual(peFoi(p), [['f1', 15], [0, 10]]);
  // Între două plăcuțe vecine, pe rând și între rânduri: 10 − 2 × 3,175 = 3,65 mm de lemn.
  assert.ok(Math.abs(100 - (10 + 80) - 2 * 3.175 - 3.65) < 1e-9);
  assert.ok(Math.abs(180 - (140 + 30) - 2 * 3.175 - 3.65) < 1e-9);
});
