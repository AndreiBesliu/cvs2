/**
 * Transportul prin rețea (ADR 0119, felia 3.6d), pe hârtie: adresa primită (un IP local sau un nume `.local`, pe `ws://`) sau
 * refuzată cu motivul, înainte de conectare (și `wss://`, pe care CSP-ul nu-l deschide); mesajele de control ale controlerului (cadrele text
 * ale FluidNC); transportul pe un WebSocket fals: deschiderea (și refuzul ei, timpul, permisiunea rețelei locale), cadrele
 * primite (text și binare) ca octeți, câte un cadru pe scriere, închiderea (căzută, a controlerului, a noastră).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  adresaRetea, deschideRetea, esteControl, PROFIL_RETEA, type AdresaRetea, type WebSocketMinim,
} from '../../src/machine/websocket.ts';
import { incarcaProgram } from '../../src/machine/program.ts';
import { SesiuneMasina } from '../../src/machine/sesiune.ts';
import { CeasFals, octeti } from './ajutor-sender.ts';

const adresa = (text: string, port = 81): AdresaRetea => {
  const r = adresaRetea(text, port);
  assert.ok(r.ok, `${text}: ${r.ok ? '' : r.motiv}`);
  return r.adresa;
};
const motiv = (text: string, port = 81): string => {
  const r = adresaRetea(text, port);
  assert.ok(!r.ok, `${text} trebuia refuzată`);
  return r.motiv;
};

test('profilurile (ADR 0119 §3): FluidNC și grblHAL pe 81, podul ESP3D 3.0 pe WebSocket-ul de date (8282, subprotocolul arduino, textul doar control)', () => {
  assert.deepEqual(PROFIL_RETEA.fluidnc, { port: 81, subprotocol: null, textDoarControl: false });
  assert.deepEqual(PROFIL_RETEA.grblhal, { port: 81, subprotocol: null, textDoarControl: false });
  assert.deepEqual(PROFIL_RETEA.esp3d, { port: 8282, subprotocol: 'arduino', textDoarControl: true });
});

test('podul ESP3D: ieșirea GRBL vine binar, iar cadrele text (controlul și jurnalul lui) nu ajung la sesiune, nici în mijlocul unei linii', async () => {
  const p = deschideRetea(adresa('192.168.4.1', 8282), 'esp3d', { creeaza });
  WsFals.ultimul?.deschide();
  const t = await p;
  const primite: string[] = [];
  t.porneste((o) => { primite.push(text(o)); }, () => undefined);
  const binar = (s: string): ArrayBuffer => Uint8Array.from(s, (c) => c.charCodeAt(0)).buffer;
  WsFals.ultimul?.onmessage?.({ data: binar('o') });
  WsFals.ultimul?.onmessage?.({ data: '[ESP3D] client conectat\n' });
  WsFals.ultimul?.onmessage?.({ data: binar('k\r\n') });
  assert.equal(primite.join(''), 'ok\r\n');
  // La FluidNC, un cadru text care nu e control rămâne date (ieșirea lui e binară, dar un text necunoscut nu se aruncă).
  const p2 = deschideRetea(adresa('192.168.4.2'), 'fluidnc', { creeaza });
  WsFals.ultimul?.deschide();
  const t2 = await p2;
  const primite2: string[] = [];
  t2.porneste((o) => { primite2.push(text(o)); }, () => undefined);
  WsFals.ultimul?.onmessage?.({ data: 'ok\r\n' });
  assert.deepEqual(primite2, ['ok\r\n']);
});

test('adresa primită: IP-urile locale (privat, link-local, loopback, IPv6 local) și numele .local pe ws://, portul din câmp sau din adresă', () => {
  assert.deepEqual(adresa('192.168.1.50'), { url: 'ws://192.168.1.50:81/', gazda: '192.168.1.50', port: 81 });
  assert.deepEqual(adresa(' 192.168.1.50:8080 ', 81), { url: 'ws://192.168.1.50:8080/', gazda: '192.168.1.50', port: 8080 });
  assert.equal(adresa('10.0.0.7', 8282).url, 'ws://10.0.0.7:8282/');
  assert.equal(adresa('172.16.0.1').url, 'ws://172.16.0.1:81/');
  assert.equal(adresa('172.31.255.254').url, 'ws://172.31.255.254:81/');
  assert.equal(adresa('169.254.3.4').url, 'ws://169.254.3.4:81/');
  assert.equal(adresa('127.0.0.1', 9001).url, 'ws://127.0.0.1:9001/');
  assert.equal(adresa('localhost').url, 'ws://localhost:81/');
  assert.deepEqual(adresa('fluidnc.local'), { url: 'ws://fluidnc.local:81/', gazda: 'fluidnc.local', port: 81 });
  assert.equal(adresa('COSTEL.local:82').url, 'ws://costel.local:82/');
  assert.equal(adresa('[fd00::12]').url, 'ws://[fd00::12]:81/');
  assert.equal(adresa('[fe80::1]:81').url, 'ws://[fe80::1]:81/');
  assert.equal(adresa('[::1]').url, 'ws://[::1]:81/');
  // Calea rămâne (un pod cu WebSocket-ul pe o cale anume); portul din adresă bate câmpul.
  assert.equal(adresa('ws://192.168.4.1:8282/ws', 81).url, 'ws://192.168.4.1:8282/ws');
  // Portul 80 rămâne scris (`URL` l-ar scoate, fiind implicitul schemei).
  assert.equal(adresa('192.168.1.50:80').url, 'ws://192.168.1.50:80/');
});

test('adresa refuzată, cu motivul: goală, altă schemă, cu cont, portul greșit, un nume obișnuit sau un IP public pe ws://', () => {
  assert.equal(motiv(''), 'goala');
  assert.equal(motiv('   '), 'goala');
  assert.equal(motiv('http://192.168.1.50'), 'schema');
  assert.equal(motiv('https://192.168.1.50'), 'schema');
  // wss:// nu: niciun controler n-are TLS, iar CSP-ul aplicației nu-l deschide.
  assert.equal(motiv('wss://controler.atelier.ro/ws'), 'schema');
  assert.equal(motiv('wss://192.168.1.50'), 'schema');
  assert.equal(motiv('ws://'), 'invalida');
  assert.equal(motiv('ws://ion:parola@192.168.1.50'), 'cont');
  assert.equal(motiv('192.168.1.50:0'), 'port');
  assert.equal(motiv('192.168.1.50', 0), 'port');
  assert.equal(motiv('192.168.1.50', 70000), 'port');
  assert.equal(motiv('192.168.1.50', 81.5), 'port');
  // Browserul blochează un ws:// spre un nume obișnuit (verificarea e pe adresă, înainte de DNS) și spre un IP public.
  assert.equal(motiv('controler.atelier.ro'), 'nume');
  assert.equal(motiv('fluidnc'), 'nume');
  assert.equal(motiv('8.8.8.8'), 'publica');
  assert.equal(motiv('172.32.0.1'), 'publica');
  assert.equal(motiv('172.15.255.255'), 'publica');
  assert.equal(motiv('100.64.0.1'), 'publica');
  assert.equal(motiv('[2001:db8::1]'), 'publica');
});

test('mesajele de control ale controlerului (cadrele text ale FluidNC) se recunosc; liniile GRBL, nu', () => {
  for (const m of ['CURRENT_ID:0', 'currentID:3', 'ACTIVE_ID:1', 'activeID:2', 'PING:60000:60000', 'PING', 'PING\n']) assert.equal(esteControl(m), true, m);
  for (const m of ['ok', 'error:9', 'ALARM:1', '<Idle|MPos:0.000,0.000,0.000|FS:0,0>', "Grbl 1.1h ['$' for help]", '[MSG:Pgm End]', '$130=800.000', 'PINGU']) {
    assert.equal(esteControl(m), false, m);
  }
});

/** Un WebSocket fals, condus de probă. */
class WsFals implements WebSocketMinim {
  static ultimul: WsFals | null = null;
  binaryType = 'blob';
  readyState = 0;
  readonly trimise: Uint8Array[] = [];
  inchisCu: number | null = null;
  onopen: (() => void) | null = null;
  onmessage: ((e: { readonly data: unknown }) => void) | null = null;
  onclose: ((e: { readonly code: number; readonly reason: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  readonly url: string;
  readonly subprotocol: string | null;
  constructor(url: string, subprotocol: string | null) {
    this.url = url;
    this.subprotocol = subprotocol;
    WsFals.ultimul = this;
  }
  send(d: Uint8Array): void { if (this.readyState !== 1) throw new Error('nedeschis'); this.trimise.push(d); }
  close(code = 1000): void { this.inchisCu = code; this.readyState = 3; this.onclose?.({ code, reason: '' }); }
  deschide(): void { this.readyState = 1; this.onopen?.(); }
  cade(code: number): void { this.readyState = 3; this.onclose?.({ code, reason: '' }); }
}
const creeaza = (url: string, p: string | null): WsFals => new WsFals(url, p);
const text = (o: Uint8Array): string => String.fromCharCode(...o);

test('transportul: se deschide pe URL-ul adresei, cu subprotocolul profilului, cadrele binare; primește text și binar ca octeți, scoate controlul', async () => {
  const p = deschideRetea(adresa('192.168.4.1', 8282), 'esp3d', { creeaza });
  const ws = WsFals.ultimul;
  assert.ok(ws);
  assert.deepEqual([ws.url, ws.subprotocol], ['ws://192.168.4.1:8282/', 'arduino']);
  ws.deschide();
  const t = await p;
  assert.equal(t.fel, 'retea');
  assert.equal(ws.binaryType, 'arraybuffer');
  const primite: string[] = [];
  const inchideri: (string | null)[] = [];
  t.porneste((o) => { primite.push(text(o)); }, (m) => { inchideri.push(m); });
  ws.onmessage?.({ data: 'CURRENT_ID:0' });
  ws.onmessage?.({ data: Uint8Array.from("Grbl 1.1h ['$' for help]\r\n", (c) => c.charCodeAt(0)).buffer });
  ws.onmessage?.({ data: Uint8Array.from('ok\r\n', (c) => c.charCodeAt(0)).buffer });
  ws.onmessage?.({ data: 'PING:60000:60000' });
  assert.deepEqual(primite, ["Grbl 1.1h ['$' for help]\r\n", 'ok\r\n']);
  await t.scrie(Uint8Array.from('G0 X1\n', (c) => c.charCodeAt(0)));
  await t.scrie(Uint8Array.of(0x3f));
  assert.deepEqual(ws.trimise.map(text), ['G0 X1\n', '?'], 'câte un cadru pe scriere: timpul real în cadrul lui');
  assert.deepEqual(inchideri, []);
});

test('închiderea: WiFi-ul căzut (1006) și controlerul care închide au motivul lor; închiderea noastră, null; scrierea după, refuzată', async () => {
  for (const [code, asteptat] of [[1006, 'retea-cazuta'], [1001, 'retea-inchisa:1001'], [1000, 'retea-inchisa:1000']] as const) {
    const p = deschideRetea(adresa('192.168.1.50'), 'fluidnc', { creeaza });
    WsFals.ultimul?.deschide();
    const t = await p;
    const inchideri: (string | null)[] = [];
    t.porneste(() => undefined, (m) => { inchideri.push(m); });
    WsFals.ultimul?.cade(code);
    assert.deepEqual(inchideri, [asteptat], String(code));
    await assert.rejects(t.scrie(Uint8Array.of(0x3f)), /retea-inchisa/);
  }
  const p = deschideRetea(adresa('192.168.1.50'), 'fluidnc', { creeaza });
  const ws = WsFals.ultimul;
  ws?.deschide();
  const t = await p;
  const inchideri: (string | null)[] = [];
  t.porneste(() => undefined, (m) => { inchideri.push(m); });
  await t.inchide();
  assert.deepEqual([inchideri, ws?.inchisCu], [[null], 1000]);
});

test('deschiderea care nu reușește: controlerul nu răspunde, timpul trece, permisiunea rețelei locale refuzată (spusă ca atare)', async () => {
  const p1 = deschideRetea(adresa('192.168.1.50'), 'fluidnc', { creeaza, permisiune: () => Promise.resolve('granted') });
  WsFals.ultimul?.onerror?.();
  WsFals.ultimul?.cade(1006);
  await assert.rejects(p1, /^Error: retea-nedeschis$/);

  const p2 = deschideRetea(adresa('192.168.1.50'), 'fluidnc', { creeaza, permisiune: () => Promise.resolve('denied') });
  WsFals.ultimul?.cade(1006);
  await assert.rejects(p2, /^Error: retea-permisiune$/);

  // Fără răspuns (nici deschis, nici închis): după timp, conexiunea se închide de noi și deschiderea cade cu motivul ei.
  const p3 = deschideRetea(adresa('192.168.1.50'), 'fluidnc', { creeaza, timpMs: 5 });
  const ws3 = WsFals.ultimul;
  await assert.rejects(p3, /^Error: retea-timp$/);
  assert.equal(ws3?.inchisCu, 1000);

  // O conexiune oprită de browser (CSP-ul) dă doar `error`, fără `close`: eșecul vine pe loc, nu după timp.
  const p5 = deschideRetea(adresa('192.168.1.50'), 'fluidnc', { creeaza, permisiune: () => Promise.resolve('granted') });
  WsFals.ultimul?.onerror?.();
  await assert.rejects(p5, /^Error: retea-nedeschis$/);

  // Un browser fără întrebarea permisiunii (sau o întrebare care aruncă): motivul obișnuit.
  const p4 = deschideRetea(adresa('192.168.1.50'), 'fluidnc', { creeaza, permisiune: () => Promise.reject(new TypeError('nume necunoscut')) });
  WsFals.ultimul?.cade(1006);
  await assert.rejects(p4, /^Error: retea-nedeschis$/);
});

test('sesiunea prin rețea: jurnalul spune WiFi; legătura căzută în timpul programului e ca un cablu scos (pierdut, cu motivul)', async () => {
  const ceas = new CeasFals();
  const s = new SesiuneMasina(ceas);
  const p = deschideRetea(adresa('192.168.1.50'), 'fluidnc', { creeaza });
  const ws = WsFals.ultimul;
  ws?.deschide();
  await s.conecteaza(await p);
  assert.deepEqual([s.stare().transport, s.stare().jurnal[0]], ['retea', { fel: 'sesiune', text: '', cod: 'conectat-retea' }]);
  ws?.onmessage?.({ data: 'CURRENT_ID:0' });
  ws?.onmessage?.({ data: "\r\nGrbl 1.1h ['$' for help]\r\n" });
  assert.ok(s.stare().jurnal.some((l) => l.fel === 'primit' && l.text === "Grbl 1.1h ['$' for help]"));
  assert.ok(!s.stare().jurnal.some((l) => l.text.includes('CURRENT_ID')), 'controlul nu ajunge în jurnal');
  const prog = await incarcaProgram(octeti(`G54\n${'G0 X1\nG0 X0\n'.repeat(20)}`), { sursa: 'fisier' });
  assert.ok(prog.ok);
  if (!prog.ok) return;
  s.eveniment({ tip: 'incarca', program: prog.program });
  s.eveniment({ tip: 'start' });
  await ceas.avanseaza(0);
  assert.equal(s.stare().flux.faza, 'trimite');
  assert.ok((ws?.trimise.length ?? 0) > 0, 'liniile au plecat în cadre');
  ws?.cade(1006);
  assert.deepEqual([s.stare().conexiune, s.stare().eroare, s.stare().flux.faza, s.stare().flux.motiv], ['deconectat', 'retea-cazuta', 'pierdut', 'deconectat']);
});
