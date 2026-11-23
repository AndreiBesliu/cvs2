/**
 * Potrivirea dopului cu pereți drepți, în simulare (ADR 0179, felia 12.1↑e-3; contractul, ADR 0171 §3): locașul (programul
 * foii) și dopul (programul lui, pe semifabricat), simulate cu nucleul pe două grile care își corespund prin contract. Dopul
 * ridicat e oglindit pe X, (x, y) → (x1 + m − x, y − y0 + m); cel decupat nu, (x, y) → (x − x0 + m, y − y0 + m). Fereastra e
 * semifabricatul întreg, pus pe foaie.
 *
 * Ce măsoară:
 * - jocul lateral, exact, pe mutări (`taiereExacta.ts`): punctele peretelui locașului la D/2 le dă grila, bisecția pe tăietura
 *   exactă le face exacte, iar jocul fiecăruia e cât intră punctul, dus pe semifabricat, în zona tăiată din jurul dopului, la h/2;
 * - dopul în locaș: punctele peretelui dopului la h/2 (fără rama semifabricatului și fără miezurile golurilor), aduse pe foaie,
 *   care cad în afara locașului;
 * - adâncimea locașului (mediana fundului, F peste D/2) și înălțimea dopului (mediana feței coborâte, M peste h/2; la cel
 *   decupat, cea mai adâncă tăietură: punțile ridică fundul șanțului în dreptul lor);
 * - sprijinul: pe fund, între plăci h − D; la decupat, peste placă h − D (se rindeluiește); pe față, sub dop D − h.
 * Secțiunea (ADR 0179 §5): dopul ridicat întors și coborât până la primul contact (h* = min(F + M)); cel decupat, neîntors, pe
 * fundul locașului (h* = cel mai înalt fund de sub el).
 *
 * Grilele, lemnul dopului și pereții exacți sunt comune cu dopul în trepte (`potrivireTrepte.ts`, felia 12.1↑e-4).
 */
import { campNou, valoare } from './camp.ts';
import {
  banda, CELULA_POTRIVIRE, inDesen, PLAFON_CELULE_POTRIVIRE, simuleaza, TOLERANTA_POTRIVIRE,
  type BandaPotrivire, type ProgramPotrivire, type RandPotrivire, type SectiunePotrivire,
} from './potrivire.ts';
import { bisectie, functieTaiere } from './taiereExacta.ts';

/** Cât poate ieși jocul lateral din cel pe hârtie (mm), ca la oracolul pereților drepți. */
export const TOLERANTA_JOC = 0.02;

/**
 * Valorile pe hârtie (ADR 0171): adâncimea D, jocul lateral c, înălțimea dopului h, spațiul H, jocul g, sprijinul; `gaura`,
 * locașul prin foaie (ADR 0175: D e grosimea foii, iar sub gaură nu e lemn: desenul secțiunii n-are fund acolo).
 */
export type HartieDreapta = {
  readonly D: number; readonly c: number; readonly h: number; readonly H: number; readonly g: number;
  readonly sprijin: 'fund' | 'fata'; readonly decupat: boolean; readonly gaura: boolean;
};

/** Cutia de pe foaie din care se face semifabricatul (cu `margine` pe fiecare parte). */
export type CutiePotrivire = { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number };

export type ParametriDreapta = {
  readonly cutie: CutiePotrivire;
  readonly margine: number;
  /** Desenul dopului pe foaie: poligoane închise [x, y, x, y, …], regiune par-impar. Lemnul care nu-l atinge nu e al dopului. */
  readonly dop: readonly (readonly number[])[];
  readonly hartie: HartieDreapta;
  /** Grosimea semifabricatului dopului (fața lui de sus, în secțiune). */
  readonly grosimeDop: number;
  readonly celula?: number;
};

export type PotrivireDreapta = {
  readonly fel: 'drept';
  readonly hartie: HartieDreapta;
  readonly celula: number;
  /** Jocul lateral în punctele peretelui locașului (mm). */
  readonly joc: BandaPotrivire;
  /** Punctele peretelui dopului și câte cad în afara locașului. */
  readonly dop: { readonly n: number; readonly afara: number };
  /** Medianele: adâncimea locașului și înălțimea dopului (la cel decupat, cea mai adâncă tăietură). */
  readonly adancime: number; readonly inaltime: number;
  /** h*: unde stă fața de jos a dopului, sub fața plăcii (secțiunea). */
  readonly asezare: number;
  readonly randuri: {
    readonly joc: RandPotrivire; readonly dop: RandPotrivire; readonly adancime: RandPotrivire; readonly inaltime: RandPotrivire;
    readonly sprijin: RandPotrivire;
  };
  readonly sectiune: SectiunePotrivire;
};

export const mediana = (v: number[]): number => banda(v).med;

type Punct = readonly [number, number];

/**
 * Locașul și dopul simulate pe grile care își corespund prin contract: celula k e aceeași celulă a foii pe amândouă (dopul
 * oglindit e citit în oglindă). F e cât s-a scos din placă, M cât s-a scos din dop. Peste `PLAFON_CELULE_POTRIVIRE`, celula se
 * dublează până încape.
 */
export type GrilePotrivire = {
  readonly c: number; readonly nx: number; readonly ny: number; readonly n: number; readonly gx0: number; readonly gy0: number;
  readonly F: Float32Array; readonly M: Float32Array;
  /** Centrul celulei k, pe foaie. */
  readonly centru: (k: number) => Punct;
  /** Foaie → semifabricat, după contract. */
  readonly spreDop: (x: number, y: number) => Punct;
};

export function grilePotrivire(locas: ProgramPotrivire, dop: ProgramPotrivire, cutie: CutiePotrivire, m: number, oglindit: boolean, celula?: number): GrilePotrivire {
  const { x0, y0, x1, y1 } = cutie;
  let c = celula ?? CELULA_POTRIVIRE;
  const celule = (cc: number): readonly [number, number] => [Math.ceil((x1 - x0 + 2 * m) / cc - 1e-9), Math.ceil((y1 - y0 + 2 * m) / cc - 1e-9)];
  let [nx, ny] = celule(c);
  while (nx * ny > PLAFON_CELULE_POTRIVIRE) {
    c *= 2;
    [nx, ny] = celule(c);
  }
  const gx0 = x0 - m, gy0 = y0 - m, latime = nx * c, inaltime = ny * c;
  const spreDop = (x: number, y: number): Punct => (oglindit ? [x1 + m - x, y - y0 + m] : [x - x0 + m, y - y0 + m]);
  const campLocas = campNou({ x0: gx0, y0: gy0, latime, inaltime, celula: c, sus: 0 });
  simuleaza(campLocas, locas);
  // Grila dopului: imaginea ferestrei pe semifabricat (oglindită pe X la dopul oglindit).
  const campDop = campNou({ x0: oglindit ? x1 + m - gx0 - latime : gx0 - x0 + m, y0: gy0 - y0 + m, latime, inaltime, celula: c, sus: 0 });
  simuleaza(campDop, dop);
  const n = nx * ny, F = new Float32Array(n), M = new Float32Array(n);
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      F[j * nx + i] = -valoare(campLocas, i, j);
      M[j * nx + i] = -valoare(campDop, oglindit ? nx - 1 - i : i, j);
    }
  }
  return { c, nx, ny, n, gx0, gy0, F, M, centru: (k) => [gx0 + ((k % nx) + 0.5) * c, gy0 + (Math.floor(k / nx) + 0.5) * c], spreDop };
}

/**
 * Lemnul dopului la adâncimea `prag` (1 pe celulă): bucățile netăiate acolo (vecinii pe laturi) care ating desenul dopului
 * (`inDop`). Celelalte nu sunt ale lui: rama semifabricatului (la dopul decupat, placa din jurul șanțului) și miezurile golurilor
 * unui dop decupat, rămase în mijlocul șanțului din gol, care cad la decupare.
 */
export function lemnDop(g: GrilePotrivire, prag: number, inDop: Uint8Array): Uint8Array {
  const { nx, n, M } = g;
  const rez = new Uint8Array(n), vazut = new Uint8Array(n);
  const netaiat = (k: number): boolean => M[k]! < prag;
  for (let k0 = 0; k0 < n; k0++) {
    if (vazut[k0] || !netaiat(k0)) continue;
    const celule = [k0], coada = [k0];
    vazut[k0] = 1;
    let atinge = false;
    while (coada.length > 0) {
      const k = coada.pop()!, i = k % nx;
      if (inDop[k] === 1) atinge = true;
      for (const kk of [i + 1 < nx ? k + 1 : -1, i > 0 ? k - 1 : -1, k + nx < n ? k + nx : -1, k - nx]) {
        if (kk >= 0 && !vazut[kk] && netaiat(kk)) { vazut[kk] = 1; coada.push(kk); celule.push(kk); }
      }
    }
    if (atinge) for (const q of celule) rez[q] = 1;
  }
  return rez;
}

/**
 * Punctele exacte ale unui perete: între două celule vecine, una tăiată (`taiat`, unde f < 0) și una de lemn (`lemn`, unde
 * f ≥ 0), punctul unde f trece prin 0, prin bisecție pe segmentul dintre centrele lor.
 */
export function perete(g: GrilePotrivire, taiat: (k: number) => boolean, lemn: (k: number) => boolean, f: (x: number, y: number) => number): Punct[] {
  const { nx, n } = g, rez: Punct[] = [];
  for (let k = 0; k < n; k++) {
    for (const kk of [(k % nx) + 1 < nx ? k + 1 : -1, k + nx < n ? k + nx : -1]) {
      if (kk < 0) continue;
      const [a, b] = taiat(k) && lemn(kk) ? [k, kk] : taiat(kk) && lemn(k) ? [kk, k] : [-1, -1];
      if (a < 0) continue;
      const pa = g.centru(a), pb = g.centru(b);
      if (f(pa[0], pa[1]) < 0 && f(pb[0], pb[1]) >= 0) rez.push(bisectie(f, pa[0], pa[1], pb[0], pb[1]));
    }
  }
  return rez;
}

/** Rândul tabelului: bun sau nu; un rând roșu își spune locul (fără el, dacă nu-l știe). */
export const rand = (ok: boolean, unde: Punct | null): RandPotrivire => (ok || !unde ? { ok } : { ok, unde });

/** Locașul și dopul simulate, jocul lateral exact, dopul în locaș, adâncimile, sprijinul și secțiunea (ADR 0179, 12.1↑e-3). */
export function potrivireaDreapta(locas: ProgramPotrivire, dop: ProgramPotrivire, p: ParametriDreapta): PotrivireDreapta {
  const h = p.hartie, oglindit = !h.decupat;
  const g = grilePotrivire(locas, dop, p.cutie, p.margine, oglindit, p.celula);
  const { c, nx, ny, n, gx0, gy0, F, M, centru } = g;
  const lemn = lemnDop(g, h.h / 2, inDesen(p.dop, gx0, gy0, c, nx, ny));

  // Adâncimile, pe grilă.
  const funduri: number[] = [], fete: number[] = [];
  let kFund = -1, iesireFund = -1, kFata = -1, iesireFata = -1;
  for (let k = 0; k < n; k++) {
    if (F[k]! > h.D / 2) {
      funduri.push(F[k]!);
      if (Math.abs(F[k]! - h.D) > iesireFund) { iesireFund = Math.abs(F[k]! - h.D); kFund = k; }
    }
    if (M[k]! > h.h / 2) {
      fete.push(M[k]!);
      if (Math.abs(M[k]! - h.h) > iesireFata) { iesireFata = Math.abs(M[k]! - h.h); kFata = k; }
    }
  }
  const adancime = mediana(funduri);
  let celMaiAdanc = Number.NaN;
  for (const v of fete) if (!(v <= celMaiAdanc)) celMaiAdanc = v;
  const inaltimeDop = h.decupat ? celMaiAdanc : mediana(fete);

  // Pereții, exact: tăietura locașului la D/2 (pe foaie) și a dopului la h/2 (dusă pe foaie prin contract).
  const fL = functieTaiere(locas, -h.D / 2);
  const fD0 = functieTaiere(dop, -h.h / 2);
  const fD = (x: number, y: number): number => { const [u, v] = g.spreDop(x, y); return fD0(u, v); };
  // Peretele locașului: o celulă tăiată la D/2 lângă una netăiată; jocul, cât intră punctul în zona tăiată din jurul dopului.
  const jocuri: number[] = [];
  let kJoc: Punct | null = null, iesireJoc = 0;
  for (const q of perete(g, (k) => F[k]! >= h.D / 2, (k) => F[k]! < h.D / 2, fL)) {
    const joc = -fD(q[0], q[1]);
    jocuri.push(joc);
    const e = Math.abs(joc - h.c);
    if (e > TOLERANTA_JOC && e > iesireJoc) { iesireJoc = e; kJoc = q; }
  }
  // Peretele dopului: lemnul lui la h/2 lângă o celulă tăiată; adus pe foaie, punctul trebuie să fie în locaș.
  let nDop = 0, afara = 0, kAfara: Punct | null = null, iesireAfara = -1;
  for (const q of perete(g, (k) => M[k]! >= h.h / 2, (k) => lemn[k] === 1, fD)) {
    nDop++;
    const l = fL(q[0], q[1]);
    if (!(l < 0)) {
      afara++;
      if (l > iesireAfara) { iesireAfara = l; kAfara = q; }
    }
  }

  // h*: dopul ridicat, întors, la primul contact; cel decupat, pe cel mai înalt fund de sub lemnul lui.
  let asezare = Number.POSITIVE_INFINITY;
  for (let k = 0; k < n; k++) {
    if (oglindit) asezare = Math.min(asezare, F[k]! + M[k]!);
    else if (lemn[k]) asezare = Math.min(asezare, F[k]!);
  }

  const sprijin = h.decupat || h.sprijin === 'fund' ? inaltimeDop - adancime : adancime - inaltimeDop;
  const sprijinHartie = h.decupat || h.sprijin === 'fund' ? h.H : h.g;
  const jocB = banda(jocuri);
  const randuri = {
    joc: rand(jocB.n > 0 && kJoc === null, kJoc ?? (jocB.n === 0 ? centru(n >> 1) : null)),
    dop: rand(nDop > 0 && afara === 0, kAfara ?? (nDop === 0 ? centru(n >> 1) : null)),
    adancime: rand(Math.abs(adancime - h.D) <= TOLERANTA_POTRIVIRE, kFund >= 0 ? centru(kFund) : null),
    inaltime: rand(Math.abs(inaltimeDop - h.h) <= TOLERANTA_POTRIVIRE, kFata >= 0 ? centru(kFata) : null),
    sprijin: rand(Math.abs(sprijin - sprijinHartie) <= TOLERANTA_POTRIVIRE, kFund >= 0 ? centru(kFund) : null),
  };

  // Secțiunea: prin mijlocul desenului, sau prin locul primului rând roșu (marcat).
  const rosu = [randuri.joc, randuri.dop, randuri.adancime, randuri.inaltime, randuri.sprijin].find((r) => !r.ok && r.unde);
  const j = rosu?.unde ? Math.min(ny - 1, Math.max(0, Math.floor((rosu.unde[1] - gy0) / c))) : ny >> 1;
  const placa = new Float32Array(nx), fataDop = new Float32Array(nx);
  for (let i = 0; i < nx; i++) {
    const k = j * nx + i;
    placa[i] = -F[k]!;
    fataDop[i] = oglindit ? M[k]! - asezare : lemn[k] ? -asezare : Number.NaN;
  }
  return {
    fel: 'drept', hartie: h, celula: c, joc: jocB, dop: { n: nDop, afara }, adancime, inaltime: inaltimeDop, asezare, randuri,
    sectiune: { y: gy0 + (j + 0.5) * c, x0: gx0, celula: c, placa, dop: fataDop, marcaj: rosu?.unde ? rosu.unde[0] : null, grosimeDop: p.grosimeDop },
  };
}
