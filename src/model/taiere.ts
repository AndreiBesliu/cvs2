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
 */
import { arieCuSemn, cerculArcului, inverseaza, numarSegmente, segment, type Contur, type Punct, type Segment } from '../geom/contur.ts';
import { inversa } from '../geom/inversa.ts';
import { aplica, IDENTITATE, transformaContur, type Matrice } from '../geom/matrice.ts';
import type { Document, ElementNod, FormaDoc, Instanta, Nod, Operatie, Piesa, SegmentDoc, VarfDoc } from './document.ts';
import { conturElement } from './forme.ts';
import type { Degrupata } from './jurnal.ts';
import { elementeInstanta, matriceInstanta, type ElementLume } from './lume.ts';
import { adaugaNod, caleDinForma, type FormaCale } from './noduri.ts';
import { grupeRol, rolPiesei } from './rol.ts';

/** Cu ce se taie: linia verticală x = X, cea orizontală y = Y (mm ai foii) sau un ghidaj al foii (ADR 0050), după id. */
export type Cutit = { readonly fel: 'x'; readonly x: number } | { readonly fel: 'y'; readonly y: number } | { readonly fel: 'ghidaj'; readonly id: string };

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
 * exact, de pildă două treceri în același punct).
 */
export type MotivTaiere = 'nimic-ales' | 'ghidaj' | 'valoare' | 'nimic-taiat' | 'impartita' | 'pe-linie' | 'operatii' | 'nereusita';

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

function punctPe(a: Punct, b: Punct, s: Segment, t: number): Punct {
  if (s.tip === 'C') {
    const u = 1 - t;
    const k0 = u * u * u, k1 = 3 * u * u * t, k2 = 3 * u * t * t, k3 = t * t * t;
    return { x: k0 * a.x + k1 * s.c1.x + k2 * s.c2.x + k3 * b.x, y: k0 * a.y + k1 * s.c1.y + k2 * s.c2.y + k3 * b.y };
  }
  if (s.tip === 'A' && Math.abs(s.bulge) > 1e-12) {
    const { centru, raza, start, baleiaj } = cerculArcului(a, b, s.bulge);
    const u = start + baleiaj * t;
    return { x: centru.x + raza * Math.cos(u), y: centru.y + raza * Math.sin(u) };
  }
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

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

/** Bucățile unui cerc de rază r (centrul în originea elementului), tăiat la unghiurile date: fiecare, un singur arc. */
function bucatiCerc(raza: number, unghiuri: readonly number[]): FormaCale[] {
  const u = [...unghiuri].sort((a, b) => a - b);
  const puncte = u.map((x) => ({ x: raza * Math.cos(x), y: raza * Math.sin(x) }));
  return u.map((x, i) => {
    const urm = i + 1 < u.length ? (u[i + 1] as number) : (u[0] as number) + 2 * Math.PI;
    const p0 = puncte[i] as Punct, p1 = puncte[(i + 1) % u.length] as Punct;
    return {
      tip: 'cale', inchis: false,
      varfuri: [{ p: { x: p0.x, y: p0.y }, s: { tip: 'A', bulge: Math.tan((urm - x) / 4) } }, { p: { x: p1.x, y: p1.y }, s: LINIE_DOC() }],
    };
  });
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
function linia(doc: Document, c: Cutit, indexFoaie: number): Linie | MotivTaiere {
  if (c.fel === 'ghidaj') {
    const g = doc.foi[indexFoaie]?.ghidaje?.find((x) => x.id === c.id);
    if (!g) return 'ghidaj';
    return Number.isFinite(g.poz) ? { axa: g.axa, v: g.poz } : 'valoare';
  }
  const v = c.fel === 'x' ? c.x : c.y;
  return Number.isFinite(v) ? { axa: c.fel, v } : 'valoare';
}

/**
 * Tăierea cu o linie dreaptă a instanțelor alese, pe foaia de lucru (ADR 0180 §3, §6). Fiecare instanță prin care trece linia
 * devine două: partea A (stânga liniei verticale, dedesubtul celei orizontale) și partea B, fiecare cu piesa ei, la locul
 * instanței vechi; o instanță prin care linia nu trece rămâne cum e.
 */
export function taie(doc: Document, cerere: CerereTaiere, indexFoaie = 0): RezultatTaiere {
  const foaie = doc.foi[indexFoaie];
  if (!foaie || cerere.alese.length === 0) return { ok: false, motiv: 'nimic-ales' };
  const L = linia(doc, cerere.cutit, indexFoaie);
  if (typeof L === 'string') return { ok: false, motiv: L };
  const alese = new Set(cerere.alese);
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
  let forme = 0;
  let scoase = 0;
  for (const inst of foaie.instante) {
    if (!alese.has(inst.id)) continue;
    const p = piese.get(inst.piesa);
    if (!p) continue;
    const r = taieInstanta(L, inst, p, cerere.inchide);
    if (r === null) continue;
    if (typeof r === 'string') return { ok: false, motiv: r };
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
  if (degrupate.length === 0) return { ok: false, motiv: 'nimic-taiat' };
  return { ok: true, degrupate, ids, forme, scoase };
}

/** O instanță tăiată în cele două părți ale ei, sau null dacă linia nu trece prin ea, sau motivul unui refuz. */
function taieInstanta(L: Linie, inst: Instanta, p: Piesa, inchide: boolean): { readonly parti: readonly Parte[]; readonly taiate: number } | MotivTaiere | null {
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
    let bucati: FormaCale[];
    if (nod.tip === 'cerc') {
      const inv = inversa(e.matrice);
      if (!inv) return 'nereusita';
      bucati = bucatiCerc(nod.raza, tr.map((x) => {
        const { a, b, s } = segment(w, x.k);
        const q = aplica(inv, punctPe(a, b, s, x.t));
        return Math.atan2(q.y, q.x);
      }));
    } else {
      bucati = bucatiCale(caleDinForma(nod), tr);
    }
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
