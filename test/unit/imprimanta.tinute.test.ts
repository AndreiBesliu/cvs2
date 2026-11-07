import assert from 'node:assert/strict';
import test from 'node:test';
import { adresaRetea, type AdresaRetea } from '../../src/machine/reteaLocala.ts';
import { CERERE_STARE, RASPUNS_INIMA } from '../../src/machine/imprimanta/creality.ts';
import type { WebSocketText } from '../../src/machine/imprimanta/sesiune.ts';
import {
  cautaInRetea, citesteImprimante, idImprimanta, MAX_IMPRIMANTE, reteleDeCautat, scrieImprimante, sondeazaImprimanta, tineImprimanta,
  uitaImprimanta, type ImprimantaTinuta,
} from '../../src/machine/imprimanta/tinute.ts';

/*
 * Imprimantele ținute în browser și căutarea lor (ADR 0190 §B.5): citirea tolerantă, ordinea, plafonul; proba unei adrese și
 * căutarea în toată rețeaua, pe o rețea falsă: ce pleacă spre fiecare gazdă (doar citirea stării și `ok`).
 */

test('citirea tolerantă: altă versiune, JSON stricat, rânduri stricate sau adrese pe care browserul le-ar refuza se sar', () => {
  assert.deepEqual(citesteImprimante(null), []);
  assert.deepEqual(citesteImprimante('{nu e JSON'), []);
  // O listă de altă versiune nu se citește, chiar cu rânduri bune (otrava T01 a scăpat cu o listă goală).
  assert.deepEqual(citesteImprimante('{"v":2,"imprimante":[{"adresa":"192.168.1.12","port":9999,"folosita":1}]}'), []);
  assert.deepEqual(citesteImprimante('{"imprimante":[{"adresa":"192.168.1.12","port":9999,"folosita":1}]}'), []);
  assert.deepEqual(citesteImprimante('{"v":1,"imprimante":"nu"}'), []);
  const l = citesteImprimante(JSON.stringify({
    v: 1,
    imprimante: [
      { adresa: '192.168.1.12', port: 9999, model: 'K1C', nume: 'K1C-8578', folosita: 5 },
      { adresa: '192.168.1.12', port: 9999, model: 'dublura', folosita: 9 },
      { adresa: 'k1c.local', port: 9999, model: null, folosita: 7 },
      { adresa: '8.8.8.8', port: 9999, folosita: 8 },
      { adresa: 'imprimanta.exemplu.ro', port: 9999, folosita: 8 },
      { adresa: '192.168.1.13', port: 0 },
      { adresa: 5, port: 9999 },
      null,
    ],
  }));
  assert.deepEqual(l.map((x) => [x.adresa, x.model, x.nume, x.folosita]), [['k1c.local', null, null, 7], ['192.168.1.12', 'K1C', 'K1C-8578', 5]]);
});

test('ținerea: cea legată acum vine prima, cu ce a spus; un nume necunoscut nu-l șterge pe cel știut; cel mult 8', () => {
  let l: readonly ImprimantaTinuta[] = [];
  l = tineImprimanta(l, { adresa: '192.168.1.12', port: 9999, model: 'K1C', nume: 'K1C-8578' }, 1000);
  l = tineImprimanta(l, { adresa: '192.168.1.20', port: 9999, model: null, nume: null }, 2000);
  l = tineImprimanta(l, { adresa: '192.168.1.12', port: 9999, model: null, nume: null }, 3000);
  assert.deepEqual(l.map((x) => [x.id, x.model, x.nume]), [['192.168.1.12|9999', 'K1C', 'K1C-8578'], ['192.168.1.20|9999', null, null]]);
  for (let k = 0; k < 12; k++) l = tineImprimanta(l, { adresa: `192.168.1.${100 + k}`, port: 9999, model: null, nume: null }, 4000 + k);
  assert.equal(l.length, MAX_IMPRIMANTE);
  assert.equal(l[0]?.adresa, '192.168.1.111');
  // Scrisă și citită înapoi: aceeași listă, în aceeași ordine.
  assert.deepEqual(citesteImprimante(scrieImprimante(l)), l);
  assert.deepEqual(uitaImprimanta(l, idImprimanta('192.168.1.111', 9999)).map((x) => x.adresa)[0], '192.168.1.110');
  // Același „folosita” la două ținute la rând (ceasul n-a mers): ordinea rămâne a ultimei.
  const a = tineImprimanta(tineImprimanta([], { adresa: '10.0.0.2', port: 9999, model: null, nume: null }, 5), { adresa: '10.0.0.3', port: 9999, model: null, nume: null }, 5);
  assert.deepEqual(citesteImprimante(scrieImprimante(a)).map((x) => x.adresa), ['10.0.0.3', '10.0.0.2']);
  // Ceasul dat înapoi (ora calculatorului schimbată): cea legată ultima rămâne prima și după citirea înapoi (otrava T06 a scăpat).
  const b = tineImprimanta(tineImprimanta([], { adresa: '10.0.0.2', port: 9999, model: null, nume: null }, 10_000), { adresa: '10.0.0.3', port: 9999, model: null, nume: null }, 5_000);
  assert.deepEqual(citesteImprimante(scrieImprimante(b)).map((x) => x.adresa), ['10.0.0.3', '10.0.0.2']);
});

test('IP-ul schimbat (3.6i): aceeași imprimantă, după nume, la altă adresă ia locul intrării vechi; numele necunoscut nu șterge nimic', () => {
  let l: readonly ImprimantaTinuta[] = [];
  l = tineImprimanta(l, { adresa: '192.168.1.12', port: 9999, model: 'K1C', nume: 'K1C-8578' }, 1000);
  l = tineImprimanta(l, { adresa: '192.168.1.40', port: 9999, model: 'K1', nume: 'K1-1234' }, 2000);
  l = tineImprimanta(l, { adresa: '192.168.1.10', port: 9999, model: 'K1C', nume: 'K1C-8578' }, 3000);
  l = tineImprimanta(l, { adresa: '192.168.1.7', port: 9999, model: 'K1C', nume: 'K1C-8578' }, 4000);
  assert.deepEqual(l.map((x) => [x.adresa, x.nume]), [['192.168.1.7', 'K1C-8578'], ['192.168.1.40', 'K1-1234']]);
  // Fără nume (încă nespus), o adresă nouă nu scoate pe nimeni.
  l = tineImprimanta(l, { adresa: '192.168.1.50', port: 9999, model: null, nume: null }, 5000);
  assert.equal(l.length, 3);
});

test('căutarea după nume (3.6i): doar imprimanta cu numele dat; alta, găsită înainte, se sare', async () => {
  const fabrica = (url: string): WsFals => {
    const w = new WsFals(url);
    const raspuns = url === 'ws://10.0.8.3:9999/' ? '{"model":"K1","hostname":"K1-1234"}'
      : url === 'ws://10.0.8.7:9999/' ? '{"model":"K1C","hostname":"K1C-8578"}' : null;
    setTimeout(() => {
      if (raspuns !== null) { w.readyState = 1; w.onopen?.(); w.onmessage?.({ data: raspuns }); }
      else { w.onerror?.(); w.onclose?.({ code: 1006 }); }
    }, 1);
    return w;
  };
  assert.deepEqual(await cautaInRetea(['10.0.8'], { fabrica, permisiune: permisa, nume: 'K1C-8578' }), { adresa: adresa('10.0.8.7'), model: 'K1C', nume: 'K1C-8578' });
  assert.deepEqual(await cautaInRetea(['10.0.8'], { fabrica, permisiune: permisa }), { adresa: adresa('10.0.8.3'), model: 'K1', nume: 'K1-1234' });
  assert.equal(await cautaInRetea(['10.0.8'], { fabrica, permisiune: permisa, nume: 'K1C-0000' }), null);
});

test('rețelele de căutat: /24 ale IP-urilor știute; altfel 192.168.0 și 192.168.1', () => {
  assert.deepEqual(reteleDeCautat([]), ['192.168.0', '192.168.1']);
  assert.deepEqual(reteleDeCautat(['192.168.1.12', '192.168.1.40', '10.0.5.7', 'k1c.local', '127.0.3.5']), ['192.168.1', '10.0.5', '127.0.3']);
});

class WsFals implements WebSocketText {
  readyState = 0;
  readonly trimise: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((e: { readonly data: unknown }) => void) | null = null;
  onclose: ((e: { readonly code: number }) => void) | null = null;
  onerror: (() => void) | null = null;
  inchis = false;
  readonly url: string;
  constructor(url: string) { this.url = url; }
  send(t: string): void { this.trimise.push(t); }
  close(): void { this.inchis = true; this.readyState = 3; }
}

const adresa = (t: string): AdresaRetea => { const a = adresaRetea(t, 9999); if (!a.ok) throw new Error(t); return a.adresa; };
const permisa = (): Promise<string | null> => Promise.resolve('granted');

test('proba unei adrese: doar citirea stării și `ok`; modelul și numele, din răspuns', async () => {
  const ws: WsFals[] = [];
  const fabrica = (url: string): WsFals => {
    const w = new WsFals(url);
    ws.push(w);
    setTimeout(() => {
      w.readyState = 1;
      w.onopen?.();
      w.onmessage?.({ data: '{"ModeCode":"heart_beat"}' });
      setTimeout(() => { w.onmessage?.({ data: '{"model":"K1C","hostname":"K1C-8578","state":0}' }); }, 20);
    }, 5);
    return w;
  };
  const r = await sondeazaImprimanta(adresa('192.168.1.12'), { fabrica, permisiune: permisa, timpDeschidereMs: 500, timpRaspunsMs: 500 });
  assert.deepEqual(r, { ok: true, gasita: { adresa: adresa('192.168.1.12'), model: 'K1C', nume: 'K1C-8578' } });
  assert.deepEqual(ws[0]?.trimise, [CERERE_STARE, RASPUNS_INIMA]);
  assert.equal(ws[0]?.inchis, true);
});

test('proba unei adrese: ceva care tace, nimic la adresă, permisiunea refuzată, oprirea', async () => {
  const deschis = (url: string): WsFals => { const w = new WsFals(url); setTimeout(() => { w.readyState = 1; w.onopen?.(); w.onmessage?.({ data: 'ok' }); }, 5); return w; };
  assert.deepEqual(await sondeazaImprimanta(adresa('192.168.1.5'), { fabrica: deschis, permisiune: permisa, timpRaspunsMs: 50 }), { ok: false, motiv: 'tacut' });
  const mort = (url: string): WsFals => { const w = new WsFals(url); setTimeout(() => { w.onerror?.(); w.onclose?.({ code: 1006 }); }, 5); return w; };
  assert.deepEqual(await sondeazaImprimanta(adresa('192.168.1.6'), { fabrica: mort, permisiune: permisa }), { ok: false, motiv: 'retea-nedeschis' });
  assert.deepEqual(await sondeazaImprimanta(adresa('192.168.1.6'), { fabrica: mort, permisiune: () => Promise.resolve('denied') }), { ok: false, motiv: 'retea-permisiune' });
  const tacut = (url: string): WsFals => new WsFals(url);
  assert.deepEqual(await sondeazaImprimanta(adresa('192.168.1.7'), { fabrica: tacut, permisiune: permisa, timpDeschidereMs: 30 }), { ok: false, motiv: 'retea-timp' });
  const c = new AbortController();
  const p = sondeazaImprimanta(adresa('192.168.1.8'), { fabrica: tacut, permisiune: permisa, semnal: c.signal });
  c.abort();
  assert.deepEqual(await p, { ok: false, motiv: 'oprit' });
});

test('căutarea în toată rețeaua: 9999 pe fiecare gazdă; prima imprimantă găsită oprește restul; progresul', async () => {
  const urls: string[] = [];
  const fabrica = (url: string): WsFals => {
    urls.push(url);
    const w = new WsFals(url);
    setTimeout(() => {
      if (url === 'ws://10.0.5.77:9999/') { w.readyState = 1; w.onopen?.(); w.onmessage?.({ data: '{"model":"K1C","hostname":"K1C-8578"}' }); }
      else { w.onerror?.(); w.onclose?.({ code: 1006 }); }
    }, 1);
    return w;
  };
  let ultimProgres: readonly [number, number] = [0, 0];
  const g = await cautaInRetea(['10.0.5'], { fabrica, permisiune: permisa, laProgres: (n, total) => { ultimProgres = [n, total]; } });
  assert.deepEqual(g, { adresa: adresa('10.0.5.77'), model: 'K1C', nume: 'K1C-8578' });
  assert.ok(urls.every((u) => /^ws:\/\/10\.0\.5\.\d+:9999\/$/.test(u)), 'doar portul 9999, doar rețeaua dată');
  assert.ok(urls.length >= 77 && urls.length < 254, `${urls.length} gazde încercate`);
  assert.equal(ultimProgres[1], 254);
  // Nimic găsit: null, după toate gazdele.
  const nimic = await cautaInRetea(['10.0.6'], { fabrica, permisiune: permisa });
  assert.equal(nimic, null);
});

test('căutarea cu permisiunea neîntrebată: întâi o singură gazdă (cât omul răspunde browserului), apoi restul', async () => {
  const urls: string[] = [];
  let deschise = 0;
  let maxDeodata = 0;
  let cuPrima = -1;
  const fabrica = (url: string): WsFals => {
    urls.push(url);
    deschise++;
    maxDeodata = Math.max(maxDeodata, deschise);
    const w = new WsFals(url);
    // Prima gazdă răspunde greu (omul citește întrebarea browserului): cât e în curs, nicio altă gazdă nu se încearcă.
    const prima = urls.length === 1;
    setTimeout(() => { if (prima) cuPrima = urls.length; deschise--; w.onerror?.(); w.onclose?.({ code: 1006 }); }, prima ? 40 : 2);
    return w;
  };
  const g = await cautaInRetea(['10.0.7'], { fabrica, permisiune: () => Promise.resolve('prompt') });
  assert.equal(g, null);
  assert.equal(urls[0], 'ws://10.0.7.1:9999/');
  assert.equal(cuPrima, 1, 'cât prima gazdă e în curs, nicio alta');
  assert.equal(urls.length, 254);
  assert.ok(maxDeodata <= 32, `cel mult 32 deodată (${maxDeodata})`);
});
