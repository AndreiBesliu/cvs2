import { amprentaSir } from './amprenta.ts';
import type { Nod } from './document.ts';
import { jsonCanonic } from './jsonCanonic.ts';

const amprente = new WeakMap<readonly Nod[], string>();

/**
 * Amprenta contururilor unui bloc de text (copiii grupului lui, ADR 0105 §4), ținută pe obiect: documentul nu se schimbă pe
 * loc. Stă singură, fără schema blocului (`blocText.ts`), ca ușa documentului (v23, literele plăcuțelor) s-o poată folosi
 * fără să aducă la pornire toată schema textului.
 */
export function amprentaContururi(copii: readonly Nod[]): string {
  const gata = amprente.get(copii);
  if (gata !== undefined) return gata;
  const a = amprentaSir(jsonCanonic(copii));
  amprente.set(copii, a);
  return a;
}
