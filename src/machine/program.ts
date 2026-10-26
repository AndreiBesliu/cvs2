/**
 * Încărcarea unui program pentru trimitere (ADR 0080, T20): senderul primește octeți (și, de la export, amprenta lor), nu
 * documentul. Trimite exact octeții încărcați, linie cu linie, și arată SHA-256-ul lor. Refuză, cu linia, ce nu poate trimite
 * corect (`docs/PORTARE.md` §3.4):
 * - un octet peste 0x7F (la GRBL 1.1 unele sunt override-uri: „ș” readuce axul la 100 %, „ț” îl coboară, ADR 0079 §5);
 * - un `\r` (GRBL închide linia și la `\r`: „\r\n” ar fi două linii, două `ok`, iar socoteala s-ar strica);
 * - o linie de peste 70 de octeți (regula 1; GRBL păstrează cel mult 79 de caractere, fără spații și comentarii);
 * - lipsa unui WCS (`G54`–`G59`) înaintea primei mișcări (regula 11: nu se presupune `G54`);
 * - `M6` într-un program străin (blocul de după schimbarea sculei îl scrie doar postul nostru);
 * - ultima linie fără `\n` (GRBL n-ar executa-o niciodată);
 * - o amprentă care nu se potrivește cu cea a exportului.
 * Liniile cu `M0`, `M1` sau `M6` sunt bariere (regula 6): nu pleacă la controler; cele vecine (cu linii goale sau doar comentarii
 * între ele) sunt o singură oprire.
 */

export const LUNGIME_MAXIMA_LINIE = 70;

export type Bariera = 'M0' | 'M1' | 'M6';
export type LinieProgram = {
  readonly index: number;
  readonly text: string;
  /** Cât ocupă în bufferul controlerului: octeții + `\n`. */
  readonly cost: number;
  readonly bariera: readonly Bariera[] | null;
};
export type ProgramIncarcat = {
  readonly octeti: Uint8Array;
  readonly sha256: string;
  readonly linii: readonly LinieProgram[];
  /** WCS-ul declarat de program înaintea primei mișcări. */
  readonly wcs: string;
};
export type CodRefuzProgram = 'gol' | 'non-ascii' | 'cr' | 'fara-final' | 'linie-lunga' | 'fara-wcs' | 'm6-strain' | 'hash';
export type RezultatIncarcare =
  | { readonly ok: true; readonly program: ProgramIncarcat }
  | { readonly ok: false; readonly cod: CodRefuzProgram; readonly linie: number | null };

/** Linia cum o vede controlerul: fără comentarii și spații, cu literele mari. */
export function linieCurata(text: string): string {
  return text.replace(/\([^)]*\)/g, '').replace(/;.*$/, '').replace(/\s+/g, '').toUpperCase();
}

/** Barierele unei linii curate (`M0`, `M00`, `M1`, `M01`, `M6`, `M06`), în ordine. */
export function bariereLinie(curata: string): Bariera[] {
  const out: Bariera[] = [];
  for (const m of curata.matchAll(/M0*([016])(?![\d.])/g)) out.push(m[1] === '0' ? 'M0' : m[1] === '1' ? 'M1' : 'M6');
  return out;
}

async function sha256(octeti: Uint8Array): Promise<string> {
  const copie = new Uint8Array(octeti);
  const r = await crypto.subtle.digest('SHA-256', copie);
  return [...new Uint8Array(r)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Pură (în afara amprentei): programul de trimis, sau refuzul cu linia lui (de la 0). `sursa`: `export` (din aplicație, cu
 * amprenta scrisă la export) sau `fisier` (un program străin).
 */
export async function incarcaProgram(
  octeti: Uint8Array, opt: { readonly sursa: 'export' | 'fisier'; readonly sha256?: string },
): Promise<RezultatIncarcare> {
  if (octeti.length === 0) return { ok: false, cod: 'gol', linie: null };
  let text = '';
  for (const b of octeti) text += String.fromCharCode(b);
  const linii = text.split('\n');
  const finala = linii.pop();
  if (finala !== '') return { ok: false, cod: 'fara-final', linie: linii.length };
  let wcs: string | null = null;
  const rezultat: LinieProgram[] = [];
  for (const [i, l] of linii.entries()) {
    for (let k = 0; k < l.length; k++) if (l.charCodeAt(k) > 0x7f) return { ok: false, cod: 'non-ascii', linie: i };
    if (l.includes('\r')) return { ok: false, cod: 'cr', linie: i };
    if (l.length > LUNGIME_MAXIMA_LINIE) return { ok: false, cod: 'linie-lunga', linie: i };
    const c = linieCurata(l);
    const b = bariereLinie(c);
    if (b.includes('M6') && opt.sursa === 'fisier') return { ok: false, cod: 'm6-strain', linie: i };
    const w = /G5([4-9])(?![\d.])/.exec(c);
    if (w && wcs === null) wcs = `G5${w[1] ?? ''}`;
    // O mișcare (G0–G3 sau un cuvânt de axă) înaintea oricărui WCS: regula 11.
    if (wcs === null && (/G0*[0-3](?![\d.])/.test(c) || /[XYZABC][-+.\d]/.test(c))) return { ok: false, cod: 'fara-wcs', linie: i };
    rezultat.push({ index: i, text: l, cost: l.length + 1, bariera: b.length > 0 ? b : null });
  }
  if (wcs === null) return { ok: false, cod: 'fara-wcs', linie: null };
  const amprenta = await sha256(octeti);
  if (opt.sha256 !== undefined && opt.sha256 !== amprenta) return { ok: false, cod: 'hash', linie: null };
  return { ok: true, program: { octeti, sha256: amprenta, linii: rezultat, wcs } };
}

/**
 * Grupul de bariere care începe la linia `i`: ultima linie a grupului (cu linii goale sau doar comentarii între bariere) și
 * dacă grupul are o schimbare de sculă (`M6`). „M0, apoi T5 M6, apoi M3 S…” e o singură oprire, cu sculă.
 */
export function grupBariere(linii: readonly LinieProgram[], i: number): { readonly ultima: number; readonly m6: boolean } {
  let ultima = i, m6 = false;
  for (let k = i; k < linii.length; k++) {
    const l = linii[k];
    if (!l) break;
    if (l.bariera) { ultima = k; if (l.bariera.includes('M6')) m6 = true; continue; }
    if (linieCurata(l.text) === '') continue;
    break;
  }
  return { ultima, m6 };
}
