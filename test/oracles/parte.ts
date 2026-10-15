/**
 * TĂIETURILE PE O PARTE ÎN POARTĂ (ADR 0037 §3, §5 cu precizările 2.3c-4, §6, §7, §10, §13; felia 2.3c-5, sesiune
 * independentă, scrisă doar din textul ADR-ului), cu ZERO importuri din `src/` și fără cavalier. Rulează doar cu
 * `regiune` (documentul v10 în context, `regiuneDinDocument`): eticheta `(<idLume>: cale, stanga|dreapta, <adâncime> mm)`
 * e recunoscută (`regiune.ts`), iar peretele căii (conturul deschis în lume și partea sculei în lume, cu XOR-ul
 * determinantului, §3) vine din `Regiune.pereti`.
 *
 * Ce judecă, pe textul G-code (mișcările de tăiere = partea de sub fața de sus a fiecărei mișcări G1 / G2 / G3, cu arcele
 * cum le execută GRBL, `parteaDeTaiere` din poartă; plonjarea pe verticală = un punct):
 *
 * - **Invarianta 2, amendată** (§10, §13), pe fiecare mișcare de sub o etichetă stânga / dreapta validă:
 *   - în afara lui K, la cel puțin `prag(R, 0,002)` = max(R − ε − 0,002, 1e-6) de marginile lui K (`verificaMutarea` cu
 *     i = −1: o tăietură pe o parte nu e inel, deci n-are parte proprie);
 *   - la cel puțin același prag de TOȚI pereții, inclusiv de al său (`verificaPeretii`; pe exterior / interior poarta
 *     adaugă și ea pereții la margini);
 *   - pe partea etichetei față de propriul perete, fără ocolirea capătului (`judecaPunct`, eșantionat la `PAS_PARTE`):
 *     piciorul (cel mai apropiat punct al peretelui) în interiorul unei primitive → semnul produsului vectorial e cel al
 *     părții; piciorul într-un vârf interior → punctul stă pe partea sculei a măcar uneia dintre cele două tangente
 *     (evantaiul colțului convex); piciorul într-un capăt al căii → nu strict pe partea păstrată a tangentei din capăt și
 *     nici în capac: (q − E) · u_afară ≤ `TOL_NORMALA` (pe normala capătului, nu dincolo de ea). Precizarea 2.3c-4
 *     („picioarele la egalitate”): partea se judecă față de fiecare picior aflat la cel mult `TOL_EGALITATE` de minim,
 *     iar punctul e corect dacă e corect față de unul.
 * - **Invarianta 9, amendată** (§13): în fiecare eșantion de tăiere, q = piciorul pe perete (numai unde e unic și cade
 *   în interiorul unei primitive), v = p − q, τ = direcția de mers; urcare ⇔ τ × v > 0. Semnul așteptat se DERIVĂ din
 *   modelul așchiei (`parteaPastrataPrinAschie` din `sens.ts`: partea, față de mers, în care rămâne materialul; peretele
 *   e marginea lui, deci materialul e în −v), nu din tabelul §6. Un eșantion cu |τ̂ × v| ≤ 0,002 (mers aproape
 *   perpendicular pe perete) nu se judecă. Și: o buclă închisă (definiția din `sens.ts`) sub o etichetă pe o parte e o
 *   încălcare, cu EXCEPȚIA bucății care se închide pe ea însăși (precizarea 2.3c-4, camera cu gura mai îngustă decât D):
 *   bucla e un lanț întreg, iar fiecare mișcare a ei trece 14 (ii) înainte și partea de la 2 (ALEGERE, vezi raportul).
 * - **14 (ii)** (§5, §13), pe fiecare TRECERE: lanțurile consecutive ale aceleiași etichete la aceeași adâncime (±0,001;
 *   lanțul = mișcările de tăiere consecutive, de la plonjare până la ridicare). Offsetul deschis ideal: punctele
 *   c(t) + d·n(t) ale fiecărei primitive și evantaiele colțurilor convexe dinspre sculă, fără capace; un punct ideal e
 *   VALID dacă nicio parte a căii nu stă mai aproape de el decât R − 1e-5 (§5). Pe trecere:
 *   - înainte: fiecare mișcare, pe toată lungimea ei, are |dist(p, perete) − R| ≤ `tolII` (supremul rafinat, ca la
 *     14 (i)); împreună cu partea de la 2, punctul e pe offsetul ideal (nivelul R pe partea sculei, fără capac);
 *   - acoperirea: fiecare punct ideal valid e la cel mult `tolII` de reuniunea lanțurilor trecerii (porțiunile valide
 *     găsite la `PAS_VALID`, marginile rafinate prin înjumătățire; supremul rafinat pe fiecare porțiune);
 *   - capetele: unde punctul ideal de pe normala unui capăt e valid, un capăt de lanț al trecerii stă la cel mult
 *     `tolII` de el;
 *   - ALEGERE: două lanțuri ale aceleiași treceri nu se ating (un capăt al unuia la cel mult `TOL_ATINGERE` de celălalt:
 *     §5, „nicio bucată nu se atinge … pe alta”; prinde și o bucată tăiată în două, cu o plonjare la mijlocul peretelui).
 *
 * Toleranța `tolII` = 0,002 (§5, abaterea offsetului) + 0,002 (rotunjirea postului, ca la 2 și 14 (i)) + 0,0006 (marja:
 * arcele rotunjite ajung la 0,0021, reîncercarea cu |d| + 1e-4, rafinarea), plus 0,0011 pe un perete cu cubice
 * (biarcele aplicației la 0,001 de desen, polilinia mea la 1e-4). Pe traseul exact, ADR-ul cere 0,002; pe textul G-code se
 * adaugă postul, ca la invarianta 2.
 *
 * Ce NU face (limitele, spuse în raport): o porțiune validă mai scurtă decât `PAS_VALID` (0,01 mm), între două eșantioane
 * nevalide, nu se cere acoperită, iar o crestătură nevalidă mai îngustă, între două valide, se cere; capetele bucăților
 * la o încrucișare foarte strânsă a două ramuri ale offsetului (unghiul θ) se mută cu abaterea / sin(θ/2), deci acolo
 * acoperirea poate cere mai mult decât face aplicația dacă offsetul ei e departe de ideal (cu cavalier pe linii și arce,
 * nu e). Inversarea pe loc (o cale care se întoarce pe ea însăși, 180°) n-are evantai: aplicația o refuză (§5).
 */
import type { Eveniment, Mutare, Punct3 } from './gcode.ts';
import {
  capeteArc, cutiePrimitiva, distantaCutii, dPunct, inUnghi, lungime, peOParte, prag, pt, punctLa, verificaMutarea, PAS_MIN,
  type Cutie, type Eticheta, type IncalcareMutare, type ParteO, type Perete, type Primitiva, type Pt, type Regiune,
} from './regiune.ts';
import { ARIE_MINIMA, buclele, parteaPastrataPrinAschie, sensurileEtichetelor, type EtichetaActiva } from './sens.ts';
import { supremul, supremulCurba, type Depasire } from './pe-linie.ts';

/** Rotunjirea postului la 3 zecimale (aceeași cifră ca `TOL_ROTUNJIRE` din poartă). */
export const TOL_POST_P = 0.002;
/** §5: abaterea offsetului față de |d|, pe traseul exact. */
export const TOL_OFFSET_P = 0.002;
/** Marja declarată (antetul). */
export const MARJA_II = 0.0006;
/** Pe un perete cu cubice: biarcele aplicației (0,001) plus polilinia mea (`SAGETA_CUBICA` = 1e-4). */
export const TOL_CUBICE_II = 0.0011;
/** Toleranța lui 14 (ii), în ambele sensuri (antetul). */
export const tolII = (cuCubice: boolean): number => TOL_OFFSET_P + TOL_POST_P + MARJA_II + (cuCubice ? TOL_CUBICE_II : 0);
/** §5: un punct ideal e valid dacă nicio parte a căii nu stă mai aproape de el decât R − atât. */
export const MARJA_VALID = 1e-5;
/** Pasul eșantionării validității pe offsetul ideal (ADR: cel mult 0,05 mm). */
export const PAS_VALID = 0.01;
/** Pasul eșantionării părții și a sensului pe mișcări. */
export const PAS_PARTE = 0.01;
/** Precizarea 2.3c-4: picioarele „la egalitate” (1e-6 pe traseul exact; pe G-code, plus de două ori rotunjirea). */
export const TOL_EGALITATE = 1e-6 + 2 * TOL_POST_P;
/** Două lanțuri ale aceleiași treceri „se ating” la atât (rotunjirea a două capete). */
export const TOL_ATINGERE = 2 * TOL_POST_P;
/** Aceeași adâncime (două cote rotunjite), pentru trecerile unei etichete. */
const TOL_Z_TRECERE = 0.001;
/** Sub atât (față de mers), un eșantion n-are sens de citit (antetul, invarianta 9). */
const TOL_SENS = TOL_POST_P;
/**
 * Sub atât (mm, rezoluția postului), o primitivă nu-și spune sensul: bucata de închidere a unui arc citit ca GRBL (de la
 * capătul socotit al arcului la ținta lui, ~1e-4 mm, din rotunjirea lui I / J) are o direcție de zgomot. Reparat la
 * integrare (2.3c-5): pe cubica blândă, poarta lua o asemenea bucată de 0,28 µm drept mers invers.
 */
const LUNGIME_MINIMA_SENS = 0.001;
/** Pasul în interiorul unei încălcări (doar pentru adâncimea raportată). */
const PAS_INCALCARE = 0.01;

export type IncalcareParte = { readonly invarianta: 2 | 9 | 14; readonly linia: number; readonly mesaj: string };

const mm = (v: number): string => v.toFixed(3);
const pct = (p: Pt): string => `(${mm(p.x)}, ${mm(p.y)})`;
const dist = (a: Pt, b: Pt): number => Math.hypot(a.x - b.x, a.y - b.y);
const cross = (a: Pt, b: Pt): number => a.x * b.y - a.y * b.x;
const rot90 = (a: Pt): Pt => pt(-a.y, a.x);
const unitar = (a: Pt): Pt => { const L = Math.hypot(a.x, a.y); return L > 0 ? pt(a.x / L, a.y / L) : pt(0, 0); };
const e = (u: number): Pt => pt(Math.cos(u), Math.sin(u));

// ---------------------------------------------------------------------------------------------------------------
// Indexul unei liste de primitive: distanța exactă și vecinii, cu o grilă doar pentru viteză.

type Index = {
  readonly prims: readonly Primitiva[];
  /** Distanța exactă de la p la listă; `indiciu` = raza de pornire a căutării. */
  readonly distanta: (p: Pt, indiciu?: number) => number;
  /** Indicii primitivelor care au o bucată cu cutia la cel mult r de p (deci toate cele la cel mult r de p). */
  readonly aproape: (p: Pt, r: number) => number[];
};

const CELULA = 1;
const BUCATA = 2;

/** Primitiva tăiată în bucăți de cel mult `BUCATA` mm și 90° (exacte: aceleași puncte), pentru cutii mici. */
function bucatiDin(q: Primitiva): Primitiva[] {
  if (q.tip === 'punct') return [q];
  const L = lungime(q);
  const n = Math.max(1, Math.ceil(L / BUCATA), q.tip === 'arc' ? Math.ceil(Math.abs(q.du) / (Math.PI / 2)) : 1);
  if (n === 1) return [q];
  const rez: Primitiva[] = [];
  for (let k = 0; k < n; k++) {
    if (q.tip === 'segment') rez.push({ tip: 'segment', a: punctLa(q, (L * k) / n), b: k === n - 1 ? q.b : punctLa(q, (L * (k + 1)) / n) });
    else rez.push({ tip: 'arc', c: q.c, r: q.r, u0: q.u0 + (q.du * k) / n, du: q.du / n });
  }
  return rez;
}

export function indexeaza(prims: readonly Primitiva[]): Index {
  const bucati: Array<{ readonly k: number; readonly c: Cutie }> = [];
  prims.forEach((q, k) => { for (const b of bucatiDin(q)) bucati.push({ k, c: cutiePrimitiva(b) }); });
  const grila = new Map<number, number[]>();
  const cheie = (i: number, j: number): number => (i + 1048576) * 2097152 + (j + 1048576);
  bucati.forEach((b, n) => {
    for (let i = Math.floor(b.c.minX / CELULA); i <= Math.floor(b.c.maxX / CELULA); i++) {
      for (let j = Math.floor(b.c.minY / CELULA); j <= Math.floor(b.c.maxY / CELULA); j++) {
        const x = grila.get(cheie(i, j));
        if (x) x.push(n); else grila.set(cheie(i, j), [n]);
      }
    }
  });
  const tot: Cutie = bucati.length
    ? { minX: Math.min(...bucati.map((b) => b.c.minX)), maxX: Math.max(...bucati.map((b) => b.c.maxX)), minY: Math.min(...bucati.map((b) => b.c.minY)), maxY: Math.max(...bucati.map((b) => b.c.maxY)) }
    : { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  const diag = Math.hypot(tot.maxX - tot.minX, tot.maxY - tot.minY);
  const aproape = (p: Pt, r: number): number[] => {
    const cp: Cutie = { minX: p.x, maxX: p.x, minY: p.y, maxY: p.y };
    const ks = new Set<number>();
    const i0 = Math.floor((p.x - r) / CELULA), i1 = Math.floor((p.x + r) / CELULA);
    const j0 = Math.floor((p.y - r) / CELULA), j1 = Math.floor((p.y + r) / CELULA);
    if ((i1 - i0 + 1) * (j1 - j0 + 1) > bucati.length) {
      for (const b of bucati) if (distantaCutii(cp, b.c) <= r) ks.add(b.k);
    } else {
      for (let i = i0; i <= i1; i++) {
        for (let j = j0; j <= j1; j++) {
          for (const n of grila.get(cheie(i, j)) ?? []) if (distantaCutii(cp, bucati[n]!.c) <= r) ks.add(bucati[n]!.k);
        }
      }
    }
    return [...ks];
  };
  const distanta = (p: Pt, indiciu = CELULA): number => {
    if (prims.length === 0) return Infinity;
    const toate = distantaCutii({ minX: p.x, maxX: p.x, minY: p.y, maxY: p.y }, tot) + diag;
    for (let r = Math.max(indiciu, CELULA); ; r *= 2) {
      let d = Infinity;
      for (const k of aproape(p, r)) { const x = dPunct(p, prims[k]!); if (x < d) d = x; }
      // Orice primitivă la cel mult d ≤ r de p are o bucată cu cutia la cel mult r: minimul e exact.
      if (d <= r || r >= toate) return d;
    }
  };
  return { prims, distanta, aproape };
}

// ---------------------------------------------------------------------------------------------------------------
// Peretele, pregătit pentru judecată: indexul, partea (semnul: +1 = stânga mersului), tangentele, capetele.

const tangentaLa = (q: Primitiva, u: number): Pt => (q.tip === 'arc' ? pt(-Math.sign(q.du) * Math.sin(u), Math.sign(q.du) * Math.cos(u)) : pt(0, 0));
/** Tangenta (unitară) la startul și la capătul primitivei, în sensul ei. */
function tangentaStart(q: Primitiva): Pt {
  if (q.tip === 'segment') return unitar(pt(q.b.x - q.a.x, q.b.y - q.a.y));
  if (q.tip === 'arc') return tangentaLa(q, q.u0);
  return pt(0, 0);
}
function tangentaCapat(q: Primitiva): Pt {
  if (q.tip === 'segment') return unitar(pt(q.b.x - q.a.x, q.b.y - q.a.y));
  if (q.tip === 'arc') return tangentaLa(q, q.u0 + q.du);
  return pt(0, 0);
}

export type PereteJ = {
  readonly perete: Perete;
  readonly idx: Index;
  readonly n: number;
  /** +1: scula în stânga mersului (în lume); −1: în dreapta. */
  readonly semn: 1 | -1;
  readonly cuCubice: boolean;
};

const pregatite = new WeakMap<Perete, PereteJ>();
export function pregateste(w: Perete): PereteJ | null {
  if (!w.parte) return null;
  let j = pregatite.get(w);
  if (!j) {
    const prims = w.contur.primitive.filter((q) => q.tip !== 'punct');
    j = { perete: w, idx: indexeaza(prims), n: prims.length, semn: w.parte === 'stanga' ? 1 : -1, cuCubice: !!w.contur.cuCubice };
    pregatite.set(w, j);
  }
  return j;
}

/** Normala spre sculă a tangentei τ (unitară). */
const normalaSculei = (j: PereteJ, t: Pt): Pt => { const n = rot90(t); return j.semn > 0 ? n : pt(-n.x, -n.y); };

/** Un picior pe perete: primitiva k, punctul, distanța și locul (în interior, la startul sau la capătul primitivei). */
export type Picior = { readonly k: number; readonly f: Pt; readonly d: number; readonly loc: 'interior' | 'start' | 'capat'; readonly t?: Pt };

function piciorPe(q: Primitiva, p: Pt, k: number): Picior {
  if (q.tip === 'segment') {
    const dx = q.b.x - q.a.x, dy = q.b.y - q.a.y;
    const L2 = dx * dx + dy * dy;
    const t = L2 > 0 ? ((p.x - q.a.x) * dx + (p.y - q.a.y) * dy) / L2 : 0;
    if (t <= 0) return { k, f: q.a, d: dist(p, q.a), loc: 'start' };
    if (t >= 1) return { k, f: q.b, d: dist(p, q.b), loc: 'capat' };
    const f = pt(q.a.x + t * dx, q.a.y + t * dy);
    return { k, f, d: dist(p, f), loc: 'interior', t: unitar(pt(dx, dy)) };
  }
  if (q.tip === 'arc') {
    const [e0, e1] = capeteArc(q);
    const u = Math.atan2(p.y - q.c.y, p.x - q.c.x);
    const rho = Math.hypot(p.x - q.c.x, p.y - q.c.y);
    if (rho > 0 && inUnghi(q, u)) {
      const f = pt(q.c.x + q.r * Math.cos(u), q.c.y + q.r * Math.sin(u));
      // Chiar pe un capăt al arcului (unghiul lui), piciorul e vârful.
      if (dist(f, e0) <= 1e-12 * Math.max(1, q.r)) return { k, f: e0, d: dist(p, e0), loc: 'start' };
      if (dist(f, e1) <= 1e-12 * Math.max(1, q.r)) return { k, f: e1, d: dist(p, e1), loc: 'capat' };
      return { k, f, d: Math.abs(rho - q.r), loc: 'interior', t: tangentaLa(q, u) };
    }
    const d0 = dist(p, e0), d1 = dist(p, e1);
    return d0 <= d1 ? { k, f: e0, d: d0, loc: 'start' } : { k, f: e1, d: d1, loc: 'capat' };
  }
  return { k, f: q.p, d: dist(p, q.p), loc: 'start' };
}

/** Picioarele lui p pe perete, la cel mult `tol` de cel mai apropiat, crescător după distanță. */
export function picioare(j: PereteJ, p: Pt, tol = TOL_EGALITATE, indiciu?: number): Picior[] {
  const d0 = j.idx.distanta(p, indiciu);
  if (!Number.isFinite(d0)) return [];
  const rez: Picior[] = [];
  for (const k of j.idx.aproape(p, d0 + tol)) {
    const x = piciorPe(j.idx.prims[k]!, p, k);
    if (x.d <= d0 + tol) rez.push(x);
  }
  return rez.sort((a, b) => a.d - b.d);
}

export type JudecataPunct = { readonly v: 'ok' | 'partea' | 'capac' | 'pe-perete'; readonly beta?: number };

/** Partea unui punct față de un picior (antetul: interior, vârf interior, capăt al căii); `tolN` = toleranța normalei. */
function judecaPicior(j: PereteJ, p: Pt, x: Picior, tolN: number): JudecataPunct {
  const v = pt(p.x - x.f.x, p.y - x.f.y);
  if (Math.hypot(v.x, v.y) < 1e-9) return { v: 'pe-perete' };
  const parte = (t: Pt): number => j.semn * cross(t, v);
  if (x.loc === 'interior') return { v: parte(x.t!) > 0 ? 'ok' : 'partea' };
  const capatCaii = (x.loc === 'start' && x.k === 0) || (x.loc === 'capat' && x.k === j.n - 1);
  if (capatCaii) {
    const q = j.idx.prims[x.k]!;
    const tE = x.loc === 'start' ? tangentaStart(q) : tangentaCapat(q);
    const afara = x.loc === 'start' ? pt(-tE.x, -tE.y) : tE;
    const beta = v.x * afara.x + v.y * afara.y;
    if (beta > tolN) return { v: 'capac', beta };
    return { v: parte(tE) > 0 ? 'ok' : 'partea', beta };
  }
  // Vârf interior: tangenta care intră și cea care iese.
  const kIn = x.loc === 'start' ? x.k - 1 : x.k, kOut = x.loc === 'start' ? x.k : x.k + 1;
  const tIn = tangentaCapat(j.idx.prims[kIn]!), tOut = tangentaStart(j.idx.prims[kOut]!);
  return { v: parte(tIn) > 0 || parte(tOut) > 0 ? 'ok' : 'partea' };
}

/** Partea punctului p față de un singur picior (fără egalitate): doar pentru probe. */
export const judecaFataDe = (j: PereteJ, p: Pt, x: Picior): JudecataPunct => judecaPicior(j, p, x, tolII(j.cuCubice));

/**
 * Partea punctului p față de propriul perete (antetul): corect dacă e corect față de unul dintre picioarele egale. Pe
 * normala unui capăt, toleranța e `tolII` al peretelui (capetele lui 14 (ii) stau pe normale la atât).
 */
export function judecaPunct(j: PereteJ, p: Pt, R?: number): JudecataPunct & { readonly picioare: readonly Picior[] } {
  const tolN = tolII(j.cuCubice);
  const ps = picioare(j, p, TOL_EGALITATE, R);
  if (ps.length === 0) return { v: 'ok', picioare: ps };
  let prima: JudecataPunct | null = null;
  for (const x of ps) {
    const r = judecaPicior(j, p, x, tolN);
    if (r.v === 'ok') return { ...r, picioare: ps };
    prima ??= r;
  }
  return { ...prima!, picioare: ps };
}

// ---------------------------------------------------------------------------------------------------------------
// Invarianta 2: distanța la pereți.

export type IncalcarePerete = { readonly patrundere: number; readonly la: Pt; readonly perete: string };

/**
 * Discul sculei (centrul pe primitiva `prim`) stă la cel puțin `T` de toți pereții (eșantionare cu pași de „sferă”, ca
 * `verificaMutarea` din `regiune.ts`: din punctul cu distanța d ≥ T, următorul e la max(d − T, PAS_MIN); toleranța
 * declarată e aceeași, PAS_MIN / 2). Întoarce cea mai adâncă încălcare găsită (sau null).
 */
export function verificaPeretii(pereti: readonly Perete[] | undefined, prim: Primitiva, R: number, T: number): IncalcarePerete | null {
  if (!pereti || pereti.length === 0) return null;
  const filtru = Math.max(T, PAS_MIN);
  const cutieM = cutiePrimitiva(prim);
  const aproape: Array<{ readonly idx: Index; readonly id: string }> = [];
  for (const w of pereti) {
    if (distantaCutii(cutieM, w.contur.cutie) >= filtru) continue;
    aproape.push({ idx: indexDePerete(w), id: w.idLume });
  }
  if (aproape.length === 0) return null;
  const L = lungime(prim);
  let rau: IncalcarePerete | null = null;
  for (let s = 0; ; ) {
    const p = punctLa(prim, s);
    let d = Infinity, cine = '';
    for (const a of aproape) {
      const x = a.idx.distanta(p, R);
      if (x < d) { d = x; cine = a.id; }
    }
    if (d < T && (!rau || R - d > rau.patrundere)) rau = { patrundere: R - d, la: p, perete: cine };
    if (s >= L) break;
    s = Math.min(L, s + (d < T ? PAS_INCALCARE : Math.max(d - T, PAS_MIN)));
  }
  return rau;
}

const indexuri = new WeakMap<Perete, Index>();
function indexDePerete(w: Perete): Index {
  let x = indexuri.get(w);
  if (!x) { x = pregateste(w)?.idx ?? indexeaza(w.contur.primitive.filter((q) => q.tip !== 'punct')); indexuri.set(w, x); }
  return x;
}

// ---------------------------------------------------------------------------------------------------------------
// Offsetul deschis ideal (§5, „Ce verifică oracolul”): bucățile lui și porțiunile valide.

/** O piesă a offsetului ideal, parcursă cu viteza 1: s în [0, L]. */
export type PiesaIdeala = { readonly L: number; readonly la: (s: number) => Pt; readonly unde: string };

/** Piesele offsetului ideal la R pe partea sculei: fiecare primitivă (decalată) și evantaiele colțurilor convexe. */
export function idealul(j: PereteJ, R: number): PiesaIdeala[] {
  const rez: PiesaIdeala[] = [];
  const ps = j.idx.prims;
  ps.forEach((q, k) => {
    if (k > 0) {
      // Evantaiul colțului dintre k − 1 și k, dacă e convex dinspre sculă.
      const tIn = tangentaCapat(ps[k - 1]!), tOut = tangentaStart(q);
      const phi = Math.atan2(cross(tIn, tOut), tIn.x * tOut.x + tIn.y * tOut.y);
      const v = q.tip === 'segment' ? q.a : q.tip === 'arc' ? capeteArc(q)[0] : q.p;
      let delta = 0;
      if (Math.abs(phi) >= Math.PI - 1e-9) delta = -j.semn * Math.PI; // ALEGERE: întoarcerea pe loc (refuzată de aplicație)
      else if (j.semn * phi < 0 && Math.abs(phi) > 1e-12) delta = phi;
      if (delta !== 0) {
        const nIn = normalaSculei(j, tIn);
        const a0 = Math.atan2(nIn.y, nIn.x), sg = Math.sign(delta);
        rez.push({ L: R * Math.abs(delta), la: (s) => { const u = e(a0 + (sg * s) / R); return pt(v.x + R * u.x, v.y + R * u.y); }, unde: `evantaiul vârfului ${k}` });
      }
    }
    if (q.tip === 'segment') {
      const t = tangentaStart(q), n = normalaSculei(j, t), L = dist(q.a, q.b);
      rez.push({ L, la: (s) => pt(q.a.x + t.x * s + R * n.x, q.a.y + t.y * s + R * n.y), unde: `primitiva ${k}` });
    } else if (q.tip === 'arc') {
      const sg = Math.sign(q.du);
      const r2 = q.r - j.semn * sg * R;
      const a = Math.abs(r2);
      if (a <= 1e-12) rez.push({ L: 0, la: () => q.c, unde: `primitiva ${k} (centrul)` });
      else rez.push({ L: a * Math.abs(q.du), la: (s) => { const u = e(q.u0 + (sg * s) / a); return pt(q.c.x + r2 * u.x, q.c.y + r2 * u.y); }, unde: `primitiva ${k}` });
    }
  });
  return rez;
}

/** O porțiune validă a unei piese ideale: [a, b]. */
export type Tronson = { readonly piesa: PiesaIdeala; readonly a: number; readonly b: number };

/** Capetele căii, cu punctul ideal de pe normala lor și validitatea lui. */
export type CapatIdeal = { readonly care: 'start' | 'final'; readonly E: Pt; readonly P: Pt; readonly valid: boolean };

export type Ideal = { readonly tronsoane: readonly Tronson[]; readonly capete: readonly CapatIdeal[] };

const ideale = new WeakMap<PereteJ, Map<number, Ideal>>();

/** Porțiunile valide ale offsetului ideal la R și capetele lui (antetul), o singură dată pe perete și rază. */
export function idealValid(j: PereteJ, R: number): Ideal {
  let m = ideale.get(j);
  if (!m) { m = new Map(); ideale.set(j, m); }
  const gata = m.get(R);
  if (gata) return gata;
  const valid = (p: Pt): boolean => j.idx.distanta(p, R) >= R - MARJA_VALID;
  const tronsoane: Tronson[] = [];
  for (const piesa of idealul(j, R)) {
    if (piesa.L === 0) { if (valid(piesa.la(0))) tronsoane.push({ piesa, a: 0, b: 0 }); continue; }
    const n = Math.max(1, Math.ceil(piesa.L / PAS_VALID));
    const s = (i: number): number => (piesa.L * i) / n;
    const margine = (lo: number, hi: number, vLo: boolean): number => {
      // Granița validității între lo și hi (vLo = validitatea în lo), prin înjumătățire.
      for (let k = 0; k < 60 && hi - lo > 1e-9; k++) {
        const mij = (lo + hi) / 2;
        if (valid(piesa.la(mij)) === vLo) lo = mij; else hi = mij;
      }
      return vLo ? lo : hi;
    };
    let v0 = valid(piesa.la(0));
    let start: number | null = v0 ? 0 : null;
    for (let i = 1; i <= n; i++) {
      const v1 = valid(piesa.la(s(i)));
      if (v0 && !v1) { tronsoane.push({ piesa, a: start!, b: margine(s(i - 1), s(i), true) }); start = null; }
      if (!v0 && v1) start = margine(s(i - 1), s(i), false);
      v0 = v1;
    }
    if (start !== null) tronsoane.push({ piesa, a: start, b: piesa.L });
  }
  const ps = j.idx.prims;
  const capete: CapatIdeal[] = [];
  if (ps.length) {
    const q0 = ps[0]!, qn = ps[ps.length - 1]!;
    const E0 = q0.tip === 'segment' ? q0.a : q0.tip === 'arc' ? capeteArc(q0)[0] : q0.p;
    const E1 = qn.tip === 'segment' ? qn.b : qn.tip === 'arc' ? capeteArc(qn)[1] : qn.p;
    const n0 = normalaSculei(j, tangentaStart(q0)), n1 = normalaSculei(j, tangentaCapat(qn));
    const P0 = pt(E0.x + R * n0.x, E0.y + R * n0.y), P1 = pt(E1.x + R * n1.x, E1.y + R * n1.y);
    capete.push({ care: 'start', E: E0, P: P0, valid: valid(P0) }, { care: 'final', E: E1, P: P1, valid: valid(P1) });
  }
  const rez = { tronsoane, capete };
  m.set(R, rez);
  return rez;
}

// ---------------------------------------------------------------------------------------------------------------
// Lanțurile și trecerile de sub etichetele pe o parte.

type MutareP = { readonly linia: number; readonly parti: readonly Primitiva[]; readonly zMin: number };
export type LantP = { readonly eticheta: number; readonly mutari: readonly MutareP[]; readonly adancime: number };

/**
 * Lanțurile de pe etichetele pe o parte valide, în ordinea programului: mișcările de tăiere consecutive (G1 / G2 / G3 cu o
 * parte sub fața de sus) ale aceleiași etichete; o mișcare care nu taie (G0, aer) sau o etichetă nouă îl rupe.
 */
export function lanturiPeOParte(
  evenimente: readonly Eveniment[], etichete: readonly EtichetaActiva[], parti: (m: Mutare) => Primitiva[], laDoc: (p: Punct3) => Punct3,
): LantP[] {
  const rez: Array<{ eticheta: number; mutari: MutareP[]; adancime: number }> = [];
  let iE = -1;
  let lant: { eticheta: number; mutari: MutareP[]; adancime: number } | null = null;
  for (const ev of evenimente) {
    if (ev.tip !== 'mutare') continue;
    const m = ev.m;
    while (iE + 1 < etichete.length && etichete[iE + 1]!.linia < m.linia) iE++;
    const p = m.cod === 0 ? [] : parti(m);
    const et = iE >= 0 ? etichete[iE]!.eticheta : null;
    if (p.length === 0 || et === null || !peOParte(et.latura)) { lant = null; continue; }
    if (lant === null || lant.eticheta !== iE) {
      lant = { eticheta: iE, mutari: [], adancime: 0 };
      rez.push(lant);
    }
    const zMin = Math.min(laDoc(m.b)[2], m.startCunoscut ? laDoc(m.a)[2] : Infinity);
    lant.mutari.push({ linia: m.linia, parti: p, zMin });
    lant.adancime = Math.max(lant.adancime, -zMin);
  }
  return rez;
}

/** Trecerile unei etichete: lanțurile ei consecutive la aceeași adâncime (±0,001). */
export function treceriDin(lanturi: readonly LantP[]): LantP[][] {
  const rez: LantP[][] = [];
  for (const l of lanturi) {
    const ultima = rez[rez.length - 1];
    if (ultima && ultima[0]!.eticheta === l.eticheta && Math.abs(ultima[0]!.adancime - l.adancime) <= TOL_Z_TRECERE) ultima.push(l);
    else rez.push([l]);
  }
  return rez;
}

const startLant = (l: LantP): Pt => { const q = l.mutari[0]!.parti[0]!; return q.tip === 'punct' ? q.p : punctLa(q, 0); };
const capatLant = (l: LantP): Pt => { const ps = l.mutari[l.mutari.length - 1]!.parti; const q = ps[ps.length - 1]!; return q.tip === 'punct' ? q.p : punctLa(q, lungime(q)); };

// ---------------------------------------------------------------------------------------------------------------
// Judecata.

/** Direcția de mers pe primitivă, la lungimea s (unitară; nulă pe un punct). */
function mersLa(q: Primitiva, s: number): Pt {
  if (q.tip === 'segment') return tangentaStart(q);
  if (q.tip === 'arc') return q.r > 0 ? tangentaLa(q, q.u0 + Math.sign(q.du) * (s / q.r)) : pt(0, 0);
  return pt(0, 0);
}

/** Eșantioanele unei primitive la cel mult `pas`, cu capetele. */
function esantioane(q: Primitiva, pas: number): number[] {
  if (q.tip === 'punct') return [0];
  const L = lungime(q);
  const n = Math.max(1, Math.ceil(L / pas));
  return Array.from({ length: n + 1 }, (_, k) => (L * k) / n);
}

/**
 * Tot ce aduc tăieturile pe o parte în poartă (antetul): 2 (K, pereții, partea), 9 (τ × v, buclele închise), 14 (ii). `R`
 * = raza frezei (contextul porții); `parti` = partea de sub fața de sus a unei mișcări, în document (`parteaDeTaiere`).
 */
export function verificaPeOParte(
  evenimente: readonly Eveniment[], etichete: readonly EtichetaActiva[], reg: Regiune, parti: (m: Mutare) => Primitiva[],
  laDoc: (p: Punct3) => Punct3, R: number,
): IncalcareParte[] {
  const rez: IncalcareParte[] = [];
  // §6: „dacă freza nu încape nicăieri, exportul e refuzat”: un perete fără niciun punct ideal valid (ALEGERE: refuzul
  // luat ca încălcare, pe document, linia 0, ca refuzurile de la §9).
  for (const w of reg.pereti ?? []) {
    const j = pregateste(w);
    if (j && idealValid(j, R).tronsoane.length === 0) {
      rez.push({ invarianta: 14, linia: 0, mesaj: `pe o parte (§6): scula nu încape nicăieri pe partea cerută a lui ${w.idLume} (${w.parte} în lume, R = ${mm(R)}): exportul trebuia refuzat („scula nu încape pe partea cerută”)` });
    }
  }
  if (!etichete.some((x) => peOParte(x.eticheta?.latura))) return rez;
  const pereti = new Map((reg.pereti ?? []).map((w) => [w.idLume, w]));
  const T2 = prag(R, TOL_POST_P);
  const sensuri = sensurileEtichetelor(etichete, reg);
  const lanturi = lanturiPeOParte(evenimente, etichete, parti, laDoc);
  /** Liniile cu o încălcare a părții (2) sau a lui 14 (ii) înainte: excepția buclei închise (9) nu le iartă. */
  const rele = new Set<number>();
  const cine = (et: Eticheta): string => `${et.idLume} (${et.latura})`;

  for (const l of lanturi) {
    const et = etichete[l.eticheta]!.eticheta!;
    const w = pereti.get(et.idLume);
    const j = w ? pregateste(w) : null;
    const T14 = j ? tolII(j.cuCubice) : 0;
    const s = sensuri[l.eticheta];
    // 9: semnul așteptat al lui τ × v, din modelul așchiei: materialul păstrat e în −v (dincolo de perete).
    const asteptat = s && 'sens' in s ? (parteaPastrataPrinAschie(s.sens) === 'dreapta' ? 1 : -1) : null;
    let rau9: { linia: number; la: Pt; semn: number } | null = null;
    for (const mp of l.mutari) {
      // 2: K (fără parte proprie) și pereții.
      let rauK: IncalcareMutare | null = null;
      let rauP: IncalcarePerete | null = null;
      for (const q of mp.parti) {
        const x = verificaMutarea(reg, -1, q, R, T2);
        if (x && (!rauK || x.patrundere > rauK.patrundere)) rauK = x;
        const y = verificaPeretii(reg.pereti, q, R, T2);
        if (y && (!rauP || y.patrundere > rauP.patrundere)) rauP = y;
      }
      if (rauK) {
        rez.push({ invarianta: 2, linia: mp.linia, mesaj: `regiunea păstrată: tăietura lui ${et.idLume} intră în ${rauK.in} (cu ${mm(rauK.patrundere)} mm, lângă X ${mm(rauK.la.x)}, Y ${mm(rauK.la.y)})` });
      }
      if (rauP) {
        const al = rauP.perete === et.idLume ? 'propriul perete' : `peretele lui ${rauP.perete}`;
        rez.push({ invarianta: 2, linia: mp.linia, mesaj: `regiunea păstrată: tăietura lui ${et.idLume} atinge ${al} (cu ${mm(rauP.patrundere)} mm, lângă X ${mm(rauP.la.x)}, Y ${mm(rauP.la.y)})` });
      }
      // Fără perete propriu (o cale închisă, sau stânga și dreapta pe același element): refuzul §9 e în `deschise.ts`.
      if (!j) continue;
      // 2: partea față de propriul perete, fără capac; 9: τ × v.
      let partea: Pt | null = null;
      let capac: { readonly beta: number; readonly la: Pt } | null = null;
      for (const q of mp.parti) {
        for (const sx of esantioane(q, PAS_PARTE)) {
          const p = punctLa(q, sx);
          const r = judecaPunct(j, p, R);
          if (r.v === 'capac') { if (!capac || r.beta! > capac.beta) capac = { beta: r.beta!, la: p }; }
          else if (r.v !== 'ok') partea ??= p;
          if (asteptat === null || rau9 !== null || q.tip === 'punct' || lungime(q) < LUNGIME_MINIMA_SENS) continue;
          // 9: piciorul unic, în interiorul unei primitive.
          const ps = r.picioare;
          if (ps.length !== 1 || ps[0]!.loc !== 'interior') continue;
          const tau = mersLa(q, sx);
          const v = pt(p.x - ps[0]!.f.x, p.y - ps[0]!.f.y);
          const c = cross(tau, v);
          if (Math.abs(c) <= TOL_SENS) continue;
          if (Math.sign(c) !== asteptat) rau9 = { linia: mp.linia, la: p, semn: Math.sign(c) };
        }
      }
      if (partea) {
        rele.add(mp.linia);
        rez.push({ invarianta: 2, linia: mp.linia, mesaj: `regiunea păstrată: tăietura lui ${cine(et)} trece pe partea păstrată a peretelui ei (scula pe ${j.perete.parte} în lume, lângă X ${mm(partea.x)}, Y ${mm(partea.y)})` });
      }
      if (capac) {
        rele.add(mp.linia);
        rez.push({ invarianta: 2, linia: mp.linia, mesaj: `regiunea păstrată: tăietura lui ${cine(et)} ocolește capătul peretelui ei: trece cu ${mm(capac.beta)} mm de normala capătului (lângă X ${mm(capac.la.x)}, Y ${mm(capac.la.y)})` });
      }
      // 14 (ii), înainte: fiecare mișcare stă la R de perete (supremul rafinat).
      const laR = (p: Pt): number => Math.abs(j.idx.distanta(p, R) - R);
      let rau14: Depasire | null = null;
      for (const q of mp.parti) {
        const x = supremul(q, laR, T14);
        if (x && (!rau14 || x.d > rau14.d)) rau14 = x;
      }
      if (rau14) {
        rele.add(mp.linia);
        rez.push({ invarianta: 14, linia: mp.linia, mesaj: `pe o parte (14 ii): mișcarea lui ${cine(et)} iese de pe offsetul ideal: punctul ${pct(rau14.la)} e la ${mm(j.idx.distanta(rau14.la, R))} mm de perete, nu la R = ${mm(R)} (toleranța ${T14.toFixed(4)})` });
      }
    }
    if (rau9 && s && 'sens' in s) {
      // τ × v > 0: v (de la perete la sculă) e în stânga mersului, deci materialul păstrat (în −v) e în dreapta.
      const pastrat = rau9.semn > 0 ? 'dreapta' : 'stanga';
      rez.push({
        invarianta: 9, linia: rau9.linia,
        mesaj: `sensul de tăiere (pe o parte): ${cine(et)}, ${s.sens}: lângă ${pct(rau9.la)}, τ × v ${rau9.semn > 0 ? '>' : '<'} 0, deci materialul păstrat e în ${pastrat} mersului; modelul așchiei cere ${parteaPastrataPrinAschie(s.sens)} pentru ${s.sens}`,
      });
    }
  }

  // 14 (ii): o etichetă pe o parte fără nicio mișcare de tăiere, deși offsetul ideal are porțiuni valide (ieșirea goală
  // luată drept „nu încape”, §5).
  etichete.forEach((x, i) => {
    const et = x.eticheta;
    if (!et || !peOParte(et.latura) || lanturi.some((l) => l.eticheta === i)) return;
    const w = pereti.get(et.idLume);
    const j = w ? pregateste(w) : null;
    if (j && idealValid(j, R).tronsoane.length > 0) {
      rez.push({ invarianta: 14, linia: x.linia, mesaj: `pe o parte (14 ii): eticheta lui ${cine(et)} n-are nicio mișcare de tăiere, dar offsetul ideal are porțiuni valide (peretele nu e tăiat)` });
    }
  });

  // 14 (ii), pe fiecare trecere: acoperirea, capetele, atingerile.
  for (const tr of treceriDin(lanturi)) {
    const et = etichete[tr[0]!.eticheta]!.eticheta!;
    const w = pereti.get(et.idLume);
    const j = w ? pregateste(w) : null;
    if (!j) continue;
    const T14 = tolII(j.cuCubice);
    const id = idealValid(j, R);
    const linii = `liniile ${tr[0]!.mutari[0]!.linia}–${tr[tr.length - 1]!.mutari[tr[tr.length - 1]!.mutari.length - 1]!.linia}`;
    const unde = `trecerea lui ${cine(et)} la ${mm(tr[0]!.adancime)} mm (${linii})`;
    const laTrecere = indexeaza(tr.flatMap((l) => l.mutari.flatMap((m) => m.parti)));
    const D = (p: Pt): number => laTrecere.distanta(p, T14);
    let rau: (Depasire & { readonly unde: string }) | null = null;
    for (const t of id.tronsoane) {
      const x = t.a === t.b ? (D(t.piesa.la(t.a)) > T14 ? { d: D(t.piesa.la(t.a)), la: t.piesa.la(t.a) } : null) : supremulCurba(t.piesa.la, t.a, t.b, D, T14);
      if (x && (!rau || x.d > rau.d)) rau = { ...x, unde: t.piesa.unde };
    }
    const liniaEt = etichete[tr[0]!.eticheta]!.linia;
    if (rau) {
      rez.push({ invarianta: 14, linia: liniaEt, mesaj: `pe o parte (14 ii): ${unde} nu acoperă offsetul ideal: punctul ideal valid ${pct(rau.la)} (${rau.unde}) e la ${mm(rau.d)} mm de ea (toleranța ${T14.toFixed(4)})` });
    }
    const capete = tr.flatMap((l) => [startLant(l), capatLant(l)]);
    for (const c of id.capete) {
      if (!c.valid) continue;
      const cel = Math.min(...capete.map((p) => dist(p, c.P)));
      if (cel > T14) {
        rez.push({ invarianta: 14, linia: liniaEt, mesaj: `pe o parte (14 ii): ${unde} n-are niciun capăt pe normala capătului de ${c.care} al căii (punctul ideal ${pct(c.P)}; cel mai apropiat capăt de lanț e la ${mm(cel)} mm)` });
      }
    }
    if (tr.length > 1) {
      const indecsi = tr.map((l) => indexeaza(l.mutari.flatMap((m) => m.parti)));
      tr.forEach((l, a) => {
        for (const p of [startLant(l), capatLant(l)]) {
          const b = indecsi.findIndex((x, k) => k !== a && x.distanta(p, TOL_ATINGERE) <= TOL_ATINGERE);
          if (b >= 0) {
            rez.push({ invarianta: 14, linia: l.mutari[0]!.linia, mesaj: `pe o parte (14 ii): în ${unde}, bucata care începe la linia ${l.mutari[0]!.linia} atinge bucata care începe la linia ${tr[b]!.mutari[0]!.linia} în ${pct(p)} (§5: bucățile nu se ating)` });
            break;
          }
        }
      });
    }
  }

  // 9: o buclă închisă sub o etichetă pe o parte (cu excepția bucății care se închide pe ea însăși, antetul).
  for (const b of buclele(evenimente, etichete.map((x) => x.linia), laDoc)) {
    if (b.eticheta < 0 || !b.inchisa || Math.abs(b.arie) <= ARIE_MINIMA) continue;
    const et = etichete[b.eticheta]!.eticheta;
    if (!et || !peOParte(et.latura)) continue;
    const l = lanturi.find((x) => x.eticheta === b.eticheta && x.mutari.some((m) => m.linia === b.linii[0]));
    const plane = l ? l.mutari.filter((m) => m.parti.some((q) => q.tip !== 'punct')) : [];
    const intreaga = !!l && plane.length > 0 && plane[0]!.linia === b.linii[0] && l.mutari[l.mutari.length - 1]!.linia === b.linii[1];
    const curata = !!l && l.mutari.every((m) => !rele.has(m.linia));
    const arePerete = !!pereti.get(et.idLume) && !!pregateste(pereti.get(et.idLume)!);
    if (intreaga && curata && arePerete) continue;
    rez.push({
      invarianta: 9, linia: b.linii[0],
      mesaj: `sensul de tăiere (pe o parte): sub eticheta deschisă a lui ${cine(et)}, o buclă închisă (liniile ${b.linii[0]}–${b.linii[1]}, aria ${b.arie.toFixed(3)} mm²): pe o cale deschisă, o trecere merge de la un capăt la celălalt (§13)`,
    });
  }
  return rez;
}

/** Partea sculei în lume a peretelui unei etichete (pentru raport și teste); `null` fără perete sau cu ambele părți. */
export function parteaPeretelui(reg: Regiune, idLume: string): ParteO | null {
  return reg.pereti?.find((w) => w.idLume === idLume)?.parte ?? null;
}
