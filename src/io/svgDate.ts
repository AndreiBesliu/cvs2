/**
 * Gramaticile textului din SVG (ADR 0035 §2, §3, §5): datele căii, `points`, `transform`, lungimile și declarațiile din
 * `style`. Pure, fără DOM. O eroare nu aruncă: se întoarce ce s-a citit până la ea, cu steagul `eroare`.
 */
import { compune, type Matrice } from '../geom/matrice.ts';
import type { Punct } from '../geom/contur.ts';

/** Numărul SVG: semn, parte întreagă și / sau zecimală, exponent. `.5.5` sunt două numere, `1-2` la fel. */
const NUMAR = /[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/y;

const esteSpatiu = (c: number): boolean => c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d || c === 0x0c;

/** Cititorul unui șir: poziția, spațiile, virgula, numerele, steagurile. */
class Cititor {
  i = 0;
  readonly s: string;
  constructor(s: string) {
    this.s = s;
  }
  get gata(): boolean {
    return this.i >= this.s.length;
  }
  spatii(): void {
    while (this.i < this.s.length && esteSpatiu(this.s.charCodeAt(this.i))) this.i++;
  }
  /** comma-wsp: spații, o virgulă opțională, spații. Întoarce dacă a trecut de o virgulă. */
  separator(): boolean {
    this.spatii();
    if (this.s[this.i] !== ',') return false;
    this.i++;
    this.spatii();
    return true;
  }
  numar(): number | null {
    NUMAR.lastIndex = this.i;
    const m = NUMAR.exec(this.s);
    if (!m) return null;
    const v = Number(m[0]);
    if (!Number.isFinite(v)) return null;
    this.i += m[0].length;
    return v;
  }
  /** Steagul arcului: un singur caracter, `0` sau `1`. */
  steag(): boolean | null {
    const c = this.s[this.i];
    if (c !== '0' && c !== '1') return null;
    this.i++;
    return c === '1';
  }
  /** Urmează un număr (semn, cifră sau punct)? */
  urmeazaNumar(): boolean {
    const c = this.s[this.i];
    return c !== undefined && /[0-9+\-.]/.test(c);
  }
}

/**
 * Comenzile căii, absolute și normalizate: `M`, `L`, `C`, `A`, `Z`. `H` / `V` devin `L`, `S` devine `C`, `Q` / `T` devin
 * cubice exact (T1). `A` păstrează parametrii din fișier (razele cu semn, rotirea în grade); ușa le judecă (F.6.5, F.6.6).
 */
export type ComandaCale =
  | { readonly tip: 'M'; readonly p: Punct }
  | { readonly tip: 'L'; readonly p: Punct }
  | { readonly tip: 'C'; readonly c1: Punct; readonly c2: Punct; readonly p: Punct }
  | {
    readonly tip: 'A'; readonly rx: number; readonly ry: number; readonly rotire: number; readonly mare: boolean; readonly pozitiv: boolean;
    readonly p: Punct;
    /**
     * Centrul și unghiurile, când se știu exact (arcele formelor: cercul, elipsa, colțurile lui `rect`). F.6.5 le-ar
     * recalcula din capete rotunjite, iar la 180° rădăcina amplifică rotunjirea la √ε (oracolul 2.7c).
     */
    readonly exact?: { readonly centru: Punct; readonly t1: number; readonly baleiaj: number };
  }
  | { readonly tip: 'Z' };

export type DateCale = { readonly comenzi: readonly ComandaCale[]; readonly eroare: boolean };

const ARGUMENTE: Readonly<Record<string, number>> = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7, z: 0 };

/**
 * Datele căii (`d`), după gramatica SVG 1.1 și tratarea erorilor din SVG 2 (ADR 0035 §5): la prima eroare se păstrează
 * comenzile complete dinaintea ei. Fiecare set de argumente al unei comenzi repetate implicit e o comandă.
 */
export function citesteDateCale(d: string): DateCale {
  const r = new Cititor(d);
  const comenzi: ComandaCale[] = [];
  let curent: Punct = { x: 0, y: 0 };
  let start: Punct = { x: 0, y: 0 };
  // Punctul de control de oglindit pentru S (după C / S) și pentru T (după Q / T); altfel null.
  let controlC: Punct | null = null;
  let controlQ: Punct | null = null;
  let dupaZ = false;
  let primul = true;
  r.spatii();
  while (!r.gata) {
    const litera = r.s[r.i] ?? '';
    const mic = litera.toLowerCase();
    const n = ARGUMENTE[mic];
    if (n === undefined || (primul && mic !== 'm')) return { comenzi, eroare: true };
    primul = false;
    r.i++;
    r.spatii();
    if (mic === 'z') {
      comenzi.push({ tip: 'Z' });
      curent = start;
      controlC = null;
      controlQ = null;
      dupaZ = true;
      r.spatii();
      continue;
    }
    const relativ = litera === mic;
    let set = 0;
    for (;;) {
      if (set > 0) {
        const virgula = r.separator();
        if (!r.urmeazaNumar()) {
          // O virgulă înaintea unei comenzi noi e o eroare de gramatică.
          if (virgula) return { comenzi, eroare: true };
          break;
        }
      }
      const a: number[] = [];
      for (let k = 0; k < n; k++) {
        if (k > 0) r.separator();
        const v = mic === 'a' && (k === 3 || k === 4) ? r.steag() : r.numar();
        if (v === null) return { comenzi, eroare: true };
        a.push(typeof v === 'boolean' ? (v ? 1 : 0) : v);
      }
      const ox = relativ ? curent.x : 0;
      const oy = relativ ? curent.y : 0;
      const pct = (x: number | undefined, y: number | undefined): Punct => ({ x: (x ?? 0) + ox, y: (y ?? 0) + oy });
      // Un desen după Z, fără M, pornește o subcale nouă din startul celei închise.
      if (dupaZ && mic !== 'm') comenzi.push({ tip: 'M', p: start });
      dupaZ = false;
      let c: Punct | null = null;
      let q: Punct | null = null;
      if (mic === 'm') {
        const p = pct(a[0], a[1]);
        if (set === 0) {
          comenzi.push({ tip: 'M', p });
          start = p;
        } else {
          comenzi.push({ tip: 'L', p });
        }
        curent = p;
      } else if (mic === 'l' || mic === 'h' || mic === 'v') {
        const p = mic === 'l' ? pct(a[0], a[1])
          : mic === 'h' ? { x: (a[0] ?? 0) + ox, y: curent.y } : { x: curent.x, y: (a[0] ?? 0) + oy };
        comenzi.push({ tip: 'L', p });
        curent = p;
      } else if (mic === 'c' || mic === 's') {
        const c1 = mic === 'c' ? pct(a[0], a[1])
          : controlC ? { x: 2 * curent.x - controlC.x, y: 2 * curent.y - controlC.y } : curent;
        const c2 = mic === 'c' ? pct(a[2], a[3]) : pct(a[0], a[1]);
        const p = mic === 'c' ? pct(a[4], a[5]) : pct(a[2], a[3]);
        comenzi.push({ tip: 'C', c1, c2, p });
        curent = p;
        c = c2;
      } else if (mic === 'q' || mic === 't') {
        const ctrl: Punct = mic === 'q' ? pct(a[0], a[1])
          : controlQ ? { x: 2 * curent.x - controlQ.x, y: 2 * curent.y - controlQ.y } : curent;
        const p = mic === 'q' ? pct(a[2], a[3]) : pct(a[0], a[1]);
        comenzi.push({
          tip: 'C',
          c1: { x: curent.x + (2 / 3) * (ctrl.x - curent.x), y: curent.y + (2 / 3) * (ctrl.y - curent.y) },
          c2: { x: p.x + (2 / 3) * (ctrl.x - p.x), y: p.y + (2 / 3) * (ctrl.y - p.y) },
          p,
        });
        curent = p;
        q = ctrl;
      } else {
        const p = pct(a[5], a[6]);
        comenzi.push({ tip: 'A', rx: a[0] ?? 0, ry: a[1] ?? 0, rotire: a[2] ?? 0, mare: a[3] === 1, pozitiv: a[4] === 1, p });
        curent = p;
      }
      controlC = c;
      controlQ = q;
      set++;
    }
    r.spatii();
  }
  return { comenzi, eroare: false };
}

/** `points` (polyline, polygon): perechile de dinaintea primei erori; un număr impar de coordonate e și el o eroare. */
export function citestePuncte(text: string): { readonly puncte: readonly Punct[]; readonly eroare: boolean } {
  const r = new Cititor(text);
  const valori: number[] = [];
  let eroare = false;
  r.spatii();
  while (!r.gata) {
    if (valori.length > 0) r.separator();
    if (r.gata) break;
    const v = r.numar();
    if (v === null) {
      eroare = true;
      break;
    }
    valori.push(v);
    r.spatii();
  }
  if (valori.length % 2 === 1) {
    eroare = true;
    valori.pop();
  }
  const puncte: Punct[] = [];
  for (let i = 0; i + 1 < valori.length; i += 2) puncte.push({ x: valori[i] ?? 0, y: valori[i + 1] ?? 0 });
  return { puncte, eroare };
}

const RAD = Math.PI / 180;
const TRANSFORMARE = /matrix|translate|scale|rotate|skewX|skewY/y;

/**
 * Atributul `transform` (SVG 1.1): lista de transformări, compusă de la stânga la dreapta (prima e cea mai din afară).
 * Întoarce matricea, sau null la o eroare de gramatică. Un șir gol (sau doar spații) e identitatea.
 */
export function citesteTransform(text: string): Matrice | null {
  const r = new Cititor(text);
  let m: Matrice = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  r.spatii();
  let primul = true;
  while (!r.gata) {
    if (!primul) {
      r.separator();
      if (r.gata) return null;
    }
    primul = false;
    TRANSFORMARE.lastIndex = r.i;
    const nume = TRANSFORMARE.exec(r.s)?.[0];
    if (!nume) return null;
    r.i += nume.length;
    r.spatii();
    if (r.s[r.i] !== '(') return null;
    r.i++;
    r.spatii();
    const a: number[] = [];
    while (r.s[r.i] !== ')') {
      if (a.length > 0) r.separator();
      const v = r.numar();
      if (v === null) return null;
      a.push(v);
      r.spatii();
      if (a.length > 6) return null;
    }
    r.i++;
    const [x = 0, y, z] = a;
    let t: Matrice;
    if (nume === 'matrix' && a.length === 6) {
      t = { a: x, b: a[1] ?? 0, c: a[2] ?? 0, d: a[3] ?? 0, e: a[4] ?? 0, f: a[5] ?? 0 };
    } else if (nume === 'translate' && (a.length === 1 || a.length === 2)) {
      t = { a: 1, b: 0, c: 0, d: 1, e: x, f: y ?? 0 };
    } else if (nume === 'scale' && (a.length === 1 || a.length === 2)) {
      t = { a: x, b: 0, c: 0, d: y ?? x, e: 0, f: 0 };
    } else if (nume === 'rotate' && (a.length === 1 || a.length === 3)) {
      const cos = Math.cos(x * RAD);
      const sin = Math.sin(x * RAD);
      const cx = y ?? 0;
      const cy = z ?? 0;
      // translate(cx, cy) · rotate(x) · translate(−cx, −cy)
      t = { a: cos, b: sin, c: -sin, d: cos, e: cx - cos * cx + sin * cy, f: cy - sin * cx - cos * cy };
    } else if (nume === 'skewX' && a.length === 1) {
      t = { a: 1, b: 0, c: Math.tan(x * RAD), d: 1, e: 0, f: 0 };
    } else if (nume === 'skewY' && a.length === 1) {
      t = { a: 1, b: Math.tan(x * RAD), c: 0, d: 1, e: 0, f: 0 };
    } else {
      return null;
    }
    // Transformarea din dreapta se aplică întâi punctului: m · t.
    m = compune(m, t);
    r.spatii();
  }
  return m;
}

/** O lungime CSS: numărul și unitatea (fără deosebire de majuscule; `''` = fără unitate), sau null dacă nu se citește. */
export function citesteLungime(text: string | null): { readonly valoare: number; readonly unitate: string } | null {
  if (text === null) return null;
  const m = /^[\t\n\f\r ]*([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)([a-zA-Z%]*)[\t\n\f\r ]*$/.exec(text);
  if (!m) return null;
  const valoare = Number(m[1]);
  return Number.isFinite(valoare) ? { valoare, unitate: (m[2] ?? '').toLowerCase() } : null;
}

/** Declarațiile din `style`, cu numele proprietății mic; ultima câștigă, iar `!important` se ignoră. */
export function citesteStil(text: string | null): ReadonlyMap<string, string> {
  const rez = new Map<string, string>();
  if (!text) return rez;
  for (const declaratie of text.split(';')) {
    const i = declaratie.indexOf(':');
    if (i < 0) continue;
    const nume = declaratie.slice(0, i).trim().toLowerCase();
    const valoare = declaratie.slice(i + 1).replace(/!\s*important/i, '').trim();
    if (nume) rez.set(nume, valoare);
  }
  return rez;
}
