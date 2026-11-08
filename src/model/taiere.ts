/**
 * Tăierea vectorilor cu o linie dreaptă (ADR 0180 §2, §3, §6, §7; felia 10.3↑): linia verticală x = X, orizontală y = Y (mm
 * ai foii) sau un ghidaj al foii împarte fiecare formă aleasă în două forme, ce e de o parte și ce e de cealaltă. Pură:
 * întoarce instanțele înlocuite, fiecare cu părțile ei, pentru comanda `degrupeaza` a jurnalului (ADR 0103 §5), aplicată de
 * acțiunea `document.taie` într-un pas, doar dacă documentul e încă cel de la clic.
 *
 * - **Locurile de tăiere** se calculează direct, pe fiecare segment în lume: linia (un raport), arcul (cercul lui cu linia),
 *   cubica (rădăcinile polinomului de gradul 3, pe bucățile ei monotone). Doar o trecere taie: o atingere (un cerc tangent, un
 *   vârf în care calea se întoarce) nu; o latură care stă pe linie, într-o formă care trece dincolo de ea, se refuză.
 * - **Bucățile** se taie exact, în coordonatele elementului, unde parametrii sunt aceiași ca în lume: `adaugaNod` (arcul în
 *   două arce ale aceluiași cerc, cubica prin de Casteljau); restul vârfurilor rămân la bit. Cercul (forma `cerc`) se taie pe
 *   cercul lui: fiecare bucată e un singur arc (nota owner-ului: un cerc tăiat prin centru dă două semicercuri).
 * - **Închiderea** (bifa „Închide bucățile”): contururile închise ale piesei sunt o regiune, citită par-impar (ca V-carve-ul
 *   și rolurile). De-a lungul liniei, punctele de trecere se împerechează (1–2, 3–4, …): fiecare pereche e o coardă, iar pe
 *   fiecare parte, bucățile și corzile fac cicluri, fiecare un contur închis. Un inel tăiat în două dă două „U”-uri.
 * - **Rolul** (răspunsul 3a): o piesă cu un rol recunoscut îl păstrează pe părți (operațiile refăcute pe imbricarea nouă, cu
 *   aceleași valori); altfel, fiecare formă își ia operațiile, iar o bucată deschisă dintr-o formă închisă e tăiată pe aceeași
 *   parte a frezei (exteriorul, în afara formei: stânga sau dreapta, după sensul desenului). Buzunarul, V-carve-ul și găurirea
 *   nu trec pe o bucată deschisă (nici găurirea pe o formă care nu mai e cerc): se scot, numărate.
 *
 * Felia 10.3↑b (ADR 0180 §3, §5, §6): **cuțitul-formă** (ultima formă aleasă, care rămâne neschimbată) și **„Taie la
 * intersecții”**. Locurile comune vin din cavalier, rafinate cu Newton pe segmentele adevărate (ca bucla, ADR 0124 §13).
 * - Cuțitul taie un contur închis doar acolo unde exact una dintre bucățile lui de lângă loc intră în regiunea piesei (o
 *   trecere, sau capătul cuțitului care intră); o atingere, din afară sau dinăuntru, nu taie. O cale deschisă se taie unde
 *   cuțitul o trece de tot. Cu închidere, corzile sunt bucățile cuțitului din regiune; fețele merg pe bucăți (cu regiunea în
 *   stânga) și pe corzi. Un cuțit închis lasă două părți (înăuntrul lui și în afara lui); unul deschis face din fiecare față și
 *   din fiecare bucată o formă, iar contururile netăiate merg cu fața în care stau sau rămân împreună.
 * - „Taie la intersecții” taie fiecare contur ales în toate locurile lui comune cu celelalte (treceri, atingeri, capetele unei
 *   suprapuneri), nu și în buclele lui; un contur închis cu un singur loc rămâne întreg. Fiecare bucată devine o formă.
 *
 * Felia 10.3↑c (ADR 0180 §4): **„Decupează la”** ultima formă aleasă, închisă (granița, care rămâne): fiecare formă aleasă e
 * împărțită ca de un cuțit închis, apoi păstrează ce e de partea aleasă (înăuntru sau în afară). O formă care trece granița
 * se taie, se șterge sau rămâne întreagă, după alegere; una fără nimic de partea păstrată pleacă (`sterse`).
 *
 * Felia 10.3↑f (ADR 0181 §1): **cuțitul uneltei**. O cale trasă pe pânză (felurile Linie, Pen și Liber), în mm ai foii, care
 * nu intră în document (mâna liberă vine netezită aici, la toleranța dată), sau una ori mai multe forme existente (felul
 * Formă: un text, cu toate literele lui), citite împreună, par-impar. Un cuțit închis care stă tot înăuntrul unei forme, fără
 * să-i treacă vreun contur, o taie și el, cu închidere: bucla lui intră în ambele părți, ca margine înăuntru și ca gol în
 * afară (literele unui text puse pe o placă ies din ea, iar placa rămâne cu golurile lor).
 */
import { apropiat } from '../geom/apropiat.ts';
import { arieCuSemn, cerculArcului, inverseaza, numarSegmente, segment, type Contur, type Punct, type Segment, type Varf } from '../geom/contur.ts';
import { CUTIE_GOALA, cutieContur, uneste, type Cutie } from '../geom/cutie.ts';
import { distantaLaContur, inRegiune } from '../geom/distanta.ts';
import { inversa } from '../geom/inversa.ts';
import { compune, IDENTITATE, transformaContur, type Matrice } from '../geom/matrice.ts';
import { autointersectii, indexCutii, intersectiiIntre } from '../geom/offset.ts';
import type { Document, ElementNod, FormaDoc, Instanta, Nod, Operatie, Piesa, SegmentDoc, VarfDoc } from './document.ts';
import { conturElement, cutieElement } from './forme.ts';
import type { Degrupata } from './jurnal.ts';
import { elementeFoaie, elementeInstanta, matriceInstanta, type ElementLume } from './lume.ts';
import { netezesteCale } from './netezire.ts';
import { adaugaNod, caleDinForma, type FormaCale } from './noduri.ts';
import { punctPe as punctSeg, rafineaza, treceri as langa } from './reparare.ts';
import { grupeRol, rolPiesei } from './rol.ts';
import { PLAFON_PERECHI, pentruCavalier } from './verificare.ts';

/**
 * Cu ce se taie: linia verticală x = X, cea orizontală y = Y (mm ai foii), un ghidaj al foii (ADR 0050), după id, ultima formă
 * aleasă (instanța ei, care rămâne neschimbată) sau formele alese între ele („Taie la intersecții”).
 */
export type Cutit =
  | { readonly fel: 'x'; readonly x: number }
  | { readonly fel: 'y'; readonly y: number }
  | { readonly fel: 'ghidaj'; readonly id: string }
  | { readonly fel: 'forma'; readonly id: string }
  /**
   * Cuțitul uneltei (ADR 0181 §1): o cale trasă pe pânză, în mm ai foii, care nu intră în document. `netezire`: mâna liberă se
   * netezește întâi, la toleranța asta (mm), cu netezirea din ADR 0180 §9.
   */
  | { readonly fel: 'cale'; readonly cale: FormaCale; readonly netezire?: number }
  /** Felul Formă al cuțitului (ADR 0181 §1, nota owner-ului): una sau mai multe forme existente, citite împreună (par-impar). */
  | { readonly fel: 'forme'; readonly ids: readonly string[] }
  /**
   * Foarfeca (ADR 0181 §4): conturul instanței `id` cel mai apropiat de `punct` (mm ai foii), la cel mult `toleranta` mm, se
   * taie acolo, exact (un nod al lui mai apropiat de atât e locul): o cale închisă se deschide, una deschisă devine două.
   * Bucățile lui devin forme, ca la intersecții; celelalte contururi ale piesei rămân împreună.
   */
  | { readonly fel: 'foarfeca'; readonly id: string; readonly punct: Punct; readonly toleranta: number }
  /**
   * Retează (ADR 0181 §5): bucata conturului de sub `punct` (instanța `id`), dintre cele mai apropiate două locuri comune cu
   * celelalte contururi ale formelor alese, se scoate; ce rămâne stă în piesă. Un contur fără două locuri comune (deschis: fără
   * niciunul) pleacă tot.
   */
  | { readonly fel: 'reteaza'; readonly id: string; readonly punct: Punct; readonly toleranta: number }
  | { readonly fel: 'intersectii' }
  /**
   * Decupează la ultima formă aleasă (instanța ei, închisă): păstrează ce e înăuntru sau în afară; formele care trec granița
   * se taie, se șterg sau rămân întregi.
   */
  | { readonly fel: 'decupare'; readonly id: string; readonly pastreaza: 'inauntru' | 'afara'; readonly trec: 'taie' | 'sterge' | 'intregi' };
type CutitLinie = Extract<Cutit, { readonly fel: 'x' | 'y' | 'ghidaj' }>;

export type CerereTaiere = {
  readonly cutit: Cutit;
  /** Instanțele alese (selecția aplicației), pe foaia de lucru. */
  readonly alese: readonly string[];
  /** „Închide bucățile”: fiecare parte a unei forme închise se închide pe tăietură. */
  readonly inchide: boolean;
};

/**
 * De ce nu s-a tăiat nimic: `nimic-ales` (nicio formă aleasă), `ghidaj` (ghidajul nu mai e pe foaie), `valoare` (X / Y nu e un
 * număr), `nimic-taiat` (linia nu trece prin nicio formă aleasă), `impartita` (o piesă pusă de mai multe ori, ca la reparații),
 * `pe-linie` (o latură stă pe linie, iar forma trece dincolo de ea), `operatii` (o formă închisă unită din contururi cu
 * operații diferite, pe o piesă fără rol: alege întâi un rol sau taie fără închidere), `nereusita` (tăierea nu s-a putut face
 * exact, de pildă două treceri în același punct), `nu-trece` (cu închidere, cuțitul se oprește în regiunea unei forme),
 * `cutit` (cu închidere, cuțitul se încrucișează în regiunea unei forme), `prea-multe` (prea multe perechi de forme de
 * cercetat la intersecții, ca la verificare), `granita` (granița decupării nu e o formă închisă), `departe` (clicul foarfecii
 * sau al retezatului nu e la toleranță de niciun contur al formei), `capat` (foarfeca pe capătul unei căi deschise: nimic de
 * despărțit).
 */
export type MotivTaiere = 'nimic-ales' | 'ghidaj' | 'valoare' | 'nimic-taiat' | 'impartita' | 'pe-linie' | 'operatii' | 'nereusita' | 'nu-trece' | 'cutit' | 'prea-multe' | 'granita' | 'departe' | 'capat';

export type RezultatTaiere =
  | {
    readonly ok: true;
    /** Instanțele tăiate, fiecare cu piesa ei și părțile care îi iau locul (o parte, apoi cealaltă). */
    readonly degrupate: readonly Degrupata[];
    /** Instanțele noi, de ales după tăiere. */
    readonly ids: readonly string[];
    /** Câte forme (contururi) s-au tăiat. */
    readonly forme: number;
    /** Câte operații s-au scos de pe bucățile deschise (buzunarul, V-carve-ul, găurirea). */
    readonly scoase: number;
    /** Instanțele de șters (decuparea: fără nimic de partea păstrată, sau care trec granița, cu „se șterg”). */
    readonly sterse: readonly string[];
  }
  | { readonly ok: false; readonly motiv: MotivTaiere };

type Linie = { readonly axa: 'x' | 'y'; readonly v: number };
/** Locul punctului față de linie: negativ de partea A (stânga sau dedesubt), pozitiv de partea B. */
const fata = (L: Linie, p: Punct): number => (L.axa === 'x' ? p.x : p.y) - L.v;
/** Poziția punctului de-a lungul liniei. */
const dealungul = (L: Linie, p: Punct): number => (L.axa === 'x' ? p.y : p.x);
/** Sub atât, un punct e pe linie: 1e-9 mm, plus rotunjirea coordonatelor mari. */
const eps = (p: Punct): number => 1e-9 + 1e-12 * Math.max(Math.abs(p.x), Math.abs(p.y));
const LINIE_DOC = (): SegmentDoc => ({ tip: 'L' });

const punctPe = (a: Punct, b: Punct, s: Segment, t: number): Punct => punctSeg({ a, b, s }, t);

/** Rădăcinile reale ale lui A·t² + B·t + C din (0, 1), sortate. */
function radacini2(A: number, B: number, C: number): number[] {
  const scara = Math.max(Math.abs(A), Math.abs(B), Math.abs(C));
  if (scara === 0) return [];
  let r: number[];
  if (Math.abs(A) > 1e-14 * scara) {
    const D = B * B - 4 * A * C;
    if (D < 0) return [];
    const q = -(B + (B < 0 ? -1 : 1) * Math.sqrt(D)) / 2;
    r = q === 0 ? [0] : [q / A, C / q];
  } else {
    r = Math.abs(B) > 1e-14 * scara ? [-C / B] : [];
  }
  return r.filter((t) => t > 0 && t < 1).sort((u, w) => u - w);
}

/**
 * Parametrii din (0, 1) la care segmentul trece linia (o schimbare de parte). `peA` / `peB`: capătul e pe linie (atunci locul
 * lui îl judecă vârful, nu segmentul).
 */
function treceriSegment(L: Linie, a: Punct, b: Punct, s: Segment, peA: boolean, peB: boolean): number[] {
  if (s.tip === 'A' && Math.abs(s.bulge) > 1e-12) {
    const { centru, raza, start, baleiaj } = cerculArcului(a, b, s.bulge);
    const d = L.v - (L.axa === 'x' ? centru.x : centru.y);
    if (!(Math.abs(d) < raza)) return [];
    const h = Math.sqrt(raza * raza - d * d);
    if (!(h > 1e-9 * Math.max(1, raza))) return [];
    const rez: number[] = [];
    for (const semn of [1, -1]) {
      const unghi = L.axa === 'x' ? Math.atan2(semn * h, d) : Math.atan2(d, semn * h);
      let rel = (baleiaj >= 0 ? unghi - start : start - unghi) % (2 * Math.PI);
      if (rel < 0) rel += 2 * Math.PI;
      const t = rel / Math.abs(baleiaj);
      if (!(t > 1e-12 && t < 1 - 1e-12)) continue;
      const q = punctPe(a, b, s, t);
      if ((peA && Math.hypot(q.x - a.x, q.y - a.y) <= eps(a)) || (peB && Math.hypot(q.x - b.x, q.y - b.y) <= eps(b))) continue;
      rez.push(t);
    }
    return rez.sort((u, w) => u - w);
  }
  if (s.tip === 'C') {
    const k = (p: Punct): number => (L.axa === 'x' ? p.x : p.y);
    const d0 = k(s.c1) - k(a), d1 = k(s.c2) - k(s.c1), d2 = k(b) - k(s.c2);
    const rupturi = [0, ...radacini2(d0 - 2 * d1 + d2, 2 * (d1 - d0), d0), 1];
    const f = (t: number): number => fata(L, punctPe(a, b, s, t));
    const rez: number[] = [];
    for (let i = 0; i + 1 < rupturi.length; i++) {
      let lo = rupturi[i] as number, hi = rupturi[i + 1] as number;
      let flo = lo === 0 ? (peA ? 0 : fata(L, a)) : f(lo);
      const fhi = hi === 1 ? (peB ? 0 : fata(L, b)) : f(hi);
      if (!((flo < 0 && fhi > 0) || (flo > 0 && fhi < 0))) continue;
      for (let it = 0; it < 200 && hi - lo > 1e-17; it++) {
        const m = (lo + hi) / 2;
        const fm = f(m);
        if (fm === 0) { lo = hi = m; break; }
        if ((fm < 0) === (flo < 0)) { lo = m; flo = fm; } else hi = m;
      }
      rez.push((lo + hi) / 2);
    }
    return rez;
  }
  if (peA || peB) return [];
  const fa = fata(L, a), fb = fata(L, b);
  return (fa < 0 && fb > 0) || (fa > 0 && fb < 0) ? [fa / (fa - fb)] : [];
}

/** Partea în care pleacă segmentul din capătul lui `capat` (0: începutul, 1: sfârșitul), sau 0 dacă stă tot pe linie. */
function parteLanga(L: Linie, a: Punct, b: Punct, s: Segment, capat: 0 | 1): number {
  const pasi = [1e-7, 1e-5, 1e-3, 0.1, 0.5, 1];
  for (const d of pasi) {
    const q = punctPe(a, b, s, capat === 0 ? d : 1 - d);
    const z = fata(L, q);
    if (Math.abs(z) > eps(q)) return Math.sign(z);
  }
  return 0;
}

/** Un loc de tăiere pe contur: segmentul `k`, la parametrul `t` (0: chiar vârful `k`). */
type Trecere = { readonly k: number; readonly t: number };

/** Trecerile conturului (în lume) prin linie, în ordinea drumului; `pe-linie` dacă o latură stă pe linie, iar forma o trece. */
function treceri(L: Linie, c: Contur): readonly Trecere[] | 'pe-linie' {
  const n = c.varfuri.length;
  const m = numarSegmente(c);
  if (n < 2 || m === 0) return [];
  const pe = c.varfuri.map((v) => Math.abs(fata(L, v.p)) <= eps(v.p));
  const segPe = (k: number): boolean => {
    const { a, b, s } = segment(c, k);
    if (!pe[k] || !pe[(k + 1) % n]) return false;
    if (s.tip === 'L') return true;
    if (s.tip === 'A') return Math.abs(s.bulge) <= 1e-12;
    void a; void b;
    return Math.abs(fata(L, s.c1)) <= eps(s.c1) && Math.abs(fata(L, s.c2)) <= eps(s.c2);
  };
  const rez: Trecere[] = [];
  // O formă care stă toată pe linie nu se taie (rămâne întreagă, de partea A).
  if (pe.every(Boolean) && Array.from({ length: m }, (_, k) => segPe(k)).every(Boolean)) return [];
  // Vârfurile pe linie, în șiruri legate de laturi care stau pe linie: trecerea e acolo unde partea se schimbă de o parte și de
  // alta a șirului; un șir cu o latură pe linie, cu forma de ambele părți, e o tăiere de-a lungul laturii.
  const vazut = new Array<boolean>(n).fill(false);
  for (let j = 0; j < n; j++) {
    if (!pe[j] || vazut[j]) continue;
    // Începutul șirului: înapoi, cât laturile stau pe linie.
    let j0 = j;
    if (c.inchis) {
      let pasi = 0;
      while (pasi < n && segPe((j0 - 1 + n) % n)) { j0 = (j0 - 1 + n) % n; pasi++; }
    } else {
      while (j0 > 0 && segPe(j0 - 1)) j0--;
    }
    let j1 = j0;
    let lungime = 1;
    vazut[j0] = true;
    while (lungime < n && (c.inchis || j1 < n - 1) && segPe(j1)) { j1 = (j1 + 1) % n; vazut[j1] = true; lungime++; }
    if (!c.inchis && (j0 === 0 || j1 === n - 1)) continue;
    const intra = segment(c, (j0 - 1 + n) % n);
    const iese = segment(c, j1);
    const inainte = parteLanga(L, intra.a, intra.b, intra.s, 1);
    const dupa = parteLanga(L, iese.a, iese.b, iese.s, 0);
    if (inainte === 0 || dupa === 0 || inainte === dupa) continue;
    if (lungime > 1) return 'pe-linie';
    rez.push({ k: j0, t: 0 });
  }
  for (let k = 0; k < m; k++) {
    if (segPe(k)) continue;
    const { a, b, s } = segment(c, k);
    for (const t of treceriSegment(L, a, b, s, pe[k] as boolean, pe[(k + 1) % n] as boolean)) rez.push({ k, t });
  }
  return rez.sort((u, w) => u.k - w.k || u.t - w.t);
}

/** Bucățile căii (în coordonatele elementului), tăiată la trecerile date, în ordinea drumului; fiecare, o cale deschisă. */
function bucatiCale(f: FormaCale, tr: readonly Trecere[]): FormaCale[] {
  // Întâi nodurile noi, de la ultimul spre primul (indicii celor dinainte rămân); pe același segment, partea de la început a
  // celui tăiat deja își rescalează parametrul.
  let c = f;
  for (let i = tr.length - 1; i >= 0; i--) {
    const x = tr[i] as Trecere;
    if (x.t === 0) continue;
    const urm = tr[i + 1];
    const t = urm && urm.k === x.k && urm.t > 0 ? x.t / urm.t : x.t;
    c = adaugaNod(c, x.k, t);
  }
  // Locul fiecărei treceri în calea cu nodurile noi.
  const locuri: number[] = [];
  let inserate = 0;
  for (const x of tr) {
    if (x.t === 0) locuri.push(x.k + inserate);
    else { inserate++; locuri.push(x.k + inserate); }
  }
  const v = c.varfuri;
  const bucata = (de: number, pana: number): FormaCale => {
    const lista: VarfDoc[] = [];
    for (let i = de; i <= pana; i++) lista.push(v[i % v.length] as VarfDoc);
    const ultim = lista[lista.length - 1] as VarfDoc;
    lista[lista.length - 1] = { ...ultim, s: LINIE_DOC() };
    return { ...f, inchis: false, varfuri: lista };
  };
  const rez: FormaCale[] = [];
  if (f.inchis) {
    for (let i = 0; i < locuri.length; i++) {
      const de = locuri[i] as number;
      const pana = i + 1 < locuri.length ? (locuri[i + 1] as number) : (locuri[0] as number) + v.length;
      rez.push(bucata(de, pana));
    }
  } else {
    let de = 0;
    for (const loc of locuri) { rez.push(bucata(de, loc)); de = loc; }
    rez.push(bucata(de, v.length - 1));
  }
  return rez;
}

/**
 * Bucățile unui cerc de rază r (centrul în originea elementului), tăiat la unghiurile date: fiecare, un singur arc; cercul
 * deschis într-un singur loc (închiderea cu cuțitul-formă) are două semicercuri, căci un arc de 360° n-are bulge.
 */
function bucatiCerc(raza: number, unghiuri: readonly number[]): FormaCale[] {
  const u = [...unghiuri].sort((a, b) => a - b);
  const punct = (x: number): Punct => ({ x: raza * Math.cos(x), y: raza * Math.sin(x) });
  return u.map((x, i) => {
    const urm = i + 1 < u.length ? (u[i + 1] as number) : (u[0] as number) + 2 * Math.PI;
    const p0 = punct(x), p1 = punct(u[(i + 1) % u.length] as number);
    const varfuri: VarfDoc[] = u.length === 1
      ? [{ p: p0, s: { tip: 'A', bulge: 1 } }, { p: punct(x + Math.PI), s: { tip: 'A', bulge: 1 } }]
      : [{ p: p0, s: { tip: 'A', bulge: Math.tan((urm - x) / 4) } }];
    return { tip: 'cale', inchis: false, varfuri: [...varfuri, { p: p1, s: LINIE_DOC() }] };
  });
}

/**
 * Bucățile elementului (în coordonatele lui), tăiat în pozițiile date ale conturului lui în lume (sortate), în ordinea
 * drumului. Cercul se taie pe cercul lui: conturul lui are două semicercuri, din unghiul 0, deci locul (k, t) e chiar unghiul
 * π·(k + t) al elementului (o similitudine păstrează fracțiunea arcului; oglinda nu schimbă ordinea).
 */
function bucatiElement(e: ElementLume, tr: readonly Trecere[]): FormaCale[] {
  const nod = e.forma;
  return nod.tip === 'cerc' ? bucatiCerc(nod.raza, tr.map((x) => Math.PI * (x.k + x.t))) : bucatiCale(caleDinForma(nod), tr);
}

/** O bucată tăiată: calea ei, în coordonatele elementului, cu de unde vine și unde e. */
type Bucata = {
  readonly forma: FormaCale;
  /** Elementul din care vine (lumea și piesa). */
  readonly sursa: ElementLume;
  readonly matriceRel: Matrice;
  readonly lume: Contur;
  readonly parte: -1 | 1;
  /** Trecerile de la capete (indici în lista trecerilor instanței), doar pe un contur închis. */
  readonly de: number;
  readonly pana: number;
  /** Doar pe un contur închis: exteriorul formei e în dreapta sensului de mers (forma e trigonometrică). */
  readonly exteriorDreapta: boolean | null;
};

/** Partea unui contur (în lume), din primul punct care nu stă pe linie: −1 sau 1; un contur tot pe linie e de partea A (−1). */
function parteContur(L: Linie, c: Contur): number {
  for (let k = 0; k < numarSegmente(c); k++) {
    const { a, b, s } = segment(c, k);
    for (const t of [0.5, 0.25, 0.75, 0]) {
      const q = punctPe(a, b, s, t);
      const z = fata(L, q);
      if (Math.abs(z) > eps(q)) return Math.sign(z);
    }
  }
  return -1;
}

const aceeasiMatrice = (m: Matrice, n: Matrice): boolean => m.a === n.a && m.b === n.b && m.c === n.c && m.d === n.d && m.e === n.e && m.f === n.f;

function inDocument(c: Contur): VarfDoc[] {
  return c.varfuri.map((v): VarfDoc => ({
    p: { x: v.p.x, y: v.p.y },
    s: v.s.tip === 'A' ? { tip: 'A', bulge: v.s.bulge } : v.s.tip === 'C' ? { tip: 'C', c1: { x: v.s.c1.x, y: v.s.c1.y }, c2: { x: v.s.c2.x, y: v.s.c2.y } } : { tip: 'L' },
  }));
}

/** Calea ca contur (pentru inversare și transformare), fără câmpurile necunoscute. */
const caContur = (f: FormaCale): Contur => conturElement({ forma: f, matrice: IDENTITATE });

/** Un element nou al unei părți: forma, matricea față de rădăcina piesei, elementele din care vine și felul lui. */
type ElementNou = {
  readonly forma: FormaDoc;
  readonly matrice: Matrice;
  readonly surse: readonly ElementLume[];
  readonly fel: 'intreg' | 'inchis' | 'deschis';
  readonly exteriorDreapta: boolean | null;
  /** Elementul vechi, la o formă netăiată (își păstrează id-ul și câmpurile). */
  readonly vechi?: ElementNod;
  /**
   * O buclă a cuțitului care stă în altă adâncime decât conturul din care își ia operațiile (un gol al plăcii, din conturul ei
   * exterior): pe o piesă fără rol, profilul ei trece de pe exterior pe interior și invers.
   */
  readonly inversLatura?: boolean;
};

/**
 * Ciclurile unei părți (închiderea): fiecare trecere are pe partea asta o singură bucată și o singură coardă; drumul merge pe
 * bucată, sare pe coardă la perechea trecerii, apoi pe bucata de acolo (întoarsă, dacă acolo se termină), până la început.
 */
function cicluri(bucati: readonly Bucata[], pereche: ReadonlyMap<number, number>): ElementNou[] | null {
  const peTrecere = new Map<number, number>();
  for (let i = 0; i < bucati.length; i++) {
    const b = bucati[i] as Bucata;
    for (const x of [b.de, b.pana]) {
      if (peTrecere.has(x)) return null;
      peTrecere.set(x, i);
    }
  }
  const vazute = new Set<number>();
  const rez: ElementNou[] = [];
  for (let i0 = 0; i0 < bucati.length; i0++) {
    if (vazute.has(i0)) continue;
    const drum: Array<{ readonly b: Bucata; readonly intoarsa: boolean }> = [];
    let i = i0, intoarsa = false;
    for (let pas = 0; pas <= bucati.length; pas++) {
      if (vazute.has(i)) break;
      vazute.add(i);
      const b = bucati[i] as Bucata;
      drum.push({ b, intoarsa });
      const capat = intoarsa ? b.de : b.pana;
      const alta = pereche.get(capat);
      if (alta === undefined) return null;
      const j = peTrecere.get(alta);
      if (j === undefined) return null;
      i = j;
      intoarsa = (bucati[j] as Bucata).pana === alta;
    }
    if (i !== i0 || drum.length === 0) return null;
    const prima = drum[0] as { readonly b: Bucata };
    const toateLaFel = drum.every((x) => aceeasiMatrice(x.b.matriceRel, prima.b.matriceRel));
    const varfuri: VarfDoc[] = [];
    for (const { b, intoarsa: inv } of drum) {
      let parte: VarfDoc[];
      if (toateLaFel && !inv) parte = b.forma.varfuri.map((v) => v);
      else {
        let c = caContur(b.forma);
        if (inv) c = inverseaza(c);
        if (!toateLaFel) c = transformaContur(c, b.matriceRel);
        parte = inDocument(c);
      }
      const ultim = parte[parte.length - 1] as VarfDoc;
      parte[parte.length - 1] = { ...ultim, s: LINIE_DOC() };
      varfuri.push(...parte);
    }
    const surse = [...new Map(drum.map((x) => [x.b.sursa.nod, x.b.sursa])).values()];
    rez.push({
      forma: { tip: 'cale', inchis: true, varfuri },
      matrice: toateLaFel ? prima.b.matriceRel : IDENTITATE,
      surse, fel: 'inchis', exteriorDreapta: null,
    });
  }
  return rez;
}

type Parte = { readonly elemente: ElementNou[] };

/** Operațiile unei părți (răspunsul 3a), sau `operatii` dacă o formă închisă unită are operații diferite pe o piesă fără rol. */
function operatiiParte(p: Piesa, radacina: Nod, elemente: ReadonlyArray<{ readonly id: string; readonly e: ElementNou }>): { readonly operatii: Operatie[]; readonly scoase: number } | 'operatii' {
  const rol = rolPiesei(p);
  if (rol !== null) {
    const g = grupeRol({ ...p, radacina, operatii: [] }, rol);
    if (g && g.length > 0) {
      const ops = g.map((x): Operatie => {
        const baza = p.operatii.find((o) => o.tip === x.tip && (o.tip !== 'profil' || o.latura === x.latura)) ?? (p.operatii[0] as Operatie);
        return { ...structuredClone(baza), id: x.id, tip: x.tip, latura: x.latura, noduri: [...x.noduri] };
      });
      const singura = p.operatii.length === 1 ? p.operatii[0] : undefined;
      if (ops.length === 1 && singura) ops[0] = { ...(ops[0] as Operatie), id: singura.id };
      return { operatii: ops, scoase: 0 };
    }
  }
  const noi = new Map<string, Operatie>();
  let scoase = 0;
  for (const o of p.operatii) {
    for (const { id, e } of elemente) {
      const ids = e.surse.map((s) => s.nod);
      if (!ids.some((s) => o.noduri.includes(s))) continue;
      if (e.fel === 'inchis' && ids.length > 1 && !ids.every((s) => o.noduri.includes(s))) return 'operatii';
      let latura = o.latura;
      if (e.inversLatura && (latura === 'exterior' || latura === 'interior')) latura = latura === 'exterior' ? 'interior' : 'exterior';
      if (e.fel === 'deschis' && e.exteriorDreapta !== null) {
        if (o.tip !== 'profil') { scoase++; continue; }
        if (latura === 'exterior' || latura === 'interior') latura = (latura === 'exterior') === e.exteriorDreapta ? 'dreapta' : 'stanga';
      } else if (e.fel === 'deschis' && o.tip !== 'profil') {
        scoase++;
        continue;
      } else if (e.fel === 'inchis' && o.tip === 'gaurire') {
        scoase++;
        continue;
      }
      const cheie = `${o.id}\u0000${latura}`;
      let x = noi.get(cheie);
      if (!x) {
        x = { ...structuredClone(o), latura, noduri: [] };
        noi.set(cheie, x);
      }
      if (!x.noduri.includes(id)) x.noduri.push(id);
    }
  }
  // Id-urile operațiilor rămân unice: a doua latură a aceleiași operații primește un sufix.
  const folosite = new Set<string>();
  const ops: Operatie[] = [];
  for (const o of noi.values()) {
    let id = o.id;
    for (let n = 2; folosite.has(id); n++) id = `${o.id.slice(0, 56)}-${n}`;
    folosite.add(id);
    ops.push({ ...o, id });
  }
  return { operatii: ops, scoase };
}

/** Ce se taie: linia cerută, sau motivul pentru care nu există. */
function linia(doc: Document, c: CutitLinie, indexFoaie: number): Linie | MotivTaiere {
  if (c.fel === 'ghidaj') {
    const g = doc.foi[indexFoaie]?.ghidaje?.find((x) => x.id === c.id);
    if (!g) return 'ghidaj';
    return Number.isFinite(g.poz) ? { axa: g.axa, v: g.poz } : 'valoare';
  }
  const v = c.fel === 'x' ? c.x : c.y;
  return Number.isFinite(v) ? { axa: c.fel, v } : 'valoare';
}

/** O instanță tăiată: părțile care îi iau locul și câte contururi s-au tăiat. */
type Rezultat = { readonly parti: readonly Parte[]; readonly taiate: number };
/** O instanță care pleacă (decuparea). */
type Stearsa = { readonly sterge: true };

/**
 * Tăierea instanțelor alese, pe foaia de lucru (ADR 0180 §3, §5, §6). Cu o linie dreaptă, fiecare instanță prin care trece
 * linia devine două: partea A (stânga liniei verticale, dedesubtul celei orizontale) și partea B; cu un cuțit închis, ce e
 * înăuntrul lui și ce e în afară; cu unul deschis și la intersecții, fiecare bucată (sau față) e o parte, iar contururile
 * netăiate rămân împreună. Fiecare parte are piesa ei, la locul instanței vechi; o instanță netăiată rămâne cum e.
 */
export function taie(doc: Document, cerere: CerereTaiere, indexFoaie = 0): RezultatTaiere {
  const foaie = doc.foi[indexFoaie];
  if (!foaie || cerere.alese.length === 0) return { ok: false, motiv: 'nimic-ales' };
  const alese = new Set(cerere.alese);
  const c = cerere.cutit;
  let taieUna: (inst: Instanta, p: Piesa) => Rezultat | Stearsa | MotivTaiere | null;
  if (c.fel === 'forma' || c.fel === 'forme' || c.fel === 'cale') {
    // Cuțitul rămâne neschimbat: nu e printre formele de tăiat (cel tras pe pânză nici nu e în document).
    const ids = c.fel === 'forma' ? [c.id] : c.fel === 'forme' ? c.ids : [];
    for (const id of ids) alese.delete(id);
    if (alese.size === 0) return { ok: false, motiv: 'nimic-ales' };
    const K = c.fel === 'cale' ? cutitulCale(c) : cutitul(doc, indexFoaie, ids);
    if (typeof K === 'string') return { ok: false, motiv: K };
    taieUna = (inst, p) => taieCuForma(K, inst, p, cerere.inchide);
  } else if (c.fel === 'decupare') {
    // Granița rămâne neschimbată și trebuie să fie închisă.
    alese.delete(c.id);
    if (alese.size === 0) return { ok: false, motiv: 'nimic-ales' };
    const K = cutitul(doc, indexFoaie, [c.id]);
    if (typeof K === 'string') return { ok: false, motiv: K };
    if (!K.inchis) return { ok: false, motiv: 'granita' };
    taieUna = (inst, p) => decupeazaInstanta(K, inst, p, c, cerere.inchide);
  } else if (c.fel === 'intersectii') {
    const loc = locuriIntersectii(doc, indexFoaie, alese);
    if (typeof loc === 'string') return { ok: false, motiv: loc };
    taieUna = (inst, p) => taieLaLocuri(inst, p, loc, false);
  } else if (c.fel === 'foarfeca') {
    // Doar forma de sub clic se schimbă.
    taieUna = (inst, p) => (inst.id === c.id ? foarfeca(inst, p, c) : null);
    alese.add(c.id);
  } else if (c.fel === 'reteaza') {
    // Locurile comune sunt cu formele alese (fără alegere, toate ale foii, din interfață); forma de sub clic, oricum.
    alese.add(c.id);
    taieUna = (inst, p) => (inst.id === c.id ? reteaza(doc, indexFoaie, alese, inst, p, c) : null);
  } else {
    const L = linia(doc, c, indexFoaie);
    if (typeof L === 'string') return { ok: false, motiv: L };
    taieUna = (inst, p) => taieInstanta(L, inst, p, cerere.inchide);
  }
  const piese = new Map(doc.piese.map((p) => [p.id, p]));
  const folosiri = new Map<string, number>();
  const ocupate = new Set<string>(piese.keys());
  for (const f of doc.foi) {
    for (const i of f.instante) {
      folosiri.set(i.piesa, (folosiri.get(i.piesa) ?? 0) + 1);
      ocupate.add(i.id);
    }
  }
  let n = doc.piese.length + 1;
  const idLiber = (): string => {
    while (ocupate.has(`e${n}`)) n++;
    const id = `e${n}`;
    ocupate.add(id);
    return id;
  };

  const degrupate: Degrupata[] = [];
  const ids: string[] = [];
  const sterse: string[] = [];
  let forme = 0;
  let scoase = 0;
  for (const inst of foaie.instante) {
    if (!alese.has(inst.id)) continue;
    const p = piese.get(inst.piesa);
    if (!p) continue;
    const r = taieUna(inst, p);
    if (r === null) continue;
    if (typeof r === 'string') return { ok: false, motiv: r };
    if ('sterge' in r) { sterse.push(inst.id); continue; }
    if ((folosiri.get(p.id) ?? 0) > 1) return { ok: false, motiv: 'impartita' };
    const parti: Array<{ readonly instanta: Instanta; readonly piesa: Piesa }> = [];
    for (const parte of r.parti) {
      const id = idLiber();
      const piesa = construiestePiesa(p, parte, id);
      if (piesa === 'operatii') return { ok: false, motiv: 'operatii' };
      scoase += piesa.scoase;
      parti.push({ instanta: { ...structuredClone(inst), id, piesa: id }, piesa: piesa.piesa });
      ids.push(id);
    }
    forme += r.taiate;
    degrupate.push({ instanta: inst, piesa: p, parti });
  }
  if (degrupate.length === 0 && sterse.length === 0) return { ok: false, motiv: 'nimic-taiat' };
  return { ok: true, degrupate, ids, forme, scoase, sterse };
}

/** O instanță tăiată în cele două părți ale ei, sau null dacă linia nu trece prin ea, sau motivul unui refuz. */
function taieInstanta(L: Linie, inst: Instanta, p: Piesa, inchide: boolean): Rezultat | MotivTaiere | null {
  const lume = elementeInstanta(p.radacina, inst, matriceInstanta(inst));
  const rel = elementeInstanta(p.radacina, inst, IDENTITATE);
  const vechi = elementeArbore(p.radacina);
  const pePart = new Map<number, ElementNou[]>([[-1, []], [1, []]]);
  const bucatiInchise: Bucata[] = [];
  const pozitii: number[] = [];
  let taiate = 0;
  for (let i = 0; i < lume.length; i++) {
    const e = lume[i] as ElementLume, er = rel[i] as ElementLume;
    const nod = e.forma;
    const w = conturElement(e);
    const tr = treceri(L, w);
    if (tr === 'pe-linie') return 'pe-linie';
    const v = vechi.get(e.nod);
    if (tr.length === 0) {
      const parte = parteContur(L, w);
      (pePart.get(parte < 0 ? -1 : 1) as ElementNou[]).push({ forma: nod, matrice: er.matrice, surse: [e], fel: 'intreg', exteriorDreapta: null, ...(v ? { vechi: v } : {}) });
      continue;
    }
    if (w.inchis && tr.length % 2 === 1) return 'nereusita';
    taiate++;
    const bucati = bucatiElement(e, tr);
    const trig = w.inchis ? arieCuSemn(w) > 0 : null;
    const baza = pozitii.length;
    for (let j = 0; j < bucati.length; j++) {
      const f = bucati[j] as FormaCale;
      const bl = conturElement({ forma: f, matrice: e.matrice });
      const parte: -1 | 1 = parteContur(L, bl) < 0 ? -1 : 1;
      if (w.inchis) {
        const start = bl.varfuri[0]?.p;
        if (!start) return 'nereusita';
        pozitii.push(dealungul(L, start));
        const b: Bucata = {
          forma: f, sursa: e, matriceRel: er.matrice, lume: bl, parte, de: baza + j, pana: baza + ((j + 1) % bucati.length), exteriorDreapta: trig,
        };
        if (inchide) bucatiInchise.push(b);
        else (pePart.get(parte) as ElementNou[]).push({ forma: f, matrice: er.matrice, surse: [e], fel: 'deschis', exteriorDreapta: trig, ...(v ? { vechi: v } : {}) });
      } else {
        (pePart.get(parte) as ElementNou[]).push({ forma: f, matrice: er.matrice, surse: [e], fel: 'deschis', exteriorDreapta: null, ...(v ? { vechi: v } : {}) });
      }
    }
  }
  if (taiate === 0) return null;
  if (inchide && bucatiInchise.length > 0) {
    // Corzile: trecerile tuturor contururilor închise, de-a lungul liniei, împerecheate 1–2, 3–4… (regiunea par-impar).
    const ordine = pozitii.map((_, k) => k).sort((u, w) => (pozitii[u] as number) - (pozitii[w] as number));
    if (ordine.length % 2 === 1) return 'nereusita';
    for (let k = 1; k < ordine.length; k++) {
      if ((pozitii[ordine[k] as number] as number) - (pozitii[ordine[k - 1] as number] as number) <= 1e-9) return 'nereusita';
    }
    const pereche = new Map<number, number>();
    for (let k = 0; k + 1 < ordine.length; k += 2) {
      const u = ordine[k] as number, w = ordine[k + 1] as number;
      pereche.set(u, w);
      pereche.set(w, u);
    }
    for (const parte of [-1, 1] as const) {
      const c = cicluri(bucatiInchise.filter((b) => b.parte === parte), pereche);
      if (c === null) return 'nereusita';
      (pePart.get(parte) as ElementNou[]).push(...c);
    }
  }
  const parti = [-1, 1].map((x) => ({ elemente: pePart.get(x) as ElementNou[] })).filter((x) => x.elemente.length > 0);
  return parti.length === 0 ? null : { parti, taiate };
}

/** Elementele arborelui piesei, după id (o singură trecere: o piesă importată are mii de contururi). */
function elementeArbore(radacina: Nod): Map<string, ElementNod> {
  const rez = new Map<string, ElementNod>();
  const stiva: Nod[] = [radacina];
  for (let x = stiva.pop(); x; x = stiva.pop()) {
    if (x.tip === 'element') rez.set(x.id, x); else stiva.push(...x.copii);
  }
  return rez;
}

/**
 * Piesa unei părți: elementele ei (cele netăiate cu id-ul și câmpurile lor; cele noi cu id-ul formei din care vin, dacă e
 * liber în parte, altfel `t<n>`), sub un grup nou fără transformare, sau singurul element ca rădăcină; câmpurile piesei vechi
 * (numele, cele necunoscute) rămân; operațiile, după rol.
 */
function construiestePiesa(p: Piesa, parte: Parte, id: string): { readonly piesa: Piesa; readonly scoase: number } | 'operatii' {
  const folosite = new Set<string>();
  for (const e of parte.elemente) if (e.fel === 'intreg' && e.vechi) folosite.add(e.vechi.id);
  let n = 1;
  const liber = (dorit: string | undefined): string => {
    if (dorit !== undefined && !folosite.has(dorit)) { folosite.add(dorit); return dorit; }
    while (folosite.has(`t${n}`)) n++;
    const x = `t${n}`;
    folosite.add(x);
    return x;
  };
  const elemente = parte.elemente.map((e) => {
    const sursa = e.vechi;
    const { id: _id, forma: _forma, matrice: _matrice, ...campuri } = sursa ?? { id: '', forma: e.forma, matrice: e.matrice };
    void _id; void _forma; void _matrice;
    const idNou = e.fel === 'intreg' && sursa ? sursa.id : liber(e.surse[0]?.nod);
    const nod: ElementNod = { ...structuredClone(campuri), tip: 'element', id: idNou, forma: e.forma, matrice: e.matrice };
    return { id: idNou, e, nod };
  });
  let radacina: Nod;
  if (elemente.length === 1) radacina = (elemente[0] as { readonly nod: ElementNod }).nod;
  else {
    const r = p.radacina;
    const idGrup = liber(r.tip === 'grup' ? r.id : undefined);
    radacina = { tip: 'grup', id: idGrup, ...(r.nume !== undefined ? { nume: r.nume } : {}), matrice: { ...IDENTITATE }, copii: elemente.map((x) => x.nod) };
  }
  const ops = operatiiParte(p, radacina, elemente);
  if (ops === 'operatii') return 'operatii';
  const { id: _id, radacina: _r, operatii: _o, ...rest } = p;
  void _id; void _r; void _o;
  return { piesa: { ...structuredClone(rest), id, radacina, operatii: ops.operatii }, scoase: ops.scoase };
}

// ——— Locurile comune a două contururi (felia 10.3↑b) ———

/** Un contur în lume, cu cel pentru cavalier (cubicele ca biarce) și segmentul original al fiecărui segment al lui. */
type Cav = { readonly c: Contur; readonly lucru: Contur; readonly orig: readonly number[]; readonly cutie: Cutie };

function laCavalier(c: Contur): Cav | null | 'esuat' {
  const orig: number[] = [];
  const lucru = pentruCavalier(c, orig);
  return lucru === null || lucru === 'esuat' ? lucru : { c, lucru, orig, cutie: cutieContur(c) };
}

const seAting = (a: Cutie, b: Cutie): boolean => a.minX <= b.maxX + 1e-6 && b.minX <= a.maxX + 1e-6 && a.minY <= b.maxY + 1e-6 && b.minY <= a.maxY + 1e-6;
const departe = (p: Punct, q: Punct): number => Math.hypot(p.x - q.x, p.y - q.y);
const compara = (u: Trecere, w: Trecere): number => u.k - w.k || u.t - w.t;

/** Punctul conturului la poziția dată. */
function punctLa(c: Contur, x: Trecere): Punct {
  if (x.t === 0) return (c.varfuri[x.k] as Varf).p;
  const { a, b, s } = segment(c, x.k);
  return punctPe(a, b, s, x.t);
}

/** Poziția (k, t), cu un loc la sub `eps` de capătul segmentului scris chiar ca vârful acela (t = 0). */
function pozitie(c: Contur, k: number, t: number): Trecere {
  const g = segment(c, k);
  const P = punctPe(g.a, g.b, g.s, t);
  if (t <= 0 || departe(P, g.a) <= eps(P)) return { k, t: 0 };
  if (t >= 1 || departe(P, g.b) <= eps(P)) return { k: (k + 1) % c.varfuri.length, t: 0 };
  return { k, t };
}

/** Parametrul segmentului k cel mai aproape de X, la cel mult cât se abate cavalier de segment (biarcele cubicei), sau null. */
function parametrulLa(c: Contur, k: number, X: Punct): number | null {
  const g = segment(c, k);
  return langa(g, X, g.s.tip === 'C' ? 0.005 : 1e-6 + 1e-9 * Math.max(Math.abs(X.x), Math.abs(X.y)))[0] ?? null;
}

/** Segmentul k și vecinii lui: un loc spus de cavalier la capătul unui segment poate fi pe cel de alături. */
function vecini(c: Contur, k: number): number[] {
  const m = numarSegmente(c);
  const rez = [k];
  for (const j of [k - 1, k + 1]) {
    const x = c.inchis ? (j + m) % m : j;
    if (x >= 0 && x < m && !rez.includes(x)) rez.push(x);
  }
  return rez;
}

/** Un loc comun: pozițiile lui pe cele două contururi și punctul (pe primul). */
type Intalnire = { readonly a: Trecere; readonly b: Trecere; readonly p: Punct };

/** Locul comun X al segmentelor ka (din A) și kb (din B), rafinat cu Newton pe segmentele adevărate. */
function rafinat(A: Contur, ka: number, B: Contur, kb: number, X: Punct): Intalnire | null {
  let best: Intalnire | null = null;
  let bestD = Infinity;
  for (const ia of vecini(A, ka)) {
    for (const ib of vecini(B, kb)) {
      // Vecinii, doar dacă perechea spusă de cavalier nu ajunge la loc (un loc chiar la capătul segmentului).
      if ((ia !== ka || ib !== kb) && bestD <= 1e-9) continue;
      const s0 = parametrulLa(A, ia, X), t0 = parametrulLa(B, ib, X);
      if (s0 === null || t0 === null) continue;
      const ga = segment(A, ia), gb = segment(B, ib);
      const [s, t] = rafineaza(ga, gb, s0, t0);
      const P = punctPe(ga.a, ga.b, ga.s, s);
      const d = departe(P, punctPe(gb.a, gb.b, gb.s, t));
      if (d < bestD) {
        bestD = d;
        best = { a: pozitie(A, ia, s), b: pozitie(B, ib, t), p: P };
      }
    }
  }
  return best;
}

/** Locurile comune ale lui A și B: punctele (rafinate) și capetele suprapunerilor (fără îmbinările bucăților uneia). */
function intalniri(A: Cav, B: Cav): { readonly puncte: Intalnire[]; readonly suprapuse: boolean } {
  const puncte: Intalnire[] = [];
  const adauga = (x: Intalnire | null): void => {
    if (x && puncte.every((y) => departe(y.p, x.p) > eps(x.p))) puncte.push(x);
  };
  const capete: Array<{ readonly p: Punct; readonly ka: number; readonly kb: number }> = [];
  for (const x of intersectiiIntre(A.lucru, B.lucru)) {
    const ka = A.orig[x.i] ?? x.i, kb = B.orig[x.j] ?? x.j;
    if (x.puncte.length === 1) adauga(rafinat(A.c, ka, B.c, kb, x.puncte[0]));
    else for (const p of x.puncte) capete.push({ p, ka, kb });
  }
  for (const c of capete) {
    if (capete.some((d) => d !== c && departe(d.p, c.p) <= 1e-6)) continue;
    const s = parametrulLa(A.c, c.ka, c.p), t = parametrulLa(B.c, c.kb, c.p);
    if (s !== null && t !== null) adauga({ a: pozitie(A.c, c.ka, s), b: pozitie(B.c, c.kb, t), p: c.p });
  }
  return { puncte, suprapuse: capete.length > 0 };
}

/**
 * Locurile de tăiere ale conturului, în ordinea lui, fără dubluri (același punct, la `eps`); pe o cale deschisă, fără capete
 * (acolo nu e nimic de tăiat).
 */
function farDubluri<T>(c: Contur, xs: readonly T[], poz: (x: T) => Trecere): T[] {
  const n = c.varfuri.length;
  const rez: T[] = [];
  for (const x of [...xs].sort((u, w) => compara(poz(u), poz(w)))) {
    const q = poz(x);
    if (!c.inchis && q.t === 0 && (q.k === 0 || q.k === n - 1)) continue;
    const u = rez[rez.length - 1];
    const p = punctLa(c, q);
    if (u !== undefined && departe(punctLa(c, poz(u)), p) <= eps(p)) continue;
    rez.push(x);
  }
  const prim = rez[0], ultim = rez[rez.length - 1];
  if (c.inchis && rez.length > 1 && prim !== undefined && ultim !== undefined) {
    const p = punctLa(c, poz(prim));
    if (departe(punctLa(c, poz(ultim)), p) <= eps(p)) rez.pop();
  }
  return rez;
}

/** Un punct din mijlocul bucății conturului dintre λ1 < λ2 (λ = k + t; pe un contur închis, λ2 poate trece de capăt). */
function mijlocBucata(c: Contur, l1: number, l2: number): Punct {
  const m = numarSegmente(c);
  if (m === 0) return (c.varfuri[0] as Varf).p;
  const k0 = Math.floor(l1);
  let best = punctLa(c, { k: k0 % m, t: l1 - k0 });
  let lung = -1;
  for (let k = k0; k < l2 && k <= k0 + m; k++) {
    const ta = Math.max(l1 - k, 0), tb = Math.min(l2 - k, 1);
    if (!(tb > ta)) continue;
    const g = segment(c, k % m);
    const d = departe(punctPe(g.a, g.b, g.s, ta), punctPe(g.a, g.b, g.s, tb));
    if (d > lung) {
      lung = d;
      best = punctPe(g.a, g.b, g.s, (ta + tb) / 2);
    }
  }
  return best;
}

/** Câteva puncte ale conturului, departe de capete: întâi mijlocul lui, apoi mijloacele unor segmente. */
function puncteProba(c: Contur): Punct[] {
  const m = numarSegmente(c);
  if (m === 0) return c.varfuri.map((v) => v.p);
  return [mijlocBucata(c, 0, m), ...[0, Math.floor(m / 2), m - 1].map((k) => punctLa(c, { k, t: 0.5 }))];
}

/** Direcțiile în care pleacă conturul din poziția x (înainte și înapoi; capătul unei căi deschise are una). */
function raze(c: Contur, x: Trecere): Punct[] {
  const P = punctLa(c, x);
  const m = numarSegmente(c), n = c.varfuri.length;
  const spre = (k: number, t: number): Punct => {
    const g = segment(c, k);
    const q = punctPe(g.a, g.b, g.s, t);
    return { x: q.x - P.x, y: q.y - P.y };
  };
  if (x.t > 0) return [spre(x.k, x.t + (1 - x.t) * 1e-6), spre(x.k, x.t * (1 - 1e-6))];
  const rez: Punct[] = [];
  if (x.k < m) rez.push(spre(x.k, 1e-6));
  const prev = c.inchis ? (x.k - 1 + n) % n : x.k - 1;
  if (prev >= 0 && prev < m) rez.push(spre(prev, 1 - 1e-6));
  return rez;
}

/** Sunt direcțiile s, strict, de o parte și de alta a drumului k (cele două direcții ale lui din loc)? */
function deOParteSiDeAlta(k: readonly Punct[], s: readonly Punct[]): boolean {
  const [k1, k2] = k, [s1, s2] = s;
  if (!k1 || !k2 || !s1 || !s2) return false;
  const doi = 2 * Math.PI;
  const mod = (a: number): number => ((a % doi) + doi) % doi;
  const a0 = Math.atan2(k1.y, k1.x), deschidere = mod(Math.atan2(k2.y, k2.x) - a0);
  const sector = (v: Punct): number => {
    const d = mod(Math.atan2(v.y, v.x) - a0);
    if (d < 1e-9 || d > doi - 1e-9 || Math.abs(d - deschidere) < 1e-9) return 0;
    return d < deschidere ? 1 : 2;
  };
  const x = sector(s1), y = sector(s2);
  return x !== 0 && y !== 0 && x !== y;
}

// ——— Cuțitul-formă (ADR 0180 §3, §6) ———

/** Cuțitul: contururile lui în lume, gata de cavalier, și locurile în care se taie singur (sau contururile lui între ele). */
type Cutitul = {
  readonly contururi: readonly Cav[];
  /**
   * Elementul din care vine fiecare contur (un cuțit-formă), sau null (calea trasă pe pânză): o buclă care stă toată într-o
   * formă îi păstrează forma (un cerc rămâne cerc).
   */
  readonly surse: readonly (ElementLume | null)[];
  /** Toate contururile închise: părțile sunt ce e înăuntrul lui (regiunea par-impar) și ce e în afară. */
  readonly inchis: boolean;
  readonly proprii: readonly Punct[];
  readonly cutie: Cutie;
};

/** Cuțitul din contururile date, în lume: cele care nu se pot tăia (un punct, o linie de lungime zero) nu contează. */
function cutitulDin(xs: ReadonlyArray<{ readonly c: Contur; readonly e: ElementLume | null }>): Cutitul | MotivTaiere {
  const contururi: Cav[] = [];
  const surse: Array<ElementLume | null> = [];
  for (const x of xs) {
    let c: Cav | null | 'esuat';
    try {
      c = laCavalier(x.c);
    } catch {
      return 'nereusita';
    }
    if (c === 'esuat') return 'nereusita';
    if (c) {
      contururi.push(c);
      surse.push(x.e);
    }
  }
  if (contururi.length === 0) return 'nimic-taiat';
  const proprii: Punct[] = [];
  contururi.forEach((a, i) => {
    for (const x of autointersectii(a.lucru)) proprii.push(...x.puncte);
    for (const b of contururi.slice(i + 1)) for (const x of intersectiiIntre(a.lucru, b.lucru)) proprii.push(...x.puncte);
  });
  return { contururi, surse, inchis: contururi.every((c) => c.c.inchis), proprii, cutie: contururi.reduce((u, c) => uneste(u, c.cutie), CUTIE_GOALA) };
}

/** Cuțitul-formă: toate contururile instanțelor date, împreună (ultima formă aleasă; felul Formă, cu una sau mai multe). */
function cutitul(doc: Document, indexFoaie: number, ids: readonly string[]): Cutitul | MotivTaiere {
  const xs: Array<{ readonly c: Contur; readonly e: ElementLume }> = [];
  for (const id of ids) {
    const inst = doc.foi[indexFoaie]?.instante.find((i) => i.id === id);
    const p = inst ? doc.piese.find((x) => x.id === inst.piesa) : undefined;
    if (!inst || !p) return 'nimic-ales';
    for (const e of elementeInstanta(p.radacina, inst, matriceInstanta(inst))) {
      try {
        xs.push({ c: conturElement(e), e });
      } catch {
        return 'nereusita';
      }
    }
  }
  return cutitulDin(xs);
}

/** Cuțitul tras pe pânză (ADR 0181 §1), netezit întâi dacă vine din mâna liberă. */
function cutitulCale(c: Extract<Cutit, { readonly fel: 'cale' }>): Cutitul | MotivTaiere {
  let f = c.cale;
  if (c.netezire !== undefined) {
    if (!(c.netezire > 0) || !Number.isFinite(c.netezire)) return 'valoare';
    // Colțurile ascuțite rămân, liniile oricât de lungi devin curbe (fără „Păstrează liniile mai lungi de”).
    const v = netezesteCale(f, IDENTITATE, c.netezire, Infinity, { abatere: 0, curbe: 0, linii: 0 });
    if (v) f = { ...f, varfuri: v };
  }
  let k: Contur;
  try {
    k = caContur(f);
  } catch {
    return 'nereusita';
  }
  return cutitulDin([{ c: k, e: null }]);
}

/** Un loc comun al conturului `el` al piesei cu conturul `kc` al cuțitului (`x.a` pe formă, `x.b` pe cuțit). */
type Loc = { readonly el: number; readonly kc: number; readonly x: Intalnire };

/** O bucată a unui contur închis, între două locuri de tăiere, cu sensul în care are regiunea în stânga (`invers`). */
type PiesaFata = { readonly f: FormaCale; readonly e: ElementLume; readonly er: ElementLume; readonly de: number; readonly pana: number; readonly invers: boolean };
/** O coardă: bucata cuțitului dintr-o regiune (în lume), între două locuri de tăiere. */
type Coarda = { readonly f: FormaCale; readonly de: number; readonly pana: number };
type PasFata = { readonly b: PiesaFata; readonly c: Coarda; readonly inapoi: boolean };

/**
 * Conturul unei fețe: bucățile (cu regiunea în stânga) și corzile dintre ele, în coordonatele elementului dacă toate
 * bucățile au aceeași matrice, altfel ale piesei (`mi`: matricea instanței), cu aria lui cu semn, în lume. Capătul fiecărei
 * corzi ia vârful bucății (vârfurile formei rămân la bit). Aria e pozitivă la o față; negativă la marginea dinăuntru a unei
 * regiuni (corzile închid o buclă în jurul unei găuri: gaura și ce e între coardă și ea ies din regiune). Null: arie nulă.
 */
function fataDin(drum: readonly PasFata[], mi: Matrice): { readonly e: ElementNou; readonly arie: number } | null {
  const prima = (drum[0] as PasFata).b;
  const aceeasi = drum.every((x) => aceeasiMatrice(x.b.er.matrice, prima.er.matrice));
  for (const inElement of aceeasi ? [true, false] : [false]) {
    try {
      const lume = inElement ? prima.e.matrice : mi;
      const inv = inversa(lume);
      if (!inv) continue;
      const varfuri: VarfDoc[] = [];
      for (const { b, c, inapoi } of drum) {
        let cb = caContur(b.f);
        if (b.invers) cb = inverseaza(cb);
        const vb = inDocument(inElement ? cb : transformaContur(cb, b.er.matrice));
        varfuri.push(...vb.slice(0, -1));
        const capat = (vb[vb.length - 1] as VarfDoc).p;
        let cc = caContur(c.f);
        if (inapoi) cc = inverseaza(cc);
        const vc = inDocument(transformaContur(cc, inv));
        varfuri.push({ p: { x: capat.x, y: capat.y }, s: (vc[0] as VarfDoc).s }, ...vc.slice(1, -1));
      }
      const forma: FormaCale = { tip: 'cale', inchis: true, varfuri };
      const arie = arieCuSemn(transformaContur(caContur(forma), lume));
      if (!(Math.abs(arie) > 0)) return null;
      const surse = [...new Map(drum.map((x) => [x.b.e.nod, x.b.e])).values()];
      return { e: { forma, matrice: inElement ? prima.er.matrice : IDENTITATE, surse, fel: 'inchis', exteriorDreapta: null }, arie };
    } catch {
      // Un arc printr-o matrice care nu e similitudine: fața se încearcă în coordonatele piesei.
    }
  }
  return null;
}

/**
 * Fețele regiunii tăiate de corzi: drumul merge pe o bucată (cu regiunea în stânga) până la locul ei de la capăt, pe coarda
 * locului până la celălalt capăt al ei, apoi pe bucata care pleacă de acolo, până la început. Null dacă un loc n-are exact o
 * bucată care pleacă din el și o coardă.
 */
function fete(piese: readonly PiesaFata[], corzi: readonly Coarda[], mi: Matrice): Array<{ readonly e: ElementNou; readonly arie: number; readonly piese: readonly PiesaFata[] }> | null {
  const pleaca = new Map<number, number>();
  piese.forEach((b, i) => { pleaca.set(b.invers ? b.pana : b.de, i); });
  const peCoarda = new Map<number, { readonly c: Coarda; readonly inapoi: boolean }>();
  for (const c of corzi) {
    peCoarda.set(c.de, { c, inapoi: false });
    peCoarda.set(c.pana, { c, inapoi: true });
  }
  if (pleaca.size !== piese.length || peCoarda.size !== 2 * corzi.length) return null;
  const vazute = new Set<number>();
  const rez: Array<{ readonly e: ElementNou; readonly arie: number; readonly piese: readonly PiesaFata[] }> = [];
  for (let i0 = 0; i0 < piese.length; i0++) {
    if (vazute.has(i0)) continue;
    const drum: PasFata[] = [];
    for (let i = i0; ;) {
      if (vazute.has(i)) return null;
      vazute.add(i);
      const b = piese[i] as PiesaFata;
      const k = peCoarda.get(b.invers ? b.de : b.pana);
      if (!k) return null;
      drum.push({ b, c: k.c, inapoi: k.inapoi });
      const j = pleaca.get(k.inapoi ? k.c.de : k.c.pana);
      if (j === undefined) return null;
      if (j === i0) break;
      i = j;
    }
    const f = fataDin(drum, mi);
    if (!f) return null;
    rez.push({ ...f, piese: drum.map((x) => x.b) });
  }
  return rez;
}

/** O formă nouă, cu punctele ei de probă (ale bucăților formei, nu ale corzilor) și, la o față, conturul și aria ei în lume. */
type Noua = { readonly e: ElementNou; readonly proba: readonly Punct[]; readonly fata: { readonly c: Contur; readonly arie: number } | null };

/** Un contur netăiat (sau o margine dinăuntru), cu punctele lui de probă. */
type Intreaga = { readonly e: ElementNou; readonly proba: readonly Punct[] };
/**
 * O buclă închisă a unui cuțit închis care stă toată în regiunea piesei, fără să-i atingă vreun contur închis (ADR 0181 §1):
 * intră în ambele părți. Forma și matricea ei față de rădăcina piesei (forma cuțitului-formă, deci un cerc rămâne cerc; calea
 * trasă, ca o cale), bucla în lume cu un punct al ei și conturul piesei în care stă, cu adâncimea lui (operațiile, pe o piesă
 * fără rol).
 */
type Libera = {
  readonly forma: FormaDoc;
  readonly matrice: Matrice;
  readonly c: Contur;
  readonly q: Punct;
  readonly sursa: ElementLume;
  readonly adancime: number;
};

/**
 * O instanță împărțită de cuțit: formele noi (bucăți și fețe), cele netăiate, buclele libere ale cuțitului și câte contururi
 * s-au tăiat.
 */
type Impartire = { readonly noi: readonly Noua[]; readonly intregi: readonly Intreaga[]; readonly libere: readonly Libera[]; readonly taiate: number };

/**
 * O instanță împărțită de cuțitul-formă (ADR 0180 §3, §6), sau null dacă nu e tăiată, sau motivul unui refuz. Un contur închis
 * se taie doar unde exact una dintre bucățile cuțitului de lângă loc intră în regiunea piesei; o cale deschisă, unde cuțitul o
 * trece de tot. Cu închidere, fețele sunt făcute din bucățile contururilor închise și din corzi.
 */
function impartireCuForma(K: Cutitul, inst: Instanta, p: Piesa, inchide: boolean): Impartire | MotivTaiere | null {
  const mi = matriceInstanta(inst);
  const lume = elementeInstanta(p.radacina, inst, mi);
  const rel = elementeInstanta(p.radacina, inst, IDENTITATE);
  const vechi = elementeArbore(p.radacina);
  let w: Contur[];
  try {
    w = lume.map((e) => conturElement(e));
  } catch {
    return 'nereusita';
  }
  const locuri: Loc[] = [];
  let suprapus = false;
  for (let el = 0; el < w.length; el++) {
    const c = w[el] as Contur;
    if (c.varfuri.length < 2 || !seAting(cutieContur(c), K.cutie)) continue;
    const A = laCavalier(c);
    if (A === 'esuat') return 'nereusita';
    if (A === null) continue;
    for (let kc = 0; kc < K.contururi.length; kc++) {
      const B = K.contururi[kc] as Cav;
      if (!seAting(A.cutie, B.cutie)) continue;
      const r = intalniri(A, B);
      if (r.suprapuse) suprapus = true;
      for (const x of r.puncte) locuri.push({ el, kc, x });
    }
  }
  // Regiunea piesei (par-impar); un punct pe marginea ei nu e înăuntru.
  const R = w.filter((c) => c.inchis);
  const inR = (q: Punct): boolean => R.every((c) => distantaLaContur(q, c) > 1e-6) && inRegiune(q, R);
  // Buclele libere (ADR 0181 §1): contururile unui cuțit închis care nu ating niciun contur închis al piesei și stau în
  // regiunea ei (un text pus pe o placă). Cu închidere, fiecare intră în ambele părți.
  const libere: Libera[] = [];
  if (K.inchis && inchide && R.length > 0) {
    const atinse = new Set(locuri.filter((l) => (w[l.el] as Contur).inchis).map((l) => l.kc));
    const mi1 = inversa(mi);
    for (let kc = 0; kc < K.contururi.length; kc++) {
      if (atinse.has(kc)) continue;
      const kw = (K.contururi[kc] as Cav).c;
      const q = punctLa(kw, { k: 0, t: 0.5 });
      if (!inR(q)) continue;
      if (!mi1) return 'nereusita';
      // Conturul piesei în care stă bucla: cel mai mic dintre cele închise care o cuprind.
      let el = -1, arie = Infinity;
      w.forEach((c, j) => {
        if (!c.inchis || !inRegiune(q, [c])) return;
        const a = Math.abs(arieCuSemn(c));
        if (a < arie) { el = j; arie = a; }
      });
      const sursa = lume[el];
      if (!sursa) return 'nereusita';
      const qs = punctLa(w[el] as Contur, { k: 0, t: 0.5 });
      const adancime = w.filter((c, j) => j !== el && c.inchis && inRegiune(qs, [c])).length;
      const ek = K.surse[kc];
      libere.push({
        forma: ek ? ek.forma : { tip: 'cale', inchis: true, varfuri: inDocument(transformaContur(kw, mi1)) },
        matrice: ek ? compune(mi1, ek.matrice) : IDENTITATE,
        c: kw, q, sursa, adancime,
      });
    }
  }
  if (locuri.length === 0 && libere.length === 0) return null;
  // Un cuțit care se încrucișează în regiune nu are o parte dinăuntru bine făcută.
  if (libere.length > 0 && K.proprii.some(inR)) return 'cutit';
  const taiat = new Set<Loc>();
  for (let kc = 0; kc < K.contururi.length; kc++) {
    const kw = (K.contururi[kc] as Cav).c;
    const m = numarSegmente(kw);
    // Locurile cu marginea regiunii, în ordinea cuțitului (cele din același punct, împreună).
    const grupe: Loc[][] = [];
    for (const l of locuri.filter((x) => x.kc === kc && (w[x.el] as Contur).inchis).sort((u, v) => compara(u.x.b, v.x.b))) {
      const g = grupe[grupe.length - 1];
      const u = g?.[0];
      if (g && u && departe(u.x.p, l.x.p) <= eps(l.x.p)) g.push(l);
      else grupe.push([l]);
    }
    const n = grupe.length;
    if (n === 0) continue;
    const lam = grupe.map((g) => (g[0] as Loc).x.b.k + (g[0] as Loc).x.b.t);
    const intre = (l1: number, l2: number): boolean | null => (l2 > l1 ? inR(mijlocBucata(kw, l1, l2)) : null);
    // Bucata de după fiecare loc (pe un cuțit închis, ultima ajunge, peste capăt, la primul loc).
    const dupa = lam.map((l, i) => (i + 1 < n ? intre(l, lam[i + 1] as number) : intre(l, kw.inchis ? (lam[0] as number) + m : m)));
    grupe.forEach((g, i) => {
      const inainte = i > 0 ? dupa[i - 1] : kw.inchis ? dupa[n - 1] : intre(0, lam[0] as number);
      if (Number(inainte === true) + Number(dupa[i] === true) === 1) for (const l of g) taiat.add(l);
    });
  }
  for (const l of locuri) {
    const c = w[l.el] as Contur;
    if (c.inchis) continue;
    const rk = raze((K.contururi[l.kc] as Cav).c, l.x.b), rs = raze(c, l.x.a);
    if (rs.length === 2 && rk.length === 2 && deOParteSiDeAlta(rk, rs)) taiat.add(l);
  }

  const peContur: Loc[][] = w.map(() => []);
  for (const l of taiat) (peContur[l.el] as Loc[]).push(l);
  const locTaiere = peContur.map((ls, el) => farDubluri(w[el] as Contur, ls, (l) => l.x.a));
  // Un contur închis se taie cu închidere de la un loc (o coardă pleacă din el), fără închidere de la două.
  const minim = (c: Contur): number => (c.inchis && !inchide ? 2 : 1);
  const taiate = w.filter((c, el) => (locTaiere[el] as Loc[]).length >= minim(c)).length;
  if (taiate === 0 && libere.length === 0) return null;
  if (suprapus) return 'pe-linie';

  const adancime = (el: number): number => {
    const q = punctLa(w[el] as Contur, { k: 0, t: 0.5 });
    return w.filter((c, j) => j !== el && c.inchis && inRegiune(q, [c])).length;
  };
  const noi: Noua[] = [];
  const intregi: Intreaga[] = [];
  const pieseFata: PiesaFata[] = [];
  const idLoc = new Map<Loc, number>();
  for (let el = 0; el < w.length; el++) {
    const c = w[el] as Contur, e = lume[el] as ElementLume, er = rel[el] as ElementLume, v = vechi.get(e.nod);
    const ls = locTaiere[el] as Loc[];
    const camp = v ? { vechi: v } : {};
    if (ls.length < minim(c)) {
      intregi.push({ e: { forma: e.forma, matrice: er.matrice, surse: [e], fel: 'intreg', exteriorDreapta: null, ...camp }, proba: puncteProba(c) });
      continue;
    }
    const bucati = bucatiElement(e, ls.map((l) => l.x.a));
    if (c.inchis && inchide) {
      const invers = (arieCuSemn(c) > 0) !== (adancime(el) % 2 === 0);
      for (const l of ls) idLoc.set(l, idLoc.size);
      bucati.forEach((f, j) => {
        pieseFata.push({ f, e, er, de: idLoc.get(ls[j] as Loc) as number, pana: idLoc.get(ls[(j + 1) % ls.length] as Loc) as number, invers });
      });
      continue;
    }
    const trig = c.inchis ? arieCuSemn(c) > 0 : null;
    for (const f of bucati) {
      noi.push({ e: { forma: f, matrice: er.matrice, surse: [e], fel: 'deschis', exteriorDreapta: trig, ...camp }, proba: puncteProba(conturElement({ forma: f, matrice: e.matrice })), fata: null });
    }
  }

  if (pieseFata.length > 0) {
    // Închiderea: corzile sunt bucățile cuțitului din regiune, între două locuri de tăiere.
    if (K.proprii.some(inR)) return 'cutit';
    const corzi: Coarda[] = [];
    for (let kc = 0; kc < K.contururi.length; kc++) {
      const kw = (K.contururi[kc] as Cav).c;
      const capete = [...idLoc.keys()].filter((l) => l.kc === kc).sort((u, v) => compara(u.x.b, v.x.b));
      if (capete.length === 0) continue;
      for (let i = 1; i < capete.length; i++) if (departe((capete[i - 1] as Loc).x.p, (capete[i] as Loc).x.p) <= eps((capete[i] as Loc).x.p)) return 'nereusita';
      const bucati = bucatiCale({ tip: 'cale', inchis: kw.inchis, varfuri: inDocument(kw) }, capete.map((l) => l.x.b));
      for (let j = 0; j < bucati.length; j++) {
        const f = bucati[j] as FormaCale;
        const cc = caContur(f);
        // Un cuțit care pornește (sau se termină) chiar într-un loc de tăiere n-are bucată acolo.
        if (cc.varfuri.length < 2 || !inR(mijlocBucata(cc, 0, numarSegmente(cc)))) continue;
        const de = kw.inchis ? capete[j] : capete[j - 1], pana = kw.inchis ? capete[(j + 1) % capete.length] : capete[j];
        if (!de || !pana) return 'nu-trece';
        corzi.push({ f, de: idLoc.get(de) as number, pana: idLoc.get(pana) as number });
      }
    }
    const fs = fete(pieseFata, corzi, mi);
    if (!fs) return 'nereusita';
    for (const x of fs) {
      const proba = x.piese.flatMap((b) => puncteProba(conturElement({ forma: b.f, matrice: b.e.matrice })));
      // O margine dinăuntru (aria negativă) merge, ca un contur netăiat, cu regiunea în care stă.
      if (x.arie < 0) intregi.push({ e: x.e, proba });
      else noi.push({ e: x.e, proba, fata: { c: transformaContur(caContur(x.e.forma as FormaCale), compune(mi, x.e.matrice)), arie: x.arie } });
    }
  }

  // Tăiată doar de buclele libere: conturul în care stau se socotește tăiat.
  return { noi, intregi, libere, taiate: Math.max(taiate, libere.length > 0 ? 1 : 0) };
}

/**
 * Buclele libere ale cuțitului, în fiecare parte (ADR 0181 §1): o margine înăuntru, un gol în afară (sau o insulă, mijlocul
 * unei litere). Pe o piesă fără rol, bucla ia operațiile conturului în care stă, cu latura întoarsă când adâncimea ei în parte
 * diferă de a lui ca paritate.
 */
function cuLibere(libere: readonly Libera[], parti: readonly ElementNou[][], mi: Matrice): void {
  if (libere.length === 0) return;
  const bucle = libere.map((l) => l.c);
  for (const parte of parti) {
    const inParte = parte.map((e) => conturElement({ forma: e.forma, matrice: compune(mi, e.matrice) })).filter((c) => c.inchis);
    for (const l of libere) {
      const adancime = [...inParte, ...bucle].filter((c) => c !== l.c && inRegiune(l.q, [c])).length;
      parte.push({ forma: l.forma, matrice: l.matrice, surse: [l.sursa], fel: 'inchis', exteriorDreapta: null, inversLatura: adancime % 2 !== l.adancime % 2 });
    }
  }
}

/** Ce e înăuntrul cuțitului închis și ce e în afara lui, după primul punct de probă al fiecărei forme care nu stă pe el. */
function laturi(K: Cutitul, xs: readonly Intreaga[]): readonly [ElementNou[], ElementNou[]] {
  const kw = K.contururi.map((c) => c.c);
  const inauntru = (proba: readonly Punct[]): boolean => {
    for (const q of proba) if (kw.every((c) => distantaLaContur(q, c) > 1e-6)) return inRegiune(q, kw);
    return false;
  };
  const A: ElementNou[] = [], B: ElementNou[] = [];
  for (const x of xs) (inauntru(x.proba) ? A : B).push(x.e);
  return [A, B];
}

/** O instanță tăiată cu cuțitul-formă: părțile ei (cuțitul închis: înăuntru, în afară; deschis: fiecare față, o formă). */
function taieCuForma(K: Cutitul, inst: Instanta, p: Piesa, inchide: boolean): Rezultat | MotivTaiere | null {
  const r = impartireCuForma(K, inst, p, inchide);
  if (r === null || typeof r === 'string') return r;
  const { noi, intregi, taiate } = r;
  const parti: Parte[] = [];
  if (K.inchis) {
    // Cuțitul închis: ce e înăuntrul lui și ce e în afară (buclele libere, în amândouă).
    const doua = laturi(K, [...noi, ...intregi]);
    cuLibere(r.libere, doua, matriceInstanta(inst));
    for (const x of doua) if (x.length > 0) parti.push({ elemente: x });
  } else {
    // Cuțitul deschis: fiecare față și fiecare bucată, o formă; un contur netăiat merge cu cea mai mică față în care stă,
    // altfel rămâne.
    const separate = noi.map((x) => ({ elemente: [x.e] }));
    const rest: ElementNou[] = [];
    for (const x of intregi) {
      const q = x.proba[0];
      let k = -1;
      noi.forEach((y, j) => {
        if (q && y.fata && inRegiune(q, [y.fata.c]) && (k < 0 || y.fata.arie < ((noi[k] as Noua).fata?.arie ?? Infinity))) k = j;
      });
      if (k >= 0) (separate[k] as Parte).elemente.push(x.e);
      else rest.push(x.e);
    }
    parti.push(...separate);
    if (rest.length > 0) parti.push({ elemente: rest });
  }
  return { parti, taiate };
}

// ——— Decuparea (ADR 0180 §4, §6) ———

/** Toate contururile instanței, netăiate, cu punctele lor de probă (o instanță la care cuțitul n-a tăiat nimic). */
function toateIntregi(inst: Instanta, p: Piesa): Intreaga[] | MotivTaiere {
  const lume = elementeInstanta(p.radacina, inst, matriceInstanta(inst));
  const rel = elementeInstanta(p.radacina, inst, IDENTITATE);
  const vechi = elementeArbore(p.radacina);
  try {
    return lume.map((e, i): Intreaga => {
      const v = vechi.get(e.nod);
      const er = rel[i] as ElementLume;
      return { e: { forma: e.forma, matrice: er.matrice, surse: [e], fel: 'intreg', exteriorDreapta: null, ...(v ? { vechi: v } : {}) }, proba: puncteProba(conturElement(e)) };
    });
  } catch {
    return 'nereusita';
  }
}

/**
 * O instanță decupată la granița K (închisă): ce e de partea păstrată. Neschimbată (null) dacă e toată acolo; ștearsă dacă n-are
 * nimic acolo; altfel trece granița și, după alegere, se taie (rămâne doar partea păstrată), se șterge sau rămâne întreagă.
 */
function decupeazaInstanta(K: Cutitul, inst: Instanta, p: Piesa, o: Extract<Cutit, { readonly fel: 'decupare' }>, inchide: boolean): Rezultat | Stearsa | MotivTaiere | null {
  const r = impartireCuForma(K, inst, p, inchide);
  if (typeof r === 'string') return r;
  const xs = r ? [...r.noi, ...r.intregi] : toateIntregi(inst, p);
  if (typeof xs === 'string') return xs;
  const [inauntru, afara] = laturi(K, xs);
  if (r) cuLibere(r.libere, [inauntru, afara], matriceInstanta(inst));
  const [pastrate, plecate] = o.pastreaza === 'inauntru' ? [inauntru, afara] : [afara, inauntru];
  if (plecate.length === 0) return null;
  if (pastrate.length === 0) return { sterge: true };
  if (o.trec === 'intregi') return null;
  if (o.trec === 'sterge') return { sterge: true };
  return { parti: [{ elemente: pastrate }], taiate: r?.taiate ?? 0 };
}

// ——— Taie la intersecții (ADR 0180 §5, ADR 0124 §15) ———

/** Locurile de tăiere ale fiecărui contur ales (după id-ul lui în lume): toate locurile lui comune cu celelalte. */
function locuriIntersectii(doc: Document, indexFoaie: number, alese: ReadonlySet<string>): Map<string, Trecere[]> | MotivTaiere {
  const forme: Array<{ readonly id: string; readonly a: Cav }> = [];
  for (const e of elementeFoaie(doc, indexFoaie)) {
    if (!alese.has(e.instanta)) continue;
    let a: Cav | null | 'esuat';
    try {
      a = laCavalier(conturElement(e));
    } catch {
      return 'nereusita';
    }
    if (a === 'esuat') return 'nereusita';
    if (a) forme.push({ id: e.idLume, a });
  }
  const rez = new Map<string, Trecere[]>();
  const adauga = (id: string, x: Trecere): void => {
    const l = rez.get(id);
    if (l) l.push(x);
    else rez.set(id, [x]);
  };
  const index = indexCutii(forme.map((f) => f.a.cutie));
  let perechi = 0;
  for (let i = 0; i < forme.length; i++) {
    const f = forme[i] as (typeof forme)[number];
    const altele: number[] = [];
    index.vizita(f.a.cutie, (j) => { if (j > i) altele.push(j); });
    perechi += altele.length;
    if (perechi > PLAFON_PERECHI) return 'prea-multe';
    for (const j of altele) {
      const g = forme[j] as (typeof forme)[number];
      for (const x of intalniri(f.a, g.a).puncte) {
        adauga(f.id, x.a);
        adauga(g.id, x.b);
      }
    }
  }
  return rez;
}

/**
 * O instanță tăiată la intersecții: fiecare bucată, o parte; contururile netăiate (și cele închise cu un singur loc), o parte
 * la urmă. Null dacă nu se taie nimic. `deschide` (foarfeca): un contur închis cu un singur loc se deschide acolo.
 */
function taieLaLocuri(inst: Instanta, p: Piesa, loc: ReadonlyMap<string, readonly Trecere[]>, deschide: boolean): Rezultat | null {
  const lume = elementeInstanta(p.radacina, inst, matriceInstanta(inst));
  const rel = elementeInstanta(p.radacina, inst, IDENTITATE);
  const vechi = elementeArbore(p.radacina);
  const parti: Parte[] = [];
  const rest: ElementNou[] = [];
  let taiate = 0;
  for (let i = 0; i < lume.length; i++) {
    const e = lume[i] as ElementLume, er = rel[i] as ElementLume, v = vechi.get(e.nod);
    const camp = v ? { vechi: v } : {};
    const x = loc.get(e.idLume);
    const w = x ? conturElement(e) : null;
    const tr = w && x ? farDubluri(w, x, (y) => y) : [];
    if (!w || tr.length < (w.inchis && !deschide ? 2 : 1)) {
      rest.push({ forma: e.forma, matrice: er.matrice, surse: [e], fel: 'intreg', exteriorDreapta: null, ...camp });
      continue;
    }
    taiate++;
    const sens = w.inchis ? arieCuSemn(w) > 0 : null;
    for (const f of bucatiElement(e, tr)) parti.push({ elemente: [{ forma: f, matrice: er.matrice, surse: [e], fel: 'deschis', exteriorDreapta: sens, ...camp }] });
  }
  if (taiate === 0) return null;
  if (rest.length > 0) parti.push({ elemente: rest });
  return { parti, taiate };
}

// ——— Foarfeca și Retează (ADR 0181 §4, §5; felia 10.3↑g) ———

/** Locul de pe contur, ca număr: segmentul plus parametrul. */
const lam = (x: Trecere): number => x.k + x.t;

/**
 * Conturul instanței cel mai apropiat de `q` (mm ai foii), la cel mult `tol` mm, cu locul de pe el: un nod al lui la cel mult
 * `tol` de clic e locul (capetele segmentelor se lipesc de noduri). `departe` dacă niciun contur nu e atât de aproape.
 */
function conturLovit(inst: Instanta, p: Piesa, q: Punct, tol: number): { readonly el: number; readonly e: ElementLume; readonly w: Contur; readonly x: Trecere } | MotivTaiere {
  if (!(tol > 0) || !Number.isFinite(q.x) || !Number.isFinite(q.y)) return 'valoare';
  const lume = elementeInstanta(p.radacina, inst, matriceInstanta(inst));
  let cel: { el: number; e: ElementLume; w: Contur; x: Trecere; d: number } | null = null;
  for (let el = 0; el < lume.length; el++) {
    const e = lume[el] as ElementLume;
    let w: Contur;
    try {
      w = conturElement(e);
    } catch {
      return 'nereusita';
    }
    const n = numarSegmente(w);
    for (let k = 0; k < n; k++) {
      const r = apropiat(w, k, q);
      if (r.d <= tol && (!cel || r.d < cel.d)) cel = { el, e, w, x: { k, t: r.t }, d: r.d };
    }
  }
  if (!cel) return 'departe';
  // Un nod al conturului lovit, la toleranță de clic: tăietura cade chiar în el.
  const v = cel.w.varfuri;
  let nod = -1, dn = tol;
  for (let k = 0; k < v.length; k++) {
    const d = Math.hypot((v[k] as Varf).p.x - q.x, (v[k] as Varf).p.y - q.y);
    if (d <= dn) { dn = d; nod = k; }
  }
  const n = numarSegmente(cel.w);
  const x: Trecere = nod >= 0 ? { k: cel.w.inchis ? nod % n : nod, t: 0 } : cel.x.t >= 1 ? { k: cel.x.k + 1, t: 0 } : cel.x;
  return { el: cel.el, e: cel.e, w: cel.w, x: cel.w.inchis && x.k >= n ? { k: 0, t: 0 } : x };
}

/** Foarfeca (ADR 0181 §4): conturul de sub clic, tăiat acolo; capătul unei căi deschise nu se desparte (`capat`). */
function foarfeca(inst: Instanta, p: Piesa, c: Extract<Cutit, { readonly fel: 'foarfeca' }>): Rezultat | MotivTaiere | null {
  const lov = conturLovit(inst, p, c.punct, c.toleranta);
  if (typeof lov === 'string') return lov;
  const m = numarSegmente(lov.w);
  if (!lov.w.inchis && (lam(lov.x) <= 1e-12 || lam(lov.x) >= m - 1e-12)) return 'capat';
  return taieLaLocuri(inst, p, new Map([[lov.e.idLume, [lov.x]]]), true);
}

/** Locurile comune ale conturului `w` (elementul `idLume`) cu celelalte contururi ale instanțelor alese (ale piesei lui, la fel). */
function locuriPeContur(doc: Document, indexFoaie: number, alese: ReadonlySet<string>, idLume: string, w: Contur): Trecere[] | MotivTaiere {
  let A: Cav | null | 'esuat';
  try {
    A = laCavalier(w);
  } catch {
    return 'nereusita';
  }
  if (A === 'esuat') return 'nereusita';
  if (A === null) return [];
  const rez: Trecere[] = [];
  for (const e of elementeFoaie(doc, indexFoaie)) {
    if (!alese.has(e.instanta) || e.idLume === idLume || !seAting(cutieElement(e), A.cutie)) continue;
    let B: Cav | null | 'esuat';
    try {
      B = laCavalier(conturElement(e));
    } catch {
      return 'nereusita';
    }
    if (B === 'esuat') return 'nereusita';
    if (B) for (const x of intalniri(A, B).puncte) rez.push(x.a);
  }
  return rez;
}

/**
 * Retează (ADR 0181 §5): bucata conturului de sub clic, dintre cele mai apropiate două locuri comune, scoasă; ce rămâne din el
 * (o cale deschisă, sau două, la mijlocul unei căi deschise) stă în piesă, cu celelalte contururi. Un contur închis cu mai
 * puțin de două locuri comune, sau unul deschis fără niciunul, pleacă tot; o piesă rămasă fără nimic se șterge.
 */
function reteaza(doc: Document, indexFoaie: number, alese: ReadonlySet<string>, inst: Instanta, p: Piesa, c: Extract<Cutit, { readonly fel: 'reteaza' }>): Rezultat | Stearsa | MotivTaiere {
  const lov = conturLovit(inst, p, c.punct, c.toleranta);
  if (typeof lov === 'string') return lov;
  const { el, e, w, x } = lov;
  const toate = locuriPeContur(doc, indexFoaie, alese, e.idLume, w);
  if (typeof toate === 'string') return toate;
  const m = numarSegmente(w);
  const lc = lam(x);
  // Locurile, în ordinea conturului, fără dubluri; pe o cale deschisă, doar cele dinăuntru (un capăt nu desparte nimic).
  const ls = farDubluri(w, toate, (y) => y).filter((y) => w.inchis || (lam(y) > 1e-9 && lam(y) < m - 1e-9));
  let ramase: FormaCale[];
  if (w.inchis) {
    if (ls.length < 2) ramase = [];
    else {
      let ib = ls.findIndex((y) => lam(y) > lc);
      if (ib < 0) ib = 0;
      const ia = (ib - 1 + ls.length) % ls.length;
      const doua = [ls[ia] as Trecere, ls[ib] as Trecere].sort(compara);
      const [b0, b1] = bucatiElement(e, doua);
      const inPrima = lc >= lam(doua[0] as Trecere) && lc <= lam(doua[1] as Trecere);
      ramase = [(inPrima ? b1 : b0) as FormaCale];
    }
  } else {
    const inainte = ls.filter((y) => lam(y) <= lc).pop();
    const dupa = ls.find((y) => lam(y) > lc);
    const taieturi = [inainte, dupa].filter((y): y is Trecere => y !== undefined);
    const bucati = bucatiElement(e, taieturi);
    const scoasa = inainte ? 1 : 0;
    ramase = bucati.filter((_, i) => i !== scoasa);
  }
  const lume = elementeInstanta(p.radacina, inst, matriceInstanta(inst));
  const rel = elementeInstanta(p.radacina, inst, IDENTITATE);
  const vechi = elementeArbore(p.radacina);
  const sens = w.inchis ? arieCuSemn(w) > 0 : null;
  const elemente: ElementNou[] = [];
  for (let i = 0; i < lume.length; i++) {
    const ei = lume[i] as ElementLume, er = rel[i] as ElementLume, v = vechi.get(ei.nod);
    if (i === el) {
      for (const f of ramase) elemente.push({ forma: f, matrice: er.matrice, surse: [ei], fel: 'deschis', exteriorDreapta: sens });
      continue;
    }
    elemente.push({ forma: ei.forma, matrice: er.matrice, surse: [ei], fel: 'intreg', exteriorDreapta: null, ...(v ? { vechi: v } : {}) });
  }
  if (elemente.length === 0) return { sterge: true };
  return { parti: [{ elemente }], taiate: 1 };
}
