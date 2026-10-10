/**
 * ORACOLUL intrărilor și ieșirilor (ADR 0030, felia 2.5b), cu ZERO importuri din `src/`. Scris doar din textul ADR
 * 0030 (plus ADR 0026 pentru regiunea păstrată și verificarea exactă a discului, ADR 0027 pentru partea păstrată, prin
 * `sens.ts`, ADR 0028 / 0029 pentru urechi, rampă și lanțuri, prin `urechi.ts` și `rampa.ts`), de o sesiune
 * independentă de cea care a scris aplicația. Două metode, care se verifică una pe alta:
 *
 * A. POARTA (`verificaIntrari`, cu documentul în context, ca 2, 9, 10 și 11):
 *    - INVARIANTA 12 (nouă). Pe o operație cu intrări, fiecare buclă: fie are la FIECARE trecere intrarea și ieșirea de
 *      la §2 (sferturi ale aceluiași cerc, de rază ρ ∈ {raza, raza/2}, cu centrul C = p₀ + ρ·n, n normala spre deșeu,
 *      intrarea sosind în p₀ pe direcția t₀, ieșirea plecând din p₀ pe t₀), cu același p₀, A și ρ la toate trecerile,
 *      iar p₀ e un candidat de la §3; fie n-are nicio intrare și nicio ieșire, și atunci niciun candidat nu încape
 *      (verificarea mea exactă, mai jos). Pe o operație fără intrări, nicio buclă n-are intrare sau ieșire. Refuzurile
 *      de la §6 (intrări pe `pe-linie`, cu rampă, raza < 0,5) sunt încălcări pe linia etichetei: programul nu trebuia
 *      să existe;
 *    - INVARIANTA 11 AMENDATĂ (§7), pe operațiile cu intrări (`rampa.ts` nu le mai judecă forma): o trecere cu intrări
 *      plonjează pe verticală, din aer, în A, în afara buclei (ALEGERE: A ≠ p₀; A poate cădea pe latura opusă a buclei
 *      când ρ e chiar înălțimea ei, iar acolo semicercul încape, deci „în afara buclei” = nu în punctul de intrare);
 *      urmează intrarea, bucla închisă, ieșirea și ridicarea
 *      (lanțul se termină); nicio altă coborâre pe verticală; fiecare trecere plonjează în același A și intră pe buclă
 *      în același p₀. O buclă fără intrări (omise) are forma de la ADR 0029 §4 (`formaFaraRampa`).
 *    - INVARIANTA 9 AMENDATĂ: `esteIntrareSauIesire` e regula porțiunii deschise de la începutul și de la sfârșitul unei
 *      treceri, dată lui `verificaSensul` de poartă (sens.ts rămâne fără importul acestui fișier).
 * B. HÂRTIA (`masoaraIntrari`): un cititor separat al programului (fără etichete, `parcurgeriHartie`), care măsoară pe
 *    fiecare trecere A, p₀, C, ρ, partea intrării (stânga / dreapta sensului de mers), unghiurile intrării și ieșirii și,
 *    cu regiunea, distanța minimă a discului frezei pe intrare și pe ieșire până la marginea regiunii păstrate (jocul =
 *    distanța centrului − R; negativ = mușcă). Valorile așteptate vin din geometria de pe hârtie (`intrari.cazuri.ts`),
 *    niciodată din program.
 *
 * DERIVAREA PĂRȚII (nu e copiată din ADR): partea deșeului e opusă părții păstrate, iar aceea se DERIVĂ din grosimea
 * așchiei (`parteaPastrataPrinAschie` din `sens.ts`: urcarea = dintele intră gros și iese subțire). n = rot(+90°)·t₀
 * dacă deșeul e în stânga, rot(−90°)·t₀ dacă e în dreapta. Sensul arcului e trigonometric pentru deșeul din stânga:
 * mersul trigonometric în jurul lui C = p₀ + ρ·rot(+90°)·t₀ are în p₀ viteza rot(+90°)·(−n) = t₀ (verificat pe hârtie
 * în teste), deci contractul și derivarea spun același lucru.
 *
 * DEFINIȚIILE și ALEGERILE mele pe textul G-code (marcate „ALEGERE”):
 * - TRECEREA = lanțul din `rampa.ts` (mișcările G1/G2/G3 consecutive, sub aceeași etichetă, care se termină sub fața de
 *   sus). Mișcările ei care nu sunt pe verticală se taie ca la invarianta 9: prima întoarcere a capătului unei mișcări
 *   la cel mult 0,002 mm de startul unei mișcări de dinainte (cel mai devreme), după cel puțin 0,01 mm, închide bucla;
 *   ce e înaintea ei e INTRAREA, ce e după ea e IEȘIREA. p₀ = startul buclei; A = punctul plonjării (startul lanțului);
 * - un arc citit = una sau mai multe mișcări G2/G3 consecutive cu același centru și aceeași rază (±TOL_GEOM) și același
 *   sens: unghiul lor se adună (ALEGERE: postul poate împărți un arc; un sfert rămâne un sfert);
 * - t₀ = direcția primei mișcări a buclei în p₀ (dreapta: din capetele ei; arcul: perpendiculara pe rază, după sensul
 *   lui). Eroarea ei din rotunjire, δ = 0,0015 / L (dreapta de lungime L) sau 0,0015 / r (arcul), intră în toleranța
 *   unghiului;
 * - CANDIDAȚII de la §3, în poartă, pe bucla ANALITICĂ (`drumIdeal` al inelului, offsetul exact, din document): p₀ e un
 *   candidat dacă e la cel mult TOL_CANDIDAT de o joncțiune a primitivelor ei (ALEGERE: vârful 0 al aplicației e o
 *   joncțiune; în lipire se verifică pe programele fără intrări), de mijlocul uneia dintre cele mai lungi 12 primitive
 *   (la egalitate la locul 12 intră toate), sau oriunde pe o buclă care e un singur cerc închis (vârful 0 al unui cerc
 *   nu e în contract). „Segmentele” buclei sunt primitivele ei, drepte și arce (§4 taie „un arc în două arce”);
 * - NICIUN CANDIDAT NU ÎNCAPE (bucla fără intrări): vârful 0 = startul buclei din program, adus pe bucla analitică (cea
 *   mai apropiată joncțiune, la cel mult TOL_CANDIDAT, cu tangenta primitivei care pleacă din ea; altfel proiecția);
 *   mijloacele celor mai lungi 12 primitive analitice. ALEGERE: pe un cerc închis se încearcă doar vârful 0 (împărțirea
 *   cercului în segmente nu e în contract; fără vecini, toate punctele cercului sunt echivalente). Un candidat care
 *   încape CLAR (distanța ≥ prag(R) + TOL_INCAPE și în afara lui K ∪ S(C)) e o încălcare;
 * - VERIFICAREA EXACTĂ (§3, ADR 0026 §6): semicercul e un arc (primitivă) de 180° în jurul lui C, cu p₀ la mijloc;
 *   distanța lui EXACTĂ (`distantaListe`: segment–arc, arc–arc cu formule închise) până la inelele care mărginesc
 *   K ∪ S(C) (piesele, inelele cu părinte piesă și inelul tăieturii), plus apartenența unui punct (constantă pe arc dacă
 *   distanța e > 0). Încape ⇔ în afară și distanța ≥ prag(R) = max(R − ε, 1e-6), ε = 0,005;
 * - ALEGERE: o etichetă repetată (aceeași tăietură la altă trecere) se leagă de operație ca la 9–11 (`rampa.ts`, pe
 *   tuplul urechi, rampă, intrări); trecerile se grupează pe tăietură (elementul, latura, adâncimea, parametrii).
 *
 * TOLERANȚELE (cotele rotunjite la 3 zecimale; aplicația socotește pe geometria exactă):
 * - TOL_GEOM = 0,003 mm: raza și centrul unui arc citit (startul ±0,0007, I / J ±0,0005, raza din I / J ±0,0014),
 *   capetele (±0,0007 fiecare);
 * - unghiul: TOL_GEOM / ρ + δ(t₀) + 1e-4 rad (normala măsurată față de cea cerută; sfertul față de π/2);
 * - TOL_CANDIDAT = 0,005 mm (p₀ citit ±0,0007 față de joncțiunea sau mijlocul analitic, cu marjă);
 * - TOL_INCAPE = 0,002 mm: banda în jurul pragului în care „încape” și „nu încape” sunt amândouă acceptate (p₀ și t₀
 *   aduse pe bucla analitică se mută cu cel mult ~0,001); acuzația „omisă deși încape” cere distanța ≥ prag + 0,002;
 * - TOL_ACELASI = 0,002 mm: același A și același p₀ la toate trecerile (aceleași numere, rotunjite la fel).
 *
 * PRECIZAREA DIN 10.10 (ADR 0030 §3 amendat după recenzie; aceeași sesiune independentă): un semicerc ÎNCAPE doar dacă
 * îndeplinește toate trei condițiile, iar invarianta 12 cere acum și ca intrarea ALEASĂ să încapă (nu doar ca p₀ să fie
 * un candidat); „niciun candidat nu încape” folosește aceleași trei condiții:
 * - a. regiunea păstrată (ca mai sus);
 * - b. foaia: pe fiecare latură (stânga, dreapta, jos, sus), ieșirea cutiei discului pe semicerc nu trece de ieșirea
 *   cutiei discului pe buclă; ieșirea = max(0, cât trece discul de latură), cu pragul de rezoluție 0,0005 (sub el, 0).
 *   Cutia semicercului e EXACTĂ (capetele și punctele cardinale din arc); cutia buclei, pe bucla analitică. Foaia e
 *   [0, lățime] × [0, înălțime] în coordonatele documentului (contextul porții). Banda: o depășire ≤ TOL_INCAPE e „la
 *   limită” (oricare);
 * - c. urechile altor bucle: distanța EXACTĂ de la semicerc la traseul fiecărei alte bucle cu urechi de pe foaia 0
 *   (bucla analitică a oricărei operații cu urechi: offsetul pe exterior / interior, conturul pe `pe-linie`), în afară
 *   de bucla însăși, e cel puțin D + 1 mm (`MARJA_SCHELET`), cu banda ±TOL_INCAPE. „Altă buclă” = a altei TĂIETURI
 *   (ADR 0025: un element în două operații dă două tăieturi): degroșarea cu urechi pe același contur e o altă buclă
 *   pentru finisare (și o atinge în p₀, deci nicio intrare a finisării nu încape). Se sare o singură buclă cu același
 *   element și aceeași latură, și doar dacă operația judecată are ea însăși urechi;
 * - ordinea candidaților: lungimile care diferă cu cel mult 1e-6 mm sunt egale, iar atunci indicele mai mic (în sensul
 *   de mers, din vârful 0) e întâi.
 */
import type { IntrariO, LaturaO, SensO } from './document.ts';
import type { Punct3, Eveniment } from './gcode.ts';
import {
  arc as arcP, capeteArc, celMaiMic, cutieLista, distantaListe, inParteaProprie, inUnghi, lungime as lungimeP, prag, pt, punctLa,
  segment as segmentP, type Arc, type Cutie, type Primitiva, type Regiune,
} from './regiune.ts';
import {
  LUNGIME_MINIMA, parteaPastrataPrinAschie, sensurileEtichetelor, TOL_INCHIDERE, TOL_SUB,
  type Bucla, type EtichetaActiva, type P2, type Parte, type Pas,
} from './sens.ts';
import { formaFaraRampa, lanturile, parametriiEtichetelor, parcurgeriHartie, type Lant, type PasL } from './rampa.ts';

export const RAZA_MINIMA = 0.5;
export const TOL_GEOM = 0.003;
export const TOL_UNGHI_FIX = 1e-4;
export const TOL_CANDIDAT = 0.005;
export const TOL_INCAPE = 0.002;
export const TOL_ACELASI = 0.002;
/** §3: câte segmente (cele mai lungi) dau candidați. */
export const CANDIDATI_SEGMENTE = 12;
/** §3 c (precizarea din 10.10): între semicerc și traseul unei alte bucle cu urechi, cel puțin D + atât (mm). */
export const MARJA_SCHELET = 1;
/** §3 b: pragul de rezoluție al ieșirii din foaie (mm). */
export const PRAG_IESIRE = 0.0005;
/** §3: lungimile care diferă cu cel mult atât (mm) sunt egale. */
export const LUNGIMI_EGALE = 1e-6;

const mm = (v: number): string => v.toFixed(3);
const dist = (p: P2, q: P2): number => Math.hypot(p.x - q.x, p.y - q.y);
export const rot90 = (v: P2): P2 => ({ x: -v.y, y: v.x });
export const rotM90 = (v: P2): P2 => ({ x: v.y, y: -v.x });
const unit = (v: P2): P2 => {
  const L = Math.hypot(v.x, v.y);
  return L > 0 ? { x: v.x / L, y: v.y / L } : { x: 0, y: 0 };
};
const unghiIntre = (u: P2, v: P2): number => Math.acos(Math.max(-1, Math.min(1, u.x * v.x + u.y * v.y)));

// ---------------------------------------------------------------------------------------------------------------
// Fizica: partea deșeului, derivată.

/** Partea (față de sensul de mers) în care e deșeul: opusă celei păstrate, derivată din așchie (`sens.ts`). */
export function parteDeseu(sens: SensO): Parte {
  return parteaPastrataPrinAschie(sens) === 'stanga' ? 'dreapta' : 'stanga';
}

/** n, normala unitară spre deșeu, pentru direcția de mers t₀. */
export function normalaDeseu(t0: P2, parte: Parte): P2 {
  return parte === 'stanga' ? rot90(t0) : rotM90(t0);
}

/** Semnul sensului arcelor de intrare: +1 trigonometric (deșeul în stânga), −1 orar. */
export const semnArc = (parte: Parte): 1 | -1 => (parte === 'stanga' ? 1 : -1);

/** Semicercul intrării în p₀ (§2): centrul, A, B și arcul de 180° prin p₀ (primitivă a regiunii). */
export function semicercul(p0: P2, t0: P2, parte: Parte, rho: number): { readonly C: P2; readonly A: P2; readonly B: P2; readonly arc: Arc; readonly n: P2 } {
  const n = normalaDeseu(unit(t0), parte);
  const C = { x: p0.x + rho * n.x, y: p0.y + rho * n.y };
  const s = semnArc(parte);
  const up = Math.atan2(p0.y - C.y, p0.x - C.x);
  const uA = up - (s * Math.PI) / 2, uB = up + (s * Math.PI) / 2;
  const A = { x: C.x + rho * Math.cos(uA), y: C.y + rho * Math.sin(uA) };
  const B = { x: C.x + rho * Math.cos(uB), y: C.y + rho * Math.sin(uB) };
  return { C, A, B, arc: arcP(pt(C.x, C.y), rho, uA, s * Math.PI), n };
}

// ---------------------------------------------------------------------------------------------------------------
// Verificarea exactă a discului (§3; ADR 0026 §6), proprie.

/** Inelele care contează pentru tăietura inelului i: marginile lui K și inelul însuși. */
function relevante(reg: Regiune, i: number): number[] {
  return reg.inele.flatMap((_, j) => (j === i || reg.margineK[j] ? [j] : []));
}

export type Loc = { readonly d: number; readonly inauntru: boolean; readonly joc: number; readonly cine: string };

/**
 * Cât de departe stă un drum de centre (primitive) de K ∪ S(C), pentru tăietura inelului i: distanța EXACTĂ până la
 * inelele relevante și apartenența unui punct (constantă dacă distanța e > 0). `joc` = distanța − R (negativ: discul
 * mușcă); înăuntru: −(R + d). `fara` = inelele lăsate deoparte (pentru jocul față de vecini).
 */
export function locul(reg: Regiune, i: number, drum: readonly Primitiva[], R: number, fara: ReadonlySet<number> = new Set()): Loc {
  let d = Infinity;
  let cine = '';
  for (const j of relevante(reg, i)) {
    if (fara.has(j)) continue;
    const x = distantaListe(drum, reg.inele[j]!.contur.primitive);
    if (x < d) { d = x; cine = reg.inele[j]!.idLume; }
  }
  let inauntru = false;
  if (d > 0 && drum.length) {
    const p = punctLa(drum[0]!, 0);
    const k = celMaiMic(reg, p);
    if (k >= 0 && reg.inele[k]!.rol === 'piesa' && !fara.has(k)) { inauntru = true; cine = reg.inele[k]!.idLume; }
    else if (!fara.has(i) && inParteaProprie(reg, i, p)) { inauntru = true; cine = reg.inele[i]!.idLume; }
  }
  return { d, inauntru, joc: inauntru ? -(R + d) : d - R, cine };
}

/** §3: semicercul încape (exact): în afara lui K ∪ S(C) și la cel puțin prag(R). 'banda': la ±TOL_INCAPE de prag. */
export function incape(reg: Regiune, i: number, semicerc: Arc, R: number): 'da' | 'nu' | 'banda' {
  const x = locul(reg, i, [semicerc], R);
  if (x.inauntru) return 'nu';
  const P = prag(R);
  if (x.d >= P + TOL_INCAPE) return 'da';
  if (x.d < P - TOL_INCAPE) return 'nu';
  return 'banda';
}

export type Verdict = 'da' | 'nu' | 'banda';

/** Lumea condițiilor b și c: foaia (în document), diametrul frezei și traseele buclelor cu urechi (una pe tăietură). */
export type Lumea = {
  readonly W: number; readonly H: number; readonly D: number;
  readonly urechite: ReadonlyArray<{ readonly id: string; readonly latura: LaturaO; readonly drum: readonly Primitiva[] }>;
};

/** Traseele buclelor cu urechi de pe foaia 0: câte unul pe fiecare operație cu urechi ≠ null (pe tăietură). */
export function lumea(reg: Regiune, foaie: { readonly latime: number; readonly inaltime: number }, D: number): Lumea {
  const urechite: Array<{ id: string; latura: LaturaO; drum: readonly Primitiva[] }> = [];
  for (const [id, t] of reg.taieturi) {
    if (!t.urechi) continue;
    for (const [latura, lista] of t.urechi) {
      const cate = lista.filter((u) => u !== null).length;
      if (cate === 0 || !t.contur) continue;
      const drum = latura === 'pe-linie' ? t.contur.primitive : t.contur.drumIdeal(D / 2, latura);
      if (!drum) continue;
      for (let k = 0; k < cate; k++) urechite.push({ id, latura, drum: drum.filter((q) => q.tip !== 'punct') });
    }
  }
  return { W: foaie.latime, H: foaie.inaltime, D, urechite };
}

/** Cutia exactă a unui arc (capetele și punctele cardinale din el). */
export function cutieArc(a: Arc): Cutie {
  const [p, q] = capeteArc(a);
  const xs = [p.x, q.x], ys = [p.y, q.y];
  for (let k = 0; k < 4; k++) {
    const u = (k * Math.PI) / 2;
    if (inUnghi(a, u)) { xs.push(a.c.x + a.r * Math.cos(u)); ys.push(a.c.y + a.r * Math.sin(u)); }
  }
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

/** Ieșirea cutiei discului (centrul în cutia c) din foaie, pe fiecare latură, cu pragul de rezoluție. */
export function iesirea(c: Cutie, R: number, W: number, H: number): readonly [number, number, number, number] {
  const p = (v: number): number => (v > PRAG_IESIRE ? v : 0);
  return [p(R - c.minX), p(c.maxX + R - W), p(R - c.minY), p(c.maxY + R - H)];
}

/**
 * §3 cu precizarea din 10.10: semicercul încape pe toate trei condițiile. `bucla` = bucla analitică a tăieturii (b),
 * `id`, `latura` și `cuUrechi` = tăietura însăși (exclusă o dată la c, dacă are urechi). Întoarce verdictul și, la „nu”,
 * condiția care pică.
 */
export function incapeTot(
  reg: Regiune, i: number, semicerc: Arc, R: number, lume: Lumea, bucla: readonly Primitiva[], id: string, latura: LaturaO,
  cuUrechi: boolean,
): { readonly verdict: Verdict; readonly motiv: string } {
  const vs: Array<{ v: Verdict; m: string }> = [];
  vs.push({ v: incape(reg, i, semicerc, R), m: 'a (regiunea păstrată)' });
  const eL = iesirea(cutieLista(bucla), R, lume.W, lume.H), eS = iesirea(cutieArc(semicerc), R, lume.W, lume.H);
  const peste = Math.max(...eS.map((x, k) => x - eL[k]!));
  vs.push({ v: peste > TOL_INCAPE ? 'nu' : peste > 0 ? 'banda' : 'da', m: `b (foaia: ${mm(peste)} mm peste ieșirea buclei)` });
  let sine = cuUrechi;
  for (const u of lume.urechite) {
    if (sine && u.id === id && u.latura === latura) { sine = false; continue; }
    const d = distantaListe([semicerc], u.drum);
    const prag = lume.D + MARJA_SCHELET;
    vs.push({ v: d < prag - TOL_INCAPE ? 'nu' : d < prag + TOL_INCAPE ? 'banda' : 'da', m: `c (la ${mm(d)} mm de bucla cu urechi a lui ${u.id}, sub D + 1 = ${mm(prag)})` });
  }
  const nu = vs.find((x) => x.v === 'nu');
  if (nu) return { verdict: 'nu', motiv: nu.m };
  const b = vs.find((x) => x.v === 'banda');
  return b ? { verdict: 'banda', motiv: b.m } : { verdict: 'da', motiv: '' };
}

/** Semicercul măsurat pe program: centrul C și raza ρ ale intrării, cu p₀ la mijloc, în sensul părții. */
export function semicercDin(C: P2, rho: number, p0: P2, parte: Parte): Arc {
  const s = semnArc(parte);
  const up = Math.atan2(p0.y - C.y, p0.x - C.x);
  return arcP(pt(C.x, C.y), rho, up - (s * Math.PI) / 2, s * Math.PI);
}

// ---------------------------------------------------------------------------------------------------------------
// Bucla analitică și candidații (§3).

function ariaPrimitive(ps: readonly Primitiva[]): number {
  let A = 0;
  for (const p of ps) {
    if (p.tip === 'segment') A += 0.5 * (p.a.x * p.b.y - p.b.x * p.a.y);
    else if (p.tip === 'arc') {
      const [a, e] = capeteArc(p);
      A += 0.5 * (p.r * p.r * p.du + p.c.x * (e.y - a.y) - p.c.y * (e.x - a.x));
    }
  }
  return A;
}

function inverseazaP(ps: readonly Primitiva[]): Primitiva[] {
  return [...ps].reverse().map((p) => (p.tip === 'segment' ? segmentP(p.b, p.a) : p.tip === 'arc' ? arcP(p.c, p.r, p.u0 + p.du, -p.du) : p));
}

const startP = (p: Primitiva): P2 => (p.tip === 'segment' ? p.a : p.tip === 'arc' ? capeteArc(p)[0] : p.p);

/** Tangenta (în sensul primitivei) la lungimea s. */
function tangentaLa(p: Primitiva, s: number): P2 {
  if (p.tip === 'segment') return unit({ x: p.b.x - p.a.x, y: p.b.y - p.a.y });
  if (p.tip === 'arc') {
    const q = punctLa(p, s);
    const rad = unit({ x: q.x - p.c.x, y: q.y - p.c.y });
    return p.du > 0 ? rot90(rad) : rotM90(rad);
  }
  return { x: 1, y: 0 };
}

/** Sensul de mers derivat: trigonometric dacă (latura e exterior) == (partea păstrată e în stânga). */
export function mersTrigonometric(latura: 'exterior' | 'interior', sens: SensO): boolean {
  return (latura === 'exterior') === (parteaPastrataPrinAschie(sens) === 'stanga');
}

/** Bucla analitică a inelului i (offsetul exact), în sensul de mers derivat; `null` dacă scula nu încape. */
export function buclaAnalitica(reg: Regiune, i: number, latura: 'exterior' | 'interior', R: number, sens: SensO): Primitiva[] | null {
  const d = reg.inele[i]!.contur.drumIdeal(R, latura);
  if (!d) return null;
  const ps = d.filter((p) => p.tip !== 'punct');
  if (ps.length === 0) return null;
  return (ariaPrimitive(ps) > 0) === mersTrigonometric(latura, sens) ? ps : inverseazaP(ps);
}

const cercInchis = (ps: readonly Primitiva[]): boolean => ps.length === 1 && ps[0]!.tip === 'arc' && Math.abs(ps[0]!.du) >= 2 * Math.PI - 1e-9;

export type Candidat = { readonly p: P2; readonly t: P2; readonly fel: 'varf0' | 'mijloc'; readonly indice: number; readonly lungime: number };

/** Proiecția lui q pe bucla analitică: primitiva, lungimea pe ea, distanța. */
function proiecteaza(ps: readonly Primitiva[], q: P2): { readonly k: number; readonly s: number; readonly d: number } {
  let cel = { k: 0, s: 0, d: Infinity };
  ps.forEach((p, k) => {
    const L = lungimeP(p);
    if (p.tip === 'segment') {
      const vx = p.b.x - p.a.x, vy = p.b.y - p.a.y;
      const L2 = vx * vx + vy * vy;
      const t = L2 > 0 ? Math.max(0, Math.min(1, ((q.x - p.a.x) * vx + (q.y - p.a.y) * vy) / L2)) : 0;
      const x = { x: p.a.x + vx * t, y: p.a.y + vy * t };
      const d = dist(x, q);
      if (d < cel.d) cel = { k, s: t * L, d };
    } else if (p.tip === 'arc') {
      const n = Math.max(8, Math.ceil(Math.abs(p.du) * 64));
      for (let j = 0; j <= n; j++) {
        const s = (L * j) / n;
        const d = dist(punctLa(p, s), q);
        if (d < cel.d) cel = { k, s, d };
      }
      // Rafinare locală.
      let lo = Math.max(0, cel.s - L / n), hi = Math.min(L, cel.s + L / n);
      if (cel.k === k) {
        for (let it = 0; it < 60; it++) {
          const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3;
          if (dist(punctLa(p, m1), q) < dist(punctLa(p, m2), q)) hi = m2; else lo = m1;
        }
        const s = (lo + hi) / 2;
        const d = dist(punctLa(p, s), q);
        if (d <= cel.d) cel = { k, s, d };
      }
    }
  });
  return cel;
}

/** Bucla analitică rotită ca să pornească din vârful 0 (dat, citit din program): joncțiune sau punct tăiat. */
export function dinVarful0(ps: readonly Primitiva[], v0: P2): { readonly bucla: Primitiva[]; readonly laJonctiune: boolean } {
  if (cercInchis(ps)) {
    const a = ps[0] as Arc;
    return { bucla: [arcP(a.c, a.r, Math.atan2(v0.y - a.c.y, v0.x - a.c.x), a.du)], laJonctiune: true };
  }
  let k = -1, dk = Infinity;
  ps.forEach((p, j) => { const d = dist(startP(p), v0); if (d < dk) { dk = d; k = j; } });
  if (dk <= TOL_CANDIDAT) return { bucla: [...ps.slice(k), ...ps.slice(0, k)], laJonctiune: true };
  // Vârful 0 în interiorul unei primitive: o tai acolo (ALEGERE: altfel bucla nu s-ar potrivi cu programul).
  const pr = proiecteaza(ps, v0);
  const p = ps[pr.k]!;
  const [a, b] = taie(p, pr.s);
  return { bucla: [b, ...ps.slice(pr.k + 1), ...ps.slice(0, pr.k), a], laJonctiune: false };
}

/** O primitivă tăiată la lungimea s: o linie în două linii, un arc în două arce pe același cerc (§4). */
export function taie(p: Primitiva, s: number): readonly [Primitiva, Primitiva] {
  if (p.tip === 'segment') {
    const m = punctLa(p, s);
    return [segmentP(p.a, m), segmentP(m, p.b)];
  }
  if (p.tip === 'arc') {
    const f = s / lungimeP(p);
    return [arcP(p.c, p.r, p.u0, p.du * f), arcP(p.c, p.r, p.u0 + p.du * f, p.du * (1 - f))];
  }
  return [p, p];
}

/**
 * Candidații de la §3, în ordine, pe bucla pornită din vârful 0: vârful 0, apoi mijloacele celor mai lungi 12
 * primitive, după lungime descrescătoare (la egalitate, indicele mai mic întâi; `ordine: 'invers'` = indicele în bucla
 * parcursă invers, a doua lectură a „indicelui”, ALEGERE pentru lipire); un mijloc identic cu un candidat de dinainte se
 * sare. Pe un cerc închis: doar vârful 0 (antetul).
 */
export function candidatii(bucla: readonly Primitiva[], ordine: 'mers' | 'invers' = 'mers'): Candidat[] {
  const rez: Candidat[] = [{ p: startP(bucla[0]!), t: tangentaLa(bucla[0]!, 0), fel: 'varf0', indice: 0, lungime: lungimeP(bucla[0]!) }];
  if (cercInchis(bucla)) return rez;
  const n = bucla.length;
  const idx = bucla.map((p, k) => ({ p, k, L: lungimeP(p), cheie: ordine === 'mers' ? k : n - 1 - k }));
  idx.sort((a, b) => (Math.abs(b.L - a.L) > LUNGIMI_EGALE ? b.L - a.L : a.cheie - b.cheie));
  for (const x of idx.slice(0, CANDIDATI_SEGMENTE)) {
    const m = punctLa(x.p, x.L / 2);
    if (rez.some((c) => c.p.x === m.x && c.p.y === m.y)) continue;
    rez.push({ p: m, t: tangentaLa(x.p, x.L / 2), fel: 'mijloc', indice: x.k, lungime: x.L });
  }
  return rez;
}

/** Razele încercate (§3): raza, apoi raza / 2 dacă e cel puțin 0,5. */
export const razele = (raza: number): number[] => (raza / 2 >= RAZA_MINIMA ? [raza, raza / 2] : [raza]);

export type Alegere = { readonly p0: P2; readonly t0: P2; readonly rho: number; readonly candidat: Candidat } | null;

/**
 * Alegerile acceptate de §3 pentru o buclă: primul candidat (pe raze, apoi pe candidați) care încape. Cei din bandă
 * (±TOL_INCAPE de prag) sunt acceptați amândoi (aplicația, pe geometria exactă, poate face oricare). `null` = niciunul.
 * `judeca` = „încape” (de regulă `incapeTot`, cu toate trei condițiile). `egalitati`: mijloacele consecutive cu aceeași
 * lungime (la 1e-6 mm) formează un grup în care oricare e acceptat (doar pentru diagnostic: §3 cere indicele mai mic).
 */
export function alegerileAcceptate(
  judeca: (semicerc: Arc) => Verdict, raza: number, parte: Parte, cand: readonly Candidat[], egalitati = false,
): Alegere[] {
  const rez: Alegere[] = [];
  for (const rho of razele(raza)) {
    for (let k = 0; k < cand.length;) {
      let k1 = k + 1;
      const c0 = cand[k]!;
      if (egalitati && c0.fel === 'mijloc') {
        while (k1 < cand.length && cand[k1]!.fel === 'mijloc' && Math.abs(cand[k1]!.lungime - c0.lungime) <= LUNGIMI_EGALE) k1++;
      }
      let gata = false;
      for (const c of cand.slice(k, k1)) {
        const v = judeca(semicercul(c.p, c.t, parte, rho).arc);
        if (v === 'nu') continue;
        rez.push({ p0: c.p, t0: c.t, rho, candidat: c });
        if (v === 'da') gata = true;
      }
      if (gata) return rez;
      k = k1;
    }
  }
  rez.push(null);
  return rez;
}

/** p₀ e un candidat de la §3 pe bucla analitică (antetul): joncțiune, mijlocul unei primitive din cele 12, cerc închis. */
export function esteCandidat(ps: readonly Primitiva[], p0: P2): boolean {
  if (cercInchis(ps)) return true;
  if (ps.some((p) => dist(startP(p), p0) <= TOL_CANDIDAT)) return true;
  const L = ps.map(lungimeP).sort((a, b) => b - a);
  const prag12 = L[Math.min(CANDIDATI_SEGMENTE, L.length) - 1]!;
  return ps.some((p) => lungimeP(p) >= prag12 - 1e-9 && dist(punctLa(p, lungimeP(p) / 2), p0) <= TOL_CANDIDAT);
}

// ---------------------------------------------------------------------------------------------------------------
// Citirea unei treceri.

/** O mișcare în plan, în document: dreapta sau arcul văzut de GRBL. */
export type Bucata = { readonly linia: number; readonly a: P2; readonly b: P2; readonly c?: P2; readonly r?: number; readonly unghi?: number; readonly L: number };

const dinPasL = (p: PasL): Bucata => ({
  linia: p.linia, a: p.a, b: p.b, L: p.s1 - p.s0,
  ...(p.c !== undefined && p.r !== undefined && p.unghi !== undefined ? { c: p.c, r: p.r, unghi: p.unghi } : {}),
});

export const dinPas = (p: Pas): Bucata => (p.tip === 'segment'
  ? { linia: p.linia, a: p.a, b: p.b, L: dist(p.a, p.b) }
  : { linia: p.linia, a: p.a, b: p.b, c: p.c, r: p.r, unghi: p.unghi, L: p.r * Math.abs(p.unghi) });

/** Direcția de mers a unei bucăți la start sau la capăt, cu eroarea ei din rotunjire (δ). */
export function directia(b: Bucata, unde: 'start' | 'capat'): { readonly t: P2; readonly delta: number } {
  if (b.c === undefined || b.r === undefined || b.unghi === undefined) {
    return { t: unit({ x: b.b.x - b.a.x, y: b.b.y - b.a.y }), delta: Math.min(Math.PI, 0.0015 / Math.max(b.L, 1e-9)) };
  }
  const u0 = Math.atan2(b.a.y - b.c.y, b.a.x - b.c.x);
  const u = unde === 'start' ? u0 : u0 + b.unghi;
  const rad = { x: Math.cos(u), y: Math.sin(u) };
  return { t: b.unghi > 0 ? rot90(rad) : rotM90(rad), delta: Math.min(Math.PI, 0.0015 / Math.max(b.r, 1e-9)) };
}

export type ArcCitit = { readonly c: P2; readonly r: number; readonly unghi: number; readonly a: P2; readonly b: P2; readonly linia: number };

/** Bucățile ca un singur arc (antetul), sau motivul pentru care nu sunt. */
export function arcul(bucati: readonly Bucata[]): ArcCitit | string {
  if (bucati.length === 0) return 'lipsește';
  let unghi = 0;
  const b0 = bucati[0]!;
  if (b0.c === undefined || b0.r === undefined || b0.unghi === undefined) return `linia ${b0.linia} e o dreaptă, nu un arc`;
  for (const b of bucati) {
    if (b.c === undefined || b.r === undefined || b.unghi === undefined) return `linia ${b.linia} e o dreaptă, nu un arc`;
    if (dist(b.c, b0.c) > TOL_GEOM || Math.abs(b.r - b0.r) > TOL_GEOM) return `linia ${b.linia}: alt cerc (centrul ${mm(b.c.x)}, ${mm(b.c.y)}, raza ${mm(b.r)})`;
    if (Math.sign(b.unghi) !== Math.sign(b0.unghi)) return `linia ${b.linia}: arcul își schimbă sensul`;
    unghi += b.unghi;
  }
  return { c: b0.c, r: b0.r, unghi, a: b0.a, b: bucati[bucati.length - 1]!.b, linia: b0.linia };
}

export type TrecereI = {
  readonly pasi: readonly PasL[];
  /** Prima mișcare, dacă e pe verticală și coboară. */
  readonly plonjare: PasL | null;
  /** Alte coborâri pe verticală în lanț. */
  readonly verticale: readonly PasL[];
  readonly intrare: readonly Bucata[];
  /** Prima buclă închisă (goală dacă nu se închide niciuna). */
  readonly bucla: readonly Bucata[];
  /** Câte bucle închise are trecerea (cu intrări: exact una). */
  readonly bucle: number;
  readonly iesire: readonly Bucata[];
  readonly inchisa: boolean;
  /** Punctul plonjării (startul lanțului) și startul buclei. */
  readonly A: P2;
  readonly p0: P2 | null;
  readonly zMin: number;
};

/**
 * Trecerea tăiată în intrare, bucle și ieșire (antetul): buclele se închid una după alta, ca la invarianta 9 (după o
 * buclă, căutarea pornește din nou de la capătul ei). Intrarea = ce e înaintea primei bucle; ieșirea = ce e după ultima.
 */
export function desparte(pasi: readonly PasL[]): TrecereI {
  const p0l = pasi[0]!;
  const plonjare = p0l.vertical && p0l.zb < p0l.za - 1e-9 ? p0l : null;
  const verticale = pasi.slice(plonjare ? 1 : 0).filter((p) => p.vertical && p.zb < p.za - 1e-9);
  const mv = pasi.filter((p) => !p.vertical).map(dinPasL);
  const zMin = Math.min(...pasi.flatMap((p) => [p.za, p.zb]));
  const bucle: Array<readonly [number, number]> = [];
  let de = 0;
  while (de < mv.length) {
    let gasit: readonly [number, number] | null = null;
    const pana = [0];
    for (let j = de; j < mv.length && !gasit; j++) {
      pana.push(pana[pana.length - 1]! + mv[j]!.L);
      for (let k = de; k <= j; k++) {
        if (pana[j + 1 - de]! - pana[k - de]! < LUNGIME_MINIMA) break;
        if (dist(mv[k]!.a, mv[j]!.b) <= TOL_INCHIDERE) { gasit = [k, j]; break; }
      }
    }
    if (!gasit) break;
    bucle.push(gasit);
    de = gasit[1] + 1;
  }
  if (bucle.length === 0) {
    return { pasi, plonjare, verticale, intrare: [], bucla: [], bucle: 0, iesire: [], inchisa: false, A: p0l.a, p0: mv[0]?.a ?? null, zMin };
  }
  const [k0, j0] = bucle[0]!;
  const ultima = bucle[bucle.length - 1]![1];
  return {
    pasi, plonjare, verticale, intrare: mv.slice(0, k0), bucla: mv.slice(k0, j0 + 1), bucle: bucle.length, iesire: mv.slice(ultima + 1),
    inchisa: true, A: p0l.a, p0: mv[k0]!.a, zMin,
  };
}

/**
 * §2 pe un arc citit (intrarea sau ieșirea), față de bucla care pornește în p₀ cu direcția t₀ (eroarea δ): raza din
 * `raze`, sensul după partea deșeului, contactul cu p₀ (intrarea se termină acolo, ieșirea pleacă de acolo), centrul pe
 * partea deșeului (normala măsurată față de cea cerută; cu sensul corect, asta e și tangența în p₀). `sfert`: unghiul
 * trebuie să fie 90° (invarianta 12); altfel cel mult 90° (invarianta 9). Întoarce motivul, sau null.
 */
export function judecaArcul(
  a: ArcCitit, p0: P2, t0: P2, delta: number, parte: Parte, raze: readonly number[], fel: 'intrarea' | 'ieșirea', sfert: boolean,
): string | null {
  const rho = raze.find((r) => Math.abs(r - a.r) <= TOL_GEOM);
  if (rho === undefined) return `${fel} are raza ${mm(a.r)}, nu ${raze.map(mm).join(' sau ')}`;
  const tolU = TOL_GEOM / rho + delta + TOL_UNGHI_FIX;
  const contact = fel === 'intrarea' ? a.b : a.a;
  if (dist(contact, p0) > 2 * TOL_GEOM) return `${fel} nu atinge bucla în p₀ (${mm(contact.x)}, ${mm(contact.y)} față de ${mm(p0.x)}, ${mm(p0.y)})`;
  if (Math.sign(a.unghi) !== semnArc(parte)) return `${fel} e ${a.unghi > 0 ? 'trigonometrică' : 'orară'}; deșeul e în ${parte}, deci trebuie ${semnArc(parte) > 0 ? 'trigonometrică' : 'orară'}`;
  const nm = unit({ x: a.c.x - p0.x, y: a.c.y - p0.y });
  const n = normalaDeseu(t0, parte);
  const abatere = unghiIntre(nm, n);
  if (abatere > tolU) {
    return `centrul ${fel} (${mm(a.c.x)}, ${mm(a.c.y)}) nu e pe partea deșeului, tangent în p₀: normala lui e la ${(abatere * 180 / Math.PI).toFixed(2)}° de n`;
  }
  const u = Math.abs(a.unghi);
  if (sfert ? Math.abs(u - Math.PI / 2) > tolU : u > Math.PI / 2 + tolU) {
    return `${fel} are ${(u * 180 / Math.PI).toFixed(2)}°, ${sfert ? 'nu un sfert de cerc' : 'peste 90°'}`;
  }
  return null;
}

// ---------------------------------------------------------------------------------------------------------------
// A. Invariantele 12 și 11 (amendată), în poartă; regula 9 amendată.

export type IncalcareIntrari = { readonly invarianta: 11 | 12; readonly linia: number; readonly mesaj: string };

/** Intrările așteptate pe etichetă: operația legată (ca la 9–11) cu raza, latura, sensul, rampa. */
type Legare = {
  readonly intrari: IntrariO | null; readonly rampa: boolean; readonly adancime: number; readonly sens: SensO | null; readonly latura: LaturaO;
  readonly id: string; readonly urechi: boolean;
};

function legarile(etichete: readonly EtichetaActiva[], reg: Regiune): Array<Legare | null> {
  const par = parametriiEtichetelor(etichete, reg);
  const sensuri = sensurileEtichetelor(etichete, reg);
  return etichete.map((e, k) => {
    const x = par[k];
    if (!e.eticheta || !x || 'motiv' in x) return null;
    const s = sensuri[k];
    return {
      intrari: x.intrari ?? null, rampa: x.rampa !== null, adancime: x.adancime, sens: s && 'sens' in s ? s.sens : null, latura: e.eticheta.latura,
      id: e.eticheta.idLume, urechi: x.urechi !== null,
    };
  });
}

/**
 * Regula invariantei 9 amendate, pentru poartă: porțiunea deschisă `o`, înaintea primei bucle închise (`'inainte'`) sau
 * după ultima (`'dupa'`) a aceluiași drum, e o intrare sau o ieșire: un arc tangent la buclă în p₀, de cel mult 90°, cu
 * raza `raza` sau `raza/2` a operației, pe partea deșeului.
 */
export function esteIntrareSauIesire(o: Bucla, bucla: Bucla, pozitie: 'inainte' | 'dupa', raza: number, sens: SensO): boolean {
  const a = arcul(o.pasi.map(dinPas));
  if (typeof a === 'string') return false;
  const prima = bucla.pasi[0];
  if (!prima) return false;
  const { t, delta } = directia(dinPas(prima), 'start');
  return judecaArcul(a, bucla.start, t, delta, parteDeseu(sens), razele(raza), pozitie === 'inainte' ? 'intrarea' : 'ieșirea', false) === null;
}

/** Fabrica regulii de mai sus pentru `verificaSensul`: raza și sensul operației fiecărei etichete. */
export function regula0030(etichete: readonly EtichetaActiva[], reg: Regiune): (o: Bucla, c: Bucla, pozitie: 'inainte' | 'dupa') => boolean {
  const leg = legarile(etichete, reg);
  return (o, c, pozitie) => {
    const x = o.eticheta >= 0 ? leg[o.eticheta] : null;
    if (!x || x.intrari === null || x.sens === null || x.latura === 'pe-linie') return false;
    return esteIntrareSauIesire(o, c, pozitie, x.intrari.raza, x.sens);
  };
}

/**
 * Invariantele 12 și 11 (amendată) pe un program. `R` = raza frezei (contextul porții). `cuIntrari` = indicii
 * etichetelor legate de o operație cu intrări (fără rampă): `rampa.ts` nu le mai judecă forma de la §4.
 */
export function verificaIntrari(
  evenimente: readonly Eveniment[], etichete: readonly EtichetaActiva[], reg: Regiune, laDoc: (p: Punct3) => Punct3, R: number,
  foaie: { readonly latime: number; readonly inaltime: number } = { latime: Infinity, inaltime: Infinity },
): { readonly incalcari: IncalcareIntrari[]; readonly cuIntrari: ReadonlySet<number> } {
  const rez: IncalcareIntrari[] = [];
  const lume = lumea(reg, foaie, 2 * R);
  const leg = legarile(etichete, reg);
  const cuIntrari = new Set<number>();
  leg.forEach((x, k) => { if (x && x.intrari !== null && !x.rampa && x.latura !== 'pe-linie') cuIntrari.add(k); });
  // §6: refuzurile, pe etichetă (o dată pe linie).
  etichete.forEach((e, k) => {
    const x = leg[k];
    if (!x || x.intrari === null) return;
    const cine = `${x.id} (${x.latura})`;
    if (x.latura === 'pe-linie') rez.push({ invarianta: 12, linia: e.linia, mesaj: `intrările lui ${cine}: pe-linie n-are parte de deșeu; exportul trebuia refuzat (§6)` });
    if (x.rampa) rez.push({ invarianta: 12, linia: e.linia, mesaj: `intrările lui ${cine}: intrări și rampă pe aceeași operație; exportul trebuia refuzat (§6)` });
    if (x.intrari.raza < RAZA_MINIMA) rez.push({ invarianta: 12, linia: e.linia, mesaj: `intrările lui ${cine}: raza ${x.intrari.raza} mm e sub ${RAZA_MINIMA} mm; exportul trebuia refuzat (§6)` });
  });
  // Trecerile, grupate pe tăietură.
  const grupe = new Map<string, { k: number; treceri: TrecereI[] }>();
  for (const l of lanturile(evenimente, etichete.map((e) => e.linia), laDoc)) {
    if (l.eticheta < 0) continue;
    const x = leg[l.eticheta];
    if (!x || x.latura === 'pe-linie' || x.rampa) continue;
    const cheie = `${x.id}|${x.latura}|${x.adancime}|${x.intrari === null ? 'null' : x.intrari.raza}`;
    const g = grupe.get(cheie) ?? { k: l.eticheta, treceri: [] };
    g.treceri.push(desparte(l.pasi));
    grupe.set(cheie, g);
  }
  for (const { k, treceri } of grupe.values()) {
    const x = leg[k]!;
    const cine = `${x.id} (${x.latura})`;
    const cu = treceri.filter((t) => t.intrare.length > 0 || t.iesire.length > 0);
    if (x.intrari === null) {
      for (const t of cu) {
        rez.push({ invarianta: 12, linia: (t.intrare[0] ?? t.iesire[0])!.linia, mesaj: `intrările: operația lui ${cine} n-are intrări, dar trecerea are ${t.intrare.length ? 'o intrare' : 'o ieșire'}` });
      }
      continue;
    }
    if (x.sens === null) continue; // sensul nelegat: invarianta 9 îl raportează
    const parte = parteDeseu(x.sens);
    const latura = x.latura as 'exterior' | 'interior';
    const i = reg.inele.findIndex((q) => q.idLume === x.id);
    const analitica = i >= 0 ? buclaAnalitica(reg, i, latura, R, x.sens) : null;
    const raze = razele(x.intrari.raza);
    if (cu.length > 0 && cu.length < treceri.length) {
      rez.push({ invarianta: 12, linia: (cu[0]!.intrare[0] ?? cu[0]!.iesire[0])!.linia, mesaj: `intrările lui ${cine}: ${cu.length} din ${treceri.length} treceri au intrări; §3 cere aceeași alegere la toate` });
    }
    let ref: { A: P2; p0: P2; rho: number } | null = null;
    for (const t of treceri) {
      const are = t.intrare.length > 0 || t.iesire.length > 0;
      const linia = t.pasi[0]!.linia;
      if (!are) {
        // Bucla fără intrări: forma de la ADR 0029 §4 (11).
        for (const v of formaFaraRampa({ eticheta: k, pasi: t.pasi, inainte: null, lungime: 0, theta: 0 } as Lant, cine)) rez.push({ invarianta: 11, linia: v.linia, mesaj: v.mesaj });
        continue;
      }
      // 11 amendată: plonjarea pe verticală, din aer, în A, în afara buclei; intrarea, bucla, ieșirea, ridicarea.
      if (!t.plonjare || t.plonjare.za < -TOL_SUB) rez.push({ invarianta: 11, linia, mesaj: `intrările (11): trecerea lui ${cine} nu începe cu o plonjare pe verticală din aer` });
      if (t.verticale.length) rez.push({ invarianta: 11, linia: t.verticale[0]!.linia, mesaj: `intrările (11): ${cine} coboară pe verticală și în altă parte decât în A` });
      if (!t.inchisa || t.p0 === null) {
        rez.push({ invarianta: 11, linia, mesaj: `intrările (11): trecerea lui ${cine} nu are o buclă închisă` });
        continue;
      }
      if (t.bucle > 1) rez.push({ invarianta: 11, linia, mesaj: `intrările (11): trecerea lui ${cine} are ${t.bucle} bucle, fără ridicare între ele (o trecere = intrarea, o buclă, ieșirea)` });
      const dA = dist(t.A, t.p0);
      if (dA <= TOL_CANDIDAT) rez.push({ invarianta: 11, linia, mesaj: `intrările (11): ${cine} plonjează pe buclă, în p₀ (A la ${mm(dA)} mm de el), nu în afara ei` });
      // 12: intrarea și ieșirea de la §2.
      if (t.intrare.length === 0 || t.iesire.length === 0) {
        rez.push({ invarianta: 12, linia, mesaj: `intrările lui ${cine}: trecerea are ${t.intrare.length ? 'intrare, dar nu ieșire' : 'ieșire, dar nu intrare'}` });
        continue;
      }
      const ai = arcul(t.intrare), ae = arcul(t.iesire);
      const { t: t0, delta } = directia(t.bucla[0]!, 'start');
      if (typeof ai === 'string') { rez.push({ invarianta: 12, linia: t.intrare[0]!.linia, mesaj: `intrarea lui ${cine}: ${ai}` }); continue; }
      if (typeof ae === 'string') { rez.push({ invarianta: 12, linia: t.iesire[0]!.linia, mesaj: `ieșirea lui ${cine}: ${ae}` }); continue; }
      const ri = judecaArcul(ai, t.p0, t0, delta, parte, raze, 'intrarea', true);
      if (ri) rez.push({ invarianta: 12, linia: ai.linia, mesaj: `intrările lui ${cine}: ${ri}` });
      const re = judecaArcul(ae, t.p0, t0, delta, parte, raze, 'ieșirea', true);
      if (re) rez.push({ invarianta: 12, linia: ae.linia, mesaj: `intrările lui ${cine}: ${re}` });
      if (!ri && !re && (dist(ai.c, ae.c) > 2 * TOL_GEOM || Math.abs(ai.r - ae.r) > 2 * TOL_GEOM)) {
        rez.push({ invarianta: 12, linia: ae.linia, mesaj: `intrările lui ${cine}: ieșirea nu e pe cercul intrării (centrul ${mm(ae.c.x)}, ${mm(ae.c.y)} față de ${mm(ai.c.x)}, ${mm(ai.c.y)})` });
      }
      if (dist(ai.a, t.A) > 2 * TOL_GEOM) rez.push({ invarianta: 11, linia: ai.linia, mesaj: `intrările (11): intrarea lui ${cine} nu pleacă din punctul plonjării` });
      if (analitica && !esteCandidat(analitica, t.p0)) {
        rez.push({ invarianta: 12, linia: ai.linia, mesaj: `intrările lui ${cine}: p₀ (${mm(t.p0.x)}, ${mm(t.p0.y)}) nu e un candidat de la §3 (vârful 0 sau mijlocul unui segment)` });
      }
      // Precizarea din 10.10: intrarea aleasă încape (a, b, c), măsurată pe program (C și ρ ale intrării).
      if (analitica && i >= 0 && !ri) {
        const x0 = incapeTot(reg, i, semicercDin(ai.c, ai.r, t.p0, parte), R, lume, analitica, x.id, x.latura, x.urechi);
        if (x0.verdict === 'nu') rez.push({ invarianta: 12, linia: ai.linia, mesaj: `intrările lui ${cine}: semicercul ales (p₀ ${mm(t.p0.x)}, ${mm(t.p0.y)}, ρ ${mm(ai.r)}) nu încape: ${x0.motiv}` });
      }
      const rho = raze.find((r) => Math.abs(r - ai.r) <= TOL_GEOM) ?? ai.r;
      if (!ref) { ref = { A: t.A, p0: t.p0, rho }; continue; }
      if (dist(ref.A, t.A) > TOL_ACELASI) rez.push({ invarianta: 11, linia, mesaj: `intrările (11): ${cine} plonjează în alt A (${mm(t.A.x)}, ${mm(t.A.y)}; înainte ${mm(ref.A.x)}, ${mm(ref.A.y)})` });
      if (dist(ref.p0, t.p0) > TOL_ACELASI) rez.push({ invarianta: 11, linia, mesaj: `intrările (11): ${cine} intră pe buclă în alt p₀ (${mm(t.p0.x)}, ${mm(t.p0.y)}; înainte ${mm(ref.p0.x)}, ${mm(ref.p0.y)})` });
      if (ref.rho !== rho) rez.push({ invarianta: 12, linia, mesaj: `intrările lui ${cine}: raza ${mm(rho)} la o trecere, ${mm(ref.rho)} la alta (§3: aceeași alegere pentru toate trecerile)` });
    }
    // 12: bucla fără intrări — niciun candidat nu încape.
    if (cu.length === 0 && treceri.length && analitica && i >= 0) {
      const t = treceri[0]!;
      if (t.p0 === null) continue;
      const { bucla } = dinVarful0(analitica, t.p0);
      for (const rho of raze) {
        const c = candidatii(bucla).find((q) => incapeTot(reg, i, semicercul(q.p, q.t, parte, rho).arc, R, lume, analitica, x.id, x.latura, x.urechi).verdict === 'da');
        if (c) {
          rez.push({
            invarianta: 12, linia: t.pasi[0]!.linia,
            mesaj: `intrările lui ${cine}: bucla e tăiată fără intrări, dar candidatul ${c.fel === 'varf0' ? 'vârful 0' : `mijlocul segmentului ${c.indice}`} (${mm(c.p.x)}, ${mm(c.p.y)}) încape cu ρ = ${mm(rho)}`,
          });
          break;
        }
      }
    }
  }
  return { incalcari: rez, cuIntrari };
}

/** Distanța de la q la o bucată (dreapta: proiecția; arcul: pe cerc, în unghiul lui, sau capetele). */
function distBucata(b: Bucata, q: P2): number {
  if (b.c === undefined || b.r === undefined || b.unghi === undefined) {
    const vx = b.b.x - b.a.x, vy = b.b.y - b.a.y;
    const L2 = vx * vx + vy * vy;
    const t = L2 > 0 ? Math.max(0, Math.min(1, ((q.x - b.a.x) * vx + (q.y - b.a.y) * vy) / L2)) : 0;
    return Math.hypot(b.a.x + vx * t - q.x, b.a.y + vy * t - q.y);
  }
  const u0 = Math.atan2(b.a.y - b.c.y, b.a.x - b.c.x);
  const uq = Math.atan2(q.y - b.c.y, q.x - b.c.x);
  const rel = ((((uq - u0) * Math.sign(b.unghi)) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  if (rel <= Math.abs(b.unghi)) return Math.abs(Math.hypot(q.x - b.c.x, q.y - b.c.y) - b.r);
  return Math.min(dist(q, b.a), dist(q, b.b));
}

// ---------------------------------------------------------------------------------------------------------------
// B. Hârtia: cititorul separat și mărimile măsurate.

export type MasuraIntrare = {
  readonly A: P2;
  /** Plonjarea e pe verticală, din aer, în A. */
  readonly plonjareInA: boolean;
  readonly zFund: number;
  readonly p0: P2 | null;
  readonly t0: P2 | null;
  readonly P: number;
  /** null: trecerea n-are intrare (sau nu e un arc). */
  readonly C: P2 | null;
  readonly rho: number | null;
  /** Partea centrului intrării față de sensul de mers în p₀. */
  readonly parte: Parte | null;
  readonly unghiIntrare: number | null;
  readonly CIesire: P2 | null;
  readonly rhoIesire: number | null;
  readonly unghiIesire: number | null;
  readonly parteIesire: Parte | null;
  /** Jocul discului (distanța centrului − R) pe intrare și pe ieșire, față de K ∪ S(C) și față de vecini (fără C). */
  readonly jocIntrare: number | null;
  readonly jocIesire: number | null;
  readonly jocVecini: number | null;
};

const caPrimitive = (bucati: readonly Bucata[]): Primitiva[] => bucati.map((b) => (b.c !== undefined && b.r !== undefined && b.unghi !== undefined
  ? arcP(pt(b.c.x, b.c.y), b.r, Math.atan2(b.a.y - b.c.y, b.a.x - b.c.x), b.unghi)
  : segmentP(pt(b.a.x, b.a.y), pt(b.b.x, b.b.y))));

const parteaLui = (t0: P2, C: P2, p0: P2): Parte => ((t0.x * (C.y - p0.y) - t0.y * (C.x - p0.x)) > 0 ? 'stanga' : 'dreapta');

/**
 * Măsoară fiecare trecere a programului (cititorul `parcurgeriHartie` din `rampa.ts`, fără etichete). Cu `reg`, `i`
 * (inelul tăieturii) și R, și jocul discului pe intrare și pe ieșire.
 */
export function masoaraIntrari(text: string, laDoc: (p: Punct3) => Punct3, reg?: Regiune, i?: number, R?: number): MasuraIntrare[] {
  return parcurgeriHartie(text, laDoc).map((pasi) => {
    const t = desparte(pasi);
    const pl = t.plonjare;
    const plonjareInA = pl !== null && pl.za >= -TOL_SUB;
    const dir = t.bucla[0] ? directia(t.bucla[0], 'start').t : null;
    const ai = t.intrare.length ? arcul(t.intrare) : null;
    const ae = t.iesire.length ? arcul(t.iesire) : null;
    const A = typeof ai === 'object' && ai ? ai : null;
    const E = typeof ae === 'object' && ae ? ae : null;
    const joc = (b: readonly Bucata[]): number | null => (reg && i !== undefined && R !== undefined && b.length ? locul(reg, i, caPrimitive(b), R).joc : null);
    const vecini = reg && i !== undefined && R !== undefined && (t.intrare.length || t.iesire.length)
      ? locul(reg, i, caPrimitive([...t.intrare, ...t.iesire]), R, new Set([i])).joc : null;
    return {
      A: t.A, plonjareInA, zFund: t.zMin, p0: t.p0, t0: dir, P: t.bucla.reduce((s, b) => s + b.L, 0),
      C: A?.c ?? null, rho: A?.r ?? null, parte: A && t.p0 && dir ? parteaLui(dir, A.c, t.p0) : null, unghiIntrare: A?.unghi ?? null,
      CIesire: E?.c ?? null, rhoIesire: E?.r ?? null, unghiIesire: E?.unghi ?? null, parteIesire: E && t.p0 && dir ? parteaLui(dir, E.c, t.p0) : null,
      jocIntrare: joc(t.intrare), jocIesire: joc(t.iesire), jocVecini: vecini,
    };
  });
}

/** Ce cere hârtia pe o trecere cu intrări (din geometria de pe hârtie). */
export type AsteptatIntrare = { readonly p0: P2; readonly C: P2; readonly rho: number; readonly parte: Parte; readonly A: P2; readonly B: P2 } | null;

/** Diferențele dintre o măsură și hârtie (goală = trecerea e cea de pe hârtie). */
export function comparaIntrarea(m: MasuraIntrare, a: AsteptatIntrare, tol = 0.003): string[] {
  const rele: string[] = [];
  const la = (p: P2 | null, q: P2, ce: string): void => { if (!p || dist(p, q) > tol) rele.push(`${ce} ${p ? `(${mm(p.x)}, ${mm(p.y)})` : 'lipsă'}, nu (${mm(q.x)}, ${mm(q.y)})`); };
  if (a === null) {
    if (m.C !== null || m.CIesire !== null) rele.push('trecerea are intrare sau ieșire; hârtia cere bucla fără intrări');
    if (m.p0 && dist(m.A, m.p0) > tol) rele.push('fără intrări, plonjarea trebuie să fie în vârful 0, pe buclă');
    return rele;
  }
  la(m.p0, a.p0, 'p₀');
  la(m.C, a.C, 'centrul intrării');
  la(m.CIesire, a.C, 'centrul ieșirii');
  la(m.A, a.A, 'A (plonjarea)');
  if (m.rho === null || Math.abs(m.rho - a.rho) > tol) rele.push(`ρ ${m.rho === null ? 'lipsă' : mm(m.rho)}, nu ${mm(a.rho)}`);
  if (m.parte !== a.parte) rele.push(`intrarea e în ${m.parte ?? '?'}, nu în ${a.parte}`);
  if (m.parteIesire !== a.parte) rele.push(`ieșirea e în ${m.parteIesire ?? '?'}, nu în ${a.parte}`);
  const s = semnArc(a.parte);
  for (const [u, ce] of [[m.unghiIntrare, 'intrarea'], [m.unghiIesire, 'ieșirea']] as const) {
    if (u === null || Math.abs(u - (s * Math.PI) / 2) > 0.003 / a.rho + 1e-4) rele.push(`${ce} are ${u === null ? '?' : (u * 180 / Math.PI).toFixed(2)}°, nu ${s * 90}°`);
  }
  if (!m.plonjareInA) rele.push('plonjarea nu e pe verticală, din aer, în A');
  for (const [j, ce] of [[m.jocIntrare, 'intrare'], [m.jocIesire, 'ieșire']] as const) {
    if (j !== null && j < -(0.005 + 0.002)) rele.push(`pe ${ce}, discul mușcă din regiunea păstrată cu ${mm(-j)} mm`);
  }
  return rele;
}
