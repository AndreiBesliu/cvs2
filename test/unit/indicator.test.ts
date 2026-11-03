/**
 * Indicatorul lucrării din meniul global și lucrarea începută (ADR 0132 §5, §6), pe stări de sesiune scrise de mână: fiecare
 * fază, Hold și ușa, alarma (cu și fără număr), lucrarea întreruptă cu și fără legătură, procentul rotunjit în jos.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fluxNou, type Faza, type StareFlux } from '../../src/machine/flux.ts';
import { indicatorLucrare, lucrareInceputa } from '../../src/machine/indicator.ts';
import type { ProgramIncarcat } from '../../src/machine/program.ts';
import type { Raport, StareMasina } from '../../src/machine/raspunsuri.ts';
import type { CodControler, StareSesiune } from '../../src/machine/sesiune.ts';

/** Un program cu `n` linii (indicatorul citește doar câte sunt). */
const program = (n: number): ProgramIncarcat => ({ octeti: new Uint8Array(), sha256: '0'.repeat(64), linii: Array.from({ length: n }, () => ({}) as ProgramIncarcat['linii'][number]), wcs: 'G54' });
const raport = (stare: StareMasina): Raport => ({ stare, sub: null, pozitie: null, wco: null, buffer: null, avans: null, turatie: null, override: null });

function sesiune(flux: Partial<StareFlux>, alte: Partial<StareSesiune> = {}): StareSesiune {
  return {
    conexiune: 'conectat', transport: 'simulat', flux: { ...fluxNou(), ...flux }, jurnal: [], eroare: null, wcsActiv: 'G54',
    procedura: null, familie: null, cod: null, alarma: null, repornire: false, ...alte,
  };
}
const alarma = (cod: number, fel: CodControler['fel'] = 'alarma'): CodControler => ({ nr: 1, fel, cod, la: { tip: 'controler' } });
const lucrare = (faza: Faza, stare: StareMasina = 'Run', urm = 3120): Partial<StareFlux> => ({ faza, program: program(7400), urm, raport: raport(stare) });

test('fără legătură și fără lucrare întreruptă, indicatorul nu există; conectată, spune doar atât', () => {
  assert.equal(indicatorLucrare(sesiune({}, { conexiune: 'deconectat', transport: null })), null);
  assert.equal(indicatorLucrare(sesiune({ faza: 'pregatit', program: program(10) }, { conexiune: 'deconectat' })), null);
  for (const faza of ['liber', 'pregatit'] as const) {
    assert.deepEqual(indicatorLucrare(sesiune({ faza, program: faza === 'liber' ? null : program(10), raport: raport('Idle') })),
      { fel: 'conectata', culoare: 'neutru', procent: null, linie: null, cod: null, buton: null });
  }
});

test('rulează: verde, cu procentul liniilor plecate și Pauză; în Hold, portocaliu, cu Reia; la ușă, fără buton', () => {
  for (const faza of ['trimite', 'golire', 'terminare'] as const) {
    assert.deepEqual(indicatorLucrare(sesiune(lucrare(faza))), { fel: 'ruleaza', culoare: 'verde', procent: 42, linie: null, cod: null, buton: 'pauza' }, faza);
    assert.deepEqual(indicatorLucrare(sesiune(lucrare(faza, 'Hold'))), { fel: 'pauza', culoare: 'portocaliu', procent: 42, linie: null, cod: null, buton: 'reia' }, faza);
  }
  assert.deepEqual(indicatorLucrare(sesiune(lucrare('trimite', 'Door'))), { fel: 'pauza', culoare: 'portocaliu', procent: 42, linie: null, cod: null, buton: null });
  // Fără raport încă (chiar după Pornește), programul pleacă: rulează.
  assert.equal(indicatorLucrare(sesiune({ ...lucrare('trimite'), raport: null }))?.fel, 'ruleaza');
});

test('procentul: rotunjit în jos, cel mult 99 până la „gata” (mașina încă taie ce a primit), null fără program', () => {
  const p = (urm: number, n: number, faza: Faza = 'trimite'): number | null | undefined =>
    indicatorLucrare(sesiune({ faza, program: program(n), urm, raport: raport('Run') }))?.procent;
  assert.equal(p(1, 3), 33);
  assert.equal(p(2, 3), 66);
  assert.equal(p(7399, 7400), 99);
  assert.equal(p(7400, 7400), 99);
  assert.equal(p(9000, 7400), 99);
  assert.equal(p(0, 7400), 0);
  // Tot programul a plecat, mașina termină ultimele mișcări: tot 99.
  assert.equal(p(4, 4, 'terminare'), 99);
  assert.equal(indicatorLucrare(sesiune({ faza: 'trimite', program: null, raport: raport('Run') }))?.procent, null);
  assert.equal(indicatorLucrare(sesiune({ faza: 'terminat', program: program(5), urm: 5, raport: raport('Idle') }))?.procent, 100);
});

test('opririle programului: la M6 și la M0 / M1 cu linia (de la 1), pe o eroare, portocaliu, fără buton', () => {
  const bariera = (m6: boolean): Partial<StareFlux> => ({ ...lucrare('bariera', 'Idle', 2210), bariera: { linie: 2209, ultima: 2208, m6, ax: 'oprit' } });
  assert.deepEqual(indicatorLucrare(sesiune(bariera(true))), { fel: 'oprita-m6', culoare: 'portocaliu', procent: 29, linie: 2210, cod: null, buton: null });
  assert.deepEqual(indicatorLucrare(sesiune(bariera(false))), { fel: 'oprita', culoare: 'portocaliu', procent: 29, linie: 2210, cod: null, buton: null });
  assert.deepEqual(indicatorLucrare(sesiune(lucrare('suspendat', 'Hold'))), { fel: 'suspendata', culoare: 'portocaliu', procent: 42, linie: null, cod: null, buton: null });
});

test('alarma întâi, cu numărul ei când îl are; întreruptă, roșu, și fără legătură; gata la capăt', () => {
  assert.deepEqual(indicatorLucrare(sesiune(lucrare('pierdut', 'Alarm'), { alarma: alarma(2) })),
    { fel: 'alarma', culoare: 'rosu', procent: 42, linie: null, cod: 2, buton: null });
  // Raportul Alarm fără alarma sesiunii (prima clipă), sau o blocare fără cod: alarmă, fără număr.
  assert.equal(indicatorLucrare(sesiune(lucrare('trimite', 'Alarm')))?.fel, 'alarma');
  assert.equal(indicatorLucrare(sesiune(lucrare('trimite', 'Alarm')))?.cod, null);
  assert.equal(indicatorLucrare(sesiune(lucrare('pregatit', 'Alarm'), { alarma: alarma(0, 'blocare') }))?.cod, null);
  // O alarmă înaintea oricărei lucrări e tot o alarmă: mașina e blocată.
  assert.equal(indicatorLucrare(sesiune({ faza: 'liber', raport: raport('Idle') }, { alarma: alarma(1) }))?.fel, 'alarma');
  assert.deepEqual(indicatorLucrare(sesiune(lucrare('pierdut', 'Idle'))), { fel: 'intrerupta', culoare: 'rosu', procent: 42, linie: null, cod: null, buton: null });
  // Cablul scos în mijlocul lucrării: indicatorul rămâne, roșu, ca omul care desenează să afle.
  assert.equal(indicatorLucrare(sesiune(lucrare('pierdut', 'Run'), { conexiune: 'deconectat', transport: null, alarma: alarma(2) }))?.fel, 'intrerupta');
  assert.deepEqual(indicatorLucrare(sesiune({ faza: 'terminat', program: program(7400), urm: 7400, raport: raport('Idle') })),
    { fel: 'gata', culoare: 'neutru', procent: 100, linie: null, cod: null, buton: null });
});

test('lucrarea începută: exact fazele cu punct de reluare (pornită, neterminată), nu liber, pregătit, gata sau întreruptă', () => {
  const toate: readonly Faza[] = ['liber', 'pregatit', 'trimite', 'suspendat', 'golire', 'bariera', 'terminare', 'terminat', 'pierdut'];
  assert.deepEqual(toate.filter(lucrareInceputa), ['trimite', 'suspendat', 'golire', 'bariera', 'terminare']);
});
