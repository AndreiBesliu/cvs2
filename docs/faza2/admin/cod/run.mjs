// masoara: porneste emulatoarele Auth + Functions pe un proiect demo-* (fara cloud, fara login),
// ruleaza probe.mjs si le opreste. Codul de iesire e al sondei.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const here = dirname(fileURLToPath(import.meta.url));
const bin = join(here, 'node_modules', 'firebase-tools', 'lib', 'bin', 'firebase.js');
const t0 = Date.now();
const r = spawnSync(process.execPath, [bin, 'emulators:exec', '--only', 'auth,functions', '--project', 'demo-cncvs2-s9', 'node probe.mjs'], {
  cwd: here, stdio: 'inherit', env: { ...process.env, NO_UPDATE_NOTIFIER: '1', FIREBASE_CLI_DISABLE_UPDATE_CHECK: '1' },
});
console.log(`masoara: ${((Date.now() - t0) / 1000).toFixed(1)} s, exit ${r.status}`);
process.exit(r.status ?? 1);
