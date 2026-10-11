/**
 * Bugetul de toleranță (ADR 0033 §1, `docs/PORTARE.md` §3.3): cifrele aproximărilor de pe drumul spre mașină, într-un
 * singur loc. Rotunjirea postului (0,0005 mm, la 3 zecimale) e separată.
 */

/** Abaterea declarată a oricărei aproximări de pe drumul spre mașină, în mm (T2, ADR 0002). */
export const TOLERANTA_PROIECT = 0.001;

/** Fitter-ul țintește atât din toleranță: eșantionarea poate scăpa un vârf între puncte, iar abaterea reală rămâne sub. */
export const TINTA_APROXIMARE = 0.99;
