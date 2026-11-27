/**
 * Rândul unei operații în lista ferestrei exportului (constatarea 14 a auditului, partea listei; felia 28.8↑s): pe primul rând,
 * numele piesei când omul i-a dat unul (un import își ia numele din fișier, „logo-80mm”), altfel forma și mărimea, fără loc;
 * pe al doilea, mai mic, locul pe foaie. Numerele, ca în numele întreg al elementului (`descriere`): în română cu virgula
 * zecimală, în engleză cu punct. Valorile sunt scrise pe hârtie.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import './limbi.ts';
import { adaugaMesaje, schimbaLimba } from '../../src/i18n/t.ts';
import { roExport } from '../../src/i18n/export.ro.ts';
import { enExport } from '../../src/i18n/export.en.ts';
import { randLista } from '../../src/app/randListaExport.ts';
import { descriere } from '../../src/app/descriereElement.ts';
import type { Matrice } from '../../src/geom/matrice.ts';
import type { ElementLume } from '../../src/model/lume.ts';

adaugaMesaje({ ro: roExport, en: enExport });

type Element = Pick<ElementLume, 'forma' | 'matrice'>;
const mutat = (x: number, y: number): Matrice => ({ a: 1, b: 0, c: 0, d: 1, e: x, f: y });

const dreptunghi: Element = { forma: { tip: 'dreptunghi', latime: 100, inaltime: 60, razaColt: 0 }, matrice: mutat(20, 20) };
const cerc: Element = { forma: { tip: 'cerc', raza: 15 }, matrice: mutat(70.5, 1234.25) };
const deschisa: Element = {
  forma: {
    tip: 'cale', inchis: false,
    varfuri: [{ p: { x: 0, y: 0 }, s: { tip: 'L' } }, { p: { x: 30, y: 40 }, s: { tip: 'L' } }],
  },
  matrice: mutat(-5.5, 2),
};
const inchisa: Element = {
  forma: {
    tip: 'cale', inchis: true,
    varfuri: [
      // Vârfurile nu pornesc din originea elementului: locul unei căi e colțul cutiei ei în lume, nu mutarea matricei.
      { p: { x: 5, y: 5 }, s: { tip: 'L' } }, { p: { x: 85, y: 5 }, s: { tip: 'L' } },
      { p: { x: 85, y: 45 }, s: { tip: 'L' } }, { p: { x: 5, y: 45 }, s: { tip: 'L' } },
    ],
  },
  matrice: mutat(10, 5),
};
const relief: Element = {
  forma: { tip: 'relief', nx: 200, ny: 100, celula: 0.5, straturi: [{ id: 's1', mod: 'aduna', vizibil: true, dale: 'c'.repeat(64) }] },
  matrice: mutat(10, 20),
};

test('fără nume dat de om: forma și mărimea pe primul rând, locul pe al doilea, în română cu virgula', () => {
  schimbaLimba('ro');
  assert.deepEqual(randLista(dreptunghi, { id: 'e1' }, 1), { nume: 'dreptunghi 100,00 × 60,00', unde: 'la X 20,00, Y 20,00' });
  assert.deepEqual(randLista(cerc, { id: 'e2' }, 1), { nume: 'cerc R15,00', unde: 'cu centrul la X 70,50, Y 1234,25' });
  assert.deepEqual(randLista(deschisa, { id: 'e3' }, 1), { nume: 'cale deschisă 30,00 × 40,00, 1 segment', unde: 'la X -5,50, Y 2,00' });
  assert.deepEqual(randLista(inchisa, { id: 'e4' }, 1), { nume: 'cale 80,00 × 40,00, 4 segmente', unde: 'la X 15,00, Y 10,00' });
  assert.deepEqual(randLista(relief, { id: 'e5' }, 1), { nume: 'relief 100,00 × 50,00', unde: 'la X 10,00, Y 20,00' });
});

test('în engleză, cu punct', () => {
  schimbaLimba('en');
  assert.deepEqual(randLista(dreptunghi, { id: 'e1' }, 1), { nume: 'rectangle 100.00 × 60.00', unde: 'at X 20.00, Y 20.00' });
  assert.deepEqual(randLista(cerc, { id: 'e2' }, 1), { nume: 'circle R15.00', unde: 'centred at X 70.50, Y 1234.25' });
  assert.deepEqual(randLista(deschisa, { id: 'e3' }, 1), { nume: 'open path 30.00 × 40.00, 1 segment', unde: 'at X -5.50, Y 2.00' });
  assert.deepEqual(randLista(inchisa, { id: 'e4' }, 1), { nume: 'path 80.00 × 40.00, 4 segments', unde: 'at X 15.00, Y 10.00' });
  schimbaLimba('ro');
});

test('numele dat de om ia locul formei; locul rămâne al primului element', () => {
  schimbaLimba('ro');
  assert.deepEqual(randLista(inchisa, { id: 'p1', nume: 'logo-80mm' }, 1), { nume: 'logo-80mm', unde: 'la X 15,00, Y 10,00' });
  // Un nume gol sau doar din spații nu e un nume dat de om.
  assert.deepEqual(randLista(dreptunghi, { id: 'p2', nume: '   ' }, 1), randLista(dreptunghi, { id: 'p2' }, 1));
  assert.deepEqual(randLista(dreptunghi, { id: 'p2', nume: '' }, 1), randLista(dreptunghi, { id: 'p2' }, 1));
});

test('o operație pe mai multe elemente spune câte mai are, după nume sau după formă', () => {
  schimbaLimba('ro');
  assert.equal(randLista(inchisa, { id: 'p1', nume: 'logo-80mm' }, 3).nume, 'logo-80mm (+2)');
  assert.equal(randLista(dreptunghi, { id: 'p2' }, 2).nume, 'dreptunghi 100,00 × 60,00 (+1)');
});

test('fără element (piesa nu mai are nodul în lume): numele piesei sau id-ul ei, fără loc', () => {
  schimbaLimba('ro');
  assert.deepEqual(randLista(undefined, { id: 'p9', nume: 'capac' }, 1), { nume: 'capac', unde: '' });
  assert.deepEqual(randLista(undefined, { id: 'p9' }, 1), { nume: 'p9', unde: '' });
});

test('numerele rândului sunt chiar ale numelui întreg al elementului (același rotunjit, aceeași limbă)', () => {
  for (const limba of ['ro', 'en'] as const) {
    schimbaLimba(limba);
    for (const e of [dreptunghi, cerc, deschisa, inchisa]) {
      const r = randLista(e, { id: 'x' }, 1);
      const intreg = descriere(e);
      const numere = (s: string): string[] => s.match(/-?\d+[.,]\d+/g) ?? [];
      assert.deepEqual([...numere(r.nume), ...numere(r.unde)], numere(intreg), `${limba}: ${intreg}`);
    }
  }
  schimbaLimba('ro');
});
