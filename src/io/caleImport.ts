/**
 * Ce judecă ambele uși ale importului (SVG, ADR 0035 / 0037; DXF, ADR 0101) pe o cale citită, în mm: calea deschisă (cu
 * plafonul și lungimea ei), praful, bucla dintr-o singură cubică, căile fără arie (pe o dreaptă), marginile documentului și
 * similitudinea unei matrice. Mutate din ușa SVG, neschimbate.
 */
import { LINIE, type Punct, type Varf } from '../geom/contur.ts';
import { cutieContur } from '../geom/cutie.ts';
import { esteSimilitudine, type Matrice } from '../geom/matrice.ts';
import { REZOLUTIE } from '../geom/toleranta.ts';
import { PLAFON } from '../model/document.ts';

export type CaleCitita = { readonly varfuri: Varf[]; readonly inchis: boolean };

/**
 * Calea deschisă a unei subcăi (ADR 0037 §11): vârfurile ei plus punctul final, cu segmentul L. Plafonul căii se judecă
 * cu vârful final inclus; e degenerată dacă are mai puțin de 2 vârfuri distincte sau lungimea pe curbă sub `REZOLUTIE`.
 * Praful nu se judecă aici: o cale lăsată deschisă cu golul peste 0,01 mm are diagonala cel puțin cât golul, iar una
 * rămasă deschisă după o închidere degenerată nu era un contur (ADR 0037 §11, „Praful”).
 */
export function deschisa(varfuri: readonly Varf[], capat: Punct): CaleCitita | 'prea-mare' | 'degenerata' {
  const v = [...varfuri, { p: capat, s: LINIE }];
  if (v.length > PLAFON.varfuriCale) return 'prea-mare';
  const p0 = capat;
  if (!v.some((x) => x.p.x !== p0.x || x.p.y !== p0.y)) return 'degenerata';
  return lungimeDeschisa(v) < REZOLUTIE ? 'degenerata' : { varfuri: v, inchis: false };
}

/**
 * Lungimea pe curbă a unei căi deschise (n − 1 segmente), până la rezoluție: doar pragul contează, deci socoteala se
 * oprește odată trecută de el. Linia exact; arcul din coardă și bulge (r·θ); cubica prin `lungimeCubica`.
 */
export function lungimeDeschisa(v: readonly Varf[]): number {
  let l = 0;
  for (let i = 0; i + 1 < v.length && l < REZOLUTIE; i++) {
    const a = v[i] as Varf, b = (v[i + 1] as Varf).p;
    const coarda = Math.hypot(b.x - a.p.x, b.y - a.p.y);
    if (a.s.tip === 'L') l += coarda;
    else if (a.s.tip === 'A') {
      // r·θ = coarda·(1 + β²)·atan|β| / |β|; spre β → 0, coarda.
      const k = Math.abs(a.s.bulge);
      l += k === 0 ? coarda : (coarda * (1 + k * k) * Math.atan(k)) / k;
    } else l += lungimeCubica(a.p, a.s.c1, a.s.c2, b, REZOLUTIE - l, 0);
  }
  return l;
}

/**
 * Lungimea unei cubice, prin împărțiri de Casteljau: coarda e o margine de jos, poligonul de control una de sus. O bucată
 * a cărei coardă trece de `ramas` întoarce coarda (pragul e deja depășit); altfel se împarte până când cele două margini
 * diferă cu cel mult 1e-9 mm (o eroare fără greutate față de pragul de 0,01 mm).
 */
export function lungimeCubica(a: Punct, c1: Punct, c2: Punct, b: Punct, ramas: number, adancime: number): number {
  const d = (p: Punct, q: Punct): number => Math.hypot(q.x - p.x, q.y - p.y);
  const coarda = d(a, b);
  if (coarda >= ramas) return coarda;
  const poligon = d(a, c1) + d(c1, c2) + d(c2, b);
  if (poligon - coarda <= 1e-9 || adancime >= 40) return (poligon + coarda) / 2;
  const mij = (p: Punct, q: Punct): Punct => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });
  const m01 = mij(a, c1), m12 = mij(c1, c2), m23 = mij(c2, b);
  const m012 = mij(m01, m12), m123 = mij(m12, m23);
  const m = mij(m012, m123);
  const prima = lungimeCubica(a, m01, m012, m, ramas, adancime + 1);
  return prima >= ramas ? prima : prima + lungimeCubica(m, m123, m23, b, ramas - prima, adancime + 1);
}

/** Un contur închis mai mic decât rezoluția: diagonala cutiei lui exacte (arcele cu extremele, cubicele cu ale lor). */
export function praf(varfuri: readonly Varf[]): boolean {
  const c = cutieContur({ inchis: true, varfuri });
  return Math.hypot(c.maxX - c.minX, c.maxY - c.minY) < REZOLUTIE;
}

/**
 * O buclă dintr-o singură cubică (o picătură desenată dintr-un nod): două jumătăți, împărțite la t = 1/2 (de Casteljau),
 * ca o cale să aibă cel puțin două vârfuri (recenzia 2.7c: era sărită ca „degenerată”).
 */
export function bucla(a: Punct, c1: Punct, c2: Punct): Varf[] {
  const mij = (p: Punct, q: Punct): Punct => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });
  const m01 = mij(a, c1);
  const m12 = mij(c1, c2);
  const m23 = mij(c2, a);
  const m012 = mij(m01, m12);
  const m123 = mij(m12, m23);
  const m = mij(m012, m123);
  return [{ p: a, s: { tip: 'C', c1: m01, c2: m012 } }, { p: m, s: { tip: 'C', c1: m123, c2: m23 } }];
}

/** Toate vârfurile pe dreapta dintre primul și cel mai depărtat de el, până la rotunjire (1e-12 din mărime). */
/**
 * Punctele subcăii (vârfurile și mânerele cubicelor) stau pe o dreaptă: exact (la 1e-12 din mărime), sau la cel mult
 * `toleranta` mm de dreapta prin cele mai depărtate două puncte ale ei (ADR 0037 §11, precizarea 2.3c-6).
 */
export function peODreapta(v: readonly Varf[], toleranta = 0): boolean {
  const puncte = v.flatMap((x) => (x.s.tip === 'C' ? [x.p, x.s.c1, x.s.c2] : [x.p]));
  const a0 = puncte[0];
  if (!a0) return true;
  // Cele mai depărtate două puncte: cel mai departe de primul, apoi cel mai departe de acela.
  const departe = (de: Punct): Punct => puncte.reduce((m, q) => (Math.hypot(q.x - de.x, q.y - de.y) > Math.hypot(m.x - de.x, m.y - de.y) ? q : m), de);
  const a = toleranta > 0 ? departe(a0) : a0;
  const b = departe(a);
  const dmax = Math.hypot(b.x - a.x, b.y - a.y);
  if (dmax === 0) return true;
  const ux = (b.x - a.x) / dmax;
  const uy = (b.y - a.y) / dmax;
  return puncte.every((x) => Math.abs((x.x - a.x) * uy - (x.y - a.y) * ux) <= Math.max(toleranta, 1e-12 * Math.max(dmax, 1)));
}

/** E similitudine relativ la scara ei (sub scara 1, toleranța absolută ar lua o elipsă minusculă drept cerc; recenzia 2.7c). */
export function similitudine(m: Matrice): boolean {
  const s = Math.max(Math.hypot(m.a, m.b), Math.hypot(m.c, m.d));
  return s > 0 && esteSimilitudine({ a: m.a / s, b: m.b / s, c: m.c / s, d: m.d / s, e: 0, f: 0 });
}

const finitInMargini = (x: number): boolean => Number.isFinite(x) && Math.abs(x) <= PLAFON.translatie;
export function inMargini(v: Varf): boolean {
  const pct = [v.p, ...(v.s.tip === 'C' ? [v.s.c1, v.s.c2] : [])];
  return pct.every((q) => finitInMargini(q.x) && finitInMargini(q.y)) && (v.s.tip !== 'A' || Number.isFinite(v.s.bulge));
}
