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
  ['Ctrl+G', 'document.grupeaza'],
  ['Ctrl+Shift+G', 'document.degrupeaza'],
  ['Delete', 'document.sterge-selectia'],
  ['Ctrl+K', 'vedere.paleta'],
  ['Home', 'vedere.potriveste'],
  ['T', 'vedere.traseu'],
  // Foaia activă (ADR 0210 §1): fără Ctrl, fiindcă Ctrl + PgUp / PgDn schimbă filele browserului.
  ['PageUp', 'vedere.foaia-anterioara'],
  ['PageDown', 'vedere.foaia-urmatoare'],
];

/** Tastele care se citesc cu modificatorii lor, deși nu sunt un caracter: Ctrl + PgUp / PgDn sunt ale browserului (ADR 0210 §1). */
const CU_MODIFICATORI: ReadonlySet<string> = new Set(['PageUp', 'PageDown']);

/**
 * Tasta apăsată, scrisă ca în tabel. Modificatorii contează la tastele cu un caracter (litere, cifre) și la PgUp / PgDn:
 * Delete și Home rămân ele însele cu orice modificator, ca înainte (Ctrl pe Windows și ⌘ pe Mac sunt același „Ctrl”).
 */
export function tastaApasata(e: { readonly key: string; readonly ctrlKey: boolean; readonly metaKey: boolean; readonly shiftKey: boolean }): string {
  if (CU_MODIFICATORI.has(e.key)) return `${e.ctrlKey || e.metaKey ? 'Ctrl+' : ''}${e.shiftKey ? 'Shift+' : ''}${e.key}`;
  if (e.key.length !== 1) return e.key;
  return `${e.ctrlKey || e.metaKey ? 'Ctrl+' : ''}${e.shiftKey ? 'Shift+' : ''}${e.key.toUpperCase()}`;
}

/** Acțiunea unei taste, dacă are una. */
export const actiuneaTastei = (tasta: string): string | undefined => TASTE.find(([k]) => k === tasta)?.[1];

/** Tasta arătată pentru o acțiune (prima din tabel), dacă are una. */
export const tastaActiunii = (id: string): string | undefined => TASTE.find(([, a]) => a === id)?.[0];
