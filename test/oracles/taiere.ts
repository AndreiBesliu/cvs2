/**
 * Oracolul tăierii cu o linie dreaptă (ADR 0180, felia 10.3↑), scris separat de aplicație: citește documentul singur (arborele
 * piesei, matricile, formele), își eșantionează formele, își măsoară distanțele (exact la linie și arc, cu rafinare la cubică)
 * și ariile (poligoane dese, tăiate cu semiplanul, Sutherland–Hodgman), fără nimic din `src/geom` sau `src/model`. Judecă o
 * tăiere după ce trebuie să fie adevărat, nu după cum e făcută:
 * - **acoperirea:** fiecare punct al formelor vechi stă pe o formă nouă (distanța ≤ 1e-6 mm);
 * - **nimic inventat:** fiecare punct al formelor noi stă pe o formă veche sau pe linie (o coardă a închiderii);
 * - **părțile:** tot ce e în prima parte e de partea A a liniei (x ≤ X, y ≤ Y), tot ce e în a doua, de partea B;
 * - **aria** (cu închidere): regiunea par-impar a fiecărei părți are aria regiunii vechi tăiate cu semiplanul ei.
 *
 * Felia 10.3↑b: cuțitul-formă (un poligon convex: părțile înăuntru / în afară, ariile tăiate cu el; o linie frântă: ariile
 * fețelor se adună la aria regiunii) și „Taie la intersecții” (aceeași lungime, nicio bucată nouă prin altă formă veche).
 * Felia 10.3↑c: decuparea (ce rămâne e de partea păstrată, o acoperă, cu aria tăiată de graniță).
 * Felia 10.3↑d: conversia (fiecare formă neschimbată sau devenită ce s-a cerut: fără cubice, un cerc, un dreptunghi; la cel
 * mult toleranța de cea veche, ca distanță Hausdorff măsurată din nou; cu mărimea dată, centrul în centrul cutiei vechi).
 * Felia 10.3↑e: netezirea (la cel mult toleranța; arcele, curbele și liniile mai lungi de „Păstrează”, neschimbate; colțurile
 * ascuțite, peste 60° pe 4 × toleranța, vârfuri; cubicele noi doar între vârfuri vechi; nicio frântură ascuțită nouă).
 * Felia 10.3↑i: spațiul și suprapunerea (fiecare parte, regiunea veche tăiată cu cuțitul mutat cu w / 2; la spațiu, bucățile la
 * cel puțin w una de alta; la suprapunere, partea comună cât fâșia de lățime w) și, pe o rețea, bucățile pe care spațiul le-ar
 * mânca de tot (componentele regiunii de lângă cuțit care nu trec de cel mutat).
 * Felia 10.3↑j: îmbinarea (reuniunea bucăților e forma veche: ariile lor fac aria ei, fără joc, și nu se suprapun; cu joc,
 * bucățile stau la cel puțin jocul una de alta, iar undeva chiar la el; nimic în afara formei vechi; dinții chiar se văd).
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

/**
 * O margine inferioară ieftină a distanței de la q la segment: exactă la linie; la arc, ||q − c| − r|; la cubică, distanța până
 * la cutia punctelor de control (curba stă în învelitoarea lor convexă, deci în cutie).
 */
function margineJos(q: P, s: Seg): number {
  if (s.fel === 'L') return distanta(q, s);
  if (s.fel === 'A') return Math.abs(Math.hypot(q.x - s.c.x, q.y - s.c.y) - s.r);
  const x0 = Math.min(s.a.x, s.c1.x, s.c2.x, s.b.x), x1 = Math.max(s.a.x, s.c1.x, s.c2.x, s.b.x);
  const y0 = Math.min(s.a.y, s.c1.y, s.c2.y, s.b.y), y1 = Math.max(s.a.y, s.c1.y, s.c2.y, s.b.y);
  return Math.hypot(Math.max(0, x0 - q.x, q.x - x1), Math.max(0, y0 - q.y, q.y - y1));
}

/** Distanța de la q la forme: segmentele în ordinea marginii lor de jos, cele care n-o pot bate pe cea găsită, sărite. */
export function distantaLaForme(q: P, forme: readonly FormaOracol[]): number {
  const cand: Array<{ readonly s: Seg; readonly lb: number }> = [];
  for (const f of forme) for (const s of f.seg) cand.push({ s, lb: margineJos(q, s) });
  cand.sort((u, v) => u.lb - v.lb);
  let best = Infinity;
  for (const c of cand) {
    if (c.lb >= best) break;
    best = Math.min(best, c.s.fel === 'L' ? c.lb : distanta(q, c.s));
  }
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

// ——— Felia 10.3↑b: cuțitul-formă și „Taie la intersecții” ———

/** Lungimea unei forme: exactă la linie și arc (r·|baleiaj|); la cubică, poligonul des (2 048 de laturi). */
export function lungimeForma(f: FormaOracol): number {
  let s = 0;
  for (const g of f.seg) {
    if (g.fel === 'L') { s += Math.hypot(g.b.x - g.a.x, g.b.y - g.a.y); continue; }
    if (g.fel === 'A') { s += g.r * Math.abs(g.du); continue; }
    let a = punct(g, 0);
    for (let k = 1; k <= 2048; k++) {
      const b = punct(g, k / 2048);
      s += Math.hypot(b.x - a.x, b.y - a.y);
      a = b;
    }
  }
  return s;
}

/** Distanța de la q la marginea unui poligon. */
function laPoligon(q: P, p: readonly P[]): number {
  let best = Infinity;
  for (let i = 0; i < p.length; i++) best = Math.min(best, distanta(q, { fel: 'L', a: p[i] as P, b: p[(i + 1) % p.length] as P }));
  return best;
}

/** Poligonul p tăiat cu poligonul convex k, în sens trigonometric (Sutherland–Hodgman, semiplan cu semiplan). */
function taieConvex(p: readonly P[], k: readonly P[]): P[] {
  let rez: P[] = [...p];
  for (let i = 0; i < k.length && rez.length > 0; i++) {
    const a = k[i] as P, b = k[(i + 1) % k.length] as P;
    const f = (q: P): number => (b.x - a.x) * (q.y - a.y) - (b.y - a.y) * (q.x - a.x);
    const intrare = rez;
    rez = [];
    for (let j = 0; j < intrare.length; j++) {
      const u = intrare[j] as P, v = intrare[(j + 1) % intrare.length] as P;
      const fu = f(u), fv = f(v);
      if (fu >= 0) rez.push(u);
      if ((fu >= 0) !== (fv >= 0)) {
        const t = fu / (fu - fv);
        rez.push({ x: u.x + (v.x - u.x) * t, y: u.y + (v.y - u.y) * t });
      }
    }
  }
  return rez;
}

/** Aria par-impar a formelor închise tăiate cu poligonul convex k (trigonometric); adâncimea, a formelor întregi. */
export function arieParInConvex(forme: readonly FormaOracol[], k: readonly P[]): number {
  const poligoane = forme.filter((f) => f.inchis).map((f) => esantioane(f, 512));
  let a = 0;
  for (let i = 0; i < poligoane.length; i++) {
    const p = poligoane[i] as P[];
    const q0 = p[0] as P, q1 = p[1] ?? q0;
    const mij = { x: (q0.x + q1.x) / 2, y: (q0.y + q1.y) / 2 };
    let adancime = 0;
    for (let j = 0; j < poligoane.length; j++) if (j !== i && inPoligon(mij, poligoane[j] as P[])) adancime++;
    const t = taieConvex(p, k);
    a += (adancime % 2 === 0 ? 1 : -1) * Math.abs(t.length >= 3 ? ariePoligon(t) : 0);
  }
  return a;
}

/**
 * Judecata unei tăieri cu cuțitul-formă (lista abaterilor; goală = bună). `convex`: poligonul cuțitului, trigonometric, când
 * cuțitul e un poligon convex închis (atunci părțile sunt înăuntru, apoi în afară, cu ariile tăiate de el); la un cuțit-cerc,
 * poligonul lui des, iar `cerc` dă locul exact (cine e înăuntru). Altfel cuțitul e deschis și, cu închidere, ariile fețelor se
 * adună la aria regiunii. `tolCutit` (ADR 0181, mâna liberă): cât se poate depărta marginea nouă de cuțitul dat, când aplicația
 * l-a netezit întâi (implicit 1e-6, adică pe el).
 */
export function judecaCutitul(o: {
  readonly inainte: readonly FormaOracol[];
  readonly cutit: readonly FormaOracol[];
  readonly parti: ReadonlyArray<readonly FormaOracol[]>;
  readonly inchide: boolean;
  readonly convex: readonly P[] | null;
  readonly cerc?: { readonly c: P; readonly r: number } | null;
  readonly tolCutit?: number;
}): string[] {
  const tolCutit = o.tolCutit ?? 1e-6;
  const rau: string[] = [];
  const toate = o.parti.flat();
  for (const f of o.inainte) {
    for (const q of esantioane(f, 48)) {
      const d = distantaLaForme(q, toate);
      if (d > 1e-6) { rau.push(`un punct vechi (${q.x.toFixed(4)}, ${q.y.toFixed(4)}) nu e pe nicio formă nouă (${d})`); break; }
    }
  }
  for (const f of toate) {
    for (const q of esantioane(f, 48)) {
      const dv = distantaLaForme(q, o.inainte), dk = distantaLaForme(q, o.cutit);
      if (dv > 1e-6 && dk > tolCutit) { rau.push(`un punct nou (${q.x.toFixed(4)}, ${q.y.toFixed(4)}) nu e nici pe forma veche, nici pe cuțit (${Math.min(dv, dk)})`); break; }
    }
  }
  if (o.convex) {
    const k = o.convex;
    if (o.parti.length !== 2) rau.push(`părțile: ${o.parti.length}, nu 2`);
    const cerc = o.cerc ?? null;
    const pe = (q: P): boolean => (cerc ? Math.abs(Math.hypot(q.x - cerc.c.x, q.y - cerc.c.y) - cerc.r) <= 1e-6 : laPoligon(q, k) <= 1e-6);
    const inauntru = (q: P): boolean => (cerc ? Math.hypot(q.x - cerc.c.x, q.y - cerc.c.y) < cerc.r : inPoligon(q, k));
    o.parti.forEach((parte, j) => {
      for (const f of parte) {
        for (const q of esantioane(f, 16)) {
          if (pe(q)) continue;
          if (inauntru(q) !== (j === 0)) { rau.push(`partea ${j === 0 ? 'dinăuntru' : 'din afară'} are un punct de cealaltă parte (${q.x.toFixed(4)}, ${q.y.toFixed(4)})`); return; }
        }
      }
    });
    if (o.inchide && o.parti.length === 2) {
      const tot = ariePar(o.inainte), inauntru = arieParInConvex(o.inainte, k);
      for (const [j, asteptat] of [[0, inauntru], [1, tot - inauntru]] as const) {
        const are = ariePar(o.parti[j] as FormaOracol[]);
        if (Math.abs(are - asteptat) > 1e-4 * Math.max(1, Math.abs(tot))) rau.push(`aria părții ${j === 0 ? 'dinăuntru' : 'din afară'}: ${are}, nu ${asteptat}`);
      }
    }
  } else if (o.inchide) {
    const tot = ariePar(o.inainte);
    let suma = 0;
    for (const parte of o.parti) {
      const a = ariePar(parte);
      if (parte.some((f) => f.inchis) && !(a > 0)) rau.push(`o față fără arie (${a})`);
      suma += a;
    }
    if (Math.abs(suma - tot) > 1e-4 * Math.max(1, Math.abs(tot))) rau.push(`ariile fețelor: ${suma}, nu ${tot}`);
  }
  return rau;
}

/** Se încrucișează segmentele ab și cd, strict înăuntrul amândurora? */
function seIncruciseaza(a: P, b: P, c: P, d: P): boolean {
  const o = (p: P, q: P, r: P): number => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const d1 = o(c, d, a), d2 = o(c, d, b), d3 = o(a, b, c), d4 = o(a, b, d);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

/**
 * Judecata „Taie la intersecții” (lista abaterilor): acoperirea și nimic inventat, aceeași lungime în total (nimic dublat,
 * nimic pierdut), iar o bucată nouă nu mai trece prin altă formă veche decât la capetele ei (poligoane dese, fără capete).
 */
export function judecaIntersectiile(o: { readonly inainte: readonly FormaOracol[]; readonly dupa: readonly FormaOracol[] }): string[] {
  const rau: string[] = [];
  for (const f of o.inainte) {
    for (const q of esantioane(f, 48)) {
      const d = distantaLaForme(q, o.dupa);
      if (d > 1e-6) { rau.push(`un punct vechi (${q.x.toFixed(4)}, ${q.y.toFixed(4)}) nu e pe nicio formă nouă (${d})`); break; }
    }
  }
  for (const f of o.dupa) {
    for (const q of esantioane(f, 48)) {
      const d = distantaLaForme(q, o.inainte);
      if (d > 1e-6) { rau.push(`un punct nou (${q.x.toFixed(4)}, ${q.y.toFixed(4)}) nu e pe nicio formă veche (${d})`); break; }
    }
  }
  const l0 = o.inainte.reduce((s, f) => s + lungimeForma(f), 0), l1 = o.dupa.reduce((s, f) => s + lungimeForma(f), 0);
  if (Math.abs(l1 - l0) > 1e-6 * Math.max(1, l0)) rau.push(`lungimea: ${l1}, nu ${l0}`);
  const vechi = o.inainte.map((f) => {
    const p = esantioane(f, 128);
    return { p: f.inchis ? [...p, p[0] as P] : p };
  });
  for (const f of o.dupa) {
    if (f.inchis) continue;
    const p = esantioane(f, 128);
    const cap0 = p[0] as P, cap1 = p[p.length - 1] as P;
    const interior = p.filter((q) => Math.hypot(q.x - cap0.x, q.y - cap0.y) > 1e-3 && Math.hypot(q.x - cap1.x, q.y - cap1.y) > 1e-3);
    if (interior.length < 2) continue;
    const pe = new Set(o.inainte.map((g, k) => (esantioane(f, 16).every((q) => distantaLaForme(q, [g]) <= 1e-6) ? k : -1)).filter((k) => k >= 0));
    vechi.forEach((v, k) => {
      if (pe.has(k)) return;
      for (let i = 0; i + 1 < interior.length; i++) {
        for (let j = 0; j + 1 < v.p.length; j++) {
          if (seIncruciseaza(interior[i] as P, interior[i + 1] as P, v.p[j] as P, v.p[j + 1] as P)) {
            rau.push(`o bucată nouă trece prin forma veche ${k} lângă (${(interior[i] as P).x.toFixed(3)}, ${(interior[i] as P).y.toFixed(3)})`);
            return;
          }
        }
      }
    });
  }
  return rau;
}

// ——— Felia 10.3↑c: decuparea ———

/**
 * Judecata unei decupări la o graniță convexă (sau un cerc), cu formele care o trec tăiate (lista abaterilor; goală = bună):
 * tot ce rămâne e de partea păstrată; fiecare punct vechi strict de partea păstrată stă pe o formă nouă; nimic inventat (pe
 * forma veche sau pe graniță); cu închidere, aria e a regiunii vechi tăiate de graniță (înăuntru) sau restul (în afară).
 * `dupa` e gol când forma a plecat.
 */
export function judecaDecuparea(o: {
  readonly inainte: readonly FormaOracol[];
  readonly granita: readonly FormaOracol[];
  readonly dupa: readonly FormaOracol[];
  readonly inauntru: boolean;
  readonly inchide: boolean;
  readonly convex: readonly P[];
  readonly cerc?: { readonly c: P; readonly r: number } | null;
}): string[] {
  const rau: string[] = [];
  const k = o.convex, cerc = o.cerc ?? null;
  const pe = (q: P): boolean => (cerc ? Math.abs(Math.hypot(q.x - cerc.c.x, q.y - cerc.c.y) - cerc.r) <= 1e-6 : laPoligon(q, k) <= 1e-6);
  const inK = (q: P): boolean => (cerc ? Math.hypot(q.x - cerc.c.x, q.y - cerc.c.y) < cerc.r : inPoligon(q, k));
  const pastrat = (q: P): boolean => inK(q) === o.inauntru;
  for (const f of o.inainte) {
    for (const q of esantioane(f, 48)) {
      if (pe(q) || !pastrat(q)) continue;
      const d = distantaLaForme(q, o.dupa);
      if (d > 1e-6) { rau.push(`un punct vechi de partea păstrată (${q.x.toFixed(4)}, ${q.y.toFixed(4)}) nu e pe nicio formă nouă (${d})`); break; }
    }
  }
  for (const f of o.dupa) {
    for (const q of esantioane(f, 48)) {
      const d = Math.min(distantaLaForme(q, o.inainte), distantaLaForme(q, o.granita));
      if (d > 1e-6) { rau.push(`un punct nou (${q.x.toFixed(4)}, ${q.y.toFixed(4)}) nu e nici pe forma veche, nici pe graniță (${d})`); break; }
    }
    for (const q of esantioane(f, 16)) {
      if (pe(q) || pastrat(q)) continue;
      rau.push(`un punct nou (${q.x.toFixed(4)}, ${q.y.toFixed(4)}) e de partea nepăstrată`);
      break;
    }
  }
  if (o.inchide) {
    const tot = ariePar(o.inainte), inauntru = arieParInConvex(o.inainte, k);
    const asteptat = o.inauntru ? inauntru : tot - inauntru;
    const are = ariePar(o.dupa);
    if (Math.abs(are - asteptat) > 1e-4 * Math.max(1, Math.abs(tot))) rau.push(`aria rămasă: ${are}, nu ${asteptat}`);
  }
  return rau;
}

// ——— Felia 10.3↑d: conversia (arce, în cerc, în dreptunghi) ———

const AUR = (Math.sqrt(5) - 1) / 2;

/**
 * Cât se depărtează forma `a` de forma `b`: cel mai depărtat punct al lui `a`, din eșantioane, cu fiecare maxim local al
 * eșantioanelor rafinat pe secțiunea de aur, între vecinii lui.
 */
function departare(a: FormaOracol, b: FormaOracol, n = 40): number {
  const d = (s: Seg, t: number): number => distantaLaForme(punct(s, t), [b]);
  let max = 0;
  for (const s of a.seg) {
    const v = Array.from({ length: n + 1 }, (_, k) => d(s, k / n));
    for (let k = 0; k <= n; k++) {
      const x = v[k] as number;
      max = Math.max(max, x);
      if (k === 0 || k === n || x < (v[k - 1] as number) || x < (v[k + 1] as number)) continue;
      let lo = (k - 1) / n, hi = (k + 1) / n;
      let m1 = hi - AUR * (hi - lo), m2 = lo + AUR * (hi - lo), f1 = d(s, m1), f2 = d(s, m2);
      for (let it = 0; it < 48; it++) {
        if (f1 > f2) { hi = m2; m2 = m1; f2 = f1; m1 = hi - AUR * (hi - lo); f1 = d(s, m1); }
        else { lo = m1; m1 = m2; f1 = f2; m2 = lo + AUR * (hi - lo); f2 = d(s, m2); }
      }
      max = Math.max(max, f1, f2);
    }
  }
  return max;
}

/** Distanța Hausdorff dintre două forme, în ambele sensuri, măsurată de oracol. */
export function hausdorff(a: FormaOracol, b: FormaOracol): number {
  // Pe o formă cu multe segmente scurte, mai puține eșantioane pe segment: segmentele sunt deja scurte.
  const n = (f: FormaOracol): number => Math.max(6, Math.min(40, Math.ceil(600 / Math.max(1, f.seg.length))));
  return Math.max(departare(a, b, n(a)), departare(b, a, n(b)));
}

/** Cutia unei forme, exactă: capetele, punctele arcelor de pe axe (în baleiajul lor), rădăcinile derivatei cubicelor. */
export function cutieForma(f: FormaOracol): { readonly minX: number; readonly minY: number; readonly maxX: number; readonly maxY: number } {
  const q: P[] = [];
  for (const s of f.seg) {
    q.push(s.a, s.b);
    if (s.fel === 'A') {
      for (let k = -8; k <= 8; k++) {
        const u = (k * Math.PI) / 2;
        const rel = s.du >= 0 ? u - s.u0 : s.u0 - u;
        if (rel > 0 && rel < Math.abs(s.du)) q.push({ x: s.c.x + s.r * Math.cos(u), y: s.c.y + s.r * Math.sin(u) });
      }
    } else if (s.fel === 'C') {
      for (const ax of ['x', 'y'] as const) {
        // x'(t) / 3 = A t² + B t + C, cu A = b − 3c2 + 3c1 − a, B = 2(c2 − 2c1 + a), C = c1 − a.
        const A = s.b[ax] - 3 * s.c2[ax] + 3 * s.c1[ax] - s.a[ax], B = 2 * (s.c2[ax] - 2 * s.c1[ax] + s.a[ax]), C = s.c1[ax] - s.a[ax];
        const t: number[] = [];
        if (Math.abs(A) < 1e-14) { if (Math.abs(B) > 1e-14) t.push(-C / B); }
        else {
          const D = B * B - 4 * A * C;
          if (D >= 0) t.push((-B + Math.sqrt(D)) / (2 * A), (-B - Math.sqrt(D)) / (2 * A));
        }
        for (const x of t) if (x > 0 && x < 1) q.push(punct(s, x));
      }
    }
  }
  return { minX: Math.min(...q.map((x) => x.x)), minY: Math.min(...q.map((x) => x.y)), maxX: Math.max(...q.map((x) => x.x)), maxY: Math.max(...q.map((x) => x.y)) };
}

/** Cercul unei forme: toate segmentele arce ale aceluiași cerc, legate cap la cap, 360° în total; altfel null. */
export function cerculFormei(f: FormaOracol): { readonly c: P; readonly r: number } | null {
  const a = f.seg[0];
  if (!f.inchis || !a || a.fel !== 'A') return null;
  let total = 0;
  for (let k = 0; k < f.seg.length; k++) {
    const s = f.seg[k] as Seg, urm = f.seg[(k + 1) % f.seg.length] as Seg;
    if (s.fel !== 'A' || Math.hypot(s.c.x - a.c.x, s.c.y - a.c.y) > 1e-9 * a.r || Math.abs(s.r - a.r) > 1e-9 * a.r) return null;
    if (Math.hypot(s.b.x - urm.a.x, s.b.y - urm.a.y) > 1e-9 * a.r) return null;
    total += s.du;
  }
  return Math.abs(Math.abs(total) - 2 * Math.PI) < 1e-9 ? { c: a.c, r: a.r } : null;
}

/**
 * Dreptunghiul unei forme: patru laturi drepte, două câte două paralele și perpendiculare pe vecinele lor, cu (la colțurile
 * rotunjite) câte un arc de 90° între ele, toate de aceeași rază; altfel null. Întoarce laturile (lungimile lor) și raza.
 */
export function dreptunghiulFormei(f: FormaOracol): { readonly laturi: readonly number[]; readonly raza: number } | null {
  if (!f.inchis) return null;
  const linii = f.seg.filter((s): s is Extract<Seg, { fel: 'L' }> => s.fel === 'L');
  const arce = f.seg.filter((s): s is Extract<Seg, { fel: 'A' }> => s.fel === 'A');
  if (linii.length !== 4 || (arce.length !== 0 && arce.length !== 4) || f.seg.length !== 4 + arce.length) return null;
  const raza = arce[0]?.r ?? 0;
  for (const a of arce) if (Math.abs(Math.abs(a.du) - Math.PI / 2) > 1e-9 || Math.abs(a.r - raza) > 1e-9 * Math.max(1, raza)) return null;
  // Laturile, în ordinea drumului, alternează cu arcele (dacă sunt).
  if (arce.length === 4) for (let k = 0; k < 8; k++) if ((f.seg[k] as Seg).fel !== (k % 2 === (f.seg[0]?.fel === 'L' ? 0 : 1) ? 'L' : 'A')) return null;
  const dir = linii.map((s) => ({ x: s.b.x - s.a.x, y: s.b.y - s.a.y }));
  const l = dir.map((x) => Math.hypot(x.x, x.y));
  for (let k = 0; k < 4; k++) {
    const u = dir[k] as P, w = dir[(k + 1) % 4] as P;
    if (Math.abs(u.x * w.x + u.y * w.y) > 1e-9 * (l[k] as number) * (l[(k + 1) % 4] as number)) return null;
  }
  if (Math.abs((l[0] as number) - (l[2] as number)) > 1e-9 * (l[0] as number) || Math.abs((l[1] as number) - (l[3] as number)) > 1e-9 * (l[1] as number)) return null;
  return { laturi: l, raza };
}

const identice = (a: FormaOracol, b: FormaOracol): boolean => JSON.stringify(a) === JSON.stringify(b);

/**
 * Judecata unei conversii, element cu element (aceeași ordine înainte și după): fiecare formă e neschimbată, sau a devenit ce
 * s-a cerut (fără cubice, la arce; un cerc; un dreptunghi), la cel mult toleranța de cea veche (Hausdorff, măsurat din nou),
 * iar cu mărimea dată, are mărimea cerută și centrul în centrul cutiei celei vechi (la ±0,001, criteriul pragului). Întoarce
 * abaterile (goală = bună), câte forme s-au schimbat și abaterea cea mai mare măsurată (doar „doar dacă e” și arce).
 */
export function judecaConversia(o: {
  readonly inainte: readonly FormaOracol[];
  readonly dupa: readonly FormaOracol[];
  readonly fel: 'arce' | 'cerc' | 'dreptunghi' | 'netezire';
  readonly toleranta: number;
  readonly diametru?: number | null;
  readonly marime?: { readonly latime: number; readonly inaltime: number } | null;
  /** La netezire: liniile mai lungi de atât (în lume) rămân. */
  readonly pastreaza?: number | null;
}): { readonly rau: string[]; readonly schimbate: number; readonly abatere: number } {
  const rau: string[] = [];
  let schimbate = 0, abatere = 0;
  if (o.inainte.length !== o.dupa.length) return { rau: [`elementele: ${o.dupa.length} după, ${o.inainte.length} înainte`], schimbate, abatere };
  const dat = (o.fel === 'cerc' && o.diametru != null) || (o.fel === 'dreptunghi' && o.marime != null);
  for (let k = 0; k < o.inainte.length; k++) {
    const a = o.inainte[k] as FormaOracol, b = o.dupa[k] as FormaOracol;
    if (identice(a, b)) continue;
    schimbate++;
    const e = `elementul ${k}`;
    if (o.fel === 'arce' && b.seg.some((s) => s.fel === 'C')) rau.push(`${e}: a rămas cu o cubică`);
    if ((o.fel === 'arce' || o.fel === 'netezire') && b.inchis !== a.inchis) rau.push(`${e}: s-a ${b.inchis ? 'închis' : 'deschis'}`);
    if (o.fel === 'netezire') for (const x of judecaNetezirea(a, b, o.toleranta, o.pastreaza ?? Infinity)) rau.push(`${e}: ${x}`);
    if (o.fel !== 'arce' && o.fel !== 'netezire' && !a.inchis) rau.push(`${e}: o cale deschisă a devenit ${o.fel}`);
    const cerc = o.fel === 'cerc' ? cerculFormei(b) : null;
    const drept = o.fel === 'dreptunghi' ? dreptunghiulFormei(b) : null;
    if (o.fel === 'cerc' && !cerc) rau.push(`${e}: nu e un cerc`);
    if (o.fel === 'dreptunghi' && !drept) rau.push(`${e}: nu e un dreptunghi`);
    if (dat) {
      const k0 = cutieForma(a), k1 = cutieForma(b);
      const c0 = { x: (k0.minX + k0.maxX) / 2, y: (k0.minY + k0.maxY) / 2 }, c1 = { x: (k1.minX + k1.maxX) / 2, y: (k1.minY + k1.maxY) / 2 };
      if (Math.hypot(c1.x - c0.x, c1.y - c0.y) > 1e-3) rau.push(`${e}: centrul (${c1.x}, ${c1.y}), nu al cutiei vechi (${c0.x}, ${c0.y})`);
      if (cerc && o.diametru != null && Math.abs(2 * cerc.r - o.diametru) > 1e-9 * o.diametru) rau.push(`${e}: diametrul ${2 * cerc.r}, nu ${o.diametru}`);
      if (drept && o.marime) {
        const w = k1.maxX - k1.minX, h = k1.maxY - k1.minY;
        if (Math.abs(w - o.marime.latime) > 1e-9 * o.marime.latime || Math.abs(h - o.marime.inaltime) > 1e-9 * o.marime.inaltime) {
          rau.push(`${e}: ${w} × ${h} (drept pe foaie), nu ${o.marime.latime} × ${o.marime.inaltime}`);
        }
      }
      continue;
    }
    const h = hausdorff(a, b);
    abatere = Math.max(abatere, h);
    if (h > o.toleranta + 1e-6) rau.push(`${e}: abaterea ${h} trece de toleranța ${o.toleranta}`);
  }
  return { rau, schimbate, abatere };
}

// ——— Felia 10.3↑e: netezirea ———

/** Pragul colțului ascuțit al netezirii (ADR 0180 §9, „la cod”): 60°, măsurat pe 4 × toleranța de fiecare parte. */
const COLT_NETEZIRE = Math.PI / 3;
const SCARA_NETEZIRE = 4;

const subP = (a: P, b: P): P => ({ x: a.x - b.x, y: a.y - b.y });
const lung = (v: P): number => Math.hypot(v.x, v.y);
const intoarcere = (u: P, v: P): number => Math.atan2(Math.abs(u.x * v.y - u.y * v.x), u.x * v.x + u.y * v.y);
const acelasi = (p: P, q: P): boolean => lung(subP(p, q)) <= 1e-9 * Math.max(1, lung(p));

/** Tangenta unui segment (sensul de mers), la început sau la capăt. */
function tangentaSeg(s: Seg, capat: boolean): P {
  if (s.fel === 'L') return subP(s.b, s.a);
  if (s.fel === 'A') {
    const u = s.u0 + (capat ? s.du : 0), sg = s.du < 0 ? -1 : 1;
    return { x: -Math.sin(u) * sg, y: Math.cos(u) * sg };
  }
  if (!capat) return lung(subP(s.c1, s.a)) > 1e-12 ? subP(s.c1, s.a) : lung(subP(s.c2, s.a)) > 1e-12 ? subP(s.c2, s.a) : subP(s.b, s.a);
  return lung(subP(s.b, s.c2)) > 1e-12 ? subP(s.b, s.c2) : lung(subP(s.b, s.c1)) > 1e-12 ? subP(s.b, s.c1) : subP(s.b, s.a);
}

/**
 * Punctul de la distanța D de vârful i, mergând doar pe linii scurte (înainte sau înapoi), sau null dacă șirul lor se termină
 * mai devreme (capătul căii, o linie lungă, un arc, o curbă): acolo întoarcerea nu se judecă.
 */
function laDistanta(f: FormaOracol, i: number, D: number, sens: 1 | -1, scurta: (s: Seg) => boolean): P | null {
  const m = f.seg.length;
  let rest = D;
  for (let pas = 0; pas < m; pas++) {
    const k = sens > 0 ? i + pas : i - 1 - pas;
    if (!f.inchis && (k < 0 || k >= m)) return null;
    const s = f.seg[((k % m) + m) % m] as Seg;
    if (!scurta(s)) return null;
    const l = lung(subP(s.b, s.a));
    if (l >= rest) {
      const t = rest / l;
      return sens > 0 ? { x: s.a.x + (s.b.x - s.a.x) * t, y: s.a.y + (s.b.y - s.a.y) * t } : { x: s.b.x + (s.a.x - s.b.x) * t, y: s.b.y + (s.a.y - s.b.y) * t };
    }
    rest -= l;
  }
  return null;
}

/** Netezirea unei forme, judecată față de cea veche (lista abaterilor; goală = bună). Hausdorff-ul îl măsoară judecata comună. */
export function judecaNetezirea(a: FormaOracol, b: FormaOracol, tol: number, pastreaza: number): string[] {
  const rau: string[] = [];
  const D = SCARA_NETEZIRE * tol;
  const scurta = (s: Seg): boolean => s.fel === 'L' && lung(subP(s.b, s.a)) <= pastreaza;
  const varfuriA = a.seg.map((s) => s.a).concat(a.inchis ? [] : a.seg.length ? [(a.seg[a.seg.length - 1] as Seg).b] : []);
  const esteVarfA = (p: P): boolean => varfuriA.some((q) => acelasi(p, q));
  const varfuriB = b.seg.map((s) => s.a).concat(b.inchis ? [] : b.seg.length ? [(b.seg[b.seg.length - 1] as Seg).b] : []);
  const esteVarfB = (p: P): boolean => varfuriB.some((q) => acelasi(p, q));
  // Ce trebuie să rămână: arcele, curbele, liniile lungi (peste „Păstrează”, cu o margine), întocmai.
  for (const s of a.seg) {
    const pastrat = s.fel !== 'L' || lung(subP(s.b, s.a)) > pastreaza * (1 + 1e-9);
    if (!pastrat) continue;
    const gasit = b.seg.some((t) => t.fel === s.fel && acelasi(t.a, s.a) && acelasi(t.b, s.b)
      && (t.fel !== 'A' || s.fel !== 'A' || (Math.abs(t.du - s.du) <= 1e-9 && acelasi(t.c, s.c)))
      && (t.fel !== 'C' || s.fel !== 'C' || (acelasi(t.c1, s.c1) && acelasi(t.c2, s.c2))));
    if (!gasit) rau.push(`segmentul păstrat ${s.fel} (${s.a.x.toFixed(4)}, ${s.a.y.toFixed(4)}) → (${s.b.x.toFixed(4)}, ${s.b.y.toFixed(4)}) lipsește`);
  }
  // Cubicele noi leagă vârfuri vechi.
  for (const t of b.seg) {
    if (t.fel !== 'C' || a.seg.some((s) => s.fel === 'C' && acelasi(s.a, t.a) && acelasi(s.b, t.b))) continue;
    if (!esteVarfA(t.a) || !esteVarfA(t.b)) { rau.push(`o cubică nouă nu pleacă și nu ajunge în vârfuri vechi (${t.a.x.toFixed(4)}, ${t.a.y.toFixed(4)})`); break; }
  }
  // Colțurile ascuțite (pe scara D, doar unde șirul de linii scurte ajunge de fiecare parte) rămân vârfuri.
  const m = a.seg.length;
  for (let i = a.inchis ? 0 : 1; i < (a.inchis ? m : m); i++) {
    const v = (a.seg[i % m] as Seg).a;
    const p0 = laDistanta(a, i, D, -1, scurta), p1 = laDistanta(a, i, D, 1, scurta);
    if (!p0 || !p1) continue;
    const u = intoarcere(subP(v, p0), subP(p1, v));
    if (u > COLT_NETEZIRE + Math.PI / 180 && !esteVarfB(v)) rau.push(`colțul de ${((u * 180) / Math.PI).toFixed(1)}° din (${v.x.toFixed(4)}, ${v.y.toFixed(4)}) a dispărut`);
  }
  // Nicio frântură ascuțită nouă: unde forma nouă se frânge cu peste 61°, și cea veche se frângea acolo cu peste 59°.
  const mb = b.seg.length;
  for (let j = b.inchis ? 0 : 1; j < mb; j++) {
    const prev = b.seg[(j - 1 + mb) % mb] as Seg, cur = b.seg[j] as Seg;
    const u = intoarcere(tangentaSeg(prev, true), tangentaSeg(cur, false));
    if (u <= COLT_NETEZIRE + Math.PI / 180) continue;
    const k = a.seg.findIndex((s) => acelasi(s.a, cur.a));
    const vechi = k < 0 || (!a.inchis && k === 0) ? 0 : intoarcere(tangentaSeg(a.seg[(k - 1 + m) % m] as Seg, true), tangentaSeg(a.seg[k] as Seg, false));
    if (vechi <= COLT_NETEZIRE - Math.PI / 180) rau.push(`o frântură nouă de ${((u * 180) / Math.PI).toFixed(1)}° în (${cur.a.x.toFixed(4)}, ${cur.a.y.toFixed(4)})`);
  }
  // Pe o cale închisă, vârful 0 rămâne primul.
  if (a.inchis && a.seg[0] && b.seg[0] && !acelasi(a.seg[0].a, b.seg[0].a)) rau.push('vârful 0 al căii închise s-a mutat');
  return rau;
}

/**
 * Judecata foarfecii (ADR 0181 §4; lista abaterilor, goală = bună): formele de după acoperă exact formele de dinainte (fiecare
 * punct vechi pe o formă nouă și invers), cu aceeași lungime în total; o tăietură nouă (un capăt nou) stă la cel mult `tol` de
 * clic; un contur închis devine o singură cale deschisă, unul deschis, două.
 */
export function judecaFoarfeca(o: { readonly inainte: readonly FormaOracol[]; readonly dupa: readonly FormaOracol[]; readonly punct: P; readonly tol: number }): string[] {
  const rau: string[] = [];
  for (const f of o.inainte) for (const q of esantioane(f, 48)) if (distantaLaForme(q, o.dupa) > 1e-6) { rau.push(`un punct vechi (${q.x.toFixed(4)}, ${q.y.toFixed(4)}) lipsește`); break; }
  for (const f of o.dupa) for (const q of esantioane(f, 48)) if (distantaLaForme(q, o.inainte) > 1e-6) { rau.push(`un punct nou (${q.x.toFixed(4)}, ${q.y.toFixed(4)}) e inventat`); break; }
  const la = (fs: readonly FormaOracol[]): number => fs.reduce((x, f) => x + lungimeForma(f), 0);
  if (Math.abs(la(o.inainte) - la(o.dupa)) > 1e-6 * Math.max(1, la(o.inainte))) rau.push(`lungimea: ${la(o.dupa)}, nu ${la(o.inainte)}`);
  const capete = (fs: readonly FormaOracol[]): P[] => fs.filter((f) => !f.inchis && f.seg.length > 0).flatMap((f) => [(f.seg[0] as Seg).a, (f.seg[f.seg.length - 1] as Seg).b]);
  const vechi = capete(o.inainte);
  const noi = capete(o.dupa).filter((q) => vechi.every((v) => Math.hypot(v.x - q.x, v.y - q.y) > 1e-6));
  if (noi.length === 0) rau.push('niciun capăt nou: nimic tăiat');
  for (const q of noi) if (Math.hypot(q.x - o.punct.x, q.y - o.punct.y) > o.tol + 1e-9) { rau.push(`tăietura (${q.x.toFixed(4)}, ${q.y.toFixed(4)}) e departe de clic`); break; }
  const deschise = o.dupa.filter((f) => !f.inchis).length - o.inainte.filter((f) => !f.inchis).length;
  if (deschise !== 1) rau.push(`căi deschise în plus: ${deschise}, nu 1 (un contur închis devine o cale; unul deschis, două)`);
  return rau;
}

/**
 * Judecata retezatului (ADR 0181 §5; lista abaterilor): nimic inventat (fiecare punct nou pe o formă veche); ce s-a scos conține
 * punctul de sub clic; niciun punct scos nu stă pe celelalte contururi (`alte`, cu care se taie), deci bucata scoasă nu trece de
 * un loc comun; fiecare capăt nou stă pe ele (bucata se oprește chiar în locul comun).
 */
export function judecaRetezarea(o: { readonly inainte: readonly FormaOracol[]; readonly dupa: readonly FormaOracol[]; readonly alte: readonly FormaOracol[]; readonly punct: P }): string[] {
  const rau: string[] = [];
  for (const f of o.dupa) for (const q of esantioane(f, 48)) if (distantaLaForme(q, o.inainte) > 1e-6) { rau.push(`un punct nou (${q.x.toFixed(4)}, ${q.y.toFixed(4)}) e inventat`); break; }
  if (o.dupa.length > 0 && distantaLaForme(o.punct, o.dupa) <= 1e-6) rau.push('punctul de sub clic a rămas');
  // Punctele scoase: ale formelor vechi, departe de cele noi; niciunul pe celelalte contururi (o margine de un micron la capete).
  for (const f of o.inainte) {
    for (const q of esantioane(f, 48)) {
      if (distantaLaForme(q, o.dupa) <= 1e-6) continue;
      if (o.alte.length > 0 && distantaLaForme(q, o.alte) <= 1e-9 && distantaLaForme(q, o.dupa) > 1e-3) { rau.push(`bucata scoasă trece de un loc comun, în (${q.x.toFixed(4)}, ${q.y.toFixed(4)})`); break; }
    }
  }
  const capete = (fs: readonly FormaOracol[]): P[] => fs.filter((f) => !f.inchis && f.seg.length > 0).flatMap((f) => [(f.seg[0] as Seg).a, (f.seg[f.seg.length - 1] as Seg).b]);
  const vechi = capete(o.inainte);
  for (const q of capete(o.dupa)) {
    if (vechi.some((v) => Math.hypot(v.x - q.x, v.y - q.y) <= 1e-6)) continue;
    if (o.alte.length === 0 || distantaLaForme(q, o.alte) > 1e-6) { rau.push(`un capăt nou (${q.x.toFixed(4)}, ${q.y.toFixed(4)}) nu stă într-un loc comun`); break; }
  }
  return rau;
}

// ——— Felia 10.3↑h (ADR 0181 §2, §3): linia la orice unghi, partea păstrată, capetele prelungite ———

/** Poligonul tăiat cu semiplanul `semn · (n · q − v) ≥ 0` (Sutherland–Hodgman), pentru orice normală n. */
function taieSemiplan(p: readonly P[], n: P, v: number, semn: number): P[] {
  const f = (q: P): number => semn * (n.x * q.x + n.y * q.y - v);
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

/** Aria regiunii par-impar a contururilor închise, tăiate întâi cu semiplanul `semn · (n · q − v) ≥ 0`. */
export function arieParSemiplan(forme: readonly FormaOracol[], n: P, v: number, semn: number): number {
  const poligoane = forme.filter((f) => f.inchis).map((f) => {
    const p = esantioane(f, 512);
    return p.filter((q, i) => i === 0 || Math.hypot(q.x - (p[i - 1] as P).x, q.y - (p[i - 1] as P).y) > 0);
  });
  let a = 0;
  for (let i = 0; i < poligoane.length; i++) {
    const p = poligoane[i] as P[];
    const q0 = p[0] as P, q1 = p[1] ?? q0;
    const mij = { x: (q0.x + q1.x) / 2, y: (q0.y + q1.y) / 2 };
    let adancime = 0;
    for (let j = 0; j < poligoane.length; j++) if (j !== i && inPoligon(mij, poligoane[j] as P[])) adancime++;
    const t = taieSemiplan(p, n, v, semn);
    a += (adancime % 2 === 0 ? 1 : -1) * Math.abs(t.length >= 3 ? ariePoligon(t) : 0);
  }
  return a;
}

/**
 * Judecata unei tăieri cu o linie oarecare, n · q = v (n unitară; lista abaterilor): acoperirea (fiecare punct vechi pe o formă
 * nouă) și nimic inventat (fiecare punct nou pe o formă veche sau pe linie); fiecare parte de o singură parte a liniei; cu
 * închidere, aria părților de fiecare parte e aria regiunii vechi de partea aceea. `doua`: exact două părți, una de fiecare
 * parte (linia din panou); altfel oricâte (cuțitul tras: fiecare față și fiecare bucată, o parte). `doar` (ADR 0181 §2,
 * „Păstrează”): semnul părții păstrate; atunci se acoperă doar punctele vechi de partea ei, iar de cealaltă nu rămâne nimic.
 */
export function judecaLinia(o: {
  readonly inainte: readonly FormaOracol[];
  readonly parti: ReadonlyArray<readonly FormaOracol[]>;
  readonly n: P;
  readonly v: number;
  readonly inchide: boolean;
  readonly doua: boolean;
  readonly doar?: 1 | -1;
}): string[] {
  const rau: string[] = [];
  const fata = (q: P): number => o.n.x * q.x + o.n.y * q.y - o.v;
  const toate = o.parti.flat();
  for (const f of o.inainte) {
    for (const q of esantioane(f, 48)) {
      if (o.doar !== undefined && o.doar * fata(q) <= 1e-7) continue;
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
  // Partea fiecărei părți: 1 sau −1 (0: toată pe linie; 2: de ambele părți).
  const laturi = o.parti.map((parte) => {
    let s = 0;
    for (const f of parte) {
      for (const q of esantioane(f, 16)) {
        const z = fata(q);
        if (Math.abs(z) <= 1e-7) continue;
        const w = z > 0 ? 1 : -1;
        if (s === 0) s = w;
        else if (s !== w) return 2;
      }
    }
    return s;
  });
  if (laturi.includes(2)) rau.push('o parte trece linia');
  const doar = o.doar;
  if (doar !== undefined) {
    if (laturi.some((s) => s === -doar)) rau.push('a rămas ceva de partea ștearsă');
    if (o.doua && o.parti.length !== 1) rau.push(`părțile: ${o.parti.length}, nu 1`);
  } else if (o.doua) {
    if (o.parti.length !== 2) rau.push(`părțile: ${o.parti.length}, nu 2`);
    else if (!(laturi.includes(1) && laturi.includes(-1))) rau.push('părțile nu sunt de o parte și de alta');
  }
  if (o.inchide && !laturi.includes(2)) {
    for (const s of o.doar !== undefined ? [o.doar] : ([-1, 1] as const)) {
      const asteptat = arieParSemiplan(o.inainte, o.n, o.v, s);
      const are = o.parti.reduce((a, parte, k) => a + (laturi[k] === s ? ariePar(parte) : 0), 0);
      if (Math.abs(are - asteptat) > 1e-4 * Math.max(1, Math.abs(ariePar(o.inainte)))) rau.push(`aria de partea ${s > 0 ? '+' : '−'}: ${are}, nu ${asteptat}`);
    }
  }
  return rau;
}

/**
 * Judecata părții păstrate cu un cuțit închis, convex (`k`, trigonometric; lista abaterilor): ce rămâne stă înăuntrul lui
 * (`inauntru`) sau în afară, acoperă punctele vechi de partea aceea, nu inventează nimic (pe formele vechi sau pe cuțit) și, cu
 * închidere, are aria regiunii vechi de partea aceea.
 */
export function judecaPastrareaConvex(o: {
  readonly inainte: readonly FormaOracol[];
  readonly ramase: readonly FormaOracol[];
  readonly k: readonly P[];
  readonly inauntru: boolean;
  readonly inchide: boolean;
}): string[] {
  const rau: string[] = [];
  const pe = (q: P): boolean => laPoligon(q, o.k) <= 1e-6;
  const deParte = (q: P): boolean => inPoligon(q, o.k) === o.inauntru;
  for (const f of o.inainte) {
    for (const q of esantioane(f, 48)) {
      if (pe(q) || !deParte(q)) continue;
      const d = distantaLaForme(q, o.ramase);
      if (d > 1e-6) { rau.push(`un punct vechi de partea păstrată (${q.x.toFixed(4)}, ${q.y.toFixed(4)}) lipsește (${d})`); break; }
    }
  }
  for (const f of o.ramase) {
    for (const q of esantioane(f, 48)) {
      if (pe(q)) continue;
      if (!deParte(q)) { rau.push(`a rămas un punct de partea ștearsă (${q.x.toFixed(4)}, ${q.y.toFixed(4)})`); break; }
      if (distantaLaForme(q, o.inainte) > 1e-6) { rau.push(`un punct nou (${q.x.toFixed(4)}, ${q.y.toFixed(4)}) nu e nici pe forma veche, nici pe cuțit`); break; }
    }
  }
  if (o.inchide) {
    const tot = ariePar(o.inainte), inK = arieParInConvex(o.inainte, o.k);
    const asteptat = o.inauntru ? inK : tot - inK;
    const are = ariePar(o.ramase);
    if (Math.abs(are - asteptat) > 1e-4 * Math.max(1, Math.abs(tot))) rau.push(`aria părții păstrate: ${are}, nu ${asteptat}`);
  }
  return rau;
}

// ——— Felia 10.3↑i (ADR 0181 §2): spațiul și suprapunerea ———

/**
 * Judecata spațiului sau a suprapunerii cu o linie n · q = v (n unitară) și lățimea w (lista abaterilor). Partea de semn s e
 * regiunea veche tăiată cu semiplanul s · (n · q − v) ≥ σ · w / 2 (σ = 1 la spațiu, −1 la suprapunere), deci:
 * - fiecare parte stă de partea ei a liniei mutate (la spațiu, fiecare punct al ei la cel puțin w / 2 de cuțit);
 * - acoperirea: fiecare punct vechi de dincolo de linia mutată stă pe o formă nouă de partea lui;
 * - nimic inventat: fiecare punct nou stă pe o formă veche sau pe linia mutată;
 * - aria părților de fiecare parte e aria regiunii vechi tăiate cu semiplanul ei;
 * - la spațiu, bucățile stau la cel puțin w una de alta; la suprapunere, partea lor comună are lățimea w: ariile celor două
 *   părți depășesc aria veche cu aria fâșiei |n · q − v| ≤ w / 2.
 * O parte toată în fâșia suprapunerii (un ciot de cale de lângă cuțit) se potrivește ambelor laturi: se încearcă amândouă.
 * `doar`: semnul singurei părți păstrate. `doua`: exact o parte de fiecare latură (linia din panou); altfel oricâte.
 */
export function judecaSpatiul(o: {
  readonly inainte: readonly FormaOracol[];
  readonly parti: ReadonlyArray<readonly FormaOracol[]>;
  readonly n: P;
  readonly v: number;
  readonly fel: 'spatiu' | 'suprapunere';
  readonly latime: number;
  readonly doua: boolean;
  readonly doar?: 1 | -1;
}): string[] {
  const d = o.latime / 2, sigma = o.fel === 'spatiu' ? 1 : -1;
  const fata = (q: P): number => o.n.x * q.x + o.n.y * q.y - o.v;
  // Laturile în care încape fiecare parte: s, dacă toată stă în s · fata ≥ σ · d.
  const incape = o.parti.map((parte) => {
    const z = parte.flatMap((f) => esantioane(f, 32)).map(fata);
    return ([1, -1] as const).filter((s) => z.length > 0 && z.every((x) => s * x >= sigma * d - 1e-7));
  });
  if (incape.some((x) => x.length === 0)) return ['o parte trece de linia ei mutată'];
  const nehotarate = incape.flatMap((x, k) => (x.length === 2 ? [k] : []));
  let primele: string[] | null = null;
  for (let masca = 0; masca < 1 << Math.min(nehotarate.length, 8); masca++) {
    const laturi = incape.map((x, k) => {
      const i = nehotarate.indexOf(k);
      return i < 0 ? (x[0] as 1 | -1) : (masca >> i) & 1 ? 1 : -1;
    });
    const rau = judecaSpatiulPeLaturi(o, laturi, d, sigma, fata);
    if (rau.length === 0) return [];
    primele ??= rau;
  }
  return primele ?? [];
}

/** `judecaSpatiul`, cu latura fiecărei părți dată. */
function judecaSpatiulPeLaturi(
  o: Parameters<typeof judecaSpatiul>[0], laturi: ReadonlyArray<1 | -1>, d: number, sigma: number, fata: (q: P) => number,
): string[] {
  const rau: string[] = [];
  const doar = o.doar;
  if (doar !== undefined) {
    if (laturi.some((s) => s === -doar)) rau.push('a rămas ceva de partea ștearsă');
    if (o.doua && o.parti.length !== 1) rau.push(`părțile: ${o.parti.length}, nu 1`);
  } else if (o.doua && (o.parti.length !== 2 || !(laturi.includes(1) && laturi.includes(-1)))) {
    rau.push(`părțile nu sunt două, de o parte și de alta (${laturi.join(', ')})`);
  }
  if (rau.length > 0) return rau;
  const tot = ariePar(o.inainte);
  for (const s of doar !== undefined ? [doar] : [-1, 1]) {
    const ale = o.parti.filter((_, k) => laturi[k] === s).flat();
    const vMutat = o.v + s * sigma * d;
    for (const f of o.inainte) {
      for (const q of esantioane(f, 48)) {
        if (s * fata(q) <= sigma * d + 1e-7) continue;
        const dist = distantaLaForme(q, ale);
        if (dist > 1e-6) { rau.push(`un punct vechi de partea ${s > 0 ? '+' : '−'} (${q.x.toFixed(4)}, ${q.y.toFixed(4)}) lipsește (${dist})`); break; }
      }
    }
    for (const f of ale) {
      for (const q of esantioane(f, 48)) {
        if (Math.abs(o.n.x * q.x + o.n.y * q.y - vMutat) <= 1e-7) continue;
        const dist = distantaLaForme(q, o.inainte);
        if (dist > 1e-6) { rau.push(`un punct nou (${q.x.toFixed(4)}, ${q.y.toFixed(4)}) nu e nici pe forma veche (${dist}), nici pe linia mutată`); break; }
      }
    }
    const asteptat = arieParSemiplan(o.inainte, o.n, vMutat, s);
    const are = ariePar(ale);
    if (Math.abs(are - asteptat) > 1e-4 * Math.max(1, Math.abs(tot))) rau.push(`aria de partea ${s > 0 ? '+' : '−'}: ${are}, nu ${asteptat}`);
  }
  if (doar === undefined && rau.length === 0) {
    const A = o.parti.filter((_, k) => laturi[k] === -1).flat(), B = o.parti.filter((_, k) => laturi[k] === 1).flat();
    if (o.fel === 'spatiu') {
      for (const q of A.flatMap((f) => esantioane(f, 48))) {
        const dist = distantaLaForme(q, B);
        if (dist < o.latime - 1e-6) { rau.push(`între bucăți, doar ${dist}, nu ${o.latime}`); break; }
      }
    } else {
      const fasie = arieParSemiplan(o.inainte, o.n, o.v - d, 1) - arieParSemiplan(o.inainte, o.n, o.v + d, 1);
      const comun = ariePar(A) + ariePar(B) - tot;
      if (Math.abs(comun - fasie) > 1e-4 * Math.max(1, Math.abs(tot))) rau.push(`partea comună: ${comun}, nu fâșia de ${o.latime} (${fasie})`);
    }
  }
  return rau;
}

/**
 * Ar mânca spațiul o bucată întreagă de partea păstrată? `dist(q)`: distanța cu semn a punctului față de cuțit, pozitivă de
 * partea păstrată (la linie, s · (n · q − v); la un poligon convex, cu semnul laturii). Pe o rețea de pas `pas` mm, regiunea
 * veche (par-impar) de partea păstrată, pe componente conexe (cei opt vecini: vârful îngust al unei pene, între o margine și
 * cuțit, rămâne legat), cercetată doar în fâșia de lângă cuțit: o componentă care atinge ce e dincolo de fâșie trece; altfel,
 * cel mai mare `dist` al ei decide (sub w / 2, cu o margine de doi pași: mâncată). O componentă de câteva celule e sub
 * rezoluție: cel mult nehotărâtă. Căile deschise: fiecare bucată a lor de partea păstrată (între treceri, eșantionată des), la
 * fel. Întoarce 'da', 'nu' sau 'nehotarat' (lângă prag, sub rezoluția rețelei).
 */
export function mancatRaster(forme: readonly FormaOracol[], dist: (q: P) => number, latime: number, pas = 0.25): 'da' | 'nu' | 'nehotarat' {
  const d = latime / 2, marja = 2 * pas, prag = d + marja + pas;
  let rez = 'nu' as 'da' | 'nu' | 'nehotarat';
  const judeca = (max: number): void => {
    if (max < d - marja) rez = 'da';
    else if (max <= d + marja && rez === 'nu') rez = 'nehotarat';
  };
  const mancata = (): boolean => rez === 'da';
  for (const f of forme) {
    if (f.inchis) continue;
    let max = -Infinity;
    for (const q of esantioane(f, 4096)) {
      const z = dist(q);
      if (z > 0) max = Math.max(max, z);
      else if (max > -Infinity) { judeca(max); max = -Infinity; }
    }
    if (max > -Infinity) judeca(max);
  }
  const poligoane = forme.filter((f) => f.inchis).map((f) => esantioane(f, 1024));
  if (poligoane.length === 0 || rez === 'da') return rez;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of poligoane) for (const q of p) { minX = Math.min(minX, q.x); minY = Math.min(minY, q.y); maxX = Math.max(maxX, q.x); maxY = Math.max(maxY, q.y); }
  const nx = Math.ceil((maxX - minX) / pas) + 1, ny = Math.ceil((maxY - minY) / pas) + 1;
  // 0: gol sau de cealaltă parte; 1: în fâșie (de cercetat); 2: dincolo de fâșie.
  const stare = new Uint8Array(nx * ny);
  const z = new Float64Array(nx * ny);
  const xs: number[] = [];
  for (let j = 0; j < ny; j++) {
    const y = minY + (j + 0.5) * pas;
    xs.length = 0;
    for (const p of poligoane) {
      for (let i = 0; i < p.length; i++) {
        const a = p[i] as P, b = p[(i + 1) % p.length] as P;
        if ((a.y > y) !== (b.y > y)) xs.push(a.x + ((y - a.y) * (b.x - a.x)) / (b.y - a.y));
      }
    }
    xs.sort((u, w) => u - w);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const i0 = Math.max(0, Math.ceil(((xs[k] as number) - minX) / pas - 0.5)), i1 = Math.min(nx - 1, Math.floor(((xs[k + 1] as number) - minX) / pas - 0.5));
      for (let i = i0; i <= i1; i++) {
        const zz = dist({ x: minX + (i + 0.5) * pas, y });
        if (!(zz > 0)) continue;
        stare[j * nx + i] = zz > prag ? 2 : 1;
        z[j * nx + i] = zz;
      }
    }
  }
  const vazut = new Uint8Array(nx * ny);
  const stiva: number[] = [];
  for (let s0 = 0; s0 < nx * ny; s0++) {
    if (stare[s0] !== 1 || vazut[s0]) continue;
    let max = -Infinity, trece = false, celule = 0;
    stiva.length = 0;
    stiva.push(s0);
    vazut[s0] = 1;
    while (stiva.length > 0) {
      const c = stiva.pop() as number;
      celule++;
      max = Math.max(max, z[c] as number);
      const i = c % nx, j = (c - i) / nx;
      for (let jj = j - 1; jj <= j + 1; jj++) {
        for (let ii = i - 1; ii <= i + 1; ii++) {
          if (ii < 0 || jj < 0 || ii >= nx || jj >= ny || (ii === i && jj === j)) continue;
          const v = jj * nx + ii;
          if (stare[v] === 2) trece = true;
          else if (stare[v] === 1 && !vazut[v]) { vazut[v] = 1; stiva.push(v); }
        }
      }
    }
    if (trece) continue;
    if (celule < 6) { if (rez === 'nu') rez = 'nehotarat'; continue; }
    judeca(max);
    if (mancata()) return 'da';
  }
  return rez;
}

/** Distanța cu semn a lui q față de marginea poligonului convex k: pozitivă înăuntru, negativă în afară. */
export function distantaConvex(q: P, k: readonly P[]): number {
  const m = laPoligon(q, k);
  return inPoligon(q, k) ? m : -m;
}

/** Poligonul convex k (trigonometric) strâns cu d (fiecare latură mutată înăuntru): tot un poligon convex, sau gol. */
export function convexStrans(k: readonly P[], d: number): P[] {
  let rez: P[] = [...k];
  for (let i = 0; i < k.length && rez.length > 0; i++) {
    const a = k[i] as P, b = k[(i + 1) % k.length] as P;
    const l = Math.hypot(b.x - a.x, b.y - a.y);
    const n = { x: -(b.y - a.y) / l, y: (b.x - a.x) / l };
    rez = taieSemiplan(rez, n, n.x * a.x + n.y * a.y + d, 1);
  }
  return rez.length >= 3 ? rez : [];
}

/** Poligonul convex k (trigonometric) crescut cu d: laturile mutate în afară, colțurile arce de rază d, prin `pe` coarde fiecare. */
export function convexCrescut(k: readonly P[], d: number, pe = 256): P[] {
  const rez: P[] = [];
  const n = k.length;
  for (let i = 0; i < n; i++) {
    const a = k[(i - 1 + n) % n] as P, b = k[i] as P, c = k[(i + 1) % n] as P;
    const u1 = Math.atan2(-(b.x - a.x), b.y - a.y), u2 = Math.atan2(-(c.x - b.x), c.y - b.y);
    let du = u2 - u1;
    while (du < 0) du += 2 * Math.PI;
    while (du >= 2 * Math.PI) du -= 2 * Math.PI;
    for (let t = 0; t <= pe; t++) rez.push({ x: b.x + d * Math.cos(u1 + (du * t) / pe), y: b.y + d * Math.sin(u1 + (du * t) / pe) });
  }
  return rez;
}

/**
 * Judecata spațiului sau a suprapunerii cu un cuțit închis convex k (trigonometric) și lățimea w (lista abaterilor). Partea
 * dinăuntru e regiunea veche din k strâns (spațiul) sau crescut (suprapunerea) cu w / 2; cea din afară, regiunea veche din
 * afara lui k crescut (spațiul) sau strâns (suprapunerea): fiecare stă acolo, acoperă punctele vechi de acolo, nu inventează
 * nimic (pe forma veche sau pe cuțitul mutat) și are aria regiunii vechi de acolo. `inauntru`, `afara`: formele părților (cea
 * nepăstrată, null).
 */
export function judecaConvexMutat(o: {
  readonly inainte: readonly FormaOracol[];
  readonly inauntru: readonly FormaOracol[] | null;
  readonly afara: readonly FormaOracol[] | null;
  readonly k: readonly P[];
  readonly fel: 'spatiu' | 'suprapunere';
  readonly latime: number;
}): string[] {
  const rau: string[] = [];
  const d = o.latime / 2;
  const strans = convexStrans(o.k, d), crescut = convexCrescut(o.k, d);
  const tol = 1e-3;
  const tot = ariePar(o.inainte);
  const parti: Array<{ readonly nume: string; readonly forme: readonly FormaOracol[]; readonly mutat: readonly P[]; readonly inK: boolean }> = [];
  if (o.inauntru) parti.push({ nume: 'înăuntru', forme: o.inauntru, mutat: o.fel === 'spatiu' ? strans : crescut, inK: true });
  if (o.afara) parti.push({ nume: 'în afară', forme: o.afara, mutat: o.fel === 'spatiu' ? crescut : strans, inK: false });
  for (const p of parti) {
    const goala = p.mutat.length < 3;
    const deParte = (q: P): boolean => (goala ? !p.inK : inPoligon(q, p.mutat) === p.inK);
    const pe = (q: P): boolean => !goala && laPoligon(q, p.mutat) <= tol;
    for (const f of o.inainte) {
      for (const q of esantioane(f, 48)) {
        if (pe(q) || !deParte(q)) continue;
        const dist = distantaLaForme(q, p.forme);
        if (dist > 1e-6) { rau.push(`${p.nume}: un punct vechi (${q.x.toFixed(4)}, ${q.y.toFixed(4)}) lipsește (${dist})`); break; }
      }
    }
    for (const f of p.forme) {
      for (const q of esantioane(f, 48)) {
        if (pe(q)) continue;
        if (!deParte(q)) { rau.push(`${p.nume}: un punct (${q.x.toFixed(4)}, ${q.y.toFixed(4)}) de cealaltă parte a cuțitului mutat`); break; }
        if (distantaLaForme(q, o.inainte) > 1e-6) { rau.push(`${p.nume}: un punct nou (${q.x.toFixed(4)}, ${q.y.toFixed(4)}) nu e nici pe forma veche, nici pe cuțitul mutat`); break; }
      }
    }
    const inMutat = goala ? 0 : arieParInConvex(o.inainte, p.mutat);
    const asteptat = p.inK ? inMutat : tot - inMutat;
    const are = ariePar(p.forme);
    if (Math.abs(are - asteptat) > 1e-4 * Math.max(1, Math.abs(tot))) rau.push(`${p.nume}: aria ${are}, nu ${asteptat}`);
  }
  return rau;
}

// ——— Felia 10.3↑j (ADR 0181 §6): îmbinarea ———

/** Poligoanele dese ale formelor închise. */
const poligoaneInchise = (forme: readonly FormaOracol[]): P[][] => forme.filter((f) => f.inchis).map((f) => esantioane(f, 256));
/** Punctul q stă în regiunea par-impar a poligoanelor? */
const inRegiunePar = (q: P, pol: readonly P[][]): boolean => pol.filter((p) => inPoligon(q, p)).length % 2 === 1;

/**
 * Judecata unei tăieri cu îmbinare (ADR 0181 §6; lista abaterilor): reuniunea bucăților e forma veche, iar distanța dintre ele e
 * jocul. Fără joc, ariile bucăților fac aria formei vechi și niciun punct al unei bucăți nu stă înăuntrul alteia (doar pe
 * marginea comună); cu joc, fiecare punct al unei bucăți stă la cel puțin jocul de celelalte, iar undeva chiar la el (de-a
 * lungul îmbinării). Niciun punct nou în afara formei vechi. `dinte`, dacă e dat: cât trebuie să se depărteze măcar un punct nou
 * de linia n · q = v (dinții chiar se văd).
 */
export function judecaImbinarea(o: {
  readonly inainte: readonly FormaOracol[];
  readonly parti: ReadonlyArray<readonly FormaOracol[]>;
  readonly joc: number;
  readonly dinte?: { readonly n: P; readonly v: number; readonly cat: number };
}): string[] {
  const rau: string[] = [];
  const tot = ariePar(o.inainte);
  const probe = o.parti.map((parte) => parte.flatMap((f) => esantioane(f, 48)));
  const vechi = poligoaneInchise(o.inainte), noi = o.parti.map(poligoaneInchise);
  for (const [k, ps] of probe.entries()) {
    for (const q of ps) {
      if (distantaLaForme(q, o.inainte) <= 1e-6 || inRegiunePar(q, vechi)) continue;
      rau.push(`partea ${k}: un punct (${q.x.toFixed(4)}, ${q.y.toFixed(4)}) în afara formei vechi`);
      break;
    }
  }
  if (o.joc === 0) {
    const suma = o.parti.reduce((a, parte) => a + ariePar(parte), 0);
    if (Math.abs(suma - tot) > 1e-4 * Math.max(1, Math.abs(tot))) rau.push(`ariile bucăților: ${suma}, nu ${tot}`);
    for (const [k, ps] of probe.entries()) {
      for (const [j, alta] of o.parti.entries()) {
        if (j === k) continue;
        const q = ps.find((x) => inRegiunePar(x, noi[j] as P[][]) && distantaLaForme(x, alta) > 1e-6);
        if (q) { rau.push(`partea ${k} intră în partea ${j}, în (${q.x.toFixed(4)}, ${q.y.toFixed(4)})`); break; }
      }
    }
  } else if (o.parti.length > 1) {
    let min = Infinity;
    for (const [k, ps] of probe.entries()) {
      for (const [j, alta] of o.parti.entries()) {
        if (j <= k) continue;
        for (const q of ps) min = Math.min(min, distantaLaForme(q, alta));
      }
    }
    if (min < o.joc - 1e-6) rau.push(`între bucăți, doar ${min}, nu ${o.joc}`);
    if (min > o.joc + 1e-3) rau.push(`bucățile nu se apropie la joc (${min}, nu ${o.joc})`);
  }
  if (o.dinte) {
    const d = o.dinte;
    const max = Math.max(...probe.flat().filter((q) => distantaLaForme(q, o.inainte) > 1e-6).map((q) => Math.abs(d.n.x * q.x + d.n.y * q.y - d.v)), 0);
    if (max < d.cat) rau.push(`dinții nu se văd: cel mai departe de linie, ${max}, sub ${d.cat}`);
  }
  return rau;
}
