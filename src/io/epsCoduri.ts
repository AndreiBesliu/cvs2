/**
 * Codurile ușii EPS și AI ≤ 8 (ADR 0115), fără nicio dependență: interfața le citește fără să încarce ușa, care vine la
 * cerere, la primul import.
 *
 * Refuzurile:
 * - `nu-e-ps`: fișierul nu începe cu `%!` (nici după antetul binar al unui EPS DOS, cu previzualizarea lui);
 * - `ai-nou`: un EPS salvat de Illustrator 9 sau mai nou: desenul lui trece prin procedurile Adobe, cu condiții și bucle
 *   (salvat ca AI, e un PDF și îl citește ușa PDF);
 * - `control`: o buclă sau o condiție (`for`, `repeat`, `if` …): cere un interpretor adevărat; detaliul e operatorul;
 * - `operator`: un operator pe care cititorul nu-l are (de exemplu `arc`), sau un nume nedefinit; detaliul e numele;
 * - `imagine`: datele unei imagini vin din fișier într-o formă pe care cititorul n-o poate sări (binare comprimate);
 * - `ps`: fișierul e greșit (sintaxa, stiva, tipurile, recursivitatea); detaliul spune unde.
 */
export type CodRefuzEps = 'nu-e-ps' | 'ai-nou' | 'control' | 'operator' | 'imagine' | 'ps';

/**
 * Raportul (ADR 0115 §6), în ordinea în care îl arată dialogul; aceleași înțelesuri ca la PDF (ADR 0104 §6), plus
 * `sarit-incluse`: documentele incluse într-un AI (`%%BeginDocument`, un EPS plasat), sărite. `sarit-text` numără
 * operatorii de text (`show` și ceilalți; într-un AI, obiectele `To` … `TO`), `sarit-imagine` imaginile (`image`,
 * `imagemask`, `colorimage`; într-un AI, rasterele `XI`), `sarit-umbrire` umbririle (`shfill`), `decupaje` decupajele
 * (`clip`, `eoclip`, `rectclip`; într-un AI, `W`), `ascunse` formele de pe straturile AI oprite.
 */
export const CODURI_AVERTISMENT_EPS = [
  'deschise', 'degenerate', 'prea-mari', 'sub-rezolutie', 'sarit-text', 'sarit-imagine', 'sarit-umbrire', 'sarit-incluse',
  'decupaje', 'nepictate', 'ascunse', 'inchise-de-umplere', 'inchise-la-usa', 'nonzero-normalizate', 'nonzero-refuzate',
] as const;
export type CodAvertismentEps = (typeof CODURI_AVERTISMENT_EPS)[number];
export type AvertismenteEps = Readonly<Record<CodAvertismentEps, number>>;
