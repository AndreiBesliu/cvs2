/**
 * Ordinea tăierii în fereastra exportului (ADR 0133 §3), pură: ordinea de la deschidere, mutările, rândurile legate și
 * riscul unei ordini de mână. Un rând e o operație a unei piese, cu cheia `<piesă>/<operație>`. Ordinea programului însuși e
 * a lucrării (`ordineTaieturi`); aici e doar lista pe care o vede și o mută omul.
 */

/**
 * Ce îi trebuie ordinii despre un rând: piesa, latura, despărțirea, valorile care unesc un V-carve (null pe alt fel) și
 * rândurile altor piese din interiorul formelor lui (`cuprinse`, `src/model/ordine.ts`).
 */
export type RandOrdine = {
  readonly piesa: string;
  readonly latura: 'exterior' | 'interior' | 'pe-linie' | 'stanga' | 'dreapta';
  readonly despartire: boolean;
  readonly vcarve: string | null;
  readonly inauntru?: readonly string[];
};

/** Ordinea automată, completă: cea a lucrării (`automata`), apoi rândurile care n-au tăieturi pe foaie, în ordinea listei. */
export function ordineAutomata(automata: readonly string[], chei: readonly string[]): string[] {
  const are = new Set(chei);
  const rez = automata.filter((c) => are.has(c));
  const puse = new Set(rez);
  return [...rez, ...chei.filter((c) => !puse.has(c))];
}

/**
 * Ordinea omului scrisă în document (rangurile, ADR 0133 §1), sau null dacă niciun rând n-are rang (ordinea automată). Pe
 * ranguri egale și între rândurile fără rang (la capăt) rămâne ordinea automată.
 */
export function ordineDinRanguri(automata: readonly string[], ranguri: ReadonlyMap<string, number>): string[] | null {
  if (ranguri.size === 0) return null;
  const loc = (c: string): number => ranguri.get(c) ?? Number.POSITIVE_INFINITY;
  return automata.map((c, i) => ({ c, i })).sort((a, b) => (loc(a.c) === loc(b.c) ? a.i - b.i : loc(a.c) < loc(b.c) ? -1 : 1)).map((x) => x.c);
}

/** Lista cu rândul de pe locul `de` mutat pe locul `la` (indicii listei, de la 0). */
export function muta(ordine: readonly string[], de: number, la: number): string[] {
  if (de < 0 || de >= ordine.length || la < 0 || la >= ordine.length || de === la) return [...ordine];
  const rez = [...ordine];
  const [x] = rez.splice(de, 1);
  rez.splice(la, 0, x as string);
  return rez;
}

/**
 * Rândurile legate (ADR 0133 §2): V-carve-urile aceleiași piese, cu aceleași valori, se sapă ca o singură regiune, la primul
 * dintre ele din ordine. Fiecare rând de după primul primește locul acestuia (1 … n).
 */
export function legaturi(ordine: readonly string[], randuri: ReadonlyMap<string, RandOrdine>): Map<string, number> {
  const primul = new Map<string, number>();
  const rez = new Map<string, number>();
  ordine.forEach((c, i) => {
    const r = randuri.get(c);
    if (!r || r.vcarve === null) return;
    const k = `${r.piesa}\n${r.vcarve}`;
    const p = primul.get(k);
    if (p === undefined) primul.set(k, i + 1);
    else rez.set(c, p);
  });
  return rez;
}

/** Un risc al ordinii omului: rândul de pe locul `a` se taie înaintea celui de pe locul `b` (locurile de la 1). */
export type RiscOrdine = { readonly fel: 'exterior' | 'despartire'; readonly a: number; readonly b: number };

/**
 * Riscurile ordinii omului (ADR 0133 §3), câte unul pe piesa exteriorului și unul pe foaie:
 * - `exterior`: exteriorul unei piese vine înaintea altei operații (interior, linie, buzunar, V-carve, găurire) a aceleiași
 *   piese sau din interiorul ei (`inauntru`); piesa se poate desprinde înainte să fie gata;
 * - `despartire`: o despărțire a foii vine înaintea unei operații care nu e despărțire.
 */
export function riscuri(ordine: readonly string[], randuri: ReadonlyMap<string, RandOrdine>): RiscOrdine[] {
  const rez: RiscOrdine[] = [];
  // Locul primului exterior tăiat al fiecărei piese și, pentru fiecare rând din interiorul unui exterior tăiat, piesa și locul lui.
  const exterior = new Map<string, number>();
  const cuprinsDe = new Map<string, Array<{ readonly piesa: string; readonly loc: number }>>();
  const spuse = new Set<string>();
  let despartire: number | null = null;
  let despartireSpusa = false;
  ordine.forEach((c, i) => {
    const r = randuri.get(c);
    if (!r) return;
    const loc = i + 1;
    if (despartire !== null && !r.despartire && !despartireSpusa) {
      rez.push({ fel: 'despartire', a: despartire, b: loc });
      despartireSpusa = true;
    }
    if (r.despartire) {
      despartire ??= loc;
      return;
    }
    if (r.latura === 'exterior') {
      if (!exterior.has(r.piesa)) exterior.set(r.piesa, loc);
      for (const k of r.inauntru ?? []) cuprinsDe.set(k, [...(cuprinsDe.get(k) ?? []), { piesa: r.piesa, loc }]);
      return;
    }
    const aceeasi = exterior.get(r.piesa);
    for (const s of [...(aceeasi !== undefined ? [{ piesa: r.piesa, loc: aceeasi }] : []), ...(cuprinsDe.get(c) ?? [])]) {
      if (spuse.has(s.piesa)) continue;
      rez.push({ fel: 'exterior', a: s.loc, b: loc });
      spuse.add(s.piesa);
    }
  });
  return rez;
}
