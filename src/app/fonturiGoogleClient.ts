import type { MotivGoogle, RezultatCatalog } from '../cloud/apelFonturiGoogle.ts';
import type { RezultatAdaugare } from '../text/biblioteca.ts';
import { incarcaConfig } from './config.ts';

/**
 * Google Fonts în aplicație (ADR 0106 §4): legătura cu funcția (configurația instanței, conexiunea Firebase cu App Check),
 * adusă la cerere, abia când omul deschide Google Fonts sau cere din nou un font de acolo. Firebase nu intră în modulul
 * editării.
 */
type ModulText = typeof import('../text/calcul.ts');
type ApelGoogle = import('../cloud/apelFonturiGoogle.ts').ApelGoogle;

let legatura: Promise<{ readonly modul: typeof import('../cloud/apelFonturiGoogle.ts'); readonly apel: ApelGoogle | null }> | null = null;

function lega(): Promise<{ readonly modul: typeof import('../cloud/apelFonturiGoogle.ts'); readonly apel: ApelGoogle | null }> {
  legatura ??= Promise.all([incarcaConfig(window.fetch.bind(window)), import('../cloud/apelFonturiGoogle.ts')])
    .then(([c, modul]) => ({ modul, apel: c.ok ? modul.apelGoogle(c.config) : null }));
  // O legătură căzută (rețeaua, o versiune nouă a aplicației) se încearcă din nou la cererea următoare.
  void legatura.catch(() => { legatura = null; });
  return legatura;
}

/** Catalogul Google Fonts (ținut cât pagina, dacă a venit). */
let catalog: Promise<RezultatCatalog> | null = null;

export function catalogGoogle(): Promise<RezultatCatalog> {
  catalog ??= lega().then(({ modul, apel }) => (apel ? modul.catalogGoogle(apel) : { ok: false, motiv: 'fara-firebase' as const }), () => ({ ok: false, motiv: 'retea' as const }));
  void catalog.then((r) => { if (!r.ok) catalog = null; });
  return catalog;
}

export type RezultatGoogle = { readonly ok: true; readonly id: string; readonly rezultat: RezultatAdaugare } | { readonly ok: false; readonly motiv: MotivGoogle };

/** Varianta `familie` / `varianta` descărcată și pusă în „Fonturile mele”; `id`: cel al fontului (`g:<familia>:<varianta>`). */
export async function descarcaInBiblioteca(text: ModulText, familie: string, varianta: string): Promise<RezultatGoogle> {
  let l: Awaited<ReturnType<typeof lega>>;
  try {
    l = await lega();
  } catch {
    return { ok: false, motiv: 'retea' };
  }
  if (!l.apel) return { ok: false, motiv: 'fara-firebase' };
  const d = await l.modul.descarcaGoogle(l.apel, familie, varianta);
  if (!d.ok) return d;
  const rezultat = await text.adaugaGoogle(familie, varianta, d.octeti);
  return { ok: true, id: text.idFont({ fel: 'google', familie, varianta }), rezultat };
}
