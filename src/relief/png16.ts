/**
 * PNG-ul pe 16 biți al reliefului (ADR 0322, felia 18.1↑g), în `src/relief` (îl folosește workerul reliefului, care nu importă
 * ușile): scriitorul unei imagini gri pe 16 biți (cu textul și scara) și un
 * cititor pentru ce browserul nu dă (el decodează orice PNG pe 8 biți): tipurile de culoare 0, 2, 4, 6, pe 8 și 16 biți, filtrele
 * 0–4, fără întrețesere (refuzată). Compresia prin `CompressionStream` / `DecompressionStream`, deci aceeași în Node și în
 * browser. Ieșirea cititorului e RGBA, rândurile de sus în jos, scalată la 0 … 255 (cu zecimale la 16 biți), ca pixelii unei
 * imagini decodate de browser.
 */

/** CRC-32 al PNG-ului (polinomul 0xEDB88320), aici: relieful nu importă ușile (`src/io/crc32.ts` face același calcul). */
const TABEL_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(b: Uint8Array): number {
  let c = 0xffffffff;
  for (const x of b) c = (TABEL_CRC[(c ^ x) & 0xff] ?? 0) ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const SEMNATURA = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export type PngCitit = {
  readonly latime: number; readonly inaltime: number; readonly adancime: 8 | 16;
  /** RGBA, rândurile de sus în jos, fiecare eșantion scalat la 0 … 255. */
  readonly rgba: Float64Array;
  /** Blocurile `tEXt`, cheie → text. */
  readonly text: Readonly<Record<string, string>>;
  /** Pixelii pe metru din `pHYs` (în metri), dacă are. */
  readonly pixeliPeMetru: number | null;
};

export type EroarePng = { readonly eroare: 'semnatura' | 'nesprijinit' | 'intretesut' | 'stricat' };

async function prinFlux(b: Uint8Array, flux: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  return new Uint8Array(await new Response(new Blob([b.slice()]).stream().pipeThrough(flux)).arrayBuffer());
}

const latin1 = (b: Uint8Array): string => { let s = ''; for (const x of b) s += String.fromCharCode(x); return s; };

/** Adâncimea unui PNG din antetul lui (8, 16 …), ori null dacă nu e un PNG. */
export function adancimePng(o: Uint8Array): number | null {
  if (o.length < 33 || !SEMNATURA.every((b, k) => o[k] === b) || latin1(o.subarray(12, 16)) !== 'IHDR') return null;
  return o[24] ?? null;
}

const paeth = (a: number, b: number, c: number): number => {
  const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
};

/** Citește un PNG (vezi capul fișierului) sau spune de ce nu. */
export async function citestePng(o: Uint8Array): Promise<PngCitit | EroarePng> {
  if (o.length < 8 || !SEMNATURA.every((b, k) => o[k] === b)) return { eroare: 'semnatura' };
  const v = new DataView(o.buffer, o.byteOffset, o.byteLength);
  let latime = 0, inaltime = 0, adancime = 0, tip = -1, intretesut = 0, ppm: number | null = null;
  const idat: Uint8Array[] = [], text: Record<string, string> = {};
  for (let i = 8; i + 12 <= o.length;) {
    const n = v.getUint32(i), t = latin1(o.subarray(i + 4, i + 8));
    if (i + 12 + n > o.length) return { eroare: 'stricat' };
    const d = o.subarray(i + 8, i + 8 + n);
    if (t === 'IHDR') {
      latime = v.getUint32(i + 8); inaltime = v.getUint32(i + 12);
      adancime = d[8] ?? 0; tip = d[9] ?? -1; intretesut = d[12] ?? 0;
    } else if (t === 'IDAT') idat.push(d);
    else if (t === 'tEXt') {
      const z = d.indexOf(0);
      if (z > 0) text[latin1(d.subarray(0, z))] = latin1(d.subarray(z + 1));
    } else if (t === 'pHYs' && n === 9 && d[8] === 1) ppm = v.getUint32(i + 8);
    else if (t === 'IEND') break;
    i += 12 + n;
  }
  if (!(latime > 0 && inaltime > 0)) return { eroare: 'stricat' };
  if (intretesut !== 0) return { eroare: 'intretesut' };
  const canale = ({ 0: 1, 2: 3, 4: 2, 6: 4 } as Readonly<Record<number, number>>)[tip];
  if (!canale || (adancime !== 8 && adancime !== 16)) return { eroare: 'nesprijinit' };
  let lungime = 0;
  for (const b of idat) lungime += b.length;
  const tot = new Uint8Array(lungime);
  let p = 0;
  for (const b of idat) { tot.set(b, p); p += b.length; }
  let brut: Uint8Array;
  try { brut = await prinFlux(tot, new DecompressionStream('deflate')); } catch { return { eroare: 'stricat' }; }
  const oct = adancime / 8, bpp = canale * oct, pas = latime * bpp;
  if (brut.length < inaltime * (pas + 1)) return { eroare: 'stricat' };
  const pix = new Uint8Array(inaltime * pas);
  for (let y = 0; y < inaltime; y++) {
    const f = brut[y * (pas + 1)] ?? 0;
    if (f > 4) return { eroare: 'stricat' };
    for (let x = 0; x < pas; x++) {
      const r = brut[y * (pas + 1) + 1 + x] ?? 0;
      const a = x >= bpp ? pix[y * pas + x - bpp] ?? 0 : 0, b = y > 0 ? pix[(y - 1) * pas + x] ?? 0 : 0;
      const c = x >= bpp && y > 0 ? pix[(y - 1) * pas + x - bpp] ?? 0 : 0;
      const pred = f === 0 ? 0 : f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : paeth(a, b, c);
      pix[y * pas + x] = (r + pred) & 255;
    }
  }
  const maxim = adancime === 16 ? 65535 : 255, rgba = new Float64Array(latime * inaltime * 4);
  const es = (k: number, c: number): number => {
    const q = k * bpp + c * oct;
    return (oct === 2 ? ((pix[q] ?? 0) << 8) | (pix[q + 1] ?? 0) : pix[q] ?? 0) * 255 / maxim;
  };
  for (let k = 0; k < latime * inaltime; k++) {
    const gri = canale <= 2, alfa = canale === 2 || canale === 4;
    const r = es(k, 0), g = gri ? r : es(k, 1), bl = gri ? r : es(k, 2);
    rgba[4 * k] = r; rgba[4 * k + 1] = g; rgba[4 * k + 2] = bl;
    rgba[4 * k + 3] = alfa ? es(k, canale - 1) : 255;
  }
  return { latime, inaltime, adancime: adancime === 16 ? 16 : 8, rgba, text, pixeliPeMetru: ppm };
}

function bloc(tip: string, d: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + d.length), v = new DataView(out.buffer);
  v.setUint32(0, d.length);
  for (let k = 0; k < 4; k++) out[4 + k] = tip.charCodeAt(k);
  out.set(d, 8);
  v.setUint32(8 + d.length, crc32(out.subarray(4, 8 + d.length)));
  return out;
}

/**
 * PNG gri pe 16 biți din eșantioanele `v` (rândurile de sus în jos), cu blocurile `tEXt` (doar latin-1) și, opțional, `pHYs`
 * (pixelii pe metru, pe ambele axe). Rândurile cu filtrul 0.
 */
export async function scriePngGri16(
  v: Uint16Array, latime: number, inaltime: number, o: { readonly text?: Readonly<Record<string, string>>; readonly pixeliPeMetru?: number } = {},
): Promise<Uint8Array> {
  const cap = new Uint8Array(13), vc = new DataView(cap.buffer);
  vc.setUint32(0, latime); vc.setUint32(4, inaltime); cap[8] = 16; cap[9] = 0;
  const pas = 1 + 2 * latime, brut = new Uint8Array(inaltime * pas);
  for (let y = 0; y < inaltime; y++) {
    for (let x = 0; x < latime; x++) {
      const s = v[y * latime + x] ?? 0, q = y * pas + 1 + 2 * x;
      brut[q] = s >> 8; brut[q + 1] = s & 255;
    }
  }
  const parti: Uint8Array[] = [Uint8Array.from(SEMNATURA), bloc('IHDR', cap)];
  if (o.pixeliPeMetru !== undefined) {
    const d = new Uint8Array(9), vd = new DataView(d.buffer);
    vd.setUint32(0, Math.round(o.pixeliPeMetru)); vd.setUint32(4, Math.round(o.pixeliPeMetru)); d[8] = 1;
    parti.push(bloc('pHYs', d));
  }
  for (const [k, t] of Object.entries(o.text ?? {})) {
    const s = `${k}\0${t}`, d = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) d[i] = s.charCodeAt(i) & 255;
    parti.push(bloc('tEXt', d));
  }
  parti.push(bloc('IDAT', await prinFlux(brut, new CompressionStream('deflate'))), bloc('IEND', new Uint8Array(0)));
  let n = 0;
  for (const x of parti) n += x.length;
  const out = new Uint8Array(n);
  let p = 0;
  for (const x of parti) { out.set(x, p); p += x.length; }
  return out;
}
