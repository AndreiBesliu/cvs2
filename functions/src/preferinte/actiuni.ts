import { Timestamp, type Firestore, type Transaction } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { capabilitatiPlan } from '../../../shared/conturi.ts';
import { COLECTIE_CONTURI, planEfectiv } from '../../../shared/conturiPlan.ts';
import {
  cererePreferinteDin, COLECTIE_PREFERINTE, type CheiePreferinte, type RaspunsCitestePreferinte, type RaspunsScriePreferinte,
} from '../../../shared/preferinte.ts';
import { logServerError } from '../erori/jurnal.ts';
import { drepturiIn } from '../personal/drepturi.ts';

/**
 * Setările aplicației în cont (ADR 0330, întrebarea 14a, felia 10.4↑g): callable-ul `preferinte`. Fiecare grup de setări e
 * un document `conturi/{uid}/preferinte/{cheie}`, cu JSON-ul lui (neatins: serverul nu-i judecă conținutul, doar forma și
 * plafonul) și versiunea lui, crescută la fiecare scriere. Scrierea cere capabilitatea `cloud` a planului și versiunea
 * văzută (altfel ciocnire, cu ce e în cont); citirea, doar contul. Documentul e închis clientului: nicio regulă nu-l
 * deschide. Fără audit: sunt datele omului, nu acțiuni ale echipei.
 */

const intreg = (x: unknown): number => (typeof x === 'number' && Number.isSafeInteger(x) && x >= 0 ? x : 0);

/** Ce e în cont: versiunea și JSON-ul (un document lipsă sau stricat: versiunea 0, fără text). */
function inCont(date: Record<string, unknown> | undefined): { readonly versiune: number; readonly json: string | null } {
  const versiune = intreg(date?.['versiune']), json = date?.['json'];
  return versiune > 0 && typeof json === 'string' ? { versiune, json } : { versiune: 0, json: null };
}

const ref = (db: Firestore, uid: string, cheie: CheiePreferinte) =>
  db.collection(COLECTIE_CONTURI).doc(uid).collection(COLECTIE_PREFERINTE).doc(cheie);

/** Contul omului și dreptul lui de a scrie (capabilitatea `cloud`, din planul efectiv, ca la deschiderea contului). */
async function poateScrie(tx: Transaction, db: Firestore, uid: string, acum: number): Promise<boolean> {
  const drepturi = await drepturiIn(tx, db, uid);
  const c = await tx.get(db.collection(COLECTIE_CONTURI).doc(uid));
  if (!c.exists) throw new HttpsError('failed-precondition', 'contul nu e deschis încă; confirmă adresa');
  const proba: unknown = c.get('probaPana');
  const plan = planEfectiv(c.get('plan'), proba instanceof Timestamp ? proba.toMillis() : null, drepturi.owner || drepturi.permisiuni.size > 0, acum);
  return capabilitatiPlan(plan).includes('cloud');
}

async function citeste(db: Firestore, uid: string, cheie: CheiePreferinte, acum: number): Promise<RaspunsCitestePreferinte> {
  return db.runTransaction(async (tx) => {
    const scrie = await poateScrie(tx, db, uid, acum);
    return { ok: true, ...inCont((await tx.get(ref(db, uid, cheie))).data()), poateScrie: scrie };
  }, { readOnly: true });
}

async function scrie(db: Firestore, uid: string, cheie: CheiePreferinte, vazuta: number, json: string, acum: Date): Promise<RaspunsScriePreferinte> {
  return db.runTransaction(async (tx) => {
    if (!(await poateScrie(tx, db, uid, acum.getTime()))) {
      throw new HttpsError('permission-denied', 'planul contului nu permite scrierea în cont; setările din cont se pot doar citi');
    }
    const r = ref(db, uid, cheie);
    const acolo = inCont((await tx.get(r)).data());
    if (vazuta !== acolo.versiune) return { ok: true, stare: 'conflict', ...acolo };
    const versiune = acolo.versiune + 1;
    tx.set(r, { versiune, json, schimbatLa: Timestamp.fromDate(acum) });
    return { ok: true, stare: 'scrisa', versiune };
  });
}

/**
 * Callable-ul `preferinte`: `{ actiune: 'citeste', cheie }` sau `{ actiune: 'scrie', cheie, vazuta, json }`; refuzurile sunt
 * `HttpsError`-uri cu motivul.
 */
export async function trateazaPreferintele(
  db: Firestore, uid: string | null, data: unknown, acum: Date = new Date(),
): Promise<RaspunsCitestePreferinte | RaspunsScriePreferinte> {
  if (!uid) throw new HttpsError('unauthenticated', 'intră în cont');
  const c = cererePreferinteDin(data);
  if (!c) throw new HttpsError('invalid-argument', 'cererea');
  try {
    if (c.actiune === 'citeste') return await citeste(db, uid, c.cheie, acum.getTime());
    return await scrie(db, uid, c.cheie, c.vazuta, c.json, acum);
  } catch (e) {
    if (e instanceof HttpsError) throw e;
    await logServerError('callable:preferinte', e, { uid, actiune: c.actiune }, db, acum);
    throw new HttpsError('internal', 'acțiunea n-a reușit; eroarea e în jurnal');
  }
}
