/**
 * Fila Utilizatori (ADR 0116 §19), partea pură: documentele `conturi/{uid}` citite prin reguli devin rânduri (ce lipsește e
 * necunoscut, nu inventat), cu planul de arătat la ora citirii și planul văzut, trimis înapoi la o schimbare.
 */
import { dreptBun, type Plan } from '../../../shared/conturi.ts';
import { estePlanTinut, planEfectiv, type PlanTinut, type PlanVazut } from '../../../shared/conturiPlan.ts';
import { dataDin } from '../erori/date.ts';

/** Câte conturi aduce lista, cele mai noi întâi (căutarea pe server vine în 14.D↑). */
export const PLAFON_LISTA_CONTURI = 100;

export interface ContClient {
  readonly uid: string;
  readonly email: string | null;
  readonly nume: string | null;
  readonly creatLa: Date | null;
  readonly ultimaLogare: Date | null;
  /** Planul ținut; null = o valoare pe care pagina n-o cunoaște. */
  readonly plan: PlanTinut | null;
  readonly probaPana: Date | null;
  /** Personalul are tot (ADR 0116 §7), după ultimul drept calculat de server. */
  readonly personal: boolean;
  /** Planul ținut și sfârșitul probei, cum le-a văzut pagina (serverul refuză o schimbare pe un plan vechi). */
  readonly vazut: PlanVazut;
}

type Date_ = Readonly<Record<string, unknown>>;

const text = (x: unknown): string | null => (typeof x === 'string' && x !== '' ? x : null);

export function contDin(uid: string, d: Date_): ContClient {
  const plan = d['plan'];
  const probaPana = dataDin(d['probaPana']);
  const drept = d['drept'];
  return {
    uid, email: text(d['email']), nume: text(d['nume']), creatLa: dataDin(d['creatLa']), ultimaLogare: dataDin(d['ultimaLogare']),
    plan: estePlanTinut(plan) ? plan : null, probaPana, personal: dreptBun(drept) && drept.plan === 'personal',
    vazut: { plan: typeof plan === 'string' ? plan : null, probaPana: probaPana?.getTime() ?? null },
  };
}

/** Planul de arătat acum: al personalului, altfel cel efectiv, din planul ținut (o probă trecută e expirată). */
export function planAfisat(c: ContClient, acum: number): Plan {
  return c.personal ? 'personal' : planEfectiv(c.plan, c.probaPana?.getTime() ?? null, false, acum);
}
