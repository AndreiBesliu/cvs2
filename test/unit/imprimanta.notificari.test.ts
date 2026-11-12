/**
 * Felia 3.6s (ADR 0194 §A): evenimentele unei imprimări din schimbările de stare (finalul, oprirea, pauzele, lipsa
 * filamentului, erorile, legătura pierdută, primul strat), cheile lor, și driverul K1 (finalul cu `state` 2, `materialStatus`).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { citesteCadru, stareLucrare } from '../../src/machine/imprimanta/creality.ts';
import { IMPRIMANTA_NECUNOSCUTA } from '../../src/machine/imprimanta/driver.ts';
import { cheieEveniment, evenimente, lucrareNoua, type Clipa } from '../../src/machine/imprimanta/evenimente.ts';

const F = '/usr/data/printer_data/gcodes/placute_PLA_18m.gcode';
const clipa = (x: Partial<Clipa> = {}): Clipa => ({
  legatura: 'vie', lucrare: 'imprima', fisier: F, eroare: null, cheieEroare: null, faraFilament: false, strat: 5, pauzaFisier: null,
  trecut: 600, filament: 2000, ...x,
});
const feluri = (a: Clipa | null, b: Clipa): string[] => evenimente(a, b).map((e) => e.fel);

test('3.6s: finalul și oprirea, o dată, cu durata și filamentul de dinainte (după final, imprimanta le poate pune pe 0)', () => {
  const [g] = evenimente(clipa({ trecut: 1140, filament: 3712 }), clipa({ lucrare: 'gata', trecut: 0, filament: 0 }));
  assert.deepEqual(g, { fel: 'gata', fisier: F, strat: null, nota: null, cheie: null, durata: 1140, filament: 3712 });
  assert.deepEqual(feluri(clipa({ lucrare: 'gata' }), clipa({ lucrare: 'gata' })), []);
  // Oprirea K1: 1, apoi 7 (pregătire, „oprirea în curs”), apoi 4; și o oprire din pornire.
  assert.deepEqual(feluri(clipa(), clipa({ lucrare: 'pregatire' })), []);
  assert.deepEqual(feluri(clipa({ lucrare: 'pregatire' }), clipa({ lucrare: 'oprita' })), ['oprita']);
  assert.deepEqual(feluri(clipa({ lucrare: 'pauza' }), clipa({ lucrare: 'oprita' })), ['oprita']);
  // Alt fișier: altă lucrare, nu finalul celei dinainte.
  assert.deepEqual(feluri(clipa(), clipa({ lucrare: 'gata', fisier: '/x/alt.gcode' })), []);
  // Din nimic sau din necunoscut (prima stare după legare), nimic: o legare nouă nu repetă.
  assert.deepEqual(feluri(null, clipa({ lucrare: 'gata', eroare: 5000, cheieEroare: 12 })), []);
  assert.deepEqual(feluri(clipa({ lucrare: 'necunoscuta' }), clipa({ lucrare: 'gata', eroare: 5000 })), []);
  assert.deepEqual(feluri(clipa({ lucrare: 'libera', fisier: null }), clipa({ lucrare: 'gata' })), []);
});

test('3.6s: pauza din fișier (stratul și nota), altă pauză, lipsa filamentului (și când vine în pauză), primul strat', () => {
  const [p] = evenimente(clipa(), clipa({ lucrare: 'pauza', pauzaFisier: { strat: 11, nota: 'filament negru' } }));
  assert.deepEqual([p?.fel, p?.strat, p?.nota], ['pauzaFisier', 11, 'filament negru']);
  assert.deepEqual(feluri(clipa(), clipa({ lucrare: 'pauza' })), ['pauza']);
  assert.deepEqual(feluri(clipa(), clipa({ lucrare: 'pauza', faraFilament: true, pauzaFisier: { strat: 11, nota: null } })), ['faraFilament']);
  assert.deepEqual(feluri(clipa({ lucrare: 'pauza' }), clipa({ lucrare: 'pauza', faraFilament: true })), ['faraFilament']);
  assert.deepEqual(feluri(clipa({ lucrare: 'pauza', faraFilament: true }), clipa({ lucrare: 'pauza', faraFilament: true })), []);
  assert.deepEqual(feluri(clipa({ lucrare: 'pauza' }), clipa({ lucrare: 'pauza' })), []);
  assert.deepEqual(feluri(clipa({ strat: 1 }), clipa({ strat: 2 })), ['primulStrat']);
  assert.deepEqual(feluri(clipa({ strat: 2 }), clipa({ strat: 3 })), []);
  assert.deepEqual(feluri(clipa({ strat: 1, lucrare: 'pauza' }), clipa({ strat: 2, lucrare: 'pauza' })), []);
});

test('3.6s: o eroare nouă (alt cod sau altă cheie), oricând; legătura pierdută cât lucrează, iar finalul din timpul ei, la revenire', () => {
  assert.deepEqual(evenimente(clipa(), clipa({ eroare: 5000, cheieEroare: 12 })).map((e) => [e.fel, e.cheie]), [['eroare', 12]]);
  assert.deepEqual(feluri(clipa({ eroare: 5000, cheieEroare: 12 }), clipa({ eroare: 5000, cheieEroare: 12 })), []);
  assert.deepEqual(feluri(clipa({ eroare: 5000, cheieEroare: 12 }), clipa({ eroare: 5000, cheieEroare: 13 })), ['eroare']);
  assert.deepEqual(evenimente(clipa({ lucrare: 'libera', fisier: null }), clipa({ lucrare: 'libera', fisier: null, eroare: 2585 })).map((e) => e.cheie), [2585]);
  assert.deepEqual(feluri(clipa(), clipa({ legatura: 'pierduta' })), ['pierduta']);
  assert.deepEqual(feluri(clipa({ lucrare: 'libera', fisier: null }), clipa({ lucrare: 'libera', fisier: null, legatura: 'pierduta' })), []);
  assert.deepEqual(feluri(clipa({ legatura: 'pierduta' }), clipa({ legatura: 'pierduta', lucrare: 'gata', eroare: 1 })), []);
  assert.deepEqual(feluri(clipa({ legatura: 'pierduta' }), clipa({ lucrare: 'gata' })), ['gata']);
  assert.deepEqual(feluri(clipa(), clipa({ legatura: 'alta', lucrare: 'gata' })), []);
});

test('3.6s: o lucrare nouă (din nimic, după final sau alt fișier) uită cheile; o pauză are cheia stratului ei', () => {
  assert.equal(lucrareNoua(null, clipa({ lucrare: 'pregatire' })), true);
  assert.equal(lucrareNoua(clipa({ lucrare: 'gata' }), clipa()), true);
  assert.equal(lucrareNoua(clipa(), clipa({ fisier: '/x/alt.gcode' })), true);
  assert.equal(lucrareNoua(clipa(), clipa({ lucrare: 'pauza' })), false);
  assert.equal(lucrareNoua(clipa(), clipa({ lucrare: 'gata' })), false);
  const [p9] = evenimente(clipa(), clipa({ lucrare: 'pauza', pauzaFisier: { strat: 9, nota: null } }));
  const [p11] = evenimente(clipa(), clipa({ lucrare: 'pauza', pauzaFisier: { strat: 11, nota: null } }));
  assert.notEqual(cheieEveniment(p9!), cheieEveniment(p11!));
  const [g1] = evenimente(clipa(), clipa({ lucrare: 'gata' }));
  const [g2] = evenimente(clipa({ trecut: 1 }), clipa({ lucrare: 'gata', trecut: 2 }));
  assert.equal(cheieEveniment(g1!), cheieEveniment(g2!));
  const [e1] = evenimente(clipa(), clipa({ eroare: 1, cheieEroare: 7 }));
  const [e2] = evenimente(clipa(), clipa({ eroare: 1, cheieEroare: 8 }));
  assert.notEqual(cheieEveniment(e1!), cheieEveniment(e2!));
});

test('3.6s: driverul K1: `state` 2 e „gata” și la 99 % (procentul pâlpâie la final); `materialStatus` 1 = fără filament', () => {
  const cu = (x: Partial<typeof IMPRIMANTA_NECUNOSCUTA>) => ({ ...IMPRIMANTA_NECUNOSCUTA, ...x });
  assert.equal(stareLucrare(cu({ cod: 2, fisier: F, progres: 99, ramas: 30 })), 'gata');
  assert.equal(stareLucrare(cu({ cod: 2, fisier: null, progres: null })), 'libera');
  assert.equal(stareLucrare(cu({ cod: 1, fisier: F, progres: 99, ramas: 30 })), 'imprima');
  assert.deepEqual(citesteCadru('{"materialStatus":1}').stare, { faraFilament: true });
  assert.deepEqual(citesteCadru('{"materialStatus":0}').stare, { faraFilament: false });
  assert.deepEqual(citesteCadru('{"materialStatus":"x"}').stare, {});
});
