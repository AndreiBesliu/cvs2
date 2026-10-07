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
 * - totalul, cu bucățile încărcate la cerere (exportul: cavalier + CAM + post, ~23 kB) și workerul.
 */
const PLAFON_PORNIRE_KB = 100;
const PLAFON_TOTAL_KB = 300;

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
for (const p of fisiere('.tmp/build-1')) {
  if (!p.endsWith('.js')) continue;
  const kb = gz(p);
  total += kb;
  if (laPornire.has(relative('.tmp/build-1', p).replace(/\\/g, '/'))) pornire += kb;
}
console.log(`Build determinist: ${a.size} fișiere, identice în două build-uri.`);
console.log(`JavaScript gzip la pornire: ${pornire.toFixed(1)} kB (plafon ${PLAFON_PORNIRE_KB}); total: ${total.toFixed(1)} kB (plafon ${PLAFON_TOTAL_KB}).`);
rmSync('.tmp/build-1', { recursive: true, force: true });
rmSync('.tmp/build-2', { recursive: true, force: true });
if (pornire > PLAFON_PORNIRE_KB || total > PLAFON_TOTAL_KB) {
  console.error('Mărimea pachetului trece de plafon.');
  process.exit(1);
}
