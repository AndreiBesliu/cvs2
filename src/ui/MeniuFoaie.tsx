import { memo, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import '../i18n/carcasa.ts';
// Etichetele acțiunilor planșelor stau în mesajele editorului (ADR 0210): fereastra le așteaptă înainte de randare.
import '../i18n/editare.ts';
import { mesajeGata } from '../i18n/laCerere.ts';
import { t } from '../i18n/t.ts';
import type { RezultatActiune } from './actiuni.ts';
import type { PunctFoaie, Semnal } from './CipuriVedere.tsx';
import { foaiaDeSub, loculRandului, RANDURI_FOAIE, type FoaiePePanza } from './controaleFoiCalcul.ts';
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

type PropsRand = {
  readonly f: FoaiePePanza;
  readonly vedere: { readonly scara: number; readonly tx: number; readonly ty: number };
  readonly vizibil: boolean;
  readonly intreaba: boolean;
  readonly actiuni: ActiuniFoi;
  readonly onIntreaba: (foaie: string | null) => void;
};

/** Rândul unei foi: redesenat doar când i se schimbă foaia, vederea, starea sau acțiunile, nu la fiecare mișcare a mausului. */
const RandFoaie = memo(function RandFoaie({ f, vedere, vizibil, intreaba, actiuni, onIntreaba }: PropsRand): ReactNode {
  const loc = loculRandului(f, vedere);
  return (
    <div className="controale-foaie" role="toolbar" aria-label={t('panza.foaie-comenzi', { nume: f.nume })} data-controale-foaie={f.id}
      data-vizibil={vizibil || intreaba ? 'da' : 'nu'} style={{ left: loc.stanga, top: loc.sus }}>
      {intreaba ? (
        <>
          <span className="controale-foaie-intrebare">{t('lista.foaie-sterge-confirma', { n: f.piese })}</span>
          <button type="button" className="cu-text" data-meniu-foaie-articol="sterge-da" onClick={() => { onIntreaba(null); actiuni.ruleaza('foaie.sterge', f.id); }}>
            {t('actiune.foaie-sterge')}
          </button>
          <button type="button" className="cu-text" data-meniu-foaie-articol="sterge-nu" onClick={() => { onIntreaba(null); }}>{t('lista.renunta')}</button>
        </>
      ) : (
        <>
          <button type="button" data-icona="vedere.proprietati" data-meniu-foaie-articol="proprietati" aria-label={t('lista.foaie-proprietati')}
            title={t('lista.foaie-proprietati')} onClick={() => { actiuni.proprietati(f.id); }} />
          <button type="button" data-icona="foaie.aseaza" data-meniu-foaie-articol="aseaza" aria-label={t('lista.foaie-aseaza')}
            title={t('lista.foaie-aseaza')} onClick={() => { actiuni.aseaza(f.id); }} />
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
 */
export function ControaleFoi({ foi, vedere, cursor, actiuni }: PropsControale): ReactNode {
  useLimba();
  const p = useSyncExternalStore(cursor.asculta, cursor.citeste);
  const peste = foaiaDeSub(p, foi, vedere.scara);
  const [confirma, setConfirma] = useState<string | null>(null);
  return (
    <div className="controale-foi">
      {foi.map((f) => (
        <RandFoaie key={f.id} f={f} vedere={vedere} vizibil={f.activa || peste === f.id} intreaba={confirma === f.id} actiuni={actiuni} onIntreaba={setConfirma} />
      ))}
    </div>
  );
}
