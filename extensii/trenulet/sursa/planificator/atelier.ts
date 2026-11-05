// Partea 3D a planificatorului: atelierul de piese compatibile LEGO si lista de printat, in care intra si piesele
// printate ale circuitului (limbile macazurilor, stalpii, opritoarele, tunelurile, peroanele). Totul sta intr-o
// singura functie, ca numele de aici sa nu se amestece cu cele ale planului 2D.
var Atelier3D = (function () {
  "use strict";
  // elementele paginii, după selector (sunt în body.html: `$` nu întoarce null)
  const $ = <E extends Element = HTMLElement>(s: string): E => document.querySelector(s) as E;
  type P3 = [number, number, number];
  type Tri = [P3, P3, P3];
  /** O definiție de piesă, cum o ține atelierul (din editor, din model, din stocare): tipul și câmpurile pieselor, opționale.
   *  Motorul (`Lego.construieste`) o citește după tip. */
  type Def = { tip: string; celule?: [number, number, string?][]; gauri?: (Gaura | string)[]; laterale?: string[]; placi?: number; stifturi?: boolean | string;
    fund?: string; goale?: boolean; lung?: number; lat?: number; adanc?: number; sus?: number; buza?: number; profil?: string; varf?: number; inceput?: number;
    parte?: string; diam?: number; forma?: string; varf_d?: number; gaura?: string; groasa?: boolean; indoita?: { brate: number[]; unghiuri: number[] };
    fanta?: boolean; capat?: string; fete?: string; inalt?: number; invers?: boolean; axa?: string; baza?: number; cols?: number; rows?: number; fel?: string;
    mod?: string; unealta?: string; brate?: number[]; unghiuri?: number[]; gauriInd?: string[] };
  /** O gaură pe grilă: colțul de celulă și tipul. */
  type Gaura = [number, number, string];
  /** O piesă gata de printat: corpul, mărimea și ce a spus motorul despre ea. */
  type PiesaGata = { nume: string; titlu: string; tri: Tri[]; dim: number[]; baza?: number[] | undefined; avert?: string[] | undefined; unghi?: number | undefined;
    stifturi?: number | undefined; locasuri?: number | undefined; deschise?: number | undefined };
  type InLista = { id: string; def: Def; nume: string; bucati: number };
  /** O piesă din model: unde stă pe grilă (în știfturi și plăci), cât e rotită (în sferturi de tură), ce culoare are. */
  type InModel = { id: string; def: Def; x: number; y: number; z: number; rot: number; culoare: string };
  type PiesaTren = ReturnType<typeof TrenPentru3D.piese>["piese"][number] & { dim: number[]; g: number };
  type Valori = Record<string, number | number[] | string | boolean | null | undefined>;
  type Imprimante = { lista: { id: string; nume: string; v: Valori }[]; activ: string; implicit: string };
  /** Vederea 3D: câmpurile există de când `ok` e adevărat (din `porneste3D`). */
  type Vedere3D = { ok: boolean; T: Trei.Biblioteca; r: Trei.WebGLRenderer; scena: Trei.Object3D; cam: Trei.PerspectiveCamera; mat: Trei.Material;
    matTren: Trei.Material; mesh: Trei.Mesh | null; grila: Trei.GridHelper | null; grup?: Trei.Object3D; teta: number; fi: number; dist: number; tinta: Trei.Vector3 };
  type CorpModel = { tri: Tri[]; dim: number[]; baza: number[]; gw: number; gd: number; geom: Trei.BufferGeometry | null };
  const fmt = (v: number, z = 1) => String(Math.round(v * 10 ** z) / 10 ** z).replace(".", Limba.zecimal);
  // culorile din date (mostrele, punctele modelului) se pun prin CSSOM, dupa desenare: in cvs2, CSP-ul refuza atributele style
  const fundaluri = (r: ParentNode) => { for (const e of r.querySelectorAll<HTMLElement>("[data-fundal]")) e.style.background = e.dataset.fundal!; };
  const CULORI = [["roșu", "#c8322b"], ["albastru", "#1f5fbf"], ["galben", "#f2c12e"], ["verde", "#2e8b4a"], ["alb", "#f1f1ee"], ["negru", "#2b2b2b"], ["gri", "#9aa3ab"]];
  const CHEIE = "atelier.caramizi.v1";
  const THREE_URL = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";

  // --------------------------------------------------------------------------- starea
  const stare = {
    tip: "caramida",
    caramida: { cols: 10, rows: 6, celule: [0, 1, 2, 3].flatMap((i): [number, number][] => [[i, 0], [i, 1]]), placi: 3, stifturi: true as boolean | "mijloc", fund: "tuburi", gauri: [] as Gaura[], goale: false, laterale: [] as string[], mod: "forma" },
    panta: { lung: 2, adanc: 2, sus: 1, placi: 3, buza: 1.6, profil: "drept" },
    pantaInversa: { lung: 2, adanc: 2, sus: 1, placi: 3, buza: 1.6 },
    pana: { lung: 4, lat: 2, varf: 0, inceput: 0, parte: "stanga", placi: 1, stifturi: true, gauri: [] as Gaura[] },
    rotund: { diam: 1, placi: 3, forma: "cilindru", varf_d: 5.4, stifturi: "toate", gaura: "nu" },
    grinda: { cols: 9, rows: 5, celule: [0, 1, 2, 3, 4].map((i): Gaura => [i, 0, "r"]), groasa: true, unealta: "r", fel: "grila", brate: [6, 4], unghiuri: [53.13], gauriInd: [] as string[] },
    caramidaTechnic: { lung: 4, gauri: ["r", "r", "r"], goale: false },
    ax: { lung: 4 },
    stiftTechnic: { fanta: true, lung: 2, capat: "stift" },
    lateral: { lung: 1, fete: "una" },
    bucsa: { lung: 1, gaura: "x" },
    suport: { lung: 2, adanc: 1, inalt: 1, invers: false },
    clema: { lung: 1, axa: "verticala" },
    maner: { lung: 2, axa: "verticala" },
    bara: { lung: 4 },
    bila: { baza: 1 },
    cupa: { baza: 1 },
  };
  // piesele de legatura stau toate sub fila „Legaturi”, cu o galerie a lor in editor
  const LEGATURI = [["grinda", "Grindă"], ["caramidaTechnic", "Cărămidă Technic"], ["placaTechnic", "Placă cu găuri"], ["stiftTechnic", "Știft"], ["ax", "Ax"], ["bucsa", "Bucșă / conector"],
    ["suport", "Suport (bracket)"], ["clema", "Clemă"], ["maner", "Mâner"], ["bara", "Bară"], ["bila", "Bilă"], ["cupa", "Cupă"]];
  const eLegatura = (t: string) => LEGATURI.some(([k]) => k === t);
  let ultimaLegatura = "grinda", puneGrila: boolean | null = null, trageGrinda = false;
  const tabPentru = (t: string) => (eLegatura(t) ? "legaturi" : t);
  const SETARI_IMPLICIT = { varianta_stift: 3, varianta_locas: 3, varianta_gaura: 3, varianta_ax: 3, varianta_bara: 3, varianta_cupa: 3, pat: [180, 180], pat_margine: 5, pat_distanta: 4, culoare: "#c8322b", cuTren: true };
  // imprimantele: fiecare cu patul ei si variantele de la calibrare (si cuplajele pieselor de cale printate, din 2D)
  const CHEI_IMPRIMANTA: (keyof typeof SETARI_IMPLICIT)[] = ["pat", "pat_margine", "pat_distanta", "varianta_stift", "varianta_locas", "varianta_gaura", "varianta_ax", "varianta_bara", "varianta_cupa"];
  let imprimante: Imprimante | null = null, uiImprimante: { desen(): void } | null = null;
  const valoriImprimanta = (): Valori => ({ ...JSON.parse(JSON.stringify(Object.fromEntries(CHEI_IMPRIMANTA.map(k => [k, setari[k]])))),
    ...(window.TrenPentru3D && TrenPentru3D.print ? TrenPentru3D.print() : {}) });
  function puneImprimanta(v: Valori | null) {
    // valorile unui profil peste setarile de acum (doar cele care se pot citi)
    if (!v) return;
    for (const k of CHEI_IMPRIMANTA) {
      if (k === "pat") { if (Array.isArray(v.pat) && v.pat.length === 2 && v.pat.every(x => Number.isFinite(+x))) setari.pat = v.pat.map(x => Math.min(500, Math.max(60, Math.round(+x)))); continue; }
      if (Number.isFinite(+v[k]!) && v[k] !== null && v[k] !== "") (setari as Valori)[k] = k.startsWith("varianta_") ? Math.min(9, Math.max(-3, Math.round(+v[k]!))) : Math.max(0, Math.round(+v[k]!));
    }
    if (window.TrenPentru3D && TrenPentru3D.seteazaPrint) TrenPentru3D.seteazaPrint({ print_tata: v.print_tata as number | undefined, print_mama: v.print_mama as number | undefined });
  }
  let setari = { ...SETARI_IMPLICIT, pat: SETARI_IMPLICIT.pat.slice() };
  let lista: InLista[] = [];          // [{ id, def, nume, bucati }]
  let db: ClaudeDb | null = null, pornit = false;

  // --------------------------------------------------------------------------- nume si definitii
  const cheie = (i: number, j: number): string => i + "," + j;
  function dreptunghiDin(celule: readonly (readonly [number, number, ...unknown[]])[]): [number, number] | null {
    const xs = celule.map(c => c[0]), ys = celule.map(c => c[1]);
    const a = Math.max(...xs) - Math.min(...xs) + 1, b = Math.max(...ys) - Math.min(...ys) + 1;
    return a * b === celule.length ? [Math.min(a, b), Math.max(a, b)] : null;
  }
  function numeDef(d: Def): string {
    if (d.tip === "caramida") {
      const r = dreptunghiDin(d.celule!), fel = d.placi === 1 ? (d.stifturi ? tr("Placă") : tr("Placă netedă")) : d.placi === 3 ? (d.stifturi ? tr("Cărămidă") : tr("Cărămidă netedă")) : tr`Bloc de ${d.placi} plăci${d.stifturi ? "" : tr(", neted")}`;
      const lat = d.laterale && d.laterale.some((t: string) => t !== "p");
      return (lat ? tr`Cărămidă Technic ${r ? `${r[0]}×${r[1]}` : ""}`.trim() : r ? `${fel} ${r[0]}×${r[1]}` : tr`${fel}, formă de ${d.celule!.length}`) +
        (d.stifturi === "mijloc" ? tr(", un știft la mijloc") : "") + (d.gauri && d.gauri.length ? `, ${gauriText(d.gauri)}` : "") + (d.goale ? tr(", știfturi goale") : "");
    }
    if (d.tip === "panta") return d.profil === "curb" ? tr`Pantă curbă ${d.lung}×${d.adanc}${d.sus ? "" : tr(", fără știfturi")}${d.placi !== 3 ? tr`, ${d.placi} plăci` : ""}` : tr`Pantă ${Math.round(unghiPanta(d))}° ${d.lung}×${d.adanc}`;
    if (d.tip === "pantaInversa") return tr`Pantă inversă ${Math.round(unghiPanta(d))}° ${d.lung}×${d.adanc}`;
    if (d.tip === "pana") {
      const baza = d.placi === 1 ? tr("Placă") : d.placi === 3 ? tr("Cărămidă") : tr`Bloc de ${d.placi} plăci`;
      const fel = d.parte === "ambele" ? tr("vârf") : tr`pană ${d.parte === "dreapta" ? tr("dreapta") : tr("stânga")}`;
      return `${baza}-${fel} ${d.lung}×${d.lat}${d.varf ? tr`, vârf ${fmt(d.varf)}` : ""}${d.inceput ? tr`, tăiată de la ${d.inceput}` : ""}${d.stifturi === false ? tr(", netedă") : ""}${d.gauri && d.gauri.length ? `, ${gauriText(d.gauri)}` : ""}`;
    }
    if (d.tip === "rotund") {
      const m = `${d.diam}×${d.diam}`, h = d.placi !== 3 ? `, ${d.placi} ${d.placi === 1 ? tr("placă", "LEGO") : tr("plăci", "LEGO")}` : "";
      const g = d.gaura && d.gaura !== "nu" ? tr`, gaură de ${{ bara: tr("bară"), stift: tr("știft", "pin"), ax: tr("ax") }[d.gaura]}` : "";
      if (d.forma === "con") return tr`Con ${m}${h}${d.stifturi === "niciunul" ? tr`, vârf Ø ${fmt(d.varf_d!)}` : ""}${g}`;
      const fel = d.placi === 1 ? tr("Placă rotundă") : d.placi === 3 ? tr("Cărămidă rotundă") : tr`Rotund de ${d.placi} plăci`;
      return `${fel} ${m}${d.stifturi === "niciunul" ? tr(", netedă") : d.diam === 2 && d.stifturi === "unul" ? tr(", un știft") : ""}${g}`;
    }
    if (d.tip === "grinda" && d.indoita) {
      const sub = d.groasa ? "" : tr(" subțire"), ax = (d.gauri || []).includes("x") ? tr(" cu găuri de ax") : "";
      return tr`Grindă îndoită ${d.indoita.brate.join("–")}, ${d.indoita.unghiuri.map((u: number) => fmt(Math.abs(u), 0) + "°").join(tr(" și "))}${sub}${ax}`;
    }
    if (d.tip === "grinda") {
      const tip = d.celule ? d.celule.map(c => c[2]) : d.gauri, sub = d.groasa ? "" : tr(" subțire"), ax = tip!.includes("x") ? tr(" cu găuri de ax") : "";
      if (!d.celule) return tr`Grindă ${d.gauri!.length}${sub}${ax}`;
      const xs = d.celule.map(c => c[0]), ys = d.celule.map(c => c[1]), w = Math.max(...xs) - Math.min(...xs) + 1, h = Math.max(...ys) - Math.min(...ys) + 1;
      return (w === 1 || h === 1) && d.celule.length === w * h ? tr`Grindă ${d.celule.length}${sub}${ax}` : tr`Grindă ${Math.min(w, h)}×${Math.max(w, h)} (${d.celule.length} găuri)${sub}${ax}`;
    }
    if (d.tip === "caramidaTechnic") return tr`Cărămidă Technic 1×${d.lung}${d.gauri && d.gauri.includes("x") ? tr(", găuri de ax") : ""}${d.goale ? tr(", știfturi goale") : ""}`;
    if (d.tip === "lateral") return tr`Cărămidă 1×${d.lung} cu știfturi pe ${d.fete === "doua" ? tr("două laturi") : tr("o latură")}`;
    if (d.tip === "ax") return tr`Ax ${d.lung}`;
    if (d.tip === "stiftTechnic") return `${d.capat === "ax" ? tr("Știft cu ax") : tr("Știft Technic")}${+d.lung! === 3 ? " 3" : ""}${d.fanta ? "" : tr(", fără fantă")}`;
    if (d.tip === "bucsa") return +d.lung! === 0.5 ? tr("Bucșă ½") : d.gaura === "xr" ? tr`Conector ax–știft ${d.lung}` : `${+d.lung! === 1 ? tr("Bucșă") : tr("Conector de ax")} ${+d.lung! === 1 ? "" : d.lung}`.trim() + (d.gaura === "r" ? tr(", gaură rotundă") : "");
    if (d.tip === "suport") return tr`Suport ${d.adanc}×${d.lung} – ${d.inalt}×${d.lung}${d.invers ? tr(", întors") : ""}`;
    if (d.tip === "clema") return tr`Placă 1×${d.lung} cu clemă${d.axa === "orizontala" ? tr(" culcată") : ""}`;
    if (d.tip === "maner") return tr`Placă 1×${d.lung} cu mâner${d.axa === "verticala" ? tr(" în picioare") : ""}`;
    if (d.tip === "bara") return tr`Bară ${d.lung}`;
    if (d.tip === "bila") return tr`Placă ${d.baza}×${d.baza} cu bilă`;
    if (d.tip === "cupa") return tr("Placă 1×1 cu cupă");
    if (d.tip === "calibrare") return tr("Set de calibrare");
    return d.tip;
  }
  const gauriText = (g: readonly (Gaura | string)[]) => {
    const r = g.filter(x => x[2] !== "x").length, x = g.length - r;
    return [r ? `${r} ${r === 1 ? tr("gaură") : tr("găuri")}` : "", x ? tr`${x} ${x === 1 ? tr("gaură") : tr("găuri")} de ax` : ""].filter(Boolean).join(tr(" și "));
  };
  function unghiPanta(d: { placi?: number; buza?: number; adanc?: number; sus?: number }): number {
    const H = d.placi! * 3.2, buza = Math.min(Math.max(0.8, d.buza!), H - 0.8);
    return Math.atan2(H - buza, 8 * (d.adanc! - d.sus!) - 0.1) * 180 / Math.PI;
  }
  function defCurenta(): Def {
    // copia JSON a câmpurilor editorului: netipizată (din JSON.parse), ca în stocare; ce iese din ea se verifică la motor
    const t = stare.tip as Exclude<keyof typeof stare, "tip"> | "calibrare";
    if (t === "calibrare") return { tip: "calibrare" };
    const p = JSON.parse(JSON.stringify(stare[t]));
    if (t === "caramida") {
      const minI = Math.min(...p.celule.map((c: number[]) => c[0])), minJ = Math.min(...p.celule.map((c: number[]) => c[1]));
      // doar gaurile care au material de jur imprejur; cele laterale doar la o caramida dreapta 1 x n
      p.gauri = gauriCaramida(p).map(([a, b, x]) => [a - minI, b - minJ, x]);
      p.celule = p.celule.map(([i, j]: number[]) => [i! - minI, j! - minJ]);
      const nl = pozitiiLaterale(p);
      p.laterale = nl ? Array.from({ length: nl }, (_, k) => (["r", "x"].includes(p.laterale && p.laterale[k]) ? p.laterale[k] : "p")) : [];
      if (!p.laterale.some((x: string) => x !== "p")) delete p.laterale;
      if (!p.gauri.length) delete p.gauri;
      if (!p.goale || p.stifturi !== true) delete p.goale;
      delete p.cols; delete p.rows; delete p.mod;
    }
    if (t === "pana") {
      const loc = new Set(Lego.pozitiiGauriPana(p).map(([a, b]) => cheie(a, b)));
      p.gauri = (p.gauri || []).filter(([a, b]: Gaura) => loc.has(cheie(a, b))).sort((x: Gaura, y: Gaura) => x[1] - y[1] || x[0] - y[0]);
      if (!p.gauri.length) delete p.gauri;
    }
    if (t === "rotund" && (!p.gaura || p.gaura === "nu" || (+p.diam === 1 && p.gaura !== "bara"))) delete p.gaura;
    if (t === "grinda" && p.fel === "indoita") {
      const n = p.brate.reduce((a: number, b: number) => a + b, 0) - p.brate.length + 1;
      return { tip: t, indoita: { brate: p.brate.slice(), unghiuri: p.unghiuri.slice(0, p.brate.length - 1) }, gauri: Array.from({ length: n }, (_, k) => (["r", "x", "p"].includes(p.gauriInd[k]) ? p.gauriInd[k] : "r")), groasa: p.groasa };
    }
    if (t === "grinda") {
      const minI = Math.min(...p.celule.map((c: Gaura) => c[0])), minJ = Math.min(...p.celule.map((c: Gaura) => c[1]));
      p.celule = p.celule.map(([i, j, x]: Gaura) => [i - minI, j - minJ, x]).sort((a: Gaura, b: Gaura) => a[1] - b[1] || a[0] - b[0]);
      delete p.cols; delete p.rows; delete p.unealta; delete p.gauri; delete p.fel; delete p.brate; delete p.unghiuri; delete p.gauriInd;
    }
    if (t === "caramidaTechnic") { p.gauri = Array.from({ length: p.lung === 1 ? 1 : p.lung - 1 }, (_, k) => (["r", "x", "p"].includes(p.gauri && p.gauri[k]) ? p.gauri[k]! : "r")); if (!p.goale) delete p.goale; }
    if (t === "stiftTechnic") { if (+p.lung !== 3) delete p.lung; if (p.capat !== "ax") delete p.capat; }
    return { tip: t, ...p };
  }
  function gauriCaramida(p: { celule: readonly (readonly [number, number, ...unknown[]])[]; gauri?: readonly Gaura[]; stifturi?: boolean | string }): Gaura[] {
    // gaurile verticale [i, j, tip] din colturile celulelor, doar unde sunt patru celule in jur
    const S = new Set(p.celule.map(([i, j]) => cheie(i, j))), are = (i: number, j: number) => S.has(cheie(i, j));
    return (p.gauri || []).filter(([a, b]) => are(a - 1, b - 1) && are(a, b - 1) && are(a - 1, b) && are(a, b) && !subStiftMijloc(p, a, b))
      .sort((x, y) => x[1] - y[1] || x[0] - y[0]);
  }
  function subStiftMijloc(p: { celule: readonly (readonly [number, number, ...unknown[]])[]; stifturi?: boolean | string }, a: number, b: number) {
    // sub stiftul din mijloc (placa „jumper”) nu poate fi gaura: motorul o lasa pe dinafara
    if (p.stifturi !== "mijloc" || !p.celule.length) return false;
    const mx = p.celule.reduce((t, [i]) => t + i + 0.5, 0) / p.celule.length, my = p.celule.reduce((t, [, j]) => t + j + 0.5, 0) / p.celule.length;
    return Math.hypot(a - mx, b - my) * 8 <= 5.2;
  }
  function pozitiiLaterale(p: { celule: readonly (readonly [number, number, ...unknown[]])[]; placi?: number }) {
    // cate gauri laterale are o caramida dreapta 1 x n, de 3 placi (altfel 0)
    if (p.placi !== 3 || !p.celule.length) return 0;
    const xs = new Set(p.celule.map(c => c[0])), ys = new Set(p.celule.map(c => c[1])), n = p.celule.length;
    const drept = (ys.size === 1 && xs.size === n && Math.max(...xs) - Math.min(...xs) === n - 1) || (xs.size === 1 && ys.size === n && Math.max(...ys) - Math.min(...ys) === n - 1);
    return drept ? (n === 1 ? 1 : n - 1) : 0;
  }
  const paramMotor = () => ({ varianta_stift: setari.varianta_stift, varianta_locas: setari.varianta_locas, varianta_gaura: setari.varianta_gaura, varianta_ax: setari.varianta_ax,
    varianta_bara: setari.varianta_bara, varianta_cupa: setari.varianta_cupa,
    pat: setari.pat.slice() as [number, number], pat_margine: setari.pat_margine, pat_distanta: setari.pat_distanta });
  const dimTri = (tri: readonly Tri[]): number[] => [0, 1, 2].map(k => { let m = 0; for (const t of tri) for (const p of t) if (p[k]! > m) m = p[k]!; return m; });
  function pieseDin(def: Def): PiesaGata[] {
    Lego.seteaza(paramMotor());
    if (def.tip === "calibrare") return Lego.calibrare().map(c => ({ nume: c.nume, titlu: c.titlu, tri: c.tri, dim: dimTri(c.tri) }));
    const r = Lego.construieste(def as Parameters<typeof Lego.construieste>[0]);
    return [{ nume: slug(numeDef(def)), titlu: numeDef(def), tri: r.tri, dim: r.dim, baza: r.baza, avert: r.avert, unghi: r.unghi, stifturi: r.stifturi, locasuri: r.locasuri, deschise: r.deschise }];
  }
  const slug = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/×/g, "x").replace(/°/g, "").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "").toLowerCase();

  // --------------------------------------------------------------------------- piesele circuitului
  // Le da planul 2D (window.TrenPentru3D): ce se printeaza din circuitul deschis, cu setarile din Export CNC.
  let tren: { cheie: string | null; titlu: string; piese: PiesaTren[]; eroare: string | null } = { cheie: null, titlu: "", piese: [], eroare: null };
  function pieseTren() {
    const sursa = window.TrenPentru3D;
    if (!sursa) return tren;
    try {
      const c = sursa.cheie();
      if (c === tren.cheie) return tren;
      const r = sursa.piese();
      // gramele, socotite ca in devizul din 2D (aceeasi coaja), ca cele doua sa spuna la fel
      const gr = (p: { tri: Tri[]; umplere: number }) => (window.TrenCNC && TrenCNC.grameFilament ? TrenCNC.grameFilament(Lego.stl(p.tri), p.umplere) : Lego.grame(p.tri, p.umplere));
      tren = { cheie: c, titlu: r.titlu, piese: r.piese.map(p => ({ ...p, dim: dimTri(p.tri), g: gr(p) })), eroare: null };
    } catch (e) { tren = { cheie: null, titlu: "", piese: [], eroare: tr`Nu am putut face piesele circuitului: ${(e as Error).message || e}` }; }
    return tren;
  }

  // --------------------------------------------------------------------------- editorul
  function editor() {
    const t = stare.tip, e = $("#at-editor");
    if (t === "caramida") {
      const p = stare.caramida;
      e.innerHTML = `<h2>Forma, pe grila de știfturi</h2>
        <p class="mic">Atinge sau trage peste pătrățele ca să le pui ori să le scoți. Un pătrățel e un știft (8 mm).</p>
        <div class="sabloane" id="at-sabloane">${[[1, 1], [1, 2], [1, 3], [1, 4], [1, 6], [1, 8], [2, 2], [2, 3], [2, 4], [2, 6], [2, 8], [4, 4], [6, 6]].map(([a, b]) => `<button class="btn" type="button" data-sablon="${a}x${b}">${a}×${b}</button>`).join("")}
          <button class="btn" type="button" data-sablon="L">L</button><button class="btn" type="button" data-sablon="T">T</button><button class="btn" type="button" data-sablon="gol">Golește</button></div>
        <div class="at-rand"><span class="mic">Desenezi:</span>
          <div class="segment" id="at-mod-grila"><button type="button" data-mod="forma" aria-pressed="${p.mod !== "gauri"}">Forma</button><button type="button" data-mod="gauri" aria-pressed="${p.mod === "gauri"}">Găuri</button></div></div>
        ${p.mod === "gauri" ? `<p class="mic">Atinge un punct dintre știfturi: gaură rotundă (pentru știft Technic), apoi în cruce (pentru ax), apoi fără. Găurile merg doar unde sunt patru pătrățele în jur; trec prin toată piesa, ca la plăcile Technic.</p>
        <div id="at-car-nota"></div>
        <div class="sabloane" id="at-gauri-toate"><button class="btn" type="button" data-toate="r">Toate rotunde</button><button class="btn" type="button" data-toate="x">Toate de ax</button><button class="btn" type="button" data-toate="">Fără găuri</button></div>` : ""}
        <div class="grila" id="at-grila"></div>
        <div class="at-rand"><span class="mic">Grila:</span>
          <button class="btn" type="button" data-grila="c-">− coloană</button><button class="btn" type="button" data-grila="c+">+ coloană</button>
          <button class="btn" type="button" data-grila="r-">− rând</button><button class="btn" type="button" data-grila="r+">+ rând</button></div>
        <div class="at-rand"><span class="mic">Înălțime:</span>
          <div class="segment" id="at-inaltime">${[[1, "Placă"], [2, "2 plăci"], [3, "Cărămidă"], [6, "Dublă"]].map(([v, x]) => `<button type="button" data-placi="${v}" aria-pressed="${p.placi === v}">${x}</button>`).join("")}</div>
          <label class="mic at-rand" for="at-placi">${tr("plăci", "LEGO")} <input id="at-placi" type="number" min="1" max="12" step="1" value="${p.placi}" class="camp-70"></label></div>
        <div class="at-rand"><span class="mic">Știfturi sus:</span>
          <div class="segment" id="at-stifturi">${[["da", "Toate"], ["mijloc", "Unul, la mijloc"], ["nu", "Fără (netedă)"]].map(([v, x]) => `<button type="button" data-st="${v}" aria-pressed="${(p.stifturi === "mijloc" ? "mijloc" : p.stifturi ? "da" : "nu") === v}">${x}</button>`).join("")}</div></div>
        <div class="at-rand"><span class="mic">Dedesubt:</span>
          <div class="segment" id="at-fund"><button type="button" data-fund="tuburi" aria-pressed="${p.fund === "tuburi"}">Gol, cu tuburi</button><button type="button" data-fund="locasuri" aria-pressed="${p.fund === "locasuri"}">Plin, cu locașuri</button></div></div>
        ${p.stifturi === true ? `<label class="bifa"><input type="checkbox" id="at-goale" ${p.goale ? "checked" : ""}> Știfturi goale: o gaură de Ø 3,4 prin fiecare, pentru o bară de 3,2 (antenă, balustradă, mâner)</label>` : ""}
        <div id="at-car-laterale"></div>
        <p class="mic">Un știft la mijloc (placa „jumper”) mută piesa de deasupra cu o jumătate de știft: așa centrezi o carlingă sau un nas pe un fuselaj lat de 2.</p>
        <p class="mic">„Gol, cu tuburi” e ca la LEGO. „Plin, cu locașuri” e mai rezistent și se printează mai ușor (fiecare știft de dedesubt intră într-un locaș rotund), dar se prinde doar drept pe știfturi, nu și decalat.</p>`;
      deseneazaGrila();
      $("#at-mod-grila").onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-mod]"); if (!b) return; p.mod = b.dataset.mod!; editor(); };
      if ($("#at-gauri-toate")) $("#at-gauri-toate").onclick = ev => {
        const b = (ev.target as Element).closest<HTMLElement>("[data-toate]"); if (!b) return;
        p.gauri = b.dataset.toate ? intersectiiInterioare(p).map(([a, c]): Gaura => [a, c, b.dataset.toate!]) : [];
        deseneazaGrila(); schimbat();
      };
      if ($("#at-goale")) $("#at-goale").onchange = ev => { p.goale = (ev.target as HTMLInputElement).checked; schimbat(); };

      $("#at-sabloane").onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-sablon]"); if (b) sablon(b.dataset.sablon!); };
      e.querySelectorAll<HTMLElement>("[data-grila]").forEach(b => { b.onclick = () => schimbaGrila(b.dataset.grila!); });
      $("#at-inaltime").onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-placi]"); if (!b) return; p.placi = +b.dataset.placi!; editor(); schimbat(); };
      $("#at-placi").onchange = ev => { const v = Math.round(+(ev.target as HTMLInputElement).value); if (v >= 1 && v <= 12) { p.placi = v; editor(); schimbat(); } };
      $("#at-stifturi").onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-st]"); if (!b) return; p.stifturi = b.dataset.st === "mijloc" ? "mijloc" : b.dataset.st === "da"; editor(); schimbat(); };
      $("#at-fund").onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-fund]"); if (!b) return; p.fund = b.dataset.fund!; editor(); schimbat(); };
    } else if (t === "panta" || t === "pantaInversa") {
      const p = stare[t as "panta"], inv = t === "pantaInversa";
      e.innerHTML = `<h2>${inv ? "Pantă inversă" : "Pantă"}</h2>
        <p class="mic">${inv ? "Sus e plină, cu știfturi peste tot; dedesubt, rândurile din spate stau pe știfturi, iar în față piesa urcă spre buză (burta avionului, botul de jos). Se printează în picioare: sub 45° fața de dedesubt cere suport." : "Rândurile din spate au știfturi; în față piesa coboară până la buză. Cu un rând înclinat și înălțimea unei cărămizi iese panta de 45°; cu mai multe rânduri, mai lină. Curbă: urcă rotunjit, ca un bot de avion sau carlinga; fără rânduri cu știfturi, toată piesa e curbă."}</p>
        ${inv ? "" : `<div class="at-rand"><span class="mic">Profil:</span><div class="segment" id="at-p-profil"><button type="button" data-profil="drept" aria-pressed="${p.profil !== "curb"}">Drept</button><button type="button" data-profil="curb" aria-pressed="${p.profil === "curb"}">Curb</button></div></div>`}
        <div class="at-campuri">
          <label for="at-p-lung">Lată (știfturi)<input id="at-p-lung" type="number" min="1" max="16" step="1" value="${p.lung}"></label>
          <label for="at-p-adanc">Adâncă (rânduri)<input id="at-p-adanc" type="number" min="2" max="8" step="1" value="${p.adanc}"></label>
          <label for="at-p-sus">${tr`Rânduri ${inv ? tr("pline dedesubt") : tr("cu știfturi")}`}<input id="at-p-sus" type="number" min="${inv ? 1 : 0}" max="7" step="1" value="${p.sus}"></label>
          <label for="at-p-placi">Înălțime (plăci)<input id="at-p-placi" type="number" min="2" max="12" step="1" value="${p.placi}"></label>
          <label for="at-p-buza">Buza din față (mm)<input id="at-p-buza" type="number" min="0.8" max="6" step="0.1" value="${p.buza}"></label>
        </div>
        <p class="mic" id="at-p-unghi"></p>`;
      const LIM: Record<string, [number, number]> = { lung: [1, 16], adanc: [2, 8], sus: [inv ? 1 : 0, 7], placi: [2, 12], buza: [0.8, 6] };
      for (const k of ["lung", "adanc", "sus", "placi", "buza"]) $("#at-p-" + k).onchange = ev => {
        const t = String((ev.target as HTMLInputElement).value).trim().replace(",", ".");
        let v = +t;
        if (t === "" || !Number.isFinite(v)) { (ev.target as CampNumeric).value = (p as unknown as Record<string, number>)[k]!; return; }
        if (k !== "buza") v = Math.round(v);
        v = Math.min(LIM[k]![1], Math.max(LIM[k]![0], v));
        (p as unknown as Record<string, number>)[k] = v; (ev.target as CampNumeric).value = v;
        p.sus = Math.max(inv ? 1 : 0, Math.min(p.sus, p.adanc - 1)); $<CampNumeric>("#at-p-sus").value = p.sus; schimbat();
      };
      if (!inv) $("#at-p-profil").onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-profil]"); if (!b) return; p.profil = b.dataset.profil!; editor(); schimbat(); };
    } else if (t === "pana") {
      const p = stare.pana, ic = (d: string) => `<svg viewBox="0 0 26 16" width="26" height="16" aria-hidden="true"><path d="${d}" fill="currentColor"/></svg>`;
      const SABL = [["Pană 4×2", 4, 2, 0, 0, "stanga"], ["Aripă 6×3", 6, 3, 1, 0, "stanga"], ["Aripă 8×4", 8, 4, 1, 1, "stanga"], ["Aripă 12×6", 12, 6, 1, 2, "stanga"],
        ["Colț 2×2", 2, 2, 1, 1, "stanga"], ["Colț 4×4", 4, 4, 2, 2, "stanga"], ["Vârf 2×2", 2, 2, 0, 0, "ambele"], ["Vârf 4×4", 4, 4, 0, 0, "ambele"], ["Nas 6×4", 6, 4, 1, 2, "ambele"]];
      e.innerHTML = `<h2>Pană: aripi, colțuri tăiate, vârfuri</h2>
        <p class="mic">O placă (sau cărămidă) cu o latură tăiată oblic. Lungimea merge de la rădăcină, latura plină, spre vârf. „Vârf” e câte știfturi rămân la capăt (0 = ascuțit), iar „Taie de la” e știftul de unde începe tăietura. Știfturile de sus sunt doar unde încap întregi. Dedesubt, locașurile întregi prind știfturile; lângă marginea oblică sunt deschise într-o parte, ca piesa să stea pe orice știft de sub ea.</p>
        <div class="sabloane" id="at-pana-sabloane">${SABL.map(([n, ...v]) => `<button class="btn" type="button" data-pana="${v.join(",")}">${n}</button>`).join("")}</div>
        <div class="at-campuri">
          <label for="at-n-lung">Lungime (știfturi)<input id="at-n-lung" type="number" min="1" max="24" step="1" value="${p.lung}"></label>
          <label for="at-n-lat">Lățime (știfturi)<input id="at-n-lat" type="number" min="1" max="24" step="1" value="${p.lat}"></label>
          <label for="at-n-varf">Vârf (știfturi)<input id="at-n-varf" type="number" min="0" max="${p.lat}" step="0.5" value="${p.varf}"></label>
          <label for="at-n-inceput">Taie de la (știftul)<input id="at-n-inceput" type="number" min="0" max="${p.lung - 1}" step="1" value="${p.inceput}"></label>
        </div>
        <div class="at-rand"><span class="mic">Tăiată:</span>
          <div class="segment" id="at-pana-parte">${[["stanga", "Stânga", "M1 14 L25 14 L1 2 Z"], ["dreapta", "Dreapta", "M1 2 L25 2 L1 14 Z"], ["ambele", "Vârf", "M1 2 L25 8 L1 14 Z"]]
            .map(([v, x, d]) => `<button type="button" data-parte="${v}" aria-pressed="${p.parte === v}" title="${x}">${ic(d!)} ${x}</button>`).join("")}</div></div>
        <div class="at-rand"><span class="mic">Înălțime:</span>
          <div class="segment" id="at-pana-inaltime">${[[1, "Placă"], [2, "2 plăci"], [3, "Cărămidă"]].map(([v, x]) => `<button type="button" data-placi="${v}" aria-pressed="${p.placi === v}">${x}</button>`).join("")}</div></div>
        <label class="bifa"><input type="checkbox" id="at-pana-stifturi" ${p.stifturi !== false ? "checked" : ""}> Cu știfturi sus (fără: netedă, ca un tile)</label>
        ${p.parte !== "ambele" ? `<div class="at-rand"><button class="btn" type="button" id="at-pereche">Adaugă perechea în listă (stânga + dreapta)</button><span class="mic">pentru două aripi oglindite</span></div>` : ""}
        <p class="mic" id="at-pana-info"></p>
        <h3>Găuri verticale</h3>
        <p class="mic">Pentru un știft Technic sau un ax (de exemplu ca să prinzi aripa de o grindă). Atinge un punct dintre știfturi: rotundă → în cruce → fără. Apar doar unde e loc destul până la margine.</p>
        <div class="grila" id="at-pana-plan"></div>`;
      $("#at-pana-sabloane").onclick = ev => {
        const b = (ev.target as Element).closest<HTMLElement>("[data-pana]"); if (!b) return;
        const [lung, lat, varf, inceput, parte] = b.dataset.pana!.split(",");
        Object.assign(p, { lung: +lung!, lat: +lat!, varf: +varf!, inceput: +inceput!, parte }); editor(); schimbat();
      };
      for (const k of ["lung", "lat", "varf", "inceput"]) $("#at-n-" + k).onchange = ev => {
        let v = +String((ev.target as HTMLInputElement).value).replace(",", "."); if (!Number.isFinite(v)) return;
        v = k === "varf" ? Math.round(v * 2) / 2 : Math.round(v);
        (p as unknown as Record<string, number>)[k] = v; p.lung = Math.max(1, Math.min(24, p.lung)); p.lat = Math.max(1, Math.min(24, p.lat));
        p.varf = Math.max(0, Math.min(p.lat, p.varf)); p.inceput = Math.max(0, Math.min(p.lung - 1, p.inceput));
        editor(); schimbat();
      };
      $("#at-pana-parte").onclick = ev => {
        const b = (ev.target as Element).closest<HTMLElement>("[data-parte]"); if (!b) return;
        // din stanga in dreapta (si invers) gaurile se oglindesc odata cu pana
        const lr = (x: string) => x === "stanga" || x === "dreapta";
        if (lr(p.parte) && lr(b.dataset.parte!) && p.parte !== b.dataset.parte && p.gauri) p.gauri = p.gauri.map(([a, c, t]) => [a, p.lat - c, t]);
        p.parte = b.dataset.parte!; editor(); schimbat();
      };
      $("#at-pana-inaltime").onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-placi]"); if (!b) return; p.placi = +b.dataset.placi!; editor(); schimbat(); };
      $("#at-pana-stifturi").onchange = ev => { p.stifturi = (ev.target as HTMLInputElement).checked; schimbat(); };
      if ($("#at-pereche")) $("#at-pereche").onclick = adaugaPereche;
      deseneazaPlanPana();
    } else if (t === "rotund") {
      const p = stare.rotund, unu = +p.diam === 1;
      const SABL = [["Placă rotundă 1×1", 1, 1, "cilindru", 5.4, "toate"], ["Cărămidă rotundă 1×1", 1, 3, "cilindru", 5.4, "toate"], ["Con 1×1", 1, 3, "con", 5.4, "toate"],
        ["Nas ascuțit", 1, 3, "con", 1.2, "niciunul"], ["Placă rotundă 2×2", 2, 1, "cilindru", 5.4, "toate"], ["Cărămidă rotundă 2×2", 2, 3, "cilindru", 5.4, "toate"], ["Con 2×2 (motor)", 2, 6, "con", 5.4, "unul"]];
      e.innerHTML = `<h2>Rotund și con</h2>
        <p class="mic">Piese de 1×1 sau 2×2: cilindru (placă sau cărămidă rotundă) sau con (nas, vârf de rachetă, ajutajul motorului). Dedesubt, 1×1 are un locaș; 2×2 are tubul din mijloc, care prinde cele patru știfturi, și patru fuste scurte între ele.</p>
        <div class="sabloane" id="at-rot-sabloane">${SABL.map(([n, ...v]) => `<button class="btn" type="button" data-rot="${v.join(",")}">${n}</button>`).join("")}</div>
        <div class="at-rand"><span class="mic">Mărime:</span><div class="segment" id="at-rot-diam">${[1, 2].map(v => `<button type="button" data-diam="${v}" aria-pressed="${+p.diam === v}">${v}×${v}</button>`).join("")}</div>
          <span class="mic">Forma:</span><div class="segment" id="at-rot-forma"><button type="button" data-forma="cilindru" aria-pressed="${p.forma !== "con"}">Cilindru</button><button type="button" data-forma="con" aria-pressed="${p.forma === "con"}">Con</button></div></div>
        <div class="at-campuri">
          <label for="at-r-placi-rot">Înălțime (plăci)<input id="at-r-placi-rot" type="number" min="1" max="12" step="1" value="${p.placi}"></label>
          ${p.forma === "con" ? `<label for="at-r-varf">Ø vârf (mm)<input id="at-r-varf" type="number" min="1" max="${unu ? 7.8 : 15.8}" step="0.1" value="${p.varf_d}"></label>` : ""}
        </div>
        <div class="at-rand"><span class="mic">Știfturi sus:</span><div class="segment" id="at-rot-st">${(unu ? [["toate", "Unul"], ["niciunul", "Fără"]] : [["toate", "Patru"], ["unul", "Unul, la mijloc"], ["niciunul", "Fără"]])
          .map(([v, x]) => `<button type="button" data-st="${v}" aria-pressed="${(unu && p.stifturi === "unul" ? "toate" : p.stifturi) === v}">${x}</button>`).join("")}</div></div>
        <div class="at-rand"><span class="mic">Gaura din mijloc:</span><div class="segment" id="at-rot-gaura">${(unu ? [["nu", "Fără"], ["bara", "Pentru bară"]] : [["nu", "Fără"], ["bara", "Pentru bară"], ["stift", "Pentru știft"], ["ax", "Pentru ax"]])
          .map(([v, x]) => `<button type="button" data-g="${v}" aria-pressed="${(unu && p.gaura !== "bara" ? "nu" : p.gaura || "nu") === v}">${x}</button>`).join("")}</div></div>
        <p class="mic">Un con poartă un știft doar dacă vârful are cel puțin 5,4 mm; conul 2×2 are un singur știft, în mijloc, ca la LEGO. Gaura din mijloc trece prin toată piesa: pentru bară (Ø 3,4, știftul de sus rămâne gol, ca la conul LEGO 1×1), pentru un știft Technic sau pentru ax (la 2×2, prin tubul de dedesubt).</p>`;
      $("#at-rot-sabloane").onclick = ev => {
        const b = (ev.target as Element).closest<HTMLElement>("[data-rot]"); if (!b) return;
        const [diam, placi, forma, varf_d, st] = b.dataset.rot!.split(",");
        Object.assign(p, { diam: +diam!, placi: +placi!, forma, varf_d: +varf_d!, stifturi: st }); editor(); schimbat();
      };
      $("#at-rot-diam").onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-diam]"); if (!b) return; p.diam = +b.dataset.diam!; p.varf_d = Math.min(p.varf_d, p.diam * 8 - 0.2); editor(); schimbat(); };
      $("#at-rot-forma").onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-forma]"); if (!b) return; p.forma = b.dataset.forma!; editor(); schimbat(); };
      $("#at-rot-st").onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-st]"); if (!b) return; p.stifturi = b.dataset.st!; editor(); schimbat(); };
      $("#at-rot-gaura").onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-g]"); if (!b) return; p.gaura = b.dataset.g!; editor(); schimbat(); };
      $("#at-r-placi-rot").onchange = ev => { const v = Math.round(+(ev.target as HTMLInputElement).value); if (v >= 1 && v <= 12) { p.placi = v; schimbat(); } };
      if ($("#at-r-varf")) $("#at-r-varf").onchange = ev => { const v = +String((ev.target as HTMLInputElement).value).replace(",", "."); if (Number.isFinite(v) && v >= 1) { p.varf_d = Math.min(v, p.diam * 8 - 0.2); schimbat(); } };
    } else if (t === "grinda" && stare.grinda.fel === "indoita") {
      const p = stare.grinda, n = p.brate.reduce((a, b) => a + b, 0) - p.brate.length + 1;
      p.gauriInd = Array.from({ length: n }, (_, k) => (["r", "x", "p"].includes(p.gauriInd[k]!) ? p.gauriInd[k]! : "r"));
      const SABL: [string, number[], number[]][] = [["1×9 (6–4)", [6, 4], [53.13]], ["1×9 (7–3)", [7, 3], [53.13]], ["1×7 (4–4)", [4, 4], [53.13]], ["1×6 (3–4)", [3, 4], [53.13]], ["Dublă 4–4–4", [4, 4, 4], [45, 45]], ["Zigzag 3–4–3", [3, 4, 3], [53.13, -53.13]]];
      e.innerHTML = `<h2>Grindă Technic îndoită</h2>
        <p class="mic">Două sau trei brațe drepte, cu cotul într-o gaură (numărată la ambele brațe, ca la LEGO: „6–4” are 9 găuri). LEGO le îndoaie la 53,13° (triunghiul 3-4-5), ca găurile să cadă tot pe grila de 8 mm; poți alege și alt unghi. Unghi pozitiv: cotul spre stânga; negativ: spre dreapta.</p>
        <div class="at-rand"><span class="mic">Forma:</span>${seg("at-gr-fel", [["grila", "Pe grilă"], ["indoita", "Îndoită"]], "indoita")}</div>
        <div class="sabloane" id="at-gi-sabloane">${SABL.map(([nm, b, u], k) => `<button class="btn" type="button" data-gi="${k}">${nm}</button>`).join("")}</div>
        <div class="at-campuri">
          ${p.brate.map((b, k) => `<label for="at-gi-b${k}">${tr`Brațul ${k + 1} (găuri)`}<input id="at-gi-b${k}" data-gib="${k}" type="number" min="2" max="15" step="1" value="${b}"></label>`).join("")}
          ${p.unghiuri.slice(0, p.brate.length - 1).map((u, k) => `<label for="at-gi-u${k}">${tr`Cotul ${k + 1} (°)`}<input id="at-gi-u${k}" data-giu="${k}" type="number" min="-120" max="120" step="0.01" value="${u}"></label>`).join("")}
        </div>
        <label class="bifa"><input type="checkbox" id="at-gi-trei" ${p.brate.length === 3 ? "checked" : ""}> Încă un cot (trei brațe)</label>
        <div class="gauri" id="at-gi-gauri">${p.gauriInd.map((g, k) => `<button type="button" data-k="${k}" data-t="${g}" aria-label="${tr`Gaura ${k + 1}: ${g === "r" ? tr("rotundă") : g === "x" ? tr("în cruce") : tr("plină")}`}">${g === "r" ? "○" : g === "x" ? "+" : "■"}</button>`).join("")}</div>
        <div class="at-rand"><span class="mic">Grosime:</span><div class="segment" id="at-grosime"><button type="button" data-g="1" aria-pressed="${p.groasa}">Groasă 7,8</button><button type="button" data-g="0" aria-pressed="${!p.groasa}">Subțire 3,8</button></div></div>
        <p class="mic">Găurile în cruce de la cot stau pe bisectoarea cotului; celelalte, de-a lungul brațului lor.</p>`;
      $("#at-gr-fel").onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-v]"); if (!b) return; p.fel = b.dataset.v!; editor(); schimbat(); };
      $("#at-gi-sabloane").onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-gi]"); if (!b) return; const [, br, u] = SABL[+b.dataset.gi!]!; p.brate = br.slice(); p.unghiuri = u.slice(); p.gauriInd = []; editor(); schimbat(); };
      e.querySelectorAll<CampNumeric>("[data-gib]").forEach(el => { el.onchange = () => { const v = Math.round(+el.value); if (v >= 2 && v <= 15) { p.brate[+el.dataset.gib!] = v; editor(); schimbat(); } else el.value = p.brate[+el.dataset.gib!]!; }; });
      e.querySelectorAll<CampNumeric>("[data-giu]").forEach(el => { el.onchange = () => { const v = +String(el.value).replace(",", "."); if (Number.isFinite(v) && v >= -120 && v <= 120) { p.unghiuri[+el.dataset.giu!] = Math.round(v * 100) / 100; schimbat(); } else el.value = p.unghiuri[+el.dataset.giu!]!; }; });
      $("#at-gi-trei").onchange = ev => { if ((ev.target as HTMLInputElement).checked) { p.brate = [p.brate[0]!, p.brate[1]!, 4]; p.unghiuri = [p.unghiuri[0]!, p.unghiuri[1] !== undefined ? p.unghiuri[1] : p.unghiuri[0]!]; } else { p.brate = p.brate.slice(0, 2); p.unghiuri = p.unghiuri.slice(0, 1); } editor(); schimbat(); };
      $("#at-gi-gauri").onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-k]"); if (!b) return; const k = +b.dataset.k!; p.gauriInd[k] = ({ r: "x", x: "p", p: "r" } as Record<string, string>)[p.gauriInd[k]!]!; editor(); schimbat(); };
      $("#at-grosime").onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-g]"); if (!b) return; p.groasa = b.dataset.g === "1"; editor(); schimbat(); };
    } else if (t === "grinda") {
      const p = stare.grinda;
      const SABL = [["Dreaptă 3", "3"], ["5", "5"], ["7", "7"], ["9", "9"], ["11", "11"], ["15", "15"], ["L 2×4", "L24"], ["L 3×5", "L35"], ["T 3×3", "T"], ["Cruce 3×3", "cruce"], ["H 3×5", "H"], ["Ramă 3×3", "rama3"], ["Ramă 5×7", "rama57"]];
      e.innerHTML = `<h2>Grindă Technic, de orice formă</h2>
        <p class="mic">Fiecare pătrățel e o gaură; găurile vecine pe grilă se leagă cu grindă (8 mm între ele, ca la LEGO). Alegi ce pui, apoi atingi sau tragi peste grilă: rotundă (pentru știft), în cruce (pentru ax, se rotește odată cu el), plină sau ștergi.</p>
        <div class="at-rand"><span class="mic">Forma:</span>${seg("at-gr-fel", [["grila", "Pe grilă"], ["indoita", "Îndoită"]], "grila")}</div>
        <div class="sabloane" id="at-gr-sabloane">${SABL.map(([n, v]) => `<button class="btn" type="button" data-gr="${v}">${n}</button>`).join("")}</div>
        <div class="at-rand"><span class="mic">Pui:</span><div class="segment" id="at-gr-unealta">${[["r", "○ Rotundă"], ["x", "+ Ax"], ["p", "■ Plină"], ["sterge", "Șterg"]].map(([v, x]) => `<button type="button" data-u="${v}" aria-pressed="${(p.unealta || "r") === v}">${x}</button>`).join("")}</div></div>
        <div class="grila" id="at-gr-grila"></div>
        <div class="at-rand"><span class="mic">Grila:</span>
          <button class="btn" type="button" data-ggr="c-">− coloană</button><button class="btn" type="button" data-ggr="c+">+ coloană</button>
          <button class="btn" type="button" data-ggr="r-">− rând</button><button class="btn" type="button" data-ggr="r+">+ rând</button></div>
        <div class="at-rand"><span class="mic">Grosime:</span><div class="segment" id="at-grosime"><button type="button" data-g="1" aria-pressed="${p.groasa}">Groasă 7,8</button><button type="button" data-g="0" aria-pressed="${!p.groasa}">Subțire 3,8</button></div></div>
        <p class="mic">Se printează culcată, cu găurile în sus: ies rotunde. Găurile rotunde ale grinzii groase au lamaj (Ø 6,4) pe ambele fețe, pentru gulerul știftului.</p>`;
      deseneazaGrinda();
      $("#at-gr-fel").onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-v]"); if (!b) return; p.fel = b.dataset.v!; editor(); schimbat(); };
      $("#at-gr-sabloane").onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-gr]"); if (b) sablonGrinda(b.dataset.gr!); };
      $("#at-gr-unealta").onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-u]"); if (!b) return; p.unealta = b.dataset.u!; editor(); };
      e.querySelectorAll<HTMLElement>("[data-ggr]").forEach(b => { b.onclick = () => {
        const op = b.dataset.ggr, maxI = Math.max(...p.celule.map(c => c[0])), maxJ = Math.max(...p.celule.map(c => c[1]));
        if (op === "c+" && p.cols < 22) p.cols++; if (op === "c-" && p.cols > maxI + 1 && p.cols > 2) p.cols--;
        if (op === "r+" && p.rows < 22) p.rows++; if (op === "r-" && p.rows > maxJ + 1 && p.rows > 1) p.rows--;
        deseneazaGrinda();
      }; });
      $("#at-grosime").onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-g]"); if (!b) return; p.groasa = b.dataset.g === "1"; editor(); schimbat(); };
    } else if (t === "caramidaTechnic") {
      const p = stare.caramidaTechnic, n = p.lung === 1 ? 1 : p.lung - 1;
      p.gauri = Array.from({ length: n }, (_, k) => (["r", "x", "p"].includes(p.gauri && p.gauri[k]!) ? p.gauri[k]! : "r"));
      e.innerHTML = `<h2>Cărămidă Technic</h2>
        <p class="mic">Cărămidă 1×n cu știfturi sus și găuri prin lateral, între știfturi (la 1×1, sub știft), la 5,8 mm de jos. Atinge o gaură ca s-o schimbi: rotundă cu lamaj pe ambele fețe (pentru știft), în cruce (pentru ax) sau plină. Se printează în picioare; găurile ies orizontale.</p>
        <div class="at-campuri"><label for="at-t-lung">Lungime (știfturi)<input id="at-t-lung" type="number" min="1" max="20" step="1" value="${p.lung}"></label></div>
        <div class="gauri" id="at-t-gauri">${p.gauri.map((g, k) => `<button type="button" data-k="${k}" data-t="${g}" aria-label="${tr`Gaura ${k + 1}: ${g === "r" ? tr("rotundă") : g === "x" ? tr("în cruce") : tr("plină")}`}">${g === "r" ? "○" : g === "x" ? "+" : "■"}</button>`).join("")}</div>
        <label class="bifa"><input type="checkbox" id="at-t-goale" ${p.goale ? "checked" : ""}> Știfturi goale (gaură de Ø 3,4 în fiecare știft, pentru bară), ca la LEGO Technic</label>`;
      $("#at-t-lung").onchange = ev => { const v = Math.round(+(ev.target as HTMLInputElement).value); if (v >= 1 && v <= 20) { p.lung = v; editor(); schimbat(); } else (ev.target as CampNumeric).value = p.lung; };
      $("#at-t-gauri").onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-k]"); if (!b) return; const k = +b.dataset.k!; p.gauri[k] = ({ r: "x", x: "p", p: "r" } as Record<string, string>)[p.gauri[k]!]!; editor(); schimbat(); };
      $("#at-t-goale").onchange = ev => { p.goale = (ev.target as HTMLInputElement).checked; schimbat(); };
    } else if (t === "lateral") {
      const p = stare.lateral;
      e.innerHTML = `<h2>Cărămidă cu știfturi pe lateral</h2>
        <p class="mic">Cărămidă 1×n cu știfturi și pe latura lungă (SNOT): prinzi piese culcate pe o parte, de exemplu prizele de aer sau aripile puse vertical. Știftul lateral e la 5,6 mm de jos, ca o placă prinsă în el să iasă la nivel cu fața de sus. Se printează în picioare.</p>
        <div class="at-campuri"><label for="at-l-lung">Lungime (știfturi)<input id="at-l-lung" type="number" min="1" max="8" step="1" value="${p.lung}"></label></div>
        <div class="at-rand"><span class="mic">Știfturi pe:</span><div class="segment" id="at-l-fete"><button type="button" data-fete="una" aria-pressed="${p.fete !== "doua"}">O latură</button><button type="button" data-fete="doua" aria-pressed="${p.fete === "doua"}">Două laturi</button></div></div>`;
      $("#at-l-lung").onchange = ev => { const v = Math.round(+(ev.target as HTMLInputElement).value); if (v >= 1 && v <= 8) { p.lung = v; schimbat(); } };
      $("#at-l-fete").onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-fete]"); if (!b) return; p.fete = b.dataset.fete!; editor(); schimbat(); };
    } else if (t === "ax") {
      const p = stare.ax;
      e.innerHTML = `<h2>Ax Technic</h2>
        <p class="mic">Axul în cruce (Ø 4,75, brațe de 1,75 mm, puțin mai subțiri decât la LEGO, ca să intre în găurile printate). Se printează culcat, pe un braț. Lungimea e în știfturi: axul 4 are 31,8 mm.</p>
        <div class="at-campuri"><label for="at-a-lung">Lungime (știfturi)<input id="at-a-lung" type="number" min="2" max="20" step="1" value="${p.lung}"></label></div>`;
      $("#at-a-lung").onchange = ev => { const v = Math.round(+(ev.target as HTMLInputElement).value); if (v >= 2 && v <= 20) { p.lung = v; schimbat(); } };
    } else if (t === "stiftTechnic") {
      const p = stare.stiftTechnic;
      e.innerHTML = `<h2>Știft Technic</h2>
        <p class="mic">Știftul de 2 (15,8 mm) are gulerul la mijloc; cel de 3 (23,8 mm), la un știft de un capăt, ca să lege trei grinzi. Cu ax, partea scurtă e în cruce: într-o parte se rotește, în cealaltă ține un ax sau o roată. Se printează culcat, pe o față teșită de 0,35 mm; fanta de la capetele rotunde îl face să se strângă în gaură.</p>
        <div class="at-rand"><span class="mic">Lungime:</span>${seg("at-s-lung", [["2", "2"], ["3", "3"]], String(p.lung || 2))}
          <span class="mic">Capătul scurt:</span>${seg("at-s-capat", [["stift", "Știft"], ["ax", "Ax"]], p.capat || "stift")}</div>
        <label class="bifa"><input type="checkbox" id="at-s-fanta" ${p.fanta ? "checked" : ""}> Cu fantă la capetele rotunde</label>`;
      $("#at-s-fanta").onchange = ev => { p.fanta = (ev.target as HTMLInputElement).checked; schimbat(); };
      $("#at-s-lung").onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-v]"); if (!b) return; p.lung = +b.dataset.v!; editor(); schimbat(); };
      $("#at-s-capat").onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-v]"); if (!b) return; p.capat = b.dataset.v!; editor(); schimbat(); };
    } else if (t === "bucsa") {
      const p = stare.bucsa;
      e.innerHTML = `<h2>Bucșă și conector de ax</h2>
        <p class="mic">Cilindru de Ø 7,2 cu gaură prin mijloc. Bucșa (½ sau 1) ține un ax pe loc, ca să nu iasă din grindă; conectorul (2 sau 3) leagă două axe cap la cap. Cu „Ax + știft”, o jumătate e în cruce și cealaltă rotundă. Se printează în picioare.</p>
        <div class="at-rand"><span class="mic">Lungime:</span>${seg("at-b-lung", [["0.5", "½"], ["1", "1"], ["2", "2"], ["3", "3"]], String(p.lung))}</div>
        <div class="at-rand"><span class="mic">Gaura:</span>${seg("at-b-gaura", [["x", "Pentru ax"], ["r", "Rotundă"], ["xr", "Ax + știft"]], p.gaura)}</div>`;
      $("#at-b-lung").onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-v]"); if (!b) return; p.lung = +b.dataset.v!; if (p.lung === 0.5 && p.gaura === "xr") p.gaura = "x"; editor(); schimbat(); };
      $("#at-b-gaura").onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-v]"); if (!b) return; p.gaura = b.dataset.v!; if (p.gaura === "xr" && p.lung === 0.5) p.lung = 1; editor(); schimbat(); };
    } else if (t === "suport") {
      const p = stare.suport;
      e.innerHTML = `<h2>Suport (bracket)</h2>
        <p class="mic">O placă culcată și una în picioare, în fața ei, cu știfturi spre înainte: prinzi piese pe o parte (SNOT), de exemplu un perete, o ușă, aripile verticale. Știfturile din față sunt la 4 mm de jos (apoi din 8 în 8), așa că o placă prinsă acolo ajunge cu marginea la nivel cu fundul suportului. Întors: placa culcată e sus și cea în picioare coboară; atunci cere suport la printare.</p>
        <div class="at-campuri">
          <label for="at-su-lung">Lățime (știfturi)<input id="at-su-lung" type="number" min="1" max="8" step="1" value="${p.lung}"></label>
          <label for="at-su-adanc">Placa culcată (rânduri)<input id="at-su-adanc" type="number" min="1" max="4" step="1" value="${p.adanc}"></label>
          <label for="at-su-inalt">Placa din față (rânduri)<input id="at-su-inalt" type="number" min="1" max="4" step="1" value="${p.inalt}"></label>
        </div>
        <label class="bifa"><input type="checkbox" id="at-su-invers" ${p.invers ? "checked" : ""}> Întors (placa culcată sus)</label>`;
      for (const [k, a, b] of [["lung", 1, 8], ["adanc", 1, 4], ["inalt", 1, 4]] as [string, number, number][]) $("#at-su-" + k).onchange = ev => { const v = Math.round(+(ev.target as HTMLInputElement).value); if (v >= a && v <= b) { (p as unknown as Record<string, number>)[k] = v; schimbat(); } else (ev.target as CampNumeric).value = (p as unknown as Record<string, number>)[k]!; };
      $("#at-su-invers").onchange = ev => { p.invers = (ev.target as HTMLInputElement).checked; schimbat(); };
    } else if (t === "clema" || t === "maner") {
      const p = stare[t as "clema"], cl = t === "clema";
      e.innerHTML = `<h2>${cl ? "Placă cu clemă" : "Placă cu mâner"}</h2>
        <p class="mic">${tr`${cl ? tr("O placă 1×n cu o clemă în față, care ține o bară de 3,2 (o bară printată, un mâner sau o bară LEGO). Bara stă fie în picioare (clema se printează ușor), fie culcată, de-a lungul plăcii (inelul clemei se printează în picioare).") : tr("O placă 1×n cu o bară de 3,2 în față, prinsă la capete: mânerul în care se prinde o clemă. Culcat, de-a lungul plăcii, sau în picioare.")} O clemă și un mâner cu bara la fel fac o balama: ${cl ? tr("clema") : tr("mânerul")} se rotește în jurul barei.`}</p>
        <div class="at-rand"><span class="mic">Lățime:</span>${seg("at-cm-lung", (cl ? [1, 2] : [1, 2, 3, 4]).map(v => [String(v), `1×${v}`]), String(p.lung))}</div>
        <div class="at-rand"><span class="mic">Bara stă:</span>${seg("at-cm-axa", [["verticala", "În picioare"], ["orizontala", "Culcată"]], p.axa)}</div>
        <div class="at-rand"><button class="btn" type="button" id="at-balama">Adaugă balamaua în listă (clema + mânerul)</button></div>`;
      $("#at-cm-lung").onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-v]"); if (!b) return; p.lung = +b.dataset.v!; editor(); schimbat(); };
      $("#at-cm-axa").onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-v]"); if (!b) return; p.axa = b.dataset.v!; editor(); schimbat(); };
      $("#at-balama").onclick = () => adaugaPerecheLegatura(t);
    } else if (t === "bara") {
      const p = stare.bara;
      e.innerHTML = `<h2>Bară</h2>
        <p class="mic">Bară de Ø 3,2, ca la LEGO: intră în clemă, în știfturile goale și în găurile pentru bară. Se printează culcată (teșită dedesubt cu 0,25 mm). Lungimea e în știfturi.</p>
        <div class="at-campuri"><label for="at-ba-lung">Lungime (știfturi)<input id="at-ba-lung" type="number" min="1" max="16" step="1" value="${p.lung}"></label></div>`;
      $("#at-ba-lung").onchange = ev => { const v = Math.round(+(ev.target as HTMLInputElement).value); if (v >= 1 && v <= 16) { p.lung = v; schimbat(); } else (ev.target as CampNumeric).value = p.lung; };
    } else if (t === "bila" || t === "cupa") {
      const p = stare[t as "bila"], bi = t === "bila";
      e.innerHTML = `<h2>${bi ? "Placă cu bilă" : "Placă cu cupă"}</h2>
        <p class="mic">${tr`${bi ? tr("O bilă de Ø 5,9 (cât bila LEGO) pe un gât de 3,2, în mijlocul unei plăci: împreună cu cupa face o articulație care se rotește în orice parte (un tren de aterizare, un braț, capul unui robot).") : tr("Cupa în care intră bila (de Ø 5,9, printată sau LEGO): o gaură sferică deschisă sus, cu patru fante, ca să se deschidă când apeși bila înăuntru.")} Le probezi întâi una cu alta: dacă bila intră prea greu, spune-mi și lărgesc cupa.`}</p>
        ${bi ? `<div class="at-rand"><span class="mic">Placa:</span>${seg("at-bc-baza", [["1", "1×1"], ["2", "2×2, cu știfturi"]], String(p.baza))}</div>` : ""}
        <div class="at-rand"><button class="btn" type="button" id="at-articulatie">Adaugă articulația în listă (bila + cupa)</button></div>`;
      if (bi) $("#at-bc-baza").onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-v]"); if (!b) return; p.baza = +b.dataset.v!; editor(); schimbat(); };
      $("#at-articulatie").onclick = () => adaugaPerecheLegatura(t);
    } else {
      e.innerHTML = `<h2>Calibrare: ce se potrivește pe imprimanta ta</h2>
        <p class="mic">Printate, știfturile ies de obicei puțin mai groase și găurile mai mici. Setul are câte cinci variante din fiecare; le încerci cu piese LEGO adevărate și scrii numărul celei mai bune.</p>
        <ol class="pasi">
          <li>Adaugă setul în listă și printează-l (cu aceleași setări ca piesele: PLA, strat de 0,2 mm, 3 perimetre).</li>
          <li><b>Știftul:</b> pune o cărămidă LEGO peste fiecare placă (1–5 cubulețe pe latură arată numărul). Alege-o pe cea pe care LEGO-ul se prinde ferm și se scoate ușor.</li>
          <li><b>Locașul:</b> apasă fiecare placă pe o cărămidă LEGO. Alege-o pe cea care se prinde ca un LEGO adevărat.</li>
          <li><b>Găurile:</b> bagă un știft Technic în grinda cu găuri rotunde și un ax în cea cu găuri în cruce. Gaura 1 e la capătul cu semnul. Alege gaura în care știftul intră strâns dar se rotește, iar axul intră fără joc.</li>
          <li><b>Clema și bara:</b> cinci plăci 1×1 cu clemă și știft gol (1–5 cubulețe pe spate). Prinde bara de probă (sau o bară LEGO) în clemă și bag-o în știftul gol. Alege placa la care clema se prinde cu un clic și se rotește pe bară, iar bara stă în știft.</li>
          <li><b>Cupa:</b> cinci plăci cu cupă. Apasă bila de probă în fiecare. Alege cupa în care bila intră apăsând, stă în orice poziție și nu iese singură.</li>
          <li>Scrie cele șase numere mai jos. Dacă cea mai bună e 1 sau 5, încearcă și 0 sau 6. Dacă ai mai multe imprimante, fă întâi câte o imprimantă (mai jos, la „Imprimanta și potrivirea pieselor”): fiecare își ține numerele ei.</li>
        </ol>
        <div class="at-campuri" id="at-calib-campuri"></div>`;
      campuriVariante($("#at-calib-campuri"));
    }
    if (eLegatura(t)) {
      // galeria pieselor de legatura, deasupra editorului
      e.insertAdjacentHTML("afterbegin", `<div class="leg-galerie" id="at-leg" role="group" aria-label="Piesele de legătură">${LEGATURI.map(([k, n]) =>
        `<button type="button" data-leg="${k}" aria-pressed="${k === t}">${n}</button>`).join("")}</div>`);
      $("#at-leg").onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-leg]"); if (b) { inlocuieste = null; alegeLegatura(b.dataset.leg!); } };
    }
  }
  const seg = (id: string, opt: readonly (readonly [string | number, string])[], cur: string | number) => `<div class="segment" id="${id}">${opt.map(([v, x]) => `<button type="button" data-v="${v}" aria-pressed="${String(cur) === v}">${x}</button>`).join("")}</div>`;
  function alegeLegatura(k: string) {
    if (k === "placaTechnic") {
      // placa Technic: o placa 2 x 6 cu gauri pe mijloc, in editorul de caramizi (fila ramane pe caramizi)
      const c = stare.caramida;
      Object.assign(c, { celule: [0, 1, 2, 3, 4, 5].flatMap(i => [[i, 0], [i, 1]]), placi: 1, stifturi: true, fund: "tuburi", gauri: [1, 2, 3, 4, 5].map(a => [a, 1, "r"]), mod: "gauri", laterale: [], goale: false });
      c.cols = Math.max(c.cols, 8); c.rows = Math.max(c.rows, 4);
      alegeTip("caramida");
      toast("Placă Technic 2×6, cu găuri pe mijloc (în locul formei de la Cărămidă / placă). Le schimbi din „Găuri”.");
      return;
    }
    ultimaLegatura = k;
    alegeTip(k);
  }
  function adaugaPerecheLegatura(t: string) {
    // balamaua: clema si manerul cu bara la fel; articulatia: bila si cupa
    laZi();
    const n = bucatiCerute();
    if (t === "clema" || t === "maner") {
      const axa = stare[t].axa, lung = stare[t].lung;
      const cl = { tip: "clema", lung: t === "clema" ? lung : Math.min(2, lung), axa }, mn = { tip: "maner", lung: t === "maner" ? lung : lung, axa };
      pune(cl, n); pune(mn, n);
      toast(tr`${n} × balamaua (${numeDef(cl)} + ${numeDef(mn)}) în listă.`);
    } else {
      const bi = { tip: "bila", baza: stare.bila.baza }, cu = { tip: "cupa", baza: 1 };
      pune(bi, n); pune(cu, n);
      toast(tr`${n} × articulația (bila + cupa) în listă.`);
    }
    salveaza(); randeazaLista();
  }
  function deseneazaGrinda() {
    const p = stare.grinda, c = 30, loc = document.getElementById("at-gr-grila");
    if (!loc) return;
    const M = new Map(p.celule.map(([i, j, t]) => [cheie(i, j), t]));
    let h = `<svg viewBox="-2 -2 ${p.cols * c + 4} ${p.rows * c + 4}" width="${p.cols * c + 4}" role="grid" aria-label="Grila grinzii">`;
    // legaturile dintre gauri vecine, apoi gaurile
    for (const [i, j] of p.celule) for (const [di, dj] of [[1, 0], [0, 1]]) if (M.has(cheie(i + di!, j + dj!)))
      h += `<line x1="${i * c + c / 2}" y1="${(p.rows - 1 - j) * c + c / 2}" x2="${(i + di!) * c + c / 2}" y2="${(p.rows - 1 - j - dj!) * c + c / 2}" stroke="var(--celula-pusa)" stroke-width="${c * 0.8}" pointer-events="none"/>`;
    for (let j = 0; j < p.rows; j++) for (let i = 0; i < p.cols; i++) {
      const t = M.get(cheie(i, j)), x = i * c, y = (p.rows - 1 - j) * c;
      h += `<rect x="${x + 1}" y="${y + 1}" width="${c - 2}" height="${c - 2}" rx="${t ? c / 2 : 4}" fill="${t ? "var(--celula-pusa)" : "var(--celula)"}" data-i="${i}" data-j="${j}"/>`;
      if (t === "r") h += `<circle cx="${x + c / 2}" cy="${y + c / 2}" r="${c * 0.22}" fill="var(--panou)" pointer-events="none"/>`;
      if (t === "x") h += `<path d="M${x + c / 2 - 7} ${y + c / 2}h14M${x + c / 2} ${y + c / 2 - 7}v14" stroke="var(--panou)" stroke-width="4" pointer-events="none"/>`;
    }
    h += `</svg>`;
    loc.innerHTML = h;
    const atinge = (ev: PointerEvent) => {
      const el = document.elementFromPoint(ev.clientX, ev.clientY), r = el && el.closest<HTMLElement>("#at-gr-grila rect[data-i]");
      if (!r) return;
      const i = +r.dataset.i!, j = +r.dataset.j!, k = cheie(i, j), u = p.unealta || "r", are = M.get(k);
      if (u === "sterge") {
        if (!are) return;
        if (p.celule.length === 1) { toast("Grinda trebuie să aibă cel puțin o gaură."); return; }
        p.celule = p.celule.filter(q => cheie(q[0], q[1]) !== k);
      } else {
        if (are === u) return;
        p.celule = p.celule.filter(q => cheie(q[0], q[1]) !== k); p.celule.push([i, j, u]);
      }
      deseneazaGrinda(); schimbat();
    };
    loc.onpointerdown = ev => { trageGrinda = true; try { loc.setPointerCapture(ev.pointerId); } catch (e) { /* fara captura */ } atinge(ev); };
    loc.onpointermove = ev => { if (trageGrinda && ev.buttons) atinge(ev); };
    loc.onpointerup = loc.onpointercancel = () => { trageGrinda = false; };
  }
  function sablonGrinda(v: string) {
    const p = stare.grinda, r = "r";
    let c: Gaura[] | undefined;
    if (/^\d+$/.test(v)) c = Array.from({ length: +v }, (_, i) => [i, 0, r]);
    else if (v === "L24") c = [[0, 0, r], [1, 0, r], [2, 0, r], [3, 0, r], [0, 1, r]];
    else if (v === "L35") c = [[0, 0, r], [1, 0, r], [2, 0, r], [3, 0, r], [4, 0, r], [0, 1, r], [0, 2, r]];
    else if (v === "T") c = [[0, 2, r], [1, 2, r], [2, 2, r], [1, 1, r], [1, 0, r]];
    else if (v === "cruce") c = [[1, 0, r], [0, 1, r], [1, 1, "x"], [2, 1, r], [1, 2, r]];
    else if (v === "H") c = [[0, 0, r], [0, 1, r], [0, 2, r], [0, 3, r], [0, 4, r], [1, 2, r], [2, 0, r], [2, 1, r], [2, 2, r], [2, 3, r], [2, 4, r]];
    else if (v === "rama3") c = [[0, 0, r], [1, 0, r], [2, 0, r], [0, 1, r], [2, 1, r], [0, 2, r], [1, 2, r], [2, 2, r]];
    else if (v === "rama57") { c = []; for (let i = 0; i < 5; i++) for (let j = 0; j < 7; j++) if (i === 0 || i === 4 || j === 0 || j === 6) c.push([i, j, r]); }
    if (!c) return;
    p.celule = c; p.cols = Math.max(p.cols, ...c.map(q => q[0] + 2)); p.rows = Math.max(p.rows, ...c.map(q => q[1] + 1));
    deseneazaGrinda(); schimbat();
  }
  function campuriVariante(loc: HTMLElement) {
    loc.innerHTML = [["varianta_stift", "Varianta știftului"], ["varianta_locas", "Varianta locașului"], ["varianta_gaura", "Varianta găurii"], ["varianta_ax", "Varianta axului"],
      ["varianta_bara", "Varianta clemei / barei"], ["varianta_cupa", "Varianta cupei"]]
      .map(([k, e]) => `<label for="${loc.id}-${k}">${e}<input id="${loc.id}-${k}" data-setare="${k}" type="number" min="-3" max="9" step="1" value="${(setari as Valori)[k!]}"></label>`).join("");
  }
  function deseneazaGrila() {
    const p = stare.caramida, S = new Set(p.celule.map(([i, j]) => cheie(i, j))), c = 30;
    const W = p.cols * c, H = p.rows * c;
    let h = `<svg viewBox="-2 -2 ${W + 4} ${H + 4}" width="${W + 4}" role="grid" aria-label="${tr`Grila de ${p.cols} × ${p.rows} știfturi`}"><g class="celule">`;
    for (let j = 0; j < p.rows; j++) for (let i = 0; i < p.cols; i++) {
      const pus = S.has(cheie(i, j)), x = i * c, y = (p.rows - 1 - j) * c;
      h += `<rect x="${x + 1}" y="${y + 1}" width="${c - 2}" height="${c - 2}" rx="4" fill="${pus ? "var(--celula-pusa)" : "var(--celula)"}" data-i="${i}" data-j="${j}"/>`;
      if (pus && p.stifturi === true) h += `<circle cx="${x + c / 2}" cy="${y + c / 2}" r="${c * 0.3}" fill="var(--stift)" pointer-events="none"/>`;
    }
    if (p.stifturi === "mijloc" && p.celule.length) {
      const mx = p.celule.reduce((t, [i]) => t + i * c + c / 2, 0) / p.celule.length, my = p.celule.reduce((t, [, j]) => t + (p.rows - 1 - j) * c + c / 2, 0) / p.celule.length;
      h += `<circle cx="${mx}" cy="${my}" r="${c * 0.3}" fill="var(--stift)" pointer-events="none"/>`;
    }
    h += `</g>`;
    // gaurile verticale: punctele dintre stifturi; in modul „Gauri” se pot atinge toate cele cu patru celule in jur
    const G = new Map(gauriCaramida(p).map(([a, b, t]) => [cheie(a, b), t])), modG = p.mod === "gauri";
    for (const [a, b] of modG ? intersectiiInterioare(p) : [...G.keys()].map(k => k.split(",").map(Number))) h += semnGaura(a! * c, (p.rows - b!) * c, G.get(cheie(a!, b!))!, modG ? `data-a="${a}" data-b="${b}"` : "");
    h += `</svg>`;
    $("#at-grila").innerHTML = h;
    const svg = $("#at-grila svg");
    extraCaramida();
    if (modG) {
      const g = $("#at-grila"); g.onpointerdown = g.onpointermove = g.onpointerup = g.onpointercancel = null;
      tastePuncte(svg);
      svg.addEventListener("click", ev => {
        const el = (ev.target as Element).closest<HTMLElement>("[data-a]"); if (!el) return;
        const a = +el.dataset.a!, b = +el.dataset.b!, vechi = G.get(cheie(a, b)), nou = vechi === "r" ? "x" : vechi === "x" ? null : "r";
        p.gauri = gauriCaramida(p).filter(([x, y]) => cheie(x, y) !== cheie(a, b));
        if (nou) p.gauri.push([a, b, nou]);
        deseneazaGrila(); schimbat();
      });
      return;
    }
    const atinge = (ev: PointerEvent) => {
      const el = document.elementFromPoint(ev.clientX, ev.clientY), r = el && el.closest<HTMLElement>("#at-grila rect[data-i]");
      if (!r) return;
      const i = +r.dataset.i!, j = +r.dataset.j!, k = cheie(i, j), are = p.celule.some(q => cheie(q[0], q[1]) === k);
      if (puneGrila === null) puneGrila = !are;
      if (puneGrila && !are) p.celule.push([i, j]);
      else if (!puneGrila && are) { if (p.celule.length === 1) { toast("Piesa trebuie să aibă cel puțin un știft."); return; } p.celule = p.celule.filter(q => cheie(q[0], q[1]) !== k); }
      else return;
      deseneazaGrila(); schimbat();
    };
    // desenul se reface la fiecare patratel; tragerea tine in containerul grilei, care ramane
    const loc = $("#at-grila");
    loc.onpointerdown = ev => { puneGrila = null; try { loc.setPointerCapture(ev.pointerId); } catch (e) { /* fara captura */ } atinge(ev); };
    loc.onpointermove = ev => { if (puneGrila !== null && ev.buttons) atinge(ev); };
    loc.onpointerup = loc.onpointercancel = () => { puneGrila = null; };
  }
  function extraCaramida() {
    // ce depinde de forma, refacut la fiecare schimbare a grilei: randul gaurilor laterale si nota din modul „Gauri”
    const p = stare.caramida, nota = document.getElementById("at-car-nota"), lat = document.getElementById("at-car-laterale");
    if (nota) nota.innerHTML = p.mod === "gauri" && !intersectiiInterioare(p).length ? `<p class="mic"><b>Forma nu are colțuri cu patru pătrățele în jur</b> (de exemplu la 1×n): la ea merg știfturile goale și, la o cărămidă dreaptă de 3 plăci, găurile prin lateral.</p>` : "";
    if (!lat) return;
    const n = pozitiiLaterale(p);
    lat.innerHTML = n ? `<div class="at-rand"><span class="mic">Găuri prin lateral (Technic):</span><div class="gauri" id="at-laterale">${Array.from({ length: n }, (_, k) => {
        const g = ["r", "x"].includes(p.laterale && p.laterale[k]!) ? p.laterale[k] : "p";
        return `<button type="button" data-lk="${k}" data-t="${g}" aria-label="${tr`Gaura laterală ${k + 1}: ${g === "r" ? tr("rotundă") : g === "x" ? tr("în cruce") : tr("fără")}`}">${g === "r" ? "○" : g === "x" ? "+" : "■"}</button>`;
      }).join("")}</div></div>
      <p class="mic">Cu găuri prin lateral, cărămida devine Technic: găurile sunt între știfturi (la 1×1, sub știft), la 5,8 mm de jos; cele rotunde au lamaj pentru gulerul știftului. Atinge o gaură: rotundă → în cruce → fără.</p>` : "";
    const L = document.getElementById("at-laterale");
    if (L) L.onclick = ev => {
      const b = (ev.target as Element).closest<HTMLElement>("[data-lk]"); if (!b) return;
      const k = +b.dataset.lk!;
      p.laterale = Array.from({ length: n }, (_, i) => (["r", "x"].includes(p.laterale && p.laterale[i]!) ? p.laterale[i]! : "p"));
      p.laterale[k] = ({ p: "r", r: "x", x: "p" } as Record<string, string>)[p.laterale[k]!]!; extraCaramida(); schimbat();
    };
  }
  function deseneazaPlanPana() {
    // planul penei (vazut de sus), cu punctele unde pot fi gauri
    const p = stare.pana, c = 26, loc = document.getElementById("at-pana-plan");
    if (!loc) return;
    const L = Math.max(1, Math.min(24, Math.round(p.lung))), A = Math.max(1, Math.min(24, Math.round(p.lat)));
    const poli = Lego.conturPana({ lung: L, lat: A, varf: Math.max(0, Math.min(A, p.varf)), inceput: Math.max(0, Math.min(L - 1, Math.round(p.inceput))), parte: p.parte });
    const X = (x: number) => x / 8 * c, Y = (y: number) => (A - y / 8) * c, W = L * c, H = A * c;
    const G = new Map((p.gauri || []).map(([a, b, t]) => [cheie(a, b), t])), poz = Lego.pozitiiGauriPana(p);
    let h = `<svg viewBox="-14 -14 ${W + 28} ${H + 28}" width="${W + 28}" role="group" aria-label="Planul penei, cu găurile">`;
    for (let i = 0; i <= L; i++) h += `<line x1="${i * c}" y1="0" x2="${i * c}" y2="${H}" stroke="var(--linie)" stroke-width="1"/>`;
    for (let j = 0; j <= A; j++) h += `<line x1="0" y1="${j * c}" x2="${W}" y2="${j * c}" stroke="var(--linie)" stroke-width="1"/>`;
    h += `<polygon points="${poli.map(([x, y]) => `${X(x)},${Y(y)}`).join(" ")}" fill="var(--celula-pusa)" opacity=".85"/>`;
    for (const [a, b] of poz) h += semnGaura(a * c, (A - b) * c, G.get(cheie(a, b))!, `data-a="${a}" data-b="${b}"`);
    h += `</svg>`;
    loc.innerHTML = poz.length ? h : `<p class="mic">Pe pana asta nu încape nicio gaură (e nevoie de un colț de celulă la cel puțin 3,3 mm de margine).</p>`;
    const svg = loc.querySelector<HTMLElement>("svg");
    if (svg) tastePuncte(svg);
    if (svg) svg.addEventListener("click", ev => {
      const el = (ev.target as Element).closest<HTMLElement>("[data-a]"); if (!el) return;
      const a = +el.dataset.a!, b = +el.dataset.b!, vechi = G.get(cheie(a, b)), nou = vechi === "r" ? "x" : vechi === "x" ? null : "r";
      p.gauri = (p.gauri || []).filter(([x, y]) => cheie(x, y) !== cheie(a, b));
      if (nou) p.gauri.push([a, b, nou]);
      deseneazaPlanPana(); schimbat();
    });
  }
  function tastePuncte(svg: HTMLElement) {
    // punctele de gaura se schimba si din tastatura (Tab, apoi Enter sau Spatiu), ca un buton
    svg.addEventListener("keydown", ev => {
      if (ev.key !== "Enter" && ev.key !== " ") return;
      const el = (ev.target as Element).closest && (ev.target as Element).closest<HTMLElement>("[data-a]"); if (!el) return;
      ev.preventDefault();
      const a = el.dataset.a, b = el.dataset.b;
      el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      const nou = document.querySelector<HTMLElement>(`#mod-3d [data-a="${a}"][data-b="${b}"]`); if (nou) nou.focus();
    });
  }
  function intersectiiInterioare(p: { celule: readonly (readonly [number, number, ...unknown[]])[] }) {
    // colturile de celule cu patru celule in jur (acolo poate fi o gaura verticala)
    const S = new Set(p.celule.map(([i, j]) => cheie(i, j))), are = (i: number, j: number) => S.has(cheie(i, j)), out: [number, number][] = [];
    for (const [i, j] of p.celule) if (are(i + 1, j) && are(i, j + 1) && are(i + 1, j + 1) && !subStiftMijloc(p, i + 1, j + 1)) out.push([i + 1, j + 1]);
    return out;
  }
  function semnGaura(x: number, y: number, t: string, atr: string) {
    // semnul unei gauri in desen: cerc (stift), cruce (ax) sau, de ales, un cerc gol
    const r = 8, cls = atr ? ` class="punct-gaura" ${atr} role="button" tabindex="0" aria-label="${tr`Gaură: ${t === "r" ? tr("rotundă") : t === "x" ? tr("pentru ax") : tr("fără")}`}"` : ` pointer-events="none"`;
    const fond = `<circle cx="${x}" cy="${y}" r="${r}" fill="${t ? "var(--text)" : "var(--panou)"}" stroke="var(--text-2)" stroke-width="1.5"/>`;
    const semn = t === "x" ? `<path d="M${x - 4.5} ${y}h9M${x} ${y - 4.5}v9" stroke="var(--panou)" stroke-width="2.4"/>` : t === "r" ? `<circle cx="${x}" cy="${y}" r="3.6" fill="var(--panou)"/>` : "";
    return `<g${cls}>${fond}${semn}<circle cx="${x}" cy="${y}" r="13" fill="transparent"/></g>`;
  }
  function bucatiSeparate(celule: readonly (readonly [number, number, ...unknown[]])[]) {
    const S = new Set(celule.map(([i, j]) => cheie(i, j))), vazut = new Set();
    let n = 0;
    for (const [i, j] of celule) {
      if (vazut.has(cheie(i, j))) continue;
      n++;
      const stiva = [[i, j]]; vazut.add(cheie(i, j));
      while (stiva.length) {
        const [a, b] = stiva.pop()!;
        for (const [x, y] of [[a! + 1, b], [a! - 1, b], [a, b! + 1], [a, b! - 1]] as [number, number][]) if (S.has(cheie(x, y)) && !vazut.has(cheie(x, y))) { vazut.add(cheie(x, y)); stiva.push([x, y]); }
      }
    }
    return n;
  }
  function sablon(s: string) {
    const p = stare.caramida;
    if (s === "gol") { p.celule = [[0, 0]]; }
    else if (s === "L") p.celule = [[0, 0], [1, 0], [2, 0], [0, 1], [0, 2]];
    else if (s === "T") p.celule = [[0, 0], [1, 0], [2, 0], [1, 1], [1, 2]];
    else { const [a, b] = s.split("x").map(Number); p.celule = []; for (let i = 0; i < b!; i++) for (let j = 0; j < a!; j++) p.celule.push([i, j]); }
    p.cols = Math.max(p.cols, ...p.celule.map(c => c[0] + 2)); p.rows = Math.max(p.rows, ...p.celule.map(c => c[1] + 2));
    deseneazaGrila(); schimbat();
  }
  function schimbaGrila(op: string) {
    const p = stare.caramida;
    const maxI = Math.max(...p.celule.map(c => c[0])), maxJ = Math.max(...p.celule.map(c => c[1]));
    if (op === "c+" && p.cols < 22) p.cols++;
    if (op === "c-" && p.cols > maxI + 1 && p.cols > 2) p.cols--;
    if (op === "r+" && p.rows < 22) p.rows++;
    if (op === "r-" && p.rows > maxJ + 1 && p.rows > 2) p.rows--;
    deseneazaGrila();
  }

  // --------------------------------------------------------------------------- previzualizarea 3D
  // three.js se incarca doar cand intri prima data in 3D (planul 2D nu are nevoie de el)
  let promisiuneThree: Promise<Trei.Biblioteca | null> | null = null;
  function incarcaThree() {
    if (window.THREE) return Promise.resolve(window.THREE);
    // in cvs2 (ADR 0161), cadrul extensiei n-are retea (CSP-ul ar refuza cdnjs): three.js vine din pachetul extensiei, adus de
    // intrare tot la cerere (ADR 0163)
    if (window.cvs2) {
      if (!promisiuneThree) promisiuneThree = window.cvs2.three().then(T => {
        if (!T) $("#at-vedere-lipsa").textContent = "În cvs2, previzualizarea 3D lipsește: pachetul extensiei n-are three.js. Piesa și STL-ul merg și fără ea.";
        return T;
      });
      return promisiuneThree;
    }
    if (!promisiuneThree) promisiuneThree = new Promise<Trei.Biblioteca | null>(ok => {
      const s = document.createElement("script");
      s.src = THREE_URL; s.async = true;
      s.onload = () => ok(window.THREE || null); s.onerror = () => ok(null);
      document.head.appendChild(s);
    });
    return promisiuneThree;
  }
  const v3 = { ok: false } as Vedere3D;
  function porneste3D() {
    const loc = $("#at-vedere");
    if (!window.THREE) { $("#at-vedere-lipsa").hidden = false; return; }
    const T = window.THREE;
    let r;
    try { r = new T.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { $("#at-vedere-lipsa").textContent = "Previzualizarea 3D nu merge pe acest dispozitiv (WebGL). Piesa și STL-ul merg și fără ea."; $("#at-vedere-lipsa").hidden = false; return; }
    r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    loc.prepend(r.domElement);
    const scena = new T.Scene(), cam = new T.PerspectiveCamera(32, 4 / 3, 1, 5000);
    cam.up.set(0, 0, 1);
    scena.add(new T.HemisphereLight(0xffffff, 0x556677, 0.85));
    const l = new T.DirectionalLight(0xffffff, 0.75); l.position.set(0.6, -1, 1.4); scena.add(l);
    const l2 = new T.DirectionalLight(0xffffff, 0.25); l2.position.set(-1, 0.8, 0.4); scena.add(l2);
    // o lumina si de dedesubt: piesa se poate privi si de jos (locasurile, tuburile, gaurile)
    const l3 = new T.DirectionalLight(0xffffff, 0.45); l3.position.set(0.3, 0.5, -1.2); scena.add(l3);
    const mat = new T.MeshStandardMaterial({ color: setari.culoare, roughness: 0.42, metalness: 0.02 });
    const matTren = new T.MeshStandardMaterial({ color: "#d9b27c", roughness: 0.6, metalness: 0.0 });
    Object.assign(v3, { ok: true, T, r, scena, cam, mat, matTren, mesh: null, grila: null, teta: -0.95, fi: 0.95, dist: 120, tinta: new T.Vector3() });
    const marime = () => { const w = loc.clientWidth, h = loc.clientHeight; if (!w || !h) return; r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); randeaza(); };
    new ResizeObserver(marime).observe(loc);
    const ptr = new Map();
    let d0 = 0, dist0 = 0;
    let start: number[] | null = null;
    loc.addEventListener("pointerdown", e => { loc.setPointerCapture(e.pointerId); ptr.set(e.pointerId, [e.clientX, e.clientY]); start = ptr.size === 1 ? [e.clientX, e.clientY] : null; if (ptr.size === 2) { const [a, b] = [...ptr.values()]; d0 = Math.hypot(a[0] - b[0], a[1] - b[1]); dist0 = v3.dist; } });
    loc.addEventListener("pointermove", e => {
      if (!ptr.has(e.pointerId)) return;
      const vechi = ptr.get(e.pointerId); ptr.set(e.pointerId, [e.clientX, e.clientY]);
      if (ptr.size === 1) { v3.teta -= (e.clientX - vechi[0]) * 0.01; v3.fi = Math.min(1.5, Math.max(-1.5, v3.fi - (e.clientY - vechi[1]) * 0.01)); butonUnghi(); }
      else if (ptr.size === 2) { const [a, b] = [...ptr.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (d0 > 0) v3.dist = Math.min(2000, Math.max(20, dist0 * d0 / d)); }
      randeaza();
    });
    const gata = (e: PointerEvent) => ptr.delete(e.pointerId);
    loc.addEventListener("pointerup", e => {
      // o apasare fara tragere alege piesa din model
      if (start && ptr.size === 1 && Math.hypot(e.clientX - start[0]!, e.clientY - start[1]!) < 6) clicInVedere(e);
      start = null; gata(e);
    });
    loc.addEventListener("pointercancel", gata);
    loc.addEventListener("wheel", e => { e.preventDefault(); v3.dist = Math.min(2000, Math.max(20, v3.dist * Math.exp(e.deltaY * 0.0012))); randeaza(); }, { passive: false });
    marime();
  }
  function randeaza() {
    if (!v3.ok) return;
    const { cam, tinta, dist, teta, fi } = v3;
    // privita de dedesubt, grila de pe masa ar trece peste fata de jos a piesei: atunci nu se vede
    if (v3.grila) v3.grila.visible = fi > 0.02;
    cam.position.set(tinta.x + dist * Math.cos(teta) * Math.cos(fi), tinta.y + dist * Math.sin(teta) * Math.cos(fi), tinta.z + dist * Math.sin(fi));
    cam.lookAt(tinta);
    v3.r.render(v3.scena, cam);
  }
  function butonUnghi() {
    document.querySelectorAll<HTMLElement>("#at-unghi [data-u]").forEach(b => b.setAttribute("aria-pressed", String((b.dataset.u === "jos") === (v3.fi < 0))));
  }
  function alegeUnghi(u: string) {
    // de sus sau de dedesubt: aceeasi inaltime a privirii, de partea cealalta a mesei
    if (!v3.ok) return;
    const f = Math.max(0.35, Math.abs(v3.fi));
    v3.fi = u === "jos" ? -f : f;
    butonUnghi(); randeaza();
  }
  function arata3D(tri: readonly Tri[], pastreazaVederea: boolean, dinTren?: boolean) {
    if (!v3.ok) return;
    const T = v3.T, poz = new Float32Array(tri.length * 9);
    let o = 0;
    for (const t of tri) for (const p of t) { poz[o++] = p[0]; poz[o++] = p[1]; poz[o++] = p[2]; }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.BufferAttribute(poz, 3));
    g.computeVertexNormals();
    g.computeBoundingBox();
    if (v3.mesh) { v3.scena.remove(v3.mesh); v3.mesh.geometry.dispose(); }
    if (v3.grup) v3.grup.visible = false;
    v3.mesh = new T.Mesh(g, dinTren ? v3.matTren : v3.mat); v3.scena.add(v3.mesh);
    const b = g.boundingBox, c = new T.Vector3(); b!.getCenter(c);
    const m = Math.max(b!.max.x - b!.min.x, b!.max.y - b!.min.y, b!.max.z - b!.min.z);
    if (v3.grila) { v3.scena.remove(v3.grila); v3.grila.geometry.dispose(); }
    const n = Math.max(2, Math.ceil((Math.max(b!.max.x, b!.max.y) + 16) / 8) * 2);
    v3.grila = new T.GridHelper(n * 8, n, 0x8a96a3, 0xc3cad2); v3.grila.rotation.x = Math.PI / 2; v3.grila.position.set(c.x, c.y, -0.05);
    v3.grila.material.transparent = true; v3.grila.material.opacity = 0.45; v3.scena.add(v3.grila);
    v3.tinta.copy(c);
    if (!pastreazaVederea) v3.dist = Math.max(45, m * 2.6);
    randeaza();
  }

  // --------------------------------------------------------------------------- modelul (piesele asezate impreuna)
  // Fiecare piesa din model: { id, def, x, y (stifturi), z (placi), rot (sferturi de tura), culoare }. Corpul ei e cel
  // din motor, mutat inapoi pe grila de stifturi (baza), rotit in jurul mijlocului amprentei lui.
  let model: InModel[] = [], vedere = "piesa", alesM: string | null = null;
  const corpuri = new Map<string, CorpModel>();
  const geomDin = (tri: readonly Tri[]) => {
    const T = v3.T, poz = new Float32Array(tri.length * 9);
    let o = 0;
    for (const t of tri) for (const p of t) { poz[o++] = p[0]; poz[o++] = p[1]; poz[o++] = p[2]; }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.BufferAttribute(poz, 3));
    g.computeVertexNormals();
    return g;
  };
  function corpModel(def: Def): CorpModel {
    const k = JSON.stringify([def, paramMotor()]);
    let c = corpuri.get(k);
    if (!c) {
      const p = pieseDin(def)[0];
      // amprenta pe grila (in stifturi). Piesa sta centrata in ea; doar cea cu stifturi laterale se aseaza dupa corp
      // (stifturile ies din amprenta), din baza data de motor
      let gw = Math.max(1, Math.round((p!.dim[0]! + 0.2) / 8)), gd = Math.max(1, Math.round((p!.dim[1]! + 0.2) / 8)), b: number[];
      // piesele cu o placa pe grila si ceva ce iese din ea (stifturi laterale, clema, manerul, suportul, bila) se aseaza
      // dupa placa: amprenta e placa, iar corpul ramane unde l-a facut motorul
      const pl = ({ lateral: [def.lung, 1], suport: [def.lung, def.adanc], clema: [def.lung, 1], maner: [def.lung, 1], bila: [def.baza, def.baza], cupa: [1, 1] } as Record<string, (number | undefined)[] | undefined>)[def.tip];
      if (pl && p!.baza) { b = [p!.baza[0]!, p!.baza[1]!, 0]; [gw, gd] = pl.map(v => Math.max(1, Math.round(+v! || 1))) as [number, number]; }
      else b = [gw * 4 - p!.dim[0]! / 2, gd * 4 - p!.dim[1]! / 2, 0];
      c = { tri: p!.tri, dim: p!.dim, baza: b, gw, gd, geom: null };
      corpuri.set(k, c);
      if (corpuri.size > 80) { const v = corpuri.keys().next().value; const x = corpuri.get(v!); if (x!.geom) x!.geom.dispose(); corpuri.delete(v!); }
    }
    return c;
  }
  const inaltimeM = (m: InModel): number => m.def.placi || (m.def.tip === "lateral" || m.def.tip === "caramidaTechnic" ? 3 : ["clema", "maner", "bila", "cupa"].includes(m.def.tip) ? 1
    : m.def.tip === "suport" && !m.def.invers ? 1 : Math.max(1, Math.round(corpModel(m.def).dim[2]! / 3.2)));
  const materiale = new Map<string, Trei.Material>();
  function material(cul: string, ales: boolean) {
    const k = cul + (ales ? "*" : "");
    if (!materiale.has(k)) materiale.set(k, new v3.T.MeshStandardMaterial({ color: cul, roughness: 0.42, metalness: 0.02, emissive: ales ? 0x3a3a3a : 0x000000 }));
    return materiale.get(k);
  }
  function arataModel(pastreaza?: boolean) {
    if (!v3.ok) return;
    const T = v3.T;
    if (v3.mesh) v3.mesh.visible = false;
    if (!v3.grup) { v3.grup = new T.Group(); v3.scena.add(v3.grup); }
    v3.grup.visible = true;
    while (v3.grup.children.length) v3.grup.remove(v3.grup.children[0]!);
    for (const m of model) {
      let c;
      try { c = corpModel(m.def); } catch (e) { continue; }
      if (!c.geom) { c.geom = geomDin(c.tri); c.geom.translate(c.baza[0]! - c.gw * 4, c.baza[1]! - c.gd * 4, c.baza[2]!); }
      const mesh = new T.Mesh(c.geom, material(m.culoare, m.id === alesM)!), [w, d] = m.rot % 2 ? [c.gd, c.gw] : [c.gw, c.gd];
      mesh.rotation.z = m.rot * Math.PI / 2;
      mesh.position.set(m.x * 8 + w * 4, m.y * 8 + d * 4, m.z * 3.2);
      mesh.userData.id = m.id;
      v3.grup.add(mesh);
    }
    const box = new T.Box3();
    if (model.length) box.setFromObject(v3.grup); else box.set(new T.Vector3(0, 0, 0), new T.Vector3(32, 32, 10));
    const c = new T.Vector3(); box.getCenter(c);
    const sz = Math.max(box.max.x - box.min.x, box.max.y - box.min.y, box.max.z - box.min.z);
    if (v3.grila) { v3.scena.remove(v3.grila); v3.grila.geometry.dispose(); }
    const n = Math.max(4, Math.ceil((Math.max(box.max.x - box.min.x, box.max.y - box.min.y) + 32) / 8));
    v3.grila = new T.GridHelper(n * 8, n, 0x8a96a3, 0xc3cad2); v3.grila.rotation.x = Math.PI / 2;
    v3.grila.position.set(Math.round(c.x / 8) * 8 + (n % 2 ? 4 : 0), Math.round(c.y / 8) * 8 + (n % 2 ? 4 : 0), Math.min(0, box.min.z) - 0.05);
    v3.grila.material.transparent = true; v3.grila.material.opacity = 0.45; v3.scena.add(v3.grila);
    v3.tinta.copy(c);
    if (!pastreaza) v3.dist = Math.max(60, sz * 2.4);
    randeaza();
    // marimea modelului, in cote
    if (vedere === "model") {
      const g = model.reduce((t, m) => { try { return t + Lego.grame(corpModel(m.def).tri); } catch (e) { return t; } }, 0);
      $("#at-cote").innerHTML = model.length ? `<span><b>Piese</b> ${model.length}</span><span><b>Mărime</b> ${tr`${fmt(box.max.x - box.min.x)} × ${fmt(box.max.y - box.min.y)} × ${fmt(box.max.z - box.min.z)} mm`}</span><span><b>Filament</b> ≈ ${fmt(g, 0)} g</span>` : `<span>Modelul e gol.</span>`;
    }
  }
  function clicInVedere(e: MouseEvent) {
    if (vedere !== "model" || !v3.ok || !v3.grup) return;
    const T = v3.T, r = v3.r.domElement.getBoundingClientRect();
    const ndc = new T.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    const rc = new T.Raycaster(); rc.setFromCamera(ndc, v3.cam);
    const hit = rc.intersectObjects(v3.grup.children, false)[0];
    alesM = hit ? hit.object.userData.id as string : null;
    editorModel(); arataModel(true);
  }
  const titluM = (m: InModel) => numeDef(m.def);
  function editorModel() {
    const e = $("#at-editor"), m = model.find(x => x.id === alesM);
    const cul = CULORI.map(([n, c]) => `<button type="button" data-fundal="${c}" data-mc="${c}" aria-label="${n}" aria-pressed="${!!m && m.culoare === c}"></button>`).join("");
    e.innerHTML = `<h2>Modelul</h2>
      <p class="mic">Așezi piesele pe grila de știfturi, ca să vezi avionul întreg înainte să-l printezi. Alegi o piesă cu un clic în vedere sau din listă, apoi o muți: X și Y câte un știft, Z câte o placă. O piesă nouă intră deasupra celei alese. Nu verific dacă piesele se prind între ele: e doar privirea de ansamblu.</p>
      ${m ? `<div class="model-ales">
        <div><b>${titluM(m)}</b> <span class="mic">· x ${m.x}, y ${m.y}, z ${m.z} ${m.z === 1 ? tr("placă", "LEGO") : tr("plăci", "LEGO")}${m.rot ? tr` · rotită ${m.rot * 90}°` : ""}</span></div>
        <div class="mutari" id="at-m-mutari">
          <button class="btn" type="button" data-m="x-" aria-label="X minus">← X</button><button class="btn" type="button" data-m="x+" aria-label="X plus">X →</button>
          <button class="btn" type="button" data-m="y-" aria-label="Y minus">↓ Y</button><button class="btn" type="button" data-m="y+" aria-label="Y plus">Y ↑</button>
          <button class="btn" type="button" data-m="z-">Jos</button><button class="btn" type="button" data-m="z+">Sus</button>
          <button class="btn" type="button" data-m="r">Rotește ↻</button>
        </div>
        <div class="at-rand"><span class="mic">Culoare:</span><div class="culori" id="at-m-culori">${cul}</div></div>
        <div class="at-rand"><button class="btn" type="button" id="at-m-dubla">Dublează</button><button class="btn" type="button" id="at-m-scoate">Scoate din model</button><button class="btn" type="button" id="at-m-editeaza">Schimb-o în editor</button></div>
      </div>` : model.length ? `<p class="mic">Nicio piesă aleasă.</p>` : `<p class="mic">Modelul e gol. Alege o piesă (fila de sus), apoi „Pune în model”.</p>`}
      ${model.length ? `<ol class="model-lista" id="at-m-lista">${model.map(x => `<li><button type="button" data-mid="${x.id}" aria-pressed="${x.id === alesM}"><span class="punct" data-fundal="${x.culoare}"></span>${titluM(x)} <span class="mic">${x.x}, ${x.y}, ${x.z}</span></button></li>`).join("")}</ol>` : ""}
      <p class="mic">Cu vederea 3D aleasă (un clic pe ea): săgețile mută, PageUp / PageDown urcă și coboară, R rotește, Delete scoate.</p>`;
    fundaluri(e);
    if (m) {
      $("#at-m-mutari").onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-m]"); if (b) mutaM(b.dataset.m!); };
      $("#at-m-culori").onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-mc]"); if (!b) return; m.culoare = b.dataset.mc!; dupaModel(); };
      $("#at-m-dubla").onclick = () => { const c = { ...m, id: idNou(), x: m.x + 1 }; model.push(c); alesM = c.id; dupaModel(); };
      $("#at-m-scoate").onclick = () => { model = model.filter(x => x !== m); alesM = null; dupaModel(); };
      $("#at-m-editeaza").onclick = () => {
        // piesa aleasa intra in editor; „Inlocuieste in model” o pune la loc, schimbata
        const d = JSON.parse(JSON.stringify(m.def));
        if (d.tip === "caramida") { const maxI = Math.max(...d.celule.map((c: number[]) => c[0])), maxJ = Math.max(...d.celule.map((c: number[]) => c[1])); d.cols = Math.max(maxI + 3, 6); d.rows = Math.max(maxJ + 3, 4); }
        if (d.tip === "grinda" && d.indoita) { d.fel = "indoita"; d.brate = d.indoita.brate; d.unghiuri = d.indoita.unghiuri; d.gauriInd = d.gauri || []; delete d.indoita; delete d.gauri; }
        else if (d.tip === "grinda") {
          if (!d.celule) d.celule = (d.gauri || ["r"]).map((t: string, k: number) => [k, 0, t]);
          delete d.gauri; d.fel = "grila"; d.cols = Math.max(...d.celule.map((c: number[]) => c[0]! + 2), 6); d.rows = Math.max(...d.celule.map((c: number[]) => c[1]! + 1), 3);
        }
        // ce lipseste din definitie (gaurile goale nu se scriu) se pune la valoarea de baza, nu ramane din editor
        const BAZA = { caramida: { gauri: [], laterale: [], goale: false, mod: "forma" }, pana: { gauri: [] }, rotund: { gaura: "nu" }, stiftTechnic: { lung: 2, capat: "stift" }, caramidaTechnic: { goale: false, gauri: [] } };
        const { tip, ...rest } = d; (stare as unknown as Record<string, object>)[tip] = { ...(stare as unknown as Record<string, object>)[tip], ...((BAZA as Record<string, object>)[tip] || {}), ...rest }; inlocuieste = m.id;
        alegeVedere("piesa"); alegeTip(tip);
      };
    }
    if ($("#at-m-lista")) $("#at-m-lista").onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-mid]"); if (!b) return; alesM = b.dataset.mid!; editorModel(); arataModel(true); };
  }
  const idNou = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  function mutaM(op: string) {
    const m = model.find(x => x.id === alesM);
    if (!m) return;
    if (op === "x-") m.x--; if (op === "x+") m.x++; if (op === "y-") m.y--; if (op === "y+") m.y++;
    if (op === "z-") m.z = Math.max(-60, m.z - 1); if (op === "z+") m.z = Math.min(200, m.z + 1);
    if (op === "r") m.rot = (m.rot + 1) % 4;
    dupaModel();
  }
  function dupaModel() { salveaza(); editorModel(); arataModel(true); butonModel(); }
  let inlocuieste: string | null = null;     // piesa din model care se schimba din editor
  function puneInModel() {
    laZi();
    if (!curent || curent.def.tip === "calibrare") return;
    const vechi = inlocuieste && model.find(x => x.id === inlocuieste);
    if (vechi) { vechi.def = curent.def; alesM = vechi.id; inlocuieste = null; }
    else {
      const sel = model.find(x => x.id === alesM);
      const m = { id: idNou(), def: curent.def, x: sel ? sel.x : 0, y: sel ? sel.y : 0, z: sel ? sel.z + inaltimeM(sel) : 0, rot: sel ? sel.rot : 0, culoare: setari.culoare };
      model.push(m); alesM = m.id;
    }
    salveaza(); butonModel();
    alegeVedere("model");
  }
  function butonModel() {
    const b = $<HTMLButtonElement>("#at-in-model");
    b.textContent = inlocuieste && model.some(x => x.id === inlocuieste) ? "Înlocuiește în model" : "Pune în model";
    b.disabled = !curent || curent.def.tip === "calibrare";
    $("#at-vedere-mod [data-v=\"model\"]").textContent = model.length ? tr`Modelul (${model.length})` : "Modelul";
  }
  function alegeVedere(v: string) {
    vedere = v === "model" ? "model" : "piesa";
    document.querySelectorAll<HTMLElement>("#at-vedere-mod [data-v]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === vedere)));
    $("#at-act-piesa").hidden = vedere !== "piesa"; $("#at-act-model").hidden = vedere !== "model";
    document.querySelectorAll<HTMLElement>("#at-tipuri [data-tip]").forEach(b => b.setAttribute("aria-pressed", String(vedere === "piesa" && b.dataset.tip === tabPentru(stare.tip))));
    $("#at-culori").hidden = vedere === "model";
    if (vedere === "model") {
      privita = null;
      $("#at-nume-piesa").textContent = "Modelul";
      $("#at-avert").hidden = true;
      editorModel(); arataModel();
    } else {
      privita = null; editor(); construiesteCurent();
    }
    butonModel();
  }
  function tasteModel(ev: KeyboardEvent) {
    if (vedere !== "model" || !alesM) return;
    const k = { ArrowLeft: "x-", ArrowRight: "x+", ArrowDown: "y-", ArrowUp: "y+", PageDown: "z-", PageUp: "z+", r: "r", R: "r" }[ev.key];
    if (k) { ev.preventDefault(); mutaM(k); return; }
    if (ev.key === "Delete" || ev.key === "Backspace") { ev.preventDefault(); model = model.filter(x => x.id !== alesM); alesM = null; dupaModel(); }
  }
  function modelInLista() {
    // fiecare piesa a modelului intra in lista de printat (aceeasi piesa se aduna)
    if (!model.length) return;
    for (const m of model) pune(m.def, 1);
    salveaza(); randeazaLista();
    toast(tr`${model.length} ${model.length === 1 ? tr("piesă") : tr("piese")} din model în lista de printat.`);
  }

  // --------------------------------------------------------------------------- piesa curenta
  // curent: piesa din editor; privita: o piesa a circuitului, aratata doar ca s-o vezi (pana schimbi ceva in editor)
  let curent: { def: Def; piese: PiesaGata[]; tri: Tri[]; dim: number[] } | null = null, privita: (PiesaTren & { bucati: number }) | null = null,
    cronPiesa: ReturnType<typeof setTimeout> | null = null;
  function schimbat() {
    privita = null;
    clearTimeout(cronPiesa!);
    cronPiesa = setTimeout(construiesteCurent, 90);
  }
  function laZi() {
    // un clic venit imediat dupa o schimbare (pe telefon, campul se schimba la atingerea butonului) foloseste piesa noua
    if (cronPiesa === null) return;
    clearTimeout(cronPiesa);
    construiesteCurent(true);
  }
  function arataPrivita() {
    const p = privita;
    $("#at-nume-piesa").textContent = p!.titlu;
    $("#at-cote").innerHTML = `<span><b>Mărime</b> ${tr`${fmt(p!.dim[0]!)} × ${fmt(p!.dim[1]!)} × ${fmt(p!.dim[2]!)} mm`}</span><span><b>Filament</b> ≈ ${fmt(p!.g)} g</span><span><b>Din circuit</b> ${p!.bucati} ${p!.bucati === 1 ? tr("bucată") : tr("bucăți")}</span>`;
    $("#at-avert").hidden = false; $("#at-avert").textContent = "E o piesă din circuitul de tren: o vezi aici, cum se așază pe pat. Se schimbă din 2D, la Export CNC.";
    $("#at-adauga").hidden = true; $("#at-bucati-rand").hidden = true; $("#at-in-model").hidden = true;
    arata3D(p!.tri, false, true);
  }
  function construiesteCurent(pastreaza?: boolean) {
    clearTimeout(cronPiesa!); cronPiesa = null;
    if (vedere === "model") return;
    $("#at-adauga").hidden = false; $("#at-bucati-rand").hidden = false; $("#at-in-model").hidden = false;
    const def = defCurenta();
    try {
      const piese = pieseDin(def);
      let tri: Tri[], dim: number[];
      if (piese.length === 1) ({ tri, dim } = piese[0]!);
      else { Lego.seteaza(paramMotor()); const pl = Lego.aseaza(piese); tri = pl[0]!.tri; dim = dimTri(tri); }
      curent = { def, piese, tri, dim };
      $("#at-nume-piesa").textContent = numeDef(def);
      const g = piese.reduce((t, p) => t + Lego.grame(p.tri), 0);
      $("#at-cote").innerHTML = `<span><b>Mărime</b> ${tr`${fmt(dim[0]!)} × ${fmt(dim[1]!)} × ${fmt(dim[2]!)} mm`}</span><span><b>Filament</b> ≈ ${fmt(g)} g</span>` +
        (def.tip === "calibrare" ? `<span><b>Piese</b> ${piese.length}</span>` : "") + (piese[0]!.unghi ? `<span><b>Unghi</b> ${fmt(piese[0]!.unghi)}°</span>` : "");
      const av = piese.flatMap(p => p.avert || []);
      if (def.tip === "caramida" && bucatiSeparate(def.celule!) > 1) av.push(tr("Forma are bucăți care nu se ating: ies piese separate, în același fișier."));
      $("#at-avert").hidden = !av.length; $("#at-avert").textContent = av.join(" ");
      if ($("#at-p-unghi")) $("#at-p-unghi").textContent = def.tip === "pantaInversa" ? tr`Fața de dedesubt urcă la ${fmt(piese[0]!.unghi!)}° (înălțimea ${fmt(def.placi! * 3.2)} mm, buza ${fmt(def.buza!)} mm).`
        : def.profil === "curb" ? tr`Curba urcă de la buză (${fmt(def.buza!)} mm) la ${fmt(def.placi! * 3.2)} mm; în medie ${fmt(piese[0]!.unghi!)}°.` : tr`Panta iese de ${fmt(piese[0]!.unghi!)}° (înălțimea ${fmt(def.placi! * 3.2)} mm, buza ${fmt(def.buza!)} mm).`;
      if ($("#at-pana-info") && def.tip === "pana") $("#at-pana-info").textContent = tr`Tăietura e la ${fmt(piese[0]!.unghi!)}° față de latura lungă · ${piese[0]!.stifturi} ${piese[0]!.stifturi === 1 ? tr("știft") : tr("știfturi")} sus, ${piese[0]!.locasuri} ${piese[0]!.locasuri === 1 ? tr("locaș") : tr("locașuri")} dedesubt` + (piese[0]!.deschise ? tr`, plus ${piese[0]!.deschise} deschise lângă marginea oblică (acolo stă pe știfturi, fără să le prindă).` : ".");
      arata3D(tri, pastreaza!);
    } catch (e) { $("#at-avert").hidden = false; $("#at-avert").textContent = tr`Nu am putut face piesa: ${(e as Error).message || e}`; }
  }

  // --------------------------------------------------------------------------- lista de printat
  function pune(def: Def, n: number) {
    const k = JSON.stringify(def), gasit = lista.find(x => JSON.stringify(x.def) === k);
    if (gasit) gasit.bucati += n;
    else lista.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), def, nume: numeDef(def), bucati: n });
  }
  const bucatiCerute = () => Math.max(1, Math.min(200, Math.round(+$<HTMLInputElement>("#at-bucati").value || 1)));
  function adaugaInLista() {
    laZi();
    if (!curent) return;
    const n = bucatiCerute();
    pune(curent.def, n);
    salveaza(); randeazaLista();
    toast(tr`${n} × ${numeDef(curent.def)} în listă.`);
  }
  function adaugaPereche() {
    // aripile vin in perechi: aceeasi pana, taiata o data stanga si o data dreapta
    const d = defCurenta(), n = bucatiCerute();
    for (const parte of ["stanga", "dreapta"]) {
      const x = { ...d, parte };
      // gaurile se oglindesc odata cu pana (y -> latimea - y)
      if (d.gauri && parte !== d.parte) x.gauri = (d.gauri as Gaura[]).map(([a, b, t]): Gaura => [a, d.lat! - b, t]);
      pune(x, n);
    }
    salveaza(); randeazaLista();
    toast(tr`${n} × perechea ${d.lung}×${d.lat} (stânga și dreapta) în listă.`);
  }
  let calculLista: ReturnType<typeof calculeazaLista> | null = null;
  function calculeazaLista() {
    // fiecare rand -> piesele lui, de cate ori trebuie; apoi placile patului, cu tot cu piesele circuitului
    const toate = [], randuri = [], folosite = new Map();
    const numeUnic = (x: InLista) => {
      // doua piese diferite cu acelasi nume primesc fisiere diferite (_2, _3...)
      const b = slug(x.nume) || "piesa", c = JSON.stringify(x.def);
      let n = b, k = 2;
      while (folosite.has(n) && folosite.get(n) !== c) n = `${b}_${k++}`;
      folosite.set(n, c);
      return n;
    };
    for (const x of lista) {
      const piese = pieseDin(x.def);
      const g = piese.reduce((t, p) => t + Lego.grame(p.tri), 0), dim = piese.length === 1 ? piese[0]!.dim : null;
      randuri.push({ x, g, dim, nPiese: piese.length });
      const nx = piese.length > 1 ? null : numeUnic(x);
      for (let k = 0; k < x.bucati; k++) for (const p of piese) toate.push({ ...p, nume: nx || p.nume });
    }
    const pt = pieseTren(), dinTren = setari.cuTren ? pt.piese : [];
    for (const p of dinTren) for (let k = 0; k < p.bucati; k++) toate.push({ nume: "tren_" + p.nume, titlu: p.titlu, tri: p.tri, dim: p.dim, tren: true });
    Lego.seteaza(paramMotor());
    let placi: ReturnType<typeof Lego.aseaza> = [], eroare: string | null = null;
    try { placi = toate.length ? Lego.aseaza(toate) : []; } catch (e) { eroare = (e as Error).message; }
    const gTren = dinTren.reduce((t, p) => t + p.g * p.bucati, 0), gLego = randuri.reduce((t, r) => t + r.g * r.x.bucati, 0);
    return { randuri, placi, toate, eroare, tren: pt, dinTren, grame: gTren + gLego };
  }
  const randTren = (p: PiesaTren) => `<tr data-tren="${p.nume}"><td>${p.titlu}</td><td class="num">${fmt(p.dim[0]!)} × ${fmt(p.dim[1]!)} × ${fmt(p.dim[2]!)}</td>` +
    `<td class="num centru">${p.bucati}</td><td class="num">${fmt(p.g * p.bucati)} g</td><td><button class="btn" type="button" data-op="vezi">Vezi</button></td></tr>`;
  function randeazaLista() {
    calculLista = calculeazaLista();
    const { randuri, placi, toate, eroare, tren: pt, grame } = calculLista;
    $("#at-lista").innerHTML = randuri.length ? randuri.map(({ x, g, dim, nPiese }) => `<tr data-id="${x.id}"><td>${x.nume}</td>` +
      `<td class="num">${dim ? `${fmt(dim[0]!)} × ${fmt(dim[1]!)} × ${fmt(dim[2]!)}` : tr`${nPiese} piese`}</td>` +
      `<td><span class="pas"><button class="btn" type="button" data-op="-" aria-label="O bucată mai puțin">−</button><span class="num pas-n">${x.bucati}</span><button class="btn" type="button" data-op="+" aria-label="O bucată în plus">+</button></span></td>` +
      `<td class="num">${fmt(g * x.bucati)} g</td><td><button class="btn" type="button" data-op="x">Scoate</button></td></tr>`).join("")
      : `<tr><td colspan="5" class="mic">Nicio piesă LEGO încă. Desenează una mai sus și apasă „Adaugă în lista de printat”.</td></tr>`;
    // grupul circuitului: se ia din planul 2D, cu numarul de bucati de acolo
    const titlu = pt.titlu ? tr`Din circuitul „${pt.titlu}”` : "Din circuitul de tren";
    $("#at-lista-tren").innerHTML = `<tr class="grupa"><th colspan="5"><div class="at-rand intre">` +
      `<label class="bifa"><input type="checkbox" id="at-cu-tren" ${setari.cuTren ? "checked" : ""}> ${titlu}</label>` +
      `<button class="btn" type="button" id="at-la-setari">Ce se printează: setări în 2D</button></div></th></tr>` +
      (pt.eroare ? `<tr><td colspan="5" class="mic eroare">${pt.eroare}</td></tr>`
        : !pt.piese.length ? `<tr><td colspan="5" class="mic">Circuitul nu are piese de printat. Limbile apar pentru macazuri când e bifată limba mobilă; tunelurile, peroanele, stâlpii și opritoarele printate le alegi în 2D, la Export CNC → Piese printate 3D.</td></tr>`
        : setari.cuTren ? pt.piese.map(randTren).join("")
        : `<tr><td colspan="5" class="mic">${tr`${pt.piese.reduce((t, p) => t + p.bucati, 0)} piese din circuit, lăsate deoparte. Bifează ca să intre pe pat.`}</td></tr>`);
    const [W, H] = setari.pat;
    $("#at-rez-lista").textContent = eroare ? eroare : toate.length ? tr`${toate.length} ${toate.length === 1 ? tr("piesă") : tr("piese")} pe ${placi.length} ${placi.length === 1 ? tr("placă", "pat") : tr("plăci", "pat")} de ${W} × ${H} mm · ≈ ${fmt(grame, 0)} g de filament` : "";
    $("#at-rez-lista").classList.toggle("eroare", !!eroare);
    $<HTMLInputElement>("#at-zip").disabled = !toate.length || !!eroare; $<HTMLInputElement>("#at-goleste").disabled = !lista.length;
    $("#at-paturi").innerHTML = placi.map((pl, i: number) => {
      const r = pl.piese.map(q => `<rect x="${q.x}" y="${H! - q.y - q.d}" width="${q.w}" height="${q.d}" rx="1.5" fill="${/^tren_/.test(q.nume) ? "var(--fag)" : "var(--caramida)"}" opacity=".85"><title>${q.titlu || q.nume}</title></rect>`).join("");
      return `<figure><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${tr`Placa ${i + 1}: ${pl.piese.length} piese`}"><rect width="${W}" height="${H}" rx="4" fill="var(--panou-2)" stroke="var(--linie)" stroke-width="2"/>${r}</svg><figcaption>${tr`Placa ${i + 1} · ${pl.piese.length} piese`}</figcaption></figure>`;
    }).join("");
    const chip = $("#chip-3d");
    if (chip) {
      chip.textContent = eroare ? "Nu încape pe pat" : toate.length ? `${toate.length} ${toate.length === 1 ? tr("piesă") : tr("piese")} · ${placi.length} ${placi.length === 1 ? tr("placă", "pat") : tr("plăci", "pat")}` : "Lista e goală";
      chip.className = "chip " + (eroare ? "pericol" : toate.length ? "ok" : "");
    }
  }
  function operatieLista(ev: MouseEvent) {
    const b = (ev.target as Element).closest<HTMLElement>("[data-op]");
    if (!b) return;
    const trT = (ev.target as Element).closest<HTMLElement>("tr[data-tren]");
    if (trT && b.dataset.op === "vezi") {
      const p = (calculLista ? calculLista.tren.piese : []).find(x => x.nume === trT.dataset.tren);
      if (!p) return;
      if (vedere === "model") alegeVedere("piesa");
      privita = p; arataPrivita();
      $("#at-vedere").scrollIntoView({ block: "nearest", behavior: "smooth" });
      return;
    }
    const rand = (ev.target as Element).closest<HTMLElement>("tr[data-id]");
    if (!rand) return;
    const x = lista.find(y => y.id === rand.dataset.id);
    if (!x) return;
    if (b.dataset.op === "+") x.bucati = Math.min(200, x.bucati + 1);
    if (b.dataset.op === "-") x.bucati = Math.max(1, x.bucati - 1);
    if (b.dataset.op === "x") lista = lista.filter(y => y !== x);
    salveaza(); randeazaLista();
  }

  // --------------------------------------------------------------------------- fisierele
  async function salveazaFisier(nume: string, date: BlobPart, tip: string) {
    const blob = new Blob([date], { type: tip });
    const dl = window.claude ? await window.claude.use("downloads").catch(() => null) : null;
    if (!dl) {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = nume; document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
      return;
    }
    try { await dl.save({ filename: nume, data: blob }); toast("Fișierul e salvat."); }
    catch (e) { if (e && (e as { code?: string }).code !== "declined") toast(e && (e as { code?: string }).code === "rate_limited" ? "Mai e o salvare deschisă." : "Nu am putut salva fișierul."); }
  }
  function descarcaSTL() {
    if (!privita) laZi();
    if (privita) { salveazaFisier(privita.nume + ".stl", Lego.stl(privita.tri, "trenulet: " + privita.nume).date, "model/stl"); return; }
    if (!curent) return;
    const nume = slug(numeDef(curent.def)) || "piesa";
    salveazaFisier(nume + ".stl", Lego.stl(curent.tri, "atelier de caramizi: " + nume).date, "model/stl");
  }
  function citeste(c: ReturnType<typeof calculeazaLista>) {
    const R = "\r\n", [W, H] = setari.pat;
    const l = [tr("PIESE DE PRINTAT — din atelierul 3D al Planificatorului Trenuleț"), new Date().toLocaleString(Limba.locala), "",
      tr("CE E ÎN ARHIVĂ"),
      tr`- pat_N.stl — câte o placă de ${W} × ${H} mm, cu piesele deja așezate (${c.placi.length} ${c.placi.length === 1 ? tr("placă", "pat") : tr("plăci", "pat")}). Deschide-o în feliator și pornește.`,
      tr("- piese/<nume>.stl — fiecare piesă separat, dacă vrei s-o așezi tu (cele ale circuitului încep cu tren_)."), "",
      tr("CUM SE PRINTEAZĂ"),
      tr("- PLA (sau PETG), duză 0,4 mm, strat de 0,2 mm, 3 perimetre, umplere 15%, fără suporturi. Piesele sunt deja întoarse cum trebuie:"),
      tr("  cărămizile și plăcile cu știfturile în sus, grinzile Technic culcate, axul pe un braț, știftul Technic pe fața teșită;"),
      tr("  pantele (și cele inverse) și conurile în picioare, penele și aripile culcate;"),
      tr("  limbile macazurilor cu fața pe care merg roțile pe masă și știftul în sus, tunelul în picioare pe portal;"),
      tr("  grinzile de orice formă culcate, bucșele în picioare, bara pe fața teșită, clemele și mânerele cu placa pe masă."),
      tr("- Suportul întors are placa de sus în aer: pune suport sub ea. Bila iese mai curat cu suport sub ea."),
      tr("- Clema, cupa bilei și găurile pentru bară sunt făcute pentru PLA; probează o pereche înainte să printezi multe."),
      tr("- Pantele inverse mai line de 45° au o surplombă sub pantă: pune suport doar acolo („suport doar de pe masă”)."),
      tr("- Fără „elephant foot”: primul strat prea strivit strâmtează locașurile de dedesubt. Dacă feliatorul are compensare pentru primul strat, pune-o."),
      tr("- Limbile macazurilor sunt subțiri și ies aproape pline; dacă feliatorul te lasă, pune-le umplere 100%."),
      "",
      tr("POTRIVIREA PIESELOR LEGO"),
      tr`- Imprimanta: ${(() => { const a = imprimante && imprimante.lista.find(p => p.id === imprimante!.activ); return a ? a.nume : ""; })()}, patul de ${W} × ${H} mm.`,
      tr`- Variantele folosite: știft ${setari.varianta_stift}, locaș ${setari.varianta_locas}, gaură ${setari.varianta_gaura}, ax ${setari.varianta_ax}, clemă și bară ${setari.varianta_bara}, cupă ${setari.varianta_cupa} (3 = mijlocul).`,
      tr("- Prima dată, printează setul de calibrare (fila Calibrare din 3D) și alege variantele care se prind bine cu piese LEGO adevărate."),
      "", "LISTA",
      ...c.randuri.map(r => tr`- ${r.x.bucati} × ${r.x.nume}${r.dim ? tr` (${fmt(r.dim[0]!)} × ${fmt(r.dim[1]!)} × ${fmt(r.dim[2]!)} mm)` : ""}, ≈ ${fmt(r.g * r.x.bucati)} g`),
      ...(c.dinTren.length ? ["", c.tren.titlu ? tr`DIN CIRCUITUL „${c.tren.titlu}”` : tr("DIN CIRCUITUL DE TREN"),
        ...c.dinTren.map(p => tr`- ${p.bucati} × ${p.titlu} (${fmt(p.dim[0]!)} × ${fmt(p.dim[1]!)} × ${fmt(p.dim[2]!)} mm), ≈ ${fmt(p.g * p.bucati)} g`)] : []),
      "", tr`Filament în total: ≈ ${fmt(c.grame, 0)} g.`];
    return l.join(R) + R;
  }
  function descarcaZip() {
    const c = calculLista || calculeazaLista();
    if (!c.toate.length) return;
    const fis: { nume: string; text: string | Uint8Array }[] = [{ nume: tr("CITESTE.txt"), text: citeste(c) }];
    c.placi.forEach((pl, i: number) => fis.push({ nume: `pat_${i + 1}.stl`, text: Lego.stl(pl.tri, `printare: placa ${i + 1}`).date }));
    const facute = new Set();
    for (const p of c.toate) { if (facute.has(p.nume)) continue; facute.add(p.nume); fis.push({ nume: `piese/${p.nume}.stl`, text: Lego.stl(p.tri, "printare: " + p.nume).date }); }
    salveazaFisier("piese_de_printat.zip", Lego.zip(fis) as Uint8Array<ArrayBuffer>, "application/zip");
  }

  // --------------------------------------------------------------------------- reglaje si salvare
  function rezumatImprimanta() {
    const el = $("#at-imprimanta-rez"), a = imprimante && imprimante.lista.find(p => p.id === imprimante!.activ);
    if (el) el.textContent = a ? tr`· ${a.nume}, pat ${setari.pat[0]} × ${setari.pat[1]} mm` : "";
  }
  function aplicaImprimanta(v: Valori | null) {
    puneImprimanta(v);
    reglaje(); salveaza();
    if (pornit) { if (vedere === "model") arataModel(true); else if (privita) arataPrivita(); else construiesteCurent(true); randeazaLista(); }
  }
  function reglaje() {
    rezumatImprimanta();
    if (uiImprimante) uiImprimante.desen();
    const loc = $("#at-reglaje");
    campuriVariante(loc);
    loc.insertAdjacentHTML("beforeend", [["pat.0", "Patul: lățime (mm)", setari.pat[0], 60, 500], ["pat.1", "Patul: adâncime (mm)", setari.pat[1], 60, 500],
      ["pat_margine", "Margine (mm)", setari.pat_margine, 0, 30], ["pat_distanta", "Între piese (mm)", setari.pat_distanta, 1, 20]]
      .map(([k, e, v, a, b]) => `<label for="at-r-${k}">${e}<input id="at-r-${k}" data-setare="${k}" type="number" min="${a}" max="${b}" step="1" value="${v}"></label>`).join(""));
  }
  function schimbaSetare(ev: Event) {
    if ((ev.target as HTMLElement).id === "at-cu-tren") { setari.cuTren = (ev.target as HTMLInputElement).checked; salveaza(); randeazaLista(); return; }
    const el = (ev.target as Element).closest<CampNumeric>("[data-setare]");
    if (!el) return;
    const v = Math.round(+String(el.value).replace(",", "."));
    if (!Number.isFinite(v)) return;
    const k = el.dataset.setare;
    if (k!.startsWith("pat.")) setari.pat[+k!.slice(4)] = Math.min(500, Math.max(60, v));
    else if (k!.startsWith("varianta_")) (setari as Valori)[k!] = Math.min(9, Math.max(-3, v));
    else (setari as Valori)[k!] = Math.max(0, v);
    document.querySelectorAll<CampNumeric>(`#mod-3d [data-setare="${k}"]`).forEach(x => { if (x !== el) x.value = el.value; });
    if (imprimante) Profiluri.memoreaza(imprimante, valoriImprimanta());
    rezumatImprimanta();
    salveaza(); if (vedere === "model") arataModel(true); else if (privita) arataPrivita(); else construiesteCurent(true); randeazaLista();
  }
  let cronSalvare: ReturnType<typeof setTimeout> | null = null;
  function salveaza() {
    const date = { setari, lista, stare, model, imprimante };
    try { localStorage.setItem(CHEIE, JSON.stringify(date)); } catch (e) { /* fara stocare locala */ }
    const inDb = async () => {
      if (!db) return;
      try { await db.doc("atelier/curent").set({ setari, lista, stare: JSON.parse(JSON.stringify(stare)), model, imprimante: JSON.parse(JSON.stringify(imprimante)), actualizat: new Date().toISOString() }); } catch (e) { /* raman cele locale */ }
    };
    // in cvs2 (ADR 0164), salvarea amanata o tine gazda: o porneste pe loc la inchiderea ferestrei
    if (window.cvs2) { window.cvs2.amana("atelier", inDb, 700); return; }
    clearTimeout(cronSalvare!);
    cronSalvare = setTimeout(inDb, 700);
  }
  /** Ce stă în stocare (de la o versiune oarecare a paginii): se citește doar ce se poate. */
  type Stocat = { setari?: Valori & { pat?: number[] }; imprimante?: Imprimante | null; lista?: InLista[]; model?: InModel[];
    stare?: Record<string, unknown> & { tip?: string; grinda?: { gauri?: string[]; celule?: unknown } } };
  function incarca(d: Stocat | null | undefined) {
    if (!d || typeof d !== "object") return;
    if (d.setari) setari = { ...SETARI_IMPLICIT, ...d.setari, pat: Array.isArray(d.setari.pat) ? d.setari.pat.slice(0, 2) : SETARI_IMPLICIT.pat.slice() };
    // imprimantele; pagina se deschide cu cea implicita
    imprimante = Profiluri.curata(d.imprimante || imprimante, valoriImprimanta(), tr("Imprimanta mea"));
    puneImprimanta(Profiluri.laDeschidere(imprimante));
    if (Array.isArray(d.lista)) lista = d.lista.filter(x => x && x.def && x.def.tip && x.bucati > 0);
    if (Array.isArray(d.model)) model = d.model.filter(x => x && x.def && x.def.tip && x.def.tip !== "calibrare" && Number.isFinite(x.x) && Number.isFinite(x.y) && Number.isFinite(x.z))
      .map(x => ({ id: String(x.id || idNou()), def: x.def, x: Math.round(x.x), y: Math.round(x.y), z: Math.round(x.z), rot: ((Math.round(x.rot) || 0) % 4 + 4) % 4, culoare: /^#[0-9a-f]{6}$/i.test(x.culoare) ? x.culoare : "#c8322b" }));
    if (d.stare && d.stare.tip) for (const k of Object.keys(stare)) if (d.stare[k] !== undefined) (stare as unknown as Record<string, unknown>)[k] = d.stare[k] && typeof d.stare[k] === "object" && !Array.isArray(d.stare[k]) ? { ...(stare as unknown as Record<string, object>)[k], ...d.stare[k] } : d.stare[k];
    if (!(stare as unknown as Record<string, unknown>)[stare.tip] && stare.tip !== "calibrare") stare.tip = "caramida";
    // grinda salvata inainte (doar dreapta, cu `gauri`) trece pe grila
    const sg = d.stare && d.stare.grinda;
    if (sg && Array.isArray(sg.gauri) && !Array.isArray(sg.celule)) { stare.grinda.celule = sg.gauri.map((t, k) => [k, 0, t]); stare.grinda.cols = Math.max(9, sg.gauri.length + 2); delete (stare.grinda as { gauri?: unknown }).gauri; }
    if (!Array.isArray(stare.grinda.celule) || !stare.grinda.celule.length) stare.grinda.celule = [0, 1, 2, 3, 4].map(i => [i, 0, "r"]);
    const gi = stare.grinda;
    if (!Array.isArray(gi.brate) || gi.brate.length < 2 || gi.brate.length > 3 || !gi.brate.every(n => Number.isInteger(n) && n >= 2 && n <= 15)) gi.brate = [6, 4];
    if (!Array.isArray(gi.unghiuri) || gi.unghiuri.length < gi.brate.length - 1 || !gi.unghiuri.every(Number.isFinite)) gi.unghiuri = gi.brate.map(() => 53.13).slice(1);
    if (!Array.isArray(gi.gauriInd)) gi.gauriInd = [];
    if (gi.fel !== "indoita") gi.fel = "grila";
  }

  // --------------------------------------------------------------------------- pornire
  let toastT: ReturnType<typeof setTimeout> | null = null;
  function toast(t: string) { const el = $("#at-toast"); el.textContent = t; el.classList.add("vizibil"); clearTimeout(toastT!); toastT = setTimeout(() => el.classList.remove("vizibil"), 2600); }
  function alegeTip(t: string) {
    stare.tip = t; privita = null;
    if (vedere === "model") { vedere = "piesa"; $("#at-act-piesa").hidden = false; $("#at-act-model").hidden = true; $("#at-culori").hidden = false; document.querySelectorAll<HTMLElement>("#at-vedere-mod [data-v]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === "piesa"))); }
    document.querySelectorAll<HTMLElement>("#at-tipuri [data-tip]").forEach(b => b.setAttribute("aria-pressed", (b.dataset.tip === tabPentru(t)) as unknown as string));
    if (eLegatura(t)) ultimaLegatura = t;
    $("#at-adauga").textContent = t === "calibrare" ? "Adaugă setul în lista de printat" : "Adaugă în lista de printat";
    editor(); construiesteCurent(); salveaza(); butonModel();
  }
  function culori() {
    $("#at-culori").innerHTML = CULORI.map(([n, c]) => `<button type="button" data-fundal="${c}" data-c="${c}" aria-label="${n}" aria-pressed="${setari.culoare === c}"></button>`).join("");
    fundaluri($("#at-culori"));
    $("#at-culori").onclick = ev => {
      const b = (ev.target as Element).closest<HTMLElement>("[data-c]"); if (!b) return;
      setari.culoare = b.dataset.c!; if (v3.ok) { v3.mat.color.set(setari.culoare); randeaza(); }
      culori(); salveaza();
    };
  }
  async function init() {
    if (!window.Lego) return;
    try { incarca(JSON.parse(localStorage.getItem(CHEIE) || "null") || {}); } catch (e) { incarca({}); }
    uiImprimante = Profiluri.ui<Valori>($("#prof-imprimanta"), {
      eticheta: "Imprimanta", fel: "imprimanta",
      ajutor: "Fiecare imprimantă își ține patul, variantele de la calibrare și cuplajele pieselor de cale printate (din 2D). Ce schimbi aici se scrie în imprimanta aleasă; pagina se deschide cu cea implicită (★).",
      stare: () => imprimante!, salveaza: s => { imprimante = s; salveaza(); rezumatImprimanta(); }, valori: valoriImprimanta, aplica: aplicaImprimanta,
    });
    culori(); reglaje();
    document.querySelectorAll<HTMLElement>("#at-tipuri [data-tip]").forEach(b => { b.onclick = () => { inlocuieste = null; alegeTip(b.dataset.tip === "legaturi" ? ultimaLegatura : b.dataset.tip!); }; });
    $("#at-adauga").onclick = adaugaInLista;
    $("#at-stl").onclick = descarcaSTL;
    $("#at-zip").onclick = descarcaZip;
    $("#at-tabel").addEventListener("click", ev => {
      if ((ev.target as Element).closest<HTMLElement>("#at-la-setari")) { if (window.TrenPentru3D) window.TrenPentru3D.setari(); return; }
      operatieLista(ev);
    });
    $("#at-in-model").onclick = puneInModel;
    $("#at-unghi").onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-u]"); if (b) alegeUnghi(b.dataset.u!); };
    $("#at-vedere-mod").onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-v]"); if (b && b.dataset.v !== vedere) alegeVedere(b.dataset.v!); };
    $("#at-model-lista").onclick = modelInLista;
    $("#at-model-goleste").onclick = () => { $("#at-model-confirma").hidden = false; };
    $("#at-model-goleste-da").onclick = () => { model = []; alesM = null; inlocuieste = null; $("#at-model-confirma").hidden = true; dupaModel(); };
    $("#at-vedere").addEventListener("keydown", tasteModel);
    $("#at-goleste").onclick = () => { $("#at-confirma").hidden = false; };
    $("#at-goleste-da").onclick = () => { lista = []; $("#at-confirma").hidden = true; salveaza(); randeazaLista(); };
    $("#mod-3d").addEventListener("change", schimbaSetare);
    editor();
    document.querySelectorAll<HTMLElement>("#at-tipuri [data-tip]").forEach(b => b.setAttribute("aria-pressed", (b.dataset.tip === tabPentru(stare.tip)) as unknown as string));
    if (eLegatura(stare.tip)) ultimaLegatura = stare.tip;
    try { db = window.claude ? await window.claude.use("db") : null; } catch (e) { db = null; }
    if (db) {
      try {
        const d = await db.doc("atelier/curent").get();
        if (d.exists) { incarca(d.data()); culori(); reglaje(); if (v3.ok) v3.mat.color.set(setari.culoare); if (vedere === "model") { if (pornit) { editorModel(); arataModel(); } } else { editor(); if (pornit) construiesteCurent(); } if (pornit) { randeazaLista(); butonModel(); } }
      } catch (e) { /* raman cele locale */ }
    }
  }
  async function intra() {
    // cand se deschide partea 3D: pornesc previzualizarea (prima data) si iau din nou piesele circuitului
    randeazaLista();
    if (pornit) { if (vedere === "model") arataModel(true); else if (privita) arataPrivita(); return; }
    pornit = true;
    await incarcaThree();
    porneste3D();
    alegeTip(stare.tip);
  }
  return { init, intra, reimprospateaza: () => { tren.cheie = null; if (pornit) randeazaLista(); }, pat: () => ({ pat: setari.pat.slice(), margine: setari.pat_margine }),
    // cuplajele printate s-au schimbat in 2D: se scriu in imprimanta aleasa
    printSchimbat: () => { if (imprimante) { Profiluri.memoreaza(imprimante, valoriImprimanta()); salveaza(); } },
    imprimanta: () => { const a = imprimante && imprimante.lista.find(p => p.id === imprimante!.activ); return a ? a.nume : ""; } };
})();
