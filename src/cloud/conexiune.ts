import type { Auth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore/lite';
import { httpsCallable } from 'firebase/functions';
import type { CerereConturi, RaspunsPlan, RaspunsSetari } from '../../shared/conturiPlan.ts';
import type { CererePersonal, RaspunsInvitatie, RaspunsPersonal } from '../../shared/personal.ts';
import type { CerereSugestie, RaspunsSugestie } from '../../shared/sugestii.ts';
import type { CerereTichet, RaspunsProiectTichet, RaspunsTichet } from '../../shared/tichete.ts';
import { conecteazaBaza, hostPort, type ConexiuneBaza, type ConfigCloud, type MotivFaraConexiune } from './conexiuneBaza.ts';
import { contAplicatiei } from './contEditor.ts';

/**
 * Conexiunea paginii `/admin` (ADR 0040 §2, §9): baza (aplicația, App Check, funcțiile; `conexiuneBaza.ts`, împărțită cu
 * raportorul de erori) plus contul și Firestore. Modulul se încarcă doar la cerere: Firebase nu intră în pachetul de
 * pornire.
 */

export { gazdaLocala, REGIUNE_FUNCTII, type ConfigCloud, type StareAppCheck } from './conexiuneBaza.ts';
// Contul Firebase stă în `contEditor.ts` (ADR 0116), împărțit cu panoul contului din editor; numele de aici rămân.
export {
  adaugaParola, ascultaContul, iesi, intraCuGoogle, intraCuParola, leagaGoogle, metodeCont, schimbaParola, trimiteResetarea,
} from './contEditor.ts';

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
  const auth = contAplicatiei(baza.conexiune.app, c.emulatoare?.auth);
  const db = getFirestore(baza.conexiune.app);
  if (c.emulatoare) {
    const f = hostPort(c.emulatoare.firestore);
    connectFirestoreEmulator(db, f.host, f.port);
  }
  curenta = { ...baza.conexiune, auth, db };
  return { ok: true, conexiune: curenta };
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

/** Răspunsul și starea unui tichet din fila Tichete (ADR 0116 §13): cu `tichete.raspunde`, pe versiunea văzută. */
export async function tichete(c: Conexiune, cerere: Extract<CerereTichet, { actiune: 'raspunde' | 'stare' }>): Promise<RaspunsTichet> {
  return (await httpsCallable<CerereTichet, RaspunsTichet>(c.functii, 'tichete')(cerere)).data;
}

/**
 * Proiectul atașat unui tichet (ADR 0116 §12, felia 15.B↑b), cui poate citi tichetul: fișierul comprimat, în base64, cu meta
 * lui. Poate avea câțiva MB: termenul e cât al funcției (120 s).
 */
export async function proiectulTichetului(c: Conexiune, id: string): Promise<RaspunsProiectTichet> {
  return (await httpsCallable<CerereTichet, RaspunsProiectTichet>(c.functii, 'tichete', { timeout: 125_000 })({ actiune: 'proiect', id })).data;
}

/** Planul unui cont din fila Utilizatori (ADR 0116 §19): cu `conturi.administreaza`, pe planul văzut; refuzurile vin cu motivul. */
export async function planulContului(c: Conexiune, cerere: Extract<CerereConturi, { actiune: 'plan' }>): Promise<RaspunsPlan> {
  return (await httpsCallable<CerereConturi, RaspunsPlan>(c.functii, 'administreazaConturile')(cerere)).data;
}

/** Setările conturilor din fila Setări (ADR 0116 §20): doar owner-ul; refuzurile vin cu motivul serverului. */
export async function setarileConturilor(c: Conexiune, cerere: Extract<CerereConturi, { actiune: 'setari' }>): Promise<RaspunsSetari> {
  return (await httpsCallable<CerereConturi, RaspunsSetari>(c.functii, 'administreazaConturile')(cerere)).data;
}

export async function marcheazaEroarea(c: Conexiune, amprenta: string, rezolvat: boolean): Promise<{ ok: true; schimbat: boolean }> {
  const r = await httpsCallable<{ amprenta: string; rezolvat: boolean }, { ok: true; schimbat: boolean }>(c.functii, 'marcheazaEroarea')({ amprenta, rezolvat });
  return r.data;
}
