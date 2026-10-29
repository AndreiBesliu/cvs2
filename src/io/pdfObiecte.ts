/**
 * Obiectele unui PDF (ADR 0104 §1–§3), cu un cititor propriu (pdf.js are ~300 kB și aduce randarea, de care importul n-are
 * nevoie): lexerul și valorile (numere, nume, șiruri, tablouri, dicționare, referințe, fluxuri), tabelul xref (clasic sau
 * flux, cu secțiunile vechi prin /Prev, cu /XRefStm și cu fluxurile de obiecte), reconstruirea lui din „N G obj” când
 * offseturile nu se potrivesc, și filtrele fluxurilor (Flate cu predictorii PNG și TIFF, ASCIIHex, ASCII85, LZW,
 * RunLength). Decodarea Flate trece prin `DecompressionStream`, deci totul e asincron. Un fișier stricat dă `PdfStricat`,
 * prins de ușă; plafoanele dau `PdfPestePlafon`.
 */

export class Nume {
  readonly v: string;
  constructor(v: string) {
    this.v = v;
  }
}
export class Ref {
  readonly n: number;
  readonly g: number;
  constructor(n: number, g: number) {
    this.n = n;
    this.g = g;
  }
}
/** Un cuvânt-cheie: `obj`, `stream`, `R`, `true`, sau un operator din fluxul de conținut. */
export class Cuvant {
  readonly v: string;
  constructor(v: string) {
    this.v = v;
  }
}
/** Un flux: dicționarul și octeții lui, nedecodați. */
export class Flux {
  readonly dict: Dict;
  readonly date: Uint8Array;
  constructor(dict: Dict, date: Uint8Array) {
    this.dict = dict;
    this.date = date;
  }
}
export type Dict = Map<string, Val>;
/** Șirurile rămân octeți (`Uint8Array`): textul lor îl decodează cine îl folosește (`textPdf`). */
export type Val = null | boolean | number | Uint8Array | Nume | Ref | Flux | Val[] | Dict;

export class PdfStricat extends Error {}
export class PdfPestePlafon extends Error {}

/** Octeții decodați: pe un flux și pe tot fișierul (o bombă de compresie se oprește aici). */
export const PLAFON_DECODARE = { flux: 128 * 1024 * 1024, total: 512 * 1024 * 1024 } as const;
/** Lanțul de secțiuni xref (/Prev) și lanțul de referințe către referințe. */
const SECTIUNI_MAXIME = 1024;

/* ── Lexerul ───────────────────────────────────────────────────────────────────────────────────────────────────────── */

const ALB = new Uint8Array(256);
for (const c of [0, 9, 10, 12, 13, 32]) ALB[c] = 1;
const DELIM = new Uint8Array(256);
for (const c of '()<>[]{}/%') DELIM[c.charCodeAt(0)] = 1;

export type Simbol = '[' | ']' | '<<' | '>>' | '{' | '}';
export type Jeton = number | Nume | Uint8Array | Cuvant | Simbol | null;

const hex = (c: number): number => (c >= 48 && c <= 57 ? c - 48 : c >= 65 && c <= 70 ? c - 55 : c >= 97 && c <= 102 ? c - 87 : -1);

export class Lexer {
  readonly b: Uint8Array;
  pos: number;
  constructor(b: Uint8Array, pos = 0) {
    this.b = b;
    this.pos = pos;
  }

  /** Spațiile albe și comentariile. */
  sareAlb(): void {
    const b = this.b;
    for (;;) {
      while (this.pos < b.length && ALB[b[this.pos] as number]) this.pos++;
      if (this.pos < b.length && b[this.pos] === 0x25) {
        while (this.pos < b.length && b[this.pos] !== 10 && b[this.pos] !== 13) this.pos++;
        continue;
      }
      return;
    }
  }

  /** Jetonul următor, sau null la sfârșit. */
  jeton(): Jeton {
    this.sareAlb();
    const b = this.b;
    if (this.pos >= b.length) return null;
    const c = b[this.pos] as number;
    if (c === 0x5b) { this.pos++; return '['; }
    if (c === 0x5d) { this.pos++; return ']'; }
    if (c === 0x7b) { this.pos++; return '{'; }
    if (c === 0x7d) { this.pos++; return '}'; }
    if (c === 0x3c) {
      if (b[this.pos + 1] === 0x3c) { this.pos += 2; return '<<'; }
      return this.sirHex();
    }
    if (c === 0x3e) {
      // `>>`; un `>` singur e o greșeală a fișierului: se sare.
      this.pos += b[this.pos + 1] === 0x3e ? 2 : 1;
      return '>>';
    }
    if (c === 0x28) return this.sirLiteral();
    if (c === 0x2f) return this.nume();
    if (c === 0x29) { this.pos++; return this.jeton(); }
    if ((c >= 48 && c <= 57) || c === 0x2b || c === 0x2d || c === 0x2e) return this.numar();
    const start = this.pos;
    while (this.pos < b.length && !ALB[b[this.pos] as number] && !DELIM[b[this.pos] as number]) this.pos++;
    return new Cuvant(latin1(b.subarray(start, this.pos)));
  }

  private numar(): number | Cuvant {
    const b = this.b;
    const start = this.pos;
    // Semnele repetate (`--5`, scrise de unele programe) contează ca unul, ca în Adobe Reader; un al doilea punct încheie
    // numărul.
    let negativ = false;
    while (b[this.pos] === 0x2b || b[this.pos] === 0x2d) {
      if (b[this.pos] === 0x2d) negativ = true;
      this.pos++;
    }
    const cifre = this.pos;
    let punct = false;
    while (this.pos < b.length) {
      const c = b[this.pos] as number;
      if (c === 0x2e && !punct) punct = true;
      else if (c < 48 || c > 57) break;
      this.pos++;
    }
    const n = this.pos - cifre;
    if (n === 0 || (n === 1 && punct)) {
      // Nu era un număr: un cuvânt care începe cu un semn sau cu punct.
      while (this.pos < b.length && !ALB[b[this.pos] as number] && !DELIM[b[this.pos] as number]) this.pos++;
      return new Cuvant(latin1(b.subarray(start, this.pos)));
    }
    const v = Number(latin1(b.subarray(cifre, this.pos)));
    return negativ ? -v : v;
  }

  private nume(): Nume {
    const b = this.b;
    this.pos++;
    const octeti: number[] = [];
    while (this.pos < b.length && !ALB[b[this.pos] as number] && !DELIM[b[this.pos] as number]) {
      const c = b[this.pos] as number;
      if (c === 0x23 && hex(b[this.pos + 1] ?? 0) >= 0 && hex(b[this.pos + 2] ?? 0) >= 0) {
        octeti.push(hex(b[this.pos + 1] as number) * 16 + hex(b[this.pos + 2] as number));
        this.pos += 3;
      } else {
        octeti.push(c);
        this.pos++;
      }
    }
    return new Nume(utf8SauLatin1(Uint8Array.from(octeti)));
  }

  private sirLiteral(): Uint8Array {
    const b = this.b;
    this.pos++;
    const out: number[] = [];
    let adancime = 1;
    while (this.pos < b.length) {
      const c = b[this.pos++] as number;
      if (c === 0x28) { adancime++; out.push(c); continue; }
      if (c === 0x29) {
        if (--adancime === 0) break;
        out.push(c);
        continue;
      }
      if (c === 0x5c) {
        const e = b[this.pos++];
        if (e === undefined) break;
        const simple: Readonly<Record<number, number>> = { 0x6e: 10, 0x72: 13, 0x74: 9, 0x62: 8, 0x66: 12, 0x28: 0x28, 0x29: 0x29, 0x5c: 0x5c };
        if (simple[e] !== undefined) out.push(simple[e] as number);
        else if (e >= 0x30 && e <= 0x37) {
          let v = e - 0x30;
          for (let k = 0; k < 2 && (b[this.pos] ?? 0) >= 0x30 && (b[this.pos] ?? 0) <= 0x37; k++) v = v * 8 + ((b[this.pos++] as number) - 0x30);
          out.push(v & 0xff);
        } else if (e === 13) {
          if (b[this.pos] === 10) this.pos++;
        } else if (e !== 10) out.push(e);
        continue;
      }
      if (c === 13) {
        // Capătul de rând din șir e LF, oricum ar fi scris.
        if (b[this.pos] === 10) this.pos++;
        out.push(10);
        continue;
      }
      out.push(c);
    }
    return Uint8Array.from(out);
  }

  private sirHex(): Uint8Array {
    const b = this.b;
    this.pos++;
    const out: number[] = [];
    let jum = -1;
    while (this.pos < b.length) {
      const c = b[this.pos++] as number;
      if (c === 0x3e) break;
      const h = hex(c);
      if (h < 0) continue;
      if (jum < 0) jum = h;
      else {
        out.push(jum * 16 + h);
        jum = -1;
      }
    }
    if (jum >= 0) out.push(jum * 16);
    return Uint8Array.from(out);
  }
}

/** Octeții ca text latin1 (unul la unul: indicii rămân aceiași). */
export function latin1(b: Uint8Array): string {
  let s = '';
  for (let i = 0; i < b.length; i += 8192) s += String.fromCharCode(...b.subarray(i, i + 8192));
  return s;
}

function utf8SauLatin1(b: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(b);
  } catch {
    return latin1(b);
  }
}

/** Un șir de text PDF (§7.9.2.2): UTF-16BE cu BOM, UTF-8 cu BOM, altfel PDFDocEncoding (aici, latin1). */
export function textPdf(v: Val): string | null {
  if (!(v instanceof Uint8Array)) return null;
  if (v[0] === 0xfe && v[1] === 0xff) return new TextDecoder('utf-16be').decode(v.subarray(2));
  if (v[0] === 0xef && v[1] === 0xbb && v[2] === 0xbf) return new TextDecoder('utf-8').decode(v.subarray(3));
  return latin1(v);
}

/* ── Valorile ──────────────────────────────────────────────────────────────────────────────────────────────────────── */

/**
 * Citește valori din jetoane. `referinte`: „N G R” e o referință (în fișier; în fluxul de conținut nu există). Imbricarea
 * tablourilor și a dicționarelor e plafonată (un fișier stricat ar umple stiva).
 */
export class Cititor {
  readonly lex: Lexer;
  private readonly referinte: boolean;
  private coada: Jeton[] = [];
  constructor(lex: Lexer, referinte = true) {
    this.lex = lex;
    this.referinte = referinte;
  }

  jeton(): Jeton {
    return this.coada.length > 0 ? (this.coada.shift() as Jeton) : this.lex.jeton();
  }

  private priveste(k: number): Jeton {
    while (this.coada.length <= k) this.coada.push(this.lex.jeton());
    return this.coada[k] as Jeton;
  }

  valoare(t: Jeton = this.jeton(), adancime = 0): Val | Cuvant | Simbol {
    if (adancime > 256) throw new PdfStricat('valori imbricate prea adânc');
    if (t === null) throw new PdfStricat('sfârșitul fișierului în mijlocul unei valori');
    if (typeof t === 'number') {
      if (this.referinte && Number.isInteger(t) && t >= 0) {
        const g = this.priveste(0), r = this.priveste(1);
        if (typeof g === 'number' && Number.isInteger(g) && g >= 0 && r instanceof Cuvant && r.v === 'R') {
          this.coada.splice(0, 2);
          return new Ref(t, g);
        }
      }
      return t;
    }
    if (t === '[') {
      const a: Val[] = [];
      for (;;) {
        const u = this.jeton();
        if (u === ']' || u === null) break;
        const v = this.valoare(u, adancime + 1);
        if (v instanceof Cuvant || typeof v === 'string') continue;
        a.push(v);
      }
      return a;
    }
    if (t === '<<') {
      const d: Dict = new Map();
      for (;;) {
        const k = this.jeton();
        if (k === '>>' || k === null) break;
        if (!(k instanceof Nume)) continue;
        const u = this.jeton();
        if (u === '>>' || u === null) break;
        const v = this.valoare(u, adancime + 1);
        if (v instanceof Cuvant || typeof v === 'string') continue;
        d.set(k.v, v);
      }
      return d;
    }
    if (t instanceof Cuvant) {
      if (t.v === 'true') return true;
      if (t.v === 'false') return false;
      if (t.v === 'null') return null;
      return t;
    }
    return t;
  }
}

/* ── Accesul la valori ─────────────────────────────────────────────────────────────────────────────────────────────── */

export const esteDict = (v: Val | undefined): v is Dict => v instanceof Map;
export const numar = (v: Val | undefined, implicit: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : implicit);
export const numeDin = (v: Val | undefined): string | null => (v instanceof Nume ? v.v : null);

/* ── Documentul ────────────────────────────────────────────────────────────────────────────────────────────────────── */

type Intrare = { readonly tip: 0 } | { readonly tip: 1; readonly pos: number; readonly g: number } | { readonly tip: 2; readonly flux: number; readonly index: number };

/** Octeții „startxref”, „xref”, „trailer”, „obj”, „endstream” căutați direct. */
const cuv = (s: string): Uint8Array => Uint8Array.from(s, (c) => c.charCodeAt(0));
const STARTXREF = cuv('startxref');
const ENDSTREAM = cuv('endstream');

function cauta(b: Uint8Array, ac: Uint8Array, de: number, invers = false): number {
  const n = ac.length;
  if (invers) {
    for (let i = Math.min(de, b.length - n); i >= 0; i--) {
      let k = 0;
      while (k < n && b[i + k] === ac[k]) k++;
      if (k === n) return i;
    }
    return -1;
  }
  for (let i = Math.max(0, de); i + n <= b.length; i++) {
    let k = 0;
    while (k < n && b[i + k] === ac[k]) k++;
    if (k === n) return i;
  }
  return -1;
}

export class DocumentPdf {
  private intrari = new Map<number, Intrare>();
  private cache = new Map<number, Val>();
  private fluxuriObiecte = new Map<number, Promise<Map<number, Val>>>();
  private decodati = 0;
  /** Trailerul (cel mai nou; cheile lipsă, din cele vechi). */
  trailer: Dict = new Map();
  /** Tabelul xref s-a reconstruit din „N G obj” (offseturi greșite, sau xref-ul lipsă). */
  reconstruit = false;
  /** Fluxuri care nu s-au putut decoda întregi (Flate trunchiat): ce a ieșit s-a păstrat. */
  fluxuriStricate = 0;

  readonly b: Uint8Array;

  private constructor(b: Uint8Array) {
    this.b = b;
  }

  static async deschide(b: Uint8Array): Promise<DocumentPdf> {
    const d = new DocumentPdf(b);
    try {
      await d.citesteXref();
      if (!d.trailer.has('Root')) throw new PdfStricat('trailerul n-are /Root');
      // Rădăcina trebuie să se citească (offseturile pot fi toate greșite, cu un tabel valid ca formă).
      const root = await d.rezolva(d.trailer.get('Root') ?? null);
      if (!esteDict(root)) throw new PdfStricat('/Root nu e un dicționar');
    } catch (e) {
      if (e instanceof PdfPestePlafon) throw e;
      await d.reconstruieste();
    }
    return d;
  }

  /* ── Tabelul xref ── */

  private async citesteXref(): Promise<void> {
    const b = this.b;
    const i = cauta(b, STARTXREF, b.length - 1, true);
    if (i < 0) throw new PdfStricat('lipsește startxref');
    const lex = new Lexer(b, i + STARTXREF.length);
    let pos = lex.jeton();
    const vazute = new Set<number>();
    while (typeof pos === 'number' && Number.isInteger(pos) && pos >= 0 && pos < b.length && !vazute.has(pos)) {
      if (vazute.size >= SECTIUNI_MAXIME) throw new PdfStricat('prea multe secțiuni xref');
      vazute.add(pos);
      const c = new Cititor(new Lexer(b, pos));
      const t = c.jeton();
      let trailer: Dict;
      if (t instanceof Cuvant && t.v === 'xref') {
        trailer = this.tabelClasic(c);
        const stm = trailer.get('XRefStm');
        if (typeof stm === 'number' && stm >= 0 && stm < b.length) await this.fluxXref(stm);
      } else if (typeof t === 'number') {
        trailer = await this.fluxXref(pos);
      } else {
        throw new PdfStricat('la offsetul xref nu e nici „xref”, nici un obiect');
      }
      // Secțiunile vin de la cea mai nouă: cheile ei câștigă, cele vechi completează doar ce lipsește.
      for (const [k, v] of trailer) if (!this.trailer.has(k) && k !== 'Prev' && k !== 'XRefStm') this.trailer.set(k, v);
      pos = trailer.get('Prev') as Jeton;
    }
    if (this.intrari.size === 0) throw new PdfStricat('tabelul xref e gol');
  }

  private pune(n: number, e: Intrare): void {
    if (!this.intrari.has(n)) this.intrari.set(n, e);
  }

  private tabelClasic(c: Cititor): Dict {
    for (;;) {
      const t = c.jeton();
      if (t instanceof Cuvant && t.v === 'trailer') break;
      if (typeof t !== 'number') throw new PdfStricat('subsecțiune xref invalidă');
      const n = c.jeton();
      if (typeof n !== 'number' || n < 0) throw new PdfStricat('subsecțiune xref fără număr');
      for (let k = 0; k < n; k++) {
        const pos = c.jeton(), g = c.jeton(), fel = c.jeton();
        if (typeof pos !== 'number' || typeof g !== 'number' || !(fel instanceof Cuvant)) throw new PdfStricat('intrare xref invalidă');
        // Primul obiect al unei subsecțiuni care începe la 1 e de fapt 0 la unele programe; îl lăsăm cum e scris.
        this.pune(t + k, fel.v === 'n' ? { tip: 1, pos, g } : { tip: 0 });
      }
    }
    const tr = c.valoare();
    if (!esteDict(tr as Val)) throw new PdfStricat('trailer fără dicționar');
    return tr as Dict;
  }

  private async fluxXref(pos: number): Promise<Dict> {
    const o = this.obiectLa(pos);
    if (!o || !(o.val instanceof Flux)) throw new PdfStricat('fluxul xref lipsește');
    const d = o.val.dict;
    if (numeDin(d.get('Type')) !== 'XRef') throw new PdfStricat('obiectul de la offsetul xref nu e /XRef');
    const w = d.get('W');
    if (!Array.isArray(w) || w.length < 3) throw new PdfStricat('/W lipsește');
    const [w1, w2, w3] = w.map((x) => numar(x, 0)) as [number, number, number];
    if (w1 < 0 || w2 < 0 || w3 < 0 || w1 > 8 || w2 > 8 || w3 > 8) throw new PdfStricat('/W invalid');
    const date = await this.decodeaza(o.val);
    const idx = d.get('Index');
    const sub = Array.isArray(idx) && idx.length >= 2 ? idx.map((x) => numar(x, 0)) : [0, numar(d.get('Size'), 0)];
    const lat = w1 + w2 + w3;
    let p = 0;
    const camp = (n: number): number => {
      let v = 0;
      for (let k = 0; k < n; k++) v = v * 256 + (date[p++] ?? 0);
      return v;
    };
    for (let s = 0; s + 1 < sub.length; s += 2) {
      const start = sub[s] as number, n = sub[s + 1] as number;
      for (let k = 0; k < n && p + lat <= date.length; k++) {
        const tip = w1 === 0 ? 1 : camp(w1);
        const f2 = camp(w2), f3 = camp(w3);
        if (tip === 1) this.pune(start + k, { tip: 1, pos: f2, g: f3 });
        else if (tip === 2) this.pune(start + k, { tip: 2, flux: f2, index: f3 });
        else if (tip === 0) this.pune(start + k, { tip: 0 });
      }
    }
    return d;
  }

  /**
   * Reconstruirea (ADR 0104 §2): fiecare „N G obj” din fișier, cel din urmă câștigând; trailerul din ultimul „trailer” cu
   * /Root, altfel din ultimul flux /XRef cu /Root, altfel un /Catalog găsit printre obiecte. Obiectele din fluxurile de
   * obiecte se adaugă după cele de sus (acestea câștigă).
   */
  private async reconstruieste(): Promise<void> {
    this.reconstruit = true;
    this.intrari = new Map();
    this.cache = new Map();
    this.fluxuriObiecte = new Map();
    const b = this.b;
    const text = latin1(b);
    const re = /(\d+)[\0\t\n\f\r ]+(\d+)[\0\t\n\f\r ]+obj\b/g;
    const pozitii = new Map<number, { pos: number; g: number }>();
    for (let m = re.exec(text); m; m = re.exec(text)) {
      const pre = m.index > 0 ? (b[m.index - 1] as number) : 32;
      if (!ALB[pre] && !DELIM[pre]) continue;
      pozitii.set(Number(m[1]), { pos: m.index, g: Number(m[2]) });
    }
    for (const [n, x] of pozitii) this.intrari.set(n, { tip: 1, pos: x.pos, g: x.g });
    this.trailer = new Map();
    const tr = /trailer[\0\t\n\f\r ]*<</g;
    let ultim: Dict | null = null;
    for (let m = tr.exec(text); m; m = tr.exec(text)) {
      try {
        const c = new Cititor(new Lexer(b, m.index + 7));
        const v = c.valoare();
        if (esteDict(v as Val) && (v as Dict).has('Root')) ultim = v as Dict;
      } catch { /* un trailer stricat: următorul */ }
    }
    const fluxuriObiecte: number[] = [];
    let catalog: Ref | null = null;
    for (const [n, x] of pozitii) {
      const o = this.obiectLa(x.pos);
      if (!o) continue;
      const d = o.val instanceof Flux ? o.val.dict : esteDict(o.val) ? o.val : null;
      if (!d) continue;
      const tip = numeDin(d.get('Type'));
      if (tip === 'XRef' && d.has('Root') && !ultim) ultim = d;
      if (tip === 'ObjStm') fluxuriObiecte.push(n);
      if (tip === 'Catalog') catalog = new Ref(n, x.g);
    }
    for (const n of fluxuriObiecte) {
      try {
        const obiecte = await this.fluxObiecte(n);
        let k = 0;
        for (const nr of obiecte.keys()) this.pune(nr, { tip: 2, flux: n, index: k++ });
      } catch (e) {
        if (e instanceof PdfPestePlafon) throw e;
      }
    }
    if (ultim) for (const [k, v] of ultim) if (k !== 'Prev' && k !== 'XRefStm') this.trailer.set(k, v);
    if (!this.trailer.has('Root') && catalog) this.trailer.set('Root', catalog);
    if (!this.trailer.has('Root')) throw new PdfStricat('nicio rădăcină (/Root, /Catalog) după reconstruire');
  }

  /* ── Obiectele ── */

  /** Obiectul indirect de la `pos`: „N G obj valoare [stream … endstream] endobj”, sau null dacă nu e acolo. */
  obiectLa(pos: number): { readonly n: number; readonly g: number; readonly val: Val } | null {
    const c = new Cititor(new Lexer(this.b, pos));
    const n = c.jeton(), g = c.jeton(), o = c.jeton();
    if (typeof n !== 'number' || typeof g !== 'number' || !(o instanceof Cuvant) || o.v !== 'obj') return null;
    const v = c.valoare();
    if (v instanceof Cuvant || typeof v === 'string') return { n, g, val: null };
    if (esteDict(v)) {
      const lex = c.lex;
      const inainte = lex.pos;
      const t = c.jeton();
      if (t instanceof Cuvant && t.v === 'stream') return { n, g, val: this.fluxDupa(v, lex.pos) };
      lex.pos = inainte;
    }
    return { n, g, val: v };
  }

  /** Datele unui flux care încep după cuvântul `stream` (de la `pos`): /Length, verificat cu `endstream`, altfel căutat. */
  private fluxDupa(d: Dict, pos: number): Flux {
    const b = this.b;
    let start = pos;
    if (b[start] === 13 && b[start + 1] === 10) start += 2;
    else if (b[start] === 10 || b[start] === 13) start += 1;
    let lungime = -1;
    const l = d.get('Length');
    if (typeof l === 'number') lungime = l;
    else if (l instanceof Ref) {
      const e = this.intrari.get(l.n);
      if (e && e.tip === 1) {
        const o = this.obiectLa(e.pos);
        if (o && typeof o.val === 'number') lungime = o.val;
      }
    }
    if (lungime >= 0 && start + lungime <= b.length) {
      const lex = new Lexer(b, start + lungime);
      const t = lex.jeton();
      if (t instanceof Cuvant && t.v === 'endstream') return new Flux(d, b.subarray(start, start + lungime));
    }
    const sf = cauta(b, ENDSTREAM, start);
    if (sf < 0) return new Flux(d, b.subarray(start));
    let fin = sf;
    if (b[fin - 1] === 10) fin--;
    if (b[fin - 1] === 13) fin--;
    return new Flux(d, b.subarray(start, Math.max(start, fin)));
  }

  /** Obiectul numărul `n` (generația cea mai nouă), sau null dacă lipsește. */
  async obiect(n: number): Promise<Val> {
    if (this.cache.has(n)) return this.cache.get(n) ?? null;
    const e = this.intrari.get(n);
    let v: Val = null;
    if (e && e.tip === 1) {
      const o = this.obiectLa(e.pos);
      if (!o || o.n !== n) {
        // Offsetul nu duce la obiect: tabelul e greșit; o singură reconstruire, apoi din nou.
        if (this.reconstruit) return null;
        await this.reconstruieste();
        return this.obiect(n);
      }
      v = o.val;
    } else if (e && e.tip === 2) {
      v = (await this.fluxObiecte(e.flux)).get(n) ?? null;
    }
    this.cache.set(n, v);
    return v;
  }

  /** O valoare, cu referințele urmate (și lanțurile de referințe, plafonate). */
  async rezolva(v: Val | undefined): Promise<Val> {
    let x: Val = v ?? null;
    for (let k = 0; x instanceof Ref; k++) {
      if (k > SECTIUNI_MAXIME) throw new PdfStricat('lanț de referințe fără capăt');
      x = await this.obiect(x.n);
    }
    return x;
  }

  /** Obiectele unui flux de obiecte (/ObjStm), după numărul lor. */
  private fluxObiecte(n: number): Promise<Map<number, Val>> {
    let p = this.fluxuriObiecte.get(n);
    if (!p) {
      p = (async () => {
        const e = this.intrari.get(n);
        if (!e || e.tip !== 1) throw new PdfStricat(`fluxul de obiecte ${n} lipsește`);
        const o = this.obiectLa(e.pos);
        if (!o || !(o.val instanceof Flux)) throw new PdfStricat(`fluxul de obiecte ${n} nu e un flux`);
        const date = await this.decodeaza(o.val);
        const cate = numar(o.val.dict.get('N'), 0), prim = numar(o.val.dict.get('First'), 0);
        const c = new Cititor(new Lexer(date), false);
        const antet: Array<[number, number]> = [];
        for (let k = 0; k < cate; k++) {
          const nr = c.jeton(), off = c.jeton();
          if (typeof nr !== 'number' || typeof off !== 'number') break;
          antet.push([nr, off]);
        }
        const rez = new Map<number, Val>();
        for (const [nr, off] of antet) {
          try {
            const v = new Cititor(new Lexer(date, prim + off)).valoare();
            if (!(v instanceof Cuvant) && typeof v !== 'string') rez.set(nr, v);
          } catch (err) {
            if (!(err instanceof PdfStricat)) throw err;
          }
        }
        return rez;
      })();
      this.fluxuriObiecte.set(n, p);
    }
    return p;
  }

  /* ── Filtrele ── */

  /** Octeții decodați ai unui flux, prin filtrele lui, în ordine. Un filtru de imagine (DCT, JPX…) aruncă `PdfStricat`. */
  async decodeaza(f: Flux): Promise<Uint8Array> {
    let date = f.date;
    const fil = await this.rezolva(f.dict.get('Filter') ?? f.dict.get('F'));
    const par = await this.rezolva(f.dict.get('DecodeParms') ?? f.dict.get('DP'));
    const filtre = Array.isArray(fil) ? fil : fil === null ? [] : [fil];
    const parametri = Array.isArray(par) ? par : [par];
    for (let i = 0; i < filtre.length; i++) {
      const nume = numeDin(filtre[i]);
      const p = await this.rezolva(parametri[i] ?? null);
      const dp = esteDict(p) ? p : new Map<string, Val>();
      switch (nume) {
        case 'FlateDecode': case 'Fl': {
          const r = await inflate(date);
          if (!r.intreg) this.fluxuriStricate++;
          date = predictor(r.date, dp);
          break;
        }
        case 'LZWDecode': case 'LZW':
          date = predictor(lzw(date, numar(dp.get('EarlyChange'), 1)), dp);
          break;
        case 'ASCIIHexDecode': case 'AHx': date = asciiHex(date); break;
        case 'ASCII85Decode': case 'A85': date = ascii85(date); break;
        case 'RunLengthDecode': case 'RL': date = runLength(date); break;
        case 'Crypt': if (numeDin(dp.get('Name')) !== 'Identity' && dp.has('Name')) throw new PdfStricat('filtru Crypt'); break;
        default: throw new PdfStricat(`filtru necunoscut: ${nume ?? '?'}`);
      }
      if (date.length > PLAFON_DECODARE.flux) throw new PdfPestePlafon('un flux decodat trece de plafon');
    }
    this.decodati += date.length;
    if (this.decodati > PLAFON_DECODARE.total) throw new PdfPestePlafon('fișierul decodat trece de plafon');
    return date;
  }
}

/* ── Filtrele, pure ────────────────────────────────────────────────────────────────────────────────────────────────── */

function lipeste(bucati: readonly Uint8Array[], total: number): Uint8Array {
  const out = new Uint8Array(total);
  let p = 0;
  for (const x of bucati) {
    out.set(x, p);
    p += x.length;
  }
  return out;
}

async function prin(date: Uint8Array, format: 'deflate' | 'deflate-raw', plafon: number): Promise<{ readonly date: Uint8Array; readonly intreg: boolean }> {
  const ds = new DecompressionStream(format);
  const scriitor = ds.writable.getWriter();
  scriitor.write(date as Uint8Array<ArrayBuffer>).catch(() => undefined);
  scriitor.close().catch(() => undefined);
  const cititor = ds.readable.getReader();
  const bucati: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await cititor.read();
      if (done) break;
      bucati.push(value);
      total += value.length;
      if (total > plafon) {
        void cititor.cancel().catch(() => undefined);
        throw new PdfPestePlafon('un flux decodat trece de plafon');
      }
    }
  } catch (e) {
    if (e instanceof PdfPestePlafon) throw e;
    if (total === 0) throw e;
    return { date: lipeste(bucati, total), intreg: false };
  }
  return { date: lipeste(bucati, total), intreg: true };
}

/**
 * Flate (zlib); fără antetul zlib, ca deflate brut. Un flux trunchiat (stricat la capăt) dă ce a ieșit până acolo,
 * marcat neîntreg; unul din care nu iese nimic aruncă.
 */
export async function inflate(date: Uint8Array, plafon: number = PLAFON_DECODARE.flux): Promise<{ readonly date: Uint8Array; readonly intreg: boolean }> {
  try {
    return await prin(date, 'deflate', plafon);
  } catch (e) {
    if (e instanceof PdfPestePlafon) throw e;
  }
  try {
    return await prin(date, 'deflate-raw', plafon);
  } catch (e) {
    if (e instanceof PdfPestePlafon) throw e;
    throw new PdfStricat('fluxul Flate nu se poate decoda');
  }
}

/** Predictorii (/DecodeParms): 2 = TIFF (8 biți), 10–15 = PNG, cu octetul de filtru pe fiecare rând. */
export function predictor(date: Uint8Array, dp: Dict): Uint8Array {
  const p = numar(dp.get('Predictor'), 1);
  if (p <= 1) return date;
  const culori = Math.max(1, numar(dp.get('Colors'), 1)), bpc = numar(dp.get('BitsPerComponent'), 8), coloane = Math.max(1, numar(dp.get('Columns'), 1));
  const bpp = Math.max(1, Math.ceil((culori * bpc) / 8));
  const rand = Math.ceil((culori * bpc * coloane) / 8);
  if (p === 2) {
    if (bpc !== 8) return date;
    const out = Uint8Array.from(date);
    for (let r = 0; r * rand < out.length; r++) {
      for (let i = r * rand + bpp; i < Math.min(out.length, (r + 1) * rand); i++) out[i] = ((out[i] as number) + (out[i - bpp] as number)) & 0xff;
    }
    return out;
  }
  const randuri = Math.floor(date.length / (rand + 1));
  const out = new Uint8Array(randuri * rand);
  for (let r = 0; r < randuri; r++) {
    const f = date[r * (rand + 1)] as number;
    const src = r * (rand + 1) + 1, dst = r * rand;
    for (let i = 0; i < rand; i++) {
      const x = date[src + i] as number;
      const a = i >= bpp ? (out[dst + i - bpp] as number) : 0;
      const b = r > 0 ? (out[dst - rand + i] as number) : 0;
      const c = r > 0 && i >= bpp ? (out[dst - rand + i - bpp] as number) : 0;
      let v: number;
      switch (f) {
        case 1: v = x + a; break;
        case 2: v = x + b; break;
        case 3: v = x + ((a + b) >> 1); break;
        case 4: {
          const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
          v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
          break;
        }
        default: v = x;
      }
      out[dst + i] = v & 0xff;
    }
  }
  return out;
}

/** LZW (§7.4.4): coduri de 9–12 biți, 256 = curăță, 257 = sfârșit; `early` = 1 mărește lățimea cu un cod mai devreme. */
export function lzw(date: Uint8Array, early = 1): Uint8Array {
  const prefix = new Int32Array(4096), sufix = new Uint8Array(4096), lung = new Uint16Array(4096);
  for (let i = 0; i < 256; i++) { prefix[i] = -1; sufix[i] = i; lung[i] = 1; }
  let urm = 258, latime = 9, anterior = -1;
  let acum = 0, biti = 0, p = 0;
  const out: number[] = [];
  const scrie = (cod: number): number => {
    const n = lung[cod] as number;
    const start = out.length;
    for (let k = 0; k < n; k++) out.push(0);
    let c = cod;
    for (let k = n - 1; k >= 0; k--) {
      out[start + k] = sufix[c] as number;
      c = prefix[c] as number;
    }
    return out[start] as number;
  };
  for (;;) {
    while (biti < latime && p < date.length) {
      acum = ((acum << 8) | (date[p++] as number)) >>> 0;
      biti += 8;
    }
    if (biti < latime) break;
    const cod = (acum >>> (biti - latime)) & ((1 << latime) - 1);
    biti -= latime;
    acum &= (1 << biti) - 1;
    if (cod === 256) { urm = 258; latime = 9; anterior = -1; continue; }
    if (cod === 257) break;
    if (anterior < 0) {
      if (cod > 255) break;
      out.push(cod);
      anterior = cod;
      continue;
    }
    let primul: number;
    if (cod < urm) primul = scrie(cod);
    else if (cod === urm) {
      // Codul abia de definit: șirul anterior plus primul lui caracter.
      const pr = scrie(anterior);
      out.push(pr);
      primul = pr;
    } else break;
    if (urm < 4096) {
      prefix[urm] = anterior;
      sufix[urm] = primul;
      lung[urm] = (lung[anterior] as number) + 1;
      urm++;
    }
    if (urm + early >= 1 << latime && latime < 12) latime++;
    anterior = cod;
  }
  return Uint8Array.from(out);
}

export function asciiHex(date: Uint8Array): Uint8Array {
  const out: number[] = [];
  let jum = -1;
  for (const c of date) {
    if (c === 0x3e) break;
    const h = hex(c);
    if (h < 0) continue;
    if (jum < 0) jum = h;
    else {
      out.push(jum * 16 + h);
      jum = -1;
    }
  }
  if (jum >= 0) out.push(jum * 16);
  return Uint8Array.from(out);
}

export function ascii85(date: Uint8Array): Uint8Array {
  const out: number[] = [];
  let grup: number[] = [];
  let i = 0;
  if (date[0] === 0x3c && date[1] === 0x7e) i = 2;
  for (; i < date.length; i++) {
    const c = date[i] as number;
    if (c === 0x7e) break;
    if (ALB[c]) continue;
    if (c === 0x7a && grup.length === 0) {
      out.push(0, 0, 0, 0);
      continue;
    }
    if (c < 0x21 || c > 0x75) continue;
    grup.push(c - 0x21);
    if (grup.length === 5) {
      let v = 0;
      for (const x of grup) v = v * 85 + x;
      out.push((v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff);
      grup = [];
    }
  }
  if (grup.length > 1) {
    const n = grup.length;
    while (grup.length < 5) grup.push(84);
    let v = 0;
    for (const x of grup) v = v * 85 + x;
    const b = [(v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff];
    out.push(...b.slice(0, n - 1));
  }
  return Uint8Array.from(out);
}

export function runLength(date: Uint8Array): Uint8Array {
  const out: number[] = [];
  for (let i = 0; i < date.length;) {
    const n = date[i++] as number;
    if (n === 128) break;
    if (n < 128) {
      for (let k = 0; k <= n && i < date.length; k++) out.push(date[i++] as number);
    } else {
      const v = date[i++];
      if (v === undefined) break;
      for (let k = 0; k < 257 - n; k++) out.push(v);
    }
  }
  return Uint8Array.from(out);
}
