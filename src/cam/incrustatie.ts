/**
 * Incrustația în V (ADR 0170, ADR 0172): ce se poate tăia și ce dă dopul. Locașul e V-carve-ul operației, tăiat în programul
 * foii (`job.ts`, care refuză cu `refuzIncrustatie` de aici); dopul îl face `dopV.ts`, din aceleași contururi, la fiecare
 * export, ca un program separat, pe semifabricatul lui.
 */
import { inaltimeConV, JOC_INCRUSTATIE_MINIM, type Operatie } from '../model/document.ts';
import { susLaMicron, valoriBanda } from '../model/incrustatie.ts';
import type { Program } from '../ir/ir.ts';
import { refuzIncrustatieDreapta } from './incrustatieDreapta.ts';
import { urechiCareIncap } from './urechi.ts';

/** Turația, avansurile și Z-ul de siguranță (aceleași câmpuri ca regimul lucrării). */
export type RegimDop = { readonly turatie: number; readonly avans: number; readonly avansPlonjare: number; readonly zSigur: number };

/**
 * Semifabricatul unui dop: lățimea și înălțimea lui (cutia desenului + marginea pe fiecare parte) și grosimea cea mai mică;
 * `exacta`: dopul decupat (ADR 0171, ADR 0172), a cărui placă trebuie să fie exact atât de groasă (tăietura trece prin ea, cu
 * punți).
 */
export type SemifabricatDop = { readonly latime: number; readonly inaltime: number; readonly grosimeMinima: number; readonly exacta?: true };

export type DopCalculat = {
  /** Elementul (în lume) al primei tăieturi a regiunii: după el se recunoaște dopul. */
  readonly element: string;
  readonly program: Program;
  readonly semifabricat: SemifabricatDop;
  readonly avertismente: readonly string[];
};

/**
 * Punțile unui dop decupat, pe buclele traseului (ADR 0171, ADR 0172): pe fiecare, câte încap din cele `cerute` (palierul =
 * lățimea plus freza; regula lucrării, `urechiCareIncap`), grupate pe număr (câte o operație pentru fiecare număr), cu
 * avertismentul buclelor mici (punctul unui „i”: mai puține punți, nu tot exportul refuzat); sau motivul, dacă pe o buclă nu
 * încape nici una. Motivul și avertismentul vin fără loc: le pune cine cheamă.
 */
export function puntiPeBucle(lungimi: readonly number[], palier: number, cerute: number):
  { readonly ok: true; readonly grupe: ReadonlyMap<number, readonly number[]>; readonly avertisment: string | null } | { readonly ok: false; readonly motiv: string } {
  const incap = lungimi.map((L) => urechiCareIncap(L, palier, cerute));
  const k = incap.findIndex((n) => n === 0);
  if (k >= 0) {
    return { ok: false, motiv: `bucla ${k + 1} a decupării, de ${fix(lungimi[k]!)} mm, e prea mică pentru o punte cu palierul de ${fix(palier)} mm (lățimea plus freza)` };
  }
  const grupe = new Map<number, number[]>();
  incap.forEach((n, i) => { grupe.set(n, [...(grupe.get(n) ?? []), i]); });
  const reduse = incap.filter((n) => n < cerute);
  return {
    ok: true, grupe,
    avertisment: reduse.length === 0 ? null
      : `pe ${reduse.length === 1 ? 'o buclă mică încap' : `${reduse.length} bucle mici încap`} mai puține punți decât cele ${cerute} cerute (cel puțin ${Math.min(...reduse)} pe buclă)`,
  };
}

/**
 * De ce nu se poate tăia incrustația (ADR 0170 §4, ADR 0172), sau null: doar pe un V-carve, cu o freză în V ascuțită; jocul
 * cel puțin `JOC_INCRUSTATIE_MINIM` și sub adâncime; dopul săpat (S + H) cel mult cât conul frezei; fața dopului sau fundul
 * benzii cer freza dreaptă (varianta doar cu V vine în 12.1↑d). Banda (ADR 0172): freza decupării dreaptă, cu numărul ei; cel
 * puțin lățimea cea mai mică; cu decuparea, placa cel puțin cât fundul benzii plus punțile. Locașul (adâncimea cât conul,
 * fundul plat) îl judecă V-carve-ul lui.
 */
export function refuzIncrustatie(op: Operatie, unde: string): string | null {
  const i = op.incrustatie;
  if (!i) return null;
  // Cu pereți drepți (ADR 0171), refuzurile ei.
  if (i.fel === 'drept') return refuzIncrustatieDreapta(op, unde);
  if (op.tip !== 'vcarve') return `${unde}: incrustația în V e a unui V-carve (pe un buzunar, alege incrustația cu pereți drepți)`;
  const f = op.scula.forma;
  if (f?.tip !== 'v') return `${unde}: incrustația cere o freză în V (T${op.scula.numar} e plată)`;
  if (f.varf !== undefined && f.varf > 0) {
    return `${unde}: freza în V cu vârf plat (T${op.scula.numar}, ${f.varf} mm) lasă fundul șanțurilor înguste mai sus, iar dopul s-ar opri pe el: alege o freză ascuțită`;
  }
  if (!(i.joc >= JOC_INCRUSTATIE_MINIM)) {
    return `${unde}: jocul pentru clei, de ${i.joc} mm, trebuie să fie cel puțin ${JOC_INCRUSTATIE_MINIM} mm (crestele colțurilor ar ține dopul)`;
  }
  if (!(i.joc < op.adancime)) return `${unde}: jocul pentru clei, de ${i.joc} mm, trebuie să fie sub adâncimea locașului (${op.adancime} mm)`;
  const con = inaltimeConV(op.scula.diametru, f.unghi);
  const pana = op.adancime - i.joc + i.fierastrau;
  if (pana > con + 1e-9) {
    return `${unde}: dopul se sapă până la ${fix(pana)} mm (adâncimea − jocul + spațiul pentru fierăstrău), iar conul frezei în V (Ø${op.scula.diametru}, ${f.unghi}°) are ${fix(con)} mm: micșorează spațiul pentru fierăstrău sau alege o freză mai lată`;
  }
  if (!op.fundPlat) {
    if (i.jurDop === 'banda') return `${unde}: fundul benzii din jurul dopului se scoate cu freza dreaptă: alege-o în coloana Fund plat`;
    return `${unde}: fața dopului se coboară cu freza dreaptă: alege-o în coloana Fund plat (varianta doar cu freza V vine în felia 12.1↑d)`;
  }
  const b = valoriBanda(op);
  if (b?.decupare) {
    // Freza decupării: doar cu decuparea (fără ea, nu taie nimic).
    const d = b.freza;
    if (d.forma !== undefined) return `${unde}: freza decupării dopului trebuie să fie dreaptă (T${d.numar} e în V)`;
    if (d.numar === op.scula.numar) return `${unde}: freza decupării (T${d.numar}) are numărul frezei în V a operației: fiecare freză cere numărul ei`;
    for (const s of [op.fundPlat.scula, ...(op.fundPlat.rest ?? []).map((r) => r.scula)]) {
      if (s.numar === d.numar && s.diametru !== d.diametru) {
        return `${unde}: T${d.numar} are două diametre (${s.diametru} și ${d.diametru} mm), la fundul plat și la decuparea dopului: fiecare freză cere numărul ei`;
      }
    }
  }
  if (b && b.latime < b.minima - 1e-9) {
    return `${unde}: banda dopului, de ${fix(b.latime)} mm, e mai îngustă decât cea mai mică, de ${susLaMicron(b.minima)} mm (pereții, fundul plat${b.decupare ? ' și tăietura decupării' : ''}, fiecare cu freza lui): lărgește-o sau las-o calculată`;
  }
  if (b?.decupare && b.placa < b.placaMinima - 1e-9) {
    return `${unde}: placa dopului, de ${fix(b.placa)} mm, trebuie să aibă cel puțin ${susLaMicron(b.placaMinima)} mm (fundul benzii plus grosimea punților), ca decuparea să lase punțile sub fundul benzii`;
  }
  return null;
}

const fix = (x: number): string => String(Math.round(x * 1000) / 1000);
