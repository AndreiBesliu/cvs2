/**
 * Formele propuse de o extensie pentru desen (ADR 0166 §C), partea pură: serviciul `forme.propune(nume, date)` al lui
 * `HostApi`, cu permisiunea `forme`. Numele se curăță ca la descărcări (ADR 0129) și trebuie să fie un SVG sau un DXF; datele
 * (text, octeți sau `Blob`), cel mult cât un import (`PLAFON_IMPORT`, ADR 0035 §1), ajung ca fișier la `propune`: în
 * aplicație, fereastra Importă, deschisă pe Proiectare, cu „Propus de <extensie>”. Nimic nu intră în desen fără „Importă”.
 */
import { PLAFON_IMPORT } from '../io/svgCoduri.ts';
import { caBlob, numeDescarcare } from './descarcari.ts';
import type { RaspunsServiciu } from './stocare.ts';

/** Tipurile de fișier pe care le poate propune o extensie: ce citește importul și scrie un program de desen. */
export const TIPURI_FORME: readonly string[] = ['svg', 'dxf'];

/**
 * Ce face aplicația cu fișierul propus: null dacă a deschis fereastra Importă, altfel codul refuzului (`ocupat`: alt import
 * e deschis; `doar-citire`: fila doar citește; `indisponibila`: aplicația nu e gata).
 */
export type PropuneForme = (fisier: File, de: string) => 'ocupat' | 'doar-citire' | 'indisponibila' | null;

const refuz = (eroare: string): RaspunsServiciu => ({ ok: false, eroare: `forme:${eroare}` });

/** O cerere `forme.<metoda>`, cu permisiunile extensiei și numele ei; la `propune`, răspunsul e `deschis`. */
export function servesteFormele(permisiuni: readonly string[], numeExtensie: string, metoda: string, argumente: readonly unknown[],
  propune: PropuneForme): RaspunsServiciu {
  if (!permisiuni.includes('forme')) return refuz('permisiune');
  if (metoda !== 'propune') return refuz('necunoscut');
  const nume = numeDescarcare(argumente[0]);
  const tip = nume === null ? undefined : /\.([a-z0-9]+)$/i.exec(nume)?.[1]?.toLowerCase();
  if (nume === null || tip === undefined || !TIPURI_FORME.includes(tip)) return refuz('nume');
  const date = caBlob(argumente[1]);
  if (date === null) return refuz('date');
  if (date.size > PLAFON_IMPORT.octeti) return refuz('prea-mare');
  const r = propune(new File([date], nume, { type: tip === 'svg' ? 'image/svg+xml' : 'application/dxf' }), numeExtensie);
  return r === null ? { ok: true, rezultat: 'deschis' } : refuz(r);
}
