/**
 * PNG-ul pe 16 biți al reliefului (ADR 0322, felia 18.1↑g), pe hârtie, față de `node:zlib` (independent de cod): scriitorul dă
 * un PNG gri pe 16 biți cu blocurile cerute (IHDR, tEXt, pHYs, IDAT, IEND, fiecare cu CRC-ul lui), rândurile cu filtrul 0 și
 * eșantioanele big-endian; cititorul citește un PNG făcut aici (gri 16 cu filtrele 0–4, RGBA 8 cu Paeth, gri cu alfa 16, cu
 * text), refuză întrețeserea și o semnătură greșită, iar dus-întorsul e exact.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crc32, deflateSync, inflateSync } from 'node:zlib';
import { citestePng, scriePngGri16 } from '../../src/io/png16.ts';

const SEMN = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const bloc = (tip: string, d: Buffer): Buffer => {
  const t = Buffer.from(tip, 'latin1'), n = Buffer.alloc(4), c = Buffer.alloc(4);
  n.writeUInt32BE(d.length);
  c.writeUInt32BE(crc32(Buffer.concat([t, d])) >>> 0);
  return Buffer.concat([n, t, d, c]);
};
const ihdr = (w: number, h: number, adancime: number, tip: number, intretesut = 0): Buffer => {
  const d = Buffer.alloc(13);
  d.writeUInt32BE(w, 0); d.writeUInt32BE(h, 4); d[8] = adancime; d[9] = tip; d[10] = 0; d[11] = 0; d[12] = intretesut;
  return bloc('IHDR', d);
};
const png = (cap: Buffer, brut: Buffer, alte: Buffer[] = []): Uint8Array => new Uint8Array(Buffer.concat([SEMN, cap, ...alte, bloc('IDAT', deflateSync(brut)), bloc('IEND', Buffer.alloc(0))]));

/** Blocurile unui PNG, citite de probă (tipul, datele, CRC-ul verificat). */
function blocuri(o: Uint8Array): Array<{ tip: string; d: Buffer }> {
  const b = Buffer.from(o);
  assert.ok(b.subarray(0, 8).equals(SEMN), 'semnătura');
  const r: Array<{ tip: string; d: Buffer }> = [];
  for (let i = 8; i < b.length;) {
    const n = b.readUInt32BE(i), tip = b.toString('latin1', i + 4, i + 8), d = b.subarray(i + 8, i + 8 + n);
    assert.equal(b.readUInt32BE(i + 8 + n), crc32(b.subarray(i + 4, i + 8 + n)) >>> 0, `CRC-ul lui ${tip}`);
    r.push({ tip, d });
    i += 12 + n;
  }
  return r;
}

test('scriitorul: gri pe 16 biți, cu textul și scara, rândurile cu filtrul 0 și eșantioanele big-endian', async () => {
  const v = Uint16Array.from([0, 1, 65535, 256, 4660, 65534]);
  const o = await scriePngGri16(v, 3, 2, { text: { 'cncvs2-relief': '{"v":1}' }, pixeliPeMetru: 4000 });
  const b = blocuri(o);
  assert.deepEqual(b.map((x) => x.tip), ['IHDR', 'pHYs', 'tEXt', 'IDAT', 'IEND']);
  const h = b[0]!.d;
  assert.deepEqual([h.readUInt32BE(0), h.readUInt32BE(4), h[8], h[9], h[10], h[11], h[12]], [3, 2, 16, 0, 0, 0, 0]);
  const p = b[1]!.d;
  assert.deepEqual([p.readUInt32BE(0), p.readUInt32BE(4), p[8]], [4000, 4000, 1]);
  assert.equal(b[2]!.d.toString('latin1'), 'cncvs2-relief\0{"v":1}');
  const brut = inflateSync(b[3]!.d);
  assert.equal(brut.length, 2 * (1 + 3 * 2));
  for (let y = 0; y < 2; y++) {
    assert.equal(brut[y * 7], 0, 'filtrul rândului');
    for (let x = 0; x < 3; x++) assert.equal(brut.readUInt16BE(y * 7 + 1 + 2 * x), v[y * 3 + x]);
  }
});

test('cititorul: gri pe 16 biți cu filtrele 0–4, valorile scalate la 0 … 255, cu textul și scara', async () => {
  // Patru rânduri de doi pixeli; fiecare rând cu alt filtru, aplicat aici pe octeți (bpp = 2).
  const w = 2, val = [[1000, 2000], [3000, 65535], [0, 300], [40000, 20000]], filtre = [1, 2, 3, 4];
  const brute: number[][] = val.map((r) => r.flatMap((x) => [x >> 8, x & 255]));
  const paeth = (a: number, b: number, c: number): number => {
    const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };
  const randuri: number[] = [];
  for (let y = 0; y < val.length; y++) {
    const f = filtre[y]!, r = brute[y]!, sus = y > 0 ? brute[y - 1]! : r.map(() => 0);
    randuri.push(f);
    for (let x = 0; x < r.length; x++) {
      const a = x >= 2 ? r[x - 2]! : 0, b = sus[x]!, c = x >= 2 ? sus[x - 2]! : 0;
      const pred = f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : paeth(a, b, c);
      randuri.push((r[x]! - pred) & 255);
    }
  }
  const pHYs = Buffer.alloc(9); pHYs.writeUInt32BE(1000, 0); pHYs.writeUInt32BE(1000, 4); pHYs[8] = 1;
  const text = bloc('tEXt', Buffer.from('cncvs2-relief\0{"zMin":1}', 'latin1'));
  const r = await citestePng(png(ihdr(w, 4, 16, 0), Buffer.from(randuri), [bloc('pHYs', pHYs), text]));
  if ('eroare' in r) assert.fail(r.eroare);
  assert.deepEqual([r.latime, r.inaltime, r.adancime], [2, 4, 16]);
  assert.equal(r.pixeliPeMetru, 1000);
  assert.deepEqual(r.text, { 'cncvs2-relief': '{"zMin":1}' });
  // Rândurile de sus în jos, RGBA (griul pe toate trei, alfa 255), scalate la 0 … 255.
  const g = (x: number, y: number): number => r.rgba[4 * (y * w + x)]!;
  for (let y = 0; y < 4; y++) for (let x = 0; x < 2; x++) assert.ok(Math.abs(g(x, y) - val[y]![x]! * 255 / 65535) < 1e-9, `(${x}, ${y})`);
  assert.equal(r.rgba[3], 255);
});

test('cititorul: RGBA pe 8 biți cu Paeth și gri cu alfa pe 16 biți', async () => {
  const rgba = [10, 20, 30, 255, 200, 100, 50, 0];
  const r8 = await citestePng(png(ihdr(2, 1, 8, 6), Buffer.from([0, ...rgba])));
  if ('eroare' in r8) assert.fail(r8.eroare);
  assert.deepEqual([...r8.rgba], rgba);
  const ga = [0x12, 0x34, 0xff, 0xff, 0x00, 0x00, 0x00, 0x00]; // (0x1234, opac), (0, transparent)
  const r16 = await citestePng(png(ihdr(2, 1, 16, 4), Buffer.from([0, ...ga])));
  if ('eroare' in r16) assert.fail(r16.eroare);
  assert.ok(Math.abs(r16.rgba[0]! - 0x1234 * 255 / 65535) < 1e-9);
  assert.equal(r16.rgba[3], 255);
  assert.equal(r16.rgba[7], 0);
});

test('cititorul refuză întrețeserea, o adâncime nesprijinită și o semnătură greșită', async () => {
  assert.deepEqual(await citestePng(png(ihdr(1, 1, 16, 0, 1), Buffer.from([0, 0, 0]))), { eroare: 'intretesut' });
  assert.deepEqual(await citestePng(png(ihdr(1, 1, 4, 0), Buffer.from([0, 0]))), { eroare: 'nesprijinit' });
  assert.deepEqual(await citestePng(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9])), { eroare: 'semnatura' });
});

test('dus-întors: ce scrie scriitorul citește cititorul, exact', async () => {
  const v = Uint16Array.from({ length: 12 }, (_, k) => (k * 5471) % 65536);
  const r = await citestePng(await scriePngGri16(v, 4, 3, { text: { a: 'b' } }));
  if ('eroare' in r) assert.fail(r.eroare);
  assert.deepEqual(r.text, { a: 'b' });
  for (let k = 0; k < 12; k++) assert.equal(Math.round(r.rgba[4 * k]! * 65535 / 255), v[k]);
});
