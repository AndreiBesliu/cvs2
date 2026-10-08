/**
 * ORACOLUL documentului v3 (ADR 0025: operațiile piesei), peste contractul v2 (ADR 0024, varianta D: piese cu arbore,
 * instanțe pe foi, cu „Precizările contractului” 1–10), cu ZERO importuri din `src/`. Totul e scris din textul celor
 * două ADR-uri, nu din codul aplicației: matricea, ordinea elementelor și a tăieturilor în lume, migrările v1 → v2 → v3,
 * marginile lumii și regulile de validitate au aici propria lor copie. Dacă aplicația și oracolul ar citi același
 * fișier, o greșeală acolo ar trece prin amândouă.
 *
 * Convenția matricei (aceeași ca în tot proiectul, rescrisă aici): x′ = a·x + c·y + e, y′ = b·x + d·y + f;
 * `compuneO(m2, m1)` aplică întâi m1, apoi m2; rotirea e trigonometrică, în grade.
 *
 * Din precizările ADR 0024 (le urmez literal):
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
 * - migrarea v1 → v2 păstrează câmpurile necunoscute ale matricei și refuză ciocnirile de nume (`[ciocnire]`).
 *
 * Din ADR 0025 (le urmez literal; alegerile mele, acolo unde textul tace, sunt marcate „ALEGERE”):
 * - `Piesa.operatii` e obligatorie și poate fi goală; `Operatie { id, tip: 'profil', noduri, scula, latura, adancime,
 *   pas }`, cu câmpurile necunoscute păstrate. ALEGERE: și cele ale sculei (regula generală din ADR 0024);
 * - id-ul operației e ca orice id și e unic între operațiile ACELEIAȘI piese (spațiu de nume separat de noduri: poate
 *   fi egal cu id-ul unui nod, iar două piese pot avea operații cu același id);
 * - `noduri`: 1–10 000 de id-uri distincte, fiecare al unui ELEMENT din arborele piesei (nu al unui grup, nu al altei
 *   piese);
 * - `scula`: `numar` întreg 1–999, `nume` text ≤ 200 (ALEGERE: obligatoriu, poate fi gol), `diametru` finit în (0, 100];
 * - `latura` ∈ { exterior, interior, pe-linie }; `adancime` și `pas` finite în (0, 1 000]. Adâncimea față de grosimea
 *   foii și „o singură sculă pe program” sunt ale CAM-ului / exportului, nu ale ușii (`sculaUnicaO` le spune motivul);
 * - plafoanele: ≤ 100 000 de operații în document (și cele ale pieselor fără instanțe), ≤ 100 000 de tăieturi în lume
 *   (suma, peste instanțele tuturor foilor, a lungimilor listelor `noduri` din operațiile piesei lor);
 * - ordinea tăieturilor: clasa (interior < pe-linie < exterior), apoi instanța (ordinea foii), apoi operația (ordinea
 *   piesei), apoi nodul (ordinea operației). ALEGERE: o ordine lexicografică pe acest cvartet (instanța înaintea
 *   operației), nu „toate instanțele unei operații, apoi operația următoare”;
 * - migrarea v2 → v3: fiecare piesă primește câte o operație pe fiecare element, în preordine, cu id-ul elementului;
 *   cerc → interior 8 4, dreptunghi → exterior 3 3, scula { 1, 'freza plata', 6 }; o piesă v2 cu un câmp propriu
 *   `operatii` (ORICE valoare, și `[]`) e refuzată (`[ciocnire]`); un v1 trece v1 → v2 → v3, în lanț.
 *
 * Categoriile noi: `[operatie]` (lista `operatii` și câmpurile operației: tip, latura, adancime, pas, lista `noduri`
 * goală, cu duplicate sau cu ne-texte), `[unic-operatii]`, `[referinta-op]` (un nod care nu e element al piesei),
 * `[scula]` (tot ce ține de sculă); `[plafon]` (operații, tăieturi, peste 10 000 de noduri într-o operație) și
 * `[ciocnire]` se refolosesc; formatul id-ului operației rămâne `[id]` (un id ne-text, `[schema]`, ca peste tot).
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

export type LaturaO = 'interior' | 'pe-linie' | 'exterior';
export type SculaO = Liber & { numar: number; nume: string; diametru: number };
export type OperatieO = Liber & {
  id: string; tip: 'profil'; noduri: string[]; scula: SculaO; latura: LaturaO; adancime: number; pas: number;
};
export type PiesaV3O = PiesaO & { operatii: OperatieO[] };
export type DocV3O = Liber & { schema: 3; rev: number; piese: PiesaV3O[]; foi: FoaieO[] };

/** Ce au în comun v2 și v3 pentru geometrie: operațiile nu schimbă nimic din ea. */
export type DocArboreO = { readonly piese: readonly PiesaO[]; readonly foi: readonly FoaieO[] };

export type ElementV1O = Liber & { id: string; nume?: string; forma: Liber; matrice: MatriceO };
export type DocV1O = Liber & { schema: 1; rev: number; foaie: StocO; elemente: ElementV1O[] };

export type ElementLumeO = { idLume: string; forma: unknown; matrice: MatriceO };

/**
 * O tăietură în lume. `scula` și `forma` sunt obiectele din document, cu câmpurile lor necunoscute; `matrice` e matricea
 * în lume a elementului (aceeași ca în `geometrieV2`). `idLume` NU e unic: un element în două operații dă două tăieturi.
 */
export type TaieturaO = {
  idLume: string; instanta: string; piesa: string; operatie: string; nod: string; latura: LaturaO;
  adancime: number; pas: number; scula: SculaO; forma: unknown; matrice: MatriceO;
};

/** Câmpurile unei tăieturi, exact (nici mai multe, nici mai puține). */
export const CAMPURI_TAIETURA_O = [
  'idLume', 'instanta', 'piesa', 'operatie', 'nod', 'latura', 'adancime', 'pas', 'scula', 'forma', 'matrice',
] as const;

export type CategorieO =
  | 'schema' | 'id' | 'unic-piese' | 'unic-foi' | 'unic-instante' | 'unic-noduri' | 'unic-elemente' | 'referinta'
  | 'adancime' | 'rotire' | 'finit' | 'plafon' | 'foi' | 'pozitiv' | 'margini' | 'ciocnire' | 'forma'
  | 'operatie' | 'unic-operatii' | 'referinta-op' | 'scula';

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
  // ADR 0025.
  /** Operațiile din tot documentul, și ale pieselor fără instanțe. */
  operatii: 100_000,
  /** Tăieturile în lume: suma, pe instanțele tuturor foilor, a referințelor din operațiile piesei lor. */
  taieturiLume: 100_000,
  noduriOperatie: 10_000,
  sculaNumarMin: 1,
  sculaNumarMax: 999,
  sculaNume: 200,
  /** Diametrul sculei, în (0, 100] mm. */
  sculaDiametru: 100,
  /** Adâncimea și pasul, în (0, 1 000] mm. */
  adancimeOperatie: 1_000,
  pasOperatie: 1_000,
} as const;

/** Clasele tăieturilor, în ordinea în care se taie. */
export const ORDINEA_LATURILOR_O: readonly LaturaO[] = ['interior', 'pe-linie', 'exterior'];

/** Migrarea v2 → v3: scula și parametrii impliciți, pe forme (ADR 0025). */
export const SCULA_IMPLICITA_O = { numar: 1, nume: 'freza plata', diametru: 6 } as const;
export const IMPLICITE_O = {
  cerc: { latura: 'interior', adancime: 8, pas: 4 },
  dreptunghi: { latura: 'exterior', adancime: 3, pas: 3 },
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
// Elementele și tăieturile în lume. Documentul e presupus valid.

/** v1: fiecare element e propria lui instanță, cu matricea neschimbată. */
export function geometrieV1(doc: DocV1O): ElementLumeO[] {
  return doc.elemente.map((e) => ({ idLume: `${e.id}/${e.id}`, forma: e.forma, matrice: e.matrice }));
}

type ElementInstantaO = { readonly id: string; readonly forma: unknown; readonly matrice: MatriceO };

/**
 * Elementele piesei unei instanțe, în preordine (grupurile nu desenează nimic), cu matricea în lume:
 * M = translație(x, y) ∘ rotație(rotire), apoi M = compune(M, nod) pe drum, de la rădăcină în jos (precizarea 3).
 */
function elementeInstantaO(piesa: PiesaO, inst: InstantaO): ElementInstantaO[] {
  const rez: ElementInstantaO[] = [];
  const coboara = (nod: NodO, deasupra: MatriceO): void => {
    const m = compuneO(deasupra, nod.matrice);
    if (nod.tip === 'element') {
      rez.push({ id: nod.id, forma: nod.forma, matrice: m });
      return;
    }
    for (const copil of nod.copii) coboara(copil, m);
  };
  coboara(piesa.radacina, compuneO(translatieO(inst.x, inst.y), rotatieO(inst.rotire)));
  return rez;
}

/** Piesele după id (la id-uri repetate, prima; un document valid nu le are). */
function indexPiese<P extends PiesaO>(piese: readonly P[]): Map<string, P> {
  const rez = new Map<string, P>();
  for (const p of piese) if (!rez.has(p.id)) rez.set(p.id, p);
  return rez;
}

/** O foaie, v2 sau v3: instanțele în ordinea foii; în fiecare piesă, elementele în preordine. */
export function geometrieV2(doc: DocArboreO, indexFoaie = 0): ElementLumeO[] {
  const foaie = doc.foi[indexFoaie];
  if (foaie === undefined) throw new Error(`foaia ${indexFoaie} nu există`);
  const piese = indexPiese(doc.piese);
  const rez: ElementLumeO[] = [];
  for (const inst of foaie.instante) {
    const piesa = piese.get(inst.piesa);
    if (piesa === undefined) throw new Error(`instanța ${inst.id} trimite la piesa lipsă ${inst.piesa}`);
    for (const e of elementeInstantaO(piesa, inst)) rez.push({ idLume: `${inst.id}/${e.id}`, forma: e.forma, matrice: e.matrice });
  }
  return rez;
}

/**
 * Tăieturile unei foi v3, în ordinea contractului: clasa (interior, pe-linie, exterior); în clasă, instanțele în ordinea
 * foii, operațiile în ordinea piesei, nodurile în ordinea operației. Elementele fără operație nu se taie.
 */
export function taieturiV3O(doc: DocV3O, indexFoaie = 0): TaieturaO[] {
  const foaie = doc.foi[indexFoaie];
  if (foaie === undefined) throw new Error(`foaia ${indexFoaie} nu există`);
  const piese = indexPiese(doc.piese);
  // Matricele în lume ale elementelor fiecărei instanțe, calculate o singură dată.
  const lumi = foaie.instante.map((inst) => {
    const piesa = piese.get(inst.piesa);
    if (piesa === undefined) throw new Error(`instanța ${inst.id} trimite la piesa lipsă ${inst.piesa}`);
    const elemente = new Map<string, ElementInstantaO>();
    for (const e of elementeInstantaO(piesa, inst)) elemente.set(e.id, e);
    return { inst, piesa, elemente };
  });
  const rez: TaieturaO[] = [];
  for (const latura of ORDINEA_LATURILOR_O) {
    for (const { inst, piesa, elemente } of lumi) {
      for (const op of piesa.operatii) {
        if (op.latura !== latura) continue;
        for (const nod of op.noduri) {
          const e = elemente.get(nod);
          if (e === undefined) throw new Error(`operația ${op.id} a piesei ${piesa.id} trimite la ${nod}, care nu e element`);
          rez.push({
            idLume: `${inst.id}/${nod}`, instanta: inst.id, piesa: piesa.id, operatie: op.id, nod,
            latura: op.latura, adancime: op.adancime, pas: op.pas, scula: op.scula, forma: e.forma, matrice: e.matrice,
          });
        }
      }
    }
  }
  return rez;
}

/** ADR 0025: „o singură sculă pe program”. Motivul refuzului exportului (număr sau diametru diferit), sau nimic. */
export function sculaUnicaO(taieturi: readonly TaieturaO[]): string | undefined {
  const prima = taieturi[0];
  if (prima === undefined) return undefined;
  const alta = taieturi.find((t) => t.scula.numar !== prima.scula.numar || t.scula.diametru !== prima.scula.diametru);
  if (alta === undefined) return undefined;
  return `scule diferite în același program: ${prima.operatie} (T${prima.scula.numar}, Ø${prima.scula.diametru}) și `
    + `${alta.operatie} (T${alta.scula.numar}, Ø${alta.scula.diametru})`;
}

// ---------------------------------------------------------------------------------------------------------------
// Migrările, literal după contracte. Documentul de intrare e presupus primit (verificarea lui e goală).

const CHEI_DOC_V1: ReadonlySet<string> = new Set(['schema', 'rev', 'foaie', 'elemente']);
const CHEI_ELEMENT_V1: ReadonlySet<string> = new Set(['id', 'nume', 'forma', 'matrice']);
const CHEI_MATRICE: ReadonlySet<string> = new Set(['a', 'b', 'c', 'd', 'e', 'f']);

/** Câmpurile unui obiect, fără cele cunoscute, copiate adânc (cheile se creează ca proprii, și `__proto__`). */
function necunoscute(o: Liber, cunoscute: ReadonlySet<string>): Liber {
  return Object.fromEntries(Object.entries(o).filter(([k]) => !cunoscute.has(k)).map(([k, v]) => [k, structuredClone(v)]));
}

/** Documentul v2 pe care ADR 0024 îl cere din v1. */
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

/** Elementele unui arbore, în preordine (grupurile nu intră). Iterativ. */
export function preordineElementeO(radacina: NodO): ElementO[] {
  const rez: ElementO[] = [];
  const stiva: NodO[] = [radacina];
  for (let nod = stiva.pop(); nod !== undefined; nod = stiva.pop()) {
    if (nod.tip === 'element') { rez.push(nod); continue; }
    for (let k = nod.copii.length - 1; k >= 0; k--) stiva.push(nod.copii[k] as NodO);
  }
  return rez;
}

/** Operația implicită a unui element la migrarea v2 → v3 (ADR 0025). */
export function operatieImplicitaO(e: ElementO): OperatieO {
  const tip = e.forma['tip'];
  const p = tip === 'cerc' ? IMPLICITE_O.cerc : tip === 'dreptunghi' ? IMPLICITE_O.dreptunghi : undefined;
  if (p === undefined) throw new Error(`elementul ${e.id} are forma ${String(tip)}, fără operație implicită`);
  return {
    id: e.id, tip: 'profil', noduri: [e.id], scula: { ...SCULA_IMPLICITA_O },
    latura: p.latura, adancime: p.adancime, pas: p.pas,
  };
}

/** Documentul v3 pe care ADR 0025 îl cere din v2: doar `schema` și `operatii` pe fiecare piesă; restul rămâne. */
export function migreazaV2V3O(v2: DocV2O): DocV3O {
  const copie = structuredClone(v2);
  const piese: PiesaV3O[] = copie.piese.map((p) => ({ ...p, operatii: preordineElementeO(p.radacina).map(operatieImplicitaO) }));
  return { ...copie, schema: 3, piese };
}

/** v1 → v2 → v3, în lanț. */
export function migreazaV1V3O(v1: DocV1O): DocV3O {
  return migreazaV2V3O(migreazaV1O(v1));
}

/** Orice versiune primită, adusă la v3 (o copie; un v3 rămâne neschimbat). */
export function ridicaO(doc: DocV1O | DocV2O | DocV3O): DocV3O {
  if (doc.schema === 1) return migreazaV1V3O(doc);
  if (doc.schema === 2) return migreazaV2V3O(doc);
  return structuredClone(doc);
}

// ---------------------------------------------------------------------------------------------------------------
// Validitatea. Fiecare problemă începe cu categoria ei între paranteze drepte.

const ID_O = /^[A-Za-z0-9_-]+$/;
const LATURI_O: ReadonlySet<unknown> = new Set<unknown>(ORDINEA_LATURILOR_O);

const esteObiect = (v: unknown): v is Liber => typeof v === 'object' && v !== null && !Array.isArray(v);

type Semnaleaza = (categorie: CategorieO, mesaj: string) => void;

/** Verificările comune v1 / v2 / v3 (forma, matricea, id-ul, numele, mărimile), legate de lista de probleme. */
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

/** O mărime a operației: un număr finit în (0, max]. */
const inInterval = (v: unknown, max: number): boolean => typeof v === 'number' && Number.isFinite(v) && v > 0 && v <= max;

/**
 * Lista încălcărilor contractului v2 (`schema` 2) sau v3 (`schema` 3, cu operațiile); goală = document valid. Merge
 * iterativ: un arbore adânc nu umple stiva.
 */
function verificaArboreO(doc: unknown, schema: 2 | 3): string[] {
  const probleme: string[] = [];
  const semnaleaza: Semnaleaza = (categorie, mesaj) => { probleme.push(`[${categorie}] ${mesaj}`); };
  const u = unelte(semnaleaza);

  /** Arborele unei piese: preordine cu stivă explicită; nodurile de sub nivelul 32 nu se mai deschid. */
  const arbore = (cp: string, radacina: unknown) => {
    const idNoduri = new Set<string>();
    const idElemente = new Set<string>();
    const idGrupuri = new Set<string>();
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
        if (idn !== undefined) idGrupuri.add(idn);
        const copii = nod['copii'];
        if (!Array.isArray(copii)) semnaleaza('schema', `${cale}: grupul n-are lista copii`);
        else for (let k = copii.length - 1; k >= 0; k--) stiva.push({ nod: copii[k], nivel: nivel + 1, deasupra: compus });
      } else if (nod['tip'] === 'element') {
        if (idn !== undefined) idElemente.add(idn);
        elemente++;
        u.forma(`${cale}.forma`, nod['forma'], compus);
      } else {
        semnaleaza('schema', `${cale}.tip = ${JSON.stringify(nod['tip'])} nu e grup sau element`);
      }
    }
    return { noduri, elemente, idElemente, idGrupuri };
  };

  /** Scula unei operații: totul e `[scula]`; câmpurile necunoscute se păstrează. */
  const scula = (cale: string, v: unknown): void => {
    if (!esteObiect(v)) { semnaleaza('scula', `${cale} lipsește sau nu e obiect`); return; }
    const numar = v['numar'];
    if (typeof numar !== 'number' || !Number.isInteger(numar) || numar < PLAFOANE_O.sculaNumarMin || numar > PLAFOANE_O.sculaNumarMax) {
      semnaleaza('scula', `${cale}.numar = ${String(numar)} nu e un întreg în ${PLAFOANE_O.sculaNumarMin}–${PLAFOANE_O.sculaNumarMax}`);
    }
    const nume = v['nume'];
    if (typeof nume !== 'string') semnaleaza('scula', `${cale}.nume nu e text`);
    else if (nume.length > PLAFOANE_O.sculaNume) semnaleaza('scula', `${cale}.nume are ${nume.length} > ${PLAFOANE_O.sculaNume} caractere`);
    if (!inInterval(v['diametru'], PLAFOANE_O.sculaDiametru)) {
      semnaleaza('scula', `${cale}.diametru = ${String(v['diametru'])} nu e în (0, ${PLAFOANE_O.sculaDiametru}]`);
    }
  };

  /** Operațiile unei piese v3. Întoarce câte sunt și câte referințe la noduri au (pentru plafoane). */
  const operatii = (cp: string, v: unknown, idElemente: ReadonlySet<string>, idGrupuri: ReadonlySet<string>) => {
    if (!Array.isArray(v)) { semnaleaza('operatie', `${cp}.operatii lipsește sau nu e listă`); return { numar: 0, referinte: 0 }; }
    const idOperatii = new Set<string>();
    let referinte = 0;
    v.forEach((op: unknown, k) => {
      const co = `${cp}.operatii[${k}]`;
      if (!esteObiect(op)) { semnaleaza('operatie', `${co} nu e obiect`); return; }
      const ido = u.id(`${co}.id`, op['id']);
      if (ido !== undefined) {
        if (idOperatii.has(ido)) semnaleaza('unic-operatii', `${cp}: id-ul de operație ${ido} se repetă în aceeași piesă`);
        idOperatii.add(ido);
      }
      if (op['tip'] !== 'profil') semnaleaza('operatie', `${co}.tip = ${JSON.stringify(op['tip'])} nu e 'profil'`);
      if (!LATURI_O.has(op['latura'])) semnaleaza('operatie', `${co}.latura = ${JSON.stringify(op['latura'])} nu e una dintre ${ORDINEA_LATURILOR_O.join(', ')}`);
      if (!inInterval(op['adancime'], PLAFOANE_O.adancimeOperatie)) semnaleaza('operatie', `${co}.adancime = ${String(op['adancime'])} nu e în (0, ${PLAFOANE_O.adancimeOperatie}]`);
      if (!inInterval(op['pas'], PLAFOANE_O.pasOperatie)) semnaleaza('operatie', `${co}.pas = ${String(op['pas'])} nu e în (0, ${PLAFOANE_O.pasOperatie}]`);
      scula(`${co}.scula`, op['scula']);
      const noduri = op['noduri'];
      if (!Array.isArray(noduri)) { semnaleaza('operatie', `${co}.noduri lipsește sau nu e listă`); return; }
      referinte += noduri.length;
      if (noduri.length === 0) semnaleaza('operatie', `${co}.noduri e goală`);
      if (noduri.length > PLAFOANE_O.noduriOperatie) semnaleaza('plafon', `${co}.noduri are ${noduri.length} > ${PLAFOANE_O.noduriOperatie}`);
      const vazute = new Set<string>();
      for (const n of noduri as unknown[]) {
        if (typeof n !== 'string') { semnaleaza('operatie', `${co}.noduri conține ${JSON.stringify(n)}, nu un id`); continue; }
        if (vazute.has(n)) semnaleaza('operatie', `${co}.noduri: ${n} se repetă`);
        vazute.add(n);
        if (idGrupuri.has(n)) semnaleaza('referinta-op', `${co}: ${n} e un grup, nu un element`);
        else if (!idElemente.has(n)) semnaleaza('referinta-op', `${co}: ${JSON.stringify(n)} nu e un element al piesei`);
      }
    });
    return { numar: v.length, referinte };
  };

  if (!esteObiect(doc)) { semnaleaza('schema', 'documentul nu e un obiect'); return probleme; }
  if (preaAdancJsonO(doc, PLAFOANE_O.adancimeJson)) semnaleaza('adancime', `JSON-ul are peste ${PLAFOANE_O.adancimeJson} de niveluri`);
  if (doc['schema'] !== schema) semnaleaza('schema', `schema = ${String(doc['schema'])}, nu ${schema}`);
  u.rev(doc['rev']);

  // Piesele întâi: instanțele trimit la ele.
  const idPiese = new Set<string>();
  const elementePiesa = new Map<string, number>();
  const referintePiesa = new Map<string, number>();
  let noduri = 0;
  let operatiiDocument = 0;
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
      if (schema === 3) {
        const ops = operatii(`piesa ${idp ?? cale}`, p['operatii'], numarate.idElemente, numarate.idGrupuri);
        operatiiDocument += ops.numar;
        if (idp !== undefined && !referintePiesa.has(idp)) referintePiesa.set(idp, ops.referinte);
      }
    });
  }

  const idFoi = new Set<string>();
  const idInstante = new Set<string>();
  let instante = 0;
  let elementeLume = 0;
  let taieturiLume = 0;
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
        else {
          elementeLume += elementePiesa.get(piesa) ?? 0;
          taieturiLume += referintePiesa.get(piesa) ?? 0;
        }
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
  if (schema === 3) {
    if (operatiiDocument > PLAFOANE_O.operatii) semnaleaza('plafon', `${operatiiDocument} operații > ${PLAFOANE_O.operatii}`);
    if (taieturiLume > PLAFOANE_O.taieturiLume) semnaleaza('plafon', `${taieturiLume} tăieturi în lume > ${PLAFOANE_O.taieturiLume}`);
  }
  return probleme;
}

/** Lista încălcărilor contractului v2 (ADR 0024); goală = document v2 valid (încă nemigrat). */
export function verificaV2(doc: unknown): string[] {
  return verificaArboreO(doc, 2);
}

/** Lista încălcărilor contractului v3 (ADR 0024 + ADR 0025); goală = document v3 valid. */
export function verificaV3(doc: unknown): string[] {
  return verificaArboreO(doc, 3);
}

/**
 * De ce ușa trebuie să refuze un document v2, ca listă de probleme; goală = se migrează la v3. Contractul v2, apoi
 * ciocnirea de nume (o piesă cu un câmp propriu `operatii`, oricare i-ar fi valoarea), apoi documentul MIGRAT trebuie
 * să respecte contractul v3.
 */
export function verificaV2V3(doc: unknown): string[] {
  const probleme = verificaV2(doc);
  if (esteObiect(doc) && Array.isArray(doc['piese'])) {
    doc['piese'].forEach((p: unknown, i) => {
      if (esteObiect(p) && Object.hasOwn(p, 'operatii')) {
        probleme.push(`[ciocnire] piese[${i}]: câmpul „operatii” al piesei v2 s-ar pierde în migrare`);
      }
    });
  }
  if (probleme.length > 0) return probleme;
  return verificaV3(migreazaV2V3O(doc as DocV2O));
}

/**
 * De ce ușa trebuie să refuze un document v1, ca listă de probleme; goală = se migrează (v1 → v2 → v3). Schema 1 (după
 * `src/model/document.ts` din etapa 1, citit doar pentru format și plafoane), adâncimea JSON și ciocnirile (precizarea
 * 7); dacă toate trec, documentul migrat trebuie să treacă mai departe (precizarea 5 și ADR 0025).
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
  // Precizarea 5: „un document v1 cu valori peste aceste margini e refuzat la migrare”: se judecă documentul migrat,
  // apoi lanțul continuă la v3.
  return verificaV2V3(migreazaV1O(doc as DocV1O));
}

/** Ce spune ușa despre orice document: după `schema`, verificarea versiunii lui (și a migrării până la 3). */
export function verificaO(doc: unknown): string[] {
  if (!esteObiect(doc)) return ['[schema] documentul nu e un obiect'];
  const s = doc['schema'];
  if (s === 1) return verificaV1(doc);
  if (s === 2) return verificaV2V3(doc);
  if (s === 3) return verificaV3(doc);
  return [`[schema] schema = ${JSON.stringify(s)} nu e 1, 2 sau 3`];
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
