/**
 * Biblioteca extensiilor (ADR 0230), ce știu și construcția, și aplicația: catalogul servit lângă aplicație
 * (`/extensii/catalog.json`, scris la build în `dist/extensii/`), forma lui judecată câmp cu câmp, numele unui pachet (cu
 * amprenta lui: o adresă nu-și schimbă niciodată octeții) și comparația versiunilor, pe numere. Pur: aceeași judecată în Node
 * (construcția, poarta build-ului, probele) și în browser.
 */

export const FORMAT_CATALOG = 'cvs2-biblioteca';
export const SCHEMA_CATALOG = 1;
/** Dosarul bibliotecii în `dist/`: catalogul și pachetele, în afara precache-ului (`shared/precache.ts`). */
export const DIR_BIBLIOTECA = 'extensii';
export const FISIER_CATALOG_BIBLIOTECA = `${DIR_BIBLIOTECA}/catalog.json`;
export const ADRESA_CATALOG = `/${FISIER_CATALOG_BIBLIOTECA}`;
export const MAX_RANDURI = 50;
export const MAX_DESCRIERE = 160;
/** Plafonul unui pachet, același cu al oricărui pachet instalat (`LIMITE_PACHET.octetiTotal`, ADR 0127 §A). */
export const MAX_OCTETI_PACHET = 16 * 1024 * 1024;
/** Versiunea unei extensii din bibliotecă: numere cu puncte (cel mult patru), ca să se poată spune care e mai nouă. */
export const RE_VERSIUNE_BIBLIOTECA = /^\d{1,6}(?:\.\d{1,6}){0,3}$/;
const RE_ID = /^[a-z0-9-]{1,40}$/;
const RE_PACHET = /^[a-z0-9-]{1,40}-\d{1,6}(?:\.\d{1,6}){0,3}-[0-9a-f]{8}\.zip$/;

export type DescriereRand = { readonly ro: string; readonly en: string };
/** Un rând al catalogului: o extensie, în versiunea publicată odată cu aplicația. */
export type RandBiblioteca = {
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

/** Numele pachetului unei versiuni: se schimbă odată cu octeții (amprenta), deci un cache nu dă niciodată alt conținut. */
export function numePachet(id: string, versiune: string, sha256: string): string {
  return `${id}-${versiune}-${sha256.slice(0, 8)}.zip`;
}

/** Pură: un nume de fișier pe care îl poate scrie construcția bibliotecii (precache-ul îl recunoaște după el). */
export function esteNumePachetBiblioteca(nume: string): boolean {
  return RE_PACHET.test(nume);
}

const text = (x: unknown, max: number): x is string => typeof x === 'string' && x.length > 0 && x.length <= max;

function citesteRand(x: unknown): { readonly ok: true; readonly rand: RandBiblioteca } | { readonly ok: false; readonly detaliu: string } {
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
  const d = r.descriere as Record<string, unknown> | null;
  if (typeof d !== 'object' || d === null || !text(d.ro, MAX_DESCRIERE) || !text(d.en, MAX_DESCRIERE)) return nu('descriere');
  if (typeof r.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(r.sha256)) return nu('sha256');
  if (typeof r.octeti !== 'number' || !Number.isInteger(r.octeti) || r.octeti < 1 || r.octeti > MAX_OCTETI_PACHET) return nu('octeti');
  if (r.pachet !== numePachet(id, r.versiune, r.sha256)) return nu('pachet');
  return {
    ok: true,
    rand: {
      id, nume: r.nume, versiune: r.versiune, api: r.api, permisiuni: p as string[], descriere: { ro: d.ro, en: d.en },
      pachet: r.pachet, octeti: r.octeti, sha256: r.sha256,
    },
  };
}

/** Pură: catalogul, dacă are forma lui (fiecare rând, id-uri unice, cel mult `MAX_RANDURI`); altfel ce e greșit. */
export function citesteCatalog(x: unknown): { readonly ok: true; readonly catalog: CatalogBiblioteca } | { readonly ok: false; readonly detaliu: string } {
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return { ok: false, detaliu: 'catalog' };
  const c = x as Record<string, unknown>;
  if (c.format !== FORMAT_CATALOG) return { ok: false, detaliu: 'format' };
  if (c.schema !== SCHEMA_CATALOG) return { ok: false, detaliu: `schema ${String(c.schema)}` };
  if (!Array.isArray(c.extensii) || c.extensii.length > MAX_RANDURI) return { ok: false, detaliu: 'extensii' };
  const randuri: RandBiblioteca[] = [];
  for (const x2 of c.extensii) {
    const r = citesteRand(x2);
    if (!r.ok) return r;
    if (randuri.some((y) => y.id === r.rand.id)) return { ok: false, detaliu: `${r.rand.id}: de două ori` };
    randuri.push(r.rand);
  }
  return { ok: true, catalog: { format: FORMAT_CATALOG, schema: SCHEMA_CATALOG, extensii: randuri } };
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
