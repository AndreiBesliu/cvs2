import type { EvenimentImprimanta } from '../../shared/utilizare.ts';
import { evenimente, lucrareNoua, type Clipa, type FelEveniment } from '../machine/imprimanta/evenimente.ts';

/**
 * Imprimanta în utilizarea aplicației (ADR 0262, felia A.8d), din două clipe la rând ale ferestrei: legarea, o lucrare nouă,
 * evenimentele imprimării (ADR 0194 §A: finalul, oprirea, pauzele, filamentul, eroarea cu cheia ei, pana de curent, legătura
 * pierdută, primul strat) și deconectarea. Evenimentele sunt cele ale notificărilor (`evenimente.ts`), toate, oricare ar fi
 * setările notificărilor. Fără fișiere, fără adrese, fără temperaturi.
 */
export type PasImprimanta = { readonly id: EvenimentImprimanta; readonly cod?: number };

const ID: { readonly [K in FelEveniment]: EvenimentImprimanta } = {
  gata: 'gata', oprita: 'oprita', pauzaFisier: 'pauza-fisier', pauza: 'pauza', faraFilament: 'fara-filament', eroare: 'eroare',
  pana: 'pana', pierduta: 'pierduta', primulStrat: 'primul-strat',
};

export function evenimenteImprimanta(a: Clipa | null, b: Clipa): PasImprimanta[] {
  const r: PasImprimanta[] = [];
  // Legarea: din deconectată (sau prima clipă) în vie; o legătură pierdută care revine nu e o legare nouă.
  if (b.legatura === 'vie' && (a === null || a.legatura === 'alta')) r.push({ id: 'legata' });
  // O lucrare nouă doar după o clipă vie, cu lucrarea știută: una găsită în curs la legare a pornit altundeva.
  if (a !== null && a.legatura === 'vie' && a.lucrare !== 'necunoscuta' && lucrareNoua(a, b)) r.push({ id: 'pornita' });
  for (const e of evenimente(a, b)) r.push(e.fel === 'eroare' && e.cheie !== null ? { id: 'eroare', cod: e.cheie } : { id: ID[e.fel] });
  if (a !== null && a.legatura !== 'alta' && b.legatura === 'alta') r.push({ id: 'deconectata' });
  return r;
}
