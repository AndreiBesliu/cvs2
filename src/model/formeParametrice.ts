/**
 * Formele cu parametri (ADR 0053), pure: generatorii poligonului regulat și ai elipsei (comuni cu uneltele de desen, ADR
 * 0051) și recunoașterea lor pe o formă salvată, ca panoul să le poată edita după plasare FĂRĂ un câmp nou în document:
 * geometria e adevărul. Dreptunghiul și cercul își poartă singure parametrii; un poligon e o cale închisă din linii cu
 * vârfurile la aceeași distanță de centru și cu același pas de unghi; o elipsă e o cale pe care generatorul o reface identic
 * (aceleași cubice, sub o toleranță de rotunjire), cu aceleași raze și același centru. O cale care nu se potrivește nu e
 * recunoscută (rămâne de transformat cu mânerele).
 */
import { arcEliptic } from '../geom/elipsa.ts';
import { TOLERANTA_IMPORT } from '../geom/toleranta.ts';
import type { FormaDoc, VarfDoc } from './document.ts';

type P = { readonly x: number; readonly y: number };

export const LATURI_MIN = 3;
export const LATURI_MAX = 64;

export type Parametri =
  | { readonly tip: 'dreptunghi'; readonly latime: number; readonly inaltime: number; readonly razaColt: number }
  | { readonly tip: 'cerc'; readonly raza: number }
  /** `unghi`: al primului vârf (radiani); `sens`: 1 trigonometric, −1 orar. */
  | { readonly tip: 'poligon'; readonly laturi: number; readonly raza: number; readonly centru: P; readonly unghi: number; readonly sens: 1 | -1 }
  | { readonly tip: 'elipsa'; readonly rx: number; readonly ry: number; readonly centru: P };

const L = (p: P): VarfDoc => ({ p: { x: p.x, y: p.y }, s: { tip: 'L' } });

/** Pură: poligonul regulat cu `laturi` laturi, înscris în cercul (centru, raza), cu primul vârf la `unghi`. */
export function poligonRegulat(centru: P, raza: number, laturi: number, unghi: number, sens: 1 | -1 = 1): FormaDoc {
  const n = Math.round(Math.min(LATURI_MAX, Math.max(LATURI_MIN, laturi)));
  const varfuri = Array.from({ length: n }, (_, k) => {
    const u = unghi + (sens * 2 * Math.PI * k) / n;
    return L({ x: centru.x + raza * Math.cos(u), y: centru.y + raza * Math.sin(u) });
  });
  return { tip: 'cale', inchis: true, varfuri };
}

/**
 * Pură: elipsa cu axele pe x / y, ca lanț de cubice cu aceeași funcție și toleranță ca importul SVG, pornind din
 * (centru.x + rx, centru.y), în sens trigonometric, tăiată pe sferturi: cele patru extreme sunt vârfuri exacte, deci cutia
 * formei e exact centrul ± razele (panoul arată 120, nu 119,999999663). Cu razele egale, în origine, e un `cerc`, exact (un
 * cerc nu are centru propriu: îl dă locul instanței).
 */
export function elipsa(centru: P, rx: number, ry: number): FormaDoc {
  if (centru.x === 0 && centru.y === 0 && Math.abs(rx - ry) <= 1e-12 * Math.max(rx, ry)) return { tip: 'cerc', raza: rx };
  const h = { a: rx, b: 0, c: 0, d: ry, e: centru.x, f: centru.y };
  const extreme: P[] = [
    { x: centru.x + rx, y: centru.y }, { x: centru.x, y: centru.y + ry }, { x: centru.x - rx, y: centru.y }, { x: centru.x, y: centru.y - ry },
  ];
  const varfuri: VarfDoc[] = [];
  for (let q = 0; q < 4; q++) {
    const start = extreme[q] ?? centru;
    varfuri.push(...lant(arcEliptic(h, (q * Math.PI) / 2, Math.PI / 2, start, extreme[(q + 1) % 4] ?? centru, TOLERANTA_IMPORT), start));
  }
  return { tip: 'cale', inchis: true, varfuri };
}

/** Elipsa uneltei de desen dinaintea feliei 6.D↑ (ADR 0051): o singură bucată de 2π; o recunoaștem încă, ca s-o edităm. */
function elipsaDintrOBucata(centru: P, rx: number, ry: number): FormaDoc {
  const start = { x: centru.x + rx, y: centru.y };
  return { tip: 'cale', inchis: true, varfuri: lant(arcEliptic({ a: rx, b: 0, c: 0, d: ry, e: centru.x, f: centru.y }, 0, 2 * Math.PI, start, start, TOLERANTA_IMPORT), start) };
}

/** Vârfurile unui lanț de cubice care pornește din `start`. */
function lant(cubice: readonly { readonly c1: P; readonly c2: P; readonly b: P }[], start: P): VarfDoc[] {
  const varfuri: VarfDoc[] = [];
  let p0 = start;
  for (const c of cubice) {
    varfuri.push({ p: { x: p0.x, y: p0.y }, s: { tip: 'C', c1: { x: c.c1.x, y: c.c1.y }, c2: { x: c.c2.x, y: c.c2.y } } });
    p0 = c.b;
  }
  return varfuri;
}

/** Pură: forma din parametri. */
export function dinParametri(p: Parametri): FormaDoc {
  switch (p.tip) {
    case 'dreptunghi': return { tip: 'dreptunghi', latime: p.latime, inaltime: p.inaltime, razaColt: p.razaColt };
    case 'cerc': return { tip: 'cerc', raza: p.raza };
    case 'poligon': return poligonRegulat(p.centru, p.raza, p.laturi, p.unghi, p.sens);
    case 'elipsa': return elipsa(p.centru, p.rx, p.ry);
  }
}

const aproape = (a: number, b: number, scara: number): boolean => Math.abs(a - b) <= 1e-9 * Math.max(1, scara);
const unghiNormat = (u: number): number => {
  let x = u % (2 * Math.PI);
  if (x > Math.PI) x -= 2 * Math.PI;
  if (x <= -Math.PI) x += 2 * Math.PI;
  return x;
};

/** Pură: parametrii formei, dacă e una dintre formele cu parametri; altfel null. */
export function parametri(f: FormaDoc): Parametri | null {
  if (f.tip === 'dreptunghi') return { tip: 'dreptunghi', latime: f.latime, inaltime: f.inaltime, razaColt: f.razaColt };
  if (f.tip === 'cerc') return { tip: 'cerc', raza: f.raza };
  if (!f.inchis) return null;
  const v = f.varfuri;
  const n = v.length;
  if (n < 2) return null;
  // Centrul: media vârfurilor (pașii egali de unghi se anulează, la poligon ca și la elipsă).
  const centru = { x: v.reduce((s, q) => s + q.p.x, 0) / n, y: v.reduce((s, q) => s + q.p.y, 0) / n };
  if (v.every((q) => q.s.tip === 'L')) {
    if (n < LATURI_MIN || n > LATURI_MAX) return null;
    const unghiuri = v.map((q) => Math.atan2(q.p.y - centru.y, q.p.x - centru.x));
    const raza = Math.hypot((v[0]?.p.x ?? 0) - centru.x, (v[0]?.p.y ?? 0) - centru.y);
    if (!(raza > 0)) return null;
    const pas = unghiNormat((unghiuri[1] ?? 0) - (unghiuri[0] ?? 0));
    if (!aproape(Math.abs(pas), (2 * Math.PI) / n, 1)) return null;
    const sens = pas > 0 ? 1 : -1;
    for (let k = 0; k < n; k++) {
      const q = v[k];
      if (!q || !aproape(Math.hypot(q.p.x - centru.x, q.p.y - centru.y), raza, raza)) return null;
      if (!aproape(unghiNormat((unghiuri[(k + 1) % n] ?? 0) - (unghiuri[k] ?? 0)), pas, 1)) return null;
    }
    return { tip: 'poligon', laturi: n, raza, centru, unghi: unghiuri[0] ?? 0, sens };
  }
  if (!v.every((q) => q.s.tip === 'C')) return null;
  // Elipsa generatorului: primul vârf la (cx + rx, cy); ry din vârful cel mai depărtat pe y (vârfurile sunt pe elipsă).
  const p0 = v[0]?.p;
  if (!p0) return null;
  const rx = p0.x - centru.x;
  if (!(rx > 0) || !aproape(p0.y, centru.y, rx)) return null;
  let ry = 0;
  for (const q of v) {
    const ux = (q.p.x - centru.x) / rx;
    const dy = Math.abs(q.p.y - centru.y);
    if (dy > 0 && ux * ux < 1) ry = Math.max(ry, dy / Math.sqrt(1 - ux * ux));
  }
  if (!(ry > 0)) return null;
  const scara = Math.max(rx, ry, Math.abs(centru.x), Math.abs(centru.y));
  const egal = (a: P, b: P): boolean => aproape(a.x, b.x, scara) && aproape(a.y, b.y, scara);
  const aceeasi = (g: FormaDoc): boolean => g.tip === 'cale' && g.varfuri.length === n && v.every((a, k) => {
    const b = g.varfuri[k];
    return !!b && egal(a.p, b.p) && a.s.tip === 'C' && b.s.tip === 'C' && egal(a.s.c1, b.s.c1) && egal(a.s.c2, b.s.c2);
  });
  return aceeasi(elipsa(centru, rx, ry)) || aceeasi(elipsaDintrOBucata(centru, rx, ry)) ? { tip: 'elipsa', rx, ry, centru } : null;
}
