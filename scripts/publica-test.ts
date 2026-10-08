/**
 * Publică build-ul din `dist/` pe ADRESA PRINCIPALĂ a instanței de test (`cncvectorstudio-test`), doar hosting.
 *
 *   node scripts/publica-test.ts
 *
 * Abia după exportul Firestore de pe proiectul de test (`PLAN.md` §5.3, felia 1.9; făcut de owner pe 08.10.2026, în
 * bucket-ul `cncvectorstudio-test-backup`). Workerul vechi de pe adresa asta îl oprește `public/sw.js`. Proiectul se
 * numește mereu explicit; pe live nu publică scriptul ăsta niciodată.
 */
import { execFileSync } from 'node:child_process';
import { pregatestePublicare } from './pregateste-publicare.ts';

const dir = pregatestePublicare();
execFileSync('firebase', ['deploy', '--only', 'hosting', '--project', 'test'], {
  cwd: dir,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
