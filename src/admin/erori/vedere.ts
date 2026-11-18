/**
 * Fila Erori a adminului reproiectat (ADR 0260 §2, felia A.2), partea pură: filtrul pe sursă (pe ce s-a citit), eroarea
 * aleasă, aparițiile pe 14 zile (din aparițiile citite) și barele graficului lor, în SVG, fără bibliotecă.
 */
import type { RandGrup } from './date.ts';

export type FiltruSursa = 'toate' | 'client' | 'server';
export const SURSE: readonly FiltruSursa[] = ['toate', 'client', 'server'];

/** Grupurile din sursa aleasă; o sursă necunoscută apare doar la „toate”. */
export const filtreazaSursa = (r: readonly RandGrup[], s: FiltruSursa): RandGrup[] => r.filter((g) => s === 'toate' || g.sursa === s);

/** Eroarea aleasă rămâne cât e în listă; altfel prima din listă (null: lista e goală). */
export const alesDupaLista = (ales: string | null, r: readonly { readonly id: string }[]): string | null =>
  ales !== null && r.some((g) => g.id === ales) ? ales : r[0]?.id ?? null;

/**
 * Câte apariții are fiecare din ultimele `zile` zile ale calendarului local (ultima e azi), din momentele date; una
 * necunoscută, de după `acum` sau mai veche nu se numără. Zilele se socotesc între miezuri de noapte locale (o zi cu
 * schimbarea orei are 23 sau 25 de ore, deci rotunjirea).
 */
export function aparitiiPeZile(cand: readonly (Date | null)[], acum: Date, zile = 14): number[] {
  const v = new Array<number>(zile).fill(0);
  const azi = new Date(acum.getFullYear(), acum.getMonth(), acum.getDate()).getTime();
  for (const d of cand) {
    if (d === null || d.getTime() > acum.getTime()) continue;
    const k = Math.round((azi - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 86_400_000);
    if (k >= 0 && k < zile) v[zile - 1 - k] = (v[zile - 1 - k] ?? 0) + 1;
  }
  return v;
}

export interface Bara {
  readonly x: number;
  readonly latime: number;
  readonly inaltime: number;
  /** Calea SVG: baza dreaptă pe axă (`inaltime` totală), capătul de sus rotunjit; goală pentru o zi fără apariții. */
  readonly cale: string;
}

const n = (x: number): string => String(Math.round(x * 100) / 100);

/** Barele: aceeași lățime, `spatiu` între ele, cea mai înaltă la înălțimea plină, capătul rotunjit cu cel mult `raza`. */
export function baraGrafic(valori: readonly number[], latime: number, inaltime: number, spatiu = 2, raza = 4): Bara[] {
  const w = (latime - (valori.length - 1) * spatiu) / valori.length;
  const max = Math.max(0, ...valori);
  return valori.map((val, k) => {
    const x = k * (w + spatiu);
    const h = max > 0 ? (val / max) * inaltime : 0;
    if (h <= 0) return { x, latime: w, inaltime: 0, cale: '' };
    const r = Math.min(raza, h, w / 2);
    const sus = inaltime - h;
    const cale = `M${n(x)} ${n(inaltime)}V${n(sus + r)}Q${n(x)} ${n(sus)} ${n(x + r)} ${n(sus)}H${n(x + w - r)}`
      + `Q${n(x + w)} ${n(sus)} ${n(x + w)} ${n(sus + r)}V${n(inaltime)}Z`;
    return { x, latime: w, inaltime: h, cale };
  });
}
