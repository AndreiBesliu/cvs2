import { SCARA_MAXIMA, SCARA_MINIMA, type Vedere } from './protocol.ts';

/**
 * Vederea care așază foaia întreagă în pânză (sau în zona `z` a ei, în pixeli din colțul pânzei), cu o margine. O cutie cu
 * `x`, `y` (toate foile, ADR 0210 §1) se încadrează la fel, de la colțul ei.
 */
export function vedereaPotrivita(
  lat: number, ina: number, foaie: { latime: number; inaltime: number; x?: number; y?: number }, z = { x: 0, y: 0, w: lat, h: ina },
): Vedere {
  const margine = 24;
  const scara = Math.min(SCARA_MAXIMA, Math.max(SCARA_MINIMA,
    Math.min((z.w - 2 * margine) / foaie.latime, (z.h - 2 * margine) / foaie.inaltime)));
  const x = foaie.x ?? 0, y = foaie.y ?? 0;
  return { scara, tx: z.x + (z.w - foaie.latime * scara) / 2 - x * scara, ty: z.y + z.h - (z.h - foaie.inaltime * scara) / 2 + y * scara };
}
