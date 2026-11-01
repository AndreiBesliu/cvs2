import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import {
  CALE_SETARI, COLECTIE_CONTURI, curataNume, dreptDin, NUME_MAX, planEfectiv, setariDin, ZI_MS, ZILE_PROBA, type RaspunsDeschide,
  type RaspunsNume,
} from '../../../shared/conturi.ts';
import { normalizeazaEmail } from '../../../shared/personal.ts';
import { scrieAudit } from '../audit.ts';
import { logServerError } from '../erori/jurnal.ts';
import { drepturiIn } from '../personal/drepturi.ts';

/**
 * Contul clientului (ADR 0116): la prima logare cu adresa verificată se creează `conturi/{uid}`, cu proba de 14 zile; la
 * fiecare deschidere, dreptul de acces se calculează aici, din planul ținut, din drepturile de personal (ADR 0049) și din
 * zilele offline din setări, se scrie în document și se întoarce aplicației. Crearea și numele au auditul lor, în
 * tranzacția acțiunii.
 */

/** Ce citește serverul din tokenul omului (verificat de Firebase la intrarea în callable). */
export interface TokenCont {
  readonly email?: unknown;
  readonly email_verified?: unknown;
  readonly name?: unknown;
}

const obiect = (x: unknown): Record<string, unknown> => (typeof x === 'object' && x !== null && !Array.isArray(x) ? x as Record<string, unknown> : {});
const ms = (x: unknown): number | null => (x instanceof Timestamp ? x.toMillis() : null);

async function deschide(db: Firestore, uid: string, token: TokenCont | null, acum: Date): Promise<RaspunsDeschide> {
  const email = normalizeazaEmail(token?.email);
  if (!email) throw new HttpsError('failed-precondition', 'contul n-are o adresă de e-mail');
  // Proba pornește doar cu adresa confirmată (Google o dă confirmată); până atunci, contul nu există încă la noi.
  if (token?.email_verified !== true) return { ok: true, verificat: false, email };
  return db.runTransaction(async (tx) => {
    const drepturi = await drepturiIn(tx, db, uid);
    const ref = db.collection(COLECTIE_CONTURI).doc(uid);
    const c = await tx.get(ref);
    const s = await tx.get(db.collection(CALE_SETARI.colectie).doc(CALE_SETARI.id));
    const setari = setariDin(s.exists ? s.data() : undefined);
    const t = acum.getTime();
    const cand = Timestamp.fromDate(acum);
    let tinut: unknown = c.get('plan');
    let probaPana = ms(c.get('probaPana'));
    let nume = curataNume(c.get('nume'));
    if (!c.exists) {
      tinut = 'proba';
      probaPana = t + ZILE_PROBA * ZI_MS;
      nume = curataNume(token.name) ?? curataNume(email.split('@')[0]) ?? 'cont';
    }
    const drept = dreptDin(planEfectiv(tinut, probaPana, drepturi.owner || drepturi.permisiuni.size > 0, t), probaPana, setari.zileOffline, t);
    if (!c.exists) {
      tx.create(ref, {
        schema: 1, email, nume, creatLa: cand, ultimaLogare: cand, plan: 'proba', probaPana: Timestamp.fromMillis(probaPana ?? t), drept,
      });
      scrieAudit(tx, db, {
        cand, cine: uid, rol: drepturi.rol, actiune: 'conturi.creeaza', tinta: `${COLECTIE_CONTURI}/${uid}`, inainte: null,
        dupa: { email, plan: 'proba', probaPana },
      });
    } else {
      // Adresa poate fi schimbată în Auth (ADR 0049 §6); documentul o urmează, ca fila Utilizatori să caute după cea de azi.
      tx.update(ref, { email, ultimaLogare: cand, drept, ...(nume === null ? { nume: 'cont' } : {}) });
    }
    return { ok: true, verificat: true, email, nume: nume ?? 'cont', drept };
  });
}

async function schimbaNumele(db: Firestore, uid: string, d: Record<string, unknown>, acum: Date): Promise<RaspunsNume> {
  const nume = curataNume(d['nume']);
  if (nume === null) throw new HttpsError('invalid-argument', `numele are 1–${NUME_MAX} de caractere, fără caractere de control`);
  return db.runTransaction(async (tx) => {
    // Toate citirile tranzacției înaintea scrierilor (Firestore o cere).
    const drepturi = await drepturiIn(tx, db, uid);
    const ref = db.collection(COLECTIE_CONTURI).doc(uid);
    const c = await tx.get(ref);
    if (!c.exists) throw new HttpsError('failed-precondition', 'contul nu e deschis încă; confirmă adresa');
    const inainte: unknown = c.get('nume');
    if (inainte === nume) return { ok: true, schimbat: false, nume };
    const cand = Timestamp.fromDate(acum);
    tx.update(ref, { nume });
    scrieAudit(tx, db, {
      cand, cine: uid, rol: drepturi.rol, actiune: 'conturi.nume', tinta: `${COLECTIE_CONTURI}/${uid}`, inainte: { nume: inainte ?? null },
      dupa: { nume },
    });
    return { ok: true, schimbat: true, nume };
  });
}

/** Callable-ul `cont`: `{ actiune: 'deschide' }` sau `{ actiune: 'nume', nume }`; refuzurile sunt `HttpsError`-uri cu motivul. */
export async function trateazaContul(
  db: Firestore, uid: string | null, token: TokenCont | null, data: unknown, acum: Date = new Date(),
): Promise<RaspunsDeschide | RaspunsNume> {
  if (!uid) throw new HttpsError('unauthenticated', 'intră în cont');
  const d = obiect(data);
  const actiune = d['actiune'];
  try {
    switch (actiune) {
      case 'deschide': return await deschide(db, uid, token, acum);
      case 'nume': return await schimbaNumele(db, uid, d, acum);
      default: throw new HttpsError('invalid-argument', 'acțiunea');
    }
  } catch (e) {
    if (e instanceof HttpsError) throw e;
    await logServerError('callable:cont', e, { uid, actiune: typeof actiune === 'string' ? actiune.slice(0, 40) : null }, db, acum);
    throw new HttpsError('internal', 'acțiunea n-a reușit; eroarea e în jurnal');
  }
}
