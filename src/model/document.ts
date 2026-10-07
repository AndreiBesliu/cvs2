import * as v from 'valibot';

/**
 * Documentul v1 (T16, ADR 0016): primul nivel, comun variantelor A și D, adică o foaie cu elementele ei. Arborele
 * variantei alese (piesele și instanțele la D, planșele și ramele la A) vine ca migrare v1 → v2, după alegerea owner-ului
 * (`BRIEF.md` §9). Câmpurile necunoscute se păstrează, ca un document scris de o versiune mai nouă să nu piardă date
 * trecând printr-una mai veche.
 */
export const VERSIUNE_SCHEMA = 1;

/** Plafoanele stau pe artefact (T23): un document care le trece e refuzat la ușă, nu tăiat. */
export const PLAFON = {
  latura: 10_000,
  elemente: 100_000,
  idLungime: 64,
  numeLungime: 200,
} as const;

const finit = v.pipe(v.number(), v.finite());
const pozitiv = (max: number) => v.pipe(v.number(), v.finite(), v.gtValue(0), v.maxValue(max));

const Matrice = v.looseObject({ a: finit, b: finit, c: finit, d: finit, e: finit, f: finit });

const Dreptunghi = v.looseObject({
  tip: v.literal('dreptunghi'),
  latime: pozitiv(PLAFON.latura),
  inaltime: pozitiv(PLAFON.latura),
  razaColt: v.pipe(v.number(), v.finite(), v.minValue(0), v.maxValue(PLAFON.latura)),
});
const Cerc = v.looseObject({ tip: v.literal('cerc'), raza: pozitiv(PLAFON.latura) });

const Element = v.looseObject({
  id: v.pipe(v.string(), v.minLength(1), v.maxLength(PLAFON.idLungime), v.regex(/^[A-Za-z0-9_-]+$/)),
  nume: v.optional(v.pipe(v.string(), v.maxLength(PLAFON.numeLungime))),
  forma: v.variant('tip', [Dreptunghi, Cerc]),
  matrice: Matrice,
});

export const SchemaDocument = v.pipe(
  v.looseObject({
    schema: v.literal(VERSIUNE_SCHEMA),
    rev: v.pipe(v.number(), v.integer(), v.minValue(0)),
    foaie: v.looseObject({ latime: pozitiv(PLAFON.latura), inaltime: pozitiv(PLAFON.latura), grosime: pozitiv(1_000) }),
    elemente: v.pipe(v.array(Element), v.maxLength(PLAFON.elemente)),
  }),
  v.check((d) => new Set(d.elemente.map((e) => e.id)).size === d.elemente.length, 'două elemente au același id'),
);

export type Document = v.InferOutput<typeof SchemaDocument>;
export type ElementDoc = Document['elemente'][number];
export type FormaDoc = ElementDoc['forma'];

/** Un document nou, gol, pe o foaie. */
export function documentNou(foaie: { latime: number; inaltime: number; grosime: number }): Document {
  return { schema: VERSIUNE_SCHEMA, rev: 0, foaie, elemente: [] };
}
