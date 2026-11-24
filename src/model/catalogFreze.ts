/**
 * Catalogul de freze (ADR 0302 §1, felia 16.A↑h-3): felurile pe care CAM-ul le taie azi (plata, cu planarea ca plată mare,
 * V-ul și gravarea), cu mărimile lor standard, în milimetri și în țoli. E scris de noi, din tabelul ADR-ului: nimic copiat
 * din alt program. E doar de citit; „Pune în frezele mele” face o copie în bibliotecă, a omului.
 *
 * Valorile de lucru sunt de pornire, de verificat pe material (calculatorul avansului vine cu 16.A↑g): turația după diametru,
 * avansul din tăișuri și așchia pe dinte (rotunjit din 50 în 50), plonjarea o treime din avans, pasul pe trecere din diametru.
 *
 * Catalogul se scrie din tabel, aici (~1 kB în bucata ferestrei), nu ca JSON în precache: e mai mic așa decât fișierul lui.
 */
import type { FrezaFaraNume } from './freza.ts';

export { cuDinCatalog } from './dinCatalog.ts';

/** Grupurile catalogului, în ordinea lor: planarea e o freză plată, cu grupul ei. */
export const GRUPURI_CATALOG = ['plata', 'planare', 'v', 'gravare', 'bila', 'toroidala', 'conica', 'burghiu'] as const;
export type GrupCatalog = (typeof GRUPURI_CATALOG)[number];

/** O freză a catalogului: id-ul fix și grupul ei, fără nume (îl propune fereastra, în limba omului). */
export type FrezaCatalog = FrezaFaraNume & { readonly id: string; readonly grupCatalog: GrupCatalog };

/** Mărimile în țoli, cu nota lor (scrisă în freza pusă în bibliotecă). */
const TOLI: ReadonlyMap<number, string> = new Map([
  [3.175, '1/8"'], [6.35, '1/4"'], [9.525, '3/8"'], [12.7, '1/2"'], [19.05, '3/4"'], [25.4, '1"'], [31.75, '1 1/4"'],
  [38.1, '1 1/2"'], [50.8, '2"'],
]);

/** Nota unei mărimi în țoli („1/4"”), sau nimic pentru o mărime metrică. */
export function tolFreza(diametru: number): string | undefined {
  return TOLI.get(diametru);
}

const r50 = (x: number): number => Math.max(50, Math.round(x / 50) * 50);
const turatie = (d: number): number => (d <= 3.175 ? 20000 : d <= 6.35 ? 18000 : d <= 12.7 ? 16000 : d <= 19.05 ? 14000 : 12000);
/** Așchia pe dinte în lemn (mm), după diametru. */
const aschie = (d: number): number => (d <= 2 ? 0.02 : d <= 3.175 ? 0.03 : d <= 6.35 ? 0.05 : d <= 12.7 ? 0.08 : 0.1);

/** Valorile de pornire ale unei freze cu două tăișuri (plata, planarea, V-ul). */
function lucru(d: number, pas: number, pasLateral: number): Pick<FrezaFaraNume, 'taisuri' | 'turatie' | 'avans' | 'plonjare' | 'pas' | 'pasLateral'> {
  const n = turatie(d);
  const avans = r50(n * 2 * aschie(d));
  return { taisuri: 2, turatie: n, avans, plonjare: r50(avans / 3), pas, pasLateral };
}

function plata(d: number): FrezaCatalog {
  const tais = d <= 2 ? 6 : d <= 3.175 ? 12 : d <= 6.35 ? 22 : d <= 12.7 ? 30 : 32;
  const pas = Math.min(Math.round((d / 2) * 10) / 10, 4);
  return { id: `cat-plata-${d}`, grupCatalog: 'plata', fel: 'plata', diametru: d, tais, numar: 1, ...lucru(d, pas, 40) };
}

function planare(d: number): FrezaCatalog {
  return { id: `cat-planare-${d}`, grupCatalog: 'planare', fel: 'plata', diametru: d, tais: 12, numar: 1, ...lucru(d, 1, 50) };
}

function v(unghi: number, d: number): FrezaCatalog {
  const pas = d <= 6.35 ? 1.5 : d <= 12.7 ? 2 : 3;
  return { id: `cat-v-${unghi}-${d}`, grupCatalog: 'v', fel: 'v', diametru: d, unghi, numar: 1, ...lucru(d, pas, 40) };
}

function gravare(unghi: number, varf: number, d: number): FrezaCatalog {
  return {
    id: `cat-gravare-${unghi}-${varf}-${d}`, grupCatalog: 'gravare', fel: 'gravare', diametru: d, unghi, varf, numar: 1,
    taisuri: 1, turatie: 20000, avans: 800, plonjare: 250, pas: 0.5, pasLateral: 40,
  };
}

/** Felurile noi (16.A↑h-4), în bibliotecă „în curând”: bila (pasul lateral mic, de finisare), toroidala, conica, burghiul. */
function bila(d: number): FrezaCatalog {
  const tais = d <= 2 ? 6 : d <= 3.175 ? 12 : d <= 6.35 ? 22 : 30;
  return { id: `cat-bila-${d}`, grupCatalog: 'bila', fel: 'bila', diametru: d, tais, numar: 1, ...lucru(d, Math.min(Math.round((d / 2) * 10) / 10, 3), 10) };
}

function toroidala(d: number, raza: number): FrezaCatalog {
  const tais = d <= 6.35 ? 22 : 30;
  return { id: `cat-toroidala-${d}-${raza}`, grupCatalog: 'toroidala', fel: 'toroidala', diametru: d, raza, tais, numar: 1, ...lucru(d, Math.min(d / 2, 4), 40) };
}

function conica(unghi: number, raza: number): FrezaCatalog {
  return {
    id: `cat-conica-${unghi}-${raza}`, grupCatalog: 'conica', fel: 'conica', diametru: 6.35, unghi, raza, numar: 1,
    taisuri: 2, turatie: 18000, avans: 1500, plonjare: 500, pas: 1, pasLateral: 10,
  };
}

function burghiu(d: number): FrezaCatalog {
  const tais = d <= 3 ? 12 : d <= 6 ? 30 : 50;
  return { id: `cat-burghiu-${d}`, grupCatalog: 'burghiu', fel: 'burghiu', diametru: d, unghi: 118, tais, numar: 1, ...lucru(d, Math.min(d, 6), 40) };
}

/** V-urile obișnuite: unghiul și diametrele lui. */
const V: readonly (readonly [number, readonly number[]])[] = [
  [30, [6, 12.7]], [45, [6, 12.7]], [60, [6, 12, 12.7, 25.4]], [90, [6, 12, 12.7, 25.4, 31.75]], [120, [12.7, 25.4]], [150, [12.7, 25.4]],
];

export const CATALOG_FREZE: readonly FrezaCatalog[] = [
  ...[1, 1.5, 2, 2.5, 3, 3.175, 4, 5, 6, 6.35, 8, 9.525, 10, 12, 12.7, 16, 19.05].map(plata),
  ...[19.05, 25.4, 31.75, 38.1, 50.8].map(planare),
  ...V.flatMap(([u, ds]) => ds.map((d) => v(u, d))),
  ...[10, 15, 20, 30, 45, 60].flatMap((u) => [0.1, 0.2, 0.3, 0.5].map((a) => gravare(u, a, 3.175))),
  ...[30, 45, 60].flatMap((u) => [0.2, 0.5].map((a) => gravare(u, a, 6))),
  ...[1, 1.5, 2, 3, 3.175, 4, 6, 6.35, 8, 10, 12, 12.7].map(bila),
  ...([[6, 0.5], [6, 1], [8, 1], [10, 1], [10, 2], [12, 2]] as const).map(([d, r]) => toroidala(d, r)),
  ...[10, 15, 20].flatMap((u) => [0.25, 0.5, 1].map((r) => conica(u, r))),
  ...Array.from({ length: 23 }, (_, i) => burghiu(1 + i / 2)),
];
