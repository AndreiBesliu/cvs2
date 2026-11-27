/**
 * Alegerea unei freze din bibliotecă pentru operațiile din proiect (ADR 0300 §4, felia 16.A↑b-2), pe hârtie: ce formă
 * primește fiecare operație (freza în V doar pe linie și în V-carve, V-carve-ul doar cu V), ce freze se oferă pentru
 * operațiile alese, copia din document (originea, valorile de lucru, tăișul), pașii operațiilor și numărul T (al bibliotecii
 * cât e liber; altfel al unei freze identice, cu aceeași turație; altfel cel mai mic liber).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  operatieImplicita, VERSIUNE_SCHEMA, type Document, type ElementNod, type FormaDoc, type Operatie, type Piesa, type Scula,
} from '../../src/model/document.ts';
import { motivFormaPeOperatie } from '../../src/model/formaFrezei.ts';
import {
  frezaBibliotecii, frezePotrivite, numarPentruAlegere, operatiiCuFreza, sculaDinBiblioteca,
} from '../../src/model/alegereFreza.ts';
import { numarFreza, numereFreze } from '../../src/model/rol.ts';
import type { FrezaSalvata } from '../../src/model/freza.ts';
import { operatieInMargini } from '../../src/model/schemaDocument.ts';

const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const el = (id: string, forma: FormaDoc, x = 0, y = 0): ElementNod => ({ tip: 'element', id, matrice: { ...I, e: x, f: y }, forma });
const DR = (latime: number, inaltime: number): FormaDoc => ({ tip: 'dreptunghi', latime, inaltime, razaColt: 0 });
const simpla = (id: string, forma: FormaDoc = DR(30, 20)): Piesa => ({ id, radacina: el(`${id}e`, forma), operatii: [operatieImplicita(`${id}e`, forma)] });
const cuOperatii = (p: Piesa, f: (o: Operatie) => Operatie): Piesa => ({ ...p, operatii: p.operatii.map(f) });
const doc = (...piese: Piesa[]): Document => ({
  schema: VERSIUNE_SCHEMA, rev: 0, piese,
  foi: [{ id: 'f1', stoc: { latime: 300, inaltime: 200, grosime: 18 }, instante: piese.map((p, k) => ({ id: `i${k}`, piesa: p.id, x: 0, y: 0, rotire: 0 })) }],
});

const LUCRU = { turatie: 18000, avans: 1000, plonjare: 300, pasLateral: 40 };
const PLATA6: FrezaSalvata = { id: 'p6', rev: 3, schimbatLa: 1, nume: 'Plată Ø6', fel: 'plata', diametru: 6, tais: 22, taisuri: 2, numar: 2, pas: 3, ...LUCRU };
const PLATA3: FrezaSalvata = { id: 'p3', rev: 1, schimbatLa: 1, nume: 'Plată Ø3,175', fel: 'plata', diametru: 3.175, numar: 1, pas: 1.5, ...LUCRU, pasLateral: 50 };
const V60: FrezaSalvata = { id: 'v60', rev: 1, schimbatLa: 1, nume: 'V60 Ø12', fel: 'v', diametru: 12, unghi: 60, tais: 12, numar: 3, pas: 2, ...LUCRU };
const GRAVARE: FrezaSalvata = { id: 'g30', rev: 2, schimbatLa: 1, nume: 'Gravare 30°', fel: 'gravare', diametru: 3.175, unghi: 30, varf: 0.2, numar: 5, pas: 0.5, ...LUCRU };
const BIBLIOTECA = [PLATA6, PLATA3, V60, GRAVARE];

test('forma pe operație: freza în V doar pe linie și în V-carve; V-carve-ul doar cu freza în V (ADR 0092 §3, ADR 0090)', () => {
  const v = { tip: 'v' as const, unghi: 60 };
  assert.equal(motivFormaPeOperatie('profil', 'exterior', undefined), null);
  assert.equal(motivFormaPeOperatie('profil', 'pe-linie', undefined), null);
  assert.equal(motivFormaPeOperatie('buzunar', 'interior', undefined), null);
  assert.equal(motivFormaPeOperatie('gaurire', 'interior', undefined), null);
  assert.equal(motivFormaPeOperatie('vcarve', 'interior', undefined), 'vcarve');
  assert.equal(motivFormaPeOperatie('profil', 'pe-linie', v), null);
  assert.equal(motivFormaPeOperatie('vcarve', 'interior', v), null);
  assert.equal(motivFormaPeOperatie('vcarve', 'interior', { ...v, varf: 0.2 }), null);
  for (const latura of ['exterior', 'interior', 'stanga', 'dreapta'] as const) assert.equal(motivFormaPeOperatie('profil', latura, v), 'v-pe-linie', latura);
  assert.equal(motivFormaPeOperatie('buzunar', 'interior', v), 'v-pe-linie');
  assert.equal(motivFormaPeOperatie('gaurire', 'interior', v), 'v-pe-linie');
});

test('frezele oferite: doar cele care se potrivesc tuturor operațiilor alese, în ordinea bibliotecii', () => {
  const op = (tip: Operatie['tip'], latura: Operatie['latura']) => ({ tip, latura });
  assert.deepEqual(frezePotrivite(BIBLIOTECA, [op('profil', 'exterior')]).map((f) => f.id), ['p6', 'p3']);
  assert.deepEqual(frezePotrivite(BIBLIOTECA, [op('profil', 'pe-linie')]).map((f) => f.id), ['p6', 'p3', 'v60', 'g30']);
  assert.deepEqual(frezePotrivite(BIBLIOTECA, [op('vcarve', 'interior')]).map((f) => f.id), ['v60', 'g30']);
  assert.deepEqual(frezePotrivite(BIBLIOTECA, [op('buzunar', 'interior'), op('gaurire', 'interior')]).map((f) => f.id), ['p6', 'p3']);
  // Un profil pe exterior și un V-carve: nicio freză nu merge la amândouă.
  assert.deepEqual(frezePotrivite(BIBLIOTECA, [op('profil', 'exterior'), op('vcarve', 'interior')]), []);
  assert.deepEqual(frezePotrivite(BIBLIOTECA, []), []);
  // Felurile fără CAM încă (conica, burghiul) nu se oferă nicăieri; bila și toroidala (ADR 0303, felia 16.A↑e-4), doar pe linie
  // (canelura), unde lucrarea le primește.
  const rotunde = [{ ...BIBLIOTECA[0]!, id: 'b6', fel: 'bila' as const }, { ...BIBLIOTECA[0]!, id: 't6', fel: 'toroidala' as const, raza: 1 }];
  const fara = [{ ...BIBLIOTECA[0]!, id: 'c6', fel: 'conica' as const, unghi: 15, raza: 0.5 }, { ...BIBLIOTECA[0]!, id: 'u6', fel: 'burghiu' as const, unghi: 118 }];
  for (const o2 of [op('profil', 'exterior'), op('vcarve', 'interior'), op('buzunar', 'interior'), op('gaurire', 'interior')]) {
    assert.deepEqual(frezePotrivite([...fara, ...rotunde, ...BIBLIOTECA], [o2]), frezePotrivite(BIBLIOTECA, [o2]));
  }
  assert.deepEqual(frezePotrivite([...fara, ...rotunde, ...BIBLIOTECA], [op('profil', 'pe-linie')]).map((f) => f.id), ['b6', 't6', 'p6', 'p3', 'v60', 'g30']);
});

test('copia din bibliotecă: numărul dat, numele, diametrul, forma, originea (id, rev), valorile de lucru și tăișul', () => {
  assert.deepEqual(sculaDinBiblioteca(PLATA6, 4), {
    numar: 4, nume: 'Plată Ø6', diametru: 6, biblioteca: { id: 'p6', rev: 3 }, regim: { turatie: 18000, avans: 1000, plonjare: 300 }, tais: 22,
  });
  assert.deepEqual(sculaDinBiblioteca(GRAVARE, 5), {
    numar: 5, nume: 'Gravare 30°', diametru: 3.175, forma: { tip: 'v', unghi: 30, varf: 0.2 }, biblioteca: { id: 'g30', rev: 2 },
    regim: { turatie: 18000, avans: 1000, plonjare: 300 },
  });
  // Fără tăiș în bibliotecă, fără tăiș în copie (nimic de refuzat).
  assert.equal(Object.hasOwn(sculaDinBiblioteca(PLATA3, 1), 'tais'), false);
  // Copia trece de schema operației, pe locul ei.
  for (const f of BIBLIOTECA) {
    const forma = DR(30, 20);
    const baza = operatieImplicita('e', forma);
    const o: Operatie = f.fel === 'plata' ? baza : { ...baza, latura: 'pe-linie' };
    assert.ok(operatieInMargini({ ...o, scula: sculaDinBiblioteca(f, f.numar) }), f.nume);
  }
});

test('freza din bibliotecă a operațiilor: id-ul comun al originii; altfel nimic', () => {
  const din = (id: string | null): Operatie => ({ ...operatieImplicita('e', DR(1, 1)), scula: { numar: 1, nume: 'x', diametru: 6, ...(id ? { biblioteca: { id, rev: 1 } } : {}) } });
  assert.equal(frezaBibliotecii([din('p6'), din('p6')]), 'p6');
  assert.equal(frezaBibliotecii([din('p6'), din('p3')]), null);
  assert.equal(frezaBibliotecii([din('p6'), din(null)]), null);
  assert.equal(frezaBibliotecii([din(null)]), null);
  assert.equal(frezaBibliotecii([]), null);
});

test('operațiile cu freza aleasă: freza pe toate, pasul pe trecere al frezei, adâncimea și restul neschimbate', () => {
  const d = doc(simpla('a'), simpla('b'));
  const noi = operatiiCuFreza(d, ['a'], PLATA6);
  assert.ok(noi);
  assert.deepEqual([...noi.keys()], ['a']);
  const [o] = noi.get('a')!;
  const vechi = d.piese[0]!.operatii[0]!;
  // T2 e liber: freza din proiect a piesei alese (T1, Ø6) pleacă, iar b are tot T1 Ø6, fără valori (altă turație).
  assert.deepEqual(o!.scula, sculaDinBiblioteca(PLATA6, 2));
  assert.equal(o!.pas, 3);
  assert.equal(o!.adancime, vechi.adancime);
  assert.deepEqual({ ...o!, scula: vechi.scula, pas: vechi.pas }, vechi);
  assert.ok(operatieInMargini(o!));
  // O freză care nu se potrivește uneia dintre operații: nimic (V-ul pe un profil pe exterior).
  assert.equal(operatiiCuFreza(d, ['a'], V60), null);
  // O piesă necunoscută sau nicio piesă: nimic.
  assert.equal(operatiiCuFreza(d, ['x'], PLATA6), null);
  assert.equal(operatiiCuFreza(d, [], PLATA6), null);
});

test('buzunarul: pasul lateral din procentul frezei, în jos la 0,001 mm, deci cel mult raza', () => {
  const buz = cuOperatii(simpla('a'), (o) => ({ ...o, tip: 'buzunar', latura: 'interior', pasLateral: 1 }));
  const d = doc(buz);
  assert.equal(operatiiCuFreza(d, ['a'], PLATA6)!.get('a')![0]!.pasLateral, 2.4);
  // 50 % din 3,175 = 1,5875: în jos, 1,587 (în sus ar trece de rază).
  const p = operatiiCuFreza(d, ['a'], PLATA3)!.get('a')![0]!.pasLateral!;
  assert.equal(p, 1.587);
  assert.ok(p <= 3.175 / 2);
  // Pe un profil nu apare pasul lateral.
  assert.equal(Object.hasOwn(operatiiCuFreza(doc(simpla('b')), ['b'], PLATA6)!.get('b')![0]!, 'pasLateral'), false);
});

test('V-carve-ul cu fundul plat și incrustația: se schimbă doar freza în V și pasul; fundul plat rămâne', () => {
  const fundPlat = { scula: { numar: 7, nume: 'f', diametru: 3 }, pasLateral: 1 };
  const vc = cuOperatii(simpla('a'), (o) => ({ ...o, tip: 'vcarve', latura: 'interior', scula: { numar: 3, nume: 'v', diametru: 6, forma: { tip: 'v', unghi: 90 } }, fundPlat }));
  const [o] = operatiiCuFreza(doc(vc), ['a'], V60)!.get('a')!;
  assert.deepEqual(o!.fundPlat, fundPlat);
  assert.deepEqual(o!.scula.forma, { tip: 'v', unghi: 60 });
  assert.equal(o!.scula.numar, 3);
  assert.equal(o!.pas, 2);
});

test('numărul T: al bibliotecii cât e liber; altfel al unei freze identice (cu aceeași turație); altfel cel mai mic liber', () => {
  const t2Alta: Scula = { numar: 2, nume: 'alta', diametru: 3 };
  const cuScula = (id: string, s: Scula): Piesa => cuOperatii(simpla(id), (o) => ({ ...o, scula: s }));
  // T2 e al unei alte freze (Ø3): nicio freză identică, deci cel mai mic liber; T1 al piesei alese nu se numără (pleacă).
  assert.equal(numarPentruAlegere(doc(simpla('a'), cuScula('b', t2Alta)), ['a'], sculaDinBiblioteca(PLATA6, 2)), 1);
  // O freză identică (Ø6 plată, aceeași turație) e T7: o ia pe ea.
  const t7 = { ...sculaDinBiblioteca(PLATA6, 7), nume: 'oricare' };
  assert.equal(numarPentruAlegere(doc(simpla('a'), cuScula('b', t2Alta), cuScula('c', t7)), ['a'], sculaDinBiblioteca(PLATA6, 2)), 7);
  // Ø6 plată fără valori (turația lucrării) nu e identică: alt T, nu un conflict de turații la export.
  const t7FaraValori: Scula = { numar: 7, nume: 'p', diametru: 6 };
  assert.equal(numarPentruAlegere(doc(simpla('a'), cuScula('b', t2Alta), cuScula('c', t7FaraValori)), ['a'], sculaDinBiblioteca(PLATA6, 2)), 1);
  // Freza de rest a piesei alese rămâne în proiect, deci se numără: T2 e al ei (Ø3), T1 e liber.
  const buzRest = cuOperatii(simpla('a'), (o) => ({ ...o, tip: 'buzunar', latura: 'interior', pasLateral: 2, rest: [{ scula: t2Alta, pasLateral: 1 }] }));
  assert.equal(numarPentruAlegere(doc(buzRest), ['a'], sculaDinBiblioteca(PLATA6, 2)), 1);
  // Același număr cu aceeași freză în altă piesă: rămâne.
  assert.equal(numarPentruAlegere(doc(simpla('a'), cuScula('b', sculaDinBiblioteca(PLATA6, 2))), ['a'], sculaDinBiblioteca(PLATA6, 2)), 2);
  // Aceeași freză e și T5, și T2 (pusă de mână de două ori): numărul bibliotecii (T2) rămâne, nu primul găsit (T5).
  const dubla = doc(simpla('a'), cuScula('b', sculaDinBiblioteca(PLATA6, 5)), cuScula('c', sculaDinBiblioteca(PLATA6, 2)));
  assert.equal(numarPentruAlegere(dubla, ['a'], sculaDinBiblioteca(PLATA6, 2)), 2);
  // Prin alegere: toate operațiile pieselor alese primesc același număr.
  const d = doc(simpla('a'), cuOperatii(simpla('b'), (o) => o), cuScula('c', t2Alta));
  const noi = operatiiCuFreza(d, ['a', 'b'], PLATA6)!;
  assert.deepEqual([...noi.values()].flat().map((o) => o.scula.numar), [1, 1]);
});

test('rolurile (ADR 0114 §5) și freza potrivită rolului țin seama de turație: o freză cu altă turație e altă freză', () => {
  const cuValori: Scula = { numar: 1, nume: 'p', diametru: 6, regim: { turatie: 20000, avans: 900, plonjare: 200 } };
  // T1 Ø6 cu valori: freza plată Ø6 a rolului (fără valori) nu e identică, deci primește cel mai mic liber.
  const d = doc(cuOperatii(simpla('a'), (o) => ({ ...o, scula: cuValori })));
  assert.equal(numarFreza(d, 6, undefined), 2);
  // Un rol personalizat cu T1 Ø6 fără valori, într-un proiect unde T1 are valori: alt număr.
  assert.deepEqual(numereFreze(d, [{ numar: 1, nume: 'r', diametru: 6 }], new Set()), [2]);
  // Cu aceleași valori, aceeași freză: numărul ei.
  assert.deepEqual(numereFreze(d, [{ ...cuValori, nume: 'r' }], new Set()), [1]);
});
