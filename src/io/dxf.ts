/**
 * Ușa DXF (ADR 0101): octeții unui DXF ASCII → căile, închise sau deschise, în mm, cu Y în sus, în coordonatele desenului
 * (originea DXF-ului e originea foii), fiecare cu stratul ei, plus unitățile și raportul. Cititorul perechilor cod /
 * valoare e propriu (ADR 0101 §1); semantica vine din sonda s2 (ADR 0018): unitățile ($INSUNITS), OCS-ul (extrudarea
 * (0, 0, −1) oglindește), blocurile imbricate (punctul de bază, scara, rotirea, matricea), bulge-ul ca arc, spline-ul în
 * Bézier exact (forma polară, și pe nodurile neprinse), conica circulară ca arc, bucățile deschise legate capăt la capăt pe
 * același strat, cercul ca două semicercuri.
 */
import { arc, cerculArcului, conturCerc, LINIE, type Punct, type Segment, type Varf } from '../geom/contur.ts';
import { cutieContur } from '../geom/cutie.ts';
import { arcEliptic, bucatiArcEliptic, valoareSingularaMaxima, type HartaElipsa } from '../geom/elipsa.ts';
import { aplica, compune, determinantNormat, IDENTITATE, rotatie, scalare, translatie, type Matrice } from '../geom/matrice.ts';
import { REZOLUTIE, TOLERANTA_IMPORT } from '../geom/toleranta.ts';
import { PLAFON } from '../model/document.ts';
import { bucla, deschisa, inMargini, peODreapta, praf, similitudine, type CaleCitita } from './caleImport.ts';
import { CODURI_AVERTISMENT_DXF, MM_PE_UNITATE, UNITATI_DXF, type AvertismenteDxf, type CodAvertismentDxf, type UnitateDxf } from './dxfCoduri.ts';
import { PLAFON_IMPORT } from './svgCoduri.ts';

export { CODURI_AVERTISMENT_DXF, MM_PE_UNITATE, UNITATI_DXF, type AvertismenteDxf, type CodAvertismentDxf, type UnitateDxf } from './dxfCoduri.ts';

/** O cale a fișierului, în mm, în lume. O cale deschisă are vârfurile plus punctul final (n vârfuri, n − 1 segmente). */
export type CaleDxf = { readonly varfuri: readonly Varf[]; readonly inchis: boolean; readonly strat: string };

/**
 * Unitățile: `cod` e $INSUNITS (null dacă lipsește); `declarate` e fals la lipsă, la 0 și la un cod fără loc în tabel, iar
 * atunci `unitate` e alegerea omului (implicit mm); declarate, `unitate` e numele lor, dacă e una din cele de ales.
 */
export type UnitatiDxf = { readonly mmPeUnitate: number; readonly declarate: boolean; readonly cod: number | null; readonly unitate: UnitateDxf | null };

export type RezultatDxf =
  | {
    readonly ok: true;
    readonly cai: readonly CaleDxf[];
    readonly unitati: UnitatiDxf;
    /** $ACADVER (de exemplu AC1032 = R2018), sau null. */
    readonly versiune: string | null;
    readonly avertismente: AvertismenteDxf;
  }
  | { readonly ok: false; readonly cod: 'octeti' | 'binar' | 'dxf' | 'tip' | 'gol' | 'departe' | 'plafon'; readonly detaliu?: string; readonly avertismente?: AvertismenteDxf };

/** `unitate`: ce a ales omul pentru un fișier care nu-și declară unitățile (implicit mm). */
export type OptiuniDxf = { readonly unitate?: UnitateDxf };

type Numaratoare = Record<CodAvertismentDxf, number>;

/** mm pe unitatea de desen, după $INSUNITS (AutoCAD); 0 = fără unități. Unitățile astronomice lipsesc: nu sunt un desen CNC. */
const MM_INSUNITS: Readonly<Record<number, number>> = {
  1: 25.4, 2: 304.8, 3: 1_609_344, 4: 1, 5: 10, 6: 1000, 7: 1e6, 8: 25.4e-6, 9: 0.0254, 10: 914.4, 11: 1e-7, 12: 1e-6, 13: 1e-3,
  14: 100, 15: 10_000, 16: 100_000, 21: 1_200_000 / 3937, 22: 100_000 / 3937, 23: 3_600_000 / 3937, 24: 6_336_000_000 / 3937,
};

/** Imbricarea blocurilor: mai adânc, INSERT-ul se sare (și un bloc care se inserează pe sine se oprește aici). */
const ADANCIME_MAXIMA = 16;
/** Gradul maxim al unui spline (AutoCAD scrie până la 11). */
const GRAD_MAXIM = 25;

class PestePlafon extends Error {}
class Invalid extends Error {}

/* ── Textul și perechile ───────────────────────────────────────────────────────────────────────────────────────────── */

/** Pagina de cod din antet ($DWGCODEPAGE) ca etichetă `TextDecoder`; necunoscută: windows-1252. */
function codificare(pagina: string | undefined): string {
  const p = (pagina ?? '').toUpperCase();
  const m = /^ANSI_(\d+)$/.exec(p);
  const cand = m ? ({ 874: 'windows-874', 932: 'shift_jis', 936: 'gbk', 949: 'euc-kr', 950: 'big5' } as Record<string, string>)[m[1] ?? ''] ?? `windows-${m[1] ?? ''}`
    : p === 'DOS866' ? 'ibm866' : 'windows-1252';
  try {
    new TextDecoder(cand);
    return cand;
  } catch {
    return 'windows-1252';
  }
}

/**
 * Textul fișierului: UTF-8 de la R2007 (AC1021), pagina de cod a antetului înainte. Versiunea și pagina se citesc întâi
 * din antet, octet cu octet (sunt ASCII). Un fișier nou care nu e UTF-8 valid (un scriitor care pune altă codificare) și
 * unul fără versiune se citesc după pagina de cod, dacă UTF-8 nu merge.
 */
function textul(octeti: Uint8Array): string {
  const antet = new TextDecoder('windows-1252').decode(octeti.subarray(0, Math.min(octeti.length, 1 << 18)));
  const variabila = (nume: string, cod: number): string | undefined =>
    new RegExp(`\\${nume}[ \\t]*\\r?\\n[ \\t]*${cod}[ \\t]*\\r?\\n([^\\r\\n]*)`).exec(antet)?.[1]?.trim();
  const versiune = variabila('$ACADVER', 1);
  if (versiune === undefined || versiune >= 'AC1021') {
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(octeti);
    } catch {
      // altă codificare: pagina de cod
    }
  }
  return new TextDecoder(codificare(variabila('$DWGCODEPAGE', 3))).decode(octeti);
}

/** `\U+XXXX` din numele AutoCAD (straturi, blocuri). */
const nume = (s: string): string => s.replace(/\\U\+([0-9A-Fa-f]{4})/g, (_, h: string) => String.fromCharCode(parseInt(h, 16)));

type Perechi = { readonly coduri: number[]; readonly valori: string[] };

/** Perechile (cod, valoare); linia (de la 1) a primei perechi rupte, sau 'tip' dacă fișierul nu începe ca un DXF. */
function perechi(text: string): Perechi | { readonly linie: number } | 'tip' {
  const linii = text.split(/\r\n|\r|\n/);
  let n = linii.length;
  while (n > 0 && (linii[n - 1] ?? '').trim() === '') n--;
  const coduri: number[] = [];
  const valori: string[] = [];
  for (let i = 0; i < n; i += 2) {
    const c = (linii[i] ?? '').trim();
    if (!/^-?\d{1,4}$/.test(c) || i + 1 >= n) return coduri.length === 0 ? 'tip' : { linie: i + 1 };
    coduri.push(Number(c));
    valori.push((linii[i + 1] ?? '').trim());
  }
  // Un DXF începe cu o secțiune (după comentariile 999).
  const k = coduri.findIndex((c) => c !== 999);
  if (k < 0 || coduri[k] !== 0 || (valori[k] ?? '').toUpperCase() !== 'SECTION') return 'tip';
  return { coduri, valori };
}

type Grupuri = ReadonlyArray<readonly [number, string]>;
type Inreg = { readonly tip: string; readonly g: Grupuri };

/** O entitate cu ce o urmează: vârfurile unei POLYLINE (VERTEX … SEQEND), atributele unui INSERT (ATTRIB … SEQEND). */
type EntitateDxf = { readonly tip: string; readonly g: Grupuri; readonly varfuri?: readonly Grupuri[]; readonly atribute?: number };

/** Secțiunile, fiecare ca înregistrări (un cod 0 și grupurile lui). */
function sectiuni(p: Perechi): Map<string, Inreg[]> {
  const rez = new Map<string, Inreg[]>();
  let curenta: Inreg[] | null = null;
  let tip = '';
  let g: Array<readonly [number, string]> = [];
  const inchide = (): void => {
    if (curenta && tip !== '') curenta.push({ tip, g });
  };
  for (let i = 0; i < p.coduri.length; i++) {
    const c = p.coduri[i] as number;
    const v = p.valori[i] as string;
    if (c !== 0) {
      g.push([c, v]);
      continue;
    }
    inchide();
    const t = v.toUpperCase();
    if (t === 'SECTION') {
      const urm = p.valori[i + 1] ?? '';
      curenta = [];
      if (!rez.has(urm.toUpperCase())) rez.set(urm.toUpperCase(), curenta);
      tip = '';
      g = [];
      i++;
      continue;
    }
    if (t === 'ENDSEC' || t === 'EOF') {
      curenta = null;
      tip = '';
      g = [];
      continue;
    }
    tip = t;
    g = [];
  }
  inchide();
  return rez;
}

/** Entitățile din înregistrări: POLYLINE își ia VERTEX-urile, INSERT-ul cu 66 = 1 își ia ATTRIB-urile, până la SEQEND. */
function entitati(inreg: readonly Inreg[], i0: number, i1: number): EntitateDxf[] {
  const rez: EntitateDxf[] = [];
  for (let i = i0; i < i1; i++) {
    const r = inreg[i] as Inreg;
    if (r.tip === 'POLYLINE') {
      const varfuri: Grupuri[] = [];
      while (i + 1 < i1 && (inreg[i + 1] as Inreg).tip === 'VERTEX') varfuri.push((inreg[++i] as Inreg).g);
      if (i + 1 < i1 && (inreg[i + 1] as Inreg).tip === 'SEQEND') i++;
      rez.push({ tip: r.tip, g: r.g, varfuri });
    } else if (r.tip === 'INSERT' && primul(r.g, 66) === '1') {
      let atribute = 0;
      while (i + 1 < i1 && (inreg[i + 1] as Inreg).tip === 'ATTRIB') { i++; atribute++; }
      if (i + 1 < i1 && (inreg[i + 1] as Inreg).tip === 'SEQEND') i++;
      rez.push({ tip: r.tip, g: r.g, atribute });
    } else if (r.tip !== 'VERTEX' && r.tip !== 'SEQEND' && r.tip !== 'ATTRIB') {
      rez.push({ tip: r.tip, g: r.g });
    }
  }
  return rez;
}

function primul(g: Grupuri, cod: number): string | undefined {
  for (const [c, v] of g) if (c === cod) return v;
  return undefined;
}

/** Numărul grupului `cod`, sau `implicit` dacă lipsește; o valoare care nu e un număr finit face entitatea invalidă. */
function numar(g: Grupuri, cod: number, implicit: number): number {
  const v = primul(g, cod);
  if (v === undefined) return implicit;
  const x = v === '' ? NaN : Number(v);
  if (!Number.isFinite(x)) throw new Invalid();
  return x;
}

/* ── Geometria brută, în cadrul entității ──────────────────────────────────────────────────────────────────────────── */

/** Arcul: capetele exacte (din fișier, sau din unghiuri), centrul, raza, unghiul de start și baleiajul cu semn. */
type BrutA = { readonly k: 'A'; readonly a: Punct; readonly b: Punct; readonly c: Punct; readonly r: number; readonly a0: number; readonly da: number; readonly bulge?: number };
type Brut =
  | { readonly k: 'L'; readonly a: Punct; readonly b: Punct }
  | BrutA
  /** Arcul de elipsă: punctul (cos t, sin t) prin hartă, de la t0, cu baleiajul dt; întreagă, capetele sunt același punct. */
  | { readonly k: 'E'; readonly h: HartaElipsa; readonly t0: number; readonly dt: number; readonly intreaga: boolean }
  | { readonly k: 'C'; readonly a: Punct; readonly c1: Punct; readonly c2: Punct; readonly b: Punct }
  /** Spline-ul: gradul, nodurile, punctele de control omogene (x·w, y·w, w). */
  | { readonly k: 'S'; readonly grad: number; readonly U: readonly number[]; readonly Pw: ReadonlyArray<readonly [number, number, number]> };

/** O entitate desenabilă: segmentele brute, cadrul lor (OCS-ul, oglindit sau nu) și dacă e închisă. */
type Figura = { readonly segs: readonly Brut[]; readonly inchis: boolean; readonly O: Matrice };

const OGLINDA: Matrice = { a: -1, b: 0, c: 0, d: 1, e: 0, f: 0 };

/** Cadrul OCS după extrudare: (0, 0, 1) identitatea, (0, 0, −1) oglinda pe x (algoritmul axei arbitrare); altfel, înclinat. */
function cadru(g: Grupuri): Matrice | 'inclinat' {
  const nx = numar(g, 210, 0), ny = numar(g, 220, 0), nz = numar(g, 230, 1);
  const l = Math.hypot(nx, ny, nz);
  if (!(l > 0)) return IDENTITATE;
  if (Math.abs(nx) > 1e-9 * l || Math.abs(ny) > 1e-9 * l) return 'inclinat';
  return nz > 0 ? IDENTITATE : OGLINDA;
}

/** Cosinusul și sinusul unui unghi în grade, exacte la multiplii de 90° (ca `rotatie`). */
function cosSin(grade: number): readonly [number, number] {
  const r = grade >= 0 && grade < 360 ? grade : ((grade % 360) + 360) % 360;
  const exacte: Readonly<Record<number, readonly [number, number]>> = { 0: [1, 0], 90: [0, 1], 180: [-1, 0], 270: [0, -1] };
  return exacte[r] ?? [Math.cos((r * Math.PI) / 180), Math.sin((r * Math.PI) / 180)];
}

/** Arcul dintre două vârfuri, din bulge (β = tan(θ/4)). */
function arcBulge(a: Punct, b: Punct, bulge: number): BrutA {
  const k = cerculArcului(a, b, bulge);
  return { k: 'A', a, b, c: k.centru, r: k.raza, a0: k.start, da: k.baleiaj, bulge };
}

/** Segmentele unei polilinii 2D (închise: și cel de la ultimul vârf la primul); segmentele nule se omit. */
function polilinie(v: ReadonlyArray<{ readonly x: number; readonly y: number; readonly bulge: number }>, inchisa: boolean): Brut[] {
  const segs: Brut[] = [];
  const m = inchisa ? v.length : v.length - 1;
  for (let i = 0; i < m; i++) {
    const p = v[i], q = v[(i + 1) % v.length];
    if (!p || !q || (p.x === q.x && p.y === q.y)) continue;
    const a = { x: p.x, y: p.y }, b = { x: q.x, y: q.y };
    segs.push(p.bulge === 0 ? { k: 'L', a, b } : arcBulge(a, b, p.bulge));
  }
  return segs;
}

/** Vârfurile unei LWPOLYLINE, în ordinea grupurilor: 10 începe un vârf, 20 și 42 îl completează. */
function varfuriLw(g: Grupuri): Array<{ x: number; y: number; bulge: number }> {
  const v: Array<{ x: number; y: number; bulge: number }> = [];
  for (const [c, s] of g) {
    if (c !== 10 && c !== 20 && c !== 42) continue;
    const x = s === '' ? NaN : Number(s);
    if (!Number.isFinite(x)) throw new Invalid();
    const ultim = v[v.length - 1];
    if (c === 10) v.push({ x, y: NaN, bulge: 0 });
    else if (ultim && c === 20) ultim.y = x;
    else if (ultim) ultim.bulge = x;
  }
  if (v.some((p) => !Number.isFinite(p.y))) throw new Invalid();
  return v;
}

type Citire = Figura | CodAvertismentDxf | 'degenerata';

/** Figura unei entități desenabile, sau codul pentru care se sare. INSERT-ul îl tratează parcurgerea. */
function figura(e: EntitateDxf, st: Stare): Citire {
  const g = e.g;
  const n = (cod: number, implicit = 0): number => numar(g, cod, implicit);
  switch (e.tip) {
    case 'LINE': {
      if (n(30) !== n(31)) st.n.proiectate++;
      return { segs: [{ k: 'L', a: { x: n(10), y: n(20) }, b: { x: n(11), y: n(21) } }], inchis: false, O: IDENTITATE };
    }
    case 'CIRCLE':
    case 'ARC': {
      const O = cadru(g);
      if (O === 'inclinat') return 'inclinate';
      const c = { x: n(10), y: n(20) }, r = n(40);
      if (!(r > 0)) return 'degenerata';
      if (e.tip === 'CIRCLE') {
        const a = { x: c.x + r, y: c.y };
        return { segs: [{ k: 'A', a, b: a, c, r, a0: 0, da: 2 * Math.PI }], inchis: true, O };
      }
      const s = n(50), f = n(51);
      let d = (f - s) % 360;
      if (d <= 0) d += 360;
      const [c0, s0] = cosSin(s), [c1, s1] = cosSin(s + d);
      return {
        segs: [{ k: 'A', a: { x: c.x + r * c0, y: c.y + r * s0 }, b: { x: c.x + r * c1, y: c.y + r * s1 }, c, r, a0: (s * Math.PI) / 180, da: (d * Math.PI) / 180 }],
        inchis: false,
        O,
      };
    }
    case 'ELLIPSE': {
      const O = cadru(g);
      if (O === 'inclinat') return 'inclinate';
      // Centrul și axa mare sunt în WCS; normala spune doar unde e axa mică (N × axa mare · raport).
      const mx = n(11), my = n(21), raport = n(40, 1);
      if (!(Math.hypot(mx, my) > 0) || !(raport > 0 && raport <= 1 + 1e-9)) return 'degenerata';
      const minor = O === IDENTITATE ? { x: -my * raport, y: mx * raport } : { x: my * raport, y: -mx * raport };
      const t0 = n(41), t1 = n(42, 2 * Math.PI);
      let dt = (t1 - t0) % (2 * Math.PI);
      if (dt <= 1e-15) dt += 2 * Math.PI;
      const intreaga = Math.abs(dt - 2 * Math.PI) < 1e-12;
      const h: HartaElipsa = { a: mx, b: my, c: minor.x, d: minor.y, e: n(10), f: n(20) };
      return { segs: [{ k: 'E', h, t0, dt: intreaga ? 2 * Math.PI : dt, intreaga }], inchis: intreaga, O: IDENTITATE };
    }
    case 'LWPOLYLINE': {
      const O = cadru(g);
      if (O === 'inclinat') return 'inclinate';
      const inchisa = (n(70) & 1) === 1;
      return { segs: polilinie(varfuriLw(g), inchisa), inchis: inchisa, O };
    }
    case 'POLYLINE': {
      const steaguri = n(70);
      if (steaguri & (16 | 64)) return 'sarit-3d';
      const inchisa = (steaguri & 1) === 1;
      // Cadrul de control al unei polilinii din spline (16) nu e desenul; vârfurile potrivite (8) și cele de curbă (1) sunt.
      const varfuri = (e.varfuri ?? []).filter((v) => (numar(v, 70, 0) & 16) === 0);
      if (steaguri & 8) {
        const z = varfuri.map((v) => numar(v, 30, 0));
        if (z.some((x) => x !== z[0])) st.n.proiectate++;
        return { segs: polilinie(varfuri.map((v) => ({ x: numar(v, 10, 0), y: numar(v, 20, 0), bulge: 0 })), inchisa), inchis: inchisa, O: IDENTITATE };
      }
      const O = cadru(g);
      if (O === 'inclinat') return 'inclinate';
      return { segs: polilinie(varfuri.map((v) => ({ x: numar(v, 10, 0), y: numar(v, 20, 0), bulge: numar(v, 42, 0) })), inchisa), inchis: inchisa, O };
    }
    case 'SPLINE':
      return spline(g, st);
    default:
      return SARITE.get(e.tip) ?? 'sarit-altele';
  }
}

/** Entitățile pe care importul nu le desenează, cu codul raportului; restul necunoscutelor: `sarit-altele`. */
const SARITE: ReadonlyMap<string, CodAvertismentDxf> = new Map([
  ...['TEXT', 'MTEXT', 'ATTRIB', 'ATTDEF', 'RTEXT', 'ARCALIGNEDTEXT'].map((t) => [t, 'sarit-text'] as const),
  ...['HATCH', 'SOLID', 'TRACE', 'WIPEOUT', 'MPOLYGON'].map((t) => [t, 'sarit-hasura'] as const),
  ...['DIMENSION', 'ARC_DIMENSION', 'LARGE_RADIAL_DIMENSION', 'LEADER', 'MULTILEADER', 'MLEADER', 'TOLERANCE'].map((t) => [t, 'sarit-cota'] as const),
  ['POINT', 'sarit-punct'] as const,
  ...['3DFACE', '3DSOLID', 'BODY', 'REGION', 'SURFACE', 'PLANESURFACE', 'EXTRUDEDSURFACE', 'LOFTEDSURFACE', 'REVOLVEDSURFACE', 'SWEPTSURFACE',
    'NURBSURFACE', 'MESH', 'POLYFACE', 'HELIX'].map((t) => [t, 'sarit-3d'] as const),
  ...['IMAGE', 'OLE2FRAME', 'OLEFRAME', 'PDFUNDERLAY', 'DWFUNDERLAY', 'DGNUNDERLAY'].map((t) => [t, 'sarit-imagine'] as const),
]);

/** SPLINE: punctele de control (omogene, cu ponderile), nodurile și gradul, verificate; Z-ul variabil e proiectat. */
function spline(g: Grupuri, st: Stare): Citire {
  const grad = numar(g, 71, 3);
  const U: number[] = [];
  const w: number[] = [];
  const P: Array<{ x: number; y: number; z: number }> = [];
  let potrivire = 0;
  for (const [c, s] of g) {
    if (c === 11) potrivire++;
    if (c !== 40 && c !== 41 && c !== 10 && c !== 20 && c !== 30) continue;
    const x = s === '' ? NaN : Number(s);
    if (!Number.isFinite(x)) throw new Invalid();
    const ultim = P[P.length - 1];
    if (c === 40) U.push(x);
    else if (c === 41) w.push(x);
    else if (c === 10) P.push({ x, y: NaN, z: 0 });
    else if (ultim && c === 20) ultim.y = x;
    else if (ultim) ultim.z = x;
  }
  if (P.length === 0) return potrivire > 0 ? 'spline-fara-control' : 'degenerata';
  const valid = Number.isInteger(grad) && grad >= 1 && grad <= GRAD_MAXIM && P.length > grad && U.length === P.length + grad + 1
    && P.every((p) => Number.isFinite(p.y)) && (w.length === 0 || (w.length === P.length && w.every((x) => x > 0)))
    && U.every((u, i) => i === 0 || u >= (U[i - 1] as number)) && (U[grad] as number) < (U[U.length - 1 - grad] as number);
  if (!valid) return 'spline-invalide';
  if (P.some((p) => p.z !== (P[0] as { z: number }).z)) st.n.proiectate++;
  const Pw = P.map((p, i) => {
    const wi = w[i] ?? 1;
    return [p.x * wi, p.y * wi, wi] as const;
  });
  return { segs: [{ k: 'S', grad, U, Pw }], inchis: false, O: IDENTITATE };
}

/* ── Spline-ul în Bézier ───────────────────────────────────────────────────────────────────────────────────────────── */

type Omogen = readonly [number, number, number];

/**
 * Forma polară (blossom) a spline-ului pe intervalul k, în punctele t1…tp: de Boor cu alt parametru pe fiecare nivel. Punctele
 * de control Bézier ale intervalului [U_k, U_{k+1}] sunt f(a^(p−i), b^i): merge și pe nodurile neprinse (periodic), fără să
 * le prindă întâi.
 */
function polara(p: number, U: readonly number[], Pw: readonly Omogen[], k: number, t: readonly number[]): Omogen {
  const d: Array<[number, number, number]> = [];
  for (let j = 0; j <= p; j++) {
    const q = Pw[k - p + j] as Omogen;
    d.push([q[0], q[1], q[2]]);
  }
  for (let r = 1; r <= p; r++) {
    for (let j = p; j >= r; j--) {
      const i = k - p + j;
      const ui = U[i] as number;
      const den = (U[i + p + 1 - r] as number) - ui;
      const al = den === 0 ? 0 : ((t[r - 1] as number) - ui) / den;
      const a = d[j - 1] as [number, number, number], b = d[j] as [number, number, number];
      d[j] = [(1 - al) * a[0] + al * b[0], (1 - al) * a[1] + al * b[1], (1 - al) * a[2] + al * b[2]];
    }
  }
  return d[p] as Omogen;
}

/** Bucățile Bézier (omogene) ale spline-ului, câte una pe intervalul nedegenerat al domeniului [U_p, U_{m−p}]. */
function bezierSpline(grad: number, U: readonly number[], Pw: readonly Omogen[]): Omogen[][] {
  const m = U.length - 1;
  const rez: Omogen[][] = [];
  for (let k = grad; k <= m - grad - 1; k++) {
    const a = U[k] as number, b = U[k + 1] as number;
    if (!(a < b)) continue;
    const bucata: Omogen[] = [];
    for (let i = 0; i <= grad; i++) bucata.push(polara(grad, U, Pw, k, [...Array<number>(grad - i).fill(a), ...Array<number>(i).fill(b)]));
    rez.push(bucata);
  }
  return rez;
}

/** Punctul și derivata (după u) unei curbe Bézier raționale, cu de Casteljau pe coordonatele omogene. */
function punctOmogen(H: readonly Omogen[], u: number): { p: Punct; d: Punct } {
  const n = H.length - 1;
  const q = H.map((h) => [h[0], h[1], h[2]] as [number, number, number]);
  for (let r = 1; r < n; r++) {
    for (let i = 0; i <= n - r; i++) {
      const a = q[i] as [number, number, number], b = q[i + 1] as [number, number, number];
      q[i] = [(1 - u) * a[0] + u * b[0], (1 - u) * a[1] + u * b[1], (1 - u) * a[2] + u * b[2]];
    }
  }
  const a = q[0] as [number, number, number], b = (q[1] ?? q[0]) as [number, number, number];
  const X = (1 - u) * a[0] + u * b[0], Y = (1 - u) * a[1] + u * b[1], W = (1 - u) * a[2] + u * b[2];
  const dX = n * (b[0] - a[0]), dY = n * (b[1] - a[1]), dW = n * (b[2] - a[2]);
  return { p: { x: X / W, y: Y / W }, d: { x: (dX * W - X * dW) / (W * W), y: (dY * W - Y * dW) / (W * W) } };
}

/**
 * Bucata Bézier (rațională sau de grad peste 3) în cubice Hermite, împărțită până când abaterea, pe 31 de puncte din
 * fiecare cubică, e sub jumătate din `tol` (aproximarea declarată, ADR 0101 §6).
 */
function aproximeaza(H: readonly Omogen[], tol: number, st: Stare): Brut[] {
  const rez: Brut[] = [];
  const cub = (p0: Punct, c1: Punct, c2: Punct, p3: Punct, s: number): Punct => {
    const v = 1 - s;
    return {
      x: v * v * v * p0.x + 3 * v * v * s * c1.x + 3 * v * s * s * c2.x + s * s * s * p3.x,
      y: v * v * v * p0.y + 3 * v * v * s * c1.y + 3 * v * s * s * c2.y + s * s * s * p3.y,
    };
  };
  const rec = (u0: number, u1: number, A: { p: Punct; d: Punct }, B: { p: Punct; d: Punct }, adancime: number): void => {
    const du = (u1 - u0) / 3;
    const c1 = { x: A.p.x + A.d.x * du, y: A.p.y + A.d.y * du };
    const c2 = { x: B.p.x - B.d.x * du, y: B.p.y - B.d.y * du };
    let err = 0;
    for (let i = 1; i < 32 && err <= tol / 2; i++) {
      const s = i / 32;
      const q = punctOmogen(H, u0 + (u1 - u0) * s).p, c = cub(A.p, c1, c2, B.p, s);
      err = Math.max(err, Math.hypot(q.x - c.x, q.y - c.y));
    }
    if (err <= tol / 2 || adancime >= 20) {
      lucreaza(st);
      rez.push({ k: 'C', a: A.p, c1, c2, b: B.p });
      return;
    }
    const um = (u0 + u1) / 2;
    const M = punctOmogen(H, um);
    rec(u0, um, A, M, adancime + 1);
    rec(um, u1, M, B, adancime + 1);
  };
  rec(0, 1, punctOmogen(H, 0), punctOmogen(H, 1), 0);
  return rez;
}

/**
 * Bézierul rațional pătratic e un arc de cerc exact dacă e isoscel și ponderea normată e sin(φ/2), cu φ unghiul de la
 * punctul din mijloc (sonda s2); altfel null.
 */
function conicaArc(E: readonly Punct[], w: readonly number[]): BrutA | null {
  const [P0, P1, P2] = E as [Punct, Punct, Punct];
  const [w0, w1, w2] = w as [number, number, number];
  const wn = w1 / Math.sqrt(w0 * w2);
  const l0 = Math.hypot(P1.x - P0.x, P1.y - P0.y), l1 = Math.hypot(P2.x - P1.x, P2.y - P1.y);
  if (!(l0 > 0 && l1 > 0) || Math.abs(l0 - l1) > 1e-9 * Math.max(l0, l1)) return null;
  const cosPhi = ((P0.x - P1.x) * (P2.x - P1.x) + (P0.y - P1.y) * (P2.y - P1.y)) / (l0 * l1);
  const phi = Math.acos(Math.max(-1, Math.min(1, cosPhi)));
  if (Math.abs(wn - Math.sin(phi / 2)) > 1e-9) return null;
  const theta = Math.PI - phi;
  if (!(theta > 0)) return null;
  const r = l0 / Math.tan(theta / 2);
  const cr = (P1.x - P0.x) * (P2.y - P1.y) - (P1.y - P0.y) * (P2.x - P1.x);
  const t = { x: (P1.x - P0.x) / l0, y: (P1.y - P0.y) / l0 };
  const nrm = cr > 0 ? { x: -t.y, y: t.x } : { x: t.y, y: -t.x };
  const c = { x: P0.x + nrm.x * r, y: P0.y + nrm.y * r };
  return { k: 'A', a: P0, b: P2, c, r, a0: Math.atan2(P0.y - c.y, P0.x - c.x), da: cr > 0 ? theta : -theta };
}

/** Spline-ul în segmente brute: liniile, cubicele și arcele exacte, restul aproximat sub `tol` (în unitățile desenului). */
function segmenteSpline(s: Extract<Brut, { k: 'S' }>, tol: number, st: Stare): { segs: Brut[]; aproximat: boolean } {
  const segs: Brut[] = [];
  let aproximat = false;
  for (const H of bezierSpline(s.grad, s.U, s.Pw)) {
    lucreaza(st);
    const w = H.map((h) => h[2]);
    const E = H.map((h) => ({ x: h[0] / h[2], y: h[1] / h[2] }));
    const rationala = w.some((x) => Math.abs(x - (w[0] as number)) > 1e-12 * Math.abs(w[0] as number));
    const [E0, E1, E2, E3] = E;
    if (!rationala && E0 && E1) {
      if (s.grad === 1) { segs.push({ k: 'L', a: E0, b: E1 }); continue; }
      if (s.grad === 2 && E2) {
        segs.push({ k: 'C', a: E0, c1: { x: E0.x + (2 / 3) * (E1.x - E0.x), y: E0.y + (2 / 3) * (E1.y - E0.y) }, c2: { x: E2.x + (2 / 3) * (E1.x - E2.x), y: E2.y + (2 / 3) * (E1.y - E2.y) }, b: E2 });
        continue;
      }
      if (s.grad === 3 && E2 && E3) { segs.push({ k: 'C', a: E0, c1: E1, c2: E2, b: E3 }); continue; }
    }
    if (rationala && s.grad === 2) {
      const a = conicaArc(E, w);
      if (a) { segs.push(a); continue; }
    }
    aproximat = true;
    segs.push(...aproximeaza(H, tol, st));
  }
  return { segs, aproximat };
}

/* ── Parcurgerea, cu blocurile ─────────────────────────────────────────────────────────────────────────────────────── */

/** Segmentele în mm, în lume, cu capetele exacte; arcul își păstrează bulge-ul din fișier când matricea îl lasă neschimbat. */
type Seg =
  | { readonly k: 'L'; readonly a: Punct; readonly b: Punct }
  | { readonly k: 'A'; readonly a: Punct; readonly b: Punct; readonly c: Punct; readonly r: number; readonly da: number; readonly bulge?: number }
  | { readonly k: 'C'; readonly a: Punct; readonly c1: Punct; readonly c2: Punct; readonly b: Punct };

type Bucata = { readonly segs: Seg[]; readonly inchis: boolean; readonly strat: string; readonly ordine: number };

type Strat = { readonly nume: string; readonly oprit: boolean; readonly inghetat: boolean };
type Bloc = { readonly baza: Punct; readonly xref: boolean; readonly entitati: readonly EntitateDxf[] };

type Stare = {
  readonly n: Numaratoare;
  readonly lucru: { n: number };
  readonly straturi: ReadonlyMap<string, Strat>;
  readonly blocuri: ReadonlyMap<string, Bloc>;
  readonly bucati: Bucata[];
};

function lucreaza(st: Stare, cat = 1): void {
  st.lucru.n += cat;
  if (st.lucru.n > PLAFON_IMPORT.varfuriLucru) throw new PestePlafon();
}

/** Numele stratului, cum îl scrie tabelul (AutoCAD nu ține de majuscule); un strat fără înregistrare se vede. */
const stratul = (st: Stare, s: string): Strat => st.straturi.get(s.toUpperCase()) ?? { nume: s, oprit: false, inghetat: false };

/**
 * Entitățile, prin matricea `M` (unitățile și blocurile de deasupra), cu stratul moștenit al INSERT-ului (pentru stratul
 * 0). Fiecare entitate vizitată se numără în lucru: o bombă de blocuri se oprește la plafon.
 */
function parcurge(lista: readonly EntitateDxf[], M: Matrice, mostenit: string | null, adancime: number, st: Stare): void {
  for (const e of lista) {
    lucreaza(st);
    try {
      if (numar(e.g, 67, 0) === 1) {
        st.n.hartie++;
        continue;
      }
      const propriu = nume(primul(e.g, 8) ?? '0');
      const strat = stratul(st, propriu === '0' && mostenit !== null ? mostenit : propriu);
      const invizibila = numar(e.g, 60, 0) === 1;
      if (e.tip === 'INSERT') {
        // Pe un strat înghețat, INSERT-ul e ascuns cu tot ce are; pe unul oprit, doar ce moștenește stratul lui (ca în AutoCAD).
        if (invizibila || strat.inghetat) {
          st.n.ascunse++;
          continue;
        }
        insereaza(e, M, strat.nume, adancime, st);
        continue;
      }
      if (invizibila || strat.oprit || strat.inghetat) {
        st.n.ascunse++;
        continue;
      }
      const f = figura(e, st);
      if (f === 'degenerata') st.n.degenerate++;
      else if (typeof f === 'string') st.n[f]++;
      else emite(f, M, strat.nume, st);
    } catch (x) {
      if (!(x instanceof Invalid)) throw x;
      st.n['eroare-date']++;
    }
  }
}

/** INSERT: T(punct) · R(rotire) · T(celula matricei) · S(scara) · T(−baza), în OCS-ul lui; atributele sunt text, sărite. */
function insereaza(e: EntitateDxf, M: Matrice, strat: string, adancime: number, st: Stare): void {
  const n = (cod: number, implicit = 0): number => numar(e.g, cod, implicit);
  st.n['sarit-text'] += e.atribute ?? 0;
  const bloc = st.blocuri.get(nume(primul(e.g, 2) ?? '').toUpperCase());
  if (!bloc) {
    st.n['blocuri-lipsa']++;
    return;
  }
  if (bloc.xref) {
    st.n.xref++;
    return;
  }
  if (adancime >= ADANCIME_MAXIMA) {
    st.n['blocuri-adanci']++;
    return;
  }
  const O = cadru(e.g);
  if (O === 'inclinat') {
    st.n.inclinate++;
    return;
  }
  const sx = n(41, 1), sy = n(42, 1);
  if (sx === 0 || sy === 0) {
    st.n.singulare++;
    return;
  }
  const coloane = Math.max(1, Math.trunc(n(70, 1))), randuri = Math.max(1, Math.trunc(n(71, 1)));
  const dx = n(44), dy = n(45);
  const TR = compune(translatie(n(10), n(20)), rotatie(n(50)));
  const SB = compune(scalare(sx, sy), translatie(-bloc.baza.x, -bloc.baza.y));
  for (let r = 0; r < randuri; r++) {
    for (let c = 0; c < coloane; c++) {
      const celula = coloane === 1 && randuri === 1 ? compune(TR, SB) : compune(TR, compune(translatie(c * dx, r * dy), SB));
      parcurge(bloc.entitati, compune(M, compune(O, celula)), strat, adancime + 1, st);
    }
  }
}

/**
 * Figura, prin matricea totală (blocurile, unitățile și OCS-ul ei), în segmente în mm. Arcul trece exact printr-o
 * similitudine; sub una neuniformă devine arc de elipsă, în cubice sub `TOLERANTA_IMPORT` (numărate); cu raza peste latura
 * documentului, la fel (`arce-plate`, ca la ușa SVG). Spline-ul se aproximează sub toleranța împărțită la cât lungește
 * matricea.
 */
function emite(f: Figura, M: Matrice, strat: string, st: Stare): void {
  const T = compune(M, f.O);
  const det = determinantNormat(T);
  if (!(Math.abs(det) > 1e-12)) {
    st.n.singulare++;
    return;
  }
  const sim = similitudine(T);
  const scara = Math.hypot(T.a, T.b);
  const semn = det < 0 ? -1 : 1;
  const segs: Seg[] = [];
  let eliptice = 0, plate = 0, cubice = 0;
  const pune = (s: Seg): void => {
    lucreaza(st);
    segs.push(s);
  };
  const elipsa = (h: HartaElipsa, t0: number, dt: number, start: Punct, stop: Punct): boolean => {
    const k = bucatiArcEliptic(h, dt, TOLERANTA_IMPORT);
    if (!(k <= PLAFON.varfuriCale)) return false;
    let p0 = start;
    for (const q of arcEliptic(h, t0, dt, start, stop, TOLERANTA_IMPORT)) {
      pune({ k: 'C', a: p0, c1: q.c1, c2: q.c2, b: q.b });
      p0 = q.b;
      cubice++;
    }
    return true;
  };
  const punctElipsa = (h: HartaElipsa, t: number): Punct => ({ x: h.a * Math.cos(t) + h.c * Math.sin(t) + h.e, y: h.b * Math.cos(t) + h.d * Math.sin(t) + h.f });
  const arcul = (x: BrutA): boolean => {
    const a = aplica(T, x.a), b = aplica(T, x.b);
    const r = x.r * scara;
    if (sim && r <= PLAFON.latura * 0.999) {
      if (a.x === b.x && a.y === b.y && Math.abs(x.da) < Math.PI) return true;
      pune({ k: 'A', a, b, c: aplica(T, x.c), r, da: semn * x.da, ...(x.bulge !== undefined ? { bulge: semn * x.bulge } : {}) });
      return true;
    }
    if (sim) plate++;
    else eliptice++;
    const h = compune(T, { a: x.r, b: 0, c: 0, d: x.r, e: x.c.x, f: x.c.y });
    // Capetele, din fișier; un cerc întreg se închide în același punct.
    return elipsa(h, x.a0, x.da, a, Math.abs(Math.abs(x.da) - 2 * Math.PI) < 1e-12 ? a : b);
  };
  for (const s of f.segs) {
    let bun = true;
    if (s.k === 'L') {
      const a = aplica(T, s.a), b = aplica(T, s.b);
      if (a.x !== b.x || a.y !== b.y) pune({ k: 'L', a, b });
    } else if (s.k === 'C') {
      const a = aplica(T, s.a), b = aplica(T, s.b), c1 = aplica(T, s.c1), c2 = aplica(T, s.c2);
      if (![b, c1, c2].every((q) => q.x === a.x && q.y === a.y)) pune({ k: 'C', a, c1, c2, b });
    } else if (s.k === 'A') {
      bun = arcul(s);
    } else if (s.k === 'E') {
      const h = compune(T, s.h);
      const start = punctElipsa(h, s.t0);
      eliptice++;
      bun = elipsa(h, s.t0, s.dt, start, s.intreaga ? start : punctElipsa(h, s.t0 + s.dt));
    } else {
      const r = segmenteSpline(s, TOLERANTA_IMPORT / Math.max(valoareSingularaMaxima(T), 1e-300), st);
      if (r.aproximat) st.n['spline-aproximate']++;
      for (const x of r.segs) {
        if (x.k === 'L') pune({ k: 'L', a: aplica(T, x.a), b: aplica(T, x.b) });
        else if (x.k === 'C') pune({ k: 'C', a: aplica(T, x.a), c1: aplica(T, x.c1), c2: aplica(T, x.c2), b: aplica(T, x.b) });
        else if (x.k === 'A') bun = arcul(x) && bun;
      }
    }
    // Plafonul căii, pe vârfuri: una deschisă are și punctul final. Peste el, bucata se sare înainte de legare.
    if (!bun || segs.length + (f.inchis ? 0 : 1) > PLAFON.varfuriCale) {
      st.n['prea-mari']++;
      return;
    }
  }
  st.n['arce-eliptice'] += eliptice;
  st.n['arce-plate'] += plate;
  st.n['cubice-din-arce'] += cubice;
  if (segs.length === 0) {
    st.n.degenerate++;
    return;
  }
  st.bucati.push({ segs, inchis: f.inchis, strat, ordine: st.bucati.length });
}

/* ── Legarea capetelor ─────────────────────────────────────────────────────────────────────────────────────────────── */

const inversat = (s: Seg): Seg => {
  if (s.k === 'L') return { k: 'L', a: s.b, b: s.a };
  if (s.k === 'C') return { k: 'C', a: s.b, c1: s.c2, c2: s.c1, b: s.a };
  return { k: 'A', a: s.b, b: s.a, c: s.c, r: s.r, da: -s.da, ...(s.bulge !== undefined ? { bulge: -s.bulge } : {}) };
};
const inceput = (b: readonly Seg[]): Punct => (b[0] as Seg).a;
const sfarsit = (b: readonly Seg[]): Punct => (b[b.length - 1] as Seg).b;

type Lant = { readonly segs: Seg[]; readonly inchis: boolean; readonly strat: string; readonly ordine: number };

/**
 * Bucățile deschise ale aceluiași strat, legate capăt la capăt (ADR 0101 §7): două capete la cel mult `REZOLUTIE` unul de
 * altul, și doar două (trei sau mai multe, ca în T, rămân nelegate). Golul de peste `TOLERANTA_IMPORT` se închide cu o
 * linie (numărată); sub, capetele se lipesc. Un lanț care se întoarce în el însuși e închis.
 */
function leaga(bucati: readonly Bucata[], n: Numaratoare): Lant[] {
  const rez: Lant[] = bucati.filter((b) => b.inchis).map((b) => ({ segs: b.segs, inchis: true, strat: b.strat, ordine: b.ordine }));
  const peStrat = new Map<string, Bucata[]>();
  for (const b of bucati) {
    if (b.inchis) continue;
    const k = b.strat.toUpperCase();
    const lista = peStrat.get(k);
    if (lista) lista.push(b);
    else peStrat.set(k, [b]);
  }
  for (const grup of peStrat.values()) rez.push(...lanturi(grup, n));
  return rez.sort((a, b) => a.ordine - b.ordine);
}

function lanturi(P: readonly Bucata[], n: Numaratoare): Lant[] {
  const k = P.length;
  // Capătul j: bucata j >> 1, începutul (j par) sau sfârșitul (j impar).
  const capat = (j: number): Punct => {
    const b = (P[j >> 1] as Bucata).segs;
    return j & 1 ? sfarsit(b) : inceput(b);
  };
  const tata = Array.from({ length: 2 * k }, (_, i) => i);
  const radacina = (i: number): number => {
    let r = i;
    while (tata[r] !== r) r = tata[r] as number;
    while (tata[i] !== r) { const u = tata[i] as number; tata[i] = r; i = u; }
    return r;
  };
  const celule = new Map<string, number[]>();
  const cheie = (x: number, y: number): string => `${x},${y}`;
  for (let j = 0; j < 2 * k; j++) {
    const p = capat(j);
    const cx = Math.floor(p.x / REZOLUTIE), cy = Math.floor(p.y / REZOLUTIE);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (const l of celule.get(cheie(cx + dx, cy + dy)) ?? []) {
          const q = capat(l);
          if (Math.hypot(p.x - q.x, p.y - q.y) <= REZOLUTIE) tata[radacina(j)] = radacina(l);
        }
      }
    }
    const c = cheie(cx, cy);
    const aici = celule.get(c);
    if (aici) aici.push(j);
    else celule.set(c, [j]);
  }
  const membri = new Map<number, number[]>();
  for (let j = 0; j < 2 * k; j++) {
    const r = radacina(j);
    const m = membri.get(r);
    if (m) m.push(j);
    else membri.set(r, [j]);
  }
  const partener = new Int32Array(2 * k).fill(-1);
  for (const m of membri.values()) {
    if (m.length !== 2) continue;
    const [a, b] = m as [number, number];
    partener[a] = b;
    partener[b] = a;
  }
  const vazute = new Uint8Array(k);
  const rez: Lant[] = [];
  for (let i = 0; i < k; i++) {
    if (vazute[i]) continue;
    // Înapoi, de la începutul bucății i, până la un capăt liber (sau până înapoi la ea: un ciclu).
    let j = 2 * i;
    for (let pasi = 0; pasi < k; pasi++) {
      const p = partener[j] as number;
      if (p < 0) break;
      if (p >> 1 === i) { j = 2 * i; break; }
      j = p ^ 1;
    }
    const start = j;
    const parti: Array<{ readonly b: number; readonly inv: boolean }> = [];
    let inchis = false;
    for (;;) {
      const b = j >> 1;
      parti.push({ b, inv: (j & 1) === 1 });
      vazute[b] = 1;
      const p = partener[j ^ 1] as number;
      if (p < 0) break;
      if (p === start) { inchis = true; break; }
      if (vazute[p >> 1]) break;
      j = p;
    }
    const segs: Seg[] = [];
    const lipeste = (urm: readonly Seg[]): void => {
      if (segs.length > 0) {
        const a = sfarsit(segs), b = inceput(urm);
        if (Math.hypot(a.x - b.x, a.y - b.y) > TOLERANTA_IMPORT) {
          segs.push({ k: 'L', a, b });
          n.goluri++;
        }
      }
      segs.push(...urm);
    };
    for (const { b, inv } of parti) {
      const s = (P[b] as Bucata).segs;
      lipeste(inv ? [...s].reverse().map(inversat) : s);
    }
    if (inchis) {
      const a = sfarsit(segs), b = inceput(segs);
      if (Math.hypot(a.x - b.x, a.y - b.y) > TOLERANTA_IMPORT) {
        segs.push({ k: 'L', a, b });
        n.goluri++;
      }
    }
    if (parti.length > 1) n.unite += parti.length;
    rez.push({ segs, inchis, strat: (P[i] as Bucata).strat, ordine: Math.min(...parti.map((x) => (P[x.b] as Bucata).ordine)) });
  }
  return rez;
}

/* ── Calea finală ──────────────────────────────────────────────────────────────────────────────────────────────────── */

const peAcelasiCerc = (p: Extract<Seg, { k: 'A' }>, q: Extract<Seg, { k: 'A' }>): boolean =>
  Math.abs(p.r - q.r) <= 1e-9 * p.r && Math.hypot(p.c.x - q.c.x, p.c.y - q.c.y) <= 1e-9 * p.r && Math.sign(p.da) === Math.sign(q.da)
  && Math.abs(p.da + q.da) <= 2 * Math.PI + 1e-12;

/** Arcele vecine pe același cerc, în același sens, devin unul (cercul NURBS din patru sferturi, semicercurile legate). */
function unesteArce(segs: readonly Seg[], inchis: boolean): Seg[] {
  const rez: Seg[] = [];
  for (const s of segs) {
    const q = rez[rez.length - 1];
    if (q && q.k === 'A' && s.k === 'A' && peAcelasiCerc(q, s)) rez[rez.length - 1] = { k: 'A', a: q.a, b: s.b, c: q.c, r: q.r, da: q.da + s.da };
    else rez.push(s);
  }
  // Pe o cale închisă, și ultimul cu primul.
  const p = rez[0], u = rez[rez.length - 1];
  if (inchis && rez.length > 1 && p && u && p.k === 'A' && u.k === 'A' && peAcelasiCerc(u, p)) {
    rez[0] = { k: 'A', a: u.a, b: p.b, c: u.c, r: u.r, da: u.da + p.da };
    rez.pop();
  }
  return rez;
}

/** Vârfurile căii: fiecare segment cu începutul lui; arcul de peste 180°, în două jumătăți (ca la ușa SVG). */
function varfuriCale(segs: readonly Seg[]): Varf[] {
  const v: Varf[] = [];
  for (const s of segs) {
    if (s.k === 'L') v.push({ p: s.a, s: LINIE });
    else if (s.k === 'C') v.push({ p: s.a, s: { tip: 'C', c1: s.c1, c2: s.c2 } });
    else if (Math.abs(s.da) > Math.PI) {
      const a0 = Math.atan2(s.a.y - s.c.y, s.a.x - s.c.x) + s.da / 2;
      const jum: Segment = arc(Math.tan(s.da / 8));
      v.push({ p: s.a, s: jum }, { p: { x: s.c.x + s.r * Math.cos(a0), y: s.c.y + s.r * Math.sin(a0) }, s: jum });
    } else v.push({ p: s.a, s: arc(s.bulge ?? Math.tan(s.da / 4)) });
  }
  return v;
}

/**
 * Calea finală a unui lanț, cu verificările ușii SVG (ADR 0037 §11): plafonul, bucla dintr-o cubică, calea fără arie (o
 * linie, cu drumul înapoi), praful. Un cerc întreg devine cele două semicercuri ale lui `conturCerc`.
 */
function caleFinala(l: Lant, n: Numaratoare): CaleCitita | null {
  const segs = unesteArce(l.segs, l.inchis);
  const u = segs[0];
  if (l.inchis && segs.length === 1 && u && u.k === 'A' && Math.abs(Math.abs(u.da) - 2 * Math.PI) <= 1e-9) {
    const c = conturCerc(u.c.x, u.c.y, u.r);
    if (praf(c.varfuri)) {
      n['sub-rezolutie']++;
      return null;
    }
    return { varfuri: [...c.varfuri], inchis: true };
  }
  const varfuri = varfuriCale(segs);
  if (!l.inchis) {
    const d = deschisa(varfuri, sfarsit(segs));
    if (d === 'prea-mare') n['prea-mari']++;
    else if (d === 'degenerata') n.degenerate++;
    return typeof d === 'string' ? null : d;
  }
  if (varfuri.length > PLAFON.varfuriCale) {
    n['prea-mari']++;
    return null;
  }
  const unic = varfuri[0];
  if (varfuri.length === 1 && unic && unic.s.tip === 'C') {
    const b = bucla(unic.p, unic.s.c1, unic.s.c2);
    if (praf(b)) {
      n['sub-rezolutie']++;
      return null;
    }
    return { varfuri: b, inchis: true };
  }
  if (varfuri.length < 2) {
    n.degenerate++;
    return null;
  }
  const start = (varfuri[0] as Varf).p;
  const linie = (): CaleCitita | null => {
    const d = deschisa(varfuri, start);
    if (d === 'prea-mare') n['prea-mari']++;
    else if (d === 'degenerata') n.degenerate++;
    return typeof d === 'string' ? null : d;
  };
  if (varfuri.every((v) => v.s.tip === 'L') && peODreapta(varfuri)) return linie();
  if (praf(varfuri)) {
    n['sub-rezolutie']++;
    return null;
  }
  if (varfuri.every((v) => v.s.tip !== 'A') && peODreapta(varfuri, REZOLUTIE / 2)) return linie();
  return { varfuri, inchis: true };
}

/* ── Ușa ───────────────────────────────────────────────────────────────────────────────────────────────────────────── */

export function citesteDxf(octeti: Uint8Array, optiuni: OptiuniDxf = {}): RezultatDxf {
  if (octeti.length > PLAFON_IMPORT.octeti) return { ok: false, cod: 'octeti', detaliu: String(octeti.length) };
  if (new TextDecoder('windows-1252').decode(octeti.subarray(0, 18)) === 'AutoCAD Binary DXF') return { ok: false, cod: 'binar' };
  const p = perechi(textul(octeti));
  if (p === 'tip') return { ok: false, cod: 'tip' };
  if ('linie' in p) return { ok: false, cod: 'dxf', detaliu: String(p.linie) };
  const s = sectiuni(p);
  const n = Object.fromEntries(CODURI_AVERTISMENT_DXF.map((c) => [c, 0])) as Numaratoare;

  // Antetul n-are înregistrări cu cod 0: variabilele se citesc direct din perechi, (9, $NUME) urmat de valoare.
  const versiune = antetVariabila(p, '$ACADVER') ?? null;
  const codUnitati = antetVariabila(p, '$INSUNITS');
  const cod = codUnitati === undefined || !/^-?\d+$/.test(codUnitati) ? null : Number(codUnitati);
  const declarat = cod !== null && cod !== 0 ? MM_INSUNITS[cod] : undefined;
  if (declarat === undefined) n[cod === null || cod === 0 ? 'unitati-nedeclarate' : 'unitati-necunoscute'] = 1;
  const ales = optiuni.unitate ?? 'mm';
  const unitati: UnitatiDxf = declarat !== undefined
    ? { mmPeUnitate: declarat, declarate: true, cod, unitate: UNITATI_DXF.find((u) => MM_PE_UNITATE[u] === declarat) ?? null }
    : { mmPeUnitate: MM_PE_UNITATE[ales], declarate: false, cod, unitate: ales };

  // Straturile (oprite: culoarea negativă; înghețate: steagul 1).
  const straturi = new Map<string, Strat>();
  for (const r of s.get('TABLES') ?? []) {
    if (r.tip !== 'LAYER') continue;
    const numeS = nume(primul(r.g, 2) ?? '');
    if (numeS === '') continue;
    let steaguri = 0, culoare = 7;
    try {
      steaguri = numar(r.g, 70, 0);
      culoare = numar(r.g, 62, 7);
    } catch {
      // un strat cu numere stricate: vizibil
    }
    straturi.set(numeS.toUpperCase(), { nume: numeS, oprit: culoare < 0, inghetat: (steaguri & 1) === 1 });
  }

  // Blocurile: BLOCK, entitățile, ENDBLK.
  const blocuri = new Map<string, Bloc>();
  const rb = s.get('BLOCKS') ?? [];
  for (let i = 0; i < rb.length; i++) {
    const r = rb[i] as Inreg;
    if (r.tip !== 'BLOCK') continue;
    let j = i + 1;
    while (j < rb.length && (rb[j] as Inreg).tip !== 'ENDBLK') j++;
    const numeB = nume(primul(r.g, 2) ?? primul(r.g, 3) ?? '');
    let baza = { x: 0, y: 0 }, steaguri = 0;
    try {
      baza = { x: numar(r.g, 10, 0), y: numar(r.g, 20, 0) };
      steaguri = numar(r.g, 70, 0);
    } catch {
      // baza stricată: originea
    }
    if (numeB !== '' && !blocuri.has(numeB.toUpperCase())) blocuri.set(numeB.toUpperCase(), { baza, xref: (steaguri & 12) !== 0, entitati: entitati(rb, i + 1, j) });
    i = j;
  }

  const re = s.get('ENTITIES') ?? [];
  const st: Stare = { n, lucru: { n: 0 }, straturi, blocuri, bucati: [] };
  try {
    parcurge(entitati(re, 0, re.length), scalare(unitati.mmPeUnitate), null, 0, st);
  } catch (e) {
    if (e instanceof PestePlafon) return { ok: false, cod: 'plafon', detaliu: String(PLAFON_IMPORT.varfuriLucru), avertismente: n };
    throw e;
  }

  const cai: CaleDxf[] = [];
  for (const l of leaga(st.bucati, n)) {
    const c = caleFinala(l, n);
    if (!c) continue;
    if (!c.inchis) n.deschise++;
    cai.push({ varfuri: c.varfuri, inchis: c.inchis, strat: l.strat });
  }
  // Ca la ușa SVG: fiecare punct în margini, și față de colțul cutiei desenului (unde stă instanța piesei).
  let departe = cai.some((c) => !c.varfuri.every((v) => inMargini(v)));
  if (!departe && cai.length > 0) {
    let minX = Infinity, minY = Infinity;
    for (const c of cai) {
      const k = cutieContur({ inchis: c.inchis, varfuri: c.varfuri });
      minX = Math.min(minX, k.minX);
      minY = Math.min(minY, k.minY);
    }
    departe = cai.some((c) => c.varfuri.some((v) => [v.p, ...(v.s.tip === 'C' ? [v.s.c1, v.s.c2] : [])]
      .some((q) => !(Math.abs(q.x - minX) <= PLAFON.translatie && Math.abs(q.y - minY) <= PLAFON.translatie))));
  }
  if (departe) return { ok: false, cod: 'departe', avertismente: n };
  const primite = cai.reduce((x, c) => x + c.varfuri.length, 0);
  if (primite > PLAFON.varfuri) return { ok: false, cod: 'plafon', detaliu: String(primite), avertismente: n };
  if (cai.length === 0) return { ok: false, cod: 'gol', avertismente: n };
  return { ok: true, cai, unitati, versiune, avertismente: n };
}

/** O variabilă a antetului, din perechi: valoarea de după (9, nume). */
function antetVariabila(p: Perechi, numeVar: string): string | undefined {
  for (let i = 0; i + 1 < p.coduri.length; i++) {
    if (p.coduri[i] === 0 && (p.valori[i] ?? '').toUpperCase() === 'ENDSEC') return undefined;
    if (p.coduri[i] === 9 && (p.valori[i] ?? '').toUpperCase() === numeVar) return p.valori[i + 1];
  }
  return undefined;
}
