/**
 * ORACOLUL rampei (ADR 0029, felia 2.5a), cu ZERO importuri din `src/`. Scris doar din textul ADR 0029 (plus ADR 0026
 * §7 pentru etichete, ADR 0027 pentru buclă și sens, prin `sens.ts`, și ADR 0028 pentru profilul urechilor, prin
 * `urechi.ts`), de o sesiune independentă de cea care a scris aplicația. Două metode, care se verifică una pe alta:
 *
 * A. INVARIANTELE 10 (amendată) și 11 (nouă), în poartă (`verificaRampa`), cu documentul în context (ca 2, 9 și 10).
 *    Legarea etichetei de operație e cea de la 9 / 10, pe perechea (urechi, rampă): candidatele sunt operațiile
 *    elementului pe latura și adâncimea etichetei; aceeași pereche pe toate = aceea; altfel a k-a apariție e a k-a
 *    candidată.
 *    - LANȚUL (ALEGERE, definiția mea pe textul G-code): șirul maximal de mișcări G1 / G2 / G3 consecutive, cu startul
 *      cunoscut, sub aceeași etichetă, al căror CAPĂT e sub fața de sus (z < −1e-6 în document). G0, o mișcare care se
 *      termină pe sau peste fața de sus (coborârea prin aer până la Z = 0, ridicarea) și o etichetă nouă îl întrerup.
 *      Spre deosebire de drumul invariantei 9, lanțul ține și prima bucată a rampei (care pleacă de la Z = 0) și
 *      plonjările pe verticală. s = drumul în plan de la startul lanțului (dreapta: lungimea; arcul: r·|θ|, cum îl
 *      execută GRBL; o mișcare pe verticală: 0), desfășurat.
 *    - Pe o operație CU rampă, pentru fiecare lanț (o buclă, cu toate trecerile ei, §2):
 *      · înaintea lanțului: un G1 pe verticală care coboară prin aer și se oprește la fața de sus (Z = 0 ± 0,0005);
 *        lanțul pleacă de la Z = 0 (d₀ = 0);
 *      · nicio mișcare pe verticală (X și Y neschimbate) nu coboară în material, cu toleranța din precizarea din 10.10:
 *        pe trecerea k, cel mult (d_k − d_{k−1})·0,001 / Lr + 0,0005 mm (bucata de rampă mai scurtă decât rezoluția
 *        postului, scrisă cu același X / Y rotunjit, plus rotunjirea lui Z);
 *      · rampa minimă (precizarea din 10.10): o etichetă legată de o operație cu lungimea rampei sub 1 mm, sau o buclă cu
 *        rampă pe care Lr < 1 mm (P < 2 mm), înseamnă că exportul trebuia refuzat (ca refuzurile urechilor la 10). Pe
 *        bucla din program, ALEGERE: Lr = min(lungime, P/2) se judecă cu P măsurat + T₁ (în favoarea aplicației la
 *        limită: P exact poate fi cu atât mai mare);
 *      · P = drumul până la prima întoarcere în startul lanțului (vârful 0), MĂSURAT pe program; Lr = min(lungime; P/2);
 *        zonele urechilor din ADR 0028 §3 pe P; e₁ = 0, e_{k+1} = scoate(e_k + Lr); σ_k = e_k + (k − 1)·P (desfășurat);
 *      · numărul de treceri n: cel pentru care lungimea lanțului e σ_n + Lr + P (tura ultimei treceri se oprește acolo);
 *      · d_k = adâncimea fundului trecerii k, citită din program (−Z-ul cel mai jos pe fereastra [σ_k, σ_{k+1}]);
 *        ALEGERE: împărțirea adâncimii în treceri nu e în contract (doar „cel mult pasul”, invarianta 1), deci n și d_k
 *        se citesc din program, iar contractul le leagă: d crește strict, d_n = adâncimea operației (±0,001);
 *      · invarianta 11: Z-ul programului urmează Z(σ) = max(zR_k, zP_k) pe [σ_k, σ_k + Lr] și zP_k pe tură (§2), cu
 *        zR_k liniar de la −d_{k−1} la −d_k (deci intrările, lungimea coborârii, liniaritatea în afara zonelor și
 *        acoperirea până la e_n + Lr + P sunt toate în aceeași comparație);
 *      · invarianta 10 amendată (§5): pe fiecare trecere k, nicio mișcare sub zP_k(s), iar tura [σ_k + Lr, σ_{k+1}]
 *        (cel puțin P) e la zP_k(s): fiecare punct al buclei atins la fundul trecerii; tura ultimei treceri ajunge la
 *        σ_n + Lr + P (fără pană sub rampă).
 *    - Pe o operație FĂRĂ rampă (invarianta 11, forma de la §4), pe fiecare lanț: începe cu o plonjare pe verticală din
 *      aer; nicio altă coborâre pe verticală (ridicarea între treceri); o singură buclă închisă, înapoi în punctul
 *      plonjării; sub aceeași etichetă, adâncimile lanțurilor nu scad (toate buclele la o adâncime, apoi următoarea), iar
 *      trecerile aceleiași bucle plonjează în același punct (ALEGERE: „aceeași buclă” = startul unui lanț stă pe drumul
 *      altuia, cu aceeași lungime).
 * B. HÂRTIA (`parcurgeriHartie`, `masoaraRampa`): un cititor separat al programului (fără etichete), care taie
 *    parcurgerea în treceri după coborâri (o trecere nouă pornește când Z coboară sub fundul de până atunci, după cel
 *    puțin un tur întreg) și MĂSOARĂ pe fiecare trecere: poziția intrării față de vârful 0, cotele de plecare și de
 *    sosire, lungimea în plan a coborârii (din panta bucăților care coboară în afara zonelor), lungimea trecerii,
 *    acoperirea buclei la fund, cât coboară sub profil, coborârile pe verticală. Valorile așteptate vin din perimetrul
 *    ANALITIC (`rampa.cazuri.ts`), niciodată din program.
 *
 * TOLERANȚELE (G-code-ul rotunjește cotele la 3 zecimale, F la 0,1; aplicația socotește pe geometria exactă):
 * - pe Z, TOL_Z_RAMPA = 0,002 (ca la urechi: Z scris ±0,0005, interpolat între capete rotunjite ±0,0005, d citit din
 *   program ±0,0005);
 * - pe s, o bandă T = 0,0015 + 0,0042·Θ, cu Θ = suma |θ| a arcelor LANȚULUI întreg (urechi.ts: pe o dreaptă erorile
 *   capetelor se telescopează; pe arc, raza din I / J rotunjite abate r·|θ| cu ≤ 0,0021·|θ|, iar P măsurat pe primul tur
 *   mută σ_k cu (k − 1)·0,0021·Θ_tur, deci în total ≤ 0,0042·Θ). Z-ul programului în σ e comparat cu minimul și maximul
 *   lui Z(σ′), |σ′ − σ| ≤ T, ±TOL_Z_RAMPA: o rampă abruptă (Lr = P/2 pe un cerc mic) sau un flanc nu transformă o
 *   deplasare de rotunjire în σ într-o eroare mare în Z;
 * - fața de sus: Z = 0 ± 0,0005; adâncimea ultimei treceri față de operație: ±0,001 (eticheta și Z, câte 0,0005);
 * - intrarea e_k + Lr la cel mult T₁ de ÎNCEPUTUL unei zone e ambiguă (aplicația, pe geometria exactă, o poate scoate
 *   sau nu): ambele șiruri de intrări sunt candidate, iar programul trebuie să urmeze unul (ALEGERE). T₁ = 0,0015 +
 *   0,0042·Θ₁, cu Θ₁ al PRIMULUI tur: zonele și intrările se socotesc pe P măsurat, a cărui eroare e a unui tur (nu a
 *   lanțului întreg; cu banda lanțului, 18 treceri pe un dreptunghi cu colțuri dădeau 2¹⁷ candidate, iar plafonul tăia
 *   chiar varianta regulii: un fals găsit pe corpus). La capătul zonei, variantele diferă cu mai puțin de T₁;
 * - pe hârtie: poziția intrării și lungimea trecerii ±(0,003 + 0,0042·Θ până acolo); cotele ±TOL_Z_RAMPA; lungimea
 *   coborârii ±(Lr·(0,0011·m / ΣΔZ + 0,0015·m / Σs) + 0,003), cu m bucăți măsurate; acoperirea și coborârea sub fund pe
 *   banda tp = 0,003 + 0,0042·Θ (fundul de pe hârtie față de program, ±TOL_Z_RAMPA), eșantionată la 0,05 mm: niciun gol
 *   mai lung de 2·tp + 0,1 (cusăturile și pasul eșantionării; o pană de rampă are Lr).
 *
 * Felia 2.5b (ADR 0030, sesiune independentă): legarea etichetei de operație se face pe tuplul (urechi, rampă,
 * intrări); pe o operație cu intrări (fără rampă, nu `pe-linie`), forma trecerilor (invarianta 11 amendată: plonjarea în
 * A, intrarea, bucla, ieșirea) o judecă `intrari.ts`, deci `formaFaraRampa` nu mai rulează aici pentru ea
 * (`regula0030 = false`: comportamentul de dinainte, pentru proba echivalenței).
 */
import type { IntrariO, RampaO, UrechiO } from './document.ts';
import { citeste, regulaArcGrbl, type Eveniment, type Punct3 } from './gcode.ts';
import type { Primitiva, Regiune } from './regiune.ts';
import { LUNGIME_MINIMA, orientareMontaj, TOL_INCHIDERE, TOL_SUB, type EtichetaActiva, type P2 } from './sens.ts';
import {
  peDrum, profil, rupturi, TOL_S_FIX, TOL_S_PE_RADIAN, TOL_Z_URECHI, zProfil, type BucataTrecere, type Profil, type Trecere,
} from './urechi.ts';

export const TOL_Z_RAMPA = TOL_Z_URECHI;
/** Fața de sus (Z = 0), cu rotunjirea la 3 zecimale. */
export const TOL_FATA = 0.0005 + 1e-9;
/** Adâncimea ultimei treceri față de adâncimea operației: eticheta și Z-ul, câte 0,0005. */
export const TOL_ADANCIME_FINALA = 0.001 + 1e-9;
/** Un punct stă pe drumul altui lanț (aceeași buclă), cu rotunjirea capetelor și a lui I / J. */
export const TOL_PE_DRUM = 0.005;
/** Adâncimea din etichetă față de cea a operației (ca la invariantele 2, 9 și 10). */
const TOL_ADANCIME = 0.0005 + 1e-9;
/** Cel mult atâtea șiruri de intrări candidate (intrările ambigue sunt rare: o ramificare la câteva sute de lanțuri). */
const CANDIDATE_MAX = 16;

const mod = (s: number, P: number): number => ((s % P) + P) % P;
const mm = (v: number): string => v.toFixed(3);

// ---------------------------------------------------------------------------------------------------------------
// Lanțurile (definiția din antet).

export type PasL = {
  readonly linia: number;
  readonly cod: 1 | 2 | 3;
  readonly a: P2; readonly b: P2;
  /** La arc: centrul văzut de GRBL, raza din I / J, unghiul cu semn (în document). */
  readonly c?: P2; readonly r?: number; readonly unghi?: number;
  readonly za: number; readonly zb: number;
  readonly s0: number; readonly s1: number;
  /** X și Y neschimbate (în textul programului). */
  readonly vertical: boolean;
  readonly f?: number;
};

export type MiscareDoc = { readonly linia: number; readonly cod: number; readonly a: Punct3; readonly b: Punct3; readonly f?: number };

export type Lant = {
  /** Indicele etichetei active (−1: înaintea primei etichete). */
  readonly eticheta: number;
  readonly pasi: readonly PasL[];
  /** Mișcarea de dinaintea lanțului (în document), dacă există. */
  readonly inainte: MiscareDoc | null;
  readonly lungime: number;
  /** Suma |θ| a arcelor lanțului (rad). */
  readonly theta: number;
};

/** Mișcarea ca pas al unui lanț, în document, cu s pornind de la `s`. */
function pasDin(m: Extract<Eveniment, { tip: 'mutare' }>['m'], laDoc: (p: Punct3) => Punct3, orientare: 1 | -1, s: number): PasL {
  const a = laDoc(m.a), b = laDoc(m.b);
  const A: P2 = { x: a[0], y: a[1] }, B: P2 = { x: b[0], y: b[1] };
  const vertical = m.a[0] === m.b[0] && m.a[1] === m.b[1];
  const i = m.i ?? 0, j = m.j ?? 0;
  const f = m.f === undefined ? {} : { f: m.f };
  if (m.cod === 1 || m.cod === 0 || (i === 0 && j === 0) || vertical) {
    const L = vertical ? 0 : Math.hypot(B.x - A.x, B.y - A.y);
    return { linia: m.linia, cod: 1, a: A, b: B, za: a[2], zb: b[2], s0: s, s1: s + L, vertical, ...f };
  }
  const { unghi, raza } = regulaArcGrbl(m);
  const c3 = laDoc([m.a[0] + i, m.a[1] + j, m.a[2]]);
  const L = raza * Math.abs(unghi);
  return {
    linia: m.linia, cod: m.cod, a: A, b: B, c: { x: c3[0], y: c3[1] }, r: raza, unghi: unghi * orientare,
    za: a[2], zb: b[2], s0: s, s1: s + L, vertical, ...f,
  };
}

/** Lanțurile unui program, în ordinea lor, fiecare cu eticheta activă (`liniiEtichete`, crescător). */
export function lanturile(evenimente: readonly Eveniment[], liniiEtichete: readonly number[], laDoc: (p: Punct3) => Punct3): Lant[] {
  const orientare = orientareMontaj(laDoc);
  const rez: Lant[] = [];
  let iE = -1;
  let acum: { eticheta: number; pasi: PasL[]; inainte: MiscareDoc | null; s: number; theta: number } | null = null;
  let precedenta: MiscareDoc | null = null;
  const inchide = (): void => {
    if (acum && acum.pasi.length) rez.push({ eticheta: acum.eticheta, pasi: acum.pasi, inainte: acum.inainte, lungime: acum.s, theta: acum.theta });
    acum = null;
  };
  for (const e of evenimente) {
    if (e.tip !== 'mutare') continue;
    const m = e.m;
    while (iE + 1 < liniiEtichete.length && liniiEtichete[iE + 1]! < m.linia) iE++;
    if (acum !== null && (acum as { eticheta: number }).eticheta !== iE) inchide();
    const a = laDoc(m.a), b = laDoc(m.b);
    const doc: MiscareDoc = { linia: m.linia, cod: m.cod, a, b, ...(m.f === undefined ? {} : { f: m.f }) };
    if (m.cod === 0 || !m.startCunoscut || !(b[2] < -TOL_SUB)) {
      inchide();
      precedenta = doc;
      continue;
    }
    acum ??= { eticheta: iE, pasi: [], inainte: precedenta, s: 0, theta: 0 };
    const p = pasDin(m, laDoc, orientare, acum.s);
    acum.pasi.push(p);
    acum.s = p.s1;
    if (p.unghi !== undefined) acum.theta += Math.abs(p.unghi);
    precedenta = doc;
  }
  inchide();
  return rez;
}

/** Punctul pasului la fracțiunea f (0 = start, 1 = capăt). */
export function punctPas(p: PasL, f: number): P2 {
  if (p.c === undefined || p.unghi === undefined || p.r === undefined) return { x: p.a.x + (p.b.x - p.a.x) * f, y: p.a.y + (p.b.y - p.a.y) * f };
  const u = Math.atan2(p.a.y - p.c.y, p.a.x - p.c.x) + p.unghi * f;
  return { x: p.c.x + p.r * Math.cos(u), y: p.c.y + p.r * Math.sin(u) };
}

/** Z-ul pasului în σ (liniar în fracțiunea parcursă, și pe elice). */
const zIn = (p: PasL, s: number): number => (p.s1 > p.s0 ? p.za + ((p.zb - p.za) * (s - p.s0)) / (p.s1 - p.s0) : p.zb);

/** Cea mai mică distanță de la q la pas (dreapta: proiecția; arcul: unghiul adus în arc) și fracțiunea ei. */
function apropiere(p: PasL, q: P2): { readonly d: number; readonly f: number } {
  if (p.vertical) return { d: Math.hypot(q.x - p.a.x, q.y - p.a.y), f: 0 };
  if (p.c === undefined || p.unghi === undefined || p.r === undefined) {
    const vx = p.b.x - p.a.x, vy = p.b.y - p.a.y;
    const L2 = vx * vx + vy * vy;
    const t = L2 > 0 ? Math.max(0, Math.min(1, ((q.x - p.a.x) * vx + (q.y - p.a.y) * vy) / L2)) : 0;
    return { d: Math.hypot(p.a.x + vx * t - q.x, p.a.y + vy * t - q.y), f: t };
  }
  const u0 = Math.atan2(p.a.y - p.c.y, p.a.x - p.c.x);
  const uq = Math.atan2(q.y - p.c.y, q.x - p.c.x);
  let rel = (uq - u0) * Math.sign(p.unghi);
  rel = mod(rel, 2 * Math.PI);
  const sweep = Math.abs(p.unghi);
  let f: number;
  if (rel <= sweep) f = sweep > 0 ? rel / sweep : 0;
  else f = rel - sweep < 2 * Math.PI - rel ? 1 : 0;
  const x = punctPas(p, f);
  return { d: Math.hypot(x.x - q.x, x.y - q.y), f };
}

/**
 * P măsurat: drumul de la startul lanțului până la prima întoarcere în el (la cel mult TOL_INCHIDERE), după cel puțin
 * LUNGIME_MINIMA. Întâi capetele mișcărilor (vârful 0 e un capăt de primitivă, deci de mișcare, la fiecare tur); dacă
 * niciun capăt nu se întoarce, cea mai apropiată trecere pe o mișcare, după ce lanțul s-a depărtat de start. `null`:
 * lanțul nu se închide.
 */
export function perimetrulLantului(l: Lant): number | null {
  const start = l.pasi[0]!.a;
  for (const p of l.pasi) {
    if (p.s1 >= LUNGIME_MINIMA && Math.hypot(p.b.x - start.x, p.b.y - start.y) <= TOL_INCHIDERE) return p.s1;
  }
  let plecat = false;
  for (const p of l.pasi) {
    if (!plecat) {
      if (Math.hypot(p.b.x - start.x, p.b.y - start.y) > 4 * TOL_INCHIDERE) plecat = true;
      continue;
    }
    const x = apropiere(p, start);
    if (x.d <= TOL_INCHIDERE && p.s0 + x.f * (p.s1 - p.s0) >= LUNGIME_MINIMA) return p.s0 + x.f * (p.s1 - p.s0);
  }
  return null;
}

// ---------------------------------------------------------------------------------------------------------------
// Formulele ADR 0029 §2 (zonele, scoate, intrările) și profilul așteptat.

/** Zona urechii j: [c_j − h − ℓ, c_j + h + ℓ] (ADR 0028 §3). */
export type ZonaU = { readonly a: number; readonly b: number };

/** Zonele urechilor pe o buclă de lungime P; `[]` fără urechi; `null` dacă urechile nu încap (W > 0,9·S). */
export function zoneleUrechilor(P: number, u: { readonly numar: number; readonly latime: number } | null): ZonaU[] | null {
  if (u === null) return [];
  const S = P / u.numar;
  if (u.latime > 0.9 * S) return null;
  const h = u.latime / 2;
  const l = Math.min(u.latime / 2, 0.45 * (S - u.latime));
  return Array.from({ length: u.numar }, (_, j) => ({ a: (j + 0.5) * S - h - l, b: (j + 0.5) * S + h + l }));
}

/** `scoate(s)`: capătul zonei dacă s (modulo P) e STRICT în interiorul ei, altfel s (desfășurat). */
export function scoate(s: number, P: number, zone: readonly ZonaU[]): number {
  const u = mod(s, P);
  for (const z of zone) if (u > z.a && u < z.b) return s + (z.b - u);
  return s;
}

/** Intrările e₁ … e_n (desfășurate): e₁ = 0, e_{k+1} = scoate(e_k + Lr). */
export function intrarile(P: number, Lr: number, zone: readonly ZonaU[], n: number): number[] {
  const e = [0];
  while (e.length < n) e.push(scoate(e[e.length - 1]! + Lr, P, zone));
  return e;
}

/**
 * Șirurile de intrări candidate, până la n, cu ramificarea de la toleranțe (antetul): o intrare e_k + Lr la cel mult T
 * de începutul unei zone poate rămâne sau poate fi scoasă la capătul zonei.
 */
export function intrarileCandidate(P: number, Lr: number, zone: readonly ZonaU[], n: number, T: number): number[][] {
  let sir: number[][] = [[0]];
  for (let k = 1; k < n; k++) {
    const urm: number[][] = [];
    for (const e of sir) {
      const brut = e[e.length - 1]! + Lr;
      const u = mod(brut, P);
      const z = zone.find((x) => Math.abs(u - x.a) <= T);
      if (z) {
        // Întâi varianta regulii (pe P măsurat), apoi cealaltă: plafonul de candidate nu taie niciodată regula.
        const regula = scoate(brut, P, zone);
        urm.push([...e, regula], [...e, regula === brut ? brut + (z.b - u) : brut]);
      } else {
        urm.push([...e, scoate(brut, P, zone)]);
      }
    }
    sir = urm.slice(0, CANDIDATE_MAX);
  }
  return sir;
}

/** O trecere a profilului așteptat: fereastra ei [sigma, capat], adâncimile și profilul urechilor (null: Z = −d). */
export type TrecereR = {
  readonly k: number; readonly sigma: number; readonly capat: number;
  readonly d: number; readonly dPrec: number; readonly pr: Profil | null;
};

/** Profilul așteptat al unui lanț (ADR 0029 §2), cu punctele lui de frângere. */
export type ProfilRampa = {
  readonly P: number; readonly Lr: number; readonly treceri: readonly TrecereR[];
  /** Capătul turei ultimei treceri: σ_n + Lr + P. */
  readonly capat: number;
};

const zP = (pr: ProfilRampa, t: TrecereR, s: number): number => (t.pr ? zProfil(t.pr, mod(s, pr.P)) : -t.d);
const zR = (pr: ProfilRampa, t: TrecereR, s: number): number => -(t.dPrec + ((t.d - t.dPrec) * (s - t.sigma)) / pr.Lr);

/** Trecerea care conține σ (ultima, pentru σ dincolo de capăt). */
function trecereLa(pr: ProfilRampa, s: number): TrecereR {
  for (const t of pr.treceri) if (s < t.capat) return t;
  return pr.treceri[pr.treceri.length - 1]!;
}

/** Z(σ) cerut de §2: max(zR_k, zP_k) pe rampă, zP_k pe tură. */
export function zCerut(pr: ProfilRampa, s: number): number {
  const t = trecereLa(pr, s);
  if (s < t.sigma + pr.Lr) return Math.max(zR(pr, t, s), zP(pr, t, s));
  return zP(pr, t, s);
}

/** Fundul trecerii care conține σ: zP_k(σ). */
export function zFund(pr: ProfilRampa, s: number): number {
  return zP(pr, trecereLa(pr, s), s);
}

/** Rupturile profilului unei treceri, desfășurate, în [a, b]. */
function rupturiIn(t: TrecereR, P: number, a: number, b: number): number[] {
  if (!t.pr) return [];
  const r = rupturi(t.pr);
  const rez: number[] = [];
  for (let m = Math.floor(a / P) - 1; m * P <= b; m++) for (const q of r) if (m * P + q >= a && m * P + q <= b) rez.push(m * P + q);
  return rez;
}

/** Punctele de frângere ale lui Z(σ) (capetele rampelor, rupturile, întâlnirile zR = zP) și ale lui zP. */
export function frangerile(pr: ProfilRampa): { readonly cerut: number[]; readonly fund: number[] } {
  const cerut: number[] = [], fund: number[] = [];
  for (const t of pr.treceri) {
    const rup = rupturiIn(t, pr.P, t.sigma, t.capat);
    fund.push(t.sigma, ...rup);
    cerut.push(t.sigma, t.sigma + pr.Lr, ...rup);
    // Întâlnirile zR = zP pe rampă: pe fiecare bucată dintre rupturi, zR − zP e liniar.
    const repere = [t.sigma, ...rup.filter((q) => q > t.sigma && q < t.sigma + pr.Lr), t.sigma + pr.Lr];
    for (let i = 0; i + 1 < repere.length; i++) {
      const a = repere[i]!, b = repere[i + 1]!;
      const fa = zR(pr, t, a) - zP(pr, t, a), fb = zR(pr, t, b) - zP(pr, t, b);
      if ((fa > 0 && fb < 0) || (fa < 0 && fb > 0)) cerut.push(a + ((b - a) * fa) / (fa - fb));
    }
  }
  return { cerut: cerut.sort((x, y) => x - y), fund: fund.sort((x, y) => x - y) };
}

/**
 * Profilul cerut de §2 pentru o buclă de lungime P, cu intrările date (desfășurate), adâncimile d₁ … d_n, urechile (cu
 * vârful) și Lr. `null` dacă urechile nu încap pe o trecere.
 */
export function profilRampa(
  P: number, Lr: number, e: readonly number[], d: readonly number[], urechi: UrechiO | null, varf: number,
): ProfilRampa | null {
  const n = d.length;
  const treceri: TrecereR[] = [];
  for (let k = 0; k < n; k++) {
    const sigma = e[k]! + k * P;
    const capat = k + 1 < n ? e[k + 1]! + (k + 1) * P : sigma + Lr + P;
    let pr: Profil | null = null;
    if (urechi !== null && d[k]! > varf + TOL_Z_RAMPA) {
      pr = profil(P, urechi, varf, d[k]!);
      if (!pr) return null;
    }
    treceri.push({ k: k + 1, sigma, capat, d: d[k]!, dPrec: k === 0 ? 0 : d[k - 1]!, pr });
  }
  return { P, Lr, treceri, capat: treceri[n - 1]!.capat };
}

/**
 * Cel mai jos și cel mai sus f(σ′), σ′ ∈ [σ − T, σ + T], pentru f liniară pe bucăți cu frângerile date. Banda NU se
 * taie la marginile ferestrei judecate: f e definită pe tot lanțul, iar rotunjirea mută programul în ambele sensuri și
 * la marginea ferestrei (un flanc chiar la începutul turei, în corpus, ieșea fals cu 0,006).
 */
function banda(f: (s: number) => number, fr: readonly number[], s: number, T: number): readonly [number, number] {
  const a = s - T, b = s + T;
  const v = [f(a), f(b)];
  for (const q of fr) if (q > a && q < b) v.push(f(q));
  return [Math.min(...v), Math.max(...v)];
}

export type Abatere = { readonly abatere: number; readonly linia: number; readonly s: number; readonly z: number; readonly asteptat: readonly [number, number] };

/**
 * Cea mai mare abatere a Z-ului lanțului de la f pe [w0, w1] (pe bandă): `egal` cere Z în bandă, `nu-sub` doar
 * deasupra ei. Punctele: capetele mișcărilor din fereastră și frângerile (±T) din interiorul lor.
 */
export function abatere(
  l: Lant, f: (s: number) => number, fr: readonly number[], T: number, w0: number, w1: number, fel: 'egal' | 'nu-sub',
): Abatere {
  let rau: Abatere = { abatere: 0, linia: l.pasi[0]!.linia, s: w0, z: 0, asteptat: [0, 0] };
  const repere = fr.flatMap((q) => [q - T, q, q + T]);
  for (const p of l.pasi) {
    if (p.s1 < w0 || p.s0 > w1) continue;
    const a = Math.max(p.s0, w0), b = Math.min(p.s1, w1);
    const puncte: Array<readonly [number, number]> = p.vertical ? [[a, p.za], [a, p.zb]] : [[a, zIn(p, a)], [b, zIn(p, b)]];
    if (!p.vertical) for (const q of repere) if (q > a && q < b) puncte.push([q, zIn(p, q)]);
    for (const [s, z] of puncte) {
      const [lo, hi] = banda(f, fr, s, T);
      const x = fel === 'egal' ? Math.max(0, lo - TOL_Z_RAMPA - z, z - hi - TOL_Z_RAMPA) : Math.max(0, lo - TOL_Z_RAMPA - z);
      if (x > rau.abatere) rau = { abatere: x, linia: p.linia, s, z, asteptat: [lo, hi] };
    }
  }
  return rau;
}

/** Cel mai jos Z al lanțului pe [w0, w1] (capetele mișcărilor din fereastră, interpolate la margini). */
function zMinIn(l: Lant, w0: number, w1: number): number {
  let z = Infinity;
  for (const p of l.pasi) {
    if (p.s1 < w0 || p.s0 > w1) continue;
    if (p.vertical) { z = Math.min(z, p.za, p.zb); continue; }
    z = Math.min(z, zIn(p, Math.max(p.s0, w0)), zIn(p, Math.min(p.s1, w1)));
  }
  return z;
}

// ---------------------------------------------------------------------------------------------------------------
// Legarea etichetei de operație, pe perechea (urechi, rampă).

export type ParametriEticheta = {
  readonly urechi: UrechiO | null; readonly rampa: RampaO | null; readonly adancime: number;
  /** ADR 0030: intrările operației legate (`null` = fără). */
  readonly intrari: IntrariO | null;
};

export function parametriiEtichetelor(etichete: readonly EtichetaActiva[], reg: Regiune): Array<ParametriEticheta | { readonly motiv: string } | null> {
  const aparitii = new Map<string, number>();
  const text = (u: UrechiO | null, r: RampaO | null, i: IntrariO | null): string =>
    `${u === null ? 'null' : `${u.numar}|${u.latime}|${u.grosime}`}#${r === null ? 'null' : String(r.lungime)}#${i === null ? 'null' : String(i.raza)}`;
  return etichete.map(({ eticheta: et }) => {
    if (!et) return null;
    const t = reg.taieturi.get(et.idLume);
    const adancimi = t?.laturi.get(et.latura) ?? [];
    const urechi = t?.urechi?.get(et.latura) ?? [];
    const rampe = t?.rampe?.get(et.latura) ?? [];
    const intrari = t?.intrari?.get(et.latura) ?? [];
    const candidate = adancimi.flatMap((a, k) => (Math.abs(a - et.adancime) <= TOL_ADANCIME ? [k] : []));
    if (candidate.length === 0) return { motiv: `${et.idLume} n-are o operație ${et.latura} de ${et.adancime} mm` };
    const cheie = `${et.idLume}|${et.latura}|${candidate.join(',')}`;
    const k = aparitii.get(cheie) ?? 0;
    aparitii.set(cheie, k + 1);
    const valori = candidate.map((c) => ({ urechi: urechi[c] ?? null, rampa: rampe[c] ?? null, adancime: adancimi[c]!, intrari: intrari[c] ?? null }));
    if (valori.every((v) => text(v.urechi, v.rampa, v.intrari) === text(valori[0]!.urechi, valori[0]!.rampa, valori[0]!.intrari))) return valori[0]!;
    if (k < valori.length) return valori[k]!;
    return { motiv: `${et.idLume} are ${valori.length} operații ${et.latura} de ${et.adancime} mm cu urechi sau rampe diferite, iar eticheta apare de ${k + 1} ori` };
  });
}

// ---------------------------------------------------------------------------------------------------------------
// A. Invariantele 10 (amendată) și 11, în poartă.

export type IncalcareRampa = { readonly invarianta: 10 | 11; readonly linia: number; readonly mesaj: string };

/** Banda pe s a unui lanț (antetul). */
export const tolLant = (l: Lant): number => TOL_S_FIX + TOL_S_PE_RADIAN * l.theta;

/** O mișcare pe verticală care coboară (în material: lanțul ține doar mișcări care se termină sub fața de sus). */
const coboaraPeVerticala = (p: PasL): boolean => p.vertical && p.zb < p.za - 1e-9;

/** Precizarea din 10.10: cât poate coborî o mișcare scrisă cu X și Y neschimbate, pe o trecere cu pasul Δd și rampa Lr. */
export const tolVerticala = (deltaD: number, Lr: number): number => (deltaD * 0.001) / Lr + 0.0005;

/** ADR 0029 §2, precizarea din 10.10: rampa minimă, în mm. */
export const RAMPA_MINIMA = 1;

type Judecata = { readonly v10: IncalcareRampa[]; readonly v11: IncalcareRampa[]; readonly scor: number };

/** Un lanț al unei operații cu rampă, pe un șir de intrări candidat. */
function judecaCuRampa(l: Lant, cine: string, par: ParametriEticheta, rampa: RampaO, P: number, e0: readonly number[], varf: number): Judecata {
  const v10: IncalcareRampa[] = [], v11: IncalcareRampa[] = [];
  const T = tolLant(l);
  const Lr = Math.min(rampa.lungime, P / 2);
  // n: lungimea lanțului e σ_n + Lr + P.
  let n = 1, dif = Infinity;
  for (let k = 1; k <= e0.length; k++) {
    const x = Math.abs(l.lungime - (e0[k - 1]! + (k - 1) * P + Lr + P));
    if (x < dif) { dif = x; n = k; }
  }
  const e = e0.slice(0, n);
  const asteptata = e[n - 1]! + (n - 1) * P + Lr + P;
  if (dif > T) {
    v11.push({ invarianta: 11, linia: l.pasi[0]!.linia, mesaj: `rampa: lanțul lui ${cine} are ${mm(l.lungime)} mm în plan; cu P ${mm(P)}, Lr ${mm(Lr)} și intrările ${e.map(mm).join(', ')}, ${n} treceri cer ${mm(asteptata)}` });
  }
  // d_k din program, pe fereastra fiecărei treceri (fără marginile de T).
  const d: number[] = [];
  for (let k = 0; k < n; k++) {
    const w0 = e[k]! + k * P, w1 = k + 1 < n ? e[k + 1]! + (k + 1) * P : Math.min(l.lungime, asteptata);
    const z = zMinIn(l, w0 + T, w1 - T);
    d.push(Number.isFinite(z) ? -z : d[k - 1] ?? 0);
  }
  const unde = (k: number): string => `trecerea ${k + 1} (σ ${mm(e[k]! + k * P)})`;
  // Nicio coborâre pe verticală în material, peste toleranța din precizarea din 10.10 (pe trecerea în care cade).
  for (const p of l.pasi) {
    if (!coboaraPeVerticala(p)) continue;
    let k = 0;
    while (k + 1 < n && e[k + 1]! + (k + 1) * P <= p.s0 + 1e-9) k++;
    const tol = tolVerticala(d[k]! - (k === 0 ? 0 : d[k - 1]!), Lr);
    if (p.za - p.zb > tol + 1e-9) {
      v11.push({ invarianta: 11, linia: p.linia, mesaj: `rampa: ${cine} coboară pe verticală în material, de la ${mm(p.za)} la ${mm(p.zb)} (toleranța ${tol.toFixed(4)} mm)` });
      break;
    }
  }
  d.forEach((dk, k) => {
    const prec = k === 0 ? 0 : d[k - 1]!;
    if (!(dk > prec + TOL_Z_RAMPA)) v11.push({ invarianta: 11, linia: l.pasi[0]!.linia, mesaj: `rampa: ${cine}, ${unde(k)}: fundul ${mm(-dk)} nu e sub cel al trecerii de dinainte (${mm(-prec)})` });
  });
  if (Math.abs(d[n - 1]! - par.adancime) > TOL_ADANCIME_FINALA) {
    v11.push({ invarianta: 11, linia: l.pasi[0]!.linia, mesaj: `rampa: ${cine}: ultima trecere ajunge la ${mm(-d[n - 1]!)}, nu la adâncimea operației (${par.adancime} mm)` });
  }
  const pr = profilRampa(P, Lr, e, d, par.urechi, varf);
  if (!pr) {
    v10.push({ invarianta: 10, linia: l.pasi[0]!.linia, mesaj: `urechile lui ${cine} nu încap pe bucla de ${mm(P)} mm (W > 0,9·S): exportul trebuia refuzat` });
    return { v10, v11, scor: Infinity };
  }
  const fr = frangerile(pr);
  // 11: Z-ul cerut de §2 pe tot lanțul (și cât trebuia să țină).
  const x = abatere(l, (s) => zCerut(pr, s), fr.cerut, T, 0, Math.min(l.lungime, pr.capat), 'egal');
  if (x.abatere > 0) {
    v11.push({ invarianta: 11, linia: x.linia, mesaj: `rampa: ${cine} are Z ${mm(x.z)} la σ ${mm(x.s)}; §2 cere ${mm(x.asteptat[0])}…${mm(x.asteptat[1])} (P ${mm(P)}, Lr ${mm(Lr)}, intrările ${e.map(mm).join(', ')})` });
  }
  if (l.lungime > pr.capat + T) {
    v11.push({ invarianta: 11, linia: l.pasi[l.pasi.length - 1]!.linia, mesaj: `rampa: ${cine} merge ${mm(l.lungime - pr.capat)} mm dincolo de capătul turei ultimei treceri (σ ${mm(pr.capat)})` });
  }
  // 10 amendată: pe fiecare trecere, nimic sub fund; tura la fund, cel puțin un tur.
  for (const t of pr.treceri) {
    const w1 = Math.min(t.capat, l.lungime);
    const sub = abatere(l, (s) => zP(pr, t, s), fr.fund, T, t.sigma + T, w1 - T, 'nu-sub');
    if (sub.abatere > 0) {
      v10.push({ invarianta: 10, linia: sub.linia, mesaj: `urechile (cu rampă): ${cine}, trecerea ${t.k}: Z ${mm(sub.z)} la σ ${mm(sub.s)}, sub fundul trecerii (${mm(sub.asteptat[0])})` });
    }
    const tura = abatere(l, (s) => zP(pr, t, s), fr.fund, T, t.sigma + pr.Lr + T, w1 - T, 'egal');
    if (tura.abatere > 0) {
      v10.push({ invarianta: 10, linia: tura.linia, mesaj: `urechile (cu rampă): ${cine}, trecerea ${t.k}: pe tură, Z ${mm(tura.z)} la σ ${mm(tura.s)}; fundul cere ${mm(tura.asteptat[0])}…${mm(tura.asteptat[1])}` });
    }
  }
  if (l.lungime < pr.capat - T) {
    v10.push({ invarianta: 10, linia: l.pasi[l.pasi.length - 1]!.linia, mesaj: `urechile (cu rampă): ${cine}: tura ultimei treceri se oprește la σ ${mm(l.lungime)}, nu la ${mm(pr.capat)}: ${mm(pr.capat - l.lungime)} mm din buclă rămân netăiați la fund (pană sub rampă)` });
  }
  return { v10, v11, scor: v10.length + v11.length };
}

/** Invarianta 11 pe un lanț fără rampă (forma de la §4), fără ordinea și punctul plonjării (judecate pe etichetă). */
export function formaFaraRampa(l: Lant, cine: string): IncalcareRampa[] {
  const rez: IncalcareRampa[] = [];
  const p0 = l.pasi[0]!;
  if (!(coboaraPeVerticala(p0) && p0.za >= -TOL_SUB)) {
    rez.push({ invarianta: 11, linia: p0.linia, mesaj: `forma fără rampă (§4): lanțul lui ${cine} nu începe cu o plonjare pe verticală din aer` });
  }
  for (const p of l.pasi.slice(1)) {
    if (coboaraPeVerticala(p)) {
      rez.push({ invarianta: 11, linia: p.linia, mesaj: `forma fără rampă (§4): ${cine} coboară pe verticală de la ${mm(p.za)} la ${mm(p.zb)} fără ridicare între treceri` });
      break;
    }
  }
  const start = p0.b;
  const plan = l.pasi.filter((p) => !p.vertical);
  const k = plan.findIndex((p) => p.s1 >= LUNGIME_MINIMA && Math.hypot(p.b.x - start.x, p.b.y - start.y) <= TOL_INCHIDERE);
  if (k < 0 || k !== plan.length - 1) {
    rez.push({
      invarianta: 11, linia: (plan[k + 1] ?? plan[plan.length - 1] ?? p0).linia,
      mesaj: `forma fără rampă (§4): lanțul lui ${cine} ${k < 0 ? 'nu se întoarce în punctul plonjării' : 'trece de punctul plonjării și continuă'} (o trecere = o buclă, de la plonjare până la ridicare)`,
    });
  }
  return rez;
}

/** Punctul q stă pe drumul lanțului (la cel mult TOL_PE_DRUM). */
function peLant(l: Lant, q: P2): boolean {
  return l.pasi.some((p) => !p.vertical && apropiere(p, q).d <= TOL_PE_DRUM);
}

/**
 * Invariantele 10 (amendată, pe operațiile cu rampă) și 11 pe un program. `cuRampa` = indicii etichetelor legate de o
 * operație cu rampă (invarianta 10 din `urechi.ts` nu le mai judecă pe bucle).
 */
export function verificaRampa(
  evenimente: readonly Eveniment[], etichete: readonly EtichetaActiva[], reg: Regiune, laDoc: (p: Punct3) => Punct3, grosimeFoaie: number,
  regula0030 = true,
): { readonly incalcari: IncalcareRampa[]; readonly cuRampa: ReadonlySet<number> } {
  const rez: IncalcareRampa[] = [];
  const par = parametriiEtichetelor(etichete, reg);
  const cuRampa = new Set<number>();
  par.forEach((x, i) => { if (x && !('motiv' in x) && x.rampa !== null) cuRampa.add(i); });
  // Precizarea din 10.10: o operație cu rampa sub 1 mm trebuia refuzată la export (o dată pe etichetă).
  etichete.forEach((e, i) => {
    const x = par[i];
    if (!e.eticheta || !x || 'motiv' in x || x.rampa === null || !(x.rampa.lungime < RAMPA_MINIMA)) return;
    rez.push({ invarianta: 11, linia: e.linia, mesaj: `rampa lui ${e.eticheta.idLume}: ${x.rampa.lungime} mm e sub minimul de ${RAMPA_MINIMA} mm: exportul trebuia refuzat` });
  });
  const peEticheta = new Map<number, Lant[]>();
  for (const l of lanturile(evenimente, etichete.map((e) => e.linia), laDoc)) {
    if (l.eticheta < 0) continue;
    const et = etichete[l.eticheta]!.eticheta;
    const x = par[l.eticheta];
    if (!et || !x) continue;
    const cine = `${et.idLume} (${et.latura})`;
    if ('motiv' in x) {
      rez.push({ invarianta: 11, linia: l.pasi[0]!.linia, mesaj: `rampa: ${x.motiv}` });
      continue;
    }
    if (x.rampa === null) {
      // ADR 0030 §7: pe o operație cu intrări, forma trecerilor e a lui `intrari.ts`.
      if (!(regula0030 && x.intrari !== null && et.latura !== 'pe-linie')) rez.push(...formaFaraRampa(l, cine));
      const lista = peEticheta.get(l.eticheta) ?? [];
      lista.push(l);
      peEticheta.set(l.eticheta, lista);
      continue;
    }
    // Cu rampă: coborârea prin aer până la fața de sus, apoi lanțul de la Z = 0.
    const i = l.inainte;
    const p0 = l.pasi[0]!;
    if (!i || i.cod !== 1 || i.a[0] !== i.b[0] || i.a[1] !== i.b[1] || !(i.b[2] < i.a[2]) || Math.abs(i.b[2]) > TOL_FATA) {
      rez.push({ invarianta: 11, linia: i?.linia ?? p0.linia, mesaj: `rampa: înaintea buclei lui ${cine} nu e coborârea G1 pe verticală, prin aer, până la fața de sus (Z = 0)` });
    }
    if (Math.abs(p0.za) > TOL_FATA) {
      rez.push({ invarianta: 11, linia: p0.linia, mesaj: `rampa: bucla lui ${cine} pleacă de la Z ${mm(p0.za)}, nu de la fața de sus` });
    }
    const P = perimetrulLantului(l);
    if (P === null) {
      rez.push({ invarianta: 11, linia: p0.linia, mesaj: `rampa: lanțul lui ${cine} nu se întoarce în vârful 0 (bucla nu se închide)` });
      continue;
    }
    const Lr = Math.min(x.rampa.lungime, P / 2);
    const theta1 = l.pasi.reduce((s, p) => s + (p.s0 < P && p.unghi !== undefined ? Math.abs(p.unghi) : 0), 0);
    const T1 = TOL_S_FIX + TOL_S_PE_RADIAN * theta1;
    if (x.rampa.lungime >= RAMPA_MINIMA && (P + T1) / 2 < RAMPA_MINIMA) {
      rez.push({ invarianta: 11, linia: p0.linia, mesaj: `rampa: pe bucla lui ${cine} (P ${mm(P)} mm), Lr = ${mm(Lr)} < ${RAMPA_MINIMA} mm: rampa nu încape pe buclă, exportul trebuia refuzat` });
    }
    const varf = x.urechi === null ? Infinity : grosimeFoaie - x.urechi.grosime;
    const zone = zoneleUrechilor(P, x.urechi);
    if (zone === null) {
      rez.push({ invarianta: 10, linia: p0.linia, mesaj: `urechile lui ${cine} nu încap pe bucla de ${mm(P)} mm (W > 0,9·S): exportul trebuia refuzat` });
      continue;
    }
    // Destule intrări cât să treacă de capătul lanțului.
    const nMax = Math.max(1, Math.ceil(l.lungime / (P + Lr)) + 2);
    let cel: Judecata | null = null;
    for (const e of intrarileCandidate(P, Lr, zone, nMax, T1)) {
      const j = judecaCuRampa(l, cine, x, x.rampa, P, e, varf);
      if (!cel || j.scor < cel.scor) cel = j;
      if (j.scor === 0) break;
    }
    if (cel) rez.push(...cel.v10, ...cel.v11);
  }
  // §4, pe etichetă: adâncimile nu scad; trecerile aceleiași bucle plonjează în același punct.
  for (const [i, lista] of peEticheta) {
    const et = etichete[i]!.eticheta!;
    const cine = `${et.idLume} (${et.latura})`;
    let prec = 0;
    lista.forEach((l, k) => {
      const d = -Math.min(...l.pasi.flatMap((p) => [p.za, p.zb]));
      if (d < prec - TOL_Z_RAMPA) {
        rez.push({ invarianta: 11, linia: l.pasi[0]!.linia, mesaj: `forma fără rampă (§4): sub eticheta lui ${cine}, o trecere la ${mm(d)} vine după una la ${mm(prec)} (toate buclele la o adâncime, apoi următoarea)` });
      }
      prec = Math.max(prec, d);
      const s = l.pasi[0]!.b;
      for (const a of lista.slice(0, k)) {
        const sa = a.pasi[0]!.b;
        if (Math.hypot(s.x - sa.x, s.y - sa.y) <= TOL_INCHIDERE) break;
        if (Math.abs(a.lungime - l.lungime) <= 0.01 + tolLant(l) + tolLant(a) && peLant(a, s)) {
          rez.push({ invarianta: 11, linia: l.pasi[0]!.linia, mesaj: `forma fără rampă (§4): ${cine} plonjează în alt punct al aceleiași bucle (${mm(s.x)}, ${mm(s.y)}; înainte în ${mm(sa.x)}, ${mm(sa.y)})` });
          break;
        }
      }
    });
  }
  return { incalcari: rez, cuRampa };
}

// ---------------------------------------------------------------------------------------------------------------
// B. Hârtia: un cititor separat, trecerile tăiate după coborâri, mărimile măsurate.

/** Parcurgerile programului, fără etichete: mișcările consecutive care se termină sub fața de sus. */
export function parcurgeriHartie(text: string, laDoc: (p: Punct3) => Punct3): PasL[][] {
  const { evenimente } = citeste(text);
  const orientare = orientareMontaj(laDoc);
  const rez: PasL[][] = [];
  let acum: PasL[] = [];
  let s = 0;
  for (const e of evenimente) {
    if (e.tip !== 'mutare') continue;
    const m = e.m;
    if (m.cod === 0 || !m.startCunoscut || !(laDoc(m.b)[2] < -1e-6)) {
      if (acum.length) rez.push(acum);
      acum = [];
      s = 0;
      continue;
    }
    const p = pasDin(m, laDoc, orientare, s);
    acum.push(p);
    s = p.s1;
  }
  if (acum.length) rez.push(acum);
  return rez;
}

export type MasuraTrecereR = {
  readonly k: number;
  /** σ-ul intrării (desfășurat, de la vârful 0) și poziția ei pe buclă (modulo P analitic). */
  readonly sigma: number; readonly intrare: number;
  readonly zPlecare: number; readonly zSosire: number;
  /** Lungimea în plan a coborârii, din panta bucăților care coboară în afara zonelor; câte bucăți și ΣΔZ, Σs. */
  readonly coborare: number; readonly bucatiCoborare: number; readonly dzCoborare: number; readonly dsCoborare: number;
  readonly lungime: number;
  /** Partea din buclă atinsă la fundul trecerii (0…1) și cel mai lung gol (mm, pe buclă). */
  readonly acoperire: number; readonly golMaxim: number;
  /** Cât coboară trecerea sub fundul ei (mm; 0 = deloc). */
  readonly subFund: number;
  readonly verticale: number;
  /** Θ al parcurgerii până la capătul trecerii (pentru toleranțe). */
  readonly theta: number;
};

/** Fundul trecerii, pe hârtie: profilul urechilor la adâncimea d (sau −d), pe bucla de lungime P. */
export type FundHartie = (u: number, d: number) => number;

/**
 * Măsoară o parcurgere cu rampă, pe bucla de perimetru ANALITIC P: trecerile încep la mișcarea care coboară sub fundul
 * de până atunci, după cel puțin un tur (P − 0,1 mm) de la începutul trecerii curente; `zone` și `fund` sunt cele de pe
 * hârtie; `dAsteptat` = adâncimile cerute (pentru fund și acoperire); `lungimeRampa` dă toleranța coborârilor pe
 * verticală (precizarea din 10.10).
 */
export function masoaraRampa(
  pasi: readonly PasL[], P: number, zone: readonly ZonaU[], fund: FundHartie, dAsteptat: readonly number[], lungimeRampa = Infinity,
): MasuraTrecereR[] {
  const Lr = Math.min(lungimeRampa, P / 2);
  const inceputuri: number[] = [];
  let zMin = 0;
  let sigmaCur = -Infinity;
  pasi.forEach((p, i) => {
    const jos = Math.min(p.za, p.zb);
    if (jos < zMin - TOL_Z_RAMPA && (inceputuri.length === 0 || p.s0 - sigmaCur >= P - 0.1)) {
      inceputuri.push(i);
      sigmaCur = p.s0;
    }
    zMin = Math.min(zMin, jos);
  });
  const inZona = (s: number): boolean => zone.some((z) => mod(s, P) > z.a && mod(s, P) < z.b);
  const rez: MasuraTrecereR[] = [];
  let theta = 0;
  inceputuri.forEach((i0, k) => {
    const i1 = k + 1 < inceputuri.length ? inceputuri[k + 1]! : pasi.length;
    const ale = pasi.slice(i0, i1);
    const p0 = ale[0]!;
    const sigma = p0.s0;
    const capat = ale[ale.length - 1]!.s1;
    const zPlecare = p0.za;
    const zSosire = Math.min(...ale.flatMap((p) => [p.za, p.zb]));
    const zPrec = k === 0 ? 0 : Math.min(...pasi.slice(0, i0).flatMap((p) => [p.za, p.zb]));
    // Coborârea: bucățile care coboară, cu mijlocul în afara zonelor, înainte de a atinge fundul.
    let ds = 0, dz = 0, m = 0;
    for (const p of ale) {
      if (!(p.zb < p.za - 1e-9)) continue;
      if (!p.vertical && inZona((p.s0 + p.s1) / 2)) continue;
      ds += p.s1 - p.s0;
      dz += p.za - p.zb;
      m++;
      if (p.zb <= zSosire + TOL_Z_RAMPA) break;
    }
    const coborare = dz > 0 ? (ds * (zPrec - zSosire)) / dz : 0;
    // Acoperirea la fund și coborârea sub fund (fundul de pe hârtie, la adâncimea cerută), pe banda de rotunjire.
    for (const p of ale) if (p.unghi !== undefined) theta += Math.abs(p.unghi);
    const tp = 0.003 + TOL_S_PE_RADIAN * theta;
    const d = dAsteptat[k] ?? -zSosire;
    const f = (s: number): number => fund(mod(s, P), d);
    const fb = (s: number): readonly [number, number] => {
      const v = [f(s - tp), f(s - tp / 2), f(s), f(s + tp / 2), f(s + tp)];
      return [Math.min(...v), Math.max(...v)];
    };
    const intervale: Array<readonly [number, number]> = [];
    let subFund = 0;
    for (const p of ale) {
      if (p.vertical) {
        subFund = Math.max(subFund, fb(p.s0)[0] - p.zb);
        continue;
      }
      // Pe bucăți mici (0,05 mm), Z-ul programului față de fund: punctele la fund (±TOL_Z) formează intervale.
      const n = Math.max(1, Math.ceil((p.s1 - p.s0) / 0.05));
      let deschis: number | null = null;
      for (let j = 0; j <= n; j++) {
        const s = p.s0 + ((p.s1 - p.s0) * j) / n;
        const z = zIn(p, s);
        const [lo, hi] = fb(s);
        subFund = Math.max(subFund, lo - z);
        const la = z >= lo - TOL_Z_RAMPA && z <= hi + TOL_Z_RAMPA;
        if (la && deschis === null) deschis = s;
        if ((!la || j === n) && deschis !== null) { intervale.push([deschis, la ? s : s - (p.s1 - p.s0) / n]); deschis = null; }
      }
    }
    // Pe buclă: fiecare interval adus modulo P (tăiat la P), unite.
    const pe: Array<[number, number]> = [];
    for (const [a, b] of intervale) {
      if (b - a >= P) { pe.push([0, P]); continue; }
      const ua = mod(a, P), ub = ua + (b - a);
      if (ub <= P) pe.push([ua, ub]);
      else pe.push([ua, P], [0, ub - P]);
    }
    pe.sort((x, y) => x[0] - y[0]);
    let acoperit = 0, gol = 0, pana = 0;
    for (const [a, b] of pe) {
      if (a > pana) gol = Math.max(gol, a - pana);
      if (b > pana) { acoperit += b - Math.max(a, pana); pana = b; }
    }
    gol = Math.max(gol, P - pana);
    rez.push({
      k: k + 1, sigma, intrare: mod(sigma, P), zPlecare, zSosire, coborare, bucatiCoborare: m, dzCoborare: dz, dsCoborare: ds,
      lungime: capat - sigma, acoperire: acoperit / P, golMaxim: gol, subFund: Math.max(0, subFund),
      verticale: ale.filter((p) => coboaraPeVerticala(p) && p.za - p.zb > tolVerticala(d - (k === 0 ? 0 : dAsteptat[k - 1] ?? 0), Lr) + 1e-9).length, theta,
    });
  });
  return rez;
}

/** Ce cere hârtia pe o trecere (din perimetrul analitic). */
export type AsteptatR = { readonly intrare: number; readonly sigma: number; readonly zPlecare: number; readonly zSosire: number; readonly coborare: number; readonly lungime: number };

/** Valorile cerute de §2 pe hârtie: P analitic, Lr, intrările scoase din zonele analitice, adâncimile d₁ … d_n. */
export function asteptatRampa(P: number, lungimeRampa: number, zone: readonly ZonaU[], d: readonly number[]): AsteptatR[] {
  const Lr = Math.min(lungimeRampa, P / 2);
  const e = intrarile(P, Lr, zone, d.length);
  return d.map((dk, k) => ({
    intrare: mod(e[k]!, P), sigma: e[k]! + k * P, zPlecare: k === 0 ? 0 : -d[k - 1]!, zSosire: -dk, coborare: Lr,
    lungime: k + 1 < d.length ? P + e[k + 1]! - e[k]! : Lr + P,
  }));
}

/** Diferențele dintre măsură și hârtie (goală = parcurgerea e cea de pe hârtie). */
export function comparaRampa(m: readonly MasuraTrecereR[], a: readonly AsteptatR[]): string[] {
  const rele: string[] = [];
  if (m.length !== a.length) rele.push(`${m.length} treceri, nu ${a.length}`);
  m.forEach((x, k) => {
    const y = a[k];
    if (!y) return;
    const tp = 0.003 + TOL_S_PE_RADIAN * x.theta;
    const t = `trecerea ${x.k}`;
    if (Math.abs(x.sigma - y.sigma) > tp) rele.push(`${t}: intrarea la σ ${mm(x.sigma)} (pe buclă ${mm(x.intrare)}), nu ${mm(y.sigma)} (${mm(y.intrare)})`);
    if (Math.abs(x.zPlecare - y.zPlecare) > TOL_Z_RAMPA) rele.push(`${t}: pleacă de la ${mm(x.zPlecare)}, nu de la ${mm(y.zPlecare)}`);
    if (Math.abs(x.zSosire - y.zSosire) > TOL_Z_RAMPA) rele.push(`${t}: ajunge la ${mm(x.zSosire)}, nu la ${mm(y.zSosire)}`);
    const tc = x.dzCoborare > 0 && x.dsCoborare > 0
      ? y.coborare * (0.0011 * x.bucatiCoborare / x.dzCoborare + 0.0015 * x.bucatiCoborare / x.dsCoborare) + 0.003 : 0.003;
    if (Math.abs(x.coborare - y.coborare) > tc) rele.push(`${t}: coboară pe ${mm(x.coborare)} mm în plan, nu pe Lr = ${mm(y.coborare)}`);
    if (Math.abs(x.lungime - y.lungime) > 2 * tp) rele.push(`${t}: are ${mm(x.lungime)} mm în plan, nu ${mm(y.lungime)}`);
    if (x.golMaxim > 2 * tp + 0.1) rele.push(`${t}: la fund lipsesc ${mm(x.golMaxim)} mm din buclă (acoperirea ${(100 * x.acoperire).toFixed(2)} %)`);
    if (x.subFund > TOL_Z_RAMPA) rele.push(`${t}: coboară cu ${mm(x.subFund)} mm sub fundul trecerii`);
    if (x.verticale) rele.push(`${t}: ${x.verticale} coborâri pe verticală în material`);
  });
  return rele;
}

/** Geometria în plan a parcurgerii față de traseul ANALITIC (`peDrum` din `urechi.ts`: arcele rămân arce). */
export function peDrumRampa(pasi: readonly PasL[], drum: readonly Primitiva[]): string[] {
  const bucati: BucataTrecere[] = pasi.filter((p) => !p.vertical).map((p) => ({
    linia: p.linia, cod: p.cod, a: p.a, b: p.b, s0: p.s0, s1: p.s1, za: p.za, zb: p.zb, scrieZ: false,
    ...(p.c && p.r !== undefined && p.unghi !== undefined ? { c: p.c, r: p.r, unghi: p.unghi } : {}),
  }));
  const t: Trecere = { liniaPlonjarii: pasi[0]?.linia ?? 0, d: 0, bucati, lungime: pasi[pasi.length - 1]?.s1 ?? 0 };
  return peDrum(t, drum);
}
