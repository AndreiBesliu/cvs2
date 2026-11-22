/**
 * Potrivirea dopului în V, în simulare (ADR 0179, felia 12.1↑e-2): locașul (programul foii) și dopul (programul lui, pe
 * semifabricat), simulate cu nucleul (ADR 0047) pe două grile care își corespund prin oglinda contractului (ADR 0170 §3: un
 * punct (x, y) al foii are perechea (x1 + m − x, y − y0 + m) pe dop, deci celula i a locașului e celula nx − 1 − i a dopului),
 * apoi dopul întors, coborât până la primul contact, cu jocurile măsurate pe benzile contractului.
 *
 * O implementare a aplicației, deosebită de oracolul probelor (`test/oracles/incrustatie.ts`), care o verifică: distanța la
 * contur vine din desenul rasterizat pe grilă (par-impar, pe rânduri) și din transformarea exactă a distanței
 * (Felzenszwalb–Huttenlocher), nu din distanța la fiecare segment. Cu F cât s-a scos din placă și M cât s-a scos din dop (mm,
 * pozitive), d distanța la contur, c celula și t = tan(θ/2):
 * - oprirea h* = min(F + M) pe celulele cu lemn ale dopului (fără ce e tăiat până la `taiata`: decuparea, ADR 0172);
 * - pereții: în desen, 2c < d < S·t − 2c; contactul, partea lor cu jocul F + M − h* sub `PRAG_CONTACT`;
 * - sub dop: în desen, d ≥ D·t + 2c (fundul); între plăci: în afara desenului, d ≥ H·t + 2c.
 * Rândurile tabelului (ADR 0179 §4) și secțiunea (§5) ies de aici; textele le face interfața.
 */
import { campNou, valoare, type Camp } from './camp.ts';
import { ruleaza, type DateScula, type GrupSimulare } from './nucleu.ts';

/** Celula grilelor potrivirii (mm). */
export const CELULA_POTRIVIRE = 0.1;
/** Peste atâtea celule pe grilă, celula se dublează (ADR 0179 §2): câmpurile și distanțele rămân sub ~100 MB. */
export const PLAFON_CELULE_POTRIVIRE = 2_000_000;
/** Sub cât jocul pereților înseamnă contact (mm). */
export const PRAG_CONTACT = 0.05;
/** Cât poate ieși o valoare simulată din cea pe hârtie (mm). */
export const TOLERANTA_POTRIVIRE = 0.05;
/** Partea cea mai mică a pereților în contact. */
export const CONTACT_MINIM = 0.95;

/** Valorile pe hârtie (ADR 0170): adâncimea D, jocul g, S = D − g, spațiul H, t = tan(θ/2) și crestele (ADR 0173; 0 cu freză dreaptă). */
export type HartiePotrivire = {
  readonly D: number; readonly g: number; readonly S: number; readonly H: number; readonly t: number;
  readonly creastaLocas: number; readonly creastaDop: number;
};

export type ParametriPotrivire = {
  /** Cutia desenului pe foaie. */
  readonly cutie: { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number };
  /** Desenul pe foaie: poligoane închise, câte un șir [x, y, x, y, …], regiune par-impar (arcele, aplatizate). */
  readonly desen: readonly (readonly number[])[];
  /** Marginea semifabricatului în jurul cutiei (m din oglinda contractului). */
  readonly margine: number;
  readonly hartie: HartiePotrivire;
  /**
   * Celulele dopului tăiate până la `taiata` (vârful punților decupării, ADR 0172; altfel Infinity) nu mai sunt ale lui. Rama
   * benzii nu ajunge în fereastră: banda e mai lată decât H·t + 1.
   */
  readonly taiata: number;
  /** Grosimea semifabricatului dopului (fața lui de sus, în secțiune). */
  readonly grosimeDop: number;
  /** Celula (implicit `CELULA_POTRIVIRE`). */
  readonly celula?: number;
};

/** Un program pregătit pentru nucleu (`pregatesteProgram`): scula de pornire, mutările, grupurile de după schimbări. */
export type ProgramPotrivire = { readonly scula: DateScula; readonly mutari: Float64Array; readonly apoi?: readonly GrupSimulare[] };

export type BandaPotrivire = { readonly n: number; readonly min: number; readonly med: number; readonly max: number };
/** Un rând al tabelului: cât se potrivește cu hârtia și, dacă nu, celula cea mai depărtată (pe foaie, mm). */
export type RandPotrivire = { readonly ok: boolean; readonly unde?: readonly [number, number] };

/**
 * Secțiunea pe orizontală, la `y` (ADR 0179 §5): de la `x0`, câte o valoare pe celulă, Z-ul suprafeței plăcii (−F) și al feței
 * de jos a dopului așezat (NaN unde lemnul nu e al dopului); `marcaj`, X-ul locului unui rând roșu; fața de sus a dopului e la
 * `grosimeDop` − h*.
 */
export type SectiunePotrivire = {
  readonly y: number; readonly x0: number; readonly celula: number;
  readonly placa: Float32Array; readonly dop: Float32Array; readonly marcaj: number | null; readonly grosimeDop: number;
};

export type PotrivireV = {
  readonly fel: 'v';
  readonly hartie: HartiePotrivire;
  readonly celula: number;
  /** h*: cât intră dopul, de la fața plăcii. */
  readonly asezare: number;
  /** Unde s-a oprit dopul (pe foaie). */
  readonly oprire: readonly [number, number];
  readonly contact: { readonly n: number; readonly fractie: number };
  readonly sub: BandaPotrivire;
  readonly intre: BandaPotrivire;
  readonly randuri: { readonly intra: RandPotrivire; readonly contact: RandPotrivire; readonly sub: RandPotrivire; readonly intre: RandPotrivire };
  /** Fața dopului întors: M − h*. */
  readonly sectiune: SectiunePotrivire;
};

/** Toate mutările programului (scula de pornire, apoi grupurile de după schimbări) pe câmp. */
export function simuleaza(F: Camp, p: ProgramPotrivire): void {
  ruleaza(F, p.scula, p.mutari);
  for (const g of p.apoi ?? []) ruleaza(F, g.scula, g.mutari);
}

/** Banda unor jocuri: câte, minimul, mediana, maximul (NaN fără niciunul). */
export function banda(v: number[]): BandaPotrivire {
  if (v.length === 0) return { n: 0, min: Number.NaN, med: Number.NaN, max: Number.NaN };
  const s = Float64Array.from(v).sort();
  return { n: s.length, min: s[0]!, med: s[(s.length - 1) >> 1]!, max: s[s.length - 1]! };
}

/** Celulele din desen (par-impar), pe rânduri: trecerile laturilor prin centrul fiecărui rând, sortate, umplute pe perechi. */
function inDesen(desen: ParametriPotrivire['desen'], gx0: number, gy0: number, c: number, nx: number, ny: number): Uint8Array {
  const rez = new Uint8Array(nx * ny), treceri: number[] = [];
  for (let j = 0; j < ny; j++) {
    const y = gy0 + (j + 0.5) * c;
    treceri.length = 0;
    for (const pol of desen) {
      const n = pol.length >> 1;
      for (let a = n - 1, b = 0; b < n; a = b++) {
        const xa = pol[2 * a]!, ya = pol[2 * a + 1]!, xb = pol[2 * b]!, yb = pol[2 * b + 1]!;
        if ((ya > y) !== (yb > y)) treceri.push(xa + ((y - ya) * (xb - xa)) / (yb - ya));
      }
    }
    treceri.sort((p, q) => p - q);
    for (let k = 0; k + 1 < treceri.length; k += 2) {
      const i0 = Math.max(0, Math.ceil((treceri[k]! - gx0) / c - 0.5)), i1 = Math.min(nx - 1, Math.floor((treceri[k + 1]! - gx0) / c - 0.5));
      for (let i = i0; i <= i1; i++) rez[j * nx + i] = 1;
    }
  }
  return rez;
}

/**
 * Pătratul distanței (în celule) de la fiecare celulă la cea mai apropiată celulă țintă: transformarea exactă, separabilă, pe
 * rânduri apoi pe coloane (Felzenszwalb–Huttenlocher, înfășurătoarea inferioară a parabolelor).
 */
function distanteLaTinta(tinta: Uint8Array, valoareTinta: number, nx: number, ny: number): Float64Array {
  const INF = 1e20, rez = new Float64Array(nx * ny), N = Math.max(nx, ny);
  const f = new Float64Array(N), d = new Float64Array(N), v = new Int32Array(N), z = new Float64Array(N + 1);
  // Parabola lui p domină de la z[k] la z[k + 1]; z[0] = −∞, deci bucla de mai jos nu coboară sub 0.
  const intersectie = (q: number, p: number): number => (f[q]! + q * q - (f[p]! + p * p)) / (2 * (q - p));
  const pe1D = (len: number): void => {
    let k = 0;
    v[0] = 0; z[0] = -INF; z[1] = INF;
    for (let q = 1; q < len; q++) {
      let s = intersectie(q, v[k]!);
      while (s <= z[k]!) {
        k--;
        s = intersectie(q, v[k]!);
      }
      k++;
      v[k] = q; z[k] = s; z[k + 1] = INF;
    }
    k = 0;
    for (let q = 0; q < len; q++) {
      while (z[k + 1]! < q) k++;
      const r = q - v[k]!;
      d[q] = r * r + f[v[k]!]!;
    }
  };
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) f[i] = tinta[j * nx + i] === valoareTinta ? 0 : INF;
    pe1D(nx);
    for (let i = 0; i < nx; i++) rez[j * nx + i] = d[i]!;
  }
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < ny; j++) f[j] = rez[j * nx + i]!;
    pe1D(ny);
    for (let j = 0; j < ny; j++) rez[j * nx + i] = d[j]!;
  }
  return rez;
}

/** Locașul și dopul simulate, dopul întors și așezat, jocurile lângă hârtie și secțiunea (ADR 0179 §2–§5). */
export function potrivireaV(locas: ProgramPotrivire, dop: ProgramPotrivire, p: ParametriPotrivire): PotrivireV {
  const { x0, y0, x1, y1 } = p.cutie, m = p.margine, h = p.hartie;
  const lat = Math.min(m, h.H * h.t + 1);
  let c = p.celula ?? CELULA_POTRIVIRE;
  const celule = (cc: number): readonly [number, number] => [Math.ceil((x1 - x0 + 2 * lat) / cc - 1e-9), Math.ceil((y1 - y0 + 2 * lat) / cc - 1e-9)];
  let [nx, ny] = celule(c);
  while (nx * ny > PLAFON_CELULE_POTRIVIRE) {
    c *= 2;
    [nx, ny] = celule(c);
  }
  const gx0 = x0 - lat, gy0 = y0 - lat, latime = nx * c, inaltime = ny * c;
  const campLocas = campNou({ x0: gx0, y0: gy0, latime, inaltime, celula: c, sus: 0 });
  simuleaza(campLocas, locas);
  // Grila dopului: imaginea ferestrei prin oglindă (x′ = x1 + m − x), deci începe la x1 + m − (gx0 + lățimea ei).
  const campDop = campNou({ x0: x1 + m - gx0 - latime, y0: gy0 - y0 + m, latime, inaltime, celula: c, sus: 0 });
  simuleaza(campDop, dop);

  const n = nx * ny, F = new Float32Array(n), M = new Float32Array(n), lemn = new Uint8Array(n);
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const k = j * nx + i, f = -valoare(campLocas, i, j), md = -valoare(campDop, nx - 1 - i, j);
      F[k] = f;
      M[k] = md;
      lemn[k] = md >= p.taiata - PRAG_CONTACT ? 0 : 1;
    }
  }
  // Distanța la contur: de la o celulă din desen la cea mai apropiată din afară și invers, minus jumătate de celulă (conturul
  // trece între ele).
  const inauntru = inDesen(p.desen, gx0, gy0, c, nx, ny);
  const pana = distanteLaTinta(inauntru, 0, nx, ny), panaIn = distanteLaTinta(inauntru, 1, nx, ny);
  const dist = (k: number): number => Math.max(0, Math.sqrt(inauntru[k] ? pana[k]! : panaIn[k]!) * c - c / 2);
  const centru = (k: number): readonly [number, number] => [gx0 + ((k % nx) + 0.5) * c, gy0 + (Math.floor(k / nx) + 0.5) * c];

  let asezare = Number.POSITIVE_INFINITY, kOprire = 0;
  for (let k = 0; k < n; k++) {
    if (lemn[k] && F[k]! + M[k]! < asezare) { asezare = F[k]! + M[k]!; kOprire = k; }
  }

  const pereteMin = 2 * c, pereteMax = h.S * h.t - 2 * c, fund = h.D * h.t + 2 * c, fata = h.H * h.t + 2 * c;
  const subMin = h.g - h.creastaLocas - TOLERANTA_POTRIVIRE, subMax = h.g + TOLERANTA_POTRIVIRE;
  const intreMin = h.H - h.creastaDop - TOLERANTA_POTRIVIRE, intreMax = h.H + TOLERANTA_POTRIVIRE;
  const sub: number[] = [], intre: number[] = [];
  let pereti = 0, inContact = 0, kPerete = -1, jocPerete = -1, kSub = -1, iesireSub = 0, kIntre = -1, iesireIntre = 0;
  // Cât iese un joc din intervalul lui pe hârtie (0 înăuntru).
  const iese = (joc: number, a: number, b: number): number => Math.max(a - joc, joc - b, 0);
  for (let k = 0; k < n; k++) {
    if (!lemn[k]) continue;
    const d = dist(k), joc = F[k]! + M[k]! - asezare;
    if (inauntru[k]) {
      if (d > pereteMin && d < pereteMax) {
        pereti++;
        if (joc < PRAG_CONTACT) inContact++;
        else if (joc > jocPerete) { jocPerete = joc; kPerete = k; }
      } else if (d >= fund) {
        sub.push(joc);
        const e = iese(joc, subMin, subMax);
        if (e > iesireSub) { iesireSub = e; kSub = k; }
      }
    } else if (d >= fata) {
      intre.push(joc);
      const e = iese(joc, intreMin, intreMax);
      if (e > iesireIntre) { iesireIntre = e; kIntre = k; }
    }
  }
  const fractie = pereti > 0 ? inContact / pereti : 0;
  const bSub = banda(sub), bIntre = banda(intre);
  const rand = (ok: boolean, k: number): RandPotrivire => (ok ? { ok } : { ok, unde: centru(k) });
  const randuri = {
    intra: rand(Math.abs(asezare - h.S) <= TOLERANTA_POTRIVIRE, kOprire),
    contact: rand(pereti > 0 && fractie >= CONTACT_MINIM, kPerete >= 0 ? kPerete : kOprire),
    // Fără fund plat (o trăsătură îngustă, sub 2·D·t), rândul n-are ce compara: nu e roșu.
    sub: rand(kSub < 0, kSub),
    intre: rand(bIntre.n > 0 && kIntre < 0, kIntre >= 0 ? kIntre : kOprire),
  };

  // Secțiunea: prin mijlocul desenului, sau prin locul primului rând roșu (marcat).
  const rosu = [randuri.intra, randuri.contact, randuri.sub, randuri.intre].find((r) => !r.ok);
  const j = rosu?.unde ? Math.min(ny - 1, Math.max(0, Math.floor((rosu.unde[1] - gy0) / c))) : ny >> 1;
  const placa = new Float32Array(nx), fataDop = new Float32Array(nx);
  for (let i = 0; i < nx; i++) {
    const k = j * nx + i;
    placa[i] = -F[k]!;
    fataDop[i] = lemn[k] ? M[k]! - asezare : Number.NaN;
  }
  return {
    fel: 'v', hartie: h, celula: c, asezare, oprire: centru(kOprire), contact: { n: pereti, fractie }, sub: bSub, intre: bIntre, randuri,
    sectiune: { y: gy0 + (j + 0.5) * c, x0: gx0, celula: c, placa, dop: fataDop, marcaj: rosu?.unde ? rosu.unde[0] : null, grosimeDop: p.grosimeDop },
  };
}
