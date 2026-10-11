/**
 * ORACOLUL căii (felia 2.7b, ADR 0034), cu ZERO importuri din `src/`: CAM-ul pe căi cu cubice, de la cap la coadă, și
 * clicul pe ele. Geometria exactă e a oracolelor (`biarce.ts`: distanța exactă la linie, arc și cubică; `document.ts`:
 * elementele în lume; `gcode.ts`: cititorul G-code, cu regula de arc a GRBL), nu a aplicației.
 *
 * Ce măsoară:
 * - **conturul exact în lume** (`conturExact`): calea elementului după matricea lui (liniile și cubicele trec exact prin
 *   orice matrice afină; arcul, doar printr-o similitudine, cu `bulge` de semn schimbat sub oglindire);
 * - **distanța** de la un punct la conturul exact: minimul pe segmente, cu cutii pentru tăiere; la cubică, ramificarea și
 *   mărginirea din `biarce.ts` (precizia ei: 1e-12 × mărimea + 1e-14 × cea mai mare coordonată);
 * - **includerea** (`evenodd`), pe conturul exact: raza spre +x; linia cu regula semideschisă (y > py); arcul tăiat în
 *   bucăți monotone pe y (în punctele lui de sus și de jos), cubica tăiată la rădăcinile EXACTE ale lui B′x și B′y
 *   (`extremeAxe`), apoi pe fiecare bucată monotonă traversarea prin bisecție, la precizia aritmeticii. Capetele bucăților
 *   sunt aceleași numere pe ambele părți ale unei tăieturi, deci paritatea e consecventă; pentru un punct care nu stă pe
 *   contur, orice regulă consecventă dă includerea adevărată;
 * - **traseul**, din IR (programul aplicației, în coordonatele documentului, cu precizia lui întreagă) și din textul
 *   G-code (3 zecimale; arcul ca la GRBL: centrul din startul rotunjit + I/J, raza |I, J|, unghiul din `regulaArcGrbl`):
 *   mișcările de tăiere din plan (G1 / G2 / G3 cu z constant, sub fața de sus), cu eticheta elementului lor;
 * - **abaterea** fiecărei mișcări: |d(p, conturul exact) − R| pe eșantioane (cel puțin 6, la cel mult 0,25 mm, cel mult
 *   48 pe mișcare), cu maximul rafinat prin secțiunea de aur; latura (exterior: p afară; interior: p înăuntru), pe
 *   mijlocul fiecărei mișcări și pe punctul ei cel mai abătut.
 *
 * Bugetul (ADR 0034 §6), justificat:
 * - traseul aplicației e offsetul la R al lanțului de biarce B; pentru orice punct p, |d(p, exact) − d(p, B)| ≤ d_H(exact, B)
 *   (distanța la o mulțime e 1-lipschitziană în mulțime), iar d_H ≤ `tol` (ADR 0033 §3; ținta e 0,99 × tol);
 * - offsetul pe linii și arce e exact până la rotunjire: `BUGET.offset` = 1e-6 mm (zgomotul declarat al oracolului);
 * - rotunjirea postului: 0,002 mm (ADR 0026 §6: coordonatele la 3 zecimale, centrul arcului din startul rotunjit, I / J
 *   rotunjite);
 * - deci pe IR: |d − R| ≤ tol + 1e-6; pe G-code: |d − R| ≤ tol + 0,002 + 1e-6.
 * Razele: arcele IR ≤ 9 900 + 50 mm (biarcele + raza celei mai mari freze, ADR 0034 §6); arcele G2 / G3 ≤ 10 000 mm
 * (garda GRBL), iar postul nu înlocuiește niciun arc prin segmente (numărul mișcărilor G1 din plan nu trece de liniile IR
 * plus arcele IR pe care contractul GRBL le scrie ca o singură coardă: coarda sub 10 rezoluții sau unghiul sub 1e-4 rad).
 */
import { distantaLaCubica, distantaLaPiesa, extremeAxe, piesa, punctCubica, type ConturO, type CubicaO, type PiesaO, type PunctO, type SegmentO, type VarfO } from './biarce.ts';
import { compuneO, rotatieO, translatieO, type MatriceO } from './document.ts';
import { citeste, regulaArcGrbl } from './gcode.ts';

export const BUGET = {
  /** TOLERANTA_PROIECT (ADR 0033 §1). */
  toleranta: 0.001,
  /** Zgomotul offsetului exact pe linii și arce (declarat). */
  offset: 1e-6,
  /** Rotunjirea postului pe text (ADR 0026 §6). */
  post: 0.002,
  /** ADR 0033 §1 / ADR 0034 §6. */
  razaBiarc: 9900,
  razaSculaMaxima: 50,
  gardaPost: 10000,
  /** Contractul GRBL (s8): un arc cu coarda sub 10 rezoluții sau cu unghiul sub 1e-4 rad se scrie ca o coardă. */
  coardaMinimaPost: 0.01,
  unghiMinimPost: 1e-4,
} as const;

export const BUGET_IR = BUGET.toleranta + BUGET.offset;
export const BUGET_GCODE = BUGET.toleranta + BUGET.post + BUGET.offset;

// ---------------------------------------------------------------------------------------------------------------------
// Matricile.

export const ID: MatriceO = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

/** Similitudinea: scara s, rotirea în grade, oglindirea pe x (înaintea rotirii), apoi translația. */
export function similitudine(s: number, grade: number, oglinda: boolean, e = 0, f = 0): MatriceO {
  const o: MatriceO = { a: oglinda ? -s : s, b: 0, c: 0, d: s, e: 0, f: 0 };
  return compuneO(translatieO(e, f), compuneO(rotatieO(grade), o));
}

const aplica = (m: MatriceO, p: PunctO): PunctO => ({ x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f });

function esteSimilitudine(m: MatriceO): boolean {
  const s = Math.max(Math.hypot(m.a, m.b), Math.hypot(m.c, m.d), 1);
  const t = 1e-12 * s;
  return ((Math.abs(m.a - m.d) <= t && Math.abs(m.b + m.c) <= t) || (Math.abs(m.a + m.d) <= t && Math.abs(m.b - m.c) <= t)) && m.a * m.d - m.b * m.c !== 0;
}

// ---------------------------------------------------------------------------------------------------------------------
// Conturul exact în lume.

export type FormaCaleO = { readonly tip: 'cale'; readonly inchis: true; readonly varfuri: readonly VarfO[] };

type Cutie = { readonly x0: number; readonly x1: number; readonly y0: number; readonly y1: number };
export type SegmentExact = ({ readonly fel: 'piesa'; readonly q: PiesaO } | { readonly fel: 'cubica'; readonly c: CubicaO; readonly t: readonly number[] }) & Cutie;

export type ConturExact = {
  readonly segmente: readonly SegmentExact[];
  /** Același contur, în forma aplicației (pentru clic). */
  readonly contur: ConturO;
  readonly cutie: Cutie;
};

/** Calea elementului sub matricea lui, exactă (arcele cer o similitudine). */
export function conturExact(forma: FormaCaleO, m: MatriceO): ConturExact {
  const det = m.a * m.d - m.b * m.c;
  const semn = det < 0 ? -1 : 1;
  const are = forma.varfuri.some((v) => v.s.tip === 'A');
  if (are && !esteSimilitudine(m)) throw new Error('o cale cu arce sub o matrice care nu e similitudine');
  const varfuri: VarfO[] = forma.varfuri.map((v) => {
    const p = aplica(m, v.p);
    const s: SegmentO = v.s.tip === 'L' ? { tip: 'L' } : v.s.tip === 'A' ? { tip: 'A', bulge: semn * v.s.bulge } : { tip: 'C', c1: aplica(m, v.s.c1), c2: aplica(m, v.s.c2) };
    return { p, s };
  });
  const n = varfuri.length;
  const segmente: SegmentExact[] = [];
  for (let i = 0; i < n; i++) {
    const v = varfuri[i] as VarfO, urm = (varfuri[(i + 1) % n] as VarfO).p;
    if (v.s.tip === 'C') {
      const c: CubicaO = { a: v.p, c1: v.s.c1, c2: v.s.c2, b: urm };
      const xs = [c.a.x, c.c1.x, c.c2.x, c.b.x], ys = [c.a.y, c.c1.y, c.c2.y, c.b.y];
      const t = [0, ...extremeAxe(c).map((r) => r.t), 1];
      segmente.push({ fel: 'cubica', c, t, x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) });
    } else {
      const q = piesa(v.p, urm, v.s);
      segmente.push({ fel: 'piesa', q, x0: q.x0, x1: q.x1, y0: q.y0, y1: q.y1 });
    }
  }
  const cutie = segmente.reduce((c, s) => ({ x0: Math.min(c.x0, s.x0), x1: Math.max(c.x1, s.x1), y0: Math.min(c.y0, s.y0), y1: Math.max(c.y1, s.y1) }),
    { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity });
  return { segmente, contur: { inchis: true, varfuri }, cutie };
}

const dCutie = (x: number, y: number, c: Cutie): number =>
  Math.hypot(x < c.x0 ? c.x0 - x : x > c.x1 ? x - c.x1 : 0, y < c.y0 ? c.y0 - y : y > c.y1 ? y - c.y1 : 0);

/** Distanța exactă (în precizia declarată) de la (x, y) la conturul exact. */
export function distanta(ce: ConturExact, x: number, y: number): number {
  const ord = ce.segmente.map((s) => ({ s, lb: dCutie(x, y, s) })).sort((u, v) => u.lb - v.lb);
  let best = Infinity;
  for (const { s, lb } of ord) {
    if (lb >= best) break;
    const d = s.fel === 'piesa' ? distantaLaPiesa(s.q, x, y) : distantaLaCubica(s.c, x, y).d;
    if (d < best) best = d;
  }
  return best;
}

/** Traversările razei spre +x din (px, py) cu un segment y-monoton dat prin capete și o funcție x(y) pe el. */
function traverseaza(ya: number, yb: number, py: number, xLa: () => number, px: number): number {
  if ((ya > py) === (yb > py)) return 0;
  return xLa() > px ? 1 : 0;
}

/** Includerea `evenodd` în conturul exact (un punct de pe contur n-are răspuns garantat). */
export function inContur(ce: ConturExact, px: number, py: number): boolean {
  let n = 0;
  for (const s of ce.segmente) {
    if (py < s.y0 || py > s.y1 || px > s.x1) {
      // Fără traversare posibilă la dreapta (o bucată la stânga de px nu numără).
      continue;
    }
    if (s.fel === 'piesa') {
      const q = s.q;
      if (!q.arc) {
        n += traverseaza(q.a.y, q.b.y, py, () => q.a.x + ((py - q.a.y) * (q.b.x - q.a.x)) / (q.b.y - q.a.y), px);
        continue;
      }
      // Arcul: centrul, unghiul de start, baleiajul; tăiat în punctele de sus și de jos (π/2 + kπ).
      const cx = q.mx - q.k * q.nx, cy = q.my - q.k * q.ny;
      const u0 = Math.atan2(q.a.y - cy, q.a.x - cx), du = q.baleiaj;
      const taieturi = [0];
      const uMin = Math.min(u0, u0 + du), uMax = Math.max(u0, u0 + du);
      for (let j = Math.floor((uMin - Math.PI / 2) / Math.PI); j <= Math.ceil((uMax - Math.PI / 2) / Math.PI); j++) {
        const f = (Math.PI / 2 + j * Math.PI - u0) / du;
        if (f > 0 && f < 1) taieturi.push(f);
      }
      taieturi.push(1);
      taieturi.sort((u, v) => u - v);
      const pe = (f: number): PunctO => (f === 0 ? q.a : f === 1 ? q.b : { x: cx + q.r * Math.cos(u0 + du * f), y: cy + q.r * Math.sin(u0 + du * f) });
      for (let i = 0; i + 1 < taieturi.length; i++) {
        const fa = taieturi[i] as number, fb = taieturi[i + 1] as number;
        const A = pe(fa), B = pe(fb);
        n += traverseaza(A.y, B.y, py, () => {
          const um = u0 + du * ((fa + fb) / 2);
          const dx = Math.sqrt(Math.max(0, q.r * q.r - (py - cy) * (py - cy)));
          return Math.cos(um) >= 0 ? cx + dx : cx - dx;
        }, px);
      }
      continue;
    }
    // Cubica: bucățile monotone pe x și y (rădăcinile exacte), apoi bisecția pe y.
    const c = s.c;
    for (let i = 0; i + 1 < s.t.length; i++) {
      const ta = s.t[i] as number, tb = s.t[i + 1] as number;
      if (!(tb > ta)) continue;
      const A = punctCubica(c, ta), B = punctCubica(c, tb);
      n += traverseaza(A.y, B.y, py, () => {
        let lo = ta, hi = tb;
        const crescator = B.y > A.y;
        for (let it = 0; it < 80 && hi > lo; it++) {
          const mid = (lo + hi) / 2;
          if (mid <= lo || mid >= hi) break;
          const y = punctCubica(c, mid).y;
          if ((y > py) === crescator) hi = mid; else lo = mid;
        }
        return punctCubica(c, (lo + hi) / 2).x;
      }, px);
    }
  }
  return n % 2 === 1;
}

// ---------------------------------------------------------------------------------------------------------------------
// Traseul: mișcările de tăiere din plan, din IR și din G-code.

export type MutarePlan = {
  readonly eticheta: string;
  readonly z: number;
  readonly a: PunctO;
  readonly b: PunctO;
  /** Arcul: centrul, raza, unghiul de start și baleiajul cu semn (trigonometric pozitiv). */
  readonly arc: { readonly c: PunctO; readonly r: number; readonly u0: number; readonly du: number } | null;
  /** De unde vine (indicele mișcării IR sau linia G-code), pentru mesaje. */
  readonly sursa: string;
};

export type Traseu = {
  readonly plan: readonly MutarePlan[];
  /** Toate razele de arc din plan, cu sursa. */
  readonly raze: ReadonlyArray<{ readonly r: number; readonly sursa: string }>;
  /** Mișcările liniare din plan și arcele pe care postul le poate scrie ca o coardă (contractul GRBL). */
  readonly linii: number;
  readonly arceScurte: number;
  readonly probleme: readonly string[];
};

const baleiaj = (u0: number, u1: number, trig: boolean): number => {
  let d = u1 - u0;
  if (trig) { while (d <= 1e-12) d += 2 * Math.PI; } else { while (d >= -1e-12) d -= 2 * Math.PI; }
  return d;
};

const ESTE_SUB = -1e-9;

/** Mișcările IR (programul aplicației, în coordonatele documentului; z față de fața de sus). */
export function traseuDinIR(miscari: readonly unknown[]): Traseu {
  const plan: MutarePlan[] = [];
  const raze: { r: number; sursa: string }[] = [];
  const probleme: string[] = [];
  let x: number | undefined, y: number | undefined, z: number | undefined;
  let eticheta = '';
  let linii = 0, arceScurte = 0;
  miscari.forEach((mm, k) => {
    const m = mm as { tip: string; la?: { X?: number; Y?: number; Z?: number }; centru?: PunctO; sens?: string; text?: string };
    if (m.tip === 'eticheta') { eticheta = String(m.text); return; }
    if (m.tip !== 'rapida' && m.tip !== 'taiere' && m.tip !== 'arc') return;
    const nx = m.la?.X ?? x, ny = m.la?.Y ?? y, nz = m.la?.Z ?? z;
    if ((m.tip === 'taiere' || m.tip === 'arc') && x !== undefined && y !== undefined && z !== undefined && nx !== undefined && ny !== undefined && nz !== undefined
      && nz === z && z < ESTE_SUB) {
      const a = { x, y }, b = { x: nx, y: ny };
      if (m.tip === 'taiere') {
        if (a.x !== b.x || a.y !== b.y) { plan.push({ eticheta, z, a, b, arc: null, sursa: `IR ${k}` }); linii++; }
      } else {
        const c = m.centru as PunctO;
        const r = Math.hypot(a.x - c.x, a.y - c.y);
        const re = Math.hypot(b.x - c.x, b.y - c.y);
        if (Math.abs(re - r) > 1e-6 * Math.max(1, r)) probleme.push(`IR ${k}: capătul arcului e la ${re} de centru, startul la ${r}`);
        const u0 = Math.atan2(a.y - c.y, a.x - c.x);
        const du = baleiaj(u0, Math.atan2(b.y - c.y, b.x - c.x), m.sens === 'trigonometric');
        plan.push({ eticheta, z, a, b, arc: { c, r, u0, du }, sursa: `IR ${k}` });
        raze.push({ r, sursa: `IR ${k}` });
        if (Math.hypot(b.x - a.x, b.y - a.y) < BUGET.coardaMinimaPost || Math.abs(du) < BUGET.unghiMinimPost) arceScurte++;
      }
    }
    x = nx; y = ny; z = nz;
  });
  return { plan, raze, linii, arceScurte, probleme };
}

/** Mișcările din textul G-code (origine stânga-jos, Z0 sus: coordonatele mașinii sunt ale documentului). */
export function traseuDinGcode(text: string): Traseu {
  const cit = citeste(text);
  const plan: MutarePlan[] = [];
  const raze: { r: number; sursa: string }[] = [];
  const probleme = cit.probleme.map((p) => `linia ${p.linia}: ${p.mesaj}`);
  const etichete = cit.comentarii
    .map((c) => ({ linia: c.linia, m: /^\((.+): [^,]+, [^,]+, [0-9.]+ mm\)$/.exec(c.text) }))
    .filter((c) => c.m !== null)
    .map((c) => ({ linia: c.linia, text: `${(c.m as RegExpExecArray)[1]}` }));
  const etichetaLa = (linia: number): string => {
    let e = '';
    for (const x of etichete) if (x.linia < linia) e = x.text;
    return e;
  };
  let linii = 0;
  for (const ev of cit.evenimente) {
    if (ev.tip !== 'mutare') continue;
    const m = ev.m;
    if (m.cod === 0 || !m.startCunoscut) continue;
    const [ax, ay, az] = m.a, [bx, by, bz] = m.b;
    if (az !== bz || !(az < ESTE_SUB)) continue;
    const a = { x: ax, y: ay }, b = { x: bx, y: by };
    const eticheta = etichetaLa(m.linia);
    if (m.cod === 1) {
      if (ax !== bx || ay !== by) { plan.push({ eticheta, z: az, a, b, arc: null, sursa: `linia ${m.linia}` }); linii++; }
      continue;
    }
    const g = regulaArcGrbl(m);
    if (g.eroare33) probleme.push(`linia ${m.linia}: GRBL ar da error:33`);
    const c = { x: ax + (m.i ?? 0), y: ay + (m.j ?? 0) };
    plan.push({ eticheta, z: az, a, b, arc: { c, r: g.raza, u0: Math.atan2(ay - c.y, ax - c.x), du: g.unghi }, sursa: `linia ${m.linia}` });
    raze.push({ r: g.raza, sursa: `linia ${m.linia}` });
  }
  return { plan, raze, linii, arceScurte: 0, probleme };
}

/** Punctul și normala (unitară; la linie, stânga sensului de mers; la arc, dinspre centru) la fracțiunea f a mișcării. */
export function punctPeMutare(m: MutarePlan, f: number): { p: PunctO; n: PunctO } {
  if (m.arc === null) {
    const dx = m.b.x - m.a.x, dy = m.b.y - m.a.y, L = Math.hypot(dx, dy);
    return { p: { x: m.a.x + dx * f, y: m.a.y + dy * f }, n: { x: -dy / L, y: dx / L } };
  }
  const u = m.arc.u0 + m.arc.du * f;
  const cu = Math.cos(u), su = Math.sin(u);
  return { p: { x: m.arc.c.x + m.arc.r * cu, y: m.arc.c.y + m.arc.r * su }, n: { x: cu, y: su } };
}

const lungimeMutare = (m: MutarePlan): number => (m.arc === null ? Math.hypot(m.b.x - m.a.x, m.b.y - m.a.y) : m.arc.r * Math.abs(m.arc.du));

// ---------------------------------------------------------------------------------------------------------------------
// Măsura.

export type MasuraTraseu = {
  /** max |d − R| pe toate mișcările, și sensul (+: prea departe de contur, −: prea aproape). */
  readonly max: number;
  readonly semn: number;
  readonly unde: string;
  readonly mutari: number;
  readonly puncte: number;
  /** Punctele de pe latura greșită (exterior: înăuntru; interior: afară). */
  readonly laturaGresita: readonly string[];
};

/**
 * Abaterea traseului față de conturul exact: |d(p) − R| pe fiecare mișcare (eșantioane + secțiunea de aur pe cel mai
 * abătut). `impins` ≠ 0 mută fiecare punct al traseului cu `impins` pe normala traseului, spre exterior (dinspre conturul
 * exact): este offsetul traseului însuși (controlul negativ al §6).
 */
export function masoara(t: readonly MutarePlan[], ce: ConturExact, R: number, latura: 'exterior' | 'interior', impins = 0): MasuraTraseu {
  let max = 0, semn = 0, unde = '', puncte = 0;
  const laturaGresita: string[] = [];
  const vazute = new Set<string>();
  let mutari = 0;
  for (const m of t) {
    const cheie = `${m.a.x},${m.a.y},${m.b.x},${m.b.y},${m.arc ? `${m.arc.c.x},${m.arc.c.y},${m.arc.du}` : 'L'}`;
    if (vazute.has(cheie)) continue;
    vazute.add(cheie);
    mutari++;
    // Spre exterior: semnul normalei care crește distanța la contur (pe mijloc).
    let sigma = 0;
    if (impins !== 0) {
      const { p, n } = punctPeMutare(m, 0.5);
      const h = 1e-3;
      sigma = distanta(ce, p.x + h * n.x, p.y + h * n.y) >= distanta(ce, p.x - h * n.x, p.y - h * n.y) ? 1 : -1;
    }
    const abatere = (f: number): { v: number; s: number; p: PunctO } => {
      const { p, n } = punctPeMutare(m, f);
      const q = impins === 0 ? p : { x: p.x + sigma * impins * n.x, y: p.y + sigma * impins * n.y };
      const d = distanta(ce, q.x, q.y) - R;
      return { v: Math.abs(d), s: Math.sign(d), p: q };
    };
    const N = Math.min(48, Math.max(6, Math.ceil(lungimeMutare(m) / 0.25)));
    const v: number[] = [];
    let kMax = 0;
    for (let k = 0; k <= N; k++) {
      const a = abatere(k / N);
      v.push(a.v);
      puncte++;
      if (a.v > (v[kMax] as number)) kMax = k;
    }
    // Secțiunea de aur pe cel mai abătut eșantion.
    let lo = Math.max(0, kMax - 1) / N, hi = Math.min(N, kMax + 1) / N;
    const g = (Math.sqrt(5) - 1) / 2;
    let x1 = hi - g * (hi - lo), x2 = lo + g * (hi - lo);
    let f1 = abatere(x1).v, f2 = abatere(x2).v;
    for (let it = 0; it < 30; it++) {
      if (f1 < f2) { lo = x1; x1 = x2; f1 = f2; x2 = lo + g * (hi - lo); f2 = abatere(x2).v; } else { hi = x2; x2 = x1; f2 = f1; x1 = hi - g * (hi - lo); f1 = abatere(x1).v; }
    }
    const fBest = [kMax / N, x1, x2].reduce((b, f) => (abatere(f).v > abatere(b).v ? f : b));
    const best = abatere(fBest);
    if (best.v > max) { max = best.v; semn = best.s; unde = `${m.eticheta} ${m.sursa}, f = ${fBest.toFixed(4)}, (${best.p.x.toFixed(4)}, ${best.p.y.toFixed(4)})`; }
    // Latura, pe mijloc și pe punctul cel mai abătut.
    for (const f of [0.5, fBest]) {
      const p = abatere(f).p;
      const inauntru = inContur(ce, p.x, p.y);
      if (inauntru !== (latura === 'interior')) laturaGresita.push(`${m.eticheta} ${m.sursa}, f = ${f.toFixed(3)}: (${p.x}, ${p.y}) ${inauntru ? 'înăuntru' : 'afară'}`);
    }
  }
  return { max, semn, unde, mutari, puncte, laturaGresita };
}

/** Verdictul pe un traseu: abaterea în buget, latura, mișcările există. */
export function judecaTraseul(t: Traseu, ce: ConturExact, R: number, latura: 'exterior' | 'interior', buget: number): { probleme: string[]; masura: MasuraTraseu } {
  const probleme = [...t.probleme];
  if (t.plan.length === 0) probleme.push('nicio mișcare de tăiere în plan');
  const masura = masoara(t.plan, ce, R, latura);
  if (!(masura.max <= buget)) probleme.push(`abaterea: |d − R| = ${masura.max} mm (${masura.semn > 0 ? 'prea departe' : 'prea aproape'}) > ${buget}, la ${masura.unde}`);
  for (const x of masura.laturaGresita.slice(0, 3)) probleme.push(`latura greșită: ${x}`);
  return { probleme, masura };
}

/** Razele și aproximarea arcelor: IR ≤ 9 950 mm; G2 / G3 ≤ 10 000 mm; postul n-a înlocuit niciun arc prin segmente. */
export function judecaArcele(ir: Traseu, gc: Traseu): string[] {
  const p: string[] = [];
  for (const r of ir.raze) if (r.r > BUGET.razaBiarc + BUGET.razaSculaMaxima) p.push(`${r.sursa}: arcul are raza ${r.r} > ${BUGET.razaBiarc + BUGET.razaSculaMaxima}`);
  for (const r of gc.raze) if (r.r > BUGET.gardaPost) p.push(`${r.sursa}: G2 / G3 cu raza ${r.r} > garda ${BUGET.gardaPost}`);
  if (gc.linii > ir.linii + ir.arceScurte) p.push(`G-code are ${gc.linii} mișcări G1 în plan, IR doar ${ir.linii} linii + ${ir.arceScurte} arce scurte: un arc a fost scris ca segmente`);
  return p;
}
