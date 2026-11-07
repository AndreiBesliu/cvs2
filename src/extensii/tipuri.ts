import type { RandBiblioteca } from '../../shared/biblioteca.ts';

/**
 * Ce cere meniul extensiilor ferestrelor instalării (ADR 0127 §B): un fișier ales, o adresă (scrisă sau din link), gestionarea,
 * sau un rând al bibliotecii (ADR 0230): ales din meniu (cu rândul) ori numit de linkul `#biblioteca=<id>` (rândul vine din
 * catalogul cerut de fereastră).
 */
export type CerereInstalare =
  | { readonly fel: 'fisier'; readonly fisier: File }
  | { readonly fel: 'adresa'; readonly adresa: string; readonly dinLink: boolean }
  | { readonly fel: 'gestioneaza' }
  | { readonly fel: 'biblioteca'; readonly id: string; readonly rand: RandBiblioteca | null; readonly dinLink: boolean };
