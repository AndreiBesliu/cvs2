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
    mod?: string; unealta?: string; brate?: number[]; unghiuri?: number[]; gauriInd?: string[]; contururi?: [number, number][][]; grosime?: number;
    dinti?: number; unghi?: number; sens?: string; modul?: number; janta?: number; banda?: string; spite?: string; nrSpite?: number; canal?: string;
    latCanal?: number; pereche?: number; butuc?: string; pinion?: number; piesa?: string; gauriStift?: string; cursa?: number;
    palete?: number; diametru?: number; pas?: number; latime?: number; paleta?: string; con?: string; inclinare?: number; pupa?: number; capac?: string;
    joc?: number; inel?: string; urechi?: number; opritor?: boolean; mansoane?: [number, string][]; prindere?: string; roata?: number; bolta?: string; disc?: string; rama?: number; colturi?: string;
    linie?: number; ramuri?: number; lungime?: number; miez?: string; agatatoare?: string; varfuri?: number; interior?: number; inaltime?: number; etaje?: number;
    model?: string; desen?: string; relief?: number; cate?: number; text?: string; scris?: string; margine?: string; marime?: number };
  /** O gaură pe grilă: colțul de celulă și tipul. */
  type Gaura = [number, number, string];
  /** O piesă gata de printat: corpul, mărimea și ce a spus motorul despre ea. */
  type PiesaGata = { nume: string; titlu: string; tri: Tri[]; dim: number[]; baza?: number[] | undefined; ax?: number[] | null | undefined; avert?: string[] | undefined; unghi?: number | undefined;
    stifturi?: number | undefined; locasuri?: number | undefined; deschise?: number | undefined; prinderi?: Prindere[] | undefined };
  /** O prindere a unei piese, cum o spune motorul (ADR 0284, felia 3.Ce). */
  type Prindere = ReturnType<typeof Lego.prinderi>[number];
  type InLista = { id: string; def: Def; nume: string; bucati: number };
  /** O piesă din model: unde stă pe grilă (în știfturi și plăci), cât e rotită (în sferturi de tură), ce culoare are. */
  /** O piesă din model. Fără `prins` și `liber`, stă pe grilă la x, y (știfturi), z (plăci), rotită cu `rot` sferturi de
   *  tură. `prins`: stă cu prinderea ei `b` pe prinderea `a` a piesei `de` (rotită cu `unghi` grade în jurul prinderii,
   *  glisată cu `alunec` mm de-a lungul ei), deci o urmează. `liber`: transformarea unei piese desprinse care nu stă drept
   *  pe grilă (ADR 0284, felia 3.Cf). */
  type PrinsM = { de: string; a: number; b: number; unghi: number; alunec: number };
  type Transf = ReturnType<typeof Lego.transfGrila>;
  type Asezat = ReturnType<typeof Lego.rezolvaModel>[number];
  type InModel = { id: string; def: Def; x: number; y: number; z: number; rot: number; culoare: string; prins?: PrinsM; liber?: Transf };
  /** O construcție (ADR 0284, felia 3.Ch): un model cu numele lui. `nume` gol: fără nume, deci „Construcția <nr>”, în limba
   *  paginii; `nr` e unic printre construcții. Atelierul ține mai multe; vederea „Modelul” arată construcția aleasă. */
  type Constructie = { id: string; nume: string; nr: number; model: InModel[] };
  type PiesaTren = ReturnType<typeof TrenPentru3D.piese>["piese"][number] & { dim: number[]; g: number };
  type Valori = Record<string, number | number[] | string | boolean | null | undefined>;
  type Imprimante = { lista: { id: string; nume: string; v: Valori }[]; activ: string; implicit: string };
  /** Vederea 3D: câmpurile există de când `ok` e adevărat (din `porneste3D`). */
  type Vedere3D = { ok: boolean; T: Trei.Biblioteca; r: Trei.WebGLRenderer; scena: Trei.Object3D; cam: Trei.PerspectiveCamera; mat: Trei.Material;
    matTren: Trei.Material; mesh: Trei.Mesh | null; grila: Trei.GridHelper | null; grup?: Trei.Object3D; teta: number; fi: number; dist: number; tinta: Trei.Vector3;
    /** Avertismentele verificării (vălul și conturul pieselor cu probleme; un grup al lor: nu intră în mărimea modelului). */
    avert?: Trei.Object3D;
    /** Punctele prinderilor piesei alese din model (un grup al lor: nu intră în mărimea modelului). */
    puncte?: Trei.Object3D; geomPunct?: Trei.BufferGeometry; geomContur?: Trei.BufferGeometry; matPunct?: Trei.Material; matTinta?: Trei.Material; matContur?: Trei.Material };
  /** Corpul unei piese din model: plasa, amprenta pe grilă (știfturi) și pivotul din mijlocul ei (axul, la piesele rotunde). */
  type CorpModel = { tri: Tri[]; dim: number[]; gw: number; gd: number; pivot: [number, number]; ax: boolean; prinderi: Prindere[]; geom: Trei.BufferGeometry | null };
  type DefMotor = Parameters<typeof Lego.construieste>[0];
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
    arc: { lung: 4, inalt: 1, bolta: "inalta" },
    // cadrul (ADR 0284, felia 3.Cj): fereastra 1 × 4 × 3, cu rama de 1,6 mm și golul drept
    cadru: { lung: 4, inalt: 3, rama: 1.6, colturi: "drepte" },
    // placa turnantă (ADR 0284, felia 3.Ck-1): baza de 2 × 2, cu pivotul ca un capăt de știft Technic (jocul 0)
    turnanta: { piesa: "baza", marime: 2, joc: 0 },
    grinda: { cols: 9, rows: 5, celule: [0, 1, 2, 3, 4].map((i): Gaura => [i, 0, "r"]), groasa: true, unealta: "r", fel: "grila", brate: [6, 4], unghiuri: [53.13], gauriInd: [] as string[] },
    caramidaTechnic: { lung: 4, gauri: ["r", "r", "r"], goale: false },
    ax: { lung: 4 } as { lung: number; opritor?: boolean },
    stiftTechnic: { fanta: true, lung: 2, capat: "stift" },
    lateral: { lung: 1, fete: "una" },
    bucsa: { lung: 1, gaura: "x" },
    // conectorul perpendicular (ADR 0284): câte un cod pe pas, felul găurii (r știft, x ax, p plin) și axa ei (v în sus, o
    // de-a latul, l în lung, doar la capete); implicit, crucea 1 × 2
    conector: { gauri: ["xv", "ro"] },
    conectorUnghi: { mansoane: [[0, "x"], [135, "x"]] as [number, string][], butuc: "r" },
    suport: { lung: 2, adanc: 1, inalt: 1, invers: false },
    clema: { lung: 1, axa: "verticala" },
    maner: { lung: 2, axa: "verticala" },
    bara: { lung: 4 },
    bila: { baza: 1 },
    cupa: { baza: 1 },
    // roata dințată (ADR 0169); `pereche` (dinții roții a doua) e doar a editorului, nu a piesei
    rotita: { dinti: 24, fel: "drepti", unghi: 20, sens: "dreapta", grosime: 3.8, gaura: "x", modul: 1, pereche: 24 },
    cremaliera: { lung: 4, modul: 1, prindere: "stifturi", roata: 8 },
    // șurubul melc (ADR 0284, felia 3.Cj): Ø8 (ca LEGO), de 2 știfturi; `pereche` (dinții roții) e doar a editorului
    melc: { diam: 8, lung: 2, pereche: 24 },
    // cama (ADR 0284, felia 3.Cj): excentricul Ø16 (diametrul de bază) cu cursa de 8 mm, gros cât o grindă, cu gaură de ax
    cama: { forma: "excentric", diam: 16, cursa: 8, grosime: 7.8, gaura: "x" },
    // roata cu anvelopă (ADR 0280): dintr-o bucată (implicit, fără TPU), doar janta sau doar anvelopa (din TPU)
    roata: { fel: "plina", diam: 30.4, lat: 13.6, janta: 16.8, banda: "nervuri", spite: "disc", nrSpite: 5, gaura: "x" },
    // fulia (ADR 0280), ca LEGO 4185: Ø24, canalul în V; `pereche` (Ø fuliei a doua) și `distanta` (dintre axe, mm) sunt doar ale
    // editorului, pentru curea
    fulie: { diam: 24, lat: 3.5, canal: "v", latCanal: 2.6, spite: "stift", nrSpite: 6, gaura: "x", pereche: 24, distanta: 32 },
    // roata conică (ADR 0280), ca LEGO 87407: 20 de dinți, pentru o pereche de 20, gaura de știft, butucul lung; perechea (dinții
    // celeilalte) e a piesei, fiindcă unghiul conului vine din ea
    conica: { dinti: 20, pereche: 20, modul: 1, gaura: "r", butuc: "lung" },
    // roata coroană (ADR 0280), ca LEGO 3650: 24 de dinți, pentru pinionul de 8, gaura de ax, butucul lung; pinionul e al piesei,
    // fiindcă el îi taie dinții
    coroana: { dinti: 24, pinion: 8, modul: 1, gaura: "x", butuc: "lung" },
    // conica dublă (ADR 0280), ca LEGO 32270: 12 dinți, gaura de ax; `pereche` (dinții celeilalte) e doar a editorului, pentru
    // montaj și „Fă perechea”
    conicaDubla: { dinti: 12, modul: 1, gaura: "x", pereche: 12 },
    // șenila (ADR 0280), ca LEGO 57518 pe pinionul 57519: zala sau pinionul (10 dinți, gaura de ax); `pereche` (dinții
    // celuilalt pinion) și `distanta` (dintre axe, în știfturi) sunt doar ale editorului, pentru montaj și „Fă șenila”
    senila: { piesa: "zala", gauriStift: "da", dinti: 10, gaura: "x", pereche: 10, distanta: 8 },
    // elicea (ADR 0282): 3 palete, Ø72 (9 știfturi), pasul 0,7 × diametrul, răsucită, pe butucul LEGO cu gaura de ax
    elice: { palete: 3, diametru: 72, pas: 0.7, latime: 30, forma: "rot", paleta: "rasucita", profil: "placa", sens: "dreapta", gaura: "x", con: "nu" },
    // elicea de barcă (ADR 0282): 3 palete late, Ø40 (5 știfturi), pasul cât diametrul, înclinate înapoi cu 20°, fără
    // înclinarea spre pupa (3.Tt: în piesă doar când nu e 0), gaura de ax
    eliceBarca: { palete: 3, diametru: 40, pas: 1, latime: 100, inclinare: 20, pupa: 0, sens: "dreapta", gaura: "x", capac: "nu" },
    // ventilatorul cu carcasă (ADR 0282): rotorul sau carcasa, Ø40 în carcasă (5 știfturi), 7 palete, jocul 0,8 la vârf, pasul
    // 0,8 × diametrul, lățimea 45 % din rază, gaura de ax, fără inel, carcasa cu 2 urechi
    ventilator: { piesa: "rotor", palete: 7, diametru: 40, joc: 0.8, pas: 0.8, latime: 45, sens: "dreapta", gaura: "x", inel: "nu", urechi: 2 },
    // roata cu palete (ADR 0284, felia 3.Cj): Ø64 (8 știfturi), 8 palete drepte, lată cât două grinzi, cu discul dedesubt
    roataPalete: { diam: 64, palete: 8, lat: 15.8, forma: "drepte", disc: "unul", gaura: "x" },
    // decorațiunile de Crăciun (ADR 0285, felia 3.Cl-1): fulgul (Ø70, linia de 2, două perechi de ramuri la 60°, miezul
    // hexagon), steaua (5 colțuri, Ø70, plină) și brăduțul (80 mm, 3 etaje, de agățat), fiecare cu inelul ei
    fulg: { diam: 70, grosime: 2.4, linie: 2, ramuri: 2, unghi: 60, inceput: 40, lungime: 28, miez: "hexagon", agatatoare: "inel" },
    stea: { varfuri: 5, diam: 70, interior: 40, grosime: 3, fel: "plina", linie: 2.4, agatatoare: "inel" },
    brad: { inaltime: 80, etaje: 3, latime: 65, grosime: 3, fel: "agatat", agatatoare: "inel" },
    // globul (ADR 0285, felia 3.Cl-2): Ø60, plat, cu trei dungi decupate, căpăcel și inel
    glob: { diam: 60, grosime: 3, fel: "plat", model: "dungi", desen: "decupat", relief: 0.8, cate: 3, agatatoare: "inel" },
    // ornamentul cu nume (ADR 0285, felia 3.Cl-3): eticheta de 70 × 26, cu „ANA” în relief și gaura de agățat
    ornament: { forma: "eticheta", text: "ANA", scris: "relief", lungime: 70, inaltime: 26, diam: 60, grosime: 3, relief: 0.8, agatatoare: "gaura" },
    // brăduțul LEGO (ADR 0285, felia 3.Cl-4): etajul de 8 știfturi, de 5 plăci, cu marginea zimțată; `etaje` și steaua sunt
    // ale editorului, pentru „Fă brăduțul”
    bradLego: { piesa: "etaj", diam: 8, placi: 5, margine: "zimti", marime: 28, etaje: 3 },
    // forma trimisă din desenul cvs2 (ADR 0166): doar contururile închise; câte erau deschise și refuzul, pentru om
    dinCvs2: { contururi: [] as [number, number][][], grosime: 3.2, deschise: 0, refuz: "" },
  };
  /** Câmpurile editorului de la pornire (înaintea celor ținute minte): de aici își completează piesele construcțiile gata. */
  const STARE0: typeof stare = JSON.parse(JSON.stringify(stare));
  // Piesele pe familii (ADR 0281): o singură tabelă, din care se fac filele de sus și galeriile de sub ele. Fiecare tip al
  // motorului stă într-o singură familie, afară de „dinCvs2”, care are fila lui (o probă unitară o cere, cu `Lego.tipuri`);
  // „placaTechnic” nu e un tip, ci o formă gata a cărămizii (o placă 2 × 6 cu găuri), deschisă în editorul ei. „Din cvs2” și
  // „Calibrare” sunt file proprii, la capăt (în body.html). Datele nu știu de familii: piesele se țin după tip.
  type Familie = readonly [id: string, nume: string, piese: readonly (readonly [tip: string, nume: string])[]];
  const FAMILII: readonly Familie[] = [
    ["caramizi", "Cărămizi", [["caramida", "Cărămidă / placă"], ["panta", "Pantă"], ["pantaInversa", "Pantă inversă"], ["pana", "Pană / aripă"], ["rotund", "Rotund / con"], ["arc", "Arc"], ["cadru", "Cadru / fereastră"], ["turnanta", "Placă turnantă"],
      ["lateral", "Știfturi pe lateral"], ["suport", "Suport (bracket)"], ["grinda", "Grindă"], ["caramidaTechnic", "Cărămidă Technic"], ["placaTechnic", "Placă cu găuri"]]],
    ["legaturi", "Legături", [["stiftTechnic", "Știft"], ["ax", "Ax"], ["bucsa", "Bucșă / conector"], ["conector", "Conector perpendicular"], ["conectorUnghi", "Conector în unghi"], ["clema", "Clemă"], ["bara", "Bară"], ["maner", "Mâner"], ["bila", "Bilă"], ["cupa", "Cupă"]]],
    ["roti", "Roți", [["rotita", "Roată dințată"], ["cremaliera", "Cremalieră"], ["melc", "Șurub melc"], ["cama", "Camă"], ["conica", "Roată conică"], ["coroana", "Roată coroană"], ["conicaDubla", "Conică dublă"], ["fulie", "Fulie"], ["roata", "Roată cu anvelopă"], ["senila", "Șenilă"]]],
    ["propulsie", "Elice", [["elice", "Elice"], ["eliceBarca", "Elice de barcă"], ["ventilator", "Ventilator cu carcasă"], ["roataPalete", "Roată cu palete"]]],
    ["craciun", "Crăciun", [["fulg", "Fulg de zăpadă"], ["stea", "Stea"], ["brad", "Brăduț"], ["glob", "Glob"], ["ornament", "Ornament cu nume"], ["bradLego", "Brăduț LEGO"]]]
  ];
  // Fulgii gata făcuți (ADR 0285): doar forma (ramurile, miezul, linia); mărimea, grosimea și agățătoarea rămân cum sunt.
  const FULGI: readonly (readonly [string, { ramuri: number; unghi: number; inceput: number; lungime: number; miez: string; linie: number }])[] = [
    ["Clasic", { ramuri: 2, unghi: 60, inceput: 40, lungime: 28, miez: "hexagon", linie: 2 }],
    ["Steluță", { ramuri: 1, unghi: 45, inceput: 55, lungime: 30, miez: "stea", linie: 2.4 }],
    ["Dantelă", { ramuri: 4, unghi: 60, inceput: 25, lungime: 40, miez: "gol", linie: 1.6 }],
    ["Cetină", { ramuri: 3, unghi: 45, inceput: 30, lungime: 32, miez: "hexagon", linie: 2 }],
    ["Săgeți", { ramuri: 2, unghi: 35, inceput: 60, lungime: 24, miez: "stea", linie: 2 }],
    ["Simplu", { ramuri: 0, unghi: 60, inceput: 40, lungime: 28, miez: "gol", linie: 3 }],
  ];
  // Stelele gata făcute: forma și felul; diametrul și agățătoarea rămân cum sunt.
  const STELE: readonly (readonly [string, { varfuri: number; interior: number; fel: string; grosime: number; linie: number }])[] = [
    ["Clasică", { varfuri: 5, interior: 40, fel: "plina", grosime: 3, linie: 2.4 }],
    ["Contur", { varfuri: 5, interior: 40, fel: "contur", grosime: 3, linie: 2.4 }],
    ["De vârf", { varfuri: 5, interior: 45, fel: "relief", grosime: 8, linie: 2.4 }],
    ["Cu 6 colțuri", { varfuri: 6, interior: 58, fel: "plina", grosime: 3, linie: 2.4 }],
    ["Cu 8 colțuri", { varfuri: 8, interior: 55, fel: "plina", grosime: 3, linie: 2.4 }],
  ];
  /** Câte dungi, zigzaguri sau stele poate avea un glob (marginile câmpului; aceleași ca în motor). */
  const CATE_GLOB: Readonly<Record<string, readonly [number, number]>> = { dungi: [1, 5], zigzag: [1, 3], stele: [3, 8] };
  /** Un fulg la întâmplare, mereu tipăribil: doar forma (ramurile și miezul), în marginile motorului. */
  function fulgIntamplator(): { ramuri: number; unghi: number; inceput: number; lungime: number; miez: string } {
    const intre = (a: number, b: number, pas = 1) => a + pas * Math.floor(Math.random() * ((b - a) / pas + 1));
    return { ramuri: intre(1, 4), unghi: intre(35, 70, 5), inceput: intre(25, 60, 5), lungime: intre(18, 42, 2), miez: ["hexagon", "stea", "gol"][intre(0, 2)]! };
  }
  /** Familia fiecărei piese din galerii. */
  const FAMILIA = new Map(FAMILII.flatMap(([f, , piese]) => piese.map(([k]): [string, string] => [k, f])));
  /** Fila de sus a unui tip: familia lui, sau chiar tipul, la filele proprii („calibrare”, „dinCvs2”). */
  const filaPentru = (t: string): string => FAMILIA.get(t) ?? t;
  /** Ultima piesă aleasă pe fiecare filă de familie; la început, prima din galeria ei. */
  const ultima = new Map(FAMILII.map(([f, , piese]): [string, string] => [f, piese[0]![0]]));
  // Pictogramele pieselor (ADR 0281, felia 3.Tp↑b): un desen mic pe fiecare buton al galeriilor, ca piesa să se recunoască
  // fără să fie citită. Fiecare e marcajul unui SVG de 24 × 24, doar cu linii: grosimea, capetele și culoarea (a textului,
  // deci după temă și după apăsare) le dă `.at-pict`, din head.html. O piesă nouă din FAMILII își pune aici desenul, pe un
  // rând; până atunci, butonul ei are pictograma generică (un cub), iar proba unitară (`trenulet.pictograme.test.ts`) i-l cere.
  const PICTOGRAME: Readonly<Record<string, string>> = {
    caramida: `<rect x="3" y="10" width="18" height="9" rx="1"/><path d="M5.5 10V7.5h4V10M14.5 10V7.5h4V10"/>`,
    panta: `<path d="M3 19V9.5h6L21 16.5V19z"/><path d="M4.5 9.5V7h4v2.5"/>`,
    pantaInversa: `<path d="M3 9.5h18V19h-7L3 13z"/><path d="M5 9.5V7h4v2.5M15 9.5V7h4v2.5"/>`,
    pana: `<path d="M3.5 4.5v15h17z"/><circle cx="7.5" cy="15.5" r="1.6"/><circle cx="7.5" cy="10.5" r="1.6"/><circle cx="12.5" cy="15.5" r="1.6"/>`,
    rotund: `<path d="M6 11.5v6a6 2.3 0 0 0 12 0v-6"/><ellipse cx="12" cy="11.5" rx="6" ry="2.3"/><path d="M9.8 11.2V8a2.2.85 0 0 1 4.4 0v3.2"/>`,
    arc: `<path d="M2.5 19v-11h19v11h-4.5v-1.5a5 5 0 0 0-10 0v1.5z"/><path d="M5 8v-2.2h3.2v2.2M10.4 8v-2.2h3.2v2.2M15.8 8v-2.2h3.2v2.2"/>`,
    cadru: `<path d="M3 20.5v-13.5h18v13.5z"/><path d="M6.5 17.5v-7.5h11v7.5z"/><path d="M5 7v-2.2h3.2v2.2M10.4 7v-2.2h3.2v2.2M15.8 7v-2.2h3.2v2.2"/>`,
    turnanta: `<path d="M3 21h18v-3.5h-18z"/><path d="M4.5 17.5v-3.5h15v3.5"/><path d="M7.5 14v-2h3v2M13.5 14v-2h3v2"/><path d="M17.6 6.6a7 2.6 0 1 1-4.2-2.1"/><path d="M13.4 2.7l.1 1.9-1.8.6"/>`,
    lateral: `<rect x="5" y="9" width="11" height="11" rx="1"/><path d="M8.5 9V6.5h4V9M16 12.5h2.5v4H16"/>`,
    suport: `<path d="M5 5.5h3.5V15H21v4H5z"/><path d="M5 8H2.5v4H5M13 15v-2.5h4V15"/>`,
    grinda: `<rect x="2" y="8" width="20" height="8" rx="4"/><circle cx="6" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="18" cy="12" r="2"/>`,
    caramidaTechnic: `<rect x="3" y="10" width="18" height="9" rx="1"/><path d="M5.5 10V7.5h4V10M14.5 10V7.5h4V10"/><circle cx="7.5" cy="14.5" r="2"/><circle cx="16.5" cy="14.5" r="2"/>`,
    placaTechnic: `<rect x="2.5" y="6" width="19" height="12" rx="1"/><circle cx="8.5" cy="12" r="2.1"/><circle cx="15.5" cy="12" r="2.1"/><path d="M5 8.8h.01M12 8.8h.01M19 8.8h.01M5 15.2h.01M12 15.2h.01M19 15.2h.01" stroke-width="2.6"/>`,
    stiftTechnic: `<path d="M10.5 9.5h-7a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h7M13.5 9.5h7a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-7M2.5 12H6M18 12h3.5"/><rect x="10.5" y="7.5" width="3" height="9" rx=".8"/>`,
    ax: `<path d="M9.5 3.5h5v6h6v5h-6v6h-5v-6h-6v-5h6z"/>`,
    conector: `<rect x="2.5" y="7" width="19" height="10" rx="1"/><path d="M12 7v10"/><circle cx="7.2" cy="12" r="2.3"/><path d="M16.8 9.6v4.8M14.4 12h4.8"/>`,
    conectorUnghi: `<circle cx="10" cy="15" r="2.8"/><path d="M12.7 13.2h8.8v3.6h-8.8M9.4 12.3 5.6 8.5 3.1 11l3.8 3.8"/>`,
    bucsa: `<circle cx="12" cy="12" r="8.5"/><path d="M10.8 7.5h2.4v3.3h3.3v2.4h-3.3v3.3h-2.4v-3.3H7.5v-2.4h3.3z"/>`,
    clema: `<rect x="2.5" y="13" width="9" height="4" rx=".8"/><path d="M5 13v-2.5h4V13M11.5 15H14M19.3 12.2a3.6 3.6 0 1 0 0 5.6"/>`,
    bara: `<rect x="2" y="10.5" width="20" height="3" rx="1.5"/>`,
    maner: `<rect x="3" y="8" width="18" height="4" rx=".8"/><path d="M5.5 8V5.5h4V8M14.5 8V5.5h4V8M7.5 12v3.5a2.5 2.5 0 0 0 2.5 2.5h4a2.5 2.5 0 0 0 2.5-2.5V12"/>`,
    bila: `<rect x="3" y="15.5" width="18" height="4" rx=".8"/><path d="M4.5 15.5V13h3.5v2.5M16 15.5V13h3.5v2.5M10.5 15.5v-2.2M13.5 15.5v-2.2"/><circle cx="12" cy="8.5" r="4.8"/>`,
    cupa: `<rect x="3" y="15.5" width="18" height="4" rx=".8"/><path d="M4.5 15.5V13h3.5v2.5M16 15.5V13h3.5v2.5M8 4.5v4.5a4 4 0 0 0 8 0V4.5M12 13v2.5"/>`,
    rotita: `<path d="M10.2 4.6L10.5 1.6L13.5 1.6L13.8 4.6L16 5.5L18.3 3.6L20.4 5.7L18.5 8L19.4 10.2L22.4 10.5L22.4 13.5L19.4 13.8L18.5 16L20.4 18.3L18.3 20.4L16 18.5L13.8 19.4L13.5 22.4L10.5 22.4L10.2 19.4L8 18.5L5.7 20.4L3.6 18.3L5.5 16L4.6 13.8L1.6 13.5L1.6 10.5L4.6 10.2L5.5 8L3.6 5.7L5.7 3.6L8 5.5z"/><path d="M12 9.6v4.8M9.6 12h4.8"/>`,
    cama: `<path d="M8 4.2a7.9 7.9 0 0 0 0 15.6l9.6-3.3a4.8 4.8 0 0 0 0-9z"/><path d="M8 10v4M6 12h4"/>`,
    cremaliera: `<path d="M2.5 18.5h19v-5.5h-1.6l-1.2-3.6h-1.6l-1.2 3.6h-1.4l-1.2-3.6h-1.6l-1.2 3.6h-1.4l-1.2-3.6H6.3l-1.2 3.6H2.5z"/><path d="M6 16h.01M12 16h.01M18 16h.01"/>`,
    melc: `<path d="M4.5 8h15v8h-15z"/><path d="M6.4 16l2.4-8M10.2 16l2.4-8M14 16l2.4-8M17.8 16l1.7-5.6M4.5 13.6L6.2 8"/><path d="M1.5 12h3M19.5 12h3"/>`,
    conica: `<path d="M3.5 16.5h17L17 8.5H7zM9 16.5V20h6v-3.5"/><path d="M7 8.5l1-2 1.6 2 1.6-2 1.6 2 1.6-2 1.6 2 1-2 1 2"/>`,
    coroana: `<path d="M3 13.5V9.5h3v4h3v-4h3v4h3v-4h3v4h3v-4M3 13.5h18v5H3z"/>`,
    conicaDubla: `<path d="M7 4h10l3.5 6.5v3L17 20H7l-3.5-6.5v-3zM3.5 10.5h17M3.5 13.5h17M7 10.5v3M10 10.5v3M14 10.5v3M17 10.5v3"/>`,
    fulie: `<circle cx="12" cy="12" r="9.5"/><circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="7.6" r="1.3"/><circle cx="16.2" cy="10.6" r="1.3"/><circle cx="14.6" cy="15.6" r="1.3"/><circle cx="9.4" cy="15.6" r="1.3"/><circle cx="7.8" cy="10.6" r="1.3"/><path d="M12 11v2M11 12h2"/>`,
    roata: `<circle cx="12" cy="12" r="9.5"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="1.8"/><path d="M12 6v4.2M12 13.8V18M6 12h4.2M13.8 12H18"/>`,
    senila: `<path d="M8 6.5h8a5.5 5.5 0 0 1 0 11H8a5.5 5.5 0 0 1 0-11z" pathLength="48" stroke-dasharray="2.4 1.6"/><circle cx="8" cy="12" r="2.6"/><circle cx="16" cy="12" r="2.6"/>`,
    elice: `<circle cx="12" cy="12" r="2.2"/><path d="M10.7 10.2C7.8 7.7 7.6 2.7 10.8 1.9C13 1.4 14.6 6 13.3 10.2M14.2 11.7C17.8 10.5 22.3 12.8 21.3 16C20.7 18.2 15.9 17.3 12.9 14M11.1 14C10.4 17.8 6.1 20.5 3.9 18.1C2.3 16.4 5.5 12.7 9.8 11.7"/>`,
    eliceBarca: `<circle cx="12" cy="12" r="2.2"/><path d="M10.4 10.3C6 9 5.8 3.4 10.3 2.7C14.4 2 16.7 6.2 13.5 10.2M14.3 11.5C17.6 8.3 22.5 10.9 20.9 15.2C19.5 19.1 14.7 19 12.8 14.2M11.3 14.2C12.4 18.7 7.7 21.7 4.8 18.1C2.1 14.9 4.6 10.8 9.7 11.6"/>`,
    ventilator: `<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="2.2"/><path d="M12 9.4Q12.4 5.8 18 6.2M9.5 11.2Q6.3 9.7 8.3 4.5M10.5 14.1Q8 16.7 3.7 13.2M13.5 14.1Q15.3 17.3 10.5 20.3M14.5 11.2Q18 10.5 19.4 15.9"/>`,
    roataPalete: `<circle cx="12" cy="12" r="2.4"/><path d="M14.4 12H22M13.7 13.7L19.1 19.1M12 14.4V22M10.3 13.7L4.9 19.1M9.6 12H2M10.3 10.3L4.9 4.9M12 9.6V2M13.7 10.3L19.1 4.9"/>`,
    fulg: `<path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7"/><path d="M9.8 4.2L12 6.4l2.2-2.2M9.8 19.8L12 17.6l2.2 2.2M3.4 10.2l3 .8.8-3M20.6 13.8l-3-.8-.8 3M3.4 13.8l3-.8.8 3M20.6 10.2l-3 .8-.8-3"/>`,
    stea: `<path d="M12 3.1L14.2 9.5L21 9.7L15.6 13.8L17.6 20.3L12 16.4L6.4 20.3L8.4 13.8L3 9.7L9.8 9.5z"/>`,
    brad: `<path d="M12 2.5l4.2 6h-2.4l4 5.5h-2.6l4.3 5.5H4.5l4.3-5.5H6.2l4-5.5H7.8z"/><path d="M12 19.5V22"/>`,
    glob: `<circle cx="12" cy="14" r="7.5"/><path d="M10 6.6V4h4v2.6M5.3 11.5h13.4M5.3 16.5h13.4"/>`,
    ornament: `<path d="M7.5 6H21v12H7.5L3 13.5v-3z"/><circle cx="7" cy="12" r="1.1"/><path d="M11.5 15.5l2.5-7 2.5 7M12.4 13.2h3.2"/>`,
    bradLego: `<path d="M9.5 8.5L11 4.5h2l1.5 4zM6.5 14l2-5.5h7l2 5.5zM3.5 19.5l2-5.5h13l2 5.5zM10 19.5V22h4v-2.5M11 4.5V3h2v1.5"/>`,
  };
  const PICTOGRAMA_GENERICA = `<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9"/>`;
  /** Butonul unei piese din galerie: pictograma ei, apoi numele (pictograma e ascunsă cititoarelor de ecran: butonul se
   *  numește tot ca piesa). */
  const butonPiesa = (k: string, n: string) =>
    `<button type="button" data-piesa="${k}"><svg class="at-pict" viewBox="0 0 24 24" aria-hidden="true">${PICTOGRAME[k] ?? PICTOGRAMA_GENERICA}</svg>${n}</button>`;
  let puneGrila: boolean | null = null, trageGrinda = false;
  // inaltimile (ADR 0168) sunt implicitele motorului (Lego.IMPLICIT; o proba le tine la fel); regulile lor, in Lego.inaltimi
  const SETARI_IMPLICIT = { varianta_stift: 3, varianta_locas: 3, varianta_gaura: 3, varianta_ax: 3, varianta_bara: 3, varianta_cupa: 3, varianta_dinti: 3, varianta_janta: 3, stift_h: 1.9, locas_h: 2.1, locas_urmeaza: true, pat: [180, 180], pat_margine: 5, pat_distanta: 4, debit: 5, culoare: "#c8322b", cuTren: true };
  // imprimantele: fiecare cu patul ei, variantele de la calibrare si inaltimile (si cuplajele pieselor de cale printate, din 2D)
  const CHEI_IMPRIMANTA: (keyof typeof SETARI_IMPLICIT)[] = ["pat", "pat_margine", "pat_distanta", "debit", "varianta_stift", "varianta_locas", "varianta_gaura", "varianta_ax", "varianta_bara", "varianta_cupa", "varianta_dinti", "varianta_janta", "stift_h", "locas_h", "locas_urmeaza"];
  const INALTIMI = ["stift_h", "locas_h", "locas_urmeaza"] as const;
  // inaltimile din setari prin motor: la zecimi, in margini, locasul dupa stift cat e bifat
  function puneInaltimi(v: Valori) {
    const h = Lego.inaltimi(v);
    setari.stift_h = h.stift_h; setari.locas_h = h.locas_h; setari.locas_urmeaza = v.locas_urmeaza !== false;
  }
  let imprimante: Imprimante | null = null, uiImprimante: { desen(): void } | null = null;
  const valoriImprimanta = (): Valori => ({ ...JSON.parse(JSON.stringify(Object.fromEntries(CHEI_IMPRIMANTA.map(k => [k, setari[k]])))),
    ...(window.TrenPentru3D && TrenPentru3D.print ? TrenPentru3D.print() : {}) });
  function puneImprimanta(v: Valori | null) {
    // valorile unui profil peste setarile de acum (doar cele care se pot citi)
    if (!v) return;
    for (const k of CHEI_IMPRIMANTA) {
      if (k === "pat") { if (Array.isArray(v.pat) && v.pat.length === 2 && v.pat.every(x => Number.isFinite(+x))) setari.pat = v.pat.map(x => Math.min(500, Math.max(60, Math.round(+x)))); continue; }
      if ((INALTIMI as readonly string[]).includes(k)) continue;
      // debitul mediu (ADR 0284, 3.Ch): cât filament curge, în mm³/s, între 1 și 50
      if (k === "debit") { if (Number.isFinite(+v[k]!) && v[k] !== null && v[k] !== "") setari.debit = debitBun(+v[k]!); continue; }
      if (Number.isFinite(+v[k]!) && v[k] !== null && v[k] !== "") (setari as Valori)[k] = k.startsWith("varianta_") ? Math.min(9, Math.max(-3, Math.round(+v[k]!))) : Math.max(0, Math.round(+v[k]!));
    }
    // un profil de dinainte de 18.8.0 n-are inaltimile: ia implicitele motorului
    puneInaltimi(v);
    if (window.TrenPentru3D && TrenPentru3D.seteazaPrint) TrenPentru3D.seteazaPrint({ print_tata: v.print_tata as number | undefined, print_mama: v.print_mama as number | undefined });
  }
  let setari = { ...SETARI_IMPLICIT, pat: SETARI_IMPLICIT.pat.slice() };
  /** Debitul mediu al imprimantei, întreg, între 1 și 50 mm³/s. */
  function debitBun(v: number) { return Math.min(50, Math.max(1, Math.round(v))); }
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
    if (d.tip === "dinCvs2") return tr`Formă din cvs2, ${fmt(d.grosime ?? 3.2)} mm`;
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
    if (d.tip === "arc") {
      // ca la arcele LEGO: 1 × lungimea (× înălțimea în cărămizi, când nu e una); bolta, doar când e joasă
      const q = Lego.arcCote(d);
      return tr`Arc 1×${q.lung}` + (q.inalt > 1 ? `×${q.inalt}` : "") + (q.bolta === "joasa" ? tr(", boltă joasă") : "");
    }
    if (d.tip === "cadru") {
      // ca la ferestrele LEGO: 1 × lungimea × înălțimea în cărămizi; apoi ce nu e obișnuit: rama, colțurile teșite
      const q = Lego.cadruCote(d);
      return tr`Cadru 1×${q.lung}×${q.inalt}` + (q.rama === 1.6 ? "" : tr`, rama ${fmt(q.rama)} mm`) + (q.colturi === "tesite" ? tr(", colțuri teșite") : "");
    }
    if (d.tip === "turnanta") {
      // mărimea, apoi piesa; jocul pivotului, doar când nu e cel al știftului Technic
      const q = Lego.turnantaCote(d);
      return tr`Placă turnantă ${q.marime}×${q.marime}, ` + (q.piesa === "sus" ? tr("partea de sus") : tr("baza")) + (q.piesa === "baza" && q.joc ? tr`, jocul ${fmt(q.joc, 2)}` : "");
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
    if (d.tip === "ax") return tr`Ax ${d.lung}` + (d.opritor ? tr(" cu opritor") : "");
    if (d.tip === "stiftTechnic") return `${d.capat === "ax" ? tr("Știft cu ax") : d.capat === "bucsa" ? tr("Știft cu bucșă") : tr("Știft Technic")}${+d.lung! === 3 ? " 3" : ""}${d.fanta ? "" : tr(", fără fantă")}`;
    if (d.tip === "bucsa") return +d.lung! === 0.5 ? tr("Bucșă ½") : d.gaura === "xr" ? tr`Conector ax–știft ${d.lung}` : `${+d.lung! === 1 ? tr("Bucșă") : tr("Conector de ax")} ${+d.lung! === 1 ? "" : d.lung}`.trim() + (d.gaura === "r" ? tr(", gaură rotundă") : "");
    if (d.tip === "conector") {
      // fiecare pas, pe nume (și în numele fișierului): „ax sus, știft lateral”
      const pasi = coduriConector(d.gauri).map(c => (c[0] === "p" ? tr("plin") : `${c[0] === "x" ? tr("ax") : tr("știft", "pin")} ${c[1] === "o" ? tr("lateral") : c[1] === "l" ? tr("în lung") : tr("sus", "conector")}`));
      return tr`Conector 1×${pasi.length}: ${pasi.join(", ")}`;
    }
    if (d.tip === "conectorUnghi") {
      // fiecare braț, pe nume (și în numele fișierului): „ax, ax 135°”; butucul, doar când nu e cel obișnuit (gaura de știft)
      const fel = (f: string) => (f === "r" ? tr("știft", "pin") : tr("ax"));
      const brate = mansoaneUnghi(d.mansoane).map(([u, f], k) => (k ? `${fel(f)} ${fmt(u)}°` : fel(f)));
      return tr`Conector în unghi: ${brate.join(", ")}` + (d.butuc === "x" ? tr(", butuc de ax") : d.butuc === "p" ? tr(", butuc plin") : "");
    }
    if (d.tip === "suport") return tr`Suport ${d.adanc}×${d.lung} – ${d.inalt}×${d.lung}${d.invers ? tr(", întors") : ""}`;
    if (d.tip === "clema") return tr`Placă 1×${d.lung} cu clemă${d.axa === "orizontala" ? tr(" culcată") : ""}`;
    if (d.tip === "maner") return tr`Placă 1×${d.lung} cu mâner${d.axa === "verticala" ? tr(" în picioare") : ""}`;
    if (d.tip === "bara") return tr`Bară ${d.lung}`;
    if (d.tip === "bila") return tr`Placă ${d.baza}×${d.baza} cu bilă`;
    if (d.tip === "cupa") return tr("Placă 1×1 cu cupă");
    if (d.tip === "cremaliera") {
      // lungimea, roata pereche (de ea ține înălțimea), apoi ce nu e obișnuit: găurile, modulul
      const q = Lego.cremalieraMontaj(d);
      return tr`Cremalieră 1×${q.lung}, roata de ${q.z}` + (q.prindere === "gauri" ? tr(", cu găuri") : "") + (q.m === 1 ? "" : tr`, modul ${fmt(q.m)}`);
    }
    if (d.tip === "melc") { const q = Lego.melcCote(d); return tr`Șurub melc Ø${q.diam}, lung ${q.lung}`; }
    if (d.tip === "cama") {
      // forma, diametrul de bază și cursa; apoi ce nu e obișnuit: grosimea, gaura rotundă
      const q = Lego.camaCote(d), f = q.forma === "para" ? tr("Camă pară") : q.forma === "melc" ? tr("Camă melc") : tr("Camă excentrică");
      return tr`${f} Ø${fmt(q.diam)}, cursa ${fmt(q.cursa)}` + (q.grosime === 7.8 ? "" : tr`, ${fmt(q.grosime)} mm`) + (q.gaura === "r" ? tr(", gaură rotundă") : "");
    }
    if (d.tip === "roataPalete") {
      // diametrul și paletele; apoi ce nu e obișnuit: paletele curbate, lățimea, lipsa discului, gaura rotundă
      const q = Lego.roataPaleteCote(d);
      return tr`Roată cu palete Ø${fmt(q.diam)}, ${q.palete} palete` + (q.forma === "curbate" ? tr(", curbate") : "") + (q.lat === 15.8 ? "" : tr`, lată ${fmt(q.lat)} mm`)
        + (q.disc === "fara" ? tr(", fără disc") : "") + (q.gaura === "r" ? tr(", gaură rotundă") : "");
    }
    if (d.tip === "fulg") {
      // diametrul și ramurile; apoi ce nu e obișnuit: unde încep și cât sunt de lungi, miezul, linia, grosimea, lipsa inelului
      const q = Lego.fulgCote(d);
      return (q.ramuri ? tr`Fulg Ø${fmt(q.diam)}, ramuri ${q.ramuri} × ${q.unghi}°` : tr`Fulg Ø${fmt(q.diam)}, fără ramuri`)
        + (q.ramuri && (q.inceput !== 40 || q.lungime !== 28) ? tr`, de la ${q.inceput} %, lungi de ${q.lungime} %` : "")
        + (q.miez === "stea" ? tr(", miez stea") : q.miez === "gol" ? tr(", miez gol") : "") + (q.linie === 2 ? "" : tr`, linia ${fmt(q.linie)}`)
        + (q.grosime === 2.4 ? "" : tr`, ${fmt(q.grosime)} mm`) + (q.agatatoare === "fara" ? tr(", fără inel") : "");
    }
    if (d.tip === "stea") {
      // colțurile și diametrul; apoi ce nu e obișnuit: interiorul, felul, grosimea, agățătoarea
      const q = Lego.steaCote(d);
      return tr`Stea cu ${q.varfuri} colțuri Ø${fmt(q.diam)}` + (q.interior === 40 ? "" : tr`, interiorul la ${q.interior} %`)
        + (q.fel === "contur" ? tr`, contur de ${fmt(q.linie)}` : q.fel === "relief" ? tr(", în relief") : "") + (q.grosime === 3 ? "" : tr`, ${fmt(q.grosime)} mm`)
        + (q.agatatoare === "gaura" ? tr(", cu gaură") : q.agatatoare === "fara" ? tr(", fără inel") : "");
    }
    if (d.tip === "brad") {
      // înălțimea și etajele; apoi ce nu e obișnuit: lățimea, grosimea, felul, agățătoarea
      const q = Lego.bradCote(d);
      return tr`Brăduț de ${fmt(q.inaltime)} mm, ${q.etaje} etaje` + (q.latime === 65 ? "" : tr`, lat de ${q.latime} %`) + (q.grosime === 3 ? "" : tr`, ${fmt(q.grosime)} mm`)
        + (q.fel === "picioare" ? tr(", în picioare") : q.agatatoare === "gaura" ? tr(", cu gaură") : q.agatatoare === "fara" ? tr(", fără inel") : "");
    }
    if (d.tip === "glob") {
      // diametrul și modelul (câte dungi, zigzaguri sau stele); apoi relieful, grosimea neobișnuită, lipsa inelului
      const q = Lego.globCote(d);
      const model = q.fel === "discuri" ? tr(", din două discuri") : q.model === "fara" ? tr(", fără model")
        : (q.model === "zigzag" ? tr`, zigzag × ${q.cate}` : q.model === "stele" ? tr`, stele × ${q.cate}` : tr`, dungi × ${q.cate}`) + (q.schimb ? tr`, în relief de ${fmt(q.relief)}` : "");
      return tr`Glob Ø${fmt(q.diam)}` + model + (q.grosime === 3 ? "" : tr`, ${fmt(q.grosime)} mm`) + (q.agatatoare === "fara" ? tr(", fără inel") : "");
    }
    if (d.tip === "bradLego") {
      // etajul: câte știfturi are în diametru; apoi înălțimea neobișnuită și marginea netedă. Steaua: mărimea
      const q = Lego.bradLegoCote(d);
      if (q.piesa === "stea") return tr`Stea de vârf, ${fmt(q.marime)} mm`;
      return tr`Etaj de brăduț, ${q.diam} știfturi` + (q.placi === 5 ? "" : tr`, ${q.placi} plăci`) + (q.margine === "neteda" ? tr(", neted") : "");
    }
    if (d.tip === "ornament") {
      // forma și numele; apoi mărimea, scrisul (adâncit, decupat sau relieful neobișnuit), grosimea neobișnuită, lipsa agățătorii
      const q = Lego.ornamentCote(d), cu = q.text !== "", et = q.forma === "eticheta";
      const cap = q.forma === "glob" ? (cu ? tr`Glob „${q.text}”` : tr("Glob fără nume")) : q.forma === "inima" ? (cu ? tr`Inimă „${q.text}”` : tr("Inimă fără nume"))
        : q.forma === "stea" ? (cu ? tr`Stea „${q.text}”` : tr("Stea fără nume")) : cu ? tr`Etichetă „${q.text}”` : tr("Etichetă fără nume");
      const scris = !cu ? "" : q.scris === "decupat" ? tr(", decupat") : q.scris === "adancit" ? (q.relief === 0.8 ? tr(", adâncit") : tr`, adâncit ${fmt(q.relief)} mm`) : q.relief === 0.8 ? "" : tr`, în relief de ${fmt(q.relief)}`;
      return cap + (et ? tr`, ${fmt(q.lungime)} × ${fmt(q.inaltime)} mm` : tr`, de ${fmt(q.diam)} mm`) + scris + (q.grosime === 3 ? "" : tr`, ${fmt(q.grosime)} mm`)
        + (q.agatatoare !== "fara" ? "" : et ? tr(", fără gaură") : tr(", fără inel"));
    }
    if (d.tip === "rotita") {
      const sens = d.sens === "stanga" ? tr("stânga") : tr("dreapta");
      const fel = d.fel === "oblici" ? tr`, dinți oblici ${fmt(d.unghi ?? 20, 0)}° ${sens}` : d.fel === "inv" ? tr`, dinți în V ${fmt(d.unghi ?? 20, 0)}° ${sens}` : "";
      const g = d.gaura === "r" ? tr(", gaură rotundă") : d.gaura === "nu" ? tr(", fără gaură") : "";
      const m = d.modul && d.modul !== 1 ? tr`, modulul ${fmt(d.modul)}` : "";
      return tr`Roată dințată ${d.dinti ?? 24}${fel}${g}${m}`;
    }
    if (d.tip === "roata") {
      const g = d.gaura === "r" ? tr(", gaură rotundă") : d.gaura === "nu" ? tr(", fără gaură") : "";
      const b = d.banda === "neteda" ? tr(", netedă") : d.banda === "blocuri" ? tr(", cu blocuri") : "";
      const n = d.nrSpite ?? 5;
      const s = d.spite === "drepte" ? tr`, ${n} spițe` : d.spite === "y" ? tr`, ${n} spițe în Y` : d.spite === "gauri" ? tr`, ${n} găuri` : "";
      if (d.fel === "janta") return tr`Jantă Ø ${fmt(d.janta ?? 16.8)} × ${fmt(d.lat ?? 13.6)}${s}${g}`;
      if (d.fel === "anvelopa") return tr`Anvelopă ${fmt(d.diam ?? 30.4)} × ${fmt(d.lat ?? 13.6)}${b}`;
      return tr`Roată ${fmt(d.diam ?? 30.4)} × ${fmt(d.lat ?? 13.6)}${b}${s}${g}`;
    }
    if (d.tip === "fulie") {
      // mărimile, cum ies (motorul lărgește obada pentru canal și diametrul pentru butuc); canalul în V de 2,6 nu se spune
      const f = Lego.fulieFete(d), w = d.latCanal, n = d.nrSpite ?? 6;
      const g = d.gaura === "r" ? tr(", gaură rotundă") : d.gaura === "nu" ? tr(", fără gaură") : "";
      const c = d.canal === "rotund" ? (w === undefined || w === 2 ? tr(", canal rotund") : tr`, canal rotund de ${fmt(w)}`)
        : d.canal === "plat" ? tr`, curea de ${fmt(w ?? 4)}` : w === undefined || w === 2.6 ? "" : tr`, canal în V de ${fmt(w)}`;
      const s = d.spite === "drepte" ? tr`, ${n} spițe` : d.spite === "y" ? tr`, ${n} spițe în Y` : d.spite === "disc" ? tr(", plină") : "";
      return tr`Fulie Ø ${fmt(f.D)} × ${fmt(f.W)}${c}${s}${g}`;
    }
    if (d.tip === "conica") {
      const g = d.gaura === "r" ? tr(", gaură rotundă") : d.gaura === "nu" ? tr(", fără gaură") : "";
      const b = d.butuc === "scurt" ? tr(", butuc scurt") : "", m = d.modul && d.modul !== 1 ? tr`, modulul ${fmt(d.modul)}` : "";
      return tr`Roată conică ${d.dinti ?? 20} pentru ${d.pereche ?? 20}${g}${b}${m}`;
    }
    if (d.tip === "coroana") {
      const g = d.gaura === "r" ? tr(", gaură rotundă") : d.gaura === "nu" ? tr(", fără gaură") : "";
      const b = d.butuc === "scurt" ? tr(", butuc scurt") : "", m = d.modul && d.modul !== 1 ? tr`, modulul ${fmt(d.modul)}` : "";
      return tr`Roată coroană ${d.dinti ?? 24} pentru pinionul de ${d.pinion ?? 8}${g}${b}${m}`;
    }
    if (d.tip === "conicaDubla") {
      const g = d.gaura === "r" ? tr(", gaură rotundă") : d.gaura === "nu" ? tr(", fără gaură") : "";
      return tr`Conică dublă ${d.dinti ?? 12}${g}${d.modul && d.modul !== 1 ? tr`, modulul ${fmt(d.modul)}` : ""}`;
    }
    if (d.tip === "senila") {
      if (d.piesa !== "pinion") return d.gauriStift === "nu" ? tr("Zală de șenilă, fără găuri") : tr("Zală de șenilă");
      const g = d.gaura === "r" ? tr(", gaură rotundă") : d.gaura === "nu" ? tr(", fără gaură") : "";
      return tr`Pinion de șenilă ${d.dinti ?? 10}${g}`;
    }
    if (d.tip === "elice") {
      const g = d.gaura === "r" ? tr(", gaură rotundă") : d.gaura === "b" ? tr(", pentru bară") : d.gaura === "nu" ? tr(", fără gaură") : "";
      const pl = d.paleta === "plata" ? tr(", plată") : "", s = d.sens === "stanga" ? tr(", stânga") : "", c = d.con === "da" ? tr(", cu con") : "";
      return tr`Elice Ø${fmt(d.diametru ?? 72, 1)} cu ${d.palete ?? 3} palete, pasul ${fmt(d.pas ?? 0.7, 2)}${pl}${s}${g}${c}`;
    }
    if (d.tip === "eliceBarca") {
      // lățimea și înclinarea, doar când nu sunt cele obișnuite (ca modulul la roți): două elice diferite au nume diferite;
      // înclinarea spre pupa (3.Tt), doar când e
      const g = d.gaura === "r" ? tr(", gaură rotundă") : d.gaura === "b" ? tr(", pentru bară") : d.gaura === "nu" ? tr(", fără gaură") : "";
      const l = (d.latime ?? 100) !== 100 ? tr`, lățimea ${d.latime} %` : "", i = (d.inclinare ?? 20) !== 20 ? tr`, înclinarea ${d.inclinare}°` : "";
      const pu = (d.pupa ?? 0) > 0 ? tr`, spre pupa ${d.pupa}°` : "";
      const s = d.sens === "stanga" ? tr(", stânga") : "", c = d.capac === "da" ? tr(", cu capac") : "";
      return tr`Elice de barcă Ø${fmt(d.diametru ?? 40, 1)} cu ${d.palete ?? 3} palete, pasul ${fmt(d.pas ?? 1, 2)}${l}${i}${pu}${s}${g}${c}`;
    }
    if (d.tip === "ventilator") {
      // carcasa: diametrul din interior, înălțimea (crește cu paletele) și urechile; rotorul: jocul și lățimea, doar când nu
      // sunt cele obișnuite (0,8 mm, 45 %), ca la elicea de barcă
      if (d.piesa === "carcasa") return tr`Carcasă de ventilator Ø${fmt(d.diametru ?? 40, 1)} × ${fmt(Lego.ventilatorCote(d).Hc, 1)}, cu ${+(d.urechi ?? 2) === 4 ? 4 : 2} urechi`;
      const g = d.gaura === "r" ? tr(", gaură rotundă") : d.gaura === "b" ? tr(", pentru bară") : d.gaura === "nu" ? tr(", fără gaură") : "";
      const j = (d.joc ?? 0.8) !== 0.8 ? tr`, jocul ${fmt(d.joc ?? 0.8, 1)} mm` : "", l = (d.latime ?? 45) !== 45 ? tr`, lățimea ${d.latime} %` : "";
      const s = d.sens === "stanga" ? tr(", stânga") : "", i = d.inel === "da" ? tr(", cu inel") : "";
      return tr`Rotor de ventilator Ø${fmt(d.diametru ?? 40, 1)} cu ${d.palete ?? 7} palete, pasul ${fmt(d.pas ?? 0.8, 2)}${j}${l}${s}${g}${i}`;
    }
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
  /** Formele gata ale conectorului perpendicular („Repede”). */
  const CONECTORI: readonly (readonly [string, string, readonly string[]])[] = [["cruce", "Cruce 1×2", ["xv", "ro"]], ["axe", "Ax–știft–ax", ["xv", "ro", "xv"]],
    ["stifturi", "Două știfturi și ax", ["rv", "rv", "xo"]], ["colt", "Colț pe trei axe", ["xl", "rv", "ro"]]];
  /** Codurile pașilor unui conector, îndreptate ca în motor: 1–5 pași; felul r / x / p; axa v / o și, doar la capete, l. */
  function coduriConector(g: readonly unknown[] | undefined): string[] {
    const lista = Array.isArray(g) && g.length ? g.slice(0, 5) : ["xv", "ro"];
    return lista.map((cod, k) => {
      const c = typeof cod === "string" ? cod : "", tip = c[0] === "x" || c[0] === "p" ? c[0] : "r";
      if (tip === "p") return "p";
      const axa = c[1] === "o" ? "o" : c[1] === "l" && (k === 0 || k === lista.length - 1) ? "l" : "v";
      return tip + axa;
    });
  }
  /** Mărimile uzuale ale arcului („Repede”): lungimea în știfturi și înălțimea în cărămizi, ca la arcele LEGO. */
  const ARCE: readonly (readonly [number, number])[] = [[3, 1], [4, 1], [6, 1], [6, 2], [8, 2], [12, 3]];
  /** Mărimile uzuale ale cadrului („Repede”): lungimea în știfturi și înălțimea în cărămizi (ferestre și uși). */
  const CADRE: readonly (readonly [number, number])[] = [[2, 2], [2, 3], [4, 3], [4, 5], [4, 6]];
  /** Formele gata ale conectorului în unghi („Repede”): unghiurile brațelor; cele numerotate sunt ale conectorilor LEGO. */
  const CONECTORI_UNGHI: readonly (readonly [string, string, readonly number[]])[] = [["1", "Nr. 1", [0]], ["2", "Nr. 2 (180°)", [0, 180]], ["3", "Nr. 3 (157,5°)", [0, 157.5]],
    ["4", "Nr. 4 (135°)", [0, 135]], ["5", "Nr. 5 (112,5°)", [0, 112.5]], ["6", "Nr. 6 (90°)", [0, 90]], ["t", "T", [0, 90, 180]], ["cruce", "Cruce", [0, 90, 180, 270]], ["y", "Y", [0, 120, 240]]];
  /** Brațele unui conector în unghi, îndreptate: primul la 0°, celelalte în ordinea unghiului (la zecimi de grad), fiecare cu
   *  manșonul lui (`x` de ax, `r` de știft); un braț la mai puțin de 90° de altul e lăsat afară, ca în motor. */
  function mansoaneUnghi(m: readonly unknown[] | undefined): [number, string][] {
    const cerute = (Array.isArray(m) ? m : []).filter((b): b is [number, string] => Array.isArray(b) && Number.isFinite(b[0]));
    if (!cerute.length) return [[0, "x"], [135, "x"]];
    const u0 = cerute[0]![0], out: [number, string][] = [];
    const rotite = cerute.map(([u, f]): [number, string] => [Math.round((((u - u0) % 360) + 360) % 360 * 10) / 10 % 360, f === "r" ? "r" : "x"]).sort((a, b) => a[0] - b[0]);
    for (const b of rotite) if (out.every(([v]) => Math.abs(((b[0] - v) % 360 + 540) % 360 - 180) >= 90 - 1e-6)) out.push(b);
    return out;
  }
  function defCurenta(tip: string = stare.tip, sursa?: object): Def {
    // copia JSON a câmpurilor editorului (al piesei de pe ecran sau al altui tip; cu `sursa`, ale ei): netipizată (din
    // JSON.parse), ca în stocare; ce iese din ea se verifică la motor
    const t = tip as Exclude<keyof typeof stare, "tip"> | "calibrare";
    if (t === "calibrare") return { tip: "calibrare" };
    const p = JSON.parse(JSON.stringify(sursa ?? stare[t]));
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
    // elicea de barcă fără înclinarea spre pupa e cea de dinainte (3.Tt): aceleași chei, deci o listă veche o adună pe linia ei
    if (t === "eliceBarca" && !p.pupa) delete p.pupa;
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
    if (t === "stiftTechnic") { if (+p.lung !== 3) delete p.lung; if (p.capat !== "ax" && p.capat !== "bucsa") delete p.capat; }
    if (t === "ax" && !p.opritor) delete p.opritor;
    if (t === "conector") p.gauri = coduriConector(p.gauri);
    if (t === "conectorUnghi") { p.mansoane = mansoaneUnghi(p.mansoane); if (p.butuc !== "x" && p.butuc !== "p") delete p.butuc; }
    if (t === "dinCvs2") { delete p.deschise; delete p.refuz; }
    if (t === "arc") { const q = Lego.arcCote(p); p.lung = q.lung; p.inalt = q.inalt; if (q.bolta === "joasa") p.bolta = "joasa"; else delete p.bolta; }
    if (t === "cadru") { const q = Lego.cadruCote(p); p.lung = q.lung; p.inalt = q.inalt; p.rama = q.rama; if (q.colturi === "tesite") p.colturi = "tesite"; else delete p.colturi; }
    if (t === "turnanta") { const q = Lego.turnantaCote(p); p.piesa = q.piesa; p.marime = q.marime; if (q.piesa === "baza" && q.joc) p.joc = q.joc; else delete p.joc; }
    if (t === "melc") { const q = Lego.melcCote(p); p.diam = q.diam; p.lung = q.lung; delete p.pereche; }
    if (t === "cama") { const q = Lego.camaCote(p); p.forma = q.forma; p.diam = q.diam; p.cursa = q.cursa; p.grosime = q.grosime; p.gaura = q.gaura; }
    if (t === "roataPalete") { const q = Lego.roataPaleteCote(p); p.diam = q.diam; p.palete = q.palete; p.lat = q.lat; p.forma = q.forma; p.disc = q.disc; p.gaura = q.gaura; }
    // decorațiunile (ADR 0285): câmpurile, în marginile motorului; ce nu ține de felul ales nu intră în piesă (doi fulgi fără
    // ramuri sunt aceeași piesă, oricare le-ar fi fost unghiul)
    if (t === "fulg") { const q = Lego.fulgCote(p); for (const k of ["diam", "grosime", "linie", "ramuri", "unghi", "inceput", "lungime", "miez", "agatatoare"] as const) p[k] = q[k]; if (!q.ramuri) { delete p.unghi; delete p.inceput; delete p.lungime; } }
    if (t === "stea") { const q = Lego.steaCote(p); for (const k of ["varfuri", "diam", "interior", "grosime", "fel", "agatatoare"] as const) p[k] = q[k]; if (q.fel === "contur") p.linie = q.linie; else delete p.linie; }
    if (t === "brad") { const q = Lego.bradCote(p); for (const k of ["inaltime", "etaje", "latime", "grosime", "fel", "agatatoare"] as const) p[k] = q[k]; }
    if (t === "glob") {
      // modelul e al globului plat; câte și desenul, ale unui glob cu model; relieful, al celui în relief
      const q = Lego.globCote(p);
      for (const k of ["diam", "grosime", "fel", "agatatoare"] as const) p[k] = q[k];
      if (q.fel === "plat") p.model = q.model; else delete p.model;
      if (q.model !== "fara") { p.cate = q.cate; p.desen = q.desen; } else { delete p.cate; delete p.desen; }
      if (q.schimb) p.relief = q.relief; else delete p.relief;
    }
    if (t === "bradLego") {
      // etajul își ține diametrul, înălțimea și marginea; steaua, mărimea; câte etaje are brăduțul întreg e al editorului
      const q = Lego.bradLegoCote(p);
      p.piesa = q.piesa; delete p.etaje;
      if (q.piesa === "stea") { p.marime = q.marime; delete p.diam; delete p.placi; delete p.margine; } else { p.diam = q.diam; p.placi = q.placi; p.margine = q.margine; delete p.marime; }
    }
    if (t === "ornament") {
      // mărimile sunt ale formei (lungimea și înălțimea, ale etichetei); scrisul, al unui ornament cu nume; relieful, al
      // celui în relief sau adâncit
      const q = Lego.ornamentCote(p);
      for (const k of ["forma", "text", "grosime", "agatatoare"] as const) p[k] = q[k];
      if (q.forma === "eticheta") { p.lungime = q.lungime; p.inaltime = q.inaltime; delete p.diam; } else { p.diam = q.diam; delete p.lungime; delete p.inaltime; }
      if (q.text) p.scris = q.scris; else delete p.scris;
      if (q.text && q.scris !== "decupat") p.relief = q.relief; else delete p.relief;
    }
    if (t === "cremaliera") { const q = Lego.cremalieraMontaj(p); p.lung = q.lung; p.roata = q.z; p.prindere = q.prindere; if (q.m === 1) delete p.modul; else p.modul = q.m; }
    if (t === "rotita") {
      // perechea e a editorului; la dinții drepți, unghiul și sensul nu contează (două roți drepte la fel sunt aceeași piesă)
      delete p.pereche;
      // la oblici și în V sensul rămâne: perechea se prinde doar cu sensul opus
      if (p.fel === "drepti") { delete p.unghi; delete p.sens; }
      if (+p.modul === 1) delete p.modul;
    }
    if (t === "roata") {
      // ce nu ține de felul ales nu intră în piesă (două roți la fel sunt aceeași piesă)
      normRoata(p);
    }
    if (t === "fulie") {
      // perechea și distanța sunt ale editorului (cureaua); fața, doar ce încape
      delete p.pereche; delete p.distanta;
      normFulie(p);
    }
    if ((t === "conica" || t === "coroana") && +p.modul === 1) delete p.modul;
    if (t === "conicaDubla") { delete p.pereche; if (+p.modul === 1) delete p.modul; }
    if (t === "senila") { delete p.pereche; delete p.distanta; if (p.piesa === "pinion") delete p.gauriStift; else { delete p.dinti; delete p.gaura; } }
    if (t === "ventilator") return defVentilator(p.piesa === "carcasa" ? "carcasa" : "rotor");
    return { tip: t, ...p };
  }
  function defVentilator(piesa: string): Def {
    // rotorul sau carcasa ventilatorului din editor, cu aceleași chei, în aceeași ordine, oricum s-ar face (din editor sau din
    // „Fă ventilatorul”): lista le adună pe aceeași linie. Carcasa nu are sens, gaură sau inel; rotorul, urechi
    const p = JSON.parse(JSON.stringify({ ...stare.ventilator, piesa }));
    if (piesa === "carcasa") { delete p.sens; delete p.gaura; delete p.inel; } else delete p.urechi;
    return { tip: "ventilator", ...p };
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
    varianta_bara: setari.varianta_bara, varianta_cupa: setari.varianta_cupa, varianta_dinti: setari.varianta_dinti, varianta_janta: setari.varianta_janta,
    pat: setari.pat.slice() as [number, number], pat_margine: setari.pat_margine, pat_distanta: setari.pat_distanta, ...Lego.inaltimi(setari) });
  const dimTri = (tri: readonly Tri[]): number[] => [0, 1, 2].map(k => { let m = 0; for (const t of tri) for (const p of t) if (p[k]! > m) m = p[k]!; return m; });
  function pieseDin(def: Def): PiesaGata[] {
    Lego.seteaza(paramMotor());
    if (def.tip === "calibrare") return Lego.calibrare().map(c => ({ nume: c.nume, titlu: c.titlu, tri: c.tri, dim: dimTri(c.tri) }));
    const r = Lego.construieste(def as Parameters<typeof Lego.construieste>[0]);
    return [{ nume: slug(numeDef(def)), titlu: numeDef(def), tri: r.tri, dim: r.dim, baza: r.baza, ax: r.ax, avert: r.avert, unghi: r.unghi, stifturi: r.stifturi, locasuri: r.locasuri, deschise: r.deschise, prinderi: r.prinderi }];
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
  // unde cade distanța a dintre două axe față de grila de 8 mm (roțile dințate, ADR 0169; fuliile, ADR 0280)
  function textGrila(a: number): string {
    const pasi = a / 8, jum = a / 4;
    const grila = Math.abs(pasi - Math.round(pasi)) < 1e-9 ? tr`pe grilă (${Math.round(pasi)} ${Math.round(pasi) === 1 ? tr("pas") : tr("pași")})`
      : Math.abs(jum - Math.round(jum)) < 1e-9 ? tr("la jumătate de pas") : tr("în afara grilei de 8 mm");
    return grila;
  }
  function textCoroana(d: { dinti?: number; pinion?: number; modul?: number; butuc?: string }): string {
    // unde stă pinionul unei roți coroană: axul (înălțimea, pe grilă), în dreptul dinților, cât de gros; butucul lung, dacă e în
    // calea axului; sau că nu se prinde
    const a = Lego.coroanaMontaj(d);
    if (!a.prinde) return tr`Pinionul de ${a.z1} nu se prinde cu o coroană de ${a.z2}: alege o coroană mai mare.`;
    const butuc = d.butuc !== "scurt" && a.inCale ? tr` Butucul lung urcă până la ${fmt(a.butucLung, 2)} mm, în calea axului pinionului: acela se oprește înaintea butucului.` : "";
    return tr`Axul pinionului trece la ${fmt(a.axa, 2)} mm deasupra feței de jos a coroanei, ${textGrila(a.axa)}, și întâlnește axul ei la 90°: unul dintre ele se oprește înaintea celuilalt. Pinionul, gros de cel puțin ${fmt(a.grosime)} mm, stă în dreptul dinților coroanei: de la ${fmt(a.rIn, 2)} la ${fmt(a.rOut, 2)} mm de axul ei, cu mijlocul la ${fmt(a.mijloc, 2)} mm.` + butuc;
  }
  /** În română, „de” după numerele de la 20 în sus („21 de zale”), afară de cele care se termină în 01–19 („101 zale”). */
  const cuDe = (n: number) => n % 100 >= 20 || (n >= 100 && n % 100 === 0);
  const zaleText = (n: number) => (cuDe(n) ? tr`${n} de zale` : tr`${n} zale`);
  function textSenila(p: { dinti?: number; pereche?: number; distanta?: number }): string {
    // șenila pe cele două pinioane, cu axele la distanța aleasă (știfturi de 8 mm): câte zale, cât joc, la cât stă întinsă
    const s = p.distanta ?? 8, m = Lego.senilaMontaj(p.dinti, p.pereche, s * 8), stf = cuDe(s) ? tr`${s} de știfturi` : tr`${s} știfturi`;
    if (m.aproape) return tr`Pinioanele de ${m.z1} și ${m.z2} s-ar atinge cu axele la ${fmt(m.d, 2)} mm: depărtează-le.`;
    return tr`Pe pinioanele de ${m.z1} și ${m.z2}, cu axele la ${fmt(m.d, 2)} mm (${stf}), șenila are ${zaleText(m.zale)} (${m.zale * 12} mm) și rămân ${fmt(m.joc, 1)} mm de joc; întinsă, axele ar sta la ${fmt(m.intins, 2)} mm.`;
  }
  function textElice(p: { palete?: number; diametru?: number; pas?: number; latime?: number; paleta?: string }): string {
    // elicea din editor: pasul, unghiul paletei (la butuc și la vârf, sau același, la cea plată) și consola la vârf, pe strat
    const c = Lego.eliceCote(p), g = (x: number) => fmt(x * 180 / Math.PI, 0);
    const paleta = c.plata ? tr`Paleta plată, la ${g(c.bVarf)}° de la butuc la vârf, ca la LEGO.` : tr`Paleta răsucită: ${g(c.bRad)}° lângă butuc, ${g(c.bVarf)}° la vârf.`;
    return tr`Pasul ${fmt(c.P, 0)} mm (${fmt(c.pd, 2)} × diametrul). ${paleta} Se tipărește fără suport: la vârf, un strat iese cu ${fmt(c.consola, 1)} mm peste cel de dedesubt.`;
  }
  function textBarca(p: { palete?: number; diametru?: number; pas?: number; latime?: number; inclinare?: number; pupa?: number }): string {
    // elicea de barcă din editor: pasul, unghiul paletei la butuc și la vârf, cât din disc acoperă paletele, butucul (crește cu
    // diametrul și cu paletele) și consola la vârf, pe strat; cu înclinarea spre pupa (3.Tt), cât urcă vârful de pe masă și
    // suportul de sub palete, în locul consolei
    const c = Lego.eliceBarcaCote(p), g = (x: number) => fmt(x * 180 / Math.PI, 0);
    if (c.pupa > 0) return tr`Pasul ${fmt(c.P, 0)} mm (${fmt(c.pd, 2)} × diametrul): paleta stă la ${g(c.bRad)}° lângă butuc și la ${g(c.bVarf)}° la vârf. Paletele acoperă ${fmt(c.acoperire * 100, 0)} % din disc; butucul e de Ø${fmt(2 * c.rh, 1)} × ${fmt(c.Hh, 1)} mm. Înclinată spre pupa cu ${fmt(c.pupa, 0)}°: muchia de jos a paletei urcă de pe masă până la ${fmt(c.urca, 1)} mm la vârf, deci se tipărește cu suport sub palete (îl pune programul de feliere), tot cu partea dinspre barcă pe masă.`;
    return tr`Pasul ${fmt(c.P, 0)} mm (${fmt(c.pd, 2)} × diametrul): paleta stă la ${g(c.bRad)}° lângă butuc și la ${g(c.bVarf)}° la vârf. Paletele acoperă ${fmt(c.acoperire * 100, 0)} % din disc; butucul e de Ø${fmt(2 * c.rh, 1)} × ${fmt(c.Hh, 1)} mm. Se tipărește fără suport, cu partea dinspre barcă pe masă: la vârf, un strat iese cu ${fmt(c.consola, 1)} mm peste cel de dedesubt.`;
  }
  function textVentilator(p: { palete?: number; diametru?: number; joc?: number; pas?: number; latime?: number; inel?: string }): string {
    // ventilatorul din editor: rotorul (vârful, butucul, inelul, unghiurile, consola) și carcasa (diametrele, înălțimea, unde
    // stau găurile urechilor față de ax)
    const c = Lego.ventilatorCote(p), g = (x: number) => fmt(x * 180 / Math.PI, 0), stf = cuDe(c.k) ? tr`${c.k} de știfturi` : tr`${c.k} știfturi`;
    const inel = p.inel === "da" ? tr` Inelul, gros de 1,2 mm, e înalt de ${fmt(c.Hinel, 1)} mm.` : "";
    return tr`Rotorul: paletele până la Ø${fmt(2 * c.Rt, 1)} (${fmt(c.joc, 1)} mm de carcasă), pe un butuc de Ø${fmt(2 * c.rh, 1)} × ${fmt(c.Hh, 1)} mm. Pasul ${fmt(c.P, 0)} mm (${fmt(c.pd, 2)} × diametrul): paleta stă la ${g(c.bRad)}° lângă butuc și la ${g(c.bVarf)}° la vârf; la vârf, un strat iese cu ${fmt(c.consola, 1)} mm peste cel de dedesubt.${inel} Carcasa: Ø${fmt(c.D, 1)} în interior, Ø${fmt(c.D + 4, 1)} în afară, înaltă de ${fmt(c.Hc, 1)} mm; găurile urechilor, la ${8 * c.k} mm de ax (${stf}).`;
  }
  // „Ca LEGO” (ADR 0282, cotele din LDraw, măsurate față de axa găurii, nu față de centrul cutiei): diametrul (vârfurile la
  // 13,69, 21,56 și 36,96 mm de axă: cât spun numele pieselor, 3½, 5½ și 9 știfturi), paleta plată cu unghiul de la 70 % din
  // rază (6041: 23°; 92842 și 15790: 15°; pasul = π · 0,7 · tan β), coarda (procent din rază), gaura și sensul piesei (6041 e
  // un elicoid stâng; celelalte două, drepte): elicea tipărită împinge aerul ca piesa LEGO pe care o înlocuiește
  const ELICE_LEGO: Readonly<Record<string, Partial<typeof stare.elice>>> = {
    "6041": { palete: 3, diametru: 27.4, pas: 0.93, latime: 60, forma: "drept", paleta: "plata", sens: "stanga", gaura: "x" },
    "92842": { palete: 3, diametru: 43.1, pas: 0.59, latime: 29, forma: "drept", paleta: "plata", sens: "dreapta", gaura: "r" },
    "15790": { palete: 3, diametru: 73.9, pas: 0.59, latime: 25, forma: "drept", paleta: "plata", sens: "dreapta", gaura: "r" },
  };
  function textDubla(d: { dinti?: number; modul?: number }, pereche: number): string {
    // cum stau axele unei conice duble și ale perechii ei: paralele (distanța, ca la rotițe) și la 90° (planul de mijloc al
    // fiecăreia de axul celeilalte), pe grilă sau nu; perechea strânsă la 90° (o roată mică cu una mult mai mare) se spune
    const a = Lego.dublaMontaj(d, pereche), strans = a.strans ? tr` La 90°, perechea asta se prinde strâns, poate fără joc: o roată de sub 12 dinți cu una de peste 2,5 ori mai mare.` : "";
    return tr`Pe axe paralele, axele la ${fmt(a.paralel, 2)} mm, ${textGrila(a.paralel)}. La 90°, cu axele întâlnite: planul de mijloc al acesteia la ${fmt(a.acesta, 2)} mm de axul perechii, ${textGrila(a.acesta)}; al perechii, la ${fmt(a.perechea, 2)} mm de axul acesteia, ${textGrila(a.perechea)}.` + strans;
  }
  function editor() {
    const e = $("#at-editor"), activ = document.activeElement;
    // un câmp al editorului în care omul tocmai a scris (valoarea încă neluată) se ia întâi. Redesenarea îl scoate din pagină,
    // iar browserul îi dă `change` chiar atunci, în mijlocul ei: valoarea ar intra în piesă, dar editorul ar rămâne desenat cu
    // ce era înainte (o redesenare venită din altă parte: three.js sosit târziu, lista din baza artefactului)
    if (activ instanceof HTMLElement && e.contains(activ)) activ.blur();
    const t = stare.tip;
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
    } else if (t === "arc") {
      // arcul (ADR 0284, felia 3.Cd): lungimea, înălțimea în cărămizi, bolta; mărimile uzuale; cotele bolții
      const p = stare.arc, q = Lego.arcCote(p), gol = q.lung - 2;
      const eticheta = ([n, c]: readonly [number, number]) => `1×${n}${c > 1 ? "×" + c : ""}`, gata = ARCE.find(([n, c]) => n === q.lung && c === q.inalt);
      e.innerHTML = `<h2>Arc</h2>
        <p class="mic">O cărămidă 1 × n cu o boltă dedesubt: primul și ultimul știft sunt picioarele, între ele rămâne deschiderea. Bolta e un arc de cerc: urcă jumătate din deschidere, dar lasă deasupra cel puțin 1,6 mm. Are știfturi pe toată lungimea, deci se clădește peste ea, iar picioarele stau pe știfturi. Se printează în picioare; o boltă rotundă și mică iese de obicei curat fără suport, una lată sau joasă cere suport sub ea.</p>
        <div class="at-campuri">
          <label for="at-arc-lung">Lungime (știfturi)<input id="at-arc-lung" type="number" min="3" max="16" step="1" value="${q.lung}"></label>
          <label for="at-arc-inalt">Înălțime (cărămizi)<input id="at-arc-inalt" type="number" min="1" max="4" step="1" value="${q.inalt}"></label>
        </div>
        <div class="at-rand"><span class="mic">Repede:</span>${seg("at-arc-repede", ARCE.map((a): [string, string] => [a.join("x"), eticheta(a)]), gata ? gata.join("x") : "")}</div>
        <div class="at-rand"><span class="mic">Bolta:</span>${seg("at-arc-bolta", [["inalta", "Înaltă"], ["joasa", "Joasă"]], q.bolta)}</div>
        <div class="at-rand"><span class="mic" id="at-arc-cote">${tr`Deschiderea: ${fmt(q.deschidere)} mm (${gol} ${gol === 1 ? tr("știft") : tr("știfturi")}). Bolta urcă ${fmt(q.sageata)} mm; deasupra ei rămân ${fmt(q.deasupra)} mm.`}</span></div>`;
      const camp = (id: string, a: number, b: number, f: (v: number) => void) => { $(id).onchange = ev => { const v = Math.round(+(ev.target as HTMLInputElement).value); if (v >= a && v <= b) { f(v); schimbat(); } editor(); }; };
      camp("#at-arc-lung", 3, 16, v => { p.lung = v; });
      camp("#at-arc-inalt", 1, 4, v => { p.inalt = v; });
      $("#at-arc-repede").onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-v]"), f = b && ARCE.find(a => a.join("x") === b.dataset.v); if (f) { p.lung = f[0]; p.inalt = f[1]; editor(); schimbat(); } };
      $("#at-arc-bolta").onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-v]"); if (!b) return; p.bolta = b.dataset.v!; editor(); schimbat(); };
    } else if (t === "cadru") {
      // cadrul (ADR 0284, felia 3.Cj): lungimea, înălțimea în cărămizi, rama, colțurile de sus ale golului; mărimile uzuale;
      // golul și puntea de sus, în cuvinte
      const p = stare.cadru, q = Lego.cadruCote(p);
      const gata = CADRE.find(([n, c]) => n === q.lung && c === q.inalt);
      e.innerHTML = `<h2>Cadru (fereastră)</h2>
        <p class="mic">O cărămidă 1 × n cu un gol prin ea: o fereastră, o ușă, un portal. Jos are pragul, o placă obișnuită, deci stă pe știfturi; pe margini, doi stâlpi subțiri; sus, buiandrugul cu știfturi pe toată lungimea, deci se clădește peste ea. Se tipărește în picioare, fără suport: buiandrugul trece peste gol ca o punte.</p>
        <div class="at-campuri">
          <label for="at-cad-lung">Lungime (știfturi)<input id="at-cad-lung" type="number" min="2" max="8" step="1" value="${q.lung}"></label>
          <label for="at-cad-inalt">Înălțime (cărămizi)<input id="at-cad-inalt" type="number" min="2" max="6" step="1" value="${q.inalt}"></label>
          <label for="at-cad-rama">Rama (mm)<input id="at-cad-rama" type="number" min="1.2" max="4" step="0.1" value="${q.rama}"></label>
        </div>
        <div class="at-rand"><span class="mic">Repede:</span>${seg("at-cad-repede", CADRE.map((a): [string, string] => [a.join("x"), `1×${a[0]}×${a[1]}`]), gata ? gata.join("x") : "")}</div>
        <div class="at-rand"><span class="mic">Golul:</span>${seg("at-cad-colturi", [["drepte", "Colțuri drepte"], ["tesite", "Colțuri teșite"]], q.colturi)}</div>
        <div class="at-rand"><span class="mic" id="at-cad-info">${tr`Golul are ${fmt(q.golLat)} × ${fmt(q.golInalt)} mm. Puntea de sus, de ${fmt(q.punte)} mm, se tipărește în aer.`}${q.tesitura > 0 ? " " + tr`Colțurile de sus sunt teșite cu ${fmt(q.tesitura)} mm.` : ""}${q.punte > 40 ? " " + tr("Peste 40 mm, puntea se poate lăsa la tipărire: alege colțurile teșite sau un cadru mai scurt.") : ""}</span></div>`;
      // un număr din afara marginilor nu e primit: câmpul se întoarce la valoarea de dinainte (rotunjirile le face motorul)
      const camp = (id: string, a: number, b: number, f: (v: number) => void) => { $(id).onchange = ev => { const v = +(ev.target as HTMLInputElement).value; if (v >= a && v <= b) { f(v); schimbat(); } editor(); }; };
      camp("#at-cad-lung", 2, 8, v => { p.lung = v; });
      camp("#at-cad-inalt", 2, 6, v => { p.inalt = v; });
      camp("#at-cad-rama", 1.2, 4, v => { p.rama = v; });
      $("#at-cad-repede").onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-v]"), f = b && CADRE.find(a => a.join("x") === b.dataset.v); if (f) { p.lung = f[0]; p.inalt = f[1]; editor(); schimbat(); } };
      $("#at-cad-colturi").onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-v]"); if (!b) return; p.colturi = b.dataset.v!; editor(); schimbat(); };
    } else if (t === "turnanta") {
      // placa turnantă (ADR 0284, felia 3.Ck-1): baza sau partea de sus, mărimea, jocul pivotului (doar la bază); „Fă placa
      // turnantă” pune în listă amândouă piesele
      const p = stare.turnanta, q = Lego.turnantaCote(p), baza = q.piesa === "baza";
      e.innerHTML = `<h2>Placă turnantă</h2>
        <p class="mic">Două plăci care se rotesc una peste alta, de 6,4 mm împreună, ca placa turnantă LEGO. Baza stă pe știfturi și are fața de sus netedă, cu pivotul în mijloc; partea de sus are știfturi, pentru ce clădești peste ea, și o gaură de știft în mijloc. Pivotul e un capăt de știft Technic: în gaura din calibrare se rotește și ține ca un știft Technic într-o placă cu găuri. Amândouă se tipăresc ca plăcile obișnuite, fără suport.</p>
        <div class="at-rand"><span class="mic">Piesa:</span>${seg("at-tu-piesa", [["baza", "Baza"], ["sus", "Partea de sus"]], q.piesa)}</div>
        <div class="at-rand"><span class="mic">Mărimea:</span>${seg("at-tu-marime", [["2", "2 × 2"], ["4", "4 × 4"]], String(q.marime))}</div>
        ${baza ? `<div class="at-campuri"><label for="at-tu-joc">Jocul pivotului (mm)<input id="at-tu-joc" type="number" min="-0.1" max="0.2" step="0.05" value="${q.joc}"></label></div>` : ""}
        <p class="mic" id="at-tu-info">${textTurnanta(p)}</p>
        <div class="at-rand"><button class="btn" type="button" id="at-tu-fa">Fă placa turnantă</button><span class="mic">${tr("pune în listă baza și partea de sus")}</span></div>`;
      const alege = (id: string, f2: (v: string) => void) => { $(id).onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-v]"); if (!b) return; f2(b.dataset.v!); editor(); schimbat(); }; };
      alege("#at-tu-piesa", v => { p.piesa = v; });
      alege("#at-tu-marime", v => { p.marime = +v; });
      // jocul: din 0,05 în 0,05, doar în margini (altfel câmpul se întoarce la valoarea de dinainte)
      if (baza) $("#at-tu-joc").onchange = ev => { const v = Math.round(+(ev.target as HTMLInputElement).value * 20) / 20 || 0; if (v >= -0.1 && v <= 0.2) { p.joc = v; schimbat(); } editor(); };
      $("#at-tu-fa").onclick = adaugaTurnanta;
    } else if (t === "lateral") {
      const p = stare.lateral;
      e.innerHTML = `<h2>Cărămidă cu știfturi pe lateral</h2>
        <p class="mic">Cărămidă 1×n cu știfturi și pe latura lungă (SNOT): prinzi piese culcate pe o parte, de exemplu prizele de aer sau aripile puse vertical. Știftul lateral e la 5,6 mm de jos, ca o placă prinsă în el să iasă la nivel cu fața de sus. Se printează în picioare.</p>
        <div class="at-campuri"><label for="at-l-lung">Lungime (știfturi)<input id="at-l-lung" type="number" min="1" max="8" step="1" value="${p.lung}"></label></div>
        <div class="at-rand"><span class="mic">Știfturi pe:</span><div class="segment" id="at-l-fete"><button type="button" data-fete="una" aria-pressed="${p.fete !== "doua"}">O latură</button><button type="button" data-fete="doua" aria-pressed="${p.fete === "doua"}">Două laturi</button></div></div>`;
      $("#at-l-lung").onchange = ev => { const v = Math.round(+(ev.target as HTMLInputElement).value); if (v >= 1 && v <= 8) { p.lung = v; schimbat(); } };
      $("#at-l-fete").onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-fete]"); if (!b) return; p.fete = b.dataset.fete!; editor(); schimbat(); };
    } else if (t === "dinCvs2") {
      // forma primită din desenul cvs2 (ADR 0166 §D): mărimea, câte contururi, grosimea; sau ce s-a întâmplat la trimitere
      const p = stare.dinCvs2, n = p.contururi.length;
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const c of p.contururi) for (const [x, y] of c) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
      const refuz = p.refuz === "prea-mare" ? tr("Selecția din cvs2 e prea mare: cel mult 10 000 de contururi și 200 000 de puncte.")
        : p.refuz === "nimic" ? tr("În selecția din cvs2 nu era niciun contur închis.")
        : p.refuz === "atelier" ? tr("Forma e prea mare pentru atelier: cel mult 50 000 de puncte.") : "";
      e.innerHTML = `<h2>Formă din cvs2</h2>
        <p class="mic">Alege forme închise în desenul cvs2 și apasă Trimite la Easy 3Draw: le primești aici, ridicate în 3D. Găurile rămân găuri.</p>`
        + (refuz ? `<p class="mic eroare" id="at-forma-refuz"></p>` : "")
        + (n ? `<p class="mic" id="at-forma-info"></p>
        <div class="at-campuri"><label for="at-f-grosime">Grosime (mm)<input id="at-f-grosime" type="number" min="0.4" max="50" step="0.1" value="${p.grosime}"></label></div>` : "");
      if (refuz) $("#at-forma-refuz").textContent = refuz;
      if (n) {
        $("#at-forma-info").textContent = tr`${n} ${n === 1 ? tr("contur închis") : tr("contururi închise")}, ${fmt(x1 - x0)} × ${fmt(y1 - y0)} mm`
          + (p.deschise ? tr`; ${p.deschise} ${p.deschise === 1 ? tr("deschis, lăsat afară") : tr("deschise, lăsate afară")}` : "");
        $("#at-f-grosime").onchange = ev => { const v = +(ev.target as HTMLInputElement).value; if (v >= 0.4 && v <= 50) { p.grosime = Math.round(v * 10) / 10; schimbat(); } };
      }
    } else if (t === "ax") {
      const p = stare.ax;
      e.innerHTML = `<h2>Ax Technic</h2>
        <p class="mic">Axul în cruce (Ø 4,75, brațe de 1,75 mm, puțin mai subțiri decât la LEGO, ca să intre în găurile printate). Se printează culcat, pe un braț. Lungimea e în știfturi: axul 4 are 31,8 mm. Cu opritor, un capăt are un disc de Ø 6, gros de 1 mm: se sprijină pe grindă (intră în lamajul găurii), iar axul nu mai trece prin ea.</p>
        <div class="at-campuri"><label for="at-a-lung">Lungime (știfturi)<input id="at-a-lung" type="number" min="2" max="20" step="1" value="${p.lung}"></label></div>
        <label class="bifa"><input type="checkbox" id="at-a-opritor" ${p.opritor ? "checked" : ""}> Cu opritor la un capăt</label>`;
      $("#at-a-lung").onchange = ev => { const v = Math.round(+(ev.target as HTMLInputElement).value); if (v >= 2 && v <= 20) { p.lung = v; schimbat(); } };
      $("#at-a-opritor").onchange = ev => { p.opritor = (ev.target as HTMLInputElement).checked; schimbat(); };
    } else if (t === "stiftTechnic") {
      const p = stare.stiftTechnic;
      e.innerHTML = `<h2>Știft Technic</h2>
        <p class="mic">Știftul de 2 (15,8 mm) are gulerul la mijloc; cel de 3 (23,8 mm), la un știft de un capăt, ca să lege trei grinzi. Cu ax, partea scurtă e în cruce: într-o parte se rotește, în cealaltă ține un ax sau o roată. Cu bucșă, partea scurtă e un cilindru plin de Ø 7,2, lung de un știft: se sprijină pe grindă și ține loc de bucșă, deci știftul nu mai are guler. Se printează culcat, pe o față teșită de 0,35 mm; fanta de la capetele rotunde îl face să se strângă în gaură.</p>
        <div class="at-rand"><span class="mic">Lungime:</span>${seg("at-s-lung", [["2", "2"], ["3", "3"]], String(p.lung || 2))}
          <span class="mic">Capătul scurt:</span>${seg("at-s-capat", [["stift", "Știft"], ["ax", "Ax"], ["bucsa", "Bucșă"]], p.capat || "stift")}</div>
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
    } else if (t === "conector") {
      // conectorul perpendicular (ADR 0284): lungimea, formele gata și, pe fiecare pas, felul găurii și axa ei
      const p = stare.conector, g = coduriConector(p.gauri), n = g.length, gata = CONECTORI.find(([, , c]) => c.join() === g.join());
      const pas = (c: string, k: number) => `<div class="at-rand"><span class="mic">${tr`Pasul ${k + 1}:`}</span>${seg("at-co-tip-" + k, [["r", "Știft"], ["x", "Ax"], ["p", "Plin"]], c[0]!)}
          ${c[0] === "p" ? "" : seg("at-co-axa-" + k, [["v", "În sus"], ["o", "De-a latul"], ...(k === 0 || k === n - 1 ? [["l", "În lung"] as const] : [])], c[1]!)}</div>`;
      e.innerHTML = `<h2>Conector perpendicular</h2>
        <p class="mic">Un bloc cât grinda groasă (7,8 × 7,8 mm), cu câte o gaură pe fiecare pas, fiecare pe axa ei: în sus, de-a latul sau, la capete, în lung. Leagă grinzi, axe și știfturi care nu stau în același plan: din el se fac colțurile cadrelor și trecerile de la un ax la altul. Găurile sunt cele ale grinzii, din calibrare. Se printează culcat, fără suport.</p>
        <div class="at-rand"><span class="mic">Lungime:</span>${seg("at-co-lung", [1, 2, 3, 4, 5].map((v): [string, string] => [String(v), String(v)]), String(n))}</div>
        <div class="at-rand"><span class="mic">Repede:</span>${seg("at-co-repede", CONECTORI.map(([k, nume]): [string, string] => [k, nume]), gata ? gata[0] : "")}</div>
        <div id="at-co-pasi">${g.map(pas).join("")}</div>`;
      const pune = (nou: string[]) => { p.gauri = coduriConector(nou); editor(); schimbat(); };
      $("#at-co-lung").onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-v]"); if (!b) return; const m = +b.dataset.v!; pune(Array.from({ length: m }, (_, k) => g[k] ?? "rv")); };
      $("#at-co-repede").onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-v]"), f = b && CONECTORI.find(([k]) => k === b.dataset.v); if (f) pune([...f[2]]); };
      $("#at-co-pasi").onclick = ev => {
        const b = (ev.target as Element).closest<HTMLElement>("[data-v]"), s = b && b.closest<HTMLElement>(".segment"), m = s && /^at-co-(tip|axa)-(\d)$/.exec(s.id);
        if (!b || !m) return;
        const k = +m[2]!, v = b.dataset.v!, vechi = g[k]!;
        pune(g.map((c, i) => (i !== k ? c : m[1] === "tip" ? (v === "p" ? "p" : v + (vechi[1] ?? "v")) : vechi[0] + v)));
      };
    } else if (t === "conectorUnghi") {
      // conectorul în unghi (ADR 0284, felia 3.Cb): formele gata, numărul brațelor, butucul și, pe fiecare braț, manșonul și unghiul
      const p = stare.conectorUnghi, m = mansoaneUnghi(p.mansoane), n = m.length, gata = CONECTORI_UNGHI.find(([, , u]) => u.join() === m.map(b => b[0]).join());
      // între ce unghiuri se poate muta brațul k: la cel puțin 90° de vecini; cu două brațe, până la 180° (dincolo e aceeași piesă, întoarsă)
      const margini = (k: number): [number, number] => [m[k - 1]![0] + 90, n === 2 ? 180 : 360 - 90 * (n - k)];
      const brat = ([u, f]: [number, string], k: number) => `<div class="at-rand"><span class="mic">${tr`Brațul ${k + 1}:`}</span>${seg("at-cu-fel-" + k, [["x", "Ax"], ["r", "Știft"]], f)}
          ${k ? `<label class="at-unghi" for="at-cu-unghi-${k}">Unghiul (°)<input id="at-cu-unghi-${k}" type="number" min="${margini(k)[0]}" max="${margini(k)[1]}" step="22.5" value="${u}"${margini(k)[0] === margini(k)[1] ? " disabled" : ""}></label>` : ""}</div>`;
      e.innerHTML = `<h2>Conector în unghi</h2>
        <p class="mic">Un butuc rotund, cu gaura lui în sus, din care pleacă unul până la patru brațe, culcate pe masă. Fiecare braț are un manșon în care intră un ax (sau un știft) cât un pas; brațele stau la cel puțin 90° unul de altul. Formele numerotate au unghiurile conectorilor LEGO. Din el se fac colțurile cadrelor, brațele în unghi și trecerea de la un ax la altul. Găurile sunt cele ale grinzii, din calibrare. Se printează culcat, fără suport.</p>
        <div class="at-rand"><span class="mic">Repede:</span>${seg("at-cu-repede", CONECTORI_UNGHI.map(([k, nume]): [string, string] => [k, nume]), gata ? gata[0] : "")}</div>
        <div class="at-rand"><span class="mic">Brațe:</span>${seg("at-cu-nr", [1, 2, 3, 4].map((v): [string, string] => [String(v), String(v)]), String(n))}</div>
        <div class="at-rand"><span class="mic">Butucul:</span>${seg("at-cu-butuc", [["r", "Știft"], ["x", "Ax"], ["p", "Plin"]], p.butuc === "x" || p.butuc === "p" ? p.butuc : "r")}</div>
        <div id="at-cu-brate">${m.map(brat).join("")}</div>`;
      const pune = (nou: [number, string][]) => { p.mansoane = mansoaneUnghi(nou); editor(); schimbat(); };
      // unghiurile pentru un număr nou de brațe: ce era rămâne, cât se poate; brațul nou vine la 90° după ultimul
      const cuBrate = (nr: number): number[] => (nr === 1 ? [0] : nr === 2 ? [0, n >= 2 && m[1]![0] <= 180 ? m[1]![0] : 135] : nr === 3 ? (n === 2 && m[1]![0] <= 180 ? [0, m[1]![0], m[1]![0] + 90] : n === 3 ? m.map(b => b[0]) : [0, 90, 180]) : [0, 90, 180, 270]);
      $("#at-cu-repede").onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-v]"), f = b && CONECTORI_UNGHI.find(([k]) => k === b.dataset.v); if (f) pune(f[2].map((u, k): [number, string] => [u, m[k] ? m[k]![1] : "x"])); };
      $("#at-cu-nr").onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-v]"); if (b) pune(cuBrate(+b.dataset.v!).map((u, k): [number, string] => [u, m[k] ? m[k]![1] : "x"])); };
      $("#at-cu-butuc").onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-v]"); if (!b) return; p.butuc = b.dataset.v!; editor(); schimbat(); };
      $("#at-cu-brate").onclick = ev => {
        const b = (ev.target as Element).closest<HTMLElement>("[data-v]"), sg = b && b.closest<HTMLElement>(".segment"), g = sg && /^at-cu-fel-(\d)$/.exec(sg.id);
        if (b && g) pune(m.map(([u, f], i): [number, string] => [u, i === +g[1]! ? b.dataset.v! : f]));
      };
      $("#at-cu-brate").onchange = ev => {
        const c = ev.target as HTMLInputElement, g = /^at-cu-unghi-(\d)$/.exec(c.id);
        if (!g) return;
        const k = +g[1]!, v = Math.round(+c.value * 10) / 10, [a, b] = margini(k);
        // în afara marginilor (și golit: atunci e 0), câmpul se întoarce la ce era; un braț mutat îi împinge pe următorii
        // la cel puțin 90° de el
        if (!(v >= a && v <= b)) { editor(); return; }
        const nou = m.map((x): [number, string] => [x[0], x[1]]);
        nou[k]![0] = v;
        for (let i = k + 1; i < n; i++) nou[i]![0] = Math.max(nou[i]![0], nou[i - 1]![0] + 90);
        pune(nou);
      };
    } else if (t === "rotita") {
      // roata dințată (ADR 0169): dinții, felul, unghiul și sensul la oblici și în V, grosimea, gaura, modulul; perechea
      const p = stare.rotita, oblic = p.fel !== "drepti", a = Lego.distantaRoti(p.dinti, p.pereche, p.modul), grila = textGrila(a);
      e.innerHTML = `<h2>Roată dințată</h2>
        <p class="mic">Roată care se prinde cu alta, ca la LEGO Technic (modulul 1, dinții de 20°). Dinții pot fi drepți, oblici (merg mai lin, dar împing axul în lungul lui; două roți oblice se prind doar cu sensuri opuse) sau în V (fără împingere). Gaura de ax și jocul dintre dinți vin din calibrare.</p>
        <div class="at-campuri">
          <label for="at-r-dinti">Dinți<input id="at-r-dinti" type="number" min="8" max="80" step="1" value="${p.dinti}"></label>
          <label for="at-r-grosime">Grosime (mm)<input id="at-r-grosime" type="number" min="1" max="20" step="0.1" value="${p.grosime}"></label>
          <label for="at-r-modul">Modul<input id="at-r-modul" type="number" min="0.5" max="3" step="0.1" value="${p.modul}"></label>
        </div>
        <div class="at-rand"><span class="mic">Repede:</span>${seg("at-r-repede", [8, 12, 16, 20, 24, 36, 40].map((z): [string, string] => [String(z), String(z)]), String(p.dinti))}</div>
        <div class="at-rand"><span class="mic">Dinții:</span>${seg("at-r-fel", [["drepti", "Drepți"], ["oblici", "Oblici"], ["inv", "În V"]], p.fel)}</div>
        ${oblic ? `<div class="at-campuri"><label for="at-r-unghi">Unghiul (°)<input id="at-r-unghi" type="number" min="10" max="35" step="1" value="${p.unghi}"></label></div>
        <div class="at-rand"><span class="mic">Sensul:</span>${seg("at-r-sens", [["dreapta", "Dreapta"], ["stanga", "Stânga"]], p.sens)}</div>` : ""}
        <div class="at-rand"><span class="mic">Gaura:</span>${seg("at-r-gaura", [["x", "Pentru ax"], ["r", "Rotundă"], ["nu", "Fără"]], p.gaura)}</div>
        <div class="at-rand"><label for="at-r-pereche" class="mic">Se prinde cu o roată de</label><input id="at-r-pereche" type="number" min="8" max="80" step="1" value="${p.pereche}">
          <span class="mic" id="at-r-distanta">${tr`dinți: axele la ${fmt(a)} mm, ${grila}.`}</span></div>
        <div class="at-rand"><button class="btn" type="button" id="at-r-fa-pereche">Fă perechea</button><span class="mic">${oblic ? tr("pune în listă ambele roți; a doua, cu sensul opus") : tr("pune în listă ambele roți")}</span></div>`;
      const alege = (id: string, f: (v: string) => void) => { $(id).onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-v]"); if (!b) return; f(b.dataset.v!); editor(); schimbat(); }; };
      $("#at-r-dinti").onchange = ev => { const v = Math.round(+(ev.target as HTMLInputElement).value); if (v >= 8 && v <= 80) { p.dinti = v; editor(); schimbat(); } };
      $("#at-r-grosime").onchange = ev => { const v = +(ev.target as HTMLInputElement).value; if (v >= 1 && v <= 20) { p.grosime = Math.round(v * 10) / 10; schimbat(); } };
      $("#at-r-modul").onchange = ev => { const v = +(ev.target as HTMLInputElement).value; if (v >= 0.5 && v <= 3) { p.modul = Math.round(v * 10) / 10; editor(); schimbat(); } };
      alege("#at-r-repede", v => { p.dinti = +v; });
      alege("#at-r-fel", v => { p.fel = v; });
      if ($("#at-r-unghi")) $("#at-r-unghi").onchange = ev => { const v = Math.round(+(ev.target as HTMLInputElement).value); if (v >= 10 && v <= 35) { p.unghi = v; schimbat(); } };
      if ($("#at-r-sens")) alege("#at-r-sens", v => { p.sens = v; });
      alege("#at-r-gaura", v => { p.gaura = v; });
      $("#at-r-pereche").onchange = ev => { const v = Math.round(+(ev.target as HTMLInputElement).value); if (v >= 8 && v <= 80) { p.pereche = v; editor(); randeazaPrinde(); } };
      $("#at-r-fa-pereche").onclick = adaugaPerecheRoti;
    } else if (t === "cremaliera") {
      // cremaliera (ADR 0284, felia 3.Cc): lungimea, modulul, prinderea și roata pereche; montajul; perechea în listă
      const p = stare.cremaliera, q = Lego.cremalieraMontaj(p);
      const unde = q.prindere === "gauri" ? tr`în găurile de la ${q.k} ${q.k === 1 ? tr("pas") : tr("pași")} (${fmt(8 * q.k)} mm) deasupra găurilor cremalierei`
        : q.k === 1 ? tr("într-o cărămidă Technic ridicată cu o placă față de cremalieră") : tr`într-o cărămidă Technic ridicată cu ${q.k} plăci față de cremalieră`;
      e.innerHTML = `<h2>Cremalieră</h2>
        <p class="mic">O bară cu dinți drepți, care face din rotirea unei roți dințate o mișcare în linie dreaptă (și invers). Dinții sunt cei ai roților de aici (același modul, 20°), cu jocul din calibrare. Se prinde pe știfturi, ca o placă 1 × n, sau cu știfturi Technic prin găurile ei. Înălțimea ei e aleasă după roata pereche, ca axul roții să cadă pe grilă. Se printează în picioare, cu dinții în sus, fără suport.</p>
        <div class="at-campuri">
          <label for="at-crm-lung">Lungime (știfturi)<input id="at-crm-lung" type="number" min="2" max="24" step="1" value="${q.lung}"></label>
          <label for="at-crm-roata">Roata pereche (dinți)<input id="at-crm-roata" type="number" min="8" max="80" step="1" value="${q.z}"></label>
          <label for="at-crm-modul">Modul<input id="at-crm-modul" type="number" min="0.5" max="3" step="0.1" value="${q.m}"></label>
        </div>
        <div class="at-rand"><span class="mic">Prinderea:</span>${seg("at-crm-prindere", [["stifturi", "Pe știfturi"], ["gauri", "Cu găuri de știft"]], q.prindere)}</div>
        <div class="at-rand"><span class="mic" id="at-crm-montaj">${tr`${q.dinti} dinți. Axul roții de ${q.z} stă la ${fmt(q.axa)} mm deasupra feței de jos a cremalierei: ${unde}. La o rotație a roții, cremaliera înaintează ${fmt(q.cursa)} mm.`}</span></div>
        <div class="at-rand"><button class="btn" type="button" id="at-crm-fa-pereche">Fă perechea</button><span class="mic">${tr("pune în listă cremaliera și roata ei")}</span></div>`;
      const camp = (id: string, a: number, b: number, f: (v: number) => void) => { $(id).onchange = ev => { const v = +(ev.target as HTMLInputElement).value; if (v >= a && v <= b) { f(v); schimbat(); } editor(); }; };
      camp("#at-crm-lung", 2, 24, v => { p.lung = Math.round(v); });
      camp("#at-crm-roata", 8, 80, v => { p.roata = Math.round(v); });
      camp("#at-crm-modul", 0.5, 3, v => { p.modul = Math.round(v * 10) / 10; });
      $("#at-crm-prindere").onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-v]"); if (!b) return; p.prindere = b.dataset.v!; editor(); schimbat(); };
      $("#at-crm-fa-pereche").onclick = adaugaPerecheCremaliera;
    } else if (t === "melc") {
      // șurubul melc (ADR 0284, felia 3.Cj): diametrul, lungimea și roata pereche (a editorului); cotele și montajul, în
      // cuvinte; perechea în listă
      const p = stare.melc, q = Lego.melcCote(p), m = Lego.melcMontaj(p, p.pereche), pasi = m.distanta / 8;
      const unde = m.grila === "intreg" ? (pasi === 1 ? tr("pe grila de știfturi, la un știft") : tr`pe grila de știfturi, la ${pasi} știfturi`)
        : m.grila === "jumatate" ? tr`la jumătatea grilei, la ${fmt(pasi)} știfturi` : tr("în afara grilei de știfturi (pe grilă cad roțile cu dinții din 8 în 8)");
      const subtire = q.perete < 0.8 ? " " + tr`Între colțurile găurii de ax și fundul spirei rămân doar ${fmt(q.perete, 2)} mm: piesa o ține spira. Pentru sarcină, alege Ø16.` : "";
      e.innerHTML = `<h2>Șurub melc</h2>
        <p class="mic">Un șurub pe ax, care întoarce o roată dințată de aici cu un dinte la fiecare tură: o demultiplicare mare într-un loc mic, cu axele în cruce. Roata nu poate întoarce melcul, deci mecanismul rămâne unde l-ai lăsat. Spira are pasul și profilul dinților de aici (modulul 1, 20°), cu jocul din calibrare. Se tipărește în picioare; flancul de jos al spirei stă în consolă, la 70° de verticală: tipărește-l cu straturi subțiri sau cu suport.</p>
        <div class="at-rand"><span class="mic">Diametrul:</span>${seg("at-mlc-diam", [["8", "Ø8 (ca LEGO)"], ["16", "Ø16 (gros)"]], String(q.diam))}</div>
        <div class="at-campuri">
          <label for="at-mlc-lung">Lungime (știfturi)<input id="at-mlc-lung" type="number" min="1" max="4" step="1" value="${q.lung}"></label>
          <label for="at-mlc-pereche">Roata pereche (dinți)<input id="at-mlc-pereche" type="number" min="8" max="80" step="1" value="${m.dinti}"></label>
        </div>
        <div class="at-rand"><span class="mic" id="at-mlc-info">${tr`Are Ø${fmt(q.varf)} la vârf, Ø${fmt(q.fund)} la fundul spirei și ${fmt(q.lungime)} mm lungime: ${fmt(q.spire)} spire, cu pasul de ${fmt(q.pas, 2)} mm.`}${subtire}</span></div>
        <div class="at-rand"><span class="mic" id="at-mlc-montaj">${tr`Axul roții de ${m.dinti} stă la ${fmt(m.distanta)} mm de axul melcului, în cruce cu el: ${unde}. La o tură a melcului, roata înaintează cu un dinte: raportul e ${m.dinti} : 1.`}</span></div>
        <div class="at-rand"><button class="btn" type="button" id="at-mlc-fa-pereche">Fă perechea</button><span class="mic">${tr("pune în listă melcul și roata lui")}</span></div>`;
      // un număr din afara marginilor nu e primit: câmpul se întoarce la valoarea de dinainte
      $("#at-mlc-diam").onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-v]"); if (!b) return; p.diam = +b.dataset.v!; editor(); schimbat(); };
      $("#at-mlc-lung").onchange = ev => { const v = +(ev.target as HTMLInputElement).value; if (v >= 1 && v <= 4) { p.lung = Math.round(v); schimbat(); } editor(); };
      // roata pereche nu schimbă piesa: doar montajul scris și ce pune „Fă perechea”
      $("#at-mlc-pereche").onchange = ev => { const v = +(ev.target as HTMLInputElement).value; if (v >= 8 && v <= 80) p.pereche = Math.round(v); editor(); };
      $("#at-mlc-fa-pereche").onclick = adaugaPerecheMelc;
    } else if (t === "cama") {
      // cama (ADR 0284, felia 3.Cj): forma, diametrul de bază, cursa, grosimea și gaura; razele, în cuvinte
      const p = stare.cama, q = Lego.camaCote(p);
      const cum = q.forma === "para" ? tr("Stă pe cercul de bază mai mult de jumătate de tură, apoi urcă și coboară scurt.")
        : q.forma === "melc" ? tr("Urcă lin o tură întreagă, apoi cade dintr-odată: se rotește într-un singur sens.") : tr("Urcă și coboară lin, câte o jumătate de tură.");
      e.innerHTML = `<h2>Camă</h2>
        <p class="mic">Un disc pe ax, cu marginea mai departe de ax într-o parte decât în cealaltă: face din rotire o mișcare de du-te-vino. Un tachet sprijinit pe ea (capătul unei grinzi, un ax într-un ghidaj) urcă și coboară cu cursa, o dată pe tură. Se tipărește culcată, fără suport.</p>
        <div class="at-rand"><span class="mic">Forma:</span>${seg("at-cam-forma", [["excentric", "Excentric"], ["para", "Pară"], ["melc", "Melc"]], q.forma)}</div>
        <div class="at-campuri">
          <label for="at-cam-diam">Ø de bază (mm)<input id="at-cam-diam" type="number" min="10" max="64" step="0.1" value="${q.diam}"></label>
          <label for="at-cam-cursa">Cursa (mm)<input id="at-cam-cursa" type="number" min="1" max="24" step="0.1" value="${q.cursa}"></label>
          <label for="at-cam-grosime">Grosime (mm)<input id="at-cam-grosime" type="number" min="1" max="20" step="0.1" value="${q.grosime}"></label>
        </div>
        <div class="at-rand"><span class="mic">Gaura:</span>${seg("at-cam-gaura", [["x", "Pentru ax"], ["r", "Rotundă"]], q.gaura)}</div>
        <div class="at-rand"><span class="mic" id="at-cam-info">${tr`Marginea stă între ${fmt(q.razaMica)} și ${fmt(q.razaMare)} mm de ax: un tachet sprijinit pe ea urcă și coboară ${fmt(q.cursa)} mm la fiecare tură.`} ${cum}</span></div>`;
      // un număr din afara marginilor nu e primit: câmpul se întoarce la valoarea de dinainte (zecimile le rotunjește motorul)
      const camp = (id: string, a: number, b: number, f: (v: number) => void) => { $(id).onchange = ev => { const v = +(ev.target as HTMLInputElement).value; if (v >= a && v <= b) { f(v); schimbat(); } editor(); }; };
      const alege = (id: string, f: (v: string) => void) => { $(id).onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-v]"); if (!b) return; f(b.dataset.v!); editor(); schimbat(); }; };
      camp("#at-cam-diam", 10, 64, v => { p.diam = v; });
      camp("#at-cam-cursa", 1, 24, v => { p.cursa = v; });
      camp("#at-cam-grosime", 1, 20, v => { p.grosime = v; });
      alege("#at-cam-forma", v => { p.forma = v; });
      alege("#at-cam-gaura", v => { p.gaura = v; });
    } else if (t === "roataPalete") {
      // roata cu palete (ADR 0284, felia 3.Cj): diametrul (și repede, pe grila de știfturi), paletele, lățimea, forma lor,
      // discul și gaura; butucul și paletele, în cuvinte. Paletele se țin în marginea diametrului (câte încap la butuc).
      const p = stare.roataPalete, q = Lego.roataPaleteCote(p);
      e.innerHTML = `<h2>Roată cu palete</h2>
        <p class="mic">O roată de apă sau de vânt: paletele pornesc din butucul roților și ajung la diametrul cerut. Pe un ax, între două grinzi, împinge o barcă sau e învârtită de un jet de apă ori de aer. Discul de dedesubt ține paletele între ele; fără el, apa trece printre palete. Se tipărește culcată, fără suport.</p>
        <div class="at-rand"><span class="mic">Repede:</span>${seg("at-rp-repede", [["32", "Ø32"], ["48", "Ø48"], ["64", "Ø64"], ["96", "Ø96"]], String(q.diam))}<span class="mic">${tr("4, 6, 8 și 12 știfturi")}</span></div>
        <div class="at-campuri">
          <label for="at-rp-diam">Diametrul (mm)<input id="at-rp-diam" type="number" min="24" max="160" step="0.1" value="${q.diam}"></label>
          <label for="at-rp-palete">Câte palete<input id="at-rp-palete" type="number" min="4" max="${q.incap}" step="1" value="${q.palete}"></label>
          <label for="at-rp-lat">Lățimea (mm)<input id="at-rp-lat" type="number" min="4" max="40" step="0.1" value="${q.lat}"></label>
        </div>
        <div class="at-rand"><span class="mic">Forma:</span>${seg("at-rp-forma", [["drepte", "Palete drepte"], ["curbate", "Palete curbate"]], q.forma)}</div>
        <div class="at-rand"><span class="mic">Discul:</span>${seg("at-rp-disc", [["unul", "Cu disc"], ["fara", "Fără"]], q.disc)}</div>
        <div class="at-rand"><span class="mic">Gaura:</span>${seg("at-rp-gaura", [["x", "Pentru ax"], ["r", "Rotundă"]], q.gaura)}</div>
        <div class="at-rand"><span class="mic" id="at-rp-info">${tr`Butucul are Ø${fmt(2 * q.butuc)} mm, iar paletele, ${fmt(q.lungime)} mm lungime și ${fmt(q.grosime)} mm grosime.`}${q.incap < 24 ? " " + tr`La diametrul ăsta încap cel mult ${q.incap} palete.` : ""}${q.forma === "curbate" ? " " + tr("Curbate, prind apa ca niște cupe: împing mai bine într-un sens.") : ""}</span></div>`;
      // un număr din afara marginilor nu e primit: câmpul se întoarce la valoarea de dinainte (zecimile și întregii îi
      // rotunjește motorul); paletele rămân câte încap
      const tine = () => { p.palete = Lego.roataPaleteCote(p).palete; };
      const camp = (id: string, a: number, b: number, f: (v: number) => void) => { $(id).onchange = ev => { const v = +(ev.target as HTMLInputElement).value; if (v >= a && v <= b) { f(v); tine(); schimbat(); } editor(); }; };
      const alege = (id: string, f: (v: string) => void) => { $(id).onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-v]"); if (!b) return; f(b.dataset.v!); tine(); editor(); schimbat(); }; };
      camp("#at-rp-diam", 24, 160, v => { p.diam = v; });
      camp("#at-rp-palete", 4, 24, v => { p.palete = v; });
      camp("#at-rp-lat", 4, 40, v => { p.lat = v; });
      alege("#at-rp-repede", v => { p.diam = +v; });
      alege("#at-rp-forma", v => { p.forma = v; });
      alege("#at-rp-disc", v => { p.disc = v; });
      alege("#at-rp-gaura", v => { p.gaura = v; });
    } else if (t === "fulg") {
      // fulgul de zăpadă (ADR 0285, felia 3.Cl-1): cei gata făcuți și „Alt fulg”, apoi diametrul, grosimea, linia, perechile
      // de ramuri (câte, sub ce unghi, de unde încep, cât sunt de lungi), miezul și agățătoarea. Linia rămâne în marginea
      // diametrului (cel mult o șesime din rază).
      const p = stare.fulg, q = Lego.fulgCote(p), gata = FULGI.findIndex(([, f]) => Object.entries(f).every(([k, v]) => (q as Record<string, unknown>)[k] === v));
      e.innerHTML = `<h2>Fulg de zăpadă</h2>
        <p class="mic">Șase brațe cu ramuri, dintr-o singură bucată plată: se tipărește culcat, fără suport. Inelul de sus e pentru ață sau pentru un cârlig de brad.</p>
        <div class="at-rand"><span class="mic">Repede:</span>${seg("at-fg-repede", FULGI.map(([n], i): [string, string] => [String(i), n]), String(gata))}<button class="btn" type="button" id="at-fg-alt">Alt fulg</button></div>
        <div class="at-campuri">
          <label for="at-fg-diam">Diametrul (mm)<input id="at-fg-diam" type="number" min="30" max="150" step="1" value="${q.diam}"></label>
          <label for="at-fg-grosime">Grosimea (mm)<input id="at-fg-grosime" type="number" min="1.2" max="6" step="0.1" value="${q.grosime}"></label>
          <label for="at-fg-linie">Linia (mm)<input id="at-fg-linie" type="number" min="1.2" max="${q.linieMax}" step="0.1" value="${q.linie}"></label>
          <label for="at-fg-ramuri">Perechi de ramuri<input id="at-fg-ramuri" type="number" min="0" max="4" step="1" value="${q.ramuri}"></label>
          <label for="at-fg-unghi">Unghiul ramurilor (°)<input id="at-fg-unghi" type="number" min="30" max="75" step="1" value="${q.unghi}"></label>
          <label for="at-fg-inceput">Prima pereche, la (%)<input id="at-fg-inceput" type="number" min="20" max="70" step="1" value="${q.inceput}"></label>
          <label for="at-fg-lungime">Lungimea ramurilor (%)<input id="at-fg-lungime" type="number" min="10" max="45" step="1" value="${q.lungime}"></label>
        </div>
        <div class="at-rand"><span class="mic">Miezul:</span>${seg("at-fg-miez", [["hexagon", "Hexagon"], ["stea", "Stea"], ["gol", tr("Gol", "miez")]], q.miez)}</div>
        <div class="at-rand"><span class="mic">Agățătoarea:</span>${seg("at-fg-ag", [["inel", "Inel"], ["fara", "Fără"]], q.agatatoare)}</div>
        <div class="at-rand"><span class="mic" id="at-fg-info">${tr`Linia are ${fmt(q.linie)} mm (cea mai subțire care se tipărește bine are 1,2); pe fiecare braț sunt ${2 * q.facute} ramuri.`}${q.facute < q.ramuri ? " " + tr`Încă ${2 * (q.ramuri - q.facute)} ar fi ieșit prea scurte ca să se vadă: fă-le mai lungi sau fulgul mai mare.` : ""}</span></div>`;
      // un număr din afara marginilor nu e primit: câmpul se întoarce la valoarea de dinainte; linia rămâne în marginea
      // diametrului ales
      const tine = () => { p.linie = Lego.fulgCote(p).linie; };
      const camp = (id: string, a: number, b: number, f: (v: number) => void) => { $(id).onchange = ev => { const v = +(ev.target as HTMLInputElement).value; if (v >= a && v <= b) { f(v); tine(); schimbat(); } editor(); }; };
      const alege = (id: string, f: (v: string) => void) => { $(id).onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-v]"); if (!b) return; f(b.dataset.v!); tine(); editor(); schimbat(); }; };
      camp("#at-fg-diam", 30, 150, v => { p.diam = v; });
      camp("#at-fg-grosime", 1.2, 6, v => { p.grosime = v; });
      camp("#at-fg-linie", 1.2, q.linieMax, v => { p.linie = v; });
      camp("#at-fg-ramuri", 0, 4, v => { p.ramuri = Math.round(v); });
      camp("#at-fg-unghi", 30, 75, v => { p.unghi = Math.round(v); });
      camp("#at-fg-inceput", 20, 70, v => { p.inceput = Math.round(v); });
      camp("#at-fg-lungime", 10, 45, v => { p.lungime = Math.round(v); });
      alege("#at-fg-repede", v => { Object.assign(p, FULGI[+v]![1]); });
      alege("#at-fg-miez", v => { p.miez = v; });
      alege("#at-fg-ag", v => { p.agatatoare = v; });
      $("#at-fg-alt").onclick = () => { Object.assign(p, fulgIntamplator()); tine(); editor(); schimbat(); };
    } else if (t === "stea") {
      // steaua (ADR 0285, felia 3.Cl-1): colțurile, felul (plină, contur, în relief), diametrul, interiorul, grosimea (în
      // relief, înălțimea din mijloc), linia conturului și agățătoarea (gaura, doar la steaua plină)
      const p = stare.stea, q = Lego.steaCote(p), relief = q.fel === "relief";
      const gata = STELE.findIndex(([, f]) => Object.entries(f).every(([k, v]) => (k === "linie" && q.fel !== "contur") || (q as Record<string, unknown>)[k] === v));
      e.innerHTML = `<h2>Stea</h2>
        <p class="mic">Plată, de agățat (plină sau doar conturul), ori în relief, cu muchii de la mijloc la colțuri, ca steaua din vârful bradului. Se tipărește culcată, fără suport.</p>
        <div class="at-rand"><span class="mic">Repede:</span>${seg("at-st-repede", STELE.map(([n], i): [string, string] => [String(i), n]), String(gata))}</div>
        <div class="at-rand"><span class="mic">Colțuri:</span>${seg("at-st-varfuri", [["5", "5"], ["6", "6"], ["7", "7"], ["8", "8"]], String(q.varfuri))}</div>
        <div class="at-rand"><span class="mic">Felul:</span>${seg("at-st-fel", [["plina", "Plină"], ["contur", "Contur"], ["relief", "În relief"]], q.fel)}</div>
        <div class="at-campuri">
          <label for="at-st-diam">Diametrul (mm)<input id="at-st-diam" type="number" min="30" max="150" step="1" value="${q.diam}"></label>
          <label for="at-st-interior">Interiorul (%)<input id="at-st-interior" type="number" min="30" max="75" step="1" value="${q.interior}"></label>
          <label for="at-st-grosime">${relief ? tr("Înălțimea (mm)") : tr("Grosimea (mm)")}<input id="at-st-grosime" type="number" min="1.2" max="12" step="0.1" value="${q.grosime}"></label>
          ${q.fel === "contur" ? `<label for="at-st-linie">Linia (mm)<input id="at-st-linie" type="number" min="1.2" max="6" step="0.1" value="${q.linie}"></label>` : ""}
        </div>
        <div class="at-rand"><span class="mic">Agățătoarea:</span>${seg("at-st-ag", q.fel === "plina" ? [["inel", "Inel"], ["gaura", "Gaură"], ["fara", "Fără"]] : [["inel", "Inel"], ["fara", "Fără"]], q.agatatoare)}</div>
        <div class="at-rand"><span class="mic" id="at-st-info">${tr`Colțurile au ${q.varf}°; vârfurile dinăuntru stau la ${fmt(q.interior / 100 * q.diam / 2)} mm de mijloc.`}${relief ? " " + tr`Marginea are ${fmt(Math.min(1.2, q.grosime / 2))} mm, iar mijlocul, ${fmt(q.grosime)} mm.` : ""}</span></div>`;
      const camp = (id: string, a: number, b: number, f: (v: number) => void) => { const c = document.querySelector<HTMLInputElement>(id); if (c) c.onchange = () => { const v = +c.value; if (v >= a && v <= b) { f(v); schimbat(); } editor(); }; };
      const alege = (id: string, f: (v: string) => void) => { $(id).onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-v]"); if (!b) return; f(b.dataset.v!); editor(); schimbat(); }; };
      camp("#at-st-diam", 30, 150, v => { p.diam = v; });
      camp("#at-st-interior", 30, 75, v => { p.interior = Math.round(v); });
      camp("#at-st-grosime", 1.2, 12, v => { p.grosime = v; });
      camp("#at-st-linie", 1.2, 6, v => { p.linie = v; });
      alege("#at-st-repede", v => { Object.assign(p, STELE[+v]![1]); });
      alege("#at-st-varfuri", v => { p.varfuri = +v; });
      alege("#at-st-fel", v => { p.fel = v; });
      alege("#at-st-ag", v => { p.agatatoare = v; });
    } else if (t === "brad") {
      // brăduțul (ADR 0285, felia 3.Cl-1): de agățat sau în picioare (două plăci cu fante), înălțimea, etajele, lățimea,
      // grosimea și, la cel de agățat, agățătoarea
      const p = stare.brad, q = Lego.bradCote(p), picioare = q.fel === "picioare";
      e.innerHTML = `<h2>Brăduț</h2>
        <p class="mic">De agățat, dintr-o bucată, sau în picioare: două plăci cu fante, tipărite alături, care intră una în alta, în cruce, și stau pe masă. Se tipărește culcat, fără suport.</p>
        <div class="at-rand"><span class="mic">Repede:</span>${seg("at-bd-repede", [["50", "50 mm"], ["80", "80 mm"], ["120", "120 mm"]], String(q.inaltime))}</div>
        <div class="at-rand"><span class="mic">Felul:</span>${seg("at-bd-fel", [["agatat", "De agățat"], ["picioare", "În picioare"]], q.fel)}</div>
        <div class="at-campuri">
          <label for="at-bd-inaltime">Înălțimea (mm)<input id="at-bd-inaltime" type="number" min="30" max="150" step="1" value="${q.inaltime}"></label>
          <label for="at-bd-etaje">Etaje<input id="at-bd-etaje" type="number" min="2" max="6" step="1" value="${q.etaje}"></label>
          <label for="at-bd-latime">Lățimea (% din înălțime)<input id="at-bd-latime" type="number" min="40" max="90" step="1" value="${q.latime}"></label>
          <label for="at-bd-grosime">Grosimea (mm)<input id="at-bd-grosime" type="number" min="1.2" max="6" step="0.1" value="${q.grosime}"></label>
        </div>
        ${picioare ? "" : `<div class="at-rand"><span class="mic">Agățătoarea:</span>${seg("at-bd-ag", [["inel", "Inel"], ["gaura", "Gaură"], ["fara", "Fără"]], q.agatatoare)}</div>`}
        <div class="at-rand"><span class="mic" id="at-bd-info">${picioare
          ? tr`Două plăci late de ${fmt(q.lat)} mm. Fantele au ${fmt(q.fanta, 2)} mm: grosimea plăcii și jocul din calibrare. A doua placă se oprește la ${fmt(q.taiat)} mm, unde lângă fantă mai rămân 1,2 mm.`
          : tr`Lat de ${fmt(q.lat)} mm la bază.`}</span></div>`;
      const camp = (id: string, a: number, b: number, f: (v: number) => void) => { $(id).onchange = ev => { const v = +(ev.target as HTMLInputElement).value; if (v >= a && v <= b) { f(v); schimbat(); } editor(); }; };
      const alege = (id: string, f: (v: string) => void) => { const c = document.querySelector<HTMLElement>(id); if (c) c.onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-v]"); if (!b) return; f(b.dataset.v!); editor(); schimbat(); }; };
      camp("#at-bd-inaltime", 30, 150, v => { p.inaltime = v; });
      camp("#at-bd-etaje", 2, 6, v => { p.etaje = Math.round(v); });
      camp("#at-bd-latime", 40, 90, v => { p.latime = Math.round(v); });
      camp("#at-bd-grosime", 1.2, 6, v => { p.grosime = v; });
      alege("#at-bd-repede", v => { p.inaltime = +v; });
      alege("#at-bd-fel", v => { p.fel = v; });
      alege("#at-bd-ag", v => { p.agatatoare = v; });
    } else if (t === "glob") {
      // globul (ADR 0285, felia 3.Cl-2): plat (cu un model decupat sau în relief) sau din două discuri îmbinate; diametrul,
      // grosimea, câte dungi, zigzaguri sau stele, relieful și agățătoarea. Numărul rămâne în marginile modelului ales.
      const p = stare.glob, q = Lego.globCote(p), plat = q.fel === "plat", cuModel = q.model !== "fara";
      const cate = q.model === "zigzag" ? tr("Zigzaguri") : q.model === "stele" ? tr("Stele în jur") : tr("Dungi");
      const info = !plat ? tr`Două discuri de Ø${fmt(q.diam)} mm, tipărite alături. Fantele au ${fmt(q.fanta, 2)} mm: grosimea discului și jocul din calibrare.`
        : q.schimb ? tr`Pentru două culori, schimbă filamentul la ${fmt(q.schimb)} mm (după stratul ${Math.round(q.schimb / 0.2)}, la straturi de 0,2 mm): de acolo în sus se tipărește doar modelul.`
          : cuModel ? tr`Căpăcelul are ${fmt(q.capac)} mm, iar marginea din jurul modelului, ${fmt(q.margine)} mm.` : tr`Căpăcelul are ${fmt(q.capac)} mm.`;
      e.innerHTML = `<h2>Glob</h2>
        <p class="mic">Un disc cu căpăcel și inel, cu un model decupat sau în relief (pentru două culori), ori două discuri cu fante, care intră unul în altul în cruce. Se tipărește culcat, fără suport.</p>
        <div class="at-rand"><span class="mic">Felul:</span>${seg("at-gl-fel", [["plat", "Plat"], ["discuri", "Din două discuri"]], q.fel)}</div>
        ${plat ? `<div class="at-rand"><span class="mic">Modelul:</span>${seg("at-gl-model", [["dungi", "Dungi"], ["zigzag", "Zigzag"], ["stele", "Stele"], ["fara", "Fără"]], q.model)}</div>` : ""}
        ${plat && cuModel ? `<div class="at-rand"><span class="mic">Desenul:</span>${seg("at-gl-desen", [["decupat", "Decupat"], ["relief", "În relief"]], q.desen)}</div>` : ""}
        <div class="at-campuri">
          <label for="at-gl-diam">Diametrul (mm)<input id="at-gl-diam" type="number" min="30" max="120" step="1" value="${q.diam}"></label>
          <label for="at-gl-grosime">Grosimea (mm)<input id="at-gl-grosime" type="number" min="1.2" max="6" step="0.1" value="${q.grosime}"></label>
          ${cuModel ? `<label for="at-gl-cate">${cate}<input id="at-gl-cate" type="number" min="${CATE_GLOB[q.model]![0]}" max="${CATE_GLOB[q.model]![1]}" step="1" value="${q.cate}"></label>` : ""}
          ${q.schimb ? `<label for="at-gl-relief">Relieful (mm)<input id="at-gl-relief" type="number" min="0.4" max="3" step="0.1" value="${q.relief}"></label>` : ""}
        </div>
        <div class="at-rand"><span class="mic">Agățătoarea:</span>${seg("at-gl-ag", [["inel", "Inel"], ["fara", "Fără"]], q.agatatoare)}</div>
        <div class="at-rand"><span class="mic" id="at-gl-info">${info}</span></div>`;
      // un număr din afara marginilor nu e primit; la alt model, numărul scris rămâne ținut minte și e arătat în marginile
      // modelului (le aduce `globCote`), deci întoarcerea la modelul dinainte îl dă înapoi
      const camp = (id: string, a: number, b: number, f: (v: number) => void) => { const c = document.querySelector<HTMLInputElement>(id); if (c) c.onchange = () => { const v = +c.value; if (v >= a && v <= b) { f(v); schimbat(); } editor(); }; };
      const alege = (id: string, f: (v: string) => void) => { const c = document.querySelector<HTMLElement>(id); if (c) c.onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-v]"); if (!b) return; f(b.dataset.v!); editor(); schimbat(); }; };
      camp("#at-gl-diam", 30, 120, v => { p.diam = v; });
      camp("#at-gl-grosime", 1.2, 6, v => { p.grosime = v; });
      if (cuModel) camp("#at-gl-cate", CATE_GLOB[q.model]![0], CATE_GLOB[q.model]![1], v => { p.cate = Math.round(v); });
      camp("#at-gl-relief", 0.4, 3, v => { p.relief = v; });
      alege("#at-gl-fel", v => { p.fel = v; });
      alege("#at-gl-model", v => { p.model = v; });
      alege("#at-gl-desen", v => { p.desen = v; });
      alege("#at-gl-ag", v => { p.agatatoare = v; });
    } else if (t === "bradLego") {
      // brăduțul LEGO (ADR 0285, felia 3.Cl-4): etajul (diametrul, înălțimea, marginea) sau steaua de vârf; brăduțul întreg
      // (câte etaje, de la cel ales în sus, cu trunchiul, vârful și steaua) și „Fă brăduțul”
      const p = stare.bradLego, q = Lego.bradLegoCote(p), stea = q.piesa === "stea", piese = Lego.bradLegoPiese(p), et = piese.filter(x => x.piesa === "etaj").map(x => x.diam as number);
      // înălțimea brăduțului clădit: trunchiul (3 plăci), etajele, vârful (6 plăci, cu știftul lui) și steaua de peste știft
      const inalt = (3 + et.length * q.placi + 6) * 3.2 + 1.9 + q.marime / 2 * (1 + Math.cos(Math.PI / 5));
      const intreg = tr`Brăduțul întreg: trunchiul, ${et.length === 1 ? tr("un etaj") : tr`${et.length} etaje`} (de ${et.join(", ")} știfturi), vârful și steaua; clădit, are ${fmt(inalt, 0)} mm.`;
      e.innerHTML = `<h2>Brăduț LEGO</h2>
        <p class="mic">Un brăduț din etaje care se clădesc: fiecare are patru știfturi sus și locașul lor dedesubt. Trunchiul e o piesă rotundă 2 × 2, vârful e conul 2 × 2 cu știftul gol, iar steaua intră în el cu cuiul ei. Toate se tipăresc fără suport.</p>
        <div class="at-rand"><span class="mic">Piesa:</span>${seg("at-bl-piesa", [["etaj", "Etaj"], ["stea", "Stea de vârf"]], q.piesa)}</div>
        ${stea ? "" : `<div class="at-rand"><span class="mic">Diametrul (știfturi):</span>${seg("at-bl-diam", [["4", "4"], ["6", "6"], ["8", "8"], ["10", "10"]], String(q.diam))}</div>
        <div class="at-rand"><span class="mic">Marginea:</span>${seg("at-bl-margine", [["zimti", "Zimțată"], ["neteda", "Netedă"]], q.margine)}</div>`}
        <div class="at-campuri">
          ${stea ? "" : `<label for="at-bl-placi">Înălțimea (plăci)<input id="at-bl-placi" type="number" min="3" max="9" step="1" value="${q.placi}"></label>
          <label for="at-bl-etaje">Etaje în brăduț<input id="at-bl-etaje" type="number" min="1" max="${(q.diam - 4) / 2 + 1}" step="1" value="${et.length}"></label>`}
          <label for="at-bl-marime">Steaua (mm)<input id="at-bl-marime" type="number" min="16" max="48" step="1" value="${q.marime}"></label>
        </div>
        <div class="at-rand"><button class="btn" type="button" id="at-bl-fa">Fă brăduțul</button><span class="mic">${tr("pune în listă trunchiul, etajele, vârful și steaua")}</span></div>
        <div class="at-rand"><span class="mic" id="at-bl-info">${stea ? tr`Steaua e groasă de ${fmt(q.gros, 2)} mm, cât cuiul ei (o bară de 3,2 mm, culcată), care intră în știftul gol al vârfului.` + " " : ""}${intreg}</span></div>`;
      const camp = (id: string, a: number, b: number, f: (v: number) => void) => { const c = document.querySelector<HTMLInputElement>(id); if (c) c.onchange = () => { const v = +c.value; if (v >= a && v <= b) { f(v); schimbat(); } editor(); }; };
      const alege = (id: string, f: (v: string) => void) => { const c = document.querySelector<HTMLElement>(id); if (c) c.onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-v]"); if (!b) return; f(b.dataset.v!); editor(); schimbat(); }; };
      camp("#at-bl-placi", 3, 9, v => { p.placi = Math.round(v); });
      camp("#at-bl-etaje", 1, (q.diam - 4) / 2 + 1, v => { p.etaje = Math.round(v); });
      camp("#at-bl-marime", 16, 48, v => { p.marime = v; });
      alege("#at-bl-piesa", v => { p.piesa = v; });
      alege("#at-bl-diam", v => { p.diam = +v; });
      alege("#at-bl-margine", v => { p.margine = v; });
      $("#at-bl-fa").onclick = adaugaBradLego;
    } else if (t === "ornament") {
      // ornamentul cu nume (ADR 0285, felia 3.Cl-3): forma, numele (scris cu majuscule, cât încape de mare), scrisul (în
      // relief, adâncit sau decupat), mărimea formei, grosimea, relieful sau adâncimea, agățătoarea
      const p = stare.ornament, q = Lego.ornamentCote(p), et = q.forma === "eticheta", cuNume = q.litera > 0;
      const litere = tr`Literele au ${fmt(q.litera)} mm, cu linia de ${fmt(q.linie, 2)} mm.`;
      const info = !q.text ? tr("Scrie un nume: litere, cifre și semnele - . ! ' + (cel mult 16).") : !cuNume ? tr("Numele nu e scris: nu încape pe forma asta.")
        : q.scris === "relief" ? litere + " " + tr`Pentru două culori, schimbă filamentul la ${fmt(q.schimb)} mm (după stratul ${Math.round(q.schimb / 0.2)}, la straturi de 0,2 mm): de acolo în sus se tipărește doar numele.`
          : q.scris === "adancit" ? litere + " " + tr`Sunt adânci de ${fmt(q.relief)} mm.` : litere + " " + tr("Semnele cu ochi (ca A, B, O, 8) au câte o punte, ca mijlocul lor să nu cadă.");
      // un semn pe care fontul nu-l are e sărit: numele din câmp rămâne cum se scrie, iar rândul de jos o spune
      const sarite = !q.sarite ? "" : ([...q.sarite].length > 1 ? tr`Nu am semnele „${q.sarite}”: le-am sărit.` : tr`Nu am semnul „${q.sarite}”: l-am sărit.`) + " ";
      e.innerHTML = `<h2>Ornament cu nume</h2>
        <p class="mic">O formă plată cu un nume pe ea: în relief (pentru două culori), adâncit sau decupat. Numele se scrie cu majuscule, cât încape de mare. Se tipărește culcat, fără suport.</p>
        <div class="at-rand"><span class="mic">Forma:</span>${seg("at-on-forma", [["eticheta", "Etichetă"], ["glob", "Glob"], ["inima", "Inimă"], ["stea", "Stea"]], q.forma)}</div>
        <div class="at-campuri"><label for="at-on-text">Numele<input id="at-on-text" type="text" maxlength="16" autocomplete="off" spellcheck="false" value="${q.text}"></label></div>
        <div class="at-rand"><span class="mic">Scrisul:</span>${seg("at-on-scris", [["relief", "În relief"], ["adancit", "Adâncit"], ["decupat", "Decupat"]], q.scris)}</div>
        <div class="at-campuri">
          ${et ? `<label for="at-on-lungime">Lungimea (mm)<input id="at-on-lungime" type="number" min="40" max="160" step="1" value="${q.lungime}"></label>
          <label for="at-on-inaltime">Înălțimea (mm)<input id="at-on-inaltime" type="number" min="16" max="60" step="1" value="${q.inaltime}"></label>`
          : `<label for="at-on-diam">Mărimea (mm)<input id="at-on-diam" type="number" min="30" max="120" step="1" value="${q.diam}"></label>`}
          <label for="at-on-grosime">Grosimea (mm)<input id="at-on-grosime" type="number" min="1.2" max="6" step="0.1" value="${q.grosime}"></label>
          ${q.text && q.scris !== "decupat" ? `<label for="at-on-relief">${q.scris === "adancit" ? tr("Adâncimea (mm)") : tr("Relieful (mm)")}<input id="at-on-relief" type="number" min="0.4" max="3" step="0.1" value="${q.relief}"></label>` : ""}
        </div>
        <div class="at-rand"><span class="mic">Agățătoarea:</span>${seg("at-on-ag", et ? [["gaura", "Gaură"], ["fara", "Fără"]] : [["inel", "Inel"], ["fara", "Fără"]], q.agatatoare)}</div>
        <div class="at-rand"><span class="mic" id="at-on-info"></span></div>`;
      // (rândul de jos poartă semnele scrise de om: se pune ca text, nu ca marcaj)
      $("#at-on-info").textContent = sarite + info;
      const camp = (id: string, a: number, b: number, f: (v: number) => void) => { const c = document.querySelector<HTMLInputElement>(id); if (c) c.onchange = () => { const v = +c.value; if (v >= a && v <= b) { f(v); schimbat(); } editor(); }; };
      const alege = (id: string, f: (v: string) => void) => { $(id).onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-v]"); if (!b) return; f(b.dataset.v!); editor(); schimbat(); }; };
      // numele: cum l-a scris omul; editorul îl arată cum se scrie pe piesă (majuscule, doar semnele fontului)
      ($("#at-on-text") as HTMLInputElement).onchange = ev => { p.text = (ev.target as HTMLInputElement).value; editor(); schimbat(); };
      camp("#at-on-lungime", 40, 160, v => { p.lungime = v; });
      camp("#at-on-inaltime", 16, 60, v => { p.inaltime = v; });
      camp("#at-on-diam", 30, 120, v => { p.diam = v; });
      camp("#at-on-grosime", 1.2, 6, v => { p.grosime = v; });
      camp("#at-on-relief", 0.4, 3, v => { p.relief = v; });
      alege("#at-on-forma", v => { p.forma = v; });
      alege("#at-on-scris", v => { p.scris = v; });
      alege("#at-on-ag", v => { p.agatatoare = v; });
    } else if (t === "roata") {
      // roata cu anvelopă (ADR 0280): felul, mărimea, banda de rulare, fața, gaura; janta și anvelopa, împreună
      const p = stare.roata, faraJanta = p.fel === "anvelopa", faraAnvelopa = p.fel === "janta";
      e.innerHTML = `<h2>Roată cu anvelopă</h2>
        <p class="mic">Roată de vehicul, culcată pe pat (fața cu spițele jos). Dintr-o bucată se printează din PLA, fără nimic de montat. Doar janta ia o anvelopă LEGO (30,4 × 14 pe janta de Ø16,8 × 13,6, potrivirea din fila Calibrare) sau una printată din TPU; anvelopa printată are nervura din interior ca LEGO, deci se pune și pe o jantă LEGO.</p>
        <div class="at-rand"><span class="mic">Felul:</span>${seg("at-ro-fel", [["plina", "Dintr-o bucată"], ["janta", "Doar janta"], ["anvelopa", "Doar anvelopa (TPU)"]], p.fel)}</div>
        <div class="at-rand"><span class="mic">Repede:</span><button class="btn" type="button" id="at-ro-lego">Ca LEGO 30,4 × 14</button></div>
        <div class="at-campuri">
          ${faraAnvelopa ? "" : `<label for="at-ro-diam">Ø anvelopă (mm)<input id="at-ro-diam" type="number" min="16" max="200" step="0.1" value="${p.diam}"></label>`}
          <label for="at-ro-janta">Ø jantă (mm)<input id="at-ro-janta" type="number" min="12.6" max="150" step="0.1" value="${p.janta}"></label>
          <label for="at-ro-lat">Lățime (mm)<input id="at-ro-lat" type="number" min="4" max="40" step="0.1" value="${p.lat}"></label>
        </div>
        ${faraAnvelopa ? "" : `<div class="at-rand"><span class="mic">Banda:</span>${seg("at-ro-banda", [["nervuri", "Cu nervuri"], ["neteda", "Netedă"], ["blocuri", "Cu blocuri"]], p.banda)}</div>`}
        ${faraJanta ? "" : `${!Lego.spiteIncap(p.janta, p.gaura) ? `<div class="at-rand"><span class="mic" id="at-ro-fata-plina">${tr`Fața: plină (spițele încap de la janta de Ø ${fmt(Lego.jantaMinimaSpite(p.gaura))} mm).`}</span></div>`
          : `<div class="at-rand"><span class="mic">Fața:</span>${seg("at-ro-spite", [["disc", "Plină"], ["drepte", "Spițe drepte"], ["y", "Spițe în Y"], ["gauri", "Cu găuri"]], p.spite)}</div>
        ${p.spite === "disc" ? "" : `<div class="at-campuri"><label for="at-ro-nr">Câte (3–12)<input id="at-ro-nr" type="number" min="3" max="12" step="1" value="${p.nrSpite}"></label></div>`}`}
        <div class="at-rand"><span class="mic">Gaura:</span>${seg("at-ro-gaura", [["x", "Pentru ax"], ["r", "Rotundă"], ["nu", "Fără"]], p.gaura)}</div>`}
        ${p.fel === "plina" ? "" : `<div class="at-rand"><button class="btn" type="button" id="at-ro-amandoua">Pune janta și anvelopa</button><span class="mic">${tr("aceeași mărime, de printat: janta din PLA, anvelopa din TPU")}</span></div>`}`;
      const alege = (id: string, f: (v: string) => void) => { if (!$(id)) return; $(id).onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-v]"); if (!b) return; f(b.dataset.v!); editor(); schimbat(); }; };
      const camp = (id: string, a: number, b: number, f: (v: number) => void) => { if (!$(id)) return; $(id).onchange = ev => { const v = +(ev.target as HTMLInputElement).value; if (v >= a && v <= b) { f(Math.round(v * 10) / 10); editor(); schimbat(); } }; };
      alege("#at-ro-fel", v => { p.fel = v; });
      alege("#at-ro-banda", v => { p.banda = v; });
      alege("#at-ro-spite", v => { p.spite = v; });
      alege("#at-ro-gaura", v => { p.gaura = v; });
      camp("#at-ro-diam", 16, 200, v => { p.diam = v; });
      camp("#at-ro-janta", 12.6, 150, v => { p.janta = v; });
      camp("#at-ro-lat", 4, 40, v => { p.lat = v; });
      camp("#at-ro-nr", 3, 12, v => { p.nrSpite = Math.round(v); });
      $("#at-ro-lego").onclick = () => { p.diam = 30.4; p.janta = 16.8; p.lat = 13.6; editor(); schimbat(); };
      if ($("#at-ro-amandoua")) $("#at-ro-amandoua").onclick = adaugaJantaSiAnvelopa;
    } else if (t === "fulie") {
      // fulia (ADR 0280): canalul, mărimea, fața (doar ce încape), gaura; cureaua spre o altă fulie, pe grilă sau nu
      const p = stare.fulie, f = Lego.fulieFete(p), cu = Lego.cureaua(p, { ...p, diam: p.pereche }, p.distanta);
      const spite = p.spite === "drepte" || p.spite === "y";
      const fata = (spite && !f.spite) || (p.spite === "stift" && !f.stift) ? "disc" : p.spite;
      const fete: [string, string][] = [["disc", "Plină"], ...(f.stift ? [["stift", "Găuri de știft"]] as [string, string][] : []),
        ...(f.spite ? [["drepte", "Spițe drepte"], ["y", "Spițe în Y"]] as [string, string][] : [])];
      const curea = cu.atinge ? tr`Fuliile s-ar atinge: axele trebuie să fie la cel puțin ${fmt(cu.minim)} mm.`
        : tr`Cureaua: ${fmt(cu.lungime)} mm pe fundul canalelor, cu axele la ${fmt(p.distanta)} mm, ${textGrila(p.distanta)}. Un elastic se alege puțin mai scurt, ca să stea întins.`;
      e.innerHTML = `<h2>Fulie</h2>
        <p class="mic">Roată cu canal, pentru un elastic sau o curea, culcată pe pat (fața jos). Canalul în V e ca la fulia LEGO, pentru elasticele LEGO; cel rotund ține un inel O sau un elastic rotund; cel plat, cu margini teșite, o curea. Butucul iese cu 0,5 mm peste obadă, ca la LEGO; gaura de ax și găurile de știft vin din calibrare.</p>
        <div class="at-rand"><span class="mic">Repede:</span><button class="btn" type="button" id="at-fu-lego">Ca LEGO Ø24</button></div>
        <div class="at-rand"><span class="mic">Canalul:</span>${seg("at-fu-canal", [["v", "În V"], ["rotund", "Rotund"], ["plat", "Plat (curea)"]], p.canal)}</div>
        <div class="at-campuri">
          <label for="at-fu-diam">Ø (mm)<input id="at-fu-diam" type="number" min="12" max="200" step="0.1" value="${p.diam}"></label>
          <label for="at-fu-lat">Lățime (mm)<input id="at-fu-lat" type="number" min="2" max="40" step="0.1" value="${p.lat}"></label>
          <label for="at-fu-latc">${p.canal === "plat" ? tr("Cureaua (mm)") : tr("Canalul (mm)")}<input id="at-fu-latc" type="number" min="1" max="20" step="0.1" value="${p.latCanal}"></label>
        </div>
        <div class="at-rand"><span class="mic">Fața:</span>${seg("at-fu-spite", fete, fata)}${f.stift ? "" : `<span class="mic" id="at-fu-stift-de-la">${tr`găurile de știft încap de la Ø ${fmt(Lego.fulieMinimaFata(p, "stift"))} mm`}</span>`}</div>
        ${fata === "drepte" || fata === "y" ? `<div class="at-campuri"><label for="at-fu-nr">Câte (3–12)<input id="at-fu-nr" type="number" min="3" max="12" step="1" value="${p.nrSpite}"></label></div>` : ""}
        <div class="at-rand"><span class="mic">Gaura:</span>${seg("at-fu-gaura", [["x", "Pentru ax"], ["r", "Rotundă"], ["nu", "Fără"]], p.gaura)}</div>
        <div class="at-campuri">
          <label for="at-fu-pereche">A doua fulie, Ø (mm)<input id="at-fu-pereche" type="number" min="12" max="200" step="0.1" value="${p.pereche}"></label>
          <label for="at-fu-dist">Între axe (mm)<input id="at-fu-dist" type="number" min="1" max="1000" step="0.1" value="${p.distanta}"></label>
        </div>
        <div class="at-rand"><span class="mic">Pe grilă (pași):</span>${seg("at-fu-grila", [2, 3, 4, 5, 6, 8, 10].map((k): [string, string] => [String(8 * k), String(k)]), String(p.distanta))}</div>
        <p class="mic" id="at-fu-curea">${curea}</p>
        <div class="at-rand"><button class="btn" type="button" id="at-fu-fa-pereche">Fă perechea</button><span class="mic">${tr("pune în listă ambele fulii, cu același canal")}</span></div>`;
      const alege = (id: string, f2: (v: string) => void) => { $(id).onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-v]"); if (!b) return; f2(b.dataset.v!); editor(); schimbat(); }; };
      const camp = (id: string, a: number, b: number, f2: (v: number) => void) => { if (!$(id)) return; $(id).onchange = ev => { const v = +String((ev.target as HTMLInputElement).value).replace(",", "."); if (v >= a && v <= b) { f2(Math.round(v * 10) / 10); editor(); schimbat(); } }; };
      // la alt canal: lățimea lui implicită și, dacă e nevoie, obada cât să-l cuprindă (fără avertisment)
      alege("#at-fu-canal", v => { p.canal = v; p.latCanal = v === "rotund" ? 2 : v === "plat" ? 4 : 2.6; p.lat = Math.max(p.lat, Lego.fulieFete(p).W); });
      alege("#at-fu-spite", v => { p.spite = v; });
      alege("#at-fu-gaura", v => { p.gaura = v; });
      alege("#at-fu-grila", v => { p.distanta = +v; });
      camp("#at-fu-diam", 12, 200, v => { p.diam = v; });
      camp("#at-fu-lat", 2, 40, v => { p.lat = v; });
      camp("#at-fu-latc", 1, 20, v => { p.latCanal = v; });
      camp("#at-fu-nr", 3, 12, v => { p.nrSpite = Math.round(v); });
      camp("#at-fu-pereche", 12, 200, v => { p.pereche = v; });
      camp("#at-fu-dist", 1, 1000, v => { p.distanta = v; });
      $("#at-fu-lego").onclick = () => { Object.assign(p, { diam: 24, lat: 3.5, canal: "v", latCanal: 2.6, spite: "stift", gaura: "x" }); editor(); schimbat(); };
      $("#at-fu-fa-pereche").onclick = adaugaPerecheFulii;
    } else if (t === "conica") {
      // roata conică (ADR 0280): dinții ei și ai perechii (unghiul conului), modulul, gaura, butucul; montajul pe grilă
      const p = stare.conica, a = Lego.conicaMontaj(p);
      e.innerHTML = `<h2>Roată conică</h2>
        <p class="mic">Roată cu dinții pe un con, pentru o pereche la 90°: axele se întâlnesc în vârful comun al conurilor, iar dinții se subțiază spre el. Unghiul conului vine din raportul celor două roți, deci fiecare se face pentru perechea ei. Modulul 1 e cel LEGO; jocul dintre dinți vine din calibrare, ca la roțile dințate. Se printează culcată pe fața din spate.</p>
        <div class="at-rand"><span class="mic">Repede:</span><button class="btn" type="button" id="at-co-lego20">Ca LEGO 20 (87407)</button><button class="btn" type="button" id="at-co-lego12">Ca LEGO 12</button></div>
        <div class="at-campuri">
          <label for="at-co-dinti">Dinți<input id="at-co-dinti" type="number" min="8" max="60" step="1" value="${p.dinti}"></label>
          <label for="at-co-pereche">Dinții perechii<input id="at-co-pereche" type="number" min="8" max="60" step="1" value="${p.pereche}"></label>
          <label for="at-co-modul">Modul<input id="at-co-modul" type="number" min="0.5" max="3" step="0.1" value="${p.modul}"></label>
        </div>
        <div class="at-rand"><span class="mic">Gaura:</span>${seg("at-co-gaura", [["x", "Pentru ax"], ["r", "Rotundă"], ["nu", "Fără"]], p.gaura)}</div>
        <div class="at-rand"><span class="mic">Butucul:</span>${seg("at-co-butuc", [["lung", "Lung (ca 87407)"], ["scurt", "Scurt"]], p.butuc)}</div>
        <p class="mic" id="at-co-montaj">${tr`Axele se întâlnesc în vârful conurilor. Fața din spate a acesteia e la ${fmt(a.fata)} mm de axa perechii, ${textGrila(a.fata)}; a perechii, la ${fmt(a.fataPereche)} mm de axa acesteia, ${textGrila(a.fataPereche)}.`}</p>
        <div class="at-rand"><button class="btn" type="button" id="at-co-fa-pereche">Fă perechea</button><span class="mic">${tr("pune în listă ambele roți, fiecare pentru cealaltă")}</span></div>`;
      const alege = (id: string, f2: (v: string) => void) => { $(id).onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-v]"); if (!b) return; f2(b.dataset.v!); editor(); schimbat(); }; };
      const camp = (id: string, a0: number, b0: number, f2: (v: number) => void) => { $(id).onchange = ev => { const v = +String((ev.target as HTMLInputElement).value).replace(",", "."); if (v >= a0 && v <= b0) { f2(v); editor(); schimbat(); } }; };
      alege("#at-co-gaura", v => { p.gaura = v; });
      alege("#at-co-butuc", v => { p.butuc = v; });
      camp("#at-co-dinti", 8, 60, v => { p.dinti = Math.round(v); });
      camp("#at-co-pereche", 8, 60, v => { p.pereche = Math.round(v); });
      camp("#at-co-modul", 0.5, 3, v => { p.modul = Math.round(v * 10) / 10; });
      $("#at-co-lego20").onclick = () => { Object.assign(p, { dinti: 20, pereche: 20, modul: 1, gaura: "r", butuc: "lung" }); editor(); schimbat(); };
      $("#at-co-lego12").onclick = () => { Object.assign(p, { dinti: 12, pereche: 12, modul: 1, gaura: "x", butuc: "scurt" }); editor(); schimbat(); };
      $("#at-co-fa-pereche").onclick = adaugaPerecheConice;
    } else if (t === "coroana") {
      // roata coroană (ADR 0280): dinții ei și ai pinionului (o roată dreaptă, care îi taie dinții), modulul, gaura, butucul;
      // unde stă pinionul
      const p = stare.coroana;
      e.innerHTML = `<h2>Roată coroană</h2>
        <p class="mic">Roată cu dinții pe fața de sus, pentru o roată dințată dreaptă (pinionul) culcată peste ea, cu axul la 90°: axele se întâlnesc. Dinții coroanei sunt tăiați chiar de pinionul ales, deci fiecare coroană se face pentru pinionul ei. Modulul 1 e cel LEGO; jocul dintre dinți vine din calibrare, ca la roțile dințate. Se printează culcată pe fața de jos.</p>
        <div class="at-rand"><span class="mic">Repede:</span><button class="btn" type="button" id="at-cr-lego">Ca LEGO 24 (3650)</button></div>
        <div class="at-campuri">
          <label for="at-cr-dinti">Dinți<input id="at-cr-dinti" type="number" min="12" max="80" step="1" value="${p.dinti}"></label>
          <label for="at-cr-pinion">Dinții pinionului<input id="at-cr-pinion" type="number" min="8" max="40" step="1" value="${p.pinion}"></label>
          <label for="at-cr-modul">Modul<input id="at-cr-modul" type="number" min="0.5" max="3" step="0.1" value="${p.modul}"></label>
        </div>
        <div class="at-rand"><span class="mic">Pinionul:</span>${seg("at-cr-repede", [8, 16, 24].map((z): [string, string] => [String(z), String(z)]), String(p.pinion))}</div>
        <div class="at-rand"><span class="mic">Gaura:</span>${seg("at-cr-gaura", [["x", "Pentru ax"], ["r", "Rotundă"], ["nu", "Fără"]], p.gaura)}</div>
        <div class="at-rand"><span class="mic">Butucul:</span>${seg("at-cr-butuc", [["lung", "Lung (ca 3650)"], ["scurt", "Scurt"]], p.butuc)}</div>
        <p class="mic" id="at-cr-montaj">${textCoroana(p)}</p>
        <div class="at-rand"><button class="btn" type="button" id="at-cr-fa-pereche">Fă perechea</button><span class="mic">${tr("pune în listă coroana și pinionul ei")}</span></div>`;
      const alege = (id: string, f2: (v: string) => void) => { $(id).onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-v]"); if (!b) return; f2(b.dataset.v!); editor(); schimbat(); }; };
      const camp = (id: string, a0: number, b0: number, f2: (v: number) => void) => { $(id).onchange = ev => { const v = +String((ev.target as HTMLInputElement).value).replace(",", "."); if (v >= a0 && v <= b0) { f2(v); editor(); schimbat(); } }; };
      alege("#at-cr-repede", v => { p.pinion = +v; });
      alege("#at-cr-gaura", v => { p.gaura = v; });
      alege("#at-cr-butuc", v => { p.butuc = v; });
      camp("#at-cr-dinti", 12, 80, v => { p.dinti = Math.round(v); });
      camp("#at-cr-pinion", 8, 40, v => { p.pinion = Math.round(v); });
      camp("#at-cr-modul", 0.5, 3, v => { p.modul = Math.round(v * 10) / 10; });
      $("#at-cr-lego").onclick = () => { Object.assign(p, { dinti: 24, pinion: 8, modul: 1, gaura: "x", butuc: "lung" }); editor(); schimbat(); };
      $("#at-cr-fa-pereche").onclick = adaugaPerecheCoroana;
    } else if (t === "conicaDubla") {
      // conica dublă (ADR 0280): dinții (și repede: 12, 20, 28, 36), modulul, gaura; perechea (a editorului): axele, paralele și
      // la 90°
      const p = stare.conicaDubla;
      e.innerHTML = `<h2>Conică dublă</h2>
        <p class="mic">Roată dințată cu dinții teșiți spre ambele fețe, ca la LEGO: se prinde cu alta pe axe paralele, ca roțile dințate, și la 90°, cu axele întâlnite, ca două roți conice. Perechile LEGO (12, 20, 28, 36 de dinți) se prind la 90° pe grilă; o roată de sub 12 dinți cu una mult mai mare se prinde strâns. E lată de 8 mm la modulul 1; jocul dintre dinți vine din calibrare. Se printează culcată pe o față: dinții de jos sunt teșiți în consolă, la vreo 45°.</p>
        <div class="at-campuri">
          <label for="at-cd-dinti">Dinți<input id="at-cd-dinti" type="number" min="8" max="60" step="1" value="${p.dinti}"></label>
          <label for="at-cd-modul">Modul<input id="at-cd-modul" type="number" min="0.5" max="3" step="0.1" value="${p.modul}"></label>
          <label for="at-cd-pereche">Dinții perechii<input id="at-cd-pereche" type="number" min="8" max="60" step="1" value="${p.pereche}"></label>
        </div>
        <div class="at-rand"><span class="mic">Repede:</span>${seg("at-cd-repede", [12, 20, 28, 36].map((z): [string, string] => [String(z), String(z)]), String(p.dinti))}</div>
        <div class="at-rand"><span class="mic">Gaura:</span>${seg("at-cd-gaura", [["x", "Pentru ax"], ["r", "Rotundă"], ["nu", "Fără"]], p.gaura)}</div>
        <p class="mic" id="at-cd-montaj">${textDubla(p, p.pereche)}</p>
        <div class="at-rand"><button class="btn" type="button" id="at-cd-fa-pereche">Fă perechea</button><span class="mic">${tr("pune în listă ambele conice duble")}</span></div>`;
      const alege = (id: string, f2: (v: string) => void) => { $(id).onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-v]"); if (!b) return; f2(b.dataset.v!); editor(); schimbat(); }; };
      const camp = (id: string, a0: number, b0: number, f2: (v: number) => void) => { $(id).onchange = ev => { const v = +String((ev.target as HTMLInputElement).value).replace(",", "."); if (v >= a0 && v <= b0) { f2(v); editor(); schimbat(); } }; };
      alege("#at-cd-repede", v => { p.dinti = +v; });
      alege("#at-cd-gaura", v => { p.gaura = v; });
      camp("#at-cd-dinti", 8, 60, v => { p.dinti = Math.round(v); });
      camp("#at-cd-modul", 0.5, 3, v => { p.modul = Math.round(v * 10) / 10; });
      // perechea e doar a editorului: schimbă textul montajului, nu piesa
      $("#at-cd-pereche").onchange = ev => { const v = Math.round(+(ev.target as HTMLInputElement).value); if (v >= 8 && v <= 60) { p.pereche = v; editor(); } };
      $("#at-cd-fa-pereche").onclick = adaugaPerecheDuble;
    } else if (t === "senila") {
      // șenila (ADR 0280): zala sau pinionul; montajul pe două pinioane (al editorului): câte zale, cât joc; „Fă șenila”
      const p = stare.senila, zala = p.piesa !== "pinion";
      e.innerHTML = `<h2>Șenilă</h2>
        <p class="mic">Șenilă ca LEGO 57518 (zale late de 38,4 mm, cu pasul de 12 mm), pe pinioane ca 57519 (10 dinți) și 42529 (14). Zalele se leagă una de alta: clema uneia se prinde pe bolțul celei de dinainte, cu strângerea din calibrare, ca la clemă și bară; pinionul ia bolțurile în scobituri, cu jocul roților dințate. Se pot amesteca cu zalele și pinioanele LEGO. Zala se printează culcată pe fața de rulare, pinionul pe disc.</p>
        <div class="at-rand"><span class="mic">Piesa:</span>${seg("at-sn-piesa", [["zala", "Zala"], ["pinion", "Pinionul"]], zala ? "zala" : "pinion")}</div>
        ${zala ? `<div class="at-rand"><span class="mic">Găurile de știft:</span>${seg("at-sn-gauri", [["da", "Da"], ["nu", "Nu"]], p.gauriStift === "nu" ? "nu" : "da")}</div>`
          : `<div class="at-rand"><span class="mic">Gaura:</span>${seg("at-sn-gaura", [["x", "Pentru ax"], ["r", "Rotundă"], ["nu", "Fără"]], p.gaura)}</div>`}
        <div class="at-campuri">
          <label for="at-sn-dinti">Dinții pinionului<input id="at-sn-dinti" type="number" min="6" max="40" step="1" value="${p.dinti}"></label>
          <label for="at-sn-pereche">Celălalt pinion<input id="at-sn-pereche" type="number" min="6" max="40" step="1" value="${p.pereche}"></label>
          <label for="at-sn-distanta">Între axe (știfturi)<input id="at-sn-distanta" type="number" min="2" max="60" step="1" value="${p.distanta}"></label>
        </div>
        <div class="at-rand"><span class="mic">Repede:</span>${seg("at-sn-repede", [["10", "Ca LEGO 57519 (10)"], ["14", "Ca LEGO 42529 (14)"]], String(p.dinti))}</div>
        <p class="mic" id="at-sn-montaj">${textSenila(p)}</p>
        <div class="at-rand"><button class="btn" type="button" id="at-sn-fa">Fă șenila</button><span class="mic">${tr("pune în listă zalele și cele două pinioane")}</span></div>`;
      const alege = (id: string, f2: (v: string) => void) => { if (!$(id)) return; $(id).onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-v]"); if (!b) return; f2(b.dataset.v!); editor(); schimbat(); }; };
      alege("#at-sn-piesa", v => { p.piesa = v; });
      alege("#at-sn-gauri", v => { p.gauriStift = v; });
      alege("#at-sn-gaura", v => { p.gaura = v; });
      alege("#at-sn-repede", v => { p.dinti = +v; });
      $("#at-sn-dinti").onchange = ev => { const v = Math.round(+(ev.target as HTMLInputElement).value); if (v >= 6 && v <= 40) { p.dinti = v; editor(); schimbat(); } };
      // celălalt pinion și distanța dintre axe sunt ale editorului: schimbă montajul, nu piesa
      $("#at-sn-pereche").onchange = ev => { const v = Math.round(+(ev.target as HTMLInputElement).value); if (v >= 6 && v <= 40) { p.pereche = v; editor(); } };
      $("#at-sn-distanta").onchange = ev => { const v = Math.round(+(ev.target as HTMLInputElement).value); if (v >= 2 && v <= 60) { p.distanta = v; editor(); } };
      $("#at-sn-fa").onclick = adaugaSenila;
    } else if (t === "elice") {
      // elicea (ADR 0282): paletele, diametrul, pasul, lățimea, forma, paleta (răsucită sau plată, ca LEGO), profilul, sensul,
      // gaura și conul; „Ca LEGO” pune cotele măsurate în LDraw; „Fă perechea” pune în listă ambele sensuri
      const p = stare.elice, lego = Object.keys(ELICE_LEGO).find(k => Object.entries(ELICE_LEGO[k]!).every(([c, v]) => (p as Record<string, unknown>)[c] === v)) ?? "";
      e.innerHTML = `<h2>Elice</h2>
        <p class="mic">Elice pentru motoarele LEGO, pe un butuc ca la LEGO (Ø8, înalt cât un știft), cu gaura din calibrare. Se tipărește fără suport: butucul și muchia de jos a fiecărei palete stau pe masă.</p>
        <div class="at-rand"><span class="mic">Repede:</span>${seg("at-el-repede", [["6041", "Ca LEGO 6041"], ["92842", "Ca LEGO 92842"], ["15790", "Ca LEGO 15790"]], lego)}</div>
        <div class="at-campuri">
          <label for="at-el-palete">Paletele<input id="at-el-palete" type="number" min="2" max="8" step="1" value="${p.palete}"></label>
          <label for="at-el-diam">Diametrul (mm)<input id="at-el-diam" type="number" min="20" max="200" step="0.1" value="${p.diametru}"></label>
          <label for="at-el-pas">Pasul (× diametrul)<input id="at-el-pas" type="number" min="0.3" max="1.5" step="0.05" value="${p.pas}"></label>
          <label for="at-el-lat">Lățimea (% din rază)<input id="at-el-lat" type="number" min="15" max="60" step="1" value="${p.latime}"></label>
        </div>
        <div class="at-rand"><span class="mic">Forma:</span>${seg("at-el-forma", [["rot", "Rotunjită"], ["ingust", "Îngustată"], ["drept", "Dreaptă"]], p.forma)}</div>
        <div class="at-rand"><span class="mic">Paleta:</span>${seg("at-el-paleta", [["rasucita", "Răsucită"], ["plata", "Plată, ca LEGO"]], p.paleta)}</div>
        <div class="at-rand"><span class="mic">Profilul:</span>${seg("at-el-profil", [["placa", "Placă curbată"], ["aripa", "Profil de aripă"]], p.profil)}</div>
        <div class="at-rand"><span class="mic">Sensul:</span>${seg("at-el-sens", [["dreapta", "Dreapta"], ["stanga", "Stânga"]], p.sens)}</div>
        <div class="at-rand"><span class="mic">Gaura:</span>${seg("at-el-gaura", [["x", "Pentru ax"], ["r", "Rotundă"], ["b", "Pentru bară"], ["nu", "Fără"]], p.gaura)}</div>
        <div class="at-rand"><span class="mic">Conul:</span>${seg("at-el-con", [["nu", "Fără"], ["da", "Cu con"]], p.con)}</div>
        <p class="mic" id="at-el-info">${textElice(p)}</p>
        <div class="at-rand"><button class="btn" type="button" id="at-el-pereche">Fă perechea</button><span class="mic">${tr("pune în listă aceeași elice în ambele sensuri, pentru două motoare")}</span></div>`;
      const alege = (id: string, f2: (v: string) => void) => { if (!$(id)) return; $(id).onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-v]"); if (!b) return; f2(b.dataset.v!); editor(); schimbat(); }; };
      alege("#at-el-repede", v => { Object.assign(p, ELICE_LEGO[v]); });
      alege("#at-el-forma", v => { p.forma = v; });
      alege("#at-el-paleta", v => { p.paleta = v; });
      alege("#at-el-profil", v => { p.profil = v; });
      alege("#at-el-sens", v => { p.sens = v; });
      alege("#at-el-gaura", v => { p.gaura = v; });
      alege("#at-el-con", v => { p.con = v; });
      // câmpurile: doar valorile din plajă (altfel, ca la celelalte piese, rămâne ce era)
      const camp = (id: string, zec: number, a: number, b: number, f2: (v: number) => void) => {
        $(id).onchange = ev => { const v = Math.round(+(ev.target as HTMLInputElement).value * 10 ** zec) / 10 ** zec; if (v >= a && v <= b) { f2(v); editor(); schimbat(); } };
      };
      camp("#at-el-palete", 0, 2, 8, v => { p.palete = v; });
      camp("#at-el-diam", 1, 20, 200, v => { p.diametru = v; });
      camp("#at-el-pas", 2, 0.3, 1.5, v => { p.pas = v; });
      camp("#at-el-lat", 0, 15, 60, v => { p.latime = v; });
      $("#at-el-pereche").onclick = adaugaPerecheElice;
    } else if (t === "eliceBarca") {
      // elicea de barcă (ADR 0282, 3.Tr): paletele, diametrul (și repede, pe grila de știfturi), pasul, lățimea, înclinarea
      // înapoi, înclinarea spre pupa (3.Tt), sensul, gaura și capacul; „Fă perechea” pune în listă ambele sensuri (două
      // motoare, care se rotesc invers)
      const p = stare.eliceBarca;
      e.innerHTML = `<h2>Elice de barcă</h2>
        <p class="mic">Elice pentru bărcile cu motoare LEGO: palete late, înclinate înapoi, cu pasul la fel de la butuc la vârf, pe un butuc cu gaura din calibrare. Se tipărește cu partea dinspre barcă pe masă, fără suport (cu paletele înclinate spre pupa, cu suport sub ele); axul intră de jos, iar capacul, dacă îl pui, rămâne spre pupa.</p>
        <div class="at-rand"><span class="mic">Repede:</span>${seg("at-eb-repede", [["24", "Ø24"], ["32", "Ø32"], ["40", "Ø40"], ["56", "Ø56"]], String(p.diametru))}<span class="mic">${tr("3, 4, 5 și 7 știfturi")}</span></div>
        <div class="at-campuri">
          <label for="at-eb-palete">Paletele<input id="at-eb-palete" type="number" min="3" max="5" step="1" value="${p.palete}"></label>
          <label for="at-eb-diam">Diametrul (mm)<input id="at-eb-diam" type="number" min="20" max="120" step="0.1" value="${p.diametru}"></label>
          <label for="at-eb-pas">Pasul (× diametrul)<input id="at-eb-pas" type="number" min="0.5" max="1.6" step="0.05" value="${p.pas}"></label>
          <label for="at-eb-lat">Lățimea (% din rază)<input id="at-eb-lat" type="number" min="40" max="150" step="1" value="${p.latime}"></label>
          <label for="at-eb-inc">Înclinarea înapoi (°)<input id="at-eb-inc" type="number" min="0" max="40" step="1" value="${p.inclinare}"></label>
          <label for="at-eb-pupa">Înclinarea spre pupa (°)<input id="at-eb-pupa" type="number" min="0" max="15" step="1" value="${p.pupa}"></label>
        </div>
        <div class="at-rand"><span class="mic">Sensul:</span>${seg("at-eb-sens", [["dreapta", "Dreapta"], ["stanga", "Stânga"]], p.sens)}</div>
        <div class="at-rand"><span class="mic">Gaura:</span>${seg("at-eb-gaura", [["x", "Pentru ax"], ["r", "Rotundă"], ["b", "Pentru bară"], ["nu", "Fără"]], p.gaura)}</div>
        <div class="at-rand"><span class="mic">Capacul:</span>${seg("at-eb-capac", [["nu", "Fără"], ["da", "Cu capac"]], p.capac)}</div>
        <p class="mic" id="at-eb-info">${textBarca(p)}</p>
        <div class="at-rand"><button class="btn" type="button" id="at-eb-pereche">Fă perechea</button><span class="mic">${tr("pune în listă aceeași elice în ambele sensuri, pentru două motoare")}</span></div>`;
      const alege = (id: string, f2: (v: string) => void) => { if (!$(id)) return; $(id).onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-v]"); if (!b) return; f2(b.dataset.v!); editor(); schimbat(); }; };
      alege("#at-eb-repede", v => { p.diametru = +v; });
      alege("#at-eb-sens", v => { p.sens = v; });
      alege("#at-eb-gaura", v => { p.gaura = v; });
      alege("#at-eb-capac", v => { p.capac = v; });
      // câmpurile: doar valorile din plajă (altfel, ca la celelalte piese, rămâne ce era)
      const camp = (id: string, zec: number, a: number, b: number, f2: (v: number) => void) => {
        $(id).onchange = ev => { const v = Math.round(+(ev.target as HTMLInputElement).value * 10 ** zec) / 10 ** zec; if (v >= a && v <= b) { f2(v); editor(); schimbat(); } };
      };
      camp("#at-eb-palete", 0, 3, 5, v => { p.palete = v; });
      camp("#at-eb-diam", 1, 20, 120, v => { p.diametru = v; });
      camp("#at-eb-pas", 2, 0.5, 1.6, v => { p.pas = v; });
      camp("#at-eb-lat", 0, 40, 150, v => { p.latime = v; });
      camp("#at-eb-inc", 0, 0, 40, v => { p.inclinare = v; });
      camp("#at-eb-pupa", 0, 0, 15, v => { p.pupa = v; });
      $("#at-eb-pereche").onclick = adaugaPerecheElice;
    } else if (t === "ventilator") {
      // ventilatorul cu carcasă (ADR 0282, 3.Ts): rotorul sau carcasa; paletele, diametrul (și repede, pe grila de știfturi),
      // jocul, pasul și lățimea sunt ale amândurora (carcasa crește cu paletele); sensul, gaura și inelul, ale rotorului;
      // urechile, ale carcasei; „Fă ventilatorul” pune în listă rotorul și carcasa
      const p = stare.ventilator, rotor = p.piesa !== "carcasa";
      e.innerHTML = `<h2>Ventilator cu carcasă</h2>
        <p class="mic">Un ventilator în tub, pentru motoarele LEGO: rotorul, cu paletele răsucite, pe un butuc cu gaura din calibrare, și carcasa din jurul lui, cu urechi pentru grinzi. Găurile urechilor sunt pe grila axului: pe o grindă prinsă de urechi cu știfturi, axul trece prin gaura din mijloc, iar rotorul stă în mijlocul carcasei. Amândouă se tipăresc fără suport: rotorul cu muchia de jos a paletelor pe masă, carcasa în picioare.</p>
        <div class="at-rand"><span class="mic">Piesa:</span>${seg("at-ve-piesa", [["rotor", "Rotorul"], ["carcasa", "Carcasa"]], rotor ? "rotor" : "carcasa")}</div>
        <div class="at-rand"><span class="mic">Repede:</span>${seg("at-ve-repede", [["24", "Ø24"], ["32", "Ø32"], ["40", "Ø40"], ["48", "Ø48"]], String(p.diametru))}<span class="mic">${tr("3, 4, 5 și 6 știfturi")}</span></div>
        <div class="at-campuri">
          <label for="at-ve-palete">Paletele<input id="at-ve-palete" type="number" min="3" max="12" step="1" value="${p.palete}"></label>
          <label for="at-ve-diam">Diametrul în carcasă (mm)<input id="at-ve-diam" type="number" min="24" max="120" step="0.1" value="${p.diametru}"></label>
          <label for="at-ve-joc">Jocul la vârf (mm)<input id="at-ve-joc" type="number" min="0.3" max="2" step="0.1" value="${p.joc}"></label>
          <label for="at-ve-pas">Pasul (× diametrul)<input id="at-ve-pas" type="number" min="0.3" max="1.5" step="0.05" value="${p.pas}"></label>
          <label for="at-ve-lat">Lățimea (% din rază)<input id="at-ve-lat" type="number" min="15" max="60" step="1" value="${p.latime}"></label>
        </div>
        ${rotor ? `<div class="at-rand"><span class="mic">Sensul:</span>${seg("at-ve-sens", [["dreapta", "Dreapta"], ["stanga", "Stânga"]], p.sens)}</div>
        <div class="at-rand"><span class="mic">Gaura:</span>${seg("at-ve-gaura", [["x", "Pentru ax"], ["r", "Rotundă"], ["b", "Pentru bară"], ["nu", "Fără"]], p.gaura)}</div>
        <div class="at-rand"><span class="mic">Inelul:</span>${seg("at-ve-inel", [["nu", "Fără"], ["da", "Cu inel"]], p.inel)}</div>`
          : `<div class="at-rand"><span class="mic">Urechile:</span>${seg("at-ve-urechi", [["2", "Două"], ["4", "Patru"]], String(p.urechi))}</div>`}
        <p class="mic" id="at-ve-info">${textVentilator(p)}</p>
        <div class="at-rand"><button class="btn" type="button" id="at-ve-fa">Fă ventilatorul</button><span class="mic">${tr("pune în listă rotorul și carcasa")}</span></div>`;
      const alege = (id: string, f2: (v: string) => void) => { if (!$(id)) return; $(id).onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-v]"); if (!b) return; f2(b.dataset.v!); editor(); schimbat(); }; };
      alege("#at-ve-piesa", v => { p.piesa = v; });
      alege("#at-ve-repede", v => { p.diametru = +v; });
      alege("#at-ve-sens", v => { p.sens = v; });
      alege("#at-ve-gaura", v => { p.gaura = v; });
      alege("#at-ve-inel", v => { p.inel = v; });
      alege("#at-ve-urechi", v => { p.urechi = +v; });
      // câmpurile: doar valorile din plajă (altfel, ca la celelalte piese, rămâne ce era)
      const camp = (id: string, zec: number, a: number, b: number, f2: (v: number) => void) => {
        $(id).onchange = ev => { const v = Math.round(+(ev.target as HTMLInputElement).value * 10 ** zec) / 10 ** zec; if (v >= a && v <= b) { f2(v); editor(); schimbat(); } };
      };
      camp("#at-ve-palete", 0, 3, 12, v => { p.palete = v; });
      camp("#at-ve-diam", 1, 24, 120, v => { p.diametru = v; });
      camp("#at-ve-joc", 1, 0.3, 2, v => { p.joc = v; });
      camp("#at-ve-pas", 2, 0.3, 1.5, v => { p.pas = v; });
      camp("#at-ve-lat", 0, 15, 60, v => { p.latime = v; });
      $("#at-ve-fa").onclick = adaugaVentilator;
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
          <li><b>Înălțimea:</b> cinci plăci 2×2 cu fund plin (1–5 cubulețe pe latura din spate), cu știfturi de 1,7 · 1,8 · 1,9 · 2,0 · 2,1 mm și locașurile cu 0,2 mm mai adânci. Pune o cărămidă LEGO peste fiecare placă, apoi apasă placa pe o cărămidă LEGO. Alege placa la care amândouă se prind ca un LEGO adevărat și scrie înălțimea ei mai jos, la „Înălțimea știftului”.</li>
          <li><b>Roțile dințate:</b> cinci roți de 16 dinți (1–5 cubulețe pe fața de sus), cu jocul dintre dinți de la 0,05 la 0,25 mm. Pune fiecare pe un ax, într-o grindă LEGO, lângă o roată LEGO de 16 dinți (axele la două găuri, 16 mm). Alege roata care se învârte ușor, fără să se blocheze și fără joc mare.</li>
          <li><b>Jantele:</b> cinci jante LEGO, cu scaunul de la Ø16,6 la Ø17,0 mm (1–5 cubulețe pe fața de sus). Pune pe fiecare o anvelopă LEGO 30,4 × 14. Alege janta pe care anvelopa intră apăsând și stă fără să alunece.</li>
          <li>Scrie cele opt numere și înălțimea mai jos. Dacă cea mai bună e 1 sau 5, încearcă și 0 sau 6 (la înălțime, cu − / +). Dacă ai mai multe imprimante, fă întâi câte o imprimantă (mai jos, la „Imprimanta și potrivirea pieselor”): fiecare își ține numerele ei.</li>
        </ol>
        <div class="at-campuri" id="at-calib-campuri"></div>`;
      campuriVariante($("#at-calib-campuri"));
    }
  }
  const seg = (id: string, opt: readonly (readonly [string | number, string])[], cur: string | number) => `<div class="segment" id="${id}">${opt.map(([v, x]) => `<button type="button" data-v="${v}" aria-pressed="${String(cur) === v}">${x}</button>`).join("")}</div>`;
  function alegePiesa(k: string) {
    if (k === "placaTechnic") {
      // placa Technic: o placa 2 x 6 cu gauri pe mijloc, in editorul de caramizi (din aceeasi familie)
      const c = stare.caramida;
      Object.assign(c, { celule: [0, 1, 2, 3, 4, 5].flatMap(i => [[i, 0], [i, 1]]), placi: 1, stifturi: true, fund: "tuburi", gauri: [1, 2, 3, 4, 5].map(a => [a, 1, "r"]), mod: "gauri", laterale: [], goale: false });
      c.cols = Math.max(c.cols, 8); c.rows = Math.max(c.rows, 4);
      alegeTip("caramida");
      toast("Placă Technic 2×6, cu găuri pe mijloc (în locul formei de la Cărămidă / placă). Le schimbi din „Găuri”.");
      return;
    }
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
      ["varianta_bara", "Varianta clemei / barei"], ["varianta_cupa", "Varianta cupei"], ["varianta_dinti", "Varianta roților dințate"], ["varianta_janta", "Varianta jantei"]]
      .map(([k, e]) => `<label for="${loc.id}-${k}">${e}<input id="${loc.id}-${k}" data-setare="${k}" type="number" min="-3" max="9" step="1" value="${(setari as Valori)[k!]}"></label>`).join("")
      + campuriInaltimi(loc.id);
    legaInaltimi(loc);
  }
  // inaltimile (ADR 0168): la zecimi, cu − / +; locasul dupa stift (+ 0,2) sau al lui; inapoi la implicite
  function campuriInaltimi(id: string): string {
    const h = Lego.inaltimi(setari), u = setari.locas_urmeaza !== false;
    const camp = (k: "stift_h" | "locas_h", e: string, min: number, max: number, val: number, oprit: boolean) =>
      `<span class="at-inaltime"><label for="${id}-${k}">${e}</label><span class="at-pas">`
      + `<button type="button" class="btn" data-pas="${k}" data-d="-1" aria-label="Cu 0,1 mm mai puțin"${oprit ? " disabled" : ""}>−</button>`
      + `<input id="${id}-${k}" data-setare="${k}" type="number" inputmode="decimal" min="${min}" max="${max}" step="0.1" value="${val}"${oprit ? " disabled" : ""}>`
      + `<button type="button" class="btn" data-pas="${k}" data-d="1" aria-label="Cu 0,1 mm mai mult"${oprit ? " disabled" : ""}>+</button></span></span>`;
    return `<fieldset class="at-inaltimi" data-inaltimi-pentru="${id}"><legend>Înălțimile (mm, la zecimi)</legend>`
      + camp("stift_h", "Înălțimea știftului", 1, 3, h.stift_h, false) + `<span class="mic">Știftul LEGO: 1,7 mm.</span>`
      + camp("locas_h", "Adâncimea locașului", 1, 4, h.locas_h, u)
      + `<label class="at-bifa"><input type="checkbox" data-bifa="locas_urmeaza"${u ? " checked" : ""}>Urmează știftul (+ 0,2)</label>`
      + `<button type="button" class="btn" data-inaltimi="implicite">Înapoi la implicite</button></fieldset>`;
  }
  function legaInaltimi(loc: HTMLElement) {
    const f = loc.querySelector<HTMLElement>(".at-inaltimi");
    if (!f) return;
    f.onclick = ev => {
      const b = (ev.target as Element).closest<HTMLButtonElement>("button");
      if (!b || b.disabled) return;
      if (b.dataset.inaltimi === "implicite") {
        setari.stift_h = Lego.IMPLICIT.stift_h; setari.locas_h = Lego.IMPLICIT.locas_h; setari.locas_urmeaza = true;
        inaltimiSchimbate(); return;
      }
      const k = b.dataset.pas as "stift_h" | "locas_h" | undefined;
      if (k !== "stift_h" && k !== "locas_h") return;
      setari[k] = Lego.inaltimi(setari)[k] + Number(b.dataset.d) / 10;
      inaltimiSchimbate();
    };
  }
  // dupa o schimbare a inaltimilor: prin motor (zecimi, margini, legatura), apoi in toate campurile, in profil si in piese
  function inaltimiSchimbate() {
    puneInaltimi(setari as unknown as Valori);
    const u = setari.locas_urmeaza !== false;
    document.querySelectorAll<HTMLInputElement>('#mod-3d [data-setare="stift_h"]').forEach(x => { x.value = String(setari.stift_h); });
    document.querySelectorAll<HTMLInputElement>('#mod-3d [data-setare="locas_h"]').forEach(x => { x.value = String(setari.locas_h); x.disabled = u; });
    document.querySelectorAll<HTMLButtonElement>('#mod-3d [data-pas="locas_h"]').forEach(x => { x.disabled = u; });
    document.querySelectorAll<HTMLInputElement>('#mod-3d [data-bifa="locas_urmeaza"]').forEach(x => { x.checked = u; });
    dupaSchimbare();
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
    if (v3.puncte) v3.puncte.visible = false;
    if (v3.avert) v3.avert.visible = false;
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
  // din motor, pus cu pivotul in mijlocul amprentei lui de pe grila de stifturi si rotit in jurul pivotului. Amprenta si
  // pivotul le da motorul (`Lego.asezareModel`, ADR 0283): la piesele rotunde, pivotul e axul, pe centrul unui stift.
  // O piesa poate fi si prinsa de alta (`prins`) sau libera (`liber`): transformarea fiecareia o socoteste motorul
  // (`Lego.rezolvaModel`, ADR 0284, felia 3.Cf), iar scena pune plasa cu ea.
  let model: InModel[] = [], vedere = "piesa", alesM: string | null = null;
  // Construcțiile (ADR 0284, felia 3.Ch): `model` sunt piesele construcției alese (`activa`); celelalte își țin piesele lor.
  let constructii: Constructie[] = [], activa = "";
  /** Numele unei construcții, cum se vede: al omului, neschimbat; fără nume, „Construcția <nr>”, în limba paginii. */
  const numeC = (c: Constructie) => c.nume || tr`Construcția ${c.nr}`;
  /** Construcția aleasă, cu piesele de acum (`model`); fără nicio construcție, una, fără nume, cu ele. */
  function tineConstructia(): Constructie {
    if (!constructii.length) constructii.push({ id: idNou(), nume: "", nr: 1, model });
    const c = constructii.find(x => x.id === activa) ?? constructii[0]!;
    activa = c.id; c.model = model;
    return c;
  }
  /** Trece pe altă construcție: piesa aleasă, ținta și înlocuirea din editor sunt ale celei de dinainte. */
  function treciPe(c: Constructie) {
    activa = c.id; model = c.model; alegeM(null); inlocuieste = null;
    dupaModel();
  }
  function alegeConstructie(id: string) {
    const c = constructii.find(x => x.id === id);
    if (!c) return;
    tineConstructia(); treciPe(c);
  }
  /** O construcție nouă, goală, fără nume (cu cel mai mic număr liber), la capătul listei; câmpul numelui e gata de scris. */
  function constructieNoua() {
    tineConstructia();
    const c: Constructie = { id: idNou(), nume: "", nr: Lego.nrLiber(constructii.map(x => x.nr)), model: [] };
    constructii.push(c); treciPe(c);
    $<HTMLInputElement>("#at-c-nume").focus();
  }
  /** Copia construcției alese, după ea: aceleași piese, cu id-urile lor (deci și legăturile dintre ele); cu nume, numele
   *  următor („Macara 2”); fără nume, tot fără nume, cu numărul ei. */
  function dubleazaConstructia() {
    const a = tineConstructia();
    const c: Constructie = { id: idNou(), nume: a.nume ? Lego.numeLiber(constructii.map(numeC), a.nume) : "", nr: Lego.nrLiber(constructii.map(x => x.nr)), model: JSON.parse(JSON.stringify(a.model)) };
    constructii.splice(constructii.indexOf(a) + 1, 0, c); treciPe(c);
  }
  /** Șterge construcția aleasă (după întrebare); alegerea trece pe cea care îi ia locul în listă, sau pe cea de dinainte. */
  function stergeConstructia() {
    if (constructii.length < 2) return;
    const i = constructii.indexOf(tineConstructia());
    constructii.splice(i, 1);
    treciPe(constructii[Math.min(i, constructii.length - 1)]!);
  }
  /** Numele scris de om, curățat; luat de altă construcție, cu numărul următor; gol, construcția rămâne fără nume. */
  function redenumesteConstructia(scris: string) {
    const a = tineConstructia(), v = Lego.curataNume(scris);
    a.nume = v ? Lego.numeLiber(constructii.filter(x => x !== a).map(numeC), v) : "";
    dupaModel();
  }
  // --- construcțiile gata (ADR 0284, 3.Ci): felul ales și valorile fiecăruia țin de fereastra deschisă (nu se țin minte)
  type ValoriGata = Record<string, number | string>;
  const gata: { fel: string; deschis: boolean; valori: Record<string, ValoriGata> } = { fel: "sasiu", deschis: false, valori: {
    sasiu: { lung: 8, lat: 6, roata: 30.4 }, angrenaje: { raport: "1:3" }, macara: { inalt: 4, brat: 9, unghi: 45 }, barca: { lung: 10, lat: 6, diametru: 32, palete: 3 } } };
  /** Câmpurile fiecărei construcții gata: [cheia, eticheta, minim, maxim] (numere întregi) sau [cheia, eticheta, alegerile];
   *  o alegere fără nume e un diametru, scris „Ø” și numărul, cu virgula limbii. */
  const CAMPURI_GATA: Record<string, readonly (readonly [string, string, number, number] | readonly [string, string, readonly (readonly [string, string])[]])[]> = {
    sasiu: [["lung", "Lungimea (știfturi)", 6, 16], ["lat", "Lățimea (știfturi)", 4, 10], ["roata", "Roțile", [["30.4", ""], ["43.2", ""], ["56", ""]]]],
    angrenaje: [["raport", "Raportul", [["1:1", "1 : 1"], ["1:3", "1 : 3"], ["1:5", "1 : 5"], ["1:9", "1 : 9"], ["1:15", "1 : 15"], ["1:25", "1 : 25"]]]],
    macara: [["inalt", "Stâlpul (cărămizi)", 2, 8], ["brat", "Brațul (găuri)", 5, 15], ["unghi", "Unghiul brațului (°)", 0, 80]],
    barca: [["lung", "Lungimea (știfturi)", 8, 16], ["lat", "Lățimea", [["4", "4 știfturi"], ["6", "6 știfturi"], ["8", "8 știfturi"]]], ["diametru", "Elicea (mm)", 24, 48], ["palete", "Palete", 3, 5]],
  };
  /** Construcția gata aleasă, din motor, cu valorile de acum. */
  function constructiaGata() {
    Lego.seteaza(paramMotor());
    return Lego.constructieGata(gata.fel, gata.valori[gata.fel]!);
  }
  /** Ce iese, pe hârtie: mărimile mecanismului, câte piese are și avertismentele motorului. */
  function infoGata(): string {
    const g = constructiaGata(), c = g.cote, n = g.piese.length;
    const piese = n % 100 === 0 || n % 100 >= 20 ? tr`${n} de piese` : tr`${n} piese`;
    const text = g.fel === "sasiu" ? tr`Între axe: ${fmt(c.ampatament!)} mm; între roțile de pe un ax: ${fmt(c.ecartament!)} mm.`
      : g.fel === "angrenaje" ? (c.raport === 1 ? tr("Axul de ieșire se rotește la fel de repede ca cel de intrare, în sens opus.")
        : tr`Axul de ieșire se rotește de ${c.raport} ori mai încet decât cel de intrare (${c.trepte === 1 ? tr("o treaptă") : tr("două trepte")}).`)
      : g.fel === "macara" ? tr`Pivotul, la ${fmt(c.pivot!)} mm de masă; vârful brațului, la ${fmt(c.varf!)} mm înălțime și ${fmt(c.raza!)} mm în față.`
      : tr`Axul elicei are ${c.axul} știfturi; elicea stă în spatele pupei.`;
    return `<p class="mic" id="at-cg-text">${text} ${piese}.</p>${g.avert.map(a => `<p class="avert" data-avert-gata>${a}</p>`).join("")}`;
  }
  /** Construcția gata, ca o construcție nouă, după cele de acum: piesele completate ca în editor, fiecare cu id-ul ei, iar
   *  legăturile dintre ele, după id; numele șablonului (cu numărul următor, dacă e luat). */
  function faConstructiaGata() {
    const g = constructiaGata();
    tineConstructia();
    const ids = g.piese.map(() => idNou());
    const piese: InModel[] = g.piese.map((p, i) => ({ id: ids[i]!, def: defCurenta(p.def.tip, { ...(STARE0 as unknown as Record<string, object>)[p.def.tip], ...p.def }), x: p.x, y: p.y, z: p.z, rot: p.rot, culoare: p.culoare,
      ...(p.prins ? { prins: { de: ids[p.prins.de]!, a: p.prins.a, b: p.prins.b, unghi: p.prins.unghi, alunec: p.prins.alunec } } : {}) }));
    const c: Constructie = { id: idNou(), nume: Lego.numeLiber(constructii.map(numeC), g.nume), nr: Lego.nrLiber(constructii.map(x => x.nr)), model: piese };
    constructii.push(c); treciPe(c);
    toast(tr`„${numeC(c)}” e în model.`);
  }
  /** Gramele unei piese, ținute minte după definiție și parametrii motorului (ca în lista de printat). */
  const grameTinute = new Map<string, number>();
  function grameDef(def: Def): number {
    const k = JSON.stringify([def, paramMotor()]);
    let g = grameTinute.get(k);
    if (g === undefined) {
      const c = corpSigur(def);
      g = c ? Lego.grame(c.tri) : 0;
      grameTinute.set(k, g);
      if (grameTinute.size > 200) grameTinute.delete(grameTinute.keys().next().value!);
    }
    return g;
  }
  /** Numele, scris de om, pus într-un text HTML: ca text, nu ca etichete. */
  const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
  /** Ținta piesei următoare: o prindere a piesei alese din model (aleasă cu un clic pe punctul ei sau pe numărul ei). */
  let tintaM: { id: string; k: number } | null = null;
  /** „Jumătăți de pas” (ADR 0284, 3.Cf-2): mutările merg câte o jumătate de știft și o jumătate de placă. E al vederii, nu al
   *  unei piese, și nu se ține minte de la o deschidere la alta. */
  let pasFin = false;
  /** Alege o piesă din model (sau niciuna); ținta e a piesei alese, deci pleacă odată cu ea. */
  const alegeM = (id: string | null) => { if (id !== alesM) tintaM = null; alesM = id; };
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
      const p = pieseDin(def)[0]!;
      // amprenta pe grila (in stifturi) si pivotul: mijlocul cutiei; mijlocul placii, la piesele cu o placa pe grila si ceva
      // ce iese din ea (stifturi laterale, clema, manerul, suportul, bila); axul, la piesele rotunde
      const a = Lego.asezareModel(def as DefMotor, { dim: p.dim, baza: p.baza || [0, 0, 0], ax: p.ax || null });
      c = { tri: p.tri, dim: p.dim, gw: a.gw, gd: a.gd, pivot: a.pivot, ax: a.ax, prinderi: p.prinderi ?? [], geom: null };
      corpuri.set(k, c);
      if (corpuri.size > 80) { const v = corpuri.keys().next().value; const x = corpuri.get(v!); if (x!.geom) x!.geom.dispose(); corpuri.delete(v!); }
    }
    return c;
  }
  const corpSigur = (def: Def): CorpModel | null => { try { return corpModel(def); } catch (e) { return null; } };
  /** Așezările pieselor din model, după id: transformarea și felul fiecăreia (pe grilă, prinsă, liberă). */
  function asezari(): Map<string, Asezat> {
    const piese = [];
    for (const m of model) {
      const c = corpSigur(m.def);
      if (c) piese.push({ id: m.id, grila: Lego.transfGrila(c, m.x, m.y, m.z, m.rot), prinderi: c.prinderi, prins: m.prins ?? null, liber: m.liber ?? null });
    }
    const r = Lego.rezolvaModel(piese);
    return new Map(piese.map((p, i) => [p.id, r[i]!]));
  }
  /** Ce spune verificarea despre o piesă din model: de cine e prinsă și în cine intră (id-urile lor) și dacă plutește. */
  type StareM = { prinsa: string[]; intra: string[]; pluteste: boolean };
  // ciocnirile judecate (motorul le ține minte după cele două piese și așezarea uneia față de cealaltă) și ultima verificare
  const ciocniri = new Map<string, boolean>();
  let verificat: { cheie: string; piese: Map<string, StareM>; bucati: number } | null = null;
  /** Verificarea modelului (ADR 0284, felia 3.Cg): pentru fiecare piesă, dacă e prinsă, dacă plutește sau dacă intră în alta.
   *  E un avertisment: nu schimbă nimic în model și nu se ține în el. Se reface doar când modelul s-a schimbat. */
  function verificare(A: Map<string, Asezat>) {
    const cheie = JSON.stringify([model, paramMotor()]);
    if (verificat && verificat.cheie === cheie) return verificat;
    const piese: { id: string; T: Transf; tri: readonly Tri[]; prinderi: readonly Prindere[]; cheie: string }[] = [];
    for (const m of model) {
      const c = corpSigur(m.def), a = A.get(m.id);
      if (c && a) piese.push({ id: m.id, T: a.T, tri: c.tri, prinderi: c.prinderi, cheie: JSON.stringify([m.def, paramMotor()]) });
    }
    if (ciocniri.size > 4000) ciocniri.clear();
    const v = Lego.verificaModel(piese, ciocniri), id = (k: number) => piese[k]!.id;
    verificat = { cheie, piese: new Map(piese.map((x, i) => [x.id, { prinsa: v.piese[i]!.prinsa.map(id), intra: v.piese[i]!.intra.map(id), pluteste: v.piese[i]!.pluteste }])), bucati: v.bucati };
    return verificat;
  }
  /** Semnul unei piese: „intra” (intră în alta), „pluteste” sau „”. Ciocnirea trece înaintea plutirii. */
  const semnM = (st: StareM | undefined) => (!st ? "" : st.intra.length ? "intra" : st.pluteste ? "pluteste" : "");
  /** Piesa rămâne unde e (cu transformarea T), fără legătură: pe grilă, dacă stă drept pe ea; altfel, liberă. */
  function lasaPeLoc(m: InModel, T: Transf) {
    const c = corpSigur(m.def), g = c && Lego.grilaDinTransf(c, T);
    delete m.prins; delete m.liber;
    if (g) { m.x = g.x; m.y = g.y; m.z = g.z; m.rot = g.rot; } else m.liber = { m: [...T.m], t: [T.t[0], T.t[1], T.t[2]] };
  }
  /** Scoate o piesă din model; piesele prinse de ea rămân unde erau. */
  function scoateM(id: string) {
    const A = asezari();
    for (const x of model) {
      if (!x.prins || x.prins.de !== id) continue;
      const a = A.get(x.id);
      if (a && a.fel === "prins") lasaPeLoc(x, a.T); else delete x.prins;
    }
    model = model.filter(x => x.id !== id);
    if (alesM === id) alegeM(null);
  }
  /** Numele unei prinderi în model: felul și numărul ei printre cele de același fel ale piesei („știft 8”). */
  const numeFelM = (fel: string, cate = 1) => fel === "capatAx" ? (cate === 1 ? tr("capăt de ax") : tr("capete de ax")) : NUME_PRINDERI[fel]!()[cate === 1 ? 0 : 1];
  const nrPrindere = (pr: readonly Prindere[], k: number) => pr.slice(0, k + 1).filter(p => p.fel === pr[k]!.fel).length;
  const numePrindere = (pr: readonly Prindere[], k: number) => `${numeFelM(pr[k]!.fel)} ${nrPrindere(pr, k)}`;
  /** Locurile de pe bază ale unei piese prinse: prinderile bazei pe care se potrivește prinderea ei, în ordinea bazei. */
  const locuriBaza = (baza: readonly Prindere[], b: Prindere) => baza.map((p, k) => (Lego.sePrind(p.fel, b.fel) ? k : -1)).filter(k => k >= 0);
  /** Ținta de acum: prinderea aleasă a piesei alese, cât piesa și prinderea mai există. */
  function tintaBuna(): { m: InModel; c: CorpModel; k: number; p: Prindere } | null {
    const t = tintaM;
    if (!t || t.id !== alesM) return null;
    const m = model.find(x => x.id === t.id), c = m ? corpSigur(m.def) : null, p = c ? c.prinderi[t.k] : undefined;
    return m && c && p ? { m, c, k: t.k, p } : null;
  }
  function alegeTinta(k: number) {
    tintaM = tintaM && tintaM.id === alesM && tintaM.k === k ? null : alesM ? { id: alesM, k } : null;
    editorModel(); arataModel(true); butonModel();
  }
  /** Știftul pe care stă axul unei piese rotunde din model (același la rotire și la două piese pe un ax); altfel, null. */
  const stiftAx = (m: InModel): [number, number] | null => {
    const c = corpSigur(m.def);
    if (!c || !c.ax) return null;
    const [px, py] = Lego.pivotModel(c, m.x, m.y, m.rot);
    return [Math.round(px / 8 - 0.5), Math.round(py / 8 - 0.5)];
  };
  const inaltimeM = (m: InModel): number => m.def.placi || (m.def.tip === "lateral" || m.def.tip === "caramidaTechnic" ? 3 : ["clema", "maner", "bila", "cupa"].includes(m.def.tip) ? 1
    : m.def.tip === "suport" && !m.def.invers ? 1 : Math.max(1, Math.ceil(corpModel(m.def).dim[2]! / 3.2 - 1e-6)));
  const materiale = new Map<string, Trei.Material>();
  function material(cul: string, ales: boolean) {
    const k = cul + (ales ? "*" : "");
    if (!materiale.has(k)) materiale.set(k, new v3.T.MeshStandardMaterial({ color: cul, roughness: 0.42, metalness: 0.02, emissive: ales ? 0x3a3a3a : 0x000000 }));
    return materiale.get(k);
  }
  /** Culoarea avertismentului din vedere: roșu, piesa intră în alta; galben, plutește. `contur`: materialul conturului (o
   *  coajă puțin mai mare decât piesa, văzută doar pe dinăuntru, deci doar în jurul ei); altfel, al vălului de peste piesă. */
  function materialAvert(semn: string, contur: boolean) {
    const k = (contur ? "!!" : "!") + semn, color = semn === "intra" ? 0xe5484d : 0xf5a524;
    if (!materiale.has(k)) materiale.set(k, contur ? new v3.T.MeshBasicMaterial({ color, side: v3.T.BackSide }) : new v3.T.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 }));
    return materiale.get(k);
  }
  /** Cât iese conturul unui avertisment în jurul piesei (mm). */
  const CONTUR = 0.7;
  function arataModel(pastreaza?: boolean) {
    if (!v3.ok) return;
    const T = v3.T;
    if (v3.mesh) v3.mesh.visible = false;
    if (!v3.grup) { v3.grup = new T.Group(); v3.scena.add(v3.grup); }
    v3.grup.visible = true;
    while (v3.grup.children.length) v3.grup.remove(v3.grup.children[0]!);
    if (!v3.avert) { v3.avert = new T.Group(); v3.scena.add(v3.avert); }
    v3.avert.visible = true;
    while (v3.avert.children.length) v3.avert.remove(v3.avert.children[0]!);
    const A = asezari(), V = verificare(A);
    for (const m of model) {
      const c = corpSigur(m.def), a = A.get(m.id);
      if (!c || !a) continue;
      if (!c.geom) c.geom = geomDin(c.tri);
      // plasa (mutata in origine) e dusa in lume cu transformarea piesei: rotatia pe randuri si mutarea
      const mesh = new T.Mesh(c.geom, material(m.culoare, m.id === alesM)!), { m: r, t } = a.T;
      mesh.applyMatrix4(new T.Matrix4().set(r[0]!, r[1]!, r[2]!, t[0], r[3]!, r[4]!, r[5]!, t[1], r[6]!, r[7]!, r[8]!, t[2], 0, 0, 0, 1));
      mesh.userData.id = m.id;
      v3.grup.add(mesh);
      // avertismentul verificarii (ADR 0284, 3.Cg): aceeasi plasa, inca o data, in culoarea lui
      const semn = semnM(V.piese.get(m.id));
      if (semn) {
        // un văl peste piesă (se vede oricare i-ar fi culoarea alături de contur)
        const val = new T.Mesh(c.geom, materialAvert(semn, false)!);
        val.applyMatrix4(new T.Matrix4().set(r[0]!, r[1]!, r[2]!, t[0], r[3]!, r[4]!, r[5]!, t[1], r[6]!, r[7]!, r[8]!, t[2], 0, 0, 0, 1));
        val.renderOrder = 5;
        v3.avert.add(val);
        // conturul: piesa mărită cu CONTUR mm în fiecare parte, în jurul mijlocului cutiei ei (p → s·p + c·(1 − s), apoi așezarea)
        const s = c.dim.map(d => (d + 2 * CONTUR) / d), k = c.dim.map((d, i) => d / 2 * (1 - s[i]!)), kt = Lego.aplicaTransf(a.T, k);
        const contur = new T.Mesh(c.geom, materialAvert(semn, true)!);
        contur.applyMatrix4(new T.Matrix4().set(r[0]! * s[0]!, r[1]! * s[1]!, r[2]! * s[2]!, kt[0], r[3]! * s[0]!, r[4]! * s[1]!, r[5]! * s[2]!, kt[1], r[6]! * s[0]!, r[7]! * s[1]!, r[8]! * s[2]!, kt[2], 0, 0, 0, 1));
        v3.avert.add(contur);
      }
    }
    punctePrinderi(A);
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
      $("#at-cote").innerHTML = model.length ? `<span><b>Piese</b> ${model.length}</span><span><b>Mărime</b> ${tr`${fmt(box.max.x - box.min.x)} × ${fmt(box.max.y - box.min.y)} × ${fmt(box.max.z - box.min.z)} mm`}</span><span><b>Filament</b> ≈ ${fmt(g, 0)} g</span><span><b>Timp</b> ${Lego.durataPrint(Lego.timpPrint(g, setari.debit))}</span>` : `<span>Modelul e gol.</span>`;
    }
  }
  /** Punctele prinderilor piesei alese, în vederea 3D: un clic pe unul îl face ținta piesei următoare. Se văd și prin
   *  piesă (prinderile de dedesubt se pot alege fără să întorci vederea) și au un contur, ca să se vadă pe orice culoare. */
  function punctePrinderi(A: Map<string, Asezat>) {
    const T = v3.T;
    if (!v3.puncte) {
      v3.puncte = new T.Group(); v3.scena.add(v3.puncte);
      v3.geomPunct = new T.SphereGeometry(1.3, 14, 10); v3.geomContur = new T.SphereGeometry(1.7, 14, 10);
      v3.matPunct = new T.MeshBasicMaterial({ color: 0xffffff, depthTest: false, transparent: true, opacity: 0.95 });
      v3.matTinta = new T.MeshBasicMaterial({ color: 0xff8a00, depthTest: false, transparent: true, opacity: 1 });
      v3.matContur = new T.MeshBasicMaterial({ color: 0x14181d, depthTest: false, transparent: true, opacity: 0.9 });
    }
    const g = v3.puncte;
    g.visible = true;
    while (g.children.length) g.remove(g.children[0]!);
    const m = model.find(x => x.id === alesM), c = m ? corpSigur(m.def) : null, a = m ? A.get(m.id) : undefined, tinta = tintaBuna();
    if (!m || !c || !a) return;
    c.prinderi.forEach((p, k) => {
      const q = Lego.aplicaTransf(a.T, p.p), eTinta = !!tinta && tinta.k === k;
      for (const [geom, mat, ordine] of [[v3.geomContur!, v3.matContur!, 10], [v3.geomPunct!, eTinta ? v3.matTinta! : v3.matPunct!, 11]] as const) {
        const s = new T.Mesh(geom, mat);
        s.position.set(q[0], q[1], q[2]); s.renderOrder = ordine; s.userData.k = k;
        g.add(s);
      }
    });
  }
  function clicInVedere(e: MouseEvent) {
    if (vedere !== "model" || !v3.ok || !v3.grup) return;
    const T = v3.T, r = v3.r.domElement.getBoundingClientRect();
    const ndc = new T.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    const rc = new T.Raycaster(); rc.setFromCamera(ndc, v3.cam);
    // intai punctele prinderilor piesei alese: un clic pe unul il face tinta (al doilea clic o scoate)
    const punct = v3.puncte && alesM ? rc.intersectObjects(v3.puncte.children, false)[0] : undefined;
    if (punct) { alegeTinta(punct.object.userData.k as number); return; }
    const hit = rc.intersectObjects(v3.grup.children, false)[0];
    alegeM(hit ? hit.object.userData.id as string : null);
    editorModel(); arataModel(true); butonModel();
  }
  const titluM = (m: InModel) => numeDef(m.def);
  const MUTARI_GRILA = `<button class="btn" type="button" data-m="x-" aria-label="X minus">← X</button><button class="btn" type="button" data-m="x+" aria-label="X plus">X →</button>
          <button class="btn" type="button" data-m="y-" aria-label="Y minus">↓ Y</button><button class="btn" type="button" data-m="y+" aria-label="Y plus">Y ↑</button>
          <button class="btn" type="button" data-m="z-">Jos</button><button class="btn" type="button" data-m="z+">Sus</button>
          <button class="btn" type="button" data-m="r">Rotește ↻</button>`;
  /** Încotro e partea de sus a unei piese răsturnate, cu semnele de pe butoanele de mutare. */
  const SPRE: Record<string, string> = { "x+": "X →", "x-": "← X", "y+": "Y ↑", "y-": "↓ Y" };
  function editorModel() {
    const A = asezari(), V = verificare(A), fel = (x: InModel) => A.get(x.id)?.fel ?? "grila";
    const e = $("#at-editor"), m = model.find(x => x.id === alesM), c = m ? corpSigur(m.def) : null, felM = m ? fel(m) : "grila", axM = m && felM === "grila" ? stiftAx(m) : null;
    // locul unei piese, in lista: coltul amprentei; la o piesa rotunda, stiftul axului; „prinsă” sau „liberă”, la celelalte
    const loculM = (x: InModel) => { const f = fel(x), a = f === "grila" ? stiftAx(x) : null; return f === "prins" ? tr("prinsă") : f === "liber" ? tr("liberă") : a ? tr`ax ${a[0]}, ${a[1]}, ${x.z}` : `${x.x}, ${x.y}, ${x.z}`; };
    const cul = CULORI.map(([n, c]) => `<button type="button" data-fundal="${c}" data-mc="${c}" aria-label="${n}" aria-pressed="${!!m && m.culoare === c}"></button>`).join("");
    // unde sta piesa aleasa si cum se muta: pe grila (stifturi si placi); prinsa (in jurul prinderii si de-a lungul ei);
    // libera (in mm, cu coltul cutiei ei)
    let unde = "", mutari = MUTARI_GRILA;
    if (m && c && felM === "prins") {
      const q = m.prins!, baza = model.find(x => x.id === q.de)!, cb = corpSigur(baza.def)!, pa = cb.prinderi[q.a]!, pb = c.prinderi[q.b]!;
      unde = tr`prinsă de ${titluM(baza)} (${numePrindere(c.prinderi, q.b)} ↔ ${numePrindere(cb.prinderi, q.a)})` + (q.unghi ? tr` · rotită ${q.unghi}°` : "") + (q.alunec ? tr` · glisată ${fmt(q.alunec)} mm` : "");
      mutari = (Lego.potriviriPrindere(pa, c.prinderi).length > 1 ? `<button class="btn" type="button" data-m="pb">Altă prindere</button>` : "")
        + (locuriBaza(cb.prinderi, pb).length > 1 ? `<button class="btn" type="button" data-m="pa">Alt loc pe bază</button>` : "")
        + `<button class="btn" type="button" data-m="pr">Rotește ↻</button>`
        + (Lego.seGliseaza(pa.fel, pb.fel) ? `<button class="btn" type="button" data-m="pg-">Glisează −</button><button class="btn" type="button" data-m="pg+">Glisează +</button>` : "")
        + `<button class="btn" type="button" data-m="pd">Desprinde</button>`;
    } else if (m && c && felM === "liber") {
      const [lo] = Lego.cutieTransf(A.get(m.id)!.T, c.dim);
      unde = tr`liberă, colțul cutiei la ${fmt(lo[0], 2)}, ${fmt(lo[1], 2)}, ${fmt(lo[2], 2)} mm`;
      // cum sta (ADR 0284, 3.Cf-2): drept, intre stifturi (cu locul in stifturi si placi), cu fata in jos sau pe o parte
      const drept = Lego.loculDrept(c, A.get(m.id)!.T), sus = Lego.susTransf(A.get(m.id)!.T);
      if (drept) unde += tr` · între știfturi: x ${fmt(drept.x, 2)}, y ${fmt(drept.y, 2)}, z ${fmt(drept.z, 2)}` + (drept.rot ? tr` · rotită ${drept.rot * 90}°` : "");
      else if (sus === "jos") unde += tr(" · cu fața în jos");
      else if (sus && SPRE[sus]) unde += tr` · cu partea de sus spre ${SPRE[sus]!}`;
    } else if (m) unde = `${axM ? tr`axul pe știftul ${axM[0]}, ${axM[1]}` : `x ${m.x}, y ${m.y}`}, z ${m.z} ${m.z === 1 ? tr("placă", "LEGO") : tr("plăci", "LEGO")}${m.rot ? tr` · rotită ${m.rot * 90}°` : ""}`;
    // pe grila sau libera: rasturnarile (cu „Roteste”, toate asezarile drepte) si jumatatile de pas; o piesa prinsa se misca
    // doar in jurul prinderii ei
    if (m && felM !== "prins") mutari += `<button class="btn" type="button" data-m="tx" aria-label="${tr("Răstoarnă spre față")}">Răstoarnă ↓</button><button class="btn" type="button" data-m="ty" aria-label="${tr("Răstoarnă spre dreapta")}">Răstoarnă →</button>
          <button class="btn" type="button" data-m="fin" aria-pressed="${pasFin}">Jumătăți de pas</button>`;
    // prinderile piesei alese, pe feluri: numarul uneia o face tinta piesei urmatoare (ca un clic pe punctul ei din vedere)
    const pr = c ? c.prinderi : [], tinta = tintaBuna();
    const prinderi = m && pr.length ? `<div class="model-prinderi" id="at-m-prinderi">
          <span class="mic">Prinderile ei. Alege una, apoi pune piesa următoare: se alipește acolo.</span>
          ${[...new Set(pr.map(p => p.fel))].map(f => `<div class="at-rand"><span class="mic fel">${numeFelM(f, pr.filter(p => p.fel === f).length)}</span><div class="numere">${
            pr.map((p, k) => p.fel !== f ? "" : `<button type="button" data-pk="${k}" aria-pressed="${!!tinta && tinta.k === k}" aria-label="${numePrindere(pr, k)}">${nrPrindere(pr, k)}</button>`).join("")}</div></div>`).join("")}
          ${tinta ? `<p class="mic" id="at-m-tinta">${tr`Ținta: ${numePrindere(pr, tinta.k)}. Alege piesa următoare (filele de sus), apoi „Alipește în model”.`}</p>` : ""}
        </div>` : "";
    // verificarea (ADR 0284, 3.Cg): ce spune despre piesa aleasa si, deasupra listei, despre tot modelul. Cu o singura piesa
    // nu e nimic de verificat
    const st = m ? V.piese.get(m.id) : undefined, numeM = (ids: readonly string[]) => ids.map(id => titluM(model.find(x => x.id === id)!)).join(", ");
    let stari = "";
    if (m && st && model.length > 1) {
      const baza = felM === "prins" ? model.find(x => x.id === m.prins!.de) : undefined;
      if (baza && !st.prinsa.includes(baza.id)) stari += `<p class="avert" data-stare="desfacuta">${tr`Legată de ${titluM(baza)}, dar prinderea lor nu mai ține.`}</p>`;
      if (st.intra.length) stari += `<p class="avert rau" data-stare="intra">${tr`Intră în ${numeM(st.intra)}.`}</p>`;
      if (st.pluteste) stari += `<p class="avert" data-stare="pluteste">${st.prinsa.length ? tr("Plutește, cu piesele de care e prinsă: niciuna nu ajunge la masă.") : tr("Plutește: nu stă pe masă și nu e prinsă de nimic.")}</p>`;
      if (st.prinsa.length) stari += `<p class="mic" data-stare="prinsa">${tr`Prinsă de ${numeM(st.prinsa)}.`}</p>`;
      else if (!st.intra.length && !st.pluteste) stari += `<p class="mic" data-stare="neprinsa">${tr("Nu e prinsă de alte piese.")}</p>`;
    }
    // „20 de piese”, dar „19 piese”
    const cuDe = (n: number) => (n % 100 === 0 || n % 100 >= 20 ? tr`${n} de` : String(n));
    const lovite = model.filter(x => V.piese.get(x.id)?.intra.length).length, inAer = model.filter(x => V.piese.get(x.id)?.pluteste).length;
    const rele = [lovite ? tr`${cuDe(lovite)} piese intră una în alta` : "", inAer === 1 ? tr("o piesă plutește") : inAer ? tr`${cuDe(inAer)} piese plutesc` : ""].filter(Boolean);
    const rezumat = model.length < 2 ? "" : `<p class="${rele.length ? "at-avert" : "mic"}" id="at-m-verificare">${rele.length ? tr`Verificare: ${rele.join(" · ")}.`
      : tr("Verificare: nicio piesă nu plutește și niciuna nu intră în alta.") + " " + (V.bucati > 1 ? tr`Modelul e din ${cuDe(V.bucati)} bucăți care nu se țin între ele.` : tr("Toate piesele se țin între ele."))}</p>`;
    const semnLista = (x: InModel) => { const f = semnM(V.piese.get(x.id)); return f === "intra" ? ` <span class="semn rau">intră în alta</span>` : f === "pluteste" ? ` <span class="semn">plutește</span>` : ""; };
    // construcțiile (ADR 0284, 3.Ch): alegerea, numele (al omului: nu se traduce) și ce se face cu ele; piesele construcției,
    // pe rânduri (aceeași piesă se adună), cu filamentul și timpul de printat, la debitul imprimantei
    const ac = tineConstructia();
    const blocC = `<div class="model-constructii" id="at-c">
        <div class="at-rand"><label class="mic" for="at-c-alege">Construcția</label>
          <select id="at-c-alege">${constructii.map(c => `<option value="${esc(c.id)}" translate="no"${c === ac ? " selected" : ""}>${esc(numeC(c))}</option>`).join("")}</select></div>
        <div class="at-rand"><label class="mic" for="at-c-nume">Numele</label>
          <input id="at-c-nume" type="text" maxlength="60" autocomplete="off" spellcheck="false" translate="no" value="${esc(ac.nume)}" placeholder="${esc(tr`Construcția ${ac.nr}`)}"></div>
        <div class="at-rand"><button class="btn" type="button" id="at-c-noua">Construcție nouă</button>
          <button class="btn" type="button" id="at-c-dubla">Dublează construcția</button>
          <button class="btn" type="button" id="at-c-sterge"${constructii.length < 2 ? " disabled" : ""}>Șterge construcția</button>
          <span class="mic" id="at-c-confirma" hidden>${tr("Sigur?")} <button class="btn" type="button" id="at-c-sterge-da">Da, șterge</button></span></div>
      </div>`;
    // construcțiile gata (ADR 0284, 3.Ci): felul, valorile lui, ce iese pe hârtie și „Fă construcția” (una nouă, după cele de acum).
    // Panoul rămâne cum l-a lăsat omul: starea se citește din pagină acum, nu din `toggle` (vine după, deci o alegere făcută
    // imediat după deschidere ar reface panoul strâns)
    const detVechi = document.getElementById("at-cg") as HTMLDetailsElement | null;
    if (detVechi) gata.deschis = detVechi.open;
    const campuriGata = CAMPURI_GATA[gata.fel]!.map(c => {
      const v = gata.valori[gata.fel]![c[0]];
      if (c.length === 3) return `<label for="at-cg-${c[0]}">${c[1]}<select id="at-cg-${c[0]}" data-cg="${c[0]}">${c[2].map(([k, t]) => `<option value="${k}"${String(v) === k ? " selected" : ""}>${t || `Ø${fmt(+k)}`}</option>`).join("")}</select></label>`;
      return `<label for="at-cg-${c[0]}">${c[1]}<input id="at-cg-${c[0]}" data-cg="${c[0]}" type="number" min="${c[2]}" max="${c[3]}" step="1" value="${v}"></label>`;
    }).join("");
    const blocGata = `<details class="model-gata" id="at-cg"${gata.deschis ? " open" : ""}>
        <summary>Construcții gata</summary>
        <p class="mic">Pornești de la o construcție făcută din piesele atelierului, cu mărimile tale: se deschide ca o construcție nouă, cu piesele prinse între ele.</p>
        <div class="at-rand"><label class="mic" for="at-cg-fel">Felul</label>
          <select id="at-cg-fel">${[["sasiu", "Șasiu cu patru roți"], ["angrenaje", "Cutie de angrenaje"], ["macara", "Braț de macara"], ["barca", "Barcă cu elice"]].map(([f, t]) => `<option value="${f}"${f === gata.fel ? " selected" : ""}>${t}</option>`).join("")}</select></div>
        <div class="at-campuri" id="at-cg-campuri">${campuriGata}</div>
        <div id="at-cg-info" aria-live="polite">${gata.deschis ? infoGata() : ""}</div>
        <div class="at-rand"><button class="btn" type="button" id="at-cg-fa">Fă construcția</button></div>
      </details>`;
    const randC = Lego.pieseConstructie(model.map(x => x.def)).map(r => ({ ...r, g: grameDef(r.def) * r.bucati }));
    const gC = randC.reduce((t, r) => t + r.g, 0), timpC = (g: number) => Lego.timpPrint(g, setari.debit);
    const celule = (g: number) => `<td class="num" data-grame>${fmt(g)} g</td><td class="num" data-timp>${Lego.durataPrint(timpC(g))}</td>`;
    const pieseC = model.length ? `<section class="model-piese" id="at-c-piese" aria-labelledby="at-c-piese-t">
        <h3 id="at-c-piese-t">Piesele construcției</h3>
        <div class="tabel"><table>
          <thead><tr><th>Piesa</th><th>Bucăți</th><th>Filament</th><th>Timp</th></tr></thead>
          <tbody>${randC.map(r => `<tr data-g="${r.g}" data-s="${timpC(r.g)}"><td>${numeDef(r.def)}</td><td class="num centru" data-bucati>${r.bucati}</td>${celule(r.g)}</tr>`).join("")}</tbody>
          <tfoot><tr data-g="${gC}" data-s="${timpC(gC)}"><th>Total</th><td class="num centru" data-bucati>${model.length}</td>${celule(gC)}</tr></tfoot>
        </table></div>
        <p class="mic">${tr`Timpul e socotit din filament, la debitul mediu al imprimantei (${setari.debit} mm³/s, în „Imprimanta și potrivirea pieselor”, mai jos): e aproximativ și nu cuprinde încălzirea.`}</p>
      </section>` : "";
    e.innerHTML = `<h2>Modelul</h2>
      ${blocC}
      ${blocGata}
      <p class="mic">Așezi piesele pe grila de știfturi, ca să vezi avionul întreg înainte să-l printezi. Alegi o piesă cu un clic în vedere sau din listă, apoi o muți: X și Y câte un știft, Z câte o placă. O piesă nouă intră deasupra celei alese, la mijlocul ei. Piesele rotunde (roțile, elicele) stau cu axul în mijlocul unui știft: una nouă intră pe axul celei alese, iar rotorul unui ventilator, în carcasa lui. Modelul verifică piesele: îți spune care plutește (nu stă pe masă și nu e prinsă de nimic) și care intră în alta. E un avertisment: piesa rămâne unde ai pus-o.</p>
      <p class="mic">Ca să prinzi două piese între ele, alege una, apoi una dintre prinderile ei (un punct din vedere sau un număr de mai jos): piesa următoare se alipește acolo și rămâne legată de ea, deci o urmează când o muți.</p>
      <p class="mic">„Răstoarnă ↓” și „Răstoarnă →” culcă piesa câte un sfert de tură, spre față sau spre dreapta; cu „Rotește”, ajungi la orice așezare dreaptă. „Jumătăți de pas” mută câte o jumătate de știft și o jumătate de placă, pentru piesele Technic. O piesă răsturnată sau pusă între știfturi e „liberă”: nu mai ține de grilă, dar se mută la fel.</p>
      ${m ? `<div class="model-ales">
        <div><b>${titluM(m)}</b> <span class="mic">· ${unde}</span></div>
        ${stari ? `<div class="model-stare" id="at-m-stare">${stari}</div>` : ""}
        <div class="mutari" id="at-m-mutari">
          ${mutari}
        </div>
        ${prinderi}
        <div class="at-rand"><span class="mic">Culoare:</span><div class="culori" id="at-m-culori">${cul}</div></div>
        <div class="at-rand"><button class="btn" type="button" id="at-m-dubla">Dublează</button><button class="btn" type="button" id="at-m-scoate">Scoate din model</button><button class="btn" type="button" id="at-m-editeaza">Schimb-o în editor</button></div>
      </div>` : model.length ? `<p class="mic">Nicio piesă aleasă.</p>` : `<p class="mic">Modelul e gol. Alege o piesă (fila de sus), apoi „Pune în model”.</p>`}
      ${rezumat}
      ${model.length ? `<ol class="model-lista" id="at-m-lista">${model.map(x => `<li data-avert="${semnM(V.piese.get(x.id))}"><button type="button" data-mid="${x.id}" aria-pressed="${x.id === alesM}"><span class="punct" data-fundal="${x.culoare}"></span>${titluM(x)}${semnLista(x)} <span class="mic">${loculM(x)}</span></button></li>`).join("")}</ol>` : ""}
      <p class="mic">Cu vederea 3D aleasă (un clic pe ea): săgețile mută (cu Shift, câte o jumătate de pas), PageUp / PageDown urcă și coboară, R rotește, X și Y răstoarnă, Delete scoate.</p>
      ${pieseC}`;
    fundaluri(e);
    $<HTMLSelectElement>("#at-c-alege").onchange = ev => alegeConstructie((ev.target as HTMLSelectElement).value);
    $("#at-c-noua").onclick = constructieNoua;
    $("#at-c-dubla").onclick = dubleazaConstructia;
    $("#at-c-sterge").onclick = () => { $("#at-c-confirma").hidden = false; };
    $("#at-c-sterge-da").onclick = stergeConstructia;
    const detGata = $<HTMLDetailsElement>("#at-cg");
    detGata.ontoggle = () => { if (!detGata.isConnected) return; gata.deschis = detGata.open; if (gata.deschis) $("#at-cg-info").innerHTML = infoGata(); };
    $<HTMLSelectElement>("#at-cg-fel").onchange = ev => { gata.fel = (ev.target as HTMLSelectElement).value; editorModel(); $("#at-cg-fel").focus(); };
    $("#at-cg-campuri").onchange = ev => {
      const el = ev.target as HTMLInputElement | HTMLSelectElement, k = el.dataset.cg, c = CAMPURI_GATA[gata.fel]!.find(x => x[0] === k);
      if (!k || !c) return;
      if (c.length === 3) gata.valori[gata.fel]![k] = el.value;
      else {
        // un număr scris în afara marginilor (sau deloc) se întoarce la cel mai apropiat întreg din ele
        const v = Math.round(+el.value), x = Number.isFinite(v) && el.value !== "" ? Math.min(c[3], Math.max(c[2], v)) : +gata.valori[gata.fel]![k]!;
        gata.valori[gata.fel]![k] = x; el.value = String(x);
      }
      $("#at-cg-info").innerHTML = infoGata();
    };
    $("#at-cg-fa").onclick = faConstructiaGata;
    const campNume = $<HTMLInputElement>("#at-c-nume");
    // numele se scrie la Enter sau la ieșirea din câmp (`change`); editorul se face din nou, deci focusul pleacă din câmp
    campNume.onchange = () => redenumesteConstructia(campNume.value);
    if (m) {
      $("#at-m-mutari").onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-m]"); if (b) mutaM(b.dataset.m!); };
      const P = document.getElementById("at-m-prinderi");
      if (P) P.onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-pk]"); if (b) alegeTinta(+b.dataset.pk!); };
      $("#at-m-culori").onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-mc]"); if (!b) return; m.culoare = b.dataset.mc!; dupaModel(); };
      $("#at-m-dubla").onclick = () => {
        // copia unei piese de pe grila sta cu un stift mai la dreapta; a uneia prinse sau libere, cu 8 mm, fara legatura
        const copie: InModel = { ...m, id: idNou() }, T = A.get(m.id)?.T;
        if (felM === "grila" || !T) { delete copie.prins; delete copie.liber; copie.x = m.x + 1; } else lasaPeLoc(copie, { m: T.m, t: [T.t[0] + 8, T.t[1], T.t[2]] });
        model.push(copie); alegeM(copie.id); dupaModel();
      };
      $("#at-m-scoate").onclick = () => { scoateM(m.id); dupaModel(); };
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
    if ($("#at-m-lista")) $("#at-m-lista").onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-mid]"); if (!b) return; alegeM(b.dataset.mid!); editorModel(); arataModel(true); butonModel(); };
  }
  const idNou = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  function mutaM(op: string, fin = pasFin) {
    const m = model.find(x => x.id === alesM);
    if (!m) return;
    if (op === "fin") { pasFin = !pasFin; editorModel(); return; }
    const a = asezari().get(m.id), c = corpSigur(m.def);
    if (a && c && a.fel === "prins") {
      // piesa prinsa: in jurul prinderii si de-a lungul ei (tasta R o roteste tot asa; sagetile nu o muta)
      const q = m.prins!, baza = model.find(x => x.id === q.de), cb = baza ? corpSigur(baza.def) : null, pa = cb ? cb.prinderi[q.a] : undefined, pb = c.prinderi[q.b];
      if (!pa || !pb) return;
      if (op === "pr" || op === "r") q.unghi = (q.unghi + 90) % 360;
      else if (op === "pb") {
        // urmatoarea prindere a ei care se potriveste, in ordinea incercarii; fara tija, glisarea nu mai are sens
        const l = Lego.potriviriPrindere(pa, c.prinderi);
        if (l.length < 2) return;
        q.b = l[(l.indexOf(q.b) + 1) % l.length]!;
        if (!Lego.seGliseaza(pa.fel, c.prinderi[q.b]!.fel)) q.alunec = 0;
      } else if (op === "pa") {
        // urmatorul loc de pe baza: piesa se muta, cu aceeasi prindere a ei, pe urmatoarea prindere a bazei care i se potriveste
        const l = locuriBaza(cb!.prinderi, pb);
        if (l.length < 2) return;
        q.a = l[(l.indexOf(q.a) + 1) % l.length]!;
        if (!Lego.seGliseaza(cb!.prinderi[q.a]!.fel, pb.fel)) q.alunec = 0;
      } else if ((op === "pg-" || op === "pg+") && Lego.seGliseaza(pa.fel, pb.fel)) q.alunec = Math.max(-200, Math.min(200, q.alunec + (op === "pg+" ? 4 : -4)));
      else if (op === "pd") lasaPeLoc(m, a.T);
      else return;
      dupaModel(); return;
    }
    if (a && c && (a.fel === "liber" || op === "tx" || op === "ty" || (fin && op !== "r"))) {
      // piesa libera: 8 mm pe X si Y, o placa pe Z; rotirea, in jurul verticalei prin mijlocul cutiei ei. Ajunsa drept pe
      // grila, e din nou o piesa de pe grila. Tot pe aici trece si o piesa de pe grila rasturnata sau mutata cu o jumatate
      // de pas (ADR 0284, 3.Cf-2): `lasaPeLoc` o tine libera cat nu sta drept pe grila
      const k = fin ? 0.5 : 1;
      const pas = ({ "x-": [-8, 0, 0], "x+": [8, 0, 0], "y-": [0, -8, 0], "y+": [0, 8, 0], "z-": [0, 0, -3.2], "z+": [0, 0, 3.2] } as Record<string, number[]>)[op];
      if (pas) lasaPeLoc(m, { m: a.T.m, t: [a.T.t[0] + pas[0]! * k, a.T.t[1] + pas[1]! * k, a.T.t[2] + pas[2]! * k] });
      // o piesa rotunda care sta drept se roteste in jurul axului ei (il judeca motorul)
      else if (op === "r") lasaPeLoc(m, Lego.rotitLiber(a.T, c.dim, c.ax ? c.pivot : null));
      else if (op === "tx" || op === "ty") lasaPeLoc(m, Lego.intorsLiber(a.T, c.dim, op === "tx" ? "x" : "y"));
      else return;
      dupaModel(); return;
    }
    if (!["x-", "x+", "y-", "y+", "z-", "z+", "r"].includes(op)) return;
    if (op === "x-") m.x--; if (op === "x+") m.x++; if (op === "y-") m.y--; if (op === "y+") m.y++;
    if (op === "z-") m.z = Math.max(-60, m.z - 1); if (op === "z+") m.z = Math.min(200, m.z + 1);
    if (op === "r") {
      // o piesa rotunda se roteste in jurul axului: axul ramane pe loc, iar coltul amprentei se muta cu el (ADR 0283)
      const ax = c && c.ax ? Lego.pivotModel(c, m.x, m.y, m.rot) : null;
      m.rot = (m.rot + 1) % 4;
      if (c && ax) [m.x, m.y] = Lego.langaPivot(c, m.rot, ax);
    }
    dupaModel();
  }
  function dupaModel() { salveaza(); editorModel(); arataModel(true); butonModel(); }
  let inlocuieste: string | null = null;     // piesa din model care se schimba din editor
  /** Piesa din model, schimbată în editor. Legăturile ei rămân cât prinderile sunt în același loc (o judecă motorul,
   *  `prindereaRamasa`); o piesă a cărei prindere nu mai e rămâne unde era, fără legătură. */
  function inlocuiesteM(vechi: InModel, def: Def) {
    const A = asezari(), a = corpSigur(vechi.def), b = corpSigur(def), fel = A.get(vechi.id)?.fel ?? "grila";
    // o piesa rotunda inlocuita cu alta rotunda isi tine axul; restul isi tin coltul (ADR 0283)
    if (fel === "grila" && a && b && a.ax && b.ax) [vechi.x, vechi.y] = Lego.langaPivot(b, vechi.rot, Lego.pivotModel(a, vechi.x, vechi.y, vechi.rot));
    vechi.def = def;
    if (!a || !b) return;
    // piesele prinse de ea
    for (const x of model) {
      if (!x.prins || x.prins.de !== vechi.id) continue;
      const ax = A.get(x.id), pa = a.prinderi[x.prins.a], k = pa ? Lego.prindereaRamasa(pa, b.prinderi) : -1;
      if (k >= 0) x.prins.a = k;
      else if (ax && ax.fel === "prins") lasaPeLoc(x, ax.T);
      else delete x.prins;
    }
    // prinderea ei de baza: cea ramasa pe loc; altfel, prima care se potriveste; altfel, piesa ramane unde era
    if (fel !== "prins") return;
    const q = vechi.prins!, baza = model.find(x => x.id === q.de), cb = baza ? corpSigur(baza.def) : null, pa = cb ? cb.prinderi[q.a] : undefined, pb = a.prinderi[q.b];
    let k = pb ? Lego.prindereaRamasa(pb, b.prinderi) : -1;
    if (k < 0 && pa) k = Lego.potriviriPrindere(pa, b.prinderi)[0] ?? -1;
    if (k >= 0) q.b = k; else lasaPeLoc(vechi, A.get(vechi.id)!.T);
  }
  function puneInModel() {
    laZi();
    if (!curent || curent.def.tip === "calibrare") return;
    const vechi = inlocuieste && model.find(x => x.id === inlocuieste);
    if (vechi) {
      inlocuiesteM(vechi, curent.def);
      alegeM(vechi.id); inlocuieste = null;
    } else {
      const sel = model.find(x => x.id === alesM), tinta = tintaBuna(), m: InModel = { id: idNou(), def: curent.def, x: 0, y: 0, z: 0, rot: 0, culoare: setari.culoare };
      if (sel) {
        const as = asezari().get(sel.id), a = corpSigur(sel.def), b = corpSigur(curent.def);
        if (as && a && as.fel !== "grila") {
          // langa o piesa prinsa sau libera: pe grila, deasupra cutiei ei, cu pivotul cat mai aproape de mijlocul cutiei
          const [lo, hi] = Lego.cutieTransf(as.T, a.dim);
          [m.x, m.y] = b ? Lego.langaPivot(b, 0, [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2]) : [Math.round(lo[0] / 8), Math.round(lo[1] / 8)];
          m.z = Math.max(-60, Math.min(200, Math.ceil(hi[2] / 3.2 - 1e-6)));
        } else {
          // langa piesa aleasa (ADR 0283): cu pivotul cat mai aproape de al ei (doua piese rotunde, pe acelasi ax), deasupra ei;
          // rotorul unui ventilator si carcasa in care incape, la acelasi Z
          m.rot = sel.rot;
          [m.x, m.y] = a && b ? Lego.langaPivot(b, m.rot, Lego.pivotModel(a, sel.x, sel.y, sel.rot)) : [sel.x, sel.y];
          m.z = Lego.impreunaInModel(sel.def as DefMotor, curent.def as DefMotor) ? sel.z : sel.z + inaltimeM(sel);
        }
        // cu o tinta aleasa (ADR 0284, 3.Cf): piesa noua se alipeste acolo, cu prinderea ei care o intoarce cel mai putin,
        // si ramane legata de piesa aleasa; fara nicio prindere potrivita, sta deasupra, ca mai sus
        if (tinta && b) {
          const j = Lego.potriviriPrindere(tinta.p, b.prinderi)[0];
          if (j !== undefined) m.prins = { de: sel.id, a: tinta.k, b: j, unghi: 0, alunec: 0 };
          else toast(tr`${numeDef(curent.def)} nu are nicio prindere pentru ${numeFelM(tinta.p.fel)}: piesa stă deasupra, nealipită.`);
        }
      }
      model.push(m); alegeM(m.id);
    }
    salveaza(); butonModel();
    alegeVedere("model");
  }
  function butonModel() {
    const b = $<HTMLButtonElement>("#at-in-model");
    b.textContent = inlocuieste && model.some(x => x.id === inlocuieste) ? "Înlocuiește în model" : tintaBuna() ? "Alipește în model" : "Pune în model";
    // o formă liberă, din cvs2, nu stă pe grila de știfturi a modelului
    b.disabled = !curent || curent.def.tip === "calibrare" || curent.def.tip === "dinCvs2";
    $("#at-vedere-mod [data-v=\"model\"]").textContent = model.length ? tr`Modelul (${model.length})` : "Modelul";
  }
  function alegeVedere(v: string) {
    vedere = v === "model" ? "model" : "piesa";
    document.querySelectorAll<HTMLElement>("#at-vedere-mod [data-v]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === vedere)));
    $("#at-act-piesa").hidden = vedere !== "piesa"; $("#at-act-model").hidden = vedere !== "model";
    marcheazaFile();
    $("#at-culori").hidden = vedere === "model";
    if (vedere === "model") {
      privita = null;
      $("#at-nume-piesa").textContent = "Modelul";
      $("#at-avert").hidden = true;
      editorModel(); arataModel(); randeazaPrinde();
    } else {
      privita = null; editor(); construiesteCurent();
    }
    butonModel();
  }
  function tasteModel(ev: KeyboardEvent) {
    if (vedere !== "model" || !alesM) return;
    // cu Ctrl, Alt sau Meta, tastele sunt ale browserului (Ctrl + X, Ctrl + R)
    if (ev.ctrlKey || ev.altKey || ev.metaKey) return;
    const k = { ArrowLeft: "x-", ArrowRight: "x+", ArrowDown: "y-", ArrowUp: "y+", PageDown: "z-", PageUp: "z+", r: "r", R: "r", x: "tx", X: "tx", y: "ty", Y: "ty" }[ev.key];
    // cu Shift, o mutare merge cu o jumatate de pas, oricum ar fi comutatorul
    if (k) { ev.preventDefault(); mutaM(k, pasFin || ev.shiftKey); return; }
    if (ev.key === "Delete" || ev.key === "Backspace") { ev.preventDefault(); scoateM(alesM); dupaModel(); }
  }
  function modelInLista() {
    // piesele construcției alese intră în lista de printat, pe rândurile ei (aceeași piesă se adună)
    if (!model.length) return;
    for (const r of Lego.pieseConstructie(model.map(m => m.def))) pune(r.def, r.bucati);
    salveaza(); randeazaLista();
    const n = model.length;
    toast(tr`${n === 1 ? tr("O piesă") : cuDe(n) ? tr`${n} de piese` : tr`${n} piese`} din „${numeC(tineConstructia())}” în lista de printat.`);
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
  // --------------------------------------------------------------------------- „Se prinde cu” (ADR 0284, felia 3.Ce)
  // Sub piesa de pe ecran: ce prinderi are (le spune motorul, odată cu plasa) și, la deschidere, piesele atelierului care se
  // potrivesc cu ele, pe feluri. Celelalte piese se judecă așa cum sunt acum în editoarele lor; prinderile lor se țin minte
  // până li se schimbă definiția sau calibrarea. Un clic deschide piesa; axul și știftul vin cu lungimea potrivită.
  /** Numele unui fel de prindere: una, mai multe; unde se prinde perechea, la una și la mai multe. */
  const NUME_PRINDERI: Readonly<Record<string, () => readonly [string, string, string, string]>> = {
    stift: () => [tr("știft"), tr("știfturi"), tr("Pe știft"), tr("Pe știfturi")],
    locas: () => [tr("locaș"), tr("locașuri"), tr("În locaș (dedesubt)"), tr("În locașuri (dedesubt)")],
    gauraStift: () => [tr("gaură de știft"), tr("găuri de știft"), tr("În gaura de știft"), tr("În găurile de știft")],
    gauraAx: () => [tr("gaură de ax"), tr("găuri de ax"), tr("În gaura de ax"), tr("În găurile de ax")],
    gauraBara: () => [tr("gaură de bară"), tr("găuri de bară"), tr("În gaura de bară"), tr("În găurile de bară")],
    stiftTechnic: () => [tr("știft Technic"), tr("știfturi Technic"), tr("Pe știftul Technic"), tr("Pe știfturile Technic")],
    capatAx: () => [tr("ax"), tr("axe"), tr("Pe ax"), tr("Pe axe")],
    bara: () => [tr("bară"), tr("bare"), tr("Pe bară"), tr("Pe bare")],
    clema: () => [tr("clemă"), tr("cleme"), tr("În clemă"), tr("În cleme")],
    bila: () => [tr("bilă"), tr("bile"), tr("Pe bilă"), tr("Pe bile")],
    cupa: () => [tr("cupă"), tr("cupe"), tr("În cupă"), tr("În cupe")],
  };
  let prinderiCurente: Prindere[] = [];
  const prinderiTinute = new Map<string, { cheie: string; pr: Prindere[] }>();
  /** Prinderile altei piese a atelierului, așa cum e acum în editorul ei (ținute minte până i se schimbă definiția). */
  function prinderiPiesa(tip: string): Prindere[] {
    const def = defCurenta(tip), cheie = JSON.stringify([def, paramMotor()]), t = prinderiTinute.get(tip);
    if (t && t.cheie === cheie) return t.pr;
    let pr: Prindere[] = [];
    // o piesă care nu se poate face acum (o coroană cu pinionul prea mare) nu se prinde cu nimic
    try { Lego.seteaza(paramMotor()); pr = Lego.prinderi(def as Parameters<typeof Lego.prinderi>[0]); } catch { pr = []; }
    prinderiTinute.set(tip, { cheie, pr });
    return pr;
  }
  /** Grinda pe care stă perechea roții dințate de pe ecran: câte găuri are, sau 0 dacă axele nu cad pe grilă. */
  function grindaPereche(): { z: number; a: number; gauri: number } {
    const p = stare.rotita, a = Lego.distantaRoti(p.dinti, p.pereche, p.modul), pasi = a / 8;
    return { z: p.pereche, a, gauri: Math.abs(pasi - Math.round(pasi)) < 1e-6 && pasi >= 1 && pasi <= 14 ? Math.round(pasi) + 1 : 0 };
  }
  function randeazaPrinde() {
    const loc = $<HTMLDetailsElement>("#at-prinde"), pr = vedere === "piesa" && !privita ? prinderiCurente : [];
    loc.hidden = !pr.length;
    if (!pr.length) { $("#at-prinde-lista").innerHTML = ""; return; }
    const rez = Lego.rezumatPrinderi(pr), tip = stare.tip;
    $("#at-prinde-are").textContent = rez.map(({ fel, cate }) => `${cate} ${NUME_PRINDERI[fel]!()[cate === 1 ? 0 : 1]}`).join(" · ");
    // închis, panoul nu socotește piesele celelalte
    if (!loc.open) { $("#at-prinde-lista").innerHTML = ""; return; }
    const randuri = new Map<string, (readonly [string, string])[]>();
    for (const [, , piese] of FAMILII) for (const [k, n] of piese) {
      if (k === tip || k === "placaTechnic") continue;
      for (const [fel] of Lego.perechiFeluri(pr, prinderiPiesa(k))) {
        const l = randuri.get(fel) ?? [];
        if (!l.some(([x]) => x === k)) l.push([k, n]);
        randuri.set(fel, l);
      }
    }
    let html = rez.filter(({ fel }) => randuri.has(fel)).map(({ fel, cate }) => `<div data-rand="${fel}"><span class="at-prinde-unde">${NUME_PRINDERI[fel]!()[cate === 1 ? 2 : 3]}</span><div class="at-prinde-piese">${
      randuri.get(fel)!.map(([k, n]) => `<button type="button" data-prinde="${k}"><svg class="at-pict" viewBox="0 0 24 24" aria-hidden="true">${PICTOGRAME[k] ?? PICTOGRAMA_GENERICA}</svg>${n}</button>`).join("")}</div></div>`).join("");
    if (tip === "rotita") {
      const g = grindaPereche();
      html += `<div data-rand="pereche"><span>${g.gauri ? tr`Cu perechea de ${g.z} dinți, axele stau la ${fmt(g.a)} mm: pe o grindă de ${g.gauri}, în găurile de la capete.`
        : tr`Cu perechea de ${g.z} dinți, axele stau la ${fmt(g.a)} mm: nu cad pe grila de 8 mm.`}</span>${g.gauri ? `<button class="btn" type="button" data-prinde-grinda>Pune grinda în listă</button>` : ""}</div>`;
    }
    $("#at-prinde-lista").innerHTML = html;
  }
  function deschidePrinsa(k: string) {
    // axul și știftul vin cu lungimea potrivită piesei de pe ecran; celelalte, cum sunt în editorul lor
    const ax = k === "ax" ? Lego.axPentru(prinderiCurente) : null, st = k === "stiftTechnic" ? Lego.stiftPentru(prinderiCurente) : null;
    if (ax) stare.ax.lung = ax;
    if (st) stare.stiftTechnic.lung = st;
    inlocuieste = null; golesteCautarea();
    alegePiesa(k);
    if (ax) toast(tr`Ax de ${ax}: trece prin piesă și mai iese un pas.`);
    if (st) toast(tr`Știft de ${st}, cât gaura piesei.`);
  }
  function adaugaGrindaPereche() {
    // grinda dreaptă, groasă, cu găuri de știft (axele se rotesc în ele), cum ar face-o editorul grinzilor
    const g = grindaPereche(), n = bucatiCerute();
    if (!g.gauri) return;
    const def: Def = { tip: "grinda", celule: Array.from({ length: g.gauri }, (_, i): [number, number, string] => [i, 0, "r"]), groasa: true };
    pune(def, n);
    salveaza(); randeazaLista();
    toast(tr`${n} × ${numeDef(def)} în listă.`);
  }
  function arataPrivita() {
    const p = privita;
    $("#at-nume-piesa").textContent = p!.titlu;
    $("#at-cote").innerHTML = `<span><b>Mărime</b> ${tr`${fmt(p!.dim[0]!)} × ${fmt(p!.dim[1]!)} × ${fmt(p!.dim[2]!)} mm`}</span><span><b>Filament</b> ≈ ${fmt(p!.g)} g</span><span><b>Din circuit</b> ${p!.bucati} ${p!.bucati === 1 ? tr("bucată") : tr("bucăți")}</span>`;
    $("#at-avert").hidden = false; $("#at-avert").textContent = "E o piesă din circuitul de tren: o vezi aici, cum se așază pe pat. Se schimbă din 2D, la Export CNC.";
    $("#at-adauga").hidden = true; $("#at-bucati-rand").hidden = true; $("#at-in-model").hidden = true;
    randeazaPrinde();
    arata3D(p!.tri, false, true);
  }
  function construiesteCurent(pastreaza?: boolean) {
    clearTimeout(cronPiesa!); cronPiesa = null;
    prinderiCurente = [];
    if (vedere === "model") { randeazaPrinde(); return; }
    $("#at-adauga").hidden = false; $("#at-bucati-rand").hidden = false; $("#at-in-model").hidden = false;
    const def = defCurenta();
    if (def.tip === "dinCvs2" && !(def.contururi && def.contururi.length)) {
      // nicio formă primită încă: doar explicația din editor, fără piesă
      curent = null;
      randeazaPrinde();
      $("#at-adauga").hidden = true; $("#at-bucati-rand").hidden = true; $("#at-in-model").hidden = true;
      $("#at-nume-piesa").textContent = tr("Formă din cvs2"); $("#at-cote").innerHTML = ""; $("#at-avert").hidden = true;
      if (v3.ok && v3.mesh) { v3.scena.remove(v3.mesh); v3.mesh.geometry.dispose(); v3.mesh = null; randeaza(); }
      return;
    }
    try {
      const piese = pieseDin(def);
      let tri: Tri[], dim: number[];
      if (piese.length === 1) ({ tri, dim } = piese[0]!);
      else { Lego.seteaza(paramMotor()); const pl = Lego.aseaza(piese); tri = pl[0]!.tri; dim = dimTri(tri); }
      curent = { def, piese, tri, dim };
      // prinderile, doar ale unei piese singure (setul de calibrare n-are)
      if (piese.length === 1) prinderiCurente = piese[0]!.prinderi ?? [];
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
    } catch (e) { prinderiCurente = []; $("#at-avert").hidden = false; $("#at-avert").textContent = tr`Nu am putut face piesa: ${(e as Error).message || e}`; }
    randeazaPrinde();
  }

  // --------------------------------------------------------------------------- lista de printat
  function pune(def: Def, n: number) {
    const k = Lego.cheieDef(def), gasit = lista.find(x => Lego.cheieDef(x.def) === k);
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
  function normRoata(p: Def): Def {
    // ce nu ține de felul ales nu intră în piesă (două roți la fel sunt aceeași piesă); spițele, doar unde încap
    if (p.fel === "anvelopa") { delete p.spite; delete p.nrSpite; delete p.gaura; }
    else if (p.spite !== "disc" && !Lego.spiteIncap(p.janta ?? 16.8, p.gaura ?? "x")) p.spite = "disc";
    if (p.fel === "janta") { delete p.diam; delete p.banda; }
    if (p.spite === "disc") delete p.nrSpite;
    return p;
  }
  function adaugaJantaSiAnvelopa() {
    // janta și anvelopa de aceeași mărime (ADR 0280): janta din PLA, anvelopa din TPU, de pus una pe alta
    laZi();
    const d = defCurenta(), n = bucatiCerute(), p = stare.roata;
    const janta = normRoata({ tip: "roata", fel: "janta", janta: p.janta, lat: p.lat, spite: p.spite, nrSpite: p.nrSpite, gaura: p.gaura });
    const anvelopa = normRoata({ tip: "roata", fel: "anvelopa", diam: d.diam ?? p.diam, janta: p.janta, lat: p.lat, banda: p.banda });
    pune(janta, n); pune(anvelopa, n);
    salveaza(); randeazaLista();
    toast(tr`${n} × janta și anvelopa ${fmt(anvelopa.diam!)} × ${fmt(p.lat)} în listă (anvelopa, din TPU).`);
  }
  function normFulie(p: Def): Def {
    // fața, doar ce încape (altfel plină, cum o face și motorul); câte spițe, doar la spițe (două fulii la fel sunt aceeași piesă)
    const f = Lego.fulieFete(p);
    if (((p.spite === "drepte" || p.spite === "y") && !f.spite) || (p.spite === "stift" && !f.stift)) p.spite = "disc";
    if (p.spite !== "drepte" && p.spite !== "y") delete p.nrSpite;
    return p;
  }
  function adaugaPerecheFulii() {
    // fulia de acum și perechea ei (diametrul ales; același canal, aceeași lățime, față și gaură), cu cureaua dintre ele
    laZi();
    const d = defCurenta(), n = bucatiCerute(), p = stare.fulie, a = normFulie({ ...d, diam: p.pereche });
    pune(d, n); pune(a, n);
    salveaza(); randeazaLista();
    const cu = Lego.cureaua(d, a, p.distanta);
    toast(cu.atinge ? tr`${n} × fuliile Ø ${fmt(Lego.fulieFete(d).D)} și Ø ${fmt(Lego.fulieFete(a).D)} în listă (axele trebuie să fie la cel puțin ${fmt(cu.minim)} mm).`
      : tr`${n} × fuliile Ø ${fmt(Lego.fulieFete(d).D)} și Ø ${fmt(Lego.fulieFete(a).D)} în listă (cureaua: ${fmt(cu.lungime)} mm, cu axele la ${fmt(p.distanta)} mm).`);
  }
  function adaugaPerecheConice() {
    // roata conică de acum și perechea ei: dinții schimbați între ele (fiecare roată se face pentru cealaltă); același modul,
    // aceeași gaură și același butuc
    laZi();
    const d = defCurenta(), n = bucatiCerute(), a: Def = { ...d, dinti: d.pereche ?? 20, pereche: d.dinti ?? 20 }, m = Lego.conicaMontaj(d);
    pune(d, n); pune(a, n);
    salveaza(); randeazaLista();
    toast(tr`${n} × perechea conică ${m.z} + ${m.z2} în listă (fețele din spate la ${fmt(m.fata)} și ${fmt(m.fataPereche)} mm de axa celeilalte).`);
  }
  function adaugaPerecheCoroana() {
    // roata coroană de acum și pinionul ei: o roată dreaptă cu dinții pinionului, cât de groasă cere coroana, cu același modul
    // și aceeași gaură (câmpurile în ordinea roții dințate din editor, ca două roți la fel să fie aceeași piesă)
    laZi();
    const d = defCurenta(), n = bucatiCerute(), a = Lego.coroanaMontaj(d);
    if (!a.prinde) { toast(textCoroana(d)); return; }
    const pinion: Def = { tip: "rotita", dinti: a.z1, fel: "drepti", grosime: a.grosime, gaura: d.gaura ?? "x" };
    if (a.m !== 1) pinion.modul = a.m;
    pune(d, n); pune(pinion, n);
    salveaza(); randeazaLista();
    toast(tr`${n} × coroana ${a.z2} și pinionul ei de ${a.z1} în listă (axul pinionului la ${fmt(a.axa, 2)} mm deasupra feței de jos a coroanei, mijlocul lui la ${fmt(a.mijloc, 2)} mm de axul ei).`);
  }
  function adaugaPerecheDuble() {
    // conica dublă de acum și perechea ei (dinții aleși; același modul și aceeași gaură)
    laZi();
    const d = defCurenta(), n = bucatiCerute(), z2 = stare.conicaDubla.pereche, a: Def = { ...d, dinti: z2 }, m = Lego.dublaMontaj(d, z2);
    pune(d, n); pune(a, n);
    salveaza(); randeazaLista();
    toast(tr`${n} × perechea de conice duble ${m.z} + ${m.z2} în listă (pe axe paralele, axele la ${fmt(m.paralel, 2)} mm; la 90°, planurile de mijloc la ${fmt(m.acesta, 2)} și ${fmt(m.perechea, 2)} mm de axul celeilalte).`);
  }
  function adaugaSenila() {
    // zalele câte cere montajul (pentru fiecare bucată cerută) și cele două pinioane, cu gaura aleasă
    laZi();
    const p = stare.senila, n = bucatiCerute(), m = Lego.senilaMontaj(p.dinti, p.pereche, (p.distanta ?? 8) * 8);
    if (m.aproape) { toast(tr`Pinioanele de ${m.z1} și ${m.z2} s-ar atinge: depărtează axele.`); return; }
    pune({ tip: "senila", piesa: "zala", gauriStift: p.gauriStift === "nu" ? "nu" : "da" }, n * m.zale);
    pune({ tip: "senila", piesa: "pinion", dinti: m.z1, gaura: p.gaura }, n);
    pune({ tip: "senila", piesa: "pinion", dinti: m.z2, gaura: p.gaura }, n);
    salveaza(); randeazaLista();
    toast(tr`${n} × șenila (${zaleText(m.zale)}) și pinioanele de ${m.z1} și ${m.z2} în listă (axele la ${fmt(m.d, 2)} mm; întinsă, la ${fmt(m.intins, 2)}).`);
  }
  function adaugaBradLego() {
    // brăduțul întreg, de jos în sus: trunchiul, etajele (de la cel din editor, cu câte două știfturi mai puțin), vârful
    // și steaua, câte bucăți sunt cerute
    laZi();
    const n = bucatiCerute(), piese = Lego.bradLegoPiese(stare.bradLego), etaje = piese.filter(x => x.piesa === "etaj").length;
    for (const d of piese) pune(d as Def, n);
    salveaza(); randeazaLista();
    toast(tr`${n} × brăduțul (trunchiul, ${etaje === 1 ? tr("un etaj") : tr`${etaje} etaje`}, vârful și steaua) în listă.`);
  }
  function textTurnanta(p: { piesa?: string; marime?: number; joc?: number }): string {
    // pivotul bazei în gaura părții de sus: diametrele și jocul de jur împrejur; ce faci dacă se rotește greu sau iese ușor
    const q = Lego.turnantaCote({ ...p, piesa: "baza" });
    return tr`Pivotul are Ø${fmt(q.pivotD, 2)} mm, iar gaura din calibrare, Ø${fmt(q.gauraD, 2)} mm: ${fmt(q.jocRadial, 3)} mm de jur împrejur.` + " " +
      tr("Dacă partea de sus se rotește prea greu, mărește jocul pivotului cu 0,05 mm; dacă iese prea ușor de pe pivot, micșorează-l.");
  }
  function adaugaTurnanta() {
    // baza și partea de sus (aceeași mărime; jocul e al bazei), câte bucăți sunt cerute
    laZi();
    const n = bucatiCerute();
    pune(defCurenta("turnanta", { ...stare.turnanta, piesa: "baza" }), n);
    pune(defCurenta("turnanta", { ...stare.turnanta, piesa: "sus" }), n);
    salveaza(); randeazaLista();
    toast(tr`${n} × placa turnantă (baza și partea de sus) în listă.`);
  }
  function adaugaVentilator() {
    // rotorul și carcasa lui (aceleași palete, diametru, joc, pas și lățime), câte bucăți sunt cerute
    laZi();
    const n = bucatiCerute();
    pune(defVentilator("rotor"), n);
    pune(defVentilator("carcasa"), n);
    salveaza(); randeazaLista();
    toast(tr`${n} × ventilatorul (rotorul și carcasa) în listă.`);
  }
  function adaugaPerecheElice() {
    // aceeași elice, o dată pe dreapta și o dată pe stânga (pentru două motoare care se rotesc invers), câte bucăți sunt cerute
    laZi();
    const n = bucatiCerute(), d = defCurenta();
    pune({ ...d, sens: "dreapta" }, n);
    pune({ ...d, sens: "stanga" }, n);
    salveaza(); randeazaLista();
    toast(tr`${n} × perechea de elice (dreapta și stânga) în listă.`);
  }
  function adaugaPerecheRoti() {
    // roata de acum și perechea ei (dinții aleși; aceeași grosime, gaură și modul); la oblici și în V, cu sensul opus
    laZi();
    const d = defCurenta(), n = bucatiCerute(), z2 = stare.rotita.pereche, a: Def = { ...d, dinti: z2 };
    if (d.fel === "oblici" || d.fel === "inv") a.sens = d.sens === "stanga" ? "dreapta" : "stanga";
    pune(d, n); pune(a, n);
    salveaza(); randeazaLista();
    toast(tr`${n} × perechea ${d.dinti ?? 24} + ${z2} în listă (axele la ${fmt(Lego.distantaRoti(d.dinti ?? 24, z2, d.modul ?? 1))} mm).`);
  }
  function adaugaPerecheCremaliera() {
    // cremaliera de acum și roata ei pereche: dinți drepți, cu același modul; roata, cum o face editorul roților (3,8 mm, gaură de ax)
    laZi();
    const d = defCurenta(), n = bucatiCerute(), q = Lego.cremalieraMontaj(d), roata: Def = { tip: "rotita", dinti: q.z, fel: "drepti", grosime: 3.8, gaura: "x" };
    if (q.m !== 1) roata.modul = q.m;
    pune(d, n); pune(roata, n);
    salveaza(); randeazaLista();
    toast(tr`${n} × cremaliera 1×${q.lung} și roata de ${q.z} în listă (axul roții la ${fmt(q.axa)} mm deasupra feței de jos).`);
  }
  function adaugaPerecheMelc() {
    // melcul de acum și roata lui pereche: o roată dreaptă cu modulul 1, cum o face editorul roților (3,8 mm, gaură de ax)
    laZi();
    const d = defCurenta(), n = bucatiCerute(), m = Lego.melcMontaj(d, stare.melc.pereche), roata: Def = { tip: "rotita", dinti: m.dinti, fel: "drepti", grosime: 3.8, gaura: "x" };
    pune(d, n); pune(roata, n);
    salveaza(); randeazaLista();
    toast(tr`${n} × melcul Ø${d.diam} și roata de ${m.dinti} în listă (axele la ${fmt(m.distanta)} mm, în cruce).`);
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
    const l = [tr("PIESE DE PRINTAT — din atelierul 3D din Easy 3Draw"), new Date().toLocaleString(Limba.locala), "",
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
      tr`- Variantele folosite: știft ${setari.varianta_stift}, locaș ${setari.varianta_locas}, gaură ${setari.varianta_gaura}, ax ${setari.varianta_ax}, clemă și bară ${setari.varianta_bara}, cupă ${setari.varianta_cupa}, roți dințate ${setari.varianta_dinti}, jantă ${setari.varianta_janta} (3 = mijlocul).`,
      tr`- Înălțimile: știftul ${fmt(Lego.inaltimi(setari).stift_h)} mm, locașul de sub piesele pline ${fmt(Lego.inaltimi(setari).locas_h)} mm.`,
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
    // în vederea modelului, și editorul: timpul pieselor (debitul) și verificarea urmează imprimanta aleasă
    if (pornit) { if (vedere === "model") { editorModel(); arataModel(true); } else if (privita) arataPrivita(); else construiesteCurent(true); randeazaLista(); }
  }
  function reglaje() {
    rezumatImprimanta();
    if (uiImprimante) uiImprimante.desen();
    const loc = $("#at-reglaje");
    campuriVariante(loc);
    loc.insertAdjacentHTML("beforeend", [["pat.0", "Patul: lățime (mm)", setari.pat[0], 60, 500], ["pat.1", "Patul: adâncime (mm)", setari.pat[1], 60, 500],
      ["pat_margine", "Margine (mm)", setari.pat_margine, 0, 30], ["pat_distanta", "Între piese (mm)", setari.pat_distanta, 1, 20], ["debit", "Debitul mediu (mm³/s)", setari.debit, 1, 50]]
      .map(([k, e, v, a, b]) => `<label for="at-r-${k}">${e}<input id="at-r-${k}" data-setare="${k}" type="number" min="${a}" max="${b}" step="1" value="${v}"></label>`).join(""));
  }
  function schimbaSetare(ev: Event) {
    if ((ev.target as HTMLElement).id === "at-cu-tren") { setari.cuTren = (ev.target as HTMLInputElement).checked; salveaza(); randeazaLista(); return; }
    const t = ev.target as HTMLElement;
    if (t.matches('[data-bifa="locas_urmeaza"]')) { setari.locas_urmeaza = (t as HTMLInputElement).checked; inaltimiSchimbate(); return; }
    const el = t.closest<CampNumeric>("[data-setare]");
    if (!el) return;
    const k = el.dataset.setare;
    if (k === "stift_h" || k === "locas_h") {
      // la zecimi (ADR 0168); ce nu e numar arata inapoi valoarea de acum
      const n = +String(el.value).replace(",", ".");
      if (String(el.value).trim() !== "" && Number.isFinite(n)) setari[k] = n;
      inaltimiSchimbate(); return;
    }
    const v = Math.round(+String(el.value).replace(",", "."));
    if (!Number.isFinite(v)) return;
    if (k!.startsWith("pat.")) setari.pat[+k!.slice(4)] = Math.min(500, Math.max(60, v));
    else if (k!.startsWith("varianta_")) (setari as Valori)[k!] = Math.min(9, Math.max(-3, v));
    else if (k === "debit") { setari.debit = debitBun(v); el.value = setari.debit; }
    else (setari as Valori)[k!] = Math.max(0, v);
    document.querySelectorAll<CampNumeric>(`#mod-3d [data-setare="${k}"]`).forEach(x => { if (x !== el) x.value = el.value; });
    dupaSchimbare();
  }
  function dupaSchimbare() {
    if (imprimante) Profiluri.memoreaza(imprimante, valoriImprimanta());
    rezumatImprimanta();
    salveaza(); if (vedere === "model") { editorModel(); arataModel(true); } else if (privita) arataPrivita(); else construiesteCurent(true); randeazaLista();
  }
  let cronSalvare: ReturnType<typeof setTimeout> | null = null;
  function salveaza() {
    // construcțiile (ADR 0284, 3.Ch), cu cea aleasă la zi; `model` rămâne al ei, ca o pagină de dinainte să-l găsească
    tineConstructia();
    const date = { setari, lista, stare, model, constructii, activa, imprimante };
    try { localStorage.setItem(CHEIE, JSON.stringify(date)); } catch (e) { /* fara stocare locala */ }
    const inDb = async () => {
      if (!db) return;
      try { await db.doc("atelier/curent").set({ setari, lista, stare: JSON.parse(JSON.stringify(stare)), model, constructii, activa, imprimante: JSON.parse(JSON.stringify(imprimante)), actualizat: new Date().toISOString() }); } catch (e) { /* raman cele locale */ }
    };
    // in cvs2 (ADR 0164), salvarea amanata o tine gazda: o porneste pe loc la inchiderea ferestrei
    if (window.cvs2) { window.cvs2.amana("atelier", inDb, 700); return; }
    clearTimeout(cronSalvare!);
    cronSalvare = setTimeout(inDb, 700);
  }
  /** Ce stă în stocare (de la o versiune oarecare a paginii): se citește doar ce se poate. */
  type Stocat = { setari?: Valori & { pat?: number[] }; imprimante?: Imprimante | null; lista?: InLista[]; model?: InModel[];
    constructii?: ({ id?: unknown; nume?: unknown; nr?: unknown; model?: unknown } | null)[]; activa?: unknown;
    stare?: Record<string, unknown> & { tip?: string; grinda?: { gauri?: string[]; celule?: unknown } } };
  function incarca(d: Stocat | null | undefined) {
    if (!d || typeof d !== "object") return;
    if (d.setari) setari = { ...SETARI_IMPLICIT, ...d.setari, pat: Array.isArray(d.setari.pat) ? d.setari.pat.slice(0, 2) : SETARI_IMPLICIT.pat.slice() };
    // imprimantele; pagina se deschide cu cea implicita
    imprimante = Profiluri.curata(d.imprimante || imprimante, valoriImprimanta(), tr("Imprimanta mea"));
    puneImprimanta(Profiluri.laDeschidere(imprimante));
    if (Array.isArray(d.lista)) lista = d.lista.filter(x => x && x.def && x.def.tip && x.bucati > 0);
    /** Piesele unui model din stocare: doar cele care se pot citi; o legătură fără bază (sau cu piesa însăși) nu se ține. */
    const curataModel = (lista: InModel[]): InModel[] => {
      const m = lista.filter(x => x && x.def && x.def.tip && x.def.tip !== "calibrare" && Number.isFinite(x.x) && Number.isFinite(x.y) && Number.isFinite(x.z))
        .map(x => {
          const m: InModel = { id: String(x.id || idNou()), def: x.def, x: Math.round(x.x), y: Math.round(x.y), z: Math.round(x.z), rot: ((Math.round(x.rot) || 0) % 4 + 4) % 4, culoare: /^#[0-9a-f]{6}$/i.test(x.culoare) ? x.culoare : "#c8322b" };
          // legatura si locul liber (ADR 0284, 3.Cf), doar cu forma buna; daca prinderile chiar se potrivesc judeca motorul
          const q = x.prins as Partial<PrinsM> | undefined, l = x.liber as Partial<Transf> | undefined;
          if (q && typeof q === "object" && typeof q.de === "string" && Number.isInteger(q.a) && q.a! >= 0 && Number.isInteger(q.b) && q.b! >= 0)
            m.prins = { de: q.de, a: q.a!, b: q.b!, unghi: Number.isFinite(q.unghi) ? ((q.unghi! % 360) + 360) % 360 : 0, alunec: Number.isFinite(q.alunec) ? Math.max(-200, Math.min(200, q.alunec!)) : 0 };
          if (l && typeof l === "object" && Array.isArray(l.m) && l.m.length === 9 && Array.isArray(l.t) && l.t.length === 3 && [...l.m, ...l.t].every(v => Number.isFinite(v)))
            m.liber = { m: l.m.slice(), t: [l.t[0]!, l.t[1]!, l.t[2]!] };
          return m;
        });
      for (const x of m) if (x.prins && (x.prins.de === x.id || !m.some(y => y.id === x.prins!.de))) delete x.prins;
      return m;
    };
    // construcțiile (ADR 0284, 3.Ch): fiecare intrare cu piese se citește; id-urile și numerele se fac unice, iar un nume
    // luat primește numărul următor. Fără ele, modelul de dinainte e o construcție fără nume.
    const stocate = Array.isArray(d.constructii) ? d.constructii.filter(c => c && typeof c === "object" && Array.isArray(c.model)) : [];
    if (stocate.length) {
      constructii = [];
      for (const c of stocate) {
        const nume = Lego.curataNume(c!.nume), nr = c!.nr;
        constructii.push({
          id: typeof c!.id === "string" && c!.id && !constructii.some(x => x.id === c!.id) ? c!.id : idNou(),
          nume: nume ? Lego.numeLiber(constructii.map(numeC), nume) : "",
          nr: Number.isInteger(nr) && (nr as number) >= 1 && !constructii.some(x => x.nr === nr) ? nr as number : Lego.nrLiber(constructii.map(x => x.nr)),
          model: curataModel(c!.model as InModel[]),
        });
      }
      const a = constructii.find(x => x.id === d.activa) ?? constructii[0]!;
      activa = a.id; model = a.model;
    } else if (Array.isArray(d.model)) {
      model = curataModel(d.model);
      constructii = [{ id: idNou(), nume: "", nr: 1, model }]; activa = constructii[0]!.id;
    }
    tineConstructia();
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
  // Căutarea peste toate filele (ADR 0281, felia 3.Tp↑a): textul scris de om; cât nu e gol, galeria arată piesele găsite.
  let cautare = "";
  /** Cuvintele unui text, de potrivit: fără diacritice (ș și ş, ț și ţ, la fel), fără majuscule, despărțite de orice nu e
   *  literă sau cifră („Bucșă / conector” → bucsa, conector). */
  const cuvinte = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  /** Piesele găsite, din toate familiile, în ordinea filelor și a galeriilor: fiecare cuvânt căutat începe un cuvânt din numele
   *  de pe ecran (în limba paginii): „con” găsește Rotund / con, Bucșă / conector, Roată conică, Conică dublă. */
  function pieseGasite(q: string): (readonly [string, string])[] {
    const cautate = cuvinte(q);
    return FAMILII.flatMap(([, , piese]) => piese).filter(([, n]) => {
      const din = cuvinte(tr(n));
      return cautate.length > 0 && cautate.every(c => din.some(w => w.startsWith(c)));
    });
  }
  function cauta(q: string) { cautare = q; marcheazaFile(); }
  /** O filă aleasă golește căutarea (galeria se întoarce la familia piesei). */
  function golesteCautarea() { cautare = ""; $<HTMLInputElement>("#at-cauta").value = ""; }
  /** Filele de sus după piesa de acum (ADR 0281): apăsată fila ei, iar dedesubt galeria familiei, cu piesa apăsată (cât se
   *  vede modelul, nicio filă și nicio galerie); familia își ține minte piesa. Cu o căutare, galeria arată piesele găsite (și
   *  peste model sau peste o filă proprie). */
  function marcheazaFile() {
    const f = filaPentru(stare.tip), fam = FAMILII.find(([x]) => x === f), g = $("#at-galerie");
    const q = cautare.trim();
    if (fam) ultima.set(f, stare.tip);
    document.querySelectorAll<HTMLElement>("#at-tipuri [data-fila]").forEach(b => b.setAttribute("aria-pressed", String(vedere === "piesa" && b.dataset.fila === f)));
    g.hidden = vedere !== "piesa" || !fam;
    if (q) {
      // piesele găsite, făcute din nou doar la alt text: cât se încearcă pe rând, butoanele (și focusul) rămân
      g.hidden = false;
      if (g.dataset.cautare !== q) {
        g.dataset.cautare = q; delete g.dataset.familie; g.setAttribute("aria-label", "Piesele găsite");
        const gasite = pieseGasite(q);
        if (gasite.length) g.innerHTML = gasite.map(([k, n]) => butonPiesa(k, n)).join("");
        else { g.innerHTML = `<p class="mic at-galerie-gol"></p>`; g.firstElementChild!.textContent = tr`Nicio piesă nu se potrivește cu „${q}”.`; }
      }
    } else {
      if (!fam) return;
      // galeria se face din nou doar la altă familie: în aceeași, butoanele (și focusul de pe ele) rămân, se mută doar apăsarea
      if (g.dataset.familie !== f) {
        g.dataset.familie = f; g.setAttribute("aria-label", fam[1]);
        delete g.dataset.cautare;
        g.innerHTML = fam[2].map(([k, n]) => butonPiesa(k, n)).join("");
      }
    }
    g.querySelectorAll<HTMLElement>("[data-piesa]").forEach(b => b.setAttribute("aria-pressed", String(vedere === "piesa" && b.dataset.piesa === stare.tip)));
  }
  function alegeTip(t: string) {
    stare.tip = t; privita = null;
    if (vedere === "model") { vedere = "piesa"; $("#at-act-piesa").hidden = false; $("#at-act-model").hidden = true; $("#at-culori").hidden = false; document.querySelectorAll<HTMLElement>("#at-vedere-mod [data-v]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === "piesa"))); }
    marcheazaFile();
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
  /**
   * Formele trimise din desenul cvs2 (ADR 0166 §D): contururile închise intră în fila „Din cvs2” (cel mult 50 000 de puncte),
   * cele deschise doar se numără; un refuz al lui cvs2 (prea mare, nimic) se spune acolo.
   */
  function formeDinCvs2(f: import("../../../api.ts").FormeCvs2) {
    const p = stare.dinCvs2;
    p.contururi = []; p.deschise = 0; p.refuz = "";
    if (!f || !f.ok) p.refuz = f && !f.ok ? f.motiv : "nimic";
    else {
      const inchise = f.contururi.filter(c => c.inchis && c.puncte.length >= 3);
      if (inchise.reduce((t, c) => t + c.puncte.length, 0) > 50000) p.refuz = "atelier";
      else if (!inchise.length) p.refuz = "nimic";
      else { p.contururi = inchise.map(c => c.puncte.map(([x, y]): [number, number] => [x, y])); p.deschise = f.contururi.length - inchise.length; }
    }
    inlocuieste = null;
    if (pornit) alegeTip("dinCvs2"); else { stare.tip = "dinCvs2"; salveaza(); }
  }
  async function init() {
    if (!window.Lego) return;
    try { incarca(JSON.parse(localStorage.getItem(CHEIE) || "null") || {}); } catch (e) { incarca({}); }
    // filele familiilor (ADR 0281), din tabelă, înaintea filelor proprii; una deschide ultima piesă aleasă în familie
    $("#at-tipuri").insertAdjacentHTML("afterbegin", FAMILII.map(([f, nume, piese]) =>
      `<button type="button" data-fila="${f}" aria-pressed="false">${nume} <span class="at-nr" aria-hidden="true">${piese.length}</span></button>`).join(""));
    // fila „Din cvs2” doar în cvs2, cu formele deschise extensiei (ADR 0166)
    const cuForme = !!(window.cvs2 && window.cvs2.forme);
    const filaForme = document.querySelector<HTMLElement>('#at-tipuri [data-fila="dinCvs2"]');
    if (filaForme) filaForme.hidden = !cuForme;
    if (stare.tip === "dinCvs2" && !cuForme) stare.tip = "caramida";
    uiImprimante = Profiluri.ui<Valori>($("#prof-imprimanta"), {
      eticheta: "Imprimanta", fel: "imprimanta",
      ajutor: "Fiecare imprimantă își ține patul, variantele de la calibrare, înălțimile și cuplajele pieselor de cale printate (din 2D). Ce schimbi aici se scrie în imprimanta aleasă; pagina se deschide cu cea implicită (★).",
      stare: () => imprimante!, salveaza: s => { imprimante = s; salveaza(); rezumatImprimanta(); }, valori: valoriImprimanta, aplica: aplicaImprimanta,
    });
    culori(); reglaje();
    $("#at-tipuri").onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-fila]"); if (!b) return; inlocuieste = null; golesteCautarea(); alegeTip(ultima.get(b.dataset.fila!) ?? b.dataset.fila!); };
    $("#at-galerie").onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-piesa]"); if (!b) return; inlocuieste = null; alegePiesa(b.dataset.piesa!); };
    // căutarea (3.Tp↑a): la fiecare literă, galeria arată piesele găsite; Enter alege prima (Escape și × golesc câmpul de
    // căutare singure, cu `input`, ca orice câmp `type="search"`)
    const campCautare = $<HTMLInputElement>("#at-cauta");
    campCautare.oninput = () => cauta(campCautare.value);
    campCautare.onkeydown = ev => {
      const prima = ev.key === "Enter" && cautare.trim() ? document.querySelector<HTMLElement>("#at-galerie [data-piesa]") : null;
      if (prima) { ev.preventDefault(); inlocuieste = null; alegePiesa(prima.dataset.piesa!); }
    };
    $("#at-adauga").onclick = adaugaInLista;
    $("#at-stl").onclick = descarcaSTL;
    $("#at-zip").onclick = descarcaZip;
    $("#at-tabel").addEventListener("click", ev => {
      if ((ev.target as Element).closest<HTMLElement>("#at-la-setari")) { if (window.TrenPentru3D) window.TrenPentru3D.setari(); return; }
      operatieLista(ev);
    });
    $("#at-in-model").onclick = puneInModel;
    // „Se prinde cu”: la deschidere se socotesc piesele; un clic pe una o deschide
    $("#at-prinde").addEventListener("toggle", randeazaPrinde);
    $("#at-prinde-lista").onclick = ev => {
      const t = ev.target as Element, b = t.closest<HTMLElement>("[data-prinde]");
      if (b) deschidePrinsa(b.dataset.prinde!);
      else if (t.closest("[data-prinde-grinda]")) adaugaGrindaPereche();
    };
    $("#at-unghi").onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-u]"); if (b) alegeUnghi(b.dataset.u!); };
    $("#at-vedere-mod").onclick = ev => { const b = (ev.target as Element).closest<HTMLElement>("[data-v]"); if (b && b.dataset.v !== vedere) alegeVedere(b.dataset.v!); };
    $("#at-model-lista").onclick = modelInLista;
    $("#at-model-goleste").onclick = () => { $("#at-model-confirma").hidden = false; };
    $("#at-model-goleste-da").onclick = () => { model = []; alegeM(null); inlocuieste = null; $("#at-model-confirma").hidden = true; dupaModel(); };
    $("#at-vedere").addEventListener("keydown", tasteModel);
    $("#at-goleste").onclick = () => { $("#at-confirma").hidden = false; };
    $("#at-goleste-da").onclick = () => { lista = []; $("#at-confirma").hidden = true; salveaza(); randeazaLista(); };
    $("#mod-3d").addEventListener("change", schimbaSetare);
    editor();
    try { db = window.claude ? await window.claude.use("db") : null; } catch (e) { db = null; }
    if (db) {
      try {
        const d = await db.doc("atelier/curent").get();
        if (d.exists) { incarca(d.data()); marcheazaFile(); culori(); reglaje(); if (v3.ok) v3.mat.color.set(setari.culoare); if (vedere === "model") { if (pornit) { editorModel(); arataModel(); } } else { editor(); if (pornit) construiesteCurent(); } if (pornit) { randeazaLista(); butonModel(); } }
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
  return { init, intra, formeDinCvs2, reimprospateaza: () => { tren.cheie = null; if (pornit) randeazaLista(); }, pat: () => ({ pat: setari.pat.slice(), margine: setari.pat_margine }),
    // cuplajele printate s-au schimbat in 2D: se scriu in imprimanta aleasa
    printSchimbat: () => { if (imprimante) { Profiluri.memoreaza(imprimante, valoriImprimanta()); salveaza(); } },
    imprimanta: () => { const a = imprimante && imprimante.lista.find(p => p.id === imprimante!.activ); return a ? a.nume : ""; } };
})();
