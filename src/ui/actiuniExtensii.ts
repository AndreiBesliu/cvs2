import type { Actiune } from './actiuni.ts';

/**
 * Acțiunile extensiilor din barele aplicației (ADR 0166 §B): „Trimite la <extensie>”, în bara selecției și în paletă, doar
 * cât e deschisă o extensie cu permisiunea `forme`. Nu ating documentul: formele selecției pleacă spre extensie, iar
 * fereastra ei se arată; calculul lor (`src/extensii/formeSelectie.ts`) vine la cerere, de la aplicație.
 *
 * „Biblioteca extensiilor” (ADR 0231 §B.6): doar în paletă; fereastra ei vine la cerere, cu modulul extensiilor.
 */
export type ContextExtensii = {
  /** Extensia deschisă care primește forme, cu numele ei, sau null. */
  readonly extensieForme: () => { readonly nume: string } | null;
  readonly selectie: () => readonly string[];
  readonly trimiteSelectia: () => void;
  /** Fereastra „Biblioteca extensiilor” (ADR 0231 §B.6): din paleta de comenzi, de oriunde. */
  readonly deschideBiblioteca: () => void;
};

export const ACTIUNI_EXTENSII: readonly Actiune<ContextExtensii>[] = [{
  id: 'extensii.trimite-selectia',
  eticheta: 'actiune.trimite-la-extensie',
  capabilitate: 'desen',
  activa: (ctx) => (ctx.extensieForme() === null ? 'motiv.fara-extensie-forme' : ctx.selectie().length === 0 ? 'motiv.nimic-ales' : true),
  ruleaza: (ctx) => { ctx.trimiteSelectia(); },
}, {
  id: 'extensii.biblioteca',
  eticheta: 'actiune.biblioteca-extensii',
  capabilitate: 'desen',
  activa: () => true,
  ruleaza: (ctx) => { ctx.deschideBiblioteca(); },
}];
