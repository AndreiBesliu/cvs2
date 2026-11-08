/**
 * Blocul de text (ADR 0105 §4): ce a cerut omul pentru textul unei piese (conținutul, fontul, înălțimea majusculei,
 * spațierea, rândurile, alinierea), ținut pe grupul rădăcină al piesei, ca textul să se poată edita din nou după salvare.
 *
 * Nu e o schemă nouă a documentului: ce se taie sunt contururile literelor, scrise în piesă ca la orice import, iar un câmp
 * fără sens pentru tăiere se păstrează și de o versiune care nu-l cunoaște (ADR 0024), care taie la fel. Amprenta
 * contururilor leagă blocul de geometrie: dacă ele se schimbă altfel decât prin text (o editare de noduri, o înclinare, o
 * versiune veche a aplicației), blocul nu mai e valid, iar piesa rămâne doar vectori. Scalarea uniformă (`transformare.ts`)
 * îl ține la zi: înălțimea și spațierea cresc cu ea, iar amprenta se recalculează; una neuniformă, doar pe un text drept fără
 * aldin (ADR 0138 §4), prin lățimea literelor.
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
  /**
   * Aldinul și cursivul sintetic (ADR 0123): îngroșarea pe fiecare parte, de la rezoluția modelului (mm) la o cincime din
   * înălțimea majusculei (miezul are atunci 3/5 din ea); înclinarea, în grade, în ambele sensuri.
   */
  aldinMinim: 0.01, aldinRaport: 0.2, cursiv: 45,
  /** Caseta textului (ADR 0142): lățimea și înălțimea ei, în mm. */
  casetaMinima: 0.1, casetaMaxima: 10_000,
  /** Lățimea și înălțimea literelor (ADR 0138 §2), în procente. */
  procentMinim: 10, procentMaxim: 1_000,
} as const;

/** Unitățile mărimii în afară de mm (ADR 0138 §1): pt e mărimea fontului (em-ul), in e majuscula, ca mm. */
export const UNITATI_TEXT = ['pt', 'in'] as const;

const numar = (min: number, max: number) => v.pipe(v.number(), v.finite(), v.minValue(min), v.maxValue(max));

/** Îngroșarea cea mai mare pentru înălțimea `inaltime` (cu loc pentru rotunjirea unei scalări care păstrează raportul). */
export const aldinMaxim = (inaltime: number): number => inaltime * LIMITE_TEXT.aldinRaport + 1e-9;

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

/**
 * Caseta textului (ADR 0142): limitat de ea (cu înălțimea cerută, micșorată doar cât să încapă) sau scalat la ea (cea mai
 * mare care încape); lățimea și înălțimea ei, în mm.
 */
const marimeCaseta = numar(LIMITE_TEXT.casetaMinima, LIMITE_TEXT.casetaMaxima);
export const SchemaCasetaText = v.variant('fel', [
  v.object({ fel: v.literal('limita'), latime: marimeCaseta, inaltime: marimeCaseta, ceruta: numar(LIMITE_TEXT.inaltimeMinima, LIMITE_TEXT.inaltimeMaxima) }),
  v.object({ fel: v.literal('scala'), latime: marimeCaseta, inaltime: marimeCaseta }),
]);

/** Proporțiile literelor (ADR 0138 §2): lățimea și înălțimea, în procente, față de literele fontului la mărimea cerută. */
const procent = numar(LIMITE_TEXT.procentMinim, LIMITE_TEXT.procentMaxim);
export const SchemaProportiiText = v.object({ latime: procent, inaltime: procent });

/**
 * Un spațiu al literelor alese (ADR 0138 §5): după caracterul cu indicele `dupa` (pe puncte de cod, în textul fără `\r`),
 * încă `mm` (negativ: mai strâns), ca spațierea textului.
 */
const SchemaSpatiuLitera = v.object({
  dupa: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(LIMITE_TEXT.caractere - 1)),
  mm: numar(-LIMITE_TEXT.spatiere, LIMITE_TEXT.spatiere),
});

/** Majuscula tăiată a unui bloc (ADR 0138 §2), în mm: înălțimea cerută × înălțimea literelor. */
export const majusculaBloc = (b: { readonly inaltime: number; readonly proportii?: { readonly inaltime: number } | undefined }): number =>
  (b.proportii ? b.inaltime * (b.proportii.inaltime / 100) : b.inaltime);

export const SchemaBlocText = v.pipe(
  v.object({
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
    /** Aldinul sintetic (ADR 0123): îngroșarea pe fiecare parte, în mm; lipsă sau 0: litere normale. */
    aldin: v.optional(v.union([v.literal(0), numar(LIMITE_TEXT.aldinMinim, LIMITE_TEXT.inaltimeMaxima * LIMITE_TEXT.aldinRaport)])),
    /** Cursivul sintetic (ADR 0123): înclinarea literelor, în grade (negativă: spre stânga); lipsă sau 0: drepte. */
    cursiv: v.optional(numar(-LIMITE_TEXT.cursiv, LIMITE_TEXT.cursiv)),
    /** Textul vertical (ADR 0141): literele una sub alta, rândurile în coloane; lipsă: textul e orizontal. */
    vertical: v.optional(v.literal(true)),
    /** Încadrarea în casetă (ADR 0142); `inaltime` e atunci cea care a încăput. Lipsă: înălțimea cerută. */
    caseta: v.optional(SchemaCasetaText),
    /** Unitatea în care omul a scris mărimea (ADR 0138 §1), doar pentru panou: `inaltime` rămâne majuscula în mm. Lipsă: mm. */
    unitate: v.optional(v.picklist(UNITATI_TEXT)),
    /** Proporțiile literelor (ADR 0138 §2), în procente; lipsă: 100 și 100. */
    proportii: v.optional(SchemaProportiiText),
    /** Crenarea fontului (ADR 0138 §3): `false` o oprește; lipsă: pornită. */
    crenare: v.optional(v.literal(false)),
    /** Spațierile literelor alese (ADR 0138 §5), sortate după `dupa`; lipsă: niciuna. */
    spatieri: v.optional(v.pipe(v.array(SchemaSpatiuLitera), v.maxLength(LIMITE_TEXT.caractere), v.readonly())),
    amprenta: v.pipe(v.string(), v.maxLength(64)),
  }),
  // Spațierile literelor alese: sortate, unice, nenule, după un caracter care mai are unul după el (ADR 0138 §5).
  v.check((b) => !b.spatieri || b.spatieri.every((s, k, t) => s.mm !== 0 && (k === 0 || t[k - 1]!.dupa < s.dupa)
    && s.dupa + 1 < Array.from(b.continut.replace(/\r/g, '')).length), 'spațierile literelor alese: sortate, unice, nenule, în text'),
  // Aldinul e cel mult o cincime din majuscula tăiată (ADR 0123, ADR 0138 §2).
  v.check((b) => b.aldin === undefined || b.aldin <= aldinMaxim(majusculaBloc(b)), 'aldinul trece de o cincime din înălțime'),
  // Un text vertical stă drept: literele una sub alta nu urmează o curbă (ADR 0141).
  v.check((b) => !(b.vertical && b.curba), 'textul vertical nu stă pe o curbă'),
  // Un text în casetă stă drept: caseta e a unui text care nu urmează o curbă (ADR 0142).
  v.check((b) => !(b.caseta && b.curba), 'textul în casetă nu stă pe o curbă'),
);

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
 * Rădăcina scalată (`dupa`) a unei rădăcini cu bloc (`inainte`), cu scara (lx, ly) în axele contururilor blocului: la o
 * scalare uniformă, blocul crește cu ea (înălțimea, spațierea) și primește amprenta noilor contururi; la una neuniformă, un
 * text drept fără aldin rămâne text (ADR 0138 §4, `scalatNeuniform`), altfel piesa devine vectori, fără bloc. O rădăcină fără
 * bloc valid trece neschimbată.
 */
export function blocScalat(inainte: Nod, dupa: Nod, lx: number, ly: number, uniforma: boolean): Nod {
  const b = blocText(inainte);
  if (!b || dupa.tip !== 'grup') return dupa;
  const { text: _vechi, ...fara } = dupa as Nod & { text?: unknown };
  if (!(lx > 0) || !(ly > 0)) return fara;
  if (!uniforma) return scalatNeuniform(b, dupa, fara, lx, ly);
  const s = lx;
  const inaltime = b.inaltime * s;
  if (inaltime < LIMITE_TEXT.inaltimeMinima || inaltime > LIMITE_TEXT.inaltimeMaxima || Math.abs(b.spatiere * s) > LIMITE_TEXT.spatiere) return fara;
  // Spațierile literelor alese cresc cu textul, ca spațierea (ADR 0138 §5).
  const spatieri = b.spatieri?.map((x) => ({ dupa: x.dupa, mm: x.mm * s }));
  if (spatieri?.some((x) => Math.abs(x.mm) > LIMITE_TEXT.spatiere)) return fara;
  // Aldinul crește cu textul (cursivul e un unghi: rămâne); sub rezoluție, contururile rămân doar vectori.
  const aldin = b.aldin === undefined ? undefined : b.aldin * s;
  if (aldin !== undefined && aldin > 0 && (aldin < LIMITE_TEXT.aldinMinim || aldin > aldinMaxim(majusculaBloc({ inaltime, proportii: b.proportii })))) return fara;
  // Curba unui text pe curbă crește cu el (coordonatele piesei se înmulțesc, ancora rămâne în origine, pe curbă).
  const p = (q: { readonly x: number; readonly y: number }) => ({ x: q.x * s, y: q.y * s });
  const curba = b.curba && {
    ...b.curba,
    varfuri: b.curba.varfuri.map((x) => ({ p: p(x.p), s: x.s.tip === 'C' ? { tip: 'C' as const, c1: p(x.s.c1), c2: p(x.s.c2) } : x.s })),
    s: b.curba.s * s,
    distanta: b.curba.distanta * s,
  };
  if (curba && Math.abs(curba.distanta) > LIMITE_TEXT.distantaCurba) return fara;
  // Caseta crește cu textul (ADR 0142): același text încape la fel în caseta scalată.
  const caseta = b.caseta && (b.caseta.fel === 'limita'
    ? { ...b.caseta, latime: b.caseta.latime * s, inaltime: b.caseta.inaltime * s, ceruta: b.caseta.ceruta * s }
    : { ...b.caseta, latime: b.caseta.latime * s, inaltime: b.caseta.inaltime * s });
  if (caseta && !v.safeParse(SchemaCasetaText, caseta).success) return fara;
  return {
    ...dupa,
    text: {
      ...b, inaltime, spatiere: b.spatiere * s, ...(aldin !== undefined ? { aldin } : {}), ...(curba ? { curba } : {}), ...(caseta ? { caseta } : {}),
      ...(spatieri ? { spatieri } : {}),
      amprenta: amprentaContururi(dupa.copii),
    },
  };
}

/** Un text care rămâne text la o scalare neuniformă (ADR 0138 §4): drept (nu pe o curbă) și fără aldin. */
export const textNeuniformPosibil = (b: BlocText): boolean => !b.curba && !((b.aldin ?? 0) > 0);

/**
 * Scalarea neuniformă (lx, ly) a unui text (ADR 0138 §4). Un text drept (nu pe o curbă), fără aldin, scalat așa e exact un
 * text cu alt bloc: mărimea × ly, lățimea literelor × lx / ly (înălțimea lor rămâne), spațierea × lx (la textul vertical,
 * unde golurile sunt pe verticală, × ly), cursivul cu unghiul atan(tan θ · lx / ly) (o înclinare x + p·y scalată devine
 * p · lx / ly), caseta × (lx, ly); amprenta e a contururilor scalate, ca la scalarea uniformă. Cu aldin (îngroșarea scalată
 * nu mai e aceeași pe toate laturile), pe o curbă (literele de pe o curbă scalată nu sunt literele scalate) sau dacă blocul
 * nou iese din margini (procentele, cursivul peste 45°), piesa devine vectori, ca înainte.
 */
function scalatNeuniform(b: BlocText, dupa: Nod & { readonly tip: 'grup' }, fara: Nod, lx: number, ly: number): Nod {
  if (!textNeuniformPosibil(b)) return fara;
  const r = lx / ly;
  const pr = b.proportii ?? { latime: 100, inaltime: 100 };
  const latime = pr.latime * r;
  const proportii = latime === 100 && pr.inaltime === 100 ? undefined : { latime, inaltime: pr.inaltime };
  const cursiv = b.cursiv ? (Math.atan(Math.tan(b.cursiv * (Math.PI / 180)) * r) * 180) / Math.PI : undefined;
  const caseta = b.caseta && (b.caseta.fel === 'limita'
    ? { ...b.caseta, latime: b.caseta.latime * lx, inaltime: b.caseta.inaltime * ly, ceruta: b.caseta.ceruta * ly }
    : { ...b.caseta, latime: b.caseta.latime * lx, inaltime: b.caseta.inaltime * ly });
  const { proportii: _p, cursiv: _c, ...rest } = b;
  const text = {
    ...rest, inaltime: b.inaltime * ly, spatiere: b.spatiere * (b.vertical ? ly : lx),
    // Spațierile literelor alese, ca spațierea: pe orizontală, sau pe verticală la textul vertical (ADR 0138 §5).
    ...(b.spatieri ? { spatieri: b.spatieri.map((x) => ({ dupa: x.dupa, mm: x.mm * (b.vertical ? ly : lx) })) } : {}),
    ...(proportii ? { proportii } : {}), ...(cursiv !== undefined ? { cursiv } : {}), ...(caseta ? { caseta } : {}),
    amprenta: amprentaContururi(dupa.copii),
  };
  return v.safeParse(SchemaBlocText, text).success ? { ...dupa, text } : fara;
}
