import type { Mesaj } from './tipuri.ts';

/**
 * Mesajele traseului de pe pânză (ADR 0038 §2, §3), în engleză: cipul de stare. Vin odată cu calculul traseului
 * (`traseu.ts`), nu la pornire: pachetul de pornire are un plafon (`PLAN.md` §4.4).
 */
export const enTraseu = {
  'traseu.calcul': 'Calculating the toolpath…',
  'traseu.vechi': 'The toolpath is out of date: T recalculates it',
  'traseu.refuz': 'The toolpath cannot be calculated: {motiv}',
  'traseu.fara-webgl': 'The toolpath cannot be shown: WebGL2 is unavailable in this browser',
  'traseu.context': 'The graphics card lost the toolpath; it comes back by itself',
  'traseu.rarit': 'Large toolpath: arcs are drawn coarser',
} as const satisfies Readonly<Record<string, Mesaj>>;
