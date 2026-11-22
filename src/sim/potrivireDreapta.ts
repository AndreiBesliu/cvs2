/**
 * Potrivirea dopului cu pereți drepți, în simulare (ADR 0179, felia 12.1↑e-3; contractul, ADR 0171 §3): locașul (programul
 * foii) și dopul (programul lui, pe semifabricat), simulate cu nucleul pe două grile care își corespund prin contract. Dopul
 * ridicat e oglindit pe X, (x, y) → (x1 + m − x, y − y0 + m); cel decupat nu, (x, y) → (x − x0 + m, y − y0 + m). Fereastra e
 * semifabricatul întreg, pus pe foaie.
 *
 * Ce măsoară:
 * - jocul lateral, exact, pe mutări (`taiereExacta.ts`): punctele peretelui locașului la D/2 le dă grila, bisecția pe tăietura
 *   exactă le face exacte, iar jocul fiecăruia e cât intră punctul, dus pe semifabricat, în zona tăiată din jurul dopului, la h/2;
 * - dopul în locaș: punctele peretelui dopului la h/2 (fără rama semifabricatului), aduse pe foaie, care cad în afara locașului;
 * - adâncimea locașului (mediana fundului, F peste D/2) și înălțimea dopului (mediana feței coborâte, M peste h/2; la cel
 *   decupat, cea mai adâncă tăietură: punțile ridică fundul șanțului în dreptul lor);
 * - sprijinul: pe fund, între plăci h − D; la decupat, peste placă h − D (se rindeluiește); pe față, sub dop D − h.
 * Secțiunea (ADR 0179 §5): dopul ridicat întors și coborât până la primul contact (h* = min(F + M)); cel decupat, neîntors, pe
 * fundul locașului (h* = cel mai înalt fund de sub el).
 */
import { campNou, valoare } from './camp.ts';
import {
  banda, CELULA_POTRIVIRE, PLAFON_CELULE_POTRIVIRE, simuleaza, TOLERANTA_POTRIVIRE,
  type BandaPotrivire, type ProgramPotrivire, type RandPotrivire, type SectiunePotrivire,
} from './potrivire.ts';
import { bisectie, functieTaiere } from './taiereExacta.ts';

/** Cât poate ieși jocul lateral din cel pe hârtie (mm), ca la oracolul pereților drepți. */
export const TOLERANTA_JOC = 0.02;

/** Valorile pe hârtie (ADR 0171): adâncimea D, jocul lateral c, înălțimea dopului h, spațiul H, jocul g, sprijinul. */
export type HartieDreapta = {
  readonly D: number; readonly c: number; readonly h: number; readonly H: number; readonly g: number;
  readonly sprijin: 'fund' | 'fata'; readonly decupat: boolean;
};

export type ParametriDreapta = {
  readonly cutie: { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number };
  readonly margine: number;
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

const mediana = (v: number[]): number => banda(v).med;

/** Locașul și dopul simulate, jocul lateral exact, dopul în locaș, adâncimile, sprijinul și secțiunea (ADR 0179, 12.1↑e-3). */
export function potrivireaDreapta(locas: ProgramPotrivire, dop: ProgramPotrivire, p: ParametriDreapta): PotrivireDreapta {
  const { x0, y0, x1, y1 } = p.cutie, m = p.margine, h = p.hartie, oglindit = !h.decupat;
  let c = p.celula ?? CELULA_POTRIVIRE;
  const celule = (cc: number): readonly [number, number] => [Math.ceil((x1 - x0 + 2 * m) / cc - 1e-9), Math.ceil((y1 - y0 + 2 * m) / cc - 1e-9)];
  let [nx, ny] = celule(c);
  while (nx * ny > PLAFON_CELULE_POTRIVIRE) {
    c *= 2;
    [nx, ny] = celule(c);
  }
  const gx0 = x0 - m, gy0 = y0 - m, latime = nx * c, inaltime = ny * c;
  // Foaie → semifabricat, după contract, și grila dopului: imaginea ferestrei (oglindită pe X la dopul ridicat).
  const spreDop = (x: number, y: number): readonly [number, number] => (oglindit ? [x1 + m - x, y - y0 + m] : [x - x0 + m, y - y0 + m]);
  const campLocas = campNou({ x0: gx0, y0: gy0, latime, inaltime, celula: c, sus: 0 });
  simuleaza(campLocas, locas);
  const campDop = campNou({ x0: oglindit ? x1 + m - gx0 - latime : gx0 - x0 + m, y0: gy0 - y0 + m, latime, inaltime, celula: c, sus: 0 });
  simuleaza(campDop, dop);
  const n = nx * ny, F = new Float32Array(n), M = new Float32Array(n);
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      F[j * nx + i] = -valoare(campLocas, i, j);
      M[j * nx + i] = -valoare(campDop, oglindit ? nx - 1 - i : i, j);
    }
  }
  const centru = (k: number): readonly [number, number] => [gx0 + ((k % nx) + 0.5) * c, gy0 + (Math.floor(k / nx) + 0.5) * c];

  // Rama semifabricatului (dopul decupat): lemnul netăiat la h/2 legat de marginea ferestrei; nu e al dopului.
  const netaiat = (k: number): boolean => M[k]! < h.h / 2;
  const rama = new Uint8Array(n), coada: number[] = [];
  const pune = (k: number): void => { if (netaiat(k) && !rama[k]) { rama[k] = 1; coada.push(k); } };
  for (let i = 0; i < nx; i++) { pune(i); pune((ny - 1) * nx + i); }
  for (let j = 0; j < ny; j++) { pune(j * nx); pune(j * nx + nx - 1); }
  while (coada.length > 0) {
    const k = coada.pop()!, i = k % nx;
    if (i + 1 < nx) pune(k + 1);
    if (i > 0) pune(k - 1);
    if (k + nx < n) pune(k + nx);
    if (k - nx >= 0) pune(k - nx);
  }

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
  const fD = (x: number, y: number): number => { const [u, v] = spreDop(x, y); return fD0(u, v); };
  const jocuri: number[] = [];
  let kJoc: readonly [number, number] | null = null, iesireJoc = 0;
  let nDop = 0, afara = 0, kAfara: readonly [number, number] | null = null, iesireAfara = -1;
  const vecini = (k: number): number[] => {
    const i = k % nx, v: number[] = [];
    if (i + 1 < nx) v.push(k + 1);
    if (k + nx < n) v.push(k + nx);
    return v;
  };
  for (let k = 0; k < n; k++) {
    for (const kk of vecini(k)) {
      // Peretele locașului: o celulă tăiată la D/2 lângă una netăiată.
      const tk = F[k]! >= h.D / 2, tkk = F[kk]! >= h.D / 2;
      if (tk !== tkk) {
        const [a, b] = tk ? [centru(k), centru(kk)] : [centru(kk), centru(k)];
        if (fL(a[0], a[1]) < 0 && fL(b[0], b[1]) >= 0) {
          const q = bisectie(fL, a[0], a[1], b[0], b[1]);
          const joc = -fD(q[0], q[1]);
          jocuri.push(joc);
          const e = Math.abs(joc - h.c);
          if (e > TOLERANTA_JOC && e > iesireJoc) { iesireJoc = e; kJoc = q; }
        }
      }
      // Peretele dopului: lemn netăiat la h/2 (fără ramă) lângă o celulă tăiată.
      const dk = !netaiat(k) || rama[k], dkk = !netaiat(kk) || rama[kk];
      if (dk !== dkk && !(rama[k] && rama[kk])) {
        const lemn = dk ? kk : k, taiat = dk ? k : kk;
        if (rama[lemn]) continue;
        const a = centru(taiat), b = centru(lemn);
        if (fD(a[0], a[1]) < 0 && fD(b[0], b[1]) >= 0) {
          const q = bisectie(fD, a[0], a[1], b[0], b[1]);
          nDop++;
          const l = fL(q[0], q[1]);
          if (!(l < 0)) {
            afara++;
            if (l > iesireAfara) { iesireAfara = l; kAfara = q; }
          }
        }
      }
    }
  }

  // h*: dopul ridicat, întors, la primul contact; cel decupat, pe cel mai înalt fund de sub el (lemnul lui, fără ramă).
  const piesa = (k: number): boolean => netaiat(k) && !rama[k];
  let asezare = Number.POSITIVE_INFINITY;
  for (let k = 0; k < n; k++) {
    if (oglindit) asezare = Math.min(asezare, F[k]! + M[k]!);
    else if (piesa(k)) asezare = Math.min(asezare, F[k]!);
  }

  const sprijin = h.decupat || h.sprijin === 'fund' ? inaltimeDop - adancime : adancime - inaltimeDop;
  const sprijinHartie = h.decupat || h.sprijin === 'fund' ? h.H : h.g;
  const rand = (ok: boolean, unde: readonly [number, number] | null): RandPotrivire => (ok || !unde ? { ok } : { ok, unde });
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
    fataDop[i] = oglindit ? M[k]! - asezare : piesa(k) ? -asezare : Number.NaN;
  }
  return {
    fel: 'drept', hartie: h, celula: c, joc: jocB, dop: { n: nDop, afara }, adancime, inaltime: inaltimeDop, asezare, randuri,
    sectiune: { y: gy0 + (j + 0.5) * c, x0: gx0, celula: c, placa, dop: fataDop, marcaj: rosu?.unde ? rosu.unde[0] : null, grosimeDop: p.grosimeDop },
  };
}
