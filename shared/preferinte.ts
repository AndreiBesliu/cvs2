/**
 * Setările aplicației în cont (ADR 0330, întrebarea 14a, felia 10.4↑g): contractul callable-ului `preferinte`, comun
 * editorului și serverului. Fiecare grup de setări e un document `conturi/{uid}/preferinte/{cheie}`, cu textul lui JSON
 * (neatins de server: o versiune mai nouă a aplicației poate avea câmpuri pe care serverul nu le știe) și versiunea lui în
 * cont. Editorul nu citește Firestore: le cere și le scrie doar prin callable. Acum, o singură cheie: setările cotelor.
 *
 * Nu importă nimic din `src/` și nu intră în pornire: îl aduce doar sincronizarea, la cerere.
 */

export const COLECTIE_PREFERINTE = 'preferinte';
/** Grupurile de setări ținute în cont (un document fiecare). */
export const CHEI_PREFERINTE = ['cote'] as const;
export type CheiePreferinte = (typeof CHEI_PREFERINTE)[number];
/** Plafonul unui document: octeții JSON-ului, UTF-8 (setările cotelor au azi sub 2 kB). */
export const OCTETI_PREFERINTE = 16384;

export type CererePreferinte =
  | { readonly actiune: 'citeste'; readonly cheie: CheiePreferinte }
  | { readonly actiune: 'scrie'; readonly cheie: CheiePreferinte; readonly vazuta: number; readonly json: string };

/**
 * Ce e în cont: versiunea (0 = n-a fost scris niciodată) și JSON-ul (null la versiunea 0). `poateScrie`: planul are
 * capabilitatea `cloud`.
 */
export type RaspunsCitestePreferinte = {
  readonly ok: true;
  readonly versiune: number;
  readonly json: string | null;
  readonly poateScrie: boolean;
};

/** Scris (cu versiunea nouă) sau ciocnire: contul are altă versiune decât cea văzută, cu ce e acolo. */
export type RaspunsScriePreferinte =
  | { readonly ok: true; readonly stare: 'scrisa'; readonly versiune: number }
  | { readonly ok: true; readonly stare: 'conflict'; readonly versiune: number; readonly json: string | null };

/** Octeții UTF-8 ai unui text (ca în Firestore și în plafon). */
export function octetiPreferinte(s: string): number {
  return new TextEncoder().encode(s).length;
}

const esteCheie = (x: unknown): x is CheiePreferinte => typeof x === 'string' && (CHEI_PREFERINTE as readonly string[]).includes(x);
const versiuneBuna = (x: unknown): x is number => typeof x === 'number' && Number.isSafeInteger(x) && x >= 0;

/** JSON-ul unor setări, judecat pentru cont: un obiect, sub plafon. Conținutul îl judecă aplicația la citire. */
export function jsonPreferinteBun(json: unknown): json is string {
  if (typeof json !== 'string' || octetiPreferinte(json) > OCTETI_PREFERINTE) return false;
  try {
    const x: unknown = JSON.parse(json);
    return typeof x === 'object' && x !== null && !Array.isArray(x);
  } catch {
    return false;
  }
}

/** Cererea citită (forma, cheia, versiunea, JSON-ul); `null` dacă nu e bună. */
export function cererePreferinteDin(x: unknown): CererePreferinte | null {
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return null;
  const d = x as Record<string, unknown>;
  const cheie = d['cheie'];
  if (!esteCheie(cheie)) return null;
  if (d['actiune'] === 'citeste') return { actiune: 'citeste', cheie };
  if (d['actiune'] !== 'scrie') return null;
  const vazuta = d['vazuta'], json = d['json'];
  return versiuneBuna(vazuta) && jsonPreferinteBun(json) ? { actiune: 'scrie', cheie, vazuta, json } : null;
}
