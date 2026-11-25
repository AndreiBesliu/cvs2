/**
 * ORACOLUL 3D AL RELIEFULUI (ADR 0310 §4, §10; felia 18.1↑c-0). ZERO importuri din `src/`. Scris înaintea CAM-ului
 * finisării, din ADR și din sonda s5 (`docs/faza2/sonde/s5-relief`: drop-cutter-ul exact pe triunghiuri și formulele CL),
 * rescris aici ca martor, nu copiat în aplicație.
 *
 * - **Modelul exact** al unui relief (§4): triunghiurile prin centrele celulelor, două pe pătrat, cu diagonala fixă de la
 *   (k + 1, l) la (k, l + 1) (ca benzile vederii 3D), plus un rând de vârfuri pe fiecare margine a dreptunghiului, cu valoarea
 *   celulei de margine. Coordonatele sunt ale reliefului: originea în colțul stânga-jos, j în sus, celula c.
 * - **Drop-cutter-ul exact** (`clExact`): cota vârfului frezei în (x, y), cel mai jos loc în care freza atinge triunghiurile fără
 *   să intre în ele: maximul peste vârfuri, muchii, fețe și muchia discului, cu o podea. Frezele: bila (raza R), plata (raza
 *   R) și V-ul (raza R, jumătatea unghiului α față de axă).
 * - **CL-ul pe hârtie** pe plan, sferă și cilindru (`clPlan`, `clRadial`), fără cod comun cu drop-cutter-ul.
 * - **Creasta** (`creastaSimulata`): un simulator independent primește doar punctele traseului și scrie bila ca sferă,
 *   z = zc + R − √(R² − d²); creasta e cât rămâne deasupra modelului. Pe plan, `creastaPlan` = R − √(R² − (s / 2)²).
 * - **Invarianta 4** (`judecaTraseul`): pe fiecare segment al traseului, cu 16 sub-eșantioane, vârful nu coboară sub CL-ul
 *   exact (nicio scobitură față de model) și nici sub fața plăcii minus pasul trecerii (niciodată mai adânc decât pasul).
 */

export type FrezaO =
  | { readonly fel: 'bila'; readonly R: number }
  | { readonly fel: 'plata'; readonly R: number }
  /** `alfa`: jumătate din unghiul inclus al V-ului, în radiani. */
  | { readonly fel: 'v'; readonly R: number; readonly alfa: number };

/** Cât urcă fața frezei deasupra vârfului la raza r (r ≤ R). */
export function urcareO(f: FrezaO, r: number): number {
  if (f.fel === 'bila') return f.R - Math.sqrt(Math.max(0, f.R * f.R - r * r));
  if (f.fel === 'plata') return 0;
  return r / Math.tan(f.alfa);
}

/**
 * Triunghiurile modelului exact al unei grile nx × ny (rândul j în sus, `valori[j · nx + i]`), cu celula `c`, în sistemul
 * reliefului: 9 numere pe triunghi (x, y, z de trei ori).
 */
export function triunghiuriModel(valori: ArrayLike<number>, nx: number, ny: number, c: number): Float64Array {
  const xs = (k: number, n: number): number => (k <= 0 ? 0 : k >= n + 1 ? n * c : (k - 0.5) * c);
  const v = (k: number, l: number): number => valori[Math.min(ny - 1, Math.max(0, l - 1)) * nx + Math.min(nx - 1, Math.max(0, k - 1))] ?? 0;
  const out = new Float64Array((nx + 1) * (ny + 1) * 2 * 9);
  let o = 0;
  const pune = (k: number, l: number): void => { out[o++] = xs(k, nx); out[o++] = xs(l, ny); out[o++] = v(k, l); };
  for (let l = 0; l <= ny; l++) {
    for (let k = 0; k <= nx; k++) {
      // A = (k, l), B = (k + 1, l), C = (k, l + 1), D = (k + 1, l + 1); diagonala B–C.
      pune(k, l); pune(k + 1, l); pune(k, l + 1);
      pune(k + 1, l); pune(k + 1, l + 1); pune(k, l + 1);
    }
  }
  return out;
}

/** Un index pe găleți al triunghiurilor (după cutia lor pe XY), pentru drop-cutter. */
export class IndexO {
  readonly T: Float64Array;
  private readonly cutii: Float64Array;
  private readonly x0: number;
  private readonly y0: number;
  private readonly gx: number;
  private readonly gy: number;
  private readonly celula: number;
  private readonly start: Uint32Array;
  private readonly ids: Uint32Array;

  constructor(T: Float64Array, celula: number) {
    const n = T.length / 9;
    this.T = T;
    this.celula = celula;
    const b = new Float64Array(5 * n);
    let X0 = Infinity, Y0 = Infinity, X1 = -Infinity, Y1 = -Infinity;
    for (let k = 0; k < n; k++) {
      const o = 9 * k, xs = [T[o]!, T[o + 3]!, T[o + 6]!], ys = [T[o + 1]!, T[o + 4]!, T[o + 7]!];
      b[5 * k] = Math.min(...xs); b[5 * k + 1] = Math.max(...xs); b[5 * k + 2] = Math.min(...ys); b[5 * k + 3] = Math.max(...ys);
      b[5 * k + 4] = Math.max(T[o + 2]!, T[o + 5]!, T[o + 8]!);
      X0 = Math.min(X0, b[5 * k]!); X1 = Math.max(X1, b[5 * k + 1]!); Y0 = Math.min(Y0, b[5 * k + 2]!); Y1 = Math.max(Y1, b[5 * k + 3]!);
    }
    this.cutii = b;
    this.x0 = X0;
    this.y0 = Y0;
    this.gx = Math.max(1, Math.ceil((X1 - X0) / celula) + 1);
    this.gy = Math.max(1, Math.ceil((Y1 - Y0) / celula) + 1);
    const cnt = new Uint32Array(this.gx * this.gy + 1);
    const peste = (k: number, f: (g: number) => void): void => {
      const i0 = Math.floor((b[5 * k]! - X0) / celula), i1 = Math.floor((b[5 * k + 1]! - X0) / celula);
      const j0 = Math.floor((b[5 * k + 2]! - Y0) / celula), j1 = Math.floor((b[5 * k + 3]! - Y0) / celula);
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) f(j * this.gx + i);
    };
    for (let k = 0; k < n; k++) peste(k, (g) => { cnt[g + 1]!++; });
    for (let g = 0; g < this.gx * this.gy; g++) cnt[g + 1]! += cnt[g]!;
    const umple = cnt.slice(), ids = new Uint32Array(cnt[this.gx * this.gy]!);
    for (let k = 0; k < n; k++) peste(k, (g) => { ids[umple[g]!++] = k; });
    this.start = cnt;
    this.ids = ids;
  }

  /** Triunghiurile ale căror cutii pot fi la cel mult R de (x, y), fiecare o dată. */
  aproape(x: number, y: number, R: number): number[] {
    const c = this.celula, vazute = new Set<number>(), r: number[] = [];
    const i0 = Math.max(0, Math.floor((x - R - this.x0) / c)), i1 = Math.min(this.gx - 1, Math.floor((x + R - this.x0) / c));
    const j0 = Math.max(0, Math.floor((y - R - this.y0) / c)), j1 = Math.min(this.gy - 1, Math.floor((y + R - this.y0) / c));
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const g = j * this.gx + i;
        for (let q = this.start[g]!; q < this.start[g + 1]!; q++) {
          const k = this.ids[q]!;
          if (vazute.has(k)) continue;
          vazute.add(k);
          const b = 5 * k, dx = Math.max(0, this.cutii[b]! - x, x - this.cutii[b + 1]!), dy = Math.max(0, this.cutii[b + 2]! - y, y - this.cutii[b + 3]!);
          if (dx * dx + dy * dy <= R * R) r.push(k);
        }
      }
    }
    return r;
  }
}

/**
 * Ce poate lipsi din drop-cutter (doar pentru controalele negative: un oracol care nu poate pica nu probează nimic): muchiile,
 * fețele sau amândouă (`noduri`: doar vârfurile, ca eșantionul în nod din ediția întâi).
 */
export type LipsaO = 'muchii' | 'fete' | 'noduri' | null;

/**
 * Cota vârfului frezei în (x, y): maximul exact peste triunghiurile din index (vârfuri, muchii, fețe, muchia discului) și
 * podea. Din s5 (`lib/mesh.mjs`), rescris.
 */
export function clExact(ix: IndexO, f: FrezaO, x: number, y: number, podea = -Infinity, lipsa: LipsaO = null): number {
  const R = f.R, R2 = R * R, kc = f.fel === 'v' ? 1 / Math.tan(f.alfa) : 0;
  const urcaR = f.fel === 'bila' ? R : f.fel === 'plata' ? 0 : R * kc;
  const urca = (r: number): number => urcareO(f, r);
  let best = podea;
  const varf = (vx: number, vy: number, vz: number): void => {
    const r2 = (vx - x) ** 2 + (vy - y) ** 2;
    if (r2 <= R2) best = Math.max(best, vz - urca(Math.sqrt(r2)));
  };
  // Pe muchie: parametrul s de-a lungul ei, d distanța de la axa frezei la dreapta muchiei, ρ = √(R² − d²).
  const fe = (z0: number, m: number, s: number, d: number, rho: number): number =>
    (f.fel === 'bila' ? z0 + m * s - R + Math.sqrt(Math.max(0, rho * rho - s * s)) : z0 + m * s - urca(Math.min(R, Math.sqrt(d * d + s * s))));
  const muchie = (Px: number, Py: number, Pz: number, Qx: number, Qy: number, Qz: number): void => {
    const ex = Qx - Px, ey = Qy - Py, L2 = ex * ex + ey * ey;
    if (L2 < 1e-24) return;
    const L = Math.sqrt(L2), ux = ex / L, uy = ey / L, wx = x - Px, wy = y - Py;
    const s0 = wx * ux + wy * uy, d = Math.abs(wx * uy - wy * ux);
    if (d > R) return;
    const rho = Math.sqrt(Math.max(0, R2 - d * d)), lo = Math.max(-rho, -s0), hi = Math.min(rho, L - s0);
    if (lo > hi) return;
    const m = (Qz - Pz) / L, z0 = Pz + m * s0;
    let v = Math.max(fe(z0, m, lo, d, rho), fe(z0, m, hi, d, rho));
    let ss = NaN;
    if (f.fel === 'bila') ss = (m * rho) / Math.sqrt(1 + m * m);
    else if (f.fel === 'v' && Math.abs(m) < kc) ss = (d * m) / Math.sqrt(kc * kc - m * m);
    if (ss >= lo && ss <= hi) v = Math.max(v, fe(z0, m, ss, d, rho));
    best = Math.max(best, v);
  };
  const T = ix.T;
  for (const k of ix.aproape(x, y, R)) {
    const o = 9 * k;
    const ax = T[o]!, ay = T[o + 1]!, az = T[o + 2]!, bx = T[o + 3]!, by = T[o + 4]!, bz = T[o + 5]!, cx = T[o + 6]!, cy = T[o + 7]!, cz = T[o + 8]!;
    varf(ax, ay, az); varf(bx, by, bz); varf(cx, cy, cz);
    if (lipsa !== 'muchii' && lipsa !== 'noduri') { muchie(ax, ay, az, bx, by, bz); muchie(bx, by, bz, cx, cy, cz); muchie(cx, cy, cz, ax, ay, az); }
    if (lipsa === 'fete' || lipsa === 'noduri') continue;
    let nx = (by - ay) * (cz - az) - (bz - az) * (cy - ay), ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az), nz = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; }
    const nl = Math.hypot(nx, ny, nz);
    if (nl === 0 || nz <= 1e-12 * nl) continue;
    nx /= nl; ny /= nl; nz /= nl;
    const zp = (px: number, py: number): number => az - (nx * (px - ax) + ny * (py - ay)) / nz;
    const s = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    const in3 = (px: number, py: number): boolean => {
      const e0 = (bx - ax) * (py - ay) - (by - ay) * (px - ax), e1 = (cx - bx) * (py - by) - (cy - by) * (px - bx), e2 = (ax - cx) * (py - cy) - (ay - cy) * (px - cx);
      return s > 0 ? e0 >= 0 && e1 >= 0 && e2 >= 0 : e0 <= 0 && e1 <= 0 && e2 <= 0;
    };
    if (in3(x, y)) best = Math.max(best, zp(x, y));
    if (f.fel === 'bila') {
      const qx = x - R * nx, qy = y - R * ny;
      if (in3(qx, qy)) best = Math.max(best, zp(qx, qy) - (R - R * nz));
    }
    const gl = Math.hypot(nx, ny);
    if (gl > 1e-15) {
      const qx = x - (R * nx) / gl, qy = y - (R * ny) / gl;
      if (in3(qx, qy)) best = Math.max(best, zp(qx, qy) - urcaR);
    }
  }
  return best;
}

/** CL-ul pe hârtie pe planul z = a·x + b·y + c (s5, „lib/geom.mjs”). */
export function clPlan(f: FrezaO, a: number, b: number, c: number, x: number, y: number): number {
  const z0 = a * x + b * y + c, g = Math.hypot(a, b);
  if (f.fel === 'bila') return z0 + f.R * (Math.sqrt(1 + g * g) - 1);
  if (f.fel === 'plata') return z0 + f.R * g;
  return Math.max(z0, z0 + f.R * g - f.R / Math.tan(f.alfa));
}

/**
 * CL-ul pe hârtie pe un profil radial (o semisferă sau un cilindru culcat) de rază Rs peste podeaua z = 0, la distanța
 * orizontală d de axă.
 */
export function clRadial(f: FrezaO, d: number, Rs: number): number {
  const R = f.R;
  let z = -Infinity;
  if (f.fel === 'bila') { if (d <= Rs + R) z = Math.sqrt((Rs + R) ** 2 - d * d) - R; }
  else if (f.fel === 'plata') { if (d <= R) z = Rs; else if (d - R <= Rs) z = Math.sqrt(Rs * Rs - (d - R) ** 2); }
  else {
    const ca = Math.cos(f.alfa), sa = Math.sin(f.alfa), k = 1 / Math.tan(f.alfa), rc = d - Rs * ca;
    if (rc <= 0) z = Math.sqrt(Math.max(0, Rs * Rs - d * d));
    else if (rc <= R) z = (Rs - d * ca) / sa;
    else if (d - R <= Rs) z = Math.sqrt(Rs * Rs - (d - R) ** 2) - R * k;
  }
  return Math.max(z, 0);
}

/** Creasta pe un plan înclinat transversal cu θ, cu bila R și pasul lateral s (s5 §4.2). */
export function creastaPlan(R: number, s: number, teta = 0): number {
  const c = Math.cos(teta);
  return (R - Math.sqrt(R * R - (s / (2 * c)) ** 2)) / c;
}

/** Un punct al traseului (centrul vârfului frezei), în sistemul reliefului. */
export type PunctO = { readonly x: number; readonly y: number; readonly z: number };

/**
 * Suprafața lăsată de bilă în (x, y): cel mai jos punct al sferelor centrate la (px, py, pz + R), peste punctele date (și
 * segmentele dintre ele, eșantionate la `pasEs`). Simulatorul independent: nu folosește `urcareO`.
 */
export function suprafataBila(treceri: ReadonlyArray<readonly PunctO[]>, R: number, x: number, y: number, pasEs: number): number {
  let z = Infinity;
  for (const t of treceri) {
    for (let k = 0; k + 1 < t.length; k++) {
      const a = t[k]!, b = t[k + 1]!, L = Math.hypot(b.x - a.x, b.y - a.y), n = Math.max(1, Math.ceil(L / pasEs));
      for (let q = 0; q <= n; q++) {
        const u = q / n, px = a.x + u * (b.x - a.x), py = a.y + u * (b.y - a.y), pz = a.z + u * (b.z - a.z);
        const d2 = (x - px) ** 2 + (y - py) ** 2;
        if (d2 <= R * R) z = Math.min(z, pz + R - Math.sqrt(R * R - d2));
      }
    }
  }
  return z;
}

/** Creasta măsurată: cel mai mult rămâne deasupra modelului `zModel` în punctele date. */
export function creastaSimulata(
  treceri: ReadonlyArray<readonly PunctO[]>, R: number, puncte: ReadonlyArray<readonly [number, number]>, zModel: (x: number, y: number) => number, pasEs: number,
): number {
  let m = 0;
  for (const [x, y] of puncte) {
    const z = suprafataBila(treceri, R, x, y, pasEs);
    if (Number.isFinite(z)) m = Math.max(m, z - zModel(x, y));
  }
  return m;
}

/** O problemă găsită de oracol pe un traseu. */
export type ProblemaO = { readonly fel: 'scobitura' | 'adancime'; readonly x: number; readonly y: number; readonly cu: number };

/**
 * Invarianta 4 (ADR 0310 §4) și pasul pe trecere, pe un traseu de tăiere (punctele vârfului, în ordine; doar mutările de
 * tăiere): pe fiecare segment, în `sub` sub-eșantioane, vârful nu coboară sub CL-ul exact al modelului (cu toleranța `tol`) și
 * nici sub `fundTrecere`. Întoarce problemele (gol = bine).
 */
export function judecaTraseul(
  ix: IndexO, f: FrezaO, traseu: readonly PunctO[], o: { readonly podea?: number; readonly fundTrecere?: number; readonly tol: number; readonly sub?: number },
): ProblemaO[] {
  const p: ProblemaO[] = [], sub = o.sub ?? 16;
  for (let k = 0; k + 1 < traseu.length; k++) {
    const a = traseu[k]!, b = traseu[k + 1]!;
    for (let q = 0; q <= sub; q++) {
      const u = q / sub, x = a.x + u * (b.x - a.x), y = a.y + u * (b.y - a.y), z = a.z + u * (b.z - a.z);
      const cl = clExact(ix, f, x, y, o.podea ?? -Infinity);
      if (z < cl - o.tol) p.push({ fel: 'scobitura', x, y, cu: cl - z });
      if (o.fundTrecere !== undefined && z < o.fundTrecere - o.tol) p.push({ fel: 'adancime', x, y, cu: o.fundTrecere - z });
    }
  }
  return p;
}

/** Distanța de la punctul p la triunghiul (a, b, c), în 3D (Ericson, „Real-Time Collision Detection” §5.1.5). */
export function distantaPunctTriunghiO(
  p: readonly [number, number, number], a: readonly [number, number, number], b: readonly [number, number, number], c: readonly [number, number, number],
): number {
  type V = readonly [number, number, number];
  const sub = (u: V, v: V): V => [u[0] - v[0], u[1] - v[1], u[2] - v[2]];
  const dot = (u: V, v: V): number => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  const D = (q: V): number => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
  const ab = sub(b, a), ac = sub(c, a), ap = sub(p, a), d1 = dot(ab, ap), d2 = dot(ac, ap);
  if (d1 <= 0 && d2 <= 0) return D(a);
  const bp = sub(p, b), d3 = dot(ab, bp), d4 = dot(ac, bp);
  if (d3 >= 0 && d4 <= d3) return D(b);
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); return D([a[0] + v * ab[0], a[1] + v * ab[1], a[2] + v * ab[2]]); }
  const cp = sub(p, c), d5 = dot(ab, cp), d6 = dot(ac, cp);
  if (d6 >= 0 && d5 <= d6) return D(c);
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); return D([a[0] + w * ac[0], a[1] + w * ac[1], a[2] + w * ac[2]]); }
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
    const w = (d4 - d3) / (d4 - d3 + (d5 - d6));
    return D([b[0] + w * (c[0] - b[0]), b[1] + w * (c[1] - b[1]), b[2] + w * (c[2] - b[2])]);
  }
  const den = 1 / (va + vb + vc), v = vb * den, w = vc * den;
  return D([a[0] + ab[0] * v + ac[0] * w, a[1] + ab[1] * v + ac[1] * w, a[2] + ab[2] * v + ac[2] * w]);
}

/** O poziție a vârfului frezei pe traseu, cu felul mutării care ajunge în ea (`rapida`: G0, prin aer). */
export type PasO = PunctO & { readonly rapida: boolean };

/** Ce găsește simulatorul de material: cât a intrat freza cel mai adânc în lemn la o tăiere și la o rapidă, și unde. */
export type MaterialO = {
  readonly taiere: number; readonly unde: PunctO | null;
  readonly rapida: number; readonly undeRapida: PunctO | null;
};

/**
 * Pasul pe trecere, pe material (felia 18.1↑c-2, invarianta „niciodată mai adânc decât pasul pe trecere”): un simulator de
 * material independent de lucrare. Placa e o grilă de coloane (pasul `pasGrila`, pe dreptunghiul `zona`), cu fața la `fata`.
 * Adâncimea unei mutări e cât lemn stă, ÎNAINTEA ei, deasupra suprafeței frezei în oricare poziție a ei (eșantionată la
 * `pasEs`): coloana minus (vârful plus urcarea la raza coloanei). Așa o plonjare de 2 mm măsoară 2 mm, nu pasul eșantionului.
 * După măsurare, coloanele coboară la suprafața frezei. Prima poziție vine prin aer. Întoarce cel mai adânc, separat pentru
 * tăieri și pentru rapide (o rapidă nu trebuie să atingă lemnul deloc).
 */
export function materialO(
  pasi: readonly PasO[], f: FrezaO, zona: { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number },
  pasGrila: number, fata = 0, pasEs = pasGrila / 2,
): MaterialO {
  const nx = Math.max(1, Math.ceil((zona.x1 - zona.x0) / pasGrila)), ny = Math.max(1, Math.ceil((zona.y1 - zona.y0) / pasGrila));
  const H = new Float64Array(nx * ny).fill(fata);
  let taiere = 0, rapida = 0, unde: PunctO | null = null, undeRapida: PunctO | null = null;
  const k = Math.ceil(f.R / pasGrila) + 1;
  const jos = new Map<number, number>();
  for (let q = 1; q < pasi.length; q++) {
    const a = pasi[q - 1]!, b = pasi[q]!;
    const L = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z), n = Math.max(1, Math.ceil(L / pasEs));
    let adanc = 0, aici: PunctO | null = null;
    jos.clear();
    for (let s = 1; s <= n; s++) {
      const u = s / n, x = a.x + u * (b.x - a.x), y = a.y + u * (b.y - a.y), z = a.z + u * (b.z - a.z);
      const ci = Math.floor((x - zona.x0) / pasGrila), cj = Math.floor((y - zona.y0) / pasGrila);
      for (let j = Math.max(0, cj - k); j <= Math.min(ny - 1, cj + k); j++) {
        for (let i = Math.max(0, ci - k); i <= Math.min(nx - 1, ci + k); i++) {
          const qx = zona.x0 + (i + 0.5) * pasGrila, qy = zona.y0 + (j + 0.5) * pasGrila, r = Math.hypot(qx - x, qy - y);
          if (r > f.R) continue;
          const sup = z + urcareO(f, r), c = j * nx + i;
          if (H[c]! - sup > adanc) { adanc = H[c]! - sup; aici = { x, y, z }; }
          const v = jos.get(c);
          if (v === undefined || sup < v) jos.set(c, sup);
        }
      }
    }
    for (const [c, v] of jos) if (v < H[c]!) H[c] = v;
    if (b.rapida) { if (adanc > rapida) { rapida = adanc; undeRapida = aici; } } else if (adanc > taiere) { taiere = adanc; unde = aici; }
  }
  return { taiere, unde, rapida, undeRapida };
}
