/**
 * Comenzile foii pe pânză (ADR 0210 §1, felia 11.1↑c): partea pură. Fiecare foaie de pe pânză are sub ea un rând cu comenzile
 * din meniul ei; rândul foii active se vede mereu, al celorlalte doar cât mausul stă pe foaie sau pe fâșia rândului.
 */

/** O foaie de pe pânză, în mm ai foii active: colțul ei stânga-jos e la (`x`, 0), ca la foile vecine (`locuriFoi`). */
export type FoaiePePanza = {
  readonly id: string;
  readonly nume: string;
  readonly x: number;
  readonly latime: number;
  readonly inaltime: number;
  readonly piese: number;
  readonly activa: boolean;
};

/** Cât de jos sub foaie stă rândul (px) și cât de înalt e (px): fâșia de sub foaie ține și ea rândul la vedere. */
export const DISTANTA_RAND_PX = 6;
export const INALTIME_RAND_PX = 34;

/**
 * Pură: foaia peste care stă cursorul (în mm ai foii active), sau null. Fâșia de sub foaie, cât rândul comenzilor, ține de
 * ea: mausul dus de pe foaie pe rând nu trece printr-un gol.
 */
export function foaiaDeSub(cursor: { readonly x: number; readonly y: number } | null, foi: readonly FoaiePePanza[], scara: number): string | null {
  if (cursor === null || !(scara > 0)) return null;
  const sub = (DISTANTA_RAND_PX + INALTIME_RAND_PX) / scara;
  for (const f of foi) {
    if (cursor.x >= f.x && cursor.x <= f.x + f.latime && cursor.y >= -sub && cursor.y <= f.inaltime) return f.id;
  }
  return null;
}

/** Pură: locul rândului pe ecran (px ai pânzei): colțul lui stânga-sus, sub marginea de jos a foii. */
export function loculRandului(f: FoaiePePanza, vedere: { readonly scara: number; readonly tx: number; readonly ty: number }): { readonly stanga: number; readonly sus: number } {
  return { stanga: vedere.tx + f.x * vedere.scara, sus: vedere.ty + DISTANTA_RAND_PX };
}

/** Rândurile registrului, în ordinea meniului foii (`MeniuFoaie.tsx`), cu eticheta fiecăruia; ștergerea la capăt. */
export const RANDURI_FOAIE = [
  ['foaie.duplica', 'actiune.foaie-duplica'],
  // Aceleași piese, legate (ADR 0210 §2): o schimbare a uneia se vede pe ambele foi.
  ['foaie.duplica-legat', 'actiune.foaie-duplica-legat'],
  ['foaie.muta-sus', 'actiune.foaie-muta-sus'],
  ['foaie.muta-jos', 'actiune.foaie-muta-jos'],
  ['foaie.sterge', 'actiune.foaie-sterge'],
] as const;
