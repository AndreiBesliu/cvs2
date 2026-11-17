import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { decodeazaCcitt } from '../../src/trasare/ccitt.ts';
import { decodeazaTiff, type RezultatTiff } from '../../src/trasare/tiff.ts';
import type { ImagineRGBA } from '../../src/trasare/trasare.ts';
import { citestePng } from './ajutor-png.ts';
import { biti, coduriLzw, scrieTiff, type Eticheta } from './ajutor-tiff.ts';

/**
 * Cititorul TIFF (ADR 0229, felia 25.6↑): fișierele scrise de codoarele Windows (WIC și GDI+, `test/fixtures/trasare/tiff`,
 * cu `genereaza.ps1`), fiecare cu pixelii lui citiți tot de WIC, alături; apoi fișiere scrise de mână (`ajutor-tiff.ts`),
 * cu valorile socotite pe hârtie: ordinea MM, plăcile, ordinea planară, predictorul, 2 / 4 / 16 biți, alb-e-zero, CMYK,
 * alfa asociat, orientarea, PackBits și LZW din exemplele specificației, CCITT pe coduri din tabelele T.4, reducerea din
 * mers, refuzurile.
 */

const DIR = 'test/fixtures/trasare/tiff';
type Ok = Extract<RezultatTiff, { ok: true }>;

async function citeste(b: Uint8Array, o: { pagina?: number; maxPixeli?: number } = {}): Promise<Ok> {
  const r = await decodeazaTiff(b, o);
  assert.ok(r.ok, r.ok ? '' : `${r.cod}: ${r.detaliu}`);
  return r;
}
/** Pixelii, ca rânduri de valori RGBA (pentru mesajele căderilor). */
function egale(a: ImagineRGBA, b: ImagineRGBA, nume: string, tol = 0): void {
  assert.deepEqual([a.latime, a.inaltime], [b.latime, b.inaltime], `${nume}: mărimea`);
  let rau = 0, prima = -1;
  for (let i = 0; i < a.date.length; i++) {
    if (Math.abs((a.date[i] ?? 0) - (b.date[i] ?? 0)) > tol) { rau++; if (prima < 0) prima = i; }
  }
  const p = prima >> 2;
  assert.equal(rau, 0, `${nume}: ${rau} valori diferite; prima la (${p % a.latime}, ${Math.floor(p / a.latime)}): `
    + `${Array.from({ length: 4 }, (_, j) => a.date[4 * p + j]).join(',')} față de ${Array.from({ length: 4 }, (_, j) => b.date[4 * p + j]).join(',')}`);
}
/** Valorile unui canal (0 = R), rând cu rând. */
const canal = (img: ImagineRGBA, c = 0): number[] => Array.from({ length: img.latime * img.inaltime }, (_, k) => img.date[4 * k + c] ?? 0);
/**
 * O pagină de gri (8 biți, sau `biti8`), necomprimată, cu octeții dați (rând cu rând); etichetele din `alte` le înlocuiesc
 * pe cele de bază cu același număr.
 */
function gri(w: number, h: number, v: readonly number[], alte: readonly Eticheta[] = [], biti8 = 8, foto = 1): Uint8Array {
  const baza: Eticheta[] = [[256, 4, [w]], [257, 4, [h]], [258, 3, [biti8]], [259, 3, [1]], [262, 3, [foto]], [278, 4, [h]]];
  return scrieTiff([{ etichete: [...baza.filter(([n]) => !alte.some(([m]) => m === n)), ...alte], bucati: [Uint8Array.from(v)] }]);
}

test('fișierele scrise de Windows (WIC și GDI+): exact pixelii citiți de WIC, pe fiecare pagină', async () => {
  const fisiere = readdirSync(DIR).filter((f) => f.endsWith('.tif'));
  assert.ok(fisiere.length >= 15, fisiere.join(', '));
  for (const f of fisiere) {
    const b = new Uint8Array(readFileSync(`${DIR}/${f}`));
    const r = await citeste(b);
    // 16 biți: WIC rotunjește altfel trecerea la 8 (cel mult 1).
    egale(r.img, citestePng(new Uint8Array(readFileSync(`${DIR}/${f.replace(/\.tif$/, '.png')}`))), f, f.includes('16') ? 1 : 0);
    assert.equal(r.pagini, f.includes('pagini') ? 2 : 1, `${f}: paginile`);
    assert.deepEqual([r.latime, r.inaltime], [r.img.latime, r.img.inaltime]);
  }
  const doi = await citeste(new Uint8Array(readFileSync(`${DIR}/wic-pagini-g4.tif`)), { pagina: 2 });
  egale(doi.img, citestePng(new Uint8Array(readFileSync(`${DIR}/wic-pagini-g4.p2.png`))), 'wic-pagini-g4, pagina 2');
  assert.equal(doi.pagina, 2);
  // O miniatură (NewSubfileType 1) după pagină nu e o pagină.
  const cuMiniatura = scrieTiff([
    { etichete: [[256, 4, [2]], [257, 4, [1]], [258, 3, [8]], [259, 3, [1]], [262, 3, [1]], [278, 4, [1]]], bucati: [Uint8Array.of(10, 20)] },
    { etichete: [[254, 4, [1]], [256, 4, [1]], [257, 4, [1]], [258, 3, [8]], [259, 3, [1]], [262, 3, [1]], [278, 4, [1]]], bucati: [Uint8Array.of(99)] },
  ]);
  const m = await citeste(cuMiniatura, { pagina: 2 });
  assert.deepEqual([m.pagini, m.pagina, canal(m.img)], [1, 1, [10, 20]]);
  // Peste ultima pagină: ultima.
  assert.equal((await citeste(new Uint8Array(readFileSync(`${DIR}/wic-pagini-g4.tif`)), { pagina: 9 })).pagina, 2);
});

test('DPI-ul din XResolution / ResolutionUnit: țol (WIC 95,987, GDI+ 96), cm (×2,54), fără unitate, nespus', async () => {
  const wic = await citeste(new Uint8Array(readFileSync(`${DIR}/wic-g4.tif`)));
  assert.ok(Math.abs((wic.dpi ?? 0) - 95.987) < 1e-9, String(wic.dpi));
  assert.equal((await citeste(new Uint8Array(readFileSync(`${DIR}/gdi-g4.tif`)))).dpi, 96);
  const rez = (unitate: number): Eticheta[] => [[282, 5, [11811, 100]], [283, 5, [11811, 100]], [296, 3, [unitate]]];
  assert.ok(Math.abs(((await citeste(gri(1, 1, [0], rez(3)))).dpi ?? 0) - 299.9994) < 1e-9);
  assert.equal((await citeste(gri(1, 1, [0], rez(1)))).dpi, null);
  assert.equal((await citeste(gri(1, 1, [0]))).dpi, null);
});

test('MM, gri pe 2, 4, 8 biți, alb-e-zero, FillOrder 2, plăcile și ordinea planară, scrise de mână', async () => {
  // MM: aceleași valori, ordinea octeților inversă.
  const v = [1, 2, 3, 4, 5, 6];
  const mm = scrieTiff([{ etichete: [[256, 4, [3]], [257, 4, [2]], [258, 3, [8]], [259, 3, [1]], [262, 3, [1]], [278, 4, [2]]], bucati: [Uint8Array.from(v)] }], false);
  assert.deepEqual(canal((await citeste(mm)).img), v);
  // MM pe 16 biți: 0x1001 (4097 / 257 = 15,9 → 16) și 0xffff; citit invers, 0x0110 ar da 1.
  const mm16 = scrieTiff([{ etichete: [[256, 4, [2]], [257, 4, [1]], [258, 3, [16]], [259, 3, [1]], [262, 3, [1]], [278, 4, [1]]],
    bucati: [Uint8Array.of(0x10, 0x01, 0xff, 0xff)] }], false);
  assert.deepEqual(canal((await citeste(mm16)).img), [16, 255]);
  // Alb-e-zero: 0 e alb.
  assert.deepEqual(canal((await citeste(gri(3, 1, [0, 100, 255], [], 8, 0))).img), [255, 155, 0]);
  // 2 și 4 biți, împachetați de la bitul cel mai semnificativ; un rând se termină pe un octet întreg.
  assert.deepEqual(canal((await citeste(gri(5, 1, [0b00011011, 0b11000000], [], 2))).img), [0, 85, 170, 255, 255]);
  assert.deepEqual(canal((await citeste(gri(3, 2, [0x0f, 0x80, 0x5a, 0x00], [], 4))).img), [0, 255, 136, 85, 170, 0]);
  // 1 bit, negru-e-zero, FillOrder 2: biții fiecărui octet de la cel mai puțin semnificativ.
  assert.deepEqual(canal((await citeste(gri(8, 1, [0b00000101], [[266, 3, [2]]], 1))).img), [255, 0, 255, 0, 0, 0, 0, 0]);
  // Plăci de 16 × 16 pe o imagine de 20 × 18 (două pe rând, două pe coloană, tăiate la margine); valoarea (x + 3y) mod 256.
  const W = 20, H = 18, placi: Uint8Array[] = [];
  for (let ty = 0; ty < 2; ty++) {
    for (let tx = 0; tx < 2; tx++) {
      const p = new Uint8Array(256).fill(99);
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (16 * tx + x < W && 16 * ty + y < H) p[16 * y + x] = (16 * tx + x + 3 * (16 * ty + y)) & 255;
      placi.push(p);
    }
  }
  const t = scrieTiff([{ etichete: [[256, 4, [W]], [257, 4, [H]], [258, 3, [8]], [259, 3, [1]], [262, 3, [1]], [322, 4, [16]], [323, 4, [16]]], bucati: placi, placi: true }]);
  assert.deepEqual(canal((await citeste(t)).img), Array.from({ length: W * H }, (_, k) => ((k % W) + 3 * Math.floor(k / W)) & 255));
  // Ordinea planară 2: întâi toate benzile roșului, apoi ale verdelui și ale albastrului.
  const pl = scrieTiff([{
    etichete: [[256, 4, [2]], [257, 4, [1]], [258, 3, [8, 8, 8]], [259, 3, [1]], [262, 3, [2]], [277, 3, [3]], [278, 4, [1]], [284, 3, [2]]],
    bucati: [Uint8Array.of(10, 20), Uint8Array.of(30, 40), Uint8Array.of(50, 60)],
  }]);
  assert.deepEqual(Array.from((await citeste(pl)).img.date), [10, 30, 50, 255, 20, 40, 60, 255]);
});

test('16 biți, predictorul orizontal (8 și 16 biți, peste Deflate-ul lui Node), CMYK, alfa asociat și neasociat, paleta', async () => {
  // 16 biți, LE: 1000, 1003, 990 → diferențele 1000, 3, 65523; trecerea la 8 biți: v / 257, rotunjit.
  const d16 = deflateSync(Uint8Array.of(0xe8, 0x03, 0x03, 0x00, 0xf3, 0xff));
  const p16 = scrieTiff([{ etichete: [[256, 4, [3]], [257, 4, [1]], [258, 3, [16]], [259, 3, [8]], [262, 3, [1]], [278, 4, [1]], [317, 3, [2]]], bucati: [d16] }]);
  assert.deepEqual(canal((await citeste(p16)).img), [4, 4, 4]);
  const p8 = scrieTiff([{ etichete: [[256, 4, [4]], [257, 4, [1]], [258, 3, [8]], [259, 3, [8]], [262, 3, [1]], [278, 4, [1]], [317, 3, [2]]], bucati: [deflateSync(Uint8Array.of(10, 10, 251, 0))] }]);
  assert.deepEqual(canal((await citeste(p8)).img), [10, 20, 15, 15]);
  // Predictorul pe RGB: fiecare eșantion față de același eșantion al pixelului din stânga.
  const prgb = scrieTiff([{
    etichete: [[256, 4, [2]], [257, 4, [1]], [258, 3, [8, 8, 8]], [259, 3, [8]], [262, 3, [2]], [277, 3, [3]], [278, 4, [1]], [317, 3, [2]]],
    bucati: [deflateSync(Uint8Array.of(100, 50, 25, 10, 246, 1))],
  }]);
  assert.deepEqual(Array.from((await citeste(prgb)).img.date), [100, 50, 25, 255, 110, 40, 26, 255]);
  // CMYK, „convertit simplu”: R = (255 − C)(255 − K) / 255, rotunjit.
  const cmyk = scrieTiff([{
    etichete: [[256, 4, [3]], [257, 4, [1]], [258, 3, [8, 8, 8, 8]], [259, 3, [1]], [262, 3, [5]], [277, 3, [4]], [278, 4, [1]]],
    bucati: [Uint8Array.of(0, 0, 0, 0, 255, 0, 0, 0, 128, 0, 0, 128)],
  }]);
  assert.deepEqual(Array.from((await citeste(cmyk)).img.date), [255, 255, 255, 255, 0, 255, 255, 255, 63, 127, 127, 255]);
  // Alfa asociat (ExtraSamples 1): culoarea împărțită la alfa; neasociat (2): așa cum e.
  const alfa = (fel: number): Uint8Array => scrieTiff([{
    etichete: [[256, 4, [1]], [257, 4, [1]], [258, 3, [8, 8, 8, 8]], [259, 3, [1]], [262, 3, [2]], [277, 3, [4]], [278, 4, [1]], [338, 3, [fel]]],
    bucati: [Uint8Array.of(100, 50, 0, 128)],
  }]);
  assert.deepEqual(Array.from((await citeste(alfa(1))).img.date), [199, 100, 0, 128]);
  assert.deepEqual(Array.from((await citeste(alfa(2))).img.date), [100, 50, 0, 128]);
  // Paleta pe 8 biți: ColorMap, întâi toți roșii, apoi verzii, apoi albaștrii, pe 16 biți.
  const harta = Array.from({ length: 768 }, (_, k) => (k === 1 ? 255 * 257 : k === 257 ? 128 * 257 : k === 513 ? 7 * 257 : 0));
  const pal = scrieTiff([{ etichete: [[256, 4, [2]], [257, 4, [1]], [258, 3, [8]], [259, 3, [1]], [262, 3, [3]], [278, 4, [1]], [320, 3, harta]], bucati: [Uint8Array.of(0, 1)] }]);
  assert.deepEqual(Array.from((await citeste(pal)).img.date), [0, 0, 0, 255, 255, 128, 7, 255]);
});

test('orientarea (eticheta 274): cele opt, pe o imagine de 3 × 2 (1 2 3 / 4 5 6)', async () => {
  const asteptat: Record<number, readonly [number, number, readonly number[]]> = {
    1: [3, 2, [1, 2, 3, 4, 5, 6]], 2: [3, 2, [3, 2, 1, 6, 5, 4]], 3: [3, 2, [6, 5, 4, 3, 2, 1]], 4: [3, 2, [4, 5, 6, 1, 2, 3]],
    5: [2, 3, [1, 4, 2, 5, 3, 6]], 6: [2, 3, [4, 1, 5, 2, 6, 3]], 7: [2, 3, [6, 3, 5, 2, 4, 1]], 8: [2, 3, [3, 6, 2, 5, 1, 4]],
  };
  for (const [o, [w, h, v]] of Object.entries(asteptat)) {
    const r = await citeste(gri(3, 2, [1, 2, 3, 4, 5, 6], [[274, 3, [Number(o)]]]));
    assert.deepEqual([r.img.latime, r.img.inaltime, canal(r.img)], [w, h, v], `orientarea ${o}`);
  }
});

test('PackBits și LZW pe exemplele specificației TIFF 6.0; Deflate-ul și LZW-ul scriitorilor Windows le acoperă fixturile', async () => {
  // PackBits (TIFF 6.0, secțiunea 9): 15 octeți împachetați → 24 despachetați.
  const impachetat = Uint8Array.of(0xfe, 0xaa, 0x02, 0x80, 0x00, 0x2a, 0xfd, 0xaa, 0x03, 0x80, 0x00, 0x2a, 0x22, 0xf7, 0xaa);
  const pb = scrieTiff([{ etichete: [[256, 4, [24]], [257, 4, [1]], [258, 3, [8]], [259, 3, [32773]], [262, 3, [1]], [278, 4, [1]]], bucati: [impachetat] }]);
  assert.deepEqual(canal((await citeste(pb)).img),
    [0xaa, 0xaa, 0xaa, 0x80, 0x00, 0x2a, 0xaa, 0xaa, 0xaa, 0xaa, 0x80, 0x00, 0x2a, 0x22, ...Array<number>(10).fill(0xaa)]);
  // LZW (secțiunea 13): 7 7 7 8 8 7 7 6 6 → Clear, 7, 258, 8, 8, 258, 6, 6, EOI, câte 9 biți.
  const lzw = coduriLzw([[256, 9], [7, 9], [258, 9], [8, 9], [8, 9], [258, 9], [6, 9], [6, 9], [257, 9]]);
  const l = scrieTiff([{ etichete: [[256, 4, [9]], [257, 4, [1]], [258, 3, [8]], [259, 3, [5]], [262, 3, [1]], [278, 4, [1]]], bucati: [lzw] }]);
  assert.deepEqual(canal((await citeste(l)).img), [7, 7, 7, 8, 8, 7, 7, 6, 6]);
});

// CCITT, pe coduri scrise din tabelele T.4 (alb: 3 = 1000, 0 = 00110101; negru: 2 = 11, 8 = 000101; EOL = 000000000001;
// modurile 2D: P = 0001, H = 001, V0 = 1). Trei rânduri de 8 pixeli: 3 albi, 2 negri, 3 albi; același; tot alb.
const RAND = [0, 0, 0, 1, 1, 0, 0, 0];
const TREI = [...RAND, ...RAND, ...Array<number>(8).fill(0)];
/** Pixelii rândurilor împachetate (1 = negru). */
const despacheteaza = (b: Uint8Array, w: number, h: number): number[] =>
  Array.from({ length: w * h }, (_, k) => ((b[Math.floor(k / w) * Math.ceil(w / 8) + ((k % w) >> 3)] ?? 0) >> (7 - (k % w & 7))) & 1);

test('CCITT: „Modified Huffman” (2, rânduri pe octeți), T.4 1D cu EOL, T.4 2D, T.6 (G4), socotite pe hârtie', () => {
  // MH: fiecare rând începe alb și se termină pe un octet întreg.
  const mh = biti('1000', '11', '1000', '000000', '1000', '11', '1000', '000000', '00110101', '000101', '00');
  assert.deepEqual(despacheteaza(decodeazaCcitt(mh, { latime: 8, randuri: 3, fel: 'mh' }), 8, 3), [...RAND, ...RAND, ...Array<number>(8).fill(1)]);
  // T.4 1D: EOL înaintea fiecărui rând.
  const eol = '000000000001';
  const t41 = biti(eol, '1000', '11', '1000', eol, '1000', '11', '1000', eol, '10011');
  assert.deepEqual(despacheteaza(decodeazaCcitt(t41, { latime: 8, randuri: 3, fel: 't4' }), 8, 3), TREI);
  // T.4 2D: după EOL, bitul 1 = rând 1D, 0 = rând 2D (față de cel de deasupra).
  const t42 = biti(eol, '1', '1000', '11', '1000', eol, '0', '1', '1', '1', eol, '0', '0001', '1');
  assert.deepEqual(despacheteaza(decodeazaCcitt(t42, { latime: 8, randuri: 3, fel: 't4', doiD: true }), 8, 3), TREI);
  // T.6: fără EOL; primul rând față de un rând alb închipuit: H (alb 3, negru 2), apoi V0 până la capăt.
  const t6 = biti('001', '1000', '11', '1', '1', '1', '1', '0001', '1');
  assert.deepEqual(despacheteaza(decodeazaCcitt(t6, { latime: 8, randuri: 3, fel: 't6' }), 8, 3), TREI);
});

test('CCITT, trecerile lungi (completarea, cea extinsă peste 1792): desenul lat de 2600 px, G3 și G4, ca pixelii lui WIC', async () => {
  for (const f of ['wic-lat-g3', 'wic-lat-g4']) {
    const r = await citeste(new Uint8Array(readFileSync(`${DIR}/${f}.tif`)));
    egale(r.img, citestePng(new Uint8Array(readFileSync(`${DIR}/${f}.png`))), f);
  }
  // FillOrder 2 pe G4: aceiași pixeli, din octeții cu biții întorși.
  const b = new Uint8Array(readFileSync(`${DIR}/wic-g4.tif`)), inv = new Uint8Array(b);
  const r0 = await citeste(b);
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength), n = v.getUint16(v.getUint32(4, true), true);
  let off = 0, cnt = 0;
  const ifd = v.getUint32(4, true);
  for (let k = 0; k < n; k++) {
    const e = ifd + 2 + 12 * k, tag = v.getUint16(e, true);
    if (tag === 273) off = v.getUint32(e + 8, true);
    if (tag === 279) cnt = v.getUint32(e + 8, true);
  }
  for (let i = off; i < off + cnt; i++) { let x = b[i] ?? 0, y = 0; for (let j = 0; j < 8; j++) { y = (y << 1) | (x & 1); x >>= 1; } inv[i] = y; }
  // FillOrder (266) nu e în fișier: îl adaug în locul NewSubfileType (254), prima etichetă, cu același tip SHORT.
  const e0 = ifd + 2;
  assert.equal(v.getUint16(e0, true), 254);
  const vi = new DataView(inv.buffer);
  vi.setUint16(e0, 266, true); vi.setUint16(e0 + 2, 3, true); vi.setUint32(e0 + 4, 1, true); vi.setUint32(e0 + 8, 2, true);
  // Etichetele trebuie să rămână crescătoare: 266 vine după 262 (Photometric); cititorul nu cere ordinea.
  egale((await citeste(inv)).img, r0.img, 'G4 cu FillOrder 2');
});

test('o scanare mare se reduce din mers, sub plafon: 4000 × 3000 la 1 bit, tablă de șah, la 1 Mpx (blocuri de 4 × 4)', async () => {
  const W = 4000, H = 3000, rand = W / 8, d = new Uint8Array(rand * H);
  for (let y = 0; y < H; y++) d.fill(y % 2 ? 0x55 : 0xaa, y * rand, (y + 1) * rand);
  const t = scrieTiff([{ etichete: [[256, 4, [W]], [257, 4, [H]], [258, 3, [1]], [259, 3, [1]], [262, 3, [1]], [278, 4, [H]]], bucati: [d] }]);
  const r = await citeste(t, { maxPixeli: 1_000_000 });
  assert.deepEqual([r.latime, r.inaltime, r.img.latime, r.img.inaltime], [W, H, 1000, 750]);
  // Fiecare bloc are 8 pixeli negri și 8 albi: 127,5, rotunjit la 128.
  assert.ok(canal(r.img).every((x) => x === 128));
});

test('refuzurile: JPEG în TIFF, BigTIFF, virgula mobilă, YCbCr și CIELab cu numele lor; o bandă tăiată, „stricat”', async () => {
  const refuz = async (b: Uint8Array): Promise<Extract<RezultatTiff, { ok: false }>> => {
    const r = await decodeazaTiff(b, {});
    assert.ok(!r.ok);
    return r;
  };
  const jpeg = await refuz(gri(1, 1, [0], [[259, 3, [7]]]));
  assert.equal(jpeg.cod, 'nesprijinit');
  assert.match(jpeg.detaliu, /JPEG/);
  const big = Uint8Array.of(0x49, 0x49, 43, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
  assert.match((await refuz(big)).detaliu, /BigTIFF/);
  assert.match((await refuz(gri(1, 1, [0], [[339, 3, [3]]]))).detaliu, /SampleFormat/);
  assert.match((await refuz(gri(1, 1, [0, 0, 0], [[277, 3, [3]]], 8, 6))).detaliu, /YCbCr/);
  assert.match((await refuz(gri(1, 1, [0], [], 8, 8))).detaliu, /CIELab/);
  // Banda spune 100 de octeți, fișierul se termină mai devreme.
  const b = gri(10, 10, Array<number>(100).fill(7));
  const r = await refuz(b.subarray(0, 60));
  assert.equal(r.cod, 'stricat');
  // Nu e TIFF deloc.
  assert.equal((await refuz(Uint8Array.of(1, 2, 3, 4, 5, 6, 7, 8))).cod, 'stricat');
});
