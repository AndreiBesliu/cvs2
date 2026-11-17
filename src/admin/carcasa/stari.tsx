import { createContext, useContext, type AnchorHTMLAttributes, type ReactElement, type ReactNode } from 'react';
import { t } from '../../i18n/t.ts';
import type { Fila } from '../adresa.ts';
import type { FelGasit, Gasibil } from './date.ts';

/**
 * Carcasa paginii `/admin` (ADR 0260 §1) pentru file: mutarea în altă filă (cu un rând de găsit acolo), ce file vede
 * rolul și ce au citit filele, pentru căutarea din antet. Și stările comune ale unei file (ideea 76): rândurile schițate
 * cât se încarcă, lista goală cu semnul și ultima rezolvare, eroarea citirii cu „Deschide Diagnoza”.
 */

/** Un rând de găsit în fila deschisă (din căutare): id-ul lui; la erori, și dacă grupul e rezolvat. */
export interface Tinta {
  readonly id: string;
  readonly rezolvat?: boolean | undefined;
}

export interface Carcasa {
  readonly deschide: (fila: Fila, tinta?: Tinta) => void;
  readonly vede: (fila: Fila) => boolean;
  /** O filă spune ce a citit (pentru căutare); rândurile se adaugă celor citite înainte, cele noi câștigă. */
  readonly publica: (fel: FelGasit, randuri: readonly Gasibil[]) => void;
}

export const ContextCarcasa = createContext<Carcasa | null>(null);

/** Ce a citit o filă, spus carcasei (fără carcasă, de pildă într-o probă, nimic). */
export function usePublica(): (fel: FelGasit, randuri: readonly Gasibil[]) => void {
  return useContext(ContextCarcasa)?.publica ?? nimic;
}
const nimic = (): void => undefined;

/**
 * Legătura spre o filă: `#fila`, ca un clic de mijloc (sau cu Ctrl) s-o deschidă într-o filă nouă a browserului; clicul
 * simplu o deschide aici, fără o intrare nouă în istoric (ca bara de file de până acum).
 */
export function LegaturaFila({ fila, tinta, laClic, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & {
  readonly fila: Fila; readonly tinta?: Tinta; readonly laClic?: () => void; readonly children: ReactNode;
}): ReactElement {
  const c = useContext(ContextCarcasa);
  return (
    <a {...rest} href={`#${fila}`} onClick={(e) => {
      if (c === null || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      c.deschide(fila, tinta);
      laClic?.();
    }}>{children}</a>
  );
}

type Atribute = { readonly [k: `data-${string}`]: string };

/** Cât se încarcă: rânduri schițate, cu textul de azi (ideea 76). */
export function SeIncarca({ text }: { readonly text: string }): ReactElement {
  return (
    <div className="admin-schita" data-schita="" role="status" aria-busy="true">
      <span aria-hidden="true" /><span aria-hidden="true" /><span aria-hidden="true" />
      <p className="admin-slab">{text}</p>
    </div>
  );
}

/** O listă goală: semnul, textul de azi și ultima rezolvare, când se știe (ideea 76). */
export function ListaGoala({ text, ultima = null, atribute }: { readonly text: string; readonly ultima?: string | null; readonly atribute: Atribute }): ReactElement {
  return (
    <div className="admin-gol" {...atribute}>
      <span className="admin-semn" data-semn="" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 10.5l3.5 3.5 7.5-8" /></svg>
      </span>
      <strong>{text}</strong>
      {ultima ? <span className="admin-slab" data-ultima="">{ultima}</span> : null}
    </div>
  );
}

/**
 * Eroarea citirii unei file: motivul de azi, cu „Reîncarcă” (când fila are) și „Deschide Diagnoza” (când rolul o vede):
 * un refuz al regulilor se lămurește acolo (ideea 76).
 */
export function EroareCitire({ text, motiv, reincarca, atribute }: {
  readonly text: string; readonly motiv: string; readonly reincarca?: () => void; readonly atribute: Atribute;
}): ReactElement {
  const c = useContext(ContextCarcasa);
  return (
    <div className="admin-eroare-citire" role="alert" {...atribute}>
      <strong>{text}</strong>
      {motiv.startsWith('permission-denied') ? <span>{t('admin.stari.refuz')}</span> : null}
      <div className="admin-randuri">
        {reincarca ? <button type="button" onClick={reincarca}>{t('admin.erori.reincarca')}</button> : null}
        {c?.vede('diagnoza') ? (
          <button type="button" data-admin="deschide-diagnoza" onClick={() => { c.deschide('diagnoza'); }}>{t('admin.stari.deschide-diagnoza')}</button>
        ) : null}
      </div>
    </div>
  );
}
