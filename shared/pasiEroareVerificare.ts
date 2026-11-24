import { FELURI_PAS, MS_MAX_PAS, PLAFON_PASI, type FelPas, type PasEroare } from './pasiEroare.ts';
import { idBun, SURSE } from './utilizare.ts';

/**
 * Verificarea pașilor dinaintea unei erori (ADR 0262 §4, felia A.11a), pe server (raportul) și în admin (citirea): câmp cu
 * câmp, după contractul utilizării; ce nu e un pas se aruncă, nu raportul.
 */

const RE_REZ = /^[a-z0-9][a-z0-9.:-]{0,59}$/;
const obiect = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/** Pură: un pas venit din afară, verificat câmp cu câmp; altfel null. */
export function pasBun(x: unknown): PasEroare | null {
  if (!obiect(x)) return null;
  const chei = Object.keys(x);
  if (chei.some((k) => k !== 'fel' && k !== 'id' && k !== 'rez' && k !== 'ms')) return null;
  const { fel, id, rez, ms } = x;
  if (typeof fel !== 'string' || !(FELURI_PAS as readonly string[]).includes(fel)) return null;
  if (typeof id !== 'string') return null;
  const zona = fel === 'derulare' || fel === 'zoom';
  if (zona ? !(SURSE as readonly string[]).includes(id) : !idBun(id)) return null;
  if (rez !== undefined && (typeof rez !== 'string' || !RE_REZ.test(rez))) return null;
  if (typeof ms !== 'number' || !Number.isInteger(ms) || ms < 0 || ms > MS_MAX_PAS) return null;
  return rez === undefined ? { fel: fel as FelPas, id, ms } : { fel: fel as FelPas, id, rez, ms };
}

/** Pură: pașii unui raport (pe server): o listă, cel mult ultimii `PLAFON_PASI`, fiecare verificat; ce nu e un pas se aruncă. */
export function pasiDin(x: unknown): PasEroare[] {
  if (!Array.isArray(x)) return [];
  return x.slice(-PLAFON_PASI).map(pasBun).filter((p): p is PasEroare => p !== null);
}
