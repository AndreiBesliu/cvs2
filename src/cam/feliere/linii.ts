/**
 * Liniile felierii (ADR 0191): căile de extrudat, aplatizarea contururilor, liniile paralele tăiate de o regiune, lanțurile lor
 * (în zigzag sau monotone, ca OrcaSlicer), ordinea căilor și tăierea unei polilinii oarecare de o regiune (pentru modelele de
 * umplere care nu sunt linii drepte, felia 3.6k). Folosite de pereți și de modele (`straturi.ts`, `modele.ts`).
 */
import { cerculArcului, numarSegmente, segment, type Contur } from '../../geom/conturBaza.ts';

export type Rol = 'exterior' | 'interior' | 'plin' | 'sus' | 'rar' | 'brim' | 'calcare' | 'fusta';
/**
 * O cale de extrudat: punctele (x, y, x, y, …), închisă sau nu, cu lățimea liniei și rolul. Pereții au și grupul (conturul de
 * la care pornesc: exteriorul unei insule sau un gol al ei) și adâncimea (0 = peretele exterior), pentru cusătură; o cale cu
 * debitul ei (`mm3`, mm³ pe mm) îl folosește în locul secțiunii liniei (călcarea).
 */
export type Cale = {
  readonly rol: Rol; readonly p: Float64Array; readonly inchisa: boolean; readonly w: number;
  readonly grup?: number; readonly adancime?: number; readonly gaura?: boolean; readonly mm3?: number;
};

/** Săgeata coardelor cu care se aplatizează arcele (mm): rezoluția profilului K1C (0,012). */
export const SAGEATA = 0.012;

/** Punctele unui contur închis, aplatizat (fără punctul de închidere repetat). */
export function puncte(c: Contur): number[] {
  const r: number[] = [];
  const n = numarSegmente(c);
  for (let i = 0; i < n; i++) {
    const { a, b, s } = segment(c, i);
    if (i === 0) r.push(a.x, a.y);
    if (s.tip === 'A') {
      const { centru, raza, start, baleiaj } = cerculArcului(a, b, s.bulge);
      const pasU = raza > SAGEATA ? 2 * Math.acos(1 - SAGEATA / raza) : Math.PI / 2;
      const k = Math.max(1, Math.ceil(Math.abs(baleiaj) / pasU));
      for (let j = 1; j < k; j++) { const u = start + (baleiaj * j) / k; r.push(centru.x + raza * Math.cos(u), centru.y + raza * Math.sin(u)); }
    }
    if (!(c.inchis && i === n - 1)) r.push(b.x, b.y);
  }
  return r;
}

/** Aria (cu semn) a unui poligon dat prin puncte. */
export function arie(p: ArrayLike<number>): number {
  let s = 0;
  for (let i = 0, n = p.length; i < n; i += 2) { const j = (i + 2) % n; s += p[i]! * p[j + 1]! - p[j]! * p[i + 1]!; }
  return s / 2;
}

/**
 * Liniile paralele (unghiul în grade, pasul s) ale poligoanelor (par-impar), pe pozițiile aliniate la pat, (k + faza) · s:
 * intervalele pe linie. Faza 0,5 (implicită) ține liniile între pozițiile întregi; 0 le trece prin originea patului (familiile
 * triunghiurilor se întâlnesc atunci în aceleași noduri).
 */
export function intervale(pol: readonly ArrayLike<number>[], unghi: number, s: number, faza = 0.5): Map<number, [number, number][]> {
  const u = (unghi * Math.PI) / 180, co = Math.cos(u), si = Math.sin(u);
  const rot = pol.map((p) => { const q = new Float64Array(p.length); for (let i = 0; i < p.length; i += 2) { q[i] = p[i]! * co + p[i + 1]! * si; q[i + 1] = -p[i]! * si + p[i + 1]! * co; } return q; });
  let y0 = Infinity, y1 = -Infinity;
  for (const q of rot) for (let i = 1; i < q.length; i += 2) { y0 = Math.min(y0, q[i]!); y1 = Math.max(y1, q[i]!); }
  const rez = new Map<number, [number, number][]>();
  for (let k = Math.ceil(y0 / s - faza); (k + faza) * s < y1; k++) {
    const y = (k + faza) * s, xs: number[] = [];
    for (const q of rot) {
      for (let i = 0, n = q.length; i < n; i += 2) {
        const j = (i + 2) % n, ya = q[i + 1]!, yb = q[j + 1]!;
        if ((ya > y) !== (yb > y)) xs.push(q[i]! + ((y - ya) * (q[j]! - q[i]!)) / (yb - ya));
      }
    }
    xs.sort((a, b) => a - b);
    const l: [number, number][] = [];
    for (let i = 0; i + 1 < xs.length; i += 2) if (xs[i + 1]! - xs[i]! > 1e-6) l.push([xs[i]!, xs[i + 1]!]);
    if (l.length > 0) rez.set(k, l);
  }
  return rez;
}

/** Punctul (x în reperul liniilor, linia k) în coordonatele patului. */
const inPat = (x: number, k: number, s: number, faza: number, co: number, si: number, out: number[]): void => {
  const y = (k + faza) * s;
  out.push(x * co - y * si, x * si + y * co);
};

/**
 * Lanțurile în zigzag ale intervalelor: pe linii consecutive, intervalele care se suprapun se leagă; o legătură se extrudă
 * dacă e scurtă (|Δx| ≤ legaturaMax, în reperul liniilor), altfel lanțul se rupe. Căile, în coordonatele patului.
 */
export function zigzag(iv: Map<number, [number, number][]>, unghi: number, s: number, legaturaMax: number, rol: Rol, w: number, faza = 0.5): Cale[] {
  const u = (unghi * Math.PI) / 180, co = Math.cos(u), si = Math.sin(u);
  type Lant = { k: number; a: number; b: number; pts: number[]; dreapta: boolean };
  const deschise: Lant[] = [], gata: number[][] = [];
  const pune = (l: Lant, x: number, k: number): void => { inPat(x, k, s, faza, co, si, l.pts); };
  const chei = [...iv.keys()].sort((a, b) => a - b);
  for (const k of chei) {
    const folosite = new Set<Lant>();
    for (const [a, b] of iv.get(k)!) {
      const l = deschise.find((x) => !folosite.has(x) && x.k === k - 1 && x.a < b && a < x.b);
      if (l) {
        const capat = l.dreapta ? l.b : l.a, start = l.dreapta ? b : a;
        if (Math.abs(start - capat) > legaturaMax) { gata.push(l.pts); l.pts = []; }
        l.dreapta = !l.dreapta;
        pune(l, l.dreapta ? a : b, k);
        pune(l, l.dreapta ? b : a, k);
        l.k = k; l.a = a; l.b = b;
        folosite.add(l);
      } else {
        const n: Lant = { k, a, b, pts: [], dreapta: true };
        pune(n, a, k); pune(n, b, k);
        deschise.push(n);
        folosite.add(n);
      }
    }
    for (let i = deschise.length - 1; i >= 0; i--) if (deschise[i]!.k !== k) { gata.push(deschise[i]!.pts); deschise.splice(i, 1); }
  }
  for (const l of deschise) gata.push(l.pts);
  return gata.filter((p) => p.length >= 4).map((p) => ({ rol, p: Float64Array.from(p), inchisa: false, w }));
}

/**
 * Umplerea monotonă (`monotonic`, `monotonicline` în OrcaSlicer): liniile, împărțite în regiuni în care fiecare interval are
 * exact un vecin pe linia de dinainte și pe cea de după; regiunile, de la prima linie spre ultima (o linie se imprimă mereu după
 * vecina ei de dinainte); în regiune, în zigzag. Cu `legaturi`, capetele alăturate se leagă printr-o bucată extrudată (scurtă,
 * cel mult `legaturaMax` de-a lungul liniilor); fără ele, fiecare linie e o cale (doar deplasări între ele).
 */
export function monoton(iv: Map<number, [number, number][]>, unghi: number, s: number, legaturi: boolean, legaturaMax: number, rol: Rol, w: number, faza = 0.5): Cale[] {
  const u = (unghi * Math.PI) / 180, co = Math.cos(u), si = Math.sin(u);
  const chei = [...iv.keys()].sort((a, b) => a - b);
  const atinge = (x: [number, number], y: [number, number]): boolean => x[0] < y[1] && y[0] < x[1];
  type Regiune = { k0: number; linii: [number, number][]; ultima: [number, number]; k: number };
  const regiuni: Regiune[] = [];
  let deschise: Regiune[] = [];
  let prec: [number, number][] = [];
  for (const k of chei) {
    const acum = iv.get(k)!;
    const noi: Regiune[] = [];
    for (const x of acum) {
      // Continuă regiunea doar dacă legătura e unu-la-unu (intervalul de dinainte nu mai atinge altul de acum, și invers).
      const vecini = prec.filter((y) => atinge(x, y));
      const r = vecini.length === 1 ? deschise.find((d) => d.k === k - 1 && d.ultima === vecini[0]) : undefined;
      if (r && acum.filter((y) => atinge(y, vecini[0]!)).length === 1) { r.linii.push(x); r.ultima = x; r.k = k; noi.push(r); } else {
        const n: Regiune = { k0: k, linii: [x], ultima: x, k };
        regiuni.push(n); noi.push(n);
      }
    }
    deschise = noi; prec = acum;
  }
  regiuni.sort((a, b) => a.k0 - b.k0 || a.linii[0]![0] - b.linii[0]![0]);
  const rez: Cale[] = [];
  for (const r of regiuni) {
    let pts: number[] = [];
    let sus = true, capat = 0;
    r.linii.forEach(([a, b], j) => {
      const k = r.k0 + j;
      const [x0, x1] = sus ? [a, b] : [b, a];
      if (pts.length > 0 && (!legaturi || Math.abs(x0 - capat) > legaturaMax)) { rez.push({ rol, p: Float64Array.from(pts), inchisa: false, w }); pts = []; }
      inPat(x0, k, s, faza, co, si, pts); inPat(x1, k, s, faza, co, si, pts);
      capat = x1; sus = !sus;
    });
    if (pts.length >= 4) rez.push({ rol, p: Float64Array.from(pts), inchisa: false, w });
  }
  return rez;
}

/** Ordinea căilor: cea mai apropiată de poziția curentă, întoarsă dacă celălalt capăt e mai aproape (buclele, doar ordonate). */
export function ordoneaza(cai: readonly Cale[], x: number, y: number): { cai: Cale[]; x: number; y: number } {
  const rest = [...cai], rez: Cale[] = [];
  while (rest.length > 0) {
    let best = 0, bd = Infinity, inv = false;
    rest.forEach((c, i) => {
      const n = c.p.length;
      const d0 = (c.p[0]! - x) ** 2 + (c.p[1]! - y) ** 2;
      if (d0 < bd) { bd = d0; best = i; inv = false; }
      if (!c.inchisa) { const d1 = (c.p[n - 2]! - x) ** 2 + (c.p[n - 1]! - y) ** 2; if (d1 < bd) { bd = d1; best = i; inv = true; } }
    });
    let c = rest.splice(best, 1)[0]!;
    if (inv) { const q = new Float64Array(c.p.length); for (let i = 0; i < q.length; i += 2) { q[i] = c.p[c.p.length - 2 - i]!; q[i + 1] = c.p[c.p.length - 1 - i]!; } c = { ...c, p: q }; }
    rez.push(c);
    const n = c.p.length;
    [x, y] = c.inchisa ? [c.p[0]!, c.p[1]!] : [c.p[n - 2]!, c.p[n - 1]!];
  }
  return { cai: rez, x, y };
}

/** Punctul e în poligoane, par-impar. */
export function inPoligoane(x: number, y: number, pol: readonly ArrayLike<number>[]): boolean {
  let in_ = false;
  for (const p of pol) {
    for (let i = 0, n = p.length; i < n; i += 2) {
      const j = (i + 2) % n, ya = p[i + 1]!, yb = p[j + 1]!;
      if ((ya > y) !== (yb > y) && x < p[i]! + ((y - ya) * (p[j]! - p[i]!)) / (yb - ya)) in_ = !in_;
    }
  }
  return in_;
}

/**
 * Bucățile unei polilinii (x, y, …) care stau în poligoane (par-impar): fiecare segment se taie la laturile pe care le
 * întâlnește (căutate într-o grilă a laturilor), iar o bucată ține cât rămâne înăuntru. Bucățile, în ordinea poliliniei.
 */
export function taiePolilinie(p: ArrayLike<number>, pol: readonly ArrayLike<number>[]): number[][] {
  const n = p.length / 2;
  if (n < 2) return [];
  // Grila laturilor.
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, laturi = 0;
  for (const q of pol) { laturi += q.length / 2; for (let i = 0; i < q.length; i += 2) { x0 = Math.min(x0, q[i]!); x1 = Math.max(x1, q[i]!); y0 = Math.min(y0, q[i + 1]!); y1 = Math.max(y1, q[i + 1]!); } }
  if (laturi === 0) return [];
  const celule = Math.max(1, Math.min(128, Math.ceil(Math.sqrt(laturi) * 2)));
  const cw = Math.max((x1 - x0) / celule, 1e-6), ch = Math.max((y1 - y0) / celule, 1e-6);
  const grila: number[][] = Array.from({ length: celule * celule }, () => []);
  const lat: number[] = [];
  const cx = (x: number): number => Math.min(celule - 1, Math.max(0, Math.floor((x - x0) / cw)));
  const cy = (y: number): number => Math.min(celule - 1, Math.max(0, Math.floor((y - y0) / ch)));
  for (const q of pol) {
    for (let i = 0, m = q.length; i < m; i += 2) {
      const j = (i + 2) % m, id = lat.length / 4;
      lat.push(q[i]!, q[i + 1]!, q[j]!, q[j + 1]!);
      for (let a = cx(Math.min(q[i]!, q[j]!)); a <= cx(Math.max(q[i]!, q[j]!)); a++) for (let b = cy(Math.min(q[i + 1]!, q[j + 1]!)); b <= cy(Math.max(q[i + 1]!, q[j + 1]!)); b++) grila[b * celule + a]!.push(id);
    }
  }
  const vazut = new Int32Array(lat.length / 4).fill(-1);
  const rez: number[][] = [];
  let cur: number[] | null = null;
  let inauntru = inPoligoane(p[0]!, p[1]!, pol);
  if (inauntru) cur = [p[0]!, p[1]!];
  for (let s = 0; s + 1 < n; s++) {
    const ax = p[2 * s]!, ay = p[2 * s + 1]!, bx = p[2 * s + 2]!, by = p[2 * s + 3]!;
    const dx = bx - ax, dy = by - ay;
    const ts: number[] = [];
    if (!(Math.max(ax, bx) < x0 || Math.min(ax, bx) > x1 || Math.max(ay, by) < y0 || Math.min(ay, by) > y1)) {
      for (let a = cx(Math.min(ax, bx)); a <= cx(Math.max(ax, bx)); a++) {
        for (let b = cy(Math.min(ay, by)); b <= cy(Math.max(ay, by)); b++) {
          for (const id of grila[b * celule + a]!) {
            if (vazut[id] === s) continue;
            vazut[id] = s;
            const ex = lat[4 * id]!, ey = lat[4 * id + 1]!, fx = lat[4 * id + 2]! - ex, fy = lat[4 * id + 3]! - ey;
            const d = dx * fy - dy * fx;
            if (Math.abs(d) < 1e-14) continue;
            const t = ((ex - ax) * fy - (ey - ay) * fx) / d, u = ((ex - ax) * dy - (ey - ay) * dx) / d;
            // Latura e semideschisă (u în [0, 1)), ca un vârf comun să nu se numere de două ori.
            if (t > 0 && t <= 1 && u >= 0 && u < 1) ts.push(t);
          }
        }
      }
    }
    ts.sort((a, b) => a - b);
    for (const t of ts) {
      const x = ax + dx * t, y = ay + dy * t;
      if (inauntru) { cur!.push(x, y); if (cur!.length >= 4) rez.push(cur!); cur = null; } else cur = [x, y];
      inauntru = !inauntru;
    }
    if (inauntru) cur!.push(bx, by);
  }
  if (inauntru && cur && cur.length >= 4) rez.push(cur);
  // Bucățile de lungime zero (o atingere a unei laturi) nu se extrudă.
  return rez.filter((q) => { let L = 0; for (let i = 2; i < q.length; i += 2) L += Math.hypot(q[i]! - q[i - 2]!, q[i + 1]! - q[i - 1]!); return L > 1e-6; });
}

/** Lungimea unei polilinii (deschise). */
export function lungime(p: ArrayLike<number>): number {
  let L = 0;
  for (let i = 2; i < p.length; i += 2) L += Math.hypot(p[i]! - p[i - 2]!, p[i + 1]! - p[i - 1]!);
  return L;
}

/** Anvelopa convexă a punctelor (lanțul monoton al lui Andrew): pentru `POLYGON` din `EXCLUDE_OBJECT_DEFINE` și pentru fustă. */
export function anvelopa(p: readonly ArrayLike<number>[]): [number, number][] {
  const pts: [number, number][] = [];
  for (const q of p) for (let i = 0; i < q.length; i += 2) pts.push([q[i]!, q[i + 1]!]);
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length < 3) return pts;
  const x = (o: [number, number], a: [number, number], b: [number, number]): number => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const jos: [number, number][] = [], sus: [number, number][] = [];
  for (const q of pts) { while (jos.length >= 2 && x(jos[jos.length - 2]!, jos[jos.length - 1]!, q) <= 0) jos.pop(); jos.push(q); }
  for (let i = pts.length - 1; i >= 0; i--) { const q = pts[i]!; while (sus.length >= 2 && x(sus[sus.length - 2]!, sus[sus.length - 1]!, q) <= 0) sus.pop(); sus.push(q); }
  return [...jos.slice(0, -1), ...sus.slice(0, -1)];
}
