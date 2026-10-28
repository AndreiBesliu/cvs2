/**
 * Codurile ușii PDF (ADR 0104), fără nicio dependență: interfața le citește fără să încarce ușa, care vine la cerere, la
 * primul import.
 *
 * Refuzurile: `nu-e-pdf` (fișierul nu începe cu `%PDF-`), `ai-vechi` (un Illustrator de dinainte de versiunea 9, sau un
 * EPS: PostScript, nu PDF), `criptat` (protejat cu parolă sau doar cu restricțiile proprietarului: conținutul e criptat),
 * `pdf` (structura nu se poate citi: nici după reconstruirea tabelului xref), `pagina` (pagina cerută nu există).
 */
export type CodRefuzPdf = 'nu-e-pdf' | 'ai-vechi' | 'criptat' | 'pdf' | 'pagina';

/**
 * Raportul (ADR 0104 §6), în ordinea în care îl arată dialogul. `deschise` numără căile deschise IMPORTATE (tăiate pe
 * linie), ca la SVG; `nepictate`: căi încheiate cu `n` fără decupaj (nici trase, nici umplute); `ascunse`: căi de pe
 * straturi oprite; `forme-adanci`: Form XObject-uri sărite (prea adânci sau care se cheamă pe ele însele);
 * `fluxuri-stricate`: fluxuri de conținut care nu s-au putut decoda (întregi sau doar până la capăt).
 */
export const CODURI_AVERTISMENT_PDF = [
  'deschise', 'degenerate', 'prea-mari', 'sub-rezolutie', 'sarit-text', 'sarit-imagine', 'sarit-umbrire', 'decupaje', 'nepictate',
  'ascunse', 'inchise-de-umplere', 'inchise-la-usa', 'nonzero-normalizate', 'nonzero-refuzate', 'forme-adanci', 'fluxuri-stricate',
  'xref-reconstruit',
] as const;
export type CodAvertismentPdf = (typeof CODURI_AVERTISMENT_PDF)[number];
export type AvertismentePdf = Readonly<Record<CodAvertismentPdf, number>>;

/** Paginile unui PDF: peste atâtea, arborele paginilor nu se mai parcurge (un fișier stricat cu cicluri sau milioane de noduri). */
export const PAGINI_MAXIME = 10_000;
