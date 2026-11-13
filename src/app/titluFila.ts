/**
 * Titlul filei browserului, din părțile ferestrelor care lucrează, în ordinea lor, înaintea titlului paginii: mașina CNC
 * (ADR 0132 §5, `IndicatorLucrare`) și imprimanta (ADR 0194 §A.4). „45 % · CNC Vector Studio”; cu amândouă, „45 % · Pauză
 * 12 % · CNC Vector Studio”; fără nicio parte, titlul paginii. Fiecare fereastră își pune doar partea ei, deci nu-și șterg
 * una alteia titlul.
 */
const TITLU = typeof document === 'undefined' ? '' : document.title;
const ORDINE = ['masina', 'imprimanta'] as const;
export type SursaTitlu = (typeof ORDINE)[number];
const parti: Partial<Record<SursaTitlu, string>> = {};

/** Pune (sau scoate, cu null) partea unei ferestre și refă titlul. */
export function parteTitlu(sursa: SursaTitlu, text: string | null): void {
  if (text === null || text === '') delete parti[sursa];
  else parti[sursa] = text;
  if (typeof document === 'undefined') return;
  document.title = [...ORDINE.flatMap((s) => (parti[s] === undefined ? [] : [parti[s]])), TITLU].join(' · ');
}
