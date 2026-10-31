/**
 * Lexicul PostScript al ușii EPS și AI ≤ 8 (ADR 0115) și valorile pe care le ține cititorul limitat: numerele (și cele cu
 * bază, `16#FF`), numele executabile și literale (`/x`, `//x`), șirurile literale, hex și ASCII85, acoladele procedurilor.
 * Comentariile se sar, în afară de cele de la început de rând care încep cu `%%` sau `%AI` (structura documentului, DSC, și
 * marcajele Illustrator): pe acelea le primește interpretorul, ca să sară secțiunile (prologul unui fișier Illustrator,
 * fonturile) și să se oprească la `%%Trailer`. Datele unei imagini (după operatorul ei) se sar tot de aici.
 */
import { latin1 } from './pdfObiecte.ts';

// Fiecare clasă are un câmp privat declarat (șters la rulare): TypeScript le judecă nominal, nu după forma lor (`Nume` și
// `Comentariu` au amândouă un `v`, deci altfel `instanceof` le-ar confunda la tipuri).
export class Nume {
  declare private readonly _fel: 'nume';
  readonly v: string;
  /** `/x`: se pune pe stivă; altfel se execută. */
  readonly literal: boolean;
  constructor(v: string, literal: boolean) {
    this.v = v;
    this.literal = literal;
  }
}
/** `//x`: numele înlocuit cu valoarea lui chiar la citire. */
export class NumeImediat {
  declare private readonly _fel: 'imediat';
  readonly v: string;
  constructor(v: string) {
    this.v = v;
  }
}
/** Un șir: octeții lui (textul îl decodează cine îl folosește). Executabil doar după `cvx`: cod scris la rulare. */
export class Sir {
  declare private readonly _fel: 'sir';
  readonly b: Uint8Array;
  readonly executabil: boolean;
  constructor(b: Uint8Array, executabil = false) {
    this.b = b;
    this.executabil = executabil;
  }
}
/** O procedură (tablou executabil): jetoanele ei, executate la chemare. */
export class Procedura {
  declare private readonly _fel: 'procedura';
  readonly corp: Val[];
  constructor(corp: Val[]) {
    this.corp = corp;
  }
}
/** Un operator al cititorului, după nume (în procedurile trecute prin `bind`, și ce întoarce `load`). */
export class Operator {
  declare private readonly _fel: 'operator';
  readonly v: string;
  constructor(v: string) {
    this.v = v;
  }
}
export class Marca {}
export const MARCA = new Marca();
/** `currentfile`, cu filtrele puse peste el, în ordine (primul citește direct din fișier); `curent` fals: altă sursă. */
export class Fisier {
  declare private readonly _fel: 'fisier';
  readonly filtre: readonly string[];
  readonly curent: boolean;
  constructor(filtre: readonly string[], curent: boolean) {
    this.filtre = filtre;
    this.curent = curent;
  }
}
/** Ce întoarce `save`: adâncimea stivei stărilor grafice la care se întoarce `restore`. */
export class Salvare {
  declare private readonly _fel: 'salvare';
  readonly adancime: number;
  constructor(adancime: number) {
    this.adancime = adancime;
  }
}
/** Un comentariu de structură (`%%…`, `%AI…`), de la început de rând, fără capătul rândului. */
export class Comentariu {
  declare private readonly _fel: 'comentariu';
  readonly v: string;
  constructor(v: string) {
    this.v = v;
  }
}

export type Dictionar = Map<string, Val>;
export type Val = null | boolean | number | Nume | Sir | Procedura | Operator | Marca | Fisier | Salvare | Val[] | Dictionar;
export type Jeton = number | Nume | NumeImediat | Sir | Comentariu | '{' | '}' | null;

/** O greșeală a fișierului (sintaxa, stiva, tipurile): ușa o întoarce ca refuz `ps`, cu detaliul. */
export class EroarePs extends Error {}

const ALB = new Uint8Array(256);
for (const c of [0, 9, 10, 12, 13, 32]) ALB[c] = 1;
const DELIM = new Uint8Array(256);
for (const c of '()<>[]{}/%') DELIM[c.charCodeAt(0)] = 1;
const NUMAR = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;
const BAZA = /^(\d{1,2})#([0-9A-Za-z]+)$/;

export const hexCifra = (c: number): number => (c >= 48 && c <= 57 ? c - 48 : c >= 65 && c <= 70 ? c - 55 : c >= 97 && c <= 102 ? c - 87 : -1);

export class LexerPs {
  readonly b: Uint8Array;
  pos: number;
  constructor(b: Uint8Array, pos = 0) {
    this.b = b;
    this.pos = pos;
  }

  /** Începutul rândului: primul octet, sau după CR / LF. */
  private laInceputDeRand(p: number): boolean {
    return p === 0 || this.b[p - 1] === 10 || this.b[p - 1] === 13;
  }

  /** Capătul rândului care începe la `p` (înaintea CR / LF). */
  private capatRand(p: number): number {
    const b = this.b;
    while (p < b.length && b[p] !== 10 && b[p] !== 13) p++;
    return p;
  }

  /** Trece de capătul de rând de la `p` (CR, LF sau CR LF). */
  private dupaRand(p: number): number {
    if (this.b[p] === 13) p++;
    if (this.b[p] === 10) p++;
    return p;
  }

  /** Jetonul următor, sau null la sfârșit. */
  jeton(): Jeton {
    const b = this.b;
    for (;;) {
      while (this.pos < b.length && ALB[b[this.pos] as number]) this.pos++;
      if (this.pos >= b.length) return null;
      if (b[this.pos] !== 0x25) break;
      const start = this.pos;
      const capat = this.capatRand(start);
      this.pos = capat;
      if (this.laInceputDeRand(start) && (b[start + 1] === 0x25 || (b[start + 1] === 0x41 && b[start + 2] === 0x49))) {
        return new Comentariu(latin1(b.subarray(start, capat)));
      }
    }
    const c = b[this.pos] as number;
    if (c === 0x7b) { this.pos++; return '{'; }
    if (c === 0x7d) { this.pos++; return '}'; }
    if (c === 0x5b || c === 0x5d) { this.pos++; return new Nume(c === 0x5b ? '[' : ']', false); }
    if (c === 0x3c) {
      if (b[this.pos + 1] === 0x3c) { this.pos += 2; return new Nume('<<', false); }
      if (b[this.pos + 1] === 0x7e) return this.sirAscii85();
      return this.sirHex();
    }
    if (c === 0x3e) {
      if (b[this.pos + 1] !== 0x3e) throw new EroarePs('sintaxa: „>” singur');
      this.pos += 2;
      return new Nume('>>', false);
    }
    if (c === 0x28) return this.sirLiteral();
    if (c === 0x29) throw new EroarePs('sintaxa: „)” fără pereche');
    if (c === 0x2f) {
      this.pos++;
      const imediat = b[this.pos] === 0x2f;
      if (imediat) this.pos++;
      const v = this.cuvant();
      return imediat ? new NumeImediat(v) : new Nume(v, true);
    }
    const t = this.cuvant();
    if (NUMAR.test(t)) return Number(t);
    const r = BAZA.exec(t);
    if (r) {
      const baza = Number(r[1]);
      const v = parseInt(r[2] as string, baza);
      if (baza >= 2 && baza <= 36 && [...(r[2] as string)].every((x) => parseInt(x, 36) < baza) && Number.isFinite(v)) return v;
    }
    return new Nume(t, false);
  }

  /** Caracterele obișnuite de la poziția curentă (un nume sau un număr). */
  private cuvant(): string {
    const b = this.b;
    const start = this.pos;
    while (this.pos < b.length && !ALB[b[this.pos] as number] && !DELIM[b[this.pos] as number]) this.pos++;
    return latin1(b.subarray(start, this.pos));
  }

  private sirLiteral(): Sir {
    const b = this.b;
    this.pos++;
    const out: number[] = [];
    let adancime = 1;
    for (;;) {
      if (this.pos >= b.length) throw new EroarePs('sintaxa: șir neîncheiat');
      const c = b[this.pos++] as number;
      if (c === 0x28) { adancime++; out.push(c); continue; }
      if (c === 0x29) {
        if (--adancime === 0) break;
        out.push(c);
        continue;
      }
      if (c === 0x5c) {
        const e = b[this.pos++];
        if (e === undefined) throw new EroarePs('sintaxa: șir neîncheiat');
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
        if (b[this.pos] === 10) this.pos++;
        out.push(10);
        continue;
      }
      out.push(c);
    }
    return new Sir(Uint8Array.from(out));
  }

  private sirHex(): Sir {
    const b = this.b;
    this.pos++;
    const out: number[] = [];
    let jum = -1;
    for (;;) {
      if (this.pos >= b.length) throw new EroarePs('sintaxa: șir hex neîncheiat');
      const c = b[this.pos++] as number;
      if (c === 0x3e) break;
      if (ALB[c]) continue;
      const h = hexCifra(c);
      if (h < 0) throw new EroarePs('sintaxa: caracter greșit în șirul hex');
      if (jum < 0) jum = h;
      else {
        out.push(jum * 16 + h);
        jum = -1;
      }
    }
    if (jum >= 0) out.push(jum * 16);
    return new Sir(Uint8Array.from(out));
  }

  /** `<~ … ~>`: textul nu contează pentru desen, deci șirul rămâne nedecodat. */
  private sirAscii85(): Sir {
    const start = this.pos + 2;
    if (!this.sareDupa('~>')) throw new EroarePs('sintaxa: șir ASCII85 neîncheiat');
    return new Sir(this.b.subarray(start, this.pos - 2));
  }

  /**
   * Sare până după rândul care începe cu unul din prefixe (comentariile de structură care închid o secțiune) și întoarce
   * prefixul găsit, sau null la sfârșitul fișierului. Octeții de pe drum nu se citesc ca jetoane: o secțiune sărită poate
   * avea date binare (un font cu `eexec`) sau paranteze fără pereche.
   */
  saltLa(prefixe: readonly string[]): string | null {
    const b = this.b;
    let p = this.pos;
    while (p < b.length) {
      if (b[p] === 0x25 && this.laInceputDeRand(p)) {
        const capat = this.capatRand(p);
        const rand = latin1(b.subarray(p, Math.min(capat, p + 64)));
        const gasit = prefixe.find((x) => rand.startsWith(x));
        if (gasit !== undefined) {
          this.pos = this.dupaRand(capat);
          return gasit;
        }
        p = this.dupaRand(capat);
        continue;
      }
      p = this.dupaRand(this.capatRand(p));
    }
    this.pos = b.length;
    return null;
  }

  /** Albul de după operatorul care citește date din fișier (CR LF contează ca unul). */
  sareAlbUnul(): void {
    const c = this.b[this.pos];
    if (c === 13 && this.b[this.pos + 1] === 10) this.pos += 2;
    else if (c !== undefined && ALB[c]) this.pos++;
  }

  /** `n` cifre hex, cu albul dintre ele; fals dacă vine altceva sau se termină fișierul înainte. */
  sareHex(n: number): boolean {
    const b = this.b;
    let ramase = n;
    while (ramase > 0) {
      const c = b[this.pos];
      if (c === undefined) return false;
      if (ALB[c]) { this.pos++; continue; }
      if (hexCifra(c) < 0) return false;
      this.pos++;
      ramase--;
    }
    return true;
  }

  /** Până după marcaj (`~>` la ASCII85, `>` la ASCIIHex); fals dacă lipsește. */
  sareDupa(marcaj: string): boolean {
    const b = this.b;
    const m0 = marcaj.charCodeAt(0);
    for (let p = this.pos; p < b.length; p++) {
      if (b[p] !== m0) continue;
      let k = 1;
      while (k < marcaj.length && b[p + k] === marcaj.charCodeAt(k)) k++;
      if (k === marcaj.length) {
        this.pos = p + k;
        return true;
      }
    }
    return false;
  }

  /** `n` octeți binari; fals dacă fișierul se termină înainte. */
  sareOcteti(n: number): boolean {
    if (this.pos + n > this.b.length) return false;
    this.pos += n;
    return true;
  }
}
