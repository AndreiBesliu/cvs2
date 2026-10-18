/**
 * Publică build-ul din `dist/` pe ADRESA PRINCIPALĂ a instanței de test (`cncvectorstudio-test`), doar hosting, cu
 * amprenta lui (ADR 0044; scurtătura lui `node scripts/publica.ts --instanta test --doar hosting`).
 *
 *   npm run build && node scripts/publica-test.ts
 *
 * Workerul vechi de pe adresa asta îl preia workerul PWA (`/sw.js`, ADR 0045 §6). Proiectul se numește mereu explicit; pe live nu publică
 * scriptul ăsta niciodată.
 */
import { publica } from './publica.ts';

await publica({ instanta: 'test', tinte: ['hosting'] });
