/**
 * Calculatorul avansului (ADR 0305 §4, felia 16.A↑g-3), pur: turația din viteza de așchiere și diametru,
 * n = Vc · 1000 / (π · D), rotunjită la 10 rot/min (fără Vc, turația de acum); avansul F = n · z · fz, rotunjit la 1 mm/min.
 * Calculatorul doar scrie în câmpuri: fz și Vc nu se țin în freză. Un rezultat în afara marginilor frezei nu se scrie.
 */
import { MARGINI_FREZA } from './freza.ts';

/** Avansul pe dinte cel mai mare primit, în mm (peste el, o greșeală de scriere, nu o freză). */
export const MARGINI_FZ = 2;
/** Viteza de așchiere cea mai mare primită, în m/min. */
export const MARGINI_VC = 2000;

export type CerereAvans = {
  /** Diametrul frezei, în mm (cerut doar cu Vc). */
  readonly diametru: number;
  /** Numărul de tăișuri (z), întreg, de la 1. */
  readonly taisuri: number | undefined;
  /** Avansul pe dinte (fz), în mm. */
  readonly fz: number;
  /** Viteza de așchiere (Vc), în m/min; null: turația rămâne cea de acum. */
  readonly vc: number | null;
  /** Turația de acum, în rot/min (folosită fără Vc). */
  readonly turatie: number;
};
export type MotivAvans = 'taisuri' | 'fz' | 'vc' | 'diametru' | 'turatie' | 'margini-turatie' | 'margini-avans';
export type RezultatAvans = { readonly ok: true; readonly turatie: number; readonly avans: number } | { readonly ok: false; readonly motiv: MotivAvans };

const finit = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

export function calculeazaAvans(c: CerereAvans): RezultatAvans {
  if (!finit(c.taisuri) || !Number.isInteger(c.taisuri) || c.taisuri < 1 || c.taisuri > MARGINI_FREZA.taisuri) return { ok: false, motiv: 'taisuri' };
  if (!finit(c.fz) || !(c.fz > 0) || c.fz > MARGINI_FZ) return { ok: false, motiv: 'fz' };
  let n: number;
  if (c.vc !== null) {
    if (!finit(c.vc) || !(c.vc > 0) || c.vc > MARGINI_VC) return { ok: false, motiv: 'vc' };
    if (!finit(c.diametru) || !(c.diametru > 0) || c.diametru > MARGINI_FREZA.diametru) return { ok: false, motiv: 'diametru' };
    n = Math.round((c.vc * 1000) / (Math.PI * c.diametru) / 10) * 10;
  } else {
    if (!finit(c.turatie) || !Number.isInteger(c.turatie) || !(c.turatie > 0) || c.turatie > MARGINI_FREZA.turatie) return { ok: false, motiv: 'turatie' };
    n = c.turatie;
  }
  if (!(n > 0) || n > MARGINI_FREZA.turatie) return { ok: false, motiv: 'margini-turatie' };
  const f = Math.round(n * c.taisuri * c.fz);
  if (!(f > 0) || f > MARGINI_FREZA.avans) return { ok: false, motiv: 'margini-avans' };
  return { ok: true, turatie: n, avans: f };
}
