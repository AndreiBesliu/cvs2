import { initializeApp, type FirebaseApp } from 'firebase/app';
import { CustomProvider, initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import {
  connectAuthEmulator, getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type Auth, type User,
} from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions, httpsCallable, type Functions } from 'firebase/functions';

/**
 * Conexiunea cu Firebase (ADR 0040 §2, §9): aplicația, contul, Firestore, funcțiile și App Check, din configurația citită
 * de la gazdă. Modulul se încarcă doar la cerere (adminul; raportorul de erori în 3.2): Firebase nu intră în pachetul de
 * pornire.
 */

/** Partea din `config.json` de care are nevoie conexiunea (aceeași formă ca `SchemaConfig`, fără să importe `app`). */
export interface ConfigCloud {
  readonly firebase?: { readonly apiKey: string; readonly authDomain: string; readonly projectId: string; readonly appId: string } | undefined;
  readonly appCheck?: { readonly cheieSite: string } | undefined;
  readonly emulatoare?: { readonly auth: string; readonly firestore: string; readonly functions: string } | undefined;
}

/** `recaptcha`: cheia instanței; `proba`: furnizorul de probă, doar cu emulatoare, pe gazda locală; `oprit`: fără cheie. */
export type StareAppCheck = 'recaptcha' | 'proba' | 'oprit';

export interface Conexiune {
  readonly app: FirebaseApp;
  readonly auth: Auth;
  readonly db: Firestore;
  readonly functii: Functions;
  readonly projectId: string;
  readonly appCheck: StareAppCheck;
  /** Adresa funcției `nume`, pentru proba din Diagnoză (un apel fără App Check trebuie să dea 401). */
  readonly adresaFunctiei: (nume: string) => string;
}

export const REGIUNE_FUNCTII = 'europe-central2';

export type RezultatConexiune =
  | { readonly ok: true; readonly conexiune: Conexiune }
  | { readonly ok: false; readonly motiv: 'fara-firebase' | 'emulatoare-in-afara' };

/** Gazdele pe care se acceptă emulatoarele și furnizorul App Check de probă (carantina, ADR 0040 §9). */
export function gazdaLocala(gazda: string): boolean {
  return gazda === 'localhost' || gazda === '127.0.0.1';
}

function hostPort(adresa: string): { host: string; port: number } {
  const [host = '127.0.0.1', port = '0'] = adresa.split(':');
  return { host, port: Number(port) };
}

let curenta: Conexiune | null = null;

/** O singură conexiune pe pagină: a doua cerere o întoarce pe prima. */
export function conecteaza(c: ConfigCloud, gazda: string = location.hostname): RezultatConexiune {
  if (curenta) return { ok: true, conexiune: curenta };
  if (!c.firebase) return { ok: false, motiv: 'fara-firebase' };
  if (c.emulatoare && !gazdaLocala(gazda)) return { ok: false, motiv: 'emulatoare-in-afara' };
  const app = initializeApp(c.firebase);
  let appCheck: StareAppCheck = 'oprit';
  if (c.emulatoare) {
    // Emulatorul de funcții primește orice antet App Check; tokenul fix nu pleacă niciodată spre un server adevărat,
    // fiindcă ramura asta există doar cu emulatoare, pe gazda locală.
    initializeAppCheck(app, {
      provider: new CustomProvider({ getToken: async () => ({ token: 'proba-locala', expireTimeMillis: Date.now() + 3_600_000 }) }),
      isTokenAutoRefreshEnabled: false,
    });
    appCheck = 'proba';
  } else if (c.appCheck) {
    initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(c.appCheck.cheieSite), isTokenAutoRefreshEnabled: true });
    appCheck = 'recaptcha';
  }
  const auth = getAuth(app);
  const db = getFirestore(app);
  const functii = getFunctions(app, REGIUNE_FUNCTII);
  const proiect = c.firebase.projectId;
  let adresaFunctiei = (nume: string): string => `https://${REGIUNE_FUNCTII}-${proiect}.cloudfunctions.net/${nume}`;
  if (c.emulatoare) {
    connectAuthEmulator(auth, c.emulatoare.auth, { disableWarnings: true });
    const f = hostPort(c.emulatoare.firestore);
    connectFirestoreEmulator(db, f.host, f.port);
    const fn = hostPort(c.emulatoare.functions);
    connectFunctionsEmulator(functii, fn.host, fn.port);
    adresaFunctiei = (nume) => `http://${fn.host}:${fn.port}/${proiect}/${REGIUNE_FUNCTII}/${nume}`;
  }
  curenta = { app, auth, db, functii, projectId: proiect, appCheck, adresaFunctiei };
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
