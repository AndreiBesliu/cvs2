import type { CaiTrasate } from '../../src/trasare/trasare.ts';

/** Eșantioanele dese ale curbelor trasate (liniile la 0,05 px; cubicele după lungimea poligonului de control, la cel mult 0,02 px în parametru) și vârfurile lor. */
export function esantioane(c: CaiTrasate): { readonly puncte: number[]; readonly varfuri: number[] } {
  const puncte: number[] = [], varfuri: number[] = [];
  for (let k = 0; k + 1 < c.inceput.length; k++) {
    const a = c.inceput[k] ?? 0, b = c.inceput[k + 1] ?? 0;
    for (let v = a; v < b; v++) {
      const w = v + 1 < b ? v + 1 : a;
      const x0 = c.xy[6 * v] ?? 0, y0 = c.xy[6 * v + 1] ?? 0, x3 = c.xy[6 * w] ?? 0, y3 = c.xy[6 * w + 1] ?? 0;
      varfuri.push(x0, y0);
      if (c.tip[v] === 0) {
        const n = Math.max(1, Math.ceil(Math.hypot(x3 - x0, y3 - y0) / 0.05));
        for (let i = 0; i < n; i++) puncte.push(x0 + ((x3 - x0) * i) / n, y0 + ((y3 - y0) * i) / n);
      } else {
        const [c1x, c1y, c2x, c2y] = [c.xy[6 * v + 2] ?? 0, c.xy[6 * v + 3] ?? 0, c.xy[6 * v + 4] ?? 0, c.xy[6 * v + 5] ?? 0];
        const lung = Math.hypot(c1x - x0, c1y - y0) + Math.hypot(c2x - c1x, c2y - c1y) + Math.hypot(x3 - c2x, y3 - c2y);
        const ns = Math.max(96, Math.ceil(lung / 0.02));
        for (let i = 0; i < ns; i++) {
          const u = i / ns, s = 1 - u;
          puncte.push(s * s * s * x0 + 3 * s * s * u * c1x + 3 * s * u * u * c2x + u * u * u * x3,
            s * s * s * y0 + 3 * s * s * u * c1y + 3 * s * u * u * c2y + u * u * u * y3);
        }
      }
    }
  }
  return { puncte, varfuri };
}

