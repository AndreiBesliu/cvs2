import {
  connectAuthEmulator, getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type Auth, type User,
} from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { conecteazaBaza, hostPort, type ConexiuneBaza, type ConfigCloud, type MotivFaraConexiune } from './conexiuneBaza.ts';

/**
 * Conexiunea paginii `/admin` (ADR 0040 §2, §9): baza (aplicația, App Check, funcțiile; `conexiuneBaza.ts`, împărțită cu
 * raportorul de erori) plus contul și Firestore. Modulul se încarcă doar la cerere: Firebase nu intră în pachetul de
 * pornire.
 */

export { gazdaLocala, REGIUNE_FUNCTII, type ConfigCloud, type StareAppCheck } from './conexiuneBaza.ts';

export interface Conexiune extends ConexiuneBaza {
  readonly auth: Auth;
  readonly db: Firestore;
}

export type RezultatConexiune =
  | { readonly ok: true; readonly conexiune: Conexiune }
  | { readonly ok: false; readonly motiv: MotivFaraConexiune };

let curenta: Conexiune | null = null;

/** O singură conexiune pe pagină: a doua cerere o întoarce pe prima. Baza poate exista deja (raportorul a trimis întâi). */
export function conecteaza(c: ConfigCloud, gazda: string = location.hostname): RezultatConexiune {
  if (curenta) return { ok: true, conexiune: curenta };
  const baza = conecteazaBaza(c, gazda);
  if (!baza.ok) return baza;
  const auth = getAuth(baza.conexiune.app);
  const db = getFirestore(baza.conexiune.app);
  if (c.emulatoare) {
    connectAuthEmulator(auth, c.emulatoare.auth, { disableWarnings: true });
    const f = hostPort(c.emulatoare.firestore);
    connectFirestoreEmulator(db, f.host, f.port);
  }
  curenta = { ...baza.conexiune, auth, db };
  return { ok: true, conexiune: curenta };
}

/* ── Contul ─────────────────────────────────────────────────────────────────────────────────────────────────────── */

export function intraCuGoogle(c: Conexiune): Promise<unknown> {
  return signInWithPopup(c.auth, new GoogleAuthProvider());
}

export function iesi(c: Conexiune): Promise<void> {
  return signOut(c.auth);
}

export function ascultaContul(c: Conexiune, a: (u: User | null) => void): () => void {
  return onAuthStateChanged(c.auth, a);
}

/* ── Funcțiile ─────────────────────────────────────────────────────────────────────────────────────────────────── */

export async function marcheazaEroarea(c: Conexiune, amprenta: string, rezolvat: boolean): Promise<{ ok: true; schimbat: boolean }> {
  const r = await httpsCallable<{ amprenta: string; rezolvat: boolean }, { ok: true; schimbat: boolean }>(c.functii, 'marcheazaEroarea')({ amprenta, rezolvat });
  return r.data;
}
