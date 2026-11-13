import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  axeDin, capabilitatiK1, citesteCadru, COMANDA_OPRESTE, COMANDA_PAUZA, COMANDA_REIA, comandaK1, comandaPornire, CREALITY_K1, DIR_GCODE,
  HOMING_MAX_MS, HOMING_MIN_MS, MAX_DUZA_K1, MAX_PAT_K1, PORT_CREALITY, PROCENTE_K1, RASPUNS_INIMA,
} from '../../src/machine/imprimanta/creality.ts';
import {
  aplica, comandaPermisa, esteLibera, IMPRIMANTA_NECUNOSCUTA, intregIn, piesaAnulabila, sePoateRegla, tintaDe, type ComandaImprimanta, type Imprimanta,
  type Pas, type StareLucrare,
} from '../../src/machine/imprimanta/driver.ts';
import { DRIVER_IMPLICIT, DRIVERE, driverDupaId, esteIdDriver } from '../../src/machine/imprimanta/drivere.ts';

/*
 * Driverele imprimantelor (ADR 0192), pe hârtie: contractul comun (starea, comenzile, capabilitățile, ce comenzi au rost) și
 * driverul K1: câmpurile noi ale stării, cum le trimite imprimanta owner-ului (transcrierea din 07.11), fiecare comandă din timpul
 * imprimării octet cu octet, cu numele din integrarea Home Assistant `ha_creality_ws`, și refuzurile ei.
 */

const cu = (s: Partial<Imprimanta>): Imprimanta => aplica(IMPRIMANTA_NECUNOSCUTA, s);
const texte = (p: readonly Pas[] | null): readonly string[] | null => (p === null ? null : p.map((x) => ('trimite' in x ? x.trimite : '…')));
const set = (params: unknown): string => JSON.stringify({ method: 'set', params });
const K1C_2025 = JSON.parse(readFileSync('test/fixtures/imprimanta/k1c-2025.json', 'utf8')) as { cadre: string[] };
const STARI: readonly StareLucrare[] = ['necunoscuta', 'libera', 'pregatire', 'imprima', 'pauza', 'oprita', 'gata', 'autotest'];

test('câmpurile noi ale stării, din transcrierea owner-ului (K1C 2025): lumina, ventilatoarele, viteza, debitul, maximele, axele', () => {
  const s = citesteCadru(K1C_2025.cadre[0] ?? '').stare;
  assert.deepEqual(
    [s.lumina, s.ventilatoare, s.viteza, s.debit, s.duzaMax, s.patMax, s.ocupata, s.axe],
    [true, { piesa: 0, carcasa: 0, lateral: 0 }, 100, 100, 320, 115, false, ''],
  );
  // Pe bucăți, ca le trimite imprimanta: fiecare câmp la locul lui; text cu altă formă, nimic.
  assert.deepEqual(citesteCadru('{"lightSw":0,"caseFanPct":"40","curFeedratePct":"120.000000","deviceState":7}').stare,
    { lumina: false, ventilatoare: { carcasa: 40 }, viteza: 120, ocupata: true });
  assert.deepEqual(citesteCadru('{"autohome":"X:1 Y:1 Z:0","maxNozzleTemp":300,"curFlowratePct":95}').stare, { axe: 'XY', duzaMax: 300, debit: 95 });
  assert.deepEqual(citesteCadru('{"lightSw":"da","modelFanPct":"007","autohome":"X:2 Y:0 Z:0","deviceState":{"x":1}}').stare, {});
  assert.equal(citesteCadru('{"deviceState":0}').stare.ocupata, false);
  // Cât imprimă, `deviceState` e 1 (transcrierea opririi, 07.11): nu e „ocupată” cu o comandă a ei.
  assert.equal(citesteCadru('{"deviceState":1}').stare.ocupata, false);
});

test('axele, din `autohome`: doar „X:n Y:n Z:n”, cu 0 sau 1', () => {
  assert.equal(axeDin('X:0 Y:0 Z:0'), '');
  assert.equal(axeDin('X:1 Y:1 Z:1'), 'XYZ');
  assert.equal(axeDin('X:1 Y:0 Z:0'), 'X');
  assert.equal(axeDin(' X:0 Y:1 Z:1 '), 'YZ');
  for (const t of ['', 'X:1', 'X:1 Y:1', 'X:1 Y:1 Z:2', 'Y:1 X:1 Z:1', 'X:11 Y:1 Z:1']) assert.equal(axeDin(t), null, t);
});

test('o bucată de stare cu un singur ventilator nu le șterge pe celelalte', () => {
  const i = cu({ ventilatoare: { piesa: 100, carcasa: 0, lateral: 70 }, viteza: 120 });
  const dupa = aplica(i, citesteCadru('{"auxiliaryFanPct":30}').stare);
  assert.deepEqual(dupa.ventilatoare, { piesa: 100, carcasa: 0, lateral: 30 });
  assert.equal(dupa.viteza, 120);
  // Fără ventilatoare în bucată, obiectul rămâne același (fereastra nu se redesenează degeaba).
  assert.equal(aplica(i, { viteza: 100 }).ventilatoare, i.ventilatoare);
});

test('capabilitățile K1: lumina și fiecare ventilator doar dacă le raportează; maximele imprimantei; fără ținta carcasei', () => {
  const tot = aplica(IMPRIMANTA_NECUNOSCUTA, citesteCadru(K1C_2025.cadre[0] ?? '').stare);
  assert.deepEqual(capabilitatiK1(tot), {
    lumina: true, ventilatoare: ['piesa', 'carcasa', 'lateral'], viteza: { min: 1, max: 200 }, debit: { min: 1, max: 200 },
    tinte: [{ incalzitor: 'duza', max: 320 }, { incalzitor: 'pat', max: 115 }], homing: true, fisiere: true, trimitere: true, anulare: true,
  });
  // O imprimantă care n-a spus încă nimic: fără lumină, ventilatoare, viteză și debit; maximele din integrarea Home Assistant.
  const nimic = capabilitatiK1(IMPRIMANTA_NECUNOSCUTA);
  assert.deepEqual([nimic.lumina, nimic.ventilatoare, nimic.viteza, nimic.debit], [false, [], null, null]);
  assert.deepEqual(nimic.tinte, [{ incalzitor: 'duza', max: MAX_DUZA_K1 }, { incalzitor: 'pat', max: MAX_PAT_K1 }]);
  assert.deepEqual([MAX_DUZA_K1, MAX_PAT_K1], [300, 100]);
  // O K1 SE, fără ventilatorul lateral; un maxim de 0 (stricat) nu e un maxim.
  assert.deepEqual(capabilitatiK1(cu({ ventilatoare: { piesa: 0, carcasa: 0 }, duzaMax: 0, patMax: 110 })).ventilatoare, ['piesa', 'carcasa']);
  assert.deepEqual(capabilitatiK1(cu({ duzaMax: 0, patMax: 110 })).tinte, [{ incalzitor: 'duza', max: 300 }, { incalzitor: 'pat', max: 110 }]);
  // `targetBoxTemp` (K1C îl trimite uneori) nu aduce o țintă a carcasei: nicio K1 n-are încălzitor acolo.
  assert.deepEqual(capabilitatiK1(aplica(tot, citesteCadru('{"targetBoxTemp":40,"maxBoxTemp":60}').stare)).tinte.map((x) => x.incalzitor), ['duza', 'pat']);
});

test('comenzile din timpul imprimării, octet cu octet (integrarea Home Assistant)', () => {
  const i = aplica(IMPRIMANTA_NECUNOSCUTA, citesteCadru(K1C_2025.cadre[0] ?? '').stare);
  const c = (x: ComandaImprimanta): readonly string[] | null => texte(comandaK1(x, i));
  assert.deepEqual(c({ fel: 'lumina', aprinsa: true }), ['{"method":"set","params":{"lightSw":1}}']);
  assert.deepEqual(c({ fel: 'lumina', aprinsa: false }), ['{"method":"set","params":{"lightSw":0}}']);
  // Ventilatoarele: canalul M106 (0 al piesei, 1 al carcasei, 2 cel lateral), S = 255 · p / 100, rotunjit.
  assert.deepEqual(c({ fel: 'ventilator', id: 'piesa', procent: 50 }), ['{"method":"set","params":{"gcodeCmd":"M106 P0 S128"}}']);
  assert.deepEqual(c({ fel: 'ventilator', id: 'carcasa', procent: 100 }), ['{"method":"set","params":{"gcodeCmd":"M106 P1 S255"}}']);
  assert.deepEqual(c({ fel: 'ventilator', id: 'lateral', procent: 0 }), ['{"method":"set","params":{"gcodeCmd":"M106 P2 S0"}}']);
  assert.deepEqual(c({ fel: 'ventilator', id: 'lateral', procent: 1 }), [set({ gcodeCmd: 'M106 P2 S3' })]);
  // Procentul se întoarce din S (cum îl raportează imprimanta) la fel, pentru fiecare întreg 0–100.
  for (let p = 0; p <= 100; p++) assert.equal(Math.round((Math.round((255 * p) / 100) / 255) * 100), p, String(p));
  assert.deepEqual(c({ fel: 'viteza', procent: 120 }), ['{"method":"set","params":{"setFeedratePct":120}}']);
  assert.deepEqual(c({ fel: 'debit', procent: 95 }), ['{"method":"set","params":{"setFlowratePct":95}}']);
  assert.deepEqual(c({ fel: 'viteza', procent: 1 }), [set({ setFeedratePct: 1 })]);
  assert.deepEqual(c({ fel: 'debit', procent: 200 }), [set({ setFlowratePct: 200 })]);
  assert.deepEqual(c({ fel: 'tinta', incalzitor: 'duza', grade: 220 }), ['{"method":"set","params":{"nozzleTempControl":220}}']);
  assert.deepEqual(c({ fel: 'tinta', incalzitor: 'pat', grade: 55 }), ['{"method":"set","params":{"bedTempControl":{"num":0,"val":55}}}']);
  assert.deepEqual(c({ fel: 'tinta', incalzitor: 'duza', grade: 320 }), [set({ nozzleTempControl: 320 })]);
  assert.deepEqual(c({ fel: 'tinta', incalzitor: 'pat', grade: 0 }), [set({ bedTempControl: { num: 0, val: 0 } })]);
  // Cele din 3.6g, aceleași texte.
  assert.deepEqual(c({ fel: 'pauza' }), [COMANDA_PAUZA]);
  assert.deepEqual(c({ fel: 'reia' }), [COMANDA_REIA]);
  assert.deepEqual(c({ fel: 'opreste' }), [COMANDA_OPRESTE]);
  assert.deepEqual(c({ fel: 'porneste', cale: `${DIR_GCODE}a.gcode` }), [comandaPornire(`${DIR_GCODE}a.gcode`)]);
});

test('refuzurile: un număr care nu e întreg sau iese din interval, un ventilator necunoscut, o țintă peste maximul imprimantei', () => {
  const i = cu({ duzaMax: 320, patMax: 115, viteza: 100, debit: 100 });
  const c = (x: ComandaImprimanta): readonly Pas[] | null => comandaK1(x, i);
  for (const p of [-1, 101, 50.5, Number.NaN, Number.POSITIVE_INFINITY]) assert.equal(c({ fel: 'ventilator', id: 'piesa', procent: p }), null, `ventilator ${p}`);
  assert.equal(c({ fel: 'ventilator', id: 'x' as 'piesa', procent: 50 }), null);
  assert.equal(c({ fel: 'ventilator', id: 'toString' as 'piesa', procent: 50 }), null);
  for (const p of [0, 201, 1.5, -5, Number.NaN]) {
    assert.equal(c({ fel: 'viteza', procent: p }), null, `viteza ${p}`);
    assert.equal(c({ fel: 'debit', procent: p }), null, `debit ${p}`);
  }
  for (const g of [-1, 321, 220.5, Number.NaN]) assert.equal(c({ fel: 'tinta', incalzitor: 'duza', grade: g }), null, `duza ${g}`);
  for (const g of [-1, 116, 0.5]) assert.equal(c({ fel: 'tinta', incalzitor: 'pat', grade: g }), null, `pat ${g}`);
  // Fără maximele imprimantei, cele din integrare: 300 și 100.
  assert.equal(comandaK1({ fel: 'tinta', incalzitor: 'duza', grade: 301 }, IMPRIMANTA_NECUNOSCUTA), null);
  assert.notEqual(comandaK1({ fel: 'tinta', incalzitor: 'duza', grade: 300 }, IMPRIMANTA_NECUNOSCUTA), null);
  assert.equal(comandaK1({ fel: 'tinta', incalzitor: 'pat', grade: 101 }, IMPRIMANTA_NECUNOSCUTA), null);
  assert.equal(c({ fel: 'tinta', incalzitor: 'carcasa' as 'duza', grade: 40 }), null);
  assert.equal(c({ fel: 'porneste', cale: '/etc/passwd' }), null);
  assert.equal(c({ fel: 'necunoscuta' } as unknown as ComandaImprimanta), null);
  // Niciun text din `gcodeCmd` nu e altceva decât M106 pe canalele 0–2 (ADR 0192 §B.8: fără consolă).
  for (const id of ['piesa', 'carcasa', 'lateral'] as const) {
    for (const p of [0, 1, 33, 99, 100]) assert.match(JSON.parse(texte(c({ fel: 'ventilator', id, procent: p }))?.[0] ?? '{}').params.gcodeCmd, /^M106 P[012] S\d{1,3}$/);
  }
});

test('homing-ul K1: X și Y, cel puțin o secundă, cât imprimanta e ocupată (cel mult 15 s), apoi Z', () => {
  const p = comandaK1({ fel: 'homing' }, IMPRIMANTA_NECUNOSCUTA);
  assert.ok(p !== null && p.length === 3);
  const [a, b, z] = p;
  assert.deepEqual(a, { trimite: '{"method":"set","params":{"autohome":"X Y"}}' });
  assert.deepEqual(z, { trimite: '{"method":"set","params":{"autohome":"Z"}}' });
  assert.ok(b !== undefined && 'gata' in b);
  assert.deepEqual([b.minMs, b.maxMs], [HOMING_MIN_MS, HOMING_MAX_MS]);
  assert.deepEqual([HOMING_MIN_MS, HOMING_MAX_MS], [1000, 15_000]);
  assert.equal(b.gata(cu({ ocupata: true })), false);
  assert.equal(b.gata(cu({ ocupata: false })), true);
  // O imprimantă care nu spune `deviceState`: nimic de așteptat după secunda întâi.
  assert.equal(b.gata(IMPRIMANTA_NECUNOSCUTA), true);
});

test('ce comenzi au rost: homing-ul doar cu imprimanta liberă; viteza și debitul doar cât imprimă sau stă în pauză; restul oricând', () => {
  assert.deepEqual(STARI.filter(esteLibera), ['libera', 'oprita', 'gata']);
  assert.deepEqual(STARI.filter(sePoateRegla), ['imprima', 'pauza']);
  assert.deepEqual(STARI.filter((s) => comandaPermisa({ fel: 'homing' }, s)), ['libera', 'oprita', 'gata']);
  assert.deepEqual(STARI.filter((s) => comandaPermisa({ fel: 'viteza', procent: 100 }, s)), ['imprima', 'pauza']);
  assert.deepEqual(STARI.filter((s) => comandaPermisa({ fel: 'debit', procent: 100 }, s)), ['imprima', 'pauza']);
  for (const c of [
    { fel: 'lumina', aprinsa: true }, { fel: 'ventilator', id: 'piesa', procent: 0 }, { fel: 'tinta', incalzitor: 'duza', grade: 0 },
    { fel: 'pauza' }, { fel: 'reia' }, { fel: 'opreste' }, { fel: 'porneste', cale: 'x' },
  ] as const) assert.deepEqual(STARI.filter((s) => comandaPermisa(c, s)), STARI, c.fel);
});

test('întregii dintr-un interval; ținta raportată a unui încălzitor', () => {
  assert.equal(intregIn(5, { min: 1, max: 200 }), 5);
  assert.equal(intregIn(1, PROCENTE_K1), 1);
  assert.equal(intregIn(200, PROCENTE_K1), 200);
  for (const v of [0, 201, 1.5, Number.NaN, Number.NEGATIVE_INFINITY]) assert.equal(intregIn(v, PROCENTE_K1), null, String(v));
  const i = cu({ duzaTinta: 220, patTinta: 55 });
  assert.deepEqual([tintaDe(i, 'duza'), tintaDe(i, 'pat'), tintaDe(IMPRIMANTA_NECUNOSCUTA, 'duza')], [220, 55, null]);
});

test('driverul K1 și lista driverelor: portul, citirile, `ok` la bătaia inimii, ce recunoaște', () => {
  assert.equal(CREALITY_K1.id, 'creality-k1');
  assert.equal(CREALITY_K1.port, PORT_CREALITY);
  assert.deepEqual(CREALITY_K1.citiri, ['{"method":"get","params":{"ReqPrinterPara":1}}', '{"method":"get","params":{"reqGcodeFile":1}}', '{"method":"get","params":{"reqHistory":1}}']);
  assert.equal(CREALITY_K1.cerereIstoric, '{"method":"get","params":{"reqHistory":1}}');
  assert.equal(CREALITY_K1.inchideDupaPornire, true);
  assert.deepEqual(CREALITY_K1.citeste('{"ModeCode":"heart_beat"}'), { recunoscut: true, stare: {}, fisiere: null, istoric: null, raspuns: RASPUNS_INIMA });
  assert.deepEqual(CREALITY_K1.citeste('{"lightSw":1}'), { recunoscut: true, stare: { lumina: true }, fisiere: null, istoric: null, raspuns: null });
  assert.deepEqual(CREALITY_K1.citeste('{"altceva":1}'), { recunoscut: false, stare: {}, fisiere: null, istoric: null, raspuns: null });
  assert.deepEqual(CREALITY_K1.citeste('ok'), { recunoscut: false, stare: {}, fisiere: null, istoric: null, raspuns: null });
  assert.deepEqual(Object.keys(DRIVERE), ['creality-k1']);
  assert.equal(DRIVER_IMPLICIT, 'creality-k1');
  assert.equal(driverDupaId('creality-k1'), CREALITY_K1);
  for (const x of ['moonraker', '', 'toString', '__proto__']) assert.equal(driverDupaId(x), null, x);
  assert.equal(esteIdDriver('creality-k1'), true);
  for (const x of [null, 5, 'CREALITY-K1', 'constructor']) assert.equal(esteIdDriver(x), false, String(x));
});

test('3.6r: anularea unei piese pe K1, octet cu octet (`EXCLUDE_OBJECT` în `gcodeCmd`); un nume nesigur se refuză', () => {
  const c = (nume: string): readonly string[] | null => texte(comandaK1({ fel: 'anuleazaPiesa', nume }, IMPRIMANTA_NECUNOSCUTA));
  assert.deepEqual(c('PLACA_ID_0_COPY_0'), ['{"method":"set","params":{"gcodeCmd":"EXCLUDE_OBJECT NAME=PLACA_ID_0_COPY_0"}}']);
  assert.deepEqual(c('PAT_1.STL_ID_0_COPY_0'), ['{"method":"set","params":{"gcodeCmd":"EXCLUDE_OBJECT NAME=PAT_1.STL_ID_0_COPY_0"}}']);
  // Nimic altceva nu ajunge în `gcodeCmd`: spații, un rând nou (un al doilea G-code), `;`, `=`, gol, prea lung, diacritice.
  for (const rau of ['A B', 'A\nG28', 'A;M104 S300', 'A=B', '', 'X'.repeat(101), 'PLĂCUȚĂ']) assert.equal(c(rau), null, JSON.stringify(rau));
  assert.equal(c('X'.repeat(100))?.length, 1);
  // Doar cât imprimă sau stă în pauză.
  assert.deepEqual(STARI.filter((s) => comandaPermisa({ fel: 'anuleazaPiesa', nume: 'A' }, s)), ['imprima', 'pauza']);
});

test('3.6r: ce piesă se poate anula: doar din lista imprimantei, încă neanulată, nu ultima rămasă, cu un nume sigur', () => {
  const p = (nume: string) => ({ nume, centru: null, contur: [] });
  const i = cu({ piese: [p('A_ID_0_COPY_0'), p('B_ID_1_COPY_0'), p('C D')], anulate: [] });
  assert.equal(piesaAnulabila(i, 'A_ID_0_COPY_0'), null);
  assert.equal(piesaAnulabila(i, 'a_id_0_copy_0'), null);
  assert.equal(piesaAnulabila(i, 'Z'), 'necunoscuta');
  assert.equal(piesaAnulabila(i, 'C D'), 'nume');
  assert.equal(piesaAnulabila(cu({ ...i, anulate: ['a_id_0_copy_0'] }), 'A_ID_0_COPY_0'), 'anulata');
  // Două anulate din trei: a treia e ultima (pentru ea, Oprește).
  assert.equal(piesaAnulabila(cu({ ...i, anulate: ['A_ID_0_COPY_0', 'C D'] }), 'B_ID_1_COPY_0'), 'ultima');
  assert.equal(piesaAnulabila(cu({ piese: [p('A')], anulate: null }), 'A'), 'ultima');
  assert.equal(piesaAnulabila(IMPRIMANTA_NECUNOSCUTA, 'A'), 'necunoscuta');
});
