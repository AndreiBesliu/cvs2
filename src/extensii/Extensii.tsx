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
 * Biblioteca (ADR 0230, refăcută în ADR 0231): meniul are doar extensiile instalate și drumul spre fereastra „Biblioteca
 * extensiilor” (`Biblioteca.tsx`, adusă la cerere), unde stau lista, pagina fiecărei extensii, instalarea, actualizarea și
 * scoaterea. Catalogul se cere la fiecare deschidere a meniului sau a ferestrei (nicio cerere la pornire); cele instalate
 * apar pe loc, din browser. O extensie instalată cu o versiune mai nouă în bibliotecă are în rândul ei din meniu „Actualizează”:
 * dintr-un clic când versiunea nouă nu cere nimic în plus, altfel prin fereastra de confirmare. Rândul nu-și schimbă mărimea
 * când vine catalogul. Linkul `#biblioteca=<id>` deschide fereastra bibliotecii pe pagina extensiei; nimic nu se descarcă
 * fără clic.
 *
 * Semnul extensiei (ADR 0231 §B.2): lângă numele ei, în rândul instalat, în rândul din bibliotecă și pe fila ei (`Semn.tsx`).
 *
 * Stările de lângă drumul bun (ADR 0232 §A): o extensie care n-a pornit, sau care pornește de peste 10 s, are starea ei, cu
 * trei ieșiri (`StarePornire.tsx`); o versiune nouă peste extensia deschisă îi cere întâi salvările (și întreabă, dacă rămâne
 * ceva nesalvat: „Rămân” oprește instalarea), apoi o redeschide la versiunea nouă; extensia deschisă se ține minte la
 * reîncărcarea paginii (`tinuta.ts`: scrisă când a pornit, ștearsă când omul o închide ori când n-a pornit).
 */
import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { aboneazaCont, contTinut } from '../app/dreptCont.ts';
import type { Jurnal } from '../app/jurnalErori.ts';
import '../i18n/carcasa.ts';
import { mesajeGata } from '../i18n/laCerere.ts';
import { cuMesaje, t } from '../i18n/t.ts';
import { useLimba } from '../ui/useLimba.ts';
import type { FormeCvs2 } from '../../extensii/api.ts';
import { ADRESA_CATALOG, type CatalogBiblioteca, type RandBiblioteca } from '../../shared/biblioteca.ts';
import { cereCatalogul, instaleazaDinBiblioteca, stareRand } from './biblioteca.ts';
import type { CadruPornit, GazdaForme, GazdaMasina } from './cadru.ts';
import { contextPentruExtensie } from './cont.ts';
import { FaraStocare, listaExtensii, scrieExtensia, type ExtensieInstalata } from './depozit.ts';
import { usePaleta, useVeste, useZipLasat } from './descoperire.ts';
import { motivText } from './motivText.ts';
import { repornireRara } from './repornire.ts';
import { Semn, SemnInstalat, useSemnInstalat } from './Semn.tsx';
import { StarePornire, TIMP_PORNIRE_GREA_MS } from './StarePornire.tsx';
import { deRedeschis, extensiaTinuta, tineExtensia, uitaExtensia } from './tinuta.ts';
import type { CerereInstalare } from './tipuri.ts';
import './extensii.css';

/** Mesajele modulului, ca date (ADR 0086): cine îl încarcă le așteaptă (`cuMesaje`). */
export const mesaje = mesajeGata();
mesaje.catch(() => undefined);

const Instalare = lazy(() => import('./Instalare.tsx').then(cuMesaje).then((m) => ({ default: m.Instalare })));

const ANCORA_INSTALARE = '#instaleaza=';
const ANCORA_BIBLIOTECA = '#biblioteca=';
const ANCORA_FEREASTRA = '#biblioteca';

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
  // Lista celor instalate s-a citit măcar o dată (până atunci e goală fără să fie adevărat).
  const [listaCitita, setListaCitita] = useState(false);
  const [meniu, setMeniu] = useState<{ readonly top: number; readonly left: number } | null>(null);
  const [cerere, setCerere] = useState<Exclude<CerereInstalare, { readonly fel: 'fereastra' }> | null>(null);
  // Fereastra „Biblioteca extensiilor” (ADR 0231); o confirmare (`cerere`) poate sta deasupra ei.
  const [bib, setBib] = useState<Extract<CerereInstalare, { readonly fel: 'fereastra' }> | null>(null);
  const [deschisa, setDeschisa] = useState<ExtensieInstalata | null>(null);
  const [stare, setStare] = useState<{ readonly fel: 'porneste' | 'pornit' } | { readonly fel: 'esuat'; readonly mesaj: string }>({ fel: 'porneste' });
  // Biblioteca (ADR 0230): catalogul cerut la deschiderea meniului (doar ultima cerere contează) și actualizările din meniu.
  const [biblioteca, setBiblioteca] = useState<StareBiblioteca | null>(null);
  const cerereCatalog = useRef(0);
  const ultimulCatalog = useRef(0);
  const [progres, setProgres] = useState<Readonly<Record<string, ProgresActualizare>>>({});
  const deschisaRef = useRef(deschisa);
  deschisaRef.current = deschisa;
  // Semnul extensiei deschise, pe fila ei; dacă imaginea nu se poate arăta, rămâne piesa de puzzle a filei.
  const semnFila = useSemnInstalat(deschisa);
  const [semnFilaStricat, setSemnFilaStricat] = useState<string | null>(null);
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
  // „Rămân”, la întrebarea de dinaintea unei versiuni noi peste extensia deschisă: instalarea nu mai are loc (ADR 0232 §A.2).
  const laRamas = useRef<() => void>(() => {});
  // Versiunea nouă a extensiei deschise, îngăduită: `oricum` după „Închide oricum” (redeschiderea nu mai întreabă o dată).
  const aprobata = useRef<{ readonly id: string; readonly oricum: boolean } | null>(null);
  // Pornirea care trece de 10 s: omul primește ieșirile, fără ca pornirea să se oprească (ADR 0232 §A.1).
  const [greu, setGreu] = useState(false);
  // Adresa de la pornire, înainte ca ancorele să fie șterse: una care cere altceva are întâietate la redeschidere.
  const [adresaLaPornire] = useState(() => ({ hash: location.hash, search: location.search }));
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
  // La pornire: lista, apoi extensia în care era omul la reîncărcare (ADR 0232 §A.3), fără nicio cerere de rețea.
  useEffect(() => {
    void listaExtensii().then((l) => {
      setLista(l);
      setListaCitita(true);
      const x = deRedeschis(extensiaTinuta(), l, adresaLaPornire);
      if (x) setDeschisa((d) => d ?? x);
    }, (e: unknown) => { if (!(e instanceof FaraStocare)) jurnal.adauga('fereastra', e); });
  }, []);
  // Un defect al publicării bibliotecii (catalogul, amprenta, potrivirea) ajunge în jurnal; lipsa rețelei nu.
  const raporteazaDefect = useCallback((e: Error): void => { jurnal.adauga('fereastra', e); }, [jurnal]);
  // Catalogul bibliotecii, cerut din nou la fiecare deschidere a meniului; cel de dinainte rămâne arătat cât vine cel nou.
  const incarcaBiblioteca = (): void => {
    const n = ++cerereCatalog.current;
    ultimulCatalog.current = Date.now();
    setBiblioteca((b) => (b?.fel === 'ok' ? b : { fel: 'incarca' }));
    void cereCatalogul(adresaCatalog()).then((c) => {
      if (n !== cerereCatalog.current) return;
      if (c.fel === 'defect') raporteazaDefect(new Error(`biblioteca: catalogul (${c.detaliu})`));
      setBiblioteca(c);
    });
  };
  // Fereastra bibliotecii: catalogul se cere la deschidere; cel abia cerut de meniu (de unde se deschide de obicei) nu se
  // cere a doua oară.
  const deschideBiblioteca = (id: string | null, dinLink: boolean, fila?: 'instalate'): void => {
    if (Date.now() - ultimulCatalog.current > 5000) incarcaBiblioteca();
    setBib({ fel: 'fereastra', id, dinLink, ...(fila ? { fila } : {}) });
  };
  // Linkul de instalare: la pornire și când ancora se schimbă în fila deschisă (un link lipit în aceeași filă). Linkul
  // bibliotecii (ADR 0230) deschide fereastra bibliotecii pe pagina extensiei.
  useEffect(() => {
    const dinAncora = (): void => {
      // Fără id: fereastra bibliotecii, cerută din paleta de comenzi (`extensii.biblioteca`).
      if (location.hash === ANCORA_FEREASTRA) {
        history.replaceState(history.state, '', `${location.pathname}${location.search}`);
        deschideBiblioteca(null, false);
        return;
      }
      if (location.hash.startsWith(ANCORA_BIBLIOTECA)) {
        let id = '';
        try {
          id = decodeURIComponent(location.hash.slice(ANCORA_BIBLIOTECA.length));
        } catch {
          id = '';
        }
        history.replaceState(history.state, '', `${location.pathname}${location.search}`);
        if (/^[a-z0-9-]{1,40}$/.test(id)) deschideBiblioteca(id, true);
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
  useEffect(() => { onModal(cerere !== null || bib !== null || intrebare); }, [cerere, bib, intrebare, onModal]);
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
  // Cu meniul deschis, focusul rămâne în el și când butonul apăsat pleacă din rând (o actualizare) ori când întrebarea de
  // deasupra lui se închide: altfel Escape n-ar mai închide meniul.
  useEffect(() => {
    const m = refMeniu.current;
    if (!m || intrebare || m.contains(document.activeElement)) return;
    m.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')?.focus();
  }, [progres, intrebare]);

  /**
   * Închiderea extensiei deschise, fără pierderi (ADR 0164 §C): întâi salvările ei (`host.laInchidere`), cel mult 5 s; apoi,
   * dacă nimic nu mai e nesalvat, `dupa` (implicit închiderea); altfel întrebarea, iar „Închide oricum” face `dupa`.
   */
  /** Închiderea cerută de om (×, „Închide”, `host.inchide()`, scoaterea): extensia nu se mai redeschide la reîncărcare. */
  const inchide = (): void => { uitaExtensia(); setDeschisa(null); };
  const inchideCuGrija = (dupa: () => void = inchide): void => {
    const h = pornit.current;
    if (!h) { dupa(); return; }
    if (seInchide.current) return;
    seInchide.current = true;
    void h.cereInchiderea().then(() => {
      if (pornit.current !== h) return;
      seInchide.current = false;
      if (!h.nesalvat()) { dupa(); return; }
      dupaInchidere.current = dupa;
      laRamas.current = () => {};
      setIntrebare(true);
    });
  };
  /**
   * Înaintea unei versiuni noi peste extensia deschisă (ADR 0232 §A.2): întâi salvările ei, cel mult 5 s; dacă tot rămâne
   * ceva nesalvat, întrebarea, înaintea instalării. `false`: omul rămâne în extensie și nu se instalează nimic.
   */
  const inainteDeInlocuire = (id: string): Promise<boolean> => {
    const h = pornit.current;
    aprobata.current = null;
    if (deschisaRef.current?.id !== id || !h) return Promise.resolve(true);
    if (seInchide.current) return Promise.resolve(false);
    seInchide.current = true;
    return h.cereInchiderea().then(() => {
      if (pornit.current !== h) return true;
      seInchide.current = false;
      if (!h.nesalvat()) { aprobata.current = { id, oricum: false }; return true; }
      return new Promise<boolean>((gata) => {
        dupaInchidere.current = () => { aprobata.current = { id, oricum: true }; gata(true); };
        laRamas.current = () => { gata(false); };
        setIntrebare(true);
      });
    });
  };
  /** După: lista celor instalate, iar extensia deschisă repornește la versiunea nouă, cu datele ei. */
  const dupaInlocuire = (id: string): void => {
    void listaExtensii().then((l) => {
      setLista(l);
      const noua = l.find((x) => x.id === id);
      const acum = deschisaRef.current;
      const a = aprobata.current;
      aprobata.current = null;
      if (!noua || acum?.id !== id || acum.instalat === noua.instalat) return;
      // După „Închide oricum”, omul a hotărât deja; altfel, ce s-a mai schimbat cât a durat instalarea se salvează întâi.
      if (a?.id === id && a.oricum) setDeschisa(noua);
      else inchideCuGrija(() => { setDeschisa(noua); });
    }, (e: unknown) => { if (!(e instanceof FaraStocare)) jurnal.adauga('fereastra', e); });
  };
  // „Rămân”: întrebarea pleacă și aplicația nu mai e inertă în aceeași randare (a clicului), apoi focusul înapoi la ×.
  const ramai = (): void => {
    const f = laRamas.current;
    laRamas.current = () => {};
    f();
    setIntrebare(false);
    onModal(cerere !== null || bib !== null);
    // Cu meniul deschis (o actualizare cerută de acolo), focusul se întoarce în el (mai jos), nu la ×.
    setTimeout(() => { if (!refMeniu.current) butonInchide.current?.focus(); }, 0);
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
  // Descoperirea (ADR 0232 §C): vestea despre o versiune nouă, extensiile în paleta de comenzi, un `.zip` lăsat pe aplicație.
  const versiuniNoi = useVeste(biblioteca, lista, listaCitita);
  usePaleta(lista, (x) => { setMeniu(null); deschideExtensia(x); });
  useZipLasat((f) => { setMeniu(null); setCerere({ fel: 'fisier', fisier: f }); });
  /**
   * „Actualizează la …” dintr-un clic, în meniu (ADR 0230 §D): versiunea nouă nu cere nimic în plus, deci fără fereastră.
   * Descărcarea verificată, scrierea, apoi lista; o versiune veche deschisă își salvează întâi lucrul și se redeschide la cea
   * nouă (ADR 0232 §A.2).
   */
  const actualizeazaDinMeniu = async (rand: RandBiblioteca): Promise<void> => {
    setProgres((p) => ({ ...p, [rand.id]: { fel: 'lucreaza' } }));
    if (!await inainteDeInlocuire(rand.id)) {
      setProgres((p) => Object.fromEntries(Object.entries(p).filter(([k]) => k !== rand.id)));
      return;
    }
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
    dupaInlocuire(rand.id);
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
        if (e.tip === 'pornit') { setStare({ fel: 'pornit' }); tineExtensia(deschisa.id); }
        else if (e.tip === 'inchide') inchide();
        // Salvările le face extensia întâi; cvs2 repornește cel mult o dată la 2 s, cu cererile dese adunate.
        else if (e.tip === 'reporneste') repornire.cere();
        else if (e.tip === 'esuat') { setStare({ fel: 'esuat', mesaj: e.mesaj }); uitaExtensia(); raporteaza(e.mesaj); }
        else raporteaza(e.mesaj, e.stiva);
      }, {
        activ: masinaRef.current.activ,
        monteaza: () => { masinaRef.current.monteaza(); },
        trimite: (l, ext) => masinaRef.current.trimite(l, ext),
      }, { propune: (f, de) => formeRef.current.propune(f, de) });
      oprire = h.opreste;
      pornit.current = h;
      trimiteContext.current = () => { h.context(contextul()); };
    }, (e: unknown) => { setStare({ fel: 'esuat', mesaj: String(e) }); uitaExtensia(); });
    return () => {
      oprit = true;
      repornire.opreste();
      trimiteContext.current = null;
      pornit.current = null;
      seInchide.current = false;
      // O întrebare rămasă deschisă peste cadrul care pleacă: ca „Rămân” (o instalare care o aștepta nu mai are loc).
      const f = laRamas.current;
      laRamas.current = () => {};
      f();
      setIntrebare(false);
      oprire?.();
    };
    // Doar la altă extensie: limba, tema și contul noi trec prin `trimiteContext`, fără repornire.
  }, [deschisa, pornire]);
  // Pornirea grea: după 10 s de „Pornesc extensia…”, ieșirile; pornirea merge mai departe.
  useEffect(() => {
    setGreu(false);
    if (!deschisa || stare.fel !== 'porneste') return;
    const ceas = setTimeout(() => { setGreu(true); }, TIMP_PORNIRE_GREA_MS);
    return () => { clearTimeout(ceas); };
  }, [deschisa, pornire, stare.fel]);
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

  // Un punct pe buton când o extensie instalată are o versiune nouă (ADR 0232 §C.16), din ce se știe deja.
  const numeButon = versiuniNoi > 0 ? t('extensii.buton.noi', { n: versiuniNoi }) : t('extensii.buton');
  const butonul = (
    <span className="extensii">
      <button ref={buton} type="button" className="extensii-buton" data-extensii="buton" aria-label={numeButon} title={numeButon}
        aria-haspopup="menu" aria-expanded={meniu !== null} onClick={() => { if (meniu) setMeniu(null); else deschideMeniul(); }}>
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
          <path d="M10 3a2 2 0 0 1 4 0v2h4a1 1 0 0 1 1 1v4h-2a2 2 0 0 0 0 4h2v4a1 1 0 0 1-1 1h-4v-2a2 2 0 0 0-4 0v2H6a1 1 0 0 1-1-1v-4h2a2 2 0 0 0 0-4H5V6a1 1 0 0 1 1-1h4z"
            fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
        {versiuniNoi > 0 && <span className="buton-punct" data-testid="extensii-punct" aria-hidden="true" />}
      </button>
      <input ref={fisier} type="file" accept=".zip,application/zip" hidden data-extensii="fisier-ales"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) setCerere({ fel: 'fisier', fisier: f });
        }} />
    </span>
  );
  // Meniul (ADR 0231, direcția B): extensiile instalate, fiecare cu „Actualizează” în rândul ei când biblioteca are o versiune
  // mai nouă, apoi drumul spre fereastra bibliotecii. Rândurile nu-și schimbă mărimea când vine catalogul.
  const catalog = biblioteca?.fel === 'ok' ? biblioteca.catalog : null;
  const meniul = meniu && (
    <div ref={refMeniu} className="meniu-extensii" data-testid="meniu-extensii" style={{ top: meniu.top, left: meniu.left }}>
      <div className="meniu-extensii-cap"><strong>{t('extensii.buton')}</strong>{lista.length === 0 && <span>{t('extensii.niciuna')}</span>}</div>
      <div role="menu" aria-label={t('extensii.meniu')} onKeyDown={(e) => { tastaInMeniu(e, inchideMeniul); }}>
        {lista.map((x) => {
          const r = catalog?.extensii.find((y) => y.id === x.id);
          const s = r ? stareRand(r, x.manifest) : null;
          const pr = progres[x.id];
          const noua = r && s?.fel === 'actualizeaza' ? { rand: r, cere: s.permisiuniNoi.length > 0 } : null;
          // Extensia deschisă e marcată (ADR 0232 §B.9): punctul mereu, cuvântul doar când rândul n-are altceva de spus.
          const eDeschisa = deschisa?.id === x.id;
          const sub = pr?.fel === 'lucreaza' ? t('extensii.biblioteca.actualizez')
            : pr?.fel === 'gata' ? t('extensii.meniu.actualizata', { versiune: x.manifest.versiune })
              : noua ? t('extensii.meniu.noua', { veche: x.manifest.versiune, noua: noua.rand.versiune })
                : eDeschisa ? t('extensii.meniu.deschisa', { versiune: x.manifest.versiune }) : x.manifest.versiune;
          return (
            <div key={x.id} className="rand-instalat" role="none">
              <button type="button" role="menuitem" className="rand-extensie" data-extensii="deschide" data-id={x.id}
                {...(eDeschisa ? { 'aria-current': 'true' as const } : {})} onClick={() => { alege(() => { deschideExtensia(x); }); }}>
                <SemnInstalat extensie={x} marime={28} />
                <span className="rand-text"><span>{x.manifest.nume}</span><small>{sub}</small></span>
                {eDeschisa && <span className="rand-punct" aria-hidden="true" />}
              </button>
              {noua && pr?.fel !== 'lucreaza' && (
                <button type="button" role="menuitem" className="biblioteca-buton" data-extensii="biblioteca-actualizeaza"
                  aria-label={t('extensii.biblioteca.actualizeaza', { versiune: noua.rand.versiune })} title={t('extensii.biblioteca.actualizeaza', { versiune: noua.rand.versiune })}
                  onClick={() => {
                    // Ce cere în plus versiunea nouă trece prin fereastra de confirmare; altfel, dintr-un clic, aici.
                    if (noua.cere) alege(() => { setCerere({ fel: 'biblioteca', id: x.id, rand: noua.rand, dinLink: false }); });
                    else void actualizeazaDinMeniu(noua.rand);
                  }}>
                  {t('extensii.actualizare.actualizeaza')}
                </button>
              )}
            </div>
          );
        })}
        {lista.length > 0 && <div className="meniu-separator" role="separator" />}
        <button type="button" role="menuitem" className="rand-extensie" data-extensii="biblioteca" onClick={() => { alege(() => { deschideBiblioteca(null, false); }); }}>
          <Semn adresa={null} marime={28} />
          <span className="rand-text"><span>{t('extensii.biblioteca.rand')}</span><small>{t('extensii.biblioteca.rand-nota')}</small></span>
          <span className="rand-sageata" aria-hidden="true">›</span>
        </button>
      </div>
      {/* Ce n-a mers la o actualizare: sub listă, în afara meniului (un meniu are doar rânduri de meniu), cu numele extensiei. */}
      {lista.map((x) => {
        const pr = progres[x.id];
        return pr?.fel === 'eroare'
          ? <p key={x.id} className="avertisment" role="alert" data-testid="meniu-eroare">{t('extensii.meniu.eroare', { nume: x.manifest.nume, text: pr.text })}</p>
          : null;
      })}
    </div>
  );
  // Fila, după ale aranjamentului: semnul extensiei (sau piesa de puzzle), numele ei (apăsată cât e fereastra de acum) și ×
  // care o închide.
  const cuSemn = semnFila !== null && semnFila !== semnFilaStricat;
  const fila = deschisa && (
    <span className="fila-extensie" data-testid="fila-extensie">
      <button type="button" className="cu-eticheta fila" data-icona="extensii.fila" data-extensii="fila" title={deschisa.manifest.nume} {...(cuSemn ? { 'data-cu-semn': '' } : {})}
        {...(fereastra ? { 'aria-current': 'page' as const } : {})} onClick={onFereastra}>
        {cuSemn && (
          <img className="semn-extensie semn-20" data-semn="" src={semnFila} alt="" width={20} height={20} draggable={false}
            onError={() => { setSemnFilaStricat(semnFila); }} />
        )}
        <span className="eticheta" data-testid="extensie-deschisa">{deschisa.manifest.nume}</span>
        {progres[deschisa.id]?.fel === 'lucreaza' && <small className="fila-stare" data-testid="fila-actualizare">{t('extensii.fila.actualizare')}</small>}
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
      {(stare.fel === 'esuat' || (stare.fel === 'porneste' && greu)) && (
        <StarePornire extensie={deschisa} stare={stare.fel === 'esuat' ? stare : { fel: 'greu' }}
          onDinNou={() => { repornire.cere(); }} onBiblioteca={() => { deschideBiblioteca(deschisa.id, false, 'instalate'); }} onInchide={inchide} />
      )}
      {/* Cadrul se pune aici din cod (`cadru.ts`), în afara arborelui React. */}
      <div className="spatiu-gazda" ref={cadru} />
    </div>
  );
  // Ce a rămas nesalvat după salvările de la închidere: întrebarea, peste toată pagina (aplicația de sub ea e inertă). „Rămân”
  // e gestul dialogului: primul, plin și cu focusul; „Închide oricum”, care pierde lucrul, e roșu, ca „Scoate” (ADR 0232 §A.5).
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
          <button type="button" data-extensii="inchidere-ramai" autoFocus onClick={ramai}>{t('extensii.inchidere.ramai')}</button>
          <button type="button" className="pericol" data-extensii="inchidere-inchide"
            onClick={() => { laRamas.current = () => {}; setIntrebare(false); dupaInchidere.current(); }}>
            {t('extensii.inchidere.inchide')}
          </button>
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
        {bib && (
          <Instalare cerere={bib} instalate={lista} onDefect={raporteazaDefect} inainte={inainteDeInlocuire}
            onGata={(_id, deschide) => {
              setBib(null);
              // „Deschide”, din pagina extensiei: extensia, în fereastra ei.
              if (deschide) { deschideInstalata(deschide); return; }
              // Altfel focusul se întoarce la piesa de puzzle: aplicația nu mai e inertă în aceeași randare, apoi focusul.
              onModal(cerere !== null || intrebare);
              setTimeout(() => { buton.current?.focus(); }, 0);
            }}
            biblioteca={{
              catalog: biblioteca ?? { fel: 'incarca' },
              acoperita: cerere !== null || intrebare,
              onReincearca: incarcaBiblioteca,
              // O versiune nouă peste cea deschisă: extensia se redeschide la ea, cu datele ei (ADR 0232 §A.2).
              onSchimbata: dupaInlocuire,
              onScoasa: (id) => { reincarca(); if (deschisaRef.current?.id === id) inchide(); },
              onCere: (c) => { if (c === 'fisier') fisier.current?.click(); else if (c.fel !== 'fereastra') setCerere(c); },
            }} />
        )}
        {cerere && (
          <Instalare cerere={cerere} instalate={lista} onDefect={raporteazaDefect} inainte={inainteDeInlocuire}
            onAltFisier={() => { fisier.current?.click(); }}
            onGata={(id, deschide) => {
              setCerere(null);
              reincarca();
              // „Deschide” după o instalare din bibliotecă (ADR 0230): extensia, în fereastra ei.
              if (deschide) { setBib(null); deschideInstalata(deschide); return; }
              // O versiune nouă peste cea deschisă: extensia se redeschide la ea, cu datele ei (ADR 0232 §A.2).
              if (id !== null) dupaInlocuire(id);
            }} />
        )}
      </Suspense>
    </>
  );
}
