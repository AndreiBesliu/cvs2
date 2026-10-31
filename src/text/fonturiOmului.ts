/**
 * Fonturile omului (ADR 0106 §2), partea pură care citește fonturi: fețele unui fișier încărcat (și dintr-o colecție, și
 * dintr-un WOFF despachetat), cu instanțele numite ale celor variabile (ADR 0113), amprenta fișierului, fața după nume,
 * instanța cerută de un nume al sistemului. Id-urile sunt în `iduriFont.ts` (fără cititor: le folosește și panoul);
 * browserul (IndexedDB, Local Font Access) în `biblioteca.ts` și `sistem.ts`.
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
 * (ținut o dată, după amprentă: un fișier deja în bibliotecă nu se mai numără) peste ai celor existente. Instanțele numite
 * (ADR 0113, cu `instanta`) nu sunt fețe: nu se numără.
 */
export function plafonDepasit(
  existente: readonly { readonly amprenta: string; readonly marime: number; readonly instanta?: number }[], noi: number, amprenta: string, marime: number,
): boolean {
  const fisiere = new Map(existente.map((x) => [x.amprenta, x.marime]));
  const total = [...fisiere.values()].reduce((s, m) => s + m, 0) + (fisiere.has(amprenta) ? 0 : marime);
  const fete = existente.filter((x) => x.instanta === undefined).length;
  return noi > 0 && (fete + noi > PLAFON_FONTURI.fete || total > PLAFON_FONTURI.octetiTotal);
}

/** O instanță numită a unei fețe variabile (ADR 0113): indicele ei din `fvar` și numele ei, ca al unei fețe. */
export type InstantaGasita = { readonly indice: number; readonly nume: NumeFont };
/** O față bună, cu instanțele ei numite (afară de cea implicită: e fața însăși). */
export type FataGasita = { readonly fata: number; readonly nume: NumeFont; readonly instante: readonly InstantaGasita[] };
export type FataRefuzata = { readonly fata: number; readonly nume: string; readonly cod: CodRefuzFont };

/** Doar literele și cifrele unui nume (ca într-un nume PostScript). */
const alfanumeric = (s: string): string => s.replace(/[^A-Za-z0-9]/g, '');

/**
 * Instanțele numite ale unei fețe variabile (ADR 0113), afară de cele la coordonatele implicite (sunt fața însăși), cel mult
 * `PLAFON_FONTURI.instante`. Numele: familia feței și stilul instanței; cel PostScript, al instanței sau făcut din ele.
 */
export function instanteNumite(font: Font): InstantaGasita[] {
  const rez: InstantaGasita[] = [];
  font.instante?.forEach((x, indice) => {
    if (x.implicita || rez.length >= PLAFON_FONTURI.instante) return;
    const familie = font.nume.familie;
    const prefix = font.nume.postscript.split('-')[0] || alfanumeric(familie);
    rez.push({ indice, nume: { familie, stil: x.stil, complet: `${familie} ${x.stil}`, postscript: x.postscript ?? `${prefix}-${alfanumeric(x.stil)}` } });
  });
  return rez;
}

/**
 * Fețele unui fișier sfnt sau TTC, fiecare citită de cititor: cele bune intră în bibliotecă (cu instanțele lor numite),
 * cele refuzate se spun (cu codul cititorului). Null: nu e un font (nici sfnt, nici colecție).
 */
export function feteDinFisier(octeti: Uint8Array): { readonly bune: readonly FataGasita[]; readonly refuzate: readonly FataRefuzata[] } | null {
  const fel = felFisier(octeti);
  if (fel !== 'font' && fel !== 'colectie') return null;
  const nume = feteFont(octeti);
  if (!nume) return null;
  const bune: FataGasita[] = [], refuzate: FataRefuzata[] = [];
  nume.forEach((n, fata) => {
    const r = citesteFont(octeti, fata);
    if (r.ok) bune.push({ fata, nume: n, instante: instanteNumite(r.font) });
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
 * SemiBold, Segoe UI Variable Display; sistemul le dă ca fețe separate, cu fișierul fontului variabil): indicele ei din
 * `fvar`, după numele PostScript sau cel complet (ADR 0113). Null: fontul nu e variabil, sau numele e chiar al instanței
 * implicite (ori nu se recunoaște: atunci contează fontul, ca în ADR 0106 §1).
 */
export function instantaCeruta(font: Font, postscript: string, complet: string): number | null {
  if (!font.instante) return null;
  if (postscript === font.nume.postscript || complet === font.nume.complet) return null;
  const k = font.instante.findIndex((x) => (x.postscript !== null && x.postscript === postscript) || `${font.nume.familie} ${x.stil}` === complet);
  return k >= 0 && !font.instante[k]!.implicita ? k : null;
}
