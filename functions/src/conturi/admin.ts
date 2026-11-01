import { Timestamp, type DocumentSnapshot, type Firestore } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { dreptDin, MARGINI_SETARI } from '../../../shared/conturi.ts';
import {
  acelasiPlan, CALE_SETARI, COLECTIE_CONTURI, MARGINI_PROBA, planDupa, planEfectiv, planVazutDin, schimbareDin, setariCerute, setariDin,
  vazutDin, type PlanDocument, type PlanInainte, type RaspunsPlan, type RaspunsSetari,
} from '../../../shared/conturiPlan.ts';
import { esteUid } from '../../../shared/personal.ts';
import { scrieAudit } from '../audit.ts';
import { logServerError } from '../erori/jurnal.ts';
import { drepturiIn } from '../personal/drepturi.ts';

/**
 * Fila Utilizatori și fila Setări (ADR 0116 §19, §20; felia 14.C↑b). Planul unui cont (gratuit, o probă de N zile de azi,
 * dezactivarea, reactivarea) îl schimbă cine are `conturi.administreaza`, pe planul pe care l-a văzut; dreptul contului se
 * calculează din nou, ca la deschidere, și se scrie odată cu planul. Setările conturilor le schimbă doar owner-ul.
 * Drepturile se citesc în tranzacția fiecărei acțiuni (ADR 0049 §3), iar fiecare schimbare are rândul ei de audit acolo.
 */

const obiect = (x: unknown): Record<string, unknown> => (typeof x === 'object' && x !== null && !Array.isArray(x) ? x as Record<string, unknown> : {});
const argument = (motiv: string): HttpsError => new HttpsError('invalid-argument', motiv);
/** Milisecundele unui `Timestamp`, întregi (ca `Date.getTime()` din pagină, care trunchiază). */
const ms = (x: unknown): number | null => (x instanceof Timestamp ? Math.floor(x.toMillis()) : null);
const timestamp = (x: number | null): Timestamp | null => (x === null ? null : Timestamp.fromMillis(x));

function inainteDin(x: unknown): PlanInainte | null {
  const d = obiect(x);
  const plan = d['plan'];
  return plan === 'proba' || plan === 'gratuit' ? { plan, probaPana: ms(d['probaPana']) } : null;
}

function planDocumentDin(c: DocumentSnapshot): PlanDocument {
  return { plan: c.get('plan'), probaPana: ms(c.get('probaPana')), inainte: inainteDin(c.get('planInainte')) };
}

/** Planul pentru audit și pentru document: sfârșitul probei în milisecunde, planul de dinainte doar dacă există. */
const planAudit = (p: PlanDocument) => ({ plan: p.plan ?? null, probaPana: p.probaPana, inainte: p.inainte });

async function schimbaPlanul(db: Firestore, uid: string, d: Record<string, unknown>, acum: Date): Promise<RaspunsPlan> {
  const tinta = d['uid'];
  const schimbare = schimbareDin(d['schimbare']);
  const vazut = planVazutDin(d['vazut']);
  if (!esteUid(tinta)) throw argument('uid-ul contului');
  if (schimbare === null) throw argument(`schimbarea: gratuit, proba (${MARGINI_PROBA.min}–${MARGINI_PROBA.max} zile, întregi), dezactiveaza sau reactiveaza`);
  if (vazut === null) throw argument('planul văzut al contului');
  return db.runTransaction(async (tx) => {
    // Toate citirile tranzacției înaintea scrierilor (Firestore o cere).
    const eu = await drepturiIn(tx, db, uid);
    if (!eu.permisiuni.has('conturi.administreaza')) throw new HttpsError('permission-denied', 'rolul tău nu administrează conturile');
    const ref = db.collection(COLECTIE_CONTURI).doc(tinta);
    const c = await tx.get(ref);
    if (!c.exists) throw new HttpsError('not-found', 'contul nu există');
    const alLui = await drepturiIn(tx, db, tinta);
    const s = await tx.get(db.collection(CALE_SETARI.colectie).doc(CALE_SETARI.id));
    const curent = planDocumentDin(c);
    const v = vazutDin(curent);
    if (v.plan !== vazut.plan || v.probaPana !== vazut.probaPana) {
      throw new HttpsError('failed-precondition', 'planul contului s-a schimbat de când ai deschis lista; reîncarcă lista');
    }
    const t = acum.getTime();
    const nou = planDupa(curent, schimbare, t);
    const personal = alLui.owner || alLui.permisiuni.size > 0;
    const drept = dreptDin(planEfectiv(nou.plan, nou.probaPana, personal, t), nou.probaPana, setariDin(s.exists ? s.data() : undefined).zileOffline, t);
    if (acelasiPlan(nou, curent)) return { ok: true, schimbat: false, drept };
    const cand = Timestamp.fromDate(acum);
    tx.update(ref, {
      plan: nou.plan, probaPana: timestamp(nou.probaPana),
      planInainte: nou.inainte ? { plan: nou.inainte.plan, probaPana: timestamp(nou.inainte.probaPana) } : null,
      drept, planSchimbatLa: cand, planSchimbatDe: uid,
    });
    scrieAudit(tx, db, {
      cand, cine: uid, rol: eu.rol, actiune: `conturi.${schimbare.fel}`, tinta: `${COLECTIE_CONTURI}/${tinta}`,
      inainte: planAudit(curent), dupa: planAudit(nou),
    });
    return { ok: true, schimbat: true, drept };
  });
}

async function schimbaSetarile(db: Firestore, uid: string, d: Record<string, unknown>, acum: Date): Promise<RaspunsSetari> {
  const setari = setariCerute(d['setari']);
  if (setari === null) {
    const { zileOffline: o, zilePastrareTichete: p } = MARGINI_SETARI;
    throw argument(`zilele offline între ${o.min} și ${o.max}, păstrarea tichetelor între ${p.min} și ${p.max} de zile, întregi`);
  }
  return db.runTransaction(async (tx) => {
    if (!(await drepturiIn(tx, db, uid)).owner) throw new HttpsError('permission-denied', 'doar owner-ul schimbă setările conturilor');
    const ref = db.collection(CALE_SETARI.colectie).doc(CALE_SETARI.id);
    const s = await tx.get(ref);
    const inainte = s.exists ? setariDin(s.data()) : null;
    if (inainte && inainte.zileOffline === setari.zileOffline && inainte.zilePastrareTichete === setari.zilePastrareTichete) {
      return { ok: true, schimbat: false, setari };
    }
    const cand = Timestamp.fromDate(acum);
    tx.set(ref, { schema: 1, ...setari, modificatLa: cand, modificatDe: uid });
    scrieAudit(tx, db, {
      cand, cine: uid, rol: 'owner', actiune: 'setari.conturi', tinta: `${CALE_SETARI.colectie}/${CALE_SETARI.id}`, inainte, dupa: setari,
    });
    return { ok: true, schimbat: true, setari };
  });
}

/**
 * Callable-ul `administreazaConturile`: `{ actiune: 'plan', uid, schimbare, vazut }` sau `{ actiune: 'setari', setari }`;
 * refuzurile sunt `HttpsError`-uri cu motivul.
 */
export async function administreazaConturile(
  db: Firestore, uid: string | null, data: unknown, acum: Date = new Date(),
): Promise<RaspunsPlan | RaspunsSetari> {
  if (!uid) throw new HttpsError('unauthenticated', 'intră în cont');
  const d = obiect(data);
  const actiune = d['actiune'];
  try {
    switch (actiune) {
      case 'plan': return await schimbaPlanul(db, uid, d, acum);
      case 'setari': return await schimbaSetarile(db, uid, d, acum);
      default: throw argument('acțiunea');
    }
  } catch (e) {
    if (e instanceof HttpsError) throw e;
    await logServerError('callable:administreazaConturile', e, { uid, actiune: typeof actiune === 'string' ? actiune.slice(0, 40) : null }, db, acum);
    throw new HttpsError('internal', 'acțiunea n-a reușit; eroarea e în jurnal');
  }
}
