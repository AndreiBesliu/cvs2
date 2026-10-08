import * as v from 'valibot';

/**
 * Schema documentului v1 (felia 1.7a), ÎNGHEȚATĂ: e doar intrarea migrării v1 → v2. Un document v1 se validează întâi cu
 * ea, ca migrarea să lucreze pe forma pe care o promite, nu pe orice obiect cu `schema: 1`. Nu se mai schimbă: o
 * schimbare aici ar schimba ce înseamnă un fișier v1 deja scris.
 */
const finit = v.pipe(v.number(), v.finite());
const pozitiv = (max: number) => v.pipe(v.number(), v.finite(), v.gtValue(0), v.maxValue(max));

export const SchemaDocumentV1 = v.pipe(
  v.looseObject({
    schema: v.literal(1),
    rev: v.pipe(v.number(), v.integer(), v.minValue(0)),
    foaie: v.looseObject({ latime: pozitiv(10_000), inaltime: pozitiv(10_000), grosime: pozitiv(1_000) }),
    elemente: v.pipe(
      v.array(v.looseObject({
        id: v.pipe(v.string(), v.minLength(1), v.maxLength(64), v.regex(/^[A-Za-z0-9_-]+$/)),
        nume: v.optional(v.pipe(v.string(), v.maxLength(200))),
        forma: v.variant('tip', [
          v.looseObject({
            tip: v.literal('dreptunghi'),
            latime: pozitiv(10_000),
            inaltime: pozitiv(10_000),
            razaColt: v.pipe(v.number(), v.finite(), v.minValue(0), v.maxValue(10_000)),
          }),
          v.looseObject({ tip: v.literal('cerc'), raza: pozitiv(10_000) }),
        ]),
        matrice: v.looseObject({ a: finit, b: finit, c: finit, d: finit, e: finit, f: finit }),
      })),
      v.maxLength(100_000),
    ),
  }),
  v.check((d) => new Set(d.elemente.map((e) => e.id)).size === d.elemente.length, 'două elemente au același id'),
);

export type DocumentV1 = v.InferOutput<typeof SchemaDocumentV1>;
