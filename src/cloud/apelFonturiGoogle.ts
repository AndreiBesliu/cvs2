import { httpsCallable } from 'firebase/functions';
import {
  URL_TTF, type CatalogGoogle, type CerereFonturiGoogle, type MotivFonturiGoogle, type RaspunsFonturiGoogle,
} from '../../shared/fonturiGoogle.ts';
import { conecteazaBaza, type ConfigCloud } from './conexiuneBaza.ts';

/**
 * Google Fonts, partea clientului (ADR 0106 §4): catalogul și adresa unei variante vin prin funcția `fonturiGoogle` (App
 * Check, fără cont), iar fișierul TTF îl descarcă browserul direct de pe `fonts.gstatic.com` (CORS deschis). Fontul nu
 * trece prin server și nu se ține acolo.
 */

export type MotivGoogle = MotivFonturiGoogle | 'fara-firebase' | 'retea' | 'prea-mare';
export type RezultatCatalog = { readonly ok: true; readonly catalog: CatalogGoogle } | { readonly ok: false; readonly motiv: MotivGoogle };
export type RezultatDescarcare = { readonly ok: true; readonly octeti: Uint8Array } | { readonly ok: false; readonly motiv: MotivGoogle };

/** Cel mai mare fișier primit (o familie CJK are câțiva MB; același plafon ca un font încărcat). */
const PLAFON_OCTETI = 40 * 1024 * 1024;
const TERMEN_APEL_MS = 30_000;

export type ApelGoogle = (cerere: CerereFonturiGoogle) => Promise<RaspunsFonturiGoogle>;

/** Apelul funcției, peste conexiunea aplicației (App Check); null: instanța n-are Firebase (local, fără emulatoare). */
export function apelGoogle(config: ConfigCloud): ApelGoogle | null {
  const c = conecteazaBaza(config);
  if (!c.ok) return null;
  const f = httpsCallable<CerereFonturiGoogle, RaspunsFonturiGoogle>(c.conexiune.functii, 'fonturiGoogle', { timeout: TERMEN_APEL_MS });
  return async (cerere) => (await f(cerere)).data;
}

/** Catalogul (o dată pe pagină, dacă a venit). */
export async function catalogGoogle(apel: ApelGoogle): Promise<RezultatCatalog> {
  try {
    const r = await apel({ fel: 'catalog' });
    if (!r.ok) return r;
    return 'catalog' in r ? { ok: true, catalog: r.catalog } : { ok: false, motiv: 'nevalid' };
  } catch {
    return { ok: false, motiv: 'retea' };
  }
}

/** Fișierul TTF al variantei: adresa de la funcție (verificată: doar gstatic), apoi descărcarea, cu plafonul. */
export async function descarcaGoogle(apel: ApelGoogle, familie: string, varianta: string, cere: typeof fetch = fetch): Promise<RezultatDescarcare> {
  let url: string;
  try {
    const r = await apel({ fel: 'fisier', familie, varianta });
    if (!r.ok) return r;
    if (!('url' in r) || !URL_TTF.test(r.url)) return { ok: false, motiv: 'nevalid' };
    url = r.url;
  } catch {
    return { ok: false, motiv: 'retea' };
  }
  try {
    const r = await cere(url, { mode: 'cors', credentials: 'omit' });
    if (!r.ok) return { ok: false, motiv: 'google-indisponibil' };
    if (Number(r.headers.get('content-length') ?? 0) > PLAFON_OCTETI) return { ok: false, motiv: 'prea-mare' };
    const octeti = new Uint8Array(await r.arrayBuffer());
    return octeti.byteLength > PLAFON_OCTETI ? { ok: false, motiv: 'prea-mare' } : { ok: true, octeti };
  } catch {
    return { ok: false, motiv: 'retea' };
  }
}
