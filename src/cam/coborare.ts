/**
 * Coborârea în buzunar (ADR 0076): cum ajunge freza de la fundul trecerii de dinainte (−dp; fața de sus la prima trecere) la
 * adâncimea trecerii (−d), la o intrare pe un inel (prima buclă a trecerii, sau după o ridicare). Fiecare fel pornește de
 * la Z-ul de siguranță: rapid deasupra punctului de intrare, coborâre cu avansul de plonjare până la −dp (prin aer sau prin
 * ce a scos trecerea de dinainte), apoi:
 * - **plonjare**: drept la −d, ca până în v11; apoi bucla de la vârful ei 0;
 * - **rampa**: de-a lungul buclei, de la vârful 0, cu panta `unghi`, cât e nevoie (și peste o tură), apoi o tură plină la −d;
 * - **zigzag**: dus-întors pe primii `lungime` mm ai buclei (sau pe toată, dacă e mai scurtă), în N rampe cu panta cel mult
 *   `unghi`, apoi o tură plină la −d;
 * - **elice**: pe un cerc de rază `raza`, cu centrul în bucata în care se intră (unde încape), cu panta `unghi`, apoi un cerc
 *   plin la −d, apoi drept, la −d, în punctul buclei cel mai apropiat, și bucla de acolo.
 * Toate coboară doar pe drumuri care stau în buzunar (bucla, cercul elicei din bucata ei), deci nimic nu iese din el; tura
 * plină de la −d trece peste tot ce a lăsat rampa mai sus. Avansul unei bucăți care coboară e cel al rampei profilului
 * (ADR 0029 §3): F = min(avans, avansPlonjare · L₃ / |ΔZ|).
 */
import { arc, inverseaza, type Contur, type Punct } from '../geom/contur.ts';
import { COBORARE_MINIME, type Coborare } from '../model/document.ts';
import type { Miscare } from '../ir/ir.ts';
import { bucataBuclei, lungimeBucla, parcurge, punctLa } from './parcurgere.ts';
import type { ParametriTraseu } from './traseu.ts';

const UNGHI_MINIM = COBORARE_MINIME.unghi, ZIGZAG_MINIM = COBORARE_MINIME.lungime, RAZA_ELICE_MINIMA = COBORARE_MINIME.raza;

/** Ce a scris o intrare și unde a rămas freza (pe buclă, la −d). */
export type Intrare = { readonly miscari: readonly Miscare[]; readonly la: Punct };

const tan = (unghi: number): number => Math.tan((unghi * Math.PI) / 180);

/** De ce coborârea nu se poate folosi (valorile ei), sau null. */
export function refuzCoborare(c: Coborare): string | null {
  if (c.fel === 'plonjare') return null;
  if (!(c.unghi >= UNGHI_MINIM)) return `unghiul coborârii, ${c.unghi}°, e sub ${UNGHI_MINIM}°`;
  if (c.fel === 'zigzag' && !(c.lungime >= ZIGZAG_MINIM)) return `zigzagul de ${c.lungime} mm e mai scurt de ${ZIGZAG_MINIM} mm`;
  if (c.fel === 'elice' && !(c.raza >= RAZA_ELICE_MINIMA)) return `elicea de rază ${c.raza} mm e sub ${RAZA_ELICE_MINIMA} mm`;
  return null;
}

/** Câte rampe face zigzagul pe o trecere de `pas` mm, pe o bucată de `lungime` mm, cu panta cel mult `unghi`. */
export function rampeZigzag(pas: number, lungime: number, unghi: number): number {
  return Math.max(1, Math.ceil(pas / (lungime * tan(unghi)) - 1e-9));
}

/** Rapid la Z-ul de siguranță, deasupra lui p, apoi coborârea cu avansul de plonjare până la −dp. */
function deasupra(m: Miscare[], p: Punct, dp: number, par: ParametriTraseu): void {
  m.push({ tip: 'rapida', la: { Z: par.zSigur } });
  m.push({ tip: 'rapida', la: { X: p.x, Y: p.y } });
  m.push({ tip: 'taiere', la: { Z: -dp }, avans: par.avansPlonjare });
}

function adauga(m: Miscare[], r: ReturnType<typeof parcurge>): string | null {
  if (!r.ok) return r.motiv;
  for (const x of r.miscari) m.push(x);
  return null;
}

/** Rampa pe buclă (de la vârful ei 0), apoi tura plină la −d; freza rămâne la capătul rampei. */
export function intrareRampa(b: Contur, dp: number, d: number, unghi: number, par: ParametriTraseu): Intrare | string {
  const P = lungimeBucla(b);
  const start = b.varfuri[0]?.p;
  if (!start || !(P > 0)) return 'bucla n-are lungime';
  const L = (d - dp) / tan(unghi);
  const m: Miscare[] = [];
  deasupra(m, start, dp, par);
  const e = adauga(m, parcurge(b, [{ s: 0, z: -dp }, { s: L, z: -d }, { s: L + P, z: -d }], par.avans, par.avansPlonjare));
  if (e) return e;
  const la = punctLa(b, L - Math.floor(L / P) * P)?.p ?? start;
  return { miscari: m, la };
}

/** Zigzagul pe primii `lungime` mm ai buclei, apoi tura plină la −d de unde a rămas freza. */
export function intrareZigzag(b: Contur, dp: number, d: number, unghi: number, lungime: number, par: ParametriTraseu): Intrare | string {
  const P = lungimeBucla(b);
  const start = b.varfuri[0]?.p;
  if (!start || !(P > 0)) return 'bucla n-are lungime';
  const L = Math.min(lungime, P);
  const n = rampeZigzag(d - dp, L, unghi);
  const dus = bucataBuclei(b, 0, L), intors = inverseaza(dus);
  const m: Miscare[] = [];
  deasupra(m, start, dp, par);
  for (let k = 0; k < n; k++) {
    const z0 = -(dp + ((d - dp) * k) / n), z1 = -(dp + ((d - dp) * (k + 1)) / n);
    const e = adauga(m, parcurge(k % 2 === 0 ? dus : intors, [{ s: 0, z: z0 }, { s: L, z: z1 }], par.avans, par.avansPlonjare));
    if (e) return e;
  }
  // După un număr impar de rampe, freza e la capătul bucății (s = L); după unul par, înapoi la vârful 0.
  const s = n % 2 === 1 ? L : 0;
  const e = adauga(m, parcurge(b, [{ s, z: -d }, { s: s + P, z: -d }], par.avans, par.avansPlonjare));
  if (e) return e;
  return { miscari: m, la: punctLa(b, s)?.p ?? start };
}

/**
 * Elicea în jurul lui `centru`, de rază `raza`, în sensul cerut (trigonometric la urcare: materialul de scos în dreapta
 * mersului, ca la inele), care se termină pe raza spre `spre` (punctul buclei în care continuă freza); apoi cercul plin la −d.
 * Freza rămâne pe cerc, pe raza spre `spre`.
 */
export function intrareElice(
  centru: Punct, raza: number, spre: Punct, dp: number, d: number, unghi: number, trigonometric: boolean, par: ParametriTraseu,
): Intrare | string {
  const L = (d - dp) / tan(unghi);
  // Elicea (L mm) se termină în unghiul țintei; cercul plin de după ea se închide tot acolo.
  const tinta = Math.atan2(spre.y - centru.y, spre.x - centru.x);
  const inceput = trigonometric ? tinta - L / raza : tinta + L / raza;
  const pe = (u: number): Punct => ({ x: centru.x + raza * Math.cos(u), y: centru.y + raza * Math.sin(u) });
  const semn = trigonometric ? 1 : -1;
  const cerc: Contur = { inchis: true, varfuri: [{ p: pe(inceput), s: arc(semn) }, { p: pe(inceput + Math.PI), s: arc(semn) }] };
  const m: Miscare[] = [];
  deasupra(m, pe(inceput), dp, par);
  const e = adauga(m, parcurge(cerc, [{ s: 0, z: -dp }, { s: L, z: -d }, { s: L + 2 * Math.PI * raza, z: -d }], par.avans, par.avansPlonjare));
  if (e) return e;
  return { miscari: m, la: pe(tinta) };
}

/** Plonjarea dreaptă (ca până în v11): deasupra vârfului 0, coborârea până la −d, cu avansul de plonjare. */
export function intrarePlonjare(b: Contur, d: number, par: ParametriTraseu): Intrare | string {
  const start = b.varfuri[0]?.p;
  if (!start) return 'bucla n-are vârfuri';
  const m: Miscare[] = [];
  deasupra(m, start, d, par);
  return { miscari: m, la: start };
}
