/**
 * Contururile CFF (ADR 0106 §1): tabelul `CFF ` al unui OpenType `.otf`, cu charstring-uri Type 2 (Adobe TN 5176, 5177).
 * Citește doar ce cer contururile: antetul, indexurile (numele, Top DICT, șirurile, subrutinele globale), Top DICT
 * (charstring-urile, Private, setul de caractere, matricea), Private DICT (subrutinele locale) și, pentru fonturile CID
 * (Source Han, fonturile CJK), FDArray și FDSelect (formatele 0 și 3), fiecare cu Private și subrutinele lui.
 *
 * Interpretorul Type 2: mutările și liniile, toate felurile de cubice (`rrcurveto`, `hhcurveto`, `vvcurveto`, `hvcurveto`,
 * `vhcurveto`, `rcurveline`, `rlinecurve`), cele patru `flex`, subrutinele (locale și globale, cu decalajul după numărul
 * lor), sugestiile (sărite, dar numărate: `hintmask` are atâția octeți câte tulpini), lățimea din fața primului operator
 * care golește stiva (sărită: avansul vine din `hmtx`), `endchar` cu accentul compus (`seac`: litera și accentul după
 * codurile StandardEncoding, ca fontTools). Ca fontTools, fiecare `moveto` începe un contur (și unul de un singur punct),
 * conturul se închide singur, iar aritmetica (scoasă din spec.) face glifa stricată.
 *
 * CFF2 (ADR 0113, tabelul `CFF2` al fonturilor variabile OpenType cu contururi PostScript): antetul și Top DICT fără
 * indexurile numelor și ale șirurilor, indexurile cu numărul pe 32 de biți, FDArray mereu (FDSelect lipsă: totul în primul;
 * formatele 0, 3 și 4), magazinul de variații (`vstore`); charstring-urile fără lățime, fără `endchar` și fără `return`, cu
 * `vsindex` și `blend`: la o instanță, fiecare valoare amestecată primește deltele ei înmulțite cu factorii regiunilor
 * (ca `blend`-ul lui fontTools), la cea implicită rămâne valoarea ei.
 *
 * Matricea fontului: scara 1/unitsPerEm (scrisă rotunjit, deci cu o miime toleranță) sau altă scară curată, aplicată
 * coordonatelor; înclinată, refuzată.
 */
import { FontStricat, type ConturFont, type Octeti, type PunctFont } from './sfnt.ts';
import { factoriMagazin } from './variatii.ts';

/** Imbricarea subrutinelor (spec: 10; fontTools nu are limită, deci mai larg) și mărimea stivei (spec: 48). */
const ADANCIME_SUBRUTINE = 64;
const STIVA = 513;
/** Câți operatori poate rula o glifă (o buclă din subrutine se oprește, nu blochează pagina). */
const OPERATII_GLIFA = 200_000;

/** StandardEncoding → SID-ul numelui standard, pe porțiuni [cod, SID, câte] (fontTools: `StandardEncoding`, `cffStandardStrings`). */
const STANDARD = [[32, 1, 95], [161, 96, 15], [177, 111, 4], [182, 115, 8], [191, 123, 1], [193, 124, 8], [202, 132, 2], [205, 134, 4], [225, 138, 1], [227, 139, 1], [232, 140, 4], [241, 144, 1], [245, 145, 1], [248, 146, 4]] as const;

function sidStandard(cod: number): number {
  for (const [c, s, n] of STANDARD) if (cod >= c && cod < c + n) return s + cod - c;
  return 0;
}

type Index = { readonly n: number; readonly element: (i: number) => readonly [number, number]; readonly sfarsit: number };

/**
 * Un INDEX CFF: numărul (pe 16 biți; în CFF2, pe 32), mărimea offseturilor, offseturile (de la 1) și datele; elementul i =
 * [început, sfârșit).
 */
function index(o: Octeti, p: number, cff2 = false): Index {
  const h = cff2 ? 4 : 2;
  const n = cff2 ? o.u32(p) : o.u16(p);
  if (n === 0) return { n: 0, element: () => { throw new FontStricat('index gol'); }, sfarsit: p + h };
  if (n > 0xffff) throw new FontStricat(`index cu ${n} elemente`);
  const marime = o.u8(p + h);
  if (marime < 1 || marime > 4) throw new FontStricat(`index cu offseturi de ${marime} octeți`);
  const off = (i: number): number => {
    const q = p + h + 1 + i * marime;
    return marime === 1 ? o.u8(q) : marime === 2 ? o.u16(q) : marime === 3 ? o.u24(q) : o.u32(q);
  };
  const baza = p + h + 1 + (n + 1) * marime - 1;
  const sfarsit = baza + off(n);
  if (sfarsit > o.lungime) throw new FontStricat('index în afara fișierului');
  return {
    n,
    sfarsit,
    element: (i) => {
      if (i < 0 || i >= n) throw new FontStricat(`element ${i} din ${n}`);
      const a = baza + off(i), b = baza + off(i + 1);
      if (b < a || a < baza + 1) throw new FontStricat('index cu offseturi descrescătoare');
      return [a, b];
    },
  };
}

/**
 * Un DICT CFF: operatorul (12 xx devine 1200 + xx) → operanzii lui. În CFF2 mai sunt `vsindex` (22), `vstore` (24) și
 * `blend` (23), după care rămân valorile implicite (aplicația nu citește valori amestecate dintr-un DICT: doar sugestii).
 */
function dict(o: Octeti, a: number, b: number, cff2 = false): Map<number, number[]> {
  const d = new Map<number, number[]>();
  let operanzi: number[] = [];
  let p = a;
  while (p < b) {
    const b0 = o.u8(p);
    if (cff2 && b0 === 23) {
      const n = operanzi.pop() ?? 0;
      operanzi = operanzi.slice(0, n);
      p++;
    } else if (b0 <= 21 || (cff2 && (b0 === 22 || b0 === 24))) {
      const op = b0 === 12 ? 1200 + o.u8(p + 1) : b0;
      p += b0 === 12 ? 2 : 1;
      d.set(op, operanzi);
      operanzi = [];
    } else if (b0 === 28) { operanzi.push(o.i16(p + 1)); p += 3; }
    else if (b0 === 29) { operanzi.push(o.i32(p + 1)); p += 5; }
    else if (b0 === 30) {
      // Un număr real, în nibble-uri: cifre, punctul, E, E−, minus; f încheie.
      let s = '';
      p++;
      for (let gata = false; !gata; p++) {
        const v = o.u8(p);
        for (const n of [v >> 4, v & 15]) {
          if (n === 15) { gata = true; break; }
          s += n <= 9 ? String(n) : n === 10 ? '.' : n === 11 ? 'E' : n === 12 ? 'E-' : n === 14 ? '-' : '';
        }
      }
      const x = Number(s);
      if (!Number.isFinite(x)) throw new FontStricat(`număr real ${s}`);
      operanzi.push(x);
    } else if (b0 >= 32 && b0 <= 246) { operanzi.push(b0 - 139); p++; }
    else if (b0 >= 247 && b0 <= 250) { operanzi.push((b0 - 247) * 256 + o.u8(p + 1) + 108); p += 2; }
    else if (b0 >= 251 && b0 <= 254) { operanzi.push(-(b0 - 251) * 256 - o.u8(p + 1) - 108); p += 2; }
    else throw new FontStricat(`octet ${b0} într-un DICT`);
  }
  return d;
}

/** Decalajul subrutinelor (TN 5177): după câte sunt. */
const decalaj = (n: number): number => (n < 1240 ? 107 : n < 33900 ? 1131 : 32768);

type Subrutine = { readonly idx: Index | null; readonly decalaj: number };

function subrutine(o: Octeti, p: number | null, cff2 = false): Subrutine {
  if (p === null) return { idx: null, decalaj: 0 };
  const idx = index(o, p, cff2);
  return { idx, decalaj: decalaj(idx.n) };
}

/** Ce dă un Private DICT: subrutinele locale și (CFF2) setul de date implicit al magazinului pentru `blend`. */
type Privat = Subrutine & { readonly vsindex: number };

/** Private DICT [mărime, offset]: subrutinele locale (offsetul lor e de la începutul lui Private) și `vsindex`. */
function private_(o: Octeti, cff: number, operanzi: number[] | undefined, cff2 = false): Privat {
  if (!operanzi || operanzi.length < 2) return { idx: null, decalaj: 0, vsindex: 0 };
  const [marime, off] = operanzi as [number, number];
  const p = cff + off;
  const d = dict(o, p, p + marime, cff2);
  const subrs = d.get(19);
  return { ...subrutine(o, subrs ? p + subrs[0]! : null, cff2), vsindex: d.get(22)?.[0] ?? 0 };
}

export type CitireCff = {
  /** Contururile glifei, în unitățile fontului (punctele de control câte două, ale cubicelor); aruncă `FontStricat`. */
  readonly contururi: (glifa: number) => ConturFont[];
};

/** Scara din matricea fontului (Top DICT, 12 7): 1/unitsPerEm sau altă scară curată; înclinată, refuzată. */
function scaraMatrice(matrice: number[] | undefined, unitsPerEm: number): number {
  if (!matrice) return 1;
  const [a = 0, b = 0, c = 0, d = 0] = matrice;
  if (b !== 0 || c !== 0 || Math.abs(a - d) > 1e-12 || !(a > 0)) throw new FontStricat('matrice CFF înclinată');
  const scara = a * unitsPerEm;
  // Matricea e scrisă cu 8 cifre (Inter: 0.00035511 pentru 1/2816): o abatere sub o miime e scara 1, ca la fontTools.
  return Math.abs(scara - 1) < 1e-3 ? 1 : scara;
}

/** FDSelect de la `s`: glifa → indicele dicționarului ei; formatele 0 și 3, iar în CFF2 și 4 (pe 32 de biți). */
function fdSelect(o: Octeti, s: number, cff2: boolean): (g: number) => number {
  const format = o.u8(s);
  if (format === 0) return (g) => o.u8(s + 1 + g);
  if (format === 3 || (cff2 && format === 4)) {
    const lung = format === 4;
    const n = lung ? o.u32(s + 1) : o.u16(s + 1);
    const prim = s + (lung ? 5 : 3), pas = lung ? 6 : 3;
    const inceput = (k: number): number => (lung ? o.u32(prim + pas * k) : o.u16(prim + pas * k));
    return (g) => {
      // Intervalele [first, first următorului), ordonate; santinela închide ultimul.
      let st = 0, dr = n - 1;
      while (st < dr) {
        const m = (st + dr + 1) >> 1;
        if (inceput(m) <= g) st = m;
        else dr = m - 1;
      }
      if (inceput(0) > g || inceput(n) <= g) throw new FontStricat(`glifa ${g} în afara FDSelect`);
      return lung ? o.u16(prim + pas * st + 4) : o.u8(prim + pas * st + 2);
    };
  }
  throw new FontStricat(`FDSelect de formatul ${format}`);
}

/** Dicționarele FDArray (fiecare cu Private-ul lui), alese pe glifă de `alege`. */
function dictionare(o: Octeti, cff: number, fd: Index, alege: (g: number) => number, cff2: boolean): (g: number) => Privat {
  const lista: Privat[] = [];
  for (let k = 0; k < fd.n; k++) {
    const [a, b] = fd.element(k);
    lista.push(private_(o, cff, dict(o, a, b, cff2).get(18), cff2));
  }
  return (g) => {
    const k = alege(g);
    const d = lista[k];
    if (!d) throw new FontStricat(`FD ${k} din ${lista.length}`);
    return d;
  };
}

/** Ce citește interpretorul: charstring-urile, subrutinele, scara și ce cer `seac` (CFF) sau `blend` (CFF2). */
type Program = {
  readonly charstrings: Index;
  readonly globale: Subrutine;
  readonly privat: (g: number) => Privat;
  readonly scara: number;
  /** Glifa unui SID, pentru `seac` (doar CFF). */
  readonly dupaSid: ((sid: number) => number) | null;
  /** CFF2: factorii regiunilor setului de date `vsindex` (toți 0 la instanța implicită); null: CFF. */
  readonly factori: ((vsindex: number) => readonly number[]) | null;
};

/**
 * Citește tabelul CFF de la `pos` (ADR 0106 §1). `numarGlife` vine din `maxp` și trebuie să fie cât charstring-urile;
 * `unitsPerEm` din `head`, pentru matricea fontului.
 */
export function citesteCff(o: Octeti, pos: number, numarGlife: number, unitsPerEm: number): CitireCff {
  if (o.u8(pos) !== 1) throw new FontStricat(`CFF versiunea ${o.u8(pos)}`);
  const nume = index(o, pos + o.u8(pos + 2));
  const top = index(o, nume.sfarsit);
  const siruri = index(o, top.sfarsit);
  const globale = subrutine(o, siruri.sfarsit);
  if (top.n < 1) throw new FontStricat('CFF fără Top DICT');
  const [ta, tb] = top.element(0);
  const t = dict(o, ta, tb);
  if ((t.get(1206)?.[0] ?? 2) !== 2) throw new FontStricat('charstring-uri de alt tip decât 2');
  const scara = scaraMatrice(t.get(1207), unitsPerEm);
  const cs = t.get(17);
  if (!cs) throw new FontStricat('CFF fără CharStrings');
  const charstrings = index(o, pos + cs[0]!);
  if (charstrings.n !== numarGlife) throw new FontStricat(`CFF are ${charstrings.n} glife, maxp ${numarGlife}`);

  // Subrutinele locale: ale fontului, sau (CID) ale dicționarului fiecărei glife, din FDSelect.
  let privat: (g: number) => Privat;
  if (t.has(1230)) {
    const fdArray = t.get(1236), sel = t.get(1237);
    if (!fdArray || !sel) throw new FontStricat('CFF CID fără FDArray / FDSelect');
    privat = dictionare(o, pos, index(o, pos + fdArray[0]!), fdSelect(o, pos + sel[0]!, false), false);
  } else {
    const locale = private_(o, pos, t.get(18));
    privat = () => locale;
  }

  // Setul de caractere, doar pentru `seac` (SID → glifa): formatele 0, 1, 2 și ISOAdobe (SID = glifa).
  let glifaSid: Map<number, number> | null = null;
  const dupaSid = (sid: number): number => {
    if (!glifaSid) {
      glifaSid = new Map();
      const set = t.get(15)?.[0] ?? 0;
      if (set === 0) for (let g = 0; g < numarGlife; g++) glifaSid.set(g, g);
      else if (set > 2) {
        const p = pos + set, format = o.u8(p);
        let g = 1, q = p + 1;
        if (format === 0) for (; g < numarGlife; g++, q += 2) glifaSid.set(o.u16(q), g);
        else if (format === 1 || format === 2) {
          while (g < numarGlife) {
            const prim = o.u16(q), ramase = format === 1 ? o.u8(q + 2) : o.u16(q + 2);
            q += format === 1 ? 3 : 4;
            for (let k = 0; k <= ramase && g < numarGlife; k++, g++) glifaSid.set(prim + k, g);
          }
        } else throw new FontStricat(`set de caractere de formatul ${format}`);
      } else throw new FontStricat('seac cu setul de caractere Expert');
    }
    const g = glifaSid.get(sid);
    if (g === undefined) throw new FontStricat(`seac: SID-ul ${sid} nu e în font`);
    return g;
  };

  return interpreteaza(o, { charstrings, globale, privat, scara, dupaSid, factori: null }, numarGlife);
}

/**
 * Citește tabelul CFF2 de la `pos` (ADR 0113), la coordonatele normalizate `c` (null: instanța implicită): antetul (Top DICT
 * după el, apoi subrutinele globale), FDArray (FDSelect lipsă: totul în primul dicționar) și magazinul de variații.
 */
export function citesteCff2(o: Octeti, pos: number, numarGlife: number, unitsPerEm: number, c: readonly number[] | null): CitireCff {
  if (o.u8(pos) !== 2) throw new FontStricat(`CFF2 versiunea ${o.u8(pos)}`);
  const top = pos + o.u8(pos + 2), lungime = o.u16(pos + 3);
  const t = dict(o, top, top + lungime, true);
  const globale = subrutine(o, top + lungime, true);
  const scara = scaraMatrice(t.get(1207), unitsPerEm);
  const cs = t.get(17), fdArray = t.get(1236);
  if (!cs || !fdArray) throw new FontStricat('CFF2 fără CharStrings sau FDArray');
  const charstrings = index(o, pos + cs[0]!, true);
  if (charstrings.n !== numarGlife) throw new FontStricat(`CFF2 are ${charstrings.n} glife, maxp ${numarGlife}`);
  const sel = t.get(1237);
  const privat = dictionare(o, pos, index(o, pos + fdArray[0]!, true), sel ? fdSelect(o, pos + sel[0]!, true) : () => 0, true);
  // Magazinul de variații: lungimea lui (16 biți), apoi magazinul. Fără el, un `blend` n-are delte.
  const vstore = t.get(24);
  const factori = vstore ? factoriMagazin(o, pos + vstore[0]! + 2, c) : () => [];
  return interpreteaza(o, { charstrings, globale, privat, scara, dupaSid: null, factori }, numarGlife);
}

/** Interpretorul Type 2, comun lui CFF și CFF2 (ale căror deosebiri le spune programul). */
function interpreteaza(o: Octeti, program: Program, numarGlife: number): CitireCff {
  const { charstrings, globale, privat, scara, dupaSid, factori } = program;
  const contururi = (glifa: number, accent: boolean): ConturFont[] => {
    if (glifa < 0 || glifa >= numarGlife) throw new FontStricat(`glifa ${glifa} nu există`);
    const pr = privat(glifa);
    const rez: PunctFont[][] = [];
    let curent: PunctFont[] | null = null;
    let x = 0, y = 0;
    let stiva: number[] = [];
    let tulpini = 0;
    // CFF2 n-are lățime în charstring-uri.
    let latime = factori !== null;
    let vsindex = pr.vsindex;
    let operatii = 0;
    const pune = (px: number, py: number, pe: boolean): void => {
      x = px;
      y = py;
      curent!.push({ x: px * scara, y: py * scara, peCurba: pe });
    };
    const muta = (dx: number, dy: number): void => {
      x += dx;
      y += dy;
      curent = [{ x: x * scara, y: y * scara, peCurba: true }];
      rez.push(curent);
    };
    const linie = (dx: number, dy: number): void => {
      if (!curent) throw new FontStricat('linie fără moveto');
      pune(x + dx, y + dy, true);
    };
    const curba = (a: number, b: number, c: number, d: number, e: number, f: number): void => {
      if (!curent) throw new FontStricat('curbă fără moveto');
      const x1 = x + a, y1 = y + b, x2 = x1 + c, y2 = y1 + d;
      pune(x1, y1, false);
      pune(x2, y2, false);
      pune(x2 + e, y2 + f, true);
    };
    /** Lățimea, dacă stiva are un operand în plus față de cât cere operatorul (doar la primul care golește stiva). */
    const faraLatime = (par: boolean): void => {
      if (!latime && stiva.length > 0 && (stiva.length % 2 === 1) === par) stiva.shift();
      latime = true;
    };
    const tulpiniDin = (): void => {
      faraLatime(true);
      tulpini += stiva.length >> 1;
      stiva = [];
    };
    let gata = false;

    const ruleaza = (a: number, b: number, adancime: number): void => {
      if (adancime > ADANCIME_SUBRUTINE) throw new FontStricat('subrutine prea adânci');
      let p = a;
      while (p < b && !gata) {
        if (++operatii > OPERATII_GLIFA) throw new FontStricat('charstring prea lung');
        const b0 = o.u8(p);
        if (b0 >= 32 || b0 === 28) {
          if (b0 === 28) { stiva.push(o.i16(p + 1)); p += 3; }
          else if (b0 <= 246) { stiva.push(b0 - 139); p++; }
          else if (b0 <= 250) { stiva.push((b0 - 247) * 256 + o.u8(p + 1) + 108); p += 2; }
          else if (b0 <= 254) { stiva.push(-(b0 - 251) * 256 - o.u8(p + 1) - 108); p += 2; }
          else { stiva.push(o.i32(p + 1) / 65536); p += 5; }
          if (stiva.length > STIVA) throw new FontStricat('stiva charstring-ului e plină');
          continue;
        }
        p++;
        const s = stiva;
        switch (b0) {
          case 1: case 3: case 18: case 23: // hstem, vstem, hstemhm, vstemhm
            tulpiniDin();
            break;
          case 19: case 20: // hintmask, cntrmask: tulpinile subînțelese (vstem), apoi masca
            tulpiniDin();
            p += (tulpini + 7) >> 3;
            break;
          case 21: // rmoveto
            faraLatime(true);
            muta(s[0] ?? 0, s[1] ?? 0);
            stiva = [];
            break;
          case 22: // hmoveto
            faraLatime(false);
            muta(s[0] ?? 0, 0);
            stiva = [];
            break;
          case 4: // vmoveto
            faraLatime(false);
            muta(0, s[0] ?? 0);
            stiva = [];
            break;
          case 5: // rlineto
            for (let k = 0; k + 1 < s.length; k += 2) linie(s[k]!, s[k + 1]!);
            stiva = [];
            break;
          case 6: case 7: { // hlineto, vlineto: alternativ, din orizontală sau din verticală
            let orizontal = b0 === 6;
            for (const d of s) {
              linie(orizontal ? d : 0, orizontal ? 0 : d);
              orizontal = !orizontal;
            }
            stiva = [];
            break;
          }
          case 8: // rrcurveto
            for (let k = 0; k + 5 < s.length; k += 6) curba(s[k]!, s[k + 1]!, s[k + 2]!, s[k + 3]!, s[k + 4]!, s[k + 5]!);
            stiva = [];
            break;
          case 27: { // hhcurveto: dy1? {dxa dxb dyb dxc}+
            let k = 0, dy1 = 0;
            if (s.length % 2 === 1) dy1 = s[k++]!;
            for (; k + 3 < s.length; k += 4) {
              curba(s[k]!, dy1, s[k + 1]!, s[k + 2]!, s[k + 3]!, 0);
              dy1 = 0;
            }
            stiva = [];
            break;
          }
          case 26: { // vvcurveto: dx1? {dya dxb dyb dyc}+
            let k = 0, dx1 = 0;
            if (s.length % 2 === 1) dx1 = s[k++]!;
            for (; k + 3 < s.length; k += 4) {
              curba(dx1, s[k]!, s[k + 1]!, s[k + 2]!, 0, s[k + 3]!);
              dx1 = 0;
            }
            stiva = [];
            break;
          }
          case 30: case 31: { // vhcurveto, hvcurveto: alternativ; ultima poate avea un al cincilea operand
            let orizontal = b0 === 31;
            for (let k = 0; k + 3 < s.length; k += 4) {
              const ultim = s.length - k === 5 ? s[k + 4]! : 0;
              if (orizontal) curba(s[k]!, 0, s[k + 1]!, s[k + 2]!, ultim, s[k + 3]!);
              else curba(0, s[k]!, s[k + 1]!, s[k + 2]!, s[k + 3]!, ultim);
              orizontal = !orizontal;
            }
            stiva = [];
            break;
          }
          case 24: { // rcurveline: {cubice}+ apoi o linie
            let k = 0;
            for (; k + 7 < s.length; k += 6) curba(s[k]!, s[k + 1]!, s[k + 2]!, s[k + 3]!, s[k + 4]!, s[k + 5]!);
            if (k + 1 < s.length) linie(s[k]!, s[k + 1]!);
            stiva = [];
            break;
          }
          case 25: { // rlinecurve: {linii}+ apoi o cubică
            let k = 0;
            for (; k + 7 < s.length; k += 2) linie(s[k]!, s[k + 1]!);
            if (k + 5 < s.length) curba(s[k]!, s[k + 1]!, s[k + 2]!, s[k + 3]!, s[k + 4]!, s[k + 5]!);
            stiva = [];
            break;
          }
          case 10: case 29: { // callsubr, callgsubr
            const sub = b0 === 10 ? pr : globale;
            const i = (stiva.pop() ?? 0) + sub.decalaj;
            if (!sub.idx) throw new FontStricat('subrutină fără index');
            const [sa, sb] = sub.idx.element(i);
            ruleaza(sa, sb, adancime + 1);
            break;
          }
          case 11: // return
            return;
          case 14: { // endchar, poate cu accentul compus (seac)
            if (!latime && (s.length === 1 || s.length === 5)) stiva.shift();
            latime = true;
            const r = stiva;
            curent = null;
            if (r.length >= 4) {
              if (accent || !dupaSid) throw new FontStricat('seac în accentul unui seac sau în CFF2');
              const [adx, ady, baza, acc] = r as [number, number, number, number];
              for (const c of contururi(dupaSid(sidStandard(baza)), true)) rez.push([...c]);
              for (const c of contururi(dupaSid(sidStandard(acc)), true)) rez.push(c.map((q) => ({ x: q.x + adx * scara, y: q.y + ady * scara, peCurba: q.peCurba })));
            }
            stiva = [];
            gata = true;
            return;
          }
          case 15: // vsindex (CFF2): setul de date al magazinului pentru `blend`-urile următoare
            if (!factori) throw new FontStricat(`operator charstring rezervat ${b0}`);
            vsindex = stiva.pop() ?? 0;
            stiva = [];
            break;
          case 16: { // blend (CFF2): n valori, apoi câte k delte ale fiecăreia (k regiuni ale setului vsindex), apoi n
            if (!factori) throw new FontStricat(`operator charstring rezervat ${b0}`);
            const f = factori(vsindex);
            const n = stiva.pop() ?? 0, k = f.length;
            const inceput = stiva.length - n * (k + 1);
            if (!Number.isInteger(n) || n < 0 || inceput < 0) throw new FontStricat(`blend cu ${n} valori și ${stiva.length} operanzi`);
            for (let i = 0; i < n; i++) {
              let d = 0;
              for (let j = 0; j < k; j++) if (f[j] !== 0) d += stiva[inceput + n + i * k + j]! * f[j]!;
              stiva[inceput + i] = stiva[inceput + i]! + d;
            }
            stiva.length = inceput + n;
            break;
          }
          case 12: {
            const op = o.u8(p++);
            ruleazaEscape(op);
            break;
          }
          default:
            throw new FontStricat(`operator charstring rezervat ${b0}`);
        }
      }
    };

    // Flex-urile, cu deplasările lui fontTools (aceleași adunări, deci aceleași coordonate până la ultimul bit).
    const ruleazaEscape = (op: number): void => {
      const s = stiva;
      const d = (k: number): number => {
        const v = s[k];
        if (v === undefined) throw new FontStricat(`flex cu ${s.length} operanzi`);
        return v;
      };
      switch (op) {
        case 35: // flex: două cubice + adâncimea (ignorată)
          curba(d(0), d(1), d(2), d(3), d(4), d(5));
          curba(d(6), d(7), d(8), d(9), d(10), d(11));
          break;
        case 34: // hflex: dx1 dx2 dy2 dx3 dx4 dx5 dx6
          curba(d(0), 0, d(1), d(2), d(3), 0);
          curba(d(4), 0, d(5), -d(2), d(6), 0);
          break;
        case 36: // hflex1: dx1 dy1 dx2 dy2 dx3 dx4 dx5 dy5 dx6
          curba(d(0), d(1), d(2), d(3), d(4), 0);
          curba(d(5), 0, d(6), d(7), d(8), -(d(1) + d(3) + 0 + 0 + d(7)));
          break;
        case 37: { // flex1: cinci perechi + d6, pe axa cu deplasarea mai mare
          const dx = d(0) + d(2) + d(4) + d(6) + d(8), dy = d(1) + d(3) + d(5) + d(7) + d(9);
          curba(d(0), d(1), d(2), d(3), d(4), d(5));
          if (Math.abs(dx) > Math.abs(dy)) curba(d(6), d(7), d(8), d(9), d(10), -dy);
          else curba(d(6), d(7), d(8), d(9), -dx, d(10));
          break;
        }
        case 0: // dotsection (vechi), ignorat ca la fontTools
          break;
        default:
          // Aritmetica și memoria (scoase din spec., neimplementate nici de fontTools), random și cele rezervate.
          throw new FontStricat(`operator charstring 12 ${op}`);
      }
      stiva = [];
    };

    const [a, b] = charstrings.element(glifa);
    ruleaza(a, b, 0);
    return rez;
  };

  return { contururi: (g) => contururi(g, false) };
}
