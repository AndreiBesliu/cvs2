import type { CaiTrasate } from '../../src/trasare/trasare.ts';

/**
 * Eșantioanele dese ale fiecărei căi trasate (liniile la 0,05 px; cubicele după lungimea poligonului de control, la cel mult
 * 0,02 px în parametru), cu vârfurile ei. O cale deschisă (liniile mediane, ADR 0222) se termină în ultimul ei vârf, fără
 * segmentul de închidere; acel vârf intră și printre eșantioane.
 */
export function esantioaneCai(c: CaiTrasate): Array<{ readonly puncte: number[]; readonly varfuri: number[]; readonly deschisa: boolean }> {
  const rez: Array<{ readonly puncte: number[]; readonly varfuri: number[]; readonly deschisa: boolean }> = [];
  for (let k = 0; k + 1 < c.inceput.length; k++) {
    const a = c.inceput[k] ?? 0, b = c.inceput[k + 1] ?? 0, deschisa = c.deschisa?.[k] === 1;
    const puncte: number[] = [], varfuri: number[] = [];
    for (let v = a; v < b; v++) {
      const x0 = c.xy[6 * v] ?? 0, y0 = c.xy[6 * v + 1] ?? 0;
      varfuri.push(x0, y0);
      if (deschisa && v === b - 1) { puncte.push(x0, y0); break; }
      const w = v + 1 < b ? v + 1 : a;
      const x3 = c.xy[6 * w] ?? 0, y3 = c.xy[6 * w + 1] ?? 0;
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
    rez.push({ puncte, varfuri, deschisa });
  }
  return rez;
}

/** Eșantioanele tuturor căilor la un loc, și vârfurile lor (vezi `esantioaneCai`). */
export function esantioane(c: CaiTrasate): { readonly puncte: number[]; readonly varfuri: number[] } {
  const puncte: number[] = [], varfuri: number[] = [];
  for (const k of esantioaneCai(c)) { puncte.push(...k.puncte); varfuri.push(...k.varfuri); }
  return { puncte, varfuri };
}

/** Cel mai apropiat eșantion de un punct, printr-o grilă de 2 px (căutarea se lărgește până nu mai poate găsi ceva mai aproape). */
export function grila(puncte: readonly number[]): (x: number, y: number) => number {
  const g = new Map<string, number[]>();
  for (let i = 0; i < puncte.length; i += 2) {
    const k = `${Math.floor((puncte[i] ?? 0) / 2)},${Math.floor((puncte[i + 1] ?? 0) / 2)}`;
    (g.get(k) ?? g.set(k, []).get(k))?.push(puncte[i] ?? 0, puncte[i + 1] ?? 0);
  }
  return (x, y) => {
    let d = Infinity;
    const gx = Math.floor(x / 2), gy = Math.floor(y / 2);
    for (let r = 0; r <= 64 && d > (r - 1) * 2; r++) {
      for (let i = gx - r; i <= gx + r; i++) {
        for (let j = gy - r; j <= gy + r; j++) {
          if (Math.max(Math.abs(i - gx), Math.abs(j - gy)) !== r) continue;
          const l = g.get(`${i},${j}`) ?? [];
          for (let q = 0; q < l.length; q += 2) d = Math.min(d, Math.hypot((l[q] ?? 0) - x, (l[q + 1] ?? 0) - y));
        }
      }
    }
    return d;
  };
}
