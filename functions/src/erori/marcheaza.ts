import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { nivelRol } from '../../../shared/personal.ts';
import { logServerError } from './jurnal.ts';
import { COLECTIE } from './scrie.ts';

/** Colecția auditului (ADR 0040 §4): cine, ce, ținta, valoarea dinainte și cea de după; scrisă doar de server. */
export const COLECTIE_AUDIT = 'audit';

export type RaspunsMarcare = { readonly ok: true; readonly schimbat: boolean };

const AMPRENTA = /^[0-9a-f]{32}$/;

/**
 * „Rezolvat” / „Redeschide” pe un grup de erori (ADR 0040 §4). Rolul se citește din `staff/{uid}` în aceeași tranzacție
 * cu scrierea, nu din token; auditul se scrie tot acolo, cu valoarea dinainte. Aceeași valoare nu e o comandă: nu
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
      const staff = db.collection('staff').doc(uid);
      const grup = db.collection(COLECTIE).doc(amprenta);
      const [s, g] = await tx.getAll(staff, grup);
      const rol: unknown = s?.exists ? s.get('rol') : undefined;
      if (nivelRol(rol) < 1) throw new HttpsError('permission-denied', 'contul nu e în personal');
      if (!g?.exists) throw new HttpsError('not-found', 'grupul de erori nu există');
      const inainte = g.get('rezolvat') === true;
      if (inainte === rezolvat) return { ok: true, schimbat: false };
      const cand = Timestamp.fromDate(acum);
      tx.update(grup, { rezolvat, marcatDe: uid, marcatLa: cand });
      tx.create(db.collection(COLECTIE_AUDIT).doc(), {
        schema: 1, cand, cine: uid, rol, actiune: 'erori.marcheaza', tinta: `${COLECTIE}/${amprenta}`,
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
