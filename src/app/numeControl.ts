import { idBun } from '../../shared/utilizare.ts';

/**
 * Numele unui control în utilizarea aplicației (ADR 0262, felia A.8c): din atributele care îl numesc în cod, în ordinea de
 * aici, ca `prefix.valoare` (`testid.export-gcode`, `camp.cont-email`). Un nume pleacă doar dacă e în catalogul scos din
 * sursă la build (`catalogControale.ts`: valorile scrise de mână în cod), deci un atribut făcut din textul omului (un nume de
 * foaie, de font) n-are cum să plece. Excepția: atributele pe care le pune doar codul, din registrul de acțiuni și din lista
 * uneltelor (`DIN_COD`), care trec după formă: numesc controlul (deci nu ia numele altui atribut), iar clicul pe el nu pleacă,
 * fiindcă acțiunea și unealta lui se înregistrează deja (`utilizareDom.ts`). Comun generatorului (`scripts/catalog-controale.ts`)
 * și paginii.
 */

/** Atributele care numesc un control, în ordinea în care se citesc, cu prefixul numelui. */
export const NUMIRE: readonly (readonly [string, string])[] = [
  ['data-actiune', 'actiune'], ['data-context', 'actiune'], ['data-unealta', 'unealta'], ['data-testid', 'testid'],
  ['data-buton', 'buton'], ['data-camp', 'camp'], ['data-editare', 'editare'], ['data-masina', 'masina'],
  ['data-imprimanta', 'imprimanta'], ['data-taiere', 'taiere'], ['data-text', 'text'], ['data-extensii', 'extensii'],
  ['data-meniu-cont', 'meniu-cont'], ['data-meniu-foaie-articol', 'meniu-foaie'], ['data-cont', 'cont'], ['data-raport', 'raport'],
  ['data-animatie', 'animatie'], ['data-conversie', 'conversie'], ['data-simulare', 'simulare'], ['data-verificare', 'verificare'],
  ['data-retea', 'retea'], ['data-legare', 'legare'], ['data-grupare', 'grupare'], ['data-vectori', 'vectori'],
  ['data-icona', 'icona'], ['id', 'id'], ['aria-labelledby', 'eticheta'],
];

/** Prefixele ale căror valori le pune doar codul (id-urile registrului de acțiuni, uneltele): trec după formă, fără catalog. */
export const DIN_COD: ReadonlySet<string> = new Set(['actiune', 'unealta']);

/** Elementele pe care un clic e al unui control. */
export const INTERACTIV = 'button, a, input, select, textarea, summary, [role="button"], [role="menuitem"], [role="menuitemcheckbox"], '
  + '[role="menuitemradio"], [role="tab"], [role="option"], [role="checkbox"], [role="radio"], [role="switch"], [role="slider"]';

/** Pură: numele din prefix și valoare, cu litere mici și cratimă în locul a ce nu e literă, cifră, cratimă sau punct; null dacă nu e un id bun. */
export function numeDin(prefix: string, valoare: string): string | null {
  const n = `${prefix}.${valoare.toLowerCase().replace(/[^a-z0-9.-]/g, '-')}`;
  return idBun(n) ? n : null;
}

/** Pură: primul nume al elementului care e în catalog (sau vine din cod); null dacă n-are niciunul. */
export function numeControl(el: { getAttribute(a: string): string | null }, catalog: ReadonlySet<string>): string | null {
  for (const [a, p] of NUMIRE) {
    const v = el.getAttribute(a);
    if (v === null || v === '') continue;
    const n = numeDin(p, v);
    if (n !== null && (DIN_COD.has(p) || catalog.has(n))) return n;
  }
  return null;
}
