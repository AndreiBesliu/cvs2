import { RAMPA_MINIMA } from './rampaMinima.ts';

/**
 * Raza minimă a intrării, în mm (ADR 0030 §6): sub ea, arcul iese din rezoluția postului. Stă singură, fără dependențe,
 * ca dialogul s-o citească fără să aducă CAM-ul în pachetul de pornire.
 */
export const RAZA_INTRARE_MINIMA = 0.5;

/**
 * Sub rampă, raza minimă a intrării (ADR 0031 §2): freza coboară pe sfertul de cerc, deci el are cel puțin rampa minimă,
 * πρ/2 ≥ 1 mm, adică ρ ≥ 2/π ≈ 0,637 mm. Un singur prag, citit și de dialog, și de lucrare.
 */
export const RAZA_INTRARE_MINIMA_RAMPA = (2 * RAMPA_MINIMA) / Math.PI;
