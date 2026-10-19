/**
 * Protocolul workerului simulării (ADR 0047 §4): o cerere de bandă, un răspuns. Numai date (ADR 0015: workerul nu ține
 * nimic între joburi); tablourile pleacă transferate, nu copiate.
 */
import type { CerereBanda, RaspunsBanda } from '../sim/banda.ts';

export type MesajSimulare = { readonly id: number; readonly cerere: CerereBanda };

export type RaspunsSimulare =
  | { readonly id: number; readonly ok: true; readonly raspuns: RaspunsBanda }
  | { readonly id: number; readonly ok: false; readonly motiv: string };

/** Tablourile unui răspuns, de transferat (nu de copiat) înapoi la firul principal. */
export function transferabile(r: RaspunsBanda): Transferable[] {
  return [r.randuri.buffer, r.amprente.buffer, r.volume.buffer, r.previzualizare.buffer] as Transferable[];
}
