/**
 * Extensiile (ADR 0127 §B, §C): butonul discret de lângă marcă (piesa de puzzle), meniul lui (extensiile instalate,
 * instalarea din fișier și din adresă, gestionarea) și fereastra extensiei deschise (ADR 0199 §A): o filă în meniul global,
 * după ale aranjamentului, cu numele ei și ×, și dedesubt cadrul, pe tot ecranul, ca fereastra Mașina. Trecerea la altă
 * fereastră o ascunde, iar cadrul rulează mai departe; × o închide. Modulul vine după prima randare (nu în pachetul de
 * pornire); ferestrele instalării (`Instalare.tsx`) și cadrul (`cadru.ts`) vin la cerere.
 *
 * Linkul de instalare (`#instaleaza=<adresa>`) deschide fereastra adresei, completată; nimic nu se descarcă fără clic, iar
 * ancora se șterge din adresă.
 */
import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { Jurnal } from '../app/jurnalErori.ts';
import '../i18n/carcasa.ts';
import { mesajeGata } from '../i18n/laCerere.ts';
import { cuMesaje, t } from '../i18n/t.ts';
import { useLimba } from '../ui/useLimba.ts';
import type { GazdaMasina } from './cadru.ts';
import { FaraStocare, listaExtensii, type ExtensieInstalata } from './depozit.ts';
import type { CerereInstalare } from './tipuri.ts';
import './extensii.css';

/** Mesajele modulului, ca date (ADR 0086): cine îl încarcă le așteaptă (`cuMesaje`). */
export const mesaje = mesajeGata();
mesaje.catch(() => undefined);

const Instalare = lazy(() => import('./Instalare.tsx').then(cuMesaje).then((m) => ({ default: m.Instalare })));

const ANCORA_INSTALARE = '#instaleaza=';

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

export function Extensii({ jurnal, fereastra, onFereastra, onDeschisa, onModal, masina }: {
  readonly jurnal: Jurnal;
  /** Fereastra extensiei e cea de acum: fila ei e apăsată. */
  readonly fereastra: boolean;
  /** Fila extensiei: deschide fereastra ei. */
  readonly onFereastra: () => void;
  /** Extensia deschisă (id-ul și numele), sau null: carcasa îi arată fereastra, sau revine din ea la Proiectare. */
  readonly onDeschisa: (x: { readonly id: string; readonly nume: string } | null) => void;
  /** O fereastră a extensiilor (instalarea, gestionarea) e deschisă: aplicația de sub ea e inertă. */
  readonly onModal: (deschisa: boolean) => void;
  /** Ce dă carcasa senderului extensiilor (ADR 0199 §B). */
  readonly masina: GazdaMasina;
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
  const buton = useRef<HTMLButtonElement | null>(null);
  const refMeniu = useRef<HTMLDivElement | null>(null);
  const fisier = useRef<HTMLInputElement | null>(null);
  const cadru = useRef<HTMLDivElement | null>(null);
  const trimiteContext = useRef<((tema?: Record<string, string>) => void) | null>(null);
  const limbaRef = useRef(limba);
  limbaRef.current = limba;
  // Gazda senderului, cea de acum: cadrul pornește o dată pe extensie, dar cere de fiecare dată prin ea.
  const masinaRef = useRef(masina);
  masinaRef.current = masina;

  const reincarca = (): void => {
    void listaExtensii().then(setLista, (e: unknown) => {
      // Fără stocare (fereastră privată, IndexedDB blocat): nicio extensie. Condiția mediului e deja în jurnal, doar local.
      if (!(e instanceof FaraStocare)) jurnal.adauga('fereastra', e);
    });
  };
  useEffect(reincarca, []);
  // Linkul de instalare: la pornire și când ancora se schimbă în fila deschisă (un link lipit în aceeași filă).
  useEffect(() => {
    const dinAncora = (): void => {
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
  useEffect(() => { onModal(cerere !== null); }, [cerere, onModal]);
  useEffect(() => { onDeschisa(deschisa ? { id: deschisa.id, nume: deschisa.manifest.nume } : null); }, [deschisa, onDeschisa]);

  // Meniul: sub buton, cu focusul pe primul rând; un clic în afara lui îl închide.
  const deschideMeniul = (): void => {
    const r = buton.current?.getBoundingClientRect();
    setMeniu(r ? { top: Math.round(r.bottom + 4), left: Math.max(4, Math.round(r.left)) } : { top: 48, left: 8 });
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
      const h = c.pornesteCadru(container, deschisa, { limba: limbaRef.current, tema: c.temaDeAcum() }, (e) => {
        if (e.tip === 'pornit') setStare({ fel: 'pornit' });
        else if (e.tip === 'inchide') setDeschisa(null);
        else if (e.tip === 'esuat') { setStare({ fel: 'esuat', mesaj: e.mesaj }); raporteaza(e.mesaj); }
        else raporteaza(e.mesaj, e.stiva);
      }, {
        activ: masinaRef.current.activ,
        monteaza: () => { masinaRef.current.monteaza(); },
        trimite: (l, ext) => masinaRef.current.trimite(l, ext),
      });
      oprire = h.opreste;
      trimiteContext.current = (tema) => { h.context({ limba: limbaRef.current, tema: tema ?? c.temaDeAcum() }); };
    }, (e: unknown) => { setStare({ fel: 'esuat', mesaj: String(e) }); });
    return () => { oprit = true; trimiteContext.current = null; oprire?.(); };
    // Doar la altă extensie: limba și tema noi trec prin `trimiteContext`, fără repornire.
  }, [deschisa]);
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
  const meniul = meniu && (
    <div ref={refMeniu} className="meniu-extensii" data-testid="meniu-extensii" style={{ top: meniu.top, left: meniu.left }}>
      <div className="meniu-extensii-cap"><strong>{t('extensii.instalate')}</strong>{lista.length === 0 && <span>{t('extensii.niciuna')}</span>}</div>
      <div role="menu" aria-label={t('extensii.meniu')} onKeyDown={(e) => { tastaInMeniu(e, inchideMeniul); }}>
        {lista.map((x) => (
          <button key={x.id} type="button" role="menuitem" data-extensii="deschide" data-id={x.id}
            onClick={() => { alege(() => { setDeschisa(x); }); }}>
            <span>{x.manifest.nume}</span>
            <small>{t('extensii.deschide', { versiune: x.manifest.versiune })}</small>
          </button>
        ))}
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
      <button type="button" className="fila-inchide" data-extensii="inchide-fereastra" aria-label={t('extensii.inchide-fereastra', { nume: deschisa.manifest.nume })}
        title={t('extensii.inchide-fereastra', { nume: deschisa.manifest.nume })} onClick={() => { setDeschisa(null); }}>
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
  return (
    <>
      {loc ? createPortal(butonul, loc) : null}
      {locFila && fila ? createPortal(fila, locFila) : null}
      {meniul ? createPortal(meniul, document.body) : null}
      {locSpatiu && spatiul ? createPortal(spatiul, locSpatiu) : null}
      <Suspense fallback={null}>
        {cerere && (
          <Instalare cerere={cerere} instalate={lista}
            onGata={(id) => {
              setCerere(null);
              reincarca();
              if (id !== null && deschisa?.id === id) setDeschisa(null);
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
