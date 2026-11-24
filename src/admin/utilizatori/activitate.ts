import { contextDin, evenimentDin, type ContextLot, type Eveniment, type LotCronologie } from '../../../shared/utilizare.ts';

/**
 * Activitatea unui om (ADR 0262 §6, felia A.11c), partea pură: răspunsul callable-ului citit din nou (ce nu are forma unui lot
 * se sare, evenimentele trec încă o dată prin lista albă), apoi loturile strânse pe sesiuni: cele mai noi întâi, fiecare cu
 * evenimentele în ordinea timpului, versiunea, cât a ținut și câte evenimente s-au aruncat.
 */

const obiect = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const nr = (x: unknown): number | null => (typeof x === 'number' && Number.isFinite(x) ? x : null);

/** Pură: o pagină a cronologiei, din răspunsul callable-ului; o formă greșită dă o pagină goală, nu o eroare. */
export function paginaDin(x: unknown): { readonly loturi: readonly LotCronologie[]; readonly maiVechi: boolean } {
  if (!obiect(x) || !Array.isArray(x['loturi'])) return { loturi: [], maiVechi: false };
  const loturi: LotCronologie[] = [];
  for (const l of x['loturi']) {
    if (!obiect(l)) continue;
    const { id, sesiune } = l;
    const n = nr(l['nr']);
    const primit = nr(l['primit']);
    const inceput = nr(l['inceput']);
    if (typeof id !== 'string' || typeof sesiune !== 'string' || n === null || primit === null || inceput === null) continue;
    const ev = Array.isArray(l['evenimente']) ? l['evenimente'] : [];
    const evenimente = ev.map((e) => evenimentDin(e, Number.MAX_SAFE_INTEGER)).filter((e): e is Eveniment => e !== null);
    loturi.push({
      id, sesiune, nr: n, primit, inceput, context: contextDin(l['context']), evenimente,
      aruncate: (nr(l['aruncate']) ?? 0) + ev.length - evenimente.length,
    });
  }
  return { loturi, maiVechi: x['maiVechi'] === true };
}

export interface SesiuneActivitate {
  readonly sesiune: string;
  /** Când a pornit pagina (ms), din primul lot al sesiunii. */
  readonly inceput: number;
  readonly context: ContextLot | null;
  readonly evenimente: readonly Eveniment[];
  /** De la primul la ultimul eveniment (ms). */
  readonly durata: number;
  readonly aruncate: number;
}

/** Pură: loturile (cele mai noi întâi, oricâte pagini) strânse pe sesiuni; o sesiune care apare în mai multe pagini e una. */
export function sesiuniDin(loturi: readonly LotCronologie[]): SesiuneActivitate[] {
  const pe = new Map<string, LotCronologie[]>();
  for (const l of loturi) pe.set(l.sesiune, [...(pe.get(l.sesiune) ?? []), l]);
  return [...pe].map(([sesiune, ale]) => {
    const ordonate = [...ale].sort((a, b) => a.nr - b.nr);
    const evenimente = ordonate.flatMap((l) => l.evenimente).sort((a, b) => a.t - b.t);
    const t0 = evenimente[0]?.t ?? 0;
    return {
      sesiune, inceput: Math.min(...ordonate.map((l) => l.inceput)), context: ordonate.at(-1)?.context ?? null, evenimente,
      durata: (evenimente.at(-1)?.t ?? t0) - t0, aruncate: ordonate.reduce((s, l) => s + l.aruncate, 0),
    };
  }).sort((a, b) => b.inceput - a.inceput);
}

/** Pură: clipa unui eveniment față de pornirea paginii, „+m:ss” (sau „+h:mm:ss”). */
export function textClipa(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h > 0 ? `+${h}:${String(m).padStart(2, '0')}:${ss}` : `+${m}:${ss}`;
}
