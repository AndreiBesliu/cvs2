/**
 * Documentul (T16, ADR 0016), din v10: varianta D a planșelor (ADR 0024, decizia owner-ului din 08.10.2026), adică piese cu
 * arbore propriu, puse ca instanțe pe foi, plus operațiile piesei (ADR 0025): profilul stă în piesă și se taie la fel în
 * fiecare instanță, în sensul de tăiere al operației (ADR 0027, v4), cu urechile (ADR 0028, v5), rampa (ADR 0029, v6) și
 * intrările ei (ADR 0030, v7) și degajările colțurilor (ADR 0032, v8). Forma „cale” (ADR 0034, v9) e un contur din linii,
 * arce și cubice, închis sau, din v10, deschis (ADR 0037 §2); profilul are și laturile `stanga` / `dreapta` și marcajul
 * `despartire`. Contractul întreg e în ADR-uri; oracolul independent (`test/oracles/document.ts`) îl citește de acolo, nu
 * de aici.
 *
 * Schemele (valibot), cu judecata de ansamblu a ușii, stau în `schemaDocument.ts`: aici rămân tipurile, plafoanele și
 * numărătoarea, pe care le folosește și pachetul de pornire.
 *
 * Câmpurile necunoscute se păstrează, ca un document scris de o versiune mai nouă să nu piardă date trecând printr-una
 * mai veche. Un câmp nou CU SENS (fața de jos, montajele, sculele) intră doar cu o schemă nouă și o migrare: o versiune
 * veche n-are voie să taie fără să înțeleagă un câmp.
 */
export const VERSIUNE_SCHEMA = 18;

/** Plafoanele stau pe artefact (T23): un document care le trece e refuzat la ușă, nu tăiat. */
export const PLAFON = {
  latura: 10_000,
  grosime: 1_000,
  noduri: 100_000,
  instante: 100_000,
  foi: 1_000,
  adancime: 32,
  idLungime: 64,
  numeLungime: 200,
  campuri: 200,
  campCheie: 200,
  campLungime: 10_000,
  /** Imbricarea întregului JSON, cu câmpurile necunoscute: JSON-ul canonic și clonarea rămân departe de stivă. */
  imbricareJson: 200,
  /** Cât de departe poate sta ceva de originea foii, în mm (instanța și translația compusă din piesă). */
  translatie: 10_000_000,
  /** Scara compusă a unui nod din piesă, pe fiecare coeficient al matricei. */
  scara: 10_000,
  /**
   * Elementele în lume ale tuturor foilor: instanțele înmulțite cu elementele pieselor lor. Cât plafonul de elemente din
   * v1: pânza, CAM-ul, avertismentele și lista sunt liniare în ele.
   */
  elementeLume: 100_000,
  /** Operațiile tuturor pieselor. */
  operatii: 100_000,
  /** Nodurile pe care le referă o singură operație. */
  noduriOperatie: 10_000,
  /** Tăieturile în lume: peste instanțele tuturor foilor, referințele din operațiile piesei lor (ADR 0025). */
  taieturi: 100_000,
  /** Numărul sculei, cum îl scrie postul (`T<n>`). */
  numarScula: 999,
  /** Diametrul sculei, în mm. */
  diametruScula: 100,
  /** Frezele de rest ale unui buzunar sau ale unui fund plat (ADR 0093). */
  freziRest: 8,
  /** Adâncimea și pasul unei operații, în mm (cât grosimea maximă a unei foi). */
  adancimeOperatie: 1_000,
  /** Urechile pe o buclă a traseului (ADR 0028). */
  urechi: 100,
  /** Vârfurile unei căi (ADR 0034). */
  varfuriCale: 50_000,
  /** Vârfurile tuturor căilor pieselor. */
  varfuri: 200_000,
  /** Vârfurile căilor în lume: instanțele înmulțite cu vârfurile căilor piesei lor. Pânza, CAM-ul și clicul sunt liniare în ele. */
  varfuriLume: 1_000_000,
  /** Ghidajele unei foi (ADR 0050). */
  ghidaje: 1_000,
} as const;

export type Matrice = { a: number; b: number; c: number; d: number; e: number; f: number };
export type PunctDoc = { x: number; y: number; [cheie: string]: unknown };
/** Segmentul care pleacă dintr-un vârf al căii (ADR 0001): linie, arc (`bulge` = tan(baleiaj / 4)) sau cubică. */
export type SegmentDoc =
  | { tip: 'L'; [cheie: string]: unknown }
  | { tip: 'A'; bulge: number; [cheie: string]: unknown }
  | { tip: 'C'; c1: PunctDoc; c2: PunctDoc; [cheie: string]: unknown };
export type VarfDoc = { p: PunctDoc; s: SegmentDoc; [cheie: string]: unknown };
export type FormaDoc =
  | { tip: 'dreptunghi'; latime: number; inaltime: number; razaColt: number; [cheie: string]: unknown }
  | { tip: 'cerc'; raza: number; [cheie: string]: unknown }
  /**
   * Calea (ADR 0034, ADR 0037 §2): închisă, cu n segmente, sau deschisă, cu n − 1 (ADR 0001): segmentul ultimului vârf al
   * unei căi deschise e `L` și nu se ia în seamă.
   */
  | { tip: 'cale'; inchis: boolean; varfuri: VarfDoc[]; [cheie: string]: unknown };
export type ElementNod = {
  tip: 'element'; id: string; nume?: string; forma: FormaDoc; matrice: Matrice; [cheie: string]: unknown;
};
export type GrupNod = { tip: 'grup'; id: string; nume?: string; matrice: Matrice; copii: Nod[]; [cheie: string]: unknown };
export type Nod = ElementNod | GrupNod;
/**
 * Forma frezei (ADR 0090, documentul v14): lipsă = freza plată (ca până în v13); `v` = freza în V, cu unghiul inclus, în
 * grade, în [`UNGHI_V_MINIM`, `UNGHI_V_MAXIM`]. Diametrul e cel al părții tăietoare (cât lasă V-ul la suprafață, cel mult).
 * `varf` (ADR 0092, documentul v16): diametrul vârfului plat al unei freze de gravare (conul trunchiat), în mm; lipsă = vârful
 * ascuțit. Potrivirea lui cu diametrul o judecă lucrarea.
 */
export type FormaSculaDoc = { tip: 'v'; unghi: number; varf?: number; [cheie: string]: unknown };
export type Scula = { numar: number; nume: string; diametru: number; forma?: FormaSculaDoc; [cheie: string]: unknown };
export const UNGHI_V_MINIM = 1;
export const UNGHI_V_MAXIM = 179;
/** Unghiul implicit al frezei în V (ADR 0090), în grade: în fereastra exportului și la rolul V-carve din panou (ADR 0112). */
export const UNGHI_V_IMPLICIT = 60;
/** Pasul lateral cu care pornește un buzunar nou: 40 % din diametrul frezei (ADR 0069 §1), la 0,1 mm. */
export const pasLateralImplicit = (diametru: number): number => Math.round(diametru * 4) / 10;
/**
 * Latura profilului: exterior / interior pe contururile închise, pe linie pe oricare, stânga / dreapta (partea FREZEI, în
 * sensul desenului, ADR 0037 §3) pe căile deschise. Potrivirea cu `inchis` o judecă CAM-ul, nu ușa (ADR 0037 §2).
 */
export type Latura = 'exterior' | 'interior' | 'pe-linie' | 'stanga' | 'dreapta';
/** Sensul de tăiere (ADR 0027), cu axul M3: urcare = materialul păstrat în dreapta sensului de mers. */
export type Sens = 'urcare' | 'opozitie';
/**
 * Direcția unei tăieturi pe linie (ADR 0092, documentul v16): `invers` = în sens opus desenului; `scurt` = o cale deschisă
 * pornește din capătul mai apropiat de unde a rămas freza. Lipsă = în sensul desenului (ca până în v15).
 */
export type Directie = 'invers' | 'scurt';
/**
 * Urechile unei operații de profil (ADR 0028): câte pe fiecare buclă, lungimea palierului pe traseul centrului frezei și
 * grosimea punții de la fața de jos a foii, în mm.
 */
export type Urechi = { numar: number; latime: number; grosime: number; [cheie: string]: unknown };
/** Rampa unei operații de profil (ADR 0029): lungimea în plan, de-a lungul buclei, pe care freza coboară o trecere (mm). */
export type Rampa = { lungime: number; [cheie: string]: unknown };
/** Intrările și ieșirile unei operații de profil (ADR 0030): raza sfertului de cerc, pe traseul centrului frezei (mm). */
export type Intrari = { raza: number; [cheie: string]: unknown };
/** Degajările colțurilor unei operații de profil (ADR 0032): dog-bone pe bisectoare sau T-bone în peretele mai lung. */
export type Colturi = { tip: 'dog-bone' | 't-bone'; [cheie: string]: unknown };
/**
 * `despartire` (ADR 0037 §2, §8, decizia owner-ului din 13.10): tăietura deschisă prin toată foaia care desparte foaia,
 * marcată de om; se taie la urmă. Lipsă = nemarcată: aplicația n-o ghicește.
 */
export type Operatie = {
  id: string; tip: TipOperatie; noduri: string[]; scula: Scula; latura: Latura; sens: Sens; adancime: number; pas: number;
  urechi: Urechi | null; rampa: Rampa | null; intrari: Intrari | null; colturi: Colturi | null; despartire?: boolean;
  /** Pe un buzunar (ADR 0069), distanța dintre inele, în mm; un profil n-o are (ușa o cere doar pe buzunar). */
  pasLateral?: number;
  /** Pe un buzunar (ADR 0076, documentul v12), cum coboară freza în material; lipsă = plonjarea dreaptă (ca în v11). */
  coborare?: Coborare;
  /**
   * Pe o găurire (ADR 0087, documentul v13), la al câtelea pas freza iese din gaură, la Z-ul de siguranță (între, se retrage
   * `RETRAGERE_PARTIALA` mm, cât să rupă așchia); lipsă = 1, la fiecare pas.
   */
  retragereCompleta?: number;
  /** Pe un V-carve (ADR 0091, documentul v15), freza dreaptă care scoate fundul plat; lipsă = fundul rămâne (ca în v14). */
  fundPlat?: FundPlat;
  /** Pe o tăietură pe linie (ADR 0092, documentul v16), direcția ei; lipsă = în sensul desenului. */
  directie?: Directie;
  /**
   * Pe un buzunar (ADR 0093, documentul v17), frezele de rest, după freza operației: fiecare mai mică decât cea dinainte,
   * doar unde aceea n-a ajuns (colțuri, fâșii înguste). Lipsă = una singură (ca în v16).
   */
  rest?: FrezaRest[];
  /**
   * Pe un buzunar (ADR 0094, documentul v18), strategia: `paralel` = linii paralele la `unghi` grade față de X, în [0, 180), cu
   * trecerea de profil pe margine. Lipsă = inelele paralele cu conturul (ca în v17).
   */
  strategie?: StrategieBuzunar;
  [cheie: string]: unknown;
};
export type StrategieBuzunar = { fel: 'paralel'; unghi: number; [cheie: string]: unknown };
/**
 * O freză de rest (ADR 0093): plată, cu distanța dintre inelele ei, în mm (cel mult raza ei). Potrivirea (mai mică decât
 * freza dinainte, plată, alt număr) o judecă lucrarea.
 */
export type FrezaRest = { scula: Scula; pasLateral: number; [cheie: string]: unknown };
/**
 * Fundul plat al unui V-carve (ADR 0091): freza dreaptă (plată; numărul ei e al altei freze decât V-ul) și distanța dintre
 * inelele ei, în mm (cel mult raza ei). Potrivirea o judecă lucrarea.
 */
export type FundPlat = { scula: Scula; pasLateral: number; rest?: FrezaRest[]; [cheie: string]: unknown };
/**
 * Coborârea în buzunar (ADR 0076): `plonjare` (dreaptă, ca până în v11), `rampa` (de-a lungul primului inel, cu `unghi`
 * grade față de orizontală), `zigzag` (dus-întors pe primii `lungime` mm ai inelului, cu panta cel mult `unghi`) sau `elice`
 * (pe un cerc de rază `raza` mm, cu `unghi`). Unghiul e în (0, 45]; potrivirea cu buzunarul o judecă lucrarea.
 */
export type Coborare =
  | { fel: 'plonjare'; [cheie: string]: unknown }
  | { fel: 'rampa'; unghi: number; [cheie: string]: unknown }
  | { fel: 'zigzag'; unghi: number; lungime: number; [cheie: string]: unknown }
  | { fel: 'elice'; unghi: number; raza: number; [cheie: string]: unknown };
/** Unghiul cel mai mare al rampei, al zigzagului și al elicei, în grade. */
export const UNGHI_COBORARE_MAXIM = 45;
/**
 * Pragurile de jos ale coborârii (ADR 0076 §1), judecate de lucrare și de dialog: unghiul (grade; sub el, drumul de coborâre
 * ajunge de sute de ori lungimea buclei), zigzagul (mm, ca rampa minimă a profilului, ADR 0029 §2), raza elicei (mm; mai mică,
 * e o plonjare cu alt nume).
 */
export const COBORARE_MINIME = { unghi: 0.5, lungime: 1, raza: 0.5 } as const;
/**
 * Felul operației (ADR 0069, documentul v11): `profil` taie conturul; `buzunar` scoate materialul dinăuntrul unui contur
 * închis, până la adâncime, în inele paralele cu conturul, la `pasLateral` mm unul de altul (cel mult raza frezei). Pe un
 * buzunar, latura e `interior` (freza stă înăuntru), iar urechile, rampa, intrările, degajările și despărțirea nu există.
 * `gaurire` (ADR 0087, documentul v13) găurește un cerc: în pași, în centru, dacă cercul e cât freza; în elice, pe perete,
 * dacă e mai mare (cel mult de două ori freza). Ca pe buzunar, latura e `interior`, iar ce e al profilului nu există.
 * `vcarve` (ADR 0090, documentul v14) sapă regiunea contururilor închise (par-impar) cu freza în V, pe axa ei medială, până
 * la adâncimea operației (cea maximă); latura e `interior`, ce e al profilului nu există, iar freza trebuie să fie în V.
 */
export type TipOperatie = 'profil' | 'buzunar' | 'gaurire' | 'vcarve';
/** Cel mai mare număr de pași dintre două ieșiri complete ale găuririi (ADR 0087). */
export const RETRAGERE_COMPLETA_MAXIMA = 100;
export type Piesa = { id: string; nume?: string; radacina: Nod; operatii: Operatie[]; [cheie: string]: unknown };
export type Stoc = { latime: number; inaltime: number; grosime: number; [cheie: string]: unknown };
export type Instanta = {
  id: string; piesa: string; x: number; y: number; rotire: number; campuri?: Record<string, string>; [cheie: string]: unknown;
};
/**
 * Un ghidaj al foii (ADR 0050): linia verticală `x = poz` (axa `x`) sau orizontală `y = poz` (axa `y`), în mm ai foii. Nu
 * schimbă nimic din ce se taie, deci a intrat fără schemă nouă: o versiune care nu-l știe îl păstrează necunoscut.
 */
export type Ghidaj = { id: string; axa: 'x' | 'y'; poz: number; [cheie: string]: unknown };
export type Foaie = { id: string; nume?: string; stoc: Stoc; instante: Instanta[]; ghidaje?: Ghidaj[]; [cheie: string]: unknown };
export type Document = { schema: 18; rev: number; piese: Piesa[]; foi: Foaie[]; [cheie: string]: unknown };

/** Nodurile unei piese, în preordine, cu adâncimea lor (rădăcina are 1). Iterativ: arborele poate fi adânc. */
export function noduriPiesa(radacina: Nod): Array<{ readonly nod: Nod; readonly adancime: number }> {
  const rez: Array<{ nod: Nod; adancime: number }> = [];
  const stiva: Array<{ nod: Nod; adancime: number }> = [{ nod: radacina, adancime: 1 }];
  while (stiva.length > 0) {
    const x = stiva.pop();
    if (!x) break;
    rez.push(x);
    if (x.nod.tip === 'grup') {
      for (let i = x.nod.copii.length - 1; i >= 0; i--) {
        const c = x.nod.copii[i];
        if (c) stiva.push({ nod: c, adancime: x.adancime + 1 });
      }
    }
  }
  return rez;
}

/** Forma e o cale deschisă (ADR 0037): fără coarda de închidere. */
export function esteCaleDeschisa(f: FormaDoc): boolean {
  return f.tip === 'cale' && !f.inchis;
}

export function areArce(f: FormaDoc): boolean {
  if (f.tip === 'cale') return f.varfuri.some((x) => x.s.tip === 'A');
  return f.tip === 'cerc' || f.razaColt > 0;
}

/** Cât ocupă documentul din plafoanele lui: nodurile, instanțele, elementele în lume și vârfurile căilor (ADR 0034). */
export type Numaratoare = {
  readonly noduri: number; readonly instante: number; readonly elementeLume: number; readonly operatii: number; readonly taieturi: number;
  readonly varfuri: number; readonly varfuriLume: number;
};

export function numara(d: Document): Numaratoare {
  const elementePiesa = new Map<string, number>();
  const referintePiesa = new Map<string, number>();
  const varfuriPiesa = new Map<string, number>();
  let noduri = 0;
  let operatii = 0;
  let varfuri = 0;
  for (const p of d.piese) {
    let elemente = 0;
    let varfuriP = 0;
    for (const { nod } of noduriPiesa(p.radacina)) {
      noduri++;
      if (nod.tip === 'element') {
        elemente++;
        if (nod.forma.tip === 'cale') varfuriP += nod.forma.varfuri.length;
      }
    }
    elementePiesa.set(p.id, elemente);
    varfuriPiesa.set(p.id, varfuriP);
    varfuri += varfuriP;
    operatii += p.operatii.length;
    referintePiesa.set(p.id, p.operatii.reduce((s, o) => s + o.noduri.length, 0));
  }
  let instante = 0;
  let elementeLume = 0;
  let taieturi = 0;
  let varfuriLume = 0;
  for (const f of d.foi) {
    for (const i of f.instante) {
      instante++;
      elementeLume += elementePiesa.get(i.piesa) ?? 0;
      taieturi += referintePiesa.get(i.piesa) ?? 0;
      varfuriLume += varfuriPiesa.get(i.piesa) ?? 0;
    }
  }
  return { noduri, instante, elementeLume, operatii, taieturi, varfuri, varfuriLume };
}

/**
 * Primul plafon de ansamblu depășit, cu motivul, sau null. Un singur adevăr pentru ușă (documentul încărcat) și pentru
 * acțiuni (documentul care ar rezulta): ce adaugă interfața trebuie să se poată redeschide.
 */
export function plafonDepasit(n: Numaratoare): string | null {
  if (n.noduri > PLAFON.noduri) return `documentul are ${n.noduri} de noduri, peste ${PLAFON.noduri}`;
  if (n.operatii > PLAFON.operatii) return `documentul are ${n.operatii} de operații, peste ${PLAFON.operatii}`;
  if (n.instante > PLAFON.instante) return `documentul are ${n.instante} de instanțe, peste ${PLAFON.instante}`;
  if (n.elementeLume > PLAFON.elementeLume) return `foile au ${n.elementeLume} de elemente în lume, peste ${PLAFON.elementeLume}`;
  if (n.taieturi > PLAFON.taieturi) return `foile au ${n.taieturi} de tăieturi în lume, peste ${PLAFON.taieturi}`;
  if (n.varfuri > PLAFON.varfuri) return `căile pieselor au ${n.varfuri} de vârfuri, peste ${PLAFON.varfuri}`;
  if (n.varfuriLume > PLAFON.varfuriLume) return `foile au ${n.varfuriLume} de vârfuri de căi în lume, peste ${PLAFON.varfuriLume}`;
  return null;
}

/** Instanța ar sta prea departe de originea foii: același prag la ușă și la acțiunile care mută sau copiază. */
export function instantaPreaDeparte(x: number, y: number): boolean {
  return !(Math.max(Math.abs(x), Math.abs(y)) <= PLAFON.translatie);
}

/**
 * Operația implicită a unei forme noi (Adaugă): profilul cu care se taie placa 1 — cercul e o gaură (interior, 8 mm în
 * 2 treceri), dreptunghiul o insulă (exterior, 3 mm), cu freza plată Ø6, în urcare, fără urechi, rampă sau intrări. Calea
 * o primește pe a dreptunghiului (ADR 0034 §7). Migrarea v2 → v3 are propria copie, înghețată.
 */
export function operatieImplicita(nod: string, forma: FormaDoc, scula: Operatie['scula'] = { numar: 1, nume: 'freza plata', diametru: 6 }): Operatie {
  return forma.tip === 'cerc'
    ? { id: nod, tip: 'profil', noduri: [nod], scula, latura: 'interior', sens: 'urcare', adancime: 8, pas: 4, urechi: null, rampa: null, intrari: null, colturi: null }
    : { id: nod, tip: 'profil', noduri: [nod], scula, latura: 'exterior', sens: 'urcare', adancime: 3, pas: 3, urechi: null, rampa: null, intrari: null, colturi: null };
}

/** Un document nou, gol, cu o foaie. */
export function documentNou(stoc: { latime: number; inaltime: number; grosime: number }): Document {
  return { schema: VERSIUNE_SCHEMA, rev: 0, piese: [], foi: [{ id: 'f1', stoc: { ...stoc }, instante: [] }] };
}
