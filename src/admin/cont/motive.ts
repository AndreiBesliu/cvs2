/**
 * Motivele refuzurilor de cont (ADR 0049 §6), spuse omului: codurile Firebase Auth care au un pas de urmat primesc
 * mesajul lor; restul rămâne codul și mesajul Firebase.
 */
import { t } from '../../i18n/t.ts';
import { motivDin } from '../erori/date.ts';

/** Lungimea minimă a unei parole puse din admin (Firebase cere 6). */
export const PAROLA_MIN = 8;

const MESAJE = {
  'auth/credential-already-in-use': 'admin.contul.err.google-folosit',
  'auth/provider-already-linked': 'admin.contul.err.deja-legat',
  'auth/account-exists-with-different-credential': 'admin.contul.err.alta-metoda',
  'auth/email-already-in-use': 'admin.contul.err.email-folosit',
  'auth/invalid-credential': 'admin.contul.err.nepotrivire',
  'auth/wrong-password': 'admin.contul.err.nepotrivire',
  'auth/user-not-found': 'admin.contul.err.nepotrivire',
  'auth/weak-password': 'admin.contul.err.parola-slaba',
  'auth/user-mismatch': 'admin.contul.err.alt-cont',
  'auth/popup-closed-by-user': 'admin.contul.err.popup',
  'auth/cancelled-popup-request': 'admin.contul.err.popup',
  'auth/too-many-requests': 'admin.contul.err.prea-multe',
} as const;

export function codAuth(e: unknown): string {
  const c = (e as { code?: unknown } | null)?.code;
  return typeof c === 'string' ? c : '';
}

/** Pură (cu dicționarul limbii active): mesajul unui refuz de cont. */
export function motivCont(e: unknown): string {
  const cheie = (MESAJE as Readonly<Record<string, (typeof MESAJE)[keyof typeof MESAJE]>>)[codAuth(e)];
  return cheie ? t(cheie) : motivDin(e);
}
