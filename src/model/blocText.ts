/**
 * Blocul de text (ADR 0105 §4): ce a cerut omul pentru textul unei piese (conținutul, fontul, înălțimea majusculei,
 * spațierea, rândurile, alinierea), ținut pe grupul rădăcină al piesei, ca textul să se poată edita din nou după salvare.
 *
 * Nu e o schemă nouă a documentului: ce se taie sunt contururile literelor, scrise în piesă ca la orice import, iar un câmp
 * fără sens pentru tăiere se păstrează și de o versiune care nu-l cunoaște (ADR 0024), care taie la fel. Amprenta
 * contururilor leagă blocul de geometrie: dacă ele se schimbă altfel decât prin text (o editare de noduri, o înclinare, o
 * versiune veche a aplicației), blocul nu mai e valid, iar piesa rămâne doar vectori. Scalarea uniformă (`transformare.ts`)
 * îl ține la zi: înălțimea și spațierea cresc cu ea, iar amprenta se recalculează.
 */
import * as v from 'valibot';
import { amprentaSir } from './amprenta.ts';
import type { Nod } from './document.ts';
import { jsonCanonic } from './jsonCanonic.ts';

export const ALINIERI_TEXT = ['stanga', 'centru', 'dreapta'] as const;
/** Textul pe curbă (ADR 0108): poziția blocului față de curbă și orientarea literelor. */
export const POZITII_PE_CURBA = ['deasupra', 'baza', 'centru', 'dedesubt'] as const;
export const ORIENTARI_PE_CURBA = ['rotita', 'verticala'] as const;

/**
 * Marginile blocului: caracterele, înălțimea majusculei și spațierea în mm, rândurile (multiplu), id-ul fontului (ADR 0106:
 * și `g:<familia>:<varianta>`, `s:<numele PostScript>`) și numele lui arătat.
 */
export const LIMITE_TEXT = {
  caractere: 1_000, inaltimeMinima: 0.1, inaltimeMaxima: 1_000, spatiere: 1_000, interlinieMinima: 0.5, interlinieMaxima: 5, font: 128, numeFont: 128,
  /** Curba unui text pe curbă: vârfurile ei și distanța față de ea (mm). */
  varfuriCurba: 10_000, distantaCurba: 1_000,
} as const;

const numar = (min: number, max: number) => v.pipe(v.number(), v.finite(), v.minValue(min), v.maxValue(max));

const finit = v.pipe(v.number(), v.finite());
const SchemaPunctText = v.object({ x: finit, y: finit });

/**
 * Curba unui text pe curbă (ADR 0108 §2), în sistemul piesei (originea e ancora, pe curbă): conturul (linii, arce, cubice),
 * distanța pe curbă a ancorei, poziția, distanța față de curbă, partea, orientarea, întinderea pe toată curba.
 */
export const SchemaCurbaText = v.object({
  inchis: v.boolean(),
  varfuri: v.pipe(
    v.array(v.object({
      p: SchemaPunctText,
      s: v.variant('tip', [
        v.object({ tip: v.literal('L') }),
        v.object({ tip: v.literal('A'), bulge: finit }),
        v.object({ tip: v.literal('C'), c1: SchemaPunctText, c2: SchemaPunctText }),
      ]),
    })),
    v.minLength(2), v.maxLength(LIMITE_TEXT.varfuriCurba),
  ),
  s: v.pipe(v.number(), v.finite(), v.minValue(0)),
  pozitie: v.picklist(POZITII_PE_CURBA),
  distanta: numar(-LIMITE_TEXT.distantaCurba, LIMITE_TEXT.distantaCurba),
  invers: v.boolean(),
  orientare: v.picklist(ORIENTARI_PE_CURBA),
  intinsa: v.boolean(),
});

export type CurbaText = v.InferOutput<typeof SchemaCurbaText>;

export const SchemaBlocText = v.object({
  continut: v.pipe(v.string(), v.minLength(1), v.maxLength(LIMITE_TEXT.caractere)),
  font: v.pipe(v.string(), v.minLength(1), v.maxLength(LIMITE_TEXT.font)),
  /** Numele fontului, arătat când fontul lipsește (unul al sistemului, pe alt calculator); lipsă la fonturile incluse. */
  numeFont: v.optional(v.pipe(v.string(), v.maxLength(LIMITE_TEXT.numeFont))),
  /** Textul pe curbă (ADR 0108); lipsă: textul e drept, din ancoră. */
  curba: v.optional(SchemaCurbaText),
  inaltime: numar(LIMITE_TEXT.inaltimeMinima, LIMITE_TEXT.inaltimeMaxima),
  spatiere: numar(-LIMITE_TEXT.spatiere, LIMITE_TEXT.spatiere),
  interlinie: numar(LIMITE_TEXT.interlinieMinima, LIMITE_TEXT.interlinieMaxima),
  aliniere: v.picklist(ALINIERI_TEXT),
  amprenta: v.pipe(v.string(), v.maxLength(64)),
});

export type BlocText = v.InferOutput<typeof SchemaBlocText>;

const amprente = new WeakMap<readonly Nod[], string>();

/** Amprenta contururilor unui bloc (copiii grupului rădăcină), ținută pe obiect: documentul nu se schimbă pe loc. */
export function amprentaContururi(copii: readonly Nod[]): string {
  const gata = amprente.get(copii);
  if (gata !== undefined) return gata;
  const a = amprentaSir(jsonCanonic(copii));
  amprente.set(copii, a);
  return a;
}

/** Blocul de text valid al unei rădăcini (cu amprenta contururilor de acum), sau null: piesa e doar vectori. */
export function blocText(radacina: Nod): BlocText | null {
  if (radacina.tip !== 'grup' || !Object.hasOwn(radacina, 'text')) return null;
  const r = v.safeParse(SchemaBlocText, radacina['text']);
  if (!r.success) return null;
  return r.output.amprenta === amprentaContururi(radacina.copii) ? r.output : null;
}

/**
 * Rădăcina scalată (`dupa`) a unei rădăcini cu bloc (`inainte`), cu scara locală (lx, ly): la o scalare uniformă, blocul
 * crește cu ea (înălțimea, spațierea) și primește amprenta noilor contururi; altfel (o scalare neuniformă) piesa devine
 * vectori, fără bloc. O rădăcină fără bloc valid trece neschimbată.
 */
export function blocScalat(inainte: Nod, dupa: Nod, lx: number, ly: number, uniforma: boolean): Nod {
  const b = blocText(inainte);
  if (!b || dupa.tip !== 'grup') return dupa;
  const { text: _vechi, ...fara } = dupa as Nod & { text?: unknown };
  if (!uniforma || !(lx > 0) || !(ly > 0)) return fara;
  const s = lx;
  const inaltime = b.inaltime * s;
  if (inaltime < LIMITE_TEXT.inaltimeMinima || inaltime > LIMITE_TEXT.inaltimeMaxima || Math.abs(b.spatiere * s) > LIMITE_TEXT.spatiere) return fara;
  // Curba unui text pe curbă crește cu el (coordonatele piesei se înmulțesc, ancora rămâne în origine, pe curbă).
  const p = (q: { readonly x: number; readonly y: number }) => ({ x: q.x * s, y: q.y * s });
  const curba = b.curba && {
    ...b.curba,
    varfuri: b.curba.varfuri.map((x) => ({ p: p(x.p), s: x.s.tip === 'C' ? { tip: 'C' as const, c1: p(x.s.c1), c2: p(x.s.c2) } : x.s })),
    s: b.curba.s * s,
    distanta: b.curba.distanta * s,
  };
  if (curba && Math.abs(curba.distanta) > LIMITE_TEXT.distantaCurba) return fara;
  return { ...dupa, text: { ...b, inaltime, spatiere: b.spatiere * s, ...(curba ? { curba } : {}), amprenta: amprentaContururi(dupa.copii) } };
}
