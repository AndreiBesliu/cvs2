/**
 * Decodorul CCITT (ADR 0229): ITU-T T.4 (G3, 1D „Modified Huffman” și 2D „Modified READ”) și T.6 (G4, „Modified Modified
 * READ”), plus varianta TIFF a codării 1D cu rândurile pe octeți întregi (compresia 2). Biții unei benzi → rândurile ei,
 * împachetate de la bitul cel mai semnificativ, fiecare pe octeți întregi, cu 1 pe trecerile negre (TIFF le citește apoi
 * după PhotometricInterpretation). Cod propriu, scris din recomandări; fără importuri (regula `trasare-izolat`).
 */

export type OptiuniCcitt = {
  readonly latime: number;
  readonly randuri: number;
  /** `mh`: compresia TIFF 2 (rândurile pe octeți, fără EOL); `t4`: T.4 (G3, cu EOL); `t6`: T.6 (G4). */
  readonly fel: 'mh' | 't4' | 't6';
  /** T.4 cu rânduri 2D (T4Options, bitul 0): după fiecare EOL, un bit spune dacă rândul e 1D (1) sau 2D (0). */
  readonly doiD?: boolean;
};

export class EroareCcitt extends Error {}

// Codurile din T.4 (tabelele 2 și 3): alb și negru, trecerile 0–63 (terminale) și cele de completare, 64–1728; cele de
// completare extinse (1792–2560), aceleași pentru amândouă.
const ALB_T = ('00110101 000111 0111 1000 1011 1100 1110 1111 10011 10100 00111 01000 001000 000011 110100 110101 101010 101011 '
  + '0100111 0001100 0001000 0010111 0000011 0000100 0101000 0101011 0010011 0100100 0011000 00000010 00000011 00011010 '
  + '00011011 00010010 00010011 00010100 00010101 00010110 00010111 00101000 00101001 00101010 00101011 00101100 00101101 '
  + '00000100 00000101 00001010 00001011 01010010 01010011 01010100 01010101 00100100 00100101 01011000 01011001 01011010 '
  + '01011011 01001010 01001011 00110010 00110011 00110100');
const ALB_C = ('11011 10010 010111 0110111 00110110 00110111 01100100 01100101 01101000 01100111 011001100 011001101 011010010 '
  + '011010011 011010100 011010101 011010110 011010111 011011000 011011001 011011010 011011011 010011000 010011001 010011010 '
  + '011000 010011011');
const NEGRU_T = ('0000110111 010 11 10 011 0011 0010 00011 000101 000100 0000100 0000101 0000111 00000100 00000111 000011000 '
  + '0000010111 0000011000 0000001000 00001100111 00001101000 00001101100 00000110111 00000101000 00000010111 00000011000 '
  + '000011001010 000011001011 000011001100 000011001101 000001101000 000001101001 000001101010 000001101011 000011010010 '
  + '000011010011 000011010100 000011010101 000011010110 000011010111 000001101100 000001101101 000011011010 000011011011 '
  + '000001010100 000001010101 000001010110 000001010111 000001100100 000001100101 000001010010 000001010011 000000100100 '
  + '000000110111 000000111000 000000100111 000000101000 000001011000 000001011001 000000101011 000000101100 000001011010 '
  + '000001100110 000001100111');
const NEGRU_C = ('0000001111 000011001000 000011001001 000001011011 000000110011 000000110100 000000110101 0000001101100 '
  + '0000001101101 0000001001010 0000001001011 0000001001100 0000001001101 0000001110010 0000001110011 0000001110100 '
  + '0000001110101 0000001110110 0000001110111 0000001010010 0000001010011 0000001010100 0000001010101 0000001011010 '
  + '0000001011011 0000001100100 0000001100101');
const EXTINSE = ('00000001000 00000001100 00000001101 000000010010 000000010011 000000010100 000000010101 000000010110 '
  + '000000010111 000000011100 000000011101 000000011110 000000011111');

/** Biții citiți deodată la căutarea unui cod (cel mai lung cod de trecere are 13). */
const B = 13;

/** Tabela de căutare a unei culori: după următorii 13 biți, trecerea · 16 + lungimea codului; -1: niciun cod. */
function tabela(terminale: string, completari: string): Int32Array {
  const t = new Int32Array(1 << B).fill(-1);
  const pune = (cod: string, trecere: number): void => {
    const v = parseInt(cod, 2), n = cod.length;
    for (let s = 0; s < 1 << (B - n); s++) t[(v << (B - n)) | s] = trecere * 16 + n;
  };
  terminale.split(' ').forEach((c, k) => { pune(c, k); });
  completari.split(' ').forEach((c, k) => { pune(c, 64 * (k + 1)); });
  EXTINSE.split(' ').forEach((c, k) => { pune(c, 1792 + 64 * k); });
  return t;
}
let tabele: readonly [Int32Array, Int32Array] | null = null;

/** Modurile 2D (T.4, tabela 4), după următorii 7 biți: modul · 8 + lungimea; -1: nimic (EOL sau extensie). */
const P = 100, H = 101;
const MODURI = ((): Int32Array => {
  const t = new Int32Array(128).fill(-1);
  const pune = (cod: string, mod: number): void => {
    const v = parseInt(cod, 2), n = cod.length;
    for (let s = 0; s < 1 << (7 - n); s++) t[(v << (7 - n)) | s] = (mod + 3) * 8 + n;
  };
  // Verticalele: deplasarea (−3 … 3) față de b1; P și H, peste.
  pune('1', 0); pune('011', 1); pune('000011', 2); pune('0000011', 3); pune('010', -1); pune('000010', -2); pune('0000010', -3);
  pune('0001', P); pune('001', H);
  return t;
})();

class Biti {
  pos = 0;
  private readonly d: Uint8Array;
  constructor(d: Uint8Array) { this.d = d; }
  /** Următorii n biți (n ≤ 24), fără să-i consume; după capăt, zerouri. */
  vezi(n: number): number {
    const i = this.pos >> 3, d = this.d;
    const w = (((d[i] ?? 0) << 24) | ((d[i + 1] ?? 0) << 16) | ((d[i + 2] ?? 0) << 8) | (d[i + 3] ?? 0)) >>> 0;
    return ((w << (this.pos & 7)) >>> 0) >>> (32 - n);
  }
  sari(n: number): void { this.pos += n; }
  get gata(): boolean { return this.pos >= 8 * this.d.length; }
  /** La începutul unui rând T.4: zerourile de umplere și EOL-ul (11 sau mai multe zerouri, apoi 1), dacă e unul. */
  eol(): boolean {
    let p = this.pos, zero = 0;
    while (p < 8 * this.d.length && (((this.d[p >> 3] ?? 0) >> (7 - (p & 7))) & 1) === 0) { zero++; p++; }
    if (zero < 11 || p >= 8 * this.d.length) return false;
    this.pos = p + 1;
    return true;
  }
  aliniaza(): void { this.pos = (this.pos + 7) & ~7; }
}

/** O trecere de culoarea dată: codurile de completare, apoi unul terminal. */
function trecere(b: Biti, t: Int32Array): number {
  let total = 0;
  for (;;) {
    const e = t[b.vezi(B)] ?? -1;
    if (e < 0) throw new EroareCcitt(`cod de trecere necunoscut la bitul ${b.pos}`);
    b.sari(e & 15);
    const n = e >> 4;
    total += n;
    if (n < 64) return total;
  }
}

/** Pune pe 1 biții [a, z) ai rândului care începe la octetul `o`. */
function negru(r: Uint8Array, o: number, a: number, z: number): void {
  for (let x = a; x < z; x++) r[o + (x >> 3)] = (r[o + (x >> 3)] ?? 0) | (0x80 >> (x & 7));
}

/** Decodează rândurile; cele care lipsesc la capătul datelor rămân albe (un fișier tăiat se vede, nu se refuză tot). */
export function decodeazaCcitt(date: Uint8Array, o: OptiuniCcitt): Uint8Array {
  const W = o.latime, pr = Math.ceil(W / 8), rez = new Uint8Array(pr * o.randuri);
  tabele ??= [tabela(ALB_T, ALB_C), tabela(NEGRU_T, NEGRU_C)];
  const [alb, neg] = tabele;
  const b = new Biti(date);
  // Schimbările rândului de referință (pozițiile unde se schimbă culoarea, întâi alb → negru), cu două santinele W; la
  // început, rândul alb închipuit al lui T.6.
  const ref = new Int32Array(W + 3).fill(W), cur = new Int32Array(W + 2);
  for (let y = 0; y < o.randuri; y++) {
    const r0 = y * pr;
    let doiD = o.fel === 't6';
    if (o.fel === 't4') {
      b.eol();
      if (o.doiD === true) { doiD = b.vezi(1) === 0; b.sari(1); }
    }
    if (b.gata) break;
    let n = 0;
    const schimba = (x: number): void => {
      if (x >= W) return;
      if (n >= W) throw new EroareCcitt(`prea multe schimbări pe rândul ${y}`);
      cur[n++] = x;
    };
    if (!doiD) {
      // 1D: trecerile, alternând, de la alb.
      let a = 0, c = 0;
      while (a < W) {
        const z = Math.min(W, a + trecere(b, c ? neg : alb));
        if (c) negru(rez, r0, a, z);
        a = z;
        schimba(a);
        c ^= 1;
      }
    } else {
      let a0 = -1, c = 0, i = 0;
      while (a0 < W) {
        // b1: prima schimbare a referinței, la dreapta lui a0, spre culoarea opusă (pozițiile pare schimbă spre negru).
        i = Math.max(0, i - 2);
        while ((ref[i] ?? W) <= a0 || (i & 1) !== c) i++;
        const b1 = ref[i] ?? W, b2 = ref[i + 1] ?? W;
        const e = MODURI[b.vezi(7)] ?? -1;
        if (e < 0) throw new EroareCcitt(`mod 2D necunoscut la bitul ${b.pos}`);
        b.sari(e & 7);
        const mod = (e >> 3) - 3, s = Math.max(0, a0);
        if (mod === P) {
          if (c) negru(rez, r0, s, Math.min(W, b2));
          a0 = b2;
        } else if (mod === H) {
          const a1 = Math.min(W, s + trecere(b, c ? neg : alb)), a2 = Math.min(W, a1 + trecere(b, c ? alb : neg));
          if (c) negru(rez, r0, s, a1); else negru(rez, r0, a1, a2);
          schimba(a1); schimba(a2);
          a0 = a2;
        } else {
          const a1 = b1 + mod;
          if (a1 < s || a1 > W) throw new EroareCcitt(`deplasare în afara rândului la bitul ${b.pos}`);
          if (c) negru(rez, r0, s, a1);
          schimba(a1);
          a0 = a1;
          c ^= 1;
        }
      }
    }
    // Rândul decodat devine referința celui următor; trei santinele (b2 poate cădea după a doua).
    ref.set(cur.subarray(0, n));
    ref[n] = W; ref[n + 1] = W; ref[n + 2] = W;
    if (o.fel === 'mh') b.aliniaza();
  }
  return rez;
}
