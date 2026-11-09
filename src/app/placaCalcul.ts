/**
 * Calculele plăcii din fereastra Imprimanta (felia 3.6q), fără React: eticheta fiecărei piese și pauza fișierului la care stă
 * imprimanta.
 */
import type { PauzaHarta } from '../machine/imprimanta/harta.ts';

/**
 * Eticheta unei piese: numele din cvs2 (fișierele trimise din „Din desen…”), altfel numele din fișier fără sufixul OrcaSlicer
 * (`_ID_0_COPY_0`), cu spații în loc de `_`; mai multe piese cu aceeași etichetă primesc numărul lor, în ordine.
 */
export function etichetePiese(nume: readonly string[], etichete: Readonly<Record<string, string>> | null): string[] {
  const baza = nume.map((n) => etichete?.[n.toUpperCase()] ?? (n.replace(/_ID_\d+_COPY_\d+$/i, '').replace(/_/g, ' ').trim() || n));
  return baza.map((b, k) => (baza.filter((x) => x === b).length > 1 ? `${b} ${baza.slice(0, k + 1).filter((x) => x === b).length}` : b));
}

/** Pauza fișierului la care stă imprimanta: cea mai apropiată de stratul de acum, la cel mult un strat de el. */
export function pauzaDeAcum(pauze: readonly PauzaHarta[], strat: number | null): PauzaHarta | null {
  if (strat === null) return null;
  let rez: PauzaHarta | null = null;
  for (const p of pauze) if (Math.abs(p.strat - strat) <= 1 && (rez === null || Math.abs(p.strat - strat) < Math.abs(rez.strat - strat))) rez = p;
  return rez;
}
