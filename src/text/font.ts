/**
 * Cititorul de fonturi (ADR 0105 §1, ADR 0106 §1), propriu: opentype.js (ales de sonda s2) are ~170 kB și aduce și scrierea
 * fonturilor și modelarea completă, de care textul n-are nevoie. Citește doar ce cere așezarea literelor:
 * - containerul (`sfnt.ts`): un font singur sau o față dintr-o colecție TTC, numele din `name`;
 * - `head`, `maxp`, `hhea`, `hmtx`; `cmap` (formatele 4, 6 și 12, din subtabelul Unicode cel mai bun; un font simbol,
 *   Windows (3, 0), caută și în zona U+F000, ca Windows);
 * - contururile: TrueType (`loca` scurt și lung, `glyf`: glifele simple și compuse, cu transformarea și locul fiecărei
 *   componente, ca fontTools) sau CFF (`cff.ts`: OpenType `.otf`, și cele CID; și CFF2, al fonturilor variabile);
 * - `OS/2` (înălțimea majusculei) și crenarea: din `GPOS`, perechile caracteristicii `kern` (formatele 1 și 2, și prin
 *   căutările Extension); fără ea, din tabelul `kern` vechi (subtabelele orizontale de formatul 0, Microsoft și Apple);
 * - un font variabil (ADR 0113): axele și instanțele numite din `fvar`, iar la o instanță cerută (o instanță numită sau
 *   coordonatele axelor) variațiile din `variatii.ts`: contururile din `gvar` (sau din `blend`-urile lui CFF2), avansurile din
 *   `HVAR` (fără el, din punctele fantomă), crenarea din dispozitivele GPOS, majuscula din `MVAR` când fontul n-are H.
 * Literele se pun una după alta, fără `GSUB` (ADR 0019: „GSUB are rezervă literă cu literă”).
 *
 * Înălțimea majusculei (ADR 0019, ADR 0106 §1): vârful conturului literei H, adică litera tăiată („20 mm” = H de 20 mm);
 * fără H, `OS/2.sCapHeight`; fără niciuna, fontul e refuzat (`majuscula`). `sCapHeight` diferă de H în fonturi reale
 * (Candara: 1308 / 1302 unități; Gabriola, HarmonyOS), deci nu mai e o verificare.
 *
 * Coordonatele rămân în unitățile fontului, cu Y în sus; așezarea (`asezare.ts`) le duce în mm. Fără instanță cerută, un font
 * variabil se citește în instanța lui implicită.
 */
import { citesteCff, citesteCff2 } from './cff.ts';
import {
  COLECTIE, FontStricat, inceputuriFete, numeDupaId, numeFont, Octeti, SFNT_APPLE, SFNT_CFF, SFNT_TRUETYPE, tabele, WOFF, WOFF2,
  type ConturFont, type NumeFont, type PunctFont, type Tabele,
} from './sfnt.ts';
import { axeFvar, rotunjeste, variatii, type AxaFont, type Variatii } from './variatii.ts';

export { Octeti, type AxaFont, type ConturFont, type NumeFont, type PunctFont };

export type CodRefuzFont =
  | 'nu-e-font' | 'woff' | 'woff2' | 'tabel-lipsa' | 'stricat' | 'majuscula' | 'fara-unicode' | 'fata-lipsa' | 'variatii';

/**
 * O instanță numită a unui font variabil: numele stilului, cel PostScript (dacă îl are), dacă e chiar cea implicită și
 * coordonatele ei (în unitățile axelor, pe fiecare axă).
 */
export type InstantaFont = {
  readonly stil: string; readonly postscript: string | null; readonly implicita: boolean; readonly coordonate: Readonly<Record<string, number>>;
};

/** Instanța cerută la citire (ADR 0113): indicele unei instanțe numite din `fvar`, sau coordonatele axelor (lipsă: implicit). */
export type CerereInstanta = number | Readonly<Record<string, number>>;

export type Font = {
  readonly familie: string;
  readonly nume: NumeFont;
  readonly unitsPerEm: number;
  /** Înălțimea majusculei, în unitățile fontului: vârful lui H (fără H, `sCapHeight`). */
  readonly majuscula: number;
  /** Din `hhea`: urcarea, coborârea (negativă) și spațiul dintre rânduri. */
  readonly urcare: number;
  readonly coborare: number;
  readonly spatiuRanduri: number;
  readonly numarGlife: number;
  /** Contururi cubice (CFF: punctele de control câte două), nu pătratice (TrueType). */
  readonly cubice: boolean;
  /** Axele, dacă fontul e variabil (`fvar`). */
  readonly axe: readonly AxaFont[] | null;
  /** Instanțele numite, dacă fontul e variabil; contururile sunt ale instanței cerute la citire (implicit: cea implicită). */
  readonly instante: readonly InstantaFont[] | null;
  /** Glifa unui caracter (codul Unicode), sau 0 (`.notdef`) dacă fontul n-o are. */
  glifa(cod: number): number;
  /** Avansul glifei (lățimea ei de așezare), în unitățile fontului. */
  avans(glifa: number): number;
  /** Crenarea perechii (stânga, dreapta): cât se adaugă la avansul glifei din stânga (de obicei negativ). */
  crenare(stanga: number, dreapta: number): number;
  /** Contururile glifei, cu componentele glifelor compuse puse la locul lor; null: o glifă stricată (sărită, numărată). */
  contururi(glifa: number): readonly ConturFont[] | null;
};

export type RezultatFont = { readonly ok: true; readonly font: Font } | { readonly ok: false; readonly cod: CodRefuzFont; readonly detaliu?: string };

/** Imbricarea glifelor compuse: mai adânc (sau o glifă care se conține pe sine), refuzat. */
const ADANCIME_COMPUSE = 16;

/** Ce fel de fișier e, după primii patru octeți (fără să-l citească): font, colecție, WOFF, WOFF2 sau altceva. */
export function felFisier(octeti: Uint8Array): 'font' | 'colectie' | 'woff' | 'woff2' | 'necunoscut' {
  if (octeti.byteLength < 4) return 'necunoscut';
  const v = new DataView(octeti.buffer, octeti.byteOffset, 4).getUint32(0);
  if (v === SFNT_TRUETYPE || v === SFNT_CFF || v === SFNT_APPLE) return 'font';
  return v === COLECTIE ? 'colectie' : v === WOFF ? 'woff' : v === WOFF2 ? 'woff2' : 'necunoscut';
}

/** Fețele unui fișier (una pentru un font singur, toate pentru o colecție), cu numele lor; null: nu e un font citibil. */
export function feteFont(octeti: Uint8Array): readonly NumeFont[] | null {
  try {
    const o = new Octeti(octeti);
    if (felFisier(octeti) !== 'font' && felFisier(octeti) !== 'colectie') return null;
    return inceputuriFete(o).map((s) => numeFont(o, tabele(o, s)));
  } catch (e) {
    if (e instanceof FontStricat) return null;
    throw e;
  }
}

type SubtabelCmap = { readonly pos: number; readonly format: number };

/**
 * Subtabelul `cmap` cel mai bun, în ordinea lui fontTools (`getBestCmap`): Windows 3/10, Unicode 0/6, 0/4, Windows 3/1,
 * Unicode 0/3, 0/2, 0/1, 0/0; abia apoi simbolul Windows (3/0). Doar formatele 4, 6 și 12; restul (Shift-JIS, Mac Roman) nu.
 */
const PREFERINTE_CMAP = ['3/10', '0/6', '0/4', '3/1', '0/3', '0/2', '0/1', '0/0', '3/0'];

function alegeCmap(o: Octeti, t: Tabele): { sub: SubtabelCmap; simbol: boolean } | null {
  const c = t.get('cmap');
  if (!c) return null;
  const n = o.u16(c.pos + 2);
  let bun: { sub: SubtabelCmap; rang: number } | null = null;
  for (let k = 0; k < n; k++) {
    const r = c.pos + 4 + 8 * k;
    const rang = PREFERINTE_CMAP.indexOf(`${o.u16(r)}/${o.u16(r + 2)}`), pos = c.pos + o.u32(r + 4);
    const format = o.u16(pos);
    if (rang < 0 || (format !== 4 && format !== 6 && format !== 12)) continue;
    if (!bun || rang < bun.rang) bun = { sub: { pos, format }, rang };
  }
  return bun ? { sub: bun.sub, simbol: PREFERINTE_CMAP[bun.rang] === '3/0' } : null;
}

/** Glifa unui cod în subtabelul ales (formatele 4, 6, 12), sau 0. */
function glifaCmap(o: Octeti, sub: SubtabelCmap, cod: number): number {
  const p = sub.pos;
  if (sub.format === 4) {
    if (cod > 0xffff) return 0;
    const segmente = o.u16(p + 6) / 2;
    const sfarsit = p + 14, inceput = sfarsit + 2 * segmente + 2, delta = inceput + 2 * segmente, deplasare = delta + 2 * segmente;
    // Segmentele sunt ordonate după capătul lor: primul care nu se termină înainte de cod.
    let st = 0, dr = segmente - 1;
    while (st < dr) {
      const m = (st + dr) >> 1;
      if (o.u16(sfarsit + 2 * m) < cod) st = m + 1;
      else dr = m;
    }
    if (o.u16(sfarsit + 2 * st) < cod || o.u16(inceput + 2 * st) > cod) return 0;
    const d = o.u16(delta + 2 * st), dep = o.u16(deplasare + 2 * st);
    if (dep === 0) return (cod + d) & 0xffff;
    const g = o.u16(deplasare + 2 * st + dep + 2 * (cod - o.u16(inceput + 2 * st)));
    return g === 0 ? 0 : (g + d) & 0xffff;
  }
  if (sub.format === 6) {
    const prim = o.u16(p + 6), n = o.u16(p + 8);
    return cod >= prim && cod < prim + n ? o.u16(p + 10 + 2 * (cod - prim)) : 0;
  }
  // Formatul 12: grupuri [început, sfârșit, prima glifă], ordonate.
  const n = o.u32(p + 12);
  let st = 0, dr = n - 1;
  while (st <= dr) {
    const m = (st + dr) >> 1, r = p + 16 + 12 * m;
    if (cod < o.u32(r)) dr = m - 1;
    else if (cod > o.u32(r + 4)) st = m + 1;
    else return o.u32(r + 8) + cod - o.u32(r);
  }
  return 0;
}

/** Acoperirea OpenType (formatele 1 și 2): indexul glifei în acoperire, sau −1. */
export function acoperire(o: Octeti, pos: number, glifa: number): number {
  const format = o.u16(pos);
  if (format === 1) {
    const n = o.u16(pos + 2);
    let st = 0, dr = n - 1;
    while (st <= dr) {
      const m = (st + dr) >> 1, g = o.u16(pos + 4 + 2 * m);
      if (g === glifa) return m;
      if (g < glifa) st = m + 1;
      else dr = m - 1;
    }
    return -1;
  }
  if (format === 2) {
    const n = o.u16(pos + 2);
    let st = 0, dr = n - 1;
    while (st <= dr) {
      const m = (st + dr) >> 1, r = pos + 4 + 6 * m;
      if (glifa < o.u16(r)) dr = m - 1;
      else if (glifa > o.u16(r + 2)) st = m + 1;
      else return o.u16(r + 4) + glifa - o.u16(r);
    }
    return -1;
  }
  throw new FontStricat(`acoperire de formatul ${format}`);
}

/** Clasa unei glife după o definiție de clase (formatele 1 și 2); lipsă din ea: clasa 0. */
export function clasa(o: Octeti, pos: number, glifa: number): number {
  const format = o.u16(pos);
  if (format === 1) {
    const prima = o.u16(pos + 2), n = o.u16(pos + 4);
    return glifa >= prima && glifa < prima + n ? o.u16(pos + 6 + 2 * (glifa - prima)) : 0;
  }
  if (format === 2) {
    const n = o.u16(pos + 2);
    let st = 0, dr = n - 1;
    while (st <= dr) {
      const m = (st + dr) >> 1, r = pos + 4 + 6 * m;
      if (glifa < o.u16(r)) dr = m - 1;
      else if (glifa > o.u16(r + 2)) st = m + 1;
      else return o.u16(r + 4);
    }
    return 0;
  }
  throw new FontStricat(`definiție de clase de formatul ${format}`);
}

/** Mărimea unei înregistrări de valori (ValueRecord): 2 octeți pe fiecare bit al formatului. */
function marimeValoare(format: number): number {
  let n = 0;
  for (let b = format & 0xff; b; b >>= 1) n += b & 1;
  return 2 * n;
}

/**
 * XAdvance dintr-o înregistrare de valori (bitul 0x0004), dacă există, altfel 0; la o instanță (ADR 0113), plus delta
 * dispozitivului lui (bitul 0x0040), al cărui offset e de la începutul tabelului care o ține (`parinte`: setul perechii, la
 * formatul 1; subtabelul, la formatul 2).
 */
function avansDinValoare(o: Octeti, pos: number, format: number, parinte: number, v: Variatii | null): number {
  let x = format & 0x0004 ? o.i16(pos + 2 * (format & 0x0001) + 2 * ((format & 0x0002) >> 1)) : 0;
  if (v && format & 0x0040) {
    const dispozitiv = o.u16(pos + marimeValoare(format & 0x003f));
    if (dispozitiv) x += v.dispozitiv(parinte + dispozitiv);
  }
  return x;
}

type Crenare = (a: number, b: number) => number;

/**
 * Crenarea din `GPOS` (ADR 0105 §1, ADR 0106 §1): căutările de perechi (tipul 2, sau tipul 9, Extension, care trimite la
 * unul de tipul 2) ale caracteristicii `kern`, în ordinea lor; în fiecare căutare, primul subtabel care potrivește perechea
 * o hotărăște. Formatul 1: perechi anume (glifa a doua căutată binar); formatul 2: clasele celor două glife. Valoarea e
 * XAdvance al primei glife (la o instanță, cu delta dispozitivului). Null: `GPOS` n-are crenare.
 */
function crenareGpos(o: Octeti, t: Tabele, v: Variatii | null): Crenare | null {
  const g = t.get('GPOS');
  if (!g) return null;
  const caracteristici = g.pos + o.u16(g.pos + 6), cautari = g.pos + o.u16(g.pos + 8);
  const indici = new Set<number>();
  const nc = o.u16(caracteristici);
  for (let k = 0; k < nc; k++) {
    const r = caracteristici + 2 + 6 * k;
    if (o.tag(r) !== 'kern') continue;
    const c = caracteristici + o.u16(r + 4);
    const n = o.u16(c + 2);
    for (let i = 0; i < n; i++) indici.add(o.u16(c + 4 + 2 * i));
  }
  const subtabele: number[][] = [];
  for (const i of [...indici].sort((a, b) => a - b)) {
    const c = cautari + o.u16(cautari + 2 + 2 * i);
    const tip = o.u16(c);
    if (tip !== 2 && tip !== 9) continue;
    const n = o.u16(c + 4);
    const lista: number[] = [];
    for (let s = 0; s < n; s++) {
      const st = c + o.u16(c + 6 + 2 * s);
      if (tip === 2) lista.push(st);
      // Extension: formatul 1, tipul căutării din ea, offsetul pe 32 de biți, de la începutul ei.
      else if (o.u16(st) === 1 && o.u16(st + 2) === 2) lista.push(st + o.u32(st + 4));
    }
    if (lista.length > 0) subtabele.push(lista);
  }
  if (subtabele.length === 0) return null;
  const subtabel = (st: number, a: number, b: number): number | null => {
    const format = o.u16(st);
    const k = acoperire(o, st + o.u16(st + 2), a);
    if (k < 0) return null;
    const f1 = o.u16(st + 4), f2 = o.u16(st + 6);
    if (format === 1) {
      const set = st + o.u16(st + 10 + 2 * k);
      const n = o.u16(set);
      const pas = 2 + marimeValoare(f1) + marimeValoare(f2);
      let s = 0, d = n - 1;
      while (s <= d) {
        const m = (s + d) >> 1, r = set + 2 + pas * m, g2 = o.u16(r);
        // Dispozitivele unei perechi anume sunt de la începutul setului ei (PairSet), nu al subtabelului.
        if (g2 === b) return avansDinValoare(o, r + 2, f1, set, v);
        if (g2 < b) s = m + 1;
        else d = m - 1;
      }
      return null;
    }
    if (format === 2) {
      const c1 = clasa(o, st + o.u16(st + 8), a), c2 = clasa(o, st + o.u16(st + 10), b);
      const n1 = o.u16(st + 12), n2 = o.u16(st + 14);
      if (c1 >= n1 || c2 >= n2) return null;
      const pas = marimeValoare(f1) + marimeValoare(f2);
      return avansDinValoare(o, st + 16 + pas * (c1 * n2 + c2), f1, st, v);
    }
    throw new FontStricat(`perechi de formatul ${format}`);
  };
  return (a, b) => {
    let total = 0;
    for (const lista of subtabele) {
      for (const st of lista) {
        const v = subtabel(st, a, b);
        if (v !== null) {
          total += v;
          break;
        }
      }
    }
    return total;
  };
}

/**
 * Crenarea din tabelul `kern` vechi (ADR 0106 §1), pentru fonturile fără crenare în `GPOS`: subtabelele orizontale de
 * formatul 0 (perechile stânga, dreapta, valoare), din antetul Microsoft (versiunea 0) sau Apple (versiunea 1.0); valorile se
 * adună, iar un subtabel Microsoft cu steagul „override” o înlocuiește pe cea de până la el. Null: fără tabel sau perechi.
 */
function crenareKern(o: Octeti, t: Tabele): Crenare | null {
  const k = t.get('kern');
  if (!k) return null;
  const apple = o.u16(k.pos) === 1;
  const n = apple ? o.u32(k.pos + 4) : o.u16(k.pos + 2);
  const liste: { pos: number; n: number; inlocuieste: boolean }[] = [];
  let p = k.pos + (apple ? 8 : 4);
  const capat = k.pos + k.lungime;
  for (let i = 0; i < n && p < capat; i++) {
    let lungime: number, format: number, orizontal: boolean, inlocuieste = false, antet: number;
    if (apple) {
      lungime = o.u32(p);
      const acoperireA = o.u16(p + 4);
      format = acoperireA & 0xff;
      orizontal = (acoperireA & 0xe000) === 0;
      antet = 8;
    } else {
      lungime = o.u16(p + 2);
      const acoperireM = o.u16(p + 4);
      format = acoperireM >> 8;
      orizontal = (acoperireM & 0x0007) === 0x0001;
      inlocuieste = (acoperireM & 0x0008) !== 0;
      antet = 6;
    }
    if (format === 0) {
      const perechi = o.u16(p + antet);
      if (orizontal) liste.push({ pos: p + antet + 8, n: perechi, inlocuieste });
      // Lungimea Microsoft e pe 16 biți și se rupe la tabelele mari: după formatul 0, se merge pe numărul perechilor.
      lungime = antet + 8 + 6 * perechi;
    }
    if (lungime <= 0) break;
    p += lungime;
  }
  if (liste.length === 0) return null;
  // Perechile ar trebui să fie ordonate după (stânga, dreapta), dar fonturi reale (Elephant) le au după glifa din dreapta:
  // fiecare subtabel devine o hartă, la prima crenare cerută; o pereche scrisă de două ori o ține pe ultima, ca fontTools.
  let harti: { harta: Map<number, number>; inlocuieste: boolean }[] | null = null;
  return (a, b) => {
    harti ??= liste.map((l) => {
      const harta = new Map<number, number>();
      for (let i = 0; i < l.n; i++) {
        const r = l.pos + 6 * i;
        harta.set(o.u16(r) * 65536 + o.u16(r + 2), o.i16(r + 4));
      }
      return { harta, inlocuieste: l.inlocuieste };
    });
    const cheie = a * 65536 + b;
    let total = 0;
    for (const h of harti) {
      const v = h.harta.get(cheie);
      if (v !== undefined) total = (h.inlocuieste ? 0 : total) + v;
    }
    return total;
  };
}

/** Instanțele numite din `fvar` (al cărui axe sunt `axe`), cu coordonatele lor. */
function instante(o: Octeti, t: Tabele, axe: readonly AxaFont[], familie: string): InstantaFont[] {
  const f = t.get('fvar')!;
  const prima = f.pos + o.u16(f.pos + 4) + axe.length * o.u16(f.pos + 10);
  const n = o.u16(f.pos + 12), marime = o.u16(f.pos + 14);
  const rez: InstantaFont[] = [];
  for (let k = 0; k < n; k++) {
    const r = prima + k * marime;
    const coordonate: Record<string, number> = {};
    let implicita = true;
    axe.forEach((a, i) => {
      const v = o.fixed(r + 4 + 4 * i);
      coordonate[a.tag] = v;
      if (v !== a.implicit) implicita = false;
    });
    const idPs = marime >= 6 + 4 * axe.length ? o.u16(r + 4 + 4 * axe.length) : 0xffff;
    rez.push({
      stil: numeDupaId(o, t, o.u16(r)) ?? `${familie} ${k + 1}`,
      postscript: idPs !== 0xffff ? numeDupaId(o, t, idPs) : null,
      implicita,
      coordonate,
    });
  }
  return rez;
}

/** Steagurile componentelor unei glife compuse (spec. OpenType, `glyf`). */
const CUVINTE = 0x0001, XY = 0x0002, SCARA = 0x0008, MAI_MULTE = 0x0020, SCARA_XY = 0x0040, DOI_PE_DOI = 0x0080;
const DEPLASARE_SCALATA = 0x0800;

/**
 * Citește fața `fata` (0 pentru un font singur) a unui font TrueType sau OpenType (ADR 0105 §1, ADR 0106 §1), la `instanta`
 * dacă fontul e variabil (ADR 0113; o instanță numită care nu există: `fata-lipsa`; una pe care cititorul n-o poate calcula:
 * `variatii`). Nu aruncă: un fișier greșit e un refuz cu cod. Glifele se citesc la cerere, cu memorie (o glifă compusă își
 * refolosește componentele).
 */
export function citesteFont(octeti: Uint8Array, fata = 0, instanta?: CerereInstanta): RezultatFont {
  try {
    return citeste(new Octeti(octeti), fata, instanta);
  } catch (e) {
    if (e instanceof FontStricat) return { ok: false, cod: 'stricat', detaliu: e.message };
    throw e;
  }
}

function citeste(o: Octeti, fata: number, instanta: CerereInstanta | undefined): RezultatFont {
  if (o.lungime < 12) return { ok: false, cod: 'nu-e-font' };
  const fel = felFisier(new Uint8Array(o.v.buffer, o.v.byteOffset, 4));
  if (fel === 'woff') return { ok: false, cod: 'woff' };
  if (fel === 'woff2') return { ok: false, cod: 'woff2' };
  if (fel !== 'font' && fel !== 'colectie') return { ok: false, cod: 'nu-e-font' };
  const inceputuri = inceputuriFete(o);
  const start = inceputuri[fata];
  if (start === undefined) return { ok: false, cod: 'fata-lipsa', detaliu: `${fata} din ${inceputuri.length}` };
  const versiune = o.u32(start);
  if (versiune !== SFNT_TRUETYPE && versiune !== SFNT_CFF && versiune !== SFNT_APPLE) return { ok: false, cod: 'nu-e-font' };
  const t = tabele(o, start);
  const cff = t.get('CFF '), cff2 = cff ? undefined : t.get('CFF2');
  for (const nume of ['head', 'maxp', 'hhea', 'hmtx', ...(cff || cff2 ? [] : ['loca', 'glyf'])]) {
    if (!t.has(nume)) return { ok: false, cod: 'tabel-lipsa', detaliu: nume };
  }
  const head = t.get('head')!.pos, maxp = t.get('maxp')!.pos, hhea = t.get('hhea')!.pos, hmtx = t.get('hmtx')!.pos;
  const unitsPerEm = o.u16(head + 18);
  if (unitsPerEm < 16 || unitsPerEm > 16384) throw new FontStricat(`unitsPerEm ${unitsPerEm}`);
  const numarGlife = o.u16(maxp + 4);
  const metrici = o.u16(hhea + 34);
  if (metrici === 0 || metrici > numarGlife) throw new FontStricat(`numberOfHMetrics ${metrici}`);
  // Avansurile se citesc la cerere: lungimea tabelului se verifică aici, o dată.
  if (t.get('hmtx')!.lungime < 4 * metrici) throw new FontStricat('hmtx e prea scurt');
  const cmap = alegeCmap(o, t);
  if (!cmap) return { ok: false, cod: 'fara-unicode' };
  const glifaCod = (cod: number): number => {
    const g = glifaCmap(o, cmap.sub, cod);
    // Un font simbol (Windows 3/0) își pune glifele la U+F020–U+F0FF: un caracter obișnuit le caută acolo, ca Windows.
    return g === 0 && cmap.simbol && cod >= 0x20 && cod <= 0xff ? glifaCmap(o, cmap.sub, 0xf000 + cod) : g;
  };

  // Instanța cerută (ADR 0113): variațiile ei, sau nimic la cea implicită și la un font fix.
  const nume = numeFont(o, t);
  const axe = axeFvar(o, t);
  const listaInstante = axe ? instante(o, t, axe, nume.familie) : null;
  let v: Variatii | null = null;
  if (instanta !== undefined) {
    const coordonate = typeof instanta === 'number' ? listaInstante?.[instanta]?.coordonate : instanta;
    if (!coordonate) return { ok: false, cod: 'fata-lipsa', detaliu: `instanța ${instanta} din ${listaInstante?.length ?? 0}` };
    if (axe) {
      const r = variatii(o, t, axe, coordonate, numarGlife);
      if (typeof r === 'string') return { ok: false, cod: 'variatii', detaliu: r };
      v = r;
    }
  }

  let contururiGlifa: (g: number) => readonly ConturFont[];
  let avansFantoma: ((g: number, avans: number, lsb: number) => number) | null = null;
  if (cff || cff2) {
    // CFF2 la instanță: `blend`-urile cu coordonatele ei; la cea implicită, valorile lor.
    const c = cff ? citesteCff(o, cff.pos, numarGlife, unitsPerEm) : citesteCff2(o, cff2!.pos, numarGlife, unitsPerEm, v?.normalizate ?? null);
    const memorie = new Map<number, readonly ConturFont[]>();
    contururiGlifa = (g) => {
      const gata = memorie.get(g);
      if (gata) return gata;
      const r = c.contururi(g);
      memorie.set(g, r);
      return r;
    };
  } else {
    const tt = contururiTrueType(o, t, numarGlife, o.i16(head + 50) === 1, v);
    contururiGlifa = tt.contururi;
    avansFantoma = tt.avansFantoma;
  }

  const avansImplicit = (g: number): number => o.u16(hmtx + 4 * Math.min(g, metrici - 1));
  /** Distanța de la originea glifei la marginea ei din stânga (`hmtx`; un tabel prea scurt: 0). */
  const lsb = (g: number): number => {
    const p = g < metrici ? 4 * g + 2 : 4 * metrici + 2 * (g - metrici);
    return p + 2 <= t.get('hmtx')!.lungime ? o.i16(hmtx + p) : 0;
  };
  // La o instanță, avansul din HVAR, altfel din punctele fantomă (doar TrueType), ținut pe glifă; o glifă cu variațiile
  // stricate își păstrează avansul implicit (contururile ei se sar, numărate, la așezare).
  const variat = v?.avansHvar ?? (v && avansFantoma ? (g: number, a: number) => avansFantoma(g, a, lsb(g)) : null);
  const avansuri = new Map<number, number>();
  const avans = (g: number): number => {
    if (g < 0 || g >= numarGlife) return 0;
    if (!variat) return avansImplicit(g);
    let a = avansuri.get(g);
    if (a === undefined) {
      try {
        a = variat(g, avansImplicit(g));
      } catch (e) {
        if (!(e instanceof FontStricat)) throw e;
        a = avansImplicit(g);
      }
      avansuri.set(g, a);
    }
    return a;
  };

  // Înălțimea majusculei (ADR 0019, ADR 0106 §1): vârful conturului lui H, adică ce se taie; fără H, `OS/2.sCapHeight`.
  const gH = glifaCod(0x48);
  const varfH = gH === 0 ? null : contururiGlifa(gH).flat().reduce((m, q) => Math.max(m, q.y), -Infinity);
  let majuscula: number;
  if (varfH !== null && Number.isFinite(varfH) && varfH > 0) majuscula = varfH;
  else {
    // La o instanță, `cpht` din MVAR schimbă și sCapHeight.
    const os2 = t.get('OS/2');
    const capOs2 = os2 && o.u16(os2.pos) >= 2 && os2.lungime >= 90 ? o.i16(os2.pos + 88) + (v?.cpht ?? 0) : 0;
    if (capOs2 <= 0) return { ok: false, cod: 'majuscula', detaliu: 'fără H și fără sCapHeight' };
    majuscula = capOs2;
  }

  const crenare = crenareGpos(o, t, v) ?? crenareKern(o, t);
  const font: Font = {
    familie: nume.familie,
    nume,
    unitsPerEm,
    majuscula,
    urcare: o.i16(hhea + 4),
    coborare: o.i16(hhea + 6),
    spatiuRanduri: o.i16(hhea + 8),
    numarGlife,
    cubice: !!(cff || cff2),
    axe,
    instante: listaInstante,
    glifa: (cod) => {
      try {
        return glifaCod(cod);
      } catch (e) {
        if (e instanceof FontStricat) return 0;
        throw e;
      }
    },
    avans,
    crenare: (a, b) => {
      if (!crenare) return 0;
      try {
        return crenare(a, b);
      } catch (e) {
        if (e instanceof FontStricat) return 0;
        throw e;
      }
    },
    contururi: (g) => {
      try {
        return contururiGlifa(g);
      } catch (e) {
        if (e instanceof FontStricat) return null;
        throw e;
      }
    },
  };
  return { ok: true, font };
}

/** O componentă a unei glife compuse, citită: steagul, glifa, cele două argumente și transformarea (dacă are). */
type Componenta = {
  readonly steag: number; readonly glifa: number; readonly arg1: number; readonly arg2: number;
  readonly m: { readonly a: number; readonly b: number; readonly c: number; readonly d: number } | null;
};

/**
 * Contururile TrueType (`loca` + `glyf`), cu memorie, la instanța `v` (null: cea implicită); aruncă `FontStricat` pentru o
 * glifă stricată. Și avansul din punctele fantomă (ADR 0113), pentru instanțele fonturilor fără `HVAR`.
 */
function contururiTrueType(o: Octeti, t: Tabele, numarGlife: number, locaLunga: boolean, v: Variatii | null): {
  readonly contururi: (g: number) => readonly ConturFont[];
  readonly avansFantoma: (g: number, avans: number, lsb: number) => number;
} {
  const loca = t.get('loca')!, glyf = t.get('glyf')!;
  // Locurile glifelor se citesc la cerere: lungimea lui `loca` se verifică aici, o dată.
  if (loca.lungime < (numarGlife + 1) * (locaLunga ? 4 : 2)) throw new FontStricat('loca e prea scurt');

  /** Începutul și sfârșitul datelor glifei în `glyf` (egale: glifă goală, ca spațiul). */
  const locul = (g: number): readonly [number, number] => {
    if (g < 0 || g >= numarGlife) throw new FontStricat(`glifa ${g} nu există`);
    const a = locaLunga ? o.u32(loca.pos + 4 * g) : 2 * o.u16(loca.pos + 2 * g);
    const b = locaLunga ? o.u32(loca.pos + 4 * g + 4) : 2 * o.u16(loca.pos + 2 * g + 2);
    if (b < a || b > glyf.lungime) throw new FontStricat(`glifa ${g} iese din glyf`);
    return [glyf.pos + a, glyf.pos + b];
  };

  const memorie = new Map<number, readonly ConturFont[]>();
  /** Contururile glifei `g`; `drum` = glifele compuse deschise (ciclurile și adâncimea). */
  const contururi = (g: number, drum: readonly number[]): readonly ConturFont[] => {
    const gata = memorie.get(g);
    if (gata) return gata;
    if (drum.includes(g) || drum.length >= ADANCIME_COMPUSE) throw new FontStricat(`glifa compusă ${g} se conține pe sine sau e prea adâncă`);
    const [a, b] = locul(g);
    const r = a === b ? [] : o.i16(a) >= 0 ? simpla(a, g) : compusa(a, g, [...drum, g]);
    memorie.set(g, r);
    return r;
  };

  /**
   * O glifă simplă: capetele contururilor, instrucțiunile (sărite), steagurile (cu repetare), apoi X și Y, ca diferențe; la o
   * instanță, plus deltele punctelor (cele fără deltă, interpolate pe conturul lor).
   */
  const simpla = (a: number, g: number): ConturFont[] => {
    const n = o.i16(a);
    const capete: number[] = [];
    for (let k = 0; k < n; k++) capete.push(o.u16(a + 10 + 2 * k));
    const puncte = n === 0 ? 0 : capete[n - 1]! + 1;
    for (let k = 1; k < n; k++) if (capete[k]! <= capete[k - 1]!) throw new FontStricat('capetele contururilor nu cresc');
    let p = a + 10 + 2 * n;
    p += 2 + o.u16(p);
    const steaguri: number[] = [];
    while (steaguri.length < puncte) {
      const s = o.u8(p++);
      steaguri.push(s);
      if (s & 0x08) {
        const repetari = o.u8(p++);
        for (let k = 0; k < repetari && steaguri.length < puncte; k++) steaguri.push(s);
      }
    }
    const coordonate = (scurt: number, aceeasi: number): number[] => {
      const v: number[] = [];
      let c = 0;
      for (const s of steaguri) {
        if (s & scurt) c += (s & aceeasi ? 1 : -1) * o.u8(p++);
        else if (!(s & aceeasi)) { c += o.i16(p); p += 2; }
        v.push(c);
      }
      return v;
    };
    const xs = coordonate(0x02, 0x10), ys = coordonate(0x04, 0x20);
    const d = v?.delte(g, puncte + 4, xs, ys, capete);
    if (d) {
      for (let k = 0; k < puncte; k++) {
        xs[k] = xs[k]! + d[2 * k]!;
        ys[k] = ys[k]! + d[2 * k + 1]!;
      }
    }
    const rez: ConturFont[] = [];
    let start = 0;
    for (const capat of capete) {
      const c: PunctFont[] = [];
      for (let k = start; k <= capat; k++) c.push({ x: xs[k]!, y: ys[k]!, peCurba: (steaguri[k]! & 0x01) !== 0 });
      rez.push(c);
      start = capat + 1;
    }
    return rez;
  };

  /** Componentele unei glife compuse, în ordine: steagul, glifa, argumentele (deplasarea sau punctele) și transformarea. */
  const componente = (a: number): Componenta[] => {
    const rez: Componenta[] = [];
    let p = a + 10;
    for (;;) {
      const steag = o.u16(p), glifa = o.u16(p + 2);
      p += 4;
      let arg1: number, arg2: number;
      if (steag & CUVINTE) {
        arg1 = steag & XY ? o.i16(p) : o.u16(p);
        arg2 = steag & XY ? o.i16(p + 2) : o.u16(p + 2);
        p += 4;
      } else {
        arg1 = steag & XY ? o.i8(p) : o.u8(p);
        arg2 = steag & XY ? o.i8(p + 1) : o.u8(p + 1);
        p += 2;
      }
      let m: Componenta['m'] = null;
      if (steag & SCARA) {
        const s = o.f2dot14(p);
        m = { a: s, b: 0, c: 0, d: s };
        p += 2;
      } else if (steag & SCARA_XY) {
        m = { a: o.f2dot14(p), b: 0, c: 0, d: o.f2dot14(p + 2) };
        p += 4;
      } else if (steag & DOI_PE_DOI) {
        m = { a: o.f2dot14(p), b: o.f2dot14(p + 2), c: o.f2dot14(p + 4), d: o.f2dot14(p + 6) };
        p += 8;
      }
      rez.push({ steag, glifa, arg1, arg2, m });
      if (!(steag & MAI_MULTE)) return rez;
    }
  };

  /**
   * O glifă compusă: fiecare componentă, cu transformarea ei (scara, scara pe X și Y, sau 2 × 2) și locul ei: deplasarea
   * (aplicată după transformare, ca în fontTools și la Microsoft; înainte, cu steagul SCALED_COMPONENT_OFFSET), sau un punct
   * al componentei pus peste un punct al celor de dinainte. La o instanță, deplasările primesc deltele lor (o componentă pusă
   * pe puncte urmează punctele variate, iar deltele ei nu contează).
   */
  const compusa = (a: number, g: number, drum: readonly number[]): ConturFont[] => {
    const lista = componente(a);
    const d = v?.delte(g, lista.length + 4, null, null, null);
    const rez: ConturFont[] = [];
    lista.forEach(({ steag, glifa, arg1, arg2, m: transformare }, k) => {
      const m = transformare ?? { a: 1, b: 0, c: 0, d: 1 };
      const aplica = (q: PunctFont, dx: number, dy: number): PunctFont => ({ x: m.a * q.x + m.c * q.y + dx, y: m.b * q.x + m.d * q.y + dy, peCurba: q.peCurba });
      const comp = contururi(glifa, drum);
      let dx = 0, dy = 0;
      if (steag & XY) {
        const x = d ? arg1 + d[2 * k]! : arg1, y = d ? arg2 + d[2 * k + 1]! : arg2;
        if (transformare && steag & DEPLASARE_SCALATA) {
          dx = m.a * x + m.c * y;
          dy = m.b * x + m.d * y;
        } else {
          dx = x;
          dy = y;
        }
      } else {
        // Punctul `arg2` al componentei (transformată) se pune peste punctul `arg1` al celor de dinainte.
        const toate = rez.flat(), ale = comp.flat();
        const tinta = toate[arg1], al = ale[arg2];
        if (!tinta || !al) throw new FontStricat(`puncte de potrivire în afara glifei (${arg1}, ${arg2})`);
        const t2 = aplica(al, 0, 0);
        dx = tinta.x - t2.x;
        dy = tinta.y - t2.y;
      }
      for (const c of comp) rez.push(c.map((q) => aplica(q, dx, dy)));
    });
    return rez;
  };

  /**
   * Avansul glifei `g` la instanță, din punctele fantomă (ca instancer-ul lui fontTools): cel din stânga stă la xMin − lsb,
   * cel din dreapta cu avansul mai încolo; fiecare primește delta lui, iar avansul nou e distanța dintre ele, rotunjită.
   */
  const avansFantoma = (g: number, avans: number, lsb: number): number => {
    const [a, b] = locul(g);
    let n = 0, xMin = 0;
    if (a !== b) {
      const nc = o.i16(a);
      xMin = o.i16(a + 2);
      n = nc >= 0 ? (nc === 0 ? 0 : o.u16(a + 10 + 2 * (nc - 1)) + 1) : componente(a).length;
    }
    const d = v?.delte(g, n + 4, null, null, null);
    if (!d) return avans;
    const x0 = xMin - lsb;
    return Math.max(0, rotunjeste(x0 + avans + d[2 * n + 2]! - (x0 + d[2 * n]!)));
  };

  return { contururi: (g) => contururi(g, []), avansFantoma };
}
