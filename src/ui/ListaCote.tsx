/**
 * Rândul cotelor foii active în listă (ADR 0330 §5, felia 10.4↑a-4): „Cote (N)”, cu ochiul (ascunde cotele foii pe pânză, nu
 * le șterge; ținut în browser) și, deschis, cotele ei: cifra, felul și „dezlegată”. Un clic pe o cotă trece la unealta Cote,
 * cu ea aleasă. Rândurile le publică unealta (`coteVedere.ts`): lista nu citește modelul cotelor. Vine la cerere, cu mesajele
 * editării, doar pentru o foaie cu cote.
 */
import { useState, type ReactNode } from 'react';
import '../i18n/editare.ts';
import { mesajeGata } from '../i18n/laCerere.ts';
import { t, type CheieSimpla } from '../i18n/t.ts';
import { cereCota, comutaAscunsa, useAscunse, useStareCote } from './coteVedere.ts';
import './lista-cote.css';
import { useLimba } from './useLimba.ts';

/** Mesajele modulului, ca date (ADR 0086): cine îl încarcă le așteaptă (`cuMesaje`). */
export const mesaje = mesajeGata();
mesaje.catch(() => undefined);

const FELURI = new Set(['orizontala', 'verticala', 'aliniata', 'raza', 'diametru', 'unghi', 'lungime']);

export function ListaCote({ foaie, n }: { readonly foaie: string; readonly n: number }): ReactNode {
  useLimba();
  const s = useStareCote();
  const ascunsa = useAscunse().has(foaie);
  const randuri = s.randuri?.foaie === foaie ? s.randuri.randuri : [];
  const aleasa = s.aleasa?.foaie === foaie ? s.aleasa.id : null;
  // Închis la început; o cotă aleasă îl deschide, cât omul nu l-a închis de mână.
  const [deschis, setDeschis] = useState<boolean | null>(null);
  const arata = deschis ?? aleasa !== null;
  const ochi = ascunsa ? t('editare.cote.lista.arata') : t('editare.cote.lista.ascunde');
  return (
    <div className="lista-cote" data-testid="lista-cote" data-ascunse={ascunsa ? '' : undefined}>
      <div className="lista-cote-cap">
        <button type="button" className="comuta" aria-expanded={arata} aria-label={t('editare.cote.lista.detalii')} title={t('editare.cote.lista.detalii')}
          data-testid="lista-cote-comuta" onClick={() => { setDeschis(!arata); }} />
        <span className="lista-cote-titlu">{t('editare.cote.lista.titlu', { n })}</span>
        <button type="button" className="lista-cote-ochi" aria-pressed={!ascunsa} aria-label={ochi} title={ochi} data-testid="lista-cote-ochi"
          onClick={() => { comutaAscunsa(foaie); }}>
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M1.5 8 C3.5 4.5 5.6 3 8 3 C10.4 3 12.5 4.5 14.5 8 C12.5 11.5 10.4 13 8 13 C5.6 13 3.5 11.5 1.5 8 Z M8 5.8 A2.2 2.2 0 1 0 8 10.2 A2.2 2.2 0 1 0 8 5.8 Z" />
            {ascunsa ? <path d="M2.5 13.5 L13.5 2.5" /> : null}
          </svg>
        </button>
      </div>
      {arata ? (
        <ul>
          {randuri.map((r) => (
            <li key={r.id}>
              <button type="button" data-cota-lista={r.id} aria-pressed={aleasa === r.id} className={r.dezlegata ? 'cu-avertisment' : undefined}
                title={t('editare.cote.lista.alege')} onClick={() => { cereCota(foaie, r.id); }}>
                {r.cifra}
                {FELURI.has(r.fel) ? <span className="lista-cote-fel">{' · '}{t(`editare.cote.felul.${r.fel}` as CheieSimpla)}</span> : null}
                {r.dezlegata ? <span className="lista-cote-dezlegata">{' · '}{t('editare.cote.lista.dezlegata')}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
