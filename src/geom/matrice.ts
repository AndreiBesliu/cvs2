import { arc, type Contur, type Punct, type Segment } from './contur.ts';

/**
 * Matricea afină, în convenția SVG / canvas: x′ = a·x + c·y + e, y′ = b·x + d·y + f.
 * Arcele trec exact doar prin similitudini (rotire, scalare uniformă, oglindire, translație). Sub o matrice neuniformă,
 * un arc devine arc de elipsă: forma rămâne atunci parametrică (T2, ADR 0002) și nu se transformă aici.
 */
export type Matrice = {
  readonly a: number; readonly b: number; readonly c: number;
  readonly d: number; readonly e: number; readonly f: number;
};

export const IDENTITATE: Matrice = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

export function translatie(dx: number, dy: number): Matrice {
  return { a: 1, b: 0, c: 0, d: 1, e: dx, f: dy };
}

export function scalare(sx: number, sy: number = sx): Matrice {
  return { a: sx, b: 0, c: 0, d: sy, e: 0, f: 0 };
}

/** Rotirea în grade, trigonometric. La multiplii de 90°, sinusul și cosinusul sunt exacte (0 și ±1, nu 6·10⁻¹⁷). */
export function rotatie(grade: number): Matrice {
  const r = ((grade % 360) + 360) % 360;
  const exacte: Readonly<Record<number, readonly [number, number]>> = { 0: [1, 0], 90: [0, 1], 180: [-1, 0], 270: [0, -1] };
  const [cos, sin] = exacte[r] ?? [Math.cos((r * Math.PI) / 180), Math.sin((r * Math.PI) / 180)];
  return { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 };
}

/** `compune(m2, m1)` aplică întâi m1, apoi m2. */
export function compune(m2: Matrice, m1: Matrice): Matrice {
  return {
    a: m2.a * m1.a + m2.c * m1.b,
    b: m2.b * m1.a + m2.d * m1.b,
    c: m2.a * m1.c + m2.c * m1.d,
    d: m2.b * m1.c + m2.d * m1.d,
    e: m2.a * m1.e + m2.c * m1.f + m2.e,
    f: m2.b * m1.e + m2.d * m1.f + m2.f,
  };
}

export function aplica(m: Matrice, p: Punct): Punct {
  return { x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f };
}

export function determinant(m: Matrice): number {
  return m.a * m.d - m.b * m.c;
}

/** E similitudine dacă păstrează unghiurile: rotire + scalare uniformă, eventual cu oglindire. */
export function esteSimilitudine(m: Matrice, tol = 1e-12): boolean {
  const scara = Math.max(Math.hypot(m.a, m.b), Math.hypot(m.c, m.d), 1);
  const directa = Math.abs(m.a - m.d) <= tol * scara && Math.abs(m.b + m.c) <= tol * scara;
  const oglindita = Math.abs(m.a + m.d) <= tol * scara && Math.abs(m.b - m.c) <= tol * scara;
  return (directa || oglindita) && Math.abs(determinant(m)) > 0;
}

/**
 * Transformă exact un contur. Liniile și cubicele trec prin orice matrice afină; arcele, doar prin similitudini. Sub o
 * oglindire (determinant negativ), bulge-ul își schimbă semnul, iar conturul își schimbă sensul.
 */
export function transformaContur(contur: Contur, m: Matrice): Contur {
  const areArce = contur.varfuri.some((v) => v.s.tip === 'A');
  if (areArce && !esteSimilitudine(m)) {
    throw new Error('un arc nu trece exact printr-o matrice neuniformă: forma rămâne parametrică (T2)');
  }
  const semn = determinant(m) < 0 ? -1 : 1;
  return {
    inchis: contur.inchis,
    varfuri: contur.varfuri.map((v) => {
      const s: Segment = v.s.tip === 'A'
        ? arc(semn * v.s.bulge)
        : v.s.tip === 'C' ? { tip: 'C', c1: aplica(m, v.s.c1), c2: aplica(m, v.s.c2) } : v.s;
      return { p: aplica(m, v.p), s };
    }),
  };
}
