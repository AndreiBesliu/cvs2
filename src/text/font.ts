/**
 * Cititorul de fonturi TrueType (ADR 0105 §1), propriu: opentype.js (ales de sonda s2) are ~170 kB și aduce și scrierea
 * fonturilor și modelarea completă, de care textul n-are nevoie, iar totalul aplicației mai are ~50 kB. Citește doar ce
 * cere așezarea literelor: `head`, `maxp`, `hhea`, `hmtx`, `cmap` (formatul 4, platforma Windows Unicode sau Unicode),
 * `loca` (scurt și lung), `glyf` (glifele simple și compuse, cu transformarea și locul fiecărei componente, ca fontTools),
 * `OS/2` (înălțimea majusculei) și, din `GPOS`, crenarea: perechile caracteristicii `kern` (formatele 1 și 2). Literele se
 * pun una după alta, fără `GSUB` (ADR 0019: „GSUB are rezervă literă cu literă”).
 *
 * Înălțimea majusculei (ADR 0019): `OS/2.sCapHeight`, verificată pe conturul literei H (vârful lui); fără ea, vârful lui H.
 * Un font în care cele două nu se potrivesc e refuzat (`majuscula`): „20 mm” n-ar mai ieși 20 mm.
 *
 * Coordonatele rămân în unitățile fontului, cu Y în sus; așezarea (`asezare.ts`) le duce în mm. Un font CFF (OpenType cu
 * contururi PostScript, `.otf`) e refuzat deocamdată (`cff`): vine cu fonturile omului.
 */

/** Un punct al unui contur TrueType, în unitățile fontului: pe curbă, sau punct de control al unei pătratice. */
export type PunctFont = { readonly x: number; readonly y: number; readonly peCurba: boolean };
/** Un contur TrueType: punctele lui, închis prin definiție (ultimul se leagă de primul). */
export type ConturFont = readonly PunctFont[];

export type CodRefuzFont = 'nu-e-font' | 'cff' | 'tabel-lipsa' | 'stricat' | 'majuscula' | 'fara-unicode';

export type Font = {
  readonly familie: string;
  readonly unitsPerEm: number;
  /** Înălțimea majusculei, în unitățile fontului, verificată pe H. */
  readonly majuscula: number;
  /** Din `hhea`: urcarea, coborârea (negativă) și spațiul dintre rânduri. */
  readonly urcare: number;
  readonly coborare: number;
  readonly spatiuRanduri: number;
  readonly numarGlife: number;
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

/** O greșeală a fișierului (un offset în afara lui, o structură ruptă): fontul e refuzat, nu aruncă mai departe. */
class FontStricat extends Error {}

/** Imbricarea glifelor compuse: mai adânc (sau o glifă care se conține pe sine), refuzat. */
const ADANCIME_COMPUSE = 16;
/** Câte unități pot despărți `sCapHeight` de vârful lui H (rotunjirea unui font bine făcut, ca în sonda s2). */
const ABATERE_MAJUSCULA = 2;

/** Citirea octeților în ordinea big-endian a fonturilor, cu marginile verificate (exportată pentru probe). */
export class Octeti {
  readonly v: DataView;
  readonly lungime: number;

  constructor(b: Uint8Array) {
    this.v = new DataView(b.buffer, b.byteOffset, b.byteLength);
    this.lungime = b.byteLength;
  }

  private verifica(p: number, n: number): void {
    if (p < 0 || p + n > this.lungime || !Number.isInteger(p)) throw new FontStricat(`citire în afara fișierului (${p})`);
  }

  u8(p: number): number { this.verifica(p, 1); return this.v.getUint8(p); }
  i8(p: number): number { this.verifica(p, 1); return this.v.getInt8(p); }
  u16(p: number): number { this.verifica(p, 2); return this.v.getUint16(p); }
  i16(p: number): number { this.verifica(p, 2); return this.v.getInt16(p); }
  u32(p: number): number { this.verifica(p, 4); return this.v.getUint32(p); }
  /** F2Dot14: un număr cu semn, 2 biți întregi și 14 fracționari (transformarea componentelor). */
  f2dot14(p: number): number { return this.i16(p) / 16384; }
  tag(p: number): string { this.verifica(p, 4); return String.fromCharCode(this.u8(p), this.u8(p + 1), this.u8(p + 2), this.u8(p + 3)); }
}

type Tabele = ReadonlyMap<string, { readonly pos: number; readonly lungime: number }>;

/** Directorul tabelelor: eticheta, poziția și lungimea fiecăruia (verificate față de fișier). */
function tabele(o: Octeti): Tabele {
  const n = o.u16(4);
  const t = new Map<string, { pos: number; lungime: number }>();
  for (let k = 0; k < n; k++) {
    const r = 12 + 16 * k;
    const pos = o.u32(r + 8), lungime = o.u32(r + 12);
    if (pos + lungime > o.lungime) throw new FontStricat(`tabelul ${o.tag(r)} iese din fișier`);
    t.set(o.tag(r), { pos, lungime });
  }
  return t;
}

/** Numele familiei, din tabelul `name` (ID 1, Windows Unicode, apoi Macintosh Roman); lipsă: „Font”. */
function familie(o: Octeti, t: Tabele): string {
  const nume = t.get('name');
  if (!nume) return 'Font';
  const n = o.u16(nume.pos + 2), sir = nume.pos + o.u16(nume.pos + 4);
  let mac: string | null = null;
  for (let k = 0; k < n; k++) {
    const r = nume.pos + 6 + 12 * k;
    const platforma = o.u16(r), cod = o.u16(r + 2), id = o.u16(r + 6), lungime = o.u16(r + 8), pos = sir + o.u16(r + 10);
    if (id !== 1) continue;
    if (platforma === 3 && (cod === 1 || cod === 10)) {
      let s = '';
      for (let i = 0; i + 1 < lungime; i += 2) s += String.fromCharCode(o.u16(pos + i));
      return s;
    }
    if (platforma === 1 && cod === 0 && mac === null) {
      mac = '';
      for (let i = 0; i < lungime; i++) mac += String.fromCharCode(o.u8(pos + i));
    }
  }
  return mac ?? 'Font';
}

/** `cmap` formatul 4 (segmentele BMP), din subtabelul Windows Unicode (3, 1) sau Unicode (0, 3); null dacă lipsește. */
function cmap(o: Octeti, t: Tabele): ((cod: number) => number) | null {
  const c = t.get('cmap');
  if (!c) return null;
  const n = o.u16(c.pos + 2);
  let sub = -1;
  for (let k = 0; k < n; k++) {
    const r = c.pos + 4 + 8 * k;
    const platforma = o.u16(r), cod = o.u16(r + 2), pos = c.pos + o.u32(r + 4);
    if (o.u16(pos) !== 4) continue;
    if ((platforma === 3 && cod === 1) || (platforma === 0 && cod === 3 && sub < 0)) sub = pos;
  }
  if (sub < 0) return null;
  const segmente = o.u16(sub + 6) / 2;
  const sfarsit = sub + 14, inceput = sfarsit + 2 * segmente + 2, delta = inceput + 2 * segmente, deplasare = delta + 2 * segmente;
  return (cod) => {
    if (cod > 0xffff) return 0;
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
  };
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

/** XAdvance dintr-o înregistrare de valori (bitul 0x0004), dacă există; altfel 0. */
function avansDinValoare(o: Octeti, pos: number, format: number): number {
  if (!(format & 0x0004)) return 0;
  return o.i16(pos + 2 * (format & 0x0001) + 2 * ((format & 0x0002) >> 1));
}

/**
 * Crenarea din `GPOS` (ADR 0105 §1): căutările (tipul 2, perechile) ale caracteristicii `kern`, în ordinea lor; în fiecare
 * căutare, primul subtabel care potrivește perechea o hotărăște. Formatul 1: perechi anume (glifa a doua căutată binar);
 * formatul 2: clasele celor două glife. Valoarea e XAdvance al primei glife.
 */
function crenareGpos(o: Octeti, t: Tabele): ((a: number, b: number) => number) | null {
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
    if (o.u16(c) !== 2) continue;
    const n = o.u16(c + 4);
    const lista: number[] = [];
    for (let s = 0; s < n; s++) lista.push(c + o.u16(c + 6 + 2 * s));
    subtabele.push(lista);
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
        if (g2 === b) return avansDinValoare(o, r + 2, f1);
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
      return avansDinValoare(o, st + 16 + pas * (c1 * n2 + c2), f1);
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

/** Steagurile componentelor unei glife compuse (spec. OpenType, `glyf`). */
const CUVINTE = 0x0001, XY = 0x0002, SCARA = 0x0008, MAI_MULTE = 0x0020, SCARA_XY = 0x0040, DOI_PE_DOI = 0x0080;
const DEPLASARE_SCALATA = 0x0800;

/**
 * Citește un font TrueType (ADR 0105 §1). Nu aruncă: un fișier greșit e un refuz cu cod. Glifele se citesc la cerere, cu
 * memorie (o glifă compusă își refolosește componentele).
 */
export function citesteFont(octeti: Uint8Array): RezultatFont {
  try {
    return citeste(new Octeti(octeti));
  } catch (e) {
    if (e instanceof FontStricat) return { ok: false, cod: 'stricat', detaliu: e.message };
    throw e;
  }
}

function citeste(o: Octeti): RezultatFont {
  if (o.lungime < 12) return { ok: false, cod: 'nu-e-font' };
  const versiune = o.u32(0);
  if (versiune === 0x4f54544f) return { ok: false, cod: 'cff' };
  if (versiune !== 0x00010000 && versiune !== 0x74727565) return { ok: false, cod: 'nu-e-font' };
  const t = tabele(o);
  for (const nume of ['head', 'maxp', 'hhea', 'hmtx', 'loca', 'glyf']) {
    if (!t.has(nume)) return t.has('CFF ') || t.has('CFF2') ? { ok: false, cod: 'cff' } : { ok: false, cod: 'tabel-lipsa', detaliu: nume };
  }
  const head = t.get('head')!.pos, maxp = t.get('maxp')!.pos, hhea = t.get('hhea')!.pos, hmtx = t.get('hmtx')!.pos;
  const loca = t.get('loca')!, glyf = t.get('glyf')!;
  const unitsPerEm = o.u16(head + 18);
  if (unitsPerEm < 16 || unitsPerEm > 16384) throw new FontStricat(`unitsPerEm ${unitsPerEm}`);
  const locaLunga = o.i16(head + 50) === 1;
  const numarGlife = o.u16(maxp + 4);
  const metrici = o.u16(hhea + 34);
  if (metrici === 0 || metrici > numarGlife) throw new FontStricat(`numberOfHMetrics ${metrici}`);
  // Avansurile și locurile glifelor se citesc la cerere: lungimile tabelelor se verifică aici, o dată.
  if (t.get('hmtx')!.lungime < 4 * metrici) throw new FontStricat('hmtx e prea scurt');
  if (loca.lungime < (numarGlife + 1) * (locaLunga ? 4 : 2)) throw new FontStricat('loca e prea scurt');
  const glifaCod = cmap(o, t);
  if (!glifaCod) return { ok: false, cod: 'fara-unicode' };

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
    const r = a === b ? [] : o.i16(a) >= 0 ? simpla(a) : compusa(a, [...drum, g]);
    memorie.set(g, r);
    return r;
  };

  /** O glifă simplă: capetele contururilor, instrucțiunile (sărite), steagurile (cu repetare), apoi X și Y, ca diferențe. */
  const simpla = (a: number): ConturFont[] => {
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

  /**
   * O glifă compusă: fiecare componentă, cu transformarea ei (scara, scara pe X și Y, sau 2 × 2) și locul ei: deplasarea
   * (aplicată după transformare, ca în fontTools și la Microsoft; înainte, cu steagul SCALED_COMPONENT_OFFSET), sau un punct
   * al componentei pus peste un punct al celor de dinainte.
   */
  const compusa = (a: number, drum: readonly number[]): ConturFont[] => {
    const rez: ConturFont[] = [];
    let p = a + 10;
    for (;;) {
      const steag = o.u16(p), g = o.u16(p + 2);
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
      let m = { a: 1, b: 0, c: 0, d: 1 };
      let transformat = false;
      if (steag & SCARA) {
        const s = o.f2dot14(p);
        m = { a: s, b: 0, c: 0, d: s };
        p += 2;
        transformat = true;
      } else if (steag & SCARA_XY) {
        m = { a: o.f2dot14(p), b: 0, c: 0, d: o.f2dot14(p + 2) };
        p += 4;
        transformat = true;
      } else if (steag & DOI_PE_DOI) {
        m = { a: o.f2dot14(p), b: o.f2dot14(p + 2), c: o.f2dot14(p + 4), d: o.f2dot14(p + 6) };
        p += 8;
        transformat = true;
      }
      const aplica = (q: PunctFont, dx: number, dy: number): PunctFont => ({ x: m.a * q.x + m.c * q.y + dx, y: m.b * q.x + m.d * q.y + dy, peCurba: q.peCurba });
      const comp = contururi(g, drum);
      let dx = 0, dy = 0;
      if (steag & XY) {
        if (transformat && steag & DEPLASARE_SCALATA) {
          dx = m.a * arg1 + m.c * arg2;
          dy = m.b * arg1 + m.d * arg2;
        } else {
          dx = arg1;
          dy = arg2;
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
      if (!(steag & MAI_MULTE)) break;
    }
    return rez;
  };

  const avans = (g: number): number => {
    if (g < 0 || g >= numarGlife) return 0;
    return o.u16(hmtx + 4 * Math.min(g, metrici - 1));
  };

  // Înălțimea majusculei (ADR 0019): OS/2 (de la versiunea 2), verificată pe vârful conturului lui H.
  const gH = glifaCod(0x48);
  const varfH = gH === 0 ? null : contururi(gH, []).flat().reduce((m, q) => Math.max(m, q.y), -Infinity);
  const os2 = t.get('OS/2');
  const capOs2 = os2 && o.u16(os2.pos) >= 2 && os2.lungime >= 90 ? o.i16(os2.pos + 88) : 0;
  let majuscula: number;
  if (varfH === null || !Number.isFinite(varfH) || varfH <= 0) {
    if (capOs2 <= 0) return { ok: false, cod: 'majuscula', detaliu: 'fără H și fără sCapHeight' };
    majuscula = capOs2;
  } else if (capOs2 > 0) {
    if (Math.abs(capOs2 - varfH) > ABATERE_MAJUSCULA) return { ok: false, cod: 'majuscula', detaliu: `sCapHeight ${capOs2}, H ${varfH}` };
    majuscula = capOs2;
  } else {
    majuscula = varfH;
  }

  const crenare = crenareGpos(o, t);
  const font: Font = {
    familie: familie(o, t),
    unitsPerEm,
    majuscula,
    urcare: o.i16(hhea + 4),
    coborare: o.i16(hhea + 6),
    spatiuRanduri: o.i16(hhea + 8),
    numarGlife,
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
        return contururi(g, []);
      } catch (e) {
        if (e instanceof FontStricat) return null;
        throw e;
      }
    },
  };
  return { ok: true, font };
}
