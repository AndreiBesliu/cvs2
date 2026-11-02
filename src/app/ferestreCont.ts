import { useEffect, useRef, type RefObject } from 'react';
import { codEroare } from '../cloud/contEditor.ts';
import { t } from '../i18n/t.ts';

/**
 * Ce au în comun ferestrele contului (ADR 0116): panoul contului și raportările (§C). Textul unei erori, după codul
 * Firebase, și purtarea ferestrei: focusul în ea la deschidere, iar Escape o închide oriunde ar fi focusul.
 */

/** Textul unei erori a contului, după codul Firebase (logarea, crearea, callable-urile). */
export function textEroareCont(e: unknown): string {
  const cod = codEroare(e);
  switch (cod) {
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return t('cont.eroare.credentiale');
    case 'auth/email-already-in-use':
      return t('cont.eroare.folosita');
    case 'auth/weak-password':
      return t('cont.eroare.parola-slaba');
    case 'auth/invalid-email':
    case 'auth/missing-email':
      return t('cont.eroare.email');
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
    case 'auth/popup-blocked':
      return t('cont.eroare.popup');
    case 'auth/network-request-failed':
    case 'functions/unavailable':
    case 'functions/deadline-exceeded':
      return t('cont.eroare.retea');
    case 'auth/too-many-requests':
    case 'functions/resource-exhausted':
      return t('cont.eroare.prea-multe');
    default: {
      const mesaj = e instanceof Error ? e.message : String(e);
      return t('cont.eroare.alta', { cod: cod ? `${cod}: ${mesaj}` : mesaj });
    }
  }
}

/** Fereastra contului: cutia ei primește focusul la deschidere, iar Escape o închide, ca la fereastra fonturilor. */
export function useFereastraCont(onInchide: () => void): RefObject<HTMLDivElement | null> {
  const cutie = useRef<HTMLDivElement | null>(null);
  const inchide = useRef(onInchide);
  inchide.current = onInchide;
  useEffect(() => {
    cutie.current?.focus();
    const tasta = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      inchide.current();
    };
    document.addEventListener('keydown', tasta, true);
    return () => { document.removeEventListener('keydown', tasta, true); };
  }, []);
  return cutie;
}
