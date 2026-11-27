/**
 * Freza din „Frezele mele” pe rândurile reliefului din fereastra exportului (felia 18.1↑d-5, ADR 0316), pe hârtie: aleasă, freza
 * își aduce T-ul (regula rolurilor, printre toate frezele ferestrei, cu cele ale reliefului), diametrul, forma (bila, V-ul cu
 * vârful, plata; la degroșare doar plata), pasul pe trecere, pasul lateral și originea; Exportă scrie originea (numele, id-ul și
 * versiunea, valorile de lucru, tăișul), iar fără nicio schimbare aceeași operație, la octet; „Scrisă de mână” scoate originea.
 * Nota bibliotecii vede rândul reliefului (schimbată, ștearsă, recunoscută), „Ia valorile noi” păstrează T-ul și pașii, „Pune-o
 * înapoi în bibliotecă” pleacă din copia rândului. În Tăierea, freza aleasă aduce pasul lateral și pe operațiile reliefului.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  operatieImplicita, VERSIUNE_SCHEMA, type Document, type ElementNod, type FormaDoc, type Operatie, type Piesa,
} from '../../src/model/document.ts';
import { operatiiCuFreza } from '../../src/model/alegereFreza.ts';
import type { FrezaSalvata } from '../../src/model/freza.ts';
import { operatieReliefDinDialog } from '../../src/app/valoriOperatii.ts';
import {
  copieRelief, cuFrezaAleasaRelief, cuFrezaPusaInapoiRelief, cuValorileNoiRelief, frezeRanduriRelief, locFrezaRelief, randRelief,
  reliefCuAceeasiFreza, valoriRelief, type RandRelief,
} from '../../src/ui/exportRelief.ts';
import { numarPentruRand, stareOrigine, type FrezaOferita, type OrigineFreza } from '../../src/ui/exportRand.ts';
import type { FinisareExport } from '../../src/ui/FisaFinisare.tsx';

const ro = (x: number): string => String(x).replace('.', ',');

const fin: FinisareExport = {
  cheie: 'p/f', fel: 'finisare', descriere: 'Relief', perechi: ['p/d'],
  scula: { numar: 2, diametru: 6, forma: 'bila' }, pasLateral: 0.6, celula: 0.25, unghi: 0, aliniat: true, margine: 'perete', adancime: 18, pas: 3,
};
const deg: FinisareExport = {
  cheie: 'p/d', fel: 'degrosare', adaos: 0.5, descriere: 'Relief', perechi: ['p/f'],
  scula: { numar: 1, diametru: 6, forma: 'plata' }, pasLateral: 2.5, unghi: 0, aliniat: true, margine: 'perete', adancime: 18, pas: 3,
};

const REGIM = { turatie: 16000, avans: 1200, plonjare: 400 };
const origine = (id: string, nume: string, rev = 1, extra: Partial<OrigineFreza> = {}): OrigineFreza => ({ nume, biblioteca: { id, rev }, regim: REGIM, tais: 22, ...extra });
const BILA8: FrezaOferita = {
  id: 'b8', nume: 'Bilă Ø8', pas: 4, pasLateral: 0.8,
  scula: { numar: 7, diametru: 8, forma: { tip: 'bila' }, origine: origine('b8', 'Bilă Ø8') },
};
const V30: FrezaOferita = {
  id: 'g30', nume: 'Gravare 30°', pas: 0.5, pasLateral: 0.3,
  scula: { numar: 5, diametru: 3.175, forma: { tip: 'v', unghi: 30, varf: 0.2 }, origine: origine('g30', 'Gravare 30°', 2) },
};
const PLATA8: FrezaOferita = {
  id: 'p8', nume: 'Plată Ø8', pas: 4, pasLateral: 3.2,
  scula: { numar: 3, diametru: 8, origine: origine('p8', 'Plată Ø8', 4, { regim: { turatie: 18000, avans: 1500, plonjare: 500 }, tais: 30 }) },
};

test('aleasă pe finisare: T-ul dat, diametrul, forma (bila, V-ul cu vârful), pasul pe trecere, pasul lateral și originea', () => {
  const r = randRelief(fin, ro);
  assert.equal(r.origineScula, null);
  assert.deepEqual(cuFrezaAleasaRelief(r, BILA8, 4, ro), {
    numarScula: '4', diametruScula: '8', formaScula: 'bila', pas: '4', pasLateral: '0,8', origineScula: BILA8.scula.origine,
  });
  assert.deepEqual(cuFrezaAleasaRelief(r, V30, 5, ro), {
    numarScula: '5', diametruScula: '3,175', formaScula: 'v', unghiV: '30', varfV: '0,2', pas: '0,5', pasLateral: '0,3', origineScula: V30.scula.origine,
  });
  assert.deepEqual(cuFrezaAleasaRelief(r, PLATA8, 3, ro), {
    numarScula: '3', diametruScula: '8', formaScula: 'plata', pas: '4', pasLateral: '3,2', origineScula: PLATA8.scula.origine,
  });
  // Degroșarea rămâne cu freza plată (ADR 0313 §1): forma unei freze rotunde nu se scrie pe ea (lista nu i-o oferă oricum).
  const d = randRelief(deg, ro);
  assert.equal(cuFrezaAleasaRelief(d, PLATA8, 3, ro).formaScula, 'plata');
  assert.equal(cuFrezaAleasaRelief(d, BILA8, 3, ro).formaScula, 'plata');
  // Toroidala nu se taie încă pe relief (ADR 0303 §4, răspunsul 4a: felia liniei reliefului): nu se scrie nimic.
  const tor: FrezaOferita = { ...BILA8, id: 't', scula: { ...BILA8.scula, forma: { tip: 'toroidala', raza: 1 } } };
  assert.deepEqual(cuFrezaAleasaRelief(r, tor, 4, ro), {});
  // Valorile citite poartă originea.
  assert.deepEqual(valoriRelief({ ...r, ...cuFrezaAleasaRelief(r, BILA8, 4, ro) })?.scula, { numar: 4, diametru: 8, forma: { tip: 'bila' }, origine: BILA8.scula.origine });
  assert.equal(valoriRelief(r)?.scula.origine, null);
});

test('T-ul: regula rolurilor printre toate frezele ferestrei, cu cele ale reliefului (fără rândul înlocuit)', () => {
  const r = randRelief(fin, ro), d = randRelief(deg, ro);
  const randuri: Record<string, RandRelief> = { 'p/f': r, 'p/d': d };
  assert.deepEqual(frezeRanduriRelief(randuri, 'p/f'), [{ numar: 1, diametru: 6 }]);
  assert.deepEqual(frezeRanduriRelief(randuri), [{ numar: 2, diametru: 6, forma: { tip: 'bila' } }, { numar: 1, diametru: 6 }]);
  // Turația frezei din bibliotecă face parte din identitate (ADR 0114 §5).
  const cuBila = { ...r, ...cuFrezaAleasaRelief(r, BILA8, 7, ro) };
  assert.deepEqual(frezeRanduriRelief({ x: cuBila }), [{ numar: 7, diametru: 8, forma: { tip: 'bila' }, turatie: 16000 }]);
  // Un rând de necitit nu se numără.
  assert.deepEqual(frezeRanduriRelief({ x: { ...r, numarScula: '' } }), []);
  // Numărul bibliotecii (7) e liber: rămâne; pe T1 (luat de degroșare, altă freză), cel mai mic liber.
  assert.equal(numarPentruRand(frezeRanduriRelief(randuri, 'p/f'), { numar: 7, diametru: 8, forma: { tip: 'bila' } }), 7);
  assert.equal(numarPentruRand(frezeRanduriRelief(randuri, 'p/f'), { numar: 1, diametru: 8, forma: { tip: 'bila' } }), 2);
  // Aceeași plată Ø6 ca degroșarea: T1, aceeași freză.
  assert.equal(numarPentruRand(frezeRanduriRelief(randuri, 'p/f'), { numar: 4, diametru: 6 }), 4);
  assert.equal(numarPentruRand([...frezeRanduriRelief(randuri, 'p/f'), { numar: 4, diametru: 3 }], { numar: 4, diametru: 6 }), 1);
});

test('nota bibliotecii pe rândul reliefului: schimbată, ștearsă, la zi, recunoscută; „Ia valorile noi” păstrează T-ul și pașii', () => {
  const r = randRelief(fin, ro);
  const ales = { ...r, ...cuFrezaAleasaRelief(r, BILA8, 7, ro), pas: '2', pasLateral: '0,5' };
  assert.deepEqual(locFrezaRelief(ales), { unde: 'scula', origine: BILA8.scula.origine, diametru: '8', forma: { tip: 'bila' } });
  assert.deepEqual(stareOrigine(locFrezaRelief(ales), [BILA8]), { fel: 'la-zi' });
  assert.deepEqual(stareOrigine(locFrezaRelief(ales), []), { fel: 'stearsa' });
  const nou: FrezaOferita = {
    ...BILA8, scula: { ...BILA8.scula, diametru: 10, origine: { ...BILA8.scula.origine, biblioteca: { id: 'b8', rev: 2 }, regim: { ...REGIM, avans: 1400 } } },
  };
  const st = stareOrigine(locFrezaRelief(ales), [nou]);
  assert.equal(st?.fel, 'schimbata');
  assert.deepEqual(st?.fel === 'schimbata' ? st.diferente.map((x) => x.camp) : [], ['diametru', 'avans']);
  assert.deepEqual(cuValorileNoiRelief(ales, nou, ro), { diametruScula: '10', formaScula: 'bila', origineScula: nou.scula.origine });
  // Pe V, unghiul și vârful vin cu ea.
  const v = { ...r, ...cuFrezaAleasaRelief(r, V30, 5, ro) };
  assert.deepEqual(locFrezaRelief(v).forma, { tip: 'v', unghi: 30, varf: 0.2 });
  // Scrisă de mână, la fel cu o freză din bibliotecă: recunoscută (doar arătată).
  const mana = { ...r, diametruScula: '8' };
  assert.deepEqual(stareOrigine(locFrezaRelief(mana), [PLATA8, BILA8]), { fel: 'recunoscuta', freza: BILA8 });
  // Degroșarea: forma e mereu plata, oricât ar scrie rândul.
  const d = randRelief(deg, ro);
  assert.equal(locFrezaRelief({ ...d, formaScula: 'bila' }).forma, undefined);
  // „Pe toate (N)”: rândurile reliefului cu aceeași freză din bibliotecă, diferite de ea.
  const randuri = { a: ales, b: { ...ales, numarScula: '8' }, c: r };
  assert.equal(reliefCuAceeasiFreza(randuri, [nou], 'b8'), 2);
  assert.equal(reliefCuAceeasiFreza(randuri, [BILA8], 'b8'), 0);
  assert.equal(reliefCuAceeasiFreza(randuri, null, 'b8'), 0);
});

test('„Pune-o înapoi în bibliotecă” din rândul reliefului: copia (T, Ø, forma, valorile, pașii), apoi rândurile cu aceeași copie', () => {
  const r = randRelief(fin, ro);
  const ales = { ...r, ...cuFrezaAleasaRelief(r, BILA8, 7, ro), pas: '2', pasLateral: '0,5' };
  assert.deepEqual(copieRelief(ales), {
    id: 'b8', rev: 1, nume: 'Bilă Ø8', numar: 7, diametru: 8, forma: { tip: 'bila' }, regim: REGIM, tais: 22, pas: 2, pasLateral: 0.5,
  });
  assert.equal(copieRelief(r), null);
  assert.equal(copieRelief({ ...ales, numarScula: 'x' }), null);
  const pusa: FrezaOferita = { ...BILA8, nume: 'Bilă Ø8 (2)', scula: { ...BILA8.scula, origine: { ...BILA8.scula.origine, nume: 'Bilă Ø8 (2)', biblioteca: { id: 'b8', rev: 2 } } } };
  // Rândul apăsat o ia; altul cu aceeași copie (diferă doar prin nume) la fel; unul cu alt diametru își păstrează copia.
  const altul = { ...ales, diametruScula: '9' };
  const dupa = cuFrezaPusaInapoiRelief({ a: ales, b: ales, c: altul, d: r }, 'a', pusa, ro);
  assert.equal(dupa['a']?.origineScula?.nume, 'Bilă Ø8 (2)');
  assert.equal(dupa['b']?.origineScula?.biblioteca.rev, 2);
  assert.equal(dupa['c']?.origineScula?.biblioteca.rev, 1);
  assert.equal(dupa['c']?.diametruScula, '9');
  assert.equal(dupa['d'], r);
  assert.equal(dupa['a']?.numarScula, '7');
});

/** Finisarea din document, cu o bilă scrisă de mână (fără origine). */
const opFin = (): Operatie => ({
  id: 'f', tip: 'finisare', latura: 'pe-linie', noduri: ['e'], adancime: 18, pas: 3, pasLateral: 0.6, finisare: { unghi: 0 },
  scula: { numar: 2, nume: 'freza bila', diametru: 6, forma: { tip: 'bila' } },
}) as Operatie;

test('Exportă scrie originea: numele, id-ul și versiunea, valorile de lucru, tăișul; fără schimbare, aceeași operație', () => {
  const o = opFin();
  const r = randRelief(fin, ro);
  const v = valoriRelief({ ...r, ...cuFrezaAleasaRelief(r, BILA8, 7, ro) })!;
  const scris = operatieReliefDinDialog(o, v);
  assert.deepEqual(scris.scula, {
    numar: 7, nume: 'Bilă Ø8', diametru: 8, forma: { tip: 'bila' }, biblioteca: { id: 'b8', rev: 1 }, regim: REGIM, tais: 22,
  });
  assert.equal(scris.pas, 4);
  assert.equal(scris.pasLateral, 0.8);
  // Aceeași freză din bibliotecă, deschisă din nou: același obiect.
  const inapoi: FinisareExport = { ...fin, scula: { numar: 7, diametru: 8, forma: 'bila', origine: BILA8.scula.origine }, pas: 4, pasLateral: 0.8 };
  assert.equal(operatieReliefDinDialog(scris, valoriRelief(randRelief(inapoi, ro))!), scris);
  // Pe aceeași bilă, aleasă din bibliotecă (același Ø și aceeași formă): doar originea și T-ul se scriu.
  const b6: FrezaOferita = { ...BILA8, id: 'b6', nume: 'Bilă Ø6', scula: { ...BILA8.scula, diametru: 6, origine: origine('b6', 'Bilă Ø6') } };
  const v6 = valoriRelief({ ...r, ...cuFrezaAleasaRelief(r, b6, 2, ro), pas: '3', pasLateral: '0,6' })!;
  assert.deepEqual(operatieReliefDinDialog(o, v6).scula, {
    numar: 2, nume: 'Bilă Ø6', diametru: 6, forma: { tip: 'bila' }, biblioteca: { id: 'b6', rev: 1 }, regim: REGIM, tais: 22,
  });
  // „Scrisă de mână” pe o freză din bibliotecă: originea, valorile și tăișul pleacă, numele urmează forma.
  const mana = valoriRelief({ ...randRelief(inapoi, ro), origineScula: null })!;
  assert.deepEqual(operatieReliefDinDialog(scris, mana).scula, { numar: 7, nume: 'freza bila', diametru: 8, forma: { tip: 'bila' } });
  // Un diametru schimbat de mână pe rând (origine null): freza nouă, fără origine.
  const alt = valoriRelief({ ...randRelief(inapoi, ro), diametruScula: '10', origineScula: null })!;
  assert.deepEqual(operatieReliefDinDialog(scris, alt).scula, { numar: 7, nume: 'freza bila', diametru: 10, forma: { tip: 'bila' } });
  // Fără câmpul originii (un apelant fără bibliotecă): ca înainte.
  const { origine: _o, ...faraOrigine } = v.scula;
  void _o;
  assert.equal(operatieReliefDinDialog(o, { ...valoriRelief(r)!, scula: { ...faraOrigine, numar: 2, diametru: 6 } }), o);
});

test('degroșarea: o plată din bibliotecă cu alt diametru, scrisă cu originea ei', () => {
  const o: Operatie = {
    id: 'd', tip: 'degrosare', latura: 'pe-linie', noduri: ['e'], adancime: 18, pas: 3, pasLateral: 2.5, degrosare: { adaos: 0.5, unghi: 0 },
    scula: { numar: 1, nume: 'freza plata', diametru: 6 },
  } as Operatie;
  const r = randRelief(deg, ro);
  const v = valoriRelief({ ...r, ...cuFrezaAleasaRelief(r, PLATA8, 3, ro) })!;
  const scris = operatieReliefDinDialog(o, v);
  assert.deepEqual(scris.scula, {
    numar: 3, nume: 'Plată Ø8', diametru: 8, biblioteca: { id: 'p8', rev: 4 }, regim: { turatie: 18000, avans: 1500, plonjare: 500 }, tais: 30,
  });
  assert.equal(scris.pasLateral, 3.2);
  assert.equal(scris.pas, 4);
  assert.deepEqual(scris.degrosare, { adaos: 0.5, unghi: 0 });
});

test('Tăierea: freza aleasă aduce pasul lateral și pe finisarea și degroșarea reliefului (mm, din procentul ei)', () => {
  const I = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  const forma: FormaDoc = { tip: 'dreptunghi', latime: 30, inaltime: 20, razaColt: 0 };
  const el: ElementNod = { tip: 'element', id: 're', matrice: I, forma };
  const baza = operatieImplicita('re', forma);
  const piesa: Piesa = {
    id: 'r', radacina: el, operatii: [
      { ...baza, id: 'd', tip: 'degrosare', latura: 'pe-linie', pasLateral: 2.5, degrosare: { adaos: 0.5, unghi: 0 }, scula: { numar: 1, nume: 'freza plata', diametru: 6 } },
      { ...baza, id: 'f', tip: 'finisare', latura: 'pe-linie', pasLateral: 0.6, finisare: { unghi: 0 }, scula: { numar: 2, nume: 'freza bila', diametru: 6, forma: { tip: 'bila' } } },
    ],
  };
  const d: Document = {
    schema: VERSIUNE_SCHEMA, rev: 0, piese: [piesa],
    foi: [{ id: 'f1', stoc: { latime: 300, inaltime: 200, grosime: 18 }, instante: [{ id: 'i0', piesa: 'r', x: 0, y: 0, rotire: 0 }] }],
  };
  const P8: FrezaSalvata = {
    id: 'p8', rev: 1, schimbatLa: 1, nume: 'Plată Ø8', fel: 'plata', diametru: 8, numar: 3, pas: 4, turatie: 18000, avans: 1500, plonjare: 500, pasLateral: 40,
  };
  const noi = operatiiCuFreza(d, ['r'], P8)!.get('r')!;
  assert.deepEqual(noi.map((o) => o.pasLateral), [3.2, 3.2]);
  assert.deepEqual(noi.map((o) => o.pas), [4, 4]);
});
