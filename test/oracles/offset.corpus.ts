/**
 * Corpusul oracolului de offset (felia 2.1, contractul v2), determinist: generatorul pseudoaleator e propriu (mulberry32, sămânța
 * 21021), fără `Math.random`. Ca oracolul, nu importă nimic din `src/`. Fiecare intrare are un nume scurt, în română.
 *
 * - VALIDE: contururi închise care trebuie decalate, fiecare cu distanțele ei (în afară și înăuntru). Cercuri (2 vârfuri,
 *   două arce de 180°, valide după precizarea contractului), dreptunghiuri cu și fără rază la colț, rotite cu 0 / 30 / 90°,
 *   poligoane aleatoare din linii și arce (5–24 de vârfuri) VERIFICATE cu `autointersectat` (definiția v2) și cu o distanță
 *   minimă între segmentele neînvecinate, la scările 1, 10, 100 și 2 440 mm, în ambele sensuri; distanțe de la 0,005 mm
 *   până la mari; și formele de pe hârtie din s1 / s1-V (haltera, inelul cu fantă, poligonul dens care declanșa
 *   semicercurile lui cavalier, dreptunghiul cu fanta de 0,02 mm).
 * - MURDARE: intrări murdare, dar valide, fiecare cu geamăna ei curată din VALIDE (`geaman`): vârfuri repetate la mai
 *   puțin de 1e-7 mm, închiderea dublată, arce cu |bulge| = 1e-8, un vârf în plus la mijlocul unei laturi drepte.
 * - NU_INCAPE: distanțe spre interior mai mari decât raza înscrisă (refuz, cu motiv).
 * - REFUZATE: intrări sau distanțe refuzate cu motiv, literal din contract; `fel` = `contur` dacă intrarea însăși e de
 *   nedecalat (refuzată și la d = 0), `distanta` dacă doar distanța e greșită.
 *
 * Categoriile contractului v2: `trebuie` (cercurile, dreptunghiurile rotunjite sau nu, rotite, haltera și inelul cu
 * fantă, la scările 1–2 440 mm, cu gemenele lor murdare) trebuie să reușească; `corect-sau-refuz` (poligoanele oarecare
 * din linii și arce, poliliniile dense, celelalte forme) pot fi refuzate cu motiv, dar niciodată decalate greșit.
 */
import {
  autointersectat, bucati, cutie, distantaIntreBucati, distantaLaFrontiera, paritate, type Bucata, type ConturO, type SegmentO, type VarfO,
} from './offset.ts';

export type Categorie = 'trebuie' | 'corect-sau-refuz';

export type CazValid = {
  readonly nume: string;
  readonly contur: ConturO;
  readonly distante: readonly number[];
  readonly categorie: Categorie;
  /** Familia, pentru numărătoarea refuzurilor. */
  readonly familie: string;
  /** Numele gemenei curate, la cazurile murdare. */
  readonly geaman?: string;
};

export type CazRefuzat = { readonly nume: string; readonly contur: ConturO; readonly distanta: number; readonly fel: 'contur' | 'distanta' };

// ---------------------------------------------------------------------------------------------------------------------
// Constructorii.
// ---------------------------------------------------------------------------------------------------------------------

export const L: SegmentO = { tip: 'L' };
export const A = (bulge: number): SegmentO => ({ tip: 'A', bulge });
const v = (x: number, y: number, s: SegmentO = L): VarfO => ({ p: { x, y }, s });
const inchis = (varfuri: VarfO[]): ConturO => ({ inchis: true, varfuri });

/** Cercul: două arce de 180°, din punctul cel mai din dreapta; `sens` −1 = orar. */
export function cerc(cx: number, cy: number, r: number, sens: 1 | -1 = 1): ConturO {
  return inchis([v(cx + r, cy, A(sens)), v(cx - r, cy, A(sens))]);
}

/** Dreptunghiul cu colțul stânga-jos în (x, y), trigonometric; cu `raza` > 0, colțurile sunt arce de 90°. */
export function dreptunghi(x: number, y: number, W: number, H: number, raza = 0): ConturO {
  if (raza === 0) return inchis([v(x, y), v(x + W, y), v(x + W, y + H), v(x, y + H)]);
  const b = A(Math.tan(Math.PI / 8));
  const r = raza;
  return inchis([
    v(x + r, y), v(x + W - r, y, b), v(x + W, y + r), v(x + W, y + H - r, b),
    v(x + W - r, y + H), v(x + r, y + H, b), v(x, y + H - r), v(x, y + r, b),
  ]);
}

/** Rotirea în jurul lui (cx, cy), în grade; la multipli de 90° cu cos / sin exacte. Bulge-ul nu se schimbă. */
export function roteste(c: ConturO, grade: number, cx: number, cy: number): ConturO {
  const exact: Record<number, readonly [number, number]> = { 0: [1, 0], 90: [0, 1], 180: [-1, 0], 270: [0, -1] };
  const g = ((grade % 360) + 360) % 360;
  const [co, si] = exact[g] ?? [Math.cos((grade * Math.PI) / 180), Math.sin((grade * Math.PI) / 180)];
  return {
    inchis: c.inchis,
    varfuri: c.varfuri.map((x) => {
      const dx = x.p.x - cx, dy = x.p.y - cy;
      return { p: { x: cx + co * dx - si * dy, y: cy + si * dx + co * dy }, s: x.s };
    }),
  };
}

/** Același contur, parcurs invers: vârfurile în ordine inversă, segmentul fiecăruia vine de la vecinul lui, bulge negat. */
export function inverseaza(c: ConturO): ConturO {
  const n = c.varfuri.length;
  const varfuri: VarfO[] = [];
  for (let k = 0; k < n; k++) {
    const p = (c.varfuri[n - 1 - k] as VarfO).p;
    const s = (c.varfuri[(2 * n - 2 - k) % n] as VarfO).s;
    varfuri.push({ p, s: s.tip === 'A' ? A(-s.bulge) : s.tip === 'C' ? { tip: 'C', c1: s.c2, c2: s.c1 } : s });
  }
  return { inchis: c.inchis, varfuri };
}

/** Haltera din s1-V §4.2: cercuri R20 la ±30 pe x, gât de 6 mm. Arcele mari au bulge = cot(α/2), α = asin(3/20). */
export function haltera(): ConturO {
  const s = Math.sqrt(391);
  const b = 1 / Math.tan(Math.asin(3 / 20) / 2);
  return inchis([v(-30 + s, -3), v(30 - s, -3, A(b)), v(30 - s, 3), v(-30 + s, 3, A(b))]);
}

/** Inelul cu fantă: R10 / r6, fanta de 2h pe axa +x; la exterior cu d > h fanta se închide și apare o gaură. */
export function inelCuFanta(R = 10, r = 6, h = 0.1): ConturO {
  const bo = 1 / Math.tan(Math.asin(h / R) / 2);
  const bi = -1 / Math.tan(Math.asin(h / r) / 2);
  const xo = Math.sqrt(R * R - h * h), xi = Math.sqrt(r * r - h * h);
  return inchis([v(xo, h, A(bo)), v(xo, -h), v(xi, -h, A(bi)), v(xi, h)]);
}

/** Poligonul regulat cu n laturi, înscris în cercul de rază R (cercul teselat). */
export function poligonRegulat(cx: number, cy: number, R: number, n: number): ConturO {
  return inchis(Array.from({ length: n }, (_, i) => v(cx + R * Math.cos((2 * Math.PI * i) / n), cy + R * Math.sin((2 * Math.PI * i) / n))));
}

/**
 * Cercul scris ca UN arc de 360° − `lipsa` (în grade), trigonometric, din (cx + r, cy), plus segmentul mic de închidere.
 * Coarda arcului e mică, dar arcul nu e scurt: curățarea îl împarte întâi în două jumătăți, deci nu-l poate pierde.
 */
export function cercDintrUnArc(cx: number, cy: number, r: number, lipsa = 1e-4): ConturO {
  const baleiaj = 2 * Math.PI - (lipsa * Math.PI) / 180;
  return inchis([v(cx + r, cy, A(Math.tan(baleiaj / 4))), v(cx + r * Math.cos(baleiaj), cy + r * Math.sin(baleiaj))]);
}

/** Scalarea în jurul originii. */
export function scaleaza(c: ConturO, f: number): ConturO {
  return { inchis: c.inchis, varfuri: c.varfuri.map((x) => ({ p: { x: x.p.x * f, y: x.p.y * f }, s: x.s })) };
}

/** Semidiscul: un arc de 180° și diametrul; 2 vârfuri, aria πr²/2. */
export function semidisc(r: number): ConturO {
  return inchis([v(r, 0, A(1)), v(-r, 0)]);
}

/** Dreptunghiul 20 × 10 cu o fantă de lățime `l`, adâncă de 8 mm, coborâtă din latura de sus. */
export function dreptunghiCuFanta(l: number): ConturO {
  return inchis([v(0, 0), v(20, 0), v(20, 10), v(10 + l / 2, 10), v(10 + l / 2, 2), v(10 - l / 2, 2), v(10 - l / 2, 10), v(0, 10)]);
}

// ---------------------------------------------------------------------------------------------------------------------
// Generatorul și poligoanele aleatoare.
// ---------------------------------------------------------------------------------------------------------------------

/** mulberry32: determinist, pe 32 de biți. */
export function generator(samanta: number): () => number {
  let a = samanta >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Cea mai mică distanță dintre două segmente neînvecinate (Infinity la n ≤ 3). */
export function jocMinim(c: ConturO): number {
  const qs = bucati(c);
  const n = qs.length;
  let m = Infinity;
  for (let i = 0; i < n; i++) {
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      m = Math.min(m, distantaIntreBucati(qs[i] as Bucata, qs[j] as Bucata));
    }
  }
  return m;
}

/**
 * Raza înscrisă: marginea de jos e maximul distanței la margine pe o grilă de 100 × 100 a punctelor interioare; cea de
 * sus adaugă jumătatea diagonalei celulei (distanța e 1-lipschitziană, iar punctul cel mai adânc are un nod al grilei
 * la cel mult atât, tot înăuntru).
 */
export function razaInscrisa(c: ConturO): { readonly jos: number; readonly sus: number } {
  const qs = bucati(c);
  const b = cutie([c]);
  const G = 100;
  const hx = (b.x1 - b.x0) / G, hy = (b.y1 - b.y0) / G;
  let jos = 0;
  for (let i = 0; i < G; i++) {
    for (let j = 0; j < G; j++) {
      const x = b.x0 + (i + 0.5) * hx, y = b.y0 + (j + 0.5) * hy;
      if (paritate(qs, x, y)) jos = Math.max(jos, distantaLaFrontiera(qs, x, y));
    }
  }
  return { jos, sus: jos + Math.hypot(hx, hy) / 2 };
}

/**
 * Un poligon stelat din linii și arce, valid: fără autointersecții (nici vecinele care s-ar tăia),
 * cu cel puțin 0,5 % din scară între orice două segmente neînvecinate. La o încercare picată, bulge-urile se înjumătățesc
 * (de cel mult 4 ori), apoi se trage alt poligon, de cel mult 200 de ori: un oracol stricat pică repede, nu se blochează.
 */
function poligonAleator(rnd: () => number, n: number, S: number, cx: number, cy: number): ConturO {
  for (let tragere = 0; tragere < 200; tragere++) {
    const faza = rnd() * 2 * Math.PI;
    const puncte = Array.from({ length: n }, (_, i) => {
      const t = faza + (2 * Math.PI * (i + 0.15 + 0.7 * rnd())) / n;
      const rho = (S / 2) * (0.45 + 0.55 * rnd());
      return { x: cx + rho * Math.cos(t), y: cy + rho * Math.sin(t) };
    });
    let bulge = puncte.map(() => (rnd() < 0.55 ? 0 : (rnd() < 0.5 ? -1 : 1) * (0.05 + 0.45 * rnd())));
    for (let incercare = 0; incercare < 5; incercare++) {
      const c = inchis(puncte.map((p, i) => ({ p, s: (bulge[i] ?? 0) === 0 ? L : A(bulge[i] ?? 0) })));
      if (!autointersectat(c) && jocMinim(c) >= 0.005 * S) return c;
      bulge = bulge.map((b) => b / 2);
    }
  }
  throw new Error(`corpus: niciun poligon valid cu ${n} vârfuri în 200 de trageri (oracolul e stricat?)`);
}

// ---------------------------------------------------------------------------------------------------------------------
// Intrările murdare.
// ---------------------------------------------------------------------------------------------------------------------

/** După vârful i, o copie mutată cu (dx, dy) (|·| < 1e-7): vârful i primește o linie scurtă, copia ia segmentul lui. */
function cuDublura(c: ConturO, i: number, dx: number, dy: number): ConturO {
  const w = c.varfuri.flatMap((x, k) => (k === i ? [{ p: x.p, s: L }, { p: { x: x.p.x + dx, y: x.p.y + dy }, s: x.s }] : [x]));
  return { inchis: true, varfuri: w };
}

/** Ultimul vârf repetă primul (închiderea dublată, frecventă în DXF / SVG). */
function cuInchidereDubla(c: ConturO): ConturO {
  const p0 = (c.varfuri[0] as VarfO).p;
  return { inchis: true, varfuri: [...c.varfuri, { p: { x: p0.x, y: p0.y }, s: L }] };
}

/** Fiecare linie devine un arc cu |bulge| = b, cu semnul alternat. */
function cuBulgeMic(c: ConturO, b: number): ConturO {
  let semn = 1;
  return { inchis: true, varfuri: c.varfuri.map((x) => (x.s.tip === 'L' ? { p: x.p, s: A((semn = -semn) * b) } : x)) };
}

/** Un vârf în plus la mijlocul primei laturi drepte (lungi), mutat perpendicular cu `abatere` (< 1e-6). */
function cuVarfPeLatura(c: ConturO, abatere = 0): ConturO {
  const n = c.varfuri.length;
  const i = c.varfuri.findIndex((x, k) => x.s.tip === 'L' && Math.hypot((c.varfuri[(k + 1) % n] as VarfO).p.x - x.p.x, (c.varfuri[(k + 1) % n] as VarfO).p.y - x.p.y) > 1e-3);
  if (i < 0) return c;
  const a = (c.varfuri[i] as VarfO).p, b = (c.varfuri[(i + 1) % n] as VarfO).p;
  const l = Math.hypot(b.x - a.x, b.y - a.y);
  const m = { x: (a.x + b.x) / 2 - ((b.y - a.y) / l) * abatere, y: (a.y + b.y) / 2 + ((b.x - a.x) / l) * abatere };
  return { inchis: true, varfuri: c.varfuri.flatMap((x, k) => (k === i ? [x, { p: m, s: L }] : [x])) };
}

// ---------------------------------------------------------------------------------------------------------------------
// VALIDE.
// ---------------------------------------------------------------------------------------------------------------------

const valide: CazValid[] = [];
const nuIncape: Omit<CazRefuzat, 'fel'>[] = [];
let categorie: Categorie = 'trebuie';
let familie = '';
const caz = (nume: string, contur: ConturO, distante: readonly number[]): void => {
  valide.push({ nume, contur, distante, categorie, familie });
};

// Cercurile (s1 T1 și altele); 2 vârfuri, valide. TREBUIE să reușească.
familie = 'cerc';
caz('cerc R50', cerc(0, 0, 50), [3, -3, 0.005, -0.005, 500, -45]);
caz('cerc R50 orar', cerc(7, -3, 50, -1), [3, -3, -49]);
caz('cerc R1220 pe placă', cerc(1220, 1220, 1220), [3.175, -3.175, 0.01, -1000]);
caz('cerc R0,5', cerc(0, 0, 0.5), [0.01, -0.01, 0.005, -0.4, 10]);
caz('cerc R0,05', cerc(0, 0, 0.05), [-0.01, 0.01]);
caz('cerc R5 departe', cerc(2440, 1220, 5), [1, -1, -4.5]);
caz('cerc R10 dintr-un arc de 359,9999° (închiderea de 1,7e-5)', cercDintrUnArc(0, 0, 10), [3.175, -3.175, 0.005]);
caz('cerc R0,5 dintr-un arc de 359,9999° (închiderea de 8,7e-7)', cercDintrUnArc(0, 0, 0.5), [0.1, -0.1, 0.005]);
nuIncape.push(
  { nume: 'cerc R5 cu −5,5', contur: cerc(0, 0, 5), distanta: -5.5 },
  { nume: 'cerc R0,05 cu −0,06 (s1)', contur: cerc(0, 0, 0.05), distanta: -0.06 },
  { nume: 'cerc R1220 cu −1300', contur: cerc(1220, 1220, 1220), distanta: -1300 },
  { nume: 'cerc orar R5 cu −6', contur: cerc(0, 0, 5, -1), distanta: -6 },
  { nume: 'semidisc R10 cu −5,5', contur: semidisc(10), distanta: -5.5 },
);

// Dreptunghiurile (s1 T2): 100 × 60, cu și fără rază, rotite, în ambele sensuri. TREBUIE să reușească.
familie = 'dreptunghi';
for (const raza of [0, 8]) {
  for (const unghi of [0, 30, 90]) {
    for (const sens of [1, -1] as const) {
      const c0 = roteste(dreptunghi(-50, -30, 100, 60, raza), unghi, 0, 0);
      const c = sens > 0 ? c0 : inverseaza(c0);
      const nume = `dreptunghi 100×60 R${raza} rotit ${unghi}°${sens > 0 ? '' : ' orar'}`;
      caz(nume, c, sens > 0 ? [3, -3, -10, 0.005, -25] : [3, -10, -29]);
      if (unghi === 30 && sens > 0) nuIncape.push({ nume: `${nume} cu −31`, contur: c, distanta: -31 });
    }
  }
}
caz('placa 2440×1220', dreptunghi(0, 0, 2440, 1220), [3.175, -3.175, -600, 0.005]);
caz('placa 2440×1220 R50 rotită 30°', roteste(dreptunghi(0, 0, 2440, 1220, 50), 30, 1220, 610), [3.175, -3.175, 0.01]);
caz('dreptunghi 1×0,6 R0,08', dreptunghi(0, 0, 1, 0.6, 0.08), [0.005, -0.005, 0.1, -0.25]);
caz('dreptunghi 10×6 R0,8 rotit 30°', roteste(dreptunghi(0, 0, 10, 6, 0.8), 30, 5, 3), [0.5, -0.5, -2.9, 0.005]);
nuIncape.push(
  { nume: 'placa 2440×1220 cu −700', contur: dreptunghi(0, 0, 2440, 1220), distanta: -700 },
  { nume: 'dreptunghi 1×0,6 cu −0,35', contur: dreptunghi(0, 0, 1, 0.6, 0.08), distanta: -0.35 },
);

// Formele de pe hârtie din s1-V. Haltera și inelul TREBUIE să reușească (au arce de peste 180°).
familie = 'halteră';
caz('halteră (s1-V §4.2)', haltera(), [1, 0.005, -2.5, -3.5, -19]);
caz('halteră la scara 2440 (× 30)', scaleaza(haltera(), 30), [3.175, -3.175, -60]);
familie = 'inel';
caz('inel cu fantă de 0,2', inelCuFanta(), [0.5, 0.05, -0.5, -1.9]);
caz('inel cu fantă la scara 1 (÷ 10)', scaleaza(inelCuFanta(), 0.1), [0.05, 0.005, -0.05, -0.19]);
// Restul: corect sau refuzat, cu motiv.
categorie = 'corect-sau-refuz';
familie = 'polilinie densă';
caz('poligon dens R1 cu 600 de laturi', poligonRegulat(0, 0, 1, 600), [3.175, -0.5]);
caz('poligon dens R10 cu 600 de laturi', poligonRegulat(0, 0, 10, 600), [3.175, -3.175]);
familie = 'alte forme';
caz('semidisc R10', semidisc(10), [2, -2, -4.5, 0.005]);
caz('dreptunghi cu fantă de 0,02', dreptunghiCuFanta(0.02), [0.005, -0.005, 0.5, -0.8, -1.5]);
nuIncape.push(
  { nume: 'halteră cu −21', contur: haltera(), distanta: -21 },
  { nume: 'inel cu fantă cu −2,2', contur: inelCuFanta(), distanta: -2.2 },
);

// Poligoanele aleatoare: corect sau refuzat.
familie = 'poligon aleator';
const rnd = generator(21021);
const SCARI = [1, 10, 100, 2440] as const;
for (let i = 0; i < 32; i++) {
  const S = SCARI[i % 4] as number;
  const n = 5 + ((i * 7) % 20);
  const centru = S === 2440 ? { x: 1220, y: 610 } : { x: S * (rnd() - 0.5), y: S * (rnd() - 0.5) };
  const c0 = poligonAleator(rnd, n, S, centru.x, centru.y);
  const c = i % 3 === 1 ? inverseaza(c0) : c0;
  const R = razaInscrisa(c);
  const nume = `poligon ${i} (${n} vârfuri, scara ${S}${i % 3 === 1 ? ', orar' : ''})`;
  caz(nume, c, [0.005, 0.03 * S, S, -0.005, -0.3 * R.jos, -0.8 * R.jos]);
  if (i % 4 === 1) nuIncape.push({ nume: `${nume} cu −1,15 × raza înscrisă`, contur: c, distanta: -1.15 * R.sus });
}

export const VALIDE: readonly CazValid[] = valide;
export const NU_INCAPE: readonly CazRefuzat[] = nuIncape.map((c) => ({ ...c, fel: 'distanta' }));

// ---------------------------------------------------------------------------------------------------------------------
// MURDARE: fiecare cu geamăna ei din VALIDE.
// ---------------------------------------------------------------------------------------------------------------------

const dupaNume = (nume: string): CazValid => {
  const c = valide.find((x) => x.nume === nume);
  if (c === undefined) throw new Error(`corpus: lipsește ${nume}`);
  return c;
};
const murdare: CazValid[] = [];
const murdar = (geaman: string, nume: string, f: (c: ConturO) => ConturO, distante?: readonly number[]): void => {
  const g = dupaNume(geaman);
  murdare.push({ nume: `${geaman}, ${nume}`, contur: f(g.contur), distante: distante ?? g.distante.slice(0, 4), categorie: g.categorie, familie: g.familie, geaman });
};
const D30 = 'dreptunghi 100×60 R8 rotit 30°';
const D0 = 'dreptunghi 100×60 R0 rotit 0°';
murdar(D30, 'vârf repetat la 6e-8', (c) => cuDublura(c, 2, 3e-8, -5e-8));
murdar(D30, 'vârf repetat exact', (c) => cuDublura(c, 5, 0, 0));
murdar(D30, 'închidere dublată', cuInchidereDubla);
murdar(D30, 'laturi-arc cu bulge 1e-8', (c) => cuBulgeMic(c, 1e-8));
murdar(D0, 'vârf în plus pe latură', (c) => cuVarfPeLatura(c));
murdar(D0, 'vârf în plus pe latură, abătut 3e-7', (c) => cuVarfPeLatura(c, 3e-7));
murdar(D0, 'laturi-arc cu bulge 1e-8', (c) => cuBulgeMic(c, 1e-8));
murdar(D0, 'toate la un loc', (c) => cuInchidereDubla(cuBulgeMic(cuVarfPeLatura(cuDublura(c, 1, -4e-8, 2e-8)), 1e-8)));
murdar('cerc R50', 'vârf repetat la 6e-8', (c) => cuDublura(c, 0, 3e-8, -5e-8));
murdar('cerc R50', 'închidere dublată', cuInchidereDubla);
murdar('placa 2440×1220', 'toate la un loc', (c) => cuInchidereDubla(cuBulgeMic(cuVarfPeLatura(cuDublura(c, 2, 6e-8, 0)), 1e-8)));
const POL = valide.find((x) => x.nume.startsWith('poligon 2 '))?.nume ?? '';
murdar(POL, 'vârf repetat la 6e-8 și închidere dublată', (c) => cuInchidereDubla(cuDublura(c, 3, 2e-8, 5e-8)));
murdar(POL, 'laturi-arc cu bulge 1e-8', (c) => cuBulgeMic(c, 1e-8));

export const MURDARE: readonly CazValid[] = murdare;

// ---------------------------------------------------------------------------------------------------------------------
// REFUZATE, literal din contract.
// ---------------------------------------------------------------------------------------------------------------------

const PATRAT = dreptunghi(0, 0, 10, 10);
const refuzate: CazRefuzat[] = [];
const refuz = (nume: string, contur: ConturO, distanta = 1): void => {
  refuzate.push({ nume, contur, distanta, fel: contur === PATRAT ? 'distanta' : 'contur' });
};

// Autointersecții (două segmente neînvecinate care se ating; două vecine suprapuse pe o lungime).
refuz('fluture', inchis([v(0, 0), v(10, 10), v(10, 0), v(0, 10)]));
refuz('fluture, înăuntru', inchis([v(0, 0), v(10, 10), v(10, 0), v(0, 10)]), -1);
refuz('fluture cu arce', inchis([v(0, 0, A(0.3)), v(10, 10), v(10, 0, A(-0.3)), v(0, 10)]));
refuz('opt încrucișat', inchis([v(0, 0), v(10, 20), v(0, 20), v(10, 0)]));
refuz('opt din cercuri cu punct comun', inchis([v(0, 0, A(1)), v(-10, 0, A(1)), v(0, 0, A(-1)), v(10, 0, A(-1))]));
refuz('țepușă înapoi pe ea însăși', inchis([v(0, 0), v(10, 0), v(10, 5), v(16, 5), v(12, 5), v(10, 10), v(0, 10)]));
refuz('vârf pe latura de jos', inchis([v(0, 0), v(10, 0), v(10, 10), v(6, 10), v(5, 0), v(4, 10), v(0, 10)]));
refuz('clepsidră: două laturi cu un punct comun', inchis([v(0, 0), v(10, 0), v(5, 5), v(10, 10), v(0, 10), v(5, 5)]));
refuz('arc tangent la latura de jos', inchis([v(0, 0), v(20, 0), v(20, 10, A(-1)), v(0, 10)]));
// Două segmente vecine care se taie și în alt punct decât vârful comun (contractul v2). Arcul B → C (semicerc, centrul
// (7; 1,5), r² = 11,25) taie latura AB exact în (4; 0).
refuz('triunghi: arcul taie latura vecină', inchis([v(0, 0), v(10, 0, A(-1)), v(4, 3)]));
refuz('patrulater: arcul taie latura vecină', inchis([v(0, 0), v(10, 0, A(-1)), v(4, 3), v(0, 3)]));
// Prea puține vârfuri distincte (< 2) și aria zero.
refuz('fără vârfuri', inchis([]));
refuz('un vârf', inchis([v(3, 4)]));
refuz('un vârf cu arc', inchis([v(3, 4, A(1))]));
refuz('două vârfuri, doar linii', inchis([v(0, 0), v(10, 0)]));
refuz('două vârfuri, linie și arc cu bulge 1e-8', inchis([v(0, 0), v(10, 0, A(1e-8))]));
refuz('trei vârfuri, două la 1e-7', inchis([v(0, 0), v(10, 0), v(10, 1e-7)]));
refuz('trei vârfuri coliniare', inchis([v(0, 0), v(5, 0), v(10, 0)]));
refuz('patru vârfuri coliniare, dus-întors', inchis([v(0, 0), v(5, 0), v(10, 0), v(5, 0)]));
refuz('arc dus-întors', inchis([v(0, 0, A(0.5)), v(10, 0, A(-0.5))]));
// Contur deschis, cubică.
refuz('dreptunghi deschis', { inchis: false, varfuri: PATRAT.varfuri });
refuz('pătrat cu o cubică', inchis([v(0, 0), v(10, 0, { tip: 'C', c1: { x: 12, y: 3 }, c2: { x: 12, y: 7 } }), v(10, 10), v(0, 10)]));
// Distanțe sub rezoluție și nefinite (pe un pătrat valid).
for (const d of [0.0049, -0.0049, 0.004999999999, 1e-9, -1e-12, 5e-324]) refuz(`pătrat cu d = ${d} (sub rezoluție)`, PATRAT, d);
for (const d of [Number.NaN, Infinity, -Infinity]) refuz(`pătrat cu d = ${d}`, PATRAT, d);
// Coordonate nefinite.
refuz('pătrat cu x = NaN', inchis([v(0, 0), v(Number.NaN, 0), v(10, 10), v(0, 10)]));
refuz('pătrat cu y = Infinity', inchis([v(0, 0), v(10, 0), v(10, Infinity), v(0, 10)]));
refuz('pătrat cu x = −Infinity, înăuntru', inchis([v(-Infinity, 0), v(10, 0), v(10, 10), v(0, 10)]), -1);
refuz('cerc cu bulge NaN', inchis([v(5, 0, A(Number.NaN)), v(-5, 0, A(1))]));
refuz('cerc cu bulge Infinity', inchis([v(5, 0, A(Infinity)), v(-5, 0, A(1))]));

export const REFUZATE: readonly CazRefuzat[] = refuzate;
