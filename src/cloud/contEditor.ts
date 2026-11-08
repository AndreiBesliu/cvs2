import type { FirebaseApp } from 'firebase/app';
import {
  connectAuthEmulator, createUserWithEmailAndPassword, EmailAuthProvider, getAuth, GoogleAuthProvider, linkWithCredential, linkWithPopup,
  onAuthStateChanged, reauthenticateWithCredential, reauthenticateWithPopup, sendEmailVerification, sendPasswordResetEmail,
  signInWithEmailAndPassword, signInWithPopup, signOut, updatePassword, type Auth, type User,
} from 'firebase/auth';
import { httpsCallable, type Functions } from 'firebase/functions';
import type { CerereCont, RaspunsDeschide, RaspunsNume } from '../../shared/conturi.ts';
import type { CerereTichet, RaspunsRaportarileMele, RaspunsTichet } from '../../shared/tichete.ts';
import { conecteazaBaza, type ConfigCloud, type MotivFaraConexiune } from './conexiuneBaza.ts';

/**
 * Contul Firebase al aplicației (ADR 0116), singurul loc care aduce `firebase/auth`: îl folosesc panoul contului din editor
 * (cu baza conexiunii, `conexiuneBaza.ts`, fără Firestore: dreptul vine prin callable-ul `cont`) și pagina `/admin`
 * (`conexiune.ts`, care reexportă funcțiile de aici). Așa, codul contului stă într-o singură bucată, `contEditor`, doar
 * online: nu într-una împărțită de ele, cu numele fișierului din pachet, și nici în calea raportorului de erori. Sesiunea
 * contului e a originii, deci e aceeași în editor și în `/admin`.
 */

/**
 * Ce ia editorul din contractul tichetelor (raportările, ADR 0116 §C) trece pe aici, lângă apelurile lui: contractul e și el
 * împărțit cu `/admin`, deci stă în aceeași bucată, iar importul de aici îl pune înaintea modulului ăstuia. Bucata își ia
 * numele de la ultimul ei modul: fără importul ăsta s-ar fi numit după contract, nu `contEditor` (poarta build-ului o cere).
 */
export { FELURI_TICHET, PROIECT_MAX_OCTETI, TEXT_MAX, TICHETE_PE_ZI } from '../../shared/tichete.ts';

/** O legătură cu contul Firebase: a editorului (`ContEditor`) sau a paginii `/admin` (`Conexiune`). */
export interface CuCont {
  readonly auth: Auth;
}

export interface ContEditor extends CuCont {
  readonly functii: Functions;
}

/** Contul Firebase al aplicației, legat de emulatorul de cont când configurația îl numește (carantina, ADR 0040 §9). */
export function contAplicatiei(app: FirebaseApp, emulatorCont: string | undefined): Auth {
  const auth = getAuth(app);
  if (emulatorCont) connectAuthEmulator(auth, emulatorCont, { disableWarnings: true });
  return auth;
}

export type RezultatContEditor = { readonly ok: true; readonly cont: ContEditor } | { readonly ok: false; readonly motiv: MotivFaraConexiune };

let curent: ContEditor | null = null;

/** Legătura editorului: baza conexiunii plus contul; una pe pagină. */
export function conecteazaContul(c: ConfigCloud, gazda: string = location.hostname): RezultatContEditor {
  if (curent) return { ok: true, cont: curent };
  const baza = conecteazaBaza(c, gazda);
  if (!baza.ok) return baza;
  curent = { auth: contAplicatiei(baza.conexiune.app, c.emulatoare?.auth), functii: baza.conexiune.functii };
  return { ok: true, cont: curent };
}

/* ── Logarea (editorul și `/admin`) ─────────────────────────────────────────────────────────────────────────────── */

export function intraCuGoogle(c: CuCont): Promise<unknown> {
  return signInWithPopup(c.auth, new GoogleAuthProvider());
}

export function intraCuParola(c: CuCont, email: string, parola: string): Promise<unknown> {
  return signInWithEmailAndPassword(c.auth, email, parola);
}

/** „Am uitat parola”: e-mailul de resetare, trimis de Firebase (fără să spună dacă adresa are cont). */
export function trimiteResetarea(c: CuCont, email: string): Promise<void> {
  return sendPasswordResetEmail(c.auth, email);
}

export function iesi(c: CuCont): Promise<void> {
  return signOut(c.auth);
}

export function ascultaContul(c: CuCont, a: (u: User | null) => void): () => void {
  return onAuthStateChanged(c.auth, a);
}

/** Prima stare a contului (sesiunea din browser, citită de Firebase): omul logat sau null. */
export function primaStare(c: CuCont): Promise<User | null> {
  return new Promise((gata) => {
    const opreste = onAuthStateChanged(c.auth, (u) => {
      opreste();
      gata(u);
    });
  });
}

/** Metodele de intrare ale contului (`google.com`, `password`), legate la același cont (ADR 0049 §6). */
export function metodeCont(u: User): readonly string[] {
  return u.providerData.map((p) => p.providerId);
}

/** Codul unei erori Firebase (`auth/wrong-password`, `functions/unavailable`…), sau gol. */
export function codEroare(e: unknown): string {
  const c = (e as { code?: unknown } | null)?.code;
  return typeof c === 'string' ? c : '';
}

function contCurent(c: CuCont): User & { readonly email: string } {
  const u = c.auth.currentUser;
  if (!u?.email) throw Object.assign(new Error('niciun cont cu e-mail deschis'), { code: 'cont/fara-email' });
  return u as User & { readonly email: string };
}

/* ── Metodele contului (fila Cont din `/admin`, ADR 0049 §6) ────────────────────────────────────────────────────── */

/**
 * Adaugă o parolă contului deschis (cine a intrat cu Google): aceeași adresă, același cont, nu un al doilea. Dacă intrarea
 * e prea veche, Firebase cere întâi reintrarea cu Google, apoi legătura se reia. La final, contul trebuie să aibă metoda
 * parolei, altfel e o eroare (nu un „gata” fals).
 */
export async function adaugaParola(c: CuCont, parola: string): Promise<void> {
  const u = contCurent(c);
  const leaga = async (): Promise<void> => {
    try {
      await linkWithCredential(u, EmailAuthProvider.credential(u.email, parola));
    } catch (e) {
      // Cu „un cont pe adresă”, adresa „folosită” e chiar a contului deschis: emulatorul de Auth refuză așa legarea pe
      // aceeași adresă (măsurat pe 20.10). Parola se pune atunci direct pe contul deschis, tot fără al doilea cont.
      if (codEroare(e) !== 'auth/email-already-in-use') throw e;
      await updatePassword(u, parola);
    }
  };
  try {
    await leaga();
  } catch (e) {
    if (codEroare(e) !== 'auth/requires-recent-login') throw e;
    await reauthenticateWithPopup(u, new GoogleAuthProvider());
    await leaga();
  }
  await u.reload();
  if (!metodeCont(u).includes('password')) throw Object.assign(new Error('parola nu s-a legat de cont'), { code: 'cont/parola-nelegata' });
}

/** Leagă contul Google al aceleiași adrese de contul deschis (cine are parolă). */
export async function leagaGoogle(c: CuCont): Promise<void> {
  const u = contCurent(c);
  await linkWithPopup(u, new GoogleAuthProvider());
  await u.reload();
}

/** Schimbă parola, cu cea veche (reintrarea pe care o cere Firebase). */
export async function schimbaParola(c: CuCont, veche: string, noua: string): Promise<void> {
  const u = contCurent(c);
  await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, veche));
  await updatePassword(u, noua);
}

/* ── Contul clientului (editorul, ADR 0116) ─────────────────────────────────────────────────────────────────────── */

/** Contul nou cu parolă, apoi e-mailul de confirmare (proba pornește după confirmare). */
export async function creeazaCont(c: CuCont, email: string, parola: string): Promise<void> {
  const r = await createUserWithEmailAndPassword(c.auth, email, parola);
  await sendEmailVerification(r.user);
}

export async function retrimiteConfirmarea(c: CuCont): Promise<void> {
  const u = c.auth.currentUser;
  if (u) await sendEmailVerification(u);
}

/**
 * Deschiderea contului pe server: contul nou cu proba lui, sau dreptul de azi. Tokenul se cere proaspăt, ca o adresă confirmată
 * între timp (linkul din e-mail) să ajungă la server confirmată.
 */
export async function deschideContul(ce: ContEditor): Promise<RaspunsDeschide> {
  const u = ce.auth.currentUser;
  if (u) {
    await u.reload();
    await u.getIdToken(true);
  }
  return (await httpsCallable<CerereCont, RaspunsDeschide>(ce.functii, 'cont')({ actiune: 'deschide' })).data;
}

export async function schimbaNumele(ce: ContEditor, nume: string): Promise<RaspunsNume> {
  return (await httpsCallable<CerereCont, RaspunsNume>(ce.functii, 'cont')({ actiune: 'nume', nume })).data;
}

/**
 * O raportare din editor (ADR 0116 §11), prin callable-ul `tichete`; refuzurile vin cu motivul. Cu proiectul atașat (§12),
 * cererea poate avea câțiva MB: termenul e cât al funcției (120 s), nu cele 70 s implicite ale clientului.
 */
export async function trimiteRaportarea(ce: ContEditor, cerere: Extract<CerereTichet, { actiune: 'raporteaza' }>): Promise<RaspunsTichet> {
  return (await httpsCallable<CerereTichet, RaspunsTichet>(ce.functii, 'tichete', { timeout: 125_000 })(cerere)).data;
}

/** Raportările omului, cu răspunsurile echipei (ADR 0116 §14). */
export async function raportarileMele(ce: ContEditor): Promise<RaspunsRaportarileMele> {
  return (await httpsCallable<CerereTichet, RaspunsRaportarileMele>(ce.functii, 'tichete')({ actiune: 'mele' })).data;
}

/** Răspunsurile unei raportări, citite de autor: semnul din meniul contului se stinge. */
export async function marcheazaCitita(ce: ContEditor, id: string): Promise<RaspunsTichet> {
  return (await httpsCallable<CerereTichet, RaspunsTichet>(ce.functii, 'tichete')({ actiune: 'citit', id })).data;
}

/**
 * Reconfirmarea de la pornire (ADR 0116 §8), când aplicația ține un cont: sesiunea din browser, apoi dreptul de azi de la
 * server. `null`: nimeni logat (contul a ieșit, de pildă din `/admin`); `indisponibil`: instanța n-are Firebase.
 */
export async function reconfirma(c: ConfigCloud): Promise<{ readonly uid: string; readonly raspuns: RaspunsDeschide } | null | 'indisponibil'> {
  const x = conecteazaContul(c);
  if (!x.ok) return 'indisponibil';
  const u = await primaStare(x.cont);
  if (!u) return null;
  return { uid: u.uid, raspuns: await deschideContul(x.cont) };
}
