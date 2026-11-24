import type { Actiune } from './actiuni.ts';

/**
 * Acțiunile vederii (prototipul B, „pânza întâi”): paleta de comenzi, panourile, tema și „arată toată foaia”. Limba
 * rămâne la butoanele RO / EN din bară.
 * Nu ating documentul; trec totuși prin registru, ca bara, tastatura și paleta să fie vederi ale aceluiași registru.
 */
export type ContextVedere = {
  readonly [K in 'paleta' | 'lista' | 'proprietati' | 'proiectare' | 'masina' | 'imprimanta' | 'potriveste' | 'tema' | 'traseu' | 'foaia-anterioara'
    | 'foaia-urmatoare' | 'toate-foile' | 'aspect' | 'freze' | 'setari']: () => void
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
// pânză” / doar foaia activă, ținut în browser; pornit, le încadrează pe toate. `aspect` (ADR 0250 §3, felia 28.1↑b): fereastra
// Aspectul (aranjamentul, tema, butoanele mari), din paletă; tot ea, din meniul contului. `freze` (ADR 0300 §3, felia 16.A↑a):
// fereastra „Frezele mele”, biblioteca de freze din browser; tot ea, din meniul contului. `setari` (ADR 0330 §6, felia
// 10.4↑a-3a): fereastra Setări (azi, secțiunea Cotele), cu Ctrl+,; tot ea, din meniul contului și din ⚙ al uneltei Cote.
export const ACTIUNI_VEDERE: readonly Actiune<ContextVedere>[] = ([
  'paleta', 'lista', 'proprietati', 'proiectare', 'masina', 'imprimanta', 'potriveste', 'tema', 'traseu', 'foaia-anterioara', 'foaia-urmatoare',
  'toate-foile', 'aspect', 'freze', 'setari',
] as const).map(vedere);
