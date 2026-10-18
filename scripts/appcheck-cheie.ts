/**
 * Cheia App Check a instanței, citită la publicare (felia 3.2, ADR 0043 §7; `docs/faza2/admin/RAPORT.md` §5.1, punctul 6):
 * din înregistrarea App Check a aplicației web (`recaptchaEnterpriseConfig` → `siteKey`), nu din repo. Același artefact
 * servește testul și live-ul; fiecare instanță își primește cheia în `config.json`.
 *
 * Nu există comandă CLI pentru citire: se folosește clientul API al firebase-tools instalat global (`firebase-api.ts`,
 * aceeași identitate ca la publicări), doar cu GET. Citirea primește clientul (`citesteCheie`, injectat în teste); clasificarea răspunsului și
 * textul `config.json` publicat sunt pure. Strict (recenzia 17.10): un răspuns de altă formă sau o cheie strâmbă opresc
 * publicarea, nu devin „neînregistrat”.
 */
import { citesteConfig } from '../src/app/config.ts';
import { clientFirebaseTools } from './firebase-api.ts';

export type CheieAppCheck =
  | { readonly stare: 'inregistrata'; readonly cheieSite: string }
  | { readonly stare: 'neinregistrata' }
  | { readonly stare: 'eroare'; readonly motiv: string };

/** O cheie de site reCAPTCHA (40 de caractere la Google): litere, cifre, `-`, `_`. */
const CHEIE_SITE = /^[A-Za-z0-9_-]{20,100}$/;
const NUME_CONFIG = /\/recaptchaEnterpriseConfig$/;

const eroare = (motiv: string): CheieAppCheck => ({ stare: 'eroare', motiv });

/**
 * Din răspunsul lui `GET .../apps/<appId>/recaptchaEnterpriseConfig`:
 * - 200, obiectul configurației (`name` = `.../recaptchaEnterpriseConfig`) cu o cheie de forma bună = înregistrată;
 * - 404, sau obiectul configurației fără `siteKey` (doar numele și TTL-ul) = neînregistrată (avertisment);
 * - orice altceva (drepturi, un corp de altă formă, o cheie strâmbă) = eroare de citire (publicarea se oprește).
 */
export function cheieDinRaspuns(status: number, corp: unknown): CheieAppCheck {
  if (status === 404) return { stare: 'neinregistrata' };
  if (status !== 200) return eroare(`HTTP ${status}`);
  // Un tablou trece de aici, dar n-are `name`: îl refuză verificarea de mai jos.
  if (typeof corp !== 'object' || corp === null) return eroare('răspunsul nu e un obiect');
  const { name, siteKey } = corp as { name?: unknown; siteKey?: unknown };
  if (typeof name !== 'string' || !NUME_CONFIG.test(name)) return eroare('răspunsul nu e o configurație recaptchaEnterpriseConfig');
  if (siteKey === undefined || siteKey === '') return { stare: 'neinregistrata' };
  if (typeof siteKey !== 'string' || !CHEIE_SITE.test(siteKey)) return eroare('siteKey nu are forma unei chei reCAPTCHA');
  return { stare: 'inregistrata', cheieSite: siteKey };
}

export interface ConfigWeb {
  readonly apiKey: string;
  readonly authDomain: string;
  readonly projectId: string;
  readonly appId: string;
}

export interface ConfigPublicare {
  readonly instanta: string;
  readonly firebase: ConfigWeb;
  readonly appCheck?: { readonly cheieSite: string };
}

/**
 * `config.json` al instanței. Neînregistrată: fără `appCheck`, cu avertismentul (nu e eșec: aplicația merge, raportorul
 * primește 401 și se stinge liniștit). O eroare de citire aruncă: o publicare care ar scoate tăcut App Check de pe o
 * instanță care îl are ar opri raportorul și „Rezolvat” fără să spună nimănui.
 */
export function configInstanta(instanta: string, firebase: ConfigWeb, cheie: CheieAppCheck): { config: ConfigPublicare; avertisment: string | null } {
  if (cheie.stare === 'eroare') throw new Error(`cheia App Check a proiectului ${firebase.projectId} nu s-a putut citi: ${cheie.motiv}`);
  if (cheie.stare === 'neinregistrata') {
    return {
      config: { instanta, firebase },
      avertisment: `App Check neînregistrat pe ${firebase.projectId} (aplicația ${firebase.appId}): raportorul de erori va primi 401, iar „Rezolvat” din /admin rămâne oprit. Pasul owner-ului: consola Firebase → App Check → aplicația web → reCAPTCHA Enterprise, cu cheia instanței.`,
    };
  }
  return { config: { instanta, firebase, appCheck: { cheieSite: cheie.cheieSite } }, avertisment: null };
}

/**
 * Textul exact al `config.json` publicat (pur; `pregateste-publicare.ts` îl scrie neatins). Trece prin schema aplicației
 * (`citesteConfig`): un config pe care pagina l-ar refuza (și ar pierde Firebase cu totul) oprește publicarea aici.
 */
export function configPublicat(instanta: string, firebase: ConfigWeb, cheie: CheieAppCheck): { json: string; avertisment: string | null } {
  const { config, avertisment } = configInstanta(instanta, firebase, cheie);
  const json = `${JSON.stringify(config)}\n`;
  const citit = citesteConfig(json);
  if (!citit.ok) throw new Error(`config.json publicat ar fi refuzat de aplicație: ${citit.motiv}`);
  return { json, avertisment };
}

/** Cât folosim din `apiv2.Client` al firebase-tools: un status ≥ 400 aruncă, afară de `resolveOnHTTPError: true`. */
export interface ClientApi {
  get(url: string, optiuni?: { resolveOnHTTPError?: boolean }): Promise<{ status: number; body: unknown }>;
}

const motivDin = (e: unknown): string => (e instanceof Error ? e.message : String(e)).slice(0, 300);

/** Citirea cu un client dat: doar GET; orice aruncare a clientului (rețea, drepturi) = eroare de citire. */
export async function citesteCheie(client: ClientApi, proiect: string, appId: string): Promise<CheieAppCheck> {
  try {
    const r = await client.get(`/projects/${proiect}/apps/${appId}/recaptchaEnterpriseConfig`, { resolveOnHTTPError: true });
    return cheieDinRaspuns(r.status, r.body);
  } catch (e) {
    return eroare(motivDin(e));
  }
}

/** Citirea la publicare: clientul firebase-tools, apoi `citesteCheie`. */
export async function citesteCheieAppCheck(proiect: string, appId: string): Promise<CheieAppCheck> {
  let client: ClientApi;
  try {
    client = await clientFirebaseTools('https://firebaseappcheck.googleapis.com');
  } catch (e) {
    return eroare(motivDin(e));
  }
  return citesteCheie(client, proiect, appId);
}
