/**
 * Modelul reliefului pentru vederea 3D (ADR 0310 §4, §7; felia 18.1↑b): compusul unei dale (straturile vizibile, de jos în
 * sus, de la planul zero, ADR 0311 §7), pe celulele ei din grilă, redus cu k (media pe blocuri k × k, ca desenul de pe
 * planșă), cu Z-ul dalei pe celulele ei întregi. Dalele se compun una câte una, iar k împarte latura dalei, deci compusul
 * întreg redus e chiar dalele lui puse una lângă alta: o dală schimbată se calculează și se urcă singură.
 */
import { compune, type Mod } from './compunere.ts';
import { citeste, type Dala } from './dala.ts';
import { CELULE_DALA, LATURA_DALA } from './grila.ts';

/** O dală a modelului: indicele ei în hartă, mărimea redusă, valorile (rândul 0 jos) și Z-ul celulelor ei. */
export type DalaModel = {
  readonly index: number; readonly latime: number; readonly inaltime: number;
  readonly z: Float32Array<ArrayBuffer>; readonly min: number; readonly max: number;
};

/** Factorii de reducere ai modelului: puteri ale lui 2, până la o celulă pe dală (k împarte latura dalei). */
export const FACTORI_MODEL: readonly number[] = [1, 2, 4, 8, 16, 32, 64, 128, 256];

/** Tampoanele unei cereri (o dală are 65 536 de celule: nu se alocă din nou la fiecare). */
export type TampoaneModel = { readonly straturi: Array<Float32Array<ArrayBuffer>>; readonly compus: Float32Array<ArrayBuffer> };

/**
 * Dala `index` a modelului, din dalele straturilor vizibile ale aceleiași poziții (în ordine, de jos în sus); `la` × `lb`
 * celulele ei din grilă (mai puține pe marginea de sus și din dreapta).
 */
export function dalaModel(
  index: number, straturi: ReadonlyArray<{ readonly mod: Mod; readonly dala: Dala }>, la: number, lb: number, k: number,
  t: TampoaneModel = { straturi: [], compus: new Float32Array(CELULE_DALA) },
): DalaModel {
  const valori = straturi.map((s, n) => {
    t.straturi[n] ??= new Float32Array(CELULE_DALA);
    return { mod: s.mod, vizibil: true, valori: citeste(s.dala, t.straturi[n]) };
  });
  const c = compune(CELULE_DALA, valori, t.compus);
  let min = Infinity, max = -Infinity;
  for (let b = 0; b < lb; b++) {
    for (let a = b * LATURA_DALA, sf = a + la; a < sf; a++) {
      const v = c[a] ?? 0;
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  const w = Math.ceil(la / k), h = Math.ceil(lb / k), z = new Float32Array(w * h);
  // Aceeași ordine a adunării ca `reduce` (rândurile, apoi coloanele blocului), deci aceleași valori.
  for (let bj = 0; bj < h; bj++) {
    for (let bi = 0; bi < w; bi++) {
      let s = 0, n = 0;
      for (let j = bj * k; j < Math.min(lb, bj * k + k); j++) {
        for (let i = bi * k; i < Math.min(la, bi * k + k); i++) { s += c[j * LATURA_DALA + i] ?? 0; n++; }
      }
      z[bj * w + bi] = s / n;
    }
  }
  return { index, latime: w, inaltime: h, z, min, max };
}
