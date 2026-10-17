import { Fragment, lazy, Suspense, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Panza } from '../canvas/Panza.tsx';
import { treaptaZoom, type Bucata, type Vedere } from '../canvas/protocol.ts';
import type { StareStrat } from '../canvas/StratTraseu.tsx';
import type { Miscare } from '../ir/ir.ts';
import { CUTIE_GOALA, uneste } from '../geom/cutie.ts';
import { t, type CheieSimpla } from '../i18n/t.ts';
import { LIMBI, type Limba } from '../i18n/tipuri.ts';
import { avertismente } from '../model/avertismente.ts';
import { documentNou, esteCaleDeschisa, type Document, type Operatie } from '../model/document.ts';
import { cutieElement } from '../model/forme.ts';
import { istoricNou, type Istoric } from '../model/jurnal.ts';
import { elementeFoaie, type ElementLume } from '../model/lume.ts';
import { creeazaRegistru, ruleaza, stare, toate, type RezultatActiune } from '../ui/actiuni.ts';
import { ACTIUNI_DOCUMENT, type ContextDocument } from '../ui/actiuniDocument.ts';
import {
  ARANJAMENT_MODERN, cheieIntrare, COMUTA_PANOU, PANOURI,
  type Aranjament, type IdCip, type IdControl, type IdPanou, type IdZona, type Intrare, type Unealta,
} from '../ui/aranjament.ts';
import { CipCursor, CipZoom, semnal, type PunctFoaie } from '../ui/CipuriVedere.tsx';
import { ACTIUNI_VEDERE, type ContextVedere } from '../ui/actiuniVedere.ts';
import { actiuneaTastei, tastaActiunii, tastaApasata } from '../ui/scurtaturi.ts';
import { ACTIUNI_EXPORT, type ContextExport, type ParametriExport, type RezultatExport } from '../ui/actiuniExport.ts';
import { ACTIUNI_IMPORT, PLAFON_IMPORT, preincarcaImport, type ContextImport, type FisierImport, type PrevizualizareImport } from '../ui/actiuniImport.ts';
import type { CerereExport, OperatieExport, StareExport } from '../ui/DialogExport.tsx';
import { incarcaNivelPiesa, ListaVectori, type RandLista } from '../ui/ListaVectori.tsx';
import { useLimba } from '../ui/useLimba.ts';
import type { RezultatConfig } from './config.ts';
import { listaDesen } from './desen.ts';
import type { Jurnal } from './jurnalErori.ts';
import { operatieDinDialog } from './valoriOperatii.ts';
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
const incarcaDialogExport = () => import('../ui/DialogExport.tsx');
const incarcaDialogImport = () => import('../ui/DialogImport.tsx');
const DialogExport = lazy(() => incarcaDialogExport().then((m) => ({ default: m.DialogExport }), () => ({ default: DialogNeincarcat })));
const DialogImport = lazy(() => incarcaDialogImport().then((m) => ({ default: m.DialogImport }), () => ({ default: DialogNeincarcat })));
/** Paleta de comenzi și panoul de proprietăți vin tot la cerere (prototipul B): nu intră în pachetul de pornire. */
const incarcaPaleta = () => import('../ui/Paleta.tsx');
const incarcaProprietati = () => import('./PanouProprietati.tsx');
const Paleta = lazy(() => incarcaPaleta().then((m) => ({ default: m.Paleta }), () => ({ default: DialogNeincarcat })));
// Panoul care nu se poate aduce rămâne gol: e doar de citit, iar selecția se vede și în listă și în bara de jos.
const PanouProprietati = lazy(() => incarcaProprietati().then((m) => ({ default: m.PanouProprietati }), () => ({ default: () => null })));
/** Stratul traseului (ADR 0038 §3) vine la primul „Arată traseul”: WebGL2 nu intră în pachetul de pornire. */
const StratTraseu = lazy(() => import('../canvas/StratTraseu.tsx').then((m) => ({ default: m.StratTraseu }), () => ({ default: () => null })));

/**
 * Traseul de pe pânză (ADR 0038 §2): ultimul program calculat la „Arată traseul”, cu revizia documentului de atunci
 * (altă revizie = traseul e vechi, stins). `miscari` rămâne cât se calculează din nou, ca pânza să nu clipească.
 */
type StareTraseu = {
  readonly arata: boolean;
  readonly stare: 'calcul' | 'gata' | 'refuz';
  readonly rev: number;
  readonly miscari: readonly Miscare[] | null;
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

export function App({ config, jurnal, diagnostic, alegeLimba, alegeTema, proiect, aranjament = ARANJAMENT_MODERN }: Props) {
  const limbaActiva = useLimba();
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
  const [bugetTraseu, setBugetTraseu] = useState(BUGET_TRASEU);
  const [stareStrat, setStareStrat] = useState<StareStrat>('ok');
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
  /**
   * Importul SVG (ADR 0035 §9): fișierul ales, px-ul și previzualizarea. Cât e deschis, documentul nu se schimbă pe altă
   * cale: „Importă” adaugă exact ce arată dialogul.
   */
  const [dialogImport, setDialogImport] = useState<{
    readonly fisier: FisierImport | null; readonly nume: string; readonly px: 96 | 72; readonly pxAutomat: boolean;
    readonly stare: PrevizualizareImport | 'citire';
    /** Se recitește cu alt px: previzualizarea veche rămâne pe ecran (și focusul pe alegere), dar „Importă” e oprit. */
    readonly seRecitesc?: boolean;
  } | null>(null);
  /** Numărul ultimei citiri: un rezultat întârziat al unei citiri vechi (alt fișier, alt px, dialog închis) se aruncă. */
  const cerereImport = useRef(0);
  const fisierImport = useRef<HTMLInputElement>(null);
  /**
   * Coada fișierelor alese sau lăsate pe planșă (felia 2.8b): dialogul le trece pe rând; `punct` e locul lăsării (mm ai
   * foii), sau null (butonul, ori lăsate în afara pânzei).
   */
  const [coadaImport, setCoadaImport] = useState<{
    readonly fisiere: readonly File[]; readonly k: number; readonly punct: { readonly x: number; readonly y: number } | null;
  } | null>(null);
  /**
   * Numărul ultimei cereri de export. Un rezultat întârziat (calculul se încarcă la cerere) e al altor parametri dacă între
   * timp s-a pornit alt export, s-a schimbat un parametru sau s-a închis dialogul: nu se afișează și nu se descarcă.
   */
  const cerereExport = useRef(0);
  /** Un export pornit, al cărui rezultat n-a venit încă (calculul se încarcă la cerere). */
  const exportInCurs = useRef(false);
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
        setStareExport({ ok: true, linii: r.program.linii, sha256: r.program.sha256, avertismente: r.avertismente });
      } else {
        setStareExport('cereConfirmare' in r ? { ok: false, motiv: r.motiv, cereConfirmare: r.cereConfirmare } : { ok: false, motiv: r.motiv });
      }
    },
  });
  const doc = istoric.doc;
  const foaie = doc.foi[0] ?? documentNou(FOAIA_IMPLICITA).foi[0];
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

  const context = (extra: Partial<Pick<ContextDocument, 'deplasare' | 'punct' | 'alese' | 'operatiiNoi' | 'importNou' | 'locImport' | 'pozitieNoua' | 'rotireNoua' | 'stocNou'>> = {}): ContextDocument => ({
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

  // Dialogurile, aduse în fundal după pornire (vezi `DialogNeincarcat`).
  useEffect(() => {
    const id = setTimeout(() => {
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
  dialogDeschis.current = dialogExport || dialogImport !== null;
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
          if (r.ok) setTraseu({ arata: true, stare: 'gata', rev: d.rev, miscari: r.program.miscari, motiv: null });
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
   * Dialogul de export arată operațiile pieselor de pe foaie (ADR 0025): câte un rând pe operație, cu descrierea primului
   * ei element în prima instanță a piesei. Freza e comună tuturor, până la schimbarea sculei. Se calculează doar cu
   * dialogul deschis, liniar (o hartă a pieselor, o mulțime a celor văzute), o dată pe document și pe limbă.
   */
  const exportFoaie = useMemo(() => {
    if (!dialogExport) return null;
    const piese = new Map(doc.piese.map((p) => [p.id, p]));
    const vazute = new Set<string>();
    const lista: Array<{ readonly piesa: Document['piese'][number]; readonly instanta: string }> = [];
    for (const i of doc.foi[0]?.instante ?? []) {
      const p = vazute.has(i.piesa) ? undefined : piese.get(i.piesa);
      if (!p) continue;
      vazute.add(p.id);
      lista.push({ piesa: p, instanta: i.id });
    }
    const randuriOp: OperatieExport[] = lista.flatMap(({ piesa, instanta: inst }) => piesa.operatii.map((o) => {
      const e = harti.dupaIdLume.get(`${inst}/${o.noduri[0] ?? ''}`);
      const baza = e ? descriere(e) : (piesa.nume ?? piesa.id);
      return {
        cheie: `${piesa.id}/${o.id}`,
        descriere: o.noduri.length > 1 ? `${baza} (+${o.noduri.length - 1})` : baza,
        // Câte căi deschise taie operația (ADR 0037 §12): dialogul nu oferă ce refuză exportul pe ele.
        deschise: o.noduri.filter((n) => {
          const e = harti.dupaIdLume.get(`${inst}/${n}`);
          return e !== undefined && esteCaleDeschisa(e.forma);
        }).length,
        noduri: o.noduri.length,
        valori: {
          latura: o.latura, sens: o.sens, adancime: o.adancime, pas: o.pas,
          urechi: o.urechi ? { numar: o.urechi.numar, latime: o.urechi.latime, grosime: o.urechi.grosime } : null,
          rampa: o.rampa ? { lungime: o.rampa.lungime } : null,
          intrari: o.intrari ? { raza: o.intrari.raza } : null,
          colturi: o.colturi ? { tip: o.colturi.tip } : null,
          ...(o.despartire ? { despartire: true } : {}),
        },
      };
    }));
    const operatii = lista.flatMap(({ piesa }) => piesa.operatii);
    return {
      piese: lista,
      randuri: randuriOp,
      diametru: operatii[0]?.scula.diametru ?? 6,
      // Freza la care Exportă aduce toate operațiile: numărul primei, cu diametrul din dialog.
      numar: operatii[0]?.scula.numar ?? 1,
      freze: [...new Map(operatii.map((o) => [`${o.scula.numar}/${o.scula.diametru}`, { numar: o.scula.numar, diametru: o.scula.diametru }])).values()],
      descrieri: new Map(lume.map((e) => [e.idLume, descriere(e)])),
    };
  }, [dialogExport, doc, harti, lume, limbaActiva]);

  /**
   * Exportă: întâi valorile din dialog intră în document, ca o singură comandă (se salvează, Ctrl+Z le scoate), apoi
   * exportul citește documentul. Scrierea trece pe lângă ușa oprită sub dialog: e chiar gestul dialogului. Într-o filă
   * care doar citește, acțiunea e inactivă, iar dialogul n-a lăsat nimic de schimbat.
   */
  const exporta = (c: CerereExport): void => {
    // Fila care n-a putut citi ultima versiune ar exporta una veche: refuză, cu motivul din bara de jos, în dialog.
    if (mod === 'necitita') {
      setStareExport({ ok: false, motiv: t('depozit.necitita', { motiv: motivNecitit }) });
      return;
    }
    const noi = new Map<string, Operatie[]>();
    const numar = exportFoaie?.numar ?? 1;
    for (const { piesa } of exportFoaie?.piese ?? []) {
      noi.set(piesa.id, piesa.operatii.map((o) => operatieDinDialog(o, c.valori.get(`${piesa.id}/${o.id}`), { numar, diametru: c.diametru })));
    }
    const scris = ruleaza(registru, 'document.aplica-operatii', context({ operatiiNoi: () => noi }));
    // Doar citirea nu oprește exportul (operațiile din document rămân cele de exportat); orice alt refuz, da.
    if (!scris.ok && scris.motiv !== 'motiv.doar-citire') {
      setStareExport({ ok: false, motiv: t(scris.motiv) });
      return;
    }
    const { origine, z0 } = c;
    exportInCurs.current = true;
    const r = ruleaza(registruExport, 'export.gcode', contextExport({
      origine, z0, ...(c.confirmareIesire ? { confirmareIesire: c.confirmareIesire } : {}),
    }, ++cerereExport.current));
    // Un export refuzat înainte de calcul (nimic de exportat, nicio operație) spune de ce, nu lasă rezultatul vechi.
    if (!r.ok) {
      exportInCurs.current = false;
      setStareExport({ ok: false, motiv: t(r.motiv) });
    }
  };

  /**
   * Citește fișierul ales cu `px` px pe țol. Un fișier pe care îl spune Illustrator și a cărui mapare depinde de px se
   * recitește o dată cu 72 (ADR 0035 §2), iar dialogul spune de ce.
   */
  const contextImport = (f: FisierImport | null, px: 96 | 72, rezultat: (r: PrevizualizareImport) => void): ContextImport => ({
    fisier: () => f,
    pxPeTol: () => px,
    limba: () => limbaActiva,
    doarCitire: () => doarCiteste(mod),
    rezultat,
    jurnal: (e) => { jurnal.adauga('import', e); },
  });
  const citesteImport = (f: FisierImport, px: 96 | 72, automat: boolean, vechi?: PrevizualizareImport): void => {
    const cerere = ++cerereImport.current;
    setDialogImport(vechi
      ? { fisier: f, nume: f.nume, px, pxAutomat: automat, stare: vechi, seRecitesc: true }
      : { fisier: f, nume: f.nume, px, pxAutomat: automat, stare: 'citire' });
    const pornit = ruleaza(registruImport, 'import.svg', contextImport(f, px, (r) => {
      if (cerere !== cerereImport.current) return;
      if (!automat && px === 96 && r.ok && r.px && r.illustrator) {
        citesteImport(f, 72, true);
        return;
      }
      setDialogImport({ fisier: f, nume: f.nume, px, pxAutomat: automat, stare: r });
    }));
    // Acțiunea oprită (fila a trecut între timp pe „doar citire”): dialogul nu așteaptă un rezultat care nu vine.
    if (!pornit.ok) inchideImport();
  };
  /** Un fișier al cozii: deocamdată doar SVG (după nume sau tip); celelalte formate vin mai târziu. */
  const incepeFisier = (f: File): void => {
    if (!/\.svg$/i.test(f.name) && f.type !== 'image/svg+xml') {
      cerereImport.current++;
      setDialogImport({ fisier: null, nume: f.name, px: 96, pxAutomat: false, stare: { ok: false, cod: 'tip' } });
      return;
    }
    // Peste plafon, fișierul nu se citește deloc (ADR 0035 §1).
    if (f.size > PLAFON_IMPORT.octeti) {
      cerereImport.current++;
      setDialogImport({ fisier: null, nume: f.name, px: 96, pxAutomat: false, stare: { ok: false, cod: 'octeti', detaliu: String(f.size) } });
      return;
    }
    const cerere = ++cerereImport.current;
    setDialogImport({ fisier: null, nume: f.name, px: 96, pxAutomat: false, stare: 'citire' });
    f.arrayBuffer().then((b) => {
      if (cerere === cerereImport.current) citesteImport({ nume: f.name, octeti: new Uint8Array(b) }, 96, false);
    }, (e: unknown) => {
      if (cerere === cerereImport.current) {
        setDialogImport({ fisier: null, nume: f.name, px: 96, pxAutomat: false, stare: { ok: false, cod: 'parsare', detaliu: String(e) } });
      }
    });
  };
  const pornesteImport = (fisiere: readonly File[], punct: { readonly x: number; readonly y: number } | null): void => {
    const f = fisiere[0];
    // Fila care doar citește nu importă (ca butonul, oprit): o lăsare pe planșă nu mai deschide un dialog care rămâne
    // pentru totdeauna la „Se citește fișierul…” (recenzia A).
    if (!f || doarCiteste(mod)) return;
    setCoadaImport({ fisiere, k: 0, punct });
    incepeFisier(f);
  };
  const alesFisier = (lista: FileList | null): void => { pornesteImport(lista ? [...lista] : [], null); };
  const pornesteImportRef = useRef(pornesteImport);
  pornesteImportRef.current = pornesteImport;
  // Locul piesei din coadă: punctul lăsat, apoi fiecare fișier următor cu 10 mm la dreapta și în jos (nu cad unul peste altul).
  const locImport = coadaImport?.punct ? { x: coadaImport.punct.x + 10 * coadaImport.k, y: coadaImport.punct.y - 10 * coadaImport.k } : null;
  const importOk = dialogImport && dialogImport.stare !== 'citire' && dialogImport.stare.ok ? dialogImport.stare : null;
  const stareImport = importOk ? stare(registru, 'document.importa', context({ importNou: () => importOk.pregatit, locImport: () => locImport })) : null;
  const inchideImport = (): void => {
    cerereImport.current++;
    setDialogImport(null);
    setCoadaImport(null);
  };
  /** Fișierul următor din coadă (după „Importă” sau „Sari peste”), sau închiderea dialogului. */
  const urmatorulImport = (): void => {
    const c = coadaImport;
    const urm = c ? c.fisiere[c.k + 1] : undefined;
    if (!c || !urm) {
      inchideImport();
      return;
    }
    setCoadaImport({ ...c, k: c.k + 1 });
    incepeFisier(urm);
  };

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

  /** Un control care nu e acțiune: limba, ca butoane apăsate / neapăsate. */
  const control = (c: IdControl): ReactNode => {
    switch (c) {
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
        if (cheie === null) return null;
        const text = t(cheie, { motiv });
        return <span data-testid="traseu-stare" data-stare={cheie} className={clasa} role="status" title={text}>{text}</span>;
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
            onClic={(x, y, toleranta) => { ruleazaDocument('selectie.la-punct', context({ punct: () => ({ x, y, toleranta }) })); }}
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
      {dialogExport && exportFoaie && (
        <DialogExport
          baza={bazaNoua}
          operatii={exportFoaie.randuri}
          diametru={exportFoaie.diametru}
          freze={exportFoaie.freze}
          descrieri={exportFoaie.descrieri}
          doarCitire={doarCiteste(mod)}
          stare={stareExport}
          onExporta={(c) => { exporta(c); }}
          onInchide={() => { cerereExport.current++; exportInCurs.current = false; setDialogExport(false); }}
          onReseteaza={() => { cerereExport.current++; exportInCurs.current = false; setStareExport(null); }}
        />
      )}
      {dialogImport && (
        <DialogImport
          nume={dialogImport.nume}
          stare={dialogImport.stare}
          pxPeTol={dialogImport.px}
          pxAutomat={dialogImport.pxAutomat}
          seRecitesc={dialogImport.seRecitesc === true}
          motiv={stareImport && !stareImport.ok ? stareImport.motiv : null}
          onPx={(px) => {
            if (dialogImport.fisier) citesteImport(dialogImport.fisier, px, dialogImport.pxAutomat, importOk ?? undefined);
          }}
          onImporta={() => {
            // Un dublu-clic nu importă de două ori: clicul e un eveniment discret, deci React închide dialogul înaintea
            // celui de-al doilea (otrava care scotea o gardă de aici a scăpat: garda era cod mort; e2e-ul o arată).
            if (!importOk || dialogImport.seRecitesc) return;
            const r = ruleaza(registru, 'document.importa', context({ importNou: () => importOk.pregatit, locImport: () => locImport }));
            if (r.ok) urmatorulImport();
          }}
          onInchide={inchideImport}
          {...(coadaImport && coadaImport.fisiere.length > 1
            ? { coada: { k: coadaImport.k + 1, n: coadaImport.fisiere.length }, onSari: urmatorulImport }
            : {})}
        />
      )}
      </Suspense>
    </>
  );
}
