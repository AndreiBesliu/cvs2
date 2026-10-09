import { cerculArcului, numarSegmente, segment, type Contur, type Punct, type Segment } from './contur.ts';
import { CUTIE_GOALA, cuPunct, cutieArc, type Cutie } from './cutie.ts';
import { peArc } from './distanta.ts';

/**
 * Apropierea exactă dintre segmente și contururi (linii și arce), cu punctele care o dau: o citesc regiunea păstrată
 * (ADR 0026) și, mai târziu, intrările și legăturile. Stă separat de `distanta.ts`, care intră în pachetul de pornire
 * (clicul pe pânză), ca să se încarce doar cu exportul.
 */

/** Un segment de contur, cu capetele lui: linie sau arc (cubicele vin ca biarce). */
export type SegmentContur = { readonly a: Punct; readonly b: Punct; readonly s: Segment };

/** Distanța dintre două segmente, cu perechea de puncte care o dă: `p` pe primul, `q` pe al doilea. */
export type Apropiere = { readonly distanta: number; readonly p: Punct; readonly q: Punct };

const dist = (p: Punct, q: Punct): number => Math.hypot(p.x - q.x, p.y - q.y);

function celMaiApropiatPeDreapta(p: Punct, a: Punct, b: Punct): Punct {
  const dx = b.x - a.x, dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
  return { x: a.x + t * dx, y: a.y + t * dy };
}

/** Punctul arcului cel mai apropiat de p: proiecția radială, dacă unghiul ei e pe arc, altfel capătul mai apropiat. */
function celMaiApropiatPeArc(p: Punct, a: Punct, b: Punct, bulge: number): Punct {
  const { centru, raza, start, baleiaj } = cerculArcului(a, b, bulge);
  const u = Math.atan2(p.y - centru.y, p.x - centru.x);
  const r = Math.hypot(p.x - centru.x, p.y - centru.y);
  if (r > 0 && peArc(u, start, baleiaj)) return { x: centru.x + (raza * (p.x - centru.x)) / r, y: centru.y + (raza * (p.y - centru.y)) / r };
  return dist(p, a) <= dist(p, b) ? a : b;
}

function celMaiApropiat(p: Punct, v: SegmentContur): Punct {
  if (v.s.tip === 'L') return celMaiApropiatPeDreapta(p, v.a, v.b);
  if (v.s.tip === 'A') return celMaiApropiatPeArc(p, v.a, v.b, v.s.bulge);
  throw new Error('distanța la cubice vine cu biarcele (etapa 2)');
}

/** Punctele în care segmentul drept a→b (t ∈ [0, 1]) taie cercul (c, r). */
function dreaptaCerc(a: Punct, b: Punct, c: Punct, r: number): Punct[] {
  const dx = b.x - a.x, dy = b.y - a.y;
  const fx = a.x - c.x, fy = a.y - c.y;
  const A = dx * dx + dy * dy;
  if (A === 0) return [];
  const B = 2 * (fx * dx + fy * dy);
  const C = fx * fx + fy * fy - r * r;
  const disc = B * B - 4 * A * C;
  if (disc < 0) return [];
  const rad = Math.sqrt(disc);
  return [(-B - rad) / (2 * A), (-B + rad) / (2 * A)].filter((t) => t >= 0 && t <= 1).map((t) => ({ x: a.x + t * dx, y: a.y + t * dy }));
}

/** Punctele în care se taie două cercuri (niciunul, dacă sunt concentrice). */
function cercCerc(c1: Punct, r1: number, c2: Punct, r2: number): Punct[] {
  const d = dist(c1, c2);
  if (d === 0 || d > r1 + r2 || d < Math.abs(r1 - r2)) return [];
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
  const mx = c1.x + (a * (c2.x - c1.x)) / d, my = c1.y + (a * (c2.y - c1.y)) / d;
  const ox = (h * (c2.y - c1.y)) / d, oy = (h * (c2.x - c1.x)) / d;
  return [{ x: mx + ox, y: my - oy }, { x: mx - ox, y: my + oy }];
}

function peArcul(q: Punct, v: SegmentContur): boolean {
  if (v.s.tip !== 'A') return false;
  const { centru, start, baleiaj } = cerculArcului(v.a, v.b, v.s.bulge);
  return peArc(Math.atan2(q.y - centru.y, q.x - centru.x), start, baleiaj);
}

/** Punctul în care se taie două segmente drepte, dacă se taie (inclusiv în capete); suprapunerile le prind capetele. */
function intersectieDrepte(a: Punct, b: Punct, c: Punct, d: Punct): Punct | null {
  const rx = b.x - a.x, ry = b.y - a.y, sx = d.x - c.x, sy = d.y - c.y;
  const den = rx * sy - ry * sx;
  if (den === 0) return null;
  const t = ((c.x - a.x) * sy - (c.y - a.y) * sx) / den;
  const w = ((c.x - a.x) * ry - (c.y - a.y) * rx) / den;
  return t >= 0 && t <= 1 && w >= 0 && w <= 1 ? { x: a.x + t * rx, y: a.y + t * ry } : null;
}

/**
 * Distanța exactă dintre două segmente (linie sau arc), cu punctele care o dau. Minimul e într-una din situațiile:
 * - segmentele se taie (distanța 0);
 * - un capăt al unuia, față de celălalt (proiecția pe dreaptă, sau radială pe arc);
 * - câte un punct interior al fiecăruia, cu legătura perpendiculară pe amândouă: la linie–arc, punctele c ± r·n ale
 *   cercului (n, normala dreptei); la arc–arc, punctele de pe linia centrelor; la arce concentrice, |r1 − r2| pe o rază
 *   comună.
 * Se iau toate candidatele valide și se alege cea mai mică; niciun eșantion.
 */
export function apropiereSegmente(u: SegmentContur, v: SegmentContur): Apropiere {
  if (u.s.tip === 'C' || v.s.tip === 'C') throw new Error('distanța la cubice vine cu biarcele (etapa 2)');
  let cea: Apropiere = { distanta: Infinity, p: u.a, q: v.a };
  const ia = (p: Punct, q: Punct): void => {
    const d = dist(p, q);
    if (d < cea.distanta) cea = { distanta: d, p, q };
  };
  for (const p of [u.a, u.b]) ia(p, celMaiApropiat(p, v));
  for (const q of [v.a, v.b]) ia(celMaiApropiat(q, u), q);
  if (u.s.tip === 'L' && v.s.tip === 'L') {
    const x = intersectieDrepte(u.a, u.b, v.a, v.b);
    if (x) ia(x, x);
  } else if (u.s.tip === 'A' && v.s.tip === 'A') {
    const c1 = cerculArcului(u.a, u.b, u.s.bulge), c2 = cerculArcului(v.a, v.b, v.s.bulge);
    for (const x of cercCerc(c1.centru, c1.raza, c2.centru, c2.raza)) if (peArcul(x, u) && peArcul(x, v)) ia(x, x);
    const d = dist(c1.centru, c2.centru);
    if (d > 0) {
      const ux = (c2.centru.x - c1.centru.x) / d, uy = (c2.centru.y - c1.centru.y) / d;
      for (const s1 of [1, -1]) {
        const p = { x: c1.centru.x + s1 * c1.raza * ux, y: c1.centru.y + s1 * c1.raza * uy };
        if (!peArcul(p, u)) continue;
        for (const s2 of [1, -1]) {
          const q = { x: c2.centru.x + s2 * c2.raza * ux, y: c2.centru.y + s2 * c2.raza * uy };
          if (peArcul(q, v)) ia(p, q);
        }
      }
    } else {
      // Concentrice: pe o rază comună celor două arce, distanța e |r1 − r2|; o rază comună există dacă un capăt al unuia
      // e pe celălalt, iar atunci perechea ei e chiar capătul și proiecția lui radială.
      for (const p of [u.a, u.b]) if (peArcul(p, v)) ia(p, celMaiApropiat(p, v));
      for (const q of [v.a, v.b]) if (peArcul(q, u)) ia(celMaiApropiat(q, u), q);
    }
  } else {
    const liniaEPrima = u.s.tip === 'L';
    const lin = liniaEPrima ? u : v;
    const arcS = liniaEPrima ? v : u;
    if (arcS.s.tip !== 'A') throw new Error('perechea linie–arc fără arc');
    const c = cerculArcului(arcS.a, arcS.b, arcS.s.bulge);
    const pereche = (pl: Punct, pa: Punct): void => { if (liniaEPrima) ia(pl, pa); else ia(pa, pl); };
    for (const x of dreaptaCerc(lin.a, lin.b, c.centru, c.raza)) if (peArcul(x, arcS)) pereche(x, x);
    const dx = lin.b.x - lin.a.x, dy = lin.b.y - lin.a.y;
    const l = Math.hypot(dx, dy);
    if (l > 0) {
      for (const sg of [1, -1]) {
        const q = { x: c.centru.x - (sg * c.raza * dy) / l, y: c.centru.y + (sg * c.raza * dx) / l };
        if (!peArcul(q, arcS)) continue;
        const t = ((q.x - lin.a.x) * dx + (q.y - lin.a.y) * dy) / (l * l);
        if (t >= 0 && t <= 1) pereche({ x: lin.a.x + t * dx, y: lin.a.y + t * dy }, q);
      }
    }
  }
  return cea;
}

/** Distanța dintre două cutii (0 dacă se suprapun): o margine de jos a distanței dintre ce cuprind ele. */
export function distantaCutii(a: Cutie, b: Cutie): number {
  return Math.hypot(Math.max(0, a.minX - b.maxX, b.minX - a.maxX), Math.max(0, a.minY - b.maxY, b.minY - a.maxY));
}

/** Segmentele unui contur, fiecare cu cutia lui exactă. */
export function segmenteCuCutii(c: Contur): ReadonlyArray<{ readonly s: SegmentContur; readonly cutie: Cutie }> {
  return Array.from({ length: numarSegmente(c) }, (_, i) => {
    const s = segment(c, i);
    if (s.s.tip === 'C') throw new Error('distanța la cubice vine cu biarcele (etapa 2)');
    const cutie = s.s.tip === 'A'
      ? (() => { const k = cerculArcului(s.a, s.b, s.s.bulge); return cutieArc(s.a, s.b, k.centru, k.baleiaj); })()
      : cuPunct(cuPunct(CUTIE_GOALA, s.a), s.b);
    return { s, cutie };
  });
}

/**
 * Distanța exactă dintre două contururi (linii și arce), cu punctele care o dau. Perechile de segmente ale căror cutii
 * stau mai departe decât cea mai bună distanță găsită nu se mai măsoară.
 */
export function apropiereContururi(c1: Contur, c2: Contur): Apropiere {
  const s1 = segmenteCuCutii(c1), s2 = segmenteCuCutii(c2);
  let cea: Apropiere = { distanta: Infinity, p: c1.varfuri[0]?.p ?? { x: 0, y: 0 }, q: c2.varfuri[0]?.p ?? { x: 0, y: 0 } };
  for (const x of s1) {
    for (const y of s2) {
      if (distantaCutii(x.cutie, y.cutie) >= cea.distanta) continue;
      const a = apropiereSegmente(x.s, y.s);
      if (a.distanta < cea.distanta) cea = a;
    }
  }
  return cea;
}
