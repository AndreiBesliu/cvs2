/**
 * Extensiile (ADR 0127 §B, §C): butonul discret de lângă marcă (piesa de puzzle), meniul lui (extensiile instalate,
 * instalarea din fișier și din adresă, gestionarea) și fereastra extensiei deschise (ADR 0160 §A): o filă în meniul global,
 * după ale aranjamentului, cu numele ei și ×, și dedesubt cadrul, pe tot ecranul, ca fereastra Mașina. Trecerea la altă
 * fereastră o ascunde, iar cadrul rulează mai departe; × o închide. Modulul vine după prima randare (nu în pachetul de
 * pornire); ferestrele instalării (`Instalare.tsx`) și cadrul (`cadru.ts`) vin la cerere.
 *
 * Pluginul ca parte din cvs2 (ADR 0164): contextul cadrului poartă tema (și fonturile, și `color-scheme`) și, cu permisiunea
 * `cont`, contul, trimise din nou la fiecare schimbare (tema, limba, intrarea sau ieșirea din cont, și din altă filă). × (și
 * altă extensie deschisă, ori o versiune nouă instalată peste cea deschisă) îi cere întâi extensiei salvările ei, cel mult 5 s;
 * dacă tot rămâne ceva nesalvat, întreabă: „Rămân” (și Escape) sau „Închide oricum”. Reîncărcarea paginii întreabă și ea,
 * prin browser, cât extensia are modificări nesalvate. Extensia își poate cere repornirea (`host.reporneste`, ADR 0165: de
 * exemplu, la o limbă nouă): cadrul se reface, cu contextul de acum; cel mult o dată la 2 s (`repornire.ts`: una cerută mai
 * devreme așteaptă, iar cererile de până atunci se adună în ea).
 *
 * Linkul de instalare (`#instaleaza=<adresa>`) deschide fereastra adresei, completată; nimic nu se descarcă fără clic, iar
 * ancora se șterge din adresă.
 *
 * Biblioteca (ADR 0230): sub cele instalate, secțiunea Biblioteca, cu catalogul cerut la fiecare deschidere a meniului (cele
 * instalate apar pe loc, din browser; nicio cerere la pornire). Fiecare rând: numele, versiunea, descrierea în limba aplicației,
 * ce cere pe scurt, mărimea și „Instalează” (fereastra instalării), „Actualizează la …” (dintr-un clic, în meniu, când versiunea
 * nouă nu cere nimic în plus; altfel fereastra), „Instalată”, o versiune alta sau „Reîncarcă”. O extensie instalată cu o versiune
 * mai nouă în bibliotecă are lângă nume „actualizare: …”. Linkul `#biblioteca=<id>` deschide fereastra rândului; nimic nu se
 * descarcă fără clic.
 */
import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { aboneazaCont, contTinut } from '../app/dreptCont.ts';
import type { Jurnal } from '../app/jurnalErori.ts';
import '../i18n/carcasa.ts';
import { mesajeGata } from '../i18n/laCerere.ts';
import { cuMesaje, t, type CheieSimpla } from '../i18n/t.ts';
import { useLimba } from '../ui/useLimba.ts';
import type { FormeCvs2 } from '../../extensii/api.ts';
import { ADRESA_CATALOG, type CatalogBiblioteca, type RandBiblioteca } from '../../shared/biblioteca.ts';
import { cereCatalogul, instaleazaDinBiblioteca, stareRand, type RefuzBiblioteca } from './biblioteca.ts';
import type { CadruPornit, GazdaForme, GazdaMasina } from './cadru.ts';
import { contextPentruExtensie } from './cont.ts';
import { FaraStocare, listaExtensii, scrieExtensia, type ExtensieInstalata } from './depozit.ts';
import { CATALOG_PERMISIUNI } from './pachet.ts';
import { repornireRara } from './repornire.ts';
import type { CerereInstalare } from './tipuri.ts';
import './extensii.css';

/** Mesajele modulului, ca date (ADR 0086): cine îl încarcă le așteaptă (`cuMesaje`). */
export const mesaje = mesajeGata();
mesaje.catch(() => undefined);

const Instalare = lazy(() => import('./Instalare.tsx').then(cuMesaje).then((m) => ({ default: m.Instalare })));

const ANCORA_INSTALARE = '#instaleaza=';
const ANCORA_BIBLIOTECA = '#biblioteca=';

/** Catalogul bibliotecii, cum îl vede meniul: se încarcă, a venit, fără rețea, ori un defect al publicării. */
type StareBiblioteca =
  | { readonly fel: 'incarca' }
  | { readonly fel: 'ok'; readonly catalog: CatalogBiblioteca }
  | { readonly fel: 'retea' }
  | { readonly fel: 'defect'; readonly detaliu: string };
/** O actualizare dintr-un clic, în meniu (ADR 0230 §D): în lucru, gata (cu versiunea), sau ce n-a mers. */
type ProgresActualizare = { readonly fel: 'lucreaza' } | { readonly fel: 'gata'; readonly versiune: string } | { readonly fel: 'eroare'; readonly text: string };

/** Adresa absolută a catalogului: pachetele bibliotecii stau lângă el. */
const adresaCatalog = (): string => new URL(ADRESA_CATALOG, location.href).href;
const motivText = (m: RefuzBiblioteca['motiv'], detaliu?: string): string =>
  `${t(`extensii.motiv.${m}` as CheieSimpla)}${detaliu ? ` (${detaliu})` : ''}`;

/** Săgețile mută focusul între rândurile meniului; Escape și Tab îl închid (ca meniul contului). */
function tastaInMeniu(e: KeyboardEvent<HTMLDivElement>, inchide: () => void): void {
  const randuri = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')];
  const i = randuri.indexOf(document.activeElement as HTMLButtonElement);
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    const n = randuri.length;
    if (n > 0) randuri[(i + (e.key === 'ArrowDown' ? 1 : n - 1) + (i < 0 ? 1 : 0)) % n]?.focus();
  } else if (e.key === 'Escape' || e.key === 'Tab') {
    if (e.key === 'Escape') e.preventDefault();
    inchide();
  }
}

export function Extensii({ jurnal, fereastra, onFereastra, onDeschisa, onModal, masina, forme }: {
  readonly jurnal: Jurnal;
  /** Fereastra extensiei e cea de acum: fila ei e apăsată. */
  readonly fereastra: boolean;
  /** Fila extensiei: deschide fereastra ei. */
  readonly onFereastra: () => void;
  /** Extensia deschisă (id-ul și numele), sau null: carcasa îi arată fereastra, sau revine din ea la Proiectare. */
  readonly onDeschisa: (x: {
    readonly id: string; readonly nume: string;
    /** Cu permisiunea `forme` (ADR 0166 §B): trimite extensiei formele alese de om în desen; altfel null. */
    readonly forme: ((f: FormeCvs2) => void) | null;
  } | null) => void;
  /** O fereastră a extensiilor (instalarea, gestionarea) e deschisă: aplicația de sub ea e inertă. */
  readonly onModal: (deschisa: boolean) => void;
  /** Ce dă carcasa senderului extensiilor (ADR 0160 §B). */
  readonly masina: GazdaMasina;
  /** Ce dă carcasa formelor propuse de extensie (ADR 0166 §C): fereastra Importă. */
  readonly forme: GazdaForme;
}): ReactNode {
  const limba = useLimba();
  const [loc] = useState(() => document.getElementById('loc-extensii'));
  const [locFila] = useState(() => document.getElementById('loc-fila-extensie'));
  const [locSpatiu] = useState(() => document.getElementById('loc-spatiu-extensie'));
  const [lista, setLista] = useState<readonly ExtensieInstalata[]>([]);
  const [meniu, setMeniu] = useState<{ readonly top: number; readonly left: number } | null>(null);
  const [cerere, setCerere] = useState<CerereInstalare | null>(null);
  const [deschisa, setDeschisa] = useState<ExtensieInstalata | null>(null);
  const [stare, setStare] = useState<{ readonly fel: 'porneste' | 'pornit' } | { readonly fel: 'esuat'; readonly mesaj: string }>({ fel: 'porneste' });
  // Biblioteca (ADR 0230): catalogul cerut la deschiderea meniului (doar ultima cerere contează) și actualizările din meniu.
  const [biblioteca, setBiblioteca] = useState<StareBiblioteca | null>(null);
  const cerereCatalog = useRef(0);
  const [progres, setProgres] = useState<Readonly<Record<string, ProgresActualizare>>>({});
  const deschisaRef = useRef(deschisa);
  deschisaRef.current = deschisa;
  const buton = useRef<HTMLButtonElement | null>(null);
  const refMeniu = useRef<HTMLDivElement | null>(null);
  const fisier = useRef<HTMLInputElement | null>(null);
  const cadru = useRef<HTMLDivElement | null>(null);
  const trimiteContext = useRef<(() => void) | null>(null);
  // Cadrul pornit (lucrul nesalvat, închiderea cerută); întrebarea de la închidere și ce urmează după „Închide oricum”.
  const pornit = useRef<CadruPornit | null>(null);
  const seInchide = useRef(false);
  const dupaInchidere = useRef<() => void>(() => {});
  const [intrebare, setIntrebare] = useState(false);
  const butonInchide = useRef<HTMLButtonElement | null>(null);
  // Repornirea cerută de extensie (ADR 0165): a câta pornire e (cadrul se reface la fiecare), cel mult una la 2 s.
  const [pornire, setPornire] = useState(0);
  const [repornire] = useState(() => repornireRara(() => { setPornire((n) => n + 1); }));
  // „Se pornește” din prima randare a fiecărei ferestre noi (altă extensie, aceeași redeschisă, o repornire): starea celei de
  // dinainte („pornit”) nu se mai vede niciun cadru, cât efectul de mai jos încă n-a rulat (ADR 0139). React reface randarea
  // înainte s-o arate.
  const [stareaCui, setStareaCui] = useState<{ readonly deschisa: ExtensieInstalata | null; readonly pornire: number }>({ deschisa, pornire });
  if (stareaCui.deschisa !== deschisa || stareaCui.pornire !== pornire) {
    setStareaCui({ deschisa, pornire });
    setStare({ fel: 'porneste' });
  }
  const limbaRef = useRef(limba);
  limbaRef.current = limba;
  // Gazda senderului, cea de acum: cadrul pornește o dată pe extensie, dar cere de fiecare dată prin ea.
  const masinaRef = useRef(masina);
  masinaRef.current = masina;
  const formeRef = useRef(forme);
  formeRef.current = forme;

  const reincarca = (): void => {
    void listaExtensii().then(setLista, (e: unknown) => {
      // Fără stocare (fereastră privată, IndexedDB blocat): nicio extensie. Condiția mediului e deja în jurnal, doar local.
      if (!(e instanceof FaraStocare)) jurnal.adauga('fereastra', e);
    });
  };
  useEffect(reincarca, []);
  // Un defect al publicării bibliotecii (catalogul, amprenta, potrivirea) ajunge în jurnal; lipsa rețelei nu.
  const raporteazaDefect = useCallback((e: Error): void => { jurnal.adauga('fereastra', e); }, [jurnal]);
  // Catalogul bibliotecii, cerut din nou la fiecare deschidere a meniului; cel de dinainte rămâne arătat cât vine cel nou.
  const incarcaBiblioteca = (): void => {
    const n = ++cerereCatalog.current;
    setBiblioteca((b) => (b?.fel === 'ok' ? b : { fel: 'incarca' }));
    void cereCatalogul(adresaCatalog()).then((c) => {
      if (n !== cerereCatalog.current) return;
      if (c.fel === 'defect') raporteazaDefect(new Error(`biblioteca: catalogul (${c.detaliu})`));
      setBiblioteca(c);
    });
  };
  // Linkul de instalare: la pornire și când ancora se schimbă în fila deschisă (un link lipit în aceeași filă). Linkul
  // bibliotecii (ADR 0230) deschide fereastra rândului ei, cu catalogul cerut de fereastră.
  useEffect(() => {
    const dinAncora = (): void => {
      if (location.hash.startsWith(ANCORA_BIBLIOTECA)) {
        let id = '';
        try {
          id = decodeURIComponent(location.hash.slice(ANCORA_BIBLIOTECA.length));
        } catch {
          id = '';
        }
        history.replaceState(history.state, '', `${location.pathname}${location.search}`);
        if (/^[a-z0-9-]{1,40}$/.test(id)) setCerere({ fel: 'biblioteca', id, rand: null, dinLink: true });
        return;
      }
      if (!location.hash.startsWith(ANCORA_INSTALARE)) return;
      let adresa = '';
      try {
        adresa = decodeURIComponent(location.hash.slice(ANCORA_INSTALARE.length));
      } catch {
        adresa = '';
      }
      history.replaceState(history.state, '', `${location.pathname}${location.search}`);
      setCerere({ fel: 'adresa', adresa, dinLink: true });
    };
    dinAncora();
    window.addEventListener('hashchange', dinAncora);
    return () => { window.removeEventListener('hashchange', dinAncora); };
  }, []);
  useEffect(() => { onModal(cerere !== null || intrebare); }, [cerere, intrebare, onModal]);
  useEffect(() => {
    onDeschisa(deschisa ? {
      id: deschisa.id, nume: deschisa.manifest.nume,
      forme: deschisa.manifest.permisiuni.includes('forme') ? (f) => { pornit.current?.trimiteForme(f); } : null,
    } : null);
  }, [deschisa, onDeschisa]);

  // Meniul: sub buton, cu focusul pe primul rând; un clic în afara lui îl închide. Biblioteca se cere din nou.
  const deschideMeniul = (): void => {
    const r = buton.current?.getBoundingClientRect();
    setMeniu(r ? { top: Math.round(r.bottom + 4), left: Math.max(4, Math.round(r.left)) } : { top: 48, left: 8 });
    incarcaBiblioteca();
  };
  const inchideMeniul = (): void => { setMeniu(null); buton.current?.focus(); };
  useLayoutEffect(() => {
    if (!meniu) return;
    refMeniu.current?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')?.focus();
    const afara = (e: PointerEvent): void => {
      const n = e.target as Node | null;
      if (n && !refMeniu.current?.contains(n) && !buton.current?.contains(n)) setMeniu(null);
    };
    document.addEventListener('pointerdown', afara, true);
    return () => { document.removeEventListener('pointerdown', afara, true); };
  }, [meniu]);
  const alege = (f: () => void): void => { setMeniu(null); f(); };

  /**
   * Închiderea extensiei deschise, fără pierderi (ADR 0164 §C): întâi salvările ei (`host.laInchidere`), cel mult 5 s; apoi,
   * dacă nimic nu mai e nesalvat, `dupa` (implicit închiderea); altfel întrebarea, iar „Închide oricum” face `dupa`.
   */
  const inchideCuGrija = (dupa: () => void = () => { setDeschisa(null); }): void => {
    const h = pornit.current;
    if (!h) { dupa(); return; }
    if (seInchide.current) return;
    seInchide.current = true;
    void h.cereInchiderea().then(() => {
      if (pornit.current !== h) return;
      seInchide.current = false;
      if (!h.nesalvat()) { dupa(); return; }
      dupaInchidere.current = dupa;
      setIntrebare(true);
    });
  };
  // „Rămân”: întrebarea pleacă și aplicația nu mai e inertă în aceeași randare (a clicului), apoi focusul înapoi la ×.
  const ramai = (): void => {
    setIntrebare(false);
    onModal(cerere !== null);
    setTimeout(() => { butonInchide.current?.focus(); }, 0);
  };
  // O extensie din meniu: cea deschisă doar se arată; alta o înlocuiește, după închiderea fără pierderi a celei de acum.
  const deschideExtensia = (x: ExtensieInstalata): void => {
    if (deschisa?.id === x.id) { onFereastra(); return; }
    inchideCuGrija(() => { setDeschisa(x); });
  };
  // „Deschide” după o instalare din bibliotecă: o versiune nouă a celei deschise o înlocuiește (după închiderea fără pierderi).
  const deschideInstalata = (x: ExtensieInstalata): void => {
    if (deschisa?.id === x.id && deschisa.instalat !== x.instalat) inchideCuGrija(() => { setDeschisa(x); });
    else deschideExtensia(x);
  };
  /**
   * „Actualizează la …” dintr-un clic, în meniu (ADR 0230 §D): versiunea nouă nu cere nimic în plus, deci fără fereastră.
   * Descărcarea verificată, scrierea, apoi lista; o versiune veche deschisă se închide fără pierderi.
   */
  const actualizeazaDinMeniu = async (rand: RandBiblioteca): Promise<void> => {
    setProgres((p) => ({ ...p, [rand.id]: { fel: 'lucreaza' } }));
    let r: Awaited<ReturnType<typeof instaleazaDinBiblioteca>>;
    try {
      r = await instaleazaDinBiblioteca(rand, { adresaCatalog: adresaCatalog(), scrie: scrieExtensia });
    } catch (e) {
      const text = e instanceof FaraStocare ? t('extensii.instalare.fara-stocare') : String(e);
      setProgres((p) => ({ ...p, [rand.id]: { fel: 'eroare', text } }));
      return;
    }
    if (!r.ok) {
      if (r.defect) raporteazaDefect(new Error(`biblioteca: ${rand.id} ${rand.versiune}: ${r.motiv}${r.detaliu ? ` (${r.detaliu})` : ''}`));
      const text = t('extensii.biblioteca.esec', { motiv: motivText(r.motiv, r.detaliu) });
      setProgres((p) => ({ ...p, [rand.id]: { fel: 'eroare', text } }));
      return;
    }
    setProgres((p) => ({ ...p, [rand.id]: { fel: 'gata', versiune: rand.versiune } }));
    reincarca();
    if (deschisaRef.current?.id === rand.id) inchideCuGrija();
  };

  // Fereastra: cadrul pornește la deschidere și se oprește la închidere (× sau `host.inchide()`).
  useEffect(() => {
    const container = cadru.current;
    if (!deschisa || !container) return;
    let oprit = false;
    let oprire: (() => void) | null = null;
    setStare({ fel: 'porneste' });
    const raporteaza = (mesaj: string, stiva?: string): void => {
      const e = new Error(`extensia ${deschisa.id}: ${mesaj}`);
      if (stiva) e.stack = stiva;
      jurnal.adauga('fereastra', e);
    };
    void import('./cadru.ts').then((c) => {
      if (oprit) return;
      // Contextul de acum: limba, tema și, doar cu permisiunea `cont`, contul (ADR 0164 §B).
      const contextul = () => contextPentruExtensie(limbaRef.current, c.temaDeAcum(), deschisa.manifest.permisiuni, contTinut(), Date.now());
      const h = c.pornesteCadru(container, deschisa, contextul(), (e) => {
        if (e.tip === 'pornit') setStare({ fel: 'pornit' });
        else if (e.tip === 'inchide') setDeschisa(null);
        // Salvările le face extensia întâi; cvs2 repornește cel mult o dată la 2 s, cu cererile dese adunate.
        else if (e.tip === 'reporneste') repornire.cere();
        else if (e.tip === 'esuat') { setStare({ fel: 'esuat', mesaj: e.mesaj }); raporteaza(e.mesaj); }
        else raporteaza(e.mesaj, e.stiva);
      }, {
        activ: masinaRef.current.activ,
        monteaza: () => { masinaRef.current.monteaza(); },
        trimite: (l, ext) => masinaRef.current.trimite(l, ext),
      }, { propune: (f, de) => formeRef.current.propune(f, de) });
      oprire = h.opreste;
      pornit.current = h;
      trimiteContext.current = () => { h.context(contextul()); };
    }, (e: unknown) => { setStare({ fel: 'esuat', mesaj: String(e) }); });
    return () => {
      oprit = true;
      repornire.opreste();
      trimiteContext.current = null;
      pornit.current = null;
      seInchide.current = false;
      setIntrebare(false);
      oprire?.();
    };
    // Doar la altă extensie: limba, tema și contul noi trec prin `trimiteContext`, fără repornire.
  }, [deschisa, pornire]);
  // Contul: intrarea, ieșirea (și din altă filă) sau alt plan ajung în cadru pe loc (ADR 0164 §B).
  useEffect(() => aboneazaCont(() => { trimiteContext.current?.(); }), []);
  // Reîncărcarea sau închiderea filei, cu lucru nesalvat în extensie: browserul întreabă (ADR 0164 §C).
  useEffect(() => {
    const laPlecare = (e: BeforeUnloadEvent): void => {
      if (!pornit.current?.nesalvat()) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', laPlecare);
    return () => { window.removeEventListener('beforeunload', laPlecare); };
  }, []);
  useEffect(() => { trimiteContext.current?.(); }, [limba]);
  // Tema: aleasă în aplicație (`data-tema`) sau, la „auto”, schimbată de sistem.
  useEffect(() => {
    const trimite = (): void => { trimiteContext.current?.(); };
    const o = new MutationObserver(trimite);
    o.observe(document.documentElement, { attributes: true, attributeFilter: ['data-tema'] });
    const sistem = matchMedia('(prefers-color-scheme: dark)');
    sistem.addEventListener('change', trimite);
    return () => { o.disconnect(); sistem.removeEventListener('change', trimite); };
  }, []);

  const butonul = (
    <span className="extensii">
      <button ref={buton} type="button" className="extensii-buton" data-extensii="buton" aria-label={t('extensii.buton')} title={t('extensii.buton')}
        aria-haspopup="menu" aria-expanded={meniu !== null} onClick={() => { if (meniu) setMeniu(null); else deschideMeniul(); }}>
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
          <path d="M10 3a2 2 0 0 1 4 0v2h4a1 1 0 0 1 1 1v4h-2a2 2 0 0 0 0 4h2v4a1 1 0 0 1-1 1h-4v-2a2 2 0 0 0-4 0v2H6a1 1 0 0 1-1-1v-4h2a2 2 0 0 0 0-4H5V6a1 1 0 0 1 1-1h4z"
            fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      </button>
      <input ref={fisier} type="file" accept=".zip,application/zip" hidden data-extensii="fisier-ales"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) setCerere({ fel: 'fisier', fisier: f });
        }} />
    </span>
  );
  // Biblioteca (ADR 0230 §D): un rând pe extensie, cu starea lui față de ce e instalat.
  const catalog = biblioteca?.fel === 'ok' ? biblioteca.catalog : null;
  const kb = (n: number): string => new Intl.NumberFormat(limba === 'ro' ? 'ro-RO' : 'en-GB', { maximumFractionDigits: 1 }).format(n / 1024);
  const randBiblioteca = (r: RandBiblioteca): ReactNode => {
    const instalata = lista.find((x) => x.id === r.id);
    const s = stareRand(r, instalata?.manifest);
    const pr = progres[r.id];
    const descriere = `biblioteca-${r.id}`;
    let control: ReactNode;
    if (pr?.fel === 'lucreaza') control = <span role="status">{t('extensii.biblioteca.actualizez')}</span>;
    else if (s.fel === 'instaleaza') {
      control = (
        <button type="button" role="menuitem" className="biblioteca-buton" data-extensii="biblioteca-instaleaza" aria-describedby={descriere}
          onClick={() => { alege(() => { setCerere({ fel: 'biblioteca', id: r.id, rand: r, dinLink: false }); }); }}>
          {t('extensii.biblioteca.instaleaza')}
        </button>
      );
    } else if (s.fel === 'actualizeaza') {
      control = (
        <button type="button" role="menuitem" className="biblioteca-buton" data-extensii="biblioteca-actualizeaza" aria-describedby={descriere}
          onClick={() => {
            // Ce cere în plus versiunea nouă trece prin fereastră; altfel, dintr-un clic, aici.
            if (s.permisiuniNoi.length > 0) alege(() => { setCerere({ fel: 'biblioteca', id: r.id, rand: r, dinLink: false }); });
            else void actualizeazaDinMeniu(r);
          }}>
          {t('extensii.biblioteca.actualizeaza', { versiune: r.versiune })}
        </button>
      );
    } else if (s.fel === 'instalata') {
      control = <span className="biblioteca-ok">{pr?.fel === 'gata' ? t('extensii.biblioteca.actualizata', { versiune: pr.versiune }) : t('extensii.biblioteca.instalata')}</span>;
    } else if (s.fel === 'alta') control = <span>{t('extensii.biblioteca.alta', { versiune: s.versiune })}</span>;
    else control = <span>{t('extensii.biblioteca.reincarca')}</span>;
    return (
      <div key={r.id} className="biblioteca-rand" data-id={r.id} data-stare={s.fel}>
        <div className="biblioteca-cap"><strong>{r.nume}</strong><span>{r.versiune}</span></div>
        <p id={descriere}>{r.descriere[limba]}</p>
        <div className="biblioteca-cipuri">
          {r.permisiuni.map((p) => <span key={p} className="biblioteca-cip">{CATALOG_PERMISIUNI.includes(p) ? t(`extensii.permisiune-scurt.${p}` as CheieSimpla) : p}</span>)}
        </div>
        {pr?.fel === 'eroare' && <p className="avertisment" role="alert">{pr.text}</p>}
        <div className="biblioteca-jos"><span>{t('extensii.biblioteca.marime', { kb: kb(r.octeti) })}</span>{control}</div>
      </div>
    );
  };
  const sectiuneaBibliotecii = (
    <div className="meniu-biblioteca" role="group" aria-label={t('extensii.biblioteca')} data-testid="biblioteca">
      <strong>{t('extensii.biblioteca')}</strong>
      {(biblioteca === null || biblioteca.fel === 'incarca') && <span className="biblioteca-nota" role="status">{t('extensii.biblioteca.incarca')}</span>}
      {(biblioteca?.fel === 'retea' || biblioteca?.fel === 'defect') && (
        <div className="biblioteca-jos">
          <span role="alert">{biblioteca.fel === 'retea' ? t('extensii.biblioteca.fara-retea') : t('extensii.biblioteca.eroare', { motiv: biblioteca.detaliu })}</span>
          <button type="button" role="menuitem" className="biblioteca-buton" data-extensii="biblioteca-reincearca" onClick={() => { incarcaBiblioteca(); }}>
            {t('extensii.biblioteca.reincearca')}
          </button>
        </div>
      )}
      {catalog?.extensii.length === 0 && <span className="biblioteca-nota">{t('extensii.biblioteca.goala')}</span>}
      {catalog?.extensii.map(randBiblioteca)}
    </div>
  );
  const meniul = meniu && (
    <div ref={refMeniu} className="meniu-extensii" data-testid="meniu-extensii" style={{ top: meniu.top, left: meniu.left }}>
      <div className="meniu-extensii-cap"><strong>{t('extensii.instalate')}</strong>{lista.length === 0 && <span>{t('extensii.niciuna')}</span>}</div>
      <div role="menu" aria-label={t('extensii.meniu')} onKeyDown={(e) => { tastaInMeniu(e, inchideMeniul); }}>
        {lista.map((x) => {
          const r = catalog?.extensii.find((y) => y.id === x.id);
          const s = r ? stareRand(r, x.manifest) : null;
          return (
            <button key={x.id} type="button" role="menuitem" data-extensii="deschide" data-id={x.id}
              onClick={() => { alege(() => { deschideExtensia(x); }); }}>
              <span>{x.manifest.nume}</span>
              <small>{t('extensii.deschide', { versiune: x.manifest.versiune })}</small>
              {r && s?.fel === 'actualizeaza' && <small className="biblioteca-insigna">{t('extensii.biblioteca.actualizare', { versiune: r.versiune })}</small>}
            </button>
          );
        })}
        {lista.length > 0 && <div className="meniu-separator" role="separator" />}
        {sectiuneaBibliotecii}
        <div className="meniu-separator" role="separator" />
        <button type="button" role="menuitem" data-extensii="din-fisier" onClick={() => { alege(() => { fisier.current?.click(); }); }}>
          <span>{t('extensii.din-fisier')}</span>
        </button>
        <button type="button" role="menuitem" data-extensii="din-adresa" onClick={() => { alege(() => { setCerere({ fel: 'adresa', adresa: '', dinLink: false }); }); }}>
          <span>{t('extensii.din-adresa')}</span>
        </button>
        <button type="button" role="menuitem" data-extensii="gestioneaza" onClick={() => { alege(() => { setCerere({ fel: 'gestioneaza' }); }); }}>
          <span>{t('extensii.gestioneaza')}</span>
        </button>
      </div>
    </div>
  );
  // Fila, după ale aranjamentului: numele extensiei (apăsată cât e fereastra de acum) și × care o închide.
  const fila = deschisa && (
    <span className="fila-extensie" data-testid="fila-extensie">
      <button type="button" className="cu-eticheta fila" data-icona="extensii.fila" data-extensii="fila"
        {...(fereastra ? { 'aria-current': 'page' as const } : {})} onClick={onFereastra}>
        <span className="eticheta" data-testid="extensie-deschisa">{deschisa.manifest.nume}</span>
      </button>
      <button ref={butonInchide} type="button" className="fila-inchide" data-extensii="inchide-fereastra"
        aria-label={t('extensii.inchide-fereastra', { nume: deschisa.manifest.nume })}
        title={t('extensii.inchide-fereastra', { nume: deschisa.manifest.nume })} onClick={() => { inchideCuGrija(); }}>
        <span aria-hidden="true">×</span>
      </button>
    </span>
  );
  const spatiul = deschisa && (
    <div className="spatiu-cadru" data-testid="spatiu-extensie" data-stare={stare.fel}>
      {stare.fel === 'porneste' && <p className="spatiu-nota">{t('extensii.spatiu.porneste')}</p>}
      {stare.fel === 'esuat' && <p className="spatiu-nota" role="alert">{t('extensii.spatiu.esuat', { mesaj: stare.mesaj })}</p>}
      {/* Cadrul se pune aici din cod (`cadru.ts`), în afara arborelui React. */}
      <div className="spatiu-gazda" ref={cadru} />
    </div>
  );
  // Ce a rămas nesalvat după salvările de la închidere: întrebarea, peste toată pagina (aplicația de sub ea e inertă). Primul
  // buton e gestul dialogului (plin, ca în celelalte dialoguri); focusul stă pe „Rămân”, ca pe „Nu” în confirmarea mașinii.
  const intrebarea = intrebare && deschisa && (
    <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="extensii-inchidere-titlu" data-testid="extensii-inchidere"
      onKeyDown={(e) => {
        if (e.key !== 'Escape') return;
        e.preventDefault();
        e.stopPropagation();
        ramai();
      }}>
      <div className="dialog-cutie">
        <h2 id="extensii-inchidere-titlu">{t('extensii.inchidere.titlu', { nume: deschisa.manifest.nume })}</h2>
        <p>{t('extensii.inchidere.text', { nume: deschisa.manifest.nume })}</p>
        <div className="butoane">
          <button type="button" data-extensii="inchidere-inchide" onClick={() => { setIntrebare(false); dupaInchidere.current(); }}>
            {t('extensii.inchidere.inchide')}
          </button>
          <button type="button" data-extensii="inchidere-ramai" autoFocus onClick={ramai}>{t('extensii.inchidere.ramai')}</button>
        </div>
      </div>
    </div>
  );
  return (
    <>
      {loc ? createPortal(butonul, loc) : null}
      {locFila && fila ? createPortal(fila, locFila) : null}
      {meniul ? createPortal(meniul, document.body) : null}
      {intrebarea ? createPortal(intrebarea, document.body) : null}
      {locSpatiu && spatiul ? createPortal(spatiul, locSpatiu) : null}
      <Suspense fallback={null}>
        {cerere && (
          <Instalare cerere={cerere} instalate={lista} onDefect={raporteazaDefect}
            onGata={(id, deschide) => {
              setCerere(null);
              reincarca();
              // „Deschide” după o instalare din bibliotecă (ADR 0230): extensia, în fereastra ei.
              if (deschide) { deschideInstalata(deschide); return; }
              // O versiune nouă peste cea deschisă: cea veche se închide fără pierderi; datele trec la cea nouă.
              if (id !== null && deschisa?.id === id) inchideCuGrija();
            }}
            onScoasa={(id) => {
              reincarca();
              if (deschisa?.id === id) setDeschisa(null);
            }} />
        )}
      </Suspense>
    </>
  );
}
