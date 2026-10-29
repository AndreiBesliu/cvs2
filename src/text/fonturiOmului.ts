/**
 * Fonturile omului (ADR 0106 §2), partea pură care citește fonturi: fețele unui fișier încărcat (și dintr-o colecție, și
 * dintr-un WOFF despachetat), amprenta fișierului, fața după nume, instanța cerută dintr-un font variabil. Id-urile sunt în
 * `iduriFont.ts` (fără cititor: le folosește și panoul); browserul (IndexedDB, Local Font Access) în `biblioteca.ts` și
 * `sistem.ts`.
 */
import { citesteFont, feteFont, felFisier, type CodRefuzFont, type Font, type NumeFont } from './font.ts';

import { PLAFON_FONTURI } from './iduriFont.ts';

export { idFont, numeVarianta, PLAFON_FONTURI, sursaFont, type SursaFont } from './iduriFont.ts';

/** Amprenta unui fișier: SHA-256, primele 16 cifre hex (64 de biți: un id scurt, fără ciocniri între fonturile unui om). */
export async function amprentaFisier(octeti: Uint8Array): Promise<string> {
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', octeti as BufferSource));
  return [...h.subarray(0, 8)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Plafoanele „Fonturilor mele” (ADR 0106 §2): fețele de adăugat (`noi`) peste cele existente și octeții fișierului nou
 * (ținut o dată, după amprentă: un fișier deja în bibliotecă nu se mai numără) peste ai celor existente.
 */
export function plafonDepasit(existente: readonly { readonly amprenta: string; readonly marime: number }[], noi: number, amprenta: string, marime: number): boolean {
  const fisiere = new Map(existente.map((x) => [x.amprenta, x.marime]));
  const total = [...fisiere.values()].reduce((s, m) => s + m, 0) + (fisiere.has(amprenta) ? 0 : marime);
  return noi > 0 && (existente.length + noi > PLAFON_FONTURI.fete || total > PLAFON_FONTURI.octetiTotal);
}

export type FataGasita = { readonly fata: number; readonly nume: NumeFont };
export type FataRefuzata = { readonly fata: number; readonly nume: string; readonly cod: CodRefuzFont };

/**
 * Fețele unui fișier sfnt sau TTC, fiecare citită de cititor: cele bune intră în bibliotecă, cele refuzate se spun (cu
 * codul cititorului). Null: nu e un font (nici sfnt, nici colecție).
 */
export function feteDinFisier(octeti: Uint8Array): { readonly bune: readonly FataGasita[]; readonly refuzate: readonly FataRefuzata[] } | null {
  const fel = felFisier(octeti);
  if (fel !== 'font' && fel !== 'colectie') return null;
  const nume = feteFont(octeti);
  if (!nume) return null;
  const bune: FataGasita[] = [], refuzate: FataRefuzata[] = [];
  nume.forEach((n, fata) => {
    const r = citesteFont(octeti, fata);
    if (r.ok) bune.push({ fata, nume: n });
    else refuzate.push({ fata, nume: n.complet, cod: r.cod });
  });
  return { bune, refuzate };
}

/** Fața cu numele PostScript dat dintr-un fișier (o colecție are mai multe): după PostScript, apoi după numele complet. */
export function fataDupaNume(octeti: Uint8Array, postscript: string, complet: string): number {
  const nume = feteFont(octeti) ?? [];
  const k = nume.findIndex((n) => n.postscript === postscript);
  if (k >= 0) return k;
  const c = nume.findIndex((n) => n.complet === complet);
  return c >= 0 ? c : 0;
}

/**
 * Instanța numită, alta decât cea implicită, pe care o cere un nume al sistemului dintr-un font variabil (Bahnschrift
 * SemiBold, Segoe UI Variable Display): contururile citite sunt doar ale instanței implicite, deci ea se refuză (ADR 0106
 * §1). Null: fontul nu e variabil, sau numele e chiar al instanței implicite (ori nu se recunoaște: atunci contează fontul).
 */
export function instantaNecitita(font: Font, postscript: string, complet: string): string | null {
  if (!font.instante) return null;
  if (postscript === font.nume.postscript || complet === font.nume.complet) return null;
  const i = font.instante.find((x) => (x.postscript !== null && x.postscript === postscript) || `${font.nume.familie} ${x.stil}` === complet);
  return i && !i.implicita ? i.stil : null;
}
