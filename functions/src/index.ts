/**
 * Funcțiile aplicației noi (codebase-ul `cncvs2`, ADR 0039). Cele ale aplicației vechi stau în codebase-ul `default` și nu
 * se ating de aici: publicarea numește mereu `functions:cncvs2`.
 */
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { createRequire } from 'node:module';
import { JOBURI, optiuniContBackup, type NumeJob } from '../../shared/joburi.ts';
import { pornesteBackup, verificaBackup as verifica, type ClientExport } from './joburi/backup.ts';
import { cuMarcaj } from './joburi/marcaj.ts';
import { trateazaRaportClient } from './erori/client.ts';
import { marcheazaEroarea as marcheaza } from './erori/marcheaza.ts';
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

/** „Rezolvat” / „Redeschide” pe un grup de erori (ADR 0040 §4): personalul, cu auditul în aceeași tranzacție. */
export const marcheazaEroarea = onCall(
  { region: REGIUNI.callable, enforceAppCheck: true, maxInstances: 2, memory: '256MiB', timeoutSeconds: 20 },
  async (cerere) => marcheaza(getFirestore(), cerere.auth?.uid ?? null, cerere.data),
);

/* ── Joburile programate (ADR 0041), fiecare cu marcajul lui de rulare ─────────────────────────────────────────────── */

function definitie(nume: NumeJob): (typeof JOBURI)[number] {
  const d = JOBURI.find((j) => j.nume === nume);
  if (!d) throw new Error(`jobul ${nume} nu e în JOBURI`);
  return d;
}

let client: ClientExport | undefined;
/**
 * Clientul de export al Firestore, creat la prima rulare (nu la încărcarea funcțiilor). Prin `require`: pachetul e
 * CommonJS, iar `import { v1 }` trece de tipuri, dar cade la rulare în ESM (`v1` nu e export numit; prins de emulator).
 */
function clientExport(): ClientExport {
  const { v1 } = createRequire(import.meta.url)('@google-cloud/firestore') as typeof import('@google-cloud/firestore');
  client ??= new v1.FirestoreAdminClient() as unknown as ClientExport;
  return client;
}

/** Contul joburilor de backup: cel dedicat (`SA_BACKUP`, ADR 0044), când e în `.env`; altfel cel implicit. */
const contBackup = optiuniContBackup(process.env['SA_BACKUP']);

const backup = definitie('backupZilnic');
/** Exportul zilnic al bazei, la 03:00 (ora României), în `BUCKET_BACKUP` (din `functions/.env.<proiect>`). */
export const backupZilnic = onSchedule(
  { ...contBackup, schedule: backup.programare, timeZone: backup.fus, region: REGIUNI.job, timeoutSeconds: backup.timeoutSecunde, retryCount: 0, memory: '256MiB' },
  async () => {
    await cuMarcaj(getFirestore(), backup.nume, () => pornesteBackup(clientExport(), process.env['BUCKET_BACKUP'], process.env['GCLOUD_PROJECT'] ?? '', new Date()));
  },
);

const verificare = definitie('verificaBackup');
/** Verificarea exportului de azi, la 05:00: terminat, fără eroare; altfel eșec în marcaj și în fila Erori. */
export const verificaBackup = onSchedule(
  { ...contBackup, schedule: verificare.programare, timeZone: verificare.fus, region: REGIUNI.job, timeoutSeconds: verificare.timeoutSecunde, retryCount: 0, memory: '256MiB' },
  async () => {
    await cuMarcaj(getFirestore(), verificare.nume, () => verifica(getFirestore(), clientExport(), new Date()));
  },
);
