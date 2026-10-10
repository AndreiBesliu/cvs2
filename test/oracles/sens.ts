/**
 * ORACOLUL sensului de tăiere: INVARIANTA 9 (ADR 0027, felia 2.3b), cu ZERO importuri din `src/`. Scris doar din textul
 * ADR 0027, plus ADR 0026 §7 (etichetele) și ADR 0024 / 0025 (documentul, prin oracolul documentului).
 *
 * Ce spune contractul (§1, §2, §3, §6), după AMENDAMENTUL din 09.10 (tabelul din prima redactare era inversat; o
 * recenzie l-a dovedit cu o simulare a îndepărtării materialului și cu regula G41 + M3 = urcare):
 * - axul M3 (rotație orară văzută de sus); urcare = materialul care rămâne e în DREAPTA sensului de mers; opoziție = în
 *   STÂNGA;
 * - materialul care rămâne e partea păstrată S(C) a conturului tăiat (ADR 0026): `exterior` → interiorul conturului,
 *   `interior` → exteriorul lui. Mersul trigonometric (aria cu semn pozitivă) ține interiorul buclei în stânga, deci:
 *     exterior + urcare → − (orar, G2);  exterior + opoziție → +;  interior + urcare → + (trigonometric, G3);
 *     interior + opoziție → −;
 * - regula se aplică fiecărei bucle închise, la fiecare trecere; `pe-linie` nu se judecă;
 * - pe textul G-code, aria cu semn se calculează cu arcele cum le execută GRBL, în coordonatele DOCUMENTULUI; sensul
 *   așteptat vine din document (operația etichetei).
 * Oracolul NU copiază tabelul: partea păstrată pentru fiecare sens se DERIVĂ din grosimea așchiei
 * (`parteaPastrataPrinAschie`: urcarea = dintele intră gros și iese subțire, pe peretele păstrat), iar tabelul ADR-ului
 * e doar o verificare a derivării (testul de pe hârtie).
 *
 * AMENDAMENTUL din ADR 0028 §5 (felia 2.4, urechile): Z-ul se poate schimba sub fața de sus fără să rupă drumul. Din
 * definițiile de mai jos a dispărut „la aceeași adâncime” (în mișcare și în drum); buclele și aria rămân în proiecția
 * XY. Prima redactare (2.3b) rămâne în `bucleleInainteDe0028`, doar ca proba că programele fără urechi (Z constant pe
 * trecere) dau EXACT aceleași verdicte (`sens.oracol.test.ts`).
 *
 * Definițiile mele pe textul G-code (alegeri, unde textul tace; marcate „ALEGERE”):
 * - MIȘCARE ÎN MATERIAL (ADR 0028 §5): G1 / G2 / G3 cu startul cunoscut și cu ambele capete sub fața de sus (z < −1e-6
 *   în document), la orice Z (palierul și flancurile urechilor, arcul elicoidal). Orice altceva (G0, o mișcare cu un
 *   capăt pe sau peste fața de sus: plonjarea de sus, ridicarea, rampa care intră din aer) întrerupe drumul. ALEGERE:
 *   o mișcare în material fără deplasare în XY (un G1 pe verticală între treceri, fără ridicare) nu-l întrerupe și nu
 *   intră în buclă (n-are arie și n-are lungime în proiecție), ca G1-ul fără deplasare din prima redactare;
 * - DRUM: șirul maximal de mișcări în material consecutive, sub aceeași etichetă (o etichetă nouă îl întrerupe), la
 *   orice Z. Adică „de la plonjare până la ridicare”: trecerile coborâte pe verticală, fără ridicare, sunt în ACELAȘI
 *   drum, iar tăierea în bucle (mai jos) le desparte, fiindcă fiecare se închide în pornire;
 * - BUCLĂ: drumul se taie în bucle închise: o buclă se închide în primul capăt de mișcare aflat la cel mult 0,002 mm
 *   (rotunjirea postului) de un vârf al drumului deschis de până atunci (cel mai devreme vârf, deci de obicei startul),
 *   după cel puțin 0,01 mm de drum de la acel vârf; ce era înaintea vârfului (o legătură la adâncime) rămâne un drum
 *   deschis; următoarea buclă pornește de la capăt. Aria buclei e
 *   ½∮(x dy − y dx) exact (segmentele; arcele cu centrul = startul + (I, J), raza din I / J și unghiul din
 *   `regulaArcGrbl`, plus segmentul scurt până la capătul scris), închisă cu coarda capăt → start;
 * - ALEGERE: ce rămâne dintr-un drum după ultima buclă închisă (sau un drum care nu se închide deloc) e un DRUM
 *   DESCHIS; sub o etichetă `exterior` / `interior` e o încălcare a invariantei 9: conturul unei operații de profil
 *   pe aceste laturi e închis, iar sensul unui drum deschis nu se poate citi din G-code (urechile și intrările din
 *   feliile 2.4–2.5 vor cere o precizare a contractului);
 * - ALEGERE: o buclă închisă cu |aria| ≤ 1e-6 mm² (dus-întors pe aceeași linie, scula care încape la limită) nu are
 *   sens de citit: nu se judecă (ca o plonjare pe loc);
 * - ALEGERE: o buclă de tăiere înaintea primei etichete, sub o etichetă nevalidă (stricată, nesingură pe linie, care nu
 *   e a unei tăieturi din document) sau al cărei sens nu se poate lega de o singură operație e o încălcare a
 *   invariantei 9: sensul așteptat nu se știe (invarianta 2 raportează eticheta, aici se raportează bucla);
 * - LEGAREA ETICHETEI DE OPERAȚIE: eticheta dă elementul în lume, latura și adâncimea (±0,0005). Operațiile acelui
 *   element pe acea latură cu acea adâncime sunt candidatele. Dacă toate au același sens, acela e sensul. ALEGERE:
 *   dacă au sensuri diferite (degroșare și finisare cu aceeași adâncime), a k-a apariție a acestei etichete în program
 *   e a k-a candidată, în ordinea tăieturilor din ADR 0025 (operațiile în ordinea piesei); o apariție în plus e o
 *   încălcare (ambiguă).
 * Montajul: punctele mașinii trec în document prin `laDoc` (colțul și Z0: o translație). Orientarea lui se citește
 * din `laDoc` însuși (determinantul părții liniare), ca un montaj oglindit să întoarcă și unghiurile arcelor.
 *
 * AMENDAMENTUL din ADR 0029 §5 (felia 2.5a, rampa; sesiune independentă): un drum poate trece prin mai multe treceri,
 * fără G0 între ele (rampa coboară de-a lungul buclei, iar tura continuă până la intrarea următoare). Buclele închise
 * din el se judecă la fel. O porțiune DESCHISĂ a drumului care stă pe o buclă închisă a ACELUIAȘI drum, parcursă în
 * același sens, nu mai e încălcare (`peBuclaInchisa`); orice altă porțiune deschisă rămâne încălcare. Definițiile mele:
 * - „stă pe buclă”: fiecare eșantion al porțiunii (capetele mișcărilor și puncte la cel mult 0,5 mm) e la cel mult
 *   TOL_PE_BUCLA = 0,005 mm de drumul buclei (două parcurgeri rotunjite ale aceluiași traseu: capetele ±0,0007, arcele
 *   re-rotunjite din alt start: centrul ±0,0007, raza ±0,0014; plus marja);
 * - „în același sens”: proiecțiile eșantioanelor consecutive pe buclă (poziția de-a lungul ei, modulo lungimea buclei)
 *   avansează (Δ > 0), pe orice pereche de eșantioane depărtate cu mai mult de 2·TOL_PE_BUCLA;
 * - drumul fiecărei bucle e ținut în `Bucla.drum`. Prima redactare a acestei reguli rămâne în `verificaSensul(…, false)`,
 *   doar pentru proba că programele fără rampă au EXACT aceleași verdicte (`rampa.oracol.test.ts`).
 *
 * AMENDAMENTUL din ADR 0030 §7 (felia 2.5b, intrările; sesiune independentă): la începutul și la sfârșitul unei treceri,
 * o porțiune deschisă care e o intrare sau o ieșire nu e încălcare. ALEGERE: „la început” = primul element al drumului,
 * urmat imediat de o buclă închisă; „la sfârșit” = ultimul element, după o buclă închisă. Ce înseamnă „e o intrare” (un
 * arc tangent la buclă în p₀, de cel mult 90°, cu raza `raza` sau `raza / 2` a operației, pe partea deșeului) e regula
 * dată de poartă (`regula0030` din `intrari.ts`), ca acest fișier să nu depindă de oracolul intrărilor. Fără regulă
 * (`regula0030` lipsă), verdictele sunt cele de dinainte de ADR 0030 (proba din `intrari.oracol.test.ts`).
 */
import type { LaturaO, SensO } from './document.ts';
import { regulaArcGrbl, type Eveniment, type Mutare, type Punct3 } from './gcode.ts';
import type { Eticheta, Regiune } from './regiune.ts';

/** Sub fața de sus: z < −TOL_SUB în document (ca în poartă). */
export const TOL_SUB = 1e-6;
/** Aceeași adâncime. */
export const TOL_Z = 1e-6;
/** O buclă e închisă dacă se întoarce la atât de start (rotunjirea postului: 3 zecimale, cel mult √2/2·10⁻³). */
export const TOL_INCHIDERE = 0.002;
/** Drumul minim până la o închidere (o mișcare de 0,001 mm nu e o buclă). */
export const LUNGIME_MINIMA = 0.01;
/** Sub atât (mm²), o buclă nu are sens de citit. */
export const ARIE_MINIMA = 1e-6;
/** ADR 0029 §5: o porțiune deschisă stă pe o buclă închisă dacă e la cel mult atât de ea (antetul). */
export const TOL_PE_BUCLA = 0.005;
/** Adâncimea din etichetă față de cea a operației (ADR 0026 §7: aceeași toleranță ca la invarianta 2). */
const TOL_ADANCIME = 0.0005 + 1e-9;

// ---------------------------------------------------------------------------------------------------------------
// Fizica: de ce parte a sensului de mers stă materialul păstrat, pentru fiecare sens, din grosimea așchiei.

export type Parte = 'stanga' | 'dreapta';

/**
 * Frezarea unui perete, pe hârtie: scula de rază R stă în origine și avansează pe +x cu `fz` pe dinte. Peretele
 * păstrat e la y = +R (în STÂNGA mersului) sau la y = −R (în DREAPTA); dintele scoate fâșia de lățime `ae` dinaintea
 * peretelui (stânga: R − ae ≤ y ≤ R). Materialul încă netăiat în fața dintelui e în afara cercului de la dintele
 * precedent (centrul în (−fz, 0)); pe raza de la unghiul φ, așchia are grosimea h(φ) = R − t, cu t rădăcina pozitivă a
 * lui |t·(cos φ, sin φ) + (fz, 0)| = R (punctul cercului precedent pe aceeași rază). Axul M3 rotește orar văzut de sus:
 * dintele trece prin unghiuri descrescătoare (M4: crescătoare). Întoarce grosimea la INTRAREA dintelui în material și
 * la IEȘIRE, de-a lungul rotației.
 */
export function aschia(parte: Parte, ax: 'M3' | 'M4' = 'M3', R = 3, fz = 0.05, ae = 0.5): { readonly intrare: number; readonly iesire: number } {
  const N = 20_000;
  const angajate: Array<{ readonly phi: number; readonly h: number }> = [];
  for (let k = 0; k < N; k++) {
    const phi = -Math.PI + (2 * Math.PI * (k + 0.5)) / N;
    const c = Math.cos(phi), s = Math.sin(phi);
    const y = R * s;
    const inFasie = parte === 'stanga' ? y >= R - ae && y <= R : y <= -R + ae && y >= -R;
    const disc = R * R - fz * fz * s * s;
    const t = -fz * c + Math.sqrt(disc);
    const h = R - t;
    if (inFasie && h > 0) angajate.push({ phi, h });
  }
  if (angajate.length === 0) throw new Error('dintele nu atinge fâșia');
  // Ordinea în timp: M3 = unghiuri descrescătoare.
  angajate.sort((a, b) => (ax === 'M3' ? b.phi - a.phi : a.phi - b.phi));
  return { intrare: angajate[0]!.h, iesire: angajate[angajate.length - 1]!.h };
}

/** Urcarea (climb) = așchia începe groasă și se termină subțire; opoziția, invers. */
export function sensulPeretelui(parte: Parte, ax: 'M3' | 'M4' = 'M3'): SensO {
  const { intrare, iesire } = aschia(parte, ax);
  return intrare > iesire ? 'urcare' : 'opozitie';
}

/** Partea (față de sensul de mers) în care stă materialul păstrat, pentru un sens de tăiere, derivată din așchie. */
export function parteaPastrataPrinAschie(sens: SensO, ax: 'M3' | 'M4' = 'M3'): Parte {
  const stanga = sensulPeretelui('stanga', ax), dreapta = sensulPeretelui('dreapta', ax);
  if (stanga === dreapta) throw new Error('modelul așchiei nu deosebește părțile');
  return stanga === sens ? 'stanga' : 'dreapta';
}

/** Derivarea, o singură dată, pentru axul M3 (singurul pe care îl scrie postul azi). */
const PARTE_M3: Readonly<Record<SensO, Parte>> = {
  urcare: parteaPastrataPrinAschie('urcare'),
  opozitie: parteaPastrataPrinAschie('opozitie'),
};

/**
 * ADR 0027 §1: semnul ariei buclelor (+1 = trigonometric) pentru latura și sensul operației. Mersul trigonometric ține
 * interiorul buclei în stânga. `exterior` păstrează interiorul buclei: + dacă materialul păstrat e în stânga;
 * `interior` păstrează exteriorul buclei (interiorul ei e deșeu): + dacă materialul păstrat e în dreapta.
 */
export function semnAsteptat(latura: 'exterior' | 'interior', sens: SensO): 1 | -1 {
  const stanga = PARTE_M3[sens] === 'stanga';
  return (latura === 'exterior') === stanga ? 1 : -1;
}

export type P2 = { readonly x: number; readonly y: number };

/**
 * O mișcare în material, în document, cu Z-ul capetelor (`za`, `zb`; Z e liniar în fracțiunea parcursă, și pe arcul
 * elicoidal). La arc: centrul, raza, unghiul parcurs (cu semn, în document).
 */
export type Pas =
  | { readonly tip: 'segment'; readonly linia: number; readonly a: P2; readonly b: P2; readonly za: number; readonly zb: number }
  | {
    readonly tip: 'arc'; readonly linia: number; readonly a: P2; readonly b: P2; readonly c: P2; readonly r: number; readonly unghi: number;
    readonly za: number; readonly zb: number;
  };

export type Bucla = {
  /** Prima și ultima linie a mișcărilor buclei. */
  readonly linii: readonly [number, number];
  /** Z-ul pornirii buclei (startul primei mișcări), în document (negativ): adâncimea trecerii, la Z constant. */
  readonly z: number;
  /** Cel mai jos și cel mai sus Z al capetelor mișcărilor buclei (egale cu `z` pe o trecere la Z constant). */
  readonly zMin: number;
  readonly zMax: number;
  readonly start: P2;
  readonly capat: P2;
  readonly inchisa: boolean;
  /** Aria cu semn, mm² (pozitivă = trigonometric), închisă cu coarda capăt → start. */
  readonly arie: number;
  readonly lungime: number;
  /** Indicele etichetei active în lista dată (−1: înaintea primei etichete). */
  readonly eticheta: number;
  readonly pasi: readonly Pas[];
  /** ADR 0029 §5: al câtelea drum al programului (buclele aceluiași drum au același număr). */
  readonly drum: number;
};

const dist = (p: P2, q: P2): number => Math.hypot(p.x - q.x, p.y - q.y);

/** Semnul determinantului părții liniare a montajului (+1: fără oglindire). */
export function orientareMontaj(laDoc: (p: Punct3) => Punct3): 1 | -1 {
  const o = laDoc([0, 0, 0]), x = laDoc([1, 0, 0]), y = laDoc([0, 1, 0]);
  const det = (x[0] - o[0]) * (y[1] - o[1]) - (x[1] - o[1]) * (y[0] - o[0]);
  return det < 0 ? -1 : 1;
}

/** Capătul arcului cum îl atinge cercul (centrul, raza, unghiul), înaintea segmentului scurt până la capătul scris. */
function capatArc(p: Extract<Pas, { tip: 'arc' }>): P2 {
  const u1 = Math.atan2(p.a.y - p.c.y, p.a.x - p.c.x) + p.unghi;
  return { x: p.c.x + p.r * Math.cos(u1), y: p.c.y + p.r * Math.sin(u1) };
}

export function lungimePas(p: Pas): number {
  if (p.tip === 'segment') return dist(p.a, p.b);
  return p.r * Math.abs(p.unghi) + dist(capatArc(p), p.b);
}

/**
 * Contribuția unui pas la ½∮(x dy − y dx), cu originea mutată în `o` (aria unei bucle închise nu depinde de origine;
 * mutarea ține numerele mici). Segmentul p → q: ½(p.x q.y − q.x p.y). Arcul cu centrul c, raza r, unghiul θ, din a
 * în e: ½[r²θ + c.x (e.y − a.y) − c.y (e.x − a.x)]; apoi segmentul e → b.
 */
export function contributie(p: Pas, o: P2): number {
  const rel = (q: P2): P2 => ({ x: q.x - o.x, y: q.y - o.y });
  const seg = (u: P2, v: P2): number => 0.5 * (u.x * v.y - v.x * u.y);
  if (p.tip === 'segment') return seg(rel(p.a), rel(p.b));
  const a = rel(p.a), c = rel(p.c), e = rel(capatArc(p)), b = rel(p.b);
  return 0.5 * (p.r * p.r * p.unghi + c.x * (e.y - a.y) - c.y * (e.x - a.x)) + seg(e, b);
}

/**
 * Aria cu semn a unui șir de pași, închis cu coarda de la capătul ultimului la startul primului. Cu originea chiar în
 * start, coarda capăt → start contribuie ½(e × 0) = 0, deci suma pașilor e deja aria buclei închise.
 */
export function ariaPasilor(pasi: readonly Pas[]): number {
  if (pasi.length === 0) return 0;
  const s = pasi[0]!.a;
  let A = 0;
  for (const p of pasi) A += contributie(p, s);
  return A;
}

/**
 * Mișcarea ca pas în material, în document (ADR 0028 §5: la orice Z sub fața de sus); `null` dacă întrerupe drumul;
 * 'nimic' pentru un G1 fără deplasare în XY (sub fața de sus).
 */
export function pasInMaterial(m: Mutare, laDoc: (p: Punct3) => Punct3, orientare: 1 | -1): { readonly z: number; readonly pas: Pas } | null | 'nimic' {
  if (m.cod === 0 || !m.startCunoscut) return null;
  const a = laDoc(m.a), b = laDoc(m.b);
  if (!(a[2] < -TOL_SUB && b[2] < -TOL_SUB)) return null;
  const A: P2 = { x: a[0], y: a[1] }, B: P2 = { x: b[0], y: b[1] };
  const i = m.i ?? 0, j = m.j ?? 0;
  if (m.cod === 1 || (i === 0 && j === 0)) {
    if (A.x === B.x && A.y === B.y) return 'nimic';
    return { z: a[2], pas: { tip: 'segment', linia: m.linia, a: A, b: B, za: a[2], zb: b[2] } };
  }
  const { unghi } = regulaArcGrbl(m);
  const c3 = laDoc([m.a[0] + i, m.a[1] + j, m.a[2]]);
  const C: P2 = { x: c3[0], y: c3[1] };
  return { z: a[2], pas: { tip: 'arc', linia: m.linia, a: A, b: B, c: C, r: dist(A, C), unghi: unghi * orientare, za: a[2], zb: b[2] } };
}

/**
 * PRIMA REDACTARE (2.3b), păstrată doar pentru proba amendamentului: mișcarea la adâncime cerea și |Δz| ≤ 1e-6; altfel
 * întrerupea drumul.
 */
export function pasLaAdancime(m: Mutare, laDoc: (p: Punct3) => Punct3, orientare: 1 | -1): { readonly z: number; readonly pas: Pas } | null | 'nimic' {
  if (m.cod === 0 || !m.startCunoscut) return null;
  const a = laDoc(m.a), b = laDoc(m.b);
  if (!(a[2] < -TOL_SUB && b[2] < -TOL_SUB) || Math.abs(a[2] - b[2]) > TOL_Z) return null;
  return pasInMaterial(m, laDoc, orientare);
}

/**
 * Un drum (mișcări la adâncime consecutive), tăiat în bucle închise și drumuri deschise. Lanțul deschis curent se
 * închide când capătul unei mișcări revine la cel mult TOL_INCHIDERE de un vârf al lanțului (startul unei mișcări din
 * el), după cel puțin LUNGIME_MINIMA de drum de la acel vârf; se ia cel mai devreme vârf. Ce era înaintea vârfului
 * (o legătură la adâncime) iese ca drum deschis, bucla ca buclă închisă; lanțul pornește din nou de la capăt.
 */
function imparte(pasi: readonly Pas[], eticheta: number, drum = 0): Bucla[] {
  const rez: Bucla[] = [];
  const bucla = (acum: readonly Pas[], inchisa: boolean): Bucla => ({
    linii: [acum[0]!.linia, acum[acum.length - 1]!.linia], z: acum[0]!.za,
    zMin: Math.min(...acum.flatMap((p) => [p.za, p.zb])), zMax: Math.max(...acum.flatMap((p) => [p.za, p.zb])),
    start: acum[0]!.a, capat: acum[acum.length - 1]!.b, inchisa,
    arie: ariaPasilor(acum), lungime: acum.reduce((s, p) => s + lungimePas(p), 0), eticheta, pasi: acum, drum,
  });
  let lant: Pas[] = [];
  /** Lungimea drumului până la startul fiecărei mișcări din lanț, plus capătul. */
  let pana: number[] = [0];
  for (const p of pasi) {
    lant.push(p);
    pana.push(pana[pana.length - 1]! + lungimePas(p));
    const total = pana[pana.length - 1]!;
    for (let k = 0; k < lant.length && total - pana[k]! >= LUNGIME_MINIMA; k++) {
      if (dist(lant[k]!.a, p.b) > TOL_INCHIDERE) continue;
      if (k > 0) rez.push(bucla(lant.slice(0, k), false));
      rez.push(bucla(lant.slice(k), true));
      lant = [];
      pana = [0];
      break;
    }
  }
  if (lant.length) rez.push(bucla(lant, false));
  return rez;
}

/**
 * Buclele unui program (evenimentele citite de `citeste`), în ordinea lor, fiecare cu eticheta activă: ultima etichetă
 * de pe o linie de dinaintea primei ei mișcări (`liniiEtichete`, crescător). Drumul e cel amendat de ADR 0028 §5:
 * mișcările în material la orice Z, sub aceeași etichetă.
 */
export function buclele(evenimente: readonly Eveniment[], liniiEtichete: readonly number[], laDoc: (p: Punct3) => Punct3): Bucla[] {
  return drumuri(evenimente, liniiEtichete, laDoc, pasInMaterial, false);
}

/** PRIMA REDACTARE (2.3b): drumul la o singură adâncime; o schimbare de Z îl întrerupe. Doar pentru proba amendamentului. */
export function bucleleInainteDe0028(evenimente: readonly Eveniment[], liniiEtichete: readonly number[], laDoc: (p: Punct3) => Punct3): Bucla[] {
  return drumuri(evenimente, liniiEtichete, laDoc, pasLaAdancime, true);
}

function drumuri(
  evenimente: readonly Eveniment[], liniiEtichete: readonly number[], laDoc: (p: Punct3) => Punct3,
  pasul: typeof pasInMaterial, oAdancime: boolean,
): Bucla[] {
  const orientare = orientareMontaj(laDoc);
  const rez: Bucla[] = [];
  let iE = -1;
  let nrDrum = 0;
  let drum: { eticheta: number; z: number; pasi: Pas[] } | null = null;
  const inchide = (): void => {
    if (drum && drum.pasi.length) rez.push(...imparte(drum.pasi, drum.eticheta, nrDrum++));
    drum = null;
  };
  for (const e of evenimente) {
    if (e.tip !== 'mutare') continue;
    const m = e.m;
    while (iE + 1 < liniiEtichete.length && liniiEtichete[iE + 1]! < m.linia) iE++;
    if (drum !== null && (drum as { eticheta: number }).eticheta !== iE) inchide();
    const x = pasul(m, laDoc, orientare);
    if (x === 'nimic') continue;
    if (x === null) { inchide(); continue; }
    if (oAdancime && drum !== null && Math.abs((drum as { z: number }).z - x.z) > TOL_Z) inchide();
    drum ??= { eticheta: iE, z: x.z, pasi: [] };
    drum.pasi.push(x.pas);
  }
  inchide();
  return rez;
}

export type EtichetaActiva = { readonly linia: number; readonly eticheta: Eticheta | null };
export type IncalcareSens = { readonly linia: number; readonly mesaj: string };
/** Sensul așteptat sub o etichetă: unul, sau de ce nu se știe. */
export type SensEticheta = { readonly sens: SensO } | { readonly motiv: string };

/**
 * Sensul așteptat sub fiecare etichetă (în ordinea programului): din operațiile documentului cu elementul, latura și
 * adâncimea etichetei. Etichetele `pe-linie` și cele nevalide nu primesc nimic (`null`).
 */
export function sensurileEtichetelor(etichete: readonly EtichetaActiva[], reg: Regiune): Array<SensEticheta | null> {
  const aparitii = new Map<string, number>();
  return etichete.map(({ eticheta: et }) => {
    if (!et || et.latura === 'pe-linie') return null;
    const t = reg.taieturi.get(et.idLume);
    const adancimi = t?.laturi.get(et.latura) ?? [];
    const sensuri = t?.sensuri.get(et.latura) ?? [];
    const candidate = adancimi.flatMap((a, k) => (Math.abs(a - et.adancime) <= TOL_ADANCIME ? [k] : []));
    if (candidate.length === 0) return { motiv: `${et.idLume} n-are o operație ${et.latura} de ${et.adancime} mm` };
    const cheie = `${et.idLume}|${et.latura}|${candidate.join(',')}`;
    const k = aparitii.get(cheie) ?? 0;
    aparitii.set(cheie, k + 1);
    const valori = candidate.map((c) => sensuri[c]);
    if (valori.some((v) => v === undefined)) return { motiv: `operația lui ${et.idLume} (${et.latura}) n-are sens în document` };
    if (valori.every((v) => v === valori[0])) return { sens: valori[0]! };
    if (k < valori.length) return { sens: valori[k]! };
    return { motiv: `${et.idLume} are ${valori.length} operații ${et.latura} de ${et.adancime} mm cu sensuri diferite, iar eticheta apare de ${k + 1} ori` };
  });
}

const fel = (s: number): string => (s > 0 ? 'trigonometric' : 'orar');

/** Punctul pasului la fracțiunea f (arcul pe cercul lui, fără segmentul scurt până la capătul scris). */
function punctPeP(p: Pas, f: number): P2 {
  if (p.tip === 'segment') return { x: p.a.x + (p.b.x - p.a.x) * f, y: p.a.y + (p.b.y - p.a.y) * f };
  const u = Math.atan2(p.a.y - p.c.y, p.a.x - p.c.x) + p.unghi * f;
  return { x: p.c.x + p.r * Math.cos(u), y: p.c.y + p.r * Math.sin(u) };
}

/** Proiecția lui q pe un pas: distanța și fracțiunea punctului cel mai apropiat. */
function proiectie(p: Pas, q: P2): { readonly d: number; readonly f: number } {
  if (p.tip === 'segment') {
    const vx = p.b.x - p.a.x, vy = p.b.y - p.a.y;
    const L2 = vx * vx + vy * vy;
    const t = L2 > 0 ? Math.max(0, Math.min(1, ((q.x - p.a.x) * vx + (q.y - p.a.y) * vy) / L2)) : 0;
    return { d: dist(punctPeP(p, t), q), f: t };
  }
  const u0 = Math.atan2(p.a.y - p.c.y, p.a.x - p.c.x);
  const uq = Math.atan2(q.y - p.c.y, q.x - p.c.x);
  const sweep = Math.abs(p.unghi);
  const rel = ((((uq - u0) * Math.sign(p.unghi)) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const f = rel <= sweep ? (sweep > 0 ? rel / sweep : 0) : (rel - sweep < 2 * Math.PI - rel ? 1 : 0);
  const capat = dist(p.b, q);
  const pe = dist(punctPeP(p, f), q);
  return capat < pe ? { d: capat, f: 1 } : { d: pe, f };
}

/**
 * ADR 0029 §5: porțiunea deschisă `o` stă pe bucla închisă `c` și o parcurge în același sens (definițiile din antet):
 * fiecare eșantion e la cel mult TOL_PE_BUCLA de `c`, iar pozițiile proiecțiilor pe `c` avansează.
 */
export function peBuclaInchisa(o: Bucla, c: Bucla): boolean {
  const L = c.lungime;
  if (!(L > 0)) return false;
  const pozitie = (q: P2): { readonly d: number; readonly s: number } => {
    let cel = { d: Infinity, s: 0 };
    let s = 0;
    for (const p of c.pasi) {
      const x = proiectie(p, q);
      const Lp = lungimePas(p);
      if (x.d < cel.d) cel = { d: x.d, s: s + x.f * Lp };
      s += Lp;
    }
    return cel;
  };
  const esantioane: P2[] = [];
  for (const p of o.pasi) {
    const n = Math.max(1, Math.ceil(lungimePas(p) / 0.5));
    for (let k = 0; k < n; k++) esantioane.push(punctPeP(p, k / n));
    esantioane.push(p.b);
  }
  let prec: { readonly q: P2; readonly s: number } | null = null;
  for (const q of esantioane) {
    const x = pozitie(q);
    if (x.d > TOL_PE_BUCLA) return false;
    if (prec && dist(prec.q, q) > 2 * TOL_PE_BUCLA) {
      let ds = (x.s - prec.s) % L;
      if (ds > L / 2) ds -= L;
      if (ds < -L / 2) ds += L;
      if (!(ds > 0)) return false;
    }
    if (!prec || dist(prec.q, q) > 2 * TOL_PE_BUCLA) prec = { q, s: x.s };
  }
  return true;
}

/**
 * ALEGERE: liniile care pornesc axul în sens invers (M4), în afara comentariilor. ADR 0027 dă tabelul doar pentru M3
 * („Limitele”: M4 îl inversează și vine cu profilul mașinii); un program cu M4 ar avea toate sensurile întoarse fără ca
 * aria buclelor să se schimbe, deci invarianta 9 îl refuză până atunci.
 */
export function liniiCuAxInvers(text: string): number[] {
  const rez: number[] = [];
  text.split('\n').forEach((brut, k) => {
    const linie = brut.replace(/\([^)]*\)/g, ' ').replace(/;.*$/, '');
    if (/(^|[^A-Za-z])M\s*0*4(?![\d.])/i.test(linie)) rez.push(k + 1);
  });
  return rez;
}

/**
 * Invarianta 9 pe un program: fiecare buclă închisă de sub o etichetă `exterior` / `interior` are aria cu semnul din
 * ADR 0027 §1, pentru sensul operației ei. Întoarce încălcările (linia = prima linie a buclei).
 */
export function verificaSensul(
  evenimente: readonly Eveniment[], etichete: readonly EtichetaActiva[], reg: Regiune, laDoc: (p: Punct3) => Punct3,
  bucle: typeof buclele = buclele, regula0029 = true,
  regula0030?: (o: Bucla, c: Bucla, pozitie: 'inainte' | 'dupa') => boolean,
): IncalcareSens[] {
  const rez: IncalcareSens[] = [];
  const sensuri = sensurileEtichetelor(etichete, reg);
  const toate = bucle(evenimente, etichete.map((e) => e.linia), laDoc);
  for (const b of toate) {
    const unde = `liniile ${b.linii[0]}–${b.linii[1]}, Z ${b.z.toFixed(3)}`;
    if (b.eticheta < 0) {
      rez.push({ linia: b.linii[0], mesaj: `sensul de tăiere: buclă de tăiere înaintea primei etichete (${unde}): sensul așteptat nu se știe` });
      continue;
    }
    const et = etichete[b.eticheta]!.eticheta;
    if (!et) {
      rez.push({ linia: b.linii[0], mesaj: `sensul de tăiere: buclă sub o etichetă nevalidă (linia ${etichete[b.eticheta]!.linia}; ${unde}): sensul așteptat nu se știe` });
      continue;
    }
    if (et.latura === 'pe-linie') continue;
    const s = sensuri[b.eticheta];
    if (!s || 'motiv' in s) {
      rez.push({ linia: b.linii[0], mesaj: `sensul de tăiere: ${s ? s.motiv : 'fără operație'} (${unde})` });
      continue;
    }
    const latura = et.latura as Exclude<LaturaO, 'pe-linie'>;
    if (!b.inchisa) {
      // ADR 0029 §5: tura care continuă spre intrarea următoare stă pe o buclă închisă a aceluiași drum, în același sens.
      if (regula0029 && toate.some((c) => c.inchisa && c.drum === b.drum && peBuclaInchisa(b, c))) continue;
      // ADR 0030 §7: intrarea (primul element al drumului, înaintea unei bucle închise) sau ieșirea (ultimul, după una).
      if (regula0030) {
        const ale = toate.filter((c) => c.drum === b.drum);
        const k = ale.indexOf(b);
        const urm = ale[k + 1], prec = ale[k - 1];
        if (k === 0 && urm?.inchisa && regula0030(b, urm, 'inainte')) continue;
        if (k === ale.length - 1 && prec?.inchisa && regula0030(b, prec, 'dupa')) continue;
      }
      rez.push({
        linia: b.linii[0],
        mesaj: `sensul de tăiere: drumul lui ${et.idLume} (${latura}) la ${unde} nu se închide (capătul la ${dist(b.capat, b.start).toFixed(3)} mm de start): sensul nu se poate judeca`,
      });
      continue;
    }
    if (Math.abs(b.arie) <= ARIE_MINIMA) continue;
    const asteptat = semnAsteptat(latura, s.sens);
    if (Math.sign(b.arie) !== asteptat) {
      rez.push({
        linia: b.linii[0],
        mesaj: `sensul de tăiere: bucla lui ${et.idLume} (${latura}, ${s.sens}) la ${unde} are aria ${b.arie.toFixed(3)} mm² (${fel(b.arie)}); trebuie ${fel(asteptat)}`,
      });
    }
  }
  return rez;
}
