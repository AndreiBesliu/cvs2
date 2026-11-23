/**
 * Potrivirea dopului în trepte, în simulare (ADR 0179, felia 12.1↑e-4; contractul, ADR 0175 §3–§6): locașul are două niveluri
 * (sus, până la umărul d; deschiderea, de la d la D, sau prin foaie la gaură), iar dopul, mereu oglindit pe X, două părți: tija
 * (sus pe semifabricat) și flanșa (sub ea). Locașul și dopul se simulează pe grilele puse după contract
 * (`grilePotrivire`, ca la pereții drepți); fereastra e semifabricatul întreg: cutia nivelului de sus (desenul, lărgit cu s spre
 * exterior) cu marginea pe fiecare parte.
 *
 * Ce măsoară, ca oracolul (`masoaraPotrivireaTrepte`):
 * - jocul lateral pe fiecare nivel, exact, pe mutări: peretele nivelului de sus la d/2 cu flanșa, peretele deschiderii la
 *   (d + D)/2 cu tija; flanșa se citește la jumătatea dintre tijă și vârful punților (la dopul decupat; altfel, h);
 * - dopul în locaș: punctele peretelui flanșei în afara nivelului de sus, ale tijei în afara deschiderii;
 * - reazemul: cât trece peretele flanșei de deschidere (> 0: flanșa stă pe umăr);
 * - medianele: umărul (F între d/2 și (d + D)/2), fundul (F peste), tija (M între tija/2 și nivelul flanșei), fața coborâtă
 *   (M peste; la dopul decupat, cea mai adâncă tăietură: punțile ridică fundul șanțului în dreptul lor);
 * - ce rămâne după sprijin: pe umăr, sub tijă g (la gaură, nimic: tija iese la nivel cu fața de jos); pe fund, deasupra
 *   umărului g; peste placă, H (între plăci la dopul ridicat; de rindeluit la cel decupat).
 * Secțiunea: dopul întors (și cel decupat, fiindcă e în trepte) și coborât până la primul contact, h* = min(F + M) pe lemnul lui.
 */
import { banda, inDesen, TOLERANTA_POTRIVIRE, type BandaPotrivire, type ProgramPotrivire, type RandPotrivire, type SectiunePotrivire } from './potrivire.ts';
import { grilePotrivire, lemnDop, mediana, perete, rand, TOLERANTA_JOC, type CutiePotrivire, type GrilePotrivire } from './potrivireDreapta.ts';
import { functieTaiere } from './taiereExacta.ts';

/**
 * Valorile pe hârtie (ADR 0175): adâncimea locașului D (la gaură, grosimea foii), umărul d, jocul lateral c, tija și înălțimea
 * dopului h, spațiul H, jocul g, sprijinul (pe umăr sau pe fund), dopul decupat, gaura.
 */
export type HartieTrepte = {
  readonly D: number; readonly d: number; readonly c: number; readonly tija: number; readonly h: number; readonly H: number;
  readonly g: number; readonly sprijin: 'umar' | 'fund'; readonly decupat: boolean; readonly gaura: boolean;
};

export type ParametriTrepte = {
  /** Cutia nivelului de sus pe foaie (desenul, lărgit cu s spre exterior): semifabricatul e ea cu `margine` pe fiecare parte. */
  readonly cutie: CutiePotrivire;
  readonly margine: number;
  /** Flanșa și tija pe foaie: poligoane [x, y, x, y, …], par-impar. Lemnul care nu le atinge nu e al dopului. */
  readonly flansa: readonly (readonly number[])[]; readonly tija: readonly (readonly number[])[];
  readonly hartie: HartieTrepte;
  /** Adâncimea de la care lemnul dopului decupat nu mai e al lui: vârful punților; altfel Infinity. */
  readonly taiata: number;
  /** Grosimea semifabricatului dopului (fața lui de jos, întoarsă, e fața de sus în secțiune). */
  readonly grosimeDop: number;
  readonly celula?: number;
};

/** Un nivel: jocul lateral în punctele peretelui locașului, punctele peretelui dopului și câte cad în afara nivelului. */
export type NivelPotrivire = { readonly joc: BandaPotrivire; readonly dop: { readonly n: number; readonly afara: number } };

export type PotrivireTrepte = {
  readonly fel: 'trepte';
  readonly hartie: HartieTrepte;
  readonly celula: number;
  /** Nivelul de sus cu flanșa, deschiderea cu tija. */
  readonly sus: NivelPotrivire; readonly jos: NivelPotrivire;
  /** Cât trece peretele flanșei de deschidere, în fiecare punct al lui, și în câte nu trece. */
  readonly reazem: { readonly banda: BandaPotrivire; readonly nu: number };
  /** Medianele: umărul și fundul locașului, tija și fața coborâtă a dopului (la cel decupat, cea mai adâncă tăietură). */
  readonly umar: number; readonly adancime: number; readonly tija: number; readonly inaltime: number;
  /** h*: unde stă fața de jos a dopului întors (vârful tijei), sub fața plăcii. */
  readonly asezare: number;
  readonly randuri: {
    readonly jocSus: RandPotrivire; readonly jocJos: RandPotrivire; readonly dop: RandPotrivire; readonly reazem: RandPotrivire;
    readonly umar: RandPotrivire; readonly adancime: RandPotrivire; readonly tija: RandPotrivire; readonly inaltime: RandPotrivire;
    readonly clei: RandPotrivire; readonly placi: RandPotrivire;
  };
  readonly sectiune: SectiunePotrivire;
};

type Punct = readonly [number, number];

/** Jocul lateral pe peretele locașului unui nivel: cât intră fiecare punct, dus pe semifabricat, în zona tăiată din jurul dopului. */
function jocNivel(g: GrilePotrivire, prag: number, fL: (x: number, y: number) => number, fD: (x: number, y: number) => number, c: number):
  { readonly joc: BandaPotrivire; readonly unde: Punct | null } {
  const { F } = g, jocuri: number[] = [];
  let unde: Punct | null = null, iesire = 0;
  for (const q of perete(g, (k) => F[k]! >= prag, (k) => F[k]! < prag, fL)) {
    const joc = -fD(q[0], q[1]);
    jocuri.push(joc);
    const e = Math.abs(joc - c);
    if (e > TOLERANTA_JOC && e > iesire) { iesire = e; unde = q; }
  }
  return { joc: banda(jocuri), unde };
}

export function potrivireaTrepte(locas: ProgramPotrivire, dop: ProgramPotrivire, p: ParametriTrepte): PotrivireTrepte {
  const h = p.hartie;
  const g = grilePotrivire(locas, dop, p.cutie, p.margine, true, p.celula);
  const { c, nx, ny, n, gx0, gy0, F, M, centru } = g;
  // Nivelurile citite: pe locaș, jumătatea umărului și a deschiderii; pe dop, jumătatea tijei și a flanșei (cea a dopului decupat
  // doar până la vârful punților: sub el, punțile leagă flanșa de rama plăcii).
  const zSus = h.d / 2, zJos = (h.d + h.D) / 2, zTija = h.tija / 2, zFlansa = (h.tija + Math.min(h.h, p.taiata)) / 2;
  const fSus = functieTaiere(locas, -zSus), fJos = functieTaiere(locas, -zJos);
  const pe = (f: (u: number, v: number) => number) => (x: number, y: number): number => { const [u, v] = g.spreDop(x, y); return f(u, v); };
  const gTija = pe(functieTaiere(dop, -zTija)), gFlansa = pe(functieTaiere(dop, -zFlansa));
  const lemnFlansa = lemnDop(g, zFlansa, inDesen(p.flansa, gx0, gy0, c, nx, ny));
  const lemnTija = lemnDop(g, zTija, inDesen(p.tija, gx0, gy0, c, nx, ny));

  // Jocul lateral pe fiecare nivel.
  const jocSus = jocNivel(g, zSus, fSus, gFlansa, h.c), jocJos = jocNivel(g, zJos, fJos, gTija, h.c);

  // Pereții dopului: flanșa în nivelul de sus (și reazemul ei pe umăr), tija în deschidere.
  let afara = 0, iesireAfara = -1, undeAfara: Punct | null = null;
  const inAfara = (l: number, q: Punct): void => {
    if (l < 0) return;
    afara++;
    if (l > iesireAfara) { iesireAfara = l; undeAfara = q; }
  };
  const reazeme: number[] = [];
  let nu = 0, undeReazem: Punct | null = null, celMaiMic = Number.POSITIVE_INFINITY;
  const pFlansa = perete(g, (k) => M[k]! >= zFlansa, (k) => lemnFlansa[k] === 1, gFlansa);
  let afaraSus = 0;
  for (const q of pFlansa) {
    const l = fSus(q[0], q[1]);
    if (!(l < 0)) afaraSus++;
    inAfara(l, q);
    const r = fJos(q[0], q[1]);
    reazeme.push(r);
    if (!(r > 0)) nu++;
    if (r < celMaiMic) { celMaiMic = r; undeReazem = q; }
  }
  const pTija = perete(g, (k) => M[k]! >= zTija, (k) => lemnTija[k] === 1, gTija);
  let afaraJos = 0;
  for (const q of pTija) {
    const l = fJos(q[0], q[1]);
    if (!(l < 0)) afaraJos++;
    inAfara(l, q);
  }

  // Medianele, pe grilă, cu celula cea mai depărtată de hârtie a fiecăreia (locul unui rând roșu).
  const umare: number[] = [], adanci: number[] = [], tije: number[] = [], fete: number[] = [];
  let kUmar = -1, eUmar = -1, kFund = -1, eFund = -1, kTija = -1, eTija = -1, kFata = -1, eFata = -1;
  for (let k = 0; k < n; k++) {
    const f = F[k]!, m = M[k]!;
    if (f > zJos) {
      adanci.push(f);
      if (Math.abs(f - h.D) > eFund) { eFund = Math.abs(f - h.D); kFund = k; }
    } else if (f > zSus) {
      umare.push(f);
      if (Math.abs(f - h.d) > eUmar) { eUmar = Math.abs(f - h.d); kUmar = k; }
    }
    if (m > zFlansa) {
      fete.push(m);
      if (Math.abs(m - h.h) > eFata) { eFata = Math.abs(m - h.h); kFata = k; }
    } else if (m > zTija) {
      tije.push(m);
      if (Math.abs(m - h.tija) > eTija) { eTija = Math.abs(m - h.tija); kTija = k; }
    }
  }
  const umar = mediana(umare), adancime = mediana(adanci), tija = mediana(tije);
  let celMaiAdanc = Number.NaN;
  for (const v of fete) if (!(v <= celMaiAdanc)) celMaiAdanc = v;
  const inaltime = h.decupat ? celMaiAdanc : mediana(fete);

  // h*: dopul întors, coborât până la primul contact. Al celui ridicat e tot semifabricatul (fața coborâtă e a doua placă); al
  // celui decupat, doar lemnul lui.
  let asezare = Number.POSITIVE_INFINITY;
  for (let k = 0; k < n; k++) if (!h.decupat || lemnFlansa[k]) asezare = Math.min(asezare, F[k]! + M[k]!);

  // Ce rămâne după sprijin: jocul cu clei (pe umăr, sub tijă; pe fund, deasupra umărului) și spațiul de peste placă.
  const clei = h.sprijin === 'umar' ? adancime - umar - tija : tija - (adancime - umar);
  const cleiHartie = h.sprijin === 'umar' && h.gaura ? 0 : h.g;
  const placi = h.sprijin === 'umar' ? inaltime - tija - umar : inaltime - adancime;
  const nDop = pTija.length + pFlansa.length;
  const z = (ok: boolean, k: number): RandPotrivire => rand(ok, k >= 0 ? centru(k) : null);
  const randuri = {
    jocSus: rand(jocSus.joc.n > 0 && jocSus.unde === null, jocSus.unde ?? (jocSus.joc.n === 0 ? centru(n >> 1) : null)),
    jocJos: rand(jocJos.joc.n > 0 && jocJos.unde === null, jocJos.unde ?? (jocJos.joc.n === 0 ? centru(n >> 1) : null)),
    dop: rand(pFlansa.length > 0 && pTija.length > 0 && afara === 0, undeAfara ?? (nDop === 0 ? centru(n >> 1) : null)),
    reazem: rand(reazeme.length > 0 && nu === 0, reazeme.length === 0 ? centru(n >> 1) : undeReazem),
    umar: z(Math.abs(umar - h.d) <= TOLERANTA_POTRIVIRE, kUmar),
    adancime: z(Math.abs(adancime - h.D) <= TOLERANTA_POTRIVIRE, kFund),
    tija: z(Math.abs(tija - h.tija) <= TOLERANTA_POTRIVIRE, kTija),
    inaltime: z(Math.abs(inaltime - h.h) <= TOLERANTA_POTRIVIRE, kFata),
    clei: z(Math.abs(clei - cleiHartie) <= TOLERANTA_POTRIVIRE, kFund),
    placi: z(Math.abs(placi - h.H) <= TOLERANTA_POTRIVIRE, kFata),
  };

  // Secțiunea: prin mijlocul desenului, sau prin locul primului rând roșu (marcat).
  const rosu = Object.values(randuri).find((r) => !r.ok && r.unde);
  const j = rosu?.unde ? Math.min(ny - 1, Math.max(0, Math.floor((rosu.unde[1] - gy0) / c))) : ny >> 1;
  const placa = new Float32Array(nx), fataDop = new Float32Array(nx);
  for (let i = 0; i < nx; i++) {
    const k = j * nx + i;
    placa[i] = -F[k]!;
    fataDop[i] = !h.decupat || lemnFlansa[k] ? M[k]! - asezare : Number.NaN;
  }
  return {
    fel: 'trepte', hartie: h, celula: c,
    sus: { joc: jocSus.joc, dop: { n: pFlansa.length, afara: afaraSus } }, jos: { joc: jocJos.joc, dop: { n: pTija.length, afara: afaraJos } },
    reazem: { banda: banda(reazeme), nu }, umar, adancime, tija, inaltime, asezare, randuri,
    sectiune: { y: gy0 + (j + 0.5) * c, x0: gx0, celula: c, placa, dop: fataDop, marcaj: rosu?.unde ? rosu.unde[0] : null, grosimeDop: p.grosimeDop },
  };
}
