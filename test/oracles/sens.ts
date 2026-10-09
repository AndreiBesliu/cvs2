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
 * Definițiile mele pe textul G-code (alegeri, unde textul tace; marcate „ALEGERE”):
 * - MIȘCARE LA ADÂNCIME: G1 / G2 / G3 cu startul cunoscut, cu ambele capete sub fața de sus (z < −1e-6 în document) și
 *   la aceeași adâncime (|Δz| ≤ 1e-6). Orice altceva (G0, plonjarea, ridicarea, rampa, arcul elicoidal, o mișcare
 *   prin aer sau care trece prin fața de sus) întrerupe drumul. Un G1 fără deplasare în XY la adâncime nu-l întrerupe;
 * - DRUM: șirul maximal de mișcări la adâncime consecutive, la aceeași adâncime, sub aceeași etichetă (o etichetă nouă
 *   îl întrerupe). Adică „de la plonjare până la ridicare, la o adâncime”: trecerile coborâte pe verticală, fără
 *   ridicare, sunt drumuri separate;
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

/** O mișcare la adâncime, în document. La arc: centrul, raza, unghiul parcurs (cu semn, în document). */
export type Pas =
  | { readonly tip: 'segment'; readonly linia: number; readonly a: P2; readonly b: P2 }
  | { readonly tip: 'arc'; readonly linia: number; readonly a: P2; readonly b: P2; readonly c: P2; readonly r: number; readonly unghi: number };

export type Bucla = {
  /** Prima și ultima linie a mișcărilor buclei. */
  readonly linii: readonly [number, number];
  /** Adâncimea, în document (negativă). */
  readonly z: number;
  readonly start: P2;
  readonly capat: P2;
  readonly inchisa: boolean;
  /** Aria cu semn, mm² (pozitivă = trigonometric), închisă cu coarda capăt → start. */
  readonly arie: number;
  readonly lungime: number;
  /** Indicele etichetei active în lista dată (−1: înaintea primei etichete). */
  readonly eticheta: number;
  readonly pasi: readonly Pas[];
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
 * Mișcarea ca pas la adâncime, în document; `null` dacă întrerupe drumul; 'nimic' pentru un G1 fără deplasare în XY la
 * aceeași adâncime.
 */
export function pasLaAdancime(m: Mutare, laDoc: (p: Punct3) => Punct3, orientare: 1 | -1): { readonly z: number; readonly pas: Pas } | null | 'nimic' {
  if (m.cod === 0 || !m.startCunoscut) return null;
  const a = laDoc(m.a), b = laDoc(m.b);
  if (!(a[2] < -TOL_SUB && b[2] < -TOL_SUB) || Math.abs(a[2] - b[2]) > TOL_Z) return null;
  const A: P2 = { x: a[0], y: a[1] }, B: P2 = { x: b[0], y: b[1] };
  const i = m.i ?? 0, j = m.j ?? 0;
  if (m.cod === 1 || (i === 0 && j === 0)) {
    if (A.x === B.x && A.y === B.y) return 'nimic';
    return { z: a[2], pas: { tip: 'segment', linia: m.linia, a: A, b: B } };
  }
  const { unghi } = regulaArcGrbl(m);
  const c3 = laDoc([m.a[0] + i, m.a[1] + j, m.a[2]]);
  const C: P2 = { x: c3[0], y: c3[1] };
  return { z: a[2], pas: { tip: 'arc', linia: m.linia, a: A, b: B, c: C, r: dist(A, C), unghi: unghi * orientare } };
}

/**
 * Un drum (mișcări la adâncime consecutive), tăiat în bucle închise și drumuri deschise. Lanțul deschis curent se
 * închide când capătul unei mișcări revine la cel mult TOL_INCHIDERE de un vârf al lanțului (startul unei mișcări din
 * el), după cel puțin LUNGIME_MINIMA de drum de la acel vârf; se ia cel mai devreme vârf. Ce era înaintea vârfului
 * (o legătură la adâncime) iese ca drum deschis, bucla ca buclă închisă; lanțul pornește din nou de la capăt.
 */
function imparte(pasi: readonly Pas[], z: number, eticheta: number): Bucla[] {
  const rez: Bucla[] = [];
  const bucla = (acum: readonly Pas[], inchisa: boolean): Bucla => ({
    linii: [acum[0]!.linia, acum[acum.length - 1]!.linia], z,
    start: acum[0]!.a, capat: acum[acum.length - 1]!.b, inchisa,
    arie: ariaPasilor(acum), lungime: acum.reduce((s, p) => s + lungimePas(p), 0), eticheta, pasi: acum,
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
 * de pe o linie de dinaintea primei ei mișcări (`liniiEtichete`, crescător).
 */
export function buclele(evenimente: readonly Eveniment[], liniiEtichete: readonly number[], laDoc: (p: Punct3) => Punct3): Bucla[] {
  const orientare = orientareMontaj(laDoc);
  const rez: Bucla[] = [];
  let iE = -1;
  let drum: { eticheta: number; z: number; pasi: Pas[] } | null = null;
  const inchide = (): void => {
    if (drum && drum.pasi.length) rez.push(...imparte(drum.pasi, drum.z, drum.eticheta));
    drum = null;
  };
  for (const e of evenimente) {
    if (e.tip !== 'mutare') continue;
    const m = e.m;
    while (iE + 1 < liniiEtichete.length && liniiEtichete[iE + 1]! < m.linia) iE++;
    if (drum !== null && (drum as { eticheta: number }).eticheta !== iE) inchide();
    const x = pasLaAdancime(m, laDoc, orientare);
    if (x === 'nimic') continue;
    if (x === null) { inchide(); continue; }
    if (drum !== null && Math.abs((drum as { z: number }).z - x.z) > TOL_Z) inchide();
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
): IncalcareSens[] {
  const rez: IncalcareSens[] = [];
  const sensuri = sensurileEtichetelor(etichete, reg);
  for (const b of buclele(evenimente, etichete.map((e) => e.linia), laDoc)) {
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
