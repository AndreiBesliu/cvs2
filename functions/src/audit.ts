import type { Firestore, Timestamp, Transaction } from 'firebase-admin/firestore';

/**
 * Auditul (ADR 0040 §4): cine, rolul lui, ce, ținta, valoarea dinainte și cea de după; scris doar de server, în tranzacția
 * acțiunii (ce s-a schimbat și rândul de audit cad sau trec împreună).
 */
export const COLECTIE_AUDIT = 'audit';

export interface IntrareAudit {
  readonly cand: Timestamp;
  readonly cine: string;
  readonly rol: string | null;
  readonly actiune: string;
  readonly tinta: string;
  readonly inainte: unknown;
  readonly dupa: unknown;
}

export function scrieAudit(tx: Transaction, db: Firestore, a: IntrareAudit): void {
  tx.create(db.collection(COLECTIE_AUDIT).doc(), { schema: 1, ...a });
}
