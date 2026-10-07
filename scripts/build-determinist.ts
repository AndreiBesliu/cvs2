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

/** Plafonul JavaScript-ului comprimat, în kB. Măsurat la felia 1.2: 72,5 kB (React + valibot + scheletul). */
const PLAFON_JS_GZIP_KB = 100;

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

let js = 0;
for (const p of fisiere('.tmp/build-1')) if (p.endsWith('.js')) js += gzipSync(readFileSync(p), { level: 9 }).length;
const kb = js / 1024;
console.log(`Build determinist: ${a.size} fișiere, identice în două build-uri.`);
console.log(`JavaScript gzip: ${kb.toFixed(1)} kB (plafon ${PLAFON_JS_GZIP_KB} kB).`);
rmSync('.tmp/build-1', { recursive: true, force: true });
rmSync('.tmp/build-2', { recursive: true, force: true });
if (kb > PLAFON_JS_GZIP_KB) {
  console.error(`Mărimea pachetului trece de plafon cu ${(kb - PLAFON_JS_GZIP_KB).toFixed(1)} kB.`);
  process.exit(1);
}
