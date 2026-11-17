import type { Cutie } from '../geom/cutie.ts';
import type { Imbinare } from './imbinare.ts';
import type { Intre } from './taiere.ts';

/**
 * Panourile pe foi (ADR 0181 §7, felia 10.3↑l): cât loc are un panou pe foaie la „Așază pe foi” și cât iese el peste celula
 * grilei, ca mărimea implicită a panoului să încapă și ca blocul să spună, înaintea tăierii, un panou care n-ar încăpea.
 * Pur și mic: îl folosește doar blocul panourilor, pe firul principal.
 *
 * - **Ieșirea peste linie:** drumul îmbinării stă între −H/2 și +H/2 față de linie (H, înălțimea dinților), iar spațiul sau
 *   suprapunerea mută fiecare parte cu jumătate din lățime (înapoi, respectiv peste linie). Deci o bucată trece de linie cu
 *   cel mult H/2 ± lățime/2, cel puțin 0.
 * - **Locul pe foaie:** foaia fără marginile așezării, fiecare cel puțin raza celei mai mari freze a profilelor exterioare
 *   (altfel freza iese de pe foaie). „Așază pe foi” primește o piesă cât locul, nu mai mare.
 * - **Mărimea implicită:** locul fără ieșirea de pe ambele laturi tăiate (un panou din mijlocul grilei), deci orice panou
 *   încape; panourile de la margine au loc în plus.
 * - **Cel mai mare panou:** pe fiecare axă, cea mai lată fâșie a grilei cu ieșirea pe laturile ei tăiate (marginea cutiei nu
 *   e tăiată). Celula cu ambele maxime e în grilă (grila e un produs de fâșii), deci ea decide; dacă ea încape (cum e, sau
 *   rotită cu 90°, când „Așază pe foi” rotește), încap toate.
 */

/** O mărime în mm: lățimea și înălțimea. */
export type Marime = { readonly latime: number; readonly inaltime: number };

/** Toleranța „Așază pe foi” (o piesă cât locul încape, cu zgomotul calculului). */
const EPS = 1e-9;

/** Cât iese o bucată de panou peste linia unei tăieturi (mm), cu îmbinarea și cu spațiul sau suprapunerea cerute. */
export function iesirePesteLinie(imbinare: Imbinare | undefined, intre: Intre | undefined): number {
  const dinti = imbinare ? imbinare.inaltime / 2 : 0;
  const joc = intre ? (intre.fel === 'suprapunere' ? intre.latime / 2 : -intre.latime / 2) : 0;
  return Math.max(0, dinti + joc);
}

/** Locul unei piese pe foaia `stoc`, la „Așază pe foi” cu marginile date: fiecare margine, cel puțin raza frezei. */
export function locPeFoaie(stoc: Marime, margini: { readonly margineX: number; readonly margineY: number }, freza: number): Marime {
  const r = freza / 2;
  return { latime: stoc.latime - 2 * Math.max(margini.margineX, r), inaltime: stoc.inaltime - 2 * Math.max(margini.margineY, r) };
}

/** Mărimea implicită a panoului: locul, fără ieșirea de pe ambele laturi; null dacă nu rămâne nimic pe o axă. */
export function marimeImplicita(loc: Marime, iesire: number): Marime | null {
  const latime = loc.latime - 2 * iesire, inaltime = loc.inaltime - 2 * iesire;
  return latime > 0 && inaltime > 0 ? { latime, inaltime } : null;
}

/** Cea mai lată fâșie dintre `a` și `b`, tăiată la `linii` (crescătoare), cu ieșirea pe fiecare latură tăiată. */
function fasieMaxima(a: number, b: number, linii: readonly number[], iesire: number): number {
  const t = [a, ...linii, b];
  let m = 0;
  for (let j = 1; j < t.length; j++) {
    const taiate = (j > 1 ? 1 : 0) + (j < t.length - 1 ? 1 : 0);
    m = Math.max(m, (t[j] ?? 0) - (t[j - 1] ?? 0) + taiate * iesire);
  }
  return m;
}

/** Cel mai mare panou al grilei (cutia formelor și liniile ei), cu dinții, spațiul sau suprapunerea de pe laturile tăiate. */
export function celMaiMarePanou(k: Cutie, xs: readonly number[], ys: readonly number[], iesire: number): Marime {
  return { latime: fasieMaxima(k.minX, k.maxX, xs, iesire), inaltime: fasieMaxima(k.minY, k.maxY, ys, iesire) };
}

/** Panoul încape în loc: cum e sau, cu `roteste`, culcat cu 90° (ca la „Așază pe foi” cu rotirea). */
export function incapePeFoaie(panou: Marime, loc: Marime, roteste: boolean): boolean {
  const drept = panou.latime <= loc.latime + EPS && panou.inaltime <= loc.inaltime + EPS;
  return drept || (roteste && panou.inaltime <= loc.latime + EPS && panou.latime <= loc.inaltime + EPS);
}
