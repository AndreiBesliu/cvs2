/**
 * Ancora transformării, arătată în panoul de proprietăți (ADR 0240 §A.7, felia 6.V↑d): editorul o pune aici cât unealta
 * Transformare are o selecție (punctul ei și felul în care se mută), iar panoul arată rândul „Ancora transformării” cu X / Y.
 * Scrise acolo, mută ancora, nu formele. Editorul și panoul se încarcă amândouă la cerere, în ordini oricare: starea stă aici,
 * citită prin `useSyncExternalStore`.
 */

export type AncoraPanou = { readonly x: number; readonly y: number; readonly muta: (p: { readonly x: number; readonly y: number }) => void } | null;

let stare: AncoraPanou = null;
const ascultatori = new Set<() => void>();

export const ancoraPanou = {
  citeste: (): AncoraPanou => stare,
  asculta: (f: () => void): (() => void) => {
    ascultatori.add(f);
    return () => { ascultatori.delete(f); };
  },
  /** O ancoră nouă (sau niciuna); aceeași ancoră, în același loc, nu-i mai trezește pe ascultători. */
  pune: (a: AncoraPanou): void => {
    if (a === stare || (a && stare && a.x === stare.x && a.y === stare.y && a.muta === stare.muta)) return;
    stare = a;
    for (const f of ascultatori) f();
  },
};
