/**
 * Modulul la cerere al textului (ADR 0105 §5, ADR 0106): cititorul de fonturi, așezarea și piesa, plus fonturile omului
 * (biblioteca din browser, fonturile sistemului), aduse de panoul textului la prima deschidere, nu în pachetul de pornire.
 * Un font se aduce o dată și se ține citit (ultimele câteva: unul al sistemului poate avea zeci de MB).
 */
import { FaraStocare, octetiFont } from './biblioteca.ts';
import { citesteFont, type RezultatFont } from './font.ts';
import { FONTURI_INCLUSE } from './fonturi.ts';
import { instantaNecitita, sursaFont } from './fonturiOmului.ts';
import { octetiSistem, stareSistem } from './sistem.ts';

export { aseazaText, type ParametriText, type TextAsezat } from './asezare.ts';
export { piesaText, type RezultatPiesaText } from './piesaText.ts';
export type { Font } from './font.ts';
export { adaugaFisier, adaugaGoogle, FaraStocare, listaBiblioteca, stergeFont, type FontSalvat, type RezultatAdaugare } from './biblioteca.ts';
export { listaSistem, sistemDisponibil, stareSistem, type FontSistem, type StareSistem } from './sistem.ts';
export { idFont, numeVarianta, PLAFON_FONTURI, sursaFont } from './fonturiOmului.ts';

/**
 * Ce iese din aducerea unui font: citit, refuzat de cititor, sau negăsit (`lipseste`: nu e în bibliotecă ori pe calculatorul
 * ăsta; `permisiune`: fonturile sistemului cer întâi un clic; `instanta-variabila`: o instanță a unui font variabil, alta
 * decât cea implicită; `retea`; `necunoscut`: un id pe care versiunea asta nu-l știe).
 */
export type RezultatIncarcare =
  | RezultatFont
  | { readonly ok: false; readonly cod: 'lipseste' | 'permisiune' | 'instanta-variabila' | 'retea' | 'necunoscut' | 'fara-stocare'; readonly detaliu?: string };

/** Câte fonturi citite se țin (cel mai vechi pleacă primul). */
const TINUTE = 12;
const citite = new Map<string, Promise<RezultatIncarcare>>();

async function aduce(id: string): Promise<RezultatIncarcare> {
  const s = sursaFont(id);
  if (!s) return { ok: false, cod: 'necunoscut', detaliu: id };
  try {
    switch (s.fel) {
      case 'inclus': {
        const f = FONTURI_INCLUSE.find((x) => x.id === s.id)!;
        const r = await fetch(new URL(f.fisier, document.baseURI));
        if (!r.ok) return { ok: false, cod: 'retea', detaliu: `HTTP ${r.status}` };
        return citesteFont(new Uint8Array(await r.arrayBuffer()));
      }
      case 'incarcat':
      case 'google': {
        const b = await octetiFont(id);
        return b ? citesteFont(b.octeti, b.fata) : { ok: false, cod: 'lipseste' };
      }
      case 'sistem': {
        const stare = await stareSistem();
        if (stare !== 'permis') return { ok: false, cod: stare === 'indisponibil' ? 'lipseste' : 'permisiune' };
        const b = await octetiSistem(s.postscript);
        if (!b) return { ok: false, cod: 'lipseste' };
        const r = citesteFont(b.octeti, b.fata);
        if (!r.ok) return r;
        const stil = instantaNecitita(r.font, s.postscript, b.complet);
        return stil ? { ok: false, cod: 'instanta-variabila', detaliu: stil } : r;
      }
    }
  } catch (e) {
    return { ok: false, cod: e instanceof FaraStocare ? 'fara-stocare' : 'retea', detaliu: e instanceof Error ? e.message : String(e) };
  }
}

/** Fontul `id`, citit (o singură dată): un refuz sau o eroare vin ca rezultat, nu aruncă. */
export function incarcaFont(id: string): Promise<RezultatIncarcare> {
  const gata = citite.get(id);
  if (gata) {
    // Cel folosit acum trece la urmă: pleacă ultimul.
    citite.delete(id);
    citite.set(id, gata);
    return gata;
  }
  const p = aduce(id);
  // Un eșec nu rămâne ținut: o încercare următoare (rețeaua revenită, fontul încărcat, permisiunea dată) îl cere din nou.
  void p.then((r) => { if (!r.ok) citite.delete(id); });
  citite.set(id, p);
  while (citite.size > TINUTE) citite.delete(citite.keys().next().value!);
  return p;
}

/** Uită fontul `id` (șters din bibliotecă): următoarea cerere îl caută din nou. */
export function uitaFont(id: string): void {
  citite.delete(id);
}
