/**
 * Freza din biblioteca „Frezele mele” pe rândurile ferestrei exportului (ADR 0300 §4, felia 16.A↑b-3a), pe hârtie:
 *
 * - **scrierea originii** (`operatieDinDialog`): un rând cu originea frezei scrie numele, originea (id, versiunea), valorile de
 *   lucru și tăișul ei lângă T, Ø și formă; fără originea rândului (`null`), ele pleacă din document, cu numele după formă; fără
 *   câmpul `origine` (un apelant vechi), rămân cum erau; un Exportă fără nicio schimbare scrie aceeași operație, la octet;
 * - **numărul T al rândului** (`numarPentruRand`, regula rolurilor, ADR 0114 §5): al frezei din bibliotecă cât nicio altă
 *   freză a ferestrei nu-l are; altfel al unei freze identice (aceeași formă, același diametru, aceeași turație cunoscută);
 *   altfel cel mai mic liber.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { operatieDinDialog } from '../../src/app/valoriOperatii.ts';
import type { Operatie } from '../../src/model/document.ts';
import { numarPentruRand, type FrezaRand, type OrigineFreza, type SculaOperatie } from '../../src/ui/exportRand.ts';

const OP: Operatie = {
  id: 'e1', noduri: ['e1'], latura: 'exterior', sens: 'urcare', adancime: 6, pas: 3, urechi: null, rampa: null, intrari: null, colturi: null,
  scula: { numar: 1, nume: 'freza plata', diametru: 6 },
} as Operatie;
const ORIGINE: OrigineFreza = { nume: 'Plată Ø12', biblioteca: { id: 'p12', rev: 3 }, regim: { turatie: 16000, avans: 2000, plonjare: 600 }, tais: 30 };
const cu = (s: SculaOperatie): Operatie => operatieDinDialog(OP, undefined, s);

test('scrierea originii: rândul cu freza din bibliotecă scrie numele, originea, valorile de lucru și tăișul', () => {
  const o = cu({ numar: 6, diametru: 12, origine: ORIGINE });
  assert.deepEqual(o.scula, {
    numar: 6, nume: 'Plată Ø12', diametru: 12, biblioteca: { id: 'p12', rev: 3 }, regim: { turatie: 16000, avans: 2000, plonjare: 600 }, tais: 30,
  });
  // O freză din bibliotecă fără tăiș: câmpul nu se scrie.
  const { tais: _t, ...faraTais } = ORIGINE;
  void _t;
  assert.ok(!('tais' in cu({ numar: 6, diametru: 12, origine: faraTais }).scula));
  // În V: forma și originea.
  const v = cu({ numar: 4, diametru: 12, forma: { tip: 'v', unghi: 90 }, origine: { ...ORIGINE, nume: 'V90 Ø12', biblioteca: { id: 'v90', rev: 1 } } });
  assert.deepEqual([v.scula.nume, v.scula.forma, v.scula.biblioteca], ['V90 Ø12', { tip: 'v', unghi: 90 }, { id: 'v90', rev: 1 }]);
});

test('scrierea originii: fără ea pe rând, originea pleacă din document; fără câmpul `origine`, rămâne', () => {
  const din: Operatie = { ...OP, scula: { numar: 6, nume: 'Plată Ø12', diametru: 12, biblioteca: { id: 'p12', rev: 3 }, regim: ORIGINE.regim!, tais: 30 } } as Operatie;
  // Diametrul schimbat de mână: originea, valorile de lucru și tăișul pleacă, iar numele e cel al formei.
  const scrisa = operatieDinDialog(din, undefined, { numar: 6, diametru: 10, origine: null });
  assert.deepEqual(scrisa.scula, { numar: 6, nume: 'freza plata', diametru: 10 });
  // Un apelant fără câmpul `origine` (o operație fără rând în fereastră): scula rămâne a documentului.
  assert.deepEqual(operatieDinDialog(din, undefined, { numar: 6, diametru: 12 }).scula, din.scula);
  // Un Exportă fără nicio schimbare, cu originea citită din document: aceeași scula, cu cheile în aceeași ordine.
  const aceeasi = operatieDinDialog(din, undefined, { numar: 6, diametru: 12, origine: { nume: 'Plată Ø12', biblioteca: { id: 'p12', rev: 3 }, regim: ORIGINE.regim!, tais: 30 } });
  assert.equal(JSON.stringify(aceeasi.scula), JSON.stringify(din.scula));
});

test('numărul T al rândului: al bibliotecii cât e liber, altfel al unei freze identice, altfel cel mai mic liber', () => {
  const p12: FrezaRand = { numar: 6, diametru: 12, turatie: 16000 };
  // Nicio altă freză: T6, al bibliotecii.
  assert.equal(numarPentruRand([], p12), 6);
  // T6 e al unei freze identice (aceeași formă, același Ø, aceeași turație): tot T6.
  assert.equal(numarPentruRand([{ numar: 6, diametru: 12, turatie: 16000 }], p12), 6);
  // T6 e al unei freze identice scrise de mână (turația necunoscută): tot T6.
  assert.equal(numarPentruRand([{ numar: 6, diametru: 12 }], p12), 6);
  // T6 e al altei freze, iar o freză identică are T3: T3.
  assert.equal(numarPentruRand([{ numar: 6, diametru: 8 }, { numar: 3, diametru: 12, turatie: 16000 }], p12), 3);
  // T6 e al altei freze, nicio identică: cel mai mic liber (1 și 2 ocupate).
  assert.equal(numarPentruRand([{ numar: 6, diametru: 8 }, { numar: 1, diametru: 3 }, { numar: 2, diametru: 4 }], p12), 3);
  // Aceeași formă și Ø, dar altă turație: nu e identică.
  assert.equal(numarPentruRand([{ numar: 6, diametru: 12, turatie: 18000 }], p12), 1);
  // Forma contează: un V90 Ø12 nu e plata Ø12.
  assert.equal(numarPentruRand([{ numar: 6, diametru: 12, forma: { tip: 'v', unghi: 90 } }], p12), 1);
  const v: FrezaRand = { numar: 4, diametru: 12, forma: { tip: 'v', unghi: 90 } };
  assert.equal(numarPentruRand([{ numar: 4, diametru: 12, forma: { tip: 'v', unghi: 90 } }], v), 4);
  assert.equal(numarPentruRand([{ numar: 4, diametru: 12, forma: { tip: 'v', unghi: 60 } }], v), 1);
});
