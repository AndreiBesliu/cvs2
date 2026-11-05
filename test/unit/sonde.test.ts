/**
 * Probele de rețea (ADR 0136, felia 3.6f), pe o rețea falsă: gazde care nu există, care refuză, care tac după deschidere,
 * podul ESP3D 3.0.2 (`[ESP800]json` în bucăți, cu o linie GRBL între ele; `[ESP105]`, `[ESP410]`, scrierile, `[ESP110]` care
 * taie legătura) și un controler GRBL (`?`). Ce pleacă spre gazde se citește octet cu octet: un controler primește doar `?`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { comenziPod, type Gazda } from '../../src/machine/conexiuni.ts';
import { deschideConexiune, deschidePod, RefuzPod, sondeaza, sondeazaGazda, type OptiuniSonda } from '../../src/machine/sonde.ts';
import { adresaRetea, type AdresaRetea, type WebSocketMinim } from '../../src/machine/websocket.ts';

const binar = (s: string): ArrayBuffer => new TextEncoder().encode(s).buffer as ArrayBuffer;
const text = (o: Uint8Array): string => new TextDecoder().decode(o);
const dupa = (f: () => void): void => { setTimeout(f, 0); };

/** Ce face o gazdă a rețelei false: se deschide (sau refuză), apoi răspunde la ce primește. */
type Gazdafalsa = { readonly deschide: 'da' | 'refuz' | 'tarziu'; raspunde(primit: string, ws: WsFals): void };

class WsFals implements WebSocketMinim {
  binaryType = 'blob';
  readyState = 0;
  readonly trimise: string[] = [];
  inchisCu: number | null = null;
  onopen: (() => void) | null = null;
  onmessage: ((e: { readonly data: unknown }) => void) | null = null;
  onclose: ((e: { readonly code: number; readonly reason: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  readonly url: string;
  readonly subprotocol: string | null;
  private readonly g: Gazdafalsa | undefined;
  constructor(url: string, subprotocol: string | null, g: Gazdafalsa | undefined) {
    this.url = url;
    this.subprotocol = subprotocol;
    this.g = g;
    if (g?.deschide === 'da') dupa(() => { if (this.readyState === 0) { this.readyState = 1; this.onopen?.(); } });
    else if (g?.deschide === 'tarziu') setTimeout(() => { if (this.readyState === 0) { this.readyState = 1; this.onopen?.(); } }, 15);
    else if (g?.deschide === 'refuz') dupa(() => { this.readyState = 3; this.onerror?.(); this.onclose?.({ code: 1006, reason: '' }); });
    // Fără gazdă: nici deschis, nici închis (o adresă la care nu răspunde nimeni).
  }
  send(d: Uint8Array): void {
    if (this.readyState !== 1) throw new Error('nedeschis');
    const s = text(d);
    this.trimise.push(s);
    dupa(() => { if (this.readyState === 1) this.g?.raspunde(s, this); });
  }
  close(code = 1000): void { if (this.readyState === 3) return; this.inchisCu = code; this.readyState = 3; this.onclose?.({ code, reason: '' }); }
  primeste(s: string): void { if (this.readyState === 1) this.onmessage?.({ data: binar(s) }); }
  cade(): void { if (this.readyState === 3) return; this.readyState = 3; this.onclose?.({ code: 1006, reason: '' }); }
}

/** Rețeaua falsă: gazda:portul → ce face; fiecare WebSocket deschis rămâne în `socketuri`. */
function retea(gazde: Record<string, Gazdafalsa>): { readonly socketuri: WsFals[]; readonly opt: OptiuniSonda } {
  const socketuri: WsFals[] = [];
  return {
    socketuri,
    opt: {
      creeaza: (url, p) => {
        const u = new URL(url);
        const ws = new WsFals(url, p, gazde[`${u.hostname}:${u.port}`]);
        socketuri.push(ws);
        return ws;
      },
      permisiune: () => Promise.resolve('granted'),
      timpDeschidereMs: 40,
      timpRaspunsMs: 40,
    },
  };
}

const BUCATI_800 = (versiune = '3.0.2', tinta = 'grbl', mod = 'STA'): string[] => [
  '{"cmd":"800","status":"ok","data":{', `"FWVersion":"${versiune}"`, `,"FWTarget":"${tinta}"`, ',"WebSocketIP":"192.168.1.47"',
  ',"Hostname":"esp3d"', `,"WiFiMode":"${mod}"`, '}}',
];
const scoateEscape = (v: string): string => v.replace(/\\(.)/g, '$1');

/** Podul ESP3D 3.0.2 fals: răspunsul la `[ESP800]` în bucăți (cu o linie GRBL între ele), scrierile ținute minte. */
function podFals(o: { versiune?: string; tinta?: string; refuza?: number; taceLa110?: boolean } = {}): Gazdafalsa & { readonly scrise: [number, string][] } {
  const scrise: [number, string][] = [];
  return {
    deschide: 'da',
    scrise,
    raspunde(primit, ws) {
      const m = /^\[ESP(\d+)\](.*?) ?json\n$/.exec(primit);
      if (primit === '[ESP410]\n') {
        for (const l of ['Start Scan\n', 'Vecin\t40%\tSecure\n', '<Idle|MPos:0.000,0.000,0.000|FS:0,0>\r\n', 'Atelier COSTEL\t87%\tSecure\n', 'Musafiri\t20%\tOpen\n', 'End Scan\n']) ws.primeste(l);
        return;
      }
      if (!m) return;
      const nr = Number(m[1]);
      const valoare = scoateEscape(m[2] ?? '');
      if (nr === 800) {
        const b = BUCATI_800(o.versiune, o.tinta);
        b.forEach((x, k) => { ws.primeste(x); if (k === 2) ws.primeste('<Idle|MPos:0.000,0.000,0.000|FS:0,0>\r\n'); });
        return;
      }
      if (nr === 105 && valoare === '') { ws.primeste('{"cmd":"105","status":"ok","data":"ESP3D"}\n'); return; }
      if (nr === 110) {
        if (o.taceLa110) return;
        ws.primeste('{"cmd":"110","status":"ok","data":"ok"}\n');
        dupa(() => { ws.cade(); });
        return;
      }
      scrise.push([nr, valoare]);
      ws.primeste(o.refuza === nr ? `{"cmd":"${nr}","status":"error","data":"Invalid parameter"}\n` : `{"cmd":"${nr}","status":"ok","data":"ok"}\n`);
    },
  };
}
const grblFals = (): Gazdafalsa => ({
  deschide: 'da',
  raspunde(primit, ws) { if (primit === '?') ws.primeste('<Idle|MPos:0.000,0.000,0.000|FS:0,0>\r\n'); },
});
const tacut: Gazdafalsa = { deschide: 'da', raspunde() { /* nimic */ } };
const refuz: Gazdafalsa = { deschide: 'refuz', raspunde() { /* nimic */ } };

const adr = (x: string, port: number): AdresaRetea => {
  const r = adresaRetea(x, port);
  assert.ok(r.ok);
  return r.ok ? r.adresa : { url: '', gazda: '', port: 0 };
};
const POD = { port: 8282, fel: 'esp3d', profil: 'esp3d' } as const;
const GRBL = { port: 81, fel: 'grbl', profil: 'fluidnc' } as const;

test('sonda podului: WebSocket-ul de date (arduino), doar [ESP800] json trimis, răspunsul în bucăți cu o linie GRBL între ele; închisă la capăt', async () => {
  const r = retea({ '192.168.1.47:8282': podFals() });
  const rez = await sondeaza(adr('192.168.1.47', 8282), POD, r.opt);
  assert.ok(rez.ok);
  assert.deepEqual(rez.ok ? rez.gasit.pod : null, { versiune: '3.0.2', tinta: 'grbl', nume: 'esp3d', ip: '192.168.1.47', mod: 'STA' });
  assert.deepEqual(r.socketuri.map((w) => [w.url, w.subprotocol, w.trimise, w.inchisCu]), [['ws://192.168.1.47:8282/', 'arduino', ['[ESP800] json\n'], 1000]]);
});

test('sonda podului: altă versiune sau altă țintă e un răspuns (cu ce spune podul); ceva care tace după deschidere, „tacut”', async () => {
  const r = retea({ 'a.local:8282': podFals({ versiune: '3.1.0' }), 'b.local:8282': podFals({ tinta: 'marlin' }), 'c.local:8282': tacut });
  const v = await sondeaza(adr('a.local', 8282), POD, r.opt);
  assert.deepEqual(v.ok ? null : [v.motiv, v.pod?.versiune], ['versiune', '3.1.0']);
  const t = await sondeaza(adr('b.local', 8282), POD, r.opt);
  assert.deepEqual(t.ok ? null : [t.motiv, t.pod?.tinta], ['tinta', 'marlin']);
  assert.deepEqual(await sondeaza(adr('c.local', 8282), POD, r.opt), { ok: false, motiv: 'tacut' });
  assert.deepEqual(r.socketuri.map((w) => w.inchisCu), [1000, 1000, 1000]);
});

test('sonda: fără gazdă (timpul), refuzul, permisiunea rețelei locale refuzată', async () => {
  const r = retea({ 'refuza.local:8282': refuz });
  assert.deepEqual(await sondeaza(adr('nimeni.local', 8282), POD, r.opt), { ok: false, motiv: 'retea-timp' });
  assert.deepEqual(await sondeaza(adr('refuza.local', 8282), POD, r.opt), { ok: false, motiv: 'retea-nedeschis' });
  assert.deepEqual(await sondeaza(adr('refuza.local', 8282), POD, { ...r.opt, permisiune: () => Promise.resolve('denied') }), { ok: false, motiv: 'retea-permisiune' });
});

test('sonda unui controler GRBL: un singur octet, ?, în cadrul lui; mesajul de control text (FluidNC) nu e răspunsul', async () => {
  const fluid: Gazdafalsa = {
    deschide: 'da',
    raspunde(primit, ws) { ws.onmessage?.({ data: 'CURRENT_ID:0' }); if (primit === '?') dupa(() => { ws.primeste('<Idle|MPos:0.000,0.000,0.000|FS:0,0>\r\n'); }); },
  };
  const r = retea({ 'fluidnc.local:81': fluid, 'tace.local:81': { deschide: 'da', raspunde(_p, ws) { ws.onmessage?.({ data: 'CURRENT_ID:0' }); } } });
  const ok = await sondeaza(adr('fluidnc.local', 81), GRBL, r.opt);
  assert.deepEqual(ok.ok ? [ok.gasit.adresa.url, ok.gasit.pod] : null, ['ws://fluidnc.local:81/', null]);
  assert.deepEqual(await sondeaza(adr('tace.local', 81), GRBL, r.opt), { ok: false, motiv: 'tacut' });
  assert.deepEqual(r.socketuri.map((w) => [w.subprotocol, w.trimise]), [[null, ['?']], [null, ['?']]]);
});

test('sonda oprită: înainte, nicio conexiune; în timpul deschiderii, nimic trimis după', async () => {
  const r = retea({ 'pod.local:8282': { ...podFals(), deschide: 'tarziu' } });
  const oprit = new AbortController();
  oprit.abort();
  assert.deepEqual(await sondeaza(adr('pod.local', 8282), POD, { ...r.opt, semnal: oprit.signal }), { ok: false, motiv: 'oprit' });
  assert.equal(r.socketuri.length, 0);
  const oprire = new AbortController();
  const p = sondeaza(adr('pod.local', 8282), POD, { ...r.opt, semnal: oprire.signal });
  oprire.abort();
  assert.deepEqual(await p, { ok: false, motiv: 'oprit' });
  assert.deepEqual(r.socketuri.map((w) => [w.trimise, w.inchisCu]), [[[], 1000]]);
});

test('o gazdă, pe rând: podul tăcut pe 8282, controlerul pe 81; un pod cu altă versiune oprește încercările (81 nu se mai încearcă)', async () => {
  const g: Gazda = { adresa: '192.168.1.5', incercari: [POD, GRBL] };
  const r = retea({ '192.168.1.5:8282': tacut, '192.168.1.5:81': grblFals(), '192.168.1.6:8282': podFals({ versiune: '3.1.1' }), '192.168.1.6:81': grblFals() });
  const a = await sondeazaGazda(g, r.opt);
  assert.deepEqual(a.ok ? [a.gasit.inc.port, a.gasit.inc.profil] : null, [81, 'fluidnc']);
  const b = await sondeazaGazda({ ...g, adresa: '192.168.1.6' }, r.opt);
  assert.deepEqual(b.ok ? null : b.motiv, 'versiune');
  assert.deepEqual(r.socketuri.map((w) => w.url), ['ws://192.168.1.5:8282/', 'ws://192.168.1.5:81/', 'ws://192.168.1.6:8282/']);
});

test('conexiunea ținută: numele nu răspunde, ultimul IP da; la pod, întâi proba (închisă), apoi transportul senderului, nepornit', async () => {
  const r = retea({ '192.168.1.47:8282': podFals() });
  const rez = await deschideConexiune({ profil: 'esp3d', adresa: 'esp3d.local', port: 8282, ultimIp: '192.168.1.47' }, r.opt);
  assert.ok(rez.ok);
  if (!rez.ok) return;
  assert.deepEqual([rez.adresa.gazda, rez.prinIp, rez.pod?.ip], ['192.168.1.47', true, '192.168.1.47']);
  assert.deepEqual(r.socketuri.map((w) => [w.url, w.trimise.length, w.inchisCu]), [
    ['ws://esp3d.local:8282/', 0, 1000], ['ws://192.168.1.47:8282/', 1, 1000], ['ws://192.168.1.47:8282/', 0, null],
  ]);
  // Transportul e al sesiunii: pornit de ea, primește ieșirea GRBL.
  const primite: string[] = [];
  rez.transport.porneste((o) => { primite.push(text(o)); }, () => undefined);
  r.socketuri[2]?.primeste('ok\r\n');
  assert.deepEqual(primite, ['ok\r\n']);
  await rez.transport.inchide();
});

test('conexiunea ținută: permisiunea refuzată oprește (nu se mai încearcă IP-ul); un controler se deschide direct, fără nimic trimis', async () => {
  // Chrome refuză pe loc o conexiune fără permisiune (ca pe una oprită): starea permisiunii o deosebește.
  const r = retea({ 'esp3d.local:8282': refuz, 'fluidnc.local:81': grblFals() });
  const nu = await deschideConexiune({ profil: 'esp3d', adresa: 'esp3d.local', port: 8282, ultimIp: '192.168.1.47' }, { ...r.opt, permisiune: () => Promise.resolve('denied') });
  assert.deepEqual(nu, { ok: false, motiv: 'retea-permisiune', incercate: ['esp3d.local:8282'] });
  const da = await deschideConexiune({ profil: 'fluidnc', adresa: 'fluidnc.local', port: 81, ultimIp: null }, r.opt);
  assert.deepEqual(da.ok ? [da.adresa.url, da.pod, da.prinIp] : null, ['ws://fluidnc.local:81/', null, false]);
  assert.deepEqual(r.socketuri.slice(1).map((w) => w.trimise), [[]]);
  // Nimic nu răspunde: ultimul motiv, cu adresele încercate.
  const nimic = await deschideConexiune({ profil: 'grblhal', adresa: 'grblhal.local', port: 81, ultimIp: '10.0.0.9' }, r.opt);
  assert.deepEqual(nimic, { ok: false, motiv: 'retea-timp', incercate: ['grblhal.local:81', '10.0.0.9:81'] });
  // Un pod cu altă versiune: motivul lui, cu ce spune podul.
  const r2 = retea({ 'esp3d.local:8282': podFals({ versiune: '3.1.0' }) });
  const alt = await deschideConexiune({ profil: 'esp3d', adresa: 'esp3d.local', port: 8282, ultimIp: null }, r2.opt);
  assert.deepEqual(alt.ok ? null : [alt.motiv, alt.pod?.versiune], ['versiune', '3.1.0']);
});

test('asistentul podului: verificat, numele rețelei proprii, rețelele, cele trei scrieri (valorile ajunse întocmai), apoi trecerea care taie legătura', async () => {
  const pod = podFals();
  const r = retea({ '192.168.0.1:8282': pod });
  const d = await deschidePod(adr('192.168.0.1:8282', 8282), r.opt);
  assert.ok(d.ok);
  if (!d.ok) return;
  assert.equal(d.pod.info.versiune, '3.0.2');
  assert.equal(await d.pod.numeReteaProprie(), 'ESP3D');
  assert.deepEqual((await d.pod.retele()).map((x) => x.ssid), ['Atelier COSTEL', 'Vecin', 'Musafiri']);
  const plan = comenziPod({ retea: 'Atelier COSTEL', parola: 'parola mea\\x', parolaPod: 'pod nou 123' });
  assert.ok(plan.ok);
  for (const c of plan.ok ? plan.comenzi : []) await d.pod.seteaza(c);
  assert.deepEqual(pod.scrise, [[106, 'pod nou 123'], [100, 'Atelier COSTEL'], [101, 'parola mea\\x']]);
  assert.equal(await d.pod.treciPeAtelier(), 'ok');
  await new Promise((gata) => { setTimeout(gata, 5); });
  assert.equal(d.pod.inchisa(), true, 'podul a trecut în rețeaua atelierului: legătura a căzut');
  assert.deepEqual(r.socketuri[0]?.trimise, [
    '[ESP800] json\n', '[ESP105] json\n', '[ESP410]\n', '[ESP106]pod\\ nou\\ 123 json\n', '[ESP100]Atelier\\ COSTEL json\n',
    '[ESP101]parola\\ mea\\\\x json\n', '[ESP110]WIFI-STA json\n',
  ]);
});

test('asistentul podului: un refuz al podului spune comanda; fără răspuns la trecere, „necunoscut”; alt pod nu se deschide', async () => {
  const r = retea({ '192.168.0.1:8282': podFals({ refuza: 100, taceLa110: true }), '192.168.0.2:8282': podFals({ versiune: '2.1.2' }) });
  const d = await deschidePod(adr('192.168.0.1', 8282), { ...r.opt, timpi: { atelier: 30 } });
  assert.ok(d.ok);
  if (!d.ok) return;
  await d.pod.seteaza({ nr: 106, text: '[ESP106]12345678 json\n' });
  await assert.rejects(d.pod.seteaza({ nr: 100, text: '[ESP100]X json\n' }), (e: unknown) => e instanceof RefuzPod && e.nr === 100 && e.date === 'Invalid parameter');
  assert.equal(await d.pod.treciPeAtelier(), 'necunoscut');
  await d.pod.inchide();
  const alt = await deschidePod(adr('192.168.0.2', 8282), r.opt);
  assert.deepEqual(alt.ok ? null : [alt.motiv, alt.info?.versiune], ['versiune', '2.1.2']);
  assert.equal(r.socketuri[1]?.inchisCu, 1000);
  // O citire în loc de scriere (podul răspunde cu valoarea, nu cu „ok”) e tot un refuz.
  const citire: Gazdafalsa = { deschide: 'da', raspunde(p, ws) { if (p.startsWith('[ESP800]')) podFals().raspunde(p, ws); else ws.primeste('{"cmd":"100","status":"ok","data":"Vechea"}\n'); } };
  const r3 = retea({ '192.168.0.3:8282': citire });
  const d3 = await deschidePod(adr('192.168.0.3', 8282), r3.opt);
  assert.ok(d3.ok);
  if (d3.ok) await assert.rejects(d3.pod.seteaza({ nr: 100, text: '[ESP100] json\n' }), (e: unknown) => e instanceof RefuzPod && e.date === 'Vechea');
});

test('fiecare comandă își așteaptă răspunsul ei: un „ok” rămas de la comanda dinainte, cu același număr, nu e răspunsul celei noi', async () => {
  let a100 = 0;
  const pod: Gazdafalsa = {
    deschide: 'da',
    raspunde(p, ws) {
      if (p.startsWith('[ESP800]')) { podFals().raspunde(p, ws); return; }
      a100++;
      ws.primeste(a100 === 1 ? '{"cmd":"100","status":"ok","data":"ok"}\n' : '{"cmd":"100","status":"error","data":"Set value failed"}\n');
    },
  };
  const r = retea({ '192.168.0.1:8282': pod });
  const d = await deschidePod(adr('192.168.0.1', 8282), r.opt);
  assert.ok(d.ok);
  if (!d.ok) return;
  await d.pod.seteaza({ nr: 100, text: '[ESP100]A json\n' });
  await assert.rejects(d.pod.seteaza({ nr: 100, text: '[ESP100]B json\n' }), (e: unknown) => e instanceof RefuzPod && e.date === 'Set value failed');
});
