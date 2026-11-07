/**
 * Câmpurile din „Avansat” ale dialogului „Din desen…” (ADR 0191, răspunsul 3b), pe grupuri: setarea, unitatea, pasul și dacă
 * se arată ca procent. Eticheta fiecăruia e `imprimanta.felie.c.<setarea>`, a grupului `imprimanta.felie.g.<grupul>`; proba
 * manualului cere fiecare etichetă în capitolul „imprimanta”.
 */
import type { SetariFeliere } from './profil.ts';

/** Setările numerice din „Avansat” (fiecare cu eticheta ei). */
export type CheieAvansata =
  | 'strat' | 'strat1' | 'sus' | 'susMinim' | 'jos' | 'duza1' | 'pat1'
  | 'wExterior' | 'wInterior' | 'wPlin' | 'wRar' | 'wSus' | 'wPrim'
  | 'vExterior' | 'vInterior' | 'vPlin' | 'vRar' | 'vSus' | 'vPrim' | 'vPrimInfill' | 'vDeplasare'
  | 'aPereti' | 'aSus' | 'aImplicit' | 'aPrim' | 'aDeplasare' | 'retragere' | 'vitezaRetragere' | 'ridicare'
  | 'ventMin' | 'ventMax' | 'ventOprit' | 'ventAux' | 'stratMinim' | 'vitezaMinima' | 'debit' | 'volumMax'
  | 'piciorElefant' | 'suprapunereRar' | 'suprapunerePlin' | 'latimeBrim' | 'golBrim';
export type GrupCampuri = 'straturi' | 'temperaturi' | 'latimi' | 'viteze' | 'acceleratii' | 'retragere' | 'racire' | 'material' | 'margini';
export type CampAvansat = { readonly k: CheieAvansata; readonly unitate: string; readonly pas: number; readonly procent?: true };
export type GrupAvansat = { readonly grup: GrupCampuri; readonly campuri: readonly CampAvansat[] };

export const CAMPURI_AVANSATE: readonly GrupAvansat[] = [
  { grup: 'straturi', campuri: [
    { k: 'strat', unitate: 'mm', pas: 0.01 }, { k: 'strat1', unitate: 'mm', pas: 0.01 }, { k: 'sus', unitate: '', pas: 1 },
    { k: 'susMinim', unitate: 'mm', pas: 0.1 }, { k: 'jos', unitate: '', pas: 1 },
  ] },
  { grup: 'temperaturi', campuri: [{ k: 'duza1', unitate: '°C', pas: 1 }, { k: 'pat1', unitate: '°C', pas: 1 }] },
  { grup: 'latimi', campuri: [
    { k: 'wExterior', unitate: 'mm', pas: 0.01 }, { k: 'wInterior', unitate: 'mm', pas: 0.01 }, { k: 'wPlin', unitate: 'mm', pas: 0.01 },
    { k: 'wRar', unitate: 'mm', pas: 0.01 }, { k: 'wSus', unitate: 'mm', pas: 0.01 }, { k: 'wPrim', unitate: 'mm', pas: 0.01 },
  ] },
  { grup: 'viteze', campuri: [
    { k: 'vExterior', unitate: 'mm/s', pas: 1 }, { k: 'vInterior', unitate: 'mm/s', pas: 1 }, { k: 'vPlin', unitate: 'mm/s', pas: 1 },
    { k: 'vRar', unitate: 'mm/s', pas: 1 }, { k: 'vSus', unitate: 'mm/s', pas: 1 }, { k: 'vPrim', unitate: 'mm/s', pas: 1 },
    { k: 'vPrimInfill', unitate: 'mm/s', pas: 1 }, { k: 'vDeplasare', unitate: 'mm/s', pas: 1 },
  ] },
  { grup: 'acceleratii', campuri: [
    { k: 'aPereti', unitate: 'mm/s²', pas: 100 }, { k: 'aSus', unitate: 'mm/s²', pas: 100 }, { k: 'aImplicit', unitate: 'mm/s²', pas: 100 },
    { k: 'aPrim', unitate: 'mm/s²', pas: 100 }, { k: 'aDeplasare', unitate: 'mm/s²', pas: 100 },
  ] },
  { grup: 'retragere', campuri: [
    { k: 'retragere', unitate: 'mm', pas: 0.05 }, { k: 'vitezaRetragere', unitate: 'mm/s', pas: 1 }, { k: 'ridicare', unitate: 'mm', pas: 0.05 },
  ] },
  { grup: 'racire', campuri: [
    { k: 'ventMin', unitate: '%', pas: 1 }, { k: 'ventMax', unitate: '%', pas: 1 }, { k: 'ventOprit', unitate: '', pas: 1 },
    { k: 'ventAux', unitate: '%', pas: 1 }, { k: 'stratMinim', unitate: 's', pas: 1 }, { k: 'vitezaMinima', unitate: 'mm/s', pas: 1 },
  ] },
  { grup: 'material', campuri: [{ k: 'debit', unitate: '', pas: 0.01 }, { k: 'volumMax', unitate: 'mm³/s', pas: 0.5 }] },
  { grup: 'margini', campuri: [
    { k: 'piciorElefant', unitate: 'mm', pas: 0.01 }, { k: 'suprapunereRar', unitate: '%', pas: 1, procent: true },
    { k: 'suprapunerePlin', unitate: '%', pas: 1, procent: true }, { k: 'latimeBrim', unitate: 'mm', pas: 0.5 }, { k: 'golBrim', unitate: 'mm', pas: 0.05 },
  ] },
];

/** Setările care țin de material (se iau din nou din profil la schimbarea lui); restul țin de calitate sau de om. */
export const DIN_MATERIAL: readonly (keyof SetariFeliere)[] = [
  'duza1', 'duza', 'pat1', 'pat', 'ventMin', 'ventMax', 'ventOprit', 'ventAux', 'stratMinim', 'vitezaMinima', 'debit', 'volumMax', 'retragere',
];
/** Setările care țin de calitate (se iau din nou din profil la schimbarea ei). */
export const DIN_CALITATE: readonly (keyof SetariFeliere)[] = [
  'strat', 'strat1', 'pereti', 'sus', 'susMinim', 'jos', 'vInterior', 'vPlin', 'vRar', 'vPrimInfill', 'aPereti', 'aSus', 'aImplicit', 'aPrim',
  'aDeplasare', 'suprapunereRar',
];
