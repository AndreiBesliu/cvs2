/**
 * Ce formă de freză primește fiecare operație (ADR 0090, ADR 0092 §3; ADR 0300 §4): o singură judecată, pentru lucrare, pentru
 * frezele oferite din bibliotecă (secțiunea Tăierea, rândurile exportului) și pentru formele care vin (bila cu relieful, ADR
 * 0310 §13; toroidala și profilul desenat, feliile 16.A↑e–f, își adaugă rândul aici).
 *
 * - Freza în V (și cea de gravare, cu vârf plat) taie doar pe linie (centrul pe vector) sau într-un V-carve: pe o parte, într-un
 *   buzunar sau la găurire, lucrarea ar decala-o cu Ø / 2, ca pe una plată, iar peretele n-ar ieși unde e desenat.
 * - V-carve-ul sapă pe axa medială cu conul frezei, deci cere o freză în V.
 * - Finisarea reliefului (ADR 0312 §2) merge cu freza plată, cu V-ul și cu bila; bila (ADR 0312 §1), doar acolo, până la felia
 *   bilei a liniei frezelor (16.A↑e): profilul, buzunarul și celelalte ar decala-o ca pe una plată.
 * - Degroșarea reliefului (ADR 0313 §1) cere freza plată: adaosul se socotește cu freza plată mărită cu el (ADR 0310 §4).
 * - Freza toroidală (ADR 0303 §1, documentul v31) nu merge încă pe nicio operație, nici pe finisare: simularea o taie, dar
 *   CAM-ul ei vine pe sub-felii (canelura în 16.A↑e-3, buzunarul în e-4, profilul în e-5), fiecare cu rândul ei aici.
 * - Freza plată merge în rest.
 */
import type { FormaSculaDoc, Latura, Operatie, Scula, TipOperatie } from './document.ts';

/**
 * De ce forma nu merge: `vcarve` (V-carve-ul cere o freză în V), `v-pe-linie` (freza în V taie doar pe linie sau într-un
 * V-carve), `bila` (freza bilă merge doar la finisarea reliefului), `degrosare` (degroșarea reliefului cere o freză plată),
 * `toroidala` (freza toroidală nu se taie încă, ADR 0303 §4).
 */
export type MotivForma = 'vcarve' | 'v-pe-linie' | 'bila' | 'degrosare' | 'toroidala';

/** Motivul pentru care o freză de forma dată nu merge pe operație, sau null dacă merge (lipsa formei = freza plată). */
export function motivFormaPeOperatie(tip: TipOperatie, latura: Latura, forma: FormaSculaDoc | undefined): MotivForma | null {
  // Canelura (ADR 0303 §4, 16.A↑e-3): bila și toroidala pe linie, cu centrul pe vector (drumul frezei plate de același Ø).
  if ((forma?.tip === 'bila' || forma?.tip === 'toroidala') && tip === 'profil' && latura === 'pe-linie') return null;
  if (forma?.tip === 'toroidala') return 'toroidala';
  if (tip === 'finisare') return null;
  if (tip === 'degrosare') return forma === undefined ? null : 'degrosare';
  if (forma?.tip === 'bila') return 'bila';
  const v = forma?.tip === 'v';
  if (tip === 'vcarve') return v ? null : 'vcarve';
  if (v && !(tip === 'profil' && latura === 'pe-linie')) return 'v-pe-linie';
  return null;
}

/** Felul frezei în cuvinte, pentru motivele lucrării: „plată”, „în V”, „bilă” sau „toroidală” (un motiv numește forma). */
export function felFrezei(forma: FormaSculaDoc | undefined): 'plată' | 'în V' | 'bilă' | 'toroidală' {
  return forma === undefined ? 'plată' : forma.tip === 'bila' ? 'bilă' : forma.tip === 'toroidala' ? 'toroidală' : 'în V';
}

/**
 * Forma pe care o poartă un rând editabil al ferestrei exportului: plata (fără formă) și V-ul (cu vârful plat), singurele pe
 * care copia ferestrei le știe (ADR 0290, `exportRand.ts`). O operație cu altă freză (bila, toroidala, o formă necunoscută
 * a unei versiuni mai noi) n-are rând: Exportă o lasă neschimbată, iar lucrarea o refuză cu motivul ei, deci o freză nu
 * devine pe tăcute o plată.
 */
export function formaPeRand(forma: FormaSculaDoc | undefined): boolean {
  return forma === undefined || forma.tip === 'v';
}

/**
 * Operațiile cu un rând editabil în fereastra exportului: cele pe contur (nu finisarea și degroșarea reliefului, cu rândul lor
 * doar de citit), cu toate frezele purtate de rând (`formaPeRand`).
 */
export function operatieCuRand(o: Operatie): boolean {
  return o.tip !== 'finisare' && o.tip !== 'degrosare' && frezeleOperatiei(o).every((f) => formaPeRand(f.scula.forma));
}

/**
 * Toate frezele unei operații, cu calea lor în operație (ADR 0300 §5: scula, frezele de rest, fundul plat și frezele lui de
 * rest, frezele dopului cu pereți drepți, freza decupării benzii), în această ordine.
 */
export function frezeleOperatiei(o: Operatie): Array<{ readonly cale: string; readonly scula: Scula }> {
  const rez: Array<{ readonly cale: string; readonly scula: Scula }> = [{ cale: 'scula', scula: o.scula }];
  (o.rest ?? []).forEach((r, k) => rez.push({ cale: `rest[${k}]`, scula: r.scula }));
  if (o.fundPlat) {
    rez.push({ cale: 'fundPlat', scula: o.fundPlat.scula });
    (o.fundPlat.rest ?? []).forEach((r, k) => rez.push({ cale: `fundPlat.rest[${k}]`, scula: r.scula }));
  }
  const inc = o.incrustatie;
  if (inc?.fel === 'drept') (inc.frezeDop ?? []).forEach((r, k) => rez.push({ cale: `incrustatie.frezeDop[${k}]`, scula: r.scula }));
  if (inc?.fel === 'v' && inc.banda?.freza) rez.push({ cale: 'incrustatie.banda.freza', scula: inc.banda.freza });
  return rez;
}
