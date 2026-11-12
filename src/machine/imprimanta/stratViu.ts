/**
 * Stratul de acum, pentru placa din fereastră (felia 3.6q, ADR 0193 §B.8), fără rețea și fără timp. K1C amestecă două
 * numărători ale stratului, la 5 una de alta (3, 8, 3, 4, 10, 5, transcrierea din 07.11), deci numărul ei nu se ia așa cum
 * vine:
 * - pentru un fișier știut (trimis din cvs2, cu harta lui), stratul vine din filamentul folosit, pe filamentul fișierului; un
 *   număr al imprimantei la cel mult un strat de el e luat (atunci e exact: Klipper-ul Creality numără liniile `;LAYER_CHANGE`);
 * - pentru alt fișier: dintre ultimele două valori, cea mai apropiată de progres (progresul × straturile);
 * - altfel, niciun strat (fără valori ghicite).
 */
import type { HartaGcode } from './harta.ts';

export type SursaStrat = 'imprimanta' | 'filament';
export type StratViu = { readonly strat: number | null; readonly sursa: SursaStrat | null };

/**
 * Stratul (de la 1) în care se află filamentul dat, pe harta fișierului: ultimul care începe la cel mult el. Înaintea primului
 * strat (linia de curățare a imprimantei, preambulul fișierului) e tot primul.
 */
export function stratDinFilament(h: HartaGcode, filament: number): number | null {
  const n = h.straturi.length;
  if (n === 0 || !Number.isFinite(filament)) return null;
  let lo = 0, hi = n - 1, k = 0;
  while (lo <= hi) {
    const m = (lo + hi) >> 1;
    if (h.straturi[m]!.e <= filament) { k = m; lo = m + 1; } else hi = m - 1;
  }
  return k + 1;
}

export type DateStrat = {
  readonly harta: HartaGcode | null;
  /** Straturile spuse de imprimantă (`TotalLayer`). */
  readonly straturi: number | null;
  readonly progres: number | null;
  readonly filament: number | null;
  /** Valorile recente ale stratului spuse de imprimantă, în ordinea sosirii. */
  readonly recente: readonly number[];
  /** Imprimanta stă în pauză: dacă e o pauză a fișierului lângă stratul găsit, stratul e chiar al ei. */
  readonly inPauza?: boolean;
};

function stratDeBaza(d: DateStrat): StratViu {
  const total = d.harta !== null && d.harta.straturi.length > 0 ? d.harta.straturi.length : d.straturi !== null && d.straturi > 0 ? d.straturi : null;
  const bune = d.recente.filter((v) => Number.isInteger(v) && v >= 1 && (total === null || v <= total));
  const kF = d.harta !== null && d.filament !== null ? stratDinFilament(d.harta, d.filament) : null;
  if (kF !== null) {
    for (let i = bune.length - 1; i >= 0; i--) if (Math.abs(bune[i]! - kF) <= 1) return { strat: bune[i]!, sursa: 'imprimanta' };
    return { strat: kF, sursa: 'filament' };
  }
  if (bune.length === 0) return { strat: null, sursa: null };
  // Ultimele două valori: câte una din fiecare numărătoare, când K1C le amestecă.
  const doua = bune.slice(-2);
  let ales = doua[doua.length - 1]!;
  if (total !== null && d.progres !== null && doua.length === 2) {
    const tinta = (d.progres / 100) * total;
    if (Math.abs(doua[0]! - tinta) < Math.abs(ales - tinta)) ales = doua[0]!;
  }
  return { strat: ales, sursa: 'imprimanta' };
}

export function stratViu(d: DateStrat): StratViu {
  const r = stratDeBaza(d);
  // În pauza fișierului, imprimanta a trecut de schimbarea stratului (pauza vine după ea), deci stratul e cel al pauzei, chiar
  // dacă ultima valoare bună a imprimantei a rămas pe stratul de dinainte (K1C a trimis între timp numărătoarea cu 5 în plus).
  if (d.inPauza !== true || d.harta === null || r.strat === null) return r;
  let p: number | null = null;
  for (const x of d.harta.pauze) if (Math.abs(x.strat - r.strat) <= 1 && (p === null || Math.abs(x.strat - r.strat) < Math.abs(p - r.strat))) p = x.strat;
  return p === null ? r : { strat: p, sursa: r.sursa };
}
