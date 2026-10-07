/**
 * Formatorul de numere, cu o singură regulă (s8 §5.2): zecimale fixe și punctul zecimal scris mereu, fără tăierea
 * zerourilor. Pe Syntec, `X10` înseamnă 0,010 mm, deci „10.000” nu e o eleganță, e corectitudine.
 * Un număr care nu e finit nu ajunge niciodată în program: ediția întâi scria atunci „0”, o tăietură până la zero.
 */
/** Peste atât, valoarea nu e o cotă de mașină; iar de la 10²¹, `toFixed` ar scrie notație exponențială („1e+21”). */
export const VALOARE_MAXIMA = 1e9;

export function numar(v: number, zecimale: number): string {
  if (!Number.isFinite(v)) throw new RangeError(`un număr nefinit (${v}) nu se scrie în program`);
  if (Math.abs(v) >= VALOARE_MAXIMA) throw new RangeError(`valoarea ${v} nu e o cotă de mașină`);
  const text = v.toFixed(zecimale);
  // −0,0004 iese „-0.000”: un zero cu semn e tot zero.
  return /^-0\.?0*$/.test(text) ? text.slice(1) : text;
}

/** Valoarea pe care o va citi controlerul: numărul rotunjit exact cum îl scrie formatorul. */
export function rotunjit(v: number, zecimale: number): number {
  return Number(numar(v, zecimale));
}

const DIACRITICE: Readonly<Record<string, string>> = {
  ă: 'a', â: 'a', î: 'i', ș: 's', ş: 's', ț: 't', ţ: 't', Ă: 'A', Â: 'A', Î: 'I', Ș: 'S', Ş: 'S', Ț: 'T', Ţ: 'T',
};

/** Textul unui comentariu, în ASCII strict: diacriticele se transliterează, restul neimprimabil se scoate. */
export function textAscii(text: string, interzise: string): string {
  return [...text]
    .map((c) => DIACRITICE[c] ?? c)
    .filter((c) => c >= ' ' && c <= '~' && !interzise.includes(c))
    .join('');
}
