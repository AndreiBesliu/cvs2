/**
 * Cazurile oracolului degajărilor (ADR 0032), cu ZERO importuri din `src/`:
 * - `docDeg`: un document v8 cu o piesă pe fiecare formă (matricea elementului și rotirea instanței date), fiecare cu
 *   operația ei (latura, adâncimea, sensul, colțurile, urechile, rampa, intrările);
 * - `CAZURI_DEG`: cazurile pe hârtie din §8, cu valorile CERUTE scrise de mână pe fiecare colț (V, Q, E și cât intră
 *   degajarea în peretele orizontal și în cel vertical; R = 3, deci R/√2 = 2,1213203435596424 și R − R/√2 =
 *   0,8786796564403576), câte treceri, adâncimea și colțurile omise;
 * - un SCRIITOR „cum cere contractul” (`programHartie`): traseele cerute de ADR 0026 / 0027 (`traseeCerute`), cu
 *   drumul Q → E → Q pus după fiecare segment care se termină într-un Q de pe hârtie, la fiecare trecere;
 * - MARTORII NEGATIVI (`martorDeg`): transformări greșite, deliberate, ale unui program (al aplicației, în lipire), din
 *   §8 și ai mei;
 * - `corpusDegajari`: corpusul de lipire, din sămânță (mulberry32): găuri și piese de mărimi diferite, pătrate,
 *   paralelograme (forfecare), rotite și oglindite, ambele sensuri, urechi (și lângă colțuri), rampă, intrări, găuri
 *   apropiate, pe-linie, freze Ø3,175 / Ø6 / Ø8, foi de 6–18 mm.
 */
import { migreazaV4V8O, type ColturiO, type DocV8O, type IntrariO, type LaturaO, type MatriceO, type RampaO, type SensO, type UrechiO } from './document.ts';
import { aleator, cerc, documentRegiune, drept, ID, laMasina, type Montaj, type Stoc, type Traseu } from './regiune.cazuri.ts';
import { segment, type FormaO, type Primitiva } from './regiune.ts';

type P2 = { readonly x: number; readonly y: number };
const p = (x: number, y: number): P2 => ({ x, y });

// ---------------------------------------------------------------------------------------------------------------
// Documentul.

export type FormaDeg = {
  readonly id: string; readonly forma: FormaO; readonly x: number; readonly y: number;
  readonly rotire?: number; readonly matrice?: MatriceO;
  readonly latura: LaturaO; readonly adancime: number; readonly sens?: SensO;
  readonly colturi?: ColturiO | null; readonly urechi?: UrechiO | null; readonly rampa?: RampaO | null; readonly intrari?: IntrariO | null;
  /** O a doua operație pe aceeași formă (degroșare + finisare, sau pe-linie peste interior). */
  readonly aDoua?: { readonly latura: LaturaO; readonly adancime: number; readonly colturi?: ColturiO | null; readonly sens?: SensO };
};

export const dog = (): ColturiO => ({ tip: 'dog-bone' });
export const tee = (): ColturiO => ({ tip: 't-bone' });

/** Un document v8: o piesă pe fiecare formă, pusă o dată (`<id>/<id>` în lume). */
export function docDeg(stoc: Stoc, forme: readonly FormaDeg[], o: { readonly diametru: number; readonly pas: number }): DocV8O {
  const v4 = documentRegiune(
    stoc,
    forme.map((f) => ({
      id: f.id,
      elemente: [{
        id: f.id, forma: f.forma, matrice: f.matrice ?? ID, laturi: f.aDoua ? [f.latura, f.aDoua.latura] : [f.latura],
        adancime: f.adancime, sensuri: f.aDoua ? [f.sens ?? 'urcare', f.aDoua.sens ?? f.sens ?? 'urcare'] : [f.sens ?? 'urcare'],
      }],
    })),
    forme.map((f) => ({ id: f.id, piesa: f.id, x: f.x, y: f.y, rotire: f.rotire ?? 0 })),
    { diametru: o.diametru, pas: o.pas },
  );
  const v8 = migreazaV4V8O(v4);
  v8.piese.forEach((pz, k) => {
    const f = forme[k]!;
    pz.operatii.forEach((op, j) => {
      if (j === 0) {
        op.colturi = f.colturi ?? null;
        op.urechi = f.urechi ?? null;
        op.rampa = f.rampa ?? null;
        op.intrari = f.intrari ?? null;
      } else {
        op.adancime = f.aDoua!.adancime;
        op.colturi = f.aDoua!.colturi ?? null;
      }
    });
  });
  return v8;
}

// ---------------------------------------------------------------------------------------------------------------
// Cazurile pe hârtie (§8). Freza Ø6 (R = 3).

/** R/√2 și R − R/√2 pentru R = 3, scrise ca numere. */
const S2 = 2.1213203435596424;
const I2 = 0.8786796564403576;

/** Un colț pe hârtie: V, Q, E, cât intră în peretele orizontal (prin V) și în cel vertical; normalele lor spre deșeu. */
export type ColtHartie = {
  readonly forma: string;
  readonly V: P2; readonly Q: P2; readonly E: P2;
  readonly inOrizontal: number; readonly inVertical: number;
  readonly nOrizontal: P2; readonly nVertical: P2;
};

export type CazDeg = {
  readonly nume: string;
  readonly stoc: Stoc;
  readonly D: number;
  readonly pas: number;
  readonly doc: DocV8O;
  /** Colțurile cu drum (la fiecare trecere), pe hârtie. */
  readonly colturi: readonly ColtHartie[];
  /** Colțurile omise (cu avertisment): V-ul lor. */
  readonly omise: readonly P2[];
  /**
   * Avertismentele de degajare cerute, cu textul exact (precizarea din 11.10: „<idLume>: degajarea omisă la colțul (x, y):
   * <motiv>” și „<idLume>: colțul rotunjit cu raza r mm (sub raza frezei, R mm) …”), scrise de mână.
   */
  readonly avertismente: readonly string[];
  /** Perechi de colțuri (V₁, V₂) față în față, cu golul cerut dintre crestăturile lor (|E₁E₂| − 2R), mm. */
  readonly intre?: ReadonlyArray<readonly [P2, P2, number]>;
  /** Câte sosiri (deci câte drumuri) pe fiecare colț păstrat; adâncimea finală a colțului. */
  readonly sosiri: number;
  readonly adancime: number;
  /** Fără nicio degajare în program (exteriorul): programul e cel fără `colturi`, octet cu octet. */
  readonly faraDrumuri?: boolean;
  /**
   * Când contează vârful 0 (urechile și rampa se numără de la el): colțurile `colturi` sunt în ordinea de mers, iar
   * vârful 0 al programului e Q-ul unuia dintre ele; `omiseDinVarf0` = indicii (de la vârful 0, în ordinea de mers) ai
   * colțurilor omise; `zuriDinVarf0` = Z-urile drumurilor fiecărui colț, în ordinea programului.
   */
  readonly omiseDinVarf0?: readonly number[];
  readonly zuriDinVarf0?: ReadonlyArray<readonly number[]>;
};

const FOAIE: Stoc = { latime: 160, inaltime: 120, grosime: 12 };

/** Gaura 40 × 30 la (60, 45): colțurile V în lume, cu normalele pereților spre deșeu (înăuntrul găurii). */
export const G40 = { st: 60, dr: 100, jos: 45, sus: 75 } as const;

/** Dog-bone în gaura [x0, x1] × [y0, y1]: E la (R/√2, R/√2) de fiecare colț, spre interior. */
export function dogBone(forma: string, g: { readonly st: number; readonly dr: number; readonly jos: number; readonly sus: number }): ColtHartie[] {
  return [
    { forma, V: p(g.st, g.jos), Q: p(g.st + 3, g.jos + 3), E: p(g.st + S2, g.jos + S2), inOrizontal: I2, inVertical: I2, nOrizontal: p(0, 1), nVertical: p(1, 0) },
    { forma, V: p(g.dr, g.jos), Q: p(g.dr - 3, g.jos + 3), E: p(g.dr - S2, g.jos + S2), inOrizontal: I2, inVertical: I2, nOrizontal: p(0, 1), nVertical: p(-1, 0) },
    { forma, V: p(g.dr, g.sus), Q: p(g.dr - 3, g.sus - 3), E: p(g.dr - S2, g.sus - S2), inOrizontal: I2, inVertical: I2, nOrizontal: p(0, -1), nVertical: p(-1, 0) },
    { forma, V: p(g.st, g.sus), Q: p(g.st + 3, g.sus - 3), E: p(g.st + S2, g.sus - S2), inOrizontal: I2, inVertical: I2, nOrizontal: p(0, -1), nVertical: p(1, 0) },
  ];
}

/** T-bone cu pereții lungi orizontali (gaura mai lată decât înaltă): crestăturile în pereții orizontali, E = V ± (R, 0). */
export function teeOrizontal(forma: string, g: { readonly st: number; readonly dr: number; readonly jos: number; readonly sus: number }): ColtHartie[] {
  return [
    { forma, V: p(g.st, g.jos), Q: p(g.st + 3, g.jos + 3), E: p(g.st + 3, g.jos), inOrizontal: 3, inVertical: 0, nOrizontal: p(0, 1), nVertical: p(1, 0) },
    { forma, V: p(g.dr, g.jos), Q: p(g.dr - 3, g.jos + 3), E: p(g.dr - 3, g.jos), inOrizontal: 3, inVertical: 0, nOrizontal: p(0, 1), nVertical: p(-1, 0) },
    { forma, V: p(g.dr, g.sus), Q: p(g.dr - 3, g.sus - 3), E: p(g.dr - 3, g.sus), inOrizontal: 3, inVertical: 0, nOrizontal: p(0, -1), nVertical: p(-1, 0) },
    { forma, V: p(g.st, g.sus), Q: p(g.st + 3, g.sus - 3), E: p(g.st + 3, g.sus), inOrizontal: 3, inVertical: 0, nOrizontal: p(0, -1), nVertical: p(1, 0) },
  ];
}

/** T-bone cu pereții lungi verticali (gaura mai înaltă decât lată): E = V ± (0, R), crestăturile în pereții verticali. */
export function teeVertical(forma: string, g: { readonly st: number; readonly dr: number; readonly jos: number; readonly sus: number }): ColtHartie[] {
  return [
    { forma, V: p(g.st, g.jos), Q: p(g.st + 3, g.jos + 3), E: p(g.st, g.jos + 3), inOrizontal: 0, inVertical: 3, nOrizontal: p(0, 1), nVertical: p(1, 0) },
    { forma, V: p(g.dr, g.jos), Q: p(g.dr - 3, g.jos + 3), E: p(g.dr, g.jos + 3), inOrizontal: 0, inVertical: 3, nOrizontal: p(0, 1), nVertical: p(-1, 0) },
    { forma, V: p(g.dr, g.sus), Q: p(g.dr - 3, g.sus - 3), E: p(g.dr, g.sus - 3), inOrizontal: 0, inVertical: 3, nOrizontal: p(0, -1), nVertical: p(-1, 0) },
    { forma, V: p(g.st, g.sus), Q: p(g.st + 3, g.sus - 3), E: p(g.st, g.sus - 3), inOrizontal: 0, inVertical: 3, nOrizontal: p(0, -1), nVertical: p(1, 0) },
  ];
}

const doarCu = (cs: readonly ColtHartie[], pastrat: (c: ColtHartie) => boolean): ColtHartie[] => cs.filter(pastrat);

/** Gaura pătrată 30 × 30 la (60, 45) cu T-bone: la egalitate, crestătura în peretele laturii de DUPĂ V, în sensul de mers. */
const P30 = { st: 60, dr: 90, jos: 45, sus: 75 } as const;
/**
 * Urcare (gaura: trigonometric, deci (60,45) → (90,45) → (90,75) → (60,75)): în (60,45) latura de după e cea de jos,
 * deci E pe ea: (63,45); în (90,45) după e cea din dreapta: (90,48); în (90,75) sus: (87,75); în (60,75) stânga: (60,72).
 */
const P30_URCARE: ColtHartie[] = [
  { forma: 'p', V: p(60, 45), Q: p(63, 48), E: p(63, 45), inOrizontal: 3, inVertical: 0, nOrizontal: p(0, 1), nVertical: p(1, 0) },
  { forma: 'p', V: p(90, 45), Q: p(87, 48), E: p(90, 48), inOrizontal: 0, inVertical: 3, nOrizontal: p(0, 1), nVertical: p(-1, 0) },
  { forma: 'p', V: p(90, 75), Q: p(87, 72), E: p(87, 75), inOrizontal: 3, inVertical: 0, nOrizontal: p(0, -1), nVertical: p(-1, 0) },
  { forma: 'p', V: p(60, 75), Q: p(63, 72), E: p(60, 72), inOrizontal: 0, inVertical: 3, nOrizontal: p(0, -1), nVertical: p(1, 0) },
];
/** Opoziție (orar: (60,45) → (60,75) → (90,75) → (90,45)): în (60,45) după e stânga: (60,48); etc. */
const P30_OPOZITIE: ColtHartie[] = [
  { forma: 'p', V: p(60, 45), Q: p(63, 48), E: p(60, 48), inOrizontal: 0, inVertical: 3, nOrizontal: p(0, 1), nVertical: p(1, 0) },
  { forma: 'p', V: p(60, 75), Q: p(63, 72), E: p(63, 75), inOrizontal: 3, inVertical: 0, nOrizontal: p(0, -1), nVertical: p(1, 0) },
  { forma: 'p', V: p(90, 75), Q: p(87, 72), E: p(90, 72), inOrizontal: 0, inVertical: 3, nOrizontal: p(0, -1), nVertical: p(-1, 0) },
  { forma: 'p', V: p(90, 45), Q: p(87, 48), E: p(87, 45), inOrizontal: 3, inVertical: 0, nOrizontal: p(0, 1), nVertical: p(-1, 0) },
];

const caz = (
  nume: string, forme: readonly FormaDeg[], colturi: readonly ColtHartie[], o: {
    readonly stoc?: Stoc; readonly omise?: readonly P2[]; readonly sosiri?: number; readonly adancime?: number; readonly pas?: number; readonly faraDrumuri?: boolean;
    readonly omiseDinVarf0?: readonly number[]; readonly zuriDinVarf0?: ReadonlyArray<readonly number[]>;
    readonly avertismente?: readonly string[]; readonly intre?: ReadonlyArray<readonly [P2, P2, number]>;
  } = {},
): CazDeg => {
  const stoc = o.stoc ?? FOAIE;
  const pas = o.pas ?? 3;
  return {
    nume, stoc, D: 6, pas, doc: docDeg(stoc, forme, { diametru: 6, pas }), colturi, omise: o.omise ?? [], avertismente: o.avertismente ?? [],
    ...(o.intre ? { intre: o.intre } : {}), sosiri: o.sosiri ?? 2, adancime: o.adancime ?? 6,
    ...(o.faraDrumuri ? { faraDrumuri: true } : {}),
    ...(o.omiseDinVarf0 ? { omiseDinVarf0: o.omiseDinVarf0 } : {}), ...(o.zuriDinVarf0 ? { zuriDinVarf0: o.zuriDinVarf0 } : {}),
  };
};

const gaura = (id: string, x: number, y: number, w: number, h: number, extra: Partial<FormaDeg> = {}): FormaDeg => ({
  id, forma: drept(w, h), x, y, latura: 'interior', adancime: 6, ...extra,
});

export const CAZURI_DEG: readonly CazDeg[] = [
  caz('D01 gaura 40 × 30, Ø6, dog-bone, urcare: E la (R/√2, R/√2) de fiecare colț, spre interior', [gaura('g', 60, 45, 40, 30, { colturi: dog(), sens: 'urcare' })], dogBone('g', G40)),
  caz('D02 gaura 40 × 30, Ø6, dog-bone, opoziție', [gaura('g', 60, 45, 40, 30, { colturi: dog(), sens: 'opozitie' })], dogBone('g', G40)),
  caz('D03 gaura 40 × 30 cu T-bone, urcare: crestăturile în pereții de 40', [gaura('g', 60, 45, 40, 30, { colturi: tee(), sens: 'urcare' })], teeOrizontal('g', G40)),
  caz('D04 gaura 40 × 30 cu T-bone, opoziție: tot în pereții de 40', [gaura('g', 60, 45, 40, 30, { colturi: tee(), sens: 'opozitie' })], teeOrizontal('g', G40)),
  caz('D05 gaura 30 × 40 cu T-bone: crestăturile în pereții de 40 (verticali)', [gaura('g', 60, 40, 30, 40, { colturi: tee(), sens: 'urcare' })], teeVertical('g', { st: 60, dr: 90, jos: 40, sus: 80 })),
  caz('D06 gaura pătrată 30 × 30 cu T-bone, urcare: egalitatea, peretele laturii de după V', [gaura('p', 60, 45, 30, 30, { colturi: tee(), sens: 'urcare' })], P30_URCARE),
  caz('D07 gaura pătrată 30 × 30 cu T-bone, opoziție: egalitatea, peretele laturii de după V (alt perete)', [gaura('p', 60, 45, 30, 30, { colturi: tee(), sens: 'opozitie' })], P30_OPOZITIE),
  caz('D08 dreptunghiul 50 × 30 tăiat exterior cu colturi (dog-bone și T-bone): niciun drum', [
    { id: 'a', forma: drept(50, 30), x: 20, y: 20, latura: 'exterior', adancime: 6, colturi: dog() },
    { id: 'b', forma: drept(50, 30), x: 90, y: 70, latura: 'exterior', adancime: 6, colturi: tee(), sens: 'opozitie' },
  ], [], { faraDrumuri: true }),
  caz('D09 cercul R12 și dreptunghiul 40 × 30 cu colțurile R5, interior, cu colturi: niciun drum', [
    { id: 'c', forma: cerc(12), x: 40, y: 40, latura: 'interior', adancime: 6, colturi: dog() },
    { id: 'r', forma: drept(40, 30, 5), x: 90, y: 60, latura: 'interior', adancime: 6, colturi: tee() },
  ], [], { faraDrumuri: true }),
  caz('D10 gaura 40 × 30 dog-bone, cu urechi 4 × 8 × 2 (foaia 12, adâncimea 12, pasul 4): drumul la Z-ul profilului, urechile pe aceleași poziții', [
    gaura('g', 60, 45, 40, 30, { colturi: dog(), adancime: 12, urechi: { numar: 4, latime: 8, grosime: 2 } }),
  ], dogBone('g', G40), { sosiri: 3, adancime: 12, pas: 4 }),
  caz('D11 gaura 40 × 30 dog-bone, cu rampa de 40 (trece prin colțul de la s = 34): drumul la Z-ul rampei, tura îl reface la adâncime', [
    gaura('g', 60, 45, 40, 30, { colturi: dog(), rampa: { lungime: 40 } }),
  ], dogBone('g', G40), {
    // P = 116, Lr = 40; colțurile la s = 0, 34, 58, 92 de la vârful 0. Trecerea 1: rampa [0, 40] (de la 0 la −3) trece prin
    // 34 la −3·34/40 = −2,55; tura [40, 156] la −3 trece prin 58, 92, 116 și 150 (= 34). Trecerea 2: rampa [156, 196] (de la
    // −3 la −6) trece prin 174 (= 58) la −3 − 3·18/40 = −4,35; tura [196, 312] la −6 prin 208, 232, 266, 290.
    sosiri: 0, zuriDinVarf0: [[-3, -6], [-2.55, -3, -6], [-3, -4.35, -6], [-3, -6]],
  }),
  caz('D12 gaura 40 × 30 T-bone, cu intrările de 3 (p₀ la mijlocul unei laturi lungi)', [
    gaura('g', 60, 45, 40, 30, { colturi: tee(), intrari: { raza: 3 } }),
  ], teeOrizontal('g', G40)),
  caz('D13 gaura 40 × 30 dog-bone, cu rampa de 10 și intrările de 3 (rampa pe sfertul intrării, ADR 0031)', [
    gaura('g', 60, 45, 40, 30, { colturi: dog(), rampa: { lungime: 10 }, intrari: { raza: 3 } }),
  ], dogBone('g', G40)),
  caz('D14 două găuri 30 × 40 la 3 mm, T-bone: crestăturile spre vecina s-ar apropia la 6 < D + 1 de bucla ei, deci se omit', [
    gaura('s', 20, 40, 30, 40, { colturi: tee() }), gaura('d', 53, 40, 30, 40, { colturi: tee() }),
  ], [
    ...doarCu(teeVertical('s', { st: 20, dr: 50, jos: 40, sus: 80 }), (c) => c.V.x === 20),
    ...doarCu(teeVertical('d', { st: 53, dr: 83, jos: 40, sus: 80 }), (c) => c.V.x === 83),
  ], {
    omise: [p(50, 40), p(50, 80), p(53, 40), p(53, 80)],
    avertismente: [
      's/s: degajarea omisă la colțul (50.000, 40.000): prea aproape de altă buclă', 's/s: degajarea omisă la colțul (50.000, 80.000): prea aproape de altă buclă',
      'd/d: degajarea omisă la colțul (53.000, 40.000): prea aproape de altă buclă', 'd/d: degajarea omisă la colțul (53.000, 80.000): prea aproape de altă buclă',
    ],
  }),
  caz('D15 două găuri 30 × 40 la 3 mm, dog-bone: drumul stă la 8,12 ≥ D + 1 de vecina, deci toate rămân', [
    gaura('s', 20, 40, 30, 40, { colturi: dog() }), gaura('d', 53, 40, 30, 40, { colturi: dog() }),
  ], [...dogBone('s', { st: 20, dr: 50, jos: 40, sus: 80 }), ...dogBone('d', { st: 53, dr: 83, jos: 40, sus: 80 })]),
  caz('D16 două găuri 30 × 40 la 1 mm, dog-bone: drumul stă la 6,12 < D + 1 de vecina, deci se omit spre ea', [
    gaura('s', 20, 40, 30, 40, { colturi: dog() }), gaura('d', 51, 40, 30, 40, { colturi: dog() }),
  ], [
    ...doarCu(dogBone('s', { st: 20, dr: 50, jos: 40, sus: 80 }), (c) => c.V.x === 20),
    ...doarCu(dogBone('d', { st: 51, dr: 81, jos: 40, sus: 80 }), (c) => c.V.x === 81),
  ], {
    omise: [p(50, 40), p(50, 80), p(51, 40), p(51, 80)],
    avertismente: [
      's/s: degajarea omisă la colțul (50.000, 40.000): prea aproape de altă buclă', 's/s: degajarea omisă la colțul (50.000, 80.000): prea aproape de altă buclă',
      'd/d: degajarea omisă la colțul (51.000, 40.000): prea aproape de altă buclă', 'd/d: degajarea omisă la colțul (51.000, 80.000): prea aproape de altă buclă',
    ],
  }),
  caz('D18 gaura 40 × 30 dog-bone, cu 2 urechi de 8 × 2 (foaia 12, adâncimea 12, pasul 4): c = 29 și 87 de la vârful 0; coloanele [28, 30] și [86, 88] sunt la 4 < D de colțurile de la s = 34 și 92, deci acelea se omit', [
    gaura('g', 60, 45, 40, 30, { colturi: dog(), adancime: 12, urechi: { numar: 2, latime: 8, grosime: 2 } }),
  ], dogBone('g', G40), {
    sosiri: 3, adancime: 12, pas: 4, omiseDinVarf0: [1, 3],
    // Cu vârful 0 în (63, 48) (urcare, trigonometric): colțurile de la s = 34 și 92 au V (100, 45) și (60, 75).
    avertismente: ['g/g: degajarea omisă la colțul (100.000, 45.000): ar tăia puntea unei urechi', 'g/g: degajarea omisă la colțul (60.000, 75.000): ar tăia puntea unei urechi'],
  }),
  // Precizarea din 11.10, §5 a (candidații): găurile 40 × 30 una peste alta, T-bone (crestăturile în pereții de 40,
  // orizontali). Jos [60, 100] × [20, 50], sus [60, 100] × [55, 85]: drumurile colțurilor de sus ale găurii de jos
  // ((63, 47) → (63, 50)) și de jos ale celei de sus ((63, 58) → (63, 55)) sunt la 5 < D + 1 una de alta, deși fiecare e la
  // 8 de traseul vecinei (y = 58, y = 47): toate patru se omit, cu motivul candidaților.
  caz('D19 două găuri 40 × 30 una peste alta, T-bone, peretele de 5 mm: crestăturile față în față se omit toate patru („prea aproape de degajarea altei bucle”)', [
    gaura('j', 60, 20, 40, 30, { colturi: tee() }), gaura('s', 60, 55, 40, 30, { colturi: tee() }),
  ], [
    ...doarCu(teeOrizontal('j', { st: 60, dr: 100, jos: 20, sus: 50 }), (c) => c.V.y === 20),
    ...doarCu(teeOrizontal('s', { st: 60, dr: 100, jos: 55, sus: 85 }), (c) => c.V.y === 85),
  ], {
    omise: [p(60, 50), p(100, 50), p(60, 55), p(100, 55)],
    avertismente: [
      'j/j: degajarea omisă la colțul (60.000, 50.000): prea aproape de degajarea altei bucle', 'j/j: degajarea omisă la colțul (100.000, 50.000): prea aproape de degajarea altei bucle',
      's/s: degajarea omisă la colțul (60.000, 55.000): prea aproape de degajarea altei bucle', 's/s: degajarea omisă la colțul (100.000, 55.000): prea aproape de degajarea altei bucle',
    ],
  }),
  // Peretele de 7 mm: drumurile la exact D + 1 = 7 (rămân); între crestături, |E₁E₂| − 2R = 7 − 6 = 1 mm de material.
  caz('D20 două găuri 40 × 30 una peste alta, T-bone, peretele de 7 mm: toate crestăturile rămân, cu exact 1 mm între cele față în față', [
    gaura('j', 60, 20, 40, 30, { colturi: tee() }), gaura('s', 60, 57, 40, 30, { colturi: tee() }),
  ], [...teeOrizontal('j', { st: 60, dr: 100, jos: 20, sus: 50 }), ...teeOrizontal('s', { st: 60, dr: 100, jos: 57, sus: 87 })], {
    intre: [[p(60, 50), p(60, 57), 1], [p(100, 50), p(100, 57), 1]],
  }),
  // §5 c (marginea foii). Gaura 30 × 40 la x = 2, T-bone (pereții lungi verticali): crestăturile din stânga au E pe x = 2,
  // deci discul ajunge la x = −1 (golul −1); bucla are golul 2 (x = 5 − 3), deci cerința e min(1, 2) = 1: se omit.
  caz('D21 gaura 30 × 40 la 2 mm de marginea din stânga, T-bone: crestăturile din stânga ar ieși din foaie, se omit („prea aproape de marginea foii”)', [
    gaura('g', 2, 40, 30, 40, { colturi: tee() }),
  ], doarCu(teeVertical('g', { st: 2, dr: 32, jos: 40, sus: 80 }), (c) => c.V.x === 32), {
    omise: [p(2, 40), p(2, 80)],
    avertismente: ['g/g: degajarea omisă la colțul (2.000, 40.000): prea aproape de marginea foii', 'g/g: degajarea omisă la colțul (2.000, 80.000): prea aproape de marginea foii'],
  }),
  // Dog-bone la 2 mm: E.x = 2 + R/√2 = 4,1213, discul la 1,1213 ≥ 1 de margine: rămân toate.
  caz('D22 gaura 30 × 40 la 2 mm de marginea din stânga, dog-bone: discul drumului rămâne la 1,121 ≥ 1 mm de margine; toate rămân', [
    gaura('g', 2, 40, 30, 40, { colturi: dog() }),
  ], dogBone('g', { st: 2, dr: 32, jos: 40, sus: 80 })),
  // Dog-bone la 1,5 mm: discul la 0,6213 < min(1, 1,5): se omit cele din stânga.
  caz('D23 gaura 30 × 40 la 1,5 mm de margine, dog-bone: discul drumului ar ajunge la 0,621 < 1 mm, deci se omit cele din stânga', [
    gaura('g', 1.5, 40, 30, 40, { colturi: dog() }),
  ], doarCu(dogBone('g', { st: 1.5, dr: 31.5, jos: 40, sus: 80 }), (c) => c.V.x === 31.5), {
    omise: [p(1.5, 40), p(1.5, 80)],
    avertismente: ['g/g: degajarea omisă la colțul (1.500, 40.000): prea aproape de marginea foii', 'g/g: degajarea omisă la colțul (1.500, 80.000): prea aproape de marginea foii'],
  }),
  // Bucla însăși la 0,5 mm de margine (gaura la x = 0,5): T-bone cu pereții lungi orizontali, E = (3,5, y), discul la
  // exact 0,5 = golul buclei: drumul poate ajunge cât bucla, deci rămân toate.
  caz('D24 gaura 40 × 30 la 0,5 mm de margine, T-bone în pereții orizontali: discul drumului ajunge exact cât bucla (0,5 mm), deci rămân', [
    gaura('g', 0.5, 45, 40, 30, { colturi: tee() }),
  ], teeOrizontal('g', { st: 0.5, dr: 40.5, jos: 45, sus: 75 })),
  // §2 (precizarea din 11.10): arcele sub R nu primesc degajare, ci câte un avertisment.
  caz('D25 gaura 40 × 30 cu colțurile R2 (sub R = 3), dog-bone: niciun drum, patru avertismente „colțul rotunjit cu raza 2.000 mm”', [
    { id: 'r', forma: drept(40, 30, 2), x: 60, y: 45, latura: 'interior', adancime: 6, colturi: dog() },
  ], [], {
    faraDrumuri: true,
    avertismente: Array.from({ length: 4 }, () => 'r/r: colțul rotunjit cu raza 2.000 mm (sub raza frezei, 3.000 mm) rămâne cu raza frezei; degajarea pe arce vine cu importul SVG'),
  }),
  // Arcul de 1e-7 (lungimea lui, π/2·1e-7, sub 1e-6) e scos la curățare: colțul e ascuțit, ca la D01.
  caz('D26 gaura 40 × 30 cu colțurile R1e-7 (arcul scos la curățare), dog-bone: colțurile sunt ascuțite, drumurile ca la D01, fără avertismente', [
    { id: 'g', forma: drept(40, 30, 1e-7), x: 60, y: 45, latura: 'interior', adancime: 6, colturi: dog() },
  ], dogBone('g', G40)),
  caz('D17 placa 2: piesa 120 × 80 cu colțurile R10 (urechi 4 × 8 × 2), MDF 12, adâncimea 12, pasul 4; gaura 40 × 30 cu dog-bone', [
    { id: 'piesa', forma: drept(120, 80, 10), x: 20, y: 20, latura: 'exterior', adancime: 12, urechi: { numar: 4, latime: 8, grosime: 2 } },
    gaura('g', 60, 45, 40, 30, { colturi: dog(), adancime: 12 }),
  ], dogBone('g', G40), { sosiri: 3, adancime: 12, pas: 4 }),
];

/** D11: sosirile cu rampă nu sunt câte una pe trecere (rampa trece prin colț și tura îl reface); se numără în test. */
export const SOSIRI_RAMPA = 'cu rampă';

// ---------------------------------------------------------------------------------------------------------------
// Scriitorul de pe hârtie: drumul Q → E → Q după fiecare segment care se termină în Q.

/** Traseele cu drumurile puse după fiecare sosire într-un Q de pe hârtie (`colturi`), la fiecare trecere. */
export function cuDrumuri(trasee: readonly Traseu[], colturi: readonly ColtHartie[]): Traseu[] {
  return trasee.map((t) => {
    const ps: Primitiva[] = [];
    for (const q of t.primitive) {
      ps.push(q);
      if (q.tip !== 'segment') continue;
      const c = colturi.find((x) => Math.hypot(x.Q.x - q.b.x, x.Q.y - q.b.y) <= 1e-9);
      if (c) ps.push(segment(c.Q, c.E), segment(c.E, c.Q));
    }
    return { ...t, primitive: ps };
  });
}

// ---------------------------------------------------------------------------------------------------------------
// Martorii negativi: transformări greșite ale unui program (textul), cu montajul lui.

const f3 = (v: number): string => {
  const s = v.toFixed(3);
  return s === '-0.000' ? '0.000' : s;
};

export type FelMartor =
  | 'E-dincolo-de-V' | 'E-scurt' | 'doar-prima-trecere' | 'tbone-perete-scurt' | 'Z-trecerea-de-dinainte' | 'fara-intoarcere' | 'avans-plonjare';

/** Cuvintele X și Y ale unei linii G1, sau null. */
function xyDin(linie: string): P2 | null {
  const x = /X(-?\d+\.\d+)/.exec(linie), y = /Y(-?\d+\.\d+)/.exec(linie);
  return x && y ? p(Number(x[1]), Number(y[1])) : null;
}

/**
 * Un program cu drumurile mutate după `fel`, pe colțurile de pe hârtie (`colturi`, în document): fiecare linie `G1` care
 * duce în E-ul unui colț (în mașină, după montaj) e rescrisă. ALEGERE: liniile drumului se recunosc după cote, nu după
 * oracol (martorul nu folosește codul pe care îl judecă).
 * - `E-dincolo-de-V`: E′ = 2V − E (cercul ediției întâi: centrul la r dincolo de V, pe bisectoare la dog-bone);
 * - `E-scurt`: E′ = E + 0,3·(Q − E) (drumul se oprește înainte; colțul rămâne netăiat);
 * - `doar-prima-trecere`: drumurile unui colț după prima lui sosire sunt șterse;
 * - `tbone-perete-scurt`: E′ = V + R·n, cu n normala peretelui LUNG (crestătura în peretele scurt);
 * - `Z-trecerea-de-dinainte`: drumurile de pe trecerile de după prima merg la Z-ul trecerii de dinainte (cu pasul mai sus);
 * - `fara-intoarcere`: întoarcerea din E se oprește la 0,5 mm de Q (pe dreapta E → Q), apoi bucla continuă de acolo;
 * - `avans-plonjare`: drumul merge cu F300 (avansul de plonjare), nu cu avansul de tăiere; bucla își reia F1000 după el.
 */
export function martorDeg(text: string, m: Montaj, colturi: readonly ColtHartie[], fel: FelMartor, o: { readonly R?: number; readonly pas?: number } = {}): string {
  const R = o.R ?? 3;
  const M = laMasina(m);
  const inMasina = (q: P2): P2 => { const [x, y] = M(q.x, q.y, 0); return p(Number(f3(x)), Number(f3(y))); };
  const linii = text.split('\n');
  const vazute = new Map<ColtHartie, number>();
  const out: string[] = [];
  for (let k = 0; k < linii.length; k++) {
    const l = linii[k]!;
    const q = /^G1 /.test(l) ? xyDin(l) : null;
    const c = q ? colturi.find((x) => { const e = inMasina(x.E); return Math.abs(e.x - q.x) <= 0.0015 && Math.abs(e.y - q.y) <= 0.0015; }) : undefined;
    if (!c || !q) { out.push(l); continue; }
    const n = (vazute.get(c) ?? 0) + 1;
    vazute.set(c, n);
    const rescrie = (E2: P2): string => { const e = inMasina(E2); return l.replace(/X-?\d+\.\d+/, `X${f3(e.x)}`).replace(/Y-?\d+\.\d+/, `Y${f3(e.y)}`); };
    if (fel === 'E-dincolo-de-V') { out.push(rescrie(p(2 * c.V.x - c.E.x, 2 * c.V.y - c.E.y))); continue; }
    if (fel === 'E-scurt') { out.push(rescrie(p(c.E.x + 0.3 * (c.Q.x - c.E.x), c.E.y + 0.3 * (c.Q.y - c.E.y)))); continue; }
    if (fel === 'tbone-perete-scurt') {
      // Peretele lung e cel în care intră E: normala lui e cea pe care E nu o atinge; crestătura trece în celălalt.
      const nL = c.inOrizontal > c.inVertical ? c.nOrizontal : c.nVertical;
      out.push(rescrie(p(c.V.x + R * nL.x, c.V.y + R * nL.y)));
      continue;
    }
    if (fel === 'doar-prima-trecere') {
      if (n === 1) { out.push(l); continue; }
      k++; // și întoarcerea în Q
      continue;
    }
    if (fel === 'Z-trecerea-de-dinainte') {
      if (n === 1) { out.push(l); continue; }
      // Z-ul curent, citit din liniile de dinainte (modal), plus pasul.
      let z = NaN;
      for (let j = out.length - 1; j >= 0 && Number.isNaN(z); j--) { const x = /Z(-?\d+\.\d+)/.exec(out[j]!); if (x) z = Number(x[1]); }
      out.push(`${l} Z${f3(z + (o.pas ?? 3))}`);
      out.push(linii[++k]!);
      out.push(`G1 Z${f3(z)}`);
      continue;
    }
    if (fel === 'avans-plonjare') {
      out.push(`${l} F300.0`, linii[++k]!);
      const urm = linii[k + 1];
      if (urm !== undefined && /^G1 /.test(urm) && !/F\d/.test(urm)) { out.push(`${urm} F1000.0`); k++; }
      continue;
    }
    if (fel === 'fara-intoarcere') {
      out.push(l);
      const inapoi = linii[++k]!;
      const t = Math.hypot(c.Q.x - c.E.x, c.Q.y - c.E.y);
      const f = Math.max(0, (t - 0.5) / t);
      const e = inMasina(p(c.E.x + f * (c.Q.x - c.E.x), c.E.y + f * (c.Q.y - c.E.y)));
      out.push(inapoi.replace(/X-?\d+\.\d+/, `X${f3(e.x)}`).replace(/Y-?\d+\.\d+/, `Y${f3(e.y)}`));
      continue;
    }
    out.push(l);
  }
  return out.join('\n');
}

/**
 * Martorul „degajarea pe un colț convex pentru K” (§8): după fiecare arc G2/G3 al traseului din jurul unui colț V al
 * unei piese tăiate exterior (centrul arcului = V, citit din I/J), un drum dus-întors din capătul arcului spre
 * E = V + R·u_K (bisectoarea spre piesă: cum ar face o aplicație care socotește colțul concav).
 */
export function martorConvex(text: string, m: Montaj, varfuri: readonly P2[], R = 3): string {
  const M = laMasina(m);
  const out: string[] = [];
  let x = NaN, y = NaN;
  for (const l of text.split('\n')) {
    out.push(l);
    const q = xyDin(l);
    const arc = /^G[23] /.test(l) && q;
    if (arc) {
      const i = Number(/I(-?\d+\.\d+)/.exec(l)?.[1]), j = Number(/J(-?\d+\.\d+)/.exec(l)?.[1]);
      const cx = x + i, cy = y + j;
      const V = varfuri.find((v) => { const [vx, vy] = M(v.x, v.y, 0); return Math.abs(vx - cx) <= 0.002 && Math.abs(vy - cy) <= 0.002; });
      if (V) {
        const [vx, vy] = M(V.x, V.y, 0);
        // Bisectoarea spre piesă: de la mijlocul arcului (în afara colțului) spre V, continuată cu R dincolo de el.
        const ux = vx - q.x, uy = vy - q.y;
        const L = Math.hypot(ux, uy);
        const ex = vx + (R * ux) / L, ey = vy + (R * uy) / L;
        out.push(`G1 X${f3(ex)} Y${f3(ey)}`, `G1 X${f3(q.x)} Y${f3(q.y)}`);
      }
    }
    if (q) { x = q.x; y = q.y; }
  }
  return out.join('\n');
}

/**
 * Martorul „degajarea păstrată deși se apropie de bucla vecină” (§8) și „degajarea pe o operație fără colturi”: după
 * fiecare linie G1 care se termină în Q-ul unui colț din listă, drumul Q → E → Q, cum l-ar face o aplicație care nu
 * judecă §5 (sau nu citește `colturi`).
 */
export function martorAdauga(text: string, m: Montaj, colturi: readonly ColtHartie[]): string {
  const M = laMasina(m);
  const inMasina = (q: P2): P2 => { const [x, y] = M(q.x, q.y, 0); return p(Number(f3(x)), Number(f3(y))); };
  const out: string[] = [];
  const linii = text.split('\n');
  for (let k = 0; k < linii.length; k++) {
    const l = linii[k]!;
    out.push(l);
    const q = /^G1 /.test(l) ? xyDin(l) : null;
    if (!q) continue;
    const c = colturi.find((x) => { const e = inMasina(x.Q); return Math.abs(e.x - q.x) <= 0.0015 && Math.abs(e.y - q.y) <= 0.0015; });
    if (!c) continue;
    // Deja are drumul (linia următoare merge în E-ul lui): nu se adaugă încă unul.
    const urm = linii[k + 1] ? xyDin(linii[k + 1]!) : null;
    const e = inMasina(c.E);
    if (urm && Math.abs(urm.x - e.x) <= 0.0015 && Math.abs(urm.y - e.y) <= 0.0015) continue;
    // Nu după o plonjare (pornirea): doar după o mișcare în plan (linia are X sau Y).
    out.push(`G1 X${f3(e.x)} Y${f3(e.y)}`, `G1 X${f3(q.x)} Y${f3(q.y)}`);
  }
  return out.join('\n');
}

// ---------------------------------------------------------------------------------------------------------------
// Corpusul de lipire.

export type CazCorpusDeg = {
  readonly nume: string;
  readonly familie: string;
  readonly doc: DocV8O;
  readonly origine: Montaj['origine'];
  readonly z0: Montaj['z0'];
  readonly D: number;
};

const ORIGINI: ReadonlyArray<Montaj['origine']> = ['stanga-jos', 'dreapta-jos', 'dreapta-sus', 'stanga-sus'];
const FREZE = [3.175, 6, 8] as const;

/** Rotunjit la 0,001 (cotele documentului rămân „de atelier”). */
const r3 = (v: number): number => Math.round(v * 1000) / 1000;

/**
 * Corpusul (determinist, mulberry32): `n` documente v8, fiecare pe o foaie de 6–18 mm, cu o singură freză, cu una sau
 * două „piese” (o placă exterioară, uneori cu colțuri rotunjite, cu urechi uneori) și 1–4 găuri înăuntru, așezate pe o
 * grilă ca să nu se atingă; găurile sunt dreptunghiuri ascuțite (uneori pătrate, uneori paralelograme prin forfecare,
 * rotite, oglindite), uneori cercuri sau dreptunghiuri rotunjite; uneori o pereche de găuri apropiate (1–4 mm); pe
 * fiecare operație: sensul, colturi (null / dog-bone / t-bone), urechi, rampă, intrări, la întâmplare.
 */
export function corpusDegajari(samanta = 0x2600, n = 40): CazCorpusDeg[] {
  const r = aleator(samanta);
  const alege = <T>(xs: readonly T[]): T => xs[Math.floor(r() * xs.length)]!;
  const rez: CazCorpusDeg[] = [];
  for (let k = 0; k < n; k++) {
    const T = alege([6, 9, 12, 18]);
    const D = alege(FREZE);
    const Rr = D / 2;
    const stoc: Stoc = { latime: 220, inaltime: 160, grosime: T };
    const pas = r3(alege([T / 2, T / 3, 3, 4]));
    const forme: FormaDeg[] = [];
    const colturiAleator = (): ColturiO | null => { const x = r(); return x < 0.15 ? null : x < 0.6 ? dog() : tee(); };
    const sens = (): SensO => (r() < 0.5 ? 'urcare' : 'opozitie');
    const adancime = (): number => r3(r() < 0.4 ? T : Math.max(pas * 0.5, T * (0.3 + 0.6 * r())));
    // Placa exterioară (o „piesă”), cu colțuri ascuțite sau rotunjite; urechi uneori (doar unde încap: d > vârf).
    const W = r3(150 + 40 * r()), H = r3(110 + 30 * r());
    const x0 = r3(10 + (stoc.latime - 20 - W) * r()), y0 = r3(10 + (stoc.inaltime - 20 - H) * r());
    const adPlaca = r() < 0.6 ? T : adancime();
    const urechiPlaca = adPlaca === T && r() < 0.4 ? { numar: alege([2, 3, 4]), latime: r3(Math.max(D, 8)), grosime: r3(Math.min(2, T / 3)) } : null;
    forme.push({
      id: 'placa', forma: drept(W, H, r() < 0.5 ? 0 : r3(Math.min(10, 2 + 8 * r()))), x: x0, y: y0, latura: 'exterior', adancime: adPlaca, sens: sens(),
      colturi: r() < 0.3 ? colturiAleator() : null, urechi: urechiPlaca, rampa: r() < 0.2 ? { lungime: r3(5 + 20 * r()) } : null,
      intrari: r() < 0.25 ? { raza: r3(1 + 3 * r()) } : null,
    });
    // Găurile, pe o grilă de 2 × 2 celule în placă (margine 8 mm față de marginea plăcii și între găuri).
    const coloane = 2, randuri = 2;
    const cw = (W - 24) / coloane, ch = (H - 24) / randuri;
    const familie: string[] = [];
    let aproape = false;
    for (let i = 0; i < coloane; i++) {
      for (let j = 0; j < randuri; j++) {
        if (r() < 0.2) continue;
        const cx = x0 + 8 + i * (cw + 8), cy = y0 + 8 + j * (ch + 8);
        const fel = r();
        const id = `g${i}${j}`;
        const ad = adancime();
        const op = {
          latura: 'interior' as LaturaO, adancime: ad, sens: sens(), colturi: colturiAleator(),
          urechi: ad > T - Math.min(2, T / 3) + 0.01 && r() < 0.35 ? { numar: alege([1, 2, 3, 4]), latime: r3(Math.max(D, 6 + 4 * r())), grosime: r3(Math.min(2, T / 3)) } : null,
          rampa: r() < 0.25 ? { lungime: r3(r() < 0.5 ? 10 : 2 + 50 * r()) } : null,
          intrari: r() < 0.25 ? { raza: r3(1 + 3 * r()) } : null,
        };
        if (fel < 0.12) {
          const raza = r3(Math.min(cw, ch) / 2 * (0.4 + 0.5 * r()));
          forme.push({ id, forma: cerc(raza), x: r3(cx + cw / 2), y: r3(cy + ch / 2), ...op });
          familie.push('cerc');
          continue;
        }
        if (fel < 0.22 && !aproape && cw > 4 * D + 12) {
          // O pereche de găuri apropiate (1–4 mm), cu pereții lungi față în față sau nu.
          aproape = true;
          const gap = alege([1, 2, 3, 4]);
          const w = r3((cw - gap) / 2 * (0.8 + 0.2 * r())), h = r3(ch * (0.5 + 0.5 * r()));
          if (w < 2 * D + 1 || h < 2 * D + 1) continue;
          forme.push({ id, forma: drept(w, h), x: r3(cx), y: r3(cy), ...op });
          forme.push({ id: `${id}b`, forma: drept(w, h), x: r3(cx + w + gap), y: r3(cy), ...op, colturi: colturiAleator(), sens: sens() });
          familie.push(`aproape ${gap}`);
          continue;
        }
        // Dreptunghi ascuțit (uneori pătrat, uneori rotunjit), rotit, oglindit sau forfecat, centrat în celulă.
        const s = Math.min(cw, ch);
        let w = r3(Math.max(2 * D + 1, (r() < 0.5 ? cw : s) * (0.35 + 0.5 * r()))), h = r3(Math.max(2 * D + 1, ch * (0.35 + 0.5 * r())));
        if (r() < 0.2) h = w = r3(Math.max(2 * D + 1, Math.min(w, h)));
        const fRaza = r() < 0.12 ? r() * 0.8 : 0;
        const g = r();
        const unghi = g < 0.5 ? 0 : g < 0.7 ? alege([90, 180, 270]) : r3(360 * r());
        const forfecare = fRaza === 0 && r() < 0.2 ? r3((r() - 0.5) * 0.8) : 0;
        const oglinda = r() < 0.2;
        const c = Math.cos((unghi * Math.PI) / 180), sn = Math.sin((unghi * Math.PI) / 180);
        // Matricea locală: oglindire (pe X), forfecare (x += k·y), rotire; apoi centrul celulei. Forma rămâne în celulă:
        // diagonala ei, forfecată, are cel mult (w + |k|·h, h) din centru; se micșorează până încape.
        const lungDiag = Math.hypot(w + Math.abs(forfecare) * h, h);
        const scara = Math.min(1, (Math.min(cw, ch) - 2) / lungDiag);
        w = r3(w * scara); h = r3(h * scara);
        if (w < 2 * D + 0.5 || h < 2 * D + 0.5) continue;
        // Raza colțului, după mărimea finală (cel mult 0,4 din latura mică).
        const raza = Math.floor((Math.min(w, h) / 2) * fRaza * 1000) / 1000;
        const ox = oglinda ? -1 : 1;
        // M = Rot · Forf · Ogl, aplicată pe [0, w] × [0, h] centrat: translația pune centrul formei în centrul celulei.
        const a = c * ox, b = sn * ox, cc = c * forfecare - sn, d = sn * forfecare + c;
        const mx = a * (w / 2) + cc * (h / 2), my = b * (w / 2) + d * (h / 2);
        const matrice: MatriceO = { a: r3(a), b: r3(b), c: r3(cc), d: r3(d), e: 0, f: 0 };
        const esteSim = forfecare === 0;
        forme.push({
          id, forma: drept(w, h, esteSim ? raza : 0), x: r3(cx + cw / 2 - mx), y: r3(cy + ch / 2 - my),
          matrice: esteSim ? { a: Number(c.toFixed(12)) * ox, b: Number(sn.toFixed(12)) * ox, c: -Number(sn.toFixed(12)), d: Number(c.toFixed(12)), e: 0, f: 0 } : matrice,
          ...op,
          ...(r() < 0.08 ? { aDoua: r() < 0.5 ? { latura: 'interior' as LaturaO, adancime: ad, colturi: op.colturi } : { latura: 'pe-linie' as LaturaO, adancime: r3(Math.min(1, ad)), colturi: null } } : {}),
        });
        familie.push(`${forfecare ? 'paralelogram' : raza ? 'rotunjit' : w === h ? 'patrat' : 'dreptunghi'}${unghi ? ' rotit' : ''}${oglinda ? ' oglindit' : ''}`);
      }
    }
    const doc = docDeg(stoc, forme, { diametru: D, pas });
    rez.push({ nume: `C${String(k + 1).padStart(2, '0')} (sămânța ${samanta}, Ø${D}, foaia ${T}, ${familie.join(', ') || 'doar placa'})`, familie: familie[0] ?? 'placa', doc, origine: alege(ORIGINI), z0: r() < 0.5 ? 'sus' : 'jos', D });
  }
  return rez;
}
