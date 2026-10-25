import * as v from 'valibot';
import { compune, esteSimilitudine, IDENTITATE } from '../geom/matrice.ts';
import {
  areArce, instantaPreaDeparte, noduriPiesa, numara, plafonDepasit, PLAFON, VERSIUNE_SCHEMA, type Document, type Nod, type Piesa,
} from './document.ts';

/**
 * Schemele documentului v11 (T16, ADR 0016): ușa (`incarcare.ts`) și marginile unei operații scrise din interfață
 * (`operatieInMargini`, la Exportă). Stau într-un modul al lor, nu în `document.ts`: tipurile, plafoanele și numărătoarea
 * le folosește pachetul de pornire, schemele (cu valibot) doar ușa și fereastra exportului, care vin la cerere (loc în
 * pachetul de pornire, 17.10). Contractul e cel din `document.ts` și din ADR-uri; textul schemelor e mutat neschimbat.
 */

const finit = v.pipe(v.number(), v.finite());
const pozitiv = (max: number) => v.pipe(v.number(), v.finite(), v.gtValue(0), v.maxValue(max));
const Id = v.pipe(v.string(), v.minLength(1), v.maxLength(PLAFON.idLungime), v.regex(/^[A-Za-z0-9_-]+$/));
const Nume = v.optional(v.pipe(v.string(), v.maxLength(PLAFON.numeLungime)));

const SchemaMatrice = v.looseObject({ a: finit, b: finit, c: finit, d: finit, e: finit, f: finit });
const coordonata = v.pipe(v.number(), v.finite(), v.minValue(-PLAFON.translatie), v.maxValue(PLAFON.translatie));
const SchemaPunct = v.looseObject({ x: coordonata, y: coordonata });
const SchemaSegment = v.variant('tip', [
  v.looseObject({ tip: v.literal('L') }),
  v.looseObject({ tip: v.literal('A'), bulge: v.pipe(v.number(), v.finite(), v.check((b) => b !== 0, 'un arc cu bulge 0 n-are cerc')) }),
  v.looseObject({ tip: v.literal('C'), c1: SchemaPunct, c2: SchemaPunct }),
]);
type PunctXY = { readonly x: number; readonly y: number };

/**
 * Fiecare arc REAL al căii trece de `bun`, cu capetele lui: o cale închisă are n segmente, una deschisă n − 1 (ADR 0037 §2).
 * Pe o cale deschisă, ultimul vârf n-are segment: vecinul luat cu `(i + 1) % n` ar închide calea.
 */
function arceleReale(
  f: { readonly inchis: boolean; readonly varfuri: ReadonlyArray<{ readonly p: PunctXY; readonly s: { readonly tip: string; readonly bulge?: number } }> },
  bun: (a: PunctXY, b: PunctXY, bulge: number) => boolean,
): boolean {
  const n = f.varfuri.length;
  for (let i = 0; i < (f.inchis ? n : n - 1); i++) {
    const x = f.varfuri[i], urm = f.varfuri[(i + 1) % n];
    if (x && urm && x.s.tip === 'A' && !bun(x.p, urm.p, x.s.bulge ?? 0)) return false;
  }
  return true;
}

/**
 * Calea (ADR 0034, ADR 0037 §2): închisă sau deschisă. Un arc trebuie să aibă capetele în puncte diferite, altfel n-are
 * cerc; verificările arcului se fac doar pe segmentele reale. Pe o cale deschisă, segmentul ultimului vârf e `L`: un
 * segment ignorat ar fi o dată ascunsă, pe care o versiune viitoare sau o închidere ar face-o reală fără ca cineva s-o vadă.
 */
const SchemaCale = v.pipe(
  v.looseObject({
    tip: v.literal('cale'),
    inchis: v.boolean(),
    varfuri: v.pipe(
      v.array(v.looseObject({ p: SchemaPunct, s: SchemaSegment })),
      v.minLength(2, 'o cale are cel puțin 2 vârfuri'),
      v.maxLength(PLAFON.varfuriCale, `o cale are cel mult ${PLAFON.varfuriCale} de vârfuri`),
    ),
  }),
  v.check((f) => f.inchis || f.varfuri[f.varfuri.length - 1]?.s.tip === 'L',
    'ultimul vârf al unei căi deschise are un segment care nu e „L” (segmentul lui nu există)'),
  v.check((f) => arceleReale(f, (a, b) => a.x !== b.x || a.y !== b.y), 'un arc al căii are capetele în același punct: n-are cerc'),
  // Raza arcului, (c / 4)·(b + 1/b), cel mult a cercului (recenzia 2.7b): un bulge aproape de 0 dă un cerc cât un continent,
  // unul uriaș depășește double-ul (NaN), iar pânza lucrează în float32. Scrisă ca `<=`, ca NaN și Infinity să cadă.
  v.check((f) => arceleReale(f, (a, b, bulge) => {
    const k = Math.abs(bulge);
    return (Math.hypot(b.x - a.x, b.y - a.y) / 4) * (k + 1 / k) <= PLAFON.latura;
  }), `un arc al căii are raza peste ${PLAFON.latura} mm`),
);
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
  SchemaCale,
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
  tip: v.picklist(['profil', 'buzunar']),
  noduri: v.pipe(v.array(Id), v.minLength(1), v.maxLength(PLAFON.noduriOperatie)),
  scula: v.looseObject({
    numar: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(PLAFON.numarScula)),
    nume: v.pipe(v.string(), v.maxLength(PLAFON.numeLungime)),
    diametru: pozitiv(PLAFON.diametruScula),
  }),
  latura: v.picklist(['exterior', 'interior', 'pe-linie', 'stanga', 'dreapta']),
  sens: v.picklist(['urcare', 'opozitie']),
  adancime: pozitiv(PLAFON.adancimeOperatie),
  pas: pozitiv(PLAFON.adancimeOperatie),
  urechi: v.nullable(v.looseObject({
    numar: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(PLAFON.urechi)),
    latime: pozitiv(PLAFON.latura),
    grosime: pozitiv(PLAFON.grosime),
  })),
  rampa: v.nullable(v.looseObject({ lungime: pozitiv(PLAFON.latura) })),
  intrari: v.nullable(v.looseObject({ raza: pozitiv(PLAFON.latura) })),
  colturi: v.nullable(v.looseObject({ tip: v.picklist(['dog-bone', 't-bone']) })),
  despartire: v.optional(v.boolean()),
  // ADR 0069 §1: pasul lateral al buzunarului; potrivirea lui cu freza și cu felul operației e a lucrării, nu a ușii (ca la
  // latura unei căi deschise, ADR 0037 §2).
  pasLateral: v.optional(pozitiv(PLAFON.diametruScula / 2)),
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
/** Ghidajele foii (ADR 0050): opționale, fără schemă nouă (nu schimbă tăierea); plafonul și poziția, ca la instanțe. */
const SchemaGhidaj = v.looseObject({ id: Id, axa: v.picklist(['x', 'y']), poz: coordonata });
const SchemaFoaie = v.looseObject({
  id: Id,
  nume: Nume,
  stoc: v.looseObject({ latime: pozitiv(PLAFON.latura), inaltime: pozitiv(PLAFON.latura), grosime: pozitiv(PLAFON.grosime) }),
  instante: v.array(SchemaInstanta),
  ghidaje: v.optional(v.pipe(v.array(SchemaGhidaj), v.maxLength(PLAFON.ghidaje, `cel mult ${PLAFON.ghidaje} de ghidaje pe foaie`))),
});

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
    const ghidaje = new Set<string>();
    for (const g of f.ghidaje ?? []) {
      if (ghidaje.has(g.id)) return `două ghidaje ale foii ${f.id} au id-ul ${g.id}`;
      ghidaje.add(g.id);
    }
    for (const i of f.instante) {
      if (instante.has(i.id)) return `două instanțe au id-ul ${i.id}`;
      instante.add(i.id);
      if (!piese.has(i.piesa)) return `instanța ${i.id} trimite la piesa lipsă ${i.piesa}`;
      if (instantaPreaDeparte(i.x, i.y)) return `instanța ${i.id} stă la peste ${PLAFON.translatie} mm`;
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
 * O operație care trece de schema curentă: forma și marginile valorilor (adâncimea, pasul, scula). Referințele și unicitatea
 * le judecă documentul întreg, la ușă. O scriere din interfață o cere înainte, ca proiectul salvat să se poată redeschide.
 */
export function operatieInMargini(o: unknown): boolean {
  return v.safeParse(SchemaOperatie, o).success;
}
