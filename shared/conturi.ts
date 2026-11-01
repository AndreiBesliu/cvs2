import { CAPABILITATI, esteCapabilitate, type Capabilitate } from './capabilitati.ts';

/**
 * Conturile clienților (ADR 0116), comun editorului și serverului: planurile, dreptul de acces (calculat doar pe server),
 * cererea și răspunsul callable-ului `cont`, plus judecata dreptului pe care aplicația îl ține offline. Modulul e în pachetul
 * de pornire: ce folosesc doar serverul și `/admin` (documentele, setările, planul ținut și schimbările lui) stă în
 * `conturiPlan.ts`. Nu importă nimic din `src/`.
 */
/** Proba fără card (`BRIEF.md` §4), de la prima logare cu adresa verificată. */
export const ZILE_PROBA = 14;
export const ZI_MS = 86_400_000;

/** Setările conturilor (ADR 0116 §20; citirea și implicitele, în `conturiPlan.ts`). */
export type SetariConturi = { readonly zileOffline: number; readonly zilePastrareTichete: number };
/** Marginile setărilor; zilele offline judecă și dreptul ținut de aplicație (`dreptBun`). */
export const MARGINI_SETARI = { zileOffline: { min: 1, max: 60 }, zilePastrareTichete: { min: 30, max: 3650 } } as const;

/**
 * Planurile (ADR 0116 §7). Se țin în document: `proba` (cu sfârșitul ei), `gratuit`, `dezactivat`. Se deduc: `expirat` (proba
 * trecută) și `personal` (cine are drepturi în personal, ADR 0049).
 */
export const PLANURI = ['proba', 'gratuit', 'expirat', 'dezactivat', 'personal'] as const;
export type Plan = (typeof PLANURI)[number];

/** Ce se oprește fără drept, prin convenție în aplicație (ADR 0116 §9): exportul G-code și senderul. */
const OPRITE: ReadonlySet<Capabilitate> = new Set<Capabilitate>(['export-gcode', 'masina']);

export function capabilitatiPlan(plan: Plan): Capabilitate[] {
  return plan === 'expirat' || plan === 'dezactivat' ? CAPABILITATI.filter((c) => !OPRITE.has(c)) : [...CAPABILITATI];
}

/** Dreptul de acces, cum îl calculează serverul și îl ține aplicația (ADR 0116 §6, §8). */
export type Drept = {
  readonly plan: Plan;
  readonly capabilitati: readonly Capabilitate[];
  /** Sfârșitul probei (ms), doar la `proba`. */
  readonly pana: number | null;
  /** Când l-a calculat serverul (ms, ceasul lui). */
  readonly calculatLa: number;
  /** Câte zile îl ține aplicația fără reconfirmare (ADR 0116 §8). */
  readonly zileOffline: number;
};

export function dreptDin(plan: Plan, probaPana: number | null, zileOffline: number, acum: number): Drept {
  return { plan, capabilitati: capabilitatiPlan(plan), pana: plan === 'proba' ? probaPana : null, calculatLa: acum, zileOffline };
}

const numarBun = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

/** Dreptul ținut de aplicație (răspunsul serverului, păstrat în browser), verificat ca formă. */
export function dreptBun(x: unknown): x is Drept {
  if (typeof x !== 'object' || x === null) return false;
  const d = x as Record<string, unknown>;
  return (PLANURI as readonly unknown[]).includes(d['plan']) && Array.isArray(d['capabilitati'])
    && d['capabilitati'].every((c) => typeof c === 'string' && esteCapabilitate(c))
    && (d['pana'] === null || numarBun(d['pana'])) && numarBun(d['calculatLa'])
    && numarBun(d['zileOffline']) && Number.isInteger(d['zileOffline'])
    && d['zileOffline'] >= MARGINI_SETARI.zileOffline.min && d['zileOffline'] <= MARGINI_SETARI.zileOffline.max;
}

/**
 * Dreptul ținut, judecat acum (ADR 0116 §8): după zilele offline fără reconfirmare, după sfârșitul probei, sau cu ceasul
 * dat înapoi cu peste o zi față de calcul, se poartă ca un drept expirat, până la o nouă confirmare de la server.
 */
export function dreptLaZi(d: Drept, acum: number): Drept {
  if (d.plan === 'expirat' || d.plan === 'dezactivat') return d;
  const trecut = acum >= d.calculatLa + d.zileOffline * ZI_MS || acum < d.calculatLa - ZI_MS || (d.plan === 'proba' && d.pana !== null && acum >= d.pana);
  return trecut ? { ...d, plan: 'expirat', capabilitati: capabilitatiPlan('expirat') } : d;
}

/** Permite aplicația o capabilitate? Fără drept (fără cont, sau cu adresa neconfirmată): da, ca până acum (ADR 0116 §9). */
export function permite(d: Drept | null, c: Capabilitate, acum: number): boolean {
  return d === null || dreptLaZi(d, acum).capabilitati.includes(c);
}

/** Zilele întregi rămase până la `pana` (rotunjite în sus), cel puțin 0. */
export function zileRamase(pana: number, acum: number): number {
  return Math.max(0, Math.ceil((pana - acum) / ZI_MS));
}

/** Numele afișat al contului. */
export const NUME_MAX = 60;

/** Numele curățat: spațiile strânse, fără caractere de control, 1–60 de caractere; altfel null. */
export function curataNume(x: unknown): string | null {
  if (typeof x !== 'string' || /[\u0000-\u001f\u007f]/.test(x)) return null;
  const n = x.normalize('NFC').replace(/\s+/g, ' ').trim();
  return n !== '' && [...n].length <= NUME_MAX ? n : null;
}

/** Cererea callable-ului `cont`. */
export type CerereCont = { readonly actiune: 'deschide' } | { readonly actiune: 'nume'; readonly nume: string };

/** Răspunsul deschiderii: adresa neconfirmată (fără cont încă), sau contul, cu dreptul lui. */
export type RaspunsDeschide =
  | { readonly ok: true; readonly verificat: false; readonly email: string }
  | { readonly ok: true; readonly verificat: true; readonly email: string; readonly nume: string; readonly drept: Drept };

export type RaspunsNume = { readonly ok: true; readonly schimbat: boolean; readonly nume: string };
