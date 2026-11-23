/**
 * Ce spune imprimanta despre ea însăși (felia 3.6v, ADR 0195 §A.2, după schița acceptată): eroarea explicată din dicționarul
 * familiei driverului (codul de pe ecran, gravitatea, ce s-a întâmplat, ce faci, pagina producătorului într-o filă nouă) și
 * imprimarea oprită de o pană de curent. Un număr pe care dicționarul nu-l are se spune ca atare, cu lista codurilor, fără o
 * explicație ghicită. Fără dicționar (driverul n-are unul sau fișierul n-a venit), codul, ca înainte. Cheia și codul primite
 * rămân dedesubt, mici, pentru jurnal.
 */
import type { ReactNode } from 'react';
import { explicaEroare } from '../../shared/coduriImprimanta.ts';
import { t } from '../i18n/t.ts';
import type { StareCoduriImprimanta } from './coduriImprimanta.ts';

export function DeLaImprimanta({ eroare, cheie, pana, coduri }: {
  readonly eroare: number | null; readonly cheie: number | null; readonly pana: boolean | null; readonly coduri: StareCoduriImprimanta;
}): ReactNode {
  if (eroare === null && pana !== true) return <p className="imprimanta-slab">{t('imprimanta.fara-eroare')}</p>;
  return (
    <>
      {pana === true && (
        <div className="imprimanta-cod imprimanta-pana" data-testid="imprimanta-pana">
          <strong>{t('imprimanta.pana')}</strong>
          <span>{t('imprimanta.pana.text')}</span>
        </div>
      )}
      {eroare !== null && <Eroare eroare={eroare} cheie={cheie} coduri={coduri} />}
    </>
  );
}

function Eroare({ eroare, cheie, coduri }: { readonly eroare: number; readonly cheie: number | null; readonly coduri: StareCoduriImprimanta }): ReactNode {
  const brut = <span className="imprimanta-cod-brut">{t('imprimanta.eroare.brut', { cheie: cheie ?? '—', cod: eroare })}</span>;
  const x = typeof coduri === 'object' && coduri !== null ? explicaEroare(coduri, eroare, cheie) : null;
  if (typeof coduri !== 'object' || coduri === null || x === null) {
    return (
      <div className="imprimanta-cod" data-testid="imprimanta-cod" data-explicat="nu">
        <strong>{t('imprimanta.eroare', { cod: cheie ?? eroare })}</strong>
        <span>{t(coduri === 'incarca' ? 'imprimanta.eroare.se-aduce' : 'imprimanta.eroare.text')}</span>
        {brut}
      </div>
    );
  }
  const i = x.intrare;
  if (i === null) {
    return (
      <div className="imprimanta-cod" data-testid="imprimanta-cod" data-explicat="necunoscut">
        <strong>{t('imprimanta.eroare.necunoscuta', { cod: x.numar })}</strong>
        <span>{t('imprimanta.eroare.necunoscuta.text')}</span>
        <a href={coduri.lista} target="_blank" rel="noopener noreferrer" data-imprimanta="eroare-lista">{t('imprimanta.eroare.lista')}</a>
        {brut}
      </div>
    );
  }
  return (
    <div className="imprimanta-cod" data-testid="imprimanta-cod" data-explicat="da" data-grava={i.grava ? 'da' : 'nu'}>
      <span className="imprimanta-cod-cap">
        <span className="imprimanta-cod-ecran">{i.cod}</span>
        <span className="imprimanta-cod-nivel">{t(i.grava ? 'imprimanta.eroare.grava' : 'imprimanta.eroare.obisnuita')}</span>
      </span>
      <strong>{i.titlu}</strong>
      <span><b>{t('imprimanta.eroare.faci')}</b> {i.faci}</span>
      {i.wiki !== undefined && (
        <a href={i.wiki} target="_blank" rel="noopener noreferrer" data-imprimanta="eroare-wiki">{t('imprimanta.eroare.wiki')}</a>
      )}
      {brut}
    </div>
  );
}
