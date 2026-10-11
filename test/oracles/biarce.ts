/**
 * ORACOLUL biarcelor (felia 2.7a, ADR 0033), cu ZERO importuri din `src/`. Geometria e scrisă aici din nou, din textul
 * ADR-ului și din convenția conturului (ADR 0001: fiecare vârf poartă segmentul care pleacă din el; bulge = tan(baleiaj / 4),
 * pozitiv în sens trigonometric; lanțul unei cubice începe în a, iar ultima lui bucată merge până în b, care NU e în lanț),
 * nu din codul aplicației: dacă aplicația și oracolul ar împărți o formulă, o greșeală acolo ar trece prin amândouă.
 *
 * Ce judecă (`judecaLantul`, toate obligatorii, pe un rezultat `ok`):
 * - forma: vârfuri cu numere finite, doar linii și arce (nicio cubică rămasă), `bucati` = numărul vârfurilor, cel mult
 *   4 096 de bucăți (§5), nicio bucată mai scurtă de 1e-9 mm (nici ultima, spre b), nicio rază de arc peste
 *   `RAZA_MAXIMA_ARC` = 9 900 mm (§1, §4);
 * - capetele (§4): primul vârf e EXACT a (===, nu „aproape”); lanțul gol e permis doar la cubica degenerată, iar cubica
 *   degenerată (toate cele patru puncte la sub 1e-9 mm unul de altul) dă lanțul gol;
 * - tăieturile (§4, în ordinea contractului): (1) la fiecare inflexiune (cross(B′, B″) = 0) și la fiecare vârf EXACT (B′ = 0)
 *   din (0, 1), un vârf al lanțului stă pe punctul curbei; (2) fiecare bucată dintre aceste tăieturi care e plată (c1, c2 ai
 *   ei la cel mult 0,99 × tol de segmentul ei) e EXACT o linie, din tăietură în tăietură; (3) în fiecare bucată care nu e
 *   plată, fiecare extrem pe axe (B′x = 0 sau B′y = 0) e și el un vârf al lanțului. Rădăcinile se calculează EXACT
 *   (aritmetică întreagă pe numerele intrării), iar marginea unei tăieturi (`margineTaietura`) cuprinde condiționarea
 *   rădăcinii în virgulă mobilă (inflexiunea prost condiționată a recenziei: ~3e-6 mm). O cubică cu toate cele patru puncte
 *   exact pe o dreaptă dă doar linii;
 * - abaterea (§3): Hausdorff în AMBELE sensuri ≤ tol, măsurată de oracol (mai jos);
 * - tangenta (§4): între două arce vecine, unghiul dintre tangenta de sfârșit a primului și cea de început a celui de-al
 *   doilea ≤ pragul de unghi; excepțiile: lângă o linie (oricare vecin e linie), și la un vârf PRACTIC al cubicei (îmbinarea
 *   la cel mult tol de punctul de vârf), unde tangenta e fie continuă, fie întoarsă (un colț de peste 90°).
 * `judecaConturul` judecă `conturFaraCubice`: același `inchis`, liniile și arcele neschimbate, fiecare cubică înlocuită de
 * lanțul ei (cel dat de ușa `cubicaInArce` a aplicației, judecat și el independent), `bucati` = suma.
 *
 * Cum măsoară (precizia e declarată):
 * - distanța de la un punct la o LINIE: proiecția pe segment; la un ARC: în cadrul coardei (mijlocul M, direcția u, normala
 *   n spre partea arcului, semi-coarda h, centrul în M − k·n), cu testul de sector h·Y + k·(h − |X|) ≥ 0 și distanța la cerc
 *   |N| / (√(X² + (Y + k)²) + r), N = (|X| − h)(|X| + h) + Y·(Y + 2k), fără diferența a două numere mari (un arc aproape
 *   drept, cu raza de 1e10 mm, rămâne exact); altfel, capătul mai apropiat. Exactă până la rotunjire;
 * - distanța de la un punct la CUBICĂ: ramificare și mărginire (branch and bound) pe subdiviziunile de Casteljau. Marginea
 *   de jos a unei bucăți e distanța exactă la învelitoarea convexă a celor patru puncte de control (0 înăuntru, altfel
 *   minimul pe cele 6 segmente dintre ele); marginea de sus e distanța la puncte ale curbei. O bucată se aruncă atunci când
 *   marginea ei de jos ≥ cea mai bună distanță − ε, ε = 1e-12 × diagonala cutiei punctelor de control + 1e-14 × cea mai
 *   mare coordonată (rotunjirea coordonatelor: lângă 1 000 mm, un ulp e 1,1e-13 mm); la sfârșit, un pas
 *   Newton local. Întoarce distanța d (atinsă de un punct al curbei, deci d ≥ adevărul) și marginea `jos` (adevărul ≥ jos),
 *   cu d − jos ≤ ε; peste 200 000 de pași se oprește cu intervalul [jos, d] cinstit, mai larg;
 * - Hausdorff curbă → lanț: g(t) = distanța exactă de la B(t) la lanț (minimul pe toate bucățile, cu cutii pentru tăiere).
 *   Grila: capetele, proiecțiile vârfurilor lanțului pe curbă și `PRAGURI.esantioane` de intervale între două proiecții
 *   vecine (cel puțin 128 pe toată curba); apoi fiecare maxim local al grilei (≥ 0,2 × maximul grilei) se rafinează prin
 *   secțiunea de aur pe cele două intervale vecine, până la 1e-15 în t. Fiecare valoare e o distanță adevărată, deci
 *   maximul raportat e o margine de JOS a supremului; un vârf mai îngust decât pasul grilei poate scăpa (riscul declarat);
 * - Hausdorff lanț → curbă: `PRAGURI.esantioane` + 1 puncte pe fiecare bucată (la arc, egal pe unghi), cu distanța la
 *   cubică: întâi Newton pornit din t-ul punctului vecin (o margine de SUS: e distanța la un punct al curbei), iar peste
 *   jumătate din pragul verdictului, ramificare și mărginire (exactă); maximele locale se rafinează tot cu secțiunea de aur,
 *   iar maximul raportat e recalculat exact.
 * Verdictul cere ambele maxime ≤ tol (≤, nu <: contractul spune „cel mult”).
 *
 * Alegerile mele unde ADR-ul tace (și în raport):
 * - „degenerată” = cea mai mare distanță dintre două dintre cele patru puncte < 1e-9 mm;
 * - unghiul de continuitate `PRAGURI.unghi` (tangenta e continuă „până la rotunjire”), calibrat pe zgomotul unei bucăți:
 *   1e-7 rad + 1e-12 × mărimea cubicei / lungimea celei mai scurte dintre cele două bucăți;
 * - vârful cubicei are două praguri: EXACT (tăietura e cerută) = un minim local al lui |B′| în (0, 1) cu
 *   |B′| ≤ 1e-9 × max |B′| (B′ = 0 până la rotunjire); PRACTIC (excepția de tangentă) = |B′| ≤ 1e-6 × max |B′|, unde curba se
 *   întoarce pe o lungime neglijabilă, iar întoarcerea lanțului nu mai e exact π (se cere doar un colț de peste 90°);
 * - o bucată de lungime zero (coarda nulă) e o greșeală de formă: nu e nici linie, nici arc (ADR-ul spune doar că o cubică
 *   degenerată nu dă nicio bucată);
 * - regula liniei se cere strict doar unde ADR-ul o face sigură (fără tăieturi în interior, sau toate punctele pe dreaptă).
 */

export type PunctO = { readonly x: number; readonly y: number };

export type SegmentO =
  | { readonly tip: 'L' }
  | { readonly tip: 'A'; readonly bulge: number }
  | { readonly tip: 'C'; readonly c1: PunctO; readonly c2: PunctO };

export type VarfO = { readonly p: PunctO; readonly s: SegmentO };

export type ConturO = { readonly inchis: boolean; readonly varfuri: readonly VarfO[] };

export type CubicaO = { readonly a: PunctO; readonly c1: PunctO; readonly c2: PunctO; readonly b: PunctO };

/** Pragurile contractului (ADR 0033), copiate din text, nu din aplicație; plus pragurile oracolului (declarate). */
export const PRAGURI = {
  /** §1: toleranța proiectului, în mm. */
  toleranta: 0.001,
  /** §1, §4: ținta fitter-ului și pragul bucății plate, × tol. */
  tinta: 0.99,
  /** §5: cel mult atâtea bucăți pe o cubică. */
  plafon: 4096,
  /** §4: sub atât (mm), cubica e degenerată. */
  degenerat: 1e-9,
  /** §1, §4: cea mai mare rază a unui arc din lanț (mm); peste ea, arcul trebuia să devină linie. */
  razaMaxima: 9900,
  /** §4: niciun vârf al lanțului la sub atât (mm) de următorul (nicio bucată nulă). */
  segmentMinim: 1e-9,
  /** Oracolul: intervale de grilă pe bucată, în fiecare sens (fitter-ul cere ≥ 32 de puncte, §6). */
  esantioane: 40,
  /** Oracolul: unghiul de continuitate, partea absolută (rad). */
  unghi: 1e-7,
  /** Oracolul: unghiul de continuitate, partea de zgomot (× mărimea / lungimea bucății). */
  unghiZgomot: 1e-12,
  /** Oracolul: precizia relativă a distanței la cubică (× diagonala cutiei punctelor de control). */
  epsCubica: 1e-12,
  /** Oracolul: vârful EXACT (§4, tăietura cerută) = minim local al lui |B′| cu |B′| ≤ atât × max |B′| (B′ = 0 până la rotunjire). */
  varfExact: 1e-9,
  /** Oracolul: vârful PRACTIC (excepția de tangentă) = |B′| ≤ atât × max |B′| (curba se întoarce pe mult sub 1e-6 din lungime). */
  varfPractic: 1e-6,
  /**
   * Oracolul: o tăietură e „pe curbă” dacă un vârf al lanțului e la cel mult atât × mărimea + 1e-12 × max |coordonată| +
   * 1e-9 mm, plus marginea de condiționare a rădăcinii (`margineTaietura`).
   */
  taietura: 1e-9,
  /** Oracolul: factorul de siguranță pe marginea de condiționare (eroarea oracolului + a aplicației, fiecare sub margine). */
  conditionare: 2,
} as const;

// ---------------------------------------------------------------------------------------------------------------------
// Cubica: punctul, derivatele, împărțirea.
// ---------------------------------------------------------------------------------------------------------------------

export function punctCubica(c: CubicaO, t: number): PunctO {
  const m = 1 - t;
  const b0 = m * m * m;
  const b1 = 3 * m * m * t;
  const b2 = 3 * m * t * t;
  const b3 = t * t * t;
  return {
    x: b0 * c.a.x + b1 * c.c1.x + b2 * c.c2.x + b3 * c.b.x,
    y: b0 * c.a.y + b1 * c.c1.y + b2 * c.c2.y + b3 * c.b.y,
  };
}

export function derivataCubica(c: CubicaO, t: number): PunctO {
  const m = 1 - t;
  const ax = c.c1.x - c.a.x, ay = c.c1.y - c.a.y;
  const bx = c.c2.x - c.c1.x, by = c.c2.y - c.c1.y;
  const cx = c.b.x - c.c2.x, cy = c.b.y - c.c2.y;
  return { x: 3 * (m * m * ax + 2 * m * t * bx + t * t * cx), y: 3 * (m * m * ay + 2 * m * t * by + t * t * cy) };
}

function derivata2Cubica(c: CubicaO, t: number): PunctO {
  const m = 1 - t;
  const px = c.c2.x - 2 * c.c1.x + c.a.x, py = c.c2.y - 2 * c.c1.y + c.a.y;
  const qx = c.b.x - 2 * c.c2.x + c.c1.x, qy = c.b.y - 2 * c.c2.y + c.c1.y;
  return { x: 6 * (m * px + t * qx), y: 6 * (m * py + t * qy) };
}

/** Diagonala cutiei celor patru puncte (mărimea cubicei), cel puțin 1e-300. */
export function marimeCubica(c: CubicaO): number {
  const xs = [c.a.x, c.c1.x, c.c2.x, c.b.x];
  const ys = [c.a.y, c.c1.y, c.c2.y, c.b.y];
  return Math.max(1e-300, Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)));
}

/**
 * Precizia declarată a distanței la cubică: 1e-12 × mărimea + 1e-14 × cea mai mare coordonată (rotunjirea coordonatelor:
 * lângă 1 000 mm, un ulp e 1,1e-13 mm, iar învelitoarea se calculează din diferențe de coordonate).
 */
export function precizieCubica(c: CubicaO): number {
  let m = 0;
  for (const p of [c.a, c.c1, c.c2, c.b]) m = Math.max(m, Math.abs(p.x), Math.abs(p.y));
  return PRAGURI.epsCubica * marimeCubica(c) + 1e-14 * m;
}

/** Cea mai mare distanță dintre două dintre cele patru puncte. */
export function intindereCubica(c: CubicaO): number {
  const p = [c.a, c.c1, c.c2, c.b];
  let m = 0;
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
    const u = p[i] as PunctO, v = p[j] as PunctO;
    m = Math.max(m, Math.hypot(u.x - v.x, u.y - v.y));
  }
  return m;
}

export const esteDegenerata = (c: CubicaO): boolean => intindereCubica(c) < PRAGURI.degenerat;

// ---------------------------------------------------------------------------------------------------------------------
// Distanța de la un punct la cubică: ramificare și mărginire, cu învelitoarea convexă.
// ---------------------------------------------------------------------------------------------------------------------

function distSegment(x: number, y: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const L2 = dx * dx + dy * dy;
  let f = L2 > 0 ? ((x - ax) * dx + (y - ay) * dy) / L2 : 0;
  if (f < 0) f = 0;
  else if (f > 1) f = 1;
  return Math.hypot(x - (ax + f * dx), y - (ay + f * dy));
}

const orient = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number): number =>
  (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);

function inTriunghi(x: number, y: number, ax: number, ay: number, bx: number, by: number, cx: number, cy: number): boolean {
  const aria = orient(ax, ay, bx, by, cx, cy);
  if (aria === 0) return false;
  const s1 = orient(ax, ay, bx, by, x, y);
  const s2 = orient(bx, by, cx, cy, x, y);
  const s3 = orient(cx, cy, ax, ay, x, y);
  return aria > 0 ? s1 >= 0 && s2 >= 0 && s3 >= 0 : s1 <= 0 && s2 <= 0 && s3 <= 0;
}

/** Distanța exactă de la (x, y) la învelitoarea convexă a patru puncte: 0 înăuntru, altfel minimul pe cele 6 segmente. */
export function distInvelitoare(
  x: number, y: number, x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number,
): number {
  if (inTriunghi(x, y, x0, y0, x1, y1, x2, y2) || inTriunghi(x, y, x0, y0, x1, y1, x3, y3)
    || inTriunghi(x, y, x0, y0, x2, y2, x3, y3) || inTriunghi(x, y, x1, y1, x2, y2, x3, y3)) return 0;
  return Math.min(
    distSegment(x, y, x0, y0, x1, y1), distSegment(x, y, x0, y0, x2, y2), distSegment(x, y, x0, y0, x3, y3),
    distSegment(x, y, x1, y1, x2, y2), distSegment(x, y, x1, y1, x3, y3), distSegment(x, y, x2, y2, x3, y3),
  );
}

/** Pași Newton pe f(t) = (B − q)·B′ = 0, din t0; întoarce cel mai bun t văzut (distanța lui e o margine de sus). */
function newtonLocal(c: CubicaO, x: number, y: number, t0: number): { t: number; d: number } {
  let t = t0;
  let p = punctCubica(c, t);
  let bestT = t, best = Math.hypot(p.x - x, p.y - y);
  for (let i = 0; i < 30; i++) {
    const d1 = derivataCubica(c, t), d2 = derivata2Cubica(c, t);
    const ex = p.x - x, ey = p.y - y;
    const f = ex * d1.x + ey * d1.y;
    const fp = d1.x * d1.x + d1.y * d1.y + ex * d2.x + ey * d2.y;
    if (!(fp > 0)) break;
    let tn = t - f / fp;
    if (tn < 0) tn = 0;
    else if (tn > 1) tn = 1;
    if (tn === t) break;
    t = tn;
    p = punctCubica(c, t);
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < best) { best = d; bestT = t; }
  }
  return { t: bestT, d: best };
}

export type DistantaCubica = {
  /** Distanța atinsă de punctul B(t): o margine de sus a distanței adevărate. */
  readonly d: number;
  readonly t: number;
  /** O margine de jos a distanței adevărate (d − jos ≤ ε la terminarea normală). */
  readonly jos: number;
};

/** Distanța exactă (în precizia declarată) de la (x, y) la cubică; `pornire` dă un t de încercat întâi. */
export function distantaLaCubica(c: CubicaO, x: number, y: number, pornire?: number): DistantaCubica {
  let best = Infinity, bestT = 0;
  const incearca = (t: number): void => {
    const p = punctCubica(c, t);
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < best) { best = d; bestT = t; }
  };
  for (let k = 0; k <= 8; k++) incearca(k / 8);
  if (pornire !== undefined) {
    const n = newtonLocal(c, x, y, pornire);
    if (n.d < best) { best = n.d; bestT = n.t; }
  }
  {
    const n = newtonLocal(c, x, y, bestT);
    if (n.d < best) { best = n.d; bestT = n.t; }
  }
  const eps = precizieCubica(c);
  const stiva: number[] = [c.a.x, c.a.y, c.c1.x, c.c1.y, c.c2.x, c.c2.y, c.b.x, c.b.y, 0, 1];
  let jos = Infinity;
  let pasi = 0;
  while (stiva.length > 0) {
    const t1 = stiva.pop() as number, t0 = stiva.pop() as number;
    const y3 = stiva.pop() as number, x3 = stiva.pop() as number;
    const y2 = stiva.pop() as number, x2 = stiva.pop() as number;
    const y1 = stiva.pop() as number, x1 = stiva.pop() as number;
    const y0 = stiva.pop() as number, x0 = stiva.pop() as number;
    const lb = distInvelitoare(x, y, x0, y0, x1, y1, x2, y2, x3, y3);
    if (lb >= best - eps) { if (lb < jos) jos = lb; continue; }
    if (t1 - t0 <= 1e-16 || ++pasi > 200000) { if (lb < jos) jos = lb; continue; }
    // de Casteljau la 1/2.
    const ax = (x0 + x1) / 2, ay = (y0 + y1) / 2;
    const bx = (x1 + x2) / 2, by = (y1 + y2) / 2;
    const cx = (x2 + x3) / 2, cy = (y2 + y3) / 2;
    const dx = (ax + bx) / 2, dy = (ay + by) / 2;
    const ex = (bx + cx) / 2, ey = (by + cy) / 2;
    const mx = (dx + ex) / 2, my = (dy + ey) / 2;
    const tm = (t0 + t1) / 2;
    const dm = Math.hypot(mx - x, my - y);
    if (dm < best) { best = dm; bestT = tm; }
    // Jumătatea mai apropiată se ia întâi (e pusă ultima pe stivă).
    const lStanga = Math.hypot(ax - x, ay - y), lDreapta = Math.hypot(cx - x, cy - y);
    if (lStanga <= lDreapta) {
      stiva.push(mx, my, ex, ey, cx, cy, x3, y3, tm, t1);
      stiva.push(x0, y0, ax, ay, dx, dy, mx, my, t0, tm);
    } else {
      stiva.push(x0, y0, ax, ay, dx, dy, mx, my, t0, tm);
      stiva.push(mx, my, ex, ey, cx, cy, x3, y3, tm, t1);
    }
  }
  const n = newtonLocal(c, x, y, bestT);
  if (n.d < best) { best = n.d; bestT = n.t; }
  return { d: best, t: bestT, jos: Math.min(jos, best) };
}

// ---------------------------------------------------------------------------------------------------------------------
// Bucata lanțului (linie sau arc), în cadrul coardei.
// ---------------------------------------------------------------------------------------------------------------------

export type PiesaO = {
  readonly a: PunctO;
  readonly b: PunctO;
  /** Arc adevărat: tip 'A', bulge ≠ 0 și coarda nenulă. */
  readonly arc: boolean;
  readonly bulge: number;
  readonly mx: number;
  readonly my: number;
  /** Direcția coardei, unitară. */
  readonly ux: number;
  readonly uy: number;
  /** Normala: spre partea arcului (la arc), stânga (la linie). */
  readonly nx: number;
  readonly ny: number;
  /** Semi-coarda. */
  readonly h: number;
  /** Centrul e în M − k·n; k = h(1 − β²)/(2|β|). */
  readonly k: number;
  readonly r: number;
  /** Baleiajul cu semn, 4·atan(bulge). */
  readonly baleiaj: number;
  /** Cutia (conservatoare). */
  readonly x0: number;
  readonly x1: number;
  readonly y0: number;
  readonly y1: number;
};

export function piesa(a: PunctO, b: PunctO, s: SegmentO): PiesaO {
  const dx = b.x - a.x, dy = b.y - a.y;
  const L = Math.hypot(dx, dy);
  const h = L / 2;
  const ux = L > 0 ? dx / L : 0, uy = L > 0 ? dy / L : 0;
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  const bulge = s.tip === 'A' ? s.bulge : 0;
  const cx0 = Math.min(a.x, b.x), cx1 = Math.max(a.x, b.x), cy0 = Math.min(a.y, b.y), cy1 = Math.max(a.y, b.y);
  if (!(s.tip === 'A' && bulge !== 0 && L > 0)) {
    return { a, b, arc: false, bulge: 0, mx, my, ux, uy, nx: -uy, ny: ux, h, k: 0, r: 0, baleiaj: 0, x0: cx0, x1: cx1, y0: cy0, y1: cy1 };
  }
  // bulge > 0: arcul merge trigonometric, deci stă la DREAPTA coardei a → b (normala dreaptă e (uy, −ux)).
  const sg = bulge > 0 ? 1 : -1;
  const ab = Math.abs(bulge);
  const nx = sg * uy, ny = -sg * ux;
  const k = (h * (1 - ab * ab)) / (2 * ab);
  const r = (h * (1 + ab * ab)) / (2 * ab);
  let x0: number, x1: number, y0: number, y1: number;
  if (ab <= 1) {
    const sag = h * ab;
    x0 = cx0 - sag; x1 = cx1 + sag; y0 = cy0 - sag; y1 = cy1 + sag;
  } else {
    const ox = mx - k * nx, oy = my - k * ny;
    x0 = ox - r; x1 = ox + r; y0 = oy - r; y1 = oy + r;
  }
  return { a, b, arc: true, bulge, mx, my, ux, uy, nx, ny, h, k, r, baleiaj: 4 * Math.atan(bulge), x0, x1, y0, y1 };
}

/** Distanța exactă de la (x, y) la bucată. */
export function distantaLaPiesa(q: PiesaO, x: number, y: number): number {
  const dx = x - q.mx, dy = y - q.my;
  if (q.h === 0) return Math.hypot(dx, dy);
  const X = dx * q.ux + dy * q.uy;
  const Y = dx * q.nx + dy * q.ny;
  const aX = Math.abs(X);
  if (!q.arc) return aX <= q.h ? Math.abs(Y) : Math.hypot(aX - q.h, Y);
  if (q.h * Y + q.k * (q.h - aX) >= 0) {
    const N = (aX - q.h) * (aX + q.h) + Y * (Y + 2 * q.k);
    return Math.abs(N) / (Math.hypot(X, Y + q.k) + q.r);
  }
  return Math.hypot(aX - q.h, Y);
}

/** Punctul de la fracțiunea f a bucății (la arc, egal pe unghi). */
export function punctPePiesa(q: PiesaO, f: number): PunctO {
  if (f === 0) return q.a;
  if (f === 1) return q.b;
  if (!q.arc) return { x: q.a.x + (q.b.x - q.a.x) * f, y: q.a.y + (q.b.y - q.a.y) * f };
  const psi = Math.abs(q.baleiaj) * (f - 0.5);
  const sj = Math.sin(psi / 2);
  const u = q.r * Math.sin(psi);
  const w = q.h * Math.abs(q.bulge) - 2 * q.r * sj * sj;
  return { x: q.mx + q.ux * u + q.nx * w, y: q.my + q.uy * u + q.ny * w };
}

/** Tangenta unitară la începutul (f = 0) sau la sfârșitul (f = 1) bucății, în sensul de mers. */
export function tangentaPiesei(q: PiesaO, f: 0 | 1): PunctO {
  if (!q.arc) return { x: q.ux, y: q.uy };
  const psi = Math.abs(q.baleiaj) * (f - 0.5);
  const c = Math.cos(psi), s = Math.sin(psi);
  return { x: q.ux * c - q.nx * s, y: q.uy * c - q.ny * s };
}

/** Lungimea pe curbă a bucății. */
export const lungimePiesa = (q: PiesaO): number => (q.arc ? q.r * Math.abs(q.baleiaj) : 2 * q.h);

/** Cutia unui bloc de bucăți consecutive (pentru tăierea căutării). */
type Bloc = { readonly i0: number; readonly i1: number; readonly x0: number; readonly x1: number; readonly y0: number; readonly y1: number };

export type LantO = { readonly a: PunctO; readonly b: PunctO; readonly piese: readonly PiesaO[]; readonly blocuri: readonly Bloc[] };

const MARIME_BLOC = 32;

/** Lanțul din bucăți date (blocurile de câte 32, cu cutiile lor, sunt doar pentru viteză). */
export function lantDinPiese(a: PunctO, piese: readonly PiesaO[], b: PunctO): LantO {
  const blocuri: Bloc[] = [];
  for (let i0 = 0; i0 < piese.length; i0 += MARIME_BLOC) {
    const i1 = Math.min(piese.length, i0 + MARIME_BLOC);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (let i = i0; i < i1; i++) {
      const q = piese[i] as PiesaO;
      x0 = Math.min(x0, q.x0); x1 = Math.max(x1, q.x1); y0 = Math.min(y0, q.y0); y1 = Math.max(y1, q.y1);
    }
    blocuri.push({ i0, i1, x0, x1, y0, y1 });
  }
  return { a, b, piese, blocuri };
}

/** Bucățile lanțului: vârful i merge la vârful i + 1, ultimul merge în b. */
export function lant(a: PunctO, varfuri: readonly VarfO[], b: PunctO): LantO {
  const piese: PiesaO[] = [];
  for (let i = 0; i < varfuri.length; i++) {
    const v = varfuri[i] as VarfO;
    const urm = i + 1 < varfuri.length ? (varfuri[i + 1] as VarfO).p : b;
    piese.push(piesa(v.p, urm, v.s));
  }
  return lantDinPiese(a, piese, b);
}

const distCutie = (x: number, y: number, c: { readonly x0: number; readonly x1: number; readonly y0: number; readonly y1: number }): number => {
  const bx = x < c.x0 ? c.x0 - x : x > c.x1 ? x - c.x1 : 0;
  const by = y < c.y0 ? c.y0 - y : y > c.y1 ? y - c.y1 : 0;
  return Math.hypot(bx, by);
};

/** Distanța exactă de la (x, y) la lanț (la lanțul gol: la a și b); `indiciu` = bucata de încercat întâi. */
export function distantaLaLant(l: LantO, x: number, y: number, indiciu = 0): { d: number; i: number } {
  const n = l.piese.length;
  if (n === 0) return { d: Math.min(Math.hypot(x - l.a.x, y - l.a.y), Math.hypot(x - l.b.x, y - l.b.y)), i: 0 };
  const h = Math.min(Math.max(indiciu, 0), n - 1);
  let i0 = h;
  let best = distantaLaPiesa(l.piese[h] as PiesaO, x, y);
  for (const bl of l.blocuri) {
    if (distCutie(x, y, bl) >= best) continue;
    for (let j = bl.i0; j < bl.i1; j++) {
      if (j === h) continue;
      const q = l.piese[j] as PiesaO;
      if (distCutie(x, y, q) >= best) continue;
      const d = distantaLaPiesa(q, x, y);
      if (d < best) { best = d; i0 = j; }
    }
  }
  return { d: best, i: i0 };
}

// ---------------------------------------------------------------------------------------------------------------------
// Hausdorff, în ambele sensuri.
// ---------------------------------------------------------------------------------------------------------------------

const AUR = (Math.sqrt(5) - 1) / 2;

/** Maximul lui f pe [lo, hi] prin secțiunea de aur (plus capetele); întoarce cel mai bun punct evaluat. */
function maximAuriu(f: (x: number) => number, lo: number, hi: number, precizie: number): { x: number; v: number } {
  let bx = lo, bv = f(lo);
  const vh = f(hi);
  if (vh > bv) { bx = hi; bv = vh; }
  let x1 = hi - AUR * (hi - lo), x2 = lo + AUR * (hi - lo);
  let f1 = f(x1), f2 = f(x2);
  for (let i = 0; i < 200 && hi - lo > precizie; i++) {
    if (f1 > bv) { bv = f1; bx = x1; }
    if (f2 > bv) { bv = f2; bx = x2; }
    if (f1 < f2) {
      lo = x1; x1 = x2; f1 = f2; x2 = lo + AUR * (hi - lo); f2 = f(x2);
    } else {
      hi = x2; x2 = x1; f2 = f1; x1 = hi - AUR * (hi - lo); f1 = f(x1);
    }
  }
  if (f1 > bv) { bv = f1; bx = x1; }
  if (f2 > bv) { bv = f2; bx = x2; }
  return { x: bx, v: bv };
}

export type Abatere = { readonly max: number; readonly unde: number };

/**
 * Hausdorff curbă → lanț: sup peste t din [0, 1] al distanței de la B(t) la lanț. Fiecare valoare e exactă; maximul e cel
 * mai mare dintre punctele evaluate (grila + rafinarea maximelor locale).
 */
export function abatereCurbaLant(c: CubicaO, l: LantO): Abatere {
  // Grila: proiecțiile vârfurilor lanțului pe curbă, cu M intervale între două vecine, plus o grilă uniformă.
  const ancore: number[] = [0, 1];
  for (const q of l.piese) ancore.push(distantaLaCubica(c, q.a.x, q.a.y).t);
  ancore.sort((u, v) => u - v);
  const M = PRAGURI.esantioane;
  const ts: number[] = [];
  for (let i = 0; i + 1 < ancore.length; i++) {
    const t0 = ancore[i] as number, t1 = ancore[i + 1] as number;
    if (t1 <= t0) continue;
    for (let k = 0; k < M; k++) ts.push(t0 + ((t1 - t0) * k) / M);
  }
  for (let k = 0; k < 128; k++) ts.push(k / 128);
  ts.push(1);
  ts.sort((u, v) => u - v);
  const grila: number[] = [];
  for (const t of ts) if (grila.length === 0 || t > (grila[grila.length - 1] as number)) grila.push(t);
  let indiciu = 0;
  const g = (t: number): number => {
    const p = punctCubica(c, t);
    const r = distantaLaLant(l, p.x, p.y, indiciu);
    indiciu = r.i;
    return r.d;
  };
  const v = grila.map(g);
  let maxGrila = 0;
  for (const x of v) if (x > maxGrila) maxGrila = x;
  let best = maxGrila, unde = grila[v.indexOf(maxGrila)] ?? 0;
  for (let i = 0; i < grila.length; i++) {
    const vi = v[i] as number;
    if (vi < 0.2 * maxGrila) continue;
    const st = i > 0 ? (v[i - 1] as number) : -Infinity;
    const dr = i + 1 < grila.length ? (v[i + 1] as number) : -Infinity;
    if (vi < st || vi < dr) continue;
    const lo = grila[Math.max(0, i - 1)] as number, hi = grila[Math.min(grila.length - 1, i + 1)] as number;
    if (hi <= lo) continue;
    const r = maximAuriu(g, lo, hi, 1e-15);
    if (r.v > best) { best = r.v; unde = r.x; }
  }
  return { max: best, unde };
}

/**
 * Hausdorff lanț → curbă: sup peste punctele lanțului al distanței la curbă. Valorile sub `prag` / 2 pot fi margini de sus
 * (Newton local); cele de peste, și maximul raportat, sunt exacte (ramificare și mărginire).
 */
export function abatereLantCurba(c: CubicaO, l: LantO, prag: number): Abatere & { readonly piesa: number } {
  const M = PRAGURI.esantioane;
  let tCurent = 0;
  const d = (p: PunctO): number => {
    const n = newtonLocal(c, p.x, p.y, tCurent);
    if (n.d <= prag / 2) { tCurent = n.t; return n.d; }
    const e = distantaLaCubica(c, p.x, p.y, n.t);
    tCurent = e.t;
    return e.d;
  };
  let best = 0, undeBest = 0, piesaBest = 0;
  for (let j = 0; j < l.piese.length; j++) {
    const q = l.piese[j] as PiesaO;
    tCurent = distantaLaCubica(c, q.a.x, q.a.y).t;
    const fs: number[] = [];
    const vs: number[] = [];
    for (let k = 0; k <= M; k++) {
      const f = k / M;
      fs.push(f);
      vs.push(d(punctPePiesa(q, f)));
    }
    let maxP = 0;
    for (const x of vs) if (x > maxP) maxP = x;
    const candidati: number[] = [];
    for (let k = 0; k <= M; k++) {
      const vk = vs[k] as number;
      if (vk < 0.2 * maxP) continue;
      const st = k > 0 ? (vs[k - 1] as number) : -Infinity;
      const dr = k < M ? (vs[k + 1] as number) : -Infinity;
      if (vk < st || vk < dr) continue;
      if (k === 0 || k === M) { candidati.push(fs[k] as number); continue; }
      const r = maximAuriu((f) => d(punctPePiesa(q, f)), fs[k - 1] as number, fs[k + 1] as number, 1e-15);
      candidati.push(r.x);
    }
    for (const f of candidati) {
      const p = punctPePiesa(q, f);
      const e = distantaLaCubica(c, p.x, p.y).d;
      if (e > best) { best = e; undeBest = f; piesaBest = j; }
    }
    // Valorile grilei de peste prag / 2 sunt deja exacte; nicio valoare a grilei nu se pierde din maxim.
    for (let k = 0; k <= M; k++) {
      const vk = vs[k] as number;
      if (vk > prag / 2 && vk > best) { best = vk; undeBest = fs[k] as number; piesaBest = j; }
    }
  }
  return { max: best, unde: undeBest, piesa: piesaBest };
}

// ---------------------------------------------------------------------------------------------------------------------
// Inflexiunile și vârfurile cubicei.
// ---------------------------------------------------------------------------------------------------------------------

/** Rădăcinile lui c0 + c1·t + c2·t² din (0, 1), stabil. */
function radaciniPatratice(c0: number, c1: number, c2: number): number[] {
  const scara = Math.max(Math.abs(c0), Math.abs(c1), Math.abs(c2));
  if (scara === 0) return [];
  const a = c2 / scara, b = c1 / scara, c = c0 / scara;
  const rez: number[] = [];
  if (Math.abs(a) < 1e-14) {
    if (Math.abs(b) > 1e-14) rez.push(-c / b);
  } else {
    const disc = b * b - 4 * a * c;
    if (disc >= 0) {
      const q = -0.5 * (b + (b >= 0 ? 1 : -1) * Math.sqrt(disc));
      if (q !== 0) rez.push(q / a, c / q);
      else rez.push(0);
    }
  }
  return rez.filter((t) => t > 0 && t < 1).sort((u, v) => u - v);
}

/**
 * Inflexiunile: cross(B′, B″) = 0 pentru t în (0, 1) (polinomul e de gradul 2). O cubică dreaptă până la rotunjire
 * (coeficienții ≤ 1e-14 × mărimea²) n-are inflexiuni: polinomul ei e zero, nu are rădăcini.
 */
export function inflexiuni(c: CubicaO): number[] {
  return inflexiuniCuEroare(c).map((r) => r.t);
}

/**
 * O rădăcină t, calculată EXACT din intrare (aritmetică întreagă, apoi rotunjită o dată), și dt = cât se poate muta o
 * rădăcină calculată în virgulă mobilă: (E0 + E1·t + E2·t²) / |q′(t)|, cu Ei = 2ε × suma modulelor termenilor din care se
 * face coeficientul i. Oracolul nu poartă eroarea asta; aplicația, da.
 */
export type Radacina = { readonly t: number; readonly dt: number };

const EPS = Number.EPSILON;

/** Un număr finit, exact, ca m · 2^-k (m întreg). */
function exact(x: number): { m: bigint; k: number } {
  let k = 0;
  while (!Number.isInteger(x * 2 ** k)) k++;
  return { m: BigInt(x * 2 ** k), k };
}

/** Coordonatele cubicei ca întregi, la scara comună 2^K (exact). */
function intregi(c: CubicaO): bigint[] {
  const xs = [c.a.x, c.a.y, c.c1.x, c.c1.y, c.c2.x, c.c2.y, c.b.x, c.b.y].map(exact);
  const K = Math.max(...xs.map((e) => e.k));
  return xs.map((e) => e.m * 2n ** BigInt(K - e.k));
}

/** n / d ca număr (rotunjit), pentru întregi oricât de mari. */
function cat(n: bigint, d: bigint): number {
  if (d < 0n) { n = -n; d = -d; }
  if (n === 0n) return 0;
  const semn = n < 0n ? -1 : 1;
  if (n < 0n) n = -n;
  const sh = BigInt(Math.max(0, 80 - (n.toString(2).length - d.toString(2).length)));
  return (semn * Number((n << sh) / d)) / 2 ** Number(sh);
}

function radacinaIntreaga(n: bigint): bigint {
  if (n < 2n) return n;
  let x = 1n << BigInt(Math.ceil(n.toString(2).length / 2));
  for (;;) { const y = (x + n / x) >> 1n; if (y >= x) return x; x = y; }
}

/** Rădăcinile exacte (rotunjite o dată) din (0, 1) ale lui k0 + k1·t + k2·t², coeficienți întregi. */
function radaciniExacte(k0: bigint, k1: bigint, k2: bigint): number[] {
  const rez: number[] = [];
  if (k2 === 0n) {
    if (k1 !== 0n) rez.push(cat(-k0, k1));
  } else {
    const D = k1 * k1 - 4n * k0 * k2;
    if (D >= 0n) {
      const P = 200n;
      const s = radacinaIntreaga(D << (2n * P));
      for (const semn of [-1n, 1n]) rez.push(cat((-k1 << P) + semn * s, (2n * k2) << P));
    }
  }
  return [...new Set(rez)].filter((t) => t > 0 && t < 1).sort((u, v) => u - v);
}

/** dt pentru o rădăcină t a polinomului (în virgulă mobilă) q0 + q1·t + q2·t², cu marginile Ei. */
function dtLa(t: number, q1: number, q2: number, E0: number, E1: number, E2: number): number {
  const d = Math.abs(q1 + 2 * q2 * t);
  return d > 0 ? (E0 + E1 * t + E2 * t * t) / d : Infinity;
}

/**
 * Inflexiunile: cross(B′, B″) ∝ k0 + k1·t + k2·t², k0 = U × V, k1 = U × W, k2 = V × W (U = c1 − a, B = c2 − c1,
 * C = b − c2, V = B − U, W = U − 2B + C). Rădăcinile sunt exacte (întregi); dt arată condiționarea: un coeficient care
 * rezultă din scăderea a doi termeni mari (k2 ≈ 0,05 din doi termeni de 3·10⁶) mută rădăcina calculată în double.
 */
export function inflexiuniCuEroare(c: CubicaO): Radacina[] {
  const S = marimeCubica(c);
  const Ux = c.c1.x - c.a.x, Uy = c.c1.y - c.a.y, Bx = c.c2.x - c.c1.x, By = c.c2.y - c.c1.y;
  const Cx = c.b.x - c.c2.x, Cy = c.b.y - c.c2.y;
  const Vx = Bx - Ux, Vy = By - Uy, Wx = Ux - 2 * Bx + Cx, Wy = Uy - 2 * By + Cy;
  const q0 = Ux * Vy - Uy * Vx, q1 = Ux * Wy - Uy * Wx, q2 = Vx * Wy - Vy * Wx;
  if (Math.max(Math.abs(q0), Math.abs(q1), Math.abs(q2)) <= 1e-14 * S * S) return [];
  const E0 = 2 * EPS * (Math.abs(Ux * Vy) + Math.abs(Uy * Vx));
  const E1 = 2 * EPS * (Math.abs(Ux * Wy) + Math.abs(Uy * Wx));
  const E2 = 2 * EPS * (Math.abs(Vx * Wy) + Math.abs(Vy * Wx));
  const [ax, ay, c1x, c1y, c2x, c2y, bx, by] = intregi(c) as [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint];
  const uX = c1x - ax, uY = c1y - ay, bX = c2x - c1x, bY = c2y - c1y, cX = bx - c2x, cY = by - c2y;
  const vX = bX - uX, vY = bY - uY, wX = uX - 2n * bX + cX, wY = uY - 2n * bY + cY;
  return radaciniExacte(uX * vY - uY * vX, uX * wY - uY * wX, vX * wY - vY * wX).map((t) => ({ t, dt: dtLa(t, q1, q2, E0, E1, E2) }));
}

/** Extremele pe axe (§4, pasul 3): B′x = 0 și B′y = 0 pentru t în (0, 1), exacte, cu dt-ul lor. */
export function extremeAxe(c: CubicaO): Radacina[] {
  const [ax, ay, c1x, c1y, c2x, c2y, bx, by] = intregi(c) as [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint];
  // B′/3 = U + 2t(B − U) + t²(U − 2B + C), pe fiecare componentă.
  const pe = (U: bigint, B: bigint, C: bigint, u: number, b: number, cc: number): Radacina[] => {
    const a1 = 2n * (B - U), a2 = U - 2n * B + C;
    if (U === 0n && a1 === 0n && a2 === 0n) return [];
    const q1 = 2 * (b - u), q2 = u - 2 * b + cc;
    const E0 = 2 * EPS * Math.abs(u), E1 = 2 * EPS * (Math.abs(b) + Math.abs(u)) * 2, E2 = 2 * EPS * (Math.abs(u) + 2 * Math.abs(b) + Math.abs(cc));
    return radaciniExacte(U, a1, a2).map((t) => ({ t, dt: dtLa(t, q1, q2, E0, E1, E2) }));
  };
  return [
    ...pe(c1x - ax, c2x - c1x, bx - c2x, c.c1.x - c.a.x, c.c2.x - c.c1.x, c.b.x - c.c2.x),
    ...pe(c1y - ay, c2y - c1y, by - c2y, c.c1.y - c.a.y, c.c2.y - c.c1.y, c.b.y - c.c2.y),
  ].sort((u, v) => u.t - v.t);
}

/** Bucata cubicei dintre parametrii u < v (de Casteljau de două ori). */
export function subCubica(c: CubicaO, u: number, v: number): CubicaO {
  const imparte = (q: CubicaO, t: number): [CubicaO, CubicaO] => {
    const l = (p: PunctO, r: PunctO): PunctO => ({ x: p.x + (r.x - p.x) * t, y: p.y + (r.y - p.y) * t });
    const ab = l(q.a, q.c1), bc = l(q.c1, q.c2), cd = l(q.c2, q.b);
    const abc = l(ab, bc), bcd = l(bc, cd), m = l(abc, bcd);
    return [{ a: q.a, c1: ab, c2: abc, b: m }, { a: m, c1: bcd, c2: cd, b: q.b }];
  };
  let q = c;
  if (u > 0) q = imparte(q, u)[1];
  if (v < 1) q = imparte(q, (v - u) / (1 - u))[0];
  return q;
}

/** Vârfurile: minime locale ale lui |B′| în (0, 1), cu |B′| ≤ prag × max |B′|. */
export function varfuriCubica(c: CubicaO, prag: number): number[] {
  const Ux = c.c1.x - c.a.x, Uy = c.c1.y - c.a.y;
  const Bx = c.c2.x - c.c1.x, By = c.c2.y - c.c1.y;
  const Cx = c.b.x - c.c2.x, Cy = c.b.y - c.c2.y;
  // B′/3 = U + 2t(B − U) + t²(U − 2B + C), pe componente.
  const cand = [
    ...radaciniPatratice(Ux, 2 * (Bx - Ux), Ux - 2 * Bx + Cx),
    ...radaciniPatratice(Uy, 2 * (By - Uy), Uy - 2 * By + Cy),
  ];
  let maxD = 0;
  for (let k = 0; k <= 64; k++) { const d = derivataCubica(c, k / 64); maxD = Math.max(maxD, Math.hypot(d.x, d.y)); }
  const rez: number[] = [];
  for (const t0 of cand) {
    // Minimul local al lui |B′|² lângă t0 (secțiunea de aur pe o fereastră mică).
    const f = (t: number): number => { const d = derivataCubica(c, t); return -(d.x * d.x + d.y * d.y); };
    const w = 1e-3;
    const r = maximAuriu(f, Math.max(0, t0 - w), Math.min(1, t0 + w), 1e-16);
    const d = derivataCubica(c, r.x);
    if (r.x > 0 && r.x < 1 && Math.hypot(d.x, d.y) <= prag * maxD && !rez.some((u) => Math.abs(u - r.x) < 1e-9)) rez.push(r.x);
  }
  return rez.sort((u, v) => u - v);
}

// ---------------------------------------------------------------------------------------------------------------------
// Verdictul.
// ---------------------------------------------------------------------------------------------------------------------

/**
 * Marginea în care o tăietură cerută (rădăcina r) trebuie să aibă un vârf al lanțului: 1e-9 × mărimea + 1e-12 × cea mai
 * mare coordonată + 1e-9 mm (un vârf aflat la sub 1e-9 mm de următorul cade, §4), plus condiționarea rădăcinii:
 * `PRAGURI.conditionare` × |B′(t)| × dt (eroarea oracolului și a aplicației, fiecare de ordinul marginii).
 */
export function margineTaietura(c: CubicaO, r: Radacina): number {
  let maxCoord = 1;
  for (const p of [c.a, c.c1, c.c2, c.b]) maxCoord = Math.max(maxCoord, Math.abs(p.x), Math.abs(p.y));
  const d = derivataCubica(c, r.t);
  return PRAGURI.taietura * marimeCubica(c) + 1e-12 * maxCoord + PRAGURI.segmentMinim + PRAGURI.conditionare * Math.hypot(d.x, d.y) * r.dt;
}

export type CodProblema =
  | 'forma' | 'nefinit' | 'cubica-ramasa' | 'numar' | 'plafon' | 'start' | 'capat' | 'lungime-zero' | 'degenerata'
  | 'linie' | 'taietura' | 'raza' | 'abatere-curba-lant' | 'abatere-lant-curba' | 'tangenta' | 'contur';

export type Problema = { readonly cod: CodProblema; readonly text: string };

export type Masura = {
  readonly bucati: number;
  readonly arce: number;
  readonly linii: number;
  /** Hausdorff curbă → lanț și lanț → curbă, în mm. */
  readonly curbaLant: number;
  readonly lantCurba: number;
  /** Cel mai mare unghi de îmbinare verificat (rad), fără excepții. */
  readonly unghi: number;
  /** Cea mai mare rază de arc din lanț (mm; 0 fără arce). */
  readonly razaMax: number;
};

export type Judecata = { readonly probleme: readonly Problema[]; readonly masura: Masura | undefined };

const finit = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const punctFinit = (p: unknown): p is PunctO => typeof p === 'object' && p !== null && finit((p as PunctO).x) && finit((p as PunctO).y);
const esteLinie = (q: PiesaO): boolean => !q.arc;

/** Motivul unui refuz bine format (ok: false, motiv text nevid), altfel undefined. */
export function motivRefuz(r: unknown): string | undefined {
  if (typeof r !== 'object' || r === null) return undefined;
  const o = r as { ok?: unknown; motiv?: unknown };
  if (o.ok !== false) return undefined;
  return typeof o.motiv === 'string' && o.motiv.trim() !== '' ? o.motiv : undefined;
}

const unghiIntre = (u: PunctO, v: PunctO): number => Math.atan2(Math.abs(u.x * v.y - u.y * v.x), u.x * v.x + u.y * v.y);

/** Judecă rezultatul `ok` al ușii pentru cubica c la toleranța tol (refuzul e judecat de cel care cheamă). */
export function judecaLantul(c: CubicaO, tol: number, rezultat: unknown): Judecata {
  const probleme: Problema[] = [];
  const pune = (cod: CodProblema, text: string): void => { probleme.push({ cod, text }); };
  if (![c.a, c.c1, c.c2, c.b].every(punctFinit)) {
    pune('nefinit', 'cubica are un punct nefinit, deci rezultatul trebuia să fie un refuz');
    return { probleme, masura: undefined };
  }
  if (typeof rezultat !== 'object' || rezultat === null || (rezultat as { ok?: unknown }).ok !== true) {
    pune('forma', `nu e un rezultat ok: ${JSON.stringify(rezultat)}`);
    return { probleme, masura: undefined };
  }
  const r = rezultat as { varfuri?: unknown; bucati?: unknown };
  if (!Array.isArray(r.varfuri)) { pune('forma', 'varfuri nu e o listă'); return { probleme, masura: undefined }; }
  const varfuri = r.varfuri as unknown[];
  for (let i = 0; i < varfuri.length; i++) {
    const v = varfuri[i] as { p?: unknown; s?: { tip?: unknown; bulge?: unknown } } | null;
    if (typeof v !== 'object' || v === null || !punctFinit(v.p)) { pune('nefinit', `vârful ${i}: punct lipsă sau nefinit`); continue; }
    const s = v.s;
    if (typeof s !== 'object' || s === null) { pune('forma', `vârful ${i}: segment lipsă`); continue; }
    if (s.tip === 'C') pune('cubica-ramasa', `vârful ${i}: o cubică a rămas în lanț`);
    else if (s.tip === 'A') { if (!finit(s.bulge)) pune('nefinit', `vârful ${i}: bulge nefinit (${String(s.bulge)})`); }
    else if (s.tip !== 'L') pune('forma', `vârful ${i}: tip necunoscut ${String(s.tip)}`);
  }
  if (r.bucati !== varfuri.length) pune('numar', `bucati = ${String(r.bucati)}, dar lanțul are ${varfuri.length} vârfuri`);
  if (varfuri.length > PRAGURI.plafon) pune('plafon', `${varfuri.length} bucăți > plafonul ${PRAGURI.plafon}`);
  if (probleme.length > 0) return { probleme, masura: undefined };
  const vs = varfuri as VarfO[];
  const degenerata = esteDegenerata(c);
  if (degenerata) {
    if (vs.length !== 0) pune('degenerata', `cubica degenerată (întinderea ${intindereCubica(c)}) a dat ${vs.length} bucăți`);
    return { probleme, masura: { bucati: vs.length, arce: 0, linii: 0, curbaLant: 0, lantCurba: 0, unghi: 0, razaMax: 0 } };
  }
  if (vs.length === 0) {
    if (c.a.x !== c.b.x || c.a.y !== c.b.y) pune('capat', 'lanțul e gol, deci nu ajunge din a în b');
  } else {
    const p0 = (vs[0] as VarfO).p;
    if (p0.x !== c.a.x || p0.y !== c.a.y) pune('start', `primul vârf (${p0.x}, ${p0.y}) nu e exact a (${c.a.x}, ${c.a.y})`);
  }
  const l = lant(c.a, vs, c.b);
  l.piese.forEach((q, i) => {
    if (2 * q.h < PRAGURI.segmentMinim) pune('lungime-zero', `bucata ${i} are coarda ${2 * q.h} mm (< ${PRAGURI.segmentMinim})`);
    if (q.arc && q.r > PRAGURI.razaMaxima * (1 + 1e-9)) pune('raza', `bucata ${i} e un arc de rază ${q.r} mm (> ${PRAGURI.razaMaxima})`);
  });
  const linii = l.piese.filter(esteLinie).length;
  const arce = l.piese.length - linii;
  const S = marimeCubica(c);
  const peDreapta = orient(c.a.x, c.a.y, c.b.x, c.b.y, c.c1.x, c.c1.y) === 0 && orient(c.a.x, c.a.y, c.b.x, c.b.y, c.c2.x, c.c2.y) === 0
    && orient(c.a.x, c.a.y, c.c1.x, c.c1.y, c.c2.x, c.c2.y) === 0;
  if (peDreapta && arce > 0) pune('linie', `cubica dreaptă (toate punctele pe o dreaptă) a dat ${arce} arce`);
  // Tăieturile (§4), în ordinea contractului: (1) inflexiunile și vârfurile exacte; (2) o bucată plată e O linie; (3) o
  // bucată care nu e plată se taie și la extremele pe axe. O tăietură cerută e un vârf al lanțului (sau a, b) aflat pe
  // punctul curbei, în marginea `margineTaietura`.
  // Vârfurile lanțului și b (indicele k din `capete` e vârful k al lanțului; ultimul e b); lanțul gol: a și b.
  const capete = vs.length > 0 ? [...vs.map((v) => v.p), c.b] : [c.a, c.b];
  const celMaiAproape = (q: PunctO): { d: number; k: number } => {
    let d = Infinity, k = -1;
    capete.forEach((p, i) => { const e = Math.hypot(p.x - q.x, p.y - q.y); if (e < d) { d = e; k = i; } });
    return { d, k };
  };
  const pasul1: Radacina[] = [...inflexiuniCuEroare(c), ...varfuriCubica(c, PRAGURI.varfExact).map((t) => ({ t, dt: 0 }))]
    .sort((u, v) => u.t - v.t);
  const cere = (r: Radacina, fel: string): void => {
    const q = punctCubica(c, r.t);
    const eps = margineTaietura(c, r);
    const m = celMaiAproape(q);
    if (m.d > eps) pune('taietura', `${fel} de la t = ${r.t} (${q.x}, ${q.y}) nu e un vârf al lanțului: cel mai apropiat e la ${m.d} mm (> ${eps})`);
  };
  for (const r of pasul1) cere(r, 'tăietura (inflexiune sau vârf)');
  const granite: Radacina[] = [{ t: 0, dt: 0 }, ...pasul1, { t: 1, dt: 0 }];
  const extreme = extremeAxe(c);
  for (let i = 0; i + 1 < granite.length; i++) {
    const u = granite[i] as Radacina, v = granite[i + 1] as Radacina;
    if (!(v.t > u.t)) continue;
    const sub = subCubica(c, u.t, v.t);
    const d1 = distSegment(sub.c1.x, sub.c1.y, sub.a.x, sub.a.y, sub.b.x, sub.b.y);
    const d2 = distSegment(sub.c2.x, sub.c2.y, sub.a.x, sub.a.y, sub.b.x, sub.b.y);
    const prag = PRAGURI.tinta * tol, dm = Math.max(d1, d2);
    if (dm <= prag * (1 - 1e-9)) {
      // (2) Plată: din vârful de la B(u), o linie până la B(v). Doar dacă ambele tăieturi există în lanț (lipsa uneia e
      // problema „taietura”): linia trebuie să meargă direct dintr-una în cealaltă.
      if (Math.hypot(sub.b.x - sub.a.x, sub.b.y - sub.a.y) < 1e-6) continue;
      const mu = celMaiAproape(sub.a), mv = celMaiAproape(sub.b);
      if (mu.d > margineTaietura(c, u) || mv.d > margineTaietura(c, v) || mu.k >= capete.length - 1) continue;
      const seg = (vs[mu.k] as VarfO).s;
      const eLinie = seg.tip === 'L' || (seg.tip === 'A' && seg.bulge === 0);
      if (!eLinie || mv.k !== mu.k + 1) {
        pune('linie', `bucata plată [${u.t}, ${v.t}] (c1, c2 la cel mult ${dm} ≤ 0,99 × tol) nu e o singură linie: ${mv.k - mu.k} bucăți, prima ${seg.tip}`);
      }
    } else if (dm > prag * (1 + 1e-9)) {
      // (3) Nu e plată: fiecare extrem pe axe din interiorul ei e o tăietură.
      for (const r of extreme) if (r.t > u.t && r.t < v.t) cere(r, 'extremul pe axe');
    }
  }
  // Tangenta (§4).
  const varfuriC = varfuriCubica(c, PRAGURI.varfPractic).map((t) => punctCubica(c, t));
  let unghiMax = 0;
  for (let i = 0; i + 1 < l.piese.length; i++) {
    const q1 = l.piese[i] as PiesaO, q2 = l.piese[i + 1] as PiesaO;
    if (!q1.arc || !q2.arc) continue;
    const u = unghiIntre(tangentaPiesei(q1, 1), tangentaPiesei(q2, 0));
    const lmin = Math.min(lungimePiesa(q1), lungimePiesa(q2));
    const prag = PRAGURI.unghi + (PRAGURI.unghiZgomot * S) / Math.max(lmin, 1e-300);
    const j = q2.a;
    const laVarf = varfuriC.some((p) => Math.hypot(p.x - j.x, p.y - j.y) <= tol);
    // La vârf: continuă, sau întoarsă (colțul de 180° al §4; la un vârf practic, cu B′ mic dar nenul, întoarcerea nu e
    // exact π, deci se cere doar un colț de peste 90°).
    if (laVarf) {
      if (u > prag && u < Math.PI / 2) pune('tangenta', `îmbinarea ${i + 1} (${j.x}, ${j.y}), la vârf: unghiul ${u} rad, nici continuă, nici întoarsă`);
      continue;
    }
    if (u > unghiMax) unghiMax = u;
    if (u > prag) pune('tangenta', `îmbinarea ${i + 1} (${j.x}, ${j.y}): unghiul ${u} rad > ${prag}`);
  }
  // Abaterea (§3).
  const ab = judecaAbaterea(c, l, tol);
  probleme.push(...ab.probleme);
  const razaMax = l.piese.reduce((m, q) => (q.arc ? Math.max(m, q.r) : m), 0);
  return { probleme, masura: { bucati: l.piese.length, arce, linii, curbaLant: ab.curbaLant, lantCurba: ab.lantCurba, unghi: unghiMax, razaMax } };
}

/** Hausdorff în ambele sensuri, cu verdictul ≤ tol (§3). */
export function judecaAbaterea(c: CubicaO, l: LantO, tol: number): { readonly probleme: readonly Problema[]; readonly curbaLant: number; readonly lantCurba: number } {
  const probleme: Problema[] = [];
  const cl = abatereCurbaLant(c, l);
  const lc = abatereLantCurba(c, l, tol);
  if (!(cl.max <= tol)) probleme.push({ cod: 'abatere-curba-lant', text: `curbă → lanț: ${cl.max} mm = ${cl.max / tol} × tol (la t = ${cl.unde})` });
  if (!(lc.max <= tol)) probleme.push({ cod: 'abatere-lant-curba', text: `lanț → curbă: ${lc.max} mm = ${lc.max / tol} × tol (bucata ${lc.piesa}, f = ${lc.unde})` });
  return { probleme, curbaLant: cl.max, lantCurba: lc.max };
}

/** Egalitatea exactă a două vârfuri (puncte, tip, bulge, puncte de control). */
export function varfuriEgale(u: VarfO, v: VarfO): boolean {
  if (!Object.is(u.p.x, v.p.x) || !Object.is(u.p.y, v.p.y) || u.s.tip !== v.s.tip) return false;
  if (u.s.tip === 'A' && v.s.tip === 'A') return Object.is(u.s.bulge, v.s.bulge);
  if (u.s.tip === 'C' && v.s.tip === 'C') {
    return Object.is(u.s.c1.x, v.s.c1.x) && Object.is(u.s.c1.y, v.s.c1.y) && Object.is(u.s.c2.x, v.s.c2.x) && Object.is(u.s.c2.y, v.s.c2.y);
  }
  return true;
}

export type Usa = (a: PunctO, c1: PunctO, c2: PunctO, b: PunctO, tol: number) => unknown;

/**
 * Judecă rezultatul `ok` al lui `conturFaraCubice(intrare, tol)`: `inchis` păstrat, liniile și arcele neschimbate (exact),
 * fiecare cubică înlocuită de lanțul dat de `usa` (aplicația), lanț judecat independent cu `judecaLantul`; `bucati` = suma.
 * Ultimul vârf al unui contur deschis nu are segment (nu se judecă).
 */
export function judecaConturul(intrare: ConturO, tol: number, rezultat: unknown, usa: Usa): Problema[] {
  const probleme: Problema[] = [];
  const pune = (cod: CodProblema, text: string): void => { probleme.push({ cod, text }); };
  const r = rezultat as { ok?: unknown; contur?: { inchis?: unknown; varfuri?: unknown }; bucati?: unknown } | null;
  if (typeof r !== 'object' || r === null || r.ok !== true || typeof r.contur !== 'object' || r.contur === null || !Array.isArray(r.contur.varfuri)) {
    pune('forma', `nu e un rezultat ok cu contur: ${JSON.stringify(rezultat)?.slice(0, 200)}`);
    return probleme;
  }
  if (r.contur.inchis !== intrare.inchis) pune('contur', `inchis = ${String(r.contur.inchis)}, intrarea avea ${String(intrare.inchis)}`);
  const v = intrare.varfuri;
  const n = v.length;
  const asteptat: VarfO[] = [];
  let suma = 0;
  for (let i = 0; i < n; i++) {
    const x = v[i] as VarfO;
    const areSegment = intrare.inchis || i + 1 < n;
    if (x.s.tip !== 'C' || !areSegment) { asteptat.push(x); continue; }
    const urm = (v[(i + 1) % n] as VarfO).p;
    const cub: CubicaO = { a: x.p, c1: x.s.c1, c2: x.s.c2, b: urm };
    const rl = usa(x.p, x.s.c1, x.s.c2, urm, tol);
    const j = judecaLantul(cub, tol, rl);
    for (const p of j.probleme) pune(p.cod, `cubica din vârful ${i}: ${p.text}`);
    if (j.masura === undefined) return probleme;
    const lv = (rl as { varfuri: VarfO[] }).varfuri;
    suma += lv.length;
    asteptat.push(...lv);
  }
  const iesire = r.contur.varfuri as VarfO[];
  if (iesire.length !== asteptat.length) pune('contur', `${iesire.length} vârfuri, așteptate ${asteptat.length}`);
  else {
    for (let i = 0; i < iesire.length; i++) {
      if (!varfuriEgale(iesire[i] as VarfO, asteptat[i] as VarfO)) { pune('contur', `vârful ${i} diferă de cel așteptat`); break; }
    }
  }
  if (r.bucati !== suma) pune('numar', `bucati = ${String(r.bucati)}, suma lanțurilor = ${suma}`);
  return probleme;
}
