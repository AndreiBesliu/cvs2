/**
 * Un număr scris de om: cifre, cu punct sau cu virgulă zecimală (în română „2,5”). Fără exponent, fără separator de mii:
 * orice altceva e null, deci refuzat cu motiv, nu citit greșit. Un câmp `type="number"` citea „2,5” ca 25. Semnul („-”,
 * „−” sau „+”) doar cu `semn` (o coordonată; o dimensiune n-are semn, ADR 0038 §5); „-0” e 0.
 */
export function citesteNumar(s: string, semn = false): number | null {
  const m = /^\s*([-−+]?)\s*(\d+(?:[.,]\d*)?|[.,]\d+)\s*$/.exec(s);
  if (m?.[2] === undefined || (m[1] !== '' && !semn)) return null;
  const x = Number(m[2].replace(',', '.'));
  return (m[1] === '-' || m[1] === '−') && x !== 0 ? -x : x;
}

/**
 * O valoare din document, ca text de editat: cel mai scurt text care se citește înapoi la exact aceeași valoare (al lui
 * `String`), dar fără exponent, pe care `citesteNumar` nu-l primește (`1e-7` devine `0.0000001`). Altfel un Exportă fără
 * nicio schimbare ar rescrie valoarea rotunjită, ca o comandă ascunsă. Cu `virgula`, separatorul zecimal e virgula (în
 * română „2,5”); `citesteNumar` le primește pe amândouă, deci textul se citește înapoi la fel.
 */
export function textNumar(x: number, virgula = false): string {
  // Semnul se pune la loc la capăt: forma cu exponent („-1e-7”) se scrie fără el.
  if (x < 0) return `-${textNumar(-x, virgula)}`;
  const s = String(x);
  const m = /^(\d)(?:\.(\d+))?e-(\d+)$/.exec(s);
  const t = m?.[1] !== undefined && m[3] !== undefined ? `0.${'0'.repeat(Number(m[3]) - 1)}${m[1]}${m[2] ?? ''}` : s;
  return virgula ? t.replace('.', ',') : t;
}

/**
 * O mărime derivată din geometrie (colțul cutiei: `x + t`), rotunjită la 1e-9 mm pentru afișare: valoarea exactă scrisă de
 * om adesea nu există ca rezultat al adunării, iar câmpul ar arăta 3,576999999999998 în loc de 3,577 (recenzia 2.8e, F2).
 * 1e-9 mm e de șase ordine sub rezoluția postului; mărimile ținute în document (rotirea, foaia) se arată exact.
 */
export function valoareDerivata(x: number): number {
  return Math.round(x * 1e9) / 1e9;
}
