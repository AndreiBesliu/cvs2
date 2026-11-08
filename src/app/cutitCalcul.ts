/**
 * Unealta Cuțit (ADR 0181 §1; felia 10.3↑f), partea pură: urma gestului (Linie, Liber), calea cuțitului din ea în mm ai
 * foii, calea Pen-ului mutată pe foaie, formele de tăiat (cele alese, sau, fără alegere, toate de pe foaie; răspunsul 2a),
 * fără formele-cuțit, și locurile aproximative unde taie, de arătat cât tragi. Tăierea exactă e a workerului, la capătul
 * gestului (răspunsul 3a).
 */
import { CUTIE_GOALA, uneste, type Cutie } from '../geom/cutie.ts';
import type { Document, VarfDoc } from '../model/document.ts';
import type { FormaCale } from '../model/noduri.ts';
import type { Prelungire } from '../model/taiere.ts';
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

// ——— Opțiunile tăierii, cât tragi (ADR 0181 §2; felia 10.3↑h) ———

/** O formă de tăiat ca regiune: contururile ei închise, ca polilinii, cu cutia lor (prelungirea și partea ștearsă, arătate). */
export type RegiuneAproximativa = { readonly instanta: string; readonly contururi: readonly Polilinie[]; readonly cutie: Cutie };

/** Punctul q e în regiune (par-impar, raza spre +x)? */
export function inRegiuneAproximativa(q: P, r: RegiuneAproximativa): boolean {
  if (q.x < r.cutie.minX || q.x > r.cutie.maxX || q.y < r.cutie.minY || q.y > r.cutie.maxY) return false;
  let in_ = false;
  for (const c of r.contururi) {
    const p = c.puncte;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
      const a = p[i] as P, b = p[j] as P;
      if ((a.y > q.y) !== (b.y > q.y) && q.x < ((b.x - a.x) * (q.y - a.y)) / (b.y - a.y) + a.x) in_ = !in_;
    }
  }
  return in_;
}

/** Cât merge raza q + s·w (w unitară, s > 0) până la primul contur al regiunii, sau null. */
function primaIesire(q: P, w: P, r: RegiuneAproximativa): number | null {
  let best = Infinity;
  for (const c of r.contururi) {
    const p = c.puncte, n = p.length;
    for (let i = 0; i < n; i++) {
      const a = p[i] as P, b = p[(i + 1) % n] as P;
      const ex = b.x - a.x, ey = b.y - a.y;
      const den = w.x * ey - w.y * ex;
      if (Math.abs(den) < 1e-15) continue;
      const s = ((a.x - q.x) * ey - (a.y - q.y) * ex) / den;
      const t = ((a.x - q.x) * w.y - (a.y - q.y) * w.x) / den;
      if (s > 1e-9 && t >= 0 && t <= 1 && s < best) best = s;
    }
  }
  return best < Infinity ? best : null;
}

/** Direcția (unitară) în care iese polilinia din capătul ei: 0, din început (înapoi); 1, din sfârșit. Null: un singur punct. */
function directieCapat(p: readonly P[], capat: 0 | 1): P | null {
  const n = p.length;
  const c = (capat === 0 ? p[0] : p[n - 1]) as P;
  for (let k = 1; k < n; k++) {
    const q = (capat === 0 ? p[k] : p[n - 1 - k]) as P;
    const l = Math.hypot(c.x - q.x, c.y - q.y);
    if (l > 1e-9) return { x: (c.x - q.x) / l, y: (c.y - q.y) / l };
  }
  return null;
}

/**
 * Prelungirile capetelor (ADR 0181 §2), aproximative, pentru urma de pe pânză: de la capăt spre afară, pe direcția ultimei
 * laturi; `forma`, cât capătul stă în regiunea unei forme de tăiat (până la cea mai depărtată dintre primele ieșiri, apoi mai
 * departe, dacă intră în alta); `intreaga`, dincolo de cutia dată (1 mm peste). Tăierea exactă, pe tangentă, e a workerului.
 */
export function prelungiriAproximative(puncte: readonly P[], mod: Prelungire, regiuni: readonly RegiuneAproximativa[], cutie: Cutie): Array<readonly [P, P]> {
  if (mod === 'nu' || puncte.length < 2) return [];
  const rez: Array<readonly [P, P]> = [];
  for (const capat of [0, 1] as const) {
    const P0 = (capat === 0 ? puncte[0] : puncte[puncte.length - 1]) as P;
    const w = directieCapat(puncte, capat);
    if (!w) continue;
    let s = 0;
    if (mod === 'intreaga') {
      if (cutie.maxX >= cutie.minX) for (const x of [cutie.minX, cutie.maxX]) for (const y of [cutie.minY, cutie.maxY]) s = Math.max(s, (x - P0.x) * w.x + (y - P0.y) * w.y);
      if (s > 0) s += 1;
    } else {
      for (let pas = 0; pas < 100; pas++) {
        const q = { x: P0.x + w.x * s, y: P0.y + w.y * s };
        let urm = 0;
        for (const r of regiuni) {
          if (!inRegiuneAproximativa(q, r)) continue;
          const e = primaIesire(q, w, r);
          if (e !== null && e > urm) urm = e;
        }
        if (!(urm > 0)) break;
        s += urm + 1e-3;
      }
    }
    if (s > 0) rez.push([P0, { x: P0.x + w.x * s, y: P0.y + w.y * s }]);
  }
  return rez;
}

/** Calea cu prelungirile ei (cele de la `prelungiriAproximative`): punctul de la capătul fiecăreia, pus la capătul lui. */
export function cuPrelungiri(puncte: readonly P[], prelungiri: ReadonlyArray<readonly [P, P]>): P[] {
  const rez = [...puncte];
  const P0 = puncte[0], Pn = puncte[puncte.length - 1];
  for (const [de, pana] of prelungiri) {
    if (de === P0) rez.unshift(pana);
    else if (de === Pn) rez.push(pana);
  }
  return rez;
}

/**
 * Partea care pleacă cu „Păstrează” (ADR 0181 §2), ca poligoane de estompat (par-impar) peste regiunile atinse: la un cuțit
 * deschis, de partea ștearsă a căii, cu capetele duse pe direcția lor la `departe` mm și închisă departe, de partea aceea; la
 * unul închis, înăuntrul lui (`dreapta`: rămâne ce e în afară) sau tot ce e în afara lui (`stanga`).
 */
export function poligonSters(puncte: readonly P[], inchis: boolean, pastreaza: 'stanga' | 'dreapta', departe: number): P[][] | null {
  if (puncte.length < 2) return null;
  if (inchis) {
    if (pastreaza === 'dreapta') return [[...puncte]];
    const k = cutiePuncte(puncte);
    const cx = (k.minX + k.maxX) / 2, cy = (k.minY + k.maxY) / 2;
    return [[{ x: cx - departe, y: cy - departe }, { x: cx + departe, y: cy - departe }, { x: cx + departe, y: cy + departe }, { x: cx - departe, y: cy + departe }], [...puncte]];
  }
  const w0 = directieCapat(puncte, 0), w1 = directieCapat(puncte, 1);
  if (!w0 || !w1) return null;
  const P0 = puncte[0] as P, Pn = puncte[puncte.length - 1] as P;
  const A = { x: P0.x + w0.x * departe, y: P0.y + w0.y * departe }, B = { x: Pn.x + w1.x * departe, y: Pn.y + w1.y * departe };
  const l = Math.hypot(B.x - A.x, B.y - A.y);
  if (!(l > 0)) return null;
  const u = { x: (B.x - A.x) / l, y: (B.y - A.y) / l };
  // Se păstrează stânga: pleacă dreapta sensului (normala din dreapta lui u); și invers.
  const n = pastreaza === 'stanga' ? { x: u.y, y: -u.x } : { x: -u.y, y: u.x };
  return [[A, ...puncte, B, { x: B.x + n.x * departe, y: B.y + n.y * departe }, { x: A.x + n.x * departe, y: A.y + n.y * departe }]];
}

/** Regiunile pe care cuțitul le împarte: cel puțin două treceri prin contururile lor (sau, la unul închis, stă tot în ea). */
export function regiuniAtinse(puncte: readonly P[], inchis: boolean, regiuni: readonly RegiuneAproximativa[]): RegiuneAproximativa[] {
  if (puncte.length < 2) return [];
  const k = cutiePuncte(puncte);
  const m = inchis ? puncte.length : puncte.length - 1;
  return regiuni.filter((r) => {
    if (k.minX > r.cutie.maxX || r.cutie.minX > k.maxX || k.minY > r.cutie.maxY || r.cutie.minY > k.maxY) return inchis && inRegiuneAproximativa(puncte[0] as P, r);
    let n = 0;
    for (let i = 0; i < m && n < 2; i++) {
      const a = puncte[i] as P, b = puncte[(i + 1) % puncte.length] as P;
      for (const c of r.contururi) {
        const p = c.puncte;
        for (let j = 0; j < p.length; j++) if (trecere(a, b, p[j] as P, p[(j + 1) % p.length] as P)) n++;
      }
    }
    return n >= 2 || (inchis && n === 0 && inRegiuneAproximativa(puncte[0] as P, r));
  });
}
