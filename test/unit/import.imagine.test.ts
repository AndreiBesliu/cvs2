import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dpiImagine, felImagine } from '../../src/io/imagine.ts';
import { formatDupaAntet, formatImport } from '../../src/io/formatImport.ts';
import { raspundeTrasare, type CerereTrasare } from '../../src/jobs/calculTrasare.ts';
import type { CaiTrasate, ImagineRGBA } from '../../src/trasare/trasare.ts';
import { caiDinTrasare, previzualizareImagine } from '../../src/ui/actiuniImportCalcul.ts';

/**
 * Ușa imaginilor (ADR 0220 §1, §7, §8): semnăturile, DPI-ul din antet (PNG `pHYs`, JPEG JFIF și EXIF, BMP), scara și
 * curățarea din mm în px, căile trasate puse în mm (Y în sus) cu laturile din sensul lor. Octeții sunt scriși de mână
 * aici, după specificații; valorile așteptate, socotite pe hârtie.
 */

const ascii = (s: string): number[] => [...s].map((c) => c.charCodeAt(0));
const be16 = (x: number): number[] => [(x >>> 8) & 255, x & 255];
const be32 = (x: number): number[] => [(x >>> 24) & 255, (x >>> 16) & 255, (x >>> 8) & 255, x & 255];
const le16 = (x: number): number[] => [x & 255, (x >>> 8) & 255];
const le32 = (x: number): number[] => [x & 255, (x >>> 8) & 255, (x >>> 16) & 255, (x >>> 24) & 255];

/** Un PNG de 1 × 1 cu `pHYs` (sau fără), înainte de IDAT sau după el; CRC-urile nu se citesc. */
function png(phys: { readonly x: number; readonly unitate: number } | null, dupaIdat = false): Uint8Array {
  const bucata = (tip: string, d: number[]): number[] => [...be32(d.length), ...ascii(tip), ...d, 0, 0, 0, 0];
  const p = phys ? bucata('pHYs', [...be32(phys.x), ...be32(phys.x), phys.unitate]) : [];
  return Uint8Array.from([0x89, ...ascii('PNG'), 0x0d, 0x0a, 0x1a, 0x0a, ...bucata('IHDR', [...be32(1), ...be32(1), 8, 6, 0, 0, 0]),
    ...(dupaIdat ? [] : p), ...bucata('IDAT', [0]), ...(dupaIdat ? p : []), ...bucata('IEND', [])]);
}

/** Un segment JPEG: marcajul, lungimea (cu ea însăși) și datele. */
const segment = (m: number, d: number[]): number[] => [0xff, m, ...be16(d.length + 2), ...d];
const jfif = (unitate: number, x: number): number[] => segment(0xe0, [...ascii('JFIF\0'), 1, 2, unitate, ...be16(x), ...be16(x), 0, 0]);

/** EXIF: antetul TIFF, un IFD cu XResolution (RATIONAL, după IFD) și ResolutionUnit (SHORT), în ordinea dată a octeților. */
function exif(rez: readonly [number, number], unitate: number, le = true): number[] {
  const u16 = le ? le16 : be16, u32 = le ? le32 : be32;
  const tiff = [...ascii(le ? 'II' : 'MM'), ...u16(42), ...u32(8), ...u16(2),
    ...u16(0x011a), ...u16(5), ...u32(1), ...u32(38),
    ...u16(0x0128), ...u16(3), ...u32(1), ...u16(unitate), 0, 0,
    ...u32(0), ...u32(rez[0]), ...u32(rez[1])];
  return segment(0xe1, [...ascii('Exif\0\0'), ...tiff]);
}
const jpeg = (...segmente: number[][]): Uint8Array => Uint8Array.from([0xff, 0xd8, ...segmente.flat(), 0xff, 0xda, 0, 2]);

/** Un BMP cu antetul BITMAPINFOHEADER (40) sau BITMAPCOREHEADER (12) și densitatea pe X, în px pe metru. */
function bmp(ppm: number, antet = 40): Uint8Array {
  const b = new Uint8Array(54 + 4);
  const v = new DataView(b.buffer);
  b.set(ascii('BM'));
  v.setUint32(2, b.length, true); v.setUint32(10, 54, true); v.setUint32(14, antet, true);
  v.setInt32(18, 1, true); v.setInt32(22, 1, true); v.setUint16(26, 1, true); v.setUint16(28, 24, true);
  v.setInt32(38, ppm, true); v.setInt32(42, ppm, true);
  return b;
}

const aproape = (a: number | null, b: number, msg?: string): void => {
  assert.ok(a !== null && Math.abs(a - b) < 1e-9, `${msg ?? ''} ${String(a)} față de ${b}`);
};

test('semnăturile: PNG, JPEG, GIF, BMP, WebP și TIFF (ambele ordini ale octeților); altceva nu e imagine', () => {
  assert.equal(felImagine(png(null)), 'png');
  assert.equal(felImagine(jpeg()), 'jpeg');
  assert.equal(felImagine(Uint8Array.from(ascii('GIF89a\x01\x00'))), 'gif');
  assert.equal(felImagine(Uint8Array.from(ascii('GIF87a\x01\x00'))), 'gif');
  assert.equal(felImagine(bmp(0)), 'bmp');
  assert.equal(felImagine(Uint8Array.from(ascii('BM\0\0\0\0'))), null, 'un BM prea scurt pentru antet');
  assert.equal(felImagine(Uint8Array.from([...ascii('RIFF'), 0, 0, 0, 0, ...ascii('WEBPVP8 ')])), 'webp');
  assert.equal(felImagine(Uint8Array.from([...ascii('RIFF'), 0, 0, 0, 0, ...ascii('WAVEfmt ')])), null);
  assert.equal(felImagine(Uint8Array.from([...ascii('II'), 42, 0, 8, 0, 0, 0])), 'tiff');
  assert.equal(felImagine(Uint8Array.from([...ascii('MM'), 0, 42, 0, 0, 0, 8])), 'tiff');
  assert.equal(felImagine(Uint8Array.from(ascii('<svg xmlns'))), null);
  // Ușa: după nume, după tipul MIME și, fără ele, după semnătură.
  assert.equal(formatImport('Poza.PNG', ''), 'imagine');
  assert.equal(formatImport('scan.tiff', ''), 'imagine');
  assert.equal(formatImport('fara-extensie', 'image/jpeg'), 'imagine');
  assert.equal(formatImport('fara-extensie', ''), null);
  assert.equal(formatDupaAntet(png(null)), 'imagine');
  assert.equal(formatDupaAntet(jpeg()), 'imagine');
});

test('DPI-ul din PNG: pHYs în px pe metru (unitatea 1), înaintea IDAT; fără unitate sau după IDAT, nespus', () => {
  aproape(dpiImagine(png({ x: 11811, unitate: 1 })), 11811 * 0.0254, 'pHYs 11811 px/m');
  aproape(dpiImagine(png({ x: 3780, unitate: 1 })), 3780 * 0.0254, 'pHYs 3780 px/m (96 dpi)');
  assert.equal(dpiImagine(png({ x: 11811, unitate: 0 })), null, 'unitatea 0 spune doar proporția');
  assert.equal(dpiImagine(png({ x: 11811, unitate: 1 }, true)), null, 'pHYs după IDAT nu se citește');
  assert.equal(dpiImagine(png(null)), null);
  assert.equal(dpiImagine(png({ x: 100, unitate: 1 })), null, '2,54 dpi: neplauzibil');
});

test('DPI-ul din JPEG: JFIF pe țol sau pe cm; JFIF fără unitate lasă locul EXIF-ului (țol sau cm, ambele ordini)', () => {
  assert.equal(dpiImagine(jpeg(jfif(1, 300))), 300);
  aproape(dpiImagine(jpeg(jfif(2, 118))), 118 * 2.54, 'JFIF 118 px/cm');
  assert.equal(dpiImagine(jpeg(jfif(0, 1), exif([300, 1], 2))), 300, 'JFIF 0 (proporția), apoi EXIF');
  assert.equal(dpiImagine(jpeg(exif([72, 1], 2))), 72);
  aproape(dpiImagine(jpeg(exif([1181, 10], 3))), 118.1 * 2.54, 'EXIF pe cm');
  assert.equal(dpiImagine(jpeg(exif([600, 2], 2, false))), 300, 'EXIF big-endian, 600/2');
  assert.equal(dpiImagine(jpeg(exif([300, 1], 1))), null, 'ResolutionUnit 1: fără unitate');
  assert.equal(dpiImagine(jpeg(jfif(0, 1))), null);
  assert.equal(dpiImagine(jpeg(jfif(1, 5))), null, '5 dpi: neplauzibil');
});

test('DPI-ul din BMP: px pe metru din BITMAPINFOHEADER; 0 sau antetul vechi de 12 octeți, nespus', () => {
  aproape(dpiImagine(bmp(11811)), 11811 * 0.0254);
  assert.equal(dpiImagine(bmp(0)), null);
  assert.equal(dpiImagine(bmp(11811, 12)), null);
});

/** 100 × 50, opacă: un dreptunghi negru (x 20–79, y 10–39) și o pată de 3 × 3 px (x 5–7, y 5–7), pe alb. */
const imagine: ImagineRGBA = (() => {
  const W = 100, H = 50, d = new Uint8ClampedArray(W * H * 4).fill(255);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const negru = (x >= 20 && x < 80 && y >= 10 && y < 40) || (x >= 5 && x < 8 && y >= 5 && y < 8);
      if (negru) d.set([0, 0, 0, 255], (y * W + x) * 4);
    }
  }
  return { latime: W, inaltime: H, date: d };
})();
const cerere = (c: Partial<CerereTrasare>): CerereTrasare => ({
  imagine, optiuni: { sursa: 'auto', prag: null, inverseaza: false, netezime: 'echilibrat' }, peteMm: 0, gauriMm: 0, latimeMm: null, dpi: null, ...c,
});

test('scara: lățimea scrisă bate DPI-ul fișierului, iar el pe cel presupus (96 px pe țol)', async () => {
  const lat = (await raspundeTrasare(cerere({ latimeMm: 50, dpi: 300 }))).raspuns;
  assert.ok(lat.ok);
  assert.equal(lat.scara, 'latime');
  assert.equal(lat.mmPePx, 0.5);
  aproape(lat.dpi, 50.8, '100 px pe 50 mm');
  const fis = (await raspundeTrasare(cerere({ dpi: 300 }))).raspuns;
  assert.ok(fis.ok);
  assert.equal(fis.scara, 'fisier');
  aproape(fis.mmPePx, 25.4 / 300);
  aproape(fis.dpi, 300);
  const pre = (await raspundeTrasare(cerere({}))).raspuns;
  assert.ok(pre.ok);
  assert.equal(pre.scara, 'presupus');
  aproape(pre.mmPePx, 25.4 / 96);
  aproape(pre.dpi, 96);
});

test('curățarea în mm, la scara imaginii: pata de 9 px² rămâne sub 1 mm (4 px²), dispare sub 2 mm (12,6 px²), la 0,5 mm pe px', async () => {
  const cu = async (peteMm: number): Promise<number> => {
    const r = (await raspundeTrasare(cerere({ latimeMm: 50, peteMm }))).raspuns;
    assert.ok(r.ok);
    return r.raport.contururi;
  };
  assert.equal(await cu(0), 2);
  assert.equal(await cu(1), 2);
  assert.equal(await cu(2), 1);
  // Aceeași pată, la 0,1 mm pe px (lățimea 10 mm): 1 mm = 78,5 px², deci dispare.
  const mic = (await raspundeTrasare(cerere({ latimeMm: 10, peteMm: 1 }))).raspuns;
  assert.ok(mic.ok);
  assert.equal(mic.raport.contururi, 1);
});

test('căile trasate în mm: Y în sus (imaginea e pagina), laturile din sensul contururilor, cubicele cu mânerele lor', () => {
  // Un pătrat exterior (px, Y în jos) și o gaură în el, cu o cubică pe latura de sus a găurii.
  const c: CaiTrasate = {
    inceput: Uint32Array.from([0, 4, 8]),
    tip: Uint8Array.from([0, 0, 0, 0, 1, 0, 0, 0]),
    xy: Float64Array.from([
      10, 10, 0, 0, 0, 0, 30, 10, 0, 0, 0, 0, 30, 20, 0, 0, 0, 0, 10, 20, 0, 0, 0, 0,
      15, 12, 18, 11, 22, 11, 25, 12, 0, 0, 0, 0, 25, 18, 0, 0, 0, 0, 15, 18, 0, 0, 0, 0,
    ]),
    exterior: Uint8Array.from([1, 0]),
  };
  const r = caiDinTrasare(c, 0.5, 40);
  assert.deepEqual(r.laturi, ['exterior', 'interior']);
  assert.deepEqual(r.avertismente, { 'sub-rezolutie': 0, 'prea-mari': 0 });
  const [a, b] = r.cai;
  assert.ok(a && b);
  assert.deepEqual(a.varfuri.map((v) => v.p), [{ x: 5, y: 15 }, { x: 15, y: 15 }, { x: 15, y: 10 }, { x: 5, y: 10 }]);
  assert.equal(a.inchis, true);
  const s = b.varfuri[0]?.s;
  assert.deepEqual(s, { tip: 'C', c1: { x: 9, y: 14.5 }, c2: { x: 11, y: 14.5 } });
  assert.deepEqual(b.varfuri[1]?.p, { x: 12.5, y: 14 });
});

test('praful (sub 0,01 mm) se sare, numărat; cutia exactă decide când vârfurile stau strânse, iar peste plafonul unei căi, sărită', () => {
  // La 0,001 mm pe px, un pătrat de 5 px are diagonala 0,007 mm: praf.
  const patrat = (x0: number, w: number): number[] => [x0, 0, 0, 0, 0, 0, x0 + w, 0, 0, 0, 0, 0, x0 + w, w, 0, 0, 0, 0, x0, w, 0, 0, 0, 0];
  const praf = caiDinTrasare({ inceput: Uint32Array.from([0, 4]), tip: new Uint8Array(4), xy: Float64Array.from(patrat(0, 5)), exterior: Uint8Array.from([1]) }, 0.001, 10);
  assert.equal(praf.cai.length, 0);
  assert.equal(praf.avertismente['sub-rezolutie'], 1);
  // Două vârfuri la 0,001 px, cu mânerele la 50 px: vârfurile spun praf, cutia exactă (0,375 mm) nu.
  const bucla = caiDinTrasare({
    inceput: Uint32Array.from([0, 2]), tip: Uint8Array.from([1, 1]),
    xy: Float64Array.from([0, 0, 0, 50, 0.001, 50, 0.001, 0, 0.001, -50, 0, -50]), exterior: Uint8Array.from([1]),
  }, 0.01, 100);
  assert.equal(bucla.cai.length, 1);
  // Peste 50 000 de noduri, calea se sare (fără s-o construiască), numărată.
  const n = 50_001, xy = new Float64Array(6 * n);
  for (let k = 0; k < n; k++) { xy[6 * k] = 100 * Math.cos((2 * Math.PI * k) / n); xy[6 * k + 1] = 100 * Math.sin((2 * Math.PI * k) / n); }
  const mare = caiDinTrasare({ inceput: Uint32Array.from([0, n]), tip: new Uint8Array(n), xy, exterior: Uint8Array.from([1]) }, 0.1, 200);
  assert.equal(mare.cai.length, 0);
  assert.equal(mare.avertismente['prea-mari'], 1);
});

test('refuzurile ușii: TIFF-ul (după semnătură sau după nume), înaintea decodării; o imagine pe care n-o decodează nimeni', async () => {
  const tiff = Uint8Array.from([...ascii('II'), 42, 0, 8, 0, 0, 0]);
  assert.deepEqual(await previzualizareImagine({ nume: 'scan.bin', octeti: tiff }, undefined), { ok: false, cod: 'tiff', format: 'imagine' });
  assert.deepEqual(await previzualizareImagine({ nume: 'scan.TIF', octeti: Uint8Array.from([1, 2, 3, 4]) }, undefined), { ok: false, cod: 'tiff', format: 'imagine' });
  // În Node nu există `createImageBitmap`: decodarea cade, iar ușa o spune ca pe o imagine necitibilă, cu motivul.
  const r = await previzualizareImagine({ nume: 'poza.png', octeti: png(null) }, undefined);
  assert.equal(r.ok, false);
  assert.ok(!r.ok && r.cod === 'imagine-citire' && r.format === 'imagine' && typeof r.detaliu === 'string', JSON.stringify(r));
});
