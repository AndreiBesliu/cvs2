import { useEffect, useRef, useState, type ReactNode } from 'react';
import '../i18n/carcasa.ts';
import { mesajeGata } from '../i18n/laCerere.ts';
import { t } from '../i18n/t.ts';
import type { RezultatActiune } from './actiuni.ts';
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
  /** O instanță trasă pe altă foaie. */
  readonly muta: (instanta: string, foaie: string) => void;
};

/** Rândurile registrului din meniu, în ordine, cu eticheta fiecăruia; ștergerea la capăt. */
const RANDURI = [
  ['foaie.duplica', 'actiune.foaie-duplica'],
  ['foaie.muta-sus', 'actiune.foaie-muta-sus'],
  ['foaie.muta-jos', 'actiune.foaie-muta-jos'],
  ['foaie.sterge', 'actiune.foaie-sterge'],
] as const;

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
