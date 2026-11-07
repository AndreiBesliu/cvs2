import assert from 'node:assert/strict';
import test from 'node:test';
import { CSP } from '../../shared/csp.ts';
import type { FisierImprimanta } from '../../src/machine/imprimanta/creality.ts';
import { CERERI_LISTA, numeDeTrimis, urca, type ListaImprimantei } from '../../src/machine/imprimanta/urcare.ts';
import { adresaRetea, type AdresaRetea } from '../../src/machine/reteaLocala.ts';

/*
 * Trimiterea unui `.gcode` (ADR 0190 §C.7, felia 3.6h): numele (fără spații, doar `.gcode`, niciodată unul din listă), cererea
 * exactă (`POST /upload/<nume>`, multipart, doar câmpul `file`, `no-cors`, pe portul 80) și verificarea în lista imprimantei;
 * CSP-ul, cu `http:` în `connect-src`.
 */

const adresa = (t: string): AdresaRetea => {
  const a = adresaRetea(t, 9999);
  assert.ok(a.ok);
  return a.adresa;
};

const fisier = (nume: string): FisierImprimanta => ({ nume, cale: `/usr/data/printer_data/gcodes/${nume}`, timp: null, material: null });

/** Lista imprimantei, falsă: la fiecare cerere, după o clipă, are ce i s-a spus să aibă. */
function listaFalsa(dupaCerere: () => readonly FisierImprimanta[] | null): ListaImprimantei & { cereri: number } {
  let fisiere: readonly FisierImprimanta[] | null = [];
  const l = {
    cereri: 0,
    stare: () => ({ fisiere }),
    reimprospateaza: () => {
      l.cereri++;
      setTimeout(() => { fisiere = dupaCerere(); }, 1);
      return true;
    },
  };
  return l;
}

type Cerere = { readonly url: string; readonly init: RequestInit & { targetAddressSpace?: string } };
function fetchFals(raspunde: (c: Cerere) => Promise<void> = () => Promise.resolve()): { readonly trimite: typeof fetch; readonly cereri: Cerere[] } {
  const cereri: Cerere[] = [];
  const trimite = ((url: string, init: Cerere['init']) => {
    const c = { url, init };
    cereri.push(c);
    return raspunde(c).then(() => new Response(null));
  }) as unknown as typeof fetch;
  return { trimite, cereri };
}

test('numele: spațiile devin _, doar .gcode, cu nume; unul din listă primește -2, -3 (nu se înlocuiește); fără bare oblice', () => {
  assert.equal(numeDeTrimis('piesa mica.gcode', []), 'piesa_mica.gcode');
  assert.equal(numeDeTrimis('  cub.GCODE ', []), 'cub.GCODE');
  assert.equal(numeDeTrimis('cub.gcode', ['cub.gcode']), 'cub-2.gcode');
  assert.equal(numeDeTrimis('cub.gcode', ['cub.gcode', 'cub-2.gcode']), 'cub-3.gcode');
  assert.equal(numeDeTrimis('cub.gcode', ['cub-2.gcode']), 'cub.gcode');
  for (const rau of ['poza.png', '.gcode', 'cub.gcode.txt', 'a/b.gcode', 'a\\b.gcode', `${'x'.repeat(250)}.gcode`]) {
    assert.equal(numeDeTrimis(rau, []), null, rau);
  }
  // Un nume la limită (255) căruia sufixul i-ar trece de ea; și unul cu toate sufixele luate, până la 999.
  const lung = `${'x'.repeat(249)}.gcode`;
  assert.equal(numeDeTrimis(lung, []), lung);
  assert.equal(numeDeTrimis(lung, [lung]), null);
  assert.equal(numeDeTrimis('cub.gcode', ['cub.gcode', ...Array.from({ length: 998 }, (_, i) => `cub-${i + 2}.gcode`)]), null);
  assert.equal(numeDeTrimis('cub.gcode', ['cub.gcode', ...Array.from({ length: 997 }, (_, i) => `cub-${i + 2}.gcode`)]), 'cub-999.gcode');
});

test('cererea: POST pe portul 80, la /upload/<nume codat>, multipart doar cu fișierul, no-cors; spre rețeaua locală o spune dinainte', async () => {
  const { trimite, cereri } = fetchFals();
  const date = new Blob(['G90\nG1 X1 Y1\n']);
  const r = await urca({ adresa: adresa('192.168.1.12'), nume: 'cub_#1.gcode', date, lista: listaFalsa(() => [fisier('cub_#1.gcode')]), trimite, asteptareMs: 50 });
  assert.deepEqual(r, { ok: true, fisier: fisier('cub_#1.gcode') });
  assert.equal(cereri.length, 1);
  const c = cereri[0]!;
  assert.equal(c.url, 'http://192.168.1.12/upload/cub_%231.gcode');
  assert.equal(c.init.method, 'POST');
  assert.equal(c.init.mode, 'no-cors');
  assert.equal(c.init.targetAddressSpace, 'local');
  assert.equal(c.init.headers, undefined);
  const fd = c.init.body as FormData;
  assert.deepEqual([...fd.keys()], ['file']);
  const f = fd.get('file') as File;
  assert.equal(f.name, 'cub_#1.gcode');
  assert.equal(await f.text(), 'G90\nG1 X1 Y1\n');
  // Spre calculator (proba își ține acolo imprimanta falsă), fără adnotare; IPv6, între paranteze; un nume .local, adnotat.
  const alte = fetchFals();
  for (const a of ['127.0.3.5', 'localhost', '[::1]', '[fd00::5]', 'k1c.local']) {
    await urca({ adresa: adresa(a), nume: 'a.gcode', date, lista: listaFalsa(() => [fisier('a.gcode')]), trimite: alte.trimite, asteptareMs: 50 });
  }
  assert.deepEqual(alte.cereri.map((x) => [x.url, x.init.targetAddressSpace ?? null]), [
    ['http://127.0.3.5/upload/a.gcode', null], ['http://localhost/upload/a.gcode', null], ['http://[::1]/upload/a.gcode', null],
    ['http://[fd00::5]/upload/a.gcode', 'local'], ['http://k1c.local/upload/a.gcode', 'local'],
  ]);
});

test('verificarea: lista cerută din nou până apare numele; dacă nu apare, „lipsa” după câteva cereri; o cerere căzută, „retea”', async () => {
  let k = 0;
  const tarziu = listaFalsa(() => (++k >= 2 ? [fisier('altul.gcode'), fisier('x.gcode')] : [fisier('altul.gcode')]));
  const r = await urca({ adresa: adresa('192.168.1.12'), nume: 'x.gcode', date: new Blob(['G1 X1']), lista: tarziu, trimite: fetchFals().trimite, asteptareMs: 30 });
  assert.equal(r.ok, true);
  assert.equal(tarziu.cereri, 2);
  const niciodata = listaFalsa(() => [fisier('altul.gcode')]);
  assert.deepEqual(
    await urca({ adresa: adresa('192.168.1.12'), nume: 'x.gcode', date: new Blob(['G1 X1']), lista: niciodata, trimite: fetchFals().trimite, asteptareMs: 10 }),
    { ok: false, motiv: 'lipsa' },
  );
  assert.equal(niciodata.cereri, CERERI_LISTA);
  const caz = listaFalsa(() => [fisier('x.gcode')]);
  const cade = fetchFals(() => Promise.reject(new TypeError('Failed to fetch')));
  assert.deepEqual(
    await urca({ adresa: adresa('192.168.1.12'), nume: 'x.gcode', date: new Blob(['G1 X1']), lista: caz, trimite: cade.trimite, asteptareMs: 10 }),
    { ok: false, motiv: 'retea' },
  );
  // Fără trimitere, lista nu se mai cere.
  assert.equal(caz.cereri, 0);
});

test('oprită de om: în timpul cererii sau al verificării, promisiunea respinge cu motivul semnalului', async () => {
  const c1 = new AbortController();
  const agata = fetchFals((c) => new Promise((_, nu) => { c.init.signal?.addEventListener('abort', () => { nu(c.init.signal?.reason); }); }));
  const p1 = urca({ adresa: adresa('192.168.1.12'), nume: 'x.gcode', date: new Blob(['G1']), lista: listaFalsa(() => []), trimite: agata.trimite, semnal: c1.signal });
  c1.abort(new Error('renunță'));
  await assert.rejects(p1, /renunță/);
  const c2 = new AbortController();
  const lista = listaFalsa(() => []);
  const p2 = urca({ adresa: adresa('192.168.1.12'), nume: 'x.gcode', date: new Blob(['G1']), lista, trimite: fetchFals().trimite, semnal: c2.signal, asteptareMs: 5000 });
  await new Promise((g) => { setTimeout(g, 20); });
  c2.abort(new Error('închis'));
  await assert.rejects(p2, /închis/);
  assert.equal(lista.cereri, 1);
});

test('CSP-ul: http: în connect-src (fișierul urcă pe HTTP), lângă ws: (legătura de pe 9999)', () => {
  const connect = (CSP.split(';').map((d) => d.trim().split(/\s+/)).find((d) => d[0] === 'connect-src') ?? []).slice(1);
  assert.ok(connect.includes('http:'));
  assert.ok(connect.includes('ws:'));
});
