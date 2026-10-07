/**
 * Aplică lista albă (`licente.ts`) pe dependențele de RULARE: închiderea dependențelor din `dependencies` ale aplicației,
 * urmată în `package-lock.json`. O licență GPL / AGPL / LGPL, una necunoscută sau una lipsă face CI-ul roșu
 * (`PLAN.md` §4.4).
 *
 * De ce lanțul și nu marcajul `dev` din lockfile: npm nu marchează ca `dev` binarele opționale ale unei dependențe de
 * dezvoltare (TypeScript 7 aduce 20), deci un filtru după marcaj le-ar număra drept cod livrat.
 *
 * Limita: se citește ce declară pachetul. Un pachet care declară greșit (s12: `dwg2dxf` declară ISC, dar e GPL) trece
 * de aici; de aceea, o dependență nouă de rulare se citește și de mână înainte să intre.
 */
import { readFileSync } from 'node:fs';
import { licentaPermisa } from './licente.ts';

type Intrare = {
  readonly version?: string;
  readonly license?: string;
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly optionalDependencies?: Readonly<Record<string, string>>;
};
type Lockfile = { readonly packages: Readonly<Record<string, Intrare>> };

const lock = JSON.parse(readFileSync('package-lock.json', 'utf8')) as Lockfile;
const radacina = lock.packages[''];
if (!radacina) throw new Error('package-lock.json fără pachetul rădăcină');

/** Unde a pus npm pachetul `nume` cerut de pachetul de la `cale`: întâi imbricat, apoi urcând spre rădăcină. */
function rezolva(cale: string, nume: string): string | undefined {
  let baza = cale;
  for (;;) {
    const candidat = `${baza ? `${baza}/` : ''}node_modules/${nume}`;
    if (lock.packages[candidat]) return candidat;
    if (!baza) return undefined;
    const i = baza.lastIndexOf('/node_modules/');
    baza = i < 0 ? '' : baza.slice(0, i);
  }
}

const vizitate = new Map<string, Intrare>();
const coada: Array<[string, string]> = Object.keys(radacina.dependencies ?? {}).map((n) => ['', n]);
const lipsa: string[] = [];
while (coada.length) {
  const [parinte, nume] = coada.shift() ?? ['', ''];
  const cale = rezolva(parinte, nume);
  if (!cale) {
    lipsa.push(`${nume} (cerut de ${parinte || 'aplicație'})`);
    continue;
  }
  if (vizitate.has(cale)) continue;
  const intrare = lock.packages[cale] ?? {};
  vizitate.set(cale, intrare);
  for (const n of Object.keys({ ...intrare.dependencies, ...intrare.optionalDependencies })) coada.push([cale, n]);
}

let refuzate = 0;
for (const [cale, p] of vizitate) {
  const ok = licentaPermisa(p.license);
  if (!ok) refuzate++;
  console.log(`  ${ok ? '✓' : '✗'} ${cale.replace(/^node_modules\//, '')}@${p.version ?? '?'}: ${p.license ?? '(lipsă)'}`);
}
for (const l of lipsa) console.error(`  ✗ lipsește din lockfile: ${l}`);
if (refuzate || lipsa.length) {
  console.error(`Licențe: ${refuzate} în afara listei albe, ${lipsa.length} nerezolvate.`);
  process.exit(1);
}
console.log(`Licențe: ${vizitate.size} dependențe de rulare, toate pe lista albă.`);
