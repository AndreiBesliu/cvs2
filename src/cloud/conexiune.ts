import {
  connectAuthEmulator, EmailAuthProvider, getAuth, GoogleAuthProvider, linkWithCredential, linkWithPopup, onAuthStateChanged,
  reauthenticateWithCredential, reauthenticateWithPopup, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup,
  signOut, updatePassword, type Auth, type User,
} from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import type { CererePersonal, RaspunsInvitatie, RaspunsPersonal } from '../../shared/personal.ts';
import type { CerereSugestie, RaspunsSugestie } from '../../shared/sugestii.ts';
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

export function intraCuParola(c: Conexiune, email: string, parola: string): Promise<unknown> {
  return signInWithEmailAndPassword(c.auth, email, parola);
}

/** „Am uitat parola”: e-mailul de resetare, trimis de Firebase (fără să spună dacă adresa are cont). */
export function trimiteResetarea(c: Conexiune, email: string): Promise<void> {
  return sendPasswordResetEmail(c.auth, email);
}

/** Metodele de intrare ale contului (`google.com`, `password`), legate la același cont (ADR 0049 §6). */
export function metodeCont(u: User): readonly string[] {
  return u.providerData.map((p) => p.providerId);
}

const codFirebase = (e: unknown): string => {
  const c = (e as { code?: unknown } | null)?.code;
  return typeof c === 'string' ? c : '';
};

function contCurent(c: Conexiune): User & { readonly email: string } {
  const u = c.auth.currentUser;
  if (!u?.email) throw Object.assign(new Error('niciun cont cu e-mail deschis'), { code: 'cont/fara-email' });
  return u as User & { readonly email: string };
}

/**
 * Adaugă o parolă contului deschis (cine a intrat cu Google): aceeași adresă, același cont, nu un al doilea. Dacă intrarea
 * e prea veche, Firebase cere întâi reintrarea cu Google, apoi legătura se reia. La final, contul trebuie să aibă metoda
 * parolei, altfel e o eroare (nu un „gata” fals).
 */
export async function adaugaParola(c: Conexiune, parola: string): Promise<void> {
  const u = contCurent(c);
  const leaga = async (): Promise<void> => {
    try {
      await linkWithCredential(u, EmailAuthProvider.credential(u.email, parola));
    } catch (e) {
      // Cu „un cont pe adresă”, adresa „folosită” e chiar a contului deschis: emulatorul de Auth refuză așa legarea pe
      // aceeași adresă (măsurat pe 20.10). Parola se pune atunci direct pe contul deschis, tot fără al doilea cont.
      if (codFirebase(e) !== 'auth/email-already-in-use') throw e;
      await updatePassword(u, parola);
    }
  };
  try {
    await leaga();
  } catch (e) {
    if (codFirebase(e) !== 'auth/requires-recent-login') throw e;
    await reauthenticateWithPopup(u, new GoogleAuthProvider());
    await leaga();
  }
  await u.reload();
  if (!metodeCont(u).includes('password')) throw Object.assign(new Error('parola nu s-a legat de cont'), { code: 'cont/parola-nelegata' });
}

/** Leagă contul Google al aceleiași adrese de contul deschis (cine are parolă). */
export async function leagaGoogle(c: Conexiune): Promise<void> {
  const u = contCurent(c);
  await linkWithPopup(u, new GoogleAuthProvider());
  await u.reload();
}

/** Schimbă parola, cu cea veche (reintrarea pe care o cere Firebase). */
export async function schimbaParola(c: Conexiune, veche: string, noua: string): Promise<void> {
  const u = contCurent(c);
  await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, veche));
  await updatePassword(u, noua);
}

export function iesi(c: Conexiune): Promise<void> {
  return signOut(c.auth);
}

export function ascultaContul(c: Conexiune, a: (u: User | null) => void): () => void {
  return onAuthStateChanged(c.auth, a);
}

/* ── Funcțiile ─────────────────────────────────────────────────────────────────────────────────────────────────── */

/** Administrarea personalului (ADR 0049): doar owner-ul; refuzurile vin cu motivul serverului. */
export async function administreazaPersonalul(c: Conexiune, cerere: CererePersonal): Promise<RaspunsPersonal> {
  return (await httpsCallable<CererePersonal, RaspunsPersonal>(c.functii, 'administreazaPersonalul')(cerere)).data;
}

/** Invitația pe adresa contului deschis (verificată): intrarea în personal, cu rolul invitației; fără ea, `{ ok: false }`. */
export async function acceptaInvitatia(c: Conexiune): Promise<RaspunsInvitatie> {
  return (await httpsCallable<null, RaspunsInvitatie>(c.functii, 'acceptaInvitatia')(null)).data;
}

/** Sugestiile personalului (ADR 0107): scrierea, editarea autorului, decizia owner-ului; refuzurile vin cu motivul serverului. */
export async function sugestii(c: Conexiune, cerere: CerereSugestie): Promise<RaspunsSugestie> {
  return (await httpsCallable<CerereSugestie, RaspunsSugestie>(c.functii, 'sugestii')(cerere)).data;
}

export async function marcheazaEroarea(c: Conexiune, amprenta: string, rezolvat: boolean): Promise<{ ok: true; schimbat: boolean }> {
  const r = await httpsCallable<{ amprenta: string; rezolvat: boolean }, { ok: true; schimbat: boolean }>(c.functii, 'marcheazaEroarea')({ amprenta, rezolvat });
  return r.data;
}
