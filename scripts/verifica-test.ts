/**
 * Condiția publicării pe live (ADR 0044): commit-ul cerut e deja publicat întreg pe test, din arborele curat (amprenta
 * testului, `meta/deployment`). Rulat de workflow-ul `publica`, în jobul de verificare, cu identitatea testului (WIF).
 *
 *   node scripts/verifica-test.ts <sha>
 */
import { PROIECTE, SHA_COMPLET } from '../shared/publicare.ts';
import { citesteAmprenta, shaPublicatPeTest } from './amprenta.ts';
import { clientFirebaseTools } from './firebase-api.ts';

const sha = process.argv[2] ?? '';
if (!SHA_COMPLET.test(sha)) {
  console.error(`::error::sha-ul trebuie să aibă 40 de caractere hex: ${JSON.stringify(sha)}`);
  process.exit(2);
}
const r = shaPublicatPeTest(await citesteAmprenta(await clientFirebaseTools('https://firestore.googleapis.com'), PROIECTE.test), sha);
if (!r.ok) {
  console.error(`::error::${r.motiv}`);
  process.exit(1);
}
console.log(`${sha} e publicat întreg pe test, din arborele curat.`);
