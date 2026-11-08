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

/** Felurile cuțitului din bara lui: cele care trag un cuțit (10.3↑f), apoi Foarfeca și Retează (10.3↑g). */
export const MODURI_CUTIT = ['linie', 'pen', 'liber', 'forma', 'foarfeca', 'reteaza'] as const;
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

/**
 * Selecția după o tăiere a cuțitului: rămâne cum era (fără nimic ales, tot nimic, deci tăieturile următoare au tot toate formele
 * foii); o formă aleasă tăiată e înlocuită de bucățile ei, iar una ștearsă iese.
 */
export function selectieDupa(selectie: readonly string[], degrupate: ReadonlyArray<{ readonly instanta: { readonly id: string }; readonly parti: ReadonlyArray<{ readonly instanta: { readonly id: string } }> }>, sterse: readonly string[]): string[] {
  const inlocuite = new Map(degrupate.map((x) => [x.instanta.id, x.parti.map((p) => p.instanta.id)]));
  const plecate = new Set(sterse);
  return selectie.flatMap((id) => (plecate.has(id) ? [] : inlocuite.get(id) ?? [id]));
}

/** Un contur al formelor de tăiat, ca polilinie, cu instanța lui și lungimea parcursă până la fiecare punct (Retează). */
export type ConturAproximat = Polilinie & { readonly instanta: string; readonly s: readonly number[]; readonly lungime: number };

/** Conturul aproximat, cu lungimile cumulate (închis: lungimea include latura de închidere). */
export function conturAproximat(puncte: readonly P[], inchis: boolean, instanta: string): ConturAproximat {
  const s: number[] = [0];
  for (let i = 1; i < puncte.length; i++) s.push((s[i - 1] as number) + Math.hypot((puncte[i] as P).x - (puncte[i - 1] as P).x, (puncte[i] as P).y - (puncte[i - 1] as P).y));
  const ultim = s[s.length - 1] ?? 0;
  const prim = puncte[0], cap = puncte[puncte.length - 1];
  const lungime = inchis && prim && cap ? ultim + Math.hypot(prim.x - cap.x, prim.y - cap.y) : ultim;
  return { puncte, inchis, cutie: cutiePuncte(puncte), instanta, s, lungime };
}

/** Segmentul `j` al conturului (pe unul închis, ultimul se întoarce la primul punct). */
const seg = (f: ConturAproximat, j: number): readonly [P, P] => [f.puncte[j] as P, f.puncte[(j + 1) % f.puncte.length] as P];
const nSeg = (f: ConturAproximat): number => (f.inchis ? f.puncte.length : f.puncte.length - 1);

/**
 * Locurile comune ale fiecărui contur cu celelalte (lungimi pe el, sortate), aproximate segment cu segment, ca bucata de sub
 * maus la Retează; null peste `plafon` perechi de segmente cercetate (atunci se vede doar clicul, iar tăierea e tot exactă).
 * Cu `parteneri`, un loc se scrie pe un contur doar când celălalt e al unei forme-partener sau al aceleiași forme, ca la
 * tăiere: partenerii sunt formele alese, iar forma de sub clic, chiar nealeasă, își are locurile cu ele.
 */
export function locuriComune(forme: readonly ConturAproximat[], plafon = 4_000_000, parteneri?: ReadonlySet<string>): number[][] | null {
  const rez: number[][] = forme.map(() => []);
  let perechi = 0;
  for (let i = 0; i < forme.length; i++) {
    const a = forme[i] as ConturAproximat;
    for (let j = i + 1; j < forme.length; j++) {
      const b = forme[j] as ConturAproximat;
      const aceeasi = a.instanta === b.instanta;
      const peA = !parteneri || aceeasi || parteneri.has(b.instanta), peB = !parteneri || aceeasi || parteneri.has(a.instanta);
      if (!peA && !peB) continue;
      if (a.cutie.minX > b.cutie.maxX || b.cutie.minX > a.cutie.maxX || a.cutie.minY > b.cutie.maxY || b.cutie.minY > a.cutie.maxY) continue;
      perechi += nSeg(a) * nSeg(b);
      if (perechi > plafon) return null;
      for (let p = 0; p < nSeg(a); p++) {
        const [a0, a1] = seg(a, p);
        for (let q = 0; q < nSeg(b); q++) {
          const [b0, b1] = seg(b, q);
          const rx = a1.x - a0.x, ry = a1.y - a0.y, sx = b1.x - b0.x, sy = b1.y - b0.y;
          const den = rx * sy - ry * sx;
          if (Math.abs(den) < 1e-15) continue;
          const t = ((b0.x - a0.x) * sy - (b0.y - a0.y) * sx) / den, u = ((b0.x - a0.x) * ry - (b0.y - a0.y) * rx) / den;
          if (t < 0 || t > 1 || u < 0 || u > 1) continue;
          if (peA) (rez[i] as number[]).push((a.s[p] as number) + t * Math.hypot(rx, ry));
          if (peB) (rez[j] as number[]).push((b.s[q] as number) + u * Math.hypot(sx, sy));
        }
      }
    }
  }
  for (const l of rez) l.sort((x, y) => x - y);
  return rez;
}

/**
 * Bucata de sub punct (Retează): conturul cel mai apropiat, la cel mult `tol` mm, și capetele bucății (lungimi pe el), între cele
 * mai apropiate locuri comune; fără ele (un contur închis cu mai puțin de două, unul deschis fără niciunul), tot conturul.
 */
export function bucataSub(forme: readonly ConturAproximat[], locuri: readonly (readonly number[])[], q: P, tol: number): { readonly i: number; readonly de: number; readonly pana: number; readonly tot: boolean } | null {
  let cel: { i: number; s: number; d: number } | null = null;
  forme.forEach((f, i) => {
    const k = f.cutie;
    if (q.x < k.minX - tol || q.x > k.maxX + tol || q.y < k.minY - tol || q.y > k.maxY + tol) return;
    for (let j = 0; j < nSeg(f); j++) {
      const [a, b] = seg(f, j);
      const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
      const t = l2 > 0 ? Math.max(0, Math.min(1, ((q.x - a.x) * dx + (q.y - a.y) * dy) / l2)) : 0;
      const d = Math.hypot(a.x + dx * t - q.x, a.y + dy * t - q.y);
      if (d <= tol && (!cel || d < cel.d)) cel = { i, s: (f.s[j] as number) + t * Math.sqrt(l2), d };
    }
  });
  if (!cel) return null;
  const { i, s } = cel as { i: number; s: number; d: number };
  const f = forme[i] as ConturAproximat, l = locuri[i] ?? [];
  if (f.inchis) {
    if (l.length < 2) return { i, de: 0, pana: f.lungime, tot: true };
    const dupa = l.find((x) => x > s);
    const inainte = [...l].reverse().find((x) => x <= s);
    return { i, de: inainte ?? (l[l.length - 1] as number), pana: dupa ?? (l[0] as number), tot: false };
  }
  const interior = l.filter((x) => x > 1e-9 && x < f.lungime - 1e-9);
  const de = [...interior].reverse().find((x) => x <= s) ?? 0;
  const pana = interior.find((x) => x > s) ?? f.lungime;
  return { i, de, pana, tot: interior.length === 0 };
}

/** Punctul conturului la lungimea `s` (pe unul închis, latura de închidere e ultima). */
function punctLa(f: ConturAproximat, s: number): P {
  const n = nSeg(f);
  for (let j = 0; j < n; j++) {
    const s0 = f.s[j] as number, s1 = j + 1 < f.s.length ? (f.s[j + 1] as number) : f.lungime;
    if (s <= s1 || j === n - 1) {
      const [a, b] = seg(f, j);
      const t = s1 > s0 ? Math.max(0, Math.min(1, (s - s0) / (s1 - s0))) : 0;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
  }
  return f.puncte[0] as P;
}

/** Punctele conturului între două lungimi, pentru marcaj (pe un contur închis, `pana` < `de` trece peste capăt). */
export function subPolilinie(f: ConturAproximat, de: number, pana: number): P[] {
  const rez: P[] = [punctLa(f, de)];
  const n = nSeg(f);
  const varfLa = (j: number): number => (j < f.s.length ? (f.s[j] as number) : f.lungime);
  if (pana > de || !f.inchis) {
    for (let j = 1; j <= n; j++) { const sj = varfLa(j); if (sj > de && sj < pana) rez.push(f.puncte[j % f.puncte.length] as P); }
  } else {
    // Vârful 0 intră o singură dată, la trecerea peste capăt (lungimea întreagă), nu și ca început.
    for (let j = 1; j <= n; j++) { const sj = varfLa(j); if (sj > de) rez.push(f.puncte[j % f.puncte.length] as P); }
    for (let j = 1; j < n; j++) { const sj = f.s[j] as number; if (sj < pana) rez.push(f.puncte[j] as P); }
  }
  rez.push(punctLa(f, pana));
  return rez;
}
