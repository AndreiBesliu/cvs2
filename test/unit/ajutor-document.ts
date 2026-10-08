/**
 * Documente v2 pentru teste, din forme scrise ca în v1 (id, formă, matrice): fiecare formă devine o piesă cu o singură
 * instanță, ambele cu id-ul formei, ca la migrarea v1 → v2 (ADR 0024). Translația matricei merge pe instanță, restul pe
 * element. Id-ul în lume al formei `e1` e deci `e1/e1`.
 */
import { documentNou, type Document, type FormaDoc } from '../../src/model/document.ts';

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
    })),
    foi: [{ ...foaie, instante: forme.map((x) => ({ id: x.id, piesa: x.id, x: x.matrice.e, y: x.matrice.f, rotire: 0 })) }],
  };
}
