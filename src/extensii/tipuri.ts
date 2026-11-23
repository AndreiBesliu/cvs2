import type { RandBiblioteca } from '../../shared/biblioteca.ts';

/**
 * Ce cere meniul extensiilor ferestrelor lui, aduse la cerere (ADR 0127 §B, ADR 0231):
 * - un fișier ales sau o adresă (scrisă sau din link): fereastra de confirmare a unui pachet din afara bibliotecii;
 * - un rând al bibliotecii: confirmarea unei versiuni care cere ceva în plus (din meniu sau din pagina extensiei);
 * - fereastra „Biblioteca extensiilor”, eventual deschisă pe o extensie anume (aleasă de linkul `#biblioteca=<id>`).
 */
export type CerereInstalare =
  | { readonly fel: 'fisier'; readonly fisier: File }
  | { readonly fel: 'adresa'; readonly adresa: string; readonly dinLink: boolean }
  | { readonly fel: 'biblioteca'; readonly id: string; readonly rand: RandBiblioteca; readonly dinLink: boolean }
  | { readonly fel: 'fereastra'; readonly id: string | null; readonly dinLink: boolean };
