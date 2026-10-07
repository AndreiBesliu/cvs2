/**
 * Publică build-ul din `dist/` pe un CANAL DE PREVIZUALIZARE al instanței de test, fără să atingă adresa principală
 * (ea primește aplicația nouă abia după exportul Firestore confirmat de owner, `PLAN.md` §5.3, felia 1.9).
 *
 *   node scripts/publica-canal.ts <canal>
 *
 * Build-ul nu se schimbă: într-o copie din `.tmp/publicare/` se pune `config.json` cu instanța „test”, apoi
 * `firebase hosting:channel:deploy <canal> --project test --expires 30d`. Proiectul se numește mereu explicit.
 */
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { configHosting } from './firebase-json.ts';

const canal = process.argv[2];
if (!canal || !/^[a-z0-9-]{1,40}$/.test(canal)) {
  console.error('folosire: node scripts/publica-canal.ts <canal> (litere mici, cifre, liniuțe)');
  process.exit(2);
}
if (!existsSync('dist/index.html')) {
  console.error('dist/ lipsește: rulează întâi npm run build');
  process.exit(2);
}

const dir = '.tmp/publicare';
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });
cpSync('dist', `${dir}/public`, { recursive: true });
writeFileSync(`${dir}/public/config.json`, `${JSON.stringify({ instanta: 'test' })}\n`);
writeFileSync(`${dir}/firebase.json`, `${JSON.stringify(configHosting('public'), null, 2)}\n`);
writeFileSync(`${dir}/.firebaserc`, `${JSON.stringify({ projects: { test: 'cncvectorstudio-test' } }, null, 2)}\n`);

execFileSync('firebase', ['hosting:channel:deploy', canal, '--project', 'test', '--expires', '30d'], {
  cwd: dir,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
