/**
 * Publică build-ul din `dist/` pe un CANAL DE PREVIZUALIZARE al instanței de test, fără să atingă adresa principală
 * (ea primește aplicația nouă abia după exportul Firestore confirmat de owner, `PLAN.md` §5.3, felia 1.9).
 *
 *   node scripts/publica-canal.ts <canal>
 *
 * Build-ul nu se schimbă (`pregateste-publicare.ts`), apoi `firebase hosting:channel:deploy <canal> --project test
 * --expires 30d`. Proiectul se numește mereu explicit. Adresa principală o publică `publica-test.ts`.
 */
import { execFileSync } from 'node:child_process';
import { pregatestePublicare } from './pregateste-publicare.ts';

const canal = process.argv[2];
if (!canal || !/^[a-z0-9-]{1,40}$/.test(canal)) {
  console.error('folosire: node scripts/publica-canal.ts <canal> (litere mici, cifre, liniuțe)');
  process.exit(2);
}

const dir = pregatestePublicare();
execFileSync('firebase', ['hosting:channel:deploy', canal, '--project', 'test', '--expires', '30d'], {
  cwd: dir,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
