import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import '../i18n/export.ts';
// Durata în cuvinte (`durata.*`) stă în dicționarul traseului, comun cu cipul timpului de lângă traseu (ADR 0046 §8).
import '../i18n/traseu.ts';
import { t, type CheieSimpla } from '../i18n/t.ts';
import type { Limba } from '../i18n/tipuri.ts';
import {
  bazaFisier, INCRUSTATIE_DREAPTA_IMPLICITA, INCRUSTATIE_IMPLICITA, LATIME_UMAR_IMPLICITA, LUNGIME_NUME, MARGINI_OPERATIE, motivNume,
  pasLateralImplicit, POSTURI_EXPORT, propunereNume,
  PUNTI_DOP_DREPT, SUPRACURSA_MAXIMA, UNGHI_V_IMPLICIT, type Coborare, type IdContract, type IesireFoaie, type ParametriExport,
  type RezumatFoi, type RezumatJob, type StrategieScula, type TimpPortiune, type Unitati,
} from './actiuniExportTipuri.ts';
import { durata } from './durata.ts';
import { citesteNumar, textNumar } from './numar.ts';
import { legaturi, muta, ordineAutomata, ordineDinRanguri, riscuri, type RandOrdine } from './ordineExport.ts';
import { PrevizualizareSimulare } from './PrevizualizareSimulare.tsx';
import { useLimba } from './useLimba.ts';
import { verdicteGresite, type GrupExport, type VerdictRand } from './exportGrupuri.ts';
import { DesenColt, DesenZ0, type DesenComun } from './exportDesene.tsx';
import { Cartonase, Poza } from './exportPoze.tsx';
import { cuAceeasiFreza, FisaOperatie, ListaBiblioteca, NotaBiblioteca, RAND_DREPT, type ContextFisa, type InapoiNota } from './FisaOperatie.tsx';
import {
  bandaBuna, CHEI_COLT, CHEI_LATURA, citesteRest, ORIGINI, DIAMETRU_FUND_IMPLICIT, faraNumar, incrustatieVRand, inMargini,
  INTRARI_IMPLICITE, intregInMargini, jocFolosit, laturi, LUNGIME_ZIGZAG_IMPLICITA, margineBuna, MAXIM_REST, PLACUTE_NUMITE, puntiBune,
  RAMPA_IMPLICITA, razaEliceImplicita, restBun, rezervaExplicatii, spatiuFolosit, UNGHI_COBORARE_IMPLICIT, URECHI_IMPLICITE, type BunRand,
  type CerereExport, type FrezaRestOperatie, type IncrustatieDreaptaOperatie, type Latura, type OperatieExport, type Rand, type RandRest,
  copieDeReadus, cuFrezaAleasa, cuFrezaPusaInapoi, cuValorileNoi, frezeRanduri, locuriFreze, numarPentruRand, oferitePentruRest, stareOrigine, type FrezaOferita, type OrigineFreza, type SculaOperatie, type StareExport,
  type CopieRand, type RezultatInapoi, type UndeFreza,
  type ValoriOperatie, type HartieRand, type IntrareHartie,
} from './exportRand.ts';

type Props = {
  readonly operatii: readonly OperatieExport[];
  /** Cheile rândurilor în ordinea automată a lucrării (ADR 0133 §3: ordinea de la deschidere), ca prima lor tăietură. */
  readonly ordineAutomata: readonly string[];
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
  /**
   * Supracursa (ADR 0176), ca text, cum o scrie omul: cât trec tăieturile prin placă sub fața ei de jos, 0 … `SUPRACURSA_MAXIMA`
   * mm. O ține aplicația, ca setările mașinii, de la o fereastră la alta; nu intră în document.
   */
  readonly supracursa: string;
  readonly onSupracursa: (text: string) => void;
  /**
   * Bifa de lângă supracursă (ADR 0177): și tăieturile scrise cât grosimea foii trec cu ea. O ține aplicația, ca supracursa;
   * fără supracursă, e oprită.
   */
  readonly prinFoaie: boolean;
  readonly onPrinFoaie: (bifata: boolean) => void;
  /**
   * „Deschide în Mașina” (ADR 0132 §7), după un export reușit pe care senderul îl vorbește (familia GRBL): închide dialogul și
   * încarcă programul în fereastra Mașina, fără să-l pornească. Fără ea (alt controler, niciun export), butonul nu apare.
   */
  readonly onDeschideInMasina?: () => void;
  /**
   * Deschis din „Trimite la mașină” (ADR 0250, felia 28.1↑d): butonul principal se cheamă așa, iar după export aplicația
   * duce programul în Mașina (închide dialogul). Cu un controler pe care senderul nu-l vorbește, butonul e „Exportă”.
   */
  readonly trimite?: boolean;
  /** Foaia exportată (ADR 0210 §5), în titlu, când proiectul are mai multe. */
  readonly foaie?: string;
  /** Numele scris de om al foii active (fără „Foaia N”): propunerea numelui fișierului pornește din el (ADR 0291 §5). */
  readonly numeFoaie?: string;
  /** Grosimea foii exportate (mm): adâncimea unei găuri (ADR 0175), arătată pe rândul ei. */
  readonly grosimeFoaie?: number;
  /**
   * Rândul „pe hârtie” (ADR 0291, felia 28.8↑h): adâncimea tăiată, trecerile, felul găuririi, socotite de aplicație cu funcțiile
   * lucrării (`src/app/hartieExport.ts`); desenele, notele și greșelile găuririi le citesc de aici.
   */
  readonly hartie: (i: IntrareHartie) => HartieRand;
  /**
   * Plăcuțele foii din care iese textul (ADR 0210 §4, răspunsul 5; felia 11.4↑c), cu numele lor: o notă, sau, cu `confirmare`
   * (aleasă în fereastra CSV), o bifă fără de care Exportă rămâne oprit. Bifa ține chiar obiectul văzut: altul vine nebifat.
   */
  readonly placute?: { readonly nume: readonly string[]; readonly confirmare: boolean };
  /** Câte foi are proiectul (ADR 0210 §5): de la două, fereastra oferă „Toate foile”, cu plăcuțele tuturor (`placuteToate`). */
  readonly foi?: number;
  readonly placuteToate?: { readonly nume: readonly string[]; readonly confirmare: boolean };
  /** „Raportul foilor…” (ADR 0210 §6, felia 11.6↑): deschide raportul, cu colțul și Z0 alese aici. */
  readonly onRaport?: (p: Pick<ParametriExport, 'origine' | 'z0'>) => void;
  /**
   * „Alege pe desen…” (ADR 0211, 3a): aplicația ascunde fereastra și pune pânza în modul urechilor operației `cheie`, cu urechile
   * rândului; „Gata” sau „Renunță” o aduc înapoi, cum era.
   */
  readonly onAlegeUrechi?: (cheie: string, urechi: { readonly numar: number; readonly latime: number; readonly grosime: number }) => void;
  /**
   * Frezele din „Frezele mele” care merg pe tăietura unui rând (ADR 0300 §4, felia 16.A↑b-3), în ordinea bibliotecii; lipsă =
   * fără listă (de exemplu, o bibliotecă goală).
   */
  readonly frezeOferite?: (r: Pick<Rand, 'tip' | 'latura'>) => readonly FrezaOferita[];
  /**
   * Toate frezele din „Frezele mele” cu CAM (ADR 0300 §5, felia 16.A↑b-4), pentru nota „s-a schimbat în bibliotecă” și
   * recunoașterea; null (sau lipsă) cât biblioteca nu e citită.
   */
  readonly bibliotecaToata?: readonly FrezaOferita[] | null;
  /**
   * „Pune-o înapoi în bibliotecă” (ADR 0300 §5, felia 16.A↑b-6): aplicația pune în biblioteca proiectului freza din copia de pe
   * rând și o trimite în cont; lipsă = fără buton.
   */
  readonly onPuneInapoi?: (c: CopieRand) => Promise<RezultatInapoi>;
};

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
      <h4 id="rezumat-titlu">{t('export.rezumat.titlu')}</h4>
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


/**
 * „Toate foile” exportate (ADR 0210 §5): arhiva și amprenta ei; pe fiecare foaie (cu cele identice, ×N), fișierele ei din arhivă
 * și timpul estimat; la capăt, timpul tuturor (fiecare foaie de câte ori se taie) și foile fără nimic de tăiat.
 */
function ListaFoi({ foi: r, sha256, limba }: { readonly foi: RezumatFoi; readonly sha256: string; readonly limba: Limba }): ReactNode {
  const n = r.foi.reduce((s, f) => s + 1 + f.identice.length, 0);
  return (
    <div role="status" className="export-foi" data-testid="export-foi">
      <p>{t('export.foi.gata', { arhiva: r.arhiva, n, sha: sha256 })}</p>
      <table data-rezumat="foi" aria-label={t('export.foi')}>
        <thead><tr><th>{t('export.foi.foaia')}</th><th>{t('export.foi.fisiere')}</th><th>{t('export.rezumat.durata')}</th></tr></thead>
        <tbody>
          {r.foi.map((f) => (
            <tr key={f.nume} data-foaie={f.nume}>
              <th scope="row">{f.identice.length > 0 ? t('export.foi.identice', { foaie: f.nume, n: f.identice.length + 1, alte: f.identice.join(', ') }) : f.nume}</th>
              <td>{f.fisiere.join(', ')}</td>
              <td>{f.secunde === null ? '—' : durata(f.secunde, limba)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {r.secunde !== null && <p data-foi="timp"><strong>{t('export.foi.timp', { timp: durata(r.secunde, limba) })}</strong></p>}
      {r.goale.length > 0 && <p className="nota" data-foi="goale">{t('export.foi.goale', { foi: r.goale.join(', ') })}</p>}
    </div>
  );
}

/**
 * Exportul G-code: colțul de origine, Z0, freza și profilul fiecărei operații. Operațiile vin din document și se scriu
 * înapoi în el la Exportă, ca o singură comandă (ADR 0025): se salvează și se anulează cu Ctrl+Z.
 */
export function DialogExport(
  {
    operatii, ordineAutomata: automataLucrarii, baza, descrieri, doarCitire, onExporta, onInchide, onReseteaza, stare, setariMasina,
    onSetariMasina, supracursa, onSupracursa, prinFoaie, onPrinFoaie, onDeschideInMasina, trimite = false, foaie, numeFoaie, placute, foi,
    placuteToate, onRaport, grosimeFoaie, onAlegeUrechi, frezeOferite, bibliotecaToata = null, onPuneInapoi, hartie,
  }: Props,
) {
  const limba = useLimba();
  // În română, numerele se arată cu virgulă; se citesc cu oricare separator.
  const text = (x: number): string => textNumar(x, limba === 'ro');
  const [origine, setOrigine] = useState<(typeof ORIGINI)[number]>('stanga-jos');
  const [z0, setZ0] = useState<'sus' | 'jos'>('sus');
  const [post, setPost] = useState<IdContract>('grbl-11');
  const [unitatiCerute, setUnitati] = useState<Unitati>('mm');
  /** Numele fișierului scris de om (ADR 0291 §5); `null`: propunerea din numele foii, care urmează colțul ales. */
  const [numeAles, setNumeAles] = useState<string | null>(null);
  const postAles = POSTURI_EXPORT.find((x) => x.id === post);
  // „Trimite la mașină” (felia 28.1↑d) trimite doar ce vorbește senderul (familia GRBL); cu alt controler, butonul e iar
  // „Exportă”, iar nota postului spune de ce programul doar se descarcă.
  const trimiteAcum = trimite && postAles?.sender !== false;
  // Un controler care citește doar mm (RichAuto) nu primește inch; alegerea omului rămâne pentru celelalte posturi.
  const unitati: Unitati = postAles?.inch === false ? 'mm' : unitatiCerute;
  // Strategia schimbării sculei (ADR 0084): aleasă de om, dacă postul ales o acceptă; altfel, implicita postului.
  const [strategieCeruta, setStrategie] = useState<StrategieScula | null>(null);
  const strategie: StrategieScula | undefined = strategieCeruta !== null && postAles?.strategii.includes(strategieCeruta) ? strategieCeruta : postAles?.strategii[0];
  // Valorile se țin ca text, cum le scrie omul; se citesc abia la verificare și la Exportă.
  // Pe un rând cu căi deschise, urechile, rampa, intrările și degajările vin mai târziu (ADR 0037 §9, §12): bifele pornesc
  // scoase și rămân oprite, iar Exportă le scrie scoase (ce refuză exportul nu se oferă).
  // Cel mai mare T al operațiilor (frezele lor, ale fundului plat, de rest, ale dopurilor): o freză nouă, cu bifa ei, pornește
  // de la următorul, ca să nu ia numărul altei freze.
  const tMaxim = Math.max(0, ...operatii.flatMap((o) => {
    const v = o.valori, fp = v.fundPlat;
    return [
      v.scula?.numar ?? 0, fp?.numar ?? 0, ...(fp?.rest ?? []).map((r) => r.numar), ...(v.rest ?? []).map((r) => r.numar),
      ...(v.incrustatieDreapta?.frezeDop ?? []).map((r) => r.numar), v.incrustatie?.banda?.freza?.numar ?? 0,
    ];
  }));
  /** O freză de rest din document pe rând (ADR 0093), ca text, cu originea ei din „Frezele mele” (felia 16.A↑b-5). */
  const randRest = (r: FrezaRestOperatie): RandRest => ({ numar: text(r.numar), diametru: text(r.diametru), pas: text(r.pasLateral), origine: r.origine ?? null });
  const dinDocument = (): Record<string, Rand> => Object.fromEntries(operatii.map((o) => {
    const u = o.valori.urechi ?? URECHI_IMPLICITE;
    const inchise = o.deschise === 0;
    const fund = o.valori.fundPlat ?? null;
    const diametruFund = fund?.diametru ?? DIAMETRU_FUND_IMPLICIT;
    const dr = o.valori.incrustatieDreapta, inc = o.valori.incrustatie ?? dr, dop0 = dr?.frezeDop?.[0], banda = o.valori.incrustatie?.banda;
    // Punțile rândului: ale benzii ori ale dopului drept; altfel cele implicite (ale benzii sunt aceleași, ADR 0172 răspunsul 5).
    const puntiRand = banda?.punti ?? dr?.punti ?? PUNTI_DOP_DREPT;
    const diametruDop = dop0?.diametru ?? Math.round((o.valori.scula?.diametru ?? 6) * 500) / 1000;
    return [o.cheie, {
      numarScula: text(o.valori.scula?.numar ?? 1), diametruScula: text(o.valori.scula?.diametru ?? 6), origineScula: o.valori.scula?.origine ?? null,
      formaScula: o.valori.scula?.forma ? 'v' : 'plata', unghiV: text(o.valori.scula?.forma?.unghi ?? UNGHI_V_IMPLICIT),
      varfV: text(o.valori.scula?.forma?.varf ?? 0), directie: o.valori.directie ?? '',
      latura: o.valori.latura, sens: o.valori.sens, adancime: text(o.valori.adancime), pas: text(o.valori.pas),
      urechi: inchise && o.valori.urechi !== null, numarUrechi: text(u.numar), latimeUreche: text(u.latime), grosimeUreche: text(u.grosime),
      modUrechi: o.valori.urechi?.mod ?? 'egale',
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
      pasLateralFund: text(fund?.pasLateral ?? pasLateralImplicit(diametruFund)), origineFund: fund?.origine ?? null,
      // Frezele de rest (ADR 0093), ale buzunarului și ale fundului plat.
      rest: (o.valori.rest ?? []).map(randRest),
      restFund: (fund?.rest ?? []).map(randRest),
      strategie: o.valori.strategie ? 'paralel' : 'inele', unghiParalel: text(o.valori.strategie?.unghi ?? 0),
      incrustatie: inchise && o.valori.tip === 'vcarve' && o.valori.incrustatie != null,
      // Jocul de sub dop, spațiul de deasupra și marginea: ale incrustației rândului, în V sau cu pereți drepți (aceleași înțelesuri).
      jocInc: text(inc?.joc ?? INCRUSTATIE_IMPLICITA.joc), fierastrauInc: text(inc?.fierastrau ?? INCRUSTATIE_IMPLICITA.fierastrau),
      margineInc: text(inc?.margine ?? INCRUSTATIE_IMPLICITA.margine),
      acelasiSpatiu: o.valori.incrustatie != null && o.valori.incrustatie.joc === o.valori.incrustatie.fierastrau,
      jurDop: o.valori.incrustatie?.jurDop ?? 'fata',
      // Banda (ADR 0172): valorile din document, altfel cele implicite: lățimea și placa goale (cea mai mică, S + H + 1),
      // decuparea pusă, freza ei a fundului plat (bifa scoasă; cu bifa, primul T de după toate frezele operațiilor), punțile
      // 4 × 4 × 1 mm.
      latimeBanda: banda?.latime !== undefined ? text(banda.latime) : '', decupareBanda: banda?.decupare ?? true,
      placaBanda: banda ? text(banda.grosimePlaca) : '', frezaBanda: banda?.freza !== undefined,
      numarSculaBanda: text(banda?.freza?.numar ?? Math.min(MARGINI_OPERATIE.numarScula, tMaxim + 1)),
      diametruSculaBanda: text(banda?.freza?.diametru ?? diametruFund), origineBanda: banda?.freza?.origine ?? null,
      // Punțile dopului drept decupat (ADR 0174), în aceleași câmpuri: ale incrustației, altfel 4 × 4 × 1 mm.
      numarPunti: text(puntiRand.numar), latimePunti: text(puntiRand.latime), grosimePunti: text(puntiRand.grosime),
      // Pereții drepți (ADR 0171): implicit jocul lateral 0,1, dopul ridicat, pe fund; frezele dopului, ale locașului (bifa
      // scoasă), iar cu bifa pornesc de la primul T de după toate frezele operațiilor (ca freza decupării benzii; T-ul locașului
      // + 1 putea fi al altei freze) și de la jumătate din diametrul locașului.
      incrustatieDreapta: inchise && o.valori.tip === 'buzunar' && dr != null,
      lateralInc: text(dr?.jocLateral ?? INCRUSTATIE_DREAPTA_IMPLICITA.jocLateral),
      // Gaura (ADR 0175): n-are fund, deci dopul ridicat de pe ea stă pe față (în trepte, pe umăr).
      dopInc: dr?.dop ?? INCRUSTATIE_DREAPTA_IMPLICITA.dop, locasInc: dr?.locas === 'gaura' ? 'gaura' : 'buzunar',
      sprijinInc: dr?.locas === 'gaura' && dr.sprijin === 'fund' ? (dr.treapta ? 'umar' : 'fata') : dr?.sprijin ?? INCRUSTATIE_DREAPTA_IMPLICITA.sprijin,
      // Treapta (ADR 0175 §5): a proiectului; fără ea, umărul pornește de la jumătatea locașului (la gaură, a foii), lat de 3 mm.
      treaptaInc: dr?.treapta ? (dr.treapta.spre === 'exterior' ? 'exterior' : 'interior') : 'fara',
      adancimeTreapta: text(dr?.treapta?.adancime ?? Math.round((dr?.locas === 'gaura' && grosimeFoaie !== undefined ? grosimeFoaie : o.valori.adancime) * 5) / 10),
      latimeTreapta: text(dr?.treapta?.latime ?? LATIME_UMAR_IMPLICITA),
      frezaDop: dop0 !== undefined, numarSculaDop: text(dop0?.numar ?? Math.min(MARGINI_OPERATIE.numarScula, tMaxim + 1)), diametruSculaDop: text(diametruDop),
      pasLateralDop: text(dop0?.pasLateral ?? pasLateralImplicit(diametruDop)), origineDop: dop0?.origine ?? null,
      restDop: (dr?.frezeDop ?? []).slice(1).map(randRest),
    }];
  }));
  const [param, setParam] = useState<Record<string, Rand>>(dinDocument);
  // Ordinea tăierii (ADR 0133 §3): null = automată; altfel cheile rândurilor, în ordinea omului, pornită din rangurile
  // documentului. Ordinea automată arătată e cea de la deschidere (o latură sau o freză schimbată o reface la export).
  const automata = ordineAutomata(automataLucrarii, operatii.map((o) => o.cheie));
  const dinRanguri = (): string[] | null => ordineDinRanguri(automata, new Map(operatii.flatMap((o) => (o.rang !== undefined ? [[o.cheie, o.rang] as const] : []))));
  const [ordineMea, setOrdineMea] = useState<string[] | null>(dinRanguri);
  // Bifa ordinii riscante: se șterge la orice mutare (ordinea nouă e alta decât cea văzută).
  const [riscAcceptat, setRiscAcceptat] = useState(false);
  // Rândul tras cu mânerul, cât ține tragerea.
  const [tras, setTras] = useState<string | null>(null);
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
    setOrdineMea(dinRanguri());
    setRiscAcceptat(false);
  }
  const bifat = cere !== undefined && confirmata === cere;
  // Plăcuțele cu textul ieșit (răspunsul 5): bifa ține lista văzută; cu confirmarea aleasă, fără ea nu se exportă.
  // „Toate foile” (ADR 0210 §5): un program pe foaie, într-o arhivă; plăcuțele de judecat sunt atunci ale tuturor foilor.
  const [toate, setToate] = useState(false);
  const pl = toate ? placuteToate : placute;
  const [placuteVazute, setPlacuteVazute] = useState<object | null>(null);
  const placuteOprite = pl?.confirmare === true && placuteVazute !== pl;
  const textPlacute = pl ? t('export.placute.iese', {
    n: pl.nume.length, nume: [...pl.nume.slice(0, PLACUTE_NUMITE), ...(pl.nume.length > PLACUTE_NUMITE ? ['…'] : [])].join('; '),
  }) : null;
  const cutie = useRef<HTMLDivElement>(null);
  // Fereastra pe listă și fișă (ADR 0290): panoul fișelor, fișa marcată în listă și explicația câmpului activ.
  const panou = useRef<HTMLDivElement>(null);
  const [curent, setCurent] = useState('foaia');
  const [activ, setActiv] = useState<{ readonly loc: string; readonly text: string; readonly camp: string } | null>(null);
  const cerereVizibila = useRef<HTMLDivElement>(null);
  // La deschidere, focusul intră în dialog (butonul care l-a deschis rămâne sub el, inert).
  useEffect(() => { cutie.current?.focus(); }, []);
  // Esc închide fereastra (ADR 0290, felia 28.8↑g), ca Închide, oriunde ar fi focusul (și când a căzut pe pagină). Nu și cât
  // stă ascunsă (urechile alese pe desen: Esc e al modului, care îl oprește) sau când Esc și l-a luat altcineva
  // (`defaultPrevented`), nici în mijlocul unei compuneri (IME). Raportul foilor nu stă peste ea: o înlocuiește.
  const radacina = useRef<HTMLDivElement>(null);
  const inchide = useRef(onInchide);
  inchide.current = onInchide;
  useEffect(() => {
    const tasta = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape' || e.defaultPrevented || e.isComposing) return;
      const r = radacina.current;
      if (!r || !r.checkVisibility()) return;
      e.preventDefault();
      inchide.current();
    };
    document.addEventListener('keydown', tasta);
    return () => { document.removeEventListener('keydown', tasta); };
  }, []);
  // Un clic în afara ferestrei o închide, doar dacă și apăsarea, și ridicarea au fost afară: o tragere începută în ea (o
  // selecție de text dusă prea departe) și lăsată afară nu o închide, nici una începută afară și lăsată în ea (clicul cade
  // atunci pe fundal, strămoșul lor comun).
  const apasatAfara = useRef(false);
  const ridicatAfara = useRef(false);
  // Când apare cererea, focusul trece pe textul ei, nu pe bifă: butonul Exportă devine inactiv și focusul ar cădea pe
  // pagină, iar pe bifă un al doilea Space ar bifa-o fără ca omul s-o fi citit. Bifa e la un Tab distanță.
  useEffect(() => { if (cere) cerereVizibila.current?.focus(); }, [cere]);
  // Câmpurile urechilor se judecă doar cu bifa pusă: oprite, nu intră în document.
  // Pasul lateral al unui buzunar: cel mult raza frezei rândului (ADR 0069 §3); fără o freză bună, nu se judecă.
  const randBun = (p: Rand | undefined): BunRand => ({
    // Incrustația (ADR 0170 §1): jocul și fierăstrăul în (0, 1 000], marginea în [0, 10 000]; restul (jocul față de adâncime,
    // conul) îl judecă lucrarea, cu motiv.
    incrustatie: p !== undefined && (p.tip !== 'vcarve' || !p.incrustatie || (inMargini(p.jocInc, MARGINI_OPERATIE.adancime)
      && (p.acelasiSpatiu || inMargini(p.fierastrauInc, MARGINI_OPERATIE.adancime))
      && margineBuna(p.margineInc))),
    // Pereții drepți (ADR 0171): jocul lateral în (0, 1 000], spațiul folosit (g pe față, H pe fund și la decupat) la fel,
    // marginea în [0, 10 000]; jocul față de adâncime și de freză îl judecă lucrarea, cu motiv.
    // Treapta (ADR 0175): adâncimea umărului în (0, 1 000], lățimea în (0, 10 000]; față de adâncime și de joc, lucrarea.
    dreapta: p !== undefined && (p.tip !== 'buzunar' || !p.incrustatieDreapta || (inMargini(p.lateralInc, MARGINI_OPERATIE.adancime)
      && (!jocFolosit(p) || inMargini(p.jocInc, MARGINI_OPERATIE.adancime)) && (!spatiuFolosit(p) || inMargini(p.fierastrauInc, MARGINI_OPERATIE.adancime))
      && (p.treaptaInc === 'fara' || (inMargini(p.adancimeTreapta, MARGINI_OPERATIE.adancime) && inMargini(p.latimeTreapta, MARGINI_OPERATIE.latimeUmar)))
      && margineBuna(p.margineInc))),
    // Frezele dopului (răspunsul 4): doar cu bifa; prima ca freza fundului plat, cele de rest tot mai mici.
    frezaDop: p !== undefined && (p.tip !== 'buzunar' || !p.incrustatieDreapta || !p.frezaDop || (intregInMargini(p.numarSculaDop, MARGINI_OPERATIE.numarScula)
      && inMargini(p.diametruSculaDop, MARGINI_OPERATIE.diametru) && ((d) => d !== null && inMargini(p.pasLateralDop, d / 2))(citesteNumar(p.diametruSculaDop))
      && restBun(p.restDop, p.diametruSculaDop).every(Boolean))),
    // Punțile dopului drept (ADR 0174): doar pe dopul decupat, ca urechile.
    puntiDop: p !== undefined && (p.tip !== 'buzunar' || !p.incrustatieDreapta || p.dopInc !== 'decupat' || puntiBune(p)),
    // Banda dopului în V (ADR 0172): doar pe o incrustație în V cu banda (`bandaBuna`).
    banda: p !== undefined && (p.tip !== 'vcarve' || !p.incrustatie || p.jurDop !== 'banda' || Object.values(bandaBuna(p)).every(Boolean)),
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
    // La locuri alese (ADR 0211), numărul e câte ai pus: câmpul e oprit și nu se judecă.
    numar: p !== undefined && (p.tip !== 'profil' || !p.urechi || faraNumar(p.modUrechi) || intregInMargini(p.numarUrechi, MARGINI_OPERATIE.urechi)),
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
  // Cât scoate o trecere, rotunjit la sutime (ca într-o fișă de atelier); lucrarea folosește valoarea exactă.
  const fmtTrecere = new Intl.NumberFormat(limba === 'ro' ? 'ro-RO' : 'en-GB', { maximumFractionDigits: 2 });
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
    // Și freza dopului cu pereți drepți (ADR 0171, răspunsul 4), cu bifa pusă: același T e aceeași freză și în fișierul dopului.
    const dopPropriu = p?.tip === 'buzunar' && p.incrustatieDreapta && p.frezaDop;
    const nd = dopPropriu ? citesteNumar(p.numarSculaDop) : null, dd = p ? citesteNumar(p.diametruSculaDop) : null;
    if (nd !== null && dd !== null) adaugaFreza(nd, dd, null);
    // Și freza decupării dopului cu bandă (ADR 0172), cu bifa ei și cu decuparea: același T e aceeași freză și în fișierul dopului.
    const bandaProprie = p?.tip === 'vcarve' && p.incrustatie && p.jurDop === 'banda' && p.decupareBanda && p.frezaBanda;
    const nb = bandaProprie ? citesteNumar(p.numarSculaBanda) : null, db = p ? citesteNumar(p.diametruSculaBanda) : null;
    if (nb !== null && db !== null) adaugaFreza(nb, db, null);
    // Și frezele de rest (ADR 0093): ale buzunarului și, cu bifa pusă, ale fundului plat și ale dopului.
    for (const r of [...(p?.tip === 'buzunar' ? p.rest : []), ...(p?.tip === 'vcarve' && p.fundPlat ? p.restFund : []), ...(dopPropriu ? p.restDop : [])]) {
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
  const incrustatiiBune = randuri.every((b) => b.incrustatie);
  const drepteBune = randuri.every((b) => b.dreapta);
  const frezeDopBune = randuri.every((b) => b.frezaDop);
  const benziBune = randuri.every((b) => b.banda);
  const puntiDopBune = randuri.every((b) => b.puntiDop);
  // Supracursa (ADR 0176): un număr între 0 și maxima lucrării; 0 e voie (fără supracursă).
  const supracursaCitita = citesteNumar(supracursa);
  const supracursaBuna = supracursaCitita !== null && Number.isFinite(supracursaCitita) && supracursaCitita >= 0 && supracursaCitita <= SUPRACURSA_MAXIMA;
  // Bifa tăieturilor cât foaia (ADR 0177) are ce schimba doar cu o supracursă bună, peste 0.
  const cuSupracursa = supracursaBuna && supracursaCitita !== null && supracursaCitita > 0;
  /**
   * Rândul „pe hârtie” (ADR 0291, felia 28.8↑h), cu valorile pe care le primește lucrarea la Exportă: supracursa doar cât e
   * pozitivă și bună, bifa doar cu ea (ca cererea de la Exportă), diametrele cercurilor rândului.
   */
  const diametreRand = new Map(operatii.map((o) => [o.cheie, o.diametre ?? []]));
  const hartieRandului = (cheie: string, p: Rand): HartieRand => hartie({
    tip: p.tip, adancime: citesteNumar(p.adancime), pas: citesteNumar(p.pas),
    incrustatie: p.tip === 'buzunar' && p.incrustatieDreapta ? (p.locasInc === 'gaura' ? 'gaura' : 'alta') : p.tip === 'vcarve' && p.incrustatie ? 'alta' : 'fara',
    grosime: grosimeFoaie, supracursa: cuSupracursa && supracursaCitita !== null ? supracursaCitita : 0, prinFoaie: cuSupracursa && prinFoaie,
    diametruScula: citesteNumar(p.diametruScula), retragere: citesteNumar(p.retragereCompleta), diametre: diametreRand.get(cheie) ?? [],
  });
  /**
   * Cercurile unei găuriri pe care freza scrisă nu le poate găuri (ADR 0087): cel mai mare peste două diametre, cel mai mic sub
   * freză. Le spune fișa, lângă freză, și opresc Exportă înainte de clic (ADR 0291, felia 28.8↑h).
   */
  const cercuriRele = (cheie: string, p: Rand | undefined): { readonly mare: number | null; readonly mic: number | null } => {
    if (!p || p.tip !== 'gaurire' || citesteNumar(p.diametruScula) === null) return { mare: null, mic: null };
    const c = hartieRandului(cheie, p).gaurire?.cercuri ?? [];
    return { mare: c.filter((x) => x.fel === 'mare').at(-1)?.diametru ?? null, mic: c.find((x) => x.fel === 'mic')?.diametru ?? null };
  };
  const motiveGaura = (cheie: string, p: Rand | undefined): string[] => {
    const { mare, mic } = cercuriRele(cheie, p), D = p ? citesteNumar(p.diametruScula) : null;
    if (D === null) return [];
    return [
      ...(mare !== null ? [t('motiv.gaurire.mare', { cerc: fmtFreza.format(mare), freza: fmtFreza.format(D), minim: fmtFreza.format(mare / 2) })] : []),
      ...(mic !== null ? [t('motiv.gaurire.mic', { cerc: fmtFreza.format(mic), freza: fmtFreza.format(D) })] : []),
    ];
  };
  const gauriBune = operatii.every((o) => motiveGaura(o.cheie, param[o.cheie]).length === 0);
  // Numele fișierului (ADR 0291 §5): propunerea din numele foii (altfel baza de azi), până când omul scrie altul. Pe un
  // controler cu nume scurte (stick FAT), numele e al lui (`CNCVS2.NC`): câmpul nu se aplică.
  const numeScurt = postAles?.numeScurt === true;
  const numeFisier = numeAles ?? propunereNume(numeFoaie, origine);
  const motivNumeFisier = numeScurt ? null : motivNume(numeFisier);
  const numeBun = motivNumeFisier === null;
  const valid = operatiiBune && urechiBune && rampeBune && intrariBune && pasiBuni && coborariBune && retrageriBune && vcarveBune && funduriBune
    && varfuriBune && vPeLinie && resturiBune && strategiiBune && incrustatiiBune && drepteBune && frezeDopBune && benziBune && puntiDopBune
    && supracursaBuna && numeBun && gauriBune;
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
   * Freza aleasă din „Frezele mele” pe locul `unde` al rândului `cheie` (ADR 0300 §4; freza operației din 16.A↑b-3, cele în plus
   * din 16.A↑b-5): T-ul (regula rolurilor, printre frezele ferestrei fără cea înlocuită), Ø-ul, pasul lateral și originea, iar la
   * freza operației și forma și pasul pe trecere (`cuFrezaAleasa`).
   */
  const alegeFreza = (cheie: string, f: FrezaOferita, unde: UndeFreza = 'scula'): void => {
    const p = param[cheie];
    if (!p) return;
    const s = f.scula;
    const alte = frezeRanduri(operatii.flatMap((o) => (param[o.cheie] ? [[o.cheie, param[o.cheie]!] as const] : [])), { cheie, unde });
    const numar = numarPentruRand(alte, {
      numar: s.numar, diametru: s.diametru, ...(s.forma ? { forma: s.forma } : {}),
      ...(s.origine.regim ? { turatie: s.origine.regim.turatie } : {}),
    });
    schimba(cheie, cuFrezaAleasa(p, unde, f, numar, text));
  };
  /**
   * „Ia valorile noi” (ADR 0300 §5, felia 16.A↑b-4): pe un loc al unui rând, sau pe toate locurile ferestrei cu aceeași freză
   * din bibliotecă (într-o singură schimbare); T-ul și pașii rămân.
   */
  const iaValorileNoi = (cheie: string, unde: UndeFreza, f: FrezaOferita): void => {
    const p = param[cheie];
    if (p) schimba(cheie, cuValorileNoi(p, unde, f, text));
  };
  const iaValorileNoiPeToate = (f: FrezaOferita): void => {
    schimbat();
    setParam((v) => {
      const nou: Record<string, Rand> = { ...v };
      for (const [k, p] of Object.entries(v)) {
        let r = p;
        for (const l of locuriFreze(p)) if (l.origine?.biblioteca.id === f.id) r = { ...r, ...cuValorileNoi(r, l.unde, f, text) };
        nou[k] = r;
      }
      return nou;
    });
  };
  /**
   * „Pune-o înapoi în bibliotecă” (ADR 0300 §5, felia 16.A↑b-6), pe o freză ștearsă: aplicația o pune la loc din copia de pe
   * rând; apoi locul ei (și cele cu aceeași copie) o iau, cu numele ei liber. Starea fiecărui loc: cât scrie, motivul unui refuz.
   */
  const [inapoiLoc, setInapoiLoc] = useState<ReadonlyMap<string, { readonly lucru: boolean; readonly motiv: string | null }>>(() => new Map());
  const puneInapoiLoc = (k: string, v: { readonly lucru: boolean; readonly motiv: string | null } | null): void => {
    setInapoiLoc((m) => {
      const n = new Map(m);
      if (v) n.set(k, v); else n.delete(k);
      return n;
    });
  };
  const MOTIV_INAPOI: Readonly<Record<Exclude<Extract<RezultatInapoi, { ok: false }>['motiv'], 'exista'>, CheieSimpla>> = {
    plina: 'export.biblioteca.inapoi.plina', versiune: 'export.biblioteca.inapoi.versiune', valori: 'export.biblioteca.inapoi.valori',
    eroare: 'export.biblioteca.inapoi.eroare',
  };
  const inapoiLa = (cheie: string, unde: UndeFreza): InapoiNota | undefined => {
    const p = param[cheie];
    const copie = onPuneInapoi && p ? copieDeReadus(p, unde) : null;
    if (!onPuneInapoi || !copie) return undefined;
    const k = `${cheie}|${typeof unde === 'string' ? unde : `${unde.rest}:${unde.k}`}`, st = inapoiLoc.get(k);
    return {
      lucru: st?.lucru ?? false, motiv: st?.motiv ?? null,
      onPune: () => {
        puneInapoiLoc(k, { lucru: true, motiv: null });
        void onPuneInapoi(copie).then((r) => {
          if (r.ok) {
            schimbat();
            setParam((v) => cuFrezaPusaInapoi(v, cheie, unde, r.freza, text));
            puneInapoiLoc(k, null);
          } else {
            // Id-ul încă în bibliotecă (pusă la loc în altă filă): nota se reface singură, cu diferențele, dacă sunt.
            puneInapoiLoc(k, r.motiv === 'exista' ? null : { lucru: false, motiv: t(MOTIV_INAPOI[r.motiv]) });
          }
        }, () => { puneInapoiLoc(k, { lucru: false, motiv: t(MOTIV_INAPOI.eroare) }); });
      },
    };
  };
  // „Pune urechile unde țin” (ADR 0211, b): rândurile pieselor desprinse, cu urechi, care sunt în fereastră, trec pe „unde
  // ține”, într-o singură schimbare; nota spune câte, până la exportul următor.
  const [undeTinePuse, setUndeTinePuse] = useState<number | null>(null);
  useEffect(() => { if (stare) setUndeTinePuse(null); }, [stare]);
  const undeTine = stare?.ok ? (stare.undeTine ?? []).filter((k) => param[k]?.urechi === true && param[k]?.modUrechi !== 'lemn') : [];
  const puneUndeTine = (): void => {
    const chei = undeTine;
    if (chei.length === 0) return;
    schimbat();
    setParam((v) => {
      const nou = { ...v };
      for (const k of chei) {
        const r = nou[k];
        if (r) nou[k] = { ...r, modUrechi: 'lemn' };
      }
      return nou;
    });
    setUndeTinePuse(chei.length);
  };
  // Lista afișată: ordinea omului sau cea automată. Pentru rândurile legate și pentru risc, ce știe fiecare rând acum: piesa,
  // latura, despărțirea și valorile care unesc un V-carve (freza, adâncimea, pasul, sensul, fundul plat, incrustația în V;
  // ADR 0133 §2, ADR 0170) sau o incrustație cu pereți drepți (ADR 0171).
  const ordine = ordineMea ?? automata;
  const dupaCheie = new Map(operatii.map((o) => [o.cheie, o]));
  const numar = (s: string): string => String(citesteNumar(s));
  // Originea unei freze în plus (ADR 0300 §4, felia 16.A↑b-5): lucrarea unește regiunile doar cu aceleași freze, cu tot cu ea.
  const org = (x: OrigineFreza | null | undefined): string => (x ? JSON.stringify(x) : '');
  const randuriOrdine = new Map<string, RandOrdine>(operatii.flatMap((o): Array<readonly [string, RandOrdine]> => {
    const p = param[o.cheie];
    if (!p) return [];
    const vcarve = p.tip !== 'vcarve' ? null : [
      numar(p.numarScula), numar(p.diametruScula), p.formaScula, numar(p.unghiV), numar(p.varfV), numar(p.adancime), numar(p.pas), p.sens,
      p.fundPlat ? [numar(p.numarSculaFund), numar(p.diametruSculaFund), numar(p.pasLateralFund), org(p.origineFund),
        ...p.restFund.map((r) => `${numar(r.numar)} ${numar(r.diametru)} ${numar(r.pas)} ${org(r.origine)}`)].join(' ') : '',
      // Incrustația în V (ADR 0170, ADR 0172): lucrarea unește doar locașele cu aceeași incrustație, deci și rândurile se leagă
      // doar cu ea: cea scrisă de Exportă, cu banda ei, sau „de necitit” cât un câmp e greșit.
      p.incrustatie ? JSON.stringify(incrustatieVRand(p) ?? 'de necitit') : '',
    ].join('|');
    // Incrustația cu pereți drepți (ADR 0171) se taie tot ca o singură regiune, din operațiile cu aceleași valori: freza, adâncimea,
    // pasul, sensul, pasul lateral, frezele de rest, strategia, coborârea și incrustația (`valoriBuzunarDrept`, în lucrare).
    const lista = (l: readonly RandRest[]): string => l.map((r) => `${numar(r.numar)} ${numar(r.diametru)} ${numar(r.pas)} ${org(r.origine)}`).join(' ');
    const dreapta = p.tip !== 'buzunar' || !p.incrustatieDreapta ? null : [
      'drept', numar(p.numarScula), numar(p.diametruScula), numar(p.adancime), numar(p.pas), p.sens, numar(p.pasLateral), lista(p.rest),
      p.strategie === 'paralel' ? `paralel ${numar(p.unghiParalel)}` : p.coborare === 'plonjare' ? ''
        : [p.coborare, numar(p.unghiCoborare), p.coborare === 'zigzag' ? numar(p.lungimeZigzag) : p.coborare === 'elice' ? numar(p.razaElice) : ''].join(' '),
      numar(p.lateralInc), p.dopInc, p.sprijinInc, numar(p.jocInc), numar(p.fierastrauInc), numar(p.margineInc),
      p.frezaDop ? `${numar(p.numarSculaDop)} ${numar(p.diametruSculaDop)} ${numar(p.pasLateralDop)} ${org(p.origineDop)} ${lista(p.restDop)}` : '',
      // Locașul, treapta (ADR 0175) și punțile dopului decupat (ADR 0174): și ele despart regiunile lucrării.
      p.locasInc, p.treaptaInc === 'fara' ? '' : `${p.treaptaInc} ${numar(p.adancimeTreapta)} ${numar(p.latimeTreapta)}`,
      p.dopInc === 'decupat' ? `${numar(p.numarPunti)} ${numar(p.latimePunti)} ${numar(p.grosimePunti)}` : '',
    ].join('|');
    // Buzunarul, găurirea și V-carve-ul se scriu pe interior (`operatieDinDialog`), oricare ar fi latura rămasă în rând.
    const profil = p.tip === 'profil';
    return [[o.cheie, {
      piesa: o.cheie.slice(0, o.cheie.indexOf('/')), latura: profil ? p.latura : 'interior', despartire: profil && p.despartire, vcarve: vcarve ?? dreapta,
      ...(o.inauntru ? { inauntru: o.inauntru } : {}),
    }]];
  }));
  const legate = legaturi(ordine, randuriOrdine);
  const riscuriOrdine = ordineMea === null ? [] : riscuri(ordineMea, randuriOrdine);
  /** Ordinea omului cu rândul de pe locul `de` mutat pe `la`; rezultatul vechi și bifa riscului nu mai sunt ale ei. */
  const mutaRand = (de: number, la: number): void => {
    if (ordineMea === null) return;
    schimbat();
    setRiscAcceptat(false);
    setOrdineMea(muta(ordineMea, de, la));
  };
  /** Comută ordinea: cea automată (null) sau a omului, pornită din cea automată. */
  const alegeOrdine = (aMea: boolean): void => {
    if (aMea === (ordineMea !== null)) return;
    schimbat();
    setRiscAcceptat(false);
    setOrdineMea(aMea ? [...automata] : null);
  };
  /**
   * Frezele de rest ale unui rând (ADR 0093): câte un rând cu T, Ø și pasul, scos cu ×; „Adaugă” pune una cu T-ul următor
   * liber, jumătate din diametrul celei dinainte și pasul de 40 %. `fel`: lista buzunarului, a fundului plat sau a dopului cu
   * pereți drepți (ADR 0171; ultimele două, oprite fără bifă).
   */
  const frezeRest = (cheie: string, p: Rand, fel: 'buzunar' | 'fund' | 'dop', oprit: boolean): ReactNode => {
    const lista = fel === 'fund' ? p.restFund : fel === 'dop' ? p.restDop : p.rest;
    const prima = fel === 'fund' ? p.diametruSculaFund : fel === 'dop' ? p.diametruSculaDop : p.diametruScula;
    const pre = fel === 'buzunar' ? '' : `${fel}-`;
    const pune = (nou: readonly RandRest[]): void => { schimba(cheie, fel === 'fund' ? { restFund: nou } : fel === 'dop' ? { restDop: nou } : { rest: nou }); };
    const bune = restBun(lista, prima);
    const drepte = frezeOferite ? frezeOferite(RAND_DREPT) : [];
    const adauga = (): void => {
      // Numerele folosite: freza fiecărui rând, frezele de rest ale buzunarelor și, cu bifa pusă, freza fundului, a dopului și
      // ale lor.
      const toate = Object.values(param).flatMap((r) => [
        r.numarScula, ...(r.tip === 'buzunar' ? r.rest.map((x) => x.numar) : []),
        ...(r.tip === 'vcarve' && r.fundPlat ? [r.numarSculaFund, ...r.restFund.map((x) => x.numar)] : []),
        ...(r.tip === 'buzunar' && r.incrustatieDreapta && r.frezaDop ? [r.numarSculaDop, ...r.restDop.map((x) => x.numar)] : []),
        ...(r.tip === 'vcarve' && r.incrustatie && r.jurDop === 'banda' && r.decupareBanda && r.frezaBanda ? [r.numarSculaBanda] : []),
      ]);
      const t0 = Math.max(0, ...toate.map((x) => citesteNumar(x) ?? 0));
      const d0 = citesteNumar(lista.at(-1)?.diametru ?? prima) ?? 6, d = Math.round((d0 / 2) * 1000) / 1000;
      pune([...lista, { numar: text(Math.min(MARGINI_OPERATIE.numarScula, t0 + 1)), diametru: text(d), pas: text(pasLateralImplicit(d)), origine: null }]);
    };
    // Frezele oferite fiecărui rând (ADR 0300 §4, felia 16.A↑b-5): plate, mai mici decât freza dinainte. Coloana listei apare
    // doar dacă vreun rând are ce alege (sau o freză din bibliotecă).
    const oferiteRand = lista.map((_, k) => oferitePentruRest(drepte, k === 0 ? prima : lista[k - 1]?.diametru ?? ''));
    const cuBiblioteca = lista.some((r, k) => (oferiteRand[k]?.length ?? 0) > 0 || r.origine);
    const stari = lista.map((r) => stareOrigine({ unde: 'scula', origine: r.origine ?? null, diametru: r.diametru }, bibliotecaToata));
    return (
      <div className="campuri-rest" data-rest={fel === 'buzunar' ? cheie : `${fel}:${cheie}`}>
        {/* La buzunar, „Frezele de rest” e titlul grupului; la fundul plat și la dop, lista își spune numele (auditul exportului, 9). */}
        {fel !== 'buzunar' && <span className="titlu-rest" title={t('export.rest.titlu')}>{t('export.rest')}</span>}
        {lista.length > 0 && (
        <div className={cuBiblioteca ? 'tabel-rest cu-biblioteca' : 'tabel-rest'} role="table" aria-label={t('export.rest')}>
          <div className="rand-rest" role="row">
            {cuBiblioteca && <span role="columnheader" className="cap-biblioteca">{t('export.freza.biblioteca')}</span>}
            <span role="columnheader">{t('export.rest.cap.t')}</span>
            <span role="columnheader">{t('export.rest.cap.diametru')}</span>
            <span role="columnheader" title={t('export.pas-lateral.titlu')}>{t('export.pas-lateral')}</span>
            <span aria-hidden="true" />
          </div>
          {lista.map((r, k) => (
          <div className="rand-rest freza-rest" role="row" data-rest-rand={k} key={k}>
            {cuBiblioteca && ((oferiteRand[k]?.length ?? 0) > 0 || r.origine ? (
              <ListaBiblioteca data-camp={`${pre}rest-biblioteca`} oferite={oferiteRand[k] ?? []} origine={r.origine} oprit={oprit} eticheta={false}
                recunoscuta={stari[k]?.fel === 'recunoscuta' ? stari[k].freza.nume : undefined}
                onAlege={(f) => { alegeFreza(cheie, f, { rest: fel, k }); }}
                onMana={() => { pune(lista.map((x, i) => (i === k ? { ...x, origine: null } : x))); }} />
            ) : <span className="gol-biblioteca" />)}
            <input type="text" inputMode="numeric" value={r.numar} data-camp={`${pre}rest-scula`} disabled={oprit} aria-label={t('export.freza.numar')}
              className="numar-scula" aria-invalid={!bune[k]} onChange={(ev) => { pune(lista.map((x, i) => (i === k ? { ...x, numar: ev.target.value } : x))); }} />
            <input type="text" inputMode="decimal" value={r.diametru} data-camp={`${pre}rest-diametru`} disabled={oprit} aria-label={t('export.freza.diametru')}
              aria-invalid={!bune[k]} onChange={(ev) => { pune(lista.map((x, i) => (i === k ? { ...x, diametru: ev.target.value, origine: null } : x))); }} />
            <input type="text" inputMode="decimal" value={r.pas} data-camp={`${pre}rest-pas`} disabled={oprit} aria-label={t('export.pas-lateral')}
              title={t('export.pas-lateral.titlu')} aria-invalid={!bune[k]} onChange={(ev) => { pune(lista.map((x, i) => (i === k ? { ...x, pas: ev.target.value } : x))); }} />
            <button type="button" data-camp={`${pre}rest-scoate`} disabled={oprit} aria-label={t('export.rest.scoate')} title={t('export.rest.scoate')}
              onClick={() => { pune(lista.filter((_, i) => i !== k)); }}>×</button>
            {/* Nota frezei față de bibliotecă (ADR 0300 §5, felia 16.A↑b-4), pe tot rândul tabelului. */}
            {(stari[k]?.fel === 'schimbata' || stari[k]?.fel === 'stearsa') && (
              <div className="nota-rest">
                <NotaBiblioteca stare={stari[k] ?? null} origine={r.origine ?? null} oprit={oprit} fmt={fmtFreza}
                  peToate={stari[k]?.fel === 'schimbata' ? cuAceeasiFreza(param, bibliotecaToata, stari[k].freza.id) : 0}
                  onIa={(f) => { iaValorileNoi(cheie, { rest: fel, k }, f); }} onIaToate={iaValorileNoiPeToate}
                  inapoi={stari[k]?.fel === 'stearsa' ? inapoiLa(cheie, { rest: fel, k }) : undefined} />
              </div>
            )}
          </div>
          ))}
        </div>
        )}
        <button type="button" className="adauga-rest" data-camp={`${pre}rest-adauga`} disabled={oprit || lista.length >= MAXIM_REST} title={t('export.rest.titlu')}
          onClick={adauga}>
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
      // Freza din „Frezele mele” (ADR 0300 §4): originea ei, sau `null` (scrisă de mână: originea pleacă din document).
      origine: p.origineScula,
    };
    // V-carve-ul (ADR 0090): latura interior, nimic din profil; adâncimea e cea maximă. Fundul plat (ADR 0091): cu bifa pusă.
    if (p.tip === 'vcarve') {
      const numar = citesteNumar(p.numarSculaFund), diametru = citesteNumar(p.diametruSculaFund), pasLateral = citesteNumar(p.pasLateralFund);
      if (p.fundPlat && (numar === null || diametru === null || pasLateral === null)) return [];
      const restFund = citesteRest(p.restFund);
      if (p.fundPlat && restFund === null) return [];
      const fundPlat = p.fundPlat && numar !== null && diametru !== null && pasLateral !== null
        ? { numar, diametru, pasLateral, ...(restFund && restFund.length > 0 ? { rest: restFund } : {}), origine: p.origineFund } : null;
      // Incrustația (ADR 0170, ADR 0172): a rândului, cu banda lui (`incrustatieVRand`); `null` pe un V-carve obișnuit.
      const incrustatie = incrustatieVRand(p);
      if (incrustatie === undefined) return [];
      return [[o.cheie, { scula, latura: 'interior', sens: p.sens, adancime, pas, urechi: null, rampa: null, intrari: null, colturi: null, tip: 'vcarve', fundPlat, incrustatie }] as const];
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
      // Incrustația cu pereți drepți (ADR 0171): cu rolul ei, valorile rândului; fără el, `null` (un buzunar obișnuit). Documentul
      // cere și spațiul nefolosit (H pe față, g pe fund și la decupat): rămâne cel scris dacă e bun, altfel cel implicit.
      let incrustatieDreapta: IncrustatieDreaptaOperatie | null = null;
      if (p.incrustatieDreapta) {
        const jocLateral = citesteNumar(p.lateralInc), margine = citesteNumar(p.margineInc);
        const pastrat = (s: string, implicit: number): number => (inMargini(s, MARGINI_OPERATIE.adancime) ? citesteNumar(s) ?? implicit : implicit);
        const prinFoaie = p.locasInc === 'gaura';
        const joc = jocFolosit(p) ? citesteNumar(p.jocInc) : pastrat(p.jocInc, INCRUSTATIE_DREAPTA_IMPLICITA.joc);
        const fierastrau = spatiuFolosit(p) ? citesteNumar(p.fierastrauInc) : pastrat(p.fierastrauInc, INCRUSTATIE_DREAPTA_IMPLICITA.fierastrau);
        if (jocLateral === null || margine === null || joc === null || fierastrau === null) return [];
        // Treapta (ADR 0175): a rândului; fără ea, câmpul pleacă.
        let treapta: IncrustatieDreaptaOperatie['treapta'];
        if (p.treaptaInc !== 'fara') {
          const adancimeUmar = citesteNumar(p.adancimeTreapta), latimeUmar = citesteNumar(p.latimeTreapta);
          if (adancimeUmar === null || latimeUmar === null) return [];
          treapta = { adancime: adancimeUmar, latime: latimeUmar, ...(p.treaptaInc === 'exterior' ? { spre: 'exterior' as const } : {}) };
        }
        // Frezele dopului (răspunsul 4): cu bifa, prima și cele de rest; fără ea, ale locașului (câmpul pleacă).
        let frezeDop: FrezaRestOperatie[] | null = null;
        if (p.frezaDop) {
          const numar = citesteNumar(p.numarSculaDop), diametru = citesteNumar(p.diametruSculaDop), pasLateralDop = citesteNumar(p.pasLateralDop);
          const restDop = citesteRest(p.restDop);
          if (numar === null || diametru === null || pasLateralDop === null || restDop === null) return [];
          frezeDop = [{ numar, diametru, pasLateral: pasLateralDop, origine: p.origineDop }, ...restDop];
        }
        // Punțile dopului decupat (ADR 0174): ale rândului; pe dopul ridicat nu se scriu (câmpul pleacă).
        let punti: IncrustatieDreaptaOperatie['punti'];
        if (p.dopInc === 'decupat') {
          const numar = citesteNumar(p.numarPunti), latime = citesteNumar(p.latimePunti), grosime = citesteNumar(p.grosimePunti);
          if (numar === null || latime === null || grosime === null) return [];
          punti = { numar, latime, grosime };
        }
        incrustatieDreapta = {
          jocLateral, dop: p.dopInc, sprijin: p.sprijinInc, joc, fierastrau, margine, ...(frezeDop ? { frezeDop } : {}), ...(punti ? { punti } : {}),
          ...(prinFoaie ? { locas: 'gaura' as const } : {}), ...(treapta ? { treapta } : {}),
        };
      }
      return [[o.cheie, {
        scula, latura: 'interior', sens: p.sens, adancime, pas, urechi: null, rampa: null, intrari: null, colturi: null, tip: 'buzunar', pasLateral,
        ...(coborare ? { coborare } : {}), rest, ...strategie, incrustatieDreapta,
      }] as const];
    }
    // La locuri alese și la mijlocul laturilor (ADR 0211), numărul (oprit) rămâne al documentului, ori cel implicit, dacă textul
    // lui nu se citește.
    const numarScris = citesteNumar(p.numarUrechi);
    const numar = faraNumar(p.modUrechi) && (numarScris === null || !intregInMargini(p.numarUrechi, MARGINI_OPERATIE.urechi))
      ? o.valori.urechi?.numar ?? URECHI_IMPLICITE.numar : numarScris;
    const latime = citesteNumar(p.latimeUreche), grosime = citesteNumar(p.grosimeUreche);
    if (p.urechi && (numar === null || latime === null || grosime === null)) return [];
    const urechi = p.urechi && numar !== null && latime !== null && grosime !== null
      ? { numar, latime, grosime, ...(p.modUrechi !== 'egale' ? { mod: p.modUrechi } : {}) } : null;
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
    ...(gauriBune ? [] : operatii.flatMap((o) => motiveGaura(o.cheie, param[o.cheie])).slice(0, 1)),
    ...(vcarveBune ? [] : [t('motiv.vcarve-freza')]),
    ...(varfuriBune ? [] : [t('motiv.varf-invalid')]),
    ...(vPeLinie ? [] : [t('motiv.v-pe-linie')]),
    ...(funduriBune ? [] : [t('motiv.fund-plat-invalid', { n: MARGINI_OPERATIE.numarScula, diametru: fmtFreza.format(MARGINI_OPERATIE.diametru) })]),
    ...(resturiBune ? [] : [t('motiv.rest-invalid', { n: MARGINI_OPERATIE.numarScula })]),
    ...(strategiiBune ? [] : [t('motiv.strategie-invalida')]),
    ...(incrustatiiBune ? [] : [t('motiv.incrustatie-invalida', { max: fmtFreza.format(MARGINI_OPERATIE.margineDop) })]),
    ...(drepteBune ? [] : [t('motiv.incrustatie-dreapta-invalida', { max: fmtFreza.format(MARGINI_OPERATIE.margineDop) })]),
    ...(frezeDopBune ? [] : [t('motiv.freza-dop-invalida', { n: MARGINI_OPERATIE.numarScula, diametru: fmtFreza.format(MARGINI_OPERATIE.diametru) })]),
    ...(benziBune ? [] : [t('motiv.banda-invalida', { n: MARGINI_OPERATIE.numarScula })]),
    ...(puntiDopBune ? [] : [t('motiv.punti-dop-invalide', { n: MARGINI_OPERATIE.urechi })]),
    ...(supracursaBuna ? [] : [t('motiv.supracursa-invalida', { max: fmtFreza.format(SUPRACURSA_MAXIMA) })]),
    ...(motivNumeFisier === null ? [] : [t(`export.nume-fisier.${motivNumeFisier}`, { max: LUNGIME_NUME })]),
    ...(intrariBune ? [] : [operatii.some((o, i) => !randuri[i]?.intrari && param[o.cheie]?.rampa)
      ? t('motiv.intrari-invalide-rampa', {
        minim: fmtFreza.format(MARGINI_OPERATIE.razaIntrareMinimaRampa), raza: fmtFreza.format(MARGINI_OPERATIE.razaIntrare),
      })
      : t('motiv.intrari-invalide', {
        minim: fmtFreza.format(MARGINI_OPERATIE.razaIntrareMinima), raza: fmtFreza.format(MARGINI_OPERATIE.razaIntrare),
      })]),
  ].join(' ');

  /**
   * Motivul fiecărei verificări greșite a unui rând, spus în grupul câmpului de reparat (ADR 0290): aceleași texte ca sub
   * butoane, fără celelalte rânduri.
   */
  const motivVerdict = (k: keyof VerdictRand, p: Rand): string => {
    switch (k) {
      case 'scula': return t('motiv.scula-invalida', { n: MARGINI_OPERATIE.numarScula, diametru: fmtFreza.format(MARGINI_OPERATIE.diametru) });
      case 'adancime': case 'pas': return t('motiv.operatie-invalida');
      case 'numar': case 'latime': case 'grosime': return t('motiv.urechi-invalide', {
        n: MARGINI_OPERATIE.urechi, latime: fmtFreza.format(MARGINI_OPERATIE.latimeUreche), grosime: fmtFreza.format(MARGINI_OPERATIE.grosimeUreche),
      });
      case 'rampa': return t('motiv.rampa-invalida', {
        minim: fmtFreza.format(MARGINI_OPERATIE.lungimeRampaMinima), lungime: fmtFreza.format(MARGINI_OPERATIE.lungimeRampa),
      });
      case 'intrari': return p.rampa
        ? t('motiv.intrari-invalide-rampa', { minim: fmtFreza.format(MARGINI_OPERATIE.razaIntrareMinimaRampa), raza: fmtFreza.format(MARGINI_OPERATIE.razaIntrare) })
        : t('motiv.intrari-invalide', { minim: fmtFreza.format(MARGINI_OPERATIE.razaIntrareMinima), raza: fmtFreza.format(MARGINI_OPERATIE.razaIntrare) });
      case 'pasLateral': return t('motiv.pas-lateral-invalid', { max: ((d) => (d !== null ? fmtFreza.format(d / 2) : '–'))(citesteNumar(p.diametruScula)) });
      case 'coborare': return t('motiv.coborare-invalida', {
        unghiMinim: fmtFreza.format(MARGINI_OPERATIE.unghiCoborareMinim), unghi: fmtFreza.format(MARGINI_OPERATIE.unghiCoborare),
        lungime: fmtFreza.format(MARGINI_OPERATIE.lungimeZigzagMinima), raza: fmtFreza.format(MARGINI_OPERATIE.razaEliceMinima),
      });
      case 'retragere': return t('motiv.retragere-invalida', { max: MARGINI_OPERATIE.retragereCompleta });
      case 'vcarve': return t('motiv.vcarve-freza');
      case 'varf': return t('motiv.varf-invalid');
      case 'vPeLinie': return t('motiv.v-pe-linie');
      case 'fund': return t('motiv.fund-plat-invalid', { n: MARGINI_OPERATIE.numarScula, diametru: fmtFreza.format(MARGINI_OPERATIE.diametru) });
      case 'rest': return t('motiv.rest-invalid', { n: MARGINI_OPERATIE.numarScula });
      case 'strategie': return t('motiv.strategie-invalida');
      case 'incrustatie': return t('motiv.incrustatie-invalida', { max: fmtFreza.format(MARGINI_OPERATIE.margineDop) });
      case 'dreapta': return t('motiv.incrustatie-dreapta-invalida', { max: fmtFreza.format(MARGINI_OPERATIE.margineDop) });
      case 'frezaDop': return t('motiv.freza-dop-invalida', { n: MARGINI_OPERATIE.numarScula, diametru: fmtFreza.format(MARGINI_OPERATIE.diametru) });
      case 'banda': return t('motiv.banda-invalida', { n: MARGINI_OPERATIE.numarScula });
      case 'puntiDop': return t('motiv.punti-dop-invalide', { n: MARGINI_OPERATIE.urechi });
    }
  };
  /**
   * Greșelile unui rând, fiecare cu grupul în care se spune: verificările lui și, la Freza, un T al lui folosit cu altă freză.
   * Frezele de rest ale unui V-carve sunt ale fundului plat, deci se spun acolo.
   */
  const greseliRand = (cheie: string): Array<readonly [string, GrupExport]> => {
    const p = param[cheie];
    if (!p) return [];
    const out: Array<readonly [string, GrupExport]> = [];
    const pune = (m: string, g: GrupExport): void => { if (!out.some(([x, h]) => x === m && h === g)) out.push([m, g]); };
    for (const [k, g] of verdicteGresite(randBun(p))) pune(motivVerdict(k, p), k === 'rest' && p.tip === 'vcarve' ? 'fund' : g);
    // Un T folosit cu două freze se spune la fiecare loc al rândului unde e scris: freza, fundul plat, dopul, banda, frezele de rest.
    if (conflict) {
      const m = t('motiv.scula-conflict', { numar: conflict[0], diametre: [...conflict[1].values()].join(', ') });
      const e = (x: string): boolean => citesteNumar(x) === conflict[0];
      const vc = p.tip === 'vcarve', dop = p.tip === 'buzunar' && p.incrustatieDreapta && p.frezaDop;
      if (e(p.numarScula)) pune(m, 'freza');
      if (vc && p.fundPlat && (e(p.numarSculaFund) || p.restFund.some((r) => e(r.numar)))) pune(m, 'fund');
      if (p.tip === 'buzunar' && p.rest.some((r) => e(r.numar))) pune(m, 'rest');
      if (dop && (e(p.numarSculaDop) || p.restDop.some((r) => e(r.numar)))) pune(m, 'dop');
      if (vc && p.incrustatie && p.jurDop === 'banda' && p.decupareBanda && p.frezaBanda && e(p.numarSculaBanda)) pune(m, 'banda');
    }
    // Găurirea (ADR 0087): un cerc pe care freza scrisă nu-l poate găuri se spune lângă freză, înainte de clic (ADR 0291, felia
    // 28.8↑h; până acum, exportul îl refuza abia după clic, cu id-ul intern).
    for (const m of motiveGaura(cheie, p)) pune(m, 'freza');
    return out;
  };
  // Prima fișă cu o greșeală, în ordinea listei: „du-mă acolo” de lângă Exportă.
  const primaGresita: string | null = !supracursaBuna ? 'foaia' : !numeBun ? 'masina' : ordine.find((k) => greseliRand(k).length > 0) ?? null;
  /** Tăietura unui rând, ca valoare a cartonașului ei (și poza ei, în listă). */
  const taieturaRand = (p: Rand): Latura | 'buzunar' | 'gaurire' | 'vcarve' | 'incrustatie' | 'incrustatie-drept' =>
    p.tip === 'vcarve' ? (p.incrustatie ? 'incrustatie' : 'vcarve') : p.tip === 'buzunar' ? (p.incrustatieDreapta ? 'incrustatie-drept' : 'buzunar')
      : p.tip === 'gaurire' ? 'gaurire' : p.latura;
  /** Numele tăieturii unui rând, scurt, pentru listă (aceleași cuvinte ca în lista „Tăietura”). */
  const numeTaietura = (p: Rand): string => p.tip === 'buzunar' ? t(p.incrustatieDreapta ? 'export.latura.incrustatie-drept' : CHEI_LATURA.buzunar)
    : p.tip === 'gaurire' ? t('export.latura.gaurire') : p.tip === 'vcarve' ? t(p.incrustatie ? 'export.latura.incrustatie' : 'export.latura.vcarve')
      : t(CHEI_LATURA[p.latura]);
  const cuRezultat = stare?.ok === true;
  /**
   * Aduce fișa aleasă sus în panou. Cu `repara` („Du-mă la …”), aduce apoi în vedere prima greșeală a fișei (28.8↑h-2): grupul ei,
   * de la titlu până la textul greșelii, dacă încape; altfel câmpul greșit și textul; altfel textul, întreg. Focusul trece pe
   * câmpul greșit, fără altă derulare. Capul fișei poate ieși sus: greșeala de sub prima înălțime a panoului nu mai rămâne ascunsă.
   */
  const du = (cheie: string, repara = false): void => {
    const p = panou.current;
    const sel = cheie === 'foaia' || cheie === 'masina' || cheie === 'rezultatul' ? `[data-fisa="${cheie}"]` : `[data-fisa="op"][data-operatie="${CSS.escape(cheie)}"]`;
    const f = p?.querySelector<HTMLElement>(sel);
    if (!p || !f) return;
    p.scrollTop += f.getBoundingClientRect().top - p.getBoundingClientRect().top;
    setCurent(cheie);
    if (!repara) return;
    const RAU = '[aria-invalid="true"]:not(:disabled)';
    const g = [...f.querySelectorAll<HTMLElement>('[data-grup]')].find((x) => x.querySelector(`[data-greseala], ${RAU}`) !== null);
    const camp = (g ?? f).querySelector<HTMLElement>(RAU), text = (g ?? f).querySelector<HTMLElement>('[data-greseala]');
    const v = p.getBoundingClientRect(), m = 8, loc = v.height - 2 * m;
    const sus = (e: Element | null | undefined): number => e ? e.getBoundingClientRect().top : Infinity;
    const jos = (e: Element | null | undefined): number => e ? e.getBoundingClientRect().bottom : -Infinity;
    // Întinderile, de la cea mai largă: grupul (titlul, câmpul, textul), câmpul și textul, doar textul (sau doar câmpul).
    const titlu = g?.querySelector('h4');
    const intinderi: (readonly [number, number])[] = [
      [Math.min(sus(titlu), sus(camp), sus(text)), Math.max(jos(camp), jos(text))],
      [Math.min(sus(camp), sus(text)), Math.max(jos(camp), jos(text))],
      text ? [sus(text), jos(text)] : [sus(camp), jos(camp)],
    ];
    const [a, b] = intinderi.find(([x, y]) => Number.isFinite(x) && Number.isFinite(y) && y - x <= loc) ?? intinderi[2] ?? [NaN, NaN];
    if (Number.isFinite(a) && Number.isFinite(b)) {
      // Cât mai puțin: doar dacă întinderea iese jos (sau sus), iar sus are întâietate când nu încape.
      let d = b > v.bottom - m ? b - (v.bottom - m) : 0;
      if (a - d < v.top + m) d = a - (v.top + m);
      p.scrollTop += d;
    }
    camp?.focus({ preventScroll: true });
  };
  /** Fișa de sus a panoului, cât derulează omul: e cea marcată în listă. */
  const urmareste = (): void => {
    const p = panou.current;
    if (!p) return;
    const sus = p.getBoundingClientRect().top + 40;
    let gasit: string | null = null;
    for (const f of p.querySelectorAll<HTMLElement>('[data-fisa]')) {
      if (f.getBoundingClientRect().top > sus) break;
      gasit = f.dataset['fisa'] === 'op' ? f.dataset['operatie'] ?? null : f.dataset['fisa'] ?? null;
    }
    if (gasit !== null && gasit !== curent) setCurent(gasit);
  };
  /**
   * Câmpul sub maus sau cu focusul: explicația lui (titlul) ia locul celei a grupului, iar cota lui se aprinde în desen (28.8↑b);
   * un câmp fără titlu aprinde doar cota. Caseta explicației își ține înălțimea (`rezervaExplicatii`), deci fișa nu se mută.
   */
  const arata = (ev: { readonly target: EventTarget }): void => {
    const el = ev.target instanceof Element ? ev.target : null;
    const g = el?.closest<HTMLElement>('[data-grup]');
    const f = g?.closest<HTMLElement>('[data-fisa]');
    if (!el || !g || !f || el.closest('[data-desen]')) return;
    const cu = el.closest<HTMLElement>('[title]');
    const camp = el.closest<HTMLElement>('[data-camp]') ?? el.closest('label')?.querySelector<HTMLElement>('[data-camp]') ?? null;
    const loc = `${f.dataset['fisa'] === 'op' ? f.dataset['operatie'] ?? '' : f.dataset['fisa'] ?? ''}|${g.dataset['grup'] ?? ''}`;
    const text = cu && g.contains(cu) ? cu.getAttribute('title') ?? '' : '';
    const numeCamp = camp && g.contains(camp) ? camp.dataset['camp'] ?? '' : '';
    if (text === '' && numeCamp === '') return;
    if (activ?.loc !== loc || activ.text !== text || activ.camp !== numeCamp) setActiv({ loc, text, camp: numeCamp });
  };
  // După un export bun, Rezultatul vine sus (fișierul, avertismentele, rezumatul), o singură dată: simularea sosește mai târziu
  // și schimbă starea din nou, iar panoul nu sare iar sub mausul omului. Cu o confirmare cerută, omul rămâne jos.
  const cuRezultatInainte = useRef(false);
  useEffect(() => {
    if (cuRezultat && !cuRezultatInainte.current) du('rezultatul');
    cuRezultatInainte.current = cuRezultat;
  }, [cuRezultat]);
  // Caseta explicației fiecărui grup își ține înălțimea celui mai lung text al lui (al grupului sau al unui câmp): altfel, la
  // clic, focusul schimbă textul la apăsare, grupul își schimbă înălțimea, iar ce e dedesubt fuge de sub cursor înainte de ridicare.
  useLayoutEffect(() => { rezervaExplicatii(panou.current); });
  // Grupul fișei unei operații (ADR 0290): explicația câmpului activ (sau a grupului) în stânga, unde vin desenele din 28.8↑b,
  // câmpurile și greșelile lui în dreapta.
  const grup = (id: GrupExport, fisa: string, corp: ReactNode, greseli: readonly string[] = [], desen?: (c: DesenComun) => ReactNode): ReactNode => {
    const loc = `${fisa}|${id}`, aici = activ?.loc === loc ? activ : null;
    return (
      <div className="dx-grup" data-grup={id} key={id}>
        <div className="dx-stanga">
          {desen && <figure className="dx-desen" data-desen>{desen({ f: (x) => fmtTrecere.format(x), fz: (x) => fmtFreza.format(x), aprins: aici && aici.camp !== '' ? [aici.camp] : [] })}</figure>}
          <p className="dx-explicatie" data-explicatie data-implicit={t(`export.grup.${id}.text` as CheieSimpla)} aria-live="polite">
            {aici && aici.text !== '' ? aici.text : t(`export.grup.${id}.text` as CheieSimpla)}
          </p>
        </div>
        <div className="dx-campuri">
          <h4>{t(`export.grup.${id}` as CheieSimpla)}</h4>
          {corp}
          {greseli.map((g) => <p className="dx-greseala" data-greseala key={g}>{g}</p>)}
        </div>
      </div>
    );
  };
  // Ce îi trebuie fișei unei operații (ADR 0290, felia 28.8↑f-3): aceeași componentă o pot pune Clasicul și Pas cu pas.
  const contextFisa: ContextFisa = {
    dupaCheie, param, total: ordine.length, doarCitire, schimba, randBun, greseliRand, conflict, hartie: hartieRandului, taieturaRand,
    text, fmtFreza, fmtTrecere, grosimeFoaie, supracursaCitita, cuSupracursa, onAlegeUrechi, frezeRest, grup, frezeOferite, alegeFreza,
    bibliotecaToata, iaValorileNoi, iaValorileNoiPeToate, inapoi: inapoiLa,
  };
  return (
    <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="export-titlu" ref={radacina}
      onPointerDown={(e) => { apasatAfara.current = e.target === e.currentTarget; }}
      onPointerUp={(e) => { ridicatAfara.current = e.target === e.currentTarget; }}
      onClick={(e) => {
        const afara = apasatAfara.current && ridicatAfara.current && e.target === e.currentTarget;
        apasatAfara.current = false;
        ridicatAfara.current = false;
        if (afara) onInchide();
      }}>
      <div className="dialog-cutie dialog-export" ref={cutie} tabIndex={-1}>
        <h2 id="export-titlu">{foaie === undefined ? t('export.titlu', { post: postAles?.nume ?? '' })
          : t('export.titlu.foaie', { post: postAles?.nume ?? '', foaie: toate ? t('export.foi.toate', { n: foi ?? 0 }) : foaie })}</h2>
        <div className="dx-corp">
          <nav className="dx-lista" data-lista aria-label={t('export.lista')}>
            <span className="dx-sectiune">{t('export.lista.inainte')}</span>
            <button type="button" className="dx-nav" data-nav="foaia" aria-current={curent === 'foaia'} data-gresit={supracursaBuna ? undefined : ''}
              onClick={() => { du('foaia'); }}>
              <span className="dx-nume">{t('export.fisa.foaia')}</span>
              <span className="dx-meta">{t(CHEI_COLT[origine])} · {t(z0 === 'sus' ? 'export.lista.z0.sus' : 'export.lista.z0.jos')}</span>
            </button>
            <button type="button" className="dx-nav" data-nav="masina" aria-current={curent === 'masina'} data-gresit={numeBun ? undefined : ''} onClick={() => { du('masina'); }}>
              <span className="dx-nume">{t('export.fisa.masina')}</span>
              <span className="dx-meta">{postAles?.nume ?? ''} · {unitati === 'inch' ? 'inch' : 'mm'}</span>
            </button>
            <span className="dx-sectiune">{t('export.lista.operatii')}</span>
        <div className="ordine-taierii" data-testid="ordine-taierii">
          <span className="eticheta">{t('export.ordine')}</span>
          <div role="group" aria-label={t('export.ordine')}>
            <button type="button" aria-pressed={ordineMea === null} data-ordine="automata" disabled={doarCitire} onClick={() => { alegeOrdine(false); }}>
              {t('export.ordine.automata')}
            </button>
            <button type="button" aria-pressed={ordineMea !== null} data-ordine="a-mea" disabled={doarCitire} onClick={() => { alegeOrdine(true); }}>
              {t('export.ordine.a-mea')}
            </button>
          </div>
          <span className="nota">{t(ordineMea === null ? 'export.ordine.nota.automata' : 'export.ordine.nota.a-mea')}</span>
          {ordineMea !== null && (
            <button type="button" data-ordine="inapoi" disabled={doarCitire} onClick={() => { alegeOrdine(false); }}>{t('export.ordine.inapoi')}</button>
          )}
        </div>
            {ordine.map((cheie, loc) => {
              const o = dupaCheie.get(cheie);
              const p = o ? param[o.cheie] : undefined;
              if (!o || !p) return null;
              const legat = legate.get(o.cheie);
              const mana = ordineMea !== null && !doarCitire;
              const gresit = greseliRand(o.cheie).length > 0;
              return (
                <div className={tras === o.cheie ? 'dx-nav-op tras' : 'dx-nav-op'} key={o.cheie} data-nav-op={o.cheie}
                  onDragOver={mana && tras !== null ? (ev) => { ev.preventDefault(); ev.dataTransfer.dropEffect = 'move'; } : undefined}
                  onDrop={mana && tras !== null ? (ev) => { ev.preventDefault(); mutaRand(ordine.indexOf(tras), loc); setTras(null); } : undefined}>
                  <span className="ordine">
                    {mana && (
                      <button type="button" className="trage" draggable data-trage={o.cheie} aria-label={t('export.ordine.trage', { n: loc + 1 })}
                        title={t('export.ordine.trage', { n: loc + 1 })}
                        onDragStart={(ev) => { ev.dataTransfer.setData('text/plain', o.cheie); ev.dataTransfer.effectAllowed = 'move'; setTras(o.cheie); }}
                        onDragEnd={() => { setTras(null); }}>
                        <svg viewBox="0 0 10 16" width="10" height="16" aria-hidden="true">
                          <circle cx="3" cy="3" r="1.4" /><circle cx="7" cy="3" r="1.4" /><circle cx="3" cy="8" r="1.4" />
                          <circle cx="7" cy="8" r="1.4" /><circle cx="3" cy="13" r="1.4" /><circle cx="7" cy="13" r="1.4" />
                        </svg>
                      </button>
                    )}
                    <span className="loc" data-loc={loc + 1}>{loc + 1}</span>
                    {legat !== undefined && (
                      <span className="legat" data-legat={legat} title={t('export.ordine.legat.titlu', { n: legat })}>{t('export.ordine.legat', { n: legat })}</span>
                    )}
                    {/* Săgețile, una peste alta (coloana rămâne îngustă), desenate: glifele ↑ ↓ ar veni din alt font, colorate. */}
                    {mana && (
                      <span className="sageti">
                        <button type="button" data-sus={o.cheie} disabled={loc === 0} aria-label={t('export.ordine.sus', { n: loc + 1 })}
                          title={t('export.ordine.sus', { n: loc + 1 })} onClick={() => { mutaRand(loc, loc - 1); }}>
                          <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M6 2.5 10.5 8.5H1.5Z" /></svg>
                        </button>
                        <button type="button" data-jos={o.cheie} disabled={loc === ordine.length - 1} aria-label={t('export.ordine.jos', { n: loc + 1 })}
                          title={t('export.ordine.jos', { n: loc + 1 })} onClick={() => { mutaRand(loc, loc + 1); }}>
                          <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M6 9.5 1.5 3.5H10.5Z" /></svg>
                        </button>
                      </span>
                    )}
                  </span>
                  <button type="button" className="dx-nav" data-nav={o.cheie} aria-current={curent === o.cheie} data-gresit={gresit ? '' : undefined}
                    onClick={() => { du(o.cheie); }}>
                    <span className="dx-nume">{o.descriere}</span>
                    <span className="dx-meta"><Poza k={`latura.${taieturaRand(p)}`} />{numeTaietura(p)} · T{p.numarScula} Ø{p.diametruScula} · {p.adancime} mm</span>
                  </button>
                </div>
              );
            })}
            {cuRezultat && (
              <button type="button" className="dx-nav" data-nav="rezultatul" aria-current={curent === 'rezultatul'}
                data-avertisment={stare?.ok && stare.avertismente.length > 0 ? '' : undefined} onClick={() => { du('rezultatul'); }}>
                <span className="dx-nume">{t('export.fisa.rezultatul')}</span>
                {stare?.ok && (
                  <span className="dx-meta">{[
                    ...(stare.rezumat.ok ? [durata(stare.rezumat.total.secunde, limba)] : []),
                    ...(stare.avertismente.length > 0 ? [t('export.rezultat.meta.avertismente', { n: stare.avertismente.length })] : []),
                  ].join(' · ')}</span>
                )}
              </button>
            )}
          </nav>
          <div className="dx-fise" data-fise ref={panou} onScroll={urmareste} onFocus={arata} onPointerOver={arata}>
            <section className="dx-fisa" data-fisa="foaia">
              <h3>{t('export.fisa.foaia')}</h3>
              {(foi ?? 0) > 1 && grup('foi', 'foaia', <div className="dx-rand">
        {(foi ?? 0) > 1 && (
          <div className="ordine-taierii" data-testid="export-foi-alegere">
            <span className="eticheta">{t('export.foi')}</span>
            <div className="dx-carduri mari" role="group" aria-label={t('export.foi')}>
              <button type="button" className="dx-card" aria-pressed={!toate} data-foi="activa" onClick={() => { setToate(false); }}>
                <Poza k="foi.activa" /><span>{t('export.foi.activa')}</span>
              </button>
              <button type="button" className="dx-card" aria-pressed={toate} data-foi="toate" onClick={() => { setToate(true); }}>
                <Poza k="foi.toate" /><span>{t('export.foi.toate', { n: foi ?? 0 })}</span>
              </button>
            </div>
            {toate && <span className="nota" data-testid="export-foi-nota">{t('export.foi.nota')}</span>}
          </div>
        )}
              </div>)}
              {grup('origine', 'foaia', <div className="dx-rand">
          <label>
            {t('export.origine')}
            <select value={origine} data-camp="origine" onChange={(e) => { schimbat(); setOrigine(e.target.value as (typeof ORIGINI)[number]); }}>
              {ORIGINI.map((c) => <option key={c} value={c}>{t(CHEI_COLT[c])}</option>)}
            </select>
          </label>
              </div>, [], () => <DesenColt colt={origine} nume={t(CHEI_COLT[origine])} onColt={(c) => { schimbat(); setOrigine(c); }} />)}
              {grup('z0', 'foaia', <div className="dx-rand">
          <label>
            {t('export.z0')}
            <select value={z0} data-camp="z0" onChange={(e) => { schimbat(); setZ0(e.target.value === 'jos' ? 'jos' : 'sus'); }}>
              <option value="sus">{t('export.z0.sus')}</option>
              <option value="jos">{t('export.z0.jos')}</option>
            </select>
          </label>
          {/* Supracursa (ADR 0176): nu scrie în document, deci rămâne deschisă și când fila doar citește. */}
          <label title={t('export.supracursa.titlu', { max: fmtFreza.format(SUPRACURSA_MAXIMA) })}>
            {t('export.supracursa')}
            <input type="text" inputMode="decimal" value={supracursa} data-camp="supracursa" aria-invalid={!supracursaBuna}
              onChange={(e) => { schimbat(); onSupracursa(e.target.value); }} />
          </label>
          {/* Bifa tăieturilor cât foaia (ADR 0177), implicit pusă; fără supracursă, oprită. */}
          <label className="alegere bifa-supracursa" title={t('export.supracursa.prin-foaie.titlu')}>
            <input type="checkbox" checked={prinFoaie} data-camp="supracursa-prin-foaie" disabled={!cuSupracursa}
              onChange={(e) => { schimbat(); onPrinFoaie(e.target.checked); }} />
            {t('export.supracursa.prin-foaie')}
          </label>
              </div>, supracursaBuna ? [] : [t('motiv.supracursa-invalida', { max: fmtFreza.format(SUPRACURSA_MAXIMA) })],
              (c) => <DesenZ0 c={c} z0={z0} supracursa={supracursaBuna ? supracursaCitita : null} prinFoaie={prinFoaie} />)}
            </section>
            <section className="dx-fisa" data-fisa="masina">
              <h3>{t('export.fisa.masina')}</h3>
              {grup('post', 'masina', <div className="dx-rand">
          <label title={t('export.post.titlu')}>
            {t('export.post')}
            <select value={post} data-camp="post" onChange={(e) => {
              const id = POSTURI_EXPORT.find((x) => x.id === e.target.value)?.id;
              if (id) { schimbat(); setPost(id); }
            }}>
              {POSTURI_EXPORT.map((x) => <option key={x.id} value={x.id}>{x.nume}</option>)}
            </select>
          </label>
        {postAles && !postAles.probat && (
          <p className="nota" data-testid="post-documentat">{t('export.post.documentat', { nume: postAles.nume })}</p>
        )}
        {postAles && !postAles.sender && (
          <p className="nota" data-testid="post-descarcat">{t('export.post.descarcat', { nume: postAles.nume })}</p>
        )}
        {postAles && postAles.setari.length > 0 && (
          <p className="nota" data-testid="post-setari">{t('export.post.setari', { setari: postAles.setari.join('; ') })}</p>
        )}
              </div>)}
              {grup('unitati', 'masina', <div className="dx-rand">
          <Cartonase data-camp="unitati" poze="unitati" eticheta={t('export.unitati')} nume="unitati" valoare={unitati}
            variante={[{ v: 'mm', text: t('export.unitati.mm') }, ...(postAles?.inch !== false ? [{ v: 'inch' as const, text: t('export.unitati.inch') }] : [])]}
            onAlege={(v) => { schimbat(); setUnitati(v); }} />
              </div>)}
              {grup('fisier', 'masina', <div className="dx-rand">
          <label title={t('export.nume-fisier.titlu')}>
            {t('export.nume-fisier')}
            <input type="text" value={numeScurt ? '' : numeFisier} data-camp="nume-fisier" aria-invalid={!numeBun} disabled={numeScurt}
              spellCheck={false} autoComplete="off" onChange={(e) => { schimbat(); setNumeAles(e.target.value); }} />
          </label>
          <span className="nota-camp" data-nume-rezultat>{numeScurt
            ? t('export.nume-fisier.scurt', { post: postAles?.nume ?? '', nume: `CNCVS2.${(postAles?.extensie ?? 'nc').toUpperCase()}` })
            : t('export.nume-fisier.rezultat', { nume: toate ? `${numeFisier}-foile.zip` : scule.size > 1 && strategie === 'fisiere-separate'
              ? `${numeFisier}-1-T….${postAles?.extensie ?? 'nc'}` : `${numeFisier}.${postAles?.extensie ?? 'nc'}` })}</span>
              </div>, motivNumeFisier === null ? [] : [t(`export.nume-fisier.${motivNumeFisier}`, { max: LUNGIME_NUME })])}
              {scule.size > 1 && grup('schimbare', 'masina', <div className="dx-rand">
          {scule.size > 1 && (
            <Cartonase<StrategieScula> data-camp="strategie" poze="strategie" eticheta={t('export.strategie')} nume="strategie-masina" valoare={strategie} mari
              titlu={t('export.strategie.titlu')} variante={(postAles?.strategii ?? []).map((x) => ({ v: x, text: t(`export.strategie.${x}` as CheieSimpla) }))}
              onAlege={(v) => { schimbat(); setStrategie(v); }} />
          )}
              </div>)}
              {grup('setari', 'masina', <div className="dx-coloana">
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
              </div>)}
            </section>
            {ordine.map((cheie, loc) => <FisaOperatie key={cheie} cheie={cheie} loc={loc} c={contextFisa} />)}
            {cuRezultat && (
              <section className="dx-fisa" data-fisa="rezultatul">
                <h3>{t('export.fisa.rezultatul')}</h3>
                {/* Întâi ce e de văzut înaintea tăierii, apoi fișierele, timpul și simularea (ADR 0290, felia 28.8↑f-2). */}
                {stare?.ok && (stare.avertismente.length > 0 || (undeTine.length > 0 && !doarCitire)) && (
                  <div className="dx-rez" data-rezultat="avertismente">
                    <h4>{t('export.rezultat.avertismente')}</h4>
                    {stare.avertismente.length > 0 && (
                      <ul className="avertisment" data-testid="export-avertismente">
                        {stare.avertismente.map((a) => <li key={a}>{t('export.avertisment', { text: a })}</li>)}
                      </ul>
                    )}
                    {undeTine.length > 0 && !doarCitire && (
                      <div className="butoane">
                        <button type="button" data-buton="unde-tine" title={t('export.urechi.undeTine.titlu')} onClick={puneUndeTine}>{t('export.urechi.undeTine')}</button>
                      </div>
                    )}
                  </div>
                )}
                <div className="dx-rez" data-rezultat="fisiere">
                  <h4>{t('export.rezultat.fisiere')}</h4>
                  {stare?.ok && stare.foi && <ListaFoi foi={stare.foi} sha256={stare.sha256} limba={limba} />}
                  {stare?.ok && !stare.foi && (stare.fisiere && stare.fisiere.length > 1
                    ? (
                      <ul role="status" data-testid="export-stare">
                        {stare.fisiere.map((f) => <li key={f.nume} data-fisier={f.nume}>{t('export.gata.fisier', { nume: f.nume, n: f.linii, sha: f.sha256 })}</li>)}
                      </ul>
                    )
                    : <p role="status" data-testid="export-stare" {...(stare.nume ? { 'data-fisier': stare.nume } : {})}>
                      {stare.nume ? t('export.gata.fisier', { nume: stare.nume, n: stare.linii, sha: stare.sha256 }) : t('export.gata', { n: stare.linii, sha: stare.sha256 })}
                    </p>)}
                  {stare?.ok && stare.dopuri && stare.dopuri.length > 0 && (
                    <ul className="dopuri" data-testid="export-dopuri" aria-live="polite">
                      {stare.dopuri.map((d) => (
                        <li key={d.nume} data-fisier={d.nume}>
                          {t(d.exacta ? 'export.gata.dop-decupat' : 'export.gata.dop', {
                            nume: d.nume, latime: fmtFreza.format(d.latime), inaltime: fmtFreza.format(d.inaltime), grosime: fmtFreza.format(d.grosimeMinima),
                            n: d.linii, sha: d.sha256,
                          })}
                        </li>
                      ))}
                    </ul>
                  )}
                  {stare?.ok && onDeschideInMasina && (
                    <div className="butoane">
                      <button type="button" data-buton="in-masina" title={t('export.in-masina.titlu')} onClick={onDeschideInMasina}>{t('export.in-masina')}</button>
                    </div>
                  )}
                </div>
                {stare?.ok && <div className="dx-rez" data-rezultat="timp"><Rezumat r={stare.rezumat} operatii={operatii} limba={limba} /></div>}
                {stare?.ok && <div className="dx-rez" data-rezultat="simulare"><PrevizualizareSimulare s={stare.simulare} limba={limba} /></div>}
              </section>
            )}
            {/* Loc sub ultima fișă, ca un clic în listă s-o aducă și pe ea sus. */}
            <div className="dx-capat" aria-hidden="true" />
          </div>
        </div>
        <div className="dx-jos">
          {!valid && (
            <div className="dx-invalid">
              <p role="status" className="avertisment" data-testid="export-invalid">{motivInvalid}</p>
              {primaGresita !== null && (
                <button type="button" className="dx-du" data-du={primaGresita} onClick={() => { du(primaGresita, true); }}>
                  {t('export.du', { nume: primaGresita === 'foaia' ? t('export.fisa.foaia') : primaGresita === 'masina' ? t('export.fisa.masina') : dupaCheie.get(primaGresita)?.descriere ?? primaGresita })}
                </button>
              )}
            </div>
          )}
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
        {pl && textPlacute && (pl.confirmare ? (
          <div className="confirmare-iesire" data-testid="placute-iesire">
            <div role="alert"><p>{textPlacute}</p></div>
            <label>
              <input type="checkbox" checked={!placuteOprite} data-camp="confirma-placute"
                onChange={(e) => { setPlacuteVazute(e.target.checked ? pl : null); }} />
              {t('export.placute.confirma')}
            </label>
          </div>
        ) : <p role="status" className="avertisment" data-testid="placute-iesire">{textPlacute}</p>)}
        {riscuriOrdine.length > 0 && (
          <div className="confirmare-iesire" data-testid="risc-ordine">
            <div role="alert">
              {riscuriOrdine.map((r) => (
                <p key={`${r.fel}-${r.a}-${r.b}`}>{t(r.fel === 'exterior' ? 'export.ordine.risc.exterior' : 'export.ordine.risc.despartire', { a: r.a, b: r.b })}</p>
              ))}
            </div>
            <label>
              <input type="checkbox" checked={riscAcceptat} data-camp="confirma-ordine" onChange={(e) => { setRiscAcceptat(e.target.checked); }} />
              {t('export.ordine.confirma')}
            </label>
          </div>
        )}
          {undeTinePuse !== null && !stare && (
            <p role="status" className="nota" data-nota="unde-tine-puse">{t('export.urechi.undeTine.puse', { n: undeTinePuse })}</p>
          )}
        <div className="butoane">
          <button type="button" disabled={!valid || (cere !== undefined && !bifat) || (riscuriOrdine.length > 0 && !riscAcceptat) || placuteOprite}
            data-buton="exporta" data-trimite={trimiteAcum || undefined} title={valid ? undefined : motivInvalid}
            onClick={() => {
              if (!valid || (riscuriOrdine.length > 0 && !riscAcceptat) || placuteOprite) return;
              onExporta({
                origine, z0, post, unitati, valori: valori(), ...(scule.size > 1 && strategie ? { strategieScula: strategie } : {}),
                ...(cere && bifat ? { confirmareIesire: cere } : {}), ordine: ordineMea, ...(toate ? { toateFoile: true } : {}),
                // Fără supracursă (0), cererea e cea de dinainte (ADR 0176); cu ea, și bifa tăieturilor cât foaia (ADR 0177).
                ...(cuSupracursa && supracursaCitita !== null ? { supracursa: supracursaCitita, ...(prinFoaie ? { prinFoaie: true } : {}) } : {}),
                // Numele ales (ADR 0291 §5) pleacă doar când nu e chiar baza de azi: altfel, cererea de dinainte.
                ...(!numeScurt && numeFisier !== bazaFisier(origine) ? { numeFisier } : {}),
              });
            }}>
            {t(trimiteAcum ? 'export.trimite' : 'export.exporta')}
          </button>
          <button type="button" onClick={onInchide}>{t('export.inchide')}</button>
          {onRaport && <button type="button" data-buton="raport" onClick={() => { onRaport({ origine, z0 }); }}>{t('export.raport.deschide')}</button>}
        </div>
          {stare && !stare.ok && !cere && <p role="status" className="avertisment" data-testid="export-stare">{t('export.eroare', { motiv: stare.motiv })}</p>}
        </div>
      </div>
    </div>
  );
}
