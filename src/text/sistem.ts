/**
 * Fonturile sistemului (ADR 0106 §3), prin Local Font Access (`queryLocalFonts`, Chrome și Edge pe calculator, din 103):
 * lista lor (după permisiunea omului, cerută de browser la primul clic) și octeții unuia, după numele PostScript. Nimic nu
 * se copiază în bibliotecă: blocul ține numele, iar fontul se caută din nou la editare (pe alt calculator poate lipsi).
 * O colecție (TTC) vine întreagă: fața se alege după nume.
 */
import { fataDupaNume } from './fonturiOmului.ts';

/** Ce dă browserul pentru o față (`FontData`). */
type DateFont = { readonly postscriptName: string; readonly fullName: string; readonly family: string; readonly style: string; blob(): Promise<Blob> };
type CautaFonturi = (o?: { postscriptNames?: string[] }) => Promise<DateFont[]>;

export type FontSistem = { readonly id: string; readonly postscript: string; readonly complet: string; readonly familie: string; readonly stil: string };

export type StareSistem = 'permis' | 'de-cerut' | 'refuzat' | 'indisponibil';

const cauta = (): CautaFonturi | null => {
  const f = (globalThis as { queryLocalFonts?: unknown }).queryLocalFonts;
  return typeof f === 'function' ? (f as CautaFonturi).bind(globalThis) : null;
};

export const sistemDisponibil = (): boolean => cauta() !== null;

/** Starea permisiunii, fără s-o ceară. */
export async function stareSistem(): Promise<StareSistem> {
  if (!cauta()) return 'indisponibil';
  try {
    const s = await navigator.permissions.query({ name: 'local-fonts' as PermissionName });
    return s.state === 'granted' ? 'permis' : s.state === 'denied' ? 'refuzat' : 'de-cerut';
  } catch {
    return 'de-cerut';
  }
}

let lista: Promise<FontSistem[]> | null = null;

/**
 * Fonturile sistemului, ordonate după familie și stil, fiecare o dată (după numele PostScript). Prima cerere, cât
 * permisiunea e „de cerut”, trebuie să vină dintr-un clic: browserul întreabă omul. Un refuz respinge promisiunea.
 */
export function listaSistem(): Promise<FontSistem[]> {
  const f = cauta();
  if (!f) return Promise.resolve([]);
  lista ??= f().then((date) => {
    const vazute = new Set<string>();
    const rez: FontSistem[] = [];
    for (const d of date) {
      if (!d.postscriptName || vazute.has(d.postscriptName)) continue;
      vazute.add(d.postscriptName);
      rez.push({ id: `s:${d.postscriptName}`, postscript: d.postscriptName, complet: d.fullName, familie: d.family, stil: d.style });
    }
    return rez.sort((a, b) => (a.familie === b.familie ? (a.stil < b.stil ? -1 : a.stil > b.stil ? 1 : 0) : a.familie < b.familie ? -1 : 1));
  });
  void lista.catch(() => { lista = null; });
  return lista;
}

/** Octeții fontului sistemului cu numele PostScript dat (și fața lui, într-o colecție); null: nu e pe calculatorul ăsta. */
export async function octetiSistem(postscript: string): Promise<{ readonly octeti: Uint8Array; readonly fata: number; readonly complet: string } | null> {
  const f = cauta();
  if (!f) return null;
  const [d] = await f({ postscriptNames: [postscript] });
  if (!d) return null;
  const octeti = new Uint8Array(await (await d.blob()).arrayBuffer());
  return { octeti, fata: fataDupaNume(octeti, postscript, d.fullName), complet: d.fullName };
}
