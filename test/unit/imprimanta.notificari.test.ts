/**
 * Felia 3.6s (ADR 0194 §A): evenimentele unei imprimări din schimbările de stare (finalul, oprirea, pauzele, lipsa
 * filamentului, erorile, legătura pierdută, primul strat), cheile lor, și driverul K1 (finalul cu `state` 2, `materialStatus`).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { citesteCadru, stareLucrare } from '../../src/machine/imprimanta/creality.ts';
import { IMPRIMANTA_NECUNOSCUTA } from '../../src/machine/imprimanta/driver.ts';
import { cheieEveniment, evenimente, lucrareNoua, type Clipa, type Eveniment } from '../../src/machine/imprimanta/evenimente.ts';
import { adaugaMesaje } from '../../src/i18n/t.ts';
import { enImprimanta } from '../../src/i18n/imprimanta.en.ts';
import { roImprimanta } from '../../src/i18n/imprimanta.ro.ts';
import { CHEIE_NOTIFICARI } from '../../src/app/imprimantaLaPornire.ts';
import {
  cereAtentie, citesteSetari, scrieSetari, semnImprimanta, SETARI_IMPLICITE, textEveniment,
} from '../../src/app/notificariImprimanta.ts';

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

// --- Partea din aplicație (felia 3.6s): setările ținute, semnul de pe butonul Imprimanta, textele, titlul filei. ---

adaugaMesaje({ ro: roImprimanta, en: enImprimanta });

const depozit = (initial: string | null = null) => {
  let v = initial;
  return { getItem: (k: string) => (k === CHEIE_NOTIFICARI ? v : null), setItem: (k: string, x: string) => { if (k === CHEIE_NOTIFICARI) v = x; }, text: () => v };
};

test('3.6s: setările notificărilor, ținute în browser (v: 1): implicitul, o valoare stricată ia implicitul ei, dus-întors', () => {
  assert.deepEqual(citesteSetari(depozit()), SETARI_IMPLICITE);
  assert.equal(SETARI_IMPLICITE.evenimente.primulStrat, false);
  assert.equal(SETARI_IMPLICITE.legare, false);
  assert.deepEqual(citesteSetari(depozit('{"v":2,"sunet":false}')), SETARI_IMPLICITE);
  assert.deepEqual(citesteSetari(depozit('{nu e json')), SETARI_IMPLICITE);
  const s = citesteSetari(depozit('{"v":1,"sunet":false,"legare":"da","evenimente":{"primulStrat":true,"gata":1,"necunoscut":true}}'));
  assert.equal(s.sunet, false);
  assert.equal(s.legare, false);
  assert.equal(s.evenimente.primulStrat, true);
  assert.equal(s.evenimente.gata, true);
  assert.equal('necunoscut' in s.evenimente, false);
  const d = depozit();
  const alta = { ...SETARI_IMPLICITE, sistemInFata: true, legare: true, evenimente: { ...SETARI_IMPLICITE.evenimente, pauza: false } };
  scrieSetari(alta, d);
  assert.deepEqual(citesteSetari(d), alta);
  assert.equal(JSON.parse(d.text() ?? '{}').v, 1);
  const strica = { getItem: () => { throw new Error('blocat'); }, setItem: () => { throw new Error('blocat'); } };
  assert.deepEqual(citesteSetari(strica), SETARI_IMPLICITE);
  assert.doesNotThrow(() => { scrieSetari(alta, strica); });
});

test('3.6s: semnul de pe butonul Imprimanta: procentul cât imprimă, pauza, roșu la eroare sau fără filament, gri fără legătură, ✓ până se vede', () => {
  const s = (x: Partial<Parameters<typeof semnImprimanta>[0]>) =>
    semnImprimanta({ legatura: 'vie', lucrare: 'imprima', progres: 45.4, faraFilament: false, eroare: null, gataNevazut: false, ...x });
  assert.deepEqual(s({}), { fel: 'imprima', text: '45 %' });
  assert.deepEqual(s({ progres: null }), { fel: 'imprima', text: '…' });
  assert.deepEqual(s({ lucrare: 'pregatire' }), { fel: 'imprima', text: '…' });
  assert.deepEqual(s({ lucrare: 'pauza' }), { fel: 'pauza', text: 'Pauză' });
  assert.deepEqual(s({ lucrare: 'pauza', faraFilament: true }), { fel: 'rau', text: 'Fără filament' });
  assert.deepEqual(s({ eroare: 5000 }), { fel: 'rau', text: 'Eroare' });
  assert.equal(s({ lucrare: 'libera', eroare: 5000 }), null);
  assert.deepEqual(s({ legatura: 'pierduta' }), { fel: 'pierduta', text: 'Fără legătură' });
  assert.equal(s({ legatura: 'pierduta', lucrare: 'gata' }), null);
  assert.equal(s({ legatura: 'alta' }), null);
  assert.deepEqual(s({ lucrare: 'gata', gataNevazut: true }), { fel: 'gata', text: '✓ Gata' });
  assert.equal(s({ lucrare: 'gata' }), null);
  assert.equal(s({ lucrare: 'oprita' }), null);
});

test('3.6s: textele: titlul cu numele imprimantei; finalul cu fișierul, durata și metrii; pauza cu stratul și nota; eroarea cu cheia', () => {
  const durata = (x: number): string => `${Math.round(x / 60)} min`;
  const e = (x: Partial<Eveniment>): Eveniment => ({ fel: 'gata', fisier: F, strat: null, nota: null, cheie: null, durata: null, filament: null, ...x });
  const g = textEveniment(e({ durata: 1140, filament: 3712.4 }), 'K1C-8578', 'placute_PLA_18m.gcode', durata);
  assert.deepEqual(g, { titlu: 'K1C-8578: imprimarea s-a terminat', corp: 'placute_PLA_18m.gcode · 19 min · 3,7 m de filament' });
  assert.equal(textEveniment(e({ filament: 0 }), 'K', 'a.gcode', durata).corp, 'a.gcode');
  // O lucrare scurtă: centimetri de filament, cu două zecimale; sub 1 cm, deloc.
  assert.equal(textEveniment(e({ filament: 48 }), 'K', 'a.gcode', durata).corp, 'a.gcode · 0,05 m de filament');
  assert.equal(textEveniment(e({ filament: 9 }), 'K', 'a.gcode', durata).corp, 'a.gcode');
  const p = textEveniment(e({ fel: 'pauzaFisier', strat: 11, nota: 'filament negru' }), 'K1C-8578', 'x', durata);
  assert.deepEqual(p, { titlu: 'K1C-8578: pauza din fișier', corp: 'Înaintea stratului 11: filament negru. Apasă Reia în cvs2 când ești gata.' });
  assert.equal(textEveniment(e({ fel: 'pauzaFisier', strat: 9 }), 'K', 'x', durata).corp, 'Înaintea stratului 9. Apasă Reia în cvs2 când ești gata.');
  assert.equal(textEveniment(e({ fel: 'eroare', cheie: 12 }), 'K', 'x', durata).corp, 'Cheia 12: textul ei e pe ecranul imprimantei.');
  assert.equal(textEveniment(e({ fel: 'faraFilament' }), 'K', 'x', durata).corp, 'Pune filament nou, apoi apasă Reia.');
  assert.deepEqual(['gata', 'primulStrat', 'pauza', 'eroare', 'pierduta'].map((f) => cereAtentie(f as Eveniment['fel'])), [false, false, true, true, true]);
});

test('3.6s: titlul filei, din părțile ferestrelor: mașina întâi, apoi imprimanta; fiecare își scoate doar partea ei', async () => {
  const doc = { title: 'CNC Vector Studio' };
  (globalThis as { document?: unknown }).document = doc;
  try {
    const { parteTitlu } = await import('../../src/app/titluFila.ts');
    parteTitlu('imprimanta', '45 %');
    assert.equal(doc.title, '45 % · CNC Vector Studio');
    parteTitlu('masina', 'Pauză 12 %');
    assert.equal(doc.title, 'Pauză 12 % · 45 % · CNC Vector Studio');
    parteTitlu('imprimanta', null);
    assert.equal(doc.title, 'Pauză 12 % · CNC Vector Studio');
    parteTitlu('masina', '');
    assert.equal(doc.title, 'CNC Vector Studio');
  } finally {
    delete (globalThis as { document?: unknown }).document;
  }
});
