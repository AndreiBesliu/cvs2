/**
 * Așezarea textului (ADR 0105 §2): caracterele, pe rânduri, în glifele fontului, puse una după alta, în mm, cu Y în sus.
 *
 * - **Mărimea** (ADR 0019): `inaltime` e înălțimea majusculei, deci o unitate a fontului face `inaltime / majuscula` mm.
 *   Coordonatele se înmulțesc întâi și se împart la urmă, ca „20 mm” să iasă 20 mm exact pe litera H sau N.
 * - **Locul:** linia de bază a primului rând trece prin y = 0; un rând începe în x = 0 (aliniat la stânga), are mijlocul în
 *   x = 0 (centrat) sau se termină în x = 0 (la dreapta). Rândurile coboară cu `interlinie` × înălțimea rândului fontului
 *   (urcarea − coborârea + spațiul dintre rânduri, din `hhea`).
 * - **Între litere:** avansul glifei, crenarea perechii (`GPOS`, ADR 0105 §1) și `spatiere` mm, numai între două litere ale
 *   aceluiași rând.
 * - **Contururile:** cuadraticele TrueType devin cubice exact (ADR 0001: c1 = p0 + 2/3 (q − p0), c2 = p2 + 2/3 (q − p2)),
 *   punctele de pe curbă subînțelese (între două puncte de control) se pun la mijloc; cubicele CFF trec cum sunt (ADR 0106);
 *   regulile căii sunt cele ale ușilor importului (`incheieSubcalea`), iar fiecare glifă se normalizează din `nonzero`
 *   (ADR 0036, T3), o dată, aici.
 *
 * Un caracter pe care fontul nu-l are nu se desenează (o cutie `.notdef` s-ar tăia): se numără în `lipsa`.
 *
 * **Cursivul și aldinul sintetic** (ADR 0123):
 * - **cursivul** înclină fiecare literă față de linia de bază a rândului ei, x' = x + tan(unghi) · y: o transformare afină,
 *   deci liniile și cubicele rămân exacte; avansurile, crenarea și alinierea nu se schimbă;
 * - **aldinul** `d` (mm pe fiecare parte) așază literele la înălțimea miezului, h − 2d (contururile, avansurile, crenarea),
 *   fiecare avans crește cu 2d, apoi fiecare literă (înclinată, normalizată) se îngroașă: cubicele devin biarce sub toleranța
 *   proiectului (ADR 0033), figura crește cu d prin fațada offsetului (`offsetFigura`) și se mută cu (d, d). Așa, H are tot
 *   h (de la 0 la h), marginile din stânga și din dreapta ale literei stau unde stăteau în miez, colțurile de afară se
 *   rotunjesc cu raza d, iar rândurile rămân la distanța lui h. Contururile unei litere îngroșate sunt linii și arce;
 * - întâi înclinarea, apoi îngroșarea: trăsăturile se îngroașă la fel în toate direcțiile.
 *
 * **Proporțiile și crenarea** (ADR 0138):
 * - **lățimea și înălțimea literelor**, în procente, scalează litera din font înaintea oricărui alt pas: majuscula tăiată e
 *   h × înălțimea, miezul aldinului e majuscula tăiată − 2d, iar pe orizontală totul (contururile, avansurile, crenarea)
 *   are în plus raportul lățime / înălțime. Rândurile stau după majuscula tăiată, coloanele textului vertical după lățime;
 *   spațierea și aldinul rămân în mm, iar cursivul înclină litera deja scalată;
 * - **crenarea** fontului se poate opri: literele stau atunci la avansurile lor, cu spațierea între ele.
 */
import { conturFaraCubice } from '../geom/biarce.ts';
import { LINIE, type Contur, type Punct, type Varf } from '../geom/contur.ts';
import { cutieContur, uneste, type Cutie } from '../geom/cutie.ts';
import type { BugetImport } from '../geom/nonzero.ts';
import { offsetFigura } from '../geom/offset.ts';
import { TOLERANTA_PROIECT } from '../geom/toleranta.ts';
import { incheieSubcalea, normalizeazaForma, type CaleCitita, type NumaratoareNormalizare } from '../io/caleImport.ts';
import { PLAFON_IMPORT } from '../io/svgCoduri.ts';
import { LIMITE_TEXT } from '../model/blocText.ts';
import type { ConturFont, Font } from './font.ts';
import { traseu } from './linie.ts';

export type AliniereText = 'stanga' | 'centru' | 'dreapta';

/** Ce cere omul (ADR 0105 §3): textul (rândurile despărțite de `\n`), înălțimea majusculei, spațierea, rândurile, alinierea. */
export type ParametriText = {
  readonly continut: string;
  /** Înălțimea majusculei, în mm. */
  readonly inaltime: number;
  /** Spațiul adăugat între două litere, în mm (negativ: mai strâns). */
  readonly spatiere: number;
  /** Distanța dintre rânduri, ca multiplu al înălțimii rândului fontului. */
  readonly interlinie: number;
  readonly aliniere: AliniereText;
  /** Aldinul sintetic (ADR 0123): cât se îngroașă literele pe fiecare parte, în mm; lipsă sau 0: litere normale. */
  readonly aldin?: number | undefined;
  /** Cursivul sintetic (ADR 0123): înclinarea literelor, în grade, spre dreapta (negativ: spre stânga); lipsă sau 0: drepte. */
  readonly cursiv?: number | undefined;
  /** Textul vertical (ADR 0141): literele una sub alta, rândurile în coloane; lipsă: textul e orizontal. */
  readonly vertical?: true | undefined;
  /** Încadrarea în casetă (ADR 0142); lipsă: textul are înălțimea cerută. */
  readonly caseta?: CasetaText | undefined;
  /**
   * Proporțiile literelor (ADR 0138 §2), în procente: lățimea și înălțimea față de literele fontului la mărimea cerută
   * (majuscula tăiată e `inaltime` × înălțimea); lipsă: 100 și 100.
   */
  readonly proportii?: ProportiiText | undefined;
  /** Crenarea fontului (ADR 0138 §3): `false` o oprește (literele stau la avansurile lor); lipsă: pornită. */
  readonly crenare?: false | undefined;
  /** Spațierile literelor alese (ADR 0138 §5): după caracterul `dupa`, încă `mm`; lipsă: niciuna. */
  readonly spatieri?: readonly SpatiuLitera[] | undefined;
};

/**
 * Un spațiu al literelor alese (ADR 0138 §5): după caracterul cu indicele `dupa` (pe puncte de cod, în textul fără `\r`, cu
 * `\n` numărat), încă `mm` (negativ: mai strâns), doar între el și caracterul de după, dacă amândouă sunt litere ale aceluiași
 * rând (sau ale aceleiași coloane).
 */
export type SpatiuLitera = { readonly dupa: number; readonly mm: number };

/** Lățimea și înălțimea literelor (ADR 0138 §2), în procente. */
export type ProportiiText = { readonly latime: number; readonly inaltime: number };

/**
 * Caseta textului (ADR 0142), în mm: cutia literelor tăiate (cerneala, nu avansurile) încape în lățime × înălțime. Limitat
 * de casetă: înălțimea cerută (`ceruta`), micșorată doar cât să încapă; scalat la casetă: cea mai mare care încape.
 */
export type CasetaText =
  | { readonly fel: 'limita'; readonly latime: number; readonly inaltime: number; readonly ceruta: number }
  | { readonly fel: 'scala'; readonly latime: number; readonly inaltime: number };

/**
 * O glifă așezată: caracterul, rândul (de la 0) și contururile ei, în mm, normalizate; plus locul ei pe rând (ADR 0108, textul
 * pe curbă): originea `x` (după aliniere), avansul și indicele printre caracterele așezate ale rândului (și spațiile).
 */
export type GlifaAsezata = {
  readonly caracter: string; readonly rand: number; readonly cai: readonly CaleCitita[];
  readonly x: number; readonly avans: number; readonly indice: number;
  /** Cutia exactă a literei tăiate (ADR 0142): a celei îngroșate e a miezului cu 2d în plus în sus și la dreapta (ADR 0123). */
  readonly cutie: Cutie;
};

export type RaportText = NumaratoareNormalizare & {
  /** Caracterele pe care fontul nu le are (nedesenate). */
  lipsa: number;
  /** Glifele pe care fontul nu le poate da (date stricate, o glifă compusă care se conține pe sine): sărite. */
  'glife-stricate': number;
  'prea-mari': number;
  /** Literele pe care aldinul nu le-a putut îngroșa (offsetul refuzat): sărite, deci textul nu e bun de tăiat (ADR 0123). */
  'aldin-esuat': number;
  /** Textul nu încape în casetă nici la cea mai mică înălțime (ADR 0142): așezat la înălțimea cerută, nu e bun de tăiat. */
  'caseta-prea-mica': number;
};

/**
 * Un rând așezat: lățimea lui (de la începutul primului caracter la capătul ultimului), câte caractere are, mutarea alinierii.
 * Pe verticală (ADR 0141), o coloană: lungimea ei (de la vârful primei litere la baza ultimei) și mutarea alinierii pe y.
 */
export type RandAsezat = { readonly latime: number; readonly caractere: number; readonly dx: number };

export type TextAsezat = {
  readonly glife: readonly GlifaAsezata[]; readonly raport: RaportText; readonly caractereLipsa: readonly string[];
  readonly linii: readonly RandAsezat[];
  /** În mm: înălțimea rândului (cu distanța dintre rânduri) și coborârea fontului (negativă). */
  readonly metrici: { readonly rand: number; readonly coborare: number };
  /** Un font cu o singură linie (ADR 0140): căile sunt trăsături de gravat (deschise sau bucle), nu figuri. */
  readonly linie: boolean;
  /** Înălțimea majusculei folosită, în mm: cea cerută sau, cu o casetă (ADR 0142), cea care încape. */
  readonly inaltime: number;
  /** Majuscula tăiată, în mm (ADR 0138 §2): `inaltime` × înălțimea literelor; fără proporții, chiar `inaltime`. */
  readonly majuscula: number;
};

type P = { readonly x: number; readonly y: number };

/**
 * Vârfurile unui contur TrueType în mm (`harta` duce unitățile fontului în mm): pornește dintr-un punct de pe curbă (sau,
 * dacă n-are niciunul, din mijlocul dintre ultimul și primul punct de control), pune mijloacele subînțelese și ridică fiecare
 * pătratică la cubică. Segmentele de lungime zero se sar.
 */
function varfuriDinContur(c: ConturFont, harta: (q: P) => Punct): { varfuri: Varf[]; start: Punct } | null {
  const n = c.length;
  if (n < 2) return null;
  // Punctele de pe curbă subînțelese: mijlocul dintre două puncte de control consecutive.
  const extinse: { x: number; y: number; peCurba: boolean }[] = [];
  for (let k = 0; k < n; k++) {
    const a = c[k]!, b = c[(k + 1) % n]!;
    extinse.push(a);
    if (!a.peCurba && !b.peCurba) extinse.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, peCurba: true });
  }
  const s = extinse.findIndex((q) => q.peCurba);
  if (s < 0) return null;
  const m = extinse.length;
  const pct = (k: number) => extinse[(s + k) % m]!;
  const start = pct(0);
  const varfuri: Varf[] = [];
  let cur = start;
  for (let k = 1; k <= m;) {
    const q = pct(k);
    if (q.peCurba) {
      if (q.x !== cur.x || q.y !== cur.y) varfuri.push({ p: harta(cur), s: LINIE });
      cur = q;
      k += 1;
    } else {
      const capat = pct(k + 1);
      // Pătratica (cur, q, capat) ridicată exact la cubică.
      const c1 = { x: cur.x + (2 * (q.x - cur.x)) / 3, y: cur.y + (2 * (q.y - cur.y)) / 3 };
      const c2 = { x: capat.x + (2 * (q.x - capat.x)) / 3, y: capat.y + (2 * (q.y - capat.y)) / 3 };
      if (!(cur.x === capat.x && cur.y === capat.y && q.x === cur.x && q.y === cur.y)) {
        varfuri.push({ p: harta(cur), s: { tip: 'C', c1: harta(c1), c2: harta(c2) } });
      }
      cur = capat;
      k += 2;
    }
  }
  return { varfuri, start: harta(start) };
}

/**
 * Vârfurile unui contur CFF în mm: pornește din punctul mutării (pe curbă), punctele de control vin câte două, urmate de
 * capătul cubicei; închiderea e o linie spre start, dacă nu e deja acolo. Segmentele de lungime zero se sar.
 */
function varfuriDinCubice(c: ConturFont, harta: (q: P) => Punct): { varfuri: Varf[]; start: Punct } | null {
  const n = c.length;
  const start = c[0];
  if (n < 2 || !start?.peCurba) return null;
  const varfuri: Varf[] = [];
  let cur: P = start;
  for (let k = 1; k < n;) {
    const q = c[k]!;
    if (q.peCurba) {
      if (q.x !== cur.x || q.y !== cur.y) varfuri.push({ p: harta(cur), s: LINIE });
      cur = q;
      k += 1;
      continue;
    }
    const c2 = c[k + 1], capat = c[k + 2];
    if (!c2 || c2.peCurba || !capat?.peCurba) return null;
    if (!(q.x === cur.x && q.y === cur.y && c2.x === cur.x && c2.y === cur.y && capat.x === cur.x && capat.y === cur.y)) {
      varfuri.push({ p: harta(cur), s: { tip: 'C', c1: harta(q), c2: harta(c2) } });
    }
    cur = capat;
    k += 3;
  }
  if (cur.x !== start.x || cur.y !== start.y) varfuri.push({ p: harta(cur), s: LINIE });
  return { varfuri, start: harta(start) };
}

/**
 * Vârfurile unei trăsături deschise a unui font cu o singură linie (ADR 0140), în mm: din primul punct (pe curbă) până în
 * ultimul (pe curbă), fără segmentul de închidere; TrueType cu punctele de pe curbă subînțelese și pătraticele ridicate la
 * cubice, CFF cu cubicele cum sunt. Fiecare vârf poartă segmentul spre următorul; capătul vine separat. Segmentele de lungime
 * zero se sar.
 */
function varfuriDeschise(c: ConturFont, harta: (q: P) => Punct, cubice: boolean): { varfuri: Varf[]; start: Punct; capat: Punct } | null {
  const n = c.length;
  const start = c[0];
  if (n < 2 || !start?.peCurba || !c[n - 1]!.peCurba) return null;
  const varfuri: Varf[] = [];
  let cur: P = start;
  if (cubice) {
    for (let k = 1; k < n;) {
      const q = c[k]!;
      if (q.peCurba) {
        if (q.x !== cur.x || q.y !== cur.y) varfuri.push({ p: harta(cur), s: LINIE });
        cur = q;
        k += 1;
        continue;
      }
      const c2 = c[k + 1], capat = c[k + 2];
      if (!c2 || c2.peCurba || !capat?.peCurba) return null;
      if (!(q.x === cur.x && q.y === cur.y && c2.x === cur.x && c2.y === cur.y && capat.x === cur.x && capat.y === cur.y)) {
        varfuri.push({ p: harta(cur), s: { tip: 'C', c1: harta(q), c2: harta(c2) } });
      }
      cur = capat;
      k += 3;
    }
    return { varfuri, start: harta(start), capat: harta(cur) };
  }
  // Punctele de pe curbă subînțelese, între două puncte de control consecutive (fără a trece de capăt).
  const extinse: { x: number; y: number; peCurba: boolean }[] = [];
  for (let k = 0; k < n; k++) {
    const a = c[k]!, b = c[k + 1];
    extinse.push(a);
    if (b && !a.peCurba && !b.peCurba) extinse.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, peCurba: true });
  }
  for (let k = 1; k < extinse.length;) {
    const q = extinse[k]!;
    if (q.peCurba) {
      if (q.x !== cur.x || q.y !== cur.y) varfuri.push({ p: harta(cur), s: LINIE });
      cur = q;
      k += 1;
      continue;
    }
    const capat = extinse[k + 1]!;
    const c1 = { x: cur.x + (2 * (q.x - cur.x)) / 3, y: cur.y + (2 * (q.y - cur.y)) / 3 };
    const c2 = { x: capat.x + (2 * (q.x - capat.x)) / 3, y: capat.y + (2 * (q.y - capat.y)) / 3 };
    if (!(cur.x === capat.x && cur.y === capat.y && q.x === cur.x && q.y === cur.y)) {
      varfuri.push({ p: harta(cur), s: { tip: 'C', c1: harta(c1), c2: harta(c2) } });
    }
    cur = capat;
    k += 2;
  }
  return { varfuri, start: harta(start), capat: harta(cur) };
}

/** Câte litere îngroșate se țin (cea folosită cel mai demult pleacă prima). */
const INGROSATE = 512;
/**
 * Literele îngroșate deja, după îngroșare și contururile miezului în sistemul literei (cheia e chiar textul lor, deci exactă):
 * offsetul e partea scumpă (câteva ms pe literă), iar panoul așază textul din nou la fiecare tastă. Ce se ține e exact ce
 * ar ieși din calculul din nou (o funcție a cheii), deci așezarea rămâne pură.
 */
const ingrosate = new Map<string, readonly Contur[] | null>();

/**
 * Litera îngroșată (ADR 0123), în sistemul ei: contururile miezului (normalizate, linii și cubice), cu cubicele aproximate
 * prin biarce sub toleranța proiectului, crescute cu `d` prin fațada offsetului. Null: offsetul a refuzat litera.
 */
function ingroasa(cai: readonly CaleCitita[], d: number): readonly Contur[] | null {
  const cheie = `${d}|${JSON.stringify(cai)}`;
  const gata = ingrosate.get(cheie);
  if (gata !== undefined) {
    ingrosate.delete(cheie);
    ingrosate.set(cheie, gata);
    return gata;
  }
  let rez: readonly Contur[] | null = null;
  const contururi: Contur[] = [];
  for (const c of cai) {
    const r = conturFaraCubice({ inchis: true, varfuri: c.varfuri }, TOLERANTA_PROIECT);
    if (r.ok) contururi.push(r.contur);
  }
  if (contururi.length === cai.length) {
    const r = offsetFigura(contururi, d);
    if (r.ok) rez = r.regiuni.flatMap((g) => [g.exterior, ...g.gauri]);
  }
  ingrosate.set(cheie, rez);
  while (ingrosate.size > INGROSATE) ingrosate.delete(ingrosate.keys().next().value!);
  return rez;
}

/**
 * Contururile unei litere (ADR 0105 §2, ADR 0140), în mm, prin `harta`: trăsăturile unui font cu o singură linie (cele
 * deschise, cu regulile ușilor importului pentru capete) sau figurile închise ale unuia obișnuit, normalizate o dată. Null:
 * fontul nu poate da glifa (numărată); o listă goală: glifa n-are ce tăia (spațiul).
 */
function contururiLitera(font: Font, glifa: number, harta: (q: P) => Punct, raport: RaportText, buget: BugetImport): readonly CaleCitita[] | null {
  const contururi = font.contururi(glifa);
  if (contururi === null) {
    raport['glife-stricate']++;
    return null;
  }
  const cai: CaleCitita[] = [];
  for (const c of contururi) {
    // Un font cu o singură linie dă trăsături (ADR 0140): cele deschise, cu regulile ușilor importului pentru capete (un
    // capăt la cel mult 0,01 mm de start închide trăsătura, ADR 0037 §11); buclele, ca orice contur.
    const t = font.linie ? traseu(c) : { puncte: c, inchis: true };
    if (!t.inchis) {
      const v = varfuriDeschise(t.puncte, harta, font.cubice);
      if (!v || v.varfuri.length === 0) {
        raport.degenerate++;
        continue;
      }
      const r = incheieSubcalea(v.varfuri, v.capat, v.start, false, false);
      if (r === 'prea-mare') raport['prea-mari']++;
      else if (r === 'degenerata') raport.degenerate++;
      else if (r === 'praf') raport['sub-rezolutie']++;
      else cai.push(r.cale);
      continue;
    }
    const v = font.cubice ? varfuriDinCubice(t.puncte, harta) : varfuriDinContur(t.puncte, harta);
    if (!v || v.varfuri.length === 0) {
      raport.degenerate++;
      continue;
    }
    const inchisa = incheieSubcalea(v.varfuri, v.start, v.start, true, true);
    if (inchisa === 'prea-mare') raport['prea-mari']++;
    else if (inchisa === 'degenerata') raport.degenerate++;
    else if (inchisa === 'praf') raport['sub-rezolutie']++;
    // Un contur care, închis, n-are arie (pe o dreaptă) iese deschis: o literă n-are linii de tăiat; o trăsătură, da.
    else if (!inchisa.cale.inchis && !font.linie) raport.degenerate++;
    else cai.push(inchisa.cale);
  }
  if (cai.length === 0) return cai;
  // Trăsăturile nu se normalizează: n-au interior (ADR 0140).
  return font.linie ? cai : normalizeazaForma(cai, true, buget, raport);
}

/** Calea mutată cu (tx, ty), cu punctele de control ale cubicelor (un arc se dă prin bulge: nu se schimbă). */
const mutata = (tx: number, ty: number) => (c: CaleCitita): CaleCitita => ({
  inchis: c.inchis,
  varfuri: c.varfuri.map((v): Varf => ({
    p: { x: v.p.x + tx, y: v.p.y + ty },
    s: v.s.tip === 'C' ? { tip: 'C', c1: { x: v.s.c1.x + tx, y: v.s.c1.y + ty }, c2: { x: v.s.c2.x + tx, y: v.s.c2.y + ty } } : v.s,
  })),
});

/**
 * Așază textul (ADR 0105 §2, ADR 0123, ADR 0141, ADR 0142): pură, determinată de font și de parametri. Cu o casetă, întâi
 * înălțimea care încape (`inaltimeInCaseta`); dacă nu încape nici la cea mai mică, la înălțimea cerută, cu raportul.
 */
export function aseazaText(font: Font, p: ParametriText): TextAsezat {
  if (!p.caseta) return aseaza(font, p, false);
  const h = inaltimeInCaseta(font, p, p.caseta);
  if (h !== null) return aseaza(font, { ...p, inaltime: h }, false);
  const r = aseaza(font, p, false);
  return { ...r, raport: { ...r.raport, 'caseta-prea-mica': 1 } };
}

/**
 * Înălțimea majusculei cu care textul încape în casetă (ADR 0142), sau null: nici la cea mai mică (0,1 mm, și cel puțin de
 * cinci ori aldinul) nu încape. Marginile cutiei fiecărei litere sunt afine în înălțime (contururile, avansurile, crenarea,
 * rândurile și golurile verticale cresc cu ea; spațierea și aldinul, în mm, rămân), deci două așezări de măsurare (la două
 * înălțimi fixe, fără offsetul aldinului) le dau la orice înălțime; cea mai mare care încape se caută prin înjumătățire pe ele.
 * Limitat de casetă: cel mult înălțimea cerută.
 */
function inaltimeInCaseta(font: Font, p: ParametriText, caseta: CasetaText): number | null {
  const d = font.linie ? 0 : p.aldin ?? 0;
  // Cu înălțimea literelor sub 100 % (ADR 0138 §2), înălțimile de măsurare cresc, ca miezul (h · înălțimea − 2d) să rămână.
  const sy = (p.proportii?.inaltime ?? 100) / 100;
  const h1 = (10 + 10 * d) / Math.min(1, sy), h2 = 2 * h1;
  const a = aseaza(font, { ...p, inaltime: h1 }, true).glife, b = aseaza(font, { ...p, inaltime: h2 }, true).glife;
  if (a.length !== b.length) return null;
  const sus0 = caseta.fel === 'limita' ? Math.min(caseta.ceruta, LIMITE_TEXT.inaltimeMaxima) : LIMITE_TEXT.inaltimeMaxima;
  // Fără nimic de tăiat (doar spații), caseta n-are ce încadra.
  if (a.length === 0) return caseta.fel === 'limita' ? caseta.ceruta : p.inaltime;
  const incape = (h: number): boolean => {
    const u = (h - h1) / (h2 - h1);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    a.forEach((g, k) => {
      const c = g.cutie, e = b[k]!.cutie;
      x0 = Math.min(x0, c.minX + (e.minX - c.minX) * u);
      y0 = Math.min(y0, c.minY + (e.minY - c.minY) * u);
      x1 = Math.max(x1, c.maxX + (e.maxX - c.maxX) * u);
      y1 = Math.max(y1, c.maxY + (e.maxY - c.maxY) * u);
    });
    return x1 - x0 <= caseta.latime && y1 - y0 <= caseta.inaltime;
  };
  // Aldinul e cel mult o cincime din majuscula tăiată (h · înălțimea literelor).
  let jos = Math.max(LIMITE_TEXT.inaltimeMinima, d / LIMITE_TEXT.aldinRaport / sy), sus = sus0;
  if (sus < jos || !incape(jos)) return null;
  if (incape(sus)) return sus;
  for (let k = 0; k < 100; k++) {
    const m = (jos + sus) / 2;
    if (incape(m)) jos = m;
    else sus = m;
  }
  return jos;
}

/**
 * Așezarea la înălțimea `p.inaltime` (fără casetă). `masurare`: fără offsetul aldinului (literele aldine rămân miezul, în
 * sistemul lor), doar pentru cutii.
 */
function aseaza(font: Font, p: ParametriText, masurare: boolean): TextAsezat {
  const raport: RaportText = {
    lipsa: 0, 'glife-stricate': 0, 'prea-mari': 0, 'aldin-esuat': 0, 'caseta-prea-mica': 0, 'nonzero-normalizate': 0, 'nonzero-refuzate': 0,
    'sub-rezolutie': 0, degenerate: 0,
  };
  const caractereLipsa: string[] = [];
  // Un font cu o singură linie n-are figură de îngroșat (ADR 0140): aldinul nu i se aplică.
  const d = font.linie ? 0 : p.aldin ?? 0;
  const panta = Math.tan((p.cursiv ?? 0) * (Math.PI / 180));
  // Proporțiile literelor (ADR 0138 §2): majuscula tăiată e înălțimea cerută × înălțimea literelor; literele se desenează la
  // înălțimea miezului ei (fără aldin, chiar ea), iar pe orizontală cu lățimea față de înălțime. Cu 100 % și 100 %, fiecare
  // factor e 1, deci aceleași numere ca înainte, bit cu bit.
  const sx = (p.proportii?.latime ?? 100) / 100, sy = (p.proportii?.inaltime ?? 100) / 100;
  const majuscula = p.inaltime * sy;
  const miez = majuscula - 2 * d;
  const miezX = sx === sy ? miez : miez * (sx / sy);
  const inMm = (u: number): number => (u * miez) / font.majuscula;
  const inMmX = (u: number): number => (u * miezX) / font.majuscula;
  // Rândurile stau după majuscula tăiată; coloanele textului vertical, după lățimea literelor (sunt o distanță pe orizontală).
  const linieFont = font.urcare - font.coborare + font.spatiuRanduri;
  const inaltimeRand = (linieFont * majuscula) / font.majuscula * p.interlinie;
  const distantaColoane = (linieFont * (p.inaltime * sx)) / font.majuscula * p.interlinie;
  const randuri = p.continut.replace(/\r/g, '').split('\n');
  // Spațierile literelor alese (ADR 0138 §5): indicele fiecărui caracter în text (pe puncte de cod; `\n` numărat), deci
  // începutul fiecărui rând; spațiul se adaugă doar între două caractere vecine, amândouă litere așezate.
  const spatiu = new Map((p.spatieri ?? []).map((s) => [s.dupa, s.mm]));
  const inceputuri: number[] = [];
  randuri.reduce((i, rand) => { inceputuri.push(i); return i + Array.from(rand).length + 1; }, 0);
  const intre = (a: number, b: number): number => (b === a + 1 ? spatiu.get(a) ?? 0 : 0);
  const glife: GlifaAsezata[] = [];
  const linii: RandAsezat[] = [];
  const buget: BugetImport = { ramas: PLAFON_IMPORT.normalizare };
  /** Glifa unui caracter (tabul, ca spațiul), sau null: un caracter de control (sărit) sau unul pe care fontul nu-l are (numărat). */
  const glifaDe = (caracter: string): number | null => {
    const cod = caracter.codePointAt(0) ?? 0;
    if (cod < 0x20 && caracter !== '\t') return null;
    const glifa = font.glifa(caracter === '\t' ? 0x20 : cod);
    if (glifa === 0) {
      raport.lipsa++;
      if (!caractereLipsa.includes(caracter)) caractereLipsa.push(caracter);
      return null;
    }
    return glifa;
  };
  /**
   * Harta unei litere cu originea pe linia de bază în (ox, oy): scalată întâi cu proporțiile ei (ADR 0138 §2), apoi înclinată
   * de cursiv față de linia ei de bază, deci unghiul cursivului rămâne cel scris.
   */
  const harta = (ox: number, oy: number) => (panta === 0
    ? (q: P): Punct => ({ x: ox + inMmX(q.x), y: oy + inMm(q.y) })
    : (q: P): Punct => ({ x: ox + inMmX(q.x) + panta * inMm(q.y), y: oy + inMm(q.y) }));
  /** Litera îngroșată (ADR 0123) din miezul ei desenat în sistemul literei, cu originea mutată în (x0, baza); null: refuzată. */
  const ingrosata = (miezLitera: readonly CaleCitita[], x0: number, baza: number): CaleCitita[] | null => {
    const groase = ingroasa(miezLitera, d);
    if (groase === null) {
      raport['aldin-esuat']++;
      return null;
    }
    // Litera îngroșată se mută cu (d, d) față de miez: marginea ei din stânga și baza rămân ale miezului.
    const mx = x0 + d, my = baza + d;
    return groase.map((c): CaleCitita => ({ inchis: true, varfuri: c.varfuri.map((v): Varf => ({ p: { x: v.p.x + mx, y: v.p.y + my }, s: v.s })) }));
  };
  if (p.vertical) {
    // Textul vertical (ADR 0141): fiecare rând e o coloană, de la stânga la dreapta, la distanța rândurilor; literele stau
    // una sub alta, drepte, fiecare cu cutia ei sub a celei de deasupra, la `gol`: cât lasă em-ul fontului sub o majusculă
    // (între două majuscule, chiar un em), plus spațierea. O literă fără contur (spațiul) ține locul unei majuscule.
    const em = (font.unitsPerEm * majuscula) / font.majuscula;
    const gol = Math.max(0, em - majuscula) + p.spatiere;
    randuri.forEach((rand, r) => {
      const axa = r * distantaColoane;
      const celule: { caracter: string; avans: number; cai: readonly CaleCitita[]; cutie: Cutie | null; poz: number }[] = [];
      let poz = inceputuri[r]! - 1;
      for (const caracter of rand) {
        poz++;
        const glifa = glifaDe(caracter);
        if (glifa === null) continue;
        const avans = inMmX(font.avans(glifa)) + 2 * d;
        // Litera se desenează în sistemul ei; cutia unei litere îngroșate e a miezului lărgită cu 2d în sus și la dreapta
        // (figura crește cu d pe fiecare parte și se mută cu (d, d)): exactă, fără să depindă de biarce.
        const miezLitera = contururiLitera(font, glifa, harta(0, 0), raport, buget);
        const c = miezLitera && miezLitera.length > 0 ? miezLitera.map(cutieContur).reduce(uneste) : null;
        const cai = c && miezLitera ? (d === 0 || masurare ? miezLitera : ingrosata(miezLitera, 0, 0)) : null;
        celule.push(c && cai
          ? { caracter, avans, cai, cutie: d === 0 ? c : { minX: c.minX, minY: c.minY, maxX: c.maxX + 2 * d, maxY: c.maxY + 2 * d }, poz }
          : { caracter, avans, cai: [], cutie: null, poz });
      }
      // Liniile de bază: vârful primei litere în y = 0, apoi fiecare cutie sub cea de deasupra, la golul coloanei plus spațiul
      // literelor alese dintre ele (ADR 0138 §5).
      const baze: number[] = [];
      celule.forEach((c, k) => {
        const sus = c.cutie ? c.cutie.maxY : majuscula;
        const ant = celule[k - 1];
        const extra = ant ? intre(ant.poz, c.poz) : 0;
        baze.push(ant ? baze[k - 1]! + (ant.cutie ? ant.cutie.minY : 0) - gol - sus - extra : -sus);
      });
      // Coloana se aliniază față de ancoră: sus (de la ea în jos), la mijloc sau jos (până la ea).
      const ultima = celule.at(-1);
      const jos = ultima ? baze.at(-1)! + (ultima.cutie ? ultima.cutie.minY : 0) : 0;
      const dy = p.aliniere === 'stanga' ? 0 : p.aliniere === 'centru' ? -jos / 2 : -jos;
      linii.push({ latime: -jos, caractere: celule.length, dx: dy });
      celule.forEach((c, indice) => {
        if (!c.cutie || c.cai.length === 0) return;
        // Litera, centrată pe axa coloanei după cutia ei.
        const tx = axa - (c.cutie.minX + c.cutie.maxX) / 2, ty = baze[indice]! + dy;
        const cutie = { minX: c.cutie.minX + tx, minY: c.cutie.minY + ty, maxX: c.cutie.maxX + tx, maxY: c.cutie.maxY + ty };
        glife.push({ caracter: c.caracter, rand: r, cai: c.cai.map(mutata(tx, ty)), x: tx, avans: c.avans, indice, cutie });
      });
    });
  } else {
    randuri.forEach((rand, r) => {
      // Glifele rândului și locul fiecăreia (în unitățile fontului, plus spațierea în mm), apoi lățimea rândului.
      const litere: { caracter: string; glifa: number; x: number; avans: number }[] = [];
      let x = 0;
      let anterioara = -1, pozAnterioara = -2;
      let poz = inceputuri[r]! - 1;
      for (const caracter of rand) {
        poz++;
        const glifa = glifaDe(caracter);
        if (glifa === null) continue;
        // Crenarea fontului, cu lățimea literelor; oprită (ADR 0138 §3), doar spațierea.
        if (anterioara >= 0) x += (p.crenare === false ? 0 : inMmX(font.crenare(anterioara, glifa))) + p.spatiere;
        // Spațiul literelor alese (ADR 0138 §5), doar între două litere vecine; fără el, aceleași numere ca înainte.
        if (anterioara >= 0) {
          const extra = intre(pozAnterioara, poz);
          if (extra !== 0) x += extra;
        }
        const avans = inMmX(font.avans(glifa)) + 2 * d;
        litere.push({ caracter, glifa, x, avans });
        x += avans;
        anterioara = glifa;
        pozAnterioara = poz;
      }
      const latime = x;
      const dx = p.aliniere === 'stanga' ? 0 : p.aliniere === 'centru' ? -latime / 2 : -latime;
      linii.push({ latime, caractere: litere.length, dx });
      const baza = -r * inaltimeRand;
      litere.forEach((l, indice) => {
        const x0 = l.x + dx;
        // Cu aldin, litera se desenează în sistemul ei (originea pe linia de bază), se îngroașă acolo și abia apoi se mută.
        const cai = contururiLitera(font, l.glifa, d > 0 ? harta(0, 0) : harta(x0, baza), raport, buget);
        // Spațiul și celelalte glife fără contur nu lasă nimic de tăiat.
        if (cai === null || cai.length === 0) return;
        // Cutia literei tăiate: a celei îngroșate e a miezului (desenat în sistemul literei) cu 2d în plus, mutată în (x0, baza).
        const c = cai.map(cutieContur).reduce(uneste);
        const cutie = d === 0 ? c : { minX: c.minX + x0, minY: c.minY + baza, maxX: c.maxX + 2 * d + x0, maxY: c.maxY + 2 * d + baza };
        const desenate = d === 0 || masurare ? cai : ingrosata(cai, x0, baza);
        if (desenate) glife.push({ caracter: l.caracter, rand: r, cai: desenate, x: x0, avans: l.avans, indice, cutie });
      });
    });
  }
  return {
    glife, raport, caractereLipsa, linii, metrici: { rand: p.vertical ? distantaColoane : inaltimeRand, coborare: inMm(font.coborare) },
    linie: font.linie, inaltime: p.inaltime, majuscula,
  };
}
