/**
 * Poza planșei atașată unei sugestii (ADR 0111) sau unei raportări (ADR 0116 §11), comună clientului și serverului: adusă
 * din editor, micșorată ca JPEG, trimisă în base64 odată cu cererea și ținută în documentul ei (`sugestii/{id}/poze/plansa`,
 * `tichete/{id}/poze/plansa`), lângă ce o poartă. Tipul se citește din primii octeți, nu din ce spune cererea. Stă în afara
 * contractului sugestiilor: editorul o ia de aici fără să-l aducă și pe acela.
 */
export const COLECTIE_POZE = 'poze';
export const ID_POZA = 'plansa';
export const POZA_MAX_OCTETI = 400 * 1024;
/** Cât are o poză la plafon, în base64 (4 caractere pe 3 octeți). */
export const POZA_MAX_BASE64 = Math.ceil(POZA_MAX_OCTETI / 3) * 4;
export type TipPoza = 'image/jpeg' | 'image/png' | 'image/webp';

/** Pură: octeții în base64, pe bucăți (ca `String.fromCharCode` să nu primească prea mulți parametri odată). */
export function baza64(o: Uint8Array): string {
  let s = '';
  for (let i = 0; i < o.length; i += 0x8000) s += String.fromCharCode(...o.subarray(i, i + 0x8000));
  return btoa(s);
}

/** Base64 strict: alfabetul standard, umplutura doar la capăt, lungimea multiplu de 4. */
export const RE_BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

const text4 = (o: Uint8Array, de: number): string => String.fromCharCode(...o.subarray(de, de + 4));

/** Pură: tipul unei imagini după semnătura ei (JPEG, PNG, WebP); altceva = null. */
export function tipPoza(o: Uint8Array): TipPoza | null {
  if (o.length >= 3 && o[0] === 0xff && o[1] === 0xd8 && o[2] === 0xff) return 'image/jpeg';
  if (o.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => o[i] === b)) return 'image/png';
  if (o.length >= 12 && text4(o, 0) === 'RIFF' && text4(o, 8) === 'WEBP') return 'image/webp';
  return null;
}
