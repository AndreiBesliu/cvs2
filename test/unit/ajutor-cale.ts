/**
 * Căi pentru teste (ADR 0034). Inima: patru cubice, trigonometric, din vârful de jos (50, 10), cu scobitura de sus în
 * (50, 70), un colț concav pentru exterior. „D”-ul: o linie și un semicerc. Dreptunghiul rotunjit scris ca o cale are
 * exact conturul dreptunghiului parametric.
 */
import { conturDreptunghi } from '../../src/geom/contur.ts';
import type { FormaDoc, VarfDoc } from '../../src/model/document.ts';

const P = (x: number, y: number) => ({ x, y });

export const INIMA: FormaDoc = {
  tip: 'cale',
  inchis: true,
  varfuri: [
    { p: P(50, 10), s: { tip: 'C', c1: P(80, 40), c2: P(95, 75) } },
    { p: P(75, 85), s: { tip: 'C', c1: P(60, 95), c2: P(50, 80) } },
    { p: P(50, 70), s: { tip: 'C', c1: P(50, 80), c2: P(40, 95) } },
    { p: P(25, 85), s: { tip: 'C', c1: P(5, 75), c2: P(20, 40) } },
  ],
};

/** Un „D”: latura dreaptă de la (0, 0) la (0, 40), apoi semicercul înapoi prin (20, 20). */
export const D: FormaDoc = {
  tip: 'cale',
  inchis: true,
  varfuri: [{ p: P(0, 40), s: { tip: 'A', bulge: -1 } }, { p: P(0, 0), s: { tip: 'L' } }],
};

/** Calea cu exact vârfurile și segmentele lui `conturDreptunghi(0, 0, latime, inaltime, raza)`. */
export function dreptunghiCaCale(latime: number, inaltime: number, raza: number): FormaDoc {
  const varfuri: VarfDoc[] = conturDreptunghi(0, 0, latime, inaltime, raza).varfuri.map((v) => ({
    p: { x: v.p.x, y: v.p.y },
    s: v.s.tip === 'A' ? { tip: 'A', bulge: v.s.bulge } : v.s.tip === 'C' ? { tip: 'C', c1: { ...v.s.c1 }, c2: { ...v.s.c2 } } : { tip: 'L' },
  }));
  return { tip: 'cale', inchis: true, varfuri };
}

/** Punctul cubicei de la t, pentru măsurători pe hârtie. */
export function bezier(a: { x: number; y: number }, c1: { x: number; y: number }, c2: { x: number; y: number }, b: { x: number; y: number }, t: number) {
  const u = 1 - t;
  return {
    x: u * u * u * a.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * b.x,
    y: u * u * u * a.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * b.y,
  };
}

/** Inima eșantionată des, în lume (cu translația dată): o polilinie de referință pentru distanță și includere. */
export function inimaEsantionata(dx: number, dy: number, n = 4000): Array<{ x: number; y: number }> {
  if (INIMA.tip !== 'cale') return [];
  const v = INIMA.varfuri;
  const rez: Array<{ x: number; y: number }> = [];
  for (let k = 0; k < v.length; k++) {
    const a = v[k], b = v[(k + 1) % v.length];
    if (!a || !b || a.s.tip !== 'C') continue;
    for (let i = 0; i < n; i++) {
      const q = bezier(a.p, a.s.c1, a.s.c2, b.p, i / n);
      rez.push({ x: q.x + dx, y: q.y + dy });
    }
  }
  return rez;
}
