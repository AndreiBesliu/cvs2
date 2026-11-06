/**
 * Contul lui cvs2, cum îl vede o extensie cu permisiunea `cont` (ADR 0164 §B): din contul ținut de aplicație
 * (`src/app/dreptCont.ts`, ADR 0116 §8), doar conectat sau nu, numele și planul de acum, judecat la zi ca exportul și
 * senderul (`dreptLaZi`). Cât adresa nu e confirmată, numele (care e chiar adresa) rămâne gol, iar planul null. Nimic din
 * adresă, uid sau restul dreptului nu trece în cadru. Și contextul trimis cadrului: limba, tema și, doar cu permisiunea,
 * contul.
 */
import type { ContCvs2, ContextHost, Limba, PlanCont } from '../../extensii/api.ts';
import { dreptLaZi, type Plan } from '../../shared/conturi.ts';
import type { ContTinut } from '../app/dreptCont.ts';

/** Cât din nume vede extensia. */
const NUME_MAX = 80;

/** Planurile lui cvs2 sunt și ale extensiilor: un plan nou, nedat lor, nu trece de compilator. */
const planPentruExtensie = (p: Plan): PlanCont => p;

export function contPentruExtensie(c: ContTinut | null, acum: number): ContCvs2 {
  if (!c) return { conectat: false };
  if (!c.drept) return { conectat: true, nume: '', plan: null };
  return { conectat: true, nume: c.nume.slice(0, NUME_MAX), plan: planPentruExtensie(dreptLaZi(c.drept, acum).plan) };
}

export function contextPentruExtensie(limba: Limba, tema: Readonly<Record<string, string>>, permisiuni: readonly string[],
  c: ContTinut | null, acum: number): ContextHost {
  return permisiuni.includes('cont') ? { limba, tema, cont: contPentruExtensie(c, acum) } : { limba, tema };
}
