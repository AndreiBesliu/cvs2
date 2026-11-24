/**
 * Ce formă de freză primește fiecare operație (ADR 0092 §3; ADR 0310 §13, cu linia frezelor): o singură funcție pură, folosită
 * de lucrare (`src/cam/job.ts`) și, mai târziu, de secțiunea Tăierea și de rândul exportului (16.A↑b-2), ca toate să spună
 * același lucru. Freza plată (fără formă) merge peste tot.
 *
 * - **V-ul** (și freza de gravare): pe linie (centrul pe vector) sau într-un V-carve. Pe o parte, într-un buzunar sau la
 *   găurire, lucrarea l-ar decala cu Ø/2, ca pe unul plat, iar peretele n-ar ieși unde e desenat.
 * - **Bila** intră odată cu operațiile de relief (finisarea, 18.1↑c), cu rândul ei aici; 16.A↑e (linia frezelor) lărgește apoi
 *   tabelul la celelalte operații, cu simularea și oracolul ei.
 */
import type { FormaSculaDoc, Latura, TipOperatie } from './document.ts';

export type MotivFormaFrezei = 'v-pe-parte';

/** Motivul pentru care operația nu primește forma frezei, sau null. */
export function motivFormaPeOperatie(tip: TipOperatie, latura: Latura, forma: FormaSculaDoc | undefined): MotivFormaFrezei | null {
  if (!forma) return null;
  return tip === 'vcarve' || (tip === 'profil' && latura === 'pe-linie') ? null : 'v-pe-parte';
}
