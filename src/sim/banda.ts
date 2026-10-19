/**
 * Banda unui worker și unirea benzilor (ADR 0047 §4): rândul de dale r e al benzii r mod N. Fiecare bandă își simulează
 * rândurile cu mutările care le ating, își strânge dalele uniforme și întoarce doar rezumatul: amprenta fiecărui rând cu
 * dale atinse, volumul pe rând, Z-ul cel mai jos și previzualizarea (cel mai adânc punct pe bloc de celule). Unirea le
 * pune în ordinea rândurilor, deci rezultatul nu depinde de N: aceeași amprentă, același volum, bit cu bit.
 *
 * Amprenta (s4 §4.5): FNV-1a pe 2 × 32 de biți peste valorile Float32 ale celulelor (o dală uniformă = de 256 de ori
 * valoarea ei, ca amprenta să nu depindă de forma în care stă dala), pe rânduri, apoi peste rânduri, cu grila în față.
 * A doua jumătate amestecă cuvântul rotit cu 7 biți (nu deplasat: s4 pierdea cei 7 biți de jos, exact ulp-urile pe care
 * poarta Node = browser trebuie să le vadă; recenzia 19.10 a găsit o coliziune pe 3 celule). Câmpuri cu aceeași amprentă
 * au, practic, aceleași celule.
 */
import { CELULE_DALA, compacteaza, campNou, dimensiuni, LATURA_DALA, NEATINSA, numaraDale, SH, UNIFORMA, type Banda, type Camp, type ParametriCamp } from './camp.ts';
import { raza, ruleaza, silueta, STRIDE, type DateScula } from './nucleu.ts';

const P1 = 0x01000193, P2 = 0x5bd1e995;

/** Previzualizarea: `latime` × `inaltime` pixeli, fiecare pe un bloc de `bloc` × `bloc` celule; rândul 0 e jos (y0). */
export type Previzualizare = { readonly latime: number; readonly inaltime: number; readonly bloc: number };

/** Ce primește un worker (doar date, fără stare: ADR 0015). */
export type CerereBanda = {
  readonly camp: ParametriCamp;
  readonly banda: Banda;
  readonly scula: DateScula;
  readonly mutari: Float64Array;
  /** Fața de jos a foii (−grosimea): volumul nu scoate material sub ea. */
  readonly fund: number;
  readonly previzualizare: Previzualizare;
};

export type RaspunsBanda = {
  readonly banda: Banda;
  /** Rândurile de dale cu ceva tăiat, crescător, și amprenta fiecăruia (câte două cuvinte pe rând). */
  readonly randuri: Int32Array;
  readonly amprente: Uint32Array;
  /** Volumul scos pe fiecare dintre `randuri`, în mm³. */
  readonly volume: Float64Array;
  readonly zMin: number;
  /** Cel mai jos Z al celulelor benzii pe fiecare pixel (fața plăcii unde banda n-a tăiat nimic). */
  readonly previzualizare: Float32Array;
  readonly atinse: number;
  readonly uniforme: number;
  readonly ms: number;
};

export type RezumatSimulare = {
  readonly amprenta: string;
  /** Volumul scos din foaie, în mm³ (nimic sub fața de jos). */
  readonly volum: number;
  readonly zMin: number;
  /** Cât a coborât scula sub fața plăcii, în mm. */
  readonly adancimeMax: number;
  /** Scula a ajuns la fața de jos a foii (sau sub ea). */
  readonly prinFoaie: boolean;
  readonly celula: number;
  readonly sus: number;
  readonly fund: number;
  readonly previzualizare: Previzualizare & { readonly z: Float32Array };
  readonly dale: { readonly total: number; readonly atinse: number; readonly uniforme: number };
};

export function previzualizarePentru(p: ParametriCamp, maxim = 480): Previzualizare {
  const { nx, ny } = dimensiuni(p.celula, p.latime, p.inaltime);
  const bloc = Math.max(1, Math.ceil(Math.max(nx, ny) / maxim));
  return { latime: Math.ceil(nx / bloc), inaltime: Math.ceil(ny / bloc), bloc };
}

/**
 * Mutările care pot atinge rândurile benzii: cutia lor în Y (arcul: tot cercul), lărgită cu raza efectivă a sculei la
 * cel mai jos Z al mutării (aceeași pe care o folosește nucleul: un V puțin adânc taie îngust; elicea, cu toată raza)
 * și cu o celulă. Întotdeauna o copie (bazinul o transferă workerului; cererea omului rămâne întreagă).
 */
export function mutariPentruBanda(mutari: Float64Array, scula: DateScula, p: ParametriCamp, b: Banda): Float64Array {
  const T = silueta(scula);
  const { ny } = dimensiuni(p.celula, p.latime, p.inaltime);
  const nty = (ny + LATURA_DALA - 1) >> SH, dala = p.celula * LATURA_DALA;
  const pastrate: number[] = [];
  const n = mutari.length / STRIDE;
  for (let q = 0; q < n; q++) {
    const o = q * STRIDE;
    let ymin: number, ymax: number;
    if (mutari[o] === 0) {
      ymin = Math.min(mutari[o + 2]!, mutari[o + 5]!);
      ymax = Math.max(mutari[o + 2]!, mutari[o + 5]!);
    } else {
      const ux = mutari[o + 1]! - mutari[o + 7]!, uy = mutari[o + 2]! - mutari[o + 8]!, r = Math.sqrt(ux * ux + uy * uy);
      ymin = mutari[o + 8]! - r;
      ymax = mutari[o + 8]! + r;
    }
    const zlo = Math.min(mutari[o + 3]!, mutari[o + 6]!);
    const re = (mutari[o] !== 0 && mutari[o + 3] !== mutari[o + 6] ? T.R : raza(T, p.sus - zlo)) * (1 + 1e-12) + p.celula;
    let r0 = Math.floor((ymin - re - p.y0) / dala), r1 = Math.floor((ymax + re - p.y0) / dala);
    if (r1 < 0 || r0 > nty - 1) continue;
    if (r0 < 0) r0 = 0;
    if (r1 > nty - 1) r1 = nty - 1;
    let a = r1 - r0 + 1 >= b.n;
    for (let r = r0; !a && r <= r1; r++) if (r % b.n === b.w) a = true;
    if (a) pastrate.push(q);
  }
  const out = new Float64Array(pastrate.length * STRIDE);
  pastrate.forEach((q, k) => out.set(mutari.subarray(q * STRIDE, (q + 1) * STRIDE), k * STRIDE));
  return out;
}

const f32 = new Float32Array(1), u32 = new Uint32Array(f32.buffer);
const bitiF32 = (v: number): number => { f32[0] = v; return u32[0]!; };
const f64 = new Float64Array(1), u64 = new Uint32Array(f64.buffer);

/** Amprenta unui rând de dale (h1, h2), sau `null` dacă rândul n-are nimic tăiat. */
function amprentaRand(F: Camp, r: number, biti: Uint32Array, bitiUniforme: Uint32Array): readonly [number, number] | null {
  let h1 = 0x811c9dc5 | 0, h2 = P1 ^ P2, are = false;
  for (let tx = 0; tx < F.ntx; tx++) {
    const d = r * F.ntx + tx, s = F.loc[d]!;
    if (s === NEATINSA) continue;
    are = true;
    h1 = Math.imul(h1 ^ tx, P1);
    h2 = Math.imul(h2 ^ tx, P2);
    if (s === UNIFORMA) {
      const w = bitiUniforme[d]!;
      for (let k = 0; k < CELULE_DALA; k++) { h1 = Math.imul(h1 ^ w, P1); h2 = Math.imul(h2 ^ ((w << 7) | (w >>> 25)), P2); }
    } else {
      const b = s * CELULE_DALA;
      for (let k = 0; k < CELULE_DALA; k++) { const w = biti[b + k]!; h1 = Math.imul(h1 ^ w, P1); h2 = Math.imul(h2 ^ ((w << 7) | (w >>> 25)), P2); }
    }
  }
  return are ? [h1 >>> 0, h2 >>> 0] : null;
}

/** Amprenta finală: grila, apoi rândurile cu ceva tăiat, în ordine. */
function amprentaDinRanduri(p: { readonly x0: number; readonly y0: number; readonly celula: number; readonly sus: number }, nx: number, ny: number,
  randuri: readonly (readonly [number, number, number])[]): string {
  let h1 = 0x811c9dc5 | 0, h2 = P1 ^ P2;
  const amesteca = (w: number): void => { h1 = Math.imul(h1 ^ w, P1); h2 = Math.imul(h2 ^ ((w << 7) | (w >>> 25)), P2); };
  amesteca(nx);
  amesteca(ny);
  for (const v of [p.x0, p.y0, p.celula]) { f64[0] = v; amesteca(u64[0]!); amesteca(u64[1]!); }
  amesteca(bitiF32(p.sus));
  for (const [r, a, b] of randuri) { amesteca(r); amesteca(a); amesteca(b); }
  return (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
}

function bitiCamp(F: Camp): { readonly biti: Uint32Array; readonly bitiUniforme: Uint32Array } {
  return { biti: new Uint32Array(F.atlas.buffer, F.atlas.byteOffset, F.locuri * CELULE_DALA), bitiUniforme: new Uint32Array(F.uniforma.buffer, F.uniforma.byteOffset, F.uniforma.length) };
}

/** Amprenta unui câmp întreg (sau a unei benzi singure), cu aceeași regulă ca unirea benzilor. */
export function amprentaCamp(F: Camp): string {
  const { biti, bitiUniforme } = bitiCamp(F);
  const randuri: Array<readonly [number, number, number]> = [];
  for (let r = 0; r < F.nty; r++) {
    const a = amprentaRand(F, r, biti, bitiUniforme);
    if (a) randuri.push([r, a[0], a[1]]);
  }
  return amprentaDinRanduri(F, F.nx, F.ny, randuri);
}

/** O bandă: simularea rândurilor ei, compactarea, rezumatul. */
export function calculeazaBanda(c: CerereBanda): RaspunsBanda {
  const t0 = performance.now();
  const F = campNou(c.camp, c.banda);
  ruleaza(F, c.scula, c.mutari);
  compacteaza(F);
  const { biti, bitiUniforme } = bitiCamp(F);
  const { latime: W, bloc } = c.previzualizare;
  const prev = new Float32Array(W * c.previzualizare.inaltime).fill(F.sus);
  const randuri: number[] = [], amprente: number[] = [], volume: number[] = [];
  let zMin = F.sus;
  const fund = c.fund;
  for (let r = 0; r < F.nty; r++) {
    if (F.banda.n > 1 && r % F.banda.n !== F.banda.w) continue;
    const a = amprentaRand(F, r, biti, bitiUniforme);
    if (!a) continue;
    let vol = 0;
    for (let tx = 0; tx < F.ntx; tx++) {
      const d = r * F.ntx + tx, s = F.loc[d]!;
      if (s === NEATINSA) continue;
      for (let k = 0; k < CELULE_DALA; k++) {
        const i = (tx << SH) | (k & (LATURA_DALA - 1)), j = (r << SH) | (k >> SH);
        if (i >= F.nx || j >= F.ny) continue;
        const v = s === UNIFORMA ? F.uniforma[d]! : F.atlas[s * CELULE_DALA + k]!;
        if (v < zMin) zMin = v;
        vol += F.sus - (v > fund ? v : fund);
        const px = Math.floor(i / bloc), py = Math.floor(j / bloc), kp = py * W + px;
        if (v < prev[kp]!) prev[kp] = v;
      }
    }
    randuri.push(r);
    amprente.push(a[0], a[1]);
    volume.push(vol * F.celula * F.celula);
  }
  const dale = numaraDale(F);
  return {
    banda: c.banda, randuri: Int32Array.from(randuri), amprente: Uint32Array.from(amprente), volume: Float64Array.from(volume),
    zMin, previzualizare: prev, atinse: dale.atinse, uniforme: dale.uniforme, ms: performance.now() - t0,
  };
}

/** Benzile unite, în ordinea rândurilor: același rezultat pentru orice împărțire. */
export function uneste(p: ParametriCamp, prev: Previzualizare, fund: number, benzi: readonly RaspunsBanda[]): RezumatSimulare {
  const { nx, ny } = dimensiuni(p.celula, p.latime, p.inaltime);
  const ntx = (nx + LATURA_DALA - 1) >> SH, nty = (ny + LATURA_DALA - 1) >> SH;
  const randuri: Array<readonly [number, number, number, number]> = [];
  let zMin = Math.fround(p.sus), atinse = 0, uniforme = 0;
  const z = new Float32Array(prev.latime * prev.inaltime).fill(Math.fround(p.sus));
  for (const b of benzi) {
    for (let k = 0; k < b.randuri.length; k++) randuri.push([b.randuri[k]!, b.amprente[2 * k]!, b.amprente[2 * k + 1]!, b.volume[k]!]);
    if (b.zMin < zMin) zMin = b.zMin;
    atinse += b.atinse;
    uniforme += b.uniforme;
    for (let k = 0; k < z.length; k++) if (b.previzualizare[k]! < z[k]!) z[k] = b.previzualizare[k]!;
  }
  randuri.sort((a, b) => a[0] - b[0]);
  for (let k = 1; k < randuri.length; k++) if (randuri[k]![0] === randuri[k - 1]![0]) throw new Error(`rândul de dale ${randuri[k]![0]} vine din două benzi`);
  let volum = 0;
  for (const r of randuri) volum += r[3];
  const sus = Math.fround(p.sus);
  return {
    amprenta: amprentaDinRanduri({ ...p, sus }, nx, ny, randuri.map(([r, a, b]) => [r, a, b] as const)),
    volum, zMin, adancimeMax: sus - zMin, prinFoaie: zMin <= Math.fround(fund), celula: p.celula, sus, fund,
    previzualizare: { ...prev, z }, dale: { total: ntx * nty, atinse, uniforme },
  };
}
