/**
 * Corpusul oracolului căii (ADR 0034), cu ZERO importuri din `src/`: documente v9 cu câte o cale (o piesă, un element,
 * una sau două instanțe), fiecare cu o operație de profil, pe familii:
 * - `glife`: O și o (TrueType, pătratice ridicate) din `biarce.cazuri.ts`, litera D (linii și cubice), la ~30 mm;
 * - `inimi`: inima cu mânerele retrase (P2 = P3, P1 = P0) și scobitura de sus;
 * - `curbe-2440`: curbe line pe toată foaia, cu razele de lângă `RAZA_MAXIMA_ARC` (9 000, 12 000, 50 000 mm) și un S
 *   de 2 400 mm; valul firmei;
 * - `varfuri`: cortul cu vârf exact (tangentele verticale de ambele părți) și vârful cu coordonate oarecare al recenziei;
 * - `manere`: cubice aproape drepte cu mânerul întors, în mijlocul unei laturi (cel exact drept se suprapune pe linia
 *   dinainte, deci e o autointersecție: refuz sau traseu corect);
 * - `amestec`: linii, arce și cubice în aceeași cale (lacrima, scobitura cu arc concav, colțurile rotunjite cu κ);
 * - `similitudini`: aceleași căi sub matrici de element, de grup și de instanță (scalate, rotite, oglindite: arcul își
 *   schimbă semnul `bulge` în lume), două instanțe ale aceleiași piese;
 * - `neuniforme`: căi doar cu linii și cubice sub matrici afine oarecare (trec exact);
 * - `CAZURI_CALE_2` (precizările recenziei, ADR 0034 §6): căile netede pe care offsetul le refuza fals (contactul fals la
 *   o joncțiune tangentă, buclele minuscule de 5e-4 … 0,03 mm ale ieșirii), măsurate la fel:
 *   · `pete-32`, `pete-128`: pete Catmull-Rom de 32 și 128 de cubice, raza ~40 mm (trei armonice cu faze la întâmplare);
 *   · `elipse-mici`: elipsele 6 × 2 și 3 × 1 mm din 4 cubice κ, rotite 10°, la (600, 300), exterior Ø6 (freza e mai mare
 *     decât raza lor de curbură);
 *   · `colturi-k`: dreptunghiul 20 × 12 cu colțuri κ de 3,5 mm, la fel așezat, interior Ø6;
 *   · `flori`: r(θ) = r0 + a·sin(kθ) prin Catmull-Rom (6 puncte pe undă), cu 8 și 12 unde, raza de 10 și 20 mm.
 * Sculele: Ø6 și Ø3,175; trecerile: 1–3 (adâncimea 3, 6 sau 9 mm, pasul 3); laturile: exterior și interior. Toate stau în
 * foaie, cu margine, ca exportul să nu ceară confirmarea ieșirii.
 */
import type { MatriceO, PunctO } from './document.ts';
import type { SegmentO, VarfO } from './biarce.ts';
import { COLTURI, GLIFA_O, GLIFA_O_TT, INIMA, KAPPA, VAL, aleator, arcPeCoarda, cale, sfert } from './biarce.cazuri.ts';
import { ID, conturExact, similitudine, type ConturExact, type FormaCaleO } from './cale.ts';
import { compuneO, geometrieV2, type DocArboreO, type Liber } from './document.ts';

export type Stoc = { readonly latime: number; readonly inaltime: number; readonly grosime: number };

export type CazCale = {
  readonly nume: string;
  readonly familie: 'glife' | 'inimi' | 'curbe-2440' | 'varfuri' | 'manere' | 'amestec' | 'similitudini' | 'neuniforme'
    | 'pete-32' | 'pete-128' | 'elipse-mici' | 'colturi-k' | 'flori';
  readonly doc: Liber;
  readonly stoc: Stoc;
  readonly diametru: number;
  readonly latura: 'exterior' | 'interior';
  /**
   * `trebuie`: exportul reușește și trece tot; `refuz`: CAM-ul trebuie să refuze, cu motiv (conturul se autointersectează,
   * verificat aici independent); `corect-sau-refuz`: fie trece tot, fie un refuz cu motiv.
   */
  readonly categorie: 'trebuie' | 'refuz' | 'corect-sau-refuz';
};

const P = (x: number, y: number): PunctO => ({ x, y });
const L: SegmentO = { tip: 'L' };
const A = (bulge: number): SegmentO => ({ tip: 'A', bulge });
const C = (c1: PunctO, c2: PunctO): SegmentO => ({ tip: 'C', c1, c2 });
const v = (p: PunctO, s: SegmentO): VarfO => ({ p, s });

export const formaCale = (varfuri: readonly VarfO[]): FormaCaleO => ({ tip: 'cale', inchis: true, varfuri });
const dinCale = (d: string, s: number): FormaCaleO => formaCale(cale(d, s).varfuri);

export const MIC: Stoc = { latime: 400, inaltime: 300, grosime: 18 };
export const MARE: Stoc = { latime: 2440, inaltime: 1220, grosime: 18 };

export type Instanta = { readonly x: number; readonly y: number; readonly rotire?: number };

/** Documentul v9: o piesă (grupul cu matricea `grup`, elementul cu matricea `matrice`), instanțele, o operație de profil. */
export function docCale(
  stoc: Stoc, forma: Liber, o: {
    readonly matrice?: MatriceO; readonly grup?: MatriceO; readonly instante: readonly Instanta[];
    readonly latura: 'exterior' | 'interior'; readonly diametru: number; readonly adancime: number; readonly pas: number;
  },
): Liber {
  return {
    schema: 9,
    rev: 0,
    piese: [{
      id: 'p1',
      radacina: { tip: 'grup', id: 'g', matrice: o.grup ?? ID, copii: [{ tip: 'element', id: 'e1', forma: structuredClone(forma), matrice: o.matrice ?? ID }] },
      operatii: [{
        id: 'op1', tip: 'profil', noduri: ['e1'], scula: { numar: 1, nume: 'freza', diametru: o.diametru }, latura: o.latura,
        adancime: o.adancime, pas: o.pas, sens: 'urcare', urechi: null, rampa: null, intrari: null, colturi: null,
      }],
    }],
    foi: [{ id: 'f1', stoc: { ...stoc }, instante: o.instante.map((i, k) => ({ id: `i${k + 1}`, piesa: 'p1', x: i.x, y: i.y, rotire: i.rotire ?? 0 })) }],
  };
}

/** Conturul exact al fiecărui element din lume, după id-ul lui (`<instanță>/<element>`). */
export function contureleExacte(doc: Liber): Map<string, ConturExact> {
  const rez = new Map<string, ConturExact>();
  for (const e of geometrieV2(doc as unknown as DocArboreO)) rez.set(e.idLume, conturExact(e.forma as FormaCaleO, e.matrice));
  return rez;
}

// ---------------------------------------------------------------------------------------------------------------------
// Formele (în coordonatele elementului).

export const FORME = {
  O: dinCale(GLIFA_O, 0.04),
  oTT: dinCale(GLIFA_O_TT, 0.04),
  D: dinCale('M 100 0 L 400 0 C 700 0 850 200 850 400 C 850 600 700 800 400 800 L 100 800 Z', 0.04),
  inima: dinCale(INIMA, 1),
  colturi: dinCale(COLTURI, 1),
  /** Valul firmei, pe 2 440 × 1 220: scalat cu 0,95 în document (vezi cazul). */
  val: dinCale(VAL, 1),
  /** Cortul: cubica cu vârful exact în (25, 37,5) (B′ = 0 la t = ½, tangentele verticale), închisă cu o linie. */
  cort: formaCale([v(P(0, 0), C(P(50, 50), P(0, 50))), v(P(50, 0), L)]),
  /**
   * Vârful exact cu coordonate oarecare (recenzia ADR 0033), închis cu o linie: linia de închidere taie cubica (la
   * t ≈ 0,614), deci conturul se autointersectează și CAM-ul trebuie să-l refuze.
   */
  varfOarecare: formaCale([
    v(P(4.79980349125729, 12.249421487953235), C(P(-18.10314736242403, -1.3186210573296702), P(18.655791894120785, 21.340242969462068))),
    v(P(7.598275977733781, 9.4042605391192), L),
  ]),
  /** Același vârf, închis prin (30, 30): cele două linii de închidere nu taie cubica (verificat pe 20 000 de coarde). */
  varfOarecareInchis: formaCale([
    v(P(4.79980349125729, 12.249421487953235), C(P(-18.10314736242403, -1.3186210573296702), P(18.655791894120785, 21.340242969462068))),
    v(P(7.598275977733781, 9.4042605391192), L), v(P(30, 30), L),
  ]),
  /** Mânerul întors, aproape drept, în mijlocul laturii de jos. */
  manerAproape: formaCale([
    v(P(-50, 0), L), v(P(0, 0), C(P(-1, 0.0003), P(40, 0.0002))), v(P(50, 0), L), v(P(100, 0), L), v(P(100, 40), L), v(P(-50, 40), L),
  ]),
  /** Mânerul întors, exact drept: cubica se întoarce peste linia dinainte (autointersecție). */
  manerExact: formaCale([
    v(P(-100, 0), L), v(P(0, 0), C(P(-16, 0), P(500, 0))), v(P(1000, 0), L), v(P(1100, 0), L), v(P(1100, 100), L), v(P(-100, 100), L),
  ]),
  /** Lacrima: semicercul de jos (bulge 1), două cubice tangente spre vârful de sus. */
  lacrima: formaCale([v(P(0, 0), A(1)), v(P(20, 0), C(P(20, 15), P(12, 30))), v(P(10, 40), C(P(8, 30), P(0, 15)))]),
  /** Scobitura: dreptunghi cu un arc concav sus și o cocoașă cubică. */
  scobitura: formaCale([v(P(0, 0), L), v(P(60, 0), L), v(P(60, 30), A(-0.4)), v(P(30, 30), C(P(20, 45), P(10, 45))), v(P(0, 30), L)]),
  /** Cubica, arcul și liniile din sonda 2.7b. */
  mixt: formaCale([v(P(0, 0), L), v(P(50, 0), C(P(60, 10), P(60, 30))), v(P(50, 40), A(0.4)), v(P(0, 40), L)]),
} as const;

/** O curbă lină de 2 400 mm (raza R) deasupra unui dreptunghi de 2 400 × 200: linia de jos, cele laterale, cubica de sus. */
export function curbaLina(R: number): FormaCaleO {
  const c = arcPeCoarda(R, 2400, 0, 200);
  return formaCale([v(P(0, 0), L), v(P(2400, 0), L), v(P(2400, 200), C(c.c2, c.c1)), v(P(0, 200), L)]);
}

/** Un S de 2 400 mm deasupra aceluiași dreptunghi. */
export const S_MARE = formaCale([v(P(0, 0), L), v(P(2400, 0), L), v(P(2400, 300), C(P(1600, 0), P(800, 600))), v(P(0, 300), L)]);

// ---------------------------------------------------------------------------------------------------------------------
// Cazurile.

function cazuri(): CazCale[] {
  const rez: CazCale[] = [];
  const pune = (
    nume: string, familie: CazCale['familie'], stoc: Stoc, forma: FormaCaleO,
    o: { matrice?: MatriceO; grup?: MatriceO; instante: readonly Instanta[]; latura: 'exterior' | 'interior'; diametru: number; treceri: 1 | 2 | 3 },
    categorie: CazCale['categorie'] = 'trebuie',
  ): void => {
    const doc = docCale(stoc, forma as unknown as Liber, {
      ...(o.matrice ? { matrice: o.matrice } : {}), ...(o.grup ? { grup: o.grup } : {}),
      instante: o.instante, latura: o.latura, diametru: o.diametru, adancime: 3 * o.treceri, pas: 3,
    });
    rez.push({ nume, familie, doc, stoc, diametru: o.diametru, latura: o.latura, categorie });
  };
  const la = (x: number, y: number, rotire = 0): Instanta[] => [{ x, y, rotire }];
  // Glife.
  pune('O, exterior, Ø6, 1 trecere', 'glife', MIC, FORME.O, { instante: la(50, 50), latura: 'exterior', diametru: 6, treceri: 1 });
  pune('O, interior, Ø3,175, 2 treceri', 'glife', MIC, FORME.O, { instante: la(50, 50), latura: 'interior', diametru: 3.175, treceri: 2 });
  pune('o TrueType, exterior, Ø3,175, 3 treceri', 'glife', MIC, FORME.oTT, { instante: la(100, 100), latura: 'exterior', diametru: 3.175, treceri: 3 });
  pune('D, exterior, Ø6, 2 treceri', 'glife', MIC, FORME.D, { instante: la(150, 60), latura: 'exterior', diametru: 6, treceri: 2 });
  pune('D, interior, Ø6, 1 trecere', 'glife', MIC, FORME.D, { instante: la(150, 60), latura: 'interior', diametru: 6, treceri: 1 });
  // Inimi.
  pune('inima, exterior, Ø6, 1 trecere', 'inimi', MIC, FORME.inima, { instante: la(100, 80), latura: 'exterior', diametru: 6, treceri: 1 });
  pune('inima, interior, Ø3,175, 2 treceri', 'inimi', MIC, FORME.inima, { instante: la(100, 80), latura: 'interior', diametru: 3.175, treceri: 2 });
  pune('inima, exterior, Ø3,175, 3 treceri', 'inimi', MIC, FORME.inima, { instante: la(200, 100), latura: 'exterior', diametru: 3.175, treceri: 3 });
  // Curbele de 2 440.
  for (const R of [9000, 12000, 50000]) {
    pune(`curba lină R ${R} pe 2 400, exterior, Ø6`, 'curbe-2440', MARE, curbaLina(R), { instante: la(20, 300), latura: 'exterior', diametru: 6, treceri: 1 });
  }
  pune('curba lină R 12 000, interior, Ø6, 2 treceri', 'curbe-2440', MARE, curbaLina(12000), { instante: la(20, 300), latura: 'interior', diametru: 6, treceri: 2 });
  pune('S de 2 400, exterior, Ø3,175', 'curbe-2440', MARE, S_MARE, { instante: la(20, 300), latura: 'exterior', diametru: 3.175, treceri: 1 });
  pune('valul firmei × 0,95, exterior, Ø6', 'curbe-2440', MARE, FORME.val, {
    matrice: similitudine(0.95, 0, false, 0, 0), instante: la(61, 25), latura: 'exterior', diametru: 6, treceri: 1,
  });
  // Vârfuri.
  pune('cortul cu vârf exact, exterior, Ø6', 'varfuri', MIC, FORME.cort, { instante: la(100, 100), latura: 'exterior', diametru: 6, treceri: 1 });
  pune('cortul cu vârf exact, interior, Ø3,175', 'varfuri', MIC, FORME.cort, { instante: la(100, 100), latura: 'interior', diametru: 3.175, treceri: 2 });
  pune('vârful oarecare × 4, exterior, Ø3,175', 'varfuri', MIC, FORME.varfOarecare, {
    matrice: similitudine(4, 20, false), instante: la(200, 100), latura: 'exterior', diametru: 3.175, treceri: 1,
  }, 'refuz');
  pune('vârful oarecare × 4, închis prin (30, 30), exterior, Ø3,175', 'varfuri', MIC, FORME.varfOarecareInchis, {
    matrice: similitudine(4, 20, false), instante: la(200, 60), latura: 'exterior', diametru: 3.175, treceri: 1,
  });
  pune('vârful oarecare × 4, închis prin (30, 30), interior, Ø3,175', 'varfuri', MIC, FORME.varfOarecareInchis, {
    matrice: similitudine(4, 20, false), instante: la(200, 60), latura: 'interior', diametru: 3.175, treceri: 1,
  });
  // Mânere întoarse.
  pune('mânerul întors aproape drept, exterior, Ø6', 'manere', MIC, FORME.manerAproape, { instante: la(150, 100), latura: 'exterior', diametru: 6, treceri: 1 }, 'corect-sau-refuz');
  pune('mânerul întors aproape drept, interior, Ø3,175', 'manere', MIC, FORME.manerAproape, { instante: la(150, 100), latura: 'interior', diametru: 3.175, treceri: 1 }, 'corect-sau-refuz');
  pune('mânerul întors exact drept (suprapus), exterior, Ø6', 'manere', MARE, FORME.manerExact, { instante: la(200, 300), latura: 'exterior', diametru: 6, treceri: 1 }, 'refuz');
  // Amestec.
  pune('lacrima, exterior, Ø3,175', 'amestec', MIC, FORME.lacrima, { instante: la(100, 100), latura: 'exterior', diametru: 3.175, treceri: 1 });
  pune('lacrima, interior, Ø3,175, 2 treceri', 'amestec', MIC, FORME.lacrima, { instante: la(100, 100), latura: 'interior', diametru: 3.175, treceri: 2 });
  pune('scobitura, exterior, Ø6', 'amestec', MIC, FORME.scobitura, { instante: la(100, 100), latura: 'exterior', diametru: 6, treceri: 1 });
  pune('scobitura, interior, Ø6, 3 treceri', 'amestec', MIC, FORME.scobitura, { instante: la(100, 100), latura: 'interior', diametru: 6, treceri: 3 });
  pune('mixt (L, C, A, L), exterior, Ø6, 2 treceri', 'amestec', MIC, FORME.mixt, { instante: la(100, 100), latura: 'exterior', diametru: 6, treceri: 2 });
  pune('colțurile rotunjite cu κ, exterior, Ø3,175', 'amestec', MIC, FORME.colturi, { instante: la(100, 100), latura: 'exterior', diametru: 3.175, treceri: 1 });
  // Similitudini.
  pune('inima × 0,6, rotită 30°, instanța la 90°', 'similitudini', MIC, FORME.inima, {
    matrice: similitudine(0.6, 30, false, 10, 5), instante: la(250, 60, 90), latura: 'exterior', diametru: 6, treceri: 1,
  });
  pune('O oglindit × 1,5, exterior', 'similitudini', MIC, FORME.O, {
    matrice: similitudine(1.5, 0, true, 60, 0), instante: la(100, 80), latura: 'exterior', diametru: 3.175, treceri: 1,
  });
  pune('mixt oglindit × 1,5 (arcul își schimbă semnul), grupul rotit 15°, exterior', 'similitudini', MIC, FORME.mixt, {
    matrice: similitudine(1.5, 0, true, 80, 0), grup: similitudine(1, 15, false), instante: la(150, 60), latura: 'exterior', diametru: 6, treceri: 1,
  });
  pune('lacrima × 2, rotită 200°, oglindită, interior', 'similitudini', MIC, FORME.lacrima, {
    matrice: similitudine(2, 200, true), instante: la(200, 150, 45), latura: 'interior', diametru: 3.175, treceri: 1,
  });
  {
    const doc = docCale(MIC, FORME.scobitura as unknown as Liber, {
      matrice: similitudine(1.2, 10, false), instante: [{ x: 60, y: 40 }, { x: 250, y: 120, rotire: 135 }], latura: 'exterior', diametru: 6, adancime: 3, pas: 3,
    });
    rez.push({ nume: 'scobitura × 1,2, două instanțe (0° și 135°)', familie: 'similitudini', doc, stoc: MIC, diametru: 6, latura: 'exterior', categorie: 'trebuie' });
  }
  // Neuniforme (doar linii și cubice).
  pune('inima sub o matrice afină oarecare', 'neuniforme', MIC, FORME.inima, {
    matrice: { a: 0.8, b: 0.2, c: 0.1, d: 0.5, e: 0, f: 0 }, instante: la(100, 80), latura: 'exterior', diametru: 3.175, treceri: 1,
  });
  pune('O sub o forfecare și o scalare neuniformă', 'neuniforme', MIC, FORME.O, {
    matrice: { a: 1.6, b: 0, c: 0.4, d: 0.7, e: 0, f: 0 }, instante: la(100, 80), latura: 'exterior', diametru: 6, treceri: 1,
  });
  pune('colțurile rotunjite (L + C) sub o scalare 1 × 2,5 cu forfecare, interior', 'neuniforme', MIC, FORME.colturi, {
    matrice: { a: 1, b: 0.3, c: 0, d: 2.5, e: 0, f: 0 }, instante: la(120, 80), latura: 'interior', diametru: 3.175, treceri: 2,
  });
  pune('D sub o matrice afină, rotită de instanță', 'neuniforme', MIC, FORME.D, {
    matrice: compuneO(similitudine(1, 25, false), { a: 1.3, b: 0, c: 0, d: 0.8, e: 0, f: 0 }), instante: la(200, 50, 30), latura: 'exterior', diametru: 6, treceri: 2,
  });
  return rez;
}

export const CAZURI_CALE: readonly CazCale[] = cazuri();

// ---------------------------------------------------------------------------------------------------------------------
// Precizările recenziei (ADR 0034 §6): căile netede refuzate fals înaintea reparației.

/** Catmull-Rom închis prin puncte: cubica de la Pi la Pi+1 are c1 = Pi + (Pi+1 − Pi−1)/6 și c2 = Pi+1 − (Pi+2 − Pi)/6. */
export function catmullRom(pts: readonly PunctO[]): FormaCaleO {
  const n = pts.length;
  const at = (i: number): PunctO => pts[((i % n) + n) % n] as PunctO;
  return formaCale(pts.map((p0, i) => {
    const p1 = at(i + 1), pm = at(i - 1), p2 = at(i + 2);
    return v(p0, C(P(p0.x + (p1.x - pm.x) / 6, p0.y + (p1.y - pm.y) / 6), P(p1.x - (p2.x - p0.x) / 6, p1.y - (p2.y - p0.y) / 6)));
  }));
}

/** O pată de n cubice, raza ~r0: trei armonice (2, 3, 4) cu amplitudinile 8 %, 5 %, 3 % și faze din sămânță. */
export function pata(n: number, r0: number, samanta: number): FormaCaleO {
  const r = aleator(samanta);
  const faze = [r(), r(), r()].map((x) => 2 * Math.PI * x);
  const amp = [0.08, 0.05, 0.03];
  return catmullRom(Array.from({ length: n }, (_x, i) => {
    const u = (2 * Math.PI * i) / n;
    const rho = r0 * (1 + amp.reduce((s, a, j) => s + a * Math.sin((j + 2) * u + (faze[j] as number)), 0));
    return P(rho * Math.cos(u), rho * Math.sin(u));
  }));
}

/** Floarea r(θ) = r0 + a·sin(kθ) (a = 15 % din raza maximă), prin 6 puncte pe undă. */
export function floare(k: number, rMax: number): FormaCaleO {
  const a = 0.15 * rMax, r0 = rMax - a;
  return catmullRom(Array.from({ length: 6 * k }, (_x, i) => {
    const u = (2 * Math.PI * i) / (6 * k);
    const rho = r0 + a * Math.sin(k * u);
    return P(rho * Math.cos(u), rho * Math.sin(u));
  }));
}

/** Elipsa (rx, ry) din 4 cubice κ, centrată în origine. */
export function elipsaK(rx: number, ry: number): FormaCaleO {
  const q = [0, 1, 2, 3].map((k) => sfert(0, 0, rx, ry, (k * Math.PI) / 2));
  return formaCale(q.map((c) => v(c.a, C(c.c1, c.c2))));
}

/** Dreptunghiul w × h centrat în origine, cu colțurile cubice κ de rază r. */
export function dreptunghiK(w: number, h: number, r: number): FormaCaleO {
  const x0 = -w / 2, x1 = w / 2, y0 = -h / 2, y1 = h / 2, k = KAPPA * r;
  return formaCale([
    v(P(x0 + r, y0), L), v(P(x1 - r, y0), C(P(x1 - r + k, y0), P(x1, y0 + r - k))),
    v(P(x1, y0 + r), L), v(P(x1, y1 - r), C(P(x1, y1 - r + k), P(x1 - r + k, y1))),
    v(P(x1 - r, y1), L), v(P(x0 + r, y1), C(P(x0 + r - k, y1), P(x0, y1 - r + k))),
    v(P(x0, y1 - r), L), v(P(x0, y0 + r), C(P(x0, y0 + r - k), P(x0 + r - k, y0))),
  ]);
}

function cazuri2(): CazCale[] {
  const rez: CazCale[] = [];
  const pune = (
    nume: string, familie: CazCale['familie'], stoc: Stoc, forma: FormaCaleO, latura: 'exterior' | 'interior', diametru: number,
    o: { matrice?: MatriceO; x: number; y: number },
  ): void => {
    const doc = docCale(stoc, forma as unknown as Liber, {
      ...(o.matrice ? { matrice: o.matrice } : {}), instante: [{ x: o.x, y: o.y }], latura, diametru, adancime: 3, pas: 3,
    });
    rez.push({ nume, familie, doc, stoc, diametru, latura, categorie: 'trebuie' });
  };
  for (const [n, familie] of [[32, 'pete-32'], [128, 'pete-128']] as const) {
    for (const samanta of [1, 2, 3]) {
      for (const latura of ['exterior', 'interior'] as const) {
        pune(`pata de ${n} de cubice (sămânța ${samanta}), ${latura}, Ø6`, familie, MIC, pata(n, 40, 1000 * n + samanta), latura, 6, { x: 150, y: 150 });
      }
    }
  }
  const asezare = { matrice: similitudine(1, 10, false), x: 600, y: 300 };
  pune('elipsa 6 × 2 din 4 cubice κ, rotită 10°, la (600, 300), exterior, Ø6', 'elipse-mici', MARE, elipsaK(3, 1), 'exterior', 6, asezare);
  pune('elipsa 3 × 1 din 4 cubice κ, rotită 10°, la (600, 300), exterior, Ø6', 'elipse-mici', MARE, elipsaK(1.5, 0.5), 'exterior', 6, asezare);
  pune('dreptunghiul 20 × 12 cu colțuri κ de 3,5, rotit 10°, la (600, 300), interior, Ø6', 'colturi-k', MARE, dreptunghiK(20, 12, 3.5), 'interior', 6, asezare);
  for (const [k, rMax] of [[8, 10], [12, 10], [8, 20], [12, 20]] as const) {
    pune(`floarea cu ${k} unde, raza ${rMax}, exterior, Ø6`, 'flori', MIC, floare(k, rMax), 'exterior', 6, { x: 150, y: 150 });
    pune(`floarea cu ${k} unde, raza ${rMax}, interior, Ø${rMax === 10 ? '3,175' : '6'}`, 'flori', MIC, floare(k, rMax), 'interior', rMax === 10 ? 3.175 : 6, { x: 150, y: 150 });
  }
  return rez;
}

export const CAZURI_CALE_2: readonly CazCale[] = cazuri2();
