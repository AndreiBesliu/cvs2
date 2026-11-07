import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { HttpsError } from 'firebase-functions/v2/https';
import { PROIECT_GZ_MAX_OCTETI, PROIECT_MAX_BASE64, PROIECT_MAX_OCTETI, type MetaProiectTichet } from '../../../shared/tichete.ts';

/**
 * Proiectul atașat unei raportări (ADR 0116 §12, felia 15.B↑b), din cerere: gzip în base64, cel mult 10 MB comprimat și
 * 10 MB despachetat, un JSON cu `schema` întreagă (un document cvs2; ușa lui îl judecă abia în fila Tichete, la deschidere:
 * un proiect care nu se deschide e tocmai ce poate raporta omul). Lipsa lui (sau null) = fără proiect.
 */

const argument = (motiv: string): HttpsError => new HttpsError('invalid-argument', `proiectul: ${motiv}`);

/**
 * Base64 strict, fără expresie regulată: pe câțiva MB, expresia pozei (`RE_BASE64`) cade în V8 cu „Maximum call stack size
 * exceeded” (măsurat: trece la 4 MB, cade la 8 MB). Decodarea ignoră caracterele străine, deci forma se verifică întorcând
 * octeții în base64: doar textul canonic (alfabetul standard, umplutura la capăt) iese la fel.
 */
function octetiDinBase64(p: string): Buffer | null {
  const o = Buffer.from(p, 'base64');
  return o.toString('base64') === p ? o : null;
}

export interface ProiectPrimit {
  /** Fișierul de pus în Storage, așa cum a venit (gzip). */
  readonly gz: Buffer;
  readonly meta: MetaProiectTichet;
}

export function proiectDin(p: unknown): ProiectPrimit | null {
  if (p === undefined || p === null) return null;
  if (typeof p !== 'string' || p.length === 0 || p.length > PROIECT_MAX_BASE64) throw argument('base64, cel mult 10 MB comprimat');
  const gz = octetiDinBase64(p);
  if (gz === null || gz.length === 0 || gz.length > PROIECT_GZ_MAX_OCTETI) throw argument('base64, cel mult 10 MB comprimat');
  if (gz[0] !== 0x1f || gz[1] !== 0x8b) throw argument('gzip');
  let json: Buffer;
  try {
    // Plafonul la despachetare: o bombă gzip se oprește la 10 MB, fără să umple memoria.
    json = gunzipSync(gz, { maxOutputLength: PROIECT_MAX_OCTETI });
  } catch (e) {
    const cod = typeof e === 'object' && e !== null ? (e as { code?: unknown }).code : undefined;
    throw argument(cod === 'ERR_BUFFER_TOO_LARGE' ? 'are peste 10 MB' : 'gzip stricat');
  }
  let doc: unknown;
  try {
    doc = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(json));
  } catch {
    throw argument('nu e un JSON în UTF-8');
  }
  const schema = typeof doc === 'object' && doc !== null && !Array.isArray(doc) ? (doc as Record<string, unknown>)['schema'] : undefined;
  if (typeof schema !== 'number' || !Number.isSafeInteger(schema) || schema < 1 || schema > 1000) throw argument('nu e un document cvs2 (schema)');
  return { gz, meta: { marime: json.length, comprimat: gz.length, sha256: createHash('sha256').update(json).digest('hex'), schema } };
}
