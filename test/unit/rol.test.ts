/**
 * Rolul de tăiere al unei piese (ADR 0112), pe hârtie: rolurile oferite după forme, operațiile fiecărui rol (pe o formă și pe
 * o literă cu gol), ce rămâne și ce revine la schimbarea rolului, freza potrivită rolului (cu numărul ei), rolul recunoscut
 * înapoi din operații și împărțirea peste plafonul nodurilor pe operație.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  operatieImplicita, PLAFON, VERSIUNE_SCHEMA, type Document, type ElementNod, type FormaDoc, type Operatie, type Piesa,
} from '../../src/model/document.ts';
import { programDinDocument } from '../../src/cam/job.ts';
import { frezaPentruRol, numarFreza, operatiiPentruRol, rolPiesei, roluriOferite } from '../../src/model/rol.ts';
import { operatieInMargini } from '../../src/model/schemaDocument.ts';

const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const el = (id: string, forma: FormaDoc, x = 0, y = 0): ElementNod => ({ tip: 'element', id, matrice: { ...I, e: x, f: y }, forma });
const DR = (latime: number, inaltime: number, razaColt = 0): FormaDoc => ({ tip: 'dreptunghi', latime, inaltime, razaColt });
const CERC = (raza: number): FormaDoc => ({ tip: 'cerc', raza });
const LINIE = (...puncte: ReadonlyArray<readonly [number, number]>): FormaDoc => ({
  tip: 'cale', inchis: false, varfuri: puncte.map(([x, y]) => ({ p: { x, y }, s: { tip: 'L' as const } })),
});

/** O piesă dintr-o singură formă, cu operația implicită (ca „Adaugă”). */
const simpla = (id: string, forma: FormaDoc): Piesa => ({ id, radacina: el(`${id}e`, forma), operatii: [operatieImplicita(`${id}e`, forma)] });
/** O piesă-grup cu formele și operațiile date. */
const grup = (id: string, forme: ElementNod[], operatii: Operatie[]): Piesa => ({ id, radacina: { tip: 'grup', id: `${id}g`, matrice: { ...I }, copii: forme }, operatii });
const doc = (...piese: Piesa[]): Document => ({
  schema: VERSIUNE_SCHEMA, rev: 0, piese,
  foi: [{ id: 'f1', stoc: { latime: 300, inaltime: 200, grosime: 18 }, instante: piese.map((p, k) => ({ id: `i${k}`, piesa: p.id, x: 0, y: 0, rotire: 0 })) }],
});

/** Litera cu un gol: conturul 30 × 40 și golul 10 × 20 în (10, 10), cu operațiile unui import (ADR 0035 §8). */
const litera = (): Piesa => grup('L', [el('o', DR(30, 40)), el('h', DR(10, 20), 10, 10)], [
  { ...operatieImplicita('exterior', DR(30, 40)), noduri: ['o'] },
  { ...operatieImplicita('interior', DR(30, 40)), noduri: ['h'], latura: 'interior' },
]);

/** Ce face o operație: id-ul, felul, latura și formele ei. */
const forma = (ops: readonly Operatie[] | null): unknown => ops?.map((o) => [o.id, o.tip, o.latura, o.noduri]);

test('rolurile oferite: doar cele care se potrivesc tuturor formelor piesei', () => {
  assert.deepEqual(roluriOferite(simpla('d', DR(30, 20))), ['exterior', 'interior', 'pe-linie', 'buzunar', 'vcarve']);
  assert.deepEqual(roluriOferite(simpla('c', CERC(5))), ['exterior', 'interior', 'pe-linie', 'buzunar', 'gaurire', 'vcarve']);
  assert.deepEqual(roluriOferite(simpla('l', LINIE([0, 0], [10, 0]))), ['pe-linie', 'stanga', 'dreapta']);
  assert.deepEqual(roluriOferite(litera()), ['exterior', 'interior', 'pe-linie', 'buzunar', 'vcarve']);
  // Contururi și o cale deschisă: doar pe linie (restul, din export sau după degrupare).
  assert.deepEqual(roluriOferite(grup('m', [el('a', DR(10, 10)), el('b', LINIE([0, 20], [10, 20]))], [])), ['pe-linie']);
  // Două cercuri: și găurirea; două căi deschise: nici stânga, nici dreapta (sunt ale unei singure căi).
  assert.ok(roluriOferite(grup('cc', [el('a', CERC(3)), el('b', CERC(3), 20, 0)], [])).includes('gaurire'));
  assert.deepEqual(roluriOferite(grup('ll', [el('a', LINIE([0, 0], [10, 0])), el('b', LINIE([0, 5], [10, 5]))], [])), ['pe-linie']);
  // Imbricarea peste buget (2 000 de contururi identice, fiecare în toate celelalte): fără exterior și interior.
  const suprapuse = grup('s', Array.from({ length: 2000 }, (_, k) => el(`s${k}`, DR(10, 10))), []);
  assert.deepEqual(roluriOferite(suprapuse), ['pe-linie', 'buzunar', 'vcarve']);
});

test('rolul recunoscut: al operațiilor exact așa cum le-ar da el', () => {
  assert.equal(rolPiesei(simpla('d', DR(30, 20))), 'exterior');
  // Cercul nou e o gaură (operația implicită).
  assert.equal(rolPiesei(simpla('c', CERC(5))), 'interior');
  assert.equal(rolPiesei(litera()), 'exterior');
  const L = litera();
  // Un V-carve împărțit pe două operații (din rândurile exportului) taie altă regiune: nu e rolul „V-carve”.
  assert.equal(rolPiesei({ ...L, operatii: L.operatii.map((o) => ({ ...o, tip: 'vcarve' as const, latura: 'interior' as const })) }), null);
  // O formă fără operație, sau fără nicio operație: niciun rol.
  assert.equal(rolPiesei({ ...L, operatii: [L.operatii[0]!] }), null);
  assert.equal(rolPiesei({ ...L, operatii: [] }), null);
});

test('pe o formă: rămân id-ul, freza, sensul, adâncimea, pasul și câmpurile necunoscute; restul revine la implicit', () => {
  const p0 = simpla('d', DR(30, 20));
  const p: Piesa = {
    ...p0, operatii: [{ ...p0.operatii[0]!, adancime: 12, pas: 4, sens: 'opozitie', urechi: { numar: 4, latime: 8, grosime: 2 }, rampa: { lungime: 10 }, viitor: { x: 1 } }],
  };
  const d = doc(p);
  // Între exterior și interior rămân și urechile, rampa, intrările și degajările.
  const [interior] = operatiiPentruRol(d, p, 'interior')!;
  assert.deepEqual(
    [interior!.id, interior!.tip, interior!.latura, interior!.adancime, interior!.pas, interior!.sens, interior!.urechi, interior!.rampa, interior!['viitor']],
    ['de', 'profil', 'interior', 12, 4, 'opozitie', { numar: 4, latime: 8, grosime: 2 }, { lungime: 10 }, { x: 1 }],
  );
  // Buzunarul: pasul lateral 40 % din Ø6 = 2,4; fără urechi și rampă; aceeași freză T1.
  const [buz] = operatiiPentruRol(d, p, 'buzunar')!;
  assert.deepEqual(
    [buz!.id, buz!.tip, buz!.latura, buz!.pasLateral, buz!.urechi, buz!.rampa, buz!.adancime, buz!.scula.numar, buz!['viitor']],
    ['de', 'buzunar', 'interior', 2.4, null, null, 12, 1, { x: 1 }],
  );
  // Pe linie: fără urechi.
  assert.equal(operatiiPentruRol(d, p, 'pe-linie')![0]!.urechi, null);
  // Un rol care nu se potrivește formei: nimic.
  assert.equal(operatiiPentruRol(d, p, 'stanga'), null);
  assert.equal(operatiiPentruRol(d, p, 'gaurire'), null);
  // Fiecare operație dată trece de schema documentului.
  for (const r of roluriOferite(p)) for (const o of operatiiPentruRol(d, p, r)!) assert.ok(operatieInMargini(o), r);
});

test('buzunarul își păstrează pasul lateral dacă încape în freză; găurirea, doar pe cercuri', () => {
  const p0 = simpla('d', DR(30, 20));
  const buzunar: Piesa = { ...p0, operatii: [{ ...p0.operatii[0]!, tip: 'buzunar', latura: 'interior', pasLateral: 2 }] };
  // Din buzunar în buzunar nu e o schimbare, dar operațiile rolului își păstrează pasul lateral.
  assert.equal(operatiiPentruRol(doc(buzunar), buzunar, 'buzunar')![0]!.pasLateral, 2);
  const c = simpla('c', CERC(3));
  const [g] = operatiiPentruRol(doc(c), c, 'gaurire')!;
  assert.deepEqual([g!.tip, g!.latura, g!.pasLateral, g!.scula.numar], ['gaurire', 'interior', undefined, 1]);
});

test('V-carve-ul nu cere mai mult decât conul frezei: adâncimea, cel mult cât el (rotunjită în jos la 0,001 mm), iar lucrarea îl primește', () => {
  // Cercul nou e o gaură de 8 mm; V60 Ø6 are conul 3·cot(30°) = 5,196 152… mm.
  const c = simpla('c', CERC(15));
  const d = doc(c);
  const [v] = operatiiPentruRol(d, c, 'vcarve')!;
  assert.deepEqual([v!.scula.forma, v!.adancime, v!.pas], [{ tip: 'v', unghi: 60 }, 5.196, 4]);
  const r = programDinDocument({ ...d, piese: [{ ...c, operatii: [v!] }] });
  assert.ok(r.ok, r.ok ? '' : r.motiv);
  // Sub con, adâncimea rămâne; cu vârful plat (V90 Ø6, vârful 0,5), conul e (6 − 0,5) / 2 · cot(45°) = 2,75 mm.
  const mica: Piesa = { ...c, operatii: [{ ...c.operatii[0]!, adancime: 3 }] };
  assert.equal(operatiiPentruRol(doc(mica), mica, 'vcarve')![0]!.adancime, 3);
  const cuVarf: Piesa = { ...c, operatii: [{ ...c.operatii[0]!, scula: { numar: 3, nume: 'V90', diametru: 6, forma: { tip: 'v', unghi: 90, varf: 0.5 } } }] };
  assert.equal(operatiiPentruRol(doc(cuVarf), cuVarf, 'vcarve')![0]!.adancime, 2.75);
});

test('pe o literă cu gol: exteriorul taie conturul pe afară și golul pe dinăuntru; V-carve-ul și buzunarul, o singură operație', () => {
  const L = litera();
  const d = doc(L);
  assert.deepEqual(forma(operatiiPentruRol(d, L, 'exterior')), [['exterior', 'profil', 'exterior', ['o']], ['interior', 'profil', 'interior', ['h']]]);
  assert.deepEqual(forma(operatiiPentruRol(d, L, 'interior')), [['interior', 'profil', 'interior', ['o']], ['exterior', 'profil', 'exterior', ['h']]]);
  assert.deepEqual(forma(operatiiPentruRol(d, L, 'pe-linie')), [['linie', 'profil', 'pe-linie', ['o', 'h']]]);
  const vc = operatiiPentruRol(d, L, 'vcarve')!;
  assert.deepEqual(forma(vc), [['vcarve', 'vcarve', 'interior', ['o', 'h']]]);
  // Freza plată T1 nu taie un V-carve: V60 cu același diametru, cu numărul liber T2.
  assert.deepEqual(vc[0]!.scula, { numar: 2, nume: 'freza V60', diametru: 6, forma: { tip: 'v', unghi: 60 } });
  assert.deepEqual(forma(operatiiPentruRol(d, L, 'buzunar')), [['buzunar', 'buzunar', 'interior', ['o', 'h']]]);
  // Fiecare rol e recunoscut înapoi din operațiile lui.
  for (const r of roluriOferite(L)) assert.equal(rolPiesei({ ...L, operatii: operatiiPentruRol(d, L, r)! }), r);
});

test('freza potrivită rolului: V60 la V-carve, plată la un rol fără V; numărul e al unei freze identice sau cel mai mic liber', () => {
  const d = doc(simpla('a', DR(10, 10)));
  const plata = d.piese[0]!.operatii[0]!.scula;
  assert.equal(frezaPentruRol(d, plata, 'exterior'), plata);
  assert.deepEqual(frezaPentruRol(d, plata, 'vcarve'), { numar: 2, nume: 'freza V60', diametru: 6, forma: { tip: 'v', unghi: 60 } });
  const v = { numar: 7, nume: 'freza V90', diametru: 6, forma: { tip: 'v' as const, unghi: 90 } };
  assert.equal(frezaPentruRol(d, v, 'pe-linie'), v);
  assert.equal(frezaPentruRol(d, v, 'vcarve'), v);
  // Înapoi la o freză plată Ø6: T1 din proiect e identică.
  assert.deepEqual(frezaPentruRol(d, v, 'buzunar'), { numar: 1, nume: 'freza plata', diametru: 6 });
  // Frezele fundului plat și cele de rest își țin numerele: Ø8 plată primește T4.
  const p0 = simpla('b', DR(20, 20));
  const cuRest: Piesa = {
    ...p0, operatii: [{
      ...p0.operatii[0]!, tip: 'buzunar', latura: 'interior', pasLateral: 2,
      rest: [{ scula: { numar: 2, nume: 'r', diametru: 3 }, pasLateral: 1 }],
    }],
  };
  const vcFund: Piesa = {
    ...simpla('c', DR(20, 20)), operatii: [{
      ...p0.operatii[0]!, id: 'ce', noduri: ['ce'], tip: 'vcarve', latura: 'interior', scula: v,
      fundPlat: { scula: { numar: 3, nume: 'f', diametru: 3.175 }, pasLateral: 1 },
    }],
  };
  const d2 = doc(simpla('a', DR(10, 10)), cuRest, vcFund);
  assert.equal(numarFreza(d2, 8, undefined), 4);
  assert.equal(numarFreza(d2, 3, undefined), 2);
  assert.equal(numarFreza(d2, 6, { tip: 'v', unghi: 90 }), 7);
});

test('peste plafonul nodurilor pe operație, operațiile se împart ca la import: `linie`, `linie-2`', () => {
  const n = PLAFON.noduriOperatie + 1;
  const forme = Array.from({ length: n }, (_, k) => el(`l${k}`, LINIE([0, k], [5, k])));
  const ids = forme.map((f) => f.id);
  const baza = { ...operatieImplicita('deschise', LINIE([0, 0], [5, 0])), latura: 'pe-linie' as const, adancime: 1, pas: 1 };
  const p = grup('mult', forme, [{ ...baza, noduri: ids.slice(0, PLAFON.noduriOperatie) }, { ...baza, id: 'deschise-2', noduri: ids.slice(PLAFON.noduriOperatie) }]);
  // Așa le împarte importul, deci rolul lor e „pe linie”.
  assert.equal(rolPiesei(p), 'pe-linie');
  const ops = operatiiPentruRol(doc(p), p, 'pe-linie')!;
  assert.deepEqual(ops.map((o) => [o.id, o.noduri.length]), [['linie', PLAFON.noduriOperatie], ['linie-2', 1]]);
});
