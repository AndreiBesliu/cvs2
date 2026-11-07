/**
 * Profilul felierii pieselor plate (ADR 0191 §D): imprimanta, calitățile și materialele, cu valorile din profilele Creality
 * K1C ale OrcaSlicer (duza 0,4; citite cu moștenirile rezolvate, la `9005b64`, 07.11.2026), și setările unei felieri:
 * „Simplu” alege materialul, calitatea, pereții, umplerea și brim-ul; „Avansat” le arată pe toate celelalte.
 *
 * Unitățile: mm, mm/s, mm/s², °C, procente ca fracții (0,15 = 15 %), ventilatoarele în procente (0–100).
 */

/** Imprimanta: patul, duza, filamentul, retragerea (`Creality K1C 0.4 nozzle`). */
export const K1C = {
  model: 'Creality K1C',
  setari: 'Creality K1C 0.4 nozzle',
  pat: [220, 220, 250] as const,
  duza: 0.4,
  filament: 1.75,
  /** Retragerea: lungimea, viteza, deplasarea sub care nu se retrage, ridicarea (`z_hop`) și ultima înălțime cu ridicare. */
  retragere: 0.8, vitezaRetragere: 40, deplasareFaraRetragere: 1, ridicare: 0.4, ridicareSub: 249,
  /** Viteza pe Z a ridicării și a schimbării stratului (mm/s); K1C are cel mult 10. */
  vitezaZ: 10,
  /** Colțul pătrat al lui Klipper (`square_corner_velocity`, implicitul lui), pentru estimarea timpului. */
  colt: 5,
} as const;

/** Un material (filamentul generic K1 din OrcaSlicer). */
export type Material = {
  readonly id: string; readonly nume: string; readonly tip: string;
  /** Duza și patul: pe primul strat, apoi. */
  readonly duza1: number; readonly duza: number; readonly pat1: number; readonly pat: number;
  readonly duzaMin: number; readonly duzaMax: number;
  /** Ventilatorul piesei (%), oprit pe primele straturi, între minim și maxim după timpul stratului; cel auxiliar (%). */
  readonly ventMin: number; readonly ventMax: number; readonly ventOprit: number; readonly ventSubTimp: number; readonly ventAux: number;
  /** Încetinirea pentru răcire: un strat durează cel puțin atât (s), cu viteza de cel puțin atât (mm/s). */
  readonly stratMinim: number; readonly vitezaMinima: number;
  readonly debit: number; readonly volumMax: number; readonly densitate: number;
  /** Retragerea proprie (mm), unde materialul o cere (TPU). */
  readonly retragere?: number;
};

const m = (id: string, nume: string, tip: string, duza1: number, duza: number, pat1: number, pat: number, duzaMin: number, duzaMax: number,
  ventMin: number, ventMax: number, ventOprit: number, ventSubTimp: number, ventAux: number, stratMinim: number, vitezaMinima: number,
  debit: number, volumMax: number, densitate: number, retragere?: number): Material => ({
  id, nume, tip, duza1, duza, pat1, pat, duzaMin, duzaMax, ventMin, ventMax, ventOprit, ventSubTimp, ventAux, stratMinim, vitezaMinima,
  debit, volumMax, densitate, ...(retragere === undefined ? {} : { retragere }),
});

/** Materialele, în ordinea listei: `Generic … @Creality K1-all`. */
export const MATERIALE: readonly Material[] = [
  m('pla', 'PLA', 'PLA', 220, 220, 55, 55, 190, 230, 100, 100, 1, 100, 70, 8, 20, 0.98, 18, 1.24),
  m('pla-hs', 'PLA High Speed', 'PLA', 220, 220, 55, 55, 190, 230, 100, 100, 1, 100, 70, 8, 20, 0.98, 23, 1.24),
  m('pla-matte', 'PLA Matte', 'PLA', 220, 220, 55, 55, 190, 230, 100, 100, 1, 100, 70, 8, 20, 0.98, 18, 1.24),
  m('pla-silk', 'PLA Silk', 'PLA', 220, 220, 55, 55, 190, 230, 100, 100, 1, 100, 70, 8, 20, 0.98, 7.5, 1.24),
  m('pla-cf', 'PLA-CF', 'PLA-CF', 220, 220, 60, 60, 190, 230, 100, 100, 1, 100, 0, 7, 10, 0.95, 12, 1.24),
  m('petg', 'PETG', 'PETG', 250, 250, 70, 70, 220, 270, 40, 90, 3, 30, 0, 12, 20, 0.95, 9, 1.27),
  m('abs', 'ABS', 'ABS', 260, 260, 105, 105, 240, 270, 10, 80, 3, 30, 0, 5, 20, 0.926, 14, 1.04),
  m('asa', 'ASA', 'ASA', 260, 260, 105, 105, 240, 270, 10, 80, 3, 35, 0, 3, 20, 0.926, 12, 1.04),
  m('pc', 'PC', 'PC', 270, 280, 110, 110, 260, 290, 10, 60, 3, 30, 0, 2, 20, 0.94, 16, 1.04),
  m('pa-cf', 'PA-CF', 'PA-CF', 290, 290, 100, 100, 260, 300, 10, 30, 3, 5, 0, 2, 20, 1, 8, 1.04),
  m('tpu', 'TPU', 'TPU', 230, 230, 30, 30, 200, 250, 100, 100, 1, 100, 70, 5, 10, 1, 3.5, 1.24, 0.4),
];

/** O calitate (procesul K1C de aceeași înălțime a stratului). */
export type Calitate = {
  readonly id: string; readonly nume: string;
  readonly strat: number; readonly strat1: number; readonly pereti: number; readonly sus: number; readonly susMinim: number; readonly jos: number;
  readonly vInterior: number; readonly vRar: number; readonly vPlin: number; readonly vPrimInfill: number;
  readonly aPereti: number; readonly aImplicit: number; readonly aPrim: number; readonly suprapunereRar: number;
};

/** Cele cinci procese K1C cu duza 0,4 (restul valorilor e comun, în `setariImplicite`). */
export const CALITATI: readonly Calitate[] = [
  { id: '0.08', nume: '0,08 mm', strat: 0.08, strat1: 0.2, pereti: 2, sus: 9, susMinim: 0.8, jos: 7, vInterior: 250, vRar: 350, vPlin: 250, vPrimInfill: 60, aPereti: 3000, aImplicit: 10000, aPrim: 1000, suprapunereRar: 0.3 },
  { id: '0.12', nume: '0,12 mm', strat: 0.12, strat1: 0.12, pereti: 3, sus: 5, susMinim: 0.6, jos: 3, vInterior: 300, vRar: 500, vPlin: 300, vPrimInfill: 105, aPereti: 5000, aImplicit: 12000, aPrim: 500, suprapunereRar: 0.15 },
  { id: '0.16', nume: '0,16 mm', strat: 0.16, strat1: 0.2, pereti: 2, sus: 5, susMinim: 0.8, jos: 4, vInterior: 250, vRar: 300, vPlin: 250, vPrimInfill: 60, aPereti: 3000, aImplicit: 10000, aPrim: 1000, suprapunereRar: 0.3 },
  { id: '0.20', nume: '0,20 mm', strat: 0.2, strat1: 0.2, pereti: 2, sus: 5, susMinim: 0.8, jos: 3, vInterior: 250, vRar: 270, vPlin: 250, vPrimInfill: 60, aPereti: 3000, aImplicit: 10000, aPrim: 1000, suprapunereRar: 0.3 },
  { id: '0.24', nume: '0,24 mm', strat: 0.24, strat1: 0.2, pereti: 2, sus: 5, susMinim: 0.8, jos: 3, vInterior: 250, vRar: 250, vPlin: 250, vPrimInfill: 60, aPereti: 3000, aImplicit: 10000, aPrim: 1000, suprapunereRar: 0.3 },
];

export type Brim = 'automat' | 'da' | 'nu';

/** Setările unei felieri; „Avansat” le arată pe toate. */
export type SetariFeliere = {
  readonly material: string; readonly calitate: string;
  /** Temperaturile alese (implicit, ale materialului). */
  readonly duza1: number; readonly duza: number; readonly pat1: number; readonly pat: number;
  readonly strat: number; readonly strat1: number;
  readonly pereti: number; readonly sus: number; readonly susMinim: number; readonly jos: number;
  readonly umplere: number;
  readonly brim: Brim; readonly latimeBrim: number; readonly golBrim: number;
  /** Lățimile liniilor: peretele exterior, cei interiori, plinul, umplerea rară, suprafața de sus, primul strat. */
  readonly wExterior: number; readonly wInterior: number; readonly wPlin: number; readonly wRar: number; readonly wSus: number; readonly wPrim: number;
  /** Vitezele (mm/s). */
  readonly vExterior: number; readonly vInterior: number; readonly vPlin: number; readonly vRar: number; readonly vSus: number;
  readonly vPrim: number; readonly vPrimInfill: number; readonly vDeplasare: number;
  /** Accelerațiile (mm/s²). */
  readonly aPereti: number; readonly aSus: number; readonly aImplicit: number; readonly aPrim: number; readonly aDeplasare: number;
  readonly retragere: number; readonly vitezaRetragere: number; readonly ridicare: number;
  readonly ventMin: number; readonly ventMax: number; readonly ventOprit: number; readonly ventAux: number;
  readonly stratMinim: number; readonly vitezaMinima: number;
  readonly piciorElefant: number;
  /** Suprapunerea umplerii peste pereți, ca fracție din lățimea liniei ei: rară, plină. */
  readonly suprapunereRar: number; readonly suprapunerePlin: number;
  readonly debit: number; readonly volumMax: number;
};

export const material = (id: string): Material => MATERIALE.find((x) => x.id === id) ?? MATERIALE[0]!;
export const calitate = (id: string): Calitate => CALITATI.find((x) => x.id === id) ?? CALITATI[3]!;

/** Setările implicite pentru materialul și calitatea date: tot ce n-a ales omul vine din profil. */
export function setariImplicite(idMaterial = 'pla', idCalitate = '0.20'): SetariFeliere {
  const mt = material(idMaterial), c = calitate(idCalitate);
  return {
    material: mt.id, calitate: c.id,
    duza1: mt.duza1, duza: mt.duza, pat1: mt.pat1, pat: mt.pat,
    strat: c.strat, strat1: c.strat1, pereti: c.pereti, sus: c.sus, susMinim: c.susMinim, jos: c.jos,
    umplere: 0.15, brim: 'automat', latimeBrim: 5, golBrim: 0.1,
    wExterior: 0.42, wInterior: 0.45, wPlin: 0.42, wRar: 0.45, wSus: 0.42, wPrim: 0.5,
    vExterior: 200, vInterior: c.vInterior, vPlin: c.vPlin, vRar: c.vRar, vSus: 200, vPrim: 60, vPrimInfill: c.vPrimInfill, vDeplasare: 500,
    aPereti: c.aPereti, aSus: c.id === '0.12' ? 5000 : 2000, aImplicit: c.aImplicit, aPrim: c.aPrim, aDeplasare: c.aImplicit,
    retragere: mt.retragere ?? K1C.retragere, vitezaRetragere: K1C.vitezaRetragere, ridicare: K1C.ridicare,
    ventMin: mt.ventMin, ventMax: mt.ventMax, ventOprit: mt.ventOprit, ventAux: mt.ventAux,
    stratMinim: mt.stratMinim, vitezaMinima: mt.vitezaMinima,
    piciorElefant: 0.15, suprapunereRar: c.suprapunereRar, suprapunerePlin: 0.25,
    debit: mt.debit, volumMax: mt.volumMax,
  };
}

/** Limitele fiecărei setări numerice, pentru „Avansat” și pentru setările citite din browser. */
export const LIMITE: { readonly [K in keyof SetariFeliere]?: readonly [number, number] } = {
  duza1: [150, 300], duza: [150, 300], pat1: [0, 110], pat: [0, 110], strat: [0.04, 0.32], strat1: [0.08, 0.32],
  pereti: [1, 10], sus: [0, 30], susMinim: [0, 5], jos: [0, 30], umplere: [0, 1], latimeBrim: [0, 30], golBrim: [0, 2],
  wExterior: [0.2, 0.8], wInterior: [0.2, 0.8], wPlin: [0.2, 0.8], wRar: [0.2, 0.8], wSus: [0.2, 0.8], wPrim: [0.2, 0.8],
  vExterior: [5, 600], vInterior: [5, 600], vPlin: [5, 600], vRar: [5, 600], vSus: [5, 600], vPrim: [5, 300], vPrimInfill: [5, 300],
  vDeplasare: [10, 600], aPereti: [100, 20000], aSus: [100, 20000], aImplicit: [100, 20000], aPrim: [100, 20000], aDeplasare: [100, 20000],
  retragere: [0, 5], vitezaRetragere: [5, 100], ridicare: [0, 2], ventMin: [0, 100], ventMax: [0, 100], ventOprit: [0, 10],
  ventAux: [0, 100], stratMinim: [0, 60], vitezaMinima: [1, 100], piciorElefant: [0, 1], suprapunereRar: [0, 0.5],
  suprapunerePlin: [0, 0.5], debit: [0.5, 1.5], volumMax: [1, 50],
};

/** Setările date, cu fiecare număr adus în limitele lui și cu alegerile necunoscute înlocuite de implicite. */
export function setariValide(s: Partial<Record<keyof SetariFeliere, unknown>>): SetariFeliere {
  const baza = setariImplicite(typeof s.material === 'string' ? s.material : 'pla', typeof s.calitate === 'string' ? s.calitate : '0.20');
  const rez: Record<string, unknown> = { ...baza };
  for (const k of Object.keys(LIMITE) as (keyof SetariFeliere)[]) {
    const v = s[k], l = LIMITE[k];
    if (l && typeof v === 'number' && Number.isFinite(v)) rez[k] = Math.min(l[1], Math.max(l[0], v));
  }
  for (const k of ['pereti', 'sus', 'jos', 'ventOprit'] as const) rez[k] = Math.round(rez[k] as number);
  if (s.brim === 'da' || s.brim === 'nu' || s.brim === 'automat') rez['brim'] = s.brim;
  return rez as SetariFeliere;
}

/** Secțiunea unei linii (mm²), în modelul OrcaSlicer: dreptunghi cu capete rotunde, h · (w − h · (1 − π/4)). */
export const sectiune = (w: number, h: number): number => h * (w - h * (1 - Math.PI / 4));
/** Pasul dintre două linii alăturate (mm): lățimea minus rotunjirea, ca în OrcaSlicer (`Flow::spacing`). */
export const pas = (w: number, h: number): number => w - h * (1 - Math.PI / 4);
/** Aria filamentului (mm²). */
export const ARIE_FILAMENT = Math.PI * (K1C.filament / 2) ** 2;
