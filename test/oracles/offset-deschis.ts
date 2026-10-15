/**
 * ORACOLUL offsetului DESCHIS (ADR 0037 §5, cu precizările 2.3c-4, și „Ce verifică oracolul”, al treilea punct), cu ZERO
 * importuri din `src/` și fără cavalier. Geometria e scrisă aici din nou, din textul contractului și din convenția
 * conturului (fiecare vârf poartă segmentul care pleacă din el; bulge = tan(baleiaj / 4), pozitiv în sens trigonometric;
 * o cale deschisă cu n vârfuri are n − 1 segmente, iar segmentul ultimului vârf nu se ia în seamă), nu din codul
 * aplicației: dacă aplicația și oracolul ar împărți o formulă, o greșeală acolo ar trece prin amândouă.
 *
 * Offsetul ideal la distanța d (d > 0 = stânga mersului, d < 0 = dreapta) e făcut din:
 * - curba c(t) + d·n(t) a fiecărui segment (n = normala stângă a tangentei): la linie o linie paralelă, la arc un arc
 *   concentric cu raza r − d·semn(baleiaj) (negativă = arcul trece de partea cealaltă a centrului);
 * - evantaiul fiecărui colț CONVEX dinspre sculă: arcul de rază |d| din jurul vârfului, de la d·n(intrare) la
 *   d·n(ieșire), cu unghiul de cotire φ (convex dinspre sculă ⇔ d·φ < 0). Capetele căii n-au capace.
 * Un punct ideal e VALID dacă distanța lui la toată calea e cel puțin |d| − 1e-5 (ADR 0037 §5, „Acoperirea”). Mulțimea
 * punctelor valide se calculează EXACT, nu din eșantioane: regiunea aflată la mai puțin de ρ = |d| − 1e-5 de un segment
 * al căii e o reuniune de discuri (capetele), un dreptunghi (linia) sau un sector de coroană (arcul, după împărțirea
 * arcelor de peste 180°), iar intersecția ei cu o curbă ideală (linie sau arc) se rezolvă cu ecuații de gradul doi și
 * cu inecuații în cos(θ − μ). Pe ea se judecă:
 * - abaterea Hausdorff, în ambele sensuri, ≤ 0,002 mm între traseu și mulțimea validă (traseu → ideal: fiecare eșantion
 *   al traseului; ideal → traseu: fiecare eșantion al mulțimii valide, adică acoperirea). Asta cuprinde distanța, partea,
 *   capetele (nicio prelungire dincolo de normală, niciun ocol al capătului) și dispariția unei bucăți;
 * - `neatins` pe hârtie: porțiunile căii (în mm pe curbă, de la vârful 0) ale căror puncte ideale de segment nu sunt
 *   valide, unite peste vârfuri, cu `la` = punctul căii din mijlocul porțiunii (precizările 2.3c-4);
 * - forma bucăților, sensul desenului, ordinea de-a lungul căii și atingerile (cu cele două excepții ale contractului:
 *   dus-întorsul la lățimea 2R ± 1e-4 și bucata care se închide în start).
 *
 * Alegerile mele unde contractul tace (toate sunt și în `ALEGERI`, și în raportul oracolului):
 * - eșantioanele au pasul 0,025 mm (jumătate din pasul contractului), plus capetele fiecărei bucăți de curbă;
 * - porțiunile `neatins` mai scurte de 0,05 mm (pasul contractului) pot lipsi din oricare parte; celelalte se potrivesc la
 *   1e-4 mm pe `de` și `pana` (marginile oracolului sunt exacte, cu marja de validitate inclusă);
 * - un refuz „nu încape” e justificat dacă oracolul n-are niciun punct ideal valid la |d| SAU la |d| + 1e-4 (distanța
 *   reîncercării): contractul nu spune față de care se judecă refuzul de după reîncercare;
 * - „se ating” = mai aproape de 1e-6 mm; două segmente VECINE se ating doar dacă se mai taie la peste
 *   max(1e-5, 1e-7 × cea mai mare lungime sau rază) de vârful comun, sau dacă se suprapun (punctul de la jumătatea
 *   lungimii mai scurte, de la vârful comun, stă pe celălalt): așa se iartă contactul fals al unei joncțiuni tangente;
 * - sensul desenului se judecă pe poziția pe cale a picioarelor fiecărui eșantion (orice punct ideal valid la cel mult
 *   0,002 mm de el), cu toleranța 0,01 mm; ordinea bucăților, pe picioarele startului lor;
 * - curățarea intrării urmează §5 („Intrarea”); scoaterea vârfurilor de pe o latură dreaptă nu schimbă geometria;
 * - arcele aproape drepte (|bulge| < 1e-9) ale IEȘIRII se socotesc linii (săgeata sub 5e-10 × coarda).
 */

export type PunctD = { readonly x: number; readonly y: number };

export type SegmentD =
  | { readonly tip: 'L' }
  | { readonly tip: 'A'; readonly bulge: number }
  | { readonly tip: 'C'; readonly c1: PunctD; readonly c2: PunctD };

export type VarfD = { readonly p: PunctD; readonly s: SegmentD };

export type ConturD = { readonly inchis: boolean; readonly varfuri: readonly VarfD[] };

/** Forma lui `neatins` din precizările 2.3c-4. */
export type PortiuneD = { readonly de: number; readonly pana: number; readonly lungime: number; readonly la: PunctD };

/** Forma rezultatului din ADR 0037 §5 („Ce întoarce”). */
export type RezultatD =
  | { readonly ok: true; readonly bucati: readonly ConturD[]; readonly neatins: readonly PortiuneD[] }
  | { readonly ok: false; readonly motiv: string };

/** Pragurile contractului (ADR 0037 §5 și 2.1), copiate din text, nu din aplicație. */
export const PRAGURI = {
  /** Rezoluția declarată, în mm: o cale mai scurtă e refuzată. */
  rezolutie: 0.01,
  /** Sub ea, distanța e refuzată. */
  distantaMinima: 0.005,
  /** Două puncte mai apropiate sunt unul, două segmente mai apropiate se ating. */
  atingere: 1e-6,
  /** Un arc cu |bulge| sub el e o linie. */
  bulgeMinim: 1e-6,
  /** Un segment mai scurt (pe curbă) se unește cu vecinul. */
  segmentMinim: 1e-6,
  /** Un vârf mai aproape de dreapta vecinilor (și între ei) se scoate. */
  coliniar: 1e-6,
  /** Abaterea maximă: distanța, acoperirea și Hausdorff-ul în ambele sensuri. */
  abatere: 0.002,
  /** Un punct ideal e valid la cel puțin |d| − atât de cale. */
  marjaValid: 1e-5,
  /** Pasul eșantioanelor ideale din contract. */
  pasContract: 0.05,
  /** Pasul reîncercării. */
  reincercare: 1e-4,
  /** Dus-întorsul se acceptă la lățimea 2R ± atât. */
  canal: 1e-4,
} as const;

/** Alegerile oracolului (vezi antetul). */
export const ALEGERI = {
  pasEsantion: 0.025,
  tolerantaNeatins: 1e-4,
  portiuneMinima: 0.05,
  lipire: 1e-3,
  tolerantaSens: 0.01,
} as const;

export const MOTIV_NU_INCAPE = 'scula nu încape pe partea cerută';
export const MOTIV_ESUAT = 'offsetul a eșuat';
export const MOTIV_INCRUCISARE = 'după încrucișare partea nu mai e definită: alege pe linie';

const el = <T>(xs: readonly T[], i: number): T => xs[i] as T;
const DOI_PI = 2 * Math.PI;
const fx = (n: number): string => (Number.isFinite(n) ? n.toFixed(4) : String(n));
const pt = (x: number, y: number): string => `(${fx(x)}, ${fx(y)})`;

// ---------------------------------------------------------------------------------------------------------------------
// Primitiva: o linie sau un arc, cu cadrul coardei (mijlocul, tangenta, normala ν spre partea arcului) și cu centrul.
// ---------------------------------------------------------------------------------------------------------------------

export type Prim = {
  readonly arc: boolean;
  readonly ax: number;
  readonly ay: number;
  readonly bx: number;
  readonly by: number;
  readonly bulge: number;
  /** Coarda și jumătatea ei. */
  readonly L: number;
  readonly h: number;
  /** Tangenta unitară a coardei, a → b. */
  readonly tx: number;
  readonly ty: number;
  readonly mx: number;
  readonly my: number;
  /** ν: spre partea arcului (la linie: normala stângă). */
  readonly vx: number;
  readonly vy: number;
  /** Centrul e în M − k·ν; k > 0 la arcul mic, < 0 la cel mare. */
  readonly k: number;
  readonly r: number;
  readonly cx: number;
  readonly cy: number;
  /** Unghiul startului văzut din centru și baleiajul cu semn. */
  readonly t0: number;
  readonly sw: number;
  readonly lungime: number;
};

/** Sub atât, un arc al ieșirii e socotit linie: săgeata lui e sub 5e-10 × coarda. */
const BULGE_PLAT = 1e-9;

export function prim(ax: number, ay: number, bx: number, by: number, bulge: number): Prim {
  const dx = bx - ax;
  const dy = by - ay;
  const L = Math.hypot(dx, dy);
  const tx = L > 0 ? dx / L : 0;
  const ty = L > 0 ? dy / L : 0;
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;
  const h = L / 2;
  const ab = Math.abs(bulge);
  if (!(ab >= BULGE_PLAT) || L === 0) {
    return { arc: false, ax, ay, bx, by, bulge: 0, L, h, tx, ty, mx, my, vx: -ty, vy: tx, k: 0, r: 0, cx: mx, cy: my, t0: 0, sw: 0, lungime: L };
  }
  // bulge > 0: arcul merge trigonometric, deci stă la DREAPTA coardei a → b.
  const sg = bulge > 0 ? 1 : -1;
  const vx = sg * ty;
  const vy = -sg * tx;
  const k = (L * (1 - ab * ab)) / (4 * ab);
  const r = (L * (1 + ab * ab)) / (4 * ab);
  const cx = mx - k * vx;
  const cy = my - k * vy;
  const sw = 4 * Math.atan(bulge);
  return { arc: true, ax, ay, bx, by, bulge, L, h, tx, ty, mx, my, vx, vy, k, r, cx, cy, t0: Math.atan2(ay - cy, ax - cx), sw, lungime: r * Math.abs(sw) };
}

/** Arcul dat prin centru, rază, unghiul startului și baleiajul cu semn (|baleiaj| < 2π). */
export function arcCentru(cx: number, cy: number, r: number, t0: number, sw: number): Prim {
  return prim(cx + r * Math.cos(t0), cy + r * Math.sin(t0), cx + r * Math.cos(t0 + sw), cy + r * Math.sin(t0 + sw), Math.tan(sw / 4));
}

/** Punctul aflat la fracțiunea f din lungimea primitivei (fără diferența a două numere mari la arcele plate). */
export function punctLa(P: Prim, f: number): PunctD {
  if (f <= 0) return { x: P.ax, y: P.ay };
  if (f >= 1) return { x: P.bx, y: P.by };
  if (!P.arc) return { x: P.ax + (P.bx - P.ax) * f, y: P.ay + (P.by - P.ay) * f };
  const psi = Math.abs(P.sw) * (f - 0.5);
  const sj = Math.sin(psi / 2);
  const u = P.r * Math.sin(psi);
  const w = P.h * Math.abs(P.bulge) - 2 * P.r * sj * sj;
  return { x: P.mx + P.tx * u + P.vx * w, y: P.my + P.ty * u + P.vy * w };
}

/** Tangenta unitară în sensul de mers, la fracțiunea f. */
export function tangentaLa(P: Prim, f: number): PunctD {
  if (!P.arc) return { x: P.tx, y: P.ty };
  const a = P.sw * (Math.min(1, Math.max(0, f)) - 0.5);
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: P.tx * c - P.ty * s, y: P.tx * s + P.ty * c };
}

/** Testul de baleiaj în cadrul coardei: direcția punctului din centru e în arc (și pentru arcul mare). */
function inBaleiaj(P: Prim, x: number, y: number): boolean {
  const dx = x - P.mx;
  const dy = y - P.my;
  const u = dx * P.tx + dy * P.ty;
  const w = dx * P.vx + dy * P.vy;
  return P.k * (Math.abs(u) - P.h) <= P.h * w;
}

/**
 * Distanța exactă de la (x, y) la primitivă. La arc: distanța la cerc dacă direcția punctului e în baleiaj, altfel la
 * capătul mai apropiat; distanța la cerc e |N| / D, cu N = u² + w² + 2wk − h² și D = √(u² + (w + k)²) + r.
 */
export function distPunct(P: Prim, x: number, y: number): number {
  const dx = x - P.mx;
  const dy = y - P.my;
  if (P.L === 0) return Math.hypot(dx, dy);
  const u = dx * P.tx + dy * P.ty;
  const w = dx * P.vx + dy * P.vy;
  const au = Math.abs(u);
  if (P.arc) {
    if (P.k * (au - P.h) <= P.h * w) {
      const N = u * u + w * w + 2 * w * P.k - P.h * P.h;
      const D = Math.hypot(u, w + P.k) + P.r;
      return Math.abs(N) / D;
    }
    return Math.hypot(au - P.h, w);
  }
  if (au <= P.h) return Math.abs(w);
  return Math.hypot(au - P.h, w);
}

/** Fracțiunea punctului primitivei cel mai apropiat de (x, y). */
export function parametru(P: Prim, x: number, y: number): number {
  if (P.L === 0) return 0;
  if (!P.arc) return Math.min(1, Math.max(0, ((x - P.ax) * P.tx + (y - P.ay) * P.ty) / P.L));
  const dx = x - P.mx;
  const dy = y - P.my;
  const u = dx * P.tx + dy * P.ty;
  const w = dx * P.vx + dy * P.vy;
  if (P.k * (Math.abs(u) - P.h) <= P.h * w) return Math.min(1, Math.max(0, 0.5 + Math.atan2(u, w + P.k) / Math.abs(P.sw)));
  return u < 0 ? 0 : 1;
}

export type Cutie = { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number };

export function cutie(P: Prim, marja = 0): Cutie {
  let x0 = Math.min(P.ax, P.bx);
  let x1 = Math.max(P.ax, P.bx);
  let y0 = Math.min(P.ay, P.by);
  let y1 = Math.max(P.ay, P.by);
  if (P.arc) {
    for (const [ex, ey] of [[1, 0], [0, 1], [-1, 0], [0, -1]] as const) {
      const x = P.cx + P.r * ex;
      const y = P.cy + P.r * ey;
      if (inBaleiaj(P, x, y)) {
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y);
      }
    }
  }
  return { x0: x0 - marja, y0: y0 - marja, x1: x1 + marja, y1: y1 + marja };
}

const cutiePunct = (x: number, y: number, r: number): Cutie => ({ x0: x - r, y0: y - r, x1: x + r, y1: y + r });

/** Primitivele unei căi (n − 1 la cea deschisă, n la cea închisă). */
export function prime(c: ConturD): Prim[] {
  const v = c.varfuri;
  const m = c.inchis ? v.length : v.length - 1;
  const rez: Prim[] = [];
  for (let i = 0; i < m; i++) {
    const a = el(v, i);
    const b = el(v, (i + 1) % v.length);
    rez.push(prim(a.p.x, a.p.y, b.p.x, b.p.y, a.s.tip === 'A' ? a.s.bulge : 0));
  }
  return rez;
}

// ---------------------------------------------------------------------------------------------------------------------
// Indexul: o grilă uniformă de cutii. O întrebare întoarce un SUPERSET (cutiile care se intersectează), filtrat apoi exact.
// ---------------------------------------------------------------------------------------------------------------------

export type Index = { readonly vizita: (c: Cutie, f: (i: number) => void) => void };

export function indexeaza(cutii: readonly Cutie[]): Index {
  const n = cutii.length;
  if (n === 0) return { vizita: () => undefined };
  let X0 = Infinity;
  let Y0 = Infinity;
  let X1 = -Infinity;
  let Y1 = -Infinity;
  let diag = 0;
  for (const c of cutii) {
    X0 = Math.min(X0, c.x0);
    Y0 = Math.min(Y0, c.y0);
    X1 = Math.max(X1, c.x1);
    Y1 = Math.max(Y1, c.y1);
    diag += Math.hypot(c.x1 - c.x0, c.y1 - c.y0);
  }
  const W = Math.max(X1 - X0, 1e-9);
  const H = Math.max(Y1 - Y0, 1e-9);
  let pas = Math.max(diag / n, Math.sqrt((W * H) / n), 1e-6);
  while ((Math.floor(W / pas) + 1) * (Math.floor(H / pas) + 1) > 1 << 20) pas *= 2;
  const nx = Math.floor(W / pas) + 1;
  const ny = Math.floor(H / pas) + 1;
  const ix = (x: number): number => Math.min(nx - 1, Math.max(0, Math.floor((x - X0) / pas)));
  const iy = (y: number): number => Math.min(ny - 1, Math.max(0, Math.floor((y - Y0) / pas)));
  const celule: (number[] | undefined)[] = [];
  for (let i = 0; i < n; i++) {
    const c = el(cutii, i);
    for (let a = ix(c.x0); a <= ix(c.x1); a++) {
      for (let b = iy(c.y0); b <= iy(c.y1); b++) (celule[a * ny + b] ??= []).push(i);
    }
  }
  const vazut = new Uint32Array(n);
  let ceas = 0;
  return {
    vizita(c, f) {
      if (c.x1 < X0 || c.x0 > X1 || c.y1 < Y0 || c.y0 > Y1) return;
      ceas++;
      if (ceas >= 0xfffffff0) {
        vazut.fill(0);
        ceas = 1;
      }
      for (let a = ix(c.x0); a <= ix(c.x1); a++) {
        for (let b = iy(c.y0); b <= iy(c.y1); b++) {
          const lista = celule[a * ny + b];
          if (!lista) continue;
          for (const i of lista) {
            if (vazut[i] === ceas) continue;
            vazut[i] = ceas;
            const ci = el(cutii, i);
            if (ci.x1 < c.x0 || ci.x0 > c.x1 || ci.y1 < c.y0 || ci.y0 > c.y1) continue;
            f(i);
          }
        }
      }
    },
  };
}

/** Cea mai mică distanță de la (x, y) la primitivele indexate, căutată până la `raza` (Infinity dincolo). */
function distantaIndexata(prims: readonly Prim[], index: Index, x: number, y: number, raza: number): number {
  let best = Infinity;
  index.vizita(cutiePunct(x, y, raza), (i) => {
    best = Math.min(best, distPunct(el(prims, i), x, y));
  });
  return best <= raza ? best : Infinity;
}

// ---------------------------------------------------------------------------------------------------------------------
// Mulțimile de parametri: reuniuni de intervale din [0, 1], și predicatele „în semiplan” și „în disc” pe o primitivă.
// ---------------------------------------------------------------------------------------------------------------------

export type Interval = readonly [number, number];
export type Multime = readonly Interval[];
const TOT: Multime = [[0, 1]];
const GOL: Multime = [];

function normalizeaza(xs: ReadonlyArray<readonly [number, number]>): Multime {
  const v = xs
    .map(([a, b]) => [Math.max(0, a), Math.min(1, b)] as [number, number])
    .filter(([a, b]) => b > a)
    .sort((p, q) => p[0] - q[0]);
  const rez: [number, number][] = [];
  for (const [a, b] of v) {
    const u = rez[rez.length - 1];
    if (u && a <= u[1]) u[1] = Math.max(u[1], b);
    else rez.push([a, b]);
  }
  return rez;
}

function intersecteaza(a: Multime, b: Multime): Multime {
  const rez: [number, number][] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    const p = el(a, i);
    const q = el(b, j);
    const lo = Math.max(p[0], q[0]);
    const hi = Math.min(p[1], q[1]);
    if (hi > lo) rez.push([lo, hi]);
    if (p[1] < q[1]) i++;
    else j++;
  }
  return rez;
}

function reuneste(a: Multime, b: Multime): Multime {
  if (a.length === 0) return b;
  if (b.length === 0) return a;
  return normalizeaza([...a, ...b]);
}

function complementar(a: Multime): Multime {
  const rez: [number, number][] = [];
  let cur = 0;
  for (const [lo, hi] of a) {
    if (lo > cur) rez.push([cur, lo]);
    cur = Math.max(cur, hi);
  }
  if (cur < 1) rez.push([cur, 1]);
  return rez;
}

const esteTot = (m: Multime): boolean => m.length === 1 && el(m, 0)[0] <= 0 && el(m, 0)[1] >= 1;

/** {u ∈ [0, 1] : k0 + k1·u < c}. */
function liniar(k0: number, k1: number, c: number): Multime {
  if (k1 === 0) return k0 < c ? TOT : GOL;
  const u = (c - k0) / k1;
  return k1 > 0 ? normalizeaza([[0, u]]) : normalizeaza([[u, 1]]);
}

/** {u ∈ [0, 1] : A·u² + B·u + C < 0}, cu rădăcinile în forma stabilă. */
function patratic(A: number, B: number, C: number): Multime {
  if (A === 0) return liniar(C, B, 0);
  const disc = B * B - 4 * A * C;
  if (!(disc > 0)) return GOL;
  const sq = Math.sqrt(disc);
  const q = -0.5 * (B + (B >= 0 ? sq : -sq));
  const r1 = q / A;
  const r2 = C / q;
  return normalizeaza([[Math.min(r1, r2), Math.max(r1, r2)]]);
}

/** {u ∈ [0, 1] : A·cos(x0 + u·sw) < K}, cu A ≥ 0: cos x < k ⇔ x ∈ (β, 2π − β) mod 2π, β = acos k. */
function cosMaiMic(x0: number, sw: number, A: number, K: number): Multime {
  if (!(A > 0)) return K > 0 ? TOT : GOL;
  const k = K / A;
  if (k > 1) return TOT;
  if (k <= -1) return GOL;
  const beta = Math.acos(k);
  if (sw === 0) return Math.cos(x0) < k ? TOT : GOL;
  const xa = Math.min(x0, x0 + sw);
  const xb = Math.max(x0, x0 + sw);
  const rez: [number, number][] = [];
  const j0 = Math.floor((xa - (DOI_PI - beta)) / DOI_PI);
  const j1 = Math.ceil((xb - beta) / DOI_PI);
  for (let j = j0; j <= j1; j++) {
    const lo = Math.max(xa, beta + DOI_PI * j);
    const hi = Math.min(xb, DOI_PI - beta + DOI_PI * j);
    if (hi > lo) {
      const u1 = (lo - x0) / sw;
      const u2 = (hi - x0) / sw;
      rez.push([Math.min(u1, u2), Math.max(u1, u2)]);
    }
  }
  return normalizeaza(rez);
}

/** Parametrii pentru care punctul primitivei e în semiplanul (p − o)·m < c. */
function inSemiplan(P: Prim, ox: number, oy: number, mx: number, my: number, c: number): Multime {
  if (!P.arc) {
    const k0 = (P.ax - ox) * mx + (P.ay - oy) * my;
    const k1 = (P.bx - P.ax) * mx + (P.by - P.ay) * my;
    return liniar(k0, k1, c);
  }
  const K0 = (P.cx - ox) * mx + (P.cy - oy) * my;
  return cosMaiMic(P.t0 - Math.atan2(my, mx), P.sw, P.r * Math.hypot(mx, my), c - K0);
}

/** Parametrii pentru care punctul primitivei e în discul deschis de centru o și rază R. */
function inDisc(P: Prim, ox: number, oy: number, R: number): Multime {
  if (!P.arc) {
    const vx = P.bx - P.ax;
    const vy = P.by - P.ay;
    const wx = P.ax - ox;
    const wy = P.ay - oy;
    return patratic(vx * vx + vy * vy, 2 * (wx * vx + wy * vy), wx * wx + wy * wy - R * R);
  }
  const wx = P.cx - ox;
  const wy = P.cy - oy;
  const D = Math.hypot(wx, wy);
  // |w + r·u(θ)|² = D² + r² + 2rD·cos(θ − μ) < R²
  return cosMaiMic(P.t0 - Math.atan2(wy, wx), P.sw, 2 * P.r * D, R * R - D * D - P.r * P.r);
}

/**
 * Parametrii primitivei ideale P aflați la mai puțin de ρ de segmentul S al căii. Linia: două discuri și un dreptunghi
 * (patru semiplane). Arcul (baleiaj ≤ 180°): două discuri și un sector de coroană (două discuri și pana dintre două
 * semiplane prin centru).
 */
function invalidPrin(P: Prim, S: Prim, rho: number): Multime {
  let rez = reuneste(inDisc(P, S.ax, S.ay, rho), inDisc(P, S.bx, S.by, rho));
  if (esteTot(rez) || S.L === 0) return rez;
  if (!S.arc) {
    const nx = -S.ty;
    const ny = S.tx;
    let m = inSemiplan(P, S.ax, S.ay, -S.tx, -S.ty, 0);
    m = intersecteaza(m, inSemiplan(P, S.ax, S.ay, S.tx, S.ty, S.L));
    m = intersecteaza(m, inSemiplan(P, S.ax, S.ay, nx, ny, rho));
    m = intersecteaza(m, inSemiplan(P, S.ax, S.ay, -nx, -ny, rho));
    return reuneste(rez, m);
  }
  let m = inDisc(P, S.cx, S.cy, S.r + rho);
  if (S.r - rho > 0) m = intersecteaza(m, complementar(inDisc(P, S.cx, S.cy, S.r - rho)));
  const u0x = Math.cos(S.t0);
  const u0y = Math.sin(S.t0);
  const u1x = Math.cos(S.t0 + S.sw);
  const u1y = Math.sin(S.t0 + S.sw);
  const sg = S.sw > 0 ? 1 : -1;
  m = intersecteaza(m, inSemiplan(P, S.cx, S.cy, sg * u0y, -sg * u0x, 0));
  m = intersecteaza(m, inSemiplan(P, S.cx, S.cy, -sg * u1y, sg * u1x, 0));
  rez = reuneste(rez, m);
  return rez;
}

// ---------------------------------------------------------------------------------------------------------------------
// Intersecțiile și distanța dintre două primitive (atingerile).
// ---------------------------------------------------------------------------------------------------------------------

function peArcSauCapat(A: Prim, x: number, y: number): boolean {
  return inBaleiaj(A, x, y) || Math.hypot(x - A.ax, y - A.ay) < 1e-9 || Math.hypot(x - A.bx, y - A.by) < 1e-9;
}

/** Punctele comune (transversale sau tangente) a două primitive; suprapunerile pe o lungime se judecă separat. */
export function intersectii(P: Prim, Q: Prim): PunctD[] {
  if (P.L === 0 || Q.L === 0) return [];
  const rez: PunctD[] = [];
  const e = 1e-12;
  if (!P.arc && !Q.arc) {
    const ux = P.bx - P.ax;
    const uy = P.by - P.ay;
    const vx = Q.bx - Q.ax;
    const vy = Q.by - Q.ay;
    const den = ux * vy - uy * vx;
    if (Math.abs(den) <= 1e-14 * P.L * Q.L) return rez;
    const wx = Q.ax - P.ax;
    const wy = Q.ay - P.ay;
    const t = (wx * vy - wy * vx) / den;
    const s = (wx * uy - wy * ux) / den;
    if (t >= -e && t <= 1 + e && s >= -e && s <= 1 + e) rez.push({ x: P.ax + t * ux, y: P.ay + t * uy });
    return rez;
  }
  if (!P.arc || !Q.arc) {
    const Lp = P.arc ? Q : P;
    const A = P.arc ? P : Q;
    const vx = Lp.bx - Lp.ax;
    const vy = Lp.by - Lp.ay;
    const wx = Lp.ax - A.cx;
    const wy = Lp.ay - A.cy;
    const qa = vx * vx + vy * vy;
    const qb = 2 * (wx * vx + wy * vy);
    const qc = wx * wx + wy * wy - A.r * A.r;
    const disc = qb * qb - 4 * qa * qc;
    if (disc < 0) return rez;
    const sq = Math.sqrt(disc);
    for (const t of [(-qb - sq) / (2 * qa), (-qb + sq) / (2 * qa)]) {
      if (t < -e || t > 1 + e) continue;
      const x = Lp.ax + t * vx;
      const y = Lp.ay + t * vy;
      if (peArcSauCapat(A, x, y)) rez.push({ x, y });
    }
    return rez;
  }
  const dx = Q.cx - P.cx;
  const dy = Q.cy - P.cy;
  const D = Math.hypot(dx, dy);
  if (D === 0 || D > P.r + Q.r || D < Math.abs(P.r - Q.r)) return rez;
  const a = (P.r * P.r - Q.r * Q.r + D * D) / (2 * D);
  const h2 = P.r * P.r - a * a;
  const hh = h2 > 0 ? Math.sqrt(h2) : 0;
  const px = P.cx + (a * dx) / D;
  const py = P.cy + (a * dy) / D;
  for (const s of hh > 0 ? [1, -1] : [1]) {
    const x = px - (s * hh * dy) / D;
    const y = py + (s * hh * dx) / D;
    if (peArcSauCapat(P, x, y) && peArcSauCapat(Q, x, y)) rez.push({ x, y });
  }
  return rez;
}

type Candidat = { readonly d: number; readonly x: number; readonly y: number };

/**
 * Candidații la distanța minimă dintre două primitive, fiecare cu un punct de pe P: capetele fiecăreia față de cealaltă,
 * intersecțiile și punctele critice interioare (perpendiculara comună trece prin centru).
 */
function candidati(P: Prim, Q: Prim): Candidat[] {
  const rez: Candidat[] = [];
  const cand = (x: number, y: number, d: number): void => {
    rez.push({ d, x, y });
  };
  const peP = (x: number, y: number, d: number): void => {
    const p = punctLa(P, parametru(P, x, y));
    cand(p.x, p.y, d);
  };
  cand(P.ax, P.ay, distPunct(Q, P.ax, P.ay));
  cand(P.bx, P.by, distPunct(Q, P.bx, P.by));
  peP(Q.ax, Q.ay, distPunct(P, Q.ax, Q.ay));
  peP(Q.bx, Q.by, distPunct(P, Q.bx, Q.by));
  for (const p of intersectii(P, Q)) cand(p.x, p.y, 0);
  if (P.arc && !Q.arc) {
    for (const s of [1, -1]) {
      const x = P.cx + s * P.r * -Q.ty;
      const y = P.cy + s * P.r * Q.tx;
      if (inBaleiaj(P, x, y)) cand(x, y, distPunct(Q, x, y));
    }
  } else if (!P.arc && Q.arc) {
    for (const s of [1, -1]) {
      const x = Q.cx + s * Q.r * -P.ty;
      const y = Q.cy + s * Q.r * P.tx;
      if (inBaleiaj(Q, x, y)) peP(x, y, distPunct(P, x, y));
    }
  } else if (P.arc && Q.arc) {
    const dx = Q.cx - P.cx;
    const dy = Q.cy - P.cy;
    const D = Math.hypot(dx, dy);
    if (D > 1e-12) {
      for (const s of [1, -1]) {
        const x1 = P.cx + (s * P.r * dx) / D;
        const y1 = P.cy + (s * P.r * dy) / D;
        if (inBaleiaj(P, x1, y1)) cand(x1, y1, distPunct(Q, x1, y1));
        const x2 = Q.cx + (s * Q.r * dx) / D;
        const y2 = Q.cy + (s * Q.r * dy) / D;
        if (inBaleiaj(Q, x2, y2)) peP(x2, y2, distPunct(P, x2, y2));
      }
    } else {
      for (const [qx, qy] of [[Q.ax, Q.ay], [Q.bx, Q.by]] as const) {
        const n = Math.hypot(qx - P.cx, qy - P.cy);
        if (n === 0) continue;
        const x = P.cx + (P.r * (qx - P.cx)) / n;
        const y = P.cy + (P.r * (qy - P.cy)) / n;
        if (inBaleiaj(P, x, y)) cand(x, y, distPunct(Q, x, y));
      }
      for (const [px, py] of [[P.ax, P.ay], [P.bx, P.by]] as const) {
        const n = Math.hypot(px - Q.cx, py - Q.cy);
        if (n === 0) continue;
        const x = Q.cx + (Q.r * (px - Q.cx)) / n;
        const y = Q.cy + (Q.r * (py - Q.cy)) / n;
        if (inBaleiaj(Q, x, y)) peP(x, y, distPunct(P, x, y));
      }
    }
  }
  return rez;
}

/** Distanța minimă dintre două primitive și un punct de pe P în locul ei. */
export function distPrimPrim(P: Prim, Q: Prim): Candidat {
  let best: Candidat = { d: Infinity, x: P.ax, y: P.ay };
  for (const c of candidati(P, Q)) if (c.d < best.d) best = c;
  return best;
}

/** Punctul primitivei aflat la lungimea l de capătul ei cel mai apropiat de V. */
function punctDeLaCapat(P: Prim, vx: number, vy: number, l: number): PunctD {
  const f = P.lungime > 0 ? l / P.lungime : 0;
  const laStart = Math.hypot(P.ax - vx, P.ay - vy) <= Math.hypot(P.bx - vx, P.by - vy);
  return punctLa(P, laStart ? f : 1 - f);
}

/**
 * Două primitive care au în comun vârful V se ating (alegerea mea, din contractul 2.1 și precizarea recenziei 2.7b):
 * dacă se apropie la mai puțin de 1e-6 mm (sau se taie) la peste max(1e-5, 1e-7 × cea mai mare lungime sau rază) de V,
 * sau dacă se suprapun lângă V. Atingerea de lângă V a unei joncțiuni tangente (contactul fals) se iartă.
 */
function veciniSeAting(P: Prim, Q: Prim, vx: number, vy: number): PunctD | null {
  const tau = Math.max(1e-5, 1e-7 * Math.max(P.lungime, Q.lungime, P.r, Q.r));
  for (const c of candidati(P, Q)) if (c.d < PRAGURI.atingere && Math.hypot(c.x - vx, c.y - vy) > tau) return c;
  const l = Math.min(P.lungime, Q.lungime) / 2;
  if (l <= 0) return null;
  const pP = punctDeLaCapat(P, vx, vy, l);
  if (distPunct(Q, pP.x, pP.y) < PRAGURI.atingere) return pP;
  const pQ = punctDeLaCapat(Q, vx, vy, l);
  if (distPunct(P, pQ.x, pQ.y) < PRAGURI.atingere) return pQ;
  return null;
}

// ---------------------------------------------------------------------------------------------------------------------
// Intrarea: curățarea (§5, „Intrarea”) și refuzurile.
// ---------------------------------------------------------------------------------------------------------------------

/**
 * Curățarea căii deschise, fără nicio legătură peste capăt: arcele plate devin linii; arcele de peste 180° se împart în
 * două jumătăți pe același cerc; segmentele mai scurte de 1e-6 mm pe curbă se unesc (rămâne vârful cu indicele mai mic,
 * iar la capete pierde vârful dinspre interior, deci capetele nu se mută); vârfurile de pe o latură dreaptă se scot doar
 * din interior. Presupune o cale deschisă, finită și fără cubice pe segmentele reale.
 */
export function curata(c: ConturD): ConturD {
  const n0 = c.varfuri.length;
  let v = c.varfuri.map((x, i) => ({ p: x.p, b: i < n0 - 1 && x.s.tip === 'A' ? x.s.bulge : 0 }));
  for (const x of v) if (Math.abs(x.b) < PRAGURI.bulgeMinim) x.b = 0;
  const w: { p: PunctD; b: number }[] = [];
  for (let i = 0; i < v.length; i++) {
    const x = el(v, i);
    w.push(x);
    if (i < v.length - 1 && Math.abs(x.b) > 1) {
      const y = el(v, i + 1);
      const m = punctLa(prim(x.p.x, x.p.y, y.p.x, y.p.y, x.b), 0.5);
      const jum = Math.tan(Math.atan(x.b) / 2);
      x.b = jum;
      w.push({ p: m, b: jum });
    }
  }
  v = w;
  for (let schimbat = true; schimbat && v.length > 2; ) {
    schimbat = false;
    for (let i = 0; i < v.length - 1; i++) {
      const a = el(v, i);
      const b = el(v, i + 1);
      if (prim(a.p.x, a.p.y, b.p.x, b.p.y, a.b).lungime >= PRAGURI.segmentMinim) continue;
      const m = v.length - 1;
      if (i === m - 1) {
        // Ultimul segment: pierde vârful dinspre interior; penultimul vârf își duce segmentul până la capăt.
        v.splice(m - 1, 1);
      } else {
        a.b = b.b;
        v.splice(i + 1, 1);
      }
      schimbat = true;
      break;
    }
  }
  for (let schimbat = true; schimbat; ) {
    schimbat = false;
    for (let i = 1; i < v.length - 1; i++) {
      const a = el(v, i - 1);
      const x = el(v, i);
      const b = el(v, i + 1);
      if (a.b !== 0 || x.b !== 0) continue;
      const L = prim(a.p.x, a.p.y, b.p.x, b.p.y, 0);
      if (L.L === 0) continue;
      const t = ((x.p.x - a.p.x) * L.tx + (x.p.y - a.p.y) * L.ty) / L.L;
      if (t > 0 && t < 1 && distPunct(L, x.p.x, x.p.y) < PRAGURI.coliniar) {
        v.splice(i, 1);
        schimbat = true;
        break;
      }
    }
  }
  return {
    inchis: false,
    varfuri: v.map((x, i): VarfD => ({ p: x.p, s: i < v.length - 1 && x.b !== 0 ? { tip: 'A', bulge: x.b } : { tip: 'L' } })),
  };
}

/** Prima atingere a căii cu ea însăși (contractul §5: și capetele în același punct sau pe altă parte a căii), sau null. */
export function atingereaCaii(cale: readonly Prim[]): string | null {
  const cutii = cale.map((P) => cutie(P, PRAGURI.atingere));
  const index = indexeaza(cutii);
  for (let i = 0; i < cale.length; i++) {
    const P = el(cale, i);
    let gasit: string | null = null;
    index.vizita(el(cutii, i), (j) => {
      if (gasit !== null || j <= i) return;
      const Q = el(cale, j);
      if (j === i + 1) {
        const x = veciniSeAting(P, Q, P.bx, P.by);
        if (x) gasit = `segmentele vecine ${i} și ${j} se ating lângă ${pt(x.x, x.y)}`;
        return;
      }
      const d = distPrimPrim(P, Q);
      if (d.d < PRAGURI.atingere) gasit = `segmentele ${i} și ${j} se ating lângă ${pt(d.x, d.y)}`;
    });
    if (gasit !== null) return gasit;
  }
  return null;
}

/** De ce trebuie refuzată intrarea (ADR 0037 §5, „Intrarea” și distanța), sau null dacă e o intrare de decalat. */
export function motivRefuzIntrare(c: ConturD, d: number): string | null {
  if (c.inchis !== false) return 'calea e închisă';
  const v = c.varfuri;
  for (const x of v) if (!Number.isFinite(x.p.x) || !Number.isFinite(x.p.y)) return 'coordonate nefinite';
  for (let i = 0; i < v.length - 1; i++) {
    const s = el(v, i).s;
    if (s.tip === 'C') return 'cubică (întâi biarcele)';
    if (s.tip === 'A' && !Number.isFinite(s.bulge)) return 'bulge nefinit';
  }
  if (!Number.isFinite(d)) return 'distanța nu e un număr finit';
  if (Math.abs(d) < PRAGURI.distantaMinima) return 'distanța e sub rezoluție';
  if (v.length < 2) return 'mai puțin de 2 vârfuri';
  const p0 = el(v, 0).p;
  if (v.every((x) => Math.hypot(x.p.x - p0.x, x.p.y - p0.y) <= PRAGURI.atingere)) return 'mai puțin de 2 vârfuri distincte';
  const cale = prime(curata(c));
  const lungime = cale.reduce((s, P) => s + P.lungime, 0);
  if (lungime < PRAGURI.rezolutie) return `lungimea ${lungime} mm e sub rezoluție`;
  const a = atingereaCaii(cale);
  if (a !== null) return `calea se atinge singură: ${a}`;
  return null;
}

// ---------------------------------------------------------------------------------------------------------------------
// Offsetul ideal: piesele (segmente și evantaie), mulțimea validă (exactă), `neatins`.
// ---------------------------------------------------------------------------------------------------------------------

export type PiesaIdeala = {
  readonly prim: Prim;
  readonly fel: 'segment' | 'evantai';
  /** Indicele segmentului, sau al vârfului la evantai. */
  readonly k: number;
  /** Poziția pe cale a generatorului la u = 0 și u = 1 (egale la evantai). */
  readonly sDe: number;
  readonly sPana: number;
  readonly valid: Multime;
};

/** O bucată validă: primitiva ei și locul ei în piesa ideală. */
export type BucataValida = { readonly prim: Prim; readonly piesa: number; readonly lo: number; readonly hi: number };

export type Ideal = {
  readonly d: number;
  readonly curata: ConturD;
  readonly cale: readonly Prim[];
  readonly s0: readonly number[];
  readonly lungimeCale: number;
  readonly indexCale: Index;
  readonly piese: readonly PiesaIdeala[];
  readonly valide: readonly BucataValida[];
  readonly primeValide: readonly Prim[];
  readonly indexValide: Index;
  readonly lungimeValida: number;
  readonly neatins: readonly PortiuneD[];
};

/** Normala stângă. */
const normala = (t: PunctD): PunctD => ({ x: -t.y, y: t.x });

/** Punctul căii aflat la poziția s (mm pe curbă, de la vârful 0). */
export function punctPeCale(cale: readonly Prim[], s0: readonly number[], s: number): PunctD {
  for (let j = 0; j < cale.length; j++) {
    const P = el(cale, j);
    const a = el(s0, j);
    if (s <= a + P.lungime || j === cale.length - 1) return punctLa(P, P.lungime > 0 ? (s - a) / P.lungime : 0);
  }
  return { x: NaN, y: NaN };
}

/**
 * Offsetul ideal al căii deschise c (validă: vezi `motivRefuzIntrare`) la distanța d. `marja` e marja de validitate a
 * contractului (1e-5); traseul ideal folosește una aproape nulă (vezi `traseuIdeal`).
 */
export function idealDeschis(c: ConturD, d: number, marja: number = PRAGURI.marjaValid): Ideal {
  const cc = curata(c);
  const cale = prime(cc);
  const s0: number[] = [];
  let s = 0;
  for (const P of cale) {
    s0.push(s);
    s += P.lungime;
  }
  const lungimeCale = s;
  const indexCale = indexeaza(cale.map((P) => cutie(P)));
  const rho = Math.abs(d) - marja;

  const curbe: { prim: Prim; fel: 'segment' | 'evantai'; k: number; sDe: number; sPana: number }[] = [];
  for (let j = 0; j < cale.length; j++) {
    const S = el(cale, j);
    // c(t) + d·n(t): la arc, același bulge (același baleiaj), cu capetele mutate pe normale.
    const na = normala(tangentaLa(S, 0));
    const nb = normala(tangentaLa(S, 1));
    const O = prim(S.ax + d * na.x, S.ay + d * na.y, S.bx + d * nb.x, S.by + d * nb.y, S.bulge);
    curbe.push({ prim: O, fel: 'segment', k: j, sDe: el(s0, j), sPana: el(s0, j) + S.lungime });
  }
  for (let i = 1; i < cale.length; i++) {
    const ti = tangentaLa(el(cale, i - 1), 1);
    const to = tangentaLa(el(cale, i), 0);
    const cross = ti.x * to.y - ti.y * to.x;
    const dot = ti.x * to.x + ti.y * to.y;
    // La o întoarcere tangentă (180°: un arc care pleacă lipit înapoi), semnul lui cross e zgomot: vârful e convex pe
    // ambele părți, iar evantaiul trece peste vârf, prin direcția de intrare (alegerea mea; contractul nu spune).
    const phi = dot < 0 && Math.abs(cross) <= 1e-12 ? (d > 0 ? -Math.PI : Math.PI) : Math.atan2(cross, dot);
    if (!(d * phi < 0)) continue;
    const n = normala(ti);
    const sg = d > 0 ? 1 : -1;
    const V = el(cale, i);
    curbe.push({ prim: arcCentru(V.ax, V.ay, Math.abs(d), Math.atan2(sg * n.y, sg * n.x), phi), fel: 'evantai', k: i, sDe: el(s0, i), sPana: el(s0, i) });
  }

  const piese: PiesaIdeala[] = [];
  for (const cb of curbe) {
    const P = cb.prim;
    let inv: Multime = GOL;
    indexCale.vizita(cutie(P, rho + 1e-9), (j) => {
      if (esteTot(inv)) return;
      inv = reuneste(inv, invalidPrin(P, el(cale, j), rho));
    });
    // Fâșiile valide sub 1e-9 mm sunt zgomot; o piesă de lungime zero (arcul cu raza exact |d|, spre centru: piesa e
    // centrul) e validă sau nu în întregime.
    const brut = complementar(inv);
    const valid = P.lungime > 0 ? brut.filter(([a, b]) => (b - a) * P.lungime > 1e-9) : brut;
    piese.push({ ...cb, valid });
  }

  const valide: BucataValida[] = [];
  let lungimeValida = 0;
  piese.forEach((pi, i) => {
    for (const [lo, hi] of pi.valid) {
      const a = punctLa(pi.prim, lo);
      const b = punctLa(pi.prim, hi);
      const P = prim(a.x, a.y, b.x, b.y, pi.prim.arc ? Math.tan(((hi - lo) * pi.prim.sw) / 4) : 0);
      valide.push({ prim: P, piesa: i, lo, hi });
      lungimeValida += P.lungime;
    }
  });
  const primeValide = valide.map((v) => v.prim);
  const indexValide = indexeaza(primeValide.map((P) => cutie(P)));

  // `neatins`: porțiunile căii cu punctele ideale de segment nevalide, unite peste vârfuri (precizările 2.3c-4).
  const inv: [number, number][] = [];
  for (const pi of piese) {
    if (pi.fel !== 'segment') continue;
    const L = pi.sPana - pi.sDe;
    for (const [a, b] of complementar(pi.valid)) inv.push([pi.sDe + a * L, pi.sDe + b * L]);
  }
  inv.sort((p, q) => p[0] - q[0]);
  const unite: [number, number][] = [];
  for (const [a, b] of inv) {
    const u = unite[unite.length - 1];
    if (u && a <= u[1] + 1e-9) u[1] = Math.max(u[1], b);
    else unite.push([a, b]);
  }
  const neatins = unite
    .filter(([a, b]) => b - a > 1e-9)
    .map(([de, pana]): PortiuneD => ({ de, pana, lungime: pana - de, la: punctPeCale(cale, s0, (de + pana) / 2) }));

  return { d, curata: cc, cale, s0, lungimeCale, indexCale, piese, valide, primeValide, indexValide, lungimeValida, neatins };
}

/** Marja traseului ideal: aproape nulă, deci bucățile valide se opresc exact unde se taie curbele (ca un offset real). */
const MARJA_TRASEU = 1e-9;

/** Bucata primitivei P dintre fracțiunile lo și hi. */
function subPrim(P: Prim, lo: number, hi: number): Prim {
  const a = punctLa(P, lo);
  const b = punctLa(P, hi);
  return prim(a.x, a.y, b.x, b.y, P.arc ? Math.tan(((hi - lo) * P.sw) / 4) : 0);
}

/** Primitiva P cu startul mutat în (x, y) (o mutare de cel mult 1e-6 mm), cu același baleiaj. */
const cuStart = (P: Prim, x: number, y: number): Prim => prim(x, y, P.bx, P.by, P.bulge);
const cuCapat = (P: Prim, x: number, y: number): Prim => prim(P.ax, P.ay, x, y, P.bulge);

/**
 * Legătura dintre A (capătul unei bucăți) și B (următoarea), când capetele lor sunt la cel mult 1e-3 mm: dacă startul
 * lui B stă pe A (la 1e-6), A se taie acolo; dacă capătul lui A stă pe B, B se taie acolo; apoi startul lui B se mută în
 * capătul lui A dacă sunt la cel mult 1e-6; altfel, o linie de legătură. Întoarce [A, legătura?, B].
 */
function leaga(A: Prim, B: Prim): Prim[] {
  let a = A;
  let b = B;
  if (Math.hypot(a.bx - b.ax, a.by - b.ay) > 1e-12) {
    const fa = parametru(a, b.ax, b.ay);
    const fb = parametru(b, a.bx, a.by);
    if (distPunct(a, b.ax, b.ay) <= 1e-6 && fa > 0 && fa < 1) a = subPrim(a, 0, fa);
    else if (distPunct(b, a.bx, a.by) <= 1e-6 && fb > 0 && fb < 1) b = subPrim(b, fb, 1);
  }
  const gol = Math.hypot(a.bx - b.ax, a.by - b.ay);
  if (gol <= 1e-6) return [a, cuStart(b, a.bx, a.by)];
  return [a, prim(a.bx, a.by, b.ax, b.ay, 0), b];
}

/**
 * Traseul ideal, ca bucăți: bucățile valide (cu marja aproape nulă) în ordinea căii (segmentul j, apoi evantaiul vârfului
 * j + 1), legate când capetele lor sunt la cel mult 1e-3 mm (`leaga`); altfel începe o bucată nouă. O bucată al cărei
 * capăt ajunge înapoi lângă start se închide exact în start. E ieșirea corectă a controalelor și baza martorilor.
 */
export function traseuIdeal(c: ConturD, d: number): ConturD[] {
  const ideal = idealDeschis(c, d, MARJA_TRASEU);
  const cheie = (b: BucataValida): number => {
    const pi = el(ideal.piese, b.piesa);
    return pi.fel === 'segment' ? 2 * pi.k + 1 : 2 * pi.k;
  };
  const ordonate = [...ideal.valide].filter((b) => b.prim.lungime > 1e-6).sort((p, q) => cheie(p) - cheie(q) || p.lo - q.lo);
  const lanturi: Prim[][] = [];
  for (const b of ordonate) {
    const lant = lanturi[lanturi.length - 1];
    const A = lant ? lant[lant.length - 1] : undefined;
    if (lant && A && Math.hypot(A.bx - b.prim.ax, A.by - b.prim.ay) <= ALEGERI.lipire) {
      lant.pop();
      lant.push(...leaga(A, b.prim));
      continue;
    }
    lanturi.push([b.prim]);
  }
  for (const lant of lanturi) {
    const A = el(lant, lant.length - 1);
    const B = el(lant, 0);
    if (lant.length < 2 || Math.hypot(A.bx - B.ax, A.by - B.ay) > ALEGERI.lipire) continue;
    // Închiderea în start: capătul se leagă de start, iar startul rămâne pe loc.
    const legat = leaga(A, B);
    const nouB = el(legat, legat.length - 1);
    lant[0] = nouB;
    lant.splice(lant.length - 1, 1, ...legat.slice(0, -1));
    const z = el(lant, lant.length - 1);
    lant[lant.length - 1] = cuCapat(z, nouB.ax, nouB.ay);
  }
  return lanturi.map((lant) => ({
    inchis: false,
    varfuri: [
      ...lant.map((P): VarfD => ({ p: { x: P.ax, y: P.ay }, s: P.arc ? { tip: 'A', bulge: P.bulge } : { tip: 'L' } })),
      { p: { x: el(lant, lant.length - 1).bx, y: el(lant, lant.length - 1).by }, s: { tip: 'L' } },
    ],
  }));
}

// ---------------------------------------------------------------------------------------------------------------------
// Judecata ieșirii.
// ---------------------------------------------------------------------------------------------------------------------

/** Pozițiile pe cale ale generatorilor punctelor ideale valide aflate la cel mult `tol` de (x, y): [min, max], sau null. */
function picioare(ideal: Ideal, x: number, y: number, tol: number): readonly [number, number] | null {
  let lo = Infinity;
  let hi = -Infinity;
  ideal.indexValide.vizita(cutiePunct(x, y, tol), (i) => {
    const b = el(ideal.valide, i);
    if (distPunct(b.prim, x, y) > tol) return;
    const pi = el(ideal.piese, b.piesa);
    const u = b.lo + parametru(b.prim, x, y) * (b.hi - b.lo);
    const s = pi.sDe + u * (pi.sPana - pi.sDe);
    lo = Math.min(lo, s);
    hi = Math.max(hi, s);
  });
  return lo <= hi ? [lo, hi] : null;
}

/** Dus-întorsul acceptat: în (x, y), calea are doi pereți de o parte și de alta, la 2|d| ± 1e-4 unul de altul. */
function canalExact(ideal: Ideal, x: number, y: number): boolean {
  const ad = Math.abs(ideal.d);
  const pc: PunctD[] = [];
  ideal.indexCale.vizita(cutiePunct(x, y, ad + 2 * PRAGURI.abatere), (j) => {
    const P = el(ideal.cale, j);
    if (distPunct(P, x, y) <= ad + PRAGURI.abatere + 1e-6) pc.push(punctLa(P, parametru(P, x, y)));
  });
  for (let i = 0; i < pc.length; i++) {
    for (let j = i + 1; j < pc.length; j++) {
      const a = el(pc, i);
      const b = el(pc, j);
      const opuse = (a.x - x) * (b.x - x) + (a.y - y) * (b.y - y) < 0;
      if (opuse && Math.abs(Math.hypot(a.x - b.x, a.y - b.y) - 2 * ad) <= PRAGURI.canal + 1e-6) return true;
    }
  }
  return false;
}

/** Eșantioanele unei primitive: capetele, mijlocul și pasul `pas`. */
function esantioane(P: Prim, pas: number): PunctD[] {
  const m = Math.max(2, Math.ceil(P.lungime / pas));
  const rez: PunctD[] = [];
  for (let i = 0; i <= m; i++) rez.push(punctLa(P, i / m));
  return rez;
}

/** Forma unei bucăți (ADR 0037 §5): deschisă, finită, cel puțin 2 vârfuri, nicio cubică. */
function problemaFormei(c: ConturD): string | null {
  if (c.inchis !== false) return 'nu e deschisă';
  if (!Array.isArray(c.varfuri) || c.varfuri.length < 2) return `are ${c.varfuri?.length ?? 0} vârfuri`;
  for (const v of c.varfuri) {
    if (!Number.isFinite(v.p.x) || !Number.isFinite(v.p.y)) return 'are coordonate nefinite';
    if (v.s.tip === 'C') return 'are o cubică';
    if (v.s.tip === 'A' && !Number.isFinite(v.s.bulge)) return 'are un bulge nefinit';
  }
  return null;
}

/** Cât de multe probleme de același fel se raportează. */
const MAX_PE_FEL = 3;

/**
 * Tot ce e greșit în bucățile `bucati` față de offsetul ideal: forma, Hausdorff-ul în ambele sensuri (traseu → mulțimea
 * validă, apoi acoperirea), sensul desenului și ordinea, atingerile. Lista goală = ieșirea e corectă.
 */
export function verificaBucatile(ideal: Ideal, bucati: readonly ConturD[]): string[] {
  const probleme: string[] = [];
  const tol = PRAGURI.abatere + 1e-9;
  if (bucati.length === 0) probleme.push('ieșirea n-are nicio bucată');
  const forme = bucati.map(problemaFormei);
  forme.forEach((p, i) => {
    if (p !== null) probleme.push(`bucata ${i} ${p}`);
  });
  if (forme.some((p) => p !== null)) return probleme;

  const lanturi = bucati.map((c) => prime(c));
  const toate: { P: Prim; b: number; i: number }[] = [];
  lanturi.forEach((ps, b) => ps.forEach((P, i) => toate.push({ P, b, i })));
  const prims = toate.map((x) => x.P);
  const indexTraseu = indexeaza(prims.map((P) => cutie(P)));

  // 1. Traseu → ideal: fiecare eșantion al traseului stă la cel mult 0,002 mm de mulțimea validă.
  let n = 0;
  for (const { P, b, i } of toate) {
    for (const q of esantioane(P, ALEGERI.pasEsantion)) {
      const dist = distantaIndexata(ideal.primeValide, ideal.indexValide, q.x, q.y, tol);
      if (dist === Infinity) {
        if (n++ < MAX_PE_FEL) {
          const real = distantaIndexata(ideal.primeValide, ideal.indexValide, q.x, q.y, 1e6);
          const laCale = distantaIndexata(ideal.cale, ideal.indexCale, q.x, q.y, 1e6);
          probleme.push(`bucata ${b}, segmentul ${i}: punctul ${pt(q.x, q.y)} e la ${fx(real)} mm de offsetul ideal valid (la ${fx(laCale)} mm de cale)`);
        }
        break;
      }
    }
  }
  if (n > MAX_PE_FEL) probleme.push(`… încă ${n - MAX_PE_FEL} segmente în afara offsetului ideal`);

  // 2. Ideal → traseu (acoperirea): fiecare punct ideal valid stă la cel mult 0,002 mm de traseu.
  n = 0;
  for (const v of ideal.valide) {
    for (const q of esantioane(v.prim, ALEGERI.pasEsantion)) {
      if (distantaIndexata(prims, indexTraseu, q.x, q.y, tol) === Infinity) {
        if (n++ < MAX_PE_FEL) {
          const pi = el(ideal.piese, v.piesa);
          const real = distantaIndexata(prims, indexTraseu, q.x, q.y, 1e6);
          probleme.push(`acoperirea: punctul ideal valid ${pt(q.x, q.y)} (${pi.fel} ${pi.k}) e la ${fx(real)} mm de traseu`);
        }
        break;
      }
    }
  }
  if (n > MAX_PE_FEL) probleme.push(`… încă ${n - MAX_PE_FEL} bucăți ideale neacoperite`);

  // 3. Sensul desenului în fiecare bucată, apoi ordinea bucăților după startul lor.
  const tolS = ALEGERI.tolerantaSens;
  let starturiCur = -Infinity;
  lanturi.forEach((ps, b) => {
    let cur = -Infinity;
    let raportat = false;
    ps.forEach((P, i) => {
      for (const q of esantioane(P, ALEGERI.pasEsantion)) {
        const s = picioare(ideal, q.x, q.y, tol);
        if (s === null) continue;
        if (!raportat && s[1] < cur - tolS) {
          probleme.push(`bucata ${b}, segmentul ${i}: merge împotriva sensului desenului lângă ${pt(q.x, q.y)} (poziția pe cale ${fx(s[1])} după ${fx(cur)})`);
          raportat = true;
        }
        cur = Math.max(cur, s[0]);
      }
    });
    const p0 = el(ps, 0);
    const s = picioare(ideal, p0.ax, p0.ay, tol);
    if (s !== null) {
      if (s[1] < starturiCur - tolS) probleme.push(`bucata ${b} începe la poziția ${fx(s[1])} pe cale, înaintea bucății dinaintea ei (${fx(starturiCur)})`);
      starturiCur = Math.max(starturiCur, s[0]);
    }
  });

  // 4. Atingerile: nicio bucată nu se atinge pe ea însăși sau pe alta (excepțiile: dus-întorsul la 2R ± 1e-4, bucata
  // care se închide în start).
  const inchise = lanturi.map((ps) => {
    const a = el(ps, 0);
    const z = el(ps, ps.length - 1);
    return ps.length >= 2 && Math.hypot(a.ax - z.bx, a.ay - z.by) <= PRAGURI.atingere;
  });
  const cutiiT = prims.map((P) => cutie(P, PRAGURI.atingere));
  const indexT = indexeaza(cutiiT);
  n = 0;
  for (let g = 0; g < toate.length; g++) {
    const A = el(toate, g);
    indexT.vizita(el(cutiiT, g), (h) => {
      if (h <= g) return;
      const B = el(toate, h);
      let atins: PunctD | null = null;
      if (A.b === B.b && B.i === A.i + 1) {
        atins = veciniSeAting(A.P, B.P, A.P.bx, A.P.by);
      } else if (A.b === B.b && el(inchise, A.b) && A.i === 0 && B.i === el(lanturi, A.b).length - 1) {
        atins = veciniSeAting(A.P, B.P, A.P.ax, A.P.ay);
      } else {
        const d = distPrimPrim(A.P, B.P);
        if (d.d < PRAGURI.atingere) atins = { x: d.x, y: d.y };
      }
      if (atins !== null && !canalExact(ideal, atins.x, atins.y) && n++ < MAX_PE_FEL) {
        const unde = A.b === B.b ? `bucata ${A.b} se atinge singură (segmentele ${A.i} și ${B.i})` : `bucățile ${A.b} și ${B.b} se ating`;
        probleme.push(`${unde} lângă ${pt(atins.x, atins.y)}`);
      }
    });
  }
  if (n > MAX_PE_FEL) probleme.push(`… încă ${n - MAX_PE_FEL} atingeri`);
  return probleme;
}

/**
 * `neatins` primit față de cel de pe hârtie: fiecare porțiune are forma {de, pana, lungime, la}, cu lungimea = pana − de
 * și `la` pe cale, în mijloc; porțiunile de cel puțin 0,05 mm se potrivesc la 1e-4 mm pe `de` și `pana`, în ambele
 * sensuri.
 */
export function comparaNeatins(ideal: Ideal, primit: readonly PortiuneD[]): string[] {
  const probleme: string[] = [];
  const tol = ALEGERI.tolerantaNeatins;
  if (!Array.isArray(primit)) return ['`neatins` nu e o listă'];
  primit.forEach((p, i) => {
    const ok = [p.de, p.pana, p.lungime, p.la?.x, p.la?.y].every((x) => typeof x === 'number' && Number.isFinite(x));
    if (!ok) {
      probleme.push(`neatins[${i}] nu are forma {de, pana, lungime, la}`);
      return;
    }
    if (Math.abs(p.lungime - (p.pana - p.de)) > 1e-9 * Math.max(1, p.lungime)) probleme.push(`neatins[${i}]: lungimea ${p.lungime} ≠ pana − de = ${p.pana - p.de}`);
    const m = punctPeCale(ideal.cale, ideal.s0, (p.de + p.pana) / 2);
    if (Math.hypot(m.x - p.la.x, m.y - p.la.y) > tol) probleme.push(`neatins[${i}]: la = ${pt(p.la.x, p.la.y)}, dar mijlocul porțiunii pe cale e ${pt(m.x, m.y)}`);
  });
  if (probleme.length > 0) return probleme;
  const potrivit = (a: PortiuneD, b: PortiuneD): boolean => Math.abs(a.de - b.de) <= tol && Math.abs(a.pana - b.pana) <= tol;
  for (const a of ideal.neatins) {
    if (a.lungime < ALEGERI.portiuneMinima) continue;
    if (!primit.some((b) => potrivit(a, b))) probleme.push(`neatins: lipsește porțiunea [${fx(a.de)}, ${fx(a.pana)}] (${fx(a.lungime)} mm, la ${pt(a.la.x, a.la.y)})`);
  }
  for (const b of primit) {
    if (b.lungime < ALEGERI.portiuneMinima) continue;
    if (!ideal.neatins.some((a) => potrivit(a, b))) probleme.push(`neatins: porțiunea [${fx(b.de)}, ${fx(b.pana)}] (${fx(b.lungime)} mm) nu e pe hârtie`);
  }
  return probleme;
}

export type Judecata = {
  readonly probleme: readonly string[];
  /** Motivul refuzului aplicației, sau null dacă a dat un traseu. */
  readonly refuz: string | null;
  /** De ce trebuia refuzată intrarea, după contract, sau null. */
  readonly refuzCerut: string | null;
  /**
   * Rezultatul e corect doar judecat la distanța reîncercării, |d| + 1e-4: „nu încape” cu puncte valide la |d|, dar fără
   * la |d| + 1e-4, sau un traseu (și `neatins`) corect la |d| + 1e-4, dar nu la |d| (pragurile de topologie, de exemplu
   * fanta lată exact 2R).
   */
  readonly doarLaReincercare: boolean;
};

const motivBun = (m: unknown): boolean => typeof m === 'string' && m.trim() !== '';

/**
 * Judecata unui rezultat al offsetului deschis al căii c la distanța d: acceptat = offsetul corect sau un refuz cu motiv,
 * niciodată un traseu greșit; o intrare de refuzat trebuie refuzată; „nu încape” doar fără niciun punct ideal valid.
 */
export function judeca(c: ConturD, d: number, r: RezultatD): Judecata {
  const probleme: string[] = [];
  const refuzCerut = motivRefuzIntrare(c, d);
  if (refuzCerut !== null) {
    if (r.ok) probleme.push(`intrarea trebuia refuzată (${refuzCerut}), dar a ieșit un traseu cu ${r.bucati.length} bucăți`);
    else if (!motivBun(r.motiv)) probleme.push('refuz fără motiv');
    return { probleme, refuz: r.ok ? null : r.motiv, refuzCerut, doarLaReincercare: false };
  }
  const ideal = idealDeschis(c, d);
  const dReincercare = Math.sign(d) * (Math.abs(d) + PRAGURI.reincercare);
  if (!r.ok) {
    let doarLaReincercare = false;
    if (!motivBun(r.motiv)) probleme.push('refuz fără motiv');
    else if (r.motiv.includes('nu încape')) {
      if (ideal.lungimeValida > 0) {
        const alt = idealDeschis(c, dReincercare);
        if (alt.lungimeValida > 0) {
          const v = el(ideal.valide, 0).prim;
          probleme.push(`„nu încape” fals: oracolul are ${fx(ideal.lungimeValida)} mm de puncte ideale valide (de exemplu ${pt(v.ax, v.ay)})`);
        } else doarLaReincercare = true;
      }
    }
    return { probleme, refuz: r.motiv, refuzCerut: null, doarLaReincercare };
  }
  const laD = [...verificaBucatile(ideal, r.bucati), ...comparaNeatins(ideal, r.neatins)];
  if (laD.length === 0) return { probleme: [], refuz: null, refuzCerut: null, doarLaReincercare: false };
  // A doua încercare a contractului (|d| + 1e-4): la un prag de topologie, rezultatul ei e cel corect.
  const alt = idealDeschis(c, dReincercare);
  const laReincercare = [...verificaBucatile(alt, r.bucati), ...comparaNeatins(alt, r.neatins)];
  if (laReincercare.length === 0) return { probleme: [], refuz: null, refuzCerut: null, doarLaReincercare: true };
  return { probleme: laD, refuz: null, refuzCerut: null, doarLaReincercare: false };
}
