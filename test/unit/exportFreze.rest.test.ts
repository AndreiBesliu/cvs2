/**
 * Frezele în plus ale unui rând din „Frezele mele” (ADR 0300 §4, felia 16.A↑b-5), pe hârtie:
 *
 * - **scrierea originii** (`operatieDinDialog`): freza fundului plat, frezele de rest (ale buzunarului, ale fundului plat, ale
 *   dopului drept), freza dopului și a decupării benzii primesc, ca freza operației (16.A↑b-3), numele, originea, valorile de
 *   lucru și tăișul celei alese; fără originea ei pe rând (`null`), ele pleacă, cu numele după rol; fără câmpul `origine`,
 *   freza rămâne cum era; un Exportă fără nicio schimbare scrie aceeași operație, la octet;
 * - **frezele ferestrei** (`frezeRanduri`): toate frezele rândurilor, cu turația originii lor, afară de cea înlocuită;
 * - **alegerea** (`cuFrezaAleasa`): T-ul, Ø-ul, pasul lateral și originea, pe locul ales al rândului;
 * - **frezele oferite unei freze de rest** (`oferitePentruRest`): doar cele mai mici decât freza dinainte.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { operatieDinDialog } from '../../src/app/valoriOperatii.ts';
import type { Operatie, Scula } from '../../src/model/document.ts';
import {
  cuFrezaAleasa, frezeRanduri, numarPentruRand, oferitePentruRest, type FrezaOferita, type OrigineFreza, type Rand, type ValoriOperatie,
} from '../../src/ui/exportRand.ts';

const P3: OrigineFreza = { nume: 'Plată Ø3', biblioteca: { id: 'p3', rev: 2 }, regim: { turatie: 20000, avans: 900, plonjare: 300 }, tais: 12 };
const P2: OrigineFreza = { nume: 'Plată Ø2', biblioteca: { id: 'p2', rev: 1 }, regim: { turatie: 22000, avans: 700, plonjare: 250 } };
/** Scula din document cu originea dată. */
const dinBiblioteca = (numar: number, diametru: number, r: OrigineFreza): Scula => ({
  numar, nume: r.nume, diametru, biblioteca: { ...r.biblioteca }, ...(r.regim ? { regim: { ...r.regim } } : {}), ...(r.tais !== undefined ? { tais: r.tais } : {}),
});

const V60 = { numar: 1, nume: 'freza V60', diametru: 6, forma: { tip: 'v' as const, unghi: 60 } };
const VCARVE: Operatie = {
  id: 'o', tip: 'vcarve', noduri: ['a'], latura: 'interior', sens: 'urcare', adancime: 3, pas: 1.5, scula: V60,
  urechi: null, rampa: null, intrari: null, colturi: null,
  fundPlat: { scula: { numar: 2, nume: 'freza dreapta', diametru: 3 }, pasLateral: 1.2 },
} as Operatie;
const randVcarve = (fundPlat: NonNullable<ValoriOperatie['fundPlat']> | null): ValoriOperatie => ({
  scula: { numar: 1, diametru: 6, forma: { tip: 'v', unghi: 60 } }, latura: 'interior', sens: 'urcare', adancime: 3, pas: 1.5,
  urechi: null, rampa: null, intrari: null, colturi: null, tip: 'vcarve', fundPlat,
});
const scrie = (o: Operatie, v: ValoriOperatie): Operatie => operatieDinDialog(o, v, v.scula!);

test('fundul plat: freza din bibliotecă scrie numele, originea, valorile de lucru și tăișul; scrisă de mână, ele pleacă', () => {
  const cu = scrie(VCARVE, randVcarve({ numar: 2, diametru: 3, pasLateral: 1.2, origine: P3 }));
  assert.deepEqual(cu.fundPlat?.scula, dinBiblioteca(2, 3, P3));
  assert.equal(cu.fundPlat?.pasLateral, 1.2);
  // Scrisă de mână, pe un fund care era din bibliotecă: originea, valorile și tăișul pleacă, numele e al rolului.
  const din: Operatie = { ...VCARVE, fundPlat: { scula: dinBiblioteca(2, 3, P3), pasLateral: 1.2 } };
  assert.deepEqual(scrie(din, randVcarve({ numar: 2, diametru: 2.5, pasLateral: 1, origine: null })).fundPlat?.scula,
    { numar: 2, nume: 'freza dreapta', diametru: 2.5 });
  // Scrisă de mână pe un fund scris de mână: numele omului rămâne.
  const numit: Operatie = { ...VCARVE, fundPlat: { scula: { numar: 2, nume: 'a mea', diametru: 3 }, pasLateral: 1.2 } };
  assert.equal(scrie(numit, randVcarve({ numar: 2, diametru: 3, pasLateral: 1.2, origine: null })).fundPlat?.scula.nume, 'a mea');
  // Fără câmpul `origine`: freza rămâne cu originea din document.
  assert.deepEqual(scrie(din, randVcarve({ numar: 2, diametru: 3, pasLateral: 1.2 })).fundPlat?.scula, din.fundPlat?.scula);
  // Un Exportă fără nicio schimbare, cu originea citită din document: același fund, cu cheile în aceeași ordine.
  assert.equal(JSON.stringify(scrie(din, randVcarve({ numar: 2, diametru: 3, pasLateral: 1.2, origine: P3 })).fundPlat), JSON.stringify(din.fundPlat));
  // Altă freză, fără tăiș: tăișul celei de dinainte pleacă.
  assert.deepEqual(scrie(din, randVcarve({ numar: 2, diametru: 2, pasLateral: 0.8, origine: P2 })).fundPlat?.scula, dinBiblioteca(2, 2, P2));
});

test('frezele de rest: fiecare cu originea ei, pe poziție; scrisă de mână, originea de pe poziția aceea pleacă', () => {
  const buz: Operatie = {
    id: 'b', tip: 'buzunar', noduri: ['a'], latura: 'interior', sens: 'urcare', adancime: 4, pas: 2, pasLateral: 2.4,
    scula: { numar: 1, nume: 'freza plata', diametru: 6 }, urechi: null, rampa: null, intrari: null, colturi: null,
    rest: [{ scula: dinBiblioteca(2, 3, P3), pasLateral: 1.2 }, { scula: dinBiblioteca(3, 2, P2), pasLateral: 0.8 }],
  } as Operatie;
  const v: ValoriOperatie = {
    scula: { numar: 1, diametru: 6 }, latura: 'interior', sens: 'urcare', adancime: 4, pas: 2, urechi: null, rampa: null, intrari: null,
    colturi: null, tip: 'buzunar', pasLateral: 2.4,
    rest: [{ numar: 2, diametru: 3, pasLateral: 1.2, origine: P3 }, { numar: 3, diametru: 1.5, pasLateral: 0.6, origine: null }],
  };
  const o = scrie(buz, v);
  assert.deepEqual(o.rest?.[0]?.scula, dinBiblioteca(2, 3, P3));
  assert.deepEqual(o.rest?.[1]?.scula, { numar: 3, nume: 'freza plata', diametru: 1.5 });
  // O freză nouă, din bibliotecă, pe o poziție nouă.
  const trei = scrie(buz, { ...v, rest: [...v.rest!, { numar: 4, diametru: 1, pasLateral: 0.4, origine: { nume: 'Ø1', biblioteca: { id: 'p1', rev: 5 } } }] });
  assert.deepEqual(trei.rest?.[2]?.scula, { numar: 4, nume: 'Ø1', diametru: 1, biblioteca: { id: 'p1', rev: 5 } });
  // Exportă fără schimbare: aceleași freze de rest, la octet.
  const la = scrie(buz, { ...v, rest: [{ numar: 2, diametru: 3, pasLateral: 1.2, origine: P3 }, { numar: 3, diametru: 2, pasLateral: 0.8, origine: P2 }] });
  assert.equal(JSON.stringify(la.rest), JSON.stringify(buz.rest));
  // Frezele de rest ale fundului plat: scrise de mână, cu numele „freza dreapta”.
  const fund: Operatie = { ...VCARVE, fundPlat: { scula: dinBiblioteca(2, 3, P3), pasLateral: 1.2, rest: [{ scula: dinBiblioteca(3, 2, P2), pasLateral: 0.8 }] } };
  const f = scrie(fund, randVcarve({ numar: 2, diametru: 3, pasLateral: 1.2, origine: P3, rest: [{ numar: 3, diametru: 1.5, pasLateral: 0.6, origine: null }] }));
  assert.deepEqual(f.fundPlat?.rest?.[0]?.scula, { numar: 3, nume: 'freza dreapta', diametru: 1.5 });
});

test('frezele dopului drept și freza decupării benzii primesc originea aleasă', () => {
  const drept: Operatie = {
    id: 'b', tip: 'buzunar', noduri: ['a'], latura: 'interior', sens: 'urcare', adancime: 4, pas: 2, pasLateral: 2.4,
    scula: { numar: 1, nume: 'freza plata', diametru: 6 }, urechi: null, rampa: null, intrari: null, colturi: null,
    incrustatie: { fel: 'drept', jocLateral: 0.1, dop: 'ridicat', sprijin: 'fund', joc: 0.5, fierastrau: 2, margine: 5 },
  } as Operatie;
  const v: ValoriOperatie = {
    scula: { numar: 1, diametru: 6 }, latura: 'interior', sens: 'urcare', adancime: 4, pas: 2, urechi: null, rampa: null, intrari: null,
    colturi: null, tip: 'buzunar', pasLateral: 2.4,
    incrustatieDreapta: {
      jocLateral: 0.1, dop: 'ridicat', sprijin: 'fund', joc: 0.5, fierastrau: 2, margine: 5,
      frezeDop: [{ numar: 5, diametru: 3, pasLateral: 1.2, origine: P3 }, { numar: 6, diametru: 2, pasLateral: 0.8, origine: P2 }],
    },
  };
  const i = scrie(drept, v).incrustatie;
  assert.equal(i?.fel, 'drept');
  if (i?.fel !== 'drept') return;
  assert.deepEqual(i.frezeDop?.map((r) => r.scula), [dinBiblioteca(5, 3, P3), dinBiblioteca(6, 2, P2)]);

  const cuBanda: Operatie = {
    ...VCARVE,
    incrustatie: {
      fel: 'v', joc: 0.5, fierastrau: 2, margine: 5, jurDop: 'banda',
      banda: { decupare: true, grosimePlaca: 6, freza: dinBiblioteca(8, 2, P2), punti: { numar: 3, latime: 5, grosime: 1.5 } },
    },
  } as Operatie;
  const banda = (freza: NonNullable<NonNullable<NonNullable<ValoriOperatie['incrustatie']>['banda']>['freza']>): ValoriOperatie => ({
    ...randVcarve({ numar: 2, diametru: 3, pasLateral: 1.2 }),
    incrustatie: { joc: 0.5, fierastrau: 2, margine: 5, jurDop: 'banda', banda: { decupare: true, grosimePlaca: 6, freza, punti: { numar: 3, latime: 5, grosime: 1.5 } } },
  });
  const ib = scrie(cuBanda, banda({ numar: 8, diametru: 3, origine: P3 })).incrustatie;
  assert.deepEqual(ib?.fel === 'v' ? ib.banda?.freza : null, dinBiblioteca(8, 3, P3));
  // Scrisă de mână: originea pleacă, numele e al rolului.
  const im = scrie(cuBanda, banda({ numar: 8, diametru: 2.5, origine: null })).incrustatie;
  assert.deepEqual(im?.fel === 'v' ? im.banda?.freza : null, { numar: 8, nume: 'freza dreapta', diametru: 2.5 });
  // Exportă fără schimbare: aceeași bandă, la octet.
  const la = scrie(cuBanda, banda({ numar: 8, diametru: 2, origine: P2 })).incrustatie;
  assert.equal(JSON.stringify(la?.fel === 'v' ? la.banda : null), JSON.stringify(cuBanda.incrustatie?.fel === 'v' ? cuBanda.incrustatie.banda : null));
});

/** Un rând al ferestrei, cu valorile date peste cele ale unui V-carve cu fundul plat. */
function rand(p: Partial<Rand> = {}): Rand {
  return {
    numarScula: '1', diametruScula: '6', origineScula: null, regimMana: { turatie: '', avans: '', plonjare: '' }, formaScula: 'v', unghiV: '60', varfV: '0', razaColt: '1', directie: '', latura: 'interior',
    sens: 'urcare', adancime: '3', pas: '1.5', urechi: false, numarUrechi: '4', latimeUreche: '8', grosimeUreche: '2', modUrechi: 'egale',
    rampa: false, lungimeRampa: '10', intrari: false, razaIntrare: '3', colturi: '', despartire: false, tip: 'vcarve', retragereCompleta: '1',
    pasLateral: '2.4', coborare: 'plonjare', unghiCoborare: '3', lungimeZigzag: '20', razaElice: '3',
    fundPlat: true, numarSculaFund: '2', diametruSculaFund: '3', pasLateralFund: '1.2', origineFund: null, rest: [], restFund: [],
    strategie: 'inele', unghiParalel: '0', incrustatie: false, jocInc: '0.5', fierastrauInc: '2', margineInc: '5', acelasiSpatiu: false,
    jurDop: 'fata', latimeBanda: '', decupareBanda: true, placaBanda: '', frezaBanda: false, numarSculaBanda: '8', diametruSculaBanda: '3',
    origineBanda: null, numarPunti: '4', latimePunti: '4', grosimePunti: '1', incrustatieDreapta: false, lateralInc: '0.1', dopInc: 'ridicat',
    sprijinInc: 'fund', locasInc: 'buzunar', treaptaInc: 'fara', adancimeTreapta: '1.5', latimeTreapta: '3', frezaDop: false,
    numarSculaDop: '5', diametruSculaDop: '3', pasLateralDop: '1.2', origineDop: null, restDop: [], ...p,
  };
}

test('frezele ferestrei: toate frezele rândurilor, cu turația originii, afară de cea înlocuită', () => {
  const a = rand({ origineFund: P3, restFund: [{ numar: '3', diametru: '1.5', pas: '0.6', origine: P2 }] });
  const b = rand({ tip: 'buzunar', formaScula: 'plata', numarScula: '4', diametruScula: '8', rest: [{ numar: '5', diametru: '4', pas: '1.6' }] });
  const toate = frezeRanduri([['a', a], ['b', b]]);
  assert.deepEqual(toate, [
    { numar: 1, diametru: 6, forma: { tip: 'v', unghi: 60 } },
    { numar: 2, diametru: 3, turatie: 20000 },
    { numar: 3, diametru: 1.5, turatie: 22000 },
    { numar: 4, diametru: 8 },
    { numar: 5, diametru: 4 },
  ]);
  // Fără fundul plat al lui `a` (freza pe care o înlocuim) și fără freza de rest a lui `b`.
  assert.deepEqual(frezeRanduri([['a', a], ['b', b]], { cheie: 'a', unde: 'fund' }).map((f) => f.numar), [1, 3, 4, 5]);
  assert.deepEqual(frezeRanduri([['a', a], ['b', b]], { cheie: 'b', unde: { rest: 'buzunar', k: 0 } }).map((f) => f.numar), [1, 2, 3, 4]);
  // Doar freza de rest înlocuită iese; celelalte din lista ei rămân.
  const b2 = { ...b, rest: [...b.rest, { numar: '6', diametru: '2', pas: '0.8' }] };
  assert.deepEqual(frezeRanduri([['b', b2]], { cheie: 'b', unde: { rest: 'buzunar', k: 0 } }).map((f) => f.numar), [4, 6]);
  assert.deepEqual(frezeRanduri([['b', b2]], { cheie: 'b', unde: { rest: 'buzunar', k: 1 } }).map((f) => f.numar), [4, 5]);
  // Frezele dopului drept și a decupării benzii, doar cu bifele lor.
  const dop = rand({ tip: 'buzunar', formaScula: 'plata', incrustatieDreapta: true, frezaDop: true, origineDop: P3, restDop: [{ numar: '6', diametru: '2', pas: '0.8' }] });
  assert.deepEqual(frezeRanduri([['d', dop]]).map((f) => [f.numar, f.turatie]), [[1, undefined], [5, 20000], [6, undefined]]);
  assert.deepEqual(frezeRanduri([['d', { ...dop, frezaDop: false }]]).map((f) => f.numar), [1]);
  const banda = rand({ incrustatie: true, jurDop: 'banda', frezaBanda: true, origineBanda: P2 });
  assert.deepEqual(frezeRanduri([['v', banda]]).map((f) => [f.numar, f.turatie]), [[1, undefined], [2, undefined], [8, 22000]]);
  // Fără fundul plat bifat, freza lui nu se numără.
  assert.deepEqual(frezeRanduri([['v', rand({ fundPlat: false })]]).map((f) => f.numar), [1]);
});

const oferita = (id: string, diametru: number, r: OrigineFreza, numar = 7): FrezaOferita => ({
  id, nume: r.nume, pas: 1, pasLateral: Math.floor(diametru * 400) / 1000, scula: { numar, diametru, origine: r },
});

test('alegerea pe un loc al rândului: T-ul dat, Ø-ul, pasul lateral și originea, doar pe locul acela', () => {
  const p = rand({ restFund: [{ numar: '3', diametru: '1.5', pas: '0.6' }], rest: [{ numar: '9', diametru: '1', pas: '0.4' }] });
  const f = oferita('p3', 3, P3);
  assert.deepEqual(cuFrezaAleasa(p, 'fund', f, 7), { numarSculaFund: '7', diametruSculaFund: '3', pasLateralFund: '1.2', origineFund: P3 });
  assert.deepEqual(cuFrezaAleasa(p, 'dop', f, 7), { numarSculaDop: '7', diametruSculaDop: '3', pasLateralDop: '1.2', origineDop: P3 });
  assert.deepEqual(cuFrezaAleasa(p, 'banda', f, 7), { numarSculaBanda: '7', diametruSculaBanda: '3', origineBanda: P3 });
  // O freză de rest: doar rândul ei din lista ei se schimbă.
  const doua = { ...p, restFund: [...p.restFund, { numar: '8', diametru: '0.8', pas: '0.3', origine: P2 }] };
  const r = cuFrezaAleasa(doua, { rest: 'fund', k: 0 }, oferita('p1', 1, { nume: 'Ø1', biblioteca: { id: 'p1', rev: 1 } }), 4);
  assert.deepEqual(r, {
    restFund: [{ numar: '4', diametru: '1', pas: '0.4', origine: { nume: 'Ø1', biblioteca: { id: 'p1', rev: 1 } } }, { numar: '8', diametru: '0.8', pas: '0.3', origine: P2 }],
  });
  // Un loc care nu e în listă nu schimbă nimic.
  assert.deepEqual(cuFrezaAleasa(p, { rest: 'dop', k: 0 }, f, 4), {});
  // T-ul vine din regula rolurilor, printre frezele ferestrei fără cea înlocuită: T7 e al unei alte freze, deci cel mai mic liber.
  const alte = frezeRanduri([['a', p]], { cheie: 'a', unde: 'fund' });
  assert.equal(numarPentruRand(alte, { numar: 1, diametru: 3, turatie: 20000 }), 2);
});

test('frezele oferite unei freze de rest: doar cele mai mici decât freza dinainte', () => {
  const lista = [oferita('a', 6, P3), oferita('b', 3, P3), oferita('c', 2, P2), oferita('d', 1, P2)];
  assert.deepEqual(oferitePentruRest(lista, '3').map((f) => f.id), ['c', 'd']);
  assert.deepEqual(oferitePentruRest(lista, '6,0').map((f) => f.id), ['b', 'c', 'd']);
  // Freza dinainte de necitit: toate (câmpul greșit se spune singur, în grupul lui).
  assert.deepEqual(oferitePentruRest(lista, 'x').map((f) => f.id), ['a', 'b', 'c', 'd']);
});
