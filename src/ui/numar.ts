/**
 * Un număr scris de om: cifre, cu punct sau cu virgulă zecimală (în română „2,5”). Fără exponent, fără semn, fără
 * separator de mii: orice altceva e null, deci refuzat cu motiv, nu citit greșit. Un câmp `type="number"` citea „2,5” ca 25.
 */
export function citesteNumar(s: string): number | null {
  const m = /^\s*(\d+(?:[.,]\d*)?|[.,]\d+)\s*$/.exec(s);
  return m?.[1] === undefined ? null : Number(m[1].replace(',', '.'));
}

/**
 * O valoare din document, ca text de editat: cel mai scurt text care se citește înapoi la exact aceeași valoare (al lui
 * `String`), dar fără exponent, pe care `citesteNumar` nu-l primește (`1e-7` devine `0.0000001`). Altfel un Exportă fără
 * nicio schimbare ar rescrie valoarea rotunjită, ca o comandă ascunsă.
 */
export function textNumar(x: number): string {
  const s = String(x);
  const m = /^(\d)(?:\.(\d+))?e-(\d+)$/.exec(s);
  return m?.[1] !== undefined && m[3] !== undefined ? `0.${'0'.repeat(Number(m[3]) - 1)}${m[1]}${m[2] ?? ''}` : s;
}
