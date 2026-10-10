import type { Contur } from '../geom/contur.ts';
import type { Miscare } from '../ir/ir.ts';
import { EPS_RUPTURA, lungimeBucla, parcurge, zLa, type Nod } from './parcurgere.ts';
import { RAMPA_MINIMA } from './rampaMinima.ts';
import { EPS_VARF, geometrieUrechi, noduriProfil, type ParametriUrechi } from './urechi.ts';

/**
 * Rampa (ADR 0029): bucla se taie continuu, fără ridicare între treceri. Pe fiecare trecere k, freza coboară de la
 * −d_{k−1} la −d_k pe o rampă de Lr = min(lungime; P/2) de-a lungul buclei, apoi face o tură plină la adâncime, care trece
 * din nou peste rampă și merge până la intrarea următoare. Intrarea se rotește cu Lr și iese din zonele urechilor, ca
 * rampa să pornească exact de unde e freza. Cu urechi, rampa ia Z-ul cel mai puțin adânc dintre ea și profil.
 */
export type ParametriRampa = { readonly lungime: number };

export { RAMPA_MINIMA };

export type RezultatRampa = { readonly ok: true; readonly miscari: readonly Miscare[] } | { readonly ok: false; readonly motiv: string };

/** Profilul unei treceri pe o tură [0; P]: urechile, dacă trecerea le traversează, altfel adâncimea plină. */
function profilTura(P: number, d: number, urechi: ParametriUrechi | undefined): readonly Nod[] | string {
  if (urechi && d > urechi.varf + EPS_VARF) return noduriProfil(P, urechi, d);
  return [{ s: 0, z: -d }, { s: P, z: -d }];
}

/** Restul împărțirii la P, în [0; P). */
const peTura = (s: number, P: number): number => s - Math.floor(s / P) * P;

/** Z-ul profilului unei ture la poziția desfășurată s. */
function zProfil(tura: readonly Nod[], P: number, s: number): number {
  return zLa(tura, peTura(s, P));
}

/**
 * Nodurile profilului pe intervalul desfășurat [a; b]: capetele, cu cota lor, și rupturile din interior, din fiecare tură
 * atinsă.
 */
function noduriPe(tura: readonly Nod[], P: number, a: number, b: number): Nod[] {
  const interior: Nod[] = [];
  for (let m = Math.floor(a / P); m * P <= b; m++) {
    for (const n of tura) {
      const s = m * P + n.s;
      if (s > a + EPS_RUPTURA && s < b - EPS_RUPTURA) interior.push({ s, z: n.z });
    }
  }
  interior.sort((x, y) => x.s - y.s);
  // Capătul unei ture și începutul următoarei sunt același punct: rămâne unul.
  const rez: Nod[] = [{ s: a, z: zProfil(tura, P, a) }];
  for (const n of interior) if (n.s > (rez[rez.length - 1] as Nod).s + EPS_RUPTURA) rez.push(n);
  rez.push({ s: b, z: zProfil(tura, P, b) });
  return rez;
}

/**
 * Rampa trecerii pe [e; e + Lr]: Z = max(zR, zP), cu zR liniar de la −dPrec la −d. Nodurile sunt rupturile profilului,
 * plus punctele în care zR îl întâlnește pe zP (maximul a două funcții liniare are o frântură acolo).
 */
function noduriRampa(tura: readonly Nod[], P: number, e: number, Lr: number, dPrec: number, d: number): Nod[] {
  const zR = (s: number): number => -(dPrec + ((d - dPrec) * (s - e)) / Lr);
  const profil = noduriPe(tura, P, e, e + Lr);
  const rez: Nod[] = [];
  for (let i = 0; i < profil.length; i++) {
    const u = profil[i] as Nod;
    const capat = i === profil.length - 1;
    // La capăt, zR = −d, deci Z e exact cota profilului; la pornire, exact −dPrec (în afara zonelor urechilor).
    rez.push({ s: u.s, z: capat ? u.z : i === 0 ? Math.max(-dPrec, u.z) : Math.max(zR(u.s), u.z) });
    if (capat) break;
    const v = profil[i + 1] as Nod;
    const du = zR(u.s) - u.z, dv = zR(v.s) - v.z;
    if ((du > 0 && dv < 0) || (du < 0 && dv > 0)) {
      const s = u.s + ((v.s - u.s) * du) / (du - dv);
      if (s > u.s + EPS_RUPTURA && s < v.s - EPS_RUPTURA) rez.push({ s, z: zR(s) });
    }
  }
  return rez;
}

/**
 * Bucla c, cu toate trecerile ei (adâncimile, crescătoare), pe rampă. Freza e deasupra lui c, la Z-ul de siguranță; la
 * sfârșit rămâne la adâncime, pe buclă (ridicarea o scrie apelantul).
 */
export function buclaCuRampa(
  c: Contur, adancimi: readonly number[], rampa: ParametriRampa, urechi: ParametriUrechi | undefined,
  avans: number, avansPlonjare: number,
): RezultatRampa {
  const P = lungimeBucla(c);
  if (!(P > 0)) return { ok: true, miscari: [] };
  if (!(rampa.lungime >= RAMPA_MINIMA)) {
    return { ok: false, motiv: `rampa de ${rampa.lungime} mm e sub ${RAMPA_MINIMA} mm: ar fi o plonjare` };
  }
  const Lr = Math.min(rampa.lungime, P / 2);
  if (Lr < RAMPA_MINIMA) {
    return { ok: false, motiv: `rampa nu încape pe bucla de ${P.toFixed(3)} mm (cel puțin ${2 * RAMPA_MINIMA} mm): scoate rampa operației` };
  }
  // Zonele urechilor (aceleași pe toate trecerile): intrarea nu are voie să cadă strict înăuntrul uneia.
  const zone: Array<readonly [number, number]> = [];
  if (urechi) {
    const g = geometrieUrechi(P, urechi);
    if (typeof g === 'string') return { ok: false, motiv: g };
    for (const cc of g.centre) zone.push([cc - g.h - g.l, cc + g.h + g.l]);
  }
  const scoate = (s: number): number => {
    const t = peTura(s, P);
    for (const [lo, hi] of zone) if (t > lo && t < hi) return s + (hi - t);
    return s;
  };
  const m: Miscare[] = [];
  let e = 0;
  let dPrec = 0;
  for (let k = 0; k < adancimi.length; k++) {
    const d = adancimi[k] as number;
    const tura = profilTura(P, d, urechi);
    if (typeof tura === 'string') return { ok: false, motiv: tura };
    const ultima = k === adancimi.length - 1;
    const urmatoarea = ultima ? e + Lr : scoate(e + Lr);
    const rampaK = noduriRampa(tura, P, e, Lr, dPrec, d);
    const turaK = noduriPe(tura, P, e + Lr, urmatoarea + P);
    const r = parcurge(c, [...rampaK, ...turaK.slice(1)], avans, avansPlonjare);
    if (!r.ok) return r;
    for (const x of r.miscari) m.push(x);
    e = urmatoarea;
    dPrec = d;
  }
  return { ok: true, miscari: m };
}
