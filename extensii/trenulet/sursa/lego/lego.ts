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
  /**
   * O prindere a piesei (ADR 0284, felia 3.Ce): felul, locul `p`, direcția `d` (unitară, spre afară) și lungimea, în mm.
   * - la **tată** (știft, știft Technic, capăt de ax, bară, bilă), `p` e rădăcina: unde ajunge fața piesei pereche când
   *   prinderea e făcută până la capăt; `d` merge de la rădăcină spre vârf; `lung` e cât iese (la bilă, diametrul);
   * - la **mamă** (locaș, gaură de știft, de ax, de bară, clemă, cupă), `p` e mijlocul gurii, pe fața piesei; `d` iese prin
   *   gură; `lung` e adâncimea (la cupă, diametrul); `orb`: gaura nu trece prin piesă;
   * - la gaura de ax și la capătul de ax, `r` e un braț al crucii (unitar, perpendicular pe `d`);
   * - `guler` (la știftul Technic și la capătul lui de ax): cât din gulerul de la rădăcină poate intra într-un lamaj;
   *   `lamaj` (la gaura de știft): cât e de adânc lamajul de la gură. Gulerul intră în lamaj cât încap amândouă.
   * Două prinderi sunt făcute când `p` coincid și `d` sunt opuse (`montaj`).
   */
  type Prindere = { fel: FelPrindere; p: P3; d: P3; lung: number; orb?: true; r?: P3; guler?: number; lamaj?: number };
  type Corp = { tri: Tri[]; avert: string[]; prinderi: Prindere[] };
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

  // ---------------------------------------------------------------------------------------------- prinderile (ADR 0284, 3.Ce)
  // Fiecare piesa isi spune prinderile odata cu plasa, in coordonatele ei (`construieste` le muta in origine, cu plasa).
  const FELURI_PRINDERI = ["stift", "locas", "gauraStift", "gauraAx", "gauraBara", "stiftTechnic", "capatAx", "bara", "clema", "bila", "cupa"] as const;
  type FelPrindere = (typeof FELURI_PRINDERI)[number];
  const TATA: ReadonlySet<string> = new Set(["stift", "stiftTechnic", "capatAx", "bara", "bila"]);
  // ce se prinde cu ce: stiftul in locas, stiftul Technic in gaura lui, axul in gaura de ax (fix) sau in cea de stift (se
  // roteste liber), bara in clema sau in gaura de bara (stiftul gol), bila in cupa
  const PERECHI: readonly (readonly [FelPrindere, FelPrindere])[] = [["stift", "locas"], ["stiftTechnic", "gauraStift"], ["capatAx", "gauraAx"], ["capatAx", "gauraStift"],
    ["bara", "clema"], ["bara", "gauraBara"], ["bila", "cupa"]];
  const sePrind = (a: string, b: string): boolean => PERECHI.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
  const SUS: P3 = [0, 0, 1], JOS: P3 = [0, 0, -1], PE_X: P3 = [1, 0, 0], PE_Y: P3 = [0, 1, 0];
  const felGaura = (t: string): "gauraAx" | "gauraStift" => (t === "x" ? "gauraAx" : "gauraStift");
  /** Gaura care trece prin piesă, de la gura a la gura b: câte o prindere la fiecare gură (întâi cea din a). `r`: un braț
   *  al crucii (doar la gaura de ax); `lamaj`: adâncimea lamajului de la guri (doar la gaura de știft). */
  function prinGaura(fel: "gauraAx" | "gauraStift" | "gauraBara" | "clema", a: P3, b: P3, r?: P3, lamaj = 0): Prindere[] {
    const lung = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]), d: P3 = [(a[0] - b[0]) / lung, (a[1] - b[1]) / lung, (a[2] - b[2]) / lung];
    const una = (p: P3, dir: P3): Prindere => (fel === "gauraAx" && r ? { fel, p, d: dir, lung, r } : fel === "gauraStift" && lamaj > 0 ? { fel, p, d: dir, lung, lamaj } : { fel, p, d: dir, lung });
    return [una(a, d), una(b, [-d[0] || 0, -d[1] || 0, -d[2] || 0])];
  }
  /** Prinderile, duse cu aceeași mutare ca plasa (`f` e o mutare rigidă: direcțiile se duc ca diferențe de puncte). */
  function axePrinderi(l: readonly Prindere[], f: (p: P3) => P3): Prindere[] {
    const dir = (p: P3, v: P3): P3 => { const a = f(p), b = f([p[0] + v[0], p[1] + v[1], p[2] + v[2]]); return [b[0] - a[0], b[1] - a[1], b[2] - a[2]]; };
    return l.map(c => ({ ...c, p: f(c.p), d: dir(c.p, c.d), ...(c.r ? { r: dir(c.p, c.r) } : {}) }));
  }
  const mutaPrinderi = (l: readonly Prindere[], dx: number, dy: number, dz: number): Prindere[] => l.map(c => ({ ...c, p: [c.p[0] + dx, c.p[1] + dy, c.p[2] + dz] }));
  /** Brațul unei cruci (poligonul făcut de `cruce`, poate rotit): de la mijlocul ei spre mijlocul vârfului primului braț. */
  function bratCruce(g: readonly P2[], c: Pt): P3 {
    const x = (g[1]![0] + g[2]![0]) / 2 - c[0], y = (g[1]![1] + g[2]![1]) / 2 - c[1], l = Math.hypot(x, y);
    return [x / l, y / l, 0];
  }
  /** Gaura din mijlocul unei roți (axa pe z, prin origine), de la z 0 la h: de ax (`brat`, un braț al crucii), de știft
   *  („r”) sau de bară („b”); „nu”: fără. `inchisaSus`: un con sau un capac o închide deasupra, deci se intră doar de jos. */
  function prinderiButuc(gaura: string | undefined, h: number, brat: P3 = PE_X, inchisaSus = false): Prindere[] {
    if (gaura === "nu") return [];
    const l = prinGaura(gaura === "r" ? "gauraStift" : gaura === "b" ? "gauraBara" : "gauraAx", [0, 0, h], [0, 0, 0], brat);
    return inchisaSus ? [{ ...l[1]!, orb: true }] : l;
  }
  /** Găurile de știft de pe fața unei roți (fața „stift”): pe cercurile grilei, prin discul feței (de la z 0 la tp). */
  function prinderiFata(fata: string, rh: number, rb: number, tp: number): Prindere[] {
    const out: Prindere[] = [];
    if (fata === "stift") for (const k of cercuriStift(rh, rb)) for (let j = 0; j < 6 * k; j++) {
      const a = (2 * j + 1) * Math.PI / (6 * k), x = P.pas * k * Math.cos(a), y = P.pas * k * Math.sin(a);
      out.push(...prinGaura("gauraStift", [x, y, tp], [x, y, 0]));
    }
    return out;
  }
  // --- montajul: mutarea rigida care pune piesa prinderii b pe prinderea a
  const rotatie = (k: P3, c: number, s: number): number[] => { const t = 1 - c, [x, y, z] = k; return [t * x * x + c, t * x * y - s * z, t * x * z + s * y, t * x * y + s * z, t * y * y + c, t * y * z - s * x, t * x * z - s * y, t * y * z + s * x, t * z * z + c]; };
  const inmulteste = (A: readonly number[], B: readonly number[]): number[] => Array.from({ length: 9 }, (_, i) => A[3 * Math.floor(i / 3)]! * B[i % 3]! + A[3 * Math.floor(i / 3) + 1]! * B[3 + i % 3]! + A[3 * Math.floor(i / 3) + 2]! * B[6 + i % 3]!);
  const roteste = (M: readonly number[], v: P3): P3 => [M[0]! * v[0] + M[1]! * v[1] + M[2]! * v[2], M[3]! * v[0] + M[4]! * v[1] + M[5]! * v[2], M[6]! * v[0] + M[7]! * v[1] + M[8]! * v[2]];
  const vectorial = (a: P3, b: P3): P3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const scalar = (a: P3, b: P3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  /**
   * Montajul (ADR 0284, felia 3.Ce): matricea `m` (3 × 3, pe rânduri) și mutarea `t` care duc piesa prinderii `b` pe
   * prinderea `a` a altei piese: direcțiile ajung opuse, apoi piesa e rotită cu `unghi` grade în jurul axei prinderii.
   * Două cruci (axul și gaura lui) se potrivesc singure, braț pe braț. Tatăl intră cât se poate: până la rădăcină, sau
   * până în fundul unei găuri oarbe mai scurte decât el (atunci rădăcina rămâne afară cu restul).
   */
  function montaj(a: Prindere, b: Prindere, unghi = 0): { m: number[]; t: P3 } {
    if (!sePrind(a.fel, b.fel)) throw new Error(tr("Prinderile astea nu se prind una cu alta."));
    const tinta: P3 = [-a.d[0], -a.d[1], -a.d[2]], k = vectorial(b.d, tinta), s = Math.hypot(k[0], k[1], k[2]), c = scalar(b.d, tinta);
    let R: number[];
    if (s > 1e-9) R = rotatie([k[0] / s, k[1] / s, k[2] / s], c, s);
    else if (c > 0) R = [1, 0, 0, 0, 1, 0, 0, 0, 1];
    else {
      // direcții opuse deja: o jumătate de tură în jurul unei axe perpendiculare
      const p = vectorial(b.d, Math.abs(b.d[2]) < 0.9 ? SUS : PE_X), l = Math.hypot(p[0], p[1], p[2]);
      R = rotatie([p[0] / l, p[1] / l, p[2] / l], -1, 0);
    }
    if (a.r && b.r) {
      // brațul lui b, dus cu R, se rotește în jurul axei până cade pe brațul lui a
      const br = roteste(R, b.r), si = scalar(vectorial(br, a.r), tinta), co = scalar(br, a.r);
      R = inmulteste(rotatie(tinta, co, si), R);
    }
    if (unghi) { const u = unghi * Math.PI / 180; R = inmulteste(rotatie(a.d, Math.cos(u), Math.sin(u)), R); }
    // cât rămâne afară din tată (într-o gaură oarbă mai scurtă) și cât intră gulerul lui în lamajul găurii
    const tata = TATA.has(a.fel) ? a : b, mama = tata === a ? b : a;
    const afara = tata.fel === "bila" ? 0 : tata.lung - (mama.orb ? Math.min(tata.lung, mama.lung) : tata.lung);
    const rest = afara - Math.min(tata.guler ?? 0, mama.lamaj ?? 0), q = roteste(R, b.p);
    return { m: R, t: [a.p[0] + a.d[0] * rest - q[0], a.p[1] + a.d[1] * rest - q[1], a.p[2] + a.d[2] * rest - q[2]] };
  }
  // --- pentru panoul „Se prinde cu” al atelierului
  const CU_GURI: ReadonlySet<string> = new Set(["gauraStift", "gauraAx", "gauraBara", "clema"]), PE_O_TIJA: ReadonlySet<string> = new Set(["stiftTechnic", "capatAx", "bara"]);
  /** Dreapta unei prinderi, ca text: direcția cu semnul îndreptat și punctul ei cel mai apropiat de origine, la sutimi. */
  function cheieDreapta(c: Prindere): string {
    const s = (c.d.find(x => Math.abs(x) > 1e-6) ?? 1) < 0 ? -1 : 1, d: P3 = [c.d[0] * s, c.d[1] * s, c.d[2] * s], k = scalar(c.p, d);
    return [...d.map(x => Math.round(x * 1000)), ...c.p.map((x, i) => Math.round((x - k * d[i]!) * 100))].map(x => x || 0).join(",");
  }
  /**
   * Câte prinderi are piesa, pe feluri (în ordinea felurilor), cum le-ar număra un om: cele două guri ale unei găuri care
   * trece sunt o gaură; cele două capete ale unui ax, ale unui știft Technic sau bucățile aceleiași bare sunt una (stau pe
   * aceeași dreaptă); știfturile, locașurile, bilele și cupele se numără fiecare.
   */
  function rezumatPrinderi(l: readonly Prindere[]): { fel: FelPrindere; cate: number }[] {
    const out: { fel: FelPrindere; cate: number }[] = [];
    for (const fel of FELURI_PRINDERI) {
      const c = l.filter(x => x.fel === fel);
      let cate = c.length;
      if (!cate) continue;
      if (PE_O_TIJA.has(fel)) cate = new Set(c.map(cheieDreapta)).size;
      else if (CU_GURI.has(fel)) {
        // două guri ale aceleiași găuri: față în față, la lungimea găurii una de alta (două găuri oarbe nu ajung una la
        // gura celeilalte, deci rămân două)
        const luate = new Set<number>();
        for (let i = 0; i < c.length; i++) for (let j = i + 1; j < c.length; j++) {
          const a = c[i]!, b = c[j]!;
          if (luate.has(i) || luate.has(j) || scalar(a.d, b.d) > -0.999) continue;
          if (Math.hypot(a.p[0] - a.d[0] * a.lung - b.p[0], a.p[1] - a.d[1] * a.lung - b.p[1], a.p[2] - a.d[2] * a.lung - b.p[2]) < 0.01) { luate.add(i); luate.add(j); cate--; }
        }
      }
      out.push({ fel, cate });
    }
    return out;
  }
  /** Felurile care se potrivesc între două piese: [felul primei, felul celei de-a doua], în ordinea felurilor. */
  function perechiFeluri(a: readonly Prindere[], b: readonly Prindere[]): [FelPrindere, FelPrindere][] {
    const are = (l: readonly Prindere[]) => FELURI_PRINDERI.filter(f => l.some(c => c.fel === f)), out: [FelPrindere, FelPrindere][] = [];
    for (const x of are(a)) for (const y of are(b)) if (sePrind(x, y)) out.push([x, y]);
    return out;
  }
  /** Axul potrivit piesei (în știfturi; axul de n are 8·n − 0,2 mm): trece prin gaura ei cea mai adâncă (de ax sau de
   *  știft) și mai iese un pas. Cea mai lată piesă cu gaură, roata de 40 mm, cere axul de 7. */
  function axPentru(l: readonly Prindere[]): number | null {
    const g = l.filter(c => c.fel === "gauraAx" || c.fel === "gauraStift");
    return g.length ? Math.ceil((Math.max(...g.map(c => c.lung)) + P.pas + 0.2) / P.pas) : null;
  }
  /** Știftul Technic potrivit piesei: de 3 doar unde o gaură de știft trece de un pas (două grosimi); altfel de 2. */
  function stiftPentru(l: readonly Prindere[]): number | null {
    const g = l.filter(c => c.fel === "gauraStift");
    return g.length ? (g.some(c => c.lung > P.pas + 0.5) ? 3 : 2) : null;
  }

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
  function aplatizeaza(v: readonly Vf[], laturi?: (r: number) => number): Poli {
    // contur Cavalier [x, y, bulge] -> poligon (arcele in segmente: cate N_CERC pe un cerc intreg sau, cu `laturi`, cate
    // spune ea pentru raza arcului)
    const out: Poli = [];
    for (let i = 0; i < v.length; i++) {
      const [x1, y1, b] = v[i]!, [x2, y2] = v[(i + 1) % v.length]!;
      out.push([x1, y1]);
      if (Math.abs(b) < 1e-9) continue;
      const th = 4 * Math.atan(b), dx = x2 - x1, dy = y2 - y1, c = Math.hypot(dx, dy);
      if (c < 1e-9) continue;
      const k = (c / 2) / Math.tan(th / 2), cx = (x1 + x2) / 2 - dy / c * k, cy = (y1 + y2) / 2 + dx / c * k;
      const r = Math.hypot(x1 - cx, y1 - cy), a1 = Math.atan2(y1 - cy, x1 - cx), n = Math.max(1, Math.ceil(Math.abs(th) / (2 * Math.PI / (laturi ? laturi(r) : N_CERC))));
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
        const drept = peX || n === 1, t2 = drept ? r.tri : axe(r.tri, ([x, y, z]) => [y, x, z], true);
        const pr = drept ? r.prinderi : axePrinderi(r.prinderi, ([x, y, z]) => [y, x, z]);
        return { tri: muta(t2, s * Math.min(...xs), s * Math.min(...ys), 0), avert: r.avert, prinderi: mutaPrinderi(pr, s * Math.min(...xs), s * Math.min(...ys), 0) };
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
    // prinderile: gaurile verticale (prin toata piesa), cate un locas sub fiecare celula (golul de sub capac sau locasul
    // rotund al piesei pline), stifturile; la cele goale, si gaura de bara (prin stift, prin capac si mai departe)
    const centre = celule.map(([i, j]): P2 => [s * i + s / 2, s * j + s / 2]), n = celule.length, prinderi: Prindere[] = [];
    for (const g of gv) prinderi.push(...prinGaura(felGaura(g.t), [g.c[0], g.c[1], H], [g.c[0], g.c[1], 0], PE_X));
    const adanc = fund === "tuburi" ? H - P.sus : Math.min(P.locas_h, H - 0.8);
    for (const [x, y] of centre) prinderi.push({ fel: "locas", p: [x, y, 0], d: JOS, lung: adanc, orb: true });
    const sus: P2[] = cuStifturi === "mijloc" ? [[centre.reduce((t, c) => t + c[0], 0) / n, centre.reduce((t, c) => t + c[1], 0) / n]] : cuStifturi ? centre : [];
    for (const [x, y] of sus) prinderi.push({ fel: "stift", p: [x, y, H], d: SUS, lung: P.stift_h });
    if (goi) for (const [x, y] of centre) prinderi.push({ fel: "gauraBara", p: [x, y, H + P.stift_h], d: SUS, lung: H + P.stift_h });
    return { tri, avert, prinderi };
  }
  // un parametru numeric cerut: numărul lui (și scris ca text); ce lipsește sau nu e număr dă NaN, deci implicitul piesei
  const numarCerut = (v: unknown): number => (v === null || v === undefined || v === "" || typeof v === "boolean" ? NaN : +(v as number));
  // Arcul (ADR 0284, felia 3.Cd): o cărămidă 1 × n, înaltă de 1–4 cărămizi, cu știfturi pe toată lungimea și cu o boltă
  // dedesubt. Picioarele sunt primul și ultimul știft: două cărămizi 1 × 1 (goale pe dedesubt, deci stau pe știfturi);
  // între ele, puntea: profilul (x, z) cu bolta, întins pe lățime. Bolta e un arc de cerc prin cele două colțuri de jos ale
  // deschiderii; urcă jumătate din deschidere (semicerc), dar nu mai mult decât înălțimea fără 1,6 mm (cât rămâne
  // deasupra, ca la arcul LEGO 1 × 4); „joasă” urcă pe jumătate.
  type ArcDef = { lung?: unknown; inalt?: unknown; bolta?: unknown };
  function arcCote(d: ArcDef) {
    const lc = numarCerut(d.lung), ic = numarCerut(d.inalt);
    const n = Math.round(Math.min(16, Math.max(3, Number.isFinite(lc) ? lc : 4))), c = Math.round(Math.min(4, Math.max(1, Number.isFinite(ic) ? ic : 1)));
    const joasa = d.bolta === "joasa", H = 3 * P.placa * c, xa = P.pas - 0.1, xb = P.pas * (n - 1) + 0.1, w = xb - xa;
    const maxim = Math.min(w / 2, H - 1.6), s = joasa ? maxim / 2 : maxim;
    return { n, c, joasa, H, xa, xb, w, s, R: (w * w / 4 + s * s) / (2 * s), lungRea: Number.isFinite(lc) && n !== Math.round(lc), inaltRea: Number.isFinite(ic) && c !== Math.round(ic) };
  }
  function arc(d: ArcDef): Corp {
    const e = ef(), q = arcCote(d), s = P.pas, tri: Tri[] = [], avert: string[] = [];
    if (q.lungRea) avert.push(tr`Un arc are între 3 și 16 știfturi: l-am făcut de ${q.n}.`);
    if (q.inaltRea) avert.push(tr`Un arc are între 1 și 4 cărămizi înălțime: l-am făcut de ${q.c}.`);
    // picioarele, cu știfturile lor
    const picioare = caramida({ celule: [[0, 0], [q.n - 1, 0]], placi: 3 * q.c });
    tri.push(...picioare.tri);
    // puntea: intră 0,5 mm în pereții picioarelor; bolta are multe colțuri intrate, deci fețele se fac cu earcut. Marginea
    // ei de jos stă la 0,01 mm de masă: la zero, muchia de la piciorul bolții ar fi chiar muchia de jos a peretelui
    // piciorului, iar două corpuri care își împart o muchie ies „deschise” la cine citește STL-ul
    const xm = (q.xa + q.xb) / 2, zc = q.s - q.R, a0 = Math.asin(Math.min(1, q.w / 2 / q.R)), zj = 0.01, pod: Poli = [[q.xa - 0.5, zj], [q.xa, zj]];
    for (let i = 1; i < 48; i++) { const a = -a0 + 2 * a0 * i / 48; pod.push([xm + q.R * Math.sin(a), zc + q.R * Math.cos(a)]); }
    pod.push([q.xb, zj], [q.xb + 0.5, zj], [q.xb + 0.5, q.H], [q.xa - 0.5, q.H]);
    tri.push(...axe(prismaGauri(pod, [], 0.1, s - 0.1), ([u, v, w]) => [u, w, v], true));
    // știfturile de pe punte
    tri.push(...stifturi(Array.from({ length: q.n - 2 }, (_, k): P2 => [s * (k + 1) + s / 2, s / 2]), q.H, e.stiftD));
    // prinderile: locașurile celor două picioare și știfturile de pe toată lungimea
    const prinderi: Prindere[] = picioare.prinderi.filter(c => c.fel === "locas");
    for (let k = 0; k < q.n; k++) prinderi.push({ fel: "stift", p: [s * k + s / 2, s / 2, q.H], d: SUS, lung: P.stift_h });
    return { tri, avert, prinderi };
  }
  // Cadrul (fereastra; ADR 0284, felia 3.Cj): o cărămidă 1 × n, înaltă de 2–6 cărămizi, cu un gol prin ea. Jos, pragul: o
  // placă obișnuită (goală pe dedesubt, deci stă pe știfturi); pe margini, doi stâlpi groși cât rama; sus, buiandrugul: o
  // placă plină, cu știfturi pe toată lungimea. Stâlpii și buiandrugul sunt un singur corp (profilul (x, z) cu golul,
  // întins pe adâncime), la fața pragului și intrat 0,3 mm în capacul lui (de 1 mm: locașurile de dedesubt rămân libere).
  // Golul e drept sau cu colțurile de sus teșite la 45°: teșitura scurtează puntea (ce se tipărește în aer) până la un
  // știft, cât îi lasă înălțimea golului fără 2 mm (cât rămâne stâlpul drept).
  type CadruDef = { lung?: unknown; inalt?: unknown; rama?: unknown; colturi?: unknown };
  function cadruCote(d: CadruDef) {
    const avert: string[] = [];
    const intreg = (v: unknown, a: number, b: number, implicit: number, ce: (x: number) => string): number => {
      const c = numarCerut(v), r = Math.round(Number.isFinite(c) ? c : implicit), x = Math.min(b, Math.max(a, r));
      if (x !== r) avert.push(ce(x));
      return x;
    };
    const n = intreg(d.lung, 2, 8, 4, x => tr`Un cadru are între 2 și 8 știfturi: l-am făcut de ${x}.`);
    const c = intreg(d.inalt, 2, 6, 3, x => tr`Un cadru are între 2 și 6 cărămizi înălțime: l-am făcut de ${x}.`);
    const rc = numarCerut(d.rama), rama = zecime(Math.min(4, Math.max(1.2, Number.isFinite(rc) ? rc : 1.6)));
    if (Number.isFinite(rc) && (rc < 1.2 - 1e-9 || rc > 4 + 1e-9)) avert.push(tr`Rama unui cadru are între 1,2 și 4 mm: am făcut-o de ${String(rama).replace(".", Limba.zecimal)} mm.`);
    const tesit = d.colturi === "tesite", Lx = P.pas * n - 2 * P.joc_lateral, H = 3 * P.placa * c, w = Lx - 2 * rama, h = H - 2 * P.placa;
    return { n, c, rama, tesit, Lx, H, w, h, k: tesit ? Math.max(0, Math.min((w - P.pas) / 2, h - 2)) : 0, avert };
  }
  function cadru(d: CadruDef): Corp {
    const e = ef(), q = cadruCote(d), s = P.pas, j0 = P.joc_lateral, tri: Tri[] = [];
    // pragul: placa 1 × n, fără știfturi
    const prag = caramida({ celule: Array.from({ length: q.n }, (_, i): Celula => [i, 0]), placi: 1, stifturi: false });
    tri.push(...prag.tri);
    // stâlpii și buiandrugul: profilul (x, z) cu golul, întins pe adâncime
    const x0 = j0, x1 = s * q.n - j0, zj = P.placa, zs = q.H - P.placa, xa = j0 + q.rama, xb = s * q.n - j0 - q.rama;
    const gol: Poli = q.k > 1e-9 ? [[xa, zj], [xb, zj], [xb, zs - q.k], [xb - q.k, zs], [xa + q.k, zs], [xa, zs - q.k]] : [[xa, zj], [xb, zj], [xb, zs], [xa, zs]];
    tri.push(...axe(prismaGauri([[x0, zj - 0.3], [x1, zj - 0.3], [x1, q.H], [x0, q.H]], [gol], j0, s - j0), ([u, v, w]) => [u, w, v], true));
    // știfturile, pe toată lungimea
    tri.push(...stifturi(Array.from({ length: q.n }, (_, k): P2 => [s * k + s / 2, s / 2]), q.H, e.stiftD));
    // prinderile: locașurile pragului și știfturile de pe buiandrug
    const prinderi: Prindere[] = prag.prinderi.filter(c => c.fel === "locas");
    for (let k = 0; k < q.n; k++) prinderi.push({ fel: "stift", p: [s * k + s / 2, s / 2, q.H], d: SUS, lung: P.stift_h });
    return { tri, avert: q.avert, prinderi };
  }
  function lateral({ lung = 1, fete = "una" }: { lung?: number; fete?: string }): Corp {
    // caramida 1 x n cu stifturi si pe latura lunga (SNOT): stiftul lateral la 5,6 mm de jos, ca o piesa prinsa in el sa
    // iasa la nivel cu fata de sus. Plina, cu locasuri dedesubt; se printeaza in picioare (stifturile laterale sunt scurte).
    lung = Math.max(1, Math.min(8, Math.round(lung)));
    const e = ef(), s = P.pas, H = 3 * P.placa, j0 = P.joc_lateral, zc = H - s / 2;
    const celule = Array.from({ length: lung }, (_, i): Celula => [i, 0]);
    const { tri, prinderi } = caramida({ celule, placi: 3, fund: "locasuri" });
    for (let i = 0; i < lung; i++) {
      // cilindrul in (u, v, w): u = x, v = z, w = cat iese din fata
      const cil = cilindru(s * i + s / 2, zc, e.stiftD / 2, 0, P.stift_h + 0.01);
      tri.push(...axe(cil, ([u, v, w]) => [u, j0 + 0.01 - w, v], false));
      prinderi.push({ fel: "stift", p: [s * i + s / 2, j0, zc], d: [0, -1, 0], lung: P.stift_h });
      if (fete === "doua") {
        tri.push(...axe(cil, ([u, v, w]) => [u, s - j0 - 0.01 + w, v], true));
        prinderi.push({ fel: "stift", p: [s * i + s / 2, s - j0, zc], d: PE_Y, lung: P.stift_h });
      }
    }
    return { tri, avert: [], prinderi };
  }
  function panta({ lung = 2, adanc = 2, sus = 1, placi = 3, buza = 1.6, profil = "drept" }: { lung?: number; adanc?: number; sus?: number; placi?: number;
    buza?: number; profil?: string }): Rezultat {
    // panta de-a lungul lui y: randurile din spate (sus) au stifturi, in fata coboara pana la buza; profilul drept sau
    // curb (sferturi de sinus: urca repede in fata si ajunge orizontal la randurile cu stifturi). Fara randuri sus: toata e panta.
    const e = ef(), s = P.pas, H = placi * P.placa, j0 = P.joc_lateral, tri: Tri[] = [], avert: string[] = [], prinderi: Prindere[] = [];
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
      prinderi.push({ fel: "locas", p: [c[0], c[1], 0], d: JOS, lung: ad, orb: true });
      if (yc > ya) sub(xa, xb, ya, yc + 0.01, 0);
      if (inPanta) sub(xa, xb, yc, yb, ad - 0.01);
      else tri.push(...prisma(pat, ad - 0.01, H, (x: number, y: number) => z(y)));
    }
    const st: P2[] = [];
    for (let i = 0; i < lung; i++) for (let j = adanc - sus; j < adanc; j++) st.push([s * i + s / 2, s * j + s / 2]);
    tri.push(...stifturi(st, H, e.stiftD));
    for (const [x, y] of st) prinderi.push({ fel: "stift", p: [x, y, H], d: SUS, lung: P.stift_h });
    const unghi = Math.atan2(H - buza, ys - yf) * 180 / Math.PI;
    return { tri, avert: [...new Set(avert)], unghi, prinderi };
  }
  function pantaInversa({ lung = 2, adanc = 2, sus = 1, placi = 3, buza = 1.6 }: { lung?: number; adanc?: number; sus?: number; placi?: number; buza?: number }): Rezultat {
    // panta pe dedesubt: sus e plina, cu stifturi pe toate celulele; dedesubt, randurile din spate stau pe stifturi
    // (locasuri), iar in fata fata de jos urca pana la buza. Se printeaza in picioare: sub panta e o surplomba.
    const e = ef(), s = P.pas, H = placi * P.placa, j0 = P.joc_lateral, tri: Tri[] = [], avert: string[] = [], prinderi: Prindere[] = [];
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
        prinderi.push({ fel: "locas", p: [c[0], c[1], 0], d: JOS, lung: ad, orb: true });
      } else {
        // corpul intors: w = H - z, de la fata de sus (w = 0) pana la fata de jos (w = H - zj); oglindirea intoarce triunghiurile
        tri.push(...axe(prisma(pat, 0, H, (x: number, y: number) => H - zj(y)), ([x, y, w]) => [x, y, H - w], true));
      }
    }
    tri.push(...stifturi(celule.map(([i, j]) => [s * i + s / 2, s * j + s / 2]), H, e.stiftD));
    for (const [i, j] of celule) prinderi.push({ fel: "stift", p: [s * i + s / 2, s * j + s / 2, H], d: SUS, lung: P.stift_h });
    const unghi = Math.atan2(H - buza, ys - yf) * 180 / Math.PI;
    if (unghi < 40) avert.push(tr`Sub pantă, fața e la ${Math.round(90 - unghi)}° de verticală: în picioare, cere suport la printare (sau o pantă mai abruptă).`);
    return { tri, avert, unghi, prinderi };
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
    const e = ef(), s = P.pas, H = placi * P.placa, tri: Tri[] = [], avert: string[] = [], prinderi: Prindere[] = [];
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
      // doar locasul intreg prinde stiftul de dedesubt (cel deschis spre marginea oblica sta pe el, fara sa-l tina)
      if (jos && jos.gaura) prinderi.push({ fel: "locas", p: [c[0], c[1], 0], d: JOS, lung: ad, orb: true });
      if (cuStifturi && d >= P.stift_d / 2 + 0.3) st.push(c);
    }
    if (cuStifturi) tri.push(...stifturi(st, H, e.stiftD));
    if (cuStifturi) for (const [x, y] of st) prinderi.push({ fel: "stift", p: [x, y, H], d: SUS, lung: P.stift_h });
    for (const g of gv) prinderi.push(...prinGaura(felGaura(g.t), [g.c[0], g.c[1], H], [g.c[0], g.c[1], 0], PE_X));
    if (!locasuri) avert.push(tr("Dedesubt nu încape niciun locaș întreg: piesa stă pe știfturi, dar nu se prinde de ele (se lipește)."));
    if (cuStifturi && !st.length) avert.push(tr("Sus nu încape niciun știft întreg."));
    // unghiul taieturii, fata de latura lunga (x)
    const dy = parte === "ambele" ? (lat - varf) / 2 : lat - varf, unghi = Math.atan2(dy, lung - inceput) * 180 / Math.PI;
    return { tri, avert, unghi, stifturi: st.length, locasuri, deschise, gauri: gv.length, prinderi };
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
    const s = P.pas, tri: Tri[] = [], c0: P2 = [cx, cy], prinderi = locasuriRotund(diam, cx, cy, ad);
    // dedesubt: la 1 x 1 locasul (gaura trece prin el); la 2 x 2 tubul din mijloc, care e chiar gaura (stift, ax) si fustele
    if (diam === 1) tri.push(...inel(cerc(cx, cy, R, N), cerc(cx, cy, P.stift_d / 2 + e.joc), c0, 0, ad));
    else {
      const ro = P.tub_contact - e.joc;
      if (g === "bara") tri.push(...tub(cx, cy, ro, Math.min(ro - 0.8, P.stift_d / 2), 0, ad + 0.01));
      else tri.push(...inel(cerc(cx, cy, ro), gp, c0, 0, ad + 0.01));
      tri.push(...fusteRotund(cx, cy, R, ad, e));
    }
    const z0 = diam === 1 ? ad - 0.01 : ad;
    let Rt = R, prinVarf = true, zOprita = H;
    if (forma === "con") {
      Rt = Math.max(0.6, Math.min(R, varf_d / 2));
      const zc = Math.min(H - 0.6, ad + 1.0);
      zOprita = zc;
      tri.push(...inel(cerc(cx, cy, R, N), gp, c0, z0, zc + 0.01));
      if (Rt >= rg + 0.5) tri.push(...inel(cerc(cx, cy, R, N), gp, c0, zc, H, cerc(cx, cy, Rt, N)));
      else { prinVarf = false; tri.push(...trunchi(cx, cy, R, Rt, zc, H, N)); avert.push(tr("Vârful e prea îngust pentru gaură: gaura se oprește sub con.")); }
    } else tri.push(...inel(cerc(cx, cy, R, N), gp, c0, z0, H));
    // sus: la 2 x 2 cu toate stifturile, cele patru raman pline (gaura e intre ele); stiftul din mijloc e gol pentru bara
    const sus: P2[] = [];
    let golSus = false;
    if (st !== "niciunul") {
      if (diam === 2 && st === "toate" && Rt >= R - 1e-9) sus.push(...([[1, 1], [3, 1], [1, 3], [3, 3]] as P2[]).map(([a, b]): P2 => [a * s / 2, b * s / 2]));
      else if (Rt >= P.stift_d / 2 + 0.3) {
        if (g === "bara" && prinVarf) { tri.push(...tub(cx, cy, e.stiftD / 2, e.baraGauraD / 2, H - 0.01, H + P.stift_h)); prinderi.push({ fel: "stift", p: [cx, cy, H], d: SUS, lung: P.stift_h }); golSus = true; }
        else if (g === "bara") sus.push(c0);
        else avert.push(tr("Cu gaura de ") + (g === "ax" ? tr("ax") : tr("știft", "pin")) + tr(" în mijloc, știftul din mijloc nu mai încape: iese fără."));
      } else avert.push(tr("Vârful e prea îngust pentru un știft: iese fără."));
    }
    tri.push(...stifturi(sus, H, e.stiftD));
    for (const [x, y] of sus) prinderi.push({ fel: "stift", p: [x, y, H], d: SUS, lung: P.stift_h });
    // gaura din mijloc: de stift sau de ax, prin toata piesa (sub un con prea ingust, doar de jos, pana sub con); cea de bara,
    // prin stiftul gol de sus (fara el, sau oprita sub con, nu e o prindere: jos se deschide in locas)
    if (g === "bara") { if (golSus) prinderi.push({ fel: "gauraBara", p: [cx, cy, H + P.stift_h], d: SUS, lung: H + P.stift_h }); }
    else if (prinVarf) prinderi.push(...prinGaura(felGaura(g === "ax" ? "x" : "r"), [cx, cy, H], [cx, cy, 0], PE_X));
    else prinderi.push({ ...prinGaura(felGaura(g === "ax" ? "x" : "r"), [cx, cy, zOprita], [cx, cy, 0], PE_X)[1]!, orb: true });
    return { tri, avert, prinderi };
  }
  /** Locașurile de sub piesa rotundă: unul la 1 × 1; la 2 × 2, patru, ținute de tubul din mijloc (toate patru îl strâng). */
  function locasuriRotund(diam: number, cx: number, cy: number, ad: number): Prindere[] {
    const s = P.pas, c: P2[] = diam === 1 ? [[cx, cy]] : [[s / 2, s / 2], [3 * s / 2, s / 2], [s / 2, 3 * s / 2], [3 * s / 2, 3 * s / 2]];
    return c.map(([x, y]): Prindere => ({ fel: "locas", p: [x, y, 0], d: JOS, lung: ad, orb: true }));
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
    const prinderi = locasuriRotund(diam, cx, cy, ad);
    for (const [x, y] of sts) prinderi.push({ fel: "stift", p: [x, y, H], d: SUS, lung: P.stift_h });
    return { tri, avert, prinderi };
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
    // prinderile: fiecare gaura, pe amandoua fetele; crucea de la cot sta pe bisectoare
    const prinderi = C.flatMap(([x, y, u], k) => (tipuri[k] === "p" ? [] : prinGaura(felGaura(tipuri[k]!), [x, y, g], [x, y, 0], [Math.cos(u), Math.sin(u), 0], groasa ? h : 0)));
    return { tri, avert, prinderi };
  }
  function grinda({ gauri = ["r", "r", "r"], groasa = true, celule = null, indoita = null }: { gauri?: readonly string[]; groasa?: boolean;
    celule?: readonly GauraGrila[] | null; indoita?: { brate: number[]; unghiuri: number[] } | null }): Corp {
    if (indoita) return grindaIndoita({ brate: indoita.brate, unghiuri: indoita.unghiuri, gauri, groasa });
    // grinda Technic fara stifturi, culcata (gaurile in sus); la cea groasa, gaurile rotunde au lamaj pe ambele fete.
    // Dreapta: `gauri` (tipul fiecarei gauri); de orice forma: `celule` [i, j, tip] pe grila de 8 mm, legate pe laturi.
    const tri: Tri[] = [], avert: string[] = [], prinderi: Prindere[] = [], gros = groasa ? P.grinda_groasa : P.grinda_subtire;
    // prinderile: fiecare gaura, pe amandoua fetele (pasul plin n-are)
    const gaura = (x: number, y: number, t: string) => { if (t !== "p") prinderi.push(...prinGaura(felGaura(t), [x, y, gros], [x, y, 0], PE_X, groasa ? P.lamaj_h : 0)); };
    if (celule && celule.length) {
      const S = new Set(celule.map(([i, j]) => cheie(i, j)));
      for (const [i, j, t] of celule) { const tip = ["r", "x", "p"].includes(t) ? t : "r"; tri.push(...celulaGrila(S, i, j, tip, groasa)); gaura(P.pas * i, P.pas * j, tip); }
      // intre patru celule in patrat, golul mic din mijloc se umple
      const s = P.pas, g = groasa ? P.grinda_groasa : P.grinda_subtire;
      for (const [i, j] of celule) if (S.has(cheie(i + 1, j)) && S.has(cheie(i, j + 1)) && S.has(cheie(i + 1, j + 1)))
        tri.push(...cutie(s * i + s / 2 - 0.5, s * j + s / 2 - 0.5, 0, s * i + s / 2 + 0.5, s * j + s / 2 + 0.5, g));
      // bucatile legate intre ele (pe laturi)
      const vazut = new Set([cheie(celule[0]![0], celule[0]![1])]), coada: (readonly [number, number, ...unknown[]])[] = [celule[0]!];
      while (coada.length) { const [i, j] = coada.pop()!; for (const [a, b] of [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]] as P2[]) if (S.has(cheie(a, b)) && !vazut.has(cheie(a, b))) { vazut.add(cheie(a, b)); coada.push([a, b]); } }
      if (vazut.size < S.size) avert.push(tr("Grinda are bucăți care nu se ating: ies piese separate."));
      return { tri, avert, prinderi };
    }
    gauri.forEach((t, k) => { tri.push(...celulaGrinda(k, gauri.length, t, groasa)); gaura(P.grinda_lat / 2 + P.pas * k, P.grinda_lat / 2, t === "x" || t === "p" ? t : "r"); });
    return { tri, avert, prinderi };
  }
  function caramidaTechnic({ lung = 4, gauri = null, goale = false, stifturi: cuStifturi = true }: { lung?: number; gauri?: readonly string[] | null; goale?: boolean;
    stifturi?: boolean | "mijloc" }): Corp {
    // caramida Technic 1 x n: stifturi sus, gauri orizontale intre ele (la 5,8 mm): rotunde cu lamaj pe ambele fete ("r"),
    // pentru ax ("x") sau deloc ("p"). La 1 x 1, gaura e sub stift.
    lung = Math.max(1, Math.min(24, Math.round(lung)));
    const e = ef(), s = P.pas, H = 3 * P.placa, j0 = P.joc_lateral, tri: Tri[] = [], prinderi: Prindere[] = [];
    const celule = Array.from({ length: lung }, (_, i): Celula => [i, 0]), S = new Set(celule.map(([i, j]) => cheie(i, j)));
    const zj = 2.5;      // jos: locasurile pentru stifturi; sus: gaurile
    for (const [i] of celule) {
      const c: P2 = [s * i + s / 2, s / 2], pat = patratCelula(S, i, 0, j0);
      tri.push(...inel(pat, cerc(c[0], c[1], P.stift_d / 2 + e.joc), c, 0, Math.min(P.locas_h, zj - 0.4)));
      tri.push(...prisma(pat, Math.min(P.locas_h, zj - 0.4) - 0.01, zj + 0.01));
      prinderi.push({ fel: "locas", p: [c[0], c[1], 0], d: JOS, lung: Math.min(P.locas_h, zj - 0.4), orb: true });
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
      // gaura de-a latul, de pe fata din fata pe cea din spate; crucea are un brat de-a lungul caramizii
      if (tipuri[k] !== "p") prinderi.push(...prinGaura(felGaura(tipuri[k]!), [x, j0, P.technic_h], [x, s - j0, P.technic_h], PE_X, h));
    });
    const st: P2[] = cuStifturi === "mijloc" ? [[s * lung / 2, s / 2]] : celule.map(([i]) => [s * i + s / 2, s / 2]);
    if (cuStifturi === true && goale) for (const [x, y] of st) tri.push(...tub(x, y, e.stiftD / 2, e.baraGauraD / 2, H - 0.01, H + P.stift_h));
    else if (cuStifturi) tri.push(...stifturi(st, H, e.stiftD));
    if (cuStifturi) for (const [x, y] of st) prinderi.push({ fel: "stift", p: [x, y, H], d: SUS, lung: P.stift_h });
    // la stifturile goale, gaura de bara tine cat stiftul (caramida de sub el e plina)
    if (cuStifturi === true && goale) for (const [x, y] of st) prinderi.push({ fel: "gauraBara", p: [x, y, H + P.stift_h], d: SUS, lung: P.stift_h, orb: true });
    return { tri, avert: [], prinderi };
  }
  function ax({ lung = 3, opritor = false }: { lung?: number; opritor?: boolean }): Corp {
    // axul in cruce, culcat pe un brat: sectiunea in planul yz, intinsa pe x; (u, v, w) -> (w, u, v) pastreaza orientarea
    const d = P.ax_d, L = P.pas * lung - 0.2;
    const sec = cruce(d / 2, d / 2, d, P.ax_lat);
    // prinderile: axul intra cu oricare capat, pana la celalalt (radacina e capatul opus); cu opritor, doar pana la el
    const capat = (x0: number, x1: number): Prindere => ({ fel: "capatAx", p: [x0, d / 2, d / 2], d: [Math.sign(x1 - x0), 0, 0], lung: Math.abs(x1 - x0), r: PE_Y });
    if (!opritor) return { tri: axe(prisma(sec, 0, L), ([u, v, w]) => [w, u, v], false), avert: [], prinderi: [capat(0, L), capat(L, 0)] };
    // axul cu opritor (ADR 0284, felia 3.Cb): la un capat, in lungimea axului, un disc cat gulerul stiftului, gros de 1 mm,
    // taiat de masa; se sprijina pe fata grinzii (intra in lamaj) si axul nu mai trece prin gaura
    // conturul discului: cercul intreg (cu extremele lui exacte), din care ramane ce e deasupra mesei, inchis de coarda de pe masa
    const rg = P.guler_d / 2, lo = 1, x0 = Math.sqrt(Math.max(0, rg * rg - d * d / 4)), disc: Poli = [[d / 2 + x0, 0]];
    for (let i = -15; i <= 47; i++) { const t = Math.PI * i / 32, w = d / 2 + rg * Math.sin(t); if (w > 1e-9) disc.push([d / 2 + rg * Math.cos(t), w]); }
    disc.push([d / 2 - x0, 0]);
    const f = ([u, v, w]: P3): P3 => [w, u, v];
    return { tri: [...axe(prisma(sec, 0, L - lo + 0.01), f, false), ...axe(prisma(disc, L - lo, L), f, false)], avert: [], prinderi: [capat(L - lo, 0)] };
  }
  function stiftTechnic({ fanta = true, lung = 2, capat = "stift" }: { fanta?: boolean; lung?: number; capat?: string }): Corp {
    // stiftul Technic de 2 sau 3 (cu gulerul la 1 de un capat), culcat pe o fata taiata (0,35 mm), cu fanta la capetele
    // rotunde; cu `capat: "ax"`, partea scurta e ax in cruce (stiftul cu ax); cu `capat: "bucsa"`, o bucsa plina
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
    const f = ([u, v, w]: P3): P3 => [w, u, v], tri: Tri[] = [], cuAx = capat === "ax", cuBucsa = capat === "bucsa";
    const lf = fanta ? 5 : 0, xg = n === 2 ? L / 2 : L - (P.pas - 0.1), xa = xg - gl / 2, xb = xg + gl / 2, f2 = 0.4;
    // prinderile: fiecare capat, de la fata gulerului pana la varf; gulerul intra pe jumatate in lamajul gaurii (`guler`);
    // capatul de ax, la fel; la stiftul cu bucsa, radacina e fata bucsei (mai lata decat lamajul)
    const capatStift: Prindere = cuBucsa ? { fel: "stiftTechnic", p: [xg, 0, ax0], d: [-1, 0, 0], lung: xg } : { fel: "stiftTechnic", p: [xa, 0, ax0], d: [-1, 0, 0], lung: xa, guler: gl / 2 };
    // capetele (cu fanta), corpul si gulerul
    for (const [w0, w1] of (cuAx || cuBucsa ? [[0, lf]] : [[0, lf], [L - lf, L]]) as P2[]) if (lf) for (const [a, b] of [[-rg, -f2], [f2, rg]] as P2[]) tri.push(...axe(prisma(d(r, a, b), w0, w1), f, false));
    if (cuBucsa) {
      // stiftul cu bucsa (ADR 0284, felia 3.Cb): partea de stift pana unde ar fi fost gulerul, apoi o bucsa plina, lunga de un
      // pas, taiata de masa ca restul; bucsa se sprijina pe fata grinzii, deci gulerul nu mai e
      const rb = P.bucsa_d / 2;
      tri.push(...axe(prisma(d(r, -rg, rg), lf ? lf - 0.01 : 0, xg + 0.01), f, false), ...axe(prisma(d(rb, -rb, rb), xg, L), f, false));
      return { tri, avert: [], prinderi: [capatStift] };
    }
    if (!cuAx) tri.push(...axe(prisma(d(r, -rg, rg), lf - 0.01, L - lf + 0.01), f, false));
    else {
      tri.push(...axe(prisma(d(r, -rg, rg), lf - 0.01, xb), f, false));
      const sec = curataPoli(trig(taieCu(cruce(0, ax0, P.ax_d, P.ax_lat), q => q[1])));
      tri.push(...axe(prisma(sec, xa, L), f, false));
    }
    tri.push(...axe(prisma(d(rg, -rg, rg), xa, xb), f, false));
    const alDoilea: Prindere = cuAx ? { fel: "capatAx", p: [xb, 0, ax0], d: PE_X, lung: L - xb, r: PE_Y, guler: gl / 2 } : { fel: "stiftTechnic", p: [xb, 0, ax0], d: PE_X, lung: L - xb, guler: gl / 2 };
    return { tri, avert: [], prinderi: [capatStift, alDoilea] };
  }
  function bucsa({ lung = 1, gaura = "x" }: { lung?: number; gaura?: string }): Corp {
    // bucsa / conectorul de ax: cilindru de 7,2 in picioare, cu gaura de ax (cruce), rotunda (stift) sau jumatate-jumatate
    const n = [0.5, 1, 2, 3].includes(+lung) ? +lung : 1, e = ef(), h = n * P.pas - 0.2, R = P.bucsa_d / 2, c: P2 = [R, R], ext = cerc(R, R, R, 64);
    const gx = cruce(R, R, e.axGauraD, e.axGauraLat), gr = cerc(R, R, e.gauraD / 2), avert: string[] = [];
    let tri: Tri[], prinderi: Prindere[];
    if (gaura === "xr" && n >= 1) {
      tri = [...inel(ext, gx, c, 0, h / 2 + 0.01), ...inel(ext, gr, c, h / 2, h)];
      // jumatate-jumatate: de jos, crucea (axul trece mai departe, prin jumatatea rotunda); de sus, gaura de stift, pana la cruce
      prinderi = [{ fel: "gauraAx", p: [R, R, 0], d: JOS, lung: h / 2, r: PE_X }, { fel: "gauraStift", p: [R, R, h], d: SUS, lung: h / 2, orb: true }];
    } else {
      if (gaura === "xr") avert.push(tr("Bucșa de ½ are o singură gaură: am făcut-o pentru ax."));
      tri = inel(ext, gaura === "r" ? gr : gx, c, 0, h);
      prinderi = prinGaura(gaura === "r" ? "gauraStift" : "gauraAx", [R, R, h], [R, R, 0], PE_X);
    }
    return { tri, avert, prinderi };
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
  function conector({ gauri = null }: { gauri?: readonly string[] | null }): Corp {
    // conectorul perpendicular (ADR 0284): un bloc culcat, de 1 pana la 5 pasi, cu sectiunea patrata cat grinda groasa.
    // Fiecare pas are gaura lui: de stift ("r", cu lamaj pe fetele prin care iese), de ax ("x") sau niciuna ("p"), pe axa
    // lui: in sus ("v"), de-a latul ("o") sau, doar la capete, in lung ("l"). Codul unui pas e felul si axa ("xv", "ro").
    // Gaurile stau in pasi diferiti, deci nu se taie; cea in lung intra din capat cat un pas si se opreste in vecin.
    const lista: readonly unknown[] = Array.isArray(gauri) && gauri.length ? gauri.slice(0, 5) : ["xv", "ro"];
    const e = ef(), s = P.pas, g = P.grinda_groasa, h = P.lamaj_h, n = lista.length, m = g / 2, tri: Tri[] = [], avert: string[] = [], prinderi: Prindere[] = [];
    let lungLaMijloc = false, cuGaura = false;
    lista.forEach((cod, k) => {
      const c = typeof cod === "string" ? cod : "", capat0 = k === 0, capat1 = k === n - 1;
      let tip = c[0] === "x" || c[0] === "p" ? c[0] : "r";
      const axa = c[1] === "o" || c[1] === "l" ? c[1] : "v";
      if (axa === "l" && !capat0 && !capat1 && tip !== "p") { lungLaMijloc = true; tip = "p"; }
      if (tip !== "p") cuGaura = true;
      // capetele blocului sunt trase cu 0,1 (ca axul); pasii vecini se suprapun cu 0,02
      const cx = s * k + s / 2, x0 = capat0 ? 0.1 : s * k - 0.01, x1 = capat1 ? s * n - 0.1 : s * (k + 1) + 0.01;
      // sectiunea si gaura, in planul perpendicular pe axa gaurii, intinse apoi pe ea (intre w0 si w1)
      const peLung = axa === "l", ext = peLung ? dreptunghi(0, 0, g, g) : dreptunghi(x0, 0, x1, g), ct: P2 = peLung ? [m, m] : [cx, m];
      const w0 = peLung ? x0 : 0, w1 = peLung ? x1 : g;
      let corp: Tri[];
      if (tip === "p") corp = prisma(ext, w0, w1);
      else if (tip === "x") corp = inel(ext, cruce(ct[0], ct[1], e.axGauraD, e.axGauraLat), ct, w0, w1);
      else {
        // lamajul, pe fetele prin care iese gaura: amandoua, sau doar capatul blocului la gaura in lung
        const jos = !peLung || capat0, sus = !peLung || capat1, a = jos ? w0 + h : w0, b = sus ? w1 - h : w1;
        corp = inel(ext, cerc(ct[0], ct[1], e.gauraD / 2), ct, jos ? a - 0.01 : a, sus ? b + 0.01 : b);
        if (jos) corp.push(...inel(ext, cerc(ct[0], ct[1], e.lamajD / 2), ct, w0, a));
        if (sus) corp.push(...inel(ext, cerc(ct[0], ct[1], e.lamajD / 2), ct, b, w1));
      }
      // (u, v, w) -> (u, w, v) intoarce orientarea (ca la caramida Technic); (w, u, v) o pastreaza (ca la ax)
      tri.push(...(axa === "v" ? corp : axa === "o" ? axe(corp, ([u, v, w]) => [u, w, v], true) : axe(corp, ([u, v, w]) => [w, u, v], false)));
      // prinderile: gaura in sus si cea de-a latul trec prin bloc; cea in lung intra din capat cat pasul ei (oarba, daca
      // blocul are mai multi pasi)
      if (tip === "p") return;
      const fel = felGaura(tip);
      if (axa === "v") prinderi.push(...prinGaura(fel, [cx, m, g], [cx, m, 0], PE_X, h));
      else if (axa === "o") prinderi.push(...prinGaura(fel, [cx, 0, m], [cx, g, m], PE_X, h));
      else {
        const guri = prinGaura(fel, [x0, m, m], [x1, m, m], PE_Y, h);
        if (capat0 && capat1) prinderi.push(...guri);
        else prinderi.push({ ...guri[capat0 ? 0 : 1]!, orb: true });
      }
    });
    if (lungLaMijloc) avert.push(tr("O gaură în lung merge doar la capetele blocului: pasul din mijloc rămâne plin."));
    else if (!cuGaura) avert.push(tr("Blocul n-are nicio gaură: alege una, de știft sau de ax."));
    return { tri, avert, prinderi };
  }
  function suport({ lung = 2, adanc = 1, inalt = 1, invers = false }: { lung?: number; adanc?: number; inalt?: number; invers?: boolean }): Corp {
    // suportul (bracket): o placa culcata si una in picioare, in fata ei, cu stifturi spre inainte. Normal: placa culcata
    // jos; intors: sus (atunci cere suport la printare). Stifturile din fata sunt la 4 mm (+ 8 mm pe rand) de jos.
    lung = Math.max(1, Math.min(8, Math.round(lung))); adanc = Math.max(1, Math.min(4, Math.round(adanc))); inalt = Math.max(1, Math.min(4, Math.round(inalt)));
    const s = P.pas, j0 = P.joc_lateral, t = P.placa, Hv = s * inalt - j0, tri: Tri[] = [], avert: string[] = [];
    const placa = caramida({ celule: randCelule(lung, adanc), placi: 1, fund: invers ? "locasuri" : "tuburi" }), baza = placa.tri;
    tri.push(...(invers ? muta(baza, 0, 0, Hv - P.placa) : baza));
    tri.push(...cutie(j0, j0 - t, 0, s * lung - j0, j0 + 0.01, Hv));
    const xs = Array.from({ length: lung }, (_, i) => s * i + s / 2), zs = Array.from({ length: inalt }, (_, k) => s * k + s / 2);
    tri.push(...stifturiFata(xs, zs, j0 - t, -1));
    if (invers) avert.push(tr("Placa de sus stă în aer: la printare cere suport sub ea."));
    // prinderile: ale placii culcate (ridicata, la suportul intors) si stifturile de pe fata din fata
    const prinderi = invers ? mutaPrinderi(placa.prinderi, 0, 0, Hv - P.placa) : placa.prinderi;
    for (const x of xs) for (const z of zs) prinderi.push({ fel: "stift", p: [x, j0 - t, z], d: [0, -1, 0], lung: P.stift_h });
    return { tri, avert, prinderi };
  }
  function sectiuneC(ri: number, ro: number, gura: number, unghi: number, cx: number, cy: number) {
    // inelul deschis al clemei (in plan), cu gura de latime `gura` spre unghiul dat (trigonometric)
    const ao = Math.asin(gura / 2 / ro), ai = Math.asin(gura / 2 / ri), p: Poli = [], n = 40;
    for (let k = 0; k <= n; k++) { const u = unghi + ao + (2 * Math.PI - 2 * ao) * k / n; p.push([cx + ro * Math.cos(u), cy + ro * Math.sin(u)]); }
    for (let k = 0; k <= n; k++) { const u = unghi + 2 * Math.PI - ai - (2 * Math.PI - 2 * ai) * k / n; p.push([cx + ri * Math.cos(u), cy + ri * Math.sin(u)]); }
    return p;
  }
  function conectorUnghi({ mansoane = null, butuc = "r" }: { mansoane?: readonly (readonly [number, string])[] | null; butuc?: string }): Corp {
    // conectorul in unghi (ADR 0284, felia 3.Cb; ca forma, conectorii LEGO numerotati): un butuc rotund in picioare, cu gaura
    // lui verticala (`r` de stift, cu lamaj pe fete; `x` de ax; `p` plin), si 1–4 brate patrate (cat grinda groasa), in planul
    // mesei. Fiecare brat are pe axa lui un manson orb, adanc de un pas: de la o jumatate de pas de centru pana la gura
    // (un pas si jumatate, trasa cu 0,1); `x` de ax (crucea), `r` de stift (gaura grinzii, cu lamaj la gura).
    // Doua brate la mai putin de 90° ar intra unul in mansonul celuilalt: al doilea e lasat afara.
    const e = ef(), s = P.pas, g = P.grinda_groasa, m = g / 2, h = P.lamaj_h, a0 = e.lamajD / 2 + 0.2, a1 = s / 2, a2 = 1.5 * s - 0.1, tri: Tri[] = [], avert: string[] = [];
    // prinderile: gaura butucului (prin el, pe verticala) si mansoanele, de la gura spre butuc (oarbe)
    const prinderi: Prindere[] = butuc === "p" ? [] : prinGaura(butuc === "x" ? "gauraAx" : "gauraStift", [0, 0, g], [0, 0, 0], PE_X, h);
    const cerute = (Array.isArray(mansoane) ? mansoane : []).filter((b): b is readonly [number, string] => Array.isArray(b) && Number.isFinite(b[0]));
    const lista: (readonly [number, string])[] = [];
    let afara = false;
    for (const [u, fel] of cerute.length ? cerute : ([[0, "x"], [135, "x"]] as const)) {
      const ung = ((u % 360) + 360) % 360;
      if (lista.some(([v]) => Math.abs(((ung - v) % 360 + 540) % 360 - 180) < 90 - 1e-6)) { afara = true; continue; }
      lista.push([ung, fel === "r" ? "r" : "x"]);
    }
    // butucul
    const rotund = cerc(0, 0, m, 64), c0: P2 = [0, 0];
    if (butuc === "p") tri.push(...prisma(rotund, 0, g));
    else if (butuc === "x") tri.push(...inel(rotund, cruce(0, 0, e.axGauraD, e.axGauraLat), c0, 0, g));
    else {
      tri.push(...inel(rotund, cerc(0, 0, e.gauraD / 2), c0, h - 0.01, g - h + 0.01));
      tri.push(...inel(rotund, cerc(0, 0, e.lamajD / 2), c0, 0, h), ...inel(rotund, cerc(0, 0, e.lamajD / 2), c0, g - h, g));
    }
    // umarul bratului, vazut de sus: din dreptul centrului butucului pana la fundul mansonului, lat cat bratul, fara cercul
    // gaurii (cu lamajul ei): laturile bratului pleaca tangent din butuc, fara crestaturi, iar gaura butucului ramane libera.
    // Incepe la 0,2 mm dupa centru, nu chiar in dreptul lui: acolo coltul lui ar cadea pe un varf al cercului butucului, iar
    // doua corpuri care isi impart o muchie ies „deschise” la cine citeste STL-ul (la 0,2, coltul e la 5 µm de cerc)
    const ub = 0.2, t1 = Math.acos(ub / a0), umar: Poli = [[ub, -m], [a1 + 0.01, -m], [a1 + 0.01, m], [ub, m]];
    for (let i = 0; i <= 16; i++) { const t = t1 - 2 * t1 * i / 16; umar.push([i === 0 || i === 16 ? ub : a0 * Math.cos(t), a0 * Math.sin(t)]); }
    // mansonul: sectiunea (lateral, vertical) intinsa de-a lungul bratului; apoi totul, rotit in jurul verticalei
    const ext = dreptunghi(-m, 0, m, g), ct: P2 = [0, m];
    for (const [ung, fel] of lista) {
      const co = Math.cos(ung * Math.PI / 180), si = Math.sin(ung * Math.PI / 180);
      tri.push(...axe(prisma(umar, 0, g), ([x, y, z]) => [x * co - y * si, x * si + y * co, z], false));
      const corp = fel === "x" ? inel(ext, cruce(0, m, e.axGauraD, e.axGauraLat), ct, a1, a2)
        : [...inel(ext, cerc(0, m, e.gauraD / 2), ct, a1, a2 - h + 0.01), ...inel(ext, cerc(0, m, e.lamajD / 2), ct, a2 - h, a2)];
      tri.push(...axe(corp, ([v, w, u]) => [u * co - v * si, u * si + v * co, w], false));
      const gura: Prindere = { fel: felGaura(fel), p: [a2 * co, a2 * si, m], d: [co, si, 0], lung: a2 - a1, orb: true };
      prinderi.push(fel === "x" ? { ...gura, r: SUS } : { ...gura, lamaj: h });
    }
    if (afara) avert.push(tr("Două brațe stau la cel puțin 90° unul de altul, altfel intră unul în manșonul celuilalt: am lăsat afară ce nu încăpea."));
    return { tri, avert, prinderi };
  }
  function clema({ lung = 1, axa = "verticala", goale = false }: { lung?: number; axa?: string; goale?: boolean }): Corp {
    // placa 1 x n cu o clema in fata (tine o bara de 3,2): cu axa in sus (bara sta in picioare) sau culcata, de-a lungul
    // placii (bara sta culcata). Cu o placa cu maner face o balama.
    lung = +lung === 2 ? 2 : 1;
    const s = P.pas, j0 = P.joc_lateral, H = P.placa, ri = ef().clemaD / 2, ro = ri + P.clema_perete, w = P.clema_gura, xc = s * lung / 2, tri: Tri[] = [], avert: string[] = [];
    const placa = caramida({ celule: randCelule(lung), placi: 1, goale });
    tri.push(...placa.tri);
    // prinderile: ale placii si clema, deschisa la amandoua capetele (bara trece prin ea)
    const qc = -(ro + 0.2), gat: P2 = [qc + ri + 0.3, 0.5], prinderi = placa.prinderi;
    if (axa === "orizontala") {
      // sectiunea in planul (y, z), intinsa pe x pe 3,6 mm; inelul atinge masa
      const Lc = 3.6, f = ([a, b, x]: P3): P3 => [x, j0 + a, b];
      tri.push(...axe(prisma(trig(sectiuneC(ri, ro, w, Math.PI, qc, ro)), xc - Lc / 2, xc + Lc / 2), f, false));
      tri.push(...axe(prisma(dreptunghi(gat[0], 0, gat[1], Math.min(H, 2 * ro)), xc - Lc / 2, xc + Lc / 2), f, false));
      prinderi.push(...prinGaura("clema", [xc - Lc / 2, j0 + qc, ro], [xc + Lc / 2, j0 + qc, ro]));
    } else {
      tri.push(...prisma(trig(sectiuneC(ri, ro, w, -Math.PI / 2, xc, j0 + qc)), 0, H));
      tri.push(...cutie(xc - (ro - 0.5), j0 + gat[0], 0, xc + (ro - 0.5), j0 + gat[1], H));
      prinderi.push(...prinGaura("clema", [xc, j0 + qc, H], [xc, j0 + qc, 0]));
    }
    return { tri, avert, prinderi };
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
    const placa = caramida({ celule: randCelule(lung), placi: 1 }), prinderi = placa.prinderi;
    tri.push(...placa.tri);
    if (axa === "verticala") {
      // bara in picioare, prinsa doar sus de un brat care pleaca dintr-un stalp din fata placii: jos e libera pe
      // inaltimea clemei (3,2 + 0,4), ca o placa cu clema, pusa la acelasi nivel, sa se prinda pe ea dintr-o parte
      const xc = s * lung / 2, post = 1.0, yb = j0 - post - ro - 0.3, zl = P.placa + 0.4, hb = zl + 1.2;
      tri.push(...cutie(xc - 1.6, j0 - post, 0, xc + 1.6, j0 + 0.01, hb));
      tri.push(...cilindru(xc, yb, rb, 0, hb));
      tri.push(...cutie(xc - rb, yb, zl, xc + rb, j0 - post + 0.01, hb));
      // bara e libera sub brat: clema urca pe ea pana la el
      prinderi.push({ fel: "bara", p: [xc, yb, zl], d: JOS, lung: zl });
    } else {
      // bara culcata la inaltimea centrului clemei culcate (placile la acelasi nivel); bratele de la capete o tin
      const yb = -(ro + 0.3), zb = ro, f = ([a, b, x]: P3): P3 => [x, j0 + a, b], sec = cerc(yb, zb, rb, 48);
      tri.push(...axe(prisma(trig(sec), j0, s * lung - j0), f, false));
      // de la 3 in sus, inca un brat la mijloc, ca bara (care se printeaza ca o punte) sa nu aiba mai mult de ~13,5 mm in aer
      const brate: P2[] = [[j0, j0 + 1.6], [s * lung - j0 - 1.6, s * lung - j0], ...(lung >= 3 ? [[s * lung / 2 - 0.8, s * lung / 2 + 0.8]] as P2[] : [])];
      for (const [x0, x1] of brate) tri.push(...cutie(x0, j0 + yb, 0, x1, j0 + 0.01, zb + rb));
      // bara e libera intre brate: pe fiecare bucata, clema se sprijina de oricare din cele doua brate
      const pe = brate.slice().sort((a, b) => a[0] - b[0]);
      for (let k = 0; k + 1 < pe.length; k++) {
        const xa = pe[k]![1], xb = pe[k + 1]![0];
        prinderi.push({ fel: "bara", p: [xa, j0 + yb, zb], d: PE_X, lung: xb - xa }, { fel: "bara", p: [xb, j0 + yb, zb], d: [-1, 0, 0], lung: xb - xa });
      }
    }
    return { tri, avert, prinderi };
  }
  function bara({ lung = 4 }: { lung?: number }): Corp {
    // bara de 3,2 culcata (taiata 0,25 mm dedesubt), lunga de n stifturi
    const L = Math.max(1, Math.min(16, Math.round(lung))) * P.pas - 0.2, zb = P.bara_d / 2 - 0.25;
    // prinderile: bara intra cu oricare capat, pana la celalalt
    const prinderi: Prindere[] = [{ fel: "bara", p: [0, 0, zb], d: PE_X, lung: L }, { fel: "bara", p: [L, 0, zb], d: [-1, 0, 0], lung: L }];
    return { tri: axe(prisma(sectiuneBara(P.bara_d / 2), 0, L), ([a, b, x]) => [x, a, b], false), avert: [], prinderi };
  }
  function bazaArticulatie(baza: number): Corp {
    // placa de sub bila / cupa: 1 x 1 fara stift sau 2 x 2 cu cele patru stifturi. Prinderile ei: doar locasurile (pe
    // stifturile de la 2 x 2 nu mai incape o piesa, din cauza bilei sau a cupei)
    const placa = baza === 2 ? caramida({ celule: randCelule(2, 2), placi: 1 }) : caramida({ celule: [[0, 0]], placi: 1, stifturi: false, fund: "locasuri" });
    return { ...placa, prinderi: placa.prinderi.filter(c => c.fel === "locas") };
  }
  function bila({ baza = 1 }: { baza?: number }): Corp {
    // bila de 5,9 (ca la LEGO) pe un gat de 3,2, in mijlocul unei placi
    baza = +baza === 2 ? 2 : 1;
    const H = P.placa, rb = P.bila_d / 2, rn = 1.6, c = baza * P.pas / 2, zc = H + 1.5 + Math.sqrt(rb * rb - rn * rn), { tri, prinderi } = bazaArticulatie(baza);
    tri.push(...cilindru(c, c, rn, H - 0.01, zc), ...sfera(c, c, zc, rb, 40));
    prinderi.push({ fel: "bila", p: [c, c, zc], d: SUS, lung: P.bila_d });
    return { tri, avert: [tr("Sub bilă, primele straturi stau în aer: dacă iese urâtă, printeaz-o cu suport.")], prinderi };
  }
  function cupa({ baza = 1 }: { baza?: number }): Corp {
    // cupa pentru bila: gaura sferica deschisa sus, cu patru fante ca sa se deschida cand intra bila
    baza = +baza === 2 ? 2 : 1;
    const e = ef(), H = P.placa, Rc = e.cupaD / 2, Ro = Math.min(P.pas / 2 - P.joc_lateral, Rc + 0.85), rg = e.cupaGura / 2, c = baza * P.pas / 2;
    const zc = H + 0.4 + Rc, z1 = zc - Rc + 0.3, zt = zc + Math.sqrt(Rc * Rc - rg * rg), zs = zc - 1.6, { tri, prinderi } = bazaArticulatie(baza), avert: string[] = [];
    // prinderea: unde sta centrul bilei. Gaura sferica are fundul plat (la z1, cu 0,3 mm peste polul ei), deci bila se asaza
    // pe el, cu centrul putin deasupra centrului gaurii, si e tinuta de buza gurii
    prinderi.push({ fel: "cupa", p: [c, c, Math.max(zc, z1 + P.bila_d / 2)], d: SUS, lung: e.cupaD });
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
    return { tri, avert, prinderi };
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
    // prinderile: gaura din mijloc, prin grosimea rotii (ramane dreapta si la dintii oblici); crucea poate fi rotita
    const prinderi = g.length ? prinderiButuc(gaura, h, bratCruce(g[0]!, [0, 0])) : [];
    if (fel !== "oblici" && fel !== "inv") return { tri: prismaGauri(ext, g, 0, h), avert, prinderi };
    // rasucirea pe cercul de divizare: tan(beta) / r radiani pe mm; straturi de cel mult 0,8°
    const k = Math.tan(beta) / R.r * s, pas = 0.8 * Math.PI / 180;
    if (fel === "oblici") return { tri: prismaRasucita(ext, g, h, Math.max(6, Math.ceil(Math.abs(h * k) / pas)), zh => zh * k), avert, prinderi };
    // in V: jumatate intr-un sens, jumatate inapoi; un numar par de straturi, ca varful V-ului sa cada pe un strat
    const n = Math.max(4, Math.ceil(Math.abs(h / 2 * k) / pas));
    return { tri: prismaRasucita(ext, g, h, 2 * n, zh => (zh <= h / 2 ? zh : h - zh) * k), avert, prinderi };
  }

  // ---------------------------------------------------------------------------------------------- cremaliera
  // Cremaliera (ADR 0284, felia 3.Cc), în picioare pe pat: o bară lată cât un știft, cu dinți drepți deasupra, pe lungime.
  // Dinții au profilul cu care motorul taie roțile (`profilRoata`: 20°, capul m, piciorul 1,25·m), deci se prind cu roțile de
  // aici: la linia de divizare, dintele are π·m / 2 − 2 · jocul (golul roții are π·m / 2 + 2 · jocul). Încap doar dinți
  // întregi, așezați pe mijlocul piesei. Prinderea: pe știfturi (dedesubt e o placă 1 × n) sau cu găuri de știft de-a latul
  // (ca o grindă în picioare). Linia de divizare stă la înălțimea la care axul roții pereche cade pe grilă: gaura unei
  // cărămizi Technic ridicate cu k plăci, respectiv al k-lea rând de găuri de deasupra, cu cel mai mic k la care sub dinți
  // rămâne lemn (0,5 mm peste placă; 0,8 mm peste lamajul găurii).
  type CremalieraDef = { lung?: unknown; modul?: unknown; prindere?: unknown; roata?: unknown };
  function cremalieraCote(d: CremalieraDef) {
    const e = ef(), lungCerut = numarCerut(d.lung), zCerut = numarCerut(d.roata), mCerut = numarCerut(d.modul);
    const n = Math.round(Math.min(24, Math.max(2, Number.isFinite(lungCerut) ? lungCerut : 4)));
    const z = Math.round(Math.min(80, Math.max(8, Number.isFinite(zCerut) ? zCerut : 8)));
    const m = Math.min(3, Math.max(0.5, Math.round((Number.isFinite(mCerut) ? mCerut : 1) * 10) / 10));
    const gauri = d.prindere === "gauri", tg = Math.tan(20 * Math.PI / 180);
    // dintele: grosimea la linia de divizare, capul (scurtat cât vârful să rămână lat de 0,2 mm), lățimea la picior, pasul
    const L = P.pas * n - 0.2, t = Math.PI * m / 2 - 2 * e.jocDinti, cap = Math.min(m, (t / 2 - 0.1) / tg), wr = t + 2.5 * m * tg, p = Math.PI * m;
    const N = Math.floor((L - wr) / p + 1e-9) + 1;
    const baza = gauri ? P.grinda_groasa / 2 : P.technic_h, treapta = gauri ? P.pas : P.placa;
    const minim = (gauri ? P.grinda_groasa / 2 + e.lamajD / 2 + 0.8 : P.placa + 0.5) + 1.25 * m;
    let k = 0;
    while (baza + treapta * k - m * z / 2 < minim - 1e-9) k++;
    const zp = baza + treapta * k - m * z / 2;
    return { n, z, m, gauri, tg, L, t, cap, wr, p, N, k, zp, zr: zp - 1.25 * m, za: zp + cap, axa: zp + m * z / 2,
      lungRea: Number.isFinite(lungCerut) && n !== lungCerut, roataRea: Number.isFinite(zCerut) && z !== zCerut };
  }
  function cremaliera(d: CremalieraDef): Corp {
    const e = ef(), q = cremalieraCote(d), s = P.pas, g = P.grinda_groasa, h = P.lamaj_h, x0 = 0.1, x1 = s * q.n - 0.1, y0 = 0.1, y1 = s - 0.1, tri: Tri[] = [], avert: string[] = [];
    if (q.lungRea) avert.push(tr`O cremalieră are între 2 și 24 de știfturi: am făcut-o de ${q.n}.`);
    if (q.roataRea) avert.push(tr`Roata pereche are între 8 și 80 de dinți: am socotit-o cu ${q.z}.`);
    // corpul de sub dinți: placa 1 × n (cu dedesubtul ei, care se prinde pe știfturi) sau bara cu găuri de știft de-a latul
    let jos: number, prinderi: Prindere[] = [];
    // prinderile: locașurile plăcii de dedesubt, respectiv găurile de știft de-a latul
    if (!q.gauri) { const placa = caramida({ celule: randCelule(q.n), placi: 1, stifturi: false }); tri.push(...placa.tri); prinderi = placa.prinderi; jos = P.placa - 0.01; }
    else {
      jos = q.zr - 0.2;
      for (let k = 0; k < q.n; k++) {
        const xa = k === 0 ? x0 : s * k - 0.01, xb = k === q.n - 1 ? x1 : s * (k + 1) + 0.01, ext = dreptunghi(xa, 0, xb, jos), c: P2 = [s * k + s / 2, g / 2];
        const corp = [...inel(ext, cerc(c[0], c[1], e.gauraD / 2), c, y0 + h - 0.01, y1 - h + 0.01), ...inel(ext, cerc(c[0], c[1], e.lamajD / 2), c, y0, y0 + h), ...inel(ext, cerc(c[0], c[1], e.lamajD / 2), c, y1 - h, y1)];
        tri.push(...axe(corp, ([u, v, w]) => [u, w, v], true));
        prinderi.push(...prinGaura("gauraStift", [c[0], y0, c[1]], [c[0], y1, c[1]], undefined, h));
      }
      jos -= 0.01;
    }
    // bara cu dinți, văzută din lateral (x, z): fundul, apoi, de la dreapta la stânga, dinții (picior, cap, cap, picior)
    const bara: Poli = [[x0, jos], [x1, jos], [x1, q.zr]], mij = (x0 + x1) / 2;
    for (let i = q.N - 1; i >= 0; i--) {
      const xc = mij + (i - (q.N - 1) / 2) * q.p, jr = q.wr / 2, jc = q.t / 2 - q.cap * q.tg;
      bara.push([xc + jr, q.zr], [xc + jc, q.za], [xc - jc, q.za], [xc - jr, q.zr]);
    }
    bara.push([x0, q.zr]);
    // pieptenele are multe colțuri intrate: fețele lui se triunghiulează cu earcut (`prismaGauri`), nu cu `prisma`
    tri.push(...axe(prismaGauri(bara, [], y0, y1), ([u, v, w]) => [u, w, v], true));
    return { tri, avert, prinderi };
  }

  // ---------------------------------------------------------------------------------------------- cama (ADR 0284, 3.Cj)
  // Cama, culcată pe pat (axa pe z, prin origine; brațul cel mai lung pe +x): un disc pe ax a cărui margine stă la o
  // distanță de ax care se schimbă în timpul rotației, de la raza de bază (jumătate din diametrul cerut) la raza de bază plus
  // cursa. Un tachet sprijinit pe ea (capătul unei grinzi, un ax) urcă și coboară cu cursa, o dată pe tură. Trei forme:
  // - excentricul: un cerc de rază R0 + c / 2, cu axul mutat din mijloc cu c / 2 (urcă și coboară lin, câte o jumătate de tură);
  // - para: cercul de bază și un nas rotund (raza R0 / 2, cel puțin 2), cu vârful la R0 + c, legate prin tangente (stă jos
  //   mai mult de jumătate de tură, apoi urcă și coboară scurt);
  // - melcul: raza crește liniar de la R0 la R0 + c pe o tură întreagă, apoi cade (urcă lin, cade dintr-odată; într-un singur sens).
  // Diametrul de bază, 10–64 mm (la 10, între colțul crucii și margine rămân 2,3 mm); cursa, 1–24 mm; grosimea, 1–20 mm.
  type CamaDef = { forma?: unknown; diam?: unknown; cursa?: unknown; grosime?: unknown; gaura?: unknown };
  function camaCote(d: CamaDef) {
    const avert: string[] = [];
    const camp = (v: unknown, a: number, b: number, implicit: number, ce: (x: string) => string): number => {
      const n = numarCerut(v), x = zecime(Math.min(b, Math.max(a, Number.isFinite(n) ? n : implicit)));
      if (Number.isFinite(n) && (n < a - 1e-9 || n > b + 1e-9)) avert.push(ce(String(x).replace(".", Limba.zecimal)));
      return x;
    };
    const D = camp(d.diam, 10, 64, 16, x => tr`Diametrul de bază al unei came e între 10 și 64 mm: am făcut-o de ${x} mm.`);
    const c = camp(d.cursa, 1, 24, 8, x => tr`Cursa unei came e între 1 și 24 mm: am făcut-o de ${x} mm.`);
    const h = camp(d.grosime, 1, 20, 7.8, x => tr`Grosimea unei came e între 1 și 20 mm: am făcut-o de ${x} mm.`);
    return { forma: d.forma === "para" || d.forma === "melc" ? d.forma : "excentric", D, R0: D / 2, c, h, gaura: d.gaura === "r" ? "r" : "x", avert };
  }
  /** Câte laturi are un cerc de rază R ca săgeata lor să fie de cel mult 0,02 mm (multiplu de 8, cel puțin N_CERC). */
  const laturiFine = (R: number): number => Math.max(N_CERC, 8 * Math.ceil(Math.PI / Math.acos(1 - 0.02 / R) / 8));
  /** Conturul camei (trigonometric), cu săgeata laturilor de cel mult 0,02 mm. */
  function conturCama(forma: string, R0: number, c: number): Poli {
    const laturi = laturiFine;
    if (forma === "excentric") return cerc(c / 2, 0, R0 + c / 2, laturi(R0 + c / 2));
    if (forma === "melc") {
      // de la raza de bază (la 0°) la raza de bază plus cursa (la 360°); treapta e latura care închide conturul, pe +x
      const n = laturi(R0 + c), p: Poli = [];
      for (let i = 0; i <= n; i++) { const u = 2 * Math.PI * i / n, r = R0 + c * i / n; p.push(i === n ? [r, 0] : [r * Math.cos(u), r * Math.sin(u)]); }
      return p;
    }
    // para: arcul nasului (între tangente), apoi arcul cercului de bază; câte un număr par de laturi, ca vârful nasului și
    // spatele cercului de bază (capetele camei) să fie chiar vârfuri
    const rn = Math.max(2, R0 / 2), dn = R0 + c - rn, a = Math.acos((R0 - rn) / dn), p: Poli = [];
    const m = 2 * Math.max(4, Math.ceil(laturi(rn) * a / Math.PI / 2)), M = 2 * Math.ceil(laturi(R0) * (Math.PI - a) / Math.PI / 2);
    for (let k = 0; k <= m; k++) { const u = -a + 2 * a * k / m; p.push([dn + rn * Math.cos(u), rn * Math.sin(u)]); }
    for (let k = 0; k <= M; k++) { const u = a + (2 * Math.PI - 2 * a) * k / M; p.push([R0 * Math.cos(u), R0 * Math.sin(u)]); }
    return p;
  }
  function cama(d: CamaDef): Corp {
    const e = ef(), q = camaCote(d);
    const g = q.gaura === "r" ? cerc(0, 0, e.gauraD / 2) : cruce(0, 0, e.axGauraD, e.axGauraLat);
    // prinderile: gaura de pe ax, prin grosimea camei
    return { tri: prismaGauri(conturCama(q.forma, q.R0, q.c), [g], 0, q.h), avert: q.avert, prinderi: prinderiButuc(q.gaura, q.h) };
  }

  // ---------------------------------------------------------------------------------------------- șurubul melc (ADR 0284, 3.Cj)
  // Șurubul melc, în picioare pe pat (axa pe z, prin origine): un miez pe ax, cu o spiră (un singur început, pe dreapta:
  // urcă în sens trigonometric). Într-un plan care trece prin ax, spira are profilul cremalierei de referință a roților de
  // aici (`profilRoata`: 20°, capul 1, piciorul 1,25, pasul π, adică modulul 1): în planul de mijloc al roții pereche,
  // melcul e chiar cremaliera cu care motorul taie roțile, deci se prinde cu orice roată dreaptă de aici, cu axul roții la
  // diam / 2 + z / 2 de axul lui; la o tură a melcului, roata înaintează cu un dinte.
  // - diametrul de divizare: 8 mm (ca LEGO 4716: roțile de 8, 24 și 40 de dinți la 1, 2 și 3 știfturi) sau 16 mm (gros);
  // - spira e înclinată (7,1° la Ø8, 3,6° la Ø16), iar dinții roții sunt drepți: spre marginile roții, spira ar mânca din
  //   joc. De aceea e subțiată, pe fiecare flanc, cu 0,1 mm la Ø8 și cu 0,05 mm la Ø16 (măsurat pe plase: jocul rămâne cel
  //   dintre două roți, 2 · jocul dinților);
  // - gaura de ax, în cruce, prin toată lungimea. La Ø8, între colțul crucii și fundul spirei rămân 0,06 mm: miezul e
  //   patru coloane, între brațele crucii, legate de spiră. La Ø16 rămân 4 mm.
  type MelcDef = { diam?: unknown; lung?: unknown };
  function melcCote(d: MelcDef) {
    const e = ef(), avert: string[] = [];
    const diam = numarCerut(d.diam) === 16 ? 16 : 8, c = numarCerut(d.lung), r = Math.round(Number.isFinite(c) ? c : 2), lung = Math.min(4, Math.max(1, r));
    if (lung !== r) avert.push(tr`Un șurub melc are între 1 și 4 știfturi lungime: l-am făcut de ${lung}.`);
    const rw = diam / 2, sub = diam === 16 ? 0.05 : 0.1, rf = rw - 1.25;
    return { diam, lung, rw, ra: rw + 1, rf, Lz: zecime(P.pas * lung - 2 * P.joc_lateral), sub, t: Math.PI / 2 - 2 * (e.jocDinti + sub),
      perete: rf - Math.hypot(e.axGauraD / 2, e.axGauraLat / 2), avert };
  }
  function melc(d: MelcDef): Corp {
    const e = ef(), q = melcCote(d), pas = Math.PI, tg = Math.tan(20 * Math.PI / 180);
    // secțiunea de-a latul axului, după unghiul u față de mijlocul spirei: vârful (raza ra) cât |u| ≤ a1, flancurile până la
    // a2 (raza scade liniar cu unghiul, o spirală a lui Arhimede: liniile dintre puncte sunt exacte la capete), apoi fundul
    const n = laturiFine(q.ra), pasU = 2 * Math.PI / n, a1 = 2 * Math.PI * (q.t / 2 - tg) / pas, a2 = 2 * Math.PI * (q.t / 2 + 1.25 * tg) / pas;
    const sect: P2[] = [];
    const bucata = (u0: number, u1: number, r0: number, r1: number, par = false) => {
      let k = Math.max(1, Math.ceil((u1 - u0) / pasU - 1e-9));
      if (par && k % 2) k++;
      for (let i = 0; i < k; i++) sect.push([u0 + (u1 - u0) * i / k, r0 + (r1 - r0) * i / k]);
    };
    // vârful, cu un număr par de laturi: mijlocul lui e un punct, deci din sfert în sfert de tură cade chiar pe o axă
    bucata(-a1, a1, q.ra, q.ra, true); bucata(a1, a2, q.ra, q.rf); bucata(a2, 2 * Math.PI - a2, q.rf, q.rf); bucata(2 * Math.PI - a2, 2 * Math.PI - a1, q.rf, q.ra);
    // straturile: n pe o tură, fiecare rotit cu 2π / n față de cel de dedesubt (punctele urcă pe elice), plus capătul
    const dz = pas / n, straturi: { z: number; p: P2[] }[] = [];
    const strat = (z: number) => { const f = 2 * Math.PI * z / pas; straturi.push({ z, p: sect.map(([u, r]): P2 => [r * Math.cos(f + u), r * Math.sin(f + u)]) }); };
    for (let k = 0; k * dz < q.Lz - 1e-6; k++) strat(k * dz);
    strat(q.Lz);
    return { tri: prismaStraturi(straturi, [cruce(0, 0, e.axGauraD, e.axGauraLat)], true), avert: q.avert, prinderi: prinderiButuc("x", q.Lz) };
  }

  // ---------------------------------------------------------------------------------------------- roata cu palete (ADR 0284, 3.Cj)
  // Roata cu palete, culcată pe pat (axa pe z, prin origine; prima paletă pe +x): butucul roților, paletele pornite din
  // el, egal depărtate, până la diametrul cerut, și, la alegere, un disc pe fața de jos, care le ține. Paletele sunt pereți
  // drepți, deci se tipărește fără suport. Drepte: pe rază. Curbate: arce de cerc cu coarda pe rază și săgeata de o
  // cincime din ea, toate în aceeași parte (spre sensul trigonometric), ca niște cupe.
  // - grosimea paletei: 2 % din diametru, cel puțin 1,6 mm; discul: 1,2 mm;
  // - butucul: cel al roților (4,8 mm), dar cel puțin 2,5 grosimi și cât să rămână 0,8 mm între palete lângă el (paleta
  //   curbată taie butucul pieziș, deci ține mai mult loc); crește cel mult până la jumătatea razei: de aici, câte palete încap.
  type PaleteDef = { diam?: unknown; palete?: unknown; lat?: unknown; forma?: unknown; disc?: unknown; gaura?: unknown };
  const PALETE = { grosime: 1.6, disc: 1.2, intre: 0.8, sageata: 0.2 };
  function roataPaleteCote(d: PaleteDef) {
    const avert: string[] = [], K = PALETE, zec = (x: number) => String(x).replace(".", Limba.zecimal);
    const camp = (v: unknown, a: number, b: number, implicit: number, ce: (x: string) => string): number => {
      const n = numarCerut(v), x = zecime(Math.min(b, Math.max(a, Number.isFinite(n) ? n : implicit)));
      if (Number.isFinite(n) && (n < a - 1e-9 || n > b + 1e-9)) avert.push(ce(zec(x)));
      return x;
    };
    const D = camp(d.diam, 24, 160, 64, x => tr`Diametrul unei roți cu palete e între 24 și 160 mm: am făcut-o de ${x} mm.`);
    const forma = d.forma === "curbate" ? "curbate" : "drepte", gaura = d.gaura === "r" ? "r" : "x", R = D / 2;
    const t = Math.max(K.grosime, zecime(0.02 * D));
    // cât ține o paletă pe cercul butucului: grosimea ei, iar la cea curbată, grosimea tăiată pieziș (coarda face cu arcul,
    // la capete, unghiul θ cu sin θ = (c / 2) / ρ, unde ρ = c · (1 / 4 + s²) / (2 · s) e raza arcului cu săgeata s · c)
    const s = K.sageata, piezis = forma === "curbate" ? 1 / Math.sqrt(1 - (s / (0.25 + s * s)) ** 2) : 1, pas = t * piezis + K.intre;
    const incap = Math.floor(Math.PI * R / pas);
    const cerute = numarCerut(d.palete), n0 = Math.round(Number.isFinite(cerute) ? cerute : 8), n = Math.min(24, incap, Math.max(4, n0));
    if (Number.isFinite(cerute) && n !== n0) avert.push(n0 > n && n < 24
      ? tr`La diametrul de ${zec(D)} mm încap cel mult ${n} palete: am făcut-o cu ${n}.`
      : tr`O roată cu palete are între 4 și 24 de palete: am făcut-o cu ${n}.`);
    const W = camp(d.lat, 4, 40, 15.8, x => tr`Lățimea unei roți cu palete e între 4 și 40 mm: am făcut-o de ${x} mm.`);
    const rh = Math.ceil(Math.max(ROATA.butuc, razaGauraButuc(gaura) + ROATA.peretButuc, 2.5 * t, n * pas / (2 * Math.PI)) * 10 - 1e-9) / 10;
    return { D, R, n, W, forma, disc: d.disc === "fara" ? "fara" : "unul", gaura, rh, t, c: R - rh, sageata: forma === "curbate" ? s * (R - rh) : 0, incap: Math.min(24, incap), avert };
  }
  /** Conturul unei palete (trigonometric), cu coarda pe +x: de la butuc (intră 0,3 mm în el) până la cercul de rază R,
   *  pe care îi stau colțurile și mijlocul vârfului. */
  function conturPaleta(q: { R: number; rh: number; t: number; c: number; sageata: number }): Poli {
    const { R, rh, t } = q, h = t / 2;
    if (!q.sageata) { const xv = Math.sqrt(R * R - h * h); return [[rh - 0.3, -h], [xv, -h], [R, 0], [xv, h], [rh - 0.3, h]]; }
    // arcul prin (rh, 0), (mijloc, săgeata), (R, 0): centrul sub coardă, raza rho; marginile paletei sunt arce cu același
    // centru, de raze rho ± t / 2. Unghiul scade de la butuc (uA) la vârf (uB).
    const c = q.c, sg = q.sageata, rho = (c * c / 4 + sg * sg) / (2 * sg), cx = rh + c / 2, cy = sg - rho, dc = Math.hypot(cx, cy), uc = Math.atan2(cy, cx);
    const th = Math.asin(c / 2 / rho), uA = Math.PI / 2 + th, uB = Math.PI / 2 - th;
    const pe = (r: number, u: number): P2 => [cx + r * Math.cos(u), cy + r * Math.sin(u)];
    // unde taie arcul de rază r (cu centrul paletei) cercul de rază a din jurul axului, lângă unghiul u0
    const taie = (r: number, a: number, u0: number): number => {
      const da = Math.acos(Math.min(1, Math.max(-1, (a * a - dc * dc - r * r) / (2 * r * dc))));
      return Math.abs(uc + da - u0) < Math.abs(uc - da - u0) ? uc + da : uc - da;
    };
    // la butuc, paleta pleacă pieziș: marginea dinspre săgeată (sus) e deja în butuc în dreptul capătului coardei, cea de
    // jos e în afara lui; de la ea, capătul paletei coboară pe rază până în butuc (0,3 mm sub fața lui), ca marginea de jos
    // să nu mai meargă pe lângă butuc
    const u1s = taie(rho + h, R, uB), u1j = taie(rho - h, R, uB), m = Math.max(8, Math.ceil(laturiFine(rho) * (uA - uB) / (2 * Math.PI)));
    const sus: Poli = [], jos: Poli = [];
    for (let k = 0; k <= m; k++) { sus.push(pe(rho + h, uA + (u1s - uA) * k / m)); jos.push(pe(rho - h, uA + (u1j - uA) * k / m)); }
    const j0 = jos[0]!, rj = Math.hypot(j0[0], j0[1]);
    return trig([...sus, [R, 0], ...jos.reverse(), [j0[0] * (rh - 0.3) / rj, j0[1] * (rh - 0.3) / rj]]);
  }
  function roataPalete(d: PaleteDef): Corp {
    const q = roataPaleteCote(d), K = PALETE, paleta = conturPaleta(q);
    const tri = butucRoata(q.gaura, q.rh, q.W);
    for (let k = 0; k < q.n; k++) { const u = 2 * Math.PI * k / q.n; tri.push(...prisma(paleta.map(p => rotP(p, u)), 0, q.W)); }
    if (q.disc === "unul") tri.push(...inel(cerc(0, 0, q.R, laturiFine(q.R)), cerc(0, 0, q.rh - 0.3), [0, 0], 0, K.disc));
    return { tri, avert: q.avert, prinderi: prinderiButuc(q.gaura, q.W) };
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
      // prinderile jantei: gaura butucului, prin toata latimea, si gaurile de stift ale fetei
      return { tri, avert, prinderi: [...prinderiButuc(gaura, W), ...prinderiFata(fata, rh, rb, tp)] };
    }
    return { tri, avert, prinderi: [] };
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
    const hb = zecime(W + FULIE.sus);
    tri.push(...butucRoata(gaura, rh, hb));
    const tp = Math.min(W, 6, Math.max(FULIE.disc, 0.3 * W));
    let fata = spite === "disc" || spite === "drepte" || spite === "y" ? spite : "stift";
    if (fata === "stift" && !q.stift) { avert.push(tr("Fulia e prea mică pentru găurile de știft: am făcut fața plină.")); fata = "disc"; }
    if ((fata === "drepte" || fata === "y") && !q.spite) { avert.push(tr("Fulia e prea mică pentru spițe: am făcut fața plină.")); fata = "disc"; }
    tri.push(...fataRoata(fata, Math.round(Math.min(12, Math.max(3, +nrSpite || 6))), rh, rb, tp, q.D));
    // prinderile: gaura butucului si gaurile de stift ale fetei
    return { tri, avert, prinderi: [...prinderiButuc(gaura, hb), ...prinderiFata(fata, rh, rb, tp)] };
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
  function prismaStraturi(straturi: readonly { z: number; p: readonly P2[] }[], gauri: readonly Poli[], elice = false): Tri[] {
    // ca prismaRasucita, cu fiecare strat dat (aceleași puncte, în aceeași ordine, trigonometric, la înălțimi crescătoare);
    // găurile, drepte, de la primul strat la ultimul. `elice`: fiecare strat e rotit în sens trigonometric față de cel de
    // dedesubt, cu cam o latură (șurubul melc): fețele se taie pe cealaltă diagonală, cea aproape verticală, ca niciun
    // triunghi să nu se întindă pe două laturi (săgeata lui ar fi de patru ori mai mare)
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
        if (elice) tri.push([p3(A.p[k]!, A.z), p3(A.p[k1]!, A.z), p3(B.p[k]!, B.z)], [p3(A.p[k1]!, A.z), p3(B.p[k1]!, B.z), p3(B.p[k]!, B.z)]);
        else tri.push([p3(A.p[k]!, A.z), p3(A.p[k1]!, A.z), p3(B.p[k1]!, B.z)], [p3(A.p[k]!, A.z), p3(B.p[k1]!, B.z), p3(B.p[k]!, B.z)]);
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
    return { tri, avert, prinderi: prinderiButuc(g.length ? gaura : "nu", hb) };
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
    return { tri, avert, prinderi: prinderiButuc(gaura, butuc === "scurt" ? tT : 2 * zp) };
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
    return { tri, avert, prinderi: G.g.length ? prinderiButuc(gaura, w, bratCruce(G.g[0]!, [0, 0])) : [] };
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
    // prinderile: gaurile de stift ale placii, boltul (liber intre obraji) si cele doua falci, care prind boltul zalei vecine
    const prinderi: Prindere[] = gauriStift === "nu" ? [] : [-S.gauraX, S.gauraX].flatMap(x => prinGaura("gauraStift", [x, S.gauraY, S.placa], [x, S.gauraY, 0]));
    prinderi.push({ fel: "bara", p: [-xn, 0, S.zb], d: PE_X, lung: 2 * xn }, { fel: "bara", p: [xn, 0, S.zb], d: [-1, 0, 0], lung: 2 * xn });
    for (const [x0, x1] of [[f0, f1], [-f1, -f0]] as [number, number][]) {
      tri.push(...pe(falca, x0, x1), ...pe(gat, x0, x1), ...pe(zid, x0, x1));
      prinderi.push(...prinGaura("clema", [x0, yc, S.zb], [x1, yc, S.zb]));
    }
    return { tri, avert: [], prinderi };
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
    return { tri, avert, prinderi: G.g.length ? prinderiButuc(gaura, SENILA.butucZ, bratCruce(G.g[0]!, [0, 0])) : [] };
  }
  function senila({ piesa = "zala", gauriStift = "da", dinti = 10, gaura = "x" }: { piesa?: string; gauriStift?: string; dinti?: number; gaura?: string }): Corp {
    return piesa === "pinion" ? pinionSenila({ dinti, gaura }) : zalaSenila({ gauriStift });
  }

  // ---------------------------------------------------------------------------------------------- elicea (ADR 0282, 3.Tq)
  // Elicea, din parametri: 2–8 palete pe un butuc ca la LEGO (Ø8 × 8: 15790, 65768, 87751 din LDraw), cu gaura din calibrare:
  // pentru ax, rotundă pentru știft, pentru bară sau fără. Diametrul, 20–200 mm. Pasul, ca raport față de diametru: la paleta
  // „răsucită”, unghiul la raza r e β(r) = atan(P / 2πr) (pas constant, ca la elicele adevărate); la „plată”, β e același pe
  // toată paleta (ca la LEGO: 15790 are 15°, 6041 are 23°), cât dă pasul la 70 % din rază. Coarda: lățimea (procent din rază),
  // după formă (rotunjită: plină până la 55 % din paletă, apoi eliptică; îngustată: jumătate la vârf; dreaptă), cu rădăcina la
  // 60 %; la butuc, paletele nu se ating (coarda proiectată, cel mult 85 % din pasul unghiular). Profilul: placă curbată
  // (săgeata 4 % din coardă) sau profil de aripă (NACA 4412); grosimea, de la 1,2 la rădăcină la 0,8 la vârf (două linii de
  // duză), cel puțin. Tipărită fără suport: fiecare secțiune își are punctul cel mai de jos pe masă (z = 0), cu muchia de fugă
  // jos și cea de atac sus; butucul, cât cere paleta la rădăcină (cel puțin 8). Sensul „dreapta”: privită din spate (dinspre
  // motor, de sub masă), se rotește în sensul acelor de ceasornic; de sus, muchia de atac merge în sens trigonometric.
  // „Stânga” e oglinda ei. Conul, la alegere, pe butuc (îl închide sus).
  const ELICE = { butucR: 4, butucH: 8, tRad: 1.2, tVarf: 0.8, sageata: 0.04, radacina: 0.6, umplere: 0.85, statii: 28, perSuprafata: 12, con: 1.3 };
  type EliceDef = { palete?: unknown; diametru?: unknown; pas?: unknown; latime?: unknown; forma?: string; profil?: string; sens?: string; gaura?: string; con?: string; paleta?: string };
  function eliceCote(d: EliceDef) {
    const nr = (v: unknown, implicit: number) => (v !== null && v !== undefined && v !== "" && Number.isFinite(+(v as number)) ? +(v as number) : implicit);
    const z = Math.round(Math.min(8, Math.max(2, nr(d.palete, 3))));
    const D = Math.min(200, Math.max(20, nr(d.diametru, 72))), R = D / 2;
    const pd = Math.min(1.5, Math.max(0.3, nr(d.pas, 0.7))), P = pd * D;
    const lat = Math.min(60, Math.max(15, nr(d.latime, 30)));
    const plata = d.paleta === "plata", b70 = Math.atan(P / (2 * Math.PI * 0.7 * R));
    const beta = (r: number) => (plata ? b70 : Math.atan(P / (2 * Math.PI * r)));
    return { z, D, R, pd, P, lat, plata, beta, bRad: beta(ELICE.butucR), bVarf: beta(R), consola: 0.2 / Math.tan(beta(R)) };
  }
  function sectiuneElice(c: number, t: number, profil: string): P2[] {
    // secțiunea paletei în (u, v): u de la muchia de fugă (0) la cea de atac (c), v grosimea; pe deasupra spre muchia de atac,
    // apoi pe dedesubt înapoi (în sensul acelor)
    const M = ELICE.perSuprafata, sus: P2[] = [], jos: P2[] = [];
    for (let i = 0; i <= M; i++) {
      const x = 0.5 - 0.5 * Math.cos(Math.PI * i / M), u = x * c;
      let yc: number, ht: number;
      if (profil === "aripa") {
        // NACA 4412 (săgeata 4 % la 40 %, grosimea 12 %), cu xa de la muchia de atac; grosimea, cel puțin t
        const xa = 1 - x, m = 0.04, p = 0.4;
        yc = (xa < p ? m / (p * p) * (2 * p * xa - xa * xa) : m / ((1 - p) * (1 - p)) * (1 - 2 * p + 2 * p * xa - xa * xa)) * c;
        ht = Math.max(5 * 0.12 * (0.2969 * Math.sqrt(xa) - 0.126 * xa - 0.3516 * xa * xa + 0.2843 * xa ** 3 - 0.1036 * xa ** 4) * c, t / 2);
      } else {
        yc = 4 * ELICE.sageata * x * (1 - x) * c;
        ht = t / 2;
      }
      sus.push([u, yc + ht]); jos.push([u, yc - ht]);
    }
    return [...sus, ...jos.reverse()];
  }
  type StatieElice = { r: number; sec: P2[]; rot?: number };
  function paleteElice(statii: readonly StatieElice[], z: number, semn: number, fasie = false): Tri[] {
    // z palete la fel, fiecare un corp închis, din secțiunile ei: (s, h) la raza r, cu s pe cerc de la unghiul paletei; `rot`
    // (radiani) mută toată secțiunea pe cerc (înclinarea înapoi a elicei de barcă). `fasie`: capetele se închid ca o fâșie
    // între fața de sus și cea de jos (secțiunea cu o față plată are puncte coliniare, pe care tăierea urechilor le pierde)
    const tri: Tri[] = [], N = statii.length - 1;
    for (let k = 0; k < z; k++) {
      const th = 2 * Math.PI * k / z;
      const p3 = (st: StatieElice, [s, h]: P2): P3 => { const f = st.rot ? th + semn * (s / st.r + st.rot) : th + semn * s / st.r; return [st.r * Math.cos(f), st.r * Math.sin(f), h]; };
      const pal: Tri[] = [], M2 = statii[0]!.sec.length;
      for (let i = 0; i < N; i++) {
        const A = statii[i]!, B = statii[i + 1]!;
        for (let j = 0; j < M2; j++) {
          const j1 = (j + 1) % M2;
          const a = p3(A, A.sec[j]!), b = p3(A, A.sec[j1]!), c = p3(B, B.sec[j1]!), dd = p3(B, B.sec[j]!);
          pal.push([a, b, c], [a, c, dd]);
        }
      }
      // capetele: secțiunea de la rădăcină și cea de la vârf (conturul e în sensul acelor: întors pentru tăierea urechilor)
      const capat = (st: StatieElice, invers: boolean) => {
        const ccw = st.sec.slice().reverse(), n = ccw.length;
        // fâșia: punctul j al feței de sus și perechea lui de jos (n − 1 − j), din aproape în aproape
        const urechi = fasie ? Array.from({ length: n / 2 - 1 }, (_, j): [number, number, number][] => [[j, j + 1, n - 2 - j], [j, n - 2 - j, n - 1 - j]]).flat() : triunghiuriPoligon(ccw);
        for (const [a, b, c] of urechi) {
          const t3: Tri = [p3(st, ccw[a]!), p3(st, ccw[b]!), p3(st, ccw[c]!)];
          pal.push(invers ? [t3[0], t3[2], t3[1]] : t3);
        }
      };
      capat(statii[0]!, false);
      capat(statii[N]!, true);
      tri.push(...orienteaza(pal));
    }
    return tri;
  }
  function butucElice(rh: number, Hh: number, gaura: string | undefined, inchisSus = false): { tri: Tri[]; prinderi: Prindere[] } {
    // butucul elicelor, cu gaura din calibrare: pentru ax (crucea), rotundă (știftul), pentru bară sau fără. Prinderile:
    // gaura, prin butuc; sub un con sau un capac (care intră 0,1 mm în butuc), doar de jos
    const fel = gaura === "b" || gaura === "r" || gaura === "nu" ? gaura : "x";
    const G = fel === "b" ? { g: [cerc(0, 0, ef().baraGauraD / 2)] } : gauraRoata(cerc(0, 0, rh), fel);
    const prinderi = G.g.length ? prinderiButuc(fel, inchisSus ? Hh - 0.1 : Hh, bratCruce(G.g[0]!, [0, 0]), inchisSus) : [];
    return { tri: prismaGauri(cerc(0, 0, rh), G.g, 0, Hh), prinderi };
  }
  function elice(d: EliceDef): Corp {
    const avert: string[] = [], q = eliceCote(d), { z, R } = q, rh = ELICE.butucR;
    if (Number.isFinite(+(d.palete as number)) && q.z !== +(d.palete as number)) avert.push(tr`O elice are între 2 și 8 palete: am făcut-o cu ${q.z}.`);
    if (Number.isFinite(+(d.diametru as number)) && q.D !== +(d.diametru as number)) avert.push(tr`Diametrul unei elice e între 20 și 200 mm: am făcut-o de ${q.D} mm.`);
    const forma = d.forma === "drept" || d.forma === "ingust" ? d.forma : "rot", profil = d.profil === "aripa" ? "aripa" : "placa";
    const semn = d.sens === "stanga" ? -1 : 1, cmax = q.lat / 100 * R, N = ELICE.statii, r0 = rh - 0.4;
    // secțiunile, de la puțin din butuc la vârf: (s, z) după rotirea cu β, cu muchia de jos pe masă
    const statii = Array.from({ length: N + 1 }, (_, i) => {
      const r = r0 + (R - r0) * i / N, x = Math.max(0, (r - rh) / (R - rh)), b = q.beta(r);
      let g = forma === "drept" ? 1 : forma === "ingust" ? 1 - 0.5 * x : (x <= 0.55 ? 1 : Math.sqrt(Math.max(0, 1 - ((x - 0.55) / 0.45) ** 2)));
      g *= ELICE.radacina + (1 - ELICE.radacina) * Math.min(1, x / 0.25);
      const t = ELICE.tRad - (ELICE.tRad - ELICE.tVarf) * x;
      // coarda: cea cerută, dar secțiunea reală (cu grosimea și săgeata ei, rotită cu β) încape în 85 % din pasul dintre palete;
      // spre vârf, cel puțin 2,5 · t (vârful rotunjit nu se strânge într-un punct)
      const U = ELICE.umplere * 2 * Math.PI * r / z, roteste = (cc: number) => sectiuneElice(cc, t, profil)
        .map(([u, v]): P2 => [(u - cc / 2) * Math.cos(b) - v * Math.sin(b), (u - cc / 2) * Math.sin(b) + v * Math.cos(b)]);
      let c = Math.max(x >= 0.5 ? 2.5 * t : t, cmax * g), sec = roteste(c);
      for (let k = 0; k < 8; k++) {
        const lat = Math.max(...sec.map(p => p[0])) - Math.min(...sec.map(p => p[0]));
        if (lat <= U) break;
        c = Math.max(t, c * U / lat * 0.995); sec = roteste(c);
      }
      const zmin = Math.min(...sec.map(p => p[1]));
      return { r, sec: sec.map(([s, h]): P2 => [s, h - zmin]) };
    });
    const hRad = Math.max(...statii.filter(st => st.r <= rh + 0.5).map(st => Math.max(...st.sec.map(p => p[1]))));
    const Hh = Math.max(ELICE.butucH, Math.ceil(hRad * 10) / 10);
    const tri = paleteElice(statii, z, semn), butuc = butucElice(rh, Hh, d.gaura, d.con === "da");
    tri.push(...butuc.tri);
    if (d.con === "da") {
      // conul din față: de la 0,1 mm în butuc până la vârf, înalt cât 1,3 din raza butucului
      const n = N_CERC, z0 = Hh - 0.1, zv = Hh + ELICE.con * rh, con: Tri[] = [];
      for (let i = 0; i < n; i++) {
        const a = (2 * Math.PI * i) / n, b = (2 * Math.PI * (i + 1)) / n;
        const pa: P3 = [rh * Math.cos(a), rh * Math.sin(a), z0], pb: P3 = [rh * Math.cos(b), rh * Math.sin(b), z0];
        con.push([pa, pb, [0, 0, zv]], [pa, [0, 0, z0], pb]);
      }
      tri.push(...orienteaza(con));
    }
    return { tri, avert, prinderi: butuc.prinderi };
  }

  // ------------------------------------------------------------------------------------- elicea de barcă (ADR 0282, 3.Tr)
  // Elicea de barcă, din parametri: 3–5 palete late, cu pas constant (β(r) = atan(P / 2πr)), Ø20–120 mm. Reperul formei e
  // elicea motorului de barcă LEGO (u9216 din LDraw: Ø21,6, trei palete ovale care acoperă ~80 % din disc), dar pe un butuc
  // cu gaura din calibrare, ca să stea pe un ax LEGO. Conturul paletei e o „ureche”: coarda crește eliptic de la 60 % (la
  // rădăcină) la lățimea cerută (la 60 % din paletă), apoi se rotunjește eliptic spre vârf; pe fiecare rază, paleta ocupă cel
  // mult 85 % din pasul dintre palete (nu se ating). Paletele sunt înclinate înapoi pe cerc (skew): mijlocul corzii rămâne în
  // urma rotației cu unghiul cerut · x² (x, locul pe paletă). Înclinarea spre pupa (pe axă, rake; 3.Tt), la alegere, 0–15°
  // (implicit 0): fiecare secțiune urcă cu max(0, r − rh) · tan θ, deci muchia de jos pleacă de pe masă de la butuc și se
  // tipărește cu suport sub palete; fără ea, elicea e cea de dinainte, la octet. Secțiunea e ogivală: fața plată (cea care
  // împinge apa, spre pupa) sus, spatele bombat jos; groasă la mijlocul corzii de la 4 % din diametru (între 1,6 și 3) la 0,8
  // la vârf, cu muchiile de 0,6. Fără înclinarea spre pupa, tipărită fără suport, cu partea dinspre barcă pe masă: fiecare
  // secțiune își are punctul cel mai de jos la z = 0 (muchia de atac jos, cea de fugă sus). Butucul: Ø8, sau 18 % din diametru
  // la elicele mari, înalt cât cel mai înalt vârf al paletelor (cel puțin 8).
  // Capacul rotunjit, la alegere, îl închide sus (spre pupa); axul intră de jos (dinspre barcă). Sensul „dreapta”: privită
  // dinspre pupa (de sus), se rotește în sensul acelor de ceasornic la mers înainte (același elicoid ca „dreapta” elicei).
  const BARCA = { butucMin: 4, butucRap: 0.09, butucH: 8, tRap: 0.04, tMin: 1.6, tMax: 3, tVarf: 0.8, muchie: 0.6, plin: 0.6, radacina: 0.6, umplere: 0.85, statii: 28, perSuprafata: 12, capac: 1.2, inele: 6, pupaMax: 15 };
  type BarcaDef = { palete?: unknown; diametru?: unknown; pas?: unknown; latime?: unknown; inclinare?: unknown; pupa?: unknown; sens?: string; gaura?: string; capac?: string };
  function sectiuneBarca(c: number, t: number): P2[] {
    // secțiunea ogivală în (u, v): u de-a lungul corzii, fața plată la v = 0, spatele sub ea (parabolă: muchiile de 0,6, t la
    // mijloc); pe față într-un sens, apoi pe spate înapoi (în sensul acelor, ca secțiunea elicei)
    const M = BARCA.perSuprafata, sus: P2[] = [], jos: P2[] = [];
    for (let i = 0; i <= M; i++) {
      const x = 0.5 - 0.5 * Math.cos(Math.PI * i / M);
      sus.push([x * c, 0]); jos.push([x * c, -(BARCA.muchie + (t - BARCA.muchie) * 4 * x * (1 - x))]);
    }
    return [...sus, ...jos.reverse()];
  }
  function eliceBarcaCote(d: BarcaDef) {
    const nr = (v: unknown, implicit: number) => (v !== null && v !== undefined && v !== "" && Number.isFinite(+(v as number)) ? +(v as number) : implicit);
    const z = Math.round(Math.min(5, Math.max(3, nr(d.palete, 3))));
    const D = Math.min(120, Math.max(20, nr(d.diametru, 40))), R = D / 2;
    const pd = Math.min(1.6, Math.max(0.5, nr(d.pas, 1))), P = pd * D;
    const lat = Math.min(150, Math.max(40, nr(d.latime, 100))), inc = Math.min(40, Math.max(0, nr(d.inclinare, 20)));
    const pupa = Math.min(BARCA.pupaMax, Math.max(0, nr(d.pupa, 0)));
    const rh = Math.max(BARCA.butucMin, Math.round(BARCA.butucRap * D * 10) / 10), r0 = rh - 0.4;
    // înclinarea spre pupa: cât urcă secțiunea de la raza r (la butuc, nimic)
    const urca = (r: number) => (pupa > 0 ? Math.max(0, r - rh) * Math.tan(pupa * Math.PI / 180) : 0);
    const tRad = Math.min(BARCA.tMax, Math.max(BARCA.tMin, BARCA.tRap * D)), cmax = lat / 100 * R, N = BARCA.statii;
    const beta = (r: number) => Math.atan(P / (2 * Math.PI * r));
    // secțiunile, de la puțin din butuc la vârf: (s, h) după rotirea cu β în jurul mijlocului corzii, cu punctul de jos pe masă
    const statii = Array.from({ length: N + 1 }, (_, i) => {
      const r = r0 + (R - r0) * i / N, x = Math.max(0, (r - rh) / (R - rh)), b = beta(r);
      const g = x <= BARCA.plin ? Math.sqrt(1 - (1 - BARCA.radacina ** 2) * ((BARCA.plin - x) / BARCA.plin) ** 2) : Math.sqrt(Math.max(0, 1 - ((x - BARCA.plin) / (1 - BARCA.plin)) ** 2));
      const t = tRad - (tRad - BARCA.tVarf) * x;
      const roteste = (cc: number) => sectiuneBarca(cc, t).map(([u, v]): P2 => [(u - cc / 2) * Math.cos(b) - v * Math.sin(b), (u - cc / 2) * Math.sin(b) + v * Math.cos(b)]);
      const latime = (sec: P2[]) => Math.max(...sec.map(p => p[0])) - Math.min(...sec.map(p => p[0]));
      // coarda: cea a conturului, dar secțiunea reală (cu grosimea ei, rotită cu β) încape în 85 % din pasul dintre palete; spre
      // vârf, cel puțin 2,5 · t (vârful rotunjit nu se strânge într-un punct)
      const U = BARCA.umplere * 2 * Math.PI * r / z;
      let c = Math.max(x >= 0.5 ? 2.5 * t : t, cmax * g), sec = roteste(c);
      for (let k = 0; k < 40 && latime(sec) > U; k++) { c = Math.max(t, c * U / latime(sec) * 0.995); sec = roteste(c); }
      // punctul cel mai de jos pe masă, apoi ridicată cu înclinarea spre pupa (fără ea, secțiunea e cea de dinainte, la octet)
      const zmin = Math.min(...sec.map(p => p[1])), u = urca(r);
      return { r, sec: sec.map(([s, h]): P2 => [s, u > 0 ? h - zmin + u : h - zmin]), rot: inc * Math.PI / 180 * x * x, lat: latime(sec), h: Math.max(...sec.map(p => p[1])) - zmin + u };
    });
    // butucul, cât cel mai înalt vârf al paletelor (la zecime în sus), cel puțin cât un știft
    const Hh = Math.max(BARCA.butucH, Math.ceil(Math.max(...statii.map(st => st.h)) * 10 - 1e-9) / 10);
    // cât din disc acoperă paletele, privite de-a lungul axei: lățimile pe cerc, adunate de la butuc la vârf (trapeze)
    let arie = 0;
    for (let i = 0; i < N; i++) {
      const A = statii[i]!, B = statii[i + 1]!;
      if (B.r <= rh) continue;
      const ra = Math.max(A.r, rh), la = A.r >= rh ? A.lat : A.lat + (B.lat - A.lat) * (rh - A.r) / (B.r - A.r);
      arie += (la + B.lat) / 2 * (B.r - ra);
    }
    return { z, D, R, pd, P, lat, inc, pupa, urca: urca(R), rh, Hh, statii, bRad: beta(rh), bVarf: beta(R), consola: 0.2 / Math.tan(beta(R)), acoperire: z * arie / (Math.PI * R * R) };
  }
  function eliceBarca(d: BarcaDef): Corp {
    const avert: string[] = [], q = eliceBarcaCote(d), { rh, Hh } = q;
    if (Number.isFinite(+(d.palete as number)) && q.z !== +(d.palete as number)) avert.push(tr`O elice de barcă are între 3 și 5 palete: am făcut-o cu ${q.z}.`);
    if (Number.isFinite(+(d.diametru as number)) && q.D !== +(d.diametru as number)) avert.push(tr`Diametrul unei elice de barcă e între 20 și 120 mm: am făcut-o de ${q.D} mm.`);
    const tri = paleteElice(q.statii, q.z, d.sens === "stanga" ? -1 : 1, true), butuc = butucElice(rh, Hh, d.gaura, d.capac === "da");
    tri.push(...butuc.tri);
    if (d.capac === "da") {
      // capacul rotunjit (spre pupa): o jumătate de elipsoid, de la 0,1 mm în butuc până la 1,2 raze peste el
      const n = N_CERC, K = BARCA.inele, z0 = Hh - 0.1, hc = Hh + BARCA.capac * rh - z0, cap: Tri[] = [];
      const pt = (i: number, k: number): P3 => { const a = (2 * Math.PI * (i % n)) / n, f = (Math.PI / 2) * k / K; return [rh * Math.cos(f) * Math.cos(a), rh * Math.cos(f) * Math.sin(a), z0 + hc * Math.sin(f)]; };
      const varf: P3 = [0, 0, z0 + hc];
      for (let i = 0; i < n; i++) {
        cap.push([pt(i, 0), [0, 0, z0], pt(i + 1, 0)]);
        for (let k = 0; k < K - 1; k++) cap.push([pt(i, k), pt(i + 1, k), pt(i + 1, k + 1)], [pt(i, k), pt(i + 1, k + 1), pt(i, k + 1)]);
        cap.push([pt(i, K - 1), pt(i + 1, K - 1), varf]);
      }
      tri.push(...orienteaza(cap));
    }
    return { tri, avert, prinderi: butuc.prinderi };
  }

  // ------------------------------------------------------------------------------------ ventilatorul cu carcasă (ADR 0282, 3.Ts)
  // Ventilatorul cu carcasă, din parametri: rotorul și carcasa (tubul din jurul lui, cu urechile pentru grinzi), două piese.
  // Diametrul e cel din interiorul carcasei (24–120 mm); vârful paletelor stă la Ø / 2 − jocul (0,3–2 mm, implicit 0,8: două
  // linii de duză). Rotorul: 3–12 palete, ca la elice: pas constant (β(r) = atan(P / 2πr), P = pasul · Ø, pasul 0,3–1,5),
  // secțiunea placă curbată, groasă de la 1,2 la 0,8, tipărit fără suport (fiecare secțiune cu punctul cel mai de jos pe masă).
  // Coarda: lățimea cerută (15–60 % din raza vârfului), de la 60 % la rădăcină la toată după primul sfert din paletă, apoi la fel
  // până la vârf (vârful drept, lângă carcasă); pe fiecare rază, paleta ocupă cel mult 85 % din pasul dintre palete. Butucul: Ø8,
  // sau un sfert din raza vârfului la ventilatoarele mari, înalt cât paletele (cel puțin 8), cu gaura din calibrare. Inelul, la
  // alegere (ca LEGO 50899): un tub gros de 1,2 în jurul paletelor, în același contur (exteriorul la Ø / 2 − jocul), cu paletele
  // intrate în el 0,4, înalt cât ele. Carcasa: tubul (peretele de 2), înaltă cât paletele + 4 (cel puțin 8), cu 2 sau 4 urechi jos,
  // groase și late cât o grindă, cu gaura de știft din calibrare (cu lamajul, jos și sus) pe grila axului: la k · 8 mm de ax, cu
  // cel mai mic k la care lamajul lasă 0,8 din peretele carcasei. Pe un ax LEGO trecut prin gaura din mijlocul unei grinzi prinse
  // cu știfturi de urechi, rotorul stă în mijlocul carcasei.
  const VENT = { butucMin: 4, butucRap: 0.25, butucH: 8, tRad: 1.2, tVarf: 0.8, radacina: 0.6, plin: 0.25, umplere: 0.85, statii: 28, perete: 2, inelGros: 1.2, inelIn: 0.4, inelH: 2, peste: 4, rest: 0.8, sageata: 0.02 };
  type VentDef = { piesa?: string; palete?: unknown; diametru?: unknown; joc?: unknown; pas?: unknown; latime?: unknown; sens?: string; gaura?: string; inel?: string; urechi?: unknown };
  /** Câte laturi are cercul de rază R: săgeata cel mult 0,02 mm, cel puțin 48, multiplu de 8 (urechile cad pe vârfuri). */
  const laturiCerc = (R: number) => Math.max(N_CERC, 8 * Math.ceil(Math.PI / Math.acos(1 - VENT.sageata / R) / 8));
  function ventilatorCote(d: VentDef) {
    const nr = (v: unknown, implicit: number) => (v !== null && v !== undefined && v !== "" && Number.isFinite(+(v as number)) ? +(v as number) : implicit);
    const z = Math.round(Math.min(12, Math.max(3, nr(d.palete, 7))));
    const D = Math.min(120, Math.max(24, nr(d.diametru, 40))), Ri = D / 2;
    const joc = Math.min(2, Math.max(0.3, nr(d.joc, 0.8))), Rt = Ri - joc;
    const pd = Math.min(1.5, Math.max(0.3, nr(d.pas, 0.8))), pasM = pd * D;
    const lat = Math.min(60, Math.max(15, nr(d.latime, 45))), urechi = +(d.urechi as number) === 4 ? 4 : 2;
    const rh = Math.max(VENT.butucMin, Math.round(VENT.butucRap * Rt * 10) / 10), cmax = lat / 100 * Rt;
    const beta = (r: number) => Math.atan(pasM / (2 * Math.PI * r));
    // secțiunile, de la 0,4 mm în butuc la vârful paletei (Rb): (s, h) după rotirea cu β în jurul mijlocului corzii, cu punctul de
    // jos pe masă; hb, cea mai înaltă
    const sectiuni = (Rb: number) => {
      const N = VENT.statii, r0 = rh - 0.4;
      let hb = 0;
      const statii = Array.from({ length: N + 1 }, (_, i) => {
        const r = r0 + (Rb - r0) * i / N, x = Math.max(0, (r - rh) / (Rb - rh)), b = beta(r);
        const g = VENT.radacina + (1 - VENT.radacina) * Math.min(1, x / VENT.plin), t = VENT.tRad - (VENT.tRad - VENT.tVarf) * x;
        const roteste = (cc: number) => sectiuneElice(cc, t, "placa").map(([u, v]): P2 => [(u - cc / 2) * Math.cos(b) - v * Math.sin(b), (u - cc / 2) * Math.sin(b) + v * Math.cos(b)]);
        const latime = (sec: P2[]) => Math.max(...sec.map(p => p[0])) - Math.min(...sec.map(p => p[0]));
        // coarda: cea cerută, dar secțiunea reală (cu grosimea și săgeata ei, rotită cu β) încape în 85 % din pasul dintre palete
        const U = VENT.umplere * 2 * Math.PI * r / z;
        let c = Math.max(t, cmax * g), sec = roteste(c);
        for (let k = 0; k < 40 && latime(sec) > U; k++) { c = Math.max(t, c * U / latime(sec) * 0.995); sec = roteste(c); }
        const zmin = Math.min(...sec.map(p => p[1]));
        hb = Math.max(hb, Math.max(...sec.map(p => p[1])) - zmin);
        return { r, sec: sec.map(([s, h]): P2 => [s, h - zmin]) };
      });
      return { statii, hb };
    };
    const inel = d.inel === "da", fara = sectiuni(Rt), cu = inel ? sectiuni(Rt - VENT.inelGros + VENT.inelIn) : fara;
    const zecime = (h: number) => Math.ceil(h * 10 - 1e-9) / 10;
    // carcasa, din paletele fără inel (aceeași, oricum ar fi rotorul): cât ele + 4, la milimetru în sus, cel puțin 8
    const Hc = Math.max(VENT.butucH, Math.ceil(fara.hb - 1e-9) + VENT.peste);
    const k = Math.ceil((Ri + VENT.rest + ef().lamajD / 2) / P.pas - 1e-9);
    return { z, D, Ri, joc, Rt, pd, P: pasM, lat, urechi, rh, inel, statii: cu.statii, Hh: Math.max(VENT.butucH, zecime(cu.hb)), Hinel: Math.max(VENT.inelH, zecime(cu.hb)), Hc, k,
      bRad: beta(rh), bVarf: beta(Rt), consola: 0.2 / Math.tan(beta(Rt)) };
  }
  function carcasaVentilator(q: ReturnType<typeof ventilatorCote>): Tri[] {
    // conturul de jos: tubul și urechile, unite (în sens trigonometric), cu golul tubului și găurile urechilor; în trei straturi
    // (lamajul, gaura, lamajul), ca grinzile. Deasupra urechilor, doar tubul, cu canalul lamajului tăiat în el (un știft intră și
    // de sus, iar gulerul lui are loc): lamajul trece de peretele de afară și lasă 0,8 mm spre interior
    const e = ef(), R2 = q.Ri + VENT.perete, n = laturiCerc(R2), w = P.grinda_lat / 2, g = P.grinda_groasa, h = P.lamaj_h, rl = e.lamajD / 2;
    const xh = P.pas * q.k, xc = Math.sqrt(R2 * R2 - w * w), a0 = Math.asin(w / R2), u = q.urechi;
    // unde taie cercul lamajului peretele de afară: (xi, ±yi), la unghiul ai față de ureche (doar dacă lamajul ajunge la tub;
    // altfel, ca la Ø41, cu gaura la 32 mm, tubul de deasupra rămâne întreg)
    const taie = xh - rl < R2 - 1e-6, xi = (R2 * R2 - rl * rl + xh * xh) / (2 * xh), yi = taie ? Math.sqrt(R2 * R2 - xi * xi) : 0, ai = Math.atan2(yi, xi);
    const rot = (f: number, [x, y]: P2): P2 => [x * Math.cos(f) - y * Math.sin(f), x * Math.sin(f) + y * Math.cos(f)];
    const arc = (de: number, pana: number): P2[] => {
      // vârfurile cercului de afară cu unghiul strict între cele două (în [0, 2π), crescător)
      const o: P2[] = [];
      for (let i = 0; i < n; i++) { const a = 2 * Math.PI * i / n; if (a > de + 1e-9 && a < pana - 1e-9) o.push([R2 * Math.cos(a), R2 * Math.sin(a)]); }
      return o;
    };
    const ext: P2[] = [], tub: P2[] = [], centre: P2[] = [];
    for (let j = 0; j < u; j++) {
      const f = 2 * Math.PI * j / u, c = rot(f, [xh, 0]), lam = cerc(c[0], c[1], rl);
      ext.push(rot(f, [xc, -w]), rot(f, [xh, -w]));
      for (let s = 1; s < 12; s++) { const a = -Math.PI / 2 + Math.PI * s / 12; ext.push(rot(f, [xh + w * Math.cos(a), w * Math.sin(a)])); }
      ext.push(rot(f, [xh, w]), rot(f, [xc, w]), ...arc(f + a0, f + 2 * Math.PI / u - a0));
      // canalul: vârfurile lamajului din tub, de jos în sus (unghiul față de centrul lui, descrescător, în jurul lui π)
      const rel = (i: number) => { const r = 2 * Math.PI * i / lam.length - f; return r - 2 * Math.PI * Math.floor(r / (2 * Math.PI)); };
      const inTub = lam.map((p, i) => [p, rel(i)] as const).filter(([p]) => Math.hypot(p[0], p[1]) < R2 - 1e-9).sort((x, y) => y[1] - x[1]);
      if (taie) tub.push(rot(f, [xi, -yi]), ...inTub.map(([p]) => p as P2), rot(f, [xi, yi]));
      tub.push(...arc(f + (taie ? ai : -1e-6), f + 2 * Math.PI / u - (taie ? ai : 1e-6)));
      centre.push(c);
    }
    const gol = cerc(0, 0, q.Ri, n), gauri = (diam: number) => [gol, ...centre.map(([x, y]) => cerc(x, y, diam / 2))];
    return [...prismaGauri(ext, gauri(e.lamajD), 0, h), ...prismaGauri(ext, gauri(e.gauraD), h - 0.01, g - h + 0.01),
      ...prismaGauri(ext, gauri(e.lamajD), g - h, g), ...prismaGauri(tub, [gol], g - 0.01, q.Hc)];
  }
  function ventilator(d: VentDef): Corp {
    const avert: string[] = [], q = ventilatorCote(d);
    const dat = (v: unknown) => v !== null && v !== undefined && v !== "" && Number.isFinite(+(v as number));
    if (dat(d.palete) && q.z !== +(d.palete as number)) avert.push(tr`Un ventilator are între 3 și 12 palete: l-am făcut cu ${q.z}.`);
    if (dat(d.diametru) && q.D !== +(d.diametru as number)) avert.push(tr`Carcasa unui ventilator are între 24 și 120 mm în interior: am făcut-o de ${q.D} mm.`);
    if (d.piesa === "carcasa") {
      // prinderile carcasei: găurile de știft ale urechilor, pe grila axului, prin grosimea lor
      const xh = P.pas * q.k, urechi = Array.from({ length: q.urechi }, (_, j) => 2 * Math.PI * j / q.urechi);
      return { tri: carcasaVentilator(q), avert, prinderi: urechi.flatMap(f => prinGaura("gauraStift", [xh * Math.cos(f), xh * Math.sin(f), P.grinda_groasa], [xh * Math.cos(f), xh * Math.sin(f), 0], undefined, P.lamaj_h)) };
    }
    const tri = paleteElice(q.statii, q.z, d.sens === "stanga" ? -1 : 1, true), butuc = butucElice(q.rh, q.Hh, d.gaura);
    tri.push(...butuc.tri);
    if (q.inel) { const n = laturiCerc(q.Rt); tri.push(...prismaGauri(cerc(0, 0, q.Rt, n), [cerc(0, 0, q.Rt - VENT.inelGros, n)], 0, q.Hinel)); }
    return { tri, avert, prinderi: butuc.prinderi };
  }

  // ---------------------------------------------------------------------------------------------- decorațiunile de Crăciun (ADR 0285)
  // Piese plate, ridicate dintr-un contur și tipărite culcate, fără suport: fulgul, steaua și brăduțul (felia 3.Cl-1).
  // - conturul se face din forme simple (poligoane, tije cu capăt rotund, discuri), unite cu Cavalier, cu golurile rămase
  //   între ele (`unesteForme`): piesa e un singur corp, cu pereții drepți;
  // - nervura cea mai subțire are 1,2 mm (trei treceri ale duzei de 0,4);
  // - agățătoarea: inelul (golul de 3 mm, peretele de 1,6), cu centrul la 1,9 mm peste vârful piesei (vârful intră 0,4 mm
  //   în perete); pe un vârf ascuțit, inelul stă pe o tijă de 2,4 mm, coborâtă până unde forma e mai lată decât ea. Sau
  //   gaura de 2,5 mm, pe axa vârfului, cât mai sus, cu cel puțin 1,6 mm de material în jur; dacă nu încape aproape de vârf
  //   (în colțul stelei, în ultimul etaj al bradului), piesa primește inelul, cu un mesaj.
  const CRACIUN = { nervura: 1.2, inelGol: 1.5, inelAfara: 3.1, inelSus: 1.9, tija: 2.4, gaura: 1.25, gauraPerete: 1.6, intrePlaci: 3 };
  /** Conturul Cavalier în sens trigonometric (întors, arcele își schimbă semnul și trec pe vârful dinainte). */
  const spreStanga = (v: readonly (readonly number[])[]): Vf[] => (glob.Cavalier.plineClosed(v).area() < 0
    ? v.slice().reverse().map((q, k: number, a): Vf => [q[0]!, q[1]!, -(a[(k + 1) % a.length]![2]!)]) : v.map((q): Vf => [q[0]!, q[1]!, q[2]!]));
  const bucatiBune = (l: readonly { readonly pline: CavalierPline }[]): Vf[][] => l.filter(x => Math.abs(x.pline.area()) > 1e-4).map(x => spreStanga(dinPl(x.pline)));
  /** Forma `v` fără forma `w`: bucățile rămase. */
  const scadeForma = (v: readonly Vf[], w: readonly Vf[]): Vf[][] => { const r = glob.Cavalier.plineClosed(v).boolean(glob.Cavalier.plineClosed(w), "not"); return r.resultInfo === "disjoint" ? [spreStanga(v)] : bucatiBune(r.posPlines); };
  type Unita = { ext: Vf[]; gauri: Vf[][] };
  /**
   * Unirea unor forme închise (contururi Cavalier, cu arce), cu golurile rămase între ele: fiecare bucată are marginea ei
   * și golurile din ea. Formele se taie sau se cuprind (nu-și suprapun laturile); o formă pusă cu totul într-un gol
   * rămâne o bucată a ei.
   */
  function unesteForme(forme: readonly (readonly Vf[])[]): Unita[] {
    const CV = glob.Cavalier, pl = (v: readonly Vf[]) => CV.plineClosed(v), insule: Vf[][] = [];
    let bucati: Vf[][] = [], goluri: Vf[][] = [];
    for (const f0 of forme) {
      const f = spreStanga(f0);
      if (goluri.some(g => pl(g).boolean(pl(f), "not").resultInfo === "pline2InsidePline1")) { insule.push(f); continue; }
      // golurile de până acum pierd ce acoperă forma nouă
      goluri = goluri.flatMap(g => scadeForma(g, f));
      let cur = f, noi: Vf[][] = [];
      const rest: Vf[][] = [];
      for (const b of bucati) {
        const r = pl(b).boolean(pl(cur), "or"), poz = r.resultInfo === "disjoint" ? [] : bucatiBune(r.posPlines);
        if (poz.length !== 1) { rest.push(b); continue; }
        // golurile închise mai devreme, la forma asta, pierd ce acoperă bucata; apoi vin cele închise între ea și formă
        noi = [...noi.flatMap(g => scadeForma(g, b)), ...bucatiBune(r.negPlines)];
        cur = poz[0]!;
      }
      bucati = [...rest, cur]; goluri = [...goluri, ...noi];
    }
    const poli = (v: readonly Vf[]) => aplatizeaza(v);
    return [...bucati.map(ext => { const e = poli(ext); return { ext, gauri: goluri.filter(g => inPoli(e, [g[0]![0], g[0]![1]])) }; }), ...insule.map(ext => ({ ext, gauri: [] }))];
  }
  /** Prisma bucăților unite, cu golurile lor și cu găurile date în plus (fiecare, în bucata care o cuprinde). */
  function prismaUnite(unite: readonly Unita[], gauriInPlus: readonly Poli[], z0: number, z1: number): Tri[] {
    // arcele, cu săgeata de cel mult 0,02 mm (`laturiFine`): un disc mare nu iese din 48 de laturi
    return unite.flatMap(u => { const ext = curataPoli(trig(aplatizeaza(u.ext, laturiFine))); return prismaGauri(ext, [...u.gauri.map(g => curataPoli(aplatizeaza(g, laturiFine))), ...gauriInPlus.filter(g => inPoli(ext, g[0]!))], z0, z1); });
  }
  /** Tija cu capăt rotund: pleacă drept din A, pe direcția u, lungă de L (până la vârful capătului), lată de w. */
  function tijaRotunda(A: Pt, u: number, L: number, w: number): Vf[] {
    const dx = Math.cos(u), dy = Math.sin(u), nx = -dy * w / 2, ny = dx * w / 2, bx = A[0] + dx * (L - w / 2), by = A[1] + dy * (L - w / 2);
    return [[A[0] - nx, A[1] - ny, 0], [bx - nx, by - ny, 1], [bx + nx, by + ny, 0], [A[0] + nx, A[1] + ny, 0]];
  }
  const dreptForma = (x0: number, y0: number, x1: number, y1: number): Vf[] => [[x0, y0, 0], [x1, y0, 0], [x1, y1, 0], [x0, y1, 0]];
  /** Cât e de la un punct la marginea unui poligon (la cea mai apropiată latură). */
  const distMargine = (poli: readonly Pt[], q: Pt): number => Math.min(...poli.map((a, i: number) => {
    const b = poli[(i + 1) % poli.length]!, dx = b[0] - a[0], dy = b[1] - a[1], t = Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(q[0] - a[0] - t * dx, q[1] - a[1] - t * dy);
  }));
  /** Inelul de agățat de peste vârful (0, varf): discul lui (de unit cu piesa) și golul. */
  const inelAgatat = (varf: number): { disc: Vf[]; gol: Poli } => { const c = varf + CRACIUN.inelSus; return { disc: [[CRACIUN.inelAfara, c, 1], [-CRACIUN.inelAfara, c, 1]], gol: cerc(0, c, CRACIUN.inelGol) }; };
  /** Tija inelului pe un vârf ascuțit (pe x = 0): lată de 2,4, de la 0,2 peste vârf până unde forma e mai lată decât ea. */
  function tijaInel(poli: readonly P2[], varf: number): Vf[] {
    const t = CRACIUN.tija / 2;
    let k = 1;
    while (!inPoli(poli, [t + 0.2, varf - k / 10]) && k < 2000) k++;
    return dreptForma(-t, varf - k / 10, t, varf + 0.2);
  }
  /** Gaura de agățat: pe axa vârfului (x = 0), cât mai sus, cu peretele întreg în jur; `null` dacă nu încape până la `pana`. */
  function gauraAgatat(poli: readonly P2[], varf: number, pana: number): Poli | null {
    for (let k = 1; varf - k / 10 > pana; k++) {
      const c: P2 = [0, varf - k / 10];
      if (inPoli(poli, c) && distMargine(poli, c) >= CRACIUN.gaura + CRACIUN.gauraPerete) return cerc(0, c[1], CRACIUN.gaura);
    }
    return null;
  }
  /** Un câmp numeric al unei decorațiuni: în margini, la zecimi (sau întreg), cu mesajul lui când a fost adus înapoi. */
  function campMarginit(avert: string[], v: unknown, a: number, b: number, implicit: number, ce: (x: string) => string, intreg = false): number {
    const n = numarCerut(v), x = Math.min(b, Math.max(a, Number.isFinite(n) ? (intreg ? Math.round(n) : zecime(n)) : implicit));
    if (Number.isFinite(n) && (n < a - 1e-9 || n > b + 1e-9)) avert.push(ce(String(x).replace(".", Limba.zecimal)));
    return x;
  }

  // Fulgul de zăpadă: șase brațe (unul în sus, spre inel), un miez (hexagon, stea sau hexagon gol) și, pe fiecare braț,
  // perechi de ramuri. `diam` e de la vârf la vârf; ramurile nu trec de cercul lui.
  // - miezul ține pe braț cât `m`: hexagonul, 18 % din rază (cel puțin două linii); steaua (colțurile ei, între brațe),
  //   26 % (cel puțin 2,8 linii); hexagonul gol, 24 % (cel puțin 3,2 linii), cu peretele cât linia;
  // - perechile stau pe brațul liber (de la miez la vârf), de la `inceput` % până la 86 % din el; prima e lungă de
  //   `lungime` % din rază, iar următoarele, tot mai scurte (ultima, 55 %); una care ar ieși sub o linie și jumătate nu
  //   se mai face;
  // - linia: cel puțin 1,2 mm și cel mult o șesime din rază (5 mm).
  type FulgDef = { diam?: unknown; grosime?: unknown; linie?: unknown; ramuri?: unknown; unghi?: unknown; inceput?: unknown; lungime?: unknown; miez?: unknown; agatatoare?: unknown };
  function fulgCote(d: FulgDef) {
    const avert: string[] = [], zec = (x: number) => String(x).replace(".", Limba.zecimal);
    const diam = campMarginit(avert, d.diam, 30, 150, 70, x => tr`Diametrul unui fulg e între 30 și 150 mm: l-am făcut de ${x} mm.`), R = diam / 2;
    const grosime = campMarginit(avert, d.grosime, 1.2, 6, 2.4, x => tr`Grosimea unui fulg e între 1,2 și 6 mm: l-am făcut de ${x} mm.`);
    const linieMax = Math.min(5, Math.max(CRACIUN.nervura, zecime(R / 6)));
    const linie = campMarginit(avert, d.linie, CRACIUN.nervura, linieMax, 2, x => tr`La diametrul ăsta, linia unui fulg are între 1,2 și ${zec(linieMax)} mm: am făcut-o de ${x} mm.`);
    const ramuri = campMarginit(avert, d.ramuri, 0, 4, 2, x => tr`Un braț de fulg are cel mult 4 perechi de ramuri: am făcut ${x}.`, true);
    const unghi = campMarginit(avert, d.unghi, 30, 75, 60, x => tr`Ramurile unui fulg stau la 30°–75° de braț: le-am pus la ${x}°.`, true);
    const inceput = campMarginit(avert, d.inceput, 20, 70, 40, x => tr`Prima pereche de ramuri stă între 20 % și 70 % din braț: am pus-o la ${x} %.`, true);
    const lungime = campMarginit(avert, d.lungime, 10, 45, 28, x => tr`Ramurile unui fulg au între 10 % și 45 % din rază: le-am făcut de ${x} %.`, true);
    const miez = d.miez === "stea" || d.miez === "gol" ? d.miez : "hexagon", agatatoare = d.agatatoare === "fara" ? "fara" : "inel", w = linie;
    const m = miez === "hexagon" ? Math.max(0.18 * R, 2 * w) : miez === "stea" ? Math.max(0.26 * R, 2.8 * w) : Math.max(0.24 * R, 3.2 * w);
    const a = unghi * Math.PI / 180, perechi: { p: number; L: number }[] = [];
    for (let j = 0; j < ramuri; j++) {
      const f = ramuri === 1 ? inceput / 100 : inceput / 100 + (0.86 - inceput / 100) * j / (ramuri - 1), p = m + (R - m) * f;
      // ramura nu trece de cercul fulgului: centrul capătului ei rotund rămâne la cel mult R − w / 2 de mijloc
      const L = Math.min(lungime / 100 * R * (ramuri === 1 ? 1 : 1 - 0.45 * j / (ramuri - 1)), w / 2 - p * Math.cos(a) + Math.sqrt(p * p * Math.cos(a) ** 2 + (R - w / 2) ** 2 - p * p));
      if (L >= 1.5 * w) perechi.push({ p, L });
    }
    return { diam, grosime, linie, linieMax, ramuri, unghi, inceput, lungime, miez, agatatoare, R, m, a, perechi, avert };
  }
  function fulg(d: FulgDef): Corp {
    const q = fulgCote(d), { R, m } = q, w = q.linie, forme: Vf[][] = [], gauri: Poli[] = [];
    const hex = (r: number): Vf[] => Array.from({ length: 6 }, (_, k): Vf => [r * Math.cos(Math.PI / 6 + k * Math.PI / 3), r * Math.sin(Math.PI / 6 + k * Math.PI / 3), 0]);
    if (q.miez === "stea") forme.push(Array.from({ length: 12 }, (_, k): Vf => { const r = k % 2 ? 0.55 * m : m, u = k * Math.PI / 6; return [r * Math.cos(u), r * Math.sin(u), 0]; }));
    else forme.push(hex(m));
    if (q.miez === "gol") gauri.push(hex(m - w / Math.cos(Math.PI / 6)).map(([x, y]): P2 => [x, y]));
    // brațele pleacă din miez (la cel gol, din peretele lui); ramurile, de pe axa brațului
    const r0 = q.miez === "gol" ? m - 0.6 * w : 0.3 * w, ramuri: Vf[][] = [];
    for (let k = 0; k < 6; k++) {
      const u = Math.PI / 2 + k * Math.PI / 3, dx = Math.cos(u), dy = Math.sin(u);
      forme.push(tijaRotunda([r0 * dx, r0 * dy], u, R - r0, w));
      for (const { p, L } of q.perechi) for (const s of [1, -1]) ramuri.push(tijaRotunda([p * dx, p * dy], u + s * q.a, L, w));
    }
    forme.push(...ramuri);
    if (q.agatatoare === "inel") { const c = inelAgatat(R); forme.push(c.disc); gauri.push(c.gol); }
    return { tri: prismaUnite(unesteForme(forme), gauri, 0, q.grosime), avert: q.avert, prinderi: [] };
  }

  // Steaua: 5–8 colțuri (`varfuri`: `colturi` e deja al cadrului, în atelier) pe cercul `diam` (unul în sus), cu vârfurile
  // dinăuntru la `interior` % din rază (30: ascuțită;
  // 75: plină). Plină, doar conturul (cu linia cerută; golul e steaua retrasă cu ea) sau în relief: muchii de la mijloc
  // (înălțimea `grosime`) la colțuri și văi la vârfurile dinăuntru, cu marginea înaltă de 1,2 mm (cel mult jumătate din
  // înălțime); în relief, inelul e o bucată plată de cel mult 2,4 mm, prinsă prin tijă, iar gaura nu se face.
  type SteaDef = { varfuri?: unknown; diam?: unknown; interior?: unknown; grosime?: unknown; fel?: unknown; linie?: unknown; agatatoare?: unknown };
  function steaCote(d: SteaDef) {
    const avert: string[] = [], mute: string[] = [];
    const colturi = campMarginit(avert, d.varfuri, 5, 8, 5, x => tr`O stea are între 5 și 8 colțuri: am făcut-o cu ${x}.`, true);
    const diam = campMarginit(avert, d.diam, 30, 150, 70, x => tr`Diametrul unei stele e între 30 și 150 mm: am făcut-o de ${x} mm.`), R = diam / 2;
    const interior = campMarginit(avert, d.interior, 30, 75, 40, x => tr`Vârfurile dinăuntru ale unei stele stau între 30 % și 75 % din rază: le-am pus la ${x} %.`, true);
    const grosime = campMarginit(avert, d.grosime, 1.2, 12, 3, x => tr`Grosimea unei stele e între 1,2 și 12 mm: am făcut-o de ${x} mm.`);
    const fel = d.fel === "contur" || d.fel === "relief" ? d.fel : "plina";
    // linia e a conturului: la celelalte feluri nu se spune nimic despre ea
    const linie = campMarginit(fel === "contur" ? avert : mute, d.linie, CRACIUN.nervura, 6, 2.4, x => tr`Conturul unei stele are între 1,2 și 6 mm: l-am făcut de ${x} mm.`);
    const agatatoare = d.agatatoare === "fara" ? "fara" : d.agatatoare === "gaura" && fel === "plina" ? "gaura" : "inel";
    const ri = interior / 100 * R, varf = Math.round(2 * Math.atan(ri * Math.sin(Math.PI / colturi) / (R - ri * Math.cos(Math.PI / colturi))) * 180 / Math.PI);
    if (varf < 25) avert.push(tr`Colțurile stelei sunt foarte ascuțite (${varf}°): la tipărit ies rotunjite și se rup ușor.`);
    return { varfuri: colturi, diam, interior, grosime, fel, linie, agatatoare, R, ri, varf, avert };
  }
  function stea(d: SteaDef): Corp {
    const q = steaCote(d), { R, ri } = q, n = q.varfuri, avert = q.avert.slice();
    const poli: Poli = Array.from({ length: 2 * n }, (_, k): P2 => { const r = k % 2 ? ri : R, u = Math.PI / 2 + Math.PI * k / n; return [r * Math.cos(u), r * Math.sin(u)]; });
    if (q.fel === "relief") {
      const H = q.grosime, prag = Math.min(CRACIUN.nervura, H / 2), tri: Tri[] = [];
      // fața de jos, marginea dreaptă până la prag, apoi fețele înclinate, de la margine la vârful din mijloc
      poli.forEach((a, i) => {
        const b = poli[(i + 1) % poli.length]!;
        tri.push([[0, 0, 0], [b[0], b[1], 0], [a[0], a[1], 0]], [[a[0], a[1], 0], [b[0], b[1], 0], [b[0], b[1], prag]], [[a[0], a[1], 0], [b[0], b[1], prag], [a[0], a[1], prag]], [[0, 0, H], [a[0], a[1], prag], [b[0], b[1], prag]]);
      });
      if (q.agatatoare === "inel") { const c = inelAgatat(R); tri.push(...prismaUnite(unesteForme([tijaInel(poli, R), c.disc]), [c.gol], 0, Math.min(H, CRACIUN.tija))); }
      return { tri, avert, prinderi: [] };
    }
    const contur = poli.map(([x, y]): Vf => [x, y, 0]), forme: Vf[][] = [contur], gauri: Poli[] = [];
    if (q.fel === "contur") {
      // un gol sub 3 mm² s-ar astupa la tipărit: nu se mai face
      const gol = glob.Cavalier.plineClosed(contur).parallelOffset(q.linie).filter(p => p.area() > 3);
      if (!gol.length) avert.push(tr`Conturul de ${String(q.linie).replace(".", Limba.zecimal)} mm e prea gros pentru steaua asta: am făcut-o plină.`);
      for (const p of gol) gauri.push(curataPoli(aplatizeaza(dinPl(p))));
    }
    // gaura stă în colțul de sus, nu mai jos de o treime din rază (mai aproape de mijloc, steaua n-ar mai atârna dreaptă)
    let ag = q.agatatoare;
    if (ag === "gaura") { const g = gauraAgatat(poli, R, R / 3); if (g) gauri.push(g); else { ag = "inel"; avert.push(tr("Steaua e prea îngustă pentru gaura de agățat: i-am pus un inel.")); } }
    if (ag === "inel") { const c = inelAgatat(R); forme.push(tijaInel(poli, R), c.disc); gauri.push(c.gol); }
    return { tri: prismaUnite(unesteForme(forme), gauri, 0, q.grosime), avert, prinderi: [] };
  }

  // Brăduțul: trunchiul și 2–6 etaje, fiecare mai îngust (cu baza de la x = 0, pe y; vârful sus).
  // - trunchiul: 12 % din înălțime (cel puțin 4 mm), lat de 12 % din lățime (cel puțin 4 mm);
  // - etajul i (de jos): baza lată cât (n − 0,75 · i) / n din lățime; sus se strânge la 45 % din baza etajului următor
  //   (ultimul, la vârf);
  // - de agățat (cu inel, cu gaură sau fără) ori **în picioare**: două plăci alăturate pe pat, cu talpa lată (60 % din
  //   lățime), îmbinate în cruce. Prima are fanta de jos până peste mijloc, a doua, de sus până sub mijloc; fanta e cât
  //   grosimea plus jocul de două ori (jocul locașelor din calibrare + 0,1 mm). A doua placă e tăiată drept sus, unde
  //   lângă fantă n-ar mai rămâne o nervură de 1,2 mm.
  type BradDef = { inaltime?: unknown; etaje?: unknown; latime?: unknown; grosime?: unknown; fel?: unknown; agatatoare?: unknown };
  function bradCote(d: BradDef) {
    const avert: string[] = [];
    const H = campMarginit(avert, d.inaltime, 30, 150, 80, x => tr`Înălțimea unui brad e între 30 și 150 mm: l-am făcut de ${x} mm.`);
    const n = campMarginit(avert, d.etaje, 2, 6, 3, x => tr`Un brad are între 2 și 6 etaje: l-am făcut cu ${x}.`, true);
    const latime = campMarginit(avert, d.latime, 40, 90, 65, x => tr`Lățimea unui brad e între 40 % și 90 % din înălțime: l-am făcut de ${x} %.`, true);
    const grosime = campMarginit(avert, d.grosime, 1.2, 6, 3, x => tr`Grosimea unui brad e între 1,2 și 6 mm: l-am făcut de ${x} mm.`);
    const fel = d.fel === "picioare" ? "picioare" : "agatat", agatatoare = fel === "picioare" || d.agatatoare === "fara" ? "fara" : d.agatatoare === "gaura" ? "gaura" : "inel";
    const W = latime / 100 * H, ht = Math.max(0.12 * H, 4), e = (H - ht) / n, tw = fel === "picioare" ? 0.3 * W : Math.max(0.06 * W, 2);
    const b = Array.from({ length: n }, (_, i) => W / 2 * (n - 0.75 * i) / n), a = b.map((_, i) => (i < n - 1 ? 0.45 * b[i + 1]! : 0));
    const fanta = grosime + 2 * (ef().joc + 0.1), mij = H / 2, langa = fanta / 2 + CRACIUN.nervura;
    let taiat = H;
    if (fel === "picioare") {
      for (let i = 0; i < n; i++) {
        const y = ht + i * e;
        if (y + e > mij && a[i]! < langa) {
          taiat = b[i]! > langa ? y + e * (b[i]! - langa) / (b[i]! - a[i]!) : y - 0.2;
          if (i < n - 1) avert.push(tr("La mărimea asta, a doua placă a bradului nu ajunge până în vârf: fă-l mai mare, mai lat sau mai subțire."));
          break;
        }
      }
      // prima placă: de o parte și de alta a fantei de jos rămâne lemn doar cât e bradul de lat acolo (talpa și gâturile)
      const ingust = Math.min(tw, ...a.filter((_, i) => ht + (i + 1) * e < mij + 0.2));
      if (ingust < langa) avert.push(tr("Plăcile sunt prea groase pentru un brad atât de mic: lângă fantă rămâne prea puțin material."));
    }
    return { inaltime: H, etaje: n, latime, grosime, fel, agatatoare, lat: zecime(W), H, W, ht, e, tw, b, a, fanta, mij, taiat, avert };
  }
  function brad(d: BradDef): Corp {
    const q = bradCote(d), { H, W, ht, e, tw, b, a } = q, n = q.etaje, h = q.grosime, avert = q.avert.slice();
    const dreapta: P2[] = [[tw, 0], [tw, ht]];
    for (let i = 0; i < n; i++) { dreapta.push([b[i]!, ht + i * e]); if (i < n - 1) dreapta.push([a[i]!, ht + (i + 1) * e]); }
    const poli: Poli = [...dreapta, [0, H], ...dreapta.slice().reverse().map(([x, y]): P2 => [-x, y])], contur = poli.map(([x, y]): Vf => [x, y, 0]);
    if (q.fel === "picioare") {
      const s = q.fanta / 2, A = scadeForma(contur, dreptForma(-s, -1, s, q.mij + 0.2));
      let B = scadeForma(contur, dreptForma(-W, q.taiat, W, H + 1));
      if (q.taiat > q.mij - 0.2) B = B.flatMap(v => scadeForma(v, dreptForma(-s, q.mij - 0.2, s, H + 1)));
      const placa = (l: readonly Vf[][], x: number): Tri[] => l.flatMap(v => prismaGauri(curataPoli(trig(aplatizeaza(v))).map(([px, py]): P2 => [px + x, py]), [], 0, h));
      return { tri: [...placa(A, 0), ...placa(B, W + CRACIUN.intrePlaci)], avert, prinderi: [] };
    }
    const forme: Vf[][] = [contur], gauri: Poli[] = [];
    let ag = q.agatatoare;
    // gaura stă în ultimul etaj (mai jos, bradul ar atârna strâmb)
    if (ag === "gaura") { const g = gauraAgatat(poli, H, ht + (n - 1) * e); if (g) gauri.push(g); else { ag = "inel"; avert.push(tr("Vârful bradului e prea îngust pentru gaura de agățat: i-am pus un inel.")); } }
    if (ag === "inel") { const c = inelAgatat(H); forme.push(tijaInel(poli, H), c.disc); gauri.push(c.gol); }
    return { tri: prismaUnite(unesteForme(forme), gauri, 0, h), avert, prinderi: [] };
  }

  // Globul (ADR 0285, felia 3.Cl-2): un disc cu căpăcel (lat de 26 % din diametru, cel puțin 8 mm; înalt de 9 %, cel
  // puțin 4) și cu inelul pe el. Modelul stă în cercul dinăuntru, la o margine de 8 % din diametru (cel puțin 2,4 mm):
  // - dungi: n dungi și n + 1 goluri la fel de înalte, pe tot cercul dinăuntru;
  // - zigzag: n benzi în zigzag pe 72 % din rază, în sus și în jos, cu dinții la pasul de jumătate de rază;
  // - stele: una în mijloc (34 % din rază) și n pe un cerc (la 66 %), cu un colț spre afară.
  // Decupat, modelul e gol în disc; în relief, stă peste disc, mai înalt cu `relief` (de la înălțimea discului în sus
  // se poate tipări cu alt filament). „Din două discuri”: două discuri alăturate, îmbinate în cruce ca plăcile bradului
  // (primul are căpăcelul, inelul și fanta de jos; al doilea, fanta de sus), fără model.
  type GlobDef = { diam?: unknown; grosime?: unknown; fel?: unknown; model?: unknown; desen?: unknown; relief?: unknown; cate?: unknown; agatatoare?: unknown };
  const GLOB_CATE: Readonly<Record<string, readonly [number, number, number]>> = { dungi: [1, 5, 3], zigzag: [1, 3, 2], stele: [3, 8, 5] };
  function globCote(d: GlobDef) {
    const avert: string[] = [], mute: string[] = [];
    const diam = campMarginit(avert, d.diam, 30, 120, 60, x => tr`Diametrul unui glob e între 30 și 120 mm: l-am făcut de ${x} mm.`);
    const grosime = campMarginit(avert, d.grosime, 1.2, 6, 3, x => tr`Grosimea unui glob e între 1,2 și 6 mm: l-am făcut de ${x} mm.`);
    const fel = d.fel === "discuri" ? "discuri" : "plat";
    const model = fel === "discuri" ? "fara" : d.model === "zigzag" || d.model === "stele" || d.model === "fara" ? d.model : "dungi";
    const desen = d.desen === "relief" ? "relief" : "decupat", inRelief = desen === "relief" && model !== "fara";
    // relieful e al globului în relief: la celelalte nu se spune nimic despre el
    const relief = campMarginit(inRelief ? avert : mute, d.relief, 0.4, 3, 0.8, x => tr`Relieful unui glob are între 0,4 și 3 mm: l-am făcut de ${x} mm.`);
    const [c0, c1, ci] = GLOB_CATE[model] ?? [0, 0, 0];
    const cate = model === "fara" ? 0 : campMarginit(avert, d.cate, c0, c1, ci, x => (model === "stele" ? tr`În jurul stelei din mijloc stau între 3 și 8 stele: am făcut ${x}.`
      : model === "zigzag" ? tr`Un glob are între 1 și 3 zigzaguri: am făcut ${x}.` : tr`Un glob are între 1 și 5 dungi: am făcut ${x}.`), true);
    const agatatoare = d.agatatoare === "fara" ? "fara" : "inel";
    const R = diam / 2, capL = Math.max(8, 0.26 * diam), capH = Math.max(4, 0.09 * diam), margine = Math.max(2.4, 0.08 * diam);
    return { diam, grosime, fel, model, desen, relief, cate, agatatoare, R, capL, capH, margine, Ri: R - margine, inRelief, fanta: grosime + 2 * (ef().joc + 0.1), avert };
  }
  /** Formele modelului unui glob, în cercul dinăuntru. */
  function modelGlob(q: ReturnType<typeof globCote>): Vf[][] {
    const { Ri } = q, n = q.cate, out: Vf[][] = [];
    if (q.model === "dungi") {
      const s = 2 * Ri / (2 * n + 1);
      for (let i = 0; i < n; i++) {
        // dunga: între două coarde, cu capetele pe cercul dinăuntru
        const y0 = -Ri + (2 * i + 1) * s, y1 = y0 + s, x0 = Math.sqrt(Ri * Ri - y0 * y0), x1 = Math.sqrt(Ri * Ri - y1 * y1), b = Math.tan((Math.atan2(y1, x1) - Math.atan2(y0, x0)) / 4);
        out.push([[-x0, y0, 0], [x0, y0, b], [x1, y1, 0], [-x1, y1, b]]);
      }
    } else if (q.model === "zigzag") {
      const zona = 0.72 * Ri, pas = 2 * zona / n, A = 0.22 * pas, s = 0.28 * pas, p = Ri / 2, CV = glob.Cavalier;
      for (let k = 0; k < n; k++) {
        // banda: unda (vârfurile la fiecare jumătate de pas, jos la cele pare, sus la cele impare), groasă de s pe
        // verticală, tăiată la cercul dinăuntru
        const yc = -zona + (k + 0.5) * pas, sus: Vf[] = [], jos: Vf[] = [];
        for (let j = -6; j <= 6; j++) { const x = j * p / 2, y = yc + A * (j % 2 ? 1 : -1); jos.push([x, y - s / 2, 0]); sus.push([x, y + s / 2, 0]); }
        out.push(...bucatiBune(CV.plineClosed([...jos, ...sus.reverse()]).boolean(CV.plineClosed([[Ri, 0, 1], [-Ri, 0, 1]]), "and").posPlines));
      }
    } else if (q.model === "stele") {
      const stea5 = (cx: number, cy: number, r: number, u: number): Vf[] => Array.from({ length: 10 }, (_, k): Vf => { const rr = k % 2 ? 0.42 * r : r, a = u + Math.PI * k / 5; return [cx + rr * Math.cos(a), cy + rr * Math.sin(a), 0]; });
      const rk = 0.2 * Ri; // până la 8 stele pe cercul de 0,66 · Ri rămân cel puțin 0,1 · Ri între ele
      out.push(stea5(0, 0, 0.34 * Ri, Math.PI / 2));
      for (let j = 0; j < n; j++) { const u = Math.PI / 2 + 2 * Math.PI * j / n; out.push(stea5(0.66 * Ri * Math.cos(u), 0.66 * Ri * Math.sin(u), rk, u)); }
    }
    return out;
  }
  function globCraciun(d: GlobDef): Corp {
    const q = globCote(d), { R, capL, capH } = q, h = q.grosime;
    // discul, căpăcelul (intrat 0,6 mm sub locul unde marginea lui taie discul) și inelul de pe căpăcel
    const disc: Vf[] = [[R, 0, 1], [-R, 0, 1]], forme: Vf[][] = [disc, dreptForma(-capL / 2, Math.sqrt(R * R - capL * capL / 4) - 0.6, capL / 2, R + capH)], gauri: Poli[] = [];
    if (q.agatatoare === "inel") { const c = inelAgatat(R + capH); forme.push(c.disc); gauri.push(c.gol); }
    const baza = unesteForme(forme);
    if (q.fel === "discuri") {
      // primul disc (cu căpăcelul): fanta de jos până la 0,2 peste mijloc; al doilea, alături: fanta de sus până la 0,2 sub el
      const s = q.fanta / 2, A = baza.flatMap(u => scadeForma(u.ext, dreptForma(-s, -R - 1, s, 0.2))), B = scadeForma(disc, dreptForma(-s, -0.2, s, R + 1));
      const alaturi = q.diam + CRACIUN.intrePlaci;
      return { tri: [...prismaUnite(A.map(ext => ({ ext, gauri: [] })), gauri, 0, h), ...B.flatMap(v => prismaGauri(curataPoli(trig(aplatizeaza(v, laturiFine))).map(([x, y]): P2 => [x + alaturi, y]), [], 0, h))], avert: q.avert, prinderi: [] };
    }
    const model = modelGlob(q).map(m => curataPoli(trig(aplatizeaza(m, laturiFine))));
    // decupat: modelul e gol în disc; în relief: discul întreg, cu modelul peste el (intrat 0,01 mm în disc)
    if (!q.inRelief) return { tri: prismaUnite(baza, [...gauri, ...model], 0, h), avert: q.avert, prinderi: [] };
    return { tri: [...prismaUnite(baza, gauri, 0, h), ...model.flatMap(m => prismaGauri(m, [], h - 0.01, h + q.relief))], avert: q.avert, prinderi: [] };
  }

  // Ornamentul cu nume (ADR 0285): o formă plată (etichetă, glob, inimă sau stea) cu un nume scris cu un font propriu,
  // dintr-o singură linie. Un semn e din trăsături (șiruri de puncte [x, y, bulge], cu arce ca la Cavalier), în unități:
  // majuscula are 6, linia de bază e la 0. O trăsătură care se termină unde a început e închisă; una dintr-un singur
  // punct e un punct. Trăsăturile unui semn nu se ating pe ele însele: întâlnirile sunt între trăsături diferite.
  type Semn = readonly [number, readonly (readonly (readonly number[])[])[]];
  const SQ = Math.tan(Math.PI / 8), SC = Math.tan(37.5 * Math.PI / 180), SS = Math.sqrt(3), SD = Math.tan(55 * Math.PI / 180);
  const S_A = [[[0, 0], [2, 6], [4, 0]], [[0.667, 2], [3.333, 2]]], S_O = [[0, 2], [0, 4, -1], [4, 4], [4, 2, -1], [0, 2]], S_S = [[2.799, 5.25, SS], [1.5, 3, -SS], [0.201, 0.75]];
  const S_T = [[[0, 6], [4, 6]], [[2, 6], [2, 0]]], S_P = [[[0, 0], [0, 6]], [[0, 6], [2.5, 6, -1], [2.5, 3], [0, 3]]];
  const SCRIS: Readonly<Record<string, Semn>> = {
    A: [4, S_A],
    B: [4, [[[0, 3], [0, 6], [2.5, 6, -1], [2.5, 3], [0, 3]], [[0, 0], [0, 3], [2.5, 3, -1], [2.5, 0], [0, 0]]]],
    C: [3.75, [[[3.732, 5, SC], [0, 4], [0, 2, SC], [3.732, 1]]]],
    D: [4, [[[0, 0], [0, 6], [2, 6, -SQ], [4, 4], [4, 2, -SQ], [2, 0], [0, 0]]]],
    E: [3.5, [[[3.5, 6], [0, 6], [0, 0], [3.5, 0]], [[0, 3], [2.75, 3]]]],
    F: [3.5, [[[3.5, 6], [0, 6], [0, 0]], [[0, 3], [2.75, 3]]]],
    G: [4, [[[3.732, 5, SC], [0, 4], [0, 2, 1], [4, 2], [4, 3], [2.25, 3]]]],
    H: [4, [[[0, 0], [0, 6]], [[4, 0], [4, 6]], [[0, 3], [4, 3]]]],
    I: [0, [[[0, 0], [0, 6]]]],
    J: [3, [[[3, 6], [3, 1.5, -1], [0, 1.5]]]],
    K: [3.75, [[[0, 0], [0, 6]], [[3.75, 6], [0, 2.25]], [[1.25, 3.5], [3.75, 0]]]],
    L: [3.25, [[[0, 6], [0, 0], [3.25, 0]]]],
    M: [5, [[[0, 0], [0, 6], [2.5, 1.5], [5, 6], [5, 0]]]],
    N: [4, [[[0, 0], [0, 6], [4, 0], [4, 6]]]],
    O: [4, [S_O]],
    P: [4, S_P],
    Q: [4, [S_O, [[2.5, 1.5], [4, 0]]]],
    R: [4, [...S_P, [[2, 3], [4, 0]]]],
    S: [3, [S_S]],
    T: [4, S_T],
    U: [4, [[[0, 6], [0, 2, 1], [4, 2], [4, 6]]]],
    V: [4, [[[0, 6], [2, 0], [4, 6]]]],
    W: [6, [[[0, 6], [1.5, 0], [3, 4.5], [4.5, 0], [6, 6]]]],
    X: [4, [[[0, 0], [4, 6]], [[0, 6], [4, 0]]]],
    Y: [4, [[[0, 6], [2, 3], [4, 6]], [[2, 3], [2, 0]]]],
    Z: [4, [[[0, 6], [4, 6], [0, 0], [4, 0]]]],
    "Ă": [4, [...S_A, [[1.1, 7.9, 0.6], [2.9, 7.9]]]],
    "Â": [4, [...S_A, [[1.1, 7.2], [2, 8], [2.9, 7.2]]]],
    "Î": [1.8, [[[0.9, 0], [0.9, 6]], [[0, 7.2], [0.9, 8], [1.8, 7.2]]]],
    "Ș": [3, [S_S, [[1.6, -1.4], [1.35, -2.1]]]],
    "Ț": [4, [...S_T, [[2.1, -1.4], [1.85, -2.1]]]],
    0: [3.5, [[[0, 1.75], [0, 4.25, -1], [3.5, 4.25], [3.5, 1.75, -1], [0, 1.75]]]],
    1: [1.5, [[[0, 4.5], [1.5, 6], [1.5, 0]]]],
    2: [3.5, [[[0, 4.25, -SD], [3.0906, 3.1251], [0, 0], [3.5, 0]]]],
    3: [3, [[[0.201, 5.25, -SS], [1.5, 3]], [[1.5, 3, -SS], [0.201, 0.75]]]],
    4: [3.75, [[[2.75, 0], [2.75, 6], [0, 2]], [[0, 2], [3.75, 2]]]],
    5: [3.25, [[[3, 6], [0, 6], [0, 3.5], [1.5, 3.5, -1], [1.5, 0], [0, 0]]]],
    6: [3.5, [[[0, 1.75, -1], [3.5, 1.75, -1], [0, 1.75]], [[2.183, 6], [0.234, 2.625]]]],
    7: [3.5, [[[0, 6], [3.5, 6], [1.25, 0]]]],
    8: [3, [[[0, 4.5, -1], [3, 4.5, -1], [0, 4.5]], [[0, 1.5, -1], [3, 1.5, -1], [0, 1.5]]]],
    9: [3.5, [[[0, 4.25, -1], [3.5, 4.25, -1], [0, 4.25]], [[1.317, 0], [3.266, 3.375]]]],
    " ": [2, []],
    "-": [2.5, [[[0, 3], [2.5, 3]]]],
    ".": [0, [[[0, 0]]]],
    "!": [0, [[[0, 6], [0, 2]], [[0, 0]]]],
    "'": [0, [[[0, 6], [0, 4.6]]]],
    "+": [3, [[[0, 3], [3, 3]], [[1.5, 1.5], [1.5, 4.5]]]],
  };
  // Punțile scrisului decupat: la un semn cu ochi, o fâșie de lemn care rămâne (ține ochiul de placă): locul ei în semn
  // și înălțimile între care stă, în unități.
  const PUNTI: Readonly<Record<string, readonly [number, number, number]>> = {
    A: [2, -1, 3.5], "Ă": [2, -1, 3.5], "Â": [2, -1, 3.5], B: [2, -1, 7], D: [2, -1, 7], O: [2, -1, 7], P: [2, 4.5, 7], Q: [2, 3, 7], R: [2, 4.5, 7],
    0: [1.75, -1, 7], 4: [1.7, -1, 3], 6: [1.75, -1, 1.75], 8: [1.5, -1, 7], 9: [1.75, 4.25, 7],
  };
  const ORNAMENT = { margine: 2, literaMare: 40, literaMica: 4.8, literaDecupata: 8, semne: 16, gaura: 2, gauraLa: 5 };
  /** Arcele de peste un sfert de cerc, împărțite în părți egale de cel mult un sfert (Cavalier le decalează sigur așa). */
  function sferturi(v: readonly Vf[]): Vf[] {
    const o: Vf[] = [];
    for (let i = 0; i < v.length; i++) {
      const a = v[i]!, b = v[i + 1];
      if (!b || !a[2]) { o.push([a[0], a[1], b ? a[2] : 0]); continue; }
      const tot = 4 * Math.atan(a[2]), n = Math.ceil(Math.abs(tot) / (Math.PI / 2) - 1e-9), dx = b[0] - a[0], dy = b[1] - a[1], c = Math.hypot(dx, dy), sg = a[2] * c / 2;
      const r = (c * c / 4 + sg * sg) / (2 * Math.abs(sg)), h = r - Math.abs(sg), sn = Math.sign(a[2]), cx = (a[0] + b[0]) / 2 - sn * h * dy / c, cy = (a[1] + b[1]) / 2 + sn * h * dx / c;
      const a0 = Math.atan2(a[1] - cy, a[0] - cx), bl = Math.tan(tot / n / 4);
      for (let k = 0; k < n; k++) o.push(k === 0 ? [a[0], a[1], bl] : [cx + r * Math.cos(a0 + tot * k / n), cy + r * Math.sin(a0 + tot * k / n), bl]);
    }
    return o;
  }
  /** O trăsătură îngroșată cu `d` de o parte și de alta, cu capetele rotunde; una închisă dă un inel (marginea și golul). */
  function trasatura(t: readonly Vf[], d: number): Unita {
    const CV = glob.Cavalier;
    if (t.length === 1) return { ext: [[t[0]![0] + d, t[0]![1], 1], [t[0]![0] - d, t[0]![1], 1]], gauri: [] };
    const v = sferturi(t);
    if (t.length > 2 && t[0]![0] === t[t.length - 1]![0] && t[0]![1] === t[t.length - 1]![1]) {
      const p = CV.plineClosed(v.slice(0, -1)), a = p.parallelOffset(d)[0]!, b = p.parallelOffset(-d)[0]!;
      return Math.abs(a.area()) > Math.abs(b.area()) ? { ext: spreStanga(dinPl(a)), gauri: [spreStanga(dinPl(b))] } : { ext: spreStanga(dinPl(b)), gauri: [spreStanga(dinPl(a))] };
    }
    // pe dreapta înainte, capătul rotund, pe stânga înapoi, capătul de la început
    const p = CV.plineOpen(v), dr = dinPl(p.parallelOffset(-d)[0]!), st = dinPl(p.parallelOffset(d)[0]!), ext: Vf[] = dr.map((q): Vf => [q[0], q[1], q[2]]);
    ext[ext.length - 1]![2] = 1;
    for (let k = st.length - 1; k >= 0; k--) ext.push([st[k]![0], st[k]![1], k > 0 ? -st[k - 1]![2] : 1]);
    return { ext, gauri: [] };
  }
  /** Între ce înălțimi stau trăsăturile unui semn, în unități (cu arcele lor); `null` la un semn fără trăsături. */
  const intreSemn = (c: string): readonly [number, number] | null => {
    let jos = Infinity, sus = -Infinity;
    for (const t of SCRIS[c]![1]) {
      // (arcele, în sferturi: întinderea unui arc de peste o jumătate de cerc iese greșit din Cavalier)
      const e = t.length > 1 ? glob.Cavalier.plineOpen(sferturi(t.map((q): Vf => [q[0]!, q[1]!, q[2] ?? 0]))).extents() : null;
      jos = Math.min(jos, e ? e.minY : t[0]![1]!); sus = Math.max(sus, e ? e.maxY : t[0]![1]!);
    }
    return Number.isFinite(jos) ? [jos, sus] : null;
  };
  /** Numele cum se scrie: majuscule, sedilele duse la virgulă (S și T cu sedilă devin cele cu virgulă), spațiile strânse,
   *  doar semnele fontului, cel mult 16. */
  function numeScris(v: unknown): { text: string; sarite: string; lung: boolean } {
    const brut = (typeof v === "string" || typeof v === "number" ? String(v) : "").toUpperCase().replace(/\u015e/g, String.fromCharCode(0x218)).replace(/\u0162/g, String.fromCharCode(0x21a)).replace(/\s+/g, " ").trim();
    let text = "", sarite = "";
    for (const c of brut) { if (Object.prototype.hasOwnProperty.call(SCRIS, c)) text += c; else if (!sarite.includes(c)) sarite += c; }
    text = text.replace(/ +/g, " ").trim();
    const lung = [...text].length > ORNAMENT.semne;
    return { text: lung ? [...text].slice(0, ORNAMENT.semne).join("").trim() : text, sarite, lung };
  }
  /** Linia literelor (16 % din majusculă, între 1,2 și 2,6 mm) și cât e între casetele a două semne. */
  const liniaScris = (h: number): number => Math.max(1.2, Math.min(2.6, 0.16 * h));
  const intreScris = (w: number, scris: string): number => w + (scris === "decupat" ? Math.max(CRACIUN.nervura, 0.8 * w) : 0.8 * w);
  /** Cutia cernelii unui nume la majuscula h: cât e de lată și de înaltă, și între ce înălțimi stau trăsăturile (în unități). */
  function cutieScris(text: string, h: number, scris: string): { X: number; Y: number; jos: number; sus: number; w: number; G: number } {
    const u = h / 6, w = liniaScris(h), G = intreScris(w, scris), semne = [...text];
    let jos = Infinity, sus = -Infinity;
    for (const c of semne) { const i = intreSemn(c); if (i) { jos = Math.min(jos, i[0]); sus = Math.max(sus, i[1]); } }
    return { X: semne.reduce((t, c) => t + SCRIS[c]![0] * u, 0) + (semne.length - 1) * G + w, Y: (sus - jos) * u + w, jos, sus, w, G };
  }
  /** Dreptunghiul cu mijlocul în poligon stă cu totul în el (nicio latură a poligonului nu-l atinge)? */
  function dreptInPoli(poli: readonly P2[], x0: number, y0: number, x1: number, y1: number): boolean {
    return !poli.some((a, i: number) => {
      const b = poli[(i + 1) % poli.length]!, dx = b[0] - a[0], dy = b[1] - a[1];
      let t0 = 0, t1 = 1;
      for (const [pp, qq] of [[-dx, a[0] - x0], [dx, x1 - a[0]], [-dy, a[1] - y0], [dy, y1 - a[1]]] as const) {
        if (pp === 0) { if (qq < 0) return false; continue; }
        const t = qq / pp;
        if (pp < 0) t0 = Math.max(t0, t); else t1 = Math.min(t1, t);
        if (t0 > t1) return false;
      }
      return true;
    });
  }
  type OrnamentDef = { forma?: unknown; text?: unknown; scris?: unknown; lungime?: unknown; inaltime?: unknown; diam?: unknown; grosime?: unknown; relief?: unknown; agatatoare?: unknown };
  function ornamentCote(d: OrnamentDef) {
    const avert: string[] = [], mute: string[] = [], zec = (x: number) => String(x).replace(".", Limba.zecimal);
    const forma = d.forma === "glob" || d.forma === "inima" || d.forma === "stea" ? d.forma : "eticheta", et = forma === "eticheta";
    // mărimile care nu sunt ale formei nu se judecă
    const lungime = campMarginit(et ? avert : mute, d.lungime, 40, 160, 70, x => tr`Lungimea unei etichete e între 40 și 160 mm: am făcut-o de ${x} mm.`);
    const inaltime = campMarginit(et ? avert : mute, d.inaltime, 16, 60, 26, x => tr`Înălțimea unei etichete e între 16 și 60 mm: am făcut-o de ${x} mm.`);
    const diam = campMarginit(et ? mute : avert, d.diam, 30, 120, 60, x => tr`Mărimea unui ornament e între 30 și 120 mm: l-am făcut de ${x} mm.`);
    const grosime = campMarginit(avert, d.grosime, 1.2, 6, 3, x => tr`Grosimea unui ornament e între 1,2 și 6 mm: l-am făcut de ${x} mm.`);
    const scris = d.scris === "adancit" || d.scris === "decupat" ? d.scris : "relief", agatatoare = d.agatatoare === "fara" ? "fara" : et ? "gaura" : "inel";
    const nume = numeScris(d.text), cuScris = nume.text !== "" && scris !== "decupat";
    let relief = campMarginit(cuScris ? avert : mute, d.relief, 0.4, 3, 0.8, x => tr`Scrisul are între 0,4 și 3 mm: l-am făcut de ${x} mm.`);
    if (scris === "adancit" && relief > grosime - 0.6 + 1e-9) { relief = zecime(grosime - 0.6); if (cuScris) avert.push(tr`Scrisul adâncit lasă cel puțin 0,6 mm dedesubt: l-am făcut de ${zec(relief)} mm.`); }
    if (nume.sarite) avert.push([...nume.sarite].length > 1 ? tr`Nu am semnele „${nume.sarite}”: le-am sărit.` : tr`Nu am semnul „${nume.sarite}”: l-am sărit.`);
    if (nume.lung) avert.push(tr`Un nume are cel mult 16 semne: am păstrat „${nume.text}”.`);
    // forma: conturul ei, agățătoarea, locul numelui
    const forme: Vf[][] = [], gauri: Poli[] = [];
    let loc: P2 = [0, 0];
    if (et) {
      // colțurile din stânga, teșite; gaura de 4 mm, la 5 mm de capăt; numele, la mijlocul locului rămas (de la marginea
      // găurii până la capătul din dreapta: cutia lui, cu marginea ei, nu ajunge la gaură)
      const W = lungime, Ht = inaltime, c = Math.min(Ht / 3, 8);
      forme.push([[-W / 2 + c, -Ht / 2, 0], [W / 2, -Ht / 2, 0], [W / 2, Ht / 2, 0], [-W / 2 + c, Ht / 2, 0], [-W / 2, Ht / 2 - c, 0], [-W / 2, -Ht / 2 + c, 0]]);
      if (agatatoare === "gaura") { gauri.push(cerc(-W / 2 + ORNAMENT.gauraLa, 0, ORNAMENT.gaura)); loc = [(ORNAMENT.gauraLa + ORNAMENT.gaura) / 2, 0]; }
    } else if (forma === "glob") {
      // discul, cu căpăcelul și inelul globului
      const R = diam / 2, capL = Math.max(8, 0.26 * diam), capH = Math.max(4, 0.09 * diam);
      forme.push([[R, 0, 1], [-R, 0, 1]], dreptForma(-capL / 2, Math.sqrt(R * R - capL * capL / 4) - 0.6, capL / 2, R + capH));
      if (agatatoare === "inel") { const i = inelAgatat(R + capH); forme.push(i.disc); gauri.push(i.gol); }
    } else if (forma === "inima") {
      // doi lobi de rază r, cu centrele la ±0,8 · r; vârful de jos la 2,2 · r sub ei, pe tangentele la lobi; inelul, pe o
      // tijă din crestătură
      const r = diam / 3.6, a = 0.8 * r, lg = Math.hypot(a, 2.2 * r), tang = Math.sqrt(lg * lg - r * r), u = Math.atan2(2.2 * r, a) - Math.asin(r / lg);
      const px = tang * Math.cos(u), py = -2.2 * r + tang * Math.sin(u), jos = Math.tan(-Math.atan2(py, px - a) / 4), sus = Math.tan((Math.atan2(0.6 * r, -a) - Math.PI / 2) / 4);
      // arcul fiecărui lob, în trei părți: până la punctul cel mai din afară, până la cel mai de sus, până la crestătură
      // (un arc de peste o jumătate de cerc nu se unește sigur cu tija, iar așa mărimile ies întregi)
      forme.push([[0, -2.2 * r, 0], [px, py, jos], [a + r, 0, SQ], [a, r, sus], [0, 0.6 * r, sus], [-a, r, SQ], [-a - r, 0, jos], [-px, py, 0]]);
      if (agatatoare === "inel") { const i = inelAgatat(r); forme.push(dreptForma(-CRACIUN.tija / 2, 0.6 * r - 1, CRACIUN.tija / 2, r + 0.2), i.disc); gauri.push(i.gol); }
      loc = [0, -0.2 * r];
    } else {
      // steaua cu cinci colțuri, plină (vârfurile dinăuntru la 55 % din rază), cu inelul pe colțul de sus
      const R = diam / 2, poli = Array.from({ length: 10 }, (_, k: number): P2 => { const rr = k % 2 ? 0.55 * R : R, uu = Math.PI / 2 + Math.PI * k / 5; return [rr * Math.cos(uu), rr * Math.sin(uu)]; });
      forme.push(poli.map(([x, y]): Vf => [x, y, 0]));
      if (agatatoare === "inel") { const i = inelAgatat(R); forme.push(tijaInel(poli, R), i.disc); gauri.push(i.gol); }
      loc = [0, 0.08 * R];
    }
    const baza = unesteForme(forme);
    // numele: cea mai mare majusculă (din zecime în zecime) a cărei cutie, lărgită cu marginea, stă în formă
    let litera = 0, cutie = { X: 0, Y: 0, jos: 0, sus: 0, w: 0, G: 0 };
    if (nume.text) {
      const contur = curataPoli(trig(aplatizeaza(baza[0]!.ext, laturiFine))), m = ORNAMENT.margine, mica = scris === "decupat" ? ORNAMENT.literaDecupata : ORNAMENT.literaMica;
      for (let k = Math.round(ORNAMENT.literaMare * 10); k >= Math.round(mica * 10) && !litera; k--) {
        const c = cutieScris(nume.text, k / 10, scris), x0 = loc[0] - c.X / 2 - m, x1 = loc[0] + c.X / 2 + m, y0 = loc[1] - c.Y / 2 - m, y1 = loc[1] + c.Y / 2 + m;
        if (dreptInPoli(contur, x0, y0, x1, y1)) { litera = k / 10; cutie = c; }
      }
      if (!litera) avert.push(tr`Numele nu încape pe forma asta: fă forma mai mare sau numele mai scurt.`);
      else if (litera < 6) avert.push(tr`Literele au ieșit de ${zec(litera)} mm: pentru litere mai mari, fă forma mai mare sau numele mai scurt.`);
    }
    return { forma, text: nume.text, sarite: nume.sarite, scris, lungime, inaltime, diam, grosime, relief, agatatoare, litera, cutie, loc, baza, gauri, avert };
  }
  /** Semnele unui nume așezat, ca bucăți (fiecare cu ochiurile ei) și, pentru scrisul decupat, punțile lor. */
  function semneNume(q: ReturnType<typeof ornamentCote>): { bucati: Unita[]; punti: Vf[][] }[] {
    const u = q.litera / 6, { X, jos, sus, w, G } = q.cutie, yb = q.loc[1] - (jos + sus) / 2 * u, out: { bucati: Unita[]; punti: Vf[][] }[] = [];
    let x = q.loc[0] - X / 2 + w / 2;
    for (const c of q.text) {
      const [lat, tras] = SCRIS[c]!;
      // fiecare trăsătură e cu 2 µm mai subțire decât cea dinainte: laturile lor nu se suprapun niciodată
      const t = tras.map((s, k: number) => trasatura(s.map((p): Vf => [x + p[0]! * u, yb + p[1]! * u, p[2] ?? 0]), w / 2 - 0.002 * k));
      if (t.length) {
        const unite = t.length > 1 ? unesteForme(t.map(z => z.ext)) : [{ ext: t[0]!.ext, gauri: [] as Vf[][] }];
        // ochiurile trăsăturilor închise, fără ce acoperă celelalte trăsături
        const ochi = t.flatMap((z, i: number) => z.gauri.flatMap(g => t.reduce((l: Vf[][], y, j: number) => (j === i ? l : l.flatMap(o => scadeForma(o, y.ext))), [g])));
        const bucati = unite.map(b => { const e = aplatizeaza(b.ext); return { ext: b.ext, gauri: [...b.gauri, ...ochi.filter(o => inPoli(e, [o[0]![0], o[0]![1]]))] }; });
        const b = PUNTI[c];
        out.push({ bucati, punti: b ? [dreptForma(x + b[0] * u - CRACIUN.nervura / 2, yb + b[1] * u, x + b[0] * u + CRACIUN.nervura / 2, yb + b[2] * u)] : [] });
      }
      x += lat * u + G;
    }
    return out;
  }
  function ornament(d: OrnamentDef): Corp {
    const q = ornamentCote(d), h = q.grosime, corp = (tri: Tri[]): Corp => ({ tri, avert: q.avert, prinderi: [] });
    if (!q.litera) return corp(prismaUnite(q.baza, q.gauri, 0, h));
    const semne = semneNume(q), bucati = semne.flatMap(s => s.bucati), poli = (v: readonly Vf[]): Poli => curataPoli(trig(aplatizeaza(v, laturiFine)));
    // în relief: placa întreagă, cu literele peste ea (intrate 0,01 mm în placă)
    if (q.scris === "relief") return corp([...prismaUnite(q.baza, q.gauri, 0, h), ...prismaUnite(bucati, [], h - 0.01, h + q.relief)]);
    // adâncit: fundul întreg, iar peste el placa fără litere și ochiurile literelor
    if (q.scris === "adancit") return corp([...prismaUnite(q.baza, q.gauri, 0, h - q.relief), ...prismaUnite(q.baza, [...q.gauri, ...bucati.map(b => poli(b.ext))], h - q.relief - 0.01, h),
      ...bucati.flatMap(b => b.gauri.flatMap(g => prismaGauri(poli(g), [], h - q.relief - 0.01, h)))]);
    // decupat: literele sunt goluri prin placă, fără punțile lor (fâșiile care țin ochiurile)
    const goluri = semne.flatMap(s => s.bucati.flatMap(b => b.gauri.reduce((l: Vf[][], g) => l.flatMap(o => scadeForma(o, g)), s.punti.reduce((l: Vf[][], pt) => l.flatMap(o => scadeForma(o, pt)), [b.ext]))));
    return corp(prismaUnite(q.baza, [...q.gauri, ...goluri.map(poli)], 0, h));
  }

  // Brăduțul LEGO (ADR 0285, felia 3.Cl-4): etajele lui și steaua de vârf. Un etaj e un trunchi de con cu marginea
  // zimțată (sau netedă), cu locașul 2 × 2 dedesubt (un gol rotund, care ține cele patru știfturi din afară, cu tubul din
  // mijloc, care le ține dinăuntru) și cu patru știfturi sus; etajele se clădesc unul pe altul, pe o piesă rotundă 2 × 2
  // (trunchiul). Vârful e conul 2 × 2 cu știftul gol, iar steaua, plată, are un cui (o bară de 3,2 mm, culcată) care
  // intră în el.
  const BRAD_LEGO = { varf: 9.2, umar: 5.2, cui: 6 };
  /** Trunchiul dintre două contururi cu același număr de vârfuri (cel de jos și cel de sus), închis; fiecare latură e din
   *  două triunghiuri, cu muchia dintre ele de la vârful de jos la vârful următor de sus. */
  function trunchiForme(A: readonly P2[], B: readonly P2[], z0: number, z1: number): Tri[] {
    const tri: Tri[] = [], n = A.length, a3 = (q: Pt, z: number): P3 => [q[0], q[1], z];
    for (const [a, b, c] of triunghiuriPoligon(A)) tri.push([a3(A[a]!, z0), a3(A[c]!, z0), a3(A[b]!, z0)]);
    for (const [a, b, c] of triunghiuriPoligon(B)) tri.push([a3(B[a]!, z1), a3(B[b]!, z1), a3(B[c]!, z1)]);
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; tri.push([a3(A[i]!, z0), a3(A[j]!, z0), a3(B[j]!, z1)], [a3(A[i]!, z0), a3(B[j]!, z1), a3(B[i]!, z1)]); }
    return tri;
  }
  type BradLegoDef = { piesa?: unknown; diam?: unknown; placi?: unknown; margine?: unknown; marime?: unknown; etaje?: unknown };
  function bradLegoCote(d: BradLegoDef) {
    const avert: string[] = [], mute: string[] = [], piesa = d.piesa === "stea" ? "stea" : "etaj", et = piesa === "etaj";
    // diametrul etajului: 4, 6, 8 sau 10 știfturi (locașul 2 × 2 stă între patru știfturi doar la un diametru par)
    const cerut = numarCerut(d.diam), diam = Number.isFinite(cerut) ? Math.min(10, Math.max(4, 2 * Math.round(cerut / 2))) : 8;
    if (et && Number.isFinite(cerut) && cerut !== diam) avert.push(tr`Un etaj are 4, 6, 8 sau 10 știfturi în diametru: l-am făcut de ${diam}.`);
    const placi = campMarginit(et ? avert : mute, d.placi, 3, 9, 5, x => tr`Un etaj are între 3 și 9 plăci: l-am făcut de ${x}.`, true);
    const margine = d.margine === "neteda" ? "neteda" : "zimti";
    const marime = campMarginit(et ? mute : avert, d.marime, 16, 48, 28, x => tr`Steaua de vârf are între 16 și 48 mm: am făcut-o de ${x} mm.`);
    const R = diam * P.pas / 2 - P.joc_lateral, H = placi * P.placa, ad = Math.min(P.locas_h, H - 0.8);
    // steaua e groasă cât bara culcată a cuiului ei (bara de 3,2 mm, tăiată dedesubt cu 0,25)
    return { piesa, diam, placi, margine, marime, R, H, ad, zc: Math.min(H - 0.6, ad + 1), zimti: margine === "zimti" ? 2 * diam + 4 : 0, gros: P.bara_d - 0.25, avert };
  }
  function bradLego(d: BradLegoDef): Corp {
    const q = bradLegoCote(d), e = ef();
    if (q.piesa === "stea") {
      // steaua cu cinci colțuri (vârfurile dinăuntru la 45 %), groasă cât cuiul; umărul (cât știftul) se oprește pe
      // știftul gol al vârfului, la nivelul colțurilor de jos, iar cuiul (bara culcată) intră în el
      const R = q.marime / 2, yt = -R * Math.cos(Math.PI / 5), zb = P.bara_d / 2 - 0.25;
      const stea = Array.from({ length: 10 }, (_, k: number): Vf => { const rr = k % 2 ? 0.45 * R : R, u = Math.PI / 2 + Math.PI * k / 5; return [rr * Math.cos(u), rr * Math.sin(u), 0]; });
      const unite = unesteForme([stea, dreptForma(-BRAD_LEGO.umar / 2, yt, BRAD_LEGO.umar / 2, -0.45 * R + 1)]);
      const cui = axe(prisma(sectiuneBara(P.bara_d / 2), yt - BRAD_LEGO.cui, yt + 0.5), ([a, b, t]): P3 => [a, t, b], true);
      return { tri: [...prismaUnite(unite, [], 0, q.gros), ...cui], avert: q.avert, prinderi: [{ fel: "bara", p: [0, yt - BRAD_LEGO.cui, zb], d: PE_Y, lung: BRAD_LEGO.cui }] };
    }
    const { R, H, ad, zc } = q, s = P.pas, Rt = BRAD_LEGO.varf;
    // marginea: zimții cu vârfurile pe R și golurile mai înăuntru cu 12 % din rază (cel puțin 2 mm), sau cercul
    const Rz = R - Math.max(2, 0.12 * R), contur: Poli = q.zimti
      ? Array.from({ length: 2 * q.zimti }, (_, k: number): P2 => { const rr = k % 2 ? Rz : R, u = Math.PI / 2 + Math.PI * k / q.zimti; return [rr * Math.cos(u), rr * Math.sin(u)]; })
      : cerc(0, 0, R, laturiFine(R));
    // sus, fiecare vârf al marginii ajunge pe cercul vârfului, pe raza lui
    const sus = contur.map(([x, y]): P2 => { const u = Math.atan2(y, x); return [Rt * Math.cos(u), Rt * Math.sin(u)]; });
    // dedesubt: golul celor patru știfturi, cu peretele lui la jocul din calibrare (le ține din afară), și tubul din mijloc,
    // care le ține dinăuntru
    const ro = P.tub_contact - e.joc, colturi: P2[] = [[-s / 2, -s / 2], [s / 2, -s / 2], [-s / 2, s / 2], [s / 2, s / 2]];
    const tri: Tri[] = [
      ...inel(contur, cerc(0, 0, Math.hypot(s / 2, s / 2) + P.stift_d / 2 + e.joc), [0, 0], 0, ad + 0.01), ...tub(0, 0, ro, Math.min(ro - 0.8, P.stift_d / 2), 0, ad + 0.01),
      ...prisma(contur, ad, zc + 0.01), ...trunchiForme(contur, sus, zc, H), ...stifturi(colturi, H, e.stiftD),
    ];
    return { tri, avert: q.avert, prinderi: [...colturi.map(([x, y]): Prindere => ({ fel: "locas", p: [x, y, 0], d: JOS, lung: ad, orb: true })), ...colturi.map(([x, y]): Prindere => ({ fel: "stift", p: [x, y, H], d: SUS, lung: P.stift_h }))] };
  }
  /** Piesele unui brăduț întreg, de jos în sus: trunchiul (rotund, 2 × 2), etajele (cu câte două știfturi mai puțin, până la
   *  4), vârful (conul 2 × 2 cu știftul gol) și steaua. */
  function bradLegoPiese(d: BradLegoDef): Record<string, unknown>[] {
    const q = bradLegoCote({ ...d, piesa: "etaj" }), cate = numarCerut(d.etaje), etaje = Math.min((q.diam - 4) / 2 + 1, Math.max(1, Number.isFinite(cate) ? Math.round(cate) : 3));
    return [
      // (cheile, ca în lista atelierului: aceeași piesă făcută din editorul ei se adună pe același rând)
      { tip: "rotund", diam: 2, placi: 3, forma: "cilindru", varf_d: 5.4, stifturi: "toate" },
      ...Array.from({ length: etaje }, (_, k: number) => ({ tip: "bradLego", piesa: "etaj", diam: q.diam - 2 * k, placi: q.placi, margine: q.margine })),
      { tip: "rotund", diam: 2, placi: 6, forma: "con", varf_d: 5.4, stifturi: "toate", gaura: "bara" },
      { tip: "bradLego", piesa: "stea", marime: bradLegoCote({ piesa: "stea", marime: d.marime }).marime },
    ];
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
    return { tri, avert: [], prinderi: [] };
  }

  // ---------------------------------------------------------------------------------------------- piesa dupa definitie
  const TIPURI = { caramida, lateral, panta, pantaInversa, pana, rotund, arc, cadru, grinda, caramidaTechnic, ax, stiftTechnic, bucsa, conector, conectorUnghi, suport, clema, maner, bara, bila, cupa, rotita, cremaliera, cama, melc, roata, fulie, conica, coroana, conicaDubla, senila, elice, eliceBarca, ventilator, roataPalete, fulg, stea, brad, glob: globCraciun, ornament, bradLego, dinCvs2 };
  function construieste(def: DefPiesa) {
    const f = TIPURI[def.tip];
    if (!f) throw new Error("tip necunoscut: " + def.tip);
    const r = (f as (d: DefPiesa) => Rezultat)(def);
    // baza: unde era coltul cutiei inainte de mutarea in origine (pentru asezarea pe grila de stifturi, in model)
    const [a] = cutia(r.tri), tri = muta(r.tri, -a[0], -a[1], -a[2]), [, b] = cutia(tri);
    // ax: la piesele rotunde, unde e axul in plasa mutata (originea piesei din motor); la celelalte, null (ADR 0283)
    const ax: [number, number] | null = eRotunda(def) ? [-a[0], -a[1]] : null;
    return { ...r, tri, dim: b, baza: a, ax, prinderi: mutaPrinderi(r.prinderi, -a[0], -a[1], -a[2]) };
  }

  // ---------------------------------------------------------------------------------------------- asezarea in model (ADR 0283)
  // Vederea „Modelul” a atelierului pune fiecare piesa pe grila de stifturi dupa amprenta ei (gw × gd stifturi) si dupa pivot:
  // punctul piesei (in plasa mutata in origine) care sta in mijlocul amprentei si in jurul caruia se roteste piesa.
  // - piesa obisnuita: amprenta e cutia ei, rotunjita la stifturi; pivotul, mijlocul cutiei;
  // - piesa cu o placa pe grila si ceva ce iese din ea (stifturi laterale, suport, clema, maner, bila, cupa): amprenta e
  //   placa, iar pivotul, mijlocul placii (corpul ramane unde l-a facut motorul);
  // - piesa rotunda (axul ei e originea piesei din motor): amprenta e impara pe ambele axe (cu un stift in plus unde iesea
  //   para), iar pivotul e axul. Deci axul sta mereu pe centrul unui stift, iar doua piese rotunde ajung pe acelasi ax.
  const ROTUNDE: ReadonlySet<string> = new Set(["rotita", "cama", "melc", "roata", "fulie", "conica", "coroana", "conicaDubla", "elice", "eliceBarca", "ventilator", "roataPalete"]);
  /** Piesa rotunda, cu axul in originea ei: tipurile de mai sus si, la senila, pinionul (zala nu). */
  function eRotunda(def: DefPiesa): boolean { return def.tip === "senila" ? def.piesa === "pinion" : ROTUNDE.has(def.tip); }
  type Asezare = { gw: number; gd: number; pivot: [number, number]; ax: boolean };
  function asezareModel(def: DefPiesa, corp: { dim: readonly number[]; baza: readonly number[]; ax: readonly number[] | null } = construieste(def)): Asezare {
    const st = (v: number) => Math.max(1, Math.round((v + 0.2) / P.pas)), d = def as { tip: string; lung?: unknown; adanc?: unknown; baza?: unknown };
    const placa = ({ lateral: [d.lung, 1], suport: [d.lung, d.adanc], clema: [d.lung, 1], maner: [d.lung, 1], bila: [d.baza, d.baza], cupa: [1, 1] } as Record<string, unknown[] | undefined>)[d.tip];
    if (placa) {
      const [gw, gd] = placa.map(v => Math.max(1, Math.round(+(v as number) || 1))) as [number, number];
      return { gw, gd, pivot: [gw * P.pas / 2 - corp.baza[0]!, gd * P.pas / 2 - corp.baza[1]!], ax: false };
    }
    const gw = st(corp.dim[0]!), gd = st(corp.dim[1]!);
    if (corp.ax) return { gw: gw + 1 - gw % 2, gd: gd + 1 - gd % 2, pivot: [corp.ax[0]!, corp.ax[1]!], ax: true };
    return { gw, gd, pivot: [corp.dim[0]! / 2, corp.dim[1]! / 2], ax: false };
  }
  /** Unde sta pivotul (mm) al piesei puse la x, y (stifturi), rotita cu rot sferturi de tura: mijlocul amprentei rotite. */
  function pivotModel(a: Asezare, x: number, y: number, rot: number): [number, number] {
    const [w, d] = rot % 2 ? [a.gd, a.gw] : [a.gw, a.gd];
    return [(x + w / 2) * P.pas, (y + d / 2) * P.pas];
  }
  /** Locul (stifturi) la care pivotul piesei ajunge cel mai aproape de tinta (mm); la egalitate, cel cu numarul mai mic. */
  function langaPivot(a: Asezare, rot: number, tinta: readonly number[]): [number, number] {
    const [w, d] = rot % 2 ? [a.gd, a.gw] : [a.gw, a.gd], aproape = (v: number) => Math.ceil(v - 0.5 - 1e-6) + 0;
    return [aproape(tinta[0]! / P.pas - w / 2), aproape(tinta[1]! / P.pas - d / 2)];
  }
  // ---------------------------------------------------------------------------------------------- alipirea in model (ADR 0284, 3.Cf)
  // Fiecare piesa din model are o transformare: matricea de rotatie `m` (3 × 3, pe randuri) si mutarea `t` (mm), care duc un
  // punct al plasei ei (mutata in origine) in lume. Trei feluri de asezare:
  // - pe grila (ADR 0283): rotita in jurul pivotului, cu pivotul in mijlocul amprentei;
  // - prinsa: cu prinderea ei pe prinderea aleasa a altei piese (baza), deci o urmeaza oriunde ar fi mutata sau rotita baza;
  // - libera: o transformare tinuta ca atare (o piesa desprinsa ramane unde era).
  type Transf = { m: number[]; t: P3 };
  const aplicaTransf = (T: Transf, p: readonly number[]): P3 => { const q = roteste(T.m, [p[0]!, p[1]!, p[2]!]); return [q[0] + T.t[0], q[1] + T.t[1], q[2] + T.t[2]]; };
  /** A∘B: un punct e dus intai cu B, apoi cu A. */
  const compuneTransf = (A: Transf, B: Transf): Transf => ({ m: inmulteste(A.m, B.m), t: aplicaTransf(A, B.t) });
  // sferturile de tura, exacte (fara 6e-17 in matrice): rotirea in jurul lui z cu rot · 90°
  const SFERT = [[1, 0], [0, 1], [-1, 0], [0, -1]] as const;
  /** Transformarea piesei asezate pe grila la x, y (stifturi), z (placi), rotita cu rot sferturi de tura in jurul pivotului. */
  function transfGrila(a: Asezare, x: number, y: number, z: number, rot: number): Transf {
    const [c, s] = SFERT[((Math.round(rot) % 4) + 4) % 4]!, [px, py] = pivotModel(a, x, y, rot), [u, v] = a.pivot;
    return { m: [c, -s, 0, s, c, 0, 0, 0, 1], t: [px - (c * u - s * v), py - (s * u + c * v), z * P.placa] };
  }
  /** Piesa prinsa, in coordonatele bazei: montajul prinderii ei b pe prinderea a a bazei, rotita cu `unghi` grade in jurul
   *  prinderii si glisata cu `alunec` mm de-a lungul ei (in sensul prinderii bazei: spre afara). */
  function transfPrins(a: Prindere, b: Prindere, unghi = 0, alunec = 0): Transf {
    const u = Number.isFinite(+unghi) ? +unghi : 0, g = Number.isFinite(+alunec) ? +alunec : 0, M = montaj(a, b, u);
    return { m: M.m, t: [M.t[0] + a.d[0] * g, M.t[1] + a.d[1] * g, M.t[2] + a.d[2] * g] };
  }
  /** Prinderile piesei noi care se potrivesc cu prinderea a, in ordinea incercarii: intai cele care intorc piesa cel mai
   *  putin (unghiul montajului), apoi in ordinea piesei. */
  function potriviriPrindere(a: Prindere, lista: readonly Prindere[]): number[] {
    const out: [number, number][] = [];
    lista.forEach((b, j) => {
      if (!sePrind(a.fel, b.fel)) return;
      // unghiul dintre directia prinderii si tinta ei (opusul directiei bazei)
      const c = Math.max(-1, Math.min(1, -scalar(a.d, b.d)));
      out.push([Math.round(Math.acos(c) * 1e6), j]);
    });
    return out.sort((x, y) => x[0] - y[0] || x[1] - y[1]).map(x => x[1]);
  }
  /** Se poate glisa de-a lungul prinderii: perechile pe o tija (axul, stiftul Technic, bara), nu stiftul in locas, nu bila in cupa. */
  const seGliseaza = (a: string, b: string): boolean => sePrind(a, b) && ![a, b].some(f => f === "stift" || f === "bila");
  type PrinsModel = { de: string; a: number; b: number; unghi?: number; alunec?: number };
  type PiesaModel = { id: string; grila: Transf; prinderi: readonly Prindere[]; prins?: PrinsModel | null; liber?: Transf | null };
  const transfBuna = (T: Transf | null | undefined): T is Transf => !!T && Array.isArray(T.m) && T.m.length === 9 && Array.isArray(T.t) && T.t.length === 3 && [...T.m, ...T.t].every(v => Number.isFinite(v));
  /**
   * Asezarile pieselor unui model, in ordinea listei: transformarea fiecareia si felul ei („grila”, „prins”, „liber”). O piesa
   * prinsa isi ia locul de la baza ei (in lant, oricat de lung). Un model stricat nu arunca: fara baza, intr-un cerc, cu un
   * indice gresit sau cu prinderi care nu se prind, piesa cade pe locul ei liber sau de pe grila.
   */
  function rezolvaModel(piese: readonly PiesaModel[]): { T: Transf; fel: "grila" | "prins" | "liber" }[] {
    const dupaId = new Map(piese.map((p, i) => [p.id, i] as const)), gata: ({ T: Transf; fel: "grila" | "prins" | "liber" } | undefined)[] = [];
    // lantul in lucru (de la piesa ceruta spre bazele ei) si piesele gasite intr-un cerc: toate cad pe locul lor
    const lant: number[] = [], cerc = new Set<number>();
    const peLoc = (p: PiesaModel) => (transfBuna(p.liber) ? { T: p.liber, fel: "liber" as const } : { T: p.grila, fel: "grila" as const });
    const una = (i: number): { T: Transf; fel: "grila" | "prins" | "liber" } => {
      if (gata[i]) return gata[i]!;
      const p = piese[i]!, q = p.prins, j = q ? dupaId.get(q.de) : undefined;
      let r: { T: Transf; fel: "grila" | "prins" | "liber" } = peLoc(p);
      // (o piesa prinsa de ea insasi e un cerc de una: il opreste lantul de mai jos)
      if (q && j !== undefined) {
        const a = piese[j]!.prinderi[q.a], b = p.prinderi[q.b];
        if (Number.isInteger(q.a) && Number.isInteger(q.b) && a && b && sePrind(a.fel, b.fel)) {
          const k = lant.indexOf(j);
          if (k >= 0) { for (const x of lant.slice(k)) cerc.add(x); cerc.add(i); } else {
            lant.push(i);
            const baza = una(j);
            lant.pop();
            if (!cerc.has(i)) r = { T: compuneTransf(baza.T, transfPrins(a, b, q.unghi, q.alunec)), fel: "prins" };
          }
        }
      }
      gata[i] = r;
      return r;
    };
    return piese.map((_, i) => una(i));
  }
  /** Prinderea ramasa in acelasi loc dupa ce piesa s-a schimbat in editor: acelasi fel, aceeasi directie si acelasi loc in
   *  planul perpendicular pe directie (de-a lungul ei se poate muta: caramida devenita placa, axul lungit). Dintre mai multe
   *  pe aceeasi axa, cea mai apropiata; −1 cand nu mai e niciuna. */
  function prindereaRamasa(veche: Prindere, noi: readonly Prindere[]): number {
    let gasit = -1, cel = Infinity;
    noi.forEach((n, j) => {
      if (n.fel !== veche.fel || scalar(n.d, veche.d) < 1 - 1e-9) return;
      const dp: P3 = [n.p[0] - veche.p[0], n.p[1] - veche.p[1], n.p[2] - veche.p[2]], lung = scalar(dp, veche.d);
      const lat = Math.hypot(dp[0] - lung * veche.d[0], dp[1] - lung * veche.d[1], dp[2] - lung * veche.d[2]);
      if (lat < 0.01 && Math.abs(lung) < cel) { cel = Math.abs(lung); gasit = j; }
    });
    return gasit;
  }
  /** Locul de pe grila al unei piese cu transformarea T (inversa lui `transfGrila`), sau null cand piesa nu sta drept pe
   *  grila: intoarsa, rotita altfel decat cu sferturi de tura in jurul verticalei, intre stifturi sau intre placi. */
  function grilaDinTransf(a: Asezare, T: Transf, oriunde = false): { x: number; y: number; z: number; rot: number } | null {
    if (!transfBuna(T)) return null;
    const aproape = (u: number, v: number) => Math.abs(u - v) < 1e-6;
    for (let rot = 0; rot < 4; rot++) {
      const [c, s] = SFERT[rot]!;
      if (![c, -s, 0, s, c, 0, 0, 0, 1].every((v, k) => aproape(T.m[k]!, v))) continue;
      const [w, d] = rot % 2 ? [a.gd, a.gw] : [a.gw, a.gd], [u, v] = a.pivot;
      const x = (T.t[0] + (c * u - s * v)) / P.pas - w / 2, y = (T.t[1] + (s * u + c * v)) / P.pas - d / 2, z = T.t[2] / P.placa;
      if (oriunde) return { x, y, z, rot };
      const xi = Math.round(x), yi = Math.round(y), zi = Math.round(z);
      return aproape(x * P.pas, xi * P.pas) && aproape(y * P.pas, yi * P.pas) && aproape(z * P.placa, zi * P.placa) ? { x: xi + 0, y: yi + 0, z: zi + 0, rot } : null;
    }
    return null;
  }
  /** Cutia in lume a unei piese: cutia ei (de la origine la `dim`), dusa cu transformarea. */
  function cutieTransf(T: Transf, dim: readonly number[]): [P3, P3] {
    const lo: P3 = [Infinity, Infinity, Infinity], hi: P3 = [-Infinity, -Infinity, -Infinity];
    for (let k = 0; k < 8; k++) {
      const q = aplicaTransf(T, [k & 1 ? dim[0]! : 0, k & 2 ? dim[1]! : 0, k & 4 ? dim[2]! : 0]);
      for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i]!, q[i]!); hi[i] = Math.max(hi[i]!, q[i]!); }
    }
    return [lo, hi];
  }
  /** Piesa libera, rotita un sfert de tura (trigonometric, privit de sus) in jurul verticalei prin mijlocul cutiei ei. */
  function rotitLiber(T: Transf, dim: readonly number[], pivot?: readonly number[] | null): Transf {
    // o piesa rotunda care sta drept (intre stifturi, la o jumatate de pas) se roteste in jurul axului ei, nu al cutiei:
    // la cama si la melc, axul nu e in mijlocul cutiei
    if (pivot && Math.abs(T.m[8]! - 1) < 1e-9) {
      const [px, py] = aplicaTransf(T, [pivot[0]!, pivot[1]!, 0]);
      return compuneTransf({ m: [0, -1, 0, 1, 0, 0, 0, 0, 1], t: [px + py, py - px, 0] }, T);
    }
    const [lo, hi] = cutieTransf(T, dim), cx = (lo[0] + hi[0]) / 2, cy = (lo[1] + hi[1]) / 2;
    // R(p) = Rz(p − c) + c, deci mutarea e c − Rz·c
    return compuneTransf({ m: [0, -1, 0, 1, 0, 0, 0, 0, 1], t: [cx + cy, cy - cx, 0] }, T);
  }
  // ---------------------------------------------------------------------------------------------- orientarea pe trei axe (ADR 0284, 3.Cf-2)
  // sferturile de tura in jurul axelor X si Y, exacte: (x, y, z) → (x, −z, y), cu varful piesei spre −y, si (x, y, z) → (z, y, −x),
  // cu varful spre +x
  const INTORS = { x: [1, 0, 0, 0, 0, -1, 0, 1, 0], y: [0, 0, 1, 0, 1, 0, -1, 0, 0] } as const;
  /** Piesa rasturnata un sfert de tura in jurul axei X sau Y, prin mijlocul cutiei ei: mijlocul ramane pe loc pe x si y, iar
   *  partea de jos a cutiei, la aceeasi inaltime. Cu rotirea in jurul verticalei (`rotitLiber`), da cele 24 de asezari
   *  drepte; patru rasturnari la rand aduc piesa de unde a plecat. O transformare stricata ramane cum e. */
  function intorsLiber(T: Transf, dim: readonly number[], axa: string): Transf {
    if (!transfBuna(T)) return T;
    const [lo, hi] = cutieTransf(T, dim), c: P3 = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2];
    const R = INTORS[axa === "y" ? "y" : "x"], rc = roteste(R, c);
    // R(p − c) + c, apoi coborata (sau urcata) cat sa stea cu partea de jos unde era
    const N = compuneTransf({ m: [...R], t: [c[0] - rc[0], c[1] - rc[1], c[2] - rc[2]] }, T), jos = cutieTransf(N, dim)[0][2];
    return { m: N.m, t: [N.t[0], N.t[1], N.t[2] + lo[2] - jos] };
  }
  /** Locul unei piese care sta drept (rotita cu sferturi de tura in jurul verticalei), si intre stifturi sau intre placi:
   *  x, y in stifturi, z in placi, cu zecimale; null cand piesa e rasturnata sau rotita altfel. */
  const loculDrept = (a: Asezare, T: Transf) => grilaDinTransf(a, T, true);
  /** Incotro e partea de sus a piesei: „sus”, „jos”, „x+”, „x-”, „y+”, „y-”; null cand piesa e inclinata altfel. */
  function susTransf(T: Transf): "sus" | "jos" | "x+" | "x-" | "y+" | "y-" | null {
    const sus = [T.m[2]!, T.m[5]!, T.m[8]!], k = sus.findIndex(v => Math.abs(Math.abs(v) - 1) < 1e-6);
    if (k < 0) return null;
    return (sus[k]! > 0 ? ["x+", "y+", "sus"] as const : ["x-", "y-", "jos"] as const)[k]!;
  }
  /** Rotorul unui ventilator si carcasa in care incape (varful paletelor sub raza golului ei): in model stau la acelasi Z. */
  function impreunaInModel(a: DefPiesa, b: DefPiesa): boolean {
    if (a.tip !== "ventilator" || b.tip !== "ventilator") return false;
    const [rotor, carcasa] = a.piesa === "carcasa" ? [b, a] : [a, b];
    if (rotor.piesa === "carcasa" || carcasa.piesa !== "carcasa") return false;
    return ventilatorCote(rotor).Rt < ventilatorCote(carcasa).D / 2;
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
    // prinderile (ADR 0284, felia 3.Ce): ale unei piese (aceleași ca în `construieste(def).prinderi`), felurile, ce se prinde
    // cu ce și montajul a două prinderi
    prinderi: (def: DefPiesa) => construieste(def).prinderi, feluriPrinderi: FELURI_PRINDERI, sePrind, montaj,
    // așezarea în vederea „Modelul” (ADR 0283): amprenta și pivotul piesei, locul pivotului, locul de lângă o țintă, perechea
    asezareModel, pivotModel, langaPivot, impreunaInModel,
    // alipirea la prinderi (ADR 0284, 3.Cf): transformarea unei piese (pe grilă, prinsă de alta, liberă) și rezolvarea modelului
    transfGrila, transfPrins, compuneTransf, aplicaTransf, potriviriPrindere, seGliseaza, rezolvaModel, grilaDinTransf, cutieTransf, rotitLiber, intorsLiber, loculDrept, susTransf, prindereaRamasa,
    rezumatPrinderi, perechiFeluri, axPentru, stiftPentru,
    contururi, insetRectiliniu, conturPana, pozitiiGauriPana, centreIndoita,
    // rotitele (ADR 0169): distanta dintre axele a doua roti care se prind (modulul m), pentru atelier
    distantaRoti: (z1: number, z2: number, m = 1) => m * (z1 + z2) / 2,
    // arcul (ADR 0284): cotele din parametri: deschiderea dintre picioare, cât urcă bolta, raza ei, cât rămâne deasupra
    arcCote: (d: ArcDef) => { const q = arcCote(d); return { lung: q.n, inalt: q.c, bolta: q.joasa ? "joasa" : "inalta", deschidere: q.w, sageata: q.s, raza: q.R, deasupra: q.H - q.s, inaltime: q.H }; },
    // cadrul (ADR 0284): cotele din parametri, după margini; golul (lat, înalt), teșitura colțurilor de sus și puntea rămasă
    cadruCote: (d: CadruDef) => { const q = cadruCote(d); return { lung: q.n, inalt: q.c, rama: q.rama, colturi: q.tesit ? "tesite" : "drepte", golLat: q.w, golInalt: q.h, tesitura: q.k, punte: q.w - 2 * q.k, inaltime: q.H }; },
    // roata cu palete (ADR 0284): cotele din parametri, după margini; butucul (raza), grosimea și lungimea unei palete
    // (de la butuc la vârf), săgeata celor curbate, grosimea discului, câte palete încap la diametrul ăsta
    roataPaleteCote: (d: PaleteDef) => { const q = roataPaleteCote(d); return { diam: q.D, palete: q.n, lat: q.W, forma: q.forma, disc: q.disc, gaura: q.gaura, butuc: q.rh, grosime: q.t, lungime: q.c, sageata: q.sageata, discGros: PALETE.disc, incap: q.incap }; },
    // cama (ADR 0284): cotele din parametri, după margini: forma, diametrul de bază, cursa, grosimea, raza cea mai mică și cea mai mare
    camaCote: (d: CamaDef) => { const q = camaCote(d); return { forma: q.forma, diam: q.D, cursa: q.c, grosime: q.h, gaura: q.gaura, razaMica: q.R0, razaMare: q.R0 + q.c }; },
    // șurubul melc (ADR 0284): cotele din parametri, după margini: lungimea, pasul și numărul spirelor, unghiul spirei,
    // diametrul la vârf și la fund, cât rămâne între colțul crucii și fundul spirei, cu cât e subțiată spira pe un flanc și
    // cât e de groasă pe linia de divizare
    melcCote: (d: MelcDef) => { const q = melcCote(d); return { diam: q.diam, lung: q.lung, lungime: q.Lz, pas: Math.PI, spire: q.Lz / Math.PI, unghi: Math.atan(1 / q.diam) * 180 / Math.PI, varf: 2 * q.ra, fund: 2 * q.rf, perete: q.perete, subtiere: q.sub, grosime: q.t }; },
    // melcul cu o roată dreaptă de aici (8–80 de dinți, modulul 1): distanța dintre axe (axele sunt perpendiculare, în
    // plane paralele), dacă distanța cade pe grila de știfturi (8 mm), la jumătate de știft (4 mm) sau în afara ei, și câte
    // ture face melcul la o tură a roții
    melcMontaj: (d: MelcDef, z: unknown) => {
      const q = melcCote(d), c = numarCerut(z), dinti = Math.round(Math.min(80, Math.max(8, Number.isFinite(c) ? c : 24))), distanta = q.rw + dinti / 2;
      return { dinti, distanta, grila: distanta % P.pas === 0 ? "intreg" : distanta % (P.pas / 2) === 0 ? "jumatate" : "nu", raport: dinti };
    },
    // cremaliera (ADR 0284): cotele din parametri: câți dinți încap, cu câte trepte e ridicat axul roții pereche (plăci, la
    // prinderea pe știfturi; rânduri de găuri, la cea cu găuri), înălțimea liniei de divizare și a axului roții deasupra feței
    // de jos, cât înaintează cremaliera la o rotație a roții, înălțimea piesei
    cremalieraMontaj: (d: CremalieraDef) => { const q = cremalieraCote(d); return { lung: q.n, m: q.m, z: q.z, prindere: q.gauri ? "gauri" : "stifturi", dinti: q.N, k: q.k, divizare: q.zp, axa: q.axa, cursa: Math.PI * q.m * q.z, inaltime: q.za }; },
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
    // elicea (ADR 0282): cotele din parametri (palete, diametrul, pasul, unghiul paletei la butuc și la vârf, consola la vârf)
    eliceCote: (d: EliceDef) => { const q = eliceCote(d); return { z: q.z, D: q.D, P: q.P, pd: q.pd, lat: q.lat, plata: q.plata, bRad: q.bRad, bVarf: q.bVarf, consola: q.consola }; },
    // elicea de barcă (ADR 0282): cotele din parametri (și butucul, unghiurile, consola la vârf, cât din disc acoperă paletele)
    eliceBarcaCote: (d: BarcaDef) => { const q = eliceBarcaCote(d); return { z: q.z, D: q.D, P: q.P, pd: q.pd, lat: q.lat, inc: q.inc, pupa: q.pupa, urca: q.urca, rh: q.rh, Hh: q.Hh, bRad: q.bRad, bVarf: q.bVarf, consola: q.consola, acoperire: q.acoperire }; },
    // ventilatorul cu carcasă (ADR 0282): cotele din parametri (vârful paletelor, butucul, inelul, carcasa și urechile ei)
    ventilatorCote: (d: VentDef) => { const q = ventilatorCote(d); return { z: q.z, D: q.D, joc: q.joc, Rt: q.Rt, pd: q.pd, P: q.P, lat: q.lat, rh: q.rh, Hh: q.Hh, Hinel: q.Hinel, Hc: q.Hc, k: q.k, urechi: q.urechi, bRad: q.bRad, bVarf: q.bVarf, consola: q.consola }; },
    cureaua: (a: FulieDef, b: FulieDef, C: unknown) => {
      const p = fulieCote(a), q = fulieCote(b), c = +(C as number), minim = Math.ceil((p.R + q.R + 0.5) * 10 - 1e-6) / 10;
      return { lungime: lungimeCurea(p.fund, q.fund, c), minim, atinge: !(c >= minim - 1e-9) };
    },
    // decorațiunile de Crăciun (ADR 0285): cotele fulgului, ale stelei și ale bradului, din parametri
    fulgCote: (d: FulgDef) => { const q = fulgCote(d); return { diam: q.diam, grosime: q.grosime, linie: q.linie, linieMax: q.linieMax, ramuri: q.ramuri, unghi: q.unghi, inceput: q.inceput, lungime: q.lungime, miez: q.miez, agatatoare: q.agatatoare, facute: q.perechi.length }; },
    steaCote: (d: SteaDef) => { const q = steaCote(d); return { varfuri: q.varfuri, diam: q.diam, interior: q.interior, grosime: q.grosime, fel: q.fel, linie: q.linie, agatatoare: q.agatatoare, varf: q.varf }; },
    bradCote: (d: BradDef) => { const q = bradCote(d); return { inaltime: q.inaltime, etaje: q.etaje, latime: q.latime, grosime: q.grosime, fel: q.fel, agatatoare: q.agatatoare, lat: q.lat, fanta: q.fanta, taiat: q.taiat }; },
    // globul (ADR 0285): cotele din parametri; `capac`: cât e căpăcelul de înalt; `schimb`: înălțimea la care se schimbă
    // filamentul (0 când globul nu e în relief)
    bradLegoCote: (d: BradLegoDef) => { const q = bradLegoCote(d); return { piesa: q.piesa, diam: q.diam, placi: q.placi, margine: q.margine, marime: q.marime, inaltime: q.H, zimti: q.zimti, gros: q.gros }; },
    bradLegoPiese,
    ornamentCote: (d: OrnamentDef) => { const q = ornamentCote(d); return { forma: q.forma, text: q.text, sarite: q.sarite, scris: q.scris, lungime: q.lungime, inaltime: q.inaltime, diam: q.diam, grosime: q.grosime, relief: q.relief, agatatoare: q.agatatoare,
      litera: q.litera, linie: q.cutie.w, intre: q.cutie.G, loc: q.loc, cutie: [q.cutie.X, q.cutie.Y], schimb: q.scris === "relief" && q.litera ? q.grosime : 0 }; },
    globCote: (d: GlobDef) => { const q = globCote(d); return { diam: q.diam, grosime: q.grosime, fel: q.fel, model: q.model, desen: q.desen, relief: q.relief, cate: q.cate, agatatoare: q.agatatoare, capac: q.capH, margine: q.margine, fanta: q.fanta, schimb: q.inRelief ? q.grosime : 0 }; },
    _: { inel, prisma, cruce, razaPoligon, insetConvex, taieSemiplan, trunchi, profilRoata, conturRoata, prismaRasucita, unesteForme, SCRIS, PUNTI } };
})(typeof globalThis !== "undefined" ? globalThis : window);
