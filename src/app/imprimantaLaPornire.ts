/**
 * Bifa „Leagă imprimanta ținută la deschiderea cvs2” (felia 3.6s, ADR 0194 §A.5), citită de carcasă fără codul
 * imprimantei: cu ea, fereastra Imprimanta se montează (ascunsă) după pornire și se leagă singură, cu doar citiri.
 */
export const CHEIE_NOTIFICARI = 'cvs2.imprimanta.notificari';

export function legareLaPornire(): boolean {
  try {
    const x = JSON.parse(globalThis.localStorage?.getItem(CHEIE_NOTIFICARI) ?? 'null') as { v?: unknown; legare?: unknown } | null;
    return x?.v === 1 && x.legare === true;
  } catch {
    return false;
  }
}
