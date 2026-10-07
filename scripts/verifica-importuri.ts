/**
 * Regulile de import (`PLAN.md` §3.3), cu capcanele lor. Trece doar dacă încălcările găsite sunt EXACT cele ale
 * capcanelor din `test/capcane/`:
 * - o încălcare în plus e o regulă călcată de cod real;
 * - o capcană lipsă e o regulă care nu mai prinde nimic, adică o plasă vidă;
 * - o regulă fără capcană (și fără motiv scris mai jos) e o regulă pe care n-o probează nimeni.
 */
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const config = require('../.dependency-cruiser.cjs') as { forbidden: ReadonlyArray<{ name: string }> };

/** Încălcările așteptate: regula și fișierul-capcană din care pornește. */
const ASTEPTATE: ReadonlyArray<readonly [string, string]> = [
  // Un ciclu se raportează o singură dată, din primul fișier al lui în ordinea citirii.
  ['fara-cicluri', 'test/capcane/ciclu/a.ts'],
  ['oracolele-fara-src', 'test/capcane/oracles/importa-src.ts'],
  ['geom-izolat', 'test/capcane/geom/importa-app.ts'],
  ['i18n-izolat', 'test/capcane/i18n/importa-app.ts'],
  ['shared-izolat', 'test/capcane/shared/importa-src.ts'],
  ['model-doar-geom', 'test/capcane/model/importa-app.ts'],
  ['cam-fara-post-sim-masina-interfata', 'test/capcane/cam/importa-ui.ts'],
  ['post-doar-ir', 'test/capcane/post/importa-app.ts'],
  ['sim-doar-ir', 'test/capcane/sim/importa-app.ts'],
  ['functiile-doar-shared', 'test/capcane/functions/importa-src.ts'],
  ['masina-fara-post-si-document', 'test/capcane/machine/importa-geom.ts'],
  ['cavalier-doar-prin-fatada', 'test/capcane/geom/importa-cavalier.ts'],
];

/** Regulile care încă n-au capcană, fiecare cu motivul. Lista trebuie să se golească. */
const FARA_CAPCANA: Readonly<Record<string, string>> = {};

type Raport = {
  summary: {
    totalCruised: number;
    violations: ReadonlyArray<{ from: string; to: string; rule: { name: string } }>;
  };
};

// Pachetul nu-și exportă binarul, deci calea e cea din `node_modules`.
const bin = fileURLToPath(new URL('../node_modules/dependency-cruiser/bin/dependency-cruiser.mjs', import.meta.url));
let iesire: string;
try {
  iesire = execFileSync(process.execPath, [bin, 'src', 'test', 'shared', 'scripts', '--config', '.dependency-cruiser.cjs', '--output-type', 'json'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
} catch (e) {
  // Cu încălcări de severitate „error”, depcruise iese cu cod nenul; raportul JSON e tot pe stdout.
  const stdout = (e as { stdout?: string }).stdout;
  if (!stdout) throw e;
  iesire = stdout;
}

const raport = JSON.parse(iesire) as Raport;
const cheie = (regula: string, din: string): string => `${regula} ← ${din}`;
const gasite = new Set(raport.summary.violations.map((v) => cheie(v.rule.name, v.from)));
const asteptate = new Set(ASTEPTATE.map(([r, d]) => cheie(r, d)));

const probleme: string[] = [];
for (const g of gasite) if (!asteptate.has(g)) probleme.push(`încălcare reală (nu e capcană): ${g}`);
for (const a of asteptate) if (!gasite.has(a)) probleme.push(`capcana nu mai e prinsă, deci regula e vidă: ${a}`);

const cuCapcana = new Set(ASTEPTATE.map(([r]) => r));
for (const { name } of config.forbidden) {
  if (!cuCapcana.has(name) && !(name in FARA_CAPCANA)) probleme.push(`regula „${name}” n-are capcană și nici motiv`);
}
for (const name of Object.keys(FARA_CAPCANA)) {
  if (cuCapcana.has(name)) probleme.push(`regula „${name}” are acum capcană: scoate-o din FARA_CAPCANA`);
}

const module = raport.summary.totalCruised;
if (module < 10) probleme.push(`depcruise a citit doar ${module} module: parserul nu vede TypeScript-ul?`);

if (probleme.length) {
  console.error(`Regulile de import: ${probleme.length} probleme`);
  for (const p of probleme) console.error(`  ✗ ${p}`);
  process.exit(1);
}
console.log(`Regulile de import: ${config.forbidden.length} reguli, ${asteptate.size} capcane prinse, 0 încălcări reale (${module} module citite).`);
for (const [nume, motiv] of Object.entries(FARA_CAPCANA)) console.log(`  ! „${nume}” fără capcană încă: ${motiv}`);
