/**
 * Primirea unei lucrări (ADR 0126, protocolul „cvs2-lucrare” v1): forma mesajului și limitele, verificarea fiecărui fișier
 * ca unul adus cu „Fișier…” (M6 refuzat, amprenta cerută), ascultarea doar a ferestrei care a deschis fila.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { ANCORA, LIMITE, ascultaLucrari, citesteLucrare, primit, verificaLucrare, type FereastraPrimire } from '../../src/app/primireLucrare.ts';

const sha = (t: string): string => createHash('sha256').update(Buffer.from(t, 'utf8')).digest('hex');
const PROG = 'G90 G17 G21 G94\nG54\n(scula T1 freza dreapta D6.000)\nM3 S18000\nG0 Z5\nG0 X10 Y10\nG1 Z-1 F300\nG1 X20 F1000\nG0 Z5\nM5\nM2\n';
const fisier = (nume: string, text = PROG, amprenta = sha(text)) => ({ nume, text, sha256: amprenta });
const lucrare = (fisiere: unknown[], extra: Record<string, unknown> = {}) => ({
  protocol: 'cvs2-lucrare', versiune: 1, tip: 'lucrare', id: 'l1', de_la: { aplicatie: 'Planificator Trenuleț', versiune: '11' },
  titlu: 'Oval', fisiere, ...extra,
});

test('o lucrare bună se citește, în ordine, cu câmpurile cunoscute; titlul lung se taie', () => {
  const r = citesteLucrare(lucrare([{ ...fisier('placa_1_T1.nc'), rol: 'placa', placa: 1, fata: null, scula: 'T1 freza dreapta D6.000', timp_s: 7003 }, fisier('calibrare_T1.nc')]));
  assert.ok(r.ok);
  assert.deepEqual(r.lucrare.fisiere.map((f) => f.nume), ['placa_1_T1.nc', 'calibrare_T1.nc']);
  assert.equal(r.lucrare.fisiere[0]?.placa, 1);
  assert.equal(r.lucrare.fisiere[0]?.fata, undefined);
  assert.equal(r.lucrare.fisiere[0]?.timp_s, 7003);
  assert.deepEqual(r.lucrare.de_la, { aplicatie: 'Planificator Trenuleț', versiune: '11' });
  const lung = citesteLucrare(lucrare([fisier('a.nc')], { titlu: 'x'.repeat(LIMITE.titlu + 50) }));
  assert.ok(lung.ok);
  assert.equal(lung.lucrare.titlu.length, LIMITE.titlu);
  const fara = citesteLucrare(lucrare([fisier('a.nc')], { titlu: 7 }));
  assert.ok(fara.ok);
  assert.equal(fara.lucrare.titlu, '');
});

test('forma greșită e refuzată: alt protocol, altă versiune, fără fișiere, nume cu cale sau dublat, amprentă nehex', () => {
  const f = fisier('a.nc');
  for (const x of [
    { ...lucrare([f]), protocol: 'altul' }, { ...lucrare([f]), tip: 'cauta' }, lucrare([f], { versiune: 2 }), lucrare([]),
    lucrare([f], { id: '' }), lucrare([f], { id: 'x'.repeat(81) }), lucrare([f], { de_la: {} }), lucrare([f], { de_la: null }),
    lucrare([{ ...f, nume: '../a.nc' }]), lucrare([{ ...f, nume: 'C:\\a.nc' }]), lucrare([{ ...f, nume: 'ă.nc' }]),
    lucrare([{ ...f, nume: 'a b.nc' }]), lucrare([{ ...f, nume: '..' }]), lucrare([{ ...f, nume: '.' }]), lucrare([f, f]),
    lucrare([{ ...f, sha256: 'ABC' }]), lucrare([{ ...f, sha256: f.sha256.toUpperCase() }]), lucrare([{ ...f, text: 5 }]),
    lucrare([null]), { ...lucrare([]), fisiere: 'fisiere' }, null, 'text',
  ]) assert.equal(citesteLucrare(x).ok, false, JSON.stringify(x).slice(0, 80));
  assert.equal(citesteLucrare(lucrare(Array.from({ length: LIMITE.fisiere }, (_, i) => fisier(`f${i}.nc`)))).ok, true);
  assert.equal(citesteLucrare(lucrare(Array.from({ length: LIMITE.fisiere + 1 }, (_, i) => fisier(`f${i}.nc`)))).ok, false);
});

test('limitele de mărime: un fișier și totalul, chiar la prag și peste', () => {
  const mici = { ...LIMITE, octetiFisier: 10, octetiTotal: 25 };
  const t10 = 'x'.repeat(10);
  assert.equal(citesteLucrare(lucrare([fisier('a.nc', t10)]), mici).ok, true);
  assert.equal(citesteLucrare(lucrare([fisier('a.nc', `${t10}x`)]), mici).ok, false);
  assert.equal(citesteLucrare(lucrare([fisier('a.nc', t10), fisier('b.nc', t10), fisier('c.nc', 'xxxxx')]), mici).ok, true);
  assert.equal(citesteLucrare(lucrare([fisier('a.nc', t10), fisier('b.nc', t10), fisier('c.nc', 'xxxxxx')]), mici).ok, false);
});

test('fiecare fișier trece prin incarcaProgram ca unul străin: M6, CRLF și amprenta greșită sunt refuzate cu codul lor', async () => {
  const m6 = PROG.replace('M3 S18000', 'T2 M6\nM3 S18000');
  const crlf = PROG.replace(/\n/g, '\r\n');
  const r = citesteLucrare(lucrare([fisier('bun.nc'), fisier('m6.nc', m6), fisier('crlf.nc', crlf), fisier('hash.nc', PROG, sha(PROG + ' ')), fisier('bun2.nc')]));
  assert.ok(r.ok);
  const v = await verificaLucrare(r.lucrare);
  assert.deepEqual(v.acceptate.map((f) => [f.nume, f.sha256]), [['bun.nc', sha(PROG)], ['bun2.nc', sha(PROG)]]);
  assert.deepEqual(Buffer.from(v.acceptate[0]?.octeti ?? []).toString('latin1'), PROG);
  assert.deepEqual(v.refuzate, [{ nume: 'm6.nc', cod: 'm6-strain', linie: 3 }, { nume: 'crlf.nc', cod: 'cr', linie: 0 }, { nume: 'hash.nc', cod: 'hash', linie: null }]);
  assert.deepEqual(primit('l1', v), { protocol: 'cvs2-lucrare', versiune: 1, tip: 'primit', id: 'l1', acceptate: ['bun.nc', 'bun2.nc'], refuzate: v.refuzate });
  assert.deepEqual(primit('l1', null), { protocol: 'cvs2-lucrare', versiune: 1, tip: 'primit', id: 'l1', renuntat: true, acceptate: [], refuzate: [] });
});

function fereastra(opener: unknown, hash = ANCORA) {
  const asc: { message: ((ev: Event) => void)[]; hashchange: ((ev: Event) => void)[] } = { message: [], hashchange: [] };
  const w: FereastraPrimire & { location: { hash: string } } = {
    opener, location: { hash },
    addEventListener: (t, f) => { asc[t].push(f); },
    removeEventListener: (t, f) => { asc[t] = asc[t].filter((x) => x !== f); },
  };
  const da = (source: unknown, origin: string, data: unknown): void => { for (const f of asc.message) (f as (ev: unknown) => void)({ source, origin, data }); };
  const schimbaAncora = (h: string): void => { w.location.hash = h; for (const f of asc.hashchange) (f as () => void)(); };
  return { w, asc, da, schimbaAncora };
}

test('ascultarea: „gata” la pornire și la „cauta”, lucrarea doar de la fereastra care a deschis fila, o singură dată', () => {
  const trimise: { m: { tip?: string }; tinta: string }[] = [];
  const opener = { postMessage: (m: { tip?: string }, tinta: string) => { trimise.push({ m, tinta }); } };
  const strain = { postMessage: () => { throw new Error('nu i se răspunde'); } };
  const { w, asc, da } = fereastra(opener);
  const primite: [string, string][] = [];
  const opreste = ascultaLucrari(w, (l, origine, raspunde) => { primite.push([l.id, origine]); raspunde(primit(l.id, null)); });
  assert.deepEqual(trimise.map((t) => [t.m.tip, t.tinta]), [['gata', '*']]);
  da(opener, 'https://claude.ai', { protocol: 'cvs2-lucrare', versiune: 1, tip: 'cauta' });
  assert.deepEqual([trimise.at(-1)?.m.tip, trimise.at(-1)?.tinta], ['gata', 'https://claude.ai']);
  da(strain, 'https://altcineva.example', { protocol: 'cvs2-lucrare', versiune: 1, tip: 'cauta' });
  da(strain, 'https://altcineva.example', lucrare([fisier('a.nc')]));
  da(opener, 'https://claude.ai', { protocol: 'alt-protocol', tip: 'cauta' });
  da(opener, 'https://claude.ai', null);
  assert.equal(primite.length, 0);
  assert.equal(trimise.length, 2);
  da(opener, 'null', lucrare([fisier('a.nc')]));
  da(opener, 'null', lucrare([fisier('a.nc')]));
  assert.deepEqual(primite, [['l1', 'null']]);
  assert.deepEqual([trimise.at(-1)?.m.tip, trimise.at(-1)?.tinta], ['primit', '*']);
  da(opener, 'https://claude.ai', lucrare([fisier('a.nc')], { id: 'l2' }));
  assert.deepEqual(primite.at(-1), ['l2', 'https://claude.ai']);
  assert.deepEqual([trimise.at(-1)?.m.tip, trimise.at(-1)?.tinta], ['primit', 'https://claude.ai']);
  opreste();
  assert.equal(asc.message.length + asc.hashchange.length, 0);
});

test('fără ancoră sau fără opener nu se anunță nimic; ancora pusă mai târziu (fila refolosită) anunță', () => {
  const trimise: unknown[] = [];
  const opener = { postMessage: (m: unknown) => { trimise.push(m); } };
  ascultaLucrari(fereastra(null).w, () => {});
  const f = fereastra(opener, '');
  ascultaLucrari(f.w, () => {});
  assert.equal(trimise.length, 0);
  f.schimbaAncora('#altceva');
  assert.equal(trimise.length, 0);
  f.schimbaAncora(ANCORA);
  assert.equal(trimise.length, 1);
});
