import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { scrieAudit } from '../audit.ts';
import { drepturiIn } from '../personal/drepturi.ts';
import { logServerError } from './jurnal.ts';
import { COLECTIE } from './scrie.ts';

export { COLECTIE_AUDIT } from '../audit.ts';

export type RaspunsMarcare = { readonly ok: true; readonly schimbat: boolean };

const AMPRENTA = /^[0-9a-f]{32}$/;

/**
 * „Rezolvat” / „Redeschide” pe un grup de erori (ADR 0040 §4), cu permisiunea `erori.rezolva` (ADR 0049). Rolul se
 * citește din `staff/{uid}` și `roluri/{rol}` în aceeași tranzacție cu scrierea, nu din token; auditul se scrie tot acolo,
 * cu valoarea dinainte. Aceeași valoare nu e o comandă: nu
 * scrie nimic. Refuzurile sunt `HttpsError`-uri cu motivul; o cădere neașteptată ajunge în jurnal și iese `internal`.
 */
export async function marcheazaEroarea(db: Firestore, uid: string | null, data: unknown, acum: Date = new Date()): Promise<RaspunsMarcare> {
  if (!uid) throw new HttpsError('unauthenticated', 'intră în cont');
  const d = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>;
  const amprenta = d['amprenta'];
  const rezolvat = d['rezolvat'];
  if (typeof amprenta !== 'string' || !AMPRENTA.test(amprenta) || typeof rezolvat !== 'boolean') {
    throw new HttpsError('invalid-argument', 'cererea are nevoie de amprenta grupului și de rezolvat: true / false');
  }
  try {
    return await db.runTransaction(async (tx): Promise<RaspunsMarcare> => {
      const drepturi = await drepturiIn(tx, db, uid);
      if (!drepturi.permisiuni.has('erori.rezolva')) throw new HttpsError('permission-denied', 'rolul tău nu poate marca erorile');
      const grup = db.collection(COLECTIE).doc(amprenta);
      const g = await tx.get(grup);
      if (!g.exists) throw new HttpsError('not-found', 'grupul de erori nu există');
      const inainte = g.get('rezolvat') === true;
      if (inainte === rezolvat) return { ok: true, schimbat: false };
      const cand = Timestamp.fromDate(acum);
      tx.update(grup, { rezolvat, marcatDe: uid, marcatLa: cand });
      scrieAudit(tx, db, {
        cand, cine: uid, rol: drepturi.rol, actiune: 'erori.marcheaza', tinta: `${COLECTIE}/${amprenta}`,
        inainte: { rezolvat: inainte }, dupa: { rezolvat },
      });
      return { ok: true, schimbat: true };
    });
  } catch (e) {
    if (e instanceof HttpsError) throw e;
    await logServerError('callable:marcheazaEroarea', e, { uid, amprenta, rezolvat }, db, acum);
    throw new HttpsError('internal', 'marcarea n-a reușit; eroarea e în jurnal');
  }
}
