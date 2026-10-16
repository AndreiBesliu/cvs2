import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { COLECTIE } from '../src/erori/scrie.ts';
import { destinatieExport, pornesteBackup, verificaBackup, type ClientExport, type OperatieExport } from '../src/joburi/backup.ts';
import { cuMarcaj } from '../src/joburi/marcaj.ts';

/** Joburile programate (ADR 0041) pe emulatorul Firestore: marcajul de rulare, backup-ul și verificarea, cu un client fals. */

const PROIECT = 'demo-cncvs2';
const gazda = process.env['FIRESTORE_EMULATOR_HOST'];
if (!gazda) throw new Error('FIRESTORE_EMULATOR_HOST lipsește: testele rulează prin npm run test:emulator');
process.env['GCLOUD_PROJECT'] ??= PROIECT;
if (getApps().length === 0) initializeApp({ projectId: PROIECT });
const db = getFirestore();

beforeEach(async () => {
  const r = await fetch(`http://${gazda}/emulator/v1/projects/${PROIECT}/databases/(default)/documents`, { method: 'DELETE' });
  assert.equal(r.status, 200);
});

const T0 = new Date(Date.UTC(2026, 9, 17, 0, 0, 5));
const marcaj = async (job: string) => (await db.collection('marcaje').doc(job).get()).data();
const ms = (x: unknown) => (x as Timestamp).toMillis();

/** Un ceas care merge înainte cu o secundă la fiecare citire: pornirea, finalul și rândul din jurnal au timpi diferiți. */
function ceasDe(start: Date): () => Date {
  let t = start.getTime();
  return () => new Date((t += 1000));
}

/** Clientul de export fals: ține cererile și întoarce ce i se spune. */
function clientFals(raspuns: { export?: OperatieExport; progres?: OperatieExport; arunca?: Error }): ClientExport & { cereri: unknown[] } {
  const cereri: unknown[] = [];
  return {
    cereri,
    async exportDocuments(c) {
      cereri.push(c);
      if (raspuns.arunca) throw raspuns.arunca;
      return [raspuns.export ?? { name: 'projects/p/databases/(default)/operations/OP1' }];
    },
    async checkExportDocumentsProgress(nume) {
      cereri.push(nume);
      if (raspuns.arunca) throw raspuns.arunca;
      return raspuns.progres ?? { done: true, error: null };
    },
  };
}

test('marcajul la reușită: pornirea, finalul, succesul, contorul 0 și detaliul înlocuit', async () => {
  assert.equal(await cuMarcaj(db, 'jobProba', async () => ({ a: 1, b: 2 }), ceasDe(T0)), true);
  assert.equal(await cuMarcaj(db, 'jobProba', async () => ({ a: 3 }), ceasDe(new Date(T0.getTime() + 60_000))), true);
  const m = await marcaj('jobProba');
  assert.equal(m?.['job'], 'jobProba');
  assert.equal(m?.['esecuriLaRand'], 0);
  assert.equal(m?.['ultimaEroare'], null);
  assert.deepEqual(m?.['detaliu'], { a: 3 }, 'detaliul se înlocuiește, nu se amestecă');
  assert.ok(ms(m?.['ultimaPornire']) < ms(m?.['ultimulFinal']));
  assert.equal(ms(m?.['ultimulSucces']), ms(m?.['ultimulFinal']));
});

test('marcajul la eșec: contorul crește la rând, succesul vechi rămâne, eroarea e în marcaj și în fila Erori; o reușită îl resetează', async () => {
  await cuMarcaj(db, 'jobProba', async () => ({}), ceasDe(T0));
  const succes = ms((await marcaj('jobProba'))?.['ultimulSucces']);
  for (let i = 1; i <= 2; i++) {
    assert.equal(await cuMarcaj(db, 'jobProba', async () => { throw new Error('PERMISSION_DENIED: export'); }, ceasDe(new Date(T0.getTime() + i * 3_600_000))), false);
  }
  const m = await marcaj('jobProba');
  assert.equal(m?.['esecuriLaRand'], 2);
  assert.equal(m?.['ultimaEroare'], 'Error: PERMISSION_DENIED: export');
  assert.equal(ms(m?.['ultimulSucces']), succes, 'un eșec nu mută ultimul succes');
  const grupuri = (await db.collection(COLECTIE).where('tip', '==', 'job:jobProba').get()).docs;
  assert.equal(grupuri.length, 1);
  assert.equal(grupuri[0]?.get('numar'), 2);
  assert.equal(grupuri[0]?.get('sursa'), 'server');
  await cuMarcaj(db, 'jobProba', async () => ({}), ceasDe(new Date(T0.getTime() + 5 * 3_600_000)));
  assert.equal((await marcaj('jobProba'))?.['esecuriLaRand'], 0);
});

test('backup-ul: cererea exactă de export și operația notată în marcaj', async () => {
  const c = clientFals({});
  assert.equal(await cuMarcaj(db, 'backupZilnic', () => pornesteBackup(c, 'gs://cncvectorstudio-test-backup', 'cncvectorstudio-test', T0), ceasDe(T0)), true);
  assert.deepEqual(c.cereri, [{
    name: 'projects/cncvectorstudio-test/databases/(default)',
    outputUriPrefix: 'gs://cncvectorstudio-test-backup/firestore/2026-10-17T00-00-05-000Z', collectionIds: [],
  }]);
  const d = (await marcaj('backupZilnic'))?.['detaliu'] as Record<string, unknown>;
  assert.equal(d['operatie'], 'projects/p/databases/(default)/operations/OP1');
  assert.equal(d['destinatie'], destinatieExport('gs://cncvectorstudio-test-backup', T0));
});

test('backup-ul refuză un bucket lipsă sau greșit, fără să ceară exportul', async () => {
  for (const b of [undefined, '', 'cncvectorstudio-test-backup', 'gs://', 'gs://Bucket Mare', 'https://x/y']) {
    const c = clientFals({});
    assert.equal(await cuMarcaj(db, 'backupZilnic', () => pornesteBackup(c, b, 'p', T0), ceasDe(T0)), false, String(b));
    assert.equal(c.cereri.length, 0, String(b));
  }
  assert.match(String((await marcaj('backupZilnic'))?.['ultimaEroare']), /BUCKET_BACKUP lipsește sau nu e un bucket gs:\/\/ valid/);
});

test('verificarea: operația terminată trece; neterminată, eșuată, lipsă sau de ieri e eșec cu motivul', async () => {
  const porneste = async (t: Date) => cuMarcaj(db, 'backupZilnic', () => pornesteBackup(clientFals({}), 'gs://b-proba', 'p', t), ceasDe(t));
  const verifica = async (c: ClientExport, t: Date) => cuMarcaj(db, 'verificaBackup', () => verificaBackup(db, c, t), ceasDe(t));
  const eroare = async () => String((await marcaj('verificaBackup'))?.['ultimaEroare']);
  const T2 = new Date(T0.getTime() + 2 * 3_600_000);

  assert.equal(await verifica(clientFals({}), T2), false);
  assert.match(await eroare(), /niciun export pornit/);

  await porneste(T0);
  const ok = clientFals({ progres: { done: true, error: null } });
  assert.equal(await verifica(ok, T2), true);
  assert.deepEqual(ok.cereri, ['projects/p/databases/(default)/operations/OP1']);

  assert.equal(await verifica(clientFals({ progres: { done: false, metadata: { operationState: 'PROCESSING' } } }), T2), false);
  assert.match(await eroare(), /nu s-a terminat \(starea PROCESSING\)/);
  assert.equal(await verifica(clientFals({ progres: { done: true, error: { message: 'PERMISSION_DENIED' } } }), T2), false);
  assert.match(await eroare(), /a eșuat: PERMISSION_DENIED/);

  // Exportul notat e de acum 2 zile: backupZilnic n-a mai pornit, deci nu se verifică o copie veche drept cea de azi.
  assert.equal(await verifica(clientFals({}), new Date(T0.getTime() + 48 * 3_600_000)), false);
  assert.match(await eroare(), /mai vechi decât limita/);
  // Lipsă (1), apoi reușita resetează, apoi neterminată, eșuată, veche: 3 la rând.
  assert.equal((await marcaj('verificaBackup'))?.['esecuriLaRand'], 3);
});
