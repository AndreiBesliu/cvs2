/**
 * Oracolul tăierii cu o linie dreaptă (ADR 0180, felia 10.3↑), scris separat de aplicație: citește documentul singur (arborele
 * piesei, matricile, formele), își eșantionează formele, își măsoară distanțele (exact la linie și arc, cu rafinare la cubică)
 * și ariile (poligoane dese, tăiate cu semiplanul, Sutherland–Hodgman), fără nimic din `src/geom` sau `src/model`. Judecă o
 * tăiere după ce trebuie să fie adevărat, nu după cum e făcută:
 * - **acoperirea:** fiecare punct al formelor vechi stă pe o formă nouă (distanța ≤ 1e-6 mm);
 * - **nimic inventat:** fiecare punct al formelor noi stă pe o formă veche sau pe linie (o coardă a închiderii);
 * - **părțile:** tot ce e în prima parte e de partea A a liniei (x ≤ X, y ≤ Y), tot ce e în a doua, de partea B;
 * - **aria** (cu închidere): regiunea par-impar a fiecărei părți are aria regiunii vechi tăiate cu semiplanul ei.
 */

type P = { readonly x: number; readonly y: number };
type M = { readonly a: number; readonly b: number; readonly c: number; readonly d: number; readonly e: number; readonly f: number };
type Seg =
  | { readonly fel: 'L'; readonly a: P; readonly b: P }
  | { readonly fel: 'A'; readonly a: P; readonly b: P; readonly c: P; readonly r: number; readonly u0: number; readonly du: number }
  | { readonly fel: 'C'; readonly a: P; readonly c1: P; readonly c2: P; readonly b: P };
export type FormaOracol = { readonly inchis: boolean; readonly seg: readonly Seg[] };

const ori = (m: M, n: M): M => ({
  a: m.a * n.a + m.c * n.b, b: m.b * n.a + m.d * n.b, c: m.a * n.c + m.c * n.d, d: m.b * n.c + m.d * n.d,
  e: m.a * n.e + m.c * n.f + m.e, f: m.b * n.e + m.d * n.f + m.f,
});
const ap = (m: M, p: P): P => ({ x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f });
const scara = (m: M): number => Math.sqrt(Math.abs(m.a * m.d - m.b * m.c));
const oglinda = (m: M): boolean => m.a * m.d - m.b * m.c < 0;

/** Matricea instanței: rotirea în grade (exactă la multiplii de 90°), apoi translația. */
function instanta(i: { readonly x: number; readonly y: number; readonly rotire: number }): M {
  const r = ((i.rotire % 360) + 360) % 360;
  const [c, s] = r === 0 ? [1, 0] : r === 90 ? [0, 1] : r === 180 ? [-1, 0] : r === 270 ? [0, -1] : [Math.cos((r * Math.PI) / 180), Math.sin((r * Math.PI) / 180)];
  return { a: c, b: s, c: -s, d: c, e: i.x, f: i.y };
}

/** Un arc în lume, din capete și bulge (tan(baleiaj / 4)), după matricea m (o similitudine). */
function arc(a: P, b: P, bulge: number): Seg {
  const dx = b.x - a.x, dy = b.y - a.y;
  const k = (1 - bulge * bulge) / (4 * bulge);
  const c = { x: (a.x + b.x) / 2 - dy * k, y: (a.y + b.y) / 2 + dx * k };
  const r = Math.hypot(a.x - c.x, a.y - c.y);
  return { fel: 'A', a, b, c, r, u0: Math.atan2(a.y - c.y, a.x - c.x), du: 4 * Math.atan(bulge) };
}

type VarfJson = { readonly p: P; readonly s: { readonly tip: string; readonly bulge?: number; readonly c1?: P; readonly c2?: P } };
type FormaJson = { readonly tip: string; readonly raza?: number; readonly latime?: number; readonly inaltime?: number; readonly razaColt?: number; readonly inchis?: boolean; readonly varfuri?: readonly VarfJson[] };

/** Forma unui element, în lume: segmentele ei după matricea compusă. */
function formaLume(f: FormaJson, m: M): FormaOracol {
  const sg = oglinda(m) ? -1 : 1;
  const varfuri: VarfJson[] = [];
  let inchis = true;
  if (f.tip === 'cerc') {
    const r = f.raza ?? 0;
    varfuri.push({ p: { x: r, y: 0 }, s: { tip: 'A', bulge: 1 } }, { p: { x: -r, y: 0 }, s: { tip: 'A', bulge: 1 } });
  } else if (f.tip === 'dreptunghi') {
    const w = f.latime ?? 0, h = f.inaltime ?? 0, r = f.razaColt ?? 0;
    if (r === 0) {
      for (const p of [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }]) varfuri.push({ p, s: { tip: 'L' } });
    } else {
      const q = Math.tan(Math.PI / 8);
      const pts: Array<[number, number, boolean]> = [[r, 0, false], [w - r, 0, true], [w, r, false], [w, h - r, true], [w - r, h, false], [r, h, true], [0, h - r, false], [0, r, true]];
      for (const [x, y, e] of pts) varfuri.push({ p: { x, y }, s: e ? { tip: 'A', bulge: q } : { tip: 'L' } });
    }
  } else {
    inchis = f.inchis === true;
    varfuri.push(...(f.varfuri ?? []));
  }
  const n = varfuri.length;
  const seg: Seg[] = [];
  const m2 = inchis ? n : n - 1;
  for (let i = 0; i < m2; i++) {
    const v = varfuri[i] as VarfJson, w = varfuri[(i + 1) % n] as VarfJson;
    const a = ap(m, v.p), b = ap(m, w.p);
    if (v.s.tip === 'A' && v.s.bulge !== undefined && Math.abs(v.s.bulge) > 1e-12) seg.push(arc(a, b, sg * v.s.bulge));
    else if (v.s.tip === 'C' && v.s.c1 && v.s.c2) seg.push({ fel: 'C', a, c1: ap(m, v.s.c1), c2: ap(m, v.s.c2), b });
    else seg.push({ fel: 'L', a, b });
  }
  void scara;
  return { inchis, seg };
}

type NodJson = { readonly tip: string; readonly id: string; readonly matrice: M; readonly forma?: FormaJson; readonly copii?: readonly NodJson[] };
type DocJson = {
  readonly piese: ReadonlyArray<{ readonly id: string; readonly radacina: NodJson }>;
  readonly foi: ReadonlyArray<{ readonly instante: ReadonlyArray<{ readonly id: string; readonly piesa: string; readonly x: number; readonly y: number; readonly rotire: number }> }>;
};

/** Formele în lume ale unei instanțe a primei foi, citite din document (JSON). */
export function formeInstanta(doc: unknown, id: string): FormaOracol[] {
  const d = doc as DocJson;
  const inst = d.foi[0]?.instante.find((i) => i.id === id);
  if (!inst) throw new Error(`oracol: instanța ${id} lipsește`);
  const piesa = d.piese.find((p) => p.id === inst.piesa);
  if (!piesa) throw new Error(`oracol: piesa ${inst.piesa} lipsește`);
  const rez: FormaOracol[] = [];
  const stiva: Array<{ readonly n: NodJson; readonly m: M }> = [{ n: piesa.radacina, m: instanta(inst) }];
  for (let x = stiva.pop(); x; x = stiva.pop()) {
    const m = ori(x.m, x.n.matrice);
    if (x.n.tip === 'element' && x.n.forma) rez.push(formaLume(x.n.forma, m));
    else for (const c of x.n.copii ?? []) stiva.push({ n: c, m });
  }
  return rez;
}

function punct(s: Seg, t: number): P {
  if (s.fel === 'L') return { x: s.a.x + (s.b.x - s.a.x) * t, y: s.a.y + (s.b.y - s.a.y) * t };
  if (s.fel === 'A') { const u = s.u0 + s.du * t; return { x: s.c.x + s.r * Math.cos(u), y: s.c.y + s.r * Math.sin(u) }; }
  const v = 1 - t;
  return {
    x: v * v * v * s.a.x + 3 * v * v * t * s.c1.x + 3 * v * t * t * s.c2.x + t * t * t * s.b.x,
    y: v * v * v * s.a.y + 3 * v * v * t * s.c1.y + 3 * v * t * t * s.c2.y + t * t * t * s.b.y,
  };
}

/** Eșantioanele unei forme (capetele segmentelor incluse), câte `n` pe segment. */
export function esantioane(f: FormaOracol, n = 64): P[] {
  const rez: P[] = [];
  for (const s of f.seg) for (let k = 0; k <= n; k++) rez.push(punct(s, k / n));
  return rez;
}

/** Distanța de la q la un segment: exactă la linie și arc; la cubică, eșantioane dese și o căutare pe a treimi. */
function distanta(q: P, s: Seg): number {
  if (s.fel === 'L') {
    const dx = s.b.x - s.a.x, dy = s.b.y - s.a.y, l2 = dx * dx + dy * dy;
    const t = l2 > 0 ? Math.max(0, Math.min(1, ((q.x - s.a.x) * dx + (q.y - s.a.y) * dy) / l2)) : 0;
    return Math.hypot(q.x - (s.a.x + dx * t), q.y - (s.a.y + dy * t));
  }
  if (s.fel === 'A') {
    const u = Math.atan2(q.y - s.c.y, q.x - s.c.x);
    let rel = (s.du >= 0 ? u - s.u0 : s.u0 - u) % (2 * Math.PI);
    if (rel < 0) rel += 2 * Math.PI;
    const capete = Math.min(Math.hypot(q.x - s.a.x, q.y - s.a.y), Math.hypot(q.x - s.b.x, q.y - s.b.y));
    return rel <= Math.abs(s.du) ? Math.min(capete, Math.abs(Math.hypot(q.x - s.c.x, q.y - s.c.y) - s.r)) : capete;
  }
  let best = Infinity, tb = 0;
  for (let k = 0; k <= 256; k++) {
    const p = punct(s, k / 256);
    const d = Math.hypot(p.x - q.x, p.y - q.y);
    if (d < best) { best = d; tb = k / 256; }
  }
  let lo = Math.max(0, tb - 1 / 256), hi = Math.min(1, tb + 1 / 256);
  for (let it = 0; it < 100; it++) {
    const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3;
    const p1 = punct(s, m1), p2 = punct(s, m2);
    if (Math.hypot(p1.x - q.x, p1.y - q.y) < Math.hypot(p2.x - q.x, p2.y - q.y)) hi = m2; else lo = m1;
  }
  const p = punct(s, (lo + hi) / 2);
  return Math.min(best, Math.hypot(p.x - q.x, p.y - q.y));
}

export function distantaLaForme(q: P, forme: readonly FormaOracol[]): number {
  let best = Infinity;
  for (const f of forme) for (const s of f.seg) best = Math.min(best, distanta(q, s));
  return best;
}

/** Aria cu semn a unui poligon (shoelace). */
function ariePoligon(p: readonly P[]): number {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const u = p[i] as P, v = p[(i + 1) % p.length] as P;
    a += u.x * v.y - v.x * u.y;
  }
  return a / 2;
}

/** Punctul q e în poligon (par-impar, raza spre +x)? */
function inPoligon(q: P, p: readonly P[]): boolean {
  let in_ = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const a = p[i] as P, b = p[j] as P;
    if ((a.y > q.y) !== (b.y > q.y) && q.x < ((b.x - a.x) * (q.y - a.y)) / (b.y - a.y) + a.x) in_ = !in_;
  }
  return in_;
}

/** Poligonul tăiat cu semiplanul `semn · (coordonata − v) ≥ 0` (Sutherland–Hodgman). */
function taiePoligon(p: readonly P[], axa: 'x' | 'y', v: number, semn: number): P[] {
  const f = (q: P): number => semn * ((axa === 'x' ? q.x : q.y) - v);
  const rez: P[] = [];
  for (let i = 0; i < p.length; i++) {
    const a = p[i] as P, b = p[(i + 1) % p.length] as P;
    const fa = f(a), fb = f(b);
    if (fa >= 0) rez.push(a);
    if ((fa >= 0) !== (fb >= 0)) {
      const t = fa / (fa - fb);
      rez.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  return rez;
}

/**
 * Aria regiunii par-impar a contururilor închise (poligoane dese), cu semnul dat de adâncimea imbricării; opțional tăiate întâi
 * cu un semiplan (aceeași adâncime: tăierea nu schimbă cine e în cine).
 */
export function ariePar(forme: readonly FormaOracol[], taiere?: { readonly axa: 'x' | 'y'; readonly v: number; readonly semn: number }): number {
  const poligoane = forme.filter((f) => f.inchis).map((f) => {
    const p = esantioane(f, 512);
    return p.filter((q, i) => i === 0 || Math.hypot(q.x - (p[i - 1] as P).x, q.y - (p[i - 1] as P).y) > 0);
  });
  let a = 0;
  for (let i = 0; i < poligoane.length; i++) {
    const p = poligoane[i] as P[];
    // Adâncimea: în câte alte contururi stă un punct al acestuia (un punct din mijlocul unei laturi, nu un vârf comun).
    const q0 = p[0] as P, q1 = p[1] ?? q0;
    const mij = { x: (q0.x + q1.x) / 2, y: (q0.y + q1.y) / 2 };
    let adancime = 0;
    for (let j = 0; j < poligoane.length; j++) if (j !== i && inPoligon(mij, poligoane[j] as P[])) adancime++;
    const t = taiere ? taiePoligon(p, taiere.axa, taiere.v, taiere.semn) : p;
    a += (adancime % 2 === 0 ? 1 : -1) * Math.abs(t.length >= 3 ? ariePoligon(t) : 0);
  }
  return a;
}

/** Judecata unei tăieri: lista abaterilor (goală = bună). `parti` sunt instanțele noi, întâi partea A, apoi B. */
export function judecaTaierea(o: {
  readonly inainte: readonly FormaOracol[];
  readonly parti: ReadonlyArray<readonly FormaOracol[]>;
  readonly axa: 'x' | 'y';
  readonly v: number;
  readonly inchide: boolean;
}): string[] {
  const rau: string[] = [];
  const toate = o.parti.flat();
  const fata = (q: P): number => (o.axa === 'x' ? q.x : q.y) - o.v;
  for (const f of o.inainte) {
    for (const q of esantioane(f, 48)) {
      const d = distantaLaForme(q, toate);
      if (d > 1e-6) { rau.push(`un punct vechi (${q.x.toFixed(4)}, ${q.y.toFixed(4)}) nu e pe nicio formă nouă (${d})`); break; }
    }
  }
  for (const f of toate) {
    for (const q of esantioane(f, 48)) {
      const d = distantaLaForme(q, o.inainte);
      if (d > 1e-6 && Math.abs(fata(q)) > 1e-7) { rau.push(`un punct nou (${q.x.toFixed(4)}, ${q.y.toFixed(4)}) nu e nici pe forma veche (${d}), nici pe linie`); break; }
    }
  }
  if (o.parti.length !== 2) rau.push(`părțile: ${o.parti.length}, nu 2`);
  o.parti.forEach((parte, k) => {
    const semn = k === 0 ? -1 : 1;
    for (const f of parte) for (const q of esantioane(f, 16)) if (semn * fata(q) < -1e-7) { rau.push(`partea ${k === 0 ? 'A' : 'B'} trece linia (${fata(q)})`); return; }
  });
  if (o.inchide) {
    o.parti.forEach((parte, k) => {
      const semn = k === 0 ? -1 : 1;
      const asteptat = ariePar(o.inainte, { axa: o.axa, v: o.v, semn });
      const are = ariePar(parte);
      if (Math.abs(are - asteptat) > 1e-4 * Math.max(1, Math.abs(asteptat))) rau.push(`aria părții ${k === 0 ? 'A' : 'B'}: ${are}, nu ${asteptat}`);
    });
  }
  return rau;
}
