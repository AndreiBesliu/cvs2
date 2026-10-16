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
 *   valibot + aplicația; calculul exportului se încarcă la cerere);
 * - totalul, cu bucățile încărcate la cerere (exportul: cavalier + CAM + post, ~23 kB) și workerul;
 * - pagina `/admin` (ADR 0040, decizia din 16.10): bucata ei (`PaginaAdmin-*`, cu Firebase: contul, Firestore, funcțiile,
 *   App Check; 170 kB la felia 3.3) are plafonul ei și nu intră în totalul aplicației, fiindcă aplicația n-o descarcă
 *   niciodată. Firebase-ul pe care îl va aduce raportorul de erori (3.2) intră în total: îl descarcă oricine are o eroare.
 */
const PLAFON_PORNIRE_KB = 100;
const PLAFON_TOTAL_KB = 300;
const PLAFON_ADMIN_KB = 200;
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
let pornire = 0;
let total = 0;
let admin = 0;
let bucatiAdmin = 0;
for (const p of fisiere('.tmp/build-1')) {
  if (!p.endsWith('.js')) continue;
  const kb = gz(p);
  const rel = relative('.tmp/build-1', p).replace(/\\/g, '/');
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
console.log(`Build determinist: ${a.size} fișiere, identice în două build-uri.`);
console.log(`JavaScript gzip la pornire: ${pornire.toFixed(1)} kB (plafon ${PLAFON_PORNIRE_KB}); total: ${total.toFixed(1)} kB (plafon ${PLAFON_TOTAL_KB}); /admin: ${admin.toFixed(1)} kB (plafon ${PLAFON_ADMIN_KB}).`);
rmSync('.tmp/build-1', { recursive: true, force: true });
rmSync('.tmp/build-2', { recursive: true, force: true });
if (pornire > PLAFON_PORNIRE_KB || total > PLAFON_TOTAL_KB || admin > PLAFON_ADMIN_KB) {
  console.error('Mărimea pachetului trece de plafon.');
  process.exit(1);
}
