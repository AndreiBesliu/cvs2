/**
 * Captura mărită (ADR 0232 §C.12): peste fereastra bibliotecii, cât încape în ecran, cu ← și → (și de la un capăt la
 * celălalt), locul ei („2 / 3”), textul alternativ ca legendă și Escape. Focusul stă în ea (Tab trece doar între butoanele
 * ei); la închidere, pagina îl întoarce pe captura la care s-a ajuns. Un clic pe fond o închide.
 */
import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { t } from '../i18n/t.ts';

export type CapturaAratata = { readonly adresa: string; readonly alt: string; readonly lat: number; readonly inalt: number };

export function CapturaMarita({ capturi, loc, onLoc, onInchide }: {
  readonly capturi: readonly CapturaAratata[]; readonly loc: number; readonly onLoc: (i: number) => void; readonly onInchide: () => void;
}): ReactNode {
  const radacina = useRef<HTMLDivElement | null>(null);
  useEffect(() => { radacina.current?.focus(); }, []);
  const n = capturi.length;
  const c = capturi[loc];
  if (!c) return null;
  const muta = (pas: number): void => { onLoc((loc + pas + n) % n); };
  const tasta = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (e.key === 'Escape') {
      // Doar captura se închide: biblioteca de dedesubt nu vede tasta.
      e.preventDefault();
      e.stopPropagation();
      onInchide();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      if (n > 1) muta(e.key === 'ArrowRight' ? 1 : -1);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const b = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('button')];
      const i = b.indexOf(document.activeElement as HTMLButtonElement);
      b[(i + (e.shiftKey ? b.length - 1 : 1) + (i < 0 && e.shiftKey ? 1 : 0)) % b.length]?.focus();
    }
  };
  return createPortal(
    <div ref={radacina} className="captura-marita" role="dialog" aria-modal="true" aria-label={t('extensii.captura.titlu')} data-testid="captura-marita" tabIndex={-1}
      onKeyDown={tasta} onPointerDown={(e) => { if (e.target === e.currentTarget) onInchide(); }}>
      <figure>
        <img src={c.adresa} alt={c.alt} width={c.lat} height={c.inalt} draggable={false} />
        <figcaption>
          <span data-testid="captura-legenda">{c.alt}</span>
          <span className="captura-loc" data-testid="captura-loc" aria-live="polite">{loc + 1} / {n}</span>
        </figcaption>
      </figure>
      {n > 1 && (
        <button type="button" className="captura-sageata inapoi" data-extensii="captura-inapoi" aria-label={t('extensii.captura.inapoi')} title={t('extensii.captura.inapoi')}
          onClick={() => { muta(-1); }}><span aria-hidden="true">‹</span></button>
      )}
      {n > 1 && (
        <button type="button" className="captura-sageata inainte" data-extensii="captura-inainte" aria-label={t('extensii.captura.inainte')} title={t('extensii.captura.inainte')}
          onClick={() => { muta(1); }}><span aria-hidden="true">›</span></button>
      )}
      <button type="button" className="captura-inchide" data-extensii="captura-inchide" aria-label={t('extensii.captura.inchide')} title={t('extensii.captura.inchide')}
        onClick={onInchide}><span aria-hidden="true">×</span></button>
    </div>,
    document.body,
  );
}
