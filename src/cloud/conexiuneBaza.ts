import { initializeApp, type FirebaseApp } from 'firebase/app';
import { CustomProvider, initializeAppCheck, ReCaptchaEnterpriseProvider, type AppCheck } from 'firebase/app-check';
import { connectFunctionsEmulator, getFunctions, type Functions } from 'firebase/functions';

/**
 * Baza conexiunii cu Firebase (ADR 0040 §2, §9; ADR 0043 §2): aplicația, App Check și funcțiile, din configurația citită
 * de la gazdă. O folosesc raportorul de erori (3.2, fără cont, fără Firestore) și pagina `/admin` (`conexiune.ts`, care
 * adaugă contul și Firestore peste aceeași aplicație). Se încarcă doar la cerere: Firebase nu intră în pachetul de pornire.
 *
 * Ordinea nu contează: funcțiile create înaintea contului primesc tokenul lui când el apare (componenta internă a
 * contului se creează abia odată cu `getAuth`, iar funcțiile o așteaptă), deci un raport trimis pe `/admin` după login
 * poartă uid-ul.
 */

/** Partea din `config.json` de care are nevoie conexiunea (aceeași formă ca `SchemaConfig`, fără să importe `app`). */
export interface ConfigCloud {
  readonly firebase?: { readonly apiKey: string; readonly authDomain: string; readonly projectId: string; readonly appId: string } | undefined;
  readonly appCheck?: { readonly cheieSite: string } | undefined;
  readonly emulatoare?: { readonly auth: string; readonly firestore: string; readonly functions: string } | undefined;
}

/** `recaptcha`: cheia instanței; `proba`: furnizorul de probă, doar cu emulatoare, pe gazda locală; `oprit`: fără cheie. */
export type StareAppCheck = 'recaptcha' | 'proba' | 'oprit';

export interface ConexiuneBaza {
  readonly app: FirebaseApp;
  readonly functii: Functions;
  readonly projectId: string;
  readonly appCheck: StareAppCheck;
  /** Instanța App Check (`null`: oprit), ca raportorul să ceară tokenul explicit, cu termenul lui (ADR 0043 §5). */
  readonly instantaAppCheck: AppCheck | null;
  /** Adresa funcției `nume`, pentru proba din Diagnoză (un apel fără App Check trebuie să dea 401). */
  readonly adresaFunctiei: (nume: string) => string;
}

export const REGIUNE_FUNCTII = 'europe-central2';

export type MotivFaraConexiune = 'fara-firebase' | 'emulatoare-in-afara';

export type RezultatConexiuneBaza =
  | { readonly ok: true; readonly conexiune: ConexiuneBaza }
  | { readonly ok: false; readonly motiv: MotivFaraConexiune };

/** Gazdele pe care se acceptă emulatoarele și furnizorul App Check de probă (carantina, ADR 0040 §9). */
export function gazdaLocala(gazda: string): boolean {
  return gazda === 'localhost' || gazda === '127.0.0.1';
}

export function hostPort(adresa: string): { host: string; port: number } {
  const [host = '127.0.0.1', port = '0'] = adresa.split(':');
  return { host, port: Number(port) };
}

/**
 * Carantina emulatoarelor (ADR 0040 §9): pagina pe gazda locală ȘI fiecare emulator numit (contul, Firestore, funcțiile)
 * pe gazda locală. Altfel un `config.json` cu emulatoare ar trimite rapoartele și tokenul de probă spre orice gazdă, prin
 * http (recenzia 3.2, 17.10). O adresă a contului care nu se poate citi e în afară.
 */
export function emulatoareLocale(e: NonNullable<ConfigCloud['emulatoare']>, gazda: string): boolean {
  let auth = '';
  try {
    auth = new URL(e.auth).hostname;
  } catch {
    auth = '';
  }
  return [gazda, auth, hostPort(e.firestore).host, hostPort(e.functions).host].every(gazdaLocala);
}

let curenta: ConexiuneBaza | null = null;

/** O singură aplicație pe pagină: a doua cerere (raportorul și adminul, în orice ordine) o întoarce pe prima. */
export function conecteazaBaza(c: ConfigCloud, gazda: string = location.hostname): RezultatConexiuneBaza {
  if (curenta) return { ok: true, conexiune: curenta };
  if (!c.firebase) return { ok: false, motiv: 'fara-firebase' };
  if (c.emulatoare && !emulatoareLocale(c.emulatoare, gazda)) return { ok: false, motiv: 'emulatoare-in-afara' };
  const app = initializeApp(c.firebase);
  let appCheck: StareAppCheck = 'oprit';
  let instantaAppCheck: AppCheck | null = null;
  if (c.emulatoare) {
    // Emulatorul de funcții primește orice antet App Check; tokenul fix nu pleacă niciodată spre un server adevărat,
    // fiindcă ramura asta există doar cu emulatoare locale, pe gazda locală.
    instantaAppCheck = initializeAppCheck(app, {
      provider: new CustomProvider({ getToken: async () => ({ token: 'proba-locala', expireTimeMillis: Date.now() + 3_600_000 }) }),
      isTokenAutoRefreshEnabled: false,
    });
    appCheck = 'proba';
  } else if (c.appCheck) {
    // Fără reîmprospătare în fundal (recenzia 3.2): raportorul și /admin cer tokenul când îl folosesc; altfel reCAPTCHA ar
    // evalua periodic tot restul sesiunii, și după ce raportorul s-a stins.
    instantaAppCheck = initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(c.appCheck.cheieSite), isTokenAutoRefreshEnabled: false });
    appCheck = 'recaptcha';
  }
  const functii = getFunctions(app, REGIUNE_FUNCTII);
  const proiect = c.firebase.projectId;
  let adresaFunctiei = (nume: string): string => `https://${REGIUNE_FUNCTII}-${proiect}.cloudfunctions.net/${nume}`;
  if (c.emulatoare) {
    const fn = hostPort(c.emulatoare.functions);
    connectFunctionsEmulator(functii, fn.host, fn.port);
    adresaFunctiei = (nume) => `http://${fn.host}:${fn.port}/${proiect}/${REGIUNE_FUNCTII}/${nume}`;
  }
  curenta = { app, functii, projectId: proiect, appCheck, instantaAppCheck, adresaFunctiei };
  return { ok: true, conexiune: curenta };
}
