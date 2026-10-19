import type { Mesaj } from './tipuri.ts';

/**
 * Mesajele traseului de pe pânză (ADR 0038 §2, §3), în engleză: cipul de stare și cel al timpului jobului (ADR 0046 §8). Vin
 * odată cu calculul traseului (`traseu.ts`), nu la pornire: pachetul de pornire are un plafon (`PLAN.md` §4.4). Durata în
 * cuvinte (`durata.*`) stă tot aici: o folosește și rezumatul exportului, care aduce dicționarul ăsta.
 */
export const enTraseu = {
  'traseu.calcul': 'Calculating the toolpath…',
  'traseu.vechi': 'The toolpath is out of date: T recalculates it',
  'traseu.refuz': 'The toolpath cannot be calculated: {motiv}',
  'traseu.fara-webgl': 'The toolpath cannot be shown: WebGL2 is unavailable in this browser',
  'traseu.context': 'The graphics card lost the toolpath; it comes back by itself',
  'traseu.rarit': 'Large toolpath: arcs are drawn coarser',
  'traseu.timp': 'Job time: {timp}',
  'traseu.timp.implicit': 'Estimated for {nume} with its factory settings. For your machine’s own times, paste its $$ reply in the export dialog.',
  'traseu.timp.setari': 'Estimated for {nume} with the pasted $$ settings.',
  'traseu.timp.fara': 'No job time: {motiv}',
  'traseu.timp.fara-setari': 'No job time: the pasted $$ settings, line {linie}: {motiv}',
  'traseu.timp.fara-setari-tot': 'No job time: the pasted $$ settings: {motiv}',
  'durata.s': '{s} s',
  'durata.min': '{m} min {s} s',
  'durata.h': '{h} h {m} min',
} as const satisfies Readonly<Record<string, Mesaj>>;
