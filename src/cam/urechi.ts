import type { Contur } from '../geom/contur.ts';
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
};

/** O trecere traversează urechile doar dacă e mai adâncă decât vârful lor cu mai mult de atât. */
export const EPS_VARF = 1e-9;

/**
 * Unde stau urechile pe o buclă de lungime P: spațiul S, jumătatea palierului h, flancul ℓ și centrele. Nu depinde de
 * adâncime, deci și zonele urechilor, [c − h − ℓ; c + h + ℓ], sunt aceleași pe toate trecerile (ADR 0029 §2).
 */
export type GeometrieUrechi = { readonly S: number; readonly h: number; readonly l: number; readonly centre: readonly number[] };

export function geometrieUrechi(lungime: number, u: ParametriUrechi): GeometrieUrechi | string {
  const S = lungime / u.numar;
  if (u.latime > 0.9 * S) {
    return `urechile nu încap: ${u.numar} urechi de ${u.latime} mm pe o buclă de ${lungime.toFixed(2)} mm (cel mult ${(0.9 * S).toFixed(2)} mm fiecare)`;
  }
  const centre: number[] = [];
  for (let k = 0; k < u.numar; k++) centre.push((k + 0.5) * S);
  return { S, h: u.latime / 2, l: Math.min(u.latime / 2, 0.45 * (S - u.latime)), centre };
}

/**
 * Rupturile profilului pe o buclă de lungime P, la o trecere de adâncime d > vârf, cu capetele (0, −d) și (P, −d). Între
 * două rupturi, Z e liniar. Întoarce motivul dacă urechile nu încap.
 */
export function noduriProfil(lungime: number, u: ParametriUrechi, d: number): readonly Nod[] | string {
  const g = geometrieUrechi(lungime, u);
  if (typeof g === 'string') return g;
  const { h, l } = g;
  const noduri: Nod[] = [{ s: 0, z: -d }];
  for (const c of g.centre) {
    noduri.push({ s: c - h - l, z: -d }, { s: c - h, z: -u.varf }, { s: c + h, z: -u.varf }, { s: c + h + l, z: -d });
  }
  noduri.push({ s: lungime, z: -d });
  return noduri;
}

/**
 * Mișcările unei bucle pe o trecere care traversează urechile, de la vârful 0 (unde scula e deja la −d) înapoi la el:
 * parcurgerea buclei cu profilul urechilor (`parcurge`, cu regulile ADR 0028 §4).
 */
export function bucataCuUrechi(c: Contur, noduri: readonly Nod[], avans: number, avansPlonjare: number): RezultatParcurgere {
  return parcurge(c, noduri, avans, avansPlonjare);
}
