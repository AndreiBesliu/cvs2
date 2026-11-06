import type { Actiune } from './actiuni.ts';

/**
 * Acțiunile extensiilor din barele aplicației (ADR 0166 §B): „Trimite la <extensie>”, în bara selecției și în paletă, doar
 * cât e deschisă o extensie cu permisiunea `forme`. Nu ating documentul: formele selecției pleacă spre extensie, iar
 * fereastra ei se arată; calculul lor (`src/extensii/formeSelectie.ts`) vine la cerere, de la aplicație.
 */
export type ContextExtensii = {
  /** Extensia deschisă care primește forme, cu numele ei, sau null. */
  readonly extensieForme: () => { readonly nume: string } | null;
  readonly selectie: () => readonly string[];
  readonly trimiteSelectia: () => void;
};

export const ACTIUNI_EXTENSII: readonly Actiune<ContextExtensii>[] = [{
  id: 'extensii.trimite-selectia',
  eticheta: 'actiune.trimite-la-extensie',
  capabilitate: 'desen',
  activa: (ctx) => (ctx.extensieForme() === null ? 'motiv.fara-extensie-forme' : ctx.selectie().length === 0 ? 'motiv.nimic-ales' : true),
  ruleaza: (ctx) => { ctx.trimiteSelectia(); },
}];
