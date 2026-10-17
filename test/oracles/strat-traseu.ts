/**
 * ORACOLUL STRATULUI DE TRASEU (ADR 0038, „Dovada și probele”, primul punct), scris de o sesiune independentă, cu ZERO
 * importuri din `src/` și fără cod comun cu aplicația. Din TEXTUL programului G-code (cel descărcat de om din export) și
 * din vederea pânzei (scara în px/mm, translația și dpr-ul, citite din atributele `data-*` ale pânzei), spune unde
 * trebuie să cadă traseul pe ecran și judecă pixelii citiți din canvasul WebGL2 față de el.
 *
 * Regulile controlerului sunt copia lui, din documentația GRBL 1.1, nu din postul aplicației: modurile modale (G0–G3),
 * G90 / G21 / G17 cerute explicit, I / J incrementale față de start (G91.1, implicitul GRBL), sensul arcului calculat ca
 * în GRBL (`mc_arc`: unghiul dintre vectorii centru → start și centru → țintă; startul egal cu ținta = cerc întreg) și
 * verificarea razei (error:33: capetele diferă cu peste 0,005 mm și peste 0,1 % din rază). Ce nu e în contract (G91,
 * G20, arcele în forma R, alt plan decât G17, G92 / G53 / G28 ...) e REFUZAT cu motiv, nu ghicit.
 *
 * Vederea (aceeași formulă ca pânza, citită din DOM): un punct (x, y) mm al documentului cade în pixelii fizici
 * X = (x · scara + tx) · dpr, Y = (ty − y · scara) · dpr, coordonate continue în care pixelul (i, j) acoperă
 * [i, i + 1) × [j, j + 1), cu centrul în (i + ½, j + ½). Originea programului (colțul ales la export) se citește din
 * antet; colțul stânga-jos al foii e originea documentului.
 *
 * Judecata, pe un canvas cu linii de 1 pixel fizic, fără antialiasing:
 * - ±1 px (ADR 0038): fiecare pixel aprins are centrul la cel mult 1 px de drumul exact (segmentele și arcele ADEVĂRATE,
 *   nu coardele lor), iar drumul n-are goluri: fiecare punct al lui are un pixel aprins la cel mult 1,5 px;
 * - abaterea medie (a sesiunii oracolului, nu a contractului): pe fiecare primitivă cu destui pixeli, media abaterii cu
 *   semn stă sub ½ px. Regula de rasterizare a liniilor (pixelul se aprinde când linia îi trece prin romb) ține centrele la
 *   cel mult ½ px pe axa mică; fără criteriul ăsta, un traseu decalat cu 1 px ar trece de ±1 px;
 * - culorile: rapidele (G0) au altă culoare decât tăierile (G1 / G2 / G3), fiecare clasă e uniformă. Pixelii aflați la
 *   ±1 px de ambele clase (încrucișări, capete comune) nu se judecă la culoare: ordinea desenului acolo nu e în contract.
 */

export type Punct = readonly [number, number];
export type Tip = 'rapid' | 'taiere';
export type RGBA = readonly [number, number, number, number];

export type Segment = {
  readonly fel: 'segment';
  readonly tip: Tip;
  /** Linia din program (de la 1), pentru mesaje. */
  readonly linia: number;
  readonly a: Punct;
  readonly b: Punct;
};

export type Arc = {
  readonly fel: 'arc';
  readonly tip: 'taiere';
  readonly linia: number;
  readonly a: Punct;
  readonly b: Punct;
  /** Centrul: startul + (I, J). */
  readonly c: Punct;
  /** Raza startului (GRBL interpolează pe ea). */
  readonly r: number;
  /** Unghiul startului față de centru, în radiani, cu y în sus (coordonatele documentului). */
  readonly u0: number;
  /** Baleiajul cu semn: + trigonometric (G3), − orar (G2); |baleiaj| ∈ (0, 2π]. */
  readonly baleiaj: number;
};

export type Primitiva = Segment | Arc;

/** Vederea pânzei, din `data-scara` (px CSS pe mm), `data-tx`, `data-ty` (px CSS) și `data-dpr`. */
export type Vedere = { readonly scara: number; readonly tx: number; readonly ty: number; readonly dpr: number };

export class ProgramRefuzat extends Error {}

const DOI_PI = 2 * Math.PI;
/** `ARC_ANGULAR_TRAVEL_EPSILON` din GRBL 1.1 (config.h). */
const EPS_ARC = 5e-7;

function refuz(linia: number, motiv: string): never {
  throw new ProgramRefuzat(`linia ${linia}: ${motiv}`);
}

/** Codurile G pe care oracolul le acceptă fără efect asupra drumului din plan. */
const FARA_EFECT: ReadonlySet<number> = new Set([17, 21, 40, 49, 54, 61, 80, 90, 91.1, 94]);

/**
 * Citește programul și întoarce drumul din planul XY, în coordonatele documentului (mm): `origine` e punctul
 * documentului în care stă zero-ul programului. O mișcare doar pe Z, sau una care pleacă dintr-un punct necunoscut (la
 * pornire, scula e oriunde până când programul a scris și X, și Y), nu se desenează.
 */
export function citesteProgram(text: string, origine: Punct = [0, 0]): Primitiva[] {
  const rez: Primitiva[] = [];
  let x: number | null = null;
  let y: number | null = null;
  let mod: 0 | 1 | 2 | 3 | null = null;
  let g90 = false;
  let g21 = false;
  const linii = text.split(/\r?\n/);
  for (let k = 0; k < linii.length; k++) {
    const nr = k + 1;
    const fara = (linii[k] ?? '').replace(/\([^)]*\)/g, '').replace(/;.*$/, '');
    if (fara.includes('(') || fara.includes(')')) refuz(nr, 'paranteză neînchisă');
    const t = fara.replace(/\s+/g, '').toUpperCase();
    if (t === '' || t === '%') continue;
    const cuvinte = [...t.matchAll(/([A-Z])([+-]?(?:\d+\.?\d*|\.\d+))/g)];
    if (cuvinte.map((c) => c[0]).join('') !== t) refuz(nr, `text necitit în „${t}”`);
    const g: number[] = [];
    const val: Partial<Record<string, number>> = {};
    for (const c of cuvinte) {
      const litera = c[1] ?? '';
      const v = Number(c[2]);
      if (litera === 'G') g.push(v);
      else if (litera === 'N' || litera === 'M') continue;
      else {
        if (val[litera] !== undefined) refuz(nr, `${litera} de două ori`);
        val[litera] = v;
      }
    }
    let miscare: 0 | 1 | 2 | 3 | null = null;
    let pauza = false;
    for (const c of g) {
      if (c === 0 || c === 1 || c === 2 || c === 3) {
        if (miscare !== null) refuz(nr, 'două mișcări pe aceeași linie');
        miscare = c;
      } else if (c === 90) g90 = true;
      else if (c === 21) g21 = true;
      else if (c === 4) pauza = true;
      else if (c === 91) refuz(nr, 'G91 (incremental): oracolul citește doar G90');
      else if (c === 20) refuz(nr, 'G20 (inch): oracolul citește doar G21');
      else if (c === 18 || c === 19) refuz(nr, `G${c}: oracolul desenează doar planul XY (G17)`);
      else if (c === 90.1) refuz(nr, 'G90.1 (I / J absolute): oracolul citește doar I / J incrementale');
      else if (!FARA_EFECT.has(c)) refuz(nr, `G${c}: în afara contractului oracolului`);
    }
    if (val['R'] !== undefined) refuz(nr, 'arc în forma R: oracolul citește doar I / J');
    if (val['K'] !== undefined) refuz(nr, 'K: oracolul desenează doar planul XY');
    if (miscare !== null) mod = miscare;
    const areAxe = val['X'] !== undefined || val['Y'] !== undefined || val['Z'] !== undefined;
    if (pauza) {
      if (areAxe || miscare !== null) refuz(nr, 'G4 cu o mișcare pe aceeași linie');
      continue;
    }
    if (!areAxe) {
      if (val['I'] !== undefined || val['J'] !== undefined) refuz(nr, 'I / J fără ținta arcului');
      continue;
    }
    if (mod === null) refuz(nr, 'o mișcare fără mod (G0 / G1 / G2 / G3)');
    if (!g90 || !g21) refuz(nr, 'prima mișcare vine înainte ca programul să declare G90 și G21');
    const nx: number | null = val['X'] ?? x;
    const ny: number | null = val['Y'] ?? y;
    const start: Punct | null = x !== null && y !== null ? [x, y] : null;
    if (mod === 2 || mod === 3) {
      if (val['I'] === undefined && val['J'] === undefined) refuz(nr, 'arc fără I / J');
      if (start === null || nx === null || ny === null) refuz(nr, 'arc care pleacă dintr-un punct necunoscut');
      const cx = start[0] + (val['I'] ?? 0);
      const cy = start[1] + (val['J'] ?? 0);
      const rx = start[0] - cx, ry = start[1] - cy;
      const ex = nx - cx, ey = ny - cy;
      const rs = Math.hypot(rx, ry), re = Math.hypot(ex, ey);
      if (rs === 0) refuz(nr, 'arc cu raza zero');
      const dr = Math.abs(rs - re);
      if (dr > 0.005 && dr > 0.001 * rs) refuz(nr, `capetele arcului sunt la raze diferite (${rs.toFixed(4)} / ${re.toFixed(4)} mm): GRBL dă error:33`);
      let u = Math.atan2(rx * ey - ry * ex, rx * ex + ry * ey);
      if (mod === 2) { if (u >= -EPS_ARC) u -= DOI_PI; } else if (u <= EPS_ARC) u += DOI_PI;
      rez.push({
        fel: 'arc', tip: 'taiere', linia: nr,
        a: [start[0] + origine[0], start[1] + origine[1]],
        b: [nx + origine[0], ny + origine[1]],
        c: [cx + origine[0], cy + origine[1]],
        r: rs, u0: Math.atan2(ry, rx), baleiaj: u,
      });
    } else if (start !== null && nx !== null && ny !== null && (nx !== start[0] || ny !== start[1])) {
      rez.push({
        fel: 'segment', tip: mod === 0 ? 'rapid' : 'taiere', linia: nr,
        a: [start[0] + origine[0], start[1] + origine[1]],
        b: [nx + origine[0], ny + origine[1]],
      });
    }
    x = nx;
    y = ny;
  }
  return rez;
}

/**
 * Originea programului în coordonatele documentului, din antetul exportului:
 * `(origine stanga-jos, Z0 sus, foaia 300.000 x 200.000 x 18.000 mm)`. Colțul stânga-jos al foii e (0, 0); la
 * dreapta-sus, zero-ul programului stă în (lățimea, înălțimea) foii (`export.spec.ts`: X = x − 300, Y = y − 200).
 */
export function origineDinAntet(text: string): Punct {
  const m = /\(origine (stanga-jos|dreapta-jos|dreapta-sus|stanga-sus), [^)]*?foaia (\d+(?:\.\d+)?) x (\d+(?:\.\d+)?) x \d+(?:\.\d+)? mm\)/.exec(text);
  if (!m) throw new ProgramRefuzat('antetul nu spune colțul de origine și foaia');
  const w = Number(m[2]), h = Number(m[3]);
  switch (m[1]) {
    case 'stanga-jos': return [0, 0];
    case 'dreapta-jos': return [w, 0];
    case 'dreapta-sus': return [w, h];
    default: return [0, h];
  }
}

/** Punctul documentului (mm) în pixelii fizici ai pânzei (coordonate continue). */
export function inPixeli(p: Punct, v: Vedere): Punct {
  return [(p[0] * v.scara + v.tx) * v.dpr, (v.ty - p[1] * v.scara) * v.dpr];
}

/** Inversul lui `inPixeli`: un punct al canvasului (pixeli fizici, continuu) în mm ai documentului. */
export function inDocument(q: Punct, v: Vedere): Punct {
  return [(q[0] / v.dpr - v.tx) / v.scara, (v.ty - q[1] / v.dpr) / v.scara];
}

/** Pixeli fizici pe mm. */
export function pxPeMm(v: Vedere): number {
  return v.scara * v.dpr;
}

/** a mod b, în [0, b). */
function modPozitiv(a: number, b: number): number {
  return ((a % b) + b) % b;
}

/**
 * Distanța (mm) de la un punct al documentului la primitivă, cu semn acolo unde are sens: la segment, + în stânga
 * sensului de mers; la arc, + în afara cercului. `interior` = cel mai apropiat punct nu e un capăt.
 */
export function distanta(p: Punct, pr: Primitiva): { readonly d: number; readonly semn: number; readonly interior: boolean } {
  if (pr.fel === 'segment') {
    const dx = pr.b[0] - pr.a[0], dy = pr.b[1] - pr.a[1];
    const l2 = dx * dx + dy * dy;
    const t = ((p[0] - pr.a[0]) * dx + (p[1] - pr.a[1]) * dy) / l2;
    if (t <= 0) return { d: Math.hypot(p[0] - pr.a[0], p[1] - pr.a[1]), semn: 0, interior: false };
    if (t >= 1) return { d: Math.hypot(p[0] - pr.b[0], p[1] - pr.b[1]), semn: 0, interior: false };
    const semn = (dx * (p[1] - pr.a[1]) - dy * (p[0] - pr.a[0])) / Math.sqrt(l2);
    return { d: Math.abs(semn), semn, interior: true };
  }
  const ux = p[0] - pr.c[0], uy = p[1] - pr.c[1];
  const t = Math.atan2(uy, ux);
  const parcurs = pr.baleiaj > 0 ? modPozitiv(t - pr.u0, DOI_PI) : modPozitiv(pr.u0 - t, DOI_PI);
  if (parcurs <= Math.abs(pr.baleiaj) + 1e-12) {
    const semn = Math.hypot(ux, uy) - pr.r;
    return { d: Math.abs(semn), semn, interior: true };
  }
  const da = Math.hypot(p[0] - pr.a[0], p[1] - pr.a[1]);
  const db = Math.hypot(p[0] - pr.b[0], p[1] - pr.b[1]);
  return { d: Math.min(da, db), semn: 0, interior: false };
}

/**
 * Coardele arcului, cu săgeata de cel mult `sageata` pixeli fizici la vederea dată (implicit ½ px, ADR 0038 §1): cel mai
 * mic număr de coarde egale care încape în săgeată. Capetele sunt exact cele din program.
 */
export function aproximeaza(arc: Arc, v: Vedere, sageata = 0.5): Punct[] {
  const rPx = arc.r * pxPeMm(v);
  const unghiMaxim = rPx <= sageata ? Math.PI : 2 * Math.acos(1 - sageata / rPx);
  const n = Math.max(1, Math.ceil(Math.abs(arc.baleiaj) / unghiMaxim - 1e-12));
  const rez: Punct[] = [arc.a];
  for (let i = 1; i < n; i++) {
    const u = arc.u0 + (arc.baleiaj * i) / n;
    rez.push([arc.c[0] + arc.r * Math.cos(u), arc.c[1] + arc.r * Math.sin(u)]);
  }
  rez.push(arc.b);
  return rez;
}

/** Drumul primitivei ca polilinie, în mm ai documentului (arcele prin `aproximeaza`). */
export function polilinie(pr: Primitiva, v: Vedere, sageata = 0.5): Punct[] {
  return pr.fel === 'segment' ? [pr.a, pr.b] : aproximeaza(pr, v, sageata);
}

/** Primitivele mutate cu (dx, dy) mm. */
export function deplaseaza(prims: readonly Primitiva[], dx: number, dy: number): Primitiva[] {
  const m = (p: Punct): Punct => [p[0] + dx, p[1] + dy];
  return prims.map((p) => (p.fel === 'segment' ? { ...p, a: m(p.a), b: m(p.b) } : { ...p, a: m(p.a), b: m(p.b), c: m(p.c) }));
}

/** Arcele cu raza înmulțită cu `f`, în jurul centrului lor (segmentele rămân). */
export function razaOri(prims: readonly Primitiva[], f: number): Primitiva[] {
  return prims.map((p) => {
    if (p.fel === 'segment') return p;
    const s = (q: Punct): Punct => [p.c[0] + f * (q[0] - p.c[0]), p.c[1] + f * (q[1] - p.c[1])];
    return { ...p, a: s(p.a), b: s(p.b), r: p.r * f };
  });
}

/** Imaginea citită dintr-un canvas: doar pixelii aprinși (alfa > 0), cu culoarea ne-premultiplicată. */
export type Pixel = { readonly x: number; readonly y: number; readonly rgba: RGBA };
export type Imagine = { readonly latime: number; readonly inaltime: number; readonly aprinsi: readonly Pixel[] };

/** Din forma plată trimisă de pagină: [x, y, r, g, b, a, x, y, …]. */
export function imagineDinPlat(latime: number, inaltime: number, plat: readonly number[]): Imagine {
  const aprinsi: Pixel[] = [];
  for (let i = 0; i + 5 < plat.length; i += 6) {
    aprinsi.push({ x: plat[i] ?? 0, y: plat[i + 1] ?? 0, rgba: [plat[i + 2] ?? 0, plat[i + 3] ?? 0, plat[i + 4] ?? 0, plat[i + 5] ?? 0] });
  }
  return { latime, inaltime, aprinsi };
}

/**
 * Desenul de referință al oracolului: fiecare primitivă, ca polilinie cu săgeata dată, rasterizată ca o linie de 1 pixel
 * (pe axa mare, câte un pixel în fiecare coloană / rând al cărui centru e atins; centrul lui stă la cel mult ½ px pe axa
 * mică). Servește martorilor pe imagini sintetice, nu e judecata.
 */
export function deseneaza(prims: readonly Primitiva[], v: Vedere, latime: number, inaltime: number, culori: Readonly<Record<Tip, RGBA>>, sageata = 0.5): Imagine {
  const harta = new Map<number, RGBA>();
  const aprinde = (px: number, py: number, c: RGBA): void => {
    if (px >= 0 && py >= 0 && px < latime && py < inaltime) harta.set(py * latime + px, c);
  };
  for (const pr of prims) {
    const pl = polilinie(pr, v, sageata).map((p) => inPixeli(p, v));
    for (let k = 0; k + 1 < pl.length; k++) {
      const a = pl[k] as Punct, b = pl[k + 1] as Punct;
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const mare = Math.abs(dx) >= Math.abs(dy) ? 0 : 1;
      const d = mare === 0 ? dx : dy;
      if (d === 0) continue;
      const lo = Math.min(a[mare], b[mare]), hi = Math.max(a[mare], b[mare]);
      for (let i = Math.ceil(lo - 0.5); i + 0.5 <= hi; i++) {
        const t = (i + 0.5 - a[mare]) / d;
        const mic = Math.floor(mare === 0 ? a[1] + t * dy : a[0] + t * dx);
        if (mare === 0) aprinde(i, mic, culori[pr.tip]); else aprinde(mic, i, culori[pr.tip]);
      }
    }
  }
  const aprinsi: Pixel[] = [];
  for (const [k, rgba] of harta) aprinsi.push({ x: k % latime, y: Math.floor(k / latime), rgba });
  return { latime, inaltime, aprinsi };
}

export type Optiuni = {
  /** Distanța maximă (px fizici) a unui pixel aprins față de drumul exact; ADR 0038: ±1 px. */
  readonly toleranta?: number;
  /** Un punct al drumului e acoperit dacă are un pixel aprins la cel mult atât (px). */
  readonly acoperire?: number;
  /** Media abaterii cu semn pe o primitivă, în modul, cel mult atât (px). */
  readonly abatereMedie?: number;
  /** Punctele drumului mai aproape de marginea canvasului decât atât (px) nu se cer acoperite. */
  readonly margine?: number;
  /** De la câți pixeli se judecă media unei primitive și culoarea unei clase. */
  readonly minim?: number;
};

export type Clasa = {
  readonly n: number;
  /** Culoarea cea mai des întâlnită în clasă. */
  readonly culoare: RGBA | null;
  /** Pixelii clasei care se depărtează de culoarea ei (suma diferențelor RGBA peste 24). */
  readonly abateri: number;
};

export type Verdict = {
  readonly ok: boolean;
  readonly motive: readonly string[];
  readonly aprinsi: number;
  /** Pixelii aprinși mai departe de drum decât toleranța. */
  readonly inPlus: number;
  readonly abatereMaxima: number;
  readonly celMaiDeparte: { readonly x: number; readonly y: number; readonly d: number } | null;
  readonly esantioane: number;
  readonly goluri: number;
  readonly primulGol: Punct | null;
  /** Media abaterii cu semn (px), pe primitivele cu destui pixeli. */
  readonly medii: ReadonlyArray<{ readonly linia: number; readonly tip: Tip; readonly n: number; readonly medie: number }>;
  readonly medieMaxima: number;
  readonly taiere: Clasa;
  readonly rapid: Clasa;
};

function diferenta(a: RGBA, b: RGBA): number {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) + Math.abs(a[3] - b[3]);
}

/**
 * Diferența doar pe culoare (RGB), pentru „rapidele au altă culoare decât tăierile”: o diferență doar de alfa (rapidele
 * în verdele tăierilor, la α 0,8) nu e altă culoare (otrava S07 a 2.8e trecea prin suma pe RGBA).
 */
function diferentaRgb(a: RGBA, b: RGBA): number {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
}

function clasa(pixeli: readonly RGBA[]): Clasa {
  const numar = new Map<string, number>();
  for (const c of pixeli) numar.set(c.join(','), (numar.get(c.join(',')) ?? 0) + 1);
  let cheie = '', maxim = 0;
  for (const [k, n] of numar) if (n > maxim) { maxim = n; cheie = k; }
  if (maxim === 0) return { n: 0, culoare: null, abateri: 0 };
  const culoare = cheie.split(',').map(Number) as unknown as RGBA;
  return { n: pixeli.length, culoare, abateri: pixeli.filter((c) => diferenta(c, culoare) > 24).length };
}

/** Judecă imaginea stratului față de drumul programului, la vederea dată. */
export function judeca(img: Imagine, prims: readonly Primitiva[], v: Vedere, opt: Optiuni = {}): Verdict {
  const toleranta = opt.toleranta ?? 1;
  const acoperire = opt.acoperire ?? 1.5;
  const abatereMedie = opt.abatereMedie ?? 0.5;
  const margine = opt.margine ?? 2;
  const minim = opt.minim ?? 20;
  const s = pxPeMm(v);
  const motive: string[] = [];

  let inPlus = 0, abatereMaxima = 0;
  let celMaiDeparte: Verdict['celMaiDeparte'] = null;
  const sume = prims.map(() => ({ n: 0, suma: 0 }));
  const culoriTaiere: RGBA[] = [], culoriRapid: RGBA[] = [];
  for (const px of img.aprinsi) {
    const p = inDocument([px.x + 0.5, px.y + 0.5], v);
    let dMin = Infinity, iMin = -1, semnMin = 0, interiorMin = false;
    let dTaiere = Infinity, dRapid = Infinity;
    for (let i = 0; i < prims.length; i++) {
      const pr = prims[i] as Primitiva;
      const r = distanta(p, pr);
      const d = r.d * s;
      if (pr.tip === 'taiere') dTaiere = Math.min(dTaiere, d); else dRapid = Math.min(dRapid, d);
      if (d < dMin) { dMin = d; iMin = i; semnMin = r.semn * s; interiorMin = r.interior; }
    }
    if (dMin > abatereMaxima) { abatereMaxima = dMin; celMaiDeparte = { x: px.x, y: px.y, d: dMin }; }
    if (dMin > toleranta) { inPlus++; continue; }
    // Media: doar pixelii din interiorul primitivei, la peste 1,5 px de capetele ei (la colț, pixelul e și al vecinei).
    const pr = prims[iMin];
    if (pr && interiorMin) {
      const pa = inPixeli(pr.a, v), pb = inPixeli(pr.b, v);
      const dCap = Math.min(Math.hypot(px.x + 0.5 - pa[0], px.y + 0.5 - pa[1]), Math.hypot(px.x + 0.5 - pb[0], px.y + 0.5 - pb[1]));
      const sm = sume[iMin];
      if (dCap > 1.5 && sm) { sm.n++; sm.suma += semnMin; }
    }
    if (dTaiere <= toleranta && dRapid > toleranta + 1) culoriTaiere.push(px.rgba);
    else if (dRapid <= toleranta && dTaiere > toleranta + 1) culoriRapid.push(px.rgba);
  }
  if (inPlus > 0 && celMaiDeparte) {
    motive.push(`${inPlus} pixeli aprinși la peste ${toleranta} px de drum (cel mai departe: ${celMaiDeparte.d.toFixed(2)} px, în (${celMaiDeparte.x}, ${celMaiDeparte.y}))`);
  }

  // Acoperirea: drumul exact, eșantionat la ¼ px, are un pixel aprins aproape, peste tot unde e în canvas.
  const masca = new Uint8Array(img.latime * img.inaltime);
  for (const px of img.aprinsi) if (px.x >= 0 && px.y >= 0 && px.x < img.latime && px.y < img.inaltime) masca[px.y * img.latime + px.x] = 1;
  let esantioane = 0, goluri = 0;
  let primulGol = null as Punct | null;
  const acoperit = (X: number, Y: number): boolean => {
    const i0 = Math.floor(X - acoperire - 0.5), i1 = Math.ceil(X + acoperire - 0.5);
    const j0 = Math.floor(Y - acoperire - 0.5), j1 = Math.ceil(Y + acoperire - 0.5);
    for (let j = Math.max(0, j0); j <= Math.min(img.inaltime - 1, j1); j++) {
      for (let i = Math.max(0, i0); i <= Math.min(img.latime - 1, i1); i++) {
        if (masca[j * img.latime + i] && Math.hypot(i + 0.5 - X, j + 0.5 - Y) <= acoperire) return true;
      }
    }
    return false;
  };
  const esantion = (q: Punct): void => {
    const [X, Y] = inPixeli(q, v);
    if (X < margine || Y < margine || X > img.latime - margine || Y > img.inaltime - margine) return;
    esantioane++;
    if (!acoperit(X, Y)) { goluri++; primulGol ??= [X, Y]; }
  };
  for (const pr of prims) {
    if (pr.fel === 'segment') {
      const l = Math.hypot(pr.b[0] - pr.a[0], pr.b[1] - pr.a[1]) * s;
      const n = Math.max(1, Math.ceil(l * 4));
      for (let i = 0; i <= n; i++) esantion([pr.a[0] + ((pr.b[0] - pr.a[0]) * i) / n, pr.a[1] + ((pr.b[1] - pr.a[1]) * i) / n]);
    } else {
      const n = Math.max(1, Math.ceil(Math.abs(pr.baleiaj) * pr.r * s * 4));
      for (let i = 0; i <= n; i++) {
        const u = pr.u0 + (pr.baleiaj * i) / n;
        esantion([pr.c[0] + pr.r * Math.cos(u), pr.c[1] + pr.r * Math.sin(u)]);
      }
    }
  }
  if (goluri > 0 && primulGol) motive.push(`${goluri} din ${esantioane} puncte ale drumului fără pixel aprins la ${acoperire} px (primul în (${primulGol[0].toFixed(1)}, ${primulGol[1].toFixed(1)}))`);

  const medii = prims
    .map((pr, i) => ({ linia: pr.linia, tip: pr.tip, n: sume[i]?.n ?? 0, medie: (sume[i]?.suma ?? 0) / Math.max(1, sume[i]?.n ?? 0) }))
    .filter((m) => m.n >= minim);
  const medieMaxima = medii.reduce((m, x) => Math.max(m, Math.abs(x.medie)), 0);
  for (const m of medii) {
    if (Math.abs(m.medie) > abatereMedie) motive.push(`linia ${m.linia}: abaterea medie ${m.medie.toFixed(2)} px pe ${m.n} pixeli (peste ${abatereMedie})`);
  }

  const taiere = clasa(culoriTaiere), rapid = clasa(culoriRapid);
  for (const [nume, c] of [['tăierile', taiere], ['rapidele', rapid]] as const) {
    if (c.n >= minim && c.abateri > 0.01 * c.n) motive.push(`${nume} nu au o singură culoare: ${c.abateri} din ${c.n} pixeli se depărtează de ${c.culoare?.join(',')}`);
  }
  if (taiere.n >= minim && rapid.n >= minim && taiere.culoare && rapid.culoare && diferentaRgb(taiere.culoare, rapid.culoare) < 32) {
    motive.push(`rapidele au culoarea tăierilor (${rapid.culoare.join(',')} / ${taiere.culoare.join(',')})`);
  }

  return {
    ok: motive.length === 0, motive, aprinsi: img.aprinsi.length, inPlus, abatereMaxima, celMaiDeparte,
    esantioane, goluri, primulGol, medii, medieMaxima, taiere, rapid,
  };
}
