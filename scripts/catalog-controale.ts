/**
 * Catalogul controalelor editorului (ADR 0262, felia A.8c): numele `prefix.valoare` ale controalelor (`numeControl.ts`),
 * scoase din sursă, doar din valorile scrise de mână ale atributelor de nume (`data-testid="export-gcode"`), nu din cele
 * calculate (`data-testid={…}`). Un clic pleacă doar cu un nume de aici (sau din registru, `DIN_COD`), deci un atribut făcut
 * din textul omului nu pleacă niciodată. Doar editorul (fără `src/admin/`, unde nu se înregistrează nimic).
 *
 *   node scripts/catalog-controale.ts            # verifică: catalogul din `src/app/catalogControale.ts` e cel din sursă
 *   node scripts/catalog-controale.ts --scrie    # îl scrie din nou
 *
 * Proba `test/unit/utilizare.catalog.test.ts` cade până când catalogul e scris din nou după o schimbare a sursei.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { DIN_COD, NUMIRE, numeDin } from '../src/app/numeControl.ts';

const RADACINA = join(import.meta.dirname, '..');
export const FISIER_CATALOG = join(RADACINA, 'src', 'app', 'catalogControale.ts');

function fisiere(dosar: string): string[] {
  return readdirSync(dosar, { withFileTypes: true }).flatMap((f) => {
    const cale = join(dosar, f.name);
    if (f.isDirectory()) return relative(RADACINA, cale).split(sep).join('/') === 'src/admin' ? [] : fisiere(cale);
    return f.name.endsWith('.tsx') ? [cale] : [];
  });
}

const escapa = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Etichetele HTML pe care un clic e al unui control. */
const ETICHETE_CONTROL = new Set(['button', 'a', 'input', 'select', 'textarea', 'summary']);
const RE_ROL = /\brole="(button|menuitem|menuitemcheckbox|menuitemradio|tab|option|checkbox|radio|switch|slider|dialog)"/;

/**
 * Atributul de la `poz` stă pe un control sau pe o fereastră? Eticheta care îl deschide e un control HTML, are un rol
 * interactiv sau de dialog (căutat în eticheta deschisă până la atribut și puțin după), ori e o componentă (literă mare:
 * își poate da mai departe atributele). Aproximativ: o etichetă scăpată doar nu se înregistrează.
 */
function peControl(text: string, poz: number): boolean {
  const inceput = text.lastIndexOf('<', poz);
  if (inceput < 0) return false;
  const eticheta = /^<([A-Za-z][\w.]*)/.exec(text.slice(inceput))?.[1] ?? '';
  if (/^[A-Z]/.test(eticheta) || ETICHETE_CONTROL.has(eticheta)) return true;
  return RE_ROL.test(text.slice(inceput, poz + 300));
}

/**
 * Numele controalelor din sursă, sortate: valorile scrise de mână ale atributelor de nume (fără cele din cod), de pe controale
 * și ferestre (`peControl`).
 */
export function catalogDinSursa(): string[] {
  const nume = new Set<string>();
  const reguli = NUMIRE.filter(([, p]) => !DIN_COD.has(p)).map(([a, p]) => ({ re: new RegExp(`(?<![\\w-])${escapa(a)}="([^"{}]*)"`, 'g'), p }));
  for (const f of fisiere(join(RADACINA, 'src')).sort()) {
    const text = readFileSync(f, 'utf8');
    for (const { re, p } of reguli) {
      for (const m of text.matchAll(re)) {
        const n = numeDin(p, m[1] ?? '');
        if (n !== null && peControl(text, m.index)) nume.add(n);
      }
    }
  }
  return [...nume].sort();
}

/** Textul fișierului generat. */
export function textCatalog(nume: readonly string[]): string {
  return `// Generat de \`node scripts/catalog-controale.ts --scrie\` (ADR 0262, felia A.8c): numele controalelor editorului, din
// valorile scrise de mână în sursă ale atributelor de nume (\`src/app/numeControl.ts\`). Nu se scrie de mână.
export const CATALOG_CONTROALE: ReadonlySet<string> = new Set(
  '${nume.join(' ')}'.split(' '),
);
`;
}

if (import.meta.main) {
  const asteptat = textCatalog(catalogDinSursa());
  if (process.argv.includes('--scrie')) {
    writeFileSync(FISIER_CATALOG, asteptat);
    console.log(`catalogul controalelor: ${catalogDinSursa().length} de nume, scris în ${relative(RADACINA, FISIER_CATALOG)}`);
  } else if (readFileSync(FISIER_CATALOG, 'utf8') !== asteptat) {
    console.error('catalogul controalelor nu mai e cel din sursă: node scripts/catalog-controale.ts --scrie');
    process.exit(1);
  } else {
    console.log('catalogul controalelor e la zi');
  }
}
