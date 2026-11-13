/**
 * „Toate foile” la export (ADR 0210 §5): numele fișierelor unei foi în arhivă și foile identice. Programul unei foi rămâne,
 * octet cu octet, cel exportat doar din ea: aici se schimbă numai numele.
 */

/**
 * Numele fișierului `nume` al foii `k` (de la 1) în arhivă, cu `n` foi identice cu ea (ies o dată): după baza `cncvs2-<origine>`
 * vine `-foaia-<k>`, și `-x<n>` pentru mai multe (`cncvs2-stanga-jos-foaia-2-x3-1-T2.nc`). Pe un controler cu nume scurte (FAT
 * 8.3, `CNCVS2.NC`), numele rămâne, într-un dosar al foii: `F2X3/CV1T2.NC`. Un nume fără bază (neașteptat) primește foaia în față.
 */
export function numeInArhiva(nume: string, k: number, n: number, origine: string, scurt: boolean): string {
  if (scurt) return `F${k}${n > 1 ? `X${n}` : ''}/${nume}`;
  const baza = `cncvs2-${origine}`, foaia = `foaia-${k}${n > 1 ? `-x${n}` : ''}`;
  return nume.startsWith(baza) ? `${baza}-${foaia}${nume.slice(baza.length)}` : `${foaia}-${nume}`;
}

/**
 * Programul fără comentarii (`( … )` și `;` până la capătul rândului): ce face mașina. Două foi cu aceleași forme, locuri și
 * valori diferă doar în comentarii (id-ul instanței, `r/r` față de `r2/r`), deci taie la fel.
 */
export function faraComentarii(text: string): string {
  return text.replace(/\([^)\n]*\)|;[^\n]*/g, '');
}

/**
 * Foile identice (aceeași semnătură: fișierele lor, cu numele și programul fără comentarii): grupurile de indici, fiecare în
 * ordinea listei, grupurile după prima lor foaie. O foaie fără semnătură (`null`: nimic de tăiat) nu intră în niciun grup.
 */
export function foiIdentice(semnaturi: readonly (string | null)[]): number[][] {
  const grupuri = new Map<string, number[]>();
  semnaturi.forEach((s, k) => {
    if (s === null) return;
    const g = grupuri.get(s);
    if (g) g.push(k);
    else grupuri.set(s, [k]);
  });
  return [...grupuri.values()];
}
