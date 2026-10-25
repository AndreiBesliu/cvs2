/**
 * Testul pas cu pas al owner-ului (ADR 0072): forma fișierelor pe care build-ul le scrie în `dist/tutorial/` (generatorul:
 * `scripts/tutorial.ts`, din `docs/tutorial/<id>.md`) și pe care panoul testului le cere la deschidere. Doar online, ca
 * pagina `/admin`: testul există doar pe instanța de test (`shared/precache.ts`).
 */

/** Rădăcina fișierelor generate, în `dist/` și pe hosting. */
export const DIR_TUTORIAL = 'tutorial';
/** Testele scrise (`docs/tutorial/<id>.md`); panoul îl deschide pe primul. */
export const TUTORIALE = ['unelte-desen'] as const;
export type IdTutorial = (typeof TUTORIALE)[number];
/** Fișierul unui test (calea din `dist/`, fără `/` în față). */
export const fisierTutorial = (id: IdTutorial): string => `${DIR_TUTORIAL}/${id}.json`;

export interface PasTutorial {
  /** Unic în test (`d-cerc`): cheia rezultatelor și a pozelor. */
  readonly id: string;
  readonly titlu: string;
  /** Ce face omul și ce trebuie să vadă (markdown inline). */
  readonly faci: string;
  readonly vezi: string;
}

export interface Tutorial {
  readonly schema: 1;
  readonly id: IdTutorial;
  readonly titlu: string;
  /** Cum se lucrează cu testul (markdown inline). */
  readonly intro: string;
  readonly sectiuni: ReadonlyArray<{ readonly titlu: string; readonly pasi: readonly PasTutorial[] }>;
}

const sir = (x: unknown): x is string => typeof x === 'string' && x.length > 0;

/** Verificarea formei, la citirea din rețea (un fișier vechi, trunchiat sau al altei versiuni nu trece). */
export function esteTutorial(x: unknown): x is Tutorial {
  if (typeof x !== 'object' || x === null) return false;
  const t = x as Record<string, unknown>;
  if (t['schema'] !== 1 || !(TUTORIALE as readonly unknown[]).includes(t['id']) || !sir(t['titlu']) || typeof t['intro'] !== 'string') return false;
  const s = t['sectiuni'];
  return Array.isArray(s) && s.length > 0 && s.every((x: unknown) => {
    const k = x as Record<string, unknown> | null;
    return k !== null && typeof k === 'object' && sir(k['titlu']) && Array.isArray(k['pasi']) && k['pasi'].length > 0
      && k['pasi'].every((p: unknown) => {
        const q = p as Record<string, unknown> | null;
        return q !== null && typeof q === 'object' && sir(q['id']) && sir(q['titlu']) && sir(q['faci']) && sir(q['vezi']);
      });
  });
}
