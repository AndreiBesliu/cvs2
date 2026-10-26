/**
 * Codurile controlerului în sesiune (ADR 0085): familia după cum se prezintă controlerul, ultimul cod cu locul lui (linia
 * programului, comanda omului, jog-ul, procedura), alarma care ține mașina până la un raport în afara stării Alarm, blocarea
 * fără cod, „Reset to continue” până la repornire; pe mașina simulată, repornirea în mișcare (ALARM:3) rămâne explicația, nu
 * blocarea de după ea.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deschideSimulata } from '../../src/machine/MasinaSimulata.ts';
import { incarcaProgram } from '../../src/machine/program.ts';
import { SesiuneMasina, type Transport } from '../../src/machine/sesiune.ts';
import { CeasFals, octeti } from './ajutor-sender.ts';

function transportFals() {
  let primit: ((o: Uint8Array) => void) | null = null, inchis: ((m: string | null) => void) | null = null;
  const scrise: string[] = [];
  const t: Transport = {
    fel: 'serial',
    scrie: (o) => { scrise.push(String.fromCharCode(...o)); return Promise.resolve(); },
    porneste: (p, i) => { primit = p; inchis = i; },
    inchide: () => Promise.resolve(),
  };
  return { t, scrise, trimite: (s: string) => { primit?.(octeti(`${s}\r\n`)); }, inchide: (m: string) => { inchis?.(m); } };
}

const IDLE = '<Idle|MPos:0.000,0.000,0.000|FS:0,0>';
const ALARM = '<Alarm|MPos:0.000,0.000,0.000|FS:0,0>';

async function conectat() {
  const ceas = new CeasFals();
  const s = new SesiuneMasina(ceas);
  const f = transportFals();
  await s.conecteaza(f.t);
  return { ceas, s, f };
}

/** Primul Idle, cu citirea proprie a sesiunii (`$G`, la conectare) răspunsă: apoi nimic în zbor. */
function gata(s: SesiuneMasina, f: ReturnType<typeof transportFals>): void {
  f.trimite(IDLE);
  assert.equal(s.stare().flux.inZbor.length, 1);
  f.trimite('[GC:G0 G54 G17 G21 G90 G94 M5 M9 T0 F0 S0]');
  f.trimite('ok');
  f.trimite(IDLE);
  assert.equal(s.stare().flux.inZbor.length, 0);
  assert.equal(s.stare().wcsActiv, 'G54');
}

test('familia: GRBL, grblHAL (și cu banner de compatibilitate, după $I), FluidNC; necunoscută până se prezintă, uitată la deconectare', async () => {
  const { s, f } = await conectat();
  assert.equal(s.stare().familie, null);
  f.trimite("GrblHAL 1.1f ['$' or '$HELP' for help]");
  assert.equal(s.stare().familie, 'grblhal');
  f.trimite("Grbl 1.1f ['$' for help]");
  assert.equal(s.stare().familie, 'grbl-11');
  f.trimite('[FIRMWARE:grblHAL]');
  assert.equal(s.stare().familie, 'grblhal');
  f.trimite("Grbl 3.9 [FluidNC v3.9.1 (esp32-wifi) '$' for help]");
  assert.equal(s.stare().familie, 'fluidnc');
  // Un [VER:] fără nume nu schimbă nimic.
  f.trimite('[VER:1.1h.20190825:]');
  assert.equal(s.stare().familie, 'fluidnc');
  f.inchide('');
  assert.equal(s.stare().familie, null);
});

test('bannerul grblHAL e o repornire: comanda în zbor se pierde, WCS-ul se recitește', async () => {
  const { s, f } = await conectat();
  gata(s, f);
  s.eveniment({ tip: 'manual', id: 'om-1', text: 'G0 X1' });
  assert.equal(s.stare().flux.inZbor.length, 1);
  f.trimite("GrblHAL 1.1f ['$' or '$HELP' for help]");
  assert.equal(s.stare().flux.inZbor.length, 0);
  assert.equal(s.stare().wcsActiv, null);
});

test('error:N la comanda omului: locul e textul comenzii; nu ține mașina', async () => {
  const { s, f } = await conectat();
  gata(s, f);
  s.eveniment({ tip: 'manual', id: 'om-1', text: 'G1 X5' });
  f.trimite('error:22');
  const c = s.stare().cod;
  assert.deepEqual(c && { fel: c.fel, cod: c.cod, la: c.la }, { fel: 'eroare', cod: 22, la: { tip: 'comanda', text: 'G1 X5' } });
  assert.equal(s.stare().alarma, null);
  // Un răspuns fără nimic în zbor: locul e controlerul.
  f.trimite('error:3');
  assert.deepEqual(s.stare().cod?.la, { tip: 'controler' });
  assert.ok((s.stare().cod?.nr ?? 0) > (c?.nr ?? 0));
});

test('error:N la jog și la o linie a programului: locul e jog-ul, respectiv linia', async () => {
  const { ceas, s, f } = await conectat();
  gata(s, f);
  assert.ok(s.jog({ X: 1000 }, 500));
  f.trimite('error:15');
  assert.deepEqual(s.stare().cod?.la, { tip: 'jog' });

  const p = await incarcaProgram(octeti('G54\nG0 X1\nG0 X2\nM30\n'), { sursa: 'fisier' });
  assert.ok(p.ok);
  if (!p.ok) return;
  s.eveniment({ tip: 'incarca', program: p.program });
  f.trimite(IDLE);
  await ceas.avanseaza(0);
  s.eveniment({ tip: 'start' });
  await ceas.avanseaza(0);
  f.trimite('ok');
  f.trimite('error:20');
  assert.deepEqual(s.stare().cod?.la, { tip: 'program', linie: 1 });
  assert.deepEqual(s.stare().flux.erori, [{ linie: 1, cod: 20 }]);
});

test('alarma critică: „Reset to continue” până la banner; blocarea de după e a alarmei; Idle o eliberează; error:9 n-o înlocuiește', async () => {
  const { s, f } = await conectat();
  f.trimite(IDLE);
  f.trimite('ALARM:1');
  f.trimite('[MSG:Reset to continue]');
  const a = s.stare().alarma;
  assert.deepEqual(a && { fel: a.fel, cod: a.cod }, { fel: 'alarma', cod: 1 });
  assert.equal(s.stare().cod?.nr, a?.nr);
  assert.equal(s.stare().repornire, true);
  f.trimite(ALARM);
  // Ctrl-X: bannerul, apoi blocarea (homing activat sau după alarmă): explicația rămâne ALARM:1.
  f.trimite("Grbl 1.1h ['$' for help]");
  assert.equal(s.stare().repornire, false);
  f.trimite("[MSG:'$H'|'$X' to unlock]");
  assert.equal(s.stare().cod?.nr, a?.nr);
  assert.equal(s.stare().alarma?.nr, a?.nr);
  // Omul apasă Zero în alarmă: error:9 e codul nou, alarma care ține mașina rămâne ALARM:1.
  s.eveniment({ tip: 'manual', id: 'om-2', text: 'G10 L20 P1 X0' });
  f.trimite('error:9');
  assert.equal(s.stare().cod?.fel, 'eroare');
  assert.equal(s.stare().alarma?.cod, 1);
  f.trimite(ALARM);
  assert.equal(s.stare().alarma?.cod, 1);
  f.trimite('[MSG:Caution: Unlocked]');
  f.trimite(IDLE);
  assert.equal(s.stare().alarma, null);
});

test('blocarea fără cod (pornirea cu homing activat): cod 0, ține mașina; prefixul FluidNC al mesajelor', async () => {
  const { s, f } = await conectat();
  f.trimite("Grbl 3.9 [FluidNC v3.9.1 (esp32-wifi) '$' for help]");
  f.trimite("[MSG:INFO: '$H'|'$X' to unlock]");
  const c = s.stare().cod;
  assert.deepEqual(c && { fel: c.fel, cod: c.cod }, { fel: 'blocare', cod: 0 });
  assert.equal(s.stare().alarma?.nr, c?.nr);
  f.trimite('[MSG:ERR: Reset to continue]');
  assert.equal(s.stare().repornire, true);
  // grblHAL, la oprirea de urgență: „reset to continue” cu litere mici, în altă frază.
  f.trimite("GrblHAL 1.1f ['$' or '$HELP' for help]");
  assert.equal(s.stare().repornire, false);
  f.trimite('[MSG:Emergency stop - clear, then reset to continue]');
  assert.equal(s.stare().repornire, true);
});

test('o conectare nouă începe fără cod, fără alarmă, fără repornire', async () => {
  const { s, f } = await conectat();
  f.trimite('ALARM:2');
  f.trimite('[MSG:Reset to continue]');
  const g = transportFals();
  await s.conecteaza(g.t);
  assert.equal(s.stare().cod, null);
  assert.equal(s.stare().alarma, null);
  assert.equal(s.stare().repornire, false);
});

test('mașina simulată: Oprește în timpul unei mișcări dă ALARM:3, iar blocarea de după repornire n-o înlocuiește', async () => {
  const ceas = new CeasFals();
  const s = new SesiuneMasina(ceas);
  await s.conecteaza(deschideSimulata({ ceas, viteza: () => 1 }));
  await ceas.avanseaza(200);
  const p = await incarcaProgram(octeti('G54\nG21 G90\nG1 X200 F300\nM30\n'), { sursa: 'fisier' });
  assert.ok(p.ok);
  if (!p.ok) return;
  s.eveniment({ tip: 'incarca', program: p.program });
  s.eveniment({ tip: 'start' });
  for (let k = 0; k < 50 && s.stare().flux.raport?.stare !== 'Run'; k++) await ceas.avanseaza(100);
  assert.equal(s.stare().flux.raport?.stare, 'Run');
  s.eveniment({ tip: 'opreste' });
  await ceas.avanseaza(400);
  const c = s.stare().cod;
  assert.deepEqual(c && { fel: c.fel, cod: c.cod }, { fel: 'alarma', cod: 3 });
  assert.equal(s.stare().alarma?.cod, 3);
  assert.equal(s.stare().familie, 'grbl-11');
  assert.ok(s.stare().jurnal.some((l) => l.text === "[MSG:'$H'|'$X' to unlock]"));
});
