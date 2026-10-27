/**
 * V-carve-ul cu freza în V (ADR 0090, `PLAN.md` T7, sonda s3): freza merge pe axa medială a regiunii (`axaMediala.ts`), la
 * z = −min(D, r / tan(θ/2)), unde r e distanța **exactă** la contur în fiecare punct (recalculată aici, niciodată luată din
 * triangulare: așa freza nu poate săpa sub suprafața ideală, s3 §5.3).
 *
 * - Ramurile terminale redundante se taie: discurile lor stau, până la `TOLERANTA_RAMURI`, în discul nodului de ramificație
 *   (cu punctele deja absorbite, ca eroarea să nu se adune din tăiere în tăiere, s3).
 * - Lanțurile se simplifică (Douglas–Peucker pe x, y și r, `TOLERANTA_SIMPLIFICARE`), apoi garda: pe fiecare coardă, r
 *   interpolat ≤ distanța exactă + `TOLERANTA_GARDA` (altfel se adaugă punctul, cu raza lui).
 * - Adâncimea maximă D: unde regiunea e mai lată decât freza la D (r > D·tan(θ/2)), axa rămâne la −D, iar peretele se taie
 *   pe inelul regiunii decalate cu D·tan(θ/2), la −D. Fundul dintre ele îl scoate freza dreaptă (`fundPlat`, ADR 0091):
 *   întâi ea, buzunar pe fiecare nivel L în zona {d ≥ L·tan(θ/2) + `MARJA_FUND`}; apoi freza V, cu axa doar unde freza
 *   dreaptă n-a ajuns și cu inele dese (creasta `CREASTA_FUND`) în colțurile pe care ea nu le atinge. Fără freză dreaptă,
 *   fundul rămâne, iar lucrarea o spune, ca avertisment.
 * - Trecerile: la trecerea k se taie doar bucățile de sub nivelul k − 1, oprite la −k·pas (cu punctele inserate la treceri),
 *   deci nicio trecere nu scoate mai mult decât pasul: conul se mută cu cel mult un pas între treceri.
 * - Legăturile: lanțurile în ordinea capătului cel mai apropiat (inversate la nevoie), ridicare la Z-ul de siguranță între
 *   ele; o bucată care coboară, cu viteza pe Z cel mult cea a plonjării (`avansCoborare`).
 * - Freza de gravare (ADR 0092 §2): un V cu vârful plat de diametru t = 2a. Pe axă, z = −min(D, (r − a)·cot(θ/2)), doar unde
 *   r > a (mai îngust, vârful n-are loc nici la suprafață); peretele de la −D e tot la D·tan(θ/2) de contur, deci inelul lui
 *   (centrul) la a + D·tan(θ/2), iar inelele colțurilor la 2a + 2c·tan(θ/2) unul de altul (creasta tot c). Gravarea
 *   inteligentă (smart engrave) e chiar asta: fundul cu freza dreaptă, pereții și colțurile cu freza de gravare.
 */
import type { Contur, Punct } from '../geom/conturBaza.ts';
import { arieCuSemn, inverseaza } from '../geom/contur.ts';
import { inRegiune } from '../geom/distanta.ts';
import type { Miscare } from '../ir/ir.ts';
import { axaMediala, indexContururi, type IndexContur } from './axaMediala.ts';
import { ineleBuzunar, ordineInele, traseuBuzunar } from './buzunar.ts';
import { avansCoborare, lungimeBucla, parcurge } from './parcurgere.ts';
import { adancimiTreceri, type Sens } from './profil.ts';
import { bucatiNeatinse, bucatiRestInLant, offsetDepartat, taieBucati } from './rest.ts';

/** Pasul eșantionării conturului, în mm (T7: h ≤ 0,02 pe trăsăturile fine; aici uniform). */
export const PAS_ESANTIOANE = 0.02;
export const TOLERANTA_RAMURI = 0.004;
export const TOLERANTA_SIMPLIFICARE = 0.004;
export const TOLERANTA_GARDA = 0.0005;
/** Cât stă marginea frezei drepte departe de pereți, peste L·tan(θ/2) (mm): rotunjirea G-code-ului plus toleranța offsetului. */
export const MARJA_FUND = 0.002;
/** Creasta lăsată de inelele V în colțurile pe care freza dreaptă nu le atinge (mm, s3: un compromis cost / precizie). */
export const CREASTA_FUND = 0.05;

export type ParametriVcarve = {
  /** Contururile închise ale regiunii, citite par-impar (literele, cu golurile lor). */
  readonly contururi: readonly Contur[];
  /** Unghiul inclus al frezei, în grade (0, 180). */
  readonly unghi: number;
  /** Diametrul vârfului plat al frezei (ADR 0092), în mm, sub diametrul ei; 0 / lipsă = vârful ascuțit. */
  readonly varf?: number;
  /** Diametrul frezei în V, în mm: conul ei are înălțimea (D / 2) / tan(θ/2); mai adânc, ar tăia coada. */
  readonly diametruScula: number;
  /** Adâncimea maximă (D), în mm. */
  readonly adancime: number;
  readonly pas: number;
  readonly avans: number;
  readonly avansPlonjare: number;
  readonly zSigur: number;
  /** Freza dreaptă care scoate fundul plat (ADR 0091): diametrul ei, distanța dintre inele și sensul buzunarului. */
  readonly fundPlat?: FundPlatVcarve;
};

/**
 * `rest` (ADR 0093): frezele drepte de după ea, fiecare mai mică decât cea dinainte, doar unde aceea n-a ajuns (colțurile și
 * fâșiile fundului mai înguste decât ea).
 */
export type FundPlatVcarve = {
  readonly diametru: number; readonly pasLateral: number; readonly sens: Sens;
  readonly rest?: ReadonlyArray<{ readonly diametru: number; readonly pasLateral: number }>;
};

/**
 * `fund`: mișcările frezei drepte (goale: n-a tăiat nimic, deci nu se montează); `fundRest`: ale frezelor ei de rest, în
 * ordine (goale: aceea nu se montează); `miscari`: ale frezei în V, după ele.
 */
export type RezultatVcarve =
  | {
    readonly ok: true; readonly fund: readonly Miscare[]; readonly fundRest: readonly (readonly Miscare[])[]; readonly miscari: readonly Miscare[];
    readonly avertismente: readonly string[]; readonly statistici: StatisticiVcarve;
  }
  | { readonly ok: false; readonly motiv: string };

export type StatisticiVcarve = {
  readonly esantioane: number; readonly lanturi: number; readonly raza: number; readonly treceri: number; readonly fundPlat: boolean;
  /** Indicele, în `miscari`, de după fiecare trecere (proba: fiecare trecere scoate cel mult pasul). */
  readonly sfarsitTreceri: readonly number[];
  /** Indicele, în `fund`, de după fiecare nivel al frezei drepte. */
  readonly sfarsitFund: readonly number[];
  /** La fel, pentru fiecare freză de rest a fundului (ADR 0093). */
  readonly sfarsitFundRest: readonly (readonly number[])[];
  /** Câte bucăți de inel taie freza V în colțurile pe care freza dreaptă nu le atinge (pe trecere). */
  readonly ineleColturi: number;
};

type P3 = readonly [number, number, number];

/** Lanțurile grafului: de la fiecare nod care nu are exact doi vecini, până la următorul; ciclurile, la urmă. */
export function lanturi(vecini: readonly (readonly number[])[], izolatePastrate: ReadonlySet<number>): number[][] {
  const grad = vecini.map((v) => v.length);
  const folosite = new Set<string>();
  const cheie = (a: number, b: number): string => (a < b ? `${a}_${b}` : `${b}_${a}`);
  const rez: number[][] = [];
  for (let s = 0; s < vecini.length; s++) {
    if (grad[s] === 2) continue;
    if (grad[s] === 0) { if (izolatePastrate.has(s)) rez.push([s]); continue; }
    for (const n0 of vecini[s]!) {
      if (folosite.has(cheie(s, n0))) continue;
      const lant = [s];
      let prev = s, cur = n0;
      folosite.add(cheie(s, n0));
      for (;;) {
        lant.push(cur);
        if (grad[cur] !== 2) break;
        const v = vecini[cur]!;
        const urm = v[0] === prev ? v[1]! : v[0]!;
        if (folosite.has(cheie(cur, urm))) break;
        folosite.add(cheie(cur, urm));
        prev = cur;
        cur = urm;
      }
      rez.push(lant);
    }
  }
  for (let s = 0; s < vecini.length; s++) {
    if (grad[s] !== 2 || folosite.has(cheie(s, vecini[s]![0]!))) continue;
    const lant = [s];
    let prev = s, cur = vecini[s]![0]!;
    folosite.add(cheie(s, cur));
    while (cur !== s) {
      lant.push(cur);
      const v = vecini[cur]!;
      const urm = v[0] === prev ? v[1]! : v[0]!;
      folosite.add(cheie(cur, urm));
      prev = cur;
      cur = urm;
    }
    lant.push(s);
    rez.push(lant);
  }
  return rez;
}

/**
 * Taie ramurile terminale redundante: o ramură ale cărei discuri (cu punctele absorbite deja) stau, până la `eps`, în
 * discul nodului de ramificație nu schimbă suprafața cu mai mult de eps·cot(θ/2). Un lanț izolat se reduce la nodul cu raza
 * cea mai mare, dacă restul stă în discul lui. Se repetă până nu mai scade nimic.
 */
export function taieRamuri(noduri: readonly Punct[], vecini: readonly (readonly number[])[], R: readonly number[], eps: number): { readonly vecini: number[][]; readonly izolate: Set<number> } {
  const adj = vecini.map((v) => new Set(v));
  const absorbite: (P3[] | null)[] = noduri.map(() => null);
  const izolate = new Set<number>();
  const puncte = (i: number): P3[] => [[noduri[i]!.x, noduri[i]!.y, R[i]!], ...(absorbite[i] ?? [])];
  const inDisc = (i: number, J: number): boolean => puncte(i).every((p) => p[2] <= R[J]! - Math.hypot(p[0] - noduri[J]!.x, p[1] - noduri[J]!.y) + eps);
  const absoarbe = (J: number, lista: readonly number[]): void => {
    let a = absorbite[J] ?? [];
    for (const i of lista) a.push(...puncte(i));
    if (a.length > 48) {
      const prag = (p: P3): number => p[2] + Math.hypot(p[0] - noduri[J]!.x, p[1] - noduri[J]!.y);
      a = a.sort((p, q) => prag(q) - prag(p)).slice(0, 48);
    }
    absorbite[J] = a;
  };
  let schimbat = true;
  while (schimbat) {
    schimbat = false;
    for (let s = 0; s < adj.length; s++) {
      if (adj[s]!.size !== 1) continue;
      const drum = [s];
      let prev = s, cur = [...adj[s]!][0]!;
      while (adj[cur]!.size === 2) {
        drum.push(cur);
        const urm = [...adj[cur]!].find((x) => x !== prev)!;
        prev = cur;
        cur = urm;
        if (cur === s) break;
      }
      if (cur === s) continue;
      if (adj[cur]!.size === 1) {
        drum.push(cur);
        let J = drum[0]!;
        for (const i of drum) if (R[i]! > R[J]!) J = i;
        if (drum.length > 1 && drum.every((i) => i === J || inDisc(i, J))) {
          for (let k = 1; k < drum.length; k++) { adj[drum[k - 1]!]!.delete(drum[k]!); adj[drum[k]!]!.delete(drum[k - 1]!); }
          izolate.add(J);
          absoarbe(J, drum.filter((i) => i !== J));
          schimbat = true;
        }
        continue;
      }
      const J = cur;
      if (drum.every((i) => inDisc(i, J))) {
        absoarbe(J, drum);
        const tot = [...drum, J];
        for (let k = 1; k < tot.length; k++) { adj[tot[k - 1]!]!.delete(tot[k]!); adj[tot[k]!]!.delete(tot[k - 1]!); }
        schimbat = true;
      }
    }
  }
  return { vecini: adj.map((s) => [...s]), izolate };
}

/** Douglas–Peucker pe (x, y, r): abaterea = cea în plan față de coardă plus cea a lui r față de interpolare. */
export function simplifica(P: readonly P3[], tol: number): P3[] {
  if (P.length <= 2) return [...P];
  const pastrat = new Uint8Array(P.length);
  pastrat[0] = 1;
  pastrat[P.length - 1] = 1;
  const stiva: [number, number][] = [[0, P.length - 1]];
  while (stiva.length > 0) {
    const [a, b] = stiva.pop()!;
    const A = P[a]!, B = P[b]!;
    const dx = B[0] - A[0], dy = B[1] - A[1], L2 = dx * dx + dy * dy;
    let cel = -1, max = tol;
    for (let i = a + 1; i < b; i++) {
      const p = P[i]!;
      const t = L2 > 0 ? Math.max(0, Math.min(1, ((p[0] - A[0]) * dx + (p[1] - A[1]) * dy) / L2)) : 0;
      const e = Math.hypot(A[0] + t * dx - p[0], A[1] + t * dy - p[1]) + Math.abs(A[2] + t * (B[2] - A[2]) - p[2]);
      if (e > max) { max = e; cel = i; }
    }
    if (cel >= 0) { pastrat[cel] = 1; stiva.push([a, cel], [cel, b]); }
  }
  return P.filter((_, i) => pastrat[i] === 1);
}

/** Garda: pe fiecare coardă, r interpolat ≤ distanța exactă + tol; altfel se inserează punctul cel mai rău, cu raza exactă. */
export function garda(P: readonly P3[], distanta: (p: Punct, cautaPana?: number) => number, tol: number, adancime = 0): P3[] {
  const rez: P3[] = [P[0]!];
  for (let i = 1; i < P.length; i++) {
    const A = rez[rez.length - 1]!, B = P[i]!;
    let rau: P3 | null = null, max = tol;
    for (let k = 1; k < 8; k++) {
      const t = k / 8;
      const x = A[0] + t * (B[0] - A[0]), y = A[1] + t * (B[1] - A[1]), r = A[2] + t * (B[2] - A[2]);
      const d = distanta({ x, y }, r + tol);
      if (r - d > max) { max = r - d; rau = [x, y, d]; }
    }
    if (rau && adancime < 14) rez.push(...garda([A, rau, B], distanta, tol, adancime + 1).slice(1));
    else rez.push(B);
  }
  return rez;
}

/** Bucățile unei polilinii 3D cu a treia coordonată sub `nivel` (capetele interpolate exact pe nivel). */
export function sub(P: readonly P3[], nivel: number): P3[][] {
  const rez: P3[][] = [];
  let cur: P3[] | null = null;
  for (let i = 0; i < P.length; i++) {
    const p = P[i]!, inP = p[2] < nivel - 1e-9;
    if (i > 0) {
      const q = P[i - 1]!, inQ = q[2] < nivel - 1e-9;
      if (inP !== inQ) {
        const t = (nivel - q[2]) / (p[2] - q[2]);
        const m: P3 = [q[0] + t * (p[0] - q[0]), q[1] + t * (p[1] - q[1]), nivel];
        if (inQ) { cur!.push(m); rez.push(cur!); cur = null; } else cur = [m];
      }
    }
    if (inP) { if (!cur) cur = []; cur.push(p); }
  }
  if (cur && cur.length > 0) rez.push(cur);
  return rez.filter((c) => c.length >= 2 || (c.length === 1 && P.length === 1));
}

/** Punctele în care a treia coordonată trece prin `nivel`, inserate (ca tăierea la nivel să fie exactă pe bucăți liniare). */
export function cuTreceri(P: readonly P3[], nivel: number): P3[] {
  const rez: P3[] = [P[0]!];
  for (let i = 1; i < P.length; i++) {
    const q = P[i - 1]!, p = P[i]!;
    const a = q[2] - nivel, b = p[2] - nivel;
    if ((a < -1e-12 && b > 1e-12) || (a > 1e-12 && b < -1e-12)) {
      const t = a / (a - b);
      rez.push([q[0] + t * (p[0] - q[0]), q[1] + t * (p[1] - q[1]), nivel]);
    }
    rez.push(p);
  }
  return rez;
}

/** Contururile regiunii par-impar, pe grupuri: fiecare exterior (trigonometric) cu găurile lui directe (orare). */
export function grupeRegiune(contururi: readonly Contur[]): { readonly exterior: Contur; readonly gauri: Contur[] }[] {
  const inchise = contururi.filter((c) => c.inchis);
  const adancime = inchise.map((c) => {
    const p = c.varfuri[0]!.p;
    return inchise.filter((d) => d !== c && inRegiune(p, [d])).length;
  });
  const grupe: { exterior: Contur; gauri: Contur[]; adancime: number; sursa: Contur }[] = [];
  inchise.forEach((c, i) => {
    if (adancime[i]! % 2 === 0) grupe.push({ exterior: arieCuSemn(c) > 0 ? c : inverseaza(c), gauri: [], adancime: adancime[i]!, sursa: c });
  });
  inchise.forEach((c, i) => {
    if (adancime[i]! % 2 === 0) return;
    const p = c.varfuri[0]!.p;
    const gazda = grupe.find((g) => g.adancime === adancime[i]! - 1 && inRegiune(p, [g.sursa]));
    if (gazda) gazda.gauri.push(arieCuSemn(c) < 0 ? c : inverseaza(c));
  });
  return grupe.map(({ exterior, gauri }) => ({ exterior, gauri }));
}

export function traseuVcarve(p: ParametriVcarve): RezultatVcarve {
  if (!(p.unghi > 0 && p.unghi < 180)) return { ok: false, motiv: `unghiul frezei în V trebuie să fie în (0°, 180°) (${p.unghi}°)` };
  if (!(p.adancime > 0)) return { ok: false, motiv: `adâncimea maximă trebuie să fie pozitivă (${p.adancime} mm)` };
  if (!(p.pas > 0)) return { ok: false, motiv: `pasul pe trecere trebuie să fie pozitiv (${p.pas} mm)` };
  if (p.contururi.length === 0 || p.contururi.some((c) => !c.inchis)) return { ok: false, motiv: 'V-carve-ul cere contururi închise' };
  const varf = p.varf ?? 0, a = varf / 2;
  if (!(varf >= 0 && varf < p.diametruScula)) return { ok: false, motiv: `vârful frezei în V, de ${varf} mm, trebuie să fie în [0, Ø${p.diametruScula})` };
  const Rf = p.fundPlat ? p.fundPlat.diametru / 2 : 0;
  if (p.fundPlat) {
    if (!(Rf > 0 && Number.isFinite(Rf))) return { ok: false, motiv: `diametrul frezei drepte trebuie să fie pozitiv (${p.fundPlat.diametru} mm)` };
    if (!(p.fundPlat.pasLateral > 0 && p.fundPlat.pasLateral <= Rf)) {
      return { ok: false, motiv: `pasul lateral al frezei drepte, de ${p.fundPlat.pasLateral} mm, trebuie să fie în (0, ${Rf}] (raza ei): altfel rămâne material între inele` };
    }
    let dinainte = p.fundPlat.diametru;
    for (const r of p.fundPlat.rest ?? []) {
      if (!(r.diametru > 0 && r.diametru < dinainte)) return { ok: false, motiv: `freza de rest a fundului (Ø${r.diametru}) trebuie să fie mai mică decât cea dinainte (Ø${dinainte})` };
      if (!(r.pasLateral > 0 && r.pasLateral <= r.diametru / 2)) {
        return { ok: false, motiv: `pasul lateral al frezei de rest Ø${r.diametru}, de ${r.pasLateral} mm, trebuie să fie în (0, ${r.diametru / 2}] (raza ei)` };
      }
      dinainte = r.diametru;
    }
  }
  /** Raza celei mai mici freze drepte a fundului: până la ea, frezele drepte au scos deschiderea fundului cu discul ei. */
  const Rmin = p.fundPlat ? (p.fundPlat.rest?.at(-1)?.diametru ?? p.fundPlat.diametru) / 2 : 0;
  const tan = Math.tan((p.unghi * Math.PI) / 360), cot = 1 / tan;
  // wP: peretele la −D (de la contur); wD: centrul frezei acolo (cu vârful plat, cu a mai departe).
  const D = p.adancime, wP = D * tan, wD = a + wP;
  const index: IndexContur = indexContururi(p.contururi);
  let graf;
  try {
    graf = axaMediala(p.contururi, PAS_ESANTIOANE, index);
  } catch (e) {
    return { ok: false, motiv: `axa medială: ${e instanceof Error ? e.message : String(e)}` };
  }
  const R = graf.noduri.map((q) => index.distanta(q));
  const { vecini, izolate } = taieRamuri(graf.noduri, graf.vecini, R, TOLERANTA_RAMURI);
  // Un nod fără muchii chiar din triangulare (cercul: toate eșantioanele pe același cerc, toate centrele în același nod) e
  // axa întreagă a bucății lui: freza coboară acolo, într-un punct.
  graf.vecini.forEach((v, i) => { if (v.length === 0) izolate.add(i); });
  const ramuri: P3[][] = [];
  let razaMax = 0;
  for (const lant of lanturi(vecini, izolate)) {
    let pts: P3[] = lant.map((i) => { razaMax = Math.max(razaMax, R[i]!); return [graf.noduri[i]!.x, graf.noduri[i]!.y, R[i]!] as const; });
    if (pts.length > 1) pts = garda(simplifica(pts, TOLERANTA_SIMPLIFICARE), index.distanta, TOLERANTA_GARDA);
    ramuri.push(pts);
  }
  const fundPlat = razaMax > wD + 1e-9;
  const cuFreza = fundPlat && p.fundPlat !== undefined;
  // Cu freza dreaptă, axa rămâne doar unde centrul ei n-ajunge (r < wP + m + R, R a celei mai mici, ADR 0093): mai departe,
  // frezele drepte au scos-o deja la −D. Cu
  // vârful plat, z ≥ 0 unde r ≤ a: bucățile acelea le scoate prima trecere (doar sub nivelul de dinainte, adică sub 0).
  const axa: P3[][] = (cuFreza ? ramuri.flatMap((pts) => sub(pts, wP + MARJA_FUND + Rmin)) : ramuri)
    .map((pts) => cuTreceri(pts, wD).map((q) => [q[0], q[1], -Math.min(D, (q[2] - a) * cot)] as const));
  // Peretele unde regiunea e mai lată decât freza la D: inelele regiunii decalate cu wD, la −D.
  const inele: Contur[] = [];
  const avertismente: string[] = [];
  const grupe = grupeRegiune(p.contururi);
  const nuIncape = (motiv: string): boolean => motiv.startsWith('scula nu încape');
  if (fundPlat) {
    for (const g of grupe) {
      const o = offsetDepartat(g, wD);
      if (!o.ok) {
        if (nuIncape(o.motiv)) continue;
        return { ok: false, motiv: `peretele la ${wD.toFixed(3)} mm de contur: ${o.motiv}` };
      }
      for (const r of o.regiuni) inele.push(r.exterior, ...r.gauri);
    }
    if (!p.fundPlat) avertismente.push(`regiunea e mai lată decât freza la ${D} mm (${(2 * wD).toFixed(3)} mm): pereții și axa se taie, iar fundul plat dintre ei rămâne pentru freza dreaptă`);
  } else if (p.fundPlat) {
    avertismente.push(`regiunea nu e nicăieri mai lată decât freza în V la ${D} mm (${(2 * wD).toFixed(3)} mm): n-are fund plat, deci freza dreaptă nu se montează`);
  }
  if (!(razaMax > a)) return { ok: false, motiv: `regiunea nu e nicăieri mai lată decât vârful frezei (${varf} mm): freza n-are unde coborî` };
  const adancimeMax = Math.min(D, (razaMax - a) * cot);
  const con = ((p.diametruScula - varf) / 2) * cot;
  if (adancimeMax > con + 1e-9) {
    return { ok: false, motiv: `regiunea cere ${adancimeMax.toFixed(3)} mm, iar conul frezei în V (Ø${p.diametruScula}, ${p.unghi}°) are ${con.toFixed(3)} mm: micșorează adâncimea maximă sau alege o freză mai lată` };
  }
  const niveluri = adancimiTreceri(adancimeMax, p.pas);
  if (typeof niveluri === 'string') return { ok: false, motiv: niveluri };
  // Freza dreaptă (ADR 0091 §2): pe fiecare nivel L, buzunar în zona {d ≥ L·tan(θ/2) + m}; marginea ei nu ajunge la pereți,
  // iar zona fiecărui nivel e în cea a nivelului de dinainte, deci fiecare nivel scoate cel mult pasul.
  const fund: Miscare[] = [];
  const sfarsitFund: number[] = [];
  /** Bucățile fiecărei freze de rest a fundului (ADR 0093), pe fiecare nivel. */
  const restPeNivel: Array<Array<{ adancime: number; bucati: Punct[][] }>> = (p.fundPlat?.rest ?? []).map(() => []);
  /** Colțurile pe care freza dreaptă nu le atinge: bucățile inelelor V, la −D. */
  const colturi: Punct[][] = [];
  if (cuFreza && p.fundPlat) {
    const f = p.fundPlat;
    for (const nivel of niveluri) {
      const w = nivel * tan + MARJA_FUND;
      for (const g of grupe) {
        const o = offsetDepartat(g, w);
        if (!o.ok) {
          if (nuIncape(o.motiv)) continue;
          return { ok: false, motiv: `fundul plat la ${w.toFixed(3)} mm de contur: ${o.motiv}` };
        }
        for (const r of o.regiuni) {
          const ib = ineleBuzunar(r.exterior, Rf, f.pasLateral, r.gauri);
          if (!ib.ok) {
            if (/nu încape/.test(ib.motiv)) continue;
            return { ok: false, motiv: `fundul plat la ${w.toFixed(3)} mm de contur: ${ib.motiv}` };
          }
          const t = traseuBuzunar(r.exterior, ordineInele(ib.radacini), {
            zSigur: p.zSigur, avans: p.avans, avansPlonjare: p.avansPlonjare, sens: f.sens, raza: Rf, adancimi: [nivel],
          }, r.gauri);
          if (!t.ok) return { ok: false, motiv: `fundul plat la ${w.toFixed(3)} mm de contur: ${t.motiv}` };
          for (const x of t.miscari) fund.push(x);
        }
        // Frezele de rest (ADR 0093): în aceeași regiune a nivelului, fiecare doar unde cea dinainte n-a ajuns.
        for (const r of f.rest?.length ? o.regiuni : []) {
          const b = bucatiRestInLant(r.exterior, r.gauri, Rf, f.rest ?? [], f.sens);
          if (!b.ok) return { ok: false, motiv: `fundul plat la ${w.toFixed(3)} mm de contur, freza de rest Ø${f.rest?.[b.freza]?.diametru}: ${b.motiv}` };
          b.bucati.forEach((bk, k) => {
            const lista = restPeNivel[k]!;
            const nivelK = lista.at(-1)?.adancime === nivel ? lista.at(-1)! : (lista.push({ adancime: nivel, bucati: [] }), lista.at(-1)!);
            nivelK.bucati.push(...bk.map((x) => [...x]));
          });
        }
      }
      sfarsitFund.push(fund.length);
    }
    // Zona centrului celei mai mici freze drepte la −D (ADR 0093: până la ea, frezele drepte au scos deschiderea fundului cu
    // discul ei; Rf mai jos e raza ei): un punct la cel mult Rf de ea e scos. Inelele V rămân unde sunt la peste
    // Rf − sv/2: un punct neatins (la peste Rf) e atunci la peste sv/2 de inelul următor, deci la sub sv/2 de unul păstrat
    // (creasta cel mult c); un inel paralel cu un perete drept, la wD + sv, e atins (marja m < sv/2) și nu se taie.
    // Cu vârful plat (ADR 0092 §2), două inele la sv = t + 2c·tan(θ/2) lasă tot creasta c (vârfurile acoperă t din ea).
    const sv = varf + 2 * CREASTA_FUND * tan;
    const zona: Contur[] = [];
    for (const g of grupe) {
      const o = offsetDepartat(g, wP + MARJA_FUND + Rmin);
      if (!o.ok) {
        if (nuIncape(o.motiv)) continue;
        return { ok: false, motiv: `zona frezei drepte: ${o.motiv}` };
      }
      for (const r of o.regiuni) zona.push(r.exterior, ...r.gauri);
    }
    const iz = zona.length > 0 ? indexContururi(zona) : null;
    const atins = (q: Punct): boolean => iz !== null && (iz.inauntru(q) || iz.distanta(q, Rmin) <= Rmin - sv / 2);
    if (iz === null) avertismente.push(`freza dreaptă (Ø${2 * Rmin}) nu încape nicăieri în fundul plat: îl fac inelele frezei în V, la ${sv.toFixed(4)} mm unul de altul`);
    // Inelele V la wD + j·sv, cât poate fi un punct neatins (sub wD + m + R de contur), plus unul.
    for (let j = 1; j * sv <= Rmin + MARJA_FUND + sv; j++) {
      let gol = true;
      for (const g of grupe) {
        const o = offsetDepartat(g, wD + j * sv);
        if (!o.ok) {
          if (nuIncape(o.motiv)) continue;
          return { ok: false, motiv: `inelul colțurilor la ${(wD + j * sv).toFixed(3)} mm de contur: ${o.motiv}` };
        }
        for (const r of o.regiuni) {
          for (const c of [r.exterior, ...r.gauri]) { gol = false; colturi.push(...bucatiNeatinse(c, atins, sv)); }
        }
      }
      if (gol) break;
    }
  }
  const m: Miscare[] = [{ tip: 'rapida', la: { Z: p.zSigur } }];
  let unde: Punct = { x: 0, y: 0 };
  const sfarsitTreceri: number[] = [];
  const toate = niveluri.every((nivel, k) => {
    const deasupra = k === 0 ? 0 : niveluri[k - 1]!;
    const bucati: P3[][] = [];
    for (const P of axa) for (const s of sub(P, -deasupra)) bucati.push(cuTreceri(s, -nivel).map((q) => [q[0], q[1], Math.max(q[2], -nivel)] as const));
    // Inelele colțurilor sunt la −D, sub orice nivel de dinainte: pe fiecare trecere, la −nivel.
    for (const c of colturi) bucati.push(c.map((q) => [q.x, q.y, -nivel] as const));
    // Ordinea: capătul cel mai apropiat de unde a rămas freza, cu inversarea lanțului la nevoie.
    const ramase = bucati.slice();
    while (ramase.length > 0) {
      let cel = 0, dCel = Infinity, invers = false;
      ramase.forEach((b, i) => {
        const a = b[0]!, z = b[b.length - 1]!;
        const da = (a[0] - unde.x) ** 2 + (a[1] - unde.y) ** 2, dz = (z[0] - unde.x) ** 2 + (z[1] - unde.y) ** 2;
        if (da < dCel) { dCel = da; cel = i; invers = false; }
        if (dz < dCel) { dCel = dz; cel = i; invers = true; }
      });
      let b = ramase.splice(cel, 1)[0]!;
      if (invers) b = b.slice().reverse();
      m.push({ tip: 'rapida', la: { Z: p.zSigur } }, { tip: 'rapida', la: { X: b[0]![0], Y: b[0]![1] } }, { tip: 'taiere', la: { Z: b[0]![2] }, avans: p.avansPlonjare });
      for (let i = 1; i < b.length; i++) {
        const q = b[i - 1]!, r = b[i]!;
        const lung = Math.hypot(r[0] - q[0], r[1] - q[1]);
        if (lung < 1e-9 && Math.abs(r[2] - q[2]) < 1e-9) continue;
        m.push({ tip: 'taiere', la: { X: r[0], Y: r[1], Z: r[2] }, avans: avansCoborare(lung, r[2] - q[2], p.avans, p.avansPlonjare) });
      }
      const ultim = b[b.length - 1]!;
      unde = { x: ultim[0], y: ultim[1] };
    }
    // Inelele peretelui, la −min(D, nivel): pe fiecare trecere, ca acolo să nu se scoată mai mult decât pasul.
    for (const inel of inele) {
      const start = inel.varfuri[0]!.p, z = -nivel;
      const L = lungimeBucla(inel);
      const r = parcurge(inel, [{ s: 0, z }, { s: L, z }], p.avans, p.avansPlonjare);
      if (!r.ok) return false;
      m.push({ tip: 'rapida', la: { Z: p.zSigur } }, { tip: 'rapida', la: { X: start.x, Y: start.y } }, { tip: 'taiere', la: { Z: z }, avans: p.avansPlonjare }, ...r.miscari);
      unde = start;
    }
    sfarsitTreceri.push(m.length);
    return true;
  });
  if (!toate) return { ok: false, motiv: 'un inel al peretelui nu se poate parcurge' };
  m.push({ tip: 'rapida', la: { Z: p.zSigur } });
  const regim = { zSigur: p.zSigur, avans: p.avans, avansPlonjare: p.avansPlonjare };
  const resturi = restPeNivel.map((niv) => taieBucati(niv, regim));
  return {
    ok: true, fund, fundRest: resturi.map((x) => x.miscari), miscari: m, avertismente,
    statistici: {
      esantioane: graf.statistici.esantioane, lanturi: axa.length, raza: razaMax, treceri: niveluri.length, fundPlat, sfarsitTreceri, sfarsitFund,
      sfarsitFundRest: resturi.map((x) => x.sfarsitTreceri), ineleColturi: colturi.length,
    },
  };
}
