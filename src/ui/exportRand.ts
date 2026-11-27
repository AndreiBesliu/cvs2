import '../i18n/export.ts';
import '../i18n/traseu.ts';
import { t, type CheieSimpla } from '../i18n/t.ts';
import {
  AVANS_IMPLICIT, latimeMinimaBanda, MARGINI_OPERATIE, parcareBuna, PLONJARE_IMPLICITA, PUNTI_BANDA, SUB_FATA_DOPULUI, TURATIE_IMPLICITA,
  Z_SIGUR_IMPLICIT, zSigurBun, type Coborare, type Depasire, type IesireFoaie, type InceputFisier, type LaturaExport,
  type ParametriExport, type RezumatFoi, type RezumatJob, type SimulareExport,
} from './actiuniExportTipuri.ts';
import { citesteNumar } from './numar.ts';

/*
 * Rândul unei operații în fereastra exportului și ajutoarele lui pure (ADR 0290, felia 28.8↑f-3): tipurile, implicitele,
 * verificările câmpurilor. Stau aici, nu în `DialogExport.tsx`, ca fișa operației (`FisaOperatie.tsx`) să le ia fără ciclu.
 */

export type Latura = LaturaExport;
/** Sensul de tăiere (ADR 0027): urcare = materialul păstrat în dreapta sensului de mers, cu axul M3. */
export type Sens = 'urcare' | 'opozitie';
/** Direcția tăieturii pe linie (ADR 0092 §4): invers, sau cel mai scurt drum; lipsă = ca desenul. */
export type DirectieOperatie = 'invers' | 'scurt';
/**
 * Urechile (ADR 0028): câte pe buclă, lungimea palierului pe traseul frezei, grosimea punții de la fața de jos (mm). Cu
 * `mod: 'alese'` (ADR 0211), stau la locurile alese pe desen; `alese` e câte sunt alese în document (doar arătat, nu se scrie).
 * Cu `mod: 'lemn'` (ADR 0211, b), lucrarea le pune la export unde țin de lemnul foii; cu o regulă (c: `lungi`, `scurte`,
 * `mijloc`), pe laturile drepte ale drumului frezei.
 */
export type UrechiOperatie = {
  readonly numar: number; readonly latime: number; readonly grosime: number; readonly mod?: ModLocuriUrechi; readonly alese?: number;
};
/** Locurile urechilor care se scriu în document (ADR 0211); „la distanțe egale” e lipsa modului. */
export type ModLocuriUrechi = 'alese' | 'lemn' | 'lungi' | 'scurte' | 'mijloc';
/** Modurile la care „Câte, pe buclă” nu se scrie: la locuri alese e câte ai pus, la mijlocul laturilor, câte laturi sunt. */
export const faraNumar = (mod: ModLocuriUrechi | 'egale'): boolean => mod === 'alese' || mod === 'mijloc';
/** Rampa (ADR 0029): lungimea în plan pe care coboară o trecere (mm). */
export type RampaOperatie = { readonly lungime: number };
/** Intrările și ieșirile (ADR 0030): raza sfertului de cerc (mm). */
export type IntrariOperatie = { readonly raza: number };
/** Degajările colțurilor (ADR 0032): dog-bone sau T-bone. */
export type ColturiOperatie = { readonly tip: 'dog-bone' | 't-bone' };
/** Freza unei operații (ADR 0084): numărul (T) și diametrul; aceeași sculă = același număr și același diametru. */
/**
 * Freza unui rând (ADR 0084), cu forma ei (`FormaRand`): lipsă = plată; în V (ADR 0090, 0092), bila sau toroidala (ADR 0303).
 */
export type SculaOperatie = {
  readonly numar: number; readonly diametru: number; readonly forma?: FormaRand;
  /**
   * Freza din „Frezele mele” a rândului (ADR 0300 §4, felia 16.A↑b-3): numele, originea, valorile de lucru și tăișul ei, scrise
   * de Exportă lângă T, Ø și formă; `null` = scrisă de mână (originea pleacă din document); lipsă = rămâne cea din document.
   */
  readonly origine?: OrigineFreza | null;
  /**
   * Valorile de lucru scrise de mână (ADR 0291 §3, felia 28.8↑p), doar pe o freză fără origine din bibliotecă: scrise în
   * `scula.regim`; `null` = fără ele (câmpul pleacă); lipsă = rămân cele din document. Cu o origine, câștigă ale ei.
   */
  readonly regim?: ValoriLucru | null;
};
/** Turația (rot/min), avansul și plonjarea (mm/min) unei freze, ca în document (v27). */
export type ValoriLucru = { readonly turatie: number; readonly avans: number; readonly plonjare: number };
/** Originea unei freze din „Frezele mele” (ADR 0300 §5): numele, id-ul și versiunea, valorile de lucru și tăișul, dacă le are. */
export type OrigineFreza = {
  readonly nume: string; readonly biblioteca: { readonly id: string; readonly rev: number };
  readonly regim?: { readonly turatie: number; readonly avans: number; readonly plonjare: number };
  readonly tais?: number;
};
/**
 * O freză din bibliotecă oferită unui rând (ADR 0300 §4): copia ei (T-ul preferat, Ø, forma, originea), pasul pe trecere și pasul
 * lateral al buzunarului (mm, din procentul frezei). Le dă aplicația, după felul și latura rândului (`frezePotrivite`).
 */
export type FrezaOferita = {
  readonly id: string; readonly nume: string; readonly scula: SculaOperatie & { readonly origine: OrigineFreza };
  readonly pas: number; readonly pasLateral: number;
};
/** O freză a ferestrei, pentru numărul T (ADR 0114 §5): numărul, diametrul, forma și turația, dacă e știută. */
export type FrezaRand = { readonly numar: number; readonly diametru: number; readonly forma?: SculaOperatie['forma']; readonly turatie?: number };

/** Aceeași freză montată: aceeași formă (felul, unghiul, vârful, raza), același diametru și, unde amândouă o știu, aceeași turație. */
function aceeasiFrezaRand(a: FrezaRand, b: FrezaRand): boolean {
  return formeEgale(a.forma, b.forma) && Math.abs(a.diametru - b.diametru) < 1e-9
    && (a.turatie === undefined || b.turatie === undefined || a.turatie === b.turatie);
}

/**
 * Numărul T al frezei `f` pe un rând (regula rolurilor, ADR 0114 §5), printre celelalte freze ale ferestrei (`alte`): al ei, cât
 * nicio altă freză nu-l are (sau doar freze identice); altfel al unei freze identice; altfel cel mai mic liber.
 */
export function numarPentruRand(alte: readonly FrezaRand[], f: FrezaRand): number {
  const peNumar = alte.filter((a) => a.numar === f.numar);
  if (peNumar.every((a) => aceeasiFrezaRand(a, f))) return f.numar;
  const identica = alte.find((a) => aceeasiFrezaRand(a, f));
  if (identica) return identica.numar;
  const luate = new Set(alte.map((a) => a.numar));
  let k = 1;
  while (luate.has(k) && k < MARGINI_OPERATIE.numarScula) k++;
  return k;
}

/**
 * Locul unei freze pe rând (ADR 0300 §4, felia 16.A↑b-5): freza operației, a fundului plat, prima a dopului drept, a decupării
 * benzii, ori a `k`-a freză de rest a buzunarului, a fundului plat sau a dopului.
 */
export type UndeFreza = 'scula' | 'fund' | 'dop' | 'banda' | { readonly rest: 'buzunar' | 'fund' | 'dop'; readonly k: number };
/** O freză a unui rând al ferestrei: cheia rândului și locul ei. */
export type LocFreza = { readonly cheie: string; readonly unde: UndeFreza };

/**
 * Identitatea unei freze montate, pentru conflictele de T (ADR 0084): diametrul, apoi unghiul V cu vârful plat (ADR 0090, 0092;
 * vârful 0 e cel ascuțit), apoi bila (ADR 0312) sau toroidala cu raza colțului (ADR 0303). Valorile exacte: în motiv, freza apare
 * scrisă după limbă.
 */
export function cheieFreza(d: number, u: number | null, varf: number | null, bila = false, razaColt: number | null = null): string {
  if (bila) return `${String(d)} bila`;
  if (razaColt !== null) return `${String(d)} r${String(razaColt)}`;
  const v = u !== null && varf !== null && varf > 0 ? varf : null;
  return u !== null ? `${String(d)} V${String(u)}${v !== null ? ` t${String(v)}` : ''}` : String(d);
}

/**
 * O freză a ferestrei, pentru conflictele de T: numărul, identitatea (`cheieFreza`) și locul ei pe un rând; fără loc, freza unei
 * finisări a reliefului (ADR 0312 §7), care se schimbă din panou, nu de aici.
 */
export type FrezaT = { readonly numar: number; readonly cheie: string; readonly loc?: LocFreza };

/**
 * „Dă-i T{n}” (ADR 0291 §2a, felia 28.8↑j): numărul pe care îl ia freza `f`, ciocnită pe numărul ei, printre celelalte freze ale
 * ferestrei (`alte`). Regula rolurilor (`numarPentruRand`, ADR 0114 §5), fără numărul ciocnit: al unei freze identice, cât pe
 * numărul ei stau doar freze identice (deci mutarea nu face alt conflict); altfel cel mai mic liber. `null`: niciun număr liber.
 */
export function numarDupaConflict(alte: readonly FrezaT[], f: FrezaT): number | null {
  const curat = (n: number): boolean => alte.every((a) => a.numar !== n || a.cheie === f.cheie);
  const identica = alte.find((a) => a.cheie === f.cheie && a.numar !== f.numar && curat(a.numar));
  if (identica) return identica.numar;
  const luate = new Set(alte.map((a) => a.numar));
  for (let k = 1; k <= MARGINI_OPERATIE.numarScula; k++) if (k !== f.numar && !luate.has(k)) return k;
  return null;
}

/** Numărul T al locului `unde` al rândului, scris `n` (felia 28.8↑j); freza, originea și pașii rămân. */
export function cuNumarT(p: Rand, unde: UndeFreza, n: number, text: (x: number) => string = String): Partial<Rand> {
  const s = text(n);
  if (unde === 'scula') return { numarScula: s };
  if (unde === 'fund') return { numarSculaFund: s };
  if (unde === 'dop') return { numarSculaDop: s };
  if (unde === 'banda') return { numarSculaBanda: s };
  const camp = unde.rest === 'fund' ? 'restFund' : unde.rest === 'dop' ? 'restDop' : 'rest';
  const lista = p[camp];
  if (unde.k < 0 || unde.k >= lista.length) return {};
  return { [camp]: lista.map((r, i) => (i === unde.k ? { ...r, numar: s } : r)) };
}

const acelasiLoc = (a: UndeFreza, b: UndeFreza): boolean =>
  typeof a === 'string' || typeof b === 'string' ? a === b : a.rest === b.rest && a.k === b.k;

/**
 * Frezele ferestrei (ADR 0114 §5, pentru T-ul unei freze alese din bibliotecă), în ordinea rândurilor: pe fiecare, freza
 * operației, apoi, cu bifele lor, a fundului plat, a dopului, a decupării benzii și frezele de rest; fiecare cu turația
 * originii ei, dacă o are. Fără `fara` (freza pe care o înlocuim) și fără cele de necitit.
 */
export function frezeRanduri(randuri: Iterable<readonly [string, Rand]>, fara?: LocFreza): FrezaRand[] {
  const rez: FrezaRand[] = [];
  for (const [cheie, p] of randuri) {
    const pune = (unde: UndeFreza, n: string, d: string, origine: OrigineFreza | null | undefined, forma?: FrezaRand['forma'], mana?: number): void => {
      if (fara && fara.cheie === cheie && acelasiLoc(fara.unde, unde)) return;
      const numar = citesteNumar(n), diametru = citesteNumar(d), turatie = origine?.regim?.turatie ?? (origine ? undefined : mana);
      if (numar !== null && diametru !== null) rez.push({ numar, diametru, ...(forma ? { forma } : {}), ...(turatie !== undefined ? { turatie } : {}) });
    };
    // Turația scrisă de mână (felia 28.8↑p) e știută, ca a unei freze din bibliotecă.
    pune('scula', p.numarScula, p.diametruScula, p.origineScula, formaDinRand(p) ?? undefined, regimDinRand(p.regimMana)?.turatie);
    const fund = p.tip === 'vcarve' && p.fundPlat, dop = p.tip === 'buzunar' && p.incrustatieDreapta && p.frezaDop;
    if (fund) pune('fund', p.numarSculaFund, p.diametruSculaFund, p.origineFund);
    if (dop) pune('dop', p.numarSculaDop, p.diametruSculaDop, p.origineDop);
    if (p.tip === 'vcarve' && p.incrustatie && p.jurDop === 'banda' && p.decupareBanda && p.frezaBanda) {
      pune('banda', p.numarSculaBanda, p.diametruSculaBanda, p.origineBanda);
    }
    const liste: ReadonlyArray<readonly ['buzunar' | 'fund' | 'dop', readonly RandRest[]]> = [
      ['buzunar', p.tip === 'buzunar' ? p.rest : []], ['fund', fund ? p.restFund : []], ['dop', dop ? p.restDop : []],
    ];
    for (const [rest, lista] of liste) lista.forEach((r, k) => { pune({ rest, k }, r.numar, r.diametru, r.origine); });
  }
  return rez;
}

/**
 * Ce se schimbă pe rândul `p` când freza `f` din bibliotecă e aleasă pe locul `unde`, cu numărul T dat (regula rolurilor,
 * `numarPentruRand`): T-ul, Ø-ul și originea; la freza operației și forma și pasul pe trecere, iar la buzunar pasul lateral;
 * la fundul plat, la dop și la frezele de rest, pasul lateral (procentul frezei). Un loc care nu e pe rând nu schimbă nimic.
 */
export function cuFrezaAleasa(p: Rand, unde: UndeFreza, f: FrezaOferita, numar: number, text: (x: number) => string = String): Partial<Rand> {
  const s = f.scula, n = text(numar), d = text(s.diametru), pl = text(f.pasLateral), origine = s.origine;
  if (unde === 'scula') {
    return {
      numarScula: n, diametruScula: d, ...campuriForma(s.forma, text),
      pas: text(f.pas), ...(p.tip === 'buzunar' ? { pasLateral: pl } : {}), origineScula: origine,
    };
  }
  if (unde === 'fund') return { numarSculaFund: n, diametruSculaFund: d, pasLateralFund: pl, origineFund: origine };
  if (unde === 'dop') return { numarSculaDop: n, diametruSculaDop: d, pasLateralDop: pl, origineDop: origine };
  if (unde === 'banda') return { numarSculaBanda: n, diametruSculaBanda: d, origineBanda: origine };
  const camp = unde.rest === 'fund' ? 'restFund' : unde.rest === 'dop' ? 'restDop' : 'rest';
  const lista = p[camp];
  if (unde.k < 0 || unde.k >= lista.length) return {};
  return { [camp]: lista.map((r, i) => (i === unde.k ? { numar: n, diametru: d, pas: pl, origine } : r)) };
}

/**
 * Forma unei freze pe rând: în V, cu unghiul și vârful (ADR 0090, 0092; lipsă = ascuțit), bila (ADR 0312), toroidala, cu raza
 * colțului (ADR 0303), sau profilul desenat, cu punctele lui (ADR 0304); lipsă = plată.
 */
export type FormaRand =
  | { readonly tip: 'v'; readonly unghi: number; readonly varf?: number }
  | { readonly tip: 'bila' }
  | { readonly tip: 'toroidala'; readonly raza: number }
  // Profilul desenat (ADR 0304, felia 16.A↑f-3): silueta ca puncte (r, h); pe rând doar de citit, vine din bibliotecă.
  | { readonly tip: 'profil'; readonly puncte: readonly (readonly [number, number])[] };

/** Raza colțului cu care pornește o toroidală aleasă pe rând (ADR 0303, felia 16.A↑e-4), în mm. */
export const RAZA_COLT_IMPLICITA = 1;

/** Aceeași formă: același fel, cu același unghi și vârf (V) sau aceeași rază a colțului (toroidala); lipsă = plată. */
export function formeEgale(a: FormaRand | undefined, b: FormaRand | undefined): boolean {
  const egal = (x: number, y: number): boolean => Math.abs(x - y) < 1e-9;
  if (a === undefined || b === undefined) return a === b;
  if (a.tip === 'v') return b.tip === 'v' && egal(a.unghi, b.unghi) && egal(a.varf ?? 0, b.varf ?? 0);
  if (a.tip === 'toroidala') return b.tip === 'toroidala' && egal(a.raza, b.raza);
  if (a.tip === 'profil') {
    return b.tip === 'profil' && a.puncte.length === b.puncte.length
      && a.puncte.every(([r, h], i) => egal(r, b.puncte[i]![0]) && egal(h, b.puncte[i]![1]));
  }
  return b.tip === 'bila';
}

/** Raza fundului plat al siluetei (cel mai mare r cu h = 0), ca `fundProfil` din model, scrisă aici fiindcă interfața nu-l importă. */
export function fundProfilRand(puncte: readonly (readonly [number, number])[]): number {
  let r0 = 0;
  for (const [r, h] of puncte) {
    if (h > 0) break;
    r0 = r;
  }
  return r0;
}

/** Înălțimea profilului (h la capăt), ca `inaltimeProfil` din model. */
export function inaltimeProfilRand(puncte: readonly (readonly [number, number])[]): number {
  return puncte[puncte.length - 1]?.[1] ?? 0;
}

/**
 * Profilul desenat pe rând (ADR 0304 §3, §4): pe linie (canelura, felia 16.A↑f-2) și pe o parte (marginea profilată, 16.A↑f-4),
 * cu fund plat, cu adâncimea cel mult înălțimea profilului și, deocamdată, fără urechi, degajări, intrări și despărțire. Aceeași
 * regulă ca `motivFormaPeOperatie` din model și ca refuzurile lucrării (o probă le compară); o adâncime de necitit nu se judecă
 * aici (își are greșeala pe câmp).
 */
export function profilPermis(p: Pick<Rand, 'tip' | 'latura' | 'formaScula' | 'profil' | 'adancime' | 'urechi' | 'colturi' | 'intrari' | 'despartire'>): boolean {
  return motivProfilRand(p) === null;
}

/** De ce nu merge profilul pe rând: `profil` (nu e un profil), `fund`, `adancime` sau `optiuni`; null dacă merge (sau nu e profil). */
export function motivProfilRand(
  p: Pick<Rand, 'tip' | 'latura' | 'formaScula' | 'profil' | 'adancime' | 'urechi' | 'colturi' | 'intrari' | 'despartire'>,
): 'profil' | 'fund' | 'adancime' | 'optiuni' | null {
  if (p.formaScula !== 'profil') return null;
  if (p.tip !== 'profil') return 'profil';
  if (p.latura === 'pe-linie') return null;
  const puncte = p.profil ?? [];
  if (!(fundProfilRand(puncte) > 0)) return 'fund';
  const d = citesteNumar(p.adancime);
  if (d !== null && d > inaltimeProfilRand(puncte) + 1e-9) return 'adancime';
  if (p.urechi || p.colturi !== '' || p.intrari || p.despartire) return 'optiuni';
  return null;
}

/**
 * Bila și toroidala pe rând (ADR 0303 §4): pe linie (canelura, felia 16.A↑e-3), în buzunar (16.A↑e-5), fără freze de rest și
 * fără incrustație cu pereți drepți, și pe o parte (16.A↑e-6), cu adâncimea cel puțin raza colțului (`razaColtRand`); plata și
 * V-ul, mereu (V-ul își are regula lui, `vPeLinie`). Aceeași regulă ca `motivFormaPeOperatie` din model (o probă le compară),
 * scrisă aici fiindcă interfața nu importă modelul. Pe o parte, o adâncime, un diametru sau o rază de necitit nu se judecă
 * aici: fiecare își are greșeala pe câmp.
 */
export function rotundaPermisa(p: Pick<Rand, 'tip' | 'latura' | 'formaScula' | 'rest' | 'incrustatieDreapta' | 'adancime' | 'diametruScula' | 'razaColt'>): boolean {
  if (p.formaScula !== 'bila' && p.formaScula !== 'toroidala') return true;
  if (p.tip === 'profil') {
    if (p.latura === 'pe-linie') return true;
    const d = citesteNumar(p.adancime), rho = razaColtRand(p);
    return d === null || rho === null || d >= rho;
  }
  return p.tip === 'buzunar' && p.rest.length === 0 && !p.incrustatieDreapta;
}

/**
 * Raza colțului frezei rotunde a rândului (ADR 0303 §1): la bilă Ø / 2, la toroidală raza scrisă; null pentru plată și V, sau
 * cu un număr de necitit (ori nepozitiv).
 */
export function razaColtRand(p: Pick<Rand, 'formaScula' | 'diametruScula' | 'razaColt'>): number | null {
  const n = citesteNumar(p.formaScula === 'bila' ? p.diametruScula : p.formaScula === 'toroidala' ? p.razaColt : '');
  if (n === null || !(n > 0)) return null;
  return p.formaScula === 'bila' ? n / 2 : n;
}

/**
 * Forma frezei operației citită din rând (ADR 0303, felia 16.A↑e-4): `null` = plată; o formă; `undefined` = de necitit (un
 * unghi V sau o rază a colțului care nu e un număr, ori o rază ≤ 0). Vârful V de 0 (ascuțit) nu se scrie (ADR 0092).
 */
export function formaDinRand(p: Pick<Rand, 'formaScula' | 'unghiV' | 'varfV' | 'razaColt' | 'profil'>): FormaRand | null | undefined {
  if (p.formaScula === 'plata') return null;
  if (p.formaScula === 'bila') return { tip: 'bila' };
  if (p.formaScula === 'profil') return p.profil !== undefined && p.profil.length >= 2 ? { tip: 'profil', puncte: p.profil } : undefined;
  if (p.formaScula === 'toroidala') {
    const r = citesteNumar(p.razaColt);
    return r !== null && r > 0 ? { tip: 'toroidala', raza: r } : undefined;
  }
  const u = citesteNumar(p.unghiV), vf = citesteNumar(p.varfV);
  return u !== null ? { tip: 'v', unghi: u, ...(vf !== null && vf > 0 ? { varf: vf } : {}) } : undefined;
}

/** Câmpurile rândului care scriu forma `f` (inversa lui `formaDinRand`); celelalte câmpuri ale formei rămân cum sunt. */
export function campuriForma(f: FormaRand | undefined, text: (x: number) => string = String): Partial<Pick<Rand, 'formaScula' | 'unghiV' | 'varfV' | 'razaColt' | 'profil'>> {
  if (f === undefined) return { formaScula: 'plata' };
  if (f.tip === 'bila') return { formaScula: 'bila' };
  if (f.tip === 'profil') return { formaScula: 'profil', profil: f.puncte };
  if (f.tip === 'toroidala') return { formaScula: 'toroidala', razaColt: text(f.raza) };
  return { formaScula: 'v', unghiV: text(f.unghi), varfV: text(f.varf ?? 0) };
}
/** O freză a unui rând, pentru nota bibliotecii (ADR 0300 §5, felia 16.A↑b-4): locul, originea, diametrul (ca text) și forma. */
export type LocFrezaRand = {
  readonly unde: UndeFreza; readonly origine: OrigineFreza | null; readonly diametru: string; readonly forma?: FormaRand;
  /** Valorile de lucru scrise de mână (felia 28.8↑p), doar pe freza operației fără origine: recunoașterea le cere egale. */
  readonly regim?: ValoriLucru;
};

/**
 * Frezele unui rând, cu originea lor (ADR 0300 §5, felia 16.A↑b-4): freza operației și, cu bifele lor, a fundului plat, a
 * dopului, a decupării benzii și frezele de rest, în ordinea frezelor ferestrei (`frezeRanduri`).
 */
export function locuriFreze(p: Rand): LocFrezaRand[] {
  const forma = formaDinRand(p);
  const regim = p.origineScula === null ? regimDinRand(p.regimMana) : null;
  const rez: LocFrezaRand[] = [{
    unde: 'scula', origine: p.origineScula, diametru: p.diametruScula, ...(forma ? { forma } : {}), ...(regim ? { regim } : {}),
  }];
  const fund = p.tip === 'vcarve' && p.fundPlat, dop = p.tip === 'buzunar' && p.incrustatieDreapta && p.frezaDop;
  if (fund) rez.push({ unde: 'fund', origine: p.origineFund, diametru: p.diametruSculaFund });
  if (dop) rez.push({ unde: 'dop', origine: p.origineDop, diametru: p.diametruSculaDop });
  if (p.tip === 'vcarve' && p.incrustatie && p.jurDop === 'banda' && p.decupareBanda && p.frezaBanda) {
    rez.push({ unde: 'banda', origine: p.origineBanda, diametru: p.diametruSculaBanda });
  }
  const liste: ReadonlyArray<readonly ['buzunar' | 'fund' | 'dop', readonly RandRest[]]> = [
    ['buzunar', p.tip === 'buzunar' ? p.rest : []], ['fund', fund ? p.restFund : []], ['dop', dop ? p.restDop : []],
  ];
  for (const [rest, lista] of liste) lista.forEach((r, k) => { rez.push({ unde: { rest, k }, origine: r.origine ?? null, diametru: r.diametru }); });
  return rez;
}

/** O valoare a frezei care diferă între proiect și bibliotecă (ADR 0300 §5): câmpul, valoarea de aici și cea din bibliotecă. */
export type DiferentaFreza = {
  readonly camp: 'nume' | 'diametru' | 'forma' | 'unghi' | 'varf' | 'raza' | 'silueta' | 'turatie' | 'avans' | 'plonjare' | 'tais';
  readonly aici: number | string | null; readonly acolo: number | string | null;
};

/**
 * Ce diferă între copia frezei de pe rând și freza din bibliotecă (ADR 0300 §5): numele, diametrul, felul formei (plată, în V,
 * bilă, toroidală; ADR 0303), unghiul și vârful V-ului, raza colțului toroidalei, turația, avansul și plonjarea, tăișul. Numărul
 * T și pașii sunt ai rândului, nu ai frezei: nu se compară.
 */
export function diferenteFreza(loc: LocFrezaRand, f: FrezaOferita): DiferentaFreza[] {
  const o = loc.origine, s = f.scula, r = s.origine;
  const egal = (a: number | string | null, b: number | string | null): boolean =>
    typeof a === 'number' && typeof b === 'number' ? Math.abs(a - b) < 1e-9 : a === b;
  const rez: DiferentaFreza[] = [];
  const pune = (camp: DiferentaFreza['camp'], aici: number | string | null, acolo: number | string | null): void => {
    if (!egal(aici, acolo)) rez.push({ camp, aici, acolo });
  };
  pune('nume', o?.nume ?? null, r.nume);
  pune('diametru', citesteNumar(loc.diametru), s.diametru);
  const fel = (f: FormaRand | undefined): string => f?.tip ?? 'plata';
  const inV = (f: FormaRand | undefined) => (f?.tip === 'v' ? f : null);
  const razaColt = (f: FormaRand | undefined): number | null => (f?.tip === 'toroidala' ? f.raza : null);
  pune('forma', fel(loc.forma), fel(s.forma));
  // Unghiul și vârful compară doar două V-uri, raza doar două toroidale (altfel diferența e a felului).
  if (fel(loc.forma) === fel(s.forma)) {
    const a = inV(loc.forma), b = inV(s.forma);
    pune('unghi', a?.unghi ?? null, b?.unghi ?? null);
    pune('varf', a ? a.varf ?? 0 : null, b ? b.varf ?? 0 : null);
    pune('raza', razaColt(loc.forma), razaColt(s.forma));
    // Profilul desenat (ADR 0304): altă siluetă, spusă prin înălțimea ei (chiar egală: punctele diferă).
    const pa = loc.forma, pb = s.forma;
    if (pa?.tip === 'profil' && pb?.tip === 'profil' && !formeEgale(pa, pb)) {
      rez.push({ camp: 'silueta', aici: pa.puncte[pa.puncte.length - 1]![1], acolo: pb.puncte[pb.puncte.length - 1]![1] });
    }
  }
  pune('turatie', o?.regim?.turatie ?? null, r.regim?.turatie ?? null);
  pune('avans', o?.regim?.avans ?? null, r.regim?.avans ?? null);
  pune('plonjare', o?.regim?.plonjare ?? null, r.regim?.plonjare ?? null);
  pune('tais', o?.tais ?? null, r.tais ?? null);
  return rez;
}

/**
 * Ce spune rândul despre freza lui față de bibliotecă (ADR 0300 §5): cu originea, freza ștearsă din bibliotecă, schimbată (cu
 * diferențele) sau la zi; fără origine, freza din bibliotecă cu același diametru și aceeași formă, dacă e (recunoașterea, ADR
 * 0114 §6: doar arătată, nu scrisă). `biblioteca` null = necitită încă: nimic de spus.
 */
export type StareOrigine =
  | { readonly fel: 'stearsa' } | { readonly fel: 'la-zi' }
  | { readonly fel: 'schimbata'; readonly freza: FrezaOferita; readonly diferente: readonly DiferentaFreza[] }
  | { readonly fel: 'recunoscuta'; readonly freza: FrezaOferita };

export function stareOrigine(loc: LocFrezaRand, biblioteca: readonly FrezaOferita[] | null): StareOrigine | null {
  if (biblioteca === null) return null;
  if (loc.origine) {
    const id = loc.origine.biblioteca.id, f = biblioteca.find((x) => x.id === id);
    if (!f) return { fel: 'stearsa' };
    const diferente = diferenteFreza(loc, f);
    return diferente.length === 0 ? { fel: 'la-zi' } : { fel: 'schimbata', freza: f, diferente };
  }
  const d = citesteNumar(loc.diametru);
  if (d === null) return null;
  // Cu valori de lucru scrise de mână (28.8↑p), freza din bibliotecă le cere egale (una fără ele taie cu cele ale lucrării).
  const aceleasiValori = (r: ValoriLucru | undefined): boolean => {
    if (!loc.regim) return true;
    const b = r ?? { turatie: TURATIE_IMPLICITA, avans: AVANS_IMPLICIT, plonjare: PLONJARE_IMPLICITA };
    return Math.abs(loc.regim.turatie - b.turatie) < 1e-9 && Math.abs(loc.regim.avans - b.avans) < 1e-9 && Math.abs(loc.regim.plonjare - b.plonjare) < 1e-9;
  };
  const f = biblioteca.find((x) => Math.abs(x.scula.diametru - d) < 1e-9 && formeEgale(loc.forma, x.scula.forma) && aceleasiValori(x.scula.origine.regim));
  return f ? { fel: 'recunoscuta', freza: f } : null;
}

/**
 * „Ia valorile noi” (ADR 0300 §5): pe locul `unde`, diametrul, forma (la freza operației) și originea frezei `f` din bibliotecă,
 * cu numele, versiunea, valorile de lucru și tăișul ei. Numărul T și pașii sunt ai rândului: rămân. Un loc care nu e pe rând
 * nu schimbă nimic.
 */
export function cuValorileNoi(p: Rand, unde: UndeFreza, f: FrezaOferita, text: (x: number) => string = String): Partial<Rand> {
  const s = f.scula, d = text(s.diametru), origine = s.origine;
  if (unde === 'scula') {
    return { diametruScula: d, ...campuriForma(s.forma, text), origineScula: origine };
  }
  if (unde === 'fund') return { diametruSculaFund: d, origineFund: origine };
  if (unde === 'dop') return { diametruSculaDop: d, origineDop: origine };
  if (unde === 'banda') return { diametruSculaBanda: d, origineBanda: origine };
  const camp = unde.rest === 'fund' ? 'restFund' : unde.rest === 'dop' ? 'restDop' : 'rest';
  const lista = p[camp];
  if (unde.k < 0 || unde.k >= lista.length) return {};
  return { [camp]: lista.map((r, i) => (i === unde.k ? { ...r, diametru: d, origine } : r)) };
}

/**
 * Copia unei freze de pe rând, de pus înapoi în bibliotecă (ADR 0300 §5, felia 16.A↑b-6): id-ul și versiunea originii,
 * numele, T-ul, diametrul, forma, valorile de lucru și tăișul, plus pasul pe trecere al rândului și pasul lateral al locului
 * ei (mm; null: de necitit sau fără pas lateral). Aplicația face din ea freza bibliotecii.
 */
export type CopieRand = {
  readonly id: string; readonly rev: number; readonly nume: string; readonly numar: number; readonly diametru: number;
  /** Forma copiei; fără profilul desenat: copia ține doar punctele, nu felul parametric, deci nu se pune înapoi (16.A↑f-3). */
  readonly forma?: Exclude<FormaRand, { readonly tip: 'profil' }>;
  readonly regim?: { readonly turatie: number; readonly avans: number; readonly plonjare: number };
  readonly tais?: number;
  readonly pas: number | null; readonly pasLateral: number | null;
};

/**
 * Cum s-a încheiat „Pune-o înapoi în bibliotecă” (felia 16.A↑b-6): freza pusă înapoi, ca o oferă aplicația, sau motivul
 * refuzului (biblioteca plină, a unei versiuni mai noi, valorile în afara marginilor ei, id-ul încă acolo, o scriere căzută).
 */
export type RezultatInapoi =
  | { readonly ok: true; readonly freza: FrezaOferita }
  | { readonly ok: false; readonly motiv: 'plina' | 'versiune' | 'valori' | 'exista' | 'eroare' };

/**
 * Copia frezei de pe locul `unde` al rândului; null fără origine, pe un loc care nu e pe rând, cu T-ul ori Ø de necitit, sau cu
 * un profil desenat.
 */
export function copieDeReadus(p: Rand, unde: UndeFreza): CopieRand | null {
  const loc = locuriFreze(p).find((l) => acelasiLoc(l.unde, unde));
  const o = loc?.origine;
  if (!loc || !o) return null;
  // Profilul desenat (ADR 0304): copia ține punctele, nu felul și valorile profilului parametric, deci n-are freză de pus înapoi
  // (editorul siluetei desenate vine în f-5).
  if (loc.forma?.tip === 'profil') return null;
  const numarText = unde === 'scula' ? p.numarScula : unde === 'fund' ? p.numarSculaFund : unde === 'dop' ? p.numarSculaDop
    : unde === 'banda' ? p.numarSculaBanda : (unde.rest === 'fund' ? p.restFund : unde.rest === 'dop' ? p.restDop : p.rest)[unde.k]?.numar;
  const pasLateralText = unde === 'scula' ? (p.tip === 'buzunar' ? p.pasLateral : null) : unde === 'fund' ? p.pasLateralFund
    : unde === 'dop' ? p.pasLateralDop : unde === 'banda' ? null
      : (unde.rest === 'fund' ? p.restFund : unde.rest === 'dop' ? p.restDop : p.rest)[unde.k]?.pas ?? null;
  const numar = numarText === undefined ? null : citesteNumar(numarText), diametru = citesteNumar(loc.diametru);
  if (numar === null || diametru === null) return null;
  return {
    id: o.biblioteca.id, rev: o.biblioteca.rev, nume: o.nume, numar, diametru, ...(loc.forma ? { forma: loc.forma } : {}),
    ...(o.regim ? { regim: o.regim } : {}), ...(o.tais !== undefined ? { tais: o.tais } : {}),
    pas: citesteNumar(p.pas), pasLateral: pasLateralText === null ? null : citesteNumar(pasLateralText),
  };
}

/**
 * Rândurile după ce freza ștearsă a locului `unde` de pe rândul `cheie` a fost pusă înapoi ca `f` (ADR 0300 §5, felia
 * 16.A↑b-6): locul acela ia freza pusă înapoi (numele, poate liber, și versiunea ei); celelalte locuri ale ferestrei cu aceeași
 * origine o iau doar dacă diferă de ea cel mult prin nume (aceeași copie). Restul își păstrează copia, cu nota lor.
 */
export function cuFrezaPusaInapoi(
  param: Readonly<Record<string, Rand>>, cheie: string, unde: UndeFreza, f: FrezaOferita, text: (x: number) => string = String,
): Record<string, Rand> {
  const nou: Record<string, Rand> = { ...param };
  for (const [k, p] of Object.entries(param)) {
    let r = p;
    for (const l of locuriFreze(p)) {
      if (l.origine?.biblioteca.id !== f.id) continue;
      const aici = k === cheie && acelasiLoc(l.unde, unde);
      if (aici || diferenteFreza(l, f).every((d) => d.camp === 'nume')) r = { ...r, ...cuValorileNoi(r, l.unde, f, text) };
    }
    nou[k] = r;
  }
  return nou;
}

/** Frezele oferite unei freze de rest (ADR 0093): doar cele mai mici decât freza dinainte (`dinainte`, ca text); de necitit, toate. */
export function oferitePentruRest(oferite: readonly FrezaOferita[], dinainte: string): readonly FrezaOferita[] {
  const d0 = citesteNumar(dinainte);
  return d0 === null ? oferite : oferite.filter((f) => f.scula.diametru < d0);
}
/** Ce se schimbă dintr-o operație în dialog, cu freza ei (ADR 0084: fiecare rând are freza lui; lipsă = cea din document). */
export type ValoriOperatie = {
  readonly scula?: SculaOperatie;
  readonly latura: Latura; readonly sens: Sens; readonly adancime: number; readonly pas: number; readonly urechi: UrechiOperatie | null;
  readonly rampa: RampaOperatie | null; readonly intrari: IntrariOperatie | null; readonly colturi: ColturiOperatie | null;
  /**
   * Despărțirea foii (ADR 0037 §8, decizia owner-ului din 13.10: o marchează omul): doar pe un rând cu căi deschise; lipsă =
   * neschimbată. Exportul cere marcajul pe o tăietură deschisă prin foaie care ajunge la marginea foii.
   */
  readonly despartire?: boolean;
  /**
   * Buzunarul (ADR 0069): `tip: 'buzunar'` cu distanța dintre inele (mm); lipsă = profil. Pe un buzunar, latura e
   * `interior`, iar urechile, rampa, intrările și degajările lipsesc.
   */
  readonly tip?: 'profil' | 'buzunar' | 'gaurire' | 'vcarve';
  readonly pasLateral?: number;
  /** Coborârea în buzunar (ADR 0076); lipsă = plonjarea dreaptă. */
  readonly coborare?: Coborare;
  /** Găurirea (ADR 0087): la al câtelea pas iese freza din gaură. */
  readonly retragereCompleta?: number;
  /** Fundul plat al unui V-carve (ADR 0091): freza dreaptă și pasul ei lateral; `null` = fără (bifa scoasă). */
  readonly fundPlat?: FundPlatOperatie | null;
  /** Direcția pe linie (ADR 0092 §4): doar pe un profil pe linie; lipsă = ca desenul. */
  readonly directie?: DirectieOperatie;
  /** Frezele de rest ale unui buzunar (ADR 0093), în ordine; goală = niciuna. */
  readonly rest?: readonly FrezaRestOperatie[];
  /** Strategia unui buzunar (ADR 0094): liniile paralele la unghiul dat; lipsă = inelele. */
  readonly strategie?: { readonly fel: 'paralel'; readonly unghi: number };
  /** Incrustația unui V-carve (ADR 0170): jocurile, marginea dopului și lemnul din jurul lui; `null` = un V-carve obișnuit. */
  readonly incrustatie?: IncrustatieOperatie | null;
  /** Incrustația cu pereți drepți a unui buzunar (ADR 0171); `null` = un buzunar obișnuit. */
  readonly incrustatieDreapta?: IncrustatieDreaptaOperatie | null;
};
/**
 * Incrustația în V (ADR 0170 §1): jocul pentru clei, spațiul pentru fierăstrău, marginea semifabricatului, în mm; lemnul din
 * jurul dopului (ADR 0172): fața coborâtă sau banda, cu valorile ei.
 */
export type IncrustatieOperatie = {
  readonly joc: number; readonly fierastrau: number; readonly margine: number; readonly jurDop: 'fata' | 'banda';
  readonly banda?: BandaOperatie;
};
/**
 * Banda îngustă din jurul dopului în V (ADR 0172, răspunsurile 1–5): lățimea (lipsă = cea mai mică, socotită de lucrare),
 * decuparea prin placă, grosimea plăcii, freza decupării (lipsă = a fundului plat) și punțile, în mm.
 */
export type BandaOperatie = {
  readonly latime?: number; readonly decupare: boolean; readonly grosimePlaca: number;
  /** Freza decupării, cu originea ei din „Frezele mele” (ADR 0300 §4, felia 16.A↑b-5; ca `SculaOperatie.origine`). */
  readonly freza?: { readonly numar: number; readonly diametru: number; readonly origine?: OrigineFreza | null };
  readonly punti: { readonly numar: number; readonly latime: number; readonly grosime: number };
};
/**
 * Incrustația cu pereți drepți (ADR 0171 §1, răspunsurile 1, 2 și 4): jocul lateral, dopul ridicat sau decupat, sprijinul
 * celui ridicat, jocul de sub dop (g) și spațiul de deasupra (H), marginea semifabricatului, în mm; frezele dopului, prima și
 * cele de rest (lipsă = ale locașului); punțile dopului decupat (ADR 0174; lipsă pe dopul ridicat).
 */
export type IncrustatieDreaptaOperatie = {
  readonly jocLateral: number; readonly dop: 'ridicat' | 'decupat'; readonly sprijin: 'fund' | 'fata' | 'umar';
  readonly joc: number; readonly fierastrau: number; readonly margine: number; readonly frezeDop?: readonly FrezaRestOperatie[];
  readonly punti?: { readonly numar: number; readonly latime: number; readonly grosime: number };
  /** Gaura (ADR 0175): locașul prin foaie (lipsă = buzunar). */
  readonly locas?: 'gaura';
  /** Treapta (ADR 0175 §3): umărul la `adancime` de la față, lat de `latime`, spre interior (lipsă) sau spre exterior. */
  readonly treapta?: { readonly adancime: number; readonly latime: number; readonly spre?: 'interior' | 'exterior' };
};
/**
 * O freză de rest (ADR 0093): numărul (T), diametrul și distanța dintre inele (mm); originea ei din „Frezele mele” (ADR 0300
 * §4, felia 16.A↑b-5), ca `SculaOperatie.origine`: `null` = scrisă de mână, lipsă = rămâne cea din document.
 */
export type FrezaRestOperatie = { readonly numar: number; readonly diametru: number; readonly pasLateral: number; readonly origine?: OrigineFreza | null };
/**
 * Freza dreaptă a fundului plat (ADR 0091): numărul (T), diametrul și distanța dintre inele (mm), cu frezele ei de rest și
 * originea ei (ADR 0300 §4, felia 16.A↑b-5; ca `SculaOperatie.origine`).
 */
export type FundPlatOperatie = {
  readonly numar: number; readonly diametru: number; readonly pasLateral: number; readonly rest?: readonly FrezaRestOperatie[];
  readonly origine?: OrigineFreza | null;
};

/**
 * Un rând: o operație a unei piese (ADR 0025), cu cheia `<piesă>/<operație>`. `deschise`: câte din nodurile ei sunt căi
 * deschise (ADR 0037 §12): coloanele oferă doar ce nu refuză exportul.
 */
export type OperatieExport = {
  readonly cheie: string; readonly descriere: string; readonly deschise: number; readonly noduri: number; readonly valori: ValoriOperatie;
  /**
   * Rândul din listă (constatarea 14 a auditului, felia 28.8↑s): `nume`, numele piesei dat de om sau forma fără loc; `unde`,
   * locul pe foaie, pe rândul de dedesubt. Lipsă: lista arată `descriere`, întreg.
   */
  readonly lista?: { readonly nume: string; readonly unde: string };
  /** Toate nodurile operației sunt cercuri: rândul oferă și găurirea (ADR 0087). */
  readonly cercuri?: boolean;
  /**
   * Diametrele cercurilor rândului, în lume (ca le citește găurirea), distincte și crescătoare: fișa spune felul găuririi și
   * cercul care nu se poate găuri cu freza scrisă, înainte de Exportă (ADR 0291, felia 28.8↑h). Doar cu `cercuri`.
   */
  readonly diametre?: readonly number[];
  /** Locul operației în ordinea de mână (ADR 0133), dacă documentul îl are. */
  readonly rang?: number;
  /** Rândurile altor piese din interiorul formelor ei (ADR 0133 §3, `cuprinse`): riscul unui exterior tăiat înaintea lor. */
  readonly inauntru?: readonly string[];
  /**
   * Grosimea foii rândului (lipsă: a foii active): cu „Toate foile” (ADR 0291, 7a), rândul unei alte foi se socotește pe hârtie
   * cu grosimea ei.
   */
  readonly grosime?: number;
};

/**
 * Un rând „pe hârtie” (ADR 0291, felia 28.8↑h): ce face lucrarea cu valorile scrise, socotit de fereastra conectată cu funcțiile
 * lucrării (`src/app/hartieExport.ts`), nu din copii în interfață: desenele și notele fișei îl doar arată.
 */
export type IntrareHartie = {
  readonly tip: 'profil' | 'buzunar' | 'gaurire' | 'vcarve';
  /** Adâncimea scrisă (null: textul nu se citește) și felul incrustației rândului (gaura: locașul prin foaie, ADR 0175). */
  readonly adancime: number | null; readonly incrustatie: 'fara' | 'alta' | 'gaura';
  readonly pas: number | null;
  /** Grosimea foii (lipsă: necunoscută), supracursa citită (0 fără ea) și bifa „și tăieturile cât foaia” (ADR 0177). */
  readonly grosime: number | undefined; readonly supracursa: number; readonly prinFoaie: boolean;
  /** Găurirea: freza scrisă, ieșirea la al câtelea pas și diametrele cercurilor rândului. */
  readonly diametruScula: number | null; readonly retragere: number | null; readonly diametre: readonly number[];
  /**
   * Buzunarul (ADR 0303 §4, felia 16.A↑e-5): forma frezei scrisă (`formaDinRand`: null = plată, lipsă = de necitit) și pasul
   * lateral, pentru creasta de pe fund. Profilul (16.A↑e-6): aceeași formă și dacă taie pe o parte, pentru perete.
   */
  readonly forma?: FormaRand | null | undefined; readonly pasLateral?: number | null; readonly peOParte?: boolean;
};
/** Felul găuririi unui cerc (ADR 0087): ca `felGaurire` din lucrare. */
export type FelGaurireRand = 'ciocanire' | 'elice' | 'mic' | 'mare' | 'gresit';
/** O mișcare pe Z a ciocănirii: tăind în jos, rapid, sau sus (la Z-ul sigur). */
export type PasCiocanireRand = { readonly z: number; readonly taie: true } | { readonly z: number | 'sus'; readonly taie: false };
export type HartieRand = {
  /** Adâncimea pe care o taie lucrarea (cu supracursa prin foaie și la gaura incrustației); null fără o adâncime bună. */
  readonly adancime: number | null;
  /** Adâncimile trecerilor (pozitive, ultima = `adancime`), ca `adancimiTreceri`; null fără valori bune. */
  readonly treceri: readonly number[] | null;
  /** Doar pe o găurire: felul pe fiecare diametru de cerc, pașii ciocănirii și ridicarea dintre doi pași (mm). */
  readonly gaurire: {
    readonly cercuri: readonly { readonly diametru: number; readonly fel: FelGaurireRand }[];
    readonly ciocanire: readonly PasCiocanireRand[] | null; readonly ridicare: number;
  } | null;
  /**
   * Doar pe un buzunar cu bila sau cu toroidala (ADR 0303 §4, felia 16.A↑e-5): creasta de pe fund la pasul lateral scris, ca
   * `creastaBuzunar` din lucrare: între două inele și cea mai mare (pe colțurile inelelor și pe mijloc); null altfel.
   */
  readonly creasta?: { readonly intreInele: number; readonly maxima: number } | null;
  /**
   * Doar pe un profil pe o parte cu bila sau cu toroidala (felia 16.A↑e-6): peretele, ca `peretePeOParte` din lucrare (vertical
   * de la față până la `vertical`, racordarea de rază `raza` la fund, `margineJos` rămasă pe muchia de jos a piesei, prin
   * foaie); null altfel.
   */
  readonly perete?: { readonly vertical: number; readonly raza: number; readonly margineJos: number } | null;
  /**
   * Doar pe un profil pe o parte cu o freză profilată (felia 16.A↑f-4): cât se retrage muchia de sus în piesă, ca
   * `retragereMuchie` din lucrare (la fund, peretele cade pe desen); null altfel.
   */
  readonly margine?: { readonly retragere: number } | null;
};

/**
 * Ce trimite dialogul la Exportă: montajul, postul, valorile operațiilor cu frezele lor (se scriu în document), confirmarea și
 * ordinea tăierii (ADR 0133 §3): cheile rândurilor în ordinea omului, sau null pentru ordinea automată.
 */
/** Forma frezei citită: bila, plata (`null`) sau V-ul, cu unghiul și vârful (vârful 0 nu se scrie, ADR 0092). */
export type FormaRelief = { readonly tip: 'bila' } | { readonly tip: 'v'; readonly unghi: number; readonly varf?: number } | null;

/** Valorile rândului unei operații a reliefului, citite (felia 18.1↑d-4, `exportRelief.ts`); ce scrie Exportă în operație. */
export type ValoriRelief = {
  readonly fel: 'finisare' | 'degrosare';
  readonly scula: { readonly numar: number; readonly diametru: number; readonly forma: FormaRelief };
  readonly pasLateral: number; readonly adaos: number; readonly unghi: number; readonly aliniat: boolean;
  readonly margine: 'perete' | 'trece';
  /** Planul zero (mm sub fața plăcii), sau `null`: vârful reliefului la fața plăcii. */
  readonly planZero: number | null;
  readonly adancime: number; readonly pas: number;
};

export type CerereExport = ParametriExport & {
  readonly valori: ReadonlyMap<string, ValoriOperatie>; readonly ordine: readonly string[] | null;
  /** Valorile rândurilor operațiilor reliefului (felia 18.1↑d-4); lipsă = cele din document. */
  readonly valoriRelief?: ReadonlyMap<string, ValoriRelief>;
};

/**
 * Ultimul rezultat: liniile și SHA-256 cu rezumatul jobului (ADR 0046), motivul, sau ieșirea din foaie care așteaptă
 * confirmarea omului.
 */
export type StareExport =
  | {
    readonly ok: true; readonly linii: number; readonly sha256: string; readonly avertismente: readonly string[];
    /** Cu fișiere separate pe sculă (ADR 0084): fiecare fișier descărcat, cu liniile și amprenta lui. */
    readonly fisiere?: readonly { readonly nume: string; readonly linii: number; readonly sha256: string }[];
    /** Cu un singur fișier: numele lui, cum s-a descărcat (ADR 0291 §5: baza aleasă de om, sau cea de azi). */
    readonly nume?: string;
    /**
     * Fișierele dopurilor incrustațiilor (ADR 0170 §3), descărcate după ale foii: fiecare cu semifabricatul lui (lățimea, înălțimea
     * și grosimea cea mai mică, mm).
     */
    readonly dopuri?: readonly {
      readonly nume: string; readonly linii: number; readonly sha256: string; readonly latime: number; readonly inaltime: number; readonly grosimeMinima: number;
      /** Dopul decupat (ADR 0171): placa lui are exact grosimea dată. */
      readonly exacta?: boolean;
    }[];
    /** `calcul`: simularea rulează (după descărcare); apoi rezultatul ei. */
    readonly rezumat: RezumatJob; readonly simulare: SimulareExport | 'calcul';
    /** „Toate foile” (ADR 0210 §5): arhiva, foile ei (identice ×N), fișierele și timpii. */
    readonly foi?: RezumatFoi;
    /** Rândurile pieselor desprinse care nu sunt încă „unde ține” (ADR 0211, b): butonul „Pune urechile unde țin”. */
    readonly undeTine?: readonly string[];
    /** Începutul fiecărui fișier scris (ADR 0292): primele linii, până la prima mișcare de tăiere. */
    readonly inceput?: readonly InceputFisier[];
  }
  | { readonly ok: false; readonly motiv: string; readonly cereConfirmare?: IesireFoaie };

/** Câte nume de plăcuțe arată nota exportului; restul, „…”. */
export const PLACUTE_NUMITE = 5;

export const LATURI_FOAIE: ReadonlyArray<readonly [keyof Depasire, CheieSimpla]> = [
  ['stanga', 'export.iesire.stanga'], ['dreapta', 'export.iesire.dreapta'], ['jos', 'export.iesire.jos'], ['sus', 'export.iesire.sus'],
];

/**
 * Laturile pe care freza iese din foaie, cu cât, în cuvinte. Cu 3 zecimale, ca în antet, dar scrise după limbă: în română
 * punctul ar citi „26.000 mm” ca douăzeci și șase de mii.
 */
export function laturi(d: Depasire, limba: string): string {
  const f = new Intl.NumberFormat(limba === 'ro' ? 'ro-RO' : 'en-GB', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  return LATURI_FOAIE.filter(([k]) => d[k] > 0).map(([k, cheie]) => t(cheie, { mm: f.format(d[k]) })).join(', ');
}

/** Peste atâtea caractere, un text al ferestrei se arată prescurtat (28.8↑k): prima propoziție, restul sub „Mai mult”. */
export const PRAG_TEXT_LUNG = 160;

/**
 * Prima propoziție a unui text lung și restul (ADR 0291, felia 28.8↑k; constatarea 21 a auditului: explicația treptei avea 11
 * rânduri, nota ordinii automate 6, mereu la vedere). Un text de cel mult `PRAG_TEXT_LUNG` caractere sau dintr-o singură
 * propoziție rămâne întreg (`rest` gol). O propoziție se termină cu un punct urmat de spațiu și de o literă mare, o paranteză sau
 * ghilimele: „3.175” și „…-dop-1.nc” nu taie textul.
 */
export function scurtat(text: string): { readonly prima: string; readonly rest: string } {
  if (text.length <= PRAG_TEXT_LUNG) return { prima: text, rest: '' };
  const m = /^(.+?\.)\s+(?=[\p{Lu}(„"“])/su.exec(text);
  return m?.[1] ? { prima: m[1], rest: text.slice(m[0].length) } : { prima: text, rest: '' };
}

/** Un text cum îl arată fereastra cât e strâns: prima propoziție și „…”, dacă are rest. */
export function textStrans(text: string): string {
  const { prima, rest } = scurtat(text);
  return rest === '' ? text : `${prima} …`;
}

/**
 * Rezervă înălțimea casetei explicației fiecărui grup: cel mai lung dintre textul grupului și titlurile câmpurilor lui, măsurat
 * pe o copie goală a casetei (textul ei rămâne al lui React). Se măsoară din nou doar când se schimbă textele, lățimea sau
 * „Mai mult”. Cât grupul e strâns, textele se măsoară prescurtate (`textStrans`, 28.8↑k); grupul cu vreun text lung primește
 * `data-lung` (atunci se vede „Mai mult”).
 */
export function rezervaExplicatii(panou: HTMLElement | null): void {
  for (const g of panou?.querySelectorAll<HTMLElement>('[data-grup]') ?? []) {
    const e = g.querySelector<HTMLElement>('[data-explicatie]');
    if (!e?.parentElement) continue;
    const texte = [e.dataset['implicit'] ?? '', ...Array.from(g.querySelectorAll('[title]'), (x) => x.getAttribute('title') ?? '')];
    const deschisa = e.dataset['deschisa'] !== undefined;
    g.toggleAttribute('data-lung', texte.some((x) => scurtat(x).rest !== ''));
    const cheie = `${e.clientWidth}|${deschisa ? 'd' : 's'}|${texte.join('\u0001')}`;
    if (e.dataset['masurat'] === cheie) continue;
    const m = e.cloneNode(false) as HTMLElement;
    m.removeAttribute('data-explicatie');
    m.setAttribute('aria-hidden', 'true');
    Object.assign(m.style, { position: 'absolute', visibility: 'hidden', minHeight: '0', width: `${e.getBoundingClientRect().width}px` });
    e.parentElement.append(m);
    let max = 0;
    for (const x of texte) { m.textContent = deschisa ? x : textStrans(x); max = Math.max(max, m.getBoundingClientRect().height); }
    m.remove();
    e.style.minHeight = `${Math.ceil(max)}px`;
    e.dataset['masurat'] = cheie;
  }
}

/** Începutul id-urilor descrierilor unui grup (`fisa|grup`), doar din `[A-Za-z0-9_-]` (28.8↑l). */
export function idDescriere(loc: string): string {
  return `dx-d-${loc.replace(/[^A-Za-z0-9_-]/g, '_')}`;
}

/**
 * Leagă fiecare câmp al unui grup de descrierile lui (ADR 0291, felia 28.8↑l; constatarea 13 a auditului): explicația întreagă
 * (`[data-descriere]`, ascunsă) și greșelile grupului, prin `aria-describedby`. Câmpurile nu și-l pun singure (stau în corpul
 * grupului, scris de fișă), deci îl pune pasul de după randare, ca `rezervaExplicatii`, și doar când se schimbă.
 */
export function legaDescrierile(panou: HTMLElement | null): void {
  for (const g of panou?.querySelectorAll<HTMLElement>('[data-grup]') ?? []) {
    const ids = [...g.querySelectorAll<HTMLElement>('[data-descriere], [data-greseala]')].map((x) => x.id).filter((x) => x !== '').join(' ');
    for (const c of g.querySelectorAll<HTMLElement>('.dx-campuri input, .dx-campuri select, .dx-campuri textarea')) {
      if (ids === '') c.removeAttribute('aria-describedby');
      else if (c.getAttribute('aria-describedby') !== ids) c.setAttribute('aria-describedby', ids);
    }
  }
}

export const COLTURI = ['stanga-jos', 'dreapta-jos', 'dreapta-sus', 'stanga-sus'] as const;
/** Unde poate sta XY0: în colțuri, apoi în centrul foii (ADR 0291 §6). */
export const ORIGINI = [...COLTURI, 'centru'] as const;
export type OrigineExport = (typeof ORIGINI)[number];
export const CHEI_COLT: Readonly<Record<OrigineExport, CheieSimpla>> = {
  'stanga-jos': 'export.colt.stanga-jos', 'dreapta-jos': 'export.colt.dreapta-jos',
  'dreapta-sus': 'export.colt.dreapta-sus', 'stanga-sus': 'export.colt.stanga-sus', centru: 'export.colt.centru',
};
export const CHEI_LATURA: Readonly<Record<Latura | 'buzunar', CheieSimpla>> = {
  exterior: 'export.latura.exterior', interior: 'export.latura.interior', 'pe-linie': 'export.latura.pe-linie',
  stanga: 'export.latura.stanga', dreapta: 'export.latura.dreapta', buzunar: 'export.latura.buzunar',
};

/** În (0, plafon]: marginile schemei v3, ca operațiile scrise în document să treacă de ușă la redeschidere. */
export function inMargini(s: string, plafon: number, minim = 0): boolean {
  const x = citesteNumar(s);
  return x !== null && Number.isFinite(x) && x > 0 && x >= minim && x <= plafon;
}

/** Diametrul implicit al frezei drepte a fundului plat (ADR 0091 §4), în mm (1/8″). */
export const DIAMETRU_FUND_IMPLICIT = 3.175;

/** Marginea dopului unei incrustații: în [0, plafonul ei]. */
export function margineBuna(s: string): boolean {
  const m = citesteNumar(s);
  return m !== null && m >= 0 && m <= MARGINI_OPERATIE.margineDop;
}

/** Dopul cu pereți drepți ridicat și sprijinit pe față (ADR 0171): folosește jocul de sub el (g), nu spațiul de deasupra (H). */
export const sprijinitPeFata = (p: { readonly dopInc: 'ridicat' | 'decupat'; readonly sprijinInc: 'fund' | 'fata' | 'umar' }): boolean =>
  p.dopInc === 'ridicat' && p.sprijinInc === 'fata';

export type RandSprijin = {
  readonly dopInc: 'ridicat' | 'decupat'; readonly sprijinInc: 'fund' | 'fata' | 'umar'; readonly locasInc: 'buzunar' | 'gaura';
  readonly treaptaInc: 'fara' | 'interior' | 'exterior';
};
/**
 * Jocul g e folosit (ADR 0171, ADR 0175): sub dopul ridicat pe față; în trepte, sub tijă (pe umăr) sau deasupra umărului (pe
 * fund). La gaură, niciodată (dopul iese la nivel cu fața de jos sau stă pe față, înalt cât foaia).
 */
export const jocFolosit = (p: RandSprijin): boolean => p.locasInc !== 'gaura' && (p.treaptaInc !== 'fara' || sprijinitPeFata(p));
/** Spațiul H (peste placă) e folosit peste tot, afară de dopul ridicat pe față, fără treaptă. */
export const spatiuFolosit = (p: RandSprijin): boolean => p.treaptaInc !== 'fara' || !sprijinitPeFata(p);

/** Urechile pornite sau nu; câmpurile lor rămân scrise și cu bifa scoasă, ca o bifă pusă la loc să nu le piardă. */
export type Rand = {
  /** Freza rândului (ADR 0084), ca text: numărul și diametrul. */
  readonly numarScula: string; readonly diametruScula: string;
  /**
   * Freza din „Frezele mele” a rândului (ADR 0300 §4, felia 16.A↑b-3): originea ei (din document sau aleasă în listă); `null` =
   * scrisă de mână. Un diametru sau o formă schimbate de mână o scot.
   */
  readonly origineScula: OrigineFreza | null;
  /** Valorile de lucru scrise de mână pe freza operației (ADR 0291 §3, felia 28.8↑p), ca text; contează doar fără origine. */
  readonly regimMana: RegimRand;
  /**
   * Forma frezei (ADR 0090): plată, în V (unghiul și diametrul vârfului plat, ADR 0092; 0 = ascuțit), bilă sau toroidală (raza
   * colțului, ADR 0303), ca text. Câmpurile celorlalte forme rămân scrise, ca o formă pusă la loc să nu le piardă.
   */
  readonly formaScula: 'plata' | 'v' | 'bila' | 'toroidala' | 'profil'; readonly unghiV: string; readonly varfV: string; readonly razaColt: string;
  /** Punctele profilului desenat (ADR 0304), cât rândul are o freză profilată: vin din document sau din bibliotecă, doar de citit. */
  readonly profil?: readonly (readonly [number, number])[];
  /** Direcția pe linie (ADR 0092 §4): „” = ca desenul. */
  readonly directie: '' | DirectieOperatie;
  readonly latura: Latura; readonly sens: Sens; readonly adancime: string; readonly pas: string;
  readonly urechi: boolean; readonly numarUrechi: string; readonly latimeUreche: string; readonly grosimeUreche: string;
  /**
   * Locurile urechilor (ADR 0211): la distanțe egale, alese pe desen (atunci numărul e câte ai pus) sau unde ține lemnul (la
   * export, câte cere numărul).
   */
  readonly modUrechi: ModLocuriUrechi | 'egale';
  readonly rampa: boolean; readonly lungimeRampa: string;
  readonly intrari: boolean; readonly razaIntrare: string;
  /** Degajările: „” = fără. */
  readonly colturi: '' | ColturiOperatie['tip'];
  readonly despartire: boolean;
  /** Buzunarul (ADR 0069) sau găurirea (ADR 0087): felul rândului; pasul lateral, ca text, rămâne scris și pe un profil. */
  readonly tip: 'profil' | 'buzunar' | 'gaurire' | 'vcarve';
  /** Găurirea: la al câtelea pas iese freza din gaură, ca text. */
  readonly retragereCompleta: string;
  readonly pasLateral: string;
  /** Coborârea în buzunar (ADR 0076), cu valorile tuturor felurilor scrise, ca o schimbare de fel să nu le piardă. */
  readonly coborare: Coborare['fel'];
  readonly unghiCoborare: string; readonly lungimeZigzag: string; readonly razaElice: string;
  /** Fundul plat al V-carve-ului (ADR 0091): bifa și freza dreaptă, ca text; câmpurile rămân scrise și cu bifa scoasă. */
  readonly fundPlat: boolean; readonly numarSculaFund: string; readonly diametruSculaFund: string; readonly pasLateralFund: string;
  /** Originea frezei fundului plat (ADR 0300 §4, felia 16.A↑b-5), ca `origineScula`: un diametru schimbat de mână o scoate. */
  readonly origineFund: OrigineFreza | null;
  /** Frezele de rest (ADR 0093), ca text: ale buzunarului și ale fundului plat. */
  readonly rest: readonly RandRest[]; readonly restFund: readonly RandRest[];
  /** Strategia buzunarului (ADR 0094) și unghiul liniilor, ca text; unghiul rămâne scris și pe inele. */
  readonly strategie: 'inele' | 'paralel'; readonly unghiParalel: string;
  /**
   * Incrustația în V (ADR 0170): un V-carve care își declară dopul; jocul pentru clei, spațiul pentru fierăstrău și marginea
   * dopului, ca text; `acelasiSpatiu` (răspunsul 3: ambele feluri) ține fierăstrăul egal cu jocul. Valorile rămân scrise și pe un
   * V-carve obișnuit.
   */
  readonly incrustatie: boolean; readonly jocInc: string; readonly fierastrauInc: string; readonly margineInc: string;
  readonly acelasiSpatiu: boolean;
  /**
   * Lemnul din jurul dopului (ADR 0172): fața coborâtă sau banda, cu lățimea (goală = cea mai mică), decuparea, placa (goală =
   * S + H + 1), freza decupării (bifa: alta decât a fundului plat) și punțile, ca text; câmpurile rămân scrise și pe fața
   * coborâtă, iar cele ale decupării și fără ea.
   */
  readonly jurDop: 'fata' | 'banda';
  readonly latimeBanda: string; readonly decupareBanda: boolean; readonly placaBanda: string;
  readonly frezaBanda: boolean; readonly numarSculaBanda: string; readonly diametruSculaBanda: string;
  /** Originea frezei decupării (ADR 0300 §4, felia 16.A↑b-5), ca `origineScula`. */
  readonly origineBanda: OrigineFreza | null;
  /** Punțile, ca text: ale benzii (V) ori, pe pereții drepți, ale dopului decupat (ADR 0174); rămân scrise și pe dopul ridicat. */
  readonly numarPunti: string; readonly latimePunti: string; readonly grosimePunti: string;
  /**
   * Incrustația cu pereți drepți (ADR 0171): un buzunar care își declară dopul, cu jocul lateral, felul dopului și sprijinul
   * lui, ca text; jocul de sub dop, spațiul de deasupra și marginea sunt câmpurile incrustației în V (aceleași înțelesuri).
   * `frezaDop`: dopul are frezele lui (răspunsul 4), prima și cele de rest; câmpurile rămân scrise și cu bifa scoasă.
   */
  readonly incrustatieDreapta: boolean; readonly lateralInc: string; readonly dopInc: 'ridicat' | 'decupat'; readonly sprijinInc: 'fund' | 'fata' | 'umar';
  /** Locașul (ADR 0175): buzunarul sau gaura prin foaie. */
  readonly locasInc: 'buzunar' | 'gaura';
  /** Treapta (ADR 0175 §5): fără, spre interior sau spre exterior; adâncimea și lățimea umărului, ca text (rămân și fără ea). */
  readonly treaptaInc: 'fara' | 'interior' | 'exterior'; readonly adancimeTreapta: string; readonly latimeTreapta: string;
  readonly frezaDop: boolean; readonly numarSculaDop: string; readonly diametruSculaDop: string; readonly pasLateralDop: string;
  /** Originea primei freze a dopului (ADR 0300 §4, felia 16.A↑b-5), ca `origineScula`. */
  readonly origineDop: OrigineFreza | null;
  readonly restDop: readonly RandRest[];
};
/** Verdictul câmpurilor unui rând: fiecare grup de valori, bun sau nu (o valoare greșită oprește exportul și se spune în grupul ei). */
export type BunRand = {
  readonly scula: boolean; readonly adancime: boolean; readonly pas: boolean; readonly numar: boolean; readonly latime: boolean; readonly grosime: boolean;
  readonly rampa: boolean; readonly intrari: boolean; readonly pasLateral: boolean; readonly coborare: boolean; readonly retragere: boolean;
  readonly vcarve: boolean; readonly fund: boolean; readonly varf: boolean; readonly vPeLinie: boolean; readonly rotunda: boolean; readonly rest: boolean; readonly strategie: boolean;
  readonly incrustatie: boolean; readonly dreapta: boolean; readonly frezaDop: boolean; readonly banda: boolean; readonly puntiDop: boolean;
};

/**
 * O freză de rest pe rândul ei, ca text: numărul, diametrul și pasul lateral; originea ei din „Frezele mele” (ADR 0300 §4,
 * felia 16.A↑b-5): lipsă sau `null` = scrisă de mână (un diametru schimbat de mână o scoate).
 */
export type RandRest = { readonly numar: string; readonly diametru: string; readonly pas: string; readonly origine?: OrigineFreza | null };

/**
 * Banda dopului pe rând (ADR 0172), din câmpurile lui, ca în lucrare (`valoriBanda`): placa implicită S + H + 1 și cea mai mică
 * cu decuparea (S + H + punțile), din adâncime, joc și fierăstrău; lățimea cea mai mică, și din unghiul V-ului, freza fundului
 * plat (0 fără ea: fundul îl fac inelele V, ADR 0173) și, cu decuparea, a ei (null fără ea). Null fără adâncime, joc sau fierăstrău.
 */
export function bandaRand(p: Rand): { readonly placaImplicita: number; readonly placaMinima: number | null; readonly minima: number | null } | null {
  const D = citesteNumar(p.adancime), g = citesteNumar(p.jocInc), H = p.acelasiSpatiu ? g : citesteNumar(p.fierastrauInc);
  if (D === null || g === null || H === null) return null;
  const S = D - g, u = citesteNumar(p.unghiV), gp = citesteNumar(p.grosimePunti);
  const fund = p.fundPlat ? citesteNumar(p.diametruSculaFund) : 0;
  // Fără freză dreaptă, decuparea n-are altă freză decât a ei (ADR 0173).
  const decupare = !p.decupareBanda ? fund : p.frezaBanda ? citesteNumar(p.diametruSculaBanda) : p.fundPlat ? fund : null;
  return {
    placaImplicita: S + H + SUB_FATA_DOPULUI, placaMinima: gp === null ? null : S + H + gp,
    minima: u === null || fund === null || decupare === null ? null : latimeMinimaBanda(H, Math.tan((u * Math.PI) / 360), fund, decupare),
  };
}

/**
 * Câmpurile benzii unui rând sunt bune (ADR 0172): lățimea goală (cea mai mică) sau cel puțin cea mai mică, sub plafon; cu
 * decuparea, placa goală (S + H + 1) sau sub plafon, oricum cel puțin fundul benzii plus punțile, punțile ca urechile și,
 * cu bifa ei, freza decupării ca a fundului plat; fără freză dreaptă (ADR 0173), decuparea cere bifa ei. Ce nu se știe încă
 * (un câmp gol) îl spune lucrarea, cu motiv.
 */
/** Punțile rândului (ale benzii, ADR 0172, ori ale dopului drept decupat, ADR 0174), ca urechile: câte, lățimea, grosimea. */
export const puntiBune = (p: Rand): boolean => intregInMargini(p.numarPunti, MARGINI_OPERATIE.urechi) && inMargini(p.latimePunti, MARGINI_OPERATIE.latimeUreche)
  && inMargini(p.grosimePunti, MARGINI_OPERATIE.grosimeUreche);

export function bandaBuna(p: Rand): { readonly latime: boolean; readonly placa: boolean; readonly punti: boolean; readonly freza: boolean } {
  const v = bandaRand(p);
  const latime = p.latimeBanda.trim() === '' || (inMargini(p.latimeBanda, MARGINI_OPERATIE.latimeBanda)
    && (v?.minima == null || (citesteNumar(p.latimeBanda) ?? 0) >= v.minima - 1e-9));
  const placaScrisa = p.placaBanda.trim() === '' ? v?.placaImplicita ?? null : citesteNumar(p.placaBanda);
  const placa = !p.decupareBanda || ((p.placaBanda.trim() === '' || inMargini(p.placaBanda, MARGINI_OPERATIE.placaBanda))
    && (placaScrisa === null || v?.placaMinima == null || placaScrisa >= v.placaMinima - 1e-9));
  const punti = !p.decupareBanda || puntiBune(p);
  const freza = !p.decupareBanda || (p.frezaBanda ? intregInMargini(p.numarSculaBanda, MARGINI_OPERATIE.numarScula)
    && inMargini(p.diametruSculaBanda, MARGINI_OPERATIE.diametru) : p.fundPlat);
  return { latime, placa, punti, freza };
}

/**
 * Incrustația în V a rândului (ADR 0170, ADR 0172), cum o scrie Exportă: jocurile și marginea (fierăstrăul = jocul cu „același
 * spațiu”) și lemnul din jurul dopului; banda doar cu `jurDop: 'banda'` (pe fața coborâtă, câmpul pleacă), cu lățimea goală
 * nescrisă (cea mai mică, socotită de lucrare) și placa goală S + H + 1. Fără decupare, placa și punțile (cerute de document)
 * rămân cele scrise dacă sunt bune, altfel cele implicite; freza decupării, doar cu bifa ei și bună. Null fără bifă (un V-carve
 * obișnuit), undefined cu un câmp de necitit (rândul nu se scrie). Din ea se leagă și rândurile (lucrarea unește doar locașele
 * cu aceeași incrustație, `valoriVcarve`).
 */
export function incrustatieVRand(p: Rand): IncrustatieOperatie | null | undefined {
  if (!p.incrustatie) return null;
  const joc = citesteNumar(p.jocInc), fierastrau = p.acelasiSpatiu ? joc : citesteNumar(p.fierastrauInc), margine = citesteNumar(p.margineInc);
  if (joc === null || fierastrau === null || margine === null) return undefined;
  let banda: BandaOperatie | undefined;
  if (p.jurDop === 'banda') {
    const v = bandaRand(p), ok = bandaBuna(p);
    const latime = p.latimeBanda.trim() === '' ? undefined : citesteNumar(p.latimeBanda);
    const placa = p.placaBanda.trim() === '' || !ok.placa ? v?.placaImplicita ?? null : citesteNumar(p.placaBanda);
    const pn = ok.punti ? citesteNumar(p.numarPunti) : PUNTI_BANDA.numar, pl = ok.punti ? citesteNumar(p.latimePunti) : PUNTI_BANDA.latime;
    const pg = ok.punti ? citesteNumar(p.grosimePunti) : PUNTI_BANDA.grosime;
    const fn = p.frezaBanda && ok.freza ? citesteNumar(p.numarSculaBanda) : null, fd = p.frezaBanda && ok.freza ? citesteNumar(p.diametruSculaBanda) : null;
    if (latime === null || placa === null || pn === null || pl === null || pg === null) return undefined;
    banda = {
      ...(latime !== undefined ? { latime } : {}), decupare: p.decupareBanda, grosimePlaca: placa,
      ...(fn !== null && fd !== null ? { freza: { numar: fn, diametru: fd, origine: p.origineBanda } } : {}), punti: { numar: pn, latime: pl, grosime: pg },
    };
  }
  return { joc, fierastrau, margine, jurDop: p.jurDop, ...(banda ? { banda } : {}) };
}
/** Câte freze de rest are o listă (ADR 0093, plafonul documentului). */
export const MAXIM_REST = 8;
/**
 * O listă de freze de rest e bună dacă fiecare are numărul în margini, diametrul pozitiv și mai mic decât al celei dinainte
 * (prima: `dinainte`) și pasul lateral cel mult raza ei. Câte una, ca câmpul greșit să se vadă.
 */
export function restBun(lista: readonly RandRest[], dinainte: string): boolean[] {
  let d0 = citesteNumar(dinainte);
  return lista.map((r) => {
    const d = citesteNumar(r.diametru);
    const ok = intregInMargini(r.numar, MARGINI_OPERATIE.numarScula) && d0 !== null && d !== null && d > 0 && d < d0 && inMargini(r.pas, d / 2);
    d0 = d;
    return ok;
  });
}
/** Frezele de rest citite, sau null dacă una nu se poate citi. */
export function citesteRest(lista: readonly RandRest[]): FrezaRestOperatie[] | null {
  const rez: FrezaRestOperatie[] = [];
  for (const r of lista) {
    const numar = citesteNumar(r.numar), diametru = citesteNumar(r.diametru), pasLateral = citesteNumar(r.pas);
    if (numar === null || diametru === null || pasLateral === null) return null;
    rez.push({ numar, diametru, pasLateral, origine: r.origine ?? null });
  }
  return rez;
}

/** Valorile cu care pornește coborârea pe un rând care n-o avea (ADR 0076 §5): 3°, zigzagul de 20 mm, elicea cât raza frezei. */
export const UNGHI_COBORARE_IMPLICIT = 3;
export const LUNGIME_ZIGZAG_IMPLICITA = 20;
export const razaEliceImplicita = (diametru: number): number => Math.round(diametru * 5) / 10;
export const FELURI_COBORARE: ReadonlyArray<Coborare['fel']> = ['plonjare', 'rampa', 'zigzag', 'elice'];

/** Raza cu care pornește bifa intrărilor pe un rând care n-avea (ADR 0030 §1). */
export const INTRARI_IMPLICITE: IntrariOperatie = { raza: 3 };

/** Lungimea cu care pornește bifa rampei pe un rând care n-avea (ADR 0029 §1). */
export const RAMPA_IMPLICITA: RampaOperatie = { lungime: 10 };

/** Urechile cu care pornește bifa pe un rând care n-avea: cele ale plăcii 2 (ADR 0028 §1). */
export const URECHI_IMPLICITE: UrechiOperatie = { numar: 4, latime: 8, grosime: 2 };

/** Un întreg între 1 și plafon (câte urechi pe buclă). */
export function intregInMargini(s: string, plafon: number): boolean {
  const x = citesteNumar(s);
  return x !== null && Number.isInteger(x) && x >= 1 && x <= plafon;
}

/**
 * Câmpurile frezei unui rând care nu trec (constatarea 15 a auditului, felia 28.8↑j): numărul sculei, diametrul, unghiul V (doar
 * la freza în V). Fiecare își spune greșeala lui, pe câmpul lui; împreună, ele sunt verdictul `scula`.
 */
export function campuriSculaGresite(
  p: Pick<Rand, 'numarScula' | 'diametruScula' | 'formaScula' | 'unghiV'> & Partial<Pick<Rand, 'razaColt'>>,
): ReadonlyArray<'numar' | 'diametru' | 'unghi' | 'raza'> {
  const rez: Array<'numar' | 'diametru' | 'unghi' | 'raza'> = [];
  if (!intregInMargini(p.numarScula, MARGINI_OPERATIE.numarScula)) rez.push('numar');
  if (!inMargini(p.diametruScula, MARGINI_OPERATIE.diametru)) rez.push('diametru');
  if (p.formaScula === 'v' && !inMargini(p.unghiV, MARGINI_OPERATIE.unghiV, MARGINI_OPERATIE.unghiVMinim)) rez.push('unghi');
  // Raza colțului toroidalei (ADR 0303 §1): în (0, Ø / 2), strict, ca la ușă (raza cât jumătatea diametrului e o bilă).
  if (p.formaScula === 'toroidala') {
    const r = citesteNumar(p.razaColt ?? ''), d = citesteNumar(p.diametruScula);
    if (r === null || !(r > 0) || (d !== null && !(r < d / 2))) rez.push('raza');
  }
  return rez;
}

/** Valorile de lucru scrise de mână pe freza unui rând (ADR 0291 §3, felia 28.8↑p), ca text: gol = valoarea implicită. */
export type RegimRand = { readonly turatie: string; readonly avans: string; readonly plonjare: string };
export const REGIM_GOL: RegimRand = { turatie: '', avans: '', plonjare: '' };
const gol = (s: string): boolean => s.trim() === '';

/**
 * Câmpurile greșite ale valorilor de lucru scrise de mână, ca la ușa documentului (v27): turația un întreg între 1 și plafon,
 * avansul și plonjarea peste 0, cel mult plafonul. Un câmp gol nu e greșit: ia valoarea implicită a lucrării.
 */
export function campuriRegimGresite(r: RegimRand): ReadonlyArray<'turatie' | 'avans' | 'plonjare'> {
  const max = MARGINI_OPERATIE.regimFreza, rez: Array<'turatie' | 'avans' | 'plonjare'> = [];
  if (!gol(r.turatie) && !intregInMargini(r.turatie, max)) rez.push('turatie');
  if (!gol(r.avans) && !inMargini(r.avans, max)) rez.push('avans');
  if (!gol(r.plonjare) && !inMargini(r.plonjare, max)) rez.push('plonjare');
  return rez;
}

/**
 * Valorile de lucru de scris pe freză (`scula.regim`): `null` fără niciuna scrisă (programul de azi); altfel toate trei, cele
 * goale cu valorile implicite ale lucrării (18 000 rot/min, 1 000 și 300 mm/min); `undefined` cu un câmp greșit.
 */
export function regimDinRand(r: RegimRand): ValoriLucru | null | undefined {
  if (gol(r.turatie) && gol(r.avans) && gol(r.plonjare)) return null;
  if (campuriRegimGresite(r).length > 0) return undefined;
  const x = (s: string, implicit: number): number => (gol(s) ? implicit : citesteNumar(s) ?? implicit);
  return { turatie: x(r.turatie, TURATIE_IMPLICITA), avans: x(r.avans, AVANS_IMPLICIT), plonjare: x(r.plonjare, PLONJARE_IMPLICITA) };
}

/**
 * Z-ul sigur și parcarea de la final (ADR 0291 §3, felia 28.8↑p), cum le ține aplicația, ca text: setări ale ei, de la o
 * fereastră la alta, ca supracursa. `parcare`: rămâne deasupra ultimei tăieturi, merge la XY0 sau la punctul (x, y), față de
 * XY0, în coordonatele programului.
 */
export type SetariAer = { readonly zSigur: string; readonly parcare: 'nu' | 'origine' | 'punct'; readonly x: string; readonly y: string };
export const AER_IMPLICIT: SetariAer = { zSigur: String(Z_SIGUR_IMPLICIT), parcare: 'nu', x: '0', y: '0' };

/** Câmpurile greșite ale Z-ului sigur și ale parcării (X și Y doar pentru un punct ales). */
export function campuriAerGresite(a: SetariAer): ReadonlyArray<'z-sigur' | 'parcare-x' | 'parcare-y'> {
  const rez: Array<'z-sigur' | 'parcare-x' | 'parcare-y'> = [];
  const z = citesteNumar(a.zSigur);
  if (z === null || !zSigurBun(z)) rez.push('z-sigur');
  if (a.parcare === 'punct') {
    const x = citesteNumar(a.x, true), y = citesteNumar(a.y, true);
    if (x === null || !parcareBuna({ x, y: 0 })) rez.push('parcare-x');
    if (y === null || !parcareBuna({ x: 0, y })) rez.push('parcare-y');
  }
  return rez;
}

/**
 * Ce trimite fereastra exportului (`ParametriExport`) din Z-ul sigur și parcare: Z-ul sigur doar când nu e cel implicit, iar
 * parcarea doar când e aleasă (la XY0, punctul (0, 0)), ca exportul fără ele să rămână cererea de dinainte. Cu un câmp greșit,
 * null (Exportă e oprit).
 */
export function parametriAer(a: SetariAer): Pick<ParametriExport, 'zSigur' | 'parcare'> | null {
  if (campuriAerGresite(a).length > 0) return null;
  const z = citesteNumar(a.zSigur) ?? Z_SIGUR_IMPLICIT;
  const parcare = a.parcare === 'origine' ? { x: 0, y: 0 }
    : a.parcare === 'punct' ? { x: citesteNumar(a.x, true) ?? 0, y: citesteNumar(a.y, true) ?? 0 } : undefined;
  return { ...(z !== Z_SIGUR_IMPLICIT ? { zSigur: z } : {}), ...(parcare ? { parcare } : {}) };
}

export const SENSURI: readonly Sens[] = ['urcare', 'opozitie'];
export const CHEI_SENS: Readonly<Record<Sens, CheieSimpla>> = { urcare: 'export.sens.urcare', opozitie: 'export.sens.opozitie' };
