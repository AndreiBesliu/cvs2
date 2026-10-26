/**
 * Emulatorul GRBL 1.1h (ADR 0079), pe hârtie, din sursele GRBL 1.1 (citite pentru cifre, nu copiate): bufferul serial de 128 de
 * octeți (un octet în plus se pierde, tăcut), octeții de timp real care îl ocolesc, linia de cel mult 79 de caractere păstrate
 * (spațiile și comentariile nu se păstrează, literele mici urcă în mari), planificatorul de 15 blocuri (ok după planificare),
 * comenzile care așteaptă golirea lui, codurile de eroare, alarma, repornirea, hold-ul, override-urile și răspunsurile `$`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EmulatorGrbl } from '../../src/machine/emulator.ts';

const pas = (e: EmulatorGrbl, ms = 0): string[] => { e.timp(ms); return e.citeste(); };

test('bufferul de 128 de octeți: octeții în plus se pierd, numărați; ocuparea se vede în Bf (cu $10=3)', () => {
  const e = new EmulatorGrbl();
  e.scrie('$10=3\n');
  assert.deepEqual(pas(e), ['ok']);
  e.scrie('G'.repeat(130));
  assert.equal(e.rxOcupat, 128);
  assert.equal(e.contoare.pierduti, 2);
  assert.equal(e.contoare.primiti, 6 + 130);
  e.scrie('?');
  assert.match(pas(e)[0] ?? '', /\|Bf:15,0\|/);
});

test('timpul real ocolește bufferul: ?, !, ~, Ctrl-X și override-urile nu ocupă loc, nici în mijlocul unei linii', () => {
  const e = new EmulatorGrbl();
  e.scrie('G1X1');
  e.scrie('?');
  assert.equal(e.rxOcupat, 4);
  assert.match(pas(e)[0] ?? '', /^<Idle\|MPos:0\.000,0\.000,0\.000\|FS:0,0\|WCO:0\.000,0\.000,0\.000>$/);
  e.scrie(Uint8Array.of(0x91, 0x9a));
  assert.equal(e.rxOcupat, 4);
  assert.deepEqual(e.override, { avans: 110, rapid: 100, ax: 110 });
  assert.equal(e.contoare.timpReal, 3);
});

test('octeții peste 0x7F fără înțeles se aruncă; cei care sunt override-uri lucrează și într-un comentariu („ț” = C8 9B: axul −10 %)', () => {
  const e = new EmulatorGrbl();
  e.scrie(new TextEncoder().encode('(gaură)\n'));
  assert.deepEqual(pas(e), ['ok']);
  assert.equal(e.contoare.aruncati, 2, 'C4 83 ale lui „ă”: nici bufferul, nici o comandă');
  e.scrie(new TextEncoder().encode('(țintă)\n'));
  assert.deepEqual(pas(e), ['ok']);
  assert.equal(e.override.ax, 90, '9B e override-ul axului −10 %');
});

test('linia: cel mult 79 de caractere păstrate (80 → error:11); spațiile și comentariile nu se numără; literele mici urcă', () => {
  const e = new EmulatorGrbl();
  e.scrie(`G1X${'1'.repeat(76)}\n`);
  e.scrie(`G1X${'1'.repeat(77)}\n`);
  assert.deepEqual(pas(e).map((x) => x.startsWith('error') ? x : 'ok'), ['error:22', 'error:11']);
  e.scrie(new TextEncoder().encode(`G0 X1 (${'comentariu lung '.repeat(4)}) Y2 ; ${'și mai lung '.repeat(3)}\n`));
  assert.deepEqual(pas(e), ['ok']);
  e.scrie('g1x2f100\n');
  assert.deepEqual(pas(e), ['ok']);
});

test('sfârșitul liniei: \\n sau \\r; „\\r\\n” sunt două linii, deci două ok (senderul trimite doar \\n); linia goală dă ok', () => {
  const e = new EmulatorGrbl();
  e.scrie('G90\r\n');
  assert.deepEqual(pas(e), ['ok', 'ok']);
  e.scrie('\n');
  assert.deepEqual(pas(e), ['ok']);
  // Doar \r închide linia pe loc, fără să treacă timpul.
  e.scrie('G91\r');
  assert.deepEqual(e.citeste(), ['ok']);
});

test('planificatorul: 15 blocuri; ok-ul vine la planificare; a 16-a mișcare așteaptă în buffer până se termină una', () => {
  const e = new EmulatorGrbl();
  e.scrie('G1F300\n');
  const linii = Array.from({ length: 16 }, (_, k) => `G1X${k + 1}\n`);
  for (const l of linii) e.scrie(l);
  // F300 = 5 mm/s: fiecare mișcare de 1 mm ține 200 ms.
  assert.equal(pas(e).length, 1 + 15);
  assert.equal(e.planificatorOcupat, 15);
  assert.equal(e.rxOcupat, linii[15]!.length, 'a 16-a stă în buffer');
  assert.equal(e.stare, 'Run');
  assert.deepEqual(pas(e, 199), []);
  assert.deepEqual(pas(e, 1), ['ok']);
  assert.equal(e.pozitie.x, 1);
  e.timp(3000);
  assert.equal(e.stare, 'Idle');
  assert.equal(e.pozitie.x, 16);
  assert.equal(e.contoare.varfPlanificator, 15);
});

test('G4 și M3 așteaptă golirea planificatorului; ok-ul lui G4 vine după pauză', () => {
  const e = new EmulatorGrbl();
  e.scrie('G1X10F300\nG4P0.5\nM3S1000\n');
  assert.deepEqual(pas(e), ['ok']);
  assert.deepEqual(pas(e, 2000), [], 'mișcarea (2 s) s-a terminat abia acum; pauza începe');
  assert.deepEqual(pas(e, 499), []);
  assert.deepEqual(pas(e, 1), ['ok', 'ok']);
  assert.equal(e.ax, 1000);
});

test('codurile: M6 → 20, litera necunoscută → 20, X fără număr → 2, fără literă → 1, G1 fără F → 22, arcul cu raze diferite → 33, cuvânt repetat → 25', () => {
  const e = new EmulatorGrbl();
  for (const [l, r] of [
    ['T2 M6', 'error:20'], ['G1 Q5', 'error:20'], ['G1 X', 'error:2'], ['1X', 'error:1'], ['G1 X5', 'error:22'],
    ['G2 X10 Y0 I3 J0 F100', 'error:33'], ['G0 X1 X2', 'error:25'], ['G2 X10 Y0 I5 J0 F100', 'ok'], ['T2', 'ok'],
  ] as const) {
    e.scrie(`${l}\n`);
    assert.deepEqual(pas(e, 10000), [r], l);
  }
});

test('alarma obișnuită (palparea ratată, 5): golește bufferul și planificatorul; G-code → error:9; $X o deblochează', () => {
  const e = new EmulatorGrbl();
  e.scrie('G1X100F600\nG1X200\nG1');
  pas(e, 100);
  e.alarma(5);
  assert.deepEqual(e.citeste(), ['ALARM:5']);
  assert.equal(e.rxOcupat, 0);
  assert.equal(e.planificatorOcupat, 0);
  assert.equal(e.stare, 'Alarm');
  e.scrie('G0X0\n$X\nG0X0\n');
  assert.deepEqual(pas(e, 10000), ['error:9', '[MSG:Caution: Unlocked]', 'ok', 'ok']);
  assert.equal(e.pozitie.x, 0);
});

test('alarma critică (limita, 1): „Reset to continue”; nimic nu se procesează până la Ctrl-X, care golește tot și cere deblocarea', () => {
  const e = new EmulatorGrbl();
  e.scrie('G1X100F600\n');
  pas(e, 100);
  e.alarma(1);
  assert.deepEqual(e.citeste(), ['ALARM:1', '[MSG:Reset to continue]']);
  e.scrie('$X\nG0X0\n');
  assert.deepEqual(pas(e, 1000), []);
  assert.equal(e.rxOcupat, 8, 'octeții stau în buffer, necitiți');
  e.scrie(Uint8Array.of(0x18));
  assert.deepEqual(e.citeste(), ["Grbl 1.1h ['$' for help]", "[MSG:'$H'|'$X' to unlock]"]);
  assert.equal(e.rxOcupat, 0);
  assert.equal(e.stare, 'Alarm');
});

test('Ctrl-X: în mișcare, ALARM:3, bannerul și cererea de deblocare; în repaus, doar bannerul; bufferul se golește', () => {
  const e = new EmulatorGrbl();
  e.scrie('G1X10F300\nG1X2');
  pas(e, 200);
  e.scrie(Uint8Array.of(0x18));
  assert.deepEqual(e.citeste(), ['ALARM:3', "Grbl 1.1h ['$' for help]", "[MSG:'$H'|'$X' to unlock]"]);
  assert.equal(e.rxOcupat, 0);
  assert.equal(e.stare, 'Alarm');
  assert.ok(Math.abs(e.pozitie.x - 1) < 1e-9, 'poziția de la oprire (200 ms din 2 s)');
  e.scrie('$X\n');
  pas(e);
  e.scrie(Uint8Array.of(0x18));
  assert.deepEqual(e.citeste(), ["Grbl 1.1h ['$' for help]"]);
  assert.equal(e.stare, 'Idle');
});

test('hold-ul: ! → Hold:1 (frânează), apoi Hold:0; mișcarea stă; ~ o reia', () => {
  const e = new EmulatorGrbl();
  e.scrie('G1X10F300\n');
  pas(e, 200);
  e.scrie('!');
  assert.equal(e.stare, 'Hold:1');
  e.timp(e.contract.franare);
  assert.equal(e.stare, 'Hold:0');
  const x = e.pozitie.x;
  e.timp(5000);
  assert.equal(e.pozitie.x, x, 'stă');
  e.scrie('~');
  assert.equal(e.stare, 'Run');
  e.timp(1800);
  assert.equal(e.pozitie.x, 10);
  assert.equal(e.stare, 'Idle');
});

test('override-ul de avans scurtează mișcarea: la 200 %, 1 mm la F200 ține 150 ms; plafonul axei (500 mm/min) rămâne', () => {
  const e = new EmulatorGrbl();
  for (let k = 0; k < 10; k++) e.scrie(Uint8Array.of(0x91));
  assert.equal(e.override.avans, 200);
  e.scrie('G1X1F200\n');
  e.timp(149);
  assert.equal(e.stare, 'Run');
  e.timp(1);
  assert.equal(e.stare, 'Idle');
  // F400 la 200 % ar fi 800 mm/min: plafonul axei X e 500, deci 1 mm ține 120 ms.
  e.scrie('G1X2F400\n');
  e.timp(119);
  assert.equal(e.stare, 'Run');
  e.timp(1);
  assert.equal(e.stare, 'Idle');
});

test('$G, $#, $I, $$ și G10 L20: starea modală, decalajele, versiunea, setările; zero-ul pe WCS-ul cerut', () => {
  const e = new EmulatorGrbl();
  e.scrie('$G\n');
  assert.deepEqual(pas(e), ['[GC:G0 G54 G17 G21 G90 G94 M5 M9 T0 F0 S0]', 'ok']);
  // $# în mișcare: error:8 (doar în Idle sau Alarm); $G merge oricând.
  e.scrie('G0X10Y20\n$#\n$G\n');
  assert.deepEqual(pas(e), ['ok', 'error:8', '[GC:G0 G54 G17 G21 G90 G94 M5 M9 T0 F0 S0]', 'ok']);
  e.timp(10000);
  // G10 L20: poziția curentă devine (3, 4) pe G55, deci decalajul G55 e (10 − 3, 20 − 4).
  e.scrie('G10L20P2X3Y4\nG55\n$#\n');
  const r = pas(e);
  assert.ok(r.includes('[G55:7.000,16.000,0.000]'), r.join(' | '));
  assert.equal(r.at(-1), 'ok');
  e.scrie('?');
  assert.match(pas(e)[0] ?? '', /MPos:10\.000,20\.000,0\.000/);
  e.scrie('$10=0\n?');
  assert.match(pas(e).at(-1) ?? '', /WPos:3\.000,4\.000,0\.000/);
  e.scrie('$I\n');
  assert.deepEqual(pas(e), ['[VER:1.1h.20190825:]', '[OPT:V,15,128]', 'ok']);
  e.scrie('$$\n');
  const s = pas(e);
  assert.ok(s.includes('$110=500.000') && s.at(-1) === 'ok');
  e.scrie('$H\n$999=1\n');
  assert.deepEqual(pas(e), ['error:5', 'error:3']);
});

test('transcrierea: ce a primit (octeții, cu timpul) și ce a răspuns, în ordine', () => {
  const e = new EmulatorGrbl();
  e.scrie('G90\n');
  e.timp(5);
  e.scrie('?');
  e.citeste();
  const t = e.transcriere();
  assert.deepEqual(t.map((x) => [x.t, x.dir, x.text]), [[0, 'in', 'G90\n'], [0, 'out', 'ok'], [5, 'in', '?'], [5, 'out', '<Idle|MPos:0.000,0.000,0.000|FS:0,0|WCO:0.000,0.000,0.000>']]);
});

test('jog-ul ($J=): ok la planificare, starea Jog, fără să schimbe starea modală; F lipsă → 22; în alarmă sau în mișcare → 8', () => {
  const e = new EmulatorGrbl();
  // F300 = 5 mm/s: 10 mm țin 2 s; G91 doar pentru jog.
  e.scrie('$J=G91 G21 X10 F300\n');
  assert.deepEqual(pas(e), ['ok']);
  assert.equal(e.stare, 'Jog');
  e.timp(2000);
  assert.equal(e.stare, 'Idle');
  assert.equal(e.pozitie.x, 10);
  e.scrie('$G\n');
  assert.deepEqual(pas(e), ['[GC:G0 G54 G17 G21 G90 G94 M5 M9 T0 F0 S0]', 'ok'], 'G90 rămâne');
  // Cât ține jog-ul, G-code-ul se refuză (GRBL 1.1: `error:9`), jog-urile următoare se planifică.
  e.scrie('$J=G91 G21 X10 F300\n');
  assert.deepEqual(pas(e), ['ok']);
  e.scrie('G10 L20 P1 X0\n$J=G91 G21 X1 F300\n');
  assert.deepEqual(pas(e), ['error:9', 'ok']);
  e.timp(3000);
  assert.equal(e.stare, 'Idle');
  assert.equal(e.pozitie.x, 21);
  e.scrie('G10 L20 P1 X0\n');
  assert.deepEqual(pas(e), ['ok'], 'în Idle, da');
  e.scrie('$J=G91 X1\n');
  assert.deepEqual(pas(e), ['error:22']);
  e.scrie('G1 X20 F300\n$J=G91 X1 F300\n');
  assert.deepEqual(pas(e), ['ok', 'error:8']);
  e.timp(5000);
  e.alarma(5);
  e.citeste();
  e.scrie('$J=G91 X1 F300\n');
  assert.deepEqual(pas(e), ['error:8']);
});

test('WCO: în primul raport, apoi o dată la 10 în repaus (30 în mișcare); după o schimbare a decalajului, în raportul următor', () => {
  const e = new EmulatorGrbl();
  const rapoarte = (n: number): string[] => Array.from({ length: n }, () => { e.scrie('?'); return pas(e)[0] ?? ''; });
  const cu = (r: readonly string[]) => r.map((x, k) => (x.includes('|WCO:') ? k : -1)).filter((k) => k >= 0);
  assert.deepEqual(cu(rapoarte(21)), [0, 10, 20]);
  e.scrie('$J=G91 G21 X10 F300\n');
  pas(e, 1000);
  e.timp(2000);
  e.scrie('G10 L20 P1 X0\n');
  assert.deepEqual(pas(e), ['ok']);
  const dupa = rapoarte(11);
  assert.equal(dupa[0], '<Idle|MPos:10.000,0.000,0.000|FS:0,0|WCO:10.000,0.000,0.000>');
  assert.deepEqual(cu(dupa), [0, 10]);
  e.scrie('G1 X100 F300\n');
  pas(e);
  const run = rapoarte(40);
  assert.ok(run.every((x) => x.startsWith('<Run|')));
  assert.deepEqual(cu(run), [9, 39], 'ciclul pornit în repaus se încheie, apoi o dată la 30');
  // Repornit (Ctrl-X), controlerul trimite WCO-ul în primul raport, ca la pornire.
  e.scrie(Uint8Array.of(0x18));
  e.citeste();
  e.scrie('$X\n');
  e.citeste();
  assert.ok((rapoarte(1)[0] ?? '').includes('|WCO:'));
});

test('anularea jog-ului (0x85): mișcarea de jog se oprește pe loc, Idle; poziția rămâne unde a ajuns', () => {
  const e = new EmulatorGrbl();
  e.scrie('$J=G91 X100 F300\n');
  pas(e, 1000);
  assert.equal(e.stare, 'Jog');
  e.scrie(Uint8Array.of(0x85));
  assert.equal(e.stare, 'Idle');
  assert.ok(Math.abs(e.pozitie.x - 5) < 1e-9, `${e.pozitie.x}`);
  e.timp(5000);
  assert.ok(Math.abs(e.pozitie.x - 5) < 1e-9);
  e.scrie('$J=G91 X1 F300\n');
  pas(e, 1000);
  assert.ok(Math.abs(e.pozitie.x - 6) < 1e-9, 'următorul jog pornește de acolo');
});

test('palparea G38.2 spre placa simulată (Z −25): PRB și ok la atingere, după ce mișcarea dinainte s-a terminat; $# o ține minte', () => {
  const e = new EmulatorGrbl(undefined, { placa: { z: -25 } });
  e.scrie('G1 X5 F300\nG38.2 Z-30 F300\n');
  assert.deepEqual(pas(e), ['ok'], 'G38.2 așteaptă golirea');
  assert.deepEqual(pas(e, 1000), [], 'mișcarea X (1 s) abia s-a terminat');
  assert.deepEqual(pas(e, 4999), [], '25 mm la 5 mm/s: 5 s');
  assert.deepEqual(pas(e, 1), ['[PRB:5.000,0.000,-25.000:1]', 'ok']);
  assert.equal(e.pozitie.z, -25);
  e.scrie('$#\n');
  assert.ok(pas(e).includes('[PRB:5.000,0.000,-25.000:1]'));
});

test('palparea fără contact: G38.2 → ALARM:5 (bufferul golit, fără ok); G38.3 → PRB cu 0 și ok; atinsă dinainte → ALARM:4; fără F → 22', () => {
  const a = new EmulatorGrbl();
  a.scrie('G38.2 Z-10 F600\nG0 X1\n');
  assert.deepEqual(pas(a, 5000), ['ALARM:5']);
  assert.equal(a.stare, 'Alarm');
  assert.equal(a.rxOcupat, 0);
  const b = new EmulatorGrbl();
  b.scrie('G38.3 Z-10 F600\n');
  assert.deepEqual(pas(b, 5000), ['[PRB:0.000,0.000,-10.000:0]', 'ok']);
  const c = new EmulatorGrbl(undefined, { placa: { z: 0 } });
  c.scrie('G38.2 Z-10 F100\n');
  assert.deepEqual(pas(c), ['ALARM:4']);
  const d = new EmulatorGrbl(undefined, { placa: { z: -5 } });
  d.scrie('G38.2 Z-10\n');
  assert.deepEqual(pas(d), ['error:22']);
});
