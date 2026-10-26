/**
 * Programul IR (ADR 0008) trecut în mutările nucleului (ADR 0047 §3), în coordonatele documentului:
 * - poziția se urmărește de la o pornire necunoscută; cât timp o axă e necunoscută, mutările nu se simulează (sunt prin
 *   aer), dar una care coboară sub fața plăcii, sau un arc, dintr-o poziție necunoscută e refuzată;
 * - rapidele se simulează ca tăieri: o rapidă prin material se vede pe simulare (poarta invariantelor o refuză oricum);
 * - eticheta, axul și pauza nu mișcă nimic; mutările întregi deasupra feței nu se trimit nucleului;
 * - arcele rămân arce (centrul, sensul și baleiajul, cu regula IR-ului: start = capăt înseamnă cercul întreg), nu se sparg
 *   în segmente; elicea (Z diferit la capete) doar cu freza plată;
 * - axa A e refuzată explicit (T22, ADR 0022: simularea e pe XYZ în v1);
 * - o schimbare a sculei (ADR 0084) începe un grup nou, cu scula ei: primul grup e `scula` + `mutari`, celelalte, în ordine,
 *   `apoi`; nucleul le taie pe același câmp, unul după altul.
 */
import type { Miscare, Program } from '../ir/ir.ts';
import { ARC_ORAR, ARC_TRIG, LINIE, STRIDE, type DateScula, type GrupSimulare } from './nucleu.ts';
import { atan2D } from './unghi.ts';

export { STRIDE, type DateScula, type GrupSimulare } from './nucleu.ts';

/** Diametrul cel mai mare pe care îl primește nucleul (un plafon de bun-simț; documentul are plafonul lui). */
export const DIAMETRU_MAXIM = 1000;

const DOI_PI = 6.283185307179586;

export type ProgramSimulat =
  /** `apoi`: grupurile de după fiecare schimbare a sculei, în ordine; lipsă cu o singură sculă. */
  | { readonly ok: true; readonly mutari: Float64Array; readonly scula: DateScula; readonly apoi?: readonly GrupSimulare[] }
  /** `miscare`: indexul mișcării refuzate în program (−1: programul întreg, de exemplu scula). */
  | { readonly ok: false; readonly motiv: string; readonly miscare: number };

function refuz(motiv: string, miscare: number): ProgramSimulat {
  return { ok: false, motiv, miscare };
}

function sculaRefuzata(s: Program['scula']): string | null {
  const { diametru, forma } = s;
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
  const s = sculaRefuzata(p.scula);
  if (s) return refuz(s, -1);
  let forma = p.scula.forma ?? { tip: 'plata' as const };
  let out: number[] = [];
  const grupuri: { scula: DateScula; out: number[] }[] = [{ scula: { forma, diametru: p.scula.diametru }, out }];
  let x: number | undefined, y: number | undefined, z: number | undefined;
  for (const [q, m] of p.miscari.entries()) {
    if (m.tip === 'schimba-scula') {
      const r = sculaRefuzata(m.scula);
      if (r) return refuz(r, q);
      forma = m.scula.forma ?? { tip: 'plata' as const };
      out = [];
      grupuri.push({ scula: { forma, diametru: m.scula.diametru }, out });
      continue;
    }
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
      if (z !== nz && forma.tip !== 'plata' && !inAer) return refuz(`elicea cu ${forma.tip === 'bila' ? 'bila' : 'V-ul'} nu se simulează încă (doar cu freza plată)`, q);
      if (!inAer) out.push(m.sens === 'trigonometric' ? ARC_TRIG : ARC_ORAR, x, y, z, nx, ny, nz, m.centru.x, m.centru.y, r);
    } else if (!inAer) {
      out.push(LINIE, x, y, z, nx, ny, nz, 0, 0, 0);
    }
    x = nx; y = ny; z = nz;
  }
  const [prim, ...rest] = grupuri;
  const apoi = rest.map((g) => ({ scula: g.scula, mutari: Float64Array.from(g.out) }));
  return { ok: true, mutari: Float64Array.from(prim?.out ?? []), scula: prim?.scula ?? { forma, diametru: p.scula.diametru }, ...(apoi.length > 0 ? { apoi } : {}) };
}

/**
 * Cât pot diferi razele capetelor unui arc: nucleul desenează un singur cerc (raza startului; la G2, a capătului, după
 * schimbarea capetelor), deci o diferență Δr mută peretele cu Δr, adică suprafața cu panta · Δr. La 1 nm, sub 10 nm până
 * la panta 10 (V-ul de peste 11°). CAM-ul dă arce cu |Δr| ≤ 10⁻¹² mm (măsurat pe ~45 000 de arce, recenzia 19.10).
 */
const TOLERANTA_RAZA = 1e-9;
/** Sub atât (rad) între capete, fără ca ele să fie același punct, un arc e ambiguu: punct sau cerc întreg. */
const BALEIAJ_AMBIGUU = 1e-9;

/**
 * Baleiajul arcului (pozitiv, în radiani), cu regula IR-ului (`baleiajArc` din `ir.ts`): start = capăt, exact, e cercul
 * întreg. Regula IR-ului trage linia la 10⁻¹² rad cu `Math.atan2`; aici unghiurile sunt cele deterministe, care pot diferi
 * de `Math` cu câteva ulp-uri, deci lângă prag cele două reguli ar putea alege diferit (un punct aici, un cerc întreg pe
 * mașină). Un arc cu capetele diferite la sub 10⁻⁹ rad e de aceea refuzat: departe de prag, regulile coincid. CAM-ul nu dă
 * astfel de arce (sub 10⁻⁶ mm, arcul devine linie). Refuzat și: centrul în start, capetele pe raze diferite.
 */
function arc(m: Extract<Miscare, { tip: 'arc' }>, x: number, y: number, nx: number, ny: number): number | string {
  const { x: cx, y: cy } = m.centru;
  if (!Number.isFinite(cx) || !Number.isFinite(cy)) return 'arcul are centrul nefinit';
  const r0 = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy)), r1 = Math.sqrt((nx - cx) * (nx - cx) + (ny - cy) * (ny - cy));
  if (r0 < 1e-9) return 'arcul are raza zero (centrul e în start)';
  if (Math.abs(r0 - r1) > TOLERANTA_RAZA) return `arcul are capetele pe raze diferite (${r0} și ${r1} mm)`;
  if (x === nx && y === ny) return DOI_PI;
  let b = atan2D(ny - cy, nx - cx) - atan2D(y - cy, x - cx);
  let d = b < 0 ? -b : b;
  if (d > Math.PI) d = DOI_PI - d;
  if (d < BALEIAJ_AMBIGUU) return 'arcul are capetele aproape în același punct, dar nu în el: nu se știe dacă e un cerc întreg';
  if (m.sens === 'trigonometric') { if (b < 0) b += DOI_PI; } else if (b > 0) b -= DOI_PI;
  return b < 0 ? -b : b;
}
