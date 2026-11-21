// Motorul atelierului: piese compatibile LEGO ca corpuri inchise (STL), gata asezate pentru printare.
//
// Masurile LEGO: pasul de 8 mm, caramida 9,6 mm (3 placi de 3,2), stiftul de 4,8 mm, 0,1 mm joc pe fiecare latura (piesa
// de n stifturi are 8n - 0,2 mm). Inaltimea stiftului (implicit 1,9, la LEGO 1,7) si adancimea locasului de sub o piesa
// plina (implicit 2,1) vin din profilul imprimantei, la zecimi (ADR 0168, `inaltimi`). Dedesubt, stiftul piesei de jos e prins intre perete (gros de
// 1,5 mm) si tub (Ø 6,51) sau, la piesele late de un stift, intre pereti si stiftul mic dintre stifturi (Ø 3,2).
// Technic: gaura Ø 4,8 cu lamaj Ø 6,2 x 0,8, grinda lata de 7,2 si groasa de 7,8 (subtire 3,8), axul in cruce de 4,8
// cu bratele de 1,8, gaurile caramizii Technic la 5,8 mm de jos.
// Printat (FDM), stifturile ies de obicei mai groase si gaurile mai mici: jocurile de mai jos sunt cele de pornire,
// iar setul de calibrare arata, pe imprimanta ta, care din cele 5 variante se potriveste cu piesele LEGO adevarate.
//
// Fiecare piesa e facuta din corpuri inchise care se pot suprapune putin (feliatorul le uneste); fiecare corp e
// watertight, cu fetele orientate spre exterior.
var Lego = (function (glob: typeof globalThis) {
  "use strict";
  type P2 = [number, number];
  type P3 = [number, number, number];
  /** Un punct: [x, y] sau [x, y, z] (ce e după y nu contează aici). */
  type Pt = readonly [number, number, ...number[]];
  /** Un triunghi al unui corp închis, cu fața spre exterior (vârfurile în sens trigonometric privite din afară). */
  type Tri = [P3, P3, P3];
  type Poli = P2[];
  /** Un vârf de contur Cavalier: x, y, bulge. */
  type Vf = [number, number, number];
  /** O formă care se scade: poligonul (trigonometric) și conturul Cavalier, cu arce. */
  type Forma = { p: Poli; pl: Vf[] };
  /** O celulă a grilei de 8 mm. */
  type Celula = [number, number];
  /** O gaură verticală pe grilă: colțul de celulă (între știfturi) și tipul („r”, „x”). */
  type GauraGrila = readonly [number, number, string];
  type GauraPusa = { a: number; b: number; t: string; c: P2 };
  type Corp = { tri: Tri[]; avert: string[] };
  /** Ce mai spun unele piese: unghiul pantei sau al tăieturii, câte știfturi, locașuri și găuri au ieșit. */
  type Rezultat = Corp & { unghi?: number; stifturi?: number; locasuri?: number; deschise?: number; gauri?: number };
  /** Discul scos dintr-un poligon: buclele rămase sau o gaură întreagă. */
  type Disc = { bucle: Poli[]; gaura?: never } | { gaura: true; bucle?: never };
  type Ef = ReturnType<typeof ef>;
  /** Definiția unei piese: tipul și parametrii funcției lui. */
  type DefPiesa = { [K in keyof typeof TIPURI]: { tip: K } & Parameters<(typeof TIPURI)[K]>[0] }[keyof typeof TIPURI];
  const IMPLICIT = {
    pas: 8, joc_lateral: 0.1, placa: 3.2, sus: 1.0,
    stift_d: 4.8, perete: 1.5, tub_contact: 4 * Math.SQRT2 - 2.4,
    // inaltimile din profilul imprimantei (ADR 0168; pana la 18.8.0: 1,8 si stiftul + 0,2)
    stift_h: 1.9, locas_h: 2.1,
    // jocurile pentru printare (varianta 3 = cele de aici); fiecare varianta muta cu pasul ei
    joc_locas: 0.1, gaura_d: 5.0, lamaj_d: 6.4, lamaj_h: 0.8, ax_gaura_d: 5.0, ax_gaura_lat: 2.0,
    ax_d: 4.75, ax_lat: 1.75, stift_technic_d: 4.75, guler_d: 6.0, guler_lat: 1.6,
    grinda_lat: 7.2, grinda_groasa: 7.8, grinda_subtire: 3.8, technic_h: 5.8,
    // bare si cleme (Ø 3,2 la LEGO), bila si cupa articulatiei (Ø 5,9), bucsa
    bara_d: 3.2, bara_gaura_d: 3.4, clema_d: 3.3, clema_perete: 1.1, clema_gura: 2.5, bila_d: 5.9, cupa_d: 6.1, cupa_gura: 5.2,
    bucsa_d: 7.2,
    // rotitele dintate (ADR 0169): jocul pe flanc, pe cercul de divizare (varianta 3; 0,05 ... 0,25 mm la calibrare)
    joc_dinti: 0.15,
    varianta_stift: 3, varianta_locas: 3, varianta_gaura: 3, varianta_ax: 3, varianta_bara: 3, varianta_cupa: 3, varianta_dinti: 3,
    // janta tiparita (ADR 0280): varianta muta diametrul scaunului anvelopei, ca o anvelopa LEGO sau din TPU sa stea strans
    varianta_janta: 3,
    pas_stift: 0.05, pas_locas: 0.05, pas_gaura: 0.1, pas_ax: 0.1, pas_bara: 0.1, pas_cupa: 0.1, pas_dinti: 0.05, pas_janta: 0.1,
    pat: [180, 180] as [number, number], pat_margine: 5, pat_distanta: 4,
  };
  let P = { ...IMPLICIT };
  // inaltimile din profilul imprimantei (ADR 0168): la zecimi, in margini; ce nu e numar ia implicitul, iar locasul urmeaza
  // stiftul (+ 0,2) cat bifa nu e oprita anume (un profil de dinainte de 18.8.0 n-o are)
  const zecime = (x: number): number => Math.round(x * 10) / 10;
  const MARGINI_INALTIMI = { stift_h: [1, 3], locas_h: [1, 4] } as const;
  function inaltimi(v: { stift_h?: unknown; locas_h?: unknown; locas_urmeaza?: unknown } | null | undefined): { stift_h: number; locas_h: number } {
    const citeste = (x: unknown, [a, b]: readonly [number, number], implicit: number): number => {
      const n = typeof x === "number" ? x : typeof x === "string" && x.trim() !== "" ? +x.replace(",", ".") : NaN;
      return Number.isFinite(n) ? Math.min(b, Math.max(a, zecime(n))) : implicit;
    };
    const stift_h = citeste(v?.stift_h, MARGINI_INALTIMI.stift_h, IMPLICIT.stift_h);
    const locas_h = v?.locas_urmeaza !== false ? Math.min(MARGINI_INALTIMI.locas_h[1], zecime(stift_h + 0.2))
      : citeste(v?.locas_h, MARGINI_INALTIMI.locas_h, IMPLICIT.locas_h);
    return { stift_h, locas_h };
  }
  // masurile efective, cu variantele alese la calibrare
  const ef = () => ({
    stiftD: P.stift_d + (P.varianta_stift - 3) * P.pas_stift,
    joc: P.joc_locas + (P.varianta_locas - 3) * P.pas_locas,
    gauraD: P.gaura_d + (P.varianta_gaura - 3) * P.pas_gaura,
    lamajD: P.lamaj_d + (P.varianta_gaura - 3) * P.pas_gaura,
    axGauraD: P.ax_gaura_d + (P.varianta_ax - 3) * P.pas_ax,
    axGauraLat: P.ax_gaura_lat + (P.varianta_ax - 3) * P.pas_ax,
    // gaura pentru bara (stifturi goale, rotunde) si clema; cupa bilei (gaura sferica si gura ei)
    baraGauraD: P.bara_gaura_d + (P.varianta_bara - 3) * P.pas_bara,
    clemaD: P.clema_d + (P.varianta_bara - 3) * P.pas_bara,
    cupaD: P.cupa_d + (P.varianta_cupa - 3) * P.pas_cupa,
    cupaGura: P.cupa_gura + (P.varianta_cupa - 3) * P.pas_cupa,
    // jocul dintre dintii rotitelor, pe flanc (ADR 0169)
    jocDinti: Math.max(0, P.joc_dinti + (P.varianta_dinti - 3) * P.pas_dinti),
    // cat se muta diametrul scaunului jantei fata de cel cerut (ADR 0280): 0 la varianta 3, cate 0,1 mm pe varianta
    jantaD: (P.varianta_janta - 3) * P.pas_janta,
  });

  // ---------------------------------------------------------------------------------------------- corpuri
  const N_CERC = 48;
  function arie2(P0: readonly Pt[], a: number, b: number, c: number): number { return (P0[b]![0] - P0[a]![0]) * (P0[c]![1] - P0[a]![1]) - (P0[b]![1] - P0[a]![1]) * (P0[c]![0] - P0[a]![0]); }
  function triunghiuriPoligon(Pg: readonly Pt[]): [number, number, number][] {
    // taierea urechilor, pentru un poligon simplu in sens trigonometric
    const idx = Pg.map((_, i) => i), out: [number, number, number][] = [];
    const inauntru = (q: number, a: number, b: number, c: number) => arie2(Pg, a, b, q) > 1e-9 && arie2(Pg, b, c, q) > 1e-9 && arie2(Pg, c, a, q) > 1e-9;
    for (let paza = 0; idx.length > 3 && paza < 50000; paza++) {
      let taiat = false;
      for (let i = 0; i < idx.length; i++) {
        const a = idx[(i + idx.length - 1) % idx.length]!, b = idx[i]!, c = idx[(i + 1) % idx.length]!;
        if (arie2(Pg, a, b, c) <= 1e-9) continue;
        if (idx.some(q => q !== a && q !== b && q !== c && inauntru(q, a, b, c))) continue;
        out.push([a, b, c]); idx.splice(i, 1); taiat = true; break;
      }
      if (!taiat) {
        const i = idx.findIndex((b, k: number) => Math.abs(arie2(Pg, idx[(k + idx.length - 1) % idx.length]!, b, idx[(k + 1) % idx.length]!)) <= 1e-9);
        if (i < 0) break;
        idx.splice(i, 1);
      }
    }
    if (idx.length === 3 && arie2(Pg, idx[0]!, idx[1]!, idx[2]!) > 1e-9) out.push(idx.slice() as [number, number, number]);
    return out;
  }
  const ariePoli = (p: readonly Pt[]): number => p.reduce((t: number, a, i: number) => { const b = p[(i + 1) % p.length]; return t + a[0] * b![1] - a[1] * b![0]; }, 0) / 2;
  const trig = (p: Poli): Poli => (ariePoli(p) < 0 ? p.slice().reverse() : p);
  function prisma(poli: readonly Pt[], z0: number, z1: number, sus?: ((x: number, y: number) => number) | null): Tri[] {
    // prisma pe un poligon simplu (trigonometric); `sus(x, y)` da fata de sus (plana), altfel z1
    const tri: Tri[] = [], n = poli.length, zs = sus || (() => z1);
    const jos = (i: number): P3 => [poli[i]![0], poli[i]![1], z0], susP = (i: number): P3 => [poli[i]![0], poli[i]![1], zs(poli[i]![0], poli[i]![1])];
    for (const [a, b, c] of triunghiuriPoligon(poli)) { tri.push([jos(a), jos(c), jos(b)]); tri.push([susP(a), susP(b), susP(c)]); }
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; tri.push([jos(i), jos(j), susP(j)]); tri.push([jos(i), susP(j), susP(i)]); }
    return tri;
  }
  const dreptunghi = (x0: number, y0: number, x1: number, y1: number): Poli => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const cutie = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => prisma(dreptunghi(x0, y0, x1, y1), z0, z1);
  const cerc = (cx: number, cy: number, r: number, n = N_CERC): Poli => Array.from({ length: n }, (_, i) => [cx + r * Math.cos(2 * Math.PI * i / n), cy + r * Math.sin(2 * Math.PI * i / n)]);
  const cilindru = (cx: number, cy: number, r: number, z0: number, z1: number, n = N_CERC) => prisma(cerc(cx, cy, r, n), z0, z1);
  function cruce(cx: number, cy: number, d: number, lat: number): Poli {
    // gaura / axul in cruce: doua brate de latime `lat`, lungi cat diametrul d (trigonometric)
    const a = lat / 2, b = d / 2;
    return ([[a, -a], [b, -a], [b, a], [a, a], [a, b], [-a, b], [-a, a], [-b, a], [-b, -a], [-a, -a], [-a, -b], [a, -b]] as Poli).map(([x, y]): P2 => [cx + x, cy + y]);
  }
  function razaPoligon(poli: readonly Pt[], c: Pt, u: number): P2 {
    // unde iese raza din c, la unghiul u, prin conturul unui poligon stelat fata de c
    const dx = Math.cos(u), dy = Math.sin(u);
    let best = Infinity;
    for (let i = 0; i < poli.length; i++) {
      const [ax, ay] = poli[i]!, [bx, by] = poli[(i + 1) % poli.length]!;
      const ex = bx - ax, ey = by - ay, den = dx * ey - dy * ex;
      if (Math.abs(den) < 1e-12) continue;
      const t = ((ax - c[0]) * ey - (ay - c[1]) * ex) / den, s = ((ax - c[0]) * dy - (ay - c[1]) * dx) / den;
      if (t > 1e-9 && s >= -1e-9 && s <= 1 + 1e-9 && t < best) best = t;
    }
    return [c[0] + best * dx, c[1] + best * dy];
  }
  function inel(exterior: readonly Pt[], interior: readonly Pt[], c: Pt, z0: number, z1: number, exteriorSus?: readonly Pt[]): Tri[] {
    // corpul dintre doua contururi stelate fata de c (exteriorul piesei si o gaura), de la z0 la z1; cu `exteriorSus`,
    // exteriorul de sus e altul (trunchi de con cu gaura)
    const u0 = (p: Pt) => Math.atan2(p[1] - c[1], p[0] - c[0]), es = exteriorSus || exterior;
    const unghiuri = [...exterior.map(u0), ...(exteriorSus ? es.map(u0) : []), ...interior.map(u0), ...Array.from({ length: 64 }, (_, i) => -Math.PI + 2 * Math.PI * i / 64)]
      .map(u => ((u + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI).sort((a, b) => a - b)
      .filter((u, i, a) => i === 0 || u - a[i - 1]! > 1e-7);
    const o = unghiuri.map(u => razaPoligon(exterior, c, u)), q = unghiuri.map(u => razaPoligon(interior, c, u)), n = unghiuri.length, tri: Tri[] = [];
    const os = exteriorSus ? unghiuri.map(u => razaPoligon(es, c, u)) : o;
    const p3 = (p: Pt, z: number): P3 => [p[0], p[1], z];
    for (let k = 0; k < n; k++) {
      const m = (k + 1) % n;
      tri.push([p3(os[k]!, z1), p3(os[m]!, z1), p3(q[m]!, z1)], [p3(os[k]!, z1), p3(q[m]!, z1), p3(q[k]!, z1)]);
      tri.push([p3(o[k]!, z0), p3(q[m]!, z0), p3(o[m]!, z0)], [p3(o[k]!, z0), p3(q[k]!, z0), p3(q[m]!, z0)]);
      tri.push([p3(o[k]!, z0), p3(o[m]!, z0), p3(os[m]!, z1)], [p3(o[k]!, z0), p3(os[m]!, z1), p3(os[k]!, z1)]);
      tri.push([p3(q[m]!, z0), p3(q[k]!, z0), p3(q[k]!, z1)], [p3(q[m]!, z0), p3(q[k]!, z1), p3(q[m]!, z1)]);
    }
    return tri;
  }
  const tub = (cx: number, cy: number, ro: number, ri: number, z0: number, z1: number) => inel(cerc(cx, cy, ro), cerc(cx, cy, ri), [cx, cy], z0, z1);
  // schimbarea axelor: (u, v, w) -> (x, y, z); cand inverseaza orientarea, triunghiurile se intorc
  function axe(tri: readonly Tri[], f: (p: P3) => P3, inversa: boolean): Tri[] { return tri.map((t): Tri => { const r = t.map(p => f(p)) as Tri; return inversa ? [r[0], r[2], r[1]] : r; }); }
  function muta(tri: readonly Tri[], dx: number, dy: number, dz: number): Tri[] { return tri.map(t => t.map(([x, y, z]): P3 => [x + dx, y + dy, z + dz]) as Tri); }
  function cutia(tri: readonly Tri[]): [P3, P3] {
    let a: P3 = [Infinity, Infinity, Infinity], b: P3 = [-Infinity, -Infinity, -Infinity];
    for (const t of tri) for (const p of t) for (let k = 0; k < 3; k++) { a[k] = Math.min(a[k]!, p[k]!); b[k] = Math.max(b[k]!, p[k]!); }
    return [a, b];
  }
  function laOrigine(tri: readonly Tri[]): Tri[] { const [a] = cutia(tri); return muta(tri, -a[0], -a[1], -a[2]); }
  function volumSemn(tri: readonly Tri[]): number { let v = 0; for (const [a, b, c] of tri) v += a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0]); return v / 6; }
  // un corp inchis cu fetele intoarse spre interior se intoarce (dupa semnul volumului)
  const orienteaza = (tri: Tri[]): Tri[] => (volumSemn(tri) < 0 ? tri.map(([a, b, c]): Tri => [a, c, b]) : tri);

  // ---------------------------------------------------------------------------------------------- gauri in poligoane
  const inPoli = (poli: readonly Pt[], q: Pt): boolean => {
    let c = false;
    for (let i = 0, j = poli.length - 1; i < poli.length; j = i++) {
      const a = poli[i], b = poli[j];
      if ((a![1] > q[1]) !== (b![1] > q[1]) && q[0] < (b![0] - a![0]) * (q[1] - a![1]) / (b![1] - a![1]) + a![0]) c = !c;
    }
    return c;
  };
  function prismaGauri(ext: Poli, gauri: readonly Poli[] | null | undefined, z0: number, z1: number): Tri[] {
    // prisma pe un poligon cu gauri (simple, strict inauntru, disjuncte); fata de sus si de jos, prin earcut (ISC, Mapbox)
    // varfurile se misca cu cel mult 0,0001 mm (la fel de fiecare data): earcut scoate varfurile exact coliniare (ar ramane
    // gauri in perete, de exemplu intre doua gauri pe acelasi rand sau pe laturile drepte ale formei), iar asa nu mai sunt
    const mic = ([x, y]: P2): P2 => { const h = (u: number) => { const t = Math.sin(x * 12.9898 + y * 78.233 + u) * 43758.5453; return t - Math.floor(t) - 0.5; }; return [x + 2e-4 * h(0), y + 2e-4 * h(1.7)]; };
    gauri = gauri || [];
    const E = curataPoli(trig(ext)).map(mic), G = gauri.map(g => curataPoli(trig(g)).reverse().map(mic));
    const pts = [...E], idx: number[] = [];
    for (const g of G) { idx.push(pts.length); pts.push(...g); }
    const t = glob.earcut(pts.flat(), idx, 2), tri: Tri[] = [], p3 = (p: Pt, z: number): P3 => [p[0], p[1], z];
    for (let k = 0; k < t.length; k += 3) {
      const a = t[k]!; let b = t[k + 1]!, c = t[k + 2]!;
      if (arie2(pts, a, b, c) < 0) [b, c] = [c, b];
      tri.push([p3(pts[a]!, z0), p3(pts[c]!, z0), p3(pts[b]!, z0)], [p3(pts[a]!, z1), p3(pts[b]!, z1), p3(pts[c]!, z1)]);
    }
    // peretii: exteriorul trigonometric, gaurile in sens orar (materialul ramane in stanga)
    for (const L of [E, ...G]) for (let i = 0; i < L.length; i++) {
      const A = L[i], B = L[(i + 1) % L.length];
      tri.push([p3(A!, z0), p3(B!, z0), p3(B!, z1)], [p3(A!, z0), p3(B!, z1), p3(A!, z1)]);
    }
    return tri;
  }
  function aplatizeaza(v: readonly Vf[]): Poli {
    // contur Cavalier [x, y, bulge] -> poligon (arcele in segmente)
    const out: Poli = [];
    for (let i = 0; i < v.length; i++) {
      const [x1, y1, b] = v[i]!, [x2, y2] = v[(i + 1) % v.length]!;
      out.push([x1, y1]);
      if (Math.abs(b) < 1e-9) continue;
      const th = 4 * Math.atan(b), dx = x2 - x1, dy = y2 - y1, c = Math.hypot(dx, dy);
      if (c < 1e-9) continue;
      const k = (c / 2) / Math.tan(th / 2), cx = (x1 + x2) / 2 - dy / c * k, cy = (y1 + y2) / 2 + dx / c * k;
      const r = Math.hypot(x1 - cx, y1 - cy), a1 = Math.atan2(y1 - cy, x1 - cx), n = Math.max(1, Math.ceil(Math.abs(th) / (2 * Math.PI / N_CERC)));
      for (let s = 1; s < n; s++) out.push([cx + r * Math.cos(a1 + th * s / n), cy + r * Math.sin(a1 + th * s / n)]);
    }
    return out;
  }
  const dinPl = (p: CavalierPline): Vf[] => { const o: Vf[] = []; for (let i = 0; i < p.vertexCount; i++) { const q = p.at(i); o.push([q.x, q.y, q.bulge]); } return o; };
  // formele care se scad: { p: poligonul (trigonometric), pl: conturul Cavalier, cu arce (optional) }
  const formaCerc = (c: Pt, r: number): Forma => ({ p: cerc(c[0], c[1], r), pl: [[c[0] + r, c[1], 1], [c[0] - r, c[1], 1]] });
  const formaPoli = (p: Poli): Forma => ({ p: trig(p), pl: trig(p).map(([x, y]): Vf => [x, y, 0]) });
  function scadeForme(poli: Poli, forme: readonly Forma[]): { ext: Poli; gauri: Poli[] }[] {
    // poligonul convex `poli` fara forme: [{ ext, gauri }]. Formele cu totul inauntru raman gauri (earcut); cele care
    // taie marginea se scad cu Cavalier (MIT / Apache-2.0, adus in pagina).
    const P0 = curataPoli(trig(poli)), gauri: Poli[] = [];
    let ext = [P0];
    for (const f of forme) {
      if (f.p.every(q => inPoli(P0, q))) { gauri.push(f.p); continue; }
      const CV = glob.Cavalier, nou: Poli[] = [];
      for (const v of ext) {
        const r = CV.plineClosed(v.map(([x, y]) => [x, y, 0])).boolean(CV.plineClosed(f.pl), "not");
        if (r.resultInfo === "disjoint") { nou.push(v); continue; }
        for (const x of r.posPlines) { const q = curataPoli(trig(aplatizeaza(dinPl(x.pline)))); if (q.length >= 3 && ariePoli(q) > 0.02) nou.push(q); }
        for (const x of r.negPlines) gauri.push(trig(aplatizeaza(dinPl(x.pline))));
      }
      ext = nou;
    }
    return ext.map(e => ({ ext: e, gauri: gauri.filter(g => inPoli(e, g[0]!)) }));
  }
  const prismaForme = (poli: Poli, forme: readonly Forma[], z0: number, z1: number): Tri[] => scadeForme(poli, forme).flatMap(r => prismaGauri(r.ext, r.gauri, z0, z1));
  function strung(profil: Poli, a0: number, a1: number, cx: number, cy: number, n = N_CERC) {
    // corpul de revolutie al profilului (r, z) in jurul axei verticale (cx, cy), intre unghiurile a0 si a1; profilul e un
    // poligon simplu cu r > 0. Pe un cerc intreg nu are capete; altfel se inchide cu profilul la ambele capete.
    const pr = curataPoli(trig(profil)), intreg = a1 - a0 >= 2 * Math.PI - 1e-9;
    const pasi = Math.max(2, Math.ceil(n * (a1 - a0) / (2 * Math.PI))), tri: Tri[] = [];
    const pt = (q: Pt, k: number): P3 => { const u = a0 + (a1 - a0) * k / pasi; return [cx + q[0] * Math.cos(u), cy + q[0] * Math.sin(u), q[1]]; };
    for (let k = 0; k < pasi; k++) for (let i = 0; i < pr.length; i++) {
      const A = pr[i], B = pr[(i + 1) % pr.length], k1 = intreg && k === pasi - 1 ? 0 : k + 1;
      tri.push([pt(A!, k), pt(B!, k), pt(B!, k1)], [pt(A!, k), pt(B!, k1), pt(A!, k1)]);
    }
    if (!intreg) for (const [a, b, c] of triunghiuriPoligon(pr)) { tri.push([pt(pr[a]!, 0), pt(pr[c]!, 0), pt(pr[b]!, 0)], [pt(pr[a]!, pasi), pt(pr[b]!, pasi), pt(pr[c]!, pasi)]); }
    return orienteaza(tri);
  }
  function sfera(cx: number, cy: number, cz: number, r: number, n = 32) {
    // sfera inchisa (meridiane si paralele)
    const m = Math.max(4, n / 2), tri: Tri[] = [], p = (i: number, j: number): P3 => {
      if (i === 0) return [cx, cy, cz - r];
      if (i === m) return [cx, cy, cz + r];
      const t = -Math.PI / 2 + Math.PI * i / m, u = 2 * Math.PI * j / n;
      return [cx + r * Math.cos(t) * Math.cos(u), cy + r * Math.cos(t) * Math.sin(u), cz + r * Math.sin(t)];
    };
    for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) {
      const j1 = (j + 1) % n;
      if (i > 0) tri.push([p(i, j), p(i, j1), p(i + 1, j1)]);
      if (i < m - 1) tri.push([p(i, j), p(i + 1, j1), p(i + 1, j)]);
    }
    return orienteaza(tri);
  }

  // ---------------------------------------------------------------------------------------------- forma pe grila
  const cheie = (i: number, j: number): string => i + "," + j;
  function contururi(celule: readonly (readonly [number, number, ...unknown[]])[]): Poli[] {
    // marginile formei (celule de 8 x 8): bucle in sens trigonometric pe exterior, orar pe goluri; colturile coliniare scoase
    const S = new Set(celule.map(([i, j]) => cheie(i, j)));
    const are = (i: number, j: number) => S.has(cheie(i, j));
    const muchii = new Map<string, number[][]>();     // de la varf -> lista de varfuri urmatoare (material in stanga)
    const adauga = (a: number[], b: number[]) => { const k = a.join(","); if (!muchii.has(k)) muchii.set(k, []); muchii.get(k)!.push(b); };
    for (const [i, j] of celule) {
      if (!are(i, j - 1)) adauga([i, j], [i + 1, j]);
      if (!are(i + 1, j)) adauga([i + 1, j], [i + 1, j + 1]);
      if (!are(i, j + 1)) adauga([i + 1, j + 1], [i, j + 1]);
      if (!are(i - 1, j)) adauga([i, j + 1], [i, j]);
    }
    const bucle: Poli[] = [];
    while (muchii.size) {
      const [k0, l0] = muchii.entries().next().value!;
      let a = k0.split(",").map(Number), b = l0.shift()!;
      if (!l0.length) muchii.delete(k0);
      const bucla = [a];
      let paza = 0;
      while (b.join(",") !== k0 && paza++ < 10000) {
        bucla.push(b);
        const k = b.join(","), l = muchii.get(k);
        // la un varf cu doua iesiri (colt in diagonala) iau virajul la stanga, ca buclele sa nu se incruciseze
        let ales = 0;
        if (l!.length > 1) {
          const d0 = [b[0]! - a[0]!, b[1]! - a[1]!];
          ales = l!.findIndex(c => d0[0]! * (c[1]! - b[1]!) - d0[1]! * (c[0]! - b[0]!) > 0);
          if (ales < 0) ales = 0;
        }
        const c = l!.splice(ales, 1)[0]!;
        if (!l!.length) muchii.delete(k);
        a = b; b = c;
      }
      // scot varfurile coliniare
      const curat = bucla.filter((p, i) => { const q = bucla[(i + bucla.length - 1) % bucla.length], r = bucla[(i + 1) % bucla.length]; return (p[0]! - q![0]!) * (r![1]! - p[1]!) - (p[1]! - q![1]!) * (r![0]! - p[0]!) !== 0; });
      bucle.push(curat.map(([x, y]): P2 => [x! * P.pas, y! * P.pas]));
    }
    return bucle;
  }
  function insetRectiliniu(bucla: readonly P2[], d: number): Poli {
    // fiecare latura muta spre material (stanga mersului) cu d; colturile, la intersectia laturilor vecine
    const n = bucla.length, laturi: { a: P2; dx: number; dy: number; nx: number; ny: number }[] = [];
    for (let i = 0; i < n; i++) {
      const a = bucla[i]!, b = bucla[(i + 1) % n]!, dx = Math.sign(b[0] - a[0]), dy = Math.sign(b[1] - a[1]);
      laturi.push({ a, dx, dy, nx: -dy, ny: dx });
    }
    return laturi.map((l, i): P2 => {
      const p = laturi[(i + n - 1) % n];
      // latura p (dinainte) si latura l se intalnesc in l.a
      const x = p!.dx === 0 ? p!.a[0] + p!.nx * d : l.a[0] + l.nx * d;
      const y = p!.dy === 0 ? p!.a[1] + p!.ny * d : l.a[1] + l.ny * d;
      return [x, y];
    });
  }
  function inelPoligon(ext: readonly Pt[], int: readonly Pt[], z0: number, z1: number): Tri[] {
    // peretele dintre doua bucle cu varfuri corespondente (ext si int, acelasi sens)
    const tri: Tri[] = [], n = ext.length, p3 = (p: Pt, z: number): P3 => [p[0], p[1], z];
    for (let k = 0; k < n; k++) {
      const m = (k + 1) % n;
      tri.push([p3(ext[k]!, z1), p3(ext[m]!, z1), p3(int[m]!, z1)], [p3(ext[k]!, z1), p3(int[m]!, z1), p3(int[k]!, z1)]);
      tri.push([p3(ext[k]!, z0), p3(int[m]!, z0), p3(ext[m]!, z0)], [p3(ext[k]!, z0), p3(int[k]!, z0), p3(int[m]!, z0)]);
      tri.push([p3(ext[k]!, z0), p3(ext[m]!, z0), p3(ext[m]!, z1)], [p3(ext[k]!, z0), p3(ext[m]!, z1), p3(ext[k]!, z1)]);
      tri.push([p3(int[m]!, z0), p3(int[k]!, z0), p3(int[k]!, z1)], [p3(int[m]!, z0), p3(int[k]!, z1), p3(int[m]!, z1)]);
    }
    return tri;
  }
  function patratCelula(S: ReadonlySet<string>, i: number, j: number, joc: number, peste = 0.01) {
    // celula (i, j), trasa inauntru cu jocul pe laturile de margine si cu putin peste vecini (corpurile se suprapun)
    const are = (a: number, b: number) => S.has(cheie(a, b)), s = P.pas;
    return dreptunghi(s * i + (are(i - 1, j) ? -peste : joc), s * j + (are(i, j - 1) ? -peste : joc),
                      s * (i + 1) - (are(i + 1, j) ? -peste : joc), s * (j + 1) - (are(i, j + 1) ? -peste : joc));
  }

  // ---------------------------------------------------------------------------------------------- piesele
  function stifturi(lista: readonly Pt[], z: number, d: number): Tri[] {
    const tri: Tri[] = [];
    for (const [x, y] of lista) tri.push(...cilindru(x, y, d / 2, z - 0.01, z + P.stift_h));
    return tri;
  }
  function gauraForma(c: Pt, t: string): Poli {
    // gaura verticala: "r" pentru stift Technic, "x" pentru ax (cruce), "b" pentru bara de 3,2
    const e = ef();
    if (t === "x") return cruce(c[0], c[1], e.axGauraD, e.axGauraLat);
    if (t === "b") return cerc(c[0], c[1], e.baraGauraD / 2);
    return cerc(c[0], c[1], e.gauraD / 2);
  }
  function stratCelule(celule: readonly Celula[], gauri: readonly Poli[], z0: number, z1: number): Tri[] {
    // forma de pe grila (cu jocul pe margini), cu gaurile date (toate inauntru), ca prisme cu gauri
    const bucle = contururi(celule).map(b => insetRectiliniu(b, P.joc_lateral));
    const ext = bucle.filter(b => ariePoli(b) > 0), goluri = bucle.filter(b => ariePoli(b) < 0), grup = ext.map((): Poli[] => []);
    const unde = (q: Pt) => { let k0 = -1, a0 = Infinity; ext.forEach((b, k) => { const a = ariePoli(b); if (a < a0 && inPoli(b, q)) { a0 = a; k0 = k; } }); return k0; };
    for (const g of [...goluri, ...gauri]) { const k = unde(g[0]!); if (k >= 0) grup[k]!.push(g); }
    return ext.flatMap((b, k) => prismaGauri(b, grup[k], z0, z1));
  }
  function gauriIntersectii(celule: readonly Celula[], gauri: readonly GauraGrila[] | null | undefined, avert: string[]): GauraPusa[] {
    // gaurile verticale [i, j, tip] sunt in colturile celulelor (intre stifturi); merg doar unde are material de jur imprejur
    const S = new Set(celule.map(([i, j]) => cheie(i, j))), are = (i: number, j: number) => S.has(cheie(i, j)), out: GauraPusa[] = [], vazut = new Set<string>();
    let afara = 0;
    for (const [a, b, t] of gauri || []) {
      if (vazut.has(cheie(a, b))) continue;
      vazut.add(cheie(a, b));
      if (are(a - 1, b - 1) && are(a, b - 1) && are(a - 1, b) && are(a, b)) out.push({ a, b, t: t === "x" ? "x" : "r", c: [P.pas * a, P.pas * b] });
      else afara++;
    }
    if (afara) avert.push(tr`${afara === 1 ? tr("O gaură nu are") : afara + tr(" găuri nu au")} material de jur împrejur: ${afara === 1 ? tr("a rămas") : tr("au rămas")} pe dinafară.`);
    return out;
  }
  function caramida({ celule, placi = 3, stifturi: cuStifturi = true, fund = "tuburi", gauri = [], goale = false, laterale = null }: {
    celule: readonly Celula[]; placi?: number; stifturi?: boolean | "mijloc"; fund?: string; gauri?: readonly GauraGrila[]; goale?: boolean;
    laterale?: readonly string[] | null }): Corp {
    if (!celule || !celule.length) throw new Error(tr("forma nu are nicio celulă"));
    const e = ef(), s = P.pas, H = placi * P.placa, S = new Set(celule.map(([i, j]) => cheie(i, j)));
    const are = (i: number, j: number) => S.has(cheie(i, j)), tri: Tri[] = [], avert: string[] = [];
    if (laterale && laterale.some((t: string) => t && t !== "p")) {
      // gaurile laterale (Technic) merg la o caramida dreapta 1 x n, inalta de 3 placi
      const xs = [...new Set(celule.map(c => c[0]))], ys = [...new Set(celule.map(c => c[1]))], n = celule.length;
      const peX = ys.length === 1 && xs.length === n && Math.max(...xs) - Math.min(...xs) === n - 1;
      const peY = xs.length === 1 && ys.length === n && Math.max(...ys) - Math.min(...ys) === n - 1;
      if (placi === 3 && (peX || peY)) {
        const r = caramidaTechnic({ lung: n, gauri: laterale, goale, stifturi: cuStifturi });
        const t2 = peX || n === 1 ? r.tri : axe(r.tri, ([x, y, z]) => [y, x, z], true);
        return { tri: muta(t2, s * Math.min(...xs), s * Math.min(...ys), 0), avert: r.avert };
      }
      avert.push(tr("Găurile laterale merg doar la o cărămidă dreaptă 1 × n, de 3 plăci: le-am lăsat deoparte."));
    }
    let gv = gauriIntersectii(celule, gauri, avert);
    if (cuStifturi === "mijloc") {
      // stiftul din mijloc acopera gaura de sub el (la formele pare): gaura aceea ramane pe dinafara
      const mx = celule.reduce((t, [i]) => t + i + 0.5, 0) / celule.length, my = celule.reduce((t, [, j]) => t + j + 0.5, 0) / celule.length;
      const sub = (g: GauraPusa) => Math.hypot(g.a - mx, g.b - my) * s < P.stift_d / 2 + e.gauraD / 2 + 0.3;
      if (gv.some(sub)) { avert.push(tr("Gaura de sub știftul din mijloc a rămas pe dinafară (știftul o acoperă).")); gv = gv.filter(g => !sub(g)); }
    }
    const lg = new Map(gv.map((g): [string, GauraPusa] => [cheie(g.a, g.b), g]));
    // stifturile goale: o gaura pentru bara de 3,2 prin stift si prin capac
    const goi = goale && cuStifturi === true;
    const gauriSus = [...gv.map(g => gauraForma(g.c, g.t)), ...(goi ? celule.map(([i, j]) => gauraForma([s * i + s / 2, s * j + s / 2], "b")) : [])];
    if (fund === "tuburi") {
      // capacul (pe celule) si peretii (pe contur), tuburile si stifturile mici dedesubt
      if (gauriSus.length) tri.push(...stratCelule(celule, gauriSus, H - P.sus, H));
      else for (const [i, j] of celule) tri.push(...prisma(patratCelula(S, i, j, P.joc_lateral), H - P.sus, H));
      const grosime = P.perete - e.joc;
      for (const b of contururi(celule)) {
        const ext = insetRectiliniu(b, P.joc_lateral), int = insetRectiliniu(b, P.joc_lateral + grosime);
        tri.push(...inelPoligon(ext, int, 0, H - P.sus + 0.01));
      }
      const zt = H - P.sus + 0.01, ro = P.tub_contact - e.joc, rp = (s / 2 - P.stift_d / 2) - e.joc;
      const tuburi = new Set<string>();
      for (const [i, j] of celule) {
        for (const [a, b] of [[i, j], [i + 1, j], [i, j + 1], [i + 1, j + 1]] as P2[]) {
          if (tuburi.has(cheie(a, b))) continue;
          if (are(a - 1, b - 1) && are(a, b - 1) && are(a - 1, b) && are(a, b)) {
            tuburi.add(cheie(a, b));
            // cu gaura: tubul e gaura insasi (ca la placile Technic), de jos pana prin capac
            const g = lg.get(cheie(a, b));
            if (g) tri.push(...inel(cerc(s * a, s * b, ro), gauraForma(g.c, g.t), g.c, 0, zt));
            else tri.push(...tub(s * a, s * b, ro, Math.min(ro - 0.8, P.stift_d / 2), 0, zt));
          }
        }
      }
      // stifturile mici, intre doua celule vecine pe un sir lat de un stift
      for (const [i, j] of celule) {
        if (are(i + 1, j) && !tuburi.has(cheie(i + 1, j)) && !tuburi.has(cheie(i + 1, j + 1))) tri.push(...cilindru(s * (i + 1), s * j + s / 2, rp, 0, zt));
        if (are(i, j + 1) && !tuburi.has(cheie(i, j + 1)) && !tuburi.has(cheie(i + 1, j + 1))) tri.push(...cilindru(s * i + s / 2, s * (j + 1), rp, 0, zt));
      }
    } else {
      // plina, cu cate un locas rotund pentru stiftul de dedesubt in fiecare celula
      const ad = Math.min(P.locas_h, H - 0.8);
      if (gauriSus.length) {
        const locas = celule.map(([i, j]) => cerc(s * i + s / 2, s * j + s / 2, P.stift_d / 2 + e.joc));
        tri.push(...stratCelule(celule, [...locas, ...gv.map(g => gauraForma(g.c, g.t))], 0, ad));
        tri.push(...stratCelule(celule, gauriSus, ad - 0.01, H));
      } else for (const [i, j] of celule) {
        const c: P2 = [s * i + s / 2, s * j + s / 2], pat = patratCelula(S, i, j, P.joc_lateral);
        tri.push(...inel(pat, cerc(c[0], c[1], P.stift_d / 2 + e.joc), c, 0, ad));
        tri.push(...prisma(pat, ad - 0.01, H));
      }
    }
    if (goi) {
      for (const [i, j] of celule) tri.push(...tub(s * i + s / 2, s * j + s / 2, e.stiftD / 2, e.baraGauraD / 2, H - 0.01, H + P.stift_h));
    } else if (cuStifturi === "mijloc") {
      // un singur stift, in mijlocul formei (ca la placa „jumper”): muta piesa de deasupra cu jumatate de stift
      const n = celule.length;
      tri.push(...stifturi([[celule.reduce((t: number, [i]) => t + s * i + s / 2, 0) / n, celule.reduce((t: number, [, j]) => t + s * j + s / 2, 0) / n]], H, e.stiftD));
    } else if (cuStifturi) tri.push(...stifturi(celule.map(([i, j]) => [s * i + s / 2, s * j + s / 2]), H, e.stiftD));
    return { tri, avert };
  }
  function lateral({ lung = 1, fete = "una" }: { lung?: number; fete?: string }): Corp {
    // caramida 1 x n cu stifturi si pe latura lunga (SNOT): stiftul lateral la 5,6 mm de jos, ca o piesa prinsa in el sa
    // iasa la nivel cu fata de sus. Plina, cu locasuri dedesubt; se printeaza in picioare (stifturile laterale sunt scurte).
    lung = Math.max(1, Math.min(8, Math.round(lung)));
    const e = ef(), s = P.pas, H = 3 * P.placa, j0 = P.joc_lateral, zc = H - s / 2;
    const celule = Array.from({ length: lung }, (_, i): Celula => [i, 0]);
    const { tri } = caramida({ celule, placi: 3, fund: "locasuri" });
    for (let i = 0; i < lung; i++) {
      // cilindrul in (u, v, w): u = x, v = z, w = cat iese din fata
      const cil = cilindru(s * i + s / 2, zc, e.stiftD / 2, 0, P.stift_h + 0.01);
      tri.push(...axe(cil, ([u, v, w]) => [u, j0 + 0.01 - w, v], false));
      if (fete === "doua") tri.push(...axe(cil, ([u, v, w]) => [u, s - j0 - 0.01 + w, v], true));
    }
    return { tri, avert: [] };
  }
  function panta({ lung = 2, adanc = 2, sus = 1, placi = 3, buza = 1.6, profil = "drept" }: { lung?: number; adanc?: number; sus?: number; placi?: number;
    buza?: number; profil?: string }): Rezultat {
    // panta de-a lungul lui y: randurile din spate (sus) au stifturi, in fata coboara pana la buza; profilul drept sau
    // curb (sferturi de sinus: urca repede in fata si ajunge orizontal la randurile cu stifturi). Fara randuri sus: toata e panta.
    const e = ef(), s = P.pas, H = placi * P.placa, j0 = P.joc_lateral, tri: Tri[] = [], avert: string[] = [];
    sus = Math.max(0, Math.min(sus, adanc - 1));
    const curb = profil === "curb";
    const ys = Math.min(s * (adanc - sus), s * adanc - j0), yf = j0;
    buza = Math.min(Math.max(0.8, buza), H - 0.8);
    const t = (y: number) => Math.min(1, Math.max(0, y - yf) / Math.max(1e-6, ys - yf));
    const z = (y: number) => (y >= ys - 1e-9 ? H : buza + (H - buza) * (curb ? Math.sin(Math.PI / 2 * t(y)) : t(y)));
    const celule: Celula[] = [];
    for (let i = 0; i < lung; i++) for (let j = 0; j < adanc; j++) celule.push([i, j]);
    const S = new Set(celule.map(([i, j]) => cheie(i, j)));
    // corpul peste [y0, y1] al celulei, de la zb pana la panta (la profilul curb, in fasii cu fata de sus plana)
    const sub = (xa: number, xb: number, y0: number, y1: number, zb: number) => {
      const n = curb ? Math.max(2, Math.ceil((y1 - y0) / 0.8)) : 1;
      for (let k = 0; k < n; k++) {
        const ya = y0 + (y1 - y0) * k / n, yb = y0 + (y1 - y0) * (k + 1) / n + (k < n - 1 ? 0.01 : 0);
        tri.push(...prisma(dreptunghi(xa, ya, xb, yb), zb, H, (x: number, y: number) => z(y)));
      }
    };
    for (const [i, j] of celule) {
      const c: P2 = [s * i + s / 2, s * j + s / 2], pat = patratCelula(S, i, j, j0), r = P.stift_d / 2 + e.joc;
      const [xa, ya] = pat[0]!, [xb, yb] = pat[2]!, inPanta = j < adanc - sus;
      let ad = Math.min(P.locas_h, z(c[1] - r) - 0.6);
      if (ad < 1.0) { avert.push(tr("rândul din față e prea subțire pentru locașuri: stă direct pe știfturi")); sub(xa, xb, ya, yb, 0); continue; }
      // in fata locasului, unde panta coboara sub inaltimea lui, o fasie plina pana jos (altfel buza ar iesi mai groasa
      // decat cea ceruta, iar corpul de deasupra locasului s-ar intoarce pe dos)
      const yc = inPanta && z(ya) < ad + 0.6 ? c[1] - r - 0.05 : ya;
      tri.push(...inel(yc > ya ? dreptunghi(xa, yc, xb, yb) : pat, cerc(c[0], c[1], r), c, 0, ad));
      if (yc > ya) sub(xa, xb, ya, yc + 0.01, 0);
      if (inPanta) sub(xa, xb, yc, yb, ad - 0.01);
      else tri.push(...prisma(pat, ad - 0.01, H, (x: number, y: number) => z(y)));
    }
    const st: P2[] = [];
    for (let i = 0; i < lung; i++) for (let j = adanc - sus; j < adanc; j++) st.push([s * i + s / 2, s * j + s / 2]);
    tri.push(...stifturi(st, H, e.stiftD));
    const unghi = Math.atan2(H - buza, ys - yf) * 180 / Math.PI;
    return { tri, avert: [...new Set(avert)], unghi };
  }
  function pantaInversa({ lung = 2, adanc = 2, sus = 1, placi = 3, buza = 1.6 }: { lung?: number; adanc?: number; sus?: number; placi?: number; buza?: number }): Rezultat {
    // panta pe dedesubt: sus e plina, cu stifturi pe toate celulele; dedesubt, randurile din spate stau pe stifturi
    // (locasuri), iar in fata fata de jos urca pana la buza. Se printeaza in picioare: sub panta e o surplomba.
    const e = ef(), s = P.pas, H = placi * P.placa, j0 = P.joc_lateral, tri: Tri[] = [], avert: string[] = [];
    sus = Math.max(1, Math.min(sus, adanc - 1));
    const ys = s * (adanc - sus), yf = j0;
    buza = Math.min(Math.max(0.8, buza), H - 0.8);
    const zj = (y: number) => (y >= ys - 1e-9 ? 0 : (H - buza) * (1 - Math.max(0, y - yf) / Math.max(1e-6, ys - yf)));
    const celule: Celula[] = [];
    for (let i = 0; i < lung; i++) for (let j = 0; j < adanc; j++) celule.push([i, j]);
    const S = new Set(celule.map(([i, j]) => cheie(i, j)));
    const ad = Math.min(P.locas_h, H - 0.8);
    for (const [i, j] of celule) {
      const c: P2 = [s * i + s / 2, s * j + s / 2], pat = patratCelula(S, i, j, j0);
      if (j >= adanc - sus) {
        tri.push(...inel(pat, cerc(c[0], c[1], P.stift_d / 2 + e.joc), c, 0, ad));
        tri.push(...prisma(pat, ad - 0.01, H));
      } else {
        // corpul intors: w = H - z, de la fata de sus (w = 0) pana la fata de jos (w = H - zj); oglindirea intoarce triunghiurile
        tri.push(...axe(prisma(pat, 0, H, (x: number, y: number) => H - zj(y)), ([x, y, w]) => [x, y, H - w], true));
      }
    }
    tri.push(...stifturi(celule.map(([i, j]) => [s * i + s / 2, s * j + s / 2]), H, e.stiftD));
    const unghi = Math.atan2(H - buza, ys - yf) * 180 / Math.PI;
    if (unghi < 40) avert.push(tr`Sub pantă, fața e la ${Math.round(90 - unghi)}° de verticală: în picioare, cere suport la printare (sau o pantă mai abruptă).`);
    return { tri, avert, unghi };
  }

  // ---------------------------------------------------------------------------------------------- pene (aripi) si piese rotunde
  function curataPoli(p: readonly P2[]): Poli {
    // fara varfuri dublate si fara varfuri coliniare
    let q = p.filter((a, i: number) => { const b = p[(i + 1) % p.length]; return Math.hypot(a[0] - b![0], a[1] - b![1]) > 1e-7; });
    q = q.filter((a, i: number) => { const o = q[(i + q.length - 1) % q.length], b = q[(i + 1) % q.length]; return Math.abs((a[0] - o![0]) * (b![1] - a[1]) - (a[1] - o![1]) * (b![0] - a[0])) > 1e-9; });
    return q;
  }
  function taieSemiplan(poli: readonly P2[], A: Pt, B: Pt): Poli {
    // ce ramane din poligonul convex `poli` in stanga dreptei A -> B (Sutherland-Hodgman)
    const f = (q: Pt) => (B[0] - A[0]) * (q[1] - A[1]) - (B[1] - A[1]) * (q[0] - A[0]), out: Poli = [];
    for (let i = 0; i < poli.length; i++) {
      const X = poli[i], Y = poli[(i + 1) % poli.length], fx = f(X!), fy = f(Y!);
      if (fx >= 0) out.push(X!);
      if ((fx >= 0) !== (fy >= 0)) { const t = fx / (fx - fy); out.push([X![0] + (Y![0] - X![0]) * t, X![1] + (Y![1] - X![1]) * t]); }
    }
    return out;
  }
  function insetConvex(poli: readonly P2[], d: number): Poli {
    // fiecare latura a poligonului convex (trigonometric) muta inauntru cu d; varfurile la intersectia laturilor vecine
    const n = poli.length, L = poli.map((A, i: number): { A: P2; u: P2 } => {
      const B = poli[(i + 1) % n], l = Math.hypot(B![0] - A[0], B![1] - A[1]), u: P2 = [(B![0] - A[0]) / l, (B![1] - A[1]) / l];
      return { A: [A[0] - u[1] * d, A[1] + u[0] * d], u };
    });
    return L.map((l, i): P2 => {
      const p = L[(i + n - 1) % n], den = p!.u[0] * l.u[1] - p!.u[1] * l.u[0];
      const t = ((l.A[0] - p!.A[0]) * l.u[1] - (l.A[1] - p!.A[1]) * l.u[0]) / den;
      return [p!.A[0] + p!.u[0] * t, p!.A[1] + p!.u[1] * t];
    });
  }
  const distInauntru = (poli: readonly P2[], q: Pt): number => Math.min(...poli.map((A, i: number) => {
    const B = poli[(i + 1) % poli.length];
    return ((B![0] - A[0]) * (q[1] - A[1]) - (B![1] - A[1]) * (q[0] - A[0])) / Math.hypot(B![0] - A[0], B![1] - A[1]);
  }));
  function minusDisc(poli: Poli, c: Pt, r: number, n = N_CERC): Disc | null {
    // poligonul convex `poli` (trigonometric) fara discul (c, r), pentru locasurile taiate de marginea oblica:
    // { bucle: [...] } (bucle simple, trigonometrice; [] daca discul acopera tot), { gaura: true } daca discul e
    // intreg inauntru (atunci merge `inel`), sau null daca intersectia iese ciudata (atunci piesa ramane plina acolo)
    const pts: { p: P2; x: boolean; intra?: boolean }[] = [], dist = (p: Pt) => Math.hypot(p[0] - c[0], p[1] - c[1]);
    for (let i = 0; i < poli.length; i++) {
      const A = poli[i]!, B = poli[(i + 1) % poli.length]!;
      pts.push({ p: A, x: false });
      const dx = B[0] - A[0], dy = B[1] - A[1], fx = A[0] - c[0], fy = A[1] - c[1];
      const a = dx * dx + dy * dy, b = 2 * (fx * dx + fy * dy), cc = fx * fx + fy * fy - r * r, disc = b * b - 4 * a * cc;
      if (disc > 1e-12) { const q = Math.sqrt(disc); for (const t of [(-b - q) / (2 * a), (-b + q) / (2 * a)]) if (t > 1e-9 && t < 1 - 1e-9) pts.push({ p: [A[0] + t * dx, A[1] + t * dy], x: true }); }
    }
    const N = pts.length, X = pts.map((q, k) => k).filter(k => pts[k]!.x);
    if (!X.length) {
      if (poli.every(q => dist(q) <= r)) return { bucle: [] };
      return distInauntru(poli, c) >= r ? { gaura: true } : { bucle: [poli] };
    }
    for (const k of X) { const q = pts[k]!.p, u = pts[(k + 1) % N]!.p; pts[k]!.intra = dist([(q[0] + u[0]) / 2, (q[1] + u[1]) / 2]) < r; }
    const ung = (q: Pt) => Math.atan2(q[1] - c[1], q[0] - c[0]), bucle: Poli[] = [], folosit = new Set<number>();
    for (const s0 of X) {
      if (pts[s0]!.intra || folosit.has(s0)) continue;
      const bucla: Poli = [];
      let k = s0, paza = 0;
      while (paza++ < 200) {
        folosit.add(k);
        // pe contur, din punctul unde iese din disc pana unde intra din nou
        bucla.push(pts[k]!.p);
        let m = (k + 1) % N;
        while (!(pts[m]!.x && pts[m]!.intra)) { bucla.push(pts[m]!.p); m = (m + 1) % N; }
        // apoi pe cerc, in sensul acelor de ceas (discul ramane in dreapta), pana la urmatoarea intersectie
        folosit.add(m);
        const A = pts[m]!.p, uA = ung(A);
        let best = -1, bd = Infinity;
        for (const q of X) { if (q === m) continue; const d = (((uA - ung(pts[q]!.p)) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); if (d > 1e-9 && d < bd) { bd = d; best = q; } }
        if (best < 0 || pts[best]!.intra) return null;
        bucla.push(A);
        const pasi = Math.max(1, Math.ceil(bd / (2 * Math.PI / n)));
        for (let t = 1; t < pasi; t++) { const u = uA - bd * t / pasi; bucla.push([c[0] + r * Math.cos(u), c[1] + r * Math.sin(u)]); }
        if (best === s0) break;
        k = best;
      }
      if (paza >= 200) return null;
      const b = curataPoli(bucla);
      if (b.length >= 3 && ariePoli(b) > 0.02) bucle.push(b);
    }
    return { bucle };
  }
  function conturPana({ lung, lat, varf, inceput, parte }: { lung: number; lat: number; varf: number; inceput: number; parte: string }): Poli {
    // conturul nominal (in stifturi): latura de la radacina (x = 0) e plina, cea din varf (x = lung) are `varf` stifturi;
    // taietura incepe la x = inceput. stanga: taiat pe latura de sus (y = lat); dreapta: oglindit; ambele: simetric
    let p: Poli;
    if (parte === "ambele") p = [[0, 0], [inceput, 0], [lung, (lat - varf) / 2], [lung, (lat + varf) / 2], [inceput, lat], [0, lat]];
    else p = [[0, 0], [lung, 0], [lung, varf], [inceput, lat], [0, lat]];
    if (parte === "dreapta") p = p.map(([x, y]): P2 => [x, lat - y]).reverse();
    return curataPoli(p.map(([x, y]): P2 => [x * P.pas, y * P.pas]));
  }
  function pozitiiGauriPana({ lung = 4, lat = 2, varf = 0, inceput = 0, parte = "stanga" }: { lung?: number; lat?: number; varf?: number; inceput?: number; parte?: string }): P2[] {
    // colturile de celule (intre stifturi) unde incape o gaura verticala, cu material destul pana la margine
    const e = ef(), s = P.pas, rH = Math.max(e.gauraD, e.axGauraD) / 2, out: P2[] = [];
    lung = Math.max(1, Math.min(24, Math.round(lung))); lat = Math.max(1, Math.min(24, Math.round(lat)));
    varf = Math.max(0, Math.min(lat, varf)); inceput = Math.max(0, Math.min(lung - 1, Math.round(inceput)));
    const pol = insetConvex(conturPana({ lung, lat, varf, inceput, parte }), P.joc_lateral);
    for (let a = 1; a < lung; a++) for (let b = 1; b < lat; b++) if (distInauntru(pol, [s * a, s * b]) >= rH + 0.8) out.push([a, b]);
    return out;
  }
  function pana({ lung = 4, lat = 2, varf = 0, inceput = 0, parte = "stanga", placi = 1, stifturi: cuStifturi = true, gauri = [] }: { lung?: number; lat?: number;
    varf?: number; inceput?: number; parte?: string; placi?: number; stifturi?: boolean; gauri?: readonly GauraGrila[] }): Rezultat {
    // placa (sau caramida) cu o latura taiata oblic: aripi, colturi taiate, varfuri. Plina, cu locasuri dedesubt unde
    // incape un stift intreg; stifturi sus unde incap intregi.
    const e = ef(), s = P.pas, H = placi * P.placa, tri: Tri[] = [], avert: string[] = [];
    lung = Math.max(1, Math.min(24, Math.round(lung))); lat = Math.max(1, Math.min(24, Math.round(lat)));
    varf = Math.max(0, Math.min(lat, varf)); inceput = Math.max(0, Math.min(lung - 1, Math.round(inceput)));
    const pol = insetConvex(conturPana({ lung, lat, varf, inceput, parte }), P.joc_lateral);
    const ad = Math.min(P.locas_h, H - 0.8), rL = P.stift_d / 2 + e.joc, st: P2[] = [];
    let locasuri = 0, deschise = 0;
    // gaurile verticale, in colturile celulelor (intre stifturi), unde e material destul de jur imprejur
    const loc = new Set(pozitiiGauriPana({ lung, lat, varf, inceput, parte }).map(([a, b]) => cheie(a, b))), gv: GauraPusa[] = [], vazut = new Set<string>();
    let afara = 0;
    for (const [a, b, t] of gauri || []) {
      if (vazut.has(cheie(a, b))) continue;
      vazut.add(cheie(a, b));
      if (loc.has(cheie(a, b))) gv.push({ a, b, t: t === "x" ? "x" : "r", c: [s * a, s * b] });
      else afara++;
    }
    if (afara) avert.push(tr`${afara === 1 ? tr("O gaură e") : afara + tr(" găuri sunt")} prea aproape de margine: ${afara === 1 ? tr("a rămas") : tr("au rămas")} pe dinafară.`);
    const forma = (g: GauraPusa): Forma => (g.t === "x" ? formaPoli(gauraForma(g.c, "x")) : formaCerc(g.c, e.gauraD / 2));
    for (let i = 0; i < lung; i++) for (let j = 0; j < lat; j++) {
      const c: P2 = [s * i + s / 2, s * j + s / 2];
      let cel = dreptunghi(s * i - 0.01, s * j - 0.01, s * (i + 1) + 0.01, s * (j + 1) + 0.01);
      for (let k = 0; k < pol.length && cel.length >= 3; k++) cel = taieSemiplan(cel, pol[k]!, pol[(k + 1) % pol.length]!);
      cel = curataPoli(cel);
      if (cel.length < 3 || ariePoli(cel) < 0.05) continue;
      const d = distInauntru(pol, c);
      // locasul intreg (prinde stiftul) sau, langa marginea oblica, deschis intr-o parte: piesa sta pe orice stift
      // de dedesubt, chiar daca acolo nu-l prinde
      const jos: Disc | null = ad >= 1.0 && d > -rL + 0.05 ? (d >= rL + 0.6 ? { gaura: true } : minusDisc(cel, c, rL)) : null;
      const lang = gv.filter(g => (g.a === i || g.a === i + 1) && (g.b === j || g.b === j + 1)).map(forma);
      if (lang.length) {
        // celula cu o gaura in colt: se scade gaura (si locasul) din celula
        if (jos) { tri.push(...prismaForme(cel, [formaCerc(c, rL), ...lang], 0, ad), ...prismaForme(cel, lang, ad - 0.01, H)); if (jos.gaura) locasuri++; else deschise++; }
        else tri.push(...prismaForme(cel, lang, 0, H));
      } else if (jos && jos.gaura) { tri.push(...inel(cel, cerc(c[0], c[1], rL), c, 0, ad), ...prisma(cel, ad - 0.01, H)); locasuri++; }
      else if (jos) { for (const b of jos.bucle) tri.push(...prisma(b, 0, ad)); tri.push(...prisma(cel, ad - 0.01, H)); deschise++; }
      else tri.push(...prisma(cel, 0, H));
      if (cuStifturi && d >= P.stift_d / 2 + 0.3) st.push(c);
    }
    if (cuStifturi) tri.push(...stifturi(st, H, e.stiftD));
    if (!locasuri) avert.push(tr("Dedesubt nu încape niciun locaș întreg: piesa stă pe știfturi, dar nu se prinde de ele (se lipește)."));
    if (cuStifturi && !st.length) avert.push(tr("Sus nu încape niciun știft întreg."));
    // unghiul taieturii, fata de latura lunga (x)
    const dy = parte === "ambele" ? (lat - varf) / 2 : lat - varf, unghi = Math.atan2(dy, lung - inceput) * 180 / Math.PI;
    return { tri, avert, unghi, stifturi: st.length, locasuri, deschise, gauri: gv.length };
  }
  function trunchi(cx: number, cy: number, r0: number, r1: number, z0: number, z1: number, n = N_CERC) {
    // trunchi de con inchis, de la raza r0 (jos) la r1 (sus)
    const A = cerc(cx, cy, r0, n), B = cerc(cx, cy, r1, n), tri: Tri[] = [], a3 = (p: Pt, z: number): P3 => [p[0], p[1], z];
    for (const [a, b, c] of triunghiuriPoligon(A)) { tri.push([a3(A[a]!, z0), a3(A[c]!, z0), a3(A[b]!, z0)]); tri.push([a3(B[a]!, z1), a3(B[b]!, z1), a3(B[c]!, z1)]); }
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; tri.push([a3(A[i]!, z0), a3(A[j]!, z0), a3(B[j]!, z1)], [a3(A[i]!, z0), a3(B[j]!, z1), a3(B[i]!, z1)]); }
    return tri;
  }
  function fusteRotund(cx: number, cy: number, R: number, ad: number, e: Ef): Tri[] {
    // fustele piesei rotunde 2 x 2: sectoare de inel in dreptul laturilor, cat sa nu atinga stifturile de dedesubt (pe diagonale)
    const s = P.pas, tri: Tri[] = [], Ri = R - 1.2, rs = P.stift_d / 2 + e.joc + 0.15, ds = Math.hypot(s / 2, s / 2);
    let phi = 45;
    for (let k = 0; k <= 8; k++) {
      const r = Ri + (R - Ri) * k / 8, cv = (r * r + ds * ds - rs * rs) / (2 * r * ds);
      phi = Math.min(phi, cv >= 1 ? 45 : 45 - Math.acos(cv) * 180 / Math.PI);
    }
    if (phi > 3) for (let q = 0; q < 4; q++) {
      const u = (a: number) => (q * 90 + a) * Math.PI / 180, ext: Poli = [], int: Poli = [];
      for (let k = 0; k <= 10; k++) { const a = -phi + 2 * phi * k / 10; ext.push([cx + R * Math.cos(u(a)), cy + R * Math.sin(u(a))]); int.push([cx + Ri * Math.cos(u(a)), cy + Ri * Math.sin(u(a))]); }
      tri.push(...prisma([...ext, ...int.reverse()], 0, ad + 0.01));
    }
    return tri;
  }
  function rotundCuGaura({ diam, H, R, cx, cy, ad, N, g, gp, rg, forma, varf_d, st, e, avert }: { diam: number; H: number; R: number; cx: number; cy: number;
    ad: number; N: number; g: string; gp: Poli; rg: number; forma: string; varf_d: number; st: string; e: Ef; avert: string[] }): Corp {
    const s = P.pas, tri: Tri[] = [], c0: P2 = [cx, cy];
    // dedesubt: la 1 x 1 locasul (gaura trece prin el); la 2 x 2 tubul din mijloc, care e chiar gaura (stift, ax) si fustele
    if (diam === 1) tri.push(...inel(cerc(cx, cy, R, N), cerc(cx, cy, P.stift_d / 2 + e.joc), c0, 0, ad));
    else {
      const ro = P.tub_contact - e.joc;
      if (g === "bara") tri.push(...tub(cx, cy, ro, Math.min(ro - 0.8, P.stift_d / 2), 0, ad + 0.01));
      else tri.push(...inel(cerc(cx, cy, ro), gp, c0, 0, ad + 0.01));
      tri.push(...fusteRotund(cx, cy, R, ad, e));
    }
    const z0 = diam === 1 ? ad - 0.01 : ad;
    let Rt = R, prinVarf = true;
    if (forma === "con") {
      Rt = Math.max(0.6, Math.min(R, varf_d / 2));
      const zc = Math.min(H - 0.6, ad + 1.0);
      tri.push(...inel(cerc(cx, cy, R, N), gp, c0, z0, zc + 0.01));
      if (Rt >= rg + 0.5) tri.push(...inel(cerc(cx, cy, R, N), gp, c0, zc, H, cerc(cx, cy, Rt, N)));
      else { prinVarf = false; tri.push(...trunchi(cx, cy, R, Rt, zc, H, N)); avert.push(tr("Vârful e prea îngust pentru gaură: gaura se oprește sub con.")); }
    } else tri.push(...inel(cerc(cx, cy, R, N), gp, c0, z0, H));
    // sus: la 2 x 2 cu toate stifturile, cele patru raman pline (gaura e intre ele); stiftul din mijloc e gol pentru bara
    if (st !== "niciunul") {
      if (diam === 2 && st === "toate" && Rt >= R - 1e-9) tri.push(...stifturi(([[1, 1], [3, 1], [1, 3], [3, 3]] as P2[]).map(([a, b]): P2 => [a * s / 2, b * s / 2]), H, e.stiftD));
      else if (Rt >= P.stift_d / 2 + 0.3) {
        if (g === "bara" && prinVarf) tri.push(...tub(cx, cy, e.stiftD / 2, e.baraGauraD / 2, H - 0.01, H + P.stift_h));
        else if (g === "bara") tri.push(...stifturi([c0], H, e.stiftD));
        else avert.push(tr("Cu gaura de ") + (g === "ax" ? tr("ax") : tr("știft", "pin")) + tr(" în mijloc, știftul din mijloc nu mai încape: iese fără."));
      } else avert.push(tr("Vârful e prea îngust pentru un știft: iese fără."));
    }
    return { tri, avert };
  }
  function rotund({ diam = 1, placi = 3, forma = "cilindru", varf_d = 5.4, stifturi: st = "toate", gaura = "nu" }: { diam?: number; placi?: number; forma?: string;
    varf_d?: number; stifturi?: string; gaura?: string }): Corp {
    // piesa rotunda de 1 x 1 sau 2 x 2: cilindru sau con (trunchi), cu varful de `varf_d` mm. Dedesubt: la 1 x 1 un locas,
    // la 2 x 2 tubul din mijloc (prinde cele patru stifturi) si patru fuste scurte intre ele. In mijloc, la cerere, o gaura
    // de sus pana jos: pentru bara de 3,2 (stiftul din mijloc ramane gol), pentru stift Technic sau pentru ax (la 2 x 2).
    diam = +diam === 2 ? 2 : 1;
    const e = ef(), s = P.pas, H = placi * P.placa, R = diam * s / 2 - P.joc_lateral, cx = diam * s / 2, cy = cx, tri: Tri[] = [], avert: string[] = [];
    const ad = Math.min(P.locas_h, H - 0.8), N = 64, c0: P2 = [cx, cy];
    let g = ["bara", "stift", "ax"].includes(gaura) ? gaura : "nu";
    if (diam === 1 && g !== "nu" && g !== "bara") { avert.push(tr("La 1 × 1 încape doar gaura pentru bară.")); g = "bara"; }
    const gp = g === "nu" ? null : gauraForma(c0, g === "bara" ? "b" : g === "ax" ? "x" : "r");
    const rg = gp ? Math.max(...gp.map(q => Math.hypot(q[0] - cx, q[1] - cy))) : 0;
    if (gp) return rotundCuGaura({ diam, H, R, cx, cy, ad, N, g, gp, rg, forma, varf_d, st, e, avert });
    if (diam === 1) tri.push(...inel(cerc(cx, cy, R, N), cerc(cx, cy, P.stift_d / 2 + e.joc), [cx, cy], 0, ad));
    else {
      const ro = P.tub_contact - e.joc;
      tri.push(...tub(cx, cy, ro, Math.min(ro - 0.8, P.stift_d / 2), 0, ad + 0.01));
      tri.push(...fusteRotund(cx, cy, R, ad, e));
    }
    const z0 = diam === 1 ? ad - 0.01 : ad;
    let Rt = R, varf = false;
    if (forma === "con") {
      Rt = Math.max(0.6, Math.min(R, varf_d / 2));
      const zc = Math.min(H - 0.6, ad + 1.0);
      tri.push(...cilindru(cx, cy, R, z0, zc + 0.01, N), ...trunchi(cx, cy, R, Rt, zc, H, N));
    } else tri.push(...cilindru(cx, cy, R, z0, H, N));
    const sts: P2[] = [];
    if (st !== "niciunul") {
      if (diam === 2 && st === "toate" && Rt >= R - 1e-9) for (const [a, b] of [[1, 1], [3, 1], [1, 3], [3, 3]] as P2[]) sts.push([a * s / 2, b * s / 2]);
      else if (Rt >= P.stift_d / 2 + 0.3) { sts.push([cx, cy]); varf = diam === 2 && st === "toate"; }
      else avert.push(tr("Vârful e prea îngust pentru un știft: iese fără."));
    }
    if (varf) avert.push(tr("Conul are un singur știft, în mijloc (ca la LEGO)."));
    tri.push(...stifturi(sts, H, e.stiftD));
    return { tri, avert };
  }
  function celulaGrinda(k: number, n: number, tip: string, groasa: boolean) {
    // celula k a grinzii (gaura ei si bucata de grinda din jur); capetele sunt rotunde
    const e = ef(), s = P.pas, w = P.grinda_lat, r = w / 2, g = groasa ? P.grinda_groasa : P.grinda_subtire;
    const cx = r + s * k, cy = r, x0 = cx - s / 2 - 0.01, x1 = cx + s / 2 + 0.01;
    const arc = (u0: number, sens: number) => Array.from({ length: 23 }, (_, t): P2 => { const u = u0 + sens * Math.PI * (t + 1) / 24; return [cx + r * Math.cos(u), cy + r * Math.sin(u)]; });
    let ext: Poli;
    if (n === 1) ext = cerc(cx, cy, r, 64);
    else if (k === 0) ext = [[cx, 0], [x1, 0], [x1, w], [cx, w], ...arc(Math.PI / 2, 1)];
    else if (k === n - 1) ext = [[x0, 0], [cx, 0], ...arc(-Math.PI / 2, 1), [cx, w], [x0, w]];
    else ext = dreptunghi(x0, 0, x1, w);
    const c: P2 = [cx, cy];
    if (tip === "x") return inel(ext, cruce(cx, cy, e.axGauraD, e.axGauraLat), c, 0, g);
    if (tip === "p") return prisma(ext, 0, g);
    if (!groasa) return inel(ext, cerc(cx, cy, e.gauraD / 2), c, 0, g);
    const h = P.lamaj_h;
    return [...inel(ext, cerc(cx, cy, e.lamajD / 2), c, 0, h), ...inel(ext, cerc(cx, cy, e.gauraD / 2), c, h - 0.01, g - h + 0.01),
            ...inel(ext, cerc(cx, cy, e.lamajD / 2), c, g - h, g)];
  }
  function celulaGrila(S: ReadonlySet<string>, i: number, j: number, tip: string, groasa: boolean) {
    // o celula a grinzii desenate pe grila: discul din jurul gaurii si bratele spre vecinii de pe grila (E, N, V, S)
    const e = ef(), s = P.pas, r = P.grinda_lat / 2, g = groasa ? P.grinda_groasa : P.grinda_subtire, L = s / 2 + 0.01;
    const cx = s * i, cy = s * j, are = (d: number) => S.has(cheie(i + [1, 0, -1, 0][d]!, j + [0, 1, 0, -1][d]!));
    const rot = (d: number, x: number, y: number): P2 => { const [ux, uy] = ([[1, 0], [0, 1], [-1, 0], [0, -1]] as P2[])[d]!; return [cx + x * ux - y * uy, cy + x * uy + y * ux]; };
    const arc = (d: number, u0: number, u1: number, k: number) => Array.from({ length: k }, (_, t) => { const u = (u0 + (u1 - u0) * t / k) * Math.PI / 180; return rot(d, r * Math.cos(u), r * Math.sin(u)); });
    const ext: Poli = [];
    for (let d = 0; d < 4; d++) {
      // sectorul de la -45 la +45 de grade in jurul directiei d
      const prev = are((d + 3) % 4), cur = are(d), next = are((d + 1) % 4);
      if (cur) { ext.push(rot(d, r, -r), rot(d, L, -r), rot(d, L, r)); continue; }
      if (prev) ext.push(rot(d, r, -r), rot(d, r, 0)); else ext.push(...arc(d, -45, 0, 8), rot(d, r, 0));
      if (!next) ext.push(...arc(d, 0, 45, 8).slice(1));
    }
    const c: P2 = [cx, cy];
    if (tip === "p") return prisma(curataPoli(ext), 0, g);
    if (tip === "x") return inel(ext, cruce(cx, cy, e.axGauraD, e.axGauraLat), c, 0, g);
    if (!groasa) return inel(ext, cerc(cx, cy, e.gauraD / 2), c, 0, g);
    const h = P.lamaj_h;
    return [...inel(ext, cerc(cx, cy, e.lamajD / 2), c, 0, h), ...inel(ext, cerc(cx, cy, e.gauraD / 2), c, h - 0.01, g - h + 0.01),
            ...inel(ext, cerc(cx, cy, e.lamajD / 2), c, g - h, g)];
  }
  function centreIndoita(brate: readonly number[], unghiuri: readonly number[]): P3[] {
    // centrele gaurilor unei grinzi indoite: bratele au cate n gauri (gaura de la cot e numarata in ambele), iar la
    // fiecare cot directia se roteste cu unghiul dat (grade, pozitiv = spre stanga)
    const s = P.pas, out: P3[] = [[0, 0, 0]];
    let dir = 0;
    brate.forEach((n: number, k: number) => {
      if (k > 0) dir += (unghiuri[k - 1] || 0) * Math.PI / 180;
      for (let i = 1; i < n; i++) { const [x, y] = out[out.length - 1]!; out.push([x + s * Math.cos(dir), y + s * Math.sin(dir), dir]); }
    });
    // la cot, gaura in cruce sta pe bisectoare (intre cele doua brate)
    for (let i = 1; i < out.length - 1; i++) {
      const a = Math.atan2(out[i]![1] - out[i - 1]![1], out[i]![0] - out[i - 1]![0]), b = Math.atan2(out[i + 1]![1] - out[i]![1], out[i + 1]![0] - out[i]![0]);
      out[i]![2] = a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) / 2;
    }
    if (out.length > 1) out[0]![2] = out[1]![2];
    return out;
  }
  function grindaIndoita({ brate = [6, 4], unghiuri = [53.13], gauri = [], groasa = true }: { brate?: number[]; unghiuri?: number[]; gauri?: readonly string[];
    groasa?: boolean }): Corp {
    // grinda cu unul sau doua coturi (ca grinzile LEGO indoite la 53,13°: 3-4-5): conturul e unirea discurilor din
    // jurul gaurilor si a fasiilor dintre ele (Cavalier), gaurile se scad (earcut)
    const e = ef(), r = P.grinda_lat / 2, g = groasa ? P.grinda_groasa : P.grinda_subtire, h = P.lamaj_h, avert: string[] = [], CV = glob.Cavalier;
    brate = brate.slice(0, 3).map(n => Math.max(2, Math.min(15, Math.round(n))));
    unghiuri = unghiuri.slice(0, brate.length - 1).map(u => Math.max(-120, Math.min(120, +u || 0)));
    const C = centreIndoita(brate, unghiuri);
    // gaurile prea apropiate (cot strans), se unesc: nu se mai pot printa ca gauri separate
    for (let i = 0; i < C.length; i++) for (let j = i + 2; j < C.length; j++) if (Math.hypot(C[i]![0] - C[j]![0], C[i]![1] - C[j]![1]) < P.grinda_lat + 0.4) { avert.push(tr("Bratele se ating la cot: unghiul e prea mare pentru lungimile astea.")); i = C.length; break; }
    const ccw = (v: Vf[]): Vf[] => (CV.plineClosed(v).area() < 0 ? v.slice().reverse().map((q, k: number, a): Vf => [q[0], q[1], -(a[(k + 1) % a.length]![2])]) : v);
    let acc: Vf[] = [[C[0]![0] + r, C[0]![1], 1], [C[0]![0] - r, C[0]![1], 1]];
    const uneste = (v: Vf[]) => {
      const rz = CV.plineClosed(acc).boolean(CV.plineClosed(v), "or");
      if (rz.posPlines.length) acc = dinPl(rz.posPlines.reduce((a, b) => (Math.abs(b.pline.area()) > Math.abs(a.pline.area()) ? b : a)).pline);
    };
    for (let i = 1; i < C.length; i++) {
      const [x0, y0] = C[i - 1]!, [x1, y1] = C[i]!, d = Math.hypot(x1 - x0, y1 - y0), nx = -(y1 - y0) / d * r, ny = (x1 - x0) / d * r;
      uneste(ccw([[x0 - nx, y0 - ny, 0], [x1 - nx, y1 - ny, 0], [x1 + nx, y1 + ny, 0], [x0 + nx, y0 + ny, 0]]));
      uneste([[x1 + r, y1, 1], [x1 - r, y1, 1]]);
    }
    const ext = curataPoli(trig(aplatizeaza(acc)));
    const tipuri = C.map((_, k) => (["r", "x", "p"].includes(gauri[k]!) ? gauri[k] : "r"));
    const rot = (poli: Poli, c: Pt, u: number): Poli => poli.map(([x, y]): P2 => { const dx = x - c[0], dy = y - c[1]; return [c[0] + dx * Math.cos(u) - dy * Math.sin(u), c[1] + dx * Math.sin(u) + dy * Math.cos(u)]; });
    const gaura = (k: number, lamaj: boolean) => {
      const c: P2 = [C[k]![0], C[k]![1]];
      if (tipuri[k] === "p") return null;
      if (tipuri[k] === "x") return rot(cruce(c[0], c[1], e.axGauraD, e.axGauraLat), c, C[k]![2]);
      return cerc(c[0], c[1], (lamaj ? e.lamajD : e.gauraD) / 2);
    };
    const strat = (lamaj: boolean, z0: number, z1: number) => prismaGauri(ext, C.map((_, k) => gaura(k, lamaj)).filter(Boolean) as Poli[], z0, z1);
    const tri = groasa ? [...strat(true, 0, h), ...strat(false, h - 0.01, g - h + 0.01), ...strat(true, g - h, g)] : strat(false, 0, g);
    return { tri, avert };
  }
  function grinda({ gauri = ["r", "r", "r"], groasa = true, celule = null, indoita = null }: { gauri?: readonly string[]; groasa?: boolean;
    celule?: readonly GauraGrila[] | null; indoita?: { brate: number[]; unghiuri: number[] } | null }): Corp {
    if (indoita) return grindaIndoita({ brate: indoita.brate, unghiuri: indoita.unghiuri, gauri, groasa });
    // grinda Technic fara stifturi, culcata (gaurile in sus); la cea groasa, gaurile rotunde au lamaj pe ambele fete.
    // Dreapta: `gauri` (tipul fiecarei gauri); de orice forma: `celule` [i, j, tip] pe grila de 8 mm, legate pe laturi.
    const tri: Tri[] = [], avert: string[] = [];
    if (celule && celule.length) {
      const S = new Set(celule.map(([i, j]) => cheie(i, j)));
      for (const [i, j, t] of celule) tri.push(...celulaGrila(S, i, j, ["r", "x", "p"].includes(t) ? t : "r", groasa));
      // intre patru celule in patrat, golul mic din mijloc se umple
      const s = P.pas, g = groasa ? P.grinda_groasa : P.grinda_subtire;
      for (const [i, j] of celule) if (S.has(cheie(i + 1, j)) && S.has(cheie(i, j + 1)) && S.has(cheie(i + 1, j + 1)))
        tri.push(...cutie(s * i + s / 2 - 0.5, s * j + s / 2 - 0.5, 0, s * i + s / 2 + 0.5, s * j + s / 2 + 0.5, g));
      // bucatile legate intre ele (pe laturi)
      const vazut = new Set([cheie(celule[0]![0], celule[0]![1])]), coada: (readonly [number, number, ...unknown[]])[] = [celule[0]!];
      while (coada.length) { const [i, j] = coada.pop()!; for (const [a, b] of [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]] as P2[]) if (S.has(cheie(a, b)) && !vazut.has(cheie(a, b))) { vazut.add(cheie(a, b)); coada.push([a, b]); } }
      if (vazut.size < S.size) avert.push(tr("Grinda are bucăți care nu se ating: ies piese separate."));
      return { tri, avert };
    }
    gauri.forEach((t, k) => tri.push(...celulaGrinda(k, gauri.length, t, groasa)));
    return { tri, avert };
  }
  function caramidaTechnic({ lung = 4, gauri = null, goale = false, stifturi: cuStifturi = true }: { lung?: number; gauri?: readonly string[] | null; goale?: boolean;
    stifturi?: boolean | "mijloc" }): Corp {
    // caramida Technic 1 x n: stifturi sus, gauri orizontale intre ele (la 5,8 mm): rotunde cu lamaj pe ambele fete ("r"),
    // pentru ax ("x") sau deloc ("p"). La 1 x 1, gaura e sub stift.
    lung = Math.max(1, Math.min(24, Math.round(lung)));
    const e = ef(), s = P.pas, H = 3 * P.placa, j0 = P.joc_lateral, tri: Tri[] = [];
    const celule = Array.from({ length: lung }, (_, i): Celula => [i, 0]), S = new Set(celule.map(([i, j]) => cheie(i, j)));
    const zj = 2.5;      // jos: locasurile pentru stifturi; sus: gaurile
    for (const [i] of celule) {
      const c: P2 = [s * i + s / 2, s / 2], pat = patratCelula(S, i, 0, j0);
      tri.push(...inel(pat, cerc(c[0], c[1], P.stift_d / 2 + e.joc), c, 0, Math.min(P.locas_h, zj - 0.4)));
      tri.push(...prisma(pat, Math.min(P.locas_h, zj - 0.4) - 0.01, zj + 0.01));
    }
    const xs = lung === 1 ? [s / 2] : Array.from({ length: lung - 1 }, (_, k) => s * (k + 1));
    const tipuri = xs.map((_, k) => (gauri && ["r", "x", "p"].includes(gauri[k]!) ? gauri[k] : "r"));
    // capetele, pline (pana la primul si de la ultimul inel)
    if (lung > 1) {
      tri.push(...cutie(j0, j0, zj, s / 2 + 0.01, s - j0, H));
      tri.push(...cutie(s * lung - s / 2 - 0.01, j0, zj, s * lung - j0, s - j0, H));
    }
    // gaurile: inele in planul xz, intinse pe y; (u, v, w) -> (x, y, z) = (u, w, v) intoarce orientarea
    const v0 = zj - P.technic_h, v1 = H - P.technic_h, h = P.lamaj_h;
    xs.forEach((x, k) => {
      const ua = x - s / 2 - 0.01 >= j0 ? -s / 2 - 0.01 : j0 - x, ub = x + s / 2 + 0.01 <= s * lung - j0 ? s / 2 + 0.01 : s * lung - j0 - x;
      const ext = dreptunghi(ua, v0, ub, v1), f = ([u, v, w]: P3): P3 => [x + u, w, P.technic_h + v];
      if (tipuri[k] === "p") tri.push(...axe(prisma(ext, j0, s - j0), f, true));
      else if (tipuri[k] === "x") tri.push(...axe(inel(ext, cruce(0, 0, e.axGauraD, e.axGauraLat), [0, 0], j0, s - j0), f, true));
      else {
        tri.push(...axe(inel(ext, cerc(0, 0, e.lamajD / 2), [0, 0], j0, j0 + h), f, true));
        tri.push(...axe(inel(ext, cerc(0, 0, e.gauraD / 2), [0, 0], j0 + h - 0.01, s - j0 - h + 0.01), f, true));
        tri.push(...axe(inel(ext, cerc(0, 0, e.lamajD / 2), [0, 0], s - j0 - h, s - j0), f, true));
      }
    });
    const st: P2[] = cuStifturi === "mijloc" ? [[s * lung / 2, s / 2]] : celule.map(([i]) => [s * i + s / 2, s / 2]);
    if (cuStifturi === true && goale) for (const [x, y] of st) tri.push(...tub(x, y, e.stiftD / 2, e.baraGauraD / 2, H - 0.01, H + P.stift_h));
    else if (cuStifturi) tri.push(...stifturi(st, H, e.stiftD));
    return { tri, avert: [] };
  }
  function ax({ lung = 3 }: { lung?: number }): Corp {
    // axul in cruce, culcat pe un brat: sectiunea in planul yz, intinsa pe x; (u, v, w) -> (w, u, v) pastreaza orientarea
    const d = P.ax_d, L = P.pas * lung - 0.2;
    const sec = cruce(d / 2, d / 2, d, P.ax_lat);
    return { tri: axe(prisma(sec, 0, L), ([u, v, w]) => [w, u, v], false), avert: [] };
  }
  function stiftTechnic({ fanta = true, lung = 2, capat = "stift" }: { fanta?: boolean; lung?: number; capat?: string }): Corp {
    // stiftul Technic de 2 sau 3 (cu gulerul la 1 de un capat), culcat pe o fata taiata (0,35 mm), cu fanta la capetele
    // rotunde; cu `capat: "ax"`, partea scurta e ax in cruce (stiftul cu ax)
    const n = +lung === 3 ? 3 : 2, r = P.stift_technic_d / 2, L = n * P.pas - 0.2, gl = P.guler_lat, rg = P.guler_d / 2, taie = 0.35, ax0 = r - taie;
    const taieCu = (poli: readonly P2[], f: (q: P2) => number): Poli => { const out: Poli = []; for (let i = 0; i < poli.length; i++) { const A = poli[i], B = poli[(i + 1) % poli.length], fa = f(A!), fb = f(B!); if (fa >= 0) out.push(A!); if (fa * fb < 0) { const t = fa / (fa - fb); out.push([A![0] + (B![0] - A![0]) * t, A![1] + (B![1] - A![1]) * t]); } } return out; };
    const d = (rr: number, a: number, b: number) => {
      // sectiunea: cercul de raza rr in jurul axei (inaltimea ax0), taiat de masa; doar intre u in [a, b]
      const pts: Poli = [];
      for (let i = 0; i <= 64; i++) { const u = 2 * Math.PI * i / 64; pts.push([rr * Math.cos(u), ax0 + rr * Math.sin(u)]); }
      let p = pts.slice(0, 64);
      p = taieCu(p, q => q[1]); p = taieCu(p, q => q[0] - a); p = taieCu(p, q => b - q[0]);
      return trig(p);
    };
    const f = ([u, v, w]: P3): P3 => [w, u, v], tri: Tri[] = [], cuAx = capat === "ax";
    const lf = fanta ? 5 : 0, xg = n === 2 ? L / 2 : L - (P.pas - 0.1), xa = xg - gl / 2, xb = xg + gl / 2, f2 = 0.4;
    // capetele (cu fanta), corpul si gulerul
    for (const [w0, w1] of (cuAx ? [[0, lf]] : [[0, lf], [L - lf, L]]) as P2[]) if (lf) for (const [a, b] of [[-rg, -f2], [f2, rg]] as P2[]) tri.push(...axe(prisma(d(r, a, b), w0, w1), f, false));
    if (!cuAx) tri.push(...axe(prisma(d(r, -rg, rg), lf - 0.01, L - lf + 0.01), f, false));
    else {
      tri.push(...axe(prisma(d(r, -rg, rg), lf - 0.01, xb), f, false));
      const sec = curataPoli(trig(taieCu(cruce(0, ax0, P.ax_d, P.ax_lat), q => q[1])));
      tri.push(...axe(prisma(sec, xa, L), f, false));
    }
    tri.push(...axe(prisma(d(rg, -rg, rg), xa, xb), f, false));
    return { tri, avert: [] };
  }
  function bucsa({ lung = 1, gaura = "x" }: { lung?: number; gaura?: string }): Corp {
    // bucsa / conectorul de ax: cilindru de 7,2 in picioare, cu gaura de ax (cruce), rotunda (stift) sau jumatate-jumatate
    const n = [0.5, 1, 2, 3].includes(+lung) ? +lung : 1, e = ef(), h = n * P.pas - 0.2, R = P.bucsa_d / 2, c: P2 = [R, R], ext = cerc(R, R, R, 64);
    const gx = cruce(R, R, e.axGauraD, e.axGauraLat), gr = cerc(R, R, e.gauraD / 2), avert: string[] = [];
    let tri: Tri[];
    if (gaura === "xr" && n >= 1) tri = [...inel(ext, gx, c, 0, h / 2 + 0.01), ...inel(ext, gr, c, h / 2, h)];
    else { if (gaura === "xr") avert.push(tr("Bucșa de ½ are o singură gaură: am făcut-o pentru ax.")); tri = inel(ext, gaura === "r" ? gr : gx, c, 0, h); }
    return { tri, avert };
  }
  // ---------------------------------------------------------------------------------------------- suporti, cleme, bare, bile
  const randCelule = (lung: number, adanc = 1): Celula[] => { const c: Celula[] = []; for (let i = 0; i < lung; i++) for (let j = 0; j < adanc; j++) c.push([i, j]); return c; };
  function stifturiFata(xs: readonly number[], zs: readonly number[], y0: number, sens: number): Tri[] {
    // stifturi culcate pe o fata verticala (planul y = y0), spre -y (sens -1) sau +y (sens 1)
    const e = ef(), tri: Tri[] = [];
    for (const x of xs) for (const z of zs) {
      const cil = cilindru(x, z, e.stiftD / 2, 0, P.stift_h + 0.01);
      tri.push(...axe(cil, sens < 0 ? ([u, v, w]) => [u, y0 + 0.01 - w, v] : ([u, v, w]) => [u, y0 - 0.01 + w, v], sens > 0));
    }
    return tri;
  }
  function suport({ lung = 2, adanc = 1, inalt = 1, invers = false }: { lung?: number; adanc?: number; inalt?: number; invers?: boolean }): Corp {
    // suportul (bracket): o placa culcata si una in picioare, in fata ei, cu stifturi spre inainte. Normal: placa culcata
    // jos; intors: sus (atunci cere suport la printare). Stifturile din fata sunt la 4 mm (+ 8 mm pe rand) de jos.
    lung = Math.max(1, Math.min(8, Math.round(lung))); adanc = Math.max(1, Math.min(4, Math.round(adanc))); inalt = Math.max(1, Math.min(4, Math.round(inalt)));
    const s = P.pas, j0 = P.joc_lateral, t = P.placa, Hv = s * inalt - j0, tri: Tri[] = [], avert: string[] = [];
    const baza = caramida({ celule: randCelule(lung, adanc), placi: 1, fund: invers ? "locasuri" : "tuburi" }).tri;
    tri.push(...(invers ? muta(baza, 0, 0, Hv - P.placa) : baza));
    tri.push(...cutie(j0, j0 - t, 0, s * lung - j0, j0 + 0.01, Hv));
    tri.push(...stifturiFata(Array.from({ length: lung }, (_, i) => s * i + s / 2), Array.from({ length: inalt }, (_, k) => s * k + s / 2), j0 - t, -1));
    if (invers) avert.push(tr("Placa de sus stă în aer: la printare cere suport sub ea."));
    return { tri, avert };
  }
  function sectiuneC(ri: number, ro: number, gura: number, unghi: number, cx: number, cy: number) {
    // inelul deschis al clemei (in plan), cu gura de latime `gura` spre unghiul dat (trigonometric)
    const ao = Math.asin(gura / 2 / ro), ai = Math.asin(gura / 2 / ri), p: Poli = [], n = 40;
    for (let k = 0; k <= n; k++) { const u = unghi + ao + (2 * Math.PI - 2 * ao) * k / n; p.push([cx + ro * Math.cos(u), cy + ro * Math.sin(u)]); }
    for (let k = 0; k <= n; k++) { const u = unghi + 2 * Math.PI - ai - (2 * Math.PI - 2 * ai) * k / n; p.push([cx + ri * Math.cos(u), cy + ri * Math.sin(u)]); }
    return p;
  }
  function clema({ lung = 1, axa = "verticala", goale = false }: { lung?: number; axa?: string; goale?: boolean }): Corp {
    // placa 1 x n cu o clema in fata (tine o bara de 3,2): cu axa in sus (bara sta in picioare) sau culcata, de-a lungul
    // placii (bara sta culcata). Cu o placa cu maner face o balama.
    lung = +lung === 2 ? 2 : 1;
    const s = P.pas, j0 = P.joc_lateral, H = P.placa, ri = ef().clemaD / 2, ro = ri + P.clema_perete, w = P.clema_gura, xc = s * lung / 2, tri: Tri[] = [], avert: string[] = [];
    tri.push(...caramida({ celule: randCelule(lung), placi: 1, goale }).tri);
    const qc = -(ro + 0.2), gat: P2 = [qc + ri + 0.3, 0.5];
    if (axa === "orizontala") {
      // sectiunea in planul (y, z), intinsa pe x pe 3,6 mm; inelul atinge masa
      const Lc = 3.6, f = ([a, b, x]: P3): P3 => [x, j0 + a, b];
      tri.push(...axe(prisma(trig(sectiuneC(ri, ro, w, Math.PI, qc, ro)), xc - Lc / 2, xc + Lc / 2), f, false));
      tri.push(...axe(prisma(dreptunghi(gat[0], 0, gat[1], Math.min(H, 2 * ro)), xc - Lc / 2, xc + Lc / 2), f, false));
    } else {
      tri.push(...prisma(trig(sectiuneC(ri, ro, w, -Math.PI / 2, xc, j0 + qc)), 0, H));
      tri.push(...cutie(xc - (ro - 0.5), j0 + gat[0], 0, xc + (ro - 0.5), j0 + gat[1], H));
    }
    return { tri, avert };
  }
  function sectiuneBara(r: number, lung?: number): Poli {
    // bara culcata pe masa, taiata dedesubt cu 0,25 mm: sectiunea in planul (y, z)
    const p: Poli = [];
    for (let i = 0; i < 48; i++) { const u = 2 * Math.PI * i / 48; p.push([r * Math.cos(u), r - 0.25 + r * Math.sin(u)]); }
    const out: Poli = [];
    for (let i = 0; i < p.length; i++) { const A = p[i], B = p[(i + 1) % p.length]; if (A![1] >= 0) out.push(A!); if ((A![1] >= 0) !== (B![1] >= 0)) { const t = A![1] / (A![1] - B![1]); out.push([A![0] + (B![0] - A![0]) * t, 0]); } }
    return curataPoli(trig(out));
  }
  function maner({ lung = 2, axa = "orizontala" }: { lung?: number; axa?: string }): Corp {
    // placa 1 x n cu o bara de 3,2 in fata (manerul), prinsa la capete: culcata de-a lungul placii sau in picioare
    lung = Math.max(1, Math.min(4, Math.round(lung)));
    const s = P.pas, j0 = P.joc_lateral, H = P.placa, rb = P.bara_d / 2, ro = ef().clemaD / 2 + P.clema_perete, tri: Tri[] = [], avert: string[] = [];
    tri.push(...caramida({ celule: randCelule(lung), placi: 1 }).tri);
    if (axa === "verticala") {
      // bara in picioare, prinsa doar sus de un brat care pleaca dintr-un stalp din fata placii: jos e libera pe
      // inaltimea clemei (3,2 + 0,4), ca o placa cu clema, pusa la acelasi nivel, sa se prinda pe ea dintr-o parte
      const xc = s * lung / 2, post = 1.0, yb = j0 - post - ro - 0.3, zl = P.placa + 0.4, hb = zl + 1.2;
      tri.push(...cutie(xc - 1.6, j0 - post, 0, xc + 1.6, j0 + 0.01, hb));
      tri.push(...cilindru(xc, yb, rb, 0, hb));
      tri.push(...cutie(xc - rb, yb, zl, xc + rb, j0 - post + 0.01, hb));
    } else {
      // bara culcata la inaltimea centrului clemei culcate (placile la acelasi nivel); bratele de la capete o tin
      const yb = -(ro + 0.3), zb = ro, f = ([a, b, x]: P3): P3 => [x, j0 + a, b], sec = cerc(yb, zb, rb, 48);
      tri.push(...axe(prisma(trig(sec), j0, s * lung - j0), f, false));
      // de la 3 in sus, inca un brat la mijloc, ca bara (care se printeaza ca o punte) sa nu aiba mai mult de ~13,5 mm in aer
      const brate: P2[] = [[j0, j0 + 1.6], [s * lung - j0 - 1.6, s * lung - j0], ...(lung >= 3 ? [[s * lung / 2 - 0.8, s * lung / 2 + 0.8]] as P2[] : [])];
      for (const [x0, x1] of brate) tri.push(...cutie(x0, j0 + yb, 0, x1, j0 + 0.01, zb + rb));
    }
    return { tri, avert };
  }
  function bara({ lung = 4 }: { lung?: number }): Corp {
    // bara de 3,2 culcata (taiata 0,25 mm dedesubt), lunga de n stifturi
    const L = Math.max(1, Math.min(16, Math.round(lung))) * P.pas - 0.2;
    return { tri: axe(prisma(sectiuneBara(P.bara_d / 2), 0, L), ([a, b, x]) => [x, a, b], false), avert: [] };
  }
  function bazaArticulatie(baza: number) {
    // placa de sub bila / cupa: 1 x 1 fara stift sau 2 x 2 cu cele patru stifturi
    return baza === 2 ? caramida({ celule: randCelule(2, 2), placi: 1 }).tri : caramida({ celule: [[0, 0]], placi: 1, stifturi: false, fund: "locasuri" }).tri;
  }
  function bila({ baza = 1 }: { baza?: number }): Corp {
    // bila de 5,9 (ca la LEGO) pe un gat de 3,2, in mijlocul unei placi
    baza = +baza === 2 ? 2 : 1;
    const H = P.placa, rb = P.bila_d / 2, rn = 1.6, c = baza * P.pas / 2, zc = H + 1.5 + Math.sqrt(rb * rb - rn * rn), tri = bazaArticulatie(baza);
    tri.push(...cilindru(c, c, rn, H - 0.01, zc), ...sfera(c, c, zc, rb, 40));
    return { tri, avert: [tr("Sub bilă, primele straturi stau în aer: dacă iese urâtă, printeaz-o cu suport.")] };
  }
  function cupa({ baza = 1 }: { baza?: number }): Corp {
    // cupa pentru bila: gaura sferica deschisa sus, cu patru fante ca sa se deschida cand intra bila
    baza = +baza === 2 ? 2 : 1;
    const e = ef(), H = P.placa, Rc = e.cupaD / 2, Ro = Math.min(P.pas / 2 - P.joc_lateral, Rc + 0.85), rg = e.cupaGura / 2, c = baza * P.pas / 2;
    const zc = H + 0.4 + Rc, z1 = zc - Rc + 0.3, zt = zc + Math.sqrt(Rc * Rc - rg * rg), zs = zc - 1.6, tri = bazaArticulatie(baza), avert: string[] = [];
    if (baza === 2) avert.push(tr("Cupa e mai lată decât locul dintre știfturi: pe 2 × 2 am lăsat știfturile, dar se ating de ea."));
    const sf = (z0: number, z1_: number) => {
      // peretele gaurii sferice, de sus in jos, intre z0 (sus) si z1_ (jos)
      const t0 = Math.asin((z0 - zc) / Rc), t1 = Math.asin((z1_ - zc) / Rc), p: Poli = [];
      for (let k = 0; k <= 16; k++) { const t = t0 + (t1 - t0) * k / 16; p.push([Rc * Math.cos(t), zc + Rc * Math.sin(t)]); }
      return p;
    };
    tri.push(...cilindru(c, c, Ro, H - 0.01, z1 + 0.01, 64));
    const r1 = Math.sqrt(Rc * Rc - (z1 - zc) ** 2);
    tri.push(...strung([[r1, z1], [Ro, z1], [Ro, zs + 0.01], ...sf(zs + 0.01, z1)], 0, 2 * Math.PI, c, c, 64));
    const fanta = 0.8 / rg;
    for (let q = 0; q < 4; q++) {
      const a0 = q * Math.PI / 2 + fanta / 2, a1 = (q + 1) * Math.PI / 2 - fanta / 2;
      tri.push(...strung([[Ro, zs], [Ro, zt], [rg, zt], ...sf(zt, zs).slice(1)], a0, a1, c, c, 64));
    }
    return { tri, avert };
  }

  // ---------------------------------------------------------------------------------------------- rotitele dintate (ADR 0169)
  // Profilul evolventic, generat de cremaliera de referinta (unghiul de presiune 20°, capul 1·m, piciorul 1,25·m), ca la
  // frezarea prin rulare: la putini dinti, subtaierea de la picior iese singura. Jocul pe flanc (pe cercul de divizare) vine
  // din calibrare. Roata sta in planul xy, cu centrul in origine; dintele 0 pe +x. Modulul 1 e al rotilor LEGO Technic:
  // perechile obisnuite cad pe grila de 8 mm (8 + 24, 16 + 16 la 16 mm).
  type ProfilRoata = { z: number; m: number; r: number; ra: number; rf: number; raze: number[]; jum: number[] };
  const profileRoti = new Map<string, ProfilRoata>();
  const rotP = ([x, y]: Pt, a: number): P2 => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
  function intervalCerc(poli: readonly P2[], rho: number): [number, number] | null {
    // unghiurile (fata de +y, pozitiv spre -x) in care cercul de raza rho e in poligonul convex: unde taie laturile, apoi
    // arcele dintre ele cu mijlocul in poligon
    const t: number[] = [];
    for (let i = 0; i < poli.length; i++) {
      const a = poli[i]!, b = poli[(i + 1) % poli.length]!, dx = b[0] - a[0], dy = b[1] - a[1];
      const A = dx * dx + dy * dy, B = 2 * (a[0] * dx + a[1] * dy), C = a[0] * a[0] + a[1] * a[1] - rho * rho, D = B * B - 4 * A * C;
      if (D < 0) continue;
      for (const s of [-1, 1]) { const u = (-B + s * Math.sqrt(D)) / (2 * A); if (u >= 0 && u <= 1) t.push(Math.atan2(-(a[0] + u * dx), a[1] + u * dy)); }
    }
    if (t.length < 2) return null;
    t.sort((p, q) => p - q);
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i + 1 < t.length; i++) {
      const mij = (t[i]! + t[i + 1]!) / 2;
      if (inPoli(poli, [-rho * Math.sin(mij), rho * Math.cos(mij)])) { lo = Math.min(lo, t[i]!); hi = Math.max(hi, t[i + 1]!); }
    }
    return lo <= hi ? [lo, hi] : null;
  }
  function profilRoata(z: number, m: number, joc: number): ProfilRoata {
    // jumatatea unghiului dintelui la fiecare raza: cremaliera taie golul (centrat pe +y la phi = 0), rulata pe cercul de
    // divizare; golul la o raza e cat acopera cremaliera, legat de mijlocul lui
    const cheie = z + "|" + m + "|" + joc, gata = profileRoti.get(cheie);
    if (gata) return gata;
    const alfa = 20 * Math.PI / 180, r = m * z / 2, ra = r + m, rf = r - 1.25 * m;
    const sc = Math.PI * m / 2 + 2 * joc, lat = (y: number) => sc / 2 + y * Math.tan(alfa);
    const dinte: P2[] = [[-lat(-1.25 * m), -1.25 * m], [lat(-1.25 * m), -1.25 * m], [lat(1.5 * m), 1.5 * m], [-lat(1.5 * m), 1.5 * m]];
    // pe cercul de picior varful cremalierei doar atinge cercul: razele pornesc putin deasupra lui
    const N = 20, r0 = rf + 0.002 * m, raze = Array.from({ length: N + 1 }, (_, i) => r0 + (ra - r0) * i / N), gol = raze.map(() => 0);
    const phiMax = 2.6 * 2 * Math.PI / z, pasi = 600;
    for (let k = 0; k <= pasi; k++) {
      const phi = -phiMax + 2 * phiMax * k / pasi;
      const poli = dinte.map(([x, y]) => rotP([x - r * phi, r + y], -phi));
      raze.forEach((rho, i) => {
        const iv = intervalCerc(poli, rho);
        if (!iv) return;
        if (iv[0] <= gol[i]! + 1e-9 && iv[1] > gol[i]!) gol[i] = iv[1];
        if (-iv[1] <= gol[i]! + 1e-9 && -iv[0] > gol[i]!) gol[i] = -iv[0];
      });
    }
    const R = { z, m, r, ra, rf, raze, jum: gol.map(g => Math.PI / z - g) };
    profileRoti.set(cheie, R);
    return R;
  }
  function conturRoata(R: ProfilRoata, fata = 0): Poli {
    // conturul (trigonometric): pe fiecare dinte, flancul din dreapta de la picior la cap, apoi cel din stanga, in jos
    const out: Poli = [];
    for (let k = 0; k < R.z; k++) {
      const c = fata + k * 2 * Math.PI / R.z, jos: P2[] = [], sus: P2[] = [];
      for (let i = 0; i < R.raze.length; i++) {
        const h = R.jum[i]!, rho = R.raze[i]!;
        if (h <= 0) break;
        jos.push([rho * Math.cos(c - h), rho * Math.sin(c - h)]);
        sus.push([rho * Math.cos(c + h), rho * Math.sin(c + h)]);
      }
      // mijlocul capului, pe cercul de cap (altfel coarda dintre cele doua capete ale arcului scurteaza diametrul)
      out.push(...jos, [R.ra * Math.cos(c), R.ra * Math.sin(c)], ...sus.reverse());
    }
    return out.filter((p, i) => { const q = out[(i + 1) % out.length]!; return Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-9; });
  }
  function pereteGaura(ext: Poli, g: Poli): number {
    // cel mai subtire perete dintre gaura g si conturul ext (varf-latura, in ambele sensuri); -1 daca gaura iese din contur
    // sau il taie (atunci un varf al unuia e de partea gresita a celuilalt)
    if (g.some(p => !inPoli(ext, p)) || ext.some(p => inPoli(g, p))) return -1;
    const ds = (p: P2, a: P2, b: P2) => {
      const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy;
      const u = l ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l)) : 0;
      return Math.hypot(p[0] - a[0] - u * dx, p[1] - a[1] - u * dy);
    };
    let d = Infinity;
    for (const [A, B] of [[g, ext], [ext, g]] as const) for (const p of A) for (let i = 0; i < B.length; i++) d = Math.min(d, ds(p, B[i]!, B[(i + 1) % B.length]!));
    return d;
  }
  function prismaRasucita(ext: Poli, gauri: readonly Poli[], h: number, straturi: number, unghi: (z: number) => number): Tri[] {
    // ca prismaGauri, cu exteriorul rotit strat cu strat in jurul originii (unghi(z), in radiani); gaurile raman drepte.
    // Varfurile se misca o singura data (ca in prismaGauri), apoi straturile le rotesc: capacul de sus si ultimul strat al
    // peretelui au aceleasi puncte, deci corpul ramane inchis.
    const mic = ([x, y]: P2): P2 => { const g = (u: number) => { const t = Math.sin(x * 12.9898 + y * 78.233 + u) * 43758.5453; return t - Math.floor(t) - 0.5; }; return [x + 2e-4 * g(0), y + 2e-4 * g(1.7)]; };
    const E = curataPoli(trig(ext)).map(mic), G = gauri.map(g => curataPoli(trig(g)).reverse().map(mic));
    const zStrat = (i: number) => (i === straturi ? h : h * i / straturi);
    const strat = (i: number) => { const a = unghi(zStrat(i)); return E.map(p => rotP(p, a)); };
    const p3 = (p: Pt, z: number): P3 => [p[0], p[1], z], tri: Tri[] = [];
    const capac = (S: readonly P2[], z: number, sus: boolean) => {
      const pts: P2[] = [...S], idx: number[] = [];
      for (const g of G) { idx.push(pts.length); pts.push(...g); }
      const t = glob.earcut(pts.flat(), idx, 2);
      for (let k = 0; k < t.length; k += 3) {
        const a = t[k]!; let b = t[k + 1]!, c = t[k + 2]!;
        if (arie2(pts, a, b, c) < 0) [b, c] = [c, b];
        tri.push(sus ? [p3(pts[a]!, z), p3(pts[b]!, z), p3(pts[c]!, z)] : [p3(pts[a]!, z), p3(pts[c]!, z), p3(pts[b]!, z)]);
      }
    };
    let A = strat(0);
    capac(A, 0, false);
    for (let i = 1; i <= straturi; i++) {
      const B = strat(i), z0 = zStrat(i - 1), z1 = zStrat(i);
      for (let k = 0; k < A.length; k++) { const k1 = (k + 1) % A.length; tri.push([p3(A[k]!, z0), p3(A[k1]!, z0), p3(B[k1]!, z1)], [p3(A[k]!, z0), p3(B[k1]!, z1), p3(B[k]!, z1)]); }
      A = B;
    }
    capac(A, h, true);
    for (const L of G) for (let i = 0; i < L.length; i++) {
      const a = L[i]!, b = L[(i + 1) % L.length]!;
      tri.push([p3(a, 0), p3(b, 0), p3(b, h)], [p3(a, 0), p3(b, h), p3(a, h)]);
    }
    return tri;
  }
  // gaura unei roți dințate (rotițele, conicele duble): în cruce (pentru ax), rotundă (pe știft) sau deloc, cu jocurile de la
  // calibrare; peretele adevărat până la conturul ext (colțurile crucii și coarda golului, nu doar razele). Unde, dreaptă, ar rămâne
  // sub 0,8 mm, crucea se rotește (pe sfertul ei de simetrie, din 5,625 în 5,625°) unde peretele iese cel mai gros: la roata de 8,
  // brațele spre goluri, 0,23 mm în loc de 0,04 (colțurile cădeau sub goluri). Sub 0,1 mm gaura lipsește; sub 0,8, roata iese slabă.
  function gauraRoata(ext: Poli, gaura: string): { g: Poli[]; perete: number; lipseste: boolean; slaba: boolean } {
    const e = ef();
    let g: Poli[] = gaura === "r" ? [cerc(0, 0, e.gauraD / 2)] : gaura === "nu" ? [] : [cruce(0, 0, e.axGauraD, e.axGauraLat)];
    let perete = g.length ? pereteGaura(ext, g[0]!) : Infinity;
    if (gaura === "x" && perete < 0.8) {
      const g0 = g[0]!;
      for (let i = 1; i < 16; i++) {
        const gi = g0.map(p => rotP(p, i * Math.PI / 32)), pi = pereteGaura(ext, gi);
        if (pi > perete + 1e-9) { g = [gi]; perete = pi; }
      }
    }
    const lipseste = g.length > 0 && perete < 0.1;
    return { g: lipseste ? [] : g, perete, lipseste, slaba: !lipseste && g.length > 0 && perete < 0.8 };
  }
  function rotita({ dinti = 24, fel = "drepti", unghi = 20, sens = "dreapta", grosime = 3.8, gaura = "x", modul = 1 }: {
    dinti?: number; fel?: string; unghi?: number; sens?: string; grosime?: number; gaura?: string; modul?: number }): Corp {
    // roata dintata: dinti drepti, oblici (elicoidali; sensul dreapta = elicea urca in sens trigonometric) sau in V; gaura de
    // ax (in cruce), rotunda (pe stift) sau deloc, cu jocurile de la calibrare, ca la grinda si la bucsa
    const e = ef(), avert: string[] = [];
    const z = Math.round(Math.min(80, Math.max(8, Number.isFinite(+dinti) ? +dinti : 24)));
    if (z !== +dinti) avert.push(tr`O roată are între 8 și 80 de dinți: am făcut-o cu ${z}.`);
    const m = Math.min(3, Math.max(0.5, Math.round((Number.isFinite(+modul) ? +modul : 1) * 10) / 10));
    const h = Math.min(20, Math.max(1, Math.round((Number.isFinite(+grosime) ? +grosime : 3.8) * 10) / 10));
    const beta = Math.min(35, Math.max(10, Number.isFinite(+unghi) ? +unghi : 20)) * Math.PI / 180, s = sens === "stanga" ? -1 : 1;
    const R = profilRoata(z, m, e.jocDinti), ext = conturRoata(R, 0), G = gauraRoata(ext, gaura), g = G.g;
    if (G.lipseste) avert.push(tr`Gaura nu încape în roata asta: am făcut-o fără gaură. Alege mai mulți dinți sau un modul mai mare.`);
    else if (G.slaba) avert.push(tr`Între gaură și piciorul dinților rămân doar ${String(Math.round(G.perete * 100) / 100).replace(".", Limba.zecimal)} mm: roata iese slabă. Alege mai mulți dinți sau un modul mai mare.`);
    if (fel !== "oblici" && fel !== "inv") return { tri: prismaGauri(ext, g, 0, h), avert };
    // rasucirea pe cercul de divizare: tan(beta) / r radiani pe mm; straturi de cel mult 0,8°
    const k = Math.tan(beta) / R.r * s, pas = 0.8 * Math.PI / 180;
    if (fel === "oblici") return { tri: prismaRasucita(ext, g, h, Math.max(6, Math.ceil(Math.abs(h * k) / pas)), zh => zh * k), avert };
    // in V: jumatate intr-un sens, jumatate inapoi; un numar par de straturi, ca varful V-ului sa cada pe un strat
    const n = Math.max(4, Math.ceil(Math.abs(h / 2 * k) / pas));
    return { tri: prismaRasucita(ext, g, h, 2 * n, zh => (zh <= h / 2 ? zh : h - zh) * k), avert };
  }

  // ---------------------------------------------------------------------------------------------- roata cu anvelopa
  // Roata cu anvelopă (ADR 0280, felia 3.Tj), culcată pe pat: axa pe z, fața cu spițele jos. Janta: banda cu scaunul
  // anvelopei și canalul nervurii, butucul cu gaura Technic, discul sau spițele pe fața de jos; anvelopa: alezajul cu
  // nervura, umerii teșiți, banda de rulare. Corpuri închise care se suprapun, ca știfturile cărămizilor. Cotele LEGO, din
  // biblioteca LDraw (CC BY 4.0): janta 55982 are scaunul Ø16,8 pe 13,6 mm și canalul nervurii la mijloc; anvelopa 58090
  // are 30,4 × 13,6, alezajul Ø16,5, nervura de 2,8 mm până la r 7,46, umerii teșiți de la r 15,15 la 14,0 pe 1,8 mm și
  // trei canale de 0,4 mm pe banda de rulare.
  const ROATA = {
    // canalul nervurii în scaun: peretele de jos la −1,7 de mijloc, fundul plat (la −1,05 sub scaun) până la +1,25, apoi
    // teșitura de 45°; nervura anvelopei LEGO 58090 (LDraw, pe felii de 0,1 mm) ocupă ±1,6, cu flancurile abrupte (r 8,39 la
    // ±1,6, 7,59 la ±1,25) și fundul aproape plat (7,50 la ±0,6, 7,45 la mijloc): jocul e de cel puțin 0,1 mm peste tot
    canalJos: 1.7, canalSus: 1.25, canalAd: 1.05, perete: 0.85,
    // anvelopa tipărită: alezajul cu 0,15 sub scaun; nervura cu forma celei LEGO, [deplasarea pe z, adâncimea sub alezaj]
    alezaj: 0.15, nervura: [[1.6, 0], [1.25, 0.66], [0.6, 0.75], [0, 0.8]] as [number, number][],
    umar: 1.15, umarLat: 1.8, nervuri: 2.6, nervuraLat: 0.4, nervuraAdanc: 0.4, // umerii teșiți; canalele benzii (la 13,6 mm)
    bloc: 0.6, butuc: 4.8, peretButuc: 1.6, spita: 1.8, ramura: 0.8, fata: 0.3,
  };
  // raza găurii din butucul roților (ADR 0280): până la colțul crucii, la gaura de ax
  const razaGauraButuc = (gaura: string): number => { const e = ef(); return gaura === "r" ? e.gauraD / 2 : gaura === "nu" ? 0 : Math.hypot(e.axGauraD / 2, e.axGauraLat / 2); };
  // cotele jantei (o singură dată, pentru motor și atelier): peretele de sub canal crește cu diametrul (0,04·D, cel puțin
  // 0,85 ca la LEGO), banda pornește de la rb, butucul are raza rh; spițele încap doar dacă între butuc și bandă rămân 3,5 mm
  function jantaCote(D: number, gaura: string) {
    const K = ROATA, perete = Math.max(K.perete, 0.04 * D), rb = D / 2 - K.canalAd - perete;
    const rh = Math.max(K.butuc, razaGauraButuc(gaura) + K.peretButuc);
    return { rb, rh, spite: rb - rh >= 3.5 - 1e-9 };
  }
  // cercurile grilei (8, 16 … mm) pe care încap găurile de știft ale unei fețe de roată (ADR 0280, ca la fulia LEGO 4185):
  // știftul Technic trece de bandă (rb) cu cel puțin 0,1 mm, iar gaura rămâne la 0,4 mm de butuc (rh)
  function cercuriStift(rh: number, rb: number): number[] {
    const e = ef(), out: number[] = [];
    for (let k = 1; P.pas * k + P.stift_technic_d / 2 + 0.1 <= rb + 1e-9; k++) if (P.pas * k - e.gauraD / 2 >= rh + 0.4 - 1e-9) out.push(k);
    return out;
  }
  // butucul roților (ADR 0280): același cerc la toate găurile (prismaGauri, ca la rotițe), deci găurile diferă doar prin aria
  // lor; înalt cât h
  function butucRoata(gaura: string, rh: number, h: number): Tri[] {
    const e = ef();
    const g: Poli | null = gaura === "r" ? cerc(0, 0, e.gauraD / 2) : gaura === "nu" ? null : cruce(0, 0, e.axGauraD, e.axGauraLat);
    return prismaGauri(cerc(0, 0, rh), g ? [g] : [], 0, h);
  }
  // fața roților (ADR 0280), de la z 0 la tp, de la butuc (rh) la bandă (rb), peste ele câte 0,3 mm: discul, discul cu N
  // găuri, găurile de știft pe cercurile grilei (6·k pe cercul k, ca la fulia LEGO: șase la r 8, de la 30°) sau N spițe,
  // drepte ori în Y; spițele, după diametrul D (1,8–4,5 mm)
  function fataRoata(fata: string, N: number, rh: number, rb: number, tp: number, D: number): Tri[] {
    const K = ROATA, tri: Tri[] = [];
    const ws = Math.min(4.5, Math.max(K.spita, 0.07 * D)), wr = Math.max(1.4, K.ramura * ws), r0 = rh - 0.3, r1 = rb + 0.3;
    const bara = (A: P2, B: P2, w: number): Poli => {
      const L = Math.hypot(B[0] - A[0], B[1] - A[1]), nx = -(B[1] - A[1]) / L * w / 2, ny = (B[0] - A[0]) / L * w / 2;
      return trig([[A[0] + nx, A[1] + ny], [B[0] + nx, B[1] + ny], [B[0] - nx, B[1] - ny], [A[0] - nx, A[1] - ny]]);
    };
    if (fata === "disc") tri.push(...inel(cerc(0, 0, r1), cerc(0, 0, r0), [0, 0], 0, tp));
    else if (fata === "gauri") {
      const rm = (rh + rb) / 2, rgol = Math.max(0.6, Math.min((rb - rh) / 2 - 0.9, rm * Math.sin(Math.PI / N) - 0.9));
      tri.push(...prismaGauri(cerc(0, 0, r1), [cerc(0, 0, r0), ...Array.from({ length: N }, (_, k) => cerc(rm * Math.cos(2 * Math.PI * k / N + Math.PI / N), rm * Math.sin(2 * Math.PI * k / N + Math.PI / N), rgol, 24))], 0, tp));
    } else if (fata === "stift") {
      // gaura poate trece de bandă (știftul nu): fața se întinde atunci sub bandă, cât s-o cuprindă
      const rg = ef().gauraD / 2, gauri: Poli[] = [cerc(0, 0, r0)];
      let re = r1;
      for (const k of cercuriStift(rh, rb)) {
        for (let j = 0; j < 6 * k; j++) { const a = (2 * j + 1) * Math.PI / (6 * k); gauri.push(cerc(P.pas * k * Math.cos(a), P.pas * k * Math.sin(a), rg, 32)); }
        re = Math.max(re, P.pas * k + rg + 0.1);
      }
      tri.push(...prismaGauri(cerc(0, 0, re, Math.max(N_CERC, 4 * Math.ceil(2 * Math.PI * re / 4.8))), gauri, 0, tp));
    } else {
      const rs = rh + 0.45 * (rb - rh), phi = 0.35 * Math.PI / N;
      for (let k = 0; k < N; k++) {
        const t = 2 * Math.PI * k / N, u = (r: number, a: number): P2 => [r * Math.cos(t + a), r * Math.sin(t + a)];
        if (fata === "drepte") tri.push(...prisma(bara(u(r0, 0), u(r1, 0), ws), 0, tp));
        else {
          tri.push(...prisma(bara(u(r0, 0), u(rs + 0.4, 0), ws), 0, tp));
          tri.push(...prisma(bara(u(rs, 0), u(r1, phi), wr), 0, tp), ...prisma(bara(u(rs, 0), u(r1, -phi), wr), 0, tp));
        }
      }
    }
    return tri;
  }
  function roata({ fel = "plina", diam = 30.4, lat = 13.6, janta = 16.8, banda = "nervuri", spite = "disc", nrSpite = 5, gaura = "x" }: {
    fel?: string; diam?: number; lat?: number; janta?: number; banda?: string; spite?: string; nrSpite?: number; gaura?: string }): Corp {
    const e = ef(), avert: string[] = [], K = ROATA;
    const nr = (v: unknown, d: number) => (Number.isFinite(+(v as number)) ? +(v as number) : d);
    const W = zecime(Math.min(40, Math.max(4, nr(lat, 13.6))));
    let D = zecime(Math.min(150, Math.max(12.6, nr(janta, 16.8))));
    if (D !== nr(janta, 16.8)) avert.push(tr`Janta are între 12,6 și 150 mm: am făcut-o de ${String(D).replace(".", Limba.zecimal)} mm.`);
    let Dt = zecime(Math.min(200, nr(diam, 30.4)));
    if (fel !== "janta" && Dt < D + 4) { Dt = zecime(D + 4); avert.push(tr`Anvelopa are nevoie de cel puțin 2 mm peste jantă: am făcut-o de Ø ${String(Dt).replace(".", Limba.zecimal)} mm.`); }
    // scaunul tipărit primește varianta de la calibrare (doar la jantă: o anvelopă LEGO sau din TPU se pune pe el)
    const Rs = D / 2 + (fel === "janta" ? e.jantaD / 2 : 0), R = Dt / 2, zc = W / 2;
    const { rb, rh, spite: incap } = jantaCote(D, gaura), n = 4 * Math.ceil(Math.min(192, Math.max(N_CERC, 2 * Math.PI * R / 1.2)) / 4);
    const tri: Tri[] = [];
    // profilul exterior al anvelopei pe z: umerii teșiți (ca LEGO, în linie dreaptă), banda; `jos` coboară umerii (blocurile)
    // pe lățimi sub 13,6, canalul și nervura se strâng pe z (adâncimile rămân), ca să încapă
    const umarLat = Math.min(K.umarLat, W / 4), sc = W / 13.6, sz = Math.min(1, sc);
    const nervuri = banda === "nervuri" ? [-K.nervuri * sc, 0, K.nervuri * sc].map(d => zc + d) : [];
    const zona = W * 0.3;
    const exterior = (z: number, jos: number) => {
      const u = Math.min(z, W - z), r = R - K.umar * Math.max(0, (umarLat - u) / umarLat);
      if (nervuri.some(c => Math.abs(z - c) < K.nervuraLat / 2 - 1e-9)) return r - K.nervuraAdanc;
      return u < zona - 1e-9 ? r - jos : r;
    };
    // punctele de pe z unde profilul se frânge (umeri, canale, zonele blocurilor), plus câte 0,4 mm între ele
    const frangeri = [0, umarLat, W - umarLat, W, zona, W - zona, ...nervuri.flatMap(c => [c - K.nervuraLat / 2, c + K.nervuraLat / 2])]
      .filter(z => z >= 0 && z <= W).sort((a, b) => a - b);
    const zs: number[] = [];
    for (let i = 0; i < frangeri.length; i++) {
      zs.push(frangeri[i]!);
      const urm = frangeri[i + 1];
      if (urm === undefined) break;
      const k = Math.floor((urm - frangeri[i]!) / 0.4);
      for (let j = 1; j < k; j++) zs.push(frangeri[i]! + (urm - frangeri[i]!) * j / k);
    }
    const unice = zs.filter((z, i) => i === 0 || z - zs[i - 1]! > 1e-6);
    // în fiecare punct de frângere al canalelor și al zonelor, două puncte: înainte și după treaptă
    const contur = (jos: number): P2[] => {
      const p: P2[] = [];
      for (const z of unice) {
        const a = exterior(z - 1e-7, jos), b = exterior(z + 1e-7, jos);
        if (z > 0 && z < W && Math.abs(a - b) > 1e-6) p.push([a, z], [b, z]); else p.push([exterior(z, jos), z]);
      }
      return p;
    };
    const blocuri = banda === "blocuri" && fel !== "janta";
    if (fel !== "janta") {
      const ext = contur(blocuri ? K.bloc : 0);
      const interior: P2[] = fel === "anvelopa"
        ? (() => {
          // alezajul cu nervura la mijloc (trapez), ca anvelopa LEGO 58090: se pune și pe janta LEGO, și pe cea tipărită
          const ra = D / 2 - K.alezaj, sus = K.nervura.map(([dz, ad]): P2 => [ra - ad, zc + dz * sz]);
          const jos = K.nervura.slice(0, -1).reverse().map(([dz, ad]): P2 => [ra - ad, zc - dz * sz]);
          return [[ra, W], ...sus, ...jos, [ra, 0]];
        })()
        : [[rb, W], [rb, 0]];
      // exteriorul urcă pe z, interiorul coboară: un poligon simplu în (r, z)
      tri.push(...strung([...ext, ...interior], 0, 2 * Math.PI, 0, 0, n));
      if (blocuri) {
        // blocurile pe umeri, alternate între jos și sus, ca în poza owner-ului: fiecare, un corp rotit parțial peste umăr
        const nb = Math.max(12, Math.round(2 * Math.PI * R / 3.2)), pas = 2 * Math.PI / nb;
        const bloc = (z0: number, z1: number): P2[] => {
          const sus = unice.filter(z => z >= z0 - 1e-9 && z <= z1 + 1e-9).map((z): P2 => [exterior(z, 0), z]);
          const jos = sus.map(([r, z]): P2 => [r - K.bloc - 0.2, z]).reverse();
          return [...sus, ...jos];
        };
        const pJos = bloc(0, zona), pSus = bloc(W - zona, W);
        for (let k = 0; k < nb; k++) {
          const a0 = k * pas, a1 = a0 + pas * 0.55;
          tri.push(...strung(k % 2 ? pSus : pJos, a0, a1, 0, 0, n));
        }
      }
    }
    if (fel !== "anvelopa") {
      // janta: banda (cu scaunul și canalul nervurii, teșit la 45° sus, ca să se tipărească fără suport), fața și butucul
      if (fel === "janta") {
        const rg = Rs - K.canalAd;
        tri.push(...strung([[rb, 0], [Rs, 0], [Rs, zc - K.canalJos * sz], [rg, zc - K.canalJos * sz], [rg, zc + K.canalSus * sz], [Rs, zc + K.canalSus * sz + K.canalAd], [Rs, W], [rb, W]], 0, 2 * Math.PI, 0, 0, n));
      }
      // fața, cât 0,3 din lățime (2–6 mm): butucul, înalt cât roata, stă pe ea; spițele, după diametrul jantei (1,8–4,5 mm)
      const tp = Math.min(6, Math.max(2, K.fata * W));
      tri.push(...butucRoata(gaura, rh, W));
      // fața: discul, spițele drepte, în Y sau discul cu găuri, de la butuc la bandă (peste ele câte 0,3 mm)
      let fata = spite;
      if (fata !== "disc" && !incap) {
        avert.push(tr("Janta e prea mică pentru spițe: am făcut fața plină."));
        fata = "disc";
      }
      const N = Math.round(Math.min(12, Math.max(3, nr(nrSpite, 5))));
      tri.push(...fataRoata(fata, N, rh, rb, tp, D));
    }
    return { tri, avert };
  }

  // ---------------------------------------------------------------------------------------------- fulia
  // Fulia (ADR 0280, felia 3.Tk), culcată pe pat: axa pe z, fața jos, obada cu canalul la mijloc, butucul cu 0,5 mm peste
  // obadă (spre sus), ca distanța de la LEGO. Cotele LEGO 4185 (LDraw, CC BY 4.0, pe felii de 0,1 mm): Ø24, obada de 3,5 mm,
  // butucul de 4 mm (r 3,25; 3,75 la cel întărit), discul de 2,4 mm cu șase găuri de știft (Ø4,75 la r 8, de la 30°, din 60
  // în 60 de grade), peretele de 0,5 mm sub canal; canalul în V (4185a) de la r 12 la ±1,3 mm de mijloc până la r 11 la
  // ±0,65 mm, cu fundul plat; canalul rotund (4185b), aproape un semicerc de r 1 (fundul la r 10,99).
  const FULIE = {
    v: [2.6, 1.0, 1.3] as const,   // canalul în V: lățimea sus, adâncimea, fundul (ca 4185a; cu lățimea cerută, la scară)
    rotund: 2.0,                    // canalul rotund: lățimea sus; semicercul are raza ei pe jumătate, cu centrul pe margine
    plat: [4, 1.2] as const,        // canalul plat: lățimea curelei și înălțimea marginilor (teșite la 45°: fără suport)
    margine: 0.4, perete: 0.5, butuc: 3.75, peretButuc: 1.2, disc: 2.4, sus: 0.5,
  };
  type FulieDef = { diam?: unknown; lat?: unknown; canal?: unknown; latCanal?: unknown; gaura?: string };
  // cotele fuliei (o singură dată, pentru motor și atelier): mărimile în margini (cu avertismente), canalul, banda (rb, sub
  // canal, cu peretele de 0,5 mm sau 0,02·D) și butucul (rh: același la toate găurile, cât cere crucea, ca o gaură să difere
  // doar prin aria ei); ce fețe încap
  function fulieCote({ diam, lat, canal, latCanal }: FulieDef) {
    const K = FULIE, avert: string[] = [];
    const nr = (v: unknown, d: number) => (v !== null && v !== "" && Number.isFinite(+(v as number)) ? +(v as number) : d);
    const z = (x: number) => String(x).replace(".", Limba.zecimal);
    const c = canal === "rotund" || canal === "plat" ? canal : "v";
    const wc = zecime(Math.min(20, Math.max(1, nr(latCanal, c === "v" ? K.v[0] : c === "rotund" ? K.rotund : K.plat[0]))));
    // canalul: lățimea sus și adâncimea (în V și plat, un trapez; rotund, un semicerc)
    const sus = c === "plat" ? wc + 2 * K.plat[1] : wc, adanc = c === "v" ? wc * K.v[1] / K.v[0] : c === "rotund" ? wc / 2 : K.plat[1];
    let W = zecime(Math.min(40, Math.max(2, nr(lat, 3.5))));
    const Wmin = Math.ceil((sus + 2 * K.margine) * 10 - 1e-6) / 10;
    if (W < Wmin) { W = Wmin; avert.push(tr`Canalul cere o obadă de cel puțin ${z(Wmin)} mm: am făcut-o de ${z(Wmin)} mm.`); }
    const rh = Math.max(K.butuc, razaGauraButuc("x") + K.peretButuc), perete = (d: number) => Math.max(K.perete, 0.02 * d);
    let D = zecime(Math.min(200, Math.max(12, nr(diam, 24))));
    const Dmin = Math.ceil(2 * (rh + adanc + perete(D) + 0.3) * 10 - 1e-6) / 10;
    if (D < Dmin) { D = Dmin; avert.push(tr`Fulia are nevoie de cel puțin Ø ${z(Dmin)} mm (butucul, canalul și peretele dintre ele): am făcut-o de Ø ${z(Dmin)} mm.`); }
    else if (D !== nr(diam, 24)) avert.push(tr`Fulia are între 12 și 200 mm: am făcut-o de Ø ${z(D)} mm.`);
    const R = D / 2, rb = R - adanc - perete(D);
    return { D, R, W, c, wc, sus, adanc, rb, rh, fund: R - adanc, avert, spite: rb - rh >= 3.5 - 1e-9, stift: cercuriStift(rh, rb).length > 0 };
  }
  function fulie({ diam = 24, lat = 3.5, canal = "v", latCanal, spite = "stift", nrSpite = 6, gaura = "x" }: {
    diam?: number; lat?: number; canal?: string; latCanal?: number; spite?: string; nrSpite?: number; gaura?: string }): Corp {
    const q = fulieCote({ diam, lat, canal, latCanal }), { R, W, rb, rh, adanc } = q, avert = q.avert.slice(), zc = W / 2;
    const n = 4 * Math.ceil(Math.min(192, Math.max(N_CERC, 2 * Math.PI * R / 1.2)) / 4);
    // obada: profilul (r, z) pe partea dinafară, de jos în sus, cu canalul la mijloc; în V și plat un trapez, rotund un
    // semicerc cu centrul pe margine (un număr par de segmente, ca fundul să fie un vârf)
    let canalP: P2[];
    if (q.c === "rotund") {
      const m = 2 * Math.max(6, Math.ceil(Math.PI * adanc / 0.8));
      canalP = Array.from({ length: m + 1 }, (_, k): P2 => { const t = -Math.PI / 2 + Math.PI * k / m; return [R - adanc * Math.cos(t), zc + adanc * Math.sin(t)]; });
    } else {
      const a = q.sus / 2, b = q.c === "v" ? q.wc * FULIE.v[2] / FULIE.v[0] / 2 : q.wc / 2;
      canalP = [[R, zc - a], [R - adanc, zc - b], [R - adanc, zc + b], [R, zc + a]];
    }
    const tri: Tri[] = [...strung([[rb, 0], [R, 0], ...canalP, [R, W], [rb, W]], 0, 2 * Math.PI, 0, 0, n)];
    // butucul, cu 0,5 mm peste obadă; fața: discul, cât la LEGO (2,4 mm) sau 0,3 din lățime, cel mult 6 și cel mult obada
    tri.push(...butucRoata(gaura, rh, zecime(W + FULIE.sus)));
    const tp = Math.min(W, 6, Math.max(FULIE.disc, 0.3 * W));
    let fata = spite === "disc" || spite === "drepte" || spite === "y" ? spite : "stift";
    if (fata === "stift" && !q.stift) { avert.push(tr("Fulia e prea mică pentru găurile de știft: am făcut fața plină.")); fata = "disc"; }
    if ((fata === "drepte" || fata === "y") && !q.spite) { avert.push(tr("Fulia e prea mică pentru spițe: am făcut fața plină.")); fata = "disc"; }
    tri.push(...fataRoata(fata, Math.round(Math.min(12, Math.max(3, +nrSpite || 6))), rh, rb, tp, q.D));
    return { tri, avert };
  }
  // cureaua deschisă dintre două fulii cu axele la distanța C (ADR 0280), pe fundul canalelor (razele r1, r2): cele două
  // tangente și arcele cuprinse; NaN dacă un cerc îl cuprinde pe celălalt
  function lungimeCurea(r1: number, r2: number, C: number): number {
    const d = Math.abs(r1 - r2);
    return C > d ? 2 * Math.sqrt(C * C - d * d) + Math.PI * (r1 + r2) + 2 * d * Math.asin(d / C) : NaN;
  }

  // ---------------------------------------------------------------------------------------------- roata conica
  // Roata conică (ADR 0280, felia 3.Tl), culcată pe fața din spate, cu dinții drepți spre vârful conului; perechea se prinde
  // la 90°, cu axele întâlnite în vârful comun al conurilor (tan δ = z / z2). Profilul: Tredgold, pe conul din spate, ca roata
  // dreaptă cu z / cos δ dinți (aceeași cremalieră și același joc din calibrare ca la rotițe), proiectat din vârf pe planul de
  // divizare; straturile spre vârf îl micșorează (dinții se subțiază spre vârful conului) și îl taie cu conul din spate (harta
  // punctelor pe strat). Planul de divizare stă la 2·m de fața din spate: la conica LEGO de 20 (87407, din LDraw), vârful e la
  // 12 mm de gulerul din spate (1,5 pași; picioarele dinților la spate, la r 9,1, încep la 1,1 mm de guler, ca banda dinților
  // de acolo, iar conul din spate trece prin r 6,9 la 0,2 mm), manșonul se oprește la 4 mm de vârf; la cea de 12, vârful e la
  // 8 mm (1 pas). Lățimea dinților: R / 4 (R, distanța de la vârf la cercul de divizare, pe con).
  const CONICA = { spate: 2, latime: 0.25, peretButuc: 1.2, liber: 0.4 };
  type ConicaDef = { dinti?: unknown; pereche?: unknown; modul?: unknown };
  // cotele conicei (o singură dată, pentru motor și atelier): dinții în margini, unghiul conului, planul de divizare și vârful
  function conicaCote({ dinti, pereche, modul }: ConicaDef) {
    const nr = (v: unknown, d: number) => (v !== null && v !== "" && Number.isFinite(+(v as number)) ? +(v as number) : d);
    const z = Math.round(Math.min(60, Math.max(8, nr(dinti, 20)))), z2 = Math.round(Math.min(60, Math.max(8, nr(pereche, 20))));
    const m = Math.min(3, Math.max(0.5, Math.round(nr(modul, 1) * 10) / 10)), delta = Math.atan2(z, z2), rp = m * z / 2;
    // planul de divizare deasupra feței din spate: 2·m, deci vârful conului la m·(2 + z2 / 2), pe grila de jumătate de pas
    // când perechea are 12, 20, 28, 36 … de dinți (ca la LEGO)
    const rh = razaGauraButuc("x") + CONICA.peretButuc, ctg = 1 / Math.tan(delta), zp = CONICA.spate * m;
    return { z, z2, m, delta, rp, rh, zp, zA: zp + rp * ctg, R: rp / Math.sin(delta) };
  }
  function prismaStraturi(straturi: readonly { z: number; p: readonly P2[] }[], gauri: readonly Poli[]): Tri[] {
    // ca prismaRasucita, cu fiecare strat dat (aceleași puncte, în aceeași ordine, trigonometric, la înălțimi crescătoare);
    // găurile, drepte, de la primul strat la ultimul
    const G = gauri.map(g => curataPoli(trig(g)).reverse()), p3 = (p: Pt, z: number): P3 => [p[0], p[1], z], tri: Tri[] = [];
    const capac = (S: readonly P2[], z: number, sus: boolean) => {
      const pts: P2[] = [...S], idx: number[] = [];
      for (const g of G) { idx.push(pts.length); pts.push(...g); }
      const t = glob.earcut(pts.flat(), idx, 2);
      for (let k = 0; k < t.length; k += 3) {
        const a = t[k]!; let b = t[k + 1]!, c = t[k + 2]!;
        if (arie2(pts, a, b, c) < 0) [b, c] = [c, b];
        tri.push(sus ? [p3(pts[a]!, z), p3(pts[b]!, z), p3(pts[c]!, z)] : [p3(pts[a]!, z), p3(pts[c]!, z), p3(pts[b]!, z)]);
      }
    };
    const z0 = straturi[0]!.z, z1 = straturi[straturi.length - 1]!.z;
    capac(straturi[0]!.p, z0, false);
    for (let i = 1; i < straturi.length; i++) {
      const A = straturi[i - 1]!, B = straturi[i]!;
      for (let k = 0; k < A.p.length; k++) {
        const k1 = (k + 1) % A.p.length;
        tri.push([p3(A.p[k]!, A.z), p3(A.p[k1]!, A.z), p3(B.p[k1]!, B.z)], [p3(A.p[k]!, A.z), p3(B.p[k1]!, B.z), p3(B.p[k]!, B.z)]);
      }
    }
    capac(straturi[straturi.length - 1]!.p, z1, true);
    for (const L of G) for (let i = 0; i < L.length; i++) {
      const a = L[i]!, b = L[(i + 1) % L.length]!;
      tri.push([p3(a, z0), p3(b, z0), p3(b, z1)], [p3(a, z0), p3(b, z1), p3(a, z1)]);
    }
    return tri;
  }
  function conica({ dinti = 20, pereche = 20, modul = 1, gaura = "r", butuc = "lung" }: {
    dinti?: number; pereche?: number; modul?: number; gaura?: string; butuc?: string }): Corp {
    const e = ef(), avert: string[] = [], q = conicaCote({ dinti, pereche, modul });
    const { z, z2, m, delta, rp, rh, zp, zA } = q, sd = Math.sin(delta), cd = Math.cos(delta), ctg = cd / sd;
    if (z !== +dinti || z2 !== +pereche) avert.push(tr`O roată conică are între 8 și 60 de dinți: am făcut-o de ${z}, pentru una de ${z2}.`);
    // profilul roții echivalente de pe conul din spate (Tredgold): z / cos δ dinți; un punct (ρ, φ) al lui, desfășurat în jurul
    // vârfului conului din spate, ajunge pe con la raza ρ·cos δ și înălțimea zB + ρ·sin δ, la unghiul φ / cos δ; de acolo, din
    // vârf, pe planul de divizare (zp)
    const V = profilRoata(z / cd, m, e.jocDinti), zB = zp - rp * Math.tan(delta);
    const pe = (rho: number, phi: number, c: number): P2 => {
      const t = (zA - zp) / (zA - (zB + rho * sd)), r = t * rho * cd, a = c + phi / cd;
      return [r * Math.cos(a), r * Math.sin(a)];
    };
    // pe fiecare flanc, jumătatea dintelui scade spre cap cu cel puțin 0,0001 rad (la subtăiere crește cu cel mult 0,0002 rad):
    // unghiurile conturului cresc strict, deci tăierea pe rază la conul din spate nu-l pliază și nu-i suprapune punctele
    const O0: P2[] = [];
    for (let k = 0; k < z; k++) {
      const c = k * 2 * Math.PI / z, jos: P2[] = [], sus: P2[] = [];
      let hm = Infinity;
      for (let i = 0; i < V.raze.length; i++) {
        const h = (hm = Math.min(hm - 1e-4, V.jum[i]!));
        if (h <= 0) break;
        jos.push(pe(V.raze[i]!, -h, c)); sus.push(pe(V.raze[i]!, h, c));
      }
      O0.push(...jos, pe(V.ra, 0, c), ...sus.reverse());
    }
    const O = curataPoli(trig(O0));
    // gaura și lățimea dinților: R / 4, cât rămâne peretele dintre gaură și picioarele dinților (0,4 mm) la capătul dinspre vârf
    const rgol = razaGauraButuc(gaura), rIn = Math.min(...O.map((a, i) => {
      const b = O[(i + 1) % O.length]!, dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy, u = l ? Math.max(0, Math.min(1, -(a[0] * dx + a[1] * dy) / l)) : 0;
      return Math.hypot(a[0] + u * dx, a[1] + u * dy);
    }));
    let sIn = Math.max(1 - CONICA.latime, rgol ? (rgol + CONICA.liber) / rIn : 0), g: Poli[] = [];
    if (rgol && sIn > 0.9) { avert.push(tr("Gaura nu încape în roata asta conică: am făcut-o fără gaură. Alege mai mulți dinți sau un modul mai mare.")); sIn = 1 - CONICA.latime; }
    // alezajul (crucea sau cercul) e al butucului; corpul dinților se oprește la un cerc cu 0,05 mm peste el (pereții lor nu
    // coincid), pe care butucul îl acoperă
    else if (rgol) g = [cerc(0, 0, rgol + 0.05)];
    // straturile: fața din spate, picioarele dinților la spate, pași de 0,1·m până la capetele lor (unde conul din spate le
    // taie), apoi capătul dinspre vârf; pe fiecare, conturul micșorat spre vârf și tăiat, pe rază, la conul din spate. Sub
    // picioarele dinților, corpul coboară drept pe pat (cilindrul cercului de picior din spate, rp − 1,25·m·cos δ), nu pe conul
    // din spate: la un pinion (δ mic) conul acela ar sta aproape culcat, în consolă. Cilindrul nu atinge roata perechii: e la
    // cel puțin rp2 + 1,25·m·sin δ de axa ei, iar ea nu trece de rp2 + m·sin δ (capul ei din spate).
    const zIn = zA - sIn * (zA - zp), zT = Math.min(zIn, zp + m * sd), zR = zp - 1.25 * m * sd;
    const hs = [0, zR];
    for (let h = zR + 0.1 * m; h < zT - 1e-6; h += 0.1 * m) hs.push(h);
    hs.push(zT); if (zIn > zT + 1e-6) hs.push(zIn);
    const strat = (h: number) => {
      const s = (zA - h) / (zA - zp), rb = rp + (Math.max(h, zR) - zp) * ctg;
      return { z: h, p: O.map(([x, y]): P2 => { const r = Math.hypot(x, y) * s, k = r > rb ? rb / r : 1; return [x * s * k, y * s * k]; }) };
    };
    const tri = prismaStraturi(hs.map(strat), g);
    // butucul: scurt, până la capătul dinților; lung (ca 87407), până la rh + 0,4 mm de vârf (manșoanele unei perechi nu se ating)
    const hb = butuc === "scurt" ? zIn : Math.max(zIn, zA - rh - CONICA.liber);
    tri.push(...butucRoata(g.length ? gaura : "nu", rh, hb));
    return { tri, avert };
  }

  // ---------------------------------------------------------------------------------------------- roata coroana
  // Roata coroană (ADR 0280, felia 3.Tm), culcată pe fața de jos, cu dinții pe fața de sus, pentru o roată dreaptă de la rotițe
  // (pinionul: dinții, modulul, jocul din calibrare) cu axa la 90°, culcată peste raza coroanei. Pe fiecare rază r, dintele
  // coroanei e ce rămâne după ce dintele pinionului (îngroșat cu jocul; sub cel mai de jos punct al capului, încă 0,25·m: jocul
  // de la fundul golului) trece prin gol rostogolit cu raza r·z1 / z2: golul, la fiecare înălțime, cât îl acoperă dintele în
  // toate pozițiile lui. Dinții merg de la raza la care dintele coroanei ar ieși prea subțire jos (subtăierea) până la cea la
  // care s-ar ascuți sus, cel mult 2,5·m înăuntru și 2·m în afară. Planul de divizare la 4·m de fața de jos, ca la LEGO 3650
  // (din LDraw: fața de jos la −3,2, planul de divizare la 0,8): axul pinionului la 4·m + z1·m / 2, pe grilă la pinioanele LEGO
  // de 8, 16, 24 (8, 12, 16 mm). Dinții din LDraw sunt drepți (3650 merge și ca roată dreaptă); cei de aici, tăiați de pinion,
  // doar la 90°.
  const COROANA = { jos: 4, pas: 0.2, inaltimi: 16, dinteMin: 0.15, adanc: 0.25, inauntru: 2.5, afara: 2 };
  type CoroanaDef = { dinti?: unknown; pinion?: unknown; modul?: unknown };
  function coroanaCote({ dinti, pinion, modul }: CoroanaDef) {
    const nr = (v: unknown, d: number) => (v !== null && v !== "" && Number.isFinite(+(v as number)) ? +(v as number) : d);
    const z2 = Math.round(Math.min(80, Math.max(12, nr(dinti, 24)))), z1 = Math.round(Math.min(40, Math.max(8, nr(pinion, 8))));
    const m = Math.min(3, Math.max(0.5, Math.round(nr(modul, 1) * 10) / 10)), r2 = m * z2 / 2, r1 = m * z1 / 2, zp = COROANA.jos * m;
    return { z2, z1, m, r2, r1, zp, tR: zp - 1.25 * m, tT: zp + m, axa: zp + r1 };
  }
  // jumătățile dintelui coroanei la raza r, pe înălțimile de la piciorul lui (zp − 1,25·m) la cap (zp + m), în lungul cercului
  const dintiCoroana = new Map<string, number[]>();
  function coroanaDinte(q: ReturnType<typeof coroanaCote>, r: number, joc: number): number[] {
    const cheie = [q.z1, q.z2, q.m, joc, Math.round(r * 1e6)].join("|"), gata = dintiCoroana.get(cheie);
    if (gata) return gata;
    const { z1, z2, m, r1, zp, tR, tT } = q, P = profilRoata(z1, m, -joc), tA = zp + r1, k = r * z1 / z2;
    // dintele pinionului, cu capul în jos: conturul real (închis, cu coarda capului) și prelungirea capului cu 0,25·m, pe aceeași
    // lățime (jocul de la fundul golului): trei muchii, de la colțurile capului la cele ale prelungirii. Îngroșat cu jocul,
    // profilul ajunge neascuțit la cercul de cap (ra) la orice pinion de la 8 dinți, modul și joc: cel mai de jos punct al
    // capului real e la tA − ra
    const a: P2[] = [], b: P2[] = [];
    let hc = 0;
    for (let i = 0; i < P.raze.length; i++) {
      const h = P.jum[i]!, rho = P.raze[i]!;
      if (h <= 0) break;
      hc = h;
      a.push([rho * Math.cos(-Math.PI / 2 - h), rho * Math.sin(-Math.PI / 2 - h)]); b.push([rho * Math.cos(-Math.PI / 2 + h), rho * Math.sin(-Math.PI / 2 + h)]);
    }
    const re = P.ra + COROANA.adanc * m, he = hc * P.ra / re, tCap = tA - P.ra;
    const prel: P2[] = [a[a.length - 1]!, [re * Math.cos(-Math.PI / 2 - he), re * Math.sin(-Math.PI / 2 - he)], [re * Math.cos(-Math.PI / 2 + he), re * Math.sin(-Math.PI / 2 + he)], b[b.length - 1]!];
    const dinte = [...a, ...b.reverse()];
    // la picior, capul prelungit doar atinge înălțimea: golul de acolo se ia cu 0,01·m mai sus, unde chiar trece (altfel ar ieși
    // zero, iar dinții vecini s-ar lipi la bază)
    const ts = Array.from({ length: COROANA.inaltimi + 1 }, (_, i) => tR + (tT - tR) * i / COROANA.inaltimi + (i ? 0 : 0.01 * m)), gol = ts.map(() => 0);
    // baleiajul, cât stă dintele sub capul dinților coroanei (tT): un punct al lui la raza ρ > r1 − m, la unghiul δ de axa
    // dintelui, iese deasupra la φ = acos((r1 − m) / ρ) + |δ| (cu ±2,6 pași, cât era, pinionul de 40 ieșea pe la jumătate)
    let phiMax = 0;
    for (const [x, y] of dinte) { const rho = Math.hypot(x, y); if (rho > r1 - m) phiMax = Math.max(phiMax, Math.acos((r1 - m) / rho) + Math.abs(Math.atan2(x, -y))); }
    // 400 de pași: față de 4000, vârfurile dinților se mută cu cel mult 0,006 mm
    const pasi = 400;
    // pinionul, rotit cu φ în secțiunea lui (y, înălțimea), iar coroana cu φ·z1 / z2: un punct al secțiunii la y cade pe
    // cilindrul de rază r la unghiul asin(y / r), adică la s = r·asin(y / r) − r·φ·z1 / z2 în lungul cercului, în coroana rotită
    // (cu s = y − k·φ, ca în plan, golul ieșea prea îngust la pinioanele mari: jocul scădea de la 0,3 la 0,17 mm la 24 / 24)
    for (let s = 0; s <= pasi; s++) {
      const phi = -phiMax + 2 * phiMax * s / pasi, c = Math.cos(phi), sn = Math.sin(phi);
      const rot = ([x, y]: P2): P2 => [x * c - y * sn, x * sn + y * c + tA], D = dinte.map(rot), E = prel.map(rot);
      ts.forEach((t, i) => {
        const taie = (A: P2, B: P2) => {
          if ((A[1] - t) * (B[1] - t) > 0 || A[1] === B[1]) return;
          const y = A[0] + (t - A[1]) / (B[1] - A[1]) * (B[0] - A[0]), u = Math.abs(r * Math.asin(Math.max(-1, Math.min(1, y / r))) - k * phi);
          if (u > gol[i]!) gol[i] = u;
        };
        for (let e = 0; e < D.length; e++) taie(D[e]!, D[(e + 1) % D.length]!);
        // prelungirea, doar sub cel mai de jos punct al capului real (tA − ra): deasupra, rotită cu pinionul, ar tăia flancul
        // coroanei unde pinionul nu ajunge (la 24 / 8, pe planul de divizare, 0,04 mm din fiecare flanc)
        if (t <= tCap) for (let e = 0; e + 1 < E.length; e++) taie(E[e]!, E[e + 1]!);
      });
    }
    // sub capul real e doar joc: golul de acolo nu iese mai larg decât la prima înălțime prin care trece capul (altfel flancul
    // ar avea o crestătură chiar sub ea, iar dintele, o consolă de ~0,1 mm deasupra)
    const iSus = ts.findIndex((t, i) => t > tCap && gol[i]! > 0);
    if (iSus > 0) for (let i = 0; i < iSus; i++) gol[i] = Math.min(gol[i]!, gol[iSus]!);
    const out = gol.map(g => Math.PI * r / z2 - g);
    dintiCoroana.set(cheie, out);
    return out;
  }
  // razele dinților: cele la care dintele nu iese mai subțire de 0,15·m pe nicio înălțime, în jurul razei de divizare
  function coroanaRaze(q: ReturnType<typeof coroanaCote>, joc: number) {
    const bun = (r: number) => Math.min(...coroanaDinte(q, r, joc)) >= COROANA.dinteMin * q.m;
    let rIn = q.r2, rOut = q.r2;
    if (!bun(q.r2)) return null;
    for (let r = q.r2; r >= q.r2 - COROANA.inauntru * q.m - 1e-9 && bun(r); r -= 0.1 * q.m) rIn = r;
    for (let r = q.r2; r <= q.r2 + COROANA.afara * q.m + 1e-9 && bun(r); r += 0.1 * q.m) rOut = r;
    return { rIn, rOut };
  }
  function coroana({ dinti = 24, pinion = 8, modul = 1, gaura = "x", butuc = "lung" }: {
    dinti?: number; pinion?: number; modul?: number; gaura?: string; butuc?: string }): Corp {
    const e = ef(), avert: string[] = [], q = coroanaCote({ dinti, pinion, modul }), { z2, m, zp, tR, tT } = q;
    if (z2 !== +dinti || q.z1 !== +pinion) avert.push(tr`O roată coroană are între 12 și 80 de dinți, pinionul între 8 și 40: am făcut-o de ${z2}, pentru unul de ${q.z1}.`);
    const raze = coroanaRaze(q, e.jocDinti);
    if (!raze) throw new Error(tr`Pinionul de ${q.z1} nu se prinde cu o coroană de ${z2}: alege o coroană mai mare.`);
    const { rIn, rOut } = raze, rh = razaGauraButuc("x") + 1.2, rgol = razaGauraButuc(gaura), tri: Tri[] = [];
    // dinți mai scurți de un modul în lungul razei (24 / 8: 2,4 mm, cât LEGO 3650; 24 / 16: 1,4; 12 / 8: 0,8): spune-o
    if (rOut - rIn < m - 1e-9) avert.push(tr`Dinții coroanei ies scurți pentru pinionul de ${q.z1} (${String(zecime(rOut - rIn)).replace(".", Limba.zecimal)} mm în lungul razei): țin mai bine pe o coroană mai mare.`);
    // discul, sub dinți, de la butuc la marginea lor; corpul dinților se oprește la un cerc cu 0,05 mm peste alezaj
    tri.push(...prismaGauri(cerc(0, 0, rOut, 4 * Math.ceil(Math.max(N_CERC, 2 * Math.PI * rOut / 0.8) / 4)), rgol ? [cerc(0, 0, rgol + 0.05)] : [], 0, tR));
    // dinții: fiecare, un corp închis peste felii de rază (din 0,2·m în 0,2·m), cu baza înfiptă 0,3 mm în disc
    const rs: number[] = [];
    for (let r = rIn; r < rOut - 1e-6; r += COROANA.pas * m) rs.push(r);
    rs.push(rOut);
    const ts = Array.from({ length: COROANA.inaltimi + 1 }, (_, i) => tR + (tT - tR) * i / COROANA.inaltimi);
    const felii = rs.map(r => ({ r, h: coroanaDinte(q, r, e.jocDinti) }));
    const poli = (f: { r: number; h: number[] }): P2[] => {
      // în (s, t): stânga în sus, dreapta în jos; jos, înfipt în disc
      const st = f.h.map((h, i): P2 => [-h, i === 0 ? tR - 0.3 : ts[i]!]), dr = f.h.map((h, i): P2 => [h, i === 0 ? tR - 0.3 : ts[i]!]).reverse();
      return [...st, ...dr];
    };
    for (let k = 0; k < z2; k++) {
      const c = 2 * Math.PI * k / z2, sus = (f: { r: number }, [s, t]: P2): P3 => { const a = c + s / f.r; return [f.r * Math.cos(a), f.r * Math.sin(a), t]; };
      const corp: Tri[] = [];
      const P0 = poli(felii[0]!), n = P0.length;
      for (let j = 0; j + 1 < felii.length; j++) {
        const A = poli(felii[j]!), B = poli(felii[j + 1]!);
        for (let i = 0; i < n; i++) {
          const i1 = (i + 1) % n, a0 = sus(felii[j]!, A[i]!), a1 = sus(felii[j]!, A[i1]!), b0 = sus(felii[j + 1]!, B[i]!), b1 = sus(felii[j + 1]!, B[i1]!);
          corp.push([a0, a1, b1], [a0, b1, b0]);
        }
      }
      // capetele, în același sens ca pereții: conturul e în sens orar în (s, t), deci pereții de mai sus ies cu normala spre
      // interior; capătul dinăuntru (normala spre +r) rămâne trigonometric, cel dinafară se întoarce; apoi tot corpul, afară
      for (const [f, intors] of [[felii[0]!, false], [felii[felii.length - 1]!, true]] as const) {
        const T = poli(f).slice().reverse();
        for (const [x, y, w] of triunghiuriPoligon(T)) corp.push(intors ? [sus(f, T[x]!), sus(f, T[w]!), sus(f, T[y]!)] : [sus(f, T[x]!), sus(f, T[y]!), sus(f, T[w]!)]);
      }
      tri.push(...orienteaza(corp));
    }
    // butucul: lung, cât LEGO 3650 (8·m de la fața de jos: axul pinionului de 8 trece la înălțimea vârfului lui); scurt, până
    // la capul dinților (axul pinionului poate trece peste el)
    tri.push(...butucRoata(gaura, rh, butuc === "scurt" ? tT : 2 * zp));
    return { tri, avert };
  }

  // ---------------------------------------------------------------------------------------------- conicele duble
  // Conica dublă (ADR 0280, felia 3.Tn), culcată pe o față: roata dreaptă de la rotițe (profilul și jocul din calibrare), lată
  // de 8·m, cu piciorul dinților la r_p − 2·m, ca LEGO 32270 și 32269 (din LDraw: lățimea 8, discul de r 4 la 12 dinți și 7,95
  // la 20), ca o pereche la 90° să nu-și atingă discurile; discul, cu 0,2 mm mai mic (la LEGO, fața unei roți e tangentă la
  // discul celeilalte). În banda de mijloc (±2·m) dinții sunt drepți: pe axe paralele se prind ca rotițele. Spre fiecare față,
  // același dinte se micșorează spre vârful unui con de 45°, aflat la 2·m + r_p de mijloc, și se subțiază încă, liniar, până la
  // 0,3·m pe flanc la față (înainte de micșorare). La 90°, perechile egale se prind ca o pereche conică (cu vârful comun și jocul
  // 2·joc); celelalte, aproximativ, ca la LEGO, iar subțierea le ține jocul: cu 0,3·m, perechile LEGO (12, 20, 28, 36) au la
  // 90° tot jocul din calibrare la 0,05 și la 0,15 (la 0,25, 12 cu 36: 0,44 mm din 0,50), iar toate cele cu cel puțin 12 dinți
  // au joc (12 cu 60, cea mai inegală: 0,08 mm din 0,10 la 0,05); cu 0,1·m, 12 cu 28 și 12 cu 36 se pătrundeau la 0,05, iar
  // fără subțiere 12 cu 36 se pătrunde și la jocul obișnuit. O roată de sub 12 dinți cu una de peste 2,5 ori mai mare
  // se prinde strâns (8 cu 24, la jocul 0,05, se pătrunde): montajul o spune (`strans`). Montajul la 90°: planul de mijloc al
  // fiecărei roți la r_p(perechii) + 2·m de axul perechii (12 → 8 mm, 20 → 12, 28 → 16, 36 → 20: pe grila de jumătate de pas,
  // de aceea conicele duble LEGO au 12, 20, 28, 36 de dinți).
  const DUBLA = { lat: 8, banda: 2, picior: 2, subtiere: 0.3, inDisc: 0.3, liber: 0.2 };
  type DublaDef = { dinti?: unknown; modul?: unknown };
  function dublaCote({ dinti, modul }: DublaDef) {
    const nr = (v: unknown, d: number) => (v !== null && v !== "" && Number.isFinite(+(v as number)) ? +(v as number) : d);
    const z = Math.round(Math.min(60, Math.max(8, nr(dinti, 12)))), m = Math.min(3, Math.max(0.5, Math.round(nr(modul, 1) * 10) / 10));
    const rp = m * z / 2;
    return { z, m, rp, w: DUBLA.lat * m, rc: rp - DUBLA.picior * m - DUBLA.liber, ub: DUBLA.banda * m };
  }
  function conicaDubla({ dinti = 12, modul = 1, gaura = "x" }: { dinti?: number; modul?: number; gaura?: string }): Corp {
    const e = ef(), avert: string[] = [], q = dublaCote({ dinti, modul }), { z, m, rp, w, rc, ub } = q;
    if (z !== +dinti) avert.push(tr`O conică dublă are între 8 și 60 de dinți: am făcut-o cu ${z}.`);
    const R = profilRoata(z, m, e.jocDinti), pas = 2 * Math.PI / z;
    // un dinte, centrat pe unghiul c, la scara s (spre vârful conului) și cu subțierea t (0 … 1): flancul drept de la picior în
    // sus, mijlocul capului, flancul stâng în jos; dedesubt, pereții radiali coboară până la 0,3·m sub disc (dintele intră în el)
    const raze: number[] = [], jum: number[] = [];
    for (let i = 0; i < R.raze.length && R.jum[i]! > 0; i++) { raze.push(R.raze[i]!); jum.push(R.jum[i]!); }
    const dinte = (c: number, s: number, t: number): P2[] => {
      const d = DUBLA.subtiere * m * t, h = (i: number) => Math.max(jum[i]! - d / raze[i]!, jum[i]! / 4), pol = (r: number, a: number): P2 => [s * r * Math.cos(a), s * r * Math.sin(a)];
      const jos = rc - DUBLA.inDisc * m, dr: P2[] = [pol(jos, c - h(0))], st: P2[] = [pol(jos, c + h(0))];
      for (let i = 0; i < raze.length; i++) { dr.push(pol(raze[i]!, c - h(i))); st.push(pol(raze[i]!, c + h(i))); }
      return [...dr, pol(R.ra, c), ...st.reverse()];
    };
    // straturile, de jos în sus: fața, marginile benzii, fața; la fețe, scara e distanța până la vârful conului (aflat la ub + r_p
    // de mijloc) împărțită la cea de la marginea benzii, (ub + r_p − w / 2) / r_p (la 8·m și ±2·m: (r_p − 2·m) / r_p), și subțierea
    // întreagă
    const sf = (ub + rp - w / 2) / rp, zs = [0, w / 2 - ub, w / 2 + ub, w], ss = [sf, 1, 1, sf], ts = [1, 0, 0, 1];
    // discul, cu gaura (ca la rotițe, cu peretele până la disc)
    const disc = cerc(0, 0, rc, 4 * Math.ceil(Math.max(N_CERC, 2 * Math.PI * rc / 0.8) / 4)), G = gauraRoata(disc, gaura);
    if (G.lipseste) avert.push(tr`Gaura nu încape în conica asta dublă: am făcut-o fără gaură. Alege mai mulți dinți sau un modul mai mare.`);
    else if (G.slaba) avert.push(tr`Între gaură și marginea discului rămân doar ${String(Math.round(G.perete * 100) / 100).replace(".", Limba.zecimal)} mm: roata iese slabă. Alege mai mulți dinți sau un modul mai mare.`);
    const tri: Tri[] = prismaGauri(disc, G.g, 0, w);
    for (let k = 0; k < z; k++) tri.push(...prismaStraturi(zs.map((zz, i) => ({ z: zz, p: dinte(k * pas, ss[i]!, ts[i]!) })), []));
    return { tri, avert };
  }

  // ---------------------------------------------------------------------------------------------- șenila
  // Șenila (ADR 0280, felia 3.To), ca LEGO 57518 (Technic Chain Tread 5 Wide) pe pinioanele 57519 (10 scobituri) și 42529
  // (14), cu cotele din LDraw. Zala se tipărește pe fața de rulare (z = 0): x pe lățime, y de-a lungul șenilei (bolțul la
  // y = 0, clema la y = −12: zala următoare stă cu un pas, 12 mm, mai încolo), z în sus.
  // - aripile: y de la −1,2 la −12,4, groase de 3,2, până la |x| 19,2; limba, la mijloc, y de la −4,4 la −14,8: intră în
  //   crestătura dintre aripile zalei următoare (0,8 mm între aripi, 1,6 până la limba ei). La LEGO, limba și crestătura au
  //   amândouă ±5,6 (se ating, turnate); aici limba are ±5,45 și crestătura ±5,75, deci 0,15 mm pe parte și cu zalele LEGO;
  // - bolțul: Ø3,2 (bara LEGO), la z 5,6, între obrajii de la |x| 5,75…7,2, înalți până la z 8,4; obrajii trec cu 3,6 mm peste
  //   capătul aripilor, teșiți la 45° pe dedesubt (acolo stau aripile zalei de dinainte, iar teșitura se tipărește singură);
  // - clema: două fălci, la |x| 3,2…5,45, la y −12, cu gura în sus; inelul e al clemei din atelier (`clemaD` din calibrare,
  //   peretele, gura); între fălci (|x| < 3,2) rămâne loc pentru discul pinionului, gros de 4;
  // - pereții canalului: în dreptul fălcilor (|x| 3,2…5,45), de la y −4,4 până în inelul clemei, înalți până la z 8,4 (ca la
  //   LEGO): discul pinionului trece printre ei, deci șenila nu alunecă lateral de pe pinion; fălcile ies din ei;
  // - găurile de știft Technic, la x ±8, y −6,8. Fața de rulare e netedă (crampoanele LEGO ar cere suport la tipar).
  // Pinionul: scobiturile sunt cercuri de rază bara / 2 + jocul dinților din calibrare, centrate pe raza R = 6 / sin(π / z),
  // unde stau bolțurile șenilei întinse pe pinion; vârful dinților, la R + 1, dar cel mult la 0,3 mm sub placa zalei din
  // dreptul lui (la 6 dinți ar atinge-o); discul gros de 4, pe un butuc de Ø12 și 8 mm.
  // LEGO: 57519, R 19,42, scobitura de r 1,67 (fundul la 17,75), vârful la 20,4; 42529, R 26,96.
  const SENILA = { pas: 12, lat: 19.2, placa: 3.2, zb: 5.6, aripa: [-12.4, -1.2], limba: [-14.8, -4.4], xl: 5.45, xn: 5.75, obraz: 7.2, obrazY: 2.4,
    obrazZ: 8.4, falci: [3.2, 5.45], zid: [-10, -4.4], zidZ: 8.4, gauraX: 8, gauraY: -6.8, disc: 4, varf: 1, butucR: 6, butucZ: 8 };
  function pinionSenilaCote(dinti: unknown) {
    const nr = (v: unknown, d: number) => (v !== null && v !== "" && Number.isFinite(+(v as number)) ? +(v as number) : d);
    const z = Math.round(Math.min(40, Math.max(6, nr(dinti, 10))));
    return { z, R: SENILA.pas / 2 / Math.sin(Math.PI / z) };
  }
  function zalaSenila({ gauriStift = "da" }: { gauriStift?: string }): Corp {
    const e = ef(), S = SENILA, rb = P.bara_d / 2, ri = e.clemaD / 2, ro = ri + P.clema_perete, yc = -S.pas, L = S.lat, xl = S.xl, xn = S.xn, tri: Tri[] = [];
    const [a0, a1] = S.aripa as [number, number], [l0, l1] = S.limba as [number, number], [f0, f1] = S.falci as [number, number];
    // placa: aripile, crestătura dintre ele (lângă bolț) și limba (la clemă), cu găurile de știft
    const placa: Poli = [[-L, a1], [-xn, a1], [-xn, l1], [xn, l1], [xn, a1], [L, a1], [L, a0], [xl, a0], [xl, l0], [-xl, l0], [-xl, a0], [-L, a0]];
    const gauri_ = gauriStift === "nu" ? [] : [cerc(-S.gauraX, S.gauraY, e.gauraD / 2), cerc(S.gauraX, S.gauraY, e.gauraD / 2)];
    tri.push(...prismaGauri(trig(placa), gauri_, 0, S.placa));
    // obrajii, bolțul, fălcile și gâtul lor: profile în planul (y, z), întinse pe x
    const pe = (p: Poli, x0: number, x1: number) => axe(prisma(trig(p), x0, x1), ([a, b, x]) => [x, a, b], false);
    const obraz: Poli = [[-4.2, S.placa - 0.2], [-1.0, S.placa - 0.2], [S.obrazY, S.placa - 0.2 + S.obrazY + 1.0], [S.obrazY, S.obrazZ], [-4.2, S.obrazZ]];
    tri.push(...pe(obraz, xn, S.obraz), ...pe(obraz, -S.obraz, -xn));
    tri.push(...pe(cerc(0, S.zb, rb, N_CERC), -(xn + 0.8), xn + 0.8));
    const falca = sectiuneC(ri, ro, P.clema_gura, Math.PI / 2, yc, S.zb), gat = dreptunghi(yc - 1.8, S.placa - 1.2, yc + 1.8, S.zb - ri - 0.25);
    const zid = dreptunghi(S.zid[0]!, S.placa - 0.2, S.zid[1]!, S.zidZ);
    for (const [x0, x1] of [[f0, f1], [-f1, -f0]] as [number, number][]) tri.push(...pe(falca, x0, x1), ...pe(gat, x0, x1), ...pe(zid, x0, x1));
    return { tri, avert: [] };
  }
  function pinionSenila({ dinti = 10, gaura = "x" }: { dinti?: number; gaura?: string }): Corp {
    const e = ef(), avert: string[] = [], { z, R } = pinionSenilaCote(dinti), rho = P.bara_d / 2 + e.jocDinti;
    const ra = Math.min(R + SENILA.varf, R * Math.cos(Math.PI / z) + SENILA.zb - SENILA.placa - 0.3);
    if (z !== +dinti) avert.push(tr`Un pinion de șenilă are între 6 și 40 de dinți: l-am făcut cu ${z}.`);
    // conturul: arcele vârfurilor pe cercul ra, între scobituri (cercuri de rază rho centrate pe R, parcurse pe dinăuntru)
    const fi = Math.acos((R * R + ra * ra - rho * rho) / (2 * R * ra)), p: P2[] = [];
    for (let k = 0; k < z; k++) {
      const c = 2 * Math.PI * k / z, cn = 2 * Math.PI * (k + 1) / z, na = Math.max(2, Math.ceil((cn - c - 2 * fi) * ra / 0.4));
      for (let i = 0; i <= na; i++) { const u = c + fi + (cn - c - 2 * fi) * i / na; p.push([ra * Math.cos(u), ra * Math.sin(u)]); }
      const cx = R * Math.cos(cn), cy = R * Math.sin(cn);
      const u0 = Math.atan2(ra * Math.sin(cn - fi) - cy, ra * Math.cos(cn - fi) - cx), u1 = Math.atan2(ra * Math.sin(cn + fi) - cy, ra * Math.cos(cn + fi) - cx);
      const span = 2 * Math.PI - (((u1 - u0) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI), ns = Math.max(4, Math.ceil(span * rho / 0.15));
      for (let i = 1; i < ns; i++) { const u = u0 - span * i / ns; p.push([cx + rho * Math.cos(u), cy + rho * Math.sin(u)]); }
    }
    // gaura, ca la rotițe; discul și butucul (care începe cu 0,1 mm în disc: pereții găurii nu se suprapun pe aceleași vârfuri)
    const G = gauraRoata(cerc(0, 0, SENILA.butucR), gaura);
    const tri: Tri[] = [...prismaGauri(trig(p), G.g, 0, SENILA.disc), ...prismaGauri(cerc(0, 0, SENILA.butucR), G.g, SENILA.disc - 0.1, SENILA.butucZ)];
    return { tri, avert };
  }
  function senila({ piesa = "zala", gauriStift = "da", dinti = 10, gaura = "x" }: { piesa?: string; gauriStift?: string; dinti?: number; gaura?: string }): Corp {
    return piesa === "pinion" ? pinionSenila({ dinti, gaura }) : zalaSenila({ gauriStift });
  }

  function semne(n: number, x0: number, y0: number, z0: number, pas = 2.4) {
    // n cuburi mici de 1,2 mm, ca sa recunosti varianta
    const tri: Tri[] = [];
    for (let k = 0; k < n; k++) tri.push(...cutie(x0 + k * pas, y0, z0, x0 + k * pas + 1.2, y0 + 1.2, z0 + 1.2));
    return tri;
  }
  function calibrare() {
    // cinci placi 2 x 3 (variantele 1..5: stiftul si locasul), doua grinzi de 5 cu gauri rotunde si in cruce
    const piese: { nume: string; titlu: string; tri: Tri[] }[] = [], salvat = { ...P };
    for (let v = 1; v <= 5; v++) {
      P = { ...salvat, varianta_stift: v, varianta_locas: v };
      const tri = caramida({ celule: [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]], placi: 1, fund: "tuburi" }).tri;
      tri.push(...semne(v, 2, -1.0, 0.6));
      piese.push({ nume: `calibrare_stift_${v}`, titlu: tr`Calibrare: placa ${v}`, tri: laOrigine(tri) });
    }
    // inaltimile (ADR 0168): cinci placi 2 x 2 pe fund plin, cu stifturi de 1,7 ... 2,1 mm si locasurile cu 0,2 mai adanci;
    // variantele sunt absolute (nu depind de profil), semnul pe latura din spate
    for (let v = 1; v <= 5; v++) {
      const h = zecime(IMPLICIT.stift_h + (v - 3) / 10);
      P = { ...salvat, stift_h: h, locas_h: zecime(h + 0.2) };
      const tri = caramida({ celule: [[0, 0], [1, 0], [0, 1], [1, 1]], placi: 1, fund: "locasuri" }).tri;
      tri.push(...semne(v, 2, 2 * P.pas - P.joc_lateral - 0.1, 0.6));
      piese.push({ nume: `calibrare_inaltime_${v}`, titlu: tr`Calibrare: înălțimea ${v} (${String(h).replace(".", Limba.zecimal)} mm)`, tri: laOrigine(tri) });
    }
    P = { ...salvat };
    for (const [tip, nume, cheieV] of [["r", "gauri", "varianta_gaura"], ["x", "ax", "varianta_ax"]] as [string, string, "varianta_gaura" | "varianta_ax"][]) {
      // fiecare gaura din grinda e alta varianta: 1 la capatul cu semnul
      const tri: Tri[] = [], w = P.grinda_lat;
      for (let k = 0; k < 5; k++) {
        P = { ...salvat, [cheieV]: k + 1 };
        tri.push(...celulaGrinda(k, 5, tip, true));
      }
      P = { ...salvat };
      tri.push(...cutie(-2.5, w / 2 - 1, 0, 0.4, w / 2 + 1, 2));
      piese.push({ nume: `calibrare_${nume}`, titlu: tip === "r" ? tr("Calibrare: găuri rotunde") : tr("Calibrare: găuri pentru ax"), tri: laOrigine(tri) });
    }
    // barele (clema si stiftul gol) si cupa bilei: cate cinci variante, cu semnul pe spate
    for (let v = 1; v <= 5; v++) {
      P = { ...salvat, varianta_bara: v };
      const tri = clema({ lung: 1, axa: "verticala", goale: true }).tri;
      tri.push(...semne(v, 0.4, 7.7, 0.6, 1.6));
      piese.push({ nume: `calibrare_bara_${v}`, titlu: tr`Calibrare: clemă și știft gol ${v}`, tri: laOrigine(tri) });
    }
    for (let v = 1; v <= 5; v++) {
      P = { ...salvat, varianta_cupa: v };
      const tri = cupa({ baza: 1 }).tri;
      tri.push(...semne(v, 0.4, 7.7, 0.6, 1.6));
      piese.push({ nume: `calibrare_cupa_${v}`, titlu: tr`Calibrare: cupă ${v}`, tri: laOrigine(tri) });
    }
    // rotitele dintate (ADR 0169): cinci roti de 16 dinti, cu gaura de ax, fiecare cu alt joc intre dinti (0,05 ... 0,25 mm
    // pe flanc); semnul, pe fata de sus, intre gaura si dinti
    for (let v = 1; v <= 5; v++) {
      P = { ...salvat, varianta_dinti: v };
      const tri = rotita({ dinti: 16, fel: "drepti", grosime: 3.8, gaura: "x" }).tri;
      tri.push(...semne(v, -3.4, 3.6, 3.79, 1.4));
      const joc = String(Math.round(ef().jocDinti * 100) / 100).replace(".", Limba.zecimal);
      piese.push({ nume: `calibrare_rotita_${v}`, titlu: tr`Calibrare: roata dințată ${v} (joc ${joc} mm)`, tri: laOrigine(tri) });
    }
    // jantele de probă (ADR 0280): cinci jante LEGO (scaunul Ø16,8 pe 13,6 mm, cu canalul nervurii), fiecare cu alt diametru
    // al scaunului (16,6 ... 17,0 mm); o anvelopă LEGO 30,4 × 14 se pune pe ele, iar varianta care ține strâns intră în
    // profil. Semnul: v cubulețe pe fața de sus a benzii.
    for (let v = 1; v <= 5; v++) {
      P = { ...salvat, varianta_janta: v };
      const tri = roata({ fel: "janta", janta: 16.8, lat: 13.6, spite: "disc", gaura: "x" }).tri;
      for (let k = 0; k < v; k++) {
        const x = 7.45 * Math.cos(k * 0.5), y = 7.45 * Math.sin(k * 0.5);
        tri.push(...cutie(x - 0.5, y - 0.5, 13.59, x + 0.5, y + 0.5, 14.59));
      }
      const d = String(Math.round((16.8 + ef().jantaD) * 100) / 100).replace(".", Limba.zecimal);
      piese.push({ nume: `calibrare_janta_${v}`, titlu: tr`Calibrare: janta ${v} (Ø ${d} mm)`, tri: laOrigine(tri) });
    }
    P = { ...salvat };
    piese.push({ nume: "calibrare_bara_proba", titlu: tr("Calibrare: bară de probă"), tri: laOrigine(bara({ lung: 4 }).tri) });
    piese.push({ nume: "calibrare_bila", titlu: tr("Calibrare: bilă de probă"), tri: laOrigine(bila({ baza: 1 }).tri) });
    return piese;
  }

  // ---------------------------------------------------------------------------------------------- forma din cvs2
  function dinCvs2({ contururi = [], grosime = 3.2 }: { contururi?: readonly (readonly (readonly [number, number])[])[]; grosime?: unknown }): Corp {
    // contururile inchise primite din desenul cvs2 (ADR 0166), ridicate la grosime (0,4-50 mm): un contur cuprins de un numar
    // impar de alte contururi e o gaura a celui care il cuprinde direct (cel mai mic), unul cuprins de un numar par e un corp
    const g = +(grosime as number), h = Number.isFinite(g) ? Math.min(50, Math.max(0.4, g)) : 3.2;
    const poli = contururi.map(c => curataPoli(c.map(([x, y]): P2 => [+x, +y]))).filter(q => q.length >= 3 && Math.abs(ariePoli(q)) > 1e-6);
    if (!poli.length) throw new Error(tr("Niciun contur închis de ridicat."));
    const arii = poli.map(q => Math.abs(ariePoli(q)));
    const cuprinde = (a: number, b: number) => a !== b && arii[a]! > arii[b]! && inPoli(poli[a]!, poli[b]![0]!);
    const parinte = poli.map((_, i) => poli.reduce((m: number, _q, j) => (cuprinde(j, i) && (m < 0 || arii[j]! < arii[m]!) ? j : m), -1));
    const adanc = (i: number): number => { let d = 0; for (let k = parinte[i]!; k >= 0; k = parinte[k]!) d++; return d; };
    const tri: Tri[] = [];
    poli.forEach((q, i) => { if (adanc(i) % 2 === 0) tri.push(...prismaGauri(q, poli.filter((_, k) => parinte[k] === i), 0, h)); });
    return { tri, avert: [] };
  }

  // ---------------------------------------------------------------------------------------------- piesa dupa definitie
  const TIPURI = { caramida, lateral, panta, pantaInversa, pana, rotund, grinda, caramidaTechnic, ax, stiftTechnic, bucsa, suport, clema, maner, bara, bila, cupa, rotita, roata, fulie, conica, coroana, conicaDubla, senila, dinCvs2 };
  function construieste(def: DefPiesa) {
    const f = TIPURI[def.tip];
    if (!f) throw new Error("tip necunoscut: " + def.tip);
    const r = (f as (d: DefPiesa) => Rezultat)(def);
    // baza: unde era coltul cutiei inainte de mutarea in origine (pentru asezarea pe grila de stifturi, in model)
    const [a] = cutia(r.tri), tri = muta(r.tri, -a[0], -a[1], -a[2]), [, b] = cutia(tri);
    return { ...r, tri, dim: b, baza: a };
  }

  // ---------------------------------------------------------------------------------------------- STL, pat, zip
  function stl(tri: readonly Tri[], antet = "atelier de caramizi (mm)") {
    let volum = 0, arie = 0;
    const buf = new ArrayBuffer(84 + 50 * tri.length), dv = new DataView(buf);
    for (let i = 0; i < Math.min(80, antet.length); i++) dv.setUint8(i, antet.charCodeAt(i) & 0x7f);
    dv.setUint32(80, tri.length, true);
    let o = 84;
    for (const [a, b, c] of tri) {
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const l = Math.hypot(nx, ny, nz) || 1;
      volum += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
      arie += l / 2;
      for (const v of [nx / l, ny / l, nz / l, ...a, ...b, ...c]) { dv.setFloat32(o, v, true); o += 4; }
      dv.setUint16(o, 0, true); o += 2;
    }
    return { date: new Uint8Array(buf), volum, arie };
  }
  function grame(tri: readonly Tri[], umplere = 0.15): number {
    // pereti si fete pline (cam 1,2 mm), restul cu umplerea; PLA, 1,24 g/cm3
    const { volum, arie } = stl(tri), coaja = Math.min(volum, arie * 1.0);
    return 1.24e-3 * (coaja + umplere * Math.max(0, volum - coaja));
  }
  function aseaza(piese: readonly { nume: string; titlu?: string; tri: Tri[]; dim: readonly number[] }[]) {
    type Rand = { y: number; d: number; x: number };
    type PiesaPat = { nume: string; titlu: string | undefined; x: number; y: number; w: number; d: number; tri: Tri[] };
    type PlacaPat = { randuri: Rand[]; y: number; piese: PiesaPat[] };
    // piese: [{ nume, tri, dim }] -> placile patului (cat mai putine): randuri, de la cele mai adanci; se rotesc cu 90 de grade daca ajuta
    const [W, H] = P.pat, m = P.pat_margine, g = P.pat_distanta, L = W - 2 * m, A = H - 2 * m;
    const lista = piese.map(p => ({ ...p, w: p.dim[0]!, d: p.dim[1]! }))
      .map((p): typeof p & { rot?: boolean } => (p.w > L && p.d <= L && p.w <= A ? { ...p, rot: true, w: p.d, d: p.w } : (p.d > p.w && p.d <= L && p.w <= A ? { ...p, rot: true, w: p.d, d: p.w } : p)))
      .sort((a, b) => b.d - a.d || b.w - a.w);
    const placi: PlacaPat[] = [];
    for (const p of lista) {
      if (p.w > L + 1e-6 || p.d > A + 1e-6) throw new Error(tr`${p.titlu || p.nume} nu încape pe patul de ${W} × ${H} mm`);
      let loc: { pl: PlacaPat; r: Rand } | null = null;
      for (const pl of placi) {
        for (const r of pl.randuri) if (r.x + p.w <= L + 1e-6 && p.d <= r.d + 1e-6) { loc = { pl, r }; break; }
        if (loc) break;
        if (pl.y + p.d <= A + 1e-6) { const r = { y: pl.y, d: p.d, x: 0 }; pl.randuri.push(r); pl.y += p.d + g; loc = { pl, r }; break; }
      }
      if (!loc) { const pl: PlacaPat = { randuri: [], y: 0, piese: [] }; const r = { y: 0, d: p.d, x: 0 }; pl.randuri.push(r); pl.y = p.d + g; placi.push(pl); loc = { pl, r }; }
      const x = m + loc.r.x, y = m + loc.r.y;
      loc.r.x += p.w + g;
      let tri = p.tri;
      if (p.rot) tri = laOrigine(tri.map(t => t.map(([a, b, c]): P3 => [-b, a, c]) as Tri));
      loc.pl.piese.push({ nume: p.nume, titlu: p.titlu, x, y, w: p.w, d: p.d, tri: muta(tri, x, y, 0) });
    }
    return placi.map(pl => ({ piese: pl.piese, tri: pl.piese.flatMap(q => q.tri) }));
  }
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(b: Uint8Array): number { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]!) & 0xff]! ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
  function zip(fisiere: readonly { nume: string; text: string | Uint8Array }[]): Uint8Array {
    const enc = new TextEncoder(), parti: Uint8Array[] = [], central: Uint8Array[] = [];
    let poz = 0;
    const u16 = (n: number) => [n & 0xff, (n >>> 8) & 0xff], u32 = (n: number) => [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff];
    const t = new Date(), ora = (t.getHours() << 11) | (t.getMinutes() << 5) | (t.getSeconds() >> 1), zi = ((t.getFullYear() - 1980) << 9) | ((t.getMonth() + 1) << 5) | t.getDate();
    for (const f of fisiere) {
      const nume = enc.encode(f.nume), date = typeof f.text === "string" ? enc.encode(f.text) : f.text, c = crc32(date);
      const antet = new Uint8Array([...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(ora), ...u16(zi), ...u32(c), ...u32(date.length), ...u32(date.length), ...u16(nume.length), ...u16(0)]);
      parti.push(antet, nume, date);
      central.push(new Uint8Array([...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(ora), ...u16(zi), ...u32(c), ...u32(date.length), ...u32(date.length), ...u16(nume.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(poz)]), nume);
      poz += antet.length + nume.length + date.length;
    }
    const lc = central.reduce((a, x) => a + x.length, 0);
    const sf = new Uint8Array([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(fisiere.length), ...u16(fisiere.length), ...u32(lc), ...u32(poz), ...u16(0)]);
    const tot = new Uint8Array(poz + lc + sf.length);
    let o = 0;
    for (const x of [...parti, ...central, sf]) { tot.set(x, o); o += x.length; }
    return tot;
  }

  return { IMPLICIT, seteaza: (s?: Partial<typeof IMPLICIT> | null) => { P = { ...IMPLICIT, ...(s || {}) }; }, parametri: () => P, efective: ef, inaltimi, construieste, calibrare, stl, grame, aseaza, zip,
    // tipurile pe care le știe `construieste`: fiecare stă într-o familie a atelierului (ADR 0281, proba unitară a tabelei)
    tipuri: Object.freeze(Object.keys(TIPURI)),
    contururi, insetRectiliniu, conturPana, pozitiiGauriPana, centreIndoita,
    // rotitele (ADR 0169): distanta dintre axele a doua roti care se prind (modulul m), pentru atelier
    distantaRoti: (z1: number, z2: number, m = 1) => m * (z1 + z2) / 2,
    spiteIncap: (janta: number, gaura = "x") => jantaCote(Math.min(150, Math.max(12.6, +janta || 16.8)), gaura).spite,
    jantaMinimaSpite: (gaura = "x") => { let D = 12.6; while (D < 150 && !jantaCote(D, gaura).spite) D = Math.round((D + 0.1) * 10) / 10; return D; },
    // fulia (ADR 0280): mărimile după margini și ce fețe încap; de la ce diametru încape o față; cureaua dintre două fulii (pe
    // fundul canalelor) și dacă fuliile s-ar atinge (cu 0,5 mm între ele, cel puțin)
    fulieFete: (d: FulieDef) => { const q = fulieCote(d); return { D: q.D, W: q.W, spite: q.spite, stift: q.stift }; },
    fulieMinimaFata: (d: FulieDef, fata: "spite" | "stift") => { let D = 12; while (D < 200 && !fulieCote({ ...d, diam: D })[fata]) D = Math.round((D + 0.1) * 10) / 10; return D; },
    // roata conică (ADR 0280): pentru o pereche la 90°, cât e vârful comun al conurilor de fața din spate a fiecăreia (deci
    // cât e fața din spate de axa celeilalte)
    conicaMontaj: (d: ConicaDef) => { const a = conicaCote(d), b = conicaCote({ dinti: a.z2, pereche: a.z, modul: a.m }); return { z: a.z, z2: a.z2, fata: a.zA, fataPereche: b.zA }; },
    // roata coroană (ADR 0280): dacă pinionul se prinde; unde stă (axul lui deasupra feței de jos a coroanei; în dreptul
    // dinților ei, de la rIn la rOut de axul ei); cât de gros (cel puțin 3,8, cât LEGO, și peste dinți cu 0,3 de fiecare parte);
    // până unde urcă butucul lung și dacă e în calea axului pinionului (un ax LEGO are 4,8 mm, cu 0,2 mm loc)
    coroanaMontaj: (d: CoroanaDef) => {
      const q = coroanaCote(d), r = coroanaRaze(q, ef().jocDinti), rIn = r ? r.rIn : NaN, rOut = r ? r.rOut : NaN;
      return { z2: q.z2, z1: q.z1, m: q.m, prinde: !!r, axa: q.axa, rIn, rOut, mijloc: (rIn + rOut) / 2,
        grosime: Math.max(3.8, Math.ceil((rOut - rIn + 0.6) * 10 - 1e-6) / 10), butucLung: 2 * q.zp, inCale: q.axa - 2.4 < 2 * q.zp + 0.2 };
    },
    // conica dublă (ADR 0280): pe axe paralele, distanța dintre axe (ca la rotițe); la 90°, cât e planul de mijloc al fiecăreia
    // de axul celeilalte, r_p(celeilalte) + 2·m (cu modulul acesteia); `strans`: o roată de sub 12 dinți cu una de peste 2,5 ori
    // mai mare, care la 90° se prinde strâns (pe plase, la jocul 0,05: 8 cu 24 se pătrunde; 8 cu 20, 9 cu 22, 10 cu 25, 11 cu
    // 27 au joc)
    dublaMontaj: (d: DublaDef, z2: unknown) => {
      const a = dublaCote(d), b = dublaCote({ dinti: z2, modul: a.m }), mic = Math.min(a.z, b.z), strans = mic < 12 && Math.max(a.z, b.z) > 2.5 * mic;
      return { z: a.z, z2: b.z, m: a.m, paralel: a.rp + b.rp, acesta: b.rp + DUBLA.banda * a.m, perechea: a.rp + DUBLA.banda * a.m, strans };
    },
    // șenila pe două pinioane, cu axele la distanța d (mm): lungimea liniei bolțurilor, zalele (câte încap, rotunjit în sus),
    // jocul care rămâne și distanța la care zalele astea stau întinse (`intins`, prin bisecție). Bolțurile stau pe cercurile R,
    // dar zalele sunt coarde: pe o jumătate de pinion de z dinți stau z / 2 zale (la 10 dinți, 60 mm, nu arcul π·R = 61,0).
    // Lungimea e deci a unei curele deschise pe razele r = z · 12 / 2π (cercul lung de z zale): media pe faze a înfășurătoarei
    // convexe a bolțurilor, la câțiva µm (proba); perechile egale, exact 2·d + z·12 (10 cu 10 la 72 mm: 22 de zale, fără joc).
    // `aproape`: vârfurile pinioanelor s-ar atinge (sub 1 mm între ele)
    senilaMontaj: (z1: unknown, z2: unknown, distanta: unknown) => {
      const a = pinionSenilaCote(z1), b = pinionSenilaCote(z2), d = Math.max(0, +(distanta as number) || 0);
      const r1 = a.z * SENILA.pas / (2 * Math.PI), r2 = b.z * SENILA.pas / (2 * Math.PI), dr = r2 - r1;
      const aproape = d < a.R + b.R + 2 * SENILA.varf + 1;
      if (aproape || d <= Math.abs(dr)) return { z1: a.z, z2: b.z, R1: a.R, R2: b.R, d, L: NaN, zale: 0, joc: NaN, intins: NaN, aproape: true };
      const lung = (x: number) => { const al = Math.asin(dr / x); return 2 * Math.sqrt(x * x - dr * dr) + r1 * (Math.PI - 2 * al) + r2 * (Math.PI + 2 * al); };
      const L = lung(d), zale = Math.ceil(L / SENILA.pas - 1e-9), tinta = zale * SENILA.pas;
      let lo = d, hi = d + SENILA.pas;
      for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (lung(m) < tinta) lo = m; else hi = m; }
      return { z1: a.z, z2: b.z, R1: a.R, R2: b.R, d, L, zale, joc: tinta - L, intins: (lo + hi) / 2, aproape: false };
    },
    cureaua: (a: FulieDef, b: FulieDef, C: unknown) => {
      const p = fulieCote(a), q = fulieCote(b), c = +(C as number), minim = Math.ceil((p.R + q.R + 0.5) * 10 - 1e-6) / 10;
      return { lungime: lungimeCurea(p.fund, q.fund, c), minim, atinge: !(c >= minim - 1e-9) };
    },
    _: { inel, prisma, cruce, razaPoligon, insetConvex, taieSemiplan, trunchi, profilRoata, conturRoata, prismaRasucita } };
})(typeof globalThis !== "undefined" ? globalThis : window);
