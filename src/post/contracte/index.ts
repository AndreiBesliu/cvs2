import type { Contract } from '../contract.ts';
import { FLUIDNC } from './fluidnc.ts';
import { GRBL_11 } from './grbl11.ts';
import { GRBLHAL } from './grblhal.ts';

/** Contractele familiei GRBL (etapa 3, `PLAN.md` §5.3 punctul 4); celelalte patru vin cu pachetul atelierelor. */
export const CONTRACTE = { 'grbl-11': GRBL_11, grblhal: GRBLHAL, fluidnc: FLUIDNC } as const satisfies Readonly<Record<string, Contract>>;
export type IdContract = keyof typeof CONTRACTE;
export const ID_CONTRACTE = Object.keys(CONTRACTE) as IdContract[];
export const esteIdContract = (x: string): x is IdContract => Object.hasOwn(CONTRACTE, x);
