/**
 * Publică funcțiile aplicației noi (codebase-ul `cncvs2`, ADR 0039) pe proiectul de TEST: compilează din
 * `functions/src`, apoi `firebase deploy --only functions:cncvs2`. Funcțiile aplicației vechi (codebase-ul `default`)
 * nu se ating. Regulile Firestore nu pleacă de aici: se publică odată cu fila Erori (felia 3.3).
 *
 *   npm run publica:functii
 *
 * Proiectul se numește mereu explicit; pe live nu publică scriptul ăsta niciodată.
 */
import { execSync } from 'node:child_process';
import { CODEBASE } from './firebase-json.ts';

execSync('npm --prefix functions run compileaza', { stdio: 'inherit' });
execSync(`firebase deploy --only functions:${CODEBASE} --project cncvectorstudio-test --non-interactive`, { stdio: 'inherit' });
