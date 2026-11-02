import { HttpsError } from 'firebase-functions/v2/https';
import { POZA_MAX_BASE64, POZA_MAX_OCTETI, RE_BASE64, tipPoza, type TipPoza } from '../../shared/poza.ts';

/**
 * Poza planșei dintr-o cerere (sugestiile, ADR 0111; tichetele, ADR 0116 §11), opțională: base64 strict, cel mult 400 kB,
 * o imagine JPEG, PNG sau WebP după semnătura ei, nu după ce spune cererea. Lipsa ei (sau null) = fără poză.
 */
export function pozaDin(p: unknown): { readonly octeti: Buffer; readonly tip: TipPoza } | null {
  if (p === undefined || p === null) return null;
  if (typeof p !== 'string' || p.length > POZA_MAX_BASE64 || !RE_BASE64.test(p)) throw new HttpsError('invalid-argument', 'poza: base64, cel mult 400 kB');
  const octeti = Buffer.from(p, 'base64');
  if (octeti.length === 0 || octeti.length > POZA_MAX_OCTETI) throw new HttpsError('invalid-argument', 'poza: cel mult 400 kB');
  const tip = tipPoza(octeti);
  if (tip === null) throw new HttpsError('invalid-argument', 'poza: o imagine JPEG, PNG sau WebP');
  return { octeti, tip };
}
