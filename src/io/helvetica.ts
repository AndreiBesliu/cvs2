/**
 * Helvetica, una din cele 14 fonturi standard ale PDF-ului și PostScript-ului (ADR 0330 §7, felia 10.4↑c-2): cifrele cotelor,
 * scrise ca text în PDF și EPS, fără font în fișier. Aici: codul fiecărui semn (WinAnsi în PDF, ISOLatin1 în EPS: pentru
 * semnele de aici, aceleași), lățimea lui din AFM-ul Adobe (1/1000 din mărimea fontului), pentru centrarea în PDF, și
 * majuscula (CapHeight 718): cifra de h mm se scrie la h / 0,718. Semnele cotelor fără loc în Helvetica (minutul ′ și secunda ″)
 * se scriu cu apostroful și ghilimelele drepte; orice alt semn din afara tabelului devine „?” și se spune după export.
 */

/** Majuscula lui Helvetica, din mărimea fontului. */
export const MAJUSCULA_HELVETICA = 0.718;

/** Lățimile semnelor ASCII 32–126 (spațiul … tilda), în ordinea codurilor. */
const ASCII = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
  556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];
/** Semnele cotelor din afara ASCII: codul (același în WinAnsi și ISOLatin1) și lățimea. */
const ALTELE: Readonly<Record<string, readonly [number, number]>> = { '°': [0xb0, 400], '±': [0xb1, 584], '×': [0xd7, 584], 'Ø': [0xd8, 778] };
const INLOCUITE: Readonly<Record<string, string>> = { '′': "'", '″': '"' };

/** Semnul `c` ca [codul, lățimea], sau null: n-are loc în Helvetica. */
function semn(c: string): readonly [number, number] | null {
  const k = c.codePointAt(0)!;
  if (k >= 32 && k <= 126) return [k, ASCII[k - 32]!];
  return ALTELE[c] ?? null;
}

/** Textul în Helvetica: codurile semnelor (cele fără loc, „?”), lățimea lui în 1/1000 din mărime, semnele fără loc. */
export function inHelvetica(text: string): { readonly coduri: readonly number[]; readonly latime: number; readonly lipsa: readonly string[] } {
  const coduri: number[] = [], lipsa: string[] = [];
  let latime = 0;
  for (const c0 of text) {
    const c = INLOCUITE[c0] ?? c0;
    let s = semn(c);
    if (!s) {
      if (!lipsa.includes(c0)) lipsa.push(c0);
      s = semn('?')!;
    }
    coduri.push(s[0]);
    latime += s[1];
  }
  return { coduri, latime, lipsa };
}

/** Un șir PDF sau PostScript, numai ASCII: `\`, `(` și `)` cu bară, codurile de peste 126 în octal. */
export function sirLiteral(coduri: readonly number[]): string {
  return coduri.map((k) => (k === 0x5c || k === 0x28 || k === 0x29 ? `\\${String.fromCharCode(k)}` : k > 126 ? `\\${k.toString(8)}` : String.fromCharCode(k))).join('');
}

/** Mărimea fontului (mm) pentru o cifră cu majuscula de `h` mm. */
export const marimeHelvetica = (h: number): number => h / MAJUSCULA_HELVETICA;
