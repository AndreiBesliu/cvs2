/**
 * Câmpurile din „Avansat” ale dialogului „Din desen…” (ADR 0191, răspunsul 3b), pe grupuri: setarea, unitatea, pasul și dacă
 * se arată ca procent; o listă (`optiuni`, fiecare cu eticheta `imprimanta.felie.o.<valoarea>`) sau o bifă (`bifa`), la
 * setările feliei 3.6k (modelele, cusătura, ștergerea, călcarea, fusta). Eticheta fiecăruia e `imprimanta.felie.c.<setarea>`, a
 * grupului `imprimanta.felie.g.<grupul>`; proba manualului cere fiecare etichetă în capitolul „imprimanta”.
 */
import {
  CALCARI, CUSATURI, FUSTE, GROSIMI_VERTICALE, material, MODELE_CALCARE, MODELE_PLIN, MODELE_RAR, setariImplicite, setariValide,
  type SetariFeliere,
} from './profil.ts';

/** Setările numerice din „Avansat” (fiecare cu eticheta ei). */
export type CheieAvansata =
  | 'strat' | 'strat1' | 'sus' | 'susMinim' | 'jos' | 'grosimeVerticala' | 'duza1' | 'pat1'
  | 'wExterior' | 'wInterior' | 'wPlin' | 'wRar' | 'wSus' | 'wPrim'
  | 'vExterior' | 'vInterior' | 'vPlin' | 'vRar' | 'vSus' | 'vPrim' | 'vPrimInfill' | 'vDeplasare'
  | 'aPereti' | 'aSus' | 'aImplicit' | 'aPrim' | 'aDeplasare' | 'retragere' | 'vitezaRetragere' | 'ridicare'
  | 'ventMin' | 'ventMax' | 'ventOprit' | 'ventAux' | 'stratMinim' | 'vitezaMinima' | 'debit' | 'volumMax'
  | 'piciorElefant' | 'suprapunereRar' | 'suprapunerePlin' | 'latimeBrim' | 'golBrim'
  | 'modelRar' | 'modelPlin' | 'modelSus' | 'modelJos' | 'unghiRar' | 'unghiPlin' | 'cusatura' | 'cusaturiDecalate' | 'golCusatura'
  | 'stergere' | 'distantaStergere' | 'retragereInainte' | 'stergereDupaRol' | 'vStergere'
  | 'calcare' | 'modelCalcare' | 'debitCalcare' | 'pasCalcare' | 'vCalcare' | 'margineCalcare' | 'unghiCalcare'
  | 'fusta' | 'distantaFusta' | 'inaltimeFusta' | 'vFusta' | 'tipFusta' | 'lungimeMinimaFusta' | 'scut' | 'unghiFusta' | 'oBuclaDupa';
export type GrupCampuri =
  | 'straturi' | 'modele' | 'temperaturi' | 'latimi' | 'viteze' | 'acceleratii' | 'retragere' | 'stergere' | 'racire' | 'material' | 'margini'
  | 'cusatura' | 'calcare' | 'fusta';
/** Valorile listelor (fiecare cu eticheta `imprimanta.felie.o.<valoarea>`). */
export type OptiuneAvansata =
  | (typeof MODELE_RAR)[number] | (typeof MODELE_PLIN)[number] | (typeof CUSATURI)[number] | (typeof CALCARI)[number]
  | (typeof MODELE_CALCARE)[number] | (typeof FUSTE)[number] | (typeof GROSIMI_VERTICALE)[number];
export type CampAvansat = {
  readonly k: CheieAvansata; readonly unitate: string; readonly pas: number; readonly procent?: true;
  readonly optiuni?: readonly OptiuneAvansata[]; readonly bifa?: true;
};
export type GrupAvansat = { readonly grup: GrupCampuri; readonly campuri: readonly CampAvansat[] };

export const CAMPURI_AVANSATE: readonly GrupAvansat[] = [
  { grup: 'straturi', campuri: [
    { k: 'strat', unitate: 'mm', pas: 0.01 }, { k: 'strat1', unitate: 'mm', pas: 0.01 }, { k: 'sus', unitate: '', pas: 1 },
    { k: 'susMinim', unitate: 'mm', pas: 0.1 }, { k: 'jos', unitate: '', pas: 1 },
    { k: 'grosimeVerticala', unitate: '', pas: 1, optiuni: GROSIMI_VERTICALE },
  ] },
  { grup: 'modele', campuri: [
    { k: 'modelRar', unitate: '', pas: 1, optiuni: MODELE_RAR }, { k: 'unghiRar', unitate: '°', pas: 1 },
    { k: 'modelPlin', unitate: '', pas: 1, optiuni: MODELE_PLIN }, { k: 'modelSus', unitate: '', pas: 1, optiuni: MODELE_PLIN },
    { k: 'modelJos', unitate: '', pas: 1, optiuni: MODELE_PLIN }, { k: 'unghiPlin', unitate: '°', pas: 1 },
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
  { grup: 'stergere', campuri: [
    { k: 'stergere', unitate: '', pas: 1, bifa: true }, { k: 'distantaStergere', unitate: 'mm', pas: 0.1 },
    { k: 'retragereInainte', unitate: '%', pas: 1, procent: true }, { k: 'stergereDupaRol', unitate: '', pas: 1, bifa: true },
    { k: 'vStergere', unitate: '%', pas: 1, procent: true },
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
  { grup: 'cusatura', campuri: [
    { k: 'cusatura', unitate: '', pas: 1, optiuni: CUSATURI }, { k: 'cusaturiDecalate', unitate: '', pas: 1, bifa: true },
    { k: 'golCusatura', unitate: 'mm', pas: 0.01 },
  ] },
  { grup: 'calcare', campuri: [
    { k: 'calcare', unitate: '', pas: 1, optiuni: CALCARI }, { k: 'modelCalcare', unitate: '', pas: 1, optiuni: MODELE_CALCARE },
    { k: 'debitCalcare', unitate: '%', pas: 1, procent: true }, { k: 'pasCalcare', unitate: 'mm', pas: 0.01 }, { k: 'vCalcare', unitate: 'mm/s', pas: 1 },
    { k: 'margineCalcare', unitate: 'mm', pas: 0.05 }, { k: 'unghiCalcare', unitate: '°', pas: 1 },
  ] },
  { grup: 'fusta', campuri: [
    { k: 'fusta', unitate: '', pas: 1 }, { k: 'distantaFusta', unitate: 'mm', pas: 0.5 }, { k: 'inaltimeFusta', unitate: '', pas: 1 },
    { k: 'vFusta', unitate: 'mm/s', pas: 1 }, { k: 'tipFusta', unitate: '', pas: 1, optiuni: FUSTE }, { k: 'lungimeMinimaFusta', unitate: 'mm', pas: 1 },
    { k: 'scut', unitate: '', pas: 1, bifa: true }, { k: 'unghiFusta', unitate: '°', pas: 1 }, { k: 'oBuclaDupa', unitate: '', pas: 1, bifa: true },
  ] },
];

/** Setările care țin de material (se iau din nou din profil la schimbarea lui); restul țin de calitate sau de om. */
export const DIN_MATERIAL: readonly (keyof SetariFeliere)[] = [
  'duza1', 'duza', 'pat1', 'pat', 'ventMin', 'ventMax', 'ventOprit', 'ventAux', 'stratMinim', 'vitezaMinima', 'debit', 'volumMax', 'retragere',
];
/** Setările care țin de calitate (se iau din nou din profil la schimbarea ei). */
export const DIN_CALITATE: readonly (keyof SetariFeliere)[] = [
  'strat', 'strat1', 'pereti', 'sus', 'susMinim', 'jos', 'vInterior', 'vPlin', 'vRar', 'vPrimInfill', 'aPereti', 'aSus', 'aImplicit', 'aPrim',
  'aDeplasare', 'suprapunereRar', 'modelRar', 'cusaturiDecalate', 'debitCalcare', 'vCalcare', 'unghiCalcare',
];

const preia = (d: SetariFeliere, k: readonly (keyof SetariFeliere)[]): Partial<SetariFeliere> => Object.fromEntries(k.map((x) => [x, d[x]]));

/** Setările cu alt material: ce ține de material vine din profilul lui (temperaturile, răcirea, debitul), restul rămâne. */
export function cuMaterial(s: SetariFeliere, id: string): SetariFeliere {
  return setariValide({ ...s, ...preia(setariImplicite(id, s.calitate), DIN_MATERIAL), material: id });
}

/** Setările cu altă calitate: ce ține de ea vine din procesul ei (straturile, pereții, vitezele, accelerațiile), restul rămâne. */
export function cuCalitate(s: SetariFeliere, id: string): SetariFeliere {
  return setariValide({ ...s, ...preia(setariImplicite(s.material, id), DIN_CALITATE), calitate: id });
}

/**
 * „Duza” sau „Patul” din Simplu: temperatura de după primul strat și, cu aceeași diferență față de ea cât are profilul
 * materialului, cea a primului strat (PC: 270 pe primul strat, 280 apoi; la celelalte, aceeași). Altfel, omul ar scrie o
 * temperatură, iar pornirea (`START_PRINT`, `M109`) ar folosi alta.
 */
export function cuTemperatura(s: SetariFeliere, ce: 'duza' | 'pat', v: number): SetariFeliere {
  const m = material(s.material);
  return ce === 'duza'
    ? setariValide({ ...s, duza: v, duza1: v + (m.duza1 - m.duza) })
    : setariValide({ ...s, pat: v, pat1: v + (m.pat1 - m.pat) });
}
