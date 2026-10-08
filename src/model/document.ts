import * as v from 'valibot';

/**
 * Documentul v2 (T16, ADR 0016), varianta D a planșelor (ADR 0024, decizia owner-ului din 08.10.2026): piese cu arbore
 * propriu, puse ca instanțe pe foi. Contractul întreg e în ADR 0024; oracolul independent (`test/oracles/document.ts`)
 * îl citește de acolo, nu de aici.
 *
 * Câmpurile necunoscute se păstrează, ca un document scris de o versiune mai nouă să nu piardă date trecând printr-una
 * mai veche. Un câmp nou CU SENS (fața de jos, montajele, sculele) intră doar cu o schemă nouă și o migrare: o versiune
 * veche n-are voie să taie fără să înțeleagă un câmp.
 */
export const VERSIUNE_SCHEMA = 2;

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
  campLungime: 10_000,
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
export type Piesa = { id: string; nume?: string; radacina: Nod; [cheie: string]: unknown };
export type Stoc = { latime: number; inaltime: number; grosime: number; [cheie: string]: unknown };
export type Instanta = {
  id: string; piesa: string; x: number; y: number; rotire: number; campuri?: Record<string, string>; [cheie: string]: unknown;
};
export type Foaie = { id: string; nume?: string; stoc: Stoc; instante: Instanta[]; [cheie: string]: unknown };
export type Document = { schema: 2; rev: number; piese: Piesa[]; foi: Foaie[]; [cheie: string]: unknown };

const finit = v.pipe(v.number(), v.finite());
const pozitiv = (max: number) => v.pipe(v.number(), v.finite(), v.gtValue(0), v.maxValue(max));
const Id = v.pipe(v.string(), v.minLength(1), v.maxLength(PLAFON.idLungime), v.regex(/^[A-Za-z0-9_-]+$/));
const Nume = v.optional(v.pipe(v.string(), v.maxLength(PLAFON.numeLungime)));

const SchemaMatrice = v.looseObject({ a: finit, b: finit, c: finit, d: finit, e: finit, f: finit });
const SchemaForma = v.variant('tip', [
  v.looseObject({
    tip: v.literal('dreptunghi'),
    latime: pozitiv(PLAFON.latura),
    inaltime: pozitiv(PLAFON.latura),
    razaColt: v.pipe(v.number(), v.finite(), v.minValue(0), v.maxValue(PLAFON.latura)),
  }),
  v.looseObject({ tip: v.literal('cerc'), raza: pozitiv(PLAFON.latura) }),
]);

const SchemaElement = v.looseObject({ tip: v.literal('element'), id: Id, nume: Nume, forma: SchemaForma, matrice: SchemaMatrice });
// Arborele e recursiv; adâncimea și numărul de noduri le mărginește ușa înainte de schemă (`incarcare.ts`), ca un
// document de 100 000 de niveluri să nu umple stiva parserului.
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

const SchemaPiesa = v.looseObject({ id: Id, nume: Nume, radacina: SchemaNod });
const SchemaInstanta = v.looseObject({
  id: Id,
  piesa: Id,
  x: finit,
  y: finit,
  rotire: v.pipe(v.number(), v.finite(), v.minValue(0), v.ltValue(360)),
  campuri: v.optional(v.pipe(
    v.record(v.pipe(v.string(), v.maxLength(PLAFON.idLungime)), v.pipe(v.string(), v.maxLength(PLAFON.campLungime))),
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

/** Ce cere contractul peste forma fiecărui câmp: unicitatea, referințele și plafoanele de ansamblu. */
function problemaDeAnsamblu(d: Document): string | null {
  const piese = new Set<string>();
  let noduri = 0;
  for (const p of d.piese) {
    if (piese.has(p.id)) return `două piese au id-ul ${p.id}`;
    piese.add(p.id);
    const ids = new Set<string>();
    for (const { nod, adancime } of noduriPiesa(p.radacina)) {
      if (adancime > PLAFON.adancime) return `piesa ${p.id} trece de ${PLAFON.adancime} de niveluri`;
      if (ids.has(nod.id)) return `piesa ${p.id} are două noduri cu id-ul ${nod.id}`;
      ids.add(nod.id);
      noduri++;
    }
  }
  if (noduri > PLAFON.noduri) return `documentul are ${noduri} de noduri, peste ${PLAFON.noduri}`;
  const foi = new Set<string>();
  const instante = new Set<string>();
  for (const f of d.foi) {
    if (foi.has(f.id)) return `două foi au id-ul ${f.id}`;
    foi.add(f.id);
    for (const i of f.instante) {
      if (instante.has(i.id)) return `două instanțe au id-ul ${i.id}`;
      instante.add(i.id);
      if (!piese.has(i.piesa)) return `instanța ${i.id} trimite la piesa lipsă ${i.piesa}`;
    }
  }
  if (instante.size > PLAFON.instante) return `documentul are ${instante.size} de instanțe, peste ${PLAFON.instante}`;
  return null;
}

export const SchemaDocument: v.GenericSchema<unknown, Document> = v.pipe(
  v.looseObject({
    schema: v.literal(VERSIUNE_SCHEMA),
    rev: v.pipe(v.number(), v.integer(), v.minValue(0)),
    piese: v.array(SchemaPiesa),
    foi: v.pipe(v.array(SchemaFoaie), v.minLength(1, 'documentul are cel puțin o foaie'), v.maxLength(PLAFON.foi)),
  }),
  v.rawCheck(({ dataset, addIssue }) => {
    if (!dataset.typed) return;
    const p = problemaDeAnsamblu(dataset.value as Document);
    if (p) addIssue({ message: p });
  }),
) as v.GenericSchema<unknown, Document>;

/** Un document nou, gol, cu o foaie. */
export function documentNou(stoc: { latime: number; inaltime: number; grosime: number }): Document {
  return { schema: VERSIUNE_SCHEMA, rev: 0, piese: [], foi: [{ id: 'f1', stoc: { ...stoc }, instante: [] }] };
}
