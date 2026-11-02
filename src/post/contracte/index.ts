import type { Contract } from '../contract.ts';
import { FLUIDNC } from './fluidnc.ts';
import { GRBL_11 } from './grbl11.ts';
import { GRBLHAL } from './grblhal.ts';
import { MACH3 } from './mach3.ts';
import { MACH4 } from './mach4.ts';
import { NCSTUDIO } from './ncstudio.ts';
import { RICHAUTO } from './richauto.ts';
import { SYNTEC } from './syntec.ts';

/**
 * Contractele postului, în ordinea din fereastra exportului: familia GRBL (etapa 3, `PLAN.md` §5.3 punctul 4), pe care o
 * vorbește senderul aplicației, apoi cele ale atelierelor (etapa 4, punctul 6; ADR 0125), care se rulează de pe controlerul lor.
 */
export const CONTRACTE = {
  'grbl-11': GRBL_11, grblhal: GRBLHAL, fluidnc: FLUIDNC,
  ncstudio: NCSTUDIO, richauto: RICHAUTO, syntec: SYNTEC, mach3: MACH3, mach4: MACH4,
} as const satisfies Readonly<Record<string, Contract>>;
export type IdContract = keyof typeof CONTRACTE;
export const ID_CONTRACTE = Object.keys(CONTRACTE) as IdContract[];
export const esteIdContract = (x: string): x is IdContract => Object.hasOwn(CONTRACTE, x);
