/**
 * ORACOLUL documentului v2 (ADR 0024, varianta D: piese cu arbore, instanțe pe foi), cu ZERO importuri din `src/`.
 * Totul e scris din textul contractului, cu „Precizările contractului” 1–10, nu din codul aplicației: matricea, ordinea
 * elementelor în lume, migrarea v1 → v2, marginile lumii și regulile de validitate au aici propria lor copie. Dacă
 * aplicația și oracolul ar citi același fișier, o greșeală acolo ar trece prin amândouă.
 *
 * Convenția matricei (aceeași ca în tot proiectul, rescrisă aici): x′ = a·x + c·y + e, y′ = b·x + d·y + f;
 * `compuneO(m2, m1)` aplică întâi m1, apoi m2; rotirea e trigonometrică, în grade.
 *
 * Din precizări (le urmez literal):
 * - adâncimea se numără în niveluri, rădăcina e nivelul 1 (32 trec, 33 nu); plafoanele de noduri și de instanțe sunt
 *   totaluri pe document, cu grupurile numărate ca noduri;
 * - compunerea merge de sus în jos: M = instanța, apoi M = compune(M, nod) pentru fiecare nod de pe drum. Rotirea
 *   neexactă folosește cos(r·π/180), sin(r·π/180), cu r adus în [0, 360): un r deja în interval rămâne NESCHIMBAT
 *   (`((r % 360) + 360) % 360` l-ar muta în ultimii biți: 0,1 → 0,10000000000002274);
 * - mărimile sunt strict pozitive, 0 ≤ razaColt ≤ min(latime, inaltime) / 2, `rev` e un întreg sigur ≥ 0; `nume`
 *   ≤ 200 de caractere, `campuri` ≤ 200 de chei, cheia ≤ 200, valoarea ≤ 10 000 (lungimile sunt unități UTF-16, ca
 *   `string.length`);
 * - lumea e mărginită: matricea compusă a fiecărui nod față de rădăcina piesei (pornind de la identitate), |x|, |y| ale
 *   instanței și cele cel mult 100 000 de elemente în lume de pe toate foile; categoria `[margini]`;
 * - o formă cu arce (cercul, dreptunghiul cu razaColt > 0) stă doar sub o matrice compusă (față de rădăcina piesei)
 *   care e similitudine, cu toleranța 1e-12 · max(hypot(a, b), hypot(c, d), 1) și determinantul ≠ 0; o formă pe care
 *   consumatorii n-o pot desena e categoria `[forma]`. Similitudinea se judecă doar sub o matrice compusă în margini
 *   (altfel problema e deja `[margini]`);
 * - tot JSON-ul are cel mult 200 de niveluri (fiecare obiect sau listă e un nivel, documentul e nivelul 1);
 * - migrarea păstrează câmpurile necunoscute ale matricei și refuză ciocnirile de nume (`[ciocnire]`); un v1 se
 *   primește doar dacă documentul MIGRAT respectă contractul v2 (marginile, forma și adâncimea se judecă pe el).
 */

export type MatriceO = {
  readonly a: number; readonly b: number; readonly c: number;
  readonly d: number; readonly e: number; readonly f: number;
};

export type PunctO = { readonly x: number; readonly y: number };

/** Un obiect cu câmpuri necunoscute: contractul le păstrează pe toate. */
export type Liber = { [cheie: string]: unknown };

export type GrupO = Liber & { tip: 'grup'; id: string; nume?: string; matrice: MatriceO; copii: NodO[] };
export type ElementO = Liber & { tip: 'element'; id: string; nume?: string; forma: Liber; matrice: MatriceO };
export type NodO = GrupO | ElementO;
export type PiesaO = Liber & { id: string; nume?: string; radacina: NodO };
export type InstantaO = Liber & {
  id: string; piesa: string; x: number; y: number; rotire: number; campuri?: { [cheie: string]: string };
};
export type StocO = Liber & { latime: number; inaltime: number; grosime: number };
export type FoaieO = Liber & { id: string; nume?: string; stoc: StocO; instante: InstantaO[] };
export type DocV2O = Liber & { schema: 2; rev: number; piese: PiesaO[]; foi: FoaieO[] };

export type ElementV1O = Liber & { id: string; nume?: string; forma: Liber; matrice: MatriceO };
export type DocV1O = Liber & { schema: 1; rev: number; foaie: StocO; elemente: ElementV1O[] };

export type ElementLumeO = { idLume: string; forma: unknown; matrice: MatriceO };

export type CategorieO =
  | 'schema' | 'id' | 'unic-piese' | 'unic-foi' | 'unic-instante' | 'unic-noduri' | 'unic-elemente' | 'referinta'
  | 'adancime' | 'rotire' | 'finit' | 'plafon' | 'foi' | 'pozitiv' | 'margini' | 'ciocnire' | 'forma';

export const PLAFOANE_O = {
  latura: 10_000,
  grosime: 1_000,
  noduri: 100_000,
  instante: 100_000,
  foi: 1_000,
  adancime: 32,
  idLungime: 64,
  numeLungime: 200,
  elementeV1: 100_000,
  /** |a|, |b|, |c|, |d| ai matricei compuse față de rădăcina piesei. */
  coeficient: 10_000,
  /** |e|, |f| ai matricei compuse față de rădăcina piesei, în mm. */
  translatie: 10_000_000,
  /** |x|, |y| ai instanței, în mm. */
  pozitie: 10_000_000,
  /** Elementele în lume ale tuturor foilor (cât plafonul de elemente din v1). */
  elementeLume: 100_000,
  /** Niveluri de imbricare ale întregului JSON (documentul e nivelul 1). */
  adancimeJson: 200,
  campuriChei: 200,
  campuriCheie: 200,
  campuriValoare: 10_000,
  /** Toleranța similitudinii, relativă la scară. */
  similitudine: 1e-12,
} as const;

// ---------------------------------------------------------------------------------------------------------------
// Matricea, scrisă din convenție (p′ = m2(m1(p)), dezvoltat pe hârtie).

export const IDENTITATE_O: MatriceO = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

/** `compuneO(m2, m1)`: întâi m1, apoi m2. */
export function compuneO(m2: MatriceO, m1: MatriceO): MatriceO {
  return {
    a: m2.a * m1.a + m2.c * m1.b,
    b: m2.b * m1.a + m2.d * m1.b,
    c: m2.a * m1.c + m2.c * m1.d,
    d: m2.b * m1.c + m2.d * m1.d,
    e: m2.a * m1.e + m2.c * m1.f + m2.e,
    f: m2.b * m1.e + m2.d * m1.f + m2.f,
  };
}

export function aplicaO(m: MatriceO, p: PunctO): PunctO {
  return { x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f };
}

export function translatieO(x: number, y: number): MatriceO {
  return { a: 1, b: 0, c: 0, d: 1, e: x, f: y };
}

/** Cosinusul și sinusul exacte la multiplii de 90° (contractul), altfel `Math.cos` / `Math.sin`. */
const EXACTE_O: ReadonlyMap<number, readonly [number, number]> = new Map([
  [0, [1, 0]], [90, [0, 1]], [180, [-1, 0]], [270, [0, -1]],
]);

/** Rotirea trigonometrică (în sens invers acelor de ceas), în grade: (1, 0) ajunge în (cos, sin). */
export function rotatieO(grade: number): MatriceO {
  const r = grade >= 0 && grade < 360 ? grade : ((grade % 360) + 360) % 360;
  const exact = EXACTE_O.get(r);
  const cos = exact ? exact[0] : Math.cos((r * Math.PI) / 180);
  const sin = exact ? exact[1] : Math.sin((r * Math.PI) / 180);
  return { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 };
}

/** Precizarea 5: o matrice compusă față de rădăcina piesei e în margini (NaN și ±∞ nu sunt). */
export function inMarginiO(m: MatriceO): boolean {
  const coeficienti = [m.a, m.b, m.c, m.d].every((v) => Math.abs(v) <= PLAFOANE_O.coeficient);
  const translatii = [m.e, m.f].every((v) => Math.abs(v) <= PLAFOANE_O.translatie);
  return coeficienti && translatii;
}

/** Precizarea 5: rotire + scalare uniformă, eventual cu oglindire, în toleranța relativă; determinantul ≠ 0. */
export function esteSimilitudineO(m: MatriceO): boolean {
  const scara = Math.max(Math.hypot(m.a, m.b), Math.hypot(m.c, m.d), 1);
  const toleranta = PLAFOANE_O.similitudine * scara;
  const directa = Math.abs(m.a - m.d) <= toleranta && Math.abs(m.b + m.c) <= toleranta;
  const oglindita = Math.abs(m.a + m.d) <= toleranta && Math.abs(m.b - m.c) <= toleranta;
  const determinant = m.a * m.d - m.b * m.c;
  return (directa || oglindita) && determinant !== 0;
}

/**
 * Un obiect sau o listă mai adâncă decât `max` niveluri (valoarea însăși e nivelul 1). Iterativ, cu oprire la prima
 * depășire: un lanț de 100 000 de niveluri nu umple stiva.
 */
export function preaAdancJsonO(v: unknown, max: number): boolean {
  const stiva: Array<readonly [unknown, number]> = [[v, 1]];
  for (let pas = stiva.pop(); pas !== undefined; pas = stiva.pop()) {
    const [x, nivel] = pas;
    if (typeof x !== 'object' || x === null) continue;
    if (nivel > max) return true;
    for (const copil of Object.values(x)) if (typeof copil === 'object' && copil !== null) stiva.push([copil, nivel + 1]);
  }
  return false;
}

// ---------------------------------------------------------------------------------------------------------------
// Elementele în lume.

/** v1: fiecare element e propria lui instanță, cu matricea neschimbată. */
export function geometrieV1(doc: DocV1O): ElementLumeO[] {
  return doc.elemente.map((e) => ({ idLume: `${e.id}/${e.id}`, forma: e.forma, matrice: e.matrice }));
}

/**
 * v2, o foaie: instanțele în ordinea foii; în fiecare piesă, elementele în preordine (grupurile nu desenează nimic).
 * Matricea în lume: M = instanța, apoi M = compune(M, nod) pe drum, de la rădăcină în jos. Documentul e presupus valid.
 */
export function geometrieV2(doc: DocV2O, indexFoaie = 0): ElementLumeO[] {
  const foaie = doc.foi[indexFoaie];
  if (foaie === undefined) throw new Error(`foaia ${indexFoaie} nu există`);
  const piese = new Map<string, PiesaO>();
  for (const p of doc.piese) piese.set(p.id, p);
  const rez: ElementLumeO[] = [];
  for (const inst of foaie.instante) {
    const piesa = piese.get(inst.piesa);
    if (piesa === undefined) throw new Error(`instanța ${inst.id} trimite la piesa lipsă ${inst.piesa}`);
    const mInstanta = compuneO(translatieO(inst.x, inst.y), rotatieO(inst.rotire));
    const coboara = (nod: NodO, deasupra: MatriceO): void => {
      const m = compuneO(deasupra, nod.matrice);
      if (nod.tip === 'element') {
        rez.push({ idLume: `${inst.id}/${nod.id}`, forma: nod.forma, matrice: m });
        return;
      }
      for (const copil of nod.copii) coboara(copil, m);
    };
    coboara(piesa.radacina, mInstanta);
  }
  return rez;
}

// ---------------------------------------------------------------------------------------------------------------
// Migrarea v1 → v2, literal după contract (cu precizarea 6). Documentul v1 e presupus primit (`verificaV1` gol).

const CHEI_DOC_V1: ReadonlySet<string> = new Set(['schema', 'rev', 'foaie', 'elemente']);
const CHEI_ELEMENT_V1: ReadonlySet<string> = new Set(['id', 'nume', 'forma', 'matrice']);
const CHEI_MATRICE: ReadonlySet<string> = new Set(['a', 'b', 'c', 'd', 'e', 'f']);

/** Câmpurile unui obiect, fără cele cunoscute, copiate adânc (cheile se creează ca proprii, și `__proto__`). */
function necunoscute(o: Liber, cunoscute: ReadonlySet<string>): Liber {
  return Object.fromEntries(Object.entries(o).filter(([k]) => !cunoscute.has(k)).map(([k, v]) => [k, structuredClone(v)]));
}

/** Documentul v2 pe care contractul îl cere din v1. */
export function migreazaV1O(v1: DocV1O): DocV2O {
  const piese: PiesaO[] = [];
  const instante: InstantaO[] = [];
  for (const e of v1.elemente) {
    const m = e.matrice;
    const radacina: ElementO = {
      ...necunoscute(e, CHEI_ELEMENT_V1),
      tip: 'element',
      id: e.id,
      forma: structuredClone(e.forma),
      matrice: { ...necunoscute(m, CHEI_MATRICE), a: m.a, b: m.b, c: m.c, d: m.d, e: 0, f: 0 },
    };
    piese.push(e.nume === undefined ? { id: e.id, radacina } : { id: e.id, nume: e.nume, radacina });
    instante.push({ id: e.id, piesa: e.id, x: m.e, y: m.f, rotire: 0 });
  }
  return {
    ...necunoscute(v1, CHEI_DOC_V1),
    schema: 2,
    rev: v1.rev,
    piese,
    foi: [{ id: 'f1', stoc: structuredClone(v1.foaie), instante }],
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Validitatea. Fiecare problemă începe cu categoria ei între paranteze drepte.

const ID_O = /^[A-Za-z0-9_-]+$/;

const esteObiect = (v: unknown): v is Liber => typeof v === 'object' && v !== null && !Array.isArray(v);

type Semnaleaza = (categorie: CategorieO, mesaj: string) => void;

/** Verificările comune v1 / v2 (forma, matricea, id-ul, numele, mărimile), legate de lista de probleme. */
function unelte(semnaleaza: Semnaleaza) {
  /** Un număr finit, sau nimic (cu problema spusă). */
  const finit = (cale: string, v: unknown): number | undefined => {
    if (typeof v !== 'number') { semnaleaza('schema', `${cale} nu e număr`); return undefined; }
    if (!Number.isFinite(v)) { semnaleaza('finit', `${cale} = ${v}`); return undefined; }
    return v;
  };
  /** O mărime strict pozitivă și sub plafon; o întoarce doar dacă e bună. */
  const dimensiune = (cale: string, v: unknown, max: number): number | undefined => {
    const n = finit(cale, v);
    if (n === undefined) return undefined;
    if (!(n > 0)) { semnaleaza('pozitiv', `${cale} = ${n} nu e pozitivă`); return undefined; }
    if (n > max) { semnaleaza('plafon', `${cale} = ${n} > ${max}`); return undefined; }
    return n;
  };
  const id = (cale: string, v: unknown): string | undefined => {
    if (typeof v !== 'string') { semnaleaza('schema', `${cale} nu e text`); return undefined; }
    if (v.length < 1 || v.length > PLAFOANE_O.idLungime || !ID_O.test(v)) {
      semnaleaza('id', `${cale} = ${JSON.stringify(v)} nu e un id valid`);
    }
    return v;
  };
  const nume = (cale: string, o: Liber): void => {
    const n = o['nume'];
    if (n === undefined) return;
    if (typeof n !== 'string') semnaleaza('schema', `${cale}.nume nu e text`);
    else if (n.length > PLAFOANE_O.numeLungime) semnaleaza('plafon', `${cale}.nume are ${n.length} > ${PLAFOANE_O.numeLungime} caractere`);
  };
  /** Matricea locală, dacă e întreagă și finită. */
  const matrice = (cale: string, v: unknown): MatriceO | undefined => {
    if (!esteObiect(v)) { semnaleaza('schema', `${cale} lipsește sau nu e obiect`); return undefined; }
    const [a, b, c, d, e, f] = ['a', 'b', 'c', 'd', 'e', 'f'].map((k) => finit(`${cale}.${k}`, v[k]));
    if (a === undefined || b === undefined || c === undefined || d === undefined || e === undefined || f === undefined) return undefined;
    return { a, b, c, d, e, f };
  };
  /**
   * Forma; `compus` e matricea compusă a elementului față de rădăcina piesei (lipsește în v1, unde se judecă după
   * migrare, sau când o matrice de pe drum e stricată).
   */
  const forma = (cale: string, v: unknown, compus?: MatriceO): void => {
    if (!esteObiect(v)) { semnaleaza('schema', `${cale} lipsește sau nu e obiect`); return; }
    let arce = false;
    if (v['tip'] === 'dreptunghi') {
      const l = dimensiune(`${cale}.latime`, v['latime'], PLAFOANE_O.latura);
      const h = dimensiune(`${cale}.inaltime`, v['inaltime'], PLAFOANE_O.latura);
      const r = finit(`${cale}.razaColt`, v['razaColt']);
      if (r !== undefined && !(r >= 0)) semnaleaza('pozitiv', `${cale}.razaColt = ${r} e negativă`);
      else if (r !== undefined && r > PLAFOANE_O.latura) semnaleaza('plafon', `${cale}.razaColt = ${r} > ${PLAFOANE_O.latura}`);
      if (r !== undefined && r >= 0 && l !== undefined && h !== undefined && 2 * r > Math.min(l, h)) {
        semnaleaza('forma', `${cale}: 2 · razaColt = ${2 * r} > latura mică ${Math.min(l, h)}`);
      }
      arce = r !== undefined && r > 0;
    } else if (v['tip'] === 'cerc') {
      dimensiune(`${cale}.raza`, v['raza'], PLAFOANE_O.latura);
      arce = true;
    } else {
      semnaleaza('schema', `${cale}.tip = ${JSON.stringify(v['tip'])} nu e o formă cunoscută`);
    }
    if (arce && compus !== undefined && inMarginiO(compus) && !esteSimilitudineO(compus)) {
      semnaleaza('forma', `${cale}: o formă cu arce sub o matrice compusă care nu e similitudine: ${JSON.stringify(compus)}`);
    }
  };
  const rev = (v: unknown): void => {
    if (typeof v !== 'number' || !Number.isSafeInteger(v) || v < 0) semnaleaza('schema', `rev = ${String(v)} nu e un întreg sigur ≥ 0`);
  };
  const stoc = (cale: string, v: unknown): void => {
    if (!esteObiect(v)) { semnaleaza('schema', `${cale} lipsește sau nu e obiect`); return; }
    dimensiune(`${cale}.latime`, v['latime'], PLAFOANE_O.latura);
    dimensiune(`${cale}.inaltime`, v['inaltime'], PLAFOANE_O.latura);
    dimensiune(`${cale}.grosime`, v['grosime'], PLAFOANE_O.grosime);
  };
  return { finit, id, nume, matrice, forma, rev, stoc };
}

/** Lista încălcărilor contractului v2; goală = document valid. Merge iterativ: un arbore adânc nu umple stiva. */
export function verificaV2(doc: unknown): string[] {
  const probleme: string[] = [];
  const semnaleaza: Semnaleaza = (categorie, mesaj) => { probleme.push(`[${categorie}] ${mesaj}`); };
  const u = unelte(semnaleaza);

  /** Arborele unei piese: preordine cu stivă explicită; nodurile de sub nivelul 32 nu se mai deschid. */
  const arbore = (cp: string, radacina: unknown): { noduri: number; elemente: number } => {
    const idNoduri = new Set<string>();
    const stiva: Array<{ nod: unknown; nivel: number; deasupra: MatriceO | undefined }> = [
      { nod: radacina, nivel: 1, deasupra: IDENTITATE_O },
    ];
    let noduri = 0;
    let elemente = 0;
    let preaAdanc = false;
    let pesteMargini = false;
    for (let pas = stiva.pop(); pas !== undefined; pas = stiva.pop()) {
      const { nod, nivel, deasupra } = pas;
      if (nivel > PLAFOANE_O.adancime) {
        if (!preaAdanc) semnaleaza('adancime', `${cp}: un nod pe nivelul ${nivel} > ${PLAFOANE_O.adancime}`);
        preaAdanc = true;
        continue;
      }
      noduri++;
      const cale = `${cp}, nivelul ${nivel}`;
      if (!esteObiect(nod)) { semnaleaza('schema', `${cale}: nodul nu e obiect`); continue; }
      const idn = u.id(`${cale}.id`, nod['id']);
      if (idn !== undefined) {
        if (idNoduri.has(idn)) semnaleaza('unic-noduri', `${cp}: id-ul de nod ${idn} se repetă în aceeași piesă`);
        idNoduri.add(idn);
      }
      u.nume(cale, nod);
      // Matricea compusă față de rădăcina piesei: de sus în jos, de la identitate. O matrice locală stricată (deja
      // raportată) oprește verificarea marginilor pe ramura ei.
      const local = u.matrice(`${cale}.matrice`, nod['matrice']);
      const compus = deasupra !== undefined && local !== undefined ? compuneO(deasupra, local) : undefined;
      if (compus !== undefined && !inMarginiO(compus)) {
        if (!pesteMargini) semnaleaza('margini', `${cp}: matricea compusă a nodului ${idn ?? '?'} iese din margini: ${JSON.stringify(compus)}`);
        pesteMargini = true;
      }
      if (nod['tip'] === 'grup') {
        const copii = nod['copii'];
        if (!Array.isArray(copii)) semnaleaza('schema', `${cale}: grupul n-are lista copii`);
        else for (let k = copii.length - 1; k >= 0; k--) stiva.push({ nod: copii[k], nivel: nivel + 1, deasupra: compus });
      } else if (nod['tip'] === 'element') {
        elemente++;
        u.forma(`${cale}.forma`, nod['forma'], compus);
      } else {
        semnaleaza('schema', `${cale}.tip = ${JSON.stringify(nod['tip'])} nu e grup sau element`);
      }
    }
    return { noduri, elemente };
  };

  if (!esteObiect(doc)) { semnaleaza('schema', 'documentul nu e un obiect'); return probleme; }
  if (preaAdancJsonO(doc, PLAFOANE_O.adancimeJson)) semnaleaza('adancime', `JSON-ul are peste ${PLAFOANE_O.adancimeJson} de niveluri`);
  if (doc['schema'] !== 2) semnaleaza('schema', `schema = ${String(doc['schema'])}, nu 2`);
  u.rev(doc['rev']);

  // Piesele întâi: instanțele trimit la ele.
  const idPiese = new Set<string>();
  const elementePiesa = new Map<string, number>();
  let noduri = 0;
  const piese = doc['piese'];
  if (!Array.isArray(piese)) {
    semnaleaza('schema', 'piese lipsește sau nu e listă');
  } else {
    piese.forEach((p: unknown, i) => {
      const cale = `piese[${i}]`;
      if (!esteObiect(p)) { semnaleaza('schema', `${cale} nu e obiect`); return; }
      const idp = u.id(`${cale}.id`, p['id']);
      if (idp !== undefined) {
        if (idPiese.has(idp)) semnaleaza('unic-piese', `două piese au id-ul ${idp}`);
        idPiese.add(idp);
      }
      u.nume(cale, p);
      const numarate = arbore(`piesa ${idp ?? cale}`, p['radacina']);
      noduri += numarate.noduri;
      if (idp !== undefined && !elementePiesa.has(idp)) elementePiesa.set(idp, numarate.elemente);
    });
  }

  const idFoi = new Set<string>();
  const idInstante = new Set<string>();
  let instante = 0;
  let elementeLume = 0;
  const foi = doc['foi'];
  if (!Array.isArray(foi)) {
    semnaleaza('schema', 'foi lipsește sau nu e listă');
  } else {
    if (foi.length === 0) semnaleaza('foi', 'documentul n-are nicio foaie');
    if (foi.length > PLAFOANE_O.foi) semnaleaza('plafon', `${foi.length} foi > ${PLAFOANE_O.foi}`);
    foi.forEach((f: unknown, i) => {
      const cale = `foi[${i}]`;
      if (!esteObiect(f)) { semnaleaza('schema', `${cale} nu e obiect`); return; }
      const idf = u.id(`${cale}.id`, f['id']);
      if (idf !== undefined) {
        if (idFoi.has(idf)) semnaleaza('unic-foi', `două foi au id-ul ${idf}`);
        idFoi.add(idf);
      }
      u.nume(cale, f);
      u.stoc(`${cale}.stoc`, f['stoc']);
      const lista = f['instante'];
      if (!Array.isArray(lista)) { semnaleaza('schema', `${cale}.instante lipsește sau nu e listă`); return; }
      lista.forEach((inst: unknown, k) => {
        instante++;
        const ci = `${cale}.instante[${k}]`;
        if (!esteObiect(inst)) { semnaleaza('schema', `${ci} nu e obiect`); return; }
        const idi = u.id(`${ci}.id`, inst['id']);
        if (idi !== undefined) {
          if (idInstante.has(idi)) semnaleaza('unic-instante', `două instanțe au id-ul ${idi}`);
          idInstante.add(idi);
        }
        const piesa = inst['piesa'];
        if (typeof piesa !== 'string') semnaleaza('schema', `${ci}.piesa nu e text`);
        else if (!idPiese.has(piesa)) semnaleaza('referinta', `instanța ${idi ?? ci} trimite la piesa lipsă ${piesa}`);
        else elementeLume += elementePiesa.get(piesa) ?? 0;
        for (const axa of ['x', 'y'] as const) {
          const v = u.finit(`${ci}.${axa}`, inst[axa]);
          if (v !== undefined && !(Math.abs(v) <= PLAFOANE_O.pozitie)) semnaleaza('margini', `${ci}.${axa} = ${v} iese din ±${PLAFOANE_O.pozitie}`);
        }
        const rotire = inst['rotire'];
        if (typeof rotire !== 'number') semnaleaza('schema', `${ci}.rotire nu e număr`);
        else if (!(Number.isFinite(rotire) && rotire >= 0 && rotire < 360)) semnaleaza('rotire', `${ci}.rotire = ${rotire} nu e în [0, 360)`);
        const campuri = inst['campuri'];
        if (campuri !== undefined) {
          if (!esteObiect(campuri)) {
            semnaleaza('schema', `${ci}.campuri nu e dicționar`);
          } else {
            const intrari = Object.entries(campuri);
            if (intrari.length > PLAFOANE_O.campuriChei) semnaleaza('plafon', `${ci}.campuri are ${intrari.length} > ${PLAFOANE_O.campuriChei} de chei`);
            for (const [cheie, v] of intrari) {
              if (cheie.length > PLAFOANE_O.campuriCheie) semnaleaza('plafon', `${ci}.campuri: o cheie de ${cheie.length} > ${PLAFOANE_O.campuriCheie} caractere`);
              if (typeof v !== 'string') semnaleaza('schema', `${ci}.campuri.${cheie} nu e text`);
              else if (v.length > PLAFOANE_O.campuriValoare) semnaleaza('plafon', `${ci}.campuri.${cheie} are ${v.length} > ${PLAFOANE_O.campuriValoare} caractere`);
            }
          }
        }
      });
    });
  }
  if (noduri > PLAFOANE_O.noduri) semnaleaza('plafon', `${noduri} noduri > ${PLAFOANE_O.noduri}`);
  if (instante > PLAFOANE_O.instante) semnaleaza('plafon', `${instante} instanțe > ${PLAFOANE_O.instante}`);
  if (elementeLume > PLAFOANE_O.elementeLume) semnaleaza('margini', `${elementeLume} elemente în lume > ${PLAFOANE_O.elementeLume}`);
  return probleme;
}

/**
 * De ce ușa trebuie să refuze un document v1, ca listă de probleme; goală = se migrează. Schema 1 (după
 * `src/model/document.ts`, citit doar pentru format și plafoane), adâncimea JSON și ciocnirile (precizarea 7); dacă
 * toate trec, documentul MIGRAT trebuie să respecte contractul v2 (marginile, forma, adâncimea: precizarea 5).
 */
export function verificaV1(doc: unknown): string[] {
  const probleme: string[] = [];
  const semnaleaza: Semnaleaza = (categorie, mesaj) => { probleme.push(`[${categorie}] ${mesaj}`); };
  const u = unelte(semnaleaza);
  if (!esteObiect(doc)) { semnaleaza('schema', 'documentul nu e un obiect'); return probleme; }
  if (preaAdancJsonO(doc, PLAFOANE_O.adancimeJson)) {
    semnaleaza('adancime', `JSON-ul are peste ${PLAFOANE_O.adancimeJson} de niveluri`);
    return probleme;
  }
  if (doc['schema'] !== 1) semnaleaza('schema', `schema = ${String(doc['schema'])}, nu 1`);
  u.rev(doc['rev']);
  for (const cheie of ['piese', 'foi']) {
    if (Object.hasOwn(doc, cheie)) semnaleaza('ciocnire', `câmpul de sus „${cheie}” s-ar pierde în migrare`);
  }
  u.stoc('foaie', doc['foaie']);
  const elemente = doc['elemente'];
  if (!Array.isArray(elemente)) { semnaleaza('schema', 'elemente lipsește sau nu e listă'); return probleme; }
  if (elemente.length > PLAFOANE_O.elementeV1) semnaleaza('plafon', `${elemente.length} elemente > ${PLAFOANE_O.elementeV1}`);
  const ids = new Set<string>();
  elemente.forEach((e: unknown, i) => {
    const cale = `elemente[${i}]`;
    if (!esteObiect(e)) { semnaleaza('schema', `${cale} nu e obiect`); return; }
    const ide = u.id(`${cale}.id`, e['id']);
    if (ide !== undefined) {
      if (ids.has(ide)) semnaleaza('unic-elemente', `două elemente au id-ul ${ide}`);
      ids.add(ide);
    }
    u.nume(cale, e);
    u.forma(`${cale}.forma`, e['forma']);
    u.matrice(`${cale}.matrice`, e['matrice']);
    if (Object.hasOwn(e, 'tip')) semnaleaza('ciocnire', `${cale}: câmpul „tip” s-ar pierde în migrare`);
  });
  if (probleme.length > 0) return probleme;
  // Precizarea 5: „un document v1 cu valori peste aceste margini e refuzat la migrare”: se judecă documentul migrat.
  return verificaV2(migreazaV1O(doc as DocV1O));
}

/** Categoriile distincte dintr-o listă de probleme, în ordinea apariției. */
export function categoriiO(probleme: readonly string[]): string[] {
  return [...new Set(probleme.map((p) => /^\[([a-z-]+)\]/.exec(p)?.[1] ?? '?'))];
}

// ---------------------------------------------------------------------------------------------------------------

/**
 * Prima diferență dintre două valori JSON, ca text, sau `undefined` dacă sunt egale. Numerele se compară cu `===`
 * (deci −0 = 0, cum cere contractul), obiectele după mulțimea cheilor proprii, nu după ordinea lor.
 */
export function diferenta(a: unknown, b: unknown, cale = '$'): string | undefined {
  if (typeof a === 'number' && typeof b === 'number') return a === b ? undefined : `${cale}: ${a} ≠ ${b}`;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return Object.is(a, b) ? undefined : `${cale}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`;
  }
  if (Array.isArray(a) !== Array.isArray(b)) return `${cale}: o listă față de un obiect`;
  const ka = Object.keys(a).sort();
  const kb = Object.keys(b).sort();
  if (ka.length !== kb.length || ka.some((k, i) => k !== kb[i])) return `${cale}: cheile [${ka.join(', ')}] ≠ [${kb.join(', ')}]`;
  for (const k of ka) {
    const d = diferenta((a as Liber)[k], (b as Liber)[k], `${cale}.${k}`);
    if (d !== undefined) return d;
  }
  return undefined;
}
