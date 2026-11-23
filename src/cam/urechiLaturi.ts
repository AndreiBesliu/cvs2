import { cerculArcului, numarSegmente, segment, type Contur } from '../geom/contur.ts';
import { geometrieUrechi, lungimeBucla, urechiCareIncap } from './urechi.ts';

/**
 * Urechile după reguli, pe laturi (ADR 0211, varianta c; felia 11.3↑f): „pe laturile lungi”, „pe laturile scurte”, „la mijlocul
 * fiecărei laturi”. Sunt pentru plăcuțe și dreptunghiuri: previzibile, fără pânză. Laturile se citesc pe drumul frezei (bucla
 * profilului), deci pe dinafară au lungimea laturilor desenului, iar pe dinăuntru sunt mai scurte cu diametrul frezei.
 *
 * - **Latura:** o bucată dreaptă a buclei; liniile care se continuă în aceeași direcție sunt o singură latură, și peste vârful
 *   0. Arcele nu sunt laturi. Numără doar latura pe care încape o ureche (W ≤ 0,9 · L, regula ADR 0028): o teșitură mică sau
 *   liniile scurte ale unei curbe nu sunt laturi.
 * - **Regula:** „lungi”, laturile cele mai lungi (și cele cu cel mult 1 % mai scurte); „scurte”, cele mai scurte (și cele cu cel
 *   mult 1 % mai lungi); „mijloc”, toate, cu câte o ureche la mijloc (numărul nu contează).
 * - **Numărul** (pe buclă, la „lungi” și „scurte”) se împarte pe laturile regulii: ⌊n / k⌋ pe fiecare, iar restul de e, câte una
 *   pe laturile ⌊j · k / e⌋, în ordinea drumului (răspândite: două urechi pe un pătrat stau pe laturi opuse). Pe o latură cu m
 *   urechi, centrele la (j + ½) · L / m, ca pe o buclă (ADR 0028 §3); cel mult câte încap, restul se spune (nimic pe tăcute).
 * - **Fără laturi** (un cerc, o curbă): bucla rămâne la distanțe egale.
 *
 * Centrele sunt lungimi de la vârful 0 al buclei, cu aceeași măsură ca `proiectiePeBucla` (arcul ca r·|θ|): intră în lucrare pe
 * drumul locurilor alese (pornirea în mijlocul celui mai lung gol, intrările în afara urechilor).
 */
export type RegulaUrechi = 'lungi' | 'scurte' | 'mijloc';

/** O latură a buclei: de unde pornește (lungimea de la vârful 0) și cât e de lungă. Cea de peste vârful 0 se termină după el. */
export type LaturaBucla = { readonly s0: number; readonly lungime: number };

/** Cât se poate abate direcția unei linii de la a primei linii a laturii (sinusul unghiului: 0,057°). */
const TOL_DIRECTIE = 1e-3;
/** Laturile cu cel mult atât (relativ) sub cea mai lungă sunt la fel de lungi; la fel, peste cea mai scurtă. */
const TOL_EGALE = 0.01;
/** Rezerva relativă de rotunjire a regulii W ≤ 0,9 · L (ca în `urechiCareIncap`): lucrarea primește mereu centrele date. */
const REZERVA = 1e-9;

/** Laturile unei bucle închise, în ordinea drumului (cea de peste vârful 0, la urmă), și lungimea buclei. */
export function laturiBucla(c: Contur): { readonly P: number; readonly laturi: LaturaBucla[] } {
  type Rulare = { s0: number; lungime: number; ux: number; uy: number; capat: number };
  const rulari: Rulare[] = [];
  let curenta: Rulare | null = null;
  let P = 0;
  for (let i = 0; i < numarSegmente(c); i++) {
    const { a, b, s } = segment(c, i);
    if (s.tip !== 'L') {
      const cerc = s.tip === 'A' ? cerculArcului(a, b, s.bulge) : null;
      P += cerc ? cerc.raza * Math.abs(cerc.baleiaj) : Math.hypot(b.x - a.x, b.y - a.y);
      curenta = null;
      continue;
    }
    const L = Math.hypot(b.x - a.x, b.y - a.y);
    if (!(L > 0)) continue;
    const ux = (b.x - a.x) / L, uy = (b.y - a.y) / L;
    if (curenta && Math.abs(curenta.ux * uy - curenta.uy * ux) <= TOL_DIRECTIE && curenta.ux * ux + curenta.uy * uy > 0) {
      curenta.lungime += L;
    } else {
      curenta = { s0: P, lungime: L, ux, uy, capat: 0 };
      rulari.push(curenta);
    }
    P += L;
    curenta.capat = P;
  }
  // Latura de peste vârful 0: ultima rulare ajunge la capătul buclei, prima pornește din vârful 0, în aceeași direcție.
  const prima = rulari[0], ultima = rulari[rulari.length - 1];
  if (c.inchis && prima && ultima && prima !== ultima && prima.s0 === 0 && ultima.capat === P
    && Math.abs(ultima.ux * prima.uy - ultima.uy * prima.ux) <= TOL_DIRECTIE && ultima.ux * prima.ux + ultima.uy * prima.uy > 0) {
    ultima.lungime += prima.lungime;
    rulari.shift();
  }
  return { P, laturi: rulari.map((r) => ({ s0: r.s0, lungime: r.lungime })) };
}

/** Urechile unei bucle după regulă: câte au încăput, câte se cer și centrele lor (crescătoare, în [0, P)). */
export type UrechiLaturi = { readonly cate: number; readonly cerute: number; readonly centre: readonly number[] };

/**
 * Urechile buclei c după regulă, cu palierul W și numărul n (pe buclă). Null dacă bucla n-are nicio latură pe care să încapă o
 * ureche: atunci rămâne la distanțe egale.
 */
export function urechiPeLaturi(c: Contur, regula: RegulaUrechi, W: number, n: number): UrechiLaturi | null {
  const { P, laturi } = laturiBucla(c);
  const bune = laturi.filter((l) => W * (1 + REZERVA) <= 0.9 * l.lungime);
  if (bune.length === 0 || !(W > 0)) return null;
  let alese = bune;
  let cate: number[];
  if (regula === 'mijloc') {
    cate = bune.map(() => 1);
  } else {
    if (regula === 'lungi') {
      const max = Math.max(...bune.map((l) => l.lungime));
      alese = bune.filter((l) => l.lungime >= max * (1 - TOL_EGALE));
    } else {
      const min = Math.min(...bune.map((l) => l.lungime));
      alese = bune.filter((l) => l.lungime <= min * (1 + TOL_EGALE));
    }
    const k = alese.length, baza = Math.floor(n / k), rest = n - baza * k;
    cate = alese.map(() => baza);
    for (let j = 0; j < rest; j++) {
      const i = Math.floor((j * k) / rest);
      cate[i] = (cate[i] as number) + 1;
    }
    cate = cate.map((m, i) => urechiCareIncap((alese[i] as LaturaBucla).lungime, W, m));
  }
  const centre: number[] = [];
  alese.forEach((l, i) => {
    const m = cate[i] as number;
    for (let j = 0; j < m; j++) {
      const s = l.s0 + ((j + 0.5) * l.lungime) / m;
      centre.push(s >= P ? s - P : s);
    }
  });
  centre.sort((a, b) => a - b);
  return { cate: centre.length, cerute: regula === 'mijloc' ? centre.length : n, centre };
}

/** Urechile după regulă pe buclele unei tăieturi. */
export type CentreLaturi = {
  /** Centrele fiecărei bucle (pe drumul locurilor alese). */
  readonly centre: number[][];
  /** Buclele cu mai puține urechi decât numărul: bucla, câte au încăput, câte se cer. */
  readonly putine: { readonly j: number; readonly k: number; readonly n: number }[];
  /** Urechile puse după regulă (nu cele rămase la distanțe egale): bucla și poziția pe ea, pentru semnele de pe traseu. */
  readonly semne: { readonly j: number; readonly s: number }[];
};

/**
 * Centrele urechilor după regulă, pe buclele unei tăieturi. Null dacă nicio buclă n-are laturi: tăietura rămâne a modului
 * „egale”, octet cu octet. Lângă o buclă cu laturi, una fără rămâne la distanțe egale ((k + ½) · P / n, de la vârful ei 0), cu
 * refuzul modului „egale” dacă urechile nu încap pe ea (ADR 0028: refuz, nu strâns).
 */
export function centrePeLaturi(bucle: readonly Contur[], regula: RegulaUrechi, W: number, n: number): CentreLaturi | string | null {
  const rez = bucle.map((c) => urechiPeLaturi(c, regula, W, n));
  if (rez.every((r) => r === null)) return null;
  const centre: number[][] = [];
  const putine: CentreLaturi['putine'] = [];
  const semne: CentreLaturi['semne'] = [];
  for (const [j, r] of rez.entries()) {
    if (r) {
      if (r.cate < r.cerute) putine.push({ j, k: r.cate, n: r.cerute });
      for (const s of r.centre) semne.push({ j, s });
      centre.push([...r.centre]);
      continue;
    }
    const g = geometrieUrechi(lungimeBucla(bucle[j] as Contur), { numar: n, latime: W, varf: 0 });
    if (typeof g === 'string') return `bucla ${j + 1}, fără laturi drepte: ${g}`;
    centre.push([...g.centre]);
  }
  return { centre, putine, semne };
}
