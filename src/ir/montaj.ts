/**
 * Montajul: unde stă zeroul programului față de foaie. O singură transformare, document → mașină, aplicată doar de post
 * (T8, ADR 0008). Ediția întâi avea originea din dreapta oglindită 104 zile, fiindcă fiecare emitent își făcea singur
 * transformarea.
 */
export type ColtOrigine = 'stanga-jos' | 'dreapta-jos' | 'dreapta-sus' | 'stanga-sus';

export const COLTURI: readonly ColtOrigine[] = ['stanga-jos', 'dreapta-jos', 'dreapta-sus', 'stanga-sus'];

export type Montaj = {
  readonly foaie: { readonly latime: number; readonly inaltime: number; readonly grosime: number };
  readonly origine: ColtOrigine;
  /** Z0 pe fața de sus a materialului, sau pe fața de jos (pe masa de sacrificiu). */
  readonly z0: 'sus' | 'jos';
};

/** Transformarea afină a montajului: x′ = a·x + c·y + e, y′ = b·x + d·y + f, z′ = z + dz. */
export type TransformareMontaj = {
  readonly a: number; readonly b: number; readonly c: number; readonly d: number;
  readonly e: number; readonly f: number; readonly dz: number;
};

/** Colțurile sunt translații pure: foaia stă pe mașină cum stă în document, doar zeroul se mută. */
export function transformareMontaj(m: Montaj): TransformareMontaj {
  const { latime, inaltime, grosime } = m.foaie;
  const e = m.origine === 'dreapta-jos' || m.origine === 'dreapta-sus' ? -latime : 0;
  const f = m.origine === 'dreapta-sus' || m.origine === 'stanga-sus' ? -inaltime : 0;
  return { a: 1, b: 0, c: 0, d: 1, e, f, dz: m.z0 === 'jos' ? grosime : 0 };
}

export function aplicaMontaj(t: TransformareMontaj, x: number, y: number): { x: number; y: number } {
  return { x: t.a * x + t.c * y + t.e, y: t.b * x + t.d * y + t.f };
}

/** O oglindire (determinant negativ) inversează sensul arcelor. */
export function oglindeste(t: TransformareMontaj): boolean {
  return t.a * t.d - t.b * t.c < 0;
}
