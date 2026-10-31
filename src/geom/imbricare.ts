/**
 * Adâncimea de imbricare a contururilor (ADR 0035 §8, ADR 0034 §7): pentru fiecare contur închis, câte alte contururi închise
 * îi conțin primul vârf (`evenodd`, includerea exactă a clicului); pară = de afară, impară = gol. Un contur deschis nu conține
 * nimic și nu primește o adâncime (-1).
 *
 * Candidații vin de la cine cheamă: un index de cutii (importul, `src/io/imbricare.ts`) sau toate cutiile, filtrate
 * (rolul de tăiere al unei piese, ADR 0112), ca modulul să nu tragă după el biblioteca indexului. Ei sunt un superset;
 * includerea exactă decide. Bugetul de lucru (candidații vizitați plus vârfurile contururilor măsurate) oprește judecata
 * pătratică a contururilor suprapuse (recenzia 2.7c: 50 000 de dreptunghiuri identice, 334 s): peste el, null.
 */
import type { Contur, Punct } from './conturBaza.ts';
import { inRegiune } from './distanta.ts';

const OPRIRE = new Error('bugetul includerilor');

/** Candidații pentru punctul `p`: `vizita(j)` pentru fiecare contur `j` care l-ar putea conține. */
export type Candidati = (p: Punct, vizita: (j: number) => void) => void;

export function adancimiImbricare(contururi: readonly Contur[], candidati: Candidati, buget = Infinity): number[] | null {
  let ramas = buget;
  try {
    return contururi.map((c, i): number => {
      if (!c.inchis) return -1;
      const p = c.varfuri[0]?.p;
      if (!p) return 0;
      let adancime = 0;
      candidati(p, (j) => {
        const alt = contururi[j];
        if (j === i || !alt || !alt.inchis) return;
        ramas -= 1 + alt.varfuri.length;
        if (ramas < 0) throw OPRIRE;
        if (inRegiune(p, [alt])) adancime++;
      });
      return adancime;
    });
  } catch (e) {
    if (e === OPRIRE) return null;
    throw e;
  }
}
