import { inflateSync } from 'node:zlib';
import type { ImagineRGBA } from '../../src/trasare/trasare.ts';

/**
 * Cititorul PNG al probelor (ADR 0220): 8 biți, gri, gri cu alfa, RGB sau RGBA, fără întrețesere, cu filtrele 0–4. În
 * aplicație imaginea o decodează browserul (`createImageBitmap`); în Node, testele o citesc cu `node:zlib`.
 */
export function citestePng(octeti: Uint8Array): ImagineRGBA {
  const v = new DataView(octeti.buffer, octeti.byteOffset, octeti.byteLength);
  const semnatura = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (!semnatura.every((b, k) => octeti[k] === b)) throw new Error('nu e PNG');
  let i = 8, latime = 0, inaltime = 0, tip = 0;
  const idat: Uint8Array[] = [];
  while (i < octeti.length) {
    const n = v.getUint32(i);
    const t = String.fromCharCode(...octeti.subarray(i + 4, i + 8));
    const d = octeti.subarray(i + 8, i + 8 + n);
    if (t === 'IHDR') {
      latime = v.getUint32(i + 8);
      inaltime = v.getUint32(i + 12);
      tip = d[9] ?? 0;
      if (d[8] !== 8 || d[12] !== 0 || ![0, 2, 4, 6].includes(tip)) throw new Error(`PNG nesprijinit (adâncimea ${d[8]}, tipul ${tip})`);
    } else if (t === 'IDAT') idat.push(d);
    i += 12 + n;
  }
  const canale = ({ 0: 1, 2: 3, 4: 2, 6: 4 } as Record<number, number>)[tip] ?? 4;
  const brut = inflateSync(Buffer.concat(idat));
  const pas = latime * canale;
  const pix = new Uint8Array(inaltime * pas);
  for (let y = 0; y < inaltime; y++) {
    const filtru = brut[y * (pas + 1)] ?? 0;
    for (let x = 0; x < pas; x++) {
      const r = brut[y * (pas + 1) + 1 + x] ?? 0;
      const a = x >= canale ? pix[y * pas + x - canale] ?? 0 : 0;
      const b = y > 0 ? pix[(y - 1) * pas + x] ?? 0 : 0;
      const c = x >= canale && y > 0 ? pix[(y - 1) * pas + x - canale] ?? 0 : 0;
      let val = r;
      if (filtru === 1) val = r + a;
      else if (filtru === 2) val = r + b;
      else if (filtru === 3) val = r + ((a + b) >> 1);
      else if (filtru === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        val = r + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
      }
      pix[y * pas + x] = val & 255;
    }
  }
  const date = new Uint8ClampedArray(latime * inaltime * 4);
  for (let p = 0; p < latime * inaltime; p++) {
    const s = p * canale;
    const g = pix[s] ?? 0;
    const [r, gg, b, al] = canale === 1 ? [g, g, g, 255] : canale === 2 ? [g, g, g, pix[s + 1] ?? 255]
      : canale === 3 ? [g, pix[s + 1] ?? 0, pix[s + 2] ?? 0, 255] : [g, pix[s + 1] ?? 0, pix[s + 2] ?? 0, pix[s + 3] ?? 255];
    date.set([r, gg, b, al], p * 4);
  }
  return { latime, inaltime, date };
}
