/**
 * Evenimentele unei imprimări (felia 3.6s, ADR 0194 §A), din două clipe la rând ale ferestrei: finalul, oprirea, pauza din
 * fișier (cu stratul și nota), altă pauză, lipsa filamentului, o eroare nouă, legătura pierdută cât lucrează și primul strat
 * gata. Un eveniment vine doar dintr-o schimbare: o clipă fără una dinainte (prima după legare) sau cu lucrarea necunoscută
 * nu spune nimic, deci o legare nouă nu repetă ce s-a anunțat. Cât legătura lipsește, starea ținută e veche: doar pierderea
 * ei e un eveniment; când revine, ce s-a schimbat între timp (de exemplu finalul) se anunță la prima clipă vie.
 */
import type { StareLucrare } from './driver.ts';

export const EVENIMENTE = ['gata', 'oprita', 'pauzaFisier', 'pauza', 'faraFilament', 'eroare', 'pierduta', 'primulStrat'] as const;
export type FelEveniment = (typeof EVENIMENTE)[number];

/** Ce știe fereastra la un moment dat, cât trebuie pentru evenimente. */
export type Clipa = {
  /** Legătura: vie, pierdută (se reface) sau altfel (deconectată, se leagă). */
  readonly legatura: 'vie' | 'pierduta' | 'alta';
  readonly lucrare: StareLucrare;
  readonly fisier: string | null;
  readonly eroare: number | null;
  readonly cheieEroare: number | null;
  readonly faraFilament: boolean | null;
  /** Stratul viu (3.6q), nu numărul trimis de imprimantă. */
  readonly strat: number | null;
  /** Pauza din fișier la care stă imprimanta acum (doar în pauză, doar pentru fișierele știute), cu nota ei. */
  readonly pauzaFisier: { readonly strat: number; readonly nota: string | null } | null;
  readonly trecut: number | null;
  readonly filament: number | null;
};

export type Eveniment = {
  readonly fel: FelEveniment;
  readonly fisier: string | null;
  readonly strat: number | null;
  readonly nota: string | null;
  /** Cheia erorii (altfel codul ei). */
  readonly cheie: number | null;
  /** Durata (s) și filamentul (mm) lucrării, la final sau la oprire. */
  readonly durata: number | null;
  readonly filament: number | null;
};

/** O lucrare în curs: pornirea ei, imprimarea, pauza. */
export const LUCREAZA: ReadonlySet<StareLucrare> = new Set<StareLucrare>(['pregatire', 'imprima', 'pauza']);

const maxim = (a: number | null, b: number | null): number | null => (a === null ? b : b === null ? a : Math.max(a, b));

/** O lucrare nouă începe: din nimic (sau dintr-una încheiată) într-una în curs, ori alt fișier. */
export function lucrareNoua(a: Clipa | null, b: Clipa): boolean {
  if (!LUCREAZA.has(b.lucrare)) return false;
  return a === null || !LUCREAZA.has(a.lucrare) || a.fisier !== b.fisier;
}

export function evenimente(a: Clipa | null, b: Clipa): Eveniment[] {
  if (a === null || a.lucrare === 'necunoscuta' || b.lucrare === 'necunoscuta') return [];
  const ev = (fel: FelEveniment, x: Partial<Eveniment> = {}): Eveniment =>
    ({ fel, fisier: b.fisier ?? a.fisier, strat: null, nota: null, cheie: null, durata: null, filament: null, ...x });
  const r: Eveniment[] = [];
  if (a.legatura !== 'pierduta' && b.legatura === 'pierduta' && LUCREAZA.has(a.lucrare)) r.push(ev('pierduta'));
  if (b.legatura !== 'vie') return r;
  if (a.fisier !== null && a.fisier === b.fisier && LUCREAZA.has(a.lucrare)) {
    // Durata și filamentul, de dinaintea finalului: după el, imprimanta le poate pune pe 0 (K3).
    const cifre = { durata: maxim(a.trecut, b.trecut), filament: maxim(a.filament, b.filament) };
    if (b.lucrare === 'gata') r.push(ev('gata', cifre));
    else if (b.lucrare === 'oprita') r.push(ev('oprita', cifre));
    else if (b.lucrare === 'pauza') {
      if (b.faraFilament === true && (a.lucrare !== 'pauza' || a.faraFilament !== true)) r.push(ev('faraFilament'));
      else if (a.lucrare !== 'pauza' && b.faraFilament !== true) {
        r.push(b.pauzaFisier === null ? ev('pauza') : ev('pauzaFisier', { strat: b.pauzaFisier.strat, nota: b.pauzaFisier.nota }));
      }
    } else if (b.lucrare === 'imprima' && a.strat === 1 && b.strat !== null && b.strat >= 2) r.push(ev('primulStrat', { strat: 1 }));
  }
  if (b.eroare !== null && (b.eroare !== a.eroare || b.cheieEroare !== a.cheieEroare)) r.push(ev('eroare', { cheie: b.cheieEroare ?? b.eroare }));
  return r;
}

/**
 * Cheia unui eveniment în lucrarea lui: o pauză, pe stratul ei; restul, o dată pe lucrare. Fereastra ține cheile anunțate
 * cât ține lucrarea (le uită la una nouă), ca o stare care pâlpâie (99 ↔ 100 la final) să nu anunțe de două ori.
 */
export const cheieEveniment = (e: Eveniment): string => `${e.fel}|${e.fisier ?? ''}|${e.fel === 'eroare' ? (e.cheie ?? '') : (e.strat ?? '')}`;
