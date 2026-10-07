// Proba de tip: din aceeași declarație iese tipul TS. Dacă inferența se strică, tsc pică (Expect<false>).
import type * as Z from './schemas/zod.ts';
import type * as V from './schemas/valibot.ts';
import type * as TB from './schemas/typebox.ts';
import type * as AK from './schemas/arktype.ts';

type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Expect<T extends true> = T;

type SegKinds = 'L' | 'A' | 'C';
type NodeTypes = 'group' | 'vector' | 'text' | 'relief' | 'mesh';

export type Checks = [
  Expect<Equals<Z.SegT['k'], SegKinds>>, Expect<Equals<V.SegT['k'], SegKinds>>, Expect<Equals<TB.SegT['k'], SegKinds>>, Expect<Equals<AK.SegT['k'], SegKinds>>,
  Expect<Equals<Z.NodeT['type'], NodeTypes>>, Expect<Equals<V.NodeT['type'], NodeTypes>>, Expect<Equals<TB.NodeT['type'], NodeTypes>>, Expect<Equals<AK.NodeT['type'], NodeTypes>>,
  Expect<Equals<Extract<Z.SegT, { k: 'A' }>['cw'], boolean>>, Expect<Equals<Extract<V.SegT, { k: 'A' }>['cw'], boolean>>,
  Expect<Equals<Extract<TB.SegT, { k: 'A' }>['cw'], boolean>>, Expect<Equals<Extract<AK.SegT, { k: 'A' }>['cw'], boolean>>,
  Expect<Equals<Z.DocT['units'], 'mm' | 'in'>>, Expect<Equals<V.DocT['units'], 'mm' | 'in'>>, Expect<Equals<TB.DocT['units'], 'mm' | 'in'>>, Expect<Equals<AK.DocT['units'], 'mm' | 'in'>>,
  Expect<Equals<Extract<Z.NodeT, { type: 'text' }>['size'], number>>, Expect<Equals<Extract<V.NodeT, { type: 'text' }>['size'], number>>,
  Expect<Equals<Extract<TB.NodeT, { type: 'text' }>['size'], number>>, Expect<Equals<Extract<AK.NodeT, { type: 'text' }>['size'], number>>,
];

// Martor negativ: o greșeală de tip TREBUIE să pice (dacă nu pică, @ts-expect-error devine el eroare).
// @ts-expect-error 'cm' nu e unitate
export const u1: Z.DocT['units'] = 'cm';
// @ts-expect-error 'cm' nu e unitate
export const u2: V.DocT['units'] = 'cm';
// @ts-expect-error 'cm' nu e unitate
export const u3: TB.DocT['units'] = 'cm';
// @ts-expect-error 'cm' nu e unitate
export const u4: AK.DocT['units'] = 'cm';
// Martorul martorului: o egalitate falsă trebuie să pice.
// @ts-expect-error SegKinds nu e egal cu 'L'
export type Bad = Expect<Equals<Z.SegT['k'], 'L'>>;
