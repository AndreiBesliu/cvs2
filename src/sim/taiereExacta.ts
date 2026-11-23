/**
 * Tăietura exactă a frezelor plate la un nivel (ADR 0179, felia 12.1↑e-3): o freză plată taie, la nivelul z, discurile ei de-a
 * lungul mutărilor aflate în întregime sub z. Funcția „distanța în plan la cea mai apropiată astfel de mutare, minus raza
 * frezei ei” e deci negativă în ce s-a tăiat și 0 pe perete. Pe ea se măsoară jocul lateral al incrustației cu pereți drepți,
 * pe care grila de 0,1 mm a simulării nu-l vede (jocul e de obicei cât o celulă).
 *
 * Citește mutările nucleului (`pregatesteProgram`: liniile și arcele, câte 10 numere), nu textul G-code; V-ul și bila n-au
 * perete vertical, deci mutările lor nu intră (locașul și dopul drept le taie doar freze plate). Ca nucleul (ADR 0047 §6),
 * doar + − × ÷ √ și trigonometria lui: aceleași numere pe orice motor.
 */
import { ARC_TRIG, LINIE, STRIDE, type DateScula, type GrupSimulare } from './nucleu.ts';
import { atan2D } from './unghi.ts';

/** Un program pregătit pentru nucleu: scula de pornire, mutările, grupurile de după schimbări. */
export type ProgramMutari = { readonly scula: DateScula; readonly mutari: Float64Array; readonly apoi?: readonly GrupSimulare[] };

/** O mutare a unei freze plate, în plan: segmentul [a, b], sau arcul trigonometric din a, în jurul lui c, cu baleiajul s. */
type MutarePlana =
  | { readonly arc: false; readonly ax: number; readonly ay: number; readonly bx: number; readonly by: number; readonly r: number; readonly cutie: Cutie }
  | {
    readonly arc: true; readonly ax: number; readonly ay: number; readonly bx: number; readonly by: number; readonly cx: number; readonly cy: number;
    readonly raza: number; readonly start: number; readonly s: number; readonly r: number; readonly cutie: Cutie;
  };
type Cutie = { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number };

const DOI_PI = 2 * Math.PI;

/** Lungimea vectorului (x, y), cu √ (rotunjită corect), nu cu `Math.hypot`. */
const lung = (x: number, y: number): number => Math.sqrt(x * x + y * y);

/** Distanța de la p la segmentul [a, b], în plan. */
function laSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const vx = bx - ax, vy = by - ay, L2 = vx * vx + vy * vy;
  const t = L2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / L2)) : 0;
  return lung(px - ax - t * vx, py - ay - t * vy);
}

/** Distanța de la p la arcul trigonometric din `start`, cu baleiajul s, pe cercul (c, raza); capetele, a și b. */
function laArc(px: number, py: number, m: Extract<MutarePlana, { arc: true }>): number {
  const dx = px - m.cx, dy = py - m.cy;
  // u în [0, 2π): cercul întreg (s ≥ 2π) îl cuprinde pe oricare.
  let u = atan2D(dy, dx) - m.start;
  u -= Math.floor(u / DOI_PI) * DOI_PI;
  if (u <= m.s) return Math.abs(lung(dx, dy) - m.raza);
  return Math.min(lung(px - m.ax, py - m.ay), lung(px - m.bx, py - m.by));
}

/** Distanța de la p la cutie (0 înăuntru). */
const laCutie = (px: number, py: number, c: Cutie): number => lung(Math.max(c.x0 - px, 0, px - c.x1), Math.max(c.y0 - py, 0, py - c.y1));

/**
 * Funcția tăieturii programului la nivelul z: (x, y) → distanța în plan la cea mai apropiată mutare a unei freze plate aflată
 * în întregime sub z (cu toleranța de un micron), minus raza frezei ei. Fără nicio astfel de mutare, +∞.
 */
export function functieTaiere(p: ProgramMutari, z: number): (x: number, y: number) => number {
  const mutari: MutarePlana[] = [];
  const grupuri = [{ scula: p.scula, mutari: p.mutari }, ...(p.apoi ?? [])];
  for (const g of grupuri) {
    if (g.scula.forma.tip !== 'plata') continue;
    const r = g.scula.diametru / 2, v = g.mutari, n = v.length / STRIDE;
    for (let q = 0; q < n; q++) {
      const o = q * STRIDE, fel = v[o]!;
      let ax = v[o + 1]!, ay = v[o + 2]!;
      const az = v[o + 3]!;
      let bx = v[o + 4]!, by = v[o + 5]!;
      const bz = v[o + 6]!;
      if (az > z + 1e-6 || bz > z + 1e-6) continue;
      if (fel === LINIE) {
        mutari.push({ arc: false, ax, ay, bx, by, r, cutie: { x0: Math.min(ax, bx), y0: Math.min(ay, by), x1: Math.max(ax, bx), y1: Math.max(ay, by) } });
        continue;
      }
      // Arcul orar de la A la B e arcul trigonometric de la B la A (ca în nucleu).
      if (fel !== ARC_TRIG) { [ax, bx] = [bx, ax]; [ay, by] = [by, ay]; }
      const cx = v[o + 7]!, cy = v[o + 8]!, s = v[o + 9]!, raza = lung(ax - cx, ay - cy);
      mutari.push({
        arc: true, ax, ay, bx, by, cx, cy, raza, start: atan2D(ay - cy, ax - cx), s, r,
        cutie: { x0: cx - raza, y0: cy - raza, x1: cx + raza, y1: cy + raza },
      });
    }
  }
  return (x, y) => {
    let best = Number.POSITIVE_INFINITY;
    for (const m of mutari) {
      // Cutia (lărgită cu raza frezei) nu poate da mai aproape decât ce avem deja.
      if (laCutie(x, y, m.cutie) - m.r >= best) continue;
      const d = (m.arc ? laArc(x, y, m) : laSegment(x, y, m.ax, m.ay, m.bx, m.by)) - m.r;
      if (d < best) best = d;
    }
    return best;
  };
}

/** Punctul de pe segmentul [a, b] unde f trece prin 0 (f(a) < 0 ≤ f(b)), prin bisecție, la sub un micron. */
export function bisectie(f: (x: number, y: number) => number, ax: number, ay: number, bx: number, by: number): readonly [number, number] {
  let x0 = ax, y0 = ay, x1 = bx, y1 = by;
  for (let k = 0; k < 40 && lung(x1 - x0, y1 - y0) > 1e-7; k++) {
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    if (f(mx, my) < 0) { x0 = mx; y0 = my; } else { x1 = mx; y1 = my; }
  }
  return [(x0 + x1) / 2, (y0 + y1) / 2];
}
