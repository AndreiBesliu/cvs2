/**
 * Biblioteca de freze în cont (ADR 0300 §7, felia 16.A↑c): contractul callable-ului `freze`, comun editorului și serverului.
 * Frezele omului stau în `conturi/{uid}/freze/{id}`, fiecare cu versiunea ei în cont, iar contorul contului în
 * `conturi/{uid}/sincron/freze`. Editorul nu citește Firestore: le cere și le scrie doar prin callable. Frezele merg ca
 * text JSON, neatinse de server (o versiune mai nouă a aplicației poate avea câmpuri pe care serverul nu le știe).
 *
 * Nu importă nimic din `src/` și nu intră în pornire: îl aduce doar sincronizarea, la cerere.
 */

export const COLECTIE_FREZE = 'freze';
/** Contorul și numărătorile contului: `conturi/{uid}/sincron/freze`. */
export const CALE_SINCRON_FREZE = { colectie: 'sincron', id: 'freze' } as const;

/** Plafoanele (ADR 0300 §7): frezele vii pe cont, octeții unei freze (JSON-ul, UTF-8), o cerere, o pagină a listei. */
export const FREZE_IN_CONT = 500;
export const OCTETI_FREZA = 8192;
export const LOT_FREZE = 50;
export const PAGINA_FREZE = 100;
/**
 * Semnele ștergerii ținute pe cont: cât un alt calculator n-a aflat de o ștergere, semnul ei îi spune. Peste plafon pleacă
 * cele mai vechi, iar un calculator care a rămas în urma lor primește lista întreagă (`complet`).
 */
export const STERSE_IN_CONT = 500;

/** Id-ul unei freze: ca cele date de aplicație, folosit și ca id al documentului. */
const ID = /^[A-Za-z0-9_-]{1,64}$/;
export const esteIdFreza = (x: unknown): x is string => typeof x === 'string' && ID.test(x);

/** O freză în cont: versiunea ei în cont și JSON-ul ei, sau `null` dacă e ștearsă. Versiunea 0 = n-a fost niciodată. */
export type FrezaInCont = { readonly id: string; readonly versiune: number; readonly json: string | null };

/** O freză trimisă: JSON-ul ei și versiunea din cont pe care a văzut-o calculatorul (0 = nouă). */
export type FrezaTrimisa = { readonly id: string; readonly vazuta: number; readonly json: string };
/** O ștergere trimisă, cu versiunea văzută. */
export type StergereTrimisa = { readonly id: string; readonly vazuta: number };

export type CerereFreze =
  | { readonly actiune: 'lista'; readonly dupa: number }
  | { readonly actiune: 'scrie'; readonly freze: readonly FrezaTrimisa[] }
  | { readonly actiune: 'sterge'; readonly freze: readonly StergereTrimisa[] };

/**
 * O pagină a schimbărilor de după versiunea `dupa`, în ordinea versiunilor. `pana`: versiunea de la care se cere pagina
 * următoare (cu `mai`) sau versiunea contului (fără). `complet`: lista pornește de la 0, iar trecerea întreagă e toată
 * biblioteca din cont (calculatorul rămăsese în urma semnelor ștergerii). `poateScrie`: planul are capabilitatea `cloud`.
 */
export type RaspunsListaFreze = {
  readonly ok: true;
  readonly freze: readonly FrezaInCont[];
  readonly pana: number;
  readonly mai: boolean;
  readonly complet: boolean;
  readonly poateScrie: boolean;
  /** Frezele vii din cont. */
  readonly numar: number;
};

/** Rezultatul fiecărei freze trimise: scrisă (cu versiunea nouă), în conflict (cu ce e în cont) sau refuzată (contul plin). */
export type RezultatFreza =
  | { readonly id: string; readonly stare: 'scrisa'; readonly versiune: number }
  | { readonly id: string; readonly stare: 'conflict'; readonly versiune: number; readonly json: string | null }
  | { readonly id: string; readonly stare: 'plina' };

export type RaspunsScrieFreze = { readonly ok: true; readonly rezultate: readonly RezultatFreza[]; readonly numar: number };

/** Octeții UTF-8 ai unui text (ca în Firestore și în plafonul frezei). */
export function octeti(s: string): number {
  return new TextEncoder().encode(s).length;
}

/**
 * JSON-ul unei freze, judecat pentru cont: un obiect cu id-ul cererii, sub plafon. Conținutul nu-l judecă serverul (ușa
 * aplicației o face la citire).
 */
export function jsonFrezaBun(id: string, json: unknown): json is string {
  if (typeof json !== 'string' || octeti(json) > OCTETI_FREZA) return false;
  try {
    const x: unknown = JSON.parse(json);
    return typeof x === 'object' && x !== null && !Array.isArray(x) && (x as Record<string, unknown>)['id'] === id;
  } catch {
    return false;
  }
}

const versiuneBuna = (x: unknown): x is number => typeof x === 'number' && Number.isSafeInteger(x) && x >= 0;

/** Cererea citită (forma, id-urile, versiunile, plafoanele, fără id-uri repetate); `null` dacă nu e bună. */
export function cerereFrezeDin(x: unknown): CerereFreze | null {
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return null;
  const d = x as Record<string, unknown>;
  const actiune = d['actiune'];
  if (actiune === 'lista') return versiuneBuna(d['dupa']) ? { actiune, dupa: d['dupa'] } : null;
  if (actiune !== 'scrie' && actiune !== 'sterge') return null;
  const lista = d['freze'];
  if (!Array.isArray(lista) || lista.length === 0 || lista.length > LOT_FREZE) return null;
  const vazute = new Set<string>();
  const scrise: FrezaTrimisa[] = [];
  const sterse: StergereTrimisa[] = [];
  for (const e of lista) {
    if (typeof e !== 'object' || e === null) return null;
    const f = e as Record<string, unknown>;
    const id = f['id'];
    const vazuta = f['vazuta'];
    if (!esteIdFreza(id) || !versiuneBuna(vazuta) || vazute.has(id)) return null;
    vazute.add(id);
    if (actiune === 'sterge') sterse.push({ id, vazuta });
    else if (jsonFrezaBun(id, f['json'])) scrise.push({ id, vazuta, json: f['json'] as string });
    else return null;
  }
  return actiune === 'scrie' ? { actiune, freze: scrise } : { actiune, freze: sterse };
}
