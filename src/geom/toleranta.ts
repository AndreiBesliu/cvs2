/**
 * Bugetul de toleranță (ADR 0033 §1, `docs/PORTARE.md` §3.3): cifrele aproximărilor de pe drumul spre mașină, într-un
 * singur loc. Rotunjirea postului (0,0005 mm, la 3 zecimale) e separată.
 */

/** Abaterea declarată a oricărei aproximări de pe drumul spre mașină, în mm (T2, ADR 0002). */
export const TOLERANTA_PROIECT = 0.001;

/**
 * Fitter-ul țintește atât din toleranță: marja de sub ea, peste măsurătoarea rafinată (maximele locale ale eșantioanelor,
 * pe bucăți monotone pe x și pe y; ADR 0033 §6).
 */
export const TINTA_APROXIMARE = 0.99;

/**
 * Raza maximă a unui arc din biarce, în mm (ADR 0033 §4). Postul scrie ca segmente G1 orice arc cu raza peste garda
 * contractului (`razaMaxima`, 1e4 mm la GRBL 1.1), cu săgeata până la toleranță: o a doua aproximare peste prima ar
 * dubla abaterea (recenzia 2.7a: până la 2 × tol). Sub garda celui mai strict contract rămân 100 mm pentru offset, care
 * adaugă raza frezei. Testul `geom.toleranta.test.ts` leagă cifrele.
 */
export const RAZA_MAXIMA_ARC = 9_900;
