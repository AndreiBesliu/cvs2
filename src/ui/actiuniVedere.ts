import type { Actiune } from './actiuni.ts';

/**
 * Acțiunile vederii (prototipul B, „pânza întâi”): paleta de comenzi, panourile, tema și „arată toată foaia”. Limba
 * rămâne la butoanele RO / EN din bară.
 * Nu ating documentul; trec totuși prin registru, ca bara, tastatura și paleta să fie vederi ale aceluiași registru.
 */
export type ContextVedere = { readonly [K in 'paleta' | 'lista' | 'proprietati' | 'potriveste' | 'tema']: () => void };

const vedere = (ce: keyof ContextVedere): Actiune<ContextVedere> => ({
  id: `vedere.${ce}`,
  eticheta: `vedere.${ce}`,
  capabilitate: 'desen',
  activa: () => true,
  ruleaza: (ctx) => { ctx[ce](); },
});

export const ACTIUNI_VEDERE: readonly Actiune<ContextVedere>[] = (['paleta', 'lista', 'proprietati', 'potriveste', 'tema'] as const).map(vedere);
