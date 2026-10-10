import * as v from 'valibot';
import { compune, esteSimilitudine, IDENTITATE } from '../geom/matrice.ts';

/**
 * Documentul v6 (T16, ADR 0016): varianta D a planșelor (ADR 0024, decizia owner-ului din 08.10.2026), adică piese cu
 * arbore propriu, puse ca instanțe pe foi, plus operațiile piesei (ADR 0025): profilul stă în piesă și se taie la fel în
 * fiecare instanță, în sensul de tăiere al operației (ADR 0027, v4), cu urechile (ADR 0028, v5) și rampa ei (ADR 0029,
 * v6). Contractul întreg e în ADR-uri; oracolul independent (`test/oracles/document.ts`) îl citește de acolo, nu de aici.
 *
 * Câmpurile necunoscute se păstrează, ca un document scris de o versiune mai nouă să nu piardă date trecând printr-una
 * mai veche. Un câmp nou CU SENS (fața de jos, montajele, sculele) intră doar cu o schemă nouă și o migrare: o versiune
 * veche n-are voie să taie fără să înțeleagă un câmp.
 */
export const VERSIUNE_SCHEMA = 6;

/** Plafoanele stau pe artefact (T23): un document care le trece e refuzat la ușă, nu tăiat. */
export const PLAFON = {
  latura: 10_000,
  grosime: 1_000,
  noduri: 100_000,
  instante: 100_000,
  foi: 1_000,
  adancime: 32,
  idLungime: 64,
  numeLungime: 200,
  campuri: 200,
  campCheie: 200,
  campLungime: 10_000,
  /** Imbricarea întregului JSON, cu câmpurile necunoscute: JSON-ul canonic și clonarea rămân departe de stivă. */
  imbricareJson: 200,
  /** Cât de departe poate sta ceva de originea foii, în mm (instanța și translația compusă din piesă). */
  translatie: 10_000_000,
  /** Scara compusă a unui nod din piesă, pe fiecare coeficient al matricei. */
  scara: 10_000,
  /**
   * Elementele în lume ale tuturor foilor: instanțele înmulțite cu elementele pieselor lor. Cât plafonul de elemente din
   * v1: pânza, CAM-ul, avertismentele și lista sunt liniare în ele.
   */
  elementeLume: 100_000,
  /** Operațiile tuturor pieselor. */
  operatii: 100_000,
  /** Nodurile pe care le referă o singură operație. */
  noduriOperatie: 10_000,
  /** Tăieturile în lume: peste instanțele tuturor foilor, referințele din operațiile piesei lor (ADR 0025). */
  taieturi: 100_000,
  /** Numărul sculei, cum îl scrie postul (`T<n>`). */
  numarScula: 999,
  /** Diametrul sculei, în mm. */
  diametruScula: 100,
  /** Adâncimea și pasul unei operații, în mm (cât grosimea maximă a unei foi). */
  adancimeOperatie: 1_000,
  /** Urechile pe o buclă a traseului (ADR 0028). */
  urechi: 100,
} as const;

export type Matrice = { a: number; b: number; c: number; d: number; e: number; f: number };
export type FormaDoc =
  | { tip: 'dreptunghi'; latime: number; inaltime: number; razaColt: number; [cheie: string]: unknown }
  | { tip: 'cerc'; raza: number; [cheie: string]: unknown };
export type ElementNod = {
  tip: 'element'; id: string; nume?: string; forma: FormaDoc; matrice: Matrice; [cheie: string]: unknown;
};
export type GrupNod = { tip: 'grup'; id: string; nume?: string; matrice: Matrice; copii: Nod[]; [cheie: string]: unknown };
export type Nod = ElementNod | GrupNod;
export type Scula = { numar: number; nume: string; diametru: number; [cheie: string]: unknown };
export type Latura = 'exterior' | 'interior' | 'pe-linie';
/** Sensul de tăiere (ADR 0027), cu axul M3: urcare = materialul păstrat în dreapta sensului de mers. */
export type Sens = 'urcare' | 'opozitie';
/**
 * Urechile unei operații de profil (ADR 0028): câte pe fiecare buclă, lungimea palierului pe traseul centrului frezei și
 * grosimea punții de la fața de jos a foii, în mm.
 */
export type Urechi = { numar: number; latime: number; grosime: number; [cheie: string]: unknown };
/** Rampa unei operații de profil (ADR 0029): lungimea în plan, de-a lungul buclei, pe care freza coboară o trecere (mm). */
export type Rampa = { lungime: number; [cheie: string]: unknown };
export type Operatie = {
  id: string; tip: 'profil'; noduri: string[]; scula: Scula; latura: Latura; sens: Sens; adancime: number; pas: number;
  urechi: Urechi | null; rampa: Rampa | null; [cheie: string]: unknown;
};
export type Piesa = { id: string; nume?: string; radacina: Nod; operatii: Operatie[]; [cheie: string]: unknown };
export type Stoc = { latime: number; inaltime: number; grosime: number; [cheie: string]: unknown };
export type Instanta = {
  id: string; piesa: string; x: number; y: number; rotire: number; campuri?: Record<string, string>; [cheie: string]: unknown;
};
export type Foaie = { id: string; nume?: string; stoc: Stoc; instante: Instanta[]; [cheie: string]: unknown };
export type Document = { schema: 6; rev: number; piese: Piesa[]; foi: Foaie[]; [cheie: string]: unknown };

const finit = v.pipe(v.number(), v.finite());
const pozitiv = (max: number) => v.pipe(v.number(), v.finite(), v.gtValue(0), v.maxValue(max));
const Id = v.pipe(v.string(), v.minLength(1), v.maxLength(PLAFON.idLungime), v.regex(/^[A-Za-z0-9_-]+$/));
const Nume = v.optional(v.pipe(v.string(), v.maxLength(PLAFON.numeLungime)));

const SchemaMatrice = v.looseObject({ a: finit, b: finit, c: finit, d: finit, e: finit, f: finit });
const SchemaForma = v.variant('tip', [
  v.pipe(
    v.looseObject({
      tip: v.literal('dreptunghi'),
      latime: pozitiv(PLAFON.latura),
      inaltime: pozitiv(PLAFON.latura),
      razaColt: v.pipe(v.number(), v.finite(), v.minValue(0), v.maxValue(PLAFON.latura)),
    }),
    v.check((f) => 2 * f.razaColt <= Math.min(f.latime, f.inaltime), 'raza colțului trece de jumătate din latura mai mică'),
  ),
  v.looseObject({ tip: v.literal('cerc'), raza: pozitiv(PLAFON.latura) }),
]);

const SchemaElement = v.looseObject({ tip: v.literal('element'), id: Id, nume: Nume, forma: SchemaForma, matrice: SchemaMatrice });
// Arborele e recursiv; ușa mărginește imbricarea întregului JSON (200 de niveluri) înainte de schemă (`incarcare.ts`),
// ca un document de 100 000 de niveluri să nu umple stiva parserului. Adâncimea arborelui și nodurile le judecă apoi
// `problemaDeAnsamblu`, iterativ.
const SchemaNod: v.GenericSchema<unknown, Nod> = v.variant('tip', [
  SchemaElement,
  v.looseObject({
    tip: v.literal('grup'),
    id: Id,
    nume: Nume,
    matrice: SchemaMatrice,
    copii: v.array(v.lazy(() => SchemaNod)),
  }),
]) as v.GenericSchema<unknown, Nod>;

const SchemaOperatie = v.looseObject({
  id: Id,
  tip: v.literal('profil'),
  noduri: v.pipe(v.array(Id), v.minLength(1), v.maxLength(PLAFON.noduriOperatie)),
  scula: v.looseObject({
    numar: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(PLAFON.numarScula)),
    nume: v.pipe(v.string(), v.maxLength(PLAFON.numeLungime)),
    diametru: pozitiv(PLAFON.diametruScula),
  }),
  latura: v.picklist(['exterior', 'interior', 'pe-linie']),
  sens: v.picklist(['urcare', 'opozitie']),
  adancime: pozitiv(PLAFON.adancimeOperatie),
  pas: pozitiv(PLAFON.adancimeOperatie),
  urechi: v.nullable(v.looseObject({
    numar: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(PLAFON.urechi)),
    latime: pozitiv(PLAFON.latura),
    grosime: pozitiv(PLAFON.grosime),
  })),
  rampa: v.nullable(v.looseObject({ lungime: pozitiv(PLAFON.latura) })),
});
const SchemaPiesa = v.looseObject({ id: Id, nume: Nume, radacina: SchemaNod, operatii: v.array(SchemaOperatie) });
const SchemaInstanta = v.looseObject({
  id: Id,
  piesa: Id,
  x: finit,
  y: finit,
  rotire: v.pipe(v.number(), v.finite(), v.minValue(0), v.ltValue(360)),
  campuri: v.optional(v.pipe(
    v.record(v.pipe(v.string(), v.maxLength(PLAFON.campCheie)), v.pipe(v.string(), v.maxLength(PLAFON.campLungime))),
    v.check((c) => Object.keys(c).length <= PLAFON.campuri, `cel mult ${PLAFON.campuri} de câmpuri pe instanță`),
  )),
});
const SchemaFoaie = v.looseObject({
  id: Id,
  nume: Nume,
  stoc: v.looseObject({ latime: pozitiv(PLAFON.latura), inaltime: pozitiv(PLAFON.latura), grosime: pozitiv(PLAFON.grosime) }),
  instante: v.array(SchemaInstanta),
});

/** Nodurile unei piese, în preordine, cu adâncimea lor (rădăcina are 1). Iterativ: arborele poate fi adânc. */
export function noduriPiesa(radacina: Nod): Array<{ readonly nod: Nod; readonly adancime: number }> {
  const rez: Array<{ nod: Nod; adancime: number }> = [];
  const stiva: Array<{ nod: Nod; adancime: number }> = [{ nod: radacina, adancime: 1 }];
  while (stiva.length > 0) {
    const x = stiva.pop();
    if (!x) break;
    rez.push(x);
    if (x.nod.tip === 'grup') {
      for (let i = x.nod.copii.length - 1; i >= 0; i--) {
        const c = x.nod.copii[i];
        if (c) stiva.push({ nod: c, adancime: x.adancime + 1 });
      }
    }
  }
  return rez;
}

/**
 * Matricea compusă a fiecărui nod față de rădăcina piesei rămâne finită și mărginită: un lanț de 32 de scalări mari ar
 * da altfel Infinity sau NaN în lume (pe pânză și în CAM). Compunerea e cea din `lume.ts`, de sus în jos.
 */
function matriciInMargini(p: Piesa): string | null {
  const stiva = [{ nod: p.radacina, m: IDENTITATE }];
  while (stiva.length > 0) {
    const x = stiva.pop();
    if (!x) break;
    const m = compune(x.m, x.nod.matrice);
    const { a, b, c, d, e, f } = m;
    if (![a, b, c, d, e, f].every(Number.isFinite)) return `piesa ${p.id}: matricea compusă a nodului ${x.nod.id} nu e finită`;
    if (Math.max(Math.abs(a), Math.abs(b), Math.abs(c), Math.abs(d)) > PLAFON.scara) return `piesa ${p.id}: nodul ${x.nod.id} e scalat peste ${PLAFON.scara}`;
    if (Math.max(Math.abs(e), Math.abs(f)) > PLAFON.translatie) return `piesa ${p.id}: nodul ${x.nod.id} stă la peste ${PLAFON.translatie} mm`;
    // Arcele trec exact doar prin similitudini (ADR 0002): sub o matrice neuniformă, cercul ar fi o elipsă, pe care
    // pânza și CAM-ul nu o desenează încă. Instanța adaugă doar o rotire, deci decide matricea din piesă.
    if (x.nod.tip === 'element' && areArce(x.nod.forma) && !esteSimilitudine(m)) {
      return `piesa ${p.id}: ${x.nod.id} are arce sub o matrice neuniformă (elipsele vin mai târziu)`;
    }
    if (x.nod.tip === 'grup') for (const copil of x.nod.copii) stiva.push({ nod: copil, m });
  }
  return null;
}

function areArce(f: FormaDoc): boolean {
  return f.tip === 'cerc' || f.razaColt > 0;
}

/** Cât ocupă documentul din plafoanele lui: nodurile, instanțele și elementele în lume. */
export type Numaratoare = {
  readonly noduri: number; readonly instante: number; readonly elementeLume: number; readonly operatii: number; readonly taieturi: number;
};

export function numara(d: Document): Numaratoare {
  const elementePiesa = new Map<string, number>();
  const referintePiesa = new Map<string, number>();
  let noduri = 0;
  let operatii = 0;
  for (const p of d.piese) {
    let elemente = 0;
    for (const { nod } of noduriPiesa(p.radacina)) {
      noduri++;
      if (nod.tip === 'element') elemente++;
    }
    elementePiesa.set(p.id, elemente);
    operatii += p.operatii.length;
    referintePiesa.set(p.id, p.operatii.reduce((s, o) => s + o.noduri.length, 0));
  }
  let instante = 0;
  let elementeLume = 0;
  let taieturi = 0;
  for (const f of d.foi) {
    for (const i of f.instante) {
      instante++;
      elementeLume += elementePiesa.get(i.piesa) ?? 0;
      taieturi += referintePiesa.get(i.piesa) ?? 0;
    }
  }
  return { noduri, instante, elementeLume, operatii, taieturi };
}

/**
 * Primul plafon de ansamblu depășit, cu motivul, sau null. Un singur adevăr pentru ușă (documentul încărcat) și pentru
 * acțiuni (documentul care ar rezulta): ce adaugă interfața trebuie să se poată redeschide.
 */
export function plafonDepasit(n: Numaratoare): string | null {
  if (n.noduri > PLAFON.noduri) return `documentul are ${n.noduri} de noduri, peste ${PLAFON.noduri}`;
  if (n.operatii > PLAFON.operatii) return `documentul are ${n.operatii} de operații, peste ${PLAFON.operatii}`;
  if (n.instante > PLAFON.instante) return `documentul are ${n.instante} de instanțe, peste ${PLAFON.instante}`;
  if (n.elementeLume > PLAFON.elementeLume) return `foile au ${n.elementeLume} de elemente în lume, peste ${PLAFON.elementeLume}`;
  if (n.taieturi > PLAFON.taieturi) return `foile au ${n.taieturi} de tăieturi în lume, peste ${PLAFON.taieturi}`;
  return null;
}

/** Problema operațiilor unei piese (ADR 0025), sau null: id-uri unice în piesă, noduri distincte, toate elemente ale ei. */
function problemaOperatii(p: Piesa, elemente: ReadonlySet<string>): string | null {
  const ids = new Set<string>();
  for (const o of p.operatii) {
    if (ids.has(o.id)) return `piesa ${p.id} are două operații cu id-ul ${o.id}`;
    ids.add(o.id);
    if (new Set(o.noduri).size !== o.noduri.length) return `operația ${o.id} din piesa ${p.id} referă un nod de două ori`;
    const lipsa = o.noduri.find((n) => !elemente.has(n));
    if (lipsa !== undefined) return `operația ${o.id} din piesa ${p.id} referă ${lipsa}, care nu e un element al piesei`;
  }
  return null;
}

/** Ce cere contractul peste forma fiecărui câmp: unicitatea, referințele și plafoanele de ansamblu. */
function problemaDeAnsamblu(d: Document): string | null {
  const piese = new Set<string>();
  for (const p of d.piese) {
    if (piese.has(p.id)) return `două piese au id-ul ${p.id}`;
    const ids = new Set<string>();
    const idsElemente = new Set<string>();
    for (const { nod, adancime } of noduriPiesa(p.radacina)) {
      if (adancime > PLAFON.adancime) return `piesa ${p.id} trece de ${PLAFON.adancime} de niveluri`;
      if (ids.has(nod.id)) return `piesa ${p.id} are două noduri cu id-ul ${nod.id}`;
      ids.add(nod.id);
      if (nod.tip === 'element') idsElemente.add(nod.id);
    }
    piese.add(p.id);
    const op = problemaOperatii(p, idsElemente);
    if (op) return op;
  }
  const foi = new Set<string>();
  const instante = new Set<string>();
  for (const f of d.foi) {
    if (foi.has(f.id)) return `două foi au id-ul ${f.id}`;
    foi.add(f.id);
    for (const i of f.instante) {
      if (instante.has(i.id)) return `două instanțe au id-ul ${i.id}`;
      instante.add(i.id);
      if (!piese.has(i.piesa)) return `instanța ${i.id} trimite la piesa lipsă ${i.piesa}`;
      if (Math.max(Math.abs(i.x), Math.abs(i.y)) > PLAFON.translatie) return `instanța ${i.id} stă la peste ${PLAFON.translatie} mm`;
    }
  }
  // Id-urile și referințele sunt în regulă, deci numărătoarea e cea a documentului: aceeași pe care o folosesc acțiunile.
  const plafon = plafonDepasit(numara(d));
  if (plafon) return plafon;
  for (const p of d.piese) {
    const m = matriciInMargini(p);
    if (m) return m;
  }
  return null;
}

export const SchemaDocument: v.GenericSchema<unknown, Document> = v.pipe(
  v.looseObject({
    schema: v.literal(VERSIUNE_SCHEMA),
    rev: v.pipe(v.number(), v.safeInteger(), v.minValue(0)),
    piese: v.array(SchemaPiesa),
    foi: v.pipe(v.array(SchemaFoaie), v.minLength(1, 'documentul are cel puțin o foaie'), v.maxLength(PLAFON.foi)),
  }),
  v.rawCheck(({ dataset, addIssue }) => {
    if (!dataset.typed) return;
    const p = problemaDeAnsamblu(dataset.value as Document);
    if (p) addIssue({ message: p });
  }),
) as v.GenericSchema<unknown, Document>;

/**
 * Operația implicită a unei forme noi (Adaugă): profilul cu care se taie placa 1 — cercul e o gaură (interior, 8 mm în
 * 2 treceri), dreptunghiul o insulă (exterior, 3 mm), cu freza plată Ø6, în urcare, fără urechi și fără rampă. Migrarea v2 → v3 are
 * propria copie, înghețată.
 */
export function operatieImplicita(nod: string, forma: FormaDoc, scula: Operatie['scula'] = { numar: 1, nume: 'freza plata', diametru: 6 }): Operatie {
  return forma.tip === 'cerc'
    ? { id: nod, tip: 'profil', noduri: [nod], scula, latura: 'interior', sens: 'urcare', adancime: 8, pas: 4, urechi: null, rampa: null }
    : { id: nod, tip: 'profil', noduri: [nod], scula, latura: 'exterior', sens: 'urcare', adancime: 3, pas: 3, urechi: null, rampa: null };
}

/**
 * O operație care trece de schema curentă: forma și marginile valorilor (adâncimea, pasul, scula). Referințele și unicitatea
 * le judecă documentul întreg, la ușă. O scriere din interfață o cere înainte, ca proiectul salvat să se poată redeschide.
 */
export function operatieInMargini(o: unknown): boolean {
  return v.safeParse(SchemaOperatie, o).success;
}

/** Un document nou, gol, cu o foaie. */
export function documentNou(stoc: { latime: number; inaltime: number; grosime: number }): Document {
  return { schema: VERSIUNE_SCHEMA, rev: 0, piese: [], foi: [{ id: 'f1', stoc: { ...stoc }, instante: [] }] };
}
