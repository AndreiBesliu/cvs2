/**
 * Ușa WMF (ADR 0117): octeții unui metafișier Windows pe 16 biți, cu antetul placeable (Aldus) sau fără → căile, închise
 * sau deschise, în mm, cu Y în sus, plus raportul. Cu antetul, căile sunt față de colțul stânga-jos al cadrului lui (desenul
 * stă pe foaie unde e în cadru, ca la PDF); fără el, unitatea vine din dialog, iar desenul n-are cadru.
 *
 * Cititorul e scris din specificația publică [MS-WMF] și redă fișierul ca GDI-ul, cu un player care pune fereastra și
 * vizorul pe cadru (§5): înregistrările de desen (polilinia, poligonul, PolyPolygon, dreptunghiul și cel rotunjit, elipsa,
 * arcul, chord-ul, pie-ul, MoveTo / LineTo), transformarea (fereastra, vizorul, modurile de mapare, SaveDC / RestoreDC),
 * regula de umplere și tabelul obiectelor (penița și pensula nule). Textul, imaginile, operațiile raster, regiunile și
 * decupajele se sar, numărate; un EMF e refuzat cu motivul lui.
 */
import { LINIE, type Punct, type Segment, type Varf } from '../geom/contur.ts';
import { arcEliptic, bucatiArcEliptic } from '../geom/elipsa.ts';
import { TOLERANTA_IMPORT } from '../geom/toleranta.ts';
import { PLAFON } from '../model/document.ts';
import { incheieSubcalea, normalizeazaForma, preaDeparte, type CaleCitita } from './caleImport.ts';
import { PLAFON_IMPORT } from './svgCoduri.ts';
import {
  CODURI_AVERTISMENT_WMF, MM_PE_UNITATE_WMF, type AvertismenteWmf, type CodAvertismentWmf, type CodRefuzWmf, type UnitateWmf,
  type UnitatiWmf,
} from './wmfCoduri.ts';

export {
  CODURI_AVERTISMENT_WMF, MM_PE_UNITATE_WMF, UNITATI_WMF, type AvertismenteWmf, type CodAvertismentWmf, type CodRefuzWmf, type UnitateWmf,
  type UnitatiWmf,
} from './wmfCoduri.ts';

/** O cale a desenului, în mm. O cale deschisă are vârfurile plus punctul final (n vârfuri, n − 1 segmente). */
export type CaleWmf = { readonly varfuri: readonly Varf[]; readonly inchis: boolean };

export type RezultatWmf =
  | {
    readonly ok: true;
    readonly cai: readonly CaleWmf[];
    /** Cadrul antetului placeable, în mm (căile sunt față de colțul lui stânga-jos), sau null fără antet. */
    readonly cadru: { readonly latime: number; readonly inaltime: number } | null;
    readonly unitati: UnitatiWmf;
    readonly avertismente: AvertismenteWmf;
  }
  | {
    readonly ok: false;
    readonly cod: CodRefuzWmf | 'octeti' | 'gol' | 'departe' | 'plafon';
    readonly detaliu?: string;
    readonly avertismente?: AvertismenteWmf;
  };

type Numaratoare = Record<CodAvertismentWmf, number>;

const CHEIE_PLACEABLE = 0x9ac6cdd7;
/** „ EMF” la octetul 40 al unui `EMR_HEADER` (tipul 1). */
const SEMNATURA_EMF = 0x464d4520;
/** Stările salvate cu `SaveDC`: peste atât, fișierul e greșit (o stivă care doar crește). */
const SALVARI_MAXIME = 10_000;
/** Locurile tabelului de obiecte: indicele din `SelectObject` e pe 16 biți. */
const OBIECTE_MAXIME = 0x10000;

/* ── Înregistrările ([MS-WMF] 2.1.1.1) ───────────────────────────────────────────────────────────────────────────────── */

const EOF = 0x0000, SAVEDC = 0x001e, RESTOREDC = 0x0127, SETMAPMODE = 0x0103, SETPOLYFILLMODE = 0x0106;
const SETWINDOWORG = 0x020b, SETWINDOWEXT = 0x020c, SETVIEWPORTORG = 0x020d, SETVIEWPORTEXT = 0x020e;
const OFFSETWINDOWORG = 0x020f, OFFSETVIEWPORTORG = 0x0211, SCALEWINDOWEXT = 0x0410, SCALEVIEWPORTEXT = 0x0412;
const MOVETO = 0x0214, LINETO = 0x0213, POLYLINE = 0x0325, POLYGON = 0x0324, POLYPOLYGON = 0x0538;
const RECTANGLE = 0x041b, ROUNDRECT = 0x061c, ELLIPSE = 0x0418, ARC = 0x0817, CHORD = 0x0830, PIE = 0x081a;
const CREATEPENINDIRECT = 0x02fa, CREATEBRUSHINDIRECT = 0x02fc, CREATEREGION = 0x06ff, SELECTOBJECT = 0x012d, DELETEOBJECT = 0x01f0;

/** Fonturile și paletele: iau un loc în tabelul de obiecte, fără să conteze pentru căi. */
const OBIECTE_ALTE = new Set([0x02fb, 0x00f7]);
/** Pensulele cu model (`DIBCreatePatternBrush`, `CreatePatternBrush`): umplu. */
const PENSULE_MODEL = new Set([0x0142, 0x01f9]);
const TEXT = new Set([0x0521, 0x0a32]);
/** Imaginile și operațiile raster: `BitBlt`, `StretchBlt`, `DIBBitBlt`, `DIBStretchBlt`, `StretchDIB`, `SetDIBToDev`, `PatBlt`. */
const RASTER = new Set([0x0922, 0x0b23, 0x0940, 0x0b41, 0x0f43, 0x0d33, 0x061d]);
/** Regiunile pictate (`FillRegion`, `FrameRegion`, `PaintRegion`, `InvertRegion`), `FloodFill`, `ExtFloodFill`, `SetPixel`. */
const ALTE_DESENE = new Set([0x0228, 0x0429, 0x012b, 0x012a, 0x0419, 0x0548, 0x041f]);
/** `IntersectClipRect`, `ExcludeClipRect`, `SelectClipRegion`: decupajele, neaplicate (ca la PDF). */
const DECUPAJE = new Set([0x0416, 0x0415, 0x012c]);
/**
 * Starea care nu schimbă căile: modul fundalului, ROP-ul, `SetRelAbs`, întinderea bitmapurilor, textul (spațierea, alinierea,
 * culoarea, justificarea), culoarea fundalului, fonturile (`SetMapperFlags`), paletele, escape-urile, `SetLayout`,
 * `OffsetClipRgn`.
 */
const FARA_EFECT = new Set([
  0x0102, 0x0104, 0x0105, 0x0107, 0x0108, 0x012e, 0x0201, 0x0209, 0x020a, 0x0231, 0x0035, 0x0037, 0x0139, 0x0436, 0x0234,
  0x0626, 0x0149, 0x0220,
]);
/** Înregistrările care desenează: înaintea primeia se caută fereastra unui fișier fără antet (§5). */
const DESENE = new Set([MOVETO, LINETO, POLYLINE, POLYGON, POLYPOLYGON, RECTANGLE, ROUNDRECT, ELLIPSE, ARC, CHORD, PIE, ...TEXT, ...RASTER, ...ALTE_DESENE]);

/** Modurile de mapare ([MS-WMF] 2.1.1.16). */
const MM_TEXT = 1, MM_LOMETRIC = 2, MM_ISOTROPIC = 7, MM_ANISOTROPIC = 8;
/** mm pe unitatea logică a modurilor metrice, cu Y în sus: LOMETRIC, HIMETRIC, LOENGLISH, HIENGLISH, TWIPS. */
const METRIC: Readonly<Record<number, number>> = { 2: 0.1, 3: 0.01, 4: 0.254, 5: 0.0254, 6: 25.4 / 1440 };

/* ── Starea GDI ────────────────────────────────────────────────────────────────────────────────────────────────────── */

type Pereche = { readonly x: number; readonly y: number };
/** Maparea: modul, originea și extinderea ferestrei (logice) și ale vizorului (în unitățile dispozitivului). */
type Mapare = { readonly mod: number; readonly wo: Pereche; readonly we: Pereche; readonly vo: Pereche; readonly ve: Pereche };
/** Starea unui DC, salvată întreagă de `SaveDC` (nimic din ea nu se schimbă pe loc: se înlocuiește). */
type Stare = {
  readonly m: Mapare;
  /** Penița desenează (nu e `PS_NULL`) și pensula umple (nu e `BS_NULL`). */
  readonly penita: boolean;
  readonly pensula: boolean;
  /** `WINDING` (nonzero); altfel `ALTERNATE` (par-impar). */
  readonly winding: boolean;
  /** Poziția curentă, logică. */
  readonly cur: Pereche;
};
type Obiect = { readonly fel: 'penita'; readonly vede: boolean } | { readonly fel: 'pensula'; readonly vede: boolean } | { readonly fel: 'regiune' | 'altul' };

/** Un fișier greșit: refuzat cu octetul înregistrării. */
class EroareWmf extends Error {
  readonly octet: number;

  constructor(octet: number) {
    super(`WMF greșit la octetul ${octet}`);
    this.octet = octet;
  }
}

class PestePlafon extends Error {}

/** Locurile libere ale tabelului de obiecte, cel mai mic întâi: un obiect nou ia locul cel mai mic liber, ca la GDI. */
class Liber {
  private readonly h: number[] = [];

  pune(k: number): void {
    const h = this.h;
    h.push(k);
    for (let i = h.length - 1; i > 0;) {
      const t = (i - 1) >> 1;
      if ((h[t] as number) <= k) break;
      h[i] = h[t] as number;
      h[t] = k;
      i = t;
    }
  }

  scoate(): number | undefined {
    const h = this.h;
    const varf = h[0];
    const ultim = h.pop();
    if (h.length === 0 || ultim === undefined) return varf;
    h[0] = ultim;
    for (let i = 0; ;) {
      const s = 2 * i + 1, d = s + 1;
      let m = i;
      if (s < h.length && (h[s] as number) < (h[m] as number)) m = s;
      if (d < h.length && (h[d] as number) < (h[m] as number)) m = d;
      if (m === i) break;
      h[i] = h[m] as number;
      h[m] = ultim;
      i = m;
    }
    return varf;
  }
}

/** Parametrii unei înregistrări, cuvinte pe 16 biți (cu semn: `i`; fără: `u`); unul lipsă e o înregistrare ruptă. */
class Param {
  private readonly dv: DataView;
  private readonly o: number;
  readonly n: number;
  readonly poz: number;

  constructor(dv: DataView, o: number, n: number, poz: number) {
    this.dv = dv;
    this.o = o;
    this.n = n;
    this.poz = poz;
  }

  i(k: number): number {
    if (k >= this.n) throw new EroareWmf(this.poz);
    return this.dv.getInt16(this.o + 2 * k, true);
  }

  u(k: number): number {
    if (k >= this.n) throw new EroareWmf(this.poz);
    return this.dv.getUint16(this.o + 2 * k, true);
  }
}

/** O subcale în lucru, în mm: startul, punctul curent și segmentele, fiecare din vârful lui. */
type Subcale = { readonly start: Punct; cur: Punct; readonly varfuri: Varf[] };

/** Elipsa înscrisă într-un dreptunghi, în mm (colțurile ordonate). */
type Elipsa = { readonly c: Punct; readonly rx: number; readonly ry: number; readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number };

class Redare {
  readonly forme: Array<{ readonly cai: CaleCitita[]; readonly nonzero: boolean }> = [];
  /** S-a desenat ceva într-un mod care nu e metric, deci mărimea depinde de unitatea dispozitivului. */
  nemetric = false;
  /** mm pe unitatea logică a primului mod metric în care s-a desenat. */
  metric: number | null = null;
  private s: Stare;
  private readonly salvate: Stare[] = [];
  private readonly obiecte: Array<Obiect | null> = [];
  private readonly libere = new Liber();
  /** Lanțul de `LineTo` din poziția curentă (o cale deschisă), până la alt desen. */
  private lant: Subcale | null = null;
  private varfuri = 0;
  private readonly n: Numaratoare;
  /** mm pe unitatea dispozitivului. */
  private readonly p: number;
  /** Înălțimea cadrului în unități ale dispozitivului: Y se întoarce față de marginea lui de jos (0 fără cadru). */
  private readonly inaltime: number;
  /** Mărimea dispozitivului, pentru extinderile modurilor fixe. */
  private readonly dispozitiv: Pereche;

  constructor(n: Numaratoare, p: number, inaltime: number, m: Mapare, dispozitiv: Pereche) {
    this.n = n;
    this.p = p;
    this.inaltime = inaltime;
    this.dispozitiv = dispozitiv;
    this.s = { m, penita: true, pensula: true, winding: false, cur: { x: 0, y: 0 } };
  }

  ruleaza(dv: DataView, inceput: number): void {
    let p = inceput;
    while (p + 6 <= dv.byteLength) {
      const marime = dv.getUint32(p, true);
      const fn = dv.getUint16(p + 4, true);
      if (marime < 3 || p + 2 * marime > dv.byteLength) throw new EroareWmf(p);
      if (fn === EOF) break;
      this.inregistrare(fn, new Param(dv, p + 6, marime - 3, p));
      p += 2 * marime;
    }
    this.incheieLantul();
  }

  /* ── Transformarea ── */

  /** Punctul logic pe dispozitiv (D = (L − WO) · VE / WE + VO), apoi în mm, cu Y întors. */
  private pt(x: number, y: number): Punct {
    const m = this.s.m;
    const dx = ((x - m.wo.x) * m.ve.x) / m.we.x + m.vo.x;
    const dy = ((y - m.wo.y) * m.ve.y) / m.we.y + m.vo.y;
    return { x: dx * this.p, y: (this.inaltime - dy) * this.p };
  }

  private mapare(m: Mapare): void {
    this.s = { ...this.s, m };
  }

  /** `SetMapMode`: modurile fixe își pun extinderile (pe mărimea dispozitivului); `ISOTROPIC` pornește din `LOMETRIC`. */
  private mod(v: number): void {
    const m = this.s.m;
    if (v < MM_TEXT || v > MM_ANISOTROPIC || (v === m.mod && (v === MM_ISOTROPIC || v === MM_ANISOTROPIC))) return;
    if (v === MM_ANISOTROPIC) return this.mapare({ ...m, mod: v });
    if (v === MM_TEXT) return this.mapare({ ...m, mod: v, we: { x: 1, y: 1 }, ve: { x: 1, y: 1 } });
    const q = METRIC[v === MM_ISOTROPIC ? MM_LOMETRIC : v] as number;
    const d = this.dispozitiv;
    this.mapare({ ...m, mod: v, we: { x: (d.x * this.p) / q, y: (d.y * this.p) / q }, ve: { x: d.x, y: -d.y } });
  }

  /** `SetWindowExt` / `SetViewportExt`: doar în `ISOTROPIC` și `ANISOTROPIC`; extinderile nule se ignoră. */
  private extinde(fereastra: boolean, x: number, y: number): void {
    const m = this.s.m;
    if ((m.mod !== MM_ISOTROPIC && m.mod !== MM_ANISOTROPIC) || x === 0 || y === 0) return;
    this.mapare(izotrop(fereastra ? { ...m, we: { x, y } } : { ...m, ve: { x, y } }));
  }

  /** `ScaleWindowExt` / `ScaleViewportExt`: extinderea · num / den, trunchiată ca la GDI (0 devine 1). */
  private scaleaza(fereastra: boolean, a: Param): void {
    const yDen = a.i(0), yNum = a.i(1), xDen = a.i(2), xNum = a.i(3);
    const m = this.s.m;
    if ((m.mod !== MM_ISOTROPIC && m.mod !== MM_ANISOTROPIC) || !yDen || !yNum || !xDen || !xNum) return;
    const e = fereastra ? m.we : m.ve;
    const nou = { x: Math.trunc((e.x * xNum) / xDen) || 1, y: Math.trunc((e.y * yNum) / yDen) || 1 };
    this.mapare(izotrop(fereastra ? { ...m, we: nou } : { ...m, ve: nou }));
  }

  /** mm pe unitatea logică, pe fiecare axă (fără semn): scara colțurilor unui dreptunghi rotunjit. */
  private scara(): Pereche {
    const m = this.s.m;
    return { x: Math.abs(m.ve.x / m.we.x) * this.p, y: Math.abs(m.ve.y / m.we.y) * this.p };
  }

  /* ── Înregistrările ── */

  private inregistrare(fn: number, a: Param): void {
    switch (fn) {
      case SAVEDC:
        if (this.salvate.length >= SALVARI_MAXIME) throw new EroareWmf(a.poz);
        this.salvate.push(this.s);
        return;
      case RESTOREDC: {
        // Negativ: a câta stare de la vârf (−1, ultima); pozitiv: starea cu acel număr (de la 1). Una care nu există: nimic.
        const k = a.i(0);
        const pastrate = k < 0 ? this.salvate.length + k : k - 1;
        if (k === 0 || pastrate < 0 || pastrate >= this.salvate.length) return;
        this.s = this.salvate[pastrate] as Stare;
        this.salvate.length = pastrate;
        return;
      }
      case SETMAPMODE: return this.mod(a.i(0));
      case SETPOLYFILLMODE: {
        const v = a.u(0);
        if (v === 1 || v === 2) this.s = { ...this.s, winding: v === 2 };
        return;
      }
      case SETWINDOWORG: return this.mapare({ ...this.s.m, wo: { x: a.i(1), y: a.i(0) } });
      case SETVIEWPORTORG: return this.mapare({ ...this.s.m, vo: { x: a.i(1), y: a.i(0) } });
      case OFFSETWINDOWORG: {
        const m = this.s.m;
        return this.mapare({ ...m, wo: { x: m.wo.x + a.i(1), y: m.wo.y + a.i(0) } });
      }
      case OFFSETVIEWPORTORG: {
        const m = this.s.m;
        return this.mapare({ ...m, vo: { x: m.vo.x + a.i(1), y: m.vo.y + a.i(0) } });
      }
      case SETWINDOWEXT: return this.extinde(true, a.i(1), a.i(0));
      case SETVIEWPORTEXT: return this.extinde(false, a.i(1), a.i(0));
      case SCALEWINDOWEXT: return this.scaleaza(true, a);
      case SCALEVIEWPORTEXT: return this.scaleaza(false, a);
      case MOVETO:
        this.incheieLantul();
        this.s = { ...this.s, cur: { x: a.i(1), y: a.i(0) } };
        return;
      case LINETO: return this.linieLa(a.i(1), a.i(0));
      case POLYLINE: case POLYGON: return this.poligon(fn === POLYGON, a);
      case POLYPOLYGON: return this.poligoane(a);
      case RECTANGLE: return this.dreptunghi(a, 0);
      case ROUNDRECT: return this.dreptunghi(a, 2);
      case ELLIPSE: return this.elipsaIntreaga(a);
      case ARC: case CHORD: case PIE: return this.arcuri(fn, a);
      case CREATEPENINDIRECT: return this.obiect({ fel: 'penita', vede: (a.u(0) & 0x0f) !== 5 });
      case CREATEBRUSHINDIRECT: return this.obiect({ fel: 'pensula', vede: a.u(0) !== 1 });
      case CREATEREGION: return this.obiect({ fel: 'regiune' });
      case SELECTOBJECT: {
        const o = this.obiecte[a.u(0)];
        if (o?.fel === 'penita') this.s = { ...this.s, penita: o.vede };
        else if (o?.fel === 'pensula') this.s = { ...this.s, pensula: o.vede };
        else if (o?.fel === 'regiune') this.n.decupaje++;
        return;
      }
      case DELETEOBJECT: {
        const k = a.u(0);
        if (!this.obiecte[k]) return;
        this.obiecte[k] = null;
        this.libere.pune(k);
        return;
      }
      default:
        if (OBIECTE_ALTE.has(fn)) return this.obiect({ fel: 'altul' });
        if (PENSULE_MODEL.has(fn)) return this.obiect({ fel: 'pensula', vede: true });
        if (TEXT.has(fn)) this.n['sarit-text']++;
        else if (RASTER.has(fn)) this.n['sarit-imagine']++;
        else if (ALTE_DESENE.has(fn)) this.n['sarit-altele']++;
        else if (DECUPAJE.has(fn)) this.n.decupaje++;
        else if (!FARA_EFECT.has(fn)) this.n.necunoscute++;
    }
  }

  /** Un obiect nou, în locul cel mai mic liber al tabelului. */
  private obiect(o: Obiect): void {
    const k = this.libere.scoate();
    if (k !== undefined) {
      this.obiecte[k] = o;
      return;
    }
    if (this.obiecte.length >= OBIECTE_MAXIME) throw new PestePlafon('obiecte');
    this.obiecte.push(o);
  }

  /* ── Căile ── */

  /** O formă închisă se vede cu penița sau cu pensula, o linie doar cu penița; una nevăzută se numără. */
  private seVede(inchisa: boolean): boolean {
    if (this.s.penita || (inchisa && this.s.pensula)) {
      const q = METRIC[this.s.m.mod];
      if (q === undefined) this.nemetric = true;
      else this.metric ??= q;
      return true;
    }
    this.n.nepictate++;
    return false;
  }

  private numara(): void {
    if (++this.varfuri > PLAFON_IMPORT.varfuriLucru) throw new PestePlafon('varfuri');
  }

  private subcale(start: Punct): Subcale {
    return { start, cur: start, varfuri: [] };
  }

  /** Un segment din punctul curent; unul de lungime nulă nu se adaugă. */
  private segment(sc: Subcale, s: Segment, capat: Punct): void {
    if (capat.x === sc.cur.x && capat.y === sc.cur.y && (s.tip !== 'C' || [s.c1, s.c2].every((q) => q.x === capat.x && q.y === capat.y))) return;
    sc.varfuri.push({ p: sc.cur, s });
    sc.cur = capat;
    this.numara();
  }

  /** Subcalea încheiată după regulile comune ușilor (`autor`: o formă închisă de înregistrare); null dacă se sare. */
  private incheie(sc: Subcale, autor: boolean, umplut: boolean): CaleCitita | null {
    const r = incheieSubcalea(sc.varfuri, sc.cur, sc.start, autor, umplut);
    if (r === 'prea-mare') this.n['prea-mari']++;
    else if (r === 'degenerata') this.n.degenerate++;
    else if (r === 'praf') this.n['sub-rezolutie']++;
    else {
      if (r.inchidere === 'usa') this.n['inchise-la-usa']++;
      return r.cale;
    }
    return null;
  }

  private forma(cai: Array<CaleCitita | null>, nonzero: boolean): void {
    const bune = cai.filter((c): c is CaleCitita => c !== null);
    if (bune.length > 0) this.forme.push({ cai: bune, nonzero });
  }

  /** O formă închisă umplută cu regula `WINDING` se normalizează nonzero (ADR 0036). */
  private nonzero(): boolean {
    return this.s.pensula && this.s.winding;
  }

  private incheieLantul(): void {
    const l = this.lant;
    this.lant = null;
    if (l) this.forma([this.incheie(l, false, false)], false);
  }

  /** `LineTo`: segmentul din poziția curentă; lipit de lanț dacă pornește din capătul lui. */
  private linieLa(x: number, y: number): void {
    const de = this.s.cur;
    this.s = { ...this.s, cur: { x, y } };
    if (!this.seVede(false)) {
      this.incheieLantul();
      return;
    }
    const a = this.pt(de.x, de.y);
    if (!this.lant || this.lant.cur.x !== a.x || this.lant.cur.y !== a.y) {
      this.incheieLantul();
      this.lant = this.subcale(a);
    }
    this.segment(this.lant, LINIE, this.pt(x, y));
  }

  /** Vârfurile de la cuvântul `o`: k perechi (x, y). */
  private puncte(a: Param, o: number, k: number): Subcale | null {
    if (k <= 0) return null;
    const sc = this.subcale(this.pt(a.i(o), a.i(o + 1)));
    for (let j = 1; j < k; j++) this.segment(sc, LINIE, this.pt(a.i(o + 2 * j), a.i(o + 2 * j + 1)));
    return sc;
  }

  /** `Polyline` (deschisă) și `Polygon` (închis): numărul punctelor, apoi punctele. */
  private poligon(inchis: boolean, a: Param): void {
    this.incheieLantul();
    const k = a.i(0);
    if (k < 0 || 1 + 2 * k > a.n) throw new EroareWmf(a.poz);
    if (!this.seVede(inchis)) return;
    const sc = this.puncte(a, 1, k);
    if (!sc) {
      this.n.degenerate++;
      return;
    }
    this.forma([this.incheie(sc, inchis, inchis && this.s.pensula)], inchis && this.nonzero());
  }

  /** `PolyPolygon`: numărul poligoanelor, numărul punctelor fiecăruia, apoi toate punctele; o singură formă. */
  private poligoane(a: Param): void {
    this.incheieLantul();
    const k = a.u(0);
    let total = 0;
    for (let j = 1; j <= k; j++) total += a.u(j);
    if (1 + k + 2 * total > a.n) throw new EroareWmf(a.poz);
    if (!this.seVede(true)) return;
    const cai: Array<CaleCitita | null> = [];
    for (let j = 1, o = 1 + k; j <= k; o += 2 * a.u(j), j++) {
      const sc = this.puncte(a, o, a.u(j));
      if (sc) cai.push(this.incheie(sc, true, this.s.pensula));
      else this.n.degenerate++;
    }
    this.forma(cai, this.nonzero());
  }

  /** Dreptunghiul cu colțurile ordonate, în mm; null dacă n-are arie. */
  private cutie(l: number, t: number, r: number, b: number): Elipsa | null {
    const p1 = this.pt(l, t), p2 = this.pt(r, b);
    const x0 = Math.min(p1.x, p2.x), x1 = Math.max(p1.x, p2.x), y0 = Math.min(p1.y, p2.y), y1 = Math.max(p1.y, p2.y);
    if (!(x1 > x0 && y1 > y0)) return null;
    return { c: { x: (x0 + x1) / 2, y: (y0 + y1) / 2 }, rx: (x1 - x0) / 2, ry: (y1 - y0) / 2, x0, y0, x1, y1 };
  }

  /**
   * `Rectangle` (`colt` = 0) și `RoundRect` (`colt` = 2: elipsa colțului e cât (w, h), cel mult cât dreptunghiul), parcurse
   * ca la GDI, în sens trigonometric din colțul din dreapta-sus.
   */
  private dreptunghi(a: Param, colt: number): void {
    this.incheieLantul();
    const o = colt;
    const e = this.cutie(a.i(o + 3), a.i(o + 2), a.i(o + 1), a.i(o));
    if (!this.seVede(true)) return;
    if (!e) {
      this.n.degenerate++;
      return;
    }
    const k = this.scara();
    const rx = colt ? Math.min((Math.abs(a.i(1)) * k.x) / 2, e.rx) : 0;
    const ry = colt ? Math.min((Math.abs(a.i(0)) * k.y) / 2, e.ry) : 0;
    // Cu o dimensiune a colțului nulă, GDI desenează dreptunghiul simplu.
    const rotunjit = rx > 0 && ry > 0;
    const { x0, y0, x1, y1 } = e;
    const sc = this.subcale({ x: x1, y: rotunjit ? y1 - ry : y1 });
    if (rotunjit) {
      const sfert = Math.PI / 2;
      this.arc(sc, { x: x1 - rx, y: y1 - ry }, rx, ry, 0, sfert, { x: x1 - rx, y: y1 });
      this.segment(sc, LINIE, { x: x0 + rx, y: y1 });
      this.arc(sc, { x: x0 + rx, y: y1 - ry }, rx, ry, sfert, sfert, { x: x0, y: y1 - ry });
      this.segment(sc, LINIE, { x: x0, y: y0 + ry });
      this.arc(sc, { x: x0 + rx, y: y0 + ry }, rx, ry, 2 * sfert, sfert, { x: x0 + rx, y: y0 });
      this.segment(sc, LINIE, { x: x1 - rx, y: y0 });
      this.arc(sc, { x: x1 - rx, y: y0 + ry }, rx, ry, 3 * sfert, sfert, { x: x1, y: y0 + ry });
    } else {
      this.segment(sc, LINIE, { x: x0, y: y1 });
      this.segment(sc, LINIE, { x: x0, y: y0 });
      this.segment(sc, LINIE, { x: x1, y: y0 });
    }
    this.forma([this.incheie(sc, true, this.s.pensula)], false);
  }

  /** `Ellipse`: elipsa întreagă, în sens trigonometric din punctul cel mai din dreapta. */
  private elipsaIntreaga(a: Param): void {
    this.incheieLantul();
    const e = this.cutie(a.i(3), a.i(2), a.i(1), a.i(0));
    if (!this.seVede(true)) return;
    if (!e) {
      this.n.degenerate++;
      return;
    }
    const start = { x: e.x1, y: e.c.y };
    const sc = this.subcale(start);
    this.arc(sc, e.c, e.rx, e.ry, 0, 2 * Math.PI, start);
    this.forma([this.incheie(sc, true, this.s.pensula)], false);
  }

  /**
   * `Arc` (deschis), `Chord` (închis cu coarda) și `Pie` (închis cu cele două raze): de la raza prin punctul de start la raza
   * prin cel de sfârșit. Sensul e al GDI-ului, măsurat pe toate cele patru combinații de axe: trigonometric pe dispozitiv
   * (deci și în mm, cu Y în sus), afară de maparea care oglindește doar axa X (cu Y neîntoarsă), unde e orar. Capetele pe
   * aceeași rază: elipsa întreagă (la `Pie`, fără raza dusă și întoarsă).
   */
  private arcuri(fn: number, a: Param): void {
    this.incheieLantul();
    const inchis = fn !== ARC;
    const e = this.cutie(a.i(7), a.i(6), a.i(5), a.i(4));
    const s = this.pt(a.i(3), a.i(2)), f = this.pt(a.i(1), a.i(0));
    if (!this.seVede(inchis)) return;
    if (!e) {
      this.n.degenerate++;
      return;
    }
    const unghi = (q: Punct): number => Math.atan2((q.y - e.c.y) / e.ry, (q.x - e.c.x) / e.rx);
    const t0 = unghi(s), t1 = unghi(f);
    const m = this.s.m;
    const orar = m.ve.x / m.we.x < 0 && m.ve.y / m.we.y > 0;
    const dt = orar ? (t1 < t0 ? t1 - t0 : t1 - t0 - 2 * Math.PI) : (t1 > t0 ? t1 - t0 : t1 - t0 + 2 * Math.PI);
    const pe = (t: number): Punct => ({ x: e.c.x + e.rx * Math.cos(t), y: e.c.y + e.ry * Math.sin(t) });
    const start = pe(t0);
    const sc = this.subcale(start);
    const intreg = t1 === t0;
    this.arc(sc, e.c, e.rx, e.ry, t0, dt, intreg ? start : pe(t1));
    if (fn === PIE && !intreg) this.segment(sc, LINIE, e.c);
    this.forma([this.incheie(sc, inchis, inchis && this.s.pensula)], false);
  }

  /**
   * Arcul elipsei de centru `c` și raze `rx`, `ry` (în mm, pe axe), de la unghiul parametric `t0`, `dt` radiani (pozitiv:
   * trigonometric; 0 < |dt| ≤ 2π), din punctul curent al subcăii până în `capat`. Cercul: arce exacte, câte unul de cel mult
   * o jumătate; elipsa și arcul peste latura documentului: cubice sub `TOLERANTA_IMPORT`.
   */
  private arc(sc: Subcale, c: Punct, rx: number, ry: number, t0: number, dt: number, capat: Punct): void {
    const plat = Math.max(rx, ry) > PLAFON.latura * 0.999;
    if (!plat && Math.abs(rx - ry) <= TOLERANTA_IMPORT) {
      const r = (rx + ry) / 2;
      const bucati = Math.abs(dt) > Math.PI ? 2 : 1;
      for (let i = 1; i <= bucati; i++) {
        const t = t0 + (dt * i) / bucati;
        this.segment(sc, { tip: 'A', bulge: Math.tan(dt / bucati / 4) }, i === bucati ? capat : { x: c.x + r * Math.cos(t), y: c.y + r * Math.sin(t) });
      }
      return;
    }
    const h = { a: rx, b: 0, c: 0, d: ry, e: c.x, f: c.y };
    if (!(bucatiArcEliptic(h, dt, TOLERANTA_IMPORT) <= PLAFON.varfuriCale)) throw new PestePlafon('varfuri');
    this.n[plat ? 'arce-plate' : 'arce-eliptice']++;
    for (const q of arcEliptic(h, t0, dt, sc.cur, capat, TOLERANTA_IMPORT)) this.segment(sc, { tip: 'C', c1: q.c1, c2: q.c2 }, q.b);
  }
}

/** `ISOTROPIC`: vizorul se strânge pe axa cu scara mai mare, ca ambele axe să aibă aceeași scară (fără rotunjirea la pixel). */
function izotrop(m: Mapare): Mapare {
  if (m.mod !== MM_ISOTROPIC) return m;
  const xd = Math.abs(m.ve.x / m.we.x), yd = Math.abs(m.ve.y / m.we.y);
  if (xd > yd) return { ...m, ve: { x: (m.ve.x * yd) / xd, y: m.ve.y } };
  if (yd > xd) return { ...m, ve: { x: m.ve.x, y: (m.ve.y * xd) / yd } };
  return m;
}

/* ── Antetul ───────────────────────────────────────────────────────────────────────────────────────────────────────── */

type Antet = {
  /** Octetul primei înregistrări. */
  readonly inceput: number;
  /** Cadrul antetului placeable (coordonate logice, ordonate) și unitățile pe țol; null fără antet. */
  readonly cadru: { readonly x: number; readonly y: number; readonly l: number; readonly h: number; readonly inch: number } | null;
};

/** Antetul placeable (opțional) și cel standard (tipul 1 sau 2, 9 cuvinte): `nu` dacă nu e un WMF, un număr: octetul greșit. */
function antet(dv: DataView): Antet | 'nu' | number {
  let p = 0;
  let cadru: Antet['cadru'] = null;
  if (dv.byteLength >= 22 && dv.getUint32(0, true) === CHEIE_PLACEABLE) {
    const l = dv.getInt16(6, true), t = dv.getInt16(8, true), r = dv.getInt16(10, true), b = dv.getInt16(12, true);
    const inch = dv.getUint16(14, true);
    if (inch === 0 || l === r || t === b) return 0;
    cadru = { x: Math.min(l, r), y: Math.min(t, b), l: Math.abs(r - l), h: Math.abs(b - t), inch };
    p = 22;
  }
  if (dv.byteLength < p + 18) return cadru ? p : 'nu';
  const tip = dv.getUint16(p, true), marime = dv.getUint16(p + 2, true);
  if ((tip !== 1 && tip !== 2) || marime !== 9) return cadru ? p : 'nu';
  return { inceput: p + 18, cadru };
}

/** Fereastra pusă de un fișier fără antet înaintea primului desen (ultima, cu extinderi nenule), sau null. */
function primaFereastra(dv: DataView, inceput: number): Pereche | null {
  let f: Pereche | null = null;
  for (let p = inceput; p + 6 <= dv.byteLength;) {
    const marime = dv.getUint32(p, true), fn = dv.getUint16(p + 4, true);
    if (marime < 3 || p + 2 * marime > dv.byteLength || fn === EOF || DESENE.has(fn)) break;
    if (fn === SETWINDOWEXT && marime >= 5) {
      const y = dv.getInt16(p + 6, true), x = dv.getInt16(p + 8, true);
      if (x !== 0 && y !== 0) f = { x: Math.abs(x), y: Math.abs(y) };
    }
    p += 2 * marime;
  }
  return f;
}

/* ── Ușa ───────────────────────────────────────────────────────────────────────────────────────────────────────────── */

const numaratoareGoala = (): Numaratoare => Object.fromEntries(CODURI_AVERTISMENT_WMF.map((k) => [k, 0])) as Numaratoare;

/**
 * Citește un WMF (ADR 0117). Nu aruncă: orice eroare a fișierului e un refuz cu cod, sau un avertisment numărat. `unitate`:
 * unitatea dispozitivului pentru un fișier fără antet (implicit 1/96 țol).
 */
export function citesteWmf(octeti: Uint8Array, o: { readonly unitate?: UnitateWmf } = {}): RezultatWmf {
  if (octeti.length > PLAFON_IMPORT.octeti) return { ok: false, cod: 'octeti', detaliu: String(octeti.length) };
  const dv = new DataView(octeti.buffer, octeti.byteOffset, octeti.byteLength);
  if (dv.byteLength >= 44 && dv.getUint32(0, true) === 1 && dv.getUint32(40, true) === SEMNATURA_EMF) return { ok: false, cod: 'emf' };
  const a = antet(dv);
  if (a === 'nu') return { ok: false, cod: 'nu-e-wmf' };
  if (typeof a === 'number') return { ok: false, cod: 'wmf', detaliu: String(a) };
  const n = numaratoareGoala();
  const unitate = o.unitate ?? 'px';
  // Playerul (§5): cu antetul, fereastra pe cadru și vizorul pe mărimea lui (unitatea dispozitivului = 1/inch țol); fără,
  // vizorul cât fereastra de dinaintea primului desen (unitatea aleasă).
  const k = a.cadru;
  const marime = k ? { x: k.l, y: k.h } : (primaFereastra(dv, a.inceput) ?? { x: 1, y: 1 });
  const p = k ? 25.4 / k.inch : MM_PE_UNITATE_WMF[unitate];
  const m: Mapare = { mod: MM_ANISOTROPIC, wo: k ? { x: k.x, y: k.y } : { x: 0, y: 0 }, we: marime, vo: { x: 0, y: 0 }, ve: marime };
  const r = new Redare(n, p, k ? k.h : 0, m, marime);
  try {
    r.ruleaza(dv, a.inceput);
  } catch (e) {
    if (e instanceof EroareWmf) return { ok: false, cod: 'wmf', detaliu: String(e.octet), avertismente: n };
    if (e instanceof PestePlafon) return { ok: false, cod: 'plafon', detaliu: e.message, avertismente: n };
    throw e;
  }
  const declarate = k !== null || (!r.nemetric && r.metric !== null);
  if (!declarate) n['unitati-nedeclarate'] = 1;
  const unitati: UnitatiWmf = k
    ? { mmPeUnitate: p, sursa: 'antet', inch: k.inch, mmPeUnitateMapare: null, unitate: null }
    : declarate
      ? { mmPeUnitate: p, sursa: 'mapare', inch: null, mmPeUnitateMapare: r.metric, unitate: null }
      : { mmPeUnitate: p, sursa: 'aleasa', inch: null, mmPeUnitateMapare: null, unitate };
  // Ca la celelalte uși: plafonul pe intrare, apoi fiecare formă nonzero prin aranjamentul exact, cu bugetul întregului
  // fișier, apoi plafonul pe ieșire și marginile.
  const intrare = r.forme.reduce((s, f) => s + f.cai.reduce((t, c) => t + c.varfuri.length, 0), 0);
  if (intrare > PLAFON.varfuri) return { ok: false, cod: 'plafon', detaliu: String(intrare), avertismente: n };
  const buget = { ramas: PLAFON_IMPORT.normalizare };
  const cai: CaleWmf[] = [];
  for (const f of r.forme) {
    for (const c of normalizeazaForma(f.cai, f.nonzero, buget, n)) {
      if (!c.inchis) n.deschise++;
      cai.push({ varfuri: c.varfuri, inchis: c.inchis });
    }
  }
  const primite = cai.reduce((s, c) => s + c.varfuri.length, 0);
  if (primite > PLAFON.varfuri) return { ok: false, cod: 'plafon', detaliu: String(primite), avertismente: n };
  if (preaDeparte(cai)) return { ok: false, cod: 'departe', avertismente: n };
  if (cai.length === 0) return { ok: false, cod: 'gol', avertismente: n };
  return { ok: true, cai, cadru: k ? { latime: k.l * p, inaltime: k.h * p } : null, unitati, avertismente: n };
}
