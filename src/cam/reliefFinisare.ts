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
 * Doar + − × ÷ √ min max, afară de direcția liniilor la un unghi oarecare (`Math.cos`, `Math.sin`, o dată pe operație; 0° și
 * 90° sunt exacte), ca strategia paralelă a buzunarului: CAM-ul nu importă din simulare. Totul în lume (mm, Z față de fața
 * plăcii), fără stare.
 */
import type { Miscare } from '../ir/ir.ts';

/** Forma frezei, cu raza ei: plata, bila, V-ul (unghiul inclus, în grade, și vârful plat, diametrul lui). */
export type FrezaFinisare =
  | { readonly fel: 'plata'; readonly raza: number }
  | { readonly fel: 'bila'; readonly raza: number }
  | { readonly fel: 'v'; readonly raza: number; readonly unghi: number; readonly varf: number };

/**
 * Un relief, cum îl vede finisarea: grila (rândul j în sus), celula în mm de lume (scalarea uniformă a matricei o schimbă),
 * cotele centrelor în lume (Z față de fața plăcii, deci cu planul zero aplicat) și transformarea rigidă din sistemul lui
 * (originea în colțul stânga-jos, mm de lume) în lume: x' = a·x + c·y + e, y' = b·x + d·y + f, cu (a, b, c, d) ortonormată.
 */
export type ReliefCam = {
  readonly nx: number; readonly ny: number; readonly celula: number;
  readonly z: ArrayLike<number>;
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
};

export type RezultatFinisare =
  | {
    readonly ok: true; readonly miscari: Miscare[]; readonly treceri: number; readonly linii: number;
    /** Pasul lateral folosit (rotunjit la celule întregi, aliniat), pe relieful întâi. */
    readonly pasLateral: number; readonly avertismente: string[];
  }
  | { readonly ok: false; readonly motiv: string };

/** Cele mai multe puncte (linii × puncte × treceri) ale unei finisări; peste, refuzul (felia 18.1↑h măsoară 4000²). */
export const PUNCTE_FINISARE_MAXIM = 20_000_000;

/** Cât urcă suprafața frezei deasupra vârfului la raza r (r ≤ R). */
export function urcare(f: FrezaFinisare, r: number): number {
  if (f.fel === 'plata') return 0;
  if (f.fel === 'bila') return f.raza - Math.sqrt(Math.max(0, f.raza * f.raza - r * r));
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
type Piramida = { readonly niv: ReadonlyArray<{ readonly v: Float32Array; readonly w: number; readonly hh: number }> };

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
export function cotaModel(z: ArrayLike<number>, nx: number, ny: number, c: number, x: number, y: number): number {
  const v = (i: number, j: number): number => z[Math.min(ny - 1, Math.max(0, j)) * nx + Math.min(nx - 1, Math.max(0, i))]!;
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
export function campPeCelula(z: ArrayLike<number>, nx: number, ny: number, c: number, q: number): Float32Array {
  if (q === 1) return Float32Array.from(campConservativ(z, nx, ny), float32Sus);
  const mx = nx * q, my = ny * q, h = c / q, P = new Float64Array((mx + 1) * (my + 1));
  for (let j = 0; j <= my; j++) for (let i = 0; i <= mx; i++) P[j * (mx + 1) + i] = cotaModel(z, nx, ny, c, i * h, j * h);
  const F = new Float32Array(mx * my);
  for (let j = 0; j < my; j++) {
    for (let i = 0; i < mx; i++) {
      const a = j * (mx + 1) + i;
      F[j * mx + i] = float32Sus(Math.max(P[a]!, P[a + 1]!, P[a + mx + 1]!, P[a + mx + 2]!));
    }
  }
  return F;
}

/**
 * Câmpul conservativ (ADR 0310 §4): pe fiecare celulă, maximul modelului exact peste cele 9 puncte ale ei. Centrul e valoarea
 * celulei; mijlocul unei laturi, media cu vecina (pe margine, vecina e ea însăși); un colț e mijlocul diagonalei fixe a
 * pătratului dintre centre, de la (k + 1, l) la (k, l + 1).
 */
export function campConservativ(z: ArrayLike<number>, nx: number, ny: number): Float64Array {
  const F = new Float64Array(nx * ny);
  const v = (i: number, j: number): number => z[Math.min(ny - 1, Math.max(0, j)) * nx + Math.min(nx - 1, Math.max(0, i))]!;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const c = v(i, j);
      let m = c;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) m = Math.max(m, (c + v(i + di, j + dj)) / 2);
      // Colțurile: pătratul dintre centrele (k, l)…(k + 1, l + 1) are colțul celulei în mijloc, pe diagonala (k + 1, l)–(k, l + 1).
      for (const [k, l] of [[i - 1, j - 1], [i, j - 1], [i - 1, j], [i, j]] as const) m = Math.max(m, (v(k + 1, l) + v(k, l + 1)) / 2);
      F[j * nx + i] = m;
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
type Pregatit = {
  readonly r: ReliefCam; readonly P: Piramida; readonly h: number; readonly mx: number; readonly my: number; readonly W: number; readonly H: number;
  /** Celula maximului găsit la segmentul dinainte (indicele pe nivelul 0), sau −1: un candidat sigur pentru pornirea următorului. */
  ultima: number;
};

function pregateste(r: ReliefCam): Pregatit {
  const q = diviziune(r.celula), mx = r.nx * q, my = r.ny * q;
  return { r, P: piramida(campPeCelula(r.z, r.nx, r.ny, r.celula, q), mx, my), h: r.celula / q, mx, my, W: r.nx * r.celula, H: r.ny * r.celula, ultima: -1 };
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
function cotaSegment(p: Pregatit, f: FrezaFinisare, ax: number, ay: number, bx: number, by: number, perete: boolean): number {
  const R = f.raza, h = p.h, niv = p.P.niv;
  let m = -Infinity;
  // Pornirea: celulele de sub capete (la distanța 0, urcarea 0) sunt deja o margine de jos a maximului; așa piramida taie din prima.
  const F0 = niv[0]!;
  let arg = -1;
  for (const [x, y] of [[ax, ay], [bx, by]] as const) {
    const i = Math.floor(x / h), j = Math.floor(y / h);
    if (i >= 0 && j >= 0 && i < p.mx && j < p.my && F0.v[j * F0.w + i]! - urcare(f, 0) > m) { m = F0.v[j * F0.w + i]! - urcare(f, 0); arg = j * F0.w + i; }
  }
  // Și celula maximului de la segmentul dinainte (vecinul): de obicei aproape de maximul acestuia.
  if (p.ultima >= 0) {
    const i = p.ultima % F0.w, j = (p.ultima - i) / F0.w;
    const d = distSegmentCutie(ax, ay, bx, by, i * h, j * h, (i + 1) * h, (j + 1) * h);
    if (d <= R) { const v = F0.v[p.ultima]! - urcare(f, d); if (v > m) { m = v; arg = p.ultima; } }
  }
  // Blocurile, de sus în jos: (nivel, i, j). Un bloc acoperă celulele [i·2^l, (i + 1)·2^l) × [j·2^l, (j + 1)·2^l), tăiate la grilă.
  const stiva: number[] = [niv.length - 1, 0, 0];
  while (stiva.length > 0) {
    const j = stiva.pop()!, i = stiva.pop()!, l = stiva.pop()!;
    const N = niv[l]!, F = N.v[j * N.w + i]!;
    if (F <= m) continue;
    const s = h * (1 << l);
    const d = distSegmentCutie(ax, ay, bx, by, i * s, j * s, Math.min((i + 1) * s, p.mx * h), Math.min((j + 1) * s, p.my * h));
    if (d > R) continue;
    const v = F - urcare(f, d);
    if (v <= m) continue;
    if (l === 0) { m = v; arg = j * N.w + i; continue; }
    // Copiii, puși pe stivă crescător după maxim: cel mai mare se desface primul, ca marginea găsită să taie restul.
    const jos = niv[l - 1]!, i2 = 2 * i, j2 = 2 * j;
    let n = 0;
    for (let k = 0; k < 4; k++) {
      const ci = i2 + (k & 1), cj = j2 + (k >> 1);
      if (ci >= jos.w || cj >= jos.hh) continue;
      const fv = jos.v[cj * jos.w + ci]!;
      if (fv <= m) continue;
      let q = n++;
      while (q > 0 && copiiF[q - 1]! > fv) { copiiF[q] = copiiF[q - 1]!; copiiI[q] = copiiI[q - 1]!; copiiJ[q] = copiiJ[q - 1]!; q--; }
      copiiF[q] = fv; copiiI[q] = ci; copiiJ[q] = cj;
    }
    for (let q = 0; q < n; q++) stiva.push(l - 1, copiiI[q]!, copiiJ[q]!);
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
 * celule; punctele pe linie la pasul celulei de calcul.
 */
function linii(p: Pregatit, o: ParametriFinisare): { readonly linii: Linie[]; readonly pas: number; readonly aliniat: boolean } {
  const c = p.r.celula, h = p.h, E = o.margine === 'trece' ? o.freza.raza : 0;
  const aliniat = !o.nealiniat && (o.unghi === 0 || o.unghi === 90);
  const rez: Linie[] = [];
  if (aliniat) {
    const k = Math.max(1, Math.round(o.pasLateral / c)), s = k * c;
    // Centrele pe o axă, de la cel mai mic ≥ −E la cel mai mare ≤ L + E (pasul `d`, decalate cu `d / 2`).
    const centre = (L: number, d: number): number[] => {
      const a = Math.ceil(-E / d - 0.5), b = Math.floor((L + E) / d - 0.5), out: number[] = [];
      for (let i = a; i <= b; i++) out.push((i + 0.5) * d);
      return out;
    };
    // Lateral, prin centrele celulelor reliefului; de-a lungul, la pasul celulei de calcul.
    const lung = o.unghi === 0 ? centre(p.W, h) : centre(p.H, h), lat = o.unghi === 0 ? centre(p.H, c) : centre(p.W, c);
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
  const x0 = -E, y0 = -E, x1 = p.W + E, y1 = p.H + E;
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
  const R = o.freza.raza;
  if (!(R > 0)) return { ok: false, motiv: 'freza n-are rază' };
  if (!(o.pasLateral > 0 && o.pasLateral <= 2 * R)) {
    return { ok: false, motiv: `pasul lateral de ${o.pasLateral} mm trebuie să fie în (0, ${2 * R}] (diametrul frezei): altfel rămân dungi între linii` };
  }
  if (!(o.pas > 0)) return { ok: false, motiv: 'pasul pe trecere trebuie să fie pozitiv' };
  if (!(o.unghi >= 0 && o.unghi < 180)) return { ok: false, motiv: `unghiul liniilor, ${o.unghi}°, trebuie să fie în [0°, 180°)` };
  if (o.reliefuri.length === 0) return { ok: false, motiv: 'finisarea n-are niciun relief' };
  const pregatite: Pregatit[] = o.reliefuri.map(pregateste);
  const avertismente: string[] = [];
  if (pregatite.some((p) => { for (let k = 0; k < p.r.z.length; k++) if (p.r.z[k]! > EPS) return true; return false; })) {
    avertismente.push('o parte din relief iese deasupra feței plăcii: acolo se taie la față');
  }
  const podea = -o.adancime;
  /** Cota unui segment în lume, peste toate reliefurile: al lui `ip` cu marginea lui, celelalte doar înăuntru. */
  const cota = (ip: number, ax: number, ay: number, bx: number, by: number): number => {
    let m = podea;
    pregatite.forEach((p, k) => {
      const [x0, y0] = inRelief(p, ax, ay), [x1, y1] = inRelief(p, bx, by);
      m = Math.max(m, cotaSegment(p, o.freza, x0, y0, x1, y1, k === ip && o.margine === 'perete'));
    });
    return m;
  };
  // Liniile, în lume, cu vârful fiecărui punct.
  type LinieZ = { readonly ip: number; readonly x: Float64Array; readonly y: Float64Array; readonly z: Float64Array };
  const toate: LinieZ[] = [];
  let pasFolosit = o.pasLateral, puncte = 0;
  for (const [ip, p] of pregatite.entries()) {
    const l = linii(p, o);
    if (ip === 0) pasFolosit = l.pas;
    if (ip === 0 && !l.aliniat) avertismente.push(`liniile ${o.nealiniat ? 'nealiniate' : `la ${o.unghi}°`} nu urmează centrele celulelor: pot apărea riduri (moiré) pe detaliile fine`);
    if (ip === 0 && l.aliniat && Math.abs(l.pas - o.pasLateral) > 1e-9) {
      avertismente.push(`pasul lateral, rotunjit la ${Math.round(l.pas / p.r.celula)} ${Math.round(l.pas / p.r.celula) === 1 ? 'celulă' : 'celule'} ale reliefului: ${Math.round(l.pas * 1e4) / 1e4} mm`);
    }
    for (const [k, pts] of l.linii.entries()) {
      const n = pts.length / 2;
      puncte += n;
      if (puncte > PUNCTE_FINISARE_MAXIM) return { ok: false, motiv: `finisarea ar avea peste ${PUNCTE_FINISARE_MAXIM} de puncte pe trecere: mărește pasul lateral` };
      const x = new Float64Array(n), y = new Float64Array(n), z = new Float64Array(n);
      const { a, b, c, d, e, f } = p.r.m;
      for (let i = 0; i < n; i++) {
        // Zigzag: liniile impare se parcurg invers.
        const q = k % 2 === 0 ? i : n - 1 - i, lx = pts[2 * q]!, ly = pts[2 * q + 1]!;
        x[i] = a * lx + c * ly + e; y[i] = b * lx + d * ly + f;
      }
      const seg = new Float64Array(Math.max(0, n - 1));
      for (let i = 0; i + 1 < n; i++) seg[i] = cota(ip, x[i]!, y[i]!, x[i + 1]!, y[i + 1]!);
      for (let i = 0; i < n; i++) {
        const v = n === 1 ? cota(ip, x[i]!, y[i]!, x[i]!, y[i]!) : Math.max(i > 0 ? seg[i - 1]! : -Infinity, i + 1 < n ? seg[i]! : -Infinity);
        z[i] = v;
      }
      toate.push({ ip, x, y, z });
    }
  }
  let adanc = 0;
  for (const l of toate) for (const v of l.z) if (v < adanc) adanc = v;
  const m: Miscare[] = [];
  if (adanc >= -EPS) {
    avertismente.push('relieful n-are nimic sub fața plăcii: finisarea n-are ce tăia');
    return { ok: true, miscari: m, treceri: 0, linii: toate.length, pasLateral: pasFolosit, avertismente };
  }
  const n = Math.max(1, Math.ceil(-adanc / o.pas - 1e-9));
  if (puncte * n > PUNCTE_FINISARE_MAXIM) return { ok: false, motiv: `finisarea ar avea peste ${PUNCTE_FINISARE_MAXIM} de puncte: mărește pasul lateral sau pasul pe trecere` };
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
            m.push({ tip: 'taiere', la: { X: x0, Y: y0, Z: z0 }, avans: o.avans });
          }
        } else {
          sus();
          m.push({ tip: 'rapida', la: { X: x0, Y: y0 } });
          m.push({ tip: 'taiere', la: { Z: z0 }, avans: o.avansPlonjare });
        }
        let pz = z0;
        for (let q = a + 1; q <= b; q++) {
          const zq = Z(q);
          // Punctele de mijloc ale unui palier drept (aceeași cotă, pe aceeași linie dreaptă) nu schimbă drumul.
          if (q < b && zq === pz && Z(q + 1) === zq) continue;
          m.push({ tip: 'taiere', la: { X: l.x[q]!, Y: l.y[q]!, Z: zq }, avans: o.avans });
          pz = zq;
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

  /** O legătură la adâncime doar spre un punct apropiat (linia vecină): cel mult de două ori pasul lateral. */
  function legatura(a: { readonly x: number; readonly y: number }, b: { readonly x: number; readonly y: number }): boolean {
    return Math.hypot(b.x - a.x, b.y - a.y) <= 2 * pasFolosit + EPS;
  }
}
