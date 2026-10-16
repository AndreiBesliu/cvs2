import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { COLECTIE_MARCAJE, JOBURI, limitaOre } from '../../../shared/joburi.ts';

/**
 * Backup-ul zilnic al Firestore (ADR 0041 §1): `backupZilnic` pornește exportul și notează operația; `verificaBackup` o
 * cere terminată, fără eroare. Clientul de export e injectat (în cloud, `FirestoreAdminClient`; în teste, un fals): exportul
 * nu există pe emulator.
 */
export interface OperatieExport {
  readonly name?: string | null;
  readonly done?: boolean | null;
  readonly error?: { readonly message?: string | null } | null;
  readonly metadata?: { readonly operationState?: unknown; readonly endTime?: unknown } | null;
}

export interface ClientExport {
  exportDocuments(cerere: { name: string; outputUriPrefix: string; collectionIds: string[] }): Promise<readonly [OperatieExport, ...unknown[]]>;
  checkExportDocumentsProgress(nume: string): Promise<OperatieExport>;
}

const BUCKET = /^gs:\/\/[a-z0-9][a-z0-9._-]{1,220}[a-z0-9]$/;

/** Destinația unui export: `<bucket>/firestore/<ora UTC a pornirii>` (două rulări în aceeași zi nu se calcă). */
export function destinatieExport(bucket: string, acum: Date): string {
  return `${bucket}/firestore/${acum.toISOString().replace(/[:.]/g, '-')}`;
}

export async function pornesteBackup(client: ClientExport, bucket: string | undefined, proiect: string, acum: Date): Promise<Record<string, unknown>> {
  if (!bucket || !BUCKET.test(bucket)) throw new Error(`BUCKET_BACKUP lipsește sau nu e un bucket gs:// valid: ${JSON.stringify(bucket ?? null)}`);
  if (!proiect) throw new Error('proiectul nu se cunoaște (GCLOUD_PROJECT lipsește)');
  const destinatie = destinatieExport(bucket, acum);
  const [op] = await client.exportDocuments({ name: `projects/${proiect}/databases/(default)`, outputUriPrefix: destinatie, collectionIds: [] });
  if (!op.name) throw new Error('exportul n-a întors numele operației');
  return { operatie: op.name, destinatie, pornitLa: Timestamp.fromDate(acum) };
}

/**
 * Verificarea exportului notat de `backupZilnic`: există, e de azi (ultimul succes al lui `backupZilnic` e în limita lui),
 * s-a terminat și n-are eroare. Orice altceva aruncă, cu motivul; `cuMarcaj` îl face eșec și rând în fila Erori.
 */
export async function verificaBackup(db: Firestore, client: ClientExport, acum: Date): Promise<Record<string, unknown>> {
  const m = await db.collection(COLECTIE_MARCAJE).doc('backupZilnic').get();
  const detaliu: unknown = m.exists ? m.get('detaliu') : undefined;
  const operatie = typeof detaliu === 'object' && detaliu !== null ? (detaliu as Record<string, unknown>)['operatie'] : undefined;
  if (typeof operatie !== 'string' || !operatie) throw new Error('niciun export pornit de backupZilnic');
  const succes: unknown = m.get('ultimulSucces');
  const def = JOBURI.find((j) => j.nume === 'backupZilnic');
  if (!(succes instanceof Timestamp) || !def || acum.getTime() - succes.toMillis() > limitaOre(def) * 3_600_000) {
    throw new Error(`exportul notat (${operatie}) e mai vechi decât limita: backupZilnic n-a mai pornit`);
  }
  const op = await client.checkExportDocumentsProgress(operatie);
  if (op.error) throw new Error(`exportul ${operatie} a eșuat: ${op.error.message ?? 'fără mesaj'}`);
  if (!op.done) throw new Error(`exportul ${operatie} nu s-a terminat (starea ${String(op.metadata?.operationState ?? 'necunoscută')})`);
  return { operatie, destinatie: (detaliu as Record<string, unknown>)['destinatie'] ?? null, verificatLa: Timestamp.fromDate(acum) };
}
