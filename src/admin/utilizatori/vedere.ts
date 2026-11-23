/**
 * Fila Utilizatori a adminului reproiectat (ADR 0260 §5, felia A.5), partea pură: filtrele pe plan cu numărul fiecăruia,
 * căutarea în conturile încărcate, dreptul pe scurt și istoricul planului din rândurile de audit ale contului.
 */
import { PLANURI, zileRamase, type Plan } from '../../../shared/conturi.ts';
import { estePlanTinut, type PlanTinut } from '../../../shared/conturiPlan.ts';
import { simplu, type Intamplare } from '../carcasa/date.ts';
import { planAfisat, type ContClient } from './date.ts';

export type FiltruPlan = 'toate' | Plan;
export const FILTRE_PLAN: readonly FiltruPlan[] = ['toate', ...PLANURI];

/** Conturile din planul ales (cel arătat la `acum`), în ordinea citirii. */
export const pePlan = (conturi: readonly ContClient[], f: FiltruPlan, acum: number): ContClient[] =>
  conturi.filter((c) => f === 'toate' || planAfisat(c, acum) === f);

/** Câte conturi are fiecare filtru. */
export function numarPePlan(conturi: readonly ContClient[], acum: number): Record<FiltruPlan, number> {
  const n: Record<FiltruPlan, number> = { toate: conturi.length, proba: 0, gratuit: 0, expirat: 0, dezactivat: 0, personal: 0 };
  for (const c of conturi) n[planAfisat(c, acum)] += 1;
  return n;
}

/** Conturile care au textul căutat în adresă, nume sau uid (fără diacritice și majuscule); căutarea goală le dă pe toate. */
export function cautaConturi(conturi: readonly ContClient[], q: string): ContClient[] {
  const c = simplu(q.trim());
  return conturi.filter((x) => c === '' || simplu(`${x.uid} ${x.email ?? ''} ${x.nume ?? ''}`).includes(c));
}

/** Cât mai ține dreptul, pe scurt: fără termen, zilele rămase ale probei, sau de când a expirat; altfel nimic de spus. */
export type DreptScurt = { readonly fel: 'nelimitat' } | { readonly fel: 'zile'; readonly n: number } | { readonly fel: 'din'; readonly data: Date } | null;

export function dreptScurt(c: ContClient, acum: number): DreptScurt {
  const plan = planAfisat(c, acum);
  if (plan === 'gratuit') return { fel: 'nelimitat' };
  if (c.probaPana === null) return null;
  if (plan === 'proba') return { fel: 'zile', n: zileRamase(c.probaPana.getTime(), acum) };
  return plan === 'expirat' ? { fel: 'din', data: c.probaPana } : null;
}

/** Un pas din istoricul planului: planul ținut de după (null: necunoscut), sfârșitul probei, cine l-a făcut. */
export interface PasPlan {
  readonly id: string;
  readonly cand: Date | null;
  readonly plan: PlanTinut | null;
  readonly probaPana: Date | null;
  readonly cine: Intamplare['cine'];
  /** Deschiderea contului (prima logare), nu o schimbare făcută de personal. */
  readonly creare: boolean;
}

const DE_PLAN: ReadonlySet<string> = new Set(['conturi.creeaza', 'conturi.gratuit', 'conturi.proba', 'conturi.dezactiveaza', 'conturi.reactiveaza']);

/** Istoricul planului din rândurile de audit ale contului: doar schimbările de plan, cea mai nouă întâi (fără dată, la urmă). */
export function istoricPlan(randuri: readonly Intamplare[]): PasPlan[] {
  const t = (p: PasPlan): number => p.cand?.getTime() ?? -Infinity;
  return randuri.filter((r) => DE_PLAN.has(r.actiune)).map((r): PasPlan => {
    const plan = r.dupa?.['plan'];
    const pana = r.dupa?.['probaPana'];
    return {
      id: r.id, cand: r.cand, plan: estePlanTinut(plan) ? plan : null, probaPana: plan === 'proba' && typeof pana === 'number' ? new Date(pana) : null,
      cine: r.cine, creare: r.actiune === 'conturi.creeaza',
    };
  }).sort((a, b) => t(b) - t(a));
}
