/**
 * Ce formă de freză primește fiecare operație (ADR 0090, ADR 0092 §3; ADR 0300 §4): o singură judecată, pentru lucrare, pentru
 * frezele oferite din bibliotecă (secțiunea Tăierea, rândurile exportului) și pentru formele care vin (bila cu relieful, ADR
 * 0310 §13; toroidala și profilul desenat, feliile 16.A↑e–f, își adaugă rândul aici).
 *
 * - Freza în V (și cea de gravare, cu vârf plat) taie doar pe linie (centrul pe vector) sau într-un V-carve: pe o parte, într-un
 *   buzunar sau la găurire, lucrarea ar decala-o cu Ø / 2, ca pe una plată, iar peretele n-ar ieși unde e desenat.
 * - V-carve-ul sapă pe axa medială cu conul frezei, deci cere o freză în V.
 * - Freza plată merge în rest.
 */
import type { FormaSculaDoc, Latura, TipOperatie } from './document.ts';

/** De ce forma nu merge: `vcarve` (V-carve-ul cere o freză în V), `v-pe-linie` (freza în V taie doar pe linie sau într-un V-carve). */
export type MotivForma = 'vcarve' | 'v-pe-linie';

/** Motivul pentru care o freză de forma dată nu merge pe operație, sau null dacă merge (lipsa formei = freza plată). */
export function motivFormaPeOperatie(tip: TipOperatie, latura: Latura, forma: FormaSculaDoc | undefined): MotivForma | null {
  const v = forma?.tip === 'v';
  if (tip === 'vcarve') return v ? null : 'vcarve';
  if (v && !(tip === 'profil' && latura === 'pe-linie')) return 'v-pe-linie';
  return null;
}
