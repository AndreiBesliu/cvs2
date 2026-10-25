/**
 * Unealta Noduri (ADR 0062), partea pură a editării: ce formă se poate edita, matricea ei în lume și inversa, nodul și latura de
 * sub cursor, drumul SVG al conturului pentru previzualizare. Calea însăși (mutarea, adăugarea, scoaterea) e în
 * `src/model/noduri.ts`.
 */
import { cerculArcului, numarSegmente, segment, type Contur, type Punct } from '../geom/conturBaza.ts';
import { inversa } from '../geom/inversa.ts';
import { aplica, type Matrice } from '../geom/matrice.ts';
import { peArc } from '../geom/distanta.ts';
import type { Document, FormaDoc } from '../model/document.ts';
import { conturElement } from '../model/forme.ts';
import { elementeFoaie } from '../model/lume.ts';
import { FOAIA } from '../ui/actiuniDocument.ts';

/** Forma de sub unealtă: instanța, forma elementului și matricea lui în lume. */
export type FormaNoduri = { readonly instanta: string; readonly forma: FormaDoc; readonly matrice: Matrice };
export type MotivNoduri = 'nimic' | 'mai-multe' | 'piesa-compusa' | 'piesa-impartita';

/**
 * Pură: forma pe care unealta Noduri o poate edita: o singură instanță aleasă, cu piesa doar a ei și un singur element
 * (prin `document.forma`, care înlocuiește forma acelui element); altfel motivul.
 */
export function formaNoduri(doc: Document, selectie: readonly string[]): FormaNoduri | MotivNoduri {
  if (selectie.length === 0) return 'nimic';
  if (selectie.length > 1) return 'mai-multe';
  const foaie = doc.foi[FOAIA];
  const i = foaie?.instante.find((x) => x.id === selectie[0]);
  const piesa = i ? doc.piese.find((p) => p.id === i.piesa) : undefined;
  if (!i || !piesa) return 'nimic';
  if (piesa.radacina.tip !== 'element') return 'piesa-compusa';
  let folosiri = 0;
  for (const f of doc.foi) for (const x of f.instante) if (x.piesa === piesa.id) folosiri++;
  if (folosiri > 1) return 'piesa-impartita';
  const e = elementeFoaie(doc, FOAIA).find((x) => x.instanta === i.id);
  return e ? { instanta: i.id, forma: e.forma, matrice: e.matrice } : 'nimic';
}

/** Inversa unei matrice afine (din `geom/inversa.ts`, locul ei). */
export { inversa };

/** Indexul nodului (din punctele lui pe ecran) cel mai apropiat de (px, py), la cel mult `raza` px; sau `null`. */
export function nodLovit(noduri: readonly Punct[], px: number, py: number, raza: number): number | null {
  let cel: number | null = null, d0 = raza;
  noduri.forEach((q, k) => {
    const d = Math.hypot(q.x - px, q.y - py);
    if (d <= d0) { d0 = d; cel = k; }
  });
  return cel;
}

/** Cel mai apropiat punct al segmentului `i` de `p`: parametrul lui (0…1) și distanța. Liniile și arcele exact; cubica, eșantionată și rafinată. */
function apropiat(c: Contur, i: number, p: Punct): { readonly t: number; readonly d: number } {
  const { a, b, s } = segment(c, i);
  if (s.tip === 'A' && Math.abs(s.bulge) > 1e-12) {
    const { centru, raza, start, baleiaj } = cerculArcului(a, b, s.bulge);
    const u = Math.atan2(p.y - centru.y, p.x - centru.x);
    if (peArc(u, start, baleiaj)) {
      const rel = baleiaj >= 0 ? (((u - start) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) : (((start - u) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      return { t: rel / Math.abs(baleiaj), d: Math.abs(Math.hypot(p.x - centru.x, p.y - centru.y) - raza) };
    }
    const da = Math.hypot(p.x - a.x, p.y - a.y), db = Math.hypot(p.x - b.x, p.y - b.y);
    return da <= db ? { t: 0, d: da } : { t: 1, d: db };
  }
  if (s.tip === 'C') {
    const pe = (t: number): Punct => {
      const m = 1 - t;
      return { x: m * m * m * a.x + 3 * m * m * t * s.c1.x + 3 * m * t * t * s.c2.x + t * t * t * b.x, y: m * m * m * a.y + 3 * m * m * t * s.c1.y + 3 * m * t * t * s.c2.y + t * t * t * b.y };
    };
    const dist = (t: number): number => { const q = pe(t); return Math.hypot(q.x - p.x, q.y - p.y); };
    let t0 = 0, d0 = dist(0);
    for (let k = 1; k <= 64; k++) { const d = dist(k / 64); if (d < d0) { d0 = d; t0 = k / 64; } }
    let lo = Math.max(0, t0 - 1 / 64), hi = Math.min(1, t0 + 1 / 64);
    for (let k = 0; k < 40; k++) {
      const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3;
      if (dist(m1) < dist(m2)) hi = m2; else lo = m1;
    }
    const t = (lo + hi) / 2;
    return { t, d: dist(t) };
  }
  const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
  const t = l2 > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2)) : 0;
  return { t, d: Math.hypot(a.x + dx * t - p.x, a.y + dy * t - p.y) };
}

/** Latura conturului (în lume) cea mai apropiată de `p`, la cel mult `toleranta` mm, cu parametrul punctului de pe ea; sau `null`. */
export function laturaLovita(c: Contur, p: Punct, toleranta: number): { readonly i: number; readonly t: number } | null {
  let cel: { i: number; t: number } | null = null, d0 = toleranta;
  for (let i = 0; i < numarSegmente(c); i++) {
    const r = apropiat(c, i, p);
    if (r.d <= d0) { d0 = r.d; cel = { i, t: r.t }; }
  }
  return cel;
}

/** Conturul formei în lume (cu matricea ei), pentru desen și pentru latura lovită. */
export function conturNoduri(forma: FormaDoc, matrice: Matrice): Contur {
  return conturElement({ forma, matrice });
}

/** Drumul SVG al conturului (în lume), pe ecran: liniile, arcele (cu raza și sensul lor) și cubicele. */
export function drumSvg(c: Contur, v: { readonly scara: number; readonly tx: number; readonly ty: number }): string {
  const e = (q: Punct): string => `${v.tx + q.x * v.scara} ${v.ty - q.y * v.scara}`;
  const p0 = c.varfuri[0]?.p;
  if (!p0) return '';
  let d = `M ${e(p0)}`;
  for (let i = 0; i < numarSegmente(c); i++) {
    const { a, b, s } = segment(c, i);
    if (s.tip === 'A' && Math.abs(s.bulge) > 1e-12) {
      const r = cerculArcului(a, b, s.bulge).raza * v.scara;
      // Y e întors pe ecran: un arc trigonometric (bulge > 0) se desenează în sensul acelor (sweep 0).
      d += ` A ${r} ${r} 0 ${Math.abs(s.bulge) > 1 ? 1 : 0} ${s.bulge > 0 ? 0 : 1} ${e(b)}`;
    } else if (s.tip === 'C') d += ` C ${e(s.c1)} ${e(s.c2)} ${e(b)}`;
    else d += ` L ${e(b)}`;
  }
  return c.inchis ? `${d} Z` : d;
}

/** Punctele nodurilor pe ecran (vârfurile căii, cu matricea în lume). */
export function noduriPeEcran(varfuri: readonly { readonly p: Punct }[], matrice: Matrice, v: { readonly scara: number; readonly tx: number; readonly ty: number }): Punct[] {
  return varfuri.map((x) => {
    const q = aplica(matrice, x.p);
    return { x: v.tx + q.x * v.scara, y: v.ty - q.y * v.scara };
  });
}
