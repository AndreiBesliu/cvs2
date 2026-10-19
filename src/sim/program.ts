/**
 * Programul IR (ADR 0008) trecut în mutările nucleului (ADR 0047 §3), în coordonatele documentului:
 * - poziția se urmărește de la o pornire necunoscută; cât timp o axă e necunoscută, mutările nu se simulează (sunt prin
 *   aer), dar una care coboară sub fața plăcii, sau un arc, dintr-o poziție necunoscută e refuzată;
 * - rapidele se simulează ca tăieri: o rapidă prin material se vede pe simulare (poarta invariantelor o refuză oricum);
 * - eticheta, axul și pauza nu mișcă nimic; mutările întregi deasupra feței nu se trimit nucleului;
 * - arcele rămân arce (centrul, sensul și baleiajul, cu regula IR-ului: start = capăt înseamnă cercul întreg), nu se sparg
 *   în segmente; elicea (Z diferit la capete) doar cu freza plată;
 * - axa A e refuzată explicit (T22, ADR 0022: simularea e pe XYZ în v1).
 */
import type { Miscare, Program } from '../ir/ir.ts';
import { ARC_ORAR, ARC_TRIG, LINIE, STRIDE, type DateScula } from './nucleu.ts';
import { atan2D } from './unghi.ts';

export { STRIDE, type DateScula } from './nucleu.ts';

/** Diametrul cel mai mare pe care îl primește nucleul (un plafon de bun-simț; documentul are plafonul lui). */
export const DIAMETRU_MAXIM = 1000;

const DOI_PI = 6.283185307179586;

export type ProgramSimulat =
  | { readonly ok: true; readonly mutari: Float64Array; readonly scula: DateScula }
  /** `miscare`: indexul mișcării refuzate în program (−1: programul întreg, de exemplu scula). */
  | { readonly ok: false; readonly motiv: string; readonly miscare: number };

function refuz(motiv: string, miscare: number): ProgramSimulat {
  return { ok: false, motiv, miscare };
}

function sculaRefuzata(p: Program): string | null {
  const { diametru, forma } = p.scula;
  if (!(Number.isFinite(diametru) && diametru > 0 && diametru <= DIAMETRU_MAXIM)) {
    return `scula are diametrul ${diametru}, în afara (0, ${DIAMETRU_MAXIM}] mm`;
  }
  if (forma?.tip === 'v' && !(Number.isFinite(forma.unghi) && forma.unghi > 0 && forma.unghi < 180)) {
    return `scula V are unghiul ${forma.unghi}°, în afara (0°, 180°)`;
  }
  return null;
}

const finit = (v: number | undefined): boolean => v === undefined || Number.isFinite(v);

export function pregatesteProgram(p: Program, sus: number): ProgramSimulat {
  if (p.axe.some((a) => a !== 'X' && a !== 'Y' && a !== 'Z')) return refuz('axa A nu se simulează în v1 (doar X, Y, Z)', -1);
  const s = sculaRefuzata(p);
  if (s) return refuz(s, -1);
  const forma = p.scula.forma ?? { tip: 'plata' as const };
  const out: number[] = [];
  let x: number | undefined, y: number | undefined, z: number | undefined;
  for (const [q, m] of p.miscari.entries()) {
    if (m.tip !== 'rapida' && m.tip !== 'taiere' && m.tip !== 'arc') continue;
    const la = m.la;
    if (la.A !== undefined) return refuz('axa A nu se simulează în v1 (doar X, Y, Z)', q);
    if (!finit(la.X) || !finit(la.Y) || !finit(la.Z)) return refuz('mișcarea are o coordonată care nu e un număr finit', q);
    const nx = la.X ?? x, ny = la.Y ?? y, nz = la.Z ?? z;
    if (x === undefined || y === undefined || z === undefined || nx === undefined || ny === undefined || nz === undefined) {
      if (m.tip === 'arc') return refuz('un arc dintr-o poziție necunoscută (programul nu spune de unde pornește)', q);
      if (nz !== undefined && nz < sus) return refuz('mișcarea coboară în material dintr-o poziție necunoscută', q);
      x = nx; y = ny; z = nz;
      continue;
    }
    const inAer = z >= sus && nz >= sus;
    if (m.tip === 'arc') {
      const r = arc(m, x, y, nx, ny);
      if (typeof r === 'string') return refuz(r, q);
      if (z !== nz && forma.tip !== 'plata') return refuz(`elicea cu ${forma.tip === 'bila' ? 'bila' : 'V-ul'} nu se simulează încă (doar cu freza plată)`, q);
      if (!inAer) out.push(m.sens === 'trigonometric' ? ARC_TRIG : ARC_ORAR, x, y, z, nx, ny, nz, m.centru.x, m.centru.y, r);
    } else if (!inAer) {
      out.push(LINIE, x, y, z, nx, ny, nz, 0, 0, 0);
    }
    x = nx; y = ny; z = nz;
  }
  return { ok: true, mutari: Float64Array.from(out), scula: { forma, diametru: p.scula.diametru } };
}

/**
 * Baleiajul arcului (pozitiv, în radiani), cu regula IR-ului (`baleiajArc` din `ir.ts`), pe unghiurile deterministe ale
 * nucleului; sau motivul refuzului: centrul în capăt, ori capetele pe raze diferite.
 */
function arc(m: Extract<Miscare, { tip: 'arc' }>, x: number, y: number, nx: number, ny: number): number | string {
  const { x: cx, y: cy } = m.centru;
  if (!Number.isFinite(cx) || !Number.isFinite(cy)) return 'arcul are centrul nefinit';
  const r0 = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy)), r1 = Math.sqrt((nx - cx) * (nx - cx) + (ny - cy) * (ny - cy));
  if (r0 < 1e-9) return 'arcul are raza zero (centrul e în start)';
  if (Math.abs(r0 - r1) > 1e-6 * Math.max(1, r0)) return `arcul are capetele pe raze diferite (${r0} și ${r1} mm)`;
  let b = atan2D(ny - cy, nx - cx) - atan2D(y - cy, x - cx);
  if (m.sens === 'trigonometric') { while (b <= 1e-12) b += DOI_PI; } else { while (b >= -1e-12) b -= DOI_PI; }
  return b < 0 ? -b : b;
}
