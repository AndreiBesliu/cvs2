/** Ce cere meniul extensiilor ferestrelor instalării (ADR 0127 §B): un fișier ales, o adresă (scrisă sau din link), gestionarea. */
export type CerereInstalare =
  | { readonly fel: 'fisier'; readonly fisier: File }
  | { readonly fel: 'adresa'; readonly adresa: string; readonly dinLink: boolean }
  | { readonly fel: 'gestioneaza' };
