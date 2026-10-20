import type { Firestore, Transaction } from 'firebase-admin/firestore';
import { COLECTII_PERSONAL, esteIdRol, OWNER, permisiuniDin, type Permisiune } from '../../../shared/personal.ts';

/** Rolul unui om și ce poate (ADR 0049 §3). */
export interface Drepturi {
  readonly rol: string | null;
  readonly owner: boolean;
  readonly permisiuni: ReadonlySet<Permisiune>;
}

/**
 * Drepturile unui om, citite în tranzacția cererii, din aceleași două documente ca regulile: `staff/{uid}`, apoi
 * `roluri/{rol}`. Nu din token (ar fi a doua sursă, care întârzie). Un rol necunoscut nu dă nimic.
 */
export async function drepturiIn(tx: Transaction, db: Firestore, uid: string): Promise<Drepturi> {
  const s = await tx.get(db.collection(COLECTII_PERSONAL.staff).doc(uid));
  const rol: unknown = s.exists ? s.get('rol') : undefined;
  if (rol === OWNER) return { rol, owner: true, permisiuni: permisiuniDin(OWNER, undefined) };
  if (!esteIdRol(rol)) return { rol: typeof rol === 'string' ? rol : null, owner: false, permisiuni: new Set() };
  const r = await tx.get(db.collection(COLECTII_PERSONAL.roluri).doc(rol));
  return { rol, owner: false, permisiuni: permisiuniDin(rol, r.exists ? r.get('permisiuni') : undefined) };
}
