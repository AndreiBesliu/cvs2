/**
 * ORACOLUL NUCLEULUI RELIEFULUI (ADR 0311, felia 18.1↑a). ZERO importuri din `src/`. Scris din textul ADR-ului, înaintea
 * nucleului (răspunsul 5a la ADR 0310): imaginea → grila, netezirea binomială cu golurile, înălțimea, dala cu cuantizarea ei,
 * octeții și amprenta, harta dalelor, compunerea straturilor.
 *
 * Fiecare funcție `...O` calculează ce cere contractul, cât mai direct (o singură formulă, fără optimizări); fiecare
 * `judeca...` compară ieșirea unei implementări cu ea și întoarce problemele găsite (gol = bine). Valorile pe hârtie stau în
 * `relief.cazuri.ts`; proba oracolului însuși (hârtia și controalele negative) în `test/unit/relief.oracol.test.ts`.
 *
 * Contractul, scris din nou aici (ADR 0311):
 * - grila nx × ny, j în sus; pixelul (x, y), y de sus, dă celula (x, ny − 1 − y); golul = alfa < 128 (NaN);
 * - gri: luminanța (2126 R + 7152 G + 722 B) / 2 550 000, sau un canal / 255;
 * - netezirea: n = 2 · round(2 σ²), tăiat la 50; ponderile C(n, k) / 2ⁿ la k − n / 2; întâi pe i, apoi pe j, în Float64,
 *   fiecare trecere împărțită la suma ponderilor vecinilor din grilă și negoi; golul rămâne gol;
 * - înălțimea: b + g · H (alb sus) sau b + (1 − g) · H, rotunjită la Float32;
 * - dala 256 × 256: gol → null; toate egale și negoale → constanta; altfel p = (M − m) / 65 534, codul round((v − m) / p),
 *   golul 65 535; citirea fround(m + k · p);
 * - octeții: „CVR1”, m, p (Float64 LE), codurile Uint16 LE rând cu rând; amprenta SHA-256 hex;
 * - harta: `{"dale":[...],"nx":…,"ny":…,"v":1}`, dalele tj apoi ti;
 * - compunerea: R = 0; straturile vizibile de jos în sus, pe celulele lor negoale; fiecare pas rotunjit la Float32.
 */
import { createHash } from 'node:crypto';

export const LATURA_DALA_O = 256;
export const CELULE_DALA_O = LATURA_DALA_O * LATURA_DALA_O;
export const COD_GOL_O = 65_535;
export const CODURI_O = 65_534;
export const ORDIN_MAXIM_O = 50;

export type SursaO = 'l' | 'r' | 'g' | 'b';
/** O imagine ca pixeli RGBA pe 8 biți, rând cu rând de sus în jos (ca `ImageData`). */
export type ImagineO = { readonly latime: number; readonly inaltime: number; readonly rgba: Uint8Array | Uint8ClampedArray };
export type OptiuniReliefO = {
  readonly sursa: SursaO;
  readonly sigma: number;
  /** Înălțimea H și baza b, în mm. */
  readonly inaltime: number;
  readonly baza: number;
  readonly albSus: boolean;
};
export type ModO = 'aduna' | 'scade' | 'inalt' | 'jos' | 'inlocuieste' | 'inmulteste';
export type StratO = { readonly mod: ModO; readonly vizibil: boolean; readonly valori: Float32Array };
export type DalaO =
  | { readonly fel: 'gol' }
  | { readonly fel: 'constanta'; readonly m: number }
  | { readonly fel: 'coduri'; readonly m: number; readonly p: number; readonly coduri: Uint16Array };

/** Valoarea gri a unui pixel (§2), sau NaN pentru gol. */
export function griPixelO(r: number, g: number, b: number, a: number, sursa: SursaO): number {
  if (a < 128) return NaN;
  if (sursa === 'r') return r / 255;
  if (sursa === 'g') return g / 255;
  if (sursa === 'b') return b / 255;
  return (2126 * r + 7152 * g + 722 * b) / 2_550_000;
}

/** Grila gri a imaginii (§2): indicele j · nx + i, cu j în sus. */
export function griO(img: ImagineO, sursa: SursaO): Float64Array {
  const nx = img.latime, ny = img.inaltime, out = new Float64Array(nx * ny);
  for (let y = 0; y < ny; y++) {
    for (let x = 0; x < nx; x++) {
      const p = 4 * (y * nx + x);
      out[(ny - 1 - y) * nx + x] = griPixelO(img.rgba[p] ?? 0, img.rgba[p + 1] ?? 0, img.rgba[p + 2] ?? 0, img.rgba[p + 3] ?? 0, sursa);
    }
  }
  return out;
}

/** Ordinul nucleului binomial (§3). */
export function ordinO(sigma: number): number {
  return Math.min(ORDIN_MAXIM_O, 2 * Math.round(2 * sigma * sigma));
}

/** Coeficienții binomiali C(n, k), exacți (n ≤ 50). */
function binomO(n: number): number[] {
  const rand = [1];
  for (let r = 1; r <= n; r++) {
    const nou = [1];
    for (let k = 1; k < r; k++) nou.push((rand[k - 1] ?? 0) + (rand[k] ?? 0));
    nou.push(1);
    rand.splice(0, rand.length, ...nou);
  }
  return rand;
}

/** Netezirea (§3): o trecere pe i, apoi una pe j, cu golurile sărite; golul rămâne gol. */
export function netezesteO(g: Float64Array, nx: number, ny: number, sigma: number): Float64Array {
  const n = ordinO(sigma);
  if (n === 0) return Float64Array.from(g);
  const c = binomO(n), doiLaN = 2 ** n, w = c.map((x) => x / doiLaN), h = n / 2;
  const trecere = (src: Float64Array, peI: boolean): Float64Array => {
    const out = new Float64Array(nx * ny);
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const v = src[j * nx + i] ?? NaN;
        if (Number.isNaN(v)) { out[j * nx + i] = NaN; continue; }
        let s = 0, sw = 0;
        for (let k = 0; k <= n; k++) {
          const ii = peI ? i + k - h : i, jj = peI ? j : j + k - h;
          if (ii < 0 || jj < 0 || ii >= nx || jj >= ny) continue;
          const u = src[jj * nx + ii] ?? NaN;
          if (Number.isNaN(u)) continue;
          s += (w[k] ?? 0) * u;
          sw += w[k] ?? 0;
        }
        out[j * nx + i] = s / sw;
      }
    }
    return out;
  };
  return trecere(trecere(g, true), false);
}

/** Înălțimile (§4), în Float32; golul rămâne NaN. */
export function inaltimiO(g: Float64Array, o: Pick<OptiuniReliefO, 'inaltime' | 'baza' | 'albSus'>): Float32Array {
  const out = new Float32Array(g.length);
  for (let k = 0; k < g.length; k++) {
    const v = g[k] ?? NaN;
    out[k] = Number.isNaN(v) ? NaN : o.albSus ? o.baza + v * o.inaltime : o.baza + (1 - v) * o.inaltime;
  }
  return out;
}

/** Relieful unei imagini (§2–§4): grila de înălțimi, nx · ny, j în sus. */
export function reliefDinImagineO(img: ImagineO, o: OptiuniReliefO): Float32Array {
  return inaltimiO(netezesteO(griO(img, o.sursa), img.latime, img.inaltime, o.sigma), o);
}

/** Valorile dalei (ti, tj) dintr-o grilă nx × ny (§5): 256 × 256, golul (NaN) în afara grilei. */
export function dalaDinGrilaO(valori: Float32Array, nx: number, ny: number, ti: number, tj: number): Float32Array {
  const out = new Float32Array(CELULE_DALA_O).fill(NaN);
  for (let b = 0; b < LATURA_DALA_O; b++) {
    for (let a = 0; a < LATURA_DALA_O; a++) {
      const i = ti * LATURA_DALA_O + a, j = tj * LATURA_DALA_O + b;
      if (i < nx && j < ny) out[b * LATURA_DALA_O + a] = valori[j * nx + i] ?? NaN;
    }
  }
  return out;
}

/** Cuantizarea unei dale (§5). */
export function cuantizeazaO(valori: Float32Array): DalaO {
  let m = Infinity, M = -Infinity, goale = 0;
  for (const v of valori) {
    if (Number.isNaN(v)) { goale++; continue; }
    if (v < m) m = v;
    if (v > M) M = v;
  }
  if (goale === valori.length) return { fel: 'gol' };
  if (goale === 0 && m === M) return { fel: 'constanta', m };
  const p = m === M ? 0 : (M - m) / CODURI_O;
  const coduri = new Uint16Array(valori.length);
  for (let k = 0; k < valori.length; k++) {
    const v = valori[k] ?? NaN;
    coduri[k] = Number.isNaN(v) ? COD_GOL_O : p === 0 ? 0 : Math.min(CODURI_O, Math.max(0, Math.round((v - m) / p)));
  }
  return { fel: 'coduri', m, p, coduri };
}

/** Valorile citite dintr-o dală (§5): Float32, golul NaN. */
export function citesteO(d: DalaO, n = CELULE_DALA_O): Float32Array {
  const out = new Float32Array(n);
  if (d.fel === 'gol') return out.fill(NaN);
  if (d.fel === 'constanta') return out.fill(d.m);
  for (let k = 0; k < n; k++) {
    const c = d.coduri[k] ?? COD_GOL_O;
    out[k] = c === COD_GOL_O ? NaN : Math.fround(d.m + c * d.p);
  }
  return out;
}

/** Octeții unei dale cu coduri (§5), scriși octet cu octet (little-endian de mână, fără DataView). */
export function octetiO(d: Extract<DalaO, { fel: 'coduri' }>): Uint8Array {
  const out = new Uint8Array(4 + 16 + 2 * d.coduri.length);
  out.set([0x43, 0x56, 0x52, 0x31], 0); // „CVR1”
  const f = new Float64Array([d.m, d.p]);
  const b = new Uint8Array(f.buffer);
  // Float64Array folosește ordinea mașinii; Node rulează pe little-endian, iar proba o cere (`octetiO` pe hârtie).
  out.set(b, 4);
  for (let k = 0; k < d.coduri.length; k++) {
    const c = d.coduri[k] ?? 0;
    out[20 + 2 * k] = c & 0xff;
    out[21 + 2 * k] = c >>> 8;
  }
  return out;
}

/** SHA-256, în hexazecimal mic. */
export function amprentaO(x: Uint8Array | string): string {
  return createHash('sha256').update(x).digest('hex');
}

/** Intrarea unei dale în hartă (§6): amprenta, constanta sau null. */
export function intrareO(d: DalaO): string | number | null {
  if (d.fel === 'gol') return null;
  if (d.fel === 'constanta') return d.m;
  return amprentaO(octetiO(d));
}

/** Textul canonic al hărții (§6), scris direct, cu cheile în ordinea lor alfabetică. */
export function hartaO(nx: number, ny: number, dale: readonly (string | number | null)[]): string {
  const intrari = dale.map((d) => (d === null ? 'null' : typeof d === 'number' ? JSON.stringify(d) : `"${d}"`));
  return `{"dale":[${intrari.join(',')}],"nx":${nx},"ny":${ny},"v":1}`;
}

/** Harta unei grile întregi (§5, §6): dalele, în ordinea tj, apoi ti. */
export function hartaGrileiO(valori: Float32Array, nx: number, ny: number): { readonly text: string; readonly dale: DalaO[] } {
  const dale: DalaO[] = [];
  for (let tj = 0; tj < Math.ceil(ny / LATURA_DALA_O); tj++) {
    for (let ti = 0; ti < Math.ceil(nx / LATURA_DALA_O); ti++) dale.push(cuantizeazaO(dalaDinGrilaO(valori, nx, ny, ti, tj)));
  }
  return { text: hartaO(nx, ny, dale.map(intrareO)), dale };
}

/** Compunerea (§7): R = 0, straturile vizibile de jos în sus, pe celulele lor negoale, fiecare pas rotunjit la Float32. */
export function compuneO(n: number, straturi: readonly StratO[]): Float32Array {
  const R = new Float32Array(n);
  for (const s of straturi) {
    if (!s.vizibil) continue;
    for (let k = 0; k < n; k++) {
      const v = s.valori[k] ?? NaN;
      if (Number.isNaN(v)) continue;
      const r = R[k] ?? 0;
      const x = s.mod === 'aduna' ? r + v : s.mod === 'scade' ? r - v : s.mod === 'inalt' ? Math.max(r, v)
        : s.mod === 'jos' ? Math.min(r, v) : s.mod === 'inlocuieste' ? v : r * v;
      R[k] = Math.fround(x);
    }
  }
  return R;
}

/** O unitate pe ultima poziție a unui Float32 în jurul lui v (pentru comparații). */
export function ulp32O(v: number): number {
  const a = Math.abs(v);
  if (a < 2 ** -126) return 2 ** -149;
  return 2 ** (Math.floor(Math.log2(a)) - 23);
}

/** Două grile de valori: aceleași goluri, iar valorile la cel mult `ulp` unități Float32. */
function comparaGrile(nume: string, asteptat: Float32Array, primit: ArrayLike<number>, ulp: number): string[] {
  const p: string[] = [];
  if (primit.length !== asteptat.length) return [`${nume}: ${primit.length} valori, nu ${asteptat.length}`];
  for (let k = 0; k < asteptat.length && p.length < 5; k++) {
    const a = asteptat[k] ?? NaN, b = primit[k] ?? NaN;
    if (Number.isNaN(a) !== Number.isNaN(b)) { p.push(`${nume}[${k}]: ${Number.isNaN(a) ? 'gol' : a} așteptat, ${Number.isNaN(b) ? 'gol' : b} primit`); continue; }
    if (!Number.isNaN(a) && Math.abs(a - b) > ulp * ulp32O(a)) p.push(`${nume}[${k}]: ${a} așteptat, ${b} primit`);
  }
  return p;
}

/** Relieful unei imagini, judecat față de contract: aceleași goluri, valorile la cel mult un ulp Float32. */
export function judecaReliefDinImagine(img: ImagineO, o: OptiuniReliefO, primit: ArrayLike<number>): string[] {
  return comparaGrile('relieful', reliefDinImagineO(img, o), primit, 1);
}

/** O dală cuantizată, judecată față de contract: felul, m, p și codurile, exact. */
export function judecaDala(valori: Float32Array, primit: DalaO): string[] {
  const a = cuantizeazaO(valori), p: string[] = [];
  if (a.fel !== primit.fel) return [`felul: ${a.fel} așteptat, ${primit.fel} primit`];
  if (a.fel === 'constanta' && primit.fel === 'constanta' && !Object.is(a.m, primit.m)) p.push(`constanta: ${a.m}, nu ${primit.m}`);
  if (a.fel === 'coduri' && primit.fel === 'coduri') {
    if (!Object.is(a.m, primit.m)) p.push(`m: ${a.m}, nu ${primit.m}`);
    if (!Object.is(a.p, primit.p)) p.push(`p: ${a.p}, nu ${primit.p}`);
    for (let k = 0; k < a.coduri.length && p.length < 5; k++) {
      if (a.coduri[k] !== primit.coduri[k]) p.push(`codul [${k}]: ${a.coduri[k]}, nu ${primit.coduri[k]}`);
    }
  }
  return p;
}

/** Valorile citite dintr-o dală, judecate față de contract, exact. */
export function judecaCitire(d: DalaO, primit: ArrayLike<number>): string[] {
  return comparaGrile('citirea', citesteO(d), primit, 0);
}

/** Compusul, judecat față de contract, exact (aceleași rotunjiri, în aceeași ordine). */
export function judecaCompunere(n: number, straturi: readonly StratO[], primit: ArrayLike<number>): string[] {
  return comparaGrile('compusul', compuneO(n, straturi), primit, 0);
}

/** Marginea erorii cuantizării (§5) pentru o dală cu coduri: p / 2 plus rotunjirea la Float32. */
export function margineEroareO(d: Extract<DalaO, { fel: 'coduri' }>, v: number): number {
  return d.p / 2 + ulp32O(v);
}
