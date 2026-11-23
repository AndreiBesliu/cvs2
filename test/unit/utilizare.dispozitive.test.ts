import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evenimentDin, type Eveniment } from '../../shared/utilizare.ts';
import { evenimenteImprimanta } from '../../src/app/utilizareImprimanta.ts';
import { inTrepte } from '../../src/app/utilizareLot.ts';
import { evenimenteMasina } from '../../src/app/utilizareMasina.ts';
import { CalculAnulat, exportInBazin, traseuInBazin } from '../../src/jobs/bazinCam.ts';
import { observaCalculele, type CalculObservat } from '../../src/jobs/observatorCalcul.ts';
import type { Clipa } from '../../src/machine/imprimanta/evenimente.ts';
import { fluxNou, type StareFlux } from '../../src/machine/flux.ts';
import type { ProgramIncarcat } from '../../src/machine/program.ts';
import type { Raport, StareMasina } from '../../src/machine/raspunsuri.ts';
import type { CodControler, StareSesiune } from '../../src/machine/sesiune.ts';
import { documentNou, type Document } from '../../src/model/document.ts';

/**
 * Utilizarea aplicației, felia A.8d (ADR 0262): mașina și imprimanta din stările lor la rând, calculele bazinului spuse
 * observatorului (durata, rezultatul, formele), treptele și lista albă din înregistrator.
 */

const program = (n: number): ProgramIncarcat => ({ octeti: new Uint8Array(), sha256: '0'.repeat(64), linii: Array.from({ length: n }, () => ({}) as ProgramIncarcat['linii'][number]), wcs: 'G54' });
const raport = (stare: StareMasina): Raport => ({ stare, sub: null, pozitie: null, wco: null, buffer: null, avans: null, turatie: null, override: null });
function sesiune(flux: Partial<StareFlux> = {}, alte: Partial<StareSesiune> = {}): StareSesiune {
  return {
    conexiune: 'conectat', transport: 'retea', flux: { ...fluxNou(), ...flux }, jurnal: [], eroare: null, wcsActiv: 'G54',
    procedura: null, familie: null, cod: null, alarma: null, repornire: false, ...alte,
  };
}
const deconectata = sesiune({}, { conexiune: 'deconectat', transport: null });
const legata = sesiune({ faza: 'pregatit', program: program(10), raport: raport('Idle') });
const ruleaza = sesiune({ faza: 'trimite', program: program(10), urm: 3, raport: raport('Run') });
const hold = sesiune({ faza: 'trimite', program: program(10), urm: 3, raport: raport('Hold') });
const terminat = sesiune({ faza: 'terminat', program: program(10), urm: 10, raport: raport('Idle') });
const cod = (nr: number, fel: CodControler['fel'], c: number): CodControler => ({ nr, fel, cod: c, la: { tip: 'controler' } });

/** Un șir de stări, cu evenimentele fiecărei treceri. */
function sir(...stari: StareSesiune[]): string[] {
  return stari.flatMap((b, i) => evenimenteMasina(i === 0 ? null : stari[i - 1] ?? null, b)).map((e) => [e.id, e.cod, e.cale].filter((x) => x !== undefined).join(':'));
}

test('mașina: legarea cu felul legăturii, lucrarea pornită, pusă pe pauză, reluată, terminată, apoi deconectarea', () => {
  assert.deepEqual(sir(deconectata, legata, ruleaza, hold, ruleaza, terminat, deconectata),
    ['legata:retea', 'pornita', 'pauza', 'reluata', 'terminata', 'deconectata']);
  // Prima stare văzută, deja legată (fereastra deschisă după legare): legarea, o dată.
  assert.deepEqual(sir(legata, legata), ['legata:retea']);
  // Aceeași stare de două ori nu spune nimic a doua oară.
  assert.deepEqual(evenimenteMasina(ruleaza, ruleaza), []);
});

test('mașina: oprirea cerută de program, anularea omului, întreruperea, codurile (eroare, alarmă, blocare), fiecare o dată', () => {
  const m6 = sesiune({ faza: 'bariera', program: program(10), urm: 4, raport: raport('Idle'), bariera: { linie: 3, m6: true } as StareFlux['bariera'] });
  assert.deepEqual(sir(legata, ruleaza, m6, ruleaza, legata), ['legata:retea', 'pornita', 'oprita', 'reluata', 'anulata']);
  // Suspendată (senderul așteaptă omul): o pauză; apoi reluată.
  const suspendat = sesiune({ faza: 'suspendat', program: program(10), urm: 5, raport: raport('Idle') });
  assert.deepEqual(sir(legata, ruleaza, suspendat, ruleaza), ['legata:retea', 'pornita', 'pauza', 'reluata']);
  const pierdut = sesiune({ faza: 'pierdut', program: program(10), urm: 4 }, { conexiune: 'deconectat', transport: null });
  assert.deepEqual(sir(legata, ruleaza, pierdut), ['legata:retea', 'pornita', 'intrerupta', 'deconectata']);
  const eroare = sesiune({ faza: 'pregatit', program: program(10), raport: raport('Idle') }, { cod: cod(1, 'eroare', 22) });
  const alarma = sesiune({ faza: 'pregatit', program: program(10), raport: raport('Alarm') }, { cod: cod(2, 'alarma', 9), alarma: cod(2, 'alarma', 9) });
  const blocare = sesiune({ faza: 'pregatit', program: program(10), raport: raport('Alarm') }, { cod: cod(3, 'blocare', 0), alarma: cod(3, 'blocare', 0) });
  assert.deepEqual(sir(legata, eroare, eroare, alarma, alarma, blocare), ['legata:retea', 'eroare:22', 'alarma:9', 'blocare']);
  // Din lucrare în alarmă: alarma are evenimentul ei (din cod), nu încă o „anulare”.
  assert.deepEqual(evenimenteMasina(ruleaza, { ...alarma, flux: ruleaza.flux }).map((e) => e.id), ['alarma']);
  // Mașina simulată se spune ca atare; fără transport știut, legarea fără fel.
  assert.deepEqual(evenimenteMasina(deconectata, { ...legata, transport: 'simulat' }), [{ id: 'legata', cale: 'simulat' }]);
  assert.deepEqual(evenimenteMasina(deconectata, { ...legata, transport: null }), [{ id: 'legata' }]);
});

const clipa = (x: Partial<Clipa> = {}): Clipa => ({
  legatura: 'vie', lucrare: 'imprima', fisier: '/usr/data/printer_data/gcodes/piesa.gcode', eroare: null, cheieEroare: null,
  faraFilament: false, reluareDupaPana: false, strat: 5, pauzaFisier: null, trecut: 600, filament: 2000, ...x,
});
const idsImprimanta = (a: Clipa | null, b: Clipa): string[] => evenimenteImprimanta(a, b).map((e) => (e.cod === undefined ? e.id : `${e.id}:${e.cod}`));

test('imprimanta: legarea, lucrarea nouă (nu și una găsită în curs), evenimentele ei, deconectarea; fără fișier', () => {
  const alta = clipa({ legatura: 'alta', lucrare: 'necunoscuta', fisier: null });
  const libera = clipa({ lucrare: 'libera', fisier: null, strat: null });
  assert.deepEqual(idsImprimanta(null, alta), []);
  assert.deepEqual(idsImprimanta(alta, libera), ['legata']);
  assert.deepEqual(idsImprimanta(libera, clipa()), ['pornita']);
  // Găsită imprimând la legare: legarea, fără „pornită” (a pornit-o altcineva, altundeva).
  assert.deepEqual(idsImprimanta(alta, clipa()), ['legata']);
  assert.deepEqual(idsImprimanta(clipa(), clipa({ lucrare: 'pauza' })), ['pauza']);
  // Pauza scrisă în fișier (cu nota ei, care nu pleacă).
  assert.deepEqual(evenimenteImprimanta(clipa(), clipa({ lucrare: 'pauza', pauzaFisier: { strat: 12, nota: 'pune piulițele' } })), [{ id: 'pauza-fisier' }]);
  assert.deepEqual(idsImprimanta(clipa(), clipa({ eroare: 2029, cheieEroare: 2029, lucrare: 'pauza' })), ['pauza', 'eroare:2029']);
  assert.deepEqual(idsImprimanta(clipa(), clipa({ lucrare: 'gata' })), ['gata']);
  // Legătura pierdută și revenită: pierderea e un eveniment, revenirea nu e o legare nouă.
  assert.deepEqual(idsImprimanta(clipa(), clipa({ legatura: 'pierduta' })), ['pierduta']);
  assert.deepEqual(idsImprimanta(clipa({ legatura: 'pierduta' }), clipa()), []);
  assert.deepEqual(idsImprimanta(libera, alta), ['deconectata']);
  for (const e of evenimenteImprimanta(clipa(), clipa({ lucrare: 'gata' }))) assert.deepEqual(Object.keys(e), ['id']);
});

test('înregistratorul: treptele duratei și ale mărimilor, codul din afara marginilor lăsat deoparte, apoi lista albă', () => {
  const calc: Eveniment = { fel: 'calcul', t: 5, id: 'export', ms: 2_345.6, rez: 'ok', forme: 1_234 };
  assert.deepEqual(inTrepte(calc), { fel: 'calcul', t: 5, id: 'export', ms: 3_000, rez: 'ok', forme: 10_000 });
  const imp: Eveniment = { fel: 'calcul', t: 5, id: 'import', ms: 50, rez: 'eroare', octeti: 2_000_000, format: 'pdf' };
  assert.deepEqual(inTrepte(imp), { ...imp, ms: 100, octeti: 10_000_000 });
  assert.deepEqual(inTrepte({ fel: 'masina', t: 1, id: 'alarma', cod: 1e9 }), { fel: 'masina', t: 1, id: 'alarma' });
  assert.deepEqual(inTrepte({ fel: 'imprimanta', t: 1, id: 'eroare', cod: -3 }), { fel: 'imprimanta', t: 1, id: 'eroare' });
  assert.deepEqual(inTrepte({ fel: 'masina', t: 1, id: 'alarma', cod: 9 }), { fel: 'masina', t: 1, id: 'alarma', cod: 9 });
  for (const e of [inTrepte(calc), inTrepte(imp)]) assert.deepEqual(evenimentDin(e, Number.MAX_SAFE_INTEGER), e);
});

test('bazinul spune fiecare calcul: felul, durata, rezultatul (și anularea) și formele documentului', async () => {
  const spuse: CalculObservat[] = [];
  observaCalculele((c) => { spuse.push(c); });
  try {
    const doc = documentNou({ latime: 200, inaltime: 100, grosime: 18 });
    await traseuInBazin(doc);
    const ac = new AbortController();
    const anulat = traseuInBazin(doc, { semnal: ac.signal });
    ac.abort();
    await assert.rejects(anulat, CalculAnulat);
    await assert.rejects(exportInBazin(doc, undefined as never));
    // Un document stricat: numărarea nu-l oprește înaintea calculului (care îl refuză el); formele lipsesc.
    await assert.rejects(traseuInBazin({ ...doc, foi: null } as unknown as Document));
    assert.deepEqual(spuse.map(({ fel, rez, forme }) => [fel, rez, forme]),
      [['traseu', 'ok', 0], ['traseu', 'anulat', 0], ['export', 'eroare', 0], ['traseu', 'eroare', undefined]]);
    for (const c of spuse) assert.ok(c.ms >= 0 && Number.isFinite(c.ms));
    // Un ascultător care aruncă nu strică un calcul.
    observaCalculele(() => { throw new Error('ascultătorul'); });
    await traseuInBazin(doc);
  } finally {
    observaCalculele(null);
  }
});
