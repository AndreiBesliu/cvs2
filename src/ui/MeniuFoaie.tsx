import { memo, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import '../i18n/carcasa.ts';
// Etichetele acțiunilor planșelor stau în mesajele editorului (ADR 0210): fereastra le așteaptă înainte de randare.
import '../i18n/editare.ts';
import { mesajeGata } from '../i18n/laCerere.ts';
import { t } from '../i18n/t.ts';
import type { RezultatActiune } from './actiuni.ts';
import type { PunctFoaie, Semnal } from './CipuriVedere.tsx';
import { felRand, foaiaDeSub, loculRandului, RANDURI_FOAIE, stangaInPanza, type FoaiePePanza } from './controaleFoiCalcul.ts';
import { useLimba } from './useLimba.ts';

/** Mesajele modulului, ca date (ADR 0086): cine îl încarcă le așteaptă (`cuMesaje`); un refuz îl vede tot el. */
export const mesaje = mesajeGata();
mesaje.catch(() => undefined);

/** Ce poate schimba lista la foi, prin registru; null într-o filă care doar citește. */
export type ActiuniFoi = {
  readonly adauga: () => void;
  /** Starea unei acțiuni a foii (`foaie.duplica`, `foaie.sterge`…), pentru foaia dată: un refuz își are motivul. */
  readonly stare: (actiune: string, foaie: string) => RezultatActiune;
  readonly ruleaza: (actiune: string, foaie: string) => void;
  /** Numele, mărimea și materialul foii: foaia devine activă, iar panoul de proprietăți se deschide. */
  readonly proprietati: (foaie: string) => void;
  /** „Așază pe foi…” (ADR 0210 §3): foaia devine activă, iar dialogul se deschide pe ea. */
  readonly aseaza: (foaie: string) => void;
  /** O instanță trasă pe altă foaie. */
  readonly muta: (instanta: string, foaie: string) => void;
};

/** Rândurile registrului din meniu, în ordine, cu eticheta fiecăruia; ștergerea la capăt (aceleași ca pe pânză). */
const RANDURI = RANDURI_FOAIE;

type Props = {
  readonly foaie: string;
  /** Câte piese are foaia: ștergerea uneia care nu e goală cere confirmarea. */
  readonly piese: number;
  readonly actiuni: ActiuniFoi;
  readonly inchide: () => void;
};

/**
 * Meniul unei foi din listă (ADR 0210 §1): numele, mărimea și materialul (în panoul de proprietăți), copia, mutarea în listă și
 * ștergerea, cu confirmare când foaia are piese. Fiecare rând trece prin registru, cu starea lui: un refuz e oprit, cu motivul
 * în titlu. Vine la cerere, cu mesajele lui (la primul ⋯ sau clic dreapta pe o foaie, ori preîncărcat după pornire): nu intră
 * în pachetul de pornire. Escape, un clic în afara lui sau o comandă făcută îl închid.
 */
export function MeniuFoaie({ foaie, piese, actiuni, inchide }: Props): ReactNode {
  useLimba();
  const [confirma, setConfirma] = useState(false);
  const inchideAcum = useRef(inchide);
  inchideAcum.current = inchide;
  useEffect(() => {
    // Butonul ⋯ își comută singur meniul: clicul pe el nu e „în afară”.
    const inafara = (e: PointerEvent): void => {
      if (!(e.target instanceof Element) || !e.target.closest('[data-meniu-foaie], [data-foaie-meniu]')) inchideAcum.current();
    };
    window.addEventListener('pointerdown', inafara, true);
    return () => { window.removeEventListener('pointerdown', inafara, true); };
  }, []);

  return (
    <div className="meniu-foaie" role="menu" data-meniu-foaie={foaie}
      onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); inchide(); } }}>
      {confirma ? (
        <>
          <p className="meniu-foaie-intrebare">{t('lista.foaie-sterge-confirma', { n: piese })}</p>
          <button type="button" role="menuitem" data-meniu-foaie-articol="sterge-da" onClick={() => { inchide(); actiuni.ruleaza('foaie.sterge', foaie); }}>
            {t('actiune.foaie-sterge')}
          </button>
          <button type="button" role="menuitem" data-meniu-foaie-articol="sterge-nu" onClick={() => { setConfirma(false); }}>{t('lista.renunta')}</button>
        </>
      ) : (
        <>
          <button type="button" role="menuitem" data-meniu-foaie-articol="proprietati" onClick={() => { inchide(); actiuni.proprietati(foaie); }}>
            {t('lista.foaie-proprietati')}
          </button>
          <button type="button" role="menuitem" data-meniu-foaie-articol="aseaza" onClick={() => { inchide(); actiuni.aseaza(foaie); }}>
            {t('lista.foaie-aseaza')}
          </button>
          {RANDURI.map(([id, eticheta]) => {
            const s = actiuni.stare(id, foaie);
            return (
              <button key={id} type="button" role="menuitem" data-meniu-foaie-articol={id} disabled={!s.ok} title={s.ok ? undefined : t(s.motiv)}
                onClick={() => {
                  if (id === 'foaie.sterge' && piese > 0) {
                    setConfirma(true);
                    return;
                  }
                  inchide();
                  actiuni.ruleaza(id, foaie);
                }}>
                {t(eticheta)}
              </button>
            );
          })}
        </>
      )}
    </div>
  );
}

/**
 * Rotița de pe rând e a pânzei (felia 11.1↑d): rândul stă pe pânză, sub foaie, deci cu cursorul pe el zoom-ul merge la fel.
 * Pânza își ascultă rotița pe elementul ei, iar rândul îi e frate, nu copil: evenimentul i se dă mai departe, cu același loc.
 */
function roataLaPanza(e: React.WheelEvent): void {
  const panza = document.querySelector('[data-testid="panza"]');
  if (!panza) return;
  panza.dispatchEvent(new WheelEvent('wheel', {
    deltaX: e.deltaX, deltaY: e.deltaY, deltaMode: e.deltaMode, clientX: e.clientX, clientY: e.clientY,
    ctrlKey: e.ctrlKey, shiftKey: e.shiftKey, altKey: e.altKey, metaKey: e.metaKey, cancelable: true,
  }));
}

type PropsRand = {
  readonly f: FoaiePePanza;
  readonly vedere: { readonly scara: number; readonly tx: number; readonly ty: number };
  readonly vizibil: boolean;
  /** Rândul încape întreg sub foaie, ori e strâns într-un buton (felia 11.1↑d). */
  readonly fel: 'intreg' | 'strans';
  /** Rândul strâns, desfăcut de om: se vede întreg, peste ce e alături, până pleacă mausul sau alege o comandă. */
  readonly extins: boolean;
  readonly intreaba: boolean;
  /** Lățimea pânzei (px): un rând desfăcut sau întrebarea nu ies din ea. */
  readonly latimePanza: number;
  readonly actiuni: ActiuniFoi;
  readonly onIntreaba: (foaie: string | null) => void;
  readonly onExtinde: (foaie: string | null) => void;
};

/** Rândul unei foi: redesenat doar când i se schimbă foaia, vederea, starea sau acțiunile, nu la fiecare mișcare a mausului. */
const RandFoaie = memo(function RandFoaie({ f, vedere, vizibil, fel, extins, intreaba, latimePanza, actiuni, onIntreaba, onExtinde }: PropsRand): ReactNode {
  const loc = loculRandului(f, vedere);
  const strans = fel === 'strans' && !extins && !intreaba;
  // Un rând mai lat decât foaia (desfăcut, sau cu întrebarea) stă peste vecini și nu iese din pânză.
  const peste = !strans && (fel === 'strans' || intreaba);
  const rand = useRef<HTMLDivElement>(null);
  const [stanga, setStanga] = useState(loc.stanga);
  useLayoutEffect(() => {
    const lat = peste ? rand.current?.offsetWidth ?? 0 : 0;
    setStanga(peste ? stangaInPanza(loc.stanga, lat, latimePanza) : loc.stanga);
  }, [peste, loc.stanga, latimePanza, intreaba]);
  // Tastatura: rândul desfăcut primește focusul pe prima comandă; Escape îl strânge și întoarce focusul pe „⋯”.
  const revine = useRef(false);
  useEffect(() => {
    if (extins) rand.current?.querySelector<HTMLButtonElement>('button:not([disabled])')?.focus();
    else if (revine.current) {
      revine.current = false;
      rand.current?.querySelector<HTMLButtonElement>('button')?.focus();
    }
  }, [extins]);
  return (
    <div ref={rand} className="controale-foaie" role="toolbar" aria-label={t('panza.foaie-comenzi', { nume: f.nume })} data-controale-foaie={f.id}
      data-vizibil={vizibil || intreaba || extins ? 'da' : 'nu'} data-fel={strans ? 'strans' : 'intreg'} data-peste={peste ? 'da' : 'nu'}
      style={{ left: stanga, top: loc.sus }}
      onWheel={roataLaPanza}
      onPointerLeave={extins ? () => { onExtinde(null); } : undefined}
      onKeyDown={extins ? (e) => { if (e.key === 'Escape') { e.stopPropagation(); revine.current = true; onExtinde(null); } } : undefined}>
      {intreaba ? (
        <>
          <span className="controale-foaie-intrebare">{t('lista.foaie-sterge-confirma', { n: f.piese })}</span>
          <button type="button" className="cu-text" data-meniu-foaie-articol="sterge-da" onClick={() => { onIntreaba(null); onExtinde(null); actiuni.ruleaza('foaie.sterge', f.id); }}>
            {t('actiune.foaie-sterge')}
          </button>
          <button type="button" className="cu-text" data-meniu-foaie-articol="sterge-nu" onClick={() => { onIntreaba(null); }}>{t('lista.renunta')}</button>
        </>
      ) : strans ? (
        <button type="button" data-icona="foaie.mai-mult" data-meniu-foaie-articol="mai-mult" aria-expanded={false} aria-label={t('panza.foaie-arata-comenzile')}
          title={t('panza.foaie-arata-comenzile')} onClick={() => { onExtinde(f.id); }} />
      ) : (
        <>
          <button type="button" data-icona="vedere.proprietati" data-meniu-foaie-articol="proprietati" aria-label={t('lista.foaie-proprietati')}
            title={t('lista.foaie-proprietati')} onClick={() => { onExtinde(null); actiuni.proprietati(f.id); }} />
          <button type="button" data-icona="foaie.aseaza" data-meniu-foaie-articol="aseaza" aria-label={t('lista.foaie-aseaza')}
            title={t('lista.foaie-aseaza')} onClick={() => { onExtinde(null); actiuni.aseaza(f.id); }} />
          {RANDURI_FOAIE.map(([id, eticheta]) => {
            const s = actiuni.stare(id, f.id);
            return (
              <button key={id} type="button" data-icona={id} data-meniu-foaie-articol={id} aria-label={t(eticheta)} disabled={!s.ok}
                title={s.ok ? t(eticheta) : `${t(eticheta)}: ${t(s.motiv)}`}
                onClick={() => {
                  if (id === 'foaie.sterge' && f.piese > 0) {
                    onIntreaba(f.id);
                    return;
                  }
                  onExtinde(null);
                  actiuni.ruleaza(id, f.id);
                }} />
            );
          })}
        </>
      )}
    </div>
  );
});

type PropsControale = {
  /** Foile de pe pânză, în mm ai foii active (cea activă la x = 0). */
  readonly foi: readonly FoaiePePanza[];
  readonly vedere: { readonly scara: number; readonly tx: number; readonly ty: number };
  /** Cursorul de deasupra pânzei, în mm; null pe o bară sau în afara ei. */
  readonly cursor: Semnal<PunctFoaie | null>;
  readonly actiuni: ActiuniFoi;
};

/**
 * Comenzile foii pe pânză (ADR 0210 §1, felia 11.1↑c): sub fiecare foaie, rândul cu cele șapte comenzi ale meniului ei, ca
 * iconițe, prin același registru (un refuz e stins, cu motivul în titlu). Al foii active se vede mereu; al unei foi vecine,
 * doar cu mausul pe ea, pe fâșia de sub ea sau pe rând (și cu focusul în el). Ștergerea unei foi cu piese întreabă întâi, în rând.
 * Rândul nu trece de lățimea foii lui (felia 11.1↑d): cu pânza micșorată se strânge într-un buton, „⋯”, care îl desface peste ce
 * e alături; sub lățimea unui buton nu se arată.
 */
export function ControaleFoi({ foi, vedere, cursor, actiuni }: PropsControale): ReactNode {
  useLimba();
  const p = useSyncExternalStore(cursor.asculta, cursor.citeste);
  const peste = foaiaDeSub(p, foi, vedere.scara);
  const [confirma, setConfirma] = useState<string | null>(null);
  const [extins, setExtins] = useState<string | null>(null);
  // Mărimea unui buton (se schimbă cu densitatea și la atingere) și lățimea pânzei, măsurate, nu presupuse.
  const strat = useRef<HTMLDivElement>(null);
  const masura = useRef<HTMLButtonElement>(null);
  const [buton, setButon] = useState(28);
  const [latimePanza, setLatimePanza] = useState(0);
  useLayoutEffect(() => {
    const citeste = (): void => {
      const b = masura.current?.offsetWidth ?? 0;
      if (b > 0) setButon(b);
      setLatimePanza(strat.current?.clientWidth ?? 0);
    };
    citeste();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const o = new ResizeObserver(citeste);
    if (masura.current) o.observe(masura.current);
    if (strat.current) o.observe(strat.current);
    return () => { o.disconnect(); };
  }, []);
  return (
    <div className="controale-foi" ref={strat}>
      <button type="button" ref={masura} className="controale-foaie-masura" data-icona="foaie.mai-mult" tabIndex={-1} aria-hidden="true" disabled />
      {foi.map((f) => {
        const fel = felRand(f.latime * vedere.scara, buton);
        if (fel === 'ascuns') return null;
        return (
          <RandFoaie key={f.id} f={f} vedere={vedere} vizibil={f.activa || peste === f.id} fel={fel} extins={extins === f.id} intreaba={confirma === f.id}
            latimePanza={latimePanza} actiuni={actiuni} onIntreaba={setConfirma} onExtinde={setExtins} />
        );
      })}
    </div>
  );
}
