/**
 * Finisarea paralelă a reliefului (ADR 0310 §4–§6, ADR 0312; felia 18.1↑c-2): liniile la un unghi față de relief, cu punctele
 * la pasul celulei, fiecare cu cota din câmpul conservativ pe capsula segmentelor ei; treceri pe Z cu pasul, ultima pe model.
 *
 * - **Câmpul conservativ** (§4): maximul modelului exact pe celulă, din cele 9 puncte ale ei (centrul, mijloacele laturilor,
 *   colțurile), cu rândul de margine (valoarea celulei de margine până la marginea dreptunghiului). Cota unui segment al
 *   traseului e maximul, peste celulele din raza frezei, al câmpului minus urcarea frezei la distanța de la segment la celulă:
 *   o margine de sus a CL-ului exact în orice punct al segmentului. Vârful unui punct e maximul cotelor celor două segmente
 *   ale lui, deci traseul liniar dintre două puncte nu coboară sub CL-ul exact nicăieri (invarianta 4).
 * - **Marginea** (§4): „peretele rămâne” (implicit): dincolo de dreptunghi, modelul e fața plăcii; „freza trece”: dincolo nu e
 *   nimic, liniile ies cu raza frezei. Mai multe reliefuri pe aceeași finisare se combină prin „păstrează înalt” (ADR 0310 §1):
 *   fiecare își are liniile, iar cota fiecărui punct ține și de celelalte (doar înăuntrul lor).
 * - **Treceri pe Z** (§6, „niciodată mai adânc decât pasul pe trecere”): trecerea k lucrează doar unde CL-ul e sub fundul
 *   trecerii de dinainte (−(k − 1) · pas), plus un punct de fiecare parte, la max(CL, −k · pas); ultima e pe model. Zonele
 *   trecerilor sunt una în alta, deci sub fiecare linie lemnul a fost scos până la fundul de dinainte.
 * - **Alinierea** (§5): la 0° și 90°, liniile trec prin centrele celulelor, iar pasul lateral e un număr întreg de celule.
 *
 * - **Degroșarea** (ADR 0313, felia 18.1↑d-1): același drum, cu freza plată de rază R, cu cota din câmpul dilatat cu
 *   discul de rază R + a, plus a (adaosul a, lăsat finisării în orice direcție), pe trepte Z cu pasul: treapta k lucrează
 *   unde cota e sub fundul treptei de dinainte, la max(cota, −k · pas); ultima stă pe suprafața adaosului.
 *
 * Doar + − × ÷ √ min max, afară de direcția liniilor la un unghi oarecare (`Math.cos`, `Math.sin`, o dată pe operație; 0° și
 * 90° sunt exacte), ca strategia paralelă a buzunarului: CAM-ul nu importă din simulare. Totul în lume (mm, Z față de fața
 * plăcii), fără stare.
 */
import { celuleAliniate } from './celuleAliniate.ts';
import type { Miscare } from '../ir/ir.ts';

/**
 * Forma frezei, cu raza ei: plata, bila, V-ul (unghiul inclus, în grade, și vârful plat, diametrul lui), toroidala (raza
 * colțului `colt`, 0 < colt < raza; felia 18.1↑e-1, ADR 0319).
 */
export type FrezaFinisare =
  | { readonly fel: 'plata'; readonly raza: number }
  | { readonly fel: 'bila'; readonly raza: number }
  | { readonly fel: 'v'; readonly raza: number; readonly unghi: number; readonly varf: number }
  | { readonly fel: 'toroidala'; readonly raza: number; readonly colt: number };

/**
 * Un relief, cum îl vede finisarea: grila (rândul j în sus), celula în mm de lume (scalarea uniformă a matricei o schimbă),
 * cotele centrelor în lume (Z față de fața plăcii, deci cu planul zero aplicat) și transformarea rigidă din sistemul lui
 * (originea în colțul stânga-jos, mm de lume) în lume: x' = a·x + c·y + e, y' = b·x + d·y + f, cu (a, b, c, d) ortonormată.
 */
export type ReliefCam = {
  readonly nx: number; readonly ny: number; readonly celula: number;
  /** Cotele, rând cu rând; cu `zRand0`, doar rândurile de la el încolo (o bandă trimisă unui worker, felia 18.1↑h-7). */
  readonly z: ArrayLike<number>;
  readonly zRand0?: number;
  readonly m: { readonly a: number; readonly b: number; readonly c: number; readonly d: number; readonly e: number; readonly f: number };
};

export type ParametriFinisare = {
  /** Reliefurile operației; liniile se fac pe fiecare, cotele țin de toate. */
  readonly reliefuri: readonly ReliefCam[];
  readonly freza: FrezaFinisare;
  readonly unghi: number;
  readonly nealiniat: boolean;
  readonly margine: 'perete' | 'trece';
  readonly pasLateral: number;
  /** Pasul pe trecere (mm). */
  readonly pas: number;
  /** Podeaua (mm sub fața plăcii, pozitivă): vârful nu coboară sub −adancime. */
  readonly adancime: number;
  readonly zSigur: number;
  readonly avans: number;
  readonly avansPlonjare: number;
  /**
   * Cotele tuturor liniilor, în ordinea planului, făcute dinainte (de bazinul cotelor, pe loturi, felia 18.1↑h-8): cu ele,
   * liniile nu se mai socotesc aici. Altele decât ale planului (alt număr de linii sau de puncte), se socotesc din nou.
   */
  readonly cote?: readonly Float64Array[];
};

export type RezultatFinisare =
  | {
    readonly ok: true; readonly miscari: Miscare[]; readonly treceri: number; readonly linii: number;
    /** Pasul lateral folosit (rotunjit la celule întregi, aliniat), pe relieful întâi. */
    readonly pasLateral: number; readonly avertismente: string[];
  }
  | { readonly ok: false; readonly motiv: string };

/**
 * Degroșarea reliefului (ADR 0313): freza plată de rază `raza`, cu adaosul `adaos` lăsat finisării; restul, ca la finisare
 * (liniile aliniate la 0° și 90°, marginea, pasul pe trecere, podeaua).
 */
export type ParametriDegrosare = {
  readonly reliefuri: readonly ReliefCam[];
  readonly raza: number;
  /** Adaosul (mm): cât lemn rămâne deasupra modelului, în orice direcție, pentru finisare. */
  readonly adaos: number;
  readonly unghi: number;
  readonly margine: 'perete' | 'trece';
  readonly pasLateral: number;
  readonly pas: number;
  readonly adancime: number;
  readonly zSigur: number;
  readonly avans: number;
  readonly avansPlonjare: number;
  /** Ca la finisare (`ParametriFinisare.cote`). */
  readonly cote?: readonly Float64Array[];
};

/** Cel mai mare adaos al unei degroșări (mm), ca în ușa documentului (ADR 0313). */
export const ADAOS_MAXIM = 10;

/** Cele mai multe puncte (linii × puncte × treceri) ale unei finisări; peste, refuzul (felia 18.1↑h măsoară 4000²). */
export const PUNCTE_FINISARE_MAXIM = 20_000_000;

/** Cât urcă suprafața frezei deasupra vârfului la raza r (r ≤ R). */
export function urcare(f: FrezaFinisare, r: number): number {
  if (f.fel === 'plata') return 0;
  if (f.fel === 'bila') return f.raza - Math.sqrt(Math.max(0, f.raza * f.raza - r * r));
  // Toroidala (ADR 0303 §2): zero pe discul plat de rază a = R − ρ, apoi sfertul de cerc de rază ρ.
  if (f.fel === 'toroidala') {
    const a = f.raza - f.colt, w = r - a;
    return w <= 0 ? 0 : f.colt - Math.sqrt(Math.max(0, f.colt * f.colt - w * w));
  }
  const v = f.varf / 2;
  return r <= v ? 0 : (r - v) * cotJumatate(f.unghi);
}

const cache = new Map<number, number>();
/** cot(unghi / 2), cu unghiul inclus în grade (o dată pe unghi). */
function cotJumatate(unghi: number): number {
  let x = cache.get(unghi);
  if (x === undefined) { x = 1 / Math.tan((unghi * Math.PI) / 360); cache.set(unghi, x); }
  return x;
}

/**
 * Celula de calcul cea mai mare (mm): o celulă a reliefului mai mare se împarte (ADR 0310 §4: ½, ¼, …). Surplusul câmpului
 * conservativ e ≈ (1,5–2) · celula · tan(pantă) (s5 §2, §4.1), iar s5 alege celula din toleranța lui (0,05 mm la finisare);
 * aici 1/16 mm, o fracție binară exactă, deci o celulă de 0,5 mm se împarte în 8, iar una de 0,1 mm în 2.
 */
export const CELULA_CALCUL = 0.0625;
/** Cea mai mare diviziune a celulei reliefului. */
export const DIVIZIUNE_MAXIMA = 16;

/** În câte se împarte latura unei celule a reliefului pentru calcul: cea mai mică putere a lui 2 care o aduce sub `CELULA_CALCUL`. */
export function diviziune(celula: number): number {
  let q = 1;
  while (q < DIVIZIUNE_MAXIMA && celula / q > CELULA_CALCUL + 1e-12) q *= 2;
  return q;
}

const F32 = new Float32Array(1), U32 = new Uint32Array(F32.buffer);
/** Cel mai mic Float32 ≥ x (câmpul conservativ e o margine de sus: se rotunjește în sus, ADR 0310 §4). */
export function float32Sus(x: number): number {
  F32[0] = x;
  const f = F32[0]!;
  if (f >= x || !Number.isFinite(f)) return f;
  // f < x: următorul Float32 spre +∞.
  if (f === 0) { U32[0] = 1; return F32[0]!; }
  U32[0] = f > 0 ? U32[0]! + 1 : U32[0]! - 1;
  return F32[0]!;
}

/**
 * Piramida maximelor câmpului: nivelul 0 e câmpul (`mx` × `my`), fiecare nivel următor ia maximul a 2 × 2 de pe cel dinainte.
 * Cota unui segment se caută de sus în jos: un bloc al cărui maxim, minus urcarea la distanța de la segment la el, nu trece de
 * cea găsită, nu se mai desface (aceeași valoare ca parcurgerea tuturor celulelor, cu mult mai puține).
 */
export type Piramida = { readonly niv: ReadonlyArray<{ readonly v: Float32Array; readonly w: number; readonly hh: number }> };

function piramida(F: Float32Array, mx: number, my: number): Piramida {
  const niv: Array<{ v: Float32Array; w: number; hh: number }> = [{ v: F, w: mx, hh: my }];
  let w = mx, hh = my, v = F;
  while (w > 1 || hh > 1) {
    const w2 = Math.ceil(w / 2), h2 = Math.ceil(hh / 2), u = new Float32Array(w2 * h2).fill(-Infinity);
    for (let j = 0; j < hh; j++) {
      for (let i = 0; i < w; i++) {
        const k = (j >> 1) * w2 + (i >> 1), x = v[j * w + i]!;
        if (x > u[k]!) u[k] = x;
      }
    }
    niv.push({ v: u, w: w2, hh: h2 });
    w = w2; hh = h2; v = u;
  }
  return { niv };
}

/** Cota modelului exact (ADR 0310 §4) în (x, y), în sistemul reliefului: triunghiurile prin centre, cu rândul de margine. */
export function cotaModel(z: ArrayLike<number>, nx: number, ny: number, c: number, x: number, y: number, zj0 = 0): number {
  // Cu `zj0`, `z` ține rândurile de la el încolo (o bandă): rândul global, minus începutul ei.
  const v = (i: number, j: number): number => z[(Math.min(ny - 1, Math.max(0, j)) - zj0) * nx + Math.min(nx - 1, Math.max(0, i))]!;
  const fx = x / c - 0.5, fy = y / c - 0.5, k = Math.floor(fx), l = Math.floor(fy), u = fx - k, w = fy - l;
  const A = v(k, l), B = v(k + 1, l), C = v(k, l + 1), D = v(k + 1, l + 1);
  // Diagonala fixă, de la (k + 1, l) la (k, l + 1).
  return u + w <= 1 ? A + u * (B - A) + w * (C - A) : D + (1 - u) * (C - D) + (1 - w) * (B - D);
}

/**
 * Câmpul conservativ pe celula de calcul (ADR 0310 §4), cu latura c / q. Pe o diviziune pară (q = 2, 4, 8), liniile prin
 * centre și diagonalele pătratelor dintre ele cad pe laturile și diagonalele celulelor mici, deci modelul e liniar pe două
 * triunghiuri cu vârfurile în colțurile celulei: maximul e în cele 4 colțuri. Cu q = 1, maximul e într-unul din cele 9 puncte
 * (`campConservativ`).
 */
export function campPeCelula(z: ArrayLike<number>, nx: number, ny: number, c: number, q: number, j0 = 0, j1 = ny * q, zj0 = 0): Float32Array {
  if (q === 1) return Float32Array.from(campConservativ(z, nx, ny, j0, j1, zj0), float32Sus);
  // Doar rândurile [j0, j1) (o bandă, ADR 0323 2a), cu nodurile pe două rânduri (nu tot tabloul, de (mx + 1)(my + 1)): un nod e
  // cota modelului în colțul lui, deci aceeași pe bandă ca pe tot relieful.
  const mx = nx * q, h = c / q, F = new Float32Array(mx * (j1 - j0));
  let jos = new Float64Array(mx + 1), sus = new Float64Array(mx + 1);
  for (let i = 0; i <= mx; i++) jos[i] = cotaModel(z, nx, ny, c, i * h, j0 * h, zj0);
  for (let j = j0; j < j1; j++) {
    for (let i = 0; i <= mx; i++) sus[i] = cotaModel(z, nx, ny, c, i * h, (j + 1) * h, zj0);
    for (let i = 0; i < mx; i++) F[(j - j0) * mx + i] = float32Sus(Math.max(jos[i]!, jos[i + 1]!, sus[i]!, sus[i + 1]!));
    const t = jos; jos = sus; sus = t;
  }
  return F;
}

/**
 * Câmpul conservativ (ADR 0310 §4): pe fiecare celulă, maximul modelului exact peste cele 9 puncte ale ei. Centrul e valoarea
 * celulei; mijlocul unei laturi, media cu vecina (pe margine, vecina e ea însăși); un colț e mijlocul diagonalei fixe a
 * pătratului dintre centre, de la (k + 1, l) la (k, l + 1).
 */
export function campConservativ(z: ArrayLike<number>, nx: number, ny: number, j0 = 0, j1 = ny, zj0 = 0): Float64Array {
  const F = new Float64Array(nx * (j1 - j0));
  const v = (i: number, j: number): number => z[(Math.min(ny - 1, Math.max(0, j)) - zj0) * nx + Math.min(nx - 1, Math.max(0, i))]!;
  for (let j = j0; j < j1; j++) {
    for (let i = 0; i < nx; i++) {
      const c = v(i, j);
      let m = c;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) m = Math.max(m, (c + v(i + di, j + dj)) / 2);
      // Colțurile: pătratul dintre centrele (k, l)…(k + 1, l + 1) are colțul celulei în mijloc, pe diagonala (k + 1, l)–(k, l + 1).
      for (const [k, l] of [[i - 1, j - 1], [i, j - 1], [i - 1, j], [i, j]] as const) m = Math.max(m, (v(k + 1, l) + v(k, l + 1)) / 2);
      F[(j - j0) * nx + i] = m;
    }
  }
  return F;
}

/** Distanța de la punctul (x, y) la segmentul (ax, ay)–(bx, by). */
function distPunctSegment(x: number, y: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
  let u = L2 > 0 ? ((x - ax) * dx + (y - ay) * dy) / L2 : 0;
  u = Math.min(1, Math.max(0, u));
  return Math.hypot(x - (ax + u * dx), y - (ay + u * dy));
}

/** Distanța de la segment la dreptunghiul [x0, x1] × [y0, y1] (0 dacă se ating). */
export function distSegmentCutie(ax: number, ay: number, bx: number, by: number, x0: number, y0: number, x1: number, y1: number): number {
  // Liang–Barsky: segmentul intră în dreptunghi? (Fără închideri: se cheamă de milioane de ori.)
  const dx = bx - ax, dy = by - ay;
  let t0 = 0, t1 = 1, intra = true;
  if (dx === 0) { if (ax < x0 || ax > x1) intra = false; } else {
    let ra = (x0 - ax) / dx, rb = (x1 - ax) / dx;
    if (ra > rb) { const t = ra; ra = rb; rb = t; }
    if (ra > t0) t0 = ra;
    if (rb < t1) t1 = rb;
  }
  if (intra) {
    if (dy === 0) { if (ay < y0 || ay > y1) intra = false; } else {
      let ra = (y0 - ay) / dy, rb = (y1 - ay) / dy;
      if (ra > rb) { const t = ra; ra = rb; rb = t; }
      if (ra > t0) t0 = ra;
      if (rb < t1) t1 = rb;
    }
  }
  if (intra && t0 <= t1) return 0;
  // Afară: cel mai apropiat e un capăt față de dreptunghi, sau un colț față de segment.
  const ea = Math.hypot(Math.max(x0 - ax, 0, ax - x1), Math.max(y0 - ay, 0, ay - y1));
  const eb = Math.hypot(Math.max(x0 - bx, 0, bx - x1), Math.max(y0 - by, 0, by - y1));
  let d = ea < eb ? ea : eb;
  const L2 = dx * dx + dy * dy;
  if (L2 > 0) {
    for (let k = 0; k < 4; k++) {
      const x = k & 1 ? x1 : x0, y = k & 2 ? y1 : y0;
      let u = ((x - ax) * dx + (y - ay) * dy) / L2;
      u = u < 0 ? 0 : u > 1 ? 1 : u;
      const e = Math.hypot(x - (ax + u * dx), y - (ay + u * dy));
      if (e < d) d = e;
    }
  }
  return d;
}

/** Un relief pregătit: câmpul conservativ pe celula de calcul (latura `h`, `mx` × `my`) și dreptunghiul lui. */
export type Pregatit = {
  readonly r: ReliefCam; readonly P: Piramida; readonly h: number; readonly mx: number; readonly my: number; readonly W: number; readonly H: number;
  /** Banda de rânduri de calcul pe care e câmpul: [j0, j1) (tot relieful: [0, my)); piramida e doar peste ea. */
  readonly j0: number; readonly j1: number;
  /** Celula maximului găsit la segmentul dinainte (indicele pe nivelul 0), sau −1: un candidat sigur pentru pornirea următorului. */
  ultima: number;
};

/** Exportată pentru proba cotei (`reliefFinisare.cota.test.ts`), ca și `cotaSegment`. */
export function pregateste(r: ReliefCam, banda?: { readonly j0: number; readonly j1: number }): Pregatit {
  const q = diviziune(r.celula), mx = r.nx * q, my = r.ny * q, j0 = banda?.j0 ?? 0, j1 = banda?.j1 ?? my;
  return {
    r, P: piramida(campPeCelula(r.z, r.nx, r.ny, r.celula, q, j0, j1, r.zRand0 ?? 0), mx, j1 - j0), h: r.celula / q, mx, my,
    W: r.nx * r.celula, H: r.ny * r.celula, j0, j1, ultima: -1,
  };
}

const copiiF = new Float64Array(4), copiiI = new Int32Array(4), copiiJ = new Int32Array(4);

/** Din lume în sistemul reliefului (inversa unei transformări rigide: transpusa). */
function inRelief(p: Pregatit, x: number, y: number): readonly [number, number] {
  const { a, b, c, d, e, f } = p.r.m, X = x - e, Y = y - f;
  return [a * X + b * Y, c * X + d * Y];
}

/**
 * Cota conservativă a segmentului (în sistemul reliefului `p`): maximul, peste celulele lui din raza frezei, al câmpului minus
 * urcarea la distanța segment–celulă; cu `perete`, și fața plăcii din afara dreptunghiului. −Infinity dacă nu atinge nimic.
 */
export function cotaSegment(p: Pregatit, f: FrezaFinisare, ax: number, ay: number, bx: number, by: number, perete: boolean): number {
  const R = f.raza, h = p.h, niv = p.P.niv;
  let m = -Infinity;
  // Pornirea: celulele de sub capete (la distanța 0, urcarea 0) sunt deja o margine de jos a maximului; așa piramida taie din prima.
  const F0 = niv[0]!;
  let arg = -1;
  for (const [x, y] of [[ax, ay], [bx, by]] as const) {
    // Pe bandă, rândul local e cel global minus începutul benzii (cel de pe tot relieful, cu j0 = 0).
    const i = Math.floor(x / h), j = Math.floor(y / h) - p.j0;
    if (i >= 0 && j >= 0 && i < p.mx && j < p.j1 - p.j0 && F0.v[j * F0.w + i]! - urcare(f, 0) > m) { m = F0.v[j * F0.w + i]! - urcare(f, 0); arg = j * F0.w + i; }
  }
  // Și celula maximului de la segmentul dinainte (vecinul): de obicei aproape de maximul acestuia.
  if (p.ultima >= 0) {
    const i = p.ultima % F0.w, j = (p.ultima - i) / F0.w + p.j0;
    const d = distSegmentCutie(ax, ay, bx, by, i * h, j * h, (i + 1) * h, (j + 1) * h);
    if (d <= R) { const v = F0.v[p.ultima]! - urcare(f, d); if (v > m) { m = v; arg = p.ultima; } }
  }
  // Blocurile, de sus în jos: (nivel, i, j, marginea de sus a valorii lui). Un bloc acoperă celulele [i·2^l, (i + 1)·2^l) ×
  // [j·2^l, (j + 1)·2^l), tăiate la grilă. Tăierea folosește o margine de jos a distanței, ieftină (felia 18.1↑h-4): de la
  // mijlocul segmentului la cutie, minus jumătatea lungimii lui (orice punct al segmentului e la cel mult atât de mijloc), minus
  // o rezervă de 1e-9 mm pentru rotunjiri. Distanța exactă se socotește doar pe frunze, unde dă valoarea; un bloc tăiat are
  // toate frunzele cel mult cât marginea, deci maximul e același cu al parcurgerii tuturor celulelor (proba:
  // `reliefFinisare.cota.test.ts`). Copiii stau în cutia părintelui, deci marginea lui le e și lor margine.
  const mx = (ax + bx) / 2, my = (ay + by) / 2, lh = Math.hypot(bx - ax, by - ay) / 2;
  const stiva: number[] = [niv.length - 1, 0, 0, Infinity];
  while (stiva.length > 0) {
    const sus = stiva.pop()!, j = stiva.pop()!, i = stiva.pop()!, l = stiva.pop()!;
    if (sus <= m) continue;
    const N = niv[l]!, F = N.v[j * N.w + i]!;
    if (F <= m) continue;
    // Cutia în coordonatele reliefului: rândul global e începutul benzii plus cel local (întregi, apoi înmulțite: pe frunze, la
    // fel cu cel de pe tot relieful, bit cu bit). Marginea de jos e cea a reliefului, nu a benzii.
    const s = h * (1 << l), k = 1 << l;
    const x0 = i * s, y0 = (p.j0 + j * k) * h, x1 = Math.min((i + 1) * s, p.mx * h), y1 = Math.min((p.j0 + (j + 1) * k) * h, p.my * h);
    const ex = mx < x0 ? x0 - mx : mx > x1 ? mx - x1 : 0, ey = my < y0 ? y0 - my : my > y1 ? my - y1 : 0;
    const jos = Math.sqrt(ex * ex + ey * ey) - lh - 1e-9;
    const uj = urcare(f, jos > 0 ? jos : 0);
    if (jos > R || F - uj <= m) continue;
    if (l === 0) {
      // Frunza: valoarea, cu distanța exactă.
      const d = distSegmentCutie(ax, ay, bx, by, x0, y0, x1, y1);
      if (d > R) continue;
      const v = F - urcare(f, d);
      if (v > m) { m = v; arg = j * N.w + i; }
      continue;
    }
    const u = uj;
    // Copiii, puși pe stivă crescător după maxim: cel mai mare se desface primul, ca marginea găsită să taie restul.
    const sub = niv[l - 1]!, i2 = 2 * i, j2 = 2 * j;
    let n = 0;
    for (let k = 0; k < 4; k++) {
      const ci = i2 + (k & 1), cj = j2 + (k >> 1);
      if (ci >= sub.w || cj >= sub.hh) continue;
      const fv = sub.v[cj * sub.w + ci]!;
      if (fv - u <= m) continue;
      let q = n++;
      while (q > 0 && copiiF[q - 1]! > fv) { copiiF[q] = copiiF[q - 1]!; copiiI[q] = copiiI[q - 1]!; copiiJ[q] = copiiJ[q - 1]!; q--; }
      copiiF[q] = fv; copiiI[q] = ci; copiiJ[q] = cj;
    }
    for (let q = 0; q < n; q++) stiva.push(l - 1, copiiI[q]!, copiiJ[q]!, copiiF[q]! - u);
  }
  p.ultima = arg;
  if (perete) {
    // Distanța de la segment la afara dreptunghiului: pe un convex, cea mai mică e la un capăt (0 dacă un capăt e afară).
    const dOut = (x: number, y: number): number => Math.max(0, Math.min(x, p.W - x, y, p.H - y));
    const d = Math.min(dOut(ax, ay), dOut(bx, by));
    if (d < R) m = Math.max(m, -urcare(f, d));
  }
  return m;
}

/** O linie a finisării: punctele ei, în sistemul reliefului (x, y alternate). */
type Linie = number[];

/**
 * Liniile pe relieful `p`, cu pasul lateral folosit: aliniate, prin centrele celulelor reliefului, cu pasul un număr întreg de
 * celule, rotunjit în jos (felia 18.1↑d-3: liniile nu stau mai rar decât cere omul, deci nici creasta nu iese mai mare; sub o
 * celulă, o celulă); punctele pe linie la pasul celulei de calcul.
 */
function linii(p: Geometrie, o: ParametriFinisare, inset = 0): { readonly linii: Linie[]; readonly pas: number; readonly aliniat: boolean } {
  const c = p.r.celula, h = p.h, E = o.margine === 'trece' ? o.freza.raza : 0;
  const aliniat = !o.nealiniat && (o.unghi === 0 || o.unghi === 90);
  const rez: Linie[] = [];
  if (aliniat) {
    const k = celuleAliniate(o.pasLateral, c), s = k * c;
    // Centrele pe o axă, de la cel mai mic ≥ −E + I la cel mai mare ≤ L + E − I (pasul `d`, decalate cu `d / 2`). Cu I > 0 și
    // nimic între margini (o zonă mai îngustă decât 2 · I), centrul cel mai apropiat de mijloc.
    const centre = (L: number, d: number, I = 0): number[] => {
      const a = Math.ceil((I - E) / d - 0.5), b = Math.floor((L + E - I) / d - 0.5), out: number[] = [];
      for (let i = a; i <= b; i++) out.push((i + 0.5) * d);
      if (out.length === 0 && I > 0) out.push((Math.max(0, Math.min(Math.ceil(L / d) - 1, Math.floor(L / 2 / d))) + 0.5) * d);
      return out;
    };
    // Lateral, prin centrele celulelor reliefului (la degroșare cu peretele păstrat, doar pe zona în care freza are voie: la
    // R + a de margini; altfel prima linie nu taie nimic, iar a doua lasă lângă perete o fâșie peste adaos); de-a lungul, la
    // pasul celulei de calcul.
    const lung = o.unghi === 0 ? centre(p.W, h) : centre(p.H, h), lat = o.unghi === 0 ? centre(p.H, c, inset) : centre(p.W, c, inset);
    const alese: number[] = [];
    for (let q = 0; q < lat.length; q += k) alese.push(lat[q]!);
    if (lat.length > 0 && alese[alese.length - 1] !== lat[lat.length - 1]) alese.push(lat[lat.length - 1]!);
    for (const v of alese) {
      const l: Linie = [];
      for (const u of lung) { if (o.unghi === 0) l.push(u, v); else l.push(v, u); }
      rez.push(l);
    }
    return { linii: rez, pas: s, aliniat };
  }
  const t = (o.unghi * Math.PI) / 180, ux = o.unghi === 90 ? 0 : Math.cos(t), uy = o.unghi === 0 ? 0 : o.unghi === 90 ? 1 : Math.sin(t);
  const vx = -uy, vy = ux;
  // La degroșare cu peretele păstrat, liniile acoperă zona în care freza are voie (la `inset` = R + a de margini).
  const ix = Math.min(inset, p.W / 2), iy = Math.min(inset, p.H / 2);
  const x0 = -E + ix, y0 = -E + iy, x1 = p.W + E - ix, y1 = p.H + E - iy;
  const colturi = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]] as const;
  let bmin = Infinity, bmax = -Infinity;
  for (const [x, y] of colturi) { const b = x * vx + y * vy; bmin = Math.min(bmin, b); bmax = Math.max(bmax, b); }
  const n = Math.max(1, Math.ceil((bmax - bmin) / o.pasLateral - 1e-9)), s = (bmax - bmin) / n;
  for (let k = 0; k < n; k++) {
    const b = bmin + (k + 0.5) * s, px = b * vx, py = b * vy;
    // Intervalul a pe care linia p + a·u stă în dreptunghi.
    let amin = -Infinity, amax = Infinity;
    for (const [p0, d, lo, hi] of [[px, ux, x0, x1], [py, uy, y0, y1]] as const) {
      if (d === 0) { if (p0 < lo || p0 > hi) { amin = 1; amax = 0; } continue; }
      const ta = (lo - p0) / d, tb = (hi - p0) / d;
      amin = Math.max(amin, Math.min(ta, tb)); amax = Math.min(amax, Math.max(ta, tb));
    }
    if (!(amax > amin)) continue;
    const m = Math.max(1, Math.ceil((amax - amin) / h - 1e-9)), da = (amax - amin) / m;
    const l: Linie = [];
    for (let i = 0; i <= m; i++) { const a = amin + i * da; l.push(px + a * ux, py + a * uy); }
    rez.push(l);
  }
  return { linii: rez, pas: s, aliniat };
}

const EPS = 1e-9;

/** Finisarea paralelă a reliefurilor unei operații (vezi capul fișierului). Mișcările sunt în lume. */
export function finisareRelief(o: ParametriFinisare): RezultatFinisare {
  return treceriRelief(o, { cota: o.freza, ridicare: 0, degrosare: false });
}

/**
 * Degroșarea reliefurilor unei operații (ADR 0313): drumul finisării, cu freza plată de rază R, cota din freza plată de rază
 * R + a, ridicată cu a. Lemnul rămas deasupra modelului e cel puțin a pe orice direcție (pe un plan de pantă g, a · (1 + g)
 * pe verticală). Mișcările sunt în lume.
 */
export function degrosareRelief(o: ParametriDegrosare): RezultatFinisare {
  if (!(o.adaos >= 0 && o.adaos <= ADAOS_MAXIM)) return { ok: false, motiv: `adaosul, ${o.adaos} mm, trebuie să fie în [0, ${ADAOS_MAXIM}] mm` };
  const freza: FrezaFinisare = { fel: 'plata', raza: o.raza };
  return treceriRelief(
    { ...o, freza, nealiniat: false },
    { cota: { fel: 'plata', raza: o.raza + o.adaos }, ridicare: o.adaos, degrosare: true },
  );
}

/**
 * Cum se socotește cota unui segment: freza cotei (cea a operației la finisare; la degroșare, plata de rază R + a), ridicarea
 * adăugată peste cotă și podea (adaosul), și felul (pentru mesaje).
 */
type Socotire = { readonly cota: FrezaFinisare; readonly ridicare: number; readonly degrosare: boolean };

/** Ce ține de geometria unui relief, fără câmp: destul pentru linii și pentru benzi (felia 18.1↑h-6). */
type Geometrie = Pick<Pregatit, 'r' | 'h' | 'mx' | 'my' | 'W' | 'H'>;

function geometrie(r: ReliefCam): Geometrie {
  const q = diviziune(r.celula);
  return { r, h: r.celula / q, mx: r.nx * q, my: r.ny * q, W: r.nx * r.celula, H: r.ny * r.celula };
}

/** O linie a traseului, în lume, cu vârful fiecărui punct. */
export type LinieZ = { readonly ip: number; readonly x: Float64Array; readonly y: Float64Array; readonly z: Float64Array };

/** Cota unui segment în lume (vezi `cotaPe`). */
type Cota = (ip: number, ax: number, ay: number, bx: number, by: number) => number;

/**
 * Planul unei finisări sau degroșări (felia 18.1↑h-6): verificările, liniile fiecărui relief, avertismentele și numărul
 * punctelor, fără câmpul întreg. Cotele vin pe loturi de linii (`coteLot`), apoi mișcările (`miscariTreceri`).
 */
export type PlanTreceri = {
  readonly o: ParametriFinisare; readonly so: Socotire; readonly nume: string;
  readonly geom: readonly Geometrie[];
  readonly liniiPe: readonly { readonly ip: number; readonly linii: readonly Linie[] }[];
  readonly puncte: number; readonly pasFolosit: number; readonly avertismente: string[];
};

/**
 * Cota unui segment în lume, peste reliefurile pregătite: al lui `ip` cu marginea lui, celelalte doar înăuntru; podeaua e un
 * plan al modelului. La degroșare, ridicată cu adaosul.
 */
function cotaPe(pregatite: readonly Pregatit[], o: Pick<ParametriFinisare, 'adancime' | 'margine'>, so: Pick<Socotire, 'cota' | 'ridicare'>): Cota {
  const podea = -o.adancime;
  return (ip, ax, ay, bx, by) => {
    let m = podea;
    pregatite.forEach((p, k) => {
      const [x0, y0] = inRelief(p, ax, ay), [x1, y1] = inRelief(p, bx, by);
      m = Math.max(m, cotaSegment(p, so.cota, x0, y0, x1, y1, k === ip && o.margine === 'perete'));
    });
    return m + so.ridicare;
  };
}

/** Linia `k` a reliefului `g`, în lume, în ordinea parcurgerii (zigzag: liniile impare, invers). */
function inLume(g: Geometrie, k: number, pts: Linie): { readonly x: Float64Array; readonly y: Float64Array } {
  const n = pts.length / 2, x = new Float64Array(n), y = new Float64Array(n);
  const { a, b, c, d, e, f } = g.r.m;
  for (let i = 0; i < n; i++) {
    const q = k % 2 === 0 ? i : n - 1 - i, lx = pts[2 * q]!, ly = pts[2 * q + 1]!;
    x[i] = a * lx + c * ly + e; y[i] = b * lx + d * ly + f;
  }
  return { x, y };
}

/**
 * Reliefurile pregătite doar pe benzile de care au nevoie punctele date, în lume (felia 18.1↑h-6): pe fiecare relief, rândurile
 * de calcul din raza frezei de ele, plus unul de fiecare parte (ADR 0323, 2a). Cotele segmentelor dintre ele ies ca pe tot
 * relieful, bit cu bit (`reliefFinisare.banda.test.ts`).
 */
function pregatiteInJur(geom: readonly Geometrie[], R: number, puncte: readonly { readonly x: ArrayLike<number>; readonly y: ArrayLike<number> }[]): Pregatit[] {
  return benziInJur(geom, R, puncte).map((b, k) => pregateste(geom[k]!.r, b));
}

/** Benzile (rândurile de calcul) de care au nevoie punctele date, pe fiecare relief (vezi `pregatiteInJur`). */
function benziInJur(geom: readonly Geometrie[], R: number, puncte: readonly { readonly x: ArrayLike<number>; readonly y: ArrayLike<number> }[]): { j0: number; j1: number }[] {
  return geom.map((g) => {
    const { c, d, e, f } = g.r.m;
    let lo = Infinity, hi = -Infinity;
    for (const { x, y } of puncte) {
      for (let i = 0; i < x.length; i++) {
        // Ca `inRelief`: inversa unei transformări rigide (rândul: c · X + d · Y).
        const v = c * (x[i]! - e) + d * (y[i]! - f);
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
    }
    let j0 = Math.max(0, Math.floor((lo - R) / g.h) - 1), j1 = Math.min(g.my, Math.ceil((hi + R) / g.h) + 1);
    // Departe de relief, o bandă de un rând (nicio celulă în rază: rămâne doar peretele, socotit din dreptunghi).
    if (!(j1 > j0)) { j0 = Math.min(Math.max(0, j0), g.my - 1); j1 = j0 + 1; }
    return { j0, j1 };
  });
}

/** Planul (vezi `PlanTreceri`), sau refuzul. */
function planTreceri(o: ParametriFinisare, so: Socotire): { readonly ok: false; readonly motiv: string } | { readonly ok: true; readonly plan: PlanTreceri } {
  const nume = so.degrosare ? 'degroșarea' : 'finisarea';
  const R = o.freza.raza;
  if (!(R > 0)) return { ok: false, motiv: 'freza n-are rază' };
  if (!(o.pasLateral > 0 && o.pasLateral <= 2 * R)) {
    return { ok: false, motiv: `pasul lateral de ${o.pasLateral} mm trebuie să fie în (0, ${2 * R}] (diametrul frezei): altfel rămân dungi între linii` };
  }
  if (!(o.pas > 0)) return { ok: false, motiv: 'pasul pe trecere trebuie să fie pozitiv' };
  if (!(o.unghi >= 0 && o.unghi < 180)) return { ok: false, motiv: `unghiul liniilor, ${o.unghi}°, trebuie să fie în [0°, 180°)` };
  if (o.reliefuri.length === 0) return { ok: false, motiv: `${nume} n-are niciun relief` };
  const geom = o.reliefuri.map(geometrie);
  const avertismente: string[] = [];
  // Degroșarea lucrează doar sub față (de la −pas în jos): partea de deasupra o spune finisarea.
  if (!so.degrosare && geom.some((p) => { for (let k = 0; k < p.r.z.length; k++) if (p.r.z[k]! > EPS) return true; return false; })) {
    avertismente.push('o parte din relief iese deasupra feței plăcii: acolo se taie la față');
  }
  let pasFolosit = o.pasLateral, puncte = 0;
  // Liniile fiecărui relief, cu verificările lor și numărul punctelor, înaintea oricărei cote (felia 18.1↑h-3): un refuz al
  // punctelor vine fără calcul (la 4000², cotele singure iau minute).
  const liniiPe: { readonly ip: number; readonly linii: readonly Linie[] }[] = [];
  for (const [ip, p] of geom.entries()) {
    const l = linii(p, o, so.degrosare && o.margine !== 'trece' ? so.cota.raza : 0);
    // Aliniate, liniile trec prin centrele celulelor: o celulă mai lată decât freza lasă dungi netăiate între ele.
    if (l.aliniat && l.pas > 2 * R + EPS) {
      return {
        ok: false,
        motiv: `celula reliefului (${Math.round(p.r.celula * 1e4) / 1e4} mm) e mai mare decât diametrul frezei (${2 * R} mm): liniile aliniate trec prin centrele celulelor și ar lăsa dungi între ele; alege ${so.degrosare ? 'un unghi care nu e 0° sau 90°' : 'liniile nealiniate (sau un unghi care nu e 0° sau 90°)'} ori o freză mai mare`,
      };
    }
    if (ip === 0) pasFolosit = l.pas;
    if (ip === 0 && !l.aliniat && !so.degrosare) avertismente.push(`liniile ${o.nealiniat ? 'nealiniate' : `la ${o.unghi}°`} nu urmează centrele celulelor: pot apărea riduri (moiré) pe detaliile fine`);
    if (ip === 0 && l.aliniat && Math.abs(l.pas - o.pasLateral) > 1e-9) {
      const k = celuleAliniate(o.pasLateral, p.r.celula), mm = Math.round(l.pas * 1e4) / 1e4;
      avertismente.push(l.pas > o.pasLateral
        ? `pasul lateral, mărit la o celulă a reliefului: ${mm} mm (liniile aliniate nu pot sta mai des; creasta iese mai mare decât cea cerută)`
        : `pasul lateral, rotunjit în jos la ${k} ${k === 1 ? 'celulă' : 'celule'} ale reliefului: ${mm} mm`);
    }
    for (const pts of l.linii) puncte += pts.length / 2;
    if (puncte > PUNCTE_FINISARE_MAXIM) return { ok: false, motiv: `${nume} ar avea peste ${PUNCTE_FINISARE_MAXIM} de puncte pe trecere: mărește pasul lateral` };
    liniiPe.push({ ip, linii: l.linii });
  }
  // Numărul trecerilor are o margine de jos din orice punct al traseului: cea mai adâncă cotă e cel mult vârful lui. Punctul ales
  // e, pe fiecare relief, cel mai apropiat de cea mai joasă celulă, cu vârful socotit exact ca mai jos (aceleași segmente, în
  // aceeași ordine). Peste plafon chiar cu marginea de jos, refuzul de după cote vine acum; altfel, verdictul rămâne după ele.
  if (puncte * Math.max(1, Math.ceil(o.adancime / o.pas - 1e-9)) > PUNCTE_FINISARE_MAXIM) {
    let sus = Infinity;
    for (const { ip, linii: ls } of liniiPe) {
      const p = geom[ip]!;
      // Dintre celulele cele mai joase (un fund plat le are pe toate egale), cea mai apropiată de centrul lor: marginea fundului e
      // lângă pantă, deci bila stă acolo mai sus.
      let jos = Infinity, sx = 0, sy = 0, nj = 0;
      for (let k = 0; k < p.r.z.length; k++) if (p.r.z[k]! < jos) jos = p.r.z[k]!;
      for (let j = 0; j < p.r.ny; j++) {
        for (let i = 0; i < p.r.nx; i++) if (p.r.z[j * p.r.nx + i] === jos) { sx += i; sy += j; nj++; }
      }
      let cx = NaN, cy = NaN, cd = Infinity;
      for (let j = 0; j < p.r.ny; j++) {
        for (let i = 0; i < p.r.nx; i++) {
          if (p.r.z[j * p.r.nx + i] !== jos) continue;
          const d = (i - sx / nj) ** 2 + (j - sy / nj) ** 2;
          if (d < cd) { cd = d; cx = (i + 0.5) * p.r.celula; cy = (j + 0.5) * p.r.celula; }
        }
      }
      let bk = -1, bq = -1, bd = Infinity;
      for (const [k, pts] of ls.entries()) {
        for (let q = 0; 2 * q < pts.length; q++) {
          const d = (pts[2 * q]! - cx) ** 2 + (pts[2 * q + 1]! - cy) ** 2;
          if (d < bd) { bd = d; bk = k; bq = q; }
        }
      }
      if (bk < 0) continue;
      const pts = ls[bk]!, n = pts.length / 2, { x, y } = inLume(p, bk, pts), i = bk % 2 === 0 ? bq : n - 1 - bq;
      // Câmpul doar pe benzile din jurul punctului și al vecinilor lui (aceleași cote ca pe tot relieful).
      const vec = { x: [x[Math.max(0, i - 1)]!, x[i]!, x[Math.min(n - 1, i + 1)]!], y: [y[Math.max(0, i - 1)]!, y[i]!, y[Math.min(n - 1, i + 1)]!] };
      const cota = cotaPe(pregatiteInJur(geom, so.cota.raza, [vec]), o, so);
      const v = n === 1 ? cota(ip, x[i]!, y[i]!, x[i]!, y[i]!)
        : Math.max(i > 0 ? cota(ip, x[i - 1]!, y[i - 1]!, x[i]!, y[i]!) : -Infinity, i + 1 < n ? cota(ip, x[i]!, y[i]!, x[i + 1]!, y[i + 1]!) : -Infinity);
      sus = Math.min(sus, v);
    }
    // Toleranța mai largă decât a numărului de mai jos (1e-9): o rotunjire a vârfului nu trece marginea peste el.
    if (sus < -EPS && puncte * Math.ceil(-sus / o.pas - 1e-6) > PUNCTE_FINISARE_MAXIM) {
      return { ok: false, motiv: `${nume} ar avea peste ${PUNCTE_FINISARE_MAXIM} de puncte: mărește pasul lateral sau pasul pe trecere` };
    }
  }
  return { ok: true, plan: { o, so, nume, geom, liniiPe, puncte, pasFolosit, avertismente } };
}

/**
 * Cotele liniilor [k0, k1) ale reliefului `ip` (felia 18.1↑h-6): pe fiecare punct, maximul cotelor celor două segmente ale lui.
 * Cu `cota` dată, pe câmpul ei (întreg, în finisarea dintr-o bucată); fără, pe benzile de care are nevoie lotul (ADR 0323, 2a).
 * Loturile lipite dau cotele dintr-o bucată, bit cu bit (`reliefFinisare.loturi.test.ts`).
 */
export function coteLot(plan: PlanTreceri, ip: number, k0: number, k1: number, cota?: Cota): LinieZ[] {
  const xy = liniiInLume(plan, ip, k0, k1);
  // Raza cotei: la degroșare, a frezei plate mărite cu adaosul (R + a), nu a frezei.
  const c = cota ?? cotaPe(pregatiteInJur(plan.geom, plan.so.cota.raza, xy), plan.o, plan.so);
  return coteLinii(xy, ip, c).map((z, q) => ({ ip, x: xy[q]!.x, y: xy[q]!.y, z }));
}

/** Liniile [k0, k1) ale reliefului `ip`, în lume, în ordinea parcurgerii. */
function liniiInLume(plan: PlanTreceri, ip: number, k0: number, k1: number): { readonly x: Float64Array; readonly y: Float64Array }[] {
  const g = plan.geom[ip]!, ls = plan.liniiPe.find((l) => l.ip === ip)?.linii ?? [];
  return ls.slice(k0, k1).map((pts, q) => inLume(g, k0 + q, pts));
}

/** Vârful fiecărui punct al liniilor date: maximul cotelor celor două segmente ale lui. */
function coteLinii(xy: readonly { readonly x: Float64Array; readonly y: Float64Array }[], ip: number, c: Cota): Float64Array[] {
  return xy.map(({ x, y }) => {
    const n = x.length, z = new Float64Array(n), seg = new Float64Array(Math.max(0, n - 1));
    for (let i = 0; i + 1 < n; i++) seg[i] = c(ip, x[i]!, y[i]!, x[i + 1]!, y[i + 1]!);
    for (let i = 0; i < n; i++) {
      z[i] = n === 1 ? c(ip, x[i]!, y[i]!, x[i]!, y[i]!) : Math.max(i > 0 ? seg[i - 1]! : -Infinity, i + 1 < n ? seg[i]! : -Infinity);
    }
    return z;
  });
}

/**
 * Cererea unui lot de linii pentru un worker al cotelor (felia 18.1↑h-7), de sine stătătoare: punctele liniilor lotului, în
 * lume și în ordinea parcurgerii, iar pe fiecare relief doar rândurile de relief de care are nevoie banda lui (cu `zRand0`) și
 * banda însăși (rândurile de calcul). Plus ce ține de cotă: freza ei, ridicarea, podeaua, marginea.
 */
export type CerereCote = {
  readonly cota: FrezaFinisare; readonly ridicare: number; readonly adancime: number; readonly margine: 'perete' | 'trece';
  readonly reliefuri: readonly ReliefCam[];
  readonly benzi: readonly { readonly j0: number; readonly j1: number }[];
  readonly ip: number;
  readonly x: readonly Float64Array[]; readonly y: readonly Float64Array[];
};

/**
 * Liniile planului, în cel mult `k` loturi pe fiecare relief (cu cam aceleași puncte), ca cereri (`CerereCote`), în ordinea
 * planului: cotele lor, înșirate, sunt cotele tuturor liniilor (`ParametriFinisare.cote`).
 */
export function loturiCote(plan: PlanTreceri, k: number): CerereCote[] {
  const out: CerereCote[] = [], R = plan.so.cota.raza;
  for (const { ip, linii: ls } of plan.liniiPe) {
    // Granițele loturilor, după punctele adunate: lotul t se termină la prima linie unde s-au strâns t / n din puncte; cel puțin
    // o linie pe lot.
    const n = Math.max(1, Math.min(k, ls.length)), granite: number[] = [0];
    const total = ls.reduce((a, l) => a + l.length / 2, 0);
    let adunate = 0, urm = 0;
    for (let t = 1; t < n; t++) {
      while (urm < ls.length && (urm <= granite[t - 1]! || adunate < (t * total) / n)) { adunate += ls[urm]!.length / 2; urm++; }
      if (urm >= ls.length) break;
      granite.push(urm);
    }
    granite.push(ls.length);
    for (let t = 0; t + 1 < granite.length; t++) {
      const k0 = granite[t]!, k1 = granite[t + 1]!;
      const xy = liniiInLume(plan, ip, k0, k1), benzi = benziInJur(plan.geom, R, xy);
      const reliefuri = plan.geom.map((g, q) => {
        const b = benzi[q]!, f = g.mx / g.r.nx, nx = g.r.nx;
        // Rândurile de relief de care au nevoie nodurile benzii (și vecinii lor, pentru câmpul pe 9 puncte).
        const r0 = Math.max(0, Math.floor(b.j0 / f) - 1), r1 = Math.min(g.r.ny, Math.ceil(b.j1 / f) + 2);
        const z = new Float64Array(r1 * nx - r0 * nx);
        for (let u = 0; u < z.length; u++) z[u] = g.r.z[r0 * nx + u]!;
        return { nx, ny: g.r.ny, celula: g.r.celula, m: g.r.m, z, zRand0: r0 };
      });
      out.push({
        cota: plan.so.cota, ridicare: plan.so.ridicare, adancime: plan.o.adancime, margine: plan.o.margine, reliefuri, benzi, ip,
        x: xy.map((l) => l.x), y: xy.map((l) => l.y),
      });
    }
  }
  return out;
}

/** Cotele unui lot (`CerereCote`), linie cu linie: ce face un worker al cotelor. */
export function cotePuncte(c: CerereCote): Float64Array[] {
  const pregatite = c.reliefuri.map((r, q) => pregateste(r, c.benzi[q]));
  return coteLinii(c.x.map((x, q) => ({ x, y: c.y[q]! })), c.ip, cotaPe(pregatite, c, c));
}

/** Planul unei finisări (pentru probe și pentru bazinul cotelor, felia 18.1↑h-8), sau refuzul. */
export function planFinisare(o: ParametriFinisare): ReturnType<typeof planTreceri> {
  return planTreceri(o, { cota: o.freza, ridicare: 0, degrosare: false });
}

/** Planul unei degroșări, ca `degrosareRelief` (fără verificarea adaosului), sau refuzul. */
export function planDegrosare(o: ParametriDegrosare): ReturnType<typeof planTreceri> {
  return planTreceri({ ...o, freza: { fel: 'plata', raza: o.raza }, nealiniat: false }, { cota: { fel: 'plata', raza: o.raza + o.adaos }, ridicare: o.adaos, degrosare: true });
}

/** Drumul comun al finisării și al degroșării: planul, cotele tuturor liniilor (pe câmpul întreg), apoi mișcările. */
function treceriRelief(o: ParametriFinisare, so: Socotire): RezultatFinisare {
  const pl = planTreceri(o, so);
  if (!pl.ok) return pl;
  const plan = pl.plan, cota = cotaPe(plan.geom.map((g) => pregateste(g.r)), o, so), toate: LinieZ[] = [];
  // Cotele date (din bazinul cotelor), doar dacă sunt chiar ale planului: același număr de linii, cu aceleași puncte.
  const date = o.cote, linii = plan.liniiPe.flatMap(({ ip, linii: ls }) => ls.map((pts, k) => ({ ip, k, n: pts.length / 2 })));
  if (date && date.length === linii.length && linii.every((l, q) => date[q]!.length === l.n)) {
    for (const [q, l] of linii.entries()) {
      const { x, y } = liniiInLume(plan, l.ip, l.k, l.k + 1)[0]!;
      toate.push({ ip: l.ip, x, y, z: date[q]! });
    }
  } else {
    for (const { ip, linii: ls } of plan.liniiPe) toate.push(...coteLot(plan, ip, 0, ls.length, cota));
  }
  return miscariTreceri(plan, toate, cota);
}

/** Mișcările, din cotele tuturor liniilor (în ordinea planului); `cota` socotește legăturile dintre linii. */
function miscariTreceri(plan: PlanTreceri, toate: readonly LinieZ[], cota: Cota): RezultatFinisare {
  const { o, nume, puncte, pasFolosit } = plan, avertismente = [...plan.avertismente];
  const so = plan.so;
  let adanc = 0;
  for (const l of toate) for (const v of l.z) if (v < adanc) adanc = v;
  const m: Miscare[] = [];
  if (adanc >= -EPS) {
    avertismente.push(so.degrosare
      ? 'relieful nu coboară sub fața plăcii mai mult decât adaosul: degroșarea n-are ce tăia'
      : 'relieful n-are nimic sub fața plăcii: finisarea n-are ce tăia');
    return { ok: true, miscari: m, treceri: 0, linii: toate.length, pasLateral: pasFolosit, avertismente };
  }
  const n = Math.max(1, Math.ceil(-adanc / o.pas - 1e-9));
  if (puncte * n > PUNCTE_FINISARE_MAXIM) return { ok: false, motiv: `${nume} ar avea peste ${PUNCTE_FINISARE_MAXIM} de puncte: mărește pasul lateral sau pasul pe trecere` };
  const sus = (): void => { m.push({ tip: 'rapida', la: { Z: o.zSigur } }); };
  let unde: { readonly ip: number; readonly x: number; readonly y: number; readonly z: number } | null = null;
  for (let k = 1; k <= n; k++) {
    const fundInainte = -(k - 1) * o.pas, fund = k === n ? -Infinity : -k * o.pas;
    for (const l of toate) {
      const N = l.z.length;
      let i = 0;
      while (i < N) {
        if (!(l.z[i]! < fundInainte - EPS)) { i++; continue; }
        let j = i;
        while (j + 1 < N && l.z[j + 1]! < fundInainte - EPS) j++;
        // Bucata [i, j], cu câte un punct de fiecare parte.
        const a = Math.max(0, i - 1), b = Math.min(N - 1, j + 1);
        const Z = (q: number): number => Math.max(l.z[q]!, fund);
        const x0 = l.x[a]!, y0 = l.y[a]!, z0 = Z(a);
        if (unde !== null && unde.ip === l.ip && legatura(unde, { x: x0, y: y0 })) {
          // Legătura la adâncime: drumul A→B nu coboară sub cota lui (urcă întâi, dacă trebuie).
          const zc = Math.max(cota(l.ip, unde.x, unde.y, x0, y0), fund);
          if (zc > Math.min(unde.z, z0) + EPS) {
            const zl = Math.max(zc, unde.z, z0);
            if (zl > unde.z + EPS) m.push({ tip: 'taiere', la: { Z: zl }, avans: o.avans });
            m.push({ tip: 'taiere', la: { X: x0, Y: y0 }, avans: o.avans });
            if (z0 < zl - EPS) m.push({ tip: 'taiere', la: { Z: z0 }, avans: o.avansPlonjare });
          } else {
            m.push({ tip: 'taiere', la: { X: x0, Y: y0, Z: z0 }, avans: avansSpre(unde.x, unde.y, unde.z, x0, y0, z0) });
          }
        } else {
          sus();
          m.push({ tip: 'rapida', la: { X: x0, Y: y0 } });
          m.push({ tip: 'taiere', la: { Z: z0 }, avans: o.avansPlonjare });
        }
        let px = x0, py = y0, pz = z0;
        for (let q = a + 1; q <= b; q++) {
          const zq = Z(q);
          // Punctele de mijloc ale unui palier drept (aceeași cotă, pe aceeași linie dreaptă) nu schimbă drumul.
          if (q < b && zq === pz && Z(q + 1) === zq) continue;
          const xq = l.x[q]!, yq = l.y[q]!;
          m.push({ tip: 'taiere', la: { X: xq, Y: yq, Z: zq }, avans: avansSpre(px, py, pz, xq, yq, zq) });
          px = xq; py = yq; pz = zq;
        }
        unde = { ip: l.ip, x: l.x[b]!, y: l.y[b]!, z: Z(b) };
        i = j + 1;
      }
    }
    // Între treceri, freza urcă (la începutul bucății următoare).
    unde = null;
  }
  sus();
  return { ok: true, miscari: m, treceri: n, linii: toate.length, pasLateral: pasFolosit, avertismente };

  /**
   * Avansul unei mutări de tăiere (felia 18.1↑d-1, găsită la placa reliefului): una care coboară mai abrupt decât lasă avansul
   * de plonjare (viteza pe Z, avans · |dz| / L, peste el) merge cu avansul de plonjare. Așa freza nu intră în lemn cu avansul de
   * tăiere la începutul unei linii (de pe perete, în jos) și nici pe o pantă abruptă; urcarea și coborârea lină rămân la avans.
   */
  function avansSpre(ax: number, ay: number, az: number, bx: number, by: number, bz: number): number {
    const dz = az - bz;
    if (!(dz > EPS)) return o.avans;
    return (o.avans * dz) / Math.hypot(bx - ax, by - ay, dz) > o.avansPlonjare ? o.avansPlonjare : o.avans;
  }

  /** O legătură la adâncime doar spre un punct apropiat (linia vecină): cel mult de două ori pasul lateral. */
  function legatura(a: { readonly x: number; readonly y: number }, b: { readonly x: number; readonly y: number }): boolean {
    return Math.hypot(b.x - a.x, b.y - a.y) <= 2 * pasFolosit + EPS;
  }
}
