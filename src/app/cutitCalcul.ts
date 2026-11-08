/**
 * Unealta Cuțit (ADR 0181 §1; felia 10.3↑f), partea pură: urma gestului (Linie, Liber), calea cuțitului din ea în mm ai
 * foii, calea Pen-ului mutată pe foaie, formele de tăiat (cele alese, sau, fără alegere, toate de pe foaie; răspunsul 2a),
 * fără formele-cuțit, și locurile aproximative unde taie, de arătat cât tragi. Tăierea exactă e a workerului, la capătul
 * gestului (răspunsul 3a).
 */
import { CUTIE_GOALA, uneste, type Cutie } from '../geom/cutie.ts';
import type { Document, VarfDoc } from '../model/document.ts';
import type { FormaCale } from '../model/noduri.ts';
import type { FormaDesenata } from './desenCalcul.ts';

/** Felurile cuțitului din bara lui (Foarfeca și Retează vin în 10.3↑g). */
export const MODURI_CUTIT = ['linie', 'pen', 'liber', 'forma'] as const;
export type ModCutit = (typeof MODURI_CUTIT)[number];
export const esteModCutit = (x: unknown): x is ModCutit => typeof x === 'string' && (MODURI_CUTIT as readonly string[]).includes(x);

type P = { readonly x: number; readonly y: number };

/** Urma mâinii libere: punctul nou intră doar la cel puțin `pas` mm de ultimul (un pixel al vederii), ca urma să nu crească degeaba. */
export function adaugaLaUrma(urma: readonly P[], q: P, pas: number): P[] {
  const u = urma[urma.length - 1];
  if (u && Math.hypot(q.x - u.x, q.y - u.y) < pas) return urma as P[];
  return [...urma, { x: q.x, y: q.y }];
}

/** Lungimea urmei, în mm. */
export function lungimeUrma(urma: readonly P[]): number {
  let s = 0;
  for (let i = 1; i < urma.length; i++) s += Math.hypot((urma[i] as P).x - (urma[i - 1] as P).x, (urma[i] as P).y - (urma[i - 1] as P).y);
  return s;
}

/** Calea deschisă a cuțitului prin punctele urmei (linii), sau null dacă e mai scurtă decât `minim` mm. */
export function caleCutit(urma: readonly P[], minim: number): FormaCale | null {
  const v: VarfDoc[] = [];
  for (const q of urma) {
    const u = v[v.length - 1];
    if (u && u.p.x === q.x && u.p.y === q.y) continue;
    v.push({ p: { x: q.x, y: q.y }, s: { tip: 'L' } });
  }
  if (v.length < 2 || !(lungimeUrma(v.map((x) => x.p)) >= minim)) return null;
  return { tip: 'cale', inchis: false, varfuri: v };
}

/** Calea pusă cu Pen-ul (originea ei în primul nod), mutată în mm ai foii, cu mânerele. */
export function caleDinPen(f: FormaDesenata): FormaCale | null {
  if (f.forma.tip !== 'cale') return null;
  const m = (q: { readonly x: number; readonly y: number }): { x: number; y: number } => ({ x: q.x + f.x, y: q.y + f.y });
  const varfuri = f.forma.varfuri.map((v): VarfDoc => ({
    p: m(v.p),
    s: v.s.tip === 'C' ? { tip: 'C', c1: m(v.s.c1), c2: m(v.s.c2) } : v.s.tip === 'A' ? { tip: 'A', bulge: v.s.bulge } : { tip: 'L' },
  }));
  return { tip: 'cale', inchis: f.forma.inchis, varfuri };
}

/**
 * Formele de tăiat (răspunsul 2a): cele alese, fără formele-cuțit; fără nimic ales, toate instanțele foii, fără formele-cuțit.
 */
export function tinteCutit(doc: Document, selectie: readonly string[], cutit: readonly string[], indexFoaie = 0): string[] {
  const k = new Set(cutit);
  const ids = selectie.length > 0 ? selectie : (doc.foi[indexFoaie]?.instante ?? []).map((i) => i.id);
  return ids.filter((id) => !k.has(id));
}

/** O formă de tăiat ca polilinie (contur aproximat), cu cutia ei, pentru locurile arătate cât tragi. */
export type Polilinie = { readonly puncte: readonly P[]; readonly inchis: boolean; readonly cutie: Cutie };

/** Cutia unei liste de puncte. */
export function cutiePuncte(p: readonly P[]): Cutie {
  return p.reduce((u, q) => uneste(u, { minX: q.x, minY: q.y, maxX: q.x, maxY: q.y }), CUTIE_GOALA);
}

/** Locul unde segmentul ab trece segmentul cd (strict înăuntrul amândurora), sau null. */
function trecere(a: P, b: P, c: P, d: P): P | null {
  const rx = b.x - a.x, ry = b.y - a.y, sx = d.x - c.x, sy = d.y - c.y;
  const den = rx * sy - ry * sx;
  if (Math.abs(den) < 1e-15) return null;
  const t = ((c.x - a.x) * sy - (c.y - a.y) * sx) / den, u = ((c.x - a.x) * ry - (c.y - a.y) * rx) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? { x: a.x + t * rx, y: a.y + t * ry } : null;
}

/**
 * Locurile aproximative unde urma trece formele (segment cu segment, după cutii), cel mult `maxim`: doar de arătat. Locurile
 * exacte și refuzurile le dă workerul, la capătul gestului.
 */
export function locuriAproximative(urma: readonly P[], forme: readonly Polilinie[], maxim = 400): P[] {
  const rez: P[] = [];
  if (urma.length < 2) return rez;
  const cu = cutiePuncte(urma);
  for (const f of forme) {
    const k = f.cutie;
    if (k.minX > cu.maxX || k.maxX < cu.minX || k.minY > cu.maxY || k.maxY < cu.minY) continue;
    const n = f.puncte.length, m = f.inchis ? n : n - 1;
    for (let j = 0; j < m; j++) {
      const c = f.puncte[j] as P, d = f.puncte[(j + 1) % n] as P;
      if (Math.max(c.x, d.x) < cu.minX || Math.min(c.x, d.x) > cu.maxX || Math.max(c.y, d.y) < cu.minY || Math.min(c.y, d.y) > cu.maxY) continue;
      for (let i = 0; i + 1 < urma.length; i++) {
        const x = trecere(urma[i] as P, urma[i + 1] as P, c, d);
        if (x) {
          rez.push(x);
          if (rez.length >= maxim) return rez;
        }
      }
    }
  }
  return rez;
}
