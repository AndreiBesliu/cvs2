/**
 * Axa medială a unei regiuni (ADR 0090, `PLAN.md` T7, sonda s3): locul centrelor cercurilor care ating conturul în cel
 * puțin două puncte. Din ea iese V-carve-ul (`vcarve.ts`): pe axă, freza în V coboară la r / tan(θ/2).
 *
 * Calculul (candidatul (a) al sondei s3):
 * - conturul exact (linii, arce, cubice) se eșantionează la cel mult `pas` mm, cu punctele pe contur;
 * - triangularea Delaunay a eșantioanelor (`delaunator`), apoi **legalizarea pe stivă cu predicate robuste**
 *   (`robust-predicates`): `delaunator` lasă tăcut triunghiuri ne-Delaunay pe rândurile lungi de puncte coliniare (s3: 0,49
 *   mm netăiat pe firmă); dacă legalizarea nu converge, aruncă (T7), nu dă o axă greșită;
 * - centrele cercurilor circumscrise din interiorul regiunii sunt nodurile axei; o muchie Delaunay între două eșantioane
 *   care nu sunt vecine pe contur dă muchia axei dintre cele două triunghiuri;
 * - colțurile convexe ale conturului intră ca noduri (raza 0), legate de cel mai apropiat nod de pe bisectoarea lor: altfel
 *   axa doar s-ar apropia de colț.
 * Raza din triangulare nu se folosește niciodată: o recalculează exact cine consumă axa (`indexContururi`).
 */
import Delaunator from 'delaunator';
import { incircle, orient2d } from 'robust-predicates';
import { cerculArcului, numarSegmente, segment, type Contur, type Punct, type Segment } from '../geom/conturBaza.ts';
import { distantaLaSegment, peArc, RIDICARE_RAZA, traversariSegment } from '../geom/distanta.ts';

/** Cel mai mare număr de eșantioane: peste el, regiunea e refuzată cu motiv (memoria și timpul triangulării). */
export const ESANTIOANE_MAXIME = 600_000;

// ── Indexul contururilor: distanța exactă și interiorul (par-impar), fără O(puncte × segmente) ──────────────────────────

type SegmentIndexat = { readonly a: Punct; readonly b: Punct; readonly s: Segment; readonly minX: number; readonly minY: number; readonly maxX: number; readonly maxY: number };

function cutieSegment(a: Punct, b: Punct, s: Segment): [number, number, number, number] {
  let minX = Math.min(a.x, b.x), minY = Math.min(a.y, b.y), maxX = Math.max(a.x, b.x), maxY = Math.max(a.y, b.y);
  if (s.tip === 'A') {
    const { centru, raza, start, baleiaj } = cerculArcului(a, b, s.bulge);
    for (const u of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      if (!peArc(u, start, baleiaj)) continue;
      const x = centru.x + raza * Math.cos(u), y = centru.y + raza * Math.sin(u);
      minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
  } else if (s.tip === 'C') {
    for (const q of [s.c1, s.c2]) { minX = Math.min(minX, q.x); minY = Math.min(minY, q.y); maxX = Math.max(maxX, q.x); maxY = Math.max(maxY, q.y); }
  }
  return [minX, minY, maxX, maxY];
}

export type IndexContur = {
  /** Distanța exactă de la p la contururi; cu `cautaPana`, caută întâi doar segmentele la cel mult atât (o margine sigură). */
  readonly distanta: (p: Punct, cautaPana?: number) => number;
  /** Regula par-impar peste toate contururile (aceeași rază ridicată ca `inRegiune`). */
  readonly inauntru: (p: Punct) => boolean;
};

/** Indexul segmentelor contururilor închise, pe o grilă uniformă (celulele și benzile pe Y, în CSR). */
export function indexContururi(contururi: readonly Contur[]): IndexContur {
  const segmente: SegmentIndexat[] = [];
  for (const c of contururi) {
    if (!c.inchis) continue;
    for (let i = 0; i < numarSegmente(c); i++) {
      const { a, b, s } = segment(c, i);
      const [minX, minY, maxX, maxY] = cutieSegment(a, b, s);
      segmente.push({ a, b, s, minX, minY, maxX, maxY });
    }
  }
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const g of segmente) { x0 = Math.min(x0, g.minX); y0 = Math.min(y0, g.minY); x1 = Math.max(x1, g.maxX); y1 = Math.max(y1, g.maxY); }
  const latura = Math.max(x1 - x0, y1 - y0, 1e-9);
  const celula = latura / Math.min(512, Math.max(1, Math.ceil(Math.sqrt(segmente.length))));
  const nx = Math.min(1024, Math.floor((x1 - x0) / celula) + 1), ny = Math.min(1024, Math.floor((y1 - y0) / celula) + 1);
  const ix = (x: number): number => Math.min(nx - 1, Math.max(0, Math.floor((x - x0) / celula)));
  const iy = (y: number): number => Math.min(ny - 1, Math.max(0, Math.floor((y - y0) / celula)));
  // Celulele (pentru distanță) și benzile pe Y (pentru interior), în CSR: întâi numărul, apoi indicii.
  const numarCelule = new Int32Array(nx * ny + 1), numarBenzi = new Int32Array(ny + 1);
  for (const g of segmente) {
    for (let j = iy(g.minY); j <= iy(g.maxY); j++) {
      numarBenzi[j + 1]!++;
      for (let i = ix(g.minX); i <= ix(g.maxX); i++) numarCelule[j * nx + i + 1]!++;
    }
  }
  for (let k = 1; k < numarCelule.length; k++) numarCelule[k]! += numarCelule[k - 1]!;
  for (let k = 1; k < numarBenzi.length; k++) numarBenzi[k]! += numarBenzi[k - 1]!;
  const inCelula = new Int32Array(numarCelule[nx * ny]!), inBanda = new Int32Array(numarBenzi[ny]!);
  const pusCelula = numarCelule.slice(0, nx * ny), pusBanda = numarBenzi.slice(0, ny);
  segmente.forEach((g, k) => {
    for (let j = iy(g.minY); j <= iy(g.maxY); j++) {
      inBanda[pusBanda[j]!++] = k;
      for (let i = ix(g.minX); i <= ix(g.maxX); i++) inCelula[pusCelula[j * nx + i]!++] = k;
    }
  });
  const vazut = new Int32Array(segmente.length);
  let stampila = 0;
  const vizitaCelule = (i0: number, j0: number, i1: number, j1: number, p: Punct, cel: number): number => {
    let d = cel;
    for (let j = Math.max(0, j0); j <= Math.min(ny - 1, j1); j++) {
      for (let i = Math.max(0, i0); i <= Math.min(nx - 1, i1); i++) {
        for (let q = numarCelule[j * nx + i]!; q < numarCelule[j * nx + i + 1]!; q++) {
          const k = inCelula[q]!;
          if (vazut[k] === stampila) continue;
          vazut[k] = stampila;
          const g = segmente[k]!;
          d = Math.min(d, distantaLaSegment(p, g.a, g.b, g.s));
        }
      }
    }
    return d;
  };
  const distanta = (p: Punct, cautaPana?: number): number => {
    if (segmente.length === 0) return Infinity;
    stampila++;
    if (cautaPana !== undefined && Number.isFinite(cautaPana)) {
      const d = vizitaCelule(ix(p.x - cautaPana), iy(p.y - cautaPana), ix(p.x + cautaPana), iy(p.y + cautaPana), p, Infinity);
      if (d <= cautaPana) return d;
      stampila++;
    }
    // Inele de celule în jurul lui p: după inelul k, un segment negăsit e la cel puțin (k − deasupra)·celula de p.
    const ci = ix(p.x), cj = iy(p.y);
    const inGrila = p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1;
    let d = Infinity;
    for (let k = 0; k <= Math.max(nx, ny); k++) {
      d = vizitaCelule(ci - k, cj - k, ci + k, cj + k, p, d);
      if (inGrila && d <= k * celula) return d;
    }
    return d;
  };
  const inauntru = (p: Punct): boolean => {
    const y = p.y + RIDICARE_RAZA;
    if (y < y0 || y > y1) return false;
    const j = iy(y);
    let n = 0;
    for (let q = numarBenzi[j]!; q < numarBenzi[j + 1]!; q++) {
      const g = segmente[inBanda[q]!]!;
      n += traversariSegment(p, y, g.a, g.b, g.s);
    }
    return n % 2 === 1;
  };
  return { distanta, inauntru };
}

// ── Eșantionarea și colțurile ───────────────────────────────────────────────────────────────────────────────────────────

const unitar = (x: number, y: number): Punct => { const l = Math.hypot(x, y); return l > 0 ? { x: x / l, y: y / l } : { x: 0, y: 0 }; };

/** Tangenta la începutul (`la` = 0) sau la capătul (1) unui segment, în sensul de mers. */
function tangenta(a: Punct, b: Punct, s: Segment, la: 0 | 1): Punct {
  if (s.tip === 'A') {
    const { centru, baleiaj } = cerculArcului(a, b, s.bulge);
    const q = la === 0 ? a : b, semn = baleiaj >= 0 ? 1 : -1;
    return unitar(-(q.y - centru.y) * semn, (q.x - centru.x) * semn);
  }
  if (s.tip === 'C') {
    const cand = la === 0 ? [s.c1, s.c2, b].map((q) => ({ x: q.x - a.x, y: q.y - a.y })) : [s.c2, s.c1, a].map((q) => ({ x: b.x - q.x, y: b.y - q.y }));
    for (const v of cand) if (Math.hypot(v.x, v.y) > 1e-12) return unitar(v.x, v.y);
  }
  return unitar(b.x - a.x, b.y - a.y);
}

function puncteSegment(a: Punct, b: Punct, s: Segment, pas: number): Punct[] {
  if (s.tip === 'L') {
    const m = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / pas));
    return Array.from({ length: m }, (_, j) => ({ x: a.x + ((b.x - a.x) * j) / m, y: a.y + ((b.y - a.y) * j) / m }));
  }
  if (s.tip === 'A') {
    const { centru, raza, start, baleiaj } = cerculArcului(a, b, s.bulge);
    const m = Math.max(1, Math.ceil((raza * Math.abs(baleiaj)) / pas));
    return Array.from({ length: m }, (_, j) => (j === 0 ? a : { x: centru.x + raza * Math.cos(start + (baleiaj * j) / m), y: centru.y + raza * Math.sin(start + (baleiaj * j) / m) }));
  }
  const pe = (t: number): Punct => {
    const u = 1 - t;
    return { x: u * u * u * a.x + 3 * u * u * t * s.c1.x + 3 * u * t * t * s.c2.x + t * t * t * b.x, y: u * u * u * a.y + 3 * u * u * t * s.c1.y + 3 * u * t * t * s.c2.y + t * t * t * b.y };
  };
  let L = 0;
  for (let k = 1; k <= 16; k++) { const p = pe((k - 1) / 16), q = pe(k / 16); L += Math.hypot(q.x - p.x, q.y - p.y); }
  // Parametrul uniform nu e lungimea uniformă: încă un sfert de puncte, ca nicio coardă să nu treacă mult de pas.
  const m = Math.max(1, Math.ceil((1.25 * L) / pas));
  return Array.from({ length: m }, (_, j) => pe(j / m));
}

export type GrafAxa = {
  readonly noduri: readonly Punct[];
  readonly vecini: readonly (readonly number[])[];
  /** Pentru raport și probe: câte eșantioane, triunghiuri și întoarceri de legalizare. */
  readonly statistici: { readonly esantioane: number; readonly triunghiuri: number; readonly intoarceri: number };
};

/**
 * Legalizarea pe stivă (Lawson): fiecare muchie interioară se verifică cu `incircle` robust; una ilegală se întoarce, iar
 * cele patru muchii din jurul ei intră iar pe stivă. Aruncă dacă trece de un număr de întoarceri proporțional cu punctele.
 */
export function legalizeaza(T: Uint32Array, HE: Int32Array, xy: Float64Array): number {
  const stiva: number[] = [];
  for (let e = 0; e < HE.length; e++) if (HE[e]! > e) stiva.push(e);
  const leaga = (a: number, b: number): void => { HE[a] = b; if (b !== -1) HE[b] = a; };
  const maxim = 64 * (xy.length / 2) + 1024;
  let intoarceri = 0;
  while (stiva.length > 0) {
    const a = stiva.pop()!;
    const b = HE[a]!;
    if (b < 0) continue;
    const a0 = a - (a % 3), b0 = b - (b % 3);
    const al = a0 + ((a + 1) % 3), ar = a0 + ((a + 2) % 3), bl = b0 + ((b + 2) % 3), br = b0 + ((b + 1) % 3);
    const p0 = T[ar]!, pr = T[a]!, pl = T[al]!, p1 = T[bl]!;
    const x0 = xy[2 * p0]!, y0 = xy[2 * p0 + 1]!, xr = xy[2 * pr]!, yr = xy[2 * pr + 1]!, xl = xy[2 * pl]!, yl = xy[2 * pl + 1]!;
    const o = orient2d(x0, y0, xr, yr, xl, yl);
    if (o === 0) continue;
    if (!(incircle(x0, y0, xr, yr, xl, yl, xy[2 * p1]!, xy[2 * p1 + 1]!) * (o < 0 ? 1 : -1) > 0)) continue;
    T[a] = p1;
    T[b] = p0;
    const hbl = HE[bl]!, har = HE[ar]!;
    leaga(a, hbl);
    leaga(b, har);
    leaga(ar, bl);
    if (++intoarceri > maxim) throw new Error(`legalizarea Delaunay nu converge (${intoarceri} întoarceri pe ${xy.length / 2} puncte)`);
    stiva.push(a, al, b, br);
  }
  return intoarceri;
}

/**
 * Axa medială a regiunii par-impar a contururilor (închise), cu eșantioanele la cel mult `pas` mm. Aruncă pe o regiune
 * fără contururi, peste `ESANTIOANE_MAXIME` sau dacă legalizarea nu converge.
 */
export function axaMediala(contururi: readonly Contur[], pas: number, index: IndexContur = indexContururi(contururi)): GrafAxa {
  const inchise = contururi.filter((c) => c.inchis && numarSegmente(c) > 0);
  if (inchise.length === 0) throw new Error('axa medială cere cel puțin un contur închis');
  const xs: number[] = [], ys: number[] = [], bucla: number[] = [], pozitie: number[] = [], lungimi: number[] = [];
  const colturi: { readonly p: Punct; readonly bisectoare: Punct }[] = [];
  inchise.forEach((c, k) => {
    const n = numarSegmente(c);
    let i0 = 0;
    for (let i = 0; i < n; i++) {
      const { a, b, s } = segment(c, i);
      for (const q of puncteSegment(a, b, s, pas)) { xs.push(q.x); ys.push(q.y); bucla.push(k); pozitie.push(i0++); }
      if (xs.length > ESANTIOANE_MAXIME) throw new Error(`regiunea cere peste ${ESANTIOANE_MAXIME} de eșantioane la ${pas} mm`);
      // Colțul din capătul segmentului (începutul celui următor): convex dacă regiunea stă în pana dintre cele două laturi.
      const urm = segment(c, (i + 1) % n);
      const tin = tangenta(a, b, s, 1), tout = tangenta(urm.a, urm.b, urm.s, 0);
      if (tin.x * tout.x + tin.y * tout.y < Math.cos(1e-3)) {
        const w = unitar(tout.x - tin.x, tout.y - tin.y);
        if (Math.hypot(w.x, w.y) > 0 && index.inauntru({ x: b.x + 1e-5 * w.x, y: b.y + 1e-5 * w.y })) colturi.push({ p: b, bisectoare: w });
      }
    }
    lungimi.push(i0);
  });
  // Coordonatele, mutate lângă origine (precizia triangulării).
  const ox = Math.min(...xs.slice(0, 1)), oy = Math.min(...ys.slice(0, 1));
  const N = xs.length;
  const xy = new Float64Array(2 * N);
  for (let i = 0; i < N; i++) { xy[2 * i] = xs[i]! - ox; xy[2 * i + 1] = ys[i]! - oy; }
  const d = new Delaunator(xy);
  const T = d.triangles, HE = d.halfedges;
  const intoarceri = legalizeaza(T, HE, xy);
  const nt = T.length / 3;
  const nod = new Int32Array(nt).fill(-1);
  const noduri: Punct[] = [];
  const dupaCheie = new Map<string, number>();
  for (let t = 0; t < nt; t++) {
    const a = T[3 * t]!, b = T[3 * t + 1]!, c = T[3 * t + 2]!;
    const ax = xy[2 * a]!, ay = xy[2 * a + 1]!, bx = xy[2 * b]! - ax, by = xy[2 * b + 1]! - ay, qx = xy[2 * c]! - ax, qy = xy[2 * c + 1]! - ay;
    const D = 2 * (bx * qy - by * qx);
    if (Math.abs(D) < 1e-18) continue;
    const b2 = bx * bx + by * by, q2 = qx * qx + qy * qy;
    const p = { x: ax + (qy * b2 - by * q2) / D + ox, y: ay + (bx * q2 - qx * b2) / D + oy };
    if (!index.inauntru(p)) continue;
    // Patru eșantioane pe același cerc dau același centru din două triunghiuri: un singur nod.
    const cheie = `${Math.round(p.x * 1e7)},${Math.round(p.y * 1e7)}`;
    let id = dupaCheie.get(cheie);
    if (id === undefined) { id = noduri.length; noduri.push(p); dupaCheie.set(cheie, id); }
    nod[t] = id;
  }
  const vecini: Set<number>[] = noduri.map(() => new Set());
  const vecinePeContur = (i: number, j: number): boolean => {
    if (bucla[i] !== bucla[j]) return false;
    const n = lungimi[bucla[i]!]!, dd = Math.abs(pozitie[i]! - pozitie[j]!);
    return dd === 1 || dd === n - 1;
  };
  for (let e = 0; e < HE.length; e++) {
    const o = HE[e]!;
    if (o < e) continue;
    const n1 = nod[Math.floor(e / 3)]!, n2 = nod[Math.floor(o / 3)]!;
    if (n1 < 0 || n2 < 0 || n1 === n2) continue;
    if (vecinePeContur(T[e]!, T[e % 3 === 2 ? e - 2 : e + 1]!)) continue;
    vecini[n1]!.add(n2);
    vecini[n2]!.add(n1);
  }
  // Colțurile convexe: un nod nou în colț, legat de cel mai apropiat nod de pe bisectoare (o frunză, de preferat).
  const celula = 4 * pas;
  const galeti = new Map<string, number[]>();
  noduri.forEach((p, i) => {
    const k = `${Math.floor(p.x / celula)},${Math.floor(p.y / celula)}`;
    let g = galeti.get(k);
    if (!g) galeti.set(k, (g = []));
    g.push(i);
  });
  for (const { p, bisectoare: w } of colturi) {
    let cel = -1, scor = Infinity;
    const gx = Math.floor(p.x / celula), gy = Math.floor(p.y / celula);
    for (let raza = 1; raza <= 64 && cel < 0; raza *= 2) {
      for (let i = gx - raza; i <= gx + raza; i++) {
        for (let j = gy - raza; j <= gy + raza; j++) {
          for (const q of galeti.get(`${i},${j}`) ?? []) {
            const vx = noduri[q]!.x - p.x, vy = noduri[q]!.y - p.y;
            const inainte = vx * w.x + vy * w.y, lateral = Math.abs(vx * w.y - vy * w.x);
            if (inainte <= 0) continue;
            const s = 4 * lateral + inainte + (vecini[q]!.size === 1 ? 0 : pas);
            if (s < scor) { scor = s; cel = q; }
          }
        }
      }
    }
    if (cel < 0) continue;
    const id = noduri.length;
    noduri.push(p);
    vecini.push(new Set([cel]));
    vecini[cel]!.add(id);
  }
  return { noduri, vecini: vecini.map((s) => [...s]), statistici: { esantioane: N, triunghiuri: nt, intoarceri } };
}
