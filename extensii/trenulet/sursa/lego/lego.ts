// Motorul atelierului: piese compatibile LEGO ca corpuri inchise (STL), gata asezate pentru printare.
//
// Masurile LEGO: pasul de 8 mm, caramida 9,6 mm (3 placi de 3,2), stiftul de 4,8 mm inalt de 1,8, 0,1 mm joc pe
// fiecare latura (piesa de n stifturi are 8n - 0,2 mm). Dedesubt, stiftul piesei de jos e prins intre perete (gros de
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
    stift_d: 4.8, stift_h: 1.8, perete: 1.5, tub_contact: 4 * Math.SQRT2 - 2.4,
    // jocurile pentru printare (varianta 3 = cele de aici); fiecare varianta muta cu pasul ei
    joc_locas: 0.1, gaura_d: 5.0, lamaj_d: 6.4, lamaj_h: 0.8, ax_gaura_d: 5.0, ax_gaura_lat: 2.0,
    ax_d: 4.75, ax_lat: 1.75, stift_technic_d: 4.75, guler_d: 6.0, guler_lat: 1.6,
    grinda_lat: 7.2, grinda_groasa: 7.8, grinda_subtire: 3.8, technic_h: 5.8,
    // bare si cleme (Ø 3,2 la LEGO), bila si cupa articulatiei (Ø 5,9), bucsa
    bara_d: 3.2, bara_gaura_d: 3.4, clema_d: 3.3, clema_perete: 1.1, clema_gura: 2.5, bila_d: 5.9, cupa_d: 6.1, cupa_gura: 5.2,
    bucsa_d: 7.2,
    varianta_stift: 3, varianta_locas: 3, varianta_gaura: 3, varianta_ax: 3, varianta_bara: 3, varianta_cupa: 3,
    pas_stift: 0.05, pas_locas: 0.05, pas_gaura: 0.1, pas_ax: 0.1, pas_bara: 0.1, pas_cupa: 0.1,
    pat: [180, 180] as [number, number], pat_margine: 5, pat_distanta: 4,
  };
  let P = { ...IMPLICIT };
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
      const ad = Math.min(P.stift_h + 0.2, H - 0.8);
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
      let ad = Math.min(P.stift_h + 0.2, z(c[1] - r) - 0.6);
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
    const ad = Math.min(P.stift_h + 0.2, H - 0.8);
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
    const ad = Math.min(P.stift_h + 0.2, H - 0.8), rL = P.stift_d / 2 + e.joc, st: P2[] = [];
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
    const ad = Math.min(P.stift_h + 0.2, H - 0.8), N = 64, c0: P2 = [cx, cy];
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
      tri.push(...inel(pat, cerc(c[0], c[1], P.stift_d / 2 + e.joc), c, 0, Math.min(P.stift_h + 0.2, zj - 0.4)));
      tri.push(...prisma(pat, Math.min(P.stift_h + 0.2, zj - 0.4) - 0.01, zj + 0.01));
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
    P = { ...salvat };
    piese.push({ nume: "calibrare_bara_proba", titlu: tr("Calibrare: bară de probă"), tri: laOrigine(bara({ lung: 4 }).tri) });
    piese.push({ nume: "calibrare_bila", titlu: tr("Calibrare: bilă de probă"), tri: laOrigine(bila({ baza: 1 }).tri) });
    return piese;
  }

  // ---------------------------------------------------------------------------------------------- piesa dupa definitie
  const TIPURI = { caramida, lateral, panta, pantaInversa, pana, rotund, grinda, caramidaTechnic, ax, stiftTechnic, bucsa, suport, clema, maner, bara, bila, cupa };
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

  return { IMPLICIT, seteaza: (s?: Partial<typeof IMPLICIT> | null) => { P = { ...IMPLICIT, ...(s || {}) }; }, parametri: () => P, efective: ef, construieste, calibrare, stl, grame, aseaza, zip,
    contururi, insetRectiliniu, conturPana, pozitiiGauriPana, centreIndoita, _: { inel, prisma, cruce, razaPoligon, insetConvex, taieSemiplan, trunchi } };
})(typeof globalThis !== "undefined" ? globalThis : window);
