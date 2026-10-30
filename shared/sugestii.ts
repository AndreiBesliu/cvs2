/**
 * Sugestiile personalului (ADR 0107), comune clientului și serverului: ce are o sugestie, stările deciziei owner-ului și
 * validările cererilor. Le scrie doar serverul (callable-ul `sugestii`, cu auditul în aceeași tranzacție); regulile dau
 * doar citirea: autorul își citește sugestiile lui (`sugestii.scrie`), cei cu `sugestii.citeste` și owner-ul le citesc pe
 * toate. Decizia e doar a owner-ului („iar eu sa pot decide ce sa implementam”).
 */

export const COLECTIE_SUGESTII = 'sugestii';
/** Contorul zilnic al fiecărui autor (un document pe om, rescris în ziua următoare), scris doar de server. */
export const COLECTIE_LIMITE_SUGESTII = 'limiteSugestii';

export const TIPURI_SUGESTIE = ['idee', 'problema', 'imbunatatire'] as const;
export type TipSugestie = (typeof TIPURI_SUGESTIE)[number];

/** Zona aplicației la care se referă sugestia; lipsa ei e „nespecificată”. */
export const ZONE_SUGESTIE = ['desen', 'cam', 'simulare', 'masina', 'fisiere', 'admin', 'altceva'] as const;
export type ZonaSugestie = (typeof ZONE_SUGESTIE)[number];

/**
 * Stările: `noua` până la decizia owner-ului, apoi acceptată (de făcut), amânată (mai târziu) sau respinsă, iar o sugestie
 * acceptată trece prin „în lucru” și „făcută”. Owner-ul o poate muta oricând în oricare, și înapoi în `noua`.
 */
export const STARI_SUGESTIE = ['noua', 'acceptata', 'amanata', 'respinsa', 'in-lucru', 'facuta'] as const;
export type StareSugestie = (typeof STARI_SUGESTIE)[number];

export const TITLU_MAX = 120;
export const DESCRIERE_MAX = 4000;
export const NOTA_MAX = 2000;
/** Câte sugestii scrie un om într-o zi (UTC): un cont de personal furat nu umple baza. */
export const SUGESTII_PE_ZI = 20;
/** Câte sugestii citește fila dintr-o dată; peste, ADR 0107 („Se redeschide dacă”) cere paginarea. */
export const PLAFON_LISTA_SUGESTII = 300;

/** Id-ul unei sugestii, dat de server: forma id-urilor automate ale Firestore. */
export const RE_ID_SUGESTIE = /^[A-Za-z0-9]{20}$/;

const inLista = <T extends string>(lista: readonly T[], x: unknown): x is T => typeof x === 'string' && (lista as readonly string[]).includes(x);
export const esteTip = (x: unknown): x is TipSugestie => inLista(TIPURI_SUGESTIE, x);
export const esteZona = (x: unknown): x is ZonaSugestie => inLista(ZONE_SUGESTIE, x);
export const esteStare = (x: unknown): x is StareSugestie => inLista(STARI_SUGESTIE, x);
export const esteIdSugestie = (x: unknown): x is string => typeof x === 'string' && RE_ID_SUGESTIE.test(x);
/** Versiunea pe care a văzut-o omul (1, 2, …): o cerere pe o sugestie schimbată între timp e refuzată. */
export const esteVersiune = (x: unknown): x is number => typeof x === 'number' && Number.isSafeInteger(x) && x >= 1;

/** Pură: titlul: spațiile adunate, 1…120 de caractere, fără caractere de control; null altfel. */
export function curataTitlu(x: unknown): string | null {
  if (typeof x !== 'string') return null;
  const s = x.replace(/\s+/g, ' ').trim();
  if (s === '' || [...s].length > TITLU_MAX || /[\u0000-\u001f\u007f]/.test(s)) return null;
  return s;
}

/**
 * Pură: un text pe mai multe rânduri (descrierea, nota): capetele rândurilor ca `\n`, spațiile de la capete scoase, cel
 * mult `max` caractere; rândurile și tab-ul rămân, alte caractere de control nu. Gol e voie; null altfel.
 */
export function curataText(x: unknown, max: number): string | null {
  if (typeof x !== 'string') return null;
  const s = x.replace(/\r\n?/g, '\n').trim();
  if ([...s].length > max || /[\u0000-\u0008\u000b-\u001f\u007f]/.test(s)) return null;
  return s;
}

/** Ziua UTC a unui moment (`2026-10-29`): cheia contorului zilnic. */
export const ziUtc = (d: Date): string => d.toISOString().slice(0, 10);

/**
 * Poza planșei atașată unei sugestii (ADR 0110): adusă din editor, trimisă la scriere, ținută în documentul ei
 * (`sugestii/{id}/poze/plansa`), lângă sugestie. Tipul se citește din primii octeți, nu din ce spune cererea.
 */
export const COLECTIE_POZE = 'poze';
export const ID_POZA = 'plansa';
export const POZA_MAX_OCTETI = 400 * 1024;
/** Cât are o poză la plafon, în base64 (4 caractere pe 3 octeți). */
export const POZA_MAX_BASE64 = Math.ceil(POZA_MAX_OCTETI / 3) * 4;
export type TipPoza = 'image/jpeg' | 'image/png' | 'image/webp';

/** Base64 strict: alfabetul standard, umplutura doar la capăt, lungimea multiplu de 4. */
export const RE_BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

const text4 = (o: Uint8Array, de: number): string => String.fromCharCode(...o.subarray(de, de + 4));

/** Pură: tipul unei imagini după semnătura ei (JPEG, PNG, WebP); altceva = null. */
export function tipPoza(o: Uint8Array): TipPoza | null {
  if (o.length >= 3 && o[0] === 0xff && o[1] === 0xd8 && o[2] === 0xff) return 'image/jpeg';
  if (o.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => o[i] === b)) return 'image/png';
  if (o.length >= 12 && text4(o, 0) === 'RIFF' && text4(o, 8) === 'WEBP') return 'image/webp';
  return null;
}

/** Conținutul unei sugestii, așa cum îl scrie autorul. */
export interface ContinutSugestie {
  readonly titlu: string;
  readonly descriere: string;
  readonly tip: TipSugestie;
  readonly zona: ZonaSugestie | null;
}

/** Cererile callable-ului `sugestii` (ADR 0107; poza, opțională, doar la scriere: ADR 0110, în base64). */
export type CerereSugestie =
  | ({ readonly actiune: 'scrie'; readonly poza?: string } & ContinutSugestie)
  | ({ readonly actiune: 'editeaza'; readonly id: string; readonly versiune: number } & ContinutSugestie)
  | { readonly actiune: 'decide'; readonly id: string; readonly versiune: number; readonly stare: StareSugestie; readonly nota: string };

export interface RaspunsSugestie {
  readonly ok: true;
  readonly id: string;
  readonly schimbat: boolean;
  readonly versiune: number;
}
