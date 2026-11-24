/**
 * Biblioteca extensiilor (ADR 0230), ce știu și construcția, și aplicația: catalogul servit lângă aplicație
 * (`/extensii/catalog.json`, scris la build în `dist/extensii/`), forma lui judecată câmp cu câmp, numele unui pachet (cu
 * amprenta lui: o adresă nu-și schimbă niciodată octeții) și comparația versiunilor, pe numere. Pur: aceeași judecată în Node
 * (construcția, poarta build-ului, probele) și în browser.
 *
 * Datele de prezentare ale unui rând (ADR 0231 §B.1): semnul extensiei, capturile pe limbă, descrierea lungă, „ce e nou” și
 * autorul. Toate sunt opționale și se citesc cu îngăduință: una pe care fila de acum n-o înțelege (un catalog mai nou decât
 * ea) se sare, cu numele în `sarite`, iar rândul rămâne bun. Construcția și poarta build-ului cer `sarite` gol. Semnul și
 * capturile stau lângă catalog, cu amprenta în nume, ca pachetele.
 */

export const FORMAT_CATALOG = 'cvs2-biblioteca';
export const SCHEMA_CATALOG = 1;
/** Dosarul bibliotecii în `dist/`: catalogul și pachetele, în afara precache-ului (`shared/precache.ts`). */
export const DIR_BIBLIOTECA = 'extensii';
export const FISIER_CATALOG_BIBLIOTECA = `${DIR_BIBLIOTECA}/catalog.json`;
export const ADRESA_CATALOG = `/${FISIER_CATALOG_BIBLIOTECA}`;
export const MAX_RANDURI = 50;
export const MAX_DESCRIERE = 160;
/** Datele de prezentare (ADR 0231 §B.1). */
export const MAX_DESPRE = 600;
export const MAX_NOUTATI = 5;
export const MAX_NOUTATE = 240;
export const MAX_AUTOR = 60;
export const MAX_CAPTURI = 4;
export const MAX_ALT = 120;
/** Semnul din catalog e cel din pachet (`LIMITE_PACHET.octetiPictograma`). */
export const MAX_OCTETI_PICTOGRAMA = 8 * 1024;
export const MAX_OCTETI_CAPTURA = 150 * 1024;
const MAX_LATURA_CAPTURA = 4096;
/** Plafonul unui pachet, același cu al oricărui pachet instalat (`LIMITE_PACHET.octetiTotal`, ADR 0127 §A). */
export const MAX_OCTETI_PACHET = 16 * 1024 * 1024;
/** Versiunea unei extensii din bibliotecă: numere cu puncte (cel mult patru), ca să se poată spune care e mai nouă. */
export const RE_VERSIUNE_BIBLIOTECA = /^\d{1,6}(?:\.\d{1,6}){0,3}$/;
const RE_ID = /^[a-z0-9-]{1,40}$/;
const RE_PACHET = /^[a-z0-9-]{1,40}-\d{1,6}(?:\.\d{1,6}){0,3}-[0-9a-f]{8}\.zip$/;
const RE_IMAGINE = /^[a-z0-9-]{1,90}-[0-9a-f]{8}\.(?:svg|webp)$/;

export type DescriereRand = { readonly ro: string; readonly en: string };
/** Un fișier de lângă catalog: numele (cu amprenta lui) și mărimea. */
export type ImagineBiblioteca = { readonly fisier: string; readonly octeti: number };
export type CapturaBiblioteca = ImagineBiblioteca & { readonly lat: number; readonly inalt: number; readonly alt: string };
/** Un rând de „ce e nou”; `data` (an-lună-zi), la alegere: când a apărut versiunea (ADR 0232 §C.15). */
export type NoutateBiblioteca = { readonly versiune: string; readonly ro: string; readonly en: string; readonly data?: string };
/** Datele de prezentare ale unui rând (ADR 0231 §B.1), toate opționale. */
export type PrezentareRand = {
  /** Semnul extensiei, un SVG: `<id>-pictograma-<amprenta>.svg`. */
  readonly pictograma?: ImagineBiblioteca;
  /** Capturile, în limba aplicației: `<id>-captura-<nume>-<amprenta>.webp`, cel mult `MAX_CAPTURI` pe limbă. */
  readonly capturi?: { readonly ro: readonly CapturaBiblioteca[]; readonly en: readonly CapturaBiblioteca[] };
  /** Descrierea lungă. */
  readonly despre?: DescriereRand;
  /** „Ce e nou”, de la versiunea cea mai nouă în jos, cel mult `MAX_NOUTATI`. */
  readonly noutati?: readonly NoutateBiblioteca[];
  readonly autor?: string;
};
/** Un rând al catalogului: o extensie, în versiunea publicată odată cu aplicația. */
export type RandBiblioteca = PrezentareRand & {
  readonly id: string;
  readonly nume: string;
  readonly versiune: string;
  /** Versiunea lui `HostApi` cerută (ADR 0127 §E). */
  readonly api: number;
  readonly permisiuni: readonly string[];
  readonly descriere: DescriereRand;
  /** Numele fișierului, lângă catalog: `<id>-<versiune>-<primele 8 cifre ale amprentei>.zip`. */
  readonly pachet: string;
  readonly octeti: number;
  /** SHA-256 al `.zip`-ului (hex mic), verificat înainte de orice citire a lui. */
  readonly sha256: string;
};
export type CatalogBiblioteca = {
  readonly format: typeof FORMAT_CATALOG;
  readonly schema: typeof SCHEMA_CATALOG;
  readonly extensii: readonly RandBiblioteca[];
};

/** O dată de calendar, an-lună-zi (`2026-11-23`): o zi care există. */
export function esteData(x: unknown): x is string {
  if (typeof x !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(x)) return false;
  const d = new Date(`${x}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === x;
}

/** Numele pachetului unei versiuni: se schimbă odată cu octeții (amprenta), deci un cache nu dă niciodată alt conținut. */
export function numePachet(id: string, versiune: string, sha256: string): string {
  return `${id}-${versiune}-${sha256.slice(0, 8)}.zip`;
}

/** Numele unui fișier de prezentare (semnul, o captură): se schimbă odată cu octeții, ca al pachetului. */
export function numeFisierBiblioteca(id: string, nume: string, sha256: string, fel: 'svg' | 'webp'): string {
  return `${id}-${nume}-${sha256.slice(0, 8)}.${fel}`;
}

/** Pură: un nume de fișier pe care îl poate scrie construcția bibliotecii (precache-ul îl recunoaște după el). */
export function esteNumeFisierBiblioteca(nume: string): boolean {
  return RE_PACHET.test(nume) || RE_IMAGINE.test(nume);
}

const text = (x: unknown, max: number): x is string => typeof x === 'string' && x.length > 0 && x.length <= max;
const intreg = (x: unknown, max: number): x is number => typeof x === 'number' && Number.isInteger(x) && x >= 1 && x <= max;
const obiect = (x: unknown): Record<string, unknown> | null =>
  (typeof x === 'object' && x !== null && !Array.isArray(x) ? x as Record<string, unknown> : null);

function citesteDescriere(x: unknown, max: number): DescriereRand | null {
  const d = obiect(x);
  return d && text(d.ro, max) && text(d.en, max) ? { ro: d.ro, en: d.en } : null;
}

/**
 * Datele de prezentare ale unui rând, fiecare judecată singură: ce nu are forma ei se sare (numele ei intră în `sarite`), fără
 * să strice rândul. Numele fișierelor sunt ale extensiei (`<id>-…`), lângă catalog, fără alt dosar.
 */
function citestePrezentare(id: string, r: Readonly<Record<string, unknown>>): { readonly prezentare: PrezentareRand; readonly sarite: string[] } {
  const sarite: string[] = [];
  const camp = <T>(nume: keyof PrezentareRand, citeste: (x: unknown) => T | null): T | undefined => {
    if (r[nume] === undefined) return undefined;
    const v = citeste(r[nume]);
    if (v === null) sarite.push(`${id}: ${nume}`);
    return v ?? undefined;
  };
  const reSemn = new RegExp(`^${id}-pictograma-[0-9a-f]{8}\\.svg$`);
  const reCaptura = new RegExp(`^${id}-captura-[a-z0-9-]{1,40}-[0-9a-f]{8}\\.webp$`);
  const capturi = (x: unknown): CapturaBiblioteca[] | null => {
    if (!Array.isArray(x) || x.length > MAX_CAPTURI) return null;
    const out: CapturaBiblioteca[] = [];
    for (const y of x) {
      const o = obiect(y);
      if (!o || typeof o.fisier !== 'string' || !reCaptura.test(o.fisier) || !intreg(o.octeti, MAX_OCTETI_CAPTURA)
        || !intreg(o.lat, MAX_LATURA_CAPTURA) || !intreg(o.inalt, MAX_LATURA_CAPTURA) || !text(o.alt, MAX_ALT)) return null;
      out.push({ fisier: o.fisier, octeti: o.octeti, lat: o.lat, inalt: o.inalt, alt: o.alt });
    }
    return out;
  };
  const pictograma = camp('pictograma', (x) => {
    const o = obiect(x);
    return o && typeof o.fisier === 'string' && reSemn.test(o.fisier) && intreg(o.octeti, MAX_OCTETI_PICTOGRAMA) ? { fisier: o.fisier, octeti: o.octeti } : null;
  });
  const capturiPeLimbi = camp('capturi', (x) => {
    const o = obiect(x);
    const ro = o ? capturi(o.ro) : null, en = o ? capturi(o.en) : null;
    return ro && en ? { ro, en } : null;
  });
  const despre = camp('despre', (x) => citesteDescriere(x, MAX_DESPRE));
  let dataSarita = false;
  const noutati = camp('noutati', (x) => {
    if (!Array.isArray(x) || x.length > MAX_NOUTATI) return null;
    const out: NoutateBiblioteca[] = [];
    for (const y of x) {
      const o = obiect(y);
      if (!o || typeof o.versiune !== 'string' || !RE_VERSIUNE_BIBLIOTECA.test(o.versiune) || !text(o.ro, MAX_NOUTATE) || !text(o.en, MAX_NOUTATE)) return null;
      // O dată greșită cade singură, cu numele ei: rândul rămâne.
      if (o.data !== undefined && !esteData(o.data)) dataSarita = true;
      out.push({ versiune: o.versiune, ro: o.ro, en: o.en, ...(esteData(o.data) ? { data: o.data } : {}) });
    }
    return out;
  });
  if (noutati && dataSarita) sarite.push(`${id}: noutati.data`);
  const autor = camp('autor', (x) => (text(x, MAX_AUTOR) ? x : null));
  return {
    prezentare: {
      ...(pictograma ? { pictograma } : {}), ...(capturiPeLimbi ? { capturi: capturiPeLimbi } : {}), ...(despre ? { despre } : {}),
      ...(noutati ? { noutati } : {}), ...(autor !== undefined ? { autor } : {}),
    },
    sarite,
  };
}

function citesteRand(x: unknown): { readonly ok: true; readonly rand: RandBiblioteca; readonly sarite: readonly string[] } | { readonly ok: false; readonly detaliu: string } {
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return { ok: false, detaliu: 'rând' };
  const r = x as Record<string, unknown>;
  const id = typeof r.id === 'string' && RE_ID.test(r.id) ? r.id : null;
  if (!id) return { ok: false, detaliu: 'id' };
  const nu = (camp: string) => ({ ok: false, detaliu: `${id}: ${camp}` }) as const;
  if (!text(r.nume, 60)) return nu('nume');
  if (typeof r.versiune !== 'string' || !RE_VERSIUNE_BIBLIOTECA.test(r.versiune)) return nu('versiune');
  if (typeof r.api !== 'number' || !Number.isInteger(r.api) || r.api < 1) return nu('api');
  const p = r.permisiuni;
  if (!Array.isArray(p) || p.length > 20 || !p.every((s) => typeof s === 'string' && RE_ID.test(s)) || new Set(p).size !== p.length) return nu('permisiuni');
  const d = citesteDescriere(r.descriere, MAX_DESCRIERE);
  if (!d) return nu('descriere');
  if (typeof r.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(r.sha256)) return nu('sha256');
  if (typeof r.octeti !== 'number' || !Number.isInteger(r.octeti) || r.octeti < 1 || r.octeti > MAX_OCTETI_PACHET) return nu('octeti');
  if (r.pachet !== numePachet(id, r.versiune, r.sha256)) return nu('pachet');
  const { prezentare, sarite } = citestePrezentare(id, r);
  return {
    ok: true,
    rand: {
      id, nume: r.nume, versiune: r.versiune, api: r.api, permisiuni: p as string[], descriere: d,
      pachet: r.pachet, octeti: r.octeti, sha256: r.sha256, ...prezentare,
    },
    sarite,
  };
}

/**
 * Pură: catalogul, dacă are forma lui (fiecare rând, id-uri unice, cel mult `MAX_RANDURI`); altfel ce e greșit. `sarite` are
 * datele de prezentare pe care fila nu le-a înțeles („<id>: <câmpul>”): rândurile lor rămân bune, fără ele.
 */
export function citesteCatalog(x: unknown): { readonly ok: true; readonly catalog: CatalogBiblioteca; readonly sarite: readonly string[] } | { readonly ok: false; readonly detaliu: string } {
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return { ok: false, detaliu: 'catalog' };
  const c = x as Record<string, unknown>;
  if (c.format !== FORMAT_CATALOG) return { ok: false, detaliu: 'format' };
  if (c.schema !== SCHEMA_CATALOG) return { ok: false, detaliu: `schema ${String(c.schema)}` };
  if (!Array.isArray(c.extensii) || c.extensii.length > MAX_RANDURI) return { ok: false, detaliu: 'extensii' };
  const randuri: RandBiblioteca[] = [];
  const sarite: string[] = [];
  for (const x2 of c.extensii) {
    const r = citesteRand(x2);
    if (!r.ok) return r;
    if (randuri.some((y) => y.id === r.rand.id)) return { ok: false, detaliu: `${r.rand.id}: de două ori` };
    randuri.push(r.rand);
    sarite.push(...r.sarite);
  }
  return { ok: true, catalog: { format: FORMAT_CATALOG, schema: SCHEMA_CATALOG, extensii: randuri }, sarite };
}

/**
 * Pură: -1, 0 sau 1 după care versiune e mai nouă, pe numere (`18.10.0` > `18.9.1`; `18.7` = `18.7.0`); null dacă una nu e
 * de forma `RE_VERSIUNE_BIBLIOTECA` (de exemplu, un pachet de probă `18.8.0-proba`).
 */
export function comparaVersiuni(a: string, b: string): -1 | 0 | 1 | null {
  if (!RE_VERSIUNE_BIBLIOTECA.test(a) || !RE_VERSIUNE_BIBLIOTECA.test(b)) return null;
  const x = a.split('.').map(Number), y = b.split('.').map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return 0;
}
