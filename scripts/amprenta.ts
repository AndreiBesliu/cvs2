/**
 * Amprenta publicării pe Firestore (`meta/deployment`, ADR 0044): scrisă de `publica.ts` după fiecare publicare reușită,
 * doar pe țintele publicate (celelalte își păstrează publicarea lor), citită de Diagnoză și de workflow (live publică doar
 * ce e deja pe test). Prin API-ul REST al Firestore, cu identitatea publicării (IAM, nu reguli: regulile o refuză oricărui
 * client). Codarea, decodarea și cererile sunt pure față de client (injectat în teste).
 */
import {
  amprentaDin, APP, SCHEMA_AMPRENTA, TOATE_TINTELE, type Amprenta, type Publicare, type Tinta,
} from '../shared/publicare.ts';
import type { ClientApi } from './firebase-api.ts';

export const CALE_AMPRENTA = 'meta/deployment';

type ValoareFirestore =
  | { stringValue: string } | { booleanValue: boolean } | { integerValue: string }
  | { mapValue: { fields: Record<string, ValoareFirestore> } };

/** O valoare simplă (text, boolean, întreg, obiect) în forma REST a Firestore. Altceva aruncă: amprenta n-are altceva. */
export function inFirestore(x: unknown): ValoareFirestore {
  if (typeof x === 'string') return { stringValue: x };
  if (typeof x === 'boolean') return { booleanValue: x };
  if (typeof x === 'number' && Number.isInteger(x)) return { integerValue: String(x) };
  if (typeof x === 'object' && x !== null && !Array.isArray(x)) {
    return { mapValue: { fields: Object.fromEntries(Object.entries(x).filter(([, v]) => v !== undefined).map(([k, v]) => [k, inFirestore(v)])) } };
  }
  throw new Error(`valoare fără loc în amprentă: ${JSON.stringify(x)}`);
}

/** Forma REST înapoi în valori simple (și ce ar putea apărea scris din consolă: timestamp, null, tablou). */
export function dinFirestore(v: unknown): unknown {
  if (typeof v !== 'object' || v === null) return undefined;
  const o = v as Record<string, unknown>;
  if ('stringValue' in o) return o['stringValue'];
  if ('booleanValue' in o) return o['booleanValue'];
  if ('integerValue' in o) return Number(o['integerValue']);
  if ('doubleValue' in o) return o['doubleValue'];
  if ('timestampValue' in o) return o['timestampValue'];
  if ('nullValue' in o) return null;
  if ('arrayValue' in o) return ((o['arrayValue'] as { values?: unknown[] }).values ?? []).map(dinFirestore);
  if ('mapValue' in o) return campuriDin((o['mapValue'] as { fields?: Record<string, unknown> }).fields ?? {});
  return undefined;
}

function campuriDin(f: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(f).map(([k, v]) => [k, dinFirestore(v)]));
}

/**
 * Cererea de scriere: câmpurile documentului și masca (`updateMask`): antetul (schema, aplicația, proiectul) și doar
 * țintele publicate acum, deci publicarea unei părți nu șterge ce știe amprenta despre celelalte.
 */
export function cerereScriere(proiect: string, tinte: readonly Tinta[], p: Publicare): { readonly corp: unknown; readonly masca: URLSearchParams } {
  if (tinte.length === 0) throw new Error('nicio țintă de scris în amprentă');
  const masca = new URLSearchParams();
  for (const c of ['schema', 'app', 'projectId', ...tinte.map((t) => `tinte.${t}`)]) masca.append('updateMask.fieldPaths', c);
  const peTinte = Object.fromEntries(tinte.map((t) => [t, t === 'hosting' ? p : { ...p, builtAt: undefined }]));
  const doc = { schema: SCHEMA_AMPRENTA, app: APP, projectId: proiect, tinte: peTinte };
  return { corp: { fields: (inFirestore(doc) as { mapValue: { fields: Record<string, ValoareFirestore> } }).mapValue.fields }, masca };
}

const caleDocument = (proiect: string): string => `/projects/${proiect}/databases/(default)/documents/${CALE_AMPRENTA}`;

export async function scrieAmprenta(client: ClientApi, proiect: string, tinte: readonly Tinta[], p: Publicare): Promise<void> {
  const { corp, masca } = cerereScriere(proiect, tinte, p);
  const r = await client.patch(caleDocument(proiect), corp, { queryParams: masca, resolveOnHTTPError: true });
  if (r.status !== 200) throw new Error(`amprenta nu s-a scris pe ${proiect}: HTTP ${r.status} ${JSON.stringify(r.body).slice(0, 300)}`);
}

/** Amprenta unei instanțe: `null` dacă documentul lipsește; o eroare de citire aruncă. */
export async function citesteAmprenta(client: ClientApi, proiect: string): Promise<Amprenta | 'nevalid' | null> {
  const r = await client.get(caleDocument(proiect), { resolveOnHTTPError: true });
  if (r.status === 404) return null;
  if (r.status !== 200) throw new Error(`amprenta nu s-a putut citi de pe ${proiect}: HTTP ${r.status}`);
  const f = (r.body as { fields?: Record<string, unknown> } | null)?.fields;
  return amprentaDin(f ? campuriDin(f) : null);
}

/**
 * Live publică doar un commit deja publicat întreg pe test, din arborele curat (decizia din 15.08: „exact un sha trecut
 * prin test”): toate țintele testului, din același commit.
 */
export function shaPublicatPeTest(a: Amprenta | 'nevalid' | null, sha: string): { readonly ok: true } | { readonly ok: false; readonly motiv: string } {
  if (a === null) return { ok: false, motiv: 'testul n-are amprentă: publică întâi commit-ul pe test (workflow-ul, instanța test)' };
  if (a === 'nevalid') return { ok: false, motiv: 'amprenta testului are altă formă' };
  for (const t of TOATE_TINTELE) {
    const p = a.tinte[t];
    if (!p) return { ok: false, motiv: `pe test, ținta ${t} n-a fost publicată prin script` };
    if (p.gitSha !== sha) return { ok: false, motiv: `pe test, ținta ${t} e din ${p.gitSha}, nu din ${sha}` };
    if (!p.arboreCurat) return { ok: false, motiv: `pe test, ținta ${t} s-a publicat cu modificări necomise` };
  }
  return { ok: true };
}
