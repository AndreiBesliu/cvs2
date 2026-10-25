/**
 * ORACOLUL documentului v10 (ADR 0037 §2 și §8: contururile deschise; felia 2.3c-2, sesiune independentă, scris doar din
 * textul ADR-ului), cu ZERO importuri din `src/`. Contractul ușii (`verificaV10`), tipurile v10, migrarea v9 → v10 și
 * ușa curentă (`verificaO`, v10) sunt în `document.ts`, lângă celelalte versiuni (ca la fiecare schimbare de schemă:
 * oracolul e pe v10); aici sunt reexportate și sunt tăieturile foii în ordinea de la §8 (`taieturiV10O`).
 *
 * Ce spune contractul (le urmez literal; alegerile mele, acolo unde textul tace, sunt marcate „ALEGERE”):
 * - forma `{ tip: 'cale', inchis: boolean, varfuri }`; o cale deschisă are n ≥ 2 vârfuri și n − 1 segmente; segmentul
 *   ultimului vârf trebuie să fie `{ tip: 'L' }`; arcele se judecă doar pe cele n − 1 segmente reale; câmpurile
 *   necunoscute se păstrează;
 * - latura ∈ { exterior, interior, pe-linie, stanga, dreapta }; `despartire: true`, opțional, pe operația de profil
 *   (lipsă = false);
 * - ușa NU judecă geometria căii deschise și nici potrivirea laturii cu `inchis` (le refuză CAM-ul, §4, §9);
 * - migrarea v9 → v10 schimbă doar numărul: un v9 e un v10 valid, cu același program. Un document marcat v9 care conține
 *   `inchis: false` sau latura `stanga` / `dreapta` e refuzat („nu e un document v9 valid”: contractul v9 le refuză deja,
 *   `[cale]` și `[operatie]`). O versiune v9 refuză un v10 la ușă (`verificaPanaLaV9O`: `[schema]`).
 * - ALEGERE (o ambiguitate a contractului): un document v9 cu un câmp propriu `despartire` pe o operație (orice valoare)
 *   e o CIOCNIRE (`[ciocnire]`), ca la migrările de dinainte. În v9 câmpul e necunoscut (păstrat), dar în v10 capătă
 *   sens: `true` pe o cale închisă e un refuz al CAM-ului, iar o valoare care nu e boolean face documentul migrat
 *   nevalid. Primit, ar contrazice chiar §2: „un document v9 e un document v10 valid; programul lui rămâne același”.
 *   Ciocnirea e doar pe OPERAȚIE (ca la `sens` … `colturi`); `despartire` pe formă, sculă, nod, piesă sau sus rămâne un
 *   câmp necunoscut oarecare;
 * - §8, ordinea tăieturilor (amendează ADR 0025): clasa, apoi, în clasă, ordinea de azi (instanța în ordinea foii,
 *   operația în ordinea piesei, nodul în ordinea operației). Clasele: 0 interioarele; 1 tăieturile pe linie (închise și
 *   deschise) și tăieturile deschise nemarcate; 2 exterioarele; 3 despărțirile = tăieturile DESCHISE marcate
 *   `despartire: true`. ALEGERE: o tăietură pe care CAM-ul trebuie s-o refuze (despărțirea pe o cale închisă,
 *   exteriorul / interiorul pe o cale deschisă, stânga / dreapta pe una închisă) își păstrează clasa laturii; ordinea ei
 *   nu contează, documentul întreg e refuzat.
 */
import {
  geometrieV2, preordineElementeO,
  type ColturiO, type DocV10O, type IntrariO, type LaturaV10O, type MatriceO, type PiesaV10O, type RampaO,
  type SculaO, type SensO, type UrechiO,
} from './document.ts';

export {
  ciocniriDespartireO, migreazaV9V10O, ridicaV10O, verificaPanaLaV10O as verificaO10, verificaV10, verificaV9V10,
} from './document.ts';
export type { DocV10O, FormaCaleV10O, LaturaV10O, OperatieV10O, PiesaV10O } from './document.ts';

/** Versiunea documentului după acest oracol. */
export const SCHEMA_V10_O = 10;

const esteObiect = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

// ---------------------------------------------------------------------------------------------------------------
// Tăieturile foii, în ordinea de la §8.

/** §8: clasele, în ordinea în care se taie. */
export const CLASE_O = ['interioarele', 'tăieturile pe linie și deschisele nemarcate', 'exterioarele', 'despărțirile'] as const;
export type ClasaO = 0 | 1 | 2 | 3;

/** Forma e o cale deschisă (v10: `inchis: false`). Orice altă formă e închisă. */
export const esteDeschisaO = (forma: unknown): boolean => esteObiect(forma) && forma['tip'] === 'cale' && forma['inchis'] === false;

/** §8: clasa unei tăieturi (antetul). */
export function clasaO(latura: LaturaV10O, despartire: boolean, deschisa: boolean): ClasaO {
  if (latura === 'interior') return 0;
  if (latura === 'exterior') return 2;
  return deschisa && despartire ? 3 : 1;
}

/**
 * O tăietură v10 în lume: câmpurile tăieturii v8, latura cu valorile noi, plus `despartire` (marcajul operației, lipsă =
 * false), `deschisa` (elementul e o cale deschisă), `operatieDeschisa` (operația are cel puțin un nod deschis, în piesă:
 * §9 îi refuză urechile, rampa, intrările și degajările) și clasa de la §8.
 */
export type TaieturaV10O = {
  readonly idLume: string; readonly instanta: string; readonly piesa: string; readonly operatie: string; readonly nod: string;
  readonly latura: LaturaV10O; readonly adancime: number; readonly pas: number; readonly scula: SculaO;
  readonly forma: unknown; readonly matrice: MatriceO;
  readonly sens: SensO; readonly urechi: UrechiO | null; readonly rampa: RampaO | null; readonly intrari: IntrariO | null; readonly colturi: ColturiO | null;
  readonly despartire: boolean; readonly deschisa: boolean; readonly operatieDeschisa: boolean; readonly clasa: ClasaO;
};

/**
 * Tăieturile foii `indexFoaie` a unui document v10 (presupus valid), în ordinea de la §8: clasa, apoi instanța (ordinea
 * foii), operația (ordinea piesei), nodul (ordinea operației). O partiție STABILĂ a enumerării de azi.
 */
export function taieturiV10O(doc: DocV10O, indexFoaie = 0): TaieturaV10O[] {
  const foaie = doc.foi[indexFoaie];
  if (foaie === undefined) throw new Error(`foaia ${indexFoaie} nu există`);
  const lume = new Map(geometrieV2(doc, indexFoaie).map((e) => [e.idLume, e]));
  const piese = new Map<string, PiesaV10O>();
  for (const p of doc.piese) if (!piese.has(p.id)) piese.set(p.id, p);
  const toate: TaieturaV10O[] = [];
  for (const inst of foaie.instante) {
    const piesa = piese.get(inst.piesa);
    if (piesa === undefined) throw new Error(`instanța ${inst.id} trimite la piesa lipsă ${inst.piesa}`);
    const elemente = new Map(preordineElementeO(piesa.radacina).map((e) => [e.id, e]));
    for (const op of piesa.operatii) {
      const operatieDeschisa = op.noduri.some((n) => esteDeschisaO(elemente.get(n)?.forma));
      const despartire = op.despartire === true;
      for (const nod of op.noduri) {
        const e = lume.get(`${inst.id}/${nod}`);
        if (e === undefined) throw new Error(`operația ${op.id} a piesei ${piesa.id} trimite la ${nod}, care nu e element`);
        const deschisa = esteDeschisaO(e.forma);
        toate.push({
          idLume: e.idLume, instanta: inst.id, piesa: piesa.id, operatie: op.id, nod, latura: op.latura, adancime: op.adancime, pas: op.pas,
          scula: op.scula, forma: e.forma, matrice: e.matrice, sens: op.sens, urechi: op.urechi, rampa: op.rampa, intrari: op.intrari,
          colturi: op.colturi, despartire, deschisa, operatieDeschisa, clasa: clasaO(op.latura, despartire, deschisa),
        });
      }
    }
  }
  return ([0, 1, 2, 3] as const).flatMap((c) => toate.filter((t) => t.clasa === c));
}
