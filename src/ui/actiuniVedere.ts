import type { Actiune } from './actiuni.ts';

/**
 * Acțiunile vederii (prototipul B, „pânza întâi”): paleta de comenzi, panourile, tema și „arată toată foaia”. Limba
 * rămâne la butoanele RO / EN din bară.
 * Nu ating documentul; trec totuși prin registru, ca bara, tastatura și paleta să fie vederi ale aceluiași registru.
 */
export type ContextVedere = {
  readonly [K in 'paleta' | 'lista' | 'proprietati' | 'proiectare' | 'masina' | 'imprimanta' | 'potriveste' | 'tema' | 'traseu' | 'foaia-anterioara'
    | 'foaia-urmatoare' | 'toate-foile']: () => void
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
// programul, lucrarea; ADR 0081), al cărei conținut vine la prima deschidere; `imprimanta`: imprimanta 3D din
// rețea (ADR 0190).
// `foaia-anterioara`, `foaia-urmatoare` (ADR 0210 §1): foaia activă a ferestrei, după lista foilor (PgUp / PgDn); la capăt,
// nimic. Foaia activă e o vedere, deci nu e o comandă a documentului. `toate-foile` (felia 11.1↑b): comutatorul „Toate foile pe
// pânză” / doar foaia activă, ținut în browser; pornit, le încadrează pe toate.
export const ACTIUNI_VEDERE: readonly Actiune<ContextVedere>[] = ([
  'paleta', 'lista', 'proprietati', 'proiectare', 'masina', 'imprimanta', 'potriveste', 'tema', 'traseu', 'foaia-anterioara', 'foaia-urmatoare',
  'toate-foile',
] as const).map(vedere);
