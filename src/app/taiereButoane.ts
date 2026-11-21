/**
 * Calculul tăierii din butoane mari (ADR 0250, felia 28.1↑d, planșa „C · Întunecat”): − / + la adâncime și pas, freza comună
 * a operațiilor alese și numele rolului cu majusculă. Stă în afara panoului (`PanouProprietati.tsx`), ca proba unitară să-l
 * citească fără React.
 */
import { jsonCanonic } from '../model/jsonCanonic.ts';
import type { Operatie } from '../model/document.ts';

/** Cât mută − / + adâncimea și pasul, în mm. */
export const PAS_PLUS_MINUS = 0.5;

/**
 * Valoarea după un − (`semn` −1) sau un + (1), la micron (fără zecimalele lungi ale lui 0,1 + 0,2). Null când formele alese
 * au valori diferite (nu e de la ce porni) sau când − ar ajunge la zero ori sub el (o adâncime sau un pas trebuie să existe).
 */
export function plusMinus(valoare: number | null, semn: 1 | -1): number | null {
  if (valoare === null) return null;
  const x = Math.round((valoare + semn * PAS_PLUS_MINUS) * 1000) / 1000;
  return x > 0 ? x : null;
}

/** Freza comună a operațiilor (același număr, diametru, unghi și vârf), sau null când diferă ori nu sunt operații. */
export function frezaComuna(operatii: readonly Operatie[]): Operatie['scula'] | null {
  const s = operatii[0]?.scula;
  if (!s) return null;
  const amprenta = (x: Operatie['scula']): string => jsonCanonic({
    n: x.numar, d: x.diametru, u: x.forma?.unghi ?? null, v: x.forma?.varf ?? null,
  });
  const a = amprenta(s);
  return operatii.every((o) => amprenta(o.scula) === a) ? s : null;
}

/** Numele unui rol pe buton: cu majusculă, ca pe planșă („pe linie” → „Pe linie”, „V-carve” rămâne). */
export function cuMajuscula(text: string, limba: string): string {
  return text.charAt(0).toLocaleUpperCase(limba) + text.slice(1);
}
