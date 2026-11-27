/**
 * Nota „s-a schimbat în bibliotecă” pe rândurile ferestrei exportului (ADR 0300 §5, felia 16.A↑b-4), pe hârtie:
 *
 * - **locurile frezelor** unui rând (`locuriFreze`): freza operației și, cu bifele lor, fundul plat, dopul, banda și frezele de
 *   rest, fiecare cu originea, diametrul și forma ei, ca frezele ferestrei;
 * - **diferențele** (`diferenteFreza`) dintre copia din proiect și freza din bibliotecă: numele, diametrul, unghiul, vârful,
 *   turația, avansul, plonjarea, tăișul; nu și numărul T sau pașii;
 * - **starea originii** (`stareOrigine`): biblioteca necitită încă (nimic), freza ștearsă, schimbată (cu diferențele) sau la zi;
 *   fără origine, freza din bibliotecă cu același diametru și aceeași formă, dacă e (recunoașterea, fără scriere);
 * - **valorile noi** (`cuValorileNoi`): diametrul, forma și originea frezei din bibliotecă, pe locul ei; T-ul și pașii rămân.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cuValorileNoi, diferenteFreza, locuriFreze, stareOrigine, type FrezaOferita, type OrigineFreza, type Rand,
} from '../../src/ui/exportRand.ts';

const P6: OrigineFreza = { nume: 'Plată Ø6', biblioteca: { id: 'p6', rev: 2 }, regim: { turatie: 18000, avans: 1000, plonjare: 300 }, tais: 22 };

/** Un rând al ferestrei, cu valorile date peste cele ale unui profil cu freza plată Ø6 din bibliotecă. */
function rand(p: Partial<Rand> = {}): Rand {
  return {
    numarScula: '2', diametruScula: '6', origineScula: P6, regimMana: { turatie: '', avans: '', plonjare: '' }, formaScula: 'plata', unghiV: '60', varfV: '0', razaColt: '1', directie: '', latura: 'exterior',
    sens: 'urcare', adancime: '3', pas: '1.5', urechi: false, numarUrechi: '4', latimeUreche: '8', grosimeUreche: '2', modUrechi: 'egale',
    rampa: false, lungimeRampa: '10', intrari: false, razaIntrare: '3', colturi: '', despartire: false, tip: 'profil', retragereCompleta: '1',
    pasLateral: '2.4', coborare: 'plonjare', unghiCoborare: '3', lungimeZigzag: '20', razaElice: '3',
    fundPlat: false, numarSculaFund: '3', diametruSculaFund: '3.175', pasLateralFund: '1.2', origineFund: null, rest: [], restFund: [],
    strategie: 'inele', unghiParalel: '0', incrustatie: false, jocInc: '0.5', fierastrauInc: '2', margineInc: '5', acelasiSpatiu: false,
    jurDop: 'fata', latimeBanda: '', decupareBanda: true, placaBanda: '', frezaBanda: false, numarSculaBanda: '8', diametruSculaBanda: '3',
    origineBanda: null, numarPunti: '4', latimePunti: '4', grosimePunti: '1', incrustatieDreapta: false, lateralInc: '0.1', dopInc: 'ridicat',
    sprijinInc: 'fund', locasInc: 'buzunar', treaptaInc: 'fara', adancimeTreapta: '1.5', latimeTreapta: '3', frezaDop: false,
    numarSculaDop: '5', diametruSculaDop: '3', pasLateralDop: '1.2', origineDop: null, restDop: [], ...p,
  };
}

/** Freza din bibliotecă, ca o oferă aplicația. */
const din = (o: OrigineFreza, diametru: number, forma?: { readonly tip: 'v'; readonly unghi: number; readonly varf?: number }, numar = 2): FrezaOferita => ({
  id: o.biblioteca.id, nume: o.nume, pas: 3, pasLateral: Math.floor(diametru * 400) / 1000,
  scula: { numar, diametru, ...(forma ? { forma } : {}), origine: o },
});

test('locurile frezelor unui rând: freza operației și, cu bifele lor, cele în plus', () => {
  assert.deepEqual(locuriFreze(rand()), [{ unde: 'scula', origine: P6, diametru: '6' }]);
  const v = rand({ tip: 'vcarve', formaScula: 'v', unghiV: '90', varfV: '0', fundPlat: true, origineFund: P6, restFund: [{ numar: '4', diametru: '2', pas: '0.8' }] });
  assert.deepEqual(locuriFreze(v), [
    { unde: 'scula', origine: P6, diametru: '6', forma: { tip: 'v', unghi: 90 } },
    { unde: 'fund', origine: P6, diametru: '3.175' },
    { unde: { rest: 'fund', k: 0 }, origine: null, diametru: '2' },
  ]);
  // Fundul plat nebifat nu e un loc; nici frezele lui de rest.
  assert.deepEqual(locuriFreze({ ...v, fundPlat: false }).map((l) => l.unde), ['scula']);
  // Banda și dopul, doar cu bifele lor; frezele de rest ale buzunarului, doar la buzunar.
  const b = rand({ tip: 'vcarve', formaScula: 'v', incrustatie: true, fundPlat: true, jurDop: 'banda', frezaBanda: true, origineBanda: P6 });
  assert.deepEqual(locuriFreze(b).map((l) => l.unde), ['scula', 'fund', 'banda']);
  const d = rand({ tip: 'buzunar', incrustatieDreapta: true, frezaDop: true, rest: [{ numar: '6', diametru: '3', pas: '1.2' }], restDop: [{ numar: '7', diametru: '1', pas: '0.4' }] });
  assert.deepEqual(locuriFreze(d).map((l) => l.unde), ['scula', 'dop', { rest: 'buzunar', k: 0 }, { rest: 'dop', k: 0 }]);
});

test('diferențele dintre copia din proiect și freza din bibliotecă: valorile frezei, nu T-ul și nici pașii', () => {
  const loc = locuriFreze(rand())[0]!;
  // Aceeași freză, alt T și alți pași în bibliotecă: nicio diferență.
  assert.deepEqual(diferenteFreza(loc, { ...din(P6, 6, undefined, 9), pas: 5, pasLateral: 4 }), []);
  // Avansul și tăișul schimbate, numele schimbat.
  const nou: OrigineFreza = { nume: 'Plată Ø6 nouă', biblioteca: { id: 'p6', rev: 3 }, regim: { turatie: 18000, avans: 1400, plonjare: 300 } };
  assert.deepEqual(diferenteFreza(loc, din(nou, 6)), [
    { camp: 'nume', aici: 'Plată Ø6', acolo: 'Plată Ø6 nouă' },
    { camp: 'avans', aici: 1000, acolo: 1400 },
    { camp: 'tais', aici: 22, acolo: null },
  ]);
  // Diametrul și forma: o freză în V cu alt unghi și cu vârf.
  const v = locuriFreze(rand({ formaScula: 'v', unghiV: '60', varfV: '0' }))[0]!;
  assert.deepEqual(diferenteFreza(v, din(P6, 6.35, { tip: 'v', unghi: 90, varf: 0.2 })), [
    { camp: 'diametru', aici: 6, acolo: 6.35 },
    { camp: 'unghi', aici: 60, acolo: 90 },
    { camp: 'varf', aici: 0, acolo: 0.2 },
  ]);
  // Valorile de lucru lipsă pe o parte: diferă.
  const { regim: _r, ...faraRegim } = P6;
  void _r;
  assert.deepEqual(diferenteFreza(loc, din(faraRegim, 6)).map((x) => x.camp), ['turatie', 'avans', 'plonjare']);
});

test('starea originii: necitită, ștearsă, schimbată, la zi; fără origine, recunoscută după diametru și formă', () => {
  const loc = locuriFreze(rand())[0]!;
  // Biblioteca necitită încă: nimic de spus.
  assert.equal(stareOrigine(loc, null), null);
  assert.deepEqual(stareOrigine(loc, []), { fel: 'stearsa' });
  assert.deepEqual(stareOrigine(loc, [din(P6, 6)]), { fel: 'la-zi' });
  const nou: OrigineFreza = { ...P6, biblioteca: { id: 'p6', rev: 3 }, regim: { turatie: 18000, avans: 1400, plonjare: 300 } };
  const s = stareOrigine(loc, [din(nou, 6)]);
  assert.equal(s?.fel, 'schimbata');
  assert.deepEqual(s?.fel === 'schimbata' ? s.diferente : null, [{ camp: 'avans', aici: 1000, acolo: 1400 }]);
  // Versiunea a crescut, dar valorile frezei sunt aceleași (o notă, un grup schimbat): la zi.
  assert.deepEqual(stareOrigine(loc, [din({ ...P6, biblioteca: { id: 'p6', rev: 7 } }, 6)]), { fel: 'la-zi' });
  // Fără origine: prima freză cu același diametru și aceeași formă (o plată Ø6), fără să scrie nimic.
  const mana = locuriFreze(rand({ origineScula: null }))[0]!;
  const v60: OrigineFreza = { nume: 'V60 Ø6', biblioteca: { id: 'v60', rev: 1 } };
  assert.deepEqual(stareOrigine(mana, [din(v60, 6, { tip: 'v', unghi: 60 }), din(P6, 6)]), { fel: 'recunoscuta', freza: din(P6, 6) });
  assert.equal(stareOrigine(mana, [din(v60, 6, { tip: 'v', unghi: 60 })]), null);
  // În V, aceeași formă: unghiul și vârful contează.
  const manaV = locuriFreze(rand({ origineScula: null, formaScula: 'v', unghiV: '60', varfV: '0' }))[0]!;
  assert.deepEqual(stareOrigine(manaV, [din(v60, 6, { tip: 'v', unghi: 60 })]), { fel: 'recunoscuta', freza: din(v60, 6, { tip: 'v', unghi: 60 }) });
  assert.equal(stareOrigine(manaV, [din(v60, 6, { tip: 'v', unghi: 60, varf: 0.2 })]), null);
});

test('valorile noi: diametrul, forma și originea frezei din bibliotecă, pe locul ei; T-ul și pașii rămân', () => {
  const nou: OrigineFreza = { nume: 'Plată Ø6,35', biblioteca: { id: 'p6', rev: 3 }, regim: { turatie: 16000, avans: 1400, plonjare: 300 } };
  assert.deepEqual(cuValorileNoi(rand(), 'scula', din(nou, 6.35, undefined, 9)), { diametruScula: '6.35', formaScula: 'plata', origineScula: nou });
  assert.deepEqual(cuValorileNoi(rand(), 'scula', din(nou, 6, { tip: 'v', unghi: 90, varf: 0.2 })),
    { diametruScula: '6', formaScula: 'v', unghiV: '90', varfV: '0.2', origineScula: nou });
  assert.deepEqual(cuValorileNoi(rand(), 'fund', din(nou, 3)), { diametruSculaFund: '3', origineFund: nou });
  assert.deepEqual(cuValorileNoi(rand(), 'dop', din(nou, 3)), { diametruSculaDop: '3', origineDop: nou });
  assert.deepEqual(cuValorileNoi(rand(), 'banda', din(nou, 3)), { diametruSculaBanda: '3', origineBanda: nou });
  const r = rand({ restFund: [{ numar: '4', diametru: '2', pas: '0.8', origine: P6 }, { numar: '5', diametru: '1', pas: '0.4' }] });
  assert.deepEqual(cuValorileNoi(r, { rest: 'fund', k: 0 }, din(nou, 2.5)),
    { restFund: [{ numar: '4', diametru: '2.5', pas: '0.8', origine: nou }, { numar: '5', diametru: '1', pas: '0.4' }] });
  assert.deepEqual(cuValorileNoi(r, { rest: 'dop', k: 0 }, din(nou, 2.5)), {});
});
