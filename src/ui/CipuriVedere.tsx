import { useSyncExternalStore } from 'react';
import { t } from '../i18n/t.ts';
import { useLimba } from './useLimba.ts';

/**
 * O valoare care se schimbă des (cursorul la fiecare mișcare a mausului, zoomul la fiecare pas al rotiței): doar cipul
 * care o arată se redesenează, nu toată carcasa.
 */
export type Semnal<T> = {
  readonly citeste: () => T;
  readonly scrie: (v: T) => void;
  readonly asculta: (a: () => void) => () => void;
};

export function semnal<T>(initial: T): Semnal<T> {
  let valoare = initial;
  const ascultatori = new Set<() => void>();
  return {
    citeste: () => valoare,
    scrie: (v) => {
      if (Object.is(v, valoare)) return;
      valoare = v;
      for (const a of ascultatori) a();
    },
    asculta: (a) => {
      ascultatori.add(a);
      return () => { ascultatori.delete(a); };
    },
  };
}

/** Un punct al foii, în mm (originea în colțul ei stânga-jos, Y în sus, ca documentul). */
export type PunctFoaie = { readonly x: number; readonly y: number };

/** Pixeli CSS pe mm la mărimea reală, pe un ecran de 96 dpi: zoomul de 100 %. */
const PX_PE_MM = 96 / 25.4;

/** Două zecimale, fără „-0.00” pentru o valoare care se rotunjește la zero. */
const mm = (x: number): string => (Math.abs(x) < 0.005 ? 0 : x).toFixed(2);

/** Cursorul deasupra foii, în mm (prototipul A, în bara de jos a carcasei B); „—” cât mausul nu e pe pânză. */
export function CipCursor({ cursor }: { readonly cursor: Semnal<PunctFoaie | null> }) {
  useLimba();
  const p = useSyncExternalStore(cursor.asculta, cursor.citeste);
  return (
    <span className="cip cip-cursor" data-testid="cursor" title={t('stare.cursor.titlu')}>
      {t('stare.cursor', p ? { x: mm(p.x), y: mm(p.y) } : { x: '—', y: '—' })}
    </span>
  );
}

/** Zoomul vederii, în procente din mărimea reală; gol până la prima vedere a pânzei. */
export function CipZoom({ scara }: { readonly scara: Semnal<number | null> }) {
  useLimba();
  const s = useSyncExternalStore(scara.asculta, scara.citeste);
  return (
    <span className="cip cip-zoom" data-testid="zoom" title={t('stare.zoom.titlu')}>
      {s === null ? '' : t('stare.zoom', { p: Math.round((s / PX_PE_MM) * 100) })}
    </span>
  );
}
