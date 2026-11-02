import { createHash } from 'node:crypto';
import { cheieAmprenta } from '../../../shared/amprenta.ts';
import type { Sursa } from '../../../shared/erori.ts';

/**
 * Hash-urile jurnalului de erori (ADR 0039 §3), fără Firestore: amprenta unui grup și hash-ul scurt al unei chei. Stau în
 * modulul lor ca să le poată lua și probele din rădăcina repo-ului (amprenta din editor, ADR 0116 §11), unde
 * `firebase-admin` nu e instalat în fiecare felie a CI-ului.
 */

const sha256 = (text: string): string => createHash('sha256').update(text, 'utf8').digest('hex');

/** Id-ul grupului: primii 32 de caractere hex din SHA-256 peste cheia amprentei (ADR 0039 §3). */
export function amprenta(sursa: Sursa, tip: string, mesaj: string): string {
  return sha256(cheieAmprenta(sursa, tip, mesaj)).slice(0, 32);
}

/** Un hash scurt, pentru chei care n-au voie să păstreze valoarea în clar (IP-ul). */
export function hashScurt(text: string): string {
  return sha256(text).slice(0, 16);
}
