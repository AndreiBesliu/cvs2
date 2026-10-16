/**
 * Contractul jurnalului de erori (ADR 0039), comun clientului și serverului: tipurile, plafoanele, validarea raportului
 * trimis de client, descrierea valorilor aruncate și cheia amprentei. Pur: nu importă nimic, deci intră și în
 * funcții (`functions/src`), și în aplicație, fără Firebase.
 */

/** `proiect`: proiectul salvat nu s-a putut deschide; `salvare`: o scriere în IndexedDB a eșuat. */
export const TIPURI_EROARE = ['randare', 'fereastra', 'promisiune', 'config', 'proiect', 'salvare', 'import'] as const;
export type TipEroare = (typeof TIPURI_EROARE)[number];

export const PLAFON_MESAJ = 1_000;
export const PLAFON_STIVA = 4_000;
/** Adresa paginii, fără query și fără fragment. */
export const PLAFON_ADRESA = 500;
/** Build-ul, browserul și limba. */
export const PLAFON_SCURT = 200;
/** Contextul unei erori de server, ca JSON. */
export const PLAFON_CONTEXT = 2_000;
/** Mesajul normalizat din cheia amprentei. */
export const PLAFON_NORMALIZAT = 300;
/** Câți oameni distincți ține un grup; „50” înseamnă „50 sau mai mulți”. */
export const PLAFON_OAMENI = 50;

/** Plafonul de rată pe oră (ADR 0039 §5): pe IP, pe tot proiectul pentru client și, separat, pentru server. */
export const PLAFON_RATA = { peIp: 40, globalClient: 2_000, globalServer: 2_000 } as const;
export const RETENTIE_ZILE = 90;

export type Sursa = 'client' | 'server';

/** Ce trimite clientul. Instanța și ora le pune serverul. */
export interface RaportClient {
  readonly tip: TipEroare;
  readonly mesaj: string;
  readonly stiva: string;
  readonly adresa: string;
  readonly build: string;
  readonly browser: string;
  readonly limba: string;
}

export type RezultatValidare = { readonly ok: true; readonly raport: RaportClient } | { readonly ok: false; readonly motiv: string };

/** Tăietura comună: textul lung păstrează începutul și spune cât a pierdut. */
export function taie(text: string, plafon: number): string {
  return text.length <= plafon ? text : `${text.slice(0, plafon)}… (+${text.length - plafon})`;
}

/** Adresa fără query și fără fragment: acolo pot sta date ale omului. */
export function faraInterogare(adresa: string): string {
  const i = adresa.search(/[?#]/);
  return i < 0 ? adresa : adresa.slice(0, i);
}

/** Un câmp mai lung de atât nu e o eroare tăiată, ci altceva: se refuză, nu se taie. */
const DE_REFUZAT = 64;

/**
 * Validarea raportului trimis de client. Tipurile greșite și tipul de eroare necunoscut se refuză; textele lungi se taie
 * (clientul taie și el, cu un marcaj care trece puțin de plafon); un câmp de peste `DE_REFUZAT` ori plafonul se refuză.
 */
export function valideazaRaport(x: unknown): RezultatValidare {
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return { ok: false, motiv: 'raportul nu e un obiect' };
  const o = x as Record<string, unknown>;
  const tip = o['tip'];
  if (typeof tip !== 'string' || !(TIPURI_EROARE as readonly string[]).includes(tip)) return { ok: false, motiv: 'tipul erorii' };
  const campuri = [
    ['mesaj', PLAFON_MESAJ], ['stiva', PLAFON_STIVA], ['adresa', PLAFON_ADRESA],
    ['build', PLAFON_SCURT], ['browser', PLAFON_SCURT], ['limba', PLAFON_SCURT],
  ] as const;
  const t: Record<string, string> = {};
  for (const [cheie, plafon] of campuri) {
    const v = o[cheie];
    if (typeof v !== 'string') return { ok: false, motiv: `${cheie} nu e text` };
    if (v.length > plafon * DE_REFUZAT) return { ok: false, motiv: `${cheie} e prea lung` };
    t[cheie] = taie(cheie === 'adresa' ? faraInterogare(v) : v, plafon);
  }
  if ((t['mesaj'] ?? '').trim() === '') return { ok: false, motiv: 'mesajul e gol' };
  return {
    ok: true,
    raport: {
      tip: tip as TipEroare,
      mesaj: t['mesaj'] ?? '', stiva: t['stiva'] ?? '', adresa: t['adresa'] ?? '',
      build: t['build'] ?? '', browser: t['browser'] ?? '', limba: t['limba'] ?? '',
    },
  };
}

/**
 * Descrierea unei valori aruncate (ADR 0039 §4): un `Error` devine `Nume: mesaj`, cu stiva lui; un șir rămâne șirul;
 * `null`, `undefined` și un Promise sunt numite; un obiect se descrie prin numele și mesajul lui sau prin JSON, nu prin
 * „[object Object]”. Nu aruncă niciodată.
 */
export function descrieAruncat(x: unknown): { readonly mesaj: string; readonly stiva: string } {
  try {
    if (x instanceof Error) return { mesaj: `${x.name}: ${x.message}`, stiva: x.stack ?? '' };
    if (typeof x === 'string') return { mesaj: x, stiva: '' };
    if (x === null) return { mesaj: 'null aruncat', stiva: '' };
    if (x === undefined) return { mesaj: 'undefined aruncat', stiva: '' };
    if (typeof x === 'object' && typeof (x as { then?: unknown }).then === 'function') return { mesaj: 'Promise aruncat', stiva: '' };
    if (typeof x === 'object') {
      const o = x as { name?: unknown; message?: unknown; stack?: unknown };
      if (typeof o.message === 'string') {
        const nume = typeof o.name === 'string' ? o.name : 'Obiect';
        return { mesaj: `${nume}: ${o.message}`, stiva: typeof o.stack === 'string' ? o.stack : '' };
      }
      let json: string | undefined;
      try {
        json = JSON.stringify(x);
      } catch {
        json = undefined; // circular, sau un BigInt înăuntru
      }
      return { mesaj: `obiect aruncat: ${json ?? Object.prototype.toString.call(x)}`, stiva: '' };
    }
    return { mesaj: `${typeof x} aruncat: ${String(x)}`, stiva: '' };
  } catch {
    return { mesaj: 'o valoare aruncată care nu se poate descrie', stiva: '' };
  }
}

/**
 * Mesajul normalizat pentru amprentă (ADR 0039 §3): adresele, fișierele cu hash de build, uuid-urile, id-urile lungi și
 * numerele se înlocuiesc; formularea rămâne, ca două defecte diferite să nu se contopească.
 */
export function normalizeazaMesaj(mesaj: string): string {
  return mesaj
    .replace(/\b[a-z][a-z0-9+.-]*:\/\/\S+/gi, '<adresa>')
    .replace(/\b[\w.-]+-[A-Za-z0-9_-]{6,}\.(?:m?js|css|wasm)\b/g, '<fisier>')
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '<id>')
    .replace(/\b(?=[0-9a-f]*\d)(?=[0-9a-f]*[a-f])[0-9a-f]{8,}\b/gi, '<id>')
    .replace(/\b(?=[A-Za-z0-9]*\d)(?=[A-Za-z0-9]*[A-Za-z])[A-Za-z0-9]{20,}\b/g, '<id>')
    .replace(/\d+(?:[.,]\d+)?/g, '<n>')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, PLAFON_NORMALIZAT);
}

/** Textul din care serverul face amprenta (SHA-256, primii 32 de caractere hex). */
export function cheieAmprenta(sursa: Sursa, tip: string, mesaj: string): string {
  return `${sursa}|${tip}|${normalizeazaMesaj(mesaj)}`;
}

/**
 * IP-ul apelantului: ultima intrare din `X-Forwarded-For` (cea adăugată de frontul Google; cele din stânga le poate scrie
 * oricine), altfel adresa conexiunii, altfel „necunoscut”.
 */
export function ipApelant(xff: string | undefined, ip: string | undefined): string {
  const ultima = (xff ?? '').split(',').map((s) => s.trim()).filter(Boolean).at(-1);
  return ultima ?? (ip && ip.trim() !== '' ? ip.trim() : 'necunoscut');
}

/** Fereastra plafonului de rată: ora, numărată de la epocă. */
export function oraFerestrei(ms: number): number {
  return Math.floor(ms / 3_600_000);
}
