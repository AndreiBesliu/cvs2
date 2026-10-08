/**
 * ORACOLUL offsetului închis (felia 2.1, „Contractul gărzilor offsetului”, versiunea 2, din `docs/etape/etapa-02.md`),
 * cu ZERO importuri din `src/`. Geometria e scrisă aici din nou, din textul contractului și din convenția conturului
 * (fiecare vârf poartă segmentul care pleacă din el; bulge = tan(baleiaj / 4), pozitiv în sens trigonometric; un contur
 * închis cu n vârfuri are n segmente), nu din codul aplicației: dacă aplicația și oracolul ar împărți o formulă, o
 * greșeală acolo ar trece prin amândouă.
 *
 * Ce judecă, literal din contract (v2):
 * - intrarea, după curățare (arcele de peste 180° împărțite în două pe același cerc, |bulge| < 1e-6 = linie, segmentele
 *   mai scurte de 1e-6 mm PE CURBĂ scoase, vârful în plus de pe o latură dreaptă scos): mai puțin de 2 vârfuri distincte,
 *   aria zero, sau autointersecția (două segmente neînvecinate care se ating, două vecine suprapuse pe o lungime, două
 *   vecine care se taie și în alt punct decât vârful comun), cu toleranța de atingere de 1e-6 mm;
 * - ieșirea (`verificaIesirea`, toate obligatorii): structura (închis, ≥ 2 vârfuri, numere finite, niciun segment sub
 *   1e-6 mm pe curbă); topologia pe puncte, cu banda contractului și regula `evenodd`; aria netă care crește la exterior
 *   și scade la interior; abaterea Hausdorff, în ambele sensuri, ≤ 0,002 mm față de marginea exactă (fiecare punct al
 *   traseului la |d| de intrare, afară la exterior, înăuntru la interior); niciun contur care se atinge pe el însuși sau
 *   pe altul (1e-6 mm); insulele în sens trigonometric, găurile în sens orar (adâncimea de includere pară = insulă).
 *
 * Alegerile mele unde contractul tace (toate sunt și în raportul oracolului):
 * - „diagonala” benzii e diagonala cutiei rezultatului așteptat: cutia exactă a intrării, lărgită cu d la exterior
 *   (la interior, cutia intrării, care o cuprinde);
 * - grila de 40 × 40 acoperă cutia aceea lărgită cu 5 % și cu 2 benzi, ca să aibă și puncte din afara rezultatului;
 * - punctele-țintă: pe normalele intrării (la |d| ± 1,5 și ± 3 benzi, la 0,5 / 2 / 4 × |d| și lângă marginea intrării),
 *   în evantaiele de la vârfuri, și la ± 1,5 / ± 3 benzi de fiecare segment al IEȘIRII. Ultimele prind o buclă rătăcită,
 *   mică, pe care grila ar sări-o, și o margine de ieșire mutată cu mai mult de 1,5 benzi;
 * - „se suprapun pe o lungime” = trei puncte ale segmentului al doilea (la ¼, ½ și ¾ din lungimea mai scurtă, de la
 *   vârful comun) stau pe primul; „se taie și în alt punct” = o intersecție aflată la mai mult de
 *   max(1e-5, 1e-7 × cea mai mare lungime sau rază) de vârful comun (rădăcina dublă a unei îmbinări tangente are zgomotul
 *   ~1e-8 × raza);
 * - abaterea adevăr → ieșire se măsoară în punctele marginii exacte construite din intrare (normalele, evantaiele), deci e
 *   o margine de jos a distanței Hausdorff; ieșire → adevăr se măsoară pe toate segmentele ieșirii.
 *
 * Calculul e exact până la rotunjire. Arcul se ține în cadrul coardei lui (mijlocul, tangenta, normala spre partea
 * arcului și k = distanța cu semn de la coardă la centru, cu centrul în (0, −k)), deci un arc aproape drept (bulge 1e-8,
 * rază 1e10 mm) nu cere un centru îndepărtat, cu coordonate de 1e10 rotunjite. Paritatea `evenodd` e paritatea
 * poligonului coardelor XOR apartenența la segmentele circulare (arcul + coarda înapoi), cu aceeași perturbare simbolică
 * pentru amândouă (punctul mutat cu (ε₁, ε₂), ε₁ ≫ ε₂ > 0): o rază care trece printr-un vârf sau un punct aflat chiar pe
 * o coardă nu strică numărătoarea.
 */

export type PunctO = { readonly x: number; readonly y: number };

export type SegmentO =
  | { readonly tip: 'L' }
  | { readonly tip: 'A'; readonly bulge: number }
  | { readonly tip: 'C'; readonly c1: PunctO; readonly c2: PunctO };

export type VarfO = { readonly p: PunctO; readonly s: SegmentO };

export type ConturO = { readonly inchis: boolean; readonly varfuri: readonly VarfO[] };

/** Pragurile contractului (v2), copiate din text, nu din aplicație. */
export const PRAGURI = {
  /** Rezoluția declarată, în mm. */
  rezolutie: 0.01,
  /** Sub ea (și peste 0), distanța e refuzată. */
  distantaMinima: 0.005,
  /** Toleranța de atingere: două puncte mai apropiate sunt unul, două segmente mai apropiate se ating. */
  atingere: 1e-6,
  /** Un arc cu |bulge| sub el e o linie. */
  bulge: 1e-6,
  /** Un segment mai scurt (pe curbă) se scoate, la intrare și la ieșire. */
  segmentMinim: 1e-6,
  /** Un vârf mai aproape de dreapta vecinilor (și între ei) se scoate. */
  coliniar: 1e-6,
  /** Abaterea Hausdorff maximă a ieșirii față de marginea exactă, în ambele sensuri. */
  abatereMaxima: 0.002,
  bandaRelativa: 2e-4,
  bandaMinima: 0.003,
} as const;

const el = <T>(lista: readonly T[], i: number): T => lista[i] as T;

// ---------------------------------------------------------------------------------------------------------------------
// Bucata: un segment gata de calcul, în cadrul coardei lui.
// ---------------------------------------------------------------------------------------------------------------------

export type Bucata = {
  readonly a: PunctO;
  readonly b: PunctO;
  /** Arc adevărat: bulge ≠ 0 și coarda nenulă. Un arc cu coarda zero e un punct. */
  readonly arc: boolean;
  readonly bulge: number;
  /** Mijlocul coardei. */
  readonly mx: number;
  readonly my: number;
  /** Tangenta unitară a → b (0, 0 la coarda nulă). */
  readonly tx: number;
  readonly ty: number;
  /** Normala unitară: spre partea arcului la arc; normala stângă la linie. */
  readonly nx: number;
  readonly ny: number;
  /** Lungimea coardei. */
  readonly L: number;
  /** Centrul e în (0, −k) în cadru: k = L(1 − b²)/(4|b|), pozitiv la arcul mic, negativ la cel mare. */
  readonly k: number;
  readonly r: number;
  /** Baleiajul cu semn, 4·atan(bulge). */
  readonly baleiaj: number;
};

export function bucata(a: PunctO, b: PunctO, s: SegmentO): Bucata {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const L = Math.hypot(dx, dy);
  const tx = L > 0 ? dx / L : 0;
  const ty = L > 0 ? dy / L : 0;
  const bulge = s.tip === 'A' ? s.bulge : 0;
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  if (!(s.tip === 'A' && bulge !== 0 && L > 0)) {
    return { a, b, arc: false, bulge: 0, mx, my, tx, ty, nx: -ty, ny: tx, L, k: 0, r: 0, baleiaj: 0 };
  }
  // bulge > 0: arcul merge trigonometric, deci stă la DREAPTA coardei a → b; bulge < 0: la stânga.
  const sg = bulge > 0 ? 1 : -1;
  const ab = Math.abs(bulge);
  return {
    a, b, arc: true, bulge, mx, my, tx, ty, nx: sg * ty, ny: -sg * tx, L,
    k: (L * (1 - ab * ab)) / (4 * ab),
    r: (L * (1 + ab * ab)) / (4 * ab),
    baleiaj: 4 * Math.atan(bulge),
  };
}

/** Segmentele conturului: n la cel închis, n − 1 la cel deschis. */
export function bucati(c: ConturO): Bucata[] {
  const v = c.varfuri;
  const n = v.length;
  const m = c.inchis ? n : n - 1;
  const rez: Bucata[] = [];
  for (let i = 0; i < m; i++) {
    const x = el(v, i);
    rez.push(bucata(x.p, el(v, (i + 1) % n).p, x.s));
  }
  return rez;
}

/** Segmentele, cu conturul închis oricum: paritatea are nevoie de o buclă (un contur deschis e prins de structură). */
function bucatiInchise(c: ConturO): Bucata[] {
  return bucati({ inchis: true, varfuri: c.varfuri });
}

/** Lungimea pe curbă. */
export function lungime(q: Bucata): number {
  return q.arc ? q.r * Math.abs(q.baleiaj) : q.L;
}

/** Centrul și raza arcului (sau ale cercului-suport), în coordonate globale. */
export function cerculArcului(q: Bucata): { readonly cx: number; readonly cy: number; readonly r: number } {
  return { cx: q.mx - q.k * q.nx, cy: q.my - q.k * q.ny, r: q.r };
}

/** Punctul aflat la fracțiunea f din lungimea bucății, cu tangenta unitară în sensul de mers. */
export function punctPe(q: Bucata, f: number): { readonly x: number; readonly y: number; readonly tx: number; readonly ty: number } {
  if (!q.arc) {
    if (f === 0) return { x: q.a.x, y: q.a.y, tx: q.tx, ty: q.ty };
    if (f === 1) return { x: q.b.x, y: q.b.y, tx: q.tx, ty: q.ty };
    return { x: q.a.x + (q.b.x - q.a.x) * f, y: q.a.y + (q.b.y - q.a.y) * f, tx: q.tx, ty: q.ty };
  }
  // ψ: unghiul de la direcția mijlocului arcului, −|θ|/2 la a, +|θ|/2 la b.
  const psi = Math.abs(q.baleiaj) * (f - 0.5);
  const c = Math.cos(psi);
  const s = Math.sin(psi);
  const tgx = q.tx * c - q.nx * s;
  const tgy = q.ty * c - q.ny * s;
  if (f === 0) return { x: q.a.x, y: q.a.y, tx: tgx, ty: tgy };
  if (f === 1) return { x: q.b.x, y: q.b.y, tx: tgx, ty: tgy };
  const sj = Math.sin(psi / 2);
  const u = q.r * s;
  // w = săgeata − 2r·sin²(ψ/2), fără diferența a două numere mari.
  const w = (q.L / 2) * Math.abs(q.bulge) - 2 * q.r * sj * sj;
  return { x: q.mx + q.tx * u + q.nx * w, y: q.my + q.ty * u + q.ny * w, tx: tgx, ty: tgy };
}

// ---------------------------------------------------------------------------------------------------------------------
// Distanța, paritatea, înfășurarea.
// ---------------------------------------------------------------------------------------------------------------------

/**
 * Distanța exactă de la (x, y) la bucată. La linie, prin proiecție pe segment. La arc: distanța la cerc, dacă direcția
 * punctului din centru e în baleiaj, altfel distanța la capătul mai apropiat. În cadrul coardei (u de-a lungul ei, w spre
 * arc), testul de baleiaj e k·(|u| − L/2) ≤ (L/2)·w, pentru arcul mic și pentru cel mare deopotrivă, iar distanța la cerc
 * e |N| / D, cu N = u² + w² + 2wk − (L/2)² și D = √(u² + (w + k)²) + r (fiindcă r² − k² = (L/2)²).
 */
export function distantaLaBucata(q: Bucata, x: number, y: number): number {
  const dx = x - q.mx;
  const dy = y - q.my;
  if (q.L === 0) return Math.hypot(dx, dy);
  const u = dx * q.tx + dy * q.ty;
  const w = dx * q.nx + dy * q.ny;
  const h = q.L / 2;
  const au = Math.abs(u);
  if (q.arc && q.k * (au - h) <= h * w) {
    const N = u * u + w * w + 2 * w * q.k - h * h;
    const D = Math.hypot(u, w + q.k) + q.r;
    return Math.abs(N) / D;
  }
  if (!q.arc && au <= h) return Math.abs(w);
  return Math.hypot(au - h, w);
}

export function distantaLaFrontiera(qs: readonly Bucata[], x: number, y: number): number {
  let m = Infinity;
  for (const q of qs) {
    const d = distantaLaBucata(q, x, y);
    if (d < m) m = d;
  }
  return m;
}

/**
 * Semnul perturbat al poziției față de coarda a → b: +1 la stânga, −1 la dreapta. Pe dreapta coardei, punctul se mută
 * cu (ε₁, ε₂), ε₁ ≫ ε₂ > 0, exact ca în regula semideschisă a razei spre +x (un vârf aflat la y-ul punctului contează
 * „dedesubt”; o latură care trece chiar prin punct nu e numărată).
 */
function semnCoarda(q: Bucata, x: number, y: number): number {
  const wl = -(x - q.mx) * q.ty + (y - q.my) * q.tx;
  if (wl > 0) return 1;
  if (wl < 0) return -1;
  if (q.ty !== 0) return q.ty > 0 ? -1 : 1;
  return q.tx > 0 ? 1 : -1;
}

/** Punctul e în segmentul circular dintre arc și coarda lui (cu semnul perturbat deja calculat). */
function inSegmentulCircular(q: Bucata, x: number, y: number, semn: number): boolean {
  const deParteaArcului = q.bulge > 0 ? semn < 0 : semn > 0;
  if (!deParteaArcului) return false;
  const dx = x - q.mx;
  const dy = y - q.my;
  const u = dx * q.tx + dy * q.ty;
  const w = dx * q.nx + dy * q.ny;
  const h = q.L / 2;
  return u * u + w * w + 2 * w * q.k - h * h < 0;
}

/** Paritatea `evenodd` a punctului față de toate bucățile (un număr impar de traversări = înăuntru). */
export function paritate(qs: readonly Bucata[], x: number, y: number): boolean {
  let inauntru = false;
  for (const q of qs) {
    if (q.L === 0) continue;
    const s = semnCoarda(q, x, y);
    if ((q.a.y <= y) !== (q.b.y <= y)) {
      // Coarda urcă: raza spre +x o taie dacă punctul e la stânga ei; coboară: dacă e la dreapta.
      if (q.b.y > q.a.y ? s > 0 : s < 0) inauntru = !inauntru;
    }
    if (q.arc && inSegmentulCircular(q, x, y, s)) inauntru = !inauntru;
  }
  return inauntru;
}

/** Numărul de înfășurare (regula `nonzero` îl compară cu 0). Nu e regula contractului; îl țin pentru controale. */
export function infasurare(qs: readonly Bucata[], x: number, y: number): number {
  let w = 0;
  for (const q of qs) {
    if (q.L === 0) continue;
    const s = semnCoarda(q, x, y);
    if ((q.a.y <= y) !== (q.b.y <= y)) {
      if (q.b.y > q.a.y) { if (s > 0) w += 1; } else if (s < 0) w -= 1;
    }
    if (q.arc && inSegmentulCircular(q, x, y, s)) w += q.bulge > 0 ? 1 : -1;
  }
  return w;
}

/** Punctul e în regiunea `evenodd` a contururilor date, citite laolaltă. */
export function inRegiune(contururi: readonly ConturO[], p: PunctO): boolean {
  return paritate(contururi.flatMap(bucatiInchise), p.x, p.y);
}

/** Distanța de la punct la marginea conturului. */
export function distanta(c: ConturO, p: PunctO): number {
  return distantaLaFrontiera(bucatiInchise(c), p.x, p.y);
}

// ---------------------------------------------------------------------------------------------------------------------
// Cutia, aria.
// ---------------------------------------------------------------------------------------------------------------------

export type Cutie = { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number };

/** Cutia exactă a unei bucăți: capetele, plus punctele cardinale ale cercului aflate în baleiajul arcului. */
export function cutieBucata(q: Bucata): Cutie {
  let x0 = Math.min(q.a.x, q.b.x), y0 = Math.min(q.a.y, q.b.y), x1 = Math.max(q.a.x, q.b.x), y1 = Math.max(q.a.y, q.b.y);
  if (q.arc) {
    const h = q.L / 2;
    for (const [ex, ey] of [[1, 0], [0, 1], [-1, 0], [0, -1]] as const) {
      const u = q.r * (ex * q.tx + ey * q.ty);
      const w = -q.k + q.r * (ex * q.nx + ey * q.ny);
      if (q.k * (Math.abs(u) - h) <= h * w) {
        const x = q.mx + q.tx * u + q.nx * w, y = q.my + q.ty * u + q.ny * w;
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      }
    }
  }
  return { x0, y0, x1, y1 };
}

/** Cutia exactă a contururilor. */
export function cutie(contururi: readonly ConturO[]): Cutie {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const c of contururi) {
    for (const q of bucatiInchise(c)) {
      const b = cutieBucata(q);
      x0 = Math.min(x0, b.x0); y0 = Math.min(y0, b.y0); x1 = Math.max(x1, b.x1); y1 = Math.max(y1, b.y1);
    }
  }
  return { x0, y0, x1, y1 };
}

/** Aria segmentului circular dintre arc și coardă, (r²/2)(θ − sin θ), cu seria la unghiuri mici. */
function ariaSegmentului(q: Bucata): number {
  const t = Math.abs(q.baleiaj);
  const f = t < 1e-3 ? (t ** 3) / 6 - (t ** 5) / 120 + (t ** 7) / 5040 : t - Math.sin(t);
  return ((q.r * q.r) / 2) * f;
}

/** Aria cu semn (pozitivă în sens trigonometric), exactă pe linii și arce: shoelace pe coarde plus segmentele circulare. */
export function arie(c: ConturO): number {
  const qs = bucatiInchise(c);
  if (qs.length === 0) return 0;
  const o = el(qs, 0).a;
  let A = 0;
  for (const q of qs) {
    A += ((q.a.x - o.x) * (q.b.y - o.y) - (q.b.x - o.x) * (q.a.y - o.y)) / 2;
    if (q.arc) A += (q.bulge > 0 ? 1 : -1) * ariaSegmentului(q);
  }
  return A;
}

/** Adâncimea de includere a fiecărui contur: câte ALTE contururi cuprind un punct al lui (mijlocul primului segment). */
function adancimi(contururi: readonly ConturO[]): number[] {
  return contururi.map((c, i) => {
    const qs = bucatiInchise(c).filter((q) => q.L > 0);
    if (qs.length === 0) return 0;
    const p = punctPe(el(qs, 0), 0.5);
    let n = 0;
    contururi.forEach((alt, j) => { if (j !== i && inRegiune([alt], p)) n++; });
    return n;
  });
}

/**
 * Aria netă a regiunii `evenodd`: fiecare contur adună sau scade |aria| lui, după paritatea adâncimii. Exactă pentru
 * contururi simple, imbricate, fără suprapuneri; o ieșire cu suprapuneri e prinsă oricum de clasificare și de atingeri.
 */
export function ariaRegiunii(contururi: readonly ConturO[]): number {
  const ad = adancimi(contururi);
  let A = 0;
  contururi.forEach((c, i) => { A += (el(ad, i) % 2 === 0 ? 1 : -1) * Math.abs(arie(c)); });
  return A;
}

// ---------------------------------------------------------------------------------------------------------------------
// Curățarea din contract, vârfurile distincte, autointersecția.
// ---------------------------------------------------------------------------------------------------------------------

const dist = (p: PunctO, q: PunctO): number => Math.hypot(p.x - q.x, p.y - q.y);
const LINIE: SegmentO = { tip: 'L' };

/**
 * Curățarea contractului (v2), „fără să-și schimbe forma”, pe un contur închis, în ordinea din text:
 * 1. un arc de peste 180° (|bulge| > 1) se împarte în două jumătăți pe același cerc, fiecare cu bulge-ul tan(atan(b)/2),
 *    cu vârful nou în mijlocul arcului;
 * 2. un arc cu |bulge| < 1e-6 e o linie;
 * 3. un segment mai scurt de 1e-6 mm PE CURBĂ se scoate: capetele lui devin un vârf, cu poziția vârfului cu indicele mai
 *    mic și segmentul celui scos; la perechea ultim–prim rămâne primul;
 * 4. un vârf între două linii se scoate dacă stă la mai puțin de 1e-6 mm de segmentul dintre vecini și se proiectează
 *    strict între ei (nu dacă ar întoarce drumul înapoi).
 * Pașii 3–4 se repetă până nu se mai schimbă nimic.
 */
export function curata(c: ConturO): ConturO {
  if (!c.inchis) return c;
  const n0 = c.varfuri.length;
  let v: VarfO[] = [];
  c.varfuri.forEach((x, i) => {
    if (x.s.tip === 'A' && Math.abs(x.s.bulge) > 1) {
      const q = bucata(x.p, el(c.varfuri, (i + 1) % n0).p, x.s);
      const m = punctPe(q, 0.5);
      const s: SegmentO = { tip: 'A', bulge: Math.tan(Math.atan(x.s.bulge) / 2) };
      v.push({ p: x.p, s }, { p: { x: m.x, y: m.y }, s });
    } else v.push(x);
  });
  v = v.map((x) => (x.s.tip === 'A' && Math.abs(x.s.bulge) < PRAGURI.bulge ? { p: x.p, s: LINIE } : x));
  for (let pas = 0; pas < 100000; pas++) {
    let schimbat = false;
    for (let i = 0; i < v.length && v.length > 1; i++) {
      const urm = (i + 1) % v.length;
      const x = el(v, i);
      if (lungime(bucata(x.p, el(v, urm).p, x.s)) >= PRAGURI.segmentMinim) continue;
      if (urm === 0) v = v.slice(0, -1);
      else v = v.flatMap((y, j) => (j === i ? [{ p: x.p, s: el(v, urm).s }] : j === urm ? [] : [y]));
      schimbat = true;
      break;
    }
    if (schimbat) continue;
    for (let i = 0; v.length > 2 && i < v.length; i++) {
      const m = v.length;
      const prec = el(v, (i - 1 + m) % m);
      const cur = el(v, i);
      const urm = el(v, (i + 1) % m);
      if (prec.s.tip !== 'L' || cur.s.tip !== 'L') continue;
      const L = dist(prec.p, urm.p);
      if (L === 0) continue;
      const tx = (urm.p.x - prec.p.x) / L, ty = (urm.p.y - prec.p.y) / L;
      const t = (cur.p.x - prec.p.x) * tx + (cur.p.y - prec.p.y) * ty;
      const h = Math.abs(-(cur.p.x - prec.p.x) * ty + (cur.p.y - prec.p.y) * tx);
      if (t > 0 && t < L && h < PRAGURI.coliniar) {
        v = v.filter((_, j) => j !== i);
        schimbat = true;
        break;
      }
    }
    if (!schimbat) break;
  }
  return { inchis: true, varfuri: v };
}

/** Vârfurile distincte, după curățare: două poziții la mai puțin de 1e-6 mm sunt același vârf. */
export function varfuriDistincte(c: ConturO): number {
  const pozitii: PunctO[] = [];
  for (const x of curata(c).varfuri) if (!pozitii.some((p) => dist(p, x.p) < PRAGURI.atingere)) pozitii.push(x.p);
  return pozitii.length;
}
/** Același lucru, sub numele cerut în sarcină. */
export const vertexDistincte = varfuriDistincte;

/** Punctele în care se întâlnesc curbele-suport (dreapta / cercul) și punctele critice ale distanței dintre ele. */
function puncteCandidat(q1: Bucata, q2: Bucata): PunctO[] {
  const rez: PunctO[] = [];
  if (q1.L === 0 || q2.L === 0) return rez;
  if (!q1.arc && !q2.arc) {
    const den = q1.tx * q2.ty - q1.ty * q2.tx;
    if (den !== 0) {
      const ex = q2.a.x - q1.a.x, ey = q2.a.y - q1.a.y;
      const t = (ex * q2.ty - ey * q2.tx) / den;
      rez.push({ x: q1.a.x + q1.tx * t, y: q1.a.y + q1.ty * t });
    }
    return rez;
  }
  if (q1.arc !== q2.arc) {
    const lin = q1.arc ? q2 : q1;
    const { cx, cy, r } = cerculArcului(q1.arc ? q1 : q2);
    const fx = cx - lin.a.x, fy = cy - lin.a.y;
    const t = fx * lin.tx + fy * lin.ty;
    const hh = -fx * lin.ty + fy * lin.tx;
    const px = lin.a.x + lin.tx * t, py = lin.a.y + lin.ty * t;
    const ah = Math.abs(hh);
    if (ah <= r) {
      const w = Math.sqrt(Math.max(0, (r - ah) * (r + ah)));
      rez.push({ x: px + lin.tx * w, y: py + lin.ty * w }, { x: px - lin.tx * w, y: py - lin.ty * w });
    }
    // Punctele cercului cele mai apropiate / depărtate de dreaptă: pe normala ei, prin centru.
    rez.push({ x: cx - lin.ty * r, y: cy + lin.tx * r }, { x: cx + lin.ty * r, y: cy - lin.tx * r });
    return rez;
  }
  const c1 = cerculArcului(q1), c2 = cerculArcului(q2);
  const dx = c2.cx - c1.cx, dy = c2.cy - c1.cy;
  const dc = Math.hypot(dx, dy);
  if (dc === 0) return rez;
  const ux = dx / dc, uy = dy / dc;
  const a = (dc * dc + c1.r * c1.r - c2.r * c2.r) / (2 * dc);
  const h2 = c1.r * c1.r - a * a;
  if (h2 >= 0) {
    const h = Math.sqrt(h2);
    const mx = c1.cx + ux * a, my = c1.cy + uy * a;
    rez.push({ x: mx - uy * h, y: my + ux * h }, { x: mx + uy * h, y: my - ux * h });
  }
  rez.push(
    { x: c1.cx + ux * c1.r, y: c1.cy + uy * c1.r }, { x: c1.cx - ux * c1.r, y: c1.cy - uy * c1.r },
    { x: c2.cx + ux * c2.r, y: c2.cy + uy * c2.r }, { x: c2.cx - ux * c2.r, y: c2.cy - uy * c2.r },
  );
  return rez;
}

/**
 * Distanța exactă dintre două bucăți. Minimul e la o intersecție, la un capăt, sau într-un punct critic al ambelor
 * (la linie–arc: pe normala dreptei prin centru; la arc–arc: pe dreapta centrelor). Fiecare candidat p dă marginea
 * d(p, q1) + d(p, q2); cel mai mic e distanța.
 */
export function distantaIntreBucati(q1: Bucata, q2: Bucata): number {
  let m = Math.min(
    distantaLaBucata(q2, q1.a.x, q1.a.y), distantaLaBucata(q2, q1.b.x, q1.b.y),
    distantaLaBucata(q1, q2.a.x, q2.a.y), distantaLaBucata(q1, q2.b.x, q2.b.y),
  );
  for (const p of puncteCandidat(q1, q2)) {
    const d = distantaLaBucata(q1, p.x, p.y) + distantaLaBucata(q2, p.x, p.y);
    if (d < m) m = d;
  }
  return m;
}

/**
 * Punctele în care două bucăți (linie–linie, linie–arc, arc–arc) se taie sau se apropie la cel mult `tol`: intersecțiile
 * curbelor-suport, punctele critice și capetele, păstrate doar dacă stau la ≤ `tol` de amândouă (suma distanțelor).
 */
export function intersectii(q1: Bucata, q2: Bucata, tol: number): PunctO[] {
  const toate = [...puncteCandidat(q1, q2), q1.a, q1.b, q2.a, q2.b];
  const rez: PunctO[] = [];
  for (const p of toate) {
    if (distantaLaBucata(q1, p.x, p.y) + distantaLaBucata(q2, p.x, p.y) > tol) continue;
    if (!rez.some((r) => dist(r, p) <= tol)) rez.push(p);
  }
  return rez;
}

const cutiiDeparte = (a: Cutie, b: Cutie, tol: number): boolean =>
  a.x0 > b.x1 + tol || b.x0 > a.x1 + tol || a.y0 > b.y1 + tol || b.y0 > a.y1 + tol;

export type Atingere = {
  readonly i: number;
  readonly j: number;
  /** `neinvecinate`: se ating; `suprapuse`: vecine, una merge înapoi pe cealaltă; `vecine-in-alt-punct`: vecine care se taie. */
  readonly fel: 'neinvecinate' | 'suprapuse' | 'vecine-in-alt-punct';
};

/** Bucata a doua merge înapoi pe prima, din vârful lor comun: trei puncte ale ei, la ¼, ½, ¾ din lungimea mai scurtă. */
function mergeInapoi(prima: Bucata, adoua: Bucata, tol: number): boolean {
  const l1 = lungime(prima), l2 = lungime(adoua);
  const l = Math.min(l1, l2);
  if (!(l > 0)) return false;
  return [0.25, 0.5, 0.75].every((f) => {
    const p = punctPe(adoua, (f * l) / l2);
    return distantaLaBucata(prima, p.x, p.y) <= tol;
  });
}

/** Autointersecțiile conturului curățat, după definiția contractului (v2), cu toleranța de atingere (implicit 1e-6 mm). */
export function autointersectii(c: ConturO, tol: number = PRAGURI.atingere): Atingere[] {
  const qs = bucati(curata(c));
  const cutii = qs.map(cutieBucata);
  const n = qs.length;
  const rez: Atingere[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const qi = el(qs, i), qj = el(qs, j);
      const iSiJ = j === i + 1; // capătul lui i e startul lui j
      const jSiI = i === 0 && j === n - 1; // capătul lui j e startul lui i
      if (!iSiJ && !jSiI) {
        if (cutiiDeparte(el(cutii, i), el(cutii, j), tol)) continue;
        if (distantaIntreBucati(qi, qj) <= tol) rez.push({ i, j, fel: 'neinvecinate' });
        continue;
      }
      if ((iSiJ && mergeInapoi(qi, qj, tol)) || (jSiI && mergeInapoi(qj, qi, tol))) {
        rez.push({ i, j, fel: 'suprapuse' });
        continue;
      }
      const comune: PunctO[] = [];
      if (iSiJ) comune.push(qj.a);
      if (jSiI) comune.push(qi.a);
      const exclus = Math.max(1e-5, 1e-7 * Math.max(lungime(qi), lungime(qj), qi.r, qj.r));
      if (intersectii(qi, qj, tol).some((p) => comune.every((v) => dist(p, v) > exclus))) {
        rez.push({ i, j, fel: 'vecine-in-alt-punct' });
      }
    }
  }
  return rez;
}

export function autointersectat(c: ConturO, tol: number = PRAGURI.atingere): boolean {
  return autointersectii(c, tol).length > 0;
}

// ---------------------------------------------------------------------------------------------------------------------
// Verificările ieșirii.
// ---------------------------------------------------------------------------------------------------------------------

const finit = (x: unknown): boolean => typeof x === 'number' && Number.isFinite(x);

/**
 * Problemele de structură ale ieșirii unui offset `ok`: listă goală = bine. Contractul: fiecare contur e închis, are
 * cel puțin 2 vârfuri și numai coordonate finite; segmentele sub 1e-6 mm (pe curbă) se scot. În plus, ce oracolul nu
 * poate judeca: o cubică (offsetul liniilor și arcelor e din linii și arce) și o ieșire `ok` fără niciun contur.
 */
export function verificaStructura(iesire: readonly ConturO[]): string[] {
  const probleme: string[] = [];
  if (iesire.length === 0) probleme.push('ieșire goală: un exterior gol e un eșec, un interior care dispare se refuză cu motiv');
  iesire.forEach((c, k) => {
    if (c.inchis !== true) probleme.push(`conturul ${k} nu e închis`);
    if (c.varfuri.length < 2) probleme.push(`conturul ${k} are ${c.varfuri.length} vârfuri (cel puțin 2)`);
    c.varfuri.forEach((v, i) => {
      if (!finit(v.p.x) || !finit(v.p.y)) probleme.push(`conturul ${k}, vârful ${i}: coordonată nefinită`);
      if (v.s.tip === 'A' && !finit(v.s.bulge)) probleme.push(`conturul ${k}, vârful ${i}: bulge nefinit`);
      if (v.s.tip === 'C') probleme.push(`conturul ${k}, vârful ${i}: cubică în ieșire`);
      if (v.s.tip !== 'L' && v.s.tip !== 'A' && v.s.tip !== 'C') probleme.push(`conturul ${k}, vârful ${i}: segment necunoscut`);
    });
    if (c.varfuri.length >= 2) {
      bucatiInchise(c).forEach((q, i) => {
        const l = lungime(q);
        if (!(l >= PRAGURI.segmentMinim)) probleme.push(`conturul ${k}, segmentul ${i}: ${l} mm pe curbă, sub 1e-6 mm`);
      });
    }
  });
  return probleme;
}

/** Aria netă crește la exterior și scade la interior (contractul); undefined = bine. */
export function verificaArie(intrare: ConturO, d: number, iesire: readonly ConturO[]): string | undefined {
  const a0 = Math.abs(arie(intrare));
  const a1 = ariaRegiunii(iesire);
  if (d > 0 && !(a1 > a0)) return `aria nu crește la exterior: ${a0} → ${a1}`;
  if (d < 0 && !(a1 < a0)) return `aria nu scade la interior: ${a0} → ${a1}`;
  return undefined;
}

/** Orientarea: insulele (adâncime pară) în sens trigonometric, găurile (adâncime impară) în sens orar. */
export function verificaOrientarea(iesire: readonly ConturO[]): string[] {
  const ad = adancimi(iesire);
  const probleme: string[] = [];
  iesire.forEach((c, k) => {
    const A = arie(c);
    const insula = el(ad, k) % 2 === 0;
    if (insula && !(A > 0)) probleme.push(`conturul ${k} e insulă (adâncimea ${el(ad, k)}), dar nu merge trigonometric (aria ${A})`);
    if (!insula && !(A < 0)) probleme.push(`conturul ${k} e gaură (adâncimea ${el(ad, k)}), dar nu merge orar (aria ${A})`);
  });
  return probleme;
}

/** Atingerile ieșirii: un contur care se atinge pe el însuși, sau două contururi care se ating (toleranța 1e-6 mm). */
export function verificaAtingerile(iesire: readonly ConturO[]): string[] {
  const probleme: string[] = [];
  iesire.forEach((c, k) => {
    const a = autointersectii(c);
    if (a.length > 0) probleme.push(`conturul ${k} se atinge pe el însuși: ${a.slice(0, 4).map((x) => `${x.fel} ${x.i}–${x.j}`).join(', ')}`);
  });
  const toate = iesire.map((c) => bucatiInchise(c).filter((q) => q.L > 0).map((q) => ({ q, cutie: cutieBucata(q) })));
  for (let i = 0; i < toate.length; i++) {
    for (let j = i + 1; j < toate.length; j++) {
      let m = Infinity;
      for (const a of el(toate, i)) {
        for (const b of el(toate, j)) {
          if (cutiiDeparte(a.cutie, b.cutie, PRAGURI.atingere)) continue;
          m = Math.min(m, distantaIntreBucati(a.q, b.q));
        }
      }
      if (m <= PRAGURI.atingere) probleme.push(`contururile ${i} și ${j} se ating (${m} mm)`);
    }
  }
  return probleme;
}

// ---------------------------------------------------------------------------------------------------------------------
// Clasificarea pe puncte.
// ---------------------------------------------------------------------------------------------------------------------

export type OptiuniClasificare = {
  /** Punctele grilei pe latură, implicit 40. */
  readonly grila?: number;
  /** Banda, dacă nu e cea din contract (doar pentru probe). */
  readonly banda?: number;
};

export type Nepotrivire = {
  readonly x: number;
  readonly y: number;
  readonly asteptat: boolean;
  readonly real: boolean;
  /** Distanța punctului la marginea intrării. */
  readonly distanta: number;
};

type Pregatire = {
  readonly qs: readonly Bucata[];
  readonly d: number;
  readonly banda: number;
  readonly puncte: readonly PunctO[];
};

/** Cutia rezultatului așteptat: cutia exactă a intrării, lărgită cu d la exterior (la interior, cutia intrării). */
export function cadru(intrare: ConturO, d: number): Cutie {
  const c = cutie([intrare]);
  const e = Math.max(d, 0);
  return { x0: c.x0 - e, y0: c.y0 - e, x1: c.x1 + e, y1: c.y1 + e };
}

/** Banda contractului: max(2e-4 × diagonala, 0,003 mm), cu diagonala cutiei rezultatului așteptat. */
export function banda(intrare: ConturO, d: number): number {
  const c = cadru(intrare, d);
  return Math.max(PRAGURI.bandaRelativa * Math.hypot(c.x1 - c.x0, c.y1 - c.y0), PRAGURI.bandaMinima);
}

/** Normala spre exteriorul regiunii, dintr-o tangentă: la dreapta ei în sens trigonometric, la stânga în sens orar. */
const normalaExterioara = (tx: number, ty: number, orientare: number): [number, number] => (orientare > 0 ? [ty, -tx] : [-ty, tx]);

/** Punctele-țintă de pe normalele intrării și din evantaiele vârfurilor. */
function tinteIntrare(qs: readonly Bucata[], d: number, b: number, orientare: number): PunctO[] {
  const rez: PunctO[] = [];
  const ad = Math.abs(d);
  const semne = d === 0 ? [1, -1] : [Math.sign(d)];
  const departari: number[] = [];
  for (const k of [-3, -1.5, 1.5, 3]) departari.push(ad + k * b);
  for (const f of [0.5, 2, 4]) if (ad > 0) departari.push(f * ad);
  const valide = qs.filter((q) => q.L > 0);
  const n = valide.length;
  const pas = Math.max(1, Math.ceil(n / 150));
  for (let i = 0; i < n; i += pas) {
    const q = el(valide, i);
    for (const f of [0.125, 0.375, 0.625, 0.875]) {
      const p = punctPe(q, f);
      const [nx, ny] = normalaExterioara(p.tx, p.ty, orientare);
      for (const s of semne) for (const t of departari) rez.push({ x: p.x + nx * s * t, y: p.y + ny * s * t });
      for (const t of [-1.5 * b, 1.5 * b]) rez.push({ x: p.x + nx * t, y: p.y + ny * t });
    }
    // Evantaiul de la startul bucății, între normala de la capătul celei dinainte și normala de aici, pe drumul scurt.
    const prec = punctPe(el(valide, (i - 1 + n) % n), 1);
    const start = punctPe(q, 0);
    const [ax, ay] = normalaExterioara(prec.tx, prec.ty, orientare);
    const [bx, by] = normalaExterioara(start.tx, start.ty, orientare);
    const unghi = Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
    for (let j = 0; j <= 4; j++) {
      const fi = (unghi * j) / 4;
      const ux = ax * Math.cos(fi) - ay * Math.sin(fi), uy = ax * Math.sin(fi) + ay * Math.cos(fi);
      for (const s of semne) for (const t of departari) rez.push({ x: start.x + ux * s * t, y: start.y + uy * s * t });
    }
  }
  return rez;
}

/** Punctele-țintă de lângă ieșire: la ± 1,5 și ± 3 benzi de fiecare segment și de fiecare vârf. */
function tinteIesire(iesire: readonly ConturO[], b: number): PunctO[] {
  const rez: PunctO[] = [];
  const toate = iesire.flatMap((c) => bucatiInchise(c).filter((q) => q.L > 0));
  const pas = Math.max(1, Math.ceil(toate.length / 300));
  for (let i = 0; i < toate.length; i += pas) {
    const q = el(toate, i);
    for (const f of [0, 0.125, 0.375, 0.625, 0.875]) {
      const p = punctPe(q, f);
      for (const k of [-3, -1.5, 1.5, 3]) rez.push({ x: p.x - p.ty * k * b, y: p.y + p.tx * k * b });
    }
  }
  return rez;
}

function pregateste(intrare: ConturO, d: number, optiuni: OptiuniClasificare): Pregatire {
  const qs = bucatiInchise(intrare);
  const c = cadru(intrare, d);
  const lat = c.x1 - c.x0, ina = c.y1 - c.y0;
  const b = optiuni.banda ?? banda(intrare, d);
  const G = optiuni.grila ?? 40;
  const pad = 0.05 * Math.max(lat, ina) + 2 * b;
  const X0 = c.x0 - pad, Y0 = c.y0 - pad, X1 = c.x1 + pad, Y1 = c.y1 + pad;
  const puncte: PunctO[] = [];
  for (let i = 0; i < G; i++) {
    for (let j = 0; j < G; j++) puncte.push({ x: X0 + ((X1 - X0) * (i + 0.5)) / G, y: Y0 + ((Y1 - Y0) * (j + 0.5)) / G });
  }
  puncte.push(...tinteIntrare(qs, d, b, Math.sign(arie(intrare)) || 1));
  return { qs, d, banda: b, puncte };
}

/** Clasificarea așteptată (contractul) și distanța; `asteptat` lipsește în bandă. */
function asteapta(prep: Pregatire, x: number, y: number): { asteptat?: boolean; distanta: number } {
  const dd = distantaLaFrontiera(prep.qs, x, y);
  const ad = Math.abs(prep.d);
  if (!(Math.abs(dd - ad) > prep.banda)) return { distanta: dd };
  const inIntrare = paritate(prep.qs, x, y);
  const asteptat = prep.d >= 0 ? inIntrare || dd <= ad : inIntrare && dd >= ad;
  return { asteptat, distanta: dd };
}

/**
 * Clasificarea contractului: pentru fiecare punct al grilei (40 × 40 implicit) și fiecare punct-țintă aflat în afara
 * benzii, așteptarea din intrare față de interiorul `evenodd` al tuturor contururilor ieșirii. Întoarce punctele
 * nepotrivite (listă goală = bine).
 */
export function clasificaOffset(intrare: ConturO, distanta: number, iesire: readonly ConturO[], optiuni: OptiuniClasificare = {}): Nepotrivire[] {
  const prep = pregateste(intrare, distanta, optiuni);
  const qo = iesire.flatMap(bucatiInchise);
  const rez: Nepotrivire[] = [];
  for (const p of [...prep.puncte, ...tinteIesire(iesire, prep.banda)]) {
    const e = asteapta(prep, p.x, p.y);
    if (e.asteptat === undefined) continue;
    const real = paritate(qo, p.x, p.y);
    if (real !== e.asteptat) rez.push({ x: p.x, y: p.y, asteptat: e.asteptat, real, distanta: e.distanta });
  }
  return rez;
}

/**
 * Două ieșiri pentru aceeași intrare (o intrare murdară și geamăna ei curată): punctele judecate (în afara benzii
 * așteptate) pe care ele le clasifică diferit. Listă goală = aceeași clasificare.
 */
export function comparaIesiri(intrare: ConturO, distanta: number, a: readonly ConturO[], b: readonly ConturO[], optiuni: OptiuniClasificare = {}): Nepotrivire[] {
  const prep = pregateste(intrare, distanta, optiuni);
  const qa = a.flatMap(bucatiInchise), qb = b.flatMap(bucatiInchise);
  const rez: Nepotrivire[] = [];
  for (const p of [...prep.puncte, ...tinteIesire(a, prep.banda), ...tinteIesire(b, prep.banda)]) {
    const e = asteapta(prep, p.x, p.y);
    if (e.asteptat === undefined) continue;
    const ra = paritate(qa, p.x, p.y), rb = paritate(qb, p.x, p.y);
    if (ra !== rb) rez.push({ x: p.x, y: p.y, asteptat: rb, real: ra, distanta: e.distanta });
  }
  return rez;
}

// ---------------------------------------------------------------------------------------------------------------------
// Abaterea: fiecare punct al traseului la |d| de intrare, în ambele sensuri.
// ---------------------------------------------------------------------------------------------------------------------

/**
 * Abaterea Hausdorff, în ambele sensuri, a ieșirii față de marginea exactă a offsetului, fără s-o construiască:
 * - ieșire → adevăr: pe FIECARE segment de ieșire, 17 puncte (9 peste 2 000 de segmente); distanța cu semn la intrare
 *   (pozitivă în afară) trebuie să fie exact d — deci și „afară la exterior, înăuntru la interior”;
 * - adevăr → ieșire: punctele de pe normalele intrării și din evantaiele vârfurilor, mutate cu d; cele care chiar stau pe
 *   marginea exactă (distanța cu semn = d, la 1e-9 × diagonala) trebuie să fie pe ieșire.
 */
export function abatere(intrare: ConturO, d: number, iesire: readonly ConturO[]): { readonly iesireLaAdevar: number; readonly adevarLaIesire: number } {
  const qs = bucatiInchise(intrare);
  const qo = iesire.flatMap(bucatiInchise).filter((q) => q.L > 0);
  if (qo.length === 0) return { iesireLaAdevar: Infinity, adevarLaIesire: Infinity };
  const cuSemn = (x: number, y: number): number => (paritate(qs, x, y) ? -1 : 1) * distantaLaFrontiera(qs, x, y);
  let e1 = 0;
  const k1 = qo.length > 2000 ? 8 : 16;
  for (const q of qo) {
    for (let k = 0; k <= k1; k++) {
      const p = punctPe(q, k / k1);
      const e = Math.abs(cuSemn(p.x, p.y) - d);
      if (!(e <= e1)) e1 = e;
    }
  }
  const c = cadru(intrare, d);
  const tolAdevar = 1e-9 * Math.max(1, Math.hypot(c.x1 - c.x0, c.y1 - c.y0));
  const orientare = Math.sign(arie(intrare)) || 1;
  const valide = qs.filter((q) => q.L > 0);
  const n = valide.length;
  const pasI = Math.max(1, Math.ceil(n / 600));
  let e2 = 0;
  const incearca = (x: number, y: number): void => {
    if (!(Math.abs(cuSemn(x, y) - d) <= tolAdevar)) return;
    const e = distantaLaFrontiera(qo, x, y);
    if (!(e <= e2)) e2 = e;
  };
  for (let i = 0; i < n; i += pasI) {
    const q = el(valide, i);
    for (let k = 0; k <= 16; k++) {
      const p = punctPe(q, k / 16);
      const [nx, ny] = normalaExterioara(p.tx, p.ty, orientare);
      incearca(p.x + nx * d, p.y + ny * d);
    }
    const prec = punctPe(el(valide, (i - 1 + n) % n), 1);
    const start = punctPe(q, 0);
    const [ax, ay] = normalaExterioara(prec.tx, prec.ty, orientare);
    const [bx, by] = normalaExterioara(start.tx, start.ty, orientare);
    const unghi = Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
    for (let j = 1; j < 8; j++) {
      const fi = (unghi * j) / 8;
      incearca(start.x + (ax * Math.cos(fi) - ay * Math.sin(fi)) * d, start.y + (ax * Math.sin(fi) + ay * Math.cos(fi)) * d);
    }
  }
  return { iesireLaAdevar: e1, adevarLaIesire: e2 };
}

/**
 * Toate verificările obligatorii ale unei ieșiri `ok` (contractul v2): structura, topologia pe puncte, aria netă,
 * abaterea ≤ 0,002 mm în ambele sensuri, atingerile, orientarea. Listă goală = ieșirea e corectă.
 */
export function verificaIesirea(intrare: ConturO, d: number, iesire: readonly ConturO[]): string[] {
  const probleme = [...verificaStructura(iesire)];
  const n = clasificaOffset(intrare, d, iesire);
  if (n.length > 0) {
    const p = el(n, 0);
    probleme.push(`${n.length} puncte clasificate greșit; primul (${p.x}, ${p.y}): așteptat ${p.asteptat ? 'înăuntru' : 'afară'}, la ${p.distanta} de intrare`);
  }
  const a = verificaArie(intrare, d, iesire);
  if (a !== undefined) probleme.push(a);
  const ab = abatere(intrare, d, iesire);
  if (!(ab.iesireLaAdevar <= PRAGURI.abatereMaxima && ab.adevarLaIesire <= PRAGURI.abatereMaxima)) {
    probleme.push(`abaterea: ieșire → adevăr ${ab.iesireLaAdevar} mm, adevăr → ieșire ${ab.adevarLaIesire} mm (maximum ${PRAGURI.abatereMaxima})`);
  }
  probleme.push(...verificaAtingerile(iesire), ...verificaOrientarea(iesire));
  return probleme;
}
