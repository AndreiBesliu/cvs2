import { cerculArcului, numarSegmente, segment, type Contur, type Punct } from './contur.ts';

/**
 * Cutia exactă a geometriei: dreptunghiul cel mai mic, paralel cu axele, care o cuprinde. Fără eșantionare:
 * - linia contribuie cu capetele;
 * - arcul, cu capetele și cu punctele de pe axele cercului prin care trece baleiajul;
 * - cubica, cu capetele și cu extremele ei (rădăcinile derivatei, pe fiecare axă).
 */
export type Cutie = { readonly minX: number; readonly minY: number; readonly maxX: number; readonly maxY: number };

/** Cutia goală: elementul neutru al reuniunii. */
export const CUTIE_GOALA: Cutie = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };

export function cuPunct(c: Cutie, p: Punct): Cutie {
  return { minX: Math.min(c.minX, p.x), minY: Math.min(c.minY, p.y), maxX: Math.max(c.maxX, p.x), maxY: Math.max(c.maxY, p.y) };
}

export function uneste(a: Cutie, b: Cutie): Cutie {
  return { minX: Math.min(a.minX, b.minX), minY: Math.min(a.minY, b.minY), maxX: Math.max(a.maxX, b.maxX), maxY: Math.max(a.maxY, b.maxY) };
}

/** Cutia lărgită cu `r` pe fiecare parte: cutia unui disc de rază `r` purtat pe tot ce cuprinde cutia. */
export function largita(c: Cutie, r: number): Cutie {
  return { minX: c.minX - r, minY: c.minY - r, maxX: c.maxX + r, maxY: c.maxY + r };
}

/**
 * Cutia unui arc de cerc de la `a` la `b`, cu centrul dat și baleiajul cu semn (pozitiv = trigonometric). Capetele intră
 * exact cum sunt date; punctele de pe axe (unghiurile k·π/2) se scriu exact, nu prin cos / sin.
 */
export function cutieArc(a: Punct, b: Punct, centru: Punct, baleiaj: number): Cutie {
  const raza = Math.hypot(a.x - centru.x, a.y - centru.y);
  const start = Math.atan2(a.y - centru.y, a.x - centru.x);
  const jos = Math.min(start, start + baleiaj);
  const sus = Math.max(start, start + baleiaj);
  let c = cuPunct(cuPunct(CUTIE_GOALA, a), b);
  const sfert = Math.PI / 2;
  for (let k = Math.ceil(jos / sfert); k * sfert <= sus; k++) {
    const q = ((k % 4) + 4) % 4;
    const p = q === 0 ? { x: centru.x + raza, y: centru.y }
      : q === 1 ? { x: centru.x, y: centru.y + raza }
        : q === 2 ? { x: centru.x - raza, y: centru.y }
          : { x: centru.x, y: centru.y - raza };
    c = cuPunct(c, p);
  }
  return c;
}

/** Valorile t din (0, 1) unde derivata cubicei pe o axă se anulează: rădăcinile lui A·t² + B·t + C. */
function extremeCubica(p0: number, p1: number, p2: number, p3: number): number[] {
  const d0 = p1 - p0;
  const d1 = p2 - p1;
  const d2 = p3 - p2;
  const A = d0 - 2 * d1 + d2;
  const B = 2 * (d1 - d0);
  const C = d0;
  const radacini: number[] = [];
  const scara = Math.max(Math.abs(d0), Math.abs(d1), Math.abs(d2));
  if (scara === 0) return radacini;
  if (Math.abs(A) <= 1e-12 * scara) {
    if (Math.abs(B) > 1e-12 * scara) radacini.push(-C / B);
  } else {
    const delta = B * B - 4 * A * C;
    if (delta >= 0) {
      const r = Math.sqrt(delta);
      radacini.push((-B - r) / (2 * A), (-B + r) / (2 * A));
    }
  }
  return radacini.filter((t) => t > 0 && t < 1);
}

function punctCubica(p0: Punct, c1: Punct, c2: Punct, p3: Punct, t: number): Punct {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return { x: a * p0.x + b * c1.x + c * c2.x + d * p3.x, y: a * p0.y + b * c1.y + c * c2.y + d * p3.y };
}

/** Cutia exactă a unui contur: vârfurile, plus extremele arcelor și ale cubicelor. */
export function cutieContur(contur: Contur): Cutie {
  let c = CUTIE_GOALA;
  for (const v of contur.varfuri) c = cuPunct(c, v.p);
  for (let i = 0; i < numarSegmente(contur); i++) {
    const { a, b, s } = segment(contur, i);
    if (s.tip === 'A') {
      const { centru, baleiaj } = cerculArcului(a, b, s.bulge);
      c = uneste(c, cutieArc(a, b, centru, baleiaj));
    } else if (s.tip === 'C') {
      const valori = [...extremeCubica(a.x, s.c1.x, s.c2.x, b.x), ...extremeCubica(a.y, s.c1.y, s.c2.y, b.y)];
      for (const t of valori) c = cuPunct(c, punctCubica(a, s.c1, s.c2, b, t));
    }
  }
  return c;
}

/** Cât trece o cutie dincolo de fiecare latură a dreptunghiului [0, latime] × [0, inaltime], în mm; 0 dacă nu trece. */
export type Depasire = { readonly stanga: number; readonly dreapta: number; readonly jos: number; readonly sus: number };

/** Sub o miime de micron, o depășire e zgomot numeric (offsetul unui contur lipit de margine), nu o ieșire. */
export const TOLERANTA_DEPASIRE = 1e-6;

export function depasire(c: Cutie, latime: number, inaltime: number): Depasire {
  const d = (v: number): number => (v > TOLERANTA_DEPASIRE ? v : 0);
  return { stanga: d(-c.minX), dreapta: d(c.maxX - latime), jos: d(-c.minY), sus: d(c.maxY - inaltime) };
}

export function areDepasire(d: Depasire): boolean {
  return d.stanga > 0 || d.dreapta > 0 || d.jos > 0 || d.sus > 0;
}
