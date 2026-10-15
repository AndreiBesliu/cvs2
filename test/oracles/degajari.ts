/**
 * ORACOLUL degajărilor colțurilor (ADR 0032, felia 2.6: dog-bone și T-bone), cu ZERO importuri din `src/`. Scris doar
 * din textul ADR 0032 (plus ADR 0026 pentru regiunea păstrată și invarianta 2, ADR 0027 pentru sensul de mers, prin
 * `sens.ts` / `intrari.ts`, ADR 0028–0031 pentru urechi, rampă, intrări și coloanele urechilor), de o sesiune
 * independentă de cea care a scris aplicația. Două metode, care se verifică una pe alta:
 *
 * A. POARTA (cu documentul în context, ca 2, 9–12):
 *    - DRUMUL DUS-ÎNTORS (definiția mea pe textul G-code, `drumuriDusIntors`): două mișcări G1 consecutive, cu startul
 *      cunoscut, cu toate trei capetele sub fața de sus (z < −1e-6 în document), prima cu deplasare în plan de peste
 *      0,0015 mm, a doua întoarsă în startul primei (la cel mult TOL_INCHIDERE = 0,002 mm, în plan). ALEGERE, ca o
 *      buclă care e ea însăși un dus-întors (o fantă cât freza) să nu fie citită ca degajare: perechea NU e drum dacă
 *      mișcarea de dinainte e chiar inversa primei (pleacă din capătul ei), sau cea de după e chiar inversa celei de-a
 *      doua; și e drum doar dacă e lipită de o altă mișcare în material, în plan (cea de dinainte se termină în startul
 *      ei, sau cea de după pleacă din capătul ei);
 *    - INVARIANTA 9 AMENDATĂ (§7): buclele se judecă fără drumurile dus-întors: poarta dă invariantelor 9, 10, 11 și 12
 *      evenimentele fără mișcările lor (`faraDrumuri`). Așa „pozițiile s nu numără drumurile de degajare” (10, 11, 12
 *      amendate): P, urechile, rampa și intrările se măsoară pe același program ca înainte de degajări;
 *    - INVARIANTA 2 AMENDATĂ (§7): un drum dus-întors care e EXACT cel de la §3–§4 al unui colț de degajat al tăieturii
 *      etichetei (Q la cel mult TOL_Q de Q-ul de pe hârtie, E la cel mult TOL_E de E-ul de pe hârtie) poate intra în
 *      K ∪ S(C) prin inelul tăieturii; față de ORICE ALT inel care mărginește K se judecă exact ca invarianta 2
 *      (distanța exactă a segmentului, cu pragul porții), iar centrul pleacă din afara lui K. Orice alt drum se judecă
 *      neschimbat (deci orice intrare a lui în K e încălcare);
 *    - INVARIANTA 13 (nouă): pe fiecare etichetă legată de o operație (legarea ca la 9–12, pe tuplul sens, urechi, rampă,
 *      intrări, colțuri), SOSIREA în Q = o mișcare G1 în material, cu deplasare în plan, care NU face parte dintr-un
 *      drum și se termină la cel mult TOL_Q de Q (arcele intrărilor nu sunt sosiri: o buclă cu colțuri de degajat e
 *      făcută doar din linii). La fiecare sosire într-un colț care îndeplinește §5 urmează drumul lui, cu E de la §3, la
 *      Z-ul sosirii (constant pe drum), cu avansul de tăiere (cel mai mare F al mișcărilor în material la Z constant);
 *      la o sosire într-un colț care NU îndeplinește §5 nu urmează niciun drum; orice drum care nu urmează unei sosiri
 *      într-un colț de degajat al operației lui e încălcare (nicăieri altundeva; niciunul fără `colturi`). O etichetă
 *      `pe-linie` legată de o operație cu `colturi` = exportul trebuia refuzat (§6).
 * B. HÂRTIA: `masoaraDrumurile` (Q, E, lungimea, Z, F, sosirea) citite din program fără etichete; `restulInColt` (cât
 *    rămâne între disc și colțul V la adâncimea plină, exact pe segmente), `intrareaInPerete` (cât intră tăietura dincolo
 *    de dreapta unui perete, lângă V, exact pe segmente) și câmpul de înălțimi `campul` din `intrari-rampa.ts` (nicio
 *    mișcare nu scoate mai mult decât pasul). Valorile așteptate vin din geometria de pe hârtie (`degajari.cazuri.ts`).
 *
 * DERIVAREA (nu e copiată din aplicație):
 * - §2 colțurile: vârfurile conturului elementului în lume în care se întâlnesc două LINII cu tangenta ruptă (pe un
 *   dreptunghi cu razaColt > 0 și pe cerc nu există); sensul de mers (trigonometric sau orar) e cel derivat din grosimea
 *   așchiei (`mersTrigonometric` din `intrari.ts`, prin `sens.ts`); unghiul interior θ din viraj; unghiul deșeului
 *   α = θ pe `interior`, 2π − θ pe `exterior`; colț de degajat dacă α < π, Q există (traseul exact `drumIdeal` e un
 *   poligon nedegenerat cu un vârf în Q = V + (R / sin(α/2))·u, u bisectoarea spre deșeu = unit(e₁ + e₂), e₁, e₂
 *   direcțiile laturilor din V) și R / sin(α/2) − R ≥ 0,01;
 * - §3 E: dog-bone E = V + R·u; T-bone: m = normala unitară spre deșeu (m·u > 0) a laturii mai scurte din V, E = V + R·m;
 *   la |L₁ − L₂| < 1e-6, peretele lung e al laturii de DUPĂ V în sensul de mers (deci m e al laturii de dinainte).
 *   ALEGERE: la |L₁ − L₂| în 1e-6 ± 1e-9 ambele E sunt acceptate (rotunjirea lungimilor);
 * - §5 a: distanța EXACTĂ (`distantaListe`) de la segmentul [Q, E] la traseul exact al oricărei alte bucle de pe foaia 0
 *   (offsetul pe `exterior` / `interior`, conturul pe `pe-linie`, câte unul pe fiecare operație), ≥ D + 1 mm. ALEGERE,
 *   literal: „altă buclă” = a altei operații (ADR 0025: un element în două operații dă două tăieturi), deci și
 *   degroșarea și finisarea aceluiași contur se văd una pe alta (la distanța 0: nicio degajare); se sare doar bucla
 *   operației legate de etichetă. „Traseul” e bucla, fără intrări, ieșiri și degajări;
 * - §5 b: distanța exactă de la [Q, E] la coloana fiecărei urechi a buclei ([c_k − h + R, c_k + h − R], `coloaneleUrechilor`
 *   din `intrari.ts`), pe bucla exactă pornită din punctul în care prima trecere a etichetei intră pe buclă (p₀ cu
 *   intrări, vârful 0 fără), ≥ D;
 * - la ±BANDA_CONDITII de prag (a sau b), ambele verdicte sunt acceptate (aplicația socotește pe geometria ei exactă).
 *
 * PRECIZAREA DIN 11.10.2026 (recenzia feliei 2.6, primită de la coordonator în timpul scrierii; oracolul o urmează):
 * - §2: colțurile se socotesc pe conturul elementului după CURĂȚAREA intrării offsetului: primitivele (linii sau arce)
 *   sub 1e-6 mm se scot, iar vârfurile aproape coliniare (ALEGERE: |sin(viraj)| ≤ 1e-9) nu sunt colțuri; un colț al cărui
 *   arc mic a fost scos e ascuțit (V = intersecția celor două drepte). Un ARC concav pentru K (pe `interior`, colțurile
 *   rotunjite ale găurii) cu raza sub R nu primește degajare, ci un avertisment, unul pe arc (`arceSubRaza`);
 * - §5 a: drumul stă la cel puțin D + 1 și de drumul fiecărui CANDIDAT al altei bucle: un colț de degajat al cărui Q e
 *   vârf al buclei lui și care trece partea „traseu” a lui a; doi candidați ai unor bucle diferite mai apropiați de
 *   D + 1 se omit AMÂNDOI (b nu intră în candidatură); colțurile aceleiași bucle nu se judecă între ele;
 * - §5 c (nouă), foaia: pe fiecare latură, golul cutiei discului de-a lungul lui [Q, E] (minX − R, W − (maxX + R),
 *   minY − R, H − (maxY + R), în document) ≥ min(1 mm, același gol al cutiei discului buclei înseși);
 * - §4 cu urechi: drumul e la Z-ul profilului în Q; „colțul V tăiat la adâncime” = până la Z-ul drumului;
 * - avertismentul, exact: `<idLume>: degajarea omisă la colțul (<x>, <y>): <motiv>` (V în coordonatele foii, 3
 *   zecimale), cu motivul primei condiții care pică, în ordine: `prea aproape de altă buclă` (a, traseul),
 *   `prea aproape de degajarea altei bucle` (a, candidații), `ar tăia puntea unei urechi` (b), `prea aproape de marginea
 *   foii` (c); arcul: `<idLume>: colțul rotunjit cu raza <r> mm (sub raza frezei, <R> mm) rămâne cu raza frezei;
 *   degajarea pe arce vine cu importul SVG`. Cu o condiție în bandă, oricare dintre rezultatele posibile e acceptat
 *   (`rezultate`, `avertismenteleCerute`).
 *
 * RECENZIA 2.7b (11.10, ADR 0034 §6, precizările): pe o cale cu `colturi`, și avertismentele colțurilor cu o latură curbă
 * (concave pentru K, cu restul ≥ 0,01, atinse de buclă), ale curbelor strânse (cubica cu raza minimă de curbură spre
 * deșeu sub R, în punctul ei) și „colțul rotunjit” pe arcele desenului (`avertismenteleCaii`, `arceSubRaza`); numerele
 * se potrivesc cu toleranța 0,0015 / 0,002 (`Potrivire`), pe prag în bandă.
 *
 * FELIA 2.7b (ADR 0034, forma „cale”; aceeași sesiune independentă): colțurile unei căi sunt vârfurile L–L (`colturiPeCale`),
 * cu Q socotit fără offsetul exact al căii (picioarele pe laturi și distanța lui Q la tot conturul ≥ R). Bucla unei căi,
 * pentru §5 (a: traseele celorlalte bucle; b: coloanele urechilor; c: cutia buclei), e cea citită din program, cu banda
 * `BANDA_PROGRAM` = 0,003 (cotele rotunjite); dreptunghiurile și cercurile rămân pe offsetul exact, ca înainte.
 *
 * TOLERANȚELE (cotele rotunjite la 3 zecimale):
 * - TOL_Q = 0,005 (Q citit ±0,0007 față de cel de pe hârtie, cu marjă), TOL_E = 0,003 (E citit ±0,0007);
 * - Z-ul drumului: egal cu Z-ul sosirii, ±0,0005 (Z nu se rescrie; aceeași cotă);
 * - F-ul drumului: avansul de tăiere ±0,05 (F scris cu o zecimală).
 */
import type { ColturiO, IntrariO, LaturaO, LaturaV10O, RampaO, SensO, TipColturiO, UrechiO } from './document.ts';
import { citeste, regulaArcGrbl, type Eveniment, type Mutare, type Punct3 } from './gcode.ts';
import {
  arc as arcP, celMaiMic, distantaListe, dPunctLista, lungime as lungimeP, peOParte, punct as punctP, punctLa, segment as segmentP, type Contur, type IncalcareMutare, type Primitiva,
  type LaturaCale, type Regiune,
} from './regiune.ts';
import { TOL_INCHIDERE, TOL_SUB, type EtichetaActiva, type P2 } from './sens.ts';
import { buclaAnalitica, coloaneleUrechilor, desparte, desparteCuRampa, MARJA_SCHELET, mersTrigonometric } from './intrari.ts';
import { lanturile } from './rampa.ts';

/** §2: restul minim (rezoluția declarată), mm. */
export const REST_MINIM = 0.01;
/** §3: lungimile laturilor care diferă cu mai puțin de atât sunt egale (T-bone). */
export const EGALITATE_LATURI = 1e-6;
export const TOL_Q = 0.005;
export const TOL_E = 0.003;
export const TOL_Z_DRUM = 0.0005 + 1e-9;
export const TOL_F_DRUM = 0.05 + 1e-9;
/** Banda în jurul pragurilor de la §5 (a: D + 1; b: D) în care ambele verdicte sunt acceptate. */
export const BANDA_CONDITII = 1e-5;
/** Sub atât (mm, în plan), o mișcare nu poate fi capătul dus al unui drum (rotunjirea postului). */
export const DUS_MINIM = 0.0015;

const mm = (v: number): string => v.toFixed(3);
const dist = (p: P2, q: P2): number => Math.hypot(p.x - q.x, p.y - q.y);
const sub = (p: P2, q: P2): P2 => ({ x: p.x - q.x, y: p.y - q.y });
const plus = (p: P2, v: P2, k = 1): P2 => ({ x: p.x + k * v.x, y: p.y + k * v.y });
const dot = (u: P2, v: P2): number => u.x * v.x + u.y * v.y;
const cross = (u: P2, v: P2): number => u.x * v.y - u.y * v.x;
const unit = (v: P2): P2 => {
  const L = Math.hypot(v.x, v.y);
  return L > 0 ? { x: v.x / L, y: v.y / L } : { x: 0, y: 0 };
};
const xy = (p: Punct3): P2 => ({ x: p[0], y: p[1] });

// ---------------------------------------------------------------------------------------------------------------
// §2–§3 pe hârtie: colțurile de degajat ale unui contur, cu Q și E.

/** Un perete din V: direcția laturii (din V spre celălalt capăt), lungimea ei și normala unitară spre deșeu. */
export type Perete = { readonly dir: P2; readonly L: number; readonly n: P2 };

export type ColtDegajat = {
  /** Indicele vârfului în ordinea de mers (0 = primul vârf ascuțit al conturului, întors după sens). */
  readonly k: number;
  readonly V: P2; readonly Q: P2; readonly E: P2;
  /** Unghiul deșeului din V (rad) și bisectoarea unitară spre deșeu. */
  readonly alfa: number; readonly u: P2;
  readonly tip: TipColturiO;
  /** Peretele laturii de dinainte de V (0) și al celei de după (1), în sensul de mers. */
  readonly pereti: readonly [Perete, Perete];
  /** T-bone: peretele lung (0 sau 1); dog-bone: null. */
  readonly lung: 0 | 1 | null;
  /** T-bone la limita egalității (|L₁ − L₂| la 1e-9 de 1e-6): celălalt E, acceptat și el; altfel null. */
  readonly EAlt: P2 | null;
  /** Cât intră degajarea în fiecare perete, pe hârtie: R − (E − V)·n. */
  readonly intrare: readonly [number, number];
  /** Restul lăsat de traseu în colț, fără degajare: R / sin(α/2) − R. */
  readonly rest: number;
};

/** §2 (precizarea din 11.10): sub atât (mm) o primitivă a conturului se scoate; sub atât |sin(viraj)|, vârful nu e colț. */
export const CURATARE = 1e-6;
export const COLINIAR = 1e-9;

/** Conturul după curățarea intrării offsetului: fără primitivele (linii, arce) sub 1e-6 mm. */
export function conturCuratat(c: Contur): Primitiva[] {
  return c.primitive.filter((q) => q.tip !== 'punct' && lungimeP(q) >= CURATARE);
}

/**
 * §2 (precizarea din 11.10): arcele conturului concave pentru K cu raza sub R (după curățare): pe `interior`, arcele
 * colțurilor rotunjite ale unui dreptunghi (centrul în gaură); pe `exterior`, arcele sunt convexe pentru K (niciunul).
 * ALEGERE: cercul n-are colțuri (un cerc sub R nu încape oricum).
 */
export function arceSubRaza(c: Contur, latura: 'exterior' | 'interior', R: number): number[] {
  if (c.tip === 'cale') {
    // ADR 0034 §6 (recenzia): pe arcele desenului (nu pe biarce), curățate, concave pentru K (centrul pe partea deșeului:
    // pe interior, arcul care merge în sensul căii; pe exterior, cel care merge invers).
    const o = c.orientare ?? 1;
    return (c.laturiCale ?? []).flatMap((l) => (l.tip === 'A' && l.arc && l.arc.tip === 'arc' && Math.abs(l.arc.du) * l.arc.r >= CURATARE && l.arc.r < R
      && (latura === 'interior') === (o * l.arc.du > 0) ? [l.arc.r] : []));
  }
  if (c.tip !== 'dreptunghi' || latura !== 'interior') return [];
  return conturCuratat(c).flatMap((q) => (q.tip === 'arc' && q.r < R ? [q.r] : []));
}

/** Aria cu semn a unui poligon (vârfurile, în ordine). */
function ariePoligon(vs: readonly P2[]): number {
  let A = 0;
  for (let k = 0; k < vs.length; k++) A += cross(vs[k]!, vs[(k + 1) % vs.length]!);
  return A / 2;
}

/**
 * §2 și §3: colțurile de degajat ale conturului `c` (în lume), pentru latura și sensul operației, cu raza frezei R și
 * tipul degajării. Lista e în ordinea de mers (doar pentru citit; potrivirea cu programul se face după Q).
 */
export function colturiDeDegajat(c: Contur, latura: 'exterior' | 'interior', sens: SensO, R: number, tip: TipColturiO): ColtDegajat[] {
  if (c.tip === 'cale') return colturiPeCale(c, latura, sens, R, tip);
  const ps = conturCuratat(c);
  // Vârfurile ascuțite: două linii consecutive, cu tangenta ruptă; V = intersecția dreptelor lor (după curățare, capetele
  // pot fi la sub 1e-6 unul de altul), P = vârful de dinainte, N = cel de după (în ordinea conturului).
  const varf = (k: number): P2 | null => {
    const a = ps[(k + ps.length - 1) % ps.length]!, b = ps[k]!;
    if (a.tip !== 'segment' || b.tip !== 'segment') return null;
    const d1 = unit(sub(a.b, a.a)), d2 = unit(sub(b.b, b.a));
    if (Math.abs(cross(d1, d2)) <= COLINIAR && dot(d1, d2) > 0) return null;
    const x = cross(d1, d2);
    if (x === 0) return b.a;
    const t = cross(sub(b.a, a.a), d2) / x;
    return plus(a.a, d1, t);
  };
  const varfuri: Array<{ V: P2; P: P2; N: P2 }> = [];
  for (let k = 0; k < ps.length; k++) {
    const V = varf(k);
    if (!V) continue;
    const a = ps[(k + ps.length - 1) % ps.length]! as Extract<Primitiva, { tip: 'segment' }>, b = ps[k]! as Extract<Primitiva, { tip: 'segment' }>;
    varfuri.push({ V, P: varf((k + ps.length - 1) % ps.length) ?? a.a, N: varf((k + 1) % ps.length) ?? b.b });
  }
  if (varfuri.length === 0) return [];
  // Sensul conturului (din vârfuri) față de sensul de mers: întors, P și N își schimbă locul, iar ordinea se inversează.
  const trig = mersTrigonometric(latura, sens);
  const conturTrig = ariePoligon(varfuri.map((v) => v.V)) > 0;
  const ordonate = conturTrig === trig ? varfuri : [...varfuri].reverse().map((v) => ({ V: v.V, P: v.N, N: v.P }));
  // Q există doar dacă traseul exact e un poligon nedegenerat (decalarea n-a mâncat colțurile).
  const drum = c.drumIdeal(R, latura);
  const segs = (drum ?? []).filter((q): q is Extract<Primitiva, { tip: 'segment' }> => q.tip === 'segment');
  const arieDrum = Math.abs(ariePoligon(segs.map((q) => q.a)));
  return colturiDinVarfuri(ordonate, latura, trig, R, tip, (Q) => {
    const scara = 1 + Math.hypot(Q.x, Q.y);
    return Boolean(drum) && arieDrum > 1e-9 * scara * scara && segs.some((q) => dist(q.a, Q) <= 1e-6 * scara);
  });
}

/**
 * ADR 0034 + ADR 0032 §2, pe o cale: colțurile sunt vârfurile în care se întâlnesc două laturi L (linii) ale căii, după
 * curățare (laturile sub 1e-6 mm scoase; ALEGERE: un arc după lungimea lui, o cubică după întinderea punctelor ei),
 * cu tangenta ruptă; arcele și cubicele nu dau colțuri (ALEGERE: o cubică rămâne „curbă” și când biarcele ar face-o
 * linie, la o cubică plată; corpusul le ocolește). Sensul căii vine din aria ei cu semn. Q există (fără offsetul exact al
 * căii, pe care nu-l am): picioarele lui Q pe cele două laturi cad înăuntrul lor (R / tan(α/2) ≤ lungimea fiecăreia) și
 * nicio altă parte a conturului nu e mai aproape de Q decât R (Q e un vârf al marginii offsetului: punctele la exact R de
 * contur, pe partea deșeului).
 */
function colturiPeCale(c: Contur, latura: 'exterior' | 'interior', sens: SensO, R: number, tip: TipColturiO): ColtDegajat[] {
  const toate = c.laturiCale ?? [];
  const ls = toate.filter((l) => {
    if (l.tip === 'L') return dist(l.a, l.b) >= CURATARE;
    return dist(l.a, l.b) >= CURATARE || l.tip === 'C';
  });
  if (ls.length < 2) return [];
  const varf = (k: number): P2 | null => {
    const a = ls[(k + ls.length - 1) % ls.length]!, b = ls[k]!;
    if (a.tip !== 'L' || b.tip !== 'L') return null;
    const d1 = unit(sub(a.b, a.a)), d2 = unit(sub(b.b, b.a));
    if (Math.abs(cross(d1, d2)) <= COLINIAR && dot(d1, d2) > 0) return null;
    const x = cross(d1, d2);
    if (x === 0) return b.a;
    const t = cross(sub(b.a, a.a), d2) / x;
    return plus(a.a, d1, t);
  };
  const varfuri: Array<{ V: P2; P: P2; N: P2 }> = [];
  for (let k = 0; k < ls.length; k++) {
    const V = varf(k);
    if (!V) continue;
    varfuri.push({ V, P: varf((k + ls.length - 1) % ls.length) ?? ls[(k + ls.length - 1) % ls.length]!.a, N: varf((k + 1) % ls.length) ?? ls[k]!.b });
  }
  if (varfuri.length === 0) return [];
  const trig = mersTrigonometric(latura, sens);
  const ordonate = (c.orientare ?? 1) > 0 === trig ? varfuri : [...varfuri].reverse().map((v) => ({ V: v.V, P: v.N, N: v.P }));
  return colturiDinVarfuri(ordonate, latura, trig, R, tip, (Q, V, P, N, alfa) => {
    const picior = R / Math.tan(alfa / 2);
    if (picior > dist(P, V) + 1e-9 || picior > dist(N, V) + 1e-9) return false;
    return dPunctLista(Q, c.primitive) >= R * (1 - 1e-12) - 1e-9;
  });
}

/** Colțurile (§2–§3) din vârfurile în ordinea de mers, cu testul de existență al lui Q dat de formă. */
function colturiDinVarfuri(
  ordonate: ReadonlyArray<{ readonly V: P2; readonly P: P2; readonly N: P2 }>, latura: 'exterior' | 'interior', trig: boolean, R: number, tip: TipColturiO,
  existaQ: (Q: P2, V: P2, P: P2, N: P2, alfa: number) => boolean,
): ColtDegajat[] {
  const s = trig ? 1 : -1;
  const rez: ColtDegajat[] = [];
  ordonate.forEach(({ V, P, N }, k) => {
    const dIn = unit(sub(V, P)), dOut = unit(sub(N, V));
    const vir = Math.atan2(cross(dIn, dOut), dot(dIn, dOut));
    const teta = Math.PI - s * vir;
    const alfaSpate = latura === 'interior' ? teta : 2 * Math.PI - teta;
    if (!(alfaSpate < Math.PI - 1e-12)) return;
    const e1 = unit(sub(P, V)), e2 = unit(sub(N, V));
    const alfa = Math.acos(Math.max(-1, Math.min(1, dot(e1, e2))));
    const u = unit(plus(e1, e2));
    const sinJ = Math.sin(alfa / 2);
    const Q = plus(V, u, R / sinJ);
    if (!existaQ(Q, V, P, N, alfa)) return;
    const rest = R / sinJ - R;
    if (!(rest >= REST_MINIM - 1e-12)) return;
    const normala = (e: P2): P2 => {
      const n = { x: -e.y, y: e.x };
      return dot(n, u) > 0 ? n : { x: e.y, y: -e.x };
    };
    const pereti: [Perete, Perete] = [
      { dir: e1, L: dist(P, V), n: normala(e1) },
      { dir: e2, L: dist(N, V), n: normala(e2) },
    ];
    let E: P2, lung: 0 | 1 | null = null, EAlt: P2 | null = null;
    if (tip === 'dog-bone') {
      E = plus(V, u, R);
    } else {
      const dL = pereti[0].L - pereti[1].L;
      lung = Math.abs(dL) < EGALITATE_LATURI ? 1 : dL > 0 ? 0 : 1;
      E = plus(V, pereti[1 - lung]!.n, R);
      if (Math.abs(Math.abs(dL) - EGALITATE_LATURI) <= 1e-9) EAlt = plus(V, pereti[lung]!.n, R);
    }
    const intra = (w: Perete): number => Math.max(0, R - dot(sub(E, V), w.n));
    rez.push({ k, V, Q, E, alfa, u, tip, pereti, lung, EAlt, intrare: [intra(pereti[0]), intra(pereti[1])], rest });
  });
  return rez;
}

// ---------------------------------------------------------------------------------------------------------------
// Drumurile dus-întors, citite din program.

export type DrumDusIntors = {
  /** Indicii celor două mișcări în lista de evenimente. */
  readonly ev: readonly [number, number];
  readonly linii: readonly [number, number];
  /** Startul (Q), capătul dus (E) și întoarcerea, în plan, în document; Z-urile capetelor. */
  readonly Q: P2; readonly E: P2; readonly inapoi: P2;
  readonly zQ: number; readonly zE: number; readonly zInapoi: number;
  readonly f1?: number; readonly f2?: number;
};

const inMaterial = (m: Mutare, laDoc: (p: Punct3) => Punct3): boolean =>
  m.cod !== 0 && m.startCunoscut && laDoc(m.a)[2] < -TOL_SUB && laDoc(m.b)[2] < -TOL_SUB;
const inPlan = (m: Mutare, laDoc: (p: Punct3) => Punct3): number => dist(xy(laDoc(m.a)), xy(laDoc(m.b)));

/** Drumurile dus-întors ale unui program (definiția din antet), în ordinea lor. */
export function drumuriDusIntors(evenimente: readonly Eveniment[], laDoc: (p: Punct3) => Punct3): DrumDusIntors[] {
  const idx: number[] = [];
  evenimente.forEach((e, k) => { if (e.tip === 'mutare') idx.push(k); });
  const m = (t: number): Mutare | null => (t >= 0 && t < idx.length ? (evenimente[idx[t]!] as Extract<Eveniment, { tip: 'mutare' }>).m : null);
  const rez: DrumDusIntors[] = [];
  for (let t = 0; t + 1 < idx.length; t++) {
    const m1 = m(t)!, m2 = m(t + 1)!;
    if (m1.cod !== 1 || m2.cod !== 1 || !m1.startCunoscut || !m2.startCunoscut) continue;
    const a1 = laDoc(m1.a), b1 = laDoc(m1.b), b2 = laDoc(m2.b);
    if (!(a1[2] < -TOL_SUB && b1[2] < -TOL_SUB && b2[2] < -TOL_SUB)) continue;
    const A = xy(a1), B = xy(b1), A2 = xy(b2);
    if (!(dist(A, B) > DUS_MINIM) || dist(A2, A) > TOL_INCHIDERE) continue;
    const m0 = m(t - 1), m3 = m(t + 2);
    const lipita0 = m0 !== null && inMaterial(m0, laDoc) && inPlan(m0, laDoc) > 0 && dist(xy(laDoc(m0.b)), A) <= TOL_INCHIDERE;
    const lipita3 = m3 !== null && inMaterial(m3, laDoc) && inPlan(m3, laDoc) > 0 && dist(xy(laDoc(m3.a)), A2) <= TOL_INCHIDERE;
    const inversa0 = lipita0 && m0!.cod === 1 && dist(xy(laDoc(m0!.a)), B) <= TOL_INCHIDERE;
    const inversa3 = lipita3 && m3!.cod === 1 && dist(xy(laDoc(m3!.b)), B) <= TOL_INCHIDERE;
    if (inversa0 || inversa3 || !(lipita0 || lipita3)) continue;
    rez.push({
      ev: [idx[t]!, idx[t + 1]!], linii: [m1.linia, m2.linia], Q: A, E: B, inapoi: A2, zQ: a1[2], zE: b1[2], zInapoi: b2[2],
      ...(m1.f === undefined ? {} : { f1: m1.f }), ...(m2.f === undefined ? {} : { f2: m2.f }),
    });
    t++;
  }
  return rez;
}

/** Evenimentele fără mișcările drumurilor (§7: buclele se judecă fără ele). */
export function faraDrumuri(evenimente: readonly Eveniment[], drumuri: readonly DrumDusIntors[]): Eveniment[] {
  const scoase = new Set<number>(drumuri.flatMap((d) => [...d.ev]));
  return evenimente.filter((_, k) => !scoase.has(k));
}

// ---------------------------------------------------------------------------------------------------------------
// A. Poarta: legarea etichetei, condițiile §5, invarianta 13 și scutirea de la invarianta 2.

export type LegareD = {
  readonly id: string; readonly latura: LaturaV10O;
  /** Indicele operației printre operațiile elementului pe latura etichetei (ordinea tăieturilor). */
  readonly k: number;
  readonly colturi: ColturiO | null; readonly sens: SensO | null; readonly urechi: UrechiO | null; readonly adancime: number;
};

const TOL_ADANCIME = 0.0005 + 1e-9;

/**
 * Legarea etichetei de operație, ca la 9–12: candidatele = operațiile elementului pe latura etichetei, cu adâncimea ei;
 * același tuplu (sens, urechi, rampă, intrări, colțuri) pe toate = prima; altfel a k-a apariție a etichetei = a k-a
 * candidată. `motiv`: ambiguă.
 */
export function legarileDegajarilor(etichete: readonly EtichetaActiva[], reg: Regiune): Array<LegareD | { readonly motiv: string } | null> {
  const aparitii = new Map<string, number>();
  const text = (x: unknown): string => JSON.stringify(x ?? null);
  return etichete.map(({ eticheta: et }) => {
    if (!et) return null;
    const t = reg.taieturi.get(et.idLume);
    const adancimi = t?.laturi.get(et.latura) ?? [];
    const candidate = adancimi.flatMap((a, k) => (Math.abs(a - et.adancime) <= TOL_ADANCIME ? [k] : []));
    if (!t || candidate.length === 0) return { motiv: `${et.idLume} n-are o operație ${et.latura} de ${et.adancime} mm` };
    const valori = candidate.map((c) => ({
      k: c, sens: t.sensuri.get(et.latura)?.[c] ?? null, urechi: (t.urechi?.get(et.latura)?.[c] ?? null) as UrechiO | null,
      rampa: (t.rampe?.get(et.latura)?.[c] ?? null) as RampaO | null, intrari: (t.intrari?.get(et.latura)?.[c] ?? null) as IntrariO | null,
      colturi: (t.colturi?.get(et.latura)?.[c] ?? null) as ColturiO | null, adancime: adancimi[c]!,
    }));
    const cheieV = (v: (typeof valori)[number]): string => `${v.sens}#${text(v.urechi)}#${text(v.rampa)}#${text(v.intrari)}#${text(v.colturi)}`;
    const cheie = `${et.idLume}|${et.latura}|${candidate.join(',')}`;
    const j = aparitii.get(cheie) ?? 0;
    aparitii.set(cheie, j + 1);
    const leaga = (v: (typeof valori)[number]): LegareD => ({ id: et.idLume, latura: et.latura, k: v.k, colturi: v.colturi, sens: v.sens, urechi: v.urechi, adancime: v.adancime });
    if (valori.every((v) => cheieV(v) === cheieV(valori[0]!))) return leaga(valori[0]!);
    if (j < valori.length) return leaga(valori[j]!);
    return { motiv: `${et.idLume} are ${valori.length} operații ${et.latura} de ${et.adancime} mm cu parametri diferiți, iar eticheta apare de ${j + 1} ori` };
  });
}

/** O buclă a foii (pentru §5 a): tăietura (elementul, latura, indicele operației) și traseul ei exact. */
type BuclaFoaie = { readonly id: string; readonly latura: LaturaO; readonly k: number; readonly drum: readonly Primitiva[]; readonly program: boolean };

/** Banda verdictelor când una dintre măsuri vine din program (cotele rotunjite la 3 zecimale: ±0,0007, plus arcele). */
export const BANDA_PROGRAM = 0.003;

/**
 * Traseele tuturor buclelor de pe foaia 0: câte unul pe fiecare operație (offsetul exact, sau conturul pe `pe-linie`).
 * Felia 2.7b: o cale n-are offset exact aici (`drumIdeal` = null), deci bucla ei e cea citită din program (`dinProgram`,
 * cheia `id|latura|k`), marcată `program` (banda ei e `BANDA_PROGRAM`); fără ea, bucla lipsește (o limită spusă).
 */
export function bucleleFoii(reg: Regiune, R: number, dinProgram: ReadonlyMap<string, readonly Primitiva[]> = new Map()): BuclaFoaie[] {
  const rez: BuclaFoaie[] = [];
  for (const [id, t] of reg.taieturi) {
    if (!t.contur) continue;
    for (const [latura, adancimi] of t.laturi) {
      // ADR 0037 §9 (felia 2.3c-5): o tăietură pe o parte nu e buclă (iar degajările pe ea sunt refuzate, `deschise.ts`).
      if (peOParte(latura)) continue;
      const exact = latura === 'pe-linie' ? t.contur.primitive : t.contur.drumIdeal(R, latura);
      for (let k = 0; k < adancimi.length; k++) {
        const drum = exact ?? dinProgram.get(`${id}|${latura}|${k}`) ?? null;
        if (!drum || drum.length === 0) continue;
        const fara = drum.filter((q) => q.tip !== 'punct');
        rez.push({ id, latura, k, drum: fara.length ? fara : drum, program: !exact });
      }
    }
  }
  return rez;
}

export type Verdict = 'da' | 'nu' | 'banda';
/** §5 (precizarea din 11.10): motivele avertismentului, în ordinea verificărilor. */
export const MOTIVE = ['prea aproape de altă buclă', 'prea aproape de degajarea altei bucle', 'ar tăia puntea unei urechi', 'prea aproape de marginea foii'] as const;
export type Motiv = (typeof MOTIVE)[number];
/** §5 c: cât stă cel puțin discul drumului de fiecare latură a foii (mm). */
export const MARJA_FOAIE = 1;

export type ColtJudecat = ColtDegajat & {
  /** Tăietura: elementul în lume, latura, indicele operației. */
  readonly id: string; readonly latura: 'exterior' | 'interior'; readonly kOp: number;
  readonly verdict: Verdict;
  /** Ce poate face aplicația, în ordinea verificărilor: null = păstrat; un motiv = omis cu el. */
  readonly rezultate: ReadonlyArray<Motiv | null>;
  /** Prima condiție care nu trece clar, cu măsura (pentru mesaje). */
  readonly motiv: string;
};

type Proba = { readonly v: Verdict; readonly m: string };
const proba = (d: number, p: number, m: string, banda = BANDA_CONDITII): Proba => ({ v: d < p - banda ? 'nu' : d < p + banda ? 'banda' : 'da', m });
const ceaMaiRea = (ps: readonly Proba[]): Proba => ps.find((x) => x.v === 'nu') ?? ps.find((x) => x.v === 'banda') ?? { v: 'da', m: '' };

/** Rezultatele posibile ale verificărilor luate în ordine: prima care pică e motivul; în bandă, ambele ramuri. */
function rezultatele(probe: ReadonlyArray<readonly [Motiv, Proba]>): Array<Motiv | null> {
  const rez: Array<Motiv | null> = [];
  for (const [m, p] of probe) {
    if (p.v === 'nu') { rez.push(m); return rez; }
    if (p.v === 'banda') rez.push(m);
  }
  rez.push(null);
  return rez;
}

/** Cutia unei liste de primitive (capetele și punctele cardinale ale arcelor). */
function cutiaDrumului(ps: readonly Primitiva[]): { minX: number; maxX: number; minY: number; maxY: number } {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const q of ps) {
    const pts: P2[] = [];
    if (q.tip === 'punct') pts.push(q.p);
    else if (q.tip === 'segment') pts.push(q.a, q.b);
    else {
      const L = lungimeP(q);
      pts.push(punctLa(q, 0), punctLa(q, L));
      for (let k = 0; k < 4; k++) {
        const u = (k * Math.PI) / 2;
        const t = ((((u - q.u0) * Math.sign(q.du)) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        if (t <= Math.abs(q.du) + 1e-12) pts.push({ x: q.c.x + q.r * Math.cos(u), y: q.c.y + q.r * Math.sin(u) });
      }
    }
    for (const x of pts) { minX = Math.min(minX, x.x); maxX = Math.max(maxX, x.x); minY = Math.min(minY, x.y); maxY = Math.max(maxY, x.y); }
  }
  return { minX, maxX, minY, maxY };
}

/** Golurile (st, dr, jos, sus) dintre cutia discului de rază R în jurul cutiei `c` și laturile foii W × H. */
const golurile = (c: { minX: number; maxX: number; minY: number; maxY: number }, R: number, W: number, H: number): readonly number[] =>
  [c.minX - R, W - (c.maxX + R), c.minY - R, H - (c.maxY + R)];
const LATURI_FOII = ['stânga', 'dreapta', 'jos', 'sus'] as const;

export type JudecataFoii = {
  /** Colțurile judecate ale fiecărei tăieturi cu `colturi` (cheia `id|latura|k`). */
  readonly colturi: ReadonlyMap<string, readonly ColtJudecat[]>;
  /** Arcele concave pentru K cu raza sub R, pe fiecare tăietură cu `colturi`. */
  readonly arce: ReadonlyArray<{ readonly id: string; readonly cheie: string; readonly r: number }>;
  /** Felia 2.7b (recenzia): colțurile curbe și curbele strânse ale căilor cu `colturi` (avertismentele, cu bandă). */
  readonly curbe: readonly AvertismentCerut[];
};

/** Un avertisment cerut: obligatoriu sau în bandă; formele acceptate (text exact, sau o potrivire cu toleranță). */
export type Potrivire = { readonly afis: string; readonly test: (a: string) => boolean };
export type AvertismentCerut = { readonly obligatoriu: boolean; readonly texte: ReadonlyArray<string | Potrivire> };

/** Numerele unui text, în ordine. */
const numereDin = (s: string): number[] => [...s.matchAll(/-?\d+(?:\.\d+)?/g)].map((x) => Number(x[0]));

/** Potrivirea unui text cu șablonul (numerele `?` pe poziții), cu toleranța pe fiecare număr. */
function potrivire(afis: string, sablon: RegExp, valori: readonly number[], tol: number): Potrivire {
  return {
    afis,
    test: (a) => {
      const m = sablon.exec(a);
      if (!m) return false;
      const xs = m.slice(1).map(Number);
      return xs.length === valori.length && xs.every((x, k) => Math.abs(x - valori[k]!) <= tol);
    },
  };
}

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const NUM = '(-?\\d+\\.\\d{3})';

/** Raza minimă de curbură a cubicei (a, c1, c2, b) acolo unde centrul de curbură e pe partea `nw` (normala dată de semn). */
function razaMinimaSpre(a: P2, c1: P2, c2: P2, b: P2, peDeseu: (p: P2, T: P2, centru: P2) => boolean): { readonly r: number; readonly p: P2 } | null {
  const ev = (t: number): { p: P2; d1: P2; d2: P2 } => {
    const s = 1 - t;
    const P = (k0: number, k1: number, k2: number, k3: number): P2 => ({ x: k0 * a.x + k1 * c1.x + k2 * c2.x + k3 * b.x, y: k0 * a.y + k1 * c1.y + k2 * c2.y + k3 * b.y });
    return { p: P(s * s * s, 3 * s * s * t, 3 * s * t * t, t * t * t), d1: P(-3 * s * s, 3 * s * s - 6 * s * t, 6 * s * t - 3 * t * t, 3 * t * t), d2: P(6 * s, -12 * s + 6 * t, 6 * s - 12 * t, 6 * t) };
  };
  const raza = (t: number): number => {
    const { p, d1, d2 } = ev(t);
    const v = Math.hypot(d1.x, d1.y);
    if (!(v > 0)) return 0;
    const k = (d1.x * d2.y - d1.y * d2.x) / (v * v * v);
    if (k === 0) return Infinity;
    const T = { x: d1.x / v, y: d1.y / v };
    const N = { x: -T.y * Math.sign(k), y: T.x * Math.sign(k) };
    return peDeseu(p, T, N) ? 1 / Math.abs(k) : Infinity;
  };
  const n = 4000;
  let km = -1, rm = Infinity;
  for (let k = 0; k <= n; k++) { const r = raza(k / n); if (r < rm) { rm = r; km = k; } }
  if (km < 0 || !Number.isFinite(rm)) return null;
  // Secțiunea de aur în jurul celui mai mic eșantion.
  let lo = Math.max(0, (km - 1) / n), hi = Math.min(1, (km + 1) / n);
  const g = (Math.sqrt(5) - 1) / 2;
  for (let it = 0; it < 80; it++) {
    const m1 = hi - g * (hi - lo), m2 = lo + g * (hi - lo);
    if (raza(m1) <= raza(m2)) hi = m2; else lo = m1;
  }
  const t = (lo + hi) / 2;
  const r = Math.min(raza(t), rm);
  return { r, p: ev(r === rm ? km / n : t).p };
}

/**
 * ADR 0034 §6 (precizările recenziei), pe o cale cu `colturi` pe latura dată: colțurile desenului cu o latură curbă (A
 * sau C), concave pentru K, cu restul R / cos(θ/2) − R ≥ 0,01 (θ = cât se rupe mersul), la care bucla ajunge (la cel mult
 * 2R / cos(θ/2) de vârf; bucla citită din program), primesc „degajarea omisă la colțul (x, y): o latură a colțului e
 * curbă”; o cubică ce se strânge spre deșeu sub R primește „curba de lângă (x, y) se strânge până la raza r mm”, în
 * punctul razei minime. Pe pragurile lor (± 1e-6 la rest și la rază, ± `BANDA_PROGRAM` la distanța buclei), în bandă.
 */
export function avertismenteleCaii(id: string, c: Contur, latura: 'exterior' | 'interior', R: number, bucla: readonly Primitiva[] | undefined): AvertismentCerut[] {
  const rez: AvertismentCerut[] = [];
  const o = c.orientare ?? 1;
  const lung = (l: LaturaCale): number => (l.tip === 'A' && l.arc && l.arc.tip === 'arc' ? Math.abs(l.arc.du) * l.arc.r : dist(l.a, l.b) + (l.c1 ? dist(l.a, l.c1) : 0));
  const ls = (c.laturiCale ?? []).filter((l) => lung(l) >= CURATARE);
  for (let k = 0; k < ls.length; k++) {
    const p = ls[(k + ls.length - 1) % ls.length]!, n = ls[k]!;
    if ((p.tip === 'L' && n.tip === 'L') || !p.t1 || !n.t0) continue;
    const vir = Math.atan2(cross(p.t1, n.t0), dot(p.t1, n.t0));
    const concav = latura === 'exterior' ? o * vir < 0 : o * vir > 0;
    if (!concav) continue;
    const cj = Math.cos(Math.abs(vir) / 2);
    const rest = cj > 0 ? R / cj - R : Infinity;
    if (rest < REST_MINIM - 1e-6) continue;
    const V = n.a;
    const lim = cj > 0 ? (2 * R) / cj : Infinity;
    const d = bucla && bucla.length ? dPunctLista(V, bucla) : NaN;
    if (Number.isFinite(d) && d > lim + BANDA_PROGRAM) continue;
    const banda = Math.abs(rest - REST_MINIM) <= 1e-6 || !Number.isFinite(d) || Math.abs(d - lim) <= BANDA_PROGRAM;
    const afis = `${id}: degajarea omisă la colțul (${f3(V.x)}, ${f3(V.y)}): o latură a colțului e curbă`;
    rez.push({ obligatoriu: !banda, texte: [potrivire(afis, new RegExp(`^${escapeRe(id)}: degajarea omisă la colțul \\(${NUM}, ${NUM}\\): o latură a colțului e curbă$`), [V.x, V.y], 0.0015)] });
  }
  const nw = (T: P2): P2 => {
    const afara = o > 0 ? { x: T.y, y: -T.x } : { x: -T.y, y: T.x };
    return latura === 'exterior' ? afara : { x: -afara.x, y: -afara.y };
  };
  for (const l of ls) {
    if (l.tip !== 'C' || !l.c1 || !l.c2) continue;
    const x = razaMinimaSpre(l.a, l.c1, l.c2, l.b, (_p, T, N) => dot(N, nw(T)) > 0);
    if (!x || x.r > R + 1e-6) continue;
    const afis = `${id}: curba de lângă (${f3(x.p.x)}, ${f3(x.p.y)}) se strânge până la raza ${f3(x.r)} mm (sub raza frezei, ${f3(R)} mm): freza o rotunjește`;
    rez.push({
      obligatoriu: Math.abs(x.r - R) > 1e-6 && x.r > 1e-3,
      texte: [potrivire(afis, new RegExp(`^${escapeRe(id)}: curba de lângă \\(${NUM}, ${NUM}\\) se strânge până la raza ${NUM} mm \\(sub raza frezei, ${escapeRe(f3(R))} mm\\): freza o rotunjește$`), [x.p.x, x.p.y, x.r], x.r > 1e-3 ? 0.002 : Infinity)],
    });
  }
  return rez;
}

/**
 * §5 (cu precizarea din 11.10) pe toată foaia 0: colțurile fiecărei operații `exterior` / `interior` cu `colturi`, cu
 * verificările în ordine: a (traseul altor bucle, ≥ D + 1), a (drumurile candidaților altor bucle, ≥ D + 1), b
 * (coloanele urechilor proprii, ≥ D; doar dacă pornirea buclei e dată), c (foaia, dacă e dată).
 */
export function judecaFoaia(
  reg: Regiune, R: number, foaie: { readonly latime: number; readonly inaltime: number } | null, pornire: ReadonlyMap<string, P2>,
  dinProgram: ReadonlyMap<string, readonly Primitiva[]> = new Map(),
): JudecataFoii {
  const D = 2 * R;
  const bucle = bucleleFoii(reg, R, dinProgram);
  type Brut = { readonly cheie: string; readonly id: string; readonly latura: 'exterior' | 'interior'; readonly k: number; readonly c: ColtDegajat; readonly sens: SensO; readonly urechi: UrechiO | null; readonly drum: Primitiva };
  const toate: Brut[] = [];
  const arce: Array<{ id: string; cheie: string; r: number }> = [];
  const curbe: AvertismentCerut[] = [];
  for (const [id, t] of reg.taieturi) {
    if (!t.contur) continue;
    for (const [latura, adancimi] of t.laturi) {
      if (latura === 'pe-linie' || peOParte(latura)) continue;
      for (let k = 0; k < adancimi.length; k++) {
        const col = t.colturi?.get(latura)?.[k] ?? null, sens = t.sensuri.get(latura)?.[k];
        if (!col || !sens) continue;
        const cheie = `${id}|${latura}|${k}`;
        for (const c of colturiDeDegajat(t.contur, latura, sens, R, col.tip)) {
          toate.push({ cheie, id, latura, k, c, sens, urechi: (t.urechi?.get(latura)?.[k] ?? null) as UrechiO | null, drum: segmentP(c.Q, c.E) });
        }
        for (const r of arceSubRaza(t.contur, latura, R)) arce.push({ id, cheie, r });
        if (t.contur.tip === 'cale') curbe.push(...avertismenteleCaii(id, t.contur, latura, R, dinProgram.get(cheie)));
      }
    }
  }
  // a, traseul: față de toate celelalte bucle (nu și de bucla însăși).
  const a = toate.map((x) => ceaMaiRea(bucle.filter((b) => !(b.id === x.id && b.latura === x.latura && b.k === x.k)).map((b) => {
    const d = distantaListe([x.drum], b.drum);
    return proba(d, D + MARJA_SCHELET, `a (drumul e la ${mm(d)} mm de bucla ${b.id} ${b.latura}, sub D + 1 = ${mm(D + MARJA_SCHELET)})`, b.program ? BANDA_PROGRAM : BANDA_CONDITII);
  })));
  // a, candidații: ai altor bucle, care trec partea „traseu” (în bandă: candidați poate, deci verdictul lor e în bandă).
  const cand = toate.map((x, i) => ceaMaiRea(toate.flatMap((y, j) => {
    if (y.cheie === x.cheie || a[j]!.v === 'nu') return [];
    const d = distantaListe([x.drum], [y.drum]);
    const p = proba(d, D + MARJA_SCHELET, `a (drumul e la ${mm(d)} mm de drumul candidat al colțului (${mm(y.c.V.x)}, ${mm(y.c.V.y)}) al lui ${y.id}, sub D + 1)`);
    return [a[j]!.v === 'banda' && p.v === 'nu' ? { ...p, v: 'banda' as const } : p];
  })));
  // b, coloanele urechilor proprii (pornirea buclei din program).
  const coloane = new Map<string, Primitiva[][]>();
  const b = toate.map((x) => {
    if (!x.urechi) return { v: 'da' as const, m: '' };
    let cols = coloane.get(x.cheie);
    if (!cols) {
      const i = reg.inele.findIndex((q) => q.idLume === x.id);
      const analitica = i >= 0 ? buclaAnalitica(reg, i, x.latura, R, x.sens) : null;
      // Felia 2.7b: la o cale, bucla din program (pornită chiar din p₀, în sensul de mers).
      const bucla = analitica ?? (dinProgram.get(x.cheie) as Primitiva[] | undefined) ?? null;
      const p0 = pornire.get(x.cheie);
      cols = bucla && p0 ? coloaneleUrechilor(bucla, p0, x.urechi, D) : [];
      coloane.set(x.cheie, cols);
    }
    const banda = dinProgram.has(x.cheie) && reg.taieturi.get(x.id)?.contur?.tip === 'cale' ? BANDA_PROGRAM : BANDA_CONDITII;
    return ceaMaiRea(cols.map((col, k) => {
      const d = distantaListe([x.drum], col);
      return proba(d, D, `b (drumul e la ${mm(d)} mm de coloana urechii ${k}, sub D = ${mm(D)})`, banda);
    }));
  });
  // c, foaia: golul cutiei discului drumului ≥ min(1, golul cutiei discului buclei), pe fiecare latură.
  const c = toate.map((x) => {
    if (!foaie) return { v: 'da' as const, m: '' };
    const t = reg.taieturi.get(x.id)!;
    const exact = t.contur!.drumIdeal(R, x.latura);
    const drumBucla = exact ?? dinProgram.get(x.cheie) ?? [];
    // Fără nicio buclă cunoscută, golul ei nu se știe: verdictul e în bandă (oricare).
    if (drumBucla.length === 0) return { v: 'banda' as const, m: 'c (bucla nu se cunoaște)' };
    const banda = exact ? BANDA_CONDITII : BANDA_PROGRAM;
    const gB = golurile(cutiaDrumului(drumBucla), R, foaie.latime, foaie.inaltime);
    const gD = golurile(cutiaDrumului([x.drum]), R, foaie.latime, foaie.inaltime);
    return ceaMaiRea(gD.map((g, k) => proba(g, Math.min(MARJA_FOAIE, gB[k]!), `c (discul drumului e la ${mm(g)} mm de latura ${LATURI_FOII[k]} a foii; bucla, la ${mm(gB[k]!)})`, banda)));
  });
  const colturi = new Map<string, ColtJudecat[]>();
  toate.forEach((x, i) => {
    const probe = [[MOTIVE[0], a[i]!], [MOTIVE[1], cand[i]!], [MOTIVE[2], b[i]!], [MOTIVE[3], c[i]!]] as const;
    const rezultate = rezultatele(probe);
    const verdict: Verdict = rezultate.length === 1 && rezultate[0] === null ? 'da' : rezultate.includes(null) ? 'banda' : 'nu';
    const motiv = probe.find(([, p]) => p.v !== 'da')?.[1].m ?? '';
    colturi.set(x.cheie, [...(colturi.get(x.cheie) ?? []), { ...x.c, id: x.id, latura: x.latura, kOp: x.k, verdict, rezultate, motiv }]);
  });
  return { colturi, arce, curbe };
}

const f3 = (v: number): string => v.toFixed(3);

/**
 * Avertismentele cerute de §5 și §2 (precizarea din 11.10), din judecata foii: pe fiecare colț omis, textul exact cu
 * motivul (în bandă: oricare dintre rezultatele posibile, sau niciunul, deci neobligatoriu); pe fiecare arc sub R, textul
 * lui. `texte` = formele acceptate.
 */
export function avertismenteleCerute(j: JudecataFoii, R: number): AvertismentCerut[] {
  const rez: AvertismentCerut[] = [];
  for (const lista of j.colturi.values()) {
    for (const c of lista) {
      const motive = c.rezultate.filter((m): m is Motiv => m !== null);
      if (!motive.length) continue;
      rez.push({ obligatoriu: !c.rezultate.includes(null), texte: motive.map((m) => `${c.id}: degajarea omisă la colțul (${f3(c.V.x)}, ${f3(c.V.y)}): ${m}`) });
    }
  }
  for (const x of j.arce) {
    rez.push({ obligatoriu: true, texte: [`${x.id}: colțul rotunjit cu raza ${f3(x.r)} mm (sub raza frezei, ${f3(R)} mm) rămâne cu raza frezei; degajarea pe arce vine cu importul SVG`] });
  }
  rez.push(...j.curbe);
  return rez;
}

/**
 * Avertismentele aplicației față de cele cerute: cele despre degajări (`degajarea omisă`, `colțul rotunjit`) se potrivesc
 * una câte una cu cele cerute (textul exact); întoarce problemele (goală = exact cele cerute).
 */
export function comparaAvertismentele(av: readonly string[] | null, cerute: readonly AvertismentCerut[]): string[] {
  const rele: string[] = [];
  const libere = cerute.map((x) => ({ ...x, luat: false }));
  const potriveste = (t: string | Potrivire, a: string): boolean => (typeof t === 'string' ? t === a : t.test(a));
  // Felia 2.7b (recenzia): și „curba de lângă … se strânge” (ADR 0034 §6).
  for (const a of (av ?? []).filter((x) => /degajarea omisă|colțul rotunjit|se strânge până la raza/.test(x))) {
    const x = libere.find((q) => !q.luat && q.texte.some((t) => potriveste(t, a)));
    if (x) x.luat = true;
    else rele.push(`avertisment necerut (sau în altă formă): „${a}”`);
  }
  for (const x of libere) if (x.obligatoriu && !x.luat) rele.push(`lipsește avertismentul „${x.texte.map((t) => (typeof t === 'string' ? t : t.afis)).join('” sau „')}”`);
  return rele;
}

export type IncalcareDegajari = { readonly invarianta: 13; readonly linia: number; readonly mesaj: string };

export type AnalizaDegajari = {
  readonly drumuri: readonly DrumDusIntors[];
  /** Evenimentele fără drumuri (pentru 9–12). */
  readonly faraDrumuri: readonly Eveniment[];
  /** Liniile drumurilor EXACTE (§3–§4, potrivite cu un colț al tăieturii etichetei) → indicele inelului tăieturii. */
  readonly scutite: ReadonlyMap<number, number>;
  readonly incalcari: readonly IncalcareDegajari[];
  /** Colțurile judecate pe fiecare tăietură (cheia `id|latura|k`) și arcele sub R, pentru hârtie și lipire. */
  readonly colturi: ReadonlyMap<string, readonly ColtJudecat[]>;
  readonly judecata: JudecataFoii;
};

/**
 * Invarianta 13 pe un program, plus ce le trebuie invariantelor 2 (scutirea) și 9–12 (evenimentele fără drumuri).
 * `R` = raza frezei, `foaie` = foaia documentului (contextul porții; §5 c).
 */
export function analizeazaDegajarile(
  evenimente: readonly Eveniment[], etichete: readonly EtichetaActiva[], reg: Regiune, laDoc: (p: Punct3) => Punct3, R: number,
  foaie: { readonly latime: number; readonly inaltime: number } | null = null,
): AnalizaDegajari {
  const rez: IncalcareDegajari[] = [];
  const drumuri = drumuriDusIntors(evenimente, laDoc);
  const fara = faraDrumuri(evenimente, drumuri);
  const leg = legarileDegajarilor(etichete, reg);
  const D = 2 * R;
  // §6: degajări pe pe-linie = exportul trebuia refuzat; o legare ambiguă între operații cu colțuri diferite.
  etichete.forEach((e, k) => {
    const x = leg[k];
    if (!e.eticheta || !x) return;
    if ('motiv' in x) {
      const t = reg.taieturi.get(e.eticheta.idLume);
      const cc = t?.colturi?.get(e.eticheta.latura) ?? [];
      if (cc.some((c) => JSON.stringify(c) !== JSON.stringify(cc[0] ?? null))) rez.push({ invarianta: 13, linia: e.linia, mesaj: `degajările: ${x.motiv}` });
      return;
    }
    if (x.latura === 'pe-linie' && x.colturi !== null) {
      rez.push({ invarianta: 13, linia: e.linia, mesaj: `degajările lui ${x.id} (pe-linie): pe-linie n-are parte de deșeu; exportul trebuia refuzat (§6)` });
    }
  });
  // Pornirea buclei fiecărei tăieturi (prima trecere a etichetei): p₀ cu intrări, vârful 0 fără (doar dacă documentul are
  // degajări: altfel nu trebuie, iar poarta rămâne la fel de rapidă pe programele fără ele).
  const areColturi = [...reg.taieturi.values()].some((t) => [...(t.colturi?.values() ?? [])].some((l) => l.some((c) => c !== null)));
  const pornire = new Map<string, P2>();
  /** Felia 2.7b: bucla fiecărei tăieturi, citită din program (prima ei buclă închisă), pentru căile fără offset exact. */
  const dinProgram = new Map<string, Primitiva[]>();
  for (const l of areColturi ? lanturile(fara, etichete.map((e) => e.linia), laDoc) : []) {
    const x = l.eticheta >= 0 ? leg[l.eticheta] : null;
    if (!x || 'motiv' in x) continue;
    const cheie = `${x.id}|${x.latura}|${x.k}`;
    if (pornire.has(cheie)) continue;
    const t = desparteCuRampa(l.pasi) ?? desparte(l.pasi);
    const p = t.p0 ?? l.pasi.find((q) => !q.vertical)?.a ?? null;
    if (p) pornire.set(cheie, p);
    if (t.bucla.length) {
      dinProgram.set(cheie, t.bucla.map((q) => (q.c !== undefined && q.r !== undefined && q.unghi !== undefined
        ? arcP(q.c, q.r, Math.atan2(q.a.y - q.c.y, q.a.x - q.c.x), q.unghi)
        : segmentP(q.a, q.b))));
    }
  }
  // Colțurile judecate pe toată foaia (§5 a are nevoie de candidații celorlalte bucle), o singură dată.
  const judecata: JudecataFoii = areColturi ? judecaFoaia(reg, R, foaie, pornire, dinProgram) : { colturi: new Map(), arce: [], curbe: [] };
  const colturi = judecata.colturi;
  const ale = (x: LegareD): readonly ColtJudecat[] => colturi.get(`${x.id}|${x.latura}|${x.k}`) ?? [];
  void D;
  // Avansul de tăiere: cel mai mare F al mișcărilor în material, în plan, la Z constant (fără drumuri).
  let avans = -Infinity;
  for (const e of fara) {
    if (e.tip !== 'mutare' || e.m.f === undefined || !inMaterial(e.m, laDoc) || inPlan(e.m, laDoc) === 0) continue;
    if (Math.abs(laDoc(e.m.a)[2] - laDoc(e.m.b)[2]) <= 1e-9 && e.m.f > avans) avans = e.m.f;
  }
  // Sosirile, în ordinea programului.
  const dupaPrima = new Map<number, DrumDusIntors>();
  for (const d of drumuri) dupaPrima.set(d.ev[0], d);
  const folosite = new Set<DrumDusIntors>();
  const scutite = new Map<number, number>();
  const liniiEt = etichete.map((e) => e.linia);
  const idx: number[] = [];
  evenimente.forEach((e, k) => { if (e.tip === 'mutare') idx.push(k); });
  const inDrum = new Set<number>(drumuri.flatMap((d) => [...d.ev]));
  let iE = -1;
  for (let t = 0; t < idx.length; t++) {
    const k = idx[t]!;
    const m = (evenimente[k] as Extract<Eveniment, { tip: 'mutare' }>).m;
    while (iE + 1 < liniiEt.length && liniiEt[iE + 1]! < m.linia) iE++;
    if (inDrum.has(k)) continue;
    if (m.cod !== 1 || !m.startCunoscut || !(laDoc(m.b)[2] < -TOL_SUB) || inPlan(m, laDoc) === 0) continue;
    const x = iE >= 0 ? leg[iE] : null;
    if (!x || 'motiv' in x || x.colturi === null || x.latura === 'pe-linie') continue;
    const b = laDoc(m.b);
    const c = ale(x).find((q) => dist(q.Q, xy(b)) <= TOL_Q);
    if (!c) continue;
    const urm = t + 1 < idx.length ? dupaPrima.get(idx[t + 1]!) : undefined;
    const unde = `${x.id} (${x.latura}, ${x.colturi.tip}), colțul (${mm(c.V.x)}, ${mm(c.V.y)}), sosirea la linia ${m.linia}`;
    if (!urm) {
      if (c.verdict === 'da') rez.push({ invarianta: 13, linia: m.linia, mesaj: `degajările: lipsește drumul la ${unde} (Z ${mm(b[2])})` });
      continue;
    }
    folosite.add(urm);
    const potrivit = dist(urm.Q, c.Q) <= TOL_Q && (dist(urm.E, c.E) <= TOL_E || (c.EAlt !== null && dist(urm.E, c.EAlt) <= TOL_E));
    if (potrivit) {
      const i = reg.inele.findIndex((q) => q.idLume === x.id);
      if (i >= 0) { scutite.set(urm.linii[0], i); scutite.set(urm.linii[1], i); }
    }
    if (c.verdict === 'nu') {
      rez.push({ invarianta: 13, linia: urm.linii[0], mesaj: `degajările: drumul de la ${unde} trebuia omis: ${c.motiv}` });
      continue;
    }
    if (!potrivit) {
      rez.push({
        invarianta: 13, linia: urm.linii[0],
        mesaj: `degajările: la ${unde}, drumul merge în E (${mm(urm.E.x)}, ${mm(urm.E.y)}); §3 cere (${mm(c.E.x)}, ${mm(c.E.y)})${c.EAlt ? ` sau (${mm(c.EAlt.x)}, ${mm(c.EAlt.y)})` : ''}`,
      });
    }
    const z = b[2];
    if (Math.abs(urm.zQ - z) > TOL_Z_DRUM || Math.abs(urm.zE - z) > TOL_Z_DRUM || Math.abs(urm.zInapoi - z) > TOL_Z_DRUM) {
      rez.push({ invarianta: 13, linia: urm.linii[0], mesaj: `degajările: la ${unde}, drumul nu e la Z-ul sosirii ${mm(z)} (Z ${mm(urm.zQ)} → ${mm(urm.zE)} → ${mm(urm.zInapoi)})` });
    }
    if (Number.isFinite(avans) && [urm.f1, urm.f2].some((f) => f === undefined || Math.abs(f - avans) > TOL_F_DRUM)) {
      rez.push({ invarianta: 13, linia: urm.linii[0], mesaj: `degajările: la ${unde}, drumul are F ${urm.f1 ?? '?'} / ${urm.f2 ?? '?'}, nu avansul de tăiere ${avans}` });
    }
  }
  for (const d of drumuri) {
    if (folosite.has(d)) continue;
    rez.push({
      invarianta: 13, linia: d.linii[0],
      mesaj: `degajările: drum dus-întors din (${mm(d.Q.x)}, ${mm(d.Q.y)}) în (${mm(d.E.x)}, ${mm(d.E.y)}) care nu urmează unei sosiri într-un colț de degajat al operației lui (nicăieri altundeva, §7)`,
    });
  }
  return { drumuri, faraDrumuri: fara, scutite, incalcari: rez, colturi, judecata };
}

/**
 * Invarianta 2 pe o mișcare a unui drum EXACT (§7): inelul tăieturii `i` e scutit; față de orice alt inel care
 * mărginește K, distanța exactă a primitivei ≥ T; centrul stă în afara lui K. Apartenența față de CELELALTE inele e
 * constantă pe mișcare (distanța la ele e > 0), iar față de inelul tăieturii e scutită (E poate trece de dreapta
 * peretelui lung, la T-bone sub 90°); deci se judecă la un capăt: încălcare doar dacă AMBELE capete sunt în K (pe un drum
 * exact, Q e pe traseu, în deșeu).
 */
export function verificaDrumulExact(reg: Regiune, i: number, prim: Primitiva, R: number, T: number): IncalcareMutare | null {
  let rau: IncalcareMutare | null = null;
  const inK = (p: { x: number; y: number }): number => { const k = celMaiMic(reg, p); return k >= 0 && reg.inele[k]!.rol === 'piesa' ? k : -1; };
  const p0 = punctLa(prim, 0), p1 = punctLa(prim, lungimeP(prim));
  const k0 = inK(p0), k1 = inK(p1);
  if (k0 >= 0 && k1 >= 0) rau = { patrundere: R, la: p0, in: reg.inele[k0]!.idLume };
  reg.inele.forEach((inel, j) => {
    if (j === i || !reg.margineK[j]) return;
    const d = distantaListe([prim], inel.contur.primitive);
    if (d < T && (!rau || R - d > rau.patrundere)) rau = { patrundere: R - d, la: p0, in: inel.idLume };
  });
  return rau;
}

// ---------------------------------------------------------------------------------------------------------------
// B. Hârtia: măsurile citite din program.

export type DrumMasurat = DrumDusIntors & {
  /** Lungimea în plan a drumului dus (|QE|). */
  readonly L: number;
  /** Linia mișcării care sosește în Q (cea de dinaintea drumului, dacă se termină în Q). */
  readonly sosire: number | null;
};

/** Drumurile programului (fără etichete), cu lungimea și sosirea. */
export function masoaraDrumurile(text: string, laDoc: (p: Punct3) => Punct3): DrumMasurat[] {
  const { evenimente } = citeste(text);
  return drumuriDusIntors(evenimente, laDoc).map((d) => {
    let sosire: number | null = null;
    for (let k = d.ev[0] - 1; k >= 0; k--) {
      const e = evenimente[k]!;
      if (e.tip !== 'mutare') continue;
      if (dist(xy(laDoc(e.m.b)), d.Q) <= TOL_INCHIDERE && inPlan(e.m, laDoc) > 0) sosire = e.m.linia;
      break;
    }
    return { ...d, L: dist(d.Q, d.E), sosire };
  });
}

/** Mișcările în material ale programului, în document: segmentele (exact) și arcele (eșantionate la 0,01 mm). */
function bucatiInMaterial(text: string, laDoc: (p: Punct3) => Punct3): Array<{ readonly a: Punct3; readonly b: Punct3; readonly linia: number }> {
  const rez: Array<{ a: Punct3; b: Punct3; linia: number }> = [];
  for (const e of citeste(text).evenimente) {
    if (e.tip !== 'mutare' || e.m.cod === 0 || !e.m.startCunoscut) continue;
    const m = e.m;
    const a = laDoc(m.a), b = laDoc(m.b);
    if (Math.min(a[2], b[2]) >= -TOL_SUB) continue;
    if (m.cod === 1 || ((m.i ?? 0) === 0 && (m.j ?? 0) === 0)) { rez.push({ a, b, linia: m.linia }); continue; }
    const { unghi, raza } = regulaArcGrbl(m);
    const c3 = laDoc([m.a[0] + (m.i ?? 0), m.a[1] + (m.j ?? 0), m.a[2]]);
    const u0 = Math.atan2(a[1] - c3[1], a[0] - c3[0]);
    const n = Math.max(1, Math.ceil((raza * Math.abs(unghi)) / 0.01));
    let prec: Punct3 = a;
    for (let k = 1; k <= n; k++) {
      const u = u0 + (unghi * k) / n;
      const q: Punct3 = k === n ? b : [c3[0] + raza * Math.cos(u), c3[1] + raza * Math.sin(u), a[2] + ((b[2] - a[2]) * k) / n];
      rez.push({ a: prec, b: q, linia: m.linia });
      prec = q;
    }
  }
  return rez;
}

/**
 * Restul în colțul V la adâncimea d: cea mai mică distanță (mm) dintre discul frezei și V, pe bucățile programului
 * aflate la −d (±tolZ) — exact pe fiecare segment (partea lui de la acea adâncime). 0 = V e tăiat; Infinity: nimic nu
 * ajunge la −d.
 */
export function restulInColt(text: string, laDoc: (p: Punct3) => Punct3, V: P2, R: number, d: number, tolZ = 0.002): number {
  let rest = Infinity;
  for (const { a, b } of bucatiInMaterial(text, laDoc)) {
    const zLim = -d + tolZ;
    // Fracțiunile [s0, s1] la care z ≤ −d + tolZ (z liniar în fracțiune).
    let s0 = 0, s1 = 1;
    if (a[2] > zLim && b[2] > zLim) continue;
    if (a[2] > zLim) s0 = (a[2] - zLim) / (a[2] - b[2]);
    if (b[2] > zLim) s1 = (a[2] - zLim) / (a[2] - b[2]);
    const p = { x: a[0] + (b[0] - a[0]) * s0, y: a[1] + (b[1] - a[1]) * s0 };
    const q = { x: a[0] + (b[0] - a[0]) * s1, y: a[1] + (b[1] - a[1]) * s1 };
    const x = distantaListe([punctP(V)], p.x === q.x && p.y === q.y ? [punctP(p)] : [segmentP(p, q)]) - R;
    if (x < rest) rest = x;
  }
  return Math.max(0, rest);
}

/**
 * Cât intră tăietura dincolo de dreapta peretelui (prin V, cu normala n spre deșeu), lângă V: max(R − (c − V)·n) pe
 * centrele c ale bucăților aflate la cel mult `raza` de V și în semiplanul (c − V)·u ≥ 0 (u = bisectoarea spre deșeu:
 * doar colțul acesta, nu bucla unei vecine), cu segmentul tăiat exact la cerc și la semiplan. 0 = deloc.
 */
export function intrareaInPerete(text: string, laDoc: (p: Punct3) => Punct3, V: P2, n: P2, R: number, raza: number, u: P2): number {
  let max = 0;
  for (const { a, b } of bucatiInMaterial(text, laDoc)) {
    const A = { x: a[0], y: a[1] }, B = { x: b[0], y: b[1] };
    // Partea segmentului din discul de rază `raza` în jurul lui V (rădăcinile lui |A + t(B − A) − V| = raza).
    const d = sub(B, A), f = sub(A, V);
    const qa = dot(d, d), qb = 2 * dot(f, d), qc = dot(f, f) - raza * raza;
    let t0 = 0, t1 = 1;
    if (qa === 0) { if (qc > 0) continue; } else {
      const disc = qb * qb - 4 * qa * qc;
      if (disc < 0) continue;
      const r = Math.sqrt(disc);
      t0 = Math.max(0, (-qb - r) / (2 * qa));
      t1 = Math.min(1, (-qb + r) / (2 * qa));
      if (t0 > t1) continue;
    }
    // Semiplanul (A + t·d − V)·u ≥ 0.
    const su = dot(f, u), du = dot(d, u);
    if (du === 0) { if (su < 0) continue; } else if (du > 0) t0 = Math.max(t0, -su / du); else t1 = Math.min(t1, -su / du);
    if (t0 > t1) continue;
    for (const t of [t0, t1]) {
      const c = plus(A, d, t);
      const x = R - dot(sub(c, V), n);
      if (x > max) max = x;
    }
  }
  return max;
}
