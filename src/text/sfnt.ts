/**
 * Containerul fonturilor (ADR 0105 §1, ADR 0106 §1): citirea octeților big-endian cu marginile verificate, directorul
 * tabelelor (al unui font singur sau al unei fețe dintr-o colecție TTC) și numele din tabelul `name`. Comun cititorului
 * TrueType (`font.ts`) și celui CFF (`cff.ts`).
 */

/** Un punct al unui contur, în unitățile fontului: pe curbă, sau punct de control (al unei pătratice, sau al unei cubice). */
export type PunctFont = { readonly x: number; readonly y: number; readonly peCurba: boolean };
/**
 * Un contur, închis prin definiție (ultimul punct se leagă de primul). Punctele de control sunt ale unei pătratice
 * (TrueType: unul, sau mai multe la rând, cu punctele de pe curbă subînțelese) sau ale unei cubice (CFF: câte două).
 */
export type ConturFont = readonly PunctFont[];

/** O greșeală a fișierului (un offset în afara lui, o structură ruptă): fontul e refuzat, nu aruncă mai departe. */
export class FontStricat extends Error {}

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
  u24(p: number): number { this.verifica(p, 3); return (this.v.getUint16(p) << 8) | this.v.getUint8(p + 2); }
  u32(p: number): number { this.verifica(p, 4); return this.v.getUint32(p); }
  i32(p: number): number { this.verifica(p, 4); return this.v.getInt32(p); }
  /** F2Dot14: un număr cu semn, 2 biți întregi și 14 fracționari (transformarea componentelor). */
  f2dot14(p: number): number { return this.i16(p) / 16384; }
  /** Fixed 16.16 (axele `fvar`). */
  fixed(p: number): number { return this.i32(p) / 65536; }
  tag(p: number): string { this.verifica(p, 4); return String.fromCharCode(this.u8(p), this.u8(p + 1), this.u8(p + 2), this.u8(p + 3)); }
  /** Octeții [p, p + n), fără copie. */
  felie(p: number, n: number): Uint8Array { this.verifica(p, n); return new Uint8Array(this.v.buffer, this.v.byteOffset + p, n); }
}

export type Tabele = ReadonlyMap<string, { readonly pos: number; readonly lungime: number }>;

/** Semnăturile de la începutul fișierului: TrueType, OpenType cu CFF, Apple `true`, colecția, WOFF și WOFF2. */
export const SFNT_TRUETYPE = 0x00010000, SFNT_CFF = 0x4f54544f, SFNT_APPLE = 0x74727565, COLECTIE = 0x74746366;
export const WOFF = 0x774f4646, WOFF2 = 0x774f4632;

/**
 * Directorul tabelelor fontului care începe la `start` (0 pentru un font singur; offsetul feței, într-o colecție, unde
 * pozițiile tabelelor sunt tot de la începutul fișierului): eticheta, poziția și lungimea fiecăruia, verificate.
 */
export function tabele(o: Octeti, start: number): Tabele {
  const n = o.u16(start + 4);
  const t = new Map<string, { pos: number; lungime: number }>();
  for (let k = 0; k < n; k++) {
    const r = start + 12 + 16 * k;
    const pos = o.u32(r + 8), lungime = o.u32(r + 12);
    if (pos + lungime > o.lungime) throw new FontStricat(`tabelul ${o.tag(r)} iese din fișier`);
    t.set(o.tag(r), { pos, lungime });
  }
  return t;
}

/** Începutul fiecărei fețe: [0] pentru un font singur, offseturile din antet pentru o colecție (`ttcf`). */
export function inceputuriFete(o: Octeti): number[] {
  if (o.u32(0) !== COLECTIE) return [0];
  const n = o.u32(8);
  if (n === 0 || n > 1024) throw new FontStricat(`colecția are ${n} fețe`);
  const r: number[] = [];
  for (let k = 0; k < n; k++) r.push(o.u32(12 + 4 * k));
  return r;
}

/** Numele unei fețe: familia și stilul (cele tipografice, ID 16 / 17, dacă sunt), numele complet (4) și PostScript (6). */
export type NumeFont = { readonly familie: string; readonly stil: string; readonly complet: string; readonly postscript: string };

/**
 * Șirul cu ID-ul `id` din tabelul `name`: Windows Unicode (engleza întâi, apoi orice limbă), apoi Macintosh Roman (engleza);
 * lipsă: null. Pozițiile se verifică (un nume în afara tabelului e sărit, nu refuzul fontului).
 */
export function numeDupaId(o: Octeti, t: Tabele, id: number): string | null {
  const nume = t.get('name');
  if (!nume) return null;
  const n = o.u16(nume.pos + 2), sir = nume.pos + o.u16(nume.pos + 4);
  let windows: string | null = null, mac: string | null = null;
  for (let k = 0; k < n; k++) {
    const r = nume.pos + 6 + 12 * k;
    if (o.u16(r + 6) !== id) continue;
    const platforma = o.u16(r), cod = o.u16(r + 2), limba = o.u16(r + 4), lungime = o.u16(r + 8), pos = sir + o.u16(r + 10);
    if (pos + lungime > nume.pos + nume.lungime) continue;
    if (platforma === 3 && (cod === 1 || cod === 10 || cod === 0) && (windows === null || limba === 0x0409)) {
      windows = new TextDecoder('utf-16be').decode(o.felie(pos, lungime));
      if (limba === 0x0409) break;
    } else if (platforma === 1 && cod === 0 && limba === 0 && mac === null) {
      mac = new TextDecoder('macintosh').decode(o.felie(pos, lungime));
    }
  }
  return windows ?? mac;
}

/** Numele feței (ADR 0106 §2): ce arată lista fonturilor și ce caută fonturile sistemului (PostScript). */
export function numeFont(o: Octeti, t: Tabele): NumeFont {
  const familie = numeDupaId(o, t, 16) ?? numeDupaId(o, t, 1) ?? 'Font';
  const stil = numeDupaId(o, t, 17) ?? numeDupaId(o, t, 2) ?? 'Regular';
  const complet = numeDupaId(o, t, 4) ?? `${familie} ${stil}`;
  return { familie, stil, complet, postscript: numeDupaId(o, t, 6) ?? '' };
}
