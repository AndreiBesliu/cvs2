/**
 * Escape pe pagină cât o fereastră e deschisă, oriunde ar fi focusul (felia 3.Aw, după „Frezele mele”, 16.A↑b-7, și
 * fereastra exportului). Butonul apăsat pleacă din pagină („Așază”, „Da, șterge”) sau se oprește sub focus, iar un clic pe
 * un text al ferestrei lasă focusul pe `body`: ascultată doar pe fereastră (`onKeyDown`), tasta se pierdea acolo.
 *
 * Ascultătorul stă pe `document`, pe urcare, și lasă tasta în pace când altcineva a oprit-o deja (`defaultPrevented`):
 * un câmp care o folosește singur (Escape întoarce valoarea din document, golește căutarea) sau un strat deschis peste
 * fereastră (manualul, F1) o ia primul. O oprește apoi și pe ea (`preventDefault`, `stopPropagation`), ca tastele
 * aplicației, ascultate pe `window`, să nu mai facă nimic cu ea: Escape închide doar ce e deschis (ADR 0132 §3).
 */
import { useEffect, useRef } from 'react';

/** `laEscape` la Escape, cât componenta e montată și `activ`; ultima funcție dată, fără să mute ascultătorul. */
export function useEscapeFereastra(laEscape: () => void, activ = true): void {
  const ref = useRef(laEscape);
  ref.current = laEscape;
  useEffect(() => {
    if (!activ) return undefined;
    const asculta = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape' || e.defaultPrevented || e.isComposing) return;
      e.preventDefault();
      e.stopPropagation();
      ref.current();
    };
    document.addEventListener('keydown', asculta);
    return () => { document.removeEventListener('keydown', asculta); };
  }, [activ]);
}
