/**
 * Trimiterea unui `.gcode` la imprimantă (ADR 0190 §C.7), ca OrcaSlicer (gazda „CrealityPrint”): `POST http://<ip>/upload/<nume>`,
 * multipart, cu fișierul în câmpul `file` și fără câmpul `path` (K1C e în lista CFS a lui OrcaSlicer), pe portul 80, cel din
 * fabrică. CSP-ul are `http:` în `connect-src` pentru ea (răspunsul owner-ului la întrebarea 3).
 *
 * Nu se știe încă dacă imprimanta trimite antete CORS: cererea pleacă `no-cors` (un POST multipart e o cerere „simplă”, fără
 * preflight), deci răspunsul nu se poate citi. Trimiterea se verifică în lista fișierelor de pe 9999, după nume. Ca verificarea
 * să spună ceva, numele e unul pe care lista nu-l are: un fișier din imprimantă nu se înlocuiește niciodată (poate fi chiar cel
 * care se imprimă), iar unul nou cu același nume primește „-2”, „-3”…
 */
import type { AdresaRetea } from '../reteaLocala.ts';
import { numeSigur, type FisierImprimanta } from './creality.ts';

/** Numele sub care pleacă un fișier: spațiile devin `_` (ca OrcaSlicer), doar `.gcode`, altul decât cele din listă; null: refuzat. */
export function numeDeTrimis(nume: string, existente: readonly string[]): string | null {
  const n = nume.trim().replace(/\s+/g, '_');
  if (!/.\.gcode$/i.test(n) || numeSigur(n) === null) return null;
  let x = n;
  for (let k = 2; existente.includes(x); k++) {
    if (k > 999) return null;
    x = `${n.slice(0, -6)}-${k}${n.slice(-6)}`;
  }
  return numeSigur(x);
}

/** Adresa e chiar calculatorul: acolo își ține proba imprimanta falsă (Chrome n-o vede ca rețea locală). */
const esteLoopback = (g: string): boolean => /^127\.|^\[::1\]$|(?:^|\.)localhost$/i.test(g);

/** Ce folosește verificarea din sesiune (probele o înlocuiesc). */
export type ListaImprimantei = {
  stare(): { readonly fisiere: readonly FisierImprimanta[] | null };
  reimprospateaza(): boolean;
};

/** De ce n-a ajuns: cererea n-a plecat sau n-a primit răspuns (`retea`), ori fișierul nu apare în lista imprimantei (`lipsa`). */
export type MotivUrcare = 'retea' | 'lipsa';
export type RezultatUrcare = { readonly ok: true; readonly fisier: FisierImprimanta } | { readonly ok: false; readonly motiv: MotivUrcare };

/**
 * Cât așteaptă lista după fiecare cerere și de câte ori o cere (imprimanta poate scrie fișierul încă o clipă); între timp se uită
 * în ea de `PRIVIRI` ori.
 */
export const ASTEPTARE_LISTA_MS = 2000;
export const CERERI_LISTA = 3;
const PRIVIRI = 8;

/** Trimite fișierul și îl caută apoi în lista imprimantei. O trimitere oprită de om respinge cu motivul semnalului. */
export async function urca(o: {
  readonly adresa: AdresaRetea;
  readonly nume: string;
  readonly date: Blob;
  readonly lista: ListaImprimantei;
  readonly semnal?: AbortSignal;
  readonly trimite?: typeof fetch;
  readonly asteptareMs?: number;
}): Promise<RezultatUrcare> {
  const fd = new FormData();
  fd.append('file', o.date, o.nume);
  try {
    await (o.trimite ?? fetch)(`http://${o.adresa.gazda}/upload/${encodeURIComponent(o.nume)}`, {
      method: 'POST', body: fd, mode: 'no-cors', signal: o.semnal ?? null,
      // Chrome (Local Network Access): cererea spre rețeaua locală o spune dinainte.
      ...(esteLoopback(o.adresa.gazda) ? {} : { targetAddressSpace: 'local' }),
    } as RequestInit);
  } catch (e) {
    if (o.semnal?.aborted) throw e;
    return { ok: false, motiv: 'retea' };
  }
  for (let k = 0; k < CERERI_LISTA * PRIVIRI; k++) {
    if (k % PRIVIRI === 0) o.lista.reimprospateaza();
    await new Promise((g) => { setTimeout(g, (o.asteptareMs ?? ASTEPTARE_LISTA_MS) / PRIVIRI); });
    o.semnal?.throwIfAborted();
    const f = o.lista.stare().fisiere?.find((x) => x.nume === o.nume);
    if (f) return { ok: true, fisier: f };
  }
  return { ok: false, motiv: 'lipsa' };
}
