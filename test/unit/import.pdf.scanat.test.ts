import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { citestePdf, imagineaPaginiiPdf, type ImaginePdf } from '../../src/io/pdf.ts';
import { decodeazaTiff } from '../../src/trasare/tiff.ts';
import type { ImagineRGBA } from '../../src/trasare/trasare.ts';
import { TRASARE_IMPLICITA } from '../../src/io/imagine.ts';
import { raspundeTrasare } from '../../src/jobs/calculTrasare.ts';
import { cerereTrasare, previzualizarePdf } from '../../src/ui/actiuniImportCalcul.ts';
import { citestePng } from './ajutor-png.ts';
import { cuImagini, flux, pdf } from './ajutor-pdf.ts';
import { bandaTiff, biti } from './ajutor-tiff.ts';

/**
 * PDF-urile scanate (ADR 0270, felia 25.7↑): imaginea paginii, scoasă din PDF ca fișier pe care îl citește workerul
 * trasării (JPEG, sau TIFF pentru CCITT și eșantioanele brute). Fluxul G4 e chiar banda unei fixturi scrise de WIC (ADR
 * 0229), deci pixelii așteptați sunt ai lui WIC; restul, cu valorile pe hârtie.
 */

const DIR = 'test/fixtures/trasare/tiff';
type Ok = Extract<ImaginePdf, { ok: true }>;

/** Banda (una singură) a unei fixturi TIFF scrise de WIC. */
const banda = (f: string): Uint8Array => bandaTiff(new Uint8Array(readFileSync(`${DIR}/${f}`)));
async function imagine(b: Buffer, pagina = 1): Promise<Ok> {
  const r = await imagineaPaginiiPdf(new Uint8Array(b), { pagina });
  assert.ok(r.ok, r.ok ? '' : `${r.cod}: ${r.detaliu ?? ''}`);
  return r;
}
async function pixeli(r: Ok): Promise<ImagineRGBA> {
  assert.equal(r.fisier.tip, 'tiff');
  const t = await decodeazaTiff(r.fisier.octeti, {});
  assert.ok(t.ok, t.ok ? '' : t.detaliu);
  return t.img;
}
const canal = (img: ImagineRGBA, c = 0): number[] => Array.from({ length: img.latime * img.inaltime }, (_, k) => img.date[4 * k + c] ?? 0);
function egale(a: ImagineRGBA, b: ImagineRGBA, nume: string): void {
  assert.deepEqual([a.latime, a.inaltime], [b.latime, b.inaltime], nume);
  let rau = 0;
  for (let i = 0; i < a.date.length; i++) if (a.date[i] !== b.date[i]) rau++;
  assert.equal(rau, 0, `${nume}: ${rau} valori diferite`);
}
const G4 = (parametri = '', decode = ''): Buffer => cuImagini(240, 160, 'q 240 0 0 160 0 0 cm /Im1 Do Q', [[
  `/Width 240 /Height 160 /ColorSpace /DeviceGray /BitsPerComponent 1 /Filter /CCITTFaxDecode /DecodeParms << /K -1 /Columns 240 /Rows 160 ${parametri} >> ${decode}`,
  banda('wic-g4.tif'),
]]);

test('o pagină scanată G4: „gol” la vectori, cu o imagine; imaginea paginii, un TIFF G4 cu pixelii lui WIC, la DPI-ul așezării', async () => {
  const r = await citestePdf(new Uint8Array(G4()));
  assert.ok(!r.ok && r.cod === 'gol', JSON.stringify(r).slice(0, 120));
  assert.equal(r.imagini, 1);
  const im = await imagine(G4());
  assert.deepEqual([im.latimePx, im.inaltimePx, im.orientare, im.pagini, im.pagina], [240, 160, 1, 1, 1]);
  // 240 pt = 84,67 mm; 240 px pe 240 / 72 țoli: 72 dpi.
  assert.ok(Math.abs(im.latimeMm - (240 * 25.4) / 72) < 1e-9 && Math.abs(im.inaltimeMm - (160 * 25.4) / 72) < 1e-9);
  assert.ok(Math.abs(im.dpi - 72) < 1e-9, String(im.dpi));
  const wic = citestePng(new Uint8Array(readFileSync(`${DIR}/wic-g4.png`)));
  egale(await pixeli(im), wic, 'G4, implicit (BlackIs1 fals)');
  // BlackIs1 cu Decode [1 0]: același desen; BlackIs1 singur: întors.
  egale(await pixeli(await imagine(G4('/BlackIs1 true', '/Decode [1 0]'))), wic, 'G4, BlackIs1 cu Decode [1 0]');
  const intors = await pixeli(await imagine(G4('/BlackIs1 true')));
  assert.deepEqual(canal(intors).slice(0, 50), canal(wic).slice(0, 50).map((x) => 255 - x));
});

test('Flate pe gri cu predictorul PNG (Up), Decode inversat; paleta Indexed pe 1 bit; ImageMask, și cu Decode [1 0]; 16 biți', async () => {
  // 3 × 2: rândul 2 cu filtrul Up (diferențele față de rândul 1).
  const gri = deflateSync(Uint8Array.of(0, 1, 2, 3, 2, 3, 3, 3));
  const dict = (decode = ''): string => `/Width 3 /Height 2 /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode /DecodeParms << /Predictor 15 /Columns 3 /Colors 1 /BitsPerComponent 8 >> ${decode}`;
  assert.deepEqual(canal(await pixeli(await imagine(cuImagini(30, 20, 'q 30 0 0 20 0 0 cm /Im1 Do Q', [[dict(), gri]])))), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(canal(await pixeli(await imagine(cuImagini(30, 20, 'q 30 0 0 20 0 0 cm /Im1 Do Q', [[dict('/Decode [1 0]'), gri]])))),
    [254, 253, 252, 251, 250, 249]);
  // Indexed: 0 roșu, 1 verde; 8 × 1, 1 bit: 1 0 1 0 0 0 0 0.
  const ix = await pixeli(await imagine(cuImagini(80, 10, 'q 80 0 0 10 0 0 cm /Im1 Do Q', [[
    '/Width 8 /Height 1 /ColorSpace [/Indexed /DeviceRGB 1 <FF000000FF00>] /BitsPerComponent 1', Uint8Array.of(0b10100000)]])));
  assert.deepEqual([canal(ix, 0), canal(ix, 1)], [[0, 255, 0, 255, 255, 255, 255, 255], [255, 0, 255, 0, 0, 0, 0, 0]]);
  // ImageMask: cerneala e eșantionul 0 (cu Decode [1 0], 1).
  const masca = (decode: string): Buffer => cuImagini(80, 10, 'q 80 0 0 10 0 0 cm /Im1 Do Q', [[`/Width 8 /Height 1 /ImageMask true ${decode}`, Uint8Array.of(0b00001111)]]);
  assert.deepEqual(canal(await pixeli(await imagine(masca('')))), [0, 0, 0, 0, 255, 255, 255, 255]);
  assert.deepEqual(canal(await pixeli(await imagine(masca('/Decode [1 0]')))), [255, 255, 255, 255, 0, 0, 0, 0]);
  // 16 biți, gri: eșantioanele PDF sunt MM (0x1001 / 257 = 15,9 → 16).
  const g16 = cuImagini(20, 10, 'q 20 0 0 10 0 0 cm /Im1 Do Q', [['/Width 2 /Height 1 /ColorSpace /DeviceGray /BitsPerComponent 16', Uint8Array.of(0x10, 0x01, 0xff, 0xff)]]);
  assert.deepEqual(canal(await pixeli(await imagine(g16))), [16, 255]);
  // RGB și CMYK, brute; ICCBased după /N (profilul nu se aplică): 4 componente, CMYK, iar negrul plin (K = 255) e negru.
  const unu = (cs: string, date: Uint8Array, obiecte: ReadonlyArray<string | Buffer> = []): Buffer =>
    cuImagini(20, 10, 'q 20 0 0 10 0 0 cm /Im1 Do Q', [[`/Width 1 /Height 1 /ColorSpace ${cs} /BitsPerComponent 8`, date]], '', obiecte);
  assert.deepEqual(Array.from((await pixeli(await imagine(unu('/DeviceRGB', Uint8Array.of(10, 20, 30))))).date), [10, 20, 30, 255]);
  assert.deepEqual(Array.from((await pixeli(await imagine(unu('/DeviceCMYK', Uint8Array.of(255, 0, 0, 0))))).date), [0, 255, 255, 255]);
  assert.deepEqual(Array.from((await pixeli(await imagine(unu('[/ICCBased 6 0 R]', Uint8Array.of(0, 0, 0, 255), [flux('/N 4', '')])))).date), [0, 0, 0, 255]);
  // Fără /N bun, spațiul de rezervă (/Alternate).
  assert.deepEqual(Array.from((await pixeli(await imagine(unu('[/ICCBased 6 0 R]', Uint8Array.of(7), [flux('/N 2 /Alternate /DeviceGray', '')])))).date), [7, 7, 7, 255]);
});

test('JPEG (DCTDecode): octeții trec întregi, ca fișier JPEG; după un filtru ASCIIHex, decodați întâi', async () => {
  const jpg = new Uint8Array(readFileSync(`${DIR}/wic-color.jpg`));
  const im = await imagine(cuImagini(240, 160, 'q 240 0 0 160 0 0 cm /Im1 Do Q', [['/Width 240 /Height 160 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode', jpg]]));
  assert.equal(im.fisier.tip, 'jpeg');
  assert.deepEqual(im.fisier.octeti, jpg);
  const hex = new TextEncoder().encode(`${Array.from(jpg, (x) => x.toString(16).padStart(2, '0')).join('')}>`);
  const h = await imagine(cuImagini(240, 160, 'q 240 0 0 160 0 0 cm /Im1 Do Q', [['/Width 240 /Height 160 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter [/ASCIIHexDecode /DCTDecode]', hex]]));
  assert.deepEqual(h.fisier.octeti, jpg);
  // Un JPEG cu Exif (orientarea 6, ca de la un telefon, pus în PDF neschimbat): segmentul APP1 Exif iese, restul rămâne.
  // Un cititor PDF nu aplică orientarea Exif (o spune așezarea), dar browserul ar aplica-o la decodare.
  const ifd = Buffer.from([0x49, 0x49, 42, 0, 8, 0, 0, 0, 1, 0, 0x12, 0x01, 3, 0, 1, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 0]);
  const app1 = Buffer.concat([Buffer.from([0xff, 0xe1, 0, 2 + 6 + ifd.length]), Buffer.from('Exif\x00\x00', 'latin1'), ifd]);
  const cuExif = Buffer.concat([jpg.subarray(0, 2), app1, jpg.subarray(2)]);
  const e = await imagine(cuImagini(240, 160, 'q 240 0 0 160 0 0 cm /Im1 Do Q', [['/Width 240 /Height 160 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode', cuExif]]));
  assert.deepEqual(e.fisier.octeti, jpg);
});

test('orientarea din așezare: cele opt cazuri (și mărimea afișată), plus /Rotate 90 pe pagină', async () => {
  const brut = new Uint8Array(240 * 160);
  const cu = (cm: string, extra = ''): Buffer => cuImagini(400, 400, `q ${cm} cm /Im1 Do Q`, [['/Width 240 /Height 160 /ColorSpace /DeviceGray /BitsPerComponent 8', brut]], extra);
  const mm = (pt: number): number => (pt * 25.4) / 72;
  const cazuri: ReadonlyArray<readonly [string, number, number, number]> = [
    ['240 0 0 160 0 0', 1, 240, 160], ['-240 0 0 160 240 0', 2, 240, 160], ['-240 0 0 -160 240 160', 3, 240, 160],
    ['240 0 0 -160 0 160', 4, 240, 160], ['0 -240 -160 0 160 240', 5, 160, 240], ['0 -240 160 0 0 240', 6, 160, 240],
    ['0 240 160 0 0 0', 7, 160, 240], ['0 240 -160 0 160 0', 8, 160, 240],
  ];
  for (const [cm, o, l, h] of cazuri) {
    const im = await imagine(cu(cm));
    assert.deepEqual([im.orientare, Math.round(im.latimeMm * 1000), Math.round(im.inaltimeMm * 1000)], [o, Math.round(mm(l) * 1000), Math.round(mm(h) * 1000)], cm);
  }
  // Pagina rotită la afișare cu 90°: imaginea dreaptă apare rotită în sensul acelor.
  assert.equal((await imagine(cu('240 0 0 160 0 0', '/Rotate 90'))).orientare, 6);
});

test('cea mai mare imagine a paginii; refuzurile: JBIG2, JPEG 2000, Separation, o pagină fără imagine', async () => {
  const mic = new Uint8Array(4 * 4), mare = new Uint8Array(20 * 10);
  const doua = cuImagini(400, 400, 'q 10 0 0 10 0 0 cm /Im1 Do Q q 200 0 0 100 50 50 cm /Im2 Do Q', [
    ['/Width 4 /Height 4 /ColorSpace /DeviceGray /BitsPerComponent 8', mic],
    ['/Width 20 /Height 10 /ColorSpace /DeviceGray /BitsPerComponent 8', mare],
  ]);
  assert.equal((await citestePdf(new Uint8Array(doua)) as { imagini?: number }).imagini, 2);
  assert.deepEqual([(await imagine(doua)).latimePx, (await imagine(doua)).inaltimePx], [20, 10]);
  const refuz = async (d: string, date = Uint8Array.of(0)): Promise<string> => {
    const r = await imagineaPaginiiPdf(new Uint8Array(cuImagini(20, 20, 'q 20 0 0 20 0 0 cm /Im1 Do Q', [[d, date]])), {});
    assert.ok(!r.ok);
    return `${r.cod}: ${r.detaliu ?? ''}`;
  };
  assert.match(await refuz('/Width 8 /Height 8 /ColorSpace /DeviceGray /BitsPerComponent 1 /Filter /JBIG2Decode'), /^nesprijinit: .*JBIG2/);
  assert.match(await refuz('/Width 8 /Height 8 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /JPXDecode'), /^nesprijinit: .*JPEG 2000/);
  assert.match(await refuz('/Width 1 /Height 1 /ColorSpace [/Separation /Auriu /DeviceCMYK 6 0 R] /BitsPerComponent 8'), /^nesprijinit: .*Separation/);
  const fara = await imagineaPaginiiPdf(new Uint8Array(pdf([
    '<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 72 72] /Contents 4 0 R >>', flux('', '0 0 m 10 10 l S'),
  ])), {});
  assert.ok(!fara.ok && fara.cod === 'fara-imagine');
});

const G4_DICT = '/Width 240 /Height 160 /ColorSpace /DeviceGray /BitsPerComponent 1 /Filter /CCITTFaxDecode /DecodeParms << /K -1 /Columns 240 /Rows 160 >>';

test('ușa: o pagină doar cu imaginea se trasează singură (cu paginile PDF-ului, DPI-ul așezării și poza ei); una și cu vectori, la cerere', async () => {
  const wic = citestePng(new Uint8Array(readFileSync(`${DIR}/wic-g4.png`)));
  const f = { nume: 'scan.pdf', octeti: new Uint8Array(G4()) };
  const p = await previzualizarePdf(f, 1);
  assert.ok(p.ok && p.format === 'imagine', JSON.stringify(p).slice(0, 200));
  assert.equal(p.trasare.pagini, 1);
  assert.equal(p.trasare.scara, 'fisier');
  assert.ok(Math.abs(p.trasare.dpi - 72) < 1e-6, String(p.trasare.dpi));
  assert.equal(p.vectoriPdf, false);
  assert.ok(p.exterioare + p.interioare > 3, `${p.exterioare} + ${p.interioare}`);
  // Fereastra nu citește PDF-ul: poza vine de la worker, cu pixelii lui WIC.
  assert.ok(p.trasare.poza);
  egale(p.trasare.poza, wic, 'poza paginii');
  // Așezată rotită (orientarea 6, pe o pagină de 160 × 240 pt): imaginea, poza și mărimea stau ca pe pagină. Pixelul afișat
  // (X, Y) e eșantionul (coloana Y, rândul 159 − X).
  const rotita = await previzualizarePdf({ nume: 'rotita.pdf', octeti: new Uint8Array(cuImagini(160, 240, 'q 0 -240 160 0 0 240 cm /Im1 Do Q', [[G4_DICT, banda('wic-g4.tif')]])) }, 1);
  assert.ok(rotita.ok && rotita.format === 'imagine', JSON.stringify(rotita).slice(0, 200));
  assert.deepEqual([rotita.trasare.intreg.latimePx, rotita.trasare.intreg.inaltimePx], [160, 240]);
  assert.ok(Math.abs(rotita.trasare.latimeMm - (160 * 25.4) / 72) < 1e-6 && Math.abs(rotita.trasare.inaltimeMm - (240 * 25.4) / 72) < 1e-6);
  const pr = rotita.trasare.poza;
  assert.ok(pr);
  let rau = 0;
  for (let Y = 0; Y < 240; Y++) for (let X = 0; X < 160; X++) if (pr.date[4 * (Y * 160 + X)] !== wic.date[4 * ((159 - X) * 240 + Y)]) rau++;
  assert.equal(rau, 0, `${rau} pixeli rotiți greșit`);
  // Și cu vectori: implicit vectorii, cu numărul imaginilor; cu imaginea cerută, trasarea, cu vectorii spuși.
  const amandoua = { nume: 'amandoua.pdf', octeti: new Uint8Array(cuImagini(240, 160, 'q 240 0 0 160 0 0 cm /Im1 Do Q 10 10 m 100 100 l S', [[G4_DICT, banda('wic-g4.tif')]])) };
  const v = await previzualizarePdf(amandoua, 1);
  assert.ok(v.ok && v.format === 'pdf');
  assert.equal(v.imagini, 1);
  const t = await previzualizarePdf(amandoua, 1, { imagine: true });
  assert.ok(t.ok && t.format === 'imagine');
  assert.equal(t.vectoriPdf, true);
  // O pagină doar cu vectori: cererea imaginii nu schimbă nimic.
  const doarVectori = await previzualizarePdf({ nume: 'v.pdf', octeti: new Uint8Array(cuImagini(240, 160, '10 10 m 100 100 l S', [])) }, 1, { imagine: true });
  assert.ok(doarVectori.ok && doarVectori.format === 'pdf' && doarVectori.imagini === 0);
  // Un PDF cu JBIG2: refuzul imaginii, cu numele filtrului (fără vectori de care să se întoarcă).
  const jb = { nume: 'jb.pdf', octeti: new Uint8Array(cuImagini(20, 20, 'q 20 0 0 20 0 0 cm /Im1 Do Q', [['/Width 8 /Height 8 /ColorSpace /DeviceGray /BitsPerComponent 1 /Filter /JBIG2Decode', Uint8Array.of(0)]])) };
  const rj = await previzualizarePdf(jb, 1);
  assert.ok(!rj.ok && rj.cod === 'pdf-imagine' && rj.format === 'pdf' && /JBIG2/.test(rj.detaliu ?? '') && rj.vectoriPdf === false && rj.pagini === 1, JSON.stringify(rj));
  // Un flux G4 stricat (refuzul cititorului TIFF): al imaginii paginii, nu „TIFF stricat”.
  const stricat = await previzualizarePdf({ nume: 's.pdf', octeti: new Uint8Array(cuImagini(240, 160, 'q 240 0 0 160 0 0 cm /Im1 Do Q', [[G4_DICT, Uint8Array.of(0, 0, 0, 0, 0, 0)]])) }, 1);
  assert.ok(!stricat.ok && stricat.cod === 'pdf-imagine-stricata' && stricat.format === 'pdf', JSON.stringify(stricat));
});

test('CCITT: G3 1D (K = 0, fluxul fixturii WIC), G3 1D cu rândurile pe octeți (compresia TIFF 2), G3 2D (K > 0); refuzurile', async () => {
  const g3 = await imagine(cuImagini(240, 160, 'q 240 0 0 160 0 0 cm /Im1 Do Q', [[
    '/Width 240 /Height 160 /ColorSpace /DeviceGray /BitsPerComponent 1 /Filter /CCITTFaxDecode /DecodeParms << /K 0 /Columns 240 >>', banda('wic-g3.tif')]]));
  egale(await pixeli(g3), citestePng(new Uint8Array(readFileSync(`${DIR}/wic-g3.png`))), 'G3 1D');
  // 8 × 2, scris de mână (T.4, tabelele 2 și 3): rândul 0 alb 2, negru 3, alb 3; rândul 1 alb 3, negru 2, alb 3.
  const ccitt = (dp: string, date: Uint8Array): Buffer => cuImagini(80, 20, 'q 80 0 0 20 0 0 cm /Im1 Do Q', [[
    `/Width 8 /Height 2 /ColorSpace /DeviceGray /BitsPerComponent 1 /Filter /CCITTFaxDecode /DecodeParms << /Columns 8 ${dp} >>`, date]]);
  const desen = [255, 255, 0, 0, 0, 255, 255, 255];
  // Pe octeți, fără EOL: după fiecare rând, biții de umplere. Al doilea rând are negru: citite fără aliniere, umplerea și
  // codul lui fac albul 29 (`00000010`), care pe 8 px ar umple un rând alb la fel de bine (otrava P10 a scăpat așa).
  const mh = await pixeli(await imagine(ccitt('/K 0 /EncodedByteAlign true', biti('0111', '10', '1000', '000000', '1000', '11', '1000', '000000'))));
  assert.deepEqual(canal(mh), [...desen, 255, 255, 255, 0, 0, 255, 255, 255]);
  // 2D: fiecare rând după EOL, cu bitul lui (1: 1D, 0: 2D); al doilea rând, trei V0 (la fel ca primul).
  const eol = '000000000001';
  const doiD = await pixeli(await imagine(ccitt('/K 1', biti(eol, '1', '0111', '10', '1000', eol, '0', '1', '1', '1', '0000'))));
  assert.deepEqual(canal(doiD), [...desen, ...desen]);
  const refuz = async (dp: string): Promise<string> => {
    const r = await imagineaPaginiiPdf(new Uint8Array(ccitt(dp, Uint8Array.of(0))), {});
    assert.ok(!r.ok);
    return `${r.cod}: ${r.detaliu ?? ''}`;
  };
  assert.match(await refuz('/K -1 /EncodedByteAlign true'), /^nesprijinit: .*EncodedByteAlign/);
  assert.match(await refuz('/K 1 /EncodedByteAlign true'), /^nesprijinit: .*EncodedByteAlign/);
  const latimi = await imagineaPaginiiPdf(new Uint8Array(cuImagini(80, 20, 'q 80 0 0 20 0 0 cm /Im1 Do Q', [[
    '/Width 8 /Height 2 /ColorSpace /DeviceGray /BitsPerComponent 1 /Filter /CCITTFaxDecode /DecodeParms << /K -1 /Columns 16 >>', Uint8Array.of(0)]])), {});
  assert.ok(!latimi.ok && latimi.cod === 'nesprijinit' && /Columns 16/.test(latimi.detaliu ?? ''), JSON.stringify(latimi));
  // Decodarea obișnuită (conținutul paginii) refuză un filtru de imagine: un flux de conținut cu DCT e un flux stricat,
  // numărat, nu o cale citită din octeții lui.
  const dctContinut = await citestePdf(new Uint8Array(pdf([
    '<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 72 72] /Contents 4 0 R >>', flux('/Filter /DCTDecode', '0 0 m 10 10 l S'),
  ])));
  assert.ok(!dctContinut.ok && dctContinut.cod === 'gol' && dctContinut.avertismente?.['fluxuri-stricate'] === 1, JSON.stringify(dctContinut).slice(0, 200));
  // Un filtru de imagine care nu e ultimul: stricat.
  const dctFlate = await imagineaPaginiiPdf(new Uint8Array(cuImagini(20, 20, 'q 20 0 0 20 0 0 cm /Im1 Do Q', [[
    '/Width 1 /Height 1 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter [/DCTDecode /FlateDecode]', Uint8Array.of(0)]])), {});
  assert.ok(!dctFlate.ok && dctFlate.cod === 'stricat' && /nu e ultimul/.test(dctFlate.detaliu ?? ''), JSON.stringify(dctFlate));
});

test('imaginea ascunsă pe un strat oprit nu se numără; una dintr-un Form XObject, cu matricea formei; datele scurte se completează cu hârtie', async () => {
  const ascunsa = pdf([
    '<< /Type /Catalog /Pages 2 0 R /OCProperties << /OCGs [6 0 R] /D << /OFF [6 0 R] >> >> >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 20 20] /Resources << /XObject << /Im1 5 0 R >> >> /Contents 4 0 R >>',
    flux('', 'q 20 0 0 20 0 0 cm /Im1 Do Q'),
    flux('/Type /XObject /Subtype /Image /Width 1 /Height 1 /ColorSpace /DeviceGray /BitsPerComponent 8 /OC 6 0 R', Uint8Array.of(0)),
    '<< /Type /OCG /Name (Ascuns) >>',
  ]);
  const ra = await citestePdf(new Uint8Array(ascunsa));
  assert.ok(!ra.ok && ra.cod === 'gol' && ra.imagini === 0 && ra.avertismente?.ascunse === 1, JSON.stringify(ra).slice(0, 300));
  // Forma mărește de 2 ori: imaginea așezată 60 × 40 pt în formă stă 120 × 80 pt pe pagină.
  const forma = pdf([
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Resources << /XObject << /Fm1 5 0 R >> >> /Contents 4 0 R >>',
    flux('', '/Fm1 Do'),
    flux('/Type /XObject /Subtype /Form /BBox [0 0 100 100] /Matrix [2 0 0 2 0 0] /Resources << /XObject << /Im1 6 0 R >> >>', 'q 60 0 0 40 0 0 cm /Im1 Do Q'),
    flux('/Type /XObject /Subtype /Image /Width 6 /Height 4 /ColorSpace /DeviceGray /BitsPerComponent 8', new Uint8Array(24)),
  ]);
  const f = await imagine(forma);
  assert.deepEqual([Math.round(f.latimeMm * 1e6), Math.round(f.inaltimeMm * 1e6)], [Math.round(((120 * 25.4) / 72) * 1e6), Math.round(((80 * 25.4) / 72) * 1e6)]);
  // 2 × 2 gri cu doar primul rând: al doilea, alb (și cu Decode inversat, tot alb).
  const scurt = (decode: string): Buffer => cuImagini(20, 20, 'q 20 0 0 20 0 0 cm /Im1 Do Q', [[`/Width 2 /Height 2 /ColorSpace /DeviceGray /BitsPerComponent 8 ${decode}`, Uint8Array.of(10, 20)]]);
  assert.deepEqual(canal(await pixeli(await imagine(scurt('')))), [10, 20, 255, 255]);
  assert.deepEqual(canal(await pixeli(await imagine(scurt('/Decode [1 0]')))), [245, 235, 255, 255]);
});

test('ușa: vectori refuzați (departe) lângă o imagine: refuzul lor, cu oferta imaginii; a doua pagină a unui PDF, trasată, cu paginile lui', async () => {
  const departe = await previzualizarePdf({ nume: 'd.pdf', octeti: new Uint8Array(cuImagini(240, 160,
    'q 240 0 0 160 0 0 cm /Im1 Do Q 100000000 100000000 m 100000010 100000010 l S', [[G4_DICT, banda('wic-g4.tif')]])) }, 1);
  assert.ok(!departe.ok && departe.cod === 'departe' && departe.format === 'pdf' && departe.imagini === 1, JSON.stringify(departe).slice(0, 200));
  const doua = pdf([
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R 5 0 R] /Count 2 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 72 72] /Contents 4 0 R >>',
    flux('', '10 10 m 50 50 l S'),
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 240 160] /Resources << /XObject << /Im1 7 0 R >> >> /Contents 6 0 R >>',
    flux('', 'q 240 0 0 160 0 0 cm /Im1 Do Q'),
    flux(`/Type /XObject /Subtype /Image ${G4_DICT}`, banda('wic-g4.tif')),
  ]);
  const p2 = await previzualizarePdf({ nume: 'doua.pdf', octeti: new Uint8Array(doua) }, 2);
  assert.ok(p2.ok && p2.format === 'imagine' && p2.trasare.pagini === 2, JSON.stringify(p2).slice(0, 200));
});

test('calculul: imaginea redusă, apoi întoarsă (orientarea 6): mărimea din fișier se întoarce și ea, deci scara rămâne a așezării', async () => {
  const im = await imagine(cuImagini(160, 240, 'q 0 -240 160 0 0 240 cm /Im1 Do Q', [[G4_DICT, banda('wic-g4.tif')]]));
  assert.equal(im.orientare, 6);
  const c = { ...cerereTrasare({ nume: 'r.pdf', octeti: im.fisier.octeti }, TRASARE_IMPLICITA, undefined, { dpi: im.dpi, orientare: im.orientare }), maxPixeli: 9600 };
  const { raspuns: r } = await raspundeTrasare(c);
  assert.ok('redusDin' in r, JSON.stringify(r).slice(0, 200));
  // 240 × 160 redus de 2 ori (9 600 px): 120 × 80, întors: 80 × 120; din fișier, 160 × 240, cum stă pe pagină.
  assert.deepEqual(r.redusDin, { latime: 160, inaltime: 240 });
  assert.deepEqual([r.intreg.latime, r.intreg.inaltime], [80, 120]);
  assert.ok(Math.abs(r.dpi - 72) < 1e-9 && Math.abs(r.mmPePx * 80 - (160 * 25.4) / 72) < 1e-9, `${r.dpi} ${r.mmPePx}`);
  assert.deepEqual([r.poza?.latime, r.poza?.inaltime], [80, 120]);
});
