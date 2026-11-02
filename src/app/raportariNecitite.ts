/**
 * Câte raportări ale omului au un răspuns necitit (ADR 0116 §14): semnul din meniul contului. Vine odată cu deschiderea
 * contului (reconfirmarea de la pornire, panoul) și cu „Raportările mele”; stă doar în memorie, fără Firebase, ca meniul
 * să-l arate pe loc. Un cont ieșit îl stinge.
 */
import { useSyncExternalStore } from 'react';

let necitite = 0;
const ascultatori = new Set<() => void>();

export function raportariNecitite(): number {
  return necitite;
}

export function puneRaportariNecitite(n: number): void {
  const x = Number.isSafeInteger(n) && n > 0 ? n : 0;
  if (x === necitite) return;
  necitite = x;
  for (const a of ascultatori) a();
}

function aboneaza(f: () => void): () => void {
  ascultatori.add(f);
  return () => { ascultatori.delete(f); };
}

export function useRaportariNecitite(): number {
  return useSyncExternalStore(aboneaza, raportariNecitite);
}
