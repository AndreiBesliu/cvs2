/**
 * Funcțiile aplicației noi (codebase-ul `cncvs2`, ADR 0039). Cele ale aplicației vechi stau în codebase-ul `default` și nu
 * se ating de aici: publicarea numește mereu `functions:cncvs2`.
 */
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { onCall } from 'firebase-functions/v2/https';
import { trateazaRaportClient } from './erori/client.ts';
import { REGIUNI } from './regiuni.ts';

initializeApp();

/**
 * Erorile din browser (ADR 0039 §5): App Check impus, fără cont cerut, plafon de rată, răspuns `{ ok }`.
 * Invocarea publică (IAM) o pune firebase-tools doar la CREAREA unui callable, nu la actualizare: un callable a cărui
 * creare a picat la construcție rămâne cu 403 de la frontul Google până e șters și creat din nou (măsurat pe 16.10).
 */
export const logClientError = onCall(
  { region: REGIUNI.callable, enforceAppCheck: true, maxInstances: 5, memory: '256MiB', timeoutSeconds: 20 },
  async (cerere) => {
    const antet = cerere.rawRequest.headers['x-forwarded-for'];
    return trateazaRaportClient(getFirestore(), cerere.data, {
      uid: cerere.auth?.uid ?? null,
      xff: Array.isArray(antet) ? antet.join(',') : antet,
      ip: cerere.rawRequest.ip,
    });
  },
);
