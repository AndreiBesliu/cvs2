import '../i18n/export.ts';
import '../i18n/traseu.ts';
import { t, type CheieSimpla } from '../i18n/t.ts';
import {
  latimeMinimaBanda, MARGINI_OPERATIE, PUNTI_BANDA, SUB_FATA_DOPULUI, type Coborare, type Depasire, type IesireFoaie, type LaturaExport,
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
 * Freza unui rând (ADR 0084), cu forma ei (ADR 0090): lipsă = plată; `v` = freza în V, cu unghiul inclus și diametrul vârfului
 * plat (ADR 0092; lipsă = ascuțit).
 */
export type SculaOperatie = {
  readonly numar: number; readonly diametru: number; readonly forma?: { readonly tip: 'v'; readonly unghi: number; readonly varf?: number };
  /**
   * Freza din „Frezele mele” a rândului (ADR 0300 §4, felia 16.A↑b-3a): numele, originea, valorile de lucru și tăișul ei, scrise
   * de Exportă lângă T, Ø și formă; `null` = scrisă de mână (originea pleacă din document); lipsă = rămâne cea din document.
   */
  readonly origine?: OrigineFreza | null;
};
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

/** Aceeași freză montată: aceeași formă (unghiul, vârful), același diametru și, unde amândouă o știu, aceeași turație. */
function aceeasiFrezaRand(a: FrezaRand, b: FrezaRand): boolean {
  const egal = (x: number, y: number): boolean => Math.abs(x - y) < 1e-9;
  const formaEgala = a.forma === undefined || b.forma === undefined ? a.forma === b.forma
    : egal(a.forma.unghi, b.forma.unghi) && egal(a.forma.varf ?? 0, b.forma.varf ?? 0);
  return formaEgala && egal(a.diametru, b.diametru) && (a.turatie === undefined || b.turatie === undefined || a.turatie === b.turatie);
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
  readonly freza?: { readonly numar: number; readonly diametru: number };
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
/** O freză de rest (ADR 0093): numărul (T), diametrul și distanța dintre inele (mm). */
export type FrezaRestOperatie = { readonly numar: number; readonly diametru: number; readonly pasLateral: number };
/** Freza dreaptă a fundului plat (ADR 0091): numărul (T), diametrul și distanța dintre inele (mm), cu frezele ei de rest. */
export type FundPlatOperatie = {
  readonly numar: number; readonly diametru: number; readonly pasLateral: number; readonly rest?: readonly FrezaRestOperatie[];
};

/**
 * Un rând: o operație a unei piese (ADR 0025), cu cheia `<piesă>/<operație>`. `deschise`: câte din nodurile ei sunt căi
 * deschise (ADR 0037 §12): coloanele oferă doar ce nu refuză exportul.
 */
export type OperatieExport = {
  readonly cheie: string; readonly descriere: string; readonly deschise: number; readonly noduri: number; readonly valori: ValoriOperatie;
  /** Toate nodurile operației sunt cercuri: rândul oferă și găurirea (ADR 0087). */
  readonly cercuri?: boolean;
  /** Locul operației în ordinea de mână (ADR 0133), dacă documentul îl are. */
  readonly rang?: number;
  /** Rândurile altor piese din interiorul formelor ei (ADR 0133 §3, `cuprinse`): riscul unui exterior tăiat înaintea lor. */
  readonly inauntru?: readonly string[];
};

/**
 * Ce trimite dialogul la Exportă: montajul, postul, valorile operațiilor cu frezele lor (se scriu în document), confirmarea și
 * ordinea tăierii (ADR 0133 §3): cheile rândurilor în ordinea omului, sau null pentru ordinea automată.
 */
export type CerereExport = ParametriExport & { readonly valori: ReadonlyMap<string, ValoriOperatie>; readonly ordine: readonly string[] | null };

/**
 * Ultimul rezultat: liniile și SHA-256 cu rezumatul jobului (ADR 0046), motivul, sau ieșirea din foaie care așteaptă
 * confirmarea omului.
 */
export type StareExport =
  | {
    readonly ok: true; readonly linii: number; readonly sha256: string; readonly avertismente: readonly string[];
    /** Cu fișiere separate pe sculă (ADR 0084): fiecare fișier descărcat, cu liniile și amprenta lui. */
    readonly fisiere?: readonly { readonly nume: string; readonly linii: number; readonly sha256: string }[];
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

/**
 * Rezervă înălțimea casetei explicației fiecărui grup: cel mai lung dintre textul grupului și titlurile câmpurilor lui, măsurat
 * pe o copie goală a casetei (textul ei rămâne al lui React). Se măsoară din nou doar când se schimbă textele sau lățimea.
 */
export function rezervaExplicatii(panou: HTMLElement | null): void {
  for (const g of panou?.querySelectorAll<HTMLElement>('[data-grup]') ?? []) {
    const e = g.querySelector<HTMLElement>('[data-explicatie]');
    if (!e?.parentElement) continue;
    const texte = [e.dataset['implicit'] ?? '', ...Array.from(g.querySelectorAll('[title]'), (x) => x.getAttribute('title') ?? '')];
    const cheie = `${e.clientWidth}|${texte.join('\u0001')}`;
    if (e.dataset['masurat'] === cheie) continue;
    const m = e.cloneNode(false) as HTMLElement;
    m.removeAttribute('data-explicatie');
    m.setAttribute('aria-hidden', 'true');
    Object.assign(m.style, { position: 'absolute', visibility: 'hidden', minHeight: '0', width: `${e.getBoundingClientRect().width}px` });
    e.parentElement.append(m);
    let max = 0;
    for (const x of texte) { m.textContent = x; max = Math.max(max, m.getBoundingClientRect().height); }
    m.remove();
    e.style.minHeight = `${Math.ceil(max)}px`;
    e.dataset['masurat'] = cheie;
  }
}

export const COLTURI = ['stanga-jos', 'dreapta-jos', 'dreapta-sus', 'stanga-sus'] as const;
export const CHEI_COLT: Readonly<Record<(typeof COLTURI)[number], CheieSimpla>> = {
  'stanga-jos': 'export.colt.stanga-jos', 'dreapta-jos': 'export.colt.dreapta-jos',
  'dreapta-sus': 'export.colt.dreapta-sus', 'stanga-sus': 'export.colt.stanga-sus',
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
   * Freza din „Frezele mele” a rândului (ADR 0300 §4, felia 16.A↑b-3a): originea ei (din document sau aleasă în listă); `null` =
   * scrisă de mână. Un diametru sau o formă schimbate de mână o scot.
   */
  readonly origineScula: OrigineFreza | null;
  /** Forma frezei (ADR 0090), unghiul V și diametrul vârfului plat (ADR 0092; 0 = ascuțit), ca text. */
  readonly formaScula: 'plata' | 'v'; readonly unghiV: string; readonly varfV: string;
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
  readonly restDop: readonly RandRest[];
};
/** O freză de rest pe rândul ei, ca text: numărul, diametrul și pasul lateral. */
/** Verdictul câmpurilor unui rând: fiecare grup de valori, bun sau nu (o valoare greșită oprește exportul și se spune în grupul ei). */
export type BunRand = {
  readonly scula: boolean; readonly adancime: boolean; readonly pas: boolean; readonly numar: boolean; readonly latime: boolean; readonly grosime: boolean;
  readonly rampa: boolean; readonly intrari: boolean; readonly pasLateral: boolean; readonly coborare: boolean; readonly retragere: boolean;
  readonly vcarve: boolean; readonly fund: boolean; readonly varf: boolean; readonly vPeLinie: boolean; readonly rest: boolean; readonly strategie: boolean;
  readonly incrustatie: boolean; readonly dreapta: boolean; readonly frezaDop: boolean; readonly banda: boolean; readonly puntiDop: boolean;
};

export type RandRest = { readonly numar: string; readonly diametru: string; readonly pas: string };

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
      ...(fn !== null && fd !== null ? { freza: { numar: fn, diametru: fd } } : {}), punti: { numar: pn, latime: pl, grosime: pg },
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
    rez.push({ numar, diametru, pasLateral });
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

export const SENSURI: readonly Sens[] = ['urcare', 'opozitie'];
export const CHEI_SENS: Readonly<Record<Sens, CheieSimpla>> = { urcare: 'export.sens.urcare', opozitie: 'export.sens.opozitie' };
