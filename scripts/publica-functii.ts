/**
 * Publică serverul aplicației noi pe proiectul de TEST: funcțiile (codebase-ul `cncvs2`, ADR 0039), regulile Firestore
 * și indecșii cu politica TTL (din felia 3.3, ADR 0040), cu amprenta lor (ADR 0044; scurtătura lui
 * `node scripts/publica.ts --instanta test --doar server`). Funcțiile aplicației vechi (codebase-ul `default`) nu se ating,
 * iar indecșii ei rămân: fără `--force`, firebase-tools nu șterge ce nu e în `firestore.indexes.json`.
 *
 *   npm run publica:functii
 *
 * Proiectul se numește mereu explicit; pe live nu publică scriptul ăsta niciodată.
 */
import { TINTE_SERVER } from '../shared/publicare.ts';
import { publica } from './publica.ts';

await publica({ instanta: 'test', tinte: TINTE_SERVER });
