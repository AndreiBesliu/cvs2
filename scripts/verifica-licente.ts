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
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { licentaDin, licentaPermisa } from './licente.ts';

type Intrare = {
  readonly version?: string;
  readonly license?: string;
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly optionalDependencies?: Readonly<Record<string, string>>;
};
type Lockfile = { readonly packages: Readonly<Record<string, Intrare>> };

/**
 * Arborele de rulare al unui lockfile: aplicația (`package-lock.json`) și funcțiile din cloud
 * (`functions/package-lock.json`, ADR 0039), fiecare cu dependențele lui de rulare.
 */
function verifica(fisier: string): { refuzate: number; lipsa: number; total: number } {
const lock = JSON.parse(readFileSync(fisier, 'utf8')) as Lockfile;
const radacina = lock.packages[''];
if (!radacina) throw new Error(`${fisier} fără pachetul rădăcină`);

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
  // npm copiază în lockfile doar forma nouă (`license`); un pachet vechi (`licenses: [...]`, de ex. `limiter`) se
  // citește din `package.json`-ul instalat, cu aceeași funcție ca restul.
  const instalat = join(dirname(fisier), cale, 'package.json');
  const licenta = p.license ?? (existsSync(instalat) ? licentaDin(JSON.parse(readFileSync(instalat, 'utf8')) as object) : undefined);
  const ok = licentaPermisa(licenta);
  if (!ok) refuzate++;
  console.log(`  ${ok ? '✓' : '✗'} ${cale.replace(/^node_modules\//, '')}@${p.version ?? '?'}: ${licenta ?? '(lipsă)'}`);
}
for (const l of lipsa) console.error(`  ✗ lipsește din ${fisier}: ${l}`);
return { refuzate, lipsa: lipsa.length, total: vizitate.size };
}

let problema = false;
for (const fisier of ['package-lock.json', 'functions/package-lock.json']) {
  console.log(fisier);
  const r = verifica(fisier);
  if (r.refuzate || r.lipsa) {
    console.error(`Licențe (${fisier}): ${r.refuzate} în afara listei albe, ${r.lipsa} nerezolvate.`);
    problema = true;
  } else {
    console.log(`Licențe (${fisier}): ${r.total} dependențe de rulare, toate pe lista albă.`);
  }
}
if (problema) process.exit(1);
