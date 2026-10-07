import * as v from 'valibot';
import { SchemaDocument, VERSIUNE_SCHEMA, type Document } from './document.ts';

/**
 * Singura ușă de încărcare (T16): orice document, din fișier, din IndexedDB sau din cloud, intră doar pe aici.
 * 1. versiunea: una mai veche trece prin migrările pure, una mai nouă e refuzată (nu ghicim ce n-am scris);
 * 2. schema, cu plafoanele ei;
 * 3. rezultatul e documentul curent, sau un motiv scris.
 */
export type RezultatIncarcare = { readonly ok: true; readonly doc: Document } | { readonly ok: false; readonly motiv: string };

/** Migrările pure, vN → vN+1. Cheia e versiunea de PLECARE. Lista crește; o migrare scrisă nu se mai schimbă. */
export const MIGRARI: Readonly<Record<number, (doc: Record<string, unknown>) => Record<string, unknown>>> = {};

export function incarca(brut: unknown): RezultatIncarcare {
  if (typeof brut !== 'object' || brut === null || Array.isArray(brut)) return { ok: false, motiv: 'documentul nu e un obiect' };
  let doc = brut as Record<string, unknown>;
  const versiune = doc['schema'];
  if (typeof versiune !== 'number' || !Number.isInteger(versiune) || versiune < 1) {
    return { ok: false, motiv: 'documentul n-are o versiune de schemă validă' };
  }
  if (versiune > VERSIUNE_SCHEMA) {
    return { ok: false, motiv: `documentul e scris de o versiune mai nouă (schema ${versiune}, aici ${VERSIUNE_SCHEMA}): actualizează aplicația` };
  }
  for (let n = versiune; n < VERSIUNE_SCHEMA; n++) {
    const migrare = MIGRARI[n];
    if (!migrare) return { ok: false, motiv: `lipsește migrarea ${n} → ${n + 1}` };
    doc = migrare(doc);
  }
  const r = v.safeParse(SchemaDocument, doc);
  if (!r.success) {
    const p = r.issues[0];
    const cale = p?.path?.map((x) => String(x.key)).join('.') ?? '';
    return { ok: false, motiv: `documentul nu respectă schema${cale ? ` la ${cale}` : ''}: ${p?.message ?? '?'}` };
  }
  return { ok: true, doc: r.output };
}

/** JSON canonic: cheile sortate la fiecare nivel, deci același document dă aceiași octeți (și același hash). */
export function jsonCanonic(x: unknown): string {
  if (Array.isArray(x)) return `[${x.map(jsonCanonic).join(',')}]`;
  if (x !== null && typeof x === 'object') {
    const o = x as Record<string, unknown>;
    return `{${Object.keys(o).filter((k) => o[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${jsonCanonic(o[k])}`).join(',')}}`;
  }
  if (typeof x === 'number' && !Number.isFinite(x)) throw new RangeError(`un număr nefinit (${x}) nu intră în document`);
  return JSON.stringify(x);
}
