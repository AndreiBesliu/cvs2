/**
 * Testele pe emulatoare (ADR 0039): compilează funcțiile, pornește Auth, Firestore, Functions și Storage pe proiectul
 * `demo-cncvs2` (un proiect `demo-*` nu atinge cloud-ul și nu cere login) și rulează `functions/test/*.test.ts`, pe rând
 * (baza e comună), apoi e2e-ul paginii `/admin` și al raportorului de erori (`test/e2e-emulator/`, cu Auth).
 *
 *   npm run test:emulator
 *
 * Emulatorul Firestore cere Java ≥ 21. Dacă `java` din PATH e mai vechi, se folosește JBR-ul din Android Studio, când
 * există (pe mașina owner-ului, `java` e 1.8, iar JBR-ul e 25). În CI, Java 21 vine din `setup-java`.
 *
 * Emulatorul Storage (din felia 15.B↑b) își ține fișierele în `<temp>/firebase/storage/blobs` și **șterge tot dosarul la
 * oprire**: cu un `temp` comun, oprirea emulatorului altei sesiuni (sau al altui proiect de pe mașină) golește fișierele
 * de sub probele care rulează. Fiecare rulare are deci dosarul ei temporar, șters la capăt.
 */
import { execSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';

function versiuneJava(bin: string): number {
  const r = spawnSync(bin, ['-version'], { encoding: 'utf8', shell: process.platform === 'win32' });
  const m = /version "(\d+)(?:\.(\d+))?/.exec(`${r.stderr}${r.stdout}`);
  if (!m) return 0;
  const major = Number(m[1]);
  return major === 1 ? Number(m[2] ?? 0) : major;
}

const env = { ...process.env };
if (versiuneJava('java') < 21) {
  const jbr = 'C:\\Program Files\\Android\\Android Studio\\jbr';
  if (!existsSync(join(jbr, 'bin', 'java.exe'))) {
    console.error('Emulatorul Firestore cere Java ≥ 21, iar java din PATH e mai vechi și JBR-ul lipsește.');
    process.exit(2);
  }
  env['JAVA_HOME'] = jbr;
  env['PATH'] = `${join(jbr, 'bin')}${delimiter}${env['PATH'] ?? ''}`;
  console.log(`Java din JBR: ${versiuneJava(join(jbr, 'bin', 'java.exe'))}`);
}

execSync('npm --prefix functions run compileaza', { stdio: 'inherit', env });
// Pagina /admin cap-coadă (ADR 0040) rulează pe dist/, cu emulatoarele pornite: build-ul întâi.
execSync('npm run build', { stdio: 'inherit', env });
const teste = 'node --test --test-concurrency=1 functions/test/*.test.ts && npx playwright test -c playwright.emulator.config.ts';
const temp = mkdtempSync(join(tmpdir(), 'cncvs2-emulatoare-'));
try {
  execSync(`firebase emulators:exec --only auth,firestore,functions,storage --project demo-cncvs2 "${teste}"`, {
    stdio: 'inherit', env: { ...env, TMP: temp, TEMP: temp, TMPDIR: temp },
  });
} finally {
  rmSync(temp, { recursive: true, force: true });
}
