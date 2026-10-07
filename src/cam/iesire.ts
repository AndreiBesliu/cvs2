import { areDepasire, CUTIE_GOALA, cuPunct, cutieArc, depasire, largita, uneste, type Depasire } from '../geom/cutie.ts';
import { baleiajArc, type Program } from '../ir/ir.ts';

/**
 * Cât iese freza din foaie cât taie. Decizia owner-ului (07.10.2026): o formă poate ieși din foaie intenționat, freza o
 * urmează și în afara foii, iar exportul cere confirmare, scrisă apoi în antetul programului.
 *
 * Se măsoară pe traseul real, nu pe vector: discul frezei (raza = diametrul / 2) purtat pe fiecare tăiere (G1, G2, G3)
 * care pornește sau ajunge sub fața de sus a materialului. Rapidele nu contează: trec prin aer, la Z sigur.
 *
 * Foaia e un dreptunghi paralel cu axele, deci discul rămâne în ea exact când cutia lui rămâne; iar cutia discului e cutia
 * traseului lărgită cu raza. Calculul e exact (arcele prin punctele lor de pe axe), fără eșantionare.
 */
export type IesireFoaie = {
  readonly depasire: Depasire;
  /** Etichetele lucrărilor care ies (de exemplu „e1: dreptunghi, exterior, 3 mm”), în ordinea din program. */
  readonly etichete: readonly string[];
};

export function iesireDinFoaie(program: Program, foaie: { readonly latime: number; readonly inaltime: number }): IesireFoaie | null {
  const raza = program.scula.diametru / 2;
  let x: number | undefined;
  let y: number | undefined;
  let z: number | undefined;
  let eticheta = '';
  let total = CUTIE_GOALA;
  const etichete: string[] = [];
  for (const m of program.miscari) {
    if (m.tip === 'eticheta') { eticheta = m.text; continue; }
    if (m.tip !== 'rapida' && m.tip !== 'taiere' && m.tip !== 'arc') continue;
    const nx = m.la.X ?? x;
    const ny = m.la.Y ?? y;
    const nz = m.la.Z ?? z;
    const inMaterial = (z !== undefined && z < 0) || (nz !== undefined && nz < 0);
    if (m.tip !== 'rapida' && inMaterial) {
      let c = CUTIE_GOALA;
      if (x !== undefined && y !== undefined) c = cuPunct(c, { x, y });
      if (nx !== undefined && ny !== undefined) c = cuPunct(c, { x: nx, y: ny });
      if (m.tip === 'arc' && x !== undefined && y !== undefined && nx !== undefined && ny !== undefined) {
        const start = { x, y };
        const capat = { x: nx, y: ny };
        c = uneste(c, cutieArc(start, capat, m.centru, baleiajArc(start, capat, m.centru, m.sens === 'trigonometric')));
      }
      c = largita(c, raza);
      if (areDepasire(depasire(c, foaie.latime, foaie.inaltime)) && !etichete.includes(eticheta)) etichete.push(eticheta);
      total = uneste(total, c);
    }
    x = nx;
    y = ny;
    z = nz;
  }
  const d = depasire(total, foaie.latime, foaie.inaltime);
  return areDepasire(d) ? { depasire: d, etichete } : null;
}
