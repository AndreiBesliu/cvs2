/**
 * Limitele verificării vectorilor (ADR 0124 §1), fără calculul ei: panoul le citește pe firul principal, iar calculul
 * (`verificare.ts`, cu geometria) stă în workerul CAM.
 */
import { REZOLUTIE } from '../geom/toleranta.ts';

/** Toleranța implicită, în mm: rezoluția modelului. Sub ea, două noduri sunt prea apropiate și două contururi sunt același. */
export const TOLERANTA_VERIFICARE = REZOLUTIE;
/** Toleranța cea mai mică primită (mm): toleranța proiectului (biarcele unei cubice stau sub ea). */
export const TOLERANTA_MINIMA = 0.001;
/** Toleranța cea mai mare primită (mm). */
export const TOLERANTA_MAXIMA = 1;
/** Pragul implicit al buclei mici, în procente din aria formei (§4): sub el, bucla e „mică” (decizia 5a). */
export const PRAG_BUCLA = 1;
/** Pragul implicit de închidere (§12), în mm: „Închide” apare pe căile deschise cu golul cel mult atât (decizia 3a). */
export const PRAG_INCHIDERE = 1;
/** Pragul de închidere cel mai mic primit (mm): toleranța cea mai mică. */
export const INCHIDERE_MINIMA = 0.001;
/** Pragul de închidere cel mai mare primit (mm): peste, capetele unei linii de gravat. */
export const INCHIDERE_MAXIMA = 10;
