import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  aplica, CERERE_FISIERE, CERERE_STARE, CITIRI, citesteCadru, COMANDA_OPRESTE, COMANDA_PAUZA, COMANDA_REIA, comandaPornire, DIR_GCODE,
  esteCreality, firmwareDin, IMPRIMANTA_NECUNOSCUTA, numar, numeDin, numeSigur, sePoateOpri, sePoatePauza, sePoatePorni, sePoateRelua,
  stareLucrare, type Imprimanta, type StareLucrare,
} from '../../src/machine/imprimanta/creality.ts';

/*
 * Protocolul Creality al familiei K1 (ADR 0190 §A), pe hârtie: cadrele, cum le scrie imprimanta (numerele ca text, starea pe
 * bucăți, bătaia inimii), și comenzile, octet cu octet, cum le trimit OrcaSlicer (gazda „CrealityPrint”) și integrarea Home
 * Assistant `ha_creality_ws`.
 */

test('numerele imprimantei: număr JSON sau text ca „220.000000”; nu identificatori care doar arată a număr', () => {
  assert.equal(numar('220.000000'), 220);
  assert.equal(numar('49.500000'), 49.5);
  assert.equal(numar('-2.5'), -2.5);
  assert.equal(numar('0'), 0);
  assert.equal(numar(31.03), 31.03);
  assert.equal(numar('007'), null);
  assert.equal(numar(' 42'), null);
  assert.equal(numar(''), null);
  assert.equal(numar(Number.NaN), null);
  assert.equal(numar(Number.POSITIVE_INFINITY), null);
  assert.equal(numar(null), null);
});

test('firmware-ul, din `modelVersion`: „printer sw ver”; altfel nimic', () => {
  assert.equal(firmwareDin('printer hw ver:CR4CU220812S12;printer sw ver:1.3.3.5;DWIN hw ver:;DWIN sw ver:'), '1.3.3.5');
  assert.equal(firmwareDin(' Printer SW Ver : V1.1.0.27 ;'), 'V1.1.0.27');
  assert.equal(firmwareDin('printer sw ver:;'), null);
  assert.equal(firmwareDin('nimic de citit'), null);
});

test('bătaia inimii: cere `ok`; nu aduce stare', () => {
  const c = citesteCadru('{"ModeCode":"heart_beat","msg":"2026-11-07 10:48:00"}');
  assert.deepEqual(c, { json: true, inima: true, stare: {}, fisiere: null });
  assert.ok(esteCreality(c));
});

test('starea pe bucăți, cu numerele ca text: fiecare câmp știut, la locul lui', () => {
  const c = citesteCadru(JSON.stringify({
    nozzleTemp: '220.000000', targetNozzleTemp: '220.000000', bedTemp0: '49.500000', targetBedTemp0: '50.000000', boxTemp: '32.000000',
    state: 1, printProgress: 26, printJobTime: 302, printLeftTime: 842, layer: 12, TotalLayer: 46, withSelfTest: 0,
    printFileName: '/usr/data/printer_data/gcodes/output_11031835.gcode', model: 'K1C', hostname: 'K1C-8578',
    modelVersion: 'printer hw ver:;printer sw ver:1.3.3.5;', err: { errcode: 0, key: 0 }, curPosition: 'X:1.00 Y:2.00 Z:0.20', lightSw: 1,
  }));
  assert.equal(c.inima, false);
  assert.deepEqual(c.stare, {
    cod: 1, progres: 26, trecut: 302, ramas: 842, strat: 12, straturi: 46, duza: 220, duzaTinta: 220, pat: 49.5, patTinta: 50,
    carcasa: 32, autotest: 0, model: 'K1C', nume: 'K1C-8578', fisier: '/usr/data/printer_data/gcodes/output_11031835.gcode',
    firmware: '1.3.3.5', eroare: null, cheieEroare: null,
  });
  assert.ok(esteCreality(c));
});

test('un cadru cu un singur câmp schimbă doar câmpul lui; restul rămâne', () => {
  const i: Imprimanta = { ...IMPRIMANTA_NECUNOSCUTA, duza: 219, pat: 50, cod: 1, fisier: 'a.gcode', progres: 25 };
  const dupa = aplica(i, citesteCadru('{"printProgress":"26"}').stare);
  assert.deepEqual(dupa, { ...i, progres: 26 });
  // Un câmp cu altă formă (un obiect, un text care nu e număr) nu schimbă nimic.
  assert.deepEqual(citesteCadru('{"nozzleTemp":{"x":1},"state":"007"}').stare, {});
});

test('eroarea: `err.errcode` (0 = fără eroare), cu `key`; și ca număr gol', () => {
  assert.deepEqual(citesteCadru('{"err":{"errcode":5000,"key":12}}').stare, { eroare: 5000, cheieEroare: 12 });
  assert.deepEqual(citesteCadru('{"err":{"errcode":"2585"}}').stare, { eroare: 2585, cheieEroare: null });
  assert.deepEqual(citesteCadru('{"err":{"errcode":0,"key":5}}').stare, { eroare: null, cheieEroare: null });
  assert.deepEqual(citesteCadru('{"err":7}').stare, { eroare: 7, cheieEroare: null });
});

test('textul care nu e un obiect JSON (`ok`, o listă, un text rupt) nu aduce nimic', () => {
  for (const t of ['ok', '[1,2]', '{"state":', '"text"', 'null', '']) {
    assert.deepEqual(citesteCadru(t), { json: false, inima: false, stare: {}, fisiere: null }, t);
    assert.equal(esteCreality(citesteCadru(t)), false, t);
  }
  // Un obiect fără niciun câmp știut nu e un semn că răspunde o imprimantă.
  assert.equal(esteCreality(citesteCadru('{"altceva":1}')), false);
});

test('`dProgress` e doar rezerva lui `printProgress`', () => {
  assert.deepEqual(citesteCadru('{"dProgress":"41"}').stare, { progres: 41 });
  assert.deepEqual(citesteCadru('{"printProgress":40,"dProgress":"41"}').stare, { progres: 40 });
});

test('`printFileName` gol: nicio lucrare', () => {
  assert.deepEqual(citesteCadru('{"printFileName":""}').stare, { fisier: null });
});

test('lista fișierelor (`retGcodeFileInfo2`): numele, calea sigură, timpul și materialul; restul se sare', () => {
  const c = citesteCadru(JSON.stringify({
    retGcodeFileInfo2: [
      { name: 'output_11031835.gcode', path: `${DIR_GCODE}output_11031835.gcode`, timeCost: '1140', material: 'PLA', software: 'Creality Print' },
      { path: `${DIR_GCODE}sub/caramida.gcode` },
      { name: 'x.gcode', path: '/etc/passwd' },
      { name: 'y.gcode', path: `${DIR_GCODE}../y.gcode` },
      { name: '../z' },
      { name: '' },
      5, null, 'text',
    ],
  }));
  assert.deepEqual(c.fisiere, [
    { nume: 'output_11031835.gcode', cale: `${DIR_GCODE}output_11031835.gcode`, timp: 1140, material: 'PLA', marime: null },
    { nume: 'caramida.gcode', cale: `${DIR_GCODE}sub/caramida.gcode`, timp: null, material: null, marime: null },
    // O cale în afara directorului G-code nu se folosește: pornirea merge pe numele din director.
    { nume: 'x.gcode', cale: `${DIR_GCODE}x.gcode`, timp: null, material: null, marime: null },
    { nume: 'y.gcode', cale: `${DIR_GCODE}y.gcode`, timp: null, material: null, marime: null },
  ]);
  assert.equal(citesteCadru('{"retGcodeFileInfo2":"nu e listă"}').fisiere, null);
});

test('numele și căile: fără `/`, `\\`, `..` și caractere de control', () => {
  assert.equal(numeSigur('a.gcode'), 'a.gcode');
  for (const n of ['', '.', '..', 'a/b', 'a\\b', 'a\nb', 'a\u0000', 'x'.repeat(256)]) assert.equal(numeSigur(n), null, JSON.stringify(n));
  assert.equal(numeDin('/usr/data/printer_data/gcodes/a.gcode'), 'a.gcode');
  assert.equal(numeDin('a.gcode'), 'a.gcode');
});

const cu = (s: Partial<Imprimanta>): Imprimanta => ({ ...IMPRIMANTA_NECUNOSCUTA, ...s });

test('starea lucrării, ca integrarea Home Assistant (capturile K1C)', () => {
  const f = `${DIR_GCODE}a.gcode`;
  const cazuri: readonly (readonly [Partial<Imprimanta>, StareLucrare])[] = [
    [{}, 'necunoscuta'],
    [{ cod: 0 }, 'libera'],
    [{ cod: 1, fisier: f, progres: 26, ramas: 842 }, 'imprima'],
    [{ cod: 5, fisier: f, progres: 40 }, 'pauza'],
    [{ cod: 4, fisier: f, progres: 40 }, 'oprita'],
    [{ cod: 9, fisier: f, progres: 0 }, 'pregatire'],
    [{ cod: 7, fisier: f, progres: 41 }, 'pregatire'],
    [{ cod: 0, fisier: f, progres: 0 }, 'pregatire'],
    // K1C arată 100 % cu timp rămas (86 s în captură), apoi 99, abia apoi încheie.
    [{ cod: 1, fisier: f, progres: 100, ramas: 86 }, 'imprima'],
    [{ cod: 2, fisier: f, progres: 100, ramas: 0 }, 'gata'],
    // Numele ultimului fișier și 100 % rămân după final.
    [{ cod: 0, fisier: f, progres: 100, ramas: 0 }, 'gata'],
    [{ cod: 1, fisier: f, progres: 3, autotest: 40 }, 'autotest'],
    [{ cod: 1, fisier: f, progres: 3, autotest: 100 }, 'imprima'],
    [{ cod: 1, progres: 3 }, 'libera'],
  ];
  for (const [s, asteptat] of cazuri) assert.equal(stareLucrare(cu(s)), asteptat, JSON.stringify(s));
});

test('ce comenzi au rost: pauza doar cât imprimă, reluarea doar din pauză, pornirea doar pe o imprimantă liberă', () => {
  const toate: readonly StareLucrare[] = ['necunoscuta', 'libera', 'pregatire', 'imprima', 'pauza', 'oprita', 'gata', 'autotest'];
  assert.deepEqual(toate.filter(sePoatePauza), ['imprima']);
  assert.deepEqual(toate.filter(sePoateRelua), ['pauza']);
  assert.deepEqual(toate.filter(sePoateOpri), ['pregatire', 'imprima', 'pauza']);
  assert.deepEqual(toate.filter(sePoatePorni), ['libera', 'oprita', 'gata']);
});

test('cererile și comenzile, octet cu octet (OrcaSlicer, `ha_creality_ws`)', () => {
  assert.equal(CERERE_STARE, '{"method":"get","params":{"ReqPrinterPara":1}}');
  assert.equal(CERERE_FISIERE, '{"method":"get","params":{"reqGcodeFile":1}}');
  assert.equal(COMANDA_PAUZA, '{"method":"set","params":{"pause":1}}');
  assert.equal(COMANDA_REIA, '{"method":"set","params":{"pause":0}}');
  assert.equal(COMANDA_OPRESTE, '{"method":"set","params":{"stop":1}}');
  assert.equal(comandaPornire(`${DIR_GCODE}output_11031835.gcode`),
    '{"method":"set","params":{"opGcodeFile":"printprt:/usr/data/printer_data/gcodes/output_11031835.gcode"}}');
  // Și o cale lungă din afara directorului (otrava C07 a scăpat doar cu căi mai scurte decât directorul).
  for (const rea of ['/etc/passwd', '/usr/data/printer_data/config/printer.cfg', `${DIR_GCODE}../x.gcode`, `${DIR_GCODE}`, `${DIR_GCODE}a\nb.gcode`, 'a.gcode']) {
    assert.equal(comandaPornire(rea), null, rea);
  }
  // Doar citirile pleacă fără clic; nicio comandă `set` nu e printre ele.
  assert.deepEqual([...CITIRI], [CERERE_STARE, CERERE_FISIERE]);
  for (const c of CITIRI) assert.match(c, /"method":"get"/);
});

/** Transcrierea owner-ului (07.11, K1C 2025, firmware V1.0.0.26), anonimizată: `test/fixtures/imprimanta/k1c-2025.json`. */
const K1C_2025 = JSON.parse(readFileSync('test/fixtures/imprimanta/k1c-2025.json', 'utf8')) as {
  cadre: string[]; fisiere: { nume: string; marime: number }[];
};

test('K1C 2025 (transcrierea owner-ului): firmware-ul din DWIN sw ver, lista ca text cu mărimile, istoricul și filmele sărite', () => {
  const [stare, lista, istoric, video, ...delte] = K1C_2025.cadre.map(citesteCadru);
  assert.ok(stare && lista && istoric && video);
  assert.ok(esteCreality(stare));
  const i = aplica(IMPRIMANTA_NECUNOSCUTA, stare.stare);
  assert.deepEqual(
    [i.model, i.nume, i.firmware, i.cod, i.fisier, i.duza, i.duzaTinta, i.pat, i.patTinta, i.carcasa, i.eroare, i.autotest],
    ['K1C', 'K1C-8578', 'V1.0.0.26.20251024S', 0, null, 26, 0, 25, 0, 25, null, 0],
  );
  assert.equal(stareLucrare(i), 'libera');
  // Lista: 11 fișiere, cu numele întregi (și cele cu spații), calea din director, mărimea; fără timp și material.
  assert.deepEqual(lista.fisiere, K1C_2025.fisiere.map(({ nume, marime }) => ({ nume, cale: `${DIR_GCODE}${nume}`, timp: null, material: null, marime })));
  assert.deepEqual(lista.stare, {});
  // Istoricul imprimărilor și filmele: cadre JSON fără nimic din ce citește fereastra.
  for (const c of [istoric, video]) assert.deepEqual([c.json, c.inima, c.stare, c.fisiere], [true, false, {}, null]);
  // Fără bătăi ale inimii: din 3 în 3 s, doar bucăți de stare (`maxBedTemp`, `boxTemp`).
  assert.deepEqual(delte.map((c) => [c.inima, c.stare]), [[false, {}], [false, { carcasa: 24 }]]);
  // O listă goală e o listă (nu „încă nimic”); un text stricat nu dă fișiere.
  assert.deepEqual(citesteCadru('{"retGcodeFileInfo":{"totalNum":0,"fileInfo":""}}').fisiere, []);
  assert.deepEqual(citesteCadru('{"retGcodeFileInfo":{"totalNum":1,"fileInfo":"/etc:passwd:1:0:0:0:/x.png;scurt:a:b;"}}').fisiere, []);
  assert.equal(citesteCadru('{"retGcodeFileInfo":"nu e obiect"}').fisiere, null);
  // Un nume cu „:” rămâne întreg (câmpurile se citesc din dreapta).
  assert.deepEqual(citesteCadru(`{"retGcodeFileInfo":{"fileInfo":"${DIR_GCODE.slice(0, -1)}:a:b.gcode:12:0.2:1:3:/t/a.png;"}}`).fisiere,
    [{ nume: 'a:b.gcode', cale: `${DIR_GCODE}a:b.gcode`, timp: null, material: null, marime: 12 }]);
  assert.equal(firmwareDin('printer hw ver:;printer sw ver:;DWIN hw ver:x;DWIN sw ver:V1.0.0.26.20251024S;'), 'V1.0.0.26.20251024S');
});
