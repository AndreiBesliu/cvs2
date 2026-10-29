/**
 * Modulul la cerere al textului (ADR 0105 §5): cititorul de fonturi, așezarea și piesa, aduse de panoul textului la prima
 * deschidere, nu în pachetul de pornire. Fontul se aduce o dată (fetch, din precache) și se ține citit.
 */
import { citesteFont, type RezultatFont } from './font.ts';
import { FONTURI_INCLUSE, type IdFont } from './fonturi.ts';

export { aseazaText, type ParametriText, type TextAsezat } from './asezare.ts';
export { piesaText, type RezultatPiesaText } from './piesaText.ts';
export type { Font } from './font.ts';

const citite = new Map<IdFont, Promise<RezultatFont>>();

/** Fontul inclus `id`, citit (o singură dată): un refuz al cititorului sau o eroare de rețea vin ca refuz, nu aruncă. */
export function incarcaFont(id: IdFont): Promise<RezultatFont> {
  const gata = citite.get(id);
  if (gata) return gata;
  const f = FONTURI_INCLUSE.find((x) => x.id === id)!;
  const p = fetch(new URL(f.fisier, document.baseURI)).then(async (r) => {
    if (!r.ok) return { ok: false, cod: 'stricat', detaliu: `HTTP ${r.status}` } as const;
    return citesteFont(new Uint8Array(await r.arrayBuffer()));
  }, (e: unknown) => ({ ok: false, cod: 'stricat', detaliu: e instanceof Error ? e.message : String(e) } as const));
  // Un eșec nu rămâne ținut: o încercare următoare (rețeaua revenită) îl cere din nou.
  void p.then((r) => { if (!r.ok) citite.delete(id); });
  citite.set(id, p);
  return p;
}
