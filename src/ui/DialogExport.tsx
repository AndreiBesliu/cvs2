import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import '../i18n/export.ts';
// Durata în cuvinte (`durata.*`) stă în dicționarul traseului, comun cu cipul timpului de lângă traseu (ADR 0046 §8).
import '../i18n/traseu.ts';
import { t, type CheieSimpla } from '../i18n/t.ts';
import type { Limba } from '../i18n/tipuri.ts';
import {
  laturiOferite, MARGINI_OPERATIE, POSTURI_EXPORT, type Coborare, type Depasire, type IdContract, type IesireFoaie, type LaturaExport,
  type ParametriExport, type RezumatJob, type SimulareExport, type StrategieScula, type TimpPortiune, type Unitati,
} from './actiuniExportTipuri.ts';
import { durata } from './durata.ts';
import { citesteNumar, textNumar } from './numar.ts';
import { PrevizualizareSimulare } from './PrevizualizareSimulare.tsx';
import { useLimba } from './useLimba.ts';

type Latura = LaturaExport;
/** Sensul de tăiere (ADR 0027): urcare = materialul păstrat în dreapta sensului de mers, cu axul M3. */
type Sens = 'urcare' | 'opozitie';
/** Direcția tăieturii pe linie (ADR 0092 §4): invers, sau cel mai scurt drum; lipsă = ca desenul. */
export type DirectieOperatie = 'invers' | 'scurt';
/** Urechile (ADR 0028): câte pe buclă, lungimea palierului pe traseul frezei, grosimea punții de la fața de jos (mm). */
export type UrechiOperatie = { readonly numar: number; readonly latime: number; readonly grosime: number };
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
};
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
};

/** Ce trimite dialogul la Exportă: montajul, postul, valorile operațiilor cu frezele lor (se scriu în document) și confirmarea. */
export type CerereExport = ParametriExport & { readonly valori: ReadonlyMap<string, ValoriOperatie> };

/**
 * Ultimul rezultat: liniile și SHA-256 cu rezumatul jobului (ADR 0046), motivul, sau ieșirea din foaie care așteaptă
 * confirmarea omului.
 */
export type StareExport =
  | {
    readonly ok: true; readonly linii: number; readonly sha256: string; readonly avertismente: readonly string[];
    /** Cu fișiere separate pe sculă (ADR 0084): fiecare fișier descărcat, cu liniile și amprenta lui. */
    readonly fisiere?: readonly { readonly nume: string; readonly linii: number; readonly sha256: string }[];
    /** `calcul`: simularea rulează (după descărcare); apoi rezultatul ei. */
    readonly rezumat: RezumatJob; readonly simulare: SimulareExport | 'calcul';
  }
  | { readonly ok: false; readonly motiv: string; readonly cereConfirmare?: IesireFoaie };

type Props = {
  readonly operatii: readonly OperatieExport[];
  /**
   * Crește cu fiecare document venit din bază (o versiune a altei file, preluarea scrierii). Valorile operațiilor îl
   * urmează; montajul ales (colțul, Z0) rămâne.
   */
  readonly baza: number;
  /** Descrierea fiecărui element în lume (`<instanță>/<element>`), pentru locul unde freza iese din foaie. */
  readonly descrieri: ReadonlyMap<string, string>;
  /** Fila doar citește: operațiile nu se pot schimba, exportul merge pe cele din document. */
  readonly doarCitire: boolean;
  readonly onExporta: (p: CerereExport) => void;
  readonly onInchide: () => void;
  /** Un parametru s-a schimbat: rezultatul vechi (și ieșirea confirmată odată cu el) nu mai e al lor. */
  readonly onReseteaza: () => void;
  readonly stare: StareExport | null;
  /**
   * Răspunsul la `$$` lipit de om (ADR 0046 §5, §8): îl ține aplicația, cât e deschisă pagina, ca traseul și exportul să
   * estimeze pe același profil. Nu se salvează: din etapa 3, senderul îl citește direct de la mașină.
   */
  readonly setariMasina: string;
  readonly onSetariMasina: (text: string) => void;
};

const LATURI_FOAIE: ReadonlyArray<readonly [keyof Depasire, CheieSimpla]> = [
  ['stanga', 'export.iesire.stanga'], ['dreapta', 'export.iesire.dreapta'], ['jos', 'export.iesire.jos'], ['sus', 'export.iesire.sus'],
];

/**
 * Laturile pe care freza iese din foaie, cu cât, în cuvinte. Cu 3 zecimale, ca în antet, dar scrise după limbă: în română
 * punctul ar citi „26.000 mm” ca douăzeci și șase de mii.
 */
function laturi(d: Depasire, limba: string): string {
  const f = new Intl.NumberFormat(limba === 'ro' ? 'ro-RO' : 'en-GB', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  return LATURI_FOAIE.filter(([k]) => d[k] > 0).map(([k, cheie]) => t(cheie, { mm: f.format(d[k]) })).join(', ');
}

const COLTURI = ['stanga-jos', 'dreapta-jos', 'dreapta-sus', 'stanga-sus'] as const;
const CHEI_COLT: Readonly<Record<(typeof COLTURI)[number], CheieSimpla>> = {
  'stanga-jos': 'export.colt.stanga-jos', 'dreapta-jos': 'export.colt.dreapta-jos',
  'dreapta-sus': 'export.colt.dreapta-sus', 'stanga-sus': 'export.colt.stanga-sus',
};
const CHEI_LATURA: Readonly<Record<Latura | 'buzunar', CheieSimpla>> = {
  exterior: 'export.latura.exterior', interior: 'export.latura.interior', 'pe-linie': 'export.latura.pe-linie',
  stanga: 'export.latura.stanga', dreapta: 'export.latura.dreapta', buzunar: 'export.latura.buzunar',
};

/** Pasul lateral cu care pornește un buzunar nou: 40 % din diametrul frezei (ADR 0069 §1), la 0,1 mm. */
export const pasLateralImplicit = (diametru: number): number => Math.round(diametru * 4) / 10;

/** În (0, plafon]: marginile schemei v3, ca operațiile scrise în document să treacă de ușă la redeschidere. */
function inMargini(s: string, plafon: number, minim = 0): boolean {
  const x = citesteNumar(s);
  return x !== null && Number.isFinite(x) && x > 0 && x >= minim && x <= plafon;
}

/** Unghiul implicit al frezei în V (ADR 0090), în grade. */
const UNGHI_V_IMPLICIT = 60;
/** Diametrul implicit al frezei drepte a fundului plat (ADR 0091 §4), în mm (1/8″). */
const DIAMETRU_FUND_IMPLICIT = 3.175;

/** Urechile pornite sau nu; câmpurile lor rămân scrise și cu bifa scoasă, ca o bifă pusă la loc să nu le piardă. */
type Rand = {
  /** Freza rândului (ADR 0084), ca text: numărul și diametrul. */
  readonly numarScula: string; readonly diametruScula: string;
  /** Forma frezei (ADR 0090), unghiul V și diametrul vârfului plat (ADR 0092; 0 = ascuțit), ca text. */
  readonly formaScula: 'plata' | 'v'; readonly unghiV: string; readonly varfV: string;
  /** Direcția pe linie (ADR 0092 §4): „” = ca desenul. */
  readonly directie: '' | DirectieOperatie;
  readonly latura: Latura; readonly sens: Sens; readonly adancime: string; readonly pas: string;
  readonly urechi: boolean; readonly numarUrechi: string; readonly latimeUreche: string; readonly grosimeUreche: string;
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
};
/** O freză de rest pe rândul ei, ca text: numărul, diametrul și pasul lateral. */
type RandRest = { readonly numar: string; readonly diametru: string; readonly pas: string };
/** Câte freze de rest are o listă (ADR 0093, plafonul documentului). */
const MAXIM_REST = 8;
/**
 * O listă de freze de rest e bună dacă fiecare are numărul în margini, diametrul pozitiv și mai mic decât al celei dinainte
 * (prima: `dinainte`) și pasul lateral cel mult raza ei. Câte una, ca câmpul greșit să se vadă.
 */
function restBun(lista: readonly RandRest[], dinainte: string): boolean[] {
  let d0 = citesteNumar(dinainte);
  return lista.map((r) => {
    const d = citesteNumar(r.diametru);
    const ok = intregInMargini(r.numar, MARGINI_OPERATIE.numarScula) && d0 !== null && d !== null && d > 0 && d < d0 && inMargini(r.pas, d / 2);
    d0 = d;
    return ok;
  });
}
/** Frezele de rest citite, sau null dacă una nu se poate citi. */
function citesteRest(lista: readonly RandRest[]): FrezaRestOperatie[] | null {
  const rez: FrezaRestOperatie[] = [];
  for (const r of lista) {
    const numar = citesteNumar(r.numar), diametru = citesteNumar(r.diametru), pasLateral = citesteNumar(r.pas);
    if (numar === null || diametru === null || pasLateral === null) return null;
    rez.push({ numar, diametru, pasLateral });
  }
  return rez;
}

/** Valorile cu care pornește coborârea pe un rând care n-o avea (ADR 0076 §5): 3°, zigzagul de 20 mm, elicea cât raza frezei. */
const UNGHI_COBORARE_IMPLICIT = 3;
const LUNGIME_ZIGZAG_IMPLICITA = 20;
export const razaEliceImplicita = (diametru: number): number => Math.round(diametru * 5) / 10;
const FELURI_COBORARE: ReadonlyArray<Coborare['fel']> = ['plonjare', 'rampa', 'zigzag', 'elice'];

/** Raza cu care pornește bifa intrărilor pe un rând care n-avea (ADR 0030 §1). */
const INTRARI_IMPLICITE: IntrariOperatie = { raza: 3 };

/** Lungimea cu care pornește bifa rampei pe un rând care n-avea (ADR 0029 §1). */
const RAMPA_IMPLICITA: RampaOperatie = { lungime: 10 };

/** Urechile cu care pornește bifa pe un rând care n-avea: cele ale plăcii 2 (ADR 0028 §1). */
const URECHI_IMPLICITE: UrechiOperatie = { numar: 4, latime: 8, grosime: 2 };

/** Un întreg între 1 și plafon (câte urechi pe buclă). */
function intregInMargini(s: string, plafon: number): boolean {
  const x = citesteNumar(s);
  return x !== null && Number.isInteger(x) && x >= 1 && x <= plafon;
}

/** Rezumatul jobului (ADR 0046): timpul, apoi tabelul pe operații și cel pe scule, cu distanțele de tăiere și de rapide. */
function Rezumat({ r, operatii, limba }: { readonly r: RezumatJob; readonly operatii: readonly OperatieExport[]; readonly limba: Limba }) {
  if (!r.ok) {
    const cheie: CheieSimpla = r.sursa === 'setari'
      ? (r.linie > 0 ? 'export.rezumat.eroare.setari' : 'export.rezumat.eroare.setari-tot')
      : (r.linie > 0 ? 'export.rezumat.eroare.program' : 'export.rezumat.eroare');
    return <p role="status" className="avertisment" data-testid="export-rezumat">{t(cheie, { linie: r.linie, motiv: r.motiv })}</p>;
  }
  const nr = new Intl.NumberFormat(limba === 'ro' ? 'ro-RO' : 'en-GB', { maximumFractionDigits: 0 });
  const zec = new Intl.NumberFormat(limba === 'ro' ? 'ro-RO' : 'en-GB', { maximumFractionDigits: 3 });
  const descriere = new Map(operatii.map((o) => [o.cheie, o.descriere]));
  const celule = (p: TimpPortiune) => (
    <>
      <td data-col="timp">{durata(p.secunde, limba)}</td>
      <td data-col="taiere">{nr.format(p.taiere)}</td>
      <td data-col="rapide">{nr.format(p.rapide)}</td>
    </>
  );
  const { masina: m } = r;
  const masina = {
    nume: m.nume, vx: nr.format(m.vitezaMaxima[0]), vy: nr.format(m.vitezaMaxima[1]), vz: nr.format(m.vitezaMaxima[2]),
    ax: zec.format(m.acceleratie[0]), ay: zec.format(m.acceleratie[1]), az: zec.format(m.acceleratie[2]),
  };
  const antet = (prima: CheieSimpla) => (
    <thead><tr>
      <th>{t(prima)}</th><th>{t('export.rezumat.durata')}</th><th>{t('export.rezumat.taiere')}</th><th>{t('export.rezumat.rapide')}</th>
    </tr></thead>
  );
  return (
    <section className="rezumat" data-testid="export-rezumat" aria-labelledby="rezumat-titlu">
      <h3 id="rezumat-titlu">{t('export.rezumat.titlu')}</h3>
      <p data-rezumat="timp" role="status"><strong>{t('export.rezumat.timp', { timp: durata(r.total.secunde, limba) })}</strong></p>
      {r.opriri > 0 && <p className="nota" data-rezumat="opriri">{t('export.rezumat.opriri', { n: r.opriri })}</p>}
      <p className="nota" data-rezumat="masina" data-sursa={m.sursa}>
        {t(m.sursa === 'setari' ? 'export.rezumat.masina.setari' : 'export.rezumat.masina.implicit', masina)}
      </p>
      {r.liniiLimitate > 0 && (
        <p className="avertisment" data-rezumat="limitat">{t('export.rezumat.limitat', { n: r.liniiLimitate })}</p>
      )}
      <table data-rezumat="operatii" aria-label={t('export.rezumat.pe-operatie')}>
        {antet('export.rezumat.operatia')}
        <tbody>
          {r.peOperatie.map((o) => (
            <tr key={o.operatie} data-operatie={o.operatie}><th scope="row">{descriere.get(o.operatie) ?? o.operatie}</th>{celule(o)}</tr>
          ))}
          <tr data-rand="restul"><th scope="row">{t('export.rezumat.restul')}</th>{celule(r.restul)}</tr>
        </tbody>
        <tfoot><tr data-rand="total"><th scope="row"><strong>{t('export.rezumat.total')}</strong></th>{celule(r.total)}</tr></tfoot>
      </table>
      <table data-rezumat="scule" aria-label={t('export.rezumat.pe-scula')}>
        {antet('export.rezumat.scula')}
        <tbody>
          {r.peScula.map((s) => (
            <tr key={s.numar} data-scula={s.numar}>
              <th scope="row">{t('export.rezumat.scula.rand', { numar: s.numar, nume: s.nume, diametru: zec.format(s.diametru) })}</th>{celule(s)}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

const SENSURI: readonly Sens[] = ['urcare', 'opozitie'];
const CHEI_SENS: Readonly<Record<Sens, CheieSimpla>> = { urcare: 'export.sens.urcare', opozitie: 'export.sens.opozitie' };

/**
 * Exportul G-code: colțul de origine, Z0, freza și profilul fiecărei operații. Operațiile vin din document și se scriu
 * înapoi în el la Exportă, ca o singură comandă (ADR 0025): se salvează și se anulează cu Ctrl+Z.
 */
export function DialogExport(
  {
    operatii, baza, descrieri, doarCitire, onExporta, onInchide, onReseteaza, stare, setariMasina, onSetariMasina,
  }: Props,
) {
  const limba = useLimba();
  // În română, numerele se arată cu virgulă; se citesc cu oricare separator.
  const text = (x: number): string => textNumar(x, limba === 'ro');
  const [origine, setOrigine] = useState<(typeof COLTURI)[number]>('stanga-jos');
  const [z0, setZ0] = useState<'sus' | 'jos'>('sus');
  const [post, setPost] = useState<IdContract>('grbl-11');
  const [unitati, setUnitati] = useState<Unitati>('mm');
  const postAles = POSTURI_EXPORT.find((x) => x.id === post);
  // Strategia schimbării sculei (ADR 0084): aleasă de om, dacă postul ales o acceptă; altfel, implicita postului.
  const [strategieCeruta, setStrategie] = useState<StrategieScula | null>(null);
  const strategie: StrategieScula | undefined = strategieCeruta !== null && postAles?.strategii.includes(strategieCeruta) ? strategieCeruta : postAles?.strategii[0];
  // Valorile se țin ca text, cum le scrie omul; se citesc abia la verificare și la Exportă.
  // Pe un rând cu căi deschise, urechile, rampa, intrările și degajările vin mai târziu (ADR 0037 §9, §12): bifele pornesc
  // scoase și rămân oprite, iar Exportă le scrie scoase (ce refuză exportul nu se oferă).
  const dinDocument = (): Record<string, Rand> => Object.fromEntries(operatii.map((o) => {
    const u = o.valori.urechi ?? URECHI_IMPLICITE;
    const inchise = o.deschise === 0;
    const fund = o.valori.fundPlat ?? null;
    const diametruFund = fund?.diametru ?? DIAMETRU_FUND_IMPLICIT;
    return [o.cheie, {
      numarScula: text(o.valori.scula?.numar ?? 1), diametruScula: text(o.valori.scula?.diametru ?? 6),
      formaScula: o.valori.scula?.forma ? 'v' : 'plata', unghiV: text(o.valori.scula?.forma?.unghi ?? UNGHI_V_IMPLICIT),
      varfV: text(o.valori.scula?.forma?.varf ?? 0), directie: o.valori.directie ?? '',
      latura: o.valori.latura, sens: o.valori.sens, adancime: text(o.valori.adancime), pas: text(o.valori.pas),
      urechi: inchise && o.valori.urechi !== null, numarUrechi: text(u.numar), latimeUreche: text(u.latime), grosimeUreche: text(u.grosime),
      rampa: inchise && o.valori.rampa !== null, lungimeRampa: text((o.valori.rampa ?? RAMPA_IMPLICITA).lungime),
      intrari: inchise && o.valori.intrari !== null, razaIntrare: text((o.valori.intrari ?? INTRARI_IMPLICITE).raza),
      colturi: inchise ? o.valori.colturi?.tip ?? '' : '',
      despartire: !inchise && o.valori.despartire === true,
      tip: inchise && o.valori.tip === 'buzunar' ? 'buzunar' : inchise && o.valori.tip === 'vcarve' ? 'vcarve'
        : o.cercuri === true && o.valori.tip === 'gaurire' ? 'gaurire' : 'profil',
      retragereCompleta: text(o.valori.retragereCompleta ?? 1),
      pasLateral: text(o.valori.pasLateral ?? pasLateralImplicit(o.valori.scula?.diametru ?? 6)),
      coborare: o.valori.coborare?.fel ?? 'plonjare',
      unghiCoborare: text(o.valori.coborare && o.valori.coborare.fel !== 'plonjare' ? o.valori.coborare.unghi : UNGHI_COBORARE_IMPLICIT),
      lungimeZigzag: text(o.valori.coborare?.fel === 'zigzag' ? o.valori.coborare.lungime : LUNGIME_ZIGZAG_IMPLICITA),
      razaElice: text(o.valori.coborare?.fel === 'elice' ? o.valori.coborare.raza : razaEliceImplicita(o.valori.scula?.diametru ?? 6)),
      // Fundul plat (ADR 0091 §4): T-ul V-ului + 1, Ø3,175, pasul 40 % din diametru.
      fundPlat: inchise && o.valori.tip === 'vcarve' && fund !== null,
      numarSculaFund: text(fund?.numar ?? (o.valori.scula?.numar ?? 1) + 1), diametruSculaFund: text(diametruFund),
      pasLateralFund: text(fund?.pasLateral ?? pasLateralImplicit(diametruFund)),
      // Frezele de rest (ADR 0093), ale buzunarului și ale fundului plat.
      rest: (o.valori.rest ?? []).map((r) => ({ numar: text(r.numar), diametru: text(r.diametru), pas: text(r.pasLateral) })),
      restFund: (fund?.rest ?? []).map((r) => ({ numar: text(r.numar), diametru: text(r.diametru), pas: text(r.pasLateral) })),
      strategie: o.valori.strategie ? 'paralel' : 'inele', unghiParalel: text(o.valori.strategie?.unghi ?? 0),
    }];
  }));
  const [param, setParam] = useState<Record<string, Rand>>(dinDocument);
  const cere = stare && !stare.ok ? stare.cereConfirmare : undefined;
  /**
   * Ieșirea bifată: chiar obiectul primit de la export, nu un „da” general. Orice cerere nouă (alt traseu, alți parametri,
   * sau doar un export repetat) e alt obiect, deci vine nebifată: fiecare program care taie în afara foii are bifa lui.
   */
  const [confirmata, setConfirmata] = useState<IesireFoaie | null>(null);
  /**
   * În fila care scrie, documentul nu se schimbă sub dialog (aplicația e inertă, scrierile oprite). În cea care citește,
   * o versiune nouă venită de la scriitor (sau preluarea scrierii) aduce `baza` nouă: valorile operațiilor se iau din nou
   * din document, ca dialogul să nu arate una și să exporte alta, iar după preluare să nu scrie înapoi valori vechi peste
   * munca altei file. Câmpurile operațiilor erau oprite (fila citea), deci nu se pierde nimic scris.
   */
  const [bazaVazuta, setBazaVazuta] = useState(baza);
  if (bazaVazuta !== baza) {
    setBazaVazuta(baza);
    setParam(dinDocument());
    setConfirmata(null);
  }
  const bifat = cere !== undefined && confirmata === cere;
  const cutie = useRef<HTMLDivElement>(null);
  const cerereVizibila = useRef<HTMLDivElement>(null);
  // La deschidere, focusul intră în dialog (butonul care l-a deschis rămâne sub el, inert).
  useEffect(() => { cutie.current?.focus(); }, []);
  // Când apare cererea, focusul trece pe textul ei, nu pe bifă: butonul Exportă devine inactiv și focusul ar cădea pe
  // pagină, iar pe bifă un al doilea Space ar bifa-o fără ca omul s-o fi citit. Bifa e la un Tab distanță.
  useEffect(() => { if (cere) cerereVizibila.current?.focus(); }, [cere]);
  // Câmpurile urechilor se judecă doar cu bifa pusă: oprite, nu intră în document.
  // Pasul lateral al unui buzunar: cel mult raza frezei rândului (ADR 0069 §3); fără o freză bună, nu se judecă.
  const randBun = (p: Rand | undefined): {
    scula: boolean; adancime: boolean; pas: boolean; numar: boolean; latime: boolean; grosime: boolean; rampa: boolean; intrari: boolean;
    pasLateral: boolean; coborare: boolean; retragere: boolean; vcarve: boolean; fund: boolean; varf: boolean; vPeLinie: boolean; rest: boolean;
    strategie: boolean;
  } => ({
    // Strategia paralelă (ADR 0094): unghiul liniilor în [0, 180).
    strategie: p !== undefined && (p.tip !== 'buzunar' || p.strategie === 'inele' || ((u) => u !== null && u >= 0 && u < 180)(citesteNumar(p.unghiParalel))),
    // Frezele de rest (ADR 0093): ale buzunarului; ale fundului plat, doar cu bifa pusă.
    rest: p !== undefined && (p.tip !== 'buzunar' || restBun(p.rest, p.diametruScula).every(Boolean))
      && (p.tip !== 'vcarve' || !p.fundPlat || restBun(p.restFund, p.diametruSculaFund).every(Boolean)),
    scula: p !== undefined && intregInMargini(p.numarScula, MARGINI_OPERATIE.numarScula) && inMargini(p.diametruScula, MARGINI_OPERATIE.diametru)
      && (p.formaScula !== 'v' || inMargini(p.unghiV, MARGINI_OPERATIE.unghiV, MARGINI_OPERATIE.unghiVMinim)),
    // V-carve-ul (ADR 0090) cere freza în V.
    vcarve: p !== undefined && (p.tip !== 'vcarve' || p.formaScula === 'v'),
    // Vârful plat (ADR 0092): de la 0 (ascuțit) până sub diametru.
    varf: p !== undefined && (p.formaScula !== 'v' || ((v, d) => v !== null && d !== null && v >= 0 && v < d)(citesteNumar(p.varfV), citesteNumar(p.diametruScula))),
    // Freza în V (ADR 0092 §3) taie pe linie sau într-un V-carve; pe o parte, într-un buzunar sau la găurire, nu.
    vPeLinie: p !== undefined && (p.formaScula !== 'v' || p.tip === 'vcarve' || (p.tip === 'profil' && p.latura === 'pe-linie')),
    // Fundul plat (ADR 0091): doar cu bifa pusă; pasul lateral cel mult raza frezei drepte.
    fund: p !== undefined && (p.tip !== 'vcarve' || !p.fundPlat || (intregInMargini(p.numarSculaFund, MARGINI_OPERATIE.numarScula)
      && inMargini(p.diametruSculaFund, MARGINI_OPERATIE.diametru) && ((d) => d !== null && inMargini(p.pasLateralFund, d / 2))(citesteNumar(p.diametruSculaFund)))),
    adancime: p !== undefined && inMargini(p.adancime, MARGINI_OPERATIE.adancime),
    pas: p !== undefined && inMargini(p.pas, MARGINI_OPERATIE.adancime),
    // Pe un buzunar și pe o găurire, urechile și rampa nu se aplică (ADR 0069 §1, ADR 0087 §1): bifele sunt oprite, deci nu
    // se judecă.
    numar: p !== undefined && (p.tip !== 'profil' || !p.urechi || intregInMargini(p.numarUrechi, MARGINI_OPERATIE.urechi)),
    latime: p !== undefined && (p.tip !== 'profil' || !p.urechi || inMargini(p.latimeUreche, MARGINI_OPERATIE.latimeUreche)),
    grosime: p !== undefined && (p.tip !== 'profil' || !p.urechi || inMargini(p.grosimeUreche, MARGINI_OPERATIE.grosimeUreche)),
    rampa: p !== undefined && (p.tip !== 'profil' || !p.rampa || inMargini(p.lungimeRampa, MARGINI_OPERATIE.lungimeRampa, MARGINI_OPERATIE.lungimeRampaMinima)),
    // Pe linie, intrările nu se cer (bifa e oprită), deci nici nu se judecă. Cu rampă, raza are pragul ei (ADR 0031 §2).
    intrari: p !== undefined && (p.tip !== 'profil' || !p.intrari || p.latura === 'pe-linie' || inMargini(p.razaIntrare, MARGINI_OPERATIE.razaIntrare,
      p.rampa ? MARGINI_OPERATIE.razaIntrareMinimaRampa : MARGINI_OPERATIE.razaIntrareMinima)),
    pasLateral: p !== undefined && (p.tip !== 'buzunar' || ((d) => d !== null && inMargini(p.pasLateral, d / 2))(citesteNumar(p.diametruScula))),
    // Coborârea (ADR 0076): doar pe un buzunar și doar câmpurile felului ales.
    coborare: p !== undefined && (p.tip !== 'buzunar' || p.strategie === 'paralel' || p.coborare === 'plonjare' || (
      inMargini(p.unghiCoborare, MARGINI_OPERATIE.unghiCoborare, MARGINI_OPERATIE.unghiCoborareMinim)
      && (p.coborare !== 'zigzag' || inMargini(p.lungimeZigzag, MARGINI_OPERATIE.lungimeZigzag, MARGINI_OPERATIE.lungimeZigzagMinima))
      && (p.coborare !== 'elice' || inMargini(p.razaElice, MARGINI_OPERATIE.razaElice, MARGINI_OPERATIE.razaEliceMinima)))),
    // Găurirea (ADR 0087): ieșirea la un număr întreg de pași, 1–100.
    retragere: p !== undefined && (p.tip !== 'gaurire' || intregInMargini(p.retragereCompleta, MARGINI_OPERATIE.retragereCompleta)),
  });
  const randuri = operatii.map((o) => randBun(param[o.cheie]));
  const sculeBune = randuri.every((b) => b.scula);
  const fmtFreza = new Intl.NumberFormat(limba === 'ro' ? 'ro-RO' : 'en-GB', { maximumFractionDigits: 3 });
  // Frezele rândurilor (ADR 0084): același număr cu două diametre (sau două forme, ADR 0090) ar fi două freze sub același T.
  // Freza se compară după valorile exacte; în motiv apare scrisă după limbă.
  const scule = new Map<number, Map<string, string>>();
  const adaugaFreza = (n: number, d: number, u: number | null, v: number | null = null): void => {
    const m = scule.get(n) ?? new Map<string, string>();
    // ADR 0092: același unghi cu alt vârf e altă freză.
    const varf = u !== null && v !== null && v > 0 ? v : null;
    m.set(u !== null ? `${d} V${u}${varf !== null ? ` t${varf}` : ''}` : `${d}`, u !== null
      ? `Ø${fmtFreza.format(d)} mm V${fmtFreza.format(u)}°${varf !== null ? ` ${t('export.freza.varf-scurt', { mm: fmtFreza.format(varf) })}` : ''}`
      : `Ø${fmtFreza.format(d)} mm`);
    scule.set(n, m);
  };
  for (const o of operatii) {
    const p = param[o.cheie];
    const n = p ? citesteNumar(p.numarScula) : null, d = p ? citesteNumar(p.diametruScula) : null;
    const u = p && p.formaScula === 'v' ? citesteNumar(p.unghiV) : null;
    if (n !== null && d !== null) adaugaFreza(n, d, u, p ? citesteNumar(p.varfV) : null);
    // Și freza dreaptă a fundului plat (ADR 0091), cu bifa pusă.
    const nf = p?.tip === 'vcarve' && p.fundPlat ? citesteNumar(p.numarSculaFund) : null, df = p ? citesteNumar(p.diametruSculaFund) : null;
    if (nf !== null && df !== null) adaugaFreza(nf, df, null);
    // Și frezele de rest (ADR 0093): ale buzunarului și, cu bifa pusă, ale fundului plat.
    for (const r of [...(p?.tip === 'buzunar' ? p.rest : []), ...(p?.tip === 'vcarve' && p.fundPlat ? p.restFund : [])]) {
      const nr = citesteNumar(r.numar), dr = citesteNumar(r.diametru);
      if (nr !== null && dr !== null) adaugaFreza(nr, dr, null);
    }
  }
  const conflict = [...scule].find(([, ds]) => ds.size > 1);
  const operatiiBune = sculeBune && !conflict && randuri.every((b) => b.adancime && b.pas);
  const urechiBune = randuri.every((b) => b.numar && b.latime && b.grosime);
  const rampeBune = randuri.every((b) => b.rampa);
  const intrariBune = randuri.every((b) => b.intrari);
  const pasiBuni = randuri.every((b) => b.pasLateral);
  const coborariBune = randuri.every((b) => b.coborare);
  const retrageriBune = randuri.every((b) => b.retragere);
  const vcarveBune = randuri.every((b) => b.vcarve);
  const funduriBune = randuri.every((b) => b.fund);
  const varfuriBune = randuri.every((b) => b.varf);
  const vPeLinie = randuri.every((b) => b.vPeLinie);
  const resturiBune = randuri.every((b) => b.rest);
  const strategiiBune = randuri.every((b) => b.strategie);
  const valid = operatiiBune && urechiBune && rampeBune && intrariBune && pasiBuni && coborariBune && retrageriBune && vcarveBune && funduriBune
    && varfuriBune && vPeLinie && resturiBune && strategiiBune;
  /**
   * Orice parametru schimbat face vechi rezultatul. Bifa nu mai trebuie ștearsă aici: cererea următoare e alt obiect, deci
   * vine oricum nebifată.
   */
  const schimbat = (): void => {
    onReseteaza();
  };
  const schimba = (id: string, p: Partial<Rand>): void => {
    schimbat();
    setParam((v) => {
      const vechi = v[id];
      return vechi ? { ...v, [id]: { ...vechi, ...p } } : v;
    });
  };
  /**
   * Frezele de rest ale unui rând (ADR 0093): câte un rând cu T, Ø și pasul, scos cu ×; „Adaugă” pune una cu T-ul următor
   * liber, jumătate din diametrul celei dinainte și pasul de 40 %. `fund`: lista fundului plat (oprită fără bifă).
   */
  const frezeRest = (cheie: string, p: Rand, fund: boolean, oprit: boolean): ReactNode => {
    const lista = fund ? p.restFund : p.rest, prima = fund ? p.diametruSculaFund : p.diametruScula, pre = fund ? 'fund-' : '';
    const pune = (nou: readonly RandRest[]): void => { schimba(cheie, fund ? { restFund: nou } : { rest: nou }); };
    const bune = restBun(lista, prima);
    const adauga = (): void => {
      // Numerele folosite: freza fiecărui rând, frezele de rest ale buzunarelor și, cu bifa pusă, freza fundului și ale ei.
      const toate = Object.values(param).flatMap((r) => [
        r.numarScula, ...(r.tip === 'buzunar' ? r.rest.map((x) => x.numar) : []),
        ...(r.tip === 'vcarve' && r.fundPlat ? [r.numarSculaFund, ...r.restFund.map((x) => x.numar)] : []),
      ]);
      const t0 = Math.max(0, ...toate.map((x) => citesteNumar(x) ?? 0));
      const d0 = citesteNumar(lista.at(-1)?.diametru ?? prima) ?? 6, d = Math.round((d0 / 2) * 1000) / 1000;
      pune([...lista, { numar: text(Math.min(MARGINI_OPERATIE.numarScula, t0 + 1)), diametru: text(d), pas: text(pasLateralImplicit(d)) }]);
    };
    return (
      <div className="campuri-rest" data-rest={fund ? `fund:${cheie}` : cheie}>
        <span title={t('export.rest.titlu')}>{t('export.rest')}</span>
        {lista.map((r, k) => (
          <span className="freza-rest" data-rest-rand={k} key={k}>
            <input type="text" inputMode="numeric" value={r.numar} data-camp={`${pre}rest-scula`} disabled={oprit} aria-label={t('export.freza.numar')}
              className="numar-scula" aria-invalid={!bune[k]} onChange={(ev) => { pune(lista.map((x, i) => (i === k ? { ...x, numar: ev.target.value } : x))); }} />
            <input type="text" inputMode="decimal" value={r.diametru} data-camp={`${pre}rest-diametru`} disabled={oprit} aria-label={t('export.freza.diametru')}
              aria-invalid={!bune[k]} onChange={(ev) => { pune(lista.map((x, i) => (i === k ? { ...x, diametru: ev.target.value } : x))); }} />
            <input type="text" inputMode="decimal" value={r.pas} data-camp={`${pre}rest-pas`} disabled={oprit} aria-label={t('export.pas-lateral')}
              title={t('export.pas-lateral.titlu')} aria-invalid={!bune[k]} onChange={(ev) => { pune(lista.map((x, i) => (i === k ? { ...x, pas: ev.target.value } : x))); }} />
            <button type="button" data-camp={`${pre}rest-scoate`} disabled={oprit} aria-label={t('export.rest.scoate')} title={t('export.rest.scoate')}
              onClick={() => { pune(lista.filter((_, i) => i !== k)); }}>×</button>
          </span>
        ))}
        <button type="button" data-camp={`${pre}rest-adauga`} disabled={oprit || lista.length >= MAXIM_REST} title={t('export.rest.titlu')} onClick={adauga}>
          {t('export.rest.adauga')}
        </button>
      </div>
    );
  };
  const valori = (): Map<string, ValoriOperatie> => new Map(operatii.flatMap((o): Array<readonly [string, ValoriOperatie]> => {
    const p = param[o.cheie];
    const adancime = p ? citesteNumar(p.adancime) : null;
    const pas = p ? citesteNumar(p.pas) : null;
    const numarScula = p ? citesteNumar(p.numarScula) : null, diametruScula = p ? citesteNumar(p.diametruScula) : null;
    if (!p || adancime === null || pas === null || numarScula === null || diametruScula === null) return [];
    const unghiV = p.formaScula === 'v' ? citesteNumar(p.unghiV) : null;
    const varfV = p.formaScula === 'v' ? citesteNumar(p.varfV) : null;
    if (p.formaScula === 'v' && (unghiV === null || varfV === null)) return [];
    // Vârful 0 = ascuțit: nu se scrie (ADR 0092).
    const scula: SculaOperatie = {
      numar: numarScula, diametru: diametruScula,
      ...(unghiV !== null ? { forma: { tip: 'v' as const, unghi: unghiV, ...(varfV !== null && varfV > 0 ? { varf: varfV } : {}) } } : {}),
    };
    // V-carve-ul (ADR 0090): latura interior, nimic din profil; adâncimea e cea maximă. Fundul plat (ADR 0091): cu bifa pusă.
    if (p.tip === 'vcarve') {
      const numar = citesteNumar(p.numarSculaFund), diametru = citesteNumar(p.diametruSculaFund), pasLateral = citesteNumar(p.pasLateralFund);
      if (p.fundPlat && (numar === null || diametru === null || pasLateral === null)) return [];
      const restFund = citesteRest(p.restFund);
      if (p.fundPlat && restFund === null) return [];
      const fundPlat = p.fundPlat && numar !== null && diametru !== null && pasLateral !== null
        ? { numar, diametru, pasLateral, ...(restFund && restFund.length > 0 ? { rest: restFund } : {}) } : null;
      return [[o.cheie, { scula, latura: 'interior', sens: p.sens, adancime, pas, urechi: null, rampa: null, intrari: null, colturi: null, tip: 'vcarve', fundPlat }] as const];
    }
    // Găurirea (ADR 0087 §1): latura interior, nimic din profil, cu ieșirea la al câtelea pas.
    if (p.tip === 'gaurire') {
      const retragereCompleta = citesteNumar(p.retragereCompleta);
      if (retragereCompleta === null) return [];
      return [[o.cheie, {
        scula, latura: 'interior', sens: p.sens, adancime, pas, urechi: null, rampa: null, intrari: null, colturi: null, tip: 'gaurire', retragereCompleta,
      }] as const];
    }
    // Buzunarul (ADR 0069 §1): latura interior, nimic din profil, cu pasul lateral.
    if (p.tip === 'buzunar') {
      const pasLateral = citesteNumar(p.pasLateral);
      // Frezele de rest (ADR 0093): lista rândului, goală = niciuna.
      const rest = citesteRest(p.rest);
      if (pasLateral === null || rest === null) return [];
      // Coborârea (ADR 0076): plonjarea nu se scrie (documentul rămâne cel de dinainte, cu același program).
      const unghi = citesteNumar(p.unghiCoborare), lungime = citesteNumar(p.lungimeZigzag), raza = citesteNumar(p.razaElice);
      // Strategia paralelă (ADR 0094): unghiul liniilor; coborârea, doar prin plonjare (nu se scrie).
      const unghiParalel = p.strategie === 'paralel' ? citesteNumar(p.unghiParalel) : null;
      if (p.strategie === 'paralel' && unghiParalel === null) return [];
      const strategie = unghiParalel !== null ? { strategie: { fel: 'paralel' as const, unghi: unghiParalel } } : {};
      let coborare: Coborare | undefined;
      if (p.coborare !== 'plonjare' && p.strategie !== 'paralel') {
        if (unghi === null) return [];
        if (p.coborare === 'rampa') coborare = { fel: 'rampa', unghi };
        else if (p.coborare === 'zigzag') { if (lungime === null) return []; coborare = { fel: 'zigzag', unghi, lungime }; }
        else { if (raza === null) return []; coborare = { fel: 'elice', unghi, raza }; }
      }
      return [[o.cheie, {
        scula, latura: 'interior', sens: p.sens, adancime, pas, urechi: null, rampa: null, intrari: null, colturi: null, tip: 'buzunar', pasLateral,
        ...(coborare ? { coborare } : {}), rest, ...strategie,
      }] as const];
    }
    const numar = citesteNumar(p.numarUrechi), latime = citesteNumar(p.latimeUreche), grosime = citesteNumar(p.grosimeUreche);
    if (p.urechi && (numar === null || latime === null || grosime === null)) return [];
    const urechi = p.urechi && numar !== null && latime !== null && grosime !== null ? { numar, latime, grosime } : null;
    const lungime = citesteNumar(p.lungimeRampa);
    if (p.rampa && lungime === null) return [];
    const rampa = p.rampa && lungime !== null ? { lungime } : null;
    // Pe linie, intrările nu se cer: bifa e oprită, iar documentul nu le primește.
    const cuIntrari = p.intrari && p.latura !== 'pe-linie';
    const raza = citesteNumar(p.razaIntrare);
    if (cuIntrari && raza === null) return [];
    const intrari = cuIntrari && raza !== null ? { raza } : null;
    // Pe linie, nici degajările (ADR 0032 §6): alegerea e oprită, iar documentul nu le primește.
    const colturi = p.colturi !== '' && p.latura !== 'pe-linie' ? { tip: p.colturi } : null;
    // Despărțirea se scrie doar pe un rând cu căi deschise (pe celelalte, bifa e oprită).
    const despartire = o.deschise > 0 ? { despartire: p.despartire } : {};
    // Direcția (ADR 0092 §4): doar pe linie; ca desenul nu se scrie.
    const directie = p.latura === 'pe-linie' && p.directie !== '' ? { directie: p.directie } : {};
    return [[o.cheie, { scula, latura: p.latura, sens: p.sens, adancime, pas, urechi, rampa, intrari, colturi, ...despartire, ...directie }] as const];
  }));
  // Motivul spune ce câmp e greșit: valorile operației, urechile, sau amândouă (recenzia feliei 2.4).
  const motivInvalid = [
    ...(sculeBune ? [] : [t('motiv.scula-invalida', { n: MARGINI_OPERATIE.numarScula, diametru: fmtFreza.format(MARGINI_OPERATIE.diametru) })]),
    ...(conflict ? [t('motiv.scula-conflict', { numar: conflict[0], diametre: [...conflict[1].values()].join(', ') })] : []),
    ...(operatiiBune || !sculeBune || conflict ? [] : [t('motiv.operatie-invalida')]),
    ...(urechiBune ? [] : [t('motiv.urechi-invalide', {
      n: MARGINI_OPERATIE.urechi, latime: fmtFreza.format(MARGINI_OPERATIE.latimeUreche), grosime: fmtFreza.format(MARGINI_OPERATIE.grosimeUreche),
    })]),
    ...(rampeBune ? [] : [t('motiv.rampa-invalida', {
      minim: fmtFreza.format(MARGINI_OPERATIE.lungimeRampaMinima), lungime: fmtFreza.format(MARGINI_OPERATIE.lungimeRampa),
    })]),
    ...(pasiBuni ? [] : [t('motiv.pas-lateral-invalid', {
      max: ((d) => (d !== null ? fmtFreza.format(d / 2) : '–'))(citesteNumar(param[operatii.find((o, i) => !randuri[i]?.pasLateral)?.cheie ?? '']?.diametruScula ?? '')),
    })]),
    ...(coborariBune ? [] : [t('motiv.coborare-invalida', {
      unghiMinim: fmtFreza.format(MARGINI_OPERATIE.unghiCoborareMinim), unghi: fmtFreza.format(MARGINI_OPERATIE.unghiCoborare),
      lungime: fmtFreza.format(MARGINI_OPERATIE.lungimeZigzagMinima), raza: fmtFreza.format(MARGINI_OPERATIE.razaEliceMinima),
    })]),
    ...(retrageriBune ? [] : [t('motiv.retragere-invalida', { max: MARGINI_OPERATIE.retragereCompleta })]),
    ...(vcarveBune ? [] : [t('motiv.vcarve-freza')]),
    ...(varfuriBune ? [] : [t('motiv.varf-invalid')]),
    ...(vPeLinie ? [] : [t('motiv.v-pe-linie')]),
    ...(funduriBune ? [] : [t('motiv.fund-plat-invalid', { n: MARGINI_OPERATIE.numarScula, diametru: fmtFreza.format(MARGINI_OPERATIE.diametru) })]),
    ...(resturiBune ? [] : [t('motiv.rest-invalid', { n: MARGINI_OPERATIE.numarScula })]),
    ...(strategiiBune ? [] : [t('motiv.strategie-invalida')]),
    ...(intrariBune ? [] : [operatii.some((o, i) => !randuri[i]?.intrari && param[o.cheie]?.rampa)
      ? t('motiv.intrari-invalide-rampa', {
        minim: fmtFreza.format(MARGINI_OPERATIE.razaIntrareMinimaRampa), raza: fmtFreza.format(MARGINI_OPERATIE.razaIntrare),
      })
      : t('motiv.intrari-invalide', {
        minim: fmtFreza.format(MARGINI_OPERATIE.razaIntrareMinima), raza: fmtFreza.format(MARGINI_OPERATIE.razaIntrare),
      })]),
  ].join(' ');

  return (
    <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="export-titlu">
      <div className="dialog-cutie" ref={cutie} tabIndex={-1}>
        <h2 id="export-titlu">{t('export.titlu', { post: postAles?.nume ?? '' })}</h2>
        <div className="campuri">
          <label>
            {t('export.origine')}
            <select value={origine} data-camp="origine" onChange={(e) => { schimbat(); setOrigine(e.target.value as (typeof COLTURI)[number]); }}>
              {COLTURI.map((c) => <option key={c} value={c}>{t(CHEI_COLT[c])}</option>)}
            </select>
          </label>
          <label>
            {t('export.z0')}
            <select value={z0} data-camp="z0" onChange={(e) => { schimbat(); setZ0(e.target.value === 'jos' ? 'jos' : 'sus'); }}>
              <option value="sus">{t('export.z0.sus')}</option>
              <option value="jos">{t('export.z0.jos')}</option>
            </select>
          </label>
          <label title={t('export.post.titlu')}>
            {t('export.post')}
            <select value={post} data-camp="post" onChange={(e) => {
              const id = POSTURI_EXPORT.find((x) => x.id === e.target.value)?.id;
              if (id) { schimbat(); setPost(id); }
            }}>
              {POSTURI_EXPORT.map((x) => <option key={x.id} value={x.id}>{x.nume}</option>)}
            </select>
          </label>
          <label>
            {t('export.unitati')}
            <select value={unitati} data-camp="unitati" onChange={(e) => { schimbat(); setUnitati(e.target.value === 'inch' ? 'inch' : 'mm'); }}>
              <option value="mm">{t('export.unitati.mm')}</option>
              <option value="inch">{t('export.unitati.inch')}</option>
            </select>
          </label>
          {scule.size > 1 && (
            <label title={t('export.strategie.titlu')}>
              {t('export.strategie')}
              <select value={strategie} data-camp="strategie" onChange={(e) => {
                const s = postAles?.strategii.find((x) => x === e.target.value);
                if (s) { schimbat(); setStrategie(s); }
              }}>
                {(postAles?.strategii ?? []).map((x) => <option key={x} value={x}>{t(`export.strategie.${x}` as CheieSimpla)}</option>)}
              </select>
            </label>
          )}
        </div>
        {postAles && !postAles.probat && (
          <p className="nota" data-testid="post-documentat">{t('export.post.documentat', { nume: postAles.nume })}</p>
        )}
        <table>
          <thead>
            <tr>
              <th>{t('export.element')}</th><th title={t('export.freza.titlu')}>{t('export.freza')}</th><th>{t('export.latura')}</th><th title={t('export.sens.titlu')}>{t('export.sens')}</th>
              <th>{t('export.adancime')}</th><th>{t('export.pas')}</th>
              <th title={t('export.urechi.titlu')}>{t('export.urechi')}</th>
              <th title={t('export.rampa.titlu')}>{t('export.rampa')}</th>
              <th title={t('export.intrari.titlu')}>{t('export.intrari')}</th>
              <th title={t('export.colturi.titlu')}>{t('export.colturi')}</th>
              <th title={t('export.despartire.titlu')}>{t('export.despartire')}</th>
            </tr>
          </thead>
          <tbody>
            {operatii.map((o) => {
              const p = param[o.cheie];
              if (!p) return null;
              const b = randBun(p);
              // Rândul are căi deschise (ADR 0037 §12): doar pe linie, fără urechi, rampă, intrări și degajări, cu motivul în titlu.
              const deschis = o.deschise > 0;
              // Pe un buzunar (ADR 0069 §1) și pe o găurire (ADR 0087 §1), ce e al profilului e oprit, cu motivul în titlu, ca pe
              // o cale deschisă.
              const buz = p.tip === 'buzunar', gaura = p.tip === 'gaurire', vc = p.tip === 'vcarve', nuProfil = buz || gaura || vc;
              const titluDeschis = deschis ? t('export.deschise.titlu') : buz ? t('export.buzunar.nu-se-aplica') : gaura ? t('export.gaurire.nu-se-aplica')
                : vc ? t('export.vcarve.nu-se-aplica') : undefined;
              return (
                <Fragment key={o.cheie}>
                <tr data-operatie={o.cheie}>
                  <td>{o.descriere}</td>
                  <td className="freza">
                    <input type="text" inputMode="numeric" value={p.numarScula} data-camp="scula" disabled={doarCitire} aria-label={t('export.freza.numar')}
                      aria-invalid={!b.scula || conflict !== undefined} className="numar-scula" onChange={(ev) => { schimba(o.cheie, { numarScula: ev.target.value }); }} />
                    <input type="text" inputMode="decimal" value={p.diametruScula} data-camp="diametru" disabled={doarCitire} aria-label={t('export.freza.diametru')}
                      aria-invalid={!b.scula || conflict !== undefined} onChange={(ev) => { schimba(o.cheie, { diametruScula: ev.target.value }); }} />
                    {/* Forma frezei (ADR 0090): plată sau în V, cu unghiul inclus. */}
                    <select value={p.formaScula} data-camp="forma-scula" disabled={doarCitire} aria-label={t('export.freza.forma')}
                      aria-invalid={!b.vcarve || !b.vPeLinie} onChange={(ev) => { schimba(o.cheie, { formaScula: ev.target.value === 'v' ? 'v' : 'plata' }); }}>
                      <option value="plata">{t('export.freza.plata')}</option>
                      <option value="v">{t('export.freza.v')}</option>
                    </select>
                    {p.formaScula === 'v' && (
                      <input type="text" inputMode="decimal" value={p.unghiV} data-camp="unghi-v" disabled={doarCitire} aria-label={t('export.freza.unghi')}
                        title={t('export.freza.unghi')} className="unghi-v" aria-invalid={!b.scula} onChange={(ev) => { schimba(o.cheie, { unghiV: ev.target.value }); }} />
                    )}
                    {/* Vârful plat (ADR 0092): freza de gravare; 0 = ascuțit. */}
                    {p.formaScula === 'v' && (
                      <input type="text" inputMode="decimal" value={p.varfV} data-camp="varf-v" disabled={doarCitire} aria-label={t('export.freza.varf')}
                        title={t('export.freza.varf.titlu')} className="unghi-v" aria-invalid={!b.varf} onChange={(ev) => { schimba(o.cheie, { varfV: ev.target.value }); }} />
                    )}
                  </td>
                  <td>
                    {/* Buzunarul (ADR 0069) e încă o alegere a tăieturii, doar pe un rând cu contururi închise; găurirea (ADR 0087),
                        doar pe un rând numai cu cercuri. */}
                    <select value={nuProfil ? p.tip : p.latura} data-camp="latura" disabled={doarCitire} title={deschis ? t('export.latura.deschise.titlu') : undefined}
                      onChange={(ev) => {
                        const v = ev.target.value;
                        schimba(o.cheie, v === 'buzunar' || v === 'gaurire' || v === 'vcarve' ? { tip: v } : { tip: 'profil', latura: v as Latura });
                      }}>
                      {laturiOferite(o.deschise, o.noduri, p.latura).map((l) => <option key={l} value={l}>{t(CHEI_LATURA[l])}</option>)}
                      {!deschis && <option value="buzunar">{t(CHEI_LATURA.buzunar)}</option>}
                      {!deschis && o.cercuri === true && <option value="gaurire">{t('export.latura.gaurire')}</option>}
                      {!deschis && <option value="vcarve">{t('export.latura.vcarve')}</option>}
                    </select>
                  </td>
                  <td>
                    {/* Pe linie, scula taie ambii pereți: sensul nu schimbă materialul (ADR 0027 §3). */}
                    <select value={p.sens} data-camp="sens" disabled={doarCitire || p.latura === 'pe-linie'} title={t('export.sens.titlu')}
                      onChange={(ev) => { schimba(o.cheie, { sens: ev.target.value === 'opozitie' ? 'opozitie' : 'urcare' }); }}>
                      {SENSURI.map((s) => <option key={s} value={s}>{t(CHEI_SENS[s])}</option>)}
                    </select>
                    {/* Pe linie, direcția (ADR 0092 §4): ca desenul, invers sau cel mai scurt drum. */}
                    {p.tip === 'profil' && p.latura === 'pe-linie' && (
                      <select value={p.directie} data-camp="directie" disabled={doarCitire} aria-label={t('export.directie')} title={t('export.directie.titlu')}
                        onChange={(ev) => { const v = ev.target.value; schimba(o.cheie, { directie: v === 'invers' || v === 'scurt' ? v : '' }); }}>
                        <option value="">{t('export.directie.desen')}</option>
                        <option value="invers">{t('export.directie.invers')}</option>
                        <option value="scurt">{t('export.directie.scurt')}</option>
                      </select>
                    )}
                  </td>
                  <td><input type="text" inputMode="decimal" value={p.adancime} data-camp="adancime" disabled={doarCitire} aria-invalid={!b.adancime} onChange={(ev) => { schimba(o.cheie, { adancime: ev.target.value }); }} /></td>
                  <td><input type="text" inputMode="decimal" value={p.pas} data-camp="pas" disabled={doarCitire} aria-invalid={!b.pas} onChange={(ev) => { schimba(o.cheie, { pas: ev.target.value }); }} /></td>
                  <td>
                    <input type="checkbox" checked={p.urechi && !nuProfil} data-camp="urechi" disabled={doarCitire || deschis || nuProfil} aria-label={t('export.urechi')}
                      title={titluDeschis ?? t('export.urechi.titlu')} onChange={(ev) => { schimba(o.cheie, { urechi: ev.target.checked }); }} />
                  </td>
                  <td>
                    <input type="checkbox" checked={p.rampa && !nuProfil} data-camp="rampa" disabled={doarCitire || deschis || nuProfil} aria-label={t('export.rampa')}
                      title={titluDeschis ?? t('export.rampa.titlu')} onChange={(ev) => { schimba(o.cheie, { rampa: ev.target.checked }); }} />
                  </td>
                  <td>
                    {/* Pe linie, freza taie ambii pereți: nu există parte de deșeu pentru intrare (ADR 0030 §6). */}
                    <input type="checkbox" checked={p.intrari && p.latura !== 'pe-linie' && !nuProfil} data-camp="intrari"
                      disabled={doarCitire || deschis || nuProfil || p.latura === 'pe-linie'} aria-label={t('export.intrari')}
                      title={titluDeschis ?? t('export.intrari.titlu')} onChange={(ev) => { schimba(o.cheie, { intrari: ev.target.checked }); }} />
                  </td>
                  <td>
                    {/* Pe linie, nu există parte de deșeu pentru degajare (ADR 0032 §6). */}
                    <select value={p.latura === 'pe-linie' || nuProfil ? '' : p.colturi} data-camp="colturi" disabled={doarCitire || deschis || nuProfil || p.latura === 'pe-linie'}
                      aria-label={t('export.colturi')} title={titluDeschis ?? t('export.colturi.titlu')}
                      onChange={(ev) => { schimba(o.cheie, { colturi: ev.target.value === 'dog-bone' || ev.target.value === 't-bone' ? ev.target.value : '' }); }}>
                      <option value="">{t('export.colturi.fara')}</option>
                      <option value="dog-bone">{t('export.colturi.dog-bone')}</option>
                      <option value="t-bone">{t('export.colturi.t-bone')}</option>
                    </select>
                  </td>
                  <td>
                    {/* Despărțirea foii (ADR 0037 §8): doar pe un rând cu căi deschise; o marchează omul, aplicația n-o ghicește. */}
                    <input type="checkbox" checked={p.despartire} data-camp="despartire" disabled={doarCitire || !deschis} aria-label={t('export.despartire')}
                      title={t('export.despartire.titlu')} onChange={(ev) => { schimba(o.cheie, { despartire: ev.target.checked }); }} />
                  </td>
                </tr>
                {(nuProfil || p.urechi || p.rampa || (p.intrari && p.latura !== 'pe-linie')) && (
                  // Câmpurile urechilor și ale rampei, pe un rând al lor sub operație: tabelul rămâne îngust.
                  <tr className="detalii" data-detalii={o.cheie}>
                    <td />
                    <td colSpan={9}>
                      <div className="campuri-detalii">
                      {/* V-carve-ul (ADR 0090): adâncimea e cea maximă; fundul plat vine cu freza dreaptă (ADR 0091). */}
                      {vc && <p className="nota-vcarve" data-vcarve={o.cheie}>{t('export.vcarve.nota')}</p>}
                      {vc && (
                      <div className="campuri-fund" data-fund={o.cheie}>
                      <label title={t('export.fund.titlu')}>
                        <input type="checkbox" checked={p.fundPlat} data-camp="fund-plat" disabled={doarCitire}
                          onChange={(ev) => { schimba(o.cheie, { fundPlat: ev.target.checked }); }} />
                        {t('export.fund')}
                      </label>
                      <label>
                        {t('export.freza.numar')}
                        <input type="text" inputMode="numeric" value={p.numarSculaFund} data-camp="fund-scula" disabled={doarCitire || !p.fundPlat}
                          aria-invalid={p.fundPlat && (!b.fund || conflict !== undefined)} onChange={(ev) => { schimba(o.cheie, { numarSculaFund: ev.target.value }); }} />
                      </label>
                      <label>
                        {t('export.freza.diametru')}
                        <input type="text" inputMode="decimal" value={p.diametruSculaFund} data-camp="fund-diametru" disabled={doarCitire || !p.fundPlat}
                          aria-invalid={p.fundPlat && (!b.fund || conflict !== undefined)} onChange={(ev) => { schimba(o.cheie, { diametruSculaFund: ev.target.value }); }} />
                      </label>
                      <label title={t('export.fund.pas.titlu')}>
                        {t('export.pas-lateral')}
                        <input type="text" inputMode="decimal" value={p.pasLateralFund} data-camp="fund-pas" disabled={doarCitire || !p.fundPlat}
                          aria-invalid={p.fundPlat && !b.fund} onChange={(ev) => { schimba(o.cheie, { pasLateralFund: ev.target.value }); }} />
                      </label>
                      {frezeRest(o.cheie, p, true, doarCitire || !p.fundPlat)}
                      </div>
                      )}
                      {/* Găurirea (ADR 0087): pasul e cât coboară freza între două retrageri; aici, când iese din gaură. */}
                      {gaura && (
                      <div className="campuri-gaurire" data-gaurire={o.cheie}>
                      <label title={t('export.gaurire.retragere.titlu')}>
                        {t('export.gaurire.retragere')}
                        <input type="text" inputMode="numeric" value={p.retragereCompleta} data-camp="retragere" disabled={doarCitire}
                          aria-invalid={!b.retragere} onChange={(ev) => { schimba(o.cheie, { retragereCompleta: ev.target.value }); }} />
                      </label>
                      </div>
                      )}
                      {buz && (
                      <div className="campuri-buzunar" data-buzunar={o.cheie}>
                      <label title={t('export.pas-lateral.titlu')}>
                        {t('export.pas-lateral')}
                        <input type="text" inputMode="decimal" value={p.pasLateral} data-camp="pas-lateral" disabled={doarCitire}
                          aria-invalid={!b.pasLateral} onChange={(ev) => { schimba(o.cheie, { pasLateral: ev.target.value }); }} />
                      </label>
                      {/* Strategia (ADR 0094): inelele sau liniile paralele, cu unghiul lor. */}
                      <label title={t('export.paralel.titlu')}>
                        {t('export.paralel')}
                        <select value={p.strategie} data-camp="strategie" disabled={doarCitire}
                          onChange={(ev) => { schimba(o.cheie, { strategie: ev.target.value === 'paralel' ? 'paralel' : 'inele' }); }}>
                          <option value="inele">{t('export.paralel.inele')}</option>
                          <option value="paralel">{t('export.paralel.linii')}</option>
                        </select>
                      </label>
                      {p.strategie === 'paralel' && (
                      <label title={t('export.paralel.unghi.titlu')}>
                        {t('export.paralel.unghi')}
                        <input type="text" inputMode="decimal" value={p.unghiParalel} data-camp="unghi-paralel" disabled={doarCitire}
                          aria-invalid={!b.strategie} onChange={(ev) => { schimba(o.cheie, { unghiParalel: ev.target.value }); }} />
                      </label>
                      )}
                      {/* Coborârea în buzunar (ADR 0076): felul, apoi câmpurile lui; strategia paralelă coboară prin plonjare. */}
                      {p.strategie === 'inele' && (<>
                      <label title={t('export.coborare.titlu')}>
                        {t('export.coborare')}
                        <select value={p.coborare} data-camp="coborare" disabled={doarCitire}
                          onChange={(ev) => { const f = FELURI_COBORARE.find((x) => x === ev.target.value); if (f) schimba(o.cheie, { coborare: f }); }}>
                          {FELURI_COBORARE.map((f) => <option key={f} value={f}>{t(`export.coborare.${f}`)}</option>)}
                        </select>
                      </label>
                      {p.coborare !== 'plonjare' && (
                      <label title={t('export.coborare.unghi.titlu')}>
                        {t('export.coborare.unghi')}
                        <input type="text" inputMode="decimal" value={p.unghiCoborare} data-camp="unghi-coborare" disabled={doarCitire}
                          aria-invalid={!b.coborare && !inMargini(p.unghiCoborare, MARGINI_OPERATIE.unghiCoborare, MARGINI_OPERATIE.unghiCoborareMinim)}
                          onChange={(ev) => { schimba(o.cheie, { unghiCoborare: ev.target.value }); }} />
                      </label>
                      )}
                      {p.coborare === 'zigzag' && (
                      <label title={t('export.coborare.lungime.titlu')}>
                        {t('export.coborare.lungime')}
                        <input type="text" inputMode="decimal" value={p.lungimeZigzag} data-camp="lungime-zigzag" disabled={doarCitire}
                          aria-invalid={!inMargini(p.lungimeZigzag, MARGINI_OPERATIE.lungimeZigzag, MARGINI_OPERATIE.lungimeZigzagMinima)}
                          onChange={(ev) => { schimba(o.cheie, { lungimeZigzag: ev.target.value }); }} />
                      </label>
                      )}
                      {p.coborare === 'zigzag' && (() => {
                        // Câte rampe face zigzagul pe o trecere (cu pasul rândului), cum le va tăia lucrarea.
                        const u = citesteNumar(p.unghiCoborare), l = citesteNumar(p.lungimeZigzag), pas = citesteNumar(p.pas);
                        if (u === null || l === null || pas === null || !(u > 0 && l > 0 && pas > 0)) return null;
                        const n = Math.max(1, Math.ceil(pas / (l * Math.tan((u * Math.PI) / 180)) - 1e-9));
                        return <span className="nota-coborare" data-camp="rampe-zigzag">{t('export.coborare.rampe', { n })}</span>;
                      })()}
                      {p.coborare === 'elice' && (
                      <label title={t('export.coborare.raza.titlu')}>
                        {t('export.coborare.raza')}
                        <input type="text" inputMode="decimal" value={p.razaElice} data-camp="raza-elice" disabled={doarCitire}
                          aria-invalid={!inMargini(p.razaElice, MARGINI_OPERATIE.razaElice, MARGINI_OPERATIE.razaEliceMinima)}
                          onChange={(ev) => { schimba(o.cheie, { razaElice: ev.target.value }); }} />
                      </label>
                      )}
                      </>)}
                      {frezeRest(o.cheie, p, false, doarCitire)}
                      </div>
                      )}
                      {p.urechi && !nuProfil && (
                      <div className="campuri-urechi" data-urechi={o.cheie}>
                      <label>
                        {t('export.urechi.numar')}
                        <input type="text" inputMode="numeric" value={p.numarUrechi} data-camp="urechi-numar" disabled={doarCitire}
                          aria-invalid={!b.numar} onChange={(ev) => { schimba(o.cheie, { numarUrechi: ev.target.value }); }} />
                      </label>
                      <label title={t('export.urechi.latime.titlu')}>
                        {t('export.urechi.latime')}
                        <input type="text" inputMode="decimal" value={p.latimeUreche} data-camp="urechi-latime" disabled={doarCitire}
                          aria-invalid={!b.latime} onChange={(ev) => { schimba(o.cheie, { latimeUreche: ev.target.value }); }} />
                      </label>
                      <label>
                        {t('export.urechi.grosime')}
                        <input type="text" inputMode="decimal" value={p.grosimeUreche} data-camp="urechi-grosime" disabled={doarCitire}
                          aria-invalid={!b.grosime} onChange={(ev) => { schimba(o.cheie, { grosimeUreche: ev.target.value }); }} />
                      </label>
                      </div>
                      )}
                      {p.rampa && !nuProfil && (
                      <div className="campuri-rampa" data-rampa={o.cheie}>
                      <label title={t('export.rampa.lungime.titlu')}>
                        {t('export.rampa.lungime')}
                        <input type="text" inputMode="decimal" value={p.lungimeRampa} data-camp="rampa-lungime" disabled={doarCitire}
                          aria-invalid={!b.rampa} onChange={(ev) => { schimba(o.cheie, { lungimeRampa: ev.target.value }); }} />
                      </label>
                      {p.intrari && p.latura !== 'pe-linie' && (
                        // ADR 0031 §7: cu intrări, rampa coboară pe sfertul intrării.
                        <span className="nota" data-nota="rampa-pe-intrare">{t('export.rampa.peIntrare')}</span>
                      )}
                      </div>
                      )}
                      {p.intrari && p.latura !== 'pe-linie' && !nuProfil && (
                      <div className="campuri-intrari" data-intrari={o.cheie}>
                      <label title={t('export.intrari.raza.titlu')}>
                        {t('export.intrari.raza')}
                        <input type="text" inputMode="decimal" value={p.razaIntrare} data-camp="intrari-raza" disabled={doarCitire}
                          aria-invalid={!b.intrari} onChange={(ev) => { schimba(o.cheie, { razaIntrare: ev.target.value }); }} />
                      </label>
                      </div>
                      )}
                      </div>
                    </td>
                  </tr>
                )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
        <p className="nota">{t('export.regim')}</p>
        <details className="setari-masina">
          <summary>{t('export.setari.titlu')}</summary>
          <p className="nota">{t('export.setari.nota')}</p>
          <textarea value={setariMasina} data-camp="setari-masina" aria-label={t('export.setari.camp')} rows={4} spellCheck={false}
            onChange={(e) => {
              onSetariMasina(e.target.value);
              schimbat();
            }} />
        </details>
        {!valid && <p role="status" className="avertisment" data-testid="export-invalid">{motivInvalid}</p>}
        {cere && (
          <div className="confirmare-iesire" data-testid="iesire-foaie" ref={cerereVizibila} tabIndex={-1}>
            <div role="alert">
              <p><strong>{t('export.iesire.titlu')}</strong> {laturi(cere.depasire, limba)}.</p>
              <p>{t('export.iesire.unde', { etichete: cere.elemente.map((id) => descrieri.get(id) ?? id).join('; ') })}</p>
            </div>
            <label>
              <input type="checkbox" checked={bifat} data-camp="confirma-iesire"
                onChange={(e) => { setConfirmata(e.target.checked ? cere : null); }} />
              {t('export.iesire.confirma')}
            </label>
          </div>
        )}
        <div className="butoane">
          <button type="button" disabled={!valid || (cere !== undefined && !bifat)} data-buton="exporta"
            title={valid ? undefined : motivInvalid}
            onClick={() => {
              if (!valid) return;
              onExporta({
                origine, z0, post, unitati, valori: valori(), ...(scule.size > 1 && strategie ? { strategieScula: strategie } : {}),
                ...(cere && bifat ? { confirmareIesire: cere } : {}),
              });
            }}>
            {t('export.exporta')}
          </button>
          <button type="button" onClick={onInchide}>{t('export.inchide')}</button>
        </div>
        {stare?.ok && (stare.fisiere && stare.fisiere.length > 1
          ? (
            <ul role="status" data-testid="export-stare">
              {stare.fisiere.map((f) => <li key={f.nume} data-fisier={f.nume}>{t('export.gata.fisier', { nume: f.nume, n: f.linii, sha: f.sha256 })}</li>)}
            </ul>
          )
          : <p role="status" data-testid="export-stare">{t('export.gata', { n: stare.linii, sha: stare.sha256 })}</p>)}
        {stare?.ok && stare.avertismente.length > 0 && (
          <ul className="avertisment" data-testid="export-avertismente">
            {stare.avertismente.map((a) => <li key={a}>{t('export.avertisment', { text: a })}</li>)}
          </ul>
        )}
        {stare?.ok && <Rezumat r={stare.rezumat} operatii={operatii} limba={limba} />}
        {stare?.ok && <PrevizualizareSimulare s={stare.simulare} limba={limba} />}
        {stare && !stare.ok && !cere && <p role="status" className="avertisment" data-testid="export-stare">{t('export.eroare', { motiv: stare.motiv })}</p>}
      </div>
    </div>
  );
}
