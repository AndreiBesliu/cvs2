/**
 * Rândul editabil al operațiilor reliefului în fereastra exportului (felia 18.1↑d-4, ADR 0315): valorile ca text, cum le scrie
 * omul, citirea lor, câmpurile greșite (marginile ușii documentului și ale lucrării) și scrierea marginii și a planului zero pe
 * perechea rândului (finisarea și degroșarea aceluiași relief le au egale, ADR 0313 §5). Pur: fereastra îl citește, iar
 * aplicația scrie valorile în operație (`operatieReliefDinDialog`, `src/app/valoriOperatii.ts`).
 */
import { ADAOS_IMPLICIT, MARGINI_OPERATIE, UNGHI_V_IMPLICIT } from './actiuniExportTipuri.ts';
import { intregInMargini, inMargini, type FormaRelief, type ValoriRelief } from './exportRand.ts';
export type { FormaRelief, ValoriRelief } from './exportRand.ts';
import { citesteNumar } from './numar.ts';

/** Ce arată fereastra despre o operație a reliefului: valorile documentului, citite de cel care deschide fereastra (`ExportConectat`). */
export type FinisareExport = {
  /** Cheia rândului, ca la celelalte operații: `<piesă>/<operație>`. */
  readonly cheie: string;
  /** Felul: finisarea (ADR 0312) sau degroșarea (ADR 0313). */
  readonly fel: 'finisare' | 'degrosare';
  /** Adaosul degroșării (mm); doar pe o degroșare. */
  readonly adaos?: number;
  /**
   * Cheile celorlalte operații ale reliefului din aceeași instanță, pe un relief comun (finisarea și degroșarea lui): marginea
   * și planul zero, schimbate aici, se scriu și pe ele (felia 18.1↑d-4; lucrarea le cere egale, ADR 0313 §5).
   */
  readonly perechi: readonly string[];
  readonly descriere: string;
  /** Locul în ordinea de mână (ADR 0133), dacă documentul îl are. */
  readonly rang?: number;
  readonly scula: {
    readonly numar: number; readonly diametru: number; readonly forma: 'bila' | 'plata' | 'v';
    readonly unghi?: number; readonly varf?: number;
  };
  readonly pasLateral: number;
  /**
   * Celula primului relief, în mm de lume (scalarea uniformă a instanței o schimbă): pasul folosit al liniilor aliniate se
   * rotunjește în jos la celule întregi (ADR 0314); lipsă = fără notă.
   */
  readonly celula?: number;
  readonly unghi: number;
  readonly aliniat: boolean;
  readonly margine: 'perete' | 'trece';
  /** Planul zero, în mm sub fața plăcii; lipsă = vârful reliefului la fața plăcii. */
  readonly planZero?: number;
  /** Podeaua: adâncimea cea mai mare la care coboară finisarea. */
  readonly adancime: number;
  readonly pas: number;
};

/** Rândul unei operații a reliefului, ca text (valorile se citesc abia la verificare și la Exportă). */
export type RandRelief = {
  readonly fel: 'finisare' | 'degrosare';
  readonly numarScula: string; readonly diametruScula: string;
  /** Forma frezei: la degroșare, doar plata (ADR 0313 §1). */
  readonly formaScula: 'bila' | 'plata' | 'v';
  readonly unghiV: string; readonly varfV: string;
  readonly pasLateral: string;
  /** Adaosul lăsat finisării; doar pe o degroșare. */
  readonly adaos: string;
  /** Unghiul liniilor, în grade, în [0, 180). */
  readonly unghi: string;
  /** Liniile prin centrele celulelor (la 0° și 90°); doar pe o finisare (degroșarea le are mereu aliniate). */
  readonly aliniat: boolean;
  readonly margine: 'perete' | 'trece';
  /** Unde stă relieful pe Z: vârful la fața plăcii sau planul zero la `planZero` mm sub ea. */
  readonly z: 'varf' | 'plan';
  readonly planZero: string;
  readonly adancime: string; readonly pas: string;
};

/** Rândul din valorile documentului, cu numerele scrise de `text` (în română, cu virgulă). */
export function randRelief(f: FinisareExport, text: (x: number) => string): RandRelief {
  const s = f.scula;
  return {
    fel: f.fel, numarScula: text(s.numar), diametruScula: text(s.diametru), formaScula: f.fel === 'degrosare' ? 'plata' : s.forma,
    unghiV: text(s.forma === 'v' ? s.unghi ?? UNGHI_V_IMPLICIT : UNGHI_V_IMPLICIT), varfV: text(s.forma === 'v' ? s.varf ?? 0 : 0),
    pasLateral: text(f.pasLateral), adaos: text(f.adaos ?? ADAOS_IMPLICIT), unghi: text(f.unghi), aliniat: f.aliniat, margine: f.margine,
    z: f.planZero === undefined ? 'varf' : 'plan', planZero: text(f.planZero ?? 0), adancime: text(f.adancime), pas: text(f.pas),
  };
}

/** Un câmp al rândului reliefului care poate fi greșit (`data-camp` = `relief-<câmp>`). */
export type CampRelief = 'scula' | 'diametru' | 'unghi-v' | 'varf-v' | 'pas-lateral' | 'adaos' | 'unghi' | 'plan-zero' | 'adancime' | 'pas';

/** Un număr citit în [0, plafon] (adaosul și planul zero pot fi 0). */
function inMarginiCuZero(s: string, plafon: number): boolean {
  const x = citesteNumar(s);
  return x !== null && Number.isFinite(x) && x >= 0 && x <= plafon;
}

/**
 * Câmpurile greșite ale rândului, în ordinea fișei: T-ul un întreg, diametrul și adâncimea ca la ușă; pasul lateral peste 0, cel
 * mult diametrul frezei (altfel rămân dungi: lucrarea refuză) și ușa; unghiul în [0, 180); V-ul (doar la finisare) cu unghiul
 * frezei în V și vârful de la 0 până sub diametru; adaosul (doar la degroșare) în [0, 10]; planul zero (doar „plan”) în
 * [0, 1 000]; pasul pe trecere peste 0.
 */
export function campuriReliefGresite(r: RandRelief): readonly CampRelief[] {
  const rez: CampRelief[] = [];
  const d = citesteNumar(r.diametruScula);
  const dBun = inMargini(r.diametruScula, MARGINI_OPERATIE.diametru);
  if (!intregInMargini(r.numarScula, MARGINI_OPERATIE.numarScula)) rez.push('scula');
  if (!dBun) rez.push('diametru');
  const v = r.fel === 'finisare' && r.formaScula === 'v';
  if (v && !inMargini(r.unghiV, MARGINI_OPERATIE.unghiV, MARGINI_OPERATIE.unghiVMinim)) rez.push('unghi-v');
  if (v && !((x) => x !== null && x >= 0 && (d === null || !dBun || x < d))(citesteNumar(r.varfV))) rez.push('varf-v');
  const s = citesteNumar(r.pasLateral);
  if (!inMargini(r.pasLateral, MARGINI_OPERATIE.pasLateral) || (dBun && d !== null && s !== null && s > d)) rez.push('pas-lateral');
  if (r.fel === 'degrosare' && !inMarginiCuZero(r.adaos, MARGINI_OPERATIE.adaos)) rez.push('adaos');
  if (!((u) => u !== null && Number.isFinite(u) && u >= 0 && u < 180)(citesteNumar(r.unghi))) rez.push('unghi');
  if (r.z === 'plan' && !inMarginiCuZero(r.planZero, MARGINI_OPERATIE.planZero)) rez.push('plan-zero');
  if (!inMargini(r.adancime, MARGINI_OPERATIE.adancime)) rez.push('adancime');
  if (!inMargini(r.pas, MARGINI_OPERATIE.adancime)) rez.push('pas');
  return rez;
}

/** Valorile citite ale rândului, sau `null` cât un câmp nu se citește (fereastra oprește atunci Exportă). */
export function valoriRelief(r: RandRelief): ValoriRelief | null {
  const n = (s: string): number | null => ((x) => (x !== null && Number.isFinite(x) ? x : null))(citesteNumar(s));
  const numar = n(r.numarScula), diametru = n(r.diametruScula), pasLateral = n(r.pasLateral), unghi = n(r.unghi);
  const adancime = n(r.adancime), pas = n(r.pas);
  const adaos = r.fel === 'degrosare' ? n(r.adaos) : ((x) => x ?? ADAOS_IMPLICIT)(n(r.adaos));
  const planZero = r.z === 'plan' ? n(r.planZero) : null;
  if (numar === null || diametru === null || pasLateral === null || unghi === null || adancime === null || pas === null || adaos === null) return null;
  if (r.z === 'plan' && planZero === null) return null;
  let forma: FormaRelief = null;
  if (r.fel === 'finisare' && r.formaScula === 'bila') forma = { tip: 'bila' };
  else if (r.fel === 'finisare' && r.formaScula === 'v') {
    const u = n(r.unghiV), vf = n(r.varfV);
    if (u === null || vf === null) return null;
    forma = { tip: 'v', unghi: u, ...(vf > 0 ? { varf: vf } : {}) };
  }
  return {
    fel: r.fel, scula: { numar, diametru, forma }, pasLateral, adaos, unghi, aliniat: r.fel === 'degrosare' || r.aliniat, margine: r.margine,
    planZero, adancime, pas,
  };
}

/**
 * Rândurile cu schimbarea `p` pe rândul `cheie`; marginea și planul zero (cu felul lui) se scriu și pe perechile lui (operațiile
 * reliefului aceleiași instanțe, pe un relief comun), ca în panou. Un rând necunoscut lasă rândurile cum sunt.
 */
export function cuPerechile(
  randuri: Readonly<Record<string, RandRelief>>, perechi: ReadonlyMap<string, readonly string[]>, cheie: string, p: Partial<RandRelief>,
): Readonly<Record<string, RandRelief>> {
  const r = randuri[cheie];
  if (!r) return randuri;
  const rez: Record<string, RandRelief> = { ...randuri, [cheie]: { ...r, ...p } };
  const comun: Partial<RandRelief> = {
    ...(p.margine !== undefined ? { margine: p.margine } : {}), ...(p.z !== undefined ? { z: p.z } : {}),
    ...(p.planZero !== undefined ? { planZero: p.planZero } : {}),
  };
  if (Object.keys(comun).length > 0) {
    for (const k of perechi.get(cheie) ?? []) {
      const x = rez[k];
      if (x) rez[k] = { ...x, ...comun };
    }
  }
  return rez;
}
