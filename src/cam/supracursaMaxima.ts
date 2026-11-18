/**
 * Cât poate trece o tăietură de fața de jos a foii, în placa de sacrificiu, în mm (ADR 0028 §2): marginea lucrării și a câmpului
 * din fereastra exportului (ADR 0176). Stă singură, fără dependențe, ca fereastra s-o citească fără să aducă CAM-ul în pachetul
 * de pornire.
 */
export const SUPRACURSA_MAXIMA = 2;
