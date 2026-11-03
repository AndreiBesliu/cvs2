/**
 * Pachetul unei extensii (ADR 0127 §A): `.zip`-ul citit, manifestul `extensie.json` judecat (forma, versiunea lui `HostApi`,
 * id-ul, căile, intrarea, stilurile, permisiunile din catalog) și fiecare fișier potrivit cu amprenta lui SHA-256, în ambele
 * sensuri (niciun fișier lipsă, niciunul în plus). Pur, în afară de `crypto.subtle`: aceeași judecată în Node și în browser.
 */
import { citesteZip, type MotivZip } from './zip.ts';

export const FORMAT = 'cvs2-extensie';
export const API = 1;
export const MANIFEST = 'extensie.json';
export const LIMITE_PACHET = { fisiere: 256, octetiFisier: 8 * 1024 * 1024, octetiTotal: 16 * 1024 * 1024 } as const;
/**
 * Serviciile pe care o extensie le poate cere (ADR 0127 §E): stocarea (ADR 0128), descărcările (ADR 0129), senderul
 * (`masina`, ADR 0199).
 */
export const CATALOG_PERMISIUNI: readonly string[] = ['stocare', 'descarcari', 'masina'];

export type Manifest = {
  readonly format: typeof FORMAT;
  readonly api: typeof API;
  readonly id: string;
  readonly nume: string;
  readonly versiune: string;
  readonly intrare: string;
  readonly stiluri: readonly string[];
  readonly permisiuni: readonly string[];
  readonly fisiere: Readonly<Record<string, string>>;
};
export type Pachet = { readonly manifest: Manifest; readonly fisiere: ReadonlyMap<string, Uint8Array>; readonly octeti: number };
export type MotivPachet =
  | MotivZip | 'fara-manifest' | 'manifest' | 'api' | 'id' | 'cale' | 'intrare' | 'stil' | 'permisiune' | 'lipsa' | 'in-plus' | 'amprenta';
export type RezultatPachet =
  | { readonly ok: true; readonly pachet: Pachet }
  | { readonly ok: false; readonly motiv: MotivPachet; readonly detaliu?: string };

/** O cale din pachet: relativă, ASCII vizibil, fără `\`, fără segmente goale, `.` sau `..`. */
export function caleBuna(c: string): boolean {
  if (c.length === 0 || c.length > 200 || !/^[\x21-\x7e]+$/.test(c) || c.includes('\\') || c.startsWith('/')) return false;
  return c.split('/').every((s) => s !== '' && s !== '.' && s !== '..');
}

const text = (x: unknown, max: number): string | null => (typeof x === 'string' && x.length > 0 && x.length <= max ? x : null);
const hex = (b: ArrayBuffer): string => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');

/** Pură: manifestul, dacă are forma lui (fără a privi fișierele). */
export function citesteManifest(x: unknown): { readonly ok: true; readonly manifest: Manifest } | { readonly ok: false; readonly motiv: MotivPachet; readonly detaliu?: string } {
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return { ok: false, motiv: 'manifest' };
  const m = x as Record<string, unknown>;
  if (m.format !== FORMAT) return { ok: false, motiv: 'manifest', detaliu: 'format' };
  if (m.api !== API) return { ok: false, motiv: 'api', detaliu: String(m.api) };
  const id = typeof m.id === 'string' && /^[a-z0-9-]{1,40}$/.test(m.id) ? m.id : null;
  if (!id) return { ok: false, motiv: 'id' };
  const nume = text(m.nume, 60), versiune = text(m.versiune, 20), intrare = text(m.intrare, 200);
  if (!nume || !versiune) return { ok: false, motiv: 'manifest', detaliu: 'nume' };
  const lista = (y: unknown): string[] | null => (y === undefined ? [] : Array.isArray(y) && y.every((s) => typeof s === 'string') ? y : null);
  const stiluri = lista(m.stiluri), permisiuni = lista(m.permisiuni);
  if (!stiluri || !permisiuni) return { ok: false, motiv: 'manifest', detaliu: 'liste' };
  if (typeof m.fisiere !== 'object' || m.fisiere === null || Array.isArray(m.fisiere)) return { ok: false, motiv: 'manifest', detaliu: 'fisiere' };
  const fisiere = m.fisiere as Record<string, unknown>;
  for (const [c, h] of Object.entries(fisiere)) {
    if (!caleBuna(c) || c === MANIFEST) return { ok: false, motiv: 'cale', detaliu: c };
    if (typeof h !== 'string' || !/^[0-9a-f]{64}$/.test(h)) return { ok: false, motiv: 'manifest', detaliu: c };
  }
  if (!intrare || !intrare.endsWith('.js') || !(intrare in fisiere)) return { ok: false, motiv: 'intrare', detaliu: intrare ?? '' };
  for (const s of stiluri) if (!s.endsWith('.css') || !(s in fisiere)) return { ok: false, motiv: 'stil', detaliu: s };
  for (const p of permisiuni) if (!CATALOG_PERMISIUNI.includes(p)) return { ok: false, motiv: 'permisiune', detaliu: p };
  return { ok: true, manifest: { format: FORMAT, api: API, id, nume, versiune, intrare, stiluri, permisiuni, fisiere: fisiere as Record<string, string> } };
}

/** Pachetul din octeții unui `.zip`: citit, judecat și cu fiecare amprentă verificată; altfel motivul. */
export async function citestePachet(octeti: Uint8Array, limite: typeof LIMITE_PACHET = LIMITE_PACHET): Promise<RezultatPachet> {
  const z = await citesteZip(octeti, limite);
  if (!z.ok) return { ok: false, motiv: z.motiv, ...(z.nume !== undefined ? { detaliu: z.nume } : {}) };
  const intrari = new Map<string, Uint8Array>();
  for (const i of z.intrari) {
    if (intrari.has(i.nume)) return { ok: false, motiv: 'in-plus', detaliu: i.nume };
    intrari.set(i.nume, i.octeti);
  }
  const brut = intrari.get(MANIFEST);
  if (!brut) return { ok: false, motiv: 'fara-manifest' };
  let json: unknown;
  try {
    json = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(brut));
  } catch {
    return { ok: false, motiv: 'manifest', detaliu: 'json' };
  }
  const m = citesteManifest(json);
  if (!m.ok) return m;
  const fisiere = new Map<string, Uint8Array>();
  let total = 0;
  for (const [cale, h] of Object.entries(m.manifest.fisiere)) {
    const b = intrari.get(cale);
    if (!b) return { ok: false, motiv: 'lipsa', detaliu: cale };
    if (hex(await crypto.subtle.digest('SHA-256', new Uint8Array(b))) !== h) return { ok: false, motiv: 'amprenta', detaliu: cale };
    fisiere.set(cale, b);
    total += b.length;
  }
  for (const nume of intrari.keys()) if (nume !== MANIFEST && !fisiere.has(nume)) return { ok: false, motiv: 'in-plus', detaliu: nume };
  return { ok: true, pachet: { manifest: m.manifest, fisiere, octeti: total } };
}
