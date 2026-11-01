import { MARGINI_SETARI, ZI_MS, type Drept, type Plan, type SetariConturi } from './conturi.ts';

/**
 * Conturile clienților (ADR 0116), partea serverului și a paginii `/admin`: documentele, setările din fila Setări, planul
 * ținut și cel efectiv, schimbările de plan din fila Utilizatori, cu cererea și răspunsurile callable-ului
 * `administreazaConturile`. Editorul nu le folosește: stau aici, nu în `conturi.ts`, care e în pachetul de pornire (tot ce
 * importă adminul de acolo ar ajunge în pornire, ca export pentru bucata adminului). Nu importă nimic din `src/`.
 */

/** Documentele conturilor, `conturi/{uid}`, scrise doar de callable-urile `cont` și `administreazaConturile`. */
export const COLECTIE_CONTURI = 'conturi';
/** Setările conturilor (ADR 0116 §20), scrise din fila Setări a adminului și citite de server. */
export const CALE_SETARI = { colectie: 'setari', id: 'conturi' } as const;

/** Implicitele owner-ului (ADR 0116 §8, §16): 7 zile offline, tichetele rezolvate păstrate un an. */
export const SETARI_IMPLICITE: SetariConturi = { zileOffline: 7, zilePastrareTichete: 365 };

/** O valoare a setării `k`: întreagă, din marginile ei. */
function inMargini(k: keyof SetariConturi, v: unknown): v is number {
  const m = MARGINI_SETARI[k];
  return typeof v === 'number' && Number.isInteger(v) && v >= m.min && v <= m.max;
}

/** Setările citite: fiecare valoare întreagă din marginile ei, altfel implicitul (un document lipsă sau stricat nu oprește nimic). */
export function setariDin(x: unknown): SetariConturi {
  const d = typeof x === 'object' && x !== null ? (x as Record<string, unknown>) : {};
  const ia = (k: keyof SetariConturi): number => {
    const v = d[k];
    return inMargini(k, v) ? v : SETARI_IMPLICITE[k];
  };
  return { zileOffline: ia('zileOffline'), zilePastrareTichete: ia('zilePastrareTichete') };
}

/**
 * Setările cerute din fila Setări (ADR 0116 §20): amândouă, întregi, din marginile lor; altfel null. Spre deosebire de
 * citire, o valoare greșită nu devine implicitul: cererea se refuză.
 */
export function setariCerute(x: unknown): SetariConturi | null {
  if (typeof x !== 'object' || x === null) return null;
  const d = x as Record<string, unknown>;
  const zileOffline = d['zileOffline'];
  const zilePastrareTichete = d['zilePastrareTichete'];
  return inMargini('zileOffline', zileOffline) && inMargini('zilePastrareTichete', zilePastrareTichete)
    ? { zileOffline, zilePastrareTichete } : null;
}

/** Planurile scrise în `conturi/{uid}.plan` (ADR 0116 §7); `expirat` și `personal` se deduc. */
export const PLANURI_TINUTE = ['proba', 'gratuit', 'dezactivat'] as const;
export type PlanTinut = (typeof PLANURI_TINUTE)[number];

export function estePlanTinut(x: unknown): x is PlanTinut {
  return (PLANURI_TINUTE as readonly unknown[]).includes(x);
}

/** Planul efectiv, pe server: personalul are tot; o probă trecută (sau fără sfârșit) e expirată. */
export function planEfectiv(tinut: unknown, probaPana: number | null, personal: boolean, acum: number): Plan {
  if (personal) return 'personal';
  if (tinut === 'gratuit' || tinut === 'dezactivat') return tinut;
  return tinut === 'proba' && probaPana !== null && probaPana > acum ? 'proba' : 'expirat';
}

/* ── Fila Utilizatori și fila Setări (ADR 0116 §19, §20; felia 14.C↑b) ─────────────────────────────────────────────── */

/** Proba dată din fila Utilizatori: de azi, cel puțin o zi, cel mult un an. */
export const MARGINI_PROBA = { min: 1, max: 365 } as const;

export function zileProbaBune(x: unknown): x is number {
  return typeof x === 'number' && Number.isInteger(x) && x >= MARGINI_PROBA.min && x <= MARGINI_PROBA.max;
}

/** Planul de dinainte de dezactivare, pus la loc de reactivare. */
export type PlanInainte = { readonly plan: 'proba' | 'gratuit'; readonly probaPana: number | null };

/** Planul ținut în `conturi/{uid}`: planul (altă valoare se poartă ca o probă trecută), sfârșitul probei, planul de dinainte. */
export type PlanDocument = { readonly plan: unknown; readonly probaPana: number | null; readonly inainte: PlanInainte | null };

/** Ce face fila Utilizatori pe un cont: planul gratuit, o probă de N zile de azi, dezactivarea, reactivarea. */
export type SchimbarePlan =
  | { readonly fel: 'gratuit' }
  | { readonly fel: 'proba'; readonly zile: number }
  | { readonly fel: 'dezactiveaza' }
  | { readonly fel: 'reactiveaza' };

export function schimbareDin(x: unknown): SchimbarePlan | null {
  if (typeof x !== 'object' || x === null) return null;
  const d = x as Record<string, unknown>;
  const fel = d['fel'];
  if (fel === 'gratuit' || fel === 'dezactiveaza' || fel === 'reactiveaza') return { fel };
  const zile = d['zile'];
  return fel === 'proba' && zileProbaBune(zile) ? { fel, zile } : null;
}

/**
 * Planul ținut după o schimbare din fila Utilizatori, pur. Gratuitul și proba nouă scot contul din dezactivare; gratuitul
 * păstrează sfârșitul probei vechi doar ca dată (n-are termen). Dezactivarea ține planul de dinainte, iar reactivarea îl
 * pune la loc; fără el, o probă cu sfârșitul ei (expirată, dacă a trecut). Dezactivarea unui cont dezactivat și reactivarea
 * unuia activ nu schimbă nimic.
 */
export function planDupa(c: PlanDocument, s: SchimbarePlan, acum: number): PlanDocument {
  switch (s.fel) {
    case 'gratuit': return { plan: 'gratuit', probaPana: c.probaPana, inainte: null };
    case 'proba': return { plan: 'proba', probaPana: acum + s.zile * ZI_MS, inainte: null };
    case 'dezactiveaza':
      return c.plan === 'dezactivat' ? c : { plan: 'dezactivat', probaPana: c.probaPana, inainte: { plan: c.plan === 'gratuit' ? 'gratuit' : 'proba', probaPana: c.probaPana } };
    case 'reactiveaza':
      if (c.plan !== 'dezactivat') return c;
      return c.inainte ? { plan: c.inainte.plan, probaPana: c.inainte.probaPana, inainte: null } : { plan: 'proba', probaPana: c.probaPana, inainte: null };
  }
}

export function acelasiPlan(a: PlanDocument, b: PlanDocument): boolean {
  const i = a.inainte;
  const j = b.inainte;
  return a.plan === b.plan && a.probaPana === b.probaPana
    && (i === null || j === null ? i === j : i.plan === j.plan && i.probaPana === j.probaPana);
}

/**
 * Planul văzut de cine schimbă planul (ADR 0116 §19): planul ținut și sfârșitul probei, din lista filei. Serverul refuză o
 * schimbare făcută pe un plan care s-a schimbat între timp (alt om din personal, contul deschis cu altă stare).
 */
export type PlanVazut = { readonly plan: string | null; readonly probaPana: number | null };

export function planVazutDin(x: unknown): PlanVazut | null {
  if (typeof x !== 'object' || x === null) return null;
  const d = x as Record<string, unknown>;
  const plan = d['plan'];
  const probaPana = d['probaPana'];
  const bunPlan = plan === null || (typeof plan === 'string' && plan.length <= 40);
  const bunaProba = probaPana === null || (typeof probaPana === 'number' && Number.isFinite(probaPana));
  return bunPlan && bunaProba ? { plan, probaPana } : null;
}

export function vazutDin(c: PlanDocument): PlanVazut {
  return { plan: typeof c.plan === 'string' ? c.plan : null, probaPana: c.probaPana };
}

/** Cererile callable-ului `administreazaConturile`: planul unui cont (`conturi.administreaza`) și setările (owner-ul). */
export type CerereConturi =
  | { readonly actiune: 'plan'; readonly uid: string; readonly schimbare: SchimbarePlan; readonly vazut: PlanVazut }
  | { readonly actiune: 'setari'; readonly setari: SetariConturi };

/** Răspunsul unei schimbări de plan: dreptul contului, calculat din nou (ca la deschidere). */
export type RaspunsPlan = { readonly ok: true; readonly schimbat: boolean; readonly drept: Drept };
export type RaspunsSetari = { readonly ok: true; readonly schimbat: boolean; readonly setari: SetariConturi };
