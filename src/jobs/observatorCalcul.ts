/**
 * Calculele bazinului, spuse cui ascultă (ADR 0262, felia A.8d): felul, durata, cum s-a încheiat și câte forme avea
 * documentul. Ascultă utilizarea aplicației, pusă din pornire (`main.tsx`): bazinul nu importă interfața (regula
 * `bazinul-fara-interfata`), deci el doar spune aici. Un ascultător care aruncă nu strică niciodată calculul.
 */
export type CalculObservat = {
  readonly fel: 'export' | 'traseu' | 'simulare' | 'potrivire' | 'timp' | 'verificare' | 'reparare' | 'taiere' | 'panouri' | 'conversie' | 'legare';
  readonly ms: number;
  readonly rez: 'ok' | 'eroare' | 'anulat';
  /** Formele documentului (în lume), la calculele care primesc unul. */
  readonly forme?: number;
};

let observator: ((c: CalculObservat) => void) | null = null;

export function observaCalculele(f: ((c: CalculObservat) => void) | null): void {
  observator = f;
}

export function spuneCalculul(c: CalculObservat): void {
  try {
    observator?.(c);
  } catch {
    // Utilizarea aplicației nu oprește un calcul.
  }
}
