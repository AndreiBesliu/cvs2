/**
 * Documente v3 pentru teste, din forme scrise ca în v1 (id, formă, matrice): fiecare formă devine o piesă cu o singură
 * instanță, ambele cu id-ul formei, ca la migrarea v1 → v2 (ADR 0024), iar piesa primește operația implicită a formei,
 * ca la migrarea v2 → v3 (ADR 0025). Translația matricei merge pe instanță, restul pe element. Id-ul în lume al formei
 * `e1` e deci `e1/e1`.
 */
import { documentNou, operatieImplicita, type Document, type FormaDoc, type Operatie } from '../../src/model/document.ts';

export const ID = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } as const;

export type FormaSimpla = {
  readonly id: string;
  readonly forma: FormaDoc;
  readonly matrice: { readonly a: number; readonly b: number; readonly c: number; readonly d: number; readonly e: number; readonly f: number };
};

export const lume = (id: string): string => `${id}/${id}`;

export function docDin(stoc: { latime: number; inaltime: number; grosime: number }, ...forme: readonly FormaSimpla[]): Document {
  const d = documentNou(stoc);
  const foaie = d.foi[0];
  if (!foaie) throw new Error('documentul nou n-are foaie');
  return {
    ...d,
    piese: forme.map((x) => ({
      id: x.id,
      radacina: { tip: 'element', id: x.id, forma: x.forma, matrice: { ...x.matrice, e: 0, f: 0 } },
      operatii: [operatieImplicita(x.id, x.forma)],
    })),
    foi: [{ ...foaie, instante: forme.map((x) => ({ id: x.id, piesa: x.id, x: x.matrice.e, y: x.matrice.f, rotire: 0 })) }],
  };
}

/** Documentul cu operațiile piesei `id` schimbate (latura, adâncimea, pasul, scula, nodurile), ca la Exportă în dialog. */
export function cuOperatie(d: Document, id: string, v: Partial<Omit<Operatie, 'id' | 'tip'>>): Document {
  return { ...d, piese: d.piese.map((p) => (p.id === id ? { ...p, operatii: p.operatii.map((o) => ({ ...o, ...v })) } : p)) };
}

/** Documentul cu freza tuturor operațiilor de diametrul dat (dialogul are o singură freză). */
export function cuDiametru(d: Document, diametru: number): Document {
  return { ...d, piese: d.piese.map((p) => ({ ...p, operatii: p.operatii.map((o) => ({ ...o, scula: { ...o.scula, diametru } })) })) };
}
