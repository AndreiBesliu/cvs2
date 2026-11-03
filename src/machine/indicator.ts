/**
 * Indicatorul lucrării din meniul global (ADR 0132 §5) și lucrarea începută (§6), citite din starea sesiunii. Pur: aceeași
 * stare dă același indicator, fără DOM și fără timp; fereastra Mașina doar îl arată, iar carcasa citește lucrarea începută.
 */
import { cuPunctDeReluare, inFlux, type Faza } from './flux.ts';
import type { StareSesiune } from './sesiune.ts';

/**
 * O lucrare e pornită și neterminată în faza asta: o pagină închisă sau reîncărcată acum taie legătura, iar jobul se oprește la
 * mijloc. Sunt fazele cu punct de reluare ale fluxului (bariera și terminarea intră), deci aceeași definiție, nu o copie.
 */
export const lucrareInceputa = (f: Faza): boolean => cuPunctDeReluare(f);

/** Ce spune indicatorul, într-un cuvânt. */
export type FelIndicator =
  | 'conectata' | 'ruleaza' | 'pauza' | 'oprita-m6' | 'oprita' | 'suspendata' | 'alarma' | 'intrerupta' | 'gata';
export type CuloareIndicator = 'neutru' | 'verde' | 'portocaliu' | 'rosu';

export type Indicator = {
  readonly fel: FelIndicator;
  readonly culoare: CuloareIndicator;
  /**
   * Cât din program a plecat, în procente întregi, rotunjit în jos; null fără program. 100 abia la „gata”: cu tot programul
   * trimis, mașina încă taie ultimele linii (terminarea), deci până atunci cel mult 99.
   */
  readonly procent: number | null;
  /** Linia (numărată de la 1) la care stă o lucrare oprită de program (M0, M1, M6); altfel null. */
  readonly linie: number | null;
  /** Numărul alarmei (`ALARM:N`), când alarma are unul; altfel null. */
  readonly cod: number | null;
  /** Butonul de lângă: Pauză cât rulează, Reia cât stă în Hold. Oprește rămâne doar în fereastră (o repornire pierde poziția). */
  readonly buton: 'pauza' | 'reia' | null;
};

/**
 * Indicatorul stării de acum, sau null când n-are ce spune (mașina neconectată, nicio lucrare întreruptă). Ordinea contează:
 * alarma întâi (mașina e blocată), apoi lucrarea întreruptă (și fără legătură: omul care desenează trebuie să afle că s-a oprit),
 * apoi opririle cerute de program și pauza, la urmă mersul.
 */
export function indicatorLucrare(st: StareSesiune): Indicator | null {
  const f = st.flux;
  const n = f.program?.linii.length ?? 0;
  const procent = n > 0 ? Math.min(Math.floor((Math.min(f.urm, n) * 100) / n), 99) : null;
  const conectat = st.conexiune === 'conectat';
  const de = (fel: FelIndicator, culoare: CuloareIndicator, extra: Partial<Indicator> = {}): Indicator =>
    ({ fel, culoare, procent, linie: null, cod: null, buton: null, ...extra });
  if (conectat && (st.alarma !== null || f.raport?.stare === 'Alarm')) {
    return de('alarma', 'rosu', { cod: st.alarma?.fel === 'alarma' ? st.alarma.cod : null });
  }
  if (f.faza === 'pierdut') return de('intrerupta', 'rosu');
  if (!conectat) return null;
  if (f.faza === 'bariera') return de(f.bariera?.m6 ? 'oprita-m6' : 'oprita', 'portocaliu', { linie: (f.bariera?.linie ?? 0) + 1 });
  if (f.faza === 'suspendat') return de('suspendata', 'portocaliu');
  if (inFlux(f.faza)) {
    // Ușa de siguranță (`Door`) e tot o pauză, dar se reia după ce se închide ușa: cardul codului o spune, fără buton aici.
    if (f.raport?.stare === 'Door') return de('pauza', 'portocaliu');
    return f.raport?.stare === 'Hold' ? de('pauza', 'portocaliu', { buton: 'reia' }) : de('ruleaza', 'verde', { buton: 'pauza' });
  }
  if (f.faza === 'terminat') return de('gata', 'neutru', { procent: 100 });
  return de('conectata', 'neutru', { procent: null });
}
