/**
 * Scurtăturile de tastatură, scrise o singură dată: tastatura, bara (în sfat) și paleta de comenzi le citesc de aici.
 * O tastă duce la o singură acțiune; o acțiune poate avea mai multe taste, iar prima e cea arătată.
 */
export const TASTE: ReadonlyArray<readonly [tasta: string, actiune: string]> = [
  ['Ctrl+Z', 'istoric.anuleaza'],
  ['Ctrl+Y', 'istoric.reface'],
  ['Ctrl+Shift+Z', 'istoric.reface'],
  ['Ctrl+Shift+Y', 'istoric.reface'],
  ['Ctrl+D', 'document.duplica-selectia'],
  ['Delete', 'document.sterge-selectia'],
  ['Ctrl+K', 'vedere.paleta'],
  ['Home', 'vedere.potriveste'],
  ['T', 'vedere.traseu'],
];

/**
 * Tasta apăsată, scrisă ca în tabel. Modificatorii contează doar la tastele cu un caracter (litere, cifre): Delete și
 * Home rămân ele însele cu orice modificator, ca înainte (Ctrl pe Windows și ⌘ pe Mac sunt același „Ctrl”).
 */
export function tastaApasata(e: { readonly key: string; readonly ctrlKey: boolean; readonly metaKey: boolean; readonly shiftKey: boolean }): string {
  if (e.key.length !== 1) return e.key;
  return `${e.ctrlKey || e.metaKey ? 'Ctrl+' : ''}${e.shiftKey ? 'Shift+' : ''}${e.key.toUpperCase()}`;
}

/** Acțiunea unei taste, dacă are una. */
export const actiuneaTastei = (tasta: string): string | undefined => TASTE.find(([k]) => k === tasta)?.[1];

/** Tasta arătată pentru o acțiune (prima din tabel), dacă are una. */
export const tastaActiunii = (id: string): string | undefined => TASTE.find(([, a]) => a === id)?.[0];
