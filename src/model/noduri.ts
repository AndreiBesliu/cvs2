/**
 * Editarea nodurilor (ADR 0062), partea pură: calea unei forme în coordonatele elementului, mutarea unui nod, un nod nou pe un
 * segment, scoaterea unui nod. Exact: dreptunghiul și cercul devin căile conturului lor (aceleași arce), arcul se împarte în
 * două arce ale aceluiași cerc, cubica prin de Casteljau; nimic nu se aproximează.
 */
import { cerculArcului, conturCerc, conturDreptunghi, type Contur, type Punct } from '../geom/conturBaza.ts';
import type { FormaDoc, SegmentDoc, VarfDoc } from './document.ts';

export type FormaCale = Extract<FormaDoc, { tip: 'cale' }>;

/** De ce un nod nu se poate scoate. */
export type MotivNod = 'curbe' | 'prea-putine';

function dinContur(c: Contur): FormaCale {
  return {
    tip: 'cale', inchis: c.inchis,
    varfuri: c.varfuri.map((v): VarfDoc => ({
      p: { x: v.p.x, y: v.p.y },
      s: v.s.tip === 'A' ? { tip: 'A', bulge: v.s.bulge } : v.s.tip === 'C' ? { tip: 'C', c1: { ...v.s.c1 }, c2: { ...v.s.c2 } } : { tip: 'L' },
    })),
  };
}

/** Calea formei, în coordonatele elementului: calea ei, sau conturul exact al dreptunghiului (colțurile rotunjite ca arce) și al cercului. */
export function caleDinForma(f: FormaDoc): FormaCale {
  if (f.tip === 'cale') return f;
  return dinContur(f.tip === 'dreptunghi' ? conturDreptunghi(0, 0, f.latime, f.inaltime, f.razaColt) : conturCerc(0, 0, f.raza));
}

const segmenteCale = (c: FormaCale): number => (c.inchis ? c.varfuri.length : Math.max(0, c.varfuri.length - 1));

/**
 * Nodul `i` dus în `la` (coordonatele elementului); punctele de control vecine ale cubicelor se mută cu aceeași deplasare
 * (forma curbei din jurul nodului rămâne), arcele își păstrează bulge-ul (se scalează odată cu coarda).
 */
export function mutaNod(c: FormaCale, i: number, la: Punct): FormaCale {
  const n = c.varfuri.length;
  const v = c.varfuri[i];
  if (!v) return c;
  const dx = la.x - v.p.x, dy = la.y - v.p.y;
  const muta = (q: { x: number; y: number }) => ({ ...q, x: q.x + dx, y: q.y + dy });
  const varfuri = c.varfuri.map((w) => ({ ...w }));
  // Segmentul care pleacă din nod (al lui): punctul de control dinspre el.
  const s = v.s;
  varfuri[i] = { ...v, p: { ...v.p, x: la.x, y: la.y }, s: s.tip === 'C' && (c.inchis || i < n - 1) ? { ...s, c1: muta(s.c1) } : s };
  // Segmentul care vine în nod (al vârfului dinainte): punctul de control dinspre el.
  const j = i - 1 >= 0 ? i - 1 : c.inchis ? n - 1 : -1;
  const u = j >= 0 ? varfuri[j] : undefined;
  if (u && u.s.tip === 'C') varfuri[j] = { ...u, s: { ...u.s, c2: muta(u.s.c2) } };
  return { ...c, varfuri };
}

/** Un nod nou pe segmentul `i`, la parametrul `t` ∈ (0, 1): linia la `t`, arcul la `t` din baleiaj, cubica prin de Casteljau. */
export function adaugaNod(c: FormaCale, i: number, t: number): FormaCale {
  const n = c.varfuri.length;
  if (i < 0 || i >= segmenteCale(c) || !(t > 0 && t < 1)) return c;
  const a = c.varfuri[i]!, b = c.varfuri[(i + 1) % n]!;
  const s = a.s;
  let stanga: SegmentDoc, dreapta: SegmentDoc, p: Punct;
  if (s.tip === 'A' && Math.abs(s.bulge) > 1e-12) {
    const { centru, raza, start, baleiaj } = cerculArcului(a.p, b.p, s.bulge);
    const u = start + baleiaj * t;
    p = { x: centru.x + raza * Math.cos(u), y: centru.y + raza * Math.sin(u) };
    stanga = { ...s, bulge: Math.tan((baleiaj * t) / 4) };
    dreapta = { ...s, bulge: Math.tan((baleiaj * (1 - t)) / 4) };
  } else if (s.tip === 'C') {
    const m = (q: Punct, r: Punct): Punct => ({ x: q.x + (r.x - q.x) * t, y: q.y + (r.y - q.y) * t });
    const p01 = m(a.p, s.c1), p12 = m(s.c1, s.c2), p23 = m(s.c2, b.p), p012 = m(p01, p12), p123 = m(p12, p23);
    p = m(p012, p123);
    stanga = { ...s, c1: p01, c2: p012 };
    dreapta = { ...s, c1: p123, c2: p23 };
  } else {
    p = { x: a.p.x + (b.p.x - a.p.x) * t, y: a.p.y + (b.p.y - a.p.y) * t };
    stanga = s;
    dreapta = { tip: 'L' };
  }
  const varfuri = [...c.varfuri];
  varfuri[i] = { ...a, s: stanga };
  varfuri.splice(i + 1, 0, { p, s: dreapta });
  return { ...c, varfuri };
}

/**
 * Nodul `i` scos: capătul unei căi deschise oricând; altfel doar dintre două linii (segmentul nou e linia dintre vecini).
 * O cale închisă păstrează cel puțin 3 noduri, una deschisă cel puțin 2.
 */
export function stergeNod(c: FormaCale, i: number): FormaCale | MotivNod {
  const n = c.varfuri.length;
  if (i < 0 || i >= n) return c;
  if (n - 1 < (c.inchis ? 3 : 2)) return 'prea-putine';
  const varfuri = [...c.varfuri];
  if (!c.inchis && i === 0) return { ...c, varfuri: varfuri.slice(1) };
  if (!c.inchis && i === n - 1) {
    const rest = varfuri.slice(0, -1);
    const ultim = rest[rest.length - 1]!;
    rest[rest.length - 1] = { ...ultim, s: { tip: 'L' } };
    return { ...c, varfuri: rest };
  }
  const j = (i - 1 + n) % n;
  if (c.varfuri[j]!.s.tip !== 'L' || c.varfuri[i]!.s.tip !== 'L') return 'curbe';
  varfuri.splice(i, 1);
  return { ...c, varfuri };
}
