/**
 * Începutul unui program scris (ADR 0292): liniile pe care le citește controlerul întâi, de la prima, până la prima mișcare
 * de tăiere inclusiv, cel mult `INCEPUT_MAXIM`. Fereastra exportului îl arată în Rezultat, din textul descărcat: un prefix al
 * fișierului, nimic calculat din nou.
 */
import type { Contract } from './contract.ts';

/** Cel mult atâtea linii arată fereastra din începutul unui fișier (ADR 0292, 2a). */
export const INCEPUT_MAXIM = 40;

/**
 * Începutul unui fișier: `linii` (prefixul lui), `taiere` (ultima linie e prima mișcare de tăiere) și `restul` (câte linii
 * mai are fișierul după ele; linia goală de după ultimul capăt de linie nu se numără).
 */
export type Inceput = { readonly linii: readonly string[]; readonly taiere: boolean; readonly restul: number };

/** O mișcare de tăiere: un cuvânt G1, G2 sau G3 (și G01–G03), nu G17, G20, G21. */
const TAIERE = /(?:^|[^A-Z0-9.])G0*[123](?![0-9.])/i;

/** Codul unei linii, fără comentariile dialectului (`contract.comentariu`): între perechi, sau de la deschidere la capăt. */
function cod(linie: string, comentariu: Contract['comentariu']): string {
  if (comentariu === null) return linie;
  const { deschidere, inchidere } = comentariu;
  if (inchidere === '') {
    const i = linie.indexOf(deschidere);
    return i < 0 ? linie : linie.slice(0, i);
  }
  let rez = '';
  let i = 0;
  while (i < linie.length) {
    const a = linie.indexOf(deschidere, i);
    if (a < 0) return rez + linie.slice(i);
    rez += linie.slice(i, a);
    const b = linie.indexOf(inchidere, a + deschidere.length);
    // Un comentariu neînchis ține până la capătul rândului.
    if (b < 0) return rez;
    i = b + inchidere.length;
  }
  return rez;
}

/** Primele linii ale lui `text`, până la prima mișcare de tăiere inclusiv, cel mult `maxim`. */
export function inceputProgram(text: string, comentariu: Contract['comentariu'], maxim = INCEPUT_MAXIM): Inceput {
  if (text === '') return { linii: [], taiere: false, restul: 0 };
  const toate = text.split('\n');
  if (toate.at(-1) === '') toate.pop();
  const linii: string[] = [];
  for (const l of toate) {
    if (linii.length === maxim) break;
    linii.push(l);
    if (TAIERE.test(cod(l, comentariu))) return { linii, taiere: true, restul: toate.length - linii.length };
  }
  return { linii, taiere: false, restul: toate.length - linii.length };
}
