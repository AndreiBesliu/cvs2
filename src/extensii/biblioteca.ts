/**
 * Biblioteca extensiilor (ADR 0230), partea gazdei: catalogul cerut de lângă aplicație, starea fiecărui rând față de ce e
 * instalat (Instalează, Actualizează, Instalată, o versiune alta, Reîncarcă), ce cere în plus o versiune nouă și drumul unei
 * instalări din bibliotecă:
 * 1. descărcarea pachetului de lângă catalog, oprită peste mărimea scrisă în catalog;
 * 2. amprenta SHA-256 a octeților, egală cu cea din catalog, ÎNAINTE de orice citire a `.zip`-ului;
 * 3. judecata de azi a pachetului (`pachet.ts`: manifestul, amprenta fiecărui fișier, limitele);
 * 4. id-ul, numele, versiunea, `api`-ul și permisiunile manifestului, egale cu ale rândului;
 * 5. abia apoi scrierea, cu sursa „biblioteca”.
 * O nepotrivire e un defect al publicării (`defect: true`, de pus în jurnal), nu al omului; lipsa rețelei nu e.
 * `fetch`, `crypto.subtle` și scrierea vin ca parametri unde contează: aceeași judecată în Node (probele) și în browser.
 */
import { ADRESA_CATALOG, citesteCatalog, comparaVersiuni, type CatalogBiblioteca, type RandBiblioteca } from '../../shared/biblioteca.ts';
import type { ExtensieInstalata } from './depozit.ts';
import { API, CATALOG_PERMISIUNI, citestePachet, type Manifest, type MotivPachet, type Pachet, type RezultatPachet } from './pachet.ts';

export type StareRand =
  | { readonly fel: 'instaleaza' }
  | { readonly fel: 'actualizeaza'; readonly de: string; readonly permisiuniNoi: readonly string[] }
  | { readonly fel: 'instalata' }
  /** Instalată o versiune care nu e mai veche (un pachet de probă) sau nu se poate compara: biblioteca nu coboară versiunea. */
  | { readonly fel: 'alta'; readonly versiune: string }
  /** Rândul cere ce nu știe fila de acum (o permisiune nouă, alt `api`): o filă rămasă pe o versiune veche a aplicației. */
  | { readonly fel: 'reincarca' };

export type MotivBiblioteca = 'retea' | 'http' | 'amprenta-biblioteca' | 'biblioteca-nepotrivita';
export type RefuzBiblioteca = {
  readonly ok: false;
  readonly motiv: MotivBiblioteca | MotivPachet;
  readonly detaliu?: string;
  /** Un defect al publicării (de pus în jurnal); lipsa rețelei nu e. */
  readonly defect: boolean;
};
export type StareCatalog =
  | { readonly fel: 'ok'; readonly catalog: CatalogBiblioteca }
  | { readonly fel: 'retea' }
  | { readonly fel: 'defect'; readonly detaliu: string };

/** Pură: permisiunile versiunii noi pe care cea instalată nu le avea, în ordinea lor. */
export function permisiuniNoi(vechi: readonly string[], noi: readonly string[]): string[] {
  return noi.filter((p) => !vechi.includes(p));
}

/** Pură: ce poate face omul cu un rând al bibliotecii, după extensia instalată cu același id (sau niciuna). */
export function stareRand(
  rand: RandBiblioteca,
  instalata: Manifest | undefined,
  catalog: readonly string[] = CATALOG_PERMISIUNI,
  api: number = API,
): StareRand {
  if (rand.api !== api || rand.permisiuni.some((p) => !catalog.includes(p))) return { fel: 'reincarca' };
  if (!instalata) return { fel: 'instaleaza' };
  const c = comparaVersiuni(instalata.versiune, rand.versiune);
  if (c === -1) return { fel: 'actualizeaza', de: instalata.versiune, permisiuniNoi: permisiuniNoi(instalata.permisiuni, rand.permisiuni) };
  if (c === 0) return { fel: 'instalata' };
  return { fel: 'alta', versiune: instalata.versiune };
}

const refuz = (motiv: RefuzBiblioteca['motiv'], defect: boolean, detaliu?: string): RefuzBiblioteca =>
  ({ ok: false, motiv, defect, ...(detaliu !== undefined ? { detaliu } : {}) });

/** SHA-256 al octeților, hex mic. */
export async function sha256Hex(b: Uint8Array): Promise<string> {
  const h = await crypto.subtle.digest('SHA-256', new Uint8Array(b));
  return [...new Uint8Array(h)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

/** Catalogul bibliotecii, cerut din nou (`no-cache`: un 304 când nu s-a schimbat). */
export async function cereCatalogul(adresa: string = ADRESA_CATALOG, f: typeof fetch = fetch): Promise<StareCatalog> {
  let r: Response;
  try {
    r = await f(adresa, { credentials: 'omit', cache: 'no-cache' });
  } catch {
    return { fel: 'retea' };
  }
  if (!r.ok) return { fel: 'defect', detaliu: `HTTP ${r.status}` };
  let json: unknown;
  try {
    json = await r.json();
  } catch {
    return { fel: 'defect', detaliu: 'json' };
  }
  const c = citesteCatalog(json);
  return c.ok ? { fel: 'ok', catalog: c.catalog } : { fel: 'defect', detaliu: c.detaliu };
}

/**
 * Octeții unui pachet, opriți peste `octeti` (mărimea din catalog): restul fluxului nu se mai cere, iar octeții n-au cum fi ai
 * pachetului din catalog (`amprenta-biblioteca`).
 */
export async function descarcaPachetul(adresa: string, octeti: number, f: typeof fetch = fetch): Promise<{ readonly ok: true; readonly octeti: Uint8Array } | RefuzBiblioteca> {
  let r: Response;
  try {
    r = await f(adresa, { credentials: 'omit' });
  } catch (e) {
    return refuz('retea', false, e instanceof Error ? e.message : String(e));
  }
  if (!r.ok || !r.body) return refuz('http', true, `HTTP ${r.status}`);
  const cititor = r.body.getReader();
  const bucati: Uint8Array[] = [];
  let n = 0;
  for (;;) {
    let pas: ReadableStreamReadResult<Uint8Array>;
    try {
      pas = await cititor.read();
    } catch (e) {
      return refuz('retea', false, e instanceof Error ? e.message : String(e));
    }
    if (pas.done) break;
    n += pas.value.length;
    if (n > octeti) {
      await cititor.cancel();
      return refuz('amprenta-biblioteca', true, `peste ${octeti} octeți`);
    }
    bucati.push(pas.value);
  }
  const tot = new Uint8Array(n);
  let p = 0;
  for (const b of bucati) { tot.set(b, p); p += b.length; }
  return { ok: true, octeti: tot };
}

const aceleasi = (a: readonly string[], b: readonly string[]): boolean => a.length === b.length && a.every((x, i) => x === b[i]);

/**
 * Octeții descărcați, judecați față de rândul lor: întâi mărimea și amprenta (cititorul nu vede niciun octet nepotrivit),
 * apoi pachetul, apoi potrivirea manifestului cu rândul.
 */
export async function judecaDinBiblioteca(
  octeti: Uint8Array,
  rand: RandBiblioteca,
  citeste: (o: Uint8Array) => Promise<RezultatPachet> = citestePachet,
): Promise<{ readonly ok: true; readonly pachet: Pachet } | RefuzBiblioteca> {
  if (octeti.length !== rand.octeti) return refuz('amprenta-biblioteca', true, `${octeti.length} octeți, nu ${rand.octeti}`);
  if (await sha256Hex(octeti) !== rand.sha256) return refuz('amprenta-biblioteca', true, rand.pachet);
  const r = await citeste(octeti);
  if (!r.ok) return refuz(r.motiv, true, r.detaliu);
  const m = r.pachet.manifest;
  if (m.id !== rand.id || m.nume !== rand.nume || m.versiune !== rand.versiune || m.api !== rand.api || !aceleasi(m.permisiuni, rand.permisiuni)) {
    return refuz('biblioteca-nepotrivita', true, rand.id);
  }
  return { ok: true, pachet: r.pachet };
}

/**
 * Instalarea (sau actualizarea) unei extensii din bibliotecă, după gestul omului: descărcarea de lângă catalog, judecata, abia
 * apoi scrierea, cu sursa `biblioteca` și amprenta. Același id înlocuiește rândul instalat și îi păstrează datele (ADR 0128 §B).
 */
export async function instaleazaDinBiblioteca(rand: RandBiblioteca, d: {
  /** Adresa absolută a catalogului: pachetul stă lângă el. */
  readonly adresaCatalog: string;
  readonly scrie: (e: ExtensieInstalata) => Promise<void>;
  readonly fetch?: typeof fetch;
  readonly acum?: () => Date;
}): Promise<{ readonly ok: true; readonly extensie: ExtensieInstalata } | RefuzBiblioteca> {
  const descarcat = await descarcaPachetul(new URL(rand.pachet, d.adresaCatalog).href, rand.octeti, d.fetch ?? fetch);
  if (!descarcat.ok) return descarcat;
  const j = await judecaDinBiblioteca(descarcat.octeti, rand);
  if (!j.ok) return j;
  const p = j.pachet;
  const extensie: ExtensieInstalata = {
    id: p.manifest.id, manifest: p.manifest, fisiere: Object.fromEntries(p.fisiere), octeti: p.octeti,
    sursa: { fel: 'biblioteca', sha256: rand.sha256 }, instalat: (d.acum ?? (() => new Date()))().toISOString(),
  };
  await d.scrie(extensie);
  return { ok: true, extensie };
}
