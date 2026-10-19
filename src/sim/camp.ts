/**
 * Câmpul de înălțimi al simulării (ADR 0010, ADR 0047 §1): o celulă ține Z-ul cel mai jos atins de suprafața sculei
 * deasupra centrului ei („cea mai adâncă tăietură câștigă”), în Float32. Câmpul e rar:
 * - grila e împărțită în **dale** de 16 × 16 celule; o dală se alocă doar la prima tăietură sub fața plăcii;
 * - dalele alocate stau într-un **atlas**: un singur `Float32Array` cu locuri de 256 de celule și un tabel de index
 *   (`loc`: −1 = neatinsă, la fața plăcii; −2 = uniformă; ≥ 0 = locul în atlas), nu câte un obiect pe dală;
 * - după calcul, **dalele uniforme** (toate celulele egale: fundul unui canal, o gaură) se țin ca un singur număr
 *   (`uniforma`), iar atlasul se strânge (`compacteaza`).
 * Celula (i, j) are centrul în (x0 + (i + 0,5)·celula, y0 + (j + 0,5)·celula), ca la oracol.
 *
 * O **bandă** e o parte a rândurilor de dale: rândul de dale r e al benzii r mod n (rânduri intercalate pe bazin). Un câmp
 * cu banda (n, w) scrie doar în rândurile lui; celelalte rămân la fața plăcii.
 */

export const SH = 4;
export const SH2 = 2 * SH;
export const LATURA_DALA = 1 << SH;
export const M = LATURA_DALA - 1;
export const CELULE_DALA = LATURA_DALA * LATURA_DALA;

/** Celula implicită (ADR 0010): 0,25 mm pe toată foaia. */
export const CELULA_IMPLICITA = 0.25;
/**
 * Plafonul de celule al unui câmp (2²⁶ ≈ 67 M, 268 MB dacă ar fi toate tăiate): placa de 2440 × 1220 la 0,25 mm are 47,6 M.
 * O foaie mai mare primește o celulă dublată până încape (plafonul e pe artefact, nu pe ușă).
 */
export const PLAFON_CELULE = 67_108_864;

export type ParametriCamp = {
  readonly x0: number; readonly y0: number; readonly latime: number; readonly inaltime: number;
  readonly celula: number;
  /** Z-ul feței plăcii (0 în coordonatele documentului). */
  readonly sus: number;
};

/** Rândurile de dale r cu r mod n = w. */
export type Banda = { readonly n: number; readonly w: number };

export type Camp = {
  readonly x0: number; readonly y0: number; readonly celula: number;
  /** Fața plăcii, rotunjită la Float32 (valoarea unei celule netăiate). */
  readonly sus: number;
  readonly nx: number; readonly ny: number; readonly ntx: number; readonly nty: number;
  readonly banda: Banda;
  /** Pe dală: −1 neatinsă, −2 uniformă (valoarea în `uniforma`), ≥ 0 locul în atlas. */
  readonly loc: Int32Array;
  readonly uniforma: Float32Array;
  atlas: Float32Array;
  /** Câte locuri din atlas sunt folosite. */
  locuri: number;
};

export const NEATINSA = -1;
export const UNIFORMA = -2;

export function dimensiuni(celula: number, latime: number, inaltime: number): { readonly nx: number; readonly ny: number } {
  return { nx: Math.ceil(latime / celula - 1e-9), ny: Math.ceil(inaltime / celula - 1e-9) };
}

/** Grila foii: de la colțul stânga-jos, cu celula implicită sau cu cea mai mică dublare a ei care încape sub plafon. */
export function campPentruFoaie(foaie: { readonly latime: number; readonly inaltime: number }, celula = CELULA_IMPLICITA): ParametriCamp {
  let c = celula;
  for (;;) {
    const { nx, ny } = dimensiuni(c, foaie.latime, foaie.inaltime);
    if (nx * ny <= PLAFON_CELULE) break;
    c *= 2;
  }
  return { x0: 0, y0: 0, latime: foaie.latime, inaltime: foaie.inaltime, celula: c, sus: 0 };
}

export function campNou(p: ParametriCamp, banda: Banda = { n: 1, w: 0 }): Camp {
  if (!(p.celula > 0) || !(p.latime > 0) || !(p.inaltime > 0)) throw new Error('câmpul cere o celulă și o foaie pozitive');
  if (!(Number.isInteger(banda.n) && banda.n >= 1 && Number.isInteger(banda.w) && banda.w >= 0 && banda.w < banda.n)) {
    throw new Error(`bandă invalidă: ${banda.w} din ${banda.n}`);
  }
  const { nx, ny } = dimensiuni(p.celula, p.latime, p.inaltime);
  if (nx * ny > PLAFON_CELULE) throw new Error(`câmpul are ${nx * ny} de celule, peste plafonul de ${PLAFON_CELULE}`);
  const ntx = (nx + M) >> SH, nty = (ny + M) >> SH;
  return {
    x0: p.x0, y0: p.y0, celula: p.celula, sus: Math.fround(p.sus), nx, ny, ntx, nty, banda,
    loc: new Int32Array(ntx * nty).fill(NEATINSA), uniforma: new Float32Array(ntx * nty),
    atlas: new Float32Array(64 * CELULE_DALA), locuri: 0,
  };
}

/** Rândul de dale r e al benzii câmpului? */
export function alBenzii(F: Camp, r: number): boolean {
  return F.banda.n === 1 || r % F.banda.n === F.banda.w;
}

/**
 * Un loc nou în atlas pentru dala d (neatinsă sau uniformă), umplut cu valoarea ei; întoarce locul. Atlasul crește în
 * pași (cel mult 8 192 de locuri, 8 MB, odată), ca o placă mare să nu ceară dintr-odată dublul memoriei.
 */
export function alocaDala(F: Camp, d: number): number {
  const s = F.locuri;
  if ((s + 1) * CELULE_DALA > F.atlas.length) {
    const acum = F.atlas.length / CELULE_DALA;
    const nou = new Float32Array((acum + Math.max(64, Math.min(acum, 8192))) * CELULE_DALA);
    nou.set(F.atlas.subarray(0, s * CELULE_DALA));
    F.atlas = nou;
  }
  F.atlas.fill(F.loc[d] === UNIFORMA ? F.uniforma[d]! : F.sus, s * CELULE_DALA, (s + 1) * CELULE_DALA);
  F.loc[d] = s;
  F.locuri = s + 1;
  return s;
}

/** Valoarea celulei (i, j). */
export function valoare(F: Camp, i: number, j: number): number {
  const d = (j >> SH) * F.ntx + (i >> SH), s = F.loc[d]!;
  if (s >= 0) return F.atlas[(s << SH2) | ((j & M) << SH) | (i & M)]!;
  return s === UNIFORMA ? F.uniforma[d]! : F.sus;
}

/**
 * Dalele uniforme devin un număr, iar cele rămase la fața plăcii devin neatinse (o celulă tăiată cu mai puțin de o
 * jumătate de ulp sub față iese, în Float32, chiar fața); atlasul se strânge, în ordinea locurilor. Valorile celulelor
 * nu se schimbă.
 */
export function compacteaza(F: Camp): void {
  const { atlas, loc } = F;
  const dalaLoc = new Int32Array(F.locuri).fill(-1);
  for (let d = 0; d < loc.length; d++) if (loc[d]! >= 0) dalaLoc[loc[d]!] = d;
  let scrise = 0;
  for (let s = 0; s < F.locuri; s++) {
    const d = dalaLoc[s]!, b = s * CELULE_DALA, v = atlas[b]!;
    let uniform = true;
    for (let k = 1; k < CELULE_DALA; k++) if (atlas[b + k] !== v) { uniform = false; break; }
    if (uniform) {
      if (v === F.sus) loc[d] = NEATINSA;
      else { loc[d] = UNIFORMA; F.uniforma[d] = v; }
      continue;
    }
    if (scrise !== s) atlas.copyWithin(scrise * CELULE_DALA, b, b + CELULE_DALA);
    loc[d] = scrise++;
  }
  F.locuri = scrise;
}

/** Numărătoarea dalelor (pentru om și pentru probe). */
export function numaraDale(F: Camp): { readonly total: number; readonly atinse: number; readonly uniforme: number } {
  let atinse = 0, uniforme = 0;
  for (let d = 0; d < F.loc.length; d++) {
    const s = F.loc[d]!;
    if (s !== NEATINSA) atinse++;
    if (s === UNIFORMA) uniforme++;
  }
  return { total: F.loc.length, atinse, uniforme };
}
