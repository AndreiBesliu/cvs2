import type { EvenimentMasina } from '../../shared/utilizare.ts';
import { indicatorLucrare, type FelIndicator } from '../machine/indicator.ts';
import type { StareSesiune } from '../machine/sesiune.ts';

/**
 * Mașina în utilizarea aplicației (ADR 0262, felia A.8d), din două stări la rând ale sesiunii: legarea (cu felul legăturii),
 * lucrarea (pornită, pusă pe pauză, reluată, oprită de program, anulată, terminată, întreruptă), codurile controlerului
 * (`error:N`, `ALARM:N`, blocarea fără cod) și deconectarea. Fără G-code, fără adrese, fără poziții. Lucrarea se citește din
 * indicatorul lucrării (`indicator.ts`), deci aceeași definiție ca în meniul global, nu o copie.
 */
export type PasMasina = { readonly id: EvenimentMasina; readonly cod?: number; readonly cale?: 'serial' | 'retea' | 'simulat' };

/** O lucrare pornită și neterminată: rulează sau stă (pauză, oprire cerută de program, suspendare). */
const IN_LUCRARE: ReadonlySet<FelIndicator | null> = new Set<FelIndicator | null>(['ruleaza', 'pauza', 'oprita', 'oprita-m6', 'suspendata']);
/** Legată și liberă: de aici se pornește o lucrare. */
const LIBERA: ReadonlySet<FelIndicator | null> = new Set<FelIndicator | null>(['conectata', 'gata']);
/** Unde ajunge doar o lucrare pornită: o pauză, o oprire cerută de program, capătul, întreruperea (faza cu punct de reluare). */
const DUPA_PORNIRE: ReadonlySet<FelIndicator | null> = new Set<FelIndicator | null>(['pauza', 'suspendata', 'oprita', 'oprita-m6', 'gata', 'intrerupta']);

export function evenimenteMasina(a: StareSesiune | null, b: StareSesiune): PasMasina[] {
  const r: PasMasina[] = [];
  const legataA = a?.conexiune === 'conectat';
  const legataB = b.conexiune === 'conectat';
  if (!legataA && legataB) r.push(b.transport === null ? { id: 'legata' } : { id: 'legata', cale: b.transport });
  // Un cod nou al controlerului (numărul lui crește la fiecare).
  if (b.cod !== null && b.cod.nr !== a?.cod?.nr) r.push(b.cod.fel === 'blocare' ? { id: 'blocare' } : { id: b.cod.fel, cod: b.cod.cod });
  const ia = a === null ? null : indicatorLucrare(a)?.fel ?? null;
  const ib = indicatorLucrare(b)?.fel ?? null;
  if (ia !== ib) {
    // Stările se văd la fiecare redesenare, nu la fiecare pas al fluxului: o lucrare scurtă poate porni și ajunge la capăt
    // (sau la o oprire) între două stări văzute. Pornirea se spune oricum, întâi: o lucrare terminată e una pornită.
    if (LIBERA.has(ia) && DUPA_PORNIRE.has(ib)) r.push({ id: 'pornita' });
    if (ib === 'ruleaza') r.push({ id: IN_LUCRARE.has(ia) ? 'reluata' : 'pornita' });
    else if (ib === 'pauza' || ib === 'suspendata') r.push({ id: 'pauza' });
    else if (ib === 'oprita' || ib === 'oprita-m6') r.push({ id: 'oprita' });
    else if (ib === 'gata') r.push({ id: 'terminata' });
    else if (ib === 'intrerupta') r.push({ id: 'intrerupta' });
    // Din lucrare înapoi la „legată”, fără final: omul a oprit-o (o alarmă are evenimentul ei, din cod).
    else if (ib === 'conectata' && IN_LUCRARE.has(ia)) r.push({ id: 'anulata' });
  }
  if (legataA && !legataB) r.push({ id: 'deconectata' });
  return r;
}
