import { Timestamp, type DocumentReference, type Firestore, type Transaction } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { capabilitatiPlan } from '../../../shared/conturi.ts';
import { COLECTIE_CONTURI, planEfectiv } from '../../../shared/conturiPlan.ts';
import {
  CALE_SINCRON_FREZE, cerereFrezeDin, COLECTIE_FREZE, FREZE_IN_CONT, PAGINA_FREZE, STERSE_IN_CONT,
  type FrezaInCont, type RaspunsListaFreze, type RaspunsScrieFreze, type RezultatFreza,
} from '../../../shared/freze.ts';
import { logServerError } from '../erori/jurnal.ts';
import { drepturiIn } from '../personal/drepturi.ts';

/**
 * Biblioteca de freze în cont (ADR 0300 §7, felia 16.A↑c): callable-ul `freze`. Fiecare freză a omului e un document
 * `conturi/{uid}/freze/{id}`, cu JSON-ul ei (neatins: serverul nu-i judecă conținutul, doar forma și plafonul) și versiunea
 * ei în cont, luată din contorul contului (`conturi/{uid}/sincron/freze`) la fiecare scriere. O ștergere lasă un semn
 * (`json: null`, `stearsaLa`), ca celălalt calculator să afle de ea; peste plafonul semnelor, cele mai vechi pleacă, iar
 * `purjatPana` spune cui îi trebuie lista întreagă. Scrierea cere capabilitatea `cloud` a planului; lista, doar contul.
 * Fără audit pe freză: sunt datele omului, nu acțiuni ale echipei.
 */

/** Plafoanele, schimbate doar de probe (paginile și semnele, pe liste mici). */
export type LimiteFreze = { readonly freze: number; readonly pagina: number; readonly sterse: number };
const LIMITE: LimiteFreze = { freze: FREZE_IN_CONT, pagina: PAGINA_FREZE, sterse: STERSE_IN_CONT };

/** Starea bibliotecii din cont: ultima versiune dată, frezele vii, semnele ștergerii ținute, ultima versiune plecată. */
type Sincron = { readonly versiune: number; readonly numar: number; readonly sterse: number; readonly purjatPana: number };

const intreg = (x: unknown): number => (typeof x === 'number' && Number.isSafeInteger(x) && x >= 0 ? x : 0);

function sincronDin(x: Record<string, unknown> | undefined): Sincron {
  return { versiune: intreg(x?.['versiune']), numar: intreg(x?.['numar']), sterse: intreg(x?.['sterse']), purjatPana: intreg(x?.['purjatPana']) };
}

/** Ce e în cont pentru un id: versiunea și JSON-ul (null: ștearsă, sau n-a fost niciodată, cu versiunea 0). */
function inCont(id: string, date: Record<string, unknown> | undefined): FrezaInCont {
  if (!date) return { id, versiune: 0, json: null };
  const json = date['json'];
  return { id, versiune: intreg(date['versiune']), json: typeof json === 'string' ? json : null };
}

const refSincron = (db: Firestore, uid: string): DocumentReference =>
  db.collection(COLECTIE_CONTURI).doc(uid).collection(CALE_SINCRON_FREZE.colectie).doc(CALE_SINCRON_FREZE.id);
const colectie = (db: Firestore, uid: string) => db.collection(COLECTIE_CONTURI).doc(uid).collection(COLECTIE_FREZE);

/** Contul omului și dreptul lui de a scrie (capabilitatea `cloud`, din planul efectiv, ca la deschiderea contului). */
async function poateScrie(tx: Transaction, db: Firestore, uid: string, acum: number): Promise<boolean> {
  const drepturi = await drepturiIn(tx, db, uid);
  const c = await tx.get(db.collection(COLECTIE_CONTURI).doc(uid));
  if (!c.exists) throw new HttpsError('failed-precondition', 'contul nu e deschis încă; confirmă adresa');
  const proba: unknown = c.get('probaPana');
  const plan = planEfectiv(c.get('plan'), proba instanceof Timestamp ? proba.toMillis() : null, drepturi.owner || drepturi.permisiuni.size > 0, acum);
  return capabilitatiPlan(plan).includes('cloud');
}

async function lista(db: Firestore, uid: string, dupa: number, l: LimiteFreze, acum: number): Promise<RaspunsListaFreze> {
  return db.runTransaction(async (tx) => {
    const scrie = await poateScrie(tx, db, uid, acum);
    const s = await tx.get(refSincron(db, uid));
    const sincron = sincronDin(s.data());
    // Lista întreagă: de la 0, sau pentru un calculator rămas în urma semnelor plecate (ori cu o versiune pe care contul
    // n-a dat-o: altă bază, un cont golit).
    const complet = dupa === 0 || dupa < sincron.purjatPana || dupa > sincron.versiune;
    const de = complet ? 0 : dupa;
    const q = await tx.get(colectie(db, uid).where('versiune', '>', de).orderBy('versiune').limit(l.pagina + 1));
    const mai = q.docs.length > l.pagina;
    const freze = q.docs.slice(0, l.pagina).map((d) => inCont(d.id, d.data()));
    const pana = mai ? freze[freze.length - 1]!.versiune : sincron.versiune;
    return { ok: true, freze, pana, mai, complet, poateScrie: scrie, numar: sincron.numar };
  }, { readOnly: true });
}

/**
 * Scrierea sau ștergerea unui lot, într-o tranzacție: fiecare freză doar cu versiunea văzută (altfel conflict, cu ce e în
 * cont); una nouă (sau readusă peste semnul ei) doar sub plafonul frezelor vii. Toate citirile înaintea scrierilor.
 */
async function schimba(
  db: Firestore, uid: string, lot: readonly { id: string; vazuta: number; json: string | null }[], l: LimiteFreze, acum: Date,
): Promise<RaspunsScrieFreze> {
  return db.runTransaction(async (tx) => {
    if (!(await poateScrie(tx, db, uid, acum.getTime()))) {
      throw new HttpsError('permission-denied', 'planul contului nu permite scrierea în cont; biblioteca din cont se poate doar citi');
    }
    const rs = refSincron(db, uid);
    const sincron = sincronDin((await tx.get(rs)).data());
    const col = colectie(db, uid);
    const docs = await tx.getAll(...lot.map((f) => col.doc(f.id)));
    // Peste plafon, pleacă semnele cele mai vechi dintre cele de dinainte; cele puse de lotul acesta rămân până la ștergerea
    // următoare (deci semnele trec de plafon cu cel mult un lot). Doar o ștergere adaugă semne, iar o scriere le doar scoate.
    const semneNoi = lot.filter((f, i) => {
      const acolo = inCont(f.id, docs[i]?.data());
      return f.json === null && f.vazuta === acolo.versiune && acolo.json !== null;
    }).length;
    const deScos = Math.min(sincron.sterse, Math.max(0, sincron.sterse + semneNoi - l.sterse));
    const plecate = deScos > 0 ? (await tx.get(col.where('stearsaLa', '>', 0).orderBy('stearsaLa').limit(deScos))).docs : [];
    let { versiune, numar, sterse, purjatPana } = sincron;
    const cand = Timestamp.fromDate(acum);
    const rezultate: RezultatFreza[] = [];
    lot.forEach((f, i) => {
      const acolo = inCont(f.id, docs[i]?.data());
      if (f.vazuta !== acolo.versiune) {
        rezultate.push({ id: f.id, stare: 'conflict', versiune: acolo.versiune, json: acolo.json });
        return;
      }
      const vie = acolo.json !== null;
      if (f.json === null) {
        // Ștearsă deja (sau niciodată în cont): nimic de schimbat.
        if (!vie) {
          rezultate.push({ id: f.id, stare: 'scrisa', versiune: acolo.versiune });
          return;
        }
        versiune++;
        numar--;
        sterse++;
        tx.set(col.doc(f.id), { versiune, json: null, stearsaLa: versiune, schimbatLa: cand });
        rezultate.push({ id: f.id, stare: 'scrisa', versiune });
        return;
      }
      if (!vie && numar >= l.freze) {
        rezultate.push({ id: f.id, stare: 'plina' });
        return;
      }
      versiune++;
      if (!vie) numar++;
      if (!vie && acolo.versiune > 0) sterse--;
      // Documentul se scrie întreg: semnul ștergerii (`stearsaLa`) pleacă odată cu el.
      tx.set(col.doc(f.id), { versiune, json: f.json, schimbatLa: cand });
      rezultate.push({ id: f.id, stare: 'scrisa', versiune });
    });
    for (const d of plecate) {
      tx.delete(d.ref);
      purjatPana = Math.max(purjatPana, intreg(d.get('versiune')));
    }
    sterse -= plecate.length;
    if (versiune !== sincron.versiune) tx.set(rs, { versiune, numar, sterse, purjatPana, schimbatLa: cand });
    return { ok: true, rezultate, numar };
  });
}

/**
 * Callable-ul `freze`: `{ actiune: 'lista', dupa }`, `{ actiune: 'scrie', freze: [{ id, vazuta, json }] }` sau
 * `{ actiune: 'sterge', freze: [{ id, vazuta }] }`; refuzurile sunt `HttpsError`-uri cu motivul.
 */
export async function trateazaFrezele(
  db: Firestore, uid: string | null, data: unknown, acum: Date = new Date(), limite: LimiteFreze = LIMITE,
): Promise<RaspunsListaFreze | RaspunsScrieFreze> {
  if (!uid) throw new HttpsError('unauthenticated', 'intră în cont');
  const c = cerereFrezeDin(data);
  if (!c) throw new HttpsError('invalid-argument', 'cererea');
  try {
    if (c.actiune === 'lista') return await lista(db, uid, c.dupa, limite, acum.getTime());
    if (c.actiune === 'scrie') return await schimba(db, uid, c.freze, limite, acum);
    return await schimba(db, uid, c.freze.map((f) => ({ ...f, json: null })), limite, acum);
  } catch (e) {
    if (e instanceof HttpsError) throw e;
    await logServerError('callable:freze', e, { uid, actiune: c.actiune }, db, acum);
    throw new HttpsError('internal', 'acțiunea n-a reușit; eroarea e în jurnal');
  }
}
