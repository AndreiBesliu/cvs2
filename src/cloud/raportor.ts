import { getToken } from 'firebase/app-check';
import { httpsCallable } from 'firebase/functions';
import { faraInterogare, PLAFON_ADRESA, PLAFON_MESAJ, PLAFON_SCURT, PLAFON_STIVA, taie, type RaportClient, type TipEroare } from '../../shared/erori.ts';
import { conecteazaBaza, type ConfigCloud } from './conexiuneBaza.ts';

/**
 * Trimiterea unui raport de eroare spre `logClientError` (ADR 0039 §5, ADR 0043). Bucata la cerere a raportorului: o
 * aduce partea din pornire (`src/app/raportorPornire.ts`) la prima eroare nouă, cu configurația cunoscută. Aici stau
 * tokenul App Check cerut înaintea primului apel, apelul cu termenul lui și traducerea răspunsului în rezultatul pe care
 * pornirea îl judecă (trimis, refuzat, stins, reîncercat).
 *
 * Termenele sunt ale noastre, nu doar ale SDK-ului (recenzia 17.10): `@firebase/functions` pornește termenul apelului abia
 * după token, iar `@firebase/app-check` nu rezolvă niciodată tokenul dacă `enterprise.js` e blocat sau gol (scriptul are
 * doar `onload`). Fără cursele de aici, pompa pornirii ar rămâne agățată toată sesiunea, tăcut.
 */

/**
 * - `trimis`: `{ ok: true }`;
 * - `nevalid`: serverul a refuzat raportul (se numără, raportorul merge mai departe);
 * - `plafon`: plafonul de rată al serverului (raportorul se stinge pentru sesiune);
 * - `neautorizat`: 401 (App Check lipsă sau refuzat) sau 403 (invocarea publică lipsă): toate ar eșua la fel, deci stins;
 * - `retea`: cererea n-a ajuns (statusul 0, pe care SDK-ul îl face `internal [0]`; `unavailable`): o reîncercare;
 * - `termen`: niciun răspuns în `TERMEN_APEL_MS` (sau `deadline-exceeded`): fără reîncercare, serverul poate fi scris deja;
 * - `altul`: orice altceva (un 500, o scriere eșuată pe server, un răspuns de altă formă): se numără ca eșec.
 */
export type RezultatTrimitere = 'trimis' | 'nevalid' | 'plafon' | 'neautorizat' | 'retea' | 'termen' | 'altul';

export interface Trimitere {
  /**
   * Înaintea primului apel al sesiunii: tokenul App Check, cerut explicit, în cursă cu `TERMEN_APP_CHECK_MS`. `false`: n-a
   * venit (termen, eroare): raportorul se stinge. Fără App Check pe instanță: `true` (apelul pleacă fără token, 401). Nu aruncă.
   */
  pregateste(): Promise<boolean>;
  /** Un apel, în cursă cu `TERMEN_APEL_MS`. Nu aruncă. */
  trimite(raport: RaportClient): Promise<RezultatTrimitere>;
}

/** Forma bucății, așa cum o vede pornirea (care o importă doar ca tip și la cerere). */
export interface ModulRaportor {
  readonly creeazaTrimitere: (config: ConfigCloud) => Trimitere | null;
  readonly raportDin: typeof raportDin;
}

/** Ce ia raportul dintr-o intrare a jurnalului local (`IntrareEroare`, fără dependența de aplicație). */
export interface IntrareRaport {
  readonly tip: TipEroare;
  readonly mesaj: string;
  readonly stiva: string;
  readonly adresa: string;
}

/** Mesajul unui raport fără text (`throw ''`): serverul refuză un mesaj gol, deci eroarea s-ar pierde. */
export const MESAJ_GOL = 'eroare fără mesaj';

/**
 * Textul trimis, curățat (apărare în adâncime; jurnalul local rămâne neatins): query-ul și fragmentul adreselor (orice
 * protocol, și cu majuscule: `HTTPS://`, `wss://`) devin „?…”, iar poziția din stivă de la capăt (`:linie:coloană`, cu
 * paranteza) rămâne; adresele de e-mail, și cele codificate (`%40`), devin `<email>`. Regexurile sunt liniare: protocolul
 * are cel mult 20 de caractere, partea locală a e-mailului cel mult 64 (RFC 5321), iar adresa se ia dintr-o trecere și se
 * taie în funcție (reverificarea 3.2).
 */
export function curataText(s: string): string {
  return s
    .replace(/\b[a-z][a-z0-9+.-]{0,19}:\/\/[^\s"'`<>]*/gi, (a) => {
      const k = a.search(/[?#]/);
      if (k < 0) return a;
      const coada = /(?::\d+){0,2}\)?$/.exec(a.slice(k))?.[0] ?? '';
      return `${a.slice(0, k)}?…${coada}`;
    })
    .replace(/(?<![\w.+-])[\w.+-]{1,64}(?:@|%40)[\w-]{1,63}(?:\.[\w-]{1,63}){1,8}/gi, '<email>');
}

/** Raportul (`RaportClient`, ADR 0039 §5): doar câmpurile contractului, curățate și tăiate la plafoanele lui. */
export function raportDin(i: IntrareRaport, build: string, browser: string, limba: string): RaportClient {
  const mesaj = curataText(i.mesaj);
  return {
    tip: i.tip,
    mesaj: taie(mesaj.trim() ? mesaj : MESAJ_GOL, PLAFON_MESAJ),
    stiva: taie(curataText(i.stiva), PLAFON_STIVA),
    adresa: taie(faraInterogare(i.adresa), PLAFON_ADRESA),
    build: taie(build, PLAFON_SCURT),
    browser: taie(browser, PLAFON_SCURT),
    limba: taie(limba, PLAFON_SCURT),
  };
}

/** Termenul unui apel, de la cerere (cu tot cu token) la răspuns: acoperă pornirea la rece a funcției. */
export const TERMEN_APEL_MS = 30_000;
/** Termenul tokenului App Check (reCAPTCHA Enterprise: scriptul, cadrul, schimbul). */
export const TERMEN_APP_CHECK_MS = 10_000;

/** Pornește un ceas și întoarce oprirea lui (injectat în teste). */
export type Amana = (f: () => void, ms: number) => () => void;

const amanaReal: Amana = (f, ms) => {
  const id = setTimeout(f, ms);
  return () => { clearTimeout(id); };
};

/** Rezultatul lui `f`, sau `rezerva` după `ms`; o respingere (sau o aruncare sincronă) trece prin `laEroare`. */
function cursa<T>(f: () => Promise<T>, ms: number, rezerva: T, laEroare: (e: unknown) => T, amana: Amana): Promise<T> {
  return new Promise<T>((ok) => {
    const opreste = amana(() => { ok(rezerva); }, ms);
    Promise.resolve().then(f).then(
      (x) => { opreste(); ok(x); },
      (e: unknown) => { opreste(); ok(laEroare(e)); },
    );
  });
}

/** Răspunsul serverului (`{ ok: true }` sau `{ ok: false, motiv }`), tradus. */
export function dinRaspuns(x: unknown): RezultatTrimitere {
  if (typeof x !== 'object' || x === null) return 'altul';
  const r = x as { ok?: unknown; motiv?: unknown };
  if (r.ok === true) return 'trimis';
  if (r.ok !== false) return 'altul';
  if (r.motiv === 'nevalid') return 'nevalid';
  if (r.motiv === 'plafon') return 'plafon';
  return 'altul';
}

/** O eroare a apelului (`FunctionsError`, cu `code` = `functions/<cod>` și mesajul `<descriere> [<status HTTP>]`), tradusă. */
export function dinEroare(e: unknown): RezultatTrimitere {
  const o = typeof e === 'object' && e !== null ? (e as { code?: unknown; message?: unknown }) : {};
  if (typeof o.code !== 'string') return 'altul';
  const cod = o.code.startsWith('functions/') ? o.code.slice('functions/'.length) : o.code;
  if (cod === 'unauthenticated' || cod === 'permission-denied') return 'neautorizat';
  if (cod === 'deadline-exceeded') return 'termen';
  // Doar o cerere care n-a ajuns se reîncearcă: `fetch` căzut (statusul 0, `internal [0]`) sau 503. Un 500 a ajuns.
  if (cod === 'unavailable' || (cod === 'internal' && typeof o.message === 'string' && o.message.endsWith('[0]'))) return 'retea';
  return 'altul';
}

export interface DepsTrimitere {
  /** Apelul lui `logClientError` (`httpsCallable`). */
  readonly apel: (raport: RaportClient) => Promise<{ readonly data: unknown }>;
  /** Tokenul App Check, cerut explicit (`getToken`); `null`: instanța n-are App Check. */
  readonly token: (() => Promise<unknown>) | null;
  readonly amana?: Amana;
}

/** Trimiterea peste un apel și un token date (în teste, falsuri); cursele și traducerea sunt cele adevărate. */
export function trimitereDin(d: DepsTrimitere): Trimitere {
  const amana = d.amana ?? amanaReal;
  const token = d.token;
  return {
    pregateste: () => (token
      ? cursa(() => token().then(() => true), TERMEN_APP_CHECK_MS, false, () => false, amana)
      : Promise.resolve(true)),
    trimite: (raport) => cursa(() => d.apel(raport).then((r) => dinRaspuns(r.data)), TERMEN_APEL_MS, 'termen', dinEroare, amana),
  };
}

/**
 * Trimiterea, peste baza conexiunii (aplicația, App Check, funcțiile; aceeași cu a paginii `/admin`, deci acolo apelul
 * poartă tokenul contului). Fără conexiune (fără Firebase, emulatoare în afara gazdei locale): `null`.
 */
export function creeazaTrimitere(config: ConfigCloud, gazda: string = location.hostname): Trimitere | null {
  const c = conecteazaBaza(config, gazda);
  if (!c.ok) return null;
  const apel = httpsCallable<RaportClient, unknown>(c.conexiune.functii, 'logClientError', { timeout: TERMEN_APEL_MS });
  const ac = c.conexiune.instantaAppCheck;
  return trimitereDin({ apel, token: ac ? () => getToken(ac) : null });
}
