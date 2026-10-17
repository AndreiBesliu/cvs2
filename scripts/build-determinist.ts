/**
 * Build-ul determinist: două build-uri ale aceluiași arbore trebuie să iasă identice, octet cu octet. Apoi, bugetul de
 * mărime: JavaScript-ul aplicației, comprimat gzip, nu trece de plafon fără o decizie scrisă aici.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

/**
 * Plafoanele JavaScript-ului comprimat, în kB:
 * - la pornire, ce cere `index.html` (scriptul de intrare și `modulepreload`): măsurat 81 kB la felia 1.9c (React +
 *   valibot + aplicația; calculul exportului se încarcă la cerere); din 17.10, plus dicționarul limbii active, cerut
 *   înaintea primei randări la fiecare pornire (99,1 kB înainte de „loc în pachetul de pornire”);
 * - totalul, cu bucățile încărcate la cerere (exportul: cavalier + CAM + post, ~23 kB) și workerul;
 * - pagina `/admin` (ADR 0040, decizia din 16.10): bucata ei (`PaginaAdmin-*`, cu Firebase: contul, Firestore, funcțiile,
 *   App Check; 170 kB la felia 3.3) are plafonul ei și nu intră în totalul aplicației, fiindcă aplicația n-o descarcă
 *   niciodată. Firebase-ul pe care îl va aduce raportorul de erori (3.2) intră în total: îl descarcă oricine are o eroare.
 */
const PLAFON_PORNIRE_KB = 100;
const PLAFON_TOTAL_KB = 300;
const PLAFON_ADMIN_KB = 200;
/**
 * Ușa de încărcare a proiectului vine înaintea primei randări pentru oricine are un proiect salvat (proiectLocal): are
 * plafonul ei, iar pornirea plus ușa nu trec de plafonul pornirii. Altfel codul mutat din pornire în ușă ar ocoli poarta
 * (recenzia felii „loc în pachetul de pornire”, 17.10: 92,3 + 4,6 kB).
 */
const PLAFON_USA_KB = 8;
const BUCATA_ADMIN = /^assets\/PaginaAdmin-[^/]+\.js$/;

function fisiere(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? fisiere(p) : [p];
  });
}

function amprenta(dir: string): Map<string, string> {
  return new Map(fisiere(dir).map((p) => [
    relative(dir, p).replace(/\\/g, '/'),
    createHash('sha256').update(readFileSync(p)).digest('hex'),
  ]));
}

/** Vite rulat direct prin Node, fără shell: argumentele ajung neatinse, pe orice platformă. */
const VITE = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url));

function construieste(outDir: string): Map<string, string> {
  rmSync(outDir, { recursive: true, force: true });
  execFileSync(process.execPath, [VITE, 'build', '--outDir', outDir, '--emptyOutDir', '--logLevel', 'warn'], {
    stdio: 'inherit',
  });
  return amprenta(outDir);
}

const a = construieste('.tmp/build-1');
const b = construieste('.tmp/build-2');
const diferente = [...new Set([...a.keys(), ...b.keys()])].filter((f) => a.get(f) !== b.get(f));
if (diferente.length) {
  console.error(`Build-ul NU e determinist: ${diferente.length} fișiere diferă între două build-uri.`);
  for (const f of diferente) console.error(`  ✗ ${f}`);
  process.exit(1);
}

const gz = (p: string): number => gzipSync(readFileSync(p), { level: 9 }).length / 1024;
const html = readFileSync('.tmp/build-1/index.html', 'utf8');
const laPornire = new Set([...html.matchAll(/(?:src|href)="\/(assets\/[^"]+\.js)"/g)].map((m) => m[1] ?? ''));
if (laPornire.size === 0) {
  console.error('index.html nu cere niciun script: măsurătoarea pachetului de pornire ar fi vidă.');
  process.exit(1);
}
// Pornirea e o singură bucată (grupul `pornire`, `vite.config.ts`). O a doua (o bucată comună, preîncărcată) înseamnă că
// grupul nu mai prinde tot ce importă intrarea: o mutare la cerere ar adăuga atunci o cerere la pornire, nu ar scoate octeți.
if (laPornire.size !== 1) {
  console.error(`index.html cere ${laPornire.size} scripturi (${[...laPornire].join(', ')}); pornirea trebuie să fie o singură bucată.`);
  process.exit(1);
}
let pornire = 0;
let total = 0;
let admin = 0;
let bucatiAdmin = 0;
/** Fiecare bucată JavaScript (calea din `dist/`, ca în `index.html`), cu mărimea ei gzip. */
const bucati = new Map<string, number>();
for (const p of fisiere('.tmp/build-1')) {
  if (!p.endsWith('.js')) continue;
  const kb = gz(p);
  const rel = relative('.tmp/build-1', p).replace(/\\/g, '/');
  bucati.set(rel, kb);
  if (BUCATA_ADMIN.test(rel)) {
    admin += kb;
    bucatiAdmin++;
    if (laPornire.has(rel)) {
      console.error(`${rel}: pagina /admin a ajuns în pachetul de pornire.`);
      process.exit(1);
    }
    continue;
  }
  total += kb;
  if (laPornire.has(rel)) pornire += kb;
}
if (bucatiAdmin !== 1) {
  // Fără bucata ei, Firebase-ul adminului s-ar număra în altă parte (sau deloc): măsurătoarea ar minți.
  console.error(`Pagina /admin trebuie să fie exact o bucată separată (PaginaAdmin-*.js); găsite: ${bucatiAdmin}.`);
  process.exit(1);
}

const cod = (rel: string): string => readFileSync(join('.tmp/build-1', rel), 'utf8');
const bucataPornirii = [...laPornire][0] ?? '';
/** Bucata unui modul după numele ei (`assets/<nume>-<hash>.js`): exact una, altfel măsurătoarea de mai jos n-ar avea obiect. */
function bucataNumita(nume: string): string {
  const gasite = [...bucati.keys()].filter((r) => new RegExp(`^assets/${nume}-[A-Za-z0-9_-]{8}\\.js$`).test(r));
  if (gasite.length !== 1) {
    console.error(`Bucata ${nume}-*.js trebuie să existe o dată; găsite: ${gasite.length} (${gasite.join(', ')}).`);
    process.exit(1);
  }
  return gasite[0] ?? '';
}
/**
 * Ce aduce un `import()` al bucății: ea și ce importă static (`import "./x.js"`, `from "./x.js"`, nu `import("./x.js")`),
 * în afara pornirii (pornirea e deja în browser).
 */
function inchidere(rel: string): string[] {
  const vazute = new Set([rel]);
  const coada = [rel];
  for (let r = coada.shift(); r !== undefined; r = coada.shift()) {
    for (const m of cod(r).matchAll(/(?:import|from)\s*["']\.\/([^"']+\.js)["']/g)) {
      const dep = `assets/${m[1] ?? ''}`;
      if (bucati.has(dep) && !vazute.has(dep)) {
        vazute.add(dep);
        coada.push(dep);
      }
    }
  }
  return [...vazute].filter((r) => !laPornire.has(r));
}
const kbInchidere = (rel: string): number => inchidere(rel).reduce((s, r) => s + (bucati.get(r) ?? 0), 0);

/**
 * A doua plasă, pe artefact: un modul care trebuie să vină la cerere nu e în bucata de pornire. Măsurătoarea vede doar
 * cifra; un import static rămas (o schemă chemată din pornire) ar aduce modulul înapoi cu doar câteva sute de octeți în
 * plus, sub plafon. Fiecare marcaj e un text pe care îl are doar modulul acela și trebuie să existe în altă bucată
 * (altfel plasa n-ar mai vedea nimic, de exemplu după o reformulare a mesajului).
 */
const LA_CERERE: ReadonlyArray<readonly [string, string]> = [
  ['un arc cu bulge 0 n-are cerc', 'schemele documentului (src/model/schemaDocument.ts) vin cu ușa și cu fereastra exportului'],
  ['aria cere un contur închis', 'orientarea conturului (src/geom/contur.ts; pornirea importă doar conturBaza.ts) vine cu CAM-ul și offsetul'],
];
for (const [marcaj, ce] of LA_CERERE) {
  if (cod(bucataPornirii).includes(marcaj)) {
    console.error(`Bucata de pornire conține „${marcaj}”: ${ce}, nu la pornire.`);
    process.exit(1);
  }
  if (![...bucati.keys()].some((r) => r !== bucataPornirii && cod(r).includes(marcaj))) {
    console.error(`Niciun fișier al build-ului nu conține „${marcaj}”: plasa pentru ${ce} nu mai vede nimic (marcajul s-a schimbat?).`);
    process.exit(1);
  }
}
// Prețul unui proiect salvat: ușa (`incarcare`) și ce aduce ea în afara pornirii vin înaintea primei randări.
const usa = bucataNumita('incarcare');
const kbUsa = kbInchidere(usa);

/**
 * Dicționarul limbii active (`mesaje.ro` / `mesaje.en`, `t.ts`) vine la cerere, dar înaintea primei randări, la FIECARE
 * pornire: se numără în pornire (cel mai mare dintre ele, cu ce aduce el), altfel cifra ar ascunde ~2 kB. Exact două
 * bucăți de limbă: una lipsă înseamnă că dicționarul a ajuns înapoi în pornire (sau a dispărut din build), una în plus,
 * că s-a rupt în bucăți pe care poarta nu le mai vede.
 */
const LIMBI_BUILD = ['mesaje.ro', 'mesaje.en'];
const bucatiLimba = [...bucati.keys()].filter((r) => /^assets\/mesaje\.[^/]+\.js$/.test(r));
if (bucatiLimba.length !== LIMBI_BUILD.length) {
  console.error(`Build-ul trebuie să aibă exact ${LIMBI_BUILD.length} bucăți de limbă (mesaje.*.js); găsite: ${bucatiLimba.length} (${bucatiLimba.join(', ')}).`);
  process.exit(1);
}
const kbLimba = Math.max(...LIMBI_BUILD.map((n) => kbInchidere(bucataNumita(n))));
pornire += kbLimba;

/**
 * Alegerea cu clicul (`actiuniAlegere`) vine imediat după montare, iar un clic dat înainte o așteaptă: ce aduce ea în
 * afara pornirii rămâne mic (distanța la contur, ~1,8 kB la 17.10). Dacă bucata ei ajunge să împartă o bucată mare (de
 * exemplu offsetul, care folosește și el distanța), primul clic ar aștepta-o: atunci regula din `vite.config.ts`.
 */
const PLAFON_ALEGERE_KB = 3;
const alegere = bucataNumita('actiuniAlegere');
const kbAlegere = kbInchidere(alegere);
if (kbAlegere > PLAFON_ALEGERE_KB) {
  console.error(`Alegerea cu clicul aduce ${kbAlegere.toFixed(1)} kB în afara pornirii (plafon ${PLAFON_ALEGERE_KB}): ${inchidere(alegere).join(', ')}.`);
  process.exit(1);
}
console.log(`Build determinist: ${a.size} fișiere, identice în două build-uri.`);
console.log(`JavaScript gzip la pornire: ${pornire.toFixed(1)} kB, cu dicționarul limbii active (${kbLimba.toFixed(1)} kB) (plafon ${PLAFON_PORNIRE_KB}); total: ${total.toFixed(1)} kB (plafon ${PLAFON_TOTAL_KB}); /admin: ${admin.toFixed(1)} kB (plafon ${PLAFON_ADMIN_KB}).`);
console.log(`Cu un proiect salvat, ușa vine înaintea primei randări: +${kbUsa.toFixed(1)} kB (plafon ${PLAFON_USA_KB}; cu pornirea ${(pornire + kbUsa).toFixed(1)} / ${PLAFON_PORNIRE_KB}) (${inchidere(usa).map((r) => r.replace('assets/', '')).join(', ')}).`);
rmSync('.tmp/build-1', { recursive: true, force: true });
rmSync('.tmp/build-2', { recursive: true, force: true });
if (kbUsa > PLAFON_USA_KB || pornire + kbUsa > PLAFON_PORNIRE_KB) {
  console.error(`Ușa proiectului: ${kbUsa.toFixed(1)} kB (plafon ${PLAFON_USA_KB}); pornirea cu ușa: ${(pornire + kbUsa).toFixed(1)} kB (plafon ${PLAFON_PORNIRE_KB}).`);
  process.exit(1);
}
if (pornire > PLAFON_PORNIRE_KB || total > PLAFON_TOTAL_KB || admin > PLAFON_ADMIN_KB) {
  console.error('Mărimea pachetului trece de plafon.');
  process.exit(1);
}
