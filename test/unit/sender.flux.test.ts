/**
 * Fluxul senderului pe emulatorul GRBL (ADR 0080, felia 3.6a), regulă cu regulă (`docs/PORTARE.md` §3.4): 100 000 de linii și
 * programele plăcilor ajung exact (octet cu octet) și fără pierderi, cu suma ținută de sender niciodată peste 128; eroarea în
 * flux suspendă (hold) și reluarea continuă; alarma, Ctrl-X și repornirea pierd punctul de reluare; lucrarea e terminată abia
 * după hold-ul eliberat; barierele nu pleacă la controler, opresc o singură dată, opresc axul la sculă; citirile `$` pleacă doar
 * pe un Idle proaspăt (altfel GRBL ar da `error:8`); răspunsurile manuale își păstrează datele.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EmulatorGrbl } from '../../src/machine/emulator.ts';
import { fluxNou, pas, type Actiune, type StareFlux } from '../../src/machine/flux.ts';
import { incarcaProgram, type ProgramIncarcat } from '../../src/machine/program.ts';
import { octeti, primitiFaraTimpReal, ruleaza } from './ajutor-sender.ts';

const ANTET = 'G90 G17 G21 G94\nG54\n';
async function program(text: string, sursa: 'export' | 'fisier' = 'export'): Promise<ProgramIncarcat> {
  const r = await incarcaProgram(octeti(text), { sursa });
  if (!r.ok) assert.fail(`${r.cod} la linia ${r.linie}`);
  return r.program;
}
const incarcat = (p: ProgramIncarcat): StareFlux => pas(fluxNou(), { tip: 'incarca', program: p }).stare;
const START = [{ la: 0, e: { tip: 'start' } }] as const;
const raspunsuri = (a: readonly Actiune[]) => a.filter((x): x is Extract<Actiune, { tip: 'raspuns' }> => x.tip === 'raspuns');

const MODEL = ['X.1', 'X-.1', 'G1X0.1', 'G1 X-0.100', '', '(a)', 'Y.05', 'Y-.05', 'G1Z.01', 'G1Z-.01'];

test('100 000 de linii prin sender: exact octeții programului, 0 pierderi, suma niciodată peste 128, bufferul plin, terminat în origine', async () => {
  const text = `${ANTET}G91\nG1F500\n${Array.from({ length: 100_000 }, (_, k) => MODEL[k % MODEL.length]).join('\n')}\n`;
  const emu = new EmulatorGrbl();
  const r = ruleaza(emu, incarcat(await program(text)), { evenimente: START });
  assert.equal(r.stare.faza, 'terminat');
  assert.deepEqual(r.stare.erori, []);
  assert.equal(emu.contoare.pierduti, 0);
  assert.ok(r.sumaMaxima <= 128, `suma ${r.sumaMaxima}`);
  assert.ok(emu.contoare.varfRx >= 120 && emu.contoare.varfRx <= 128, `vârful bufferului ${emu.contoare.varfRx}`);
  assert.equal(emu.contoare.linii, 100_004);
  assert.equal(primitiFaraTimpReal(emu), text, 'emulatorul a primit exact octeții programului');
  for (const a of ['x', 'y', 'z'] as const) assert.ok(Math.abs(emu.pozitie[a]) < 1e-6, `${a}: ${emu.pozitie[a]}`);
  assert.equal(r.stare.suma, 0);
  assert.deepEqual(r.stare.inZbor, []);
});

for (const f of ['test/placi/placa-01/placa-01-A.nc', 'test/placi/placa-01/placa-01-B.nc', 'test/placi/placa-02/placa-02.nc']) {
  test(`${f.split('/').at(-1)} prin sender: terminat, fără erori, exact octeții plăcii, axul oprit`, async () => {
    const text = readFileSync(f, 'ascii');
    const emu = new EmulatorGrbl();
    const r = ruleaza(emu, incarcat(await program(text)), { evenimente: START, pasMs: 5, tic: 200 });
    assert.equal(r.stare.faza, 'terminat');
    assert.deepEqual(r.stare.erori, []);
    assert.equal(emu.contoare.pierduti, 0);
    assert.equal(primitiFaraTimpReal(emu), text);
    assert.equal(emu.ax, 0);
    assert.equal(emu.stare, 'Idle');
  });
}

test('regula 5: tot programul confirmat, dar în hold, nu e terminat; abia după eliberare și un Idle', async () => {
  const emu = new EmulatorGrbl();
  const r = ruleaza(emu, incarcat(await program(`${ANTET}G0 X10\nG0 X0\n`)), {
    evenimente: [...START, { la: 100, e: { tip: 'hold' } }, { la: 5000, e: { tip: 'eliberare' } }],
  });
  assert.equal(r.stare.faza, 'terminat');
  assert.ok(r.timp > 5000, `terminat la ${r.timp} ms, înaintea eliberării`);
  // Programul scurt pleacă tot la start: din „pregătit” direct în „terminare”, unde stă cât ține hold-ul.
  assert.deepEqual(r.faze, ['pregatit', 'terminare', 'terminat']);
  assert.equal(emu.pozitie.x, 0);
});

test('regula 3: error:N în flux → hold și suspendat; ce era în zbor primește răspuns; reluarea continuă de la prima linie netrimisă', async () => {
  // 200 de linii: cât GRBL confirmă pe loc (planificatorul de 15, bufferul de 128) pleacă înaintea răspunsului cu eroarea.
  const linii = Array.from({ length: 200 }, (_, k) => (k === 10 ? 'G1 Q5' : `G1 X${k % 2 ? 0 : 1} F300`));
  const text = `${ANTET}${linii.join('\n')}\n`;
  const emu = new EmulatorGrbl();
  const s0 = incarcat(await program(text));
  const r1 = ruleaza(emu, s0, { evenimente: START, pana: (s) => s.faza === 'suspendat' && s.inZbor.length === 0, timpMaxim: 60_000 });
  assert.equal(r1.stare.faza, 'suspendat');
  assert.deepEqual(r1.stare.erori, [{ linie: 12, cod: 20 }]);
  assert.match(emu.stare, /^Hold/);
  const urm = r1.stare.urm;
  assert.ok(urm > 13 && urm < 60, `prima linie netrimisă: ${urm}`);
  const r2 = ruleaza(emu, r1.stare, { evenimente: [{ la: 0, e: { tip: 'reia' } }] });
  assert.equal(r2.stare.faza, 'terminat');
  assert.equal(primitiFaraTimpReal(emu), text, 'fiecare linie a plecat o singură dată');
  assert.equal(emu.pozitie.x, 0);
});

test('regula 3: eroarea pe ultima linie, cu linii încă în buffer: suspendat; reluarea duce la terminat', async () => {
  const text = `${ANTET}${Array.from({ length: 8 }, (_, k) => `G1 X${k % 2 ? 0 : 1} F300`).join('\n')}\nG1 Q5\n`;
  const emu = new EmulatorGrbl();
  const r1 = ruleaza(emu, incarcat(await program(text)), { evenimente: START, pana: (s) => s.faza === 'suspendat' });
  assert.deepEqual(r1.stare.erori, [{ linie: 10, cod: 20 }]);
  assert.ok(emu.planificatorOcupat > 0, 'mișcările încă în planificator');
  const r2 = ruleaza(emu, r1.stare, { evenimente: [{ la: 0, e: { tip: 'reia' } }] });
  assert.equal(r2.stare.faza, 'terminat');
});

test('regula 4: alarma în flux pierde punctul de reluare; reia e refuzat, start nu', async () => {
  const text = `${ANTET}${Array.from({ length: 40 }, (_, k) => `G1 X${k % 2 ? 0 : 1} F300`).join('\n')}\n`;
  const emu = new EmulatorGrbl();
  const r = ruleaza(emu, incarcat(await program(text)), { evenimente: [...START, { la: 300, emulator: (e) => { e.alarma(5); } }] });
  assert.equal(r.stare.faza, 'pierdut');
  assert.equal(r.stare.motiv, 'ALARM:5');
  assert.ok(r.actiuni.some((a) => a.tip === 'alarma' && a.cod === 5));
  assert.deepEqual(r.stare.inZbor, []);
  assert.deepEqual(pas(r.stare, { tip: 'reia' }).actiuni, [{ tip: 'refuz', eveniment: 'reia', cod: 'punct-pierdut' }]);
  assert.ok(!pas(r.stare, { tip: 'start' }).actiuni.some((a) => a.tip === 'refuz'));
});

test('regula 4: „oprește” trimite Ctrl-X: pierdut, din mâna omului; ALARM:3 și bannerul care urmează nu schimbă motivul', async () => {
  const text = `${ANTET}${Array.from({ length: 40 }, (_, k) => `G1 X${k % 2 ? 0 : 1} F300`).join('\n')}\n`;
  const emu = new EmulatorGrbl();
  const r = ruleaza(emu, incarcat(await program(text)), { evenimente: [...START, { la: 300, e: { tip: 'opreste' } }], timpMaxim: 400, pana: () => false });
  assert.equal(r.stare.faza, 'pierdut');
  assert.equal(r.stare.motiv, 'oprit');
  assert.ok(r.actiuni.some((a) => a.tip === 'alarma' && a.cod === 3));
  assert.equal(emu.rxOcupat, 0);
});

test('regula 4: o repornire neașteptată (Ctrl-X din altă parte) la barieră, în repaus: pierdut, „repornire”', async () => {
  const emu = new EmulatorGrbl();
  const s = incarcat(await program(`${ANTET}G0 X1\nM0\nG0 X0\n`));
  const r1 = ruleaza(emu, s, { evenimente: START, pana: (x) => x.faza === 'bariera' });
  const r2 = ruleaza(emu, r1.stare, { evenimente: [{ la: 10, emulator: (e) => { e.scrie(Uint8Array.of(0x18)); } }] });
  assert.equal(r2.stare.faza, 'pierdut');
  assert.equal(r2.stare.motiv, 'repornire');
});

test('regula 6: M6 nu pleacă; fluxul golește, așteaptă Idle, trimite M5, se oprește; o comandă manuală merge; continuă până la capăt', async () => {
  const text = `${ANTET}M3 S12000\nG4 P0.5\nG1 X5 F300\nM5\nT2 M6\nG0 Z5\nM3 S10000\nG4 P0.5\nG0 X0\nM5\nM30\n`;
  const emu = new EmulatorGrbl();
  const r1 = ruleaza(emu, incarcat(await program(text)), { evenimente: START, pana: (s) => s.faza === 'bariera' });
  assert.equal(r1.stare.faza, 'bariera');
  assert.deepEqual(r1.stare.bariera, { linie: 6, ultima: 6, m6: true, ax: 'oprit' });
  assert.equal(emu.ax, 0);
  assert.equal(emu.stare, 'Idle');
  assert.equal(emu.pozitie.x, 5, 'a ajuns la barieră după ce s-a terminat mișcarea');
  const primit = primitiFaraTimpReal(emu);
  assert.ok(!primit.includes('M6'), 'M6 nu a plecat');
  assert.equal(primit.match(/^M5$/gm)?.length, 2, 'M5 din program și cel al senderului');
  // O citire, la barieră.
  const m = ruleaza(emu, r1.stare, {
    evenimente: [{ la: 0, e: { tip: 'manual', id: 'wcs', text: '$#' } }], pana: (s) => s.coada.length === 0 && s.inZbor.length === 0,
  });
  const rasp = raspunsuri(m.actiuni);
  assert.equal(rasp.length, 1);
  assert.equal(rasp[0]?.rezultat, 'ok');
  assert.ok(rasp[0]?.date.includes('[G54:0.000,0.000,0.000]'));
  const r2 = ruleaza(emu, m.stare, { evenimente: [{ la: 0, e: { tip: 'continua' } }] });
  assert.equal(r2.stare.faza, 'terminat');
  assert.ok(!primitiFaraTimpReal(emu).includes('T2'), 'nici cuvântul T al barierei');
  assert.equal(emu.ax, 0);
});

test('regula 6: „M0, (comentariu), T5 M6, M3 S…” e o singură oprire, cu axul oprit; M0 și M6 nu pleacă', async () => {
  const text = `${ANTET}G0 X1\nM0\n(schimb scula)\n\nT5 M6\nM3 S9000\nG4 P0.5\nG0 X0\nM5\nM30\n`;
  const emu = new EmulatorGrbl();
  const r1 = ruleaza(emu, incarcat(await program(text)), { evenimente: START, pana: (s) => s.faza === 'bariera' });
  assert.deepEqual(r1.stare.bariera, { linie: 3, ultima: 6, m6: true, ax: 'oprit' });
  const r2 = ruleaza(emu, r1.stare, { evenimente: [{ la: 0, e: { tip: 'continua' } }] });
  assert.equal(r2.stare.faza, 'terminat');
  assert.ok(!r2.faze.slice(1).includes('bariera'), `o singură oprire: ${r2.faze.join(' → ')}`);
  const primit = primitiFaraTimpReal(emu);
  assert.ok(!/M0\n|M6/.test(primit), primit);
  assert.ok(!primit.includes('(schimb scula)'), 'liniile dintre bariere sunt în grup: nu pleacă');
  assert.ok(primit.includes('G0 X1\nM5\nM3 S9000\n'), 'M5-ul senderului la sculă, apoi linia de după grup');
});

test('regula 7: o citire după o mișcare manuală așteaptă Idle-ul proaspăt (nu error:8); răspunsurile își păstrează datele', async () => {
  const emu = new EmulatorGrbl();
  const r = ruleaza(emu, fluxNou(), {
    evenimente: [
      { la: 0, e: { tip: 'manual', id: 'misca', text: 'G0 X20' } }, { la: 0, e: { tip: 'manual', id: 'cit', text: '$#' } },
      { la: 0, e: { tip: 'manual', id: 'gc', text: '$G' } },
    ],
    pana: (x) => x.coada.length === 0 && x.inZbor.length === 0 && x.proaspat, timpMaxim: 10_000,
  });
  const rasp = raspunsuri(r.actiuni);
  assert.deepEqual(rasp.map((x) => [x.id, x.rezultat]), [['misca', 'ok'], ['cit', 'ok'], ['gc', 'ok']]);
  assert.ok(r.timp >= 2400, `citirea a așteptat mișcarea (2,4 s): ${r.timp} ms`);
  assert.ok(rasp[1]?.date.includes('[G54:0.000,0.000,0.000]') && rasp[1]?.date.length === 11, JSON.stringify(rasp[1]?.date));
  assert.deepEqual(rasp[2]?.date, ['[GC:G0 G54 G17 G21 G90 G94 M5 M9 T0 F0 S0]']);
  assert.equal(emu.pozitie.x, 20);
});

test('comenzile manuale: refuzate în flux, cu caractere de timp real, prea lungi sau goale; startul fără program; continuă în afara barierei', async () => {
  const emu = new EmulatorGrbl();
  const s = incarcat(await program(`${ANTET}${Array.from({ length: 30 }, (_, k) => `G1 X${k % 2 ? 0 : 1} F300`).join('\n')}\n`));
  const r = ruleaza(emu, s, { evenimente: START, timpMaxim: 50, pana: () => false });
  assert.equal(r.stare.faza, 'trimite');
  const cod = (st: StareFlux, text: string) => pas(st, { tip: 'manual', id: 'x', text }).actiuni.find((a) => a.tip === 'refuz');
  assert.deepEqual(cod(r.stare, '$#'), { tip: 'refuz', eveniment: 'manual', cod: 'manual-in-flux' });
  for (const t of ['$#?', 'G0 X1!', '', '   ', `G0 X${'1'.repeat(70)}`, '(doar comentariu)']) assert.equal(cod(fluxNou(), t)?.cod, 'manual-invalid', t);
  assert.deepEqual(pas(fluxNou(), { tip: 'start' }).actiuni, [{ tip: 'refuz', eveniment: 'start', cod: 'fara-program' }]);
  assert.deepEqual(pas(s, { tip: 'continua' }).actiuni, [{ tip: 'refuz', eveniment: 'continua', cod: 'faza' }]);
});

test('regula 9 și 2: un ok fără nimic în zbor se numără ca necorelat, fără să strice socoteala; ticul scrie doar „?”', () => {
  const r = pas(fluxNou(), { tip: 'primit', linie: 'ok' });
  assert.equal(r.stare.necorelate, 1);
  assert.equal(r.stare.suma, 0);
  assert.deepEqual(pas(fluxNou(), { tip: 'tic' }).actiuni, [{ tip: 'scrie', octeti: Uint8Array.of(0x3f) }]);
  assert.deepEqual(pas(fluxNou(), { tip: 'hold' }).actiuni, [{ tip: 'scrie', octeti: Uint8Array.of(0x21) }]);
});

test('regula 5: un Idle vechi nu termină lucrarea — după „G4 P1” (rapoarte Idle în pauză) vine „G0 X10”, confirmat pe loc', async () => {
  const emu = new EmulatorGrbl();
  const r = ruleaza(emu, incarcat(await program(`${ANTET}G4 P1\nG0 X10\n`)), { evenimente: START });
  assert.equal(r.stare.faza, 'terminat');
  assert.equal(emu.pozitie.x, 10, 'terminat abia după ce mișcarea s-a încheiat');
  assert.equal(emu.stare, 'Idle');
  assert.ok(r.timp >= 1000 + 1200, `${r.timp} ms`);
});

test('regulile 3 și 6: o eroare chiar în fața unei bariere: suspendat; după reluare, fluxul regăsește bariera și se oprește la ea', async () => {
  const emu = new EmulatorGrbl();
  const r1 = ruleaza(emu, incarcat(await program(`${ANTET}G1 X1 F300\nG1 Q5\nM0\nG0 X0\n`)), { evenimente: START, pana: (s) => s.faza === 'suspendat' });
  assert.deepEqual(r1.stare.erori, [{ linie: 3, cod: 20 }]);
  const r2 = ruleaza(emu, r1.stare, { evenimente: [{ la: 0, e: { tip: 'reia' } }], pana: (s) => s.faza === 'bariera' });
  assert.deepEqual(r2.stare.bariera, { linie: 4, ultima: 4, m6: false, ax: 'oprit' });
  const r3 = ruleaza(emu, r2.stare, { evenimente: [{ la: 0, e: { tip: 'continua' } }] });
  assert.equal(r3.stare.faza, 'terminat');
  assert.equal(emu.pozitie.x, 0);
});

test('regula 4: portul pierdut în flux (deconectat): pierdut, cu motivul; comenzile manuale din zbor primesc „pierdut”; raportul se uită', async () => {
  const emu = new EmulatorGrbl();
  const text = `${ANTET}${Array.from({ length: 40 }, (_, k) => `G1 X${k % 2 ? 0 : 1} F300`).join('\n')}\n`;
  const r = ruleaza(emu, incarcat(await program(text)), { evenimente: START, timpMaxim: 300, pana: () => false });
  const d = pas(r.stare, { tip: 'deconectat' });
  assert.equal(d.stare.faza, 'pierdut');
  assert.equal(d.stare.motiv, 'deconectat');
  assert.equal(d.stare.raport, null);
  assert.deepEqual(d.stare.inZbor, []);
  let m = pas(fluxNou(), { tip: 'manual', id: 'a', text: '$G' });
  m = pas(pas(m.stare, { tip: 'primit', linie: '<Idle|MPos:0,0,0|FS:0,0>' }).stare, { tip: 'deconectat' });
  assert.deepEqual(m.actiuni, [{ tip: 'raspuns', id: 'a', date: [], rezultat: 'pierdut' }]);
  assert.equal(m.stare.faza, 'liber', 'în afara fluxului, faza rămâne');
});
