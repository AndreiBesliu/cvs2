/**
 * Modulul la cerere al textului (ADR 0105 §5, ADR 0106): cititorul de fonturi, așezarea și piesa, plus fonturile omului
 * (biblioteca din browser, fonturile sistemului), aduse de panoul textului la prima deschidere, nu în pachetul de pornire.
 * Un font se aduce o dată și se ține citit (ultimele câteva: unul al sistemului poate avea zeci de MB), la instanța din id
 * dacă e una numită a unui font variabil (ADR 0113).
 */
import { FaraStocare, octetiFont } from './biblioteca.ts';
import { citesteFont, type RezultatFont } from './font.ts';
import { FONTURI_INCLUSE } from './fonturi.ts';
import { instantaCeruta, sursaFont } from './fonturiOmului.ts';
import { octetiSistem, stareSistem } from './sistem.ts';
import { blocuriPiesei } from '../model/placute.ts';
import type { Piesa } from '../model/document.ts';
import { textePlacutei, type RezultatPlacuta } from './placute.ts';
import type { Font } from './font.ts';

export { aseazaText, type ParametriText, type TextAsezat } from './asezare.ts';
export { piesaText, type RezultatPiesaText } from './piesaText.ts';
export { aseazaPeCurba, type TextPeCurba } from './peCurba.ts';
export { lungimeCurba } from '../model/curba.ts';
export type { Font } from './font.ts';
export { adaugaFisier, adaugaGoogle, FaraStocare, listaBiblioteca, stergeFont, type FontSalvat, type RezultatAdaugare } from './biblioteca.ts';
export { listaSistem, sistemDisponibil, stareSistem, type FontSistem, type StareSistem } from './sistem.ts';
export { idFont, numeVarianta, PLAFON_FONTURI, sursaFont } from './fonturiOmului.ts';
export { sablonCuContinut, textePlacutei, type MotivPlacuta, type RezultatPlacuta } from './placute.ts';

/**
 * Ce iese din aducerea unui font: citit, refuzat de cititor, sau negăsit (`lipseste`: nu e în bibliotecă ori pe calculatorul
 * ăsta; `permisiune`: fonturile sistemului cer întâi un clic; `retea`; `necunoscut`: un id pe care versiunea asta nu-l știe).
 */
export type RezultatIncarcare =
  | RezultatFont
  | { readonly ok: false; readonly cod: 'lipseste' | 'permisiune' | 'retea' | 'necunoscut' | 'fara-stocare'; readonly detaliu?: string };

/** Câte fonturi citite se țin (cel mai vechi pleacă primul). */
const TINUTE = 12;
const citite = new Map<string, Promise<RezultatIncarcare>>();

/**
 * Fontul `id`, citit fără să fie ținut (cu aceleași refuzuri ca în panou): proba din fereastra fonturilor (ADR 0108 §5)
 * citește zeci de fonturi ale sistemului, iar cele mari (zeci de MB) nu trebuie să rămână în memorie după probă.
 */
export async function aduceFont(id: string): Promise<RezultatIncarcare> {
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
        return b ? citesteFont(b.octeti, b.fata, s.fel === 'incarcat' ? s.instanta : undefined) : { ok: false, cod: 'lipseste' };
      }
      case 'sistem': {
        const stare = await stareSistem();
        if (stare !== 'permis') return { ok: false, cod: stare === 'indisponibil' ? 'lipseste' : 'permisiune' };
        const b = await octetiSistem(s.postscript);
        if (!b) return { ok: false, cod: 'lipseste' };
        const r = citesteFont(b.octeti, b.fata);
        if (!r.ok) return r;
        // O instanță numită a unui font variabil (sistemul o dă ca față separată, cu fișierul întreg): citită la instanța ei.
        const k = instantaCeruta(r.font, s.postscript, b.complet);
        return k === null ? r : citesteFont(b.octeti, b.fata, k);
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
  const p = aduceFont(id);
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

/** Fonturile citite ale textelor unei piese: al unui id, sau null dacă nu e al piesei. */
export type FonturiPiesei = (id: string) => Font | null;

/**
 * Fonturile tuturor textelor piesei `p` (cu câmpuri sau fără), aduse o dată fiecare (ca în panoul textului). Un font care nu
 * vine e refuzul `font`, cu numele lui arătat (al blocului, al unui font inclus, sau id-ul).
 */
export async function fonturiPiesei(p: Piesa): Promise<{ readonly ok: true; readonly font: FonturiPiesei } | { readonly ok: false; readonly motiv: 'font'; readonly font: string }> {
  const fonturi = new Map<string, Font>();
  for (const t of blocuriPiesei(p)) {
    const id = t.bloc.font;
    if (fonturi.has(id)) continue;
    const r = await incarcaFont(id);
    if (!r.ok) return { ok: false, motiv: 'font', font: t.bloc.numeFont ?? FONTURI_INCLUSE.find((f) => f.id === id)?.nume ?? id };
    fonturi.set(id, r.font);
  }
  return { ok: true, font: (id) => fonturi.get(id) ?? null };
}

/**
 * Literele unei plăcuțe a piesei `p` cu valorile `valori` (ADR 0210 §4), cu fonturile textelor ei aduse întâi (`fonturiPiesei`).
 */
export async function textePlacuteiCuFonturi(p: Piesa, valori: Readonly<Record<string, string>>): Promise<RezultatPlacuta> {
  const f = await fonturiPiesei(p);
  return f.ok ? textePlacutei(p, valori, f.font) : f;
}
