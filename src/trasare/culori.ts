/**
 * Trasarea pe culori (ADR 0221): reducerea culorilor (în OKLab cu luminozitatea pe jumătate, pe pixelii plini care nu sunt
 * amestecuri de margine; întâi multe clase, apoi unite după distanță); etichetele, cu legăturile și curățarea;
 * granițele comune pe o plasă duală a etichetelor (un vârf în fiecare celulă de 2 × 2 pixeli cu mai multe culori, trecerea
 * dintre doi pixeli la amestecul lor de 50 %); fiecare graniță dintre două joncțiuni netezită o singură dată (curbele din
 * `trasare.ts`), iar fiecare culoare își adună granițele: două culori vecine au aceeași linie, în sensuri opuse.
 *
 * Pură, fără importuri din aplicație (regula `trasare-izolat`): rulează în workerul trasării; coordonatele sunt în pixeli
 * (x spre dreapta, y în jos, pixelul (0, 0) acoperă pătratul [0, 1]²).
 */
import {
  curbeleArcului, curbeleBuclei, EPS_DUR, netezeste, PLAFON_TRASARE, TREPTE,
  type Bucata, type CaiTrasate, type ImagineRGBA, type Netezime,
} from './trasare.ts';
import { primele } from './legaturi.ts';

export type OptiuniCulori = {
  /** Câte culori (1–16); null: automat. */
  readonly numar: number | null;
  /** Pentru fiecare culoare a reducerii, culoarea de care e legată (indicele ei), sau -1. */
  readonly legaturi: readonly number[];
  /** Ce culori se trasează (după indicele reducerii); null: toate, afară de fundal. */
  readonly bifate: readonly boolean[] | null;
  readonly netezime: Netezime;
  /** Petele de culoare sub atâția px² trec la vecina cu care împart cea mai lungă margine; golurile de fundal, la fel. */
  readonly petePx: number;
  readonly gauriPx: number;
};

export type CuloarePaleta = {
  readonly hex: string;
  /** Partea din desen (pixelii vizibili, afară de fundal); la fundal, partea din imagine. */
  readonly pondere: number;
  readonly fundal: boolean;
  /** Culoarea de care e legată (după legături), sau ea însăși. */
  readonly prima: number;
  readonly bifata: boolean;
};

export type PiesaCuloare = { readonly culoare: number; readonly hex: string; readonly cai: CaiTrasate };

export type RaportCulori = {
  readonly latime: number; readonly inaltime: number; readonly transparenta: boolean;
  readonly automat: boolean; readonly paleta: readonly CuloarePaleta[];
  readonly margini: 'netezite' | 'dure';
  readonly pete: number; readonly gauri: number;
  /** Granițele (arcele dintre joncțiuni și buclele fără joncțiuni), contururile și bucățile pieselor. */
  readonly granite: number; readonly contururi: number; readonly varfuri: number;
  /** Cea mai mare distanță dintre granițele pe pixeli și curbele lor, în px. */
  readonly abatere: number;
};

export type RezultatCulori =
  | {
    readonly ok: true; readonly piese: readonly PiesaCuloare[]; readonly raport: RaportCulori;
    /** Culoarea fiecărui pixel, rând cu rând (după legături și curățare; 255: transparent): previzualizarea pictată. */
    readonly etichete: Uint8Array;
  }
  | { readonly ok: false; readonly cod: 'prea-multe'; readonly raport: RaportCulori };

/** Cel mult atâtea culori (ADR 0221 §2). */
export const CULORI_MAXIM = 16;
/**
 * Numărul automat: cel mai mare la care centrele stau la cel puțin `distanta` (OKLab) și fiecare are cel puțin `pondere` din
 * pixelii plini (un detaliu mic, dar curat, ca punctul unui ®, e o culoare; amestecurile nu intră printre pixelii plini).
 */
export const PRAG_AUTOMAT = { distanta: 0.08, pondere: 0.002 } as const;
/** Un pixel e „curat” la cel mult atât (OKLab) de centrul lui; altfel e un amestec, care ia o culoare a vecinilor curați. */
const CURAT = 0.03;
/** Plasa: peste atâtea vârfuri, imaginea e prea zgomotoasă (refuzul „prea multe”, înaintea curbelor). */
const VARFURI_PLASA = 6_000_000;
/**
 * Amestecurile (pasul 2): vecinii opuși diferă cu peste `contrast` (suma pe canale, sRGB), iar pixelul cade pe segmentul
 * dintre ei, la peste `capat` de fiecare capăt și la cel mult `abatere` (din lungimea segmentului) de el.
 */
const AMESTEC = { contrast: 30, capat: 0.12, abatere: 0.25 } as const;
const DIRECTII = [[1, 0], [0, 1], [1, 1], [1, -1]] as const;
/**
 * Joncțiunile (pasul 9b): dreapta fiecărei granițe se potrivește pe primele ei treceri de lângă vârful plasei (la peste `min`
 * și cel mult `max` px de el, cel mult `puncte`), oprite la primul colț (o cotitură peste `cotitura` radiani: altfel dreapta
 * ar tăia colțul unei granițe în L); o dreaptă de care trecerile se depărtează cu peste `rest` px nu votează. Vârful se mută
 * cel mult `mutare` px; `miu` îl ține pe loc pe direcțiile în care dreptele nu decid (granițe aproape paralele).
 */
const JONCTIUNE = { min: 0.25, max: 3, puncte: 4, cotitura: 0.6, rest: 0.3, mutare: 1, miu: 0.05 } as const;

// ── Culorile: sRGB ↔ OKLab (Ottosson, 2020) ─────────────────────────────────────────────────────────────────────────

const LIN = new Float64Array(256);
for (let i = 0; i < 256; i++) { const v = i / 255; LIN[i] = v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }

/**
 * Spațiul de lucru e OKLab cu luminozitatea înmulțită cu `KL`: ea cântărește pe jumătate în distanțe (ca la CIE94 cu kL = 2).
 * Umbrirea unei suprafețe (mai ales luminozitate) rămâne o culoare, iar nuanțele se despart: în OKLab simplu, gri-deschisul
 * unei umbriri e la fel de aproape de un albastru cu aceeași luminozitate ca de griul închis din care face parte.
 */
const KL = 0.5;

function oklab(r: number, g: number, b: number, o: Float64Array, k: number): void {
  const R = LIN[r] ?? 0, G = LIN[g] ?? 0, B = LIN[b] ?? 0;
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  o[k] = KL * (0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s);
  o[k + 1] = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  o[k + 2] = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
}

/** Din spațiul de lucru (OKLab cu L·`KL`) în sRGB (0–255, fără rotunjire, tăiat la domeniu). */
function srgb(Lk: number, a: number, b: number): [number, number, number] {
  const L = Lk / KL;
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const R = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, G = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const B = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  const g = (v: number): number => 255 * Math.min(1, Math.max(0, v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055));
  return [g(R), g(G), g(B)];
}

const hex = (c: readonly number[]): string => `#${c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

// ── Reducerea: k-means++ ponderat, pe culorile distincte ale pixelilor plini ───────────────────────────────────────────

type Reducere = { readonly c: Float64Array; readonly masa: Float64Array; readonly K: number; readonly inertie: number };

/** k-means în OKLab pe culorile distincte (cu ponderile lor), pornit cu k-means++ (determinist, din `samanta`); clasele goale ies. */
function kmeans(lab: Float64Array, w: Float64Array, K: number, samanta = 7): Reducere {
  const u = w.length;
  let seed = samanta;
  const rnd = (): number => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const c = new Float64Array(3 * K);
  // Primul centru: culoarea cea mai grea; apoi fiecare, după distanța la pătrat, ponderată.
  let i0 = 0;
  for (let i = 1; i < u; i++) if ((w[i] ?? 0) > (w[i0] ?? 0)) i0 = i;
  c.set(lab.subarray(3 * i0, 3 * i0 + 3), 0);
  const d = new Float64Array(u).fill(Infinity);
  for (let k = 1; k < K; k++) {
    let s = 0;
    for (let i = 0; i < u; i++) {
      const e = ((lab[3 * i] ?? 0) - (c[3 * k - 3] ?? 0)) ** 2 + ((lab[3 * i + 1] ?? 0) - (c[3 * k - 2] ?? 0)) ** 2 + ((lab[3 * i + 2] ?? 0) - (c[3 * k - 1] ?? 0)) ** 2;
      if (e < (d[i] ?? 0)) d[i] = e;
      s += (d[i] ?? 0) * (w[i] ?? 0);
    }
    let t = rnd() * s;
    i0 = u - 1;
    for (let i = 0; i < u; i++) { t -= (d[i] ?? 0) * (w[i] ?? 0); if (t <= 0 && (d[i] ?? 0) > 0) { i0 = i; break; } }
    c.set(lab.subarray(3 * i0, 3 * i0 + 3), 3 * k);
  }
  return lloyd(lab, w, c, K, 40);
}

/** Pașii Lloyd din centrele date (cel mult `iteratii`), pe culorile distincte cu ponderile lor; clasele goale ies. */
function lloyd(lab: Float64Array, w: Float64Array, c: Float64Array, K: number, iteratii: number): Reducere {
  const u = w.length;
  const et = new Int16Array(u).fill(-1);
  const masa = new Float64Array(K);
  for (let it = 0; it < iteratii; it++) {
    const s = new Float64Array(3 * K);
    masa.fill(0);
    let schimbat = false;
    for (let i = 0; i < u; i++) {
      let best = 0, bd = Infinity;
      for (let k = 0; k < K; k++) {
        const e = ((lab[3 * i] ?? 0) - (c[3 * k] ?? 0)) ** 2 + ((lab[3 * i + 1] ?? 0) - (c[3 * k + 1] ?? 0)) ** 2 + ((lab[3 * i + 2] ?? 0) - (c[3 * k + 2] ?? 0)) ** 2;
        if (e < bd) { bd = e; best = k; }
      }
      if (et[i] !== best) { et[i] = best; schimbat = true; }
      const wi = w[i] ?? 0;
      s[3 * best] = (s[3 * best] ?? 0) + wi * (lab[3 * i] ?? 0);
      s[3 * best + 1] = (s[3 * best + 1] ?? 0) + wi * (lab[3 * i + 1] ?? 0);
      s[3 * best + 2] = (s[3 * best + 2] ?? 0) + wi * (lab[3 * i + 2] ?? 0);
      masa[best] = (masa[best] ?? 0) + wi;
    }
    for (let k = 0; k < K; k++) if ((masa[k] ?? 0) > 0) for (let j = 0; j < 3; j++) c[3 * k + j] = (s[3 * k + j] ?? 0) / (masa[k] ?? 1);
    if (!schimbat) break;
  }
  let inertie = 0;
  for (let i = 0; i < u; i++) {
    const k = et[i] ?? 0;
    inertie += (w[i] ?? 0) * (((lab[3 * i] ?? 0) - (c[3 * k] ?? 0)) ** 2 + ((lab[3 * i + 1] ?? 0) - (c[3 * k + 1] ?? 0)) ** 2 + ((lab[3 * i + 2] ?? 0) - (c[3 * k + 2] ?? 0)) ** 2);
  }
  // Clasele goale (o culoare aleasă de două ori) ies; ordinea rămâne.
  const pastrate: number[] = [];
  for (let k = 0; k < K; k++) if ((masa[k] ?? 0) > 0) pastrate.push(k);
  if (pastrate.length === K) return { c, masa, K, inertie };
  const c2 = new Float64Array(3 * pastrate.length), m2 = new Float64Array(pastrate.length);
  pastrate.forEach((k, j) => { c2.set(c.subarray(3 * k, 3 * k + 3), 3 * j); m2[j] = masa[k] ?? 0; });
  return { c: c2, masa: m2, K: pastrate.length, inertie };
}

/** Cea mai bună din câteva porniri (inerția cea mai mică): o pornire nefericită pune două centre într-o singură culoare. */
function kmeansMulte(lab: Float64Array, w: Float64Array, K: number): Reducere {
  let cel: Reducere | null = null;
  for (const s of [7, 1009, 52_711]) {
    const r = kmeans(lab, w, K, s);
    if (!cel || r.K > cel.K || (r.K === cel.K && r.inertie < cel.inertie)) cel = r;
  }
  return cel as Reducere;
}

/**
 * Reducerea: întâi mai multe clase decât se cer (k-means, de două ori maximul), apoi unirea lor: clasele sub `pondere` cu cea
 * mai apropiată (cea mai mică întâi), apoi perechea cu centrele cele mai apropiate, până la numărul dat sau, automat, cât timp
 * perechea e sub `distanta` (și sunt peste maxim); la capăt, câțiva pași Lloyd din centrele unite. Unirea după distanță ține
 * culorile deosebite, chiar mici (liniile portocalii ale unui logo), iar umbrirea unei suprafețe se strânge într-o culoare;
 * k-means singur, la un număr mic, împarte umbrirea și pierde culoarea mică.
 */
export function reduce(lab: Float64Array, w: Float64Array, numar: number | null): Reducere & { readonly automat: boolean } {
  const u = w.length;
  const total = w.reduce((s, x) => s + x, 0) || 1;
  const r0 = kmeansMulte(lab, w, Math.max(1, Math.min(u, 2 * CULORI_MAXIM)));
  const C: Array<[number, number, number]> = [], M: number[] = [];
  for (let k = 0; k < r0.K; k++) { C.push([r0.c[3 * k] ?? 0, r0.c[3 * k + 1] ?? 0, r0.c[3 * k + 2] ?? 0]); M.push(r0.masa[k] ?? 0); }
  const tinta = numar === null ? 1 : Math.max(1, Math.min(CULORI_MAXIM, u, Math.round(numar)));
  const d2 = (a: number, b: number): number => {
    const p = C[a] ?? [0, 0, 0], q = C[b] ?? [0, 0, 0];
    return (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2;
  };
  /** Unește clasele a și b (centrul ponderat), în locul celei cu indicele mai mic. */
  const uneste = (a: number, b: number): void => {
    const [i, j] = a < b ? [a, b] : [b, a];
    const p = C[i] ?? [0, 0, 0], q = C[j] ?? [0, 0, 0], mi = M[i] ?? 0, mj = M[j] ?? 0, m = mi + mj || 1;
    C[i] = [(p[0] * mi + q[0] * mj) / m, (p[1] * mi + q[1] * mj) / m, (p[2] * mi + q[2] * mj) / m];
    M[i] = mi + mj;
    C.splice(j, 1); M.splice(j, 1);
  };
  while (C.length > tinta) {
    let s = 0;
    for (let k = 1; k < M.length; k++) if ((M[k] ?? 0) < (M[s] ?? 0)) s = k;
    if ((M[s] ?? 0) / total >= PRAG_AUTOMAT.pondere) break;
    let b = s === 0 ? 1 : 0;
    for (let k = 0; k < C.length; k++) if (k !== s && d2(s, k) < d2(s, b)) b = k;
    uneste(s, b);
  }
  while (C.length > tinta) {
    let a = 0, b = 1;
    for (let i = 0; i < C.length; i++) for (let j = i + 1; j < C.length; j++) if (d2(i, j) < d2(a, b)) { a = i; b = j; }
    if (numar === null && C.length <= CULORI_MAXIM && d2(a, b) >= PRAG_AUTOMAT.distanta ** 2) break;
    uneste(a, b);
  }
  const c = new Float64Array(3 * C.length);
  C.forEach((p, k) => c.set(p, 3 * k));
  return { ...lloyd(lab, w, c, C.length, 10), automat: numar === null };
}

// ── Trasarea pe culori ──────────────────────────────────────────────────────────────────────────────────────────────

/** Netezirea unui arc deschis cu margini dure (media 1, 2, 3, 2, 1, cu vecinii care există); capetele rămân. */
function netezesteArc(P: Float64Array): Float64Array {
  const n = P.length / 2, r = new Float64Array(P);
  const g = [1, 2, 3, 2, 1];
  for (let k = 1; k < n - 1; k++) {
    for (let c = 0; c < 2; c++) {
      let s = 0, sw = 0;
      for (let j = -2; j <= 2; j++) {
        const q = k + j;
        if (q < 0 || q >= n) continue;
        s += (g[j + 2] ?? 0) * (P[2 * q + c] ?? 0); sw += g[j + 2] ?? 0;
      }
      r[2 * k + c] = s / sw;
    }
  }
  return r;
}

/** Un tablou numeric care crește (pentru plasă). */
class Crescator<T extends Float64Array | Int32Array> {
  a: T; n = 0;
  readonly fa: (n: number) => T;
  constructor(fa: (n: number) => T) { this.fa = fa; this.a = fa(1024); }
  push(v: number): number {
    if (this.n === this.a.length) { const b = this.fa(this.a.length * 2); b.set(this.a); this.a = b; }
    this.a[this.n] = v;
    return this.n++;
  }
}

type Arc = {
  /** Vârfurile plasei, în ordine (la o buclă închisă, fără primul repetat). */
  readonly pts: Float64Array; readonly inchis: boolean;
  readonly de: number; readonly la: number; readonly stanga: number; readonly dreapta: number;
  bucati: Bucata[]; sfarsit: [number, number];
};

export function traseazaCulori(img: ImagineRGBA, o: OptiuniCulori): RezultatCulori {
  const { latime: W, inaltime: H, date: d } = img;
  const n = W * H;
  const A = (p: number): number => d[4 * p + 3] ?? 0;
  // 1. Transparența și nivelul plin al alfa (ca în ADR 0220).
  const hist = new Float64Array(256);
  for (let p = 0; p < n; p++) { const a = A(p); hist[a] = (hist[a] ?? 0) + 1; }
  let sub = 0;
  for (let a = 0; a < 128; a++) sub += hist[a] ?? 0;
  const transparenta = sub >= n * 0.01;
  let plin = 255;
  for (let a = 255, s = 0, viz = n - (hist[0] ?? 0); a >= 1 && viz > 0; a--) { s += hist[a] ?? 0; if (s >= viz * 0.02) { plin = a; break; } }
  const vizibil = (p: number): boolean => !transparenta || A(p) >= 128;
  const rgb24 = (p: number): number => ((d[4 * p] ?? 0) << 16) | ((d[4 * p + 1] ?? 0) << 8) | (d[4 * p + 2] ?? 0);

  // 2. Culorile distincte ale pixelilor plini care nu sunt amestecuri, cu ponderile lor. Un amestec (marginea netezită dintre
  // două culori) stă, pe una dintre cele patru direcții, între doi vecini opuși care diferă clar. O linie subțire rămâne
  // (vecinii ei de-a curmezișul sunt la fel, sau nu sunt plini), la fel un gradient lin (vecinii opuși diferă puțin).
  const solide = new Map<number, number>();
  const plinPixel = (p: number): boolean => A(p) >= 250;
  const amestec = (x: number, y: number): boolean => {
    const p = y * W + x, pr = d[4 * p] ?? 0, pg = d[4 * p + 1] ?? 0, pb = d[4 * p + 2] ?? 0;
    for (const [dx, dy] of DIRECTII) {
      const x1 = x - dx, y1 = y - dy, x2 = x + dx, y2 = y + dy;
      if (x1 < 0 || x2 < 0 || x1 >= W || x2 >= W || y1 < 0 || y2 < 0 || y1 >= H || y2 >= H) continue;
      const q1 = y1 * W + x1, q2 = y2 * W + x2;
      if (!plinPixel(q1) || !plinPixel(q2)) continue;
      const r1 = d[4 * q1] ?? 0, g1 = d[4 * q1 + 1] ?? 0, b1 = d[4 * q1 + 2] ?? 0;
      const vr = (d[4 * q2] ?? 0) - r1, vg = (d[4 * q2 + 1] ?? 0) - g1, vb = (d[4 * q2 + 2] ?? 0) - b1;
      if (Math.abs(vr) + Math.abs(vg) + Math.abs(vb) <= AMESTEC.contrast) continue;
      const l2 = vr * vr + vg * vg + vb * vb, er = pr - r1, eg = pg - g1, eb = pb - b1;
      const t = (er * vr + eg * vg + eb * vb) / l2;
      if (t <= AMESTEC.capat || t >= 1 - AMESTEC.capat) continue;
      const rr = er - t * vr, rg = eg - t * vg, rb = eb - t * vb;
      if (rr * rr + rg * rg + rb * rb <= AMESTEC.abatere * AMESTEC.abatere * l2) return true;
    }
    return false;
  };
  const amestecat = new Uint8Array(n);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const p = y * W + x;
      if (!plinPixel(p)) continue;
      if (amestec(x, y)) { amestecat[p] = 1; continue; }
      const k = rgb24(p);
      solide.set(k, (solide.get(k) ?? 0) + 1);
    }
  }
  if (solide.size === 0) for (let p = 0; p < n; p++) if (vizibil(p)) { const k = rgb24(p); solide.set(k, (solide.get(k) ?? 0) + 1); }
  // Pe o poză, culorile distincte sunt sute de mii: se adună în cutii de 5 biți pe canal (media lor în OKLab, ponderată).
  const cutii = solide.size > 20_000;
  const grupe = new Map<number, [number, number, number, number]>();
  const unu = new Float64Array(3);
  for (const [k, c] of solide) {
    oklab((k >> 16) & 255, (k >> 8) & 255, k & 255, unu, 0);
    const g = cutii ? ((k >> 19) << 10) | (((k >> 11) & 31) << 5) | ((k >> 3) & 31) : k;
    const s = grupe.get(g) ?? [0, 0, 0, 0];
    s[0] += c * (unu[0] ?? 0); s[1] += c * (unu[1] ?? 0); s[2] += c * (unu[2] ?? 0); s[3] += c;
    grupe.set(g, s);
  }
  const u = grupe.size;
  const lab = new Float64Array(3 * Math.max(1, u)), w = new Float64Array(Math.max(1, u));
  {
    let i = 0;
    for (const s of grupe.values()) { lab[3 * i] = s[0] / s[3]; lab[3 * i + 1] = s[1] / s[3]; lab[3 * i + 2] = s[2] / s[3]; w[i] = s[3]; i++; }
    if (u === 0) w[0] = 1;
  }

  // 3. Reducerea.
  const red = reduce(lab, w, o.numar);
  const K = red.K;
  const centruRgb = Array.from({ length: K }, (_, k) => srgb(red.c[3 * k] ?? 0, red.c[3 * k + 1] ?? 0, red.c[3 * k + 2] ?? 0));
  if (K > 31) throw new Error("culori: cel mult 31 de etichete");
  const T = K;                                 // fundalul transparent
  const O = transparenta ? T : K + 1;          // în afara imaginii
  // 4. Etichetele, în două treceri. Un pixel curat (aproape de centrul lui) își ia culoarea; un amestec (o margine netezită
  // între două culori) ia una dintre culorile pixelilor curați din jur, după partea amestecului de 50 % în care cade, nu
  // centrul cel mai apropiat: amestecul închis–deschis e mai aproape de albastru decât de amândouă (ADR 0221 §5).
  const orig = new Int16Array(n);
  const curat = new Uint8Array(n);
  const memorie = new Map<number, number>();
  const tmp = new Float64Array(3);
  const ceaMaiAproape = (L: number, a: number, b: number): [number, number] => {
    let best = 0, bd = Infinity;
    for (let k = 0; k < K; k++) {
      const e = (L - (red.c[3 * k] ?? 0)) ** 2 + (a - (red.c[3 * k + 1] ?? 0)) ** 2 + (b - (red.c[3 * k + 2] ?? 0)) ** 2;
      if (e < bd) { bd = e; best = k; }
    }
    return [best, bd];
  };
  for (let p = 0; p < n; p++) {
    if (!vizibil(p)) { orig[p] = T; continue; }
    const k = rgb24(p);
    let l = memorie.get(k);
    if (l === undefined) {
      oklab((k >> 16) & 255, (k >> 8) & 255, k & 255, tmp, 0);
      const [e, dd] = ceaMaiAproape(tmp[0] ?? 0, tmp[1] ?? 0, tmp[2] ?? 0);
      l = e + (dd <= CURAT * CURAT ? 32 : 0);
      if (memorie.size < 1 << 20) memorie.set(k, l);
    }
    orig[p] = l & 31;
    // Un amestec nu e curat nici când are culoarea unui centru: pe granița închis–alb, mijlocul are chiar gri-deschisul.
    curat[p] = l >= 32 && !amestecat[p] ? 1 : 0;
  }
  const centruRgb0 = Array.from({ length: K }, (_, k) => srgb(red.c[3 * k] ?? 0, red.c[3 * k + 1] ?? 0, red.c[3 * k + 2] ?? 0));
  const eticheteNoi = new Int16Array(orig);
  // Pixelii parțial transparenți fără un vecin curat (o aură albă în jurul literelor, mai lată de 2 px) nu au culoarea lor în
  // paletă: cea mai apropiată ar fi oricare (portocaliul, ca cel mai deschis); iau culoarea regiunii de care se lipesc.
  const asteapta = new Uint8Array(n);
  let asteptand = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const p = y * W + x;
      if (curat[p] || (orig[p] ?? 0) >= K) continue;
      const candidati = new Set<number>();
      for (let r = 1; r <= 2 && candidati.size === 0; r++) {
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            const xx = x + dx, yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
            const q = yy * W + xx;
            if (curat[q] && (orig[q] ?? 0) < K) candidati.add(orig[q] ?? 0);
          }
        }
      }
      if (candidati.size === 0) { if (!plinPixel(p)) { asteapta[p] = 1; asteptand++; } continue; }
      const lista = [...candidati];
      if (lista.length === 1) { eticheteNoi[p] = lista[0] ?? 0; continue; }
      if (lista.length === 2) {
        const [a = 0, b = 0] = lista, ca = centruRgb0[a] ?? [0, 0, 0], cb = centruRgb0[b] ?? [0, 0, 0];
        const ax = cb[0] - ca[0], ay = cb[1] - ca[1], az = cb[2] - ca[2], l2 = ax * ax + ay * ay + az * az;
        const s = l2 > 0 ? (((d[4 * p] ?? 0) - ca[0]) * ax + ((d[4 * p + 1] ?? 0) - ca[1]) * ay + ((d[4 * p + 2] ?? 0) - ca[2]) * az) / l2 : 0;
        eticheteNoi[p] = s < 0.5 ? a : b;
        continue;
      }
      oklab(d[4 * p] ?? 0, d[4 * p + 1] ?? 0, d[4 * p + 2] ?? 0, tmp, 0);
      let best = lista[0] ?? 0, bd = Infinity;
      for (const k of lista) {
        const e = ((tmp[0] ?? 0) - (red.c[3 * k] ?? 0)) ** 2 + ((tmp[1] ?? 0) - (red.c[3 * k + 1] ?? 0)) ** 2 + ((tmp[2] ?? 0) - (red.c[3 * k + 2] ?? 0)) ** 2;
        if (e < bd) { bd = e; best = k; }
      }
      eticheteNoi[p] = best;
    }
  }
  if (asteptand > 0) {
    // Lățirea din regiunile etichetate (4-vecinătate), strat cu strat; o insulă fără nicio regiune își ține centrul.
    let strat: number[] = [];
    for (let p = 0; p < n; p++) {
      if (asteapta[p] || (eticheteNoi[p] ?? 0) >= K) continue;
      const x = p % W;
      if ((x > 0 && asteapta[p - 1]) || (x + 1 < W && asteapta[p + 1]) || (p >= W && asteapta[p - W]) || (p + W < n && asteapta[p + W])) strat.push(p);
    }
    while (strat.length > 0) {
      const urm: number[] = [];
      for (const p of strat) {
        const x = p % W, l = eticheteNoi[p] ?? 0;
        for (const q of [x > 0 ? p - 1 : -1, x + 1 < W ? p + 1 : -1, p - W, p + W]) {
          if (q < 0 || q >= n || !asteapta[q]) continue;
          asteapta[q] = 0; eticheteNoi[q] = l; urm.push(q);
        }
      }
      strat = urm;
    }
  }
  orig.set(eticheteNoi);
  // 5. Fundalul unei imagini opace: culoarea care domină marginea (ADR 0221, răspunsul 3a).
  let fundal = -1;
  if (!transparenta && K > 1) {
    const m = new Float64Array(K);
    const pune = (p: number): void => { const l = orig[p] ?? 0; if (l < K) m[l] = (m[l] ?? 0) + 1; };
    for (let x = 0; x < W; x++) { pune(x); pune((H - 1) * W + x); }
    for (let y = 0; y < H; y++) { pune(y * W); pune(y * W + W - 1); }
    for (let k = 0; k < K; k++) if (fundal < 0 || (m[k] ?? 0) > (m[fundal] ?? 0)) fundal = k;
  }
  // 6. Legăturile: fiecare culoare, la prima din lanțul ei (un ciclu, la indicele lui cel mai mic).
  const prima = primele(o.legaturi, K);
  const eFundal = (l: number): boolean => l >= K || (fundal >= 0 && l === (prima[fundal] ?? -1));
  const bifata = (l: number): boolean => l < K && (prima[l] ?? -1) === l && (o.bifate ? o.bifate[l] === true : !eFundal(l));
  const et = new Int16Array(n);
  for (let p = 0; p < n; p++) { const l = orig[p] ?? 0; et[p] = l < K ? (prima[l] ?? l) : l; }
  // Câștigătorul unei celule-șa (A pe o diagonală, B pe cealaltă): niciodată fundalul; între două culori, cea mai apropiată
  // de media celulei.
  const castiga = (a: number, b: number, p: number): number => {
    if (eFundal(a) !== eFundal(b)) return eFundal(a) ? b : a;
    if (eFundal(a)) return a;
    let r = 0, g = 0, bb = 0;
    for (const q of [p, p + 1, p + W, p + W + 1]) { r += d[4 * q] ?? 0; g += d[4 * q + 1] ?? 0; bb += d[4 * q + 2] ?? 0; }
    oklab(Math.round(r / 4), Math.round(g / 4), Math.round(bb / 4), tmp, 0);
    const da = ((tmp[0] ?? 0) - (red.c[3 * a] ?? 0)) ** 2 + ((tmp[1] ?? 0) - (red.c[3 * a + 1] ?? 0)) ** 2 + ((tmp[2] ?? 0) - (red.c[3 * a + 2] ?? 0)) ** 2;
    const db = ((tmp[0] ?? 0) - (red.c[3 * b] ?? 0)) ** 2 + ((tmp[1] ?? 0) - (red.c[3 * b + 1] ?? 0)) ** 2 + ((tmp[2] ?? 0) - (red.c[3 * b + 2] ?? 0)) ** 2;
    return da < db || (da === db && a < b) ? a : b;
  };

  // 7. Curățarea: componentele (4-vecinătate, plus diagonala câștigătoare a fiecărei celule-șa, ca la plasă).
  let pete = 0, gauri = 0;
  if (o.petePx > 0 || o.gauriPx > 0) {
    const par = new Int32Array(n);
    for (let p = 0; p < n; p++) par[p] = p;
    const rad = (a: number): number => { while (par[a] !== a) { const b = par[par[a] ?? a] ?? a; par[a] = b; a = b; } return a; };
    const uneste = (a: number, b: number): void => { const x = rad(a), y = rad(b); if (x !== y) par[Math.max(x, y)] = Math.min(x, y); };
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const p = y * W + x;
        if (x + 1 < W && et[p] === et[p + 1]) uneste(p, p + 1);
        if (y + 1 < H && et[p] === et[p + W]) uneste(p, p + W);
        if (x + 1 < W && y + 1 < H) {
          const a = et[p] ?? 0, b = et[p + 1] ?? 0;
          if (a !== b && a === et[p + W + 1] && b === et[p + W]) {
            if (castiga(a, b, p) === a) uneste(p, p + W + 1); else uneste(p + 1, p + W);
          }
        }
      }
    }
    const comp = new Int32Array(n), arie: number[] = [], margine: boolean[] = [], eticheta: number[] = [];
    const id = new Map<number, number>();
    for (let p = 0; p < n; p++) {
      const r = rad(p);
      let c = id.get(r);
      if (c === undefined) { c = arie.length; id.set(r, c); arie.push(0); margine.push(false); eticheta.push(et[p] ?? 0); }
      comp[p] = c;
      arie[c] = (arie[c] ?? 0) + 1;
      const x = p % W, y = (p - x) / W;
      if (x === 0 || y === 0 || x === W - 1 || y === H - 1) margine[c] = true;
    }
    const tinte: number[] = [];
    for (let c = 0; c < arie.length; c++) {
      const l = eticheta[c] ?? 0;
      if (!eFundal(l) && (arie[c] ?? 0) < o.petePx) tinte.push(c);
      else if (eFundal(l) && !margine[c] && (arie[c] ?? 0) < o.gauriPx) tinte.push(c);
    }
    if (tinte.length > 0) {
      const pixeli = new Map<number, number[]>(tinte.map((c) => [c, []]));
      for (let p = 0; p < n; p++) pixeli.get(comp[p] ?? -1)?.push(p);
      tinte.sort((a, b) => (arie[a] ?? 0) - (arie[b] ?? 0));
      for (const c of tinte) {
        const ps = pixeli.get(c) ?? [];
        const vecini = new Map<number, number>();
        for (const p of ps) {
          const x = p % W;
          for (const q of [x > 0 ? p - 1 : -1, x + 1 < W ? p + 1 : -1, p - W, p + W]) {
            if (q < 0 || q >= n || comp[q] === c) continue;
            const l = et[q] ?? 0;
            vecini.set(l, (vecini.get(l) ?? 0) + 1);
          }
        }
        let nou = -1, cel = -1;
        for (const [l, k] of vecini) if (k > cel || (k === cel && l < nou)) { cel = k; nou = l; }
        if (nou < 0 || nou === eticheta[c]) continue;
        for (const p of ps) { et[p] = nou; orig[p] = nou; }
        if (eFundal(eticheta[c] ?? 0)) gauri++; else pete++;
      }
    }
  }

  // 8. Plasa duală, rând cu rând: un vârf pe celulă (două la o celulă-șa), legat peste fiecare latură dintre culori.
  const Lx = (X: number, Y: number): number => (X < 1 || Y < 1 || X > W || Y > H ? O : et[(Y - 1) * W + (X - 1)] ?? O);
  const idx = (X: number, Y: number): number => (X < 1 || Y < 1 || X > W || Y > H ? -1 : (Y - 1) * W + (X - 1));
  const acop = (p: number): number => (p < 0 ? 0 : transparenta ? Math.min(1, A(p) / plin) : 1);
  let laturi = 0, amestecate = 0;
  const vx = new Crescator((k) => new Float64Array(k)), vy = new Crescator((k) => new Float64Array(k));
  const eu = new Crescator((k) => new Int32Array(k)), ev = new Crescator((k) => new Int32Array(k));
  const es = new Crescator((k) => new Int32Array(k)), ed = new Crescator((k) => new Int32Array(k));
  // Fiecare latură a plasei trece peste o pereche de pixeli: punctul ei de 50 % e geometria graniței (plasa dă doar ordinea).
  const mx = new Crescator((k) => new Float64Array(k)), my = new Crescator((k) => new Float64Array(k));
  /** Punctul de 50 % dintre centrele pixelilor extinși (X1, Y1) și (X2, Y2), vecini. */
  const trecere = (X1: number, Y1: number, X2: number, Y2: number): [number, number] => {
    const la = Lx(X1, Y1), lb = Lx(X2, Y2), pa = idx(X1, Y1), pb = idx(X2, Y2);
    let sa = 0, sb = 1;
    if (la >= K || lb >= K) {
      if (lb >= K && la < K) { sa = 1 - acop(pa); sb = 1 - acop(pb); } else if (la >= K && lb < K) { sa = acop(pa); sb = acop(pb); }
    } else {
      const ca = centruRgb[orig[pa] ?? 0] ?? [0, 0, 0], cb = centruRgb[orig[pb] ?? 0] ?? [0, 0, 0];
      const ax = cb[0] - ca[0], ay = cb[1] - ca[1], az = cb[2] - ca[2], l2 = ax * ax + ay * ay + az * az;
      const pr = (p: number): number => (l2 > 0 ? Math.max(0, Math.min(1, (((d[4 * p] ?? 0) - ca[0]) * ax + ((d[4 * p + 1] ?? 0) - ca[1]) * ay + ((d[4 * p + 2] ?? 0) - ca[2]) * az) / l2)) : 0.5);
      if (l2 > 0) { sa = pr(pa); sb = pr(pb); }
    }
    if (pa >= 0 && pb >= 0) {
      laturi++;
      if ((sa > 0.08 && sa < 0.92) || (sb > 0.08 && sb < 0.92)) amestecate++;
    }
    const t = Math.max(0.02, Math.min(0.98, Math.abs(sb - sa) > 1e-9 ? (0.5 - sa) / (sb - sa) : 0.5));
    return [X1 - 0.5 + t * (X2 - X1), Y1 - 0.5 + t * (Y2 - Y1)];
  };
  const varf = (...pts: Array<[number, number] | null>): number => {
    let sx = 0, sy = 0, c = 0;
    for (const p of pts) if (p) { sx += p[0]; sy += p[1]; c++; }
    vy.push(sy / c);
    return vx.push(sx / c);
  };
  const muchie = (a: number, b: number, st: number, dr: number, pt: [number, number]): void => {
    if (a < 0 || b < 0) throw new Error('plasa: o latură fără vârf');
    eu.push(a); ev.push(b); es.push(st); ed.push(dr); mx.push(pt[0]); my.push(pt[1]);
  };
  let susJos = new Int32Array(W + 2).fill(-1), jos = new Int32Array(W + 2).fill(-1);
  const raport0 = (): RaportCulori => raportFinal(0, 0, 0, 0);
  let preaMulte = false;
  for (let cy = 0; cy <= H && !preaMulte; cy++) {
    jos.fill(-1);
    let dreaptaStanga = -1;
    for (let cx = 0; cx <= W; cx++) {
      const a = Lx(cx, cy), b = Lx(cx + 1, cy), c = Lx(cx + 1, cy + 1), e = Lx(cx, cy + 1);
      if (a === b && b === c && c === e) { dreaptaStanga = -1; continue; }
      const sus = a !== b ? trecere(cx, cy, cx + 1, cy) : null;
      const dreapta = b !== c ? trecere(cx + 1, cy, cx + 1, cy + 1) : null;
      const jo = e !== c ? trecere(cx, cy + 1, cx + 1, cy + 1) : null;
      const stanga = a !== e ? trecere(cx, cy, cx, cy + 1) : null;
      let vSus = -1, vDreapta = -1, vJos = -1, vStanga = -1;
      // Colțurile tăiate: cel din dreapta-sus și cel din stânga-jos (diagonala principală e legată), sau invers.
      const taieDreaptaSusStangaJos = (): void => { vSus = vDreapta = varf(sus, dreapta); vJos = vStanga = varf(jo, stanga); };
      const taieStangaSusDreaptaJos = (): void => { vSus = vStanga = varf(sus, stanga); vJos = vDreapta = varf(jo, dreapta); };
      if (a === c && b === e && a !== b) {
        if (castiga(a, b, idx(cx, cy)) === a) taieDreaptaSusStangaJos(); else taieStangaSusDreaptaJos();
      } else if (a === c && a !== b && a !== e && b !== e && !eFundal(a)) {
        taieDreaptaSusStangaJos();
      } else if (b === e && b !== a && b !== c && a !== c && !eFundal(b)) {
        taieStangaSusDreaptaJos();
      } else {
        const v = varf(sus, dreapta, jo, stanga);
        if (sus) vSus = v;
        if (dreapta) vDreapta = v;
        if (jo) vJos = v;
        if (stanga) vStanga = v;
      }
      // Peste latura de sus (spre celula de deasupra), în jos: la stânga e pixelul din stânga (a).
      if (sus) muchie(susJos[cx] ?? -1, vSus, a, b, sus);
      // Peste latura din stânga (spre celula din stânga), spre dreapta: la stânga e pixelul de jos (e).
      if (stanga) muchie(dreaptaStanga, vStanga, e, a, stanga);
      jos[cx] = jo ? vJos : -1;
      dreaptaStanga = dreapta ? vDreapta : -1;
    }
    [susJos, jos] = [jos, susJos];
    if (vx.n > VARFURI_PLASA) preaMulte = true;
  }

  // Raportul (cu numărătorile de la capăt).
  function raportFinal(granite: number, contururi: number, varfuri: number, abatere: number): RaportCulori {
    const nr = new Float64Array(K + 2);
    let desen = 0;
    for (let p = 0; p < n; p++) { const l = orig[p] ?? 0; nr[l] = (nr[l] ?? 0) + 1; if (l < K && !eFundal(l)) desen++; }
    const paleta: CuloarePaleta[] = Array.from({ length: K }, (_, k) => ({
      hex: hex(centruRgb[k] ?? [0, 0, 0]),
      pondere: k === fundal ? (nr[k] ?? 0) / n : desen > 0 ? (nr[k] ?? 0) / desen : 0,
      fundal: k === fundal, prima: prima[k] ?? k, bifata: bifata(k),
    }));
    return {
      latime: W, inaltime: H, transparenta, automat: red.automat, paleta,
      margini: laturi > 0 && amestecate / laturi < 0.15 ? 'dure' : 'netezite', pete, gauri, granite, contururi, varfuri, abatere,
    };
  }
  if (preaMulte) return { ok: false, cod: 'prea-multe', raport: raport0() };

  // 9. Arcele: lanțurile de vârfuri cu două laturi, între joncțiuni; apoi buclele fără joncțiuni.
  const NV = vx.n, NE = eu.n;
  const grad = new Int32Array(NV + 1);
  for (let k = 0; k < NE; k++) { grad[(eu.a[k] ?? 0) + 1]!++; grad[(ev.a[k] ?? 0) + 1]!++; }
  const deg = (v: number): number => (grad[v + 1] ?? 0) - (grad[v] ?? 0);
  for (let v = 0; v < NV; v++) grad[v + 1] = (grad[v + 1] ?? 0) + (grad[v] ?? 0);
  const adj = new Int32Array(2 * NE), poz = grad.slice(0, NV);
  for (let k = 0; k < NE; k++) { adj[poz[eu.a[k] ?? 0]!++] = k; adj[poz[ev.a[k] ?? 0]!++] = k; }
  const vazuta = new Uint8Array(NE);
  const arce: Arc[] = [];
  const celalalt = (k: number, v: number): number => ((eu.a[k] ?? 0) === v ? ev.a[k] ?? 0 : eu.a[k] ?? 0);
  /**
   * Un arc, de la vârful v0 pe latura k0: punctele lui sunt punctele de 50 % ale laturilor parcurse (conturul sub-pixel, ca la
   * ADR 0220), cu joncțiunile la capete; pe o buclă fără joncțiuni, doar punctele laturilor.
   */
  const drum = (v0: number, k0: number, inchis: boolean): void => {
    const ids = [v0], laturiArc: number[] = [];
    const st = (eu.a[k0] ?? 0) === v0 ? es.a[k0] ?? 0 : ed.a[k0] ?? 0, dr = (eu.a[k0] ?? 0) === v0 ? ed.a[k0] ?? 0 : es.a[k0] ?? 0;
    let v = v0, k = k0;
    for (;;) {
      vazuta[k] = 1;
      laturiArc.push(k);
      const w2 = celalalt(k, v);
      if (inchis && w2 === v0) break;
      ids.push(w2);
      if (!inchis && deg(w2) !== 2) break;
      const g0 = grad[w2] ?? 0;
      const urm = (adj[g0] ?? 0) === k ? adj[g0 + 1] ?? 0 : adj[g0] ?? 0;
      if (vazuta[urm]) break;
      v = w2; k = urm;
    }
    const xy: number[] = [];
    if (!inchis) xy.push(vx.a[v0] ?? 0, vy.a[v0] ?? 0);
    for (const q of laturiArc) xy.push(mx.a[q] ?? 0, my.a[q] ?? 0);
    if (!inchis) { const z = ids[ids.length - 1] ?? 0; xy.push(vx.a[z] ?? 0, vy.a[z] ?? 0); }
    const pts = Float64Array.from(xy);
    arce.push({ pts, inchis, de: ids[0] ?? 0, la: inchis ? ids[0] ?? 0 : ids[ids.length - 1] ?? 0, stanga: st, dreapta: dr, bucati: [], sfarsit: [0, 0] });
  };
  for (let v = 0; v < NV; v++) {
    if (deg(v) === 2) continue;
    for (let g = grad[v] ?? 0; g < (grad[v + 1] ?? 0); g++) { const k = adj[g] ?? 0; if (!vazuta[k]) drum(v, k, false); }
  }
  for (let k = 0; k < NE; k++) if (!vazuta[k]) drum(eu.a[k] ?? 0, k, true);

  // 9b. Joncțiunile: vârful plasei e media trecerilor din celula lui, la până la ~0,5 px de locul unde se întâlnesc granițele.
  // Îl mutăm în punctul cel mai apropiat (cele mai mici pătrate) de dreptele granițelor, potrivite pe trecerile de lângă el.
  const capete = new Map<number, Array<{ readonly arc: Arc; readonly laInceput: boolean }>>();
  for (const a of arce) {
    if (a.inchis) continue;
    (capete.get(a.de) ?? capete.set(a.de, []).get(a.de))?.push({ arc: a, laInceput: true });
    (capete.get(a.la) ?? capete.set(a.la, []).get(a.la))?.push({ arc: a, laInceput: false });
  }
  for (const [v, lista] of capete) {
    if (lista.length < 3) continue;
    const x0 = vx.a[v] ?? 0, y0 = vy.a[v] ?? 0, miu = JONCTIUNE.miu;
    let a11 = miu, a12 = 0, a22 = miu, b1 = miu * x0, b2 = miu * y0, drepte = 0;
    for (const { arc, laInceput } of lista) {
      const p = arc.pts, m = p.length / 2;
      const xs: number[] = [], ys: number[] = [];
      // De la joncțiune spre interiorul arcului, fără celălalt capăt, până la primul colț.
      for (let i = 1; i < m - 1 && xs.length < JONCTIUNE.puncte; i++) {
        const q = laInceput ? i : m - 1 - i;
        const x = p[2 * q] ?? 0, y = p[2 * q + 1] ?? 0, r = Math.hypot(x - x0, y - y0);
        if (r > JONCTIUNE.max) break;
        if (r < JONCTIUNE.min) continue;
        const n0 = xs.length;
        if (n0 >= 2) {
          const u = Math.atan2((ys[n0 - 1] ?? 0) - (ys[0] ?? 0), (xs[n0 - 1] ?? 0) - (xs[0] ?? 0));
          let dU = Math.atan2(y - (ys[n0 - 1] ?? 0), x - (xs[n0 - 1] ?? 0)) - u;
          while (dU > Math.PI) dU -= 2 * Math.PI;
          while (dU < -Math.PI) dU += 2 * Math.PI;
          if (Math.abs(dU) > JONCTIUNE.cotitura) break;
        }
        xs.push(x); ys.push(y);
      }
      const c = xs.length;
      if (c < 2) continue;
      let cx = 0, cy = 0;
      for (let i = 0; i < c; i++) { cx += xs[i] ?? 0; cy += ys[i] ?? 0; }
      cx /= c; cy /= c;
      let sxx = 0, sxy = 0, syy = 0;
      for (let i = 0; i < c; i++) { const dx = (xs[i] ?? 0) - cx, dy = (ys[i] ?? 0) - cy; sxx += dx * dx; sxy += dx * dy; syy += dy * dy; }
      // Direcția principală are unghiul ½·atan2(2·σxy, σxx − σyy); dreapta e {q : n·q = n·c}, cu n normala ei.
      const t = 0.5 * Math.atan2(2 * sxy, sxx - syy);
      const nx = -Math.sin(t), ny = Math.cos(t), k = nx * cx + ny * cy;
      let rest = 0;
      for (let i = 0; i < c; i++) rest = Math.max(rest, Math.abs(nx * (xs[i] ?? 0) + ny * (ys[i] ?? 0) - k));
      if (rest > JONCTIUNE.rest) continue;
      a11 += nx * nx; a12 += nx * ny; a22 += ny * ny; b1 += nx * k; b2 += ny * k; drepte++;
    }
    if (drepte < 2) continue;
    const det = a11 * a22 - a12 * a12;
    if (!(det > 1e-9)) continue;
    const x = (b1 * a22 - b2 * a12) / det, y = (a11 * b2 - a12 * b1) / det;
    if (!(Math.hypot(x - x0, y - y0) <= JONCTIUNE.mutare)) continue;
    vx.a[v] = x; vy.a[v] = y;
    for (const { arc, laInceput } of lista) {
      const q = laInceput ? 0 : arc.pts.length / 2 - 1;
      arc.pts[2 * q] = x; arc.pts[2 * q + 1] = y;
    }
  }

  // 10. Curbele: fiecare arc o singură dată (pe marginile dure, netezit întâi).
  const margini = laturi > 0 && amestecate / laturi < 0.15 ? 'dure' : 'netezite';
  const trepte = TREPTE[o.netezime];
  const eps = margini === 'dure' ? Math.max(trepte.eps, EPS_DUR) : trepte.eps;
  const tau = margini === 'dure' ? Math.max(trepte.tau, EPS_DUR) : trepte.tau;
  const depasire = margini === 'dure' ? 1.5 : 0.9;
  let abatere = 0;
  // Doar arcele care mărginesc o culoare trasată.
  const folosit = (a: Arc): boolean => bifata(a.stanga) || bifata(a.dreapta);
  for (const a of arce) {
    if (!folosit(a)) continue;
    if (a.inchis) {
      const P = margini === 'dure' ? netezeste(a.pts) : a.pts;
      const r = curbeleBuclei(P, eps, tau, trepte.colt, depasire);
      a.bucati = r.bucati;
      a.sfarsit = [r.bucati[0]?.x ?? 0, r.bucati[0]?.y ?? 0];
      abatere = Math.max(abatere, r.abatere);
    } else {
      const P = margini === 'dure' ? netezesteArc(a.pts) : a.pts;
      const r = curbeleArcului(P, eps, tau, trepte.colt, depasire);
      a.bucati = r.bucati;
      a.sfarsit = r.sfarsit;
      abatere = Math.max(abatere, r.abatere);
    }
  }

  // 11. Fiecare culoare trasată își adună arcele (cu ea la stânga), în bucle închise.
  type Jumatate = { readonly arc: Arc; readonly invers: boolean };
  const inceputJ = (j: Jumatate): number => (j.invers ? j.arc.la : j.arc.de);
  const sfarsitJ = (j: Jumatate): number => (j.invers ? j.arc.de : j.arc.la);
  /** Unghiul cu care pleacă jumătatea din capătul ei de început, și cel cu care sosește în capătul de sfârșit. */
  const pleaca = (j: Jumatate): number => {
    const p = j.arc.pts, m = p.length / 2;
    const [x0, y0, x1, y1] = j.invers ? [p[2 * m - 2], p[2 * m - 1], p[2 * m - 4], p[2 * m - 3]] : [p[0], p[1], p[2], p[3]];
    return Math.atan2((y1 ?? 0) - (y0 ?? 0), (x1 ?? 0) - (x0 ?? 0));
  };
  const soseste = (j: Jumatate): number => {
    const p = j.arc.pts, m = p.length / 2;
    const [x0, y0, x1, y1] = j.invers ? [p[2], p[3], p[0], p[1]] : [p[2 * m - 4], p[2 * m - 3], p[2 * m - 2], p[2 * m - 1]];
    return Math.atan2((y1 ?? 0) - (y0 ?? 0), (x1 ?? 0) - (x0 ?? 0));
  };
  const piese: PiesaCuloare[] = [];
  let contururi = 0, varfuri = 0;
  for (let L = 0; L < K; L++) {
    if (!bifata(L)) continue;
    const jumatati: Jumatate[] = [];
    for (const a of arce) {
      if (a.stanga === L) jumatati.push({ arc: a, invers: false });
      else if (a.dreapta === L) jumatati.push({ arc: a, invers: true });
    }
    if (jumatati.length === 0) continue;
    const bucle: Jumatate[][] = [];
    const deschise = new Map<number, Jumatate[]>();
    for (const j of jumatati) {
      if (j.arc.inchis) { bucle.push([j]); continue; }
      const v = inceputJ(j);
      (deschise.get(v) ?? deschise.set(v, []).get(v))?.push(j);
    }
    const folosite = new Set<Jumatate>();
    for (const j0 of jumatati) {
      if (j0.arc.inchis || folosite.has(j0)) continue;
      const bucla = [j0];
      folosite.add(j0);
      let j = j0;
      for (let pas = 0; pas < jumatati.length && sfarsitJ(j) !== inceputJ(j0); pas++) {
        const cand = (deschise.get(sfarsitJ(j)) ?? []).filter((x) => !folosite.has(x));
        if (cand.length === 0) break;
        // Un vârf unde culoarea apare de două ori: următoarea e prima latură întâlnită rotind, din direcția de întoarcere,
        // spre partea culorii (aceeași felie a vârfului).
        let urm = cand[0] as Jumatate;
        if (cand.length > 1) {
          const inapoi = soseste(j) + Math.PI;
          let cel = Infinity;
          for (const x of cand) {
            let r = inapoi - pleaca(x);
            while (r <= 0) r += 2 * Math.PI;
            while (r > 2 * Math.PI) r -= 2 * Math.PI;
            if (r < cel) { cel = r; urm = x; }
          }
        }
        bucla.push(urm);
        folosite.add(urm);
        j = urm;
      }
      bucle.push(bucla);
    }
    // Bucățile buclelor (cele ale arcelor întoarse, în sens invers) și semnul ariei (pe vârfurile plasei).
    const inceput: number[] = [0], tipuri: number[] = [], xy: number[] = [], exterior: number[] = [];
    for (const bucla of bucle) {
      let ariaD = 0, px0 = Number.NaN, py0 = Number.NaN, pxa = 0, pya = 0;
      const punct = (x: number, y: number): void => {
        if (Number.isNaN(px0)) { px0 = x; py0 = y; } else ariaD += pxa * y - x * pya;
        pxa = x; pya = y;
      };
      for (const j of bucla) {
        const p = j.arc.pts, m = p.length / 2;
        for (let i = 0; i < m; i++) { const q = j.invers ? m - 1 - i : i; punct(p[2 * q] ?? 0, p[2 * q + 1] ?? 0); }
        const B = j.arc.bucati;
        if (!j.invers) {
          for (const b of B) { tipuri.push(b.tip); xy.push(b.x, b.y, b.c1x, b.c1y, b.c2x, b.c2y); }
        } else {
          for (let i = B.length - 1; i >= 0; i--) {
            const b = B[i] as Bucata;
            const capat = i + 1 < B.length ? (B[i + 1] as Bucata) : { x: j.arc.sfarsit[0], y: j.arc.sfarsit[1] };
            tipuri.push(b.tip); xy.push(capat.x, capat.y, b.c2x, b.c2y, b.c1x, b.c1y);
          }
        }
      }
      ariaD += pxa * py0 - px0 * pya;
      inceput.push(tipuri.length);
      exterior.push(ariaD > 0 ? 1 : 0);
    }
    contururi += bucle.length;
    varfuri += tipuri.length;
    piese.push({
      culoare: L, hex: hex(centruRgb[L] ?? [0, 0, 0]),
      cai: { inceput: Uint32Array.from(inceput), tip: Uint8Array.from(tipuri), xy: Float64Array.from(xy), exterior: Uint8Array.from(exterior) },
    });
  }
  const raport = raportFinal(arce.filter(folosit).length, contururi, varfuri, abatere);
  if (contururi > PLAFON_TRASARE.contururi || varfuri > PLAFON_TRASARE.varfuri) return { ok: false, cod: 'prea-multe', raport };
  const etichete = new Uint8Array(n);
  for (let p = 0; p < n; p++) { const l = et[p] ?? 0; etichete[p] = l < K ? l : 255; }
  return { ok: true, piese, raport, etichete };
}
