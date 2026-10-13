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

/**
 * Cât mută importul geometria din fișier, în mm (ADR 0035 §6, §7): arcele eliptice și cele plate scrise ca cubice, și
 * golul sub care o subcale fără `Z` e închisă. O miime din toleranța proiectului: biarcele (0,99 × tol) plus importul
 * rămân sub toleranță față de curba din fișier.
 */
export const TOLERANTA_IMPORT = TOLERANTA_PROIECT / 1_000;

/**
 * Rezoluția modelului, în mm: sub ea (colțuri, offseturi), rezultatul nu e garantat (s1-V §5.4). O subcale importată
 * mai mică de atât e praf (ADR 0037 §11), iar un contur cu capetele mai apropiate se închide la ușă.
 */
export const REZOLUTIE = 0.01;
