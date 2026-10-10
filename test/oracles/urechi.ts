/**
 * ORACOLUL urechilor (ADR 0028, felia 2.4), cu ZERO importuri din `src/`. Scris doar din textul ADR 0028 (plus ADR 0026
 * §7 pentru etichete și ADR 0027 pentru buclă și pornire, prin `sens.ts`). Două metode, care se verifică una pe alta:
 *
 * A. INVARIANTA 10, în poartă (`verificaUrechile`), cu documentul în context (ca 2 și 9). Pe fiecare buclă a unei
 *    tăieturi (buclele invariantei 9 AMENDATE: drumul nu se rupe când Z se schimbă sub fața de sus):
 *    - cu urechi și cu o trecere de adâncime d > varf (varf = grosimeFoaie − g, §2): Z(s) urmează profilul de la §3, cu P
 *      MĂSURAT pe bucla din program (liniile; arcele ca r·|θ| cum le execută GRBL, în coordonatele documentului), s de la
 *      pornirea buclei, centrele la (k + ½)·P / n, palierul |s − c| ≤ h la −varf, flancurile liniare pe ℓ până la −d,
 *      −d în rest; W > 0,9·S pe buclă = programul nu trebuia să existe (refuz, §3);
 *    - fără urechi, sau pe o trecere cu d ≤ varf: toate mișcările buclei la Z constant;
 *    - legarea etichetei de operație e cea de la invarianta 9 (elementul, latura, adâncimea; la candidate cu urechi
 *      diferite, a k-a apariție a etichetei e a k-a candidată);
 *    - eticheta unei tăieturi cu urechi la care exportul trebuia refuzat (g ≥ grosimea foii; adâncimea ≤ varf; W < D,
 *      §2 cu precizarea din 09.10) e o încălcare, pe linia etichetei;
 *    - precizarea din 09.10 (§4), când contextul dă avansul de plonjare: nicio mișcare G1 / G2 / G3 care coboară și se
 *      termină sub fața de sus nu are viteza pe verticală F·|ΔZ| / L₃ peste el (`vitezaVerticala`; ALEGERE: tot sub
 *      invarianta 10, pe toate mișcările, nu doar pe flancuri: o plonjare mai rapidă ar încălca aceeași regulă).
 * B. HÂRTIA (`treceri`, `masoara`): citește G-code-ul (cu arcele elicoidale), taie fiecare trecere în bucăți după Z
 *    (palier, flanc, adâncime plină) și MĂSOARĂ lungimile, numărul de paliere și pozițiile centrelor față de plonjare.
 *    Valorile așteptate vin din perimetrul ANALITIC al formei (`urechi.cazuri.ts`), niciodată din program. Separat,
 *    `peDrum` verifică geometria în plan: fiecare bucată stă pe traseul analitic, iar bucățile de pe arcele lui sunt
 *    arce (G2 / G3) cu centrul lui (o coardă pe arc e prinsă).
 *
 * DEFINIȚIILE și ALEGERILE mele pe textul G-code (marcate „ALEGERE”):
 * - d (adâncimea trecerii) = −(cel mai jos Z al buclei). ALEGERE: nu Z-ul pornirii, ca o ureche pusă greșit pe
 *   plonjare (centrele la k·S) să fie judecată pe profil, nu luată drept o trecere mai puțin adâncă;
 * - lungimea în s a unei mișcări: dreapta = lungimea ei; arcul = r·|θ| (raza din I / J, unghiul din `regulaArcGrbl`).
 *   ALEGERE: segmentul scurt de la capătul arcului până la capătul scris (rotunjirea, radial) NU intră în s: e o mișcare
 *   aproape perpendiculară pe drum, nu un avans de-a lungul lui;
 * - un drum deschis (ce rămâne după ultima buclă închisă, sau un drum care nu se închide) trebuie să fie la Z constant,
 *   sub orice etichetă. ALEGERE: contractul de azi n-are niciun drum deschis cu Z variabil (rampa și intrările vin în
 *   2.5, cu precizarea lor), iar sub `pe-linie` invarianta 9 nu judecă drumurile deschise;
 * - ALEGERE: o buclă sub o etichetă nevalidă sau înaintea primei etichete nu se judecă aici (invariantele 2 și 9 o
 *   raportează deja).
 *
 * TOLERANȚELE (G-code-ul rotunjește la 3 zecimale; aplicația socotește pe geometria exactă):
 * - pe Z, `TOL_Z_URECHI` = 0,002 mm: Z-ul scris e rotunjit cu ±0,0005; Z-ul dintr-un punct din interiorul unei mișcări
 *   e interpolat între capete rotunjite (±0,0005); d citit din program intră în formula flancului (±0,0005). Suma
 *   ≤ 0,0015, rotunjită în sus;
 * - pe s, o bandă ORIZONTALĂ `tolS(buclă)` = 0,0015 + 0,0042·Θ mm, unde Θ = suma |θ| a arcelor buclei (rad). De ce:
 *   un capăt scris se mută de-a lungul drumului cu cel mult √2/2·10⁻³ ≈ 0,0007 (o dată la s, o dată la P: 0,0015); pe
 *   dreaptă, erorile capetelor se telescopează. Pe arc, centrul văzut de GRBL (startul rotunjit + I / J rotunjite) se
 *   mută cu ≤ 0,0007, iar raza din I / J cu ≤ 0,0014, deci r·|θ| se abate cu ≤ 0,0021·|θ|; centrele așteptate se
 *   socotesc cu P măsurat (încă 0,0021·Θ în cel mai rău caz): 0,0042·Θ. O buclă cu un tur întreg de arce (Θ = 2π):
 *   0,028 mm. Comparația se face pe bandă: Z-ul programului în s trebuie să fie între minimul și maximul lui Z(s′)
 *   pentru |s′ − s| ≤ tolS, ±TOL_Z. Așa, un flanc abrupt (ℓ mic) nu transformă o deplasare de 0,0007 în s într-o
 *   eroare mare în Z. Rezoluția efectivă pe s e deci tolS + TOL_Z / pantă (panta flancului = (d − varf) / ℓ): o
 *   ruptură mutată cu mai puțin trece; palierul sau centrele mutate cu mai mult sunt prinse;
 * - refuzul W > 0,9·S se judecă cu P + tolS (în favoarea aplicației: la limită, poate face oricare); W < D se judecă
 *   exact (W și D sunt numere din document și din context, nu din G-code);
 * - viteza pe verticală: F e rotunjit la 0,1 (±0,05), iar |ΔZ| și L₃ se citesc din cote rotunjite (|ΔZ| ±0,001,
 *   L₃ ±0,002); limita e avansPlonjare·(1 + 0,0011 / |ΔZ|)·(1 + 0,0021 / L₃) + 0,05 mm/min;
 * - pe hârtie (B): lungimea unei zone (palier, flanc) ±`TOL_ZONA` = 0,005 mm (2–3 capete rotunjite); pozițiile
 *   centrelor și lungimea totală ±`TOL_CUMULAT` = 0,03 mm (aceeași margine cumulată ca tolS pe un tur de arce); geometria
 *   în plan ±`TOL_DRUM` = 0,003 mm (un punct rotunjit + I / J rotunjit).
 *
 * AMENDAMENTUL din ADR 0029 §5 (felia 2.5a): pe o etichetă legată de o operație CU rampă (`cuRampa`, din `rampa.ts`),
 * buclele nu se mai judecă aici (o buclă a drumului ține și rampa, deci Z variabil): profilul urechilor se judecă pe
 * fundul fiecărei treceri, în `verificaRampa`. Refuzurile de la §2 (pe etichetă) rămân aici, pe toate etichetele. Fără
 * rampă, nimic nu se schimbă.
 *
 * Ce NU vede invarianta 10, și cine o vede: forma în plan a traseului (o coardă pe arc la flanc) e a invariantei 2
 * (pe exterior, coarda intră în piesă) și a hârtiei (`peDrum`); pe interior, coarda iese spre deșeu, deci doar hârtia.
 */
import type { UrechiO } from './document.ts';
import { citeste, regulaArcGrbl, type Eveniment, type Punct3 } from './gcode.ts';
import { dPunctLista, punctLa, lungime as lungimePrimitiva, type Primitiva } from './regiune.ts';
import type { Regiune } from './regiune.ts';
import { buclele, type Bucla, type EtichetaActiva, type Pas } from './sens.ts';

export const TOL_Z_URECHI = 0.002;
export const TOL_S_FIX = 0.0015;
export const TOL_S_PE_RADIAN = 0.0042;
export const TOL_ZONA = 0.005;
export const TOL_CUMULAT = 0.03;
export const TOL_DRUM = 0.003;
/** O ruptură la cel mult atât de un vârf e chiar vârful (ADR 0028 §4). */
export const RUPTURA_PE_VARF = 1e-6;
/** Adâncimea din etichetă față de cea a operației (ca la invariantele 2 și 9). */
const TOL_ADANCIME = 0.0005 + 1e-9;

// ---------------------------------------------------------------------------------------------------------------
// Profilul (ADR 0028 §3), literal.

export type Profil = {
  readonly P: number; readonly n: number; readonly W: number; readonly S: number;
  readonly h: number; readonly l: number; readonly varf: number; readonly d: number;
  readonly centre: readonly number[];
};

/** Profilul unei treceri; `null` dacă urechile nu încap (W > 0,9·S: refuz). */
export function profil(P: number, u: { readonly numar: number; readonly latime: number }, varf: number, d: number): Profil | null {
  const n = u.numar, W = u.latime;
  const S = P / n;
  if (W > 0.9 * S) return null;
  const h = W / 2;
  const l = Math.min(W / 2, 0.45 * (S - W));
  const centre = Array.from({ length: n }, (_, k) => (k + 0.5) * S);
  return { P, n, W, S, h, l, varf, d, centre };
}

/** Z(s) pe o trecere cu d > varf: palierul la −varf, flancurile liniare, −d în rest. */
export function zProfil(pr: Profil, s: number): number {
  for (const c of pr.centre) {
    const u = Math.abs(s - c);
    if (u <= pr.h) return -pr.varf;
    if (u < pr.h + pr.l) return -pr.varf - ((pr.d - pr.varf) * (u - pr.h)) / pr.l;
  }
  return -pr.d;
}

/** Rupturile profilului (c_k ± h, c_k ± (h + ℓ)), crescător. */
export function rupturi(pr: Profil): number[] {
  return pr.centre.flatMap((c) => [c - pr.h - pr.l, c - pr.h, c + pr.h, c + pr.h + pr.l]).sort((a, b) => a - b);
}

// ---------------------------------------------------------------------------------------------------------------
// A. Invarianta 10 (poarta).

/** Lungimea în s a unei mișcări (ALEGERE din antet: arcul fără segmentul radial de la capăt). */
export function lungimeS(p: Pas): number {
  return p.tip === 'segment' ? Math.hypot(p.b.x - p.a.x, p.b.y - p.a.y) : p.r * Math.abs(p.unghi);
}

/** Banda orizontală a buclei (antetul). */
export function tolS(b: Bucla): number {
  const theta = b.pasi.reduce((s, p) => s + (p.tip === 'arc' ? Math.abs(p.unghi) : 0), 0);
  return TOL_S_FIX + TOL_S_PE_RADIAN * theta;
}

export type UrechiEticheta = { readonly urechi: UrechiO | null; readonly adancime: number };

/**
 * Urechile așteptate sub fiecare etichetă (în ordinea programului), cu adâncimea operației legate: ca sensul la
 * invarianta 9 (candidatele = operațiile elementului pe latura și adâncimea etichetei; aceleași urechi pe toate = acelea;
 * altfel a k-a apariție e a k-a candidată; o apariție în plus e ambiguă). Etichetele nevalide nu primesc nimic.
 */
export function urechileEtichetelor(etichete: readonly EtichetaActiva[], reg: Regiune): Array<UrechiEticheta | { readonly motiv: string } | null> {
  const aparitii = new Map<string, number>();
  return etichete.map(({ eticheta: et }) => {
    if (!et) return null;
    const t = reg.taieturi.get(et.idLume);
    const adancimi = t?.laturi.get(et.latura) ?? [];
    const urechi = t?.urechi?.get(et.latura) ?? [];
    const candidate = adancimi.flatMap((a, k) => (Math.abs(a - et.adancime) <= TOL_ADANCIME ? [k] : []));
    if (candidate.length === 0) return { motiv: `${et.idLume} n-are o operație ${et.latura} de ${et.adancime} mm` };
    const cheie = `${et.idLume}|${et.latura}|${candidate.join(',')}`;
    const k = aparitii.get(cheie) ?? 0;
    aparitii.set(cheie, k + 1);
    const valori = candidate.map((c) => ({ urechi: urechi[c] ?? null, adancime: adancimi[c]! }));
    const text = (u: UrechiO | null): string => (u === null ? 'null' : `${u.numar}|${u.latime}|${u.grosime}`);
    if (valori.every((v) => text(v.urechi) === text(valori[0]!.urechi))) return valori[0]!;
    if (k < valori.length) return valori[k]!;
    return { motiv: `${et.idLume} are ${valori.length} operații ${et.latura} de ${et.adancime} mm cu urechi diferite, iar eticheta apare de ${k + 1} ori` };
  });
}

export type IncalcareUrechi = { readonly linia: number; readonly mesaj: string };

/** Pe o buclă: s-ul fiecărei mișcări (start, capăt) și Z-ul capetelor. */
type Bucata = { readonly linia: number; readonly s0: number; readonly s1: number; readonly za: number; readonly zb: number };

function bucatile(b: Bucla): Bucata[] {
  const rez: Bucata[] = [];
  let s = 0;
  for (const p of b.pasi) {
    const L = lungimeS(p);
    rez.push({ linia: p.linia, s0: s, s1: s + L, za: p.za, zb: p.zb });
    s += L;
  }
  return rez;
}

/** Cel mai jos și cel mai sus Z(s′) pentru s′ în [s − T, s + T] ∩ [0, P] (profilul e liniar pe bucăți). */
function banda(pr: Profil, rup: readonly number[], s: number, T: number): readonly [number, number] {
  const a = Math.max(0, s - T), b = Math.min(pr.P, s + T);
  const z = [zProfil(pr, a), zProfil(pr, b), ...rup.filter((q) => q > a && q < b).map((q) => zProfil(pr, q))];
  return [Math.min(...z), Math.max(...z)];
}

/** Cea mai mare abatere a Z-ului buclei de la profil (pe bandă), cu locul ei; 0 dacă urmează profilul. */
export function abatereProfil(b: Bucla, pr: Profil, T: number): { readonly abatere: number; readonly linia: number; readonly s: number; readonly z: number; readonly asteptat: readonly [number, number] } {
  const rup = rupturi(pr);
  const repere = rup.flatMap((q) => [q - T, q, q + T]);
  let rau = { abatere: 0, linia: b.linii[0], s: 0, z: b.z, asteptat: [-pr.d, -pr.d] as readonly [number, number] };
  for (const x of bucatile(b)) {
    const puncte = [x.s0, x.s1, ...repere.filter((q) => q > x.s0 && q < x.s1)];
    for (const s of puncte) {
      const z = x.s1 > x.s0 ? x.za + ((x.zb - x.za) * (s - x.s0)) / (x.s1 - x.s0) : x.zb;
      const [lo, hi] = banda(pr, rup, s, T);
      const abatere = Math.max(0, lo - TOL_Z_URECHI - z, z - hi - TOL_Z_URECHI);
      if (abatere > rau.abatere) rau = { abatere, linia: x.linia, s, z, asteptat: [lo, hi] };
    }
  }
  return rau;
}

/** Cea mai mare depărtare a unui capăt de mișcare al buclei de Z-ul pornirii ei. */
function abatereConstanta(b: Bucla): { readonly abatere: number; readonly linia: number; readonly z: number } {
  let rau = { abatere: 0, linia: b.linii[0], z: b.z };
  for (const p of b.pasi) {
    for (const z of [p.za, p.zb]) {
      const a = Math.abs(z - b.z);
      if (a > rau.abatere) rau = { abatere: a, linia: p.linia, z };
    }
  }
  return rau;
}

const mm = (v: number): string => v.toFixed(3);

/**
 * Invarianta 10 pe un program (evenimentele citite de `citeste`, etichetele active ca în poartă). `grosimeFoaie` e
 * grosimea foii documentului (ADR 0028 §2). Întoarce încălcările.
 */
export function verificaUrechile(
  evenimente: readonly Eveniment[], etichete: readonly EtichetaActiva[], reg: Regiune, laDoc: (p: Punct3) => Punct3, grosimeFoaie: number,
  diametru?: number, cuRampa: ReadonlySet<number> = new Set(),
): IncalcareUrechi[] {
  const rez: IncalcareUrechi[] = [];
  const urechi = urechileEtichetelor(etichete, reg);
  // §2: exportul trebuia refuzat (o dată pe etichetă).
  etichete.forEach((e, i) => {
    const u = urechi[i];
    if (!e.eticheta || !u || 'motiv' in u || u.urechi === null) return;
    const varf = grosimeFoaie - u.urechi.grosime;
    if (!(varf > 0)) {
      rez.push({ linia: e.linia, mesaj: `urechile lui ${e.eticheta.idLume}: puntea de ${u.urechi.grosime} mm nu e sub grosimea foii (${grosimeFoaie} mm): exportul trebuia refuzat` });
    } else if (u.adancime <= varf) {
      rez.push({ linia: e.linia, mesaj: `urechile lui ${e.eticheta.idLume}: adâncimea ${u.adancime} mm nu trece de vârful urechii (${mm(varf)} mm): exportul trebuia refuzat` });
    }
    // Precizarea din 09.10: W < D lasă piesa liberă pe axa tăieturii (W = D trece).
    if (diametru !== undefined && u.urechi.latime < diametru) {
      rez.push({ linia: e.linia, mesaj: `urechile lui ${e.eticheta.idLume}: W ${u.urechi.latime} mm e sub diametrul frezei (${diametru} mm): exportul trebuia refuzat` });
    }
  });
  for (const b of buclele(evenimente, etichete.map((e) => e.linia), laDoc)) {
    // ADR 0029 §5: cu rampă, profilul se judecă pe fundul fiecărei treceri, nu pe buclă (`rampa.ts`).
    if (b.eticheta < 0 || cuRampa.has(b.eticheta)) continue;
    const et = etichete[b.eticheta]!.eticheta;
    if (!et) continue;
    const u = urechi[b.eticheta];
    const unde = `liniile ${b.linii[0]}–${b.linii[1]}`;
    if (!u || 'motiv' in u) {
      rez.push({ linia: b.linii[0], mesaj: `urechile: ${u ? u.motiv : 'fără operație'} (${unde})` });
      continue;
    }
    const cine = `${et.idLume} (${et.latura})`;
    if (!b.inchisa) {
      const c = abatereConstanta(b);
      if (c.abatere > TOL_Z_URECHI) rez.push({ linia: c.linia, mesaj: `urechile: drumul deschis al lui ${cine} la ${unde} are Z variabil (${mm(b.z)} → ${mm(c.z)}): trebuie Z constant` });
      continue;
    }
    const d = -b.zMin;
    const varf = u.urechi === null ? Infinity : grosimeFoaie - u.urechi.grosime;
    if (u.urechi === null || d <= varf + TOL_Z_URECHI) {
      const c = abatereConstanta(b);
      if (c.abatere > TOL_Z_URECHI) {
        const de = u.urechi === null ? 'fără urechi' : `trecerea de ${mm(d)} mm nu ajunge la vârful urechii (${mm(varf)} mm)`;
        rez.push({ linia: c.linia, mesaj: `urechile: bucla lui ${cine} la ${unde} (${de}) are Z variabil: ${mm(b.z)} → ${mm(c.z)}; trebuie Z constant` });
      }
      continue;
    }
    const P = b.pasi.reduce((s, p) => s + lungimeS(p), 0);
    const T = tolS(b);
    const pr = profil(P + T, u.urechi, varf, d);
    if (!pr) {
      rez.push({ linia: b.linii[0], mesaj: `urechile lui ${cine} nu încap pe bucla de la ${unde}: W ${u.urechi.latime} > 0,9·S (P ${mm(P)}, n ${u.urechi.numar}): exportul trebuia refuzat` });
      continue;
    }
    const prP = profil(P, u.urechi, varf, d) ?? pr;
    const x = abatereProfil(b, prP, T);
    if (x.abatere > 0) {
      rez.push({
        linia: x.linia,
        mesaj: `urechile: bucla lui ${cine} la ${unde} (d ${mm(d)}, vârful ${mm(varf)}, P ${mm(P)}) are Z ${mm(x.z)} la s = ${mm(x.s)}; profilul cere ${mm(x.asteptat[0])}…${mm(x.asteptat[1])}`,
      });
    }
  }
  return rez;
}

/**
 * ADR 0028 §4, precizarea din 09.10: fiecare mișcare G1 / G2 / G3 cu startul cunoscut, care coboară (Z de capăt sub cel
 * de start) și se termină sub fața de sus, are viteza pe verticală F·|ΔZ| / L₃ cel mult avansul de plonjare (L₃ =
 * lungimea în spațiu: dreapta în 3D, elicea √((r·θ)² + ΔZ²)), cu toleranța de rotunjire din antet. O mișcare fără F
 * (programul n-a scris încă avansul) nu se judecă aici.
 */
export function vitezaVerticala(evenimente: readonly Eveniment[], laDoc: (p: Punct3) => Punct3, avansPlonjare: number): IncalcareUrechi[] {
  const rez: IncalcareUrechi[] = [];
  for (const e of evenimente) {
    if (e.tip !== 'mutare') continue;
    const m = e.m;
    if (m.cod === 0 || !m.startCunoscut || m.f === undefined) continue;
    const a = laDoc(m.a), b = laDoc(m.b);
    const dz = a[2] - b[2];
    if (!(dz > 0) || !(b[2] < -1e-6)) continue;
    let plan = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (m.cod !== 1 && ((m.i ?? 0) !== 0 || (m.j ?? 0) !== 0)) {
      const { unghi, raza } = regulaArcGrbl(m);
      plan = raza * Math.abs(unghi);
    }
    const L3 = Math.hypot(plan, dz);
    const viteza = (m.f * dz) / L3;
    const limita = avansPlonjare * (1 + 0.0011 / dz) * (1 + 0.0021 / L3) + 0.05;
    if (viteza > limita) {
      rez.push({ linia: m.linia, mesaj: `avansul: coboară cu ${viteza.toFixed(1)} mm/min pe verticală (F${m.f}, ΔZ ${mm(dz)}, L₃ ${mm(L3)}), peste avansul de plonjare ${avansPlonjare}` });
    }
  }
  return rez;
}

// ---------------------------------------------------------------------------------------------------------------
// B. Hârtia: trecerile citite din G-code, bucăți după Z, lungimi măsurate.

export type P2 = { readonly x: number; readonly y: number };

/** O mișcare în material a unei treceri, în document, cu s de la plonjare. */
export type BucataTrecere = {
  readonly linia: number;
  readonly cod: 1 | 2 | 3;
  readonly a: P2; readonly b: P2;
  /** La arc: centrul văzut de GRBL, raza, unghiul (cu semn). */
  readonly c?: P2; readonly r?: number; readonly unghi?: number;
  readonly s0: number; readonly s1: number;
  readonly za: number; readonly zb: number;
  /** Linia scrie un cuvânt Z. */
  readonly scrieZ: boolean;
};

export type Trecere = {
  /** Linia plonjării (mișcarea care coboară din aer până la adâncime). */
  readonly liniaPlonjarii: number;
  /** Adâncimea plonjării (pozitivă), din Z-ul ei de capăt. */
  readonly d: number;
  readonly bucati: readonly BucataTrecere[];
  readonly lungime: number;
};

/**
 * Trecerile programului, citite independent de invarianta 9: o trecere începe cu o plonjare (o mișcare G1 fără
 * deplasare în XY care coboară și se termină sub fața de sus: din aer sau, fără ridicare, de la trecerea de dinainte)
 * și ține cât urmează mișcări în material cu deplasare în XY; orice altă mișcare o încheie. Montajul: `laDoc` (o
 * translație).
 */
export function treceri(text: string, laDoc: (p: Punct3) => Punct3): Trecere[] {
  const { evenimente } = citeste(text);
  const linii = text.split('\n');
  const rez: Trecere[] = [];
  let acum: { linia: number; d: number; bucati: BucataTrecere[]; s: number } | null = null;
  const inchide = (): void => {
    if (acum && acum.bucati.length) rez.push({ liniaPlonjarii: acum.linia, d: acum.d, bucati: acum.bucati, lungime: acum.s });
    acum = null;
  };
  for (const e of evenimente) {
    if (e.tip !== 'mutare') continue;
    const m = e.m;
    if (!m.startCunoscut) continue;
    const a = laDoc(m.a), b = laDoc(m.b);
    const xy = a[0] !== b[0] || a[1] !== b[1];
    if (m.cod !== 0 && !xy && b[2] < -1e-6 && b[2] < a[2]) {
      inchide();
      acum = { linia: m.linia, d: -b[2], bucati: [], s: 0 };
      continue;
    }
    if (m.cod === 0 || !xy || a[2] >= -1e-6 || b[2] >= -1e-6 || acum === null) { inchide(); continue; }
    const cur: { linia: number; d: number; bucati: BucataTrecere[]; s: number } = acum;
    const scrieZ = /(^|[^A-Za-z])Z\s*[-+]?[\d.]/i.test((linii[m.linia - 1] ?? '').replace(/\([^)]*\)/g, ' ').replace(/;.*$/, ''));
    const A = { x: a[0], y: a[1] }, B = { x: b[0], y: b[1] };
    const i = m.i ?? 0, j = m.j ?? 0;
    if (m.cod === 1 || (i === 0 && j === 0)) {
      const L = Math.hypot(B.x - A.x, B.y - A.y);
      cur.bucati.push({ linia: m.linia, cod: 1, a: A, b: B, s0: cur.s, s1: cur.s + L, za: a[2], zb: b[2], scrieZ });
      cur.s += L;
      continue;
    }
    const { unghi, raza } = regulaArcGrbl(m);
    const c3 = laDoc([m.a[0] + i, m.a[1] + j, m.a[2]]);
    const L = raza * Math.abs(unghi);
    cur.bucati.push({ linia: m.linia, cod: m.cod, a: A, b: B, c: { x: c3[0], y: c3[1] }, r: raza, unghi, s0: cur.s, s1: cur.s + L, za: a[2], zb: b[2], scrieZ });
    cur.s += L;
  }
  inchide();
  return rez;
}

export type FelZona = 'palier' | 'flanc' | 'plin' | 'alt';
export type Zona = { readonly fel: FelZona; readonly s0: number; readonly s1: number; readonly linii: readonly [number, number] };

export type Masura = {
  readonly lungime: number;
  readonly zone: readonly Zona[];
  readonly paliere: readonly number[];
  readonly flancuri: readonly number[];
  /** Lungimea totală la adâncime plină. */
  readonly plin: number;
  /** Mijlocul fiecărui palier, față de plonjare. */
  readonly centre: readonly number[];
  /** Flancurile care nu merg monoton între −d și −varf (liniile lor). */
  readonly flancuriRele: readonly number[];
  /** Liniile cu un cuvânt Z care nu schimbă Z-ul (ADR 0028 §4: o mișcare poartă Z doar dacă Z-ul ei se schimbă). */
  readonly zFaraSchimbare: readonly number[];
};

/**
 * Măsoară o trecere care traversează urechi: fiecare bucată e pe palier (ambele capete la −varf), la adâncime plină
 * (ambele la −d), pe flanc (Z se schimbă) sau „alt” (Z constant altundeva). Zonele = bucăți consecutive de același fel.
 */
export function masoara(t: Trecere, varf: number, tol = TOL_Z_URECHI): Masura {
  const la = (z: number, tinta: number): boolean => Math.abs(z - tinta) <= tol;
  const fel = (x: BucataTrecere): FelZona => {
    if (la(x.za, -varf) && la(x.zb, -varf)) return 'palier';
    if (la(x.za, -t.d) && la(x.zb, -t.d)) return 'plin';
    if (Math.abs(x.za - x.zb) > tol) return 'flanc';
    return 'alt';
  };
  const zone: Array<{ fel: FelZona; s0: number; s1: number; linii: [number, number]; za: number; zb: number }> = [];
  for (const x of t.bucati) {
    const f = fel(x);
    const ultima = zone[zone.length - 1];
    if (ultima && ultima.fel === f) { ultima.s1 = x.s1; ultima.linii[1] = x.linia; ultima.zb = x.zb; continue; }
    zone.push({ fel: f, s0: x.s0, s1: x.s1, linii: [x.linia, x.linia], za: x.za, zb: x.zb });
  }
  const flancuriRele: number[] = [];
  for (const z of zone) {
    if (z.fel !== 'flanc') continue;
    const capete = [z.za, z.zb].sort((a, b) => a - b);
    if (!(la(capete[0]!, -t.d) && la(capete[1]!, -varf))) flancuriRele.push(z.linii[0]);
  }
  // Monotonia pe bucăți: în flanc, toate bucățile urcă sau toate coboară.
  for (const z of zone) {
    if (z.fel !== 'flanc') continue;
    const bucati = t.bucati.filter((x) => x.linia >= z.linii[0] && x.linia <= z.linii[1]);
    const semne = new Set(bucati.map((x) => Math.sign(x.zb - x.za)));
    if (semne.size > 1 && !flancuriRele.includes(z.linii[0])) flancuriRele.push(z.linii[0]);
  }
  let zCur = -t.d;
  const zFaraSchimbare: number[] = [];
  for (const x of t.bucati) {
    if (x.scrieZ && x.zb === zCur) zFaraSchimbare.push(x.linia);
    zCur = x.zb;
  }
  const lung = (f: FelZona): number[] => zone.filter((z) => z.fel === f).map((z) => z.s1 - z.s0);
  return {
    lungime: t.lungime,
    zone,
    paliere: lung('palier'),
    flancuri: lung('flanc'),
    plin: lung('plin').reduce((s, v) => s + v, 0),
    centre: zone.filter((z) => z.fel === 'palier').map((z) => (z.s0 + z.s1) / 2),
    flancuriRele,
    zFaraSchimbare,
  };
}

/** Ce cere hârtia pe o trecere care traversează urechi, din perimetrul ANALITIC P. */
export type Asteptat = {
  readonly P: number; readonly n: number; readonly W: number; readonly l: number;
  readonly centre: readonly number[]; readonly plin: number;
};

export function asteptatPeHartie(P: number, n: number, W: number): Asteptat {
  const S = P / n;
  const l = Math.min(W / 2, 0.45 * (S - W));
  return { P, n, W, l, centre: Array.from({ length: n }, (_, k) => (k + 0.5) * S), plin: P - n * (W + 2 * l) };
}

/** Diferențele dintre măsură și hârtie (goală = trecerea e cea de pe hârtie). */
export function comparaCuHartia(m: Masura, a: Asteptat): string[] {
  const rele: string[] = [];
  if (Math.abs(m.lungime - a.P) > TOL_CUMULAT) rele.push(`lungimea trecerii ${mm(m.lungime)} ≠ perimetrul de pe hârtie ${mm(a.P)}`);
  if (m.paliere.length !== a.n) rele.push(`${m.paliere.length} paliere, nu ${a.n}`);
  m.paliere.forEach((L, k) => { if (Math.abs(L - a.W) > TOL_ZONA) rele.push(`palierul ${k} are ${mm(L)} mm, nu W = ${mm(a.W)}`); });
  if (m.flancuri.length !== 2 * a.n) rele.push(`${m.flancuri.length} flancuri, nu ${2 * a.n}`);
  m.flancuri.forEach((L, k) => { if (Math.abs(L - a.l) > TOL_ZONA) rele.push(`flancul ${k} are ${mm(L)} mm, nu ℓ = ${mm(a.l)}`); });
  if (Math.abs(m.plin - a.plin) > TOL_CUMULAT) rele.push(`la adâncime plină ${mm(m.plin)} mm, nu ${mm(a.plin)}`);
  if (m.centre.length === a.centre.length) {
    m.centre.forEach((c, k) => { if (Math.abs(c - a.centre[k]!) > TOL_CUMULAT) rele.push(`centrul ${k} la s = ${mm(c)}, nu ${mm(a.centre[k]!)}`); });
  }
  const alte = m.zone.filter((z) => z.fel === 'alt');
  if (alte.length) rele.push(`bucăți la Z constant în afara palierului și a adâncimii pline: liniile ${alte.map((z) => z.linii[0]).join(', ')}`);
  if (m.flancuriRele.length) rele.push(`flancuri care nu merg monoton între −d și −varf: liniile ${m.flancuriRele.join(', ')}`);
  if (m.zFaraSchimbare.length) rele.push(`cuvânt Z fără schimbare de Z (§4): liniile ${m.zFaraSchimbare.join(', ')}`);
  return rele;
}

/**
 * Geometria în plan a unei treceri față de traseul ANALITIC (primitivele lui, în document): fiecare bucată stă pe el
 * (eșantioane la cel mult 0,5 mm, ±TOL_DRUM); o bucată de linie stă pe o dreaptă a traseului (nu pe un arc: o coardă);
 * un arc are centrul și raza unui arc al traseului. Goală = trecerea e pe traseu.
 */
export function peDrum(t: Trecere, drum: readonly Primitiva[]): string[] {
  const rele: string[] = [];
  const segmente = drum.filter((p) => p.tip === 'segment');
  const arce = drum.flatMap((p) => (p.tip === 'arc' ? [p] : []));
  for (const x of t.bucati) {
    const n = Math.max(2, Math.ceil((x.s1 - x.s0) / 0.5));
    let maxD = 0;
    for (let k = 0; k <= n; k++) {
      const p = punctBucata(x, k / n);
      maxD = Math.max(maxD, dPunctLista(p, drum));
    }
    if (maxD > TOL_DRUM) { rele.push(`linia ${x.linia}: iese de pe traseul analitic cu ${mm(maxD)} mm`); continue; }
    if (x.cod === 1) {
      const L = x.s1 - x.s0;
      if (L > 0.01 && segmente.length && dPunctLista(punctBucata(x, 0.5), segmente) > TOL_DRUM) rele.push(`linia ${x.linia}: G1 pe un arc al traseului (coardă)`);
      if (L > 0.01 && segmente.length === 0) rele.push(`linia ${x.linia}: G1 pe un traseu fără drepte (coardă)`);
    } else {
      const ok = arce.some((a) => Math.hypot(a.c.x - x.c!.x, a.c.y - x.c!.y) <= TOL_DRUM && Math.abs(a.r - x.r!) <= TOL_DRUM);
      if (!ok) rele.push(`linia ${x.linia}: arcul (centrul ${mm(x.c!.x)}, ${mm(x.c!.y)}, raza ${mm(x.r!)}) nu e un arc al traseului`);
    }
  }
  return rele;
}

function punctBucata(x: BucataTrecere, f: number): P2 {
  if (x.cod === 1 || !x.c) return { x: x.a.x + (x.b.x - x.a.x) * f, y: x.a.y + (x.b.y - x.a.y) * f };
  const u0 = Math.atan2(x.a.y - x.c.y, x.a.x - x.c.x) + x.unghi! * f;
  return { x: x.c.x + x.r! * Math.cos(u0), y: x.c.y + x.r! * Math.sin(u0) };
}

/** Perimetrul unui traseu din primitive (a doua cale, pentru verificarea formulelor închise). */
export function perimetruPrimitive(drum: readonly Primitiva[]): number {
  return drum.reduce((s, p) => s + lungimePrimitiva(p), 0);
}

/** Punctul de la lungimea s pe un traseu din primitive (pentru scriitorul de programe din cazuri). */
export function punctPeDrum(drum: readonly Primitiva[], s: number): P2 {
  let rest = s;
  for (const p of drum) {
    const L = lungimePrimitiva(p);
    if (rest <= L) return punctLa(p, rest);
    rest -= L;
  }
  return punctLa(drum[drum.length - 1]!, lungimePrimitiva(drum[drum.length - 1]!));
}

