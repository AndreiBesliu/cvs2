/**
 * Escape pe pagină cât o fereastră e deschisă, oriunde ar fi focusul (felia 3.Aw, după „Frezele mele”, 16.A↑b-7, și
 * fereastra exportului). Butonul apăsat pleacă din pagină („Așază”, „Da, șterge”) sau se oprește sub focus, iar un clic pe
 * un text al ferestrei lasă focusul pe `body`: ascultată doar pe fereastră (`onKeyDown`), tasta se pierdea acolo.
 *
 * Ascultătorul stă pe `document`, pe urcare, și lasă tasta în pace când altcineva a oprit-o deja (`defaultPrevented`):
 * un câmp care o folosește singur (Escape întoarce valoarea din document, golește căutarea) sau un strat deschis peste
 * fereastră (manualul, F1) o ia primul. O oprește apoi și pe ea (`preventDefault`, `stopPropagation`), ca tastele
 * aplicației, ascultate pe `window`, să nu mai facă nimic cu ea: Escape închide doar ce e deschis (ADR 0132 §3).
 *
 * Felia 3.Ay:
 * - un dialog dintr-o fereastră care rămâne montată și ascunsă (Mașina, Imprimanta: `hidden` cât omul e în altă fereastră,
 *   ADR 0132 §3) își dă cutia (`cutie`): cât ea nu se vede, tasta rămâne a ferestrei de acum, neatinsă;
 * - dintre ferestrele deschise prin ascultătorul acesta, Escape îl ia doar cea de deasupra, adică ultima deschisă dintre
 *   cele care se văd (captura mărită peste bibliotecă). Pe `document`, ascultătorii pornesc în ordinea în care s-au pus,
 *   deci fără stivă l-ar lua cea de dedesubt.
 */
import { useEffect, useRef } from 'react';

type Cutie = { readonly current: HTMLElement | null };
type Deschisa = { readonly cutie: Cutie | undefined };

/** Ferestrele deschise acum, în ordinea în care s-au deschis (ultima e deasupra). */
const deschise: Deschisa[] = [];
const seVede = (f: Deschisa): boolean => f.cutie === undefined || f.cutie.current?.checkVisibility() === true;

/**
 * `laEscape` la Escape, cât componenta e montată și `activ` (și, dacă e dată, cât `cutie` se vede), dacă nicio fereastră
 * deschisă după ea nu se vede; ultima funcție dată, fără să mute ascultătorul.
 */
export function useEscapeFereastra(laEscape: () => void, activ = true, cutie?: Cutie): void {
  const ref = useRef(laEscape);
  ref.current = laEscape;
  useEffect(() => {
    if (!activ) return undefined;
    const eu: Deschisa = { cutie };
    deschise.push(eu);
    const asculta = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape' || e.defaultPrevented || e.isComposing || !seVede(eu)) return;
      if (deschise.slice(deschise.indexOf(eu) + 1).some(seVede)) return;
      e.preventDefault();
      e.stopPropagation();
      ref.current();
    };
    document.addEventListener('keydown', asculta);
    return () => {
      document.removeEventListener('keydown', asculta);
      const k = deschise.indexOf(eu);
      if (k >= 0) deschise.splice(k, 1);
    };
  }, [activ, cutie]);
}
