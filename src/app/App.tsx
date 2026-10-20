import { Fragment, lazy, Suspense, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Panza } from '../canvas/Panza.tsx';
import { treaptaZoom, type Bucata, type GestDesen, type Lipeste, type Vedere } from '../canvas/protocol.ts';
import type { StareStrat } from '../canvas/StratTraseu.tsx';
import type { Miscare, Program } from '../ir/ir.ts';
import { CUTIE_GOALA, uneste } from '../geom/cutie.ts';
import { incarcaLimba, t, type CheieSimpla } from '../i18n/t.ts';
import { LIMBI, type Limba } from '../i18n/tipuri.ts';
import { avertismente } from '../model/avertismente.ts';
import { documentNou, type Document, type Operatie } from '../model/document.ts';
import { cutieElement } from '../model/forme.ts';
import { istoricNou, type Istoric } from '../model/jurnal.ts';
import { elementeFoaie, type ElementLume } from '../model/lume.ts';
import { creeazaRegistru, ruleaza, stare, toate, type RezultatActiune } from '../ui/actiuni.ts';
import { ACTIUNI_DOCUMENT, incarcaAlegerea, type ContextDocument } from '../ui/actiuniDocument.ts';
import {
  ARANJAMENT_MODERN, cheieIntrare, COMUTA_PANOU, PANOURI,
  type Aranjament, type IdCip, type IdControl, type IdPanou, type IdZona, type Intrare, type Unealta,
} from '../ui/aranjament.ts';
import { CipCursor, CipZoom, semnal, type PunctFoaie, type Semnal } from '../ui/CipuriVedere.tsx';
import { ACTIUNI_VEDERE, type ContextVedere } from '../ui/actiuniVedere.ts';
import { actiuneaTastei, tastaActiunii, tastaApasata } from '../ui/scurtaturi.ts';
import { ACTIUNI_EXPORT, type ContextExport, type ParametriExport, type RezultatExport } from '../ui/actiuniExport.ts';
import {
  ACTIUNI_IMPORT, preincarcaImport, type ContextImport, type FisierImport, type ImportPregatit, type PrevizualizareImport,
} from '../ui/actiuniImport.ts';
import type { CerereExport, StareExport } from '../ui/DialogExport.tsx';
import type { RezumatJob } from '../ui/actiuniExportTipuri.ts';
import { incarcaNivelPiesa, ListaVectori, type RandLista } from '../ui/ListaVectori.tsx';
import { useLimba } from '../ui/useLimba.ts';
import type { RezultatConfig } from './config.ts';
import { listaDesen } from './desen.ts';
import type { Jurnal } from './jurnalErori.ts';
import { ConflictDeScriere, type DepozitProiect, type ProiectDeschis } from './proiectLocal.ts';

type Props = {
  readonly config: RezultatConfig;
  readonly jurnal: Jurnal;
  readonly diagnostic: string | null;
  readonly alegeLimba: (l: Limba) => void;
  /** Tema aleasă (`TEME`): o pune pe pagină și o ține minte în browser. */
  readonly alegeTema: (tema: string) => void;
  /** Proiectul din browser, deschis înainte de prima randare (`proiectLocal.ts`). */
  readonly proiect: ProiectDeschis;
  /**
   * Ce stă în fiecare zonă a ecranului (`aranjament.ts`). Implicit, șablonul modern; un șablon clasic sau un aranjament
   * salvat de om intră pe aici, fără altă carcasă.
   */
  readonly aranjament?: Aranjament;
  /** Oferta actualizării PWA (ADR 0045 §5): funcția clicului „Reîncarcă”, cât un worker nou așteaptă. */
  readonly actualizare: Semnal<(() => void) | null>;
};

/** Diagnosticul `?diagnostic=eroare-de-randare` aruncă la randare, ca ErrorBoundary-ul să se poată proba pe build. */
function EroareProvocata(): never {
  throw new Error('Eroare de randare provocată (diagnostic)');
}

/** Descarcă octeții exacți ai programului: același fișier, același hash. */
function descarca(octeti: Uint8Array<ArrayBuffer>, nume: string): void {
  const url = URL.createObjectURL(new Blob([octeti], { type: 'text/plain' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nume;
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); }, 10_000);
}

/**
 * Un dialog care nu s-a putut încărca: după o publicare nouă, fișierele vechi nu mai există pe server (alt nume), iar o
 * filă deschisă de dinainte le cere degeaba. Proiectul e salvat; pagina reîncărcată ia versiunea nouă.
 */
function DialogNeincarcat({ onInchide }: { readonly onInchide: () => void }) {
  return (
    <div className="dialog" role="dialog" aria-modal="true">
      <div className="dialog-cutie">
        <p role="alert" className="avertisment">{t('dialog.neincarcat')}</p>
        <div className="butoane">
          <button type="button" onClick={() => { window.location.reload(); }}>{t('eroare.reincarca')}</button>
          <button type="button" onClick={onInchide}>{t('export.inchide')}</button>
        </div>
      </div>
    </div>
  );
}

/**
 * Dialogurile se încarcă la cerere: nu intră în pachetul de pornire (plafonul de 100 kB, `PLAN.md` §4.4), pe care îl
 * plătește fiecare deschidere a aplicației. Se aduc în fundal după pornire (`useEffect` de mai jos), ca prima deschidere
 * să nu aștepte rețeaua; un eșec al încărcării arată `DialogNeincarcat`, nu ecranul de eroare.
 */
const incarcaDialogExport = () => import('./ExportConectat.tsx');
const incarcaDialogImport = () => import('./ImportConectat.tsx');
// Dialogurile vin legate de document (`ExportConectat`, `ImportConectat`): valorile operațiilor, citirea fișierelor și coada
// importului pleacă din pachetul de pornire odată cu ferestrele lor.
const DialogExport = lazy(() => incarcaDialogExport().then((m) => ({ default: m.ExportConectat }), () => ({ default: DialogNeincarcat })));
// Cipul timpului de lângă traseu (ADR 0046 §8): la cerere, ca durata și textele lui să nu stea în pornire (ADR 0042).
const CipTimpTraseu = lazy(() => import('../ui/CipTimpTraseu.tsx').then((m) => ({ default: m.CipTimpTraseu })));
const DialogImport = lazy(() => incarcaDialogImport().then((m) => ({ default: m.ImportConectat }), () => ({ default: DialogNeincarcat })));
/** Paleta de comenzi și panoul de proprietăți vin tot la cerere (prototipul B): nu intră în pachetul de pornire. */
const incarcaPaleta = () => import('../ui/Paleta.tsx');
const incarcaProprietati = () => import('./PanouProprietati.tsx');
const Paleta = lazy(() => incarcaPaleta().then((m) => ({ default: m.Paleta }), () => ({ default: DialogNeincarcat })));
// Panoul care nu se poate aduce rămâne gol: e doar de citit, iar selecția se vede și în listă și în bara de jos.
const PanouProprietati = lazy(() => incarcaProprietati().then((m) => ({ default: m.PanouProprietati }), () => ({ default: () => null })));
/** Stratul traseului (ADR 0038 §3) vine la primul „Arată traseul”: WebGL2 nu intră în pachetul de pornire. */
const StratTraseu = lazy(() => import('../canvas/StratTraseu.tsx').then((m) => ({ default: m.StratTraseu }), () => ({ default: () => null })));
/** Riglele, ghidajele, lipirea și alinierea (ADR 0050): la cerere, după prima randare a pânzei. */
const Editare = lazy(() => import('./Editare.tsx').then((m) => ({ default: m.Editare }), () => ({ default: () => null })));

/**
 * Traseul de pe pânză (ADR 0038 §2): ultimul program calculat la „Arată traseul”, cu revizia documentului de atunci
 * (altă revizie = traseul e vechi, stins). `miscari` rămâne cât se calculează din nou, ca pânza să nu clipească.
 */
type StareTraseu = {
  readonly arata: boolean;
  readonly stare: 'calcul' | 'gata' | 'refuz';
  readonly rev: number;
  readonly miscari: readonly Miscare[] | null;
  /** Programul calculat (doar „gata”), pentru timpul jobului de lângă traseu (ADR 0046 §8). */
  readonly program?: Program;
  readonly motiv: string | null;
};
/** Bugetul de vârfuri al stratului la pornire (5 M de segmente țin 60 Hz pe iGPU, s6-V); se înjumătățește la un cadru lent. */
const BUGET_TRASEU = 2_000_000;
const BUGET_TRASEU_MINIM = 50_000;

/** Foaia documentului nou: bucata minimă a plăcii 1. */
const FOAIA_IMPLICITA = { latime: 300, inaltime: 200, grosime: 18 };

/** Temele, în ordinea în care le trece butonul: după sistem, luminoasă, întunecată. */
const TEME = ['auto', 'luminoasa', 'intunecata'] as const;

const doua = (x: number): string => x.toFixed(2);

/** Un element în lume, în cuvinte: forma și unde stă pe foaie. Calea, prin cutia ei exactă în lume (ADR 0034 §8). */
function descriere(e: Pick<ElementLume, 'forma' | 'matrice'>): string {
  const { e: x, f: y } = e.matrice;
  if (e.forma.tip === 'dreptunghi') {
    return t('forma.dreptunghi', { latime: doua(e.forma.latime), inaltime: doua(e.forma.inaltime), x: doua(x), y: doua(y) });
  }
  if (e.forma.tip === 'cerc') return t('forma.cerc', { raza: doua(e.forma.raza), x: doua(x), y: doua(y) });
  const c = cutieElement(e);
  // O cale deschisă are n − 1 segmente și se spune „cale deschisă” (ADR 0037 §2, §12).
  const n = e.forma.varfuri.length - (e.forma.inchis ? 0 : 1);
  return t(e.forma.inchis ? 'forma.cale' : 'forma.cale-deschisa', { latime: doua(c.maxX - c.minX), inaltime: doua(c.maxY - c.minY), n, x: doua(c.minX), y: doua(c.minY) });
}

/** O instanță, în cuvinte: numele piesei, sau primul ei element (și câte mai are). */
function descriereInstanta(elemente: readonly ElementLume[], nume: string | undefined): string {
  const [primul] = elemente;
  if (nume) return nume;
  if (!primul) return '—';
  return elemente.length === 1 ? descriere(primul) : `${descriere(primul)} (+${elemente.length - 1})`;
}

/**
 * Cum lucrează fila cu proiectul salvat. Se poate schimba: o filă care citea devine scriitor când cealaltă se închide, iar
 * una care scria trece în `conflict` dacă altă filă a salvat între timp.
 */
type ModFila = ProiectDeschis['mod'] | 'conflict' | 'necitita';

/** Modurile în care fila nu scrie documentul: altă filă scrie, a scris între timp, sau a scris ce fila asta nu citește. */
const doarCiteste = (mod: ModFila): boolean => mod === 'doar-citire' || mod === 'conflict' || mod === 'necitita';

/** Ce spune bara de jos despre salvare. */
function mesajProiect(mod: ModFila, p: ProiectDeschis, motivNecitit: string): string | null {
  if (mod === 'necitita') return t('depozit.necitita', { motiv: motivNecitit });
  if (mod === 'doar-citire') return t('depozit.doar-citire');
  if (mod === 'conflict') return t('depozit.conflict');
  if (mod === 'fara-memorie') return t('depozit.fara-memorie');
  if (mod === 'necitit-acum') return t('depozit.necitit-acum');
  if (mod === 'nu-se-deschide' && p.mod === 'nu-se-deschide') return t('depozit.nu-se-deschide', { motiv: p.motiv });
  return null;
}

export function App({ config, jurnal, diagnostic, alegeLimba, alegeTema, proiect, aranjament = ARANJAMENT_MODERN, actualizare }: Props) {
  const limbaActiva = useLimba();
  const aplicaActualizare = useSyncExternalStore(actualizare.asculta, actualizare.citeste);
  const intrari = useSyncExternalStore(jurnal.asculta, () => jurnal.citeste().length);
  const docPornire = useMemo(
    () => ((proiect.mod === 'scriitor' || proiect.mod === 'doar-citire') && proiect.doc ? proiect.doc : documentNou(FOAIA_IMPLICITA)),
    [proiect],
  );
  const [istoric, setIstoric] = useState<Istoric>(() => istoricNou(docPornire));
  const [selectie, setSelectie] = useState<readonly string[]>([]);
  const [eroareSalvare, setEroareSalvare] = useState<string | null>(null);
  const [mod, setMod] = useState<ModFila>(proiect.mod);
  const [motivNecitit, setMotivNecitit] = useState('');
  const depozit = useRef<DepozitProiect | null>(proiect.mod === 'scriitor' ? proiect.depozit : null);
  /** Ultimul document venit din bază (la deschidere sau de la fila care scrie): nu se salvează înapoi. */
  const dinBaza = useRef<Document>(docPornire);
  // Acțiunile citesc și scriu starea sincron: referința ține mereu ultima valoare, starea React redesenează.
  const curenta = useRef({ istoric, selectie });
  curenta.current = { istoric, selectie };

  const [paleta, setPaleta] = useState(false);
  /**
   * Panourile deschise. Pe ecran îngust, proprietățile (doar de citit până la 2.8) pornesc închise: pânza are întâi
   * nevoie de loc. Nu se țin minte după reîncărcare (aranjamentul salvat vine mai târziu, `aranjament.ts`).
   */
  const [panouri, setPanouri] = useState<Readonly<Record<IdPanou, boolean>>>(() => ({
    lista: true, proprietati: matchMedia('(min-width: 64rem)').matches,
  }));
  const comutaPanou = (p: IdPanou): void => { setPanouri((s) => ({ ...s, [p]: !s[p] })); };
  /** Cursorul pe foaie și scara vederii, pentru cipurile de jos: se schimbă des, deci doar cipul lor se redesenează. */
  const [cursor] = useState(() => semnal<PunctFoaie | null>(null));
  const [scara] = useState(() => semnal<number | null>(null));
  const [traseu, setTraseu] = useState<StareTraseu | null>(null);
  // Răspunsul la `$$` lipit în dialogul exportului (ADR 0046 §8): cât e deschisă pagina, comun cu timpul traseului.
  const [setariMasina, setSetariMasina] = useState('');
  const [timpTraseu, setTimpTraseu] = useState<{ readonly program: Program; readonly setari: string; readonly r: RezumatJob } | null>(null);
  const [bugetTraseu, setBugetTraseu] = useState(BUGET_TRASEU);
  const [stareStrat, setStareStrat] = useState<StareStrat>('ok');
  const [lipeste, setLipeste] = useState<Lipeste | null>(null);
  // Funcția de lipire se pune cu forma de actualizare a stării (o funcție dată direct ar fi luată drept actualizare).
  const [setLipesteStabil] = useState(() => (f: Lipeste | null) => { setLipeste(() => f); });
  const [desen, setDesen] = useState<GestDesen | null>(null);
  const [setDesenStabil] = useState(() => (f: GestDesen | null) => { setDesen(() => f); });
  const [cheieStrat, setCheieStrat] = useState(0);
  const [traseuPregatit, setTraseuPregatit] = useState<{ readonly bucati: readonly Bucata[]; readonly rarit: boolean } | null>(null);
  const cerereTraseu = useRef(0);
  // Pentru rezultatul exportului, care vine mai târziu, dintr-un context făcut la apăsarea butonului.
  const traseuArat = useRef(false);
  traseuArat.current = traseu?.arata === true;
  // Doar treapta de zoom re-randează carcasa (×2), nu fiecare pas al rotiței.
  const treapta = useSyncExternalStore(scara.asculta, () => {
    const s = scara.citeste();
    return s === null ? null : treaptaZoom(s, window.devicePixelRatio || 1);
  });
  const [tema, setTema] = useState(() => TEME.find((x) => x === document.documentElement.dataset['tema']) ?? 'auto');
  const [potrivire, setPotrivire] = useState(0);
  /** Zona pânzei pe care n-o acoperă barele și panourile: foaia se potrivește în ea. */
  const zona = useRef<HTMLDivElement>(null);
  const [dialogExport, setDialogExport] = useState(false);
  const [stareExport, setStareExport] = useState<StareExport | null>(null);
  const fisierImport = useRef<HTMLInputElement>(null);
  /**
   * Importul SVG (ADR 0035 §9): coada fișierelor alese sau lăsate pe planșă (felia 2.8b), pe care dialogul le trece pe
   * rând (`ImportConectat`: citirea, px-ul, previzualizarea); `punct` e locul lăsării (mm ai foii), sau null (butonul, ori
   * lăsate în afara pânzei). Cât e deschis (coada nu e null), documentul nu se schimbă pe altă cale: „Importă” adaugă exact
   * ce arată dialogul.
   */
  const [coadaImport, setCoadaImport] = useState<{
    readonly fisiere: readonly File[]; readonly punct: { readonly x: number; readonly y: number } | null;
  } | null>(null);
  /**
   * Numărul ultimei cereri de export. Un rezultat întârziat (calculul se încarcă la cerere) e al altor parametri dacă între
   * timp s-a pornit alt export, s-a schimbat un parametru sau s-a închis dialogul: nu se afișează și nu se descarcă.
   */
  const cerereExport = useRef(0);
  /** Un export pornit, al cărui rezultat n-a venit încă (calculul se încarcă la cerere). */
  const exportInCurs = useRef(false);
  /**
   * Simularea ultimului export (ADR 0047 §5), pornită după descărcare: un export nou, un parametru schimbat, un document
   * venit din bază sau dialogul închis o anulează (workerele ei se opresc), ca să nu stea la coadă înaintea celei noi.
   */
  const simulareInCurs = useRef<AbortController | null>(null);
  const opresteSimularea = (): void => {
    simulareInCurs.current?.abort();
    simulareInCurs.current = null;
  };
  /**
   * Câte documente au venit din bază de la pornire. Dialogul de export ia de aici valorile operațiilor din nou: o versiune
   * nouă (de la fila care scrie, sau la preluarea scrierii) le înlocuiește pe cele vechi. Propria scriere a dialogului nu
   * trece pe aici.
   */
  const [bazaNoua, setBazaNoua] = useState(0);

  /**
   * Un document venit din bază înlocuiește istoricul; selecția păstrează doar instanțele care există în el. Un export în
   * curs era al documentului vechi: se aruncă, și se spune, ca omul să nu aștepte un fișier care nu mai vine.
   */
  const dinBazaNou = (d: Document): void => {
    dinBaza.current = d;
    cerereExport.current++;
    opresteSimularea();
    setStareExport(exportInCurs.current ? { ok: false, motiv: t('export.proiect-schimbat') } : null);
    exportInCurs.current = false;
    setBazaNoua((n) => n + 1);
    const h = istoricNou(d);
    const existente = new Set(d.foi[0]?.instante.map((i) => i.id) ?? []);
    const sel = curenta.current.selectie.filter((id) => existente.has(id));
    curenta.current = { istoric: h, selectie: sel };
    setIstoric(h);
    setSelectie(sel);
  };

  // Fila care citește: primește fiecare versiune salvată de scriitor și devine ea scriitorul când acela se închide.
  useEffect(() => {
    if (proiect.mod !== 'doar-citire') return undefined;
    return proiect.urmareste({
      laVersiune: (d) => { dinBazaNou(d); },
      laScriitor: (dep, d) => {
        depozit.current = dep;
        if (d) dinBazaNou(d);
        else dinBaza.current = curenta.current.istoric.doc;
        setMod('scriitor');
      },
      laNecitita: (motiv) => {
        setMotivNecitit(motiv);
        setMod('necitita');
      },
    });
    // `dinBazaNou` lucrează doar cu referințe și setteri, deci prima lui versiune e și ultima.
  }, [proiect]);
  const registru = useMemo(() => creeazaRegistru(ACTIUNI_DOCUMENT, () => true), []);
  const registruExport = useMemo(() => creeazaRegistru(ACTIUNI_EXPORT, () => true), []);
  const registruImport = useMemo(() => creeazaRegistru(ACTIUNI_IMPORT, () => true), []);
  const registruVedere = useMemo(() => creeazaRegistru(ACTIUNI_VEDERE, () => true), []);
  /** Unde era focusul când s-a deschis paleta: acolo se întoarce la închidere. */
  const focusPaleta = useRef<Element | null>(null);
  const contextVedere: ContextVedere = {
    paleta: () => { focusPaleta.current = document.activeElement; setPaleta(true); },
    lista: () => { comutaPanou('lista'); },
    proprietati: () => { comutaPanou('proprietati'); },
    potriveste: () => { setPotrivire((n) => n + 1); },
    traseu: () => { comutaTraseu(); },
    tema: () => {
      const noua = TEME[(TEME.indexOf(tema) + 1) % TEME.length] ?? 'auto';
      setTema(noua);
      alegeTema(noua);
    },
  };
  const contextExport = (p?: ParametriExport, cerere = cerereExport.current): ContextExport => ({
    document: () => curenta.current.istoric.doc,
    parametri: () => p ?? { origine: 'stanga-jos', z0: 'sus' },
    rezultat: (r: RezultatExport) => {
      if (cerere !== cerereExport.current) return;
      exportInCurs.current = false;
      if (r.ok) {
        descarca(r.program.octeti, `cncvs2-${p?.origine ?? 'stanga-jos'}.${r.program.extensie}`);
        // Exportul tocmai a scris operațiile: traseul arătat se reface pe documentul exportat.
        if (traseuArat.current) calculeazaTraseu();
        setStareExport({ ok: true, linii: r.program.linii, sha256: r.program.sha256, avertismente: r.avertismente, rezumat: r.rezumat, simulare: 'calcul' });
        // Simularea vine după fișier: descărcarea nu o așteaptă. Un eșec al ei (nu un refuz) intră în jurnal.
        opresteSimularea();
        const ac = new AbortController();
        simulareInCurs.current = ac;
        void r.simulare(ac.signal).then((s) => {
          if (ac.signal.aborted || cerere !== cerereExport.current) return;
          simulareInCurs.current = null;
          if (!s.ok && s.eroare) jurnal.adauga('promisiune', new Error(`simularea: ${s.motiv}`));
          setStareExport((v) => (v?.ok && v.simulare === 'calcul' ? { ...v, simulare: s } : v));
        }, (e: unknown) => { jurnal.adauga('promisiune', e); });
      } else {
        setStareExport('cereConfirmare' in r ? { ok: false, motiv: r.motiv, cereConfirmare: r.cereConfirmare } : { ok: false, motiv: r.motiv });
      }
    },
  });
  const doc = istoric.doc;
  const foaie = doc.foi[0] ?? documentNou(FOAIA_IMPLICITA).foi[0];
  const foaieStoc = foaie?.stoc;
  // Lista de desen și elementele în lume se refac doar când se schimbă documentul.
  const lume = useMemo(() => elementeFoaie(doc, 0), [doc]);
  const forme = useMemo(() => listaDesen(doc), [doc]);
  // Avertismentele: tot după fiecare schimbare a documentului; în bara de jos și în listă, niciodată pe pânză.
  const avert = useMemo(() => avertismente(doc, 0), [doc]);
  // Hărțile listei, o dată pe document: un rând costă cât elementele lui, nu cât toată foaia.
  const harti = useMemo(() => {
    const peInstanta = new Map<string, ElementLume[]>();
    for (const e of lume) {
      const l = peInstanta.get(e.instanta);
      if (l) l.push(e);
      else peInstanta.set(e.instanta, [e]);
    }
    const piese = new Map(doc.piese.map((p) => [p.id, p]));
    const piesaInstantei = new Map((doc.foi[0]?.instante ?? []).map((i) => [i.id, piese.get(i.piesa)]));
    const nume = new Map([...piesaInstantei].map(([i, p]) => [i, p?.nume]));
    return { peInstanta, nume, piesaInstantei, dupaIdLume: new Map(lume.map((e) => [e.idLume, e])) };
  }, [lume, doc]);
  // Selecția ține instanțe; doar cele care există încă se arată (o anulare le poate scoate de pe foaie).
  const selectieValida = useMemo(() => selectie.filter((id) => harti.nume.has(id)), [selectie, harti]);
  // Pânza primește elementele în lume ale instanțelor alese, și cutia lor (bara selecției stă lângă ea).
  const [selectieDesen, cutieSelectie] = useMemo(() => {
    const elemente = selectieValida.flatMap((id) => harti.peInstanta.get(id) ?? []);
    const cutie = elemente.reduce((c, e) => uneste(c, cutieElement(e)), CUTIE_GOALA);
    return [elemente.map((e) => e.idLume), elemente.length > 0 ? cutie : null] as const;
  }, [selectieValida, harti]);

  // Salvarea: fiecare document nou (după o comandă, o anulare sau o refacere) pleacă în IndexedDB, doar din fila care scrie.
  useEffect(() => {
    const dep = depozit.current;
    if (mod !== 'scriitor' || !dep || doc === dinBaza.current) return;
    dep.scrie(doc).then(
      () => { setEroareSalvare(null); },
      (e: unknown) => {
        jurnal.adauga('salvare', e);
        // Altă filă a salvat între timp: fila asta nu mai scrie, ca să nu acopere versiunea aceea.
        if (e instanceof ConflictDeScriere) setMod('conflict');
        else setEroareSalvare(e instanceof Error ? e.message : String(e));
      },
    );
  }, [doc, mod, jurnal]);

  const context = (extra: Partial<Pick<ContextDocument, 'deplasare' | 'punct' | 'dinNou' | 'jurnal' | 'alese' | 'operatiiNoi' | 'importNou' | 'locImport' | 'pozitieNoua' | 'rotireNoua' | 'stocNou' | 'ghidajeNoi' | 'deplasari' | 'formaNoua' | 'transformare'>> = {}): ContextDocument => ({
    istoric: () => curenta.current.istoric,
    scrie: (h) => { curenta.current = { ...curenta.current, istoric: h }; setIstoric(h); },
    selectie: () => curenta.current.selectie,
    selecteaza: (ids) => { curenta.current = { ...curenta.current, selectie: ids }; setSelectie(ids); },
    doarCitire: () => doarCiteste(mod),
    ...extra,
  });

  useEffect(() => {
    document.documentElement.lang = limbaActiva;
  }, [limbaActiva]);

  // Alegerea cu clicul (distanța la contur, `actiuniAlegere.ts`) vine la cerere, imediat după montare: doar un clic dat în
  // primele clipe o așteaptă (și se aplică la sosirea ei).
  useEffect(() => { incarcaAlegerea().catch(() => undefined); }, []);
  // Dialogurile, aduse în fundal după pornire (vezi `DialogNeincarcat`); și dicționarele ambelor limbi (pornirea a adus
  // doar limba activă): schimbarea limbii nu mai așteaptă rețeaua.
  useEffect(() => {
    const id = setTimeout(() => {
      for (const l of LIMBI) void incarcaLimba(l).catch(() => undefined);
      void incarcaDialogExport().catch(() => undefined);
      void incarcaDialogImport().catch(() => undefined);
      void incarcaPaleta().catch(() => undefined);
      void incarcaProprietati().catch(() => undefined);
      void incarcaNivelPiesa().catch(() => undefined);
      preincarcaImport();
    }, 1_000);
    return () => { clearTimeout(id); };
  }, []);

  /**
   * Ușa unică a acțiunilor de document. Cât e deschis dialogul de export, nicio acțiune nu rulează, oricare ar fi calea:
   * o scurtătură, un buton atins cu Tab sau o tragere pornită înainte de dialog. Confirmarea unei ieșiri din foaie rămâne
   * a desenului pe care omul îl vede.
   */
  const dialogDeschis = useRef(false);
  dialogDeschis.current = dialogExport || coadaImport !== null;
  /** Un dialog sau paleta: aplicația de sub ele e inertă. */
  const modal = dialogDeschis.current || paleta;
  const modalRef = useRef(modal);
  modalRef.current = modal;
  useEffect(() => {
    const cuFisiere = (e: DragEvent): boolean => [...(e.dataTransfer?.types ?? [])].includes('Files');
    const peste = (e: DragEvent): void => { if (cuFisiere(e)) e.preventDefault(); };
    const lasa = (e: DragEvent): void => {
      // Pânza le-a primit deja (cu locul lor): aici doar cele lăsate în afara ei.
      if (!cuFisiere(e) || e.defaultPrevented) return;
      e.preventDefault();
      if (!modalRef.current) pornesteImportRef.current([...(e.dataTransfer?.files ?? [])], null);
    };
    window.addEventListener('dragover', peste);
    window.addEventListener('drop', lasa);
    return () => {
      window.removeEventListener('dragover', peste);
      window.removeEventListener('drop', lasa);
    };
  }, []);
  const ruleazaDocument = (id: string, ctx: ContextDocument): void => {
    if (dialogDeschis.current) return;
    ruleaza(registru, id, ctx);
  };
  /**
   * „Arată traseul” (ADR 0038 §2): cu traseul arătat și la zi, îl ascunde; altfel calculează programul documentului de
   * acum, pe firul principal (CAM-ul vine la cerere), după ce cipul „se calculează” a apucat să se vadă. Un calcul pornit
   * după el îl face pe cel vechi să nu mai conteze.
   */
  const comutaTraseu = (): void => {
    const d = curenta.current.istoric.doc;
    // Și un refuz pentru documentul de acum se ascunde: altfel butonul nu se mai putea dezapăsa (recenzia 2.8e, F3).
    if (traseu?.arata && (traseu.stare === 'gata' || traseu.stare === 'refuz') && traseu.rev === d.rev) {
      setTraseu({ ...traseu, arata: false });
      return;
    }
    calculeazaTraseu();
  };
  /** Programul documentului de acum, pentru traseu; și după un export reușit, dacă traseul e arătat (ADR 0038 §2). */
  const calculeazaTraseu = (): void => {
    const d = curenta.current.istoric.doc;
    const cerere = ++cerereTraseu.current;
    // Un strat care nu e „ok” (context pierdut, WebGL indisponibil) se montează din nou, cu un canvas și un context noi;
    // un „ok” pus peste canvasul vechi, cu contextul tot pierdut, lăsa traseul nedesenat și fără cip (recenzia 2.8e, F4).
    if (stareStrat !== 'ok') {
      setCheieStrat((k) => k + 1);
      setStareStrat('ok');
    }
    const refuz = (motiv: string): void => {
      if (cerere === cerereTraseu.current) setTraseu({ arata: true, stare: 'refuz', rev: d.rev, miscari: null, motiv });
    };
    // Mesajele cipului vin înaintea lui (dicționarul traseului, la cerere), apoi CAM-ul.
    Promise.all([import('../cam/job.ts'), import('../i18n/traseu.ts')]).then(([{ programDinDocument }]) => {
      if (cerere !== cerereTraseu.current) return;
      setTraseu((v) => ({ arata: true, stare: 'calcul', rev: d.rev, miscari: v?.miscari ?? null, motiv: null }));
      // Cu modulele deja aduse, un `setTimeout(0)` simplu pornea CAM-ul înaintea desenării cipului (recenzia 2.8e, F5):
      // cadrul următor, apoi o sarcină, deci după ce browserul a pictat.
      const dupaCadru = (f: () => void): void => { requestAnimationFrame(() => { setTimeout(f, 0); }); };
      dupaCadru(() => {
        if (cerere !== cerereTraseu.current) return;
        try {
          const r = programDinDocument(d);
          if (cerere !== cerereTraseu.current) return;
          if (r.ok) setTraseu({ arata: true, stare: 'gata', rev: d.rev, miscari: r.program.miscari, program: r.program, motiv: null });
          else refuz(r.motiv);
        } catch (e) {
          refuz(e instanceof Error ? e.message : String(e));
        }
      });
    }, (e: unknown) => { refuz(e instanceof Error ? e.message : String(e)); });
  };
  // Bucățile stratului: din program, la treapta de zoom și sub buget (modulul vine la cerere, cu stratul).
  const miscariTraseu = traseu?.arata ? traseu.miscari : null;
  useEffect(() => {
    if (!miscariTraseu || treapta === null) {
      setTraseuPregatit(null);
      return;
    }
    let viu = true;
    import('./traseuDesen.ts').then(({ siruriInBuget, bucatiDinSiruri, tolerantaDinTreapta }) => {
      if (!viu) return;
      const r = siruriInBuget(miscariTraseu, tolerantaDinTreapta(treapta), bugetTraseu);
      setTraseuPregatit({ bucati: bucatiDinSiruri(r.siruri), rarit: r.rarit || r.pesteBuget });
    }, () => { if (viu) setTraseuPregatit(null); });
    return () => { viu = false; };
  }, [miscariTraseu, treapta, bugetTraseu]);
  // Timpul jobului de lângă traseu (ADR 0046 §8): același calcul ca rezumatul exportului (postul pe montajul stânga-jos, Z0
  // sus, apoi estimarea), adus la cerere cu calculul exportului; se reface și când se schimbă `$$`, fără CAM.
  const programTraseu = traseu?.arata && traseu.stare === 'gata' ? traseu.program : undefined;
  useEffect(() => {
    if (!programTraseu || !foaieStoc) return;
    let viu = true;
    import('../ui/actiuniExportCalcul.ts').then(({ timpProgram }) => {
      if (viu) setTimpTraseu({ program: programTraseu, setari: setariMasina, r: timpProgram(programTraseu, foaieStoc, setariMasina) });
    }, () => { if (viu) setTimpTraseu(null); });
    return () => { viu = false; };
  }, [programTraseu, foaieStoc, setariMasina]);
  // Stins: programul unui document de dinainte (și un refuz pentru el nu mai e motivul de acum, recenzia 2.8e, F3), sau
  // programul vechi ținut sub cipul „se calculează” (F5).
  const traseuVechi = traseu !== null && traseu !== undefined
    && ((traseu.stare !== 'calcul' && traseu.rev !== doc.rev) || traseu.stare === 'calcul');

  /** Un câmp al panoului de proprietăți (ADR 0038 §4): acțiunea lui, cu rezultatul (motivul unui refuz rămâne în câmp). */
  const aplicaDinPanou = (id: string, extra: Parameters<typeof context>[0]): RezultatActiune => {
    if (dialogDeschis.current) return { ok: false, motiv: 'motiv.nimic-ales' };
    return ruleaza(registru, id, context(extra));
  };

  /** Contextul importului înainte de alegerea fișierului: doar starea butonului (fila care doar citește îl oprește). */
  const importFaraFisier = (): ContextImport => contextImport(null, 96, () => undefined);
  /** Starea oricărei acțiuni din bare și din paletă, citită din registrul ei. */
  const stareActiune = (id: string): RezultatActiune => (
    id === 'import.svg' ? stare(registruImport, id, importFaraFisier())
      : id === 'export.gcode' ? stare(registruExport, id, contextExport())
        : registruVedere.actiuni.has(id) ? stare(registruVedere, id, contextVedere) : stare(registru, id, context()));
  const eticheta = (id: string): CheieSimpla => (registru.actiuni.get(id) ?? registruImport.actiuni.get(id)
    ?? registruExport.actiuni.get(id) ?? registruVedere.actiuni.get(id))?.eticheta ?? 'motiv.actiune-necunoscuta';
  /**
   * O acțiune aleasă din bară, din bara selecției, din paletă sau de la tastatură. Importul cere întâi fișierul, iar
   * exportul își deschide dialogul (ca butoanele de până acum); restul rulează prin registrul lor. Cât e deschis un
   * dialog, nimic nu rulează.
   */
  const executa = (id: string): void => {
    if (dialogDeschis.current || !stareActiune(id).ok) return;
    if (id === 'import.svg') fisierImport.current?.click();
    else if (id === 'export.gcode') { setStareExport(null); setDialogExport(true); }
    else if (registruVedere.actiuni.has(id)) ruleaza(registruVedere, id, contextVedere);
    else ruleazaDocument(id, context());
  };

  useEffect(() => {
    const tasta = (e: KeyboardEvent): void => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      const id = actiuneaTastei(tastaApasata(e));
      if (!id) return;
      // Ctrl+D ar pune altfel pagina la favorite, iar Ctrl+K ar căuta în bara browserului.
      e.preventDefault();
      if (!paleta) executa(id);
    };
    window.addEventListener('keydown', tasta);
    return () => { window.removeEventListener('keydown', tasta); };
  });

  // Pe live, diagnosticul nu există.
  if (diagnostic === 'eroare-de-randare' && config.ok && config.config.instanta !== 'live') return <EroareProvocata />;

  const instanta = config.ok ? config.config.instanta : t('app.instanta.necunoscuta');
  const elementeInstanta = (id: string): readonly ElementLume[] => harti.peInstanta.get(id) ?? [];
  const numePiesa = (id: string): string | undefined => harti.nume.get(id);
  const selectata = selectieValida.length === 1 && selectieValida[0] !== undefined ? selectieValida[0] : null;
  const descriereLume = (idLume: string): string => {
    const e = harti.dupaIdLume.get(idLume);
    return e ? descriere(e) : idLume;
  };
  const avertInstanta = new Map<string, string[]>();
  for (const a of avert) {
    const text = t('avertisment.iese-din-foaie', { descriere: descriereLume(a.id) });
    const l = avertInstanta.get(a.instanta);
    if (l) l.push(text);
    else avertInstanta.set(a.instanta, [text]);
  }
  const alese = new Set(selectieValida);
  // Arborele proiectului (ADR 0024): sub fiecare instanță, piesa ei (câte forme) și operațiile ei, direct din document.
  const randuri: RandLista[] = (foaie?.instante ?? []).map((i) => ({
    id: i.id,
    descriere: descriereInstanta(elementeInstanta(i.id), numePiesa(i.id)),
    avertisment: avertInstanta.get(i.id)?.join('\n') ?? null,
    selectat: alese.has(i.id),
    elemente: elementeInstanta(i.id).length,
    operatii: harti.piesaInstantei.get(i.id)?.operatii ?? [],
  }));
  const stoc = foaie?.stoc ?? FOAIA_IMPLICITA;
  // Rădăcina arborelui: foaia, cu mărimile exacte din document (cu punct, ca descrierile formelor).
  const radacinaArbore = t('arbore.foaia', { nume: foaie?.nume ?? '1', latime: stoc.latime, inaltime: stoc.inaltime, grosime: stoc.grosime });
  const mesaj = mesajProiect(mod, proiect, motivNecitit);

  /**
   * Exportă: întâi valorile din dialog intră în document, ca o singură comandă (se salvează, Ctrl+Z le scoate), apoi
   * exportul citește documentul. Scrierea trece pe lângă ușa oprită sub dialog: e chiar gestul dialogului. Într-o filă
   * care doar citește, acțiunea e inactivă, iar dialogul n-a lăsat nimic de schimbat. Operațiile noi le face dialogul
   * (`ExportConectat`), din valorile lui.
   */
  const exporta = (noi: ReadonlyMap<string, Operatie[]>, c: CerereExport): void => {
    // Fila care n-a putut citi ultima versiune ar exporta una veche: refuză, cu motivul din bara de jos, în dialog.
    if (mod === 'necitita') {
      setStareExport({ ok: false, motiv: t('depozit.necitita', { motiv: motivNecitit }) });
      return;
    }
    const scris = ruleaza(registru, 'document.aplica-operatii', context({ operatiiNoi: () => noi }));
    // Doar citirea nu oprește exportul (operațiile din document rămân cele de exportat); orice alt refuz, da.
    if (!scris.ok && scris.motiv !== 'motiv.doar-citire') {
      setStareExport({ ok: false, motiv: t(scris.motiv) });
      return;
    }
    const { origine, z0 } = c;
    exportInCurs.current = true;
    opresteSimularea();
    const r = ruleaza(registruExport, 'export.gcode', contextExport({
      origine, z0, ...(c.confirmareIesire ? { confirmareIesire: c.confirmareIesire } : {}),
      ...(setariMasina.trim() !== '' ? { setariMasina } : {}),
    }, ++cerereExport.current));
    // Un export refuzat înainte de calcul (nimic de exportat, nicio operație) spune de ce, nu lasă rezultatul vechi.
    if (!r.ok) {
      exportInCurs.current = false;
      setStareExport({ ok: false, motiv: t(r.motiv) });
    }
  };

  /** Contextul ușii SVG pentru un fișier și un px; citirea lui o face dialogul (`ImportConectat`). */
  const contextImport = (f: FisierImport | null, px: 96 | 72, rezultat: (r: PrevizualizareImport) => void): ContextImport => ({
    fisier: () => f,
    pxPeTol: () => px,
    limba: () => limbaActiva,
    doarCitire: () => doarCiteste(mod),
    rezultat,
    jurnal: (e) => { jurnal.adauga('import', e); },
  });
  const pornesteImport = (fisiere: readonly File[], punct: { readonly x: number; readonly y: number } | null): void => {
    // Fila care doar citește nu importă (ca butonul, oprit): o lăsare pe planșă nu mai deschide un dialog care rămâne
    // pentru totdeauna la „Se citește fișierul…” (recenzia A).
    if (!fisiere[0] || doarCiteste(mod)) return;
    setCoadaImport({ fisiere, punct });
  };
  const alesFisier = (lista: FileList | null): void => { pornesteImport(lista ? [...lista] : [], null); };
  const pornesteImportRef = useRef(pornesteImport);
  pornesteImportRef.current = pornesteImport;
  /** `document.importa` cu importul pregătit de dialog, în locul lui: aceeași ușă a documentului ca restul acțiunilor. */
  const contextImportNou = (p: ImportPregatit, loc: { readonly x: number; readonly y: number } | null): ContextDocument => (
    context({ importNou: () => p, locImport: () => loc }));

  /**
   * Un buton al unei acțiuni, cu iconița ei (din CSS, după `data-icona`), numele (ascuns vizual unde iconița ajunge) și un
   * sfat la trecerea cu mausul: numele și scurtătura, sau motivul pentru care acțiunea e inactivă. Sfatul e `aria-hidden`
   * (numele accesibil rămâne eticheta), iar motivul rămâne și în `title`, ca până acum.
   */
  const buton = (
    id: string, atribut: 'data-actiune' | 'data-context',
    extra?: ButtonHTMLAttributes<HTMLButtonElement> & { readonly 'data-icona'?: string }, text = t(eticheta(id)),
  ) => {
    const s = stareActiune(id);
    const k = tastaActiunii(id);
    return (
      <button key={id} type="button" disabled={!s.ok} title={s.ok ? undefined : t(s.motiv)} {...{ [atribut]: id }} data-icona={id}
        onClick={() => { executa(id); }} {...extra}>
        <span className="eticheta">{text}</span>
        <span className="sfat" aria-hidden="true">{text}{s.ok ? k && <kbd>{k}</kbd> : `: ${t(s.motiv)}`}</span>
      </button>
    );
  };

  /*
   * Randarea după aranjament (`aranjament.ts`): barele, panourile, cipurile și bara selecției vin din date. Aici stă doar
   * cum arată fiecare fel de intrare; ce stă unde, decide aranjamentul.
   */

  /** Panoul pe care îl strânge și îl deschide o acțiune a vederii, dacă e una dintre ele. */
  const panouAl = (id: string): IdPanou | undefined => PANOURI.find((p) => COMUTA_PANOU[p] === id);

  /**
   * O unealtă: butonul acțiunii ei, cu aspectul cerut. Bara selecției își poartă uneltele cu `data-context`, ca
   * localizatorii `data-actiune` să rămână unici pe pagină. Un comutator de panou arată, apăsat, că panoul e deschis.
   */
  const unealta = (u: Unealta, zona: IdZona): ReactNode => {
    const id = u.actiune;
    const atribut = zona === 'selectie' ? 'data-context' : 'data-actiune';
    if (u.aspect === 'cauta') {
      const s = stareActiune(id);
      const k = tastaActiunii(id);
      return (
        <button type="button" className="cauta" disabled={!s.ok} title={s.ok ? undefined : t(s.motiv)} {...{ [atribut]: id }}
          data-icona={id} onClick={() => { executa(id); }}>
          <span className="eticheta">{t(eticheta(id))}</span>
          {k && <kbd aria-hidden="true">{k.replace(/\+/g, ' ')}</kbd>}
        </button>
      );
    }
    const clase = [
      u.aspect === 'eticheta' || u.aspect === 'principal' ? 'cu-eticheta' : '',
      u.aspect === 'principal' ? 'principal' : '',
      zona === 'jos' ? 'cip-buton' : '',
    ].filter((c) => c !== '').join(' ');
    const extra = clase === '' ? {} : { className: clase };
    if (id === 'vedere.tema') return buton(id, atribut, { ...extra, 'data-icona': `tema.${tema}` }, `${t('vedere.tema')}: ${t(`tema.${tema}`)}`);
    const p = panouAl(id);
    if (id === 'vedere.traseu') return buton(id, atribut, { ...extra, 'aria-pressed': traseu?.arata === true });
    return buton(id, atribut, p ? { ...extra, 'aria-pressed': panouri[p] } : extra);
  };

  /** Un control care nu e acțiune: limba, ca butoane apăsate / neapăsate; locul uneltelor, umplut de `Editare` (ADR 0052). */
  const control = (c: IdControl): ReactNode => {
    switch (c) {
      case 'unelte':
        return <div className="loc-unelte" id="loc-unelte" />;
      case 'limba':
        return (
          <nav aria-label={t('app.limba')}>
            {LIMBI.map((l) => (
              <button key={l} type="button" aria-pressed={l === limbaActiva} onClick={() => { alegeLimba(l); }}>
                {l.toUpperCase()}
              </button>
            ))}
          </nav>
        );
    }
  };

  /** Un cip de stare; unul fără nimic de spus (niciun avertisment, configurația citită) nu se arată. */
  const cip = (c: IdCip): ReactNode => {
    switch (c) {
      case 'selectie': {
        const text = selectata ? t('stare.selectie', { descriere: descriereInstanta(elementeInstanta(selectata), numePiesa(selectata)) }) : t('stare.nimic-selectat');
        return <span data-testid="selectie" className="cip cip-selectie" title={text}>{text}</span>;
      }
      case 'avertisment': {
        if (avert.length === 0) return null;
        // Un singur rând, oricâte avertismente: bara nu crește peste pânză. Lista întreagă stă în titlu și, cu roșu, în
        // lista de vectori.
        const texte = avert.map((a) => t('avertisment.iese-din-foaie', { descriere: descriereLume(a.id) }));
        return (
          <span className="cip cip-rosu avertisment-bara" data-testid="avertisment" title={texte.join('\n')}>
            {texte.length === 1 ? texte[0] : t('avertisment.forme-ies-din-foaie', { n: texte.length })}
          </span>
        );
      }
      case 'proiect':
        return (mesaj ?? eroareSalvare) === null ? null : (
          <span className="cip cip-atentie" data-testid="proiect" role="status">
            {mesaj ?? t('depozit.eroare', { motiv: eroareSalvare ?? '' })}
          </span>
        );
      case 'config':
        return config.ok ? null : <p role="status" className="cip cip-atentie avertisment">{t('eroare.config', { motiv: config.motiv })}</p>;
      case 'actualizare':
        // Doar oferită: abia clicul aplică versiunea nouă (o reîncărcare singură ar pierde munca nesalvată).
        return aplicaActualizare && (
          <span className="cip cip-atentie cip-actualizare" data-testid="actualizare" role="status">
            {t('actualizare.gata')}
            <button type="button" onClick={aplicaActualizare}>{t('eroare.reincarca')}</button>
          </span>
        );
      case 'cursor':
        return <CipCursor cursor={cursor} />;
      case 'zoom':
        return <CipZoom scara={scara} />;
      case 'jurnal':
        return <span data-testid="jurnal" className={intrari > 0 ? 'cip cip-rosu' : 'cip'}>{t('jurnal.intrari', { n: intrari })}</span>;
      case 'traseu': {
        // Starea traseului (ADR 0038 §2, §3): doar când e ceva de spus; traseul la zi și desenat n-are cip.
        if (!traseu?.arata) return null;
        const [cheie, clasa, motiv] = traseu.stare === 'calcul' ? ['traseu.calcul', 'cip', ''] as const
          : traseu.stare === 'refuz' && traseu.rev === doc.rev ? ['traseu.refuz', 'cip cip-rosu', traseu.motiv ?? ''] as const
            : stareStrat === 'fara-webgl' ? ['traseu.fara-webgl', 'cip cip-atentie', ''] as const
              : stareStrat === 'context-pierdut' ? ['traseu.context', 'cip cip-atentie', ''] as const
                : traseuVechi ? ['traseu.vechi', 'cip cip-atentie', ''] as const
                  : traseuPregatit?.rarit ? ['traseu.rarit', 'cip', ''] as const : [null, '', ''] as const;
        const text = cheie === null ? '' : t(cheie, { motiv });
        const stareCip = cheie === null ? null
          : <span data-testid="traseu-stare" data-stare={cheie} className={clasa} role="status" title={text}>{text}</span>;
        // Timpul jobului, doar pentru traseul la zi și pentru `$$`-ul de acum (ADR 0046 §8).
        const tt = timpTraseu;
        const timp = traseu.stare !== 'gata' || traseuVechi || !tt || tt.program !== traseu.program || tt.setari !== setariMasina ? null
          : <Suspense fallback={null}><CipTimpTraseu r={tt.r} /></Suspense>;
        return stareCip === null && timp === null ? null : <>{stareCip}{timp}</>;
      }
    }
  };

  const intrare = (x: Intrare, zona: IdZona): ReactNode => ('actiune' in x ? unealta(x, zona) : 'control' in x ? control(x.control) : cip(x.cip));

  /** Grupurile unei zone, în ordinea aranjamentului. */
  const grupuri = (zona: IdZona): ReactNode => aranjament.zone[zona].map((g) => (
    <div key={g.id} className="grup" data-grup={g.id}>
      {g.intrari.map((x) => <Fragment key={cheieIntrare(x)}>{intrare(x, zona)}</Fragment>)}
    </div>
  ));

  /** Ce arată un panou deschis. */
  const continutPanou = (p: IdPanou): ReactNode => {
    switch (p) {
      case 'lista':
        return (
          <ListaVectori
            foaie={radacinaArbore}
            randuri={randuri}
            onAlege={(id) => { ruleazaDocument('selectie.din-lista', context({ alese: () => [id] })); }}
          />
        );
      case 'proprietati':
        return (
          <Suspense fallback={null}>
            <PanouProprietati
              doc={doc} alese={selectieValida} elemente={selectieDesen.length} cutie={cutieSelectie} doarCitire={doarCiteste(mod)}
              onPozitie={(p) => aplicaDinPanou('document.pozitioneaza', { pozitieNoua: () => p })}
              onRotire={(r) => aplicaDinPanou('document.roteste', { rotireNoua: () => r })}
              onStoc={(s) => aplicaDinPanou('foaie.stoc', { stocNou: () => s })}
              onEditeazaOperatii={() => { executa('export.gcode'); }}
            />
          </Suspense>
        );
    }
  };

  /** Un panou: insula lui, cu butonul care îl strânge în colț. Strâns, rămâne doar butonul. */
  const panou = (p: IdPanou): ReactNode => (
    <section key={p} className="insula panou" data-panou={p} data-deschis={panouri[p]}>
      {buton(COMUTA_PANOU[p], 'data-actiune', { 'aria-expanded': panouri[p] })}
      {panouri[p] && continutPanou(p)}
    </section>
  );
  const deschise = (d: 'stanga' | 'dreapta'): boolean => aranjament.docuri[d].some((p) => panouri[p]);

  return (
    <>
      {/*
        Sub dialog (și sub paletă), aplicația e inertă: nici Tab, nici clicul nu mai ajung la bare sau la pânză. Pânza ține
        tot ecranul; barele, panourile și cipurile plutesc deasupra ei, într-o grilă care lasă clicul să treacă prin golurile
        ei (`pointer-events`). Zona liberă din mijloc e locul în care se potrivește foaia.
      */}
      <div className="aplicatie" inert={modal} data-aranjament={aranjament.id} data-stanga={deschise('stanga')} data-dreapta={deschise('dreapta')}>
        <header className="sus">
          <div className="insula marca">
            <h1>{t('app.titlu')}</h1>
            <span data-testid="instanta" className="instanta">{t('app.instanta', { nume: instanta })}</span>
          </div>
          <div className="insula bara" role="toolbar" aria-label={t('bara.actiuni')}>
            {grupuri('sus')}
          </div>
          {aranjament.zone.unelte.length > 0 && <div className="insula unelte">{grupuri('unelte')}</div>}
        </header>
        {/* Fereastra de fișiere a importului: în afara barelor, ca importul să meargă din orice aranjament (și din paletă). */}
        <input ref={fisierImport} type="file" accept=".svg,image/svg+xml" multiple hidden data-camp="fisier-svg"
          onChange={(e) => { alesFisier(e.target.files); e.target.value = ''; }} />
        <div className="lucru">
          <Panza
            forme={forme}
            foaie={stoc}
            selectie={selectieDesen}
            onClic={(x, y, toleranta) => {
              const punct = () => ({ x, y, toleranta });
              // Un clic dat înaintea modulului alegerii se aplică la sosirea lui tot prin ușă (garda dialogului).
              ruleazaDocument('selectie.la-punct', context({
                punct,
                dinNou: () => { ruleazaDocument('selectie.la-punct', context({ punct })); },
                jurnal: (e) => { jurnal.adauga('promisiune', e); },
              }));
            }}
            onMutare={(dx, dy) => { ruleazaDocument('document.muta-selectia', context({ deplasare: () => ({ dx, dy }) })); }}
            zona={zona}
            potrivire={potrivire}
            cutie={cutieSelectie}
            onCursor={cursor.scrie}
            onScara={scara.scrie}
            {...(traseu?.arata && traseuPregatit && stareStrat !== 'fara-webgl' ? {
              strat: (v: Vedere, m: { readonly latime: number; readonly inaltime: number; readonly dpr: number }) => (
                <Suspense fallback={null}>
                  <StratTraseu key={cheieStrat} bucati={traseuPregatit.bucati} vedere={v} marime={m} stins={traseuVechi} onStare={setStareStrat}
                    onLent={() => { setBugetTraseu((b) => Math.max(BUGET_TRASEU_MINIM, Math.floor(b / 2))); }} />
                </Suspense>
              ),
            } : {})}
            {...(modal ? {} : { onFisiere: (fisiere: readonly File[], punct: { readonly x: number; readonly y: number } | null) => { pornesteImport(fisiere, punct); } })}
            {...(lipeste ? { lipeste } : {})}
            {...(desen ? { desen } : {})}
            suprapunere={(v, m, l) => (
              <Suspense fallback={null}>
                <Editare doc={doc} selectie={selectieValida} cutie={cutieSelectie} vedere={v} marime={m} linii={l} zona={zona} doarCitire={doarCiteste(mod)}
                  ruleaza={(id, extra) => { ruleazaDocument(id, context(extra)); }} onLipeste={setLipesteStabil} onDesen={setDesenStabil} />
              </Suspense>
            )}
            textLasare={t('import.lasa-aici')}
          >
            {/*
              Bara se montează din nou când apare o selecție și când se închide un dialog sau paleta (cheia): de fiecare
              dată reia garda de 0,3 s din CSS (`apare`), în care clicul trece prin ea. Între timp își păstrează focusul
              (Duplică apăsat de la tastatură nu-l pierde).
            */}
            {selectieValida.length > 0 && aranjament.zone.selectie.length > 0 && (
              <div key={String(modal)} className="insula" role="toolbar" aria-label={t('bara.selectie')}>
                {grupuri('selectie')}
              </div>
            )}
          </Panza>
        </div>
        <div className="doc doc-stanga">{aranjament.docuri.stanga.map(panou)}</div>
        <div className="zona-libera" ref={zona} aria-hidden="true" />
        <div className="doc doc-dreapta">{aranjament.docuri.dreapta.map(panou)}</div>
        <footer className="jos">{grupuri('jos')}</footer>
      </div>
      {paleta && (
        <Suspense fallback={null}>
          <Paleta
            tasta={tastaActiunii}
            elemente={[
              ...toate(registruImport, importFaraFisier()), ...toate(registruExport, contextExport()),
              ...toate(registru, context()), ...toate(registruVedere, contextVedere),
            ]}
            onAlege={(id) => {
              setPaleta(false);
              // După închidere: aplicația nu mai e inertă, iar fereastra de fișiere a importului se poate deschide.
              setTimeout(() => { executa(id); }, 0);
            }}
            onInchide={() => { setPaleta(false); }}
            focusInapoi={focusPaleta.current}
          />
        </Suspense>
      )}
      <Suspense fallback={null}>
      {dialogExport && (
        <DialogExport
          baza={bazaNoua}
          doc={doc}
          dupaIdLume={harti.dupaIdLume}
          lume={lume}
          descriere={descriere}
          limba={limbaActiva}
          doarCitire={doarCiteste(mod)}
          stare={stareExport}
          onExporta={(noi, c) => { exporta(noi, c); }}
          onInchide={() => { cerereExport.current++; exportInCurs.current = false; opresteSimularea(); setDialogExport(false); }}
          onReseteaza={() => { cerereExport.current++; exportInCurs.current = false; opresteSimularea(); setStareExport(null); }}
          setariMasina={setariMasina}
          onSetariMasina={setSetariMasina}
        />
      )}
      {coadaImport && (
        <DialogImport
          fisiere={coadaImport.fisiere}
          punct={coadaImport.punct}
          registruImport={registruImport}
          contextImport={contextImport}
          stareImporta={(p, loc) => stare(registru, 'document.importa', contextImportNou(p, loc))}
          importa={(p, loc) => ruleaza(registru, 'document.importa', contextImportNou(p, loc))}
          onInchide={() => { setCoadaImport(null); }}
        />
      )}
      </Suspense>
    </>
  );
}
