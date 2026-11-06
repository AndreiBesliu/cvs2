/**
 * Cititorul `.zip` al extensiilor (ADR 0127 §A), pe arhive scrise în Node (`scrieZip`, cu `zlib`): stocat și deflate,
 * dosarele sărite, CRC-ul, criptarea, metodele, ZIP64, limitele judecate înaintea dezarhivării, arhivele trunchiate.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crc32 as crcNode, deflateRawSync } from 'node:zlib';
import { scrieZip } from '../../scripts/impacheteaza-extensie.ts';
import { citesteZip, crc32 } from '../../src/extensii/zip.ts';

const LIM = { fisiere: 10, octetiFisier: 1000, octetiTotal: 1500 };
const b = (s: string): Uint8Array => new TextEncoder().encode(s);
const t = (u: Uint8Array): string => new TextDecoder().decode(u);

test('CRC-32 ca zlib (pe hârtie: „123456789” → 0xCBF43926)', () => {
  assert.equal(crc32(b('123456789')), 0xcbf43926);
  const x = b('extensie'.repeat(97));
  assert.equal(crc32(x), crcNode(x));
  assert.equal(crc32(new Uint8Array()), 0);
});

test('stocat și deflate se citesc la fel, în ordine; dosarele se sar', async () => {
  const zip = scrieZip([
    { nume: 'extensie.json', octeti: b('{"a":1}'), metoda: 0 },
    { nume: 'dosar/', octeti: new Uint8Array(), metoda: 0 },
    { nume: 'dosar/index.js', octeti: b('export const x = 1;\n'.repeat(20)) },
  ]);
  const r = await citesteZip(zip, LIM);
  assert.ok(r.ok);
  assert.deepEqual(r.intrari.map((i) => i.nume), ['extensie.json', 'dosar/index.js']);
  assert.equal(t(r.intrari[0]?.octeti ?? new Uint8Array()), '{"a":1}');
  assert.equal(t(r.intrari[1]?.octeti ?? new Uint8Array()), 'export const x = 1;\n'.repeat(20));
});

test('refuzuri: nu e zip, CRC greșit, criptat, altă metodă, ZIP64, prea multe, prea mare, trunchiat, deflate mai lung decât declarat', async () => {
  const bun = scrieZip([{ nume: 'a.js', octeti: b('abc'), metoda: 0 }]);
  assert.deepEqual(await citesteZip(b('nu e o arhivă'), LIM), { ok: false, motiv: 'nu-e-zip' });

  const crc = bun.slice();
  crc[30 + 4] = 0x78; // primul octet al datelor („a” → „x”), după antetul local de 30 de octeți și numele „a.js”
  assert.deepEqual(await citesteZip(crc, LIM), { ok: false, motiv: 'crc', nume: 'a.js' });

  // Steagurile, metoda, mărimea: în directorul central, după antetul local, numele și datele (30 + 4 + 3 = 37).
  const dir = 37;
  const criptat = bun.slice();
  criptat[dir + 8] = 1;
  assert.deepEqual(await citesteZip(criptat, LIM), { ok: false, motiv: 'criptat', nume: 'a.js' });
  const metoda = bun.slice();
  metoda[dir + 10] = 12;
  assert.deepEqual(await citesteZip(metoda, LIM), { ok: false, motiv: 'metoda', nume: 'a.js' });
  const zip64 = bun.slice();
  new DataView(zip64.buffer).setUint32(dir + 24, 0xffffffff, true);
  assert.deepEqual(await citesteZip(zip64, LIM), { ok: false, motiv: 'zip64', nume: 'a.js' });

  const multe = scrieZip(Array.from({ length: 11 }, (_, i) => ({ nume: `f${i}.js`, octeti: b('x') })));
  assert.deepEqual(await citesteZip(multe, LIM), { ok: false, motiv: 'prea-multe' });
  assert.equal((await citesteZip(scrieZip(Array.from({ length: 10 }, (_, i) => ({ nume: `f${i}.js`, octeti: b('x') }))), LIM)).ok, true);

  assert.equal((await citesteZip(scrieZip([{ nume: 'a.js', octeti: new Uint8Array(1000) }]), LIM)).ok, true);
  assert.deepEqual(await citesteZip(scrieZip([{ nume: 'a.js', octeti: new Uint8Array(1001) }]), LIM), { ok: false, motiv: 'prea-mare', nume: 'a.js' });
  const doua = scrieZip([{ nume: 'a.js', octeti: new Uint8Array(800) }, { nume: 'b.js', octeti: new Uint8Array(701) }]);
  assert.deepEqual(await citesteZip(doua, LIM), { ok: false, motiv: 'prea-mare', nume: 'b.js' });

  assert.equal((await citesteZip(bun.subarray(0, bun.length - 5), LIM)).ok, false);

  // O „bombă”: directorul declară 10 octeți, deflate-ul dă 900; dezarhivarea se oprește, fără să scrie peste mărimea declarată.
  const bomba = scrieZip([{ nume: 'a.js', octeti: new Uint8Array(900) }]);
  const v = new DataView(bomba.buffer);
  const lung = deflateRawSync(new Uint8Array(900)).length;
  v.setUint32(30 + 4 + lung + 24, 10, true);
  assert.deepEqual(await citesteZip(bomba, LIM), { ok: false, motiv: 'stricat', nume: 'a.js' });
});
