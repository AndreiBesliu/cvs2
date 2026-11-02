/**
 * Cititorul dialectelor (ADR 0125), scris doar după regulile din sonda s8 (`docs/faza2/sonde/s8-posturi/RAPORT.md`,
 * Anexa A), fără nimic din post: citește textul unui program cum l-ar citi controlerul și scoate evenimentele lui în mm,
 * ca programele aceluiași IR pe controlere diferite să se poată compara între ele.
 *
 * - comentariile: `( … )` (familia GRBL, Syntec, Mach), apostroful până la capătul liniei (NcStudio, s8 A.4), niciunul
 *   (RichAuto, s8 A.5);
 * - liniile `%` și numărul de program `O…` (Syntec, Mach4) nu sunt instrucțiuni;
 * - unitățile: G20 / G70 = inch, G21 / G71 = mm (s8 A.0); fără cuvânt, mm (RichAuto: „codul trebuie să fie metric”);
 * - pauza G4: P în secunde sau în milisecunde, după dialect (s8 §2);
 * - schimbarea sculei: `T` pe aceeași linie cu `M6` sau pe una dinainte (s8 §5.4);
 * - coordonatele sunt absolute (G90), modale pe axă; avansul e modal.
 */

export type DialectCitit = {
  readonly comentariu: 'paranteze' | 'apostrof' | 'niciunul';
  readonly pauza: 's' | 'ms';
};

export type Eveniment =
  | {
    readonly tip: 'miscare'; readonly g: 0 | 1 | 2 | 3;
    readonly x: number | null; readonly y: number | null; readonly z: number | null;
    readonly i?: number; readonly j?: number;
    /** Avansul efectiv al mișcării de lucru (mm/min); G0 n-are. */
    readonly f?: number;
  }
  | { readonly tip: 'pauza'; readonly secunde: number }
  | { readonly tip: 'ax'; readonly turatie: number }
  | { readonly tip: 'ax-oprit' }
  | { readonly tip: 'scula'; readonly numar: number }
  | { readonly tip: 'lungime'; readonly h: number }
  | { readonly tip: 'oprire' }
  | { readonly tip: 'final' };

export type ProgramCitit = {
  readonly evenimente: readonly Eveniment[];
  /** Fiecare cuvânt G și M scris, cum apare (`G0`, `G91.1`, `M30`). */
  readonly coduri: readonly string[];
  /** Fiecare valoare, pe literă, cum e scrisă în text (`X` → `['20.000', …]`). */
  readonly valori: ReadonlyMap<string, readonly string[]>;
  /** Textul comentariilor, în ordine. */
  readonly comentarii: readonly string[];
};

const MM_PE_INCH = 25.4;

function faraComentariu(linie: string, d: DialectCitit, comentarii: string[]): string {
  if (d.comentariu === 'apostrof') {
    const k = linie.indexOf("'");
    if (k < 0) return linie;
    comentarii.push(linie.slice(k + 1));
    return linie.slice(0, k);
  }
  if (d.comentariu === 'paranteze') {
    return linie.replace(/\(([^)]*)\)?/g, (_m, text: string) => { comentarii.push(text); return ' '; });
  }
  if (/[(;']/.test(linie)) throw new Error(`un dialect fără comentarii n-are voie la „${linie}”`);
  return linie;
}

export function citesteProgram(text: string, d: DialectCitit): ProgramCitit {
  if (!text.endsWith('\n')) throw new Error('programul nu se încheie cu un capăt de linie');
  const evenimente: Eveniment[] = [];
  const coduri: string[] = [];
  const valori = new Map<string, string[]>();
  const comentarii: string[] = [];
  let scara = 1;
  let x: number | null = null;
  let y: number | null = null;
  let z: number | null = null;
  let f: number | null = null;
  let sculaAleasa: number | null = null;
  for (const brut of text.slice(0, -1).split('\n')) {
    if (brut.includes('\r')) throw new Error('CR în program');
    const linie = faraComentariu(brut, d, comentarii).trim();
    if (linie === '' || linie === '%' || /^O\d+$/.test(linie)) continue;
    const cuvinte = [...linie.matchAll(/([A-Z])\s*([-+]?(?:\d+\.?\d*|\.\d+))/g)];
    const rest = linie.replace(/([A-Z])\s*([-+]?(?:\d+\.?\d*|\.\d+))/g, '').trim();
    if (rest !== '') throw new Error(`text necitit pe linia „${brut}”: „${rest}”`);
    const cuv = new Map<string, string>();
    const g: string[] = [];
    const m: string[] = [];
    for (const [, litera, valoare] of cuvinte) {
      if (litera === undefined || valoare === undefined) continue;
      const lista = valori.get(litera) ?? [];
      lista.push(valoare);
      valori.set(litera, lista);
      if (litera === 'G') { g.push(`G${valoare}`); coduri.push(`G${valoare}`); continue; }
      if (litera === 'M') { m.push(`M${valoare}`); coduri.push(`M${valoare}`); continue; }
      if (cuv.has(litera)) throw new Error(`litera ${litera} de două ori pe „${brut}”`);
      cuv.set(litera, valoare);
    }
    const num = (l: string): number | undefined => (cuv.has(l) ? Number(cuv.get(l)) : undefined);
    for (const cod of g) {
      const n = Number(cod.slice(1));
      if (n === 20 || n === 70) scara = MM_PE_INCH;
      else if (n === 21 || n === 71) scara = 1;
      else if (n === 91) throw new Error('G91: programele sunt absolute');
    }
    if (cuv.has('T')) sculaAleasa = num('T') ?? null;
    if (cuv.has('F')) f = (num('F') ?? 0) * scara;
    const miscare = g.map((c) => Number(c.slice(1))).find((n) => n === 0 || n === 1 || n === 2 || n === 3);
    if (miscare !== undefined) {
      const nx = num('X');
      const ny = num('Y');
      const nz = num('Z');
      if (nx !== undefined) x = nx * scara;
      if (ny !== undefined) y = ny * scara;
      if (nz !== undefined) z = nz * scara;
      const arc = miscare === 2 || miscare === 3;
      const i = num('I');
      const j = num('J');
      if (arc && (i === undefined || j === undefined)) throw new Error(`arc fără I / J: „${brut}”`);
      evenimente.push({
        tip: 'miscare', g: miscare as 0 | 1 | 2 | 3, x, y, z,
        ...(arc ? { i: (i ?? 0) * scara, j: (j ?? 0) * scara } : {}),
        ...(miscare !== 0 ? { f: f ?? Number.NaN } : {}),
      });
    }
    if (g.some((c) => Number(c.slice(1)) === 4)) {
      const p = num('P');
      if (p === undefined) throw new Error(`G4 fără P: „${brut}”`);
      evenimente.push({ tip: 'pauza', secunde: d.pauza === 'ms' ? p / 1000 : p });
    }
    if (g.some((c) => Number(c.slice(1)) === 43)) evenimente.push({ tip: 'lungime', h: num('H') ?? Number.NaN });
    for (const cod of m) {
      const n = Number(cod.slice(1));
      if (n === 3) evenimente.push({ tip: 'ax', turatie: num('S') ?? Number.NaN });
      else if (n === 5) evenimente.push({ tip: 'ax-oprit' });
      else if (n === 6) evenimente.push({ tip: 'scula', numar: sculaAleasa ?? Number.NaN });
      else if (n === 0) evenimente.push({ tip: 'oprire' });
      else if (n === 30 || n === 2) evenimente.push({ tip: 'final' });
    }
  }
  return { evenimente, coduri, valori, comentarii };
}
