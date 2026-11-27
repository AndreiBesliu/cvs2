/**
 * Ce formă de freză primește fiecare operație (ADR 0090, ADR 0092 §3; ADR 0300 §4): o singură judecată, pentru lucrare, pentru
 * frezele oferite din bibliotecă (secțiunea Tăierea, rândurile exportului) și pentru formele care vin (bila cu relieful, ADR
 * 0310 §13; toroidala și profilul desenat, feliile 16.A↑e–f, își adaugă rândul aici).
 *
 * - Freza în V (și cea de gravare, cu vârf plat) taie doar pe linie (centrul pe vector) sau într-un V-carve: pe o parte, într-un
 *   buzunar sau la găurire, lucrarea ar decala-o cu Ø / 2, ca pe una plată, iar peretele n-ar ieși unde e desenat.
 * - V-carve-ul sapă pe axa medială cu conul frezei, deci cere o freză în V.
 * - Finisarea reliefului (ADR 0312 §2) merge cu freza plată, cu V-ul și cu bila (ADR 0312 §1).
 * - Degroșarea reliefului (ADR 0313 §1) cere freza plată: adaosul se socotește cu freza plată mărită cu el (ADR 0310 §4).
 * - Bila și toroidala (ADR 0303 §4) merg pe linie (canelura, 16.A↑e-3), în buzunar (16.A↑e-5) și pe o parte (16.A↑e-6):
 *   centrul frezei stă la R de perete, ca la freza plată, iar fundul rămâne cu creasta lor. În buzunar, fără freze de rest
 *   (geometria lor e a frezei plate, întrebarea 5a) și fără incrustație cu pereți drepți (pereții și fundul dopului cer freza
 *   plată). Pe o parte, cu adâncimea cel puțin raza colțului ρ (întrebarea 2a): pe desen, silueta are raza R abia la ρ
 *   deasupra vârfului, deci mai puțin adânc peretele n-ar ajunge la desen. Toroidala pe relief e a liniei reliefului.
 * - Freza plată merge în rest.
 */
import type { FormaSculaDoc, Latura, Operatie, Scula, TipOperatie } from './document.ts';
import { razaColtului } from './creasta.ts';

/**
 * De ce forma nu merge: `vcarve` (V-carve-ul cere o freză în V), `v-pe-linie` (freza în V taie doar pe linie sau într-un
 * V-carve), `bila` și `toroidala` (freza rotundă nu merge aici: azi, pe linie și în buzunar; bila și la finisarea
 * reliefului), `degrosare` (degroșarea reliefului cere o freză plată), `rotunda-rest` (un buzunar cu o freză rotundă nu are
 * freze de rest), `rotunda-incrustatie` (incrustația cu pereți drepți cere o freză plată), `rotunda-adancime` (pe o parte,
 * o freză rotundă cere adâncimea cel puțin raza colțului) și `profil` (profilul desenat nu se taie încă nicăieri: ADR 0304,
 * felia 16.A↑f-1; canelura vine în f-2, marginea profilată în f-3).
 */
export type MotivForma = 'vcarve' | 'v-pe-linie' | 'bila' | 'degrosare' | 'toroidala' | 'rotunda-rest' | 'rotunda-incrustatie' | 'rotunda-adancime' | 'profil';

/**
 * Ce mai contează din operație pentru o freză rotundă: în buzunar, frezele de rest și incrustația (lipsă = fără ele); pe o
 * parte, adâncimea (lipsă = necunoscută, deci refuzată).
 */
export type RestulOperatiei = {
  readonly rest?: readonly unknown[] | undefined;
  readonly incrustatie?: { readonly fel: string } | null | undefined;
  readonly adancime?: number | undefined;
};

/**
 * Motivul pentru care o freză de forma dată nu merge pe operație, sau null dacă merge (lipsa formei = freza plată). `o`:
 * frezele de rest, incrustația și adâncimea operației, unde se știu; `diametru`: al frezei judecate (la bilă, raza colțului e
 * Ø / 2). Pe o parte, o freză rotundă fără adâncime sau, la bilă, fără diametru nu se poate judeca: refuzată.
 */
export function motivFormaPeOperatie(
  tip: TipOperatie, latura: Latura, forma: FormaSculaDoc | undefined, o?: RestulOperatiei, diametru?: number,
): MotivForma | null {
  // Profilul desenat (ADR 0304, 16.A↑f-1): în document și în simulare, fără CAM încă.
  if (forma?.tip === 'profil') return 'profil';
  const rotunda = forma?.tip === 'bila' || forma?.tip === 'toroidala';
  // Canelura (ADR 0303 §4, 16.A↑e-3): bila și toroidala pe linie, cu centrul pe vector (drumul frezei plate de același Ø).
  if (rotunda && tip === 'profil' && latura === 'pe-linie') return null;
  // Pe o parte (16.A↑e-6, întrebarea 2a): drumul frezei plate de același Ø, cu adâncimea cel puțin raza colțului.
  if (rotunda && tip === 'profil') {
    const rho = razaColtului(forma, diametru);
    return rho !== null && o?.adancime !== undefined && o.adancime >= rho ? null : 'rotunda-adancime';
  }
  // Buzunarul (16.A↑e-5): inelele frezei plate de același Ø, fără freze de rest și fără incrustație cu pereți drepți.
  if (rotunda && tip === 'buzunar') {
    if ((o?.rest?.length ?? 0) > 0) return 'rotunda-rest';
    if (o?.incrustatie?.fel === 'drept') return 'rotunda-incrustatie';
    return null;
  }
  if (forma?.tip === 'toroidala') return 'toroidala';
  if (tip === 'finisare') return null;
  if (tip === 'degrosare') return forma === undefined ? null : 'degrosare';
  if (forma?.tip === 'bila') return 'bila';
  const v = forma?.tip === 'v';
  if (tip === 'vcarve') return v ? null : 'vcarve';
  if (v && !(tip === 'profil' && latura === 'pe-linie')) return 'v-pe-linie';
  return null;
}

/** Felul frezei în cuvinte, pentru motivele lucrării: „plată”, „în V”, „bilă”, „toroidală” sau „profilată” (un motiv numește forma). */
export function felFrezei(forma: FormaSculaDoc | undefined): 'plată' | 'în V' | 'bilă' | 'toroidală' | 'profilată' {
  return forma === undefined ? 'plată' : forma.tip === 'bila' ? 'bilă' : forma.tip === 'toroidala' ? 'toroidală' : forma.tip === 'profil' ? 'profilată' : 'în V';
}

/**
 * Forma pe care o poartă freza operației pe un rând editabil al ferestrei exportului (ADR 0290, `exportRand.ts`): plata (fără
 * formă), V-ul (cu vârful plat) și, din 16.A↑e-4, bila și toroidala (cu raza colțului, ADR 0303). O formă necunoscută (a unei
 * versiuni mai noi) n-are rând: Exportă o lasă neschimbată, iar lucrarea o refuză cu motivul ei, deci o freză nu devine pe
 * tăcute o plată.
 */
export function formaPeRand(forma: FormaSculaDoc | undefined): boolean {
  return forma === undefined || forma.tip === 'v' || forma.tip === 'bila' || forma.tip === 'toroidala';
}

/**
 * Operațiile cu un rând editabil în fereastra exportului: cele pe contur (nu finisarea și degroșarea reliefului, cu rândul lor
 * doar de citit), cu freza operației purtată de rând (`formaPeRand`) și cu frezele în plus (de rest, ale fundului plat, ale
 * dopului, a benzii) plate sau în V, ca până acum: rândul nu le poartă o formă rotundă, deci Exportă ar face din ea o plată.
 */
export function operatieCuRand(o: Operatie): boolean {
  return o.tip !== 'finisare' && o.tip !== 'degrosare'
    && frezeleOperatiei(o).every((f) => formaPeRand(f.scula.forma) && (f.cale === 'scula' || (f.scula.forma?.tip !== 'bila' && f.scula.forma?.tip !== 'toroidala')));
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
