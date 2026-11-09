/**
 * Lățimea dintre bucăți (ADR 0181 §2: spațiul sau suprapunerea), în mm, comună modelului tăierii (workerul) și opțiunilor din
 * interfață, fără să aducă modelul în bucata interfeței: de la rezoluția modelului (dublul celei mai mici distanțe a
 * offsetului, cu care se mută cuțitul cu jumătate din lățime) la 1 000; implicit 3.
 */
import { REZOLUTIE } from '../geom/toleranta.ts';

export const LATIME_MINIMA = REZOLUTIE;
export const LATIME_MAXIMA = 1000;
export const LATIME_IMPLICITA = 3;

/** O lățime bună: un număr între `LATIME_MINIMA` și `LATIME_MAXIMA`, cu tot cu ele. */
export const latimeBuna = (x: number): boolean => x >= LATIME_MINIMA && x <= LATIME_MAXIMA;
