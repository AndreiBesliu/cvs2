/**
 * Conturul (T1, ADR 0001): trei primitive, linie, arc de cerc și cubică. Fiecare vârf poartă segmentul care pleacă din
 * el spre vârful următor. Arcul e dat de `bulge` = tan(baleiaj / 4): pozitiv în sens trigonometric, negativ în sens orar.
 *
 * Un contur închis cu n vârfuri are n segmente. Unul deschis are n − 1, iar segmentul ultimului vârf e `L`, neluat în
 * seamă (aceeași convenție ca polilinia cavalier și LWPOLYLINE din DXF).
 *
 * Modulul ăsta e nucleul (`conturBaza.ts`, reexportat întreg) plus orientarea conturului: aria cu semn, inversarea și
 * aducerea în sens trigonometric. Pachetul de pornire importă doar nucleul; orientarea vine cu CAM-ul, offsetul și
 * normalizarea nonzero (loc în pachetul de pornire, 17.10).
 */
import { arc, cerculArcului, LINIE, numarSegmente, segment, type Contur, type Segment, type Varf } from './conturBaza.ts';

export * from './conturBaza.ts';

/** Nodurile Gauss–Legendre pe [0, 1], cu 3 puncte: exacte pentru polinoame de grad ≤ 5. */
const GL3: ReadonlyArray<readonly [number, number]> = [
  [0.5 - Math.sqrt(0.15), 5 / 18],
  [0.5, 8 / 18],
  [0.5 + Math.sqrt(0.15), 5 / 18],
];

/**
 * Aria cu semn (pozitivă în sens trigonometric), exactă pe fiecare primitivă:
 * - linia: termenul shoelace;
 * - arcul: termenul coardei plus segmentul de cerc, (r² / 2)·(θ − sin θ), cu θ cu semn;
 * - cubica: ∫(x·y′ − y·x′)/2, un polinom de grad 5, integrat exact cu 3 noduri Gauss.
 */
export function arieCuSemn(c: Contur): number {
  if (!c.inchis) throw new Error('aria cere un contur închis');
  let arie = 0;
  for (let i = 0; i < numarSegmente(c); i++) {
    const { a, b, s } = segment(c, i);
    if (s.tip === 'L') {
      arie += (a.x * b.y - b.x * a.y) / 2;
    } else if (s.tip === 'A') {
      const { raza, baleiaj } = cerculArcului(a, b, s.bulge);
      arie += (a.x * b.y - b.x * a.y) / 2 + ((raza * raza) / 2) * (baleiaj - Math.sin(baleiaj));
    } else {
      const { c1, c2 } = s;
      for (const [t, w] of GL3) {
        const u = 1 - t;
        const x = u * u * u * a.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * b.x;
        const y = u * u * u * a.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * b.y;
        const dx = 3 * (u * u * (c1.x - a.x) + 2 * u * t * (c2.x - c1.x) + t * t * (b.x - c2.x));
        const dy = 3 * (u * u * (c1.y - a.y) + 2 * u * t * (c2.y - c1.y) + t * t * (b.y - c2.y));
        arie += (w * (x * dy - y * dx)) / 2;
      }
    }
  }
  return arie;
}

/** Același contur, parcurs invers: vârfurile în ordine inversă, arcele cu bulge-ul negat, cubicele cu punctele schimbate. */
export function inverseaza(c: Contur): Contur {
  const n = c.varfuri.length;
  const m = numarSegmente(c);
  const varfuri: Varf[] = [];
  for (let k = 0; k < n; k++) {
    // Noul vârf k e vechiul vârf n−1−k (închis: rotit ca pornirea să rămână vârful 0).
    const vechi = c.inchis ? (n - k) % n : n - 1 - k;
    const p = c.varfuri[vechi]?.p;
    if (!p) throw new Error('contur fără vârfuri');
    // Segmentul care pleacă din noul vârf k e vechiul segment care intra în el, parcurs invers.
    const iSeg = (vechi - 1 + n) % n;
    let s: Segment = LINIE;
    if (c.inchis || k < m) {
      const veche = c.varfuri[iSeg]?.s ?? LINIE;
      s = veche.tip === 'A' ? arc(-veche.bulge) : veche.tip === 'C' ? { tip: 'C', c1: veche.c2, c2: veche.c1 } : LINIE;
    }
    varfuri.push({ p, s });
  }
  return { inchis: c.inchis, varfuri };
}

/** Conturul închis, adus în sens trigonometric (aria pozitivă). */
export function inSensTrigonometric(c: Contur): Contur {
  return arieCuSemn(c) < 0 ? inverseaza(c) : c;
}
