/**
 * Spațierea literelor alese (ADR 0138 §5), pură: ce goluri atinge alegerea din câmpul textului, valoarea lor comună, cum le
 * schimbă o valoare scrisă sau un pas, cum trec peste o editare a textului. Indicii sunt pe puncte de cod, în textul fără
 * `\r` (ca în așezare), iar golul `i` e cel dintre caracterul `i` și cel de după el.
 */
import { LIMITE_TEXT } from '../model/blocText.ts';
import type { SpatiuLitera } from './asezare.ts';

/** Indicele pe puncte de cod al unei poziții din câmpul textului (dată în unități UTF-16, ca `selectionStart`). */
export function pePuncte(text: string, pozitie: number): number {
  return Array.from(text.slice(0, pozitie)).length;
}

/**
 * Golurile atinse de alegerea [inceput, sfarsit) (pe puncte de cod): cele dintre literele alese (n litere, n − 1 goluri);
 * cu cursorul între două caractere, perechea lor. Un gol de lângă un capăt de rând nu se atinge: acolo nu e spațiu de pus.
 */
export function goluriAtinse(text: string, inceput: number, sfarsit: number): number[] {
  const c = Array.from(text.replace(/\r/g, ''));
  const bun = (i: number): boolean => i >= 0 && i + 1 < c.length && c[i] !== '\n' && c[i + 1] !== '\n';
  const rez: number[] = [];
  if (sfarsit - inceput >= 2) {
    for (let i = inceput; i <= sfarsit - 2; i++) if (bun(i)) rez.push(i);
  } else if (sfarsit === inceput && bun(inceput - 1)) rez.push(inceput - 1);
  return rez;
}

/** Valoarea comună a golurilor (mm; 0 = fără spațiu), sau null: diferă între ele (ori nu e niciun gol). */
export function valoareComuna(spatieri: readonly SpatiuLitera[], goluri: readonly number[]): number | null {
  if (goluri.length === 0) return null;
  const m = new Map(spatieri.map((s) => [s.dupa, s.mm]));
  const valori = new Set(goluri.map((g) => m.get(g) ?? 0));
  return valori.size === 1 ? [...valori][0]! : null;
}

/**
 * Spațierile cu golurile date schimbate de `f` (din valoarea veche în cea nouă, în mm), la miime de mm, în marginile
 * spațierii (±1 000 mm); un gol care ajunge la 0 iese. Rezultatul e sortat, ca în bloc.
 */
export function cuGoluri(spatieri: readonly SpatiuLitera[], goluri: readonly number[], f: (vechi: number) => number): SpatiuLitera[] {
  const m = new Map(spatieri.map((s) => [s.dupa, s.mm]));
  for (const g of goluri) {
    const v = Math.max(-LIMITE_TEXT.spatiere, Math.min(LIMITE_TEXT.spatiere, Math.round(f(m.get(g) ?? 0) * 1000) / 1000));
    if (v === 0) m.delete(g);
    else m.set(g, v);
  }
  return [...m].sort((a, b) => a[0] - b[0]).map(([dupa, mm]) => ({ dupa, mm }));
}

/**
 * Spațierile după o editare a textului (din `vechi` în `nou`): ale literelor neatinse (prefixul și sufixul comune) rămân, cele
 * din sufix mutate cu diferența de lungime; ale literelor șterse sau înlocuite pleacă.
 */
export function dupaEditare(vechi: string, nou: string, spatieri: readonly SpatiuLitera[]): SpatiuLitera[] {
  const a = Array.from(vechi.replace(/\r/g, '')), b = Array.from(nou.replace(/\r/g, ''));
  let p = 0;
  while (p < a.length && p < b.length && a[p] === b[p]) p++;
  let s = 0;
  while (s < a.length - p && s < b.length - p && a[a.length - 1 - s] === b[b.length - 1 - s]) s++;
  const d = b.length - a.length;
  const rez: SpatiuLitera[] = [];
  for (const x of spatieri) {
    // Golul `i` ține de caracterele i și i + 1: amândouă în prefixul neatins, sau amândouă în sufixul neatins.
    if (x.dupa + 1 < p) rez.push(x);
    else if (x.dupa >= a.length - s) rez.push({ dupa: x.dupa + d, mm: x.mm });
  }
  return rez.filter((x) => x.dupa >= 0 && x.dupa + 1 < b.length);
}
