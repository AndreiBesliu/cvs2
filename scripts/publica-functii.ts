/**
 * Publică serverul aplicației noi pe proiectul de TEST: funcțiile (codebase-ul `cncvs2`, ADR 0039), regulile Firestore
 * și indecșii cu politica TTL (din felia 3.3, ADR 0040). Funcțiile aplicației vechi (codebase-ul `default`) nu se ating,
 * iar indecșii ei rămân: fără `--force`, firebase-tools nu șterge ce nu e în `firestore.indexes.json`.
 *
 *   npm run publica:functii
 *
 * Proiectul se numește mereu explicit; pe live nu publică scriptul ăsta niciodată.
 */
import { execSync } from 'node:child_process';
import { CODEBASE } from './firebase-json.ts';

execSync('npm --prefix functions run compileaza', { stdio: 'inherit' });
execSync(`firebase deploy --only functions:${CODEBASE},firestore:rules,firestore:indexes --project cncvectorstudio-test --non-interactive`, { stdio: 'inherit' });
