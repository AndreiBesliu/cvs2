/** JSON canonic: cheile sortate la fiecare nivel, deci același document dă aceiași octeți (și același hash). */
export function jsonCanonic(x: unknown): string {
  if (Array.isArray(x)) return `[${x.map(jsonCanonic).join(',')}]`;
  if (x !== null && typeof x === 'object') {
    const o = x as Record<string, unknown>;
    return `{${Object.keys(o).filter((k) => o[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${jsonCanonic(o[k])}`).join(',')}}`;
  }
  if (typeof x === 'number' && !Number.isFinite(x)) throw new RangeError(`un număr nefinit (${x}) nu intră în document`);
  return JSON.stringify(x);
}
