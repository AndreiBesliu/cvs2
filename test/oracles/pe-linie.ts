/**
 * INVARIANTA 14 (i) (ADR 0037 §13, felia 2.3c; sesiune independentă, scrisă doar din ADR), cu ZERO importuri din `src/`:
 * „pe orice etichetă `pe-linie`, deschisă sau închisă, fiecare mișcare de tăiere stă pe calea desenată, iar calea e
 * acoperită. Ambele sensuri se judecă la cel mult 0,001 mm (biarcele) + 0,002 mm (postul), plus marja declarată de
 * oracol.” Repară orbirea de la „Ce am măsurat”, punctul 2: pe linie, poarta nu judeca nimic, iar un arc cu coarda
 * 1e-11 mm ieșea ca un cerc Ø50 tăiat prin piesă (două semicercuri, fiecare cu capetele pe contur).
 *
 * Ce judecă, pe textul G-code (poarta dă evenimentele, etichetele valide și partea de sub fața de sus a fiecărei mișcări,
 * `parteaDeTaiere`, cu arcele EXACT cum le execută GRBL: centrul = startul + (I, J), raza din I / J, unghiul din
 * `regulaArcGrbl`, deci și cercul întreg, plus segmentul scurt până la capătul scris):
 * - **Mișcările de tăiere:** G1 / G2 / G3 cu o parte sub fața de sus, sub o etichetă `pe-linie` validă (ultima etichetă de
 *   dinaintea mișcării, ca la invarianta 2). Plonjarea pe verticală e un punct și se judecă și ea.
 * - **Calea desenată:** conturul exact al elementului, în lume, din documentul oracolului (`TaieturaDoc.contur` din
 *   `regiune.ts`: liniile și arcele exacte, cubicele ca polilinie cu săgeata `SAGETA_CUBICA` = 1e-4 mm).
 * - **Înainte** (programul → calea): pe fiecare primitivă a fiecărei mișcări, supremul distanței până la cale, ≤ `TOL_14`.
 * - **Acoperirea** (calea → programul): pe fiecare LANȚ (o trecere: mișcările de tăiere consecutive ale aceleiași
 *   etichete, fără nicio mișcare prin aer sau G0 între ele), supremul distanței de la punctele căii până la lanț, ≤
 *   `TOL_14`. ALEGERE: acoperirea se cere fiecărui lanț, nu reuniunii lor: o trecere care sare o bucată nu e ascunsă de
 *   alta. O etichetă `pe-linie` fără nicio mișcare de tăiere lasă calea neacoperită (încălcare).
 *
 * **Rafinarea** (nu doar capetele): distanța până la o mulțime e 1-lipschitziană în lungimea parcursă, deci pe o bucată
 * [s0, s1] de lungime h, cu distanțele d0, d1 în capete, supremul e cel mult (d0 + d1 + h) / 2. Bucata se împarte în două
 * până când marginea coboară sub `TOL_14` (certificat), sau h ≤ `PAS_MIN_14` (atunci supremul e cel mult `TOL_14` +
 * `PAS_MIN_14` / 2, toleranța declarată a rafinării), sau un punct trece de `TOL_14` (încălcare; căutarea continuă doar
 * pentru valoarea raportată). Arcul se parcurge pe lungimea lui (r·|Δu|): un cerc întreg cu capetele pe contur e prins
 * la mijloc, la orice rază.
 *
 * **Toleranța** `TOL_14` = 0,001 (biarcele, ADR 0033 §1) + 0,002 (postul, `TOL_ROTUNJIRE` din poartă) + `MARJA_14`.
 * Marja declarată (0,0005 mm), din ce nu intră în cele două:
 * - rotunjirea postului pe un ARC trece de 0,002: startul S′ (±0,0005 pe axă) și I / J (±0,0005) mută centrul și raza;
 *   la primul ordin, punctul opus startului se abate cu (δS − 2ρ)·n, deci până la √2 · 0,0015 = 0,00212 mm (cu I / J
 *   din startul exact, la fel: ρ·n + (δS + ρ)·u ≤ 0,00212). Măsurat (sesiunea oracolului): căutarea țintită dă 0,002107
 *   la orice rază între 0,01 și 200 mm, cea aleatoare (200 000 de arce pe rază) cel mult 0,00176. Cu biarcele la limită,
 *   `celMaiRauArc` (`pe-linie.cazuri.ts`, testul (d)) ajunge la 0,003097: peste 0,003, sub `TOL_14`;
 * - măsura mea a cubicei (polilinia la 1e-4 mm);
 * - rafinarea (`PAS_MIN_14` / 2 = 5e-6 mm);
 * - rezerva pentru ce n-am măsurat (termenii de ordinul doi pe arcele foarte mici, float32 al controlerului): ~2,8e-4 mm
 *   (0,0005 − 0,00011 − 0,0001 − 0,000005).
 * Peste `TOL_14` nu ajunge niciun program legal: o abatere de 0,004 mm e deja încălcare (martorul N2).
 *
 * Felia 2.3c-2 (ADR 0037 §2, documentul v10): pe o cale DESCHISĂ, `regiune.ts` construiește calea desenată fără coarda
 * de închidere (`contur(…, deschise)`, doar cele n − 1 segmente reale), deci aici nu se schimbă nimic: o coardă tăiată
 * de la ultimul vârf la vârful 0 iese de pe cale (înainte), iar acoperirea se cere doar pe segmentele reale.
 *
 * Ce NU face (limitele, spuse în raport):
 * - G0 nu se judecă (nu e „mișcare de tăiere”); o rapidă prin material e a invariantei 3. O rapidă rupe lanțul.
 */
import type { Eveniment, Mutare } from './gcode.ts';
import { cutiePrimitiva, distantaCutii, dPunct, lungime, punctLa, arc, segment, type Cutie, type Eticheta, type Primitiva, type Pt, type Regiune } from './regiune.ts';

/** ADR 0033 §1: abaterea biarcelor (T2). */
export const TOL_BIARCE_14 = 0.001;
/** Rotunjirea postului la 3 zecimale (aceeași cifră ca `TOL_ROTUNJIRE` din poartă). */
export const TOL_POST_14 = 0.002;
/** Marja declarată a oracolului (antetul). */
export const MARJA_14 = 0.0005;
/** Toleranța invariantei 14 (i), în ambele sensuri. */
export const TOL_14 = TOL_BIARCE_14 + TOL_POST_14 + MARJA_14;
/** Bucata cea mai scurtă a rafinării: supremul certificat greșește cu cel mult jumătate din ea. */
export const PAS_MIN_14 = 1e-5;
/** Lungimea bucăților indexate și latura celulei grilei (mm): doar viteza, nu verdictul. */
const BUCATA_INDEX = 2;
const CELULA = 1;

export type EtichetaPoarta = { readonly linia: number; readonly eticheta: Eticheta | null };

/** O trecere pe linie: mișcările de tăiere consecutive de sub aceeași etichetă `pe-linie`. */
export type LantPeLinie = {
  readonly eticheta: number;
  readonly idLume: string;
  readonly liniaEtichetei: number;
  readonly mutari: Array<{ readonly linia: number; readonly parti: readonly Primitiva[] }>;
};

export type Incalcare14 = { readonly linia: number; readonly mesaj: string };

/**
 * Lanțurile de pe etichetele `pe-linie` valide, în ordinea programului, și etichetele `pe-linie` fără nicio mișcare de
 * tăiere. `parti(m)`: partea de sub fața de sus a mișcării, în XY-ul documentului (goală: mișcarea nu taie).
 */
export function lanturiPeLinie(
  evenimente: readonly Eveniment[], etichete: readonly EtichetaPoarta[], parti: (m: Mutare) => Primitiva[],
): { readonly lanturi: readonly LantPeLinie[]; readonly fara: readonly number[] } {
  const lanturi: LantPeLinie[] = [];
  const cuTaiere = new Set<number>();
  let iE = -1;
  let lant: LantPeLinie | null = null;
  for (const e of evenimente) {
    if (e.tip !== 'mutare') continue;
    const m = e.m;
    while (iE + 1 < etichete.length && etichete[iE + 1]!.linia < m.linia) iE++;
    const p = m.cod === 0 ? [] : parti(m);
    const et = iE >= 0 ? etichete[iE]!.eticheta : null;
    // O mișcare care nu taie (G0, aer) rupe lanțul; la fel o tăiere sub altă etichetă (sau fără una validă).
    if (p.length === 0 || et === null || et.latura !== 'pe-linie') { lant = null; continue; }
    if (lant === null || lant.eticheta !== iE) {
      lant = { eticheta: iE, idLume: et.idLume, liniaEtichetei: etichete[iE]!.linia, mutari: [] };
      lanturi.push(lant);
      cuTaiere.add(iE);
    }
    lant.mutari.push({ linia: m.linia, parti: p });
  }
  const fara = etichete.flatMap((x, i) => (x.eticheta?.latura === 'pe-linie' && !cuTaiere.has(i) ? [i] : []));
  return { lanturi, fara };
}

// ---------------------------------------------------------------------------------------------------------------
// Distanța de la un punct la o mulțime de primitive: exactă (dPunct pe fiecare), cu o grilă doar pentru viteză.

type Distanta = (p: Pt) => number;

/** Primitiva tăiată în bucăți de cel mult `BUCATA_INDEX` mm (exacte: aceleași puncte), pentru cutii mici în grilă. */
function bucati(q: Primitiva): Primitiva[] {
  if (q.tip === 'punct') return [q];
  const L = lungime(q);
  const n = Math.max(1, Math.ceil(L / BUCATA_INDEX), q.tip === 'arc' ? Math.ceil(Math.abs(q.du) / (Math.PI / 2)) : 1);
  if (n === 1) return [q];
  const rez: Primitiva[] = [];
  for (let k = 0; k < n; k++) {
    if (q.tip === 'segment') rez.push(segment(punctLa(q, (L * k) / n), k === n - 1 ? q.b : punctLa(q, (L * (k + 1)) / n)));
    else rez.push(arc(q.c, q.r, q.u0 + (q.du * k) / n, q.du / n));
  }
  return rez;
}

/**
 * Distanța la mulțimea `prims`. Grila ține fiecare bucată în celulele atinse de cutia ei crescută cu `T`: orice primitivă
 * la cel mult T de p e în celula lui p, deci minimul din celulă e EXACT când e ≤ T. Altfel (încălcare, sau o toleranță
 * mică la măsurare), minimul exact: inelele de celule din jurul lui p, până când inelul următor e mai departe decât
 * minimul găsit (un punct dintr-o celulă la distanța Chebyșev k e la cel puțin (k − 1) · CELULA de p); dincolo de
 * `INELE_MAX`, toate primitivele, cu tăierea după cutii.
 */
const INELE_MAX = 40;
function distantaLa(prims: readonly Primitiva[], T: number): Distanta {
  const toate = prims.flatMap(bucati);
  const cutii = toate.map(cutiePrimitiva);
  const grila = new Map<number, number[]>();
  const cheie = (i: number, j: number): number => (i + 1048576) * 2097152 + (j + 1048576);
  cutii.forEach((c, k) => {
    const i0 = Math.floor((c.minX - T) / CELULA), i1 = Math.floor((c.maxX + T) / CELULA);
    const j0 = Math.floor((c.minY - T) / CELULA), j1 = Math.floor((c.maxY + T) / CELULA);
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        const x = grila.get(cheie(i, j));
        if (x) x.push(k); else grila.set(cheie(i, j), [k]);
      }
    }
  });
  const toatePrimitivele = (p: Pt): number => {
    const cp: Cutie = { minX: p.x, maxX: p.x, minY: p.y, maxY: p.y };
    let d = Infinity;
    for (let k = 0; k < toate.length; k++) {
      if (distantaCutii(cp, cutii[k]!) >= d) continue;
      const x = dPunct(p, toate[k]!);
      if (x < d) d = x;
    }
    return d;
  };
  const exact = (p: Pt, ci: number, cj: number, d0: number): number => {
    let d = d0;
    const celula = (i: number, j: number): void => {
      const lista = grila.get(cheie(i, j));
      if (lista) for (const k of lista) { const x = dPunct(p, toate[k]!); if (x < d) d = x; }
    };
    for (let k = 1; k <= INELE_MAX; k++) {
      if ((k - 1) * CELULA >= d) return d;
      for (let i = ci - k; i <= ci + k; i++) { celula(i, cj - k); celula(i, cj + k); }
      for (let j = cj - k + 1; j <= cj + k - 1; j++) { celula(ci - k, j); celula(ci + k, j); }
    }
    return INELE_MAX * CELULA >= d ? d : toatePrimitivele(p);
  };
  return (p) => {
    const ci = Math.floor(p.x / CELULA), cj = Math.floor(p.y / CELULA);
    const lista = grila.get(cheie(ci, cj));
    let d = Infinity;
    if (lista) for (const k of lista) { const x = dPunct(p, toate[k]!); if (x < d) d = x; }
    return d <= T ? d : exact(p, ci, cj, d);
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Rafinarea: supremul distanței de-a lungul unei primitive.

export type Depasire = { readonly d: number; readonly la: Pt };

/**
 * Supremul lui `dist` pe primitiva `q`, față de pragul `T`: `null` dacă e certificat ≤ T (cu toleranța PAS_MIN_14 / 2),
 * altfel cel mai rău punct găsit (căutarea maximului se oprește la 1 % din valoare, cel puțin 0,001 mm: doar raportul).
 */
export function supremul(q: Primitiva, dist: Distanta, T: number): Depasire | null {
  if (q.tip === 'punct') {
    const d = dist(q.p);
    return d > T ? { d, la: q.p } : null;
  }
  return supremulCurba((s) => punctLa(q, s), 0, lungime(q), dist, T);
}

/**
 * Același suprem, pe o curbă parcursă cu viteza 1 (`la(s)`, s în [s0, s1]): `dist` ∘ `la` e 1-lipschitziană, deci
 * rafinarea de mai sus se aplică neschimbată (felia 2.3c-5 o folosește pe offsetul deschis ideal, `parte.ts`).
 */
export function supremulCurba(la: (s: number) => Pt, s0: number, s1: number, dist: Distanta, T: number): Depasire | null {
  const st: { rau: Depasire | null } = { rau: null };
  const vezi = (d: number, p: Pt): void => { if (d > T && (st.rau === null || d > st.rau.d)) st.rau = { d, la: p }; };
  const p0 = la(s0), p1 = la(s1);
  const d0 = dist(p0), d1 = dist(p1);
  vezi(d0, p0);
  vezi(d1, p1);
  const stiva: Array<readonly [number, number, number, number]> = [[s0, s1, d0, d1]];
  while (stiva.length) {
    const [a0, a1, a, b] = stiva.pop()!;
    const h = a1 - a0;
    // Marginea lipschitziană a supremului pe [a0, a1].
    const U = (a + b + h) / 2;
    if (U <= T) continue;
    if (st.rau !== null && U <= st.rau.d + Math.max(1e-3, 0.01 * st.rau.d)) continue;
    if (h <= PAS_MIN_14) continue;
    const sm = (a0 + a1) / 2;
    const pm = la(sm);
    const dm = dist(pm);
    vezi(dm, pm);
    stiva.push([a0, sm, a, dm], [sm, a1, dm, b]);
  }
  return st.rau;
}

// ---------------------------------------------------------------------------------------------------------------
// Invarianta.

const f3 = (v: number): string => v.toFixed(3);
const f4 = (v: number): string => v.toFixed(4);

/** 14 (i) pe lanțurile date: înainte (fiecare mișcare) și acoperirea (fiecare lanț). */
export function verificaPeLinie(
  lanturi: readonly LantPeLinie[], fara: readonly number[], etichete: readonly EtichetaPoarta[], reg: Regiune, T: number = TOL_14,
): Incalcare14[] {
  const rez: Incalcare14[] = [];
  const contururi = new Map<string, Distanta | null>();
  const conturul = (id: string): Distanta | null => {
    if (!contururi.has(id)) {
      const c = reg.taieturi.get(id)?.contur;
      contururi.set(id, c ? distantaLa(c.primitive, T) : null);
    }
    return contururi.get(id)!;
  };
  for (const i of fara) {
    const x = etichete[i]!;
    rez.push({ linia: x.linia, mesaj: `pe linie: eticheta lui ${x.eticheta!.idLume} n-are nicio mișcare de tăiere, deci calea nu e acoperită` });
  }
  for (const lant of lanturi) {
    const c = reg.taieturi.get(lant.idLume)?.contur;
    const laCale = conturul(lant.idLume);
    if (!c || !laCale) {
      rez.push({ linia: lant.liniaEtichetei, mesaj: `pe linie: conturul lui ${lant.idLume} nu se poate construi, deci tăierea nu se poate judeca` });
      continue;
    }
    // Înainte: fiecare mișcare, pe toată lungimea ei, stă pe cale.
    for (const m of lant.mutari) {
      let rau: Depasire | null = null;
      for (const q of m.parti) {
        const x = supremul(q, laCale, T);
        if (x && (!rau || x.d > rau.d)) rau = x;
      }
      if (rau) {
        rez.push({
          linia: m.linia,
          mesaj: `pe linie: mișcarea iese de pe calea lui ${lant.idLume}: punctul (${f4(rau.la.x)}, ${f4(rau.la.y)}) e la ${f3(rau.d)} mm de ea (toleranța ${f4(T)})`,
        });
      }
    }
    // Acoperirea: fiecare punct al căii stă lângă trecere.
    const laLant = distantaLa(lant.mutari.flatMap((m) => m.parti), T);
    let rau: Depasire | null = null;
    for (const q of c.primitive) {
      const x = supremul(q, laLant, T);
      if (x && (!rau || x.d > rau.d)) rau = x;
    }
    if (rau) {
      const prima = lant.mutari[0]!.linia, ultima = lant.mutari.at(-1)!.linia;
      rez.push({
        linia: lant.liniaEtichetei,
        mesaj: `pe linie: calea lui ${lant.idLume} nu e acoperită de trecerea din liniile ${prima}–${ultima}: punctul (${f4(rau.la.x)}, ${f4(rau.la.y)}) e la ${f3(rau.d)} mm de ea (toleranța ${f4(T)})`,
      });
    }
  }
  return rez;
}

/** Invarianta 14 (i) pe un program: lanțurile, apoi verificarea. */
export function invarianta14(
  evenimente: readonly Eveniment[], etichete: readonly EtichetaPoarta[], reg: Regiune, parti: (m: Mutare) => Primitiva[], T: number = TOL_14,
): Incalcare14[] {
  const { lanturi, fara } = lanturiPeLinie(evenimente, etichete, parti);
  return verificaPeLinie(lanturi, fara, etichete, reg, T);
}
