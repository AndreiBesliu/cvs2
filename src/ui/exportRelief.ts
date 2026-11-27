/**
 * Rândul editabil al operațiilor reliefului în fereastra exportului (felia 18.1↑d-4, ADR 0315): valorile ca text, cum le scrie
 * omul, citirea lor, câmpurile greșite (marginile ușii documentului și ale lucrării) și scrierea marginii și a planului zero pe
 * perechea rândului (finisarea și degroșarea aceluiași relief le au egale, ADR 0313 §5). Pur: fereastra îl citește, iar
 * aplicația scrie valorile în operație (`operatieReliefDinDialog`, `src/app/valoriOperatii.ts`).
 */
import { ADAOS_IMPLICIT, MARGINI_OPERATIE, UNGHI_V_IMPLICIT } from './actiuniExportTipuri.ts';
import {
  RAZA_COLT_IMPLICITA, diferenteFreza, intregInMargini, inMargini, stareOrigine, type CopieRand, type FormaRand, type FormaRelief, type FrezaOferita,
  type FrezaRand, type LocFrezaRand, type OrigineFreza, type StareOrigine, type ValoriRelief,
} from './exportRand.ts';
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
    readonly numar: number; readonly diametru: number; readonly forma: 'bila' | 'plata' | 'v' | 'toroidala';
    readonly unghi?: number; readonly varf?: number;
    /** Raza colțului toroidalei (felia 18.1↑e, ADR 0319), în mm; doar cu forma `toroidala`. */
    readonly razaColt?: number;
    /** Originea frezei din „Frezele mele” (felia 18.1↑d-5, ADR 0316), dacă documentul o are. */
    readonly origine?: OrigineFreza;
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
  /** Forma frezei: la degroșare, doar plata (ADR 0313 §1); toroidala doar la finisare (felia 18.1↑e, ADR 0319). */
  readonly formaScula: 'bila' | 'plata' | 'v' | 'toroidala';
  readonly unghiV: string; readonly varfV: string;
  /** Raza colțului toroidalei, ca text (ținută și cât forma e alta, ca la celelalte rânduri). */
  readonly razaColt: string;
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
  /**
   * Freza din „Frezele mele” a rândului (felia 18.1↑d-5, ADR 0316): originea ei, ca la celelalte rânduri; `null` = scrisă de
   * mână (un diametru sau o formă schimbate de mână o scot).
   */
  readonly origineScula: OrigineFreza | null;
};

/** Rândul din valorile documentului, cu numerele scrise de `text` (în română, cu virgulă). */
export function randRelief(f: FinisareExport, text: (x: number) => string): RandRelief {
  const s = f.scula;
  return {
    fel: f.fel, numarScula: text(s.numar), diametruScula: text(s.diametru), formaScula: f.fel === 'degrosare' ? 'plata' : s.forma,
    unghiV: text(s.forma === 'v' ? s.unghi ?? UNGHI_V_IMPLICIT : UNGHI_V_IMPLICIT), varfV: text(s.forma === 'v' ? s.varf ?? 0 : 0),
    razaColt: text(s.forma === 'toroidala' ? s.razaColt ?? RAZA_COLT_IMPLICITA : RAZA_COLT_IMPLICITA),
    pasLateral: text(f.pasLateral), adaos: text(f.adaos ?? ADAOS_IMPLICIT), unghi: text(f.unghi), aliniat: f.aliniat, margine: f.margine,
    z: f.planZero === undefined ? 'varf' : 'plan', planZero: text(f.planZero ?? 0), adancime: text(f.adancime), pas: text(f.pas),
    origineScula: f.scula.origine ?? null,
  };
}

/** Un câmp al rândului reliefului care poate fi greșit (`data-camp` = `relief-<câmp>`). */
export type CampRelief = 'scula' | 'diametru' | 'unghi-v' | 'varf-v' | 'raza-colt' | 'pas-lateral' | 'adaos' | 'unghi' | 'plan-zero' | 'adancime' | 'pas';

/** Un număr citit în [0, plafon] (adaosul și planul zero pot fi 0). */
function inMarginiCuZero(s: string, plafon: number): boolean {
  const x = citesteNumar(s);
  return x !== null && Number.isFinite(x) && x >= 0 && x <= plafon;
}

/**
 * Câmpurile greșite ale rândului, în ordinea fișei: T-ul un întreg, diametrul și adâncimea ca la ușă; pasul lateral peste 0, cel
 * mult diametrul frezei (altfel rămân dungi: lucrarea refuză) și ușa; unghiul în [0, 180); V-ul (doar la finisare) cu unghiul
 * frezei în V și vârful de la 0 până sub diametru; raza colțului toroidalei (doar la finisare) în (0, Ø / 2), ca la ușă; adaosul (doar la degroșare) în [0, 10]; planul zero (doar „plan”) în
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
  if (r.fel === 'finisare' && r.formaScula === 'toroidala') {
    const rc = citesteNumar(r.razaColt);
    if (rc === null || !Number.isFinite(rc) || !(rc > 0) || (dBun && d !== null && !(rc < d / 2))) rez.push('raza-colt');
  }
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
  } else if (r.fel === 'finisare' && r.formaScula === 'toroidala') {
    const rc = n(r.razaColt);
    if (rc === null) return null;
    forma = { tip: 'toroidala', raza: rc };
  }
  return {
    fel: r.fel, scula: { numar, diametru, forma, origine: r.origineScula }, pasLateral, adaos, unghi, aliniat: r.fel === 'degrosare' || r.aliniat,
    margine: r.margine, planZero, adancime, pas,
  };
}

/*
 * Freza din „Frezele mele” pe rândul reliefului (felia 18.1↑d-5, ADR 0316), cu aceleași reguli ca la celelalte rânduri (ADR 0300
 * §4–§5): aleasă din listă, nota „s-a schimbat în bibliotecă”, „Ia valorile noi”, recunoașterea și „Pune-o înapoi în bibliotecă”.
 */

/** Forma frezei rândului, pentru bibliotecă: bila, toroidala sau V-ul (cu vârful) doar la finisare; plata (lipsă) altfel. */
/**
 * Forma frezei pe rândul reliefului (felia 18.1↑e): plata, V-ul, bila, toroidala. Profilul desenat (ADR 0304), pe rândul
 * exportului din 16.A↑f-3, nu stă aici: lucrarea îl refuză pe relief (`formaPeRandRelief`, în model).
 */
type FormaPeRelief = Exclude<FormaRand, { readonly tip: 'profil' }>;

/**
 * Freza din bibliotecă pe care o poate purta rândul reliefului: fără profilul desenat. Biblioteca văzută de rândurile reliefului
 * (nota, „Pe toate (N)”) e cea fără profiluri, deci o freză devenită profil e, aici, ștearsă, ca până la 16.A↑f-3.
 */
export function bibliotecaRelief(biblioteca: readonly FrezaOferita[] | null): readonly FrezaOferita[] | null {
  return biblioteca === null ? null : biblioteca.filter((f) => f.scula.forma?.tip !== 'profil');
}

function formaRandRelief(r: RandRelief): FormaPeRelief | undefined {
  if (r.fel !== 'finisare' || r.formaScula === 'plata') return undefined;
  if (r.formaScula === 'bila') return { tip: 'bila' };
  if (r.formaScula === 'toroidala') {
    const rc = citesteNumar(r.razaColt);
    return rc !== null && rc > 0 ? { tip: 'toroidala', raza: rc } : undefined;
  }
  const u = citesteNumar(r.unghiV), v = citesteNumar(r.varfV);
  return u !== null ? { tip: 'v', unghi: u, ...(v !== null && v > 0 ? { varf: v } : {}) } : undefined;
}

/** Freza rândului reliefului ca loc al bibliotecii (nota, recunoașterea), pe locul frezei operației. */
export function locFrezaRelief(r: RandRelief): LocFrezaRand {
  const forma = formaRandRelief(r);
  return { unde: 'scula', origine: r.origineScula, diametru: r.diametruScula, ...(forma ? { forma } : {}) };
}

/** Nota bibliotecii pe rândul reliefului (felia 18.1↑d-5): freza rândului față de biblioteca fără profiluri (`bibliotecaRelief`). */
export function stareOrigineRelief(r: RandRelief, biblioteca: readonly FrezaOferita[] | null): StareOrigine | null {
  return stareOrigine(locFrezaRelief(r), bibliotecaRelief(biblioteca));
}

/**
 * Frezele rândurilor reliefului, pentru numărul T al unei freze alese (regula rolurilor, ADR 0114 §5): numărul, diametrul,
 * forma și turația originii, dacă o are; fără rândul `fara` (cel pe care îl înlocuim) și fără cele de necitit.
 */
export function frezeRanduriRelief(randuri: Readonly<Record<string, RandRelief>>, fara?: string): FrezaRand[] {
  const rez: FrezaRand[] = [];
  for (const [cheie, r] of Object.entries(randuri)) {
    if (cheie === fara) continue;
    const numar = citesteNumar(r.numarScula), diametru = citesteNumar(r.diametruScula), forma = formaRandRelief(r);
    const turatie = r.origineScula?.regim?.turatie;
    if (numar !== null && diametru !== null) rez.push({ numar, diametru, ...(forma ? { forma } : {}), ...(turatie !== undefined ? { turatie } : {}) });
  }
  return rez;
}

/** Câmpurile rândului care scriu forma `f` (finisarea: bila, toroidala, V-ul, plata; degroșarea rămâne plată). */
function campuriFormaRelief(r: RandRelief, f: FormaRand | undefined, text: (x: number) => string): Partial<RandRelief> | null {
  // Profilul desenat nu stă pe rândul reliefului (`bibliotecaRelief`): nicio schimbare.
  if (f?.tip === 'profil') return null;
  if (r.fel === 'degrosare' || f === undefined) return { formaScula: 'plata' };
  if (f.tip === 'bila') return { formaScula: 'bila' };
  if (f.tip === 'toroidala') return { formaScula: 'toroidala', razaColt: text(f.raza) };
  return { formaScula: 'v', unghiV: text(f.unghi), varfV: text(f.varf ?? 0) };
}

/**
 * Ce se schimbă pe rândul reliefului când freza `f` din bibliotecă e aleasă, cu numărul T dat (`numarPentruRand`): T-ul, Ø-ul,
 * forma (toroidala, din felia 18.1↑e, cu raza colțului), pasul pe trecere, pasul lateral (al frezei, din procentul ei: o bilă de
 * finisare își are pasul ei mic) și originea.
 */
export function cuFrezaAleasaRelief(r: RandRelief, f: FrezaOferita, numar: number, text: (x: number) => string = String): Partial<RandRelief> {
  const s = f.scula, forma = campuriFormaRelief(r, s.forma, text);
  if (forma === null) return {};
  return {
    numarScula: text(numar), diametruScula: text(s.diametru), ...forma,
    pas: text(f.pas), pasLateral: text(f.pasLateral), origineScula: s.origine,
  };
}

/** „Ia valorile noi” pe rândul reliefului: diametrul, forma și originea frezei din bibliotecă; T-ul și pașii rămân ai rândului. */
export function cuValorileNoiRelief(r: RandRelief, f: FrezaOferita, text: (x: number) => string = String): Partial<RandRelief> {
  const s = f.scula, forma = campuriFormaRelief(r, s.forma, text);
  return forma === null ? {} : { diametruScula: text(s.diametru), ...forma, origineScula: s.origine };
}

/** Câte rânduri ale reliefului vin din freza `id` a bibliotecii și diferă de ea („Pe toate (N)”, cu celelalte rânduri). */
export function reliefCuAceeasiFreza(randuri: Readonly<Record<string, RandRelief>>, biblioteca: readonly FrezaOferita[] | null, id: string): number {
  let n = 0;
  for (const r of Object.values(randuri)) {
    if (r.origineScula?.biblioteca.id === id && stareOrigineRelief(r, biblioteca)?.fel === 'schimbata') n++;
  }
  return n;
}

/** Copia frezei rândului reliefului, de pus înapoi în bibliotecă (felia 16.A↑b-6); null fără origine sau cu T-ul ori Ø de necitit. */
export function copieRelief(r: RandRelief): CopieRand | null {
  const o = r.origineScula, forma = formaRandRelief(r);
  const numar = citesteNumar(r.numarScula), diametru = citesteNumar(r.diametruScula);
  if (!o || numar === null || diametru === null) return null;
  return {
    id: o.biblioteca.id, rev: o.biblioteca.rev, nume: o.nume, numar, diametru, ...(forma ? { forma } : {}),
    ...(o.regim ? { regim: o.regim } : {}), ...(o.tais !== undefined ? { tais: o.tais } : {}),
    pas: citesteNumar(r.pas), pasLateral: citesteNumar(r.pasLateral),
  };
}

/**
 * Rândurile reliefului după ce freza ștearsă a rândului `cheie` a fost pusă înapoi ca `f` (felia 16.A↑b-6): rândul acela o ia
 * (numele, poate liber, și versiunea ei); celelalte cu aceeași origine o iau doar dacă diferă de ea cel mult prin nume.
 */
export function cuFrezaPusaInapoiRelief(
  randuri: Readonly<Record<string, RandRelief>>, cheie: string, f: FrezaOferita, text: (x: number) => string = String,
): Record<string, RandRelief> {
  const nou: Record<string, RandRelief> = { ...randuri };
  for (const [k, r] of Object.entries(randuri)) {
    const l = locFrezaRelief(r);
    if (l.origine?.biblioteca.id !== f.id) continue;
    if (k === cheie || diferenteFreza(l, f).every((d) => d.camp === 'nume')) nou[k] = { ...r, ...cuValorileNoiRelief(r, f, text) };
  }
  return nou;
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
