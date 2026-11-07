import type { Actiune } from './actiuni.ts';

/**
 * Acțiunile vederii (prototipul B, „pânza întâi”): paleta de comenzi, panourile, tema și „arată toată foaia”. Limba
 * rămâne la butoanele RO / EN din bară.
 * Nu ating documentul; trec totuși prin registru, ca bara, tastatura și paleta să fie vederi ale aceluiași registru.
 */
export type ContextVedere = {
  readonly [K in 'paleta' | 'lista' | 'proprietati' | 'proiectare' | 'masina' | 'potriveste' | 'tema' | 'traseu' | 'foaia-anterioara' | 'foaia-urmatoare']: () => void
};

const vedere = (ce: keyof ContextVedere): Actiune<ContextVedere> => ({
  id: `vedere.${ce}`,
  eticheta: `vedere.${ce}`,
  capabilitate: 'desen',
  activa: () => true,
  ruleaza: (ctx) => { ctx[ce](); },
});

// `traseu`: „Arată traseul” (ADR 0038 §2), un comutator al vederii; calculul îl pornește aplicația, la cerere.
// `proiectare`, `masina`: filele ferestrelor din meniul global (ADR 0132): desenul, și mașina pe tot ecranul (conexiunea,
// programul, lucrarea; ADR 0081), al cărei conținut vine la prima deschidere.
// `foaia-anterioara`, `foaia-urmatoare` (ADR 0210 §1): foaia activă a ferestrei, după lista foilor (PgUp / PgDn); la capăt,
// nimic. Foaia activă e o vedere, deci nu e o comandă a documentului.
export const ACTIUNI_VEDERE: readonly Actiune<ContextVedere>[] = ([
  'paleta', 'lista', 'proprietati', 'proiectare', 'masina', 'potriveste', 'tema', 'traseu', 'foaia-anterioara', 'foaia-urmatoare',
] as const).map(vedere);
