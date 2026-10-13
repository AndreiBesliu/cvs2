import type { Capabilitate } from '../../shared/capabilitati.ts';
import type { CheieSimpla } from '../i18n/t.ts';

/**
 * Registrul de acțiuni (`PLAN.md` §3.2): singura ușă a interfeței spre domeniu. Barele, meniurile, tastatura,
 * asistentul pentru începători și analiza din admin sunt doar vederi ale aceluiași registru.
 *
 * Fiecare acțiune are id, etichetă (cheie `t()`), `activa` (adevărat, sau cheia motivului pentru care nu e), capabilitatea
 * cerută și `ruleaza`. Capabilitatea e obligatorie din prima zi, deși până la facturare toate sunt permise.
 */
export type Actiune<C> = {
  readonly id: string;
  readonly eticheta: CheieSimpla;
  readonly capabilitate: Capabilitate;
  readonly activa: (ctx: C) => true | CheieSimpla;
  readonly ruleaza: (ctx: C) => void;
};

export type Registru<C> = {
  readonly actiuni: ReadonlyMap<string, Actiune<C>>;
  readonly areCapabilitate: (c: Capabilitate) => boolean;
};

export type RezultatActiune = { readonly ok: true } | { readonly ok: false; readonly motiv: CheieSimpla };

export function creeazaRegistru<C>(lista: readonly Actiune<C>[], areCapabilitate: (c: Capabilitate) => boolean): Registru<C> {
  const actiuni = new Map<string, Actiune<C>>();
  for (const a of lista) {
    if (actiuni.has(a.id)) throw new Error(`acțiunea „${a.id}” e înregistrată de două ori`);
    actiuni.set(a.id, a);
  }
  return { actiuni, areCapabilitate };
}

/** Starea unei acțiuni pentru interfață: se poate apăsa, sau de ce nu. */
export function stare<C>(r: Registru<C>, id: string, ctx: C): RezultatActiune {
  const a = r.actiuni.get(id);
  if (!a) return { ok: false, motiv: 'motiv.actiune-necunoscuta' };
  if (!r.areCapabilitate(a.capabilitate)) return { ok: false, motiv: 'motiv.fara-capabilitate' };
  const activa = a.activa(ctx);
  return activa === true ? { ok: true } : { ok: false, motiv: activa };
}

/** Vederea paletei de comenzi: fiecare acțiune a registrului, în ordinea lui, cu eticheta și starea ei de acum. */
export function toate<C>(r: Registru<C>, ctx: C): Array<{ readonly id: string; readonly eticheta: CheieSimpla; readonly stare: RezultatActiune }> {
  return [...r.actiuni.values()].map((a) => ({ id: a.id, eticheta: a.eticheta, stare: stare(r, a.id, ctx) }));
}

/** Rulează acțiunea doar dacă e permisă și activă; altfel întoarce motivul, fără efect. */
export function ruleaza<C>(r: Registru<C>, id: string, ctx: C): RezultatActiune {
  const s = stare(r, id, ctx);
  if (!s.ok) return s;
  r.actiuni.get(id)?.ruleaza(ctx);
  return s;
}
