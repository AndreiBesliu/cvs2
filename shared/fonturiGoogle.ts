/**
 * Google Fonts (ADR 0106 §4), contractul comun funcției `fonturiGoogle` și clientului: catalogul și adresa fișierului TTF al
 * unei variante. Fără cheie API: catalogul vine din metadatele publice ale site-ului Google Fonts, iar fișierul, din CSS API
 * v2, care dă unui browser vechi (`Mozilla/4.0`) un singur TTF întreg pe variantă (static, și pentru familiile variabile),
 * pe `fonts.gstatic.com` (de unde browserul îl poate descărca: `Access-Control-Allow-Origin: *`). Browserul nu poate chema
 * nici metadatele (fără CORS), nici CSS-ul cu alt agent (primește WOFF2 tăiat pe alfabete): de aceea funcția.
 *
 * Totul e pur aici (citirea, validarea, adresele); rețeaua și memoria sunt ale funcției.
 */

export const METADATE_GOOGLE = 'https://fonts.google.com/metadata/fonts';
export const CSS_GOOGLE = 'https://fonts.googleapis.com/css2';
/** Agentul cu care CSS API dă TTF (măsurat pe 29.10: `format('truetype')`, un fișier întreg pe variantă). */
export const AGENT_TTF = 'Mozilla/4.0';

/** Categoriile Google Fonts, cu numele lor din metadate. */
export const CATEGORII_GOOGLE = ['Sans Serif', 'Serif', 'Display', 'Handwriting', 'Monospace'] as const;
export type CategorieGoogle = (typeof CATEGORII_GOOGLE)[number];

/** O familie din catalog: numele, categoria, variantele („400”, „700i”, ordonate), dacă are diacriticele românești, rangul. */
export type FamilieGoogle = {
  readonly familie: string;
  readonly categorie: CategorieGoogle;
  readonly variante: readonly string[];
  /** Subsetul `latin-ext` (ă, ș, ț): textul românesc se scrie întreg. */
  readonly romana: boolean;
  /** Popularitatea (1 = cea mai folosită). */
  readonly rang: number;
};

export type CatalogGoogle = { readonly generat: string; readonly familii: readonly FamilieGoogle[] };

export type CerereFonturiGoogle =
  | { readonly fel: 'catalog' }
  | { readonly fel: 'fisier'; readonly familie: string; readonly varianta: string };

export type MotivFonturiGoogle = 'nevalid' | 'familie-necunoscuta' | 'varianta-necunoscuta' | 'google-indisponibil';

export type RaspunsFonturiGoogle =
  | { readonly ok: true; readonly catalog: CatalogGoogle }
  | { readonly ok: true; readonly url: string }
  | { readonly ok: false; readonly motiv: MotivFonturiGoogle };

/** Marginile (catalogul are ~2 000 de familii și ~8 000 de variante în 2026). */
export const PLAFON_GOOGLE = { familii: 5_000, variante: 40, numeFamilie: 80 } as const;

/** O variantă: grosimea (100–1000, din sută în sută) și „i” pentru cursiv. */
const VARIANTA = /^([1-9]00|1000)(i?)$/;
/** Numele unei familii: litere, cifre, spații și semnele din numele Google Fonts (fără nimic din sintaxa CSS API). */
const FAMILIE = /^[\p{L}\p{N}][\p{L}\p{N} '.&-]*$/u;
/** Adresa unui TTF pe gstatic, cum o scrie CSS API. */
export const URL_TTF = /^https:\/\/fonts\.gstatic\.com\/s\/[a-z0-9]+\/v\d+\/[A-Za-z0-9_-]+\.ttf$/;

export const variantaValida = (v: unknown): v is string => typeof v === 'string' && VARIANTA.test(v);
export const familieValida = (f: unknown): f is string =>
  typeof f === 'string' && f.length > 0 && f.length <= PLAFON_GOOGLE.numeFamilie && FAMILIE.test(f) && f.trim() === f;

/** Cererea clientului, validată; null: nevalidă. */
export function cerereGoogle(data: unknown): CerereFonturiGoogle | null {
  if (typeof data !== 'object' || data === null) return null;
  const d = data as Record<string, unknown>;
  if (d['fel'] === 'catalog' && Object.keys(d).length === 1) return { fel: 'catalog' };
  if (d['fel'] === 'fisier' && Object.keys(d).length === 3 && familieValida(d['familie']) && variantaValida(d['varianta'])) {
    return { fel: 'fisier', familie: d['familie'], varianta: d['varianta'] };
  }
  return null;
}

/** Ordinea variantelor: după grosime, normalul înaintea cursivului. */
const cheieVarianta = (v: string): number => Number.parseInt(v, 10) * 2 + (v.endsWith('i') ? 1 : 0);

/**
 * Catalogul din metadatele publice (`)]}'` în față, apoi JSON cu `familyMetadataList`): familiile libere (`isOpenSource`
 * nu e fals), cu categoria cunoscută și variantele valide, ordonate după popularitate. Null: metadatele au altă formă.
 */
export function catalogDinMetadate(text: string, generat: string): CatalogGoogle | null {
  let j: unknown;
  try {
    j = JSON.parse(text.startsWith(")]}'") ? text.slice(text.indexOf('\n') + 1) : text);
  } catch {
    return null;
  }
  const lista = (j as { familyMetadataList?: unknown } | null)?.familyMetadataList;
  if (!Array.isArray(lista)) return null;
  const familii: FamilieGoogle[] = [];
  for (const x of lista) {
    if (typeof x !== 'object' || x === null) continue;
    const f = x as Record<string, unknown>;
    if (f['isOpenSource'] === false || !familieValida(f['family'])) continue;
    const categorie = CATEGORII_GOOGLE.find((c) => c === f['category']);
    const fonturi = f['fonts'];
    if (!categorie || typeof fonturi !== 'object' || fonturi === null) continue;
    const variante = Object.keys(fonturi).filter((v) => VARIANTA.test(v)).sort((a, b) => cheieVarianta(a) - cheieVarianta(b));
    if (variante.length === 0 || variante.length > PLAFON_GOOGLE.variante) continue;
    const subseturi = Array.isArray(f['subsets']) ? f['subsets'] : [];
    const rang = typeof f['popularity'] === 'number' && Number.isFinite(f['popularity']) ? f['popularity'] : 1e9;
    familii.push({ familie: f['family'], categorie, variante, romana: subseturi.includes('latin-ext'), rang });
    if (familii.length > PLAFON_GOOGLE.familii) return null;
  }
  if (familii.length === 0) return null;
  familii.sort((a, b) => a.rang - b.rang || (a.familie < b.familie ? -1 : 1));
  return { generat, familii };
}

/** Adresa CSS API a unei variante: `family=Open+Sans:ital,wght@1,700` (axa `ital` merge și la familiile fără cursiv). */
export function adresaCss(familie: string, varianta: string): string {
  const m = VARIANTA.exec(varianta)!;
  return `${CSS_GOOGLE}?family=${encodeURIComponent(familie).replace(/%20/g, '+')}:ital,wght@${m[2] ? 1 : 0},${m[1]}`;
}

/** Adresa TTF din CSS-ul dat agentului vechi: exact una, pe gstatic; altfel null. */
export function urlDinCss(css: string): string | null {
  const gasite = [...css.matchAll(/src:\s*url\(([^)\s]+)\)\s*format\('truetype'\)/g)].map((m) => m[1]!);
  return gasite.length === 1 && URL_TTF.test(gasite[0]!) ? gasite[0]! : null;
}
