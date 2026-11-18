/**
 * Cititorul TIFF (ADR 0229): browserele nu decodează TIFF, deci workerul trasării îl citește singur. Antetul clasic (II și
 * MM), un IFD pe pagină (miniaturile, cu NewSubfileType bitul 0, nu sunt pagini); benzile sau plăcile, în ordinea planară 1
 * sau 2; compresiile fără (1), CCITT (2, 3, 4, prin `ccitt.ts`), LZW (5), Deflate (8, 32946; prin `DecompressionStream`,
 * al platformei) și PackBits (32773); predictorul orizontal (2); interpretările alb-e-zero, negru-e-zero, RGB, paleta și
 * CMYK; 1, 2, 4, 8 și 16 biți pe eșantion; alfa asociat sau nu; FillOrder 2; orientarea (eticheta 274). Ce nu știe refuză cu
 * numele lui (JPEG în TIFF, BigTIFF, virgula mobilă, YCbCr, CIELab …). O imagine peste plafon se reduce din mers, rând cu
 * rând (media blocurilor de k × k pixeli), deci o scanare mare nu se desface întreagă în memorie.
 *
 * Pur, fără importuri din aplicație (regula `trasare-izolat`).
 */
import { decodeazaCcitt, EroareCcitt } from './ccitt.ts';
import type { ImagineRGBA } from './trasare.ts';

export type RezultatTiff =
  | {
    readonly ok: true; readonly img: ImagineRGBA;
    /** Mărimea imaginii din fișier, după orientare (cea decodată poate fi redusă). */
    readonly latime: number; readonly inaltime: number;
    /** Câte pagini are fișierul și care s-a citit (de la 1). */
    readonly pagini: number; readonly pagina: number;
    /** DPI-ul pe orizontală (după orientare), din XResolution / YResolution și ResolutionUnit; null: nespus. */
    readonly dpi: number | null;
  }
  | { readonly ok: false; readonly cod: 'stricat' | 'nesprijinit'; readonly detaliu: string; readonly pagini?: number };

/** Plafonul implicit al pixelilor decodați (cât al trasării, ADR 0220 §9). */
const MAX_IMPLICIT = 16_000_000;
/** Peste atâția pixeli, fișierul se refuză (o scanare A0 la 600 dpi are ~0,7 Gpx). */
const MAX_FISIER = 1_000_000_000;

class Stricat extends Error {}
class Nesprijinit extends Error {}

/** Numele compresiilor pe care le refuză, pentru mesaj. */
const COMPRESII: Readonly<Record<number, string>> = {
  6: 'JPEG (vechi)', 7: 'JPEG', 34712: 'JPEG 2000', 34925: 'LZMA', 50000: 'ZSTD', 50001: 'WebP', 32809: 'ThunderScan',
  32895: 'IT8', 34661: 'JBIG', 34676: 'SGILog', 34677: 'SGILog24', 34892: 'JPEG fără pierderi',
};
const CITITE = new Set([1, 2, 3, 4, 5, 8, 32946, 32773]);
/** Etichetele citite (celelalte se sar: un profil ICC stricat nu strică imaginea). */
const ETICHETE = new Set([254, 255, 256, 257, 258, 259, 262, 266, 273, 274, 277, 278, 279, 282, 283, 284, 292, 293, 296, 317, 320,
  322, 323, 324, 325, 332, 338, 339]);
const MARIME: Readonly<Record<number, number>> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 7: 1, 8: 2, 9: 4, 10: 8, 11: 4, 12: 8, 13: 4 };

type Ifd = ReadonlyMap<number, readonly number[]>;

function citesteIfd(v: DataView, le: boolean, o: number): { readonly e: Ifd; readonly urm: number } {
  if (o < 8 || o + 2 > v.byteLength) throw new Stricat(`IFD-ul (${o}) e în afara fișierului`);
  const n = v.getUint16(o, le);
  if (o + 2 + 12 * n + 4 > v.byteLength) throw new Stricat(`IFD-ul (${o}) e tăiat`);
  const e = new Map<number, number[]>();
  for (let k = 0; k < n; k++) {
    const p = o + 2 + 12 * k, tag = v.getUint16(p, le), tip = v.getUint16(p + 2, le), cnt = v.getUint32(p + 4, le), m = MARIME[tip];
    if (!ETICHETE.has(tag) || m === undefined) continue;
    const off = m * cnt <= 4 ? p + 8 : v.getUint32(p + 8, le);
    if (off + m * cnt > v.byteLength) throw new Stricat(`eticheta ${tag} iese din fișier`);
    const val: number[] = new Array<number>(cnt);
    for (let i = 0; i < cnt; i++) {
      const q = off + i * m;
      switch (tip) {
        case 3: val[i] = v.getUint16(q, le); break;
        case 8: val[i] = v.getInt16(q, le); break;
        case 4: case 13: val[i] = v.getUint32(q, le); break;
        case 9: val[i] = v.getInt32(q, le); break;
        case 5: { const d = v.getUint32(q + 4, le); val[i] = d ? v.getUint32(q, le) / d : 0; break; }
        case 10: { const d = v.getInt32(q + 4, le); val[i] = d ? v.getInt32(q, le) / d : 0; break; }
        case 11: val[i] = v.getFloat32(q, le); break;
        case 12: val[i] = v.getFloat64(q, le); break;
        case 6: val[i] = v.getInt8(q); break;
        default: val[i] = v.getUint8(q);
      }
    }
    e.set(tag, val);
  }
  return { e, urm: v.getUint32(o + 2 + 12 * n, le) };
}

/** IFD-urile paginilor (fără miniaturi), în ordine; un lanț stricat după prima pagină se oprește acolo. */
function paginile(v: DataView, le: boolean, prima: number): number[] {
  const p: number[] = [], vazute = new Set<number>();
  let o = prima;
  while (o !== 0 && !vazute.has(o) && vazute.size < 10_000) {
    vazute.add(o);
    let ifd: ReturnType<typeof citesteIfd>;
    try { ifd = citesteIfd(v, le, o); } catch (err) { if (p.length === 0) throw err; break; }
    const nst = ifd.e.get(254)?.[0] ?? 0, st = ifd.e.get(255)?.[0] ?? 1;
    if ((nst & 1) === 0 && st !== 2) p.push(o);
    o = ifd.urm;
  }
  if (p.length === 0) p.push(prima);
  return p;
}

const INVERS = Uint8Array.from({ length: 256 }, (_, b) => { let r = 0; for (let j = 0; j < 8; j++) if (b & (1 << j)) r |= 0x80 >> j; return r; });

function packBits(d: Uint8Array, n: number): Uint8Array {
  const o = new Uint8Array(n);
  let i = 0, k = 0;
  while (i < d.length && k < n) {
    const c = ((d[i++] ?? 0) << 24) >> 24;
    if (c >= 0) for (let j = 0; j <= c && i < d.length; j++, i++) { if (k < n) o[k] = d[i] ?? 0; k++; }
    else if (c !== -128) { const b = d[i++] ?? 0; for (let j = 0; j < 1 - c; j++) { if (k < n) o[k] = b; k++; } }
  }
  return o;
}

/** LZW-ul din TIFF 6.0: coduri de 9–12 biți, de la bitul cel mai semnificativ, cu „schimbarea timpurie” a lățimii. */
function lzw(d: Uint8Array, n: number): Uint8Array {
  if (d.length >= 2 && d[0] === 0 && ((d[1] ?? 0) & 1) === 1) throw new Nesprijinit('LZW vechi (dinainte de TIFF 6.0)');
  const o = new Uint8Array(n), prefix = new Int32Array(4096), sufix = new Uint8Array(4096), lung = new Int32Array(4096), prim = new Uint8Array(4096);
  for (let i = 0; i < 256; i++) { prefix[i] = -1; sufix[i] = i; lung[i] = 1; prim[i] = i; }
  const nb = 8 * d.length;
  let k = 0, pos = 0, latime = 9, urm = 258, prec = -1;
  const scrie = (cod: number): void => {
    const m = lung[cod] ?? 0;
    for (let c = cod, p = k + m - 1; c >= 0 && p >= k; c = prefix[c] ?? -1, p--) if (p < n) o[p] = sufix[c] ?? 0;
    k += m;
  };
  while (k < n) {
    if (pos + latime > nb) break;
    const i = pos >> 3, w = (((d[i] ?? 0) << 16) | ((d[i + 1] ?? 0) << 8) | (d[i + 2] ?? 0)) >>> 0;
    const cod = (w >>> (24 - (pos & 7) - latime)) & ((1 << latime) - 1);
    pos += latime;
    if (cod === 257) break;
    if (cod === 256) { latime = 9; urm = 258; prec = -1; continue; }
    if (prec < 0) {
      if (cod > 255) throw new Stricat(`cod LZW ${cod} după Clear`);
      scrie(cod);
    } else if (cod <= urm && cod < 4096) {
      if (urm < 4096) {
        prefix[urm] = prec; lung[urm] = (lung[prec] ?? 0) + 1; prim[urm] = prim[prec] ?? 0;
        // Ultimul octet: primul al codului citit; la KwKwK (codul e chiar cel adăugat acum), al lui `prec`, pus mai sus.
        sufix[urm] = prim[cod] ?? 0;
        urm++;
      }
      scrie(cod);
    } else throw new Stricat(`cod LZW ${cod} peste tabelă (${urm})`);
    prec = cod;
    if (urm >= (1 << latime) - 1 && latime < 12) latime++;
  }
  return o;
}

async function inflate(d: Uint8Array): Promise<Uint8Array> {
  const s = new Blob([new Uint8Array(d)]).stream().pipeThrough(new DecompressionStream('deflate'));
  return new Uint8Array(await new Response(s).arrayBuffer());
}

/** Exact `n` octeți: tăiați, sau completați cu zero. */
function laMarime(d: Uint8Array, n: number): Uint8Array {
  if (d.length === n) return d;
  const o = new Uint8Array(n);
  o.set(d.subarray(0, n));
  return o;
}

/** Reducerea din mers: rândurile, adunate pe blocuri de k × k (media, rotunjită); cu k = 1, scrise direct. */
class Reducere {
  readonly w: number; readonly h: number; readonly date: Uint8ClampedArray;
  private readonly sume: Float64Array;
  private readonly W: number;
  private readonly k: number;
  constructor(W: number, H: number, k: number) {
    this.W = W; this.k = k;
    this.w = Math.max(1, Math.floor(W / k)); this.h = Math.max(1, Math.floor(H / k));
    this.date = new Uint8ClampedArray(4 * this.w * this.h);
    this.sume = new Float64Array(4 * this.w);
  }
  rand(y: number, rgba: Uint8ClampedArray): void {
    const k = this.k;
    if (k === 1) { this.date.set(rgba, 4 * this.W * y); return; }
    const oy = Math.floor(y / k);
    if (oy >= this.h) return;
    const s = this.sume, w = this.w;
    for (let x = 0; x < w * k; x++) {
      const j = 4 * Math.floor(x / k), i = 4 * x;
      s[j] = (s[j] ?? 0) + (rgba[i] ?? 0); s[j + 1] = (s[j + 1] ?? 0) + (rgba[i + 1] ?? 0);
      s[j + 2] = (s[j + 2] ?? 0) + (rgba[i + 2] ?? 0); s[j + 3] = (s[j + 3] ?? 0) + (rgba[i + 3] ?? 0);
    }
    if ((y + 1) % k !== 0) return;
    const kk = k * k, o = 4 * w * oy;
    for (let j = 0; j < 4 * w; j++) { this.date[o + j] = Math.round((s[j] ?? 0) / kk); s[j] = 0; }
  }
}

/**
 * Imaginea întoarsă după eticheta Orientation (2–8; și așezarea imaginii unei pagini PDF, ADR 0270); 1 (sau altceva):
 * aceeași.
 */
export function orienteaza(img: ImagineRGBA, o: number): ImagineRGBA {
  if (!(o >= 2 && o <= 8)) return img;
  const { latime: W, inaltime: H, date: d } = img, t = o >= 5, w2 = t ? H : W, h2 = t ? W : H;
  const r = new Uint8ClampedArray(4 * W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let X = x, Y = y;
      switch (o) {
        case 2: X = W - 1 - x; break;
        case 3: X = W - 1 - x; Y = H - 1 - y; break;
        case 4: Y = H - 1 - y; break;
        case 5: X = y; Y = x; break;
        case 6: X = H - 1 - y; Y = x; break;
        case 7: X = H - 1 - y; Y = W - 1 - x; break;
        default: X = y; Y = W - 1 - x;
      }
      const s = 4 * (y * W + x), q = 4 * (Y * w2 + X);
      r[q] = d[s] ?? 0; r[q + 1] = d[s + 1] ?? 0; r[q + 2] = d[s + 2] ?? 0; r[q + 3] = d[s + 3] ?? 0;
    }
  }
  return { latime: w2, inaltime: h2, date: r };
}

async function pagina(f: Uint8Array, e: Ifd, le: boolean, maxPixeli: number): Promise<{ img: ImagineRGBA; latime: number; inaltime: number; dpi: number | null }> {
  const g = (t: number, implicit: number, i = 0): number => e.get(t)?.[i] ?? implicit;
  const W = g(256, 0), H = g(257, 0);
  if (!(W > 0 && H > 0 && Number.isInteger(W) && Number.isInteger(H))) throw new Stricat(`mărimea ${W} × ${H}`);
  if (W * H > MAX_FISIER) throw new Nesprijinit(`${W} × ${H} pixeli (peste 1 Gpx)`);
  const compresie = g(259, 1), spp = Math.max(1, g(277, 1)), planar = spp > 1 ? g(284, 1) : 1;
  if (!CITITE.has(compresie)) throw new Nesprijinit(`Compression=${compresie}${COMPRESII[compresie] ? ` (${COMPRESII[compresie]})` : ''}`);
  const ccitt = compresie >= 2 && compresie <= 4;
  const foto = g(262, ccitt ? 0 : spp >= 3 ? 2 : 1);
  const bitiE = e.get(258) ?? [1];
  const biti = bitiE[0] ?? 1;
  if (!bitiE.every((b) => b === biti) || ![1, 2, 4, 8, 16].includes(biti)) throw new Nesprijinit(`BitsPerSample=${bitiE.join(',')}`);
  const format = e.get(339) ?? [1];
  if (format.some((x) => x === 3)) throw new Nesprijinit('SampleFormat=3 (virgulă mobilă)');
  if (format.some((x) => x === 2)) throw new Nesprijinit('SampleFormat=2 (eșantioane cu semn)');
  if (foto === 6) throw new Nesprijinit('Photometric=6 (YCbCr)');
  if (foto === 8 || foto === 9 || foto === 10) throw new Nesprijinit(`Photometric=${foto} (CIELab)`);
  if (![0, 1, 2, 3, 5].includes(foto)) throw new Nesprijinit(`Photometric=${foto}`);
  const nCul = foto === 2 ? 3 : foto === 5 ? 4 : 1;
  if (spp < nCul) throw new Stricat(`SamplesPerPixel=${spp} pentru Photometric=${foto}`);
  if (foto === 5 && g(332, 1) !== 1) throw new Nesprijinit(`InkSet=${g(332, 1)}`);
  if (ccitt && (biti !== 1 || spp !== 1)) throw new Stricat(`CCITT cu ${spp} eșantioane de ${biti} biți`);
  const predictor = g(317, 1);
  if (predictor === 3) throw new Nesprijinit('Predictor=3 (virgulă mobilă)');
  if (predictor === 2 && biti !== 8 && biti !== 16) throw new Nesprijinit(`Predictor=2 cu ${biti} biți`);
  const fill = g(266, 1), t4 = g(292, 0), orient = g(274, 1);
  // Alfa: primul eșantion în plus, asociat (1) sau nu (2); altfel, imaginea e opacă.
  const extra = e.get(338)?.[0] ?? 0, alfa = spp > nCul && (extra === 1 || extra === 2) ? nCul : -1;
  const max = (1 << biti) - 1;
  const la8 = biti === 16 ? null : Uint8Array.from({ length: max + 1 }, (_, v) => Math.round((v * 255) / max));
  const opt = (v: number): number => (la8 ? la8[v] ?? 0 : Math.round(v / 257));
  let harta: Uint8Array | null = null;
  if (foto === 3) {
    const cm = e.get(320), n = max + 1;
    if (!cm || cm.length < 3 * n) throw new Stricat('paleta (ColorMap) lipsește sau e scurtă');
    harta = Uint8Array.from({ length: 3 * n }, (_, k) => Math.round((cm[k] ?? 0) / 257));
  }

  // Bucățile: benzile, sau plăcile.
  const placi = e.has(322);
  const tw = placi ? g(322, 0) : W, th = placi ? g(323, 0) : Math.min(H, Math.max(1, g(278, H)));
  if (!(tw > 0 && th > 0)) throw new Stricat(`placa ${tw} × ${th}`);
  const offs = e.get(placi ? 324 : 273), cnts = e.get(placi ? 325 : 279);
  if (!offs) throw new Stricat(placi ? 'fără TileOffsets' : 'fără StripOffsets');
  const spc = planar === 2 ? 1 : spp, pr = Math.ceil((tw * spc * biti) / 8);
  const peRand = placi ? Math.ceil(W / tw) : 1, peImagine = peRand * Math.ceil(H / th), planuri = planar === 2 ? spp : 1;
  if (offs.length < peImagine * planuri) throw new Stricat(`${offs.length} bucăți în loc de ${peImagine * planuri}`);
  const desface = async (k: number, randuri: number): Promise<Uint8Array> => {
    const n = randuri * pr, o = offs[k] ?? 0;
    const c = cnts?.[k] ?? (compresie === 1 ? n : -1);
    if (c < 0) throw new Stricat(`fără StripByteCounts la compresia ${compresie}`);
    if (o + c > f.length) throw new Stricat(`bucata ${k} iese din fișier`);
    let d = f.subarray(o, o + c);
    if (fill === 2) d = d.map((b) => INVERS[b] ?? 0);
    switch (compresie) {
      case 1: return laMarime(d, n);
      case 32773: return packBits(d, n);
      case 5: return lzw(d, n);
      case 8: case 32946: return laMarime(await inflate(d), n);
      case 2: return decodeazaCcitt(d, { latime: tw, randuri, fel: 'mh' });
      case 3: return decodeazaCcitt(d, { latime: tw, randuri, fel: 't4', doiD: (t4 & 1) === 1 });
      default: return decodeazaCcitt(d, { latime: tw, randuri, fel: 't6' });
    }
  };

  // Un rând al unei bucăți → eșantioanele lui (ordinea pixel, eșantion), cu predictorul desfăcut.
  const tr = new Int32Array(tw * spc);
  const randBucata = (b: Uint8Array, o: number): Int32Array => {
    const n = tw * spc;
    if (biti === 8) for (let i = 0; i < n; i++) tr[i] = b[o + i] ?? 0;
    else if (biti === 16) for (let i = 0; i < n; i++) { const a = b[o + 2 * i] ?? 0, z = b[o + 2 * i + 1] ?? 0; tr[i] = le ? a | (z << 8) : (a << 8) | z; }
    else for (let i = 0; i < n; i++) { const q = i * biti; tr[i] = ((b[o + (q >> 3)] ?? 0) >> (8 - biti - (q & 7))) & max; }
    if (predictor === 2) for (let i = spc; i < n; i++) tr[i] = ((tr[i] ?? 0) + (tr[i - spc] ?? 0)) & max;
    return tr;
  };

  const k = W * H > maxPixeli ? Math.ceil(Math.sqrt((W * H) / maxPixeli)) : 1;
  const red = new Reducere(W, H, k);
  const es = new Int32Array(W * spp), rgba = new Uint8ClampedArray(4 * W);
  const coloreaza = (): void => {
    for (let x = 0; x < W; x++) {
      const s = x * spp, q = 4 * x;
      let r: number, gg: number, b: number;
      if (foto === 2) { r = opt(es[s] ?? 0); gg = opt(es[s + 1] ?? 0); b = opt(es[s + 2] ?? 0); }
      else if (foto === 3 && harta) { const i = es[s] ?? 0, n = max + 1; r = harta[i] ?? 0; gg = harta[n + i] ?? 0; b = harta[2 * n + i] ?? 0; }
      else if (foto === 5) {
        const c = opt(es[s] ?? 0), m = opt(es[s + 1] ?? 0), yy = opt(es[s + 2] ?? 0), kk = 255 - opt(es[s + 3] ?? 0);
        r = Math.round(((255 - c) * kk) / 255); gg = Math.round(((255 - m) * kk) / 255); b = Math.round(((255 - yy) * kk) / 255);
      } else { const v = opt(es[s] ?? 0); r = gg = b = foto === 0 ? 255 - v : v; }
      let a = 255;
      if (alfa >= 0) {
        a = opt(es[s + alfa] ?? 0);
        if (extra === 1) {
          const f8 = (c: number): number => (a > 0 ? Math.min(255, Math.round((c * 255) / a)) : 0);
          r = f8(r); gg = f8(gg); b = f8(b);
        }
      }
      rgba[q] = r; rgba[q + 1] = gg; rgba[q + 2] = b; rgba[q + 3] = a;
    }
  };

  for (let ty = 0; ty * th < H; ty++) {
    const randuri = Math.min(th, H - ty * th);
    // Bucățile rândului (toate plăcile lui, pe fiecare plan), desfăcute.
    const buc: Uint8Array[][] = [];
    for (let p = 0; p < planuri; p++) {
      const linie: Uint8Array[] = [];
      for (let tx = 0; tx < peRand; tx++) linie.push(await desface(p * peImagine + ty * peRand + tx, placi ? th : randuri));
      buc.push(linie);
    }
    for (let r = 0; r < randuri; r++) {
      for (let p = 0; p < planuri; p++) {
        for (let tx = 0; tx < peRand; tx++) {
          const t = randBucata(buc[p]?.[tx] ?? new Uint8Array(0), r * pr), x0 = tx * tw, n = Math.min(tw, W - x0);
          if (planuri === 1) es.set(t.subarray(0, n * spp), x0 * spp);
          else for (let x = 0; x < n; x++) es[(x0 + x) * spp + p] = t[x] ?? 0;
        }
      }
      coloreaza();
      red.rand(ty * th + r, rgba);
    }
  }
  const img = orienteaza({ latime: red.w, inaltime: red.h, date: red.date }, orient);
  const t = orient >= 5 && orient <= 8;
  const unitate = g(296, 2), rez = t ? g(283, g(282, 0)) : g(282, 0);
  const dpi = unitate === 1 || !(rez > 0) ? null : unitate === 3 ? rez * 2.54 : rez;
  return { img, latime: t ? H : W, inaltime: t ? W : H, dpi };
}

/** Decodează pagina `pagina` (de la 1; peste ultima, ultima) a unui TIFF, redusă sub `maxPixeli`. */
export async function decodeazaTiff(octeti: Uint8Array, o: { readonly pagina?: number; readonly maxPixeli?: number } = {}): Promise<RezultatTiff> {
  let pagini = 0;
  try {
    if (octeti.length < 8) throw new Stricat('mai scurt decât antetul');
    const le = octeti[0] === 0x49 && octeti[1] === 0x49;
    if (!le && !(octeti[0] === 0x4d && octeti[1] === 0x4d)) throw new Stricat('fără antetul II / MM');
    const v = new DataView(octeti.buffer, octeti.byteOffset, octeti.byteLength), semn = v.getUint16(2, le);
    if (semn === 43) throw new Nesprijinit('BigTIFF');
    if (semn !== 42) throw new Stricat(`semnătura ${semn}`);
    const lista = paginile(v, le, v.getUint32(4, le));
    pagini = lista.length;
    const p = Math.min(pagini, Math.max(1, Math.round(o.pagina ?? 1)));
    const r = await pagina(octeti, citesteIfd(v, le, lista[p - 1] ?? 0).e, le, o.maxPixeli ?? MAX_IMPLICIT);
    return { ok: true, ...r, pagini, pagina: p };
  } catch (err) {
    const detaliu = err instanceof Error ? err.message : String(err);
    if (err instanceof Nesprijinit) return { ok: false, cod: 'nesprijinit', detaliu, ...(pagini ? { pagini } : {}) };
    if (err instanceof Stricat || err instanceof EroareCcitt || err instanceof RangeError || err instanceof TypeError) {
      return { ok: false, cod: 'stricat', detaliu, ...(pagini ? { pagini } : {}) };
    }
    throw err;
  }
}
