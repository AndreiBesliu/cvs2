/**
 * Ușa EPS și AI ≤ 8 (ADR 0115): octeții unui PostScript încapsulat (și ai unui EPS binar DOS, cu previzualizarea lui), sau ai
 * unui fișier Illustrator de dinainte de versiunea 9 (PostScript cu operatorii AI) → căile, închise sau deschise, în mm, cu Y
 * în sus, față de originea PostScript (desenul stă unde e în fișier, ca la DXF), fiecare cu stratul ei AI, plus raportul.
 *
 * Cititorul e limitat (decizia din 07.10, ADR 0115 §2): un program PostScript în linie dreaptă. Ține stiva, aritmetica,
 * dicționarele (`def`, `begin` / `end`, `<< >>`), tablourile, procedurile definite (executate la chemare, cu `bind`), starea
 * grafică (`gsave` / `grestore`, `save` / `restore`, `concat`, `translate`, `scale`, `rotate`, `setmatrix`), căile (`moveto`,
 * `lineto`, `curveto`, `closepath`, cu relativele, și dreptunghiurile `rectfill`, `rectstroke`) și pictarea (`fill`,
 * `eofill`, `stroke`; decupajul nu se aplică). Buclele și condițiile (`for`, `repeat`, `if` …) cer un interpretor adevărat:
 * refuzate, cu operatorul. Textul, imaginile (cu datele lor din fișier) și umbririle se sar, numărate, ca la PDF (ADR 0104).
 *
 * Un fișier Illustrator ≤ 8 se citește după nume: prologul (procedurile Adobe, cu condiții) și setup-ul se sar, iar
 * operatorii AI ai corpului (`m l c v y` și perechile lor mari, `h H`, `f F s S b B n N`, calea compusă `*u … *U`, decupajul
 * `q W Q`, straturile `Lb Ln LB`, textul `To … TO`, rasterul `XI`, regula de umplere `XR`) se citesc direct; un operator AI
 * pe care cititorul nu-l folosește (culorile, stilurile) se sare, ca operatorii necunoscuți la PDF.
 */
import { LINIE, type Punct, type Varf } from '../geom/contur.ts';
import { aplica, compune, IDENTITATE, rotatie, scalare, translatie, type Matrice } from '../geom/matrice.ts';
import { PLAFON } from '../model/document.ts';
import { incheieSubcalea, normalizeazaForma, preaDeparte, type CaleCitita } from './caleImport.ts';
import { CODURI_AVERTISMENT_EPS, type AvertismenteEps, type CodAvertismentEps, type CodRefuzEps } from './epsCoduri.ts';
import { latin1 } from './pdfObiecte.ts';
import {
  Comentariu, EroarePs, Fisier, LexerPs, MARCA, Marca, Nume, NumeImediat, Operator, Procedura, Salvare, Sir,
  type Dictionar, type Jeton, type Val,
} from './psLexic.ts';
import { PLAFON_IMPORT } from './svgCoduri.ts';

export { CODURI_AVERTISMENT_EPS, type AvertismenteEps, type CodAvertismentEps, type CodRefuzEps } from './epsCoduri.ts';

/** O cale a desenului, în mm. O cale deschisă are vârfurile plus punctul final (n vârfuri, n − 1 segmente). */
export type CaleEps = { readonly varfuri: readonly Varf[]; readonly inchis: boolean; readonly strat: string | null };

export type RezultatEps =
  | {
    readonly ok: true;
    readonly cai: readonly CaleEps[];
    /** Straturile AI ale căilor importate, în ordinea în care apar. */
    readonly straturi: readonly string[];
    /** Citit ca fișier Illustrator ≤ 8 (operatorii AI după nume). */
    readonly illustrator: boolean;
    readonly avertismente: AvertismenteEps;
  }
  | {
    readonly ok: false;
    readonly cod: CodRefuzEps | 'octeti' | 'gol' | 'departe' | 'plafon';
    readonly detaliu?: string;
    readonly avertismente?: AvertismenteEps;
  };

type Numaratoare = Record<CodAvertismentEps, number>;

const MM_PE_PT = 25.4 / 72;
/** Procedurile chemate una din alta (și acoladele imbricate): mai adânc, fișierul e greșit. */
const ADANCIME_MAXIMA = 100;
/** Operatorii executați: peste atât, citirea se oprește (proceduri care se cheamă de două ori fiecare, pe zeci de niveluri). */
const OPERATII_MAXIME = 20_000_000;
/** Elementele stivei sau ale unui tablou, octeții unui șir: peste atât, fișierul cere prea multă memorie. */
const ELEMENTE_MAXIME = 1_000_000;
/** Numele dintr-un refuz (scris de fișier): tăiat. */
const NUME_IN_REFUZ = 40;

/* ── Operatorii ────────────────────────────────────────────────────────────────────────────────────────────────────── */

/** Operatorii care cer un interpretor adevărat (bucle, condiții, ieșiri): refuzați cu numele lor (`control`). */
const CONTROL = ['if', 'ifelse', 'for', 'repeat', 'loop', 'forall', 'exit', 'stop', 'stopped', 'pathforall', 'resourceforall', 'filenameforall'];

/** Operatorii stării grafice și ai mediului, fără efect asupra căilor, cu câți operanzi iau. */
const IGNORATI: Readonly<Record<string, number>> = {
  setlinewidth: 1, setlinecap: 1, setlinejoin: 1, setmiterlimit: 1, setdash: 2, setflat: 1, setgray: 1, setrgbcolor: 3,
  sethsbcolor: 3, setcmykcolor: 4, setoverprint: 1, setstrokeadjust: 1, setsmoothness: 1, setscreen: 3, settransfer: 1,
  setcolortransfer: 4, setblackgeneration: 1, setundercolorremoval: 1, sethalftone: 1, setcolorrendering: 1, setpattern: 1,
  setpagedevice: 1, setglobal: 1, setpacking: 1, setuserparams: 1, setsystemparams: 1, setvmthreshold: 1, setobjectformat: 1,
  setshared: 1, setcachedevice: 6, setcachedevice2: 10, setcharwidth: 2, setcachelimit: 1, print: 1, '=': 1, '==': 1,
  flushfile: 1, closefile: 1, resetfile: 1, echo: 1, setfont: 1, selectfont: 2, undefinefont: 1, pstack: 0, stack: 0, flush: 0,
  initclip: 0, flattenpath: 0,
};

/** Operatorii pe care cititorul îi execută (și cei de control, ca să-i refuze cu numele lor). */
const OPERATORI: readonly string[] = [
  ...CONTROL, ...Object.keys(IGNORATI),
  // stiva
  'pop', 'exch', 'dup', 'copy', 'index', 'roll', 'clear', 'count', 'mark', '[', '<<', 'cleartomark', 'counttomark', ']', '>>',
  // aritmetica și relațiile
  'add', 'sub', 'mul', 'div', 'idiv', 'mod', 'neg', 'abs', 'ceiling', 'floor', 'round', 'truncate', 'sqrt', 'atan', 'sin',
  'cos', 'exp', 'ln', 'log', 'cvi', 'cvr', 'eq', 'ne', 'gt', 'ge', 'lt', 'le', 'and', 'or', 'xor', 'not', 'bitshift', 'true',
  'false', 'null', 'exec',
  // dicționarele, tablourile, șirurile, tipurile
  'dict', 'begin', 'end', 'def', 'load', 'store', 'known', 'where', 'currentdict', 'userdict', 'systemdict', 'globaldict',
  'statusdict', 'errordict', '$error', 'countdictstack', 'cleardictstack', 'undef', 'maxlength', 'get', 'put', 'length',
  'getinterval', 'putinterval', 'array', 'astore', 'aload', 'string', 'cvs', 'cvn', 'cvlit', 'cvx', 'xcheck', 'rcheck', 'wcheck',
  'readonly', 'executeonly', 'noaccess', 'type', 'bind',
  // mediul
  'languagelevel', 'version', 'product', 'revision', 'serialnumber', 'vmstatus', 'currentglobal', 'currentpacking',
  'currentshared', 'pdfmark', 'currentfile', 'filter', 'setcolorspace', 'setcolor', 'makepattern',
  // fonturile și textul (sărit)
  'findfont', 'scalefont', 'makefont', 'definefont', 'currentfont', 'defineresource', 'findresource', 'show', 'ashow',
  'widthshow', 'awidthshow', 'xshow', 'yshow', 'xyshow', 'glyphshow', 'cshow', 'kshow', 'charpath',
  // imaginile și umbririle (sărite)
  'image', 'imagemask', 'colorimage', 'shfill',
  // starea grafică și matricele
  'gsave', 'grestore', 'grestoreall', 'save', 'restore', 'initgraphics', 'concat', 'translate', 'scale', 'rotate', 'setmatrix',
  'currentmatrix', 'matrix', 'identmatrix', 'defaultmatrix', 'initmatrix', 'concatmatrix', 'invertmatrix', 'transform',
  'itransform', 'dtransform', 'idtransform',
  // căile și pictarea
  'newpath', 'moveto', 'rmoveto', 'lineto', 'rlineto', 'curveto', 'rcurveto', 'closepath', 'currentpoint', 'fill', 'eofill',
  'stroke', 'clip', 'eoclip', 'rectfill', 'rectstroke', 'rectclip', 'showpage', 'copypage', 'quit',
];

/** Operatorii AI ≤ 8 citiți după nume (ADR 0115 §4); ceilalți operatori AI (culorile, stilurile) se sar. */
const OPERATORI_AI: readonly string[] = [
  'm', 'l', 'L', 'c', 'C', 'v', 'V', 'y', 'Y', 'h', 'H', 'f', 'F', 's', 'S', 'b', 'B', 'n', 'N', '*u', '*U', 'u', 'U', 'q', 'Q',
  'W', 'Lb', 'Ln', 'LB', 'To', 'TO', 'XI', 'XR',
];
const AI = new Set(OPERATORI_AI);

/* ── Antetul ───────────────────────────────────────────────────────────────────────────────────────────────────────── */

/**
 * PostScript-ul fișierului: tot, sau secțiunea PostScript a unui EPS binar DOS (antetul C5 D0 D3 C6, cu poziția și lungimea
 * ei; previzualizarea TIFF sau WMF se sare). Un ^D (EOT) de la început, scris de unele drivere, se sare.
 */
function postscript(b: Uint8Array): Uint8Array | null {
  let ps = b;
  if (b[0] === 0xc5 && b[1] === 0xd0 && b[2] === 0xd3 && b[3] === 0xc6) {
    if (b.length < 30) return null;
    const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
    const poz = dv.getUint32(4, true), lung = dv.getUint32(8, true);
    if (poz < 30 || lung === 0 || poz + lung > b.length) return null;
    ps = b.subarray(poz, poz + lung);
  }
  let k = 0;
  while (ps[k] === 4) k++;
  return ps[k] === 0x25 && ps[k + 1] === 0x21 ? ps.subarray(k) : null;
}

type Antet = {
  /** `%%Creator`, pentru refuzul unui Illustrator nou. */
  readonly creator: string;
  /** Fișier Illustrator ≤ 8 (sau scris în formatul lui, cu comentariile `%AI3_` … `%AI8_`): operatorii AI după nume. */
  readonly ai: boolean;
  /** Scris de Illustrator 9 sau mai nou: PostScript prin procedurile Adobe, refuzat (`ai-nou`). */
  readonly aiNou: boolean;
};

/**
 * Comentariile antetului (până la `%%EndComments` sau la primul rând care nu e comentariu). Versiunea Illustrator vine din
 * `%%AI8_CreatorVersion`, apoi din primul număr de după „Illustrator” în `%%Creator` (Illustrator 88 scrie 88: vechi).
 */
function antet(ps: Uint8Array): Antet {
  const linii = latin1(ps.subarray(0, Math.min(ps.length, 65536))).split(/\r\n|\r|\n/);
  let creator = '', versiune: number | null = null, formatAi = false, aiNou = false;
  for (const l of linii.slice(1)) {
    if (!l.startsWith('%') || l.startsWith('%%EndComments')) break;
    if (l.startsWith('%%Creator:')) creator = l.slice(10).trim();
    const v = /^%%?AI8_CreatorVersion:\s*(\d+)/.exec(l);
    if (v) versiune = Number(v[1]);
    if (/^%%?AI[3-8]_/.test(l)) formatAi = true;
    if (/^%%?AI(9|1\d|2\d)_/.test(l)) aiNou = true;
  }
  const illustrator = /Adobe\s+Illustrator/i.test(creator);
  if (illustrator && versiune === null) {
    const m = /Illustrator\D*?(\d+)/i.exec(creator);
    // CS și CC (scrise uneori în locul numărului) sunt de la versiunea 11 încolo.
    versiune = /\bC[SC]\d*\b/.test(creator) ? 11 : m ? Number(m[1]) : null;
  }
  // Illustrator 9 … 79 (CS și CC scriu 11 …): PostScript-ul procedurilor Adobe. 88 (și 1.x, 3.x … 8.x): formatul AI.
  if (illustrator && versiune !== null && versiune >= 9 && versiune < 80) aiNou = true;
  return { creator, ai: !aiNou && (illustrator || formatAi), aiNou };
}

/* ── Interpretorul ─────────────────────────────────────────────────────────────────────────────────────────────────── */

/** O subcale în construcție, în pt (spațiul implicit): startul, punctul curent, segmentele (fiecare din vârful lui). */
type Subcale = { readonly start: Punct; cur: Punct; readonly varfuri: Varf[]; desenate: number; autor: boolean };
/**
 * Calea curentă (parte din starea grafică, ca în PostScript): `id` o recunoaște după `gsave fill grestore stroke` (o singură
 * formă), `decupaj` după `clip`, `necunoscut` după un text (punctul curent s-a mutat cu lățimea textului, necunoscută).
 */
type Cale = { subcai: Subcale[]; curenta: Subcale | null; id: number; decupaj: boolean; necunoscut: boolean };
/** Starea grafică: matricea, calea, regula de umplere a unui AI (`XR`) și câte componente are culoarea (`setcolor`). */
type Stare = { ctm: Matrice; cale: Cale; impar: boolean; componente: number };
/** O cale pictată: subcăile ei citite (în mm), regula de umplere și stratul. */
type FormaEps = { readonly cai: readonly CaleCitita[]; readonly nonzero: boolean; readonly strat: string | null };
type Strat = { readonly vizibil: boolean; nume: string | null };
/** Forma datelor unei imagini: nu vin din fișier, hex, binare, ASCII85, ASCIIHex, sau altfel (din fișier, nu se pot sări). */
type FelDate = 'nu' | 'hex' | 'binar' | 'ascii85' | 'asciihex' | 'necunoscut';

class RefuzPs extends Error {
  readonly cod: CodRefuzEps;
  readonly detaliu: string;
  constructor(cod: CodRefuzEps, detaliu: string) {
    super(`${cod}: ${detaliu}`);
    this.cod = cod;
    this.detaliu = detaliu.slice(0, NUME_IN_REFUZ);
  }
}
class PestePlafon extends Error {
  readonly detaliu: string;
  constructor(detaliu: string) {
    super(detaliu);
    this.detaliu = detaliu;
  }
}

/** Comentariile care încheie desenul: după ele vin doar curățenia și datele previzualizării. */
const SFARSIT = ['%%PageTrailer', '%%Trailer', '%%EOF'];
/** Secțiunile sărite într-un fișier Illustrator (procedurile, setup-ul, definițiile din paletă, documentele plasate). */
const SECTIUNI_AI: ReadonlyArray<readonly [string, string]> = [
  ['%%BeginSetup', '%%EndSetup'], ['%%BeginProlog', '%%EndProlog'], ['%%BeginResource', '%%EndResource'],
  ['%%BeginProcSet', '%%EndProcSet'], ['%%BeginFont', '%%EndFont'], ['%%BeginDocument', '%%EndDocument'],
  ['%AI5_Begin_NonPrinting', '%AI5_End_NonPrinting'], ['%AI3_BeginPattern', '%AI3_EndPattern'],
  ['%AI5_BeginPalette', '%AI5_EndPalette'], ['%AI5_BeginGradient', '%AI5_EndGradient'],
  ['%AI8_BeginBrushPattern', '%AI8_EndBrushPattern'],
];
/** Secțiunile sărite într-un EPS: fonturile incluse (nu desenează nimic; pot avea date binare, `eexec`). */
const SECTIUNI_EPS: ReadonlyArray<readonly [string, string]> = [['%%BeginResource: font', '%%EndResource'], ['%%BeginFont', '%%EndFont']];

/** Un font (din `findfont` și înrudiți): doar un dicționar, fiindcă textul se sare. */
const fontNou = (): Dictionar => new Map<string, Val>([['FontType', 1]]);
const esteNumar = (x: Val): x is number => typeof x === 'number' && Number.isFinite(x);
const mm = (p: Punct): Punct => ({ x: p.x * MM_PE_PT, y: p.y * MM_PE_PT });
const varfMm = (v: Varf): Varf => ({ p: mm(v.p), s: v.s.tip === 'C' ? { tip: 'C', c1: mm(v.s.c1), c2: mm(v.s.c2) } : v.s });

function inversa(m: Matrice): Matrice {
  const det = m.a * m.d - m.b * m.c;
  if (!Number.isFinite(det) || Math.abs(det) < 1e-300) throw new EroarePs('undefinedresult: matrice singulară');
  return { a: m.d / det, b: -m.b / det, c: -m.c / det, d: m.a / det, e: (m.c * m.f - m.d * m.e) / det, f: (m.b * m.e - m.a * m.f) / det };
}

/** Cheia unui dicționar: numele și șirul cu același text sunt aceeași cheie, ca în PostScript. */
function cheie(x: Val): string {
  if (x instanceof Nume) return x.v;
  if (x instanceof Sir) return latin1(x.b);
  if (typeof x === 'number') return `#${x}`;
  if (typeof x === 'boolean' || x === null) return `?${String(x)}`;
  throw new EroarePs('typecheck: cheia unui dicționar');
}

/** Numele tipului (`type`), ca în PostScript. */
function tip(x: Val): string {
  if (typeof x === 'number') return Number.isInteger(x) ? 'integertype' : 'realtype';
  if (typeof x === 'boolean') return 'booleantype';
  if (x === null) return 'nulltype';
  if (x instanceof Nume) return 'nametype';
  if (x instanceof Sir) return 'stringtype';
  if (x instanceof Operator) return 'operatortype';
  if (x instanceof Marca) return 'marktype';
  if (x instanceof Fisier) return 'filetype';
  if (x instanceof Salvare) return 'savetype';
  if (x instanceof Map) return 'dicttype';
  return 'arraytype';
}

/** Egalitatea din `eq` / `ne`: numerele după valoare, șirurile și numele după text, restul după identitate. */
function egale(a: Val, b: Val): boolean {
  if ((a instanceof Nume || a instanceof Sir) && (b instanceof Nume || b instanceof Sir)) return cheie(a) === cheie(b);
  return a === b;
}

class Interpretor {
  private readonly lex: LexerPs;
  private readonly ai: boolean;
  private readonly n: Numaratoare;
  readonly forme: FormaEps[] = [];
  private readonly stiva: Val[] = [];
  private readonly dictionare: Dictionar[];
  private readonly baza: number;
  private readonly systemdict: Dictionar;
  private readonly userdict: Dictionar = new Map();
  private gs: Stare;
  private readonly stivaGs: Stare[] = [];
  /** Căile deja pictate (după `id`): `gsave fill grestore stroke` le-ar picta a doua oară. */
  private readonly pictate = new Set<number>();
  private idUrmator = 1;
  private operatii = 0;
  private adancime = 0;
  private varfuri = 0;
  private gata = false;
  /** Documentele incluse (`%%BeginDocument`) deschise: comentariile de sfârșit și `showpage` din ele nu încheie desenul. */
  private incluse = 0;
  private readonly straturi: Strat[] = [];
  private inText = false;
  private compus: { fel: 'nimic' | 'umple' | 'trage'; impar: boolean } | null = null;

  constructor(ps: Uint8Array, ai: boolean, n: Numaratoare) {
    this.lex = new LexerPs(ps);
    this.ai = ai;
    this.n = n;
    this.systemdict = new Map(OPERATORI.map((v): [string, Val] => [v, new Operator(v)]));
    this.dictionare = [this.systemdict, new Map()];
    if (ai) this.dictionare.push(new Map(OPERATORI_AI.map((v): [string, Val] => [v, new Operator(v)])));
    this.dictionare.push(this.userdict);
    this.baza = this.dictionare.length;
    this.gs = { ctm: IDENTITATE, cale: this.caleNoua(), impar: false, componente: 1 };
  }

  /** Execută fișierul până la sfârșitul desenului (comentariul de sfârșit, `showpage`, capătul fișierului). */
  ruleaza(): void {
    // Un fișier Illustrator: corpul începe după prolog.
    if (this.ai && this.lex.saltLa(['%%EndProlog']) === null) this.lex.pos = 0;
    for (;;) {
      if (this.gata) return;
      const t = this.lex.jeton();
      if (t === null) return;
      if (t instanceof Comentariu) {
        if (this.comentariu(t.v)) return;
        continue;
      }
      this.executaJeton(t);
    }
  }

  /** Un comentariu de structură: o secțiune de sărit, sau sfârșitul desenului (întoarce true). */
  private comentariu(v: string): boolean {
    if (v.startsWith('%%BeginDocument')) {
      if (!this.ai) {
        this.incluse++;
        return false;
      }
    } else if (v.startsWith('%%EndDocument')) {
      if (this.incluse > 0) this.incluse--;
      return false;
    }
    if (this.incluse === 0 && SFARSIT.some((x) => v.startsWith(x))) return true;
    const s = (this.ai ? SECTIUNI_AI : SECTIUNI_EPS).find(([inceput]) => v.startsWith(inceput));
    if (s) {
      if (s[0] === '%%BeginDocument') this.n['sarit-incluse']++;
      if (this.lex.saltLa([s[1]]) === null) return true;
    }
    return false;
  }

  private executaJeton(t: number | Nume | NumeImediat | Sir | '{' | '}'): void {
    if (t === '{') this.pune(this.procedura(1));
    else if (t === '}') throw new EroarePs('sintaxa: „}” fără pereche');
    else if (t instanceof NumeImediat) this.pune(this.valoare(t.v));
    else if (t instanceof Nume && !t.literal) this.executaNume(t.v);
    else this.pune(t);
  }

  /** Corpul unei proceduri, până la acolada ei: nu se execută acum. */
  private procedura(adancime: number): Procedura {
    if (adancime > ADANCIME_MAXIMA) throw new EroarePs('limitcheck: acolade imbricate prea adânc');
    const corp: Val[] = [];
    for (;;) {
      const t = this.lex.jeton();
      if (t === null) throw new EroarePs('sintaxa: procedură neîncheiată');
      if (t instanceof Comentariu) continue;
      if (t === '}') return new Procedura(corp);
      if (t === '{') corp.push(this.procedura(adancime + 1));
      else if (t instanceof NumeImediat) corp.push(this.valoare(t.v));
      else corp.push(t);
      if (corp.length > ELEMENTE_MAXIME) throw new EroarePs('limitcheck: procedură prea lungă');
    }
  }

  private numara(): void {
    if (++this.operatii > OPERATII_MAXIME) throw new PestePlafon('operatii');
  }

  /** Un nume executat: căutat în dicționare, de sus (ale fișierului), apoi al operatorilor AI, apoi al operatorilor. */
  private executaNume(v: string): void {
    this.numara();
    if (this.inText) {
      // Un obiect text AI, sărit întreg (cu calea lui de încadrare), până la TO.
      if (v === 'TO') this.inText = false;
      this.stiva.length = 0;
      return;
    }
    for (let i = this.dictionare.length - 1; i >= 0; i--) {
      const d = this.dictionare[i] as Dictionar;
      if (d.has(v)) {
        this.executaValoare(d.get(v) ?? null);
        return;
      }
    }
    // Un AI: un operator necunoscut (o culoare, un stil, o versiune mai nouă) se sare, cu operanzii lui.
    if (this.ai) {
      this.stiva.length = 0;
      return;
    }
    throw new RefuzPs('operator', v);
  }

  private executaValoare(x: Val): void {
    if (x instanceof Procedura) this.executaProcedura(x);
    else if (x instanceof Operator) this.operator(x.v);
    else if (x instanceof Nume && !x.literal) this.executaNume(x.v);
    else if (x instanceof Sir && x.executabil) throw new RefuzPs('control', 'exec');
    else this.pune(x);
  }

  private executaProcedura(p: Procedura): void {
    if (++this.adancime > ADANCIME_MAXIMA) throw new EroarePs('recursivitate: procedurile se cheamă prea adânc');
    try {
      for (const t of p.corp) {
        if (this.gata) return;
        if (t instanceof Nume && !t.literal) this.executaNume(t.v);
        else if (t instanceof Operator) {
          this.numara();
          this.operator(t.v);
        } else this.pune(t);
      }
    } finally {
      this.adancime--;
    }
  }

  /** Valoarea unui nume (`load`, `//x`), din dicționare. */
  private valoare(v: string): Val {
    for (let i = this.dictionare.length - 1; i >= 0; i--) {
      const d = this.dictionare[i] as Dictionar;
      if (d.has(v)) return d.get(v) ?? null;
    }
    throw new EroarePs(`undefined: ${v.slice(0, NUME_IN_REFUZ)}`);
  }

  /* ── Stiva ── */

  private pune(x: Val): void {
    if (this.stiva.length >= ELEMENTE_MAXIME) throw new EroarePs('limitcheck: stiva');
    this.stiva.push(x);
  }

  private scoate(op: string): Val {
    if (this.stiva.length === 0) throw new EroarePs(`stackunderflow: ${op}`);
    return this.stiva.pop() as Val;
  }

  private nr(op: string): number {
    const x = this.scoate(op);
    if (!esteNumar(x)) throw new EroarePs(`typecheck: ${op} cere un număr`);
    return x;
  }

  private intreg(op: string): number {
    const x = this.nr(op);
    if (!Number.isInteger(x)) throw new EroarePs(`typecheck: ${op} cere un întreg`);
    return x;
  }

  private bool(op: string): boolean {
    const x = this.scoate(op);
    if (typeof x !== 'boolean') throw new EroarePs(`typecheck: ${op} cere un boolean`);
    return x;
  }

  private tablou(op: string): Val[] {
    const x = this.scoate(op);
    if (x instanceof Procedura) return x.corp;
    if (!Array.isArray(x)) throw new EroarePs(`typecheck: ${op} cere un tablou`);
    return x;
  }

  private dict(op: string): Dictionar {
    const x = this.scoate(op);
    if (!(x instanceof Map)) throw new EroarePs(`typecheck: ${op} cere un dicționar`);
    return x;
  }

  private sir(op: string): Sir {
    const x = this.scoate(op);
    if (!(x instanceof Sir)) throw new EroarePs(`typecheck: ${op} cere un șir`);
    return x;
  }

  private varf(): Val | undefined {
    return this.stiva[this.stiva.length - 1];
  }

  /** Poziția ultimei mărci de pe stivă. */
  private marca(op: string): number {
    for (let i = this.stiva.length - 1; i >= 0; i--) if (this.stiva[i] === MARCA) return i;
    throw new EroarePs(`unmatchedmark: ${op}`);
  }

  private matriceDin(a: Val[], op: string): Matrice {
    if (a.length !== 6 || !a.every(esteNumar)) throw new EroarePs(`rangecheck: ${op} cere o matrice de 6 numere`);
    const [x0, x1, x2, x3, x4, x5] = a as number[];
    return { a: x0 as number, b: x1 as number, c: x2 as number, d: x3 as number, e: x4 as number, f: x5 as number };
  }

  private scrieMatrice(a: Val[], m: Matrice, op: string): void {
    if (a.length !== 6) throw new EroarePs(`rangecheck: ${op} cere o matrice de 6 elemente`);
    a[0] = m.a; a[1] = m.b; a[2] = m.c; a[3] = m.d; a[4] = m.e; a[5] = m.f;
  }

  /* ── Operatorii PostScript ── */

  private operator(v: string): void {
    if (this.ai && AI.has(v)) {
      this.operatorAi(v);
      this.stiva.length = 0;
      return;
    }
    const ignorat = IGNORATI[v];
    if (ignorat !== undefined) {
      for (let k = 0; k < ignorat; k++) this.scoate(v);
      return;
    }
    if (CONTROL.includes(v)) throw new RefuzPs('control', v);
    const s = this.stiva;
    switch (v) {
      // ── stiva
      case 'pop': this.scoate(v); return;
      case 'exch': { const b = this.scoate(v), a = this.scoate(v); s.push(b, a); return; }
      case 'dup': { const a = this.scoate(v); this.pune(a); this.pune(a); return; }
      case 'copy': {
        const x = this.scoate(v);
        if (Array.isArray(x)) {
          const sursa = this.tablou(v);
          if (sursa.length > x.length) throw new EroarePs('rangecheck: copy');
          sursa.forEach((e, i) => { x[i] = e; });
          this.pune(x.slice(0, sursa.length));
          return;
        }
        if (!esteNumar(x) || !Number.isInteger(x) || x < 0 || x > s.length) throw new EroarePs('rangecheck: copy');
        if (s.length + x > ELEMENTE_MAXIME) throw new EroarePs('limitcheck: stiva');
        // Fără `push(...)`: sute de mii de argumente depășesc stiva JavaScript.
        for (let i = s.length - x, capat = s.length; i < capat; i++) s.push(s[i] ?? null);
        return;
      }
      case 'index': {
        const k = this.intreg(v);
        if (k < 0 || k >= s.length) throw new EroarePs('rangecheck: index');
        this.pune(s[s.length - 1 - k] ?? null);
        return;
      }
      case 'roll': {
        const j = this.intreg(v), k = this.intreg(v);
        if (k < 0 || k > s.length) throw new EroarePs('rangecheck: roll');
        if (k === 0) return;
        const parte = s.splice(s.length - k, k);
        const r = ((j % k) + k) % k;
        for (let i = 0; i < k; i++) s.push(parte[(i + k - r) % k] ?? null);
        return;
      }
      case 'clear': s.length = 0; return;
      case 'count': this.pune(s.length); return;
      case 'mark': case '[': case '<<': this.pune(MARCA); return;
      case 'cleartomark': s.length = this.marca(v); return;
      case 'counttomark': this.pune(s.length - 1 - this.marca(v)); return;
      case ']': {
        const i = this.marca(v);
        const a = s.splice(i + 1);
        s.length = i;
        this.pune(a);
        return;
      }
      case '>>': {
        const i = this.marca(v);
        const a = s.splice(i + 1);
        s.length = i;
        if (a.length % 2 !== 0) throw new EroarePs('rangecheck: >> cere perechi');
        const d: Dictionar = new Map();
        for (let k = 0; k < a.length; k += 2) d.set(cheie(a[k] ?? null), a[k + 1] ?? null);
        this.pune(d);
        return;
      }
      // ── aritmetica
      case 'add': { const b = this.nr(v), a = this.nr(v); this.pune(a + b); return; }
      case 'sub': { const b = this.nr(v), a = this.nr(v); this.pune(a - b); return; }
      case 'mul': { const b = this.nr(v), a = this.nr(v); this.pune(a * b); return; }
      case 'div': {
        const b = this.nr(v), a = this.nr(v);
        if (b === 0) throw new EroarePs('undefinedresult: div');
        this.pune(a / b);
        return;
      }
      case 'idiv': case 'mod': {
        const b = this.intreg(v), a = this.intreg(v);
        if (b === 0) throw new EroarePs(`undefinedresult: ${v}`);
        this.pune(v === 'idiv' ? Math.trunc(a / b) : a % b);
        return;
      }
      case 'neg': this.pune(-this.nr(v)); return;
      case 'abs': this.pune(Math.abs(this.nr(v))); return;
      case 'ceiling': this.pune(Math.ceil(this.nr(v))); return;
      case 'floor': this.pune(Math.floor(this.nr(v))); return;
      case 'round': this.pune(Math.floor(this.nr(v) + 0.5)); return;
      case 'truncate': this.pune(Math.trunc(this.nr(v))); return;
      case 'sqrt': {
        const a = this.nr(v);
        if (a < 0) throw new EroarePs('rangecheck: sqrt');
        this.pune(Math.sqrt(a));
        return;
      }
      case 'atan': {
        const b = this.nr(v), a = this.nr(v);
        if (a === 0 && b === 0) throw new EroarePs('undefinedresult: atan');
        this.pune((((Math.atan2(a, b) * 180) / Math.PI) + 360) % 360);
        return;
      }
      case 'sin': this.pune(rotatie(this.nr(v)).b); return;
      case 'cos': this.pune(rotatie(this.nr(v)).a); return;
      case 'exp': { const b = this.nr(v), a = this.nr(v); this.pune(a ** b); return; }
      case 'ln': case 'log': {
        const a = this.nr(v);
        if (a <= 0) throw new EroarePs(`rangecheck: ${v}`);
        this.pune(v === 'ln' ? Math.log(a) : Math.log10(a));
        return;
      }
      case 'cvi': case 'cvr': {
        const x = this.scoate(v);
        const a = x instanceof Sir ? Number(latin1(x.b).trim()) : x;
        if (!esteNumar(a)) throw new EroarePs(`typecheck: ${v}`);
        this.pune(v === 'cvi' ? Math.trunc(a) : a);
        return;
      }
      // ── relațiile și logica
      case 'eq': case 'ne': { const b = this.scoate(v), a = this.scoate(v); this.pune(egale(a, b) === (v === 'eq')); return; }
      case 'gt': case 'ge': case 'lt': case 'le': {
        const b = this.scoate(v), a = this.scoate(v);
        const [x, y] = a instanceof Sir && b instanceof Sir ? [latin1(a.b), latin1(b.b)] : [a, b];
        if (!((esteNumar(x) && esteNumar(y)) || (typeof x === 'string' && typeof y === 'string'))) throw new EroarePs(`typecheck: ${v}`);
        this.pune(v === 'gt' ? x > y : v === 'ge' ? x >= y : v === 'lt' ? x < y : x <= y);
        return;
      }
      case 'and': case 'or': case 'xor': {
        const b = this.scoate(v), a = this.scoate(v);
        if (typeof a === 'boolean' && typeof b === 'boolean') this.pune(v === 'and' ? a && b : v === 'or' ? a || b : a !== b);
        else if (esteNumar(a) && esteNumar(b) && Number.isInteger(a) && Number.isInteger(b)) this.pune(v === 'and' ? a & b : v === 'or' ? a | b : a ^ b);
        else throw new EroarePs(`typecheck: ${v}`);
        return;
      }
      case 'not': {
        const a = this.scoate(v);
        if (typeof a === 'boolean') this.pune(!a);
        else if (esteNumar(a) && Number.isInteger(a)) this.pune(~a);
        else throw new EroarePs('typecheck: not');
        return;
      }
      case 'bitshift': { const k = this.intreg(v), a = this.intreg(v); this.pune(k >= 0 ? a << k : a >> -k); return; }
      case 'true': this.pune(true); return;
      case 'false': this.pune(false); return;
      case 'null': this.pune(null); return;
      case 'exec': this.executaValoare(this.scoate(v)); return;
      // ── dicționarele
      case 'dict': this.intreg(v); this.pune(new Map()); return;
      case 'begin': this.dictionare.push(this.dict(v)); return;
      case 'end':
        if (this.dictionare.length <= this.baza) throw new EroarePs('dictstackunderflow: end');
        this.dictionare.pop();
        return;
      case 'def': {
        const x = this.scoate(v), k = cheie(this.scoate(v));
        (this.dictionare[this.dictionare.length - 1] as Dictionar).set(k, x);
        return;
      }
      case 'load': this.pune(this.valoare(cheie(this.scoate(v)))); return;
      case 'store': {
        const x = this.scoate(v), k = cheie(this.scoate(v));
        const d = [...this.dictionare].reverse().find((e) => e.has(k)) ?? (this.dictionare[this.dictionare.length - 1] as Dictionar);
        d.set(k, x);
        return;
      }
      case 'known': { const k = cheie(this.scoate(v)); this.pune(this.dict(v).has(k)); return; }
      case 'where': {
        const k = cheie(this.scoate(v));
        const d = [...this.dictionare].reverse().find((e) => e.has(k));
        if (d) s.push(d, true);
        else this.pune(false);
        return;
      }
      case 'currentdict': this.pune(this.dictionare[this.dictionare.length - 1] ?? null); return;
      case 'userdict': this.pune(this.userdict); return;
      case 'systemdict': this.pune(this.systemdict); return;
      case 'globaldict': this.pune(this.dictionare[1] ?? null); return;
      case 'statusdict': case 'errordict': case '$error': this.pune(new Map()); return;
      case 'countdictstack': this.pune(this.dictionare.length); return;
      case 'cleardictstack': this.dictionare.length = this.baza; return;
      case 'undef': { const k = cheie(this.scoate(v)); this.dict(v).delete(k); return; }
      case 'maxlength': this.dict(v); this.pune(ELEMENTE_MAXIME); return;
      // ── tablourile și șirurile
      case 'get': {
        const k = this.scoate(v), o = this.scoate(v);
        if (o instanceof Map) {
          const c = cheie(k);
          if (!o.has(c)) throw new EroarePs(`undefined: get ${c.slice(0, NUME_IN_REFUZ)}`);
          this.pune(o.get(c) ?? null);
          return;
        }
        const el = o instanceof Procedura ? o.corp : Array.isArray(o) ? o : o instanceof Sir ? o.b : null;
        if (!el || !esteNumar(k) || !Number.isInteger(k) || k < 0 || k >= el.length) throw new EroarePs('rangecheck: get');
        this.pune(el[k] ?? null);
        return;
      }
      case 'put': {
        const x = this.scoate(v), k = this.scoate(v), o = this.scoate(v);
        if (o instanceof Map) o.set(cheie(k), x);
        else if (Array.isArray(o) || o instanceof Procedura) {
          const el = o instanceof Procedura ? o.corp : o;
          if (!esteNumar(k) || !Number.isInteger(k) || k < 0 || k >= el.length) throw new EroarePs('rangecheck: put');
          el[k] = x;
        } else if (o instanceof Sir) {
          if (!esteNumar(k) || !Number.isInteger(k) || k < 0 || k >= o.b.length || !esteNumar(x)) throw new EroarePs('rangecheck: put');
          o.b[k] = x;
        } else throw new EroarePs('typecheck: put');
        return;
      }
      case 'length': {
        const o = this.scoate(v);
        const k = o instanceof Map ? o.size : o instanceof Procedura ? o.corp.length : Array.isArray(o) ? o.length
          : o instanceof Sir ? o.b.length : o instanceof Nume ? o.v.length : -1;
        if (k < 0) throw new EroarePs('typecheck: length');
        this.pune(k);
        return;
      }
      case 'getinterval': {
        const n = this.intreg(v), i = this.intreg(v), o = this.scoate(v);
        const lung = o instanceof Sir ? o.b.length : o instanceof Procedura ? o.corp.length : Array.isArray(o) ? o.length : -1;
        if (lung < 0 || i < 0 || n < 0 || i + n > lung) throw new EroarePs('rangecheck: getinterval');
        if (o instanceof Sir) this.pune(new Sir(o.b.subarray(i, i + n), o.executabil));
        else if (o instanceof Procedura) this.pune(new Procedura(o.corp.slice(i, i + n)));
        else this.pune((o as Val[]).slice(i, i + n));
        return;
      }
      case 'putinterval': {
        const sursa = this.scoate(v), i = this.intreg(v), tinta = this.scoate(v);
        const din = sursa instanceof Sir ? [...sursa.b] : sursa instanceof Procedura ? sursa.corp : Array.isArray(sursa) ? sursa : null;
        const in_ = tinta instanceof Sir ? tinta.b : tinta instanceof Procedura ? tinta.corp : Array.isArray(tinta) ? tinta : null;
        if (!din || !in_ || i < 0 || i + din.length > in_.length) throw new EroarePs('rangecheck: putinterval');
        din.forEach((e, k) => {
          if (in_ instanceof Uint8Array) in_[i + k] = esteNumar(e) ? e : 0;
          else in_[i + k] = e;
        });
        return;
      }
      case 'array': {
        const k = this.intreg(v);
        if (k < 0 || k > ELEMENTE_MAXIME) throw new EroarePs('limitcheck: array');
        this.pune(new Array<Val>(k).fill(null));
        return;
      }
      case 'astore': {
        const a = this.tablou(v);
        if (s.length < a.length) throw new EroarePs('stackunderflow: astore');
        const el = s.splice(s.length - a.length, a.length);
        el.forEach((e, i) => { a[i] = e; });
        this.pune(a);
        return;
      }
      case 'aload': {
        const o = this.scoate(v);
        const el = o instanceof Procedura ? o.corp : Array.isArray(o) ? o : null;
        if (!el) throw new EroarePs('typecheck: aload');
        if (s.length + el.length >= ELEMENTE_MAXIME) throw new EroarePs('limitcheck: stiva');
        for (const e of el) s.push(e);
        s.push(o);
        return;
      }
      case 'string': {
        const k = this.intreg(v);
        if (k < 0 || k > ELEMENTE_MAXIME) throw new EroarePs('limitcheck: string');
        this.pune(new Sir(new Uint8Array(k)));
        return;
      }
      case 'cvs': {
        const tinta = this.sir(v), x = this.scoate(v);
        const text = x instanceof Sir ? latin1(x.b) : x instanceof Nume || x instanceof Operator ? x.v
          : typeof x === 'number' || typeof x === 'boolean' ? String(x) : '--nostringval--';
        const b = Uint8Array.from(text, (c) => c.charCodeAt(0) & 0xff);
        if (b.length > tinta.b.length) throw new EroarePs('rangecheck: cvs');
        tinta.b.set(b);
        this.pune(new Sir(tinta.b.subarray(0, b.length)));
        return;
      }
      case 'cvn': { const x = this.sir(v); this.pune(new Nume(latin1(x.b), !x.executabil)); return; }
      case 'cvlit': {
        const x = this.scoate(v);
        this.pune(x instanceof Procedura ? x.corp : x instanceof Nume ? new Nume(x.v, true) : x instanceof Sir ? new Sir(x.b) : x);
        return;
      }
      case 'cvx': {
        const x = this.scoate(v);
        this.pune(Array.isArray(x) ? new Procedura(x) : x instanceof Nume ? new Nume(x.v, false) : x instanceof Sir ? new Sir(x.b, true) : x);
        return;
      }
      case 'xcheck': {
        const x = this.scoate(v);
        this.pune(x instanceof Procedura || x instanceof Operator || (x instanceof Nume && !x.literal) || (x instanceof Sir && x.executabil));
        return;
      }
      case 'rcheck': case 'wcheck': this.scoate(v); this.pune(true); return;
      case 'readonly': case 'executeonly': case 'noaccess': if (s.length === 0) throw new EroarePs(`stackunderflow: ${v}`); return;
      case 'type': this.pune(new Nume(tip(this.scoate(v)), false)); return;
      case 'bind': {
        const p = this.varf();
        if (p === undefined) throw new EroarePs('stackunderflow: bind');
        if (p instanceof Procedura) this.leaga(p, new Set());
        return;
      }
      // ── mediul
      case 'languagelevel': this.pune(2); return;
      case 'version': this.pune(new Sir(Uint8Array.from('3010', (c) => c.charCodeAt(0)))); return;
      case 'product': this.pune(new Sir(Uint8Array.from('cncvs2', (c) => c.charCodeAt(0)))); return;
      case 'revision': case 'serialnumber': this.pune(0); return;
      case 'vmstatus': s.push(0, 0, 10_000_000); return;
      case 'currentglobal': case 'currentpacking': case 'currentshared': this.pune(false); return;
      case 'pdfmark': s.length = this.marca(v); return;
      case 'currentfile': this.pune(new Fisier([], true)); return;
      case 'filter': {
        const nume = this.scoate(v);
        if (!(nume instanceof Nume)) throw new EroarePs('typecheck: filter');
        if (this.varf() instanceof Map && this.stiva.length >= 2) this.scoate(v);
        const sursa = this.scoate(v);
        this.pune(sursa instanceof Fisier ? new Fisier([...sursa.filtre, nume.v], sursa.curent) : new Fisier([], false));
        return;
      }
      case 'setcolorspace': {
        const x = this.scoate(v);
        const n = x instanceof Nume ? x.v : Array.isArray(x) && x[0] instanceof Nume ? x[0].v : '';
        this.gs.componente = n === 'DeviceRGB' || n === 'CIEBasedABC' || n === 'CIEBasedDEF' || n === 'Lab' ? 3
          : n === 'DeviceCMYK' || n === 'CIEBasedDEFG' ? 4
            : n === 'DeviceN' && Array.isArray(x) && Array.isArray(x[1]) ? x[1].length : 1;
        return;
      }
      case 'setcolor': {
        if (this.varf() instanceof Map) this.scoate(v);
        else for (let k = 0; k < this.gs.componente; k++) this.nr(v);
        return;
      }
      case 'makepattern': this.tablou(v); this.dict(v); this.pune(new Map()); return;
      // ── fonturile și textul (sărit)
      case 'findfont': this.scoate(v); this.pune(fontNou()); return;
      case 'scalefont': case 'makefont': this.scoate(v); return;
      case 'definefont': { const f = this.scoate(v); this.scoate(v); this.pune(f); return; }
      case 'currentfont': this.pune(fontNou()); return;
      case 'defineresource': { this.scoate(v); const x = this.scoate(v); this.scoate(v); this.pune(x); return; }
      case 'findresource': {
        const cat = cheie(this.scoate(v));
        this.scoate(v);
        if (cat !== 'Font') throw new RefuzPs('operator', 'findresource');
        this.pune(fontNou());
        return;
      }
      case 'show': case 'glyphshow': this.text(v, 1); return;
      case 'ashow': this.text(v, 3); return;
      case 'widthshow': this.text(v, 4); return;
      case 'awidthshow': this.text(v, 6); return;
      case 'xshow': case 'yshow': case 'xyshow': case 'kshow': case 'cshow': case 'charpath': this.text(v, 2); return;
      // ── imaginile și umbririle (sărite)
      case 'image': case 'imagemask': case 'colorimage': this.imagine(v); return;
      case 'shfill': this.scoate(v); if (!this.ascuns()) this.n['sarit-umbrire']++; return;
      // ── starea grafică
      case 'gsave': this.salveaza(); return;
      case 'grestore': this.restaureaza(); return;
      case 'grestoreall': while (this.stivaGs.length > 0) this.restaureaza(); return;
      case 'save': this.pune(new Salvare(this.stivaGs.length)); this.salveaza(); return;
      case 'restore': {
        const x = this.scoate(v);
        if (!(x instanceof Salvare)) throw new EroarePs('typecheck: restore');
        while (this.stivaGs.length > x.adancime) this.restaureaza();
        return;
      }
      case 'initgraphics': this.gs.ctm = IDENTITATE; this.golesteCalea(); return;
      case 'concat': this.gs.ctm = compune(this.gs.ctm, this.matriceDin(this.tablou(v), v)); return;
      case 'translate': case 'scale': case 'rotate': this.transformare(v); return;
      case 'setmatrix': this.gs.ctm = this.matriceDin(this.tablou(v), v); return;
      case 'currentmatrix': { const a = this.tablou(v); this.scrieMatrice(a, this.gs.ctm, v); this.pune(a); return; }
      case 'matrix': this.pune([1, 0, 0, 1, 0, 0]); return;
      case 'identmatrix': case 'defaultmatrix': { const a = this.tablou(v); this.scrieMatrice(a, IDENTITATE, v); this.pune(a); return; }
      case 'initmatrix': this.gs.ctm = IDENTITATE; return;
      case 'concatmatrix': {
        const m3 = this.tablou(v), m2 = this.matriceDin(this.tablou(v), v), m1 = this.matriceDin(this.tablou(v), v);
        this.scrieMatrice(m3, compune(m2, m1), v);
        this.pune(m3);
        return;
      }
      case 'invertmatrix': {
        const m2 = this.tablou(v), m1 = this.matriceDin(this.tablou(v), v);
        this.scrieMatrice(m2, inversa(m1), v);
        this.pune(m2);
        return;
      }
      case 'transform': case 'itransform': case 'dtransform': case 'idtransform': this.aplicaPunct(v); return;
      // ── căile și pictarea
      case 'newpath': this.newpath(); return;
      case 'moveto': { const y = this.nr(v), x = this.nr(v); this.muta(aplica(this.gs.ctm, { x, y })); return; }
      case 'rmoveto': { const dy = this.nr(v), dx = this.nr(v); this.muta(this.relativ(v, dx, dy)); return; }
      case 'lineto': { const y = this.nr(v), x = this.nr(v); this.segment(v, LINIE, aplica(this.gs.ctm, { x, y }), true); return; }
      case 'rlineto': { const dy = this.nr(v), dx = this.nr(v); this.segment(v, LINIE, this.relativ(v, dx, dy), true); return; }
      case 'curveto': case 'rcurveto': {
        const y3 = this.nr(v), x3 = this.nr(v), y2 = this.nr(v), x2 = this.nr(v), y1 = this.nr(v), x1 = this.nr(v);
        const p = v === 'curveto' ? (x: number, y: number): Punct => aplica(this.gs.ctm, { x, y }) : (x: number, y: number): Punct => this.relativ(v, x, y);
        this.segment(v, { tip: 'C', c1: p(x1, y1), c2: p(x2, y2) }, p(x3, y3), true);
        return;
      }
      case 'closepath': this.inchide(); return;
      case 'currentpoint': {
        const c = this.curent(v);
        const u = aplica(inversa(this.gs.ctm), c);
        s.push(u.x, u.y);
        return;
      }
      case 'fill': this.picteaza(true, false); return;
      case 'eofill': this.picteaza(true, true); return;
      case 'stroke': this.picteaza(false, false); return;
      case 'clip': case 'eoclip': this.decupeaza(); return;
      case 'rectfill': case 'rectstroke': case 'rectclip': this.dreptunghiuri(v); return;
      case 'showpage': case 'copypage': case 'quit': if (this.incluse === 0) this.gata = true; return;
      default: throw new RefuzPs('operator', v);
    }
  }

  /**
   * `bind`: numele din procedură (și din cele imbricate) care trimit acum la un operator devin operatorul, ca în
   * PostScript: o redefinire de după nu le mai schimbă.
   */
  private leaga(p: Procedura, vazute: Set<Procedura>): void {
    if (vazute.has(p)) return;
    vazute.add(p);
    p.corp.forEach((t, i) => {
      if (t instanceof Procedura) this.leaga(t, vazute);
      else if (t instanceof Nume && !t.literal) {
        for (let k = this.dictionare.length - 1; k >= 0; k--) {
          const d = this.dictionare[k] as Dictionar;
          if (!d.has(t.v)) continue;
          const x = d.get(t.v);
          if (x instanceof Operator) p.corp[i] = x;
          break;
        }
      }
    });
  }

  /** `translate`, `scale`, `rotate`: pe matricea curentă, sau (cu o matrice deasupra) în ea, întoarsă pe stivă. */
  private transformare(op: 'translate' | 'scale' | 'rotate'): void {
    const m = Array.isArray(this.varf()) ? this.tablou(op) : null;
    let t: Matrice;
    if (op === 'rotate') t = rotatie(this.nr(op));
    else {
      const y = this.nr(op), x = this.nr(op);
      t = op === 'translate' ? translatie(x, y) : scalare(x, y);
    }
    if (m) {
      this.scrieMatrice(m, t, op);
      this.pune(m);
    } else this.gs.ctm = compune(this.gs.ctm, t);
  }

  /** `transform` și înrudiții: un punct (sau o deplasare) prin matricea curentă, ori prin cea de deasupra, ori invers. */
  private aplicaPunct(op: 'transform' | 'itransform' | 'dtransform' | 'idtransform'): void {
    const m = Array.isArray(this.varf()) ? this.matriceDin(this.tablou(op), op) : this.gs.ctm;
    const y = this.nr(op), x = this.nr(op);
    const t = op === 'itransform' || op === 'idtransform' ? inversa(m) : m;
    const r = op === 'dtransform' || op === 'idtransform' ? { x: t.a * x + t.c * y, y: t.b * x + t.d * y } : aplica(t, { x, y });
    this.stiva.push(r.x, r.y);
  }

  /* ── Textul și imaginile (sărite) ── */

  /** Un operator de text: operanzii lui se scot, textul se numără, iar punctul curent nu se mai cunoaște. */
  private text(op: string, operanzi: number): void {
    for (let k = 0; k < operanzi; k++) this.scoate(op);
    if (!this.ascuns()) this.n['sarit-text']++;
    if (this.gs.cale.curenta) this.gs.cale.necunoscut = true;
  }

  /**
   * O imagine, sărită: operanzii (nivelul 1, cu sursele datelor, sau dicționarul nivelului 2) și, când sursa citește din
   * fișier (`currentfile`), datele de după operator: hex (`readhexstring`), binare (`readstring`, sau fișierul fără filtru),
   * ASCII85 până la `~>`, ASCIIHex până la `>`. Alte date din fișier (binare comprimate) nu se pot sări: refuz.
   */
  private imagine(op: string): void {
    let latime: number, inaltime: number, biti: number, componente: number, surse: Val[];
    if (op !== 'colorimage' && this.varf() instanceof Map) {
      const d = this.dict(op);
      const nr = (k: string): number => {
        const x = d.get(k);
        if (!esteNumar(x ?? null) || !Number.isInteger(x)) throw new EroarePs(`typecheck: ${op} /${k}`);
        return x as number;
      };
      latime = nr('Width');
      inaltime = nr('Height');
      biti = op === 'imagemask' ? 1 : nr('BitsPerComponent');
      const dec = d.get('Decode');
      componente = op === 'imagemask' ? 1 : Array.isArray(dec) ? dec.length / 2 : this.gs.componente;
      const sursa = d.get('DataSource') ?? null;
      surse = d.get('MultipleDataSources') === true && Array.isArray(sursa) ? sursa : [sursa];
    } else if (op === 'colorimage') {
      componente = this.intreg(op);
      const multe = this.bool(op);
      surse = [];
      for (let k = 0; k < (multe ? componente : 1); k++) surse.unshift(this.scoate(op));
      this.tablou(op);
      biti = this.intreg(op);
      inaltime = this.intreg(op);
      latime = this.intreg(op);
    } else {
      surse = [this.scoate(op)];
      this.tablou(op);
      const b = this.scoate(op);
      inaltime = this.intreg(op);
      latime = this.intreg(op);
      biti = op === 'imagemask' ? 1 : esteNumar(b) ? b : Number.NaN;
      componente = 1;
    }
    if (![latime, inaltime, biti, componente].every((x) => Number.isInteger(x) && x >= 0)) throw new EroarePs(`rangecheck: ${op}`);
    if (!this.ascuns()) this.n['sarit-imagine']++;
    // Octeții datelor necomprimate: rândurile, fiecare rotunjit la octet (pe componentă, cu mai multe surse).
    const pe = surse.length > 1 ? 1 : componente;
    const octeti = Math.ceil((latime * biti * pe) / 8) * inaltime * surse.length;
    const fel = surse.map((x) => this.sursaImaginii(x)).find((x) => x !== 'nu') ?? 'nu';
    if (!this.sareDatele(fel, octeti)) throw new RefuzPs('imagine', op);
  }

  /** Datele imaginii, de după operator, după forma lor; fals dacă nu se pot sări (sau fișierul se termină înainte). */
  private sareDatele(fel: FelDate, octeti: number): boolean {
    switch (fel) {
      case 'nu': return true;
      case 'hex': return this.lex.sareHex(2 * octeti);
      case 'binar':
        this.lex.sareAlbUnul();
        return this.lex.sareOcteti(octeti);
      case 'ascii85': return this.lex.sareDupa('~>');
      case 'asciihex': return this.lex.sareDupa('>');
      default: return false;
    }
  }

  /** De unde vin datele unei surse: nu din fișier (`nu`), din fișier în forma știută, sau din fișier altfel (`necunoscut`). */
  private sursaImaginii(x: Val): FelDate {
    const dinFisier = (f: Fisier): FelDate => {
      if (!f.curent) return 'nu';
      const primul = f.filtre[0];
      return primul === undefined ? 'binar' : primul === 'ASCII85Decode' || primul === 'A85' ? 'ascii85'
        : primul === 'ASCIIHexDecode' || primul === 'AHx' ? 'asciihex' : 'necunoscut';
    };
    if (x instanceof Fisier) return dinFisier(x);
    if (!(x instanceof Procedura) && !Array.isArray(x)) return 'nu';
    const corp = x instanceof Procedura ? x.corp : x;
    const nume = corp.map((t) => (t instanceof Nume || t instanceof Operator ? t.v : ''));
    // O procedură care citește dintr-un fișier pus deoparte cu `def` (`/f currentfile /ASCII85Decode filter def`).
    for (const t of corp) {
      if (!(t instanceof Nume) || t.literal) continue;
      const v = [...this.dictionare].reverse().find((d) => d.has(t.v))?.get(t.v);
      if (v instanceof Fisier) return dinFisier(v);
    }
    if (!nume.includes('currentfile')) return 'nu';
    if (nume.includes('filter')) {
      const filtre = corp.filter((t): t is Nume => t instanceof Nume && t.literal).map((t) => t.v);
      return dinFisier(new Fisier(filtre.filter((f) => /Decode$|^A85$|^AHx$/.test(f)), true));
    }
    return nume.includes('readhexstring') ? 'hex' : nume.includes('readstring') ? 'binar' : 'necunoscut';
  }

  /* ── Starea grafică și calea ── */

  private caleNoua(): Cale {
    return { subcai: [], curenta: null, id: this.idUrmator++, decupaj: false, necunoscut: false };
  }

  /** O copie a căii (pentru `gsave`): vârfurile copiate se numără la plafonul lucrului. */
  private copieCale(c: Cale): Cale {
    const subcai = c.subcai.map((s) => ({ ...s, varfuri: [...s.varfuri] }));
    this.varfuri += subcai.reduce((t, s) => t + s.varfuri.length, 0);
    if (this.varfuri > PLAFON_IMPORT.varfuriLucru) throw new PestePlafon('varfuri');
    const curenta = c.curenta ? (subcai[c.subcai.indexOf(c.curenta)] ?? null) : null;
    return { ...c, subcai, curenta };
  }

  private salveaza(): void {
    this.stivaGs.push({ ...this.gs, cale: this.copieCale(this.gs.cale) });
    if (this.stivaGs.length > ADANCIME_MAXIMA * 10) throw new EroarePs('limitcheck: gsave');
  }

  private restaureaza(): void {
    const s = this.stivaGs.pop();
    if (s) this.gs = s;
  }

  /** Calea curentă, de schimbat: una deja pictată (întoarsă de `grestore`) devine alta. */
  private cale(): Cale {
    const c = this.gs.cale;
    if (this.pictate.has(c.id)) c.id = this.idUrmator++;
    return c;
  }

  private golesteCalea(): void {
    this.gs.cale = this.caleNoua();
  }

  /** `newpath` (și `n` într-un AI): o cale cu segmente, nici pictată, nici decupaj, e nepictată. */
  private newpath(): void {
    const c = this.gs.cale;
    if (!c.decupaj && !this.pictate.has(c.id) && c.subcai.some((s) => s.desenate > 0)) this.n.nepictate++;
    this.golesteCalea();
  }

  /** Punctul curent (în pt); fără el, fișierul e greșit, iar după un text nu se cunoaște. */
  private curent(op: string): Punct {
    const c = this.gs.cale;
    if (!c.curenta) throw new EroarePs(`nocurrentpoint: ${op}`);
    if (c.necunoscut) throw new EroarePs(`punctul curent după text nu se cunoaște: ${op}`);
    return c.curenta.cur;
  }

  /** O deplasare relativă (`rmoveto`, `rlineto`, `rcurveto`), din punctul curent, prin partea liniară a matricei. */
  private relativ(op: string, dx: number, dy: number): Punct {
    const c = this.curent(op), m = this.gs.ctm;
    return { x: c.x + m.a * dx + m.c * dy, y: c.y + m.b * dx + m.d * dy };
  }

  private muta(p: Punct): void {
    const c = this.cale();
    c.necunoscut = false;
    c.curenta = { start: p, cur: p, varfuri: [], desenate: 0, autor: false };
    c.subcai.push(c.curenta);
  }

  /** Un segment din punctul curent; `strict` (PostScript): fără punct curent, eroare; într-un AI, începe o subcale acolo. */
  private segment(op: string, s: Varf['s'], capat: Punct, strict: boolean): void {
    const c = this.cale();
    if (!c.curenta) {
      if (strict) throw new EroarePs(`nocurrentpoint: ${op}`);
      this.muta(capat);
    }
    if (c.necunoscut) throw new EroarePs(`punctul curent după text nu se cunoaște: ${op}`);
    const sc = c.curenta as Subcale;
    sc.desenate++;
    if (s.tip === 'L' && capat.x === sc.cur.x && capat.y === sc.cur.y) return;
    if (s.tip === 'C' && [s.c1, s.c2, capat].every((q) => q.x === sc.cur.x && q.y === sc.cur.y)) return;
    sc.varfuri.push({ p: sc.cur, s });
    sc.cur = capat;
    if (++this.varfuri > PLAFON_IMPORT.varfuriLucru) throw new PestePlafon('varfuri');
  }

  /** `closepath`: subcalea se închide; un segment nou pornește o subcale nouă din start. */
  private inchide(): void {
    const c = this.cale();
    if (!c.curenta) return;
    c.curenta.autor = true;
    const start = c.curenta.start;
    c.curenta = { start, cur: start, varfuri: [], desenate: 0, autor: false };
    c.subcai.push(c.curenta);
  }

  private decupeaza(): void {
    const c = this.gs.cale;
    if (!c.subcai.some((s) => s.desenate > 0)) return;
    c.decupaj = true;
    this.n.decupaje++;
  }

  /** `rectfill`, `rectstroke` (calea curentă rămâne), `rectclip` (o golește): x y l h, sau un tablou de cvadruple. */
  private dreptunghiuri(op: string): void {
    // `rectstroke` poate primi o matrice (6 numere; un tablou de dreptunghiuri are un multiplu de 4): doar pentru grosime.
    const m = this.varf();
    if (op === 'rectstroke' && Array.isArray(m) && m.length === 6) this.scoate(op);
    let numere: number[];
    if (Array.isArray(this.varf())) {
      const a = this.tablou(op);
      if (a.length % 4 !== 0 || !a.every(esteNumar)) throw new EroarePs(`typecheck: ${op}`);
      numere = a as number[];
    } else {
      const h = this.nr(op), l = this.nr(op), y = this.nr(op), x = this.nr(op);
      numere = [x, y, l, h];
    }
    if (op === 'rectclip') {
      this.n.decupaje++;
      this.golesteCalea();
      return;
    }
    const veche = this.gs.cale;
    this.golesteCalea();
    for (let k = 0; k < numere.length; k += 4) {
      const [x, y, l, h] = numere.slice(k, k + 4) as [number, number, number, number];
      const p = (u: number, w: number): Punct => aplica(this.gs.ctm, { x: u, y: w });
      this.muta(p(x, y));
      this.segment(op, LINIE, p(x + l, y), true);
      this.segment(op, LINIE, p(x + l, y + h), true);
      this.segment(op, LINIE, p(x, y + h), true);
      this.inchide();
    }
    this.picteaza(op === 'rectfill', false);
    this.gs.cale = veche;
  }

  private ascuns(): boolean {
    return this.straturi.some((s) => !s.vizibil);
  }

  private strat(): string | null {
    for (let i = this.straturi.length - 1; i >= 0; i--) {
      const s = (this.straturi[i] as Strat).nume;
      if (s !== null) return s;
    }
    return null;
  }

  /** `fill`, `eofill`, `stroke`: subcăile cu segmente, citite în mm prin regulile comune ușilor; calea se golește. */
  private picteaza(umplut: boolean, parImpar: boolean): void {
    const c = this.gs.cale;
    this.golesteCalea();
    if (this.pictate.has(c.id)) return;
    this.pictate.add(c.id);
    const toate = c.subcai.filter((s) => s.desenate > 0);
    if (toate.length === 0) return;
    if (this.ascuns()) {
      this.n.ascunse++;
      return;
    }
    const cai: CaleCitita[] = [];
    for (const sc of toate) {
      const r = incheieSubcalea(sc.varfuri.map(varfMm), mm(sc.cur), mm(sc.start), sc.autor, umplut);
      if (r === 'prea-mare') { this.n['prea-mari']++; continue; }
      if (r === 'degenerata') { this.n.degenerate++; continue; }
      if (r === 'praf') { this.n['sub-rezolutie']++; continue; }
      if (r.inchidere === 'umplere') this.n['inchise-de-umplere']++;
      else if (r.inchidere === 'usa') this.n['inchise-la-usa']++;
      cai.push(r.cale);
    }
    // Regula de umplere: nonzero se normalizează după citire (ADR 0036), ca la SVG și PDF; par-impar și conturul tras rămân.
    if (cai.length > 0) this.forme.push({ cai, nonzero: umplut && !parImpar, strat: this.strat() });
  }

  /* ── Operatorii AI ── */

  /** Un operator AI ≤ 8 (operanzii îi ia de pe stivă, de sus; stiva se golește după el, ca între operatorii PDF). */
  private operatorAi(v: string): void {
    const s = this.stiva;
    const nr = (k: number): number => {
      const x = s[s.length - k];
      return esteNumar(x ?? null) ? (x as number) : Number.NaN;
    };
    const pct = (x: number, y: number): Punct => aplica(this.gs.ctm, { x, y });
    const are = (k: number): boolean => s.length >= k && Array.from({ length: k }, (_, i) => nr(i + 1)).every(Number.isFinite);
    switch (v) {
      case 'm': if (are(2)) this.muta(pct(nr(2), nr(1))); return;
      case 'l': case 'L': if (are(2)) this.segment(v, LINIE, pct(nr(2), nr(1)), false); return;
      case 'c': case 'C':
        if (are(6)) this.segment(v, { tip: 'C', c1: pct(nr(6), nr(5)), c2: pct(nr(4), nr(3)) }, pct(nr(2), nr(1)), false);
        return;
      case 'v': case 'V': {
        const c = this.gs.cale.curenta;
        if (are(4) && c) this.segment(v, { tip: 'C', c1: c.cur, c2: pct(nr(4), nr(3)) }, pct(nr(2), nr(1)), false);
        return;
      }
      case 'y': case 'Y':
        if (are(4)) {
          const capat = pct(nr(2), nr(1));
          this.segment(v, { tip: 'C', c1: pct(nr(4), nr(3)), c2: capat }, capat, false);
        }
        return;
      case 'h': case 'H': this.inchide(); return;
      case 'f': case 'b': this.inchide(); this.picteazaAi('umple'); return;
      case 'F': case 'B': this.picteazaAi('umple'); return;
      case 's': this.inchide(); this.picteazaAi('trage'); return;
      case 'S': this.picteazaAi('trage'); return;
      case 'N': this.inchide(); this.picteazaAi('nimic'); return;
      case 'n': this.picteazaAi('nimic'); return;
      case '*u': this.compus = { fel: 'nimic', impar: false }; return;
      case '*U': {
        const c = this.compus;
        this.compus = null;
        if (c) this.picteazaCompus(c.fel, c.impar);
        return;
      }
      case 'q': this.salveaza(); return;
      case 'Q': this.restaureaza(); return;
      case 'W': this.decupeaza(); return;
      // Stratul: primul operand al lui Lb e vizibilitatea; numele vine cu Ln; LB îl închide.
      case 'Lb': this.straturi.push({ vizibil: s[0] !== 0 && s[0] !== false, nume: null }); return;
      case 'Ln': {
        const x = s[s.length - 1], st = this.straturi[this.straturi.length - 1];
        if (st && x instanceof Sir) st.nume = latin1(x.b);
        return;
      }
      case 'LB': this.straturi.pop(); return;
      case 'To':
        if (!this.ascuns()) this.n['sarit-text']++;
        this.inText = true;
        return;
      case 'TO': return;
      case 'XI': if (!this.ascuns()) this.n['sarit-imagine']++; return;
      case 'XR': this.gs.impar = nr(1) === 1; return;
      default: return;
    }
  }

  /** Pictarea unui AI: în calea compusă, doar se ține minte (subcăile se adună până la *U); altfel, calea se pictează. */
  private picteazaAi(fel: 'nimic' | 'umple' | 'trage'): void {
    if (this.compus) {
      this.compus = { fel, impar: this.gs.impar };
      return;
    }
    this.picteazaCompus(fel, this.gs.impar);
  }

  private picteazaCompus(fel: 'nimic' | 'umple' | 'trage', impar: boolean): void {
    if (fel === 'umple') this.picteaza(true, impar);
    else if (fel === 'trage') this.picteaza(false, false);
    else this.newpath();
  }
}

/* ── Ușa ───────────────────────────────────────────────────────────────────────────────────────────────────────────── */

const numaratoareGoala = (): Numaratoare => Object.fromEntries(CODURI_AVERTISMENT_EPS.map((k) => [k, 0])) as Numaratoare;

/**
 * Citește un EPS sau un AI ≤ 8 (ADR 0115). Nu aruncă: orice eroare a fișierului e un refuz cu cod, sau un avertisment
 * numărat. Un AI de la Illustrator 9 încolo e PDF și îl citește ușa PDF; alegerea, după antet, o face apelantul.
 */
export function citesteEps(octeti: Uint8Array): RezultatEps {
  if (octeti.length > PLAFON_IMPORT.octeti) return { ok: false, cod: 'octeti', detaliu: String(octeti.length) };
  const ps = postscript(octeti);
  if (!ps) return { ok: false, cod: 'nu-e-ps' };
  const a = antet(ps);
  if (a.aiNou) return { ok: false, cod: 'ai-nou', detaliu: a.creator.slice(0, NUME_IN_REFUZ) };
  const n = numaratoareGoala();
  const it = new Interpretor(ps, a.ai, n);
  try {
    it.ruleaza();
  } catch (e) {
    if (e instanceof RefuzPs) return { ok: false, cod: e.cod, detaliu: e.detaliu, avertismente: n };
    if (e instanceof EroarePs) return { ok: false, cod: 'ps', detaliu: e.message, avertismente: n };
    if (e instanceof PestePlafon) return { ok: false, cod: 'plafon', detaliu: e.detaliu, avertismente: n };
    throw e;
  }
  // Ca la ușile SVG și PDF: plafonul pe intrare, apoi fiecare formă nonzero prin aranjamentul exact, cu bugetul întregului
  // fișier, apoi plafonul pe ieșire și marginile.
  const intrare = it.forme.reduce((s, f) => s + f.cai.reduce((t, c) => t + c.varfuri.length, 0), 0);
  if (intrare > PLAFON.varfuri) return { ok: false, cod: 'plafon', detaliu: String(intrare), avertismente: n };
  const buget = { ramas: PLAFON_IMPORT.normalizare };
  const cai: CaleEps[] = [];
  for (const f of it.forme) {
    for (const c of normalizeazaForma(f.cai, f.nonzero, buget, n)) {
      if (!c.inchis) n.deschise++;
      cai.push({ varfuri: c.varfuri, inchis: c.inchis, strat: f.strat });
    }
  }
  const primite = cai.reduce((s, c) => s + c.varfuri.length, 0);
  if (primite > PLAFON.varfuri) return { ok: false, cod: 'plafon', detaliu: String(primite), avertismente: n };
  if (preaDeparte(cai)) return { ok: false, cod: 'departe', avertismente: n };
  if (cai.length === 0) return { ok: false, cod: 'gol', avertismente: n };
  const straturi = [...new Set(cai.map((c) => c.strat).filter((s): s is string => s !== null))];
  return { ok: true, cai, straturi, illustrator: a.ai, avertismente: n };
}

