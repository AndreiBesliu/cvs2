import {
  adresaCss, AGENT_TTF, catalogDinMetadate, cerereGoogle, METADATE_GOOGLE, urlDinCss, type CatalogGoogle, type RaspunsFonturiGoogle,
} from '../../../shared/fonturiGoogle.ts';

/** Cât ține o instanță catalogul (metadatele se schimbă rar: familii noi, versiuni). */
const VIATA_CATALOG_MS = 6 * 3600_000;
/** Câte adrese de fișiere ține o instanță (o variantă cerută de doi oameni se caută o dată). */
const ADRESE_TINUTE = 2_000;
const TERMEN_MS = 15_000;

export interface DepsGoogle {
  readonly cere: typeof fetch;
  readonly acum: () => number;
}

type Memorie = { catalog: { valoare: CatalogGoogle; la: number } | null; adrese: Map<string, string> };

/** Memoria unei instanțe (o singură funcție, câteva instanțe): catalogul și adresele găsite. */
export function memorieNoua(): Memorie {
  return { catalog: null, adrese: new Map() };
}

async function catalog(d: DepsGoogle, m: Memorie): Promise<CatalogGoogle | null> {
  if (m.catalog && d.acum() - m.catalog.la < VIATA_CATALOG_MS) return m.catalog.valoare;
  const r = await d.cere(METADATE_GOOGLE, { signal: AbortSignal.timeout(TERMEN_MS) });
  if (!r.ok) return m.catalog?.valoare ?? null;
  const c = catalogDinMetadate(await r.text(), new Date(d.acum()).toISOString());
  if (c) m.catalog = { valoare: c, la: d.acum() };
  return c ?? m.catalog?.valoare ?? null;
}

/**
 * `fonturiGoogle` (ADR 0106 §4): catalogul, sau adresa TTF a unei variante din el. Funcția nu aruncă spre client: o
 * cerere nevalidă, o familie sau o variantă care nu e în catalog, Google care nu răspunde, fiecare cu motivul ei.
 */
export async function trateazaFonturiGoogle(data: unknown, d: DepsGoogle, m: Memorie): Promise<RaspunsFonturiGoogle> {
  const c = cerereGoogle(data);
  if (!c) return { ok: false, motiv: 'nevalid' };
  try {
    const cat = await catalog(d, m);
    if (!cat) return { ok: false, motiv: 'google-indisponibil' };
    if (c.fel === 'catalog') return { ok: true, catalog: cat };
    const f = cat.familii.find((x) => x.familie === c.familie);
    if (!f) return { ok: false, motiv: 'familie-necunoscuta' };
    if (!f.variante.includes(c.varianta)) return { ok: false, motiv: 'varianta-necunoscuta' };
    const cheie = `${c.familie}:${c.varianta}`;
    const gata = m.adrese.get(cheie);
    if (gata) return { ok: true, url: gata };
    const r = await d.cere(adresaCss(c.familie, c.varianta), { headers: { 'User-Agent': AGENT_TTF }, signal: AbortSignal.timeout(TERMEN_MS) });
    if (!r.ok) return { ok: false, motiv: 'google-indisponibil' };
    const url = urlDinCss(await r.text());
    if (!url) return { ok: false, motiv: 'google-indisponibil' };
    if (m.adrese.size >= ADRESE_TINUTE) m.adrese.clear();
    m.adrese.set(cheie, url);
    return { ok: true, url };
  } catch (e) {
    console.error('fonturiGoogle: Google n-a răspuns', e);
    return { ok: false, motiv: 'google-indisponibil' };
  }
}
