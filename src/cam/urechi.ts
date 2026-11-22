import { apropiat } from '../geom/apropiat.ts';
import { cerculArcului, numarSegmente, segment, type Contur, type Punct } from '../geom/contur.ts';
import type { Degajare } from './degajari.ts';
import { parcurge, type Nod, type RezultatParcurgere } from './parcurgere.ts';

export { lungimeBucla } from './parcurgere.ts';

/**
 * Urechile (ADR 0028): profilul Z(s) al ediției întâi, portat cu formulele lui, ca modificator peste trecerea L / A.
 *
 *     S = P / n, centrele la (k + ½)·S       palierul |s − c| ≤ h, h = W / 2                Z = −vârf
 *     flancul h < |s − c| < h + ℓ            ℓ = min(W / 2; 0,45·(S − W))                    Z liniar, −vârf → −d
 *     în rest                                                                                Z = −d
 *
 * h + ℓ ≤ 0,495·S, deci flancurile vecine nu se ating, pornirea (s = 0) e la adâncime plină și toate rupturile sunt în
 * (0, P). Spre deosebire de ediția întâi, o lățime care nu încape (W > 0,9·S) e refuzată, nu strânsă pe ascuns.
 */
export type ParametriUrechi = {
  readonly numar: number;
  /** Lungimea palierului, pe traseul centrului frezei (mm). */
  readonly latime: number;
  /** Adâncimea vârfului urechii, de la fața de sus (mm, pozitivă): grosimea foii minus grosimea punții. */
  readonly varf: number;
  /**
   * Urechile unei bucle la locuri alese (ADR 0211): centrele lor, ca lungime de la vârful 0 al buclei, crescătoare. Lipsă:
   * `numar` urechi la distanțe egale (ADR 0028).
   */
  readonly centre?: readonly number[];
  /**
   * Pe o tăietură la locuri alese (ADR 0211): centrele fiecărei bucle j, cum ajunge ea la traseu (`urechiPeBucla`). Lipsă: la
   * distanțe egale, aceleași pe toate buclele.
   */
  readonly bucle?: readonly (readonly number[])[];
};

/** O trecere traversează urechile doar dacă e mai adâncă decât vârful lor cu mai mult de atât. */
export const EPS_VARF = 1e-9;

/**
 * Unde stau urechile pe o buclă de lungime P: spațiul S, jumătatea palierului h, flancul ℓ și centrele. Nu depinde de
 * adâncime, deci și zonele urechilor, [c − h − ℓ; c + h + ℓ], sunt aceleași pe toate trecerile (ADR 0029 §2).
 */
export type GeometrieUrechi = {
  readonly S: number; readonly h: number; readonly l: number; readonly centre: readonly number[];
  /**
   * Flancul fiecărei urechi: la distanțe egale, ℓ pe toate; la locuri alese (ADR 0211), din golul cel mai mic spre vecinele
   * ei, cu aceeași formulă. Zona urechii k e [c_k − h − ℓ_k; c_k + h + ℓ_k].
   */
  readonly flancuri: readonly number[];
};

export function geometrieUrechi(lungime: number, u: ParametriUrechi): GeometrieUrechi | string {
  if (u.centre) return geometrieAleasa(lungime, u.latime, u.centre);
  const S = lungime / u.numar;
  if (u.latime > 0.9 * S) {
    return `urechile nu încap: ${u.numar} urechi de ${u.latime} mm pe o buclă de ${lungime.toFixed(2)} mm (cel mult ${(0.9 * S).toFixed(2)} mm fiecare)`;
  }
  const centre: number[] = [];
  for (let k = 0; k < u.numar; k++) centre.push((k + 0.5) * S);
  const l = Math.min(u.latime / 2, 0.45 * (S - u.latime));
  return { S, h: u.latime / 2, l, centre, flancuri: centre.map(() => l) };
}

/**
 * Golul fiecărei urechi alese spre vecinele ei pe bucla închisă de lungime P (ADR 0211): cel mai mic dintre distanțele, pe
 * buclă, de la centrul ei la centrul urechii de dinainte și la al celei de după; cu o singură ureche, bucla întreagă. La
 * distanțe egale, golul e chiar S.
 */
function goluri(P: number, centre: readonly number[]): number[] {
  const n = centre.length;
  if (n === 1) return [P];
  const pas = centre.map((c, k) => (k === n - 1 ? (centre[0] as number) + P - c : (centre[k + 1] as number) - c));
  return centre.map((_, k) => Math.min(pas[k] as number, pas[(k - 1 + n) % n] as number));
}

/**
 * Prima ureche aleasă care nu încape (ADR 0211, „Refuzurile”): golul ei spre o vecină e sub W / 0,9 (două urechi prea
 * apropiate), sau, singură pe buclă, bucla e mai scurtă de W / 0,9. −1 dacă încap toate. Regula lui `geometrieUrechi` la
 * distanțe egale (W ≤ 0,9·S), cu golul în locul lui S.
 */
export function urecheCareNuIncape(P: number, W: number, centre: readonly number[]): number {
  return goluri(P, centre).findIndex((g) => W > 0.9 * g);
}

/**
 * Geometria urechilor la locuri alese (ADR 0211, „CAM-ul”): centrele date, crescătoare în [0, P), palierul W și flancul
 * fiecăreia din golul ei, ℓ_k = min(W / 2; 0,45·(g_k − W)). Zonele vecine nu se ating (h + ℓ_k ≤ 0,495·g_k), iar cu bucla
 * pornită în mijlocul celui mai lung gol, toate rupturile sunt în (0, P).
 */
function geometrieAleasa(P: number, W: number, centre: readonly number[]): GeometrieUrechi | string {
  const k = urecheCareNuIncape(P, W, centre);
  if (k >= 0) {
    return centre.length === 1
      ? `urechea aleasă nu încape: o ureche de ${W} mm pe o buclă de ${P.toFixed(2)} mm (cel mult ${(0.9 * P).toFixed(2)} mm)`
      : `două urechi alese sunt prea apropiate, la ${(centre[k] as number).toFixed(2)} mm pe buclă: între centre trebuie cel puțin ${(W / 0.9).toFixed(2)} mm`;
  }
  const g = goluri(P, centre);
  const flancuri = g.map((x) => Math.min(W / 2, 0.45 * (x - W)));
  return { S: Math.min(...g), h: W / 2, l: Math.min(...flancuri), centre, flancuri };
}

/**
 * Unde cade un punct pe o buclă (ADR 0211, „Proiecția”): poziția celui mai apropiat punct al ei, ca lungime de la vârful 0
 * (aceeași măsură ca `lungimeBucla` și `parcurge`: arcul ca r·|θ|), și distanța până la el. La egalitate, poziția cea mai
 * mică. Null pe o buclă fără segmente.
 */
export function proiectiePeBucla(c: Contur, p: Punct): { readonly s: number; readonly d: number } | null {
  let rez: { s: number; d: number } | null = null;
  let s0 = 0;
  for (let i = 0; i < numarSegmente(c); i++) {
    const { a, b, s } = segment(c, i);
    let L = Math.hypot(b.x - a.x, b.y - a.y);
    if (s.tip === 'A') {
      const { raza, baleiaj } = cerculArcului(a, b, s.bulge);
      L = raza * Math.abs(baleiaj);
    }
    const x = apropiat(c, i, p);
    if (!rez || x.d < rez.d) rez = { s: s0 + x.t * L, d: x.d };
    s0 += L;
  }
  return rez;
}

/**
 * Pornirea unei bucle cu urechi alese (ADR 0211, 5a): mijlocul celui mai lung gol dintre centrele ei (crescătoare), ca
 * lungime de la vârful 0; la egalitate, primul gol. Cu o singură ureche, în fața ei, la jumătatea buclei.
 */
export function pornireInGol(P: number, centre: readonly number[]): number {
  const n = centre.length;
  let k0 = 0, g0 = -1;
  for (let k = 0; k < n; k++) {
    const g = k === n - 1 ? (centre[0] as number) + P - (centre[k] as number) : (centre[k + 1] as number) - (centre[k] as number);
    if (g > g0) { g0 = g; k0 = k; }
  }
  const s = (centre[k0] as number) + g0 / 2;
  return s >= P ? s - P : s;
}

/**
 * Poziția s cade în zona unei urechi (ADR 0211): la mai puțin de h + ℓ_k de centrul ei, pe bucla de lungime P (de jur
 * împrejur). Acolo, profilul nu e la adâncimea plină, deci bucla nu poate porni de acolo.
 */
export function inZonaUrechii(g: GeometrieUrechi, s: number, P: number): boolean {
  return g.centre.some((c, k) => {
    const x = Math.abs(s - c) % P;
    return Math.min(x, P - x) < g.h + (g.flancuri[k] as number) + EPS_RUPTURA_URECHI;
  });
}

/** Rezerva pozițiilor pe buclă (mm): cât `EPS_RUPTURA` al parcurgerii. */
const EPS_RUPTURA_URECHI = 1e-6;

/**
 * Zonele urechilor pe tură, [c_k − h − ℓ_k; c_k + h + ℓ_k] (ADR 0028; ADR 0211: cu flancul fiecăreia): rampa nu-și pornește
 * trecerile strict înăuntrul uneia.
 */
export function zoneUrechi(g: GeometrieUrechi): Array<readonly [number, number]> {
  return g.centre.map((c, k) => [c - g.h - (g.flancuri[k] as number), c + g.h + (g.flancuri[k] as number)] as const);
}

/**
 * Coloanele punților pe buclă (ADR 0031, precizarea din 10.10): începutul fiecăreia, [c_k − h + R; c_k + h − R], unde puntea ține
 * grosimea (ADR 0028 §2), și lungimea lor, 2h − D. La distanțe egale, urechile se numără de la pornirea `s` a buclei; alese
 * (ADR 0211), stau pe loc, oriunde ar porni ea.
 */
export function coloaneUrechi(g: GeometrieUrechi, s: number, R: number, D: number, alese: boolean): { readonly inceputuri: number[]; readonly lungime: number } {
  return { inceputuri: g.centre.map((c) => (alese ? 0 : s) + c - g.h + R), lungime: 2 * g.h - D };
}

/** Centrele urechilor alese (crescătoare, în [0, P)) față de bucla pornită din `s`. */
export function centreDeLa(P: number, centre: readonly number[], s: number): number[] {
  return centre.map((c) => { const x = c - s; return x - Math.floor(x / P) * P; }).sort((a, b) => a - b);
}

/**
 * Urechile buclei j a unei tăieturi: la distanțe egale, aceleași; la locuri alese, centrele buclei (fără nicio ureche,
 * nimic: bucla se taie ca una fără urechi).
 */
export function urechiPeBucla(u: ParametriUrechi | undefined, j: number): ParametriUrechi | undefined {
  if (!u?.bucle) return u;
  const centre = u.bucle[j] ?? [];
  return centre.length === 0 ? undefined : { numar: centre.length, latime: u.latime, varf: u.varf, centre };
}

/**
 * Câte urechi cu palierul `latime` încap pe o buclă de lungime `lungime`, cel mult `cerute`: regula lui `geometrieUrechi`
 * (W ≤ 0,9·P / n), cu o rezervă de rotunjire, ca numărul dat să fie mereu primit. Pentru punțile dopurilor (ADR 0171, ADR
 * 0172): pe o buclă mică (punctul unui „i”) se pun câte încap, în loc să se refuze tot exportul.
 */
export function urechiCareIncap(lungime: number, latime: number, cerute: number): number {
  if (!(lungime > 0) || !(latime > 0)) return 0;
  return Math.max(0, Math.min(cerute, Math.floor(((0.9 * lungime) / latime) * (1 - 1e-9))));
}

/**
 * Rupturile profilului pe o buclă de lungime P, la o trecere de adâncime d > vârf, cu capetele (0, −d) și (P, −d). Între
 * două rupturi, Z e liniar. Întoarce motivul dacă urechile nu încap.
 */
export function noduriProfil(lungime: number, u: ParametriUrechi, d: number): readonly Nod[] | string {
  const g = geometrieUrechi(lungime, u);
  if (typeof g === 'string') return g;
  const { h } = g;
  const noduri: Nod[] = [{ s: 0, z: -d }];
  for (const [k, c] of g.centre.entries()) {
    const l = g.flancuri[k] as number;
    noduri.push({ s: c - h - l, z: -d }, { s: c - h, z: -u.varf }, { s: c + h, z: -u.varf }, { s: c + h + l, z: -d });
  }
  noduri.push({ s: lungime, z: -d });
  return noduri;
}

/**
 * Mișcările unei bucle pe o trecere care traversează urechile, de la vârful 0 (unde scula e deja la −d) înapoi la el:
 * parcurgerea buclei cu profilul urechilor (`parcurge`, cu regulile ADR 0028 §4), cu degajările colțurilor (ADR 0032).
 */
export function bucataCuUrechi(
  c: Contur, noduri: readonly Nod[], avans: number, avansPlonjare: number, degajari?: readonly Degajare[],
): RezultatParcurgere {
  return parcurge(c, noduri, avans, avansPlonjare, degajari);
}
